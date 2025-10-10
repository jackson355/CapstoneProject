'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';

import { DynamicLogo } from '@/components/core/logo';

export interface LayoutProps {
  children: React.ReactNode;
  bgIntensity?: 'subtle' | 'balanced' | 'bold';
}

export function Layout({ children, bgIntensity = 'balanced' }: LayoutProps): React.JSX.Element {
  return (
    <Box
      sx={(theme) => {
        const map = { subtle: 0.10, balanced: 0.18, bold: 0.26 } as const;
        const i1 = map[bgIntensity];
        const i2 = Math.max(0, i1 - 0.04);
        const isDark = theme.palette.mode === 'dark';

        return {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: isDark
              ? `radial-gradient(900px circle at 0% 0%, rgba(99,102,241,${i1}), transparent 45%),
                 radial-gradient(900px circle at 100% 0%, rgba(168,85,247,${i2}), transparent 45%),
                 linear-gradient(180deg, #0B1220, #0B1220)`
              : `radial-gradient(900px circle at 0% 0%, rgba(99,102,241,${i1 + 0.02}), transparent 45%),
                 radial-gradient(900px circle at 100% 0%, rgba(168,85,247,${i2 + 0.02}), transparent 45%),
                 linear-gradient(180deg, #EEF2FF, #FFFFFF)`,
          },
        };
      }}
    >
      <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* Centered content area with panel + form */}
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flex: '1 1 auto',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Stack spacing={3} sx={{ maxWidth: 600, width: '100%' }}>
            <Paper
              elevation={6}
              sx={(theme) => ({
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
                backdropFilter: 'blur(6px)',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.4)
                    : 'rgba(255,255,255,0.78)',
                border: `1px solid ${
                  alpha(theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black, 0.08)
                }`,
              })}
              aria-label="Sign-in panel"
              role="group"
            >
              <Stack spacing={3}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  aria-label="Company logo"
                  role="img"
                >
                  <DynamicLogo colorDark="light" colorLight="dark" height={70} width={214} />
                </Box>

                {/* Existing sign-in content */}
                {children}
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
