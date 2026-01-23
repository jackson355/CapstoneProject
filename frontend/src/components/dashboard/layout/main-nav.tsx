'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';

import { usePopover } from '@/hooks/use-popover';
import { useNavigation } from '@/contexts/navigation-context';
import { useUser } from '@/hooks/use-user';

import { MobileNav } from './mobile-nav';
import { UserPopover } from './user-popover';
import { NotificationsPopover } from './notifications-popover';

// main-nav.tsx – function MainNav
export function MainNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const { toggleNav } = useNavigation();
  const { user } = useUser();

  const userPopover = usePopover<HTMLDivElement>();

  // Get first letter of user's name for avatar
  const getInitial = (): string => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-paper)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}
        >
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            {/* Mobile hamburger menu */}
            <IconButton
              aria-label="Open mobile navigation menu"
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' } }}
            >
              <ListIcon />
            </IconButton>

            {/* Desktop hamburger menu */}
            <Tooltip title="Toggle sidebar">
              <IconButton
                aria-label="Toggle sidebar"
                onClick={toggleNav}
                sx={{
                  display: { xs: 'none', lg: 'flex' },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListIcon />
              </IconButton>
            </Tooltip>

          </Stack>
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <NotificationsPopover />
            <Avatar
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              sx={{
                cursor: 'pointer',
                bgcolor: 'var(--mui-palette-primary-main)',
                color: 'var(--mui-palette-primary-contrastText)',
              }}
            >
              {getInitial()}
            </Avatar>
          </Stack>
        </Stack>
      </Box>
      <UserPopover anchorEl={userPopover.anchorRef.current} onClose={userPopover.handleClose} open={userPopover.open} />
      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
      />
    </React.Fragment>
  );
}
