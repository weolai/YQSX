package com.gec.shop.order.config;

import com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.BlockExceptionHandler;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.alibaba.csp.sentinel.slots.block.authority.AuthorityException;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeException;
import com.alibaba.csp.sentinel.slots.block.flow.FlowException;
import com.alibaba.csp.sentinel.slots.block.flow.param.ParamFlowException;
import com.alibaba.csp.sentinel.slots.system.SystemBlockException;
import com.alibaba.fastjson.JSON;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Sentinel自定义异常返回处理类
 * 当触发了限流、降级、热点、授权、系统保护等规则时，返回自定义的JSON格式信息
 *
 * 异常类型说明：
 * - FlowException: 限流异常
 * - DegradeException: 降级异常
 * - ParamFlowException: 参数限流异常（热点）
 * - AuthorityException: 授权异常
 * - SystemBlockException: 系统负载异常
 */
@Component
public class ExceptionHandlerPage implements BlockExceptionHandler {
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, BlockException e) throws Exception {
        response.setContentType("application/json;charset=utf-8");
        ResultData data = null;
        if (e instanceof FlowException) {
            data = new ResultData(-1, "接口被限流了");
        } else if (e instanceof DegradeException) {
            data = new ResultData(-2, "接口被降级了");
        } else if (e instanceof ParamFlowException) {
            data = new ResultData(-3, "参数限流异常");
        } else if (e instanceof AuthorityException) {
            data = new ResultData(-4, "授权异常");
        } else if (e instanceof SystemBlockException) {
            data = new ResultData(-5, "系统负载异常了...");
        }
        response.getWriter().write(JSON.toJSONString(data));
    }
}
