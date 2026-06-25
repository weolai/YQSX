package com.gec.shop.user.util;

import java.util.regex.Pattern;

/**
 * 手机号校验工具
 * <p>
 * 中国大陆手机号：1[3-9] 开头，共 11 位数字
 */
public class PhoneUtil {

    private static final Pattern PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

    private PhoneUtil() {
    }

    public static boolean isValid(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }
}
