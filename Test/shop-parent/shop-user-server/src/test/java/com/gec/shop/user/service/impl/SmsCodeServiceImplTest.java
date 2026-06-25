package com.gec.shop.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.user.mapper.SmsCodeMapper;
import com.gec.shop.user.pojo.SmsCode;
import com.gec.shop.user.service.SmsCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmsCodeServiceImplTest {

    private SmsCodeMapper smsCodeMapper;
    private SmsCodeService smsCodeService;

    @BeforeEach
    void setUp() {
        smsCodeMapper = mock(SmsCodeMapper.class);
        SmsCodeServiceImpl service = new SmsCodeServiceImpl();
        service.setSmsCodeMapper(smsCodeMapper);
        smsCodeService = service;
    }

    @Test
    void shouldSendCodeAndStoreInDb() {
        when(smsCodeMapper.selectOne(any(QueryWrapper.class))).thenReturn(null);

        Map<String, String> sendResult = smsCodeService.sendCode("13800138000", "REGISTER");

        assertEquals("验证码已发送", sendResult.get("msg"));
        assertNotNull(sendResult.get("code"));
        assertEquals(6, sendResult.get("code").length());
        ArgumentCaptor<SmsCode> captor = ArgumentCaptor.forClass(SmsCode.class);
        verify(smsCodeMapper).insert(captor.capture());
        SmsCode saved = captor.getValue();
        assertEquals("13800138000", saved.getPhone());
        assertEquals("REGISTER", saved.getType());
        assertEquals(6, saved.getCode().length());
        assertTrue(saved.getExpireTime().isAfter(LocalDateTime.now()));
        assertEquals(0, saved.getUsed());
    }

    @Test
    void shouldRejectSendWithin60Seconds() {
        SmsCode recent = new SmsCode();
        recent.setPhone("13800138000");
        recent.setType("REGISTER");
        recent.setCreateTime(LocalDateTime.now().minusSeconds(10));
        when(smsCodeMapper.selectOne(any(QueryWrapper.class))).thenReturn(recent);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> smsCodeService.sendCode("13800138000", "REGISTER"));
        assertTrue(ex.getMessage().contains("发送过于频繁"));
    }

    @Test
    void shouldVerifyValidCode() {
        SmsCode code = new SmsCode();
        code.setId(1L);
        code.setPhone("13800138000");
        code.setCode("123456");
        code.setType("REGISTER");
        code.setUsed(0);
        code.setExpireTime(LocalDateTime.now().plusMinutes(5));
        when(smsCodeMapper.selectOne(any(QueryWrapper.class))).thenReturn(code);

        boolean result = smsCodeService.verifyCode("13800138000", "123456", "REGISTER");

        assertTrue(result);
        assertEquals(1, code.getUsed());
        verify(smsCodeMapper).updateById(code);
    }

    @Test
    void shouldRejectExpiredCode() {
        // 模拟数据库已按 expire_time > now 过滤，返回空
        when(smsCodeMapper.selectOne(any(QueryWrapper.class))).thenReturn(null);
        assertFalse(smsCodeService.verifyCode("13800138000", "123456", "REGISTER"));
        verify(smsCodeMapper, times(0)).updateById(any(SmsCode.class));
    }

    @Test
    void shouldRejectAlreadyUsedCode() {
        // 模拟数据库已按 used = 0 过滤，返回空
        when(smsCodeMapper.selectOne(any(QueryWrapper.class))).thenReturn(null);
        assertFalse(smsCodeService.verifyCode("13800138000", "123456", "REGISTER"));
    }

    @Test
    void shouldRejectWrongCode() {
        SmsCode code = new SmsCode();
        code.setPhone("13800138000");
        code.setCode("123456");
        code.setType("REGISTER");
        code.setUsed(0);
        code.setExpireTime(LocalDateTime.now().plusMinutes(5));
        when(smsCodeMapper.selectOne(any(QueryWrapper.class))).thenReturn(code);
        assertFalse(smsCodeService.verifyCode("13800138000", "000000", "REGISTER"));
    }
}
