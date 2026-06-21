# 模型层与应用层对接文档

## 一、对接概述

### 1.1 对接目标

将基于 YOLOv11 的 Python 图像识别模型封装为可独立运行的微服务，并通过 OpenFeign/REST 方式接入 Java 应用层，实现：

1. **拍照识别零食类别**：用户上传图片，模型识别图中零食类别。
2. **AI 商品推荐**：根据识别结果返回同类商品列表。

### 1.2 分层关系

```
┌─────────────────────────────────────────────┐
│              前端层 (Vue3)                   │
│         上传图片 / 展示识别结果              │
└───────────────────┬─────────────────────────┘
                    │ HTTP
┌───────────────────▼─────────────────────────┐
│           网关层 (Gateway :8080)             │
│        JWT 认证 / 路由转发 / 限流            │
└───────────────────┬─────────────────────────┘
                    │ OpenFeign
┌───────────────────▼─────────────────────────┐
│       商品服务 (shop-product-server :8081)   │
│   recognize() / recommendByCategory()        │
│   调用识别服务 + 查询商品库 + 记录日志       │
└───────────────────┬─────────────────────────┘
                    │ HTTP multipart/form-data
┌───────────────────▼─────────────────────────┐
│     图像识别服务 (shop-recognition-service   │
│              :8086, Python + FastAPI)        │
│          YOLOv11 模型推理                    │
└─────────────────────────────────────────────┘
```

---

## 二、模型层（Python 识别服务）

### 2.1 技术栈

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Python | 3.12.13 | 运行环境 |
| FastAPI | 0.115.6 | Web 框架 |
| Uvicorn | 0.34.0 | ASGI 服务器 |
| Ultralytics | 8.4.72 | YOLOv11 模型 |
| PyTorch | 2.5.1 | 深度学习框架 |
| SQLAlchemy | 2.0 | ORM |
| httpx | 0.x | Nacos HTTP 注册 |

### 2.2 项目位置

```
d:\Programming\YQSX\XML\yolo_recognition_model\recognition-service\
├── app/
│   ├── main.py                 # FastAPI 启动入口
│   ├── core/
│   │   ├── config.py           # 配置读取
│   │   ├── nacos_registry.py   # Nacos 自注册
│   │   └── model.py            # YOLO 模型加载与推理
│   ├── db/
│   │   ├── base.py             # SQLAlchemy Base
│   │   └── session.py          # 数据库会话
│   ├── models/                 # ORM 模型
│   │   ├── product.py
│   │   ├── product_category.py
│   │   └── recognition_log.py
│   └── schemas/                # Pydantic 响应模型
│       └── recognition.py
├── tests/                      # 测试脚本
├── .env                        # 环境变量
└── requirements.txt
```

### 2.3 环境变量配置

```env
# 模型配置
MODEL_PATH=d:\Programming\YQSX\XML\yolo_recognition_model\models\best.pt
DEVICE=cpu

# Nacos 配置
NACOS_ENABLED=true
NACOS_SERVER_ADDR=127.0.0.1:8848
NACOS_SERVICE_NAME=shop-recognition-service
NACOS_IP=127.0.0.1
NACOS_PORT=8086
NACOS_HEARTBEAT_INTERVAL=5

# 数据库配置
DATABASE_URL=mysql+pymysql://root:123456@127.0.0.1:3306/shop-product
```

### 2.4 核心接口

#### 健康检查

```
GET /health
```

**响应**：
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "best",
  "device": "cpu",
  "timestamp": "2026-06-20T12:00:00"
}
```

#### 图像识别

```
POST /api/recognition/v1/recognize/image
Content-Type: multipart/form-data

file: <图片文件>
```

**响应**：
```json
{
  "recognitionId": "rec_20250620_120000_abc123",
  "timestamp": "2026-06-20T12:00:00",
  "modelVersion": "best",
  "processingTimeMs": 150,
  "detectedCount": 4,
  "detections": [
    {
      "productClassId": 10,
      "productClassName": "Cheetoz 车轮零食",
      "confidence": 0.981438,
      "boundingBox": {
        "x1": 114.0,
        "y1": 265.0,
        "x2": 671.0,
        "y2": 761.0
      }
    }
  ],
  "imageDimensions": {
    "width": 960,
    "height": 1920
  }
}
```

### 2.5 模型推理核心逻辑

```python
from ultralytics import YOLO
from PIL import Image
import io

CLASS_NAME_ZH_MAPPING = {
    0: "Ashi Mashi 零食",
    1: "Chee pellet 番茄酱味",
    # ... 19 类零食中文映射
}

class YoloRecognitionModel:
    def __init__(self, model_path: str, device: str = "cpu"):
        self.model = YOLO(model_path)
        self.device = device
        self.model.to(device)

    def predict(self, image_bytes: bytes) -> dict:
        image = Image.open(io.BytesIO(image_bytes))
        results = self.model(image, device=self.device)

        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                raw_name = self.class_names[cls_id] if cls_id < len(self.class_names) else f"class_{cls_id}"
                cls_name = CLASS_NAME_ZH_MAPPING.get(cls_id, raw_name)
                detections.append({
                    "productClassId": cls_id,
                    "productClassName": cls_name,
                    "confidence": float(box.conf[0]),
                    "boundingBox": {
                        "x1": float(box.xyxy[0][0]),
                        "y1": float(box.xyxy[0][1]),
                        "x2": float(box.xyxy[0][2]),
                        "y2": float(box.xyxy[0][3])
                    }
                })

        return {
            "detectedCount": len(detections),
            "detections": detections,
            "imageDimensions": {
                "width": image.width,
                "height": image.height
            }
        }
```

### 2.6 Nacos 自注册

由于 Python 没有官方稳定的 Nacos SDK，项目自实现 HTTP 注册：

```python
import httpx
import asyncio

class NacosRegistry:
    def __init__(self, server_addr, service_name, ip, port, heartbeat_interval=5):
        self.server_addr = server_addr
        self.service_name = service_name
        self.ip = ip
        self.port = port
        self.heartbeat_interval = heartbeat_interval
        self._beat_task = None

    async def register(self) -> bool:
        url = f"http://{self.server_addr}/nacos/v1/ns/instance"
        params = {
            "serviceName": self.service_name,
            "ip": self.ip,
            "port": self.port,
            "healthy": "true",
            "weight": "1.0",
            "ephemeral": "true"
        }
        async with httpx.AsyncClient() as client:
            r = await client.post(url, params=params)
            return r.text == "ok"

    async def deregister(self) -> bool:
        url = f"http://{self.server_addr}/nacos/v1/ns/instance"
        params = {
            "serviceName": self.service_name,
            "ip": self.ip,
            "port": self.port
        }
        async with httpx.AsyncClient() as client:
            r = await client.delete(url, params=params)
            return r.text == "ok"

    async def _send_beat(self):
        while True:
            await asyncio.sleep(self.heartbeat_interval)
            url = f"http://{self.server_addr}/nacos/v1/ns/instance/beat"
            params = {
                "serviceName": self.service_name,
                "ip": self.ip,
                "port": self.port
            }
            async with httpx.AsyncClient() as client:
                await client.put(url, params=params)

    def start_heartbeat(self):
        self._beat_task = asyncio.create_task(self._send_beat())
```

---

## 三、应用层（Java 商品服务）

### 3.1 Feign 客户端

```java
@FeignClient(
    name = "shop-recognition-service",
    fallback = RecognitionFeignFallback.class,
    configuration = FeignConfig.class
)
public interface RecognitionFeignClient {

    @PostMapping(
        value = "/api/recognition/v1/recognize/image",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    RecognitionResultDto recognizeImage(@RequestPart("file") MultipartFile file);
}
```

### 3.2 降级兜底

```java
@Component
@Slf4j
public class RecognitionFeignFallback implements RecognitionFeignClient {

    @Override
    public RecognitionResultDto recognizeImage(MultipartFile file) {
        log.error("识别服务调用失败，触发降级");
        RecognitionResultDto result = new RecognitionResultDto();
        result.setStatus("error");
        result.setMessage("识别服务暂不可用，请稍后再试");
        result.setDetections(Collections.emptyList());
        result.setDetectedCount(0);
        return result;
    }
}
```

### 3.3 识别业务逻辑

```java
@Service
@Slf4j
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> 
    implements ProductService {

    @Autowired
    private RecognitionFeignClient recognitionFeignClient;

    @Override
    public RecognitionResponseVo recognize(MultipartFile file, Long uid) {
        String requestId = UUID.randomUUID().toString().replace("-", "");
        long startTime = System.currentTimeMillis();

        // 1. 调用识别服务
        RecognitionResultDto recognitionResult;
        try {
            recognitionResult = recognitionFeignClient.recognizeImage(file);
        } catch (Exception e) {
            log.error("识别服务调用异常, requestId={}", requestId, e);
            recognitionResult = new RecognitionResultDto();
            recognitionResult.setStatus("error");
            recognitionResult.setMessage("识别服务调用失败");
        }

        // 2. 解析识别结果
        RecognitionResponseVo response = new RecognitionResponseVo();
        response.setRequestId(requestId);

        if (!"success".equals(recognitionResult.getStatus()) 
            || CollectionUtils.isEmpty(recognitionResult.getDetections())) {
            response.setStatus("no_result");
            response.setMessage("未识别到商品");
            return response;
        }

        // 3. 取置信度最高的类别
        DetectionDto best = recognitionResult.getDetections().stream()
            .max(Comparator.comparing(DetectionDto::getConfidence))
            .orElse(null);
        
        Long categoryId = (long) (best.getClassId() + 1); // class_id -> category_id 映射

        // 4. 查询同类商品推荐
        List<Product> products = recommendByCategory(categoryId, 10);

        // 5. 组装响应
        response.setStatus("success");
        response.setMessage("识别成功");
        response.setDetections(recognitionResult.getDetections());
        response.setDetectedCount(recognitionResult.getDetectedCount());
        response.setProducts(products);

        // 6. 记录识别日志
        saveRecognitionLog(requestId, uid, recognitionResult, response, 
            System.currentTimeMillis() - startTime);

        return response;
    }
}
```

### 3.4 类别映射规则

当前映射逻辑：

```
YOLO class_id  ->  category_id
0  -> 1
1  -> 2
...
18 -> 19
```

即 `category_id = class_id + 1`，与 `t_product_category` 表中的 19 类零食一一对应。

> 注意：当前 YOLO 模型输出类别名为 `class_X`，展示层需要进一步映射为中文名称。

---

## 四、数据库表设计

### 4.1 商品分类表

```sql
CREATE TABLE t_product_category (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID，与YOLO class_id+1对应',
    display_name VARCHAR(100) NOT NULL COMMENT '分类展示名称',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：1启用 0禁用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4.2 商品表

```sql
CREATE TABLE t_product (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    category_id BIGINT,
    image_url VARCHAR(500),
    sales INT DEFAULT 0,
    version INT DEFAULT 0 COMMENT '乐观锁版本号',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES t_product_category(id) ON DELETE SET NULL
);
```

### 4.3 识别日志表

```sql
CREATE TABLE t_recognition_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(64) UNIQUE NOT NULL,
    status TINYINT DEFAULT 0 COMMENT '0失败 1成功',
    processing_time_ms INT,
    error_msg TEXT,
    detection_result_json JSON,
    recommend_product_ids VARCHAR(500),
    recognized_category_id BIGINT,
    top_product_id BIGINT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_category FOREIGN KEY (recognized_category_id) REFERENCES t_product_category(id) ON DELETE SET NULL,
    CONSTRAINT fk_log_product FOREIGN KEY (top_product_id) REFERENCES t_product(id) ON DELETE SET NULL
);
```

---

## 五、调用链路示例

### 5.1 完整调用流程

```
前端上传图片
    ↓
Gateway (8080) 校验 JWT
    ↓
Product 服务 /products/recognize
    ↓
OpenFeign 调用 shop-recognition-service
    ↓
Python 识别服务 YOLO 推理
    ↓
返回 detections
    ↓
Product 服务查询 category_id 对应商品
    ↓
返回 {detections, products, categoryName}
    ↓
写入 t_recognition_log
```

### 5.2 测试脚本

位置：
- [`test_case_2_direct_recognition.py`](file:///d:/Programming/YQSX/XML/yolo_recognition_model/recognition-service/tests/test_case_2_direct_recognition.py)
- [`test_case_4_via_product_service.py`](file:///d:/Programming/YQSX/XML/yolo_recognition_model/recognition-service/tests/test_case_4_via_product_service.py)

---

## 六、已知问题与优化建议

### 6.1 当前问题

| 问题 | 影响 | 处理建议 |
|-----|------|---------|
| 类别名称为 `class_X` | 前端展示不友好 | ✅ 已增加 `class_id → 中文名称` 映射 |
| CPU 推理 | 耗时 120~200ms | 生产环境切换 GPU |
| 推荐逻辑简单 | 仅按类别排序 | 后续引入销量、用户画像等维度 |
| 系统代理导致 Nacos 注册失败 | 服务注册异常 | `httpx.AsyncClient(trust_env=False)` |

### 6.2 后续优化方向

1. **类别中文映射**：✅ 已在 Python 服务与前端映射表双端完成。
2. **GPU 推理**：配置 `DEVICE=cuda`，安装 CUDA 版 PyTorch。
3. **推荐算法升级**：
   - 基于销量的热门推荐
   - 基于用户历史的协同过滤
   - 基于商品属性的相似度推荐
4. **批量识别**：支持一次上传多张图片。
5. **识别结果可视化**：返回标注后的图片。

---

## 七、部署与启动

### 7.1 启动顺序

```
1. Zipkin (9411)
2. Nacos (8848)
3. Gateway (8080)
4. User (8083)
5. Product (8081)
6. Order (8091)
7. Payment (8084)
8. Python 识别服务 (8086)
```

### 7.2 统一后台启动脚本

```powershell
$base = 'd:\Programming\YQSX\test\shop-parent';
$jre = 'D:\Java\jdk-17\bin\java.exe';
$env:JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8';

Start-Process $jre -ArgumentList "-jar","$base\shop-gateway-server\target\shop-gateway-server-1.0-SNAPSHOT.jar" -WindowStyle Hidden;
Start-Process $jre -ArgumentList "-jar","$base\shop-user-server\target\shop-user-server-1.0-SNAPSHOT.jar" -WindowStyle Hidden;
Start-Process $jre -ArgumentList "-jar","$base\shop-product-server\target\shop-product-server-1.0-SNAPSHOT.jar" -WindowStyle Hidden;
Start-Process $jre -ArgumentList "-jar","$base\shop-order-server\target\shop-order-server-1.0-SNAPSHOT.jar" -WindowStyle Hidden;
Start-Process $jre -ArgumentList "-jar","$base\shop-payment-server\target\shop-payment-server-1.0-SNAPSHOT.jar" -WindowStyle Hidden;
```

---

**文档生成时间**: 2026-06-20
