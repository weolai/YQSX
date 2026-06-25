package com.gec.shop.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.user.mapper.UserMapper;
import com.gec.shop.user.pojo.User;
import com.gec.shop.user.service.UserService;
import com.gec.shop.user.util.PasswordUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class UserServiceImplTest {

    private UserMapper userMapper;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        UserServiceImpl service = new UserServiceImpl();
        service.setUserMapper(userMapper);
        userService = service;
    }

    @Test
    void shouldRegisterByPhone() {
        when(userMapper.selectOne(any(QueryWrapper.class))).thenReturn(null);
        when(userMapper.insert(any(User.class))).thenReturn(1);

        User user = userService.registerByPhone("13800138000", "newuser", "123456", "Tester");

        assertNotNull(user);
        assertEquals("13800138000", user.getPhone());
        assertEquals("newuser", user.getUsername());
        assertEquals("Tester", user.getNickname());
        assertEquals(1, user.getStatus());
        assertTrue(PasswordUtil.matches("123456", user.getPassword()));
    }

    @Test
    void shouldRejectDuplicatePhone() {
        User existing = new User();
        existing.setPhone("13800138000");
        when(userMapper.selectOne(any(QueryWrapper.class))).thenReturn(existing);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.registerByPhone("13800138000", "newuser", "123456", null));
        assertEquals("手机号已被注册", ex.getMessage());
    }

    @Test
    void shouldResetPasswordByPhone() {
        User user = new User();
        user.setId(1L);
        user.setPhone("13800138000");
        user.setPassword(PasswordUtil.encode("oldpass"));
        when(userMapper.selectOne(any(QueryWrapper.class))).thenReturn(user);
        when(userMapper.updateById(any(User.class))).thenReturn(1);

        boolean result = userService.resetPasswordByPhone("13800138000", "newpass");

        assertTrue(result);
        assertTrue(PasswordUtil.matches("newpass", user.getPassword()));
        assertFalse(PasswordUtil.matches("oldpass", user.getPassword()));
    }

    @Test
    void shouldRejectResetForUnregisteredPhone() {
        when(userMapper.selectOne(any(QueryWrapper.class))).thenReturn(null);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.resetPasswordByPhone("13800138000", "newpass"));
        assertEquals("手机号未注册", ex.getMessage());
    }
}
