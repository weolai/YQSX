package com.gec.shop.product.service.impl;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.gec.shop.product.feign.RecognitionFeignClient;
import com.gec.shop.product.feign.dto.DetectionDto;
import com.gec.shop.product.feign.dto.RecognitionResultDto;
import com.gec.shop.product.mapper.ProductCategoryMapper;
import com.gec.shop.product.mapper.ProductMapper;
import com.gec.shop.product.mapper.RecognitionLogMapper;
import com.gec.shop.product.pojo.Product;
import com.gec.shop.product.pojo.ProductCategory;
import com.gec.shop.product.pojo.RecognitionLog;
import com.gec.shop.product.service.ProductService;
import com.gec.shop.product.vo.RecognitionResponseVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
    private ProductCategoryMapper productCategoryMapper;

    @Autowired
    private RecognitionLogMapper recognitionLogMapper;

    @Override
    public RecognitionResponseVo recognize(MultipartFile file, Long uid) {
        String requestId = UUID.randomUUID().toString().replace("-", "");
        long startTime = System.currentTimeMillis();
        RecognitionResponseVo response = new RecognitionResponseVo();
        response.setRequestId(requestId);

        RecognitionResultDto recognitionResult;
        try {
            recognitionResult = recognitionFeignClient.recognizeImage(file);
        } catch (Exception e) {
            log.error("识别服务调用异常, requestId={}", requestId, e);
            recognitionResult = new RecognitionResultDto();
            recognitionResult.setStatus("error");
            recognitionResult.setMessage("识别服务调用失败: " + e.getMessage());
        }

        int processingTimeMs = (int) (System.currentTimeMillis() - startTime);

        // 处理降级/失败情况：以 detections 是否存在作为成功判断
        boolean hasDetections = recognitionResult != null && !CollectionUtils.isEmpty(recognitionResult.getDetections());
        if (recognitionResult == null || ("error".equals(recognitionResult.getStatus()) && !hasDetections)) {
            String message = recognitionResult == null ? "识别服务无响应" : recognitionResult.getMessage();
            response.setStatus("fallback");
            response.setMessage(message);
            saveRecognitionLog(uid, requestId, null, null, null, null, recognitionResult,
                    0, processingTimeMs, message);
            return response;
        }

        response.setStatus("success");
        response.setMessage("识别成功");
        response.setDetections(recognitionResult.getDetections());
        response.setDetectedCount(recognitionResult.getDetectedCount() == null
                ? recognitionResult.getDetections().size()
                : recognitionResult.getDetectedCount());

        // 取置信度最高的识别结果
        DetectionDto topDetection = getTopDetection(recognitionResult.getDetections());
        if (topDetection == null) {
            response.setMessage("未识别到商品");
            saveRecognitionLog(uid, requestId, null, null, null, null, recognitionResult,
                    0, processingTimeMs, null);
            return response;
        }

        // 映射 YOLO class_id 到商品类别
        ProductCategory category = productCategoryMapper.findByYoloClassId(topDetection.getProductClassId());
        if (category == null) {
            response.setStatus("no_match");
            response.setMessage("识别结果暂无对应商品类别");
            saveRecognitionLog(uid, requestId, null, topDetection.getProductClassName(),
                    BigDecimal.valueOf(topDetection.getConfidence()), null, recognitionResult,
                    0, processingTimeMs, "类别未映射");
            return response;
        }

        response.setCategoryName(category.getDisplayName());

        // 查询同类商品并推荐
        List<Product> products = recommendByCategory(category.getId(), 10);
        response.setProducts(products);

        // 组装推荐商品ID
        String recommendIds = products.stream()
                .map(p -> String.valueOf(p.getId()))
                .collect(Collectors.joining(","));
        Long topProductId = CollectionUtils.isEmpty(products) ? null : products.get(0).getId();

        // 保存识别日志
        saveRecognitionLog(uid, requestId, category.getId(), category.getDisplayName(),
                BigDecimal.valueOf(topDetection.getConfidence()), topProductId, recognitionResult,
                1, processingTimeMs, null);

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
     * 取置信度最高的识别结果
     */
    private DetectionDto getTopDetection(List<DetectionDto> detections) {
        if (CollectionUtils.isEmpty(detections)) {
            return null;
        }
        return detections.stream()
                .max((d1, d2) -> Double.compare(d1.getConfidence() == null ? 0 : d1.getConfidence(),
                        d2.getConfidence() == null ? 0 : d2.getConfidence()))
                .orElse(null);
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
