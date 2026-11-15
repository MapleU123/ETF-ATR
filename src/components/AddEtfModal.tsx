import React, { useState } from 'react';
import { X, PlusCircle, Sparkles } from 'lucide-react';
import { EtfCategory, EtfItem, AtrPeriod } from '../types';
import { enrichEtfItem } from '../utils/atrCalculator';
import { ALL_MARKET_ETFS, generateCandleHistory } from '../data/allMarketEtfs';

interface AddEtfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newEtf: EtfItem) => void;
  atrPeriod: AtrPeriod;
}

export const AddEtfModal: React.FC<AddEtfModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  atrPeriod,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EtfCategory>('宽基指数');
  const [price, setPrice] = useState<string>('1.000');
  const [prevClose, setPrevClose] = useState<string>('1.000');
  const [high, setHigh] = useState<string>('1.020');
  const [low, setLow] = useState<string>('0.990');
  const [volumeAmount, setVolumeAmount] = useState<string>('15.0');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);

  if (!isOpen) return null;

  const handleAutoFill = async (searchKey?: string) => {
    const key = (searchKey || code || name).trim();
    if (!key) return;

    const matched = ALL_MARKET_ETFS.find(
      (m) => m.code === key || m.name.toLowerCase().includes(key.toLowerCase())
    );
    const targetCode = matched ? matched.code : key;

    setIsLoadingRealtime(true);
    try {
      const res = await fetch(`/api/etf-quote?code=${encodeURIComponent(targetCode)}&period=${atrPeriod}`);
      const data = await res.json();
      if (data.success && data.item) {
        const it = data.item;
        setCode(it.code);
        setName(it.name);
        setCategory(it.category);
        setPrice(it.price.toFixed(3));
        setPrevClose(it.prevClose.toFixed(3));
        setHigh(it.high.toFixed(3));
        setLow(it.low.toFixed(3));
        setVolumeAmount(it.volumeAmount.toFixed(1));
        setError(null);
        return;
      }
    } catch (e) {
      console.warn('Realtime fetch in modal failed, fallback to local database:', e);
    } finally {
      setIsLoadingRealtime(false);
    }

    if (matched) {
      setCode(matched.code);
      setName(matched.name);
      setCategory(matched.category);
      setPrice(matched.price.toFixed(3));
      setPrevClose(matched.prevClose.toFixed(3));
      setHigh(matched.high.toFixed(3));
      setLow(matched.low.toFixed(3));
      setVolumeAmount(matched.volumeAmount.toFixed(1));
      setError(null);
    } else {
      setError(`未在市场库中找到「${key}」，您可以手动填入参数创建`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('请完整输入ETF代码和名称');
      return;
    }

    const numPrice = parseFloat(price);
    const numPrevClose = parseFloat(prevClose);
    const numHigh = parseFloat(high);
    const numLow = parseFloat(low);
    const numVolume = parseFloat(volumeAmount) || 10;

    if (isNaN(numPrice) || numPrice <= 0) {
      setError('请输入有效的最新价格');
      return;
    }

    const change = Number((numPrice - numPrevClose).toFixed(3));
    const changePercent = Number(((change / numPrevClose) * 100).toFixed(2));

    // 生成更加符合真实波动的历史
    const history = generateCandleHistory(numPrice, 2.8, changePercent >= 0 ? 1 : -1);
    if (history.length > 0) {
      history[history.length - 1] = {
        date: '今日',
        open: numPrevClose,
        high: numHigh,
        low: numLow,
        close: numPrice,
      };
    }

    const enriched = enrichEtfItem(
      {
        id: `custom-${code}-${Date.now()}`,
        code: code.trim(),
        name: name.trim(),
        category,
        price: numPrice,
        change,
        changePercent,
        high: numHigh,
        low: numLow,
        prevClose: numPrevClose,
        volumeAmount: numVolume,
        history,
        selected: true,
        isCustom: true,
        badge: '自定义标的',
      },
      atrPeriod
    );

    onAdd(enriched);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-sm">添加自定义 A股ETF</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                ETF代码 (6位)：
              </label>
              <input
                type="text"
                placeholder="例如 510300"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                ETF简称：
              </label>
              <input
                type="text"
                placeholder="例如 沪深300ETF"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={isLoadingRealtime}
              onClick={() => handleAutoFill()}
              className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoadingRealtime ? 'animate-spin' : ''}`} />
              <span>{isLoadingRealtime ? '正在拉取实时行情...' : '根据输入代码/名称自动拉取真实实时行情'}</span>
            </button>
            <div className="flex items-center gap-1">
              {['513050', '588000', '159869'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleAutoFill(c)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer font-mono"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">
              所属分类：
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EtfCategory)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="半导体">半导体</option>
              <option value="通信">通信</option>
              <option value="创新药">创新药</option>
              <option value="医药">医药</option>
              <option value="军工">军工</option>
              <option value="人工智能/软件">人工智能/软件</option>
              <option value="新能源/电力">新能源/电力</option>
              <option value="机械制造">机械制造</option>
              <option value="消费">消费</option>
              <option value="金融地产">金融地产</option>
              <option value="红利低波">红利低波</option>
              <option value="周期资源">周期资源</option>
              <option value="传媒娱乐">传媒娱乐</option>
              <option value="宽基指数">宽基指数</option>
              <option value="跨境海外">跨境海外</option>
              <option value="大宗商品">大宗商品</option>
              <option value="债券货币">债券货币</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                最新现价 (¥)：
              </label>
              <input
                type="number"
                step="0.001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                昨日收盘价 (¥)：
              </label>
              <input
                type="number"
                step="0.001"
                value={prevClose}
                onChange={(e) => setPrevClose(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                今日最高价 (¥)：
              </label>
              <input
                type="number"
                step="0.001"
                value={high}
                onChange={(e) => setHigh(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                今日最低价 (¥)：
              </label>
              <input
                type="number"
                step="0.001"
                value={low}
                onChange={(e) => setLow(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">
              成交额 (亿元)：
            </label>
            <input
              type="number"
              step="0.1"
              value={volumeAmount}
              onChange={(e) => setVolumeAmount(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              确认添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
