import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import DemandEditor from '../../features/demand/DemandEditor';
import { useDemand } from '../../features/demand/demandApi';

// /demands/new adds a demand, /demands/:id/edit edits one. Both use the same form page.
function DemandFormPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: demand, isLoading, isError } = useDemand(id);

  if (!id) return <DemandEditor />;
  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isError || !demand || demand.deleted) {
    return (
      <Box>
        <Typography color="error">Demand not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/demands')}>
          Back to Demands
        </Button>
      </Box>
    );
  }
  return <DemandEditor key={demand.id} demand={demand} />;
}

export default DemandFormPage;
