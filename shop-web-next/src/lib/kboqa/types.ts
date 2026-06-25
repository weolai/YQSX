/**
 * KBOQA 问答系统类型定义
 */

/** 互动小人 / 系统处理状态 */
export type KboqaState =
  | "idle" // 空闲待命
  | "receiving" // 收到同学A的消息
  | "forwarding" // 正在转交给同学B
  | "thinking" // KBOQA 生成中
  | "replying" // 结果已生成，准备回传
  | "done"; // 完成

/** 消息角色 */
export type MessageRole = "user" | "system" | "assistant";

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** 触发该消息时的 KBOQA 状态 */
  state?: KboqaState;
  /** 附带的商品推荐 */
  recommendations?: ProductRecommendation[];
}

/** 商品推荐项 */
export interface ProductRecommendation {
  id: string;
  name: string;
  category: string;
  price: number;
  link: string;
  reason: string;
}

/** 预输入模板 */
export interface QaTemplate {
  id: string;
  label: string;
  template: string;
  category: "category" | "brand" | "recommend" | "link";
  description: string;
}

/** KBOQA 处理结果 */
export interface KboqaResult {
  answer: string;
  answerType: "boolean" | "text" | "recommendation";
  confidence: number;
  recommendations: ProductRecommendation[];
  sourceDocs: string[];
  traceId: string;
}
