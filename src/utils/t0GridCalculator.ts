export interface T0GridInputState {
  code: string;
  name: string;
  basePrice: number; // C5 基准价 (默认1.365)
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
