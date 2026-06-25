package com.gec.shop.user.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneUtilTest {

    @Test
    void shouldAcceptValidPhone() {
        assertTrue(PhoneUtil.isValid("13800138000"));
        assertTrue(PhoneUtil.isValid("15912345678"));
        assertTrue(PhoneUtil.isValid("19912345678"));
    }

    @Test
    void shouldRejectInvalidPhone() {
        assertFalse(PhoneUtil.isValid(null));
        assertFalse(PhoneUtil.isValid(""));
        assertFalse(PhoneUtil.isValid("12345678901"));
        assertFalse(PhoneUtil.isValid("1380013800"));
        assertFalse(PhoneUtil.isValid("138001380000"));
        assertFalse(PhoneUtil.isValid("abcdefghijk"));
    }
}
