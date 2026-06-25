import type { QaTemplate } from "./types";

/**
 * 预输入模板
 * 基于 ChineseEcomQA(1).jsonl 的问答模式设计
 */
export const QA_TEMPLATES: QaTemplate[] = [
  {
    id: "category-check",
    label: "品类判断",
    template: "商品 Littleswan/小天鹅 TH100-HL02T 是洗衣机吗？",
    category: "category",
    description: "判断商品是否属于某个细粒度品类",
  },
  {
    id: "brand-info",
    label: "品牌知识",
    template: "BAI/菜百首饰品牌的主营业务是什么？",
    category: "brand",
    description: "查询品牌的基本信息和主营类目",
  },
  {
    id: "recommend",
    label: "商品推荐",
    template: "帮我推荐机油滤芯类商品",
    category: "recommend",
    description: "根据品类或需求推荐相关商品",
  },
  {
    id: "product-link",
    label: "商品链接",
    template: "查看 MANN FILTER/曼牌滤清器 W712/83M 的详情",
    category: "link",
    description: "获取商品的详情页链接",
  },
];
