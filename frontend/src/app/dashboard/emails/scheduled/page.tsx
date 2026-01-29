'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
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
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { X as CancelIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { format } from 'date-fns';
import { WYSIWYGEmailEditor } from '@/components/dashboard/email/wysiwyg-email-editor';

interface ScheduledEmail {
  id: number;
  recipient_email: string;
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
  quotation_number_snapshot?: string;
  invoice_number_snapshot?: string;
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

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = React.useState<boolean>(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = React.useState<ScheduledEmail | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    recipient_email: '',
    subject: '',
    body: '',
    scheduled_time: '',
    is_recurring: false,
    frequency: 'daily',
    interval: 1,
    end_date: '',
  });

  React.useEffect(() => {
    fetchScheduledEmails();
  }, [page, rowsPerPage, triggerTypeFilter, statusFilter]);

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

  const handleCreateEmail = async (): Promise<void> => {
    try {
      // Convert local datetime to ISO string with timezone
      const localDate = new Date(formData.scheduled_time);
      const isoDateTime = localDate.toISOString();

      const emailData: any = {
        recipient_email: formData.recipient_email,
        subject: formData.subject,
        body: formData.body,
        scheduled_time: isoDateTime,
        is_recurring: formData.is_recurring,
        trigger_type: 'manual',
      };

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
    } catch (error) {
      logger.error('Failed to create scheduled email', error);
      setMessage({ type: 'error', text: 'Failed to create scheduled email' });
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
      recipient_email: '',
      subject: '',
      body: '',
      scheduled_time: '',
      is_recurring: false,
      frequency: 'daily',
      interval: 1,
      end_date: '',
    });
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'success';
      case 'cancelled':
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
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
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
                  <TableCell>Trigger</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No scheduled emails found
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow key={email.id} hover>
                      <TableCell>{getScheduleDisplay(email)}</TableCell>
                      <TableCell>{email.recipient_email}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {email.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={email.trigger_type}
                          color={getTriggerTypeColor(email.trigger_type)}
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
            <TextField
              fullWidth
              label="Recipient Email"
              type="email"
              value={formData.recipient_email}
              onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
              placeholder="client@example.com"
              helperText="Email address of the recipient"
            />

            <WYSIWYGEmailEditor
              subject={formData.subject}
              body={formData.body}
              onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
              onBodyChange={(value) => setFormData({ ...formData, body: value })}
              variables={{}}
              availableVariables={[]}
            />

            <TextField
              fullWidth
              type="datetime-local"
              label="Scheduled Time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="When this email should be sent"
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
                    <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
                      How often to repeat this email
                    </Typography>
                  </FormControl>

                  <TextField
                    fullWidth
                    type="number"
                    label="Interval"
                    value={formData.interval}
                    onChange={(e) =>
                      setFormData({ ...formData, interval: parseInt(e.target.value) })
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
                  helperText="When to stop sending recurring emails (leave empty for no end date)"
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
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
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Recipient:
                </Typography>
                <Typography variant="body1">{selectedEmail.recipient_email}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject:
                </Typography>
                <Typography variant="body1">{selectedEmail.subject}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Schedule:
                </Typography>
                <Typography variant="body1">{getScheduleDisplay(selectedEmail)}</Typography>
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
