# 代码生成器文档

## 概述

代码生成器用于快速生成标准化的CRUD代码，包括：

- **后端代码**：Entity、Mapper、Service、Controller、DTO、VO
- **前端代码**：API、View、Component
- **数据库脚本**：建表SQL

**目标**：
- 提高开发效率
- 统一代码风格
- 减少重复劳动
- 降低出错率

## 生成器架构

```
配置文件 (generator-config.yml)
         ↓
    生成器引擎
         ↓
  ┌──────┴──────┐
  ↓             ↓
模板文件      数据模型
  ↓             ↓
  └──────┬──────┘
         ↓
    生成代码文件
```

## 配置文件

### generator-config.yml

```yaml
# 数据源配置
datasource:
  url: jdbc:mysql://localhost:3306/shop-product?useUnicode=true&characterEncoding=utf-8&useSSL=false
  username: root
  password: 1234
  driver-class-name: com.mysql.cj.jdbc.Driver

# 全局配置
global:
  # 作者
  author: AI Assistant
  # 项目包路径
  base-package: com.gec.shop
  # 模块名
  module-name: product
  # 表前缀（生成时会去掉）
  table-prefix: t_
  # 是否覆盖已存在文件
  file-override: false

# 后端生成配置
backend:
  # 输出目录
  output-dir: ./src/main/java
  # 包路径
  package:
    entity: ${global.base-package}.${global.module-name}.entity
    mapper: ${global.base-package}.${global.module-name}.mapper
    service: ${global.base-package}.${global.module-name}.service
    service-impl: ${global.base-package}.${global.module-name}.service.impl
    controller: ${global.base-package}.${global.module-name}.controller
    dto: ${global.base-package}.${global.module-name}.dto
    vo: ${global.base-package}.${global.module-name}.vo
  
  # 模板配置
  templates:
    entity: /templates/backend/entity.java.ftl
    mapper: /templates/backend/mapper.java.ftl
    mapper-xml: /templates/backend/mapper.xml.ftl
    service: /templates/backend/service.java.ftl
    service-impl: /templates/backend/serviceImpl.java.ftl
    controller: /templates/backend/controller.java.ftl
    dto: /templates/backend/dto.java.ftl
    vo: /templates/backend/vo.java.ftl

# 前端生成配置
frontend:
  # 输出目录
  output-dir: ./src/views
  # 模板配置
  templates:
    api: /templates/frontend/api.ts.ftl
    index: /templates/frontend/index.vue.ftl
    form: /templates/frontend/form.vue.ftl
    types: /templates/frontend/types.ts.ftl

# 表配置
tables:
  # 要生成的表名列表
  include:
    - t_product
    - t_product_category
    - t_order
    - t_order_item
  # 排除的表名列表
  exclude:
    - t_sys_log
```

## 代码生成器实现

### 1. 生成器主类

```java
@Component
public class CodeGenerator {
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private GeneratorConfig config;
    
    /**
     * 生成代码
     */
    public void generate(String tableName) throws Exception {
        // 1. 获取表信息
        TableInfo tableInfo = getTableInfo(tableName);
        
        // 2. 构建数据模型
        Map<String, Object> dataModel = buildDataModel(tableInfo);
        
        // 3. 生成后端代码
        generateBackend(dataModel);
        
        // 4. 生成前端代码
        generateFrontend(dataModel);
        
        System.out.println("代码生成完成: " + tableName);
    }
    
    /**
     * 获取表信息
     */
    private TableInfo getTableInfo(String tableName) throws SQLException {
        Connection conn = dataSource.getConnection();
        DatabaseMetaData metaData = conn.getMetaData();
        
        TableInfo tableInfo = new TableInfo();
        tableInfo.setTableName(tableName);
        
        // 获取表注释
        ResultSet tables = metaData.getTables(null, null, tableName, new String[]{"TABLE"});
        if (tables.next()) {
            tableInfo.setTableComment(tables.getString("REMARKS"));
        }
        
        // 获取列信息
        ResultSet columns = metaData.getColumns(null, null, tableName, null);
        List<ColumnInfo> columnList = new ArrayList<>();
        
        while (columns.next()) {
            ColumnInfo column = new ColumnInfo();
            column.setColumnName(columns.getString("COLUMN_NAME"));
            column.setDataType(columns.getString("TYPE_NAME"));
            column.setColumnComment(columns.getString("REMARKS"));
            column.setNullable("YES".equals(columns.getString("IS_NULLABLE")));
            column.setColumnSize(columns.getInt("COLUMN_SIZE"));
            
            // 转换Java类型
            column.setJavaType(convertToJavaType(column.getDataType()));
            column.setJavaField(toCamelCase(column.getColumnName()));
            
            columnList.add(column);
        }
        
        tableInfo.setColumns(columnList);
        
        columns.close();
        tables.close();
        conn.close();
        
        return tableInfo;
    }
    
    /**
     * 构建数据模型
     */
    private Map<String, Object> buildDataModel(TableInfo tableInfo) {
        Map<String, Object> model = new HashMap<>();
        
        // 基础信息
        model.put("author", config.getGlobal().getAuthor());
        model.put("date", LocalDate.now().toString());
        model.put("tableName", tableInfo.getTableName());
        model.put("tableComment", tableInfo.getTableComment());
        
        // 类名（去掉表前缀，转驼峰）
        String className = removePrefix(tableInfo.getTableName(), config.getGlobal().getTablePrefix());
        className = toPascalCase(className);
        model.put("className", className);
        model.put("classNameLower", StringUtils.uncapitalize(className));
        
        // 包路径
        model.put("basePackage", config.getGlobal().getBasePackage());
        model.put("moduleName", config.getGlobal().getModuleName());
        model.put("packageEntity", config.getBackend().getPackagePath().get("entity"));
        model.put("packageMapper", config.getBackend().getPackagePath().get("mapper"));
        model.put("packageService", config.getBackend().getPackagePath().get("service"));
        model.put("packageServiceImpl", config.getBackend().getPackagePath().get("service-impl"));
        model.put("packageController", config.getBackend().getPackagePath().get("controller"));
        model.put("packageDto", config.getBackend().getPackagePath().get("dto"));
        model.put("packageVo", config.getBackend().getPackagePath().get("vo"));
        
        // 列信息
        model.put("columns", tableInfo.getColumns());
        
        // 主键
        ColumnInfo pkColumn = tableInfo.getColumns().stream()
            .filter(c -> "id".equalsIgnoreCase(c.getColumnName()))
            .findFirst()
            .orElse(tableInfo.getColumns().get(0));
        model.put("pkColumn", pkColumn);
        
        // 导入的类
        Set<String> imports = new HashSet<>();
        for (ColumnInfo column : tableInfo.getColumns()) {
            String javaType = column.getJavaType();
            if (javaType.contains(".")) {
                imports.add(javaType);
            }
        }
        model.put("imports", imports);
        
        return model;
    }
    
    /**
     * 生成后端代码
     */
    private void generateBackend(Map<String, Object> dataModel) throws Exception {
        Configuration cfg = new Configuration(Configuration.VERSION_2_3_31);
        cfg.setClassForTemplateLoading(this.getClass(), "/");
        
        String outputDir = config.getBackend().getOutputDir();
        
        // Entity
        generateFile(cfg, "templates/backend/entity.java.ftl", 
            outputDir + "/" + getPackagePath(dataModel.get("packageEntity").toString()),
            dataModel.get("className") + ".java", dataModel);
        
        // Mapper
        generateFile(cfg, "templates/backend/mapper.java.ftl",
            outputDir + "/" + getPackagePath(dataModel.get("packageMapper").toString()),
            dataModel.get("className") + "Mapper.java", dataModel);
        
        // Mapper XML
        generateFile(cfg, "templates/backend/mapper.xml.ftl",
            "./src/main/resources/mapper/" + dataModel.get("moduleName"),
            dataModel.get("className") + "Mapper.xml", dataModel);
        
        // Service
        generateFile(cfg, "templates/backend/service.java.ftl",
            outputDir + "/" + getPackagePath(dataModel.get("packageService").toString()),
            dataModel.get("className") + "Service.java", dataModel);
        
        // ServiceImpl
        generateFile(cfg, "templates/backend/serviceImpl.java.ftl",
            outputDir + "/" + getPackagePath(dataModel.get("packageServiceImpl").toString()),
            dataModel.get("className") + "ServiceImpl.java", dataModel);
        
        // Controller
        generateFile(cfg, "templates/backend/controller.java.ftl",
            outputDir + "/" + getPackagePath(dataModel.get("packageController").toString()),
            dataModel.get("className") + "Controller.java", dataModel);
        
        // DTO
        generateFile(cfg, "templates/backend/dto.java.ftl",
            outputDir + "/" + getPackagePath(dataModel.get("packageDto").toString()),
            dataModel.get("className") + "DTO.java", dataModel);
        
        // VO
        generateFile(cfg, "templates/backend/vo.java.ftl",
            outputDir + "/" + getPackagePath(dataModel.get("packageVo").toString()),
            dataModel.get("className") + "VO.java", dataModel);
    }
    
    /**
     * 生成前端代码
     */
    private void generateFrontend(Map<String, Object> dataModel) throws Exception {
        Configuration cfg = new Configuration(Configuration.VERSION_2_3_31);
        cfg.setClassForTemplateLoading(this.getClass(), "/");
        
        String moduleName = dataModel.get("moduleName").toString();
        String classNameLower = dataModel.get("classNameLower").toString();
        String outputDir = config.getFrontend().getOutputDir() + "/" + moduleName + "/" + classNameLower;
        
        // API
        generateFile(cfg, "templates/frontend/api.ts.ftl",
            "./src/api/" + moduleName,
            classNameLower + ".ts", dataModel);
        
        // Types
        generateFile(cfg, "templates/frontend/types.ts.ftl",
            "./src/api/" + moduleName + "/types",
            classNameLower + ".ts", dataModel);
        
        // Index View
        generateFile(cfg, "templates/frontend/index.vue.ftl",
            outputDir,
            "index.vue", dataModel);
        
        // Form Component
        generateFile(cfg, "templates/frontend/form.vue.ftl",
            outputDir + "/components",
            "Form.vue", dataModel);
    }
    
    /**
     * 生成文件
     */
    private void generateFile(Configuration cfg, String templateName, 
                             String outputDir, String fileName, 
                             Map<String, Object> dataModel) throws Exception {
        // 创建输出目录
        File dir = new File(outputDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        
        // 检查文件是否存在
        File file = new File(dir, fileName);
        if (file.exists() && !config.getGlobal().isFileOverride()) {
            System.out.println("文件已存在，跳过: " + file.getAbsolutePath());
            return;
        }
        
        // 生成文件
        Template template = cfg.getTemplate(templateName);
        try (Writer out = new FileWriter(file)) {
            template.process(dataModel, out);
            System.out.println("生成文件: " + file.getAbsolutePath());
        }
    }
    
    /**
     * 转换为Java类型
     */
    private String convertToJavaType(String dbType) {
        dbType = dbType.toUpperCase();
        switch (dbType) {
            case "BIGINT":
                return "Long";
            case "INT":
            case "INTEGER":
            case "TINYINT":
            case "SMALLINT":
                return "Integer";
            case "DECIMAL":
            case "NUMERIC":
                return "java.math.BigDecimal";
            case "DOUBLE":
                return "Double";
            case "FLOAT":
                return "Float";
            case "DATE":
                return "java.time.LocalDate";
            case "DATETIME":
            case "TIMESTAMP":
                return "java.time.LocalDateTime";
            case "TIME":
                return "java.time.LocalTime";
            case "CHAR":
            case "VARCHAR":
            case "TEXT":
            case "LONGTEXT":
                return "String";
            default:
                return "String";
        }
    }
    
    /**
     * 下划线转驼峰
     */
    private String toCamelCase(String str) {
        StringBuilder result = new StringBuilder();
        boolean upperNext = false;
        
        for (char c : str.toCharArray()) {
            if (c == '_') {
                upperNext = true;
            } else {
                if (upperNext) {
                    result.append(Character.toUpperCase(c));
                    upperNext = false;
                } else {
                    result.append(Character.toLowerCase(c));
                }
            }
        }
        
        return result.toString();
    }
    
    /**
     * 下划线转帕斯卡（首字母大写驼峰）
     */
    private String toPascalCase(String str) {
        String camelCase = toCamelCase(str);
        return Character.toUpperCase(camelCase.charAt(0)) + camelCase.substring(1);
    }
    
    /**
     * 去掉前缀
     */
    private String removePrefix(String str, String prefix) {
        if (str.startsWith(prefix)) {
            return str.substring(prefix.length());
        }
        return str;
    }
    
    /**
     * 包路径转文件路径
     */
    private String getPackagePath(String packageName) {
        return packageName.replace(".", "/");
    }
}
```

### 2. 数据模型

```java
@Data
public class TableInfo {
    private String tableName;
    private String tableComment;
    private List<ColumnInfo> columns;
}

@Data
public class ColumnInfo {
    private String columnName;
    private String dataType;
    private String javaType;
    private String javaField;
    private String columnComment;
    private boolean nullable;
    private int columnSize;
}
```

## 模板文件

### Entity模板

```java
// templates/backend/entity.java.ftl
package ${packageEntity};

<#list imports as import>
import ${import};
</#list>
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;

/**
 * ${tableComment}
 * 
 * @author ${author}
 * @date ${date}
 */
@Data
@TableName("${tableName}")
public class ${className} implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
<#list columns as column>
    /**
     * ${column.columnComment}
     */
    <#if column.columnName == "id">
    @TableId(value = "id", type = IdType.AUTO)
    <#else>
    @TableField("${column.columnName}")
    </#if>
    private ${column.javaType} ${column.javaField};
    
</#list>
}
```

### Mapper模板

```java
// templates/backend/mapper.java.ftl
package ${packageMapper};

import ${packageEntity}.${className};
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * ${tableComment} Mapper
 * 
 * @author ${author}
 * @date ${date}
 */
@Mapper
public interface ${className}Mapper extends BaseMapper<${className}> {
    
}
```

### Service模板

```java
// templates/backend/service.java.ftl
package ${packageService};

import ${packageEntity}.${className};
import ${packageDto}.${className}DTO;
import ${packageVo}.${className}VO;
import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.core.metadata.IPage;

/**
 * ${tableComment} Service
 * 
 * @author ${author}
 * @date ${date}
 */
public interface ${className}Service extends IService<${className}> {
    
    /**
     * 分页查询
     */
    IPage<${className}VO> page${className}(Integer pageNum, Integer pageSize, ${className}DTO dto);
    
    /**
     * 根据ID查询
     */
    ${className}VO getById(${pkColumn.javaType} id);
    
    /**
     * 新增
     */
    boolean add(${className}DTO dto);
    
    /**
     * 修改
     */
    boolean updateById(${pkColumn.javaType} id, ${className}DTO dto);
    
    /**
     * 删除
     */
    boolean deleteById(${pkColumn.javaType} id);
}
```

### Controller模板

```java
// templates/backend/controller.java.ftl
package ${packageController};

import ${packageService}.${className}Service;
import ${packageDto}.${className}DTO;
import ${packageVo}.${className}VO;
import com.gec.common.core.result.Result;
import com.gec.common.core.result.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import javax.validation.Valid;

/**
 * ${tableComment} Controller
 * 
 * @author ${author}
 * @date ${date}
 */
@RestController
@RequestMapping("/api/v1/${moduleName}/${classNameLower}")
@RequiredArgsConstructor
public class ${className}Controller {
    
    private final ${className}Service ${classNameLower}Service;
    
    /**
     * 分页查询
     */
    @GetMapping
    public Result<PageResult<${className}VO>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "10") Integer pageSize,
        ${className}DTO dto
    ) {
        IPage<${className}VO> page = ${classNameLower}Service.page${className}(pageNum, pageSize, dto);
        PageResult<${className}VO> pageResult = PageResult.of(page);
        return Result.success(pageResult);
    }
    
    /**
     * 根据ID查询
     */
    @GetMapping("/{id}")
    public Result<${className}VO> getById(@PathVariable ${pkColumn.javaType} id) {
        ${className}VO vo = ${classNameLower}Service.getById(id);
        return Result.success(vo);
    }
    
    /**
     * 新增
     */
    @PostMapping
    public Result<Void> add(@RequestBody @Valid ${className}DTO dto) {
        ${classNameLower}Service.add(dto);
        return Result.success();
    }
    
    /**
     * 修改
     */
    @PutMapping("/{id}")
    public Result<Void> update(
        @PathVariable ${pkColumn.javaType} id,
        @RequestBody @Valid ${className}DTO dto
    ) {
        ${classNameLower}Service.updateById(id, dto);
        return Result.success();
    }
    
    /**
     * 删除
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable ${pkColumn.javaType} id) {
        ${classNameLower}Service.deleteById(id);
        return Result.success();
    }
}
```

## 使用方式

### 1. Maven插件方式

```xml
<plugin>
    <groupId>com.gec</groupId>
    <artifactId>code-generator-maven-plugin</artifactId>
    <version>1.0.0</version>
    <configuration>
        <configFile>generator-config.yml</configFile>
    </configuration>
</plugin>
```

执行命令：
```bash
mvn code-generator:generate -Dtable=t_product
```

### 2. 独立应用方式

```java
public class GeneratorApplication {
    
    public static void main(String[] args) {
        // 加载配置
        GeneratorConfig config = loadConfig("generator-config.yml");
        
        // 创建生成器
        CodeGenerator generator = new CodeGenerator(config);
        
        // 生成代码
        List<String> tables = config.getTables().getInclude();
        for (String table : tables) {
            try {
                generator.generate(table);
            } catch (Exception e) {
                System.err.println("生成失败: " + table);
                e.printStackTrace();
            }
        }
    }
}
```

### 3. Web界面方式

提供Web界面，可视化配置和生成：

- 连接数据库
- 选择表
- 配置生成选项
- 预览代码
- 下载代码压缩包

## 最佳实践

1. **模板定制**：根据项目需求定制模板
2. **配置复用**：将通用配置抽取为公共配置
3. **代码审查**：生成后进行代码审查
4. **增量生成**：支持增量更新，不覆盖手动修改
5. **版本控制**：生成器版本与模板版本对应

## 注意事项

1. 生成的代码仅为基础框架，需要根据业务调整
2. 复杂业务逻辑不适合代码生成
3. 生成前备份现有代码
4. 检查生成的代码是否符合规范
5. 及时更新模板以适应新需求

## 扩展功能

### 1. 支持多数据源

```yaml
datasources:
  - name: product
    url: jdbc:mysql://localhost:3306/shop-product
    username: root
    password: 1234
  
  - name: order
    url: jdbc:mysql://localhost:3306/shop-order
    username: root
    password: 1234
```

### 2. 支持代码合并

对于已存在的文件，智能合并而非覆盖：

- 保留手动添加的方法
- 更新生成的方法
- 标记冲突代码

### 3. 支持自定义字段映射

```yaml
type-mapping:
  tinyint: Boolean
  json: String
```

### 4. 支持代码美化

集成代码格式化工具，生成后自动格式化。

## 参考资料

- [MyBatis-Plus代码生成器](https://baomidou.com/pages/779a6e/)
- [FreeMarker官方文档](https://freemarker.apache.org/)
