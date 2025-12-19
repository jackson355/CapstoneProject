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
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useRouter } from 'next/navigation';

import { paths } from '@/paths';
import { config } from '@/config';

// NEW: UI polish imports
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import BusinessIcon from '@mui/icons-material/Business';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MenuItem from '@mui/material/MenuItem';

interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

interface Partner {
  id: number;
  company_name: string;
}

export function EditClientForm({ clientId }: { clientId: number }) {
  const router = useRouter();

  const [companyName, setCompanyName] = React.useState('');
  const [uen, setUen] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [industryOther, setIndustryOther] = React.useState(''); // custom industry when "Others" selected
  const [contacts, setContacts] = React.useState<ContactInfo[]>([{ name: '', phone: '', email: '' }]);
  const [address, setAddress] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [partnerId, setPartnerId] = React.useState<number | ''>('');
  const [partners, setPartners] = React.useState<Partner[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  // NEW: Add loading state to prevent crash during data fetch
  const [dataLoading, setDataLoading] = React.useState(true);

  // Predefined industry options including "Others"
  const INDUSTRY_OPTIONS = [
    'Information Technology',
    'Finance',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Construction',
    'Education',
    'Hospitality',
    'Transportation & Logistics',
    'Professional Services',
    'Government',
    'Non-Profit',
    'Energy & Utilities',
    'Real Estate',
    'Media & Entertainment',
    'Others'
  ];

  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setDataLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`${config.api.baseUrl}/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompanyName(data.company_name ?? '');
          setUen(data.uen ?? '');

          // FIXED: Safer industry handling to prevent crash
          const val: string = data.industry ?? '';
          const baseOptions = INDUSTRY_OPTIONS.filter(o => o !== 'Others');
          if (val && baseOptions.includes(val)) {
            setIndustry(val);
            setIndustryOther('');
          } else if (val) {
            setIndustry('Others');
            setIndustryOther(val);
          } else {
            setIndustry('');
            setIndustryOther('');
          }

          setContacts(data.contacts && data.contacts.length > 0 ? data.contacts : [{ name: '', phone: '', email: '' }]);
          setAddress(data.address ?? '');
          setPostalCode(data.postal_code ?? '');
          setPartnerId(data.partner_id ?? '');
        }
      } catch {
        setError('Failed to load client data');
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  // Fetch partners on mount
  React.useEffect(() => {
    const fetchPartners = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return;
      try {
        const res = await fetch(`${config.api.baseUrl}/partners?page=0&per_page=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPartners(data.partners || []);
        }
      } catch (err) {
        console.error('Failed to fetch partners', err);
      }
    };
    fetchPartners();
  }, []);

  const addContact = () => setContacts([...contacts, { name: '', phone: '', email: '' }]);
  const removeContact = (index: number) => contacts.length > 1 && setContacts(contacts.filter((_, i) => i !== index));
  const updateContact = (index: number, field: keyof ContactInfo, value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = field === 'phone' ? value.replace(/\D/g, '') : value;
    setContacts(newContacts);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const company = companyName.trim();
    if (!company) return setError('Company name is required');

    const normalizedContacts = contacts
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim() }))
      .filter((c) => c.name && c.email);

    if (!normalizedContacts.length) return setError('At least one contact with name and email is required');

    const invalidEmail = normalizedContacts.find((c) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
    if (invalidEmail) return setError('Please provide a valid email address for each contact');

    // Check for duplicate emails within the same company's contacts (case-insensitive)
    const emails = normalizedContacts.map((c) => c.email.toLowerCase());
    const seen = new Set<string>();
    let duplicateEmail: string | null = null;
    for (const em of emails) {
      if (seen.has(em)) { duplicateEmail = em; break; }
      seen.add(em);
    }
    if (duplicateEmail) {
      return setError(`Duplicate contact email detected: ${duplicateEmail}`);
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return setError('Not authenticated');

    setLoading(true);
    try {
      // Determine final industry to send
      const industryToSend = industry === 'Others'
        ? (industryOther.trim() || undefined)
        : (industry || undefined);

      const res = await fetch(`${config.api.baseUrl}/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_name: company,
          uen: uen.trim() || undefined,
          industry: industryToSend,
          contacts: normalizedContacts,
          address: address.trim() || undefined,
          postal_code: postalCode.trim() || undefined,
          partner_id: partnerId === '' ? null : partnerId,
        }),
      });

      if (!res.ok) {
        let message = 'Update client failed';
        try { const err = await res.json(); message = err.detail || message; } catch { }
        return setError(message);
      }

      setSuccess('Client updated successfully');
      setTimeout(() => router.push(paths.dashboard.clients), 800);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`${config.api.baseUrl}/clients/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) router.push(paths.dashboard.clients);
    } catch { } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Show loading state while fetching data
  if (dataLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 10px 30px rgba(2, 6, 23, 0.06)',
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
            <Typography variant="body2">Loading client data...</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

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
            Company Information
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Company Name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                placeholder="e.g., Megapixel Pte Ltd"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {/* UEN */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="UEN"
                value={uen}
                onChange={(e) => setUen(e.target.value)}
                placeholder="e.g., 201912345A"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {/* Industry dropdown - FIXED with better error handling */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (!selected) {
                      return <Typography variant="body2" color="text.secondary">Select industry</Typography>;
                    }
                    return selected as string;
                  },
                  MenuProps: {
                    PaperProps: {
                      elevation: 8,
                      sx: {
                        borderRadius: 2,
                        mt: 0.5,
                        boxShadow: '0 12px 28px rgba(2, 6, 23, 0.12)',
                      },
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WorkOutlineIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">Select industry</Typography>
                </MenuItem>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Specify Industry when "Others" is selected */}
            {industry === 'Others' && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Specify Industry"
                  value={industryOther}
                  onChange={(e) => setIndustryOther(e.target.value)}
                  placeholder="Describe the industry"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WorkOutlineIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

            {/* Partner/Referral (Optional) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Partner / Referral (Optional)"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value === '' ? '' : Number(e.target.value))}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (!selected) {
                      return <Typography variant="body2" color="text.secondary">Select partner (optional)</Typography>;
                    }
                    const partner = partners.find(p => p.id === selected);
                    return partner?.company_name || '';
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HandshakeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText="Select if this client was referred by a partner"
              >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">None</Typography>
                </MenuItem>
                {partners.map((partner) => (
                  <MenuItem key={partner.id} value={partner.id}>{partner.company_name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Address */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="e.g., 123 Anson Rd #10-01"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
                placeholder="e.g., 069120"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalPostOfficeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Contacts */}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Contact Information</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addContact}
                  variant="contained"
                  size="small"
                >
                  Add Contact
                </Button>
              </Stack>

              {contacts.map((contact, index) => (
                <Card
                  key={index}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Contact {index + 1}</Typography>
                    {contacts.length > 1 && (
                      <Tooltip title="Remove contact">
                        <IconButton
                          onClick={() => removeContact(index)}
                          color="error"
                          size="small"
                          aria-label={`Remove Contact ${index + 1}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Contact Name"
                        required
                        value={contact.name}
                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                        autoComplete="name"
                        placeholder="e.g., Jane Doe"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonOutlineIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
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
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        required
                        value={contact.email}
                        onChange={(e) => updateContact(index, 'email', e.target.value)}
                        autoComplete="email"
                        placeholder="e.g., jane@company.com"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Grid>
          </Grid>

          <Stack sx={{ mt: 2 }} spacing={2}>
            {loading && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Updating client...</Typography>
              </Stack>
            )}
            {error && <Alert color="error">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}
          </Stack>
        </CardContent>

        <Divider />

        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Button color="error" variant="outlined" disabled={loading} onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
          <Button type="submit" variant="contained" disabled={loading}>Save Changes</Button>
        </CardActions>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => !deleteLoading && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this client? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}
