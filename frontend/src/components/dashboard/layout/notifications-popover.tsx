'use client';

import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationsPopover(): React.JSX.Element {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);

  const open = Boolean(anchorEl);

  React.useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (): Promise<void> => {
    try {
      const response = await authClient.getNotifications({
        page: 0,
        per_page: 10,
      });
      if (response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch notifications', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId: number): Promise<void> => {
    try {
      await authClient.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async (): Promise<void> => {
    try {
      setLoading(true);
      await authClient.markAllNotificationsAsRead();
      // Re-fetch to get updated data from backend
      await fetchNotifications();
    } catch (error) {
      logger.error('Failed to mark all as read', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'email_sent':
        return '✉️';
      case 'email_failed':
        return '❌';
      case 'email_scheduled':
        return '📅';
      default:
        return '📧';
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton aria-label="Notifications" onClick={handleClick}>
          <Badge badgeContent={unreadCount} color="error">
            <BellIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 500 },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead} disabled={loading}>
                Mark all as read
              </Button>
            )}
          </Stack>
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <Box sx={{ mr: 2, fontSize: 24 }}>
                    {getNotificationIcon(notification.notification_type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.is_read ? 'normal' : 'bold',
                        }}
                      >
                        {notification.message}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button size="small" onClick={handleClose}>
            Close
          </Button>
        </Box>
      </Popover>
    </>
  );
}
