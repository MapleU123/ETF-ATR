import React from 'react';
import { TrendingUp, Activity, Shield, Zap, Sparkles } from 'lucide-react';
import { EtfItem, AtrPeriod } from '../types';

interface StatsOverviewProps {
  etfs: EtfItem[];
  atrPeriod: AtrPeriod;
  onSelectCategory: (cat: EtfItem['category']) => void;
  onOpenExport: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  etfs,
  atrPeriod,
  onOpenExport,
}) => {
  if (etfs.length === 0) return null;

  // 排序获取极值
  const sortedByAtrPercent = [...etfs].sort((a, b) => b.atrPercent - a.atrPercent);
  const highestAtr = sortedByAtrPercent[0];
  const lowestAtr = sortedByAtrPercent[sortedByAtrPercent.length - 1];

  const avgAtrPercent = (
    etfs.reduce((acc, curr) => acc + curr.atrPercent, 0) / etfs.length
  ).toFixed(2);

  const highVolCount = etfs.filter((e) => e.atrPercent >= 2.6).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 市场平均波动 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">ETF池平均真实波动率 (ATR {atrPeriod}天)</span>
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Activity className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900">{avgAtrPercent}%</span>
          <span className="text-xs text-slate-500">ATR/现价比</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          共收录 <span className="font-semibold text-slate-700">{etfs.length}</span> 只主流ETF，高弹性标的 {highVolCount} 只
        </p>
      </div>

      {/* 波动率之王 (最高ATR%) */}
      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-rose-600">最高波动率 ({atrPeriod}天)</span>
          <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
            <Zap className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-rose-600">
            {highestAtr.atrPercent}%
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
            {highestAtr.name}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
          <span>代码: {highestAtr.code}</span>
          <span>ATR({atrPeriod}天): ¥{highestAtr.atr}</span>
        </p>
      </div>

      {/* 稳健防守标的 (最低ATR%) */}
      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-700">稳健防守 ({atrPeriod}天)</span>
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Shield className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-700">
            {lowestAtr.atrPercent}%
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
            {lowestAtr.name}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
          <span>代码: {lowestAtr.code}</span>
          <span>ATR({atrPeriod}天): ¥{lowestAtr.atr}</span>
        </p>
      </div>

      {/* 水印与高清导出入口 */}
      <div
        onClick={onOpenExport}
        className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-4 border border-rose-200/80 shadow-xs relative overflow-hidden cursor-pointer hover:border-rose-300 transition-all group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            专属高清研报导出
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
            RETINA HD
          </span>
        </div>
        <div className="mt-2">
          <div className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
            自带水印：公众号:我爱这young
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>支持长图 / 精选卡片 / 2x-3x超清导出</span>
            <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </div>
    </div>
  );
};
