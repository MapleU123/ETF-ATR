import ExcelJS from 'exceljs';
import { AtrPeriod, EtfItem, GridItemConfig, GridRangeMode } from '../types';
import { generateGridLadder } from './gridCalculator';

export type GridCustomOverrideMap = Record<
  string,
  Partial<{
    basePrice: number;
    highPrice: number;
    lowPrice: number;
    gridStepPercent: number;
  }>
>;

export interface ExportSection2GridParams {
  items: GridItemConfig[];
  etfs: EtfItem[];
  customOverrides?: GridCustomOverrideMap;
  globalConfig: {
    atrPeriod: AtrPeriod;
    atrMultiplier?: number;
    rangeMode?: GridRangeMode;
    rangePercent?: number;
    roundToHalf?: boolean;
    scopeLabel: string;
  };
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

const YELLOW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' },
};

const DARK_BLUE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F3864' },
};

const SUB_BLUE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF305496' },
};

function getRangeSourceLabel(item: GridItemConfig): string {
  if (item.isCustomized) {
    return '手动自定义参数';
  }
  if (item.rangeMode === 'ma120_sr') {
    const res = item.resistanceType || '120日阻力';
    const sup = item.supportType || '120日支撑';
    return `MA120支撑/压力 (${res} / ${sup})`;
  }
  if (item.rangeMode === 'percent_range') {
    return `基准价 ±${item.rangePercent ?? 20}% 箱体`;
  }
  return '120日High极值 / 60日Low极值(前复权)';
}

function getRangeModeDisplay(mode?: GridRangeMode, rangePercent?: number): string {
  if (mode === 'ma120_sr') return 'MA120半年线支撑/压力位';
  if (mode === 'percent_range') return `固定百分比箱体 (±${rangePercent ?? 20}%)`;
  return '前复权日K极值 (120日High / 60日Low)';
}

export async function exportSection2GridToXlsx({
  items,
  etfs,
  customOverrides,
  globalConfig,
}: ExportSection2GridParams): Promise<void> {
  if (!items || items.length === 0) {
    throw new Error('暂无可导出的ETF网格数据');
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ETF量化交易系统 · 公众号：我爱这young';
  wb.created = new Date();

  const etfMap = new Map<string, EtfItem>();
  for (const e of etfs) {
    etfMap.set(e.id, e);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const firstItem = items[0];
  const atrPeriod = globalConfig.atrPeriod || 14;
  const atrMultiplier = globalConfig.atrMultiplier ?? firstItem.atrMultiplier ?? 1.0;
  const rangeMode = globalConfig.rangeMode ?? firstItem.rangeMode ?? 'kline_120d';
  const rangePercent = globalConfig.rangePercent ?? firstItem.rangePercent ?? 20;
  const roundToHalf = globalConfig.roundToHalf ?? firstItem.isHalfMultiple ?? true;

  // =========================================================================
  // Sheet 1: 网格参数总览
  // =========================================================================
  const ws1 = wb.addWorksheet('网格参数总览', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4, showGridLines: true }],
  });

  ws1.columns = [
    { width: 7 },  // A: 序号
    { width: 12 }, // B: 基金代码
    { width: 24 }, // C: 基金名称
    { width: 15 }, // D: 行业类别
    { width: 13 }, // E: 基金规模
    { width: 13 }, // F: 参考现价
    { width: 13 }, // G: 网格基准价
    { width: 15 }, // H: 网格上限(最高价)
    { width: 15 }, // I: 网格下限(最低价)
    { width: 13 }, // J: 网格间距(%)
    { width: 13 }, // K: 单格差价(元)
    { width: 13 }, // L: 预估总格数
    { width: 13 }, // M: ATR波动率(%)
    { width: 14 }, // N: MA120半年线
    { width: 32 }, // O: 区间设定依据
    { width: 14 }, // P: 参数状态
  ];

  // Row 1: 主标题
  ws1.mergeCells('A1:P1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `A股ETF网格交易基础参数设计表 · ${globalConfig.scopeLabel} (${items.length}只)`;
  titleCell.font = { name: 'Microsoft YaHei', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = DARK_BLUE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(1).height = 30;

  // Row 2: 副标题与参数说明
  ws1.mergeCells('A2:P2');
  const subCell = ws1.getCell('A2');
  subCell.value = `ATR(${atrPeriod}天)量化定距 · 倍数 ${atrMultiplier.toFixed(1)}x · ${
    roundToHalf ? '0.5%倍数对齐' : '原始浮点精度'
  } · 区间模式：${getRangeModeDisplay(rangeMode, rangePercent)} · 无底色为自动获取/公式计算，黄底为手动修改 · 日期：${dateStr}`;
  subCell.font = { name: 'Microsoft YaHei', size: 9, color: { argb: 'FFDCE6F1' } };
  subCell.fill = DARK_BLUE_FILL;
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 20;

  // Row 3: 留白缓冲行
  ws1.getRow(3).height = 8;

  // Row 4: 表头
  const headers = [
    '序号',
    '基金代码',
    '基金名称',
    '行业类别',
    '基金规模',
    '参考现价(元)',
    '网格基准价(元)',
    '网格上限/最高价(元)',
    '网格下限/最低价(元)',
    '网格间距(%)',
    '单格差价(元)',
    '预估总格数',
    `ATR${atrPeriod}波动率(%)`,
    'MA120半年线(元)',
    '区间设定依据',
    '参数状态',
  ];

  const headerRow = ws1.getRow(4);
  headers.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = SUB_BLUE_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx <= 4 || idx >= 14 ? 'center' : 'right',
      wrapText: true,
    };
  });
  headerRow.height = 26;

  // Data Rows (Row 5+)
  const startDataRow = 5;
  items.forEach((item, idx) => {
    const r = startDataRow + idx;
    const row = ws1.getRow(r);
    const orig = etfMap.get(item.id);
    const override = customOverrides?.[item.id];
    const scaleStr =
      orig?.scaleText ||
      item.scaleText ||
      (orig?.scaleAmount ? `约${orig.scaleAmount}亿` : '--');

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = item.code;
    row.getCell(3).value = item.name;
    row.getCell(4).value = item.category;
    row.getCell(5).value = scaleStr;
    row.getCell(6).value = Number(item.price.toFixed(3));
    row.getCell(7).value = Number(item.basePrice.toFixed(3));
    row.getCell(8).value = Number(item.highPrice.toFixed(3));
    row.getCell(9).value = Number(item.lowPrice.toFixed(3));
    row.getCell(10).value = Number((item.gridStepPercent / 100).toFixed(4));

    // K: 单格差价 = ROUND(基准价 * 间距%, 3)
    row.getCell(11).value = {
      formula: `ROUND(G${r}*J${r},3)`,
      result: Number(item.gridStepPrice.toFixed(3)),
    };

    // L: 预估总格数 = MAX(2, ROUND((最高价-最低价)/单格差价, 0))
    row.getCell(12).value = {
      formula: `IF(K${r}>0,MAX(2,ROUND((H${r}-I${r})/K${r},0)),0)`,
      result: item.gridCount,
    };

    row.getCell(13).value = Number((item.atrPercent / 100).toFixed(4));
    row.getCell(14).value = item.ma120 ? Number(item.ma120.toFixed(3)) : null;
    row.getCell(15).value = getRangeSourceLabel(item);
    row.getCell(16).value = item.isCustomized ? '手动自定义' : 'ATR自动测算';

    // 格式与边框（自动获取与计算单元格无底色；仅手动修改字段保留黄色填充）
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(15).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(16).alignment = { vertical: 'middle', horizontal: 'center' };

    [6, 7, 8, 9, 11, 14].forEach((ci) => {
      const c = row.getCell(ci);
      c.numFmt = '0.000';
      c.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    [10, 13].forEach((ci) => {
      const c = row.getCell(ci);
      c.numFmt = '0.00%';
      c.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    row.getCell(12).numFmt = '0" 格"';

    for (let ci = 1; ci <= 16; ci++) {
      const c = row.getCell(ci);
      c.border = THIN_BORDER;
      let fontColor = 'FF0F172A';
      if (ci === 8) fontColor = 'FFDC2626';
      else if (ci === 9) fontColor = 'FF047857';
      else if (ci === 10) fontColor = 'FFE11D48';
      else if (ci === 16 && item.isCustomized) fontColor = 'FF92400E';

      c.font = {
        name: [1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(ci) ? 'Consolas' : 'Microsoft YaHei',
        size: 9.5,
        bold: ci === 3 || ci === 7 || ci === 8 || ci === 9 || ci === 10,
        color: { argb: fontColor },
      };
    }

    // 手动自定义字段保留黄色背景填充，自动获取字段保持无色
    if (item.isCustomized) {
      if (!override || override.basePrice !== undefined) row.getCell(7).fill = YELLOW_FILL;
      if (!override || override.highPrice !== undefined) row.getCell(8).fill = YELLOW_FILL;
      if (!override || override.lowPrice !== undefined) row.getCell(9).fill = YELLOW_FILL;
      if (!override || override.gridStepPercent !== undefined) row.getCell(10).fill = YELLOW_FILL;
    }

    row.height = 20;
  });

  // Summary Row
  const endDataRow = startDataRow + items.length - 1;
  const summaryRowIdx = endDataRow + 1;
  const summaryRow = ws1.getRow(summaryRowIdx);
  const avgStep = items.reduce((sum, i) => sum + i.gridStepPercent, 0) / items.length / 100;
  const avgCount = Math.round(items.reduce((sum, i) => sum + i.gridCount, 0) / items.length);
  const avgAtr = items.reduce((sum, i) => sum + i.atrPercent, 0) / items.length / 100;

  summaryRow.getCell(1).value = '汇总';
  summaryRow.getCell(2).value = {
    formula: `COUNTA(B${startDataRow}:B${endDataRow})`,
    result: items.length,
  };
  summaryRow.getCell(2).numFmt = '0" 只"';
  summaryRow.getCell(3).value = '平均网格参数统计';
  summaryRow.getCell(10).value = {
    formula: `AVERAGE(J${startDataRow}:J${endDataRow})`,
    result: Number(avgStep.toFixed(4)),
  };
  summaryRow.getCell(10).numFmt = '0.00%';
  summaryRow.getCell(12).value = {
    formula: `ROUND(AVERAGE(L${startDataRow}:L${endDataRow}),0)`,
    result: avgCount,
  };
  summaryRow.getCell(12).numFmt = '0" 格"';
  summaryRow.getCell(13).value = {
    formula: `AVERAGE(M${startDataRow}:M${endDataRow})`,
    result: Number(avgAtr.toFixed(4)),
  };
  summaryRow.getCell(13).numFmt = '0.00%';

  for (let ci = 1; ci <= 16; ci++) {
    const c = summaryRow.getCell(ci);
    c.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: 'FF1F3864' } };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1F3864' } },
      bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
    if (ci === 1 || ci === 2 || ci === 12) {
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if (ci === 10 || ci === 13) {
      c.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      c.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  }
  summaryRow.height = 23;

  // =========================================================================
  // Sheet 2: 买卖阶梯挂单明细 (最多展示前15只代表/选中标的，防止表格过长)
  // =========================================================================
  const MAX_LADDER_ITEMS = 15;
  const ladderItems = items.slice(0, MAX_LADDER_ITEMS);
  const ws2 = wb.addWorksheet('买卖阶梯挂单明细', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  ws2.columns = [
    { width: 12 }, // A: 基金代码
    { width: 22 }, // B: 基金名称
    { width: 12 }, // C: 挂单档位
    { width: 12 }, // D: 买卖方向
    { width: 14 }, // E: 触发价格(元)
    { width: 14 }, // F: 偏离基准(%)
    { width: 16 }, // G: 单格预期毛利(%)
    { width: 28 }, // H: 挂单执行说明
  ];

  ws2.mergeCells('A1:H1');
  const ws2Title = ws2.getCell('A1');
  ws2Title.value = '网格买卖挂单阶梯明细 (券商条件单 / 网格挂单参考)';
  ws2Title.font = { name: 'Microsoft YaHei', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws2Title.fill = DARK_BLUE_FILL;
  ws2Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws2.getRow(1).height = 28;

  ws2.mergeCells('A2:H2');
  const ws2Sub = ws2.getCell('A2');
  ws2Sub.value =
    items.length > MAX_LADDER_ITEMS
      ? `当前导出共 ${items.length} 只标的，本表自动生成前 ${MAX_LADDER_ITEMS} 只标的的精确买卖阶梯档位（可在板块二筛选或勾选目标后精准导出）`
      : `共 ${ladderItems.length} 只标的完整买卖阶梯档位 · 卖出阶梯为红字，买入阶梯为绿字，中轴基准为琥珀粗框标识`;
  ws2Sub.font = { name: 'Microsoft YaHei', size: 9, color: { argb: 'FFDCE6F1' } };
  ws2Sub.fill = DARK_BLUE_FILL;
  ws2Sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws2.getRow(2).height = 20;

  ws2.getRow(3).height = 8;

  const s2Headers = [
    '基金代码',
    '基金名称',
    '挂单档位',
    '交易方向',
    '触发价格(元)',
    '偏离基准(%)',
    '单格预期毛利(%)',
    '条件单执行说明',
  ];
  const s2HeaderRow = ws2.getRow(4);
  s2Headers.forEach((h, idx) => {
    const c = s2HeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = SUB_BLUE_FILL;
    c.border = THIN_BORDER;
    c.alignment = {
      vertical: 'middle',
      horizontal: idx >= 4 && idx <= 6 ? 'right' : idx === 1 || idx === 7 ? 'left' : 'center',
    };
  });
  s2HeaderRow.height = 24;

  let s2RowIdx = 5;
  ladderItems.forEach((item) => {
    const ladder = generateGridLadder(item);
    ladder.forEach((lv) => {
      const row = ws2.getRow(s2RowIdx);
      const isBase = lv.type === 'base';
      const isSell = lv.type === 'sell';

      row.getCell(1).value = item.code;
      row.getCell(2).value = item.name;
      row.getCell(3).value = lv.label;
      row.getCell(4).value = isBase ? '基准中轴' : isSell ? '逢高卖出' : '逢低买入';
      row.getCell(5).value = Number(lv.price.toFixed(3));
      row.getCell(6).value = Number((lv.changeFromBasePercent / 100).toFixed(4));
      row.getCell(7).value = isBase ? 0 : Number((lv.expectedProfitPercent / 100).toFixed(4));
      row.getCell(8).value = isBase
        ? '建仓中枢价，跌破按买档吸纳'
        : isSell
        ? `涨至 ¥${lv.price.toFixed(3)} 卖出1份`
        : `跌至 ¥${lv.price.toFixed(3)} 买入1份`;

      row.getCell(5).numFmt = '0.000';
      row.getCell(6).numFmt = '+0.00%;-0.00%;0.00%';
      row.getCell(7).numFmt = '0.00%';

      const textColor = isBase ? 'FF92400E' : isSell ? 'FFE11D48' : 'FF047857';
      for (let ci = 1; ci <= 8; ci++) {
        const c = row.getCell(ci);
        c.font = {
          name: [1, 5, 6, 7].includes(ci) ? 'Consolas' : 'Microsoft YaHei',
          size: 9,
          bold: isBase || ci === 3 || ci === 5,
          color: { argb: ci <= 2 ? 'FF1E293B' : textColor },
        };
        c.border = isBase
          ? {
              top: { style: 'medium', color: { argb: 'FFD97706' } },
              bottom: { style: 'medium', color: { argb: 'FFD97706' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            }
          : THIN_BORDER;
        c.alignment = {
          vertical: 'middle',
          horizontal:
            ci >= 5 && ci <= 7 ? 'right' : ci === 2 || ci === 8 ? 'left' : 'center',
        };
      }
      row.height = 19;
      s2RowIdx++;
    });

    // 标的分界空行高度
    ws2.getRow(s2RowIdx).height = 8;
    s2RowIdx++;
  });

  // =========================================================================
  // Sheet 3: 全局参数与策略说明
  // =========================================================================
  const ws3 = wb.addWorksheet('全局参数与策略说明', {
    views: [{ showGridLines: true }],
  });
  ws3.columns = [
    { width: 24 },
    { width: 38 },
    { width: 46 },
  ];

  ws3.mergeCells('A1:C1');
  const ws3Title = ws3.getCell('A1');
  ws3Title.value = '网格交易全局参数快照与实盘纪律说明';
  ws3Title.font = { name: 'Microsoft YaHei', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws3Title.fill = DARK_BLUE_FILL;
  ws3Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws3.getRow(1).height = 28;

  const configRows: Array<[string, string, string]> = [
    ['ATR 真实波幅周期', `${atrPeriod} 个交易日`, atrPeriod === 20 ? '海龟法则标准20日波动率窗口' : 'Wilder经典14日波动率窗口'],
    ['网格间距 ATR 倍数', `${atrMultiplier.toFixed(1)} × ATR%`, '倍数越大单格间距越宽、抗震荡能力越强'],
    ['间距 0.5% 倍数对齐', roundToHalf ? '已开启 (1.0% / 1.5% / 2.0%...)' : '未开启 (保留原始浮点精度)', '实盘推荐开启0.5%整数倍，便于记忆与条件单对齐'],
    ['网格区间设定模式', getRangeModeDisplay(rangeMode, rangePercent), '支持前复权日K极值、MA120支撑压力或固定百分比箱体'],
    ['本次导出范围', `${globalConfig.scopeLabel} (共 ${items.length} 只)`, `导出日期：${dateStr}`],
  ];

  const s3HeaderRow = ws3.getRow(3);
  ['参数项目', '当前配置值', '量化说明'].forEach((h, idx) => {
    const c = s3HeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = SUB_BLUE_FILL;
    c.border = THIN_BORDER;
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });
  s3HeaderRow.height = 22;

  configRows.forEach(([k, v, d], idx) => {
    const row = ws3.getRow(4 + idx);
    row.getCell(1).value = k;
    row.getCell(2).value = v;
    row.getCell(3).value = d;
    for (let ci = 1; ci <= 3; ci++) {
      const c = row.getCell(ci);
      c.font = {
        name: 'Microsoft YaHei',
        size: 9.5,
        bold: ci <= 2,
        color: { argb: ci === 2 ? 'FF1F3864' : 'FF334155' },
      };
      c.border = THIN_BORDER;
      c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    }
    row.height = 21;
  });

  const tips = [
    '网格交易核心执行原则：',
    '1. 标的选择优先考虑流动性高（日成交额充足）、长期处于宽幅震荡且基本面无退市风险的行业/宽基ETF。',
    '2. 若勾选「120日High/60日Low」模式，价格处于60日底部区域时建仓安全边际更高，避免在历史高位满仓追高。',
    '3. 网格间距建议不低于往返交易成本的3倍以上（通常≥1.0%），防止高频小幅波动被交易费用磨损利润。',
    '4. 跌破网格下限时切忌盲目加杠杆补仓，应提前预留极端行情压力测试资金或执行底仓分批定投策略。',
  ];
  tips.forEach((line, idx) => {
    const r = 11 + idx;
    ws3.mergeCells(`A${r}:C${r}`);
    const cell = ws3.getCell(`A${r}`);
    cell.value = line;
    cell.font = {
      name: 'Microsoft YaHei',
      size: idx === 0 ? 10 : 9,
      bold: idx === 0,
      color: { argb: idx === 0 ? 'FF1F3864' : 'FF334155' },
    };
    ws3.getRow(r).height = 20;
  });

  // 触发下载
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `A股ETF网格参数_${globalConfig.scopeLabel}_${dateStr}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
