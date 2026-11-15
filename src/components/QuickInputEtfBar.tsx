import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Check, Plus, ArrowRight, TrendingUp } from 'lucide-react';
import { EtfItem, AtrPeriod } from '../types';
import { searchMarketSuggestions, buildEtfFromInput, ALL_MARKET_ETFS } from '../data/allMarketEtfs';

interface QuickInputEtfBarProps {
  currentEtfs: EtfItem[];
  onAddOrShowEtf: (item: EtfItem, message: string) => void;
  atrPeriod: AtrPeriod;
}

const POPULAR_QUICK_TAGS = [
  { code: '513050', name: '中概互联ETF' },
  { code: '512660', name: '军工ETF' },
  { code: '159869', name: '游戏ETF' },
  { code: '159995', name: '芯片ETF' },
  { code: '518880', name: '黄金ETF' },
  { code: '513100', name: '纳指100ETF' },
  { code: '512170', name: '医疗ETF' },
  { code: '512890', name: '红利低波ETF' },
  { code: '515790', name: '光伏ETF' },
  { code: '512880', name: '证券ETF' },
  { code: '588000', name: '科创50ETF' },
];

export const QuickInputEtfBar: React.FC<QuickInputEtfBarProps> = ({
  currentEtfs,
  onAddOrShowEtf,
  atrPeriod,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(-1);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCodes = new Set<string>(currentEtfs.map((e) => e.code));

  // 获取候选
  const suggestions = searchMarketSuggestions(inputValue, currentCodes);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrAdd = async (codeOrName: string) => {
    const existing = currentEtfs.find(
      (e) => e.code === codeOrName || e.name === codeOrName
    );

    if (existing) {
      onAddOrShowEtf(
        existing,
        `标的「${existing.code} ${existing.name}」已在看板中，已为您高亮显示并定位！`
      );
      setInputValue('');
      setIsOpenDropdown(false);
      setActiveHighlightIndex(-1);
      return;
    }

    // 优先从建议列表中解析标准6位代码
    let targetCode = codeOrName.trim();
    const matchedSuggestion = ALL_MARKET_ETFS.find(
      (m) => m.code === targetCode || m.name === targetCode || targetCode.includes(m.name)
    );
    if (matchedSuggestion) {
      targetCode = matchedSuggestion.code;
    }

    setIsLoadingApi(true);
    try {
      // 优先从后端拉取真实交易所实时行情与K线
      const res = await fetch(`/api/etf-quote?code=${encodeURIComponent(targetCode)}&period=${atrPeriod}`);
      const data = await res.json();

      if (data.success && data.item) {
        const item: EtfItem = data.item;
        item.isCustom = true;
        item.badge = '新输入显示';
        onAddOrShowEtf(
          item,
          `已获取「${item.code} ${item.name}」真实实时行情(¥${item.price.toFixed(3)})，ATR(${atrPeriod}): ${item.atr} (${item.atrPercent}%)！`
        );
        setInputValue('');
        setIsOpenDropdown(false);
        setActiveHighlightIndex(-1);
        return;
      }
    } catch (e) {
      console.warn('Realtime fetch failed, falling back to local market database:', e);
    } finally {
      setIsLoadingApi(false);
    }

    // 兜底本地知识库
    const newEtf = buildEtfFromInput(codeOrName, atrPeriod);
    newEtf.isCustom = true;
    newEtf.badge = '新输入显示';
    onAddOrShowEtf(
      newEtf,
      `成功添加并显示「${newEtf.code} ${newEtf.name}」，ATR(${atrPeriod}): ${newEtf.atr} (${newEtf.atrPercent}%)！`
    );

    setInputValue('');
    setIsOpenDropdown(false);
    setActiveHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveHighlightIndex((prev) =>
        prev < suggestions.length ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (
        activeHighlightIndex >= 0 &&
        activeHighlightIndex < suggestions.length
      ) {
        handleSelectOrAdd(suggestions[activeHighlightIndex].item.code);
      } else if (inputValue.trim()) {
        handleSelectOrAdd(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpenDropdown(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-rose-100 p-3.5 mb-4 shadow-xs relative overflow-visible"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Title / Label */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 whitespace-nowrap">
          <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-900">输入基金名称或代码显示</span>
            <span className="hidden sm:inline-block ml-1.5 text-[11px] font-normal text-slate-400">
              (支持6位代码或中文简称，按回车即刻计算ATR并显示在看板)
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative flex-1">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="quick-fund-input"
                type="text"
                placeholder="例如输入: 513050、军工ETF、游戏、半导体、纳指、白酒..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setIsOpenDropdown(true);
                  setActiveHighlightIndex(-1);
                }}
                onFocus={() => {
                  if (inputValue.trim()) setIsOpenDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setIsOpenDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              id="btn-quick-display"
              type="button"
              disabled={!inputValue.trim() || isLoadingApi}
              onClick={() => {
                if (inputValue.trim()) {
                  handleSelectOrAdd(inputValue.trim());
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium text-xs inline-flex items-center gap-1.5 transition-all whitespace-nowrap ${
                inputValue.trim() && !isLoadingApi
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoadingApi ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-rose-600 rounded-full animate-spin" />
                  <span>查询实时行情...</span>
                </>
              ) : (
                <>
                  <span>立即显示</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpenDropdown && inputValue.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map((s, index) => {
                  const isHighlighted = activeHighlightIndex === index;
                  return (
                    <div
                      key={s.item.code}
                      onClick={() => handleSelectOrAdd(s.item.code)}
                      onMouseEnter={() => setActiveHighlightIndex(index)}
                      className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-rose-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {s.item.code}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {s.item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          {s.item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[11px]">
                          参考现价 ¥{s.item.price.toFixed(3)}
                        </span>
                        {s.inCurrentList ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-100">
                            <Check className="w-3 h-3" />
                            已在看板
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-100">
                            <Plus className="w-3 h-3" />
                            显示到看板
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : null}

              {/* Custom input addition option */}
              <div
                onClick={() => handleSelectOrAdd(inputValue.trim())}
                className="px-3.5 py-2.5 bg-slate-50/90 hover:bg-rose-50 cursor-pointer flex items-center justify-between transition-colors border-t border-slate-100"
              >
                <div className="flex items-center gap-2 text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    智能计算并显示：
                    <strong className="text-rose-600 font-semibold font-mono ml-1">
                      「{inputValue.trim()}」
                    </strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">按 Enter 或点击即刻生成显示 ↵</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popular Quick-Add Chips */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-slate-400 text-[11px] flex items-center gap-1 mr-1">
          <TrendingUp className="w-3 h-3 text-rose-500" />
          热门标的快捷显示:
        </span>
        {POPULAR_QUICK_TAGS.map((tag) => {
          const isAlreadyIn = currentCodes.has(tag.code);
          return (
            <button
              key={tag.code}
              id={`quick-tag-${tag.code}`}
              type="button"
              onClick={() => handleSelectOrAdd(tag.code)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] transition-colors border ${
                isAlreadyIn
                  ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  : 'bg-rose-50/60 text-rose-700 border-rose-200/70 hover:bg-rose-100 hover:border-rose-300 font-medium'
              }`}
              title={isAlreadyIn ? '已在列表中，点击聚焦查看' : '点击添加并显示到当前看板'}
            >
              <span>{tag.name}</span>
              <span className="font-mono text-[10px] text-slate-400">({tag.code})</span>
              {isAlreadyIn ? (
                <Check className="w-2.5 h-2.5 text-emerald-500 ml-0.5" />
              ) : (
                <Plus className="w-2.5 h-2.5 text-rose-500 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
