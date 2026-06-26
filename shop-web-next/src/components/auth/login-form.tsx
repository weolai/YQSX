"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, Check } from "lucide-react";
import { Label, Input, PasswordInput, Button, type AuthMode } from "@/components/ui/auth-primitives";

interface LoginFormProps {
  username: string;
  onUsernameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchMode: (mode: AuthMode) => void;
  displayError: string;
  successMsg: string;
  displayLoading: boolean;
}

export function LoginForm({
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  onSubmit,
  onSwitchMode,
  displayError,
  successMsg,
  displayLoading,
}: LoginFormProps) {
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
        <Label htmlFor="username" className="text-white flex items-center gap-2">
          <User className="w-4 h-4" />
          用户名
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          autoComplete="username"
          className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-primary"
        />
      </div>

      <PasswordInput
        label="密码"
        labelClassName="text-white flex items-center gap-2"
        placeholder="请输入密码"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        autoComplete="current-password"
        className="[&_input]:h-12 [&_input]:bg-white/10 [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/60 [&_input]:focus-visible:bg-white/15 [&_input]:focus-visible:ring-primary"
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-4 h-4 rounded border border-white/40 bg-white/5 transition-colors peer-checked:bg-primary peer-checked:border-primary" />
            <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
          <span className="text-sm text-white group-hover:text-white/90 transition-colors">记住我</span>
        </label>

        <button
          type="button"
          className="text-sm text-white underline underline-offset-4 hover:text-primary transition-colors"
          onClick={() => onSwitchMode("reset")}
        >
          忘记密码？
        </button>
      </div>

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
            正在登录...
          </>
        ) : (
          "登录"
        )}
      </Button>
    </motion.form>
  );
}
