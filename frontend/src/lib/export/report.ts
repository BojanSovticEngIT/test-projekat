export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'pptx' | 'png';

export type ReportCell = string | number | null;

export interface ReportTable {
  title: string;
  columns: string[];
  rows: ReportCell[][];
}

export interface ReportChart {
  title: string;
  data: { label: string; value: number }[];
}

// Everything an export contains. Built from data the API already filtered for the user's permissions.
export interface Report {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  generatedBy?: string;
  criteria: string[];
  notes?: string[];
  kpis?: { label: string; value: string }[];
  charts?: ReportChart[];
  tables: ReportTable[];
  fileName: string;
}

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
  pdf: 'PDF (.pdf)',
  pptx: 'PowerPoint (.pptx)',
  png: 'Image (.png)',
};

export const formatGenerated = (report: Report): string =>
  `Generated ${report.generatedAt.toLocaleString('en-GB')}${report.generatedBy ? ` by ${report.generatedBy}` : ''}`;

export const safeFileName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'report';

export const cellText = (value: ReportCell): string =>
  value === null || value === undefined ? '' : String(value);
