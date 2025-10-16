'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningIcon from '@mui/icons-material/Warning';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import { PaginationBar } from '@/components/common/pagination-bar';
import TableSortLabel from '@mui/material/TableSortLabel';

import { InvoicesFilters } from './invoices-filters';
import { config } from '@/config';
import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';

interface ContactInfo {
  name: string;
  phone?: string;
  email: string;
}

export interface InvoiceRow {
  id: number;
  invoice_number: string;
  quotation_id: number;
  client_id: number;
  selected_contact: ContactInfo;
  template_id: number;
  status: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedInvoicesResponse {
  invoices: InvoiceRow[];
  total: number;
  page: number;
  per_page: number;
}

export function InvoicesTable(): React.JSX.Element {
  const [rows, setRows] = React.useState<InvoiceRow[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceRow | null>(null);
  const [clients, setClients] = React.useState<Record<number, any>>({});
  const [quotations, setQuotations] = React.useState<Record<number, any>>({});

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = React.useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = React.useState<InvoiceRow | null>(null);
  const [editStatus, setEditStatus] = React.useState<string>('');
  const [editDueDate, setEditDueDate] = React.useState<string>('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState<boolean>(false);

  // Usage error dialog state
  const [usageErrorDialog, setUsageErrorDialog] = React.useState<{ open: boolean; data: any }>({ open: false, data: null });

  // Debounce search
  const debouncedSearch = useDebounce(search, 300);

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await authClient.getInvoices(page, rowsPerPage, {
        search: debouncedSearch,
        status: status || undefined,
      });

      if (result.data) {
        setRows(result.data.invoices);
        setCount(result.data.total);

        // Fetch client data for all invoices
        const clientIds = [...new Set(result.data.invoices.map((i: InvoiceRow) => i.client_id))] as number[];
        const clientsData: Record<number, any> = {};

        for (const clientId of clientIds) {
          const clientResult = await authClient.getClientById(clientId);
          if (clientResult.data) {
            clientsData[clientId] = clientResult.data;
          }
        }

        setClients(clientsData);

        // Fetch quotation data for all invoices
        const quotationIds = [...new Set(result.data.invoices.map((i: InvoiceRow) => i.quotation_id))] as number[];
        const quotationsData: Record<number, any> = {};

        for (const quotationId of quotationIds) {
          const quotationResult = await authClient.getQuotationById(quotationId);
          if (quotationResult.data) {
            quotationsData[quotationId] = quotationResult.data;
          }
        }

        setQuotations(quotationsData);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, status]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: InvoiceRow) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedInvoice here - let individual handlers clear it when needed
  };

  const handleEditDocument = () => {
    if (selectedInvoice) {
      window.location.href = paths.dashboard.editInvoice(selectedInvoice.id);
    }
    handleMenuClose();
  };

  const handleEditDetails = () => {
    if (selectedInvoice) {
      setEditingInvoice(selectedInvoice);
      setEditStatus(selectedInvoice.status);
      setEditDueDate(selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toISOString().split('T')[0] : '');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleSaveDetails = async () => {
    if (!editingInvoice) {
      console.error('No invoice selected for editing');
      return;
    }

    const updates: any = {
      status: editStatus,
    };

    if (editDueDate) {
      updates.due_date = new Date(editDueDate).toISOString();
    } else {
      updates.due_date = null;
    }

    const result = await authClient.updateInvoice(editingInvoice.id, updates);

    if (!result.error) {
      setEditDialogOpen(false);
      setEditingInvoice(null);
      setEditStatus('');
      setEditDueDate('');
      await fetchInvoices();
    } else {
      console.error('Update error:', result.error);
      alert(result.error);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingInvoice(null);
    setEditStatus('');
    setEditDueDate('');
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;

    const result = await authClient.deleteInvoice(selectedInvoice.id);
    if (!result.error) {
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } else {
      setDeleteDialogOpen(false);
      // Check if it's an error with structured data
      if (typeof result.error === 'object' && result.error !== null && 'message' in result.error) {
        const errorData = result.error as any;
        // Show usage error dialog instead of alert
        setUsageErrorDialog({ open: true, data: errorData });
      } else {
        // For other errors, show an alert
        const errorMessage = typeof result.error === 'object' && result.error !== null
          ? JSON.stringify(result.error)
          : result.error;
        alert(errorMessage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedInvoice(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'unpaid': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Sorting state
  const [orderBy, setOrderBy] = React.useState<'invoice_number' | 'created_at' | 'status'>('created_at');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');

  const handleRequestSort = (property: 'invoice_number' | 'created_at' | 'status') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedRows = React.useMemo(() => {
    const data = [...rows];
    data.sort((a, b) => {
      let res = 0;
      switch (orderBy) {
        case 'invoice_number':
          res = a.invoice_number.localeCompare(b.invoice_number);
          break;
        case 'created_at':
          res = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          res = a.status.localeCompare(b.status);
          break;
        default:
          res = 0;
      }
      return order === 'asc' ? res : -res;
    });
    return data;
  }, [rows, order, orderBy]);

  return (
    <>
      <InvoicesFilters
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(0); }}
      />
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: '1200px' }}>
            <TableHead
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
                '& th': { fontWeight: 600, color: 'text.secondary' },
              }}
            >
              <TableRow>
                <TableCell sortDirection={orderBy === 'invoice_number' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'invoice_number'}
                    direction={orderBy === 'invoice_number' ? order : 'asc'}
                    onClick={() => handleRequestSort('invoice_number')}
                  >
                    Invoice No.
                  </TableSortLabel>
                </TableCell>
                <TableCell>Quotation No.</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell sortDirection={orderBy === 'status' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'created_at' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'created_at'}
                    direction={orderBy === 'created_at' ? order : 'asc'}
                    onClick={() => handleRequestSort('created_at')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: Math.max(5, rowsPerPage) }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={180} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={40} /></TableCell>
                  </TableRow>
                ))
              ) : sortedRows.length > 0 ? (
                sortedRows.map((row) => {
                  const client = clients[row.client_id];
                  const quotation = quotations[row.quotation_id];
                  return (
                    <TableRow
                      hover
                      key={row.id}
                      sx={{
                        transition: 'background-color 120ms ease',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.invoice_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{quotation?.quotation_number || '-'}</TableCell>
                      <TableCell>{client?.company_name || '-'}</TableCell>
                      <TableCell>{row.selected_contact.name}</TableCell>
                      <TableCell>{row.selected_contact.email}</TableCell>
                      <TableCell>{formatDate(row.due_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={getStatusColor(row.status) as any}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Stack spacing={1} sx={{ alignItems: 'center', py: 6 }}>
                      <Typography variant="h6">No invoices found</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or create a new invoice.
                      </Typography>
                      <Button component={Link} href={paths.dashboard.createInvoice} variant="contained" size="small" sx={{ mt: 1 }}>
                        Create Invoice
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <PaginationBar
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newRows) => {
            setRowsPerPage(newRows);
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditDocument}>Edit Document</MenuItem>
        <MenuItem onClick={handleEditDetails}>Edit Details</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>Delete</MenuItem>
      </Menu>

      {/* Edit Details Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Invoice Details</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editStatus}
                label="Status"
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <MenuItem value="unpaid">Unpaid</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty to remove due date"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button onClick={handleSaveDetails} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Delete Invoice
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            Are you sure you want to delete invoice{' '}
            <Typography component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {selectedInvoice?.invoice_number}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDeleteCancel} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ minWidth: 80 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Error Dialog */}
      <Dialog
        open={usageErrorDialog.open}
        onClose={() => setUsageErrorDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon />
          Error Deleting Invoice
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="error" sx={{ mb: 1 }}>
              {usageErrorDialog.data?.message || 'An error occurred while deleting the invoice.'}
            </Alert>

            {usageErrorDialog.data && usageErrorDialog.data.invoice_number && (
              <Typography variant="body2" color="text.secondary">
                <strong>Invoice:</strong> {usageErrorDialog.data.invoice_number}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsageErrorDialog({ open: false, data: null })} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
