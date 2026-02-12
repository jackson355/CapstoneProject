'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Alert,
  CircularProgress,
  Typography,
  Checkbox,
  Chip,
} from '@mui/material';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import { WYSIWYGEmailEditor } from '@/components/dashboard/email/wysiwyg-email-editor';

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

export default function SendEmailPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [sending, setSending] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [documentType, setDocumentType] = React.useState<'quotation' | 'invoice'>('quotation');
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [companySettings, setCompanySettings] = React.useState<CompanySettings | null>(null);

  const [selectedDocumentId, setSelectedDocumentId] = React.useState<number | ''>('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | ''>('');
  const [recipientEmail, setRecipientEmail] = React.useState<string>('');
  const [subject, setSubject] = React.useState<string>('');
  const [body, setBody] = React.useState<string>('');
  const [attachDocument, setAttachDocument] = React.useState<boolean>(true);

  React.useEffect(() => {
    fetchData();
  }, [documentType]);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Fetch quotations, invoices, templates, and company settings
      const [quotationsRes, invoicesRes, templatesRes, companyRes] = await Promise.all([
        authClient.getQuotations({ page: 0, per_page: 100 }),
        authClient.getInvoices({ page: 0, per_page: 100 }),
        authClient.getEmailTemplates({ template_type: documentType }),
        authClient.getCompanySettings(),
      ]);

      console.log('Quotations response:', quotationsRes);
      console.log('Invoices response:', invoicesRes);
      console.log('Templates response:', templatesRes);
      console.log('Company settings response:', companyRes);

      // Access data from the response object
      setQuotations(quotationsRes.data?.quotations || []);
      setInvoices(invoicesRes.data?.invoices || []);
      setTemplates(templatesRes.data || []);
      setCompanySettings(companyRes.data || null);

      if (!quotationsRes.data?.quotations || quotationsRes.data.quotations.length === 0) {
        setMessage({ type: 'info', text: 'No quotations found. Please create a quotation first.' });
      }
    } catch (error) {
      logger.error('Failed to fetch data', error);
      setMessage({ type: 'error', text: 'Failed to load data. Please check the console for details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (documentId: number): void => {
    setSelectedDocumentId(documentId);

    const selectedDocument =
      documentType === 'quotation'
        ? quotations.find((q) => q.id === documentId)
        : invoices.find((i) => i.id === documentId);

    if (selectedDocument) {
      setRecipientEmail(selectedDocument.selected_contact.email);
    }
  };

  const handleTemplateChange = (templateId: number): void => {
    setSelectedTemplateId(templateId);

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSend = async (): Promise<void> => {
    try {
      setSending(true);
      setMessage(null);

      const emailData: any = {
        recipient_email: recipientEmail,
        subject,
        body,
        attach_document: attachDocument,
      };

      if (documentType === 'quotation' && selectedDocumentId) {
        emailData.quotation_id = selectedDocumentId;
      } else if (documentType === 'invoice' && selectedDocumentId) {
        emailData.invoice_id = selectedDocumentId;
      }

      await authClient.sendEmail(emailData);

      setMessage({ type: 'success', text: 'Email sent successfully!' });

      // Reset form after 2 seconds
      setTimeout(() => {
        router.push(paths.dashboard.emailsHistory);
      }, 2000);
    } catch (error) {
      logger.error('Failed to send email', error);
      setMessage({ type: 'error', text: 'Failed to send email. Please check your SMTP settings.' });
    } finally {
      setSending(false);
    }
  };

  const currentDocuments = documentType === 'quotation' ? quotations : invoices;
  const selectedDocument =
    documentType === 'quotation'
      ? quotations.find((q) => q.id === selectedDocumentId)
      : invoices.find((i) => i.id === selectedDocumentId);

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Send Email
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Send an email to a client about a quotation or invoice
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card>
          <CardHeader
            title="Document Selection"
            subheader="Choose the document you want to send via email"
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              <FormControl fullWidth required>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={documentType}
                  label="Document Type"
                  onChange={(e) => {
                    setDocumentType(e.target.value as 'quotation' | 'invoice');
                    setSelectedDocumentId('');
                    setSelectedTemplateId('');
                    setRecipientEmail('');
                    setSubject('');
                    setBody('');
                  }}
                >
                  <MenuItem value="quotation">📋 Quotation</MenuItem>
                  <MenuItem value="invoice">🧾 Invoice</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Select Document</InputLabel>
                <Select
                  value={selectedDocumentId}
                  label="Select Document"
                  onChange={(e) => handleDocumentChange(e.target.value as number)}
                  disabled={loading || currentDocuments.length === 0}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 400,
                        width: 'auto',
                      },
                    },
                  }}
                >
                  {loading ? (
                    <MenuItem value="" disabled>
                      Loading...
                    </MenuItem>
                  ) : currentDocuments.length === 0 ? (
                    <MenuItem value="" disabled>
                      No {documentType}s found - Create one first
                    </MenuItem>
                  ) : (
                    currentDocuments.map((doc: any) => (
                      <MenuItem key={doc.id} value={doc.id}>
                        {documentType === 'quotation' ? doc.quotation_number : doc.invoice_number} -{' '}
                        {doc.client?.company_name || 'Unknown Client'}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {selectedDocument && (
                <Alert severity="success" icon="✓">
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
                      <Chip label={selectedDocument.status || 'pending'} size="small" color="primary" />
                    </Stack>
                  </Stack>
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Email Content"
            subheader="Compose your email message"
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Template (Optional)</InputLabel>
                <Select
                  value={selectedTemplateId}
                  label="Template (Optional)"
                  onChange={(e) => handleTemplateChange(e.target.value as number)}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 400,
                        width: 'auto',
                      },
                    },
                  }}
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

              <TextField
                fullWidth
                label="Recipient Email *"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                placeholder="client@example.com"
                helperText="Email address of the recipient (auto-filled from selected document)"
                disabled={!selectedDocumentId}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={attachDocument}
                    onChange={(e) => setAttachDocument(e.target.checked)}
                  />
                }
                label="Attach Document (PDF/DOCX)"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* WYSIWYG Email Editor */}
        {selectedDocumentId && (
          <WYSIWYGEmailEditor
            subject={subject}
            body={body}
            onSubjectChange={setSubject}
            onBodyChange={setBody}
            variables={{
              quotation_number: documentType === 'quotation' ? (selectedDocument as Quotation)?.quotation_number || '' : '',
              invoice_number: documentType === 'invoice' ? (selectedDocument as Invoice)?.invoice_number || '' : '',
              client_name: selectedDocument?.selected_contact?.name || '',
              client_email: selectedDocument?.selected_contact?.email || '',
              client_phone: selectedDocument?.selected_contact?.phone || '',
              client_company_name: selectedDocument?.client?.company_name || '',
              client_address: selectedDocument?.client?.address || '',
              my_company_name: companySettings?.company_name || '',
              my_company_email: companySettings?.company_email || '',
              my_company_phone: companySettings?.company_phone || '',
              due_date: (() => {
                const dueDate = documentType === 'quotation' ? (selectedDocument as Quotation)?.due_date : (selectedDocument as Invoice)?.due_date;
                return dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '';
              })(),
              current_date: new Date().toLocaleDateString('en-GB'),
              quotation_status: documentType === 'quotation' ? (selectedDocument as Quotation)?.status || '' : '',
              invoice_status: documentType === 'invoice' ? (selectedDocument as Invoice)?.status || '' : '',
            }}
            availableVariables={[
              ...(documentType === 'quotation'
                ? [{ key: 'quotation_number', label: 'Quotation Number', value: (selectedDocument as Quotation)?.quotation_number || '' }]
                : [{ key: 'invoice_number', label: 'Invoice Number', value: (selectedDocument as Invoice)?.invoice_number || '' }]
              ),
              { key: 'client_name', label: 'Client Name', value: selectedDocument?.selected_contact?.name || '' },
              { key: 'client_email', label: 'Client Email', value: selectedDocument?.selected_contact?.email || '' },
              { key: 'client_phone', label: 'Client Phone', value: selectedDocument?.selected_contact?.phone || '' },
              { key: 'client_company_name', label: 'Client Company Name', value: selectedDocument?.client?.company_name || '' },
              { key: 'client_address', label: 'Client Address', value: selectedDocument?.client?.address || '' },
              { key: 'my_company_name', label: 'My Company Name', value: companySettings?.company_name || '' },
              { key: 'my_company_email', label: 'My Company Email', value: companySettings?.company_email || '' },
              { key: 'my_company_phone', label: 'My Company Phone', value: companySettings?.company_phone || '' },
              {
                key: 'due_date',
                label: 'Due Date',
                value: (() => {
                  const dueDate = documentType === 'quotation' ? (selectedDocument as Quotation)?.due_date : (selectedDocument as Invoice)?.due_date;
                  return dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '';
                })()
              },
              { key: 'current_date', label: 'Current Date', value: new Date().toLocaleDateString('en-GB') },
              ...(documentType === 'quotation'
                ? [{ key: 'quotation_status', label: 'Quotation Status', value: (selectedDocument as Quotation)?.status || '' }]
                : [{ key: 'invoice_status', label: 'Invoice Status', value: (selectedDocument as Invoice)?.status || '' }]
              ),
            ]}
          />
        )}

        <Card sx={{ bgcolor: 'background.default' }}>
          <CardContent>
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {recipientEmail && subject && body
                  ? '✓ Ready to send'
                  : 'Please fill in all required fields'}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={() => router.back()} disabled={sending}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSend}
                  disabled={sending || !recipientEmail || !subject || !body}
                  size="large"
                >
                  {sending ? <CircularProgress size={20} /> : 'Send Email'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
