import { Box, Button } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import ProjectForm from '@features/workforce/ProjectForm';
import { useCreateProject } from '@features/workforce/workforceApi';

function WorkforceProjectCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createProject = useCreateProject();

  return (
    <Box>
      <WorkforcePageHeader
        title="Create Project"
        description="Add a project engagement for a client."
        actions={
          <Button variant="outlined" onClick={() => navigate('/workforce/clients/new')}>
            New Client
          </Button>
        }
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Projects/Services', to: '/workforce/projects' },
          { label: 'Create Project' }
        ]}
      />

      <ProjectForm
        initialClientId={searchParams.get('clientId') ?? undefined}
        submitLabel="Create"
        submitting={createProject.isPending}
        onSubmit={async (payload) => {
          await createProject.mutateAsync(payload);
          navigate('/workforce/projects');
        }}
        onCancel={() => navigate('/workforce/projects')}
      />
    </Box>
  );
}

export default WorkforceProjectCreatePage;
