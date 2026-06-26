# DIN推荐模块设计

![推荐流程图](assets/recommendation-flow.png)

## 7.1 模块概述

### 7.1.1 功能定位

DIN（Deep Interest Network）推荐模块基于用户历史行为序列，通过注意力机制动态捕捉用户当前兴趣，实现个性化商品推荐。本模块采用"召回+精排"两阶段架构，在保证推荐精度的同时满足实时响应要求。

### 7.1.2 技术选型

| 技术 | 版本 | 选型理由 |
|-----|------|---------|
| TensorFlow/Keras | 2.x | DIN模型实现，Keras高层API便于快速构建 |
| Flask | 2.x+ | 轻量级Web服务，快速部署推荐API |
| pandas/numpy | 2.x/1.x | 数据处理与数值计算 |
| scikit-learn | 1.x | 评估指标（AUC、F1等） |
| Redis | - | 推荐结果缓存、分布式锁 |

### 7.1.3 性能指标

| 指标 | 目标值 | 实际值 |
|-----|-------|-------|
| AUC | ≥0.80 | 0.85+ |
| F1 | ≥0.70 | 0.75+ |
| 推荐响应时间（缓存命中） | ≤50ms | 15ms |
| 推荐响应时间（实时推理） | ≤3s | 1-2s |
| 预计算用户覆盖 | Top-1000高频 | 80%+请求命中缓存 |
| 支持Top-K | K=40 | 可配置 |

## 7.2 DIN算法原理

### 7.2.1 核心思想

传统推荐模型（如Wide&Deep、DeepFM）将用户历史行为直接Pooling，无法区分不同历史行为对当前候选商品的重要性差异。DIN提出**兴趣激活机制**：

- 根据候选商品（Target Item），通过注意力网络计算用户历史行为的加权和
- 与候选商品更相关的历史行为获得更高权重
- 实现"千物千面"的用户兴趣表示

### 7.2.2 模型结构

```
输入层
├── 用户历史行为序列 (hist_items: [seq_len])
├── 历史行为类目 (hist_cats: [seq_len])
├── 历史行为类型 (hist_behs: [seq_len])
├── 目标商品 (target_item: [1])
└── 目标商品类目 (target_cat: [1])
    ↓
Embedding层
├── 商品Embedding (num_items × 32)
├── 类目Embedding (num_categories × 16)
└── 行为类型Embedding (5 × 8)
    ↓
注意力池化层 (Attention Pooling)
├── 计算历史行为与目标商品的注意力分数
├── Query: 目标商品Embedding (投影后)
├── Keys: 历史行为序列Embedding
├── 注意力输入: [Query, Key, Query-Key, Query*Key]
└── 加权求和得到用户兴趣向量
    ↓
全连接层 (DNN)
├── Dense(128) → Dice → BN → Dropout(0.3)
├── Dense(64)  → Dice → BN → Dropout(0.3)
└── Dense(32)  → Dice
    ↓
输出层
└── Dense(1, sigmoid) → 点击概率
```

### 7.2.3 Dice激活函数

Dice（Data Adaptive Activation Function）是DIN提出的自定义激活函数，根据输入数据分布自适应调整整流点：

```python
class Dice(layers.Layer):
    def call(self, x):
        # 计算均值和标准差
        mean = mean(x, axis=axes, keepdims=True)
        variance = mean(square(x - mean), axis=axes, keepdims=True)
        std = sqrt(variance + 1e-8)
        normed = (x - mean) / std
        p = sigmoid(normed)
        return p * x + (1.0 - p) * self.alpha * x
```

相比PReLU，Dice根据每层输入数据的分布动态调整整流点，训练更稳定。

### 7.2.4 注意力机制

注意力分数计算网络：

```
Attention Input: [query, key, query-key, query*key] (维度: 32+32+32+32=128)
    ↓
Dense(80) → Dice
    ↓
Dense(40) → Dice
    ↓
Dense(1) → 注意力分数
    ↓
Mask (padding位置置为-1e9)
    ↓
Softmax → 注意力权重
    ↓
加权求和: Σ(weight_i * hist_emb_i) → 用户兴趣向量
```

## 7.3 数据处理

### 7.3.1 数据集

使用天池移动推荐数据集（Tianchi Mobile Recommendation Dataset）：

| 数据 | 规模 | 说明 |
|-----|------|------|
| 用户行为数据 | 50万条 | 包含user_id, item_id, item_category, behavior_type, time |
| 商品数据 | 全量商品 | item_id, item_category, 商品元信息 |
| 行为类型 | 4种 | 1-浏览, 2-点击, 3-收藏, 4-购买 |

### 7.3.2 样本构造

```python
def build_base_samples(user_df):
    # 1. 按用户分组，按时间排序
    # 2. 滑动窗口构造样本：前N个行为作为历史，当前行为作为目标
    # 3. label=1当且仅当behavior_type=4（购买）
    for user_id, group in user_df.groupby('user_id'):
        seq = []
        for _, row in group.iterrows():
            if seq:
                samples.append({
                    'hist_items': list(seq),  # 历史商品序列
                    'target_item': current_item,
                    'label': 1 if behavior_type == 4 else 0
                })
            seq.append(current_item)
```

### 7.3.3 负采样

由于购买行为稀疏（正样本比例<5%），采用以下负采样策略：

1. **自然负样本**：行为类型为1-3（浏览/点击/收藏）但未购买
2. **合成负样本**：从用户未交互过的商品中随机采样
3. **负采样比例**：正负样本比1:5

```python
def sample_negatives(pos_samples, neg_ratio=5):
    # 1. 保留自然负样本（采样）
    # 2. 合成负样本：用户历史外商品随机采样
    # 3. 序列补齐（padding到MAX_SEQ_LEN=50）
```

### 7.3.4 序列补齐

历史行为序列固定长度为50，不足补0（padding），过长截断最近50个：

```python
def pad_sequence(seq, max_len=50):
    if len(seq) >= max_len:
        return seq[-max_len:]  # 保留最近50个行为
    return [0] * (max_len - len(seq)) + seq  # 左侧补0
```

## 7.4 两阶段推荐架构

### 7.4.1 架构演进

**初始方案（全量精排）问题：**
- 36万候选商品 × 用户历史序列 → 内存峰值>600MB
- 单次推荐耗时数十秒 → 无法在线服务
- 离线预计算全量用户 → 耗时~8小时

**优化方案（召回+精排）：**
- 召回阶段：快速筛选1万候选
- 精排阶段：DIN对1万候选精准打分
- 内存峰值降至~12MB，推理耗时秒级

### 7.4.2 召回阶段

```python
def build_recall_candidates(user_ids, ...):
    for uid in user_ids:
        # 1. 获取用户历史交互类目
        related_cats = {item_cat_map[item] for item in user_hist[uid]}
        
        # 2. 相关类目下所有商品（排除历史已交互）
        related_items = ∪ category_items[cat] for cat in related_cats
        
        # 3. 补充全局热门商品（按交互次数排序）
        # 4. 截断到max_candidates=10000
        candidates = list(related_items) + hot_items[:补足]
        candidates = candidates[:10000]
```

**召回策略：**
- 规则召回：用户历史相关类目商品（覆盖用户兴趣）
- 热门召回：全局Top-3000热门商品（覆盖流行度）
- 候选规模：1万（平衡精度和性能）

### 7.4.3 精排阶段

```python
def recommend_topk(model, user_id, ...):
    # 1. 获取召回候选集（1万）
    candidates = build_recall_candidates([user_id])
    
    # 2. 批量构造模型输入
    hist_batch = tile(user_hist_padded, [n_candidates, 1])
    tgt_batch = candidates.reshape(-1, 1)
    
    # 3. DIN模型批量打分
    scores = model.predict([hist_batch, ..., tgt_batch])
    
    # 4. 取Top-K
    top_k_indices = argsort(scores)[-k:][::-1]
    return [id2item[idx] for idx in top_k_indices]
```

### 7.4.4 性能对比

| 方案 | 候选数量 | 内存峰值 | 单次耗时 | 预计算耗时 |
|-----|---------|---------|---------|----------|
| 全量精排 | 36万 | >600MB | 数十秒 | ~8小时 |
| 召回+精排 | 1万 | ~12MB | 1-2秒 | ~30分钟 |

## 7.5 离线预计算与缓存

### 7.5.1 预计算策略

由于实时推理仍需1-2秒，采用离线预计算+在线缓存方案：

- **预计算范围**：Top-1000高频用户（按行为数量排序）
- **预计算内容**：每个用户Top-500推荐商品及分数
- **预计算频率**：每日凌晨更新
- **覆盖率**：Top-1000用户覆盖80%+请求（80/20原则）

```python
def batch_precompute_topk(model, user_ids, topk=500):
    # 1. 分块处理用户（每块16个用户）
    # 2. 批量构造输入，向量化计算分数
    # 3. argpartition快速截断TopK（比argsort更快）
    # 4. 结果存入版本化缓存
```

### 7.5.2 缓存安全（JSON+HMAC）

**安全隐患：** 传统pickle缓存存在任意代码执行（RCE）风险。

**加固方案：**

```python
# 保存：JSON序列化 + HMAC签名
cache_json = json.dumps(cache_payload, ensure_ascii=False).encode('utf-8')
hmac_key = os.environ.get('DIN_CACHE_HMAC_KEY', 'default-key').encode('utf-8')
signature = hmac.new(hmac_key, cache_json, hashlib.sha256).hexdigest()
with open(cache_path, 'w') as f:
    f.write(signature + '\n')      # 第一行：HMAC签名
    f.write(cache_json.decode())   # 第二行：JSON数据

# 加载：先验签
stored_signature, cache_json = content.split('\n', 1)
expected_signature = hmac.new(hmac_key, cache_json.encode(), hashlib.sha256).hexdigest()
if not hmac.compare_digest(stored_signature, expected_signature):
    raise SecurityError("缓存签名校验失败")  # 防篡改
```

### 7.5.3 在线服务流程

```
请求 GET /api/recommend/topk?userId=123&k=40
    ↓
1. 检查缓存
   ├─ 缓存命中 → 业务重排 → 返回（15ms）
   └─ 缓存未命中 → 召回+实时推理 → 返回（1-2s）
```

### 7.5.4 业务规则重排

缓存返回的Top-500结果经过轻量业务规则重排后取Top-K：

```python
def apply_business_rerank(cached_items, user_hist, user_id, k=40):
    # 1. 过滤历史已交互商品（去重）
    filtered = [it for it in cached_items if it['item_idx'] not in hist_set]
    
    # 2. 类目打散：同一类目连续不超过3个
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
    return result
```

## 7.6 模型训练

### 7.6.1 超参数配置

| 参数 | 值 | 说明 |
|-----|-----|------|
| EMBEDDING_DIM | 32 | 商品Embedding维度 |
| MAX_SEQ_LEN | 50 | 历史序列最大长度 |
| BATCH_SIZE | 512 | 批次大小 |
| EPOCHS | 30 | 最大训练轮数 |
| LEARNING_RATE | 0.001 | 初始学习率 |
| LR_DECAY | 0.9/epoch | 指数学习率衰减 |
| NEG_RATIO | 5 | 负采样比例 |
| DROPOUT | 0.3 | Dropout率 |
| EARLY_STOPPING | patience=5 | 早停（监控val_auc） |

### 7.6.2 训练流程

```python
def main():
    # 1. 加载数据
    user_df, item_df = load_data()
    
    # 2. 特征工程 + 样本构造（负采样）
    sample_df, item2id, id2item, user2hist, ... = build_samples(user_df)
    
    # 3. 训练/验证集划分（stratify=y保证正负比例）
    X_train, X_val, y_train, y_val = train_test_split(..., test_size=0.2, stratify=y)
    
    # 4. 构建DIN模型
    model = build_din(num_items, EMBEDDING_DIM, MAX_SEQ_LEN, num_categories)
    model.compile(optimizer=Adam(0.001), loss='binary_crossentropy', metrics=['AUC', 'Precision', 'Recall'])
    
    # 5. 训练（早停+学习率衰减+指标回调）
    model.fit(X_train, y_train, validation_data=(X_val, y_val),
              callbacks=[early_stop, metrics_history, lr_scheduler])
    
    # 6. 评估
    # AUC、Precision、Recall、F1、Precision@K、Recall@K
    
    # 7. 保存模型权重
    model.save_weights('din_model.weights.h5')
```

### 7.6.3 评估指标

| 指标 | 说明 |
|-----|------|
| AUC | ROC曲线下面积，衡量排序能力 |
| Precision | 最优阈值下精确率 |
| Recall | 最优阈值下召回率 |
| F1 | Precision和Recall调和平均 |
| Precision@K | Top-K推荐中的精确率 |
| Recall@K | Top-K推荐中的召回率 |

### 7.6.4 K折交叉验证

支持K折交叉验证评估模型稳定性：

```bash
python din_model.py --mode train --k-folds 5
```

## 7.7 API服务

### 7.7.1 启动命令

```bash
# 训练模式
python din_model.py --mode train

# 服务模式（启动Flask API）
python din_model.py --mode serve --host 0.0.0.0 --port 8000

# 离线预计算（生成缓存）
python din_model.py --mode precompute --cache-topk 500

# 单用户预测
python din_model.py --mode predict --user-id 123 --top-k 20
```

### 7.7.2 核心接口

见 `05_api_design.md` 5.7节。

### 7.7.3 服务状态

```bash
curl http://localhost:8000/health
```

响应：
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "status": "ok",
    "modelVersion": "v1",
    "cacheLoaded": true,
    "cachedUsers": 1000
  }
}
```

## 7.8 与订单服务集成

订单服务通过Feign调用DIN推荐服务：

```java
@FeignClient(name = "din-recommend-service", url = "${din.service.url:http://localhost:8000}")
public interface RecommendFeignClient {
    
    @GetMapping("/api/recommend/topk")
    Result<RecommendVO> getTopKRecommend(
        @RequestParam("userId") Long userId,
        @RequestParam(value = "k", defaultValue = "20") Integer k
    );
}
```

**集成场景：**
- 首页"猜你喜欢"：根据登录用户ID获取推荐
- 识别结果页"相似推荐"：结合识别类别获取推荐
- 订单详情页"你可能还喜欢"：购买后推荐关联商品

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
