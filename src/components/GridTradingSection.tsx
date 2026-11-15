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

interface GridTradingSectionProps {
  etfs: EtfItem[];
  atrPeriod: AtrPeriod;
  onPeriodChange: (p: AtrPeriod) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
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
  const [selectedCategory, setSelectedCategory] = useState<EtfCategory>('全部');
  const [onlyShowSelected, setOnlyShowSelected] = useState<boolean>(false); // 是否仅看已勾选

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

  // 计算所有标的的网格参数（支持近120日K线实际高低价或百分比箱体，以及0.5%倍数对齐）
  const gridItems = useMemo(() => {
    return etfs.map((etf) => {
      const override = customOverrides[etf.id];
      return calculateGridItem(etf, atrMultiplier, rangePercent, override, roundToHalf, rangeMode);
    });
  }, [etfs, atrMultiplier, rangePercent, customOverrides, roundToHalf, rangeMode]);

  // 筛选标的
  const filteredGridItems = useMemo(() => {
    return gridItems.filter((item) => {
      if (onlyShowSelected) {
        const originalEtf = etfs.find((e) => e.id === item.id);
        if (!originalEtf?.selected) return false;
      }
      const matchCat =
        selectedCategory === '全部' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [gridItems, selectedCategory, searchQuery, onlyShowSelected, etfs]);

  // 统计概览
  const stats = useMemo(() => {
    if (gridItems.length === 0) {
      return { avgStep: '0.0', avgCount: 0, minStep: '0.0', maxStep: '0.0' };
    }
    const sumStep = gridItems.reduce((acc, c) => acc + c.gridStepPercent, 0);
    const avgStep = (sumStep / gridItems.length).toFixed(1);
    const steps = gridItems.map((g) => g.gridStepPercent);
    const minStep = Math.min(...steps).toFixed(1);
    const maxStep = Math.max(...steps).toFixed(1);
    const avgCount = Math.round(
      gridItems.reduce((acc, c) => acc + c.gridCount, 0) / gridItems.length
    );
    return { avgStep, avgCount, minStep, maxStep };
  }, [gridItems]);

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
                  title={`仅导出在板块二选中的 ${selectedCount} 只 ETF 网格参数`}
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
                  onClick={() => onOpenExportGrid(gridItems, false)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-rose-100 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 rounded-r-xl border-l border-rose-500/50 transition-colors"
                  title="导出全部ETF网格参数"
                >
                  <span>全部({gridItems.length})</span>
                </button>
              </div>
            ) : (
              <button
                id="export-grid-btn"
                type="button"
                onClick={() => onOpenExportGrid(gridItems, false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all hover:shadow-md hover:shadow-rose-200"
                title="未勾选特定标的时默认导出全部，您也可在左侧勾选特定ETF后再导出"
              >
                <Download className="w-4 h-4" />
                <span>导出网格参数图片</span>
                <span className="text-[10px] bg-rose-700/80 px-1.5 py-0.5 rounded text-rose-100 font-normal">
                  全部 {gridItems.length} 只
                </span>
              </button>
            )}
          </div>
        </div>

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
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* 类别标签 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
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
              title="仅筛选显示在板块一或此表勾选的标的"
            >
              仅看已勾选 ({selectedCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索代码 / 名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white w-36 sm:w-44"
            />
          </div>

          <button
            type="button"
            onClick={selectedCount === etfs.length ? onDeselectAll : onSelectAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            {selectedCount === etfs.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{selectedCount === etfs.length ? '取消全选' : `全选标的 (${selectedCount})`}</span>
          </button>
        </div>
      </div>

      {/* 核心：已勾选标的专属高亮操作条，提供一键导出选中的ETF图片与CSV */}
      {selectedCount > 0 && (
        <div className="bg-rose-50/90 border border-rose-200/90 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="font-bold text-rose-950 text-xs">
              已选中 <span className="text-rose-600 font-mono text-sm">{selectedCount}</span> 只 ETF 标的
            </span>
            <span className="text-slate-500 text-[11px] hidden md:inline">
              · 可针对性导出这 {selectedCount} 只标的的网格参数长图或下载表格
            </span>
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
              onClick={handleExportSelectedCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="下载选中标的的网格参数Excel/CSV表格"
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
              <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-10">选择</th>
                <th className="py-3 px-2 text-center w-8">#</th>
                <th className="py-3 px-3">基金名称 / 代码</th>
                <th className="py-3 px-2">行业类别</th>
                <th className="py-3 px-2.5 text-center">基金规模</th>
                <th className="py-3 px-3 text-right">参考现价(¥)</th>
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
                  <div className="flex flex-col items-end">
                    <span>网格间距 (%)</span>
                    <span className="text-[10px] font-normal text-rose-500 font-mono">
                      {roundToHalf ? '0.5%倍数' : '浮点值'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">单格差价</th>
                <th className="py-3 px-2 text-center">预估总格数</th>
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
                  const originalEtf = etfs.find((e) => e.id === item.id);
                  const isSelected = !!originalEtf?.selected;

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
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {item.isCustomized && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-100 text-amber-800">
                              自定义
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
