import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeleteProject, useProject } from '@features/workforce/workforceApi';
import useAuthStore from '@store/authStore';
import { StatusChip } from '../../../components';
import { showGlobalToast } from '../../../lib/globalToast';
import { UserRole } from '../../../types/enums';

function WorkforceProjectDetailPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, isError } = useProject(id);
  const deleteProject = useDeleteProject();
  const user = useAuthStore((state) => state.user);
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.PMO;
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) {
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

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteProject.mutateAsync(project.id);
      navigate('/workforce/projects');
    } catch (error) {
      setConfirmOpen(false);
      // 403 and other errors are already toasted by the axios interceptor
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        showGlobalToast(String(error.response.data?.message ?? 'Project cannot be deleted'), 'error');
      }
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/workforce/projects')} sx={{ mb: 2 }}>
        Back to Projects
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">{project.name}</Typography>
          <Typography color="text.secondary">{project.code}</Typography>
        </Box>
        <StatusChip status={project.status} />
      </Stack>

      {canWrite ? (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Button variant="outlined" onClick={() => navigate(`/workforce/projects/${project.id}/edit`)}>
            Edit
          </Button>
          <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </Stack>
      ) : null}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography><strong>Client:</strong> {project.clientName || '—'}</Typography>
            <Typography>
              <strong>Vertical:</strong> {[project.verticalN1, project.verticalN2].filter(Boolean).join(' / ') || '—'}
            </Typography>
            <Typography><strong>Project Manager:</strong> {project.projectManagerName ?? '—'}</Typography>
            <Typography><strong>Horizontal:</strong> {project.horizontalNodeName ?? '—'}</Typography>
            <Typography>
              <strong>Dates:</strong> {project.startDate ?? '—'} → {project.endDate ?? '—'}
            </Typography>
            <Typography><strong>Notes:</strong> {project.notes || '—'}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action will delete project {project.name} do you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" disabled={deleteProject.isPending} onClick={() => void handleDelete()}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkforceProjectDetailPage;
