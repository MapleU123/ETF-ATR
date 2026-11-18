import ExcelJS from 'exceljs';
import {
  T0GridInputState,
  T0GridCalculatedResult,
  Sheet2AtrResult,
} from './t0GridCalculator';

export interface BacktestComparisonRow {
  step: number;
  stepPct: string;
  pairs: number;
  zeroDays: number;
  dailyPnL: number;
  cumulative21: number;
  isSelected: boolean;
}

export interface ExportT0WorkbookParams {
  formInputs: T0GridInputState;
  calcResult: T0GridCalculatedResult;
  sheet2Data: Sheet2AtrResult;
  backtestComparison: BacktestComparisonRow[];
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

export async function exportT0GridToXlsx({
  formInputs,
  calcResult,
  sheet2Data,
  backtestComparison,
}: ExportT0WorkbookParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ETF量化交易系统 · 公众号：我爱这young';
  wb.created = new Date();

  // =========================================================================
  // Sheet 1: 网格计算器
  // =========================================================================
  const ws1 = wb.addWorksheet('网格计算器', {
    views: [{ showGridLines: true }],
  });

  ws1.columns = [
    { width: 10 }, // A: 序号 / 档位k
    { width: 22 }, // B: 输入名称 / 挂单价格
    { width: 16 }, // C: 输入值 / 交易方向
    { width: 18 }, // D: 覆盖或说明 / 距基准%
    { width: 14 }, // E: 间隔 / 每格资金
    { width: 22 }, // F: 公式名称 / 委托份数
    { width: 16 }, // G: 公式结果 / 成交金额
    { width: 16 }, // H: 平仓配对价
    { width: 15 }, // I: 单格毛利
    { width: 15 }, // J: 单格净利
  ];

  // Row 1: 标题
  ws1.mergeCells('A1:J1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `${formInputs.code} ${formInputs.name} · 日内T+0网格交易计算模板`;
  titleCell.font = { name: 'Microsoft YaHei', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = DARK_BLUE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(1).height = 30;

  // Row 2: 副标题
  ws1.mergeCells('A2:J2');
  const subCell = ws1.getCell('A2');
  subCell.value = `标准 Excel 联动架构 · 黄色区域为手动输入项，无底色区域为自动获取与公式结果 · 公众号：我爱这young · 生成日期：${new Date().toLocaleDateString('zh-CN')}`;
  subCell.font = { name: 'Microsoft YaHei', size: 9, color: { argb: 'FFDCE6F1' } };
  subCell.fill = DARK_BLUE_FILL;
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 20;

  // Row 3: 实时行情极值速览 (自动获取数据 -> 无底色，红色字体突出显示)
  ws1.mergeCells('A3:J3');
  const quoteRowCell = ws1.getCell('A3');
  quoteRowCell.value = `基准现价：¥${formInputs.basePrice.toFixed(3)}   |   最高价(上限)：¥${formInputs.highPrice.toFixed(3)}   |   最低价(下限)：¥${formInputs.lowPrice.toFixed(3)}   |   区间振幅：${calcResult.highLowSpanPct}%   |   网格间隔(价差)：¥${calcResult.gridStepPrice.toFixed(4)} (${(calcResult.gridStepPct * 100).toFixed(2)}%)`;
  quoteRowCell.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  quoteRowCell.border = THIN_BORDER;
  quoteRowCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(3).height = 22;

  // Row 4: 左右分区标题
  ws1.mergeCells('A4:D4');
  const leftBanner = ws1.getCell('A4');
  leftBanner.value = '参数区 (黄格为手动输入，无色为自动获取 C5 ~ C17)';
  leftBanner.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  leftBanner.fill = SUB_BLUE_FILL;
  leftBanner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws1.mergeCells('F4:J4');
  const rightBanner = ws1.getCell('F4');
  rightBanner.value = '自动公式区 (系统自动公式计算 G5 ~ G17 · 无底色)';
  rightBanner.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  rightBanner.fill = DARK_BLUE_FILL;
  rightBanner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(4).height = 22;

  const leftRows: Array<{
    row: number;
    code: string;
    label: string;
    value: any;
    note?: string;
    numFmt?: string;
    isAuto?: boolean;
    isFormula?: boolean;
    formula?: string;
  }> = [
    { row: 5, code: 'C5', label: '基准价 (元)', value: formInputs.basePrice, note: '自动获取现价(可微调)', numFmt: '0.000', isAuto: true },
    { row: 6, code: 'C6', label: 'ATR值 (元)', value: formInputs.atrValue, note: '自动获取15分钟折算', numFmt: '0.0000', isAuto: true },
    { row: 7, code: 'C7', label: 'ATR倍数', value: formInputs.atrMultiplier, note: '手动选择乘数', numFmt: '0.0' },
    {
      row: 8,
      code: 'C8',
      label: '★ 实际每边格数',
      value: calcResult.actualGridCountC8,
      note: 'D8手动覆盖优先',
      numFmt: '0',
      isAuto: true,
      isFormula: true,
      formula: 'IF(AND(D8<>"",D8>0),D8,G13)',
    },
    { row: 9, code: 'C9', label: '每格资金 (元)', value: formInputs.perGridMoney, note: '手动输入预算', numFmt: '#,##0' },
    { row: 10, code: 'C10', label: '往返成本率', value: formInputs.roundTripCostRatePct / 100, note: '手动输入佣金滑点', numFmt: '0.00%' },
    { row: 11, code: 'C11', label: '最小变动价位 (元)', value: formInputs.minTick, note: '手动配置 ETF 0.001', numFmt: '0.000' },
    { row: 12, code: 'C12', label: '最小交易单位 (份)', value: formInputs.minUnit, note: '手动配置 1手=100份', numFmt: '#,##0' },
    { row: 13, code: 'C13', label: '自定义间距 (%)', value: formInputs.customStepPct > 0 ? formInputs.customStepPct / 100 : 0, note: '手动输入，0则用ATR', numFmt: '0.00%' },
    { row: 14, code: 'C14', label: '预期日振幅 (%)', value: formInputs.expectedAmpPct / 100, note: '自动获取近15日均值', numFmt: '0.00%', isAuto: true },
    { row: 15, code: 'C15', label: '做T总资金预算 (元)', value: formInputs.totalBudget, note: '★ 手动关键输入', numFmt: '#,##0' },
    { row: 16, code: 'C16', label: '最高价 (网格上限)', value: formInputs.highPrice, note: '自动获取(可微调)', numFmt: '0.000', isAuto: true },
    { row: 17, code: 'C17', label: '最低价 (网格下限)', value: formInputs.lowPrice, note: '自动获取(可微调)', numFmt: '0.000', isAuto: true },
  ];

  leftRows.forEach((item) => {
    const r = item.row;
    const cellA = ws1.getCell(`A${r}`);
    const cellB = ws1.getCell(`B${r}`);
    const cellC = ws1.getCell(`C${r}`);
    const cellD = ws1.getCell(`D${r}`);

    cellA.value = item.code;
    cellA.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: 'FF475569' } };
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };

    cellB.value = item.label;
    cellB.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: 'FF1E293B' } };
    cellB.alignment = { vertical: 'middle', horizontal: 'left' };

    if (item.isFormula && item.formula) {
      cellC.value = { formula: item.formula, result: item.value };
      // C8 为自动公式结果 -> 无背景填充色；D8 为手动覆盖输入 -> 保留黄色填充
      cellD.value = formInputs.manualGridCount > 0 ? formInputs.manualGridCount : null;
      cellD.fill = YELLOW_FILL;
      cellD.numFmt = '0';
      cellD.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cellC.value = item.value;
      // 仅需要手动输入的参数保留黄色填充色，自动获取的参数无背景填充色
      if (!item.isAuto) {
        cellC.fill = YELLOW_FILL;
      }
      cellD.value = item.note || '';
      cellD.font = { name: 'Microsoft YaHei', size: 8, color: { argb: 'FF64748B' } };
      cellD.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    cellC.font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    if (item.numFmt) cellC.numFmt = item.numFmt;
    cellC.alignment = { vertical: 'middle', horizontal: 'right' };

    [cellA, cellB, cellC, cellD].forEach((c) => {
      c.border = THIN_BORDER;
    });
    ws1.getRow(r).height = 20;
  });

  const rightRows: Array<{
    row: number;
    label: string;
    formula: string;
    result: any;
    numFmt?: string;
    desc: string;
    highlight?: 'blue' | 'warn' | 'ok';
  }> = [
    {
      row: 5,
      label: 'G5 网格间距 (元)',
      formula: 'IF(AND(C13<>"",C13>0),ROUND(C13*C5/C11,0)*C11,ROUND(C7*C6/C11,0)*C11)',
      result: calcResult.gridStepPrice,
      numFmt: '0.0000',
      desc: '最小价位取整',
    },
    {
      row: 6,
      label: 'G6 网格间距 (%)',
      formula: 'G5/C5',
      result: calcResult.gridStepPct,
      numFmt: '0.00%',
      desc: '=G5/C5',
    },
    {
      row: 7,
      label: 'G12 成本占格距比',
      formula: '2*C5*C10/G5',
      result: calcResult.costToStepRatio,
      numFmt: '0.0%',
      desc: calcResult.isCostRatioHigh ? '>50% 偏高！摩擦大' : '≤50% 优良',
      highlight: calcResult.isCostRatioHigh ? 'warn' : 'ok',
    },
    {
      row: 8,
      label: '成本红线判定',
      formula: 'IF(G7>0.5,"偏高需调大间距","成本优良")',
      result: calcResult.isCostRatioHigh ? '偏高需调大间距' : '成本优良',
      desc: '红线标准 ≤50%',
      highlight: calcResult.isCostRatioHigh ? 'warn' : 'ok',
    },
    {
      row: 9,
      label: '实际单向资金占用',
      formula: 'C8*C9',
      result: calcResult.totalFundsUsed,
      numFmt: '¥#,##0',
      desc: '=C8×C9',
    },
    {
      row: 10,
      label: '资金预算利用率',
      formula: 'IF(C15>0,G9/C15,0)',
      result: formInputs.totalBudget > 0 ? calcResult.totalFundsUsed / formInputs.totalBudget : 0,
      numFmt: '0.0%',
      desc: '=G9/C15',
    },
    {
      row: 11,
      label: 'G11 预估日均买卖对',
      formula: 'MAX(1,MIN(6,ROUND(C14/(G6*2.2),1)))',
      result: calcResult.dailyBuySellPairs,
      numFmt: '0.0',
      desc: '按日内振幅测算',
    },
    {
      row: 12,
      label: '单格平均买入净利',
      formula: 'IFERROR(AVERAGEIFS(J20:J40,C20:C40,"买入"),0)',
      result: calcResult.avgNetProfitPerPair,
      numFmt: '¥#,##0.00',
      desc: '扣除双边往返规费',
    },
    {
      row: 13,
      label: '★ G13 建议每边格数',
      formula: 'MAX(2,MIN(G14,IF(C15>0,G15,10)))',
      result: calcResult.suggestedGridCount,
      numFmt: '0',
      desc: '振幅法与资金法双约束',
      highlight: 'blue',
    },
    {
      row: 14,
      label: 'G14 振幅法约束 (档)',
      formula: 'MAX(1,ROUND(C14*0.45/G6,0))',
      result: calcResult.amplitudeGridCount,
      numFmt: '0',
      desc: '=ROUND(C14*0.45/G6,0)',
    },
    {
      row: 15,
      label: 'G15 资金法约束 (档)',
      formula: 'MAX(1,FLOOR(C15/C9,1))',
      result: calcResult.capitalGridCount,
      numFmt: '0',
      desc: '=FLOOR(C15/C9,1)',
    },
    {
      row: 16,
      label: '高低价区间振幅',
      formula: 'IF(AND(C16>C17,C5>0),(C16-C17)/C5,0)',
      result: calcResult.highLowSpanPct / 100,
      numFmt: '0.00%',
      desc: '=(最高价-最低价)/基准价',
    },
    {
      row: 17,
      label: '★ 预估日均净收益',
      formula: 'G11*G12',
      result: calcResult.dailyEstNetProfit,
      numFmt: '¥#,##0.00',
      desc: '年化估算 ' + calcResult.dailyEstAnnualYield + '%',
      highlight: 'blue',
    },
  ];

  rightRows.forEach((item) => {
    const r = item.row;
    const cellF = ws1.getCell(`F${r}`);
    const cellG = ws1.getCell(`G${r}`);
    ws1.mergeCells(`H${r}:J${r}`);
    const cellH = ws1.getCell(`H${r}`);

    cellF.value = item.label;
    cellF.font = { name: 'Microsoft YaHei', size: 9, bold: item.highlight === 'blue', color: { argb: 'FF1E293B' } };
    cellF.alignment = { vertical: 'middle', horizontal: 'left' };

    cellG.value = { formula: item.formula, result: item.result };
    cellG.font = {
      name: 'Consolas',
      size: 10,
      bold: true,
      color: {
        argb:
          item.highlight === 'warn'
            ? 'FFBE123C'
            : item.highlight === 'ok'
            ? 'FF047857'
            : 'FF1F3864',
      },
    };
    if (item.numFmt) cellG.numFmt = item.numFmt;
    cellG.alignment = { vertical: 'middle', horizontal: 'right' };

    cellH.value = item.desc;
    cellH.font = { name: 'Microsoft YaHei', size: 8, color: { argb: 'FF64748B' } };
    cellH.alignment = { vertical: 'middle', horizontal: 'left' };

    [cellF, cellG, cellH, ws1.getCell(`I${r}`), ws1.getCell(`J${r}`)].forEach((c) => {
      c.border = THIN_BORDER;
    });
  });

  // Row 18: 阶梯表Banner
  ws1.mergeCells('A18:J18');
  const ladderBanner = ws1.getCell('A18');
  ladderBanner.value = `第 19~39 行：日内买卖网格阶梯表（超出每边格数 ${calcResult.actualGridCountC8} 档自动留空）`;
  ladderBanner.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ladderBanner.fill = SUB_BLUE_FILL;
  ladderBanner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(18).height = 24;

  // Row 19: 阶梯表表头 (无底色)
  const ladderHeaders = [
    '档位 k',
    '挂单价格 (¥)',
    '交易方向',
    '距基准 (%)',
    '每格资金 (¥)',
    '委托份数',
    '成交金额 (¥)',
    '平仓配对价 (¥)',
    '单格毛利 (¥)',
    '单格净利 (¥)',
  ];
  ladderHeaders.forEach((h, idx) => {
    const cell = ws1.getRow(19).getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: 'FF1E293B' } };
    cell.border = THIN_BORDER;
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 0 || idx === 2 ? 'center' : 'right',
    };
  });
  ws1.getRow(19).height = 22;

  // Rows 20~40: k from +10 to -10
  calcResult.ladderRows.forEach((row, idx) => {
    const r = 20 + idx;
    const isBase = row.k === 0;
    const isSell = row.k > 0;

    const cA = ws1.getCell(`A${r}`);
    const cB = ws1.getCell(`B${r}`);
    const cC = ws1.getCell(`C${r}`);
    const cD = ws1.getCell(`D${r}`);
    const cE = ws1.getCell(`E${r}`);
    const cF = ws1.getCell(`F${r}`);
    const cG = ws1.getCell(`G${r}`);
    const cH = ws1.getCell(`H${r}`);
    const cI = ws1.getCell(`I${r}`);
    const cJ = ws1.getCell(`J${r}`);

    cA.value = row.k;
    cA.numFmt = '+0;-0;0';
    cA.alignment = { vertical: 'middle', horizontal: 'center' };

    cB.value = {
      formula: `IF(ABS($A${r})>$C$8,"",ROUND($C$5+$A${r}*$G$5,4))`,
      result: row.isEmpty ? '' : row.price,
    };
    cB.numFmt = '0.0000';
    cB.alignment = { vertical: 'middle', horizontal: 'right' };

    cC.value = {
      formula: `IF(ABS($A${r})>$C$8,"",IF($A${r}>0,"卖出",IF($A${r}<0,"买入","中轴基准")))`,
      result: row.isEmpty ? '' : row.direction,
    };
    cC.alignment = { vertical: 'middle', horizontal: 'center' };

    cD.value = {
      formula: `IF(ABS($A${r})>$C$8,"",(B${r}-$C$5)/$C$5)`,
      result: row.isEmpty ? '' : row.distPct / 100,
    };
    cD.numFmt = '+0.00%;-0.00%;0.00%';
    cD.alignment = { vertical: 'middle', horizontal: 'right' };

    cE.value = {
      formula: `IF(OR(ABS($A${r})>$C$8,$A${r}=0),"",$C$9)`,
      result: row.isEmpty || isBase ? '' : row.perGridMoney,
    };
    cE.numFmt = '#,##0';
    cE.alignment = { vertical: 'middle', horizontal: 'right' };

    cF.value = {
      formula: `IF(OR(ABS($A${r})>$C$8,$A${r}=0),"",FLOOR(E${r}/B${r}/$C$12,1)*$C$12)`,
      result: row.isEmpty || isBase ? '' : row.shares,
    };
    cF.numFmt = '#,##0';
    cF.alignment = { vertical: 'middle', horizontal: 'right' };

    cG.value = {
      formula: `IF(OR(ABS($A${r})>$C$8,$A${r}=0),"",F${r}*B${r})`,
      result: row.isEmpty || isBase ? '' : row.amount,
    };
    cG.numFmt = '#,##0.0';
    cG.alignment = { vertical: 'middle', horizontal: 'right' };

    cH.value = {
      formula: `IF(OR(ABS($A${r})>$C$8,$A${r}=0),"",IF($A${r}<0,B${r}+$G$5,B${r}-$G$5))`,
      result: row.isEmpty || isBase ? '' : row.pairPrice,
    };
    cH.numFmt = '0.0000';
    cH.alignment = { vertical: 'middle', horizontal: 'right' };

    cI.value = {
      formula: `IF(OR(ABS($A${r})>$C$8,$A${r}=0),"",F${r}*$G$5)`,
      result: row.isEmpty || isBase ? '' : row.grossProfit,
    };
    cI.numFmt = '0.00';
    cI.alignment = { vertical: 'middle', horizontal: 'right' };

    cJ.value = {
      formula: `IF(OR(ABS($A${r})>$C$8,$A${r}=0),"",I${r}-(B${r}+H${r})*F${r}*$C$10)`,
      result: row.isEmpty || isBase ? '' : row.netProfit,
    };
    cJ.numFmt = '0.00';
    cJ.alignment = { vertical: 'middle', horizontal: 'right' };

    const rowFontColor = row.isEmpty
      ? 'FFCBD5E1'
      : isBase
      ? 'FF92400E'
      : isSell
      ? 'FFE11D48'
      : 'FF047857';

    [cA, cB, cC, cD, cE, cF, cG, cH, cI, cJ].forEach((c) => {
      c.font = { name: 'Consolas', size: 9, bold: isBase || !row.isEmpty, color: { argb: rowFontColor } };
      // 自动计算的阶梯表无背景填充色，中轴基准行采用上下中粗琥珀色边框标识
      c.border = isBase
        ? {
            top: { style: 'medium', color: { argb: 'FFD97706' } },
            bottom: { style: 'medium', color: { argb: 'FFD97706' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          }
        : THIN_BORDER;
    });
    ws1.getRow(r).height = 19;
  });

  // =========================================================================
  // Sheet 2: ATR 计算器
  // =========================================================================
  const ws2 = wb.addWorksheet('ATR计算器', {
    views: [{ showGridLines: true }],
  });
  ws2.columns = [
    { width: 10 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  ws2.mergeCells('A1:G1');
  const ws2Title = ws2.getCell('A1');
  ws2Title.value = `${formInputs.code} ${formInputs.name} · Sheet 2：近 15 个交易日真实波幅 (TR) 与 ATR14 测算`;
  ws2Title.font = { name: 'Microsoft YaHei', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws2Title.fill = DARK_BLUE_FILL;
  ws2Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws2.getRow(1).height = 28;

  // Summary rows 3-4
  ws2.getCell('A3').value = 'ATR14 均值';
  ws2.getCell('B3').value = {
    formula: `IFERROR(AVERAGE(G6:G${5 + sheet2Data.rows.length}),0)`,
    result: sheet2Data.atr14,
  };
  ws2.getCell('B3').numFmt = '0.0000';
  ws2.getCell('C3').value = 'ATR14 占现价%';
  ws2.getCell('D3').value = sheet2Data.atr14Percent / 100;
  ws2.getCell('D3').numFmt = '0.00%';
  ws2.getCell('E3').value = '折算15分钟ATR(×0.124)';
  ws2.getCell('F3').value = {
    formula: 'B3*0.124',
    result: sheet2Data.atr15m,
  };
  ws2.getCell('F3').numFmt = '0.0000';
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'].forEach((addr) => {
    const c = ws2.getCell(addr);
    c.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF1F3864' } };
    c.border = THIN_BORDER;
  });
  ws2.getRow(3).height = 22;

  const s2Headers = ['序号', '交易日期', '最高价 (High)', '最低价 (Low)', '收盘价 (Close)', '前收价 (PrevClose)', 'TR 真实波幅'];
  s2Headers.forEach((h, idx) => {
    const c = ws2.getRow(5).getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = SUB_BLUE_FILL;
    c.border = THIN_BORDER;
    c.alignment = { vertical: 'middle', horizontal: idx <= 1 ? 'center' : 'right' };
  });
  ws2.getRow(5).height = 22;

  sheet2Data.rows.forEach((r, idx) => {
    const rowIdx = 6 + idx;
    const row = ws2.getRow(rowIdx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = r.date;
    row.getCell(3).value = r.high;
    row.getCell(4).value = r.low;
    row.getCell(5).value = r.close;
    row.getCell(6).value = r.prevClose;
    row.getCell(7).value = {
      formula: `MAX(C${rowIdx}-D${rowIdx},ABS(C${rowIdx}-F${rowIdx}),ABS(D${rowIdx}-F${rowIdx}))`,
      result: r.tr,
    };

    [3, 4, 5, 6].forEach((ci) => {
      row.getCell(ci).numFmt = '0.000';
      row.getCell(ci).alignment = { vertical: 'middle', horizontal: 'right' };
    });
    row.getCell(7).numFmt = '0.0000';
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let ci = 1; ci <= 7; ci++) {
      row.getCell(ci).font = {
        name: 'Consolas',
        size: 9,
        bold: ci === 7,
        color: ci === 7 ? { argb: 'FF1F3864' } : undefined,
      };
      row.getCell(ci).border = THIN_BORDER;
    }
    row.height = 19;
  });

  // =========================================================================
  // Sheet 3: 回测参考与纪律
  // =========================================================================
  const ws3 = wb.addWorksheet('回测参考与纪律', {
    views: [{ showGridLines: true }],
  });
  ws3.columns = [
    { width: 14 },
    { width: 15 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 24 },
  ];

  ws3.mergeCells('A1:H1');
  const ws3Title = ws3.getCell('A1');
  ws3Title.value = `${formInputs.code} ${formInputs.name} · Sheet 3：不同格距方案回测对比与操作纪律`;
  ws3Title.font = { name: 'Microsoft YaHei', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws3Title.fill = DARK_BLUE_FILL;
  ws3Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws3.getRow(1).height = 28;

  const s3Headers = ['方案', '网格间距 (元)', '间距百分比', '预估日均买卖对', '零触发天数', '预估日均盈亏 (¥)', '21日累计盈亏 (¥)', '综合评级'];
  s3Headers.forEach((h, idx) => {
    const c = ws3.getRow(3).getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = SUB_BLUE_FILL;
    c.border = THIN_BORDER;
    c.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 4 || idx === 7 ? 'center' : 'right' };
  });
  ws3.getRow(3).height = 22;

  backtestComparison.forEach((item, idx) => {
    const rowIdx = 4 + idx;
    const row = ws3.getRow(rowIdx);
    row.getCell(1).value = item.isSelected ? '★ 当前选中' : `方案 ${String.fromCharCode(65 + idx)}`;
    row.getCell(2).value = item.step;
    row.getCell(2).numFmt = '0.000';
    row.getCell(3).value = item.stepPct;
    row.getCell(4).value = item.pairs;
    row.getCell(5).value = `${item.zeroDays} 天`;
    row.getCell(6).value = item.dailyPnL;
    row.getCell(6).numFmt = '+¥#,##0.0;-¥#,##0.0';
    row.getCell(7).value = item.cumulative21;
    row.getCell(7).numFmt = '+¥#,##0;-¥#,##0';
    row.getCell(8).value =
      item.step === 0.004
        ? '★★★★★ 胜率最优 (推荐)'
        : item.step < 0.004
        ? '★★★ 高频摩擦大'
        : '★★★★ 稳健大波段';

    for (let ci = 1; ci <= 8; ci++) {
      const c = row.getCell(ci);
      c.font = {
        name: 'Microsoft YaHei',
        size: 9,
        bold: item.isSelected,
        color: item.isSelected ? { argb: 'FF92400E' } : undefined,
      };
      c.border = item.isSelected
        ? {
            top: { style: 'medium', color: { argb: 'FFD97706' } },
            bottom: { style: 'medium', color: { argb: 'FFD97706' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          }
        : THIN_BORDER;
      c.alignment = {
        vertical: 'middle',
        horizontal: ci === 1 || ci === 5 || ci === 8 ? 'center' : 'right',
      };
    }
    row.height = 20;
  });

  // 操作纪律与风险说明
  const notes: string[] = [
    'T+0 日内网格 4 大操作纪律：',
    '1. 严格底仓对应：日内做T原则上要求收盘前恢复初始底仓份额，坚决不过夜增加净裸多空风险。',
    '2. 不加塞手动撤单：一旦挂出阶梯限价单，交给条件单自动触发，避免人为情绪干扰交易节奏。',
    '3. 成本比红线戒律：若 G12 成本占格距比 > 50%，必须调大格距或更换低费率券商。',
    '4. 单边破位坚决止损：跌破最底档超过 1% 且持续放量时，执行风控减仓。',
    '',
    '5 大风险提示：单边暴跌风险 / 单边暴涨踏空风险 / 跨境溢价波动风险 / 流动性摩擦风险 / 仅供策略参数学习参考，不构成投资建议。',
  ];
  notes.forEach((line, i) => {
    const r = 12 + i;
    ws3.mergeCells(`A${r}:H${r}`);
    const cell = ws3.getCell(`A${r}`);
    cell.value = line;
    cell.font = {
      name: 'Microsoft YaHei',
      size: i === 0 ? 10 : 9,
      bold: i === 0,
      color: { argb: i === 0 ? 'FF1F3864' : 'FF334155' },
    };
    ws3.getRow(r).height = 20;
  });

  // 写出为 Blob 并触发下载
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${formInputs.code}_${formInputs.name}_T0日内网格计算模板_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
