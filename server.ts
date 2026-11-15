import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if not supported
}

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAllRealtimeEtfs,
  getSingleRealtimeEtf,
  fetchBatchQuotes,
  fetchRealKlines,
  getMarketSymbol,
  CORE_ETF_LIST,
} from './server/etfService';
import { AtrPeriod } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 路由 FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 获取全部主流 ETF 真实实时行情及 ATR 统计
  app.get('/api/realtime-etfs', async (req, res) => {
    try {
      const period = (parseInt(req.query.period as string) || 14) as AtrPeriod;
      const data = await getAllRealtimeEtfs(period);
      res.json({
        success: true,
        source: 'Tencent Finance / Shanghai & Shenzhen Stock Exchange',
        period,
        count: data.length,
        timestamp: new Date().toISOString(),
        data,
      });
    } catch (err: any) {
      console.error('API Error /api/realtime-etfs:', err);
      res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
  });

  // 获取单个 ETF（支持任意 A 股 ETF 代码）的真实实时行情和 ATR
  app.get('/api/etf-quote', async (req, res) => {
    try {
      const code = (req.query.code as string || '').trim();
      const period = (parseInt(req.query.period as string) || 14) as AtrPeriod;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Code is required' });
      }

      const item = await getSingleRealtimeEtf(code, period);
      if (!item) {
        return res.status(404).json({ success: false, error: `标的代码 ${code} 未找到真实行情` });
      }

      res.json({
        success: true,
        item,
      });
    } catch (err: any) {
      console.error(`API Error /api/etf-quote for ${req.query.code}:`, err);
      res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
  });

  // 获取指定 ETF 的 140 日前复权 (QFQ) 日 K 线及 120 日极值/MA120
  app.get('/api/etf-kline', async (req, res) => {
    try {
      const code = (req.query.code as string || '').trim();
      if (!code) {
        return res.status(400).json({ success: false, error: 'Code is required' });
      }
      const sym = getMarketSymbol(code);
      const klines = await fetchRealKlines(sym);
      const last120 = klines.slice(-120);
      const highs = last120.map((c) => c.high).filter((h) => h > 0);
      const lows = last120.map((c) => c.low).filter((l) => l > 0);
      const closes = last120.map((c) => c.close).filter((cl) => cl > 0);
      const high120d = highs.length > 0 ? Number(Math.max(...highs).toFixed(3)) : 0;
      const low120d = lows.length > 0 ? Number(Math.min(...lows).toFixed(3)) : 0;
      const ma120 = closes.length > 0 ? Number((closes.reduce((a, b) => a + b, 0) / closes.length).toFixed(3)) : 0;

      res.json({
        success: true,
        code,
        symbol: sym,
        count: klines.length,
        high120d,
        low120d,
        ma120,
        klines,
      });
    } catch (err: any) {
      console.error(`API Error /api/etf-kline:`, err);
      res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
  });

  // 快速轻量刷新最新行情报价
  app.get('/api/quotes-lite', async (req, res) => {
    try {
      const codesParam = (req.query.codes as string || '').trim();
      const codes = codesParam ? codesParam.split(',') : CORE_ETF_LIST.map((m) => m.code);
      const symbols = codes.map((c) => getMarketSymbol(c));
      const quotesMap = await fetchBatchQuotes(symbols);

      const quotesObj: Record<string, any> = {};
      quotesMap.forEach((val, key) => {
        quotesObj[val.code] = val;
      });

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        quotes: quotesObj,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Vite 开发中间件与生产静态托管
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ETF Realtime ATR Server running on http://localhost:${PORT}`);
  });
}

startServer();
