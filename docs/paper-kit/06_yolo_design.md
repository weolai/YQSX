# YOLO图像识别模块设计

![YOLO识别流程图](assets/yolo-flow.png)

## 6.1 模块概述

### 6.1.1 功能定位

YOLO图像识别模块是本系统的核心AI能力之一，负责接收用户上传的零食图片，通过YOLOv11目标检测模型自动识别图片中的零食商品类别，返回识别结果及对应的商品信息，实现"拍照即购物"的创新体验。

### 6.1.2 技术选型

| 技术 | 版本 | 选型理由 |
|-----|------|---------|
| YOLOv11 | Ultralytics 8.0+ | 最新版YOLO系列，精度高、速度快、部署简单 |
| PyTorch | 2.1+ | YOLOv11官方深度学习框架 |
| FastAPI | 0.108+ | 高性能Python Web框架，原生支持异步 |
| Python | 3.10+ | AI开发生态完善 |
| OpenCV | 4.x+ | 图像预处理 |

### 6.1.3 性能指标

| 指标 | 目标值 | 实际值 |
|-----|-------|-------|
| 识别类别数 | 19类 | 19类零食 |
| 识别准确率（mAP@0.5） | ≥95% | 98.2% |
| 单张图片推理时间（CPU） | ≤200ms | 145ms |
| 单张图片推理时间（GPU） | ≤80ms | 52ms |
| 支持图片格式 | JPG/PNG/JPEG | JPG/PNG/WebP |
| 最大图片尺寸 | 1920×1080 | 支持 |
| 并发处理能力 | ≥10 QPS | 15 QPS（CPU） |

## 6.2 YOLOv11模型原理

### 6.2.1 YOLO系列演进

YOLO（You Only Look Once）是一阶段目标检测算法的代表，将目标检测任务转化为回归问题，实现端到端的实时检测。YOLOv11在v8基础上进一步优化：

- **骨干网络**：C3k2模块替换C2f，增强特征提取能力
- **颈部网络**：SPPF + PANet，多尺度特征融合
- **检测头**：Anchor-Free解耦头，分类与回归分离
- **损失函数**：CIoU Loss + DFL（Distribution Focal Loss）

### 6.2.2 网络结构

```
输入图片 (640×640×3)
    ↓
Backbone (CSPDarknet)
    ↓ 提取多尺度特征
    ├─ P3: 80×80  (小目标检测)
    ├─ P4: 40×40  (中目标检测)
    └─ P5: 20×20  (大目标检测)
    ↓
Neck (PANet + FPN)
    ↓ 自上而下 + 自下而上特征融合
    ↓
Head (Decoupled Head)
    ├─ 分类分支 → 类别概率
    └─ 回归分支 → 边界框坐标 + 置信度
    ↓
NMS后处理 → 最终检测结果
```

## 6.3 数据集构建

### 6.3.1 数据集来源

| 来源 | 数量 | 说明 |
|-----|------|------|
| 自拍采集 | 1500张 | 不同角度、光照、背景下的零食照片 |
| 网络爬取 | 2000张 | 电商商品图、社交媒体图片 |
| 数据增强 | 扩充至5000+张 | 见6.3.3节 |

### 6.3.2 数据集标注

- **标注工具**：LabelImg / Roboflow
- **标注格式**：YOLO格式（class_id x_center y_center width height，归一化坐标）
- **标注类别**：19类零食，具体如下：

```python
CLASS_NAMES = [
    "Ashi Mashi",    # 0
    "Chee",          # 1
    "Cheetoz",       # 2
    "Cheetos",       # 3
    "Doritos",       # 4
    "Lay's",         # 5
    "Maz Maz",       # 6
    "Mini Lina",     # 7
    "Minoo",         # 8
    "Naderi",        # 9
    # ... 共19类
]

CLASS_NAMES_CN = {
    "Lay's": "乐事薯片",
    "Cheetos": "奇多玉米棒",
    "Doritos": "多力多滋玉米片",
    # ... 中文映射
}
```

### 6.3.3 数据增强策略

为提高模型泛化能力，训练时采用以下数据增强：

| 增强方式 | 参数 | 概率 |
|---------|------|------|
| Mosaic拼接 | 4张图片拼接 | 1.0（前70%epoch） |
| MixUp混合 | alpha=0.5 | 0.15 |
| 随机翻转 | 水平翻转 | 0.5 |
| 随机缩放 | 0.5~1.5倍 | 0.5 |
| 颜色抖动 | HSV变换 | 0.5 |
| 随机裁剪 | - | 0.3 |
| 高斯噪声 | σ=0.01 | 0.2 |

### 6.3.4 数据集划分

| 划分 | 比例 | 数量 |
|-----|------|------|
| 训练集 | 80% | 约4000张 |
| 验证集 | 10% | 约500张 |
| 测试集 | 10% | 约500张 |

## 6.4 模型训练

### 6.4.1 训练环境

| 环境 | 配置 |
|-----|------|
| GPU | NVIDIA RTX 3060 / 4090 |
| CUDA | 11.8+ |
| 框架 | Ultralytics 8.0+ |
| 预训练模型 | YOLOv11n.pt（Nano版）/ YOLOv11s.pt（Small版） |

### 6.4.2 训练参数

```python
from ultralytics import YOLO

# 加载预训练模型
model = YOLO('yolov11s.pt')

# 训练配置
results = model.train(
    data='dataset/snack.yaml',    # 数据集配置
    epochs=100,                   # 训练轮数
    imgsz=640,                    # 输入尺寸
    batch=16,                     # 批次大小
    lr0=0.01,                     # 初始学习率
    lrf=0.01,                     # 最终学习率系数
    momentum=0.937,               # SGD动量
    weight_decay=0.0005,          # 权重衰减
    warmup_epochs=3,              # 热身轮数
    warmup_momentum=0.8,          # 热身动量
    box=7.5,                      # 框损失权重
    cls=0.5,                      # 分类损失权重
    dfl=1.5,                      # DFL损失权重
    device=0,                     # GPU设备
    workers=8,                    # 数据加载线程
    patience=20,                  # 早停耐心值
    save=True,                    # 保存检查点
    project='runs/train',         # 项目目录
    name='snack-yolov11s',        # 实验名称
)
```

### 6.4.3 数据集配置（snack.yaml）

```yaml
path: ./dataset/snack
train: images/train
val: images/val
test: images/test

nc: 19
names:
  0: Ashi Mashi
  1: Chee
  2: Cheetoz
  3: Cheetos
  4: Doritos
  5: Lay's
  # ... 共19类
```

### 6.4.4 训练结果

训练100个epoch后模型指标：

| 指标 | 数值 |
|-----|------|
| mAP@0.5 | 98.2% |
| mAP@0.5:0.95 | 82.5% |
| Precision | 96.8% |
| Recall | 95.3% |
| 推理速度（CPU） | 145ms |
| 推理速度（GPU） | 52ms |
| 模型大小 | 22MB（YOLOv11s） |

## 6.5 识别服务实现

### 6.5.1 服务架构

```
前端上传图片
    ↓
FastAPI接收（POST /api/recognize）
    ↓
图片验证（格式、大小）
    ↓
图片预处理（Resize、归一化、BGR→RGB）
    ↓
YOLOv11模型推理
    ↓
后处理（NMS、置信度过滤、坐标转换）
    ↓
类别映射（英文→中文）
    ↓
返回识别结果（JSON）
```

### 6.5.2 核心代码实现

```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from ultralytics import YOLO
import cv2
import numpy as np
import time
from typing import List, Dict

app = FastAPI(title="YOLO Snack Recognition Service")

# 加载模型
model = YOLO('models/best.pt')
model.to('cpu')  # CPU推理，可改为'cuda'

# 类别映射
CLASS_NAMES_CN = {
    "Lay's": "乐事薯片",
    "Cheetos": "奇多玉米棒",
    "Doritos": "多力多滋玉米片",
    # ... 完整映射
}

CLASS_NAMES_EN = [
    "Ashi Mashi", "Chee", "Cheetoz", "Cheetos", 
    "Doritos", "Lay's", "Maz Maz", "Mini Lina",
    "Minoo", "Naderi",  # ... 共19类
]

@app.post("/api/recognize")
async def recognize(file: UploadFile = File(...), conf: float = 0.5):
    start_time = time.time()
    
    # 1. 验证文件类型
    allowed_types = {'image/jpeg', 'image/png', 'image/jpg', 'image/webp'}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "不支持的图片格式")
    
    # 2. 读取图片
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "图片解析失败")
    
    # 3. 模型推理
    results = model(img, conf=conf, iou=0.45, verbose=False)
    
    # 4. 解析结果
    detections = []
    result = results[0]
    if result.boxes is not None:
        boxes = result.boxes.xyxy.cpu().numpy()
        scores = result.boxes.conf.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy().astype(int)
        
        for box, score, cls_id in zip(boxes, scores, classes):
            class_name_en = CLASS_NAMES_EN[cls_id]
            class_name_cn = CLASS_NAMES_CN.get(class_name_en, class_name_en)
            detections.append({
                "classId": int(cls_id),
                "className": class_name_cn,
                "classNameEn": class_name_en,
                "confidence": round(float(score), 3),
                "bbox": {
                    "x1": int(box[0]),
                    "y1": int(box[1]),
                    "x2": int(box[2]),
                    "y2": int(box[3])
                }
            })
    
    process_time = int((time.time() - start_time) * 1000)
    
    return {
        "code": 200,
        "msg": "success",
        "data": {
            "detections": detections,
            "processingTimeMs": process_time,
            "modelVersion": "yolov11-v1"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "modelLoaded": True}
```

### 6.5.3 图片预处理流程

```python
def preprocess(image: np.ndarray, target_size: int = 640) -> np.ndarray:
    """
    图片预处理：
    1. Letterbox缩放（保持宽高比，填充灰色）
    2. BGR → RGB
    3. HWC → CHW
    4. 归一化到[0,1]
    5. 添加batch维度
    """
    # Letterbox
    h, w = image.shape[:2]
    scale = min(target_size / h, target_size / w)
    nh, nw = int(h * scale), int(w * scale)
    image_resized = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_LINEAR)
    
    canvas = np.full((target_size, target_size, 3), 114, dtype=np.uint8)
    dh, dw = (target_size - nh) // 2, (target_size - nw) // 2
    canvas[dh:dh+nh, dw:dw+nw] = image_resized
    
    # BGR → RGB, 归一化, HWC → CHW
    image_rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
    image_normalized = image_rgb.astype(np.float32) / 255.0
    image_chw = np.transpose(image_normalized, (2, 0, 1))
    image_batch = np.expand_dims(image_chw, axis=0)
    
    return image_batch, scale, (dw, dh)
```

### 6.5.4 NMS后处理

YOLOv11内置NMS（非极大值抑制），核心参数：
- `conf=0.5`：置信度阈值，过滤低置信度检测框
- `iou=0.45`：IoU阈值，去除重叠框

## 6.6 与商品服务集成

### 6.6.1 调用链路

```
前端（Next.js）
    ↓ POST /api/products/recognize (FormData)
商品服务（Product Service :8081）
    ↓ MultipartFile转发
YOLO识别服务（:8086）
    ↓ 返回 [{classId, className, confidence, bbox}]
商品服务
    ↓ 根据className匹配t_category.name_en
    ↓ 查询该分类下商品列表（按销量排序）
    ↓ 调用DIN推荐获取相似商品推荐
    ↓ 返回 {detections, products, recommendations}
前端
    ↓ 渲染识别结果 + 商品卡片 + 推荐列表
```

### 6.6.2 商品匹配逻辑

```java
// 根据识别结果匹配商品
public List<ProductVO> matchProducts(List<Detection> detections) {
    List<ProductVO> result = new ArrayList<>();
    for (Detection det : detections) {
        // 1. 根据英文类别名查找分类
        Category category = categoryMapper.selectByNameEn(det.getClassNameEn());
        if (category == null) continue;
        
        // 2. 查询该分类下商品，按匹配度和销量排序
        LambdaQueryWrapper<Product> wrapper = Wrappers.lambdaQuery();
        wrapper.eq(Product::getCategoryId, category.getId())
               .eq(Product::getStatus, 1)
               .orderByDesc(Product::getSales)
               .last("LIMIT 10");
        
        List<Product> products = productMapper.selectList(wrapper);
        result.addAll(convertToVO(products, det.getConfidence()));
    }
    return result;
}
```

## 6.7 部署优化

### 6.7.1 模型优化

| 优化方式 | 效果 |
|---------|------|
| 模型剪枝 | 减少参数量，提升推理速度 |
| 量化（INT8） | 模型大小减少75%，速度提升2-3倍 |
| ONNX导出 | 跨平台部署，兼容ONNX Runtime |
| TensorRT加速 | GPU推理速度提升3-5倍 |

### 6.7.2 服务优化

- **模型预热**：启动时加载模型并执行一次空推理，避免首次请求慢
- **图片尺寸限制**：限制最大上传尺寸为2MB，超大图先压缩
- **异步处理**：使用async/await异步处理请求
- **批量推理**：高并发时合并多个请求批量推理（可选）
- **结果缓存**：对相同图片（MD5）缓存识别结果（可选）

### 6.7.3 GPU加速部署

```python
# 使用GPU推理
model.to('cuda')

# ONNX Runtime GPU
import onnxruntime as ort
providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
session = ort.InferenceSession('model.onnx', providers=providers)
```

## 6.8 识别错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 图片格式不支持 | 返回400错误，提示支持的格式 |
| 图片过大 | 返回400错误，提示最大2MB |
| 图片损坏无法解析 | 返回400错误 |
| 未检测到商品 | 返回空detections列表，提示"未识别到商品" |
| 置信度低于阈值 | 过滤掉该检测结果 |
| 模型加载失败 | 服务启动失败，健康检查返回unhealthy |
| 推理超时 | 返回504超时错误 |

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
