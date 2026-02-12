'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import { CaretDown as ExpandIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { WYSIWYGEmailEditor } from '@/components/dashboard/email/wysiwyg-email-editor';

interface AutomationTemplate {
  id?: number;
  trigger_type: string;
  trigger_event: string;
  subject: string;
  body: string;
  is_enabled: boolean;
}

const defaultTemplates: Record<string, AutomationTemplate> = {
  quotation_accepted: {
    trigger_type: 'status_change',
    trigger_event: 'quotation_accepted',
    subject: 'Quotation {{quotation_number}} Accepted',
    body: `<html>
<body>
  <p>Dear {{client_name}},</p>
  <p>Thank you! Your quotation <strong>{{quotation_number}}</strong> has been accepted.</p>
  <p>We will proceed with the next steps shortly.</p>
  <br>
  <p>Best regards,<br>{{my_company_name}}</p>
</body>
</html>`,
    is_enabled: true,
  },
  quotation_rejected: {
    trigger_type: 'status_change',
    trigger_event: 'quotation_rejected',
    subject: 'Quotation {{quotation_number}} Status Update',
    body: `<html>
<body>
  <p>Dear {{client_name}},</p>
  <p>Your quotation <strong>{{quotation_number}}</strong> has been marked as rejected.</p>
  <p>Please contact us if you have any questions.</p>
  <br>
  <p>Best regards,<br>{{my_company_name}}</p>
</body>
</html>`,
    is_enabled: true,
  },
  invoice_paid: {
    trigger_type: 'status_change',
    trigger_event: 'invoice_paid',
    subject: 'Payment Received: Invoice {{invoice_number}}',
    body: `<html>
<body>
  <p>Dear {{client_name}},</p>
  <p>Thank you! We have received your payment for invoice <strong>{{invoice_number}}</strong>.</p>
  <p>Your payment has been processed successfully.</p>
  <br>
  <p>Best regards,<br>{{my_company_name}}</p>
</body>
</html>`,
    is_enabled: true,
  },
  quotation_deadline: {
    trigger_type: 'deadline',
    trigger_event: 'quotation_deadline',
    subject: 'Reminder: Quotation {{quotation_number}} Due Soon',
    body: `<html>
<body>
  <p>Dear {{client_name}},</p>
  <p>This is a friendly reminder that your quotation <strong>{{quotation_number}}</strong> is due soon.</p>
  <p><strong>Due Date:</strong> {{due_date}}</p>
  <p>Please review and respond at your earliest convenience.</p>
  <br>
  <p>Best regards,<br>{{my_company_name}}</p>
</body>
</html>`,
    is_enabled: true,
  },
  invoice_deadline: {
    trigger_type: 'deadline',
    trigger_event: 'invoice_deadline',
    subject: 'Payment Reminder: Invoice {{invoice_number}} Due Soon',
    body: `<html>
<body>
  <p>Dear {{client_name}},</p>
  <p>This is a reminder that your invoice <strong>{{invoice_number}}</strong> payment is due soon.</p>
  <p><strong>Due Date:</strong> {{due_date}}</p>
  <p>Please arrange payment at your earliest convenience.</p>
  <br>
  <p>Best regards,<br>{{my_company_name}}</p>
</body>
</html>`,
    is_enabled: true,
  },
};

export default function EmailAutomationPage(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tabValue, setTabValue] = React.useState<number>(0);

  const [templates, setTemplates] = React.useState<Record<string, AutomationTemplate>>(defaultTemplates);

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await authClient.getAutomationTemplates();
      if (response.data && response.data.templates && response.data.templates.length > 0) {
        const templatesMap: Record<string, AutomationTemplate> = {};
        response.data.templates.forEach((template: AutomationTemplate) => {
          templatesMap[template.trigger_event] = template;
        });
        setTemplates({ ...defaultTemplates, ...templatesMap });
      }
    } catch (error) {
      logger.error('Failed to fetch automation templates', error);
      setMessage({ type: 'error', text: 'Failed to load automation templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setMessage(null);

      const templatesArray = Object.values(templates);
      const response = await authClient.saveAutomationTemplates(templatesArray);

      if (response.error) {
        setMessage({ type: 'error', text: response.error });
      } else {
        setMessage({ type: 'success', text: 'Automation templates saved successfully!' });
        fetchTemplates();
      }
    } catch (error) {
      logger.error('Failed to save automation templates', error);
      setMessage({ type: 'error', text: 'Failed to save automation templates' });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (key: string, field: string, value: any): void => {
    setTemplates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const getAvailableVariables = (triggerEvent: string): string[] => {
    if (triggerEvent.startsWith('quotation')) {
      return ['{{quotation_number}}', '{{client_name}}', '{{due_date}}', '{{my_company_name}}'];
    } else if (triggerEvent.startsWith('invoice')) {
      return ['{{invoice_number}}', '{{client_name}}', '{{due_date}}', '{{my_company_name}}'];
    }
    return ['{{client_name}}', '{{my_company_name}}'];
  };

  const renderTemplateEditor = (key: string, title: string, description: string) => {
    const template = templates[key];
    if (!template) return null;

    return (
      <Accordion key={key} defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandIcon size={20} />}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <WYSIWYGEmailEditor
              subject={template.subject}
              body={template.body}
              onSubjectChange={(value) => handleTemplateChange(key, 'subject', value)}
              onBodyChange={(value) => handleTemplateChange(key, 'body', value)}
              variables={{}}
              availableVariables={getAvailableVariables(key).map(v => ({
                key: v.replace(/{{|}}/g, ''),
                label: v.replace(/{{|}}/g, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                value: v
              }))}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Email Automation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure automated emails that are sent when events occur
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card>
          <CardHeader
            title="Automation Templates"
            subheader="Set up email templates for automatic notifications"
          />
          <Divider />
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Status Change Emails" sx={{ px: 3, py: 2, minHeight: 64 }} />
              <Tab label="Deadline Reminders" sx={{ px: 3, py: 2, minHeight: 64 }} />
            </Tabs>
          </Box>
          <CardContent>
            {tabValue === 0 && (
              <Stack spacing={2}>
                <Alert severity="info">
                  These emails are sent automatically when document status changes
                </Alert>
                {renderTemplateEditor(
                  'quotation_accepted',
                  'Quotation Accepted',
                  'Sent when a quotation is marked as accepted'
                )}
                {renderTemplateEditor(
                  'quotation_rejected',
                  'Quotation Rejected',
                  'Sent when a quotation is marked as rejected'
                )}
                {renderTemplateEditor(
                  'invoice_paid',
                  'Invoice Paid',
                  'Sent when an invoice is marked as paid'
                )}
              </Stack>
            )}

            {tabValue === 1 && (
              <Stack spacing={2}>
                <Alert severity="info">
                  These emails are sent automatically when deadlines are approaching (7 days before due date)
                </Alert>

                {/* Quotation Deadline Reminder */}
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          Quotation Deadline Reminder
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sent 7 days before quotation due date
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={templates['quotation_deadline']?.is_enabled ?? true}
                            onChange={(e) => handleTemplateChange('quotation_deadline', 'is_enabled', e.target.checked)}
                            color="primary"
                          />
                        }
                        label={templates['quotation_deadline']?.is_enabled ? 'Enabled' : 'Disabled'}
                        labelPlacement="start"
                      />
                    </Stack>
                    {templates['quotation_deadline']?.is_enabled && (
                      <WYSIWYGEmailEditor
                        subject={templates['quotation_deadline']?.subject || ''}
                        body={templates['quotation_deadline']?.body || ''}
                        onSubjectChange={(value) => handleTemplateChange('quotation_deadline', 'subject', value)}
                        onBodyChange={(value) => handleTemplateChange('quotation_deadline', 'body', value)}
                        variables={{}}
                        availableVariables={getAvailableVariables('quotation_deadline').map(v => ({
                          key: v.replace(/{{|}}/g, ''),
                          label: v.replace(/{{|}}/g, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                          value: v
                        }))}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Invoice Deadline Reminder */}
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          Invoice Payment Reminder
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sent 7 days before invoice payment due date
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={templates['invoice_deadline']?.is_enabled ?? true}
                            onChange={(e) => handleTemplateChange('invoice_deadline', 'is_enabled', e.target.checked)}
                            color="primary"
                          />
                        }
                        label={templates['invoice_deadline']?.is_enabled ? 'Enabled' : 'Disabled'}
                        labelPlacement="start"
                      />
                    </Stack>
                    {templates['invoice_deadline']?.is_enabled && (
                      <WYSIWYGEmailEditor
                        subject={templates['invoice_deadline']?.subject || ''}
                        body={templates['invoice_deadline']?.body || ''}
                        onSubjectChange={(value) => handleTemplateChange('invoice_deadline', 'subject', value)}
                        onBodyChange={(value) => handleTemplateChange('invoice_deadline', 'body', value)}
                        variables={{}}
                        availableVariables={getAvailableVariables('invoice_deadline').map(v => ({
                          key: v.replace(/{{|}}/g, ''),
                          label: v.replace(/{{|}}/g, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                          value: v
                        }))}
                      />
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.default' }}>
          <CardContent>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button variant="outlined" onClick={fetchTemplates} disabled={saving}>
                Reset Changes
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving} size="large">
                {saving ? <CircularProgress size={20} /> : 'Save All Templates'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
