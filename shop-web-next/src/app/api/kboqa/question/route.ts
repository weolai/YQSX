import { NextRequest, NextResponse } from "next/server";
import { callLlm } from "@/lib/kboqa/llm-client";
import { searchSamples, buildVectorIndex } from "@/lib/kboqa/vector-store";
import {
  CATEGORY_SAMPLES,
  BRAND_SAMPLES,
  type EcomSample,
} from "@/lib/kboqa/mock-data";
import type { KboqaResult, ProductRecommendation } from "@/lib/kboqa/types";
import type { Product } from "@/types";

/**
 * 校验 JWT token 格式与过期时间
 *
 * 仅做基础格式校验(三段式)+ 过期时间判断,不验证签名
 * 签名验证由 Gateway 统一完成,后端校验逻辑复用问题标记为 Sprint 2 加固项
 *
 * @returns true 表示 token 有效,否则返回错误 NextResponse
 */
function validateToken(token: string | undefined): true | NextResponse {
  if (!token) {
    return NextResponse.json({ code: 401, msg: "未登录,请先登录后再使用问答功能" }, { status: 401 });
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return NextResponse.json({ code: 401, msg: "token 格式无效" }, { status: 401 });
  }

  try {
    const payloadStr = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr) as { exp?: number };
    if (payload.exp !== undefined && Date.now() / 1000 >= payload.exp) {
      return NextResponse.json({ code: 401, msg: "token 已过期,请重新登录" }, { status: 401 });
    }
    return true;
  } catch {
    return NextResponse.json({ code: 401, msg: "token 解析失败" }, { status: 401 });
  }
}

/**
 * 从后端 Gateway 拉取真实商品列表
 */
async function fetchRealProducts(token: string): Promise<Product[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  try {
    const res = await fetch(`${baseUrl}/products/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn(`[KBOQA] 获取商品列表失败: ${res.status}`);
      return [];
    }
    const data = (await res.json()) as Product[] | { data?: Product[] };
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as { data?: Product[] }).data)) return (data as { data: Product[] }).data;
    return [];
  } catch (e) {
    console.warn("[KBOQA] 获取商品列表异常:", e);
    return [];
  }
}

/**
 * 根据问题从真实商品中筛选推荐项
 *
 * 匹配策略：
 * 1. 优先匹配问题中包含的商品名或品类名（长度越长权重越高）
 * 2. 无明确匹配时返回前 topK 个商品作为热门推荐兜底
 */
function buildRecommendations(
  products: Product[],
  question: string,
  topK = 3,
): ProductRecommendation[] {
  if (products.length === 0) return [];

  const lowerQuestion = question.toLowerCase();
  const stopWords = new Set(["推荐", "帮我", "帮我找", "同类", "商品", "东西", "一下", "一个", "有没有", "哪些", "随便", "几个"]);

  // 从问题中提取候选关键词（2-6 字连续子串，排除停用词与纯数字）
  const candidates = new Set<string>();
  for (let len = Math.min(6, lowerQuestion.length); len >= 2; len--) {
    for (let i = 0; i <= lowerQuestion.length - len; i++) {
      const slice = lowerQuestion.slice(i, i + len);
      if (!stopWords.has(slice) && !/^\d+$/.test(slice)) {
        candidates.add(slice);
      }
    }
  }

  const scored = products
    .map((p) => {
      const name = p.name.toLowerCase();
      const category = (p.categoryName || "").toLowerCase();
      let score = 0;

      candidates.forEach((kw) => {
        if (name.includes(kw)) {
          score += kw.length * 2;
        }
        if (category.includes(kw)) {
          score += kw.length;
        }
      });

      return { product: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 无明确匹配时，返回前 topK 个商品作为热门推荐兜底
  const finalList = scored.length > 0 ? scored : products.slice(0, topK).map((p) => ({ product: p, score: 0 }));

  return finalList.map(({ product }) => ({
    id: product.id,
    name: product.name,
    category: product.categoryName || "零食",
    price: product.price,
    link: `/products/${product.id}`,
    reason: scored.length > 0 ? "与查询需求匹配" : "热门商品",
  }));
}

/**
 * 调用 Python Neo4j 知识图谱问答服务
 *
 * 当图谱能命中时直接返回结构化答案；未命中时返回 null，由后续 LLM 兜底。
 */
async function callKgApi(question: string, token?: string) {
  const kgApiUrl = process.env.KG_QA_API_URL || "http://127.0.0.1:5000/query";
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(kgApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      console.warn(`[KBOQA] KG API 返回非 200: ${res.status}`);
      return null;
    }
    return (await res.json()) as {
      hit: boolean;
      answer: string | null;
      source: string;
      intent?: string;
      matched_category?: string | null;
      matched_product?: string | null;
      matched_brand?: string | null;
    } | null;
  } catch (e) {
    console.warn("[KBOQA] KG API 调用失败:", e);
    return null;
  }
}

/**
 * 从 KG API 获取推荐商品
 */
async function fetchKgRecommendations(
  matchedCategory?: string | null,
  matchedProduct?: string | null,
  token?: string,
): Promise<ProductRecommendation[]> {
  const kgApiUrl = process.env.KG_QA_API_URL || "http://127.0.0.1:5000/query";
  const recommendUrl = kgApiUrl.replace(/\/query$/, "/recommend");
  if (!matchedCategory && !matchedProduct) return [];
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(recommendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        category: matchedCategory,
        product: matchedProduct,
        top_k: 3,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { id: number; name: string; price: number }[] };
    return (data.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      category: matchedCategory || matchedProduct || "零食",
      price: item.price,
      link: `/products/${item.id}`,
      reason: "知识图谱关联推荐",
    }));
  } catch (e) {
    console.warn("[KBOQA] KG 推荐接口调用失败:", e);
    return [];
  }
}

/**
 * KBOQA 问答 API 路由
 *
 * 流程：
 *   1. 优先查询 Neo4j 知识图谱 (Python /query)
 *   2. 命中则直接返回答案 + 图谱推荐
 *   3. 未命中则走原流程: K(向量检索) → B(规则判定) → O(组装Prompt) → QA(调用大模型)
 *
 * 鉴权:必须携带有效 JWT(校验格式 + 过期时间)
 *   - token 由 Authorization: Bearer <token> 或 cookie 提供
 *   - 签名验证由 Gateway 完成,此路由仅做轻量级过期检查防滥用
 *
 * POST /api/kboqa/question
 * Body: { question: string }
 * Response: KboqaResult
 */
export async function POST(req: NextRequest) {
  try {
    // 鉴权:校验 token 格式与过期时间
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const token = bearerToken || req.cookies.get("token")?.value;
    const authResult = validateToken(token);
    if (authResult !== true) {
      return authResult;
    }

    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "缺少 question 参数" }, { status: 400 });
    }
    if (question.length > 200) {
      return NextResponse.json({ error: "问题长度不能超过 200 字符" }, { status: 400 });
    }

    // ===== 第一步：优先查询 Neo4j 知识图谱 =====
    const kgResult = await callKgApi(question, token);
    if (kgResult?.hit && kgResult.answer) {
      const kgRecommendations = await fetchKgRecommendations(
        kgResult.matched_category,
        kgResult.matched_product,
        token,
      );
      const result: KboqaResult = {
        answer: kgResult.answer,
        answerType: "text",
        confidence: 0.95,
        recommendations: kgRecommendations,
        sourceDocs: ["Neo4j 知识图谱"],
        traceId: `kboqa-kg-${Date.now()}`,
      };
      return NextResponse.json(result);
    }

    // K - 向量检索样本
    await buildVectorIndex();
    const retrieved = await searchSamples(question);

    // B - 规则判定
    const isBoolean = /是.*吗|属于.*吗/.test(question);
    const isDetail = /查看.*详情|详情|信息/.test(question);
    const isBrand = /主营业务|品牌/.test(question);
    const needsRecommendations = /推荐|帮我找|同类/.test(question);

    // 推荐类问题：拉取真实商品列表，作为回答约束与数据源
    let realProducts: Product[] = [];
    if (needsRecommendations && token) {
      realProducts = await fetchRealProducts(token);
    }
    const recommendations = buildRecommendations(realProducts, question, 3);

    // O - 组装 few-shot Prompt
    // 按问题类型选择样本，避免"是/否"类样本干扰详情类问题
    let fewShotSamples: EcomSample[];
    if (retrieved.length > 0) {
      fewShotSamples = retrieved.map((r) => r.sample);
    } else if (isBoolean) {
      fewShotSamples = CATEGORY_SAMPLES;
    } else {
      fewShotSamples = BRAND_SAMPLES;
    }

    const fewShot = fewShotSamples
      .map((s) => `问题：${s.prompt}\n回答：${s.gt}`)
      .join("\n\n");

    // 根据问题类型定制 system prompt
    let systemPrompt: string;

    if (isBoolean) {
      systemPrompt = [
        "你是商品品类问答助手。",
        "请根据以下示例的风格，只用「是」或「否」回答，不要额外解释。",
        "",
        fewShot,
      ].join("\n");
    } else if (isDetail) {
      systemPrompt = [
        "你是商品信息助手。",
        "请用简洁的结构化格式回答商品关键信息，不超过5行。",
        "每行一个要点，格式：- 属性：值",
        "",
        "参考示例风格：",
        fewShot,
      ].join("\n");
    } else if (isBrand) {
      systemPrompt = [
        "你是品牌知识助手。",
        "回答要简洁准确，不超过2句话。",
        "",
        "参考示例风格：",
        fewShot,
      ].join("\n");
    } else {
      systemPrompt = [
        "你是商品问答助手。",
        "回答要简洁准确，不超过3句话，贴近以下示例风格。",
        "",
        fewShot,
      ].join("\n");
    }

    // 推荐类问题追加约束：只能基于真实商品列表回答，禁止编造
    if (needsRecommendations) {
      const productList =
        realProducts.length > 0
          ? realProducts
              .map((p) => `- ${p.name}（${p.categoryName || "零食"}，¥${p.price}，编号 ${p.id}）`)
              .join("\n")
          : "（暂无可用商品数据）";
      systemPrompt += [
        "",
        "==== 真实商品清单（回答时必须严格基于此清单）====",
        productList,
        "============================================",
        "规则：",
        "1. 只能推荐上述清单中真实存在的商品，禁止编造任何商品名称、价格或编号。",
        "2. 如果清单中无匹配商品，请明确回答：\"暂未找到相关商品，你可以换个关键词试试。\"",
        "3. 推荐最多不超过 3 个商品，并说明推荐理由。",
      ].join("\n");
    }

    const userPrompt = question;

    // QA - 生成答案
    let answer: string;
    let confidence: number;
    let sourceDocs: string[];

    if (retrieved.length > 0 && retrieved[0].score > 0.9 && !needsRecommendations) {
      // 高置信度：直接使用样本答案（推荐类问题不走此分支，避免样本答案覆盖真实商品）
      answer = retrieved[0].sample.gt;
      confidence = retrieved[0].score;
      sourceDocs = [`ChineseEcomQA样本 [task: ${retrieved[0].sample.task}] (向量匹配)`];
    } else if (process.env.LLM_API_KEY) {
      // 调用大模型生成
      answer = await callLlm(userPrompt, systemPrompt);
      confidence = retrieved.length > 0 ? retrieved[0].score * 0.8 : 0.6;
      sourceDocs =
        retrieved.length > 0
          ? ["大模型API生成", `ChineseEcomQA样本 [task: ${retrieved[0].sample.task}] (参考)`]
          : ["大模型API生成"];
    } else {
      // API Key 未配置，样本兜底
      answer =
        retrieved.length > 0
          ? retrieved[0].sample.gt
          : "暂无相关信息，请配置大模型 API 或尝试更具体的提问。";
      confidence = retrieved.length > 0 ? retrieved[0].score * 0.7 : 0.3;
      sourceDocs =
        retrieved.length > 0
          ? [`样本兜底 [task: ${retrieved[0].sample.task}]`]
          : ["无数据源"];
    }

    const result: KboqaResult = {
      answer,
      answerType: isBoolean ? "boolean" : needsRecommendations ? "recommendation" : "text",
      confidence,
      recommendations,
      sourceDocs,
      traceId: `kboqa-${Date.now()}`,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `KBOQA 处理失败: ${message}` }, { status: 500 });
  }
}
