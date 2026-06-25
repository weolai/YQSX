import { NextRequest, NextResponse } from "next/server";
import { callLlm } from "@/lib/kboqa/llm-client";
import { searchSamples, buildVectorIndex } from "@/lib/kboqa/vector-store";
import {
  MOCK_RECOMMENDATIONS,
  CATEGORY_SAMPLES,
  BRAND_SAMPLES,
  type EcomSample,
} from "@/lib/kboqa/mock-data";
import type { KboqaResult } from "@/lib/kboqa/types";

/**
 * KBOQA 问答 API 路由
 *
 * 流程：K(向量检索) → B(规则判定) → O(组装Prompt) → QA(调用大模型)
 *
 * POST /api/kboqa/question
 * Body: { question: string }
 * Response: KboqaResult
 */
export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "缺少 question 参数" }, { status: 400 });
    }

    // K - 向量检索样本
    await buildVectorIndex();
    const retrieved = await searchSamples(question);

    // B - 规则判定
    const isBoolean = /是.*吗|属于.*吗/.test(question);
    const isDetail = /查看.*详情|详情|信息/.test(question);
    const isBrand = /主营业务|品牌/.test(question);
    const needsRecommendations = /推荐|帮我找|同类/.test(question);

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

    const userPrompt = question;

    // QA - 生成答案
    let answer: string;
    let confidence: number;
    let sourceDocs: string[];

    if (retrieved.length > 0 && retrieved[0].score > 0.9) {
      // 高置信度：直接使用样本答案
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
      recommendations: needsRecommendations ? MOCK_RECOMMENDATIONS : [],
      sourceDocs,
      traceId: `kboqa-${Date.now()}`,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `KBOQA 处理失败: ${message}` }, { status: 500 });
  }
}
