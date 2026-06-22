# 商品图片解决方案

## 一、当前问题

数据库中商品的 `image_url` 字段已有路径，但实际图片文件不存在：

```sql
-- 当前数据库中的图片路径
/images/products/ashi_mashi.jpg
/images/products/chee_ketchup.jpg
/images/products/cheetoz_chili.jpg
...
```

## 二、解决方案

### 方案 A：使用占位图服务（推荐，快速实现）

使用在线图片占位服务，无需下载实际图片文件。

#### 1. 更新数据库图片路径

```sql
USE `shop-product`;

-- 更新商品图片为占位图服务
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Ashi+Mashi' WHERE `id` = 1;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=Chee+Ketchup' WHERE `id` = 2;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/45B7D1/FFFFFF?text=Chee+Vinegar' WHERE `id` = 3;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/F38181/FFFFFF?text=Cheetoz+Chili' WHERE `id` = 4;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FDCB9E/000000?text=Cheetoz+Ketchup' WHERE `id` = 5;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/A8E6CF/000000?text=Cheetoz+Onion' WHERE `id` = 6;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FFD3B6/000000?text=Cheetoz+Salty' WHERE `id` = 7;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FFAAA5/FFFFFF?text=Cheetoz+30g' WHERE `id` = 8;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FF8B94/FFFFFF?text=Cheetoz+90g' WHERE `id` = 9;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/A8D8EA/000000?text=Cheetoz+Vinegar' WHERE `id` = 10;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/AA96DA/FFFFFF?text=Cheetoz+Wheel' WHERE `id` = 11;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FCBAD3/000000?text=Maz+Ketchup' WHERE `id` = 12;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FFFFD2/000000?text=Maz+Sticks' WHERE `id` = 13;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/A8DADC/000000?text=Maz+Salty' WHERE `id` = 14;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/457B9D/FFFFFF?text=Maz+Vinegar' WHERE `id` = 15;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/F1FAEE/000000?text=Mini+Lina' WHERE `id` = 16;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/E63946/FFFFFF?text=Minoo+Biscuit' WHERE `id` = 17;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/F4A261/000000?text=Naderi+Cookie' WHERE `id` = 18;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/2A9D8F/FFFFFF?text=Naderi+Wafer' WHERE `id` = 19;
```

#### 2. 其他占位图服务

- **Placeholder.com**: `https://via.placeholder.com/400x400`
- **Unsplash Source**: `https://source.unsplash.com/400x400/?snack,chips`
- **Picsum**: `https://picsum.photos/400/400`
- **DummyImage**: `https://dummyimage.com/400x400/09f/fff.png`

### 方案 B：使用本地静态图片

#### 1. 创建图片目录结构

```
shop-product-server/
└── src/main/resources/
    └── static/
        └── images/
            └── products/
                ├── ashi_mashi.jpg
                ├── chee_ketchup.jpg
                ├── cheetoz_chili.jpg
                └── ...
```

#### 2. 配置静态资源映射

在 `shop-product-server` 的 `application.yml` 中配置：

```yaml
spring:
  web:
    resources:
      static-locations: classpath:/static/
  mvc:
    static-path-pattern: /images/**
```

#### 3. 下载或生成商品图片

**选项 1：使用 AI 生成图片**
- 使用 DALL-E、Midjourney 或 Stable Diffusion
- 提示词示例：`"snack package of Cheetoz chips, product photography, white background"`

**选项 2：下载免费素材**
- [Unsplash](https://unsplash.com/s/photos/snack)
- [Pexels](https://www.pexels.com/search/chips/)
- [Pixabay](https://pixabay.com/images/search/snack/)

**选项 3：使用图标库**
- [Font Awesome](https://fontawesome.com/)
- [Material Icons](https://fonts.google.com/icons)

### 方案 C：通过 Gateway 代理图片服务（推荐生产环境）

#### 1. 独立部署图片服务器

```
独立图片服务器（Nginx / OSS）
    ↓
Gateway 代理
    ↓
前端访问: http://localhost:8080/images/products/xxx.jpg
```

#### 2. Gateway 配置图片路由

在 `shop-gateway-server` 的 `application.yml` 添加：

```yaml
spring:
  cloud:
    gateway:
      routes:
        # 图片服务路由
        - id: image-service
          uri: http://localhost:9000  # 图片服务器地址
          predicates:
            - Path=/images/**
          filters:
            - StripPrefix=0
```

## 三、推荐实施步骤

### 阶段 1：快速启动（使用占位图）

**执行以下 SQL 脚本**：

```sql
-- 使用 Unsplash 真实零食图片
USE `shop-product`;

UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,ashi' WHERE `id` = 1;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,ketchup' WHERE `id` = 2;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,vinegar' WHERE `id` = 3;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,chili' WHERE `id` = 4;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,tomato' WHERE `id` = 5;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,onion' WHERE `id` = 6;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,salty' WHERE `id` = 7;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,small' WHERE `id` = 8;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,large' WHERE `id` = 9;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,vinegar,2' WHERE `id` = 10;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,wheel' WHERE `id` = 11;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,ketchup,2' WHERE `id` = 12;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?potato,sticks' WHERE `id` = 13;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,salty,2' WHERE `id` = 14;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,vinegar,3' WHERE `id` = 15;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?biscuit,mini' WHERE `id` = 16;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?biscuit,cream' WHERE `id` = 17;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?cookie,mini' WHERE `id` = 18;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?wafer,mini' WHERE `id` = 19;
```

### 阶段 2：替换为真实商品图片

1. **收集实际商品图片**
2. **上传到图片服务器**
3. **更新数据库路径**

```sql
UPDATE `t_product` SET `image_url` = 'http://your-image-server.com/products/ashi_mashi.jpg' WHERE `id` = 1;
-- ...
```

## 四、前端处理图片

### 1. 图片加载失败兜底

```vue
<template>
  <el-image
    :src="product.imageUrl"
    fit="cover"
    @error="handleImageError"
  >
    <template #error>
      <div class="image-slot">
        <el-icon><Picture /></el-icon>
        <span>暂无图片</span>
      </div>
    </template>
  </el-image>
</template>

<script setup lang="ts">
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  // 使用默认占位图
  img.src = 'https://via.placeholder.com/400x400/CCCCCC/FFFFFF?text=No+Image';
};
</script>
```

### 2. 图片懒加载

```vue
<el-image
  :src="product.imageUrl"
  lazy
  :scroll-container="scrollContainer"
/>
```

### 3. 图片优化

```typescript
// 根据设备 DPR 选择合适尺寸
const getOptimizedImageUrl = (url: string, width: number = 400) => {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.ceil(width * dpr);
  
  // 如果使用占位图服务，动态调整尺寸
  if (url.includes('placeholder.com')) {
    return url.replace(/\d+x\d+/, `${size}x${size}`);
  }
  
  return url;
};
```

## 五、图片命名规范

### 文件命名

```
{brand}_{flavor}_{size}.{ext}

示例：
- ashi_mashi_classic.jpg
- cheetoz_chili_regular.jpg
- maz_ketchup_large.jpg
```

### URL 命名

```
/images/products/{category}/{product-id}.jpg

示例：
- /images/products/snacks/1.jpg
- /images/products/chips/4.jpg
- /images/products/biscuits/16.jpg
```

## 六、图片规格要求

| 场景 | 尺寸 | 格式 | 大小 |
|-----|------|------|------|
| 商品列表缩略图 | 200x200 | WebP/JPG | < 50KB |
| 商品详情主图 | 800x800 | WebP/JPG | < 200KB |
| 商品轮播图 | 1200x800 | WebP/JPG | < 300KB |
| 移动端缩略图 | 150x150 | WebP/JPG | < 30KB |

## 七、OSS 对象存储方案（生产推荐）

### 阿里云 OSS

```yaml
# application.yml
aliyun:
  oss:
    endpoint: oss-cn-hangzhou.aliyuncs.com
    bucket-name: your-bucket
    access-key-id: ${ALIYUN_ACCESS_KEY}
    access-key-secret: ${ALIYUN_ACCESS_SECRET}
    base-url: https://your-bucket.oss-cn-hangzhou.aliyuncs.com
```

### 图片上传工具类

```java
@Service
public class OssService {
    
    @Value("${aliyun.oss.bucket-name}")
    private String bucketName;
    
    @Value("${aliyun.oss.base-url}")
    private String baseUrl;
    
    private OSS ossClient;
    
    public String uploadProductImage(MultipartFile file, Long productId) throws IOException {
        String fileName = "products/" + productId + "_" + System.currentTimeMillis() + ".jpg";
        ossClient.putObject(bucketName, fileName, file.getInputStream());
        return baseUrl + "/" + fileName;
    }
}
```

## 八、执行清单

- [ ] **立即执行**：运行阶段 1 的 SQL 脚本，使用 Unsplash 占位图
- [ ] **前端开发**：实现图片加载失败兜底逻辑
- [ ] **后续优化**：收集实际商品图片并替换
- [ ] **生产部署**：配置 OSS 或独立图片服务器

---

**推荐方案**：先使用方案 A（Unsplash 占位图）快速启动前端开发，后续再替换为真实商品图片。

**文档生成时间**: 2026-06-22
