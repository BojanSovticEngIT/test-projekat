import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import AllocationEndFlow, { type AllocationEndStep } from '@features/allocation/AllocationEndFlow';
import { useAllocation } from '@features/allocation/allocationApi';

function WorkforceAllocationEndPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: allocation, isLoading, isError } = useAllocation(id);
  const [step, setStep] = useState<AllocationEndStep>('skills');
  const goBack = (): void => navigate('/workforce/allocations');

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
        <Button sx={{ mt: 2 }} onClick={goBack}>
          Back to Allocations
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <WorkforcePageHeader
        title={step === 'skills' ? 'Confirm Engagement Skills' : 'End Allocation'}
        description={`${allocation.employeeName} on ${allocation.projectName}`}
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Allocations', to: '/workforce/allocations' },
          { label: 'End Allocation' }
        ]}
      />

      <Card sx={{ maxWidth: 900 }}>
        <CardContent>
          {allocation.lifecycleStatus === 'TERMINATED' ? (
            <>
              <Alert severity="info">This allocation is already terminated.</Alert>
              <Button sx={{ mt: 2 }} onClick={goBack}>
                Back to Allocations
              </Button>
            </>
          ) : (
            <AllocationEndFlow allocation={allocation} onDone={goBack} onCancel={goBack} onStepChange={setStep} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationEndPage;
