import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

export interface WorkforceImportRow {
  employeeEmail: string;
  projectCode: string;
  allocationPct: number;
  startDate: string;
  endDate?: string;
}

export function writeWorkforceImportFile(rows: WorkforceImportRow[]): string {
  const sheetRows = [
    ['Employee Email', 'Project Code', 'Allocation %', 'Start Date', 'End Date'],
    ...rows.map((row) => [
      row.employeeEmail,
      row.projectCode,
      String(row.allocationPct),
      row.startDate,
      row.endDate ?? ''
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
  const filePath = path.join(os.tmpdir(), `workforce-import-${Date.now()}.xlsx`);
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

export function cleanupWorkforceImportFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
