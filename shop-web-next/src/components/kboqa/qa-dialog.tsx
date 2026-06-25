"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Send, ExternalLink, X, Sparkles } from "lucide-react";
import type { ChatMessage, KboqaState, KboqaResult } from "@/lib/kboqa/types";
import { QA_TEMPLATES } from "@/lib/kboqa/templates";
import { runKboqa, STATE_LABELS } from "@/lib/kboqa/orchestrator";

interface QaDialogProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function QaDialog({ open, onClose }: QaDialogProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [kboqaState, setKboqaState] = useState<KboqaState>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
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

      // 系统消息：开始处理
      const sysMsg: ChatMessage = {
        id: `msg-sys-${Date.now()}`,
        role: "system",
        content: "已收到你的问题，正在调用智能引擎分析...",
        timestamp: Date.now(),
        state: "forwarding",
      };
      setMessages((prev) => [...prev, sysMsg]);

      // 调用 KBOQA
      const result: KboqaResult = await runKboqa(question, setKboqaState);

      // 系统消息：处理完成
      const doneMsg: ChatMessage = {
        id: `msg-done-${Date.now()}`,
        role: "system",
        content: `KBOQA 处理完成 (置信度: ${(result.confidence * 100).toFixed(0)}%)`,
        timestamp: Date.now(),
        state: "done",
      };

      // 助手消息：回答
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

  const handleTemplate = (template: string) => {
    setInput(template);
  };

  const handleEnterFullPage = () => {
    onClose();
    router.push("/kboqa-chat");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-28 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] flex flex-col rounded-3xl glass shadow-2xl border border-border/60 overflow-hidden"
          style={{ maxHeight: "70vh" }}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-card/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">KBOQA 智能商品问答</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
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

          {/* 消息历史 */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px]">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                双击小人打开问答，选择模板或直接输入问题
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/15 px-3.5 py-2.5 text-sm">
                      {msg.content}
                      <span className="block mt-1 text-[10px] text-muted-foreground/70">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )}
                {msg.role === "system" && (
                  <div className="flex justify-center">
                    <div className="max-w-[90%] rounded-xl border border-dashed border-border/50 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground text-center">
                      {msg.content}
                      <span className="block mt-0.5 text-[10px] text-muted-foreground/50">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )}
                {msg.role === "assistant" && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-accent/15 px-3.5 py-2.5 text-sm border border-accent/20">
                      {msg.content}
                      <span className="block mt-1 text-[10px] text-muted-foreground/70">
                        {formatTime(msg.timestamp)}
                      </span>
                      {/* 商品推荐 */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-foreground/80">推荐商品：</div>
                          {msg.recommendations.map((rec) => (
                            <a
                              key={rec.id}
                              href={rec.link}
                              className="flex items-center justify-between gap-2 rounded-lg bg-card/60 px-2.5 py-2 hover:bg-card transition-colors group"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">{rec.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {rec.category} · ¥{rec.price}
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 模板选择 */}
          {messages.length === 0 && (
            <div className="px-5 pb-3">
              <div className="text-[10px] text-muted-foreground mb-2">预输入模板</div>
              <div className="flex flex-wrap gap-1.5">
                {QA_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplate(tpl.template)}
                    className="rounded-full bg-muted/50 hover:bg-primary/15 hover:text-primary px-3 py-1 text-xs transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 输入区 */}
          <div className="px-5 py-3 border-t border-border/40 bg-card/30">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(input);
                  }
                }}
                placeholder="输入商品问题..."
                rows={1}
                className="flex-1 resize-none rounded-xl bg-background/60 border border-border/50 px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors max-h-24"
              />
              <button
                onClick={() => handleSubmit(input)}
                disabled={!input.trim() || isProcessing}
                className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                aria-label="发送"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleEnterFullPage}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              进入完整问答界面
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
