"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, Sparkles, Smartphone, KeyRound, ArrowLeft } from "lucide-react";
import { Label, Input, PasswordInput, Button, type AuthMode } from "@/components/ui/auth-primitives";

interface RegisterFormProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  countdown: number;
  onSendCode: () => void;
  regUsername: string;
  onRegUsernameChange: (value: string) => void;
  regPassword: string;
  onRegPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchMode: (mode: AuthMode) => void;
  displayError: string;
  successMsg: string;
  displayLoading: boolean;
}

export function RegisterForm({
  phone,
  onPhoneChange,
  code,
  onCodeChange,
  countdown,
  onSendCode,
  regUsername,
  onRegUsernameChange,
  regPassword,
  onRegPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  nickname,
  onNicknameChange,
  onSubmit,
  onSwitchMode,
  displayError,
  successMsg,
  displayLoading,
}: RegisterFormProps) {
  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      onSubmit={onSubmit}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          手机号
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          maxLength={11}
          placeholder="请输入 11 位手机号"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))}
          autoComplete="tel"
          className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="code" className="text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          验证码
        </Label>
        <div className="flex gap-3">
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="请输入 6 位验证码"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
            className="h-12 flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-primary"
          />
          <Button
            type="button"
            disabled={countdown > 0 || displayLoading}
            onClick={onSendCode}
            className="h-12 px-4 whitespace-nowrap disabled:opacity-50"
          >
            {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
          </Button>
        </div>

      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-username" className="text-white flex items-center gap-2">
          <User className="w-4 h-4" />
          用户名
        </Label>
        <Input
          id="reg-username"
          type="text"
          placeholder="请输入用户名"
          value={regUsername}
          onChange={(e) => onRegUsernameChange(e.target.value)}
          autoComplete="username"
          className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname" className="text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          昵称（可选）
        </Label>
        <Input
          id="nickname"
          type="text"
          placeholder="请输入昵称"
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-primary"
        />
      </div>

      <PasswordInput
        label="密码"
        labelClassName="text-white flex items-center gap-2"
        placeholder="请输入至少 6 位密码"
        value={regPassword}
        onChange={(e) => onRegPasswordChange(e.target.value)}
        autoComplete="new-password"
        className="[&_input]:h-12 [&_input]:bg-white/10 [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/60 [&_input]:focus-visible:bg-white/15 [&_input]:focus-visible:ring-primary"
      />

      <PasswordInput
        label="确认密码"
        labelClassName="text-white flex items-center gap-2"
        placeholder="请再次输入密码"
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        autoComplete="new-password"
        className="[&_input]:h-12 [&_input]:bg-white/10 [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/60 [&_input]:focus-visible:bg-white/15 [&_input]:focus-visible:ring-primary"
      />

      <AnimatePresence mode="wait">
        {displayError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-destructive-foreground bg-destructive/90 p-3 rounded-xl"
          >
            {displayError}
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-white bg-white/10 border border-white/20 p-3 rounded-xl"
          >
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={displayLoading}
        className="w-full h-12 text-base shadow-lg shadow-black/10"
      >
        {displayLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在注册...
          </>
        ) : (
          "注册"
        )}
      </Button>

      <button
        type="button"
        onClick={() => onSwitchMode("login")}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-white/80 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回登录
      </button>
    </motion.form>
  );
}
