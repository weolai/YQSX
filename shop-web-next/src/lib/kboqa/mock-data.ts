import type { ProductRecommendation } from "./types";

/**
 * 样本问答数据
 * 来源：ChineseEcomQA(1).jsonl
 * 用于模拟 KBOQA 的知识检索层召回结果
 */
export interface EcomSample {
  prompt: string;
  gt: string;
  task: string;
}

/** 品类判断样本 (task: CC) */
export const CATEGORY_SAMPLES: EcomSample[] = [
  {
    prompt: "商品 Littleswan/小天鹅 TH100-HL02T 是洗衣机吗？",
    gt: "否",
    task: "CC",
  },
  {
    prompt: "商品 MANN FILTER/曼牌滤清器 W712/83M 是机油滤芯吗？",
    gt: "是",
    task: "CC",
  },
  {
    prompt: "商品 Panasonic/松下 CR2032 是手机电池吗？",
    gt: "否",
    task: "CC",
  },
];

/** 品牌知识样本 (task: BC) */
export const BRAND_SAMPLES: EcomSample[] = [
  {
    prompt: "BAI/菜百首饰品牌的主营业务是什么？",
    gt: "BAI/菜百首饰品牌的主营业务是投资贵金属，主要包括黄金金条、珠宝、钻石、翡翠等。",
    task: "BC",
  },
  {
    prompt: "万家乐的主营业务是什么？",
    gt: "万家乐的主营业务是大家电，特别是在厨房热水器领域有多种产品。",
    task: "BC",
  },
  {
    prompt: "中国黄金有哪些产品？",
    gt: "中国黄金提供9999足金元宝投资金条，重量范围从2克到100克不等。",
    task: "BC",
  },
];

/** Mock 商品推荐数据 */
export const MOCK_RECOMMENDATIONS: ProductRecommendation[] = [
  {
    id: "p001",
    name: "MANN FILTER/曼牌滤清器 W712/83M",
    category: "机油滤芯",
    price: 89.9,
    link: "/products/p001",
    reason: "与查询品类高度匹配",
  },
  {
    id: "p002",
    name: "Bosch/博世 机油滤清器 0986452046",
    category: "机油滤芯",
    price: 65.0,
    link: "/products/p002",
    reason: "同品类热销商品",
  },
  {
    id: "p003",
    name: "Mahle/马勒 机油滤芯 OC205",
    category: "机油滤芯",
    price: 72.5,
    link: "/products/p003",
    reason: "同品类高性价比",
  },
];
