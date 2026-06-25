package com.gec.shop.product.service.impl;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.gec.shop.product.feign.DinRecommendFeignClient;
import com.gec.shop.product.feign.RecognitionFeignClient;
import com.gec.shop.product.feign.dto.DetectionDto;
import com.gec.shop.product.feign.dto.DinTopKResponseDto;
import com.gec.shop.product.feign.dto.RecommendationItemDto;
import com.gec.shop.product.feign.dto.RecognitionResultDto;
import com.gec.shop.product.mapper.ProductCategoryMapper;
import com.gec.shop.product.mapper.ProductMapper;
import com.gec.shop.product.mapper.RecognitionLogMapper;
import com.gec.shop.product.pojo.Product;
import com.gec.shop.product.pojo.ProductCategory;
import com.gec.shop.product.pojo.RecognitionLog;
import com.gec.shop.product.service.ProductService;
import com.gec.shop.product.vo.DinRecommendResponseVo;
import com.gec.shop.product.vo.RecognitionResponseVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 商品服务实现类
 */
@Slf4j
@Service
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> implements ProductService {

    @Autowired
    private RecognitionFeignClient recognitionFeignClient;

    @Autowired
    private DinRecommendFeignClient dinRecommendFeignClient;

    @Autowired
    private ProductCategoryMapper productCategoryMapper;

    @Autowired
    private RecognitionLogMapper recognitionLogMapper;

    @Override
    public RecognitionResponseVo recognize(MultipartFile file, Long uid) {
        String requestId = UUID.randomUUID().toString().replace("-", "");
        long startTime = System.currentTimeMillis();
        RecognitionResponseVo response = new RecognitionResponseVo();
        response.setRequestId(requestId);

        RecognitionResultDto recognitionResult = callRecognitionService(file, requestId);
        int processingTimeMs = (int) (System.currentTimeMillis() - startTime);

        if (isRecognitionFailed(recognitionResult)) {
            return handleRecognitionFailure(response, recognitionResult, uid, requestId, processingTimeMs);
        }

        populateSuccessResponse(response, recognitionResult);

        List<DetectionDto> detections = recognitionResult.getDetections();
        if (CollectionUtils.isEmpty(detections)) {
            response.setMessage("未识别到商品");
            saveRecognitionLog(uid, requestId, null, null, null, null, recognitionResult,
                    0, processingTimeMs, null);
            return response;
        }

        return resolveMultiCategoryRecommendation(response, recognitionResult, detections,
                uid, requestId, processingTimeMs);
    }

    /**
     * 调用识别服务，异常时构造降级结果
     */
    private RecognitionResultDto callRecognitionService(MultipartFile file, String requestId) {
        try {
            return recognitionFeignClient.recognizeImage(file);
        } catch (Exception e) {
            log.error("识别服务调用异常, requestId={}", requestId, e);
            RecognitionResultDto fallback = new RecognitionResultDto();
            fallback.setStatus("error");
            fallback.setMessage("识别服务调用失败: " + e.getMessage());
            return fallback;
        }
    }

    /**
     * 判断识别是否失败或降级（无有效检测结果）
     */
    private boolean isRecognitionFailed(RecognitionResultDto recognitionResult) {
        boolean hasDetections = recognitionResult != null
                && !CollectionUtils.isEmpty(recognitionResult.getDetections());
        boolean isFailed = recognitionResult == null
                || "error".equals(recognitionResult.getStatus())
                || "fallback".equals(recognitionResult.getStatus());
        return isFailed || !hasDetections;
    }

    /**
     * 处理识别失败/降级情况，组装降级响应并保存日志
     */
    private RecognitionResponseVo handleRecognitionFailure(RecognitionResponseVo response,
                                                            RecognitionResultDto recognitionResult,
                                                            Long uid, String requestId, int processingTimeMs) {
        String message = recognitionResult == null ? "识别服务无响应" : recognitionResult.getMessage();
        response.setStatus("fallback");
        response.setMessage(message);
        saveRecognitionLog(uid, requestId, null, null, null, null, recognitionResult,
                0, processingTimeMs, message);
        return response;
    }

    /**
     * 填充成功识别响应的基础字段
     */
    private void populateSuccessResponse(RecognitionResponseVo response,
                                          RecognitionResultDto recognitionResult) {
        response.setStatus("success");
        response.setMessage("识别成功");
        response.setDetections(recognitionResult.getDetections());
        response.setDetectedCount(recognitionResult.getDetectedCount() == null
                ? recognitionResult.getDetections().size()
                : recognitionResult.getDetectedCount());
        response.setImageDimensions(recognitionResult.getImageDimensions());
    }

    /**
     * 基于多检测结果 + DIN（Deep Interest Network）风格推荐的统一入口
     * <p>
     * DIN 核心思想：
     * 1. 用户兴趣嵌入：从用户历史识别记录中提取类别偏好向量
     * 2. 注意力机制：用检测置信度作为注意力权重，加权候选商品得分
     * 3. 兴趣激活：对当前检测到的多个类别分别计算激活分数
     */
    private RecognitionResponseVo resolveMultiCategoryRecommendation(RecognitionResponseVo response,
                                                                    RecognitionResultDto recognitionResult,
                                                                    List<DetectionDto> detections,
                                                                    Long uid, String requestId, int processingTimeMs) {
        // Step 1: 将检测结果按置信度降序，映射到商品类别
        List<DetectionDto> sortedDetections = detections.stream()
                .filter(d -> d.getConfidence() != null && d.getConfidence() > 0.3f)
                .sorted((d1, d2) -> Double.compare(d2.getConfidence(), d1.getConfidence()))
                .collect(Collectors.toList());

        if (CollectionUtils.isEmpty(sortedDetections)) {
            DetectionDto fallback = detections.get(0);
            return resolveSingleDetection(response, recognitionResult, fallback, uid, requestId, processingTimeMs);
        }

        // Step 2: 为每个检测到的目标查找对应的商品类别
        Map<Long, CategoryInterest> categoryInterestMap = new LinkedHashMap<>();
        for (DetectionDto detection : sortedDetections) {
            ProductCategory category = productCategoryMapper.findByYoloClassId(detection.getProductClassId());
            if (category == null || categoryInterestMap.containsKey(category.getId())) {
                continue;
            }
            double attentionWeight = normalizeConfidence(detection.getConfidence());
            categoryInterestMap.put(category.getId(), new CategoryInterest(
                    category.getId(), category.getDisplayName(), attentionWeight));
        }

        if (categoryInterestMap.isEmpty()) {
            DetectionDto fallback = sortedDetections.get(0);
            return resolveSingleDetection(response, recognitionResult, fallback, uid, requestId, processingTimeMs);
        }

        // Step 3: 获取用户历史兴趣嵌入（DIN user interest）
        Map<Long, Double> userInterestEmbedding = buildUserInterestEmbedding(uid);

        // Step 4: 收集所有相关类别的候选商品
        Set<Long> categoryIds = categoryInterestMap.keySet();
        List<Product> allCandidates = new ArrayList<>();
        for (Long categoryId : categoryIds) {
            List<Product> categoryProducts = recommendByCategory(categoryId, 5);
            allCandidates.addAll(categoryProducts);
        }

        // Step 5: DIN 打分 —— 对每个候选商品计算综合推荐分
        List<DinScoredProduct> scoredProducts = scoreWithDinAlgorithm(
                allCandidates, categoryInterestMap, userInterestEmbedding);

        // Step 6: 按得分排序去重，取 Top N
        int recommendLimit = Math.min(10, Math.max(scoredProducts.size(), categoryIds.size() * 2));
        List<Product> finalRecommendations = scoredProducts.stream()
                .limit(recommendLimit)
                .map(DinScoredProduct::getProduct)
                .collect(Collectors.toList());

        response.setProducts(finalRecommendations);

        // 取第一个检测目标的类别名作为主展示
        CategoryInterest primaryInterest = categoryInterestMap.values().iterator().next();
        response.setCategoryName(primaryInterest.displayName);

        DetectionDto topDetection = sortedDetections.get(0);
        Long topProductId = CollectionUtils.isEmpty(finalRecommendations) ? null : finalRecommendations.get(0).getId();
        saveRecognitionLog(uid, requestId,
                primaryInterest.categoryId, primaryInterest.displayName,
                BigDecimal.valueOf(topDetection.getConfidence()), topProductId,
                recognitionResult, 1, processingTimeMs, null);
        return response;
    }

    /**
     * 单检测结果回退处理（仅检测到一个有效目标时）
     */
    private RecognitionResponseVo resolveSingleDetection(RecognitionResponseVo response,
                                                          RecognitionResultDto recognitionResult,
                                                          DetectionDto detection,
                                                          Long uid, String requestId, int processingTimeMs) {
        ProductCategory category = productCategoryMapper.findByYoloClassId(detection.getProductClassId());
        if (category == null) {
            response.setStatus("no_match");
            response.setMessage("识别结果暂无对应商品类别");
            saveRecognitionLog(uid, requestId, null, detection.getProductClassName(),
                    BigDecimal.valueOf(detection.getConfidence()), null, recognitionResult,
                    0, processingTimeMs, "类别未映射");
            return response;
        }

        response.setCategoryName(category.getDisplayName());
        response.setProducts(recommendByCategory(category.getId(), 10));

        Long topProductId = CollectionUtils.isEmpty(response.getProducts()) ? null : response.getProducts().get(0).getId();
        saveRecognitionLog(uid, requestId, category.getId(), category.getDisplayName(),
                BigDecimal.valueOf(detection.getConfidence()), topProductId, recognitionResult,
                1, processingTimeMs, null);
        return response;
    }

    // ==================== DIN 算法核心 ====================

    /**
     * 构建用户历史兴趣嵌入向量
     * 从用户的识别日志中统计每个类别的出现频率和近期活跃度，
     * 模拟 DIN 的 User Interest Embedding
     *
     * @return categoryId -> interestScore (0~1)
     */
    private Map<Long, Double> buildUserInterestEmbedding(Long uid) {
        if (uid == null) {
            return Collections.emptyMap();
        }
        try {
            LambdaQueryWrapper<RecognitionLog> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(RecognitionLog::getUid, uid);
            wrapper.eq(RecognitionLog::getStatus, 1);
            wrapper.orderByDesc(RecognitionLog::getCreateTime);
            wrapper.last("LIMIT 50");
            List<RecognitionLog> recentLogs = recognitionLogMapper.selectList(wrapper);

            if (CollectionUtils.isEmpty(recentLogs)) {
                return Collections.emptyMap();
            }

            // 时间衰减因子：越近的记录权重越高
            long now = System.currentTimeMillis();
            Map<Long, Double> interestScores = new HashMap<>();
            for (RecognitionLog log : recentLogs) {
                if (log.getRecognizedCategoryId() == null) continue;
                long ageHours = (now - log.getCreateTime().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()) / 3600000L;
                double timeDecay = Math.exp(-ageHours / 168.0); // 半衰期一周
                interestScores.merge(log.getRecognizedCategoryId(), timeDecay, Double::sum);
            }

            // 归一化到 [0, 1]
            double maxScore = interestScores.values().stream().max(Double::compare).orElse(1.0);
            if (maxScore > 0) {
                interestScores.replaceAll((k, v) -> v / maxScore);
            }
            return interestScores;
        } catch (Exception e) {
            log.warn("构建用户兴趣嵌入失败, uid={}", uid, e);
            return Collections.emptyMap();
        }
    }

    /**
     * DIN 打分核心：
     * Score = base_score × attention_weight × (1 + user_interest_activation)
     *
     * 其中：
     * - base_score: 商品基础质量分（销量归一化 + 库存可用性）
     * - attention_weight: 当前检测对该类别的注意力权重（置信度归一化）
     * - user_interest_activation: 用户历史兴趣激活值（DIN 的 Interest Activation Unit）
     */
    private List<DinScoredProduct> scoreWithDinAlgorithm(
            List<Product> candidates,
            Map<Long, CategoryInterest> categoryInterestMap,
            Map<Long, Double> userInterestEmbedding) {

        if (CollectionUtils.isEmpty(candidates)) {
            return Collections.emptyList();
        }

        // 预计算销量的归一化基准
        OptionalInt maxSalesOpt = candidates.stream().mapToInt(p -> p.getSales() != null ? p.getSales() : 0).max();
        int maxSales = maxSalesOpt.orElse(1);
        if (maxSales == 0) maxSales = 1;

        List<DinScoredProduct> scored = new ArrayList<>();
        for (Product product : candidates) {
            Long categoryId = product.getCategoryId();
            CategoryInterest ci = categoryInterestMap.get(categoryId);
            if (ci == null) continue;

            // --- base_score: 商品质量分 ---
            double salesRatio = (product.getSales() != null ? product.getSales() : 0) / (double) maxSales;
            double stockFactor = (product.getStock() != null && product.getStock() > 0) ? 1.0 : 0.1;
            double baseScore = salesRatio * 0.7 + stockFactor * 0.3;

            // --- attention_weight: 当前检测的注意力权重 ---
            double attentionWeight = ci.attentionWeight;

            // --- user_interest_activation: 用户历史兴趣激活 ---
            double userInterest = userInterestEmbedding.getOrDefault(categoryId, 0.0);
            double activationValue = 1.0 + userInterest * 0.8; // 激活放大系数

            // --- 最终 DIN 分 ---
            double dinScore = baseScore * attentionWeight * activationValue;

            scored.add(new DinScoredProduct(product, dinScore));
        }

        // 按 DIN 分降序排列
        scored.sort((a, b) -> Double.compare(b.dinScore, a.dinScore));

        // 同一商品 ID 只保留最高分版本
        Map<Long, DinScoredProduct> bestByProductId = new LinkedHashMap<>();
        for (DinScoredProduct sp : scored) {
            bestByProductId.putIfAbsent(sp.product.getId(), sp);
        }

        return new ArrayList<>(bestByProductId.values());
    }

    /**
     * 将 YOLO 置信度 (0~1) 归一化为注意力权重
     * 使用 sigmoid 变换使高置信度的权重更突出
     */
    private double normalizeConfidence(double confidence) {
        // 将置信度映射到 0.5 ~ 1.0 区间，确保最低检测也有一定权重
        return 0.5 + confidence * 0.5;
    }

    // ==================== 内部数据结构 ====================

    /** 类别兴趣（模拟 DIN 的 candidate embedding） */
    private static class CategoryInterest {
        final long categoryId;
        final String displayName;
        final double attentionWeight; // 来自检测置信度的注意力权重

        CategoryInterest(long categoryId, String displayName, double attentionWeight) {
            this.categoryId = categoryId;
            this.displayName = displayName;
            this.attentionWeight = attentionWeight;
        }
    }

    /** DIN 打分后的商品包装 */
    private static class DinScoredProduct {
        final Product product;
        final double dinScore;

        DinScoredProduct(Product product, double dinScore) {
            this.product = product;
            this.dinScore = dinScore;
        }

        Product getProduct() { return product; }
    }

    /**
     * DIN 推荐最大返回数量，防止大 k 值导致网络传输和前端渲染压力
     */
    private static final int MAX_TOP_K = 40;

    @Override
    public DinRecommendResponseVo getDinTopKRecommendations(Long userId, Integer k) {
        // 参数校验与上限控制
        int safeK = (k == null || k <= 0) ? 10 : Math.min(k, MAX_TOP_K);

        DinRecommendResponseVo response = new DinRecommendResponseVo();
        response.setUserId(userId);
        response.setFallback(false);
        response.setStatus("normal");

        // 调用 Python 推荐服务（超时/异常会触发 Feign Fallback）
        DinTopKResponseDto recommendResult;
        try {
            recommendResult = dinRecommendFeignClient.getTopKRecommendations(userId, safeK);
        } catch (Exception e) {
            log.error("调用 DIN 推荐服务异常, userId={}, k={}", userId, safeK, e);
            recommendResult = null;
        }

        // 服务不可用或返回空时，降级为热销商品列表
        boolean fallback = recommendResult == null
                || "fallback".equals(recommendResult.getModelVersion())
                || CollectionUtils.isEmpty(recommendResult.getItems());

        List<Product> products;
        if (fallback) {
            log.warn("DIN 推荐结果为空或降级, userId={}, 返回热销商品兜底", userId);
            response.setFallback(true);
            response.setStatus("fallback");
            response.setReason("推荐服务暂时不可用，已为您切换为热销商品");
            products = lambdaQuery()
                    .orderByDesc(Product::getSales)
                    .last("LIMIT " + safeK)
                    .list();
        } else {
            List<Long> itemIds = recommendResult.getItems().stream()
                    .map(RecommendationItemDto::getItemId)
                    .collect(Collectors.toList());
            // 批量查询商品详情，保持推荐顺序
            List<Product> dbProducts = baseMapper.selectBatchIds(itemIds);
            Map<Long, Product> productMap = dbProducts.stream()
                    .collect(Collectors.toMap(Product::getId, p -> p));
            products = recommendResult.getItems().stream()
                    .map(item -> productMap.get(item.getItemId()))
                    .filter(Objects::nonNull)
                    .limit(safeK)
                    .collect(Collectors.toList());

            // 设置推荐理由摘要
            boolean hitCache = Boolean.TRUE.equals(recommendResult.getHitCache());
            response.setReason(hitCache
                    ? "基于用户历史行为的个性化推荐（命中缓存）"
                    : "基于用户历史行为的个性化推荐（实时计算）");
        }

        response.setProducts(products);
        response.setHitCache(recommendResult != null && Boolean.TRUE.equals(recommendResult.getHitCache()));
        response.setLatencyMs(recommendResult != null ? recommendResult.getLatencyMs() : 0L);
        response.setModelVersion(recommendResult != null ? recommendResult.getModelVersion() : "unknown");
        response.setDataVersion(recommendResult != null ? recommendResult.getDataVersion() : "unknown");
        response.setYear(recommendResult != null ? recommendResult.getYear() : 0);
        return response;
    }

    @Override
    public List<Product> recommendByCategory(Long categoryId, Integer limit) {
        if (categoryId == null || limit == null || limit <= 0) {
            return new ArrayList<>();
        }
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Product::getCategoryId, categoryId);
        wrapper.orderByDesc(Product::getSales);
        wrapper.last("LIMIT " + limit);
        List<Product> products = list(wrapper);
        // 填充类别名称（简化处理，实际可缓存）
        ProductCategory category = productCategoryMapper.selectById(categoryId);
        if (category != null) {
            products.forEach(p -> p.setCategoryName(category.getDisplayName()));
        }
        return products;
    }

    @Override
    public List<Product> listProducts(Long categoryId) {
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        if (categoryId != null && categoryId > 0) {
            wrapper.eq(Product::getCategoryId, categoryId);
        }
        wrapper.orderByDesc(Product::getSales);
        List<Product> products = list(wrapper);
        // 批量填充类别名称
        if (!products.isEmpty()) {
            List<Long> categoryIds = products.stream()
                    .map(Product::getCategoryId)
                    .distinct()
                    .collect(Collectors.toList());
            List<ProductCategory> categories = productCategoryMapper.selectBatchIds(categoryIds);
            Map<Long, String> categoryNameMap = categories.stream()
                    .collect(Collectors.toMap(ProductCategory::getId, ProductCategory::getDisplayName));
            products.forEach(p -> p.setCategoryName(categoryNameMap.getOrDefault(p.getCategoryId(), "")));
        }
        return products;
    }

    /**
     * 批量查询商品名称（解决订单列表 N+1 调用问题）
     */
    @Override
    public Map<Long, String> batchGetNames(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return lambdaQuery()
                .select(Product::getId, Product::getName)
                .in(Product::getId, ids)
                .list()
                .stream()
                .collect(Collectors.toMap(Product::getId, Product::getName));
    }

    /**
     * 原子扣减库存
     * 使用数据库行级锁 + WHERE stock >= number 防止超卖
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean reduceStock(Long pid, Integer number) {
        if (pid == null || number == null || number <= 0) {
            return false;
        }
        int rows = baseMapper.reduceStock(pid, number);
        if (rows == 0) {
            log.warn("库存扣减失败,库存不足: pid={}, number={}", pid, number);
            return false;
        }
        log.info("库存扣减成功: pid={}, number={}", pid, number);
        return true;
    }

    /**
     * 补偿回滚库存（订单创建失败时调用）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void rollbackStock(Long pid, Integer number) {
        if (pid == null || number == null || number <= 0) {
            return;
        }
        try {
            int rows = baseMapper.rollbackStock(pid, number);
            log.info("库存回滚: pid={}, number={}, rows={}", pid, number, rows);
        } catch (Exception e) {
            log.error("库存回滚失败,需人工补偿: pid={}, number={}", pid, number, e);
        }
    }

    /**
     * 保存识别日志
     */
    private void saveRecognitionLog(Long uid, String requestId, Long categoryId, String categoryName,
                                    BigDecimal confidence, Long topProductId,
                                    RecognitionResultDto recognitionResult, int status,
                                    int processingTimeMs, String errorMsg) {
        try {
            RecognitionLog logEntity = new RecognitionLog();
            logEntity.setUid(uid);
            logEntity.setRequestId(requestId);
            logEntity.setRecognizedCategoryId(categoryId);
            logEntity.setRecognizedCategoryName(categoryName);
            logEntity.setConfidence(confidence);
            logEntity.setTopProductId(topProductId);
            logEntity.setStatus(status);
            logEntity.setProcessingTimeMs(processingTimeMs);
            logEntity.setErrorMsg(errorMsg);
            if (recognitionResult != null) {
                logEntity.setDetectionResultJson(JSON.toJSONString(recognitionResult));
            }
            recognitionLogMapper.insert(logEntity);
        } catch (Exception e) {
            log.error("保存识别日志失败, requestId={}", requestId, e);
        }
    }
}
