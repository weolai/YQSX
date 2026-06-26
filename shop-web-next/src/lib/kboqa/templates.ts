import type { QaTemplate } from "./types";

/**
 * 预输入模板
 * 基于 shop-product 数据库真实商品/类目数据生成，贴合当前项目内容
 */
export const QA_TEMPLATES: QaTemplate[] = [
  {
    id: "category-check",
    label: "品类判断",
    template: "Ashi Mashi 经典零食 属于哪个类目？",
    category: "category",
    description: "查询商品所属类目",
  },
  {
    id: "product-info",
    label: "商品属性",
    template: "Cheetoz 辣椒味薯片 的价格是多少？",
    category: "brand",
    description: "查询商品价格、库存、销量等属性",
  },
  {
    id: "recommend",
    label: "商品推荐",
    template: "帮我推荐 Cheetoz 番茄酱味薯片 类目下的商品",
    category: "recommend",
    description: "根据类目推荐相关商品",
  },
  {
    id: "price-filter",
    label: "价格筛选",
    template: "帮我推荐价格不超过 10 元的 Maz Maz 类商品",
    category: "link",
    description: "按价格上限筛选商品",
  },
];
