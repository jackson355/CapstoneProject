import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import GlobalStyles from '@mui/material/GlobalStyles';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SideNav } from '@/components/dashboard/layout/side-nav';
import { DynamicLayout } from '@/components/dashboard/layout/dynamic-layout';
import { NavigationProvider } from '@/contexts/navigation-context';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps): React.JSX.Element {
  return (
    <AuthGuard>
      <NavigationProvider>
        <GlobalStyles
          styles={{
            body: {
              '--MainNav-height': '56px',
              '--MainNav-zIndex': 1000,
              '--SideNav-width': '280px',
              '--SideNav-collapsed-width': '64px',
              '--SideNav-zIndex': 1100,
              '--MobileNav-width': '320px',
              '--MobileNav-zIndex': 1100,
            },
          }}
        />
        <LayoutContent>{children}</LayoutContent>
      </NavigationProvider>
    </AuthGuard>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Box
      sx={{
        bgcolor: 'var(--mui-palette-background-default)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: '100%',
      }}
    >
      <SideNav />
      <DynamicLayout>{children}</DynamicLayout>
    </Box>
  );
}
