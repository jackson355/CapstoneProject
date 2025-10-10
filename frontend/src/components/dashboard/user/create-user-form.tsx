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
import { User } from '@phosphor-icons/react/dist/ssr/User';
import { Envelope } from '@phosphor-icons/react/dist/ssr/Envelope';
import { Lock } from '@phosphor-icons/react/dist/ssr/Lock';
import { Shield } from '@phosphor-icons/react/dist/ssr/Shield';

import { useUser } from '@/hooks/use-user';
import { authClient } from '@/lib/auth/client';
import type { CreateUserParams } from '@/lib/auth/client';
import { config } from '@/config';
import { paths } from '@/paths';

interface Role {
  id: number;
  name: string;
}

// Imports (add InputAdornment, TextField, and icons)
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

export function CreateUserForm(): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [roleId, setRoleId] = React.useState<number>(3);

  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Fetch available roles (requires admin/superadmin)
    const fetchRoles = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return;
      try {
        const res = await fetch(`${config.api.baseUrl}/roles/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: Role[] = await res.json();
          setRoles(data);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchRoles();
  }, []);

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

    // Client-side check for matching passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Enforce admin limitation: can only create user role
    if (isAdmin && roleId !== 3) {
      setError('Admins can only create user accounts');
      setLoading(false);
      return;
    }

    const payload: CreateUserParams = { name, email, password, role_id: roleId };
    const { error } = await authClient.createUser(payload);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess('User created successfully');
      // Navigate back to users list after short delay
      setTimeout(() => router.push(paths.dashboard.users), 800);
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
          subheader="Fill in the details to create a new user account"
          title="New User"
          sx={{
            '& .MuiCardHeader-title': { fontWeight: 600 },
            '& .MuiCardHeader-subheader': { mt: 0.5 },
          }}
        />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Full Name</InputLabel>
                <OutlinedInput
                  label="Full Name"
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
                <InputLabel>Email Address</InputLabel>
                <OutlinedInput
                  type="email"
                  label="Email Address"
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
              <FormControl fullWidth required>
                <InputLabel>Password</InputLabel>
                <OutlinedInput
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  startAdornment={
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Confirm Password</InputLabel>
                <OutlinedInput
                  type="password"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter the password"
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
          <Stack sx={{ mt: 3 }} spacing={2}>
            {loading && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Creating user...</Typography>
              </Stack>
            )}
            {error && <Alert color="error">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}
          </Stack>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button type="submit" variant="contained" disabled={loading} size="large">
            Create User
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}