'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';

interface QuotationsFiltersProps {
  value: string;
  onChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

export function QuotationsFilters({
  value,
  onChange,
  status,
  onStatusChange,
}: QuotationsFiltersProps): React.JSX.Element {
  return (
    <Card sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <OutlinedInput
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          fullWidth
          placeholder="Search quotations..."
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
            </InputAdornment>
          }
          sx={{ maxWidth: { sm: '400px' } }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => { onStatusChange(e.target.value); }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Card>
  );
}
