/**
 * 大模型 API 调用封装
 * 服务端专用 — 不会打包到前端
 */

interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LlmResponse {
  choices: { message: { content: string } }[];
}

/**
 * 调用大模型 API（OpenAI 兼容格式）
 *
 * 支持的模型：OpenAI / 通义千问 / 智谱 GLM / DeepSeek 等
 * 只需在 .env.local 中配置对应的 LLM_API_BASE 和 LLM_MODEL
 */
export async function callLlm(
  userPrompt: string,
  systemPrompt: string,
  options?: { temperature?: number; timeout?: number },
): Promise<string> {
  const temperature = options?.temperature ?? 0.3;
  const timeout = options?.timeout ?? 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${process.env.LLM_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ] as LlmMessage[],
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API 错误 ${res.status}: ${errText}`);
    }

    const data: LlmResponse = await res.json();
    return data.choices[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}
