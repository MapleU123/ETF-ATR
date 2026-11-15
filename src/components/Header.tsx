import React from 'react';
import {
  Download,
  RefreshCw,
  Calculator,
  Plus,
  Sparkles,
  ShieldCheck,
  Activity,
  Grid,
  Zap,
} from 'lucide-react';
import { AtrPeriod, ActiveTab } from '../types';

interface HeaderProps {
  atrPeriod: AtrPeriod;
  onPeriodChange?: (p: AtrPeriod) => void;
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onOpenExport: () => void;
  onOpenExportGrid?: () => void;
  onOpenTurtleCalc: () => void;
  onOpenAddModal: () => void;
  onRefreshData: () => void;
  selectedCount: number;
  totalCount: number;
  isRealtime?: boolean;
  isLoadingRealtime?: boolean;
  realtimeTime?: string;
}

export const Header: React.FC<HeaderProps> = ({
  atrPeriod,
  onPeriodChange,
  activeTab = 'atr_volatility',
  onTabChange,
  onOpenExport,
  onOpenExportGrid,
  onOpenTurtleCalc,
  onOpenAddModal,
  onRefreshData,
  selectedCount,
  totalCount,
  isRealtime = true,
  isLoadingRealtime = false,
  realtimeTime,
}) => {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-sm shadow-rose-200 shrink-0">
              <span className="font-bold text-lg tracking-tighter">ATR</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  A股ETF波动率(ATR)量化看板
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  公众号:我爱这young
                </span>
                {isRealtime && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    交易所实时行情已接入
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>{realtimeTime ? `行情时间：${realtimeTime}` : `${currentDate} 交易整理`}</span>
                <span className="text-slate-300">•</span>
                
                {/* ATR 14天 / 20天 快捷切换 */}
                <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-600 px-1.5 font-medium">ATR计算周期:</span>
                  <button
                    type="button"
                    onClick={() => onPeriodChange && onPeriodChange(14)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                      atrPeriod === 14
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="14天经典Wilder真实波幅均值"
                  >
                    14天 (经典)
                  </button>
                  <button
                    type="button"
                    onClick={() => onPeriodChange && onPeriodChange(20)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                      atrPeriod === 20
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="20天海龟法则标准波动周期"
                  >
                    20天 (海龟)
                  </button>
                </div>

                <span className="text-slate-300">•</span>
                <span>共收录 <strong className="text-slate-800 font-semibold">{totalCount}</strong> 只真实标的 (已选 <strong className="text-rose-600">{selectedCount}</strong>)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              id="refresh-data-btn"
              onClick={onRefreshData}
              disabled={isLoadingRealtime}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
              title="拉取沪深交易所最新实时行情与重算ATR"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRealtime ? 'animate-spin text-rose-600' : ''}`} />
              <span>{isLoadingRealtime ? '正在同步行情...' : '刷新实时行情'}</span>
            </button>

            <button
              id="open-turtle-calc-btn"
              onClick={onOpenTurtleCalc}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-slate-600" />
              <span>海龟仓位测算</span>
            </button>

            <button
              id="open-add-etf-btn"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增ETF</span>
            </button>

            <button
              id="open-export-modal-btn"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all hover:shadow-md hover:shadow-rose-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出高清图</span>
              <Sparkles className="w-3 h-3 text-rose-200" />
            </button>
          </div>
        </div>

        {/* 板块导航标签栏：板块一(ATR波动率看板) 与 板块二(网格交易基础参数设计) */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              id="tab-btn-atr-volatility"
              type="button"
              onClick={() => onTabChange && onTabChange('atr_volatility')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'atr_volatility'
                  ? 'bg-white text-rose-700 shadow-sm ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Activity className="w-4 h-4 text-rose-600" />
              <span>板块一：ETF波幅(ATR)量化监测</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                ATR {atrPeriod}天
              </span>
            </button>

            <button
              id="tab-btn-grid-trading"
              type="button"
              onClick={() => onTabChange && onTabChange('grid_trading')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'grid_trading'
                  ? 'bg-white text-rose-700 shadow-sm ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Grid className="w-4 h-4 text-rose-600" />
              <span>板块二：网格交易基础参数设计</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                ATR动态定距
              </span>
            </button>

            <button
              id="tab-btn-t0-grid-trading"
              type="button"
              onClick={() => onTabChange && onTabChange('t0_grid_trading')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 't0_grid_trading'
                  ? 'bg-white text-blue-800 shadow-sm ring-1 ring-blue-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Zap className="w-4 h-4 text-blue-700 fill-current" />
              <span>板块三：T+0 ETF网格交易参数设计</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 font-black">
                新上线 · 3表联动
              </span>
            </button>
          </div>

          {activeTab === 'grid_trading' && onOpenExportGrid && (
            <button
              id="header-export-grid-btn"
              type="button"
              onClick={onOpenExportGrid}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>导出网格参数图片 (基金名称/代码/高低价/基准/间距)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
