import type { KboqaResult, KboqaState } from "./types";

/**
 * KBOQA 前端编排层
 *
 * 负责驱动小人状态动画，并通过 /api/kboqa/question 调用服务端 KBOQA 引擎。
 * 服务端负责：向量检索 → 规则判定 → 组装 Prompt → 调用大模型 API
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 执行 KBOQA 问答流程
 *
 * @param question 用户问题
 * @param onStateChange 状态回调，用于驱动小人动画
 * @returns KBOQA 处理结果
 */
export async function runKboqa(
  question: string,
  onStateChange: (state: KboqaState) => void,
): Promise<KboqaResult> {
  // K - 知识检索（服务端向量检索）
  onStateChange("receiving");
  await delay(300);

  // B - 规则判定（服务端处理）
  onStateChange("forwarding");
  await delay(300);

  // O + QA - 组装 + 生成（服务端调用大模型）
  onStateChange("thinking");

  const res = await fetch("/api/kboqa/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `KBOQA 请求失败 (${res.status})`);
  }

  const result: KboqaResult = await res.json();

  // 回传结果
  onStateChange("replying");
  await delay(200);
  onStateChange("done");

  return result;
}

/** 状态文案映射 */
export const STATE_LABELS: Record<KboqaState, string> = {
  idle: "空闲待命",
  receiving: "接收问题中",
  forwarding: "分析问题类型",
  thinking: "生成回答中",
  replying: "整理推荐结果",
  done: "完成",
};
