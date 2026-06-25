"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { AuthFuse } from "@/components/ui/auth-fuse";
import { useAuthStore } from "@/lib/stores/auth";
import { useEffect } from "react";

function LoginPageContent() {
  const router = useRouter();
  const { login, register, resetPassword, sendCode, isLoggedIn } = useAuthStore();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, router]);

  const handleLogin = async (username: string, password: string): Promise<boolean | string> => {
    const result = await login(username, password);
    if (result === true) {
      router.push("/");
      return true;
    }
    return "登录失败，请检查用户名和密码";
  };

  const handleRegister = async (data: {
    phone: string;
    code: string;
    username: string;
    password: string;
    nickname?: string;
  }): Promise<boolean | string> => {
    const result = await register(data);
    if (result === true) {
      router.push("/");
      return true;
    }
    return result;
  };

  const handleResetPassword = async (data: {
    phone: string;
    code: string;
    newPassword: string;
  }): Promise<boolean | string> => {
    const result = await resetPassword(data);
    if (result === true) {
      return true;
    }
    return result;
  };

  const handleSendCode = async (
    phone: string,
    type: "REGISTER" | "RESET_PASSWORD"
  ): Promise<{ success: true; code: string } | string> => {
    const result = await sendCode(phone, type);
    if (typeof result === 'object' && result.success) {
      return result;
    }
    return result;
  };

  return (
    <AuthFuse
      onLogin={handleLogin}
      onRegister={handleRegister}
      onResetPassword={handleResetPassword}
      onSendCode={handleSendCode}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
