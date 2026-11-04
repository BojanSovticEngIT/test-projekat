import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../types/enums';
import type { AppNotification } from '../../types/workforce-governance.types';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount
} from '@features/workforce/governanceApi';

/** Manager submissions open the request detail (manager-only route); decisions open the employee's own skills. */
const resolveTarget = (notification: AppNotification, role?: UserRole): string | null => {
  if (notification.event === 'REQUEST_SUBMITTED' && notification.validationRequestId) {
    return role === UserRole.LINE_MANAGER || role === UserRole.ADMIN
      ? `/validation-requests/${notification.validationRequestId}`
      : null;
  }
  return notification.event === 'ITEM_APPROVED' || notification.event === 'ITEM_REJECTED' ? '/my-skills' : null;
};

function NotificationBell(): JSX.Element {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <>
      <IconButton
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ color: 'rgba(255,255,255,0.85)' }}
        size="small"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1, minWidth: 320 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Notifications</Typography>
            <Button size="small" onClick={() => markAllRead.mutate()} disabled={unreadCount === 0}>
              Mark all read
            </Button>
          </Box>
          <Divider />
          <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText primary="No notifications" />
              </ListItem>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    bgcolor: notification.unread ? 'action.hover' : undefined,
                    borderRadius: 1,
                    cursor: resolveTarget(notification, role) ? 'pointer' : undefined
                  }}
                  onClick={() => {
                    if (notification.unread) {
                      markRead.mutate(notification.id);
                    }
                    const target = resolveTarget(notification, role);
                    if (target) {
                      setAnchorEl(null);
                      navigate(target);
                    }
                  }}
                >
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <>
                        <Typography variant="caption" component="span" display="block">
                          {notification.body}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>
      </Menu>
    </>
  );
}

export default NotificationBell;
