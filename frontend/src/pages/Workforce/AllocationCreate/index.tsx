import { Box, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import AllocationCreateForm from '@features/allocation/AllocationCreateForm';

function WorkforceAllocationCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const goBack = (): void => navigate('/workforce/allocations');

  return (
    <Box>
      <WorkforcePageHeader
        title="Create Allocation"
        description="Allocate an employee to a project."
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Allocations', to: '/workforce/allocations' },
          { label: 'Create Allocation' }
        ]}
      />

      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <AllocationCreateForm onDone={goBack} onCancel={goBack} />
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationCreatePage;
