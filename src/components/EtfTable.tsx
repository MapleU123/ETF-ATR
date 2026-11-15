import React, { useState } from 'react';
import {
  Calculator,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Sparkles,
  Plus,
  TrendingUp,
  Activity,
  Flame,
  ArrowDownToLine,
} from 'lucide-react';
import { EtfItem, AtrPeriod, SortField, SortDirection } from '../types';
import { formatAmount } from '../utils/atrCalculator';

interface EtfTableProps {
  etfs: EtfItem[];
  atrPeriod: AtrPeriod;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: (checked: boolean) => void;
  onOpenTurtleWithEtf: (etf: EtfItem) => void;
  onDeleteEtf: (id: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  highlightedId?: string | null;
  searchQuery?: string;
  onQuickAddFromQuery?: (q: string) => void;
  isTouchLowOnly?: boolean;
}

export const EtfTable: React.FC<EtfTableProps> = ({
  etfs,
  atrPeriod,
  onToggleSelect,
  onSelectAllVisible,
  onOpenTurtleWithEtf,
  onDeleteEtf,
  sortField,
  sortDirection,
  onSortChange,
  highlightedId,
  searchQuery,
  onQuickAddFromQuery,
  isTouchLowOnly = false,
}) => {
  const [filterAboveAvgOnly, setFilterAboveAvgOnly] = useState(false);

  const aboveAvgCount = etfs.filter((e) => e.isAboveHistoricalAvg).length;
  const displayedEtfs = filterAboveAvgOnly
    ? etfs.filter((e) => e.isAboveHistoricalAvg)
    : etfs;

  const allSelected = displayedEtfs.length > 0 && displayedEtfs.every((e) => e.selected);
  const someSelected = displayedEtfs.some((e) => e.selected) && !allSelected;

  const getGradeBadge = (grade: EtfItem['volatilityGrade']) => {
    switch (grade) {
      case '极高波动':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case '高波动':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case '中度波动':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '低波稳健':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* 视觉提示说明栏与超历史均值快速切换 */}
      <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            高亮指示器：红色边框与标签标示「ATR超过近20天历史均值」
          </span>
          <span className="text-[11px] text-slate-500">
            当前共 <strong className="text-rose-600 font-bold">{aboveAvgCount}</strong> / {etfs.length} 只标的波幅处于放大扩张期
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="filter-all-etfs-btn"
            onClick={() => setFilterAboveAvgOnly(false)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              !filterAboveAvgOnly
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            全部标的 ({etfs.length})
          </button>
          <button
            type="button"
            id="filter-above-avg-etfs-btn"
            onClick={() => setFilterAboveAvgOnly(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filterAboveAvgOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>只看超历史均值 ({aboveAvgCount})</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold select-none">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAllVisible(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                  title="全选/全不选表格中的ETF（用于图片导出）"
                />
              </th>
              <th className="py-3 px-2 w-8 text-center text-slate-400">#</th>
              <th className="py-3 px-3 min-w-[170px]">
                <button
                  onClick={() => onSortChange('code')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <span>ETF名称 / 代码</span>
                  {sortField === 'code' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-right min-w-[85px]">
                <button
                  onClick={() => onSortChange('scaleAmount')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                  title="基金资产规模 (亿元)，点击按规模高低排序"
                >
                  <span>基金规模</span>
                  {sortField === 'scaleAmount' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => onSortChange('price')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                >
                  <span>现价(¥)</span>
                  {sortField === 'price' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => onSortChange('changePercent')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                >
                  <span>涨跌幅%</span>
                  {sortField === 'changePercent' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-right text-slate-400 hidden sm:table-cell">
                今日TR
              </th>
              <th className="py-3 px-3 text-right min-w-[110px]">
                <button
                  onClick={() => onSortChange('atr')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                  title={`ATR(${atrPeriod}天)：过去${atrPeriod}个交易日真实波幅的平滑平均值。红色标示超过近20天历史平均水平`}
                >
                  <span className="font-bold text-slate-800">ATR({atrPeriod}天)</span>
                  {sortField === 'atr' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-right min-w-[130px]">
                <button
                  onClick={() => onSortChange('atrPercent')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                  title={`ATR(${atrPeriod}天)% = (ATR / 现价) * 100%，衡量不同价格ETF过去${atrPeriod}天相对波动强度的核心指标`}
                >
                  <span className="font-bold text-rose-600">ATR({atrPeriod}天)% 波动率</span>
                  {sortField === 'atrPercent' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-center hidden md:table-cell">波动属性</th>
              <th className="py-3 px-3 text-right hidden lg:table-cell" title="海龟交易法则1手(100股)波动金额">
                1N头寸价值(手)
              </th>
              <th className="py-3 px-3 text-right hidden lg:table-cell" title="多头建议2N止损参考位: 现价 - 2*ATR">
                2N止损参考
              </th>
              <th className="py-3 px-3 text-right hidden sm:table-cell">
                <button
                  onClick={() => onSortChange('volumeAmount')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                >
                  <span>成交额</span>
                  {sortField === 'volumeAmount' && (
                    <span className="font-mono text-[10px] text-rose-600">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-center w-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedEtfs.map((item, idx) => {
              const isPositive = item.change >= 0;
              const isSelected = !!item.selected;
              const isHighlighted = highlightedId === item.id || highlightedId === item.code;
              const isAboveAvg = !!item.isAboveHistoricalAvg;

              // 触及低位判断：当前价格在60日内处于底部区域（5%偏离度以内，即 price <= low60d * 1.05）
              const low60 = item.low60d || item.low120d || item.low;
              const isTouchLow = low60 > 0 && item.price <= low60 * 1.0501;
              const lowDiffPct = low60 > 0 ? ((item.price - low60) / low60 * 100).toFixed(1) : '0.0';

              return (
                <tr
                  key={item.id}
                  id={`etf-row-${item.code}`}
                  className={`transition-all duration-200 border-l-4 ${
                    isHighlighted
                      ? 'bg-rose-50/90 ring-2 ring-inset ring-rose-500 font-medium border-l-rose-600'
                      : isTouchLow
                      ? 'bg-blue-50/70 hover:bg-blue-50 ring-1 ring-blue-300/80 font-medium border-l-blue-600'
                      : isAboveAvg
                      ? isSelected
                        ? 'bg-rose-50/25 hover:bg-rose-50/50 border-l-rose-500'
                        : 'bg-rose-50/10 opacity-80 hover:opacity-100 hover:bg-rose-50/30 border-l-rose-400'
                      : isSelected
                      ? 'bg-white hover:bg-slate-50/80 border-l-transparent'
                      : 'bg-slate-50/40 opacity-70 hover:opacity-100 hover:bg-slate-50 border-l-transparent'
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </td>

                  {/* Index */}
                  <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400">
                    {idx + 1}
                  </td>

                  {/* Name & Code */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 hover:text-rose-600 transition-colors">
                          {item.name}
                        </span>
                        {/* 触及低位标签 */}
                        {isTouchLow && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs"
                            title={`当前价 ¥${item.price.toFixed(3)} 距60日低位 ¥${low60.toFixed(3)} 偏离度仅 +${lowDiffPct}% (<=5% 底部区域)`}
                          >
                            <ArrowDownToLine className="w-3 h-3 text-blue-700" />
                            <span>触及低位 (+{lowDiffPct}%)</span>
                          </span>
                        )}
                        {/* 视觉指示器小标签：当ATR超过近20天历史平均水平时给予高亮提示 */}
                        {isAboveAvg && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs"
                            title={`当前ATR (¥${item.atr.toFixed(3)}) 超过近20天历史平均水平 (¥${(item.historicalAvgAtr ?? item.atr).toFixed(3)})，超幅 +${item.atrAboveDiffPercent ?? 0}%`}
                          >
                            <Flame className="w-3 h-3 text-rose-600 fill-rose-500 animate-pulse" />
                            <span>ATR超20日均值 +{item.atrAboveDiffPercent ?? 0}%</span>
                          </span>
                        )}
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                            {item.badge}
                          </span>
                        )}
                        {item.isCustom && !item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            自定义
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px] font-medium text-slate-500">
                          {item.code}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        {isAboveAvg && (
                          <span className="text-[10px] font-mono text-rose-600/90 font-medium">
                            (近20日基线: ¥{(item.historicalAvgAtr ?? item.atr).toFixed(3)})
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Fund Scale */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100/90 text-slate-700 whitespace-nowrap">
                      {item.scaleText || (item.scaleAmount ? `约${item.scaleAmount}亿` : '--')}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                    ¥{item.price.toFixed(3)}
                  </td>

                  {/* Change Percent (A-share: Red up, Green down) */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
                        isPositive
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {isPositive ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* Today TR */}
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500 hidden sm:table-cell">
                    ¥{item.tr.toFixed(3)}
                  </td>

                  {/* ATR(N) */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-mono font-bold ${
                            isAboveAvg ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          ¥{item.atr.toFixed(3)}
                        </span>
                        {isAboveAvg && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200"
                            title={`当前ATR高于20日均值¥${(item.historicalAvgAtr ?? item.atr).toFixed(3)}`}
                          >
                            <TrendingUp className="w-2.5 h-2.5 text-rose-600" />
                            放量
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-mono text-slate-400"
                        title="过去20个交易日真实波幅(ATR)平均水平基准"
                      >
                        20日均: ¥{(item.historicalAvgAtr ?? item.atr).toFixed(3)}
                      </span>
                    </div>
                  </td>

                  {/* ATR% (Primary metric with visual indicator) */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-bold text-sm text-rose-600 flex items-center gap-1">
                        {item.atrPercent.toFixed(2)}%
                        {isAboveAvg && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse"
                            title="波幅超过近20天历史平均水平"
                          />
                        )}
                      </span>
                      {/* Micro bar */}
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            isAboveAvg
                              ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-2xs shadow-rose-400'
                              : 'bg-gradient-to-r from-orange-400 to-rose-600'
                          }`}
                          style={{
                            width: `${Math.min(100, (item.atrPercent / 4.5) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Grade */}
                  <td className="py-2.5 px-3 text-center hidden md:table-cell">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getGradeBadge(
                        item.volatilityGrade
                      )}`}
                    >
                      {item.volatilityGrade}
                    </span>
                  </td>

                  {/* 1N unit value (100 shares) */}
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 hidden lg:table-cell">
                    ¥{item.turtleUnitN.toFixed(1)}
                  </td>

                  {/* Stop Loss Price */}
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 hidden lg:table-cell">
                    ¥{item.stopLossPrice.toFixed(3)}
                  </td>

                  {/* Volume */}
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 hidden sm:table-cell">
                    {formatAmount(item.volumeAmount)}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onOpenTurtleWithEtf(item)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="测算该ETF海龟建仓与止损点"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEtf(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="从列表中移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {etfs.length === 0 && (
        <div className="py-12 px-4 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-slate-500 text-xs">
              {searchQuery
                ? `当前看板中未匹配到含「${searchQuery}」的标的`
                : '没有找到匹配的ETF标的，请调整筛选条件'}
            </p>
            {searchQuery && onQuickAddFromQuery && (
              <button
                type="button"
                onClick={() => onQuickAddFromQuery(searchQuery)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>立即将「{searchQuery}」加入看板并显示ATR数据</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
