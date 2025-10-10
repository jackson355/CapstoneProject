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
import { PaginationBar } from '@/components/common/pagination-bar';
import TableSortLabel from '@mui/material/TableSortLabel';

import { ClientsFilters } from './clients-filters';
import { config } from '@/config';
import { paths } from '@/paths';

interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface ClientRow {
  id: number;
  company_name: string;
  uen?: string | null;
  industry?: string | null;
  contacts: ContactInfo[];
  address?: string | null;
  postal_code?: string | null;
}

interface PaginatedClientsResponse {
  clients: ClientRow[];
  total: number;
  page: number;
  per_page: number;
}

export function ClientsTable(): React.JSX.Element {
  const [rows, setRows] = React.useState<ClientRow[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [industry, setIndustry] = React.useState<string>(''); // NEW

  // Debounce search to avoid frequent fetches while typing
  const debouncedSearch = useDebounce(search, 300);

  const fetchClients = React.useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(rowsPerPage) });
      if (search) params.set('search', search);
      if (industry) params.set('industry', industry); // NEW
      const res = await fetch(`${config.api.baseUrl}/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: PaginatedClientsResponse = await res.json();
        setRows(data.clients);
        setCount(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, industry]); // include industry

  React.useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Helper function to display primary contact info
  const getPrimaryContact = (contacts: ContactInfo[]) => {
    if (!contacts || contacts.length === 0) return { name: '-', phone: '-', email: '-' };
    return contacts[0];
  };

  // Helper function to display additional contacts count
  const getAdditionalContactsCount = (contacts: ContactInfo[]) => {
    if (!contacts || contacts.length <= 1) return '';
    return ` +${contacts.length - 1} more`;
  };

  // Sorting state
  const [orderBy, setOrderBy] = React.useState<'company_name' | 'uen' | 'industry' | 'postal_code'>('company_name');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');

  const handleRequestSort = (property: 'company_name' | 'uen' | 'industry' | 'postal_code') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedRows = React.useMemo(() => {
    const data = [...rows];
    data.sort((a, b) => {
      const getStr = (v: string | null | undefined) => (v || '').toString().toLowerCase();
      let res = 0;
      switch (orderBy) {
        case 'company_name':
          res = getStr(a.company_name).localeCompare(getStr(b.company_name));
          break;
        case 'uen':
          res = getStr(a.uen).localeCompare(getStr(b.uen));
          break;
        case 'industry':
          res = getStr(a.industry).localeCompare(getStr(b.industry));
          break;
        case 'postal_code':
          res = getStr(a.postal_code).localeCompare(getStr(b.postal_code));
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
      <ClientsFilters
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        industry={industry}
        onIndustryChange={(v) => { setIndustry(v); setPage(0); }}
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
                <TableCell sortDirection={orderBy === 'company_name' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'company_name'}
                    direction={orderBy === 'company_name' ? order : 'asc'}
                    onClick={() => handleRequestSort('company_name')}
                  >
                    Company
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'uen' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'uen'}
                    direction={orderBy === 'uen' ? order : 'asc'}
                    onClick={() => handleRequestSort('uen')}
                  >
                    UEN
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'industry' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'industry'}
                    direction={orderBy === 'industry' ? order : 'asc'}
                    onClick={() => handleRequestSort('industry')}
                  >
                    Industry
                  </TableSortLabel>
                </TableCell>
                <TableCell>Primary Contact</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Skeleton rows during loading
                Array.from({ length: Math.max(5, rowsPerPage) }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={140} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={180} /></TableCell>
                    <TableCell><Skeleton variant="text" width={180} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={60} /></TableCell>
                  </TableRow>
                ))
              ) : sortedRows.length > 0 ? (
                sortedRows.map((row) => {
                  const primaryContact = row.contacts?.[0] || {};
                  return (
                    <TableRow
                      hover
                      key={row.id}
                      sx={{
                        transition: 'background-color 120ms ease',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>{row.company_name}</TableCell>
                      <TableCell>{row.uen || '-'}</TableCell>
                      <TableCell>
                        {row.industry ? <Chip label={row.industry} size="small" variant="outlined" /> : '-'}
                      </TableCell>
                      <TableCell>{primaryContact.name || '-'}</TableCell>
                      <TableCell>{primaryContact.phone || '-'}</TableCell>
                      <TableCell>{primaryContact.email || '-'}</TableCell>
                      <TableCell>{row.address || '-'}</TableCell>
                      <TableCell align="right">
                        <Button component={Link} href={paths.dashboard.editClient(row.id)} size="small">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Stack spacing={1} sx={{ alignItems: 'center', py: 6 }}>
                      <Typography variant="h6">No clients found</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or create a new client.
                      </Typography>
                      <Button component={Link} href={paths.dashboard.createClient} variant="contained" size="small" sx={{ mt: 1 }}>
                        Create Client
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        {/* Replace default TablePagination with the new PaginationBar */}
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
    </>
  );
}

// Debounce helper kept local to avoid extra files and keep performance tidy
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}