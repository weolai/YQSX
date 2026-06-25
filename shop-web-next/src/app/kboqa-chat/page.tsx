"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ExternalLink, Sparkles, Bot, User, ArrowRight, Zap } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card } from "@/components/ui/card";
import type { ChatMessage, KboqaState, KboqaResult } from "@/lib/kboqa/types";
import { QA_TEMPLATES } from "@/lib/kboqa/templates";
import { runKboqa, STATE_LABELS } from "@/lib/kboqa/orchestrator";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function KboqaChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [kboqaState, setKboqaState] = useState<KboqaState>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<KboqaResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, kboqaState]);

  const handleSubmit = useCallback(
    async (question: string) => {
      if (!question.trim() || isProcessing) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsProcessing(true);

      const sysMsg: ChatMessage = {
        id: `msg-sys-${Date.now()}`,
        role: "system",
        content: "已收到你的问题，正在调用智能引擎分析...",
        timestamp: Date.now(),
        state: "forwarding",
      };
      setMessages((prev) => [...prev, sysMsg]);

      const result = await runKboqa(question, setKboqaState);
      setLastResult(result);

      const doneMsg: ChatMessage = {
        id: `msg-done-${Date.now()}`,
        role: "system",
        content: `KBOQA 处理完成 (置信度: ${(result.confidence * 100).toFixed(0)}%) · 来源: ${result.sourceDocs.join(", ")}`,
        timestamp: Date.now(),
        state: "done",
      };

      const answerMsg: ChatMessage = {
        id: `msg-ans-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        timestamp: Date.now(),
        recommendations: result.recommendations,
      };

      setMessages((prev) => [...prev, doneMsg, answerMsg]);
      setKboqaState("idle");
      setIsProcessing(false);
    },
    [isProcessing],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4"
          >
            <Sparkles className="w-4 h-4" />
            KBOQA 智能商品问答
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold tracking-tight mb-2">
            AI 智能商品问答，专业解答购物问题
          </h1>
          <p className="text-muted-foreground text-sm">
            融合电商领域知识库、大模型推理与智能推荐，为每一次购物决策提供可信答案
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左栏：聊天主区 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 消息历史 */}
            <Card className="flex flex-col glass border-border/50 overflow-hidden" style={{ height: "60vh" }}>
              <div className="px-5 py-3 border-b border-border/40 bg-card/50 flex items-center justify-between">
                <span className="text-sm font-semibold">消息历史</span>
                <span className="text-xs text-muted-foreground">{messages.length} 条消息</span>
              </div>

              {/* 状态指示器 */}
              {isProcessing && (
                <div className="px-5 py-2 bg-primary/5 border-b border-border/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                    {STATE_LABELS[kboqaState]}
                  </div>
                </div>
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Bot className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">选择下方模板或输入问题开始问答</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
              </div>
            </Card>

            {/* 模板选择 */}
            <div className="flex flex-wrap gap-2">
              {QA_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setInput(tpl.template)}
                  className="rounded-full bg-muted/50 hover:bg-primary/15 hover:text-primary px-3 py-1.5 text-xs transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* 输入区 */}
            <Card className="p-4 glass border-border/50">
              <div className="flex gap-3 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(input);
                    }
                  }}
                  placeholder="输入商品问题，例如：商品 Littleswan/小天鹅 TH100-HL02T 是洗衣机吗？"
                  rows={2}
                  className="flex-1 resize-none rounded-xl bg-background/60 border border-border/50 px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={() => handleSubmit(input)}
                  disabled={!input.trim() || isProcessing}
                  className="shrink-0 h-11 px-5 rounded-xl bg-primary text-primary-foreground flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  提交
                </button>
              </div>
            </Card>
          </div>

          {/* 右栏：状态面板 */}
          <div className="space-y-4">
            {/* KBOQA 状态 */}
            <Card className="p-5 glass border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">KBOQA 状态</span>
              </div>

              <div className="space-y-2">
                {(["idle", "receiving", "forwarding", "thinking", "replying", "done"] as KboqaState[]).map((s) => (
                  <div
                    key={s}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      kboqaState === s
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        kboqaState === s ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    {STATE_LABELS[s]}
                  </div>
                ))}
              </div>
            </Card>

            {/* 流程说明 */}
            <Card className="p-5 glass border-border/50">
              <span className="text-sm font-semibold mb-3 block">处理流程</span>
              <div className="space-y-3">
                {[
                  { step: "K", label: "知识检索", desc: "向量召回样本与商品" },
                  { step: "B", label: "规则判定", desc: "判断问题类型与策略" },
                  { step: "O", label: "组装上下文", desc: "拼接 Prompt 与检索结果" },
                  { step: "QA", label: "生成答案", desc: "调用大模型 API" },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                    </div>
                    {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 mt-2 ml-auto" />}
                  </div>
                ))}
              </div>
            </Card>

            {/* 最近结果 */}
            {lastResult && (
              <Card className="p-5 glass border-border/50">
                <span className="text-sm font-semibold mb-3 block">最近结果</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">答案类型</span>
                    <span className="font-medium">{lastResult.answerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">置信度</span>
                    <span className="font-medium">{(lastResult.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">推荐数</span>
                    <span className="font-medium">{lastResult.recommendations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trace ID</span>
                    <span className="font-mono text-[10px]">{lastResult.traceId.slice(-8)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/30">
                    <div className="text-muted-foreground mb-1">数据来源</div>
                    {lastResult.sourceDocs.map((src, i) => (
                      <div key={i} className="text-[11px] text-foreground/70">
                        · {src}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/** 消息气泡组件 */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-primary/15 px-4 py-2.5 text-sm border border-primary/20">
            {msg.content}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <User className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">同学A · {formatTime(msg.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-xl border border-dashed border-border/50 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground text-center">
          {msg.content}
          <span className="block mt-0.5 text-[10px] text-muted-foreground/50">{formatTime(msg.timestamp)}</span>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex justify-start gap-2">
      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-accent" />
      </div>
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-bl-md bg-accent/15 px-4 py-2.5 text-sm border border-accent/20">
          {msg.content}
          {msg.recommendations && msg.recommendations.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-foreground/80">推荐商品：</div>
              {msg.recommendations.map((rec) => (
                <a
                  key={rec.id}
                  href={rec.link}
                  className="flex items-center justify-between gap-2 rounded-lg bg-card/60 px-3 py-2 hover:bg-card transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{rec.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {rec.category} · ¥{rec.price} · {rec.reason}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground">同学B (KBOQA) · {formatTime(msg.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
