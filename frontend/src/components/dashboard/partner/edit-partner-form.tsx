'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useRouter } from 'next/navigation';
import InputAdornment from '@mui/material/InputAdornment';
import BusinessIcon from '@mui/icons-material/Business';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { UploadSimple as UploadIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Download as DownloadIcon } from '@phosphor-icons/react/dist/ssr/Download';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';

export function EditPartnerForm({ partnerId }: { partnerId: number }) {
  const router = useRouter();

  const [companyName, setCompanyName] = React.useState('');
  const [contactPersonName, setContactPersonName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [contractFile, setContractFile] = React.useState<File | null>(null);
  const [existingContractFileName, setExistingContractFileName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [dataLoading, setDataLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await authClient.getPartnerById(partnerId);
        if (result.data) {
          const data = result.data;
          setCompanyName(data.company_name ?? '');
          setContactPersonName(data.contact_person_name ?? '');
          setPhoneNumber(data.phone_number ?? '');
          setEmailAddress(data.email_address ?? '');
          setExistingContractFileName(data.contract_file_name ?? null);
        }
      } catch (err) {
        setError('Failed to load partner data');
        logger.error('Failed to load partner', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [partnerId]);

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

      const result = await authClient.updatePartner(partnerId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess('Partner updated successfully');
      setTimeout(() => router.push(paths.dashboard.partners), 800);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const result = await authClient.deletePartner(partnerId);
      if (result.error) {
        setError(result.error);
        setDeleteDialogOpen(false);
      } else {
        router.push(paths.dashboard.partners);
      }
    } catch {
      setError('Network error');
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadContract = async () => {
    try {
      const result = await authClient.downloadPartnerContract(partnerId);
      if (result.error) {
        setError(result.error);
      } else if (result.blob && result.filename) {
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Failed to download contract');
      logger.error('Failed to download contract', err);
    }
  };

  if (dataLoading) {
    return (
      <Card>
        <CardContent>
          <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
            <CircularProgress />
            <Typography>Loading partner data...</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
                  Partner Contract
                </Typography>
                <Stack spacing={2}>
                  {existingContractFileName && !contractFile && (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Current file: {existingContractFileName}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadContract}
                      >
                        Download
                      </Button>
                    </Stack>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                  >
                    {contractFile ? contractFile.name : existingContractFileName ? 'Replace Contract' : 'Upload Contract (PDF or Word)'}
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
                      New file selected: {contractFile.name} ({(contractFile.size / 1024).toFixed(2)} KB)
                    </Typography>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
            <Button
              color="error"
              disabled={loading || deleteLoading}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Partner
            </Button>
            <Stack direction="row" spacing={2}>
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
                {loading ? 'Updating...' : 'Update Partner'}
              </Button>
            </Stack>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Partner?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this partner? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
