/**
 * Embedding API 调用封装
 * 服务端专用 — 不会打包到前端
 */

interface EmbeddingResponse {
  data: { embedding: number[] }[];
}

/**
 * 将文本编码为向量
 *
 * 使用 OpenAI 兼容的 Embedding API
 */
export async function embed(text: string, timeout = 15000): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${process.env.EMBEDDING_API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL,
        input: text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embedding API 错误 ${res.status}: ${errText}`);
    }

    const data: EmbeddingResponse = await res.json();
    return data.data[0]?.embedding ?? [];
  } finally {
    clearTimeout(timer);
  }
}
