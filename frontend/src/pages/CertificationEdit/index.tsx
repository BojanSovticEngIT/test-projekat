import { Alert, Box, CircularProgress } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../components';
import CertificationForm from '../../features/certification/CertificationForm';
import { useMyCertification, useUpdateCertification } from '../../features/certification/certificationApi';
import { useToast } from '../../lib/ToastProvider';

function CertificationEditPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: certification, isLoading, isError } = useMyCertification(id);
  const updateCertification = useUpdateCertification();

  return (
    <Box>
      <WorkforcePageHeader
        title="Edit certification"
        description="Change the details, replace the PDF, or update the link."
        breadcrumbs={[{ label: 'Certifications', to: '/certifications' }, { label: 'Edit certification' }]}
      />
      {isLoading ? <CircularProgress aria-label="Loading certification" /> : null}
      {isError ? <Alert severity="error">Unable to load the certification.</Alert> : null}
      {certification && id ? (
        <CertificationForm
          initialValues={certification}
          submitLabel="Save changes"
          saving={updateCertification.isPending}
          onCancel={() => navigate('/certifications')}
          onSubmit={async (request) => {
            await updateCertification.mutateAsync({ id, request });
            showToast(`${request.name} saved.`);
            navigate('/certifications');
          }}
        />
      ) : null}
    </Box>
  );
}

export default CertificationEditPage;
