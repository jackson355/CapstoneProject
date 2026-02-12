'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Eye as PreviewIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EnvelopeSimple as EmailIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { format } from 'date-fns';
import { WYSIWYGEmailEditor } from '@/components/dashboard/email/wysiwyg-email-editor';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

const AVAILABLE_VARIABLES = [
  '{{quotation_number}}',
  '{{invoice_number}}',
  '{{client_name}}',
  '{{client_email}}',
  '{{client_phone}}',
  '{{client_company_name}}',
  '{{client_address}}',
  '{{my_company_name}}',
  '{{my_company_email}}',
  '{{my_company_phone}}',
  '{{due_date}}',
  '{{current_date}}',
  '{{quotation_status}}',
  '{{invoice_status}}',
];

export default function EmailTemplatesPage(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter
  const [templateTypeFilter, setTemplateTypeFilter] = React.useState<string>('all');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = React.useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState<boolean>(false);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<EmailTemplate | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    subject: '',
    body: '',
    template_type: 'quotation' as 'quotation' | 'invoice' | 'general',
  });

  React.useEffect(() => {
    fetchTemplates();
  }, [templateTypeFilter]);

  const fetchTemplates = async (): Promise<void> => {
    try {
      setLoading(true);
      const params: any = {};

      if (templateTypeFilter !== 'all') {
        params.template_type = templateTypeFilter;
      }

      const response = await authClient.getEmailTemplates(params);
      if (response.data) {
        setTemplates(response.data || []);
      }
    } catch (error) {
      logger.error('Failed to fetch email templates', error);
      setMessage({ type: 'error', text: 'Failed to load email templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    try {
      await authClient.createEmailTemplate({
        ...formData,
        variables: extractVariables(formData.subject + ' ' + formData.body),
      });
      setMessage({ type: 'success', text: 'Template created successfully!' });
      setCreateDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      logger.error('Failed to create template', error);
      setMessage({ type: 'error', text: 'Failed to create template' });
    }
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selectedTemplate) return;

    try {
      await authClient.updateEmailTemplate(selectedTemplate.id, {
        ...formData,
        variables: extractVariables(formData.subject + ' ' + formData.body),
      });
      setMessage({ type: 'success', text: 'Template updated successfully!' });
      setEditDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      logger.error('Failed to update template', error);
      setMessage({ type: 'error', text: 'Failed to update template' });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedTemplate) return;

    try {
      await authClient.deleteEmailTemplate(selectedTemplate.id);
      setMessage({ type: 'success', text: 'Template deleted successfully!' });
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      logger.error('Failed to delete template', error);
      setMessage({ type: 'error', text: 'Failed to delete template' });
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = text.match(regex);
    return matches ? Array.from(new Set(matches)) : [];
  };

  const resetForm = (): void => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      template_type: 'quotation',
    });
    setSelectedTemplate(null);
  };

  const openEditDialog = (template: EmailTemplate): void => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      template_type: template.template_type as 'quotation' | 'invoice' | 'general',
    });
    setEditDialogOpen(true);
  };

  const insertVariable = (variable: string): void => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + ' ' + variable,
    }));
  };

  const filteredTemplates =
    templateTypeFilter === 'all'
      ? templates
      : templates.filter((t) => t.template_type === templateTypeFilter);

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h4">Email Templates</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Manage email templates with dynamic variables
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Template
          </Button>
        </Stack>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ p: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Template Type</InputLabel>
            <Select
              value={templateTypeFilter}
              label="Template Type"
              onChange={(e) => setTemplateTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="quotation">Quotation</MenuItem>
              <MenuItem value="invoice">Invoice</MenuItem>
              <MenuItem value="general">General</MenuItem>
            </Select>
          </FormControl>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)'
            },
            gap: 3
          }}
        >
          {loading ? (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography align="center">Loading templates...</Typography>
            </Box>
          ) : filteredTemplates.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Card sx={{ p: 4, textAlign: 'center' }}>
                <EmailIcon size={48} style={{ margin: '0 auto' }} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  No templates found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your first email template to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PlusIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Template
                </Button>
              </Card>
            </Box>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6" noWrap>
                      {template.name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label={template.template_type} size="small" color="secondary" />
                      <Chip label={`${template.variables.length} vars`} size="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Subject: {template.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created: {format(new Date(template.created_at), 'MMM d, yyyy')}
                    </Typography>
                  </Stack>
                </CardContent>
                <Divider />
                <CardActions>
                  <Tooltip title="Preview">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setPreviewDialogOpen(true);
                      }}
                    >
                      <PreviewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEditDialog(template)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            ))
          )}
        </Box>
      </Stack>

      {/* Create Template Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Email Template</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Quotation Follow-up"
              helperText="Give your template a descriptive name for easy identification"
            />

            <FormControl fullWidth>
              <InputLabel>Template Type</InputLabel>
              <Select
                value={formData.template_type}
                label="Template Type"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template_type: e.target.value as 'quotation' | 'invoice' | 'general',
                  })
                }
              >
                <MenuItem value="quotation">Quotation</MenuItem>
                <MenuItem value="invoice">Invoice</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
              <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
                Select the type of emails this template will be used for
              </Typography>
            </FormControl>

            <WYSIWYGEmailEditor
              subject={formData.subject}
              body={formData.body}
              onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
              onBodyChange={(value) => setFormData({ ...formData, body: value })}
              variables={{}}
              availableVariables={AVAILABLE_VARIABLES.map(v => ({
                key: v.replace(/{{|}}/g, ''),
                label: v.replace(/{{|}}/g, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                value: v
              }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.name || !formData.subject || !formData.body}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Email Template</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Give your template a descriptive name for easy identification"
            />

            <FormControl fullWidth>
              <InputLabel>Template Type</InputLabel>
              <Select
                value={formData.template_type}
                label="Template Type"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template_type: e.target.value as 'quotation' | 'invoice' | 'general',
                  })
                }
              >
                <MenuItem value="quotation">Quotation</MenuItem>
                <MenuItem value="invoice">Invoice</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
              <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
                Select the type of emails this template will be used for
              </Typography>
            </FormControl>

            <WYSIWYGEmailEditor
              subject={formData.subject}
              body={formData.body}
              onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
              onBodyChange={(value) => setFormData({ ...formData, body: value })}
              variables={{}}
              availableVariables={AVAILABLE_VARIABLES.map(v => ({
                key: v.replace(/{{|}}/g, ''),
                label: v.replace(/{{|}}/g, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                value: v
              }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Template Preview</DialogTitle>
        <Divider />
        <DialogContent>
          {selectedTemplate && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Name:
                </Typography>
                <Typography variant="body1">{selectedTemplate.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Type:
                </Typography>
                <Chip label={selectedTemplate.template_type} size="small" color="secondary" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject:
                </Typography>
                <Typography variant="body1">{selectedTemplate.subject}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Variables Used ({selectedTemplate.variables.length}):
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {selectedTemplate.variables.map((variable) => (
                    <Chip key={variable} label={variable} size="small" />
                  ))}
                </Stack>
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
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedTemplate.body}
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <Divider />
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template &quot;{selectedTemplate?.name}&quot;? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
