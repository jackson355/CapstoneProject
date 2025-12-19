'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import InputAdornment from '@mui/material/InputAdornment';
import BusinessIcon from '@mui/icons-material/Business';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { UploadSimple as UploadIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';

export function CreatePartnerForm(): React.JSX.Element {
  const router = useRouter();
  const [companyName, setCompanyName] = React.useState('');
  const [contactPersonName, setContactPersonName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [contractFile, setContractFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const company = companyName.trim();
    const person = contactPersonName.trim();

    if (!company) {
      setError('Company name is required');
      return;
    }

    if (!person) {
      setError('Contact person name is required');
      return;
    }

    if (!contractFile) {
      setError('Partner contract is required');
      return;
    }

    if (emailAddress.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) {
      setError('Please provide a valid email address');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('company_name', company);
      formData.append('contact_person_name', person);
      if (phoneNumber.trim()) formData.append('phone_number', phoneNumber.trim());
      if (emailAddress.trim()) formData.append('email_address', emailAddress.trim());
      if (contractFile) formData.append('contract_file', contractFile);

      const result = await authClient.createPartner(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess('Partner created successfully');
      setTimeout(() => router.push(paths.dashboard.partners), 800);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 10px 30px rgba(2, 6, 23, 0.06)',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Partner Information
          </Typography>
          <Grid container spacing={3}>
            {/* Company Name */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Company Name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Partner Company Pte Ltd"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Contact Person Name */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Contact Person Name"
                required
                value={contactPersonName}
                onChange={(e) => setContactPersonName(e.target.value)}
                placeholder="e.g., John Doe"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Phone Number */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g., 91234567"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Email Address */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="e.g., contact@partner.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Partner Contract Upload */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                Partner Contract <span style={{ color: 'red' }}>*</span>
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  {contractFile ? contractFile.name : 'Upload Contract (PDF or Word)'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setContractFile(file);
                    }}
                  />
                </Button>
                {contractFile && (
                  <Typography variant="caption" color="text.secondary">
                    Selected: {contractFile.name} ({(contractFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Upload the partner referral agreement or contract document (required)
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button
            color="inherit"
            disabled={loading}
            onClick={() => router.push(paths.dashboard.partners)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Creating...' : 'Create Partner'}
          </Button>
        </CardActions>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ m: 2 }}>
            {success}
          </Alert>
        )}
      </Card>
    </form>
  );
}
