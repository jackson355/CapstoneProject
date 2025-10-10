import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import RouterLink from 'next/link';

import { config } from '@/config';
import { paths } from '@/paths';
import { RoleGuard } from '@/components/auth/role-guard';
import { EditClientForm } from '@/components/dashboard/client/edit-client-form';

export const metadata = { title: `Edit Client | Dashboard | ${config.site.name}` } satisfies Metadata;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const clientId = Number.parseInt(id, 10);
  return (
    <RoleGuard allowedRoles={[1, 2]}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={3}>
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography variant="h4">Edit Client</Typography>
          </Stack>
          <div>
            <Button
              component={RouterLink}
              href={paths.dashboard.clients}
              startIcon={<ArrowLeftIcon fontSize="var(--icon-fontSize-md)" />}
            >
              Back
            </Button>
          </div>
        </Stack>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <EditClientForm clientId={clientId} />
          </Grid>
        </Grid>
      </Stack>
    </RoleGuard>
  );
}