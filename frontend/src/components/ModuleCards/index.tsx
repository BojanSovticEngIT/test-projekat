import { Alert, Grid } from '@mui/material';
import { getModuleById, getModuleItems, type NavigationModuleId } from '../../layout/navigation';
import { UserRole } from '../../types/enums';
import useAuthStore from '@store/authStore';
import NavigationCard from '../NavigationCard';

interface ModuleCardsProps {
  moduleId: NavigationModuleId;
}

// Renders only the module features the current role is authorized for; nothing is shown disabled or locked.
function ModuleCards({ moduleId }: ModuleCardsProps): JSX.Element {
  const role = useAuthStore((state) => state.user?.role ?? UserRole.EMPLOYEE);
  const items = getModuleItems(getModuleById(moduleId), role);

  if (items.length === 0) {
    return <Alert severity="info">No features are available for your role in this module.</Alert>;
  }

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid item xs={12} sm={6} lg={3} key={item.path}>
          <NavigationCard label={item.label} description={item.description} icon={item.icon} route={item.path} />
        </Grid>
      ))}
    </Grid>
  );
}

export default ModuleCards;
