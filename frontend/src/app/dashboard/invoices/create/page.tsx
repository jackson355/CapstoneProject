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
  const [quotations, setQuotations] = React.useState<any[]>([]);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  // Form state
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<number | ''>('');
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

  const selectedQuotation = React.useMemo(
    () => quotations.find((q) => q.id === selectedQuotationId),
    [quotations, selectedQuotationId]
  );

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch company settings to get default company info
        const companyResult = await authClient.getCompanySettings();
        if (companyResult.data) {
          setCompanyName(companyResult.data.company_name || '');
          setCompanyEmail(companyResult.data.company_email || '');
          setCompanyPhone(companyResult.data.company_phone || '');
          setCompanyAddress(companyResult.data.company_address || '');
          setCompanyWebsite(companyResult.data.company_website || '');
        }

        // Fetch ACCEPTED quotations only
        const quotationsResult = await authClient.getQuotations({ page: 0, per_page: 100, status: 'accepted' });
        if (quotationsResult.data) {
          setQuotations(quotationsResult.data.quotations || []);
        }

        // Fetch invoice templates
        const templatesResult = await authClient.getTemplates();
        if (templatesResult.data) {
          const invoiceTemplates = (templatesResult.data.templates || []).filter(
            (t: any) => t.template_type === 'invoice'
          );
          setTemplates(invoiceTemplates);
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

  const handleTemplateChange = async (templateId: number) => {
    setSelectedTemplateId(templateId);
    setTemplatePlaceholders([]);

    // Fetch placeholders for this template
    try {
      const result = await authClient.getTemplatePlaceholders(templateId);
      if (result.data && result.data.placeholders) {
        setTemplatePlaceholders(result.data.placeholders);

        // Auto-fill company info from selected quotation if available
        if (selectedQuotation?.my_company_info) {
          const quotationCompanyInfo = selectedQuotation.my_company_info;
          setCompanyName(quotationCompanyInfo.name || '');
          setCompanyEmail(quotationCompanyInfo.email || '');
          setCompanyPhone(quotationCompanyInfo.phone || '');
          setCompanyAddress(quotationCompanyInfo.address || '');
          setCompanyWebsite(quotationCompanyInfo.website || '');
        }
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

    if (!selectedQuotationId || !selectedTemplateId) {
      setError('Please fill in all required fields');
      return;
    }

    if (!selectedQuotation) {
      setError('Selected quotation not found');
      return;
    }

    // Validate due date is required and after today
    if (!dueDate) {
      setError('Due date is required for invoices');
      return;
    }

    const selectedDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      setError('Due date must be after today');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const params: any = {
        quotation_id: selectedQuotationId,
        template_id: selectedTemplateId,
      };

      // Add company info if template has company placeholders AND user actually filled in at least one field
      // If no fields are filled, omit my_company_info so backend can use quotation's company info
      if (hasCompanyPlaceholders) {
        const hasAnyCompanyData = companyName || companyEmail || companyPhone || companyAddress || companyWebsite;
        if (hasAnyCompanyData) {
          params.my_company_info = {
            name: companyName || undefined,
            email: companyEmail || undefined,
            phone: companyPhone || undefined,
            address: companyAddress || undefined,
            website: companyWebsite || undefined,
          };
        }
      }

      // Add due date (now required)
      params.due_date = new Date(dueDate).toISOString();

      const result = await authClient.createInvoice(params);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Redirect to editor page
        router.push(paths.dashboard.editInvoice(result.data.id));
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice. Please try again.');
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
          <Typography variant="h4">Create Invoice</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Select an accepted quotation and invoice template to get started.
          </Typography>
        </div>

        {quotations.length === 0 && (
          <Alert severity="info">
            No accepted quotations available. You can only create invoices from quotations with status "accepted".
            Please mark a quotation as accepted first.
          </Alert>
        )}

        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {error && (
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {/* Quotation Selection - ACCEPTED only */}
                <FormControl fullWidth required>
                  <InputLabel>Accepted Quotation</InputLabel>
                  <Select
                    value={selectedQuotationId}
                    label="Accepted Quotation"
                    onChange={(e) => setSelectedQuotationId(e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>Select an accepted quotation</em>
                    </MenuItem>
                    {quotations.map((quotation) => (
                      <MenuItem key={quotation.id} value={quotation.id}>
                        {quotation.quotation_number} - {quotation.selected_contact.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Template Selection */}
                <FormControl fullWidth required>
                  <InputLabel>Invoice Template</InputLabel>
                  <Select
                    value={selectedTemplateId}
                    label="Invoice Template"
                    onChange={(e) => handleTemplateChange(e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>Select a template</em>
                    </MenuItem>
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_ai_enhanced && !template.name.includes('(AI Enhanced)') && ' (AI Enhanced)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Company Info Fields - Only show if template has company placeholders */}
                {hasCompanyPlaceholders && (
                  <>
                    {selectedQuotation?.my_company_info ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Company information will be used from the selected quotation.
                      </Alert>
                    ) : (
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
                  </>
                )}

                {/* Due Date Field */}
                <TextField
                  fullWidth
                  required
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="When payment is due (must be after today)"
                  inputProps={{ min: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] }}
                />

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => router.push(paths.dashboard.invoices)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting || !selectedQuotationId || !selectedTemplateId || !dueDate || quotations.length === 0}
                  >
                    {submitting ? 'Creating...' : 'Create & Edit Invoice'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card sx={{ bgcolor: 'primary.50', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              ✨ What happens next?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1. The invoice will be created from the selected accepted quotation<br />
              2. Client data will be automatically filled into the template placeholders<br />
              3. You'll be redirected to the OnlyOffice editor to review the invoice<br />
              4. You can add additional details, adjust amounts, and finalize the invoice<br />
              5. Save your changes and the invoice will be ready
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </RoleGuard>
  );
}
