'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth/client';
import type { UpdateUserParams } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';
import { config } from '@/config';
import { paths } from '@/paths';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';

// Imports (add InputAdornment, TextField, and icons)
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

interface Role { id: number; name: string; }

export function EditUserForm({ userId }: { userId: string }): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [roleId, setRoleId] = React.useState<number>(3);

  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const fetchData = async () => {
      try {
        const [rolesRes, userRes] = await Promise.all([
          fetch(`${config.api.baseUrl}/roles/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${config.api.baseUrl}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (rolesRes.ok) {
          const rolesData: Role[] = await rolesRes.json();
          setRoles(rolesData);
        }
        if (userRes.ok) {
          const u = await userRes.json();
          setName(u.name || '');
          setEmail(u.email || '');
          setRoleId(u.role_id || 3);
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const isAdmin = user?.role_id === 2;
  const isSuperadmin = user?.role_id === 1;

  const availableRoles = React.useMemo(() => {
    if (isSuperadmin) return roles;
    if (isAdmin) return roles.filter((r) => r.name === 'user' || r.id === 3);
    return [];
  }, [roles, isAdmin, isSuperadmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Admin can only set user role
    if (isAdmin && roleId !== 3) {
      setError('Admins can only assign user role');
      setLoading(false);
      return;
    }

    const payload: UpdateUserParams = { name, email };
    if (password) payload.password = password;
    if (roleId) payload.role_id = roleId;

    const { error } = await authClient.updateUser(userId, payload);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess('User updated successfully');
      setTimeout(() => router.push(paths.dashboard.users), 800);
    }
  };

  if (initialLoading) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading...</Typography>
      </Stack>
    );
  }

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    const { error } = await authClient.deleteUser(userId);
    setDeleteLoading(false);
    if (error) {
      setError(error);
      setDeleteDialogOpen(false);
    } else {
      router.push(paths.dashboard.users);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card
        sx={{
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardHeader
          subheader="Update the details below"
          title="Edit User"
          sx={{
            '& .MuiCardHeader-title': { fontWeight: 600 },
            '& .MuiCardHeader-subheader': { mt: 0.5 },
          }}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Name</InputLabel>
                <OutlinedInput
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter user's full name"
                  startAdornment={
                    <InputAdornment position="start">
                      <PersonOutlineIcon fontSize="small" />
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Email</InputLabel>
                <OutlinedInput
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  startAdornment={
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>New Password (optional)</InputLabel>
                <OutlinedInput
                  type="password"
                  label="New Password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a new password"
                  startAdornment={
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Confirm New Password</InputLabel>
                <OutlinedInput
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  startAdornment={
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              {/* Switch to TextField select to support InputAdornment and menu styling */}
              <TextField
                fullWidth
                select
                label="Role"
                value={roleId}
                onChange={(e) => setRoleId(Number(e.target.value))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShieldOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      elevation: 8,
                      sx: {
                        borderRadius: 2,
                        mt: 0.5,
                        boxShadow: '0 12px 28px rgba(2, 6, 23, 0.12)',
                      },
                    },
                  },
                }}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Stack sx={{ mt: 2 }} spacing={2}>
            {loading && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Updating user...</Typography>
              </Stack>
            )}
            {error && <Alert color="error">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}
          </Stack>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Button color="error" variant="outlined" disabled={loading} onClick={() => setDeleteDialogOpen(true)}>
            Delete
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Save Changes
          </Button>
        </CardActions>
      </Card>
      <Dialog open={deleteDialogOpen} onClose={() => !deleteLoading && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}