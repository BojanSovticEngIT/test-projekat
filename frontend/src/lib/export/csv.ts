import {
  cellText,
  formatGenerated,
  type Report,
  type ReportCell,
} from './report';

// Spreadsheet apps execute cells that start with these characters; prefix them so data cannot become a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

const csvCell = (value: ReportCell): string => {
  if (typeof value === 'number') return String(value);
  let text = cellText(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildCsv = (report: Report): string => {
  const lines: string[] = [
    csvCell(report.title),
    csvCell(formatGenerated(report)),
  ];
  report.criteria.forEach((item) => lines.push(csvCell(`Criteria: ${item}`)));
  report.notes?.forEach((item) => lines.push(csvCell(`Note: ${item}`)));
  report.kpis?.forEach((kpi) =>
    lines.push([csvCell(kpi.label), csvCell(kpi.value)].join(','))
  );
  report.tables.forEach((table) => {
    lines.push('', csvCell(table.title), table.columns.map(csvCell).join(','));
    table.rows.forEach((row) => lines.push(row.map(csvCell).join(',')));
  });
  report.charts?.forEach((chart) => {
    lines.push('', csvCell(chart.title), 'Category,Value');
    chart.data.forEach((item) =>
      lines.push(`${csvCell(item.label)},${item.value}`)
    );
  });
  return lines.join('\r\n');
};

export const csvBlob = (report: Report): Blob =>
  new Blob(['\uFEFF', buildCsv(report)], { type: 'text/csv;charset=utf-8' });
