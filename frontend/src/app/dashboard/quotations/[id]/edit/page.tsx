'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import { authClient } from '@/lib/auth/client';
import { paths } from '@/paths';
import { RoleGuard } from '@/components/auth/role-guard';

export default function Page(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const quotationId = parseInt(params.id as string, 10);

  const [quotation, setQuotation] = React.useState<any>(null);
  const [client, setClient] = React.useState<any>(null);
  const [unfilledPlaceholders, setUnfilledPlaceholders] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [editorLoaded, setEditorLoaded] = React.useState(false);
  const docEditorRef = React.useRef<any>(null);
  const initTimeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    const fetchQuotation = async () => {
      setLoading(true);
      try {
        // Fetch quotation
        const quotationResult = await authClient.getQuotationById(quotationId);
        if (quotationResult.error) {
          setError(quotationResult.error);
          return;
        }

        if (quotationResult.data) {
          setQuotation(quotationResult.data);

          // Fetch client data
          const clientResult = await authClient.getClientById(quotationResult.data.client_id);
          if (clientResult.data) {
            setClient(clientResult.data);
          }

          // Check for unfilled placeholders
          const placeholdersResult = await authClient.checkQuotationPlaceholders(quotationId);
          if (placeholdersResult.data) {
            setUnfilledPlaceholders(placeholdersResult.data.unfilled_placeholders || []);
          }
        }
      } catch (error) {
        console.error('Error fetching quotation:', error);
        setError('Failed to load quotation');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [quotationId]);

  React.useEffect(() => {
    if (!quotation) return;

    const initializeEditor = async () => {
      if (!window.DocsAPI) {
        console.error('DocsAPI not available');
        setError('OnlyOffice API not available');
        return;
      }

      // Destroy previous editor instance if exists
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor();
          docEditorRef.current = null;
        } catch (e) {
          console.log('Previous editor cleanup:', e);
        }
      }

      // Clear the editor div
      const editorDiv = document.getElementById('onlyoffice-editor');
      if (editorDiv) {
        editorDiv.innerHTML = '';
      }

      try {
        // Get OnlyOffice config
        const configResult = await authClient.getOnlyOfficeConfigForQuotation(quotationId);
        if (configResult.error) {
          console.error('Config error:', configResult.error);
          setError(configResult.error);
          return;
        }

        if (configResult.data && window.DocsAPI) {
          const config = configResult.data;

          // Add unique document key to force refresh
          config.document.key = `${quotationId}_${Date.now()}`;

          // Set a timeout to show error if document doesn't load
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
          }

          initTimeoutRef.current = setTimeout(() => {
            if (!editorLoaded) {
              console.warn('Document taking longer than expected to load');
              // Try to reload the page as a fallback
              window.location.reload();
            }
          }, 10000); // 10 second timeout

          // Add event handlers
          config.events = {
            onAppReady: () => {
              console.log('OnlyOffice app is ready');
            },
            onDocumentReady: () => {
              console.log('Document is ready');
              if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
              }
              setEditorLoaded(true);
            },
            onError: (event: any) => {
              console.error('OnlyOffice error:', event);
              if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
              }
              setError(`OnlyOffice error: ${event?.data || 'Unknown error'}`);
            },
            onWarning: (event: any) => {
              console.warn('OnlyOffice warning:', event);
            },
            onRequestHistory: () => {
              console.log('History requested');
            }
          };

          // Force editor mode settings
          config.type = 'desktop';
          config.editorConfig.mode = 'edit';

          // Add customization to reduce loading issues
          if (!config.editorConfig.customization) {
            config.editorConfig.customization = {};
          }
          config.editorConfig.customization.autosave = true;
          config.editorConfig.customization.forcesave = true;
          config.editorConfig.customization.compactHeader = false;

          console.log('Initializing OnlyOffice with config:', config);

          // Add small delay before creating editor
          await new Promise(resolve => setTimeout(resolve, 100));

          // Create new editor instance
          docEditorRef.current = new window.DocsAPI.DocEditor('onlyoffice-editor', config);

          console.log('Editor instance created:', docEditorRef.current);
        }
      } catch (error) {
        console.error('Error initializing OnlyOffice:', error);
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        setError('Failed to initialize document editor');
      }
    };

    // Add delay to ensure DOM is ready
    const initWithDelay = () => {
      setTimeout(() => {
        if (window.DocsAPI) {
          console.log('DocsAPI already loaded, initializing editor');
          initializeEditor();
        }
      }, 300);
    };

    // Check if script already loaded
    if (window.DocsAPI) {
      initWithDelay();
      return;
    }

    // Check if script is already in document
    const existingScript = document.querySelector('script[src*="api.js"]');
    if (existingScript) {
      console.log('Script exists, waiting for load');
      existingScript.addEventListener('load', () => {
        console.log('Script loaded via existing script');
        initWithDelay();
      });
      existingScript.addEventListener('error', () => {
        setError('Failed to load OnlyOffice API. Make sure Document Server is running on port 8080.');
      });
      return;
    }

    // Load OnlyOffice script
    console.log('Loading OnlyOffice script');
    const script = document.createElement('script');
    script.src = 'http://localhost:8080/web-apps/apps/api/documents/api.js';
    script.async = true;

    script.onload = () => {
      console.log('Script loaded successfully');
      initWithDelay();
    };
    script.onerror = () => {
      console.error('Script failed to load');
      setError('Failed to load OnlyOffice API. Make sure Document Server is running on port 8080.');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, [quotation, quotationId, editorLoaded]);

  if (loading) {
    return (
      <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading quotation...
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft />}
          onClick={() => router.push(paths.dashboard.quotations)}
        >
          Back to Quotations
        </Button>
      </Stack>
    );
  }

  if (!quotation) {
    return (
      <Stack spacing={3}>
        <Alert severity="warning">Quotation not found</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft />}
          onClick={() => router.push(paths.dashboard.quotations)}
        >
          Back to Quotations
        </Button>
      </Stack>
    );
  }

  return (
    <RoleGuard allowedRoles={[1, 2]}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<ArrowLeft />}
            onClick={() => router.push(paths.dashboard.quotations)}
            size="small"
          >
            Back
          </Button>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="h4">
              Edit Quotation: {quotation.quotation_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Client: {client?.company_name || 'Loading...'} | Contact: {quotation.selected_contact.name}
            </Typography>
          </Stack>
          <Chip
            label={quotation.status}
            color={quotation.status === 'draft' ? 'default' : quotation.status === 'sent' ? 'info' : 'success'}
            sx={{ textTransform: 'capitalize' }}
          />
        </Stack>

        {/* Unfilled Placeholders Warning */}
        {unfilledPlaceholders.length > 0 && (
          <Alert severity="warning" icon={<Warning />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Unfilled Placeholders Detected
            </Typography>
            <Typography variant="body2">
              The following placeholders could not be automatically filled and need your attention:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {unfilledPlaceholders.map((placeholder, index) => (
                <Chip
                  key={index}
                  label={`{{${placeholder}}}`}
                  size="small"
                  variant="outlined"
                  color="warning"
                />
              ))}
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please fill these in manually in the document editor below.
            </Typography>
          </Alert>
        )}

        {/* OnlyOffice Editor */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            height: {
              xs: '70vh',
              sm: '75vh',
              md: '80vh',
              lg: '85vh'
            },
            minHeight: '700px',
          }}
        >
          <div
            id="onlyoffice-editor"
            style={{
              width: '100%',
              height: '100%',
            }}
          />
          {!editorLoaded && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ height: '100%', p: 4 }}
            >
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading document editor...
              </Typography>
            </Stack>
          )}
        </Card>

        {/* Info */}
        <Card sx={{ bgcolor: 'primary.50', borderRadius: 2 }}>
          <Stack spacing={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Editing Tips
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Your changes are automatically saved<br />
              • Use the toolbar to format text, add images, and create tables<br />
              • Update quotation details like pricing, line items, and terms<br />
              • When finished, close this page to return to the quotation list
            </Typography>
          </Stack>
        </Card>
      </Stack>
    </RoleGuard>
  );
}
