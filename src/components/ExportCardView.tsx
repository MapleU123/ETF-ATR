import React from 'react';
import { EtfItem, ExportConfig, GridItemConfig } from '../types';
import { ShieldCheck, Activity, TrendingUp, AlertTriangle, Grid } from 'lucide-react';
import { formatAmount } from '../utils/atrCalculator';
import { calculateGridItem } from '../utils/gridCalculator';

interface ExportCardViewProps {
  etfs: EtfItem[];
  config: ExportConfig;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  gridItems?: GridItemConfig[];
}

export const ExportCardView: React.FC<ExportCardViewProps> = ({
  etfs,
  config,
  cardRef,
  gridItems,
}) => {
  const selectedEtfs = React.useMemo(() => etfs.filter((e) => e.selected), [etfs]);
  const displayEtfs = React.useMemo(
    () => (config.selectedOnly && selectedEtfs.length > 0 ? selectedEtfs : etfs),
    [config.selectedOnly, selectedEtfs, etfs]
  );

  const filteredGridItems = React.useMemo(() => {
    if (!gridItems || gridItems.length === 0) return null;
    if (config.selectedOnly && selectedEtfs.length > 0) {
      const selectedIds = new Set(selectedEtfs.map((e) => e.id));
      return gridItems.filter((g) => selectedIds.has(g.id));
    }
    return gridItems;
  }, [gridItems, config.selectedOnly, selectedEtfs]);

  // 分页切片（防止单图渲染上千行）
  const isPaginatedLayout =
    config.layout === 'full_table' ||
    config.layout === 'grid_trading' ||
    config.layout === 'turtle_strategy';
  const pageSize = Math.max(10, Math.min(80, config.pageSize || 50));
  const totalItems =
    config.layout === 'grid_trading' && filteredGridItems
      ? filteredGridItems.length
      : displayEtfs.length;
  const totalPages = isPaginatedLayout ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const currentPage = Math.min(Math.max(1, config.page || 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const pagedEtfs = React.useMemo(
    () => (isPaginatedLayout ? displayEtfs.slice(startIndex, endIndex) : displayEtfs),
    [isPaginatedLayout, displayEtfs, startIndex, endIndex]
  );

  // 仅对当前分页计算网格参数，避免每次交互重算全部1600+标的
  const pagedGridItems = React.useMemo(() => {
    if (config.layout !== 'grid_trading') return [];
    if (filteredGridItems) {
      return isPaginatedLayout
        ? filteredGridItems.slice(startIndex, endIndex)
        : filteredGridItems;
    }
    return pagedEtfs.map((item) =>
      calculateGridItem(item, 1.0, 20, undefined, true, 'kline_120d')
    );
  }, [config.layout, filteredGridItems, isPaginatedLayout, startIndex, endIndex, pagedEtfs]);

  // 排序统计（仅 top_highlights 时计算）
  const { topHigh, topLow } = React.useMemo(() => {
    if (config.layout !== 'top_highlights') {
      return { topHigh: [] as EtfItem[], topLow: [] as EtfItem[] };
    }
    const sorted = [...displayEtfs].sort((a, b) => b.atrPercent - a.atrPercent);
    return {
      topHigh: sorted.slice(0, 5),
      topLow: [...sorted].reverse().slice(0, 5),
    };
  }, [config.layout, displayEtfs]);

  // 主题配色
  const getThemeStyles = () => {
    switch (config.theme) {
      case 'dark':
        return {
          wrapper: 'bg-[#090d16] text-slate-100 border border-slate-800',
          headerBg: 'bg-[#0f172a] border-b border-slate-800',
          titleColor: 'text-white',
          subtitleColor: 'text-slate-400',
          tableHeader: 'bg-[#1e293b] text-slate-200 border-b border-slate-700',
          rowBorder: 'border-slate-800/80',
          rowHover: 'hover:bg-slate-900/60',
          statCard: 'bg-[#131d31] border border-slate-800 text-slate-100',
          footerBg: 'bg-[#0d1527] border-t border-slate-800 text-slate-400',
          watermarkColor: 'rgba(255,255,255,0.07)',
          upBadge: 'bg-red-950/70 text-red-300 border border-red-800/60',
          downBadge: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
        };
      case 'paper':
        return {
          wrapper: 'bg-[#faf8f4] text-[#2c2a29] border border-[#e5dfd5]',
          headerBg: 'bg-[#f4efe6] border-b border-[#ded7ca]',
          titleColor: 'text-[#1e1c1b]',
          subtitleColor: 'text-[#6e6863]',
          tableHeader: 'bg-[#ede6d8] text-[#4a443f] border-b border-[#ded7ca]',
          rowBorder: 'border-[#ede7dc]',
          rowHover: 'hover:bg-[#f6f2ea]',
          statCard: 'bg-white border border-[#e5dfd5] text-[#2c2a29]',
          footerBg: 'bg-[#f4efe6] border-t border-[#ded7ca] text-[#6e6863]',
          watermarkColor: 'rgba(110,104,99,0.08)',
          upBadge: 'bg-red-50 text-red-700 border border-red-200',
          downBadge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        };
      case 'bullish':
        return {
          wrapper: 'bg-white text-slate-900 border border-red-200',
          headerBg: 'bg-gradient-to-r from-red-600 to-rose-700 text-white',
          titleColor: 'text-white',
          subtitleColor: 'text-rose-100',
          tableHeader: 'bg-rose-50 text-rose-900 border-b border-rose-200',
          rowBorder: 'border-slate-100',
          rowHover: 'hover:bg-rose-50/40',
          statCard: 'bg-rose-50/60 border border-rose-100 text-slate-900',
          footerBg: 'bg-[#881337] text-rose-100 border-t border-rose-800',
          watermarkColor: 'rgba(225,29,72,0.07)',
          upBadge: 'bg-red-50 text-red-600 border border-red-200',
          downBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        };
      case 'light':
      default:
        return {
          wrapper: 'bg-white text-slate-900 border border-slate-200',
          headerBg: 'bg-[#0f172a] text-white',
          titleColor: 'text-white',
          subtitleColor: 'text-slate-300',
          tableHeader: 'bg-slate-100 text-slate-700 border-b border-slate-200',
          rowBorder: 'border-slate-100',
          rowHover: 'hover:bg-slate-50',
          statCard: 'bg-slate-50 border border-slate-200/80 text-slate-900',
          footerBg: 'bg-slate-50 border-t border-slate-200 text-slate-500',
          watermarkColor: 'rgba(15,23,42,0.06)',
          upBadge: 'bg-red-50 text-red-600 border border-red-200',
          downBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        };
    }
  };

  const themeStyles = getThemeStyles();

  // 浮在图上方的灰色水印 - 使用安全SVG Pattern，悬浮在内容上方，字色为优雅灰色
  const getWatermarkSvgUrl = () => {
    if (!config.enableWatermark || !config.showDiagonalWatermark || !config.watermarkText) return undefined;
    const opacity = config.diagonalOpacity ?? 0.16;
    const grayColor = `rgba(120, 130, 145, ${opacity})`;
    const safeText = config.watermarkText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><text x="150" y="75" fill="${grayColor}" font-size="13" font-weight="600" font-family="sans-serif" text-anchor="middle" transform="rotate(-20 150 75)">${safeText}</text></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}")`;
  };

  const targetMinHeight =
    config.aspectRatio === '9:16'
      ? 1636
      : config.aspectRatio === '3:4'
      ? 1227
      : undefined;

  return (
    <div
      ref={cardRef}
      id="exportable-etf-card"
      className={`relative w-[920px] mx-auto rounded-xl shadow-2xl overflow-hidden font-sans flex flex-col ${themeStyles.wrapper}`}
      style={{
        minHeight: targetMinHeight ? `${targetMinHeight}px` : undefined,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      }}
    >
      {/* 浮在图上方的灰色水印浮层 - z-30置顶覆盖，灰色，且pointer-events-none */}
      {config.enableWatermark && config.showDiagonalWatermark && config.watermarkText && (
        <div
          className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden"
          style={{
            backgroundImage: getWatermarkSvgUrl(),
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Header Banner */}
      <div className={`p-6 relative z-10 ${themeStyles.headerBg}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider bg-white/20 uppercase">
                A股市场量化数据
              </span>
              <span className="text-xs opacity-80">{config.dateStr}</span>
              {isPaginatedLayout && totalPages > 1 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/15 border border-white/20">
                  第 {currentPage}/{totalPages} 页 · 第 {startIndex + 1}-{endIndex} / 共 {totalItems} 只
                </span>
              )}
            </div>
            <h1 className={`text-2xl font-black mt-2 tracking-tight ${themeStyles.titleColor}`}>
              {config.title}
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${themeStyles.subtitleColor}`}>
              {config.subTitle}
            </p>
          </div>

          {/* Header Watermark Badge */}
          {config.enableWatermark && config.showHeaderBadge && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 border border-white/25 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-rose-300" />
                <span className="text-xs font-bold text-white tracking-wide">
                  {config.watermarkText}
                </span>
              </div>
              <span className="text-[10px] mt-1 text-white/70">
                权威波动率追踪与量化策略
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 p-6 flex-1">
        {config.layout === 'full_table' && (
          <div className="overflow-hidden rounded-lg border border-slate-200/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={themeStyles.tableHeader}>
                  <th className="py-2.5 px-2 text-center w-8">#</th>
                  <th className="py-2.5 px-3">代码 / ETF名称</th>
                  <th className="py-2.5 px-2">行业类别</th>
                  <th className="py-2.5 px-2 text-center">基金规模</th>
                  <th className="py-2.5 px-3 text-right">现价(¥)</th>
                  <th className="py-2.5 px-3 text-right">涨跌幅</th>
                  <th className="py-2.5 px-3 text-right">TR真实波幅</th>
                  <th className="py-2.5 px-3 text-right font-bold">ATR({config.atrPeriod || 14}天)均值</th>
                  <th className="py-2.5 px-3 text-right font-bold text-rose-500">ATR({config.atrPeriod || 14}天)%波动率</th>
                  <th className="py-2.5 px-3 text-right">海龟1N价值</th>
                  <th className="py-2.5 px-3 text-right">2N止损位</th>
                  <th className="py-2.5 px-3 text-right">成交额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {pagedEtfs.map((item, idx) => {
                  const isUp = item.change >= 0;
                  return (
                    <tr
                      key={item.id}
                      className={`${themeStyles.rowHover} ${themeStyles.rowBorder} border-b`}
                    >
                      <td className="py-2 px-2 text-center font-mono text-[11px] opacity-50">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                          {item.isAboveHistoricalAvg && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              超20日均值
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] opacity-60">{item.code}</div>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/50 font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.scaleText || '--'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        ¥{item.price.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                            isUp ? themeStyles.upBadge : themeStyles.downBadge
                          }`}
                        >
                          {isUp ? '+' : ''}
                          {item.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono opacity-80">
                        ¥{item.tr.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        ¥{item.atr.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-500">
                        {item.atrPercent.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono opacity-80">
                        ¥{item.turtleUnitN.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono opacity-80">
                        ¥{item.stopLossPrice.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono opacity-80">
                        {formatAmount(item.volumeAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {config.layout === 'grid_trading' && (
          <div className="space-y-4">
            {/* Grid Trading Summary Note */}
            <div className={`p-4 rounded-xl ${themeStyles.statCard} flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Grid className="w-5 h-5" />
                </div>
                <div className="text-xs leading-relaxed">
                  <strong className="text-slate-900 dark:text-slate-100 font-bold block">
                    网格交易量化核心原则（ATR动态定距）：
                  </strong>
                  1. <strong>网格间距(%)</strong>严格锚定该ETF的ATR({config.atrPeriod || 14}天)真实波幅，让单格收益覆盖平均日波动，兼顾成交胜率与净利润；
                  2. <strong>基准价</strong>作为初始建仓中轴，<strong>最高价/最低价</strong>定义震荡箱体边界，跌买涨卖。
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                <span className="text-[10px] opacity-60">
                  {totalPages > 1 ? `本页第 ${startIndex + 1}-${endIndex} 只` : '标的覆盖数量'}
                </span>
                <span className="text-base font-black font-mono text-rose-600">
                  {totalItems} 只ETF
                </span>
              </div>
            </div>

            {/* Grid Trading Table: 基金名称、基金代码、最高价、最低价、基准价、网格间距（%） */}
            <div className="overflow-hidden rounded-lg border border-slate-200/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={themeStyles.tableHeader}>
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3 font-bold">基金名称</th>
                    <th className="py-2.5 px-3 font-bold font-mono">基金代码</th>
                    <th className="py-2.5 px-3 text-right font-bold text-red-600 dark:text-red-400">
                      最高价(¥)
                      <div className="text-[9px] font-normal text-red-400/80 font-mono">网格上限</div>
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      最低价(¥)
                      <div className="text-[9px] font-normal text-emerald-500/80 font-mono">网格下限</div>
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      基准价 (¥)
                    </th>
                    <th className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400">
                      网格间距(%) · 0.5%倍数
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium opacity-80">
                      单格差价(¥)
                    </th>
                    <th className="py-2.5 px-2 text-center font-medium opacity-80">
                      预估总格数
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium opacity-80">
                      参考现价(¥)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {pagedGridItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`${themeStyles.rowHover} ${themeStyles.rowBorder} border-b`}
                    >
                      <td className="py-2 px-2 text-center font-mono text-[11px] opacity-50">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {item.code}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                        <div>¥{item.highPrice.toFixed(3)}</div>
                        <div className="text-[9px] font-normal text-red-500/80 font-sans">
                          {item.isCustomized
                            ? '自定义'
                            : item.resistanceType
                            ? item.resistanceType
                            : `+${(((item.highPrice - item.basePrice) / item.basePrice) * 100).toFixed(1)}%`}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        <div>¥{item.lowPrice.toFixed(3)}</div>
                        <div className="text-[9px] font-normal text-emerald-600/80 font-sans">
                          {item.isCustomized
                            ? '自定义'
                            : item.supportType
                            ? item.supportType
                            : `${(((item.lowPrice - item.basePrice) / item.basePrice) * 100).toFixed(1)}%`}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ¥{item.basePrice.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                          <span>
                            {item.gridStepPercent % 0.5 === 0
                              ? item.gridStepPercent.toFixed(1)
                              : item.gridStepPercent.toFixed(2)}
                            %
                          </span>
                          {item.isHalfMultiple && (
                            <span className="text-[9px] font-bold text-rose-600 dark:text-rose-300 opacity-80">
                              0.5x
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono opacity-80">
                        ¥{item.gridStepPrice.toFixed(3)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold opacity-85">
                        {item.gridCount} 格
                      </td>
                      <td className="py-2 px-3 text-right font-mono opacity-70">
                        ¥{item.price.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {config.layout === 'top_highlights' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Top Volatility High */}
            <div className={`p-4 rounded-xl border ${themeStyles.statCard}`}>
              <div className="flex items-center justify-between pb-2 border-b border-rose-200/40">
                <span className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  高弹性波动榜 TOP 5（短线进攻/网格高频）
                </span>
                <span className="text-[10px] font-mono opacity-60">按ATR%降序</span>
              </div>
              <div className="divide-y divide-slate-100/60 mt-2">
                {topHigh.map((item, i) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {item.name}
                        <span className="text-[10px] opacity-60 font-mono">({item.code})</span>
                        {item.scaleText && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {item.scaleText}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] opacity-60 mt-0.5 ml-5">
                        现价: ¥{item.price.toFixed(3)} · 建议止损: ¥{item.stopLossPrice.toFixed(3)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-rose-600">
                        {item.atrPercent.toFixed(2)}%
                      </span>
                      <div className="text-[10px] opacity-60 font-mono">
                        1N=¥{item.turtleUnitN.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Defensive Low Volatility */}
            <div className={`p-4 rounded-xl border ${themeStyles.statCard}`}>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/40">
                <span className="font-bold text-sm text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  稳健低波榜 TOP 5（防守底仓/长期配置）
                </span>
                <span className="text-[10px] font-mono opacity-60">按ATR%升序</span>
              </div>
              <div className="divide-y divide-slate-100/60 mt-2">
                {topLow.map((item, i) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {item.name}
                        <span className="text-[10px] opacity-60 font-mono">({item.code})</span>
                        {item.scaleText && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {item.scaleText}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] opacity-60 mt-0.5 ml-5">
                        现价: ¥{item.price.toFixed(3)} · 建议止损: ¥{item.stopLossPrice.toFixed(3)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-emerald-700">
                        {item.atrPercent.toFixed(2)}%
                      </span>
                      <div className="text-[10px] opacity-60 font-mono">
                        1N=¥{item.turtleUnitN.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {config.layout === 'turtle_strategy' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${themeStyles.statCard} flex items-center gap-3`}>
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              <div className="text-xs leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100 font-bold block">海龟交易法则(Turtle Trading) ATR核心要领：</strong>
                1. <strong>头寸规模(1 Unit)</strong> = (总资金 × 1% 风险) ÷ (ATR × 1手股数)；
                2. <strong>止损标准</strong> = 买入价 - 2 × ATR；
                3. <strong>加仓策略</strong> = 每上涨 0.5 × ATR 逐步加码，最多4个Unit。
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={themeStyles.tableHeader}>
                    <th className="py-2.5 px-3">代码 / 名称</th>
                    <th className="py-2.5 px-2 text-center">基金规模</th>
                    <th className="py-2.5 px-3 text-right">现价(¥)</th>
                    <th className="py-2.5 px-3 text-right font-bold">1N波幅(1手)</th>
                    <th className="py-2.5 px-3 text-right">0.5N加仓触发价</th>
                    <th className="py-2.5 px-3 text-right font-bold text-rose-500">2N硬止损位</th>
                    <th className="py-2.5 px-3 text-right">10万资金建议仓位(1Unit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {pagedEtfs.map((item) => {
                    const suggestedShares = Math.floor(1000 / (2 * item.atr) / 100) * 100;
                    const capitalOccupied = suggestedShares * item.price;
                    const addTrigger = item.price + 0.5 * item.atr;

                    return (
                      <tr key={item.id} className={`${themeStyles.rowBorder} border-b`}>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold">{item.name}</span>{' '}
                          <span className="font-mono opacity-60">({item.code})</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                          {item.scaleText || '--'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">¥{item.price.toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-500">
                          ¥{item.turtleUnitN.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                          ¥{addTrigger.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-500">
                          ¥{item.stopLossPrice.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {suggestedShares}股 (约¥{capitalOccupied.toFixed(0)})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Official Watermark & Signature Footer or Clean Disclaimer Footer */}
      {config.enableWatermark && config.showBottomBanner ? (
        <div className={`p-4 px-6 relative z-10 flex items-center justify-between ${themeStyles.footerBg}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
              young
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-1">
                <span>微信公众号：</span>
                <span className="text-rose-600 font-extrabold text-sm">{config.watermarkText}</span>
              </div>
              <p className="text-[10px] opacity-70">
                关注公众号获取更多A股ETF深度量化、网格交易模型与日度真实波动率追踪
              </p>
            </div>
          </div>

          <div className="text-right text-[10px] opacity-70">
            <div>数据来源：上海/深圳证券交易所公开实时行情与历史日K线</div>
            <div>风险提示：本表仅供客观量化波动率统计参考，不构成任何投资建议</div>
          </div>
        </div>
      ) : (
        <div className={`p-3 px-6 relative z-10 flex items-center justify-between text-[11px] ${themeStyles.footerBg}`}>
          <div className="opacity-75 font-medium">A股核心ETF市场ATR真实波动率量化日报</div>
          <div className="text-right opacity-70">
            数据来源：上海/深圳证券交易所公开实时行情 · 仅供量化统计参考
          </div>
        </div>
      )}
    </div>
  );
};
