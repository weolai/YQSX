# Sentinel 资源命名规范

## 1. 目的

统一 Sentinel 资源命名，使限流、熔断、监控指标具备一致的语义维度，便于通过 Dashboard 快速识别系统瓶颈。

## 2. 命名规范

格式：

```
${module_name}.${function_name}
```

规则：

- `module_name`：业务模块，使用小写英文，与微服务职责一致，如 `user`、`product`、`order`、`payment`。
- `function_name`：业务行为，使用 camelCase，优先采用方法语义而非 URL 路径，如 `getById`、`create`、`updateStatus`、`pay`。
- 仅使用小写字母和点号，不使用下划线、连字符或大写字母。
- 禁止使用无意义名称，如 `anno1`、`hotSpot1`、`queryGood`；演示或测试资源需加 `Demo` 后缀。

## 3. 当前资源清单

| 应用 | REST 端点 | Sentinel 资源名 | 说明 |
|---|---|---|---|
| shop-product-service | `GET /products/{pid}` | `product.getById` | 商品详情查询 |
| shop-user-service | `POST /user/login` | `user.login` | 用户登录 |
| shop-order-service | `POST /orders/save` | `order.create` | 创建订单 |
| shop-order-service | `GET /orders/{id}` | `order.getById` | 订单详情查询 |
| shop-order-service | `POST /orders/updateStatus` | `order.updateStatus` | 订单状态更新 |
| shop-order-service | `GoodService.queryGood()` | `order.queryGood` | 商品查询服务方法 |
| shop-order-service | `GET /anno1` | `order.anno1Demo` | 注解演示接口 |
| shop-order-service | `GET /hotSpot1` | `order.hotSpot1Demo` | 热点参数演示接口 |
| shop-payment-service | `POST /payment/pay` | `payment.pay` | 订单支付 |

## 4. 代码示例

```java
@GetMapping("/{pid}")
@SentinelResource(value = "product.getById", blockHandler = "findByIdBlockHandler")
public Product findById(@PathVariable Long pid) { ... }
```

```java
@PostMapping("/pay")
@SentinelResource(value = "payment.pay", blockHandler = "payOrderBlockHandler")
public Map<String, Object> pay(@RequestParam Long orderId) { ... }
```

## 5. 代码审查检查点

- [ ] 所有 `@SentinelResource` 的 `value` 是否遵循 `${module}.${function}` 格式？
- [ ] 资源名是否与代码中硬编码的限流规则（如 `SentinelRuleConfig`）保持一致？
- [ ] 是否避免使用数字、拼音、无意义缩写？
- [ ] 新增接口是否同步补充了 `blockHandler`？

## 6. 培训要点

1. Sentinel 资源名是监控维度，不是方法名，应具备业务可读性。
2. 资源名修改后，必须同步修改代码中注册的 FlowRule/DegradeRule，否则规则失效。
3. 部署后通过 Sentinel Dashboard「簇点链路」验证资源是否按新规范注册。
4. 压测使用 `test-sentinel-stress.ps1` 脚本，观察 Dashboard 实时 QPS。

## 7. 压测脚本

```powershell
.\test-sentinel-stress.ps1 -Concurrency 20 -DurationSeconds 30
```

持续观察脚本：

```powershell
.\test-continuous-traffic.ps1 -Concurrency 15 -IntervalMs 300
```
