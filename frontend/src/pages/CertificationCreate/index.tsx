import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { WorkforcePageHeader } from '../../components';
import CertificationForm from '../../features/certification/CertificationForm';
import { useCreateCertification } from '../../features/certification/certificationApi';
import { useToast } from '../../lib/ToastProvider';

// Only in-app paths are accepted so the query string cannot redirect users elsewhere.
const safeReturnPath = (value: string | null): string | null =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : null;

function CertificationCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const createCertification = useCreateCertification();

  // Opened from a skill ("Add certificate"): the skill is pre-selected and the user returns to it afterwards.
  const skillId = searchParams.get('skillId');
  const skillName = searchParams.get('skillName');
  const returnTo = safeReturnPath(searchParams.get('returnTo')) ?? '/certifications';
  const [initialValues] = useState(() =>
    skillId && skillName ? { name: '', completionDate: '', skills: [{ id: skillId, name: skillName }] } : undefined
  );

  return (
    <Box>
      <WorkforcePageHeader
        title="Add certification"
        description={
          initialValues
            ? `Add the certificate as a PDF, a link, or both. It will be linked to ${skillName} so your manager can see it.`
            : 'Add the certificate as a PDF, a link, or both, and enter its details.'
        }
        breadcrumbs={[{ label: 'Certifications', to: '/certifications' }, { label: 'Add certification' }]}
      />
      <CertificationForm
        initialValues={initialValues}
        submitLabel="Add certification"
        saving={createCertification.isPending}
        onCancel={() => navigate(returnTo)}
        onSubmit={async (request) => {
          const created = await createCertification.mutateAsync(request);
          showToast(`${created.name} added.`);
          navigate(returnTo);
        }}
      />
    </Box>
  );
}

export default CertificationCreatePage;
