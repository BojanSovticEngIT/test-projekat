import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import ProjectForm from '@features/workforce/ProjectForm';
import { useHorizontalNodes, useProject, useUpdateProject } from '@features/workforce/workforceApi';

function WorkforceProjectEditPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, isError } = useProject(id);
  const { isLoading: nodesLoading } = useHorizontalNodes();
  const updateProject = useUpdateProject();

  if (isLoading || nodesLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !project) {
    return (
      <Box>
        <Typography color="error">Project not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/workforce/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  const detailPath = `/workforce/projects/${project.id}`;

  return (
    <Box>
      <WorkforcePageHeader
        title="Edit Project"
        description={`Update ${project.name}.`}
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Projects/Services', to: '/workforce/projects' },
          { label: project.name, to: detailPath },
          { label: 'Edit' }
        ]}
      />

      <ProjectForm
        initialProject={project}
        submitLabel="Save"
        submitting={updateProject.isPending}
        onSubmit={async (payload) => {
          await updateProject.mutateAsync({ id: project.id, payload });
          navigate(detailPath);
        }}
        onCancel={() => navigate(detailPath)}
      />
    </Box>
  );
}

export default WorkforceProjectEditPage;
