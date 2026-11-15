import { EtfItem, ExportConfig, GridItemConfig } from '../types';
import { formatAmount } from './atrCalculator';
import { calculateGridItem } from './gridCalculator';

export interface RenderedExportResult {
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  effectiveRatio: number;
}

interface ThemePalette {
  bg: string;
  border: string;
  headerBg: string;
  headerBgEnd?: string;
  titleColor: string;
  subtitleColor: string;
  badgeBg: string;
  badgeText: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  tableHeaderBorder: string;
  rowBorder: string;
  rowAltBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  statCardBg: string;
  statCardBorder: string;
  footerBg: string;
  footerBorder: string;
  footerText: string;
  upBg: string;
  upText: string;
  upBorder: string;
  downBg: string;
  downText: string;
  downBorder: string;
  accentRose: string;
  accentGreen: string;
  pillBg: string;
  pillText: string;
}

function getPalette(theme: ExportConfig['theme']): ThemePalette {
  switch (theme) {
    case 'dark':
      return {
        bg: '#090d16',
        border: '#1e293b',
        headerBg: '#0f172a',
        titleColor: '#ffffff',
        subtitleColor: '#94a3b8',
        badgeBg: 'rgba(255,255,255,0.16)',
        badgeText: '#ffffff',
        tableHeaderBg: '#1e293b',
        tableHeaderText: '#e2e8f0',
        tableHeaderBorder: '#334155',
        rowBorder: 'rgba(30,41,59,0.85)',
        rowAltBg: 'rgba(15,23,42,0.45)',
        textPrimary: '#f1f5f9',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        statCardBg: '#131d31',
        statCardBorder: '#1e293b',
        footerBg: '#0d1527',
        footerBorder: '#1e293b',
        footerText: '#94a3b8',
        upBg: 'rgba(69,10,10,0.75)',
        upText: '#fca5a5',
        upBorder: 'rgba(153,27,27,0.6)',
        downBg: 'rgba(2,44,34,0.75)',
        downText: '#6ee7b7',
        downBorder: 'rgba(6,95,70,0.6)',
        accentRose: '#fb7185',
        accentGreen: '#34d399',
        pillBg: 'rgba(148,163,184,0.18)',
        pillText: '#e2e8f0',
      };
    case 'paper':
      return {
        bg: '#faf8f4',
        border: '#e5dfd5',
        headerBg: '#f4efe6',
        titleColor: '#1e1c1b',
        subtitleColor: '#6e6863',
        badgeBg: 'rgba(44,42,41,0.08)',
        badgeText: '#2c2a29',
        tableHeaderBg: '#ede6d8',
        tableHeaderText: '#4a443f',
        tableHeaderBorder: '#ded7ca',
        rowBorder: '#ede7dc',
        rowAltBg: 'rgba(244,239,230,0.45)',
        textPrimary: '#2c2a29',
        textSecondary: '#4a443f',
        textMuted: '#6e6863',
        statCardBg: '#ffffff',
        statCardBorder: '#e5dfd5',
        footerBg: '#f4efe6',
        footerBorder: '#ded7ca',
        footerText: '#6e6863',
        upBg: '#fef2f2',
        upText: '#b91c1c',
        upBorder: '#fecaca',
        downBg: '#ecfdf5',
        downText: '#065f46',
        downBorder: '#a7f3d0',
        accentRose: '#e11d48',
        accentGreen: '#047857',
        pillBg: 'rgba(110,104,99,0.12)',
        pillText: '#4a443f',
      };
    case 'bullish':
      return {
        bg: '#ffffff',
        border: '#fecaca',
        headerBg: '#dc2626',
        headerBgEnd: '#be123c',
        titleColor: '#ffffff',
        subtitleColor: '#ffe4e6',
        badgeBg: 'rgba(255,255,255,0.2)',
        badgeText: '#ffffff',
        tableHeaderBg: '#fff1f2',
        tableHeaderText: '#881337',
        tableHeaderBorder: '#fecdd3',
        rowBorder: '#f1f5f9',
        rowAltBg: 'rgba(255,241,242,0.35)',
        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        statCardBg: 'rgba(255,241,242,0.65)',
        statCardBorder: '#ffe4e6',
        footerBg: '#881337',
        footerBorder: '#9f1239',
        footerText: '#ffe4e6',
        upBg: '#fef2f2',
        upText: '#dc2626',
        upBorder: '#fecaca',
        downBg: '#ecfdf5',
        downText: '#059669',
        downBorder: '#a7f3d0',
        accentRose: '#e11d48',
        accentGreen: '#047857',
        pillBg: '#f1f5f9',
        pillText: '#334155',
      };
    case 'light':
    default:
      return {
        bg: '#ffffff',
        border: '#e2e8f0',
        headerBg: '#0f172a',
        titleColor: '#ffffff',
        subtitleColor: '#cbd5e1',
        badgeBg: 'rgba(255,255,255,0.2)',
        badgeText: '#ffffff',
        tableHeaderBg: '#f1f5f9',
        tableHeaderText: '#334155',
        tableHeaderBorder: '#e2e8f0',
        rowBorder: '#f1f5f9',
        rowAltBg: '#f8fafc',
        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        statCardBg: '#f8fafc',
        statCardBorder: '#e2e8f0',
        footerBg: '#f8fafc',
        footerBorder: '#e2e8f0',
        footerText: '#64748b',
        upBg: '#fef2f2',
        upText: '#dc2626',
        upBorder: '#fecaca',
        downBg: '#ecfdf5',
        downText: '#059669',
        downBorder: '#a7f3d0',
        accentRose: '#e11d48',
        accentGreen: '#047857',
        pillBg: '#e2e8f0',
        pillText: '#334155',
      };
  }
}

const SANS_FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  const ellipsis = '…';
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo > 0 ? text.slice(0, lo) + ellipsis : ellipsis;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) {
        const rest = text.slice(i);
        lines[lines.length - 1] = fitText(ctx, lines[lines.length - 1] + rest, maxWidth);
        return lines;
      }
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderExportCardToBlob(params: {
  etfs: EtfItem[];
  config: ExportConfig;
  gridItems?: GridItemConfig[];
  format: 'png' | 'jpeg';
}): Promise<RenderedExportResult> {
  const { etfs, config, gridItems, format } = params;
  const palette = getPalette(config.theme);

  const selectedEtfs = etfs.filter((e) => e.selected);
  const displayEtfs =
    config.selectedOnly && selectedEtfs.length > 0 ? selectedEtfs : etfs;

  const isPaginatedLayout =
    config.layout === 'full_table' ||
    config.layout === 'grid_trading' ||
    config.layout === 'turtle_strategy';
  const pageSize = Math.max(10, Math.min(80, config.pageSize || 50));

  let totalItems = displayEtfs.length;
  let displayGridItems: GridItemConfig[] | undefined;

  if (config.layout === 'grid_trading') {
    if (gridItems && gridItems.length > 0) {
      if (config.selectedOnly && selectedEtfs.length > 0) {
        const selectedIds = new Set(selectedEtfs.map((e) => e.id));
        displayGridItems = gridItems.filter((g) => selectedIds.has(g.id));
      } else {
        displayGridItems = gridItems;
      }
      totalItems = displayGridItems.length;
    } else {
      totalItems = displayEtfs.length;
    }
  }

  const totalPages = isPaginatedLayout ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const currentPage = Math.min(Math.max(1, config.page || 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const pagedEtfs = isPaginatedLayout ? displayEtfs.slice(startIndex, endIndex) : displayEtfs;
  const pagedGridItems: GridItemConfig[] =
    config.layout === 'grid_trading'
      ? displayGridItems
        ? displayGridItems.slice(startIndex, endIndex)
        : pagedEtfs.map((item) =>
            calculateGridItem(item, 1.0, 20, undefined, true, 'kline_120d')
          )
      : [];

  // Measure dynamic heights using a scratch canvas context
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;

  const CARD_WIDTH = 920;
  const PAD_X = 24;
  const INNER_W = CARD_WIDTH - PAD_X * 2; // 872

  mctx.font = `900 24px ${SANS_FONT}`;
  const titleMaxW = config.enableWatermark && config.showHeaderBadge ? 600 : INNER_W;
  const titleLines = wrapTextLines(mctx, config.title || 'A股ETF量化日报', titleMaxW, 2);

  mctx.font = `400 12px ${SANS_FONT}`;
  const subLines = wrapTextLines(mctx, config.subTitle || '', Math.min(600, titleMaxW), 2);

  const headerHeight = 24 + 22 + 8 + titleLines.length * 30 + (subLines.length > 0 ? 6 + subLines.length * 17 : 0) + 22;
  const footerHeight = config.enableWatermark && config.showBottomBanner ? 68 : 44;

  let bodyHeight = 0;
  const ROW_H = 44;
  const GRID_ROW_H = 46;
  const HEADER_ROW_H = 38;

  if (config.layout === 'full_table') {
    bodyHeight = HEADER_ROW_H + Math.max(1, pagedEtfs.length) * ROW_H + 2;
  } else if (config.layout === 'grid_trading') {
    bodyHeight = 76 + 16 + 44 + Math.max(1, pagedGridItems.length) * GRID_ROW_H + 2;
  } else if (config.layout === 'top_highlights') {
    bodyHeight = 46 + 5 * 58 + 16;
  } else if (config.layout === 'turtle_strategy') {
    bodyHeight = 76 + 16 + HEADER_ROW_H + Math.max(1, pagedEtfs.length) * ROW_H + 2;
  } else {
    bodyHeight = 200;
  }

  const naturalHeight = headerHeight + PAD_X + bodyHeight + PAD_X + footerHeight;
  const aspectRatio = config.aspectRatio || 'auto';
  const targetAspectHeight =
    aspectRatio === '9:16'
      ? Math.round((CARD_WIDTH * 16) / 9) // 1636
      : aspectRatio === '3:4'
      ? Math.round((CARD_WIDTH * 4) / 3) // 1227
      : naturalHeight;

  const needsScaleToFit = aspectRatio !== 'auto' && naturalHeight > targetAspectHeight;
  const totalHeight = needsScaleToFit ? naturalHeight : targetAspectHeight;

  const requestedRatio = config.pixelRatio || 2;
  const maxDimHeight = needsScaleToFit ? Math.max(totalHeight, targetAspectHeight) : totalHeight;
  const maxSafeRatio = Math.max(
    1,
    Math.floor(Math.min(16000 / maxDimHeight, 16000 / CARD_WIDTH) * 100) / 100
  );
  const effectiveRatio = Math.min(requestedRatio, maxSafeRatio);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(CARD_WIDTH * effectiveRatio);
  canvas.height = Math.round(totalHeight * effectiveRatio);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire 2D canvas context');

  ctx.scale(effectiveRatio, effectiveRatio);
  ctx.textBaseline = 'middle';

  // Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, totalHeight);

  // Header Banner
  if (palette.headerBgEnd) {
    const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);
    grad.addColorStop(0, palette.headerBg);
    grad.addColorStop(1, palette.headerBgEnd);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = palette.headerBg;
  }
  ctx.fillRect(0, 0, CARD_WIDTH, headerHeight);

  // Header Top Pills
  let cursorX = PAD_X;
  const pillY = 33;

  ctx.font = `700 11px ${SANS_FONT}`;
  const tagText = 'A股市场量化数据';
  const tagW = ctx.measureText(tagText).width + 20;
  roundRectPath(ctx, cursorX, pillY - 10, tagW, 20, 10);
  ctx.fillStyle = palette.badgeBg;
  ctx.fill();
  ctx.fillStyle = palette.badgeText;
  ctx.fillText(tagText, cursorX + 10, pillY);
  cursorX += tagW + 10;

  ctx.font = `500 12px ${SANS_FONT}`;
  ctx.fillStyle = palette.subtitleColor;
  ctx.fillText(config.dateStr, cursorX, pillY);
  cursorX += ctx.measureText(config.dateStr).width + 10;

  if (isPaginatedLayout && totalPages > 1) {
    const pageLabel = `第 ${currentPage}/${totalPages} 页 · 第 ${startIndex + 1}-${endIndex} / 共 ${totalItems} 只`;
    ctx.font = `700 11px ${MONO_FONT}`;
    const pw = ctx.measureText(pageLabel).width + 16;
    roundRectPath(ctx, cursorX, pillY - 10, pw, 20, 5);
    ctx.fillStyle = palette.badgeBg;
    ctx.fill();
    ctx.fillStyle = palette.badgeText;
    ctx.fillText(pageLabel, cursorX + 8, pillY);
  }

  // Header Watermark Badge (Right side)
  if (config.enableWatermark && config.showHeaderBadge && config.watermarkText) {
    ctx.font = `700 12px ${SANS_FONT}`;
    const wmText = fitText(ctx, config.watermarkText, 210);
    const badgeW = Math.max(110, ctx.measureText(wmText).width + 42);
    const bx = CARD_WIDTH - PAD_X - badgeW;
    const by = 24;
    roundRectPath(ctx, bx, by, badgeW, 30, 8);
    ctx.fillStyle = palette.badgeBg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Shield icon dot
    ctx.beginPath();
    ctx.arc(bx + 15, by + 15, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fda4af';
    ctx.fill();

    ctx.fillStyle = palette.badgeText;
    ctx.fillText(wmText, bx + 26, by + 15.5);

    ctx.font = `400 10px ${SANS_FONT}`;
    ctx.fillStyle = palette.subtitleColor;
    const subTag = '权威波动率追踪与量化策略';
    const stW = ctx.measureText(subTag).width;
    ctx.fillText(subTag, CARD_WIDTH - PAD_X - stW, by + 42);
  }

  // Title & Subtitle
  let textY = 58;
  ctx.font = `900 23px ${SANS_FONT}`;
  ctx.fillStyle = palette.titleColor;
  for (const line of titleLines) {
    ctx.fillText(line, PAD_X, textY);
    textY += 30;
  }

  if (subLines.length > 0) {
    textY -= 4;
    ctx.font = `400 12px ${SANS_FONT}`;
    ctx.fillStyle = palette.subtitleColor;
    for (const line of subLines) {
      ctx.fillText(line, PAD_X, textY);
      textY += 17;
    }
  }

  // Body Container Origin
  let bodyY = headerHeight + PAD_X;

  // === LAYOUT 1: full_table ===
  if (config.layout === 'full_table') {
    const cols = [
      { label: '#', w: 30, align: 'center' as const },
      { label: '代码 / ETF名称', w: 165, align: 'left' as const },
      { label: '行业类别', w: 72, align: 'center' as const },
      { label: '基金规模', w: 60, align: 'center' as const },
      { label: '现价(¥)', w: 62, align: 'right' as const },
      { label: '涨跌幅', w: 68, align: 'right' as const },
      { label: 'TR真实波幅', w: 64, align: 'right' as const },
      { label: `ATR(${config.atrPeriod || 14}天)`, w: 74, align: 'right' as const },
      { label: `ATR(${config.atrPeriod || 14}天)%`, w: 78, align: 'right' as const, color: palette.accentRose },
      { label: '海龟1N', w: 65, align: 'right' as const },
      { label: '2N止损位', w: 64, align: 'right' as const },
      { label: '成交额', w: 70, align: 'right' as const },
    ];

    const tableH = HEADER_ROW_H + Math.max(1, pagedEtfs.length) * ROW_H;
    ctx.save();
    roundRectPath(ctx, PAD_X, bodyY, INNER_W, tableH, 8);
    ctx.clip();

    // Table Header
    ctx.fillStyle = palette.tableHeaderBg;
    ctx.fillRect(PAD_X, bodyY, INNER_W, HEADER_ROW_H);
    ctx.strokeStyle = palette.tableHeaderBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_X, bodyY + HEADER_ROW_H);
    ctx.lineTo(PAD_X + INNER_W, bodyY + HEADER_ROW_H);
    ctx.stroke();

    let cx = PAD_X;
    ctx.font = `700 11px ${SANS_FONT}`;
    for (const col of cols) {
      ctx.fillStyle = col.color || palette.tableHeaderText;
      const pad = 6;
      if (col.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(col.label, cx + col.w / 2, bodyY + HEADER_ROW_H / 2);
      } else if (col.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(col.label, cx + col.w - pad, bodyY + HEADER_ROW_H / 2);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(col.label, cx + pad, bodyY + HEADER_ROW_H / 2);
      }
      cx += col.w;
    }

    // Rows
    pagedEtfs.forEach((item, idx) => {
      const ry = bodyY + HEADER_ROW_H + idx * ROW_H;
      if (idx % 2 === 1) {
        ctx.fillStyle = palette.rowAltBg;
        ctx.fillRect(PAD_X, ry, INNER_W, ROW_H);
      }
      ctx.strokeStyle = palette.rowBorder;
      ctx.beginPath();
      ctx.moveTo(PAD_X, ry + ROW_H);
      ctx.lineTo(PAD_X + INNER_W, ry + ROW_H);
      ctx.stroke();

      let rx = PAD_X;
      const midY = ry + ROW_H / 2;
      const isUp = item.change >= 0;

      // 0: #
      ctx.textAlign = 'center';
      ctx.font = `500 11px ${MONO_FONT}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(String(startIndex + idx + 1), rx + cols[0].w / 2, midY);
      rx += cols[0].w;

      // 1: Name + Code
      ctx.textAlign = 'left';
      ctx.font = `600 12px ${SANS_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      const nameMaxW = cols[1].w - (item.isAboveHistoricalAvg ? 62 : 12);
      const nameStr = fitText(ctx, item.name, nameMaxW);
      ctx.fillText(nameStr, rx + 6, ry + 15);
      if (item.isAboveHistoricalAvg) {
        const nw = ctx.measureText(nameStr).width;
        const bx = rx + 6 + nw + 4;
        roundRectPath(ctx, bx, ry + 8, 52, 14, 3);
        ctx.fillStyle = 'rgba(244,63,94,0.14)';
        ctx.fill();
        ctx.font = `700 9px ${SANS_FONT}`;
        ctx.fillStyle = palette.accentRose;
        ctx.fillText('超20日均', bx + 4, ry + 15);
      }
      ctx.font = `400 10px ${MONO_FONT}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(item.code, rx + 6, ry + 31);
      rx += cols[1].w;

      // 2: Category pill
      ctx.font = `500 10px ${SANS_FONT}`;
      const catText = fitText(ctx, item.category || '--', cols[2].w - 10);
      const catW = Math.min(cols[2].w - 6, ctx.measureText(catText).width + 10);
      roundRectPath(ctx, rx + (cols[2].w - catW) / 2, midY - 9, catW, 18, 4);
      ctx.fillStyle = palette.pillBg;
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.pillText;
      ctx.fillText(catText, rx + cols[2].w / 2, midY);
      rx += cols[2].w;

      // 3: Scale
      ctx.textAlign = 'center';
      ctx.font = `400 11px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(fitText(ctx, item.scaleText || '--', cols[3].w - 6), rx + cols[3].w / 2, midY);
      rx += cols[3].w;

      // 4: Price
      ctx.textAlign = 'right';
      ctx.font = `500 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(`¥${item.price.toFixed(3)}`, rx + cols[4].w - 6, midY);
      rx += cols[4].w;

      // 5: Change % badge
      const chgText = `${isUp ? '+' : ''}${item.changePercent.toFixed(2)}%`;
      ctx.font = `700 11px ${MONO_FONT}`;
      const chgW = Math.min(cols[5].w - 8, ctx.measureText(chgText).width + 10);
      const chgX = rx + cols[5].w - 6 - chgW;
      roundRectPath(ctx, chgX, midY - 9, chgW, 18, 4);
      ctx.fillStyle = isUp ? palette.upBg : palette.downBg;
      ctx.fill();
      ctx.strokeStyle = isUp ? palette.upBorder : palette.downBorder;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = isUp ? palette.upText : palette.downText;
      ctx.fillText(chgText, rx + cols[5].w - 11, midY);
      rx += cols[5].w;

      // 6: TR
      ctx.font = `400 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(`¥${item.tr.toFixed(3)}`, rx + cols[6].w - 6, midY);
      rx += cols[6].w;

      // 7: ATR
      ctx.font = `700 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(`¥${item.atr.toFixed(3)}`, rx + cols[7].w - 6, midY);
      rx += cols[7].w;

      // 8: ATR %
      ctx.font = `700 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.accentRose;
      ctx.fillText(`${item.atrPercent.toFixed(2)}%`, rx + cols[8].w - 6, midY);
      rx += cols[8].w;

      // 9: 1N
      ctx.font = `400 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(`¥${item.turtleUnitN.toFixed(1)}`, rx + cols[9].w - 6, midY);
      rx += cols[9].w;

      // 10: 2N stop
      ctx.fillText(`¥${item.stopLossPrice.toFixed(3)}`, rx + cols[10].w - 6, midY);
      rx += cols[10].w;

      // 11: Amount
      ctx.fillText(formatAmount(item.volumeAmount), rx + cols[11].w - 6, midY);
    });

    ctx.restore();
    roundRectPath(ctx, PAD_X, bodyY, INNER_W, tableH, 8);
    ctx.strokeStyle = palette.tableHeaderBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
  }

  // === LAYOUT 2: grid_trading ===
  if (config.layout === 'grid_trading') {
    // Summary note box
    roundRectPath(ctx, PAD_X, bodyY, INNER_W, 76, 10);
    ctx.fillStyle = palette.statCardBg;
    ctx.fill();
    ctx.strokeStyle = palette.statCardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    roundRectPath(ctx, PAD_X + 14, bodyY + 20, 36, 36, 8);
    ctx.fillStyle = 'rgba(244,63,94,0.12)';
    ctx.fill();
    ctx.strokeStyle = palette.accentRose;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(PAD_X + 24, bodyY + 30, 16, 16);

    ctx.textAlign = 'left';
    ctx.font = `700 12px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.fillText('网格交易量化核心原则（ATR动态定距）：', PAD_X + 62, bodyY + 20);
    ctx.font = `400 11px ${SANS_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(
      `1. 网格间距(%)严格锚定该ETF的ATR(${config.atrPeriod || 14}天)真实波幅，兼顾成交胜率与净利润；`,
      PAD_X + 62,
      bodyY + 40
    );
    ctx.fillText(
      '2. 基准价作为初始建仓中轴，最高价/最低价定义震荡箱体边界，跌买涨卖。',
      PAD_X + 62,
      bodyY + 57
    );

    ctx.textAlign = 'right';
    ctx.font = `400 10px ${SANS_FONT}`;
    ctx.fillStyle = palette.textMuted;
    ctx.fillText(
      totalPages > 1 ? `本页第 ${startIndex + 1}-${endIndex} 只` : '标的覆盖数量',
      PAD_X + INNER_W - 16,
      bodyY + 26
    );
    ctx.font = `900 16px ${MONO_FONT}`;
    ctx.fillStyle = palette.accentRose;
    ctx.fillText(`${totalItems} 只ETF`, PAD_X + INNER_W - 16, bodyY + 48);

    const tableY = bodyY + 76 + 16;
    const cols = [
      { label: '#', w: 30, align: 'center' as const },
      { label: '基金名称', w: 144, align: 'left' as const },
      { label: '基金代码', w: 68, align: 'left' as const },
      { label: '最高价(¥)', sub: '网格上限', w: 92, align: 'right' as const, color: '#dc2626' },
      { label: '最低价(¥)', sub: '网格下限', w: 92, align: 'right' as const, color: palette.accentGreen },
      { label: '基准价(¥)', w: 76, align: 'right' as const },
      { label: '网格间距(%)', sub: '0.5%倍数', w: 128, align: 'right' as const, color: palette.accentRose },
      { label: '单格差价(¥)', w: 80, align: 'right' as const },
      { label: '预估总格数', w: 78, align: 'center' as const },
      { label: '参考现价(¥)', w: 84, align: 'right' as const },
    ];

    const tableH = 44 + Math.max(1, pagedGridItems.length) * GRID_ROW_H;
    ctx.save();
    roundRectPath(ctx, PAD_X, tableY, INNER_W, tableH, 8);
    ctx.clip();

    ctx.fillStyle = palette.tableHeaderBg;
    ctx.fillRect(PAD_X, tableY, INNER_W, 44);
    ctx.strokeStyle = palette.tableHeaderBorder;
    ctx.beginPath();
    ctx.moveTo(PAD_X, tableY + 44);
    ctx.lineTo(PAD_X + INNER_W, tableY + 44);
    ctx.stroke();

    let cx = PAD_X;
    for (const col of cols) {
      ctx.fillStyle = col.color || palette.tableHeaderText;
      ctx.font = `700 11px ${SANS_FONT}`;
      const yMain = col.sub ? tableY + 15 : tableY + 22;
      if (col.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(col.label, cx + col.w / 2, yMain);
      } else if (col.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(col.label, cx + col.w - 8, yMain);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(col.label, cx + 8, yMain);
      }
      if (col.sub) {
        ctx.font = `400 9px ${SANS_FONT}`;
        ctx.fillStyle = palette.textMuted;
        if (col.align === 'right') {
          ctx.fillText(col.sub, cx + col.w - 8, tableY + 31);
        }
      }
      cx += col.w;
    }

    pagedGridItems.forEach((item, idx) => {
      const ry = tableY + 44 + idx * GRID_ROW_H;
      if (idx % 2 === 1) {
        ctx.fillStyle = palette.rowAltBg;
        ctx.fillRect(PAD_X, ry, INNER_W, GRID_ROW_H);
      }
      ctx.strokeStyle = palette.rowBorder;
      ctx.beginPath();
      ctx.moveTo(PAD_X, ry + GRID_ROW_H);
      ctx.lineTo(PAD_X + INNER_W, ry + GRID_ROW_H);
      ctx.stroke();

      let rx = PAD_X;
      const midY = ry + GRID_ROW_H / 2;

      ctx.textAlign = 'center';
      ctx.font = `500 11px ${MONO_FONT}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(String(startIndex + idx + 1), rx + cols[0].w / 2, midY);
      rx += cols[0].w;

      ctx.textAlign = 'left';
      ctx.font = `700 12px ${SANS_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(fitText(ctx, item.name, cols[1].w - 14), rx + 8, midY);
      rx += cols[1].w;

      ctx.font = `600 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(item.code, rx + 8, midY);
      rx += cols[2].w;

      ctx.textAlign = 'right';
      ctx.font = `700 12px ${MONO_FONT}`;
      ctx.fillStyle = '#dc2626';
      ctx.fillText(`¥${item.highPrice.toFixed(3)}`, rx + cols[3].w - 8, ry + 16);
      ctx.font = `400 9.5px ${SANS_FONT}`;
      ctx.fillStyle = 'rgba(220,38,38,0.75)';
      const highSub = item.isCustomized
        ? '自定义'
        : item.resistanceType || `+${(((item.highPrice - item.basePrice) / item.basePrice) * 100).toFixed(1)}%`;
      ctx.fillText(fitText(ctx, highSub, cols[3].w - 12), rx + cols[3].w - 8, ry + 33);
      rx += cols[3].w;

      ctx.font = `700 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.accentGreen;
      ctx.fillText(`¥${item.lowPrice.toFixed(3)}`, rx + cols[4].w - 8, ry + 16);
      ctx.font = `400 9.5px ${SANS_FONT}`;
      ctx.fillStyle = 'rgba(5,150,105,0.8)';
      const lowSub = item.isCustomized
        ? '自定义'
        : item.supportType || `${(((item.lowPrice - item.basePrice) / item.basePrice) * 100).toFixed(1)}%`;
      ctx.fillText(fitText(ctx, lowSub, cols[4].w - 12), rx + cols[4].w - 8, ry + 33);
      rx += cols[4].w;

      ctx.font = `700 12px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(`¥${item.basePrice.toFixed(3)}`, rx + cols[5].w - 8, midY);
      rx += cols[5].w;

      // Grid step pill
      const pctText = `${item.gridStepPercent % 0.5 === 0 ? item.gridStepPercent.toFixed(1) : item.gridStepPercent.toFixed(2)}%${item.isHalfMultiple ? ' 0.5x' : ''}`;
      ctx.font = `800 12px ${MONO_FONT}`;
      const pillW = Math.min(cols[6].w - 14, ctx.measureText(pctText).width + 16);
      roundRectPath(ctx, rx + cols[6].w - 8 - pillW, midY - 11, pillW, 22, 5);
      ctx.fillStyle = palette.upBg;
      ctx.fill();
      ctx.strokeStyle = palette.upBorder;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = palette.accentRose;
      ctx.fillText(pctText, rx + cols[6].w - 16, midY);
      rx += cols[6].w;

      ctx.font = `400 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(`¥${item.gridStepPrice.toFixed(3)}`, rx + cols[7].w - 8, midY);
      rx += cols[7].w;

      ctx.textAlign = 'center';
      ctx.font = `600 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(`${item.gridCount} 格`, rx + cols[8].w / 2, midY);
      rx += cols[8].w;

      ctx.textAlign = 'right';
      ctx.font = `400 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(`¥${item.price.toFixed(3)}`, rx + cols[9].w - 8, midY);
    });

    ctx.restore();
    roundRectPath(ctx, PAD_X, tableY, INNER_W, tableH, 8);
    ctx.strokeStyle = palette.tableHeaderBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
  }

  // === LAYOUT 3: top_highlights ===
  if (config.layout === 'top_highlights') {
    const sorted = [...displayEtfs].sort((a, b) => b.atrPercent - a.atrPercent);
    const topHigh = sorted.slice(0, 5);
    const topLow = [...sorted].reverse().slice(0, 5);
    const cardW = (INNER_W - 16) / 2;
    const cardH = bodyHeight;

    const drawTopCard = (
      items: EtfItem[],
      ox: number,
      title: string,
      sortHint: string,
      accent: string
    ) => {
      roundRectPath(ctx, ox, bodyY, cardW, cardH, 12);
      ctx.fillStyle = palette.statCardBg;
      ctx.fill();
      ctx.strokeStyle = palette.statCardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = `700 13px ${SANS_FONT}`;
      ctx.fillStyle = accent;
      ctx.fillText(title, ox + 16, bodyY + 24);

      ctx.textAlign = 'right';
      ctx.font = `400 10px ${MONO_FONT}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(sortHint, ox + cardW - 16, bodyY + 24);

      ctx.strokeStyle = palette.rowBorder;
      ctx.beginPath();
      ctx.moveTo(ox + 16, bodyY + 42);
      ctx.lineTo(ox + cardW - 16, bodyY + 42);
      ctx.stroke();

      items.forEach((item, i) => {
        const iy = bodyY + 46 + i * 58;
        if (i > 0) {
          ctx.strokeStyle = palette.rowBorder;
          ctx.beginPath();
          ctx.moveTo(ox + 16, iy);
          ctx.lineTo(ox + cardW - 16, iy);
          ctx.stroke();
        }
        // Rank circle
        ctx.beginPath();
        ctx.arc(ox + 25, iy + 20, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = `700 10px ${MONO_FONT}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(i + 1), ox + 25, iy + 20.5);

        ctx.textAlign = 'left';
        ctx.font = `600 12px ${SANS_FONT}`;
        ctx.fillStyle = palette.textPrimary;
        ctx.fillText(
          fitText(ctx, `${item.name} (${item.code})`, cardW - 140),
          ox + 40,
          iy + 20
        );

        ctx.font = `400 11px ${SANS_FONT}`;
        ctx.fillStyle = palette.textMuted;
        ctx.fillText(
          `现价: ¥${item.price.toFixed(3)} · 建议止损: ¥${item.stopLossPrice.toFixed(3)}`,
          ox + 40,
          iy + 40
        );

        ctx.textAlign = 'right';
        ctx.font = `700 14px ${MONO_FONT}`;
        ctx.fillStyle = accent;
        ctx.fillText(`${item.atrPercent.toFixed(2)}%`, ox + cardW - 16, iy + 20);
        ctx.font = `400 10px ${MONO_FONT}`;
        ctx.fillStyle = palette.textMuted;
        ctx.fillText(`1N=¥${item.turtleUnitN.toFixed(1)}`, ox + cardW - 16, iy + 40);
      });
    };

    drawTopCard(topHigh, PAD_X, '高弹性波动榜 TOP 5（短线进攻/网格高频）', '按ATR%降序', palette.accentRose);
    drawTopCard(topLow, PAD_X + cardW + 16, '稳健低波榜 TOP 5（防守底仓/长期配置）', '按ATR%升序', palette.accentGreen);
    ctx.textAlign = 'left';
  }

  // === LAYOUT 4: turtle_strategy ===
  if (config.layout === 'turtle_strategy') {
    roundRectPath(ctx, PAD_X, bodyY, INNER_W, 76, 10);
    ctx.fillStyle = palette.statCardBg;
    ctx.fill();
    ctx.strokeStyle = palette.statCardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `700 12px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    ctx.fillText('海龟交易法则(Turtle Trading) ATR核心要领：', PAD_X + 16, bodyY + 20);
    ctx.font = `400 11px ${SANS_FONT}`;
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText('1. 头寸规模(1 Unit) = (总资金 × 1% 风险) ÷ (ATR × 1手股数)；  2. 止损标准 = 买入价 - 2 × ATR；', PAD_X + 16, bodyY + 40);
    ctx.fillText('3. 加仓策略 = 每上涨 0.5 × ATR 逐步加码，最多 4 个 Unit。', PAD_X + 16, bodyY + 57);

    const tableY = bodyY + 76 + 16;
    const cols = [
      { label: '代码 / 名称', w: 196, align: 'left' as const },
      { label: '基金规模', w: 76, align: 'center' as const },
      { label: '现价(¥)', w: 84, align: 'right' as const },
      { label: '1N波幅(1手)', w: 96, align: 'right' as const },
      { label: '0.5N加仓触发价', w: 116, align: 'right' as const },
      { label: '2N硬止损位', w: 104, align: 'right' as const, color: palette.accentRose },
      { label: '10万资金建议仓位(1Unit)', w: 200, align: 'right' as const },
    ];

    const tableH = HEADER_ROW_H + Math.max(1, pagedEtfs.length) * ROW_H;
    ctx.save();
    roundRectPath(ctx, PAD_X, tableY, INNER_W, tableH, 8);
    ctx.clip();

    ctx.fillStyle = palette.tableHeaderBg;
    ctx.fillRect(PAD_X, tableY, INNER_W, HEADER_ROW_H);
    ctx.strokeStyle = palette.tableHeaderBorder;
    ctx.beginPath();
    ctx.moveTo(PAD_X, tableY + HEADER_ROW_H);
    ctx.lineTo(PAD_X + INNER_W, tableY + HEADER_ROW_H);
    ctx.stroke();

    let cx = PAD_X;
    ctx.font = `700 11px ${SANS_FONT}`;
    for (const col of cols) {
      ctx.fillStyle = col.color || palette.tableHeaderText;
      if (col.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(col.label, cx + col.w / 2, tableY + HEADER_ROW_H / 2);
      } else if (col.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(col.label, cx + col.w - 8, tableY + HEADER_ROW_H / 2);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(col.label, cx + 10, tableY + HEADER_ROW_H / 2);
      }
      cx += col.w;
    }

    pagedEtfs.forEach((item, idx) => {
      const ry = tableY + HEADER_ROW_H + idx * ROW_H;
      if (idx % 2 === 1) {
        ctx.fillStyle = palette.rowAltBg;
        ctx.fillRect(PAD_X, ry, INNER_W, ROW_H);
      }
      ctx.strokeStyle = palette.rowBorder;
      ctx.beginPath();
      ctx.moveTo(PAD_X, ry + ROW_H);
      ctx.lineTo(PAD_X + INNER_W, ry + ROW_H);
      ctx.stroke();

      const suggestedShares = Math.floor(1000 / Math.max(0.0001, 2 * item.atr) / 100) * 100;
      const capitalOccupied = suggestedShares * item.price;
      const addTrigger = item.price + 0.5 * item.atr;
      const midY = ry + ROW_H / 2;

      let rx = PAD_X;
      ctx.textAlign = 'left';
      ctx.font = `600 12px ${SANS_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(fitText(ctx, `${item.name} (${item.code})`, cols[0].w - 16), rx + 10, midY);
      rx += cols[0].w;

      ctx.textAlign = 'center';
      ctx.font = `400 11px ${MONO_FONT}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(fitText(ctx, item.scaleText || '--', cols[1].w - 8), rx + cols[1].w / 2, midY);
      rx += cols[1].w;

      ctx.textAlign = 'right';
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(`¥${item.price.toFixed(3)}`, rx + cols[2].w - 8, midY);
      rx += cols[2].w;

      ctx.font = `700 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.accentRose;
      ctx.fillText(`¥${item.turtleUnitN.toFixed(1)}`, rx + cols[3].w - 8, midY);
      rx += cols[3].w;

      ctx.font = `500 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.accentGreen;
      ctx.fillText(`¥${addTrigger.toFixed(3)}`, rx + cols[4].w - 8, midY);
      rx += cols[4].w;

      ctx.font = `700 11.5px ${MONO_FONT}`;
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`¥${item.stopLossPrice.toFixed(3)}`, rx + cols[5].w - 8, midY);
      rx += cols[5].w;

      ctx.font = `500 11.5px ${MONO_FONT}`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(`${suggestedShares}股 (约¥${capitalOccupied.toFixed(0)})`, rx + cols[6].w - 8, midY);
    });

    ctx.restore();
    roundRectPath(ctx, PAD_X, tableY, INNER_W, tableH, 8);
    ctx.strokeStyle = palette.tableHeaderBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
  }

  // Footer
  const footerY = totalHeight - footerHeight;
  ctx.fillStyle = palette.footerBg;
  ctx.fillRect(0, footerY, CARD_WIDTH, footerHeight);
  ctx.strokeStyle = palette.footerBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(CARD_WIDTH, footerY);
  ctx.stroke();

  if (config.enableWatermark && config.showBottomBanner) {
    ctx.beginPath();
    ctx.arc(PAD_X + 16, footerY + footerHeight / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = `900 10px ${SANS_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('young', PAD_X + 16, footerY + footerHeight / 2 + 0.5);

    ctx.textAlign = 'left';
    ctx.font = `700 12px ${SANS_FONT}`;
    ctx.fillStyle = palette.textPrimary;
    const prefix = '微信公众号：';
    ctx.fillText(prefix, PAD_X + 42, footerY + 24);
    const pw = ctx.measureText(prefix).width;
    ctx.font = `800 13px ${SANS_FONT}`;
    ctx.fillStyle = palette.accentRose;
    ctx.fillText(config.watermarkText, PAD_X + 42 + pw, footerY + 24);

    ctx.font = `400 10px ${SANS_FONT}`;
    ctx.fillStyle = palette.footerText;
    ctx.fillText(
      '关注公众号获取更多A股ETF深度量化、网格交易模型与日度真实波动率追踪',
      PAD_X + 42,
      footerY + 45
    );

    ctx.textAlign = 'right';
    ctx.fillText('数据来源：上海/深圳证券交易所公开实时行情与历史日K线', CARD_WIDTH - PAD_X, footerY + 25);
    ctx.fillText('风险提示：本表仅供客观量化波动率统计参考，不构成任何投资建议', CARD_WIDTH - PAD_X, footerY + 44);
  } else {
    ctx.textAlign = 'left';
    ctx.font = `500 11px ${SANS_FONT}`;
    ctx.fillStyle = palette.footerText;
    ctx.fillText('A股核心ETF市场ATR真实波动率量化日报', PAD_X, footerY + footerHeight / 2);

    ctx.textAlign = 'right';
    ctx.fillText('数据来源：上海/深圳证券交易所公开实时行情 · 仅供量化统计参考', CARD_WIDTH - PAD_X, footerY + footerHeight / 2);
  }

  // Diagonal Watermark Overlay (tiled across entire canvas)
  if (config.enableWatermark && config.showDiagonalWatermark && config.watermarkText) {
    const opacity = config.diagonalOpacity ?? 0.16;
    ctx.save();
    ctx.fillStyle = `rgba(120, 130, 145, ${opacity})`;
    ctx.font = `600 13px ${SANS_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = 300;
    const stepY = 150;
    const angle = (-20 * Math.PI) / 180;
    for (let y = 75; y < totalHeight + 150; y += stepY) {
      for (let x = 150; x < CARD_WIDTH + 150; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(config.watermarkText, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // Outer card border
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, CARD_WIDTH - 1, totalHeight - 1);

  let outputCanvas = canvas;
  if (needsScaleToFit) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(CARD_WIDTH * effectiveRatio);
    outCanvas.height = Math.round(targetAspectHeight * effectiveRatio);
    const outCtx = outCanvas.getContext('2d');
    if (outCtx) {
      outCtx.fillStyle = palette.bg;
      outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      const scale = Math.min(
        outCanvas.width / canvas.width,
        outCanvas.height / canvas.height
      );
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const dx = (outCanvas.width - drawW) / 2;
      const dy = (outCanvas.height - drawH) / 2;
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(canvas, dx, dy, drawW, drawH);
      outputCanvas = outCanvas;
    }
  }

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob returned null'));
      },
      mimeType,
      format === 'jpeg' ? 0.94 : undefined
    );
  });

  const objectUrl = URL.createObjectURL(blob);
  return {
    blob,
    objectUrl,
    width: outputCanvas.width,
    height: outputCanvas.height,
    effectiveRatio,
  };
}
