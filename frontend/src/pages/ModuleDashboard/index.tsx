import { Box, Typography } from '@mui/material';
import ModuleCards from '../../components/ModuleCards';
import { getModuleById, type NavigationModuleId } from '../../layout/navigation';

interface ModuleDashboardPageProps {
  moduleId: NavigationModuleId;
}

function ModuleDashboardPage({ moduleId }: ModuleDashboardPageProps): JSX.Element {
  const module = getModuleById(moduleId);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
        {module.label}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {module.description}
      </Typography>
      <ModuleCards moduleId={moduleId} />
    </Box>
  );
}

export default ModuleDashboardPage;
