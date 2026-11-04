import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  useConfirmWorkforceImport,
  useValidateWorkforceImport,
  useWorkdaySync,
  useWorkforceImportMapping
} from '@features/workforce/workforceImportApi';
import type { ImportJob } from '../../../types/import.types';
import type { WorkforceImportMapping } from '../../../types/workforce-governance.types';
import { WorkforcePageHeader } from '../../../components';

type Step = 'upload' | 'mapping' | 'validation' | 'success';

function WorkforceImportPage(): JSX.Element {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<WorkforceImportMapping | null>(null);
  const [validationJob, setValidationJob] = useState<ImportJob | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapColumns = useWorkforceImportMapping();
  const validateImport = useValidateWorkforceImport();
  const confirmImport = useConfirmWorkforceImport();
  const workdaySync = useWorkdaySync();

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleMapping = async () => {
    if (!selectedFile) {
      return;
    }
    const result = await mapColumns.mutateAsync(selectedFile);
    setMapping(result);
    setStep('mapping');
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      return;
    }
    const job = await validateImport.mutateAsync(selectedFile);
    setValidationJob(job);
    setStep('validation');
  };

  const handleConfirm = async () => {
    if (!validationJob) {
      return;
    }
    await confirmImport.mutateAsync(validationJob.id);
    setStep('success');
  };

  const handleWorkdayDryRun = async () => {
    const result = await workdaySync.mutateAsync(true);
    setSyncResult(
      `Dry run: processed ${result.processedRows}, would update ${result.updatedRows}, skipped ${result.skippedRows}`
    );
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Workforce Import"
        description="Import allocations and workforce profiles from Excel. Duplicate email + project code rows are skipped."
        actions={
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleWorkdayDryRun} disabled={workdaySync.isPending}>
              Workday sync (dry run)
            </Button>
            {syncResult ? <Typography variant="body2">{syncResult}</Typography> : null}
          </Stack>
        }
      />

      {step === 'upload' && (
        <Card>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
            <Stack spacing={2}>
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>
                {selectedFile ? selectedFile.name : 'Choose Excel file'}
              </Button>
              <Button onClick={handleMapping} disabled={!selectedFile || mapColumns.isPending}>
                Continue to mapping
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && mapping ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Suggested column mapping
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Header</TableCell>
                  <TableCell>Mapped field</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(mapping.suggestedMapping).map(([header, field]) => (
                  <TableRow key={header}>
                    <TableCell>{header}</TableCell>
                    <TableCell>{field}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleValidate} disabled={validateImport.isPending}>
                Validate file
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {step === 'validation' && validationJob ? (
        <Card>
          <CardContent>
            <Alert severity={(validationJob.errorRows ?? 0) > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
              {validationJob.validRows} valid rows, {validationJob.errorRows} errors
            </Alert>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(validationJob.errors ?? []).map((error, index) => (
                  <TableRow key={`${error.row}-${index}`}>
                    <TableCell>{error.row}</TableCell>
                    <TableCell>{error.severity}</TableCell>
                    <TableCell>{error.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmImport.isPending || (validationJob.errorRows ?? 0) > 0}
              >
                Confirm import
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {step === 'success' ? (
        <Alert severity="success">Workforce import completed successfully.</Alert>
      ) : null}
    </Box>
  );
}

export default WorkforceImportPage;
