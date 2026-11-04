import {
  cellText,
  formatGenerated,
  type Report,
  type ReportChart,
  type ReportTable,
} from './report';

const FONT = 'Arial, Helvetica, sans-serif';
const BLUE = '#002F53';
const RED = '#C5004B';
const GREY = '#5C6070';
const LINE = 28;

const fit = (
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number
): string => {
  if (ctx.measureText(text).width <= width) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > width)
    value = value.slice(0, -1);
  return `${value}…`;
};

export const chartHeight = (chart: ReportChart): number =>
  50 + Math.max(1, chart.data.length) * LINE;

// Horizontal bar chart; every chart type is exported this way so values stay readable.
export const drawBarChart = (
  ctx: CanvasRenderingContext2D,
  chart: ReportChart,
  x: number,
  y: number,
  width: number
): number => {
  ctx.fillStyle = '#000';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(fit(ctx, chart.title, width), x, y + 22);
  const labelWidth = Math.min(260, width * 0.35);
  const barArea = width - labelWidth - 70;
  const max = Math.max(1, ...chart.data.map((item) => item.value));
  ctx.font = `14px ${FONT}`;
  chart.data.forEach((item, index) => {
    const top = y + 44 + index * LINE;
    ctx.fillStyle = '#222';
    ctx.fillText(fit(ctx, item.label, labelWidth - 10), x, top + 15);
    ctx.fillStyle = index % 2 ? RED : BLUE;
    ctx.fillRect(
      x + labelWidth,
      top + 2,
      Math.max(2, (barArea * item.value) / max),
      LINE - 10
    );
    ctx.fillStyle = '#222';
    ctx.fillText(
      String(Math.round(item.value * 100) / 100),
      x + labelWidth + Math.max(2, (barArea * item.value) / max) + 8,
      top + 15
    );
  });
  if (!chart.data.length) {
    ctx.fillStyle = GREY;
    ctx.fillText('No data', x, y + 60);
  }
  return chartHeight(chart);
};

export const chartCanvas = (
  chart: ReportChart,
  width = 1100
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = chartHeight(chart) + 20;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawBarChart(ctx, chart, 20, 10, width - 40);
  return canvas;
};

const TABLE_ROWS = 30;

const drawTable = (
  ctx: CanvasRenderingContext2D,
  table: ReportTable,
  x: number,
  y: number,
  width: number
): number => {
  ctx.fillStyle = '#000';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(fit(ctx, table.title, width), x, y + 22);
  const columns = table.columns.slice(0, 8);
  const colWidth = width / Math.max(1, columns.length);
  let top = y + 36;
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(x, top, width, LINE);
  ctx.fillStyle = '#000';
  ctx.font = `bold 13px ${FONT}`;
  columns.forEach((column, index) =>
    ctx.fillText(
      fit(ctx, column, colWidth - 8),
      x + index * colWidth + 4,
      top + 19
    )
  );
  ctx.font = `13px ${FONT}`;
  table.rows.slice(0, TABLE_ROWS).forEach((row) => {
    top += LINE;
    columns.forEach((_, index) =>
      ctx.fillText(
        fit(ctx, cellText(row[index]), colWidth - 8),
        x + index * colWidth + 4,
        top + 19
      )
    );
  });
  top += LINE;
  if (table.rows.length > TABLE_ROWS || table.columns.length > columns.length) {
    ctx.fillStyle = GREY;
    ctx.fillText(
      `Image shows ${Math.min(TABLE_ROWS, table.rows.length)} of ${table.rows.length} rows and ${columns.length} of ${table.columns.length} columns. Use Excel or CSV for all data.`,
      x,
      top + 16
    );
    top += LINE;
  }
  return top - y;
};

const tableHeight = (table: ReportTable): number =>
  36 + (Math.min(TABLE_ROWS, table.rows.length) + 2) * LINE + 10;

export const reportCanvas = (
  report: Report,
  width = 1400
): HTMLCanvasElement => {
  const charts = report.charts ?? [];
  const tables = report.tables.slice(0, charts.length ? 1 : 2);
  const header =
    110 + report.criteria.length * 20 + (report.kpis?.length ? 70 : 0);
  const height =
    header +
    charts.reduce((sum, chart) => sum + chartHeight(chart) + 20, 0) +
    tables.reduce((sum, table) => sum + tableHeight(table), 0) +
    40;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, width, 8);
  ctx.fillStyle = '#000';
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText(fit(ctx, report.title, width - 60), 30, 52);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = GREY;
  ctx.fillText(formatGenerated(report), 30, 78);
  let y = 104;
  report.criteria.forEach((item) => {
    ctx.fillText(fit(ctx, `• ${item}`, width - 60), 30, y);
    y += 20;
  });
  if (report.kpis?.length) {
    const boxWidth = (width - 60) / report.kpis.length;
    report.kpis.forEach((kpi, index) => {
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(30 + index * boxWidth, y, boxWidth - 10, 60);
      ctx.fillStyle = GREY;
      ctx.font = `12px ${FONT}`;
      ctx.fillText(
        fit(ctx, kpi.label, boxWidth - 30),
        40 + index * boxWidth,
        y + 20
      );
      ctx.fillStyle = '#000';
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(
        fit(ctx, kpi.value, boxWidth - 30),
        40 + index * boxWidth,
        y + 48
      );
    });
    y += 70;
  }
  charts.forEach((chart) => {
    y += drawBarChart(ctx, chart, 30, y, width - 60) + 20;
  });
  tables.forEach((table) => {
    y += drawTable(ctx, table, 30, y, width - 60) + 10;
  });
  return canvas;
};

export const canvasBlob = (
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
  quality = 0.92
): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Image export failed.')),
      type,
      quality
    )
  );

export const canvasBytes = async (
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg'
): Promise<Uint8Array> =>
  new Uint8Array(await (await canvasBlob(canvas, type)).arrayBuffer());
