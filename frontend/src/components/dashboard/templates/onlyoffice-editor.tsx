'use client';

import * as React from 'react';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { authClient } from '@/lib/auth/client';

interface OnlyOfficeEditorProps {
  templateId: number;
  isPreviewMode?: boolean;
  onDocumentReady?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    DocsAPI?: any;
  }
}

export function OnlyOfficeEditor({
  templateId,
  isPreviewMode = false,
  onDocumentReady,
  onError
}: OnlyOfficeEditorProps): React.JSX.Element {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [docEditor, setDocEditor] = React.useState<any>(null);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const loadOnlyOfficeScript = () => {
      return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (window.DocsAPI) {
          resolve(window.DocsAPI);
          return;
        }

        // Load OnlyOffice Document Server script
        const script = document.createElement('script');
        script.src = 'http://localhost:8080/web-apps/apps/api/documents/api.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          console.log('OnlyOffice script loaded successfully');
          if (window.DocsAPI) {
            resolve(window.DocsAPI);
          } else {
            reject(new Error('OnlyOffice script loaded but DocsAPI not available'));
          }
        };
        script.onerror = (error) => {
          console.error('Failed to load OnlyOffice script:', error);
          reject(new Error('Failed to load OnlyOffice script. Check if Document Server is running on port 8080.'));
        };
        document.head.appendChild(script);
      });
    };

    const initializeEditor = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load OnlyOffice script
        await loadOnlyOfficeScript();

        // Get OnlyOffice configuration from backend
        const configResult = await authClient.getOnlyOfficeConfig(templateId);
        if (configResult.error) {
          throw new Error(configResult.error);
        }

        const config = configResult.data;

        // Modify config for preview mode
        if (isPreviewMode) {
          config.editorConfig.mode = 'view';
          config.document.permissions = {
            edit: false,
            download: true,
            print: true,
            review: false,
            comment: false
          };
        }

        // Clear previous editor instance
        if (editorContainerRef.current) {
          editorContainerRef.current.innerHTML = '';
        }

        // Initialize OnlyOffice editor
        const editor = new window.DocsAPI.DocEditor('onlyoffice-editor', {
          ...config,
          events: {
            onDocumentReady: () => {
              console.log('OnlyOffice document ready');
              setIsLoading(false);
              onDocumentReady?.();
            },
            onError: (event: any) => {
              console.error('OnlyOffice error:', event);
              const errorMessage = `OnlyOffice error: ${event.data || 'Unknown error'}`;
              setError(errorMessage);
              setIsLoading(false);
              onError?.(errorMessage);
            },
            onDocumentStateChange: (event: any) => {
              console.log('Document state changed:', event);
            },
            onRequestSaveAs: (event: any) => {
              console.log('Save as requested:', event);
            }
          }
        });

        setDocEditor(editor);

      } catch (err) {
        console.error('Error initializing OnlyOffice editor:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize editor';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      }
    };

    if (templateId) {
      initializeEditor();
    }

    // Cleanup function
    return () => {
      if (docEditor) {
        try {
          docEditor.destroyEditor();
        } catch (err) {
          console.log('Error destroying editor:', err);
        }
      }
    };
  }, [templateId, isPreviewMode]);

  const downloadDocument = async (format: 'pdf' | 'docx') => {
    if (!docEditor) return;

    try {
      // Use OnlyOffice API to download document
      docEditor.downloadAs(format);
    } catch (err) {
      console.error('Error downloading document:', err);
      onError?.('Failed to download document');
    }
  };

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ mb: 2, maxWidth: 600 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          OnlyOffice Document Server might not be running or accessible.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please ensure Docker container "onlyoffice-docs" is running on port 8080.
        </Typography>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading OnlyOffice Editor...
          </Typography>
        </Box>
      )}
      <div
        id="onlyoffice-editor"
        ref={editorContainerRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
    </Box>
  );
}