'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { X as CancelIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { format } from 'date-fns';
import { WYSIWYGEmailEditor } from '@/components/dashboard/email/wysiwyg-email-editor';

interface ScheduledEmail {
  id: number;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  scheduled_time: string;
  is_recurring: boolean;
  recurrence_pattern?: {
    frequency: string;
    interval: number;
    end_date?: string;
  };
  trigger_type: string;
  status: string;
  document_number?: string;
  document_type?: string;
  quotation_id?: number;
  invoice_id?: number;
  attach_document?: boolean;
}

interface Quotation {
  id: number;
  quotation_number: string;
  selected_contact: { name: string; email: string; phone?: string };
  client: { company_name: string; address?: string };
  status: string;
  due_date?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  selected_contact: { name: string; email: string; phone?: string };
  client: { company_name: string; address?: string };
  status: string;
  due_date?: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  template_type: string;
}

interface CompanySettings {
  id: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_website: string;
}

export default function ScheduledEmailsPage(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [emails, setEmails] = React.useState<ScheduledEmail[]>([]);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [triggerTypeFilter, setTriggerTypeFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('pending');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [documentTypeFilter, setDocumentTypeFilter] = React.useState<string>('all');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = React.useState<boolean>(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = React.useState<ScheduledEmail | null>(null);

  // Data for create form
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [companySettings, setCompanySettings] = React.useState<CompanySettings | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    document_type: '' as '' | 'quotation' | 'invoice',
    document_id: '' as number | '',
    template_id: '' as number | '',
    recipient_email: '',
    recipient_name: '',
    subject: '',
    body: '',
    scheduled_time: '',
    is_recurring: false,
    frequency: 'daily',
    interval: 1,
    end_date: '',
    attach_document: false,
  });

  React.useEffect(() => {
    fetchScheduledEmails();
  }, [page, rowsPerPage, triggerTypeFilter, statusFilter, searchQuery, documentTypeFilter]);

  React.useEffect(() => {
    if (createDialogOpen) {
      fetchFormData();
    }
  }, [createDialogOpen, formData.document_type]);

  const fetchScheduledEmails = async (): Promise<void> => {
    try {
      setLoading(true);
      const params: any = {
        page: page,
        per_page: rowsPerPage,
      };

      if (triggerTypeFilter !== 'all') {
        params.trigger_type = triggerTypeFilter;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (documentTypeFilter !== 'all') {
        params.document_type = documentTypeFilter;
      }

      const response = await authClient.getScheduledEmails(params);
      if (response.data) {
        setEmails(response.data.scheduled_emails || []);
        setTotalCount(response.data.total || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch scheduled emails', error);
      setMessage({ type: 'error', text: 'Failed to load scheduled emails' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async (): Promise<void> => {
    try {
      const [quotationsRes, invoicesRes, templatesRes, companyRes] = await Promise.all([
        authClient.getQuotations({ page: 0, per_page: 100 }),
        authClient.getInvoices({ page: 0, per_page: 100 }),
        authClient.getEmailTemplates({ template_type: formData.document_type || undefined }),
        authClient.getCompanySettings(),
      ]);

      setQuotations(quotationsRes.data?.quotations || []);
      setInvoices(invoicesRes.data?.invoices || []);
      setTemplates(templatesRes.data || []);
      setCompanySettings(companyRes.data || null);
    } catch (error) {
      logger.error('Failed to fetch form data', error);
    }
  };

  const handleDocumentChange = (documentId: number): void => {
    setFormData((prev) => ({ ...prev, document_id: documentId }));

    const selectedDocument =
      formData.document_type === 'quotation'
        ? quotations.find((q) => q.id === documentId)
        : invoices.find((i) => i.id === documentId);

    if (selectedDocument) {
      setFormData((prev) => ({
        ...prev,
        document_id: documentId,
        recipient_email: selectedDocument.selected_contact?.email || '',
        recipient_name: selectedDocument.selected_contact?.name || '',
      }));
    }
  };

  const handleTemplateChange = (templateId: number): void => {
    setFormData((prev) => ({ ...prev, template_id: templateId }));

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        template_id: templateId,
        subject: template.subject,
        body: template.body,
      }));
    }
  };

  const handleCreateEmail = async (): Promise<void> => {
    try {
      // Validate scheduled time is in the future
      const scheduledDate = new Date(formData.scheduled_time);
      if (scheduledDate <= new Date()) {
        setMessage({ type: 'error', text: 'Scheduled time must be in the future' });
        return;
      }

      // Convert local datetime to ISO string with timezone
      const isoDateTime = scheduledDate.toISOString();

      const emailData: any = {
        recipient_email: formData.recipient_email,
        recipient_name: formData.recipient_name || undefined,
        subject: formData.subject,
        body: formData.body,
        scheduled_time: isoDateTime,
        is_recurring: formData.is_recurring,
        trigger_type: 'manual',
        attach_document: formData.attach_document,
      };

      // Add document reference
      if (formData.document_type === 'quotation' && formData.document_id) {
        emailData.quotation_id = formData.document_id;
      } else if (formData.document_type === 'invoice' && formData.document_id) {
        emailData.invoice_id = formData.document_id;
      }

      // Add template reference
      if (formData.template_id) {
        emailData.email_template_id = formData.template_id;
      }

      if (formData.is_recurring) {
        const endDate = formData.end_date ? new Date(formData.end_date).toISOString() : undefined;
        emailData.recurrence_pattern = {
          frequency: formData.frequency,
          interval: formData.interval,
          end_date: endDate,
        };
      }

      await authClient.createScheduledEmail(emailData);
      setMessage({ type: 'success', text: 'Scheduled email created successfully!' });
      setCreateDialogOpen(false);
      resetForm();
      fetchScheduledEmails();
    } catch (error: any) {
      logger.error('Failed to create scheduled email', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to create scheduled email';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleCancelEmail = async (id: number): Promise<void> => {
    try {
      await authClient.cancelScheduledEmail(id);
      setMessage({ type: 'success', text: 'Scheduled email cancelled successfully!' });
      fetchScheduledEmails();
    } catch (error) {
      logger.error('Failed to cancel scheduled email', error);
      setMessage({ type: 'error', text: 'Failed to cancel scheduled email' });
    }
  };

  const resetForm = (): void => {
    setFormData({
      document_type: '',
      document_id: '',
      template_id: '',
      recipient_email: '',
      recipient_name: '',
      subject: '',
      body: '',
      scheduled_time: '',
      is_recurring: false,
      frequency: 'daily',
      interval: 1,
      end_date: '',
      attach_document: false,
    });
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'success';
      case 'cancelled':
      case 'failed':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getTriggerTypeColor = (type: string): 'primary' | 'secondary' | 'info' => {
    switch (type) {
      case 'manual':
        return 'primary';
      case 'deadline':
        return 'secondary';
      case 'status_change':
        return 'info';
      default:
        return 'primary';
    }
  };

  const getScheduleDisplay = (email: ScheduledEmail): string => {
    if (email.is_recurring && email.recurrence_pattern) {
      return `Every ${email.recurrence_pattern.interval} ${email.recurrence_pattern.frequency}`;
    }
    return email.scheduled_time ? format(new Date(email.scheduled_time), 'MMM d, yyyy HH:mm') : 'N/A';
  };

  const currentDocuments = formData.document_type === 'quotation' ? quotations : formData.document_type === 'invoice' ? invoices : [];
  const selectedDocument =
    formData.document_type === 'quotation'
      ? quotations.find((q) => q.id === formData.document_id)
      : formData.document_type === 'invoice'
        ? invoices.find((i) => i.id === formData.document_id)
        : null;

  // Build variables for template
  const getTemplateVariables = () => {
    if (!selectedDocument) return {};
    return {
      quotation_number: formData.document_type === 'quotation' ? (selectedDocument as Quotation)?.quotation_number || '' : '',
      invoice_number: formData.document_type === 'invoice' ? (selectedDocument as Invoice)?.invoice_number || '' : '',
      contact_name: selectedDocument?.selected_contact?.name || '',
      contact_email: selectedDocument?.selected_contact?.email || '',
      contact_phone: selectedDocument?.selected_contact?.phone || '',
      client_company_name: selectedDocument?.client?.company_name || '',
      client_address: selectedDocument?.client?.address || '',
      my_company_name: companySettings?.company_name || '',
      my_company_email: companySettings?.company_email || '',
      my_company_phone: companySettings?.company_phone || '',
      due_date: (() => {
        const dueDate = formData.document_type === 'quotation' ? (selectedDocument as Quotation)?.due_date : (selectedDocument as Invoice)?.due_date;
        return dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '';
      })(),
      current_date: new Date().toLocaleDateString('en-GB'),
      quotation_status: formData.document_type === 'quotation' ? (selectedDocument as Quotation)?.status || '' : '',
      invoice_status: formData.document_type === 'invoice' ? (selectedDocument as Invoice)?.status || '' : '',
    };
  };

  const getAvailableVariables = () => {
    if (!selectedDocument) return [];
    return [
      ...(formData.document_type === 'quotation'
        ? [{ key: 'quotation_number', label: 'Quotation Number', value: (selectedDocument as Quotation)?.quotation_number || '' }]
        : [{ key: 'invoice_number', label: 'Invoice Number', value: (selectedDocument as Invoice)?.invoice_number || '' }]
      ),
      { key: 'contact_name', label: 'Contact Name', value: selectedDocument?.selected_contact?.name || '' },
      { key: 'contact_email', label: 'Contact Email', value: selectedDocument?.selected_contact?.email || '' },
      { key: 'contact_phone', label: 'Contact Phone', value: selectedDocument?.selected_contact?.phone || '' },
      { key: 'client_company_name', label: 'Client Company Name', value: selectedDocument?.client?.company_name || '' },
      { key: 'client_address', label: 'Client Address', value: selectedDocument?.client?.address || '' },
      { key: 'my_company_name', label: 'My Company Name', value: companySettings?.company_name || '' },
      { key: 'my_company_email', label: 'My Company Email', value: companySettings?.company_email || '' },
      { key: 'my_company_phone', label: 'My Company Phone', value: companySettings?.company_phone || '' },
      {
        key: 'due_date',
        label: 'Due Date',
        value: (() => {
          const dueDate = formData.document_type === 'quotation' ? (selectedDocument as Quotation)?.due_date : (selectedDocument as Invoice)?.due_date;
          return dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '';
        })()
      },
      { key: 'current_date', label: 'Current Date', value: new Date().toLocaleDateString('en-GB') },
      ...(formData.document_type === 'quotation'
        ? [{ key: 'quotation_status', label: 'Quotation Status', value: (selectedDocument as Quotation)?.status || '' }]
        : [{ key: 'invoice_status', label: 'Invoice Status', value: (selectedDocument as Invoice)?.status || '' }]
      ),
    ];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h4">Scheduled Emails</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Manage scheduled and recurring emails
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Schedule Email
          </Button>
        </Stack>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Search by email, subject, or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon style={{ marginRight: 8, color: '#666' }} />,
              }}
              sx={{ minWidth: 280 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={documentTypeFilter}
                label="Document Type"
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Documents</MenuItem>
                <MenuItem value="quotation">Quotation</MenuItem>
                <MenuItem value="invoice">Invoice</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Trigger Type</InputLabel>
              <Select
                value={triggerTypeFilter}
                label="Trigger Type"
                onChange={(e) => setTriggerTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="deadline">Deadline</MenuItem>
                <MenuItem value="status_change">Status Change</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Document</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No scheduled emails found
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow key={email.id} hover>
                      <TableCell>{getScheduleDisplay(email)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{email.recipient_email}</Typography>
                        {email.recipient_name && (
                          <Typography variant="caption" color="text.secondary">
                            {email.recipient_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                          {email.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {email.document_number ? (
                          <Chip
                            label={email.document_number}
                            size="small"
                            variant="outlined"
                            color={email.document_type === 'quotation' ? 'primary' : 'secondary'}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={email.trigger_type || 'manual'}
                          color={getTriggerTypeColor(email.trigger_type || 'manual')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={email.status}
                          color={getStatusColor(email.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View Email">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedEmail(email);
                                setViewDialogOpen(true);
                              }}
                            >
                              <EyeIcon />
                            </IconButton>
                          </Tooltip>
                          {email.status === 'pending' && (
                            <Tooltip title="Cancel Email">
                              <IconButton
                                size="small"
                                onClick={() => handleCancelEmail(email.id)}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>
      </Stack>

      {/* Create Scheduled Email Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Schedule Email</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Document Selection Section */}
            <Typography variant="subtitle2" color="text.secondary">
              Document Selection (Optional)
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={formData.document_type}
                  label="Document Type"
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      document_type: e.target.value as '' | 'quotation' | 'invoice',
                      document_id: '',
                      template_id: '',
                      recipient_email: '',
                      recipient_name: '',
                    });
                  }}
                >
                  <MenuItem value="">
                    <em>No Document</em>
                  </MenuItem>
                  <MenuItem value="quotation">Quotation</MenuItem>
                  <MenuItem value="invoice">Invoice</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!formData.document_type}>
                <InputLabel>Select Document</InputLabel>
                <Select
                  value={formData.document_id}
                  label="Select Document"
                  onChange={(e) => handleDocumentChange(e.target.value as number)}
                >
                  <MenuItem value="">
                    <em>Select a document</em>
                  </MenuItem>
                  {currentDocuments.map((doc: any) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {formData.document_type === 'quotation' ? doc.quotation_number : doc.invoice_number} -{' '}
                      {doc.client?.company_name || 'Unknown Client'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {selectedDocument && (
              <Alert severity="success" icon={false}>
                <Stack spacing={1}>
                  <Typography variant="body2" fontWeight="medium">
                    Document Selected
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2">
                      <strong>Client:</strong> {selectedDocument.client?.company_name || 'Unknown'}
                    </Typography>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="body2">
                      <strong>Contact:</strong> {selectedDocument.selected_contact?.name || 'Unknown'}
                    </Typography>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedDocument.selected_contact?.email || 'N/A'}
                    </Typography>
                  </Stack>
                </Stack>
              </Alert>
            )}

            <Divider />

            {/* Email Template Selection */}
            <FormControl fullWidth>
              <InputLabel>Email Template (Optional)</InputLabel>
              <Select
                value={formData.template_id}
                label="Email Template (Optional)"
                onChange={(e) => handleTemplateChange(e.target.value as number)}
              >
                <MenuItem value="">
                  <em>No Template</em>
                </MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Recipient */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Recipient Email *"
                type="email"
                value={formData.recipient_email}
                onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                placeholder="client@example.com"
                helperText={selectedDocument ? "Auto-filled from selected document" : "Enter recipient email"}
              />
              <TextField
                fullWidth
                label="Recipient Name"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                placeholder="John Doe"
              />
            </Box>

            {/* Attach Document Checkbox */}
            {formData.document_id && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.attach_document}
                    onChange={(e) => setFormData({ ...formData, attach_document: e.target.checked })}
                  />
                }
                label="Attach Document (PDF/DOCX)"
              />
            )}

            {/* WYSIWYG Email Editor */}
            <WYSIWYGEmailEditor
              subject={formData.subject}
              body={formData.body}
              onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
              onBodyChange={(value) => setFormData({ ...formData, body: value })}
              variables={getTemplateVariables()}
              availableVariables={getAvailableVariables()}
            />

            <Divider />

            {/* Scheduling Section */}
            <Typography variant="subtitle2" color="text.secondary">
              Scheduling Options
            </Typography>

            <TextField
              fullWidth
              type="datetime-local"
              label="Scheduled Time *"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="When this email should be sent (must be in the future)"
              inputProps={{
                min: new Date().toISOString().slice(0, 16),
              }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                />
              }
              label="Recurring Email"
            />

            {formData.is_recurring && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={formData.frequency}
                      label="Frequency"
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    type="number"
                    label="Interval"
                    value={formData.interval}
                    onChange={(e) =>
                      setFormData({ ...formData, interval: parseInt(e.target.value) || 1 })
                    }
                    inputProps={{ min: 1 }}
                    helperText="Repeat every N days/weeks/months"
                  />
                </Box>

                <TextField
                  fullWidth
                  type="datetime-local"
                  label="End Date (Optional)"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="When to stop sending recurring emails"
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateEmail}
            disabled={
              !formData.recipient_email || !formData.subject || !formData.body || !formData.scheduled_time
            }
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Email Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Scheduled Email Details</DialogTitle>
        <Divider />
        <DialogContent>
          {selectedEmail && (
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Recipient:
                  </Typography>
                  <Typography variant="body1">{selectedEmail.recipient_email}</Typography>
                  {selectedEmail.recipient_name && (
                    <Typography variant="caption" color="text.secondary">
                      {selectedEmail.recipient_name}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Schedule:
                  </Typography>
                  <Typography variant="body1">{getScheduleDisplay(selectedEmail)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Document:
                  </Typography>
                  {selectedEmail.document_number ? (
                    <Chip
                      label={`${selectedEmail.document_type}: ${selectedEmail.document_number}`}
                      size="small"
                      color={selectedEmail.document_type === 'quotation' ? 'primary' : 'secondary'}
                    />
                  ) : (
                    <Typography variant="body2">No document attached</Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status:
                  </Typography>
                  <Chip
                    label={selectedEmail.status}
                    color={getStatusColor(selectedEmail.status)}
                    size="small"
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject:
                </Typography>
                <Typography variant="body1">{selectedEmail.subject}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Email Body:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
