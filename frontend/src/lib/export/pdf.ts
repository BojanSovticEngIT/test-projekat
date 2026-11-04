import { chartCanvas, canvasBytes } from './image';
import {
  cellText,
  formatGenerated,
  type Report,
  type ReportTable,
} from './report';

// Minimal PDF 1.4 writer: A4 landscape, standard Helvetica fonts, tables as text, charts as embedded JPEG images.
// Standard fonts only cover basic Latin, so other characters are transliterated (e.g. "ć" -> "c").

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const ascii = (value: string): string =>
  value
    .replace(/đ/g, 'dj')
    .replace(/Đ/g, 'Dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/€/g, 'EUR ')
    .replace(/[•·]/g, '-')
    .replace(/[^\x20-\x7E]/g, '?');

const pdfString = (value: string): string =>
  `(${ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;

const truncate = (
  value: string,
  width: number,
  size: number,
  bold = false
): string => {
  const text = ascii(value);
  const max = Math.max(1, Math.floor(width / (size * (bold ? 0.56 : 0.5))));
  return text.length > max ? `${text.slice(0, Math.max(1, max - 3))}...` : text;
};

interface PdfImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export const pdfBlob = async (report: Report): Promise<Blob> => {
  const images: PdfImage[] = [];
  for (const chart of report.charts ?? []) {
    const canvas = chartCanvas(chart, 1100);
    images.push({
      bytes: await canvasBytes(canvas, 'image/jpeg'),
      width: canvas.width,
      height: canvas.height,
    });
  }

  const pages: string[] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN;
  const newPage = (): void => {
    if (ops.length) pages.push(ops.join('\n'));
    ops = [];
    y = PAGE_H - MARGIN;
  };
  const ensure = (height: number): void => {
    if (y - height < MARGIN) newPage();
  };
  const text = (
    x: number,
    size: number,
    value: string,
    bold = false,
    grey = false
  ): void => {
    ops.push(
      `BT ${grey ? '0.36 0.38 0.44' : '0 0 0'} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td ${pdfString(value)} Tj ET`
    );
  };
  const line = (
    size: number,
    value: string,
    bold = false,
    grey = false
  ): void => {
    ensure(size + 6);
    y -= size + 4;
    text(MARGIN, size, truncate(value, CONTENT_W, size, bold), bold, grey);
  };

  ops.push(`0 0.18 0.33 rg 0 ${PAGE_H - 6} ${PAGE_W} 6 re f`);
  line(18, report.title, true);
  if (report.subtitle) line(11, report.subtitle);
  line(9, formatGenerated(report), false, true);
  y -= 6;
  if (report.criteria.length) {
    line(10, 'Criteria', true);
    report.criteria.forEach((item) => line(9, `- ${item}`));
  }
  report.notes?.forEach((note) => line(9, `Note: ${note}`, false, true));
  if (report.kpis?.length) {
    y -= 6;
    line(10, 'Key figures', true);
    report.kpis.forEach((kpi) => line(9, `${kpi.label}: ${kpi.value}`));
  }

  images.forEach((image, index) => {
    const scale = Math.min(
      CONTENT_W / image.width,
      (PAGE_H - MARGIN * 2 - 20) / image.height
    );
    const w = image.width * scale;
    const h = image.height * scale;
    ensure(h + 10);
    y -= h + 10;
    ops.push(
      `q ${w.toFixed(1)} 0 0 ${h.toFixed(1)} ${MARGIN} ${y.toFixed(1)} cm /Im${index + 1} Do Q`
    );
  });

  const drawTable = (table: ReportTable): void => {
    const size = 8;
    const rowH = 13;
    const lengths = table.columns.map((column, index) =>
      Math.min(
        40,
        Math.max(
          column.length,
          ...table.rows.slice(0, 100).map((row) => cellText(row[index]).length),
          4
        )
      )
    );
    const total = lengths.reduce((sum, value) => sum + value, 0);
    const widths = lengths.map((value) => (CONTENT_W * value) / total);
    const header = (): void => {
      ensure(rowH * 2);
      y -= rowH;
      ops.push(
        `0.9 0.91 0.92 rg ${MARGIN} ${(y - 3).toFixed(1)} ${CONTENT_W} ${rowH} re f`
      );
      let x = MARGIN + 2;
      table.columns.forEach((column, index) => {
        text(x, size, truncate(column, widths[index] - 4, size, true), true);
        x += widths[index];
      });
    };
    y -= 8;
    line(12, table.title, true);
    header();
    table.rows.forEach((row) => {
      if (y - rowH < MARGIN) {
        newPage();
        header();
      }
      y -= rowH;
      let x = MARGIN + 2;
      table.columns.forEach((_, index) => {
        text(x, size, truncate(cellText(row[index]), widths[index] - 4, size));
        x += widths[index];
      });
    });
    if (!table.rows.length) line(9, 'No rows.', false, true);
  };
  report.tables.forEach(drawTable);
  newPage();

  // Object ids: 1 catalog, 2 pages, 3-4 fonts, 5 resources, then images, then content+page pairs.
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array): void => {
    parts.push(data);
    length += data.length;
  };
  const object = (id: number, body: string, stream?: Uint8Array): void => {
    offsets[id] = length;
    if (stream) {
      push(encoder.encode(`${id} 0 obj\n${body}\nstream\n`));
      push(stream);
      push(encoder.encode('\nendstream\nendobj\n'));
    } else {
      push(encoder.encode(`${id} 0 obj\n${body}\nendobj\n`));
    }
  };

  const imageBase = 6;
  const pageBase = imageBase + images.length;
  const pageIds = pages.map((_, index) => pageBase + index * 2 + 1);

  push(
    new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3,
      0xcf, 0xd3, 0x0a,
    ])
  );
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  );
  object(
    3,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  object(
    4,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );
  object(
    5,
    `<< /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${images.map((_, index) => `/Im${index + 1} ${imageBase + index} 0 R`).join(' ')} >> >>`
  );
  images.forEach((image, index) =>
    object(
      imageBase + index,
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>`,
      image.bytes
    )
  );
  pages.forEach((content, index) => {
    const contentId = pageBase + index * 2;
    const footer = `BT 0.36 0.38 0.44 rg /F1 8 Tf ${MARGIN} 18 Td ${pdfString(`${report.title} - page ${index + 1} of ${pages.length}`)} Tj ET`;
    const stream = encoder.encode(`${content}\n${footer}`);
    object(contentId, `<< /Length ${stream.length} >>`, stream);
    object(
      contentId + 1,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources 5 0 R /Contents ${contentId} 0 R >>`
    );
  });

  const size = pageBase + pages.length * 2;
  const xrefOffset = length;
  const xref = [`xref\n0 ${size}\n0000000000 65535 f \n`];
  for (let id = 1; id < size; id += 1)
    xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(
    encoder.encode(
      `${xref.join('')}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    )
  );
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
};
