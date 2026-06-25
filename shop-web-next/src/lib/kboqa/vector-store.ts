import { embed } from "./embedding-client";
import { CATEGORY_SAMPLES, BRAND_SAMPLES, type EcomSample } from "./mock-data";

/**
 * 向量存储与相似度检索
 * 服务端专用 — 不会打包到前端
 *
 * 基于 ChineseEcomQA(1).jsonl 样本数据预建向量索引，
 * 用户提问时通过余弦相似度召回最相关样本。
 */

interface VectorEntry {
  sample: EcomSample;
  vector: number[];
}

// 全局向量索引缓存，避免重复构建
let vectorIndex: VectorEntry[] = [];
let indexBuilt = false;

/**
 * 计算余弦相似度
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * 预建向量索引
 * 服务启动后首次调用时执行，后续使用缓存
 * Embedding 服务不可用时自动降级，不影响大模型调用
 */
export async function buildVectorIndex(): Promise<void> {
  if (indexBuilt) return;

  const allSamples = [...CATEGORY_SAMPLES, ...BRAND_SAMPLES];
  try {
    vectorIndex = await Promise.all(
      allSamples.map(async (sample) => ({
        sample,
        vector: await embed(sample.prompt),
      })),
    );
  } catch (e) {
    console.warn("[KBOQA] Embedding 索引构建失败，降级为无向量模式:", e);
    vectorIndex = [];
  }
  indexBuilt = true;
}

/**
 * 检索 Top-K 最相似样本
 * 向量不可用时返回空数组
 */
export async function searchSamples(
  question: string,
  topK = 3,
): Promise<{ sample: EcomSample; score: number }[]> {
  if (!indexBuilt) {
    await buildVectorIndex();
  }

  if (vectorIndex.length === 0) return [];

  try {
    const qVec = await embed(question);
    return vectorIndex
      .map(({ sample, vector }) => ({
        sample,
        score: cosineSimilarity(qVec, vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } catch (e) {
    console.warn("[KBOQA] Embedding 检索失败，返回空结果:", e);
    return [];
  }
}
