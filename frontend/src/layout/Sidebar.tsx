import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useIsMobile from './useIsMobile';
import { UserRole } from '../types/enums';
import useAuthStore from '@store/authStore';
import logo from '../assets/logo/logo.webp';
import background from '../assets/images/background.webp';
import {
  getModuleItems,
  getVisibleModules,
  isItemActive,
  type NavigationModule,
  type NavigationModuleId
} from './navigation';

export const drawerWidth = 240;

const itemButtonSx = {
  mx: 1,
  mb: 0.5,
  borderRadius: 1,
  '&.Mui-selected, &.Mui-selected:hover': {
    bgcolor: 'action.selected'
  }
} as const;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps): JSX.Element {
  const isMobile = useIsMobile();
  const role = useAuthStore((state) => state.user?.role ?? UserRole.EMPLOYEE);
  const { pathname } = useLocation();
  const modules = getVisibleModules(role);
  const activeModuleId = modules.find(
    (module) => pathname === module.path || getModuleItems(module, role).some((item) => isItemActive(pathname, item))
  )?.id;
  const [expanded, setExpanded] = useState<Partial<Record<NavigationModuleId, boolean>>>(
    activeModuleId ? { [activeModuleId]: true } : {}
  );

  // Navigating to a module (e.g. from a dashboard card) opens its group.
  useEffect(() => {
    if (activeModuleId) {
      setExpanded((current) => (current[activeModuleId] ? current : { ...current, [activeModuleId]: true }));
    }
  }, [activeModuleId]);

  const toggle = (module: NavigationModule): void =>
    setExpanded((current) => ({ ...current, [module.id]: !current[module.id] }));

  const closeOnMobile = (): void => {
    if (isMobile) {
      onMobileClose?.();
    }
  };

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onMobileClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundImage: `linear-gradient(rgba(0, 47, 83, 0.72), rgba(0, 47, 83, 0.72)), url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          color: 'common.white'
        }
      }}
    >
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1} sx={{margin: '10px 0'}}>
          <Box component="img" src={logo} alt="Skill Matrix logo" sx={{ height: 50, width: 'auto', background: '#fff', borderRadius:'5px', padding: '5px' }} />
        </Box>
      </Toolbar>
      <List component="nav" aria-label="Main navigation">
        {modules.map((module) => {
          const items = getModuleItems(module, role).filter((item) => item.inSidebar !== false);
          const isOpen = Boolean(expanded[module.id]) && items.length > 0;
          const submenuId = `sidebar-submenu-${module.id}`;

          return (
            <Box key={module.id}>
              <ListItem disablePadding sx={{ display: 'flex', alignItems: 'center' }}>
                {items.length > 0 ? (
                  <IconButton
                    size="small"
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${module.label}`}
                    aria-expanded={isOpen}
                    aria-controls={submenuId}
                    onClick={() => toggle(module)}
                    sx={{ color: 'common.white', ml: 1 }}
                  >
                    {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                ) : (
                  <Box aria-hidden sx={{ width: 34, ml: 1, flexShrink: 0 }} />
                )}
                <ListItemButton
                  component={Link}
                  to={module.path}
                  selected={pathname === module.path}
                  aria-current={pathname === module.path ? 'page' : undefined}
                  onClick={closeOnMobile}
                  sx={{ ...itemButtonSx, ml: 0.5, flexGrow: 1 }}
                >
                  <ListItemText
                    primary={module.label}
                    primaryTypographyProps={{ sx: { color: 'common.white', fontWeight: 600 } }}
                  />
                  <ListItemIcon sx={{ color: 'common.white', minWidth: 0, justifyContent: 'flex-end' }}>
                    {module.icon}
                  </ListItemIcon>
                </ListItemButton>
              </ListItem>
              <Collapse in={isOpen} timeout="auto" id={submenuId}>
                <List disablePadding>
                  {items.map((item) => {
                    const active = isItemActive(pathname, item);
                    return (
                      <ListItemButton
                        key={item.path}
                        component={Link}
                        to={item.path}
                        selected={active}
                        aria-current={active ? 'page' : undefined}
                        onClick={closeOnMobile}
                        sx={{ ...itemButtonSx, pl: 4 }}
                      >
                        <ListItemIcon sx={{ color: 'common.white', minWidth: 40 }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} primaryTypographyProps={{ sx: { color: 'common.white' } }} />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>
    </Drawer>
  );
}

export default Sidebar;
