// 类别映射工具类

export interface CategoryInfo {
  id: number                    // 数据库category_id
  yoloClassId: number           // YOLO class_id
  yoloClassName: string         // YOLO class name (例: class_0)
  englishName: string           // 英文名称
  chineseName: string           // 中文名称
  displayName: string           // 展示名称（中文为主）
  categoryTag: string           // 分类标签
  icon: string                  // 图标名称
  color?: string                // 主题色
}

export const CATEGORY_MAPPING: Record<string, CategoryInfo> = {
  'class_0': {
    id: 1,
    yoloClassId: 0,
    yoloClassName: 'class_0',
    englishName: 'Ashi Mashi snacks',
    chineseName: 'Ashi Mashi 零食',
    displayName: 'Ashi Mashi 零食',
    categoryTag: '混合零食',
    icon: 'mdi:food-variant',
    color: '#FF6B6B'
  },
  'class_1': {
    id: 2,
    yoloClassId: 1,
    yoloClassName: 'class_1',
    englishName: 'Chee pellet ketchup',
    chineseName: 'Chee pellet 番茄酱味',
    displayName: 'Chee pellet 番茄酱味',
    categoryTag: '膨化食品',
    icon: 'mdi:food',
    color: '#E74C3C'
  },
  'class_2': {
    id: 3,
    yoloClassId: 2,
    yoloClassName: 'class_2',
    englishName: 'Chee pellet vinegar',
    chineseName: 'Chee pellet 醋味',
    displayName: 'Chee pellet 醋味',
    categoryTag: '膨化食品',
    icon: 'mdi:food',
    color: '#9B59B6'
  },
  'class_3': {
    id: 4,
    yoloClassId: 3,
    yoloClassName: 'class_3',
    englishName: 'Cheetoz chili chips',
    chineseName: 'Cheetoz 辣椒味薯片',
    displayName: 'Cheetoz 辣椒味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#E67E22'
  },
  'class_4': {
    id: 5,
    yoloClassId: 4,
    yoloClassName: 'class_4',
    englishName: 'Cheetoz ketchup chips',
    chineseName: 'Cheetoz 番茄酱味薯片',
    displayName: 'Cheetoz 番茄酱味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#F39C12'
  },
  'class_5': {
    id: 6,
    yoloClassId: 5,
    yoloClassName: 'class_5',
    englishName: 'Cheetoz onion and parsley chips',
    chineseName: 'Cheetoz 洋葱香菜味薯片',
    displayName: 'Cheetoz 洋葱香菜味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#27AE60'
  },
  'class_6': {
    id: 7,
    yoloClassId: 6,
    yoloClassName: 'class_6',
    englishName: 'Cheetoz salty chips',
    chineseName: 'Cheetoz 咸味薯片',
    displayName: 'Cheetoz 咸味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#F1C40F'
  },
  'class_7': {
    id: 8,
    yoloClassId: 7,
    yoloClassName: 'class_7',
    englishName: 'Cheetoz snack 30g',
    chineseName: 'Cheetoz 零食 30g',
    displayName: 'Cheetoz 零食 30g',
    categoryTag: '混合零食',
    icon: 'mdi:package-variant',
    color: '#3498DB'
  },
  'class_8': {
    id: 9,
    yoloClassId: 8,
    yoloClassName: 'class_8',
    englishName: 'Cheetoz snack 90g',
    chineseName: 'Cheetoz 零食 90g',
    displayName: 'Cheetoz 零食 90g',
    categoryTag: '混合零食',
    icon: 'mdi:package-variant-closed',
    color: '#2980B9'
  },
  'class_9': {
    id: 10,
    yoloClassId: 9,
    yoloClassName: 'class_9',
    englishName: 'Cheetoz vinegar chips',
    chineseName: 'Cheetoz 醋味薯片',
    displayName: 'Cheetoz 醋味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#8E44AD'
  },
  'class_10': {
    id: 11,
    yoloClassId: 10,
    yoloClassName: 'class_10',
    englishName: 'Cheetoz wheelsnack',
    chineseName: 'Cheetoz 车轮零食',
    displayName: 'Cheetoz 车轮零食',
    categoryTag: '膨化食品',
    icon: 'mdi:circle-outline',
    color: '#16A085'
  },
  'class_11': {
    id: 12,
    yoloClassId: 11,
    yoloClassName: 'class_11',
    englishName: 'Maz Maz ketchup chips',
    chineseName: 'Maz Maz 番茄酱味薯片',
    displayName: 'Maz Maz 番茄酱味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#C0392B'
  },
  'class_12': {
    id: 13,
    yoloClassId: 12,
    yoloClassName: 'class_12',
    englishName: 'Maz Maz potato sticks',
    chineseName: 'Maz Maz 土豆条',
    displayName: 'Maz Maz 土豆条',
    categoryTag: '薯条',
    icon: 'mdi:fries',
    color: '#D35400'
  },
  'class_13': {
    id: 14,
    yoloClassId: 13,
    yoloClassName: 'class_13',
    englishName: 'Maz Maz salty chips',
    chineseName: 'Maz Maz 咸味薯片',
    displayName: 'Maz Maz 咸味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#F39C12'
  },
  'class_14': {
    id: 15,
    yoloClassId: 14,
    yoloClassName: 'class_14',
    englishName: 'Maz Maz vinegar chips',
    chineseName: 'Maz Maz 醋味薯片',
    displayName: 'Maz Maz 醋味薯片',
    categoryTag: '薯片',
    icon: 'mdi:food-apple',
    color: '#9B59B6'
  },
  'class_15': {
    id: 16,
    yoloClassId: 15,
    yoloClassName: 'class_15',
    englishName: 'Mini Lina',
    chineseName: 'Mini Lina 饼干',
    displayName: 'Mini Lina 饼干',
    categoryTag: '饼干',
    icon: 'mdi:cookie',
    color: '#E67E22'
  },
  'class_16': {
    id: 17,
    yoloClassId: 16,
    yoloClassName: 'class_16',
    englishName: 'Minoo cream biscuit',
    chineseName: 'Minoo 奶油饼干',
    displayName: 'Minoo 奶油饼干',
    categoryTag: '饼干',
    icon: 'mdi:cookie',
    color: '#F39C12'
  },
  'class_17': {
    id: 18,
    yoloClassId: 17,
    yoloClassName: 'class_17',
    englishName: 'Naderi mini cookie',
    chineseName: 'Naderi 迷你曲奇',
    displayName: 'Naderi 迷你曲奇',
    categoryTag: '饼干',
    icon: 'mdi:cookie',
    color: '#D35400'
  },
  'class_18': {
    id: 19,
    yoloClassId: 18,
    yoloClassName: 'class_18',
    englishName: 'Naderi mini wafer',
    chineseName: 'Naderi 迷你威化',
    displayName: 'Naderi 迷你威化',
    categoryTag: '威化',
    icon: 'mdi:cookie-outline',
    color: '#E74C3C'
  }
}

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
