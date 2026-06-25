package com.gec.shop.common.handler;

import com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.BlockExceptionHandler;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.alibaba.csp.sentinel.slots.block.authority.AuthorityException;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeException;
import com.alibaba.csp.sentinel.slots.block.flow.FlowException;
import com.alibaba.csp.sentinel.slots.block.flow.param.ParamFlowException;
import com.alibaba.csp.sentinel.slots.system.SystemBlockException;
import com.alibaba.fastjson.JSON;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

/**
 * Sentinel 统一异常处理器
 * 当触发了限流、降级、热点、授权、系统保护等规则时，返回统一的 JSON 格式信息。
 * 响应格式：{"code":429,"msg":"..."}
 *
 * 异常类型说明：
 * - FlowException: 限流异常
 * - DegradeException: 降级异常
 * - ParamFlowException: 参数限流异常（热点）
 * - AuthorityException: 授权异常
 * - SystemBlockException: 系统负载异常
 */
public class UnifiedBlockExceptionHandler implements BlockExceptionHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, BlockException e) throws Exception {
        response.setStatus(429);
        response.setContentType("application/json;charset=utf-8");

        Map<String, Object> data = new HashMap<>();
        data.put("code", 429);

        if (e instanceof FlowException) {
            data.put("msg", "请求被限流，请稍后再试");
        } else if (e instanceof DegradeException) {
            data.put("msg", "服务已降级，请稍后再试");
        } else if (e instanceof ParamFlowException) {
            data.put("msg", "参数限流，请稍后再试");
        } else if (e instanceof AuthorityException) {
            data.put("msg", "无访问权限");
        } else if (e instanceof SystemBlockException) {
            data.put("msg", "系统保护规则触发，请稍后再试");
        } else {
            data.put("msg", "请求过于频繁，请稍后再试");
        }

        response.getWriter().write(JSON.toJSONString(data));
    }
}
