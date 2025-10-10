'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { MainNav } from './main-nav';
import { useNavigation } from '@/contexts/navigation-context';

interface DynamicLayoutProps {
  children: React.ReactNode;
}

export function DynamicLayout({ children }: DynamicLayoutProps): React.JSX.Element {
  const { isNavOpen } = useNavigation();

  return (
    <Box
      sx={{
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        paddingLeft: {
          xs: 0,
          lg: isNavOpen ? 'var(--SideNav-width)' : 'var(--SideNav-collapsed-width)'
        },
        transition: 'padding-left 0.3s ease-in-out',
      }}
    >
      <MainNav />
      <main>
        <Container maxWidth="xl" sx={{ py: '64px' }}>
          {children}
        </Container>
      </main>
    </Box>
  );
}