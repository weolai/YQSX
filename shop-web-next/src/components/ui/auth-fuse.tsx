"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Camera, Sparkles, ShoppingBag, Zap, Cookie, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Spotlight } from "@/components/ui/spotlight";
import { cn } from "@/lib/utils";
import { Typewriter } from "@/components/design/typewriter";
import { type AuthMode } from "@/components/ui/auth-primitives";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ResetForm } from "@/components/auth/reset-form";

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;

interface AuthFuseProps {
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onLogin?: (username: string, password: string) => Promise<boolean | string>;
  onRegister?: (data: { phone: string; code: string; username: string; password: string; nickname?: string }) => Promise<boolean | string>;
  onResetPassword?: (data: { phone: string; code: string; newPassword: string }) => Promise<boolean | string>;
  onSendCode?: (
    phone: string,
    type: "REGISTER" | "RESET_PASSWORD"
  ) => Promise<{ success: true; code: string } | string>;
  isLoading?: boolean;
  error?: string;
}

export function AuthFuse({
  mode: controlledMode,
  onModeChange,
  onLogin,
  onRegister,
  onResetPassword,
  onSendCode,
  isLoading: externalLoading,
  error: externalError,
}: AuthFuseProps) {
  const isControlled = controlledMode !== undefined;
  const [internalMode, setInternalMode] = useState<AuthMode>(controlledMode || "login");
  const mode = isControlled ? controlledMode : internalMode;

  // Common fields
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");

  // Reset fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [localError, setLocalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清除定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [sentCode, setSentCode] = useState("");

  const displayError = externalError || localError;
  const displayLoading = externalLoading || isLoading;

  const switchMode = useCallback((next: AuthMode) => {
    if (!isControlled) setInternalMode(next);
    onModeChange?.(next);
    setLocalError("");
    setSuccessMsg("");
    setCode("");
  }, [isControlled, onModeChange]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const validatePhone = (value: string) => PHONE_REGEX.test(value);
  const validatePassword = (value: string) => value.length >= 6;

  const handleSendCode = async () => {
    setLocalError("");
    setSuccessMsg("");

    if (!validatePhone(phone)) {
      setLocalError("请输入有效的 11 位手机号");
      return;
    }

    if (!onSendCode) {
      setLocalError("验证码功能未启用");
      return;
    }

    setIsLoading(true);
    try {
      const type = mode === "register" ? "REGISTER" : "RESET_PASSWORD";
      const result = await onSendCode(phone, type);
      if (typeof result === "object" && result.success) {
        setCountdown(60);
        setSuccessMsg("验证码已发送，请注意查收");
        // 安全约束:验证码弹窗仅在 development 构建展示
        // 生产构建(NODE_ENV=production)不展示验证码,验证码应通过真实短信通道下发
        if (process.env.NODE_ENV === "development") {
          setSentCode(result.code);
          setShowCodeDialog(true);
        }
      } else {
        setLocalError(typeof result === "string" ? result : "验证码发送失败，请稍后再试");
      }
    } catch {
      setLocalError("验证码发送失败，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setSuccessMsg("");

    if (mode === "login") {
      if (!username || !password) {
        setLocalError("请输入用户名和密码");
        return;
      }
      if (!onLogin) {
        setLocalError("登录功能未启用");
        return;
      }
      setIsLoading(true);
      try {
        const result = await onLogin(username, password);
        if (result !== true) {
          setLocalError(typeof result === "string" ? result : "账号或密码不正确，请重新输入。");
        }
      } catch {
        setLocalError("登录失败，请稍后再试");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Common validation for register / reset
    if (!validatePhone(phone)) {
      setLocalError("请输入有效的 11 位手机号");
      return;
    }
    if (!CODE_REGEX.test(code)) {
      setLocalError("请输入 6 位数字验证码");
      return;
    }

    if (mode === "register") {
      if (!regUsername.trim()) {
        setLocalError("请输入用户名");
        return;
      }
      if (!validatePassword(regPassword)) {
        setLocalError("密码长度不能少于 6 位");
        return;
      }
      if (regPassword !== confirmPassword) {
        setLocalError("两次输入的密码不一致");
        return;
      }
      if (!onRegister) {
        setLocalError("注册功能未启用");
        return;
      }
      setIsLoading(true);
      try {
        const result = await onRegister({
          phone,
          code,
          username: regUsername.trim(),
          password: regPassword,
          nickname: nickname.trim() || undefined,
        });
        if (result === true) {
          setSuccessMsg("注册成功，正在跳转...");
        } else {
          setLocalError(typeof result === "string" ? result : "注册失败，请检查信息后重试");
        }
      } catch {
        setLocalError("注册失败，请稍后再试");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mode === "reset") {
      if (!validatePassword(newPassword)) {
        setLocalError("密码长度不能少于 6 位");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setLocalError("两次输入的密码不一致");
        return;
      }
      if (!onResetPassword) {
        setLocalError("密码重置功能未启用");
        return;
      }
      setIsLoading(true);
      try {
        const result = await onResetPassword({ phone, code, newPassword });
        if (result === true) {
          setSuccessMsg("密码重置成功，请使用新密码登录");
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => switchMode("login"), 1500);
        } else {
          setLocalError(typeof result === "string" ? result : "密码重置失败");
        }
      } catch {
        setLocalError("密码重置失败，请稍后再试");
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  const tabs: { key: AuthMode; label: string }[] = [
    { key: "login", label: "登录" },
    { key: "register", label: "注册" },
    { key: "reset", label: "重置密码" },
  ];

  const features = [
    { icon: Camera, title: "拍照识别", desc: "上传照片识别零食种类" },
    { icon: Sparkles, title: "智能推荐", desc: "根据偏好推荐商品" },
    { icon: ShoppingBag, title: "快速下单", desc: "选中商品直接购买" },
    { icon: Zap, title: "订单可追踪", desc: "实时查看订单状态" },
  ];

  const modeTitles: Record<AuthMode, { title: string; subtitle: string }> = {
    login: { title: "欢迎回来", subtitle: "登录账户，继续你的智能零食购物体验。" },
    register: { title: "创建账户", subtitle: "使用手机号完成验证，开启智能零食推荐。" },
    reset: { title: "重置密码", subtitle: "验证手机号后，设置新的登录密码。" },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background overflow-hidden">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* Ambient background glows matching theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-5xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#3d2e22] to-[#2a2118] shadow-2xl shadow-[#2a2118]/25 ring-1 ring-primary/20"
      >
        {/* Warm gradient overlay to unify with theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#e8c4a8" />

        <div className="relative z-10 flex flex-col md:flex-row min-h-[600px]">
          {/* Left content - brand & value prop */}
          <div className="flex-1 p-8 sm:p-10 lg:p-14 flex flex-col justify-center text-white">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-serif font-semibold">YQSX</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold leading-tight text-white">
                  YQSX 智能零食商城
                </h1>
                <p className="text-base sm:text-lg text-white/90 max-w-md leading-relaxed">
                  “<Typewriter text="发现更合口味的零食，让购物更高效。" speed={70} loop delay={4000} />
                  ”
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <feature.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                      <p className="text-xs text-white/80 mt-0.5">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right content - auth form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex-1 p-8 sm:p-10 lg:p-14 bg-white/[0.03] backdrop-blur-sm flex flex-col justify-center"
          >
            <div className="w-full max-w-[420px] mx-auto space-y-6">
              {/* Tabs */}
              <div className="flex p-1 rounded-xl bg-white/10 border border-white/10">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => switchMode(tab.key)}
                    className={cn(
                      "relative flex-1 h-10 rounded-lg text-sm font-medium transition-all duration-200",
                      mode === tab.key
                        ? "text-[#2a2118] bg-white shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-white">{modeTitles[mode].title}</h2>
                <p className="text-sm text-white/90">{modeTitles[mode].subtitle}</p>
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <LoginForm
                    key="login"
                    username={username}
                    onUsernameChange={setUsername}
                    password={password}
                    onPasswordChange={setPassword}
                    rememberMe={rememberMe}
                    onRememberMeChange={setRememberMe}
                    onSubmit={handleSubmit}
                    onSwitchMode={switchMode}
                    displayError={displayError}
                    successMsg={successMsg}
                    displayLoading={displayLoading}
                  />
                )}
                {mode === "register" && (
                  <RegisterForm
                    key="register"
                    phone={phone}
                    onPhoneChange={setPhone}
                    code={code}
                    onCodeChange={setCode}
                    countdown={countdown}
                    onSendCode={handleSendCode}
                    regUsername={regUsername}
                    onRegUsernameChange={setRegUsername}
                    regPassword={regPassword}
                    onRegPasswordChange={setRegPassword}
                    confirmPassword={confirmPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    nickname={nickname}
                    onNicknameChange={setNickname}
                    onSubmit={handleSubmit}
                    onSwitchMode={switchMode}
                    displayError={displayError}
                    successMsg={successMsg}
                    displayLoading={displayLoading}
                  />
                )}
                {mode === "reset" && (
                  <ResetForm
                    key="reset"
                    phone={phone}
                    onPhoneChange={setPhone}
                    code={code}
                    onCodeChange={setCode}
                    countdown={countdown}
                    onSendCode={handleSendCode}
                    newPassword={newPassword}
                    onNewPasswordChange={setNewPassword}
                    confirmNewPassword={confirmNewPassword}
                    onConfirmNewPasswordChange={setConfirmNewPassword}
                    onSubmit={handleSubmit}
                    onSwitchMode={switchMode}
                    displayError={displayError}
                    successMsg={successMsg}
                    displayLoading={displayLoading}
                  />
                )}
              </AnimatePresence>


            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 开发环境验证码提示弹窗 */}
      <AnimatePresence>
        {showCodeDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCodeDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-[#3d2e22] to-[#2a2118] border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">验证码已发送</h3>
                  <p className="text-sm text-white/70 mt-1">请输入收到的验证码完成验证</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {sentCode.split("").map((digit, index) => (
                    <div
                      key={index}
                      className="w-10 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xl font-bold text-white tracking-wider"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodeDialog(false)}
                  className="w-full h-11 rounded-xl bg-white text-foreground border border-foreground/20 font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
