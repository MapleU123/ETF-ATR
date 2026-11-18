import React, { useState, useMemo } from 'react';
import {
  Grid,
  TrendingUp,
  Settings2,
  Sliders,
  Download,
  Info,
  Edit3,
  RotateCcw,
  Check,
  ChevronRight,
  Eye,
  Search,
  CheckSquare,
  Square,
  Layers,
  ArrowUpDown,
  Sparkles,
  Tag,
  Building2,
  Ban,
  CheckCheck,
  Filter,
  Flame,
  ArrowDownToLine,
  Coins,
  FileSpreadsheet,
} from 'lucide-react';
import { EtfItem, EtfCategory, AtrPeriod, GridItemConfig, GridRangeMode } from '../types';
import {
  calculateGridItem,
  roundToHalfStep,
  ATR_MULTIPLIER_OPTIONS,
  DEFAULT_RANGE_OPTIONS,
  generateGridLadder,
  GridLadderLevel,
} from '../utils/gridCalculator';
import { exportSection2GridToXlsx } from '../utils/gridExcelExporter';
import {
  EtfNameFilterState,
  DEFAULT_NAME_FILTER,
  matchesEtfNameFilter,
  getAvailableNameThemes,
  getAvailableFundIssuers,
  dedupeSimilarEtfs,
  parseEtfScaleValue,
} from '../utils/etfNameFilter';

interface GridTradingSectionProps {
  etfs: EtfItem[];
  atrPeriod: AtrPeriod;
  onPeriodChange: (p: AtrPeriod) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids?: string[]) => void;
  onDeselectAll: () => void;
  onOpenExportGrid: (items?: GridItemConfig[], selectedOnly?: boolean) => void;
}

export const GridTradingSection: React.FC<GridTradingSectionProps> = ({
  etfs,
  atrPeriod,
  onPeriodChange,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onOpenExportGrid,
}) => {
  // 全局参数控制
  const [roundToHalf, setRoundToHalf] = useState<boolean>(true); // 默认开启0.5%倍数对齐
  const [atrMultiplier, setAtrMultiplier] = useState<number>(1.0);
  const [rangePercent, setRangePercent] = useState<number>(20);
  const [rangeMode, setRangeMode] = useState<GridRangeMode>('kline_120d'); // 默认使用 120日K线极值 (前复权：最高价=120日High最大值，最低价=120日Low最小值)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<EtfCategory[]>([]); // 空数组表示全部
  const [isMultiCategoryMode, setIsMultiCategoryMode] = useState<boolean>(false); // 跨分类多选模式
  const [dedupeSimilarOnly, setDedupeSimilarOnly] = useState<boolean>(false); // 同类只显示一只
  const [onlyShowSelected, setOnlyShowSelected] = useState<boolean>(false); // 是否仅看已勾选
  const [nameFilter, setNameFilter] = useState<EtfNameFilterState>(DEFAULT_NAME_FILTER);
  // 量化条件筛选与排序（对齐并扩展板块一筛选能力）
  const [isTouchLowOnly, setIsTouchLowOnly] = useState<boolean>(false);
  const [isHighVolOnly, setIsHighVolOnly] = useState<boolean>(false);
  const [isAboveAvgOnly, setIsAboveAvgOnly] = useState<boolean>(false);
  const [minScale, setMinScale] = useState<number>(0); // 0=全部, 20/50/100=亿元门槛
  const [gridSortField, setGridSortField] = useState<
    'default' | 'gridStepPercent' | 'gridCount' | 'scaleAmount' | 'price' | 'volumeAmount' | 'code'
  >('default');
  const [gridSortDirection, setGridSortDirection] = useState<'desc' | 'asc'>('desc');

  // 单个标的个性化覆盖 { [id]: { basePrice?, highPrice?, lowPrice?, gridStepPercent? } }
  const [customOverrides, setCustomOverrides] = useState<
    Record<
      string,
      Partial<{
        basePrice: number;
        highPrice: number;
        lowPrice: number;
        gridStepPercent: number;
      }>
    >
  >({});

  // 编辑弹窗状态
  const [editingItem, setEditingItem] = useState<GridItemConfig | null>(null);
  const [editForm, setEditForm] = useState<{
    basePrice: string;
    highPrice: string;
    lowPrice: string;
    gridStepPercent: string;
  }>({
    basePrice: '',
    highPrice: '',
    lowPrice: '',
    gridStepPercent: '',
  });

  // 阶梯抽屉/查看状态
  const [inspectLadderItem, setInspectLadderItem] = useState<GridItemConfig | null>(null);
  const [isExportingXlsx, setIsExportingXlsx] = useState<boolean>(false);
  const [xlsxNotice, setXlsxNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 计算所有标的的网格参数（支持近120日K线实际高低价或百分比箱体，以及0.5%倍数对齐）
  const gridItems = useMemo(() => {
    return etfs.map((etf) => {
      const override = customOverrides[etf.id];
      return calculateGridItem(etf, atrMultiplier, rangePercent, override, roundToHalf, rangeMode);
    });
  }, [etfs, atrMultiplier, rangePercent, customOverrides, roundToHalf, rangeMode]);

  const etfById = useMemo(() => {
    const map = new Map<string, EtfItem>();
    for (const e of etfs) {
      map.set(e.id, e);
    }
    return map;
  }, [etfs]);

  const selectedByCategory = useMemo(() => {
    const map = new Map<EtfCategory, number>();
    for (const e of etfs) {
      if (e.selected) {
        map.set(e.category, (map.get(e.category) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [etfs]);

  const selectedCategoryCountMap = useMemo(
    () => new Map<EtfCategory, number>(selectedByCategory.map((i) => [i.category, i.count])),
    [selectedByCategory]
  );

  // 当前分类与勾选范围下的标的子集（用于动态计算名称主题与基金公司选项）
  const categoryScopedGridItems = useMemo(() => {
    return gridItems.filter((item) => {
      if (onlyShowSelected && !etfById.get(item.id)?.selected) {
        return false;
      }
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }
      return true;
    });
  }, [gridItems, selectedCategories, onlyShowSelected, etfById]);

  const availableNameThemes = useMemo(
    () => getAvailableNameThemes(categoryScopedGridItems),
    [categoryScopedGridItems]
  );

  const availableFundIssuers = useMemo(
    () => getAvailableFundIssuers(categoryScopedGridItems),
    [categoryScopedGridItems]
  );

  // 统计当前分类范围内的触及低位 / 高波动 / 超历史均值标的数
  const { touchLowCount, highVolCount, aboveAvgCount } = useMemo(() => {
    let touchLow = 0;
    let highVol = 0;
    let aboveAvg = 0;
    for (const item of categoryScopedGridItems) {
      const orig = etfById.get(item.id);
      if (!orig) continue;
      const low60 = orig.low60d || orig.low120d || orig.low;
      if (low60 > 0 && orig.price <= low60 * 1.0501) touchLow++;
      if (orig.atrPercent >= 2.6) highVol++;
      if (orig.isAboveHistoricalAvg) aboveAvg++;
    }
    return { touchLowCount: touchLow, highVolCount: highVol, aboveAvgCount: aboveAvg };
  }, [categoryScopedGridItems, etfById]);

  const handleSortToggle = (
    field: 'gridStepPercent' | 'gridCount' | 'scaleAmount' | 'price' | 'volumeAmount' | 'code'
  ) => {
    if (gridSortField === field) {
      setGridSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setGridSortField(field);
      setGridSortDirection('desc');
    }
  };

  // 筛选、同类去重与排序
  const { filteredGridItems, similarGroupCounts, preDedupeCount } = useMemo(() => {
    const matched = categoryScopedGridItems.filter((item) => {
      if (!matchesEtfNameFilter(item, searchQuery, nameFilter)) return false;

      const orig = etfById.get(item.id);
      if (isTouchLowOnly) {
        const low60 = orig?.low60d || orig?.low120d || orig?.low || 0;
        if (!(low60 > 0 && item.price <= low60 * 1.0501)) return false;
      }
      if (isHighVolOnly) {
        if ((orig?.atrPercent ?? item.atrPercent) < 2.6) return false;
      }
      if (isAboveAvgOnly) {
        if (!orig?.isAboveHistoricalAvg) return false;
      }
      if (minScale > 0) {
        const scale = orig ? parseEtfScaleValue(orig) : 0;
        if (scale < minScale) return false;
      }
      return true;
    });

    const preCount = matched.length;
    let working = matched;
    let groupCounts: Record<string, number> = {};

    if (dedupeSimilarOnly) {
      const deduped = dedupeSimilarEtfs(matched, (item) => {
        const orig = etfById.get(item.id);
        const scale = orig ? parseEtfScaleValue(orig) : 0;
        const vol = orig?.volumeAmount ?? 0;
        return scale * 1_000_000 + vol * 1_000 + item.atrPercent;
      });
      working = deduped.items;
      groupCounts = deduped.groupCounts;
    }

    if (gridSortField !== 'default') {
      working = [...working].sort((a, b) => {
        const origA = etfById.get(a.id);
        const origB = etfById.get(b.id);
        let valA = 0;
        let valB = 0;

        if (gridSortField === 'gridStepPercent') {
          valA = a.gridStepPercent;
          valB = b.gridStepPercent;
        } else if (gridSortField === 'gridCount') {
          valA = a.gridCount;
          valB = b.gridCount;
        } else if (gridSortField === 'price') {
          valA = a.price;
          valB = b.price;
        } else if (gridSortField === 'scaleAmount') {
          valA = origA ? parseEtfScaleValue(origA) : 0;
          valB = origB ? parseEtfScaleValue(origB) : 0;
        } else if (gridSortField === 'volumeAmount') {
          valA = origA?.volumeAmount ?? 0;
          valB = origB?.volumeAmount ?? 0;
        } else if (gridSortField === 'code') {
          return gridSortDirection === 'desc'
            ? b.code.localeCompare(a.code)
            : a.code.localeCompare(b.code);
        }

        return gridSortDirection === 'desc' ? valB - valA : valA - valB;
      });
    }

    return {
      filteredGridItems: working,
      similarGroupCounts: groupCounts,
      preDedupeCount: preCount,
    };
  }, [
    categoryScopedGridItems,
    searchQuery,
    nameFilter,
    dedupeSimilarOnly,
    etfById,
    isTouchLowOnly,
    isHighVolOnly,
    isAboveAvgOnly,
    minScale,
    gridSortField,
    gridSortDirection,
  ]);

  const handleSelectCategory = (cat: EtfCategory) => {
    if (cat === '全部') {
      setSelectedCategories([]);
    } else if (isMultiCategoryMode) {
      setSelectedCategories((prev) =>
        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
      );
    } else {
      setSelectedCategories([cat]);
    }
    setNameFilter((prev) => ({ ...prev, nameTheme: '全部' }));
  };

  const hasActiveNameFilter =
    nameFilter.nameTheme !== '全部' ||
    nameFilter.fundIssuer !== '全部' ||
    nameFilter.excludeQuery.trim() !== '' ||
    searchQuery.trim() !== '' ||
    isTouchLowOnly ||
    isHighVolOnly ||
    isAboveAvgOnly ||
    minScale > 0;

  const handleResetNameFilters = () => {
    setSearchQuery('');
    setNameFilter(DEFAULT_NAME_FILTER);
    setIsTouchLowOnly(false);
    setIsHighVolOnly(false);
    setIsAboveAvgOnly(false);
    setMinScale(0);
  };

  // 统计概览（随当前筛选列表联动）
  const stats = useMemo(() => {
    const source = filteredGridItems.length > 0 ? filteredGridItems : gridItems;
    if (source.length === 0) {
      return { avgStep: '0.0', avgCount: 0, minStep: '0.0', maxStep: '0.0' };
    }
    const sumStep = source.reduce((acc, c) => acc + c.gridStepPercent, 0);
    const avgStep = (sumStep / source.length).toFixed(1);
    const steps = source.map((g) => g.gridStepPercent);
    const minStep = Math.min(...steps).toFixed(1);
    const maxStep = Math.max(...steps).toFixed(1);
    const avgCount = Math.round(
      source.reduce((acc, c) => acc + c.gridCount, 0) / source.length
    );
    return { avgStep, avgCount, minStep, maxStep };
  }, [filteredGridItems, gridItems]);

  // 选中的标的数量
  const selectedCount = useMemo(() => {
    return etfs.filter((e) => e.selected).length;
  }, [etfs]);

  // 打开编辑
  const handleStartEdit = (item: GridItemConfig) => {
    setEditingItem(item);
    setEditForm({
      basePrice: item.basePrice.toString(),
      highPrice: item.highPrice.toString(),
      lowPrice: item.lowPrice.toString(),
      gridStepPercent: item.gridStepPercent.toString(),
    });
  };

  // 保存单个自定义编辑
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const basePrice = parseFloat(editForm.basePrice);
    const highPrice = parseFloat(editForm.highPrice);
    const lowPrice = parseFloat(editForm.lowPrice);
    const gridStepPercent = parseFloat(editForm.gridStepPercent);

    if (
      isNaN(basePrice) ||
      isNaN(highPrice) ||
      isNaN(lowPrice) ||
      isNaN(gridStepPercent) ||
      basePrice <= 0 ||
      lowPrice <= 0 ||
      highPrice <= lowPrice ||
      gridStepPercent <= 0
    ) {
      alert('请检查输入的数值是否合理（基准价、最低价应大于0，且最高价需大于最低价）');
      return;
    }

    setCustomOverrides((prev) => ({
      ...prev,
      [editingItem.id]: {
        basePrice,
        highPrice,
        lowPrice,
        gridStepPercent,
      },
    }));

    setEditingItem(null);
  };

  // 重置单个自定义
  const handleResetSingle = (id: string) => {
    setCustomOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // 重置全部自定义
  const handleResetAllCustom = () => {
    if (Object.keys(customOverrides).length === 0) return;
    if (window.confirm('确定要清除所有ETF的手动自定义修改，恢复为根据ATR全局自动测算吗？')) {
      setCustomOverrides({});
    }
  };

  // 导出选中标的网格参数为 CSV 表格文件
  const handleExportSelectedCsv = () => {
    const targetItems =
      selectedCount > 0
        ? gridItems.filter((item) => {
            const original = etfs.find((e) => e.id === item.id);
            return original?.selected;
          })
        : gridItems;

    if (targetItems.length === 0) {
      alert('请先勾选需要导出的ETF标的');
      return;
    }

    const headers = [
      '序号',
      '基金名称',
      '基金代码',
      '行业类别',
      '基金规模',
      '参考现价(元)',
      '网格基准价(元)',
      '网格上限(元)',
      '网格下限(元)',
      '网格间距(%)',
      '单格差价(元)',
      '预估总格数',
      'ATR波动率(%)',
    ];

    const rows = targetItems.map((item, idx) => {
      const original = etfs.find((e) => e.id === item.id);
      return [
        idx + 1,
        `"${item.name.replace(/"/g, '""')}"`,
        `"\t${item.code}"`, // Tab前缀防止Excel将前导0截断
        `"${item.category}"`,
        `"${original?.scaleText || (original?.scaleAmount ? `约${original.scaleAmount}亿` : '--')}"`,
        item.price.toFixed(3),
        item.basePrice.toFixed(3),
        item.highPrice.toFixed(3),
        item.lowPrice.toFixed(3),
        item.gridStepPercent.toFixed(2) + '%',
        item.gridStepPrice.toFixed(3),
        item.gridCount,
        item.atrPercent.toFixed(2) + '%',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `A股ETF网格参数_${selectedCount > 0 ? `已选${targetItems.length}只` : '全部'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 导出网格参数为 XLSX Excel 工作簿
  const handleExportGridXlsx = async (onlySelected: boolean) => {
    const targetItems = onlySelected
      ? gridItems.filter((item) => etfById.get(item.id)?.selected)
      : filteredGridItems;

    if (targetItems.length === 0) {
      setXlsxNotice({
        type: 'err',
        text: onlySelected ? '请先勾选需要导出的ETF标的' : '当前筛选条件下暂无可导出的ETF数据',
      });
      setTimeout(() => setXlsxNotice(null), 3200);
      return;
    }

    const scopeLabel = onlySelected
      ? `已选${targetItems.length}只`
      : filteredGridItems.length < gridItems.length
      ? `当前筛选${targetItems.length}只`
      : `全部${targetItems.length}只`;

    setIsExportingXlsx(true);
    setXlsxNotice(null);
    try {
      await exportSection2GridToXlsx({
        items: targetItems,
        etfs,
        customOverrides,
        globalConfig: {
          atrPeriod,
          atrMultiplier,
          rangeMode,
          rangePercent,
          roundToHalf,
          scopeLabel,
        },
      });
      setXlsxNotice({
        type: 'ok',
        text: `已导出 ${targetItems.length} 只标的的网格参数 XLSX 文件（含参数总览、买卖阶梯与全局配置）`,
      });
      setTimeout(() => setXlsxNotice(null), 3800);
    } catch (err) {
      console.error('Export Section 2 XLSX failed:', err);
      setXlsxNotice({
        type: 'err',
        text: '导出 XLSX 失败，请稍后重试',
      });
      setTimeout(() => setXlsxNotice(null), 3200);
    } finally {
      setIsExportingXlsx(false);
    }
  };

  // 分类列表 (与板块一完全统一)
  const categories: EtfCategory[] = [
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

  return (
    <div className="space-y-5">
      {/* 顶部介绍与全局参数调节面板 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">
                    网格交易基础参数设计
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    ATR量化动态定距
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    已自动导入板块一全部 {etfs.length} 只 ETF 标的
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  基于历史真实波动幅度(ATR)科学测算每个ETF的网格间距，精准适配各标的波动特性，避免间距过窄被杂波磨损或间距过宽错失波段
                </p>
              </div>
            </div>
          </div>

          {/* 快捷导出与操作按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(customOverrides).length > 0 && (
              <button
                type="button"
                onClick={handleResetAllCustom}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="清除自定义重置为全局ATR计算"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复ATR默认 ({Object.keys(customOverrides).length})</span>
              </button>
            )}

            {/* 核心：如果用户有选中的标的，优先且重点展示「导出选中的ETF」 */}
            {selectedCount > 0 ? (
              <div className="inline-flex items-center rounded-xl shadow-xs">
                <button
                  id="export-grid-btn"
                  type="button"
                  onClick={() => onOpenExportGrid(gridItems, true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-l-xl transition-all shadow-xs"
                  title={`仅导出跨分类选中的 ${selectedCount} 只 ETF 网格参数`}
                >
                  <Download className="w-4 h-4" />
                  <span>导出选中的 ETF ({selectedCount}只)</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-semibold">
                    仅选中
                  </span>
                </button>
                <button
                  id="export-grid-all-btn"
                  type="button"
                  onClick={() => onOpenExportGrid(filteredGridItems, false)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-rose-100 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 rounded-r-xl border-l border-rose-500/50 transition-colors"
                  title="导出当前筛选展示的ETF网格参数"
                >
                  <span>
                    {filteredGridItems.length < gridItems.length
                      ? `当前筛选(${filteredGridItems.length})`
                      : `全部(${gridItems.length})`}
                  </span>
                </button>
              </div>
            ) : (
              <button
                id="export-grid-btn"
                type="button"
                onClick={() => onOpenExportGrid(filteredGridItems, false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all hover:shadow-md hover:shadow-rose-200"
                title="导出当前筛选列表的网格参数图片"
              >
                <Download className="w-4 h-4" />
                <span>导出网格参数图片</span>
                <span className="text-[10px] bg-rose-700/80 px-1.5 py-0.5 rounded text-rose-100 font-normal">
                  {filteredGridItems.length < gridItems.length
                    ? `当前筛选 ${filteredGridItems.length} 只`
                    : `全部 ${gridItems.length} 只`}
                </span>
              </button>
            )}

            {/* 导出 XLSX Excel 工作簿按钮 */}
            {selectedCount > 0 ? (
              <div className="inline-flex items-center rounded-xl shadow-xs">
                <button
                  id="export-grid-xlsx-selected-btn"
                  type="button"
                  disabled={isExportingXlsx}
                  onClick={() => handleExportGridXlsx(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-l-xl transition-all disabled:opacity-60 cursor-pointer"
                  title={`导出跨分类选中的 ${selectedCount} 只 ETF 网格参数为 Excel (.xlsx) 文件`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExportingXlsx ? '导出中...' : `导出选中 XLSX (${selectedCount}只)`}</span>
                </button>
                <button
                  id="export-grid-xlsx-filtered-btn"
                  type="button"
                  disabled={isExportingXlsx}
                  onClick={() => handleExportGridXlsx(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-emerald-100 bg-emerald-800 hover:bg-emerald-900 rounded-r-xl border-l border-emerald-600/50 transition-colors disabled:opacity-60 cursor-pointer"
                  title="导出当前筛选列表的 ETF 网格参数为 Excel (.xlsx) 文件"
                >
                  <span>
                    {filteredGridItems.length < gridItems.length
                      ? `筛选(${filteredGridItems.length})`
                      : `全部(${gridItems.length})`}
                  </span>
                </button>
              </div>
            ) : (
              <button
                id="export-grid-xlsx-btn"
                type="button"
                disabled={isExportingXlsx}
                onClick={() => handleExportGridXlsx(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer"
                title="导出当前网格参数与买卖阶梯为 Excel (.xlsx) 文件"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingXlsx ? '导出中...' : '导出 XLSX'}</span>
                <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded text-emerald-100 font-normal">
                  {filteredGridItems.length < gridItems.length
                    ? `筛选 ${filteredGridItems.length} 只`
                    : `全部 ${gridItems.length} 只`}
                </span>
              </button>
            )}
          </div>
        </div>

        {xlsxNotice && (
          <div
            className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
              xlsxNotice.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>{xlsxNotice.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setXlsxNotice(null)}
              className="text-current/70 hover:text-current text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* 核心参数调节栏：0.5%倍数规范、ATR间距倍数、区间范围、ATR周期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 pt-1">
          {/* 1. 0.5%倍数对齐规范 (实盘推荐) */}
          <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-200/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  间距规范 (0.5%倍数)
                </span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200">
                  实盘首选
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoundToHalf(true)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                    roundToHalf
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <div className="font-bold flex items-center justify-center gap-1">
                    <Check className={`w-3 h-3 ${roundToHalf ? 'inline' : 'hidden'}`} />
                    0.5%倍数对齐
                  </div>
                  <div className={`text-[9px] mt-0.5 ${roundToHalf ? 'text-rose-100' : 'text-slate-400'}`}>
                    1.0%, 1.5%, 2.0%
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRoundToHalf(false)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                    !roundToHalf
                      ? 'bg-slate-800 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <div className="font-medium">精确浮点值</div>
                  <div className={`text-[9px] mt-0.5 ${!roundToHalf ? 'text-slate-200' : 'text-slate-400'}`}>
                    如 1.34%, 2.18%
                  </div>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {roundToHalf
                ? '★ 推荐：网格间距自动取 0.5% 的整数倍，完全契合华泰涨乐、银河、国金等主流券商条件单设置标准。'
                : '间距保留连续浮点小数。如需实盘委托，推荐开启 0.5% 倍数对齐以提高撮合效率。'}
            </p>
          </div>

          {/* 2. 网格间距系数 (基于ATR%) */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rose-600" />
                  间距系数 (k × ATR%)
                </span>
                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {atrMultiplier.toFixed(1)} × ATR%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {ATR_MULTIPLIER_OPTIONS.map((opt) => (
                  <button
                    key={opt.multiplier}
                    type="button"
                    onClick={() => setAtrMultiplier(opt.multiplier)}
                    className={`px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                      atrMultiplier === opt.multiplier
                        ? 'bg-rose-600 text-white font-bold shadow-xs scale-102'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                    title={opt.desc}
                  >
                    <div className="font-mono text-[11px]">{opt.label}</div>
                    <div className={`text-[9px] mt-0.5 truncate ${atrMultiplier === opt.multiplier ? 'text-rose-100' : 'text-slate-400'}`}>
                      {opt.multiplier === 1.0 ? '标准' : opt.multiplier < 1.0 ? '高频' : '宽幅'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              网格基准间距 = ETF现价 × (ATR% × {atrMultiplier.toFixed(1)})，基于真实波动率量化定价。
            </p>
          </div>

          {/* 3. 价格区间跨度 (最高价/最低价覆盖幅度) */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  网格最高价 / 最低价设定
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  rangeMode === 'kline_120d'
                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                    : rangeMode === 'ma120_sr'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-blue-700 bg-blue-50 border-blue-200'
                }`}>
                  {rangeMode === 'kline_120d'
                    ? '120日高点/60日低点 (推荐)'
                    : rangeMode === 'ma120_sr'
                    ? 'MA120 压力位/支撑位'
                    : `±${rangePercent}% 对称箱体`}
                </span>
              </div>

              {/* 区间模式切换按钮 */}
              <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRangeMode('kline_120d')}
                  className={`px-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    rangeMode === 'kline_120d'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                  title="根据真实日K线前复权数据设定网格区间：最高价=120日High最大值（半年高位上限），最低价=60日Low最小值（近1季底部吸筹）"
                >
                  <Sparkles className="w-3 h-3" />
                  120日高/60日低
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode('ma120_sr')}
                  className={`px-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    rangeMode === 'ma120_sr'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                  title="使用历史压力位(最高价)和支撑位(最低价)，以MA120半年线及关键均线技术位为核心设置"
                >
                  MA120压力/支撑
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode('percent_range')}
                  className={`px-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all text-center ${
                    rangeMode === 'percent_range'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                  title="根据基准价按固定百分比对称计算网格最高价与最低价"
                >
                  固定±%箱体
                </button>
              </div>

              {/* 当选择不同模式时的说明与控制 */}
              {rangeMode === 'kline_120d' ? (
                <div className="bg-indigo-50/80 p-2 rounded-lg border border-indigo-100/80 text-[11px] text-indigo-900 leading-snug space-y-0.5">
                  <div className="font-bold flex items-center gap-1 text-indigo-900">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    已启用120日高点 + 60日低点（前复权）技术位模型：
                  </div>
                  <div className="text-[10px] text-indigo-800">
                    • <strong>最高价（网格上限）</strong> = 120日内前复权日K线 High 的最大值（半年高位防踏空）；
                  </div>
                  <div className="text-[10px] text-indigo-800">
                    • <strong>最低价（网格下限）</strong> = 60日内前复权日K线 Low 的最小值（近1季底部吸筹支撑）；
                  </div>
                  <div className="text-[10px] text-indigo-800">
                    • <strong>MA120 半年线</strong> = 120日内前复权收盘价均值（显示于基准价下方作为技术中枢）。
                  </div>
                </div>
              ) : rangeMode === 'ma120_sr' ? (
                <div className="bg-rose-50/80 p-2 rounded-lg border border-rose-100/80 text-[11px] text-rose-950 leading-snug space-y-0.5">
                  <div className="font-bold flex items-center gap-1 text-rose-900">
                    <Sparkles className="w-3 h-3 text-rose-600" />
                    已启用历史均线压力位与支撑位模型：
                  </div>
                  <div className="text-[10px] text-rose-800">
                    • <strong>最高价（压力位）</strong>：取上方核心阻力，优先锚定 MA120 半年线反压或波段高点；
                  </div>
                  <div className="text-[10px] text-rose-800">
                    • <strong>最低价（支撑位）</strong>：取下方核心支撑，优先锚定 MA120 半年线回踩支撑或筑底低点。
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {DEFAULT_RANGE_OPTIONS.map((rng) => (
                    <button
                      key={rng.percent}
                      type="button"
                      onClick={() => setRangePercent(rng.percent)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all text-center ${
                        rangePercent === rng.percent
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {rng.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {rangeMode === 'kline_120d'
                ? '由真实前复权走势日K线High最大值与Low最小值锚定，消除除权派息导致的断层失真。'
                : rangeMode === 'ma120_sr'
                ? '以半年线（MA120）及波段技术位为锚，兼顾多空趋势与网格安全边界。'
                : `最高价 = 基准价 × (1 + ${rangePercent}%)；最低价 = 基准价 × (1 - ${rangePercent}%)。`}
            </p>
          </div>

          {/* 4. ATR 周期与参考均值 */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
                  ATR 周期与统计
                </span>
                <div className="inline-flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => onPeriodChange(14)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      atrPeriod === 14
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    14天
                  </button>
                  <button
                    type="button"
                    onClick={() => onPeriodChange(20)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      atrPeriod === 20
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    20天
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="text-[10px] text-slate-400">平均网格间距</div>
                  <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
                    {stats.avgStep}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    极值: {stats.minStep}% ~ {stats.maxStep}%
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="text-[10px] text-slate-400">预估平均格数</div>
                  <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
                    {stats.avgCount} 格
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    区间: ±{rangePercent}%
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              全市场已配置 {filteredGridItems.length} 只标的网格参数。
            </p>
          </div>
        </div>
      </div>

      {/* 搜索与分类筛选条 */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* 类别标签 + 跨分类多选 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-slate-400 font-medium whitespace-nowrap mr-0.5 flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5" />
              分类:
            </span>
            <button
              type="button"
              onClick={() => setIsMultiCategoryMode((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border mr-0.5 ${
                isMultiCategoryMode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="开启后可同时勾选多个行业分类，跨分类对比与筛选标的"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isMultiCategoryMode ? '多选分类中' : '跨分类多选'}</span>
              {selectedCategories.length > 1 && (
                <span className="text-[10px] px-1 rounded bg-white/20 font-mono">
                  {selectedCategories.length}
                </span>
              )}
            </button>
            {categories.map((cat) => {
              const isActive =
                cat === '全部'
                  ? selectedCategories.length === 0
                  : selectedCategories.includes(cat);
              const catSelCount =
                cat !== '全部' ? selectedCategoryCountMap.get(cat) || 0 : 0;
              const showPartial = selectedCount > 0 && selectedCount < etfs.length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  {showPartial && catSelCount > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 rounded font-bold ${
                        isActive
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {catSelCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 搜索与范围筛选 */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* 显示范围切换：全部 / 仅看勾选 */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setOnlyShowSelected(false)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  !onlyShowSelected
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                全部标的 ({etfs.length})
              </button>
              <button
                type="button"
                onClick={() => setOnlyShowSelected(true)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  onlyShowSelected
                    ? 'bg-rose-600 text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="仅筛选显示在板块一或此表跨分类勾选的标的"
              >
                仅看已勾选 ({selectedCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索代码 / 名称(空格多词)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                  title="清空搜索"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectAll(filteredGridItems.map((i) => i.id))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              title="勾选当前筛选出的全部ETF（保留其他分类已勾选目标）"
            >
              <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
              <span>全选当前 ({filteredGridItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDeselectAll();
                setOnlyShowSelected(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              title="清空全部勾选，方便从0开始跨分类挑选目标"
            >
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>清空全部</span>
            </button>
          </div>
        </div>

        {/* ETF 名称分类筛选条 */}
        <div className="pt-2.5 border-t border-slate-100 space-y-2.5 text-xs">
          {/* 名称主题标签 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-slate-500 font-medium whitespace-nowrap mr-0.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-rose-500" />
              名称分类:
            </span>
            <button
              type="button"
              onClick={() => setDedupeSimilarOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all border mr-1 ${
                dedupeSimilarOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="开启后，同名或跟踪同一指数的多只ETF只显示规模/成交额最高的1只代表标的"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>同类只显1只</span>
              {dedupeSimilarOnly && (
                <span className="text-[10px] font-mono px-1 rounded bg-white/20">
                  {preDedupeCount}→{filteredGridItems.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setNameFilter((prev) => ({ ...prev, nameTheme: '全部' }))}
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
                    setNameFilter((prev) => ({
                      ...prev,
                      nameTheme: isActive ? '全部' : theme.id,
                    }))
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
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 whitespace-nowrap">基金公司:</span>
              <select
                value={nameFilter.fundIssuer}
                onChange={(e) =>
                  setNameFilter((prev) => ({ ...prev, fundIssuer: e.target.value }))
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

            <div className="relative min-w-[205px] flex-1 sm:flex-initial">
              <Ban className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="排除名称词(空格分隔, 如: 增强 货币)..."
                value={nameFilter.excludeQuery}
                onChange={(e) =>
                  setNameFilter((prev) => ({ ...prev, excludeQuery: e.target.value }))
                }
                className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
              {nameFilter.excludeQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setNameFilter((prev) => ({ ...prev, excludeQuery: '' }))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                  title="清空排除词"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                当前显示{' '}
                <span className="font-mono font-bold text-slate-900">
                  {filteredGridItems.length}
                </span>{' '}
                / {gridItems.length} 只
              </span>
              {hasActiveNameFilter && (
                <button
                  type="button"
                  onClick={handleResetNameFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors"
                  title="重置名称、量化条件、规模及搜索筛选"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置筛选</span>
                </button>
              )}
            </div>
          </div>

          {/* 量化特征筛选 + 基金规模 + 多维排序栏 */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
            {/* 量化特征与规模筛选 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-medium whitespace-nowrap mr-0.5 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                量化筛选:
              </span>

              <button
                type="button"
                onClick={() => setIsTouchLowOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                  isTouchLowOnly
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/80 hover:bg-blue-100 text-blue-800 border-blue-200'
                }`}
                title="筛选当前价格处于60日底部区域（偏离60日低点5%以内）的ETF，适合低吸建网格底仓"
              >
                <ArrowDownToLine className={`w-3.5 h-3.5 ${isTouchLowOnly ? 'text-white' : 'text-blue-600'}`} />
                <span>触及低位(60日底)</span>
                <span className={`text-[10px] font-mono px-1 rounded font-bold ${isTouchLowOnly ? 'bg-white text-blue-700' : 'bg-blue-200/80 text-blue-900'}`}>
                  {touchLowCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsHighVolOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                  isHighVolOnly
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50/70 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
                title="筛选ATR% >= 2.6%的高弹性品种，网格价差空间更大"
              >
                <Flame className={`w-3.5 h-3.5 ${isHighVolOnly ? 'text-white' : 'text-rose-500'}`} />
                <span>高波动(ATR≥2.6%)</span>
                <span className={`text-[10px] font-mono px-1 rounded font-bold ${isHighVolOnly ? 'bg-white text-rose-700' : 'bg-rose-200/70 text-rose-800'}`}>
                  {highVolCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsAboveAvgOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                  isAboveAvgOnly
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50/70 hover:bg-amber-100 text-amber-800 border-amber-200'
                }`}
                title="只看当前ATR超过近20日平均波幅的品种"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>超20日均值</span>
                <span className={`text-[10px] font-mono px-1 rounded font-bold ${isAboveAvgOnly ? 'bg-white text-amber-700' : 'bg-amber-200/80 text-amber-900'}`}>
                  {aboveAvgCount}
                </span>
              </button>

              {/* 基金规模门槛 */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 whitespace-nowrap">规模:</span>
                <select
                  value={minScale}
                  onChange={(e) => setMinScale(Number(e.target.value))}
                  className="bg-transparent text-slate-800 font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value={0}>全部规模</option>
                  <option value={20}>≥ 20亿</option>
                  <option value={50}>≥ 50亿</option>
                  <option value={100}>≥ 100亿 (大盘主力)</option>
                </select>
              </div>
            </div>

            {/* 排序控制 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                排序:
              </span>
              {(
                [
                  { id: 'gridStepPercent', label: '网格间距%' },
                  { id: 'gridCount', label: '预估格数' },
                  { id: 'scaleAmount', label: '基金规模' },
                  { id: 'volumeAmount', label: '成交额' },
                ] as const
              ).map((opt) => {
                const isActive = gridSortField === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSortToggle(opt.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-medium transition-colors ${
                      isActive
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && (
                      <span className="font-mono font-bold text-[10px]">
                        {gridSortDirection === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                );
              })}
              {gridSortField !== 'default' && (
                <button
                  type="button"
                  onClick={() => setGridSortField('default')}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                  title="恢复默认排序"
                >
                  默认
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 核心：已勾选标的专属高亮操作条，提供一键导出选中的ETF图片与CSV */}
      {selectedCount > 0 && (
        <div className="bg-rose-50/90 border border-rose-200/90 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="font-bold text-rose-950 text-xs">
              已选中 <span className="text-rose-600 font-mono text-sm">{selectedCount}</span> 只 ETF 标的
            </span>
            {selectedCount < etfs.length && selectedByCategory.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedByCategory.slice(0, 7).map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => handleSelectCategory(item.category)}
                    className="px-2 py-0.5 rounded bg-white/90 hover:bg-white text-slate-700 border border-rose-200/80 text-[11px] font-medium transition-colors"
                    title={`点击定位「${item.category}」分类`}
                  >
                    {item.category} <span className="font-mono font-bold text-rose-600">{item.count}</span>
                  </button>
                ))}
                {selectedByCategory.length > 7 && (
                  <span className="text-[11px] text-slate-500">
                    等 {selectedByCategory.length} 类
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-500 text-[11px] hidden md:inline">
                · 可针对性导出这 {selectedCount} 只标的的网格参数长图或下载表格
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="export-selected-only-bar-btn"
              type="button"
              onClick={() => onOpenExportGrid(gridItems, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-lg shadow-xs transition-all cursor-pointer"
              title={`一键导出选中的 ${selectedCount} 只 ETF 网格参数设计图片`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>仅导出选中的 {selectedCount} 只ETF图片</span>
            </button>
            <button
              type="button"
              disabled={isExportingXlsx}
              onClick={() => handleExportGridXlsx(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
              title={`下载选中 ${selectedCount} 只标的的网格参数与阶梯明细 (.xlsx)`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExportingXlsx ? '导出中...' : '导出选中 XLSX'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportSelectedCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="下载选中标的的网格参数 CSV 表格"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>导出选中CSV表格</span>
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 transition-colors text-xs"
            >
              清空选择
            </button>
          </div>
        </div>
      )}

      {/* 核心网格交易参数表 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 select-none">
                <th className="py-3 px-3 text-center w-10">选择</th>
                <th className="py-3 px-2 text-center w-8">#</th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('code')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                  >
                    <span>基金名称 / 代码</span>
                    {gridSortField === 'code' && (
                      <span className="font-mono text-[10px] text-rose-600">
                        {gridSortDirection === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-2">行业类别</th>
                <th className="py-3 px-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('scaleAmount')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors mx-auto"
                    title="点击按基金规模排序"
                  >
                    <span>基金规模</span>
                    {gridSortField === 'scaleAmount' && (
                      <span className="font-mono text-[10px] text-rose-600">
                        {gridSortDirection === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('price')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors ml-auto"
                  >
                    <span>参考现价(¥)</span>
                    {gridSortField === 'price' && (
                      <span className="font-mono text-[10px] text-rose-600">
                        {gridSortDirection === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 text-right font-bold text-slate-800 bg-slate-100/50">
                  <div className="flex flex-col items-end">
                    <span>基准价 (¥)</span>
                    <span className="text-[9px] font-normal text-slate-400 font-mono">
                      MA120参考
                    </span>
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right font-bold text-red-600 bg-red-50/40 cursor-help"
                  title={
                    rangeMode === 'kline_120d'
                      ? '网格最高价（卖出上限）。系统按该ETF【120日内前复权日K线 High 的最大值】自动设定，消除除权失真，可在右侧点击编辑自定义'
                      : rangeMode === 'ma120_sr'
                      ? '网格最高价（卖出上限/压力位）。系统优先以MA120半年线反压位或120日波段阻力设置'
                      : `网格最高价（卖出上限）。系统按【基准价 × (1 + ${rangePercent}%)】计算，可在右侧点击编辑自定义`
                  }
                >
                  <div className="flex flex-col items-end">
                    <span>最高价 / 压力位 (¥)</span>
                    <span className="text-[10px] font-normal text-red-500 font-mono">
                      {rangeMode === 'kline_120d' ? '120日High最大值(前复权)' : rangeMode === 'ma120_sr' ? 'MA120压力位' : `上限 (+${rangePercent}%)`}
                    </span>
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40 cursor-help"
                  title={
                    rangeMode === 'kline_120d'
                      ? '网格最低价（买入下限）。系统按该ETF【60日内前复权日K线 Low 的最小值】自动设定（近1季底部），消除除权失真，可在右侧点击编辑自定义'
                      : rangeMode === 'ma120_sr'
                      ? '网格最低价（买入下限/支撑位）。系统优先以MA120半年线回踩支撑位或120日筑底低点设置'
                      : `网格最低价（买入下限）。系统按【基准价 × (1 - ${rangePercent}%)】计算，可在右侧点击编辑自定义`
                  }
                >
                  <div className="flex flex-col items-end">
                    <span>最低价 / 支撑位 (¥)</span>
                    <span className="text-[10px] font-normal text-emerald-600 font-mono">
                      {rangeMode === 'kline_120d' ? '60日Low最小值(前复权)' : rangeMode === 'ma120_sr' ? 'MA120支撑位' : `下限 (-${rangePercent}%)`}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right font-bold text-rose-600 bg-rose-50/50">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('gridStepPercent')}
                    className="flex flex-col items-end ml-auto hover:text-rose-800 transition-colors"
                    title="点击按网格间距(%)排序"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>网格间距 (%)</span>
                      {gridSortField === 'gridStepPercent' && (
                        <span className="font-mono text-[10px]">
                          {gridSortDirection === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-normal text-rose-500 font-mono">
                      {roundToHalf ? '0.5%倍数' : '浮点值'}
                    </span>
                  </button>
                </th>
                <th className="py-3 px-3 text-right">单格差价</th>
                <th className="py-3 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('gridCount')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors mx-auto"
                    title="点击按预估总格数排序"
                  >
                    <span>预估总格数</span>
                    {gridSortField === 'gridCount' && (
                      <span className="font-mono text-[10px] text-rose-600">
                        {gridSortDirection === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGridItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    没有找到符合条件的ETF标的
                  </td>
                </tr>
              ) : (
                filteredGridItems.map((item, idx) => {
                  const originalEtf = etfById.get(item.id);
                  const isSelected = !!originalEtf?.selected;
                  const low60 = originalEtf?.low60d || originalEtf?.low120d || originalEtf?.low || 0;
                  const isTouchLow = low60 > 0 && item.price <= low60 * 1.0501;
                  const lowDiffPct = low60 > 0 ? (((item.price - low60) / low60) * 100).toFixed(1) : '0.0';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* 选择框 */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleSelect(item.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* 序号 */}
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>

                      {/* 基金名称与代码 */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {item.isCustomized && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-100 text-amber-800">
                              自定义
                            </span>
                          )}
                          {dedupeSimilarOnly && (similarGroupCounts[item.id] ?? 1) > 1 && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                              title={`已开启「同类只显1只」，此标的代表同类 ${similarGroupCounts[item.id]} 只ETF`}
                            >
                              同类共{similarGroupCounts[item.id]}只·代表
                            </span>
                          )}
                          {isTouchLow && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200"
                              title={`当前价距60日低点 ¥${low60.toFixed(3)} 仅 +${lowDiffPct}%`}
                            >
                              低位 +{lowDiffPct}%
                            </span>
                          )}
                          {originalEtf?.isAboveHistoricalAvg && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              放量
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">{item.code}</div>
                      </td>

                      {/* 类别 */}
                      <td className="py-2.5 px-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          {item.category}
                        </span>
                      </td>

                      {/* 基金规模 */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100/90 font-medium whitespace-nowrap">
                          {originalEtf?.scaleText || (originalEtf?.scaleAmount ? `约${originalEtf.scaleAmount}亿` : '--')}
                        </span>
                      </td>

                      {/* 参考现价 */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ¥{item.price.toFixed(3)}
                      </td>

                      {/* 基准价 */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/30">
                        <div>¥{item.basePrice.toFixed(3)}</div>
                        {item.ma120 && (
                          <div className="text-[10px] font-normal text-slate-400 font-sans" title="120日移动平均线(半年线)">
                            MA120: {item.ma120.toFixed(3)}
                          </div>
                        )}
                      </td>

                      {/* 网格最高价 (上限 / 压力位) */}
                      <td
                        className="py-2.5 px-3 text-right font-mono font-bold text-red-600 bg-red-50/30 cursor-help"
                        title={
                          item.isCustomized
                            ? `网格最高价：¥${item.highPrice.toFixed(3)}（已自定义）`
                            : item.resistanceType
                            ? `网格最高价（压力位）：¥${item.highPrice.toFixed(3)}（${item.resistanceType}）`
                            : rangeMode === 'percent_range'
                            ? `网格最高价：¥${item.highPrice.toFixed(3)}（基准价 ¥${item.basePrice.toFixed(3)} × (1 + ${rangePercent}%)）`
                            : `网格最高价：¥${item.highPrice.toFixed(3)}（近120日K线最高）`
                        }
                      >
                        <div className="flex flex-col items-end">
                          <span>¥{item.highPrice.toFixed(3)}</span>
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            {item.resistanceType && !item.isCustomized && (
                              <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-red-100 text-red-700 font-sans whitespace-nowrap">
                                {item.resistanceType}
                              </span>
                            )}
                            <span className="text-[10px] font-normal text-red-500 font-sans">
                              {item.isCustomized
                                ? '自定义'
                                : `+${(((item.highPrice - item.basePrice) / item.basePrice) * 100).toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 网格最低价 (下限 / 支撑位) */}
                      <td
                        className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30 cursor-help"
                        title={
                          item.isCustomized
                            ? `网格最低价：¥${item.lowPrice.toFixed(3)}（已自定义）`
                            : item.supportType
                            ? `网格最低价（支撑位）：¥${item.lowPrice.toFixed(3)}（${item.supportType}）`
                            : rangeMode === 'percent_range'
                            ? `网格最低价：¥${item.lowPrice.toFixed(3)}（基准价 ¥${item.basePrice.toFixed(3)} × (1 - ${rangePercent}%)）`
                            : `网格最低价：¥${item.lowPrice.toFixed(3)}（近120日K线最低）`
                        }
                      >
                        <div className="flex flex-col items-end">
                          <span>¥{item.lowPrice.toFixed(3)}</span>
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            {item.supportType && !item.isCustomized && (
                              <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans whitespace-nowrap">
                                {item.supportType}
                              </span>
                            )}
                            <span className="text-[10px] font-normal text-emerald-600 font-sans">
                              {item.isCustomized
                                ? '自定义'
                                : `${(((item.lowPrice - item.basePrice) / item.basePrice) * 100).toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 网格间距(%) */}
                      <td className="py-2.5 px-3 text-right bg-rose-50/30">
                        <div className="flex flex-col items-end">
                          <div className="font-mono font-extrabold text-rose-600 text-sm flex items-center gap-1">
                            <span>
                              {item.gridStepPercent % 0.5 === 0
                                ? item.gridStepPercent.toFixed(1)
                                : item.gridStepPercent.toFixed(2)}
                              %
                            </span>
                            {item.isHalfMultiple && (
                              <span
                                className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200"
                                title="已按实盘规范对齐为0.5%的整数倍"
                              >
                                0.5x
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.rawStepPercent && item.rawStepPercent !== item.gridStepPercent ? (
                              <span title={`ATR原始测算间距: ${item.rawStepPercent}%`}>
                                ATR: {item.rawStepPercent}%
                              </span>
                            ) : (
                              `${item.atrMultiplier.toFixed(1)}×ATR`
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 单格差价 */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ¥{item.gridStepPrice.toFixed(3)}
                      </td>

                      {/* 预估总格数 */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.gridCount} 格
                        </span>
                      </td>

                      {/* 操作 */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectLadderItem(item)}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="查看买卖档位阶梯详情"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="手动修改参数"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {item.isCustomized && (
                            <button
                              type="button"
                              onClick={() => handleResetSingle(item.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="重置为自动ATR计算"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 底部小提示 */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              根据ATR设计的网格间距，充分契合ETF不同资产的波动属性；点击
              <strong className="text-slate-700 font-semibold">「导出网格参数图片」</strong>
              即可导出包含基金名称、代码、最高价、最低价、基准价、间距(%)的标准配置长图。
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-400 shrink-0">
            共 {filteredGridItems.length} 只标的
          </div>
        </div>
      </div>

      {/* 弹窗1：单独编辑标的参数 */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  编辑网格参数 · {editingItem.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  代码: {editingItem.code} | 参考现价: ¥{editingItem.price.toFixed(3)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  基准价 (¥)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={editForm.basePrice}
                    onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({ ...editForm, basePrice: editingItem.price.toFixed(3) })
                    }
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                  >
                    设为现价
                  </button>
                </div>
              </div>

              {/* 历史压力位与支撑位 (MA120半年线) 快捷填入卡片 */}
              {(editingItem.resistancePrice || editingItem.supportPrice || editingItem.ma120) && (
                <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-rose-950 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      技术分析参考（MA120半年线与波段支撑/压力）:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const r = editingItem.resistancePrice || editingItem.highPrice;
                        const s = editingItem.supportPrice || editingItem.lowPrice;
                        if (r && s) {
                          setEditForm((prev) => ({
                            ...prev,
                            highPrice: r.toFixed(3),
                            lowPrice: s.toFixed(3),
                          }));
                        }
                      }}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors shadow-xs"
                    >
                      一键填入压力与支撑位
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] pt-0.5">
                    <div className="bg-white/90 p-1.5 rounded border border-rose-100">
                      <div className="text-slate-400">MA120 (半年线)</div>
                      <div className="font-mono font-bold text-slate-800">
                        {editingItem.ma120 ? `¥${editingItem.ma120.toFixed(3)}` : '--'}
                      </div>
                    </div>
                    <div className="bg-white/90 p-1.5 rounded border border-red-100">
                      <div className="text-red-500 flex items-center justify-between">
                        <span>压力位(网格上限)</span>
                      </div>
                      <div className="font-mono font-bold text-red-600">
                        {editingItem.resistancePrice ? `¥${editingItem.resistancePrice.toFixed(3)}` : '--'}
                      </div>
                      {editingItem.resistanceType && (
                        <div className="text-[9px] text-red-400 truncate">{editingItem.resistanceType}</div>
                      )}
                    </div>
                    <div className="bg-white/90 p-1.5 rounded border border-emerald-100">
                      <div className="text-emerald-600 flex items-center justify-between">
                        <span>支撑位(网格下限)</span>
                      </div>
                      <div className="font-mono font-bold text-emerald-700">
                        {editingItem.supportPrice ? `¥${editingItem.supportPrice.toFixed(3)}` : '--'}
                      </div>
                      {editingItem.supportType && (
                        <div className="text-[9px] text-emerald-500 truncate">{editingItem.supportType}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-red-600">
                      最高价 (¥) [网格上限 / 压力位]
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={editForm.highPrice}
                    onChange={(e) => setEditForm({ ...editForm, highPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg font-mono focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">快速设置:</span>
                    {editingItem.high120d && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            highPrice: editingItem.high120d!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold rounded border border-indigo-300 transition-colors"
                        title="取120日内日K线High最大值（前复权）"
                      >
                        120日High(¥{editingItem.high120d.toFixed(3)})
                      </button>
                    )}
                    {editingItem.resistancePrice && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            highPrice: editingItem.resistancePrice!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded border border-red-300 transition-colors"
                        title="填入根据MA120半年线计算的历史压力位"
                      >
                        压力位(¥{editingItem.resistancePrice.toFixed(3)})
                      </button>
                    )}
                    {editingItem.ma120 && editingItem.ma120 > editingItem.basePrice && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            highPrice: editingItem.ma120!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors font-mono"
                        title="直接取MA120半年线作为网格最高价"
                      >
                        MA120(¥{editingItem.ma120.toFixed(3)})
                      </button>
                    )}
                    {[15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const bp = parseFloat(editForm.basePrice) || editingItem.basePrice;
                          setEditForm((prev) => ({
                            ...prev,
                            highPrice: (bp * (1 + pct / 100)).toFixed(3),
                          }));
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 transition-colors"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-emerald-700">
                      最低价 (¥) [网格下限 / 支撑位]
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={editForm.lowPrice}
                    onChange={(e) => setEditForm({ ...editForm, lowPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">快速设置:</span>
                    {(editingItem.low60d || editingItem.low120d) && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            lowPrice: (editingItem.low60d || editingItem.low120d)!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-2xs transition-colors"
                        title="取60日内日K线Low最小值（近1季底部，前复权）"
                      >
                        60日Low(¥{(editingItem.low60d || editingItem.low120d)!.toFixed(3)})
                      </button>
                    )}
                    {editingItem.low120d && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            lowPrice: editingItem.low120d!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold rounded border border-indigo-300 transition-colors"
                        title="取120日内日K线Low最小值（半年极值，前复权）"
                      >
                        120日Low(¥{editingItem.low120d.toFixed(3)})
                      </button>
                    )}
                    {editingItem.supportPrice && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            lowPrice: editingItem.supportPrice!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded border border-emerald-300 transition-colors"
                        title="填入根据MA120半年线计算的历史支撑位"
                      >
                        支撑位(¥{editingItem.supportPrice.toFixed(3)})
                      </button>
                    )}
                    {editingItem.ma120 && editingItem.ma120 < editingItem.basePrice && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            lowPrice: editingItem.ma120!.toFixed(3),
                          }))
                        }
                        className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors font-mono"
                        title="直接取MA120半年线作为网格最低价"
                      >
                        MA120(¥{editingItem.ma120.toFixed(3)})
                      </button>
                    )}
                    {[15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const bp = parseFloat(editForm.basePrice) || editingItem.basePrice;
                          setEditForm((prev) => ({
                            ...prev,
                            lowPrice: (bp * (1 - pct / 100)).toFixed(3),
                          }));
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 transition-colors"
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 快捷一键填入K线高低点 (前复权) */}
              {(editingItem.high120d || editingItem.high60d) && (editingItem.low60d || editingItem.low120d) && (
                <div className="flex items-center justify-between bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200">
                  <div className="text-[11px] text-indigo-900 font-medium flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      前复权(QFQ)真实走势技术位:
                    </span>
                    <span className="text-[10px] text-indigo-700">
                      120日High最大值: <strong className="font-mono text-red-600">¥{(editingItem.high120d || editingItem.high60d)!.toFixed(3)}</strong>
                      <span className="mx-1.5 text-slate-300">|</span>
                      60日Low最小值: <strong className="font-mono text-emerald-700">¥{(editingItem.low60d || editingItem.low120d)!.toFixed(3)}</strong>
                      {editingItem.low120d && editingItem.low60d && editingItem.low120d !== editingItem.low60d && (
                        <>
                          <span className="mx-1.5 text-slate-300">|</span>
                          120日Low: <span className="font-mono text-slate-500">¥{editingItem.low120d.toFixed(3)}</span>
                        </>
                      )}
                      {editingItem.ma120 && (
                        <>
                          <span className="mx-1.5 text-slate-300">|</span>
                          MA120均线: <strong className="font-mono text-slate-800">¥{editingItem.ma120.toFixed(3)}</strong>
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const h = editingItem.high120d || editingItem.high60d;
                      const l = editingItem.low60d || editingItem.low120d;
                      if (h && l) {
                        setEditForm({
                          ...editForm,
                          highPrice: h.toFixed(3),
                          lowPrice: l.toFixed(3),
                        });
                      }
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors shrink-0"
                  >
                    一键填入(120高/60低)
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-rose-600 flex items-center gap-1.5">
                    <span>网格间距 (%)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                      实盘建议0.5%倍数
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    ATR参考: {editingItem.atrPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="20.0"
                    required
                    value={editForm.gridStepPercent}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gridStepPercent: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-rose-200 rounded-lg font-mono font-bold text-rose-600 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(editForm.gridStepPercent);
                      if (!isNaN(val)) {
                        setEditForm({
                          ...editForm,
                          gridStepPercent: roundToHalfStep(val).toFixed(1),
                        });
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                    title="将当前输入值快速对齐到最近的0.5%整数倍"
                  >
                    对齐0.5%倍数
                  </button>
                </div>

                {/* 快捷常用 0.5% 步长选项 */}
                <div className="mt-2.5">
                  <div className="text-[10px] text-slate-500 font-medium mb-1">
                    快捷倍数选择（0.5%步长）：
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((stepVal) => {
                      const isCur =
                        Math.abs(parseFloat(editForm.gridStepPercent) - stepVal) < 0.001;
                      return (
                        <button
                          key={stepVal}
                          type="button"
                          onClick={() =>
                            setEditForm({ ...editForm, gridStepPercent: stepVal.toFixed(1) })
                          }
                          className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-all ${
                            isCur
                              ? 'bg-rose-600 text-white shadow-2xs scale-105'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                          }`}
                        >
                          {stepVal.toFixed(1)}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                  券商网格条件单（华泰、银河、国金等）建议设置为 0.5% 的整数倍，便于委托单精准挂单与快速撮合。
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  保存参数
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗2：网格阶梯档位详情预览 */}
      {inspectLadderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {inspectLadderItem.name} ({inspectLadderItem.code})
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                    网格间距 {inspectLadderItem.gridStepPercent}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  基准: ¥{inspectLadderItem.basePrice.toFixed(3)} | 上限: ¥{inspectLadderItem.highPrice.toFixed(3)} | 下限: ¥{inspectLadderItem.lowPrice.toFixed(3)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectLadderItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1 text-xs">
              <div className="text-[11px] font-medium text-slate-400 pb-1 flex items-center justify-between">
                <span>档位</span>
                <span>触发价格</span>
                <span>相对基准幅度</span>
              </div>
              {generateGridLadder(inspectLadderItem).map((lvl) => {
                const isBase = lvl.type === 'base';
                const isSell = lvl.type === 'sell';

                return (
                  <div
                    key={lvl.label}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg font-mono ${
                      isBase
                        ? 'bg-slate-900 text-white font-bold'
                        : isSell
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isBase ? 'bg-amber-400' : isSell ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-semibold">{lvl.label}</span>
                    </div>

                    <div className="font-bold text-sm">
                      ¥{lvl.price.toFixed(3)}
                    </div>

                    <div className="text-[11px]">
                      {lvl.changeFromBasePercent > 0 ? '+' : ''}
                      {lvl.changeFromBasePercent}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500">
                共测算得出 <strong className="text-slate-900">{inspectLadderItem.gridCount}</strong> 档委托价位
              </span>
              <button
                type="button"
                onClick={() => setInspectLadderItem(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
