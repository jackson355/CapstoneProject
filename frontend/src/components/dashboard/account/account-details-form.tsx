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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';

import { useUser } from '@/hooks/use-user';
import { authClient } from '@/lib/auth/client';
import type { UpdateUserParams } from '@/lib/auth/client';

const states = [
  { value: 'alabama', label: 'Alabama' },
  { value: 'new-york', label: 'New York' },
  { value: 'san-francisco', label: 'San Francisco' },
  { value: 'los-angeles', label: 'Los Angeles' },
] as const;

export function AccountDetailsForm(): React.JSX.Element {
  const { user, checkSession } = useUser();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!user?.id) {
      setError('User not found');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const updateData: UpdateUserParams = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };

    setIsLoading(true);
    try {
      const { error } = await authClient.updateUser(user.id, updateData);
      if (error) {
        setError(error);
      } else {
        setSuccess(true);
        // Refresh user data
        await checkSession?.();
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, checkSession]);

  if (!user) {
    return (
      <Card>
        <CardContent>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader subheader="The information can be edited" title="Profile" />
        <Divider />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof error === "string" ? error : JSON.stringify(error)}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Profile updated successfully!
            </Alert>
          )}
          <Grid container spacing={3}>
            <Grid
              size={{
                md: 6,
                xs: 12,
              }}
            >
              <FormControl fullWidth required>
                <InputLabel>Name</InputLabel>
                <OutlinedInput 
                  defaultValue={user.name || ''} 
                  label="name" 
                  name="name" 
                />
              </FormControl>
            </Grid>
            <Grid
              size={{
                md: 6,
                xs: 12,
              }}
            >
              <FormControl fullWidth required>
                <InputLabel>Email address</InputLabel>
                <OutlinedInput
                  defaultValue={user.email || ''}
                  label="Email address"
                  name="email"
                  type="email"
                />
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={() => { setResetOpen(true); setResetError(null); }}
            disabled={isLoading}
          >
            Reset password
          </Button>
          <Button 
            variant="contained" 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Save details'}
          </Button>
        </CardActions>
      </Card>

      <Dialog open={resetOpen} onClose={() => { setResetOpen(false); setResetError(null); }}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {resetError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {resetError}
            </Alert>
          )}
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel htmlFor="current-password">Current Password</InputLabel>
            <OutlinedInput
              id="current-password"
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); if (resetError) setResetError(null); }}
              label="Current Password"
              endAdornment={
                <InputAdornment position="end">
                  <Button size="small" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel htmlFor="new-password">New Password</InputLabel>
            <OutlinedInput
              id="new-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); if (resetError) setResetError(null); }}
              label="New Password"
              endAdornment={
                <InputAdornment position="end">
                  <Button size="small" onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </Button>
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel htmlFor="confirm-password">Confirm New Password</InputLabel>
            <OutlinedInput
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (resetError) setResetError(null); }}
              label="Confirm New Password"
              endAdornment={
                <InputAdornment position="end">
                  <Button size="small" onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </Button>
                </InputAdornment>
              }
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setResetOpen(false); setResetError(null); }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={isLoading}
            onClick={async () => {
              setResetError(null);
              if (!user?.id) {
                setResetError('User not found');
                return;
              }
              if (!currentPassword || !newPassword || !confirmPassword) {
                setResetError('All password fields are required');
                return;
              }
              if (newPassword !== confirmPassword) {
                setResetError('Passwords do not match');
                return;
              }
              setIsLoading(true);
              try {
                const { error } = await authClient.changePassword({ current_password: currentPassword, new_password: newPassword });
                if (error) {
                  setResetError(error);
                } else {
                  setSuccess(true);
                  setResetOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setResetError(null);
                }
              } catch (err) {
                setResetError('Network error occurred');
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}
