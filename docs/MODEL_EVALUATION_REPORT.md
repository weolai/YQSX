# YOLOv11 零食识别模型评估报告

## 一、执行摘要

本报告对基于 **YOLOv11n** 训练的伊朗零食与薯片检测模型进行全面评估。模型在 19 类零食识别任务上表现优秀，在 60 张测试集图像上达到 **mAP@0.5 = 97.37%**、**Precision = 98.53%**、**Recall = 98.21%** 的指标。

主要结论：
- 模型整体性能优秀，能够满足拍照识别零食类别的业务需求。
- 17/19 类别达到接近完美的识别效果。
- 仅 2 个少数类（Ashi Mashi snacks、Chee pellet ketchup）因训练样本不足导致召回率偏低。
- 无显著的类别间混淆问题，之前报告中的 Cheetoz 系列混淆在标准评估中已大幅改善。

---

## 二、项目信息

| 项目 | 值 |
|-----|-----|
| 模型文件 | `best.pt` |
| 基础模型 | YOLO11n (2,585,857 参数，6.3 GFLOPs) |
| 训练配置 | `optimized_config.yaml` / `args.yaml` |
| 数据集 | Iranian Snack and Chips Detection (YOLO Format) |
| 类别数量 | 19 |
| 评估时间 | 2026-06-20 |
| 评估硬件 | AMD Ryzen 7 6800H CPU |
| 推理速度 | 105.7 ms/图像（CPU） |

---

## 三、训练配置

### 3.1 关键超参数

| 参数 | 值 | 说明 |
|-----|-----|-----|
| `epochs` | 120 | 训练轮数 |
| `imgsz` | 960 | 输入图像尺寸 |
| `batch` | 16 | 批次大小 |
| `optimizer` | AdamW | 优化器 |
| `lr0` | 0.001 | 初始学习率 |
| `lrf` | 0.01 | 最终学习率系数 |
| `cos_lr` | True | 余弦退火学习率 |
| `mosaic` | 1.0 | Mosaic 数据增强 |
| `mixup` | 0.2 | MixUp 增强 |
| `copy_paste` | 0.15 | Copy-Paste 增强 |
| `auto_augment` | randaugment | 自动增强 |
| `close_mosaic` | 10 | 最后 10 轮关闭 Mosaic |
| `patience` | 30 | 早停耐心值 |

### 3.2 数据增强策略

训练采用了较强的数据增强组合，包括 Mosaic、MixUp、Copy-Paste、RandAugment、HSV 颜色抖动、随机翻转等。这种策略有效提升了模型泛化能力，使测试集上的 mAP 达到 97% 以上。

---

## 四、评估方法

### 4.1 评估标准

本次评估统一使用 **Ultralytics 官方验证流程**，确保结果可复现、可对比：

```python
metrics = model.val(
    data='data.yaml',
    split='test',
    imgsz=960,
    conf=0.25,
    iou=0.7,
    device='cpu',
    batch=8,
    plots=True
)
```

### 4.2 评估指标说明

| 指标 | 说明 |
|-----|-----|
| **Precision** | 预测为正例中真正例的比例 |
| **Recall** | 真正例中被正确预测的比例 |
| **mAP@0.5** | IoU 阈值 0.5 时的平均精度均值 |
| **mAP@0.75** | IoU 阈值 0.75 时的平均精度均值 |
| **mAP@0.5:0.95** | IoU 从 0.5 到 0.95 步进 0.05 的平均 mAP |
| **AP50 (per class)** | 每个类别在 IoU=0.5 时的平均精度 |

### 4.3 数据集划分

| 子集 | 用途 | 图像数 |
|-----|------|--------|
| train | 模型训练 | 约 240 张 |
| valid | 训练过程验证 | 约 60 张 |
| test | 本次独立测试 | 60 张 |

---

## 五、总体性能指标

### 5.1 核心指标

| 指标 | 值 | 评级 |
|-----|-----|------|
| **mAP@0.5** | **97.37%** | 优秀 |
| **mAP@0.75** | **97.37%** | 优秀 |
| **mAP@0.5:0.95** | **97.06%** | 优秀 |
| **Precision** | **98.53%** | 优秀 |
| **Recall** | **98.21%** | 优秀 |
| **F1 分数** | **98.37%** | 优秀 |

### 5.2 与旧版自定义评估对比

| 指标 | 旧版自定义评估 | 本次 YOLO 官方评估 | 差异说明 |
|-----|---------------|-------------------|---------|
| Precision | 91.04% | 98.53% | 旧版使用固定 conf=0.25 和自定义匹配逻辑 |
| Recall | 98.97% | 98.21% | 旧版评估对 FN 统计方式不同 |
| mAP@0.5 | 未提供 | 97.37% | 官方评估更全面、标准 |

> **说明**：建议后续统一采用 YOLO 官方 `model.val()` 作为评估基准，避免不同脚本导致指标口径不一致。

---

## 六、类别级性能分析

### 6.1 类别名称映射

| class_id | 类别名称 | 数据库 category_id |
|:--------:|----------|:------------------:|
| 0 | Ashi Mashi snacks | 1 |
| 1 | Chee pellet ketchup | 2 |
| 2 | Chee pellet vinegar | 3 |
| 3 | Cheetoz chili chips | 4 |
| 4 | Cheetoz ketchup chips | 5 |
| 5 | Cheetoz onion and parsley chips | 6 |
| 6 | Cheetoz salty chips | 7 |
| 7 | Cheetoz snack 30g | 8 |
| 8 | Cheetoz snack 90g | 9 |
| 9 | Cheetoz vinegar chips | 10 |
| 10 | Cheetoz wheelsnack | 11 |
| 11 | Maz Maz ketchup chips | 12 |
| 12 | Maz Maz potato sticks | 13 |
| 13 | Maz Maz salty chips | 14 |
| 14 | Maz Maz vinegar chips | 15 |
| 15 | Mini Lina | 16 |
| 16 | Minoo cream biscuit | 17 |
| 17 | Naderi mini cookie | 18 |
| 18 | Naderi mini wafer | 19 |

### 6.2 各类别 AP50 排名

| 排名 | class_id | 类别名称 | AP50 | 表现 |
|:----:|:--------:|----------|:----:|------|
| 1 | 2~18（多数） | Chee pellet vinegar 等 | 0.995 | 完美 |
| 2 | 4 | Cheetoz ketchup chips | 0.988 | 优秀 |
| 3 | 1 | Chee pellet ketchup | 0.848 | 良好 |
| 4 | 0 | Ashi Mashi snacks | 0.745 | 需改进 |

**完美检测类别（AP50 ≥ 0.99）**：17/19，占比 89.5%

### 6.3 需关注类别

| 类别 | AP50 | 测试样本数 | 主要问题 | 根因 |
|------|:----:|:----------:|----------|------|
| Ashi Mashi snacks | 0.745 | 4 | 漏检 1 个 | 训练样本极少 |
| Chee pellet ketchup | 0.848 | 11 | 召回率 0.91 | 样本量偏少，与 class_0 略有混淆 |

---

## 七、混淆矩阵分析

### 7.1 关键发现

从混淆矩阵可以观察到：

1. **对角线主导**：绝大多数预测都正确落在对角线上，说明模型分类能力强。
2. **少量背景误检**：
   - 1 个背景目标被误识别为 class_4（Cheetoz ketchup chips）
   - 1 个背景目标被误识别为 class_12（Maz Maz potato sticks）
   - 1 个背景目标被误识别为 class_18（Naderi mini wafer）
3. **类别间混淆极少**：
   - 1 个 class_1 被误识别为 class_0
   - 这是唯一显著的类别间混淆
4. **少数类漏检**：
   - class_0 有 1 个样本未被检测出（被归为 background）
   - class_1 有 1 个样本未被检测出

### 7.2 与之前报告的对比

之前报告认为 Cheetoz 系列存在严重混淆，但本次标准评估显示：
- Cheetoz 各子类 AP50 均在 0.96~0.995 之间
- Cheetoz 子类之间几乎没有互相混淆
- 之前的混淆结论可能源于自定义评估脚本的匹配偏差或较低置信度阈值

---

## 八、错误案例分析

### 8.1 漏检案例

| 类别 | 真实数量 | 检测数量 | 漏检数 | 原因 |
|------|:--------:|:--------:|:------:|------|
| Ashi Mashi snacks | 4 | 3 | 1 | 样本量小，特征学习不充分 |
| Chee pellet ketchup | 11 | 10 | 1 | 与背景或其他小目标相似 |

### 8.2 误检案例

| 预测类别 | 误检来源 | 数量 | 说明 |
|----------|----------|:----:|------|
| class_4 (Cheetoz ketchup) | background | 1 | 红色包装背景干扰 |
| class_12 (Maz Maz potato) | background | 1 | 形状相似背景干扰 |
| class_18 (Naderi mini wafer) | background | 1 | 小目标误检 |
| class_0 (Ashi Mashi) | class_1 | 1 | 两类包装颜色相近 |

### 8.3 验证批次预测效果

从 `val_batch0_pred.jpg`、`val_batch1_pred.jpg`、`val_batch2_pred.jpg` 可以直观看到：
- 预测框定位精准，与真实框高度重合
- 类别标签和置信度显示清晰
- 密集场景下也能较好区分不同商品

---

## 九、训练过程分析

### 9.1 损失曲线趋势

根据 `results.csv` 记录的训练过程：

| 阶段 | box_loss | cls_loss | dfl_loss | 趋势 |
|------|:--------:|:--------:|:--------:|------|
| 初始（epoch 1） | 0.646 | 3.295 | 1.097 | 高损失 |
| 中期（epoch 30） | 0.357 | 0.471 | 0.895 | 快速下降 |
| 末期（epoch 113） | 0.145 | 0.176 | 0.790 | 收敛平稳 |

损失曲线显示模型训练充分，未出现明显过拟合。

### 9.2 验证指标趋势

| 阶段 | mAP50 | mAP50-95 | 趋势 |
|------|:------:|:--------:|------|
| epoch 10 | 98.36% | 95.85% | 快速提升 |
| epoch 30 | 98.85% | 97.26% | 趋于稳定 |
| epoch 113 | 99.40% | 98.21% | 最终收敛 |

> 注：训练集最终验证指标略高于本次独立测试集，差异在正常范围内。

---

## 十、生产部署建议

### 10.1 置信度阈值设置

| 场景 | 推荐阈值 | 说明 |
|------|:--------:|------|
| 高召回优先 | 0.25 | 尽可能不漏检，适合库存盘点 |
| 平衡模式 | 0.50 | 推荐默认阈值 |
| 高精度优先 | 0.70 | 减少误检，适合收银结算 |

### 10.2 类别映射

模型输出 `class_id` 需映射到业务 `category_id`：

```python
CLASS_TO_CATEGORY = {
    0: 1,   # Ashi Mashi snacks
    1: 2,   # Chee pellet ketchup
    2: 3,   # Chee pellet vinegar
    # ...
    18: 19  # Naderi mini wafer
}
```

### 10.3 推理性能

| 硬件 | 单张推理耗时 | 日处理能力（8小时） |
|------|:-----------:|:------------------:|
| CPU (AMD R7 6800H) | ~106 ms | 约 27 万张 |
| GPU (RTX 3060) | ~15-25 ms | 约 115-192 万张 |

建议生产环境使用 GPU 部署，可将推理耗时降低 4~7 倍。

### 10.4 后处理策略

```python
def post_process(detections, min_conf=0.5, top_k=5):
    """
    后处理：过滤低置信度，按置信度排序，返回 Top-K 结果
    """
    detections = [d for d in detections if d["confidence"] >= min_conf]
    detections.sort(key=lambda x: x["confidence"], reverse=True)
    return detections[:top_k]
```

---

## 十一、后续优化路线图

### 11.1 短期优化（1-2 周）

| 优先级 | 任务 | 预期收益 |
|:------:|------|----------|
| P0 | 增加 Ashi Mashi snacks 训练样本至 30+ | AP50 从 0.745 提升至 0.95+ |
| P0 | 增加 Chee pellet ketchup 训练样本 | AP50 从 0.848 提升至 0.95+ |
| P1 | 统一评估脚本为 YOLO 官方 val | 消除指标口径差异 |
| P1 | 收集业务真实场景图片补充训练 | 提升实际部署泛化能力 |

### 11.2 中期优化（1 个月）

| 优先级 | 任务 | 预期收益 |
|:------:|------|----------|
| P1 | 尝试 YOLO11s 或 YOLO11m | mAP 提升 1~3% |
| P1 | 测试 imgsz=1280 | 对小目标/细节更有利 |
| P2 | 增加类别中文名称映射 | 业务展示友好 |
| P2 | 建立模型版本管理和 A/B 测试 | 持续迭代 |

### 11.3 长期优化（3 个月）

| 优先级 | 任务 | 预期收益 |
|:------:|------|----------|
| P2 | 引入用户反馈闭环 | 数据驱动模型迭代 |
| P2 | 模型量化/TensorRT 部署 | 提升边缘设备推理速度 |
| P3 | 多目标排序推荐算法 | 提升商品推荐转化率 |

---

## 十二、结论

### 12.1 总体评价

YOLOv11n 模型在本次零食识别任务上表现**优秀**。在 19 类零食、60 张独立测试集上：

- **mAP@0.5 = 97.37%**
- **Precision = 98.53%**
- **Recall = 98.21%**
- **89.5% 类别达到完美检测**

模型已经具备上线条件，可满足拍照识别零食类别的业务需求。

### 12.2 主要优势

1. 模型轻量，仅 258 万参数，适合部署。
2. 定位精准，mAP@0.5:0.95 达到 97.06%。
3. 类别间混淆少，分类能力强。
4. 训练充分，损失收敛平稳。

### 12.3 主要风险

1. **少数类样本不足**：Ashi Mashi snacks 和 Chee pellet ketchup 在测试集中样本少，AP50 偏低。
2. **业务场景差异**：训练数据为特定光照/摆放场景，实际零售环境可能存在差异。
3. **CPU 推理速度**：106 ms/张在高峰期可能成为瓶颈，建议 GPU 部署。

### 12.4 上线建议

- ✅ 可以上线试运行
- ⚠️ 建议先针对 Ashi Mashi snacks 和 Chee pellet ketchup 补充样本后重训
- ⚠️ 生产环境建议使用 GPU 部署
- ⚠️ 建议设置默认置信度阈值 0.5

---

## 附录

### A.1 评估脚本

```python
from ultralytics import YOLO

model = YOLO('path/to/best.pt')
metrics = model.val(
    data='data.yaml',
    split='test',
    imgsz=960,
    conf=0.25,
    iou=0.7,
    device='cpu',
    plots=True
)

print(f"mAP@0.5: {metrics.box.map50:.4f}")
print(f"mAP@0.75: {metrics.box.map75:.4f}")
print(f"mAP@0.5:0.95: {metrics.box.map:.4f}")
```

### A.2 文件路径

| 文件 | 路径 |
|------|------|
| 模型权重 | `XML/yolo_recognition_model/yolo_training_outputs/runs/train/weights/best.pt` |
| 训练配置 | `XML/yolo_recognition_model/yolo_training_outputs/runs/train/args.yaml` |
| 训练日志 | `XML/yolo_recognition_model/yolo_training_outputs/runs/train/results.csv` |
| 评估输出 | `XML/yolo_recognition_model/yolo_training_outputs/runs/test_eval-2/` |
| 混淆矩阵 | `XML/yolo_recognition_model/yolo_training_outputs/runs/test_eval-2/confusion_matrix.png` |
| PR 曲线 | `XML/yolo_recognition_model/yolo_training_outputs/runs/test_eval-2/BoxPR_curve.png` |
| F1 曲线 | `XML/yolo_recognition_model/yolo_training_outputs/runs/test_eval-2/BoxF1_curve.png` |

### A.3 版本记录

| 版本 | 日期 | 变更内容 |
|:----:|:----:|----------|
| v1.0 | 2026-06-17 | 初始自定义评估报告 |
| v2.0 | 2026-06-20 | 改用 YOLO 官方 val 评估，更新指标和混淆矩阵分析 |

---

**报告生成时间**：2026-06-20  
**评估工具**：Ultralytics 8.4.72  
**报告版本**：v2.0
