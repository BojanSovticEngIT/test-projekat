export type ImportJobStatus = 'PENDING' | 'VALIDATED' | 'CONFIRMED' | 'FAILED';

export interface ImportRowError {
  row: number;
  severity: 'ERROR' | 'WARNING';
  field: string;
  message: string;
}

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  fileName: string;
  totalRows: number | null;
  validRows: number | null;
  errorRows: number | null;
  warningRows: number | null;
  errors: ImportRowError[];
  createdAt: string;
  confirmedAt: string | null;
}
