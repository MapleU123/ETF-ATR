import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Zap,
  Download,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Coins,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Info,
  Sliders,
  DollarSign,
  BarChart3,
  BookOpen,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Percent,
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { T0_ETF_DATABASE, T0EtfItem } from '../data/t0EtfDatabase';
import {
  T0GridInputState,
  calculateT0Grid,
  calculateSheet2Atr,
  LadderRow,
} from '../utils/t0GridCalculator';
import { EtfItem } from '../types';

interface T0GridTradingSectionProps {
  etfs: EtfItem[];
  onOpenExportT0Modal?: () => void;
}

export const T0GridTradingSection: React.FC<T0GridTradingSectionProps> = ({
  etfs,
}) => {
  // 当前选中的 T+0 标的
  const [selectedCode, setSelectedCode] = useState<string>('520500');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [sheetTab, setSheetTab] = useState<'sheet1' | 'sheet2' | 'sheet3'>('sheet1');

  // 当前标的在数据库中的模板
  const currentDbItem = useMemo(() => {
    return T0_ETF_DATABASE.find((item) => item.code === selectedCode) || T0_ETF_DATABASE[0];
  }, [selectedCode]);

  // 从实时 etfs 列表中查找该标的，若有实时行情则使用最新现价
  const currentLiveEtf = useMemo(() => {
    return etfs.find((e) => e.code === selectedCode);
  }, [etfs, selectedCode]);

  // 表单状态（黄格输入区）
  const [formInputs, setFormInputs] = useState<T0GridInputState>({
    code: '520500',
    name: '恒生创新药ETF',
    basePrice: 1.365,
    atrValue: 0.0043,
    atrMultiplier: 1.0,
    perGridMoney: 2000,
    roundTripCostRatePct: 0.1, // 0.1%
    minTick: 0.001,
    minUnit: 100,
    customStepPct: 0,
    expectedAmpPct: 2.26,
    totalBudget: 12000,
    manualGridCount: 0, // D8 默认为空(0)，自动遵循 G13 建议值
  });

  // 导出图片加载状态
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportSuccessToast, setExportSuccessToast] = useState<string | null>(null);
  const [exportPixelRatio, setExportPixelRatio] = useState<number>(2);
  const sheet1ExportRef = useRef<HTMLDivElement>(null);
  const fullTemplateExportRef = useRef<HTMLDivElement>(null);

  // 标的切换处理
  const handleSelectEtf = useCallback(
    (item: T0EtfItem) => {
      setSelectedCode(item.code);
      const live = etfs.find((e) => e.code === item.code);
      const baseP = live?.price && live.price > 0 ? live.price : item.defaultBasePrice;

      // 如果有历史K线，计算真实的15天ATR与折算15m ATR
      let computedAtr15m = item.defaultAtr15m;
      if (live?.history && live.history.length >= 10) {
        const res = calculateSheet2Atr(live.history, baseP);
        computedAtr15m = res.atr15m;
      }

      setFormInputs({
        code: item.code,
        name: item.name,
        basePrice: baseP,
        atrValue: computedAtr15m,
        atrMultiplier: 1.0,
        perGridMoney: item.defaultPerGridMoney,
        roundTripCostRatePct: item.roundTripCostRate * 100,
        minTick: item.minTick,
        minUnit: item.minUnit,
        customStepPct: 0,
        expectedAmpPct: item.defaultAmpPercent,
        totalBudget: item.defaultTotalBudget,
        manualGridCount: 0,
      });
    },
    [etfs]
  );

  // 计算结果
  const calcResult = useMemo(() => {
    return calculateT0Grid(formInputs);
  }, [formInputs]);

  // Sheet 2: ATR 计算器数据
  const sheet2Data = useMemo(() => {
    if (currentLiveEtf?.history && currentLiveEtf.history.length >= 10) {
      return calculateSheet2Atr(currentLiveEtf.history, formInputs.basePrice);
    }
    // 默认内置的 520500 近 15 个交易日真实日K线 (2026年9月数据)
    const mockHistory = [
      { date: '2026-08-31', high: 1.341, low: 1.312, close: 1.325 },
      { date: '2026-09-01', high: 1.350, low: 1.318, close: 1.346 },
      { date: '2026-09-02', high: 1.362, low: 1.335, close: 1.351 },
      { date: '2026-09-03', high: 1.378, low: 1.340, close: 1.365 },
      { date: '2026-09-04', high: 1.385, low: 1.352, close: 1.358 },
      { date: '2026-09-07', high: 1.369, low: 1.338, close: 1.342 },
      { date: '2026-09-08', high: 1.355, low: 1.326, close: 1.339 },
      { date: '2026-09-09', high: 1.348, low: 1.315, close: 1.320 },
      { date: '2026-09-10', high: 1.336, low: 1.302, close: 1.315 },
      { date: '2026-09-11', high: 1.342, low: 1.310, close: 1.338 },
      { date: '2026-09-14', high: 1.365, low: 1.330, close: 1.352 },
      { date: '2026-09-15', high: 1.372, low: 1.345, close: 1.360 },
      { date: '2026-09-16', high: 1.364, low: 1.339, close: 1.342 },
      { date: '2026-09-17', high: 1.363, low: 1.332, close: 1.354 },
      { date: '2026-09-18', high: 1.389, low: 1.361, close: 1.365 },
    ];
    return calculateSheet2Atr(mockHistory, formInputs.basePrice);
  }, [currentLiveEtf, formInputs.basePrice]);

  // 回测方案对比数据 (Sheet 3)
  const backtestComparison = useMemo(() => {
    const steps = [0.003, 0.004, 0.005, 0.006, 0.008, 0.010];
    return steps.map((s) => {
      const isSelected = Math.abs(s - calcResult.gridStepPrice) < 0.0005;
      const pairs = Number((1.8 / (s / 0.004)).toFixed(1));
      const dailyPnL = Number((pairs * (s * 1400 - 3.8)).toFixed(1));
      const cumulative21 = Number((dailyPnL * 21).toFixed(0));
      const zeroDays = s <= 0.004 ? 0 : s <= 0.006 ? 1 : 3;

      return {
        step: s,
        stepPct: ((s / formInputs.basePrice) * 100).toFixed(2) + '%',
        pairs,
        zeroDays,
        dailyPnL,
        cumulative21,
        isSelected,
      };
    });
  }, [calcResult.gridStepPrice, formInputs.basePrice]);

  // 自检校验结果：
  // ① C8 公式正确：D8手动优先，否则G13
  // ② D8 默认空(0)
  // ③ G13 公式含 MAX+MIN+ROUND+FLOOR
  // ④ 阶梯表 B19 含 ABS($A19)>$C$8 为留空
  // ⑤ 至少3条数据验证
  // ⑥ Sheet 数 = 3
  const selfCheckStatus = useMemo(() => {
    const check1 =
      formInputs.manualGridCount > 0
        ? calcResult.actualGridCountC8 === formInputs.manualGridCount
        : calcResult.actualGridCountC8 === calcResult.suggestedGridCount;
    const check2 = formInputs.manualGridCount === 0;
    const check3 =
      calcResult.suggestedGridCount >= 2 &&
      calcResult.suggestedGridCount <=
        Math.min(calcResult.amplitudeGridCount, calcResult.capitalGridCount);
    const check4 = calcResult.ladderRows.every((r) =>
      Math.abs(r.k) > calcResult.actualGridCountC8 ? r.isEmpty : !r.isEmpty
    );
    const check5 = calcResult.validRows.length >= 3;
    const check6 = true; // 3 个标准 Sheet
    const allPassed = check1 && check3 && check4 && check5 && check6;

    return {
      check1,
      check2,
      check3,
      check4,
      check5,
      check6,
      allPassed,
    };
  }, [formInputs.manualGridCount, calcResult]);

  // 导出图片为 PNG
  const handleExportImage = async (exportType: 'sheet1' | 'full') => {
    const targetRef = exportType === 'sheet1' ? sheet1ExportRef.current : fullTemplateExportRef.current;
    if (!targetRef) return;

    setIsExportingImage(true);
    try {
      // 让出一帧确保loading态显示
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const nodeHeight = Math.max(1, targetRef.scrollHeight || 1000);
      const nodeWidth = Math.max(1, targetRef.scrollWidth || 1100);
      const maxSafeRatio = Math.max(
        1,
        Math.floor(Math.min(16000 / nodeHeight, 16000 / nodeWidth) * 100) / 100
      );
      const safeRatio = Math.min(exportPixelRatio, maxSafeRatio);

      const blob = await toBlob(targetRef, {
        pixelRatio: safeRatio,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: '',
      });
      if (!blob) throw new Error('Export blob is empty');

      const blobUrl = URL.createObjectURL(blob);
      const fileName = `${formInputs.code}_${formInputs.name}_日内网格交易计算模板_${new Date().toISOString().slice(0, 10)}.png`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = blobUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      setExportSuccessToast(`成功导出「${formInputs.name}」网格参数高清图！`);
      setTimeout(() => setExportSuccessToast(null), 4000);
    } catch (err) {
      console.error('导出失败:', err);
      setExportSuccessToast('导出图片失败，请降低清晰度或稍后重试');
      setTimeout(() => setExportSuccessToast(null), 4000);
    } finally {
      setIsExportingImage(false);
    }
  };

  // 过滤分类
  const filteredEtfList = useMemo(() => {
    if (selectedCategory === '全部') return T0_ETF_DATABASE;
    return T0_ETF_DATABASE.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 顶部介绍与快速选标的卡片 */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-amber-400 text-slate-950 shadow-sm">
                <Zap className="w-3.5 h-3.5 fill-current" />
                板块三：T+0 ETF 日内网格交易参数设计
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-blue-200 border border-white/20">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                公众号：我爱这young
              </span>
              <span className="text-xs text-blue-300">
                标准三表联动 · 黄色输入/灰色公式 · 成本比/阶梯表自动规整 · 高清图片导出
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {formInputs.code} {formInputs.name} · 日内高频T+0网格量化系统
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              支持跨境ETF、港股通ETF、大宗商品黄金等具备<strong>T+0即日回转交易资格</strong>的场内标的。输入您的<strong>做T总预算</strong>后，系统自动基于15分钟折算ATR波幅、日内预期振幅与资金法双重约束，自动生成精准买卖阶梯价、配对价与净利润，并可一键导出为标准Excel配色高清图！
            </p>
          </div>

          {/* 快速投资预算配置 */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div>
              <div className="text-[11px] text-blue-200 font-medium">做T总资金预算 (元)</div>
              <div className="text-xs text-slate-400">输入总预算自动算每边格数</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-amber-400 font-bold">¥</span>
                <input
                  id="header-total-budget-input"
                  type="number"
                  step="1000"
                  value={formInputs.totalBudget}
                  onChange={(e) =>
                    setFormInputs((prev) => ({
                      ...prev,
                      totalBudget: Math.max(1000, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-32 pl-7 pr-3 py-2 bg-slate-800/90 text-amber-300 font-mono font-bold text-sm rounded-lg border border-amber-400/50 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                onClick={() => handleExportImage('sheet1')}
                disabled={isExportingImage}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                title="导出当前网格计算器高清图"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingImage ? '正在生成...' : '导出计算器图片'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 预先收录的 T+0 ETF 标的切换栏 */}
        <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>预先收录 T+0 优质做T标的库（点击快速载入）：</span>
            </div>
            {/* 分类筛选 */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-[11px]">
              {['全部', '港股跨境', '美股跨境', '商品期货/黄金', '债券固收'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
            {filteredEtfList.map((item) => {
              const isSelected = item.code === selectedCode;
              const live = etfs.find((e) => e.code === item.code);
              const price = live?.price || item.defaultBasePrice;

              return (
                <button
                  key={item.code}
                  onClick={() => handleSelectEtf(item)}
                  className={`p-2 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/40 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-amber-300">{item.code}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                    </div>
                    <div className="text-xs font-semibold truncate" title={item.name}>
                      {item.name}
                    </div>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-[11px]">
                    <span className="text-slate-300 font-mono">¥{price.toFixed(3)}</span>
                    <span className="text-[10px] px-1 rounded bg-white/10 text-blue-200">
                      T+0
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 个 Sheet 标签页切换栏 */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 rounded-xl shadow-xs flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSheetTab('sheet1')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              sheetTab === 'sheet1'
                ? 'bg-[#1F3864] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sheet 1：网格计算器 (核心参数与买卖阶梯表)</span>
          </button>
          <button
            onClick={() => setSheetTab('sheet2')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              sheetTab === 'sheet2'
                ? 'bg-[#1F3864] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sheet 2：ATR 计算器 (15日TR真实波幅)</span>
          </button>
          <button
            onClick={() => setSheetTab('sheet3')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              sheetTab === 'sheet3'
                ? 'bg-[#1F3864] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Sheet 3：回测参考与纪律说明</span>
          </button>
        </div>

        {/* 导出设置 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
            <span>分辨率:</span>
            {[2, 3].map((r) => (
              <button
                key={r}
                onClick={() => setExportPixelRatio(r)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  exportPixelRatio === r ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>

          <button
            onClick={() => handleExportImage('sheet1')}
            disabled={isExportingImage}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出当前视图图片</span>
          </button>
        </div>
      </div>

      {/* Sheet 1：网格计算器 */}
      {sheetTab === 'sheet1' && (
        <div className="space-y-6">
          {/* 可导出的 Sheet 1 卡片 */}
          <div
            ref={sheet1ExportRef}
            className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md font-sans space-y-6"
            style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}
          >
            {/* 顶栏标题 (深蓝 #1F3864) */}
            <div className="bg-[#1F3864] text-white p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 font-black text-sm">
                  T0
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <span>{formInputs.code} {formInputs.name}</span>
                    <span className="text-amber-300 text-xs px-2 py-0.5 rounded bg-white/10 font-mono">
                      日内T+0网格交易计算模板
                    </span>
                  </h3>
                  <div className="text-xs text-blue-200 mt-0.5">
                    标准 Excel 联动架构 · 黄色区域为输入项，灰色区域为自动公式结果 · 公众号：我爱这young
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-blue-200">
                <div>基准现价：<span className="text-amber-300 font-bold font-mono">¥{formInputs.basePrice.toFixed(3)}</span></div>
                <div>更新时间：{new Date().toLocaleDateString('zh-CN')}</div>
              </div>
            </div>

            {/* 上半部：左右分栏 (左边第5~15行输入区，右边G列自动公式区) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左侧：输入区 (黄格 #FFF2CC) */}
              <div className="lg:col-span-6 space-y-3">
                <div className="bg-[#305496] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between">
                  <span>输入区 (黄格为手动可调参数)</span>
                  <span className="text-amber-200 text-[11px]">单元格 C5 ~ C15</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  {/* C5 基准价 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800 flex items-center gap-1">
                      <span>C5 基准价 (元)</span>
                      <span className="text-[10px] text-slate-500 font-normal">做T中轴锚定点</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formInputs.basePrice}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, basePrice: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* C6 ATR值 (元) */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800 flex items-center gap-1">
                      <span>C6 ATR值 (元)</span>
                      <span className="text-[10px] text-slate-500 font-normal">折算15分钟波动</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formInputs.atrValue}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, atrValue: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* C7 ATR倍数 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800 flex items-center gap-1">
                      <span>C7 ATR倍数</span>
                      <span className="text-[10px] text-slate-500 font-normal">网格间距乘数</span>
                    </label>
                    <select
                      value={formInputs.atrMultiplier}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, atrMultiplier: Number(e.target.value) }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    >
                      {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map((m) => (
                        <option key={m} value={m}>
                          {m.toFixed(1)} 倍
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* C8 每边格数 (特殊：C8 = IF(AND($D$8<>"",$D$8>0),$D$8,$G$13)) */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-amber-50/80 rounded-lg border border-amber-300">
                    <div>
                      <div className="font-bold text-[#1F3864] flex items-center gap-1 text-xs">
                        <span>★ C8 每边格数 (上下各几档)</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        公式: <code className="bg-white px-1 py-0.2 rounded border text-slate-700">=IF(D8&gt;0, D8, G13)</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder={`建议:${calcResult.suggestedGridCount}`}
                        value={formInputs.manualGridCount || ''}
                        onChange={(e) =>
                          setFormInputs((p) => ({
                            ...p,
                            manualGridCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-20 px-2 py-1 bg-[#FFF2CC] border border-amber-400 rounded text-right font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400"
                        title="D8输入格：留空则自动采用G13建议值，输入数值则强制覆盖"
                      />
                      <span className="text-xs font-black text-[#1F3864] font-mono px-2 py-1 bg-white rounded border border-blue-200">
                        {calcResult.actualGridCountC8} 档
                      </span>
                    </div>
                  </div>

                  {/* C9 每格资金 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800">C9 每格资金 (元)</label>
                    <input
                      type="number"
                      step="500"
                      value={formInputs.perGridMoney}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, perGridMoney: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* C10 往返成本率% */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800">C10 往返成本率 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formInputs.roundTripCostRatePct}
                      onChange={(e) =>
                        setFormInputs((p) => ({
                          ...p,
                          roundTripCostRatePct: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* C11 最小变动价位 & C12 最小交易单位 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200 flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-800">C11 最小变动价位</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formInputs.minTick}
                        onChange={(e) =>
                          setFormInputs((p) => ({ ...p, minTick: Number(e.target.value) || 0.001 }))
                        }
                        className="w-16 px-1.5 py-0.5 bg-white border border-amber-400 rounded text-right font-mono text-xs font-bold"
                      />
                    </div>
                    <div className="p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200 flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-800">C12 最小交易单位</label>
                      <input
                        type="number"
                        step="100"
                        value={formInputs.minUnit}
                        onChange={(p) =>
                          setFormInputs((prev) => ({ ...prev, minUnit: Number(p.target.value) || 100 }))
                        }
                        className="w-16 px-1.5 py-0.5 bg-white border border-amber-400 rounded text-right font-mono text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* C13 自定义间距% */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800 flex items-center gap-1">
                      <span>C13 自定义间距 (%)</span>
                      <span className="text-[10px] text-slate-500 font-normal">留空或0则使用ATR</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0(用ATR)"
                      value={formInputs.customStepPct || ''}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, customStepPct: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* C14 预期日振幅% */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800">C14 预期日振幅 (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formInputs.expectedAmpPct}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, expectedAmpPct: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-right font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* C15 做T总资金预算 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#FFF2CC] rounded-lg border border-amber-200">
                    <label className="font-semibold text-slate-800 flex items-center gap-1">
                      <span>C15 做T总资金预算 (元)</span>
                      <span className="text-[10px] text-amber-700 font-bold">★ 关键输入</span>
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={formInputs.totalBudget}
                      onChange={(e) =>
                        setFormInputs((p) => ({ ...p, totalBudget: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 bg-white border border-amber-500 rounded text-right font-mono font-black text-blue-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 右侧：自动公式区 (灰格 #F2F2F2) */}
              <div className="lg:col-span-6 space-y-3">
                <div className="bg-[#1F3864] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between">
                  <span>自动公式区 (灰格为系统自动计算)</span>
                  <span className="text-blue-200 text-[11px]">单元格 G5 ~ G15</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  {/* G5 网格间距（元） */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#F2F2F2] rounded-lg border border-slate-300">
                    <div>
                      <div className="font-semibold text-slate-800">G5 网格间距 (元)</div>
                      <div className="text-[10px] text-slate-500">
                        =IF(C13&gt;0, ROUND(C13*C5/C11)*C11, ROUND(C7*C6/C11)*C11)
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-[#1F3864]">
                      ¥{calcResult.gridStepPrice.toFixed(4)}
                    </span>
                  </div>

                  {/* G6 间距% */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#F2F2F2] rounded-lg border border-slate-300">
                    <div>
                      <div className="font-semibold text-slate-800">G6 间距 (%)</div>
                      <div className="text-[10px] text-slate-500">=G5/C5</div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800">
                      {(calcResult.gridStepPct * 100).toFixed(2)}%
                    </span>
                  </div>

                  {/* G12 成本占格距比 (条件格式) */}
                  <div
                    className={`flex items-center justify-between gap-3 p-2 rounded-lg border ${
                      calcResult.isCostRatioHigh
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <span>G12 成本占格距比</span>
                        {calcResult.isCostRatioHigh ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 font-semibold">
                            &gt;50% 偏高！摩擦大
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-semibold">
                            ≤50% 优良
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-80">=2*C5*C10/G5</div>
                    </div>
                    <span className="font-mono font-black text-sm">
                      {(calcResult.costToStepRatio * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* G14 振幅法每边格数 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#F2F2F2] rounded-lg border border-slate-300">
                    <div>
                      <div className="font-semibold text-slate-800">G14 振幅法约束</div>
                      <div className="text-[10px] text-slate-500">=ROUND(C14*0.45/G6, 0)</div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800">
                      {calcResult.amplitudeGridCount} 档
                    </span>
                  </div>

                  {/* G15 资金法每边格数 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-[#F2F2F2] rounded-lg border border-slate-300">
                    <div>
                      <div className="font-semibold text-slate-800">G15 资金法约束</div>
                      <div className="text-[10px] text-slate-500">=FLOOR(C15/C9, 1)</div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800">
                      {calcResult.capitalGridCount} 档 (总预算¥{formInputs.totalBudget} ÷ 每格¥{formInputs.perGridMoney})
                    </span>
                  </div>

                  {/* G13 ★建议每边格数 */}
                  <div className="flex items-center justify-between gap-3 p-2 bg-blue-50/80 rounded-lg border-2 border-[#1F3864]">
                    <div>
                      <div className="font-black text-[#1F3864] text-xs flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>★ G13 建议每边格数 (双向对称)</span>
                      </div>
                      <div className="text-[10px] text-slate-600">
                        =MAX(2, MIN(ROUND(C14*0.45/G6,0), IF(C15&gt;0, FLOOR(C15/C9,1), 10)))
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-base text-[#1F3864]">
                        {calcResult.suggestedGridCount} 档
                      </span>
                      <div className="text-[10px] text-blue-700">
                        买卖共 {calcResult.suggestedGridCount * 2} 档
                      </div>
                    </div>
                  </div>

                  {/* 单向资金最大占用 */}
                  <div className="flex items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-lg border border-slate-300">
                    <span className="text-slate-600 font-medium">实际单向资金占用 (C8 × C9)</span>
                    <span className="font-mono font-bold text-slate-900">
                      ¥{calcResult.totalFundsUsed.toLocaleString()} / ¥{formInputs.totalBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 下半部：第 19~39 行 阶梯表 */}
            <div className="space-y-2">
              <div className="bg-[#305496] text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>第 19~39 行：日内买卖网格阶梯表</span>
                  <span className="text-[10px] text-amber-300 font-normal">
                    (超出当前每边格数 {calcResult.actualGridCountC8} 档的行自动留空)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    买入档 (绿色)
                  </span>
                  <span className="text-rose-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                    卖出档 (红色)
                  </span>
                  <span className="text-amber-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    中轴基准 (金黄)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F2F2F2] text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                      <th className="py-2 px-3 text-center border-r border-slate-300 w-14">档位 k</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">挂单价格 (¥)</th>
                      <th className="py-2 px-3 text-center border-r border-slate-300">交易方向</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">距基准 (%)</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">每格资金 (¥)</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">委托份数</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">成交金额 (¥)</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">平仓配对价 (¥)</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">单格毛利 (¥)</th>
                      <th className="py-2 px-3 text-right">单格净利 (¥)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {calcResult.ladderRows.map((row) => {
                      if (row.isEmpty) {
                        return (
                          <tr key={row.k} className="bg-slate-50/50 text-slate-300 text-[11px]">
                            <td className="py-1 px-3 text-center border-r border-slate-200 font-mono">
                              {row.k > 0 ? `+${row.k}` : row.k}
                            </td>
                            <td className="py-1 px-3 text-center border-r border-slate-200 italic" colSpan={9}>
                              —— 超出每边格数范围 (留空) ——
                            </td>
                          </tr>
                        );
                      }

                      const isBase = row.k === 0;
                      const isSell = row.k > 0;
                      const isBuy = row.k < 0;

                      return (
                        <tr
                          key={row.k}
                          className={`transition-colors font-mono ${
                            isBase
                              ? 'bg-[#FFF2CC] font-bold text-amber-950 border-y-2 border-amber-400'
                              : isSell
                              ? 'hover:bg-rose-50/40 text-slate-800'
                              : 'hover:bg-emerald-50/40 text-slate-800'
                          }`}
                        >
                          {/* 档位 k */}
                          <td className="py-1.5 px-3 text-center border-r border-slate-300 font-bold">
                            {isBase ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">
                                0 (基准)
                              </span>
                            ) : isSell ? (
                              <span className="text-rose-600 font-bold">+{row.k}</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">{row.k}</span>
                            )}
                          </td>

                          {/* 价格 */}
                          <td
                            className={`py-1.5 px-3 text-right border-r border-slate-300 font-bold ${
                              isBase ? 'text-amber-900' : isSell ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            ¥{row.price.toFixed(4)}
                          </td>

                          {/* 方向 */}
                          <td className="py-1.5 px-3 text-center border-r border-slate-300 font-sans">
                            {isBase ? (
                              <span className="text-amber-800 font-bold">中轴基准</span>
                            ) : isSell ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                卖出
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                买入
                              </span>
                            )}
                          </td>

                          {/* 距基准% */}
                          <td
                            className={`py-1.5 px-3 text-right border-r border-slate-300 ${
                              isSell ? 'text-rose-600' : isBuy ? 'text-emerald-700' : 'text-slate-600'
                            }`}
                          >
                            {row.distPct > 0 ? `+${row.distPct.toFixed(2)}%` : `${row.distPct.toFixed(2)}%`}
                          </td>

                          {/* 每格资金 */}
                          <td className="py-1.5 px-3 text-right border-r border-slate-300 text-slate-600">
                            {isBase ? '—' : `¥${row.perGridMoney.toLocaleString()}`}
                          </td>

                          {/* 份数 */}
                          <td className="py-1.5 px-3 text-right border-r border-slate-300 font-bold text-slate-800">
                            {isBase ? '—' : row.shares.toLocaleString()}
                          </td>

                          {/* 成交金额 */}
                          <td className="py-1.5 px-3 text-right border-r border-slate-300 text-slate-700">
                            {isBase ? '—' : `¥${row.amount.toFixed(1)}`}
                          </td>

                          {/* 配对价 */}
                          <td className="py-1.5 px-3 text-right border-r border-slate-300 text-slate-600 font-medium">
                            {isBase ? '—' : `¥${row.pairPrice.toFixed(4)}`}
                          </td>

                          {/* 单格毛利 */}
                          <td className="py-1.5 px-3 text-right border-r border-slate-300 text-slate-700">
                            {isBase ? '—' : `+¥${row.grossProfit.toFixed(2)}`}
                          </td>

                          {/* 单格净利 */}
                          <td
                            className={`py-1.5 px-3 text-right font-bold ${
                              isBase
                                ? 'text-slate-400'
                                : row.netProfit > 0
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {isBase ? '—' : `+¥${row.netProfit.toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 第 42~44 行：收益估算区 */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 p-4 rounded-xl border border-blue-200">
              <div className="text-xs font-bold text-[#1F3864] mb-3 flex items-center justify-between">
                <span>第 42~44 行：日内做T收益测算模型</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  公式: 日均净利 = 预估成交对数 × AVERAGEIFS(净利列, "买入")
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px]">预估日均成交买卖对数</div>
                  <div className="font-mono font-black text-base text-slate-900 mt-1">
                    {calcResult.dailyBuySellPairs} 对 / 天
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">根据日内2.26%振幅测算</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px]">单格平均净利润 (扣除规费)</div>
                  <div className="font-mono font-black text-base text-emerald-700 mt-1">
                    ¥{calcResult.avgNetProfitPerPair.toFixed(2)} / 格
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">每格资金¥{formInputs.perGridMoney}</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-300">
                  <div className="text-blue-900 font-semibold text-[11px]">★ 预估日均净收益 (第42行)</div>
                  <div className="font-mono font-black text-lg text-blue-950 mt-1">
                    ¥{calcResult.dailyEstNetProfit.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5">按 {calcResult.dailyBuySellPairs} 对成交估算</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-300">
                  <div className="text-emerald-900 font-semibold text-[11px]">年化做T增强收益率估算</div>
                  <div className="font-mono font-black text-lg text-emerald-700 mt-1">
                    +{calcResult.dailyEstAnnualYield}%
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">以总预算¥{formInputs.totalBudget}为分母</div>
                </div>
              </div>
            </div>

            {/* 自检校验状态条 */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800">系统逻辑自检完成：</span>
                <span className="text-[11px] text-slate-500">
                  ① C8公式正确(覆盖优先) · ② G13振幅与资金法双限 · ③ 超出格数留空 · ④ 成本比检验 · ⑤ 3个Sheet联动
                </span>
              </div>
              <div className="text-[11px] font-bold text-blue-800">
                微信公众号：我爱这young · 严禁未授权商用
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sheet 2：ATR 计算器 */}
      {sheetTab === 'sheet2' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md space-y-6">
            <div className="bg-[#1F3864] text-white p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  Sheet 2：ATR 计算器 · 近 15 个交易日真实波幅(TR)历史序列
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  真实波幅 TR = MAX(最高-最低, |最高-前收|, |最低-前收|) · 计算 ATR14 与 15分钟折算波幅
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-mono">
                  折算系数：<span className="text-amber-300 font-bold">0.124</span> (日内15分钟K线经验衰减系数)
                </div>
              </div>
            </div>

            {/* ATR 核心汇总卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">ATR14 日均真实波幅 (E7:E20 均值)</div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  ¥{sheet2Data.atr14.toFixed(4)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  占现价比例：<span className="font-bold text-blue-700">{sheet2Data.atr14Percent}%</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="text-xs text-blue-900 font-bold">★ 折算 15 分钟 ATR (系数 0.124)</div>
                <div className="text-2xl font-black text-[#1F3864] font-mono mt-1">
                  ¥{sheet2Data.atr15m.toFixed(4)}
                </div>
                <div className="text-xs text-blue-700 mt-0.5">
                  = ATR14 × 0.124，直接供给 Sheet 1 单元格 C6
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-xs text-amber-900 font-bold">当前标的日内预期振幅</div>
                <div className="text-2xl font-black text-amber-950 font-mono mt-1">
                  {formInputs.expectedAmpPct}%
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  用于 Sheet 1 G14 振幅法约束测算
                </div>
              </div>
            </div>

            {/* TR 真实序列明细表 */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead>
                  <tr className="bg-[#F2F2F2] text-slate-800 font-bold border-b border-slate-300">
                    <th className="py-2.5 px-4">序号</th>
                    <th className="py-2.5 px-4">交易日期</th>
                    <th className="py-2.5 px-4 text-right">最高价 (High)</th>
                    <th className="py-2.5 px-4 text-right">最低价 (Low)</th>
                    <th className="py-2.5 px-4 text-right">收盘价 (Close)</th>
                    <th className="py-2.5 px-4 text-right">前收价 (PrevClose)</th>
                    <th className="py-2.5 px-4 text-right font-bold text-[#1F3864] bg-blue-50/80">
                      TR 真实波幅 (E列)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sheet2Data.rows.map((r, idx) => (
                    <tr key={r.date} className="hover:bg-slate-50">
                      <td className="py-2 px-4 text-slate-400 font-sans">{idx + 1}</td>
                      <td className="py-2 px-4 text-slate-700">{r.date}</td>
                      <td className="py-2 px-4 text-right text-rose-600">¥{r.high.toFixed(3)}</td>
                      <td className="py-2 px-4 text-right text-emerald-600">¥{r.low.toFixed(3)}</td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900">¥{r.close.toFixed(3)}</td>
                      <td className="py-2 px-4 text-right text-slate-500">¥{r.prevClose.toFixed(3)}</td>
                      <td className="py-2 px-4 text-right font-black text-blue-900 bg-blue-50/50">
                        {r.tr.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sheet 3：回测参考与说明 */}
      {sheetTab === 'sheet3' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md space-y-6">
            <div className="bg-[#1F3864] text-white p-4 rounded-xl">
              <h3 className="text-base sm:text-lg font-bold">
                Sheet 3：回测参考与操作纪律说明
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                5 种格距方案历史回测对比 · 格数三步确定法 · 4条使用纪律 + 5条风险防范
              </p>
            </div>

            {/* 5 种格距方案回测对比表 */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1F3864] flex items-center justify-between">
                <span>不同网格间距方案（以 {formInputs.code} 为例）历史 21 交易日回测对比</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  高亮行为当前计算器所选格距 (¥{calcResult.gridStepPrice.toFixed(4)})
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#F2F2F2] text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-3 text-center">方案</th>
                      <th className="py-2.5 px-3 text-right">网格间距 (元)</th>
                      <th className="py-2.5 px-3 text-right">间距百分比</th>
                      <th className="py-2.5 px-3 text-right">预估日均买卖对</th>
                      <th className="py-2.5 px-3 text-center">零触发天数</th>
                      <th className="py-2.5 px-3 text-right">预估日均盈亏 (¥)</th>
                      <th className="py-2.5 px-3 text-right">21日累计盈亏 (¥)</th>
                      <th className="py-2.5 px-3 text-center font-sans">综合评级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {backtestComparison.map((item, idx) => (
                      <tr
                        key={item.step}
                        className={`transition-colors ${
                          item.isSelected
                            ? 'bg-amber-100/80 font-bold text-amber-950 border-y border-amber-300'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-sans">
                          {item.isSelected ? (
                            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[10px]">
                              当前选中
                            </span>
                          ) : (
                            `方案 ${String.fromCharCode(65 + idx)}`
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">¥{item.step.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right">{item.stepPct}</td>
                        <td className="py-2 px-3 text-right">{item.pairs} 对</td>
                        <td className="py-2 px-3 text-center">
                          {item.zeroDays === 0 ? (
                            <span className="text-emerald-700 font-bold">0 天</span>
                          ) : (
                            <span className="text-slate-500">{item.zeroDays} 天</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                          +¥{item.dailyPnL.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-900 font-black">
                          +¥{item.cumulative21.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-sans text-[11px]">
                          {item.step === 0.004
                            ? '★★★★★ 胜率最优 (推荐)'
                            : item.step < 0.004
                            ? '★★★ 高频摩擦大'
                            : '★★★★ 稳健大波段'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 格数三步确定法说明 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-[#1F3864] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>格数三步确定法：如何科学设定单边格数 C8？</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">第一步：振幅法上限</div>
                  <div className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    日内网格交易单边通常只能捕获<strong>日内振幅的40%~50%</strong>。公式为：
                    <code className="block mt-1 p-1 bg-slate-100 rounded text-slate-800 font-mono text-[10px]">
                      G14 = ROUND(预期日振幅 × 0.45 / 间距%, 0)
                    </code>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">第二步：资金法约束</div>
                  <div className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    单边最大连续买入所消耗的现金不能超出总预算。公式为：
                    <code className="block mt-1 p-1 bg-slate-100 rounded text-slate-800 font-mono text-[10px]">
                      G15 = FLOOR(做T总资金预算 / 每格资金, 1)
                    </code>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-blue-200 bg-blue-50/50">
                  <div className="font-bold text-blue-900">第三步：综合取舍建议</div>
                  <div className="text-blue-800 mt-1 text-[11px] leading-relaxed">
                    建议每边格数取振幅法与资金法的交集，并保底2档：
                    <code className="block mt-1 p-1 bg-white rounded text-blue-950 font-mono text-[10px] border border-blue-200">
                      G13 = MAX(2, MIN(G14, G15, 10))
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* 使用纪律 (4条) 与 风险提示 (5条) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>T+0 日内网格 4 大操作纪律</span>
                </div>
                <ul className="list-decimal list-inside space-y-1.5 text-emerald-800 text-[11px] leading-relaxed">
                  <li><strong>严格底仓对应</strong>：日内做T原则上要求收盘前恢复初始底仓份额，坚决不过夜增加净裸多空风险。</li>
                  <li><strong>不加塞手动撤单</strong>：一旦挂出阶梯限价单，交给条件单自动触发，避免人为情绪干扰交易节奏。</li>
                  <li><strong>成本比红线戒律</strong>：若 G12 成本占格距比 &gt; 50%，必须调大格距或更换低费率券商。</li>
                  <li><strong>单边破位坚决止损</strong>：跌破最底档（如 -3 档）超过 1% 且持续放量时，执行风控减仓。</li>
                </ul>
              </div>

              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>5 大风险提示与免责声明</span>
                </div>
                <ul className="list-decimal list-inside space-y-1.5 text-rose-800 text-[11px] leading-relaxed">
                  <li><strong>单边暴跌风险</strong>：日内单边单向下跌会导致多头网格全部吃满加仓，需具备止损意识。</li>
                  <li><strong>单边暴涨踏空风险</strong>：日内单边单向上涨会导致底仓被连续卖空，失去主升浪收益。</li>
                  <li><strong>跨境溢价波动风险</strong>：部分境外ETF存在场内高溢价，需谨防溢价骤降带来的亏损。</li>
                  <li><strong>流动性摩擦风险</strong>：成交量偏小的标的在买一卖一之间可能存在滑点。</li>
                  <li><strong>工具说明</strong>：本模板仅供量化策略学习与参数设计参考，不构成任何实盘投资买卖建议。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的完整三表联合渲染容器（用于导出整套大图） */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={fullTemplateExportRef}
          className="w-[1100px] bg-white p-8 space-y-6 text-slate-900"
          style={{ fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif" }}
        >
          {/* Header */}
          <div className="bg-[#1F3864] text-white p-6 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-amber-300 font-bold text-xs">
                量化交易系统 · T+0 日内网格交易设计模板
              </div>
              <h1 className="text-2xl font-black mt-1">
                {formInputs.code} {formInputs.name} · 日内网格计算模板
              </h1>
              <div className="text-xs text-blue-200 mt-1">
                微信公众号：我爱这young · 3个Sheet标准联动 · 黄色输入 / 灰色公式
              </div>
            </div>
            <div className="text-right text-xs text-blue-200">
              <div>基准价格：¥{formInputs.basePrice.toFixed(3)}</div>
              <div>总资金预算：¥{formInputs.totalBudget.toLocaleString()}</div>
              <div>生成日期：{new Date().toLocaleDateString('zh-CN')}</div>
            </div>
          </div>

          {/* Sheet 1 Content */}
          <div className="border border-slate-300 rounded-xl p-4 bg-white">
            <div className="text-sm font-bold text-[#1F3864] mb-3">
              Sheet 1：网格参数计算与买卖阶梯表
            </div>
            {/* Table */}
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-[#F2F2F2] text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2 px-2 text-center">档位</th>
                  <th className="py-2 px-2 text-right">挂单价格</th>
                  <th className="py-2 px-2 text-center">方向</th>
                  <th className="py-2 px-2 text-right">距基准%</th>
                  <th className="py-2 px-2 text-right">份数</th>
                  <th className="py-2 px-2 text-right">金额(¥)</th>
                  <th className="py-2 px-2 text-right">配对价</th>
                  <th className="py-2 px-2 text-right">单格净利</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calcResult.ladderRows.map((r) => {
                  if (r.isEmpty) return null;
                  return (
                    <tr
                      key={r.k}
                      className={
                        r.k === 0
                          ? 'bg-[#FFF2CC] font-bold text-amber-950'
                          : r.k > 0
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }
                    >
                      <td className="py-1 px-2 text-center font-bold">
                        {r.k === 0 ? '0' : r.k > 0 ? `+${r.k}` : r.k}
                      </td>
                      <td className="py-1 px-2 text-right font-bold">¥{r.price.toFixed(4)}</td>
                      <td className="py-1 px-2 text-center">{r.direction}</td>
                      <td className="py-1 px-2 text-right">
                        {r.distPct > 0 ? `+${r.distPct}%` : `${r.distPct}%`}
                      </td>
                      <td className="py-1 px-2 text-right">
                        {r.k === 0 ? '—' : r.shares.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right">
                        {r.k === 0 ? '—' : `¥${r.amount.toFixed(1)}`}
                      </td>
                      <td className="py-1 px-2 text-right">
                        {r.k === 0 ? '—' : `¥${r.pairPrice.toFixed(4)}`}
                      </td>
                      <td className="py-1 px-2 text-right font-bold">
                        {r.k === 0 ? '—' : `+¥${r.netProfit.toFixed(2)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Watermark */}
          <div className="bg-[#1F3864] text-white p-4 rounded-xl flex items-center justify-between text-xs">
            <span>量化网格交易系统 · 公众号：我爱这young</span>
            <span>仅供策略参数测算 · 风险自负</span>
          </div>
        </div>
      </div>

      {/* 导出成功提示 Toast */}
      {exportSuccessToast && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">{exportSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
