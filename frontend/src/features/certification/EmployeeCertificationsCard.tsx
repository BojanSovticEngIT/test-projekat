import { useState } from 'react';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
  Alert,
  Card,
  CardContent,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { useDownloadEmployeeCertificationDocument, useEmployeeCertifications } from './certificationApi';
import { certificationDataColumns } from './certificationColumns';

interface EmployeeCertificationsCardProps {
  employeeId: string;
}

const COLUMN_COUNT = certificationDataColumns.length + 1;
const LOADING_ROWS = 3;

// Read-only: lists certificate metadata and offers PDF download only.
function EmployeeCertificationsCard({ employeeId }: EmployeeCertificationsCardProps): JSX.Element {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, isLoading, isError } = useEmployeeCertifications(employeeId, { page, size });
  const download = useDownloadEmployeeCertificationDocument(employeeId);

  const rows = data?.content ?? [];
  const total = data?.page.totalElements ?? 0;

  const handleDownload = async (id: string, fileName: string): Promise<void> => {
    setDownloadError(null);
    try {
      await download.mutateAsync({ id, fileName });
    } catch {
      setDownloadError('Unable to download the PDF.');
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Certifications
        </Typography>
        {isError ? <Alert severity="error">Unable to load certifications.</Alert> : null}
        {downloadError ? <Alert severity="error">{downloadError}</Alert> : null}
        {!isError ? (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  {certificationDataColumns.map((column) => (
                    <TableCell key={column.label}>{column.label}</TableCell>
                  ))}
                  <TableCell>Document</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: LOADING_ROWS }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={COLUMN_COUNT}>
                        <Skeleton />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT}>No certifications available</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      {certificationDataColumns.map((column) => (
                        <TableCell key={column.label}>{column.render?.(row)}</TableCell>
                      ))}
                      <TableCell>
                        {row.documentFileName ? (
                          <Tooltip title="Download PDF">
                            <IconButton
                              size="small"
                              aria-label={`Download PDF for ${row.name}`}
                              onClick={() => void handleDownload(row.id, row.documentFileName as string)}
                            >
                              <DownloadOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {total > 10 ? (
              <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={[10, 20, 50]}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                onRowsPerPageChange={(event) => {
                  setSize(Number(event.target.value));
                  setPage(0);
                }}
              />
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default EmployeeCertificationsCard;
