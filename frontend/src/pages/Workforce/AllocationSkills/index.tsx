import { Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import EngagementSkillsPanel from '@features/allocation/EngagementSkillsPanel';
import { useAllocation } from '@features/allocation/allocationApi';

function WorkforceAllocationSkillsPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: allocation, isLoading, isError } = useAllocation(id);

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !allocation) {
    return (
      <Box>
        <Typography color="error">Allocation not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/workforce/allocations')}>
          Back to Allocations
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <WorkforcePageHeader
        title="Engagement Skills"
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Allocations', to: '/workforce/allocations' },
          { label: 'Engagement Skills' }
        ]}
      />

      <Card sx={{ maxWidth: 900 }}>
        <CardContent>
          <EngagementSkillsPanel
            allocationId={allocation.id}
            employeeName={allocation.employeeName}
            projectName={allocation.projectName}
            lifecycleStatus={allocation.lifecycleStatus}
          />
          <Button sx={{ mt: 2 }} onClick={() => navigate('/workforce/allocations')}>
            Close
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationSkillsPage;
