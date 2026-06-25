// 类别映射工具类

import { CategoryInfo, CATEGORY_MAPPING } from "./category-mapping-data";

export type { CategoryInfo } from "./category-mapping-data";
export { CATEGORY_MAPPING } from "./category-mapping-data";

// 工具函数
export const getCategoryByClassName = (className: string): CategoryInfo | null => {
  return CATEGORY_MAPPING[className] || null
}

export const getCategoryById = (id: number): CategoryInfo | null => {
  return Object.values(CATEGORY_MAPPING).find(cat => cat.id === id) || null
}

export const getCategoryByYoloClassId = (classId: number): CategoryInfo | null => {
  return Object.values(CATEGORY_MAPPING).find(cat => cat.yoloClassId === classId) || null
}

// 获取所有类别列表
export const getAllCategories = (): CategoryInfo[] => {
  return Object.values(CATEGORY_MAPPING)
}

// 按分类标签分组
export const getCategoriesByTag = (tag: string): CategoryInfo[] => {
  return Object.values(CATEGORY_MAPPING).filter(cat => cat.categoryTag === tag)
}

// 获取唯一的分类标签列表（用于商品列表筛选去重）
export const getUniqueCategoryTags = (): { tag: string; icon: string; color?: string }[] => {
  const tags = new Map<string, { tag: string; icon: string; color?: string }>()
  Object.values(CATEGORY_MAPPING).forEach(cat => {
    if (!tags.has(cat.categoryTag)) {
      tags.set(cat.categoryTag, { tag: cat.categoryTag, icon: cat.icon, color: cat.color })
    }
  })
  return Array.from(tags.values())
}
