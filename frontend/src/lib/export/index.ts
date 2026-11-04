import { csvBlob } from './csv';
import { canvasBlob, reportCanvas } from './image';
import { pdfBlob } from './pdf';
import { pptxBlob } from './pptx';
import { safeFileName, type ExportFormat, type Report } from './report';
import { xlsxBlob } from './xlsx';

export * from './report';

const download = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const buildExport = async (
  report: Report,
  format: ExportFormat
): Promise<Blob> => {
  switch (format) {
    case 'csv':
      return csvBlob(report);
    case 'xlsx':
      return xlsxBlob(report);
    case 'pdf':
      return pdfBlob(report);
    case 'pptx':
      return pptxBlob(report);
    case 'png':
      return canvasBlob(reportCanvas(report), 'image/png');
    default:
      throw new Error('Unsupported format.');
  }
};

export const exportReport = async (
  report: Report,
  format: ExportFormat
): Promise<void> => {
  const stamp = report.generatedAt.toISOString().slice(0, 10);
  download(
    await buildExport(report, format),
    `${safeFileName(report.fileName)}-${stamp}.${format}`
  );
};
