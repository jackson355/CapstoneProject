'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { TotalQuotations } from '@/components/dashboard/overview/total-quotations';
import { TotalInvoices } from '@/components/dashboard/overview/total-invoices';
import { TotalClients } from '@/components/dashboard/overview/total-clients';
import { TotalPartners } from '@/components/dashboard/overview/total-partners';
import { StatusBreakdown } from '@/components/dashboard/overview/status-breakdown';
import { RecentQuotations } from '@/components/dashboard/overview/recent-quotations';
import { RecentInvoices } from '@/components/dashboard/overview/recent-invoices';

interface DashboardData {
  counts: {
    total_quotations: number;
    total_invoices: number;
    total_clients: number;
    total_partners: number;
    total_revenue: number;
    pending_quotations_value: number;
  };
  quotation_by_status: Record<string, number>;
  invoice_by_status: Record<string, number>;
  recent_quotations: any[];
  recent_invoices: any[];
  recent_emails: any[];
  monthly_trends: {
    quotations: any[];
    invoices: any[];
  };
}

export default function Page(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.getDashboardStatistics();

      if (response.error) {
        setError(response.error);
        logger.error('Failed to fetch dashboard statistics', response.error);
      } else {
        setDashboardData(response.data);
      }
    } catch (err) {
      logger.error('Failed to fetch dashboard data', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={3}>
        <Alert severity="error">{error}</Alert>
      </Stack>
    );
  }

  if (!dashboardData) {
    return (
      <Stack spacing={3}>
        <Alert severity="info">No dashboard data available</Alert>
      </Stack>
    );
  }

  // Prepare quotation status data
  const quotationStatusLabels: string[] = [];
  const quotationStatusSeries: number[] = [];
  const quotationStatusOrder = ['pending', 'accepted', 'rejected'];

  quotationStatusOrder.forEach((status) => {
    if (dashboardData.quotation_by_status[status]) {
      quotationStatusLabels.push(status.charAt(0).toUpperCase() + status.slice(1));
      quotationStatusSeries.push(dashboardData.quotation_by_status[status]);
    }
  });

  // Prepare invoice status data
  const invoiceStatusLabels: string[] = [];
  const invoiceStatusSeries: number[] = [];
  const invoiceStatusOrder = ['unpaid', 'paid'];

  invoiceStatusOrder.forEach((status) => {
    if (dashboardData.invoice_by_status[status]) {
      invoiceStatusLabels.push(status.charAt(0).toUpperCase() + status.slice(1));
      invoiceStatusSeries.push(dashboardData.invoice_by_status[status]);
    }
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your business metrics and recent activity
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Statistic Cards */}
        <Grid
          size={{
            lg: 3,
            sm: 6,
            xs: 12,
          }}
        >
          <TotalQuotations sx={{ height: '100%' }} value={dashboardData.counts.total_quotations} />
        </Grid>
        <Grid
          size={{
            lg: 3,
            sm: 6,
            xs: 12,
          }}
        >
          <TotalInvoices sx={{ height: '100%' }} value={dashboardData.counts.total_invoices} />
        </Grid>
        <Grid
          size={{
            lg: 3,
            sm: 6,
            xs: 12,
          }}
        >
          <TotalClients sx={{ height: '100%' }} value={dashboardData.counts.total_clients} />
        </Grid>
        <Grid
          size={{
            lg: 3,
            sm: 6,
            xs: 12,
          }}
        >
          <TotalPartners sx={{ height: '100%' }} value={dashboardData.counts.total_partners} />
        </Grid>

        {/* Status Breakdown Charts */}
        <Grid
          size={{
            lg: 6,
            md: 6,
            xs: 12,
          }}
        >
          <StatusBreakdown
            title="Quotation Status"
            chartSeries={quotationStatusSeries}
            labels={quotationStatusLabels}
            sx={{ height: '100%' }}
          />
        </Grid>
        <Grid
          size={{
            lg: 6,
            md: 6,
            xs: 12,
          }}
        >
          <StatusBreakdown
            title="Invoice Status"
            chartSeries={invoiceStatusSeries}
            labels={invoiceStatusLabels}
            sx={{ height: '100%' }}
          />
        </Grid>

        {/* Recent Quotations */}
        <Grid
          size={{
            lg: 6,
            md: 12,
            xs: 12,
          }}
        >
          <RecentQuotations quotations={dashboardData.recent_quotations} sx={{ height: '100%' }} />
        </Grid>

        {/* Recent Invoices */}
        <Grid
          size={{
            lg: 6,
            md: 12,
            xs: 12,
          }}
        >
          <RecentInvoices invoices={dashboardData.recent_invoices} sx={{ height: '100%' }} />
        </Grid>
      </Grid>
    </Stack>
  );
}
