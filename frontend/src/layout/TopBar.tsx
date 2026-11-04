import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Avatar, Box, Chip, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '../types/enums';
import useAuthStore from '@store/authStore';
import { drawerWidth } from './Sidebar';
import useIsMobile from './useIsMobile';
import { engColors, portfolioColors } from '../theme/theme';
import background from '../assets/images/background.webp';
import { NotificationBell } from '../components/NotificationBell';

const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  [UserRole.ADMIN]: { label: 'Admin', color: '#fff', bg: engColors.red },
  [UserRole.EMPLOYEE]: { label: 'Employee', color: '#fff', bg: portfolioColors.eHealth },
  [UserRole.LINE_MANAGER]: { label: 'Manager', color: '#fff', bg: portfolioColors.augmentedCities },
  [UserRole.HR]: { label: 'HR', color: '#fff', bg: portfolioColors.smartGovernment },
  [UserRole.PMO]: { label: 'PMO', color: '#fff', bg: portfolioColors.digitalFinance },
  [UserRole.HR_BUSINESS_PARTNER]: { label: 'HR BP', color: '#fff', bg: portfolioColors.smartGovernment },
  [UserRole.MANAGEMENT]: { label: 'Management', color: '#fff', bg: engColors.blue }
};

function getInitials(username?: string): string {
  if (!username) return '?';
  const parts = username.split(/[\s._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

interface TopBarProps {
  onMenuClick?: () => void;
}

function TopBar({ onMenuClick }: TopBarProps): JSX.Element {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = (): void => {
    qc.clear();
    logout();
    navigate('/login');
  };

  const role = user?.role;
  const roleInfo = role ? roleConfig[role] : null;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
        ml: { xs: 0, sm: `${drawerWidth}px` },
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        backgroundImage: `linear-gradient(rgba(0, 47, 83, 0.72), rgba(0, 47, 83, 0.72)), url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: { xs: 60, sm: 64 } }}>
        {isMobile ? (
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            onClick={onMenuClick}
          >
            <MenuIcon />
          </IconButton>
        ) : null}
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              lineHeight: 1
            }}
          >
            Engage
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}
          >
            Skill Matrix
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <NotificationBell />
          {roleInfo ? (
            <Chip
              label={roleInfo.label}
              size="small"
              sx={{
                backgroundColor: roleInfo.bg,
                color: roleInfo.color,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                letterSpacing: '0.04em'
              }}
            />
          ) : null}

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}>
              {user?.username ?? 'Guest User'}
            </Typography>
          </Box>

          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: engColors.red,
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '2px solid rgba(255,255,255,0.25)'
            }}
          >
            {getInitials(user?.username)}
          </Avatar>

          <Tooltip title="Logout">
            <IconButton
              onClick={handleLogout}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              size="small"
            >
              <LogoutOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;
