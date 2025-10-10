'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface PaginationBarProps {
  count: number;
  page: number; // zero-based
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange?: (newRowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
}

function getPages(current1Based: number, total: number): (number | 'ellipsis')[] {
  const delta = 1;
  const range: number[] = [];
  const rangeWithDots: (number | 'ellipsis')[] = [];
  let prev: number | undefined;

  if (total <= 1) return [1];

  range.push(1);
  for (let i = current1Based - delta; i <= current1Based + delta; i++) {
    if (i > 1 && i < total) range.push(i);
  }
  range.push(total);

  for (const n of range) {
    if (prev !== undefined) {
      if (n - prev === 2) {
        rangeWithDots.push(prev + 1);
      } else if (n - prev > 2) {
        rangeWithDots.push('ellipsis');
      }
    }
    rangeWithDots.push(n);
    prev = n;
  }
  return rangeWithDots;
}

export function PaginationBar({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25],
}: PaginationBarProps): React.JSX.Element {
  const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));
  const current1Based = Math.min(totalPages, page + 1);
  const pages = getPages(current1Based, totalPages);

  const handlePrev = () => {
    if (page > 0) onPageChange(page - 1);
  };
  const handleNext = () => {
    if (page < totalPages - 1) onPageChange(page + 1);
  };

  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}
      spacing={2}
    >
      <Button
        size="small"
        variant="outlined"
        startIcon={<ArrowBackIcon fontSize="small" />}
        onClick={handlePrev}
        disabled={page === 0}
      >
        Previous
      </Button>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <Typography key={`dots-${idx}`} variant="body2" color="text.secondary">
              …
            </Typography>
          ) : (
            <Button
              key={p}
              size="small"
              variant={p === current1Based ? 'contained' : 'text'}
              color={p === current1Based ? 'primary' : 'inherit'}
              onClick={() => onPageChange(p - 1)}
              sx={{
                minWidth: 32,
                px: 1,
                borderRadius: 999,
                ...(p !== current1Based && { '&:hover': { backgroundColor: 'action.hover' } }),
              }}
            >
              {p}
            </Button>
          )
        )}
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">Rows per page</Typography>
        <Select
          size="small"
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
          sx={{ minWidth: 80 }}
        >
          {rowsPerPageOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
        <Button
          size="small"
          variant="outlined"
          endIcon={<ArrowForwardIcon fontSize="small" />}
          onClick={handleNext}
          disabled={page >= totalPages - 1}
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
}