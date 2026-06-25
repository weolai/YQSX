package com.gec.shop.common.util;

import java.util.HashMap;
import java.util.Map;

/**
 * 统一响应结果构造器
 * 替代控制器中散落的 Map<String,Object> 手动 put 构造，统一结果模型。
 */
public class ResultBuilder {

    /**
     * 成功结果（code=200）
     */
    public static Map<String, Object> success(String msg) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("msg", msg);
        return result;
    }

    /**
     * 错误结果
     */
    public static Map<String, Object> error(int code, String msg) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", code);
        result.put("msg", msg);
        return result;
    }

    /**
     * Sentinel 限流降级结果（code=429）
     */
    public static Map<String, Object> block(String msg) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 429);
        result.put("msg", msg);
        return result;
    }
}
