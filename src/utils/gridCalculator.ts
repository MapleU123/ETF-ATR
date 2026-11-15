import { EtfItem, GridItemConfig, GridRangeMode } from '../types';
import { calculateSupportResistance } from './supportResistance';

export interface GridRangeOption {
  label: string;
  percent: number; // e.g. 20 means ±20%
}

export const DEFAULT_RANGE_OPTIONS: GridRangeOption[] = [
  { label: '±15% (窄幅高频)', percent: 15 },
  { label: '±20% (标准箱体)', percent: 20 },
  { label: '±25% (宽幅防守)', percent: 25 },
  { label: '±30% (大周期跨度)', percent: 30 },
];

export interface AtrMultiplierOption {
  label: string;
  multiplier: number;
  desc: string;
}

export const ATR_MULTIPLIER_OPTIONS: AtrMultiplierOption[] = [
  { label: '0.5 × ATR', multiplier: 0.5, desc: '密集网格 · 高频成交' },
  { label: '0.8 × ATR', multiplier: 0.8, desc: '偏密网格 · 灵活吸筹' },
  { label: '1.0 × ATR', multiplier: 1.0, desc: '标准网格 · 日均波幅(推荐)' },
  { label: '1.2 × ATR', multiplier: 1.2, desc: '适中网格 · 过滤杂波' },
  { label: '1.5 × ATR', multiplier: 1.5, desc: '宽幅网格 · 趋势防破' },
  { label: '2.0 × ATR', multiplier: 2.0, desc: '大波段网格 · 稳健低频' },
];

/**
 * 将网格间距对齐至 0.5 的倍数（券商实盘条件单通用规范）
 * 例如: 1.1% -> 1.0%, 1.35% -> 1.5%, 0.4% -> 0.5%, 2.76% -> 3.0%
 */
export function roundToHalfStep(val: number, min: number = 0.5): number {
  const rounded = Math.round(val * 2) / 2;
  return Number(Math.max(min, rounded).toFixed(1));
}

/**
 * 根据ETF数据与配置计算单个ETF的网格参数
 * @param rangeMode 默认 'ma120_sr' (根据历史压力位与支撑位如MA120/半年线技术位计算最高价与最低价)，亦支持 'percent_range' 或 'kline_120d'
 * @param roundToHalf 默认开启，自动将网格间距对齐为 0.5% 的整数倍（如 1.0%, 1.5%, 2.0%...）
 */
export function calculateGridItem(
  etf: EtfItem,
  atrMultiplier: number = 1.0,
  rangePercent: number = 20,
  customOverrides?: Partial<{
    basePrice: number;
    highPrice: number;
    lowPrice: number;
    gridStepPercent: number;
  }>,
  roundToHalf: boolean = true,
  rangeMode: GridRangeMode = 'kline_120d'
): GridItemConfig {
  const basePrice = customOverrides?.basePrice ?? etf.price;
  
  // 原始网格间距% = atrMultiplier * etf.atrPercent
  const rawStep = atrMultiplier * (etf.atrPercent || 1.5);
  const rawStepPercent = Number(Math.max(0.1, rawStep).toFixed(2));

  let gridStepPercent: number;
  let isHalfMultiple = false;

  if (customOverrides?.gridStepPercent !== undefined) {
    gridStepPercent = Number(customOverrides.gridStepPercent.toFixed(2));
    isHalfMultiple = Math.abs(gridStepPercent * 2 - Math.round(gridStepPercent * 2)) < 0.001;
  } else if (roundToHalf) {
    // 默认对齐为 0.5% 的倍数，最小为 0.5%
    gridStepPercent = roundToHalfStep(rawStepPercent, 0.5);
    isHalfMultiple = true;
  } else {
    gridStepPercent = Number(Math.max(0.3, rawStepPercent).toFixed(2));
    isHalfMultiple = Math.abs(gridStepPercent * 2 - Math.round(gridStepPercent * 2)) < 0.001;
  }
  
  const gridStepPrice = Number((basePrice * (gridStepPercent / 100)).toFixed(3));

  // 120日与60日前复权K线实际极值：
  // 遵循策略设定：最高价取120日内前复权High最大值（半年高点作为上限防踏空），最低价取60日内前复权Low最小值（近1季底部作为网格下限吸筹）
  const klineHigh = etf.high120d || etf.high60d || (etf.history && etf.history.length > 0 ? Math.max(...etf.history.slice(-120).map(k => k.high)) : etf.price);
  const klineLow = etf.low60d || etf.low120d || (etf.history && etf.history.length > 0 ? Math.min(...etf.history.slice(-60).map(k => k.low)) : etf.price);

  // 历史压力位与支撑位 (MA120, MA60, 均线反压/回踩支撑)
  const sr = (etf.resistancePrice && etf.supportPrice && etf.ma120)
    ? {
        ma120: etf.ma120,
        ma60: etf.ma60 || etf.price,
        ma20: etf.ma20 || etf.price,
        resistancePrice: etf.resistancePrice,
        resistanceType: etf.resistanceType || 'MA120半年线压力',
        supportPrice: etf.supportPrice,
        supportType: etf.supportType || 'MA120半年线支撑',
      }
    : calculateSupportResistance(basePrice, etf.history, etf.high120d, etf.low120d, etf.atrPercent);

  // 最高价与最低价根据 rangeMode 计算
  let highPrice = customOverrides?.highPrice;
  let lowPrice = customOverrides?.lowPrice;

  // 如果未自定义，根据当前选定的区间模式设定
  if (highPrice === undefined) {
    if (rangeMode === 'kline_120d') {
      // 120日K线前复权极值模式：严格取120日内日K线High的最大值（前复权真实数据）
      if (klineHigh && klineHigh > 0) {
        highPrice = Number(klineHigh.toFixed(3));
      } else {
        highPrice = Number((basePrice * (1 + rangePercent / 100)).toFixed(3));
      }
    } else if (rangeMode === 'ma120_sr') {
      // 历史压力位模式（以MA120/半年线反压或波段高点阻力为主）
      highPrice = Number(sr.resistancePrice.toFixed(3));
    } else if (rangeMode === 'kline_60d' && klineHigh && klineHigh > basePrice) {
      highPrice = Number(klineHigh.toFixed(3));
    } else {
      // 标准箱体模式：基准价 × (1 + rangePercent / 100)
      highPrice = Number((basePrice * (1 + rangePercent / 100)).toFixed(3));
    }
  }

  if (lowPrice === undefined) {
    if (rangeMode === 'kline_120d') {
      // 120日K线前复权极值模式：严格取120日内日K线Low的最小值（前复权真实数据）
      if (klineLow && klineLow > 0) {
        lowPrice = Number(klineLow.toFixed(3));
      } else {
        lowPrice = Number((basePrice * (1 - rangePercent / 100)).toFixed(3));
      }
    } else if (rangeMode === 'ma120_sr') {
      // 历史支撑位模式（以MA120/半年线回踩支撑或筑底低点为主）
      lowPrice = Number(sr.supportPrice.toFixed(3));
    } else if (rangeMode === 'kline_60d' && klineLow && klineLow > 0 && klineLow < basePrice) {
      lowPrice = Number(klineLow.toFixed(3));
    } else {
      // 标准箱体模式：基准价 × (1 - rangePercent / 100)
      lowPrice = Number((basePrice * (1 - rangePercent / 100)).toFixed(3));
    }
  }

  // 校验高低价逻辑合理性（最低价必须小于最高价且大于0）
  if (lowPrice >= highPrice || lowPrice <= 0) {
    lowPrice = Number((basePrice * (1 - rangePercent / 100)).toFixed(3));
    highPrice = Number((basePrice * (1 + rangePercent / 100)).toFixed(3));
  }

  const effectiveStepPrice = gridStepPrice > 0 ? gridStepPrice : 0.01;
  const gridCount = Math.max(2, Math.round((highPrice - lowPrice) / effectiveStepPrice));

  return {
    id: etf.id,
    code: etf.code,
    name: etf.name,
    category: etf.category,
    price: etf.price,
    basePrice: Number(basePrice.toFixed(3)),
    highPrice: Number(highPrice.toFixed(3)),
    lowPrice: Number(lowPrice.toFixed(3)),
    gridStepPercent,
    gridStepPrice,
    gridCount,
    atrMultiplier,
    atr: etf.atr,
    atrPercent: etf.atrPercent,
    rawStepPercent,
    isHalfMultiple,
    scaleText: etf.scaleText,
    isCustomized: !!customOverrides && Object.keys(customOverrides).length > 0,
    high120d: etf.high120d || etf.high60d,
    low120d: etf.low120d || etf.low60d,
    high60d: etf.high60d,
    low60d: etf.low60d,
    rangeMode,
    rangePercent,
    ma120: sr.ma120,
    ma60: sr.ma60,
    ma20: sr.ma20,
    supportPrice: rangeMode === 'kline_120d' ? (klineLow || sr.supportPrice) : sr.supportPrice,
    supportType: rangeMode === 'kline_120d' ? '60日Low极值' : sr.supportType,
    resistancePrice: rangeMode === 'kline_120d' ? (klineHigh || sr.resistancePrice) : sr.resistancePrice,
    resistanceType: rangeMode === 'kline_120d' ? '120日High极值' : sr.resistanceType,
  };
}

export interface GridLadderLevel {
  level: number; // 0 is base, >0 is sell (up), <0 is buy (down)
  type: 'base' | 'sell' | 'buy';
  label: string;
  price: number;
  changeFromBasePercent: number;
  expectedProfitPercent?: number;
}

/**
 * 生成网格阶梯档位（供弹窗详情展示）
 */
export function generateGridLadder(config: GridItemConfig): GridLadderLevel[] {
  const levels: GridLadderLevel[] = [];
  const { basePrice, highPrice, lowPrice, gridStepPrice, gridStepPercent } = config;

  // 基准价
  levels.push({
    level: 0,
    type: 'base',
    label: '基准价 (建仓中轴)',
    price: basePrice,
    changeFromBasePercent: 0,
  });

  // 向上卖出格
  let currentPrice = basePrice;
  let upIndex = 1;
  while (currentPrice + gridStepPrice <= highPrice * 1.002 && upIndex <= 30) {
    currentPrice = Number((currentPrice + gridStepPrice).toFixed(3));
    const change = Number((((currentPrice - basePrice) / basePrice) * 100).toFixed(2));
    levels.push({
      level: upIndex,
      type: 'sell',
      label: `卖出档位 S${upIndex}`,
      price: currentPrice,
      changeFromBasePercent: change,
      expectedProfitPercent: Number((gridStepPercent * upIndex).toFixed(2)),
    });
    upIndex++;
  }

  // 向下买入格
  currentPrice = basePrice;
  let downIndex = 1;
  while (currentPrice - gridStepPrice >= lowPrice * 0.998 && downIndex <= 30) {
    currentPrice = Number((currentPrice - gridStepPrice).toFixed(3));
    const change = Number((((currentPrice - basePrice) / basePrice) * 100).toFixed(2));
    levels.push({
      level: -downIndex,
      type: 'buy',
      label: `买入档位 B${downIndex}`,
      price: currentPrice,
      changeFromBasePercent: change,
    });
    downIndex++;
  }

  // 按照价格从高到低排序
  return levels.sort((a, b) => b.price - a.price);
}
