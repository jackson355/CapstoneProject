import * as React from 'react';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

export interface ClientsFiltersProps {
  value?: string;
  onChange?: (value: string) => void;
  industry?: string;
  onIndustryChange?: (value: string) => void;
}

export function ClientsFilters({ value = '', onChange, industry = '', onIndustryChange }: ClientsFiltersProps): React.JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
        <OutlinedInput
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          size="small"
          fullWidth
          placeholder="Search clients"
          aria-label="Search clients"
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
            </InputAdornment>
          }
          endAdornment={
            value ? (
              <InputAdornment position="end">
                <Tooltip title="Clear">
                  <IconButton edge="end" onClick={() => onChange?.('')} aria-label="Clear search">
                    <XCircleIcon fontSize="var(--icon-fontSize-md)" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null
          }
          sx={{ maxWidth: 520, borderRadius: 2 }}
        />
        {/* Industry filter */}
        <TextField
          select
          size="small"
          label="Industry"
          value={industry}
          onChange={(e) => onIndustryChange?.(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Information Technology">Information Technology</MenuItem>
          <MenuItem value="Finance">Finance</MenuItem>
          <MenuItem value="Healthcare">Healthcare</MenuItem>
          <MenuItem value="Manufacturing">Manufacturing</MenuItem>
          <MenuItem value="Retail">Retail</MenuItem>
          <MenuItem value="Construction">Construction</MenuItem>
          <MenuItem value="Education">Education</MenuItem>
          <MenuItem value="Hospitality">Hospitality</MenuItem>
          <MenuItem value="Transportation & Logistics">Transportation & Logistics</MenuItem>
          <MenuItem value="Professional Services">Professional Services</MenuItem>
          <MenuItem value="Government">Government</MenuItem>
          <MenuItem value="Non-Profit">Non-Profit</MenuItem>
          <MenuItem value="Energy & Utilities">Energy & Utilities</MenuItem>
          <MenuItem value="Real Estate">Real Estate</MenuItem>
          <MenuItem value="Media & Entertainment">Media & Entertainment</MenuItem>
          <MenuItem value="Others">Others</MenuItem>
        </TextField>
      </Stack>
    </Card>
  );
}