'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Link from 'next/link';

import { UsersFilters } from './users-filters';
import { config } from '@/config';
import { paths } from '@/paths';
import { PaginationBar } from '@/components/common/pagination-bar';
import TableSortLabel from '@mui/material/TableSortLabel';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role_id: number;
}

interface PaginatedUsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  per_page: number;
}

export function UsersTable(): React.JSX.Element {
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [roleId, setRoleId] = React.useState<number | null>(null); // NEW

  const fetchUsers = React.useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(rowsPerPage) });
      if (search) params.set('search', search);
      if (roleId !== null) params.set('role_id', String(roleId)); // NEW
      const res = await fetch(`${config.api.baseUrl}/users/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: PaginatedUsersResponse = await res.json();
        setRows(data.users);
        setCount(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, roleId]); // include roleId

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const roleName = (roleId: number) => {
    switch (roleId) {
      case 1:
        return 'superadmin';
      case 2:
        return 'admin';
      case 3:
        return 'user';
      default:
        return String(roleId);
    }
  };

  // Sorting state
  const [orderBy, setOrderBy] = React.useState<'name' | 'email' | 'role_id'>('name');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');

  const handleRequestSort = (property: 'name' | 'email' | 'role_id') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedRows = React.useMemo(() => {
    const data = [...rows];
    data.sort((a, b) => {
      let res = 0;
      switch (orderBy) {
        case 'name':
          res = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
          break;
        case 'email':
          res = (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase());
          break;
        case 'role_id':
          res = (a.role_id ?? 0) - (b.role_id ?? 0);
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
      <UsersFilters
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        roleId={roleId}
        onRoleChange={(v) => { setRoleId(v); setPage(0); }}
      />
      <Card
        sx={{
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '700px' }}>
            <TableHead>
              <TableRow>
                {/* Removed checkbox column header */}
                <TableCell sortDirection={orderBy === 'name' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'email' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'email'}
                    direction={orderBy === 'email' ? order : 'asc'}
                    onClick={() => handleRequestSort('email')}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'role_id' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'role_id'}
                    direction={orderBy === 'role_id' ? order : 'asc'}
                    onClick={() => handleRequestSort('role_id')}
                  >
                    Role
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading users...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{roleName(row.role_id)}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} href={paths.dashboard.editUser(row.id)} size="small">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2">No users found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <Divider />
        {/* Replace TablePagination with the new PaginationBar */}
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