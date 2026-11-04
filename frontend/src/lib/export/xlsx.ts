import {
  cellText,
  formatGenerated,
  type Report,
  type ReportCell,
} from './report';
import { createZip, escapeXml } from './zip';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const columnName = (index: number): string => {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

// Style ids: 0 normal, 1 bold header, 2 title.
const cell = (
  row: number,
  col: number,
  value: ReportCell,
  style = 0
): string => {
  const ref = `${columnName(col)}${row}`;
  const s = style ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value))
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  const text = cellText(value);
  if (!text) return '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
};

const sheetXml = (
  rows: { cells: ReportCell[]; style?: number }[],
  widths: number[]
): string => {
  const cols = widths.length
    ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const data = rows
    .map(
      (row, index) =>
        `<row r="${index + 1}">${row.cells.map((value, col) => cell(index + 1, col, value, row.style ?? 0)).join('')}</row>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}">${cols}<sheetData>${data}</sheetData></worksheet>`;
};

const widthsFor = (columns: string[], rows: ReportCell[][]): number[] =>
  columns.map((column, index) =>
    Math.min(
      60,
      Math.max(
        10,
        column.length + 2,
        ...rows.slice(0, 200).map((row) => cellText(row[index]).length + 2)
      )
    )
  );

const sheetName = (title: string, used: Set<string>): string => {
  const base =
    title
      .replace(/[[\]:*?/\\]/g, ' ')
      .trim()
      .slice(0, 28) || 'Sheet';
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 25)} ${n++}`;
  used.add(name.toLowerCase());
  return name;
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export const xlsxBlob = (report: Report): Blob => {
  const used = new Set<string>();
  const sheets: { name: string; xml: string }[] = [];

  const summary: { cells: ReportCell[]; style?: number }[] = [
    { cells: [report.title], style: 2 },
    ...(report.subtitle ? [{ cells: [report.subtitle] }] : []),
    { cells: [formatGenerated(report)] },
    { cells: [] },
    { cells: ['Criteria'], style: 1 },
    ...(report.criteria.length ? report.criteria : ['None']).map((item) => ({
      cells: [item] as ReportCell[],
    })),
  ];
  if (report.kpis?.length) {
    summary.push(
      { cells: [] },
      { cells: ['Metric', 'Value'], style: 1 },
      ...report.kpis.map((kpi) => ({
        cells: [kpi.label, kpi.value] as ReportCell[],
      }))
    );
  }
  if (report.notes?.length)
    summary.push(
      { cells: [] },
      { cells: ['Notes'], style: 1 },
      ...report.notes.map((note) => ({ cells: [note] as ReportCell[] }))
    );
  sheets.push({
    name: sheetName('Summary', used),
    xml: sheetXml(summary, [70, 20]),
  });

  report.tables.forEach((table) => {
    const rows = [
      { cells: table.columns as ReportCell[], style: 1 },
      ...table.rows.map((row) => ({ cells: row })),
    ];
    sheets.push({
      name: sheetName(table.title, used),
      xml: sheetXml(rows, widthsFor(table.columns, table.rows)),
    });
  });
  report.charts?.forEach((chart) => {
    const rows = [
      { cells: ['Category', 'Value'] as ReportCell[], style: 1 },
      ...chart.data.map((item) => ({
        cells: [item.label, item.value] as ReportCell[],
      })),
    ];
    sheets.push({
      name: sheetName(chart.title, used),
      xml: sheetXml(rows, [40, 12]),
    });
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('')}</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL_NS}"><sheets>${sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join('')}</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join(
      ''
    )}<Relationship Id="rId${sheets.length + 1}" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`;

  return createZip(
    [
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbook },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: STYLES },
      ...sheets.map((sheet, index) => ({
        name: `xl/worksheets/sheet${index + 1}.xml`,
        data: sheet.xml,
      })),
    ],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
};
