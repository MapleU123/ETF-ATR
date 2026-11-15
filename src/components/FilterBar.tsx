import React from 'react';
import { Search, ArrowUpDown, Filter, CheckSquare, Square, Flame, ArrowDownToLine } from 'lucide-react';
import { EtfCategory, AtrPeriod, SortField, SortDirection } from '../types';

interface FilterBarProps {
  categories: EtfCategory[];
  currentCategory: EtfCategory;
  onSelectCategory: (cat: EtfCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  atrPeriod: AtrPeriod;
  onPeriodChange: (p: AtrPeriod) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (val: boolean) => void;
  onSelectHighVolOnly: () => void;
  onQuickAddOrShow?: (query: string) => void;
  isTouchLowOnly?: boolean;
  onToggleTouchLow?: () => void;
  touchLowCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  currentCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  atrPeriod,
  onPeriodChange,
  sortField,
  sortDirection,
  onSortChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectHighVolOnly,
  onQuickAddOrShow,
  isTouchLowOnly = false,
  onToggleTouchLow,
  touchLowCount = 0,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-xs space-y-3.5">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-400 font-medium whitespace-nowrap mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          行业分类:
        </span>
        {categories.map((cat) => {
          const isActive = currentCategory === cat;
          return (
            <button
              key={cat}
              id={`cat-btn-${cat}`}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Control bar: Search, ATR Period, Sort, Batch selections */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        {/* Search & Batch selects */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search box */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-input"
              type="text"
              placeholder="搜索ETF名称或6位代码..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim() && onQuickAddOrShow) {
                  onQuickAddOrShow(searchQuery.trim());
                }
              }}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                title="清空搜索"
              >
                ✕
              </button>
            )}
          </div>

          {/* Batch select buttons */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <button
              onClick={() => onSelectAll(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="全选当前分类下的所有ETF用于导出"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>全选</span>
            </button>

            <button
              onClick={() => onSelectAll(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="清空勾选"
            >
              <Square className="w-3.5 h-3.5 text-slate-500" />
              <span>清空</span>
            </button>

            <button
              onClick={onSelectHighVolOnly}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors"
              title="一键筛选ATR% >= 2.6%的高弹性品种"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>仅选高波动</span>
            </button>

            {onToggleTouchLow && (
              <button
                id="touch-low-toggle-btn"
                type="button"
                onClick={onToggleTouchLow}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors text-xs border ${
                  isTouchLowOnly
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/80 hover:bg-blue-100 text-blue-800 border-blue-200'
                }`}
                title="开启后列表将自动高亮/筛选当前价格在60日内处于底部区域（5%偏离度以内）的ETF标的"
              >
                <ArrowDownToLine className={`w-3.5 h-3.5 ${isTouchLowOnly ? 'text-white' : 'text-blue-600'}`} />
                <span>触及低位(60日底部)</span>
                {touchLowCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isTouchLowOnly ? 'bg-white text-blue-700' : 'bg-blue-200 text-blue-900'
                    }`}
                  >
                    {touchLowCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ATR Period selector & Sort */}
        <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
          {/* ATR Period Selector: 突出 14天、20天 选项 */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-700 font-bold px-1.5 flex items-center gap-1">
              ATR周期:
            </span>

            {/* 14天 经典选项 */}
            <button
              id="period-14-btn"
              type="button"
              onClick={() => onPeriodChange(14)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                atrPeriod === 14
                  ? 'bg-rose-600 text-white shadow-xs scale-102'
                  : 'bg-white text-slate-700 hover:text-rose-600 border border-slate-200/80 hover:border-rose-300'
              }`}
              title="14天ATR：J.Welles Wilder经典参数，适用绝大多数A股ETF日线波动计算"
            >
              <span>ATR 14天</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-normal ${
                atrPeriod === 14 ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-500'
              }`}>
                经典
              </span>
            </button>

            {/* 20天 海龟法则选项 */}
            <button
              id="period-20-btn"
              type="button"
              onClick={() => onPeriodChange(20)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                atrPeriod === 20
                  ? 'bg-rose-600 text-white shadow-xs scale-102'
                  : 'bg-white text-slate-700 hover:text-rose-600 border border-slate-200/80 hover:border-rose-300'
              }`}
              title="20天ATR：经典海龟交易法则(Turtle Trading System)标准波动周期N值"
            >
              <span>ATR 20天</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-normal ${
                atrPeriod === 20 ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-500'
              }`}>
                海龟
              </span>
            </button>

            {/* 更多辅助周期 */}
            <div className="flex items-center pl-1 border-l border-slate-200 gap-0.5">
              {([5, 10, 30] as AtrPeriod[]).map((p) => {
                const isPActive = atrPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPeriodChange(p)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      isPActive
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title={`${p}天ATR周期`}
                  >
                    {p}天
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">排序:</span>
            <button
              onClick={() => onSortChange('atrPercent')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                sortField === 'atrPercent'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>ATR%波动率</span>
              {sortField === 'atrPercent' && (
                <span className="font-mono font-bold text-[10px]">
                  {sortDirection === 'desc' ? '↓降序' : '↑升序'}
                </span>
              )}
            </button>

            <button
              onClick={() => onSortChange('changePercent')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                sortField === 'changePercent'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>今日涨跌幅</span>
              {sortField === 'changePercent' && (
                <span className="font-mono font-bold text-[10px]">
                  {sortDirection === 'desc' ? '↓降序' : '↑升序'}
                </span>
              )}
            </button>

            <button
              onClick={() => onSortChange('volumeAmount')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                sortField === 'volumeAmount'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>成交额</span>
              {sortField === 'volumeAmount' && (
                <span className="font-mono font-bold text-[10px]">
                  {sortDirection === 'desc' ? '↓降序' : '↑升序'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
