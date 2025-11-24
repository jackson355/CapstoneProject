// mobile-nav.tsx – function MobileNav, renderNavItems, NavItem
'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';


import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { Logo } from '@/components/core/logo';
import { navItems } from './config';
import { navIcons } from './nav-icons';
import { useUser } from '@/hooks/use-user';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';

export interface MobileNavProps {
  onClose?: () => void;
  open?: boolean;
  items?: NavItemConfig[];
}

export function MobileNav({ onClose, open }: MobileNavProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { user, checkSession } = useUser();

  const filtered = React.useMemo(() => {
    const isPrivileged = user?.role_id === 1 || user?.role_id === 2;
    return navItems.filter((item) => {
      if (item.key === 'users') return isPrivileged;
      if (item.key === 'clients') return isPrivileged;
      if (item.key === 'company-settings') return isPrivileged;
      return true;
    });
  }, [user]);

  const mainItems = React.useMemo(
    () => filtered.filter((i) => i.key !== 'account' && i.key !== 'settings'),
    [filtered]
  );
  const accountItems = React.useMemo(
    () => filtered.filter((i) => i.key === 'account' || i.key === 'settings'),
    [filtered]
  );

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        logger.error('Sign out error', error);
        return;
      }
      await checkSession?.();
      router.refresh();
      onClose?.();
    } catch (error) {
      logger.error('Sign out error', error);
    }
  }, [checkSession, router, onClose]);

  return (
    <Drawer
      PaperProps={{
        sx: {
          '--MobileNav-background': 'var(--mui-palette-neutral-950)',
          '--MobileNav-color': 'var(--mui-palette-common-white)',
          '--NavItem-color': 'var(--mui-palette-neutral-300)',
          '--NavItem-hover-background': 'rgba(255, 255, 255, 0.04)',
          '--NavItem-active-background': 'var(--mui-palette-primary-main)',
          '--NavItem-active-color': 'var(--mui-palette-primary-contrastText)',
          '--NavItem-disabled-color': 'var(--mui-palette-neutral-500)',
          '--NavItem-icon-color': 'var(--mui-palette-neutral-400)',
          '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
          '--NavItem-icon-disabled-color': 'var(--mui-palette-neutral-600)',
          bgcolor: 'var(--MobileNav-background)',
          color: 'var(--MobileNav-color)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100%',
          scrollbarWidth: 'none',
          width: 'var(--MobileNav-width)',
          zIndex: 'var(--MobileNav-zIndex)',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      }}
      onClose={onClose}
      open={open}
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex' }}>
          <Logo color="light" height={50} width={200} />
        </Box>
      </Stack>

      <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />

      {/* MAIN MENU section */}
      <Box component="nav" role="navigation" aria-label="Primary" sx={{ flex: '0 0 auto', p: '12px' }}>
        <Typography variant="overline" sx={{ color: 'var(--mui-palette-neutral-400)', px: '8px', display: 'block', mb: 1 }}>
          MAIN MENU
        </Typography>
        {renderNavItems({ pathname, items: mainItems, onClose })}
      </Box>

      {/* ACCOUNT section */}
      <Box component="nav" role="navigation" aria-label="Account" sx={{ flex: '1 1 auto', p: '12px' }}>
        <Typography variant="overline" sx={{ color: 'var(--mui-palette-neutral-400)', px: '8px', display: 'block', mb: 1, mt: 1 }}>
          ACCOUNT
        </Typography>
        {renderNavItems({ pathname, items: accountItems, onClose })}
      </Box>

      <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />

      {/* Log Out */}
      <Box sx={{ p: '12px' }}>
        <Box
          role="button"
          aria-label="Log Out"
          onClick={handleSignOut}
          sx={{
            alignItems: 'center',
            borderRadius: 1,
            color: 'var(--NavItem-color)',
            cursor: 'pointer',
            display: 'flex',
            gap: 1,
            p: '10px 16px',
            minHeight: 44,
            textDecoration: 'none',
            '&:hover': { bgcolor: 'var(--NavItem-hover-background)' },
          }}
        >
          <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
            <SignOutIcon fontSize="var(--icon-fontSize-md)" />
          </Box>
          <Box sx={{ flex: '1 1 auto' }}>
            <Typography component="span" sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}>
              Log Out
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

function renderNavItems({
  items = [],
  pathname,
  onClose,
}: {
  items?: NavItemConfig[];
  pathname: string;
  onClose?: () => void;
}): React.JSX.Element {
  const children = items.map((curr: NavItemConfig) => {
    const { key, ...item } = curr;
    const isActive = isNavItemActive({
      disabled: item.disabled,
      external: item.external,
      href: item.href,
      matcher: item.matcher,
      pathname,
    });
    return <NavItem key={key} isActive={isActive} onClick={onClose} {...item} />;
  });

  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {children}
    </Stack>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'items'> {
  isActive: boolean;
  onClick?: () => void;
}

const NavItem = React.memo(function NavItem({
  disabled,
  external,
  href,
  icon,
  title,
  isActive,
  onClick,
}: NavItemProps): React.JSX.Element {
  const Icon = icon ? navIcons[icon] : null;

  return (
    <li>
      <Box
        {...(href
          ? {
              component: external ? 'a' : RouterLink,
              href,
              target: external ? '_blank' : undefined,
              rel: external ? 'noreferrer' : undefined,
              onClick,
              'aria-current': isActive ? 'page' : undefined,
              'aria-label': title,
            }
          : { role: 'button', onClick, 'aria-label': title })}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: 'var(--NavItem-color)',
          cursor: 'pointer',
          display: 'flex',
          flex: '0 0 auto',
          gap: 1,
          p: '10px 16px',
          minHeight: 44,
          position: 'relative',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          outline: 'none',
          '&:focus-visible': {
            outline: '2px solid var(--mui-palette-primary-main)',
            outlineOffset: 2,
          },
          ...(disabled && {
            bgcolor: 'var(--NavItem-disabled-background)',
            color: 'var(--NavItem-disabled-color)',
            cursor: 'not-allowed',
          }),
          ...(isActive && { bgcolor: 'var(--NavItem-active-background)', color: 'var(--NavItem-active-color)' }),
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          {Icon ? (
            <Icon
              fill={isActive ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)'}
              fontSize="var(--icon-fontSize-md)"
              weight={isActive ? 'fill' : undefined}
            />
          ) : null}
        </Box>
        <Box sx={{ flex: '1 1 auto' }}>
          <Typography
            component="span"
            sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}
          >
            {title}
          </Typography>
        </Box>
      </Box>
    </li>
  );
});
