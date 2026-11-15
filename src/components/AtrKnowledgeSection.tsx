import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ShieldCheck, Target, BarChart2 } from 'lucide-react';

export const AtrKnowledgeSection: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 mt-6 overflow-hidden shadow-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              量化知识指南：如何利用 ATR 进行 A股 ETF 实盘决策？
            </h3>
            <p className="text-xs text-slate-500">
              理解真实波动幅度均值、ATR%波动率、网格间距与海龟头寸管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{isOpen ? '收起指南' : '展开阅读'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                1. 真实波幅 (TR) 与 ATR
              </div>
              <p className="leading-relaxed">
                由 J. Welles Wilder 提出。单日 TR = MAX(最高-最低, |最高-昨收|, |最低-昨收|)，充分考虑了<strong>跳空高开或低开</strong>带来的真实风险。ATR(14) 则是过去14个交易日TR的平滑移动均值。
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-rose-600" />
                2. 为什么核心看 ATR%？
              </div>
              <p className="leading-relaxed">
                A股不同ETF价格差异巨大（如黄金ETF 6.2元，港股通互联网仅0.44元）。若单纯看绝对值ATR会失真。<strong>ATR% = (ATR ÷ 现价) × 100%</strong>，统一了波动率尺度，一眼找出真正具备高弹性的品种。
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                3. 海龟法则与动态止损
              </div>
              <p className="leading-relaxed">
                让波动率决定仓位：<strong>高波动ETF少买，低波动ETF多买</strong>。多头标准止损位通常设在买入价下方 <strong>2 × ATR</strong>，确保正常日常波动不会过早被震仓出局。
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span className="font-semibold text-rose-900">
                公众号专属水印支持：公众号:我爱这young
              </span>
              <span className="text-slate-500">
                （点击右上角“导出带水印高清图”，可一键生成 2x/3x Retina 超清研报长图并保存发布）
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
