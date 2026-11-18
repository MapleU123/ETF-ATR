import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  History,
  TrendingUp,
  RotateCcw,
  ArrowUpDown,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { EtfItem, AtrPeriod } from '../types';
import {
  calculateSheet2Atr,
  extractEtfHighLow,
  generateAutoT0GridParams,
  runT0HistoricalBacktest,
  T0GridStrategyStyle,
  T0PriceRangeMode,
} from '../utils/t0GridCalculator';

interface T0BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  etfs: EtfItem[];
  defaultEtfId?: string;
  atrPeriod: AtrPeriod;
}

type BacktestModalTab = 'single' | 'batch';
type BatchSortField = 'gridOnlyReturnPct' | 'totalReturnPct' | 'excessReturnPct' | 'matchedPairs';
type DetailLogTab = 'trades' | 'daily_ohlc';

export const T0BacktestModal: React.FC<T0BacktestModalProps> = ({
  isOpen,
  onClose,
  etfs,
  defaultEtfId,
  atrPeriod,
}) => {
  const [activeMode, setActiveMode] = useState<BacktestModalTab>('single');
  const [selectedId, setSelectedId] = useState<string>(
    defaultEtfId || etfs.find((e) => e.selected)?.id || etfs[0]?.id || ''
  );

  // 回测与区间参数状态
  const [strategyStyle, setStrategyStyle] = useState<T0GridStrategyStyle>('balanced');
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [priceRangeMode, setPriceRangeMode] = useState<T0PriceRangeMode>('kline_60d');
  const [perGridMoney, setPerGridMoney] = useState<number>(2000);
  const [totalBudget, setTotalBudget] = useState<number>(12000);
  const [roundTripCostRatePct, setRoundTripCostRatePct] = useState<number>(0.1);

  // 手动覆盖参数（null 表示跟随自动计算）
  const [customBasePrice, setCustomBasePrice] = useState<number | null>(null);
  const [customHighPrice, setCustomHighPrice] = useState<number | null>(null);
  const [customLowPrice, setCustomLowPrice] = useState<number | null>(null);
  const [customStepPrice, setCustomStepPrice] = useState<number | null>(null);
  const [customBuyTiers, setCustomBuyTiers] = useState<number | null>(null);
  const [customSellTiers, setCustomSellTiers] = useState<number | null>(null);

  // 明细与批量排序状态
  const [showDetailSection, setShowDetailSection] = useState<boolean>(true);
  const [detailLogTab, setDetailLogTab] = useState<DetailLogTab>('trades');
  const [batchSortField, setBatchSortField] = useState<BatchSortField>('gridOnlyReturnPct');
  const [batchScope, setBatchScope] = useState<'selected' | 'top_atr'>(() =>
    etfs.some((e) => e.selected) ? 'selected' : 'top_atr'
  );

  // 实时补拉K线缓存
  const [liveQuoteCache, setLiveQuoteCache] = useState<Record<string, EtfItem>>({});
  const [isLoadingKlines, setIsLoadingKlines] = useState<boolean>(false);

  const resetCustomOverrides = () => {
    setCustomBasePrice(null);
    setCustomHighPrice(null);
    setCustomLowPrice(null);
    setCustomStepPrice(null);
    setCustomBuyTiers(null);
    setCustomSellTiers(null);
  };

  // 打开弹窗或外部切换标的时同步状态
  useEffect(() => {
    if (!isOpen) return;
    const hasSelected = etfs.some((e) => e.selected);
    setBatchScope(hasSelected ? 'selected' : 'top_atr');
    if (defaultEtfId) {
      setSelectedId(defaultEtfId);
      setActiveMode('single');
    } else {
      const firstSelected = etfs.find((e) => e.selected);
      if (firstSelected) {
        setSelectedId(firstSelected.id);
      } else if (!selectedId && etfs.length > 0) {
        setSelectedId(etfs[0].id);
      }
    }
    resetCustomOverrides();
  }, [isOpen, defaultEtfId]);

  const currentEtf = useMemo(() => {
    const base = etfs.find((e) => e.id === selectedId) || etfs[0];
    if (!base) return undefined;
    return liveQuoteCache[base.code] || base;
  }, [etfs, selectedId, liveQuoteCache]);

  // 若当前ETF历史K线不足60根，按需拉取真实行情K线
  useEffect(() => {
    if (!isOpen || !currentEtf) return;
    if (currentEtf.history && currentEtf.history.length >= 60) return;
    if (liveQuoteCache[currentEtf.code]) return;

    let cancelled = false;
    setIsLoadingKlines(true);
    fetch(`/api/etf-quote?code=${encodeURIComponent(currentEtf.code)}&period=${atrPeriod}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && json?.item) {
          setLiveQuoteCache((prev) => ({
            ...prev,
            [currentEtf.code]: json.item,
          }));
        }
      })
      .catch(() => {
        // 保持本地历史序列兜底
      })
      .finally(() => {
        if (!cancelled) setIsLoadingKlines(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentEtf, atrPeriod, liveQuoteCache]);

  // 多周期最高价/最低价极值速览（当日 / 15日 / 60日 / 120日）
  const multiHorizonRanges = useMemo(() => {
    if (!currentEtf) return null;
    const source = {
      price: currentEtf.price,
      high: currentEtf.high,
      low: currentEtf.low,
      high60d: currentEtf.high60d,
      low60d: currentEtf.low60d,
      high120d: currentEtf.high120d,
      low120d: currentEtf.low120d,
      history: currentEtf.history || [],
      fallbackBasePrice: currentEtf.price,
      fallbackAmpPercent: Math.max(1.2, currentEtf.atrPercent * 1.1),
    };
    return {
      today: extractEtfHighLow(source, 'today'),
      kline_15d: extractEtfHighLow(source, 'kline_15d'),
      kline_60d: extractEtfHighLow(source, 'kline_60d'),
      kline_120d: extractEtfHighLow(source, 'kline_120d'),
    };
  }, [currentEtf]);

  const activeAutoRange = multiHorizonRanges ? multiHorizonRanges[priceRangeMode] : null;
  const effectiveHighPrice =
    customHighPrice !== null && customHighPrice > 0
      ? customHighPrice
      : activeAutoRange?.highPrice || currentEtf?.high || 1.0;
  const effectiveLowPrice =
    customLowPrice !== null && customLowPrice > 0
      ? customLowPrice
      : activeAutoRange?.lowPrice || currentEtf?.low || 1.0;

  // 单个标的自动网格参数建议（结合最高价、最低价分位动态调整买卖档位）
  const autoSuggestion = useMemo(() => {
    if (!currentEtf) return null;
    const candles = currentEtf.history || [];
    const sheet2 = candles.length >= 5 ? calculateSheet2Atr(candles, currentEtf.price) : null;
    const atr14 = sheet2 ? sheet2.atr14 : currentEtf.atr;
    const atr15m = sheet2 ? sheet2.atr15m : Number((currentEtf.atr * 0.124).toFixed(4));

    return generateAutoT0GridParams({
      currentPrice: currentEtf.price,
      atr14,
      atr15m,
      highPrice: effectiveHighPrice,
      lowPrice: effectiveLowPrice,
      perGridMoney,
      totalBudget,
      roundTripCostRatePct,
      minTick: 0.001,
      minUnit: 100,
      expectedAmpPct: activeAutoRange?.avgDailyAmpPct,
      strategyStyle,
    });
  }, [
    currentEtf,
    effectiveHighPrice,
    effectiveLowPrice,
    perGridMoney,
    totalBudget,
    roundTripCostRatePct,
    activeAutoRange?.avgDailyAmpPct,
    strategyStyle,
  ]);

  const effectiveBasePrice =
    customBasePrice !== null && customBasePrice > 0
      ? customBasePrice
      : autoSuggestion?.recommendedBasePrice || currentEtf?.price || 1.0;

  const effectiveStepPrice =
    customStepPrice !== null && customStepPrice > 0
      ? customStepPrice
      : autoSuggestion?.recommendedStepPrice || 0.004;

  const effectiveBuyTiers =
    customBuyTiers !== null && customBuyTiers > 0
      ? customBuyTiers
      : autoSuggestion?.suggestedBuyTierCount || 4;

  const effectiveSellTiers =
    customSellTiers !== null && customSellTiers > 0
      ? customSellTiers
      : autoSuggestion?.suggestedSellTierCount || 4;

  // 单标的回测执行
  const backtestResult = useMemo(() => {
    if (!currentEtf) return null;
    const candles = currentEtf.history || [];
    return runT0HistoricalBacktest({
      candles,
      lookbackDays,
      basePrice: effectiveBasePrice,
      gridStepPrice: effectiveStepPrice,
      buyTierCount: effectiveBuyTiers,
      sellTierCount: effectiveSellTiers,
      perGridMoney,
      roundTripCostRatePct,
      minTick: 0.001,
      minUnit: 100,
    });
  }, [
    currentEtf,
    lookbackDays,
    effectiveBasePrice,
    effectiveStepPrice,
    effectiveBuyTiers,
    effectiveSellTiers,
    perGridMoney,
    roundTripCostRatePct,
  ]);

  // 具体买卖挂单档位价格明细
  const ladderPreview = useMemo(() => {
    const step = Math.max(0.001, effectiveStepPrice);
    const base = Math.max(0.001, effectiveBasePrice);
    const buys: Array<{ label: string; price: number; pct: number; inRange: boolean }> = [];
    const sells: Array<{ label: string; price: number; pct: number; inRange: boolean }> = [];

    for (let i = 1; i <= effectiveBuyTiers; i++) {
      const p = Number((base - i * step).toFixed(3));
      if (p <= 0.001) break;
      buys.push({
        label: `B${i}`,
        price: p,
        pct: Number((((p - base) / base) * 100).toFixed(2)),
        inRange: p >= effectiveLowPrice - 0.0005,
      });
    }
    for (let i = 1; i <= effectiveSellTiers; i++) {
      const p = Number((base + i * step).toFixed(3));
      sells.push({
        label: `S${i}`,
        price: p,
        pct: Number((((p - base) / base) * 100).toFixed(2)),
        inRange: p <= effectiveHighPrice + 0.0005,
      });
    }
    return { buys, sells };
  }, [effectiveBasePrice, effectiveStepPrice, effectiveBuyTiers, effectiveSellTiers, effectiveLowPrice, effectiveHighPrice]);

  // 快捷基准价锚点（回测期初价 / 区间高低中枢价）
  const periodAnchorPrices = useMemo(() => {
    const candles = (currentEtf?.history || []).slice(-Math.max(2, lookbackDays));
    if (candles.length === 0) {
      return {
        startOpen: currentEtf?.price || 1,
        midPrice: Number(((effectiveHighPrice + effectiveLowPrice) / 2).toFixed(3)),
      };
    }
    const startOpen = candles[0].open && candles[0].open > 0 ? candles[0].open : candles[0].close;
    const hi = Math.max(...candles.map((c) => c.high));
    const lo = Math.min(...candles.map((c) => c.low));
    return {
      startOpen: Number(startOpen.toFixed(3)),
      midPrice: Number(((hi + lo) / 2).toFixed(3)),
    };
  }, [currentEtf, lookbackDays, effectiveHighPrice, effectiveLowPrice]);

  // 批量横向回测（已选ETF 或 全榜高波动 Top 20）
  const selectedEtfs = useMemo(() => etfs.filter((e) => e.selected), [etfs]);
  const batchTargetEtfs = useMemo(() => {
    if (batchScope === 'selected' && selectedEtfs.length > 0) {
      return selectedEtfs;
    }
    return [...etfs].sort((a, b) => b.atrPercent - a.atrPercent).slice(0, 20);
  }, [etfs, selectedEtfs, batchScope]);

  const batchResults = useMemo(() => {
    if (activeMode !== 'batch') return [];
    const rows = batchTargetEtfs.map((item) => {
      const candles = item.history || [];
      const sheet2 = candles.length >= 5 ? calculateSheet2Atr(candles, item.price) : null;
      const atr14 = sheet2 ? sheet2.atr14 : item.atr;
      const atr15m = sheet2 ? sheet2.atr15m : Number((item.atr * 0.124).toFixed(4));
      const sliced = candles.slice(-Math.max(2, lookbackDays));
      const periodHi =
        sliced.length > 0 ? Number(Math.max(...sliced.map((c) => c.high)).toFixed(3)) : item.high;
      const periodLo =
        sliced.length > 0 ? Number(Math.min(...sliced.map((c) => c.low)).toFixed(3)) : item.low;
      const midAnchor = Number(((periodHi + periodLo) / 2).toFixed(3));
      const spanPct =
        midAnchor > 0 ? Number((((periodHi - periodLo) / midAnchor) * 100).toFixed(2)) : 0;

      const auto = generateAutoT0GridParams({
        currentPrice: item.price,
        atr14,
        atr15m,
        highPrice: periodHi,
        lowPrice: periodLo,
        perGridMoney,
        totalBudget,
        roundTripCostRatePct,
        minTick: 0.001,
        minUnit: 100,
        strategyStyle,
      });

      const bt = runT0HistoricalBacktest({
        candles,
        lookbackDays,
        basePrice: midAnchor > 0 ? midAnchor : auto.recommendedBasePrice,
        gridStepPrice: auto.recommendedStepPrice,
        buyTierCount: auto.suggestedBuyTierCount,
        sellTierCount: auto.suggestedSellTierCount,
        perGridMoney,
        roundTripCostRatePct,
        minTick: 0.001,
        minUnit: 100,
      });

      return {
        etf: item,
        auto,
        bt,
        periodHi,
        periodLo,
        spanPct,
        anchorBase: midAnchor > 0 ? midAnchor : auto.recommendedBasePrice,
      };
    });

    rows.sort((a, b) => b.bt[batchSortField] - a.bt[batchSortField]);
    return rows;
  }, [
    activeMode,
    batchTargetEtfs,
    lookbackDays,
    perGridMoney,
    totalBudget,
    roundTripCostRatePct,
    strategyStyle,
    batchSortField,
  ]);

  if (!isOpen || !currentEtf) return null;

  const stepPct = effectiveBasePrice > 0 ? (effectiveStepPrice / effectiveBasePrice) * 100 : 0;
  const costRatioPct =
    effectiveStepPrice > 0
      ? ((2 * effectiveBasePrice * (roundTripCostRatePct / 100)) / effectiveStepPrice) * 100
      : 0;
  const highLowSpanPct =
    effectiveBasePrice > 0 && effectiveHighPrice > effectiveLowPrice
      ? Number((((effectiveHighPrice - effectiveLowPrice) / effectiveBasePrice) * 100).toFixed(2))
      : 0;
  const pricePosPct =
    effectiveHighPrice > effectiveLowPrice
      ? Math.max(
          0,
          Math.min(
            100,
            Number(
              (
                ((currentEtf.price - effectiveLowPrice) /
                  (effectiveHighPrice - effectiveLowPrice)) *
                100
              ).toFixed(1)
            )
          )
        )
      : 50;

  const isWithinHighLowBounds =
    backtestResult !== null &&
    backtestResult.gridRangeBottom >= effectiveLowPrice - 0.001 &&
    backtestResult.gridRangeTop <= effectiveHighPrice + 0.001;

  const hasManualOverride =
    customBasePrice !== null ||
    customHighPrice !== null ||
    customLowPrice !== null ||
    customStepPrice !== null ||
    customBuyTiers !== null ||
    customSellTiers !== null;

  // 一键按高低价匹配买卖档数
  const handleFitTiersToHighLow = () => {
    const step = Math.max(0.001, effectiveStepPrice);
    const fitSell = Math.max(1, Math.min(10, Math.floor((effectiveHighPrice - effectiveBasePrice) / step)));
    const fitBuy = Math.max(1, Math.min(10, Math.floor((effectiveBasePrice - effectiveLowPrice) / step)));
    setCustomSellTiers(fitSell);
    setCustomBuyTiers(fitBuy);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="t0-backtest-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <History className="w-4 h-4 text-rose-600 shrink-0" />
              <h2
                id="t0-backtest-modal-title"
                className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap"
              >
                日内做T网格历史回测
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">·</span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                含最高价、最低价极值区间及 ATR 折算格距模拟
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeMode === 'single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                单标的深度回测
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('batch')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeMode === 'batch'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                批量对比排行
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="关闭回测窗口"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Shared Controls Bar: 标的选择 + 策略风格 + 回测窗口 */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-200">
            {activeMode === 'single' ? (
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <label
                    htmlFor="t0-backtest-etf-select"
                    className="text-slate-700 font-semibold whitespace-nowrap shrink-0"
                  >
                    回测标的:
                  </label>
                  <select
                    id="t0-backtest-etf-select"
                    value={currentEtf.id}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      resetCustomOverrides();
                    }}
                    className="flex-1 min-w-[220px] max-w-md px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    {etfs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.code}) · 现价 ¥{e.price.toFixed(3)} · 高 ¥{e.high.toFixed(3)} / 低 ¥{e.low.toFixed(3)}
                      </option>
                    ))}
                  </select>
                  {isLoadingKlines && (
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      正在同步最新日K...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap font-mono tabular-nums">
                  <span className="font-sans">{currentEtf.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>现价 ¥{currentEtf.price.toFixed(3)}</span>
                  <span aria-hidden="true">·</span>
                  <span>ATR({atrPeriod}天) ¥{currentEtf.atr.toFixed(3)} ({currentEtf.atrPercent.toFixed(2)}%)</span>
                  <span aria-hidden="true">·</span>
                  <span>近15日均振幅 {activeAutoRange?.avgDailyAmpPct ?? 0}%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-slate-700 font-semibold whitespace-nowrap">对比范围:</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    disabled={selectedEtfs.length === 0}
                    onClick={() => setBatchScope('selected')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      batchScope === 'selected'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    已勾选标的 ({selectedEtfs.length}只)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchScope('top_atr')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      batchScope === 'top_atr'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    全榜高波 Top 20
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  含回测期内最高价、最低价及振幅对比
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* 策略风格切换 */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'high_freq', label: '高频密集' },
                    { id: 'balanced', label: 'ATR均衡' },
                    { id: 'wide', label: '宽幅稳健' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStrategyStyle(s.id);
                      setCustomStepPrice(null);
                      setCustomBuyTiers(null);
                      setCustomSellTiers(null);
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      strategyStyle === s.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* 回测天数切换 */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {[15, 30, 60, 120].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setLookbackDays(d)}
                    className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      lookbackDays === d
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}日
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeMode === 'single' && backtestResult && multiHorizonRanges && (
            <>
              {/* 多周期最高价/最低价极值对比与口径快速切换 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-slate-800">
                    各周期最高价 / 最低价极值数据（点击切换网格上下限口径）
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    区间振幅 {highLowSpanPct}% · 现价位于当前区间 {pricePosPct}% 分位
                    {pricePosPct >= 75
                      ? '（偏高位，宜多留买档）'
                      : pricePosPct <= 25
                      ? '（偏低位，宜多留卖档）'
                      : '（中部均衡）'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
                  {(
                    [
                      { id: 'today', label: '当日盘中极值', data: multiHorizonRanges.today },
                      { id: 'kline_15d', label: '近15日最高/最低', data: multiHorizonRanges.kline_15d },
                      { id: 'kline_60d', label: '近60日最高/最低', data: multiHorizonRanges.kline_60d },
                      { id: 'kline_120d', label: '近120日最高/最低', data: multiHorizonRanges.kline_120d },
                    ] as const
                  ).map((h) => {
                    const active = priceRangeMode === h.id && customHighPrice === null && customLowPrice === null;
                    const amp =
                      h.data.lowPrice > 0
                        ? (((h.data.highPrice - h.data.lowPrice) / h.data.lowPrice) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setPriceRangeMode(h.id);
                          setCustomHighPrice(null);
                          setCustomLowPrice(null);
                        }}
                        className={`p-3 text-left transition-colors cursor-pointer ${
                          active ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className={active ? 'text-slate-200 font-semibold' : 'text-slate-500 font-medium'}>
                            {h.label}
                          </span>
                          <span className={`font-mono tabular-nums ${active ? 'text-amber-300' : 'text-slate-400'}`}>
                            振幅 {amp}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
                          <span className={active ? 'text-rose-300 font-bold' : 'text-red-600 font-bold'}>
                            高 ¥{h.data.highPrice.toFixed(3)}
                          </span>
                          <span className={active ? 'text-emerald-300 font-bold' : 'text-emerald-700 font-bold'}>
                            低 ¥{h.data.lowPrice.toFixed(3)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Grid Parameters Row (包含最高价、最低价、基准价、格距与买卖档位) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>做T网格回测参数配置</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-mono tabular-nums font-semibold ${
                        costRatioPct > 50 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      格距 {stepPct.toFixed(2)}% · 费用占格距 {costRatioPct.toFixed(1)}%
                      {costRatioPct > 50 ? ' (偏高)' : ' (健康)'}
                    </span>
                    <button
                      type="button"
                      onClick={handleFitTiersToHighLow}
                      className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors whitespace-nowrap cursor-pointer"
                      title="根据设定的最高价、最低价与单格价差自动推算买入与卖出档数"
                    >
                      按高低价对齐档数
                    </button>
                    {hasManualOverride && (
                      <button
                        type="button"
                        onClick={resetCustomOverrides}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>恢复自动参数</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-medium">基准价 (¥)</label>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setCustomBasePrice(Number(currentEtf.price.toFixed(3)))}
                          className="text-slate-500 hover:text-rose-600 underline cursor-pointer"
                        >
                          现价
                        </button>
                        <span className="text-slate-300">/</span>
                        <button
                          type="button"
                          onClick={() => setCustomBasePrice(periodAnchorPrices.midPrice)}
                          className="text-slate-500 hover:text-rose-600 underline cursor-pointer"
                        >
                          中枢
                        </button>
                        <span className="text-slate-300">/</span>
                        <button
                          type="button"
                          onClick={() => setCustomBasePrice(periodAnchorPrices.startOpen)}
                          className="text-slate-500 hover:text-rose-600 underline cursor-pointer"
                        >
                          期初
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      min="0.01"
                      value={effectiveBasePrice}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setCustomBasePrice(Number.isFinite(v) && v > 0 ? v : null);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-red-600 font-semibold mb-1">
                      最高价 · 网格上限 (¥)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.01"
                      value={effectiveHighPrice}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setCustomHighPrice(Number.isFinite(v) && v > 0 ? v : null);
                      }}
                      className="w-full px-2.5 py-1.5 border border-red-200 rounded-lg font-mono tabular-nums font-semibold text-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-700 font-semibold mb-1">
                      最低价 · 网格下限 (¥)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.01"
                      value={effectiveLowPrice}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setCustomLowPrice(Number.isFinite(v) && v > 0 ? v : null);
                      }}
                      className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg font-mono tabular-nums font-semibold text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      单格价差 (¥)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={effectiveStepPrice}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setCustomStepPrice(Number.isFinite(v) && v > 0 ? v : null);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      买入档数 (B1~Bn)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={effectiveBuyTiers}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setCustomBuyTiers(
                          Number.isFinite(v) && v > 0 ? Math.min(10, v) : null
                        );
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-semibold text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      卖出档数 (S1~Sn)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={effectiveSellTiers}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setCustomSellTiers(
                          Number.isFinite(v) && v > 0 ? Math.min(10, v) : null
                        );
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-semibold text-rose-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      每格资金 (¥)
                    </label>
                    <input
                      type="number"
                      step={500}
                      min={500}
                      value={perGridMoney}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v) && v >= 500) {
                          setPerGridMoney(v);
                          setTotalBudget(Math.max(v * 2, v * 6));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      往返成本率 (%)
                    </label>
                    <input
                      type="number"
                      step="0.02"
                      min="0"
                      max="1"
                      value={roundTripCostRatePct}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v) && v >= 0) {
                          setRoundTripCostRatePct(v);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* 挂单区间与实际K线高低价对比条 */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-600 pt-1">
                  <div>
                    网格挂单区间：¥{backtestResult.gridRangeBottom.toFixed(3)} ~ ¥
                    {backtestResult.gridRangeTop.toFixed(3)}
                    <span
                      className={`ml-2 font-sans font-semibold ${
                        isWithinHighLowBounds ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      ({isWithinHighLowBounds ? '在设定高低价区间内' : '超出设定高低价边界，可点「按高低价对齐档数」'})
                    </span>
                  </div>
                  <div>
                    回测期实测高低：{backtestResult.startDate || '—'} ~ {backtestResult.endDate || '—'} · 最高{' '}
                    <span className="text-red-600 font-bold">¥{backtestResult.periodHigh.toFixed(3)}</span> / 最低{' '}
                    <span className="text-emerald-700 font-bold">¥{backtestResult.periodLow.toFixed(3)}</span>
                  </div>
                </div>

                {/* 买卖挂单具体价位预览 */}
                <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[11px] font-mono tabular-nums">
                  <div className="p-2.5 flex items-center gap-2 flex-wrap">
                    <span className="font-sans font-semibold text-emerald-700 shrink-0">
                      买入档位 ({ladderPreview.buys.length}):
                    </span>
                    {ladderPreview.buys.map((b) => (
                      <span
                        key={b.label}
                        className={b.inRange ? 'text-slate-700' : 'text-amber-700 underline decoration-dotted'}
                        title={b.inRange ? `${b.label} 触发价` : `${b.label} 低于设定最低价 ¥${effectiveLowPrice.toFixed(3)}`}
                      >
                        {b.label} ¥{b.price.toFixed(3)}({b.pct}%)
                      </span>
                    ))}
                  </div>
                  <div className="p-2.5 flex items-center gap-2 flex-wrap">
                    <span className="font-sans font-semibold text-rose-600 shrink-0">
                      卖出档位 ({ladderPreview.sells.length}):
                    </span>
                    {ladderPreview.sells.map((s) => (
                      <span
                        key={s.label}
                        className={s.inRange ? 'text-slate-700' : 'text-amber-700 underline decoration-dotted'}
                        title={s.inRange ? `${s.label} 触发价` : `${s.label} 高于设定最高价 ¥${effectiveHighPrice.toFixed(3)}`}
                      >
                        {s.label} ¥{s.price.toFixed(3)}(+{s.pct}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4 KPI Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white">
                <div className="p-3.5">
                  <div className="text-[11px] text-slate-500">已实现做T套利净利 (扣费)</div>
                  <div
                    className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                      backtestResult.realizedGridProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {backtestResult.realizedGridProfit >= 0 ? '+' : ''}¥
                    {backtestResult.realizedGridProfit.toFixed(2)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    网格收益率 {backtestResult.gridOnlyReturnPct >= 0 ? '+' : ''}
                    {backtestResult.gridOnlyReturnPct}% · 年化约 {backtestResult.annualizedGridReturnPct}%
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="text-[11px] text-slate-500">总模拟净收益 (含持仓浮盈亏)</div>
                  <div
                    className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                      backtestResult.totalNetPnl >= 0 ? 'text-slate-900' : 'text-rose-600'
                    }`}
                  >
                    {backtestResult.totalNetPnl >= 0 ? '+' : ''}¥
                    {backtestResult.totalNetPnl.toFixed(2)}{' '}
                    <span className="text-xs font-semibold">
                      ({backtestResult.totalReturnPct >= 0 ? '+' : ''}
                      {backtestResult.totalReturnPct}%)
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    持仓浮盈亏 {backtestResult.floatingPnl >= 0 ? '+' : ''}¥
                    {backtestResult.floatingPnl.toFixed(2)} · 资金 ¥
                    {backtestResult.initialCapital.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="text-[11px] text-slate-500">相对同期持有超额收益</div>
                  <div
                    className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                      backtestResult.excessReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {backtestResult.excessReturnPct >= 0 ? '+' : ''}
                    {backtestResult.excessReturnPct}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    同期持有 {backtestResult.benchmarkReturnPct >= 0 ? '+' : ''}
                    {backtestResult.benchmarkReturnPct}% · 最大回撤 -{backtestResult.maxDrawdownPct}%
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="text-[11px] text-slate-500">历史做T触发与闭环配对</div>
                  <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                    {backtestResult.matchedPairs} 对闭环
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    买 {backtestResult.buyCount} 次 / 卖 {backtestResult.sellCount} 次 · 活跃{' '}
                    {backtestResult.activeTradeDays}/{backtestResult.actualDays} 日
                  </div>
                </div>
              </div>

              {/* Cumulative Return Comparison SVG Chart */}
              {backtestResult.dailyCurve.length >= 2 && (() => {
                const pts = backtestResult.dailyCurve;
                const vals = pts.flatMap((p) => [p.returnPct, p.benchmarkReturnPct, 0]);
                const minV = Math.min(...vals);
                const maxV = Math.max(...vals);
                const span = Math.max(0.5, maxV - minV);
                const w = 780;
                const h = 150;
                const padX = 12;
                const padY = 14;
                const toX = (i: number) =>
                  padX + (i / Math.max(1, pts.length - 1)) * (w - padX * 2);
                const toY = (v: number) => padY + ((maxV - v) / span) * (h - padY * 2);

                const gridPath = pts
                  .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.returnPct).toFixed(1)}`)
                  .join(' ');
                const benchPath = pts
                  .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.benchmarkReturnPct).toFixed(1)}`)
                  .join(' ');
                const zeroY = toY(0);

                return (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-white">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                        <span>累计收益率对比曲线（区间最高 ¥{backtestResult.periodHigh.toFixed(3)} / 最低 ¥{backtestResult.periodLow.toFixed(3)}）</span>
                      </span>
                      <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold">
                          <span className="w-3.5 h-0.5 bg-rose-600 inline-block" />
                          网格做T ({backtestResult.totalReturnPct >= 0 ? '+' : ''}
                          {backtestResult.totalReturnPct}%)
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold">
                          <span className="w-3.5 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                          买入持有 ({backtestResult.benchmarkReturnPct >= 0 ? '+' : ''}
                          {backtestResult.benchmarkReturnPct}%)
                        </span>
                      </div>
                    </div>

                    <div className="w-full overflow-hidden">
                      <svg
                        viewBox={`0 0 ${w} ${h}`}
                        className="w-full h-36 block"
                        preserveAspectRatio="none"
                      >
                        <line
                          x1={padX}
                          y1={zeroY}
                          x2={w - padX}
                          y2={zeroY}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                          strokeDasharray="3,3"
                        />
                        <path
                          d={benchPath}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.6"
                          strokeDasharray="4,3"
                        />
                        <path
                          d={gridPath}
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="2.2"
                        />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
                      <span>
                        {backtestResult.startDate} (起 ¥{backtestResult.startPrice.toFixed(3)})
                      </span>
                      <span>
                        策略峰值 +{maxV.toFixed(2)}% · 谷值 {minV.toFixed(2)}%
                      </span>
                      <span>
                        {backtestResult.endDate} (终 ¥{backtestResult.endPrice.toFixed(3)})
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 模拟触发流水 & 逐日K线最高/最低价数据切换表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailLogTab('trades');
                        setShowDetailSection(true);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        detailLogTab === 'trades'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      模拟触发成交流水 ({backtestResult.buyCount + backtestResult.sellCount}笔)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailLogTab('daily_ohlc');
                        setShowDetailSection(true);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        detailLogTab === 'daily_ohlc'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      逐日最高/最低价与触发记录 ({backtestResult.dailyCurve.length}日)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetailSection((v) => !v)}
                    className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    {showDetailSection ? '收起明细' : '展开明细'}
                  </button>
                </div>

                {showDetailSection && detailLogTab === 'trades' && (
                  backtestResult.recentTrades.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left border-collapse font-mono tabular-nums text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans">
                            <th className="py-2 px-3">交易日期</th>
                            <th className="py-2 px-3 text-center">方向</th>
                            <th className="py-2 px-3 text-center">触发档位</th>
                            <th className="py-2 px-3 text-right">触发价 (¥)</th>
                            <th className="py-2 px-3 text-right">成交份数</th>
                            <th className="py-2 px-3 text-right">成交金额 (¥)</th>
                            <th className="py-2 px-3 text-right">闭环套利净利</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {backtestResult.recentTrades.map((t, i) => (
                            <tr key={`${t.date}-${t.tierLabel}-${i}`} className="hover:bg-slate-50/70">
                              <td className="py-1.5 px-3 text-slate-700">{t.date}</td>
                              <td className="py-1.5 px-3 text-center font-sans">
                                <span
                                  className={`font-semibold ${
                                    t.action === '买入' ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {t.action}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-center font-semibold text-slate-800">
                                {t.tierLabel}
                              </td>
                              <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                                ¥{t.price.toFixed(4)}
                              </td>
                              <td className="py-1.5 px-3 text-right text-slate-700">
                                {t.shares.toLocaleString()}
                              </td>
                              <td className="py-1.5 px-3 text-right text-slate-700">
                                ¥{t.amount.toFixed(1)}
                              </td>
                              <td
                                className={`py-1.5 px-3 text-right font-semibold ${
                                  t.pairProfit === undefined
                                    ? 'text-slate-400 font-sans font-normal'
                                    : t.pairProfit >= 0
                                    ? 'text-emerald-700'
                                    : 'text-rose-600'
                                }`}
                              >
                                {t.pairProfit === undefined
                                  ? '开仓/建仓'
                                  : `${t.pairProfit >= 0 ? '+' : ''}¥${t.pairProfit.toFixed(2)}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 border border-slate-200 rounded-xl text-slate-500">
                      在过去 {backtestResult.actualDays} 个交易日（实际高低 ¥
                      {backtestResult.periodLow.toFixed(3)} ~ ¥{backtestResult.periodHigh.toFixed(3)}
                      ）内未触发当前网格档位。可点击基准价旁的「中枢」或「期初」，或点「按高低价对齐档数」。
                    </div>
                  )
                )}

                {showDetailSection && detailLogTab === 'daily_ohlc' && (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse font-mono tabular-nums text-[11px]">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-sans">
                        <tr>
                          <th className="py-2 px-3">日期</th>
                          <th className="py-2 px-2.5 text-right">开盘 (¥)</th>
                          <th className="py-2 px-2.5 text-right text-red-600">最高价 (¥)</th>
                          <th className="py-2 px-2.5 text-right text-emerald-700">最低价 (¥)</th>
                          <th className="py-2 px-2.5 text-right">收盘 (¥)</th>
                          <th className="py-2 px-2.5 text-right">日振幅%</th>
                          <th className="py-2 px-2.5 text-center">触发次数</th>
                          <th className="py-2 px-2.5 text-right">累计套利净利</th>
                          <th className="py-2 px-3 text-right">策略累计%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...backtestResult.dailyCurve].reverse().map((day) => (
                          <tr key={day.date} className="hover:bg-slate-50/70">
                            <td className="py-1.5 px-3 text-slate-700">{day.date}</td>
                            <td className="py-1.5 px-2.5 text-right text-slate-600">
                              ¥{day.open.toFixed(3)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold text-red-600">
                              ¥{day.high.toFixed(3)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-700">
                              ¥{day.low.toFixed(3)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold text-slate-900">
                              ¥{day.close.toFixed(3)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-slate-600">
                              {day.dayAmpPct.toFixed(2)}%
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              {day.dayTrades > 0 ? (
                                <span className="font-semibold text-rose-600">{day.dayTrades} 笔</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td
                              className={`py-1.5 px-2.5 text-right font-semibold ${
                                day.realizedGridProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {day.realizedGridProfit >= 0 ? '+' : ''}¥
                              {day.realizedGridProfit.toFixed(2)}
                            </td>
                            <td
                              className={`py-1.5 px-3 text-right font-semibold ${
                                day.returnPct >= 0 ? 'text-slate-900' : 'text-rose-600'
                              }`}
                            >
                              {day.returnPct >= 0 ? '+' : ''}
                              {day.returnPct.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeMode === 'batch' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-slate-600">
                  共回测 <strong className="font-mono text-slate-900">{batchResults.length}</strong>{' '}
                  只标的（窗口：近 {lookbackDays} 日 · 每格 ¥{perGridMoney} · 成本 {roundTripCostRatePct}%）
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    排序:
                  </span>
                  {(
                    [
                      { id: 'gridOnlyReturnPct', label: '做T网格收益率' },
                      { id: 'totalReturnPct', label: '总模拟收益率' },
                      { id: 'excessReturnPct', label: '超额收益' },
                      { id: 'matchedPairs', label: '闭环配对数' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBatchSortField(opt.id)}
                      className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        batchSortField === opt.id
                          ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-2.5 text-center w-10">#</th>
                      <th className="py-2.5 px-3">ETF名称 / 代码</th>
                      <th className="py-2.5 px-2.5 text-right">现价 / 中枢</th>
                      <th className="py-2.5 px-2.5 text-right text-red-600">期间最高(¥)</th>
                      <th className="py-2.5 px-2.5 text-right text-emerald-700">期间最低(¥)</th>
                      <th className="py-2.5 px-2.5 text-right">振幅%</th>
                      <th className="py-2.5 px-2.5 text-right">推荐格距</th>
                      <th className="py-2.5 px-2.5 text-center">买/卖档</th>
                      <th className="py-2.5 px-2.5 text-right">做T净利(¥)</th>
                      <th className="py-2.5 px-2.5 text-right">网格收益率</th>
                      <th className="py-2.5 px-2.5 text-right">总收益率</th>
                      <th className="py-2.5 px-2.5 text-right">闭环配对</th>
                      <th className="py-2.5 px-3 text-center">详情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {batchResults.map((row, idx) => (
                      <tr key={row.etf.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2.5 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-sans">
                          <div className="font-semibold text-slate-900">{row.etf.name}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {row.etf.code} · ATR {row.etf.atrPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-700">
                          <div>¥{row.etf.price.toFixed(3)}</div>
                          <div className="text-[10px] text-slate-400">
                            中枢 ¥{row.anchorBase.toFixed(3)}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-semibold text-red-600">
                          ¥{row.periodHi.toFixed(3)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-semibold text-emerald-700">
                          ¥{row.periodLo.toFixed(3)}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-700">
                          {row.spanPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-800">
                          <div>¥{row.auto.recommendedStepPrice.toFixed(4)}</div>
                          <div className="text-[10px] text-slate-400">
                            {(row.auto.recommendedStepPct * 100).toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-700">
                          {row.auto.suggestedBuyTierCount}/{row.auto.suggestedSellTierCount}
                        </td>
                        <td
                          className={`py-2 px-2.5 text-right font-semibold ${
                            row.bt.realizedGridProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {row.bt.realizedGridProfit >= 0 ? '+' : ''}
                          {row.bt.realizedGridProfit.toFixed(1)}
                        </td>
                        <td
                          className={`py-2 px-2.5 text-right font-bold ${
                            row.bt.gridOnlyReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {row.bt.gridOnlyReturnPct >= 0 ? '+' : ''}
                          {row.bt.gridOnlyReturnPct.toFixed(2)}%
                        </td>
                        <td
                          className={`py-2 px-2.5 text-right font-semibold ${
                            row.bt.totalReturnPct >= 0 ? 'text-slate-900' : 'text-rose-600'
                          }`}
                        >
                          {row.bt.totalReturnPct >= 0 ? '+' : ''}
                          {row.bt.totalReturnPct.toFixed(2)}%
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-700">
                          {row.bt.matchedPairs}对
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(row.etf.id);
                              setCustomBasePrice(row.anchorBase);
                              setCustomHighPrice(row.periodHi);
                              setCustomLowPrice(row.periodLo);
                              setCustomStepPrice(null);
                              setCustomBuyTiers(null);
                              setCustomSellTiers(null);
                              setActiveMode('single');
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <span>详情</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-[11px] text-slate-500 shrink-0">
          <span>
            说明：历史回测基于日线 OHLC（开盘/最高/最低/收盘）路径重构模拟网格成交，仅供策略参数比较，不构成实盘收益保证。
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
};
