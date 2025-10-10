'use client';

import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
} from '@mui/material';

interface TemplatePreviewProps {
  content: string;
}

export function TemplatePreview({ content }: TemplatePreviewProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100%',
        py: 4,
        px: 2,
        backgroundColor: 'grey.50',
      }}
    >
      {/* Document Preview */}
      <Paper
        sx={{
          width: '100%',
          maxWidth: 800,
          minHeight: 1000,
          p: 4,
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {content ? (
          <Box
            dangerouslySetInnerHTML={{ __html: content }}
            sx={{
              '& p': {
                margin: '0 0 16px 0',
                lineHeight: 1.6,
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                margin: '24px 0 16px 0',
                fontWeight: 600,
              },
              '& ul, & ol': {
                paddingLeft: '24px',
                margin: '16px 0',
              },
              '& li': {
                margin: '8px 0',
                lineHeight: 1.6,
              },
              '& strong': {
                fontWeight: 600,
              },
              '& em': {
                fontStyle: 'italic',
              },
              '& u': {
                textDecoration: 'underline',
              },
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              height: 400,
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Preview Mode
            </Typography>
            <Typography variant="body2">
              Start editing your template to see the preview here
            </Typography>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}