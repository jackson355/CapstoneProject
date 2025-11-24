'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { RoleGuard } from '@/components/auth/role-guard';
import { authClient } from '@/lib/auth/client';

export default function Page(): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [companyName, setCompanyName] = React.useState('');
  const [companyEmail, setCompanyEmail] = React.useState('');
  const [companyPhone, setCompanyPhone] = React.useState('');
  const [companyAddress, setCompanyAddress] = React.useState('');
  const [companyWebsite, setCompanyWebsite] = React.useState('');

  React.useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const result = await authClient.getCompanySettings();
        if (result.data) {
          setCompanyName(result.data.company_name || '');
          setCompanyEmail(result.data.company_email || '');
          setCompanyPhone(result.data.company_phone || '');
          setCompanyAddress(result.data.company_address || '');
          setCompanyWebsite(result.data.company_website || '');
        }
      } catch (err) {
        console.error('Error fetching company settings:', err);
        setError('Failed to load company settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const result = await authClient.updateCompanySettings({
        company_name: companyName || null,
        company_email: companyEmail || null,
        company_phone: companyPhone || null,
        company_address: companyAddress || null,
        company_website: companyWebsite || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error updating company settings:', err);
      setError('Failed to update company settings');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading company settings...
        </Typography>
      </Stack>
    );
  }

  return (
    <RoleGuard allowedRoles={[1, 2]}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Company Settings</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Manage your company information used in quotations and invoices
          </Typography>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader
              subheader="This information will be automatically used when creating quotations and invoices"
              title="Company Information"
            />
            <Divider />
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Company settings updated successfully!
                </Alert>
              )}
              <Grid container spacing={3}>
                <Grid
                  size={{
                    md: 6,
                    xs: 12,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Company Name</InputLabel>
                    <OutlinedInput
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      label="Company Name"
                      name="company_name"
                    />
                  </FormControl>
                </Grid>
                <Grid
                  size={{
                    md: 6,
                    xs: 12,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Company Email</InputLabel>
                    <OutlinedInput
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      label="Company Email"
                      name="company_email"
                      type="email"
                    />
                  </FormControl>
                </Grid>
                <Grid
                  size={{
                    md: 6,
                    xs: 12,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Company Phone</InputLabel>
                    <OutlinedInput
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      label="Company Phone"
                      name="company_phone"
                    />
                  </FormControl>
                </Grid>
                <Grid
                  size={{
                    md: 6,
                    xs: 12,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Company Website</InputLabel>
                    <OutlinedInput
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      label="Company Website"
                      name="company_website"
                    />
                  </FormControl>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Company Address</InputLabel>
                    <OutlinedInput
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      label="Company Address"
                      name="company_address"
                      multiline
                      rows={3}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
            <Divider />
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" type="submit" disabled={submitting}>
                {submitting ? <CircularProgress size={20} /> : 'Save Settings'}
              </Button>
            </CardActions>
          </Card>
        </form>
      </Stack>
    </RoleGuard>
  );
}
