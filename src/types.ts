export type EtfCategory =
  | '全部'
  | '半导体'
  | '通信'
  | '创新药'
  | '医药'
  | '军工'
  | '人工智能/软件'
  | '新能源/电力'
  | '机械制造'
  | '消费'
  | '金融地产'
  | '红利低波'
  | '周期资源'
  | '传媒娱乐'
  | '宽基指数'
  | '跨境海外'
  | '大宗商品'
  | '债券货币'
  | (string & {});

export type VolatilityGrade = '低波稳健' | '中度波动' | '高波动' | '极高波动';

export interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface EtfItem {
  id: string;
  code: string;
  name: string;
  category: EtfCategory;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  prevClose: number;
  volumeAmount: number; // 成交额 (亿元)
  scaleText?: string; // 基金规模 (如 约800亿)
  scaleAmount?: number; // 基金规模数值 (亿元，支持精确排序与计算)
  history: DailyCandle[]; // 近20-30日数据用于ATR精准计算
  // Calculated fields:
  tr: number; // 今日真实波幅
  atr: number; // 周期ATR
  atrPercent: number; // ATR / 现价 * 100%
  turtleUnitN: number; // 1手(100股)波动金额
  stopLossPrice: number; // 建议多头止损点位 (现价 - 2 * ATR)
  volatilityGrade: VolatilityGrade;
  selected?: boolean;
  isCustom?: boolean;
  badge?: string;
  isRealtime?: boolean;
  realtimeTime?: string;
  // 历史平均水平（近20天）对比指示器指标
  historicalAvgAtr?: number; // 20日历史ATR/真实波幅均值
  isAboveHistoricalAvg?: boolean; // ATR是否超过20日历史平均水平
  atrAboveDiffPercent?: number; // 超过历史均值百分比 (如 +12.5%)
  // 近120日真实K线高低价指标（支持K线技术面网格区间）
  high120d?: number; // 近120交易日真实K线最高价
  low120d?: number; // 近120交易日真实K线最低价
  high60d?: number; // 兼容历史字段
  low60d?: number;
  // 历史压力位与支撑位指标（基于MA120/半年线、MA60等均线技术位）
  ma120?: number; // 120日移动平均线 (半年线)
  ma60?: number; // 60日移动平均线 (季线)
  ma20?: number; // 20日移动平均线 (月线)
  supportPrice?: number; // 综合历史支撑位 (网格最低价建议)
  supportType?: string; // 支撑位来源 (如 'MA120半年线支撑', '120日筑底支撑')
  resistancePrice?: number; // 综合历史压力位 (网格最高价建议)
  resistanceType?: string; // 压力位来源 (如 'MA120半年线压力', '120日波段高点')
}

export type GridRangeMode = 'ma120_sr' | 'percent_range' | 'kline_120d' | 'kline_60d';

export type AtrPeriod = 5 | 10 | 14 | 20 | 30;

export type SortField =
  | 'atrPercent'
  | 'atr'
  | 'changePercent'
  | 'price'
  | 'volumeAmount'
  | 'scaleAmount'
  | 'code';

export type SortDirection = 'desc' | 'asc';

export type ActiveTab = 'atr_volatility' | 'grid_trading' | 't0_grid_trading';

export type ExportTheme = 'light' | 'dark' | 'paper' | 'bullish';

export type ExportLayout = 'full_table' | 'grid_trading' | 't0_grid_trading' | 'top_highlights' | 'turtle_strategy';

export type ExportPixelRatio = 1 | 1.5 | 2 | 3 | 4;

export type ExportAspectRatio = 'auto' | '9:16' | '3:4';

export interface GridItemConfig {
  id: string;
  code: string;
  name: string;
  category: EtfCategory;
  price: number; // 当前市价
  basePrice: number; // 基准价 (¥)
  highPrice: number; // 最高价 (¥)
  lowPrice: number; // 最低价 (¥)
  gridStepPercent: number; // 网格间距(%) (根据ATR计算)
  gridStepPrice: number; // 单格绝对价差(¥)
  gridCount: number; // 预估总网格数
  atrMultiplier: number; // 采用的ATR倍数 (0.5x, 0.8x, 1.0x, 1.5x)
  atr: number; // ATR值
  atrPercent: number; // ATR%
  rawStepPercent?: number; // 未对齐前的原始ATR网格间距%
  isHalfMultiple?: boolean; // 是否对齐为0.5%的倍数
  scaleText?: string;
  isCustomized?: boolean;
  high120d?: number; // 近120日K线最高价
  low120d?: number; // 近120日K线最低价
  high60d?: number; // 兼容
  low60d?: number;
  rangeMode?: GridRangeMode; // 当前采用的区间模式
  rangePercent?: number; // 采用的箱体幅度 (如 15, 20, 25, 30)
  ma120?: number; // 120日均线
  ma60?: number; // 60日均线
  ma20?: number; // 20日均线
  supportPrice?: number; // 历史支撑位
  supportType?: string; // 支撑位类型
  resistancePrice?: number; // 历史压力位
  resistanceType?: string; // 压力位类型
}

export interface ExportConfig {
  enableWatermark: boolean; // 主开关：选择加或不加水印
  watermarkText: string;
  showDiagonalWatermark: boolean; // 浮在图上方的灰色倾斜水印
  diagonalOpacity: number; // 0.05 - 0.40
  showBottomBanner: boolean;
  showHeaderBadge: boolean;
  theme: ExportTheme;
  pixelRatio: ExportPixelRatio; // 清晰度自主选择
  aspectRatio?: ExportAspectRatio; // 导出图片比例：自适应 / 9:16 / 3:4
  layout: ExportLayout;
  atrPeriod: AtrPeriod; // ATR 14天 或 20天 选项
  title: string;
  subTitle: string;
  selectedOnly: boolean;
  includeStats?: boolean; // 已根据用户要求默认不展示
  watermarkPosition?: 'both' | 'top' | 'diagonal' | 'bottom';
  dateStr: string;
  page?: number;
  pageSize?: number;
}
