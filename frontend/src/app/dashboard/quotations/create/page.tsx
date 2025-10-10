'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { paths } from '@/paths';
import { RoleGuard } from '@/components/auth/role-guard';

export default function Page(): React.JSX.Element {
  const router = useRouter();
  const [clients, setClients] = React.useState<any[]>([]);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  // Form state
  const [selectedClientId, setSelectedClientId] = React.useState<number | ''>('');
  const [selectedContactIndex, setSelectedContactIndex] = React.useState<number | ''>('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | ''>('');

  // Template placeholders state
  const [templatePlaceholders, setTemplatePlaceholders] = React.useState<string[]>([]);

  // Company info state
  const [companyName, setCompanyName] = React.useState('');
  const [companyEmail, setCompanyEmail] = React.useState('');
  const [companyPhone, setCompanyPhone] = React.useState('');
  const [companyAddress, setCompanyAddress] = React.useState('');
  const [companyWebsite, setCompanyWebsite] = React.useState('');

  // Due date state
  const [dueDate, setDueDate] = React.useState('');

  const selectedClient = React.useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedContact = React.useMemo(
    () => selectedClient?.contacts?.[selectedContactIndex as number],
    [selectedClient, selectedContactIndex]
  );

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch clients
        const clientsResult = await authClient.getClients(0, 100);
        if (clientsResult.data) {
          setClients(clientsResult.data.clients || []);
        }

        // Fetch quotation templates
        const templatesResult = await authClient.getTemplates(0, 100);
        if (templatesResult.data) {
          const quotationTemplates = (templatesResult.data.templates || []).filter(
            (t: any) => t.template_type === 'quotation'
          );
          setTemplates(quotationTemplates);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClientChange = (clientId: number) => {
    setSelectedClientId(clientId);
    setSelectedContactIndex(''); // Reset contact selection
  };

  const handleTemplateChange = async (templateId: number) => {
    setSelectedTemplateId(templateId);
    setTemplatePlaceholders([]);

    // Fetch placeholders for this template
    try {
      const result = await authClient.getTemplatePlaceholders(templateId);
      if (result.data && result.data.placeholders) {
        setTemplatePlaceholders(result.data.placeholders);
      }
    } catch (error) {
      console.error('Error fetching template placeholders:', error);
    }
  };

  // Check if template has company placeholders
  const hasCompanyPlaceholders = React.useMemo(() => {
    return templatePlaceholders.some(p => p.startsWith('my_company_'));
  }, [templatePlaceholders]);

  const companyPlaceholdersInTemplate = React.useMemo(() => {
    return templatePlaceholders.filter(p => p.startsWith('my_company_'));
  }, [templatePlaceholders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || selectedContactIndex === '' || !selectedTemplateId) {
      setError('Please fill in all required fields');
      return;
    }

    if (!selectedContact) {
      setError('Selected contact not found');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const params: any = {
        client_id: selectedClientId,
        selected_contact: {
          name: selectedContact.name,
          phone: selectedContact.phone || undefined,
          email: selectedContact.email,
        },
        template_id: selectedTemplateId,
      };

      // Add company info if template has company placeholders
      if (hasCompanyPlaceholders) {
        params.my_company_info = {
          name: companyName || undefined,
          email: companyEmail || undefined,
          phone: companyPhone || undefined,
          address: companyAddress || undefined,
          website: companyWebsite || undefined,
        };
      }

      // Add due date if provided
      if (dueDate) {
        params.due_date = new Date(dueDate).toISOString();
      }

      const result = await authClient.createQuotation(params);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Redirect to editor page
        router.push(paths.dashboard.editQuotation(result.data.id));
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      setError('Failed to create quotation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Stack>
    );
  }

  return (
    <RoleGuard allowedRoles={[1, 2]}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Create Quotation</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Select a client, contact person, and quotation template to get started.
          </Typography>
        </div>

        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {error && (
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {/* Client Selection */}
                <FormControl fullWidth required>
                  <InputLabel>Client</InputLabel>
                  <Select
                    value={selectedClientId}
                    label="Client"
                    onChange={(e) => handleClientChange(e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>Select a client</em>
                    </MenuItem>
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.company_name} {client.uen ? `(${client.uen})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Contact Person Selection */}
                <FormControl fullWidth required disabled={!selectedClientId}>
                  <InputLabel>Contact Person</InputLabel>
                  <Select
                    value={selectedContactIndex}
                    label="Contact Person"
                    onChange={(e) => setSelectedContactIndex(e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>Select a contact person</em>
                    </MenuItem>
                    {selectedClient?.contacts?.map((contact: any, index: number) => (
                      <MenuItem key={index} value={index}>
                        {contact.name} - {contact.email} {contact.phone ? `(${contact.phone})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Template Selection */}
                <FormControl fullWidth required>
                  <InputLabel>Quotation Template</InputLabel>
                  <Select
                    value={selectedTemplateId}
                    label="Quotation Template"
                    onChange={(e) => handleTemplateChange(e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>Select a template</em>
                    </MenuItem>
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_ai_enhanced && ' (AI Enhanced)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Company Info Fields - Only show if template has company placeholders */}
                {hasCompanyPlaceholders && (
                  <>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      This template requires your company information. Please fill in the fields below.
                    </Alert>

                    {companyPlaceholdersInTemplate.includes('my_company_name') && (
                      <TextField
                        fullWidth
                        label="Company Name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g., MegaPixel Corp"
                      />
                    )}

                    {companyPlaceholdersInTemplate.includes('my_company_email') && (
                      <TextField
                        fullWidth
                        label="Company Email"
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="e.g., info@megapixel.com"
                      />
                    )}

                    {companyPlaceholdersInTemplate.includes('my_company_phone') && (
                      <TextField
                        fullWidth
                        label="Company Phone"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="e.g., +65 1234 5678"
                      />
                    )}

                    {companyPlaceholdersInTemplate.includes('my_company_address') && (
                      <TextField
                        fullWidth
                        label="Company Address"
                        multiline
                        rows={2}
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="e.g., 123 Business Street, #01-234"
                      />
                    )}

                    {companyPlaceholdersInTemplate.includes('my_company_website') && (
                      <TextField
                        fullWidth
                        label="Company Website"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="e.g., www.megapixel.com"
                      />
                    )}
                  </>
                )}

                {/* Due Date Field */}
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Optional: When payment is due"
                />

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => router.push(paths.dashboard.quotations)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting || !selectedClientId || selectedContactIndex === '' || !selectedTemplateId}
                  >
                    {submitting ? 'Creating...' : 'Create & Edit Quotation'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Info Card - Auto-filled Placeholders */}
        <Card sx={{ bgcolor: 'info.50', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              📋 Auto-Filled Placeholders
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The following placeholders in your template will be automatically replaced:
            </Typography>

            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '200px' }}>
                  Client Information:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {'{{'}<strong>client_company_name</strong>{'}},'} {'{{'}<strong>client_uen</strong>{'}},'} {'{{'}<strong>client_industry</strong>{'}},'} {'{{'}<strong>client_address</strong>{'}},'} {'{{'}<strong>client_postal_code</strong>{'}}'}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '200px' }}>
                  Contact Person:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {'{{'}<strong>contact_name</strong>{'}},'} {'{{'}<strong>contact_phone</strong>{'}},'} {'{{'}<strong>contact_email</strong>{'}}'}
                </Typography>
              </Stack>

              {hasCompanyPlaceholders && (
                <Stack direction="row" spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '200px' }}>
                    Your Company:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {companyPlaceholdersInTemplate.map((p, i) => (
                      <span key={p}>
                        {'{{'}<strong>{p}</strong>{'}}'}
                        {i < companyPlaceholdersInTemplate.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </Typography>
                </Stack>
              )}

              <Stack direction="row" spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '200px' }}>
                  Date:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {'{{'}<strong>current_date</strong>{'}},'} {'{{'}<strong>quotation_date</strong>{'}},'} {'{{'}<strong>date</strong>{'}}'}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Info Card - What Happens Next */}
        <Card sx={{ bgcolor: 'primary.50', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              ✨ What happens next?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1. Client data will be automatically filled into the template placeholders<br />
              2. You'll be redirected to the OnlyOffice editor to review the quotation<br />
              3. You can add items, adjust pricing, and finalize the quotation<br />
              4. Save your changes and the quotation will be ready
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </RoleGuard>
  );
}
