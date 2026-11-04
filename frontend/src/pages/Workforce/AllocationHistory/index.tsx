import { Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import AllocationHistoryList from '@features/allocation/AllocationHistoryList';
import { useAllocation } from '@features/allocation/allocationApi';

function WorkforceAllocationHistoryPage(): JSX.Element {
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
        title="Allocation History"
        description={`${allocation.employeeName} on ${allocation.projectName}`}
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Allocations', to: '/workforce/allocations' },
          { label: 'History' }
        ]}
      />

      <Card sx={{ maxWidth: 900 }}>
        <CardContent>
          <AllocationHistoryList allocationId={allocation.id} />
          <Button sx={{ mt: 2 }} onClick={() => navigate('/workforce/allocations')}>
            Back to Allocations
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationHistoryPage;
