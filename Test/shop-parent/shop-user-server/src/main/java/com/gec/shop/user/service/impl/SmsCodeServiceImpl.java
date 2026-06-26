package com.gec.shop.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.gec.shop.user.mapper.SmsCodeMapper;
import com.gec.shop.user.pojo.SmsCode;
import com.gec.shop.user.service.SmsCodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * 短信验证码服务实现
 * <p>
 * 规则：
 * 1. 验证码 6 位数字，有效期 10 分钟
 * 2. 同一手机号、同一用途 60 秒内只能发送一次
 * 3. 验证码一次性使用，验证成功后标记为已使用
 * 4. 默认通过日志输出验证码（演示环境未接入真实短信通道）
 */
@Slf4j
@Service
public class SmsCodeServiceImpl implements SmsCodeService {

    /**
     * 验证码有效期：10 分钟
     */
    private static final long EXPIRE_MINUTES = 10;

    /**
     * 发送间隔：60 秒
     */
    private static final long RESEND_SECONDS = 60;

    private static final Random RANDOM = new Random();

    @Autowired
    private SmsCodeMapper smsCodeMapper;

    public void setSmsCodeMapper(SmsCodeMapper smsCodeMapper) {
        this.smsCodeMapper = smsCodeMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, String> sendCode(String phone, String type) {
        LocalDateTime now = LocalDateTime.now();

        // 检查 60 秒内是否已发送
        QueryWrapper<SmsCode> recentWrapper = new QueryWrapper<>();
        recentWrapper.eq("phone", phone)
                .eq("type", type)
                .ge("create_time", now.minusSeconds(RESEND_SECONDS))
                .orderByDesc("create_time")
                .last("LIMIT 1");
        SmsCode recent = smsCodeMapper.selectOne(recentWrapper);
        if (recent != null) {
            long remainSeconds = RESEND_SECONDS - java.time.Duration.between(recent.getCreateTime(), now).getSeconds();
            throw new RuntimeException("发送过于频繁，请 " + Math.max(1, remainSeconds) + " 秒后重试");
        }

        // 将该手机号该类型下所有未使用验证码标记为已使用，防止数据膨胀
        UpdateWrapper<SmsCode> invalidateWrapper = new UpdateWrapper<>();
        invalidateWrapper.eq("phone", phone)
                .eq("type", type)
                .eq("used", 0)
                .set("used", 1);
        smsCodeMapper.update(null, invalidateWrapper);

        // 生成 6 位数字验证码
        String code = String.format("%06d", RANDOM.nextInt(1000000));

        SmsCode smsCode = new SmsCode();
        smsCode.setPhone(phone);
        smsCode.setCode(code);
        smsCode.setType(type);
        smsCode.setExpireTime(now.plusMinutes(EXPIRE_MINUTES));
        smsCode.setUsed(0);
        smsCodeMapper.insert(smsCode);

        // 安全约束:验证码不写入日志(防 PCI-DSS / 个人信息保护法违规)
        // dev/test 环境如需调试,可通过 DEBUG 级别单独开启
        log.info("[SMS-CODE] phone={}, type={}", phone, type);

        Map<String, String> result = new HashMap<>();
        result.put("msg", "验证码已发送");
        result.put("code", code);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean verifyCode(String phone, String code, String type) {
        if (phone == null || code == null || type == null) {
            return false;
        }

        SmsCode smsCode = getLatestValidCode(phone, type);
        if (smsCode == null || !code.equals(smsCode.getCode())) {
            return false;
        }

        // 标记为已使用
        smsCode.setUsed(1);
        smsCodeMapper.updateById(smsCode);
        return true;
    }

    @Override
    public SmsCode getLatestValidCode(String phone, String type) {
        LocalDateTime now = LocalDateTime.now();
        QueryWrapper<SmsCode> wrapper = new QueryWrapper<>();
        wrapper.eq("phone", phone)
                .eq("type", type)
                .eq("used", 0)
                .gt("expire_time", now)
                .orderByDesc("create_time")
                .last("LIMIT 1");
        return smsCodeMapper.selectOne(wrapper);
    }
}
