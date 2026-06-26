# 测试计划

## 9.1 测试策略

### 9.1.1 测试目标

- 验证系统功能完整性和正确性
- 验证AI模型的准确率和性能指标
- 验证系统在高并发下的稳定性
- 验证微服务间交互的可靠性
- 验证安全性（认证、幂等、防重）

### 9.1.2 测试层次

| 测试层次 | 覆盖范围 | 工具 |
|---------|---------|------|
| 单元测试 | 各服务核心业务逻辑 | JUnit 5, pytest |
| 接口测试 | REST API功能 | Postman, curl |
| 集成测试 | 微服务间调用 + AI服务集成 | JMeter, Python脚本 |
| AI模型测试 | 识别准确率、推荐AUC、问答准确率 | 自评估脚本 |
| 性能测试 | 并发、吞吐量、响应时间 | JMeter 5.6.3 |
| 安全测试 | 认证、幂等、SQL注入 | 手工测试 + 脚本 |

### 9.1.3 测试环境

| 组件 | 配置 |
|-----|------|
| CPU | 4核 |
| 内存 | 8GB |
| JDK | 11 |
| Python | 3.10+ |
| MySQL | 8.0 |
| Redis | 6.0 |
| Nacos | 2.x |

## 9.2 单元测试

### 9.2.1 后端单元测试（Java）

**商品服务测试：**

```java
@SpringBootTest
class ProductServiceTest {
    
    @Test
    void testGetProductById() {
        ProductVO product = productService.getProductById(1L);
        assertNotNull(product);
        assertEquals("乐事原味薯片", product.getName());
    }
    
    @Test
    void testDeductStock() {
        boolean result = productService.deductStock(1L, 2);
        assertTrue(result);
        Product p = productMapper.selectById(1L);
        assertEquals(498, p.getStock());
    }
    
    @Test
    void testDeductStockInsufficient() {
        assertThrows(BusinessException.class, () -> {
            productService.deductStock(1L, 99999);
        });
    }
}
```

**订单服务测试：**

```java
@SpringBootTest
class OrderServiceTest {
    
    @Test
    void testCreateOrder() {
        OrderCreateDTO dto = new OrderCreateDTO();
        dto.setUserId(1L);
        dto.setItems(Collections.singletonList(new OrderItemDTO(1L, 2)));
        OrderVO order = orderService.createOrder(dto);
        assertNotNull(order.getOrderId());
        assertEquals(1, order.getStatus()); // 待付款
    }
    
    @Test
    void testDuplicateOrder() {
        // 测试防重复提交
        assertThrows(BusinessException.class, () -> {
            orderService.createOrder(dto); // 第二次应失败
        });
    }
}
```

### 9.2.2 AI服务单元测试（Python）

**DIN模型测试：**

```python
def test_din_model_build():
    """测试模型构建"""
    model = build_din(num_items=1000, embedding_dim=32, max_seq_len=50, num_categories=20)
    assert model is not None
    assert model.count_params() > 0

def test_din_prediction():
    """测试预测输出范围"""
    model = build_din(1000, 32, 50, 20)
    # 构造dummy输入
    hist = np.zeros((1, 50), dtype=np.int64)
    target = np.array([[10]], dtype=np.int64)
    pred = model.predict([hist, hist, hist, target, target], verbose=0)
    assert pred.shape == (1, 1)
    assert 0 <= pred[0][0] <= 1  # sigmoid输出在[0,1]

def test_recommend_topk():
    """测试推荐返回Top-K"""
    recs = get_recommendations_for_user(123, top_k=20)
    assert len(recs) == 20
    assert len(set(recs)) == 20  # 无重复
```

**YOLO识别测试：**

```python
def test_yolo_health():
    """测试健康检查"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["modelLoaded"] is True

def test_yolo_recognize():
    """测试图片识别"""
    with open("test_image.jpg", "rb") as f:
        response = client.post("/api/recognize", files={"file": f})
    assert response.status_code == 200
    data = response.json()["data"]
    assert "detections" in data
    assert "processingTimeMs" in data
    assert data["processingTimeMs"] < 500  # 推理时间<500ms
```

## 9.3 接口测试

### 9.3.1 用户接口测试

| 用例ID | 测试场景 | 请求方法 | 预期结果 |
|-------|---------|---------|---------|
| U-001 | 正常登录 | POST /api/user/login | 返回200，包含token |
| U-002 | 密码错误登录 | POST /api/user/login | 返回400，提示密码错误 |
| U-003 | 无Token访问受保护接口 | GET /api/user/info | 返回401 |
| U-004 | 错误Token访问 | GET /api/user/info (无效token) | 返回401 |
| U-005 | 用户注册 | POST /api/user/register | 返回200 |

### 9.3.2 商品接口测试

| 用例ID | 测试场景 | 请求方法 | 预期结果 |
|-------|---------|---------|---------|
| P-001 | 查询商品列表（默认分页） | GET /api/products | 返回10条商品 |
| P-002 | 按分类查询 | GET /api/products?categoryId=1 | 返回该分类商品 |
| P-003 | 商品详情 | GET /api/products/1 | 返回商品完整信息 |
| P-004 | 商品不存在 | GET /api/products/99999 | 返回404 |
| P-005 | AI图片识别 | POST /api/products/recognize | 返回识别结果+商品 |
| P-006 | 上传非图片文件 | POST /api/products/recognize (txt文件) | 返回400 |

### 9.3.3 订单接口测试

| 用例ID | 测试场景 | 请求方法 | 预期结果 |
|-------|---------|---------|---------|
| O-001 | 创建订单（正常） | POST /api/orders | 返回订单号，状态待付款 |
| O-002 | 重复下单 | POST /api/orders (同参数) | 返回"请勿重复下单" |
| O-003 | 库存不足下单 | POST /api/orders (库存为0) | 返回"库存不足" |
| O-004 | 查询订单列表 | GET /api/orders | 返回当前用户订单 |
| O-005 | 取消待付款订单 | PUT /api/orders/{id}/cancel | 状态变为已取消 |
| O-006 | 取消已支付订单 | PUT /api/orders/{id}/cancel | 返回"无法取消" |

### 9.3.4 支付接口测试

| 用例ID | 测试场景 | 请求方法 | 预期结果 |
|-------|---------|---------|---------|
| PAY-001 | 正常支付 | POST /api/payments | 返回支付成功 |
| PAY-002 | 重复支付（同Token） | POST /api/payments (同idempotentToken) | 返回"请勿重复支付" |
| PAY-003 | 支付金额与订单不符 | POST /api/payments (错误金额) | 返回参数错误 |

### 9.3.5 AI服务接口测试

| 用例ID | 测试场景 | 请求方法 | 预期结果 |
|-------|---------|---------|---------|
| AI-001 | 获取推荐（有缓存） | GET /api/recommend/topk?userId=123 | 返回推荐列表，latency<50ms |
| AI-002 | 知识问答 | POST /api/qa/ask | 返回自然语言答案 |
| AI-003 | YOLO健康检查 | GET /api/health (8086) | 返回healthy |
| AI-004 | DIN健康检查 | GET /health (8000) | 返回ok |

## 9.4 AI模型评估

### 9.4.1 YOLO识别评估

| 评估指标 | 目标值 | 测试方法 |
|---------|-------|---------|
| mAP@0.5 | ≥95% | 在测试集上计算 |
| Precision | ≥95% | 测试集评估 |
| Recall | ≥90% | 测试集评估 |
| 单张推理时间(CPU) | ≤200ms | 100次平均 |
| 单张推理时间(GPU) | ≤80ms | 100次平均 |
| 类别覆盖 | 19类全部支持 | 枚举测试 |

**测试脚本：**
```python
def evaluate_yolo():
    model = YOLO('best.pt')
    metrics = model.val(data='snack.yaml')
    print(f"mAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {metrics.box.map:.4f}")
    print(f"Precision: {metrics.box.mp:.4f}")
    print(f"Recall: {metrics.box.mr:.4f}")
```

### 9.4.2 DIN推荐评估

| 评估指标 | 目标值 | 说明 |
|---------|-------|------|
| AUC | ≥0.80 | ROC曲线下面积 |
| F1 | ≥0.70 | 最优阈值下F1 |
| Precision@5 | ≥0.30 | Top5推荐精确率 |
| Recall@20 | ≥0.50 | Top20推荐召回率 |
| 缓存命中率 | ≥80% | 预计算用户覆盖率 |
| 推荐响应时间（缓存） | ≤50ms | P99延迟 |
| 推荐响应时间（实时） | ≤3s | P99延迟 |

**交叉验证：**
```bash
python din_model.py --mode train --k-folds 5
# 输出每一折的AUC/F1，计算平均和标准差
```

### 9.4.3 KBQA问答评估

| 评估指标 | 目标值 | 测试方法 |
|---------|-------|---------|
| 实体识别准确率 | ≥90% | 人工标注100个问题测试 |
| 意图识别准确率 | ≥85% | 人工标注测试 |
| 答案正确率 | ≥80% | 人工评估答案是否正确 |
| 响应时间 | ≤500ms | P99延迟 |

**测试用例示例：**
```
Q: "乐事薯片多少钱" → A: 应包含价格信息
Q: "推荐辣味零食" → A: 应返回辣味商品列表
Q: "有哪些品牌" → A: 应返回品牌列表
Q: "今天天气怎么样" → A: 应礼貌回复无法回答
```

## 9.5 性能测试

### 9.5.1 测试场景（JMeter）

**场景1：商品列表查询（基准测试）**

| 参数 | 值 |
|-----|-----|
| 接口 | GET /api/products?pageNum=1&pageSize=10 |
| 并发数 | 100 |
| 持续时间 | 60秒 |
| 目标QPS | ≥800 |
| 目标响应时间(P99) | ≤300ms |
| 错误率 | 0% |

**场景2：订单创建（核心链路）**

| 参数 | 值 |
|-----|-----|
| 接口 | POST /api/orders |
| 并发数 | 50 |
| 持续时间 | 60秒 |
| 准备数据 | 每个用户独立商品，库存充足 |
| 目标TPS | ≥200 |
| 目标响应时间(P99) | ≤500ms |
| 错误率 | 0% |

**场景3：AI图像识别**

| 参数 | 值 |
|-----|-----|
| 接口 | POST /api/products/recognize |
| 并发数 | 10 |
| 持续时间 | 60秒 |
| 图片 | 标准测试图片 |
| 目标QPS | ≥10 |
| 目标响应时间(P99) | ≤500ms |

**场景4：DIN推荐（缓存命中）**

| 参数 | 值 |
|-----|-----|
| 接口 | GET /api/recommend/topk?userId=xxx |
| 并发数 | 100 |
| 持续时间 | 60秒 |
| 目标QPS | ≥500 |
| 目标响应时间(P99) | ≤50ms |

### 9.5.2 性能指标（JMeter测试报告参考）

基于历史测试数据：

| 场景 | 总请求 | 成功率 | 平均响应 | P95 | P99 | TPS |
|-----|-------|-------|---------|-----|-----|-----|
| 商品列表 | 48,523 | 100% | 115ms | 189ms | 267ms | 808 |
| 订单创建 | 12,340 | 100% | 235ms | 398ms | 567ms | 205 |
| 支付处理 | 7,856 | 100% | 218ms | 356ms | 487ms | 130 |

### 9.5.3 资源监控

性能测试期间同步监控：

| 监控项 | 工具 | 告警阈值 |
|-------|------|---------|
| CPU使用率 | Prometheus | >80% |
| 内存使用率 | Prometheus | >85% |
| JVM堆内存 | JMX | >80% |
| 数据库连接数 | MySQL | >80/100 |
| Redis命中率 | Redis | <90% |
| 慢查询 | MySQL | >1s |

## 9.6 安全测试

### 9.6.1 认证测试

| 用例 | 操作 | 预期 |
|-----|------|------|
| S-001 | 无Token访问下单接口 | 返回401 |
| S-002 | 伪造Token访问 | 返回401 |
| S-003 | 过期Token访问 | 返回401 |
| S-004 | 正常Token访问 | 返回200 |

### 9.6.2 幂等性测试

| 用例 | 操作 | 预期 |
|-----|------|------|
| S-005 | 同一幂等Token支付两次 | 第二次返回"请勿重复支付" |
| S-006 | 快速重复提交订单 | 仅创建一个订单 |
| S-007 | 无幂等Token支付 | 正常处理或要求携带 |

### 9.6.3 限流测试

| 用例 | 操作 | 预期 |
|-----|------|------|
| S-008 | QPS超过限流阈值 | 返回429 Too Many Requests |

### 9.6.4 注入测试

| 用例 | 操作 | 预期 |
|-----|------|------|
| S-009 | SQL注入：用户名输入 "' OR 1=1 --" | 登录失败，无异常 |
| S-010 | XSS：昵称输入 "<script>alert(1)</script>" | 转义存储，不执行脚本 |

## 9.7 测试执行计划

| 阶段 | 测试内容 | 时间 | 负责人 |
|-----|---------|------|-------|
| 开发阶段 | 单元测试 | 开发过程中 | 开发 |
| 提测阶段 | 接口测试 | 1天 | 测试 |
| 提测阶段 | AI模型评估 | 1天 | 算法 |
| 集成阶段 | 集成测试 | 2天 | 测试 |
| 性能阶段 | 性能测试 | 1天 | 测试/运维 |
| 验收阶段 | 回归测试 + UAT | 1天 | 全员 |

## 9.8 测试报告输出

测试完成后输出：
- 单元测试覆盖率报告（JaCoCo/pytest-cov）
- 接口测试报告（Postman Newman / JMeter）
- AI模型评估报告（AUC、mAP、准确率）
- 性能测试报告（JMeter Dashboard）
- 缺陷清单与修复状态

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
