import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import Link from 'next/link';

import { config } from '@/config';
import { RoleGuard } from '@/components/auth/role-guard';
import { paths } from '@/paths';
import { QuotationsTable } from '@/components/dashboard/quotation/quotations-table';

export const metadata = { title: `Quotations | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[1, 2]}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={3}>
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography variant="h4">Quotation Management</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Create and manage quotations for clients.
            </Typography>
          </Stack>
          <div>
            <Button component={Link} href={paths.dashboard.createQuotation} startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />} variant="contained">
              Create Quotation
            </Button>
          </div>
        </Stack>
        <QuotationsTable />
      </Stack>
    </RoleGuard>
  );
}
