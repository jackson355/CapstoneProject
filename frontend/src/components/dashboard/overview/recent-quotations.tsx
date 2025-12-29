import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import type { SxProps } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import dayjs from 'dayjs';

const statusMap = {
  pending: { label: 'Pending', color: 'warning' },
  accepted: { label: 'Accepted', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
} as const;

export interface Quotation {
  id: number;
  quotation_number: string;
  client_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface RecentQuotationsProps {
  quotations?: Quotation[];
  sx?: SxProps;
}

export function RecentQuotations({ quotations = [], sx }: RecentQuotationsProps): React.JSX.Element {
  const router = useRouter();

  return (
    <Card sx={sx}>
      <CardHeader title="Recent Quotations" />
      <Divider />
      <Box sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>Quotation #</TableCell>
              <TableCell>Client</TableCell>
              <TableCell sortDirection="desc">Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No quotations found
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((quotation) => {
                const { label, color } = statusMap[quotation.status as keyof typeof statusMap] ?? { label: 'Unknown', color: 'default' };

                return (
                  <TableRow hover key={quotation.id}>
                    <TableCell>{quotation.quotation_number}</TableCell>
                    <TableCell>{quotation.client_name}</TableCell>
                    <TableCell>{dayjs(quotation.created_at).format('MMM D, YYYY')}</TableCell>
                    <TableCell>
                      <Chip color={color as any} label={label} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          color="inherit"
          endIcon={<ArrowRightIcon fontSize="var(--icon-fontSize-md)" />}
          size="small"
          variant="text"
          onClick={() => router.push(paths.dashboard.quotations)}
        >
          View all
        </Button>
      </CardActions>
    </Card>
  );
}
