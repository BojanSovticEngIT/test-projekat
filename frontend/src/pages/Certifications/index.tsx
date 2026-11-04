import { useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, IconButton, Stack, Tooltip } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmDialog, DataTable, WorkforcePageHeader } from '../../components';
import type { DataTableColumn } from '../../components';
import {
  useDeleteCertification,
  useDownloadCertificationDocument,
  useMyCertifications
} from '../../features/certification/certificationApi';
import { certificationDataColumns } from '../../features/certification/certificationColumns';
import { useToast } from '../../lib/ToastProvider';
import type { MyCertification } from '../../types/certification.types';

function CertificationsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [certificationToDelete, setCertificationToDelete] = useState<MyCertification | null>(null);

  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;

  const { data: certificationsPage, isLoading, isError } = useMyCertifications({ page, size });
  const deleteCertification = useDeleteCertification();
  const downloadDocument = useDownloadCertificationDocument();

  const updateParams = (mutate: (params: URLSearchParams) => void): void => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next);
  };

  const errorMessage = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

  const handleDownload = async (certification: MyCertification): Promise<void> => {
    if (!certification.documentFileName) return;
    try {
      await downloadDocument.mutateAsync({ id: certification.id, fileName: certification.documentFileName });
    } catch (error) {
      showToast(errorMessage(error, 'Unable to download the PDF.'), 'error');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!certificationToDelete) return;
    try {
      await deleteCertification.mutateAsync(certificationToDelete.id);
      showToast(`${certificationToDelete.name} deleted.`);
      setCertificationToDelete(null);
    } catch (error) {
      showToast(errorMessage(error, 'Unable to delete the certification.'), 'error');
    }
  };

  const columns: DataTableColumn<MyCertification>[] = [
    ...certificationDataColumns,
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Stack direction="row" spacing={0.5}>
          {row.documentFileName ? (
            <Tooltip title="Download PDF">
              <IconButton size="small" aria-label={`Download PDF for ${row.name}`} onClick={() => void handleDownload(row)}>
                <DownloadOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {row.link ? (
            <Tooltip title="Open link">
              <IconButton
                component="a"
                size="small"
                href={row.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open link for ${row.name}`}
              >
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Edit">
            <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => navigate(`/certifications/${row.id}/edit`)}>
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" aria-label={`Delete ${row.name}`} onClick={() => setCertificationToDelete(row)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  return (
    <Box>
      <WorkforcePageHeader
        title="Certifications"
        description="Your certificates and the skills they relate to."
        breadcrumbs={[{ label: 'Certifications' }]}
        actions={
          <Button variant="contained" onClick={() => navigate('/certifications/new')}>
            Add Certification
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={certificationsPage?.content ?? []}
        loading={isLoading}
        error={isError ? 'Unable to load certifications.' : null}
        emptyMessage="No certifications yet. Use Add Certification to add one."
        pagination={{
          page,
          size,
          total: certificationsPage?.page.totalElements ?? 0,
          onPageChange: (nextPage) => updateParams((params) => params.set('page', String(nextPage))),
          onSizeChange: (nextSize) =>
            updateParams((params) => {
              params.set('size', String(nextSize));
              params.set('page', '0');
            })
        }}
      />

      <ConfirmDialog
        open={Boolean(certificationToDelete)}
        title="Delete certification"
        message={`Delete ${certificationToDelete?.name ?? 'this certification'} and its PDF/link? This cannot be undone.`}
        confirmLabel="Delete certification"
        loading={deleteCertification.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setCertificationToDelete(null)}
      />
    </Box>
  );
}

export default CertificationsPage;
