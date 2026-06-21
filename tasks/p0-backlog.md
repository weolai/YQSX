# P0 核心功能 - 详细任务分解 (WBS)

## 概述

基于 `project-status.md` 的 P0 核心功能，将每个任务拆分为粒度不超过 **3小时** 的子任务，标注依赖关系、优先级、修改文件和验收标准。

---

## 任务总览

| 任务组 | 子任务数 | 总工时 | 优先级 |
|-------|---------|--------|--------|
| 数据库表结构 | 3 | 5小时 | P0-001 |
| 用户服务 | 12 | 28小时 | P0-002 |
| 商品服务完善 | 8 | 18小时 | P0-003 |
| 订单服务完善 | 8 | 18小时 | P0-004 |
| 支付服务 | 8 | 20小时 | P0-005 |
| 认证授权 | 5 | 10小时 | P0-006 |
| 网关服务 | 6 | 14小时 | P0-007 |

**总计：50个子任务，约113小时**

---

## 任务分解详情

### 一、数据库表结构

#### P0-001-01: 创建用户数据库及核心表

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-001-01 |
| 任务名称 | 创建 shop-user 数据库及 t_user 表 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | 无 |
| 修改文件 | `Test/shop-parent/init.sql` |

**验收标准：**
- 成功创建 shop-user 数据库
- t_user 表包含完整字段（id, username, password, nickname, mobile, email, balance, points, status, is_deleted, create_time, update_time）
- 主键索引和唯一索引（username, mobile）已创建

---

#### P0-001-02: 创建支付数据库及核心表

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-001-02 |
| 任务名称 | 创建 shop-payment 数据库及 t_payment 表 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-001-01 |
| 修改文件 | `Test/shop-parent/init.sql` |

**验收标准：**
- 成功创建 shop-payment 数据库
- t_payment 表包含完整字段（id, order_id, amount, pay_type, status, create_time, update_time）
- 索引已创建（order_id）

---

#### P0-001-03: 创建订单明细表

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-001-03 |
| 任务名称 | 在 shop-order 数据库创建 t_order_item 表 |
| 预估工时 | 1小时 |
| 优先级 | 高 |
| 依赖 | P0-001-01 |
| 修改文件 | `Test/shop-parent/init.sql` |

**验收标准：**
- t_order_item 表创建成功
- 包含字段（id, order_id, product_id, product_name, product_price, quantity）
- 索引已创建（order_id, product_id）

---

### 二、用户服务

#### P0-002-01: 创建用户服务模块结构

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-01 |
| 任务名称 | 创建 shop-user-server 模块及基础配置 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-001-01 |
| 修改文件 | `Test/shop-parent/pom.xml`, `Test/shop-parent/shop-user-server/pom.xml`, `Test/shop-parent/shop-user-server/src/main/resources/application.yml` |

**验收标准：**
- 模块在父pom中注册成功
- pom.xml 正确引入 Spring Boot、Nacos、MyBatis Plus 依赖
- application.yml 配置完成（端口8083、数据源、Nacos注册）

---

#### P0-002-02: 创建用户实体类

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-02 |
| 任务名称 | 创建 User 实体类 |
| 预估工时 | 1.5小时 |
| 优先级 | 高 |
| 依赖 | P0-002-01 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/entity/User.java` |

**验收标准：**
- 实体类与 t_user 表字段映射正确
- 使用 MyBatis Plus 注解
- 包含逻辑删除和时间字段

---

#### P0-002-03: 创建用户 DTO 和 VO

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-03 |
| 任务名称 | 创建 LoginDTO、RegisterDTO、UserVO |
| 预估工时 | 1.5小时 |
| 优先级 | 高 |
| 依赖 | P0-002-02 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/dto/LoginDTO.java`, `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/dto/RegisterDTO.java`, `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/vo/UserVO.java` |

**验收标准：**
- DTO/VO 字段定义完整
- 使用 @NotNull、@NotBlank 等校验注解

---

#### P0-002-04: 创建用户 Mapper

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-04 |
| 任务名称 | 创建 UserMapper 接口 |
| 预估工时 | 1小时 |
| 优先级 | 高 |
| 依赖 | P0-002-02 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/mapper/UserMapper.java` |

**验收标准：**
- 继承 MyBatis Plus BaseMapper
- 编译通过

---

#### P0-002-05: 创建用户 Service 接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-05 |
| 任务名称 | 创建 UserService 接口 |
| 预估工时 | 1小时 |
| 优先级 | 高 |
| 依赖 | P0-002-04 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/UserService.java` |

**验收标准：**
- 定义登录、注册、查询用户、更新用户、余额管理等方法
- 继承 MyBatis Plus IService

---

#### P0-002-06: 实现用户注册功能

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-06 |
| 任务名称 | 实现用户注册业务逻辑 |
| 预估工时 | 2.5小时 |
| 优先级 | 高 |
| 依赖 | P0-002-05 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/impl/UserServiceImpl.java` |

**验收标准：**
- 用户名唯一性校验
- 密码使用 BCrypt 加密
- 返回注册成功用户信息

---

#### P0-002-07: 实现用户登录功能

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-07 |
| 任务名称 | 实现用户登录业务逻辑 |
| 预估工时 | 2.5小时 |
| 优先级 | 高 |
| 依赖 | P0-002-06 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/impl/UserServiceImpl.java` |

**验收标准：**
- 用户名密码校验
- 密码正确比对
- 返回用户信息

---

#### P0-002-08: 创建用户 Controller

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-08 |
| 任务名称 | 创建 UserController |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-002-07 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/controller/UserController.java` |

**验收标准：**
- 实现注册接口 `/user/register`
- 实现登录接口 `/user/login`
- 参数校验和统一返回格式

---

#### P0-002-09: 实现用户信息查询

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-09 |
| 任务名称 | 实现用户信息查询和列表接口 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-002-08 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/impl/UserServiceImpl.java`, `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/controller/UserController.java` |

**验收标准：**
- `/user/{id}` 根据ID查询用户
- `/user/list` 分页查询用户列表

---

#### P0-002-10: 实现用户信息更新

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-10 |
| 任务名称 | 实现用户信息更新接口 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-002-09 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/impl/UserServiceImpl.java`, `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/controller/UserController.java` |

**验收标准：**
- `/user/update` 更新用户信息
- `/user/delete/{id}` 逻辑删除用户

---

#### P0-002-11: 实现余额和积分管理

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-11 |
| 任务名称 | 实现余额扣减和积分增减接口 |
| 预估工时 | 2.5小时 |
| 优先级 | 高 |
| 依赖 | P0-002-10 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/impl/UserServiceImpl.java`, `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/controller/UserController.java` |

**验收标准：**
- `/user/balance/deduct` 扣减余额（需校验余额充足）
- `/user/points/add` 添加积分

---

#### P0-002-12: 添加全局异常处理和日志

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-002-12 |
| 任务名称 | 添加 GlobalExceptionHandler 和日志记录 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-002-11 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/config/GlobalExceptionHandler.java`, `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/config/ResultData.java` |

**验收标准：**
- 统一异常处理返回格式
- 请求日志和异常日志记录完整

---

### 三、商品服务完善

#### P0-003-01: 添加商品列表查询接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-01 |
| 任务名称 | 添加商品分页列表和条件查询 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | 无（商品服务已存在） |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/impl/ProductServiceImpl.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/controller/ProductController.java` |

**验收标准：**
- `/product/list` 分页查询商品列表
- 支持按名称模糊查询

---

#### P0-003-02: 添加商品新增接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-02 |
| 任务名称 | 实现商品新增功能 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-003-01 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/impl/ProductServiceImpl.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/controller/ProductController.java` |

**验收标准：**
- `/product/add` 新增商品
- 参数校验完整

---

#### P0-003-03: 添加商品更新接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-03 |
| 任务名称 | 实现商品更新功能 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-003-02 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/impl/ProductServiceImpl.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/controller/ProductController.java` |

**验收标准：**
- `/product/update` 更新商品信息
- 更新后数据正确

---

#### P0-003-04: 添加商品删除接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-04 |
| 任务名称 | 实现商品逻辑删除功能 |
| 预估工时 | 1.5小时 |
| 优先级 | 中 |
| 依赖 | P0-003-03 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/impl/ProductServiceImpl.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/controller/ProductController.java` |

**验收标准：**
- `/product/delete/{id}` 逻辑删除商品
- 删除后列表查询不返回该商品

---

#### P0-003-05: 添加库存扣减接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-05 |
| 任务名称 | 实现库存扣减功能 |
| 预估工时 | 2.5小时 |
| 优先级 | 高 |
| 依赖 | P0-003-04 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/impl/ProductServiceImpl.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/controller/ProductController.java` |

**验收标准：**
- `/product/stock/deduct` 扣减库存
- 库存不足时返回错误
- 使用乐观锁保证并发安全

---

#### P0-003-06: 添加 DTO/VO 层

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-06 |
| 任务名称 | 添加商品 DTO 和 VO |
| 预估工时 | 1.5小时 |
| 优先级 | 中 |
| 依赖 | P0-003-05 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/dto/ProductDTO.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/vo/ProductVO.java` |

**验收标准：**
- DTO/VO 定义完整
- Controller 使用 DTO/VO 而非直接返回 Entity

---

#### P0-003-07: 添加全局异常处理

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-07 |
| 任务名称 | 添加 GlobalExceptionHandler |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-003-06 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/config/GlobalExceptionHandler.java`, `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/config/ResultData.java` |

**验收标准：**
- 统一异常处理返回格式

---

#### P0-003-08: 添加日志记录

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-003-08 |
| 任务名称 | 添加请求日志和业务日志 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-003-07 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/impl/ProductServiceImpl.java` |

**验收标准：**
- 关键业务操作有日志记录
- 异常时有错误日志

---

### 四、订单服务完善

#### P0-004-01: 添加订单列表查询接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-01 |
| 任务名称 | 实现订单分页列表查询 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | 无（订单服务已存在） |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/controller/OrderController.java` |

**验收标准：**
- `/order/list` 分页查询订单列表
- 支持按用户ID查询

---

#### P0-004-02: 添加订单详情查询接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-02 |
| 任务名称 | 实现订单详情查询 |
| 预估工时 | 1.5小时 |
| 优先级 | 高 |
| 依赖 | P0-004-01 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/controller/OrderController.java` |

**验收标准：**
- `/order/{id}` 查询订单详情

---

#### P0-004-03: 添加订单支付接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-03 |
| 任务名称 | 实现订单支付接口（调用支付服务） |
| 预估工时 | 2.5小时 |
| 优先级 | 高 |
| 依赖 | P0-004-02, P0-005-06 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/controller/OrderController.java` |

**验收标准：**
- `/order/pay` 调用支付服务完成支付
- 支付成功后更新订单状态

---

#### P0-004-04: 添加订单取消接口

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-04 |
| 任务名称 | 实现订单取消功能 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-004-03 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/controller/OrderController.java` |

**验收标准：**
- `/order/cancel` 取消订单
- 已支付订单不允许取消
- 取消后恢复库存

---

#### P0-004-05: 添加订单明细表操作

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-05 |
| 任务名称 | 创建订单时同步创建订单明细 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-001-03, P0-004-04 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/entity/OrderItem.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/mapper/OrderItemMapper.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java` |

**验收标准：**
- 创建订单时同时创建订单明细
- 订单详情查询包含订单明细

---

#### P0-004-06: 添加 DTO/VO 层

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-06 |
| 任务名称 | 添加订单 DTO 和 VO |
| 预估工时 | 1.5小时 |
| 优先级 | 中 |
| 依赖 | P0-004-05 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/dto/OrderDTO.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/vo/OrderVO.java` |

**验收标准：**
- DTO/VO 定义完整

---

#### P0-004-07: 添加全局异常处理

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-07 |
| 任务名称 | 添加 GlobalExceptionHandler |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-004-06 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/config/GlobalExceptionHandler.java` |

**验收标准：**
- 统一异常处理返回格式

---

#### P0-004-08: 添加日志记录

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-004-08 |
| 任务名称 | 添加请求日志和业务日志 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-004-07 |
| 修改文件 | `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java` |

**验收标准：**
- 关键业务操作有日志记录

---

### 五、支付服务

#### P0-005-01: 创建支付服务模块结构

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-01 |
| 任务名称 | 创建 shop-payment-server 模块及基础配置 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-001-02 |
| 修改文件 | `Test/shop-parent/pom.xml`, `Test/shop-parent/shop-payment-server/pom.xml`, `Test/shop-parent/shop-payment-server/src/main/resources/application.yml` |

**验收标准：**
- 模块注册成功
- 配置完成（端口8084、数据源、Nacos注册）

---

#### P0-005-02: 创建支付实体类

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-02 |
| 任务名称 | 创建 Payment 实体类 |
| 预估工时 | 1.5小时 |
| 优先级 | 高 |
| 依赖 | P0-005-01 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/entity/Payment.java` |

**验收标准：**
- 实体类与 t_payment 表字段映射正确

---

#### P0-005-03: 创建支付 DTO 和 VO

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-03 |
| 任务名称 | 创建 PaymentDTO、PaymentVO |
| 预估工时 | 1.5小时 |
| 优先级 | 高 |
| 依赖 | P0-005-02 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/dto/PaymentDTO.java`, `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/vo/PaymentVO.java` |

**验收标准：**
- DTO/VO 字段定义完整

---

#### P0-005-04: 创建支付 Mapper 和 Service

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-04 |
| 任务名称 | 创建 PaymentMapper 和 PaymentService |
| 预估工时 | 1.5小时 |
| 优先级 | 高 |
| 依赖 | P0-005-03 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/mapper/PaymentMapper.java`, `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/service/PaymentService.java` |

**验收标准：**
- Mapper 和 Service 接口创建完成

---

#### P0-005-05: 实现支付业务逻辑

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-05 |
| 任务名称 | 实现支付和退款业务逻辑 |
| 预估工时 | 3小时 |
| 优先级 | 高 |
| 依赖 | P0-005-04, P0-002-11 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/service/impl/PaymentServiceImpl.java` |

**验收标准：**
- 支付时扣减用户余额
- 生成支付记录
- 退款时恢复用户余额

---

#### P0-005-06: 创建支付 Controller

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-06 |
| 任务名称 | 创建 PaymentController |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-005-05 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/controller/PaymentController.java` |

**验收标准：**
- `/payment/pay` 支付接口
- `/payment/refund` 退款接口
- `/payment/query/{orderId}` 查询支付记录

---

#### P0-005-07: 添加全局异常处理

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-07 |
| 任务名称 | 添加 GlobalExceptionHandler |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-005-06 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/config/GlobalExceptionHandler.java`, `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/config/ResultData.java` |

**验收标准：**
- 统一异常处理返回格式

---

#### P0-005-08: 添加日志记录

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-005-08 |
| 任务名称 | 添加请求日志和业务日志 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-005-07 |
| 修改文件 | `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/service/impl/PaymentServiceImpl.java` |

**验收标准：**
- 支付和退款操作有日志记录

---

### 六、认证授权

#### P0-006-01: 添加 Sa-Token 依赖

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-006-01 |
| 任务名称 | 在各服务中添加 Sa-Token 依赖 |
| 预估工时 | 1小时 |
| 优先级 | 高 |
| 依赖 | 无 |
| 修改文件 | `Test/shop-parent/shop-user-server/pom.xml`, `Test/shop-parent/shop-product-server/pom.xml`, `Test/shop-parent/shop-order-server/pom.xml`, `Test/shop-parent/shop-payment-server/pom.xml` |

**验收标准：**
- 所有服务正确引入 Sa-Token 依赖

---

#### P0-006-02: 配置 Sa-Token

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-006-02 |
| 任务名称 | 配置 Sa-Token（登录、过期时间等） |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-006-01 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/config/SaTokenConfig.java`, `Test/shop-parent/shop-user-server/src/main/resources/application.yml` |

**验收标准：**
- Sa-Token 配置完成
- Token 过期时间设置为2小时

---

#### P0-006-03: 集成登录认证

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-006-03 |
| 任务名称 | 在用户服务中集成 Sa-Token 登录认证 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-006-02, P0-002-07 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/service/impl/UserServiceImpl.java` |

**验收标准：**
- 登录成功后生成 Sa-Token
- Token 存储到 Redis

---

#### P0-006-04: 添加登录拦截器

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-006-04 |
| 任务名称 | 在各服务中添加登录拦截器 |
| 预估工时 | 3小时 |
| 优先级 | 高 |
| 依赖 | P0-006-03 |
| 修改文件 | `Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/config/WebMvcConfig.java`, `Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/config/WebMvcConfig.java`, `Test/shop-parent/shop-payment-server/src/main/java/com/gec/shop/payment/config/WebMvcConfig.java` |

**验收标准：**
- 非登录接口需要 Token 认证
- 登录接口白名单配置

---

#### P0-006-05: 配置权限校验

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-006-05 |
| 任务名称 | 配置 RBAC 权限校验 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-006-04 |
| 修改文件 | `Test/shop-parent/shop-user-server/src/main/java/com/gec/shop/user/config/SaTokenConfig.java` |

**验收标准：**
- 支持权限码校验

---

### 七、网关服务

#### P0-007-01: 创建网关服务模块结构

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-007-01 |
| 任务名称 | 创建 shop-gateway-server 模块及基础配置 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | 无 |
| 修改文件 | `Test/shop-parent/pom.xml`, `Test/shop-parent/shop-gateway-server/pom.xml`, `Test/shop-parent/shop-gateway-server/src/main/resources/application.yml` |

**验收标准：**
- 模块注册成功
- 配置完成（端口8080、Nacos注册）

---

#### P0-007-02: 配置路由转发

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-007-02 |
| 任务名称 | 配置各服务路由规则 |
| 预估工时 | 2小时 |
| 优先级 | 高 |
| 依赖 | P0-007-01 |
| 修改文件 | `Test/shop-parent/shop-gateway-server/src/main/resources/application.yml` |

**验收标准：**
- `/api/user/**` 路由到用户服务
- `/api/product/**` 路由到商品服务
- `/api/order/**` 路由到订单服务
- `/api/payment/**` 路由到支付服务

---

#### P0-007-03: 添加认证过滤器

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-007-03 |
| 任务名称 | 添加全局认证过滤器 |
| 预估工时 | 2.5小时 |
| 优先级 | 高 |
| 依赖 | P0-007-02, P0-006-03 |
| 修改文件 | `Test/shop-parent/shop-gateway-server/src/main/java/com/gec/shop/gateway/filter/AuthFilter.java` |

**验收标准：**
- 非登录接口校验 Token
- Token 无效返回401
- 登录接口白名单

---

#### P0-007-04: 添加限流过滤器

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-007-04 |
| 任务名称 | 添加 Sentinel 限流过滤器 |
| 预估工时 | 2.5小时 |
| 优先级 | 中 |
| 依赖 | P0-007-03 |
| 修改文件 | `Test/shop-parent/shop-gateway-server/src/main/java/com/gec/shop/gateway/config/SentinelConfig.java` |

**验收标准：**
- 集成 Sentinel
- 限流规则配置

---

#### P0-007-05: 添加日志过滤器

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-007-05 |
| 任务名称 | 添加请求日志过滤器 |
| 预估工时 | 2小时 |
| 优先级 | 中 |
| 依赖 | P0-007-04 |
| 修改文件 | `Test/shop-parent/shop-gateway-server/src/main/java/com/gec/shop/gateway/filter/LogFilter.java` |

**验收标准：**
- 记录请求日志
- 记录响应时间

---

#### P0-007-06: 添加跨域配置

| 项目 | 内容 |
|-----|------|
| 任务ID | P0-007-06 |
| 任务名称 | 配置网关跨域访问 |
| 预估工时 | 1小时 |
| 优先级 | 中 |
| 依赖 | P0-007-05 |
| 修改文件 | `Test/shop-parent/shop-gateway-server/src/main/java/com/gec/shop/gateway/config/CorsConfig.java` |

**验收标准：**
- 跨域配置完成

---

## 任务依赖关系

```
P0-001-01 ────→ P0-001-02
    │              │
    └───→ P0-001-03
          │
          ↓
P0-002-01 ←─────────┘
    │
    ↓
P0-002-02 ──→ P0-002-03 ──→ P0-002-04 ──→ P0-002-05
                                              │
                    ┌─────────────────────────┘
                    ↓
P0-002-06 ──→ P0-002-07 ──→ P0-002-08 ──→ P0-002-09 ──→ P0-002-10 ──→ P0-002-11 ──→ P0-002-12

P0-003-01 ──→ P0-003-02 ──→ P0-003-03 ──→ P0-003-04 ──→ P0-003-05 ──→ P0-003-06 ──→ P0-003-07 ──→ P0-003-08

P0-004-01 ──→ P0-004-02 ──→ P0-004-03 ←── P0-005-06
                    │
                    ↓
P0-004-04 ──→ P0-004-05 ──→ P0-004-06 ──→ P0-004-07 ──→ P0-004-08

P0-005-01 ──→ P0-005-02 ──→ P0-005-03 ──→ P0-005-04 ──→ P0-005-05 ──→ P0-005-06 ──→ P0-005-07 ──→ P0-005-08
                                              │
                                              ←── P0-002-11

P0-006-01 ──→ P0-006-02 ──→ P0-006-03 ──→ P0-006-04 ──→ P0-006-05
                            │
                            ←── P0-002-07

P0-007-01 ──→ P0-007-02 ──→ P0-007-03 ──→ P0-007-04 ──→ P0-007-05 ──→ P0-007-06
                                              │
                                              ←── P0-006-03
```

---

## 任务优先级排序

| 优先级 | 任务ID | 任务名称 |
|--------|--------|---------|
| P0-High | P0-001-01 | 创建用户数据库及核心表 |
| P0-High | P0-001-02 | 创建支付数据库及核心表 |
| P0-High | P0-001-03 | 创建订单明细表 |
| P0-High | P0-002-01 | 创建用户服务模块结构 |
| P0-High | P0-002-02 | 创建用户实体类 |
| P0-High | P0-002-03 | 创建用户 DTO 和 VO |
| P0-High | P0-002-04 | 创建用户 Mapper |
| P0-High | P0-002-05 | 创建用户 Service 接口 |
| P0-High | P0-002-06 | 实现用户注册功能 |
| P0-High | P0-002-07 | 实现用户登录功能 |
| P0-High | P0-002-08 | 创建用户 Controller |
| P0-High | P0-002-11 | 实现余额和积分管理 |
| P0-High | P0-003-01 | 添加商品列表查询接口 |
| P0-High | P0-003-02 | 添加商品新增接口 |
| P0-High | P0-003-03 | 添加商品更新接口 |
| P0-High | P0-003-05 | 添加库存扣减接口 |
| P0-High | P0-004-01 | 添加订单列表查询接口 |
| P0-High | P0-004-02 | 添加订单详情查询接口 |
| P0-High | P0-004-03 | 添加订单支付接口 |
| P0-High | P0-004-04 | 添加订单取消接口 |
| P0-High | P0-004-05 | 添加订单明细表操作 |
| P0-High | P0-005-01 | 创建支付服务模块结构 |
| P0-High | P0-005-02 | 创建支付实体类 |
| P0-High | P0-005-03 | 创建支付 DTO 和 VO |
| P0-High | P0-005-04 | 创建支付 Mapper 和 Service |
| P0-High | P0-005-05 | 实现支付业务逻辑 |
| P0-High | P0-005-06 | 创建支付 Controller |
| P0-High | P0-006-01 | 添加 Sa-Token 依赖 |
| P0-High | P0-006-02 | 配置 Sa-Token |
| P0-High | P0-006-03 | 集成登录认证 |
| P0-High | P0-006-04 | 添加登录拦截器 |
| P0-High | P0-007-01 | 创建网关服务模块结构 |
| P0-High | P0-007-02 | 配置路由转发 |
| P0-High | P0-007-03 | 添加认证过滤器 |
| P0-Medium | P0-002-09 | 实现用户信息查询 |
| P0-Medium | P0-002-10 | 实现用户信息更新 |
| P0-Medium | P0-002-12 | 添加全局异常处理和日志 |
| P0-Medium | P0-003-04 | 添加商品删除接口 |
| P0-Medium | P0-003-06 | 添加 DTO/VO 层 |
| P0-Medium | P0-003-07 | 添加全局异常处理 |
| P0-Medium | P0-003-08 | 添加日志记录 |
| P0-Medium | P0-004-06 | 添加 DTO/VO 层 |
| P0-Medium | P0-004-07 | 添加全局异常处理 |
| P0-Medium | P0-004-08 | 添加日志记录 |
| P0-Medium | P0-005-07 | 添加全局异常处理 |
| P0-Medium | P0-005-08 | 添加日志记录 |
| P0-Medium | P0-006-05 | 配置权限校验 |
| P0-Medium | P0-007-04 | 添加限流过滤器 |
| P0-Medium | P0-007-05 | 添加日志过滤器 |
| P0-Medium | P0-007-06 | 添加跨域配置 |

---

## 生成时间

**生成时间**: 2026-06-18  
**版本**: 1.0.0  
**基于文档**: `docs/project-status.md`
