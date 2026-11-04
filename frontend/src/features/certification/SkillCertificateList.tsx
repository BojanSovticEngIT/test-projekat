import type { ReactNode } from 'react';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import type { MyCertification } from '../../types/certification.types';
import { formatDate } from '../demand/demandFormat';
import { useCertificateDocument } from './certificationApi';

interface SkillCertificateListProps {
  /** Document base URL: own certificates or the certificates of a reviewed skill. */
  documentBaseUrl: string;
  certificates?: MyCertification[];
  isLoading: boolean;
  isError: boolean;
  empty: ReactNode;
}

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Lists certificate metadata with View (opens the PDF in a new tab) and Download actions.
function SkillCertificateList({ documentBaseUrl, certificates, isLoading, isError, empty }: SkillCertificateListProps): JSX.Element {
  const { view, download } = useCertificateDocument(documentBaseUrl);
  const failed = view.isError || download.isError;

  if (isLoading) {
    return <Skeleton variant="rounded" height={56} aria-label="Loading certificates" />;
  }
  if (isError) {
    return <Alert severity="error">Unable to load certificates.</Alert>;
  }
  if (!certificates || certificates.length === 0) {
    return <>{empty}</>;
  }

  return (
    <Stack spacing={1}>
      {failed ? <Alert severity="error">Unable to open the PDF. Please try again.</Alert> : null}
      {certificates.map((certificate) => (
        <Stack
          key={certificate.id}
          component="li"
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent="space-between"
          useFlexGap
          flexWrap="wrap"
          sx={{ listStyle: 'none', py: 0.5 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            {certificate.documentFileName ? (
              <PictureAsPdfOutlinedIcon fontSize="small" color="action" />
            ) : (
              <LinkOutlinedIcon fontSize="small" color="action" />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500}>
                {certificate.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Completed {formatDate(certificate.completionDate)}
                {certificate.expirationDate ? ` · Expires ${formatDate(certificate.expirationDate)}` : ''}
                {certificate.documentFileName
                  ? ` · ${certificate.documentFileName} (${formatFileSize(certificate.documentSize ?? 0)})`
                  : ''}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {certificate.documentFileName ? (
              <>
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  aria-label={`View ${certificate.name}`}
                  disabled={view.isPending}
                  onClick={() => view.mutate(certificate.id)}
                >
                  View
                </Button>
                <Button
                  size="small"
                  startIcon={<DownloadOutlinedIcon />}
                  aria-label={`Download ${certificate.name}`}
                  disabled={download.isPending}
                  onClick={() => download.mutate({ id: certificate.id, fileName: certificate.documentFileName as string })}
                >
                  Download
                </Button>
              </>
            ) : null}
            {certificate.link ? (
              <Button
                size="small"
                component="a"
                href={certificate.link}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<LinkOutlinedIcon />}
                aria-label={`Open link for ${certificate.name}`}
              >
                Open link
              </Button>
            ) : null}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export default SkillCertificateList;
