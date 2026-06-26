"""
DIN 推荐模块 K 折交叉验证。
按用户分组划分训练/测试折，每折独立负采样，避免用户级信息泄漏。
评估指标：HitRate@K、MRR、NDCG@K。
"""
import argparse
import json
import os
import sys
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import StratifiedKFold
from tensorflow.keras.callbacks import EarlyStopping, LearningRateScheduler

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# 保证同目录下的 din_model 可被导入
_SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPT_DIR))

import din_model as dm
from din_model import (
    EMBEDDING_DIM, MAX_SEQ_LEN, MODEL_PATH,
    build_base_samples, build_din, load_data, pad_sequence, sample_negatives,
)


def parse_args():
    parser = argparse.ArgumentParser(description='DIN K-fold cross-validation for ranking evaluation')
    parser.add_argument('--k-folds', type=int, default=5, help='K 折数')
    parser.add_argument('--neg-per-pos', type=int, default=99, help='每个正样本混入的负样本数')
    parser.add_argument('--k-values', type=int, nargs='+', default=[1, 5, 10, 20], help='HitRate/NDCG 的 K 值')
    parser.add_argument('--cv-epochs', type=int, default=5, help='每折训练 epoch 数')
    parser.add_argument('--batch-size', type=int, default=512, help='训练 batch size')
    parser.add_argument('--min-hist-len', type=int, default=5, help='测试用户最小历史长度')
    parser.add_argument('--skip-training', action='store_true', help='跳过每折重训，直接加载已有权重评估')
    parser.add_argument('--nrows', type=int, default=None, help='读取用户行为数据行数，默认使用 din_model.NROWS')
    parser.add_argument('--output-dir', type=str, default=None, help='结果保存目录')
    parser.add_argument('--seed', type=int, default=dm.RANDOM_STATE, help='随机种子')
    return parser.parse_args()


def set_seed(seed):
    """设置随机种子，保证实验可复现。"""
    np.random.seed(seed)
    tf.random.set_seed(seed)
    import random
    random.seed(seed)


def build_model_inputs(df):
    """把 final_df 转换为 DIN 模型需要的 5 个输入列表与标签。"""
    return [
        np.array(df['hist_padded'].tolist(), dtype=np.int64),
        np.array(df['hist_cat_padded'].tolist(), dtype=np.int64),
        np.array(df['hist_beh_padded'].tolist(), dtype=np.int64),
        np.array(df['target_item'].tolist(), dtype=np.int64).reshape(-1, 1),
        np.array(df['target_cat'].tolist(), dtype=np.int64).reshape(-1, 1),
    ], np.array(df['label'].tolist(), dtype=np.int64)


def get_test_ground_truth(sample_df, test_uids, min_hist_len=5):
    """为测试用户抽取最后一次购买作为 ground truth，并过滤历史过短的用户。"""
    test_pos = sample_df[
        (sample_df['user_id'].isin(test_uids)) & (sample_df['label'] == 1)
    ].copy()
    if test_pos.empty:
        return pd.DataFrame()

    # sample_df 已按 (user_id, time) 排序，tail(1) 即为最后一次购买
    gt = test_pos.groupby('user_id').tail(1).copy()
    gt['hist_len'] = gt['hist_items'].apply(len)
    gt = gt[gt['hist_len'] >= min_hist_len]
    return gt


def evaluate_fold(model, gt_df, all_item_indices, item_idx_to_cat, neg_per_pos, k_values, seed):
    """对一折的测试用户做 ranking 评估，返回 HitRate@K、MRR、NDCG@K。"""
    rng = np.random.default_rng(seed)

    hit_at_k = {k: 0 for k in k_values}
    ndcg_at_k = {k: 0.0 for k in k_values}
    rr_sum = 0.0
    user_count = 0

    for _, row in gt_df.iterrows():
        hist_items = row['hist_items']
        hist_cats = row['hist_cats']
        hist_behs = row['hist_behs']
        pos_item = row['target_item']

        hist_padded = np.array([pad_sequence(hist_items, MAX_SEQ_LEN)], dtype=np.int64)
        hist_cat_padded = np.array([pad_sequence(hist_cats, MAX_SEQ_LEN)], dtype=np.int64)
        hist_beh_padded = np.array([pad_sequence(hist_behs, MAX_SEQ_LEN)], dtype=np.int64)

        # 负采样：从用户未交互过的商品中随机抽取
        seen = set(hist_items) | {pos_item}
        unseen = [i for i in all_item_indices if i not in seen]
        if len(unseen) < neg_per_pos:
            continue
        neg_items = rng.choice(unseen, size=neg_per_pos, replace=False)
        candidates = np.concatenate([[pos_item], neg_items]).astype(np.int64)

        # 构造批量输入：每个用户 1 + neg_per_pos 个候选
        n = len(candidates)
        hist_batch = np.tile(hist_padded, (n, 1))
        hist_cat_batch = np.tile(hist_cat_padded, (n, 1))
        hist_beh_batch = np.tile(hist_beh_padded, (n, 1))
        tgt_batch = candidates.reshape(-1, 1)
        tgt_cat_batch = np.array(
            [item_idx_to_cat.get(int(c), 0) for c in candidates], dtype=np.int64
        ).reshape(-1, 1)

        scores = model.predict(
            [hist_batch, hist_cat_batch, hist_beh_batch, tgt_batch, tgt_cat_batch],
            verbose=0,
        ).reshape(-1)

        # 正样本在 candidates 中固定为第 0 位
        pos_score = scores[0]
        # rank: 比正样本得分严格更高的候选数 + 1；比 >= 更合理，避免 tie 导致 rank 偏保守
        rank = int(np.sum(scores > pos_score) + 1)
        rr_sum += 1.0 / rank
        user_count += 1

        sorted_idx = np.argsort(scores)[::-1]
        for k in k_values:
            top_k_idx = sorted_idx[:k]
            if 0 in top_k_idx:
                hit_at_k[k] += 1
                pos_rank = int(np.where(top_k_idx == 0)[0][0] + 1)
                ndcg_at_k[k] += 1.0 / np.log2(pos_rank + 1)

    metrics = {'mrr': rr_sum / user_count if user_count else 0.0, 'user_count': user_count}
    for k in k_values:
        metrics[f'hit@{k}'] = hit_at_k[k] / user_count if user_count else 0.0
        metrics[f'ndcg@{k}'] = ndcg_at_k[k] / user_count if user_count else 0.0
    return metrics


def print_summary(fold_results, k_values, result_path):
    """打印并保存跨折汇总指标。"""
    print(f'\n{"=" * 70}')
    print('Cross-Validation Summary')
    print('=' * 70)

    summary = {'per_fold': fold_results, 'k_values': k_values}
    metric_names = ['mrr'] + [f'hit@{k}' for k in k_values] + [f'ndcg@{k}' for k in k_values]
    avg = {}
    for name in metric_names:
        values = [f[name] for f in fold_results]
        avg[name] = {
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
        }
    summary['average'] = avg

    print(f'{"Metric":<12} {"Mean":<10} {"Std":<10}')
    print('-' * 32)
    print(f'{"MRR":<12} {avg["mrr"]["mean"]:<10.4f} {avg["mrr"]["std"]:<10.4f}')
    for k in k_values:
        print(f'{"Hit@" + str(k):<12} {avg[f"hit@{k}"]["mean"]:<10.4f} {avg[f"hit@{k}"]["std"]:<10.4f}')
        print(f'{"NDCG@" + str(k):<12} {avg[f"ndcg@{k}"]["mean"]:<10.4f} {avg[f"ndcg@{k}"]["std"]:<10.4f}')

    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f'\n结果已保存: {result_path}')


def main():
    args = parse_args()
    set_seed(args.seed)

    if args.nrows is not None:
        dm.NROWS = args.nrows

    output_dir = Path(args.output_dir) if args.output_dir else dm.BASE_DIR / 'cv_results'
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    result_path = output_dir / f'cv_results_k{args.k_folds}_{timestamp}.json'

    print('=' * 70)
    print('DIN K-fold Cross-Validation (user-grouped)')
    print('=' * 70)
    print(f'K-folds: {args.k_folds} | Neg per pos: {args.neg_per_pos} | Seed: {args.seed}')
    print(f'CV epochs: {args.cv_epochs} | Batch size: {args.batch_size} | Skip training: {args.skip_training}')
    print('=' * 70)

    print('\n1. 加载数据 ...')
    user_df, _ = load_data()
    print(f'   用户行为数据: {user_df.shape}')

    print('\n2. 构造基础观测样本 ...')
    (
        sample_df, item2id, id2item,
        user2hist, user2hist_cat, user2hist_beh,
        cat2id, num_categories, all_item_indices, item_idx_to_cat,
    ) = build_base_samples(user_df)
    num_items = len(item2id) + 1
    pos_samples = sample_df[sample_df['label'] == 1].copy()
    neg_samples = sample_df[sample_df['label'] == 0].copy()
    print(
        f'   总用户数: {sample_df["user_id"].nunique()} | '
        f'正样本: {len(pos_samples)} | 负样本: {len(neg_samples)} | '
        f'商品数: {len(item2id)} | 类目数: {num_categories - 1}'
    )

    # 用户级分层：按用户是否有过购买来分层划分 K 折
    user_summary = sample_df.groupby('user_id')['label'].max().reset_index()
    user_ids = user_summary['user_id'].values
    user_labels = user_summary['label'].values

    skf = StratifiedKFold(n_splits=args.k_folds, shuffle=True, random_state=args.seed)
    fold_results = []

    for fold, (train_idx, test_idx) in enumerate(skf.split(user_ids, user_labels), start=1):
        print(f'\n{"=" * 70}')
        print(f'Fold {fold}/{args.k_folds}')
        print('=' * 70)

        train_uids = set(user_ids[train_idx])
        test_uids = set(user_ids[test_idx])

        # 每折独立负采样，确保训练集负样本不会泄漏测试用户信息
        print('   构造训练样本（折内负采样）...')
        train_pos = pos_samples[pos_samples['user_id'].isin(train_uids)].copy()
        train_neg = neg_samples[neg_samples['user_id'].isin(train_uids)].copy()
        train_df = sample_negatives(
            train_pos, train_neg,
            user2hist, user2hist_cat, user2hist_beh,
            item_idx_to_cat, all_item_indices,
            neg_ratio=dm.NEG_RATIO,
            random_state=args.seed + fold,
            verbose=True,
        )

        # 从训练折再切出 10% 做验证（用于早停）
        n_val = max(1, int(len(train_df) * 0.1))
        val_df = train_df.tail(n_val)
        train_df_fit = train_df.head(len(train_df) - n_val)
        train_x_fit, train_y_fit = build_model_inputs(train_df_fit)
        val_x, val_y = build_model_inputs(val_df)

        print('   构建模型 ...')
        model = build_din(num_items, EMBEDDING_DIM, MAX_SEQ_LEN, num_categories)
        model.compile(
            optimizer=tf.keras.optimizers.Adam(0.001),
            loss='binary_crossentropy',
            metrics=[tf.keras.metrics.AUC(name='auc')],
        )

        if not args.skip_training:
            print(f'   训练模型（最多 {args.cv_epochs} epochs）...')
            early_stop = EarlyStopping(
                monitor='val_auc', mode='max', patience=3,
                restore_best_weights=True, verbose=1,
            )
            lr_scheduler = LearningRateScheduler(lambda epoch: 0.001 * (0.9 ** epoch))
            model.fit(
                train_x_fit, train_y_fit,
                validation_data=(val_x, val_y),
                epochs=args.cv_epochs,
                batch_size=args.batch_size,
                callbacks=[early_stop, lr_scheduler],
                verbose=1,
            )
        else:
            if MODEL_PATH.exists():
                print(f'   加载预训练权重: {MODEL_PATH}')
                model.load_weights(str(MODEL_PATH))
            else:
                raise FileNotFoundError(f'--skip-training 指定但找不到权重: {MODEL_PATH}')

        print('   构造测试 ground truth ...')
        gt_df = get_test_ground_truth(sample_df, test_uids, args.min_hist_len)
        print(f'   符合条件的测试用户: {len(gt_df)}')

        if len(gt_df) == 0:
            print('   警告：本折无符合历史长度要求的测试用户，跳过评估')
            continue

        print('   评估 ranking 指标 ...')
        metrics = evaluate_fold(
            model, gt_df, all_item_indices, item_idx_to_cat,
            args.neg_per_pos, args.k_values, args.seed + fold,
        )
        metrics['fold'] = fold
        fold_results.append(metrics)

        print(f'   Fold {fold} 结果:')
        print(f'     测试用户: {metrics["user_count"]} | MRR: {metrics["mrr"]:.4f}')
        for k in args.k_values:
            print(
                f'     Hit@{k}: {metrics[f"hit@{k}"]:.4f} | '
                f'NDCG@{k}: {metrics[f"ndcg@{k}"]:.4f}'
            )

    if not fold_results:
        print('\n无任何有效折结果，请检查数据与参数。')
        return

    print_summary(fold_results, args.k_values, result_path)


if __name__ == '__main__':
    main()
