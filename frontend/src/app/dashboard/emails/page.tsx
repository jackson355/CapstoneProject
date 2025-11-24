'use client';

import * as React from 'react';
import { Box, Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';
import { EnvelopeSimple as SendIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { ClockClockwise as HistoryIcon } from '@phosphor-icons/react/dist/ssr/ClockClockwise';
import { CalendarBlank as ScheduleIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { FileText as TemplateIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { GearSix as SettingsIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';

const menuItems = [
  {
    title: 'Send Email',
    description: 'Send an email to a client about a quotation or invoice',
    icon: SendIcon,
    path: paths.dashboard.emailsSend,
    color: '#4CAF50',
  },
  {
    title: 'Email History',
    description: 'View all sent emails with complete audit trail',
    icon: HistoryIcon,
    path: paths.dashboard.emailsHistory,
    color: '#2196F3',
  },
  {
    title: 'Scheduled Emails',
    description: 'Manage scheduled and recurring emails',
    icon: ScheduleIcon,
    path: paths.dashboard.emailsScheduled,
    color: '#FF9800',
  },
  {
    title: 'Email Templates',
    description: 'Manage email templates with dynamic variables',
    icon: TemplateIcon,
    path: paths.dashboard.emailsTemplates,
    color: '#9C27B0',
  },
  {
    title: 'Email Automation',
    description: 'Configure automated emails for status changes and deadlines',
    icon: SettingsIcon,
    path: paths.dashboard.emailsAutomation,
    color: '#00BCD4',
  },
  {
    title: 'Email Settings',
    description: 'Configure SMTP settings for sending emails',
    icon: SettingsIcon,
    path: paths.dashboard.emailsSettings,
    color: '#607D8B',
  },
];

export default function EmailsPage(): React.JSX.Element {
  const router = useRouter();

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Email Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage all your email communications from one place
          </Typography>
        </div>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            px: { xs: 2, sm: 3, md: 0 }
          }}
        >
          <Box sx={{ maxWidth: '1150px', width: '100%' }}>
            <Grid
              container
              spacing={3}
              sx={{
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              {menuItems.map((menuItem) => {
                const Icon = menuItem.icon;
                return (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    key={menuItem.title}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      maxWidth: { xs: '100%', sm: '50%', md: '360px' },
                      flexBasis: { xs: '100%', sm: '50%', md: '360px' }
                    }}
                    component="div"
                  >
                  <Card
                    sx={{
                      height: '100%',
                      width: '100%',
                      minWidth: '300px',
                      maxWidth: '360px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                  <CardActionArea
                    onClick={() => router.push(item.path)}
                    sx={{
                      height: '100%',
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Stack spacing={2} sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          bgcolor: item.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={32} color="white" weight="bold" />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
