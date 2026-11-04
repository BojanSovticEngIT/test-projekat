import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import useAuthStore from '@store/authStore';
import { engColors } from '../../theme/theme';
import ModuleCards from '../../components/ModuleCards';

const DashboardPage = (): JSX.Element => {
  const user = useAuthStore((state) => state.user);

  return (
    <Stack spacing={3}>
      {/* Welcome header */}
      <Card sx={{ background: `linear-gradient(135deg, ${engColors.blue} 0%, #00457A 100%)`, color: '#fff', border: 'none' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DashboardOutlinedIcon sx={{ color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 0.25 }}>
                Welcome back{user?.username ? `, ${user.username}` : ''}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                Skill Matrix &amp; Competency Management Platform
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Quick access cards */}
      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.72rem' }}>
          Skill Matrix
        </Typography>
        <ModuleCards moduleId="skill-matrix" />
      </Box>
    </Stack>
  );
};

export default DashboardPage;
