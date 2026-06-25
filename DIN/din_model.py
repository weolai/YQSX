import os
import warnings
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, Model, Input
from tensorflow.keras.callbacks import EarlyStopping, Callback
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_recall_curve, f1_score
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# ========== 1. 数据读取 ==========
print('=' * 60)
print('1. 读取数据')
print('=' * 60)

user_df = pd.read_csv(
    'tianchi_mobile_recommend_train_user.csv',
    nrows=100000
)
item_df = pd.read_csv('tianchi_mobile_recommend_train_item.csv')

print(f'用户行为数据: {user_df.shape}, 列: {list(user_df.columns)}')
print(f'商品数据:     {item_df.shape}, 列: {list(item_df.columns)}')
print(f'bevavior_type 分布:\n{user_df["behavior_type"].value_counts().sort_index()}')

# ========== 2. 特征工程 ==========
print('\n' + '=' * 60)
print('2. 特征工程 & 样本构造')
print('=' * 60)

# 2a. 时间解析 & 排序
user_df['time'] = pd.to_datetime(user_df['time'], format='%Y-%m-%d %H')
user_df = user_df.sort_values(['user_id', 'time']).reset_index(drop=True)

# 2b. 构建商品 ID 映射（0 留作 padding）
item_ids = user_df['item_id'].unique()
item2id = {item: idx + 1 for idx, item in enumerate(item_ids)}
num_items = len(item_ids) + 1
user_df['item_idx'] = user_df['item_id'].map(item2id)
print(f'商品词表大小（含 padding）: {num_items}')

# 2c. 按用户构造 (历史序列, 目标商品, 标签) 三元组
def build_samples(group):
    samples = []
    seq = []
    for _, row in group.iterrows():
        if len(seq) > 0:
            samples.append({
                'hist_items': list(seq),
                'target_item': row['item_idx'],
                'label': 1 if row['behavior_type'] == 4 else 0
            })
        seq.append(row['item_idx'])
    return samples

all_samples = []
for uid, grp in user_df.groupby('user_id'):
    all_samples.extend(build_samples(grp))

sample_df = pd.DataFrame(all_samples)
pos = sample_df['label'].sum()
neg = len(sample_df) - pos
print(f'总样本数: {len(sample_df)}, 正样本: {pos}, 负样本: {neg}, 正样本比例: {pos / len(sample_df):.4f}')

# 2d. 序列 padding 至固定长度
MAX_SEQ_LEN = 50

def pad_sequence(seq, max_len):
    if len(seq) >= max_len:
        return seq[-max_len:]
    return [0] * (max_len - len(seq)) + seq

sample_df['hist_padded'] = sample_df['hist_items'].apply(lambda x: pad_sequence(x, MAX_SEQ_LEN))

# 2e. 训练 / 验证 划分 (8:2)
X_hist = np.array(sample_df['hist_padded'].tolist())
X_target = np.array(sample_df['target_item'].tolist()).reshape(-1, 1)
y = np.array(sample_df['label'].tolist())

X_hist_tr, X_hist_val, X_tgt_tr, X_tgt_val, y_tr, y_val = train_test_split(
    X_hist, X_target, y, test_size=0.2, random_state=42, stratify=y
)

print(f'训练集: {len(X_hist_tr)} 条, 验证集: {len(X_hist_val)} 条')
print(f'训练集正样本比例: {y_tr.mean():.4f}')
print(f'验证集正样本比例: {y_val.mean():.4f}')

# ========== 3. DIN 模型定义 ==========
print('\n' + '=' * 60)
print('3. 构建 DIN 模型')
print('=' * 60)

EMBEDDING_DIM = 16


class Dice(layers.Layer):
    """DIN 论文提出的 Data-dependent Activation (Dice)。

    f(s) = p(s)·s + (1-p(s))·αs
    p(s) = sigmoid((s - E[s]) / sqrt(Var[s] + ε))
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        self.alpha = self.add_weight(
            name='alpha', shape=(input_shape[-1],),
            initializer='zeros', trainable=True,
        )
        super().build(input_shape)

    def call(self, x):
        axes = list(range(len(x.shape) - 1))
        mean, variance = tf.nn.moments(x, axes=axes)
        std = tf.sqrt(variance + 1e-8)
        normed = (x - mean) / std
        p = tf.sigmoid(normed)
        return p * x + (1.0 - p) * self.alpha * x


class AttentionPoolingLayer(layers.Layer):
    """DIN 注意力池化层。

    论文 Fig 2：feature → 80(Dice) → 40(Dice) → 1 的两层 attention unit。
    输入: [query, keys, query-keys, query*keys] → 注意力分数 → 对 keys 加权求和。
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        input_dim = input_shape[-1]  # E — keys 的 embedding 维度
        self.attn_network = tf.keras.Sequential([
            layers.Dense(80), Dice(),
            layers.Dense(40), Dice(),
            layers.Dense(1, use_bias=False),
        ])
        super().build(input_shape)

    def call(self, query, keys, keys_length):
        query_tiled = tf.tile(tf.expand_dims(query, 1),
                              [1, tf.shape(keys)[1], 1])               # [B, T, E]

        attn_input = tf.concat([
            query_tiled,
            keys,
            query_tiled - keys,
            query_tiled * keys,
        ], axis=-1)                                                    # [B, T, 4E]

        attn_score = self.attn_network(attn_input)                     # [B, T, 1]
        attn_score = tf.squeeze(attn_score, -1)                        # [B, T]

        mask = tf.sequence_mask(keys_length, tf.shape(keys)[1],
                                dtype=tf.float32)
        attn_score = attn_score * mask + (1.0 - mask) * (-1e9)
        attn_weight = tf.nn.softmax(attn_score, axis=-1)               # [B, T]

        return tf.reduce_sum(
            tf.expand_dims(attn_weight, -1) * keys, axis=1
        )                                                              # [B, E]


def build_din(num_items, embedding_dim, max_seq_len):
    #用户历史行为序列
    hist_input = Input(shape=(max_seq_len,), name='history_items')    # [B, T]

    # 候选广告
    target_input = Input(shape=(1,), name='target_item')              # [B, 1]

    #商品转为稠密向量
    embed_layer = layers.Embedding(
        num_items, embedding_dim, mask_zero=True, name='item_embedding'
    )

    #所有历史商品Embedding
    hist_emb = embed_layer(hist_input)                                # [B, T, E]
    # 候选 Ad 向量
    target_emb = tf.squeeze(embed_layer(target_input), axis=1)        # [B, E]
    #统计每个用户真实历史行为条数
    seq_len = tf.reduce_sum(
        tf.cast(tf.not_equal(hist_input, 0), tf.int32), axis=1
    )                                                                 # [B,]

    attn_pool = AttentionPoolingLayer()(target_emb, hist_emb, seq_len)
    concat = layers.Concatenate()([attn_pool, target_emb])

    dnn = layers.Dense(80)(concat)
    dnn = Dice()(dnn)
    dnn = layers.BatchNormalization()(dnn)
    dnn = layers.Dropout(0.3)(dnn)
    dnn = layers.Dense(40)(dnn)
    dnn = Dice()(dnn)
    dnn = layers.BatchNormalization()(dnn)
    dnn = layers.Dropout(0.3)(dnn)
    output = layers.Dense(1, activation='sigmoid')(dnn)

    return Model(inputs=[hist_input, target_input], outputs=output)


model = build_din(num_items, EMBEDDING_DIM, MAX_SEQ_LEN)
model.compile(
    optimizer=tf.keras.optimizers.Adam(0.001),
    loss='binary_crossentropy',
    metrics=[
        tf.keras.metrics.AUC(name='auc'),
        tf.keras.metrics.Precision(thresholds=0.1, name='precision'),
        tf.keras.metrics.Recall(thresholds=0.1, name='recall'),
    ]
)
model.summary()

# ========== 4. 训练 ==========
print('\n' + '=' * 60)
print('4. 开始训练')
print('=' * 60)


class MetricsHistory(Callback):
    """记录每 epoch 的指标：Loss、AUC、Precision/Recall/F1（最优阈值）、Precision@K / Recall@K。"""

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
        """计算 Precision@K 和 Recall@K。"""
        top_k = np.argsort(y_score)[::-1][:k]
        hits = y_true[top_k].sum()
        total_pos = y_true.sum()
        return hits / k, hits / total_pos if total_pos > 0 else 0.0

    def on_epoch_end(self, epoch, logs=None):
        xv, yv = self.val_data
        yp = self.model.predict(xv, verbose=0).flatten()

        # AUC
        self.val_auc.append(roc_auc_score(yv, yp))

        # 最优阈值下的 Precision / Recall / F1
        precisions, recalls, threshs = precision_recall_curve(yv, yp)
        f1_scores = 2 * precisions[:-1] * recalls[:-1] / (precisions[:-1] + recalls[:-1] + 1e-12)
        best_idx = np.argmax(f1_scores)
        best_thresh = threshs[best_idx]
        yp_bin = (yp >= best_thresh).astype(int)
        self.val_precision.append(precisions[best_idx])
        self.val_recall.append(recalls[best_idx])
        self.val_f1.append(f1_scores[best_idx])

        # Precision@K / Recall@K
        for k in self.k_list:
            p, r = self._ranking_metrics(yv, yp, k)
            self.val_pr_at_k[k].append(p)
            self.val_re_at_k[k].append(r)

        self.train_loss.append(logs.get('loss'))
        self.val_loss.append(logs.get('val_loss'))
        print(f'   └─ auc={self.val_auc[-1]:.4f}  '
              f'prec={self.val_precision[-1]:.4f}  '
              f'recall={self.val_recall[-1]:.4f}  '
              f'f1={self.val_f1[-1]:.4f}  '
              f'(thresh={best_thresh:.3f})')


metrics_history = MetricsHistory(([X_hist_val, X_tgt_val], y_val))

early_stop = EarlyStopping(
    monitor='val_auc',
    mode='max',
    patience=3,
    restore_best_weights=True,
    verbose=1
)

history = model.fit(
    x=[X_hist_tr, X_tgt_tr],
    y=y_tr,
    validation_data=([X_hist_val, X_tgt_val], y_val),
    epochs=20,
    batch_size=256,
    callbacks=[early_stop, metrics_history],
    verbose=1
)

# ========== 5. 评估与可视化 ==========
print('\n' + '=' * 60)
print('5. 评估 & 可视化')
print('=' * 60)

# 保存模型权重（供推荐测试脚本加载）
model.save_weights('din_model_weights.h5')
print('模型权重已保存至 din_model_weights.h5')

# 最终验证集指标
y_val_pred = model.predict([X_hist_val, X_tgt_val], verbose=0).flatten()
final_auc = roc_auc_score(y_val, y_val_pred)
print(f'\n验证集最终指标:')
print(f'  AUC:                {final_auc:.4f}')

prec, rec, thr = precision_recall_curve(y_val, y_val_pred)
f1s = 2 * prec[:-1] * rec[:-1] / (prec[:-1] + rec[:-1] + 1e-12)
bi = np.argmax(f1s)
ypb = (y_val_pred >= thr[bi]).astype(int)
final_f1 = f1_score(y_val, ypb)
print(f'  最优阈值:           {thr[bi]:.4f}')
print(f'  Precision (最优阈值): {prec[bi]:.4f}')
print(f'  Recall (最优阈值):    {rec[bi]:.4f}')
print(f'  F1 (最优阈值):        {final_f1:.4f}')

# ========== 绘图：Loss + AUC + Precision/Recall + F1 + Precision@K ==========
fig, axes = plt.subplots(2, 3, figsize=(16, 9))
epochs_range = range(1, len(metrics_history.train_loss) + 1)

# 1. Loss
ax = axes[0, 0]
ax.plot(epochs_range, metrics_history.train_loss, label='Train Loss', lw=2)
ax.plot(epochs_range, metrics_history.val_loss, label='Val Loss', lw=2)
ax.set_xlabel('Epoch'); ax.set_ylabel('Loss')
ax.set_title('Loss'); ax.legend(); ax.grid(True, alpha=0.3)

# 2. AUC
ax = axes[0, 1]
ax.plot(epochs_range, metrics_history.val_auc, label='Val AUC', color='green', lw=2)
ax.set_xlabel('Epoch'); ax.set_ylabel('AUC')
ax.set_title('AUC'); ax.legend(); ax.grid(True, alpha=0.3)

# 3. Precision / Recall / F1 (最优阈值)
ax = axes[0, 2]
ax.plot(epochs_range, metrics_history.val_precision, label='Precision', lw=2)
ax.plot(epochs_range, metrics_history.val_recall, label='Recall', lw=2)
ax.plot(epochs_range, metrics_history.val_f1, label='F1', lw=2, linestyle='--')
ax.set_xlabel('Epoch'); ax.set_ylabel('Score')
ax.set_title('Precision / Recall / F1 (optimal threshold)')
ax.legend(); ax.grid(True, alpha=0.3)

# 4. Precision@K
ax = axes[1, 0]
for k in (5, 10, 20):
    ax.plot(epochs_range, metrics_history.val_pr_at_k[k], label=f'Precision@{k}', lw=2)
ax.set_xlabel('Epoch'); ax.set_ylabel('Precision@K')
ax.set_title('Precision@K'); ax.legend(); ax.grid(True, alpha=0.3)

# 5. Recall@K
ax = axes[1, 1]
for k in (5, 10, 20):
    ax.plot(epochs_range, metrics_history.val_re_at_k[k], label=f'Recall@{k}', lw=2)
ax.set_xlabel('Epoch'); ax.set_ylabel('Recall@K')
ax.set_title('Recall@K'); ax.legend(); ax.grid(True, alpha=0.3)

# 6. PR-AUC (area under Precision-Recall curve)
pr_aucs = []
for epoch_i in range(len(metrics_history.val_auc)):
    # Re-predict for each epoch isn't stored; approximate with final curve
    pass
ax = axes[1, 2]
ax.text(0.5, 0.5, 'PR Curve Area\n(use test_recommendation.py\nfor ranking metrics)',
        transform=ax.transAxes, ha='center', va='center', fontsize=11)
ax.set_title('Note')
ax.axis('off')

plt.tight_layout()
plt.savefig('training_curves.png', dpi=150)
print('\n训练曲线已保存至 training_curves.png')
plt.close()
print('Done!')
