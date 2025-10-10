import * as React from 'react';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

export interface UsersFiltersProps {
  value?: string;
  onChange?: (value: string) => void;
  roleId?: number | null;
  onRoleChange?: (value: number | null) => void;
}

export function UsersFilters({ value = '', onChange, roleId = null, onRoleChange }: UsersFiltersProps): React.JSX.Element {
  const handleClear = (): void => onChange?.('');
  return (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
        <OutlinedInput
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          size="small"
          fullWidth
          placeholder="Search users"
          aria-label="Search users"
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
            </InputAdornment>
          }
          endAdornment={
            value ? (
              <InputAdornment position="end">
                <Tooltip title="Clear">
                  <IconButton edge="end" onClick={handleClear} aria-label="Clear search">
                    <XCircleIcon fontSize="var(--icon-fontSize-md)" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null
          }
          sx={{ maxWidth: 520, borderRadius: 2 }}
        />
        {/* Role filter */}
        <TextField
          select
          size="small"
          label="Role"
          value={roleId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onRoleChange?.(val === '' ? null : Number(val));
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value={1}>Superadmin</MenuItem>
          <MenuItem value={2}>Admin</MenuItem>
          <MenuItem value={3}>User</MenuItem>
        </TextField>
      </Stack>
    </Card>
  );
}