export interface EtfNameFilterState {
  nameTheme: string; // '全部' 或具体主题标签 id
  fundIssuer: string; // '全部' 或基金公司简称 (如 '华夏', '易方达')
  excludeQuery: string; // 空格/逗号分隔的名称排除词
}

export const DEFAULT_NAME_FILTER: EtfNameFilterState = {
  nameTheme: '全部',
  fundIssuer: '全部',
  excludeQuery: '',
};

// 常见A股ETF基金管理人（按字长降序排列，防止如华泰柏瑞/华泰、国联安/国联、工银瑞信/工银误匹配）
export const FUND_ISSUERS: string[] = [
  '华泰柏瑞',
  '景顺长城',
  '工银瑞信',
  '浦银安盛',
  '国寿安保',
  '西藏东财',
  '民生加银',
  '西部利得',
  '红土创新',
  '创金合信',
  '中信建投',
  '前海开源',
  '汇添富',
  '国联安',
  '海富通',
  '易方达',
  '景顺',
  '华夏',
  '博时',
  '南方',
  '广发',
  '国泰',
  '富国',
  '嘉实',
  '鹏华',
  '天弘',
  '华宝',
  '银华',
  '招商',
  '工银',
  '华安',
  '平安',
  '大成',
  '万家',
  '永赢',
  '建信',
  '东财',
  '浦银',
  '国联',
  '中银',
  '兴业',
  '融通',
  '国寿',
  '华富',
  '摩根',
  '泰康',
  '申万',
  '农银',
  '中金',
  '财通',
  '国金',
  '浙商',
  '交银',
  '兴银',
  '鑫元',
  '宏利',
  '贝莱德',
  '东海',
  '东吴',
  '中邮',
  '方正',
  '长盛',
  '华泰',
  '兴全',
  '诺安',
  '银河',
  '长城',
  '光大',
  '中信',
  '华商',
  '信达',
  '新华',
  '德邦',
  '中欧',
  '华润',
  '国投',
];

export interface NameThemeRule {
  id: string;
  label: string;
  keywords: string[];
}

export const NAME_THEME_RULES: NameThemeRule[] = [
  { id: '科创', label: '科创板', keywords: ['科创'] },
  { id: '创业板', label: '创业板', keywords: ['创业'] },
  { id: '港股恒生', label: '港股/恒生', keywords: ['港股', '恒生'] },
  { id: '芯片半导体', label: '芯片/半导体', keywords: ['芯片', '半导体', '集成电路'] },
  { id: '人工智能', label: 'AI/算力/机器人', keywords: ['人工智能', 'ai', '算力', '机器人', '云计算', '大数据', '软件'] },
  { id: '红利低波', label: '红利/高股息', keywords: ['红利', '股息', '低波'] },
  { id: '沪深300', label: '沪深300', keywords: ['300'] },
  { id: '中证A500', label: '中证A500/A50', keywords: ['a500', 'a50'] },
  { id: '中证500_1000', label: '中证500/1000/2000', keywords: ['500', '1000', '2000'] },
  { id: '上证50', label: '上证50/180', keywords: ['上证50', '上证180', '上证指数'] },
  { id: '医药创新药', label: '创新药/医疗', keywords: ['创新药', '医药', '医疗', '生物', '中药'] },
  { id: '银行', label: '银行', keywords: ['银行'] },
  { id: '证券保险', label: '证券/保险/金融', keywords: ['证券', '券商', '金融', '保险'] },
  { id: '新能源光伏', label: '光伏/电池/新能源', keywords: ['光伏', '电池', '新能源', '储能', '风电', '电力'] },
  { id: '军工航天', label: '军工/航天', keywords: ['军工', '国防', '航天', '航空', '通用航空'] },
  { id: '黄金资源', label: '黄金/有色/煤炭', keywords: ['黄金', '有色', '稀土', '煤炭', '铜', '矿业', '油气', '石油'] },
  { id: '消费白酒', label: '消费/白酒/食品', keywords: ['消费', '白酒', '酒', '食品', '饮料', '家电', '旅游'] },
  { id: '跨境美股', label: '纳指/标普/日经', keywords: ['纳指', '纳斯达克', '标普', '道琼斯', '日经', '德国', '法国'] },
  { id: '债券货币', label: '国债/转债/货币', keywords: ['国债', '转债', '政金债', '短融', '货币', '信用债'] },
  { id: '增强策略', label: '指增/增强', keywords: ['增强'] },
  { id: '龙头主题', label: '龙头主题', keywords: ['龙头'] },
];

export function detectFundIssuer(name: string): string | null {
  if (!name) return null;
  for (const issuer of FUND_ISSUERS) {
    if (name.includes(issuer)) {
      return issuer;
    }
  }
  return null;
}

export function getAvailableFundIssuers(
  items: { name: string }[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const issuer = detectFundIssuer(item.name);
    if (issuer) {
      counts.set(issuer, (counts.get(issuer) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function getAvailableNameThemes(
  items: { name: string }[]
): { id: string; label: string; count: number }[] {
  const results: { id: string; label: string; count: number }[] = [];
  for (const rule of NAME_THEME_RULES) {
    let count = 0;
    for (const item of items) {
      const lower = item.name.toLowerCase();
      if (rule.keywords.some((kw) => lower.includes(kw))) {
        count++;
      }
    }
    if (count > 0) {
      results.push({ id: rule.id, label: rule.label, count });
    }
  }
  return results;
}

export function matchesEtfNameFilter(
  item: { name: string; code: string },
  searchQuery: string,
  nameFilter: EtfNameFilterState
): boolean {
  const lowerName = item.name.toLowerCase();
  const lowerCode = item.code.toLowerCase();

  // 1. 多关键词搜索（空格/逗号分隔，AND 匹配名称或代码）
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    const terms = q.split(/[\s,，]+/).filter(Boolean);
    for (const term of terms) {
      if (!lowerName.includes(term) && !lowerCode.includes(term)) {
        return false;
      }
    }
  }

  // 2. 名称主题标签筛选
  if (nameFilter.nameTheme && nameFilter.nameTheme !== '全部') {
    const rule = NAME_THEME_RULES.find((r) => r.id === nameFilter.nameTheme);
    if (rule) {
      if (!rule.keywords.some((kw) => lowerName.includes(kw))) {
        return false;
      }
    } else if (!lowerName.includes(nameFilter.nameTheme.toLowerCase())) {
      return false;
    }
  }

  // 3. 基金公司（管理人）筛选
  if (nameFilter.fundIssuer && nameFilter.fundIssuer !== '全部') {
    if (detectFundIssuer(item.name) !== nameFilter.fundIssuer) {
      return false;
    }
  }

  // 4. 名称排除关键词（空格/逗号分隔，命中任一排除词则剔除）
  const ex = nameFilter.excludeQuery.trim().toLowerCase();
  if (ex) {
    const exTerms = ex.split(/[\s,，]+/).filter(Boolean);
    for (const term of exTerms) {
      if (lowerName.includes(term) || lowerCode.includes(term)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 提取 ETF 名称的“同类基准标的”规范化分组键（去除基金管理人、冗余指数前缀等）
 * 例如：「芯片ETF天弘」「芯片ETF易方达」「华夏国证半导体芯片ETF」合理归并同类标的
 */
export function getEtfCanonicalGroupKey(name: string): string {
  let s = name.trim();
  for (const issuer of FUND_ISSUERS) {
    if (s.endsWith(issuer)) {
      s = s.slice(0, -issuer.length);
      break;
    }
  }
  for (const issuer of FUND_ISSUERS) {
    if (s.startsWith(issuer)) {
      s = s.slice(issuer.length);
      break;
    }
  }
  s = s.replace(/^(中证全指|中证细分|CES)/, '');
  // 保留 上证50 vs 深证50、国证2000 vs 中证2000 的区分度
  if (/^(国证|中证)(?!50ETF|100ETF|2000ETF)/.test(s)) {
    s = s.replace(/^(国证|中证)/, '');
  }
  s = s.replace(/主题ETF$/i, 'ETF');
  return s.trim() || name.trim();
}

export function parseEtfScaleValue(item: {
  scaleAmount?: number;
  scaleText?: string;
}): number {
  if (item.scaleAmount !== undefined && item.scaleAmount > 0) {
    return item.scaleAmount;
  }
  if (item.scaleText) {
    const num = parseFloat(item.scaleText.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) return num;
  }
  return 0;
}

/**
 * 同类 ETF 只保留 1 只代表标的（默认优先保留规模最大、其次成交额最高、其次ATR%更高的主力ETF）
 */
export function dedupeSimilarEtfs<
  T extends {
    id: string;
    name: string;
    scaleAmount?: number;
    scaleText?: string;
    volumeAmount?: number;
    atrPercent?: number;
  }
>(
  items: T[],
  getScore?: (item: T) => number
): { items: T[]; groupCounts: Record<string, number> } {
  const bestByKey = new Map<string, { item: T; score: number; count: number }>();

  const defaultScore = (item: T): number => {
    const scale = parseEtfScaleValue(item);
    const vol = item.volumeAmount ?? 0;
    const atr = item.atrPercent ?? 0;
    return scale * 1_000_000 + vol * 1_000 + atr;
  };

  for (const item of items) {
    const key = getEtfCanonicalGroupKey(item.name);
    const score = getScore ? getScore(item) : defaultScore(item);
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, { item, score, count: 1 });
    } else {
      existing.count += 1;
      if (score > existing.score) {
        existing.item = item;
        existing.score = score;
      }
    }
  }

  const dedupedItems: T[] = [];
  const groupCounts: Record<string, number> = {};
  for (const entry of bestByKey.values()) {
    dedupedItems.push(entry.item);
    groupCounts[entry.item.id] = entry.count;
  }

  return { items: dedupedItems, groupCounts };
}

