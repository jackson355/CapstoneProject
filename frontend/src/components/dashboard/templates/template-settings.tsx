'use client';

import * as React from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material';

interface TemplateSettingsProps {
  templateName: string;
  templateDescription: string;
  templateType: string;
  templateStatus: string;
  isAiEnhanced: boolean;
  onTemplateNameChange: (name: string) => void;
  onTemplateDescriptionChange: (description: string) => void;
  onTemplateTypeChange: (type: string) => void;
}

export function TemplateSettings({
  templateName,
  templateDescription,
  templateType,
  templateStatus,
  isAiEnhanced,
  onTemplateNameChange,
  onTemplateDescriptionChange,
  onTemplateTypeChange,
}: TemplateSettingsProps): React.JSX.Element {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'saved': return 'success';
      case 'unsaved': return 'warning';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Template Settings Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Template Settings
        </Typography>
      </Stack>

      <Stack spacing={3}>
        {/* Template Name */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Template Name
          </Typography>
          <TextField
            fullWidth
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="Enter template name"
            size="small"
          />
        </Box>

        {/* Description */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Description
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={templateDescription}
            onChange={(e) => onTemplateDescriptionChange(e.target.value)}
            placeholder="Describe what this template is for"
            size="small"
          />
        </Box>

        {/* Template Type */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Template Type
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={templateType}
              onChange={(e) => onTemplateTypeChange(e.target.value)}
            >
              <MenuItem value="quotation">Quotation Template</MenuItem>
              <MenuItem value="invoice">Invoice Template</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider />

        {/* Template Info */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Template Info
          </Typography>

          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Status
              </Typography>
              <Chip
                label={templateStatus}
                size="small"
                color={getStatusColor(templateStatus) as any}
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Type
              </Typography>
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {templateType}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Created
              </Typography>
              <Typography variant="body2">
                {new Date().toLocaleDateString()}
              </Typography>
            </Box>

            {isAiEnhanced && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  AI Enhanced
                </Typography>
                <Chip
                  label="AI Enhanced"
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}