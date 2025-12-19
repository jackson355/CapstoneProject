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
import Skeleton from '@mui/material/Skeleton';
import OutlinedInput from '@mui/material/OutlinedInput';
import { PaginationBar } from '@/components/common/pagination-bar';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Download as DownloadIcon } from '@phosphor-icons/react/dist/ssr/Download';
import InputAdornment from '@mui/material/InputAdornment';
import TableSortLabel from '@mui/material/TableSortLabel';

import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';
import { paths } from '@/paths';

export interface PartnerRow {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number?: string | null;
  email_address?: string | null;
  contract_file_name?: string | null;
  contract_file_size?: number | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedPartnersResponse {
  partners: PartnerRow[];
  total: number;
  page: number;
  per_page: number;
}

export function PartnersTable(): React.JSX.Element {
  const [rows, setRows] = React.useState<PartnerRow[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  // Sorting state
  const [orderBy, setOrderBy] = React.useState<'company_name' | 'contact_person_name' | 'email_address'>('company_name');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');

  // Debounce search
  const debouncedSearch = useDebounce(search, 300);

  const fetchPartners = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await authClient.getPartners(page, rowsPerPage, search);
      if (result.data) {
        setRows(result.data.partners || []);
        setCount(result.data.total || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch partners', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  React.useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleRequestSort = (property: 'company_name' | 'contact_person_name' | 'email_address') => {
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
        case 'contact_person_name':
          res = getStr(a.contact_person_name).localeCompare(getStr(b.contact_person_name));
          break;
        case 'email_address':
          res = getStr(a.email_address).localeCompare(getStr(b.email_address));
          break;
        default:
          res = 0;
      }
      return order === 'asc' ? res : -res;
    });
    return data;
  }, [rows, order, orderBy]);

  const handleDownloadContract = async (partnerId: number, partnerName: string) => {
    try {
      const result = await authClient.downloadPartnerContract(partnerId);
      if (result.error) {
        logger.error('Failed to download contract', result.error);
        alert(result.error);
      } else if (result.blob && result.filename) {
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error('Failed to download contract', error);
    }
  };

  return (
    <>
      {/* Search Filter */}
      <Card sx={{ p: 2 }}>
        <OutlinedInput
          fullWidth
          placeholder="Search partners..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon fontSize="var(--icon-fontSize-md)" />
            </InputAdornment>
          }
        />
      </Card>

      {/* Table */}
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: '900px' }}>
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
                    Company Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'contact_person_name' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'contact_person_name'}
                    direction={orderBy === 'contact_person_name' ? order : 'asc'}
                    onClick={() => handleRequestSort('contact_person_name')}
                  >
                    Contact Person
                  </TableSortLabel>
                </TableCell>
                <TableCell>Phone</TableCell>
                <TableCell sortDirection={orderBy === 'email_address' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'email_address'}
                    direction={orderBy === 'email_address' ? order : 'asc'}
                    onClick={() => handleRequestSort('email_address')}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
                <TableCell>Contract</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: rowsPerPage }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={180} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={60} /></TableCell>
                  </TableRow>
                ))
              ) : sortedRows.length > 0 ? (
                sortedRows.map((row) => (
                  <TableRow
                    hover
                    key={row.id}
                    sx={{
                      transition: 'background-color 120ms ease',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <TableCell>{row.company_name}</TableCell>
                    <TableCell>{row.contact_person_name}</TableCell>
                    <TableCell>{row.phone_number || '-'}</TableCell>
                    <TableCell>{row.email_address || '-'}</TableCell>
                    <TableCell>
                      {row.contract_file_name ? (
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadContract(row.id, row.company_name)}
                        >
                          {row.contract_file_name}
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button component={Link} href={paths.dashboard.editPartner(row.id)} size="small">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Stack spacing={1} sx={{ alignItems: 'center', py: 6 }}>
                      <Typography variant="h6">No partners found</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or create a new partner.
                      </Typography>
                      <Button component={Link} href={paths.dashboard.createPartner} variant="contained" size="small" sx={{ mt: 1 }}>
                        Create Partner
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
    </>
  );
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
