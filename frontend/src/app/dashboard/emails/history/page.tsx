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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { ArrowCounterClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { format } from 'date-fns';

interface EmailHistory {
  id: number;
  recipient_email: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string;
  error_message?: string;
  document_number?: string;
  document_type?: string;
}

export default function EmailHistoryPage(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [emails, setEmails] = React.useState<EmailHistory[]>([]);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = React.useState<string>('all');

  // Debounce search to avoid frequent fetches while typing
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Dialog
  const [selectedEmail, setSelectedEmail] = React.useState<EmailHistory | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    fetchEmails();
  }, [page, rowsPerPage, statusFilter, documentTypeFilter, debouncedSearch]);

  const fetchEmails = async (): Promise<void> => {
    try {
      setLoading(true);
      const params: any = {
        page: page,
        per_page: rowsPerPage,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (documentTypeFilter !== 'all') {
        params.document_type = documentTypeFilter;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await authClient.getEmailHistory(params);
      if (response.data) {
        setEmails(response.data.emails || []);
        setTotalCount(response.data.total || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch email history', error);
      setMessage({ type: 'error', text: 'Failed to load email history' });
    } finally {
      setLoading(false);
    }
  };


  const handleViewEmail = (email: EmailHistory): void => {
    setSelectedEmail(email);
    setDialogOpen(true);
  };

  const handleResendEmail = async (email: EmailHistory): Promise<void> => {
    try {
      setMessage(null);
      await authClient.sendEmail({
        recipient_email: email.recipient_email,
        subject: email.subject,
        body: email.body,
      });
      setMessage({ type: 'success', text: 'Email resent successfully!' });
      fetchEmails();
    } catch (error) {
      logger.error('Failed to resend email', error);
      setMessage({ type: 'error', text: 'Failed to resend email' });
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getDocumentNumber = (email: EmailHistory): string => {
    return email.document_number || 'N/A';
  };

  const getDocumentType = (email: EmailHistory): string => {
    if (email.document_type === 'quotation') return 'Quotation';
    if (email.document_type === 'invoice') return 'Invoice';
    return 'General';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Email History</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            View all sent emails with complete audit trail
          </Typography>
        </div>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search by recipient..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={documentTypeFilter}
                label="Document Type"
                onChange={(e) => { setDocumentTypeFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="quotation">Quotation</MenuItem>
                <MenuItem value="invoice">Invoice</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Document</TableCell>
                  <TableCell>Type</TableCell>
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
                      No emails found
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow key={email.id} hover>
                      <TableCell>
                        {email.sent_at ? format(new Date(email.sent_at), 'MMM d, yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell>{email.recipient_email}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {email.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>{getDocumentNumber(email)}</TableCell>
                      <TableCell>{getDocumentType(email)}</TableCell>
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
                            <IconButton size="small" onClick={() => handleViewEmail(email)}>
                              <EyeIcon />
                            </IconButton>
                          </Tooltip>
                          {email.status === 'failed' && (
                            <Tooltip title="Resend Email">
                              <IconButton size="small" onClick={() => handleResendEmail(email)}>
                                <RefreshIcon />
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

      {/* View Email Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Email Details</DialogTitle>
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
                  Document:
                </Typography>
                <Typography variant="body1">
                  {getDocumentNumber(selectedEmail)} ({getDocumentType(selectedEmail)})
                </Typography>
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
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Sent At:
                </Typography>
                <Typography variant="body1">
                  {selectedEmail.sent_at ? format(new Date(selectedEmail.sent_at), 'PPpp') : 'N/A'}
                </Typography>
              </Box>
              {selectedEmail.error_message && (
                <Box>
                  <Typography variant="subtitle2" color="error">
                    Error Message:
                  </Typography>
                  <Typography variant="body2" color="error">
                    {selectedEmail.error_message}
                  </Typography>
                </Box>
              )}
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
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Debounce helper to avoid frequent fetches while typing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
