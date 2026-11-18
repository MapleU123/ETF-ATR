import React from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Flame,
  ArrowDownToLine,
  Tag,
  Building2,
  Ban,
  RotateCcw,
  Layers,
  CheckCheck,
  Eye,
  Download,
  Trash2,
} from 'lucide-react';
import { EtfCategory, AtrPeriod, SortField, SortDirection } from '../types';
import { EtfNameFilterState, DEFAULT_NAME_FILTER } from '../utils/etfNameFilter';

interface FilterBarProps {
  categories: EtfCategory[];
  selectedCategories: EtfCategory[];
  onSelectCategory: (cat: EtfCategory) => void;
  isMultiCategoryMode?: boolean;
  onToggleMultiCategoryMode?: () => void;
  selectedByCategory?: { category: EtfCategory; count: number }[];
  onlyShowSelected?: boolean;
  onToggleOnlyShowSelected?: () => void;
  onDeselectAllGlobal?: () => void;
  onOpenExportSelected?: () => void;
  dedupeSimilarOnly?: boolean;
  onToggleDedupeSimilar?: () => void;
  preDedupeCount?: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  nameFilter?: EtfNameFilterState;
  onNameFilterChange?: (next: EtfNameFilterState) => void;
  availableNameThemes?: { id: string; label: string; count: number }[];
  availableFundIssuers?: { name: string; count: number }[];
  filteredCount?: number;
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
  selectedCategories,
  onSelectCategory,
  isMultiCategoryMode = false,
  onToggleMultiCategoryMode,
  selectedByCategory = [],
  onlyShowSelected = false,
  onToggleOnlyShowSelected,
  onDeselectAllGlobal,
  onOpenExportSelected,
  dedupeSimilarOnly = false,
  onToggleDedupeSimilar,
  preDedupeCount,
  searchQuery,
  onSearchChange,
  nameFilter = DEFAULT_NAME_FILTER,
  onNameFilterChange,
  availableNameThemes = [],
  availableFundIssuers = [],
  filteredCount,
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
  const displayFilteredCount = filteredCount !== undefined ? filteredCount : totalCount;
  const hasActiveNameFilter =
    nameFilter.nameTheme !== '全部' ||
    nameFilter.fundIssuer !== '全部' ||
    nameFilter.excludeQuery.trim() !== '' ||
    searchQuery.trim() !== '';

  const selectedCountMap = new Map<EtfCategory, number>(
    selectedByCategory.map((item) => [item.category, item.count])
  );
  const showPartialSelectionIndicator = selectedCount > 0 && selectedCount < totalCount;

  const handleResetNameFilters = () => {
    onSearchChange('');
    onNameFilterChange?.(DEFAULT_NAME_FILTER);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-xs space-y-3">
      {/* Category Tabs + Cross-category Multi-select toggle */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-400 font-medium whitespace-nowrap mr-0.5 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          行业分类:
        </span>

        {onToggleMultiCategoryMode && (
          <button
            id="multi-category-toggle-btn"
            type="button"
            onClick={onToggleMultiCategoryMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all border mr-1 ${
              isMultiCategoryMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
            title="开启后可同时点击勾选多个行业分类，跨分类对比与筛选标的"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{isMultiCategoryMode ? '多选分类中' : '跨分类多选'}</span>
            {selectedCategories.length > 1 && (
              <span className="text-[10px] px-1 rounded bg-white/20 font-mono">
                {selectedCategories.length}
              </span>
            )}
          </button>
        )}

        {categories.map((cat) => {
          const isActive =
            cat === '全部'
              ? selectedCategories.length === 0
              : selectedCategories.includes(cat);
          const catSelCount = cat !== '全部' ? selectedCountMap.get(cat) || 0 : 0;

          return (
            <button
              key={cat}
              id={`cat-btn-${cat}`}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{cat}</span>
              {showPartialSelectionIndicator && catSelCount > 0 && (
                <span
                  className={`text-[10px] font-mono px-1 rounded font-bold ${
                    isActive
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                  title={`该分类已选中 ${catSelCount} 只`}
                >
                  {catSelCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ETF Name Classification Filter + Dedupe Similar */}
      {onNameFilterChange && (
        <div className="pt-2.5 border-t border-slate-100 space-y-2.5 text-xs">
          {/* 名称主题标签 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-slate-500 font-medium whitespace-nowrap mr-0.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-rose-500" />
              名称分类:
            </span>

            {onToggleDedupeSimilar && (
              <button
                id="dedupe-similar-btn"
                type="button"
                onClick={onToggleDedupeSimilar}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all border mr-1 ${
                  dedupeSimilarOnly
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
                title="开启后，同名或跟踪同一指数的多只ETF（如各基金公司的沪深300ETF、芯片ETF）只显示规模/成交额最高的1只代表标的"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>同类只显1只</span>
                {dedupeSimilarOnly && preDedupeCount !== undefined && (
                  <span className="text-[10px] font-mono px-1 rounded bg-white/20">
                    {preDedupeCount}→{displayFilteredCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onNameFilterChange({ ...nameFilter, nameTheme: '全部' })}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                nameFilter.nameTheme === '全部'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              全部名称
            </button>
            {availableNameThemes.map((theme) => {
              const isActive = nameFilter.nameTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() =>
                    onNameFilterChange({
                      ...nameFilter,
                      nameTheme: isActive ? '全部' : theme.id,
                    })
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                  }`}
                >
                  <span>{theme.label}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      isActive ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    {theme.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 基金公司 + 名称排除词 + 命中统计 */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 基金公司筛选 */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 whitespace-nowrap">基金公司:</span>
              <select
                id="fund-issuer-select"
                value={nameFilter.fundIssuer}
                onChange={(e) =>
                  onNameFilterChange({ ...nameFilter, fundIssuer: e.target.value })
                }
                className="bg-transparent text-slate-800 font-medium focus:outline-hidden cursor-pointer pr-1"
              >
                <option value="全部">全部基金公司</option>
                {availableFundIssuers.map((iss) => (
                  <option key={iss.name} value={iss.name}>
                    {iss.name} ({iss.count}只)
                  </option>
                ))}
              </select>
            </div>

            {/* 名称排除词 */}
            <div className="relative min-w-[205px] flex-1 sm:flex-initial">
              <Ban className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="exclude-query-input"
                type="text"
                placeholder="排除名称词(空格分隔, 如: 增强 货币)..."
                value={nameFilter.excludeQuery}
                onChange={(e) =>
                  onNameFilterChange({ ...nameFilter, excludeQuery: e.target.value })
                }
                className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
              {nameFilter.excludeQuery && (
                <button
                  type="button"
                  onClick={() => onNameFilterChange({ ...nameFilter, excludeQuery: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                  title="清空排除词"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 命中统计与重置 */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                当前显示 <span className="font-mono font-bold text-slate-900">{displayFilteredCount}</span> / {totalCount} 只
              </span>
              {hasActiveNameFilter && (
                <button
                  type="button"
                  onClick={handleResetNameFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors"
                  title="重置名称分类、基金公司、搜索及排除条件"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置名称筛选</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Control bar: Search, ATR Period, Sort, Batch selections */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        {/* Search & Batch selects */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search box */}
          <div className="relative min-w-[225px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-input"
              type="text"
              placeholder="搜索名称或6位代码(支持空格多词, 如: 科创 芯片)..."
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
          <div className="flex items-center gap-1.5 text-slate-600 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectAll(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="勾选当前筛选列表中的所有ETF（保留其他分类已勾选目标）"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>全选当前 ({displayFilteredCount})</span>
            </button>

            <button
              type="button"
              onClick={() => (onDeselectAllGlobal ? onDeselectAllGlobal() : onSelectAll(false))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="一键清空全市场所有勾选，方便从0开始跨分类挑选目标"
            >
              <Square className="w-3.5 h-3.5 text-slate-500" />
              <span>清空全部</span>
            </button>

            {onToggleOnlyShowSelected && (
              <button
                id="only-selected-toggle-btn"
                type="button"
                onClick={onToggleOnlyShowSelected}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors border ${
                  onlyShowSelected
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50/70 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
                title="只看你在各个行业分类中勾选的目标ETF，方便集中核对与导出"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>仅看已选 ({selectedCount})</span>
              </button>
            )}

            <button
              type="button"
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

      {/* 跨分类已选目标汇总条 */}
      {(showPartialSelectionIndicator || onlyShowSelected) && (
        <div className="pt-2.5 border-t border-rose-100 bg-rose-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-bold text-rose-900">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              跨分类已选目标 <span className="font-mono text-rose-600">{selectedCount}</span> 只
            </span>
            {selectedByCategory.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedByCategory.slice(0, 8).map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => onSelectCategory(item.category)}
                    className="px-2 py-0.5 rounded bg-white/90 hover:bg-white text-slate-700 border border-rose-200/80 text-[11px] font-medium transition-colors"
                    title={`点击切换至「${item.category}」查看`}
                  >
                    {item.category} <span className="font-mono font-bold text-rose-600">{item.count}</span>
                  </button>
                ))}
                {selectedByCategory.length > 8 && (
                  <span className="text-[11px] text-slate-500">
                    等 {selectedByCategory.length} 个分类
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onToggleOnlyShowSelected && (
              <button
                type="button"
                onClick={onToggleOnlyShowSelected}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  onlyShowSelected
                    ? 'bg-slate-800 text-white hover:bg-slate-900'
                    : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{onlyShowSelected ? '返回全部分类浏览' : '集中查看已选目标'}</span>
              </button>
            )}
            {onOpenExportSelected && selectedCount > 0 && (
              <button
                type="button"
                onClick={onOpenExportSelected}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出已选 ({selectedCount}只)</span>
              </button>
            )}
            {onDeselectAllGlobal && (
              <button
                type="button"
                onClick={onDeselectAllGlobal}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-white/80 transition-colors"
                title="清空全部勾选重新挑选"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空重选</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
