import { EtfCategory } from '../types';

/**
 * 行业与主题关键词自动分类映射规则
 * 优先级顺序严格定义：特定子行业（如创新药）优先于宽泛行业（如医药）
 */
const CATEGORY_RULES: { category: EtfCategory; keywords: string[] }[] = [
  // 1. 创新药 (优先于通用医药)
  {
    category: '创新药',
    keywords: ['创新药', '生物医药', '生物科技', '疫苗', '恒生医疗', '港股通医疗', '港股通创新药'],
  },
  // 2. 医药
  {
    category: '医药',
    keywords: ['医药', '医疗', '中药', '医疗器械', '健康', '医保', '制药'],
  },
  // 3. 半导体
  {
    category: '半导体',
    keywords: ['半导体', '芯片', '集成电路', '科创芯片', '半导体设备'],
  },
  // 4. 通信
  {
    category: '通信',
    keywords: ['通信', '5G', '信息技术', '光模块', '电信', '物联网', '光电'],
  },
  // 5. 军工
  {
    category: '军工',
    keywords: ['军工', '国防', '航天', '航空', '船舶', '通用航空', '军工龙头'],
  },
  // 6. 人工智能/软件
  {
    category: '人工智能/软件',
    keywords: [
      '人工智能',
      'AI',
      '软件',
      '云计算',
      '大数据',
      '算力',
      '计算机',
      '信创',
      '网安',
      '互联网',
      '数据要素',
      '智能车',
    ],
  },
  // 7. 新能源/电力
  {
    category: '新能源/电力',
    keywords: [
      '新能源',
      '光伏',
      '电池',
      '风电',
      '电力',
      '绿电',
      '储能',
      '碳中和',
      '核电',
      '水电',
      '电动车',
    ],
  },
  // 8. 机械制造
  {
    category: '机械制造',
    keywords: ['机械', '机器人', '工业母机', '高端装备', '装备', '工业', '自动化', '机床'],
  },
  // 9. 消费
  {
    category: '消费',
    keywords: [
      '消费',
      '食品',
      '饮料',
      '白酒',
      '酒',
      '家电',
      '养殖',
      '畜牧',
      '农业',
      '旅游',
      '零售',
      '免税',
      '乳品',
    ],
  },
  // 10. 金融地产
  {
    category: '金融地产',
    keywords: ['银行', '证券', '券商', '保险', '地产', '房地产', '金融', '非银', '建材'],
  },
  // 11. 红利低波
  {
    category: '红利低波',
    keywords: ['红利', '股息', '低波', '高股息', '价值', '央企红利', '国企红利'],
  },
  // 12. 周期资源
  {
    category: '周期资源',
    keywords: [
      '煤炭',
      '有色',
      '钢铁',
      '稀土',
      '化工',
      '石油',
      '油气',
      '贵金属',
      '铜',
      '矿业',
      '铝',
      '资源',
    ],
  },
  // 13. 传媒娱乐
  {
    category: '传媒娱乐',
    keywords: ['传媒', '游戏', '动漫', '影视', '文娱', '电竞', '快手'],
  },
  // 14. 跨境海外
  {
    category: '跨境海外',
    keywords: [
      '纳指',
      '标普',
      '德国',
      '日经',
      '恒生科技',
      '美股',
      '法国',
      '越南',
      '印度',
      '道琼斯',
      '纳斯达克',
      '东证',
      '海外',
    ],
  },
  // 15. 宽基指数
  {
    category: '宽基指数',
    keywords: [
      '沪深300',
      '中证500',
      '中证1000',
      '中证2000',
      '中证A500',
      '上证50',
      '创业板',
      '科创50',
      '科创100',
      '科创板',
      'A500',
      'A50',
      '深证100',
      '双创50',
      '上证指数',
    ],
  },
  // 16. 债券货币
  {
    category: '债券货币',
    keywords: ['国债', '可转债', '转债', '短融', '货币', '政金债', '信用债', '城投债', '特国债'],
  },
  // 17. 大宗商品
  {
    category: '大宗商品',
    keywords: ['黄金ETF', '豆粕', '有色金属', '上海金', '原油', '白银'],
  },
];

/**
 * 根据ETF名称和代码自动推断其行业分类
 * @param name ETF名称 (例如: "恒生创新药ETF", "军工龙头ETF", "半导体ETF")
 * @param code ETF代码 (可选)
 * @param existingCategory 现有分类 (可选)
 * @returns 匹配的 EtfCategory
 */
export function classifyEtfByName(
  name: string,
  code?: string,
  existingCategory?: EtfCategory
): EtfCategory {
  if (!name) return existingCategory || '宽基指数';

  const cleanName = name.trim();

  // 按规则逐一匹配关键词
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (cleanName.includes(kw)) {
        return rule.category;
      }
    }
  }

  // 若已有分类且有效，保留原分类
  if (existingCategory && existingCategory !== '全部') {
    return existingCategory;
  }

  // 默认归入宽基指数
  return '宽基指数';
}
