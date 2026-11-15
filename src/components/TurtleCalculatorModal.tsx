import React, { useState } from 'react';
import { X, Calculator, ShieldAlert, TrendingUp, Info, Clock } from 'lucide-react';
import { EtfItem, AtrPeriod } from '../types';

interface TurtleCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  etfs: EtfItem[];
  defaultEtfId?: string;
  atrPeriod?: AtrPeriod;
  onPeriodChange?: (p: AtrPeriod) => void;
}

export const TurtleCalculatorModal: React.FC<TurtleCalculatorModalProps> = ({
  isOpen,
  onClose,
  etfs,
  defaultEtfId,
  atrPeriod = 14,
  onPeriodChange,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    defaultEtfId || etfs[0]?.id || ''
  );
  const [totalCapital, setTotalCapital] = useState<number>(100000); // 10万本金
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1%单笔风险
  const [entryPriceOffset, setEntryPriceOffset] = useState<number>(0); // 自定义开仓价微调

  if (!isOpen) return null;

  const currentEtf = etfs.find((e) => e.id === selectedId) || etfs[0];
  if (!currentEtf) return null;

  const effectiveEntryPrice = Number(
    (currentEtf.price + entryPriceOffset).toFixed(3)
  );
  const atr = currentEtf.atr;
  const riskAmount = (totalCapital * (riskPercent / 100)); // 单笔最大允许亏损金额 (例如1000元)
  const stopLossDistance = 2 * atr; // 2N硬止损距离
  const stopLossPrice = Math.max(0, effectiveEntryPrice - stopLossDistance);

  // 股数 = 风险金额 / 止损距离，向下取整到100整手
  const rawShares = riskAmount / stopLossDistance;
  const targetShares = Math.max(100, Math.floor(rawShares / 100) * 100);
  const totalCost = targetShares * effectiveEntryPrice;
  const positionRatio = ((totalCost / totalCapital) * 100).toFixed(1);

  // 实际止损时亏损金额
  const actualRisk = (effectiveEntryPrice - stopLossPrice) * targetShares;

  // 经典加仓节点 (每上涨0.5N加仓1次)
  const addPoint1 = effectiveEntryPrice + 0.5 * atr;
  const addPoint2 = effectiveEntryPrice + 1.0 * atr;
  const addPoint3 = effectiveEntryPrice + 1.5 * atr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  海龟交易法则 · ETF 头寸与止损测算器
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  当前 ATR({atrPeriod}天)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                基于ATR({atrPeriod}天)真实波动幅度计算1N头寸规模与2N硬止损位
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onPeriodChange && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onPeriodChange(14)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    atrPeriod === 14 ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  14天
                </button>
                <button
                  type="button"
                  onClick={() => onPeriodChange(20)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    atrPeriod === 20 ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  20天(海龟)
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Target ETF Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              选择测算的ETF标的：
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {etfs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code}) · 现价 ¥{e.price.toFixed(3)} · ATR: ¥{e.atr} (
                  {e.atrPercent}%)
                </option>
              ))}
            </select>
          </div>

          {/* Capital & Risk settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                账户总资金 (¥)：
              </label>
              <input
                type="number"
                value={totalCapital}
                onChange={(e) => setTotalCapital(Math.max(1000, Number(e.target.value)))}
                step="10000"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                单笔风险预算比 (标准1%)：
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={riskPercent}
                  onChange={(e) =>
                    setRiskPercent(Math.max(0.1, Math.min(5, Number(e.target.value))))
                  }
                  step="0.5"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                实际开仓参考价 (¥)：
              </label>
              <input
                type="number"
                value={effectiveEntryPrice}
                onChange={(e) =>
                  setEntryPriceOffset(Number(e.target.value) - currentEtf.price)
                }
                step="0.005"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Calculation Result Dashboard */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                测算结果看板
              </span>
              <span className="text-[11px] text-slate-500">
                1N (1手波动) = <strong className="font-mono text-slate-800">¥{currentEtf.turtleUnitN}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">建议建仓股数</div>
                <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">
                  {targetShares.toLocaleString()} <span className="text-xs font-normal">股</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  折合 {targetShares / 100} 手
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">建议仓位占用金额</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                  ¥{totalCost.toFixed(0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  占总资金 {positionRatio}%
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">2N 建议止损价位</div>
                <div className="text-xl font-bold font-mono text-red-600 mt-0.5">
                  ¥{stopLossPrice.toFixed(3)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  止损空间 -{((stopLossDistance / effectiveEntryPrice) * 100).toFixed(2)}%
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">触发止损时真实亏损</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  ¥{actualRisk.toFixed(0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  严守 {((actualRisk / totalCapital) * 100).toFixed(2)}% 风险底线
                </div>
              </div>
            </div>

            {/* Pyramid Add Position Steps */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                海龟顺势加仓触发点位（每突破 0.5N 加仓 1 个 Unit，止损线同步上移）：
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">+0.5N 第一次加仓</div>
                  <div className="font-mono font-bold text-emerald-600 mt-0.5">
                    ¥{addPoint1.toFixed(3)}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">+1.0N 第二次加仓</div>
                  <div className="font-mono font-bold text-emerald-600 mt-0.5">
                    ¥{addPoint2.toFixed(3)}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">+1.5N 第三次加仓</div>
                  <div className="font-mono font-bold text-emerald-600 mt-0.5">
                    ¥{addPoint3.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            完成测算
          </button>
        </div>
      </div>
    </div>
  );
};
