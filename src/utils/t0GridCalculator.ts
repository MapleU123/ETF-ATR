export type T0PriceRangeMode = 'today' | 'kline_15d' | 'kline_60d' | 'kline_120d';

export interface T0GridInputState {
  code: string;
  name: string;
  basePrice: number; // C5 基准价 (默认1.365)
  highPrice: number; // 最高价 (网格区间上限/参考高点)
  lowPrice: number; // 最低价 (网格区间下限/参考低点)
  atrValue: number; // C6 15分钟折算ATR (元，默认0.0043)
  atrMultiplier: number; // C7 ATR倍数 (0.5/0.8/1.0/1.2/1.5/2.0，默认1.0)
  perGridMoney: number; // C9 每格资金 (默认2000)
  roundTripCostRatePct: number; // C10 往返成本率% (默认0.1%)
  minTick: number; // C11 最小变动价位 (默认0.001)
  minUnit: number; // C12 最小交易单位 (默认100)
  customStepPct: number; // C13 自定义间距% (0=留空用ATR)
  expectedAmpPct: number; // C14 预期日振幅% (默认2.26%)
  totalBudget: number; // C15 做T总资金预算 (默认12000)
  manualGridCount: number; // D8 手动覆盖每边格数 (0表示留空，遵循C8公式)
}

export interface LadderRow {
  k: number; // 档位 k (如 +3, +2, +1, 0, -1, -2, -3)
  price: number; // 挂单价格
  direction: '卖出' | '买入' | '中轴基准';
  distPct: number; // 距基准%
  perGridMoney: number; // 每格预算资金
  shares: number; // 交易份数
  amount: number; // 成交金额
  pairPrice: number; // 配对价
  grossProfit: number; // 单格毛利
  netProfit: number; // 单格净利
  isEmpty: boolean; // 是否超出每边格数限制
}

export interface T0GridCalculatedResult {
  // G列公式
  gridStepPrice: number; // G5 网格间距(元) = IF(AND(C13<>"",C13>0), ROUND(C13*C5/C11,0)*C11, ROUND(C7*C6/C11,0)*C11)
  gridStepPct: number; // G6 间距% = G5/C5
  costToStepRatio: number; // G12 成本占格距比 = 2*C5*C10/G5
  isCostRatioHigh: boolean; // G12 > 50%
  suggestedGridCount: number; // G13 ★建议每边格数 = MAX(2, MIN(ROUND(C14*0.45/G6,0), IF(AND(C15>0,C9>0), FLOOR(C15/C9,1), 10)))
  amplitudeGridCount: number; // G14 振幅法 = ROUND(C14*0.45/G6,0)
  capitalGridCount: number; // G15 资金法 = FLOOR(C15/C9,1)
  actualGridCountC8: number; // C8 = IF(AND($D$8<>"",$D$8>0),$D$8,$G$13)

  // 高低价区间指标
  highLowSpanPct: number; // (最高价 - 最低价) / 基准价 * 100%
  ladderTopPrice: number; // 当前有效最高卖出挂单价
  ladderBottomPrice: number; // 当前有效最低买入挂单价
  isLadderWithinRange: boolean; // 买卖挂单是否在 [最低价, 最高价] 区间内

  // 阶梯表与总计
  ladderRows: LadderRow[]; // 第19~39行：档位从+10到-10
  validRows: LadderRow[]; // 过滤有效档位
  dailyBuySellPairs: number; // 预估日均成交买卖对数 G11
  avgNetProfitPerPair: number; // 平均单格买入净利
  dailyEstNetProfit: number; // 第42~44行：日均净利 = G11 × AVERAGEIFS(净利列, "买入")
  dailyEstAnnualYield: number; // 年化收益估算% (日均净利 * 240 / 预算)
  totalFundsUsed: number; // 实际最大单向资金占用 (C8 * C9)
}

/**
 * 严格按照 Excel 模板公式精确计算 T+0 网格参数
 */
export function calculateT0Grid(inputs: T0GridInputState): T0GridCalculatedResult {
  const C5 = inputs.basePrice > 0 ? inputs.basePrice : 1.365;
  const C6 = inputs.atrValue > 0 ? inputs.atrValue : 0.0043;
  const C7 = inputs.atrMultiplier > 0 ? inputs.atrMultiplier : 1.0;
  const C9 = inputs.perGridMoney > 0 ? inputs.perGridMoney : 2000;
  const costRateDecimal = (inputs.roundTripCostRatePct || 0.1) / 100; // C10
  const C11 = inputs.minTick > 0 ? inputs.minTick : 0.001;
  const C12 = inputs.minUnit > 0 ? inputs.minUnit : 100;
  const C13Decimal = inputs.customStepPct > 0 ? inputs.customStepPct / 100 : 0;
  const C14Decimal = (inputs.expectedAmpPct > 0 ? inputs.expectedAmpPct : 2.26) / 100;
  const C15 = inputs.totalBudget > 0 ? inputs.totalBudget : 12000;
  const D8 = inputs.manualGridCount > 0 ? inputs.manualGridCount : 0;

  // G5 网格间距（元）= IF(AND(C13<>"",C13>0), ROUND(C13*C5/C11,0)*C11, ROUND(C7*C6/C11,0)*C11)
  let G5: number;
  if (C13Decimal > 0) {
    G5 = Math.round((C13Decimal * C5) / C11) * C11;
  } else {
    G5 = Math.round((C7 * C6) / C11) * C11;
  }
  // 保证至少1个最小变动价位
  if (G5 < C11) G5 = C11;
  G5 = Number(G5.toFixed(4));

  // G6 间距% = G5/C5
  const G6 = G5 / C5;

  // G14 振幅法 = ROUND(C14*0.45/G6,0)
  const G14 = Math.max(1, Math.round((C14Decimal * 0.45) / (G6 > 0 ? G6 : 0.001)));

  // G15 资金法 = FLOOR(C15/C9,1)
  const G15 = Math.max(1, Math.floor(C15 / (C9 > 0 ? C9 : 1)));

  // G13 ★建议每边格数 = MAX(2, MIN(ROUND(C14*0.45/G6,0), IF(AND(C15>0,C9>0), FLOOR(C15/C9,1), 10)))
  const capitalLimit = C15 > 0 && C9 > 0 ? G15 : 10;
  const G13 = Math.max(2, Math.min(G14, capitalLimit));

  // C8 = IF(AND($D$8<>"",$D$8>0),$D$8,$G$13)
  const C8 = D8 > 0 ? D8 : G13;

  // G12 成本占格距比 = 2*C5*C10/G5，>50% 标红、<=50% 标绿
  const G12 = (2 * C5 * costRateDecimal) / (G5 > 0 ? G5 : 0.001);
  const isCostRatioHigh = G12 > 0.5;

  // 阶梯表：第 19~39 行，k 从 +10 递减至 -10
  const ladderRows: LadderRow[] = [];
  const buyNetProfits: number[] = [];

  for (let k = 10; k >= -10; k--) {
    const isOutOfBound = Math.abs(k) > C8;

    if (isOutOfBound) {
      // 超出每边格数 C8 的档位在 Excel 中显示为空格
      ladderRows.push({
        k,
        price: 0,
        direction: k > 0 ? '卖出' : k < 0 ? '买入' : '中轴基准',
        distPct: 0,
        perGridMoney: 0,
        shares: 0,
        amount: 0,
        pairPrice: 0,
        grossProfit: 0,
        netProfit: 0,
        isEmpty: true,
      });
      continue;
    }

    const price = Number((C5 + k * G5).toFixed(4));
    const direction = k > 0 ? '卖出' : k < 0 ? '买入' : '中轴基准';
    const distPct = Number(((price - C5) / C5 * 100).toFixed(2));

    let shares = 0;
    let amount = 0;
    let pairPrice = C5;
    let grossProfit = 0;
    let netProfit = 0;

    if (k !== 0) {
      shares = Math.floor(C9 / price / C12) * C12;
      amount = Number((shares * price).toFixed(2));

      // 配对价：买入档配对卖出价=price+G5, 卖出档配对买入价=price-G5
      if (k < 0) {
        pairPrice = Number((price + G5).toFixed(4));
      } else {
        pairPrice = Number((price - G5).toFixed(4));
      }

      grossProfit = Number((shares * G5).toFixed(2));
      // 双边成本 = (买入金额 + 卖出金额) * 成本率
      const roundTripCost = Number(((price + pairPrice) * shares * costRateDecimal).toFixed(2));
      netProfit = Number((grossProfit - roundTripCost).toFixed(2));

      if (k < 0) {
        buyNetProfits.push(netProfit);
      }
    }

    ladderRows.push({
      k,
      price,
      direction,
      distPct,
      perGridMoney: k === 0 ? 0 : C9,
      shares,
      amount,
      pairPrice,
      grossProfit,
      netProfit,
      isEmpty: false,
    });
  }

  const validRows = ladderRows.filter((r) => !r.isEmpty);
  const ladderTopPrice =
    validRows.length > 0 ? Math.max(...validRows.map((r) => r.price)) : C5;
  const ladderBottomPrice =
    validRows.length > 0 ? Math.min(...validRows.map((r) => r.price)) : C5;

  const highP = inputs.highPrice > 0 ? inputs.highPrice : ladderTopPrice;
  const lowP = inputs.lowPrice > 0 ? inputs.lowPrice : ladderBottomPrice;
  const highLowSpanPct =
    lowP > 0 && highP > lowP && C5 > 0
      ? Number((((highP - lowP) / C5) * 100).toFixed(2))
      : 0;
  const isLadderWithinRange =
    highP > lowP && ladderTopPrice <= highP * 1.0005 && ladderBottomPrice >= lowP * 0.9995;

  // G11 预估日均买卖对数：依据日振幅与网格间距的动态估算
  // 经典T+0模型中：日均对数 ≈ (预期日振幅 / (间距% * 2)) 的经验值，一般在 1~5 对
  const rawPairs = (C14Decimal / (G6 * 2.2));
  const dailyBuySellPairs = Math.max(1, Math.min(6, Math.round(rawPairs * 10) / 10));

  // AVERAGEIFS(净利列, "买入")
  const avgNetProfitPerPair =
    buyNetProfits.length > 0
      ? Number((buyNetProfits.reduce((a, b) => a + b, 0) / buyNetProfits.length).toFixed(2))
      : 0;

  // 第42~44行：日均净利 = G11 × AVERAGEIFS(净利列, "买入")
  const dailyEstNetProfit = Number((dailyBuySellPairs * avgNetProfitPerPair).toFixed(2));

  // 年化收益率估算 = (日均净利 * 240交易日) / 总预算
  const dailyEstAnnualYield =
    C15 > 0 ? Number(((dailyEstNetProfit * 240) / C15 * 100).toFixed(2)) : 0;

  const totalFundsUsed = C8 * C9;

  return {
    gridStepPrice: G5,
    gridStepPct: G6,
    costToStepRatio: G12,
    isCostRatioHigh,
    suggestedGridCount: G13,
    amplitudeGridCount: G14,
    capitalGridCount: G15,
    actualGridCountC8: C8,
    highLowSpanPct,
    ladderTopPrice,
    ladderBottomPrice,
    isLadderWithinRange,
    ladderRows,
    validRows,
    dailyBuySellPairs,
    avgNetProfitPerPair,
    dailyEstNetProfit,
    dailyEstAnnualYield,
    totalFundsUsed,
  };
}

/**
 * 历史近15个交易日K线TR及ATR计算（对应 Sheet 2: ATR 计算器）
 */
export interface DailyTrRow {
  date: string;
  high: number;
  low: number;
  close: number;
  prevClose: number;
  tr: number; // TR = MAX(高-低, |高-前收|, |低-前收|)
}

export interface Sheet2AtrResult {
  rows: DailyTrRow[];
  atr14: number; // AVERAGE(E7:E20)
  atr14Percent: number; // ATR14 / 最新收盘价
  atr15m: number; // 折算15分钟ATR (系数0.124)
}

export function calculateSheet2Atr(
  candles: { date: string; high: number; low: number; close: number }[],
  currentPrice: number
): Sheet2AtrResult {
  const sorted = [...candles].slice(-15);
  const rows: DailyTrRow[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    rows.push({
      date: cur.date,
      high: cur.high,
      low: cur.low,
      close: cur.close,
      prevClose: prev.close,
      tr: Number(tr.toFixed(4)),
    });
  }

  const atr14 =
    rows.length > 0
      ? Number((rows.reduce((a, b) => a + b.tr, 0) / rows.length).toFixed(4))
      : 0.0347;

  const baseP = currentPrice > 0 ? currentPrice : 1.365;
  const atr14Percent = Number(((atr14 / baseP) * 100).toFixed(2));
  const atr15m = Number((atr14 * 0.124).toFixed(4));

  return {
    rows,
    atr14,
    atr14Percent,
    atr15m,
  };
}

export interface EtfHighLowExtractInput {
  price?: number;
  high?: number;
  low?: number;
  high60d?: number;
  low60d?: number;
  high120d?: number;
  low120d?: number;
  history?: { date: string; high: number; low: number; close: number }[];
  fallbackBasePrice: number;
  fallbackAmpPercent: number;
}

/**
 * 根据所选区间模式（今日高/低、近15日高/低、近60日高/低、近120日高/低）
 * 自动从实时报价与历史K线中提取 ETF 的最高价与最低价
 */
export function extractEtfHighLow(
  source: EtfHighLowExtractInput,
  mode: T0PriceRangeMode
): {
  highPrice: number;
  lowPrice: number;
  todayHigh: number;
  todayLow: number;
  avgDailyAmpPct: number;
} {
  const baseP = source.price && source.price > 0 ? source.price : source.fallbackBasePrice;
  const history = Array.isArray(source.history) ? source.history : [];
  const validHighs = (list: typeof history) => list.map((c) => c.high).filter((v) => v > 0);
  const validLows = (list: typeof history) => list.map((c) => c.low).filter((v) => v > 0);

  const lastCandle = history.length > 0 ? history[history.length - 1] : undefined;
  const todayHigh =
    source.high && source.high > 0
      ? Number(source.high.toFixed(3))
      : lastCandle && lastCandle.high > 0
      ? Number(lastCandle.high.toFixed(3))
      : Number((baseP * (1 + source.fallbackAmpPercent / 200)).toFixed(3));

  const todayLow =
    source.low && source.low > 0
      ? Number(source.low.toFixed(3))
      : lastCandle && lastCandle.low > 0
      ? Number(lastCandle.low.toFixed(3))
      : Number((baseP * (1 - source.fallbackAmpPercent / 200)).toFixed(3));

  // 计算近15个交易日平均日内振幅%
  const last15 = history.slice(-15);
  let avgDailyAmpPct = source.fallbackAmpPercent;
  if (last15.length >= 3) {
    const amps = last15
      .map((c, idx) => {
        const ref = idx > 0 && last15[idx - 1].close > 0 ? last15[idx - 1].close : c.close;
        return ref > 0 && c.high >= c.low ? ((c.high - c.low) / ref) * 100 : 0;
      })
      .filter((v) => v > 0);
    if (amps.length > 0) {
      avgDailyAmpPct = Number((amps.reduce((a, b) => a + b, 0) / amps.length).toFixed(2));
    }
  }

  let highPrice = todayHigh;
  let lowPrice = todayLow;

  if (mode === 'today') {
    highPrice = todayHigh;
    lowPrice = todayLow;
  } else if (mode === 'kline_15d') {
    const hList = validHighs(last15);
    const lList = validLows(last15);
    highPrice = hList.length > 0 ? Math.max(...hList, todayHigh) : Number((baseP * (1 + (source.fallbackAmpPercent * 2.2) / 100)).toFixed(3));
    lowPrice = lList.length > 0 ? Math.min(...lList, todayLow > 0 ? todayLow : baseP) : Number((baseP * (1 - (source.fallbackAmpPercent * 2.2) / 100)).toFixed(3));
  } else if (mode === 'kline_60d') {
    const last60 = history.slice(-60);
    const hList = validHighs(last60);
    const lList = validLows(last60);
    highPrice =
      source.high60d && source.high60d > 0
        ? source.high60d
        : hList.length > 0
        ? Math.max(...hList)
        : Number((baseP * (1 + (source.fallbackAmpPercent * 4) / 100)).toFixed(3));
    lowPrice =
      source.low60d && source.low60d > 0
        ? source.low60d
        : lList.length > 0
        ? Math.min(...lList)
        : Number((baseP * (1 - (source.fallbackAmpPercent * 4) / 100)).toFixed(3));
  } else if (mode === 'kline_120d') {
    const last120 = history.slice(-120);
    const hList = validHighs(last120);
    const lList = validLows(last120);
    highPrice =
      source.high120d && source.high120d > 0
        ? source.high120d
        : hList.length > 0
        ? Math.max(...hList)
        : Number((baseP * (1 + (source.fallbackAmpPercent * 6) / 100)).toFixed(3));
    lowPrice =
      source.low120d && source.low120d > 0
        ? source.low120d
        : lList.length > 0
        ? Math.min(...lList)
        : Number((baseP * (1 - (source.fallbackAmpPercent * 6) / 100)).toFixed(3));
  }

  highPrice = Number(Math.max(highPrice, baseP).toFixed(3));
  lowPrice = Number(Math.min(lowPrice, baseP).toFixed(3));

  if (lowPrice >= highPrice || lowPrice <= 0) {
    highPrice = Number((baseP * 1.02).toFixed(3));
    lowPrice = Number((baseP * 0.98).toFixed(3));
  }

  return {
    highPrice,
    lowPrice,
    todayHigh,
    todayLow,
    avgDailyAmpPct,
  };
}

export type T0GridStrategyStyle = 'high_freq' | 'balanced' | 'wide';

export interface T0AutoGridLevelSuggestion {
  tierIndex: number; // 第几档 (1, 2, 3...)
  k: number; // 网格档位 (-1, -2... 或 +1, +2...)
  label: string; // B1, B2... 或 S1, S2...
  price: number; // 建议挂单价
  distPct: number; // 相对基准价偏离%
  shares: number; // 建议委托份数
  amount: number; // 预计成交金额
  pairPrice: number; // 对应止盈/回补配对价
  estNetProfit: number; // 预计单格净利
}

export interface T0AutoGridSuggestion {
  strategyStyle: T0GridStrategyStyle;
  strategyLabel: string;
  recommendedBasePrice: number;
  recommendedAtr15m: number;
  recommendedAtrMultiplier: number;
  recommendedStepPrice: number;
  recommendedStepPct: number;
  costToStepRatio: number;
  recommendedExpectedAmpPct: number;
  recommendedGridCountPerSide: number;
  suggestedBuyTierCount: number;
  suggestedSellTierCount: number;
  buyLevels: T0AutoGridLevelSuggestion[];
  sellLevels: T0AutoGridLevelSuggestion[];
  rangePositionPct: number | null; // 当前价处于[最低价, 最高价]的分位(0~100)
  totalBuyCapitalNeeded: number;
  rationale: string;
}

export interface GenerateAutoT0GridInput {
  currentPrice: number;
  atr14: number;
  atr15m: number;
  highPrice?: number;
  lowPrice?: number;
  perGridMoney: number;
  totalBudget: number;
  roundTripCostRatePct: number;
  minTick: number;
  minUnit: number;
  expectedAmpPct?: number;
  strategyStyle?: T0GridStrategyStyle;
}

const ATR_MULTIPLIER_CANDIDATES = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];

/**
 * 根据选定 ETF 的当前价格与 ATR 值，自动生成基准价、ATR倍数、网格间距及买入/卖出档位建议
 */
export function generateAutoT0GridParams(
  input: GenerateAutoT0GridInput
): T0AutoGridSuggestion {
  const minTick = input.minTick > 0 ? input.minTick : 0.001;
  const minUnit = input.minUnit > 0 ? input.minUnit : 100;
  const perGridMoney = input.perGridMoney > 0 ? input.perGridMoney : 2000;
  const totalBudget = input.totalBudget > 0 ? input.totalBudget : 12000;
  const costRateDecimal = (input.roundTripCostRatePct > 0 ? input.roundTripCostRatePct : 0.1) / 100;
  const strategyStyle: T0GridStrategyStyle = input.strategyStyle || 'balanced';

  const rawPrice = input.currentPrice > 0 ? input.currentPrice : 1.0;
  const recommendedBasePrice = Number(
    (Math.max(minTick, Math.round(rawPrice / minTick) * minTick)).toFixed(4)
  );

  // 优先采用15分钟折算ATR；若缺失则由日ATR14按0.124系数折算；兜底按1.8%日波幅折算
  const recommendedAtr15m =
    input.atr15m > 0
      ? Number(input.atr15m.toFixed(4))
      : input.atr14 > 0
      ? Number((input.atr14 * 0.124).toFixed(4))
      : Number((recommendedBasePrice * 0.018 * 0.124).toFixed(4));

  // 计算预期日振幅%
  const atrBasedAmpPct =
    input.atr14 > 0 && recommendedBasePrice > 0
      ? Number(((input.atr14 / recommendedBasePrice) * 100 * 1.12).toFixed(2))
      : 2.0;
  const recommendedExpectedAmpPct =
    input.expectedAmpPct && input.expectedAmpPct > 0
      ? Number(input.expectedAmpPct.toFixed(2))
      : Math.max(0.4, atrBasedAmpPct);

  // 按策略偏好选择起始ATR倍数，并确保成本占格距比尽量 ≤ 48%（避开>50%高摩擦红线）
  const startIndex =
    strategyStyle === 'high_freq' ? 0 : strategyStyle === 'wide' ? 4 : 2;

  let chosenMultiplier = ATR_MULTIPLIER_CANDIDATES[startIndex];
  let chosenStepPrice = minTick;
  let chosenCostRatio = 1;

  for (let idx = startIndex; idx < ATR_MULTIPLIER_CANDIDATES.length; idx++) {
    const m = ATR_MULTIPLIER_CANDIDATES[idx];
    const rawStep = Math.round((m * recommendedAtr15m) / minTick) * minTick;
    const step = Number(Math.max(minTick, rawStep).toFixed(4));
    const costRatio = (2 * recommendedBasePrice * costRateDecimal) / step;
    chosenMultiplier = m;
    chosenStepPrice = step;
    chosenCostRatio = costRatio;
    if (costRatio <= 0.48) {
      break;
    }
  }

  const recommendedStepPct = chosenStepPrice / recommendedBasePrice;

  // 资金上限与振幅上限综合确定建议每边格数
  const capitalLimit = totalBudget > 0 && perGridMoney > 0 ? Math.max(1, Math.floor(totalBudget / perGridMoney)) : 10;
  const ampFactor = strategyStyle === 'high_freq' ? 0.55 : strategyStyle === 'wide' ? 0.38 : 0.45;
  const rawAmpGrid = Math.max(
    2,
    Math.round(((recommendedExpectedAmpPct / 100) * ampFactor) / (recommendedStepPct > 0 ? recommendedStepPct : 0.002))
  );
  const recommendedGridCountPerSide = Math.max(2, Math.min(10, rawAmpGrid, capitalLimit));

  // 结合价格在[最低价, 最高价]中的分位位置，微调买卖档位偏向建议
  let rangePositionPct: number | null = null;
  let suggestedBuyTierCount = recommendedGridCountPerSide;
  let suggestedSellTierCount = recommendedGridCountPerSide;

  if (
    input.highPrice &&
    input.lowPrice &&
    input.highPrice > input.lowPrice &&
    recommendedBasePrice >= input.lowPrice * 0.98 &&
    recommendedBasePrice <= input.highPrice * 1.02
  ) {
    const rawPos = ((recommendedBasePrice - input.lowPrice) / (input.highPrice - input.lowPrice)) * 100;
    rangePositionPct = Math.max(0, Math.min(100, Number(rawPos.toFixed(1))));

    if (rangePositionPct >= 70) {
      // 价格处于区间偏高位：适当保留更多下方买入承接档，减少上方追高卖出档
      suggestedBuyTierCount = Math.max(2, Math.min(10, capitalLimit, recommendedGridCountPerSide + 1));
      suggestedSellTierCount = Math.max(2, recommendedGridCountPerSide - 1);
    } else if (rangePositionPct <= 30) {
      // 价格处于区间偏低位：下方安全垫偏薄，保留更多上方止盈卖出档
      suggestedBuyTierCount = Math.max(2, Math.min(capitalLimit, recommendedGridCountPerSide - 1));
      suggestedSellTierCount = Math.max(2, Math.min(10, recommendedGridCountPerSide + 1));
    }
  }

  // 生成具体买入档位建议列表 (B1 ~ Bn)
  const buyLevels: T0AutoGridLevelSuggestion[] = [];
  for (let i = 1; i <= suggestedBuyTierCount; i++) {
    const price = Number((recommendedBasePrice - i * chosenStepPrice).toFixed(4));
    if (price <= minTick) break;
    const distPct = Number((((price - recommendedBasePrice) / recommendedBasePrice) * 100).toFixed(2));
    const shares = Math.floor(perGridMoney / price / minUnit) * minUnit;
    const amount = Number((shares * price).toFixed(2));
    const pairPrice = Number((price + chosenStepPrice).toFixed(4));
    const grossProfit = shares * chosenStepPrice;
    const roundTripCost = (price + pairPrice) * shares * costRateDecimal;
    const estNetProfit = Number((grossProfit - roundTripCost).toFixed(2));

    buyLevels.push({
      tierIndex: i,
      k: -i,
      label: `B${i}`,
      price,
      distPct,
      shares,
      amount,
      pairPrice,
      estNetProfit,
    });
  }

  // 生成具体卖出档位建议列表 (S1 ~ Sn)
  const sellLevels: T0AutoGridLevelSuggestion[] = [];
  for (let i = 1; i <= suggestedSellTierCount; i++) {
    const price = Number((recommendedBasePrice + i * chosenStepPrice).toFixed(4));
    const distPct = Number((((price - recommendedBasePrice) / recommendedBasePrice) * 100).toFixed(2));
    const shares = Math.floor(perGridMoney / price / minUnit) * minUnit;
    const amount = Number((shares * price).toFixed(2));
    const pairPrice = Number((price - chosenStepPrice).toFixed(4));
    const grossProfit = shares * chosenStepPrice;
    const roundTripCost = (price + pairPrice) * shares * costRateDecimal;
    const estNetProfit = Number((grossProfit - roundTripCost).toFixed(2));

    sellLevels.push({
      tierIndex: i,
      k: i,
      label: `S${i}`,
      price,
      distPct,
      shares,
      amount,
      pairPrice,
      estNetProfit,
    });
  }

  const strategyLabel =
    strategyStyle === 'high_freq'
      ? '高频密集做T'
      : strategyStyle === 'wide'
      ? '宽幅波段稳健'
      : 'ATR标准均衡';

  const totalBuyCapitalNeeded = Number(
    buyLevels.reduce((sum, lv) => sum + lv.amount, 0).toFixed(2)
  );

  const posHint =
    rangePositionPct !== null
      ? rangePositionPct >= 70
        ? `当前价格位于区间 ${rangePositionPct}% 偏高位，建议多设买入承接档 (${buyLevels.length}买/${sellLevels.length}卖)。`
        : rangePositionPct <= 30
        ? `当前价格位于区间 ${rangePositionPct}% 偏低位，建议多设上方止盈卖出档 (${buyLevels.length}买/${sellLevels.length}卖)。`
        : `当前价格位于区间 ${rangePositionPct}% 中部，建议买卖均衡配置 (${buyLevels.length}买/${sellLevels.length}卖)。`
      : `按振幅与预算均衡生成 ${buyLevels.length} 档买入 + ${sellLevels.length} 档卖出。`;

  const rationale = `现价 ¥${recommendedBasePrice.toFixed(3)} · 15m ATR ¥${recommendedAtr15m.toFixed(4)} → 匹配 ${chosenMultiplier.toFixed(1)}x 倍数，格距 ¥${chosenStepPrice.toFixed(4)} (${(recommendedStepPct * 100).toFixed(2)}%)，成本占比 ${(chosenCostRatio * 100).toFixed(1)}%${chosenCostRatio <= 0.5 ? '（健康≤50%）' : '（受最小跳动/低波动约束）'}。${posHint}`;

  return {
    strategyStyle,
    strategyLabel,
    recommendedBasePrice,
    recommendedAtr15m,
    recommendedAtrMultiplier: chosenMultiplier,
    recommendedStepPrice: chosenStepPrice,
    recommendedStepPct,
    costToStepRatio: chosenCostRatio,
    recommendedExpectedAmpPct,
    recommendedGridCountPerSide,
    suggestedBuyTierCount: buyLevels.length,
    suggestedSellTierCount: sellLevels.length,
    buyLevels,
    sellLevels,
    rangePositionPct,
    totalBuyCapitalNeeded,
    rationale,
  };
}

export interface BacktestCandleInput {
  date: string;
  open?: number;
  high: number;
  low: number;
  close: number;
}

export interface BacktestTradeEvent {
  date: string;
  action: '买入' | '卖出';
  tierLabel: string;
  price: number;
  shares: number;
  amount: number;
  fee: number;
  pairProfit?: number;
}

export interface BacktestDayPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  dayAmpPct: number;
  totalNetPnl: number;
  realizedGridProfit: number;
  floatingPnl: number;
  returnPct: number;
  benchmarkReturnPct: number;
  dayTrades: number;
}

export interface T0HistoricalBacktestInput {
  candles: BacktestCandleInput[];
  lookbackDays: number;
  basePrice: number;
  gridStepPrice: number;
  buyTierCount: number;
  sellTierCount: number;
  perGridMoney: number;
  roundTripCostRatePct: number;
  minTick: number;
  minUnit: number;
}

export interface T0HistoricalBacktestResult {
  actualDays: number;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  periodHigh: number;
  periodLow: number;
  initialCapital: number;
  totalNetPnl: number; // 总模拟净收益 (已实现网格收益 + 持仓浮盈亏)
  realizedGridProfit: number; // 已实现网格套利净收益 (扣除双边手续费)
  floatingPnl: number; // 期末持仓浮盈亏
  totalReturnPct: number; // 期间模拟总收益率%
  gridOnlyReturnPct: number; // 纯网格套利收益率%
  annualizedGridReturnPct: number; // 年化网格套利收益率估算%
  benchmarkReturnPct: number; // 同期标的买入持有涨跌幅%
  excessReturnPct: number; // 相对买入持有超额收益%
  maxDrawdownPct: number; // 期间最大回撤%
  buyCount: number; // 买入触发次数
  sellCount: number; // 卖出触发次数
  matchedPairs: number; // 完成买卖套利配对数
  activeTradeDays: number; // 触发成交的交易日数
  dailyCurve: BacktestDayPoint[];
  recentTrades: BacktestTradeEvent[];
  gridRangeBottom: number;
  gridRangeTop: number;
}

/**
 * 基于历史日K线与用户设定的网格基准价、买卖档位数，模拟过去一段时间的网格交易收益
 */
export function runT0HistoricalBacktest(
  input: T0HistoricalBacktestInput
): T0HistoricalBacktestResult {
  const minTick = input.minTick > 0 ? input.minTick : 0.001;
  const minUnit = input.minUnit > 0 ? input.minUnit : 100;
  const basePrice = input.basePrice > 0 ? input.basePrice : 1.0;
  const step = Math.max(minTick, input.gridStepPrice > 0 ? input.gridStepPrice : minTick);
  const buyTiers = Math.max(1, Math.min(10, Math.round(input.buyTierCount || 1)));
  const sellTiers = Math.max(1, Math.min(10, Math.round(input.sellTierCount || 1)));
  const perGridMoney = input.perGridMoney > 0 ? input.perGridMoney : 2000;
  const singleSideCostRate = ((input.roundTripCostRatePct > 0 ? input.roundTripCostRatePct : 0.1) / 100) / 2;

  const cleanCandles = (input.candles || []).filter(
    (c) => c && c.high > 0 && c.low > 0 && c.close > 0
  );
  const sliced = cleanCandles.slice(-Math.max(2, input.lookbackDays || 30));

  const gridRangeBottom = Number(Math.max(minTick, basePrice - buyTiers * step).toFixed(4));
  const gridRangeTop = Number((basePrice + sellTiers * step).toFixed(4));

  if (sliced.length < 2) {
    return {
      actualDays: sliced.length,
      startDate: sliced[0]?.date || '',
      endDate: sliced[0]?.date || '',
      startPrice: basePrice,
      endPrice: basePrice,
      periodHigh: basePrice,
      periodLow: basePrice,
      initialCapital: (buyTiers + sellTiers) * perGridMoney,
      totalNetPnl: 0,
      realizedGridProfit: 0,
      floatingPnl: 0,
      totalReturnPct: 0,
      gridOnlyReturnPct: 0,
      annualizedGridReturnPct: 0,
      benchmarkReturnPct: 0,
      excessReturnPct: 0,
      maxDrawdownPct: 0,
      buyCount: 0,
      sellCount: 0,
      matchedPairs: 0,
      activeTradeDays: 0,
      dailyCurve: [],
      recentTrades: [],
      gridRangeBottom,
      gridRangeTop,
    };
  }

  // 构建区间槽位：slot k 在 levelPrice(k) 买入，在 levelPrice(k+1) 卖出
  // k 范围：[-buyTiers, sellTiers - 1]
  interface GridSlot {
    k: number;
    buyPrice: number;
    sellPrice: number;
    shares: number;
    held: boolean;
    entryCostPerShare: number;
    fromGridBuy: boolean;
  }

  const firstOpen =
    sliced[0].open && sliced[0].open > 0 ? sliced[0].open : sliced[0].close;

  const slots: GridSlot[] = [];
  for (let k = -buyTiers; k <= sellTiers - 1; k++) {
    const buyPrice = Number((basePrice + k * step).toFixed(4));
    const sellPrice = Number((basePrice + (k + 1) * step).toFixed(4));
    if (buyPrice <= minTick) continue;
    const shares = Math.floor(perGridMoney / buyPrice / minUnit) * minUnit;
    if (shares <= 0) continue;

    // k >= 0 对应基准价上方的卖出档位 (S1~Sn)，初始配备底仓等待逢高卖出
    // k < 0 对应基准价下方的买入档位 (B1~Bn)，初始持有现金等待逢低买入
    const initiallyHeld = k >= 0;
    slots.push({
      k,
      buyPrice,
      sellPrice,
      shares,
      held: initiallyHeld,
      entryCostPerShare: initiallyHeld ? firstOpen : 0,
      fromGridBuy: false,
    });
  }

  // 初始投入资金 = 买入档位预留现金 + 卖出档位初始底仓市值
  let cash = 0;
  let initialStockValue = 0;
  for (const s of slots) {
    if (s.held) {
      initialStockValue += s.shares * firstOpen;
    } else {
      cash += s.shares * s.buyPrice * (1 + singleSideCostRate);
    }
  }
  const initialCapital = Math.max(
    perGridMoney,
    Number((cash + initialStockValue).toFixed(2))
  );

  // 记录上方卖出槽位是否已先行高抛，用于识别“先卖后买回”的完整T+0闭环
  const soldBasePriceMap = new Map<number, number>();

  let buyCount = 0;
  let sellCount = 0;
  let matchedPairs = 0;
  let realizedGridProfit = 0;
  let activeTradeDays = 0;
  let periodHigh = sliced[0].high;
  let periodLow = sliced[0].low;
  let peakEquity = initialCapital;
  let maxDrawdownPct = 0;

  const allTrades: BacktestTradeEvent[] = [];
  const dailyCurve: BacktestDayPoint[] = [];

  for (let d = 0; d < sliced.length; d++) {
    const c = sliced[d];
    const openP = c.open && c.open > 0 ? c.open : d > 0 ? sliced[d - 1].close : c.close;
    periodHigh = Math.max(periodHigh, c.high);
    periodLow = Math.min(periodLow, c.low);

    // 根据当日阳线/阴线构造日内路径锚点
    const waypoints =
      c.close >= openP
        ? [openP, c.low, c.high, c.close]
        : [openP, c.high, c.low, c.close];

    let dayTrades = 0;
    for (let w = 1; w < waypoints.length; w++) {
      const prevP = waypoints[w - 1];
      const nextP = waypoints[w];

      if (nextP < prevP) {
        // 价格下行：由高档到低档依次检查买入触发
        for (let idx = slots.length - 1; idx >= 0; idx--) {
          const s = slots[idx];
          if (!s.held && nextP <= s.buyPrice) {
            const fillPrice = Number(Math.min(prevP, s.buyPrice).toFixed(4));
            const amount = Number((s.shares * fillPrice).toFixed(2));
            const fee = Number((amount * singleSideCostRate).toFixed(2));
            if (cash >= amount + fee) {
              cash -= amount + fee;
              let pairProfit: number | undefined;
              const prevSoldPrice = soldBasePriceMap.get(s.k);
              if (prevSoldPrice !== undefined) {
                const sellFee = s.shares * prevSoldPrice * singleSideCostRate;
                pairProfit = Number(
                  ((prevSoldPrice - fillPrice) * s.shares - fee - sellFee).toFixed(2)
                );
                realizedGridProfit += pairProfit;
                matchedPairs += 1;
                soldBasePriceMap.delete(s.k);
              }
              s.held = true;
              s.entryCostPerShare = fillPrice;
              s.fromGridBuy = true;
              buyCount += 1;
              dayTrades += 1;
              allTrades.push({
                date: c.date,
                action: '买入',
                tierLabel: s.k < 0 ? `B${Math.abs(s.k)}` : `回补${s.k}`,
                price: fillPrice,
                shares: s.shares,
                amount,
                fee,
                pairProfit,
              });
            }
          }
        }
      } else if (nextP > prevP) {
        // 价格上行：由低档到高档依次检查卖出触发
        for (let idx = 0; idx < slots.length; idx++) {
          const s = slots[idx];
          if (s.held && nextP >= s.sellPrice) {
            const fillPrice = Number(Math.max(prevP, s.sellPrice).toFixed(4));
            const amount = Number((s.shares * fillPrice).toFixed(2));
            const fee = Number((amount * singleSideCostRate).toFixed(2));
            cash += amount - fee;

            let pairProfit: number | undefined;
            if (s.fromGridBuy) {
              const entryP = s.entryCostPerShare > 0 ? s.entryCostPerShare : s.buyPrice;
              const entryFee = s.shares * entryP * singleSideCostRate;
              pairProfit = Number(
                ((fillPrice - entryP) * s.shares - fee - entryFee).toFixed(2)
              );
              realizedGridProfit += pairProfit;
              matchedPairs += 1;
            } else {
              // 初始底仓在卖出档先高抛，等待回落至下档买回完成做T闭环
              soldBasePriceMap.set(s.k, fillPrice);
            }

            s.held = false;
            s.entryCostPerShare = 0;
            s.fromGridBuy = false;
            sellCount += 1;
            dayTrades += 1;
            allTrades.push({
              date: c.date,
              action: '卖出',
              tierLabel: `S${s.k + 1}`,
              price: fillPrice,
              shares: s.shares,
              amount,
              fee,
              pairProfit,
            });
          }
        }
      }
    }

    if (dayTrades > 0) activeTradeDays += 1;

    const endingStockValue = slots.reduce(
      (sum, s) => sum + (s.held ? s.shares * c.close : 0),
      0
    );
    const totalEquity = cash + endingStockValue;
    const totalNetPnl = Number((totalEquity - initialCapital).toFixed(2));
    const realizedRounded = Number(realizedGridProfit.toFixed(2));
    const floatingPnl = Number((totalNetPnl - realizedRounded).toFixed(2));
    const returnPct = Number(((totalNetPnl / initialCapital) * 100).toFixed(2));
    const benchmarkReturnPct = Number(
      (((c.close - firstOpen) / firstOpen) * 100).toFixed(2)
    );

    peakEquity = Math.max(peakEquity, totalEquity);
    if (peakEquity > 0) {
      const dd = ((peakEquity - totalEquity) / peakEquity) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }

    const prevRefClose = d > 0 && sliced[d - 1].close > 0 ? sliced[d - 1].close : openP;
    const dayAmpPct =
      prevRefClose > 0 && c.high >= c.low
        ? Number((((c.high - c.low) / prevRefClose) * 100).toFixed(2))
        : 0;

    dailyCurve.push({
      date: c.date,
      open: Number(openP.toFixed(3)),
      high: Number(c.high.toFixed(3)),
      low: Number(c.low.toFixed(3)),
      close: Number(c.close.toFixed(3)),
      dayAmpPct,
      totalNetPnl,
      realizedGridProfit: realizedRounded,
      floatingPnl,
      returnPct,
      benchmarkReturnPct,
      dayTrades,
    });
  }

  const lastPoint = dailyCurve[dailyCurve.length - 1];
  const endPrice = sliced[sliced.length - 1].close;
  const totalNetPnl = lastPoint ? lastPoint.totalNetPnl : 0;
  const realizedRounded = Number(realizedGridProfit.toFixed(2));
  const floatingPnl = Number((totalNetPnl - realizedRounded).toFixed(2));
  const totalReturnPct = Number(((totalNetPnl / initialCapital) * 100).toFixed(2));
  const gridOnlyReturnPct = Number(((realizedRounded / initialCapital) * 100).toFixed(2));
  const annualizedGridReturnPct = Number(
    ((gridOnlyReturnPct / Math.max(1, sliced.length)) * 240).toFixed(2)
  );
  const benchmarkReturnPct = lastPoint ? lastPoint.benchmarkReturnPct : 0;
  const excessReturnPct = Number((totalReturnPct - benchmarkReturnPct).toFixed(2));

  return {
    actualDays: sliced.length,
    startDate: sliced[0].date,
    endDate: sliced[sliced.length - 1].date,
    startPrice: Number(firstOpen.toFixed(3)),
    endPrice: Number(endPrice.toFixed(3)),
    periodHigh: Number(periodHigh.toFixed(3)),
    periodLow: Number(periodLow.toFixed(3)),
    initialCapital,
    totalNetPnl,
    realizedGridProfit: realizedRounded,
    floatingPnl,
    totalReturnPct,
    gridOnlyReturnPct,
    annualizedGridReturnPct,
    benchmarkReturnPct,
    excessReturnPct,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    buyCount,
    sellCount,
    matchedPairs,
    activeTradeDays,
    dailyCurve,
    recentTrades: allTrades.slice(-12).reverse(),
    gridRangeBottom,
    gridRangeTop,
  };
}


