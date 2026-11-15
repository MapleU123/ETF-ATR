import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  EtfItem,
  EtfCategory,
  AtrPeriod,
  SortField,
  SortDirection,
  ActiveTab,
  ExportLayout,
  GridItemConfig,
} from './types';
import { getInitialEtfList } from './data/etfData';
import { enrichEtfItem } from './utils/atrCalculator';
import { buildEtfFromInput } from './data/allMarketEtfs';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { QuickInputEtfBar } from './components/QuickInputEtfBar';
import { FilterBar } from './components/FilterBar';
import { EtfTable } from './components/EtfTable';
import { ExportModal } from './components/ExportModal';
import { TurtleCalculatorModal } from './components/TurtleCalculatorModal';
import { AddEtfModal } from './components/AddEtfModal';
import { AtrKnowledgeSection } from './components/AtrKnowledgeSection';
import { GridTradingSection } from './components/GridTradingSection';
import { T0GridTradingSection } from './components/T0GridTradingSection';
import { classifyEtfByName } from './utils/categoryMatcher';

const CATEGORIES: EtfCategory[] = [
  '全部',
  '半导体',
  '通信',
  '创新药',
  '医药',
  '军工',
  '人工智能/软件',
  '新能源/电力',
  '机械制造',
  '消费',
  '金融地产',
  '红利低波',
  '周期资源',
  '传媒娱乐',
  '宽基指数',
  '跨境海外',
  '大宗商品',
  '债券货币',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('atr_volatility');
  const [atrPeriod, setAtrPeriod] = useState<AtrPeriod>(14);
  const [etfs, setEtfs] = useState<EtfItem[]>(() => getInitialEtfList(14));
  const [currentCategory, setCurrentCategory] = useState<EtfCategory>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('atrPercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTouchLowOnly, setIsTouchLowOnly] = useState(false); // 触及低位(60日底部)开关状态

  // 真实行情连接状态
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [realtimeUpdatedTime, setRealtimeUpdatedTime] = useState<string>('');

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportLayout, setExportLayout] = useState<ExportLayout | undefined>(undefined);
  const [exportGridItems, setExportGridItems] = useState<GridItemConfig[] | undefined>(undefined);
  const [exportSelectedOnly, setExportSelectedOnly] = useState<boolean>(false);
  const [isTurtleCalcOpen, setIsTurtleCalcOpen] = useState(false);
  const [turtleEtfId, setTurtleEtfId] = useState<string | undefined>(undefined);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const selectedCount = etfs.filter((e) => e.selected).length;

  // 统一打开导出弹窗
  const handleOpenExport = useCallback(
    (layout?: ExportLayout, gridItems?: GridItemConfig[], selectedOnly?: boolean) => {
      const isGrid = layout === 'grid_trading' || (!layout && activeTab === 'grid_trading');
      setExportLayout(isGrid ? 'grid_trading' : (layout || 'full_table'));
      setExportGridItems(gridItems);
      const shouldSelectOnly =
        selectedOnly !== undefined ? selectedOnly : (isGrid && selectedCount > 0);
      setExportSelectedOnly(shouldSelectOnly);
      setIsExportOpen(true);
    },
    [activeTab, selectedCount]
  );

  // 从后端拉取沪深交易所真实实时行情及真实ATR
  const fetchRealtimeData = useCallback(async (period: AtrPeriod) => {
    setIsLoadingRealtime(true);
    try {
      const res = await fetch(`/api/realtime-etfs?period=${period}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const classifiedData: EtfItem[] = json.data.map((item: EtfItem) => ({
          ...item,
          category: classifyEtfByName(item.name, item.code, item.category),
        }));
        setEtfs(classifiedData);
        setIsRealtimeConnected(true);
        const latestTime = json.data[0]?.realtimeTime || new Date().toLocaleTimeString('zh-CN', { hour12: false });
        setRealtimeUpdatedTime(latestTime);
        setToastMessage(`已连接沪深证券交易所实时行情，真实ATR(${period})量化数据已更新！`);
      }
    } catch (err) {
      console.warn('Realtime fetch failed, fallback to local database:', err);
    } finally {
      setIsLoadingRealtime(false);
    }
  }, []);

  // 首次挂载与周期变更时自动拉取
  useEffect(() => {
    fetchRealtimeData(atrPeriod);
  }, [atrPeriod, fetchRealtimeData]);

  // 当周期改变时
  const handlePeriodChange = useCallback((newPeriod: AtrPeriod) => {
    setAtrPeriod(newPeriod);
    // 优先本地快速计算，随后后端同步真实K线
    setEtfs((prevList) =>
      prevList.map((item) => enrichEtfItem(item, newPeriod))
    );
  }, []);

  // 点击刷新实时行情
  const handleRefreshData = useCallback(() => {
    fetchRealtimeData(atrPeriod);
  }, [atrPeriod, fetchRealtimeData]);

  // 排序切换
  const handleSortChange = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // 单行勾选
  const handleToggleSelect = useCallback((id: string) => {
    setEtfs((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  }, []);

  // 全选/全不选当前可见标的
  const handleSelectAllVisible = useCallback((checked: boolean) => {
    setEtfs((prev) => {
      // 获取当前符合筛选的 id 集合
      const visibleIds = new Set(
        prev
          .filter((e) => {
            const matchCat = currentCategory === '全部' || e.category === currentCategory;
            const matchSearch =
              !searchQuery ||
              e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              e.code.includes(searchQuery);
            return matchCat && matchSearch;
          })
          .map((e) => e.id)
      );

      return prev.map((e) =>
        visibleIds.has(e.id) ? { ...e, selected: checked } : e
      );
    });
  }, [currentCategory, searchQuery]);

  // 仅选高波标的 (ATR% >= 2.6%)
  const handleSelectHighVolOnly = useCallback(() => {
    setEtfs((prev) =>
      prev.map((e) => ({
        ...e,
        selected: e.atrPercent >= 2.6,
      }))
    );
  }, []);

  // 添加自定义 ETF
  const handleAddEtf = useCallback((newEtf: EtfItem) => {
    const classified: EtfItem = {
      ...newEtf,
      category: classifyEtfByName(newEtf.name, newEtf.code, newEtf.category),
    };
    setEtfs((prev) => [classified, ...prev]);
    setCurrentCategory('全部');
    setHighlightedId(classified.id);
    setToastMessage(`成功添加「${classified.code} ${classified.name}」，已归类至【${classified.category}】！`);
    setTimeout(() => {
      const el = document.getElementById(`etf-row-${classified.code}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    setTimeout(() => {
      setHighlightedId((curr) => (curr === classified.id ? null : curr));
    }, 4500);
  }, []);

  // 快捷输入代码或名称显示 (或直接定位已存在标的)
  const handleQuickAddOrShow = useCallback(
    async (queryOrItem: string | EtfItem, customMsg?: string) => {
      let targetItem: EtfItem;
      let isNew = false;

      if (typeof queryOrItem === 'string') {
        const clean = queryOrItem.trim();
        if (!clean) return;

        const existing = etfs.find(
          (e) => e.code === clean || e.name.toLowerCase().includes(clean.toLowerCase())
        );

        if (existing) {
          targetItem = existing;
        } else {
          // 优先尝试拉取真实行情
          try {
            const res = await fetch(
              `/api/etf-quote?code=${encodeURIComponent(clean)}&period=${atrPeriod}`
            );
            const d = await res.json();
            if (d.success && d.item) {
              targetItem = d.item;
              targetItem.badge = '新输入显示';
              isNew = true;
            } else {
              targetItem = buildEtfFromInput(clean, atrPeriod);
              targetItem.isCustom = true;
              targetItem.badge = '新输入显示';
              isNew = true;
            }
          } catch {
            targetItem = buildEtfFromInput(clean, atrPeriod);
            targetItem.isCustom = true;
            targetItem.badge = '新输入显示';
            isNew = true;
          }
        }
      } else {
        targetItem = queryOrItem;
        const existing = etfs.find((e) => e.code === targetItem.code);
        if (!existing) {
          isNew = true;
        }
      }

      if (isNew) {
        setEtfs((prev) => [targetItem, ...prev]);
      } else {
        // 保证勾选
        setEtfs((prev) =>
          prev.map((e) => (e.id === targetItem.id ? { ...e, selected: true } : e))
        );
      }

      // 重置分类为全部，防止因分类过滤而看不见
      setCurrentCategory('全部');
      setSearchQuery('');
      setHighlightedId(targetItem.id);

      const msg =
        customMsg ||
        (isNew
          ? `已成功添加并显示「${targetItem.code} ${targetItem.name}」，ATR(${atrPeriod}): ${targetItem.atr} (${targetItem.atrPercent}%)！`
          : `标的「${targetItem.code} ${targetItem.name}」已在看板中，已定位高亮显示！`);
      setToastMessage(msg);

      // 平滑滚动至该行
      setTimeout(() => {
        const el = document.getElementById(`etf-row-${targetItem.code}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);

      // 4.5秒后取消高亮
      setTimeout(() => {
        setHighlightedId((curr) => (curr === targetItem.id ? null : curr));
      }, 4500);
    },
    [etfs, atrPeriod]
  );

  // 删除 ETF
  const handleDeleteEtf = useCallback((id: string) => {
    setEtfs((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // 打开海龟计算器并选中指定ETF
  const handleOpenTurtleWithEtf = useCallback((item: EtfItem) => {
    setTurtleEtfId(item.id);
    setIsTurtleCalcOpen(true);
  }, []);

  // 过滤与排序列表
  const filteredAndSortedEtfs = useMemo(() => {
    let result = etfs.filter((e) => {
      const matchCat = currentCategory === '全部' || e.category === currentCategory;
      const matchSearch =
        !searchQuery ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code.includes(searchQuery);

      if (!matchCat || !matchSearch) return false;

      // 触及低位筛选：当前价格在60日内处于底部区域（5%偏离度以内）
      if (isTouchLowOnly) {
        const low60 = e.low60d || e.low120d || e.low;
        const isTouchLow = low60 > 0 && e.price <= low60 * 1.0501;
        if (!isTouchLow) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === 'atrPercent') {
        valA = a.atrPercent;
        valB = b.atrPercent;
      } else if (sortField === 'atr') {
        valA = a.atr;
        valB = b.atr;
      } else if (sortField === 'changePercent') {
        valA = a.changePercent;
        valB = b.changePercent;
      } else if (sortField === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortField === 'volumeAmount') {
        valA = a.volumeAmount;
        valB = b.volumeAmount;
      } else if (sortField === 'scaleAmount') {
        const parseScale = (item: EtfItem): number => {
          if (item.scaleAmount !== undefined && item.scaleAmount > 0) return item.scaleAmount;
          if (item.scaleText) {
            const num = parseFloat(item.scaleText.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) return num;
          }
          return 0;
        };
        valA = parseScale(a);
        valB = parseScale(b);
      } else if (sortField === 'code') {
        return sortDirection === 'desc'
          ? b.code.localeCompare(a.code)
          : a.code.localeCompare(b.code);
      }

      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [etfs, currentCategory, searchQuery, sortField, sortDirection, isTouchLowOnly]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <Header
        atrPeriod={atrPeriod}
        onPeriodChange={handlePeriodChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenExport={() => handleOpenExport('full_table', undefined, selectedCount > 0)}
        onOpenExportGrid={() => handleOpenExport('grid_trading', undefined, selectedCount > 0)}
        onOpenTurtleCalc={() => {
          setTurtleEtfId(undefined);
          setIsTurtleCalcOpen(true);
        }}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRefreshData={handleRefreshData}
        selectedCount={selectedCount}
        totalCount={etfs.length}
        isRealtime={isRealtimeConnected}
        isLoadingRealtime={isLoadingRealtime}
        realtimeTime={realtimeUpdatedTime}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'atr_volatility' ? (
          <>
            {/* Volatility Overview Statistics */}
            <StatsOverview
              etfs={etfs}
              atrPeriod={atrPeriod}
              onSelectCategory={setCurrentCategory}
              onOpenExport={() => handleOpenExport('full_table')}
            />

            {/* Quick input fund code or name to display */}
            <QuickInputEtfBar
              currentEtfs={etfs}
              onAddOrShowEtf={handleQuickAddOrShow}
              atrPeriod={atrPeriod}
            />

            {/* Toolbar & Filter Bar */}
            <FilterBar
              categories={CATEGORIES}
              currentCategory={currentCategory}
              onSelectCategory={setCurrentCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              atrPeriod={atrPeriod}
              onPeriodChange={handlePeriodChange}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              selectedCount={selectedCount}
              totalCount={etfs.length}
              onSelectAll={handleSelectAllVisible}
              onSelectHighVolOnly={handleSelectHighVolOnly}
              onQuickAddOrShow={handleQuickAddOrShow}
              isTouchLowOnly={isTouchLowOnly}
              onToggleTouchLow={() => setIsTouchLowOnly((prev) => !prev)}
              touchLowCount={
                etfs.filter((e) => {
                  const low60 = e.low60d || e.low120d || e.low;
                  return low60 > 0 && e.price <= low60 * 1.0501;
                }).length
              }
            />

            {/* Main ETF Data Table */}
            <EtfTable
              etfs={filteredAndSortedEtfs}
              atrPeriod={atrPeriod}
              onToggleSelect={handleToggleSelect}
              onSelectAllVisible={handleSelectAllVisible}
              onOpenTurtleWithEtf={handleOpenTurtleWithEtf}
              onDeleteEtf={handleDeleteEtf}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              highlightedId={highlightedId}
              searchQuery={searchQuery}
              onQuickAddFromQuery={handleQuickAddOrShow}
              isTouchLowOnly={isTouchLowOnly}
            />

            {/* Knowledge & Quantitative Guidance */}
            <AtrKnowledgeSection />
          </>
        ) : activeTab === 'grid_trading' ? (
          /* 板块二：网格交易基础参数设计 (ATR动态定距) */
          <GridTradingSection
            etfs={etfs}
            atrPeriod={atrPeriod}
            onPeriodChange={handlePeriodChange}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAllVisible}
            onDeselectAll={() => setEtfs((prev) => prev.map((e) => ({ ...e, selected: false })))}
            onOpenExportGrid={(items, selectedOnly) =>
              handleOpenExport('grid_trading', items, selectedOnly !== undefined ? selectedOnly : (selectedCount > 0))
            }
          />
        ) : (
          /* 板块三：T+0 ETF 日内网格交易参数设计 (3个Sheet联动及图片导出) */
          <T0GridTradingSection etfs={etfs} />
        )}
      </main>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            title="关闭提示"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">A股ETF ATR数据整理与高清导出工具</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-semibold">微信公众号：我爱这young</span>
          </div>
          <div className="text-slate-400">
            仅供量化策略与波动率研究参考 · 数据更新于交易日实时行情
          </div>
        </div>
      </footer>

      {/* Export HD Image Modal with Watermark "公众号:我爱这young" */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        etfs={etfs}
        atrPeriod={atrPeriod}
        onPeriodChange={handlePeriodChange}
        initialLayout={exportLayout}
        gridItems={exportGridItems}
        initialSelectedOnly={exportSelectedOnly}
      />

      {/* Turtle Trading Position Sizing Modal */}
      <TurtleCalculatorModal
        isOpen={isTurtleCalcOpen}
        onClose={() => setIsTurtleCalcOpen(false)}
        etfs={etfs}
        defaultEtfId={turtleEtfId}
        atrPeriod={atrPeriod}
        onPeriodChange={handlePeriodChange}
      />

      {/* Add Custom ETF Modal */}
      <AddEtfModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddEtf}
        atrPeriod={atrPeriod}
      />
    </div>
  );
}
