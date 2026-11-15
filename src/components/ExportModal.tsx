import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Eye,
  FileImage,
  Palette,
  ShieldCheck,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EtfItem, ExportConfig, ExportTheme, ExportLayout, ExportAspectRatio, AtrPeriod, GridItemConfig } from '../types';
import { ExportCardView } from './ExportCardView';
import { renderExportCardToBlob } from '../utils/exportCardCanvas';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  etfs: EtfItem[];
  atrPeriod?: AtrPeriod;
  onPeriodChange?: (p: AtrPeriod) => void;
  initialLayout?: ExportLayout;
  gridItems?: GridItemConfig[];
  initialSelectedOnly?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  etfs,
  atrPeriod = 14,
  onPeriodChange,
  initialLayout,
  gridItems,
  initialSelectedOnly,
}) => {
  const isGridInitial = initialLayout === 'grid_trading';
  const hasSelected = etfs.some((e) => e.selected);
  const defaultSelectedOnly =
    initialSelectedOnly !== undefined
      ? initialSelectedOnly
      : (isGridInitial && hasSelected);

  const [config, setConfig] = useState<ExportConfig>({
    enableWatermark: true, // 主开关：供用户自由选择加或不加水印
    watermarkText: '公众号:我爱这young',
    showDiagonalWatermark: true,
    diagonalOpacity: 0.16, // 优雅灰色浓度
    showBottomBanner: true,
    showHeaderBadge: true,
    theme: 'light',
    pixelRatio: 2, // 默认高清2x，可自主选择1x, 1.5x, 2x, 3x, 4x
    aspectRatio: 'auto',
    layout: initialLayout || 'full_table',
    atrPeriod: atrPeriod,
    title: isGridInitial
      ? (defaultSelectedOnly ? `A股精选ETF网格交易基础参数设计表` : `A股主流ETF网格交易基础参数设计表`)
      : `A股主流ETF真实波幅(ATR ${atrPeriod}天)量化日报`,
    subTitle: isGridInitial
      ? (defaultSelectedOnly
          ? `基于ATR(${atrPeriod}天)真实波幅动态测算 · 包含重点选中的自选ETF网格参数`
          : `根据ATR(${atrPeriod}天)真实波幅动态测算网格间距与上下限价格区间 · 科学执行分批低吸高抛`)
      : `每日监测A股核心宽基与行业ETF过去${atrPeriod}天波动率，提供海龟交易头寸与止损参考`,
    selectedOnly: defaultSelectedOnly,
    includeStats: false, // 按照用户要求：不要网页收录标的综述、平均ATR率、最大弹性、最低波动这一栏
    dateStr: new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    page: 1,
    pageSize: 50,
  });

  // 当外部 initialLayout 或 initialSelectedOnly 变更时更新
  useEffect(() => {
    if (isOpen) {
      const layoutToUse = initialLayout || config.layout;
      const isGrid = layoutToUse === 'grid_trading';
      const shouldSelectOnly =
        initialSelectedOnly !== undefined
          ? initialSelectedOnly
          : (isGrid && etfs.some((e) => e.selected));

      setConfig((c) => ({
        ...c,
        layout: layoutToUse,
        selectedOnly: shouldSelectOnly,
        page: 1,
        title: isGrid
          ? (shouldSelectOnly ? `A股精选ETF网格交易基础参数设计表` : `A股主流ETF网格交易基础参数设计表`)
          : `A股主流ETF真实波幅(ATR ${c.atrPeriod || 14}天)量化日报`,
        subTitle: isGrid
          ? (shouldSelectOnly
              ? `基于ATR(${c.atrPeriod || 14}天)真实波幅动态测算 · 精选自选ETF网格参数`
              : `根据ATR(${c.atrPeriod || 14}天)真实波幅动态测算网格间距与上下限价格区间 · 科学执行分批低吸高抛`)
          : `每日监测A股核心宽基与行业ETF过去${c.atrPeriod || 14}天波动率，提供海龟交易头寸与止损参考`,
      }));
    }
  }, [initialLayout, initialSelectedOnly, isOpen]);

  // 同步外部 atrPeriod
  useEffect(() => {
    if (atrPeriod) {
      setConfig((c) => ({
        ...c,
        atrPeriod,
        title:
          c.layout === 'grid_trading'
            ? `A股主流ETF网格交易基础参数设计表`
            : `A股主流ETF真实波幅(ATR ${atrPeriod}天)量化日报`,
        subTitle:
          c.layout === 'grid_trading'
            ? `根据ATR(${atrPeriod}天)真实波幅动态测算网格间距与上下限价格区间 · 科学执行分批低吸高抛`
            : `每日监测A股核心宽基与行业ETF过去${atrPeriod}天波动率，提供海龟交易头寸与止损参考`,
      }));
    }
  }, [atrPeriod]);

  const handlePeriodChangeInternal = (p: AtrPeriod) => {
    setConfig((c) => ({
      ...c,
      atrPeriod: p,
      title:
        c.layout === 'grid_trading'
          ? `A股主流ETF网格交易基础参数设计表`
          : `A股主流ETF真实波幅(ATR ${p}天)量化日报`,
      subTitle:
        c.layout === 'grid_trading'
          ? `根据ATR(${p}天)真实波幅动态测算网格间距与上下限价格区间 · 科学执行分批低吸高抛`
          : `每日监测A股核心宽基与行业ETF过去${p}天波动率，提供海龟交易头寸与止损参考`,
    }));
    if (onPeriodChange) {
      onPeriodChange(p);
    }
  };

  // 预览状态
  const [activeTab, setActiveTab] = useState<'card_view' | 'image_view'>('card_view');
  const [previewZoom, setPreviewZoom] = useState<number>(0.65); // 默认65%适屏缩放
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const renderedBlobRef = useRef<Blob | null>(null);
  const renderedUrlRef = useRef<string | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [renderTimestamp, setRenderTimestamp] = useState<string>('');

  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const revokePreviewUrl = useCallback(() => {
    if (renderedUrlRef.current) {
      URL.revokeObjectURL(renderedUrlRef.current);
      renderedUrlRef.current = null;
    }
    renderedBlobRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      revokePreviewUrl();
    };
  }, [revokePreviewUrl]);

  // 触发生成真实导出图片供用户预览（使用极速Canvas 2D引擎，毫秒级渲染不卡机）
  const handleGeneratePreviewImage = useCallback(async () => {
    setIsRenderingPreview(true);
    setErrorMsg(null);

    try {
      // 让出一帧确保加载动画及时呈现
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 16)));
      const result = await renderExportCardToBlob({
        etfs,
        config,
        gridItems,
        format: 'png',
      });
      revokePreviewUrl();
      renderedUrlRef.current = result.objectUrl;
      renderedBlobRef.current = result.blob;
      setRenderedImageUrl(result.objectUrl);
      setRenderTimestamp(new Date().toLocaleTimeString('zh-CN'));
    } catch (err: any) {
      console.error('Render preview image failed:', err);
      setErrorMsg('生成图片预览失败，请尝试减少每页条数或降低清晰度后重试');
    } finally {
      setIsRenderingPreview(false);
    }
  }, [etfs, config, gridItems, revokePreviewUrl]);

  // 当切换到图片预览Tab时，如果尚未生成，自动生成一次
  useEffect(() => {
    if (isOpen && activeTab === 'image_view' && !renderedImageUrl && !isRenderingPreview) {
      handleGeneratePreviewImage();
    }
  }, [isOpen, activeTab, renderedImageUrl, isRenderingPreview, handleGeneratePreviewImage]);

  // 配置或数据变更时清除旧渲染图，保持最新
  useEffect(() => {
    revokePreviewUrl();
    setRenderedImageUrl(null);
  }, [config, etfs, gridItems, revokePreviewUrl]);

  if (!isOpen) return null;

  const selectedEtfs = etfs.filter((e) => e.selected);
  const selectedCount = selectedEtfs.length;
  const currentExportCount = config.selectedOnly && selectedCount > 0 ? selectedCount : etfs.length;

  // 计算分页参数
  const isPaginatedLayout =
    config.layout === 'full_table' ||
    config.layout === 'grid_trading' ||
    config.layout === 'turtle_strategy';
  const totalExportItems = (() => {
    if (config.layout === 'grid_trading' && gridItems && gridItems.length > 0) {
      if (config.selectedOnly && selectedCount > 0) {
        const selectedIds = new Set(selectedEtfs.map((e) => e.id));
        return gridItems.filter((g) => selectedIds.has(g.id)).length;
      }
      return gridItems.length;
    }
    return currentExportCount;
  })();
  const pageSize = Math.max(10, Math.min(80, config.pageSize || 50));
  const totalPages = isPaginatedLayout ? Math.max(1, Math.ceil(totalExportItems / pageSize)) : 1;
  const currentPage = Math.min(Math.max(1, config.page || 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalExportItems);

  // 下载图片（极速Canvas直出，不阻塞主线程）
  const handleDownload = async (format: 'png' | 'jpeg') => {
    setIsExporting(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 16)));

      let downloadUrl: string;
      let shouldRevokeAfter = false;

      if (format === 'png' && renderedImageUrl) {
        downloadUrl = renderedImageUrl;
      } else {
        const result = await renderExportCardToBlob({
          etfs,
          config,
          gridItems,
          format,
        });
        downloadUrl = result.objectUrl;
        shouldRevokeAfter = true;
      }

      const link = document.createElement('a');
      const pageSuffix = totalPages > 1 ? `_第${currentPage}页` : '';
      const ratioSuffix =
        config.aspectRatio === '9:16'
          ? '_9x16'
          : config.aspectRatio === '3:4'
          ? '_3x4'
          : '';
      const filename = config.enableWatermark
        ? `A股ETF_ATR量化日报_${config.watermarkText.replace(/[:：]/g, '_')}_${config.dateStr}${ratioSuffix}${pageSuffix}_${config.pixelRatio}x.${format}`
        : `A股ETF_ATR量化日报_纯净版_${config.dateStr}${ratioSuffix}${pageSuffix}_${config.pixelRatio}x.${format}`;
      link.download = filename;
      link.href = downloadUrl;
      link.click();

      if (shouldRevokeAfter) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMsg('生成图片失败，请尝试切换每页条数为30条或降低清晰度后重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 复制图片到剪贴板
  const handleCopyClipboard = async () => {
    setIsExporting(true);
    setErrorMsg(null);

    try {
      let blob = renderedBlobRef.current;
      let tempUrl: string | null = null;
      if (!blob) {
        const result = await renderExportCardToBlob({
          etfs,
          config,
          gridItems,
          format: 'png',
        });
        blob = result.blob;
        tempUrl = result.objectUrl;
      }

      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob }),
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      } else {
        setErrorMsg('您的浏览器环境限制直接剪贴板写入，请直接点击“下载PNG”');
      }

      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      setErrorMsg('复制失败，建议直接点击下载PNG图片');
    } finally {
      setIsExporting(false);
    }
  };

  // (selectedEtfs / currentExportCount computed above)

  // 导出当前视图或选中标的的 CSV 表格文件
  const handleDownloadCsv = () => {
    if (config.layout === 'grid_trading') {
      const selectedIds = new Set(selectedEtfs.map((e) => e.id));
      const targetItems =
        config.selectedOnly && selectedCount > 0 && gridItems
          ? gridItems.filter((g) => selectedIds.has(g.id))
          : (gridItems || []);

      if (targetItems.length === 0) {
        setErrorMsg('暂无可导出的标的数据');
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
      ];

      const rows = targetItems.map((item, idx) => {
        const original = etfs.find((e) => e.id === item.id);
        return [
          idx + 1,
          `"${item.name.replace(/"/g, '""')}"`,
          `"\t${item.code}"`, // 防止Excel将00/51/15开头的代码截断
          `"${item.category}"`,
          `"${original?.scaleText || (original?.scaleAmount ? `约${original.scaleAmount}亿` : '--')}"`,
          item.price.toFixed(3),
          item.basePrice.toFixed(3),
          item.highPrice.toFixed(3),
          item.lowPrice.toFixed(3),
          item.gridStepPercent.toFixed(2) + '%',
          item.gridStepPrice.toFixed(3),
          item.gridCount,
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `A股ETF网格参数_${config.selectedOnly && selectedCount > 0 ? `已选${targetItems.length}只` : '全部'}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const targetItems = config.selectedOnly && selectedCount > 0 ? selectedEtfs : etfs;
      const headers = [
        '序号',
        '基金名称',
        '基金代码',
        '行业类别',
        '基金规模',
        '参考现价(元)',
        '涨跌幅(%)',
        'TR真实波幅',
        `ATR(${config.atrPeriod}天)`,
        `ATR%波动率`,
        '海龟1N价值',
        '建议止损位',
      ];
      const rows = targetItems.map((item, idx) => [
        idx + 1,
        `"${item.name.replace(/"/g, '""')}"`,
        `"\t${item.code}"`,
        `"${item.category}"`,
        `"${item.scaleText || (item.scaleAmount ? `约${item.scaleAmount}亿` : '--')}"`,
        item.price.toFixed(3),
        item.changePercent.toFixed(2) + '%',
        item.tr.toFixed(3),
        item.atr.toFixed(3),
        item.atrPercent.toFixed(2) + '%',
        item.turtleUnitN.toFixed(1),
        item.stopLossPrice.toFixed(3),
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `A股ETF_ATR波幅表_${config.selectedOnly && selectedCount > 0 ? `已选${targetItems.length}只` : '全部'}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>导出量化数据图片</span>
                {config.enableWatermark ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                    水印: {config.watermarkText}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    无水印 (纯净版)
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                  {config.aspectRatio === '9:16'
                    ? `9:16 · ${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1636 * (config.pixelRatio || 2))}px`
                    : config.aspectRatio === '3:4'
                    ? `3:4 · ${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1227 * (config.pixelRatio || 2))}px`
                    : `${config.pixelRatio}x 清晰度 (${Math.round(920 * (config.pixelRatio || 2))}px宽)`}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                支持导出前完整长图预览与高清真实图片检查，已优化去除综述栏与勾选框杂质
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left controls, Right preview */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Controls Panel */}
          <div className="w-full md:w-80 border-r border-slate-200 p-5 overflow-y-auto space-y-4 text-xs bg-slate-50/40">
            {/* ATR Period Selection in Export Modal */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Clock className="w-4 h-4 text-rose-600" />
                  ATR 计算周期
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  ATR {config.atrPeriod}天
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="export-period-14-btn"
                  onClick={() => handlePeriodChangeInternal(14)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    config.atrPeriod === 14
                      ? 'border-rose-500 bg-rose-50/80 text-rose-950 font-bold shadow-xs ring-1 ring-rose-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">14天 (经典)</span>
                    {config.atrPeriod === 14 && <Check className="w-3.5 h-3.5 text-rose-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Wilder经典平滑
                  </div>
                </button>

                <button
                  type="button"
                  id="export-period-20-btn"
                  onClick={() => handlePeriodChangeInternal(20)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    config.atrPeriod === 20
                      ? 'border-rose-500 bg-rose-50/80 text-rose-950 font-bold shadow-xs ring-1 ring-rose-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">20天 (海龟)</span>
                    {config.atrPeriod === 20 && <Check className="w-3.5 h-3.5 text-rose-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    海龟法则波动率N
                  </div>
                </button>
              </div>
            </div>

            {/* Watermark Section */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  水印配置 (可加或不加)
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    config.enableWatermark
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {config.enableWatermark ? '已开启' : '已关闭'}
                </span>
              </div>

              {/* Watermark Master Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, enableWatermark: true }))}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                    config.enableWatermark
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  添加水印
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, enableWatermark: false }))}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                    !config.enableWatermark
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  不加水印 (纯净)
                </button>
              </div>

              {config.enableWatermark ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                      水印文字标识：
                    </label>
                    <input
                      type="text"
                      value={config.watermarkText}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, watermarkText: e.target.value }))
                      }
                      placeholder="公众号:我爱这young"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-medium">浮在图上方的灰色倾斜水印</span>
                        <span className="text-[10px] text-slate-400">悬浮于图表上方，灰色防盗</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.showDiagonalWatermark}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            showDiagonalWatermark: e.target.checked,
                          }))
                        }
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                    </label>

                    {config.showDiagonalWatermark && (
                      <div className="pl-1 pt-1 flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500">灰色浓度:</span>
                        <div className="flex items-center gap-1">
                          {[
                            { label: '浅灰', val: 0.10 },
                            { label: '标准灰', val: 0.16 },
                            { label: '明显灰', val: 0.25 },
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => setConfig((c) => ({ ...c, diagonalOpacity: item.val }))}
                              className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                                config.diagonalOpacity === item.val
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-700">顶部官方认证徽章</span>
                      <input
                        type="checkbox"
                        checked={config.showHeaderBadge}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            showHeaderBadge: e.target.checked,
                          }))
                        }
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-700">底部公众号签名横幅</span>
                      <input
                        type="checkbox"
                        checked={config.showBottomBanner}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            showBottomBanner: e.target.checked,
                          }))
                        }
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                  已切换为<strong>纯净无水印模式</strong>。导出的长图将不含任何倾斜灰色水印、认证徽章或底部署名。
                </div>
              )}
            </div>

            {/* Image Aspect Ratio / Size Selection */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-rose-600" />
                  导出图片尺寸比例
                </span>
                <span className="text-[10px] text-rose-600 font-mono font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                  {config.aspectRatio === '9:16'
                    ? '9:16 竖屏'
                    : config.aspectRatio === '3:4'
                    ? '3:4 竖版'
                    : '自适应长图'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    id: 'auto' as ExportAspectRatio,
                    label: '自适应长图',
                    size: '按内容高度',
                    defaultPageSize: 50,
                  },
                  {
                    id: '9:16' as ExportAspectRatio,
                    label: '9:16 竖屏',
                    size: `${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1636 * (config.pixelRatio || 2))}`,
                    defaultPageSize: 25,
                  },
                  {
                    id: '3:4' as ExportAspectRatio,
                    label: '3:4 竖版',
                    size: `${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1227 * (config.pixelRatio || 2))}`,
                    defaultPageSize: 15,
                  },
                ].map((opt) => {
                  const isActive = (config.aspectRatio || 'auto') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      id={`export-aspect-${opt.id.replace(':', '-')}-btn`}
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          aspectRatio: opt.id,
                          page: 1,
                          pageSize: opt.defaultPageSize,
                        }))
                      }
                      className={`p-2 rounded-lg text-center border transition-all ${
                        isActive
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-bold shadow-xs ring-1 ring-rose-400'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{opt.label}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                        {opt.size}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                9:16 适合手机全屏/抖音快手海报，3:4 适合小红书/公众号竖版图文；切换比例将自动匹配最佳单页条数。
              </p>
            </div>

            {/* Resolution / Image Clarity Selection */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  导出图片清晰度 (供自主选择)
                </span>
                <span className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                  {config.pixelRatio}x
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    ratio: 1,
                    name: '标清 1x (约920px宽)',
                    desc: '体积轻巧 (<500KB)，适合微信快速发送',
                  },
                  {
                    ratio: 1.5,
                    name: '中清 1.5x (约1380px宽)',
                    desc: '兼顾清晰度与传输速度',
                  },
                  {
                    ratio: 2,
                    name: '高清 2x (约1840px宽 · 推荐)',
                    desc: 'Retina视网膜屏标准，字迹锐利清晰',
                  },
                  {
                    ratio: 3,
                    name: '超清 3x (约2760px宽)',
                    desc: '2K超高细节，适合电脑大屏与精美插图',
                  },
                  {
                    ratio: 4,
                    name: '极清 4x (约3680px宽)',
                    desc: '4K海报印刷级别，极高放大倍率',
                  },
                ].map((res) => (
                  <button
                    key={res.ratio}
                    type="button"
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        pixelRatio: res.ratio as any,
                      }))
                    }
                    className={`p-2 rounded-lg text-left border transition-all ${
                      config.pixelRatio === res.ratio
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{res.name}</span>
                      {config.pixelRatio === res.ratio && (
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      {res.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Mode */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  报表版式与结构
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: 'grid_trading',
                    label: '网格交易基础参数表',
                    desc: '基金名称、基金代码、最高价、最低价、基准价、网格间距(%)',
                  },
                  {
                    id: 'full_table',
                    label: '完整量化全景表',
                    desc: '含代码、行业、规模、现价、涨跌幅、ATR、海龟1N及止损',
                  },
                  {
                    id: 'top_highlights',
                    label: '多空双榜 Top 5 精选',
                    desc: '进攻高弹性 Top5 与稳健低波底仓 Top5 双栏对比',
                  },
                  {
                    id: 'turtle_strategy',
                    label: '海龟交易实战测算表',
                    desc: '包含10万资金建议开仓Unit与0.5N加仓触发价',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setConfig((c) => {
                        const isGrid = item.id === 'grid_trading';
                        return {
                          ...c,
                          layout: item.id as ExportLayout,
                          page: 1,
                          title: isGrid
                            ? `A股主流ETF网格交易基础参数设计表`
                            : `A股主流ETF真实波幅(ATR ${c.atrPeriod || 14}天)量化日报`,
                          subTitle: isGrid
                            ? `根据ATR(${c.atrPeriod || 14}天)真实波幅动态测算网格间距与上下限价格区间 · 科学执行分批低吸高抛`
                            : `每日监测A股核心宽基与行业ETF过去${c.atrPeriod || 14}天波动率，提供海龟交易头寸与止损参考`,
                        };
                      })
                    }
                    className={`p-2 rounded-lg text-left border transition-all ${
                      config.layout === item.id
                        ? 'border-rose-500 bg-rose-50/60 text-rose-900 font-semibold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-medium text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Theme */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-600" />
                  视觉配色方案
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'light', name: '商务典雅白', color: 'bg-white border-slate-300' },
                  { id: 'dark', name: '深邃夜间黑', color: 'bg-slate-900 border-slate-700 text-white' },
                  { id: 'paper', name: '金融复古报纸', color: 'bg-[#faf8f4] border-[#d8d2c6] text-[#2c2a29]' },
                  { id: 'bullish', name: 'A股大红牛市', color: 'bg-rose-50 border-rose-300 text-rose-800' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      setConfig((c) => ({ ...c, theme: t.id as ExportTheme }))
                    }
                    className={`p-2 rounded-lg text-center border text-xs font-medium transition-all ${
                      config.theme === t.id
                        ? 'border-rose-600 ring-2 ring-rose-300 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${t.color}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope selection */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="text-slate-800 font-bold flex items-center justify-between text-xs">
                <span>导出数据范围</span>
                <span className="font-mono text-rose-600 font-bold">
                  {currentExportCount} 只标的
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  id="modal-scope-selected-only-btn"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      selectedOnly: true,
                      page: 1,
                      title:
                        c.layout === 'grid_trading'
                          ? (selectedCount > 0 ? 'A股精选ETF网格交易基础参数设计表' : 'A股主流ETF网格交易基础参数设计表')
                          : c.title,
                      subTitle:
                        c.layout === 'grid_trading'
                          ? (selectedCount > 0 ? `基于ATR(${c.atrPeriod || 14}天)真实波幅动态测算 · 精选 ${selectedCount} 只重点自选ETF网格参数` : c.subTitle)
                          : c.subTitle,
                    }))
                  }
                  className={`flex-1 py-2 px-2 rounded-lg border text-xs font-semibold transition-all text-center ${
                    config.selectedOnly
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-1 ring-rose-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>仅选中的标的</div>
                  <div className={`text-[10px] mt-0.5 ${config.selectedOnly ? 'text-rose-100 font-normal' : 'text-slate-400 font-normal'}`}>
                    {selectedCount > 0 ? `已选 ${selectedCount} 只 (推荐)` : '当前未勾选 (0只)'}
                  </div>
                </button>
                <button
                  id="modal-scope-all-btn"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      selectedOnly: false,
                      page: 1,
                      title:
                        c.layout === 'grid_trading'
                          ? 'A股主流ETF网格交易基础参数设计表'
                          : c.title,
                      subTitle:
                        c.layout === 'grid_trading'
                          ? `根据ATR(${c.atrPeriod || 14}天)真实波幅动态测算网格间距与上下限价格区间 · 科学执行分批低吸高抛`
                          : c.subTitle,
                    }))
                  }
                  className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all text-center ${
                    !config.selectedOnly
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold ring-1 ring-rose-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>全部标的</div>
                  <div className={`text-[10px] mt-0.5 ${!config.selectedOnly ? 'text-rose-100 font-normal' : 'text-slate-400 font-normal'}`}>
                    全市场共 {etfs.length} 只
                  </div>
                </button>
              </div>

              {config.selectedOnly && selectedCount > 0 && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>已按勾选过滤：导出 {selectedCount} 只重点ETF</span>
                </div>
              )}

              {config.selectedOnly && selectedCount === 0 && (
                <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                  当前尚未在表格中勾选任何ETF，建议在表格左侧勾选标的后再导出，或切换为“全部标的”。
                </div>
              )}
            </div>

            {/* Pagination Settings for Large Lists */}
            {isPaginatedLayout && totalExportItems > 15 && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span>长图分页切片</span>
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    共 {totalPages} 页
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {[
                    { size: 15, label: '15条' },
                    { size: 25, label: '25条' },
                    { size: 30, label: '30条' },
                    { size: 50, label: '50条' },
                    { size: 80, label: '80条' },
                  ].map((opt) => (
                    <button
                      key={opt.size}
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({ ...c, pageSize: opt.size, page: 1 }))
                      }
                      className={`py-1.5 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                        pageSize === opt.size
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  标的数量较多时自动分页切片（3:4推荐15条/页，9:16推荐25条/页）；如需全量数据可点击下方「下载表格(CSV)」。
                </p>
              </div>
            )}
          </div>

          {/* Right: Live Preview & Export Canvas */}
          <div className="flex-1 bg-slate-200/60 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
            {/* Top Toolbar: Tabs & Zoom Controls */}
            <div className="w-full max-w-[920px] mb-3 flex flex-wrap items-center justify-between gap-2">
              {/* Preview Tabs */}
              <div className="flex items-center gap-1 bg-slate-300/60 p-1 rounded-xl">
                <button
                  id="tab-interactive-preview-btn"
                  onClick={() => setActiveTab('card_view')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'card_view'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-rose-600" />
                  <span>长图版式预览</span>
                </button>

                <button
                  id="tab-image-preview-btn"
                  onClick={() => setActiveTab('image_view')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'image_view'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>真实图片导出预览 (所见即所得)</span>
                  {renderedImageUrl && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>

              {/* Zoom and Refresh controls */}
              <div className="flex items-center gap-2">
                {activeTab === 'card_view' && (
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-xs text-xs">
                    <button
                      onClick={() => setPreviewZoom(0.55)}
                      className={`px-2 py-1 rounded font-medium ${
                        previewZoom === 0.55 ? 'bg-slate-100 font-bold text-rose-600' : 'text-slate-600'
                      }`}
                      title="适屏 55%"
                    >
                      55%
                    </button>
                    <button
                      onClick={() => setPreviewZoom(0.75)}
                      className={`px-2 py-1 rounded font-medium ${
                        previewZoom === 0.75 ? 'bg-slate-100 font-bold text-rose-600' : 'text-slate-600'
                      }`}
                      title="适中 75%"
                    >
                      75%
                    </button>
                    <button
                      onClick={() => setPreviewZoom(1)}
                      className={`px-2 py-1 rounded font-medium ${
                        previewZoom === 1 ? 'bg-slate-100 font-bold text-rose-600' : 'text-slate-600'
                      }`}
                      title="原始大小 100%"
                    >
                      100%
                    </button>
                  </div>
                )}

                <button
                  onClick={handleGeneratePreviewImage}
                  disabled={isRenderingPreview}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors disabled:opacity-50"
                  title="生成或刷新高清导出图片"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRenderingPreview ? 'animate-spin text-rose-600' : 'text-slate-600'}`} />
                  <span>{isRenderingPreview ? '正在渲染图片...' : '刷新生成图片'}</span>
                </button>
              </div>
            </div>

            {/* Pagination Bar when totalPages > 1 */}
            {totalPages > 1 && (
              <div className="w-full max-w-[920px] mb-3 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">
                  当前预览与导出第 <strong className="text-rose-600 font-mono">{startIndex + 1}-{endIndex}</strong> 条（共{' '}
                  <strong className="text-slate-900 font-mono">{totalExportItems}</strong> 只标的，每页 {pageSize} 条）
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setConfig((c) => ({ ...c, page: Math.max(1, currentPage - 1) }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>上一页</span>
                  </button>

                  <select
                    value={currentPage}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, page: Number(e.target.value) }))
                    }
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    aria-label="选择导出页码"
                  >
                    {Array.from({ length: totalPages }, (_, i) => {
                      const p = i + 1;
                      const from = i * pageSize + 1;
                      const to = Math.min(p * pageSize, totalExportItems);
                      return (
                        <option key={p} value={p}>
                          第 {p}/{totalPages} 页 ({from}-{to})
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setConfig((c) => ({ ...c, page: Math.min(totalPages, currentPage + 1) }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium disabled:opacity-40"
                  >
                    <span>下一页</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="w-full max-w-[920px] mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            {/* TAB 1: Scaled Live Card Preview */}
            {activeTab === 'card_view' && (
              <div className="w-full flex flex-col items-center pb-8 overflow-x-auto">
                <div
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top center',
                    width: '920px',
                    marginBottom: previewZoom < 1 ? `-${920 * (1 - previewZoom) * 1.5}px` : '0px',
                  }}
                  className="transition-transform duration-150"
                >
                  <ExportCardView etfs={etfs} config={config} gridItems={gridItems} />
                </div>
              </div>
            )}

            {/* TAB 2: Actual Rendered Image Preview */}
            {activeTab === 'image_view' && (
              <div className="w-full max-w-[920px] flex flex-col items-center pb-8">
                {isRenderingPreview ? (
                  <div className="w-full bg-white rounded-xl p-12 border border-slate-200 flex flex-col items-center justify-center space-y-3 shadow-sm">
                    <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    <div className="text-sm font-bold text-slate-800">
                      正在高清渲染实际导出图片...
                    </div>
                    <p className="text-xs text-slate-500">
                      正在将第 {currentPage} 页（共 {endIndex - startIndex} 只ETF）数据转化为真实PNG文件
                    </p>
                  </div>
                ) : renderedImageUrl ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        真实高清导出图片已就绪 (所见即所得，下同实际下载内容)
                      </span>
                      <span className="font-mono text-emerald-700">
                        生成于 {renderTimestamp} ·{' '}
                        {config.aspectRatio === '9:16'
                          ? `${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1636 * (config.pixelRatio || 2))}px (9:16)`
                          : config.aspectRatio === '3:4'
                          ? `${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1227 * (config.pixelRatio || 2))}px (3:4)`
                          : `宽度 ${Math.round(920 * (config.pixelRatio || 2))}px (${config.pixelRatio}x清晰度)`}
                      </span>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden flex justify-center p-2">
                      <img
                        src={renderedImageUrl}
                        alt="真实导出图片预览"
                        className="w-full h-auto rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-white rounded-xl p-12 border border-slate-200 flex flex-col items-center justify-center space-y-3 shadow-sm">
                    <ImageIcon className="w-10 h-10 text-slate-400" />
                    <div className="text-sm font-bold text-slate-700">
                      尚未生成真实图片预览
                    </div>
                    <button
                      onClick={handleGeneratePreviewImage}
                      className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
                    >
                      立即一键渲染导出图片
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {config.enableWatermark ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                水印：{config.watermarkText}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                无水印（纯净版）
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
              {config.aspectRatio === '9:16'
                ? `9:16 (${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1636 * (config.pixelRatio || 2))})`
                : config.aspectRatio === '3:4'
                ? `3:4 (${Math.round(920 * (config.pixelRatio || 2))}×${Math.round(1227 * (config.pixelRatio || 2))})`
                : `${config.pixelRatio}x 清晰度 (${Math.round(920 * (config.pixelRatio || 2))}px)`}
            </span>
            <span>已选标的：{currentExportCount} 只</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="confirm-download-csv-btn"
              onClick={handleDownloadCsv}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors disabled:opacity-50"
              title="下载所选标的数据为 Excel / CSV 格式表格"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>下载表格(CSV)</span>
            </button>

            <button
              onClick={handleCopyClipboard}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors disabled:opacity-50"
            >
              {copySuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">已复制到剪贴板</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>复制图片</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownload('jpeg')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>下载JPG</span>
            </button>

            <button
              id="confirm-download-png-btn"
              onClick={() => handleDownload('png')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md hover:shadow-rose-200 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>渲染高清图片中...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>一键导出高清PNG图片</span>
                  <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
