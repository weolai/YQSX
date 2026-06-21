# API开发规范

## RESTful API设计

### URL规范

**基本格式**：
```
{protocol}://{domain}:{port}/{api-version}/{resource}/{action}
```

**示例**：
```
https://api.example.com:8080/v1/products/list
```

### 资源命名

**规则**：
- 使用名词复数形式
- 小写字母
- 单词间用短横线分隔
- 体现资源层级关系

**✅ 正确**：
```
GET    /api/v1/products              # 获取商品列表
GET    /api/v1/products/{id}         # 获取商品详情
POST   /api/v1/products              # 创建商品
PUT    /api/v1/products/{id}         # 更新商品
DELETE /api/v1/products/{id}         # 删除商品
GET    /api/v1/products/{id}/reviews # 获取商品评论
```

**❌ 错误**：
```
GET /api/v1/getProducts
GET /api/v1/product_list
POST /api/v1/createProduct
GET /api/v1/products/getById?id=1
```

### HTTP方法

| 方法 | 含义 | 幂等性 | 安全性 |
|-----|------|--------|--------|
| GET | 查询资源 | 是 | 是 |
| POST | 创建资源 | 否 | 否 |
| PUT | 完整更新资源 | 是 | 否 |
| PATCH | 部分更新资源 | 否 | 否 |
| DELETE | 删除资源 | 是 | 否 |

**使用原则**：
- GET请求参数放在URL中
- POST/PUT/PATCH请求体用JSON
- 删除操作使用DELETE，不使用GET

### HTTP状态码

**成功响应**：
- `200 OK`：请求成功
- `201 Created`：创建成功
- `204 No Content`：删除成功（无返回内容）

**客户端错误**：
- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：未认证
- `403 Forbidden`：无权限
- `404 Not Found`：资源不存在
- `409 Conflict`：资源冲突
- `422 Unprocessable Entity`：验证失败

**服务端错误**：
- `500 Internal Server Error`：服务器错误
- `502 Bad Gateway`：网关错误
- `503 Service Unavailable`：服务不可用

## 统一响应格式

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "商品名称"
  },
  "timestamp": 1718700000000
}
```

### 列表响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "商品1"
      },
      {
        "id": 2,
        "name": "商品2"
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 10
  },
  "timestamp": 1718700000000
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "参数错误",
  "data": null,
  "errors": [
    {
      "field": "name",
      "message": "商品名称不能为空"
    },
    {
      "field": "price",
      "message": "价格必须大于0"
    }
  ],
  "timestamp": 1718700000000
}
```

### 响应实体类

```java
@Data
public class Result<T> implements Serializable {
    
    private Integer code;
    private String message;
    private T data;
    private Long timestamp;
    
    public Result() {
        this.timestamp = System.currentTimeMillis();
    }
    
    public static <T> Result<T> success() {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("success");
        return result;
    }
    
    public static <T> Result<T> success(T data) {
        Result<T> result = success();
        result.setData(data);
        return result;
    }
    
    public static <T> Result<T> success(String message, T data) {
        Result<T> result = success(data);
        result.setMessage(message);
        return result;
    }
    
    public static <T> Result<T> error(Integer code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
    
    public static <T> Result<T> error(String message) {
        return error(500, message);
    }
}
```

## 请求参数规范

### Query参数（URL参数）

适用于：GET请求、简单查询条件

```java
@GetMapping("/products")
public Result<PageResult<ProductVO>> list(
    @RequestParam(defaultValue = "1") Integer pageNum,
    @RequestParam(defaultValue = "10") Integer pageSize,
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) Long categoryId
) {
    // ...
}
```

**URL示例**：
```
GET /api/v1/products?pageNum=1&pageSize=10&keyword=手机&categoryId=1
```

### Path参数（路径参数）

适用于：资源ID、唯一标识

```java
@GetMapping("/products/{id}")
public Result<ProductVO> getById(@PathVariable Long id) {
    // ...
}

@GetMapping("/categories/{categoryId}/products/{productId}")
public Result<ProductVO> getProductByCategory(
    @PathVariable Long categoryId,
    @PathVariable Long productId
) {
    // ...
}
```

**URL示例**：
```
GET /api/v1/products/123
GET /api/v1/categories/1/products/123
```

### Body参数（请求体）

适用于：POST/PUT/PATCH请求、复杂对象

```java
@PostMapping("/products")
public Result<ProductVO> create(@RequestBody @Valid ProductDTO dto) {
    // ...
}

@PutMapping("/products/{id}")
public Result<ProductVO> update(
    @PathVariable Long id,
    @RequestBody @Valid ProductDTO dto
) {
    // ...
}
```

**请求示例**：
```json
POST /api/v1/products
Content-Type: application/json

{
  "name": "商品名称",
  "price": 99.99,
  "stock": 100,
  "categoryId": 1
}
```

### Header参数

适用于：认证信息、API版本、元数据

```java
@GetMapping("/products")
public Result<List<ProductVO>> list(
    @RequestHeader("Authorization") String token,
    @RequestHeader(value = "X-Request-Id", required = false) String requestId
) {
    // ...
}
```

**请求示例**：
```
GET /api/v1/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

## 参数校验

### 常用校验注解

```java
@Data
public class ProductDTO {
    
    @NotNull(message = "商品名称不能为空")
    @Size(min = 1, max = 200, message = "商品名称长度为1-200字符")
    private String name;
    
    @NotNull(message = "价格不能为空")
    @DecimalMin(value = "0.01", message = "价格必须大于0")
    @DecimalMax(value = "999999.99", message = "价格不能超过999999.99")
    private BigDecimal price;
    
    @NotNull(message = "库存不能为空")
    @Min(value = 0, message = "库存不能为负数")
    @Max(value = 999999, message = "库存不能超过999999")
    private Integer stock;
    
    @NotNull(message = "分类ID不能为空")
    private Long categoryId;
    
    @Size(max = 500, message = "副标题长度不能超过500字符")
    private String subtitle;
    
    @Pattern(regexp = "^https?://.*", message = "图片URL格式不正确")
    private String mainImage;
    
    @Email(message = "邮箱格式不正确")
    private String email;
    
    @Length(min = 11, max = 11, message = "手机号必须为11位")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String mobile;
}
```

### 校验注解汇总

| 注解 | 说明 | 示例 |
|-----|------|------|
| @NotNull | 不能为null | @NotNull(message = "ID不能为空") |
| @NotEmpty | 不能为null且长度>0 | @NotEmpty(message = "名称不能为空") |
| @NotBlank | 不能为null且trim后长度>0 | @NotBlank(message = "标题不能为空") |
| @Size | 字符串/集合长度范围 | @Size(min=1, max=50) |
| @Length | 字符串长度范围 | @Length(min=6, max=20) |
| @Min | 最小值 | @Min(value=0) |
| @Max | 最大值 | @Max(value=100) |
| @DecimalMin | 小数最小值 | @DecimalMin(value="0.01") |
| @DecimalMax | 小数最大值 | @DecimalMax(value="999.99") |
| @Positive | 正数 | @Positive |
| @PositiveOrZero | 正数或0 | @PositiveOrZero |
| @Negative | 负数 | @Negative |
| @Email | 邮箱格式 | @Email |
| @Pattern | 正则表达式 | @Pattern(regexp="^1[3-9]\\d{9}$") |
| @Past | 过去的时间 | @Past |
| @Future | 未来的时间 | @Future |

### 自定义校验注解

```java
// 自定义校验注解
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = MobileValidator.class)
public @interface Mobile {
    String message() default "手机号格式不正确";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// 校验器实现
public class MobileValidator implements ConstraintValidator<Mobile, String> {
    
    private static final Pattern PATTERN = Pattern.compile("^1[3-9]\\d{9}$");
    
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isEmpty()) {
            return true; // @NotNull另外校验
        }
        return PATTERN.matcher(value).matches();
    }
}

// 使用
public class UserDTO {
    @Mobile(message = "手机号格式不正确")
    private String mobile;
}
```

### 全局异常处理

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    /**
     * 参数校验异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<?> handleValidException(MethodArgumentNotValidException e) {
        BindingResult bindingResult = e.getBindingResult();
        List<FieldError> fieldErrors = bindingResult.getFieldErrors();
        
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : fieldErrors) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        
        return Result.error(400, "参数校验失败").setErrors(errors);
    }
    
    /**
     * 业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }
    
    /**
     * 系统异常
     */
    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.error(500, "系统异常，请联系管理员");
    }
}
```

## 分页查询

### 分页请求参数

```java
@Data
public class PageQuery implements Serializable {
    
    @Min(value = 1, message = "页码最小为1")
    private Integer pageNum = 1;
    
    @Min(value = 1, message = "每页条数最小为1")
    @Max(value = 100, message = "每页条数最大为100")
    private Integer pageSize = 10;
    
    private String sortField;
    private String sortOrder = "DESC";
}
```

### 分页响应结果

```java
@Data
public class PageResult<T> implements Serializable {
    
    private List<T> list;      // 数据列表
    private Long total;        // 总记录数
    private Integer pageNum;   // 当前页码
    private Integer pageSize;  // 每页条数
    private Integer pages;     // 总页数
    
    public PageResult(List<T> list, Long total, Integer pageNum, Integer pageSize) {
        this.list = list;
        this.total = total;
        this.pageNum = pageNum;
        this.pageSize = pageSize;
        this.pages = (int) Math.ceil((double) total / pageSize);
    }
    
    public static <T> PageResult<T> of(IPage<T> page) {
        return new PageResult<>(
            page.getRecords(),
            page.getTotal(),
            (int) page.getCurrent(),
            (int) page.getSize()
        );
    }
}
```

### 分页查询示例

```java
@GetMapping("/products")
public Result<PageResult<ProductVO>> list(@Valid PageQuery pageQuery, ProductQuery query) {
    // MyBatis Plus分页
    Page<Product> page = new Page<>(pageQuery.getPageNum(), pageQuery.getPageSize());
    
    LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
    wrapper.like(StringUtils.isNotBlank(query.getKeyword()), Product::getName, query.getKeyword())
           .eq(query.getCategoryId() != null, Product::getCategoryId, query.getCategoryId())
           .eq(Product::getIsDeleted, 0)
           .orderByDesc(Product::getCreateTime);
    
    IPage<Product> result = productMapper.selectPage(page, wrapper);
    
    // 转换VO
    List<ProductVO> voList = result.getRecords().stream()
        .map(this::convertToVO)
        .collect(Collectors.toList());
    
    PageResult<ProductVO> pageResult = new PageResult<>(
        voList,
        result.getTotal(),
        pageQuery.getPageNum(),
        pageQuery.getPageSize()
    );
    
    return Result.success(pageResult);
}
```

## API版本控制

### URL版本控制（推荐）

```java
@RestController
@RequestMapping("/api/v1/products")
public class ProductControllerV1 {
    // v1版本接口
}

@RestController
@RequestMapping("/api/v2/products")
public class ProductControllerV2 {
    // v2版本接口
}
```

### Header版本控制

```java
@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    @GetMapping(headers = "API-Version=1")
    public Result<?> listV1() {
        // v1版本
    }
    
    @GetMapping(headers = "API-Version=2")
    public Result<?> listV2() {
        // v2版本
    }
}
```

## 接口文档

### Swagger/OpenAPI配置

```java
@Configuration
public class SwaggerConfig {
    
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("商城API文档")
                .version("v1.0")
                .description("商城系统RESTful API")
                .contact(new Contact()
                    .name("开发团队")
                    .email("dev@example.com")))
            .externalDocs(new ExternalDocumentation()
                .description("项目Wiki")
                .url("https://wiki.example.com"));
    }
}
```

### Swagger注解

```java
@RestController
@RequestMapping("/api/v1/products")
@Tag(name = "商品管理", description = "商品相关接口")
public class ProductController {
    
    @GetMapping
    @Operation(summary = "商品列表", description = "分页查询商品列表")
    @Parameters({
        @Parameter(name = "pageNum", description = "页码", example = "1"),
        @Parameter(name = "pageSize", description = "每页条数", example = "10"),
        @Parameter(name = "keyword", description = "搜索关键词", required = false)
    })
    public Result<PageResult<ProductVO>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "10") Integer pageSize,
        @RequestParam(required = false) String keyword
    ) {
        // ...
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "商品详情", description = "根据ID查询商品详情")
    @Parameter(name = "id", description = "商品ID", required = true, example = "1")
    public Result<ProductVO> getById(@PathVariable Long id) {
        // ...
    }
    
    @PostMapping
    @Operation(summary = "创建商品", description = "新增商品信息")
    public Result<ProductVO> create(
        @RequestBody @Valid ProductDTO dto
    ) {
        // ...
    }
}
```

### DTO/VO注解

```java
@Data
@Schema(description = "商品信息")
public class ProductVO {
    
    @Schema(description = "商品ID", example = "1")
    private Long id;
    
    @Schema(description = "商品名称", example = "iPhone 15 Pro")
    private String name;
    
    @Schema(description = "商品价格", example = "7999.00")
    private BigDecimal price;
    
    @Schema(description = "库存数量", example = "100")
    private Integer stock;
    
    @Schema(description = "创建时间", example = "2026-06-18 10:00:00")
    private LocalDateTime createTime;
}
```

## 接口安全

### 认证鉴权

```java
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    
    // 需要登录
    @GetMapping("/favorites")
    @SaCheckLogin
    public Result<List<ProductVO>> getFavorites() {
        Long userId = StpUtil.getLoginIdAsLong();
        // ...
    }
    
    // 需要特定权限
    @PostMapping
    @SaCheckPermission("product:add")
    public Result<ProductVO> create(@RequestBody @Valid ProductDTO dto) {
        // ...
    }
    
    // 需要特定角色
    @DeleteMapping("/{id}")
    @SaCheckRole("admin")
    public Result<?> delete(@PathVariable Long id) {
        // ...
    }
}
```

### 接口签名

防止参数篡改：

```java
public class SignUtils {
    
    /**
     * 生成签名
     */
    public static String sign(Map<String, String> params, String secret) {
        // 1. 参数排序
        TreeMap<String, String> sortedParams = new TreeMap<>(params);
        
        // 2. 拼接字符串
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
            sb.append(entry.getKey()).append("=").append(entry.getValue()).append("&");
        }
        sb.append("secret=").append(secret);
        
        // 3. MD5加密
        return DigestUtils.md5Hex(sb.toString());
    }
    
    /**
     * 验证签名
     */
    public static boolean verify(Map<String, String> params, String sign, String secret) {
        String calculatedSign = sign(params, secret);
        return calculatedSign.equals(sign);
    }
}
```

### 接口限流

```java
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    
    @GetMapping("/{id}")
    @SentinelResource(
        value = "getProduct",
        blockHandler = "handleBlock",
        fallback = "handleFallback"
    )
    public Result<ProductVO> getById(@PathVariable Long id) {
        // ...
    }
    
    // 限流处理
    public Result<ProductVO> handleBlock(Long id, BlockException e) {
        return Result.error(429, "访问过于频繁，请稍后再试");
    }
    
    // 降级处理
    public Result<ProductVO> handleFallback(Long id, Throwable e) {
        return Result.error(500, "服务暂时不可用");
    }
}
```

## 接口测试

### 单元测试

```java
@SpringBootTest
@AutoConfigureMockMvc
class ProductControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Test
    void testGetById() throws Exception {
        mockMvc.perform(get("/api/v1/products/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.id").value(1))
            .andExpect(jsonPath("$.data.name").isNotEmpty());
    }
    
    @Test
    void testCreate() throws Exception {
        ProductDTO dto = new ProductDTO();
        dto.setName("测试商品");
        dto.setPrice(new BigDecimal("99.99"));
        dto.setStock(100);
        dto.setCategoryId(1L);
        
        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.id").isNumber());
    }
}
```

## 最佳实践

### 1. 使用DTO和VO

- **DTO（Data Transfer Object）**：接收前端请求参数
- **VO（View Object）**：返回给前端的数据
- **Entity**：数据库实体

**禁止**直接暴露Entity给前端。

### 2. 统一异常处理

所有异常通过`@RestControllerAdvice`统一处理，返回统一格式。

### 3. 接口幂等性

对于非幂等操作（如创建订单），使用幂等性Token：

```java
@PostMapping("/orders")
public Result<OrderVO> create(
    @RequestHeader("Idempotent-Token") String token,
    @RequestBody @Valid OrderDTO dto
) {
    // 验证并消费Token
    if (!idempotentService.checkAndConsume(token)) {
        throw new BusinessException("请勿重复提交");
    }
    // ...
}
```

### 4. 接口日志

记录关键操作日志：

```java
@Aspect
@Component
public class ApiLogAspect {
    
    @Around("@annotation(apiLog)")
    public Object around(ProceedingJoinPoint point, ApiLog apiLog) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        // 记录请求
        log.info("API请求: {}", point.getSignature());
        
        try {
            Object result = point.proceed();
            long duration = System.currentTimeMillis() - startTime;
            
            // 记录响应
            log.info("API响应: {}, 耗时: {}ms", result, duration);
            
            return result;
        } catch (Exception e) {
            log.error("API异常", e);
            throw e;
        }
    }
}
```

### 5. 响应时间优化

- 数据库查询优化
- 合理使用缓存
- 异步处理
- 避免N+1查询

### 6. 接口监控

- 集成Prometheus + Grafana
- 监控QPS、响应时间、错误率
- 设置告警规则

## 禁止事项

1. ❌ 不返回敏感信息（密码、密钥等）
2. ❌ 不在URL中传递敏感参数
3. ❌ 不使用GET请求进行数据修改
4. ❌ 不在错误信息中暴露系统细节
5. ❌ 不忽略异常，必须统一处理
6. ❌ 不在Controller中写业务逻辑
7. ❌ 不直接返回Entity给前端

## 当前项目实际接口清单

> 以下接口已在本项目中实现并通过联调测试。

### 认证相关

#### 用户登录

```
POST /api/user/login
Content-Type: application/json
```

**说明**：用户名和密码通过请求体 JSON 传递，避免在 URL 中暴露。

**请求示例**：
```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应示例**：
```json
{
  "code": 200,
  "msg": "login success",
  "userId": 1,
  "username": "admin",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

#### 获取当前用户

```
GET /api/user/current
Authorization: Bearer <token>
```

**响应示例**：
```json
{
  "service": "shop-user-service",
  "port": "8083",
  "userId": "1"
}
```

---

### 商品相关

#### 商品详情

```
GET /api/products/{pid}
Authorization: Bearer <token>
```

**响应示例**：
```json
{
  "id": 11,
  "name": "Cheetoz 车轮 零食—8081",
  "price": 11.5,
  "stock": 600,
  "categoryId": 11,
  "imageUrl": "/images/products/cheetoz_wheel.jpg",
  "sales": 270
}
```

#### 拍照识别商品

```
POST /api/products/recognize
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <图片文件>
uid: <用户ID，可选>
```

**响应示例**：
```json
{
  "status": "success",
  "message": "识别成功",
  "requestId": "bc8dcaebf07343ad8d597e548c369d3b",
  "products": [
    {
      "id": 11,
      "name": "Cheetoz 车轮 零食",
      "price": 11.5,
      "stock": 600,
      "categoryId": 11,
      "imageUrl": "/images/products/cheetoz_wheel.jpg",
      "sales": 270,
      "categoryName": "Cheetoz 车轮零食"
    }
  ],
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
  "detectedCount": 4,
  "categoryName": "Cheetoz 车轮零食"
}
```

#### 基于类别推荐商品

```
GET /api/products/recommend?categoryId={categoryId}&limit={limit}
Authorization: Bearer <token>
```

**响应示例**：
```json
[
  {
    "id": 11,
    "name": "Cheetoz 车轮 零食",
    "price": 11.5,
    "stock": 600,
    "categoryId": 11,
    "imageUrl": "/images/products/cheetoz_wheel.jpg",
    "sales": 270
  }
]
```

---

### 订单相关

#### 创建订单

```
POST /api/orders/save
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

pid: <商品ID>
uid: <用户ID>
```

**响应示例**：
```json
{
  "code": 200,
  "msg": "order create success",
  "orderId": 1001
}
```

#### 查询订单

```
GET /api/orders/{id}
Authorization: Bearer <token>
```

**响应示例**：
```json
{
  "id": 1001,
  "pid": 11,
  "uid": 1,
  "username": "admin",
  "productName": "Cheetoz 车轮 零食",
  "productPrice": 11.5,
  "number": 1,
  "status": "WAIT_PAY",
  "version": 0
}
```

#### 查询用户订单列表

```
GET /api/orders/list/{uid}
Authorization: Bearer <token>
```

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 79,
      "pid": 1,
      "uid": 1,
      "username": "admin",
      "productName": "Ashi Mashi 经典零食",
      "productPrice": 8.5,
      "number": 1,
      "status": "PAID",
      "version": 1
    }
  ]
}
```

#### 更新订单状态

```
POST /api/orders/updateStatus
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

orderId: <订单ID>
status: <目标状态>
```

---

### 支付相关

#### 订单支付

```
POST /api/payment/pay
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

orderId: <订单ID>
```

**响应示例**：
```json
{
  "code": 200,
  "msg": "payment success",
  "orderId": 1001,
  "orderUpdateResult": "success"
}
```

---

### 图像识别服务（直接调用）

#### 健康检查

```
GET http://127.0.0.1:8086/health
```

**响应示例**：
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
POST http://127.0.0.1:8086/api/recognition/v1/recognize/image
Content-Type: multipart/form-data

file: <图片文件>
```

**响应示例**：
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

---

### 网关路由规则

| 路由 | 目标服务 | 路径前缀 |
|------|---------|---------|
| shop-user-service | user | `/api/user/**` |
| shop-product-service | product | `/api/products/**` |
| shop-order-service | order | `/api/orders/**` |
| shop-payment-service | payment | `/api/payment/**` |

**白名单**（无需 JWT）：
- `/api/user/login`
- `/api/user/hello`

**认证头**：
```
Authorization: Bearer <token>
```

---

## 参考资料

- [RESTful API设计指南](https://restfulapi.net/)
- [HTTP状态码](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status)
- [OpenAPI规范](https://swagger.io/specification/)
