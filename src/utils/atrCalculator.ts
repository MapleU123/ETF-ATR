import { DailyCandle, EtfItem, AtrPeriod, VolatilityGrade } from '../types';
import { calculateSupportResistance } from './supportResistance';

/**
 * 计算单日真实波幅 (True Range - TR)
 * TR = MAX(High - Low, |High - PrevClose|, |Low - PrevClose|)
 */
export function calculateTR(high: number, low: number, prevClose: number): number {
  const range1 = high - low;
  const range2 = Math.abs(high - prevClose);
  const range3 = Math.abs(low - prevClose);
  return Math.max(range1, range2, range3);
}

/**
 * 根据历史K线计算指定周期的ATR (取过去 N 个交易日的真实波幅TR均值)
 */
export function calculateATR(candles: DailyCandle[], period: AtrPeriod = 14): number {
  if (!candles || candles.length === 0) return 0;
  if (candles.length === 1) {
    const c = candles[0];
    return c.high - c.low;
  }

  // 计算每日 TR
  const trList: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    const curr = candles[i];
    trList.push(calculateTR(curr.high, curr.low, prevClose));
  }

  if (trList.length === 0) return 0;

  const actualPeriod = Math.min(period, trList.length);
  // 截取最近 actualPeriod 日 TR
  const sampleTrs = trList.slice(-actualPeriod);
  const sum = sampleTrs.reduce((acc, v) => acc + v, 0);
  return Number((sum / actualPeriod).toFixed(3));
}

/**
 * 计算历史平均水平 (默认最近 20 天的历史真实波幅 TR 均值或 ATR 均值)
 */
export function calculateHistoricalAvgAtr(candles: DailyCandle[], period: number = 20): number {
  if (!candles || candles.length === 0) return 0;
  if (candles.length === 1) {
    return Math.max(0, candles[0].high - candles[0].low);
  }

  const trList: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    const curr = candles[i];
    trList.push(calculateTR(curr.high, curr.low, prevClose));
  }

  if (trList.length === 0) return 0;
  const sampleCount = Math.min(period, trList.length);
  const sampleTrs = trList.slice(-sampleCount);
  const sum = sampleTrs.reduce((acc, v) => acc + v, 0);
  return Number((sum / sampleCount).toFixed(3));
}

/**
 * 确定波动率等级
 */
export function getVolatilityGrade(atrPercent: number): VolatilityGrade {
  if (atrPercent < 1.6) return '低波稳健';
  if (atrPercent < 2.6) return '中度波动';
  if (atrPercent < 3.8) return '高波动';
  return '极高波动';
}

/**
 * 重新根据指定周期计算 ETF 的全部衍生指标
 */
export function enrichEtfItem(
  item: Omit<
    EtfItem,
    | 'tr'
    | 'atr'
    | 'atrPercent'
    | 'turtleUnitN'
    | 'stopLossPrice'
    | 'volatilityGrade'
    | 'historicalAvgAtr'
    | 'isAboveHistoricalAvg'
    | 'atrAboveDiffPercent'
    | 'high120d'
    | 'low120d'
    | 'high60d'
    | 'low60d'
  >,
  period: AtrPeriod = 14
): EtfItem {
  const tr = calculateTR(item.high, item.low, item.prevClose);
  const calculatedAtr = calculateATR(item.history, period);
  const safeAtr = calculatedAtr > 0 ? calculatedAtr : tr;
  const atrPercent = item.price > 0 ? (safeAtr / item.price) * 100 : 0;
  const turtleUnitN = safeAtr * 100; // 1手(100股)波动金额
  const stopLossPrice = Math.max(0, item.price - 2 * safeAtr);
  const volatilityGrade = getVolatilityGrade(atrPercent);

  // 计算最近20天历史平均水平 (20日TR/ATR基线)
  const historicalAvgAtr = calculateHistoricalAvgAtr(item.history, 20);
  const baselineAtr = historicalAvgAtr > 0 ? historicalAvgAtr : safeAtr;
  const isAboveHistoricalAvg = safeAtr > baselineAtr;
  const atrAboveDiffPercent =
    baselineAtr > 0
      ? Number((((safeAtr - baselineAtr) / baselineAtr) * 100).toFixed(1))
      : 0;

  // 计算近120日K线最高价与最低价
  let high120d = item.high || item.price;
  let low120d = item.low > 0 ? item.low : item.price;
  if (item.history && item.history.length > 0) {
    const last120 = item.history.slice(-120);
    const validHighs = last120.map((k) => k.high).filter((h) => h > 0);
    const validLows = last120.map((k) => k.low).filter((l) => l > 0);
    if (validHighs.length > 0) high120d = Math.max(...validHighs);
    if (validLows.length > 0) low120d = Math.min(...validLows);
  }

  // 兼容近60日计算
  let high60d = high120d;
  let low60d = low120d;
  if (item.history && item.history.length > 0) {
    const last60 = item.history.slice(-60);
    const validHighs = last60.map((k) => k.high).filter((h) => h > 0);
    const validLows = last60.map((k) => k.low).filter((l) => l > 0);
    if (validHighs.length > 0) high60d = Math.max(...validHighs);
    if (validLows.length > 0) low60d = Math.min(...validLows);
  }

  // 历史压力位与支撑位指标（以MA120半年线为核心的技术位）
  const sr = calculateSupportResistance(
    item.price,
    item.history,
    high120d,
    low120d,
    atrPercent
  );

  return {
    ...item,
    tr: Number(tr.toFixed(4)),
    atr: Number(safeAtr.toFixed(4)),
    atrPercent: Number(atrPercent.toFixed(2)),
    turtleUnitN: Number(turtleUnitN.toFixed(2)),
    stopLossPrice: Number(stopLossPrice.toFixed(3)),
    volatilityGrade,
    historicalAvgAtr: Number(baselineAtr.toFixed(3)),
    isAboveHistoricalAvg,
    atrAboveDiffPercent,
    high120d: Number(high120d.toFixed(3)),
    low120d: Number(low120d.toFixed(3)),
    high60d: Number(high60d.toFixed(3)),
    low60d: Number(low60d.toFixed(3)),
    ma120: sr.ma120,
    ma60: sr.ma60,
    ma20: sr.ma20,
    supportPrice: sr.supportPrice,
    supportType: sr.supportType,
    resistancePrice: sr.resistancePrice,
    resistanceType: sr.resistanceType,
  };
}

/**
 * 格式化价格数字
 */
export function formatNum(val: number, decimals: number = 3): string {
  if (isNaN(val) || val === null || val === undefined) return '--';
  return val.toFixed(decimals);
}

/**
 * 格式化成交额 (亿元)
 */
export function formatAmount(amount: number): string {
  if (isNaN(amount)) return '--';
  if (amount >= 100) return `${amount.toFixed(1)}亿`;
  return `${amount.toFixed(2)}亿`;
}
