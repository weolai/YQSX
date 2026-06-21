# Spring Boot后端开发规范

## 技术栈

- **Spring Boot 2.3.2.RELEASE**：微服务框架
- **Spring Cloud Hoxton.SR8**：微服务治理
- **Spring Cloud Alibaba 2.2.3.RELEASE**：微服务组件
- **MyBatis Plus 3.x**：ORM框架
- **Sa-Token**：认证授权
- **MySQL 8.0+**：关系数据库
- **Redis 6.0+**：缓存
- **Nacos 2.x**：注册中心/配置中心
- **Sentinel**：流量控制
- **Seata**：分布式事务

## 项目结构

```
shop-product-server/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/gec/shop/product/
│   │   │       ├── ProductApplication.java      # 启动类
│   │   │       ├── config/                      # 配置类
│   │   │       │   ├── MyBatisPlusConfig.java
│   │   │       │   ├── RedisConfig.java
│   │   │       │   └── SaTokenConfig.java
│   │   │       ├── controller/                  # 控制器
│   │   │       │   └── ProductController.java
│   │   │       ├── service/                     # 服务接口
│   │   │       │   ├── ProductService.java
│   │   │       │   └── impl/                    # 服务实现
│   │   │       │       └── ProductServiceImpl.java
│   │   │       ├── mapper/                      # 数据访问
│   │   │       │   └── ProductMapper.java
│   │   │       ├── entity/                      # 实体类
│   │   │       │   └── Product.java
│   │   │       ├── dto/                         # 数据传输对象
│   │   │       │   ├── ProductDTO.java
│   │   │       │   └── ProductQuery.java
│   │   │       ├── vo/                          # 视图对象
│   │   │       │   └── ProductVO.java
│   │   │       ├── constant/                    # 常量
│   │   │       │   └── ProductConstant.java
│   │   │       ├── enums/                       # 枚举
│   │   │       │   └── ProductStatus.java
│   │   │       ├── exception/                   # 异常
│   │   │       │   ├── BusinessException.java
│   │   │       │   └── GlobalExceptionHandler.java
│   │   │       ├── common/                      # 公共类
│   │   │       │   ├── Result.java
│   │   │       │   └── PageResult.java
│   │   │       └── utils/                       # 工具类
│   │   │           ├── BeanUtils.java
│   │   │           └── RedisUtils.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml                  # 配置文件
│   │       ├── application-dev.yml              # 开发环境
│   │       ├── application-prod.yml             # 生产环境
│   │       ├── mapper/                          # MyBatis映射
│   │       │   └── ProductMapper.xml
│   │       └── logback-spring.xml               # 日志配置
│   │
│   └── test/
│       └── java/
│           └── com/gec/shop/product/
│               ├── ProductApplicationTests.java
│               └── service/
│                   └── ProductServiceTest.java
│
└── pom.xml
```

## 分层架构规范

### 1. Controller层

**职责**：
- 接收HTTP请求
- 参数校验
- 调用Service
- 返回响应

**规范**：
```java
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {
    
    private final ProductService productService;
    
    /**
     * 分页查询商品列表
     */
    @GetMapping
    @Operation(summary = "商品列表", description = "分页查询商品列表")
    public Result<PageResult<ProductVO>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "10") Integer pageSize,
        ProductQuery query
    ) {
        PageResult<ProductVO> result = productService.pageProduct(pageNum, pageSize, query);
        return Result.success(result);
    }
    
    /**
     * 根据ID查询商品详情
     */
    @GetMapping("/{id}")
    @Operation(summary = "商品详情")
    public Result<ProductVO> getById(@PathVariable Long id) {
        ProductVO vo = productService.getProductById(id);
        return Result.success(vo);
    }
    
    /**
     * 新增商品
     */
    @PostMapping
    @Operation(summary = "新增商品")
    @SaCheckPermission("product:product:add")
    public Result<Void> add(@RequestBody @Valid ProductDTO dto) {
        productService.addProduct(dto);
        return Result.success();
    }
    
    /**
     * 修改商品
     */
    @PutMapping("/{id}")
    @Operation(summary = "修改商品")
    @SaCheckPermission("product:product:update")
    public Result<Void> update(
        @PathVariable Long id,
        @RequestBody @Valid ProductDTO dto
    ) {
        productService.updateProduct(id, dto);
        return Result.success();
    }
    
    /**
     * 删除商品
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除商品")
    @SaCheckPermission("product:product:delete")
    public Result<Void> delete(@PathVariable Long id) {
        productService.deleteProduct(id);
        return Result.success();
    }
}
```

**禁止**：
- ❌ 在Controller中写业务逻辑
- ❌ 在Controller中写SQL
- ❌ 在Controller中直接操作数据库
- ❌ 在Controller中进行事务管理

### 2. Service层

**职责**：
- 业务逻辑处理
- 事务管理
- 调用Mapper
- 数据转换

**接口定义**：
```java
public interface ProductService {
    
    /**
     * 分页查询商品
     */
    PageResult<ProductVO> pageProduct(Integer pageNum, Integer pageSize, ProductQuery query);
    
    /**
     * 根据ID查询商品
     */
    ProductVO getProductById(Long id);
    
    /**
     * 新增商品
     */
    void addProduct(ProductDTO dto);
    
    /**
     * 修改商品
     */
    void updateProduct(Long id, ProductDTO dto);
    
    /**
     * 删除商品
     */
    void deleteProduct(Long id);
    
    /**
     * 扣减库存
     */
    void deductStock(Long productId, Integer quantity);
}
```

**实现类**：
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductServiceImpl implements ProductService {
    
    private final ProductMapper productMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    
    @Override
    public PageResult<ProductVO> pageProduct(Integer pageNum, Integer pageSize, ProductQuery query) {
        Page<Product> page = new Page<>(pageNum, pageSize);
        
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.isNotBlank(query.getKeyword()), Product::getName, query.getKeyword())
               .eq(query.getCategoryId() != null, Product::getCategoryId, query.getCategoryId())
               .eq(query.getStatus() != null, Product::getStatus, query.getStatus())
               .eq(Product::getIsDeleted, 0)
               .orderByDesc(Product::getCreateTime);
        
        IPage<Product> result = productMapper.selectPage(page, wrapper);
        
        List<ProductVO> voList = result.getRecords().stream()
            .map(this::convertToVO)
            .collect(Collectors.toList());
        
        return new PageResult<>(voList, result.getTotal(), pageNum, pageSize);
    }
    
    @Override
    public ProductVO getProductById(Long id) {
        // 先从缓存获取
        String cacheKey = "product:" + id;
        ProductVO vo = (ProductVO) redisTemplate.opsForValue().get(cacheKey);
        if (vo != null) {
            return vo;
        }
        
        // 从数据库查询
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException("商品不存在");
        }
        
        vo = convertToVO(product);
        
        // 写入缓存
        redisTemplate.opsForValue().set(cacheKey, vo, 30, TimeUnit.MINUTES);
        
        return vo;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addProduct(ProductDTO dto) {
        // 校验商品名称是否重复
        Long count = productMapper.selectCount(
            new LambdaQueryWrapper<Product>()
                .eq(Product::getName, dto.getName())
                .eq(Product::getIsDeleted, 0)
        );
        if (count > 0) {
            throw new BusinessException("商品名称已存在");
        }
        
        // 转换并保存
        Product product = new Product();
        BeanUtils.copyProperties(dto, product);
        product.setCreateTime(LocalDateTime.now());
        product.setUpdateTime(LocalDateTime.now());
        
        productMapper.insert(product);
        
        log.info("新增商品成功，ID: {}", product.getId());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProduct(Long id, ProductDTO dto) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException("商品不存在");
        }
        
        BeanUtils.copyProperties(dto, product);
        product.setUpdateTime(LocalDateTime.now());
        
        productMapper.updateById(product);
        
        // 删除缓存
        String cacheKey = "product:" + id;
        redisTemplate.delete(cacheKey);
        
        log.info("修改商品成功，ID: {}", id);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteProduct(Long id) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException("商品不存在");
        }
        
        // 逻辑删除
        product.setIsDeleted(1);
        product.setUpdateTime(LocalDateTime.now());
        productMapper.updateById(product);
        
        // 删除缓存
        String cacheKey = "product:" + id;
        redisTemplate.delete(cacheKey);
        
        log.info("删除商品成功，ID: {}", id);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deductStock(Long productId, Integer quantity) {
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw new BusinessException("商品不存在");
        }
        
        if (product.getStock() < quantity) {
            throw new BusinessException("库存不足");
        }
        
        // 扣减库存（乐观锁）
        int rows = productMapper.deductStock(productId, quantity, product.getStock());
        if (rows == 0) {
            throw new BusinessException("库存扣减失败，请重试");
        }
        
        log.info("扣减库存成功，商品ID: {}, 数量: {}", productId, quantity);
    }
    
    /**
     * Entity转VO
     */
    private ProductVO convertToVO(Product product) {
        ProductVO vo = new ProductVO();
        BeanUtils.copyProperties(product, vo);
        return vo;
    }
}
```

**规范**：
- ✅ Service接口定义业务方法
- ✅ ServiceImpl实现具体业务逻辑
- ✅ 使用@Transactional管理事务
- ✅ 方法命名清晰，见名知意
- ✅ 添加必要的日志
- ✅ 异常使用BusinessException

**禁止**：
- ❌ 在Service中直接返回Entity
- ❌ 不处理异常直接抛出
- ❌ 在Service中写Controller逻辑

### 3. Mapper层

**职责**：
- 数据访问
- SQL执行

**接口定义**：
```java
@Mapper
public interface ProductMapper extends BaseMapper<Product> {
    
    /**
     * 扣减库存（乐观锁）
     */
    @Update("UPDATE t_product SET stock = stock - #{quantity} " +
            "WHERE id = #{productId} AND stock >= #{quantity} AND stock = #{oldStock}")
    int deductStock(@Param("productId") Long productId, 
                    @Param("quantity") Integer quantity,
                    @Param("oldStock") Integer oldStock);
    
    /**
     * 批量查询商品
     */
    List<Product> selectByIds(@Param("ids") List<Long> ids);
}
```

**XML映射**：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.gec.shop.product.mapper.ProductMapper">
    
    <select id="selectByIds" resultType="com.gec.shop.product.entity.Product">
        SELECT * FROM t_product
        WHERE id IN
        <foreach collection="ids" item="id" open="(" separator="," close=")">
            #{id}
        </foreach>
        AND is_deleted = 0
    </select>
    
</mapper>
```

**禁止**：
- ❌ 在Mapper中写业务逻辑
- ❌ 在Mapper中直接调用其他Mapper

## 实体类规范

### 1. Entity（数据库实体）

```java
@Data
@TableName("t_product")
public class Product implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;
    
    @TableField("category_id")
    private Long categoryId;
    
    @TableField("name")
    private String name;
    
    @TableField("price")
    private BigDecimal price;
    
    @TableField("stock")
    private Integer stock;
    
    @TableField("status")
    private Integer status;
    
    @TableField("is_deleted")
    private Integer isDeleted;
    
    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    
    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
```

### 2. DTO（数据传输对象）

```java
@Data
public class ProductDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    @NotNull(message = "分类ID不能为空")
    private Long categoryId;
    
    @NotBlank(message = "商品名称不能为空")
    @Size(min = 1, max = 200, message = "商品名称长度为1-200字符")
    private String name;
    
    @NotNull(message = "价格不能为空")
    @DecimalMin(value = "0.01", message = "价格必须大于0")
    private BigDecimal price;
    
    @NotNull(message = "库存不能为空")
    @Min(value = 0, message = "库存不能为负数")
    private Integer stock;
    
    @Size(max = 500, message = "副标题长度不能超过500字符")
    private String subtitle;
    
    private String description;
    
    private String mainImage;
}
```

### 3. VO（视图对象）

```java
@Data
public class ProductVO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private Long id;
    
    private Long categoryId;
    
    private String categoryName;
    
    private String name;
    
    private BigDecimal price;
    
    private Integer stock;
    
    private String subtitle;
    
    private String description;
    
    private String mainImage;
    
    private Integer status;
    
    private LocalDateTime createTime;
    
    private LocalDateTime updateTime;
}
```

### 4. Query（查询对象）

```java
@Data
public class ProductQuery implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private String keyword;
    
    private Long categoryId;
    
    private Integer status;
    
    private BigDecimal minPrice;
    
    private BigDecimal maxPrice;
}
```

## 配置类规范

### 1. MyBatis Plus配置

```java
@Configuration
public class MyBatisPlusConfig {
    
    /**
     * 分页插件
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
    
    /**
     * 自动填充
     */
    @Bean
    public MetaObjectHandler metaObjectHandler() {
        return new MetaObjectHandler() {
            @Override
            public void insertFill(MetaObject metaObject) {
                this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
                this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
            }
            
            @Override
            public void updateFill(MetaObject metaObject) {
                this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
            }
        };
    }
}
```

### 2. Redis配置

```java
@Configuration
public class RedisConfig {
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        
        // 使用Jackson序列化
        Jackson2JsonRedisSerializer<Object> serializer = new Jackson2JsonRedisSerializer<>(Object.class);
        ObjectMapper mapper = new ObjectMapper();
        mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        mapper.activateDefaultTyping(
            LaissezFaireSubTypeValidator.instance,
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        serializer.setObjectMapper(mapper);
        
        // 设置key和value的序列化
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(serializer);
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(serializer);
        
        template.afterPropertiesSet();
        return template;
    }
}
```

### 3. 全局异常处理

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    /**
     * 参数校验异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<?> handleValidException(MethodArgumentNotValidException e) {
        BindingResult bindingResult = e.getBindingResult();
        String message = bindingResult.getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        
        log.error("参数校验异常: {}", message);
        return Result.error(400, message);
    }
    
    /**
     * 业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        log.error("业务异常: {}", e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }
    
    /**
     * Sentinel限流异常
     */
    @ExceptionHandler(BlockException.class)
    public Result<?> handleBlockException(BlockException e) {
        log.error("限流异常: {}", e.getMessage());
        return Result.error(429, "访问过于频繁，请稍后再试");
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

## 日志规范

### 1. 日志级别

- **ERROR**：错误日志，必须记录
- **WARN**：警告日志，潜在问题
- **INFO**：业务日志，关键操作
- **DEBUG**：调试日志，开发使用

### 2. 日志格式

```java
@Slf4j
public class ProductServiceImpl {
    
    public void addProduct(ProductDTO dto) {
        log.info("开始新增商品，name: {}", dto.getName());
        
        try {
            // 业务逻辑
            productMapper.insert(product);
            
            log.info("新增商品成功，ID: {}", product.getId());
        } catch (Exception e) {
            log.error("新增商品失败，name: {}", dto.getName(), e);
            throw new BusinessException("新增商品失败");
        }
    }
}
```

### 3. logback配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    
    <property name="LOG_PATTERN" value="%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} - %msg%n"/>
    
    <!-- 控制台输出 -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>${LOG_PATTERN}</pattern>
        </encoder>
    </appender>
    
    <!-- 文件输出 -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>${LOG_PATTERN}</pattern>
        </encoder>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>
    
</configuration>
```

## 事务管理

### 1. 声明式事务

```java
@Service
public class OrderServiceImpl {
    
    @Transactional(rollbackFor = Exception.class)
    public void createOrder(OrderDTO dto) {
        // 1. 创建订单
        orderMapper.insert(order);
        
        // 2. 扣减库存
        productService.deductStock(dto.getProductId(), dto.getQuantity());
        
        // 3. 扣减余额
        userService.deductBalance(dto.getUserId(), dto.getAmount());
    }
}
```

### 2. 分布式事务（Seata）

```java
@Service
public class OrderServiceImpl {
    
    @GlobalTransactional(rollbackFor = Exception.class)
    public void createOrder(OrderDTO dto) {
        // 1. 创建订单（本地事务）
        orderMapper.insert(order);
        
        // 2. 扣减库存（远程调用）
        productFeignService.deductStock(dto.getProductId(), dto.getQuantity());
        
        // 3. 扣减余额（远程调用）
        userFeignService.deductBalance(dto.getUserId(), dto.getAmount());
    }
}
```

## 缓存使用

### 1. Spring Cache注解

```java
@Service
public class ProductServiceImpl {
    
    @Cacheable(value = "product", key = "#id")
    public ProductVO getProductById(Long id) {
        Product product = productMapper.selectById(id);
        return convertToVO(product);
    }
    
    @CachePut(value = "product", key = "#id")
    public ProductVO updateProduct(Long id, ProductDTO dto) {
        // 更新逻辑
        return convertToVO(product);
    }
    
    @CacheEvict(value = "product", key = "#id")
    public void deleteProduct(Long id) {
        // 删除逻辑
    }
}
```

### 2. RedisTemplate手动管理

```java
@Service
public class ProductServiceImpl {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    public ProductVO getProductById(Long id) {
        String cacheKey = "product:" + id;
        
        // 从缓存获取
        ProductVO vo = (ProductVO) redisTemplate.opsForValue().get(cacheKey);
        if (vo != null) {
            return vo;
        }
        
        // 从数据库查询
        Product product = productMapper.selectById(id);
        vo = convertToVO(product);
        
        // 写入缓存
        redisTemplate.opsForValue().set(cacheKey, vo, 30, TimeUnit.MINUTES);
        
        return vo;
    }
}
```

## 测试规范

### 1. 单元测试

```java
@SpringBootTest
class ProductServiceTest {
    
    @Autowired
    private ProductService productService;
    
    @Test
    void testAddProduct() {
        ProductDTO dto = new ProductDTO();
        dto.setName("测试商品");
        dto.setPrice(new BigDecimal("99.99"));
        dto.setStock(100);
        dto.setCategoryId(1L);
        
        assertDoesNotThrow(() -> productService.addProduct(dto));
    }
    
    @Test
    void testGetProductById() {
        ProductVO vo = productService.getProductById(1L);
        assertNotNull(vo);
        assertEquals("测试商品", vo.getName());
    }
}
```

### 2. Mock测试

```java
@SpringBootTest
class ProductServiceTest {
    
    @MockBean
    private ProductMapper productMapper;
    
    @Autowired
    private ProductService productService;
    
    @Test
    void testGetProductById() {
        Product product = new Product();
        product.setId(1L);
        product.setName("测试商品");
        
        when(productMapper.selectById(1L)).thenReturn(product);
        
        ProductVO vo = productService.getProductById(1L);
        assertNotNull(vo);
        assertEquals("测试商品", vo.getName());
    }
}
```

## 最佳实践

1. **分层清晰**：严格遵循Controller-Service-Mapper分层
2. **单一职责**：每个类、方法职责单一
3. **命名规范**：见名知意，统一风格
4. **异常处理**：统一异常处理机制
5. **事务管理**：合理使用事务，避免大事务
6. **日志记录**：关键操作记录日志
7. **参数校验**：使用Validation校验参数
8. **代码复用**：抽取公共代码
9. **性能优化**：合理使用缓存、异步
10. **安全防护**：防止SQL注入、XSS攻击

## 禁止事项

1. ❌ 禁止在Controller写业务逻辑
2. ❌ 禁止在Service直接返回Entity
3. ❌ 禁止使用SELECT *
4. ❌ 禁止大事务
5. ❌ 禁止循环调用数据库
6. ❌ 禁止不处理异常
7. ❌ 禁止硬编码配置
8. ❌ 禁止不写注释
9. ❌ 禁止不写单元测试
10. ❌ 禁止直接打印敏感信息

## 参考资料

- [Spring Boot官方文档](https://spring.io/projects/spring-boot)
- [MyBatis Plus官方文档](https://baomidou.com/)
- [阿里巴巴Java开发手册](https://github.com/alibaba/p3c)
