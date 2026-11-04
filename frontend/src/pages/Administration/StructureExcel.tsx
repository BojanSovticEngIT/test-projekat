import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Button } from '@mui/material';
import { isAxiosError } from 'axios';
import type { StructureImportResult } from '../../types/workforce.types';

export const getImportErrorMessage = (error: unknown): string =>
  (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) || 'The file could not be imported.';

interface StructureExcelButtonsProps {
  canImport: boolean;
  exporting: boolean;
  importing: boolean;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function StructureExcelButtons({
  canImport,
  exporting,
  importing,
  onExport,
  onImport
}: StructureExcelButtonsProps): JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImport(file);
  };

  return (
    <>
      <Button variant="outlined" onClick={onExport} disabled={exporting}>
        Export Excel
      </Button>
      {canImport ? (
        <>
          <Button variant="outlined" onClick={() => fileInput.current?.click()} disabled={importing}>
            Import Excel
          </Button>
          <input ref={fileInput} type="file" accept=".xlsx" hidden aria-label="Import file" onChange={handleFile} />
        </>
      ) : null}
    </>
  );
}

interface ImportResultAlertProps {
  result: StructureImportResult;
  onClose: () => void;
}

export function ImportResultAlert({ result, onClose }: ImportResultAlertProps): JSX.Element {
  const failed = result.errors.length > 0;
  return (
    <Alert severity={failed ? 'error' : 'success'} sx={{ mb: 2 }} onClose={onClose}>
      {failed ? (
        <>
          Nothing was imported. Fix these rows and try again:
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.errors.slice(0, 20).map((error, index) => (
              <li key={index}>
                Row {error.row}: {error.message}
              </li>
            ))}
          </ul>
          {result.errors.length > 20 ? `…and ${result.errors.length - 20} more.` : null}
        </>
      ) : result.created + result.updated === 0 ? (
        'No changes: every node in the file already exists.'
      ) : (
        `Import finished: ${result.created} created, ${result.updated} updated.`
      )}
    </Alert>
  );
}
