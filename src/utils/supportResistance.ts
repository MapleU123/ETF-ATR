import { DailyCandle } from '../types';

export interface SupportResistanceResult {
  ma120: number;
  ma60: number;
  ma20: number;
  resistancePrice: number; // 综合历史压力位 (网格最高价建议)
  resistanceType: string; // 压力位依据说明 (如 "MA120半年线压力", "120日波段高点")
  supportPrice: number; // 综合历史支撑位 (网格最低价建议)
  supportType: string; // 支撑位依据说明 (如 "MA120半年线支撑", "120日筑底支撑")
}

/**
 * 计算ETF基于K线历史的MA均线(MA120, MA60, MA20)与历史压力位/支撑位
 * @param price 标的当前价格或基准价
 * @param history 历史日K线数组
 * @param high120d 可选的120日实际最高价
 * @param low120d 可选的120日实际最低价
 * @param atrPercent 可选的ATR百分比
 */
export function calculateSupportResistance(
  price: number,
  history?: DailyCandle[],
  high120d?: number,
  low120d?: number,
  atrPercent: number = 2.0
): SupportResistanceResult {
  const safePrice = price > 0 ? price : 1.0;

  // 1. 提取收盘价序列计算均线
  let ma120 = safePrice;
  let ma60 = safePrice;
  let ma20 = safePrice;

  let klineHigh120 = high120d || safePrice * 1.15;
  let klineLow120 = low120d || safePrice * 0.85;

  if (history && history.length > 0) {
    const validCloses = history.map((k) => k.close).filter((c) => c > 0);
    const validHighs = history.map((k) => k.high).filter((h) => h > 0);
    const validLows = history.map((k) => k.low).filter((l) => l > 0);

    if (validCloses.length > 0) {
      const slice120 = validCloses.slice(-120);
      const slice60 = validCloses.slice(-60);
      const slice20 = validCloses.slice(-20);

      ma120 = Number((slice120.reduce((a, b) => a + b, 0) / slice120.length).toFixed(3));
      ma60 = Number((slice60.reduce((a, b) => a + b, 0) / slice60.length).toFixed(3));
      ma20 = Number((slice20.reduce((a, b) => a + b, 0) / slice20.length).toFixed(3));
    }

    if (validHighs.length > 0) {
      const sliceHigh120 = validHighs.slice(-120);
      klineHigh120 = Math.max(...sliceHigh120);
    }
    if (validLows.length > 0) {
      const sliceLow120 = validLows.slice(-120);
      klineLow120 = Math.min(...sliceLow120);
    }
  }

  // 2. 计算历史压力位 (网格最高价 / 卖出上限)
  let resistancePrice: number;
  let resistanceType: string;

  // 情况 A: 现价处于 MA120 下方，MA120 是首要核心反弹压力位 (半年线反压)
  if (ma120 >= safePrice * 1.025 && ma120 <= safePrice * 1.35) {
    resistancePrice = ma120;
    resistanceType = 'MA120半年线压力';
  }
  // 情况 B: MA60 处于上方合理区间 (季线反压)
  else if (ma60 >= safePrice * 1.025 && ma60 <= safePrice * 1.30) {
    resistancePrice = ma60;
    resistanceType = 'MA60季线压力';
  }
  // 情况 C: 现价在均线上方或突破均线，阻力位取近120日波段高点
  else if (klineHigh120 >= safePrice * 1.04 && klineHigh120 <= safePrice * 1.32) {
    resistancePrice = Number(klineHigh120.toFixed(3));
    resistanceType = '120日波段高点';
  }
  // 情况 D: 均线动态多头通道 (MA120 上轨 / ATR 通道)
  else {
    const dynamicOffset = Math.max(12, Math.min(25, atrPercent * 6));
    const rawRes = Math.max(safePrice * (1 + dynamicOffset / 100), ma120 * 1.10);
    resistancePrice = Number(Math.min(rawRes, safePrice * 1.25).toFixed(3));
    resistanceType = 'MA120动态阻力';
  }

  // 3. 计算历史支撑位 (网格最低价 / 买入下限)
  let supportPrice: number;
  let supportType: string;

  // 情况 A: 现价处于 MA120 上方，MA120 是首要核心回踩支撑位 (半年线强支撑)
  if (ma120 <= safePrice * 0.975 && ma120 >= safePrice * 0.65) {
    supportPrice = ma120;
    supportType = 'MA120半年线支撑';
  }
  // 情况 B: MA60 处于下方合理区间 (季线支撑)
  else if (ma60 <= safePrice * 0.975 && ma60 >= safePrice * 0.70) {
    supportPrice = ma60;
    supportType = 'MA60季线支撑';
  }
  // 情况 C: 现价在均线下方，支撑位取近120日筑底低点
  else if (klineLow120 <= safePrice * 0.96 && klineLow120 >= safePrice * 0.68) {
    supportPrice = Number(klineLow120.toFixed(3));
    supportType = '120日筑底支撑';
  }
  // 情况 D: 均线动态空头通道 (MA120 下轨 / ATR 通道)
  else {
    const dynamicOffset = Math.max(12, Math.min(25, atrPercent * 6));
    const rawSup = Math.min(safePrice * (1 - dynamicOffset / 100), ma120 * 0.90);
    supportPrice = Number(Math.max(rawSup, safePrice * 0.75).toFixed(3));
    supportType = 'MA120动态支撑';
  }

  // 4. 合理性校验：支撑位必须小于压力位，且大于0
  if (supportPrice >= resistancePrice || supportPrice <= 0) {
    supportPrice = Number((safePrice * 0.85).toFixed(3));
    resistancePrice = Number((safePrice * 1.15).toFixed(3));
    supportType = '±15%动态支撑';
    resistanceType = '±15%动态压力';
  }

  return {
    ma120,
    ma60,
    ma20,
    resistancePrice,
    resistanceType,
    supportPrice,
    supportType,
  };
}
