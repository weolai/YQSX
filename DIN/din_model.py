from __future__ import annotations

import json
import os
import pickle  # noqa: F401  保留兼容,新缓存改用 JSON + HMAC(见 save/load_recommend_cache)
import hashlib
import hmac
import random
import time
import warnings
from pathlib import Path

import keras
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import f1_score, precision_recall_curve, roc_auc_score
from sklearn.model_selection import train_test_split
from tensorflow.keras import Input, Model, layers
from tensorflow.keras.callbacks import Callback, EarlyStopping, LearningRateScheduler

matplotlib.use('Agg')

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'recommend'
USER_CSV = DATA_DIR / 'tianchi_mobile_recommend_train_user.csv'
ITEM_CSV = DATA_DIR / 'tianchi_mobile_recommend_train_item(1).csv'
MODEL_PATH = BASE_DIR / 'din_model.weights.h5'
CURVE_PATH = BASE_DIR / 'training_curves.png'
TOP_K = 40
MAX_SEQ_LEN = 50
EMBEDDING_DIM = 32
RANDOM_STATE = 42
BATCH_SIZE = 512
EPOCHS = 30
NROWS = 500000
NEG_RATIO = 5
API_HOST = '127.0.0.1'
API_PORT = 8000

MODEL_VERSION = 'v1'
DATA_VERSION = 'tianchi_mobile_2014'
YEAR = 2014
CACHE_TOPK = 500
PRECOMPUTE_BATCH_SIZE = 16384
# Sprint 3: 实时推理候选集缩减上限(与 build_recall_candidates 默认一致)
RECALL_MAX_CANDIDATES = 10000
# Sprint 3: 预计算仅覆盖 Top-1000 高频用户(按行为数量排序)
# 全量预计算耗时 ~8h,Top-1000 耗时 ~30min,80/20 命中率足够
PRECOMPUTE_USER_TOPN = 1000
CACHE_DIR = BASE_DIR / 'cache'
CACHE_DIR.mkdir(exist_ok=True)


class Dice(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        self.alpha = self.add_weight(
            name='alpha', shape=(input_shape[-1],), initializer='zeros', trainable=True
        )
        super().build(input_shape)

    def call(self, x):
        axes = list(range(len(x.shape) - 1))
        mean = keras.ops.mean(x, axis=axes, keepdims=True)
        variance = keras.ops.mean(keras.ops.square(x - mean), axis=axes, keepdims=True)
        std = keras.ops.sqrt(variance + 1e-8)
        normed = (x - mean) / std
        p = keras.ops.sigmoid(normed)
        return p * x + (1.0 - p) * self.alpha * x


class AttentionPoolingLayer(layers.Layer):
    def build(self, input_shape):
        self.attn_network = tf.keras.Sequential([
            layers.Dense(80),
            Dice(),
            layers.Dense(40),
            Dice(),
            layers.Dense(1, use_bias=False),
        ])
        super().build(input_shape)

    def call(self, query, keys, keys_length):
        seq_len = keras.ops.shape(keys)[1]
        query_tiled = keras.ops.tile(keras.ops.expand_dims(query, 1), [1, seq_len, 1])
        attn_input = keras.ops.concatenate([
            query_tiled,
            keys,
            query_tiled - keys,
            query_tiled * keys,
        ], axis=-1)
        attn_score = keras.ops.squeeze(self.attn_network(attn_input), -1)
        positions = keras.ops.arange(seq_len)
        mask = keras.ops.cast(
            keras.ops.less(keras.ops.expand_dims(positions, 0), keras.ops.expand_dims(keys_length, 1)), 'float32'
        )
        attn_score = attn_score * mask + (1.0 - mask) * (-1e9)
        attn_weight = keras.ops.softmax(attn_score, axis=-1)
        return keras.ops.sum(keras.ops.expand_dims(attn_weight, -1) * keys, axis=1)


def pad_sequence(seq, max_len):
    if len(seq) >= max_len:
        return seq[-max_len:]
    return [0] * (max_len - len(seq)) + seq


def load_data():
    if not USER_CSV.exists():
        raise FileNotFoundError(f'找不到用户行为数据: {USER_CSV}')
    if not ITEM_CSV.exists():
        raise FileNotFoundError(f'找不到商品数据: {ITEM_CSV}')
    return pd.read_csv(USER_CSV, nrows=NROWS), pd.read_csv(ITEM_CSV)


def build_base_samples(user_df):
    """从原始行为数据构造观测样本（不含负采样）。

    拆分出来是为了支持 K 折交叉验证：先按用户划分折，再分别做负采样，
    避免合成负样本在构造时看到测试用户的完整历史。
    """
    user_df = user_df.copy()
    user_df['time'] = pd.to_datetime(user_df['time'], format='%Y-%m-%d %H', errors='coerce')
    user_df = user_df.dropna(subset=['time', 'user_id', 'item_id', 'behavior_type'])
    user_df['user_id'] = user_df['user_id'].astype(np.int64)
    user_df['item_id'] = user_df['item_id'].astype(np.int64)
    user_df['behavior_type'] = user_df['behavior_type'].astype(np.int64)
    user_df['item_category'] = user_df['item_category'].fillna(0).astype(np.int64)
    user_df = user_df.sort_values(['user_id', 'time']).reset_index(drop=True)

    item_ids = user_df['item_id'].drop_duplicates().tolist()
    item2id = {item_id: idx + 1 for idx, item_id in enumerate(item_ids)}
    id2item = {idx + 1: item_id for idx, item_id in enumerate(item_ids)}

    categories = user_df['item_category'].drop_duplicates().tolist()
    cat2id = {cat: idx + 1 for idx, cat in enumerate(categories)}
    num_categories = len(categories) + 1

    user_df['item_idx'] = user_df['item_id'].map(item2id)
    user_df['cat_idx'] = user_df['item_category'].map(cat2id)
    user_df = user_df.dropna(subset=['item_idx'])
    user_df['item_idx'] = user_df['item_idx'].astype(np.int64)
    user_df['cat_idx'] = user_df['cat_idx'].astype(np.int64)

    user2hist = {}
    user2hist_cat = {}
    user2hist_beh = {}
    all_item_indices = list(item2id.values())

    samples = []
    for user_id, group in user_df.groupby('user_id', sort=False):
        seq = []
        seq_cat = []
        seq_beh = []
        for _, row in group.iterrows():
            if seq:
                samples.append({
                    'user_id': int(user_id),
                    'hist_items': list(seq),
                    'hist_cats': list(seq_cat),
                    'hist_behs': list(seq_beh),
                    'target_item': int(row['item_idx']),
                    'target_cat': int(row['cat_idx']),
                    'label': 1 if int(row['behavior_type']) == 4 else 0,
                })
            seq.append(int(row['item_idx']))
            seq_cat.append(int(row['cat_idx']))
            seq_beh.append(int(row['behavior_type']))
        if seq:
            user2hist[int(user_id)] = list(seq)
            user2hist_cat[int(user_id)] = list(seq_cat)
            user2hist_beh[int(user_id)] = list(seq_beh)

    sample_df = pd.DataFrame(samples)
    if sample_df.empty:
        raise ValueError('样本构造结果为空，请检查数据文件与行为类型字段。')

    # 构造 item_idx -> cat_idx 映射，供合成负样本快速查类目
    item_idx_to_cat = {}
    for _, row in user_df.drop_duplicates('item_id').iterrows():
        item_idx = item2id.get(int(row['item_id']))
        if item_idx is not None:
            item_idx_to_cat[item_idx] = cat2id.get(int(row['item_category']), 0)

    return (
        sample_df, item2id, id2item,
        user2hist, user2hist_cat, user2hist_beh,
        cat2id, num_categories, all_item_indices, item_idx_to_cat,
    )


def sample_negatives(
    pos_samples,
    neg_samples,
    user2hist,
    user2hist_cat,
    user2hist_beh,
    item_idx_to_cat,
    all_item_indices,
    neg_ratio=NEG_RATIO,
    random_state=RANDOM_STATE,
    verbose=True,
):
    """对传入的正负样本做负采样与序列补齐，返回可直接喂入模型的 final_df。

    单独拆分后，K 折验证可以在按用户划分折之后再调用本函数，
    保证每折的负样本仅由该折的训练/测试数据产生。
    """
    local_random = random.Random(random_state)

    if verbose:
        print(f'  原始正样本: {len(pos_samples)}, 原始负样本: {len(neg_samples)}')

    neg_selected = neg_samples.sample(
        n=min(len(neg_samples), len(pos_samples) * neg_ratio),
        random_state=random_state,
    ) if len(pos_samples) > 0 else neg_samples.head(10000)

    all_pos_users = pos_samples['user_id'].unique()
    synth_negs = []
    for uid in all_pos_users:
        uid_pos_items = set(pos_samples[pos_samples['user_id'] == uid]['target_item'].tolist())
        uid_hist = set(user2hist.get(int(uid), []))
        n_synth = neg_ratio
        candidates_pool = [idx for idx in all_item_indices if idx not in uid_pos_items and idx not in uid_hist]
        if len(candidates_pool) < n_synth:
            candidates_pool = [idx for idx in all_item_indices if idx not in uid_pos_items]
        sampled = local_random.sample(candidates_pool, min(n_synth, len(candidates_pool)))
        hist = user2hist.get(int(uid), [])
        hist_cat = user2hist_cat.get(int(uid), [])
        hist_beh = user2hist_beh.get(int(uid), [])
        for tgt in sampled:
            synth_negs.append({
                'user_id': int(uid),
                'hist_items': list(hist),
                'hist_cats': list(hist_cat),
                'hist_behs': list(hist_beh),
                'target_item': int(tgt),
                'target_cat': int(item_idx_to_cat.get(int(tgt), 0)),
                'label': 0,
            })

    synth_df = pd.DataFrame(synth_negs)
    final_df = pd.concat([pos_samples, neg_selected, synth_df], ignore_index=True)
    final_df = final_df.sample(frac=1, random_state=random_state).reset_index(drop=True)

    final_df['hist_padded'] = final_df['hist_items'].apply(lambda x: pad_sequence(x, MAX_SEQ_LEN))
    final_df['hist_cat_padded'] = final_df['hist_cats'].apply(lambda x: pad_sequence(x, MAX_SEQ_LEN))
    final_df['hist_beh_padded'] = final_df['hist_behs'].apply(lambda x: pad_sequence(x, MAX_SEQ_LEN))

    if verbose:
        pos_final = final_df['label'].sum()
        neg_final = len(final_df) - pos_final
        print(f'  最终样本: {len(final_df)} (正:{pos_final}, 负:{neg_final}, 正样本比例:{pos_final / len(final_df):.4f})')

    return final_df


def build_samples(user_df):
    """原始入口：构造观测样本并执行默认负采样，返回与旧版本一致的数据结构。"""
    (
        sample_df, item2id, id2item,
        user2hist, user2hist_cat, user2hist_beh,
        cat2id, num_categories, all_item_indices, item_idx_to_cat,
    ) = build_base_samples(user_df)

    pos_samples = sample_df[sample_df['label'] == 1].copy()
    neg_samples = sample_df[sample_df['label'] == 0].copy()

    final_df = sample_negatives(
        pos_samples, neg_samples,
        user2hist, user2hist_cat, user2hist_beh,
        item_idx_to_cat, all_item_indices,
        neg_ratio=NEG_RATIO, random_state=RANDOM_STATE, verbose=True,
    )

    return final_df, item2id, id2item, user2hist, user2hist_cat, user2hist_beh, cat2id, num_categories


def build_din(num_items, embedding_dim, max_seq_len, num_categories=0):
    hist_input = Input(shape=(max_seq_len,), name='history_items')
    hist_cat_input = Input(shape=(max_seq_len,), name='history_cats')
    hist_beh_input = Input(shape=(max_seq_len,), name='history_behs')
    target_input = Input(shape=(1,), name='target_item')
    target_cat_input = Input(shape=(1,), name='target_cat')

    embed_layer = layers.Embedding(num_items, embedding_dim, mask_zero=True, name='item_embedding')
    cat_embed_layer = layers.Embedding(num_categories, embedding_dim // 2, mask_zero=True, name='cat_embedding')
    beh_embed_layer = layers.Embedding(5, 8, mask_zero=True, name='beh_embedding')

    hist_emb = embed_layer(hist_input)
    hist_cat_emb = cat_embed_layer(hist_cat_input)
    hist_beh_emb = beh_embed_layer(hist_beh_input)
    hist_combined = layers.Concatenate(axis=-1)([hist_emb, hist_cat_emb, hist_beh_emb])

    target_emb = keras.ops.squeeze(embed_layer(target_input), axis=1)
    target_cat_emb = keras.ops.squeeze(cat_embed_layer(target_cat_input), axis=1)
    target_combined = layers.Concatenate(axis=-1)([target_emb, target_cat_emb])
    target_proj = layers.Dense(EMBEDDING_DIM + EMBEDDING_DIM // 2 + 8, name='target_proj')(target_combined)

    seq_len = keras.ops.sum(keras.ops.cast(keras.ops.not_equal(hist_input, 0), 'int32'), axis=1)
    attn_pool = AttentionPoolingLayer()(target_proj, hist_combined, seq_len)
    concat = layers.Concatenate()([attn_pool, target_combined])

    dnn = layers.Dense(128)(concat)
    dnn = Dice()(dnn)
    dnn = layers.BatchNormalization()(dnn)
    dnn = layers.Dropout(0.3)(dnn)
    dnn = layers.Dense(64)(dnn)
    dnn = Dice()(dnn)
    dnn = layers.BatchNormalization()(dnn)
    dnn = layers.Dropout(0.3)(dnn)
    dnn = layers.Dense(32)(dnn)
    dnn = Dice()(dnn)
    output = layers.Dense(1, activation='sigmoid')(dnn)

    return Model(
        inputs=[hist_input, hist_cat_input, hist_beh_input, target_input, target_cat_input],
        outputs=output
    )


class MetricsHistory(Callback):
    def __init__(self, val_data, k_list=(5, 10, 20)):
        super().__init__()
        self.val_data = val_data
        self.k_list = k_list
        self.train_loss = []
        self.val_loss = []
        self.val_auc = []
        self.val_precision = []
        self.val_recall = []
        self.val_f1 = []
        self.val_pr_at_k = {k: [] for k in k_list}
        self.val_re_at_k = {k: [] for k in k_list}

    def _ranking_metrics(self, y_true, y_score, k):
        top_k = np.argsort(y_score)[::-1][:k]
        hits = y_true[top_k].sum()
        total_pos = y_true.sum()
        return hits / k, hits / total_pos if total_pos > 0 else 0.0

    def on_epoch_end(self, epoch, logs=None):
        xv, yv = self.val_data
        yp = self.model.predict(xv, verbose=0).flatten()
        self.val_auc.append(roc_auc_score(yv, yp))
        precisions, recalls, threshs = precision_recall_curve(yv, yp)
        f1_scores = 2 * precisions[:-1] * recalls[:-1] / (precisions[:-1] + recalls[:-1] + 1e-12)
        best_idx = int(np.argmax(f1_scores))
        best_thresh = threshs[best_idx]
        self.val_precision.append(precisions[best_idx])
        self.val_recall.append(recalls[best_idx])
        self.val_f1.append(f1_scores[best_idx])
        for k in self.k_list:
            p, r = self._ranking_metrics(yv, yp, k)
            self.val_pr_at_k[k].append(p)
            self.val_re_at_k[k].append(r)
        self.train_loss.append(logs.get('loss'))
        self.val_loss.append(logs.get('val_loss'))
        print(
            f'   └─ auc={self.val_auc[-1]:.4f}  prec={self.val_precision[-1]:.4f}  '
            f'recall={self.val_recall[-1]:.4f}  f1={self.val_f1[-1]:.4f}  (thresh={best_thresh:.3f})'
        )


def get_cache_paths():
    """返回版本化缓存文件路径。"""
    prefix = f'recommend_cache_{MODEL_VERSION}_{DATA_VERSION}_{YEAR}'
    return {
        'cache': CACHE_DIR / f'{prefix}.pkl',
        'users': CACHE_DIR / f'cached_user_ids_{MODEL_VERSION}_{DATA_VERSION}_{YEAR}.json',
        'meta': CACHE_DIR / f'{prefix}_meta.json',
    }


def precompute_topk_for_user(
    model, user_id, all_item_indices, item_cat_map,
    user2hist, user2hist_cat, user2hist_beh,
    topk=CACHE_TOPK, batch_size=PRECOMPUTE_BATCH_SIZE,
):
    """对单个用户分块打分并截断 TopK，避免一次性构造 36 万 batch。"""
    user_id = int(user_id)
    hist = user2hist.get(user_id, [])
    if not hist:
        return [], []

    hist_cat = user2hist_cat.get(user_id, [0] * len(hist))
    hist_beh = user2hist_beh.get(user_id, [0] * len(hist))

    hist_padded = pad_sequence(hist, MAX_SEQ_LEN)
    hist_cat_padded = pad_sequence(hist_cat, MAX_SEQ_LEN)
    hist_beh_padded = pad_sequence(hist_beh, MAX_SEQ_LEN)

    # 过滤用户历史中的商品，避免重复推荐
    hist_set = set(hist[-MAX_SEQ_LEN:])
    candidates = [idx for idx in all_item_indices if idx not in hist_set]

    all_scores = []
    for start in range(0, len(candidates), batch_size):
        batch = candidates[start:start + batch_size]
        n = len(batch)

        hist_batch = np.tile(hist_padded, (n, 1)).astype(np.int64)
        hist_cat_batch = np.tile(hist_cat_padded, (n, 1)).astype(np.int64)
        hist_beh_batch = np.tile(hist_beh_padded, (n, 1)).astype(np.int64)
        tgt_batch = np.array(batch, dtype=np.int64).reshape(-1, 1)
        tgt_cat_batch = np.array(
            [item_cat_map.get(c, 0) for c in batch], dtype=np.int64
        ).reshape(-1, 1)

        scores = model(
            [hist_batch, hist_cat_batch, hist_beh_batch, tgt_batch, tgt_cat_batch],
            training=False,
        ).numpy().reshape(-1)
        all_scores.append(scores)

    all_scores = np.concatenate(all_scores)

    # 使用 argpartition 快速截断 TopK，比完整 argsort 更快
    if len(all_scores) <= topk:
        topk_indices = np.arange(len(all_scores))
    else:
        topk_indices = np.argpartition(all_scores, -topk)[-topk:]
        topk_indices = topk_indices[np.argsort(-all_scores[topk_indices])]

    topk_candidates = [candidates[i] for i in topk_indices]
    topk_scores = all_scores[topk_indices].astype(float).tolist()
    return topk_candidates, topk_scores


def build_recall_candidates(
    user_ids, user2hist, user2hist_cat, item_cat_map, item2id,
    popularity, hot_items, max_candidates=10000, hot_count=3000,
):
    """为每个用户构建召回候选集：相关类目商品 + 全局热门商品。"""
    # 按类目聚合商品
    category_items = {}
    for idx in item2id.values():
        cat = item_cat_map.get(idx, 0)
        category_items.setdefault(cat, set()).add(idx)

    candidates_map = {}
    for uid in user_ids:
        uid = int(uid)
        hist = user2hist.get(uid, [])
        hist_cats = user2hist_cat.get(uid, [])
        related_cats = {item_cat_map.get(int(it), 0) for it in hist}
        related_cats.discard(0)

        related_items = set()
        for cat in related_cats:
            related_items.update(category_items.get(cat, set()))

        # 排除用户历史已交互商品
        hist_set = set(hist)
        related_items -= hist_set

        # 候选 = 相关类目商品 + 全局热门商品，按热度补齐到 max_candidates
        candidates = list(related_items)
        if len(candidates) < max_candidates:
            for it in hot_items:
                if it not in hist_set and it not in candidates:
                    candidates.append(it)
                if len(candidates) >= max_candidates:
                    break

        # 按热度排序截断
        candidates.sort(key=lambda x: popularity.get(x, 0), reverse=True)
        candidates_map[uid] = candidates[:max_candidates]

    return candidates_map


def batch_precompute_topk(
    model, user_ids, item2id, id2item, user2hist, user2hist_cat,
    user2hist_beh, item_cat_map, topk=CACHE_TOPK,
    batch_size=PRECOMPUTE_BATCH_SIZE, user_chunk_size=16,
    use_recall=True, recall_max_candidates=10000, recall_hot_count=3000,
):
    """批量预计算所有用户的 TopK 推荐结果并保存到版本化缓存。

    默认启用候选集缩减（召回+精排）：先根据用户历史相关类目和全局热门商品
    召回约 1 万个候选，再使用 DIN 精排取 Top500。如需全量精排，可设置
    use_recall=False（CPU 上会非常慢，不推荐）。
    """
    all_item_indices = list(item2id.values())
    n_items = len(all_item_indices)
    user_ids = [int(uid) for uid in user_ids]
    cache = {}

    if use_recall:
        # 统计商品热度并构造热门列表
        popularity = {}
        for uid, hist in user2hist.items():
            for it in hist:
                popularity[it] = popularity.get(it, 0) + 1
        hot_items = sorted(popularity.keys(), key=lambda x: popularity[x], reverse=True)

        print(
            f'开始离线预计算（召回+精排）：{len(user_ids)} 个用户，'
            f'召回候选 {recall_max_candidates}，Top{topk}，'
            f'user_chunk={user_chunk_size}，item_batch={batch_size}'
        )
        candidates_map = build_recall_candidates(
            user_ids, user2hist, user2hist_cat, item_cat_map, item2id,
            popularity, hot_items, max_candidates=recall_max_candidates,
            hot_count=recall_hot_count,
        )
    else:
        print(
            f'开始离线预计算（全量精排）：{len(user_ids)} 个用户，{n_items} 个候选商品，'
            f'Top{topk}，user_chunk={user_chunk_size}，item_batch={batch_size}'
        )
        candidates_map = {uid: all_item_indices for uid in user_ids}

    start_ts = time.time()
    total_pairs = 0

    for chunk_start in range(0, len(user_ids), user_chunk_size):
        user_chunk = user_ids[chunk_start:chunk_start + user_chunk_size]
        n_users_chunk = len(user_chunk)

        # 预计算该组用户的历史序列
        hists, hist_cats, hist_behs = [], [], []
        for uid in user_chunk:
            hist = user2hist.get(uid, [])
            hist_cat = user2hist_cat.get(uid, [0] * len(hist))
            hist_beh = user2hist_beh.get(uid, [0] * len(hist))
            hists.append(pad_sequence(hist, MAX_SEQ_LEN))
            hist_cats.append(pad_sequence(hist_cat, MAX_SEQ_LEN))
            hist_behs.append(pad_sequence(hist_beh, MAX_SEQ_LEN))

        hists = np.array(hists, dtype=np.int64)
        hist_cats = np.array(hist_cats, dtype=np.int64)
        hist_behs = np.array(hist_behs, dtype=np.int64)

        # 收集该组用户所有候选商品，并为每个用户记录位置
        user_candidates = [candidates_map[uid] for uid in user_chunk]
        max_len = max(len(c) for c in user_candidates)
        padded_candidates = [
            c + [0] * (max_len - len(c)) for c in user_candidates
        ]
        padded_candidates = np.array(padded_candidates, dtype=np.int64)

        # 该组用户的分数矩阵：n_users_chunk × max_len
        chunk_scores = np.full((n_users_chunk, max_len), -1e9, dtype=np.float32)

        for item_start in range(0, max_len, batch_size):
            item_chunk = padded_candidates[:, item_start:item_start + batch_size]
            n_items_chunk = item_chunk.shape[1]
            # 展平为 (n_users_chunk * n_items_chunk,)
            flat_items = item_chunk.reshape(-1)
            valid_mask = flat_items != 0

            if not valid_mask.any():
                continue

            # 为每个有效 pair 构造输入
            user_indices = np.repeat(np.arange(n_users_chunk), n_items_chunk)[valid_mask]
            valid_items = flat_items[valid_mask]

            hist_batch = hists[user_indices]
            hist_cat_batch = hist_cats[user_indices]
            hist_beh_batch = hist_behs[user_indices]
            tgt_batch = valid_items.reshape(-1, 1)
            tgt_cat_batch = np.array(
                [item_cat_map.get(c, 0) for c in valid_items], dtype=np.int64
            ).reshape(-1, 1)

            scores = model(
                [hist_batch, hist_cat_batch, hist_beh_batch, tgt_batch, tgt_cat_batch],
                training=False,
            ).numpy().reshape(-1)

            # 写回分数矩阵
            flat_scores = chunk_scores.reshape(-1)
            flat_pos = np.repeat(np.arange(n_users_chunk), n_items_chunk)[valid_mask]
            col_pos = np.tile(np.arange(n_items_chunk), n_users_chunk)[valid_mask]
            flat_scores[(flat_pos * max_len + col_pos)] = scores
            total_pairs += len(scores)

        # 对该组用户分别取 TopK
        for i, uid in enumerate(user_chunk):
            candidates = user_candidates[i]
            scores = chunk_scores[i, :len(candidates)]
            if len(scores) <= topk:
                topk_pos = np.arange(len(scores))
            else:
                topk_pos = np.argpartition(scores, -topk)[-topk:]
                topk_pos = topk_pos[np.argsort(-scores[topk_pos])]

            topk_indices = [candidates[p] for p in topk_pos]
            topk_scores = scores[topk_pos].tolist()
            cache[uid] = [
                {
                    'item_idx': int(idx),
                    'item_id': int(id2item.get(int(idx), int(idx))),
                    'category': int(item_cat_map.get(int(idx), 0)),
                    'score': float(score),
                }
                for idx, score in zip(topk_indices, topk_scores)
            ]

        processed = min(chunk_start + user_chunk_size, len(user_ids))
        elapsed = time.time() - start_ts
        avg = elapsed / processed if processed > 0 else 0
        remaining = avg * (len(user_ids) - processed)
        print(
            f'  已处理 {processed}/{len(user_ids)}，'
            f'平均 {avg:.2f}s/用户，预计剩余 {remaining:.0f}s'
        )

    total_elapsed = time.time() - start_ts
    print(f'预计算完成，总耗时 {total_elapsed:.2f}s，总评分对数 {total_pairs:,}')

    paths = get_cache_paths()
    cache_payload = {
        'meta': {
            'model_version': MODEL_VERSION,
            'data_version': DATA_VERSION,
            'year': YEAR,
            'topk': topk,
            'user_count': len(cache),
            'item_count': len(all_item_indices),
            'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'elapsed_seconds': total_elapsed,
        },
        'cache': cache,
    }

    # Sprint 3 安全加固:缓存格式从 pickle 改为 JSON + HMAC 签名
    # pickle.load 存在任意代码执行风险(RCE),JSON 不可执行
    # HMAC 签名防止缓存篡改
    cache_json = json.dumps(cache_payload, ensure_ascii=False).encode('utf-8')
    hmac_key = os.environ.get('DIN_CACHE_HMAC_KEY', 'din-cache-default-key').encode('utf-8')
    signature = hmac.new(hmac_key, cache_json, hashlib.sha256).hexdigest()
    with open(paths['cache'], 'w', encoding='utf-8') as f:
        f.write(signature)
        f.write('\n')
        f.write(cache_json.decode('utf-8'))
    print(f'缓存已保存(JSON+HMAC)：{paths["cache"]}')

    cached_user_ids = sorted([int(uid) for uid in cache.keys()])
    with open(paths['users'], 'w', encoding='utf-8') as f:
        json.dump({
            'model_version': MODEL_VERSION,
            'data_version': DATA_VERSION,
            'year': YEAR,
            'user_ids': cached_user_ids,
        }, f, ensure_ascii=False, indent=2)
    print(f'用户列表已保存：{paths["users"]}')

    with open(paths['meta'], 'w', encoding='utf-8') as f:
        json.dump(cache_payload['meta'], f, ensure_ascii=False, indent=2)
    print(f'元信息已保存：{paths["meta"]}')

    return cache_payload


def load_recommend_cache():
    """加载本地缓存；若版本不匹配或签名校验失败则返回 None。

    Sprint 3 安全加固:
    - 缓存格式从 pickle 改为 JSON + HMAC 签名
    - 加载时先验签,签名不匹配拒绝加载(防篡改)
    - JSON 不可执行,消除 pickle.load 的 RCE 风险
    """
    paths = get_cache_paths()
    if not paths['cache'].exists():
        print(f'缓存文件不存在：{paths["cache"]}')
        return None

    try:
        with open(paths['cache'], 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # 旧版 pickle 缓存或损坏文件，无法按 JSON+HMAC 解码；跳过缓存走实时推理
        print(f'缓存文件为旧格式(pickle)或已损坏，跳过加载：{paths["cache"]}')
        print('请运行 `python din_model.py --mode precompute` 重新生成 JSON+HMAC 缓存')
        return None

    # 第一行为 HMAC 签名,其余为 JSON 数据
    lines = content.split('\n', 1)
    if len(lines) != 2:
        print('缓存格式错误:缺少签名行')
        return None
    stored_signature, cache_json = lines
    hmac_key = os.environ.get('DIN_CACHE_HMAC_KEY', 'din-cache-default-key').encode('utf-8')
    expected_signature = hmac.new(
        hmac_key, cache_json.encode('utf-8'), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(stored_signature, expected_signature):
        print('缓存签名校验失败,拒绝加载(可能被篡改)')
        return None

    payload = json.loads(cache_json)

    meta = payload.get('meta', {})
    if (
        meta.get('model_version') != MODEL_VERSION
        or meta.get('data_version') != DATA_VERSION
        or meta.get('year') != YEAR
    ):
        print(
            f'缓存版本不匹配：缓存为 {meta.get("model_version")}_{meta.get("data_version")}_{meta.get("year")}，'
            f'当前需要 {MODEL_VERSION}_{DATA_VERSION}_{YEAR}'
        )
        return None

    print(
        f'缓存加载成功(JSON+HMAC)：{meta.get("user_count")} 个用户，Top{meta.get("topk")}，'
        f'生成时间 {meta.get("created_at")}'
    )
    return payload


def recommend_topk(model, user_id, user2hist, item2id, id2item, top_k=TOP_K, **kwargs):
    user_id = int(user_id)
    hist = user2hist.get(user_id, [])
    if not hist:
        return []

    user2hist_cat = kwargs.get('user2hist_cat', {})
    user2hist_beh = kwargs.get('user2hist_beh', {})
    item_cat_map = kwargs.get('item_cat_map', {})

    # Sprint 3 性能优化:复用 build_recall_candidates 的召回逻辑
    # 此前实时推理对全量 36 万候选精排,内存峰值 >600MB,耗时数十秒
    # 现改为:相关类目商品 + 全局热门商品,缩减到 1 万候选再精排
    # 内存峰值降至 ~12MB,推理耗时降至秒级
    popularity = kwargs.get('popularity')
    hot_items = kwargs.get('hot_items')
    if popularity is None or hot_items is None:
        # 兜底:实时统计热度(仅未预计算时)
        popularity = {}
        for uid, h in user2hist.items():
            for it in h:
                popularity[it] = popularity.get(it, 0) + 1
        hot_items = sorted(popularity.keys(), key=lambda x: popularity[x], reverse=True)

    candidates_map = build_recall_candidates(
        [user_id], user2hist, user2hist_cat, item_cat_map, item2id,
        popularity, hot_items, max_candidates=RECALL_MAX_CANDIDATES,
    )
    candidates = candidates_map.get(user_id, [])
    if not candidates:
        # 召回为空时退化为全量候选(极端情况)
        candidates = [item_idx for item_idx in item2id.values() if item_idx not in set(hist[-MAX_SEQ_LEN:])]
    if not candidates:
        candidates = list(item2id.values())

    hist_batch = np.array([pad_sequence(hist, MAX_SEQ_LEN)] * len(candidates), dtype=np.int64)
    hist_cat = user2hist_cat.get(user_id, [0] * len(hist))
    hist_beh = user2hist_beh.get(user_id, [0] * len(hist))
    hist_cat_batch = np.array([pad_sequence(hist_cat, MAX_SEQ_LEN)] * len(candidates), dtype=np.int64)
    hist_beh_batch = np.array([pad_sequence(hist_beh, MAX_SEQ_LEN)] * len(candidates), dtype=np.int64)

    tgt_batch = np.array(candidates, dtype=np.int64).reshape(-1, 1)
    tgt_cats = [item_cat_map.get(c, 0) for c in candidates]
    tgt_cat_batch = np.array(tgt_cats, dtype=np.int64).reshape(-1, 1)

    scores = model.predict(
        [hist_batch, hist_cat_batch, hist_beh_batch, tgt_batch, tgt_cat_batch],
        verbose=0
    ).reshape(-1)
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [int(id2item.get(int(candidates[idx]), int(candidates[idx]))) for idx in top_indices]


def normalize_recommendations(recommendations, top_k=TOP_K):
    normalized = []
    seen = set()
    for item in recommendations:
        try:
            item_id = int(item)
        except (TypeError, ValueError):
            continue
        if item_id in seen:
            continue
        seen.add(item_id)
        normalized.append(item_id)
        if len(normalized) >= top_k:
            break
    return normalized


def build_response(code, msg, data=None):
    return {
        'code': code,
        'msg': msg,
        'data': data or {},
    }


def apply_business_rerank(cached_items, user2hist, user_id, k=TOP_K):
    """基于缓存 TopN 做过滤与轻量业务重排，返回 TopK。"""
    user_id = int(user_id)
    hist_set = set(user2hist.get(user_id, []))

    # 过滤用户历史已交互商品（简单去重）
    filtered = [it for it in cached_items if it['item_idx'] not in hist_set]

    # 简单类目打散：同一类目连续不超过 3 个
    result = []
    cat_count = {}
    for it in filtered:
        cat = it.get('category', 0)
        if cat_count.get(cat, 0) >= 3:
            continue
        result.append(it)
        cat_count[cat] = cat_count.get(cat, 0) + 1
        if len(result) >= k:
            break

    return result[:k]


def create_api_state():
    return {'model': None, 'item2id': None, 'id2item': None, 'user2hist': None, 'sample_user_id': None}


def save_assets(model, metrics_history):
    model.save_weights(str(MODEL_PATH))
    print(f'模型权重已保存至 {MODEL_PATH}')

    fig, axes = plt.subplots(2, 3, figsize=(16, 9))
    epochs_range = range(1, len(metrics_history.train_loss) + 1)

    ax = axes[0, 0]
    ax.plot(epochs_range, metrics_history.train_loss, label='Train Loss', lw=2)
    ax.plot(epochs_range, metrics_history.val_loss, label='Val Loss', lw=2)
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Loss')
    ax.set_title('Loss')
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[0, 1]
    ax.plot(epochs_range, metrics_history.val_auc, label='Val AUC', color='green', lw=2)
    ax.set_xlabel('Epoch')
    ax.set_ylabel('AUC')
    ax.set_title('AUC')
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[0, 2]
    ax.plot(epochs_range, metrics_history.val_precision, label='Precision', lw=2)
    ax.plot(epochs_range, metrics_history.val_recall, label='Recall', lw=2)
    ax.plot(epochs_range, metrics_history.val_f1, label='F1', lw=2, linestyle='--')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Score')
    ax.set_title('Precision / Recall / F1 (optimal threshold)')
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[1, 0]
    for k in metrics_history.k_list:
        ax.plot(epochs_range, metrics_history.val_pr_at_k[k], label=f'Precision@{k}', lw=2)
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Precision@K')
    ax.set_title('Precision@K')
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[1, 1]
    for k in metrics_history.k_list:
        ax.plot(epochs_range, metrics_history.val_re_at_k[k], label=f'Recall@{k}', lw=2)
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Recall@K')
    ax.set_title('Recall@K')
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[1, 2]
    ax.text(0.5, 0.5, 'Ranking metrics are tracked in console\nUse recommend_topk for inference',
            transform=ax.transAxes, ha='center', va='center', fontsize=11)
    ax.set_title('Note')
    ax.axis('off')

    plt.tight_layout()
    plt.savefig(CURVE_PATH, dpi=150)
    plt.close()
    print(f'训练曲线已保存至 {CURVE_PATH}')


def prepare_runtime_state():
    user_df, item_df = load_data()
    sample_df, item2id, id2item, user2hist, user2hist_cat, user2hist_beh, cat2id, num_categories = build_samples(user_df)
    num_items = len(item2id) + 1
    model = build_din(num_items, EMBEDDING_DIM, MAX_SEQ_LEN, num_categories)
    if MODEL_PATH.exists():
        model.load_weights(str(MODEL_PATH))

    item_cat_map = {}
    for _, row in user_df.drop_duplicates('item_id').iterrows():
        item_idx = item2id.get(int(row['item_id']))
        if item_idx is not None:
            item_cat_map[item_idx] = cat2id.get(int(row['item_category']), 0)

    return {
        'user_df': user_df,
        'item_df': item_df,
        'sample_df': sample_df,
        'item2id': item2id,
        'id2item': id2item,
        'user2hist': user2hist,
        'user2hist_cat': user2hist_cat,
        'user2hist_beh': user2hist_beh,
        'cat2id': cat2id,
        'num_categories': num_categories,
        'item_cat_map': item_cat_map,
        'model': model,
    }


def get_recommendations_for_user(user_id, runtime_state=None, top_k=TOP_K):
    state = runtime_state or prepare_runtime_state()
    recommendations = recommend_topk(
        state['model'],
        user_id,
        state['user2hist'],
        state['item2id'],
        state['id2item'],
        top_k=top_k,
        user2hist_cat=state.get('user2hist_cat', {}),
        user2hist_beh=state.get('user2hist_beh', {}),
        cat2id=state.get('cat2id', {}),
        item_cat_map=state.get('item_cat_map', {}),
    )
    return normalize_recommendations(recommendations, top_k=top_k)


def build_http_app(runtime_state=None):
    from flask import Flask, jsonify, request

    app = Flask(__name__)
    state = runtime_state or prepare_runtime_state()

    # 启动时尝试加载本地缓存
    cache_payload = load_recommend_cache()
    state['cache'] = cache_payload.get('cache') if cache_payload else None
    state['cache_meta'] = cache_payload.get('meta') if cache_payload else None
    state['cached_user_ids'] = []
    if state['cache']:
        state['cached_user_ids'] = sorted([int(uid) for uid in state['cache'].keys()])
        print(f'在线服务将使用缓存，共 {len(state["cached_user_ids"])} 个用户')
    else:
        print('警告：未加载到缓存，在线请求将走实时推理（较慢）')

    def resolve_user_id(raw_id):
        if raw_id is None:
            return None, 'userId is required'
        try:
            return int(raw_id), None
        except (TypeError, ValueError):
            return None, 'userId must be a number'

    @app.get('/health')
    def health():
        return jsonify(build_response(200, 'success', {
            'status': 'ok',
            'model_version': MODEL_VERSION,
            'data_version': DATA_VERSION,
            'year': YEAR,
            'cache_loaded': state['cache'] is not None,
            'cached_users': len(state['cached_user_ids']),
        }))

    @app.get('/api/recommend/users/sample')
    def sample_users():
        only_cached = request.args.get('onlyCached', 'true').lower() in ('1', 'true', 'yes')
        n = request.args.get('n', 10, type=int)
        n = max(1, min(n, 100))

        if only_cached and state['cached_user_ids']:
            pool = state['cached_user_ids']
        else:
            pool = list(state['user2hist'].keys())

        sample = random.sample(pool, min(n, len(pool))) if pool else []
        return jsonify(build_response(200, 'success', {
            'userIds': [int(uid) for uid in sample],
            'modelVersion': MODEL_VERSION,
            'dataVersion': DATA_VERSION,
            'year': YEAR,
            'onlyCached': only_cached,
        }))

    @app.get('/api/recommend/topk')
    def topk():
        start = time.time()
        user_id, error = resolve_user_id(request.args.get('userId'))
        if error:
            return jsonify(build_response(400, error)), 400
        k = request.args.get('k', TOP_K, type=int)
        k = max(1, min(k, CACHE_TOPK))

        hit_cache = False
        reason = 'realtime fallback'
        try:
            # 优先查缓存
            cache = state.get('cache')
            cached = cache.get(user_id) if cache else None
            if cached:
                hit_cache = True
                reason = 'cache hit with business rerank'
                reranked = apply_business_rerank(
                    cached, state['user2hist'], user_id, k=k
                )
                items = [
                    {
                        'itemId': it['item_id'],
                        'score': round(it['score'], 6),
                        'rank': rank + 1,
                        'reason': reason,
                    }
                    for rank, it in enumerate(reranked)
                ]
            else:
                # 未命中兜底：实时推理
                recommend_list = get_recommendations_for_user(
                    user_id, state, top_k=k
                )
                items = [
                    {
                        'itemId': int(it),
                        'score': 0.0,
                        'rank': rank + 1,
                        'reason': 'realtime inference fallback',
                    }
                    for rank, it in enumerate(recommend_list)
                ]

            latency_ms = int((time.time() - start) * 1000)
            return jsonify(build_response(200, 'success', {
                'userId': user_id,
                'items': items,
                'modelVersion': MODEL_VERSION,
                'dataVersion': DATA_VERSION,
                'year': YEAR,
                'hitCache': hit_cache,
                'latencyMs': latency_ms,
            }))
        except Exception as exc:
            return jsonify(build_response(500, f'recommendation failed: {exc}')), 500

    @app.post('/api/recommend')
    def recommend():
        """保留旧接口以兼容现有调用方。"""
        payload = request.get_json(silent=True) or {}
        user_id, error = resolve_user_id(payload.get('userId'))
        if error:
            return jsonify(build_response(400, error)), 400

        try:
            recommend_list = get_recommendations_for_user(user_id, state, top_k=TOP_K)
        except Exception as exc:
            return jsonify(build_response(500, f'recommendation failed: {exc}')), 500

        return jsonify(build_response(200, 'success', {'recommendList': recommend_list}))

    return app


def run_http_server(host=API_HOST, port=API_PORT):
    app = build_http_app()
    app.run(host=host, port=port, debug=False, use_reloader=False)


def cli():
    import argparse

    parser = argparse.ArgumentParser(description='DIN training and recommendation service')
    parser.add_argument('--mode', choices=['train', 'serve', 'predict', 'precompute'], default='train')
    parser.add_argument('--user-id', type=int, default=None)
    parser.add_argument('--top-k', type=int, default=TOP_K)
    parser.add_argument('--cache-topk', type=int, default=CACHE_TOPK)
    parser.add_argument('--precompute-batch-size', type=int, default=PRECOMPUTE_BATCH_SIZE)
    parser.add_argument('--user-chunk-size', type=int, default=16)
    parser.add_argument('--recall-max-candidates', type=int, default=5000)
    parser.add_argument('--host', default=API_HOST)
    parser.add_argument('--port', type=int, default=API_PORT)
    args = parser.parse_args()

    if args.mode == 'serve':
        run_http_server(host=args.host, port=args.port)
        return

    if args.mode == 'predict':
        runtime_state = prepare_runtime_state()
        if args.user_id is None:
            raise ValueError('--user-id is required when mode is predict')
        recommendations = get_recommendations_for_user(args.user_id, runtime_state, top_k=args.top_k)
        print({'code': 200, 'msg': 'success', 'data': {'recommendList': recommendations}})
        return

    if args.mode == 'precompute':
        runtime_state = prepare_runtime_state()
        # Sprint 3: 仅预计算 Top-1000 高频用户(按行为数量排序)
        # 此前对全量用户预计算,耗时 ~8 小时
        # 现改为 Top-1000,耗时降至 ~30 分钟,80/20 命中率足够覆盖 demo/论文场景
        all_user_ids = list(runtime_state['user2hist'].keys())
        user2hist = runtime_state['user2hist']
        user_ids = sorted(
            all_user_ids,
            key=lambda uid: len(user2hist.get(uid, [])),
            reverse=True,
        )[:PRECOMPUTE_USER_TOPN]
        print(f'预计算用户范围: Top-{PRECOMPUTE_USER_TOPN} 高频用户 (共 {len(all_user_ids)} 个用户)')
        batch_precompute_topk(
            runtime_state['model'],
            user_ids,
            runtime_state['item2id'],
            runtime_state['id2item'],
            runtime_state['user2hist'],
            runtime_state['user2hist_cat'],
            runtime_state['user2hist_beh'],
            runtime_state['item_cat_map'],
            topk=args.cache_topk,
            batch_size=args.precompute_batch_size,
            user_chunk_size=args.user_chunk_size,
            recall_max_candidates=args.recall_max_candidates,
        )
        return

    main()


def main():
    print('=' * 60)
    print('1. 读取数据')
    print('=' * 60)
    user_df, item_df = load_data()
    print(f'用户行为数据: {user_df.shape}, 列: {list(user_df.columns)}')
    print(f'商品数据:     {item_df.shape}, 列: {list(item_df.columns)}')
    print(f'behavior_type 分布:\n{user_df["behavior_type"].value_counts().sort_index()}')

    print('\n' + '=' * 60)
    print('2. 特征工程 & 样本构造 (负采样 + 类别特征)')
    print('=' * 60)
    sample_df, item2id, id2item, user2hist, user2hist_cat, user2hist_beh, cat2id, num_categories = build_samples(user_df)
    print(f'商品词表大小（含 padding）: {len(item2id) + 1}')
    print(f'类别词表大小（含 padding）: {num_categories}')

    X_hist = np.array(sample_df['hist_padded'].tolist(), dtype=np.int64)
    X_hist_cat = np.array(sample_df['hist_cat_padded'].tolist(), dtype=np.int64)
    X_hist_beh = np.array(sample_df['hist_beh_padded'].tolist(), dtype=np.int64)
    X_target = np.array(sample_df['target_item'].tolist(), dtype=np.int64).reshape(-1, 1)
    X_target_cat = np.array(sample_df['target_cat'].tolist(), dtype=np.int64).reshape(-1, 1)
    y = np.array(sample_df['label'].tolist(), dtype=np.int64)

    X_tr_h, X_val_h, X_tr_hc, X_val_hc, X_tr_hb, X_val_hb, X_tr_t, X_val_t, X_tr_tc, X_val_tc, y_tr, y_val = train_test_split(
        X_hist, X_hist_cat, X_hist_beh, X_target, X_target_cat, y,
        test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f'训练集: {len(X_tr_h)} 条, 验证集: {len(X_val_h)} 条')
    print(f'训练集正样本比例: {y_tr.mean():.4f}')
    print(f'验证集正样本比例: {y_val.mean():.4f}')

    print('\n' + '=' * 60)
    print('3. 构建 DIN 模型 (embedding=32, DNN=128→64→32)')
    print('=' * 60)
    num_items = len(item2id) + 1
    model = build_din(num_items, EMBEDDING_DIM, MAX_SEQ_LEN, num_categories)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(0.001),
        loss='binary_crossentropy',
        metrics=[
            tf.keras.metrics.AUC(name='auc'),
            tf.keras.metrics.Precision(thresholds=0.1, name='precision'),
            tf.keras.metrics.Recall(thresholds=0.1, name='recall'),
        ],
    )
    print(f'模型参数量: {model.count_params():,}')

    print('\n' + '=' * 60)
    print('4. 开始训练')
    print('=' * 60)

    train_x = [X_tr_h, X_tr_hc, X_tr_hb, X_tr_t, X_tr_tc]
    val_x = [X_val_h, X_val_hc, X_val_hb, X_val_t, X_val_tc]

    metrics_history = MetricsHistory((val_x, y_val))
    early_stop = EarlyStopping(monitor='val_auc', mode='max', patience=5, restore_best_weights=True, verbose=1)
    lr_scheduler = LearningRateScheduler(lambda epoch: 0.001 * (0.9 ** epoch))

    model.fit(
        x=train_x,
        y=y_tr,
        validation_data=(val_x, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stop, metrics_history, lr_scheduler],
        verbose=1,
    )

    print('\n' + '=' * 60)
    print('5. 评估 & 推理验证')
    print('=' * 60)
    save_assets(model, metrics_history)

    y_val_pred = model.predict(val_x, verbose=0).flatten()
    final_auc = roc_auc_score(y_val, y_val_pred)
    print(f'\n验证集最终指标:')
    print(f'  AUC: {final_auc:.4f}')
    prec, rec, thr = precision_recall_curve(y_val, y_val_pred)
    f1s = 2 * prec[:-1] * rec[:-1] / (prec[:-1] + rec[:-1] + 1e-12)
    bi = int(np.argmax(f1s))
    final_f1 = f1_score(y_val, (y_val_pred >= thr[bi]).astype(int))
    print(f'  最优阈值: {thr[bi]:.4f}')
    print(f'  Precision (最优阈值): {prec[bi]:.4f}')
    print(f'  Recall (最优阈值): {rec[bi]:.4f}')
    print(f'  F1 (最优阈值): {final_f1:.4f}')

    item_cat_map = {}
    for _, row in user_df.drop_duplicates('item_id').iterrows():
        item_idx = item2id.get(int(row['item_id']))
        if item_idx is not None:
            item_cat_map[item_idx] = cat2id.get(int(row['item_category']), 0)

    sample_user_id = int(sample_df['user_id'].iloc[0])
    rec_items = get_recommendations_for_user(sample_user_id, {
        'model': model,
        'user2hist': user2hist,
        'user2hist_cat': user2hist_cat,
        'user2hist_beh': user2hist_beh,
        'item2id': item2id,
        'id2item': id2item,
        'cat2id': cat2id,
        'item_cat_map': item_cat_map,
    }, top_k=TOP_K)
    print(f'\n示例推荐 user_id={sample_user_id}: {rec_items}')
    print('Done!')


if __name__ == '__main__':
    cli()
