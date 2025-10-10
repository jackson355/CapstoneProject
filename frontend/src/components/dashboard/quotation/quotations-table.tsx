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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { PaginationBar } from '@/components/common/pagination-bar';
import TableSortLabel from '@mui/material/TableSortLabel';

import { QuotationsFilters } from './quotations-filters';
import { config } from '@/config';
import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';

interface ContactInfo {
  name: string;
  phone?: string;
  email: string;
}

export interface QuotationRow {
  id: number;
  quotation_number: string;
  client_id: number;
  selected_contact: ContactInfo;
  template_id: number;
  status: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedQuotationsResponse {
  quotations: QuotationRow[];
  total: number;
  page: number;
  per_page: number;
}

export function QuotationsTable(): React.JSX.Element {
  const [rows, setRows] = React.useState<QuotationRow[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedQuotation, setSelectedQuotation] = React.useState<QuotationRow | null>(null);
  const [clients, setClients] = React.useState<Record<number, any>>({});

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = React.useState<boolean>(false);
  const [editingQuotation, setEditingQuotation] = React.useState<QuotationRow | null>(null);
  const [editStatus, setEditStatus] = React.useState<string>('');
  const [editDueDate, setEditDueDate] = React.useState<string>('');

  // Debounce search
  const debouncedSearch = useDebounce(search, 300);

  const fetchQuotations = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await authClient.getQuotations(page, rowsPerPage, {
        search: debouncedSearch,
        status: status || undefined,
      });

      if (result.data) {
        setRows(result.data.quotations);
        setCount(result.data.total);

        // Fetch client data for all quotations
        const clientIds = [...new Set(result.data.quotations.map((q: QuotationRow) => q.client_id))];
        const clientsData: Record<number, any> = {};

        for (const clientId of clientIds) {
          const clientResult = await authClient.getClientById(clientId);
          if (clientResult.data) {
            clientsData[clientId] = clientResult.data;
          }
        }

        setClients(clientsData);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, status]);

  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, quotation: QuotationRow) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuotation(quotation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuotation(null);
  };

  const handleEditDocument = () => {
    if (selectedQuotation) {
      window.location.href = paths.dashboard.editQuotation(selectedQuotation.id);
    }
    handleMenuClose();
  };

  const handleEditDetails = () => {
    if (selectedQuotation) {
      setEditingQuotation(selectedQuotation);
      setEditStatus(selectedQuotation.status);
      setEditDueDate(selectedQuotation.due_date ? new Date(selectedQuotation.due_date).toISOString().split('T')[0] : '');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleSaveDetails = async () => {
    if (!editingQuotation) {
      console.error('No quotation selected for editing');
      return;
    }

    console.log('Saving details:', { status: editStatus, due_date: editDueDate });

    const updates: any = {
      status: editStatus,
    };

    if (editDueDate) {
      updates.due_date = new Date(editDueDate).toISOString();
    } else {
      updates.due_date = null;
    }

    console.log('Sending update:', updates);

    const result = await authClient.updateQuotation(editingQuotation.id, updates);

    console.log('Update result:', result);

    if (!result.error) {
      setEditDialogOpen(false);
      setEditingQuotation(null);
      setEditStatus('');
      setEditDueDate('');
      await fetchQuotations();
    } else {
      console.error('Update error:', result.error);
      alert(result.error);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingQuotation(null);
    setEditStatus('');
    setEditDueDate('');
  };

  const handleDelete = async () => {
    if (!selectedQuotation) return;

    if (confirm(`Are you sure you want to delete quotation ${selectedQuotation.quotation_number}?`)) {
      const result = await authClient.deleteQuotation(selectedQuotation.id);
      if (!result.error) {
        fetchQuotations();
      } else {
        alert(result.error);
      }
    }
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'unpaid': return 'warning';
      default: return 'default';
    }
  };

  const formatAmount = (amount?: number, currency: string = 'SGD') => {
    if (!amount) return '-';
    return `${currency} ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Sorting state
  const [orderBy, setOrderBy] = React.useState<'quotation_number' | 'created_at' | 'status'>('created_at');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');

  const handleRequestSort = (property: 'quotation_number' | 'created_at' | 'status') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedRows = React.useMemo(() => {
    const data = [...rows];
    data.sort((a, b) => {
      let res = 0;
      switch (orderBy) {
        case 'quotation_number':
          res = a.quotation_number.localeCompare(b.quotation_number);
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
      <QuotationsFilters
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(0); }}
      />
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: '1100px' }}>
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
                <TableCell sortDirection={orderBy === 'quotation_number' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'quotation_number'}
                    direction={orderBy === 'quotation_number' ? order : 'asc'}
                    onClick={() => handleRequestSort('quotation_number')}
                  >
                    Quotation No.
                  </TableSortLabel>
                </TableCell>
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
                          {row.quotation_number}
                        </Typography>
                      </TableCell>
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
                  <TableCell colSpan={8} align="center">
                    <Stack spacing={1} sx={{ alignItems: 'center', py: 6 }}>
                      <Typography variant="h6">No quotations found</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or create a new quotation.
                      </Typography>
                      <Button component={Link} href={paths.dashboard.createQuotation} variant="contained" size="small" sx={{ mt: 1 }}>
                        Create Quotation
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
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>
      </Menu>

      {/* Edit Details Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Quotation Details</DialogTitle>
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
