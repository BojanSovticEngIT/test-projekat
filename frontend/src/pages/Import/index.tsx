import { useCallback, useRef, useState } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';
import {
  useConfirmImport,
  useImportJobs,
  useValidateImport
} from '@features/import/importApi';
import type { ImportJob } from '../../types/import.types';

type Step = 'upload' | 'validation' | 'confirm' | 'success';

const formatDate = (value: string): string => new Date(value).toLocaleString();

const ImportJobStatusChip = ({ status }: { status: ImportJob['status'] }): JSX.Element => {
  const colorMap: Record<ImportJob['status'], 'default' | 'info' | 'success' | 'error'> = {
    PENDING: 'default',
    VALIDATED: 'info',
    CONFIRMED: 'success',
    FAILED: 'error'
  };
  return <Chip label={status} color={colorMap[status]} size="small" />;
};

const ImportPage = (): JSX.Element => {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationJob, setValidationJob] = useState<ImportJob | null>(null);
  const [confirmedJob, setConfirmedJob] = useState<ImportJob | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historySize, setHistorySize] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateMutation = useValidateImport();
  const confirmMutation = useConfirmImport();
  const { data: historyData, isLoading: historyLoading } = useImportJobs({
    page: historyPage,
    size: historySize
  });

  const hasCriticalErrors = validationJob?.errors?.some((e) => e.severity === 'ERROR') ?? false;

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleValidate = async () => {
    if (!selectedFile) {
      return;
    }
    try {
      const job = await validateMutation.mutateAsync(selectedFile);
      setValidationJob(job);
      setStep('validation');
    } catch {
      // error displayed via mutation.error
    }
  };

  const handleConfirm = async () => {
    if (!validationJob) {
      return;
    }
    try {
      const job = await confirmMutation.mutateAsync(validationJob.id);
      setConfirmedJob(job);
      setStep('success');
    } catch {
      // error displayed via mutation.error
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setValidationJob(null);
    setConfirmedJob(null);
    validateMutation.reset();
    confirmMutation.reset();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Import
        </Typography>
        <Typography color="text.secondary">Bulk import employees and skill data from Excel.</Typography>
      </Box>

      {/* ── Step 1: Upload ──────────────────────────────────────── */}
      {step === 'upload' && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Step 1 — Upload Excel File
            </Typography>
            <Box
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 6,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragOver ? 'action.hover' : 'background.default',
                transition: 'all 0.2s'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                }}
              />
              <CloudUploadOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Drag & drop an <strong>.xlsx</strong> file here, or click to browse
              </Typography>
              {selectedFile && (
                <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                  Selected: <strong>{selectedFile.name}</strong>
                </Typography>
              )}
            </Box>

            {validateMutation.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {String(validateMutation.error)}
              </Alert>
            )}

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                disabled={!selectedFile || validateMutation.isPending}
                onClick={handleValidate}
              >
                Validate File
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Validation Result ───────────────────────────── */}
      {step === 'validation' && validationJob && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Step 2 — Validation Result
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`Total rows: ${validationJob.totalRows ?? 0}`} color="default" />
              <Chip label={`Valid: ${validationJob.validRows ?? 0}`} color="success" />
              <Chip
                label={`Errors: ${validationJob.errorRows ?? 0}`}
                color={validationJob.errorRows ? 'error' : 'default'}
              />
              <Chip
                label={`Warnings: ${validationJob.warningRows ?? 0}`}
                color={validationJob.warningRows ? 'warning' : 'default'}
              />
            </Stack>

            {validationJob.errors.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Field</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validationJob.errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell>{err.row}</TableCell>
                        <TableCell>
                          <Chip
                            label={err.severity}
                            color={err.severity === 'ERROR' ? 'error' : 'warning'}
                            size="small"
                            icon={
                              err.severity === 'ERROR' ? (
                                <ErrorOutlineIcon />
                              ) : (
                                <WarningAmberOutlinedIcon />
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>{err.field}</TableCell>
                        <TableCell>{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="success">No validation errors found. All rows are valid.</Alert>
            )}

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={handleReset}>
                Start Over
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={hasCriticalErrors || confirmMutation.isPending}
                onClick={() => setStep('confirm')}
                title={hasCriticalErrors ? 'Fix critical errors before confirming' : undefined}
              >
                Proceed to Confirm
              </Button>
            </Box>

            {hasCriticalErrors && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Import cannot proceed — there are rows with critical errors. Please fix your file and
                re-upload.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Confirm ─────────────────────────────────────── */}
      {step === 'confirm' && validationJob && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Step 3 — Confirm Import
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You are about to import <strong>{validationJob.validRows ?? 0}</strong> valid row(s) from{' '}
              <strong>{validationJob.fileName}</strong>.{' '}
              {(validationJob.errorRows ?? 0) > 0 && (
                <span>
                  <strong>{validationJob.errorRows}</strong> row(s) with critical errors will be skipped.
                </span>
              )}
            </Typography>

            {confirmMutation.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {String(confirmMutation.error)}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => setStep('validation')}>
                Back
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={confirmMutation.isPending}
                onClick={handleConfirm}
              >
                Confirm Import
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Success ─────────────────────────────────────── */}
      {step === 'success' && confirmedJob && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Import Complete
            </Typography>
            <Typography color="text.secondary">
              Successfully imported <strong>{confirmedJob.validRows ?? 0}</strong> row(s) from{' '}
              <strong>{confirmedJob.fileName}</strong>.
              {(confirmedJob.errorRows ?? 0) > 0 && (
                <> {confirmedJob.errorRows} row(s) with critical errors were skipped.</>
              )}
            </Typography>
            <Button variant="contained" sx={{ mt: 3 }} onClick={handleReset}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Import History ──────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Import History
          </Typography>
          {historyLoading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : historyData?.content.length === 0 ? (
            <Typography color="text.secondary">No imports yet.</Typography>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Valid</TableCell>
                      <TableCell align="right">Errors</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(historyData?.content ?? []).map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.fileName}</TableCell>
                        <TableCell>
                          <ImportJobStatusChip status={job.status} />
                        </TableCell>
                        <TableCell align="right">{job.totalRows ?? '—'}</TableCell>
                        <TableCell align="right">{job.validRows ?? '—'}</TableCell>
                        <TableCell align="right">{job.errorRows ?? '—'}</TableCell>
                        <TableCell>{formatDate(job.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={historyData?.totalElements ?? 0}
                page={historyPage}
                rowsPerPage={historySize}
                rowsPerPageOptions={[5, 10, 25]}
                onPageChange={(_, p) => setHistoryPage(p)}
                onRowsPerPageChange={(e) => {
                  setHistorySize(parseInt(e.target.value, 10));
                  setHistoryPage(0);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default ImportPage;
