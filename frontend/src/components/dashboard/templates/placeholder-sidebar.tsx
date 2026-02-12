'use client';

import * as React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  DataObject as PlaceholderIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CalendarMonth as CalendarIcon,
  ContactPhone as ContactIcon,
} from '@mui/icons-material';

interface PlaceholderSidebarProps {
  open: boolean;
  onClose: () => void;
  templateId: string | null;
}

interface PlaceholderCategory {
  label: string;
  icon: React.ReactNode;
  placeholders: { name: string; description: string }[];
}

const STANDARD_PLACEHOLDERS: PlaceholderCategory[] = [
  {
    label: 'Client Info',
    icon: <BusinessIcon fontSize="small" />,
    placeholders: [
      { name: 'client_company_name', description: 'Client company name' },
      { name: 'client_uen', description: 'Client UEN number' },
      { name: 'client_industry', description: 'Client industry' },
      { name: 'client_address', description: 'Client address' },
      { name: 'client_postal_code', description: 'Client postal code' },
    ],
  },
  {
    label: 'Contact Person',
    icon: <ContactIcon fontSize="small" />,
    placeholders: [
      { name: 'client_name', description: 'Client contact person name' },
      { name: 'client_phone', description: 'Client contact phone number' },
      { name: 'client_email', description: 'Client contact email address' },
    ],
  },
  {
    label: 'My Company',
    icon: <PersonIcon fontSize="small" />,
    placeholders: [
      { name: 'my_company_name', description: 'Your company name' },
      { name: 'my_company_email', description: 'Your company email' },
      { name: 'my_company_phone', description: 'Your company phone' },
      { name: 'my_company_address', description: 'Your company address' },
      { name: 'my_company_website', description: 'Your company website' },
    ],
  },
  {
    label: 'Document Info',
    icon: <PlaceholderIcon fontSize="small" />,
    placeholders: [
      { name: 'quotation_number', description: 'Quotation reference number' },
      { name: 'quotation_status', description: 'Quotation status (e.g. accepted)' },
      { name: 'invoice_number', description: 'Invoice reference number' },
      { name: 'invoice_status', description: 'Invoice status (e.g. paid)' },
      { name: 'due_date', description: 'Payment due date' },
    ],
  },
  {
    label: 'Dates',
    icon: <CalendarIcon fontSize="small" />,
    placeholders: [
      { name: 'current_date', description: 'Current date (auto-filled)' },
      { name: 'quotation_date', description: 'Quotation date' },
      { name: 'invoice_date', description: 'Invoice date' },
      { name: 'date', description: 'Generic date placeholder' },
    ],
  },
];

const ALL_STANDARD_NAMES = new Set([
  ...STANDARD_PLACEHOLDERS.flatMap((cat) => cat.placeholders.map((p) => p.name)),
  // Backend aliases — contact_* maps to the same data as client_*
  'contact_name',
  'contact_phone',
  'contact_email',
  'client_contact_person',
]);

export function PlaceholderSidebar({ open, onClose, templateId }: PlaceholderSidebarProps): React.JSX.Element | null {
  const [detectedPlaceholders, setDetectedPlaceholders] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedName, setCopiedName] = React.useState<string | null>(null);

  // Fetch detected placeholders when sidebar opens
  React.useEffect(() => {
    if (!open || !templateId) return;

    let cancelled = false;
    const fetchPlaceholders = async () => {
      setLoading(true);
      setError(null);
      try {
        const { authClient } = await import('@/lib/auth/client');
        const result = await authClient.getTemplatePlaceholders(Number(templateId));
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
        } else if (result.data?.placeholders) {
          setDetectedPlaceholders(result.data.placeholders);
        }
      } catch {
        if (!cancelled) setError('Failed to fetch placeholders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPlaceholders();
    return () => { cancelled = true; };
  }, [open, templateId]);

  const handleCopy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(`{{${name}}}`);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 1500);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = `{{${name}}}`;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 1500);
    }
  };

  const detectedSet = new Set(detectedPlaceholders);
  const customPlaceholders = detectedPlaceholders.filter((p) => !ALL_STANDARD_NAMES.has(p));

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 480,
        height: '100vh',
        backgroundColor: 'background.paper',
        boxShadow: 3,
        zIndex: 1300,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <PlaceholderIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Placeholders
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Click copy to get a placeholder, then paste it into your template.
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 1 }}>
        {/* Standard Placeholders */}
        {STANDARD_PLACEHOLDERS.map((category) => (
          <Accordion key={category.label} defaultExpanded disableGutters sx={{ '&:before': { display: 'none' }, boxShadow: 'none' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {category.icon}
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {category.label}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Stack spacing={0.5}>
                {category.placeholders.map((placeholder) => {
                  const isDetected = detectedSet.has(placeholder.name);
                  const isCopied = copiedName === placeholder.name;
                  return (
                    <Stack
                      key={placeholder.name}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        py: 0.75,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      {isDetected && (
                        <Tooltip title="Detected in document">
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        </Tooltip>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 500 }}
                        >
                          {`{{${placeholder.name}}}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {placeholder.description}
                        </Typography>
                      </Box>
                      <Tooltip title={isCopied ? 'Copied!' : 'Copy to clipboard'}>
                        <IconButton size="small" onClick={() => handleCopy(placeholder.name)}>
                          {isCopied ? (
                            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          ) : (
                            <CopyIcon sx={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* Detected in Document section */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Detected in Document
        </Typography>

        {loading && (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!loading && !error && detectedPlaceholders.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No placeholders detected in this template yet.
          </Typography>
        )}

        {!loading && detectedPlaceholders.length > 0 && (
          <Stack spacing={0.5}>
            {detectedPlaceholders.map((name) => {
              const isStandard = ALL_STANDARD_NAMES.has(name);
              const isCopied = copiedName === name;
              return (
                <Stack
                  key={name}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {isStandard ? (
                    <Tooltip title="Standard placeholder - will auto-fill">
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Custom placeholder - won't auto-fill">
                      <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    </Tooltip>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 500 }}
                    >
                      {`{{${name}}}`}
                    </Typography>
                  </Box>
                  {!isStandard && (
                    <Chip label="custom" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                  <Tooltip title={isCopied ? 'Copied!' : 'Copy to clipboard'}>
                    <IconButton size="small" onClick={() => handleCopy(name)}>
                      {isCopied ? (
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      ) : (
                        <CopyIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            })}
          </Stack>
        )}

        {!loading && customPlaceholders.length > 0 && (
          <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
            Custom placeholders won't be auto-filled from client/company data. You'll need to provide values manually when generating documents.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
