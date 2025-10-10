'use client';

import * as React from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  Badge,
  Tooltip,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  GetApp as ExportIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Settings as SettingsIcon,
  LibraryBooks as LibraryIcon,
  CloudUpload as UploadIcon,
  Publish as ImportIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';

import { TemplateSettings } from './template-settings';
import { TemplateLibrary } from './template-library';
import { TemplatePreview } from './template-preview';
import { AIAnalysisSidebar } from './ai-analysis-sidebar';
import { authClient } from '@/lib/auth/client';
import { config } from '@/config';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export function TemplateBuilder(): React.JSX.Element {
  const [tabValue, setTabValue] = React.useState(0);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<'edit' | 'preview'>('edit');
  const [templateContent, setTemplateContent] = React.useState('');
  const [templateName, setTemplateName] = React.useState('Untitled Template');
  const [templateDescription, setTemplateDescription] = React.useState('');
  const [templateType, setTemplateType] = React.useState('quotation');
  const [templateStatus, setTemplateStatus] = React.useState('unsaved');
  const [isAiEnhanced, setIsAiEnhanced] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [currentTemplateId, setCurrentTemplateId] = React.useState<number | null>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [uploading, setUploading] = React.useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = React.useState(false);

  // Debug function to track content changes
  const handleContentChange = (content: string) => {
    console.log('Content changed to:', content);
    setTemplateContent(content);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      const templateData = {
        name: templateName,
        description: templateDescription,
        template_type: templateType,
        content: { html: templateContent },
        variables: [],
        is_ai_enhanced: isAiEnhanced,
        status: 'saved'
      };

      console.log('Saving template...', templateData);
      console.log('Template content:', templateContent);

      let result;
      if (currentTemplateId) {
        // Update existing template
        result = await authClient.updateTemplate(currentTemplateId, templateData);
      } else {
        // Create new template
        result = await authClient.createTemplate(templateData);
        if (result.data) {
          setCurrentTemplateId(result.data.id);
        }
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setTemplateStatus('saved');
      setSnackbar({ open: true, message: currentTemplateId ? 'Template updated successfully!' : 'Template saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving template:', error);
      setSnackbar({ open: true, message: `Failed to save template: ${error instanceof Error ? error.message : 'Please try again.'}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportTemplate = () => {
    if (!currentTemplateId) {
      setSnackbar({ open: true, message: 'No template selected for export', severity: 'error' });
      return;
    }

    // Create a download link for the DOCX file
    const downloadUrl = `${config.api.baseUrl}/templates/document/${currentTemplateId}`;
    const token = localStorage.getItem('access_token');

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${templateName || 'template'}.docx`);

    // Add authorization header by fetching the file and creating a blob URL
    fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Template exported successfully!', severity: 'success' });
    })
    .catch(error => {
      console.error('Export failed:', error);
      setSnackbar({ open: true, message: 'Export failed. Please try again.', severity: 'error' });
    });
  };

  const handleNewTemplate = async () => {
    try {
      const result = await authClient.createNewTemplate('New Template', templateType);
      if (result.error) {
        setSnackbar({ open: true, message: `Failed to create template: ${result.error}`, severity: 'error' });
        return;
      }

      const newTemplate = result.data;
      setSnackbar({ open: true, message: 'New template created successfully!', severity: 'success' });

      // Navigate to OnlyOffice editor for the new template
      window.open(`/dashboard/templates/editor?id=${newTemplate.id}&filename=${encodeURIComponent(newTemplate.name)}&type=docx`, '_blank');
    } catch (error) {
      console.error('Error creating new template:', error);
      setSnackbar({ open: true, message: 'Failed to create new template', severity: 'error' });
    }
  };

  const handleEditTemplate = (template: any) => {
    console.log("Loading template into editor:", template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateType(template.template_type);
    setTemplateContent(template.content?.html || '');
    setIsAiEnhanced(template.is_ai_enhanced || false);
    setTemplateStatus(template.status || 'saved');
    setCurrentTemplateId(template.id);
    setTabValue(0); // Switch to Settings tab
    setEditorMode('edit'); // Switch to edit mode
  };

  const handleDocxUpload = async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      setSnackbar({
        open: true,
        message: 'Please select a valid Word document (.docx/.doc)',
        severity: 'error'
      });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'File size must be less than 50MB',
        severity: 'error'
      });
      return;
    }

    setUploading(true);
    try {
      // Auto-generate template name from filename
      const fileName = file.name.replace(/\.(docx|doc)$/i, '');

      const result = await authClient.uploadDocxTemplate(
        file,
        fileName,
        undefined, // description
        'quotation' // default template type
      );

      if (result.error) {
        setSnackbar({
          open: true,
          message: result.error,
          severity: 'error'
        });
      } else {
        // Load the uploaded template into the editor
        handleEditTemplate(result.data);
        setSnackbar({
          open: true,
          message: `Template "${fileName}" uploaded successfully!`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to upload template. Please try again.',
        severity: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string);

            // Validate imported data
            if (!importedData.name || !importedData.template_type || !importedData.content) {
              throw new Error('Invalid template file format');
            }

            setTemplateName(importedData.name);
            setTemplateDescription(importedData.description || '');
            setTemplateType(importedData.template_type);
            setTemplateContent(importedData.content.html || '');
            setIsAiEnhanced(importedData.is_ai_enhanced || false);
            setTemplateStatus('unsaved');

            alert('Template imported successfully!');
          } catch (error) {
            console.error('Error importing template:', error);
            alert('Failed to import template. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleOpenAIAnalysis = () => {
    if (!currentTemplateId) {
      setSnackbar({
        open: true,
        message: 'Please select a template first',
        severity: 'error'
      });
      return;
    }
    setAiSidebarOpen(true);
  };

  const handleAIAnalysisComplete = (result: any) => {
    console.log('AI Analysis complete:', result);
    setSnackbar({
      open: true,
      message: `AI found ${result.text_improvements?.length || 0} text improvements`,
      severity: 'success'
    });
  };

  const handleAIChangesApplied = (acceptedImprovements: any[], newTemplateName?: string) => {
    console.log('AI changes applied:', { acceptedImprovements, newTemplateName });

    // Refresh the template library to show the new template
    setSnackbar({
      open: true,
      message: `Successfully applied ${acceptedImprovements.length} text improvements while preserving formatting!`,
      severity: 'success'
    });

    // If a new template was created, we might want to load it
    if (newTemplateName) {
      // Optionally redirect to the new template or refresh the library
      setTabValue(1); // Switch to Library tab to see the new template
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'saved': return 'success';
      case 'unsaved': return 'warning';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="between" spacing={2}>
          {/* Logo/Title Section */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
            <ArticleIcon color="primary" />
            <Typography variant="h5" component="div" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              Template Management
            </Typography>
            <Chip
              label={templateType}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ textTransform: 'capitalize', display: { xs: 'none', sm: 'inline-flex' } }}
            />
          </Stack>

          {/* Streamlined Action Buttons for OnlyOffice */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleNewTemplate}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 'inherit' } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New Template</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>New</Box>
            </Button>
            <Button
              variant="outlined"
              startIcon={<AIIcon />}
              onClick={handleOpenAIAnalysis}
              disabled={!currentTemplateId}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 'inherit' } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>AI Convert</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>AI</Box>
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportTemplate}
              disabled={!currentTemplateId}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 'inherit' } }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveTemplate}
              disabled={saving || !currentTemplateId}
              size="small"
              color="primary"
              sx={{ minWidth: { xs: 'auto', sm: 'inherit' } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {saving ? 'Saving...' : 'Save'}
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {saving ? 'Saving...' : 'Save'}
              </Box>
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{
        display: 'flex',
        flexGrow: 1,
        gap: { xs: 1, md: 2 },
        height: 'calc(100% - 80px)',
        flexDirection: { xs: 'column', md: 'row' }
      }}>
        {/* Left Sidebar */}
        <Paper
          sx={{
            width: { xs: '100%', md: 320 },
            minWidth: { md: 300 },
            maxWidth: { md: 350 },
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 1,
            height: { xs: 'auto', md: '100%' },
            minHeight: { xs: '60vh', md: '100%' },
            maxHeight: { xs: '80vh', md: 'none' },
          }}
        >
          {/* Sidebar Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            sx={{
              '& .MuiTab-root': {
                gap: 1,
                fontSize: '0.75rem',
                fontWeight: 500,
                minWidth: 80,
                maxWidth: 120,
                whiteSpace: 'nowrap',
                overflow: 'visible',
                textOverflow: 'clip',
              },
            }}
          >
            <Tab
              icon={<SettingsIcon />}
              label="Settings"
              iconPosition="start"
              sx={{
                minHeight: 48,
                px: 1,
                py: 1.5,
                textTransform: 'none',
                fontSize: '0.75rem',
                '& .MuiTab-iconWrapper': {
                  marginRight: 0.5,
                },
              }}
            />
            <Tab
              icon={<LibraryIcon />}
              label="Library"
              iconPosition="start"
              sx={{
                minHeight: 48,
                px: 1,
                py: 1.5,
                textTransform: 'none',
                fontSize: '0.75rem',
                '& .MuiTab-iconWrapper': {
                  marginRight: 0.5,
                },
              }}
            />
            <Tab
              icon={<UploadIcon />}
              label="Upload"
              iconPosition="start"
              sx={{
                minHeight: 48,
                px: 1,
                py: 1.5,
                textTransform: 'none',
                fontSize: '0.75rem',
                '& .MuiTab-iconWrapper': {
                  marginRight: 0.5,
                },
              }}
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <TabPanel value={tabValue} index={0}>
              <TemplateSettings
                templateName={templateName}
                templateDescription={templateDescription}
                templateType={templateType}
                templateStatus={templateStatus}
                isAiEnhanced={isAiEnhanced}
                onTemplateNameChange={setTemplateName}
                onTemplateDescriptionChange={setTemplateDescription}
                onTemplateTypeChange={setTemplateType}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <TemplateLibrary onEditTemplate={handleEditTemplate} />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 2 }}>
                {/* Upload Header */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Upload Word Document
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload a Word document (.docx/.doc) to create a new template
                  </Typography>
                </Box>

                {/* File Upload Area */}
                <Paper
                  sx={{
                    p: 4,
                    border: '2px dashed',
                    borderColor: uploading ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    mb: 3,
                    opacity: uploading ? 0.7 : 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: uploading ? 'transparent' : 'action.hover',
                    },
                  }}
                  onClick={() => {
                    if (uploading) return;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleDocxUpload(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <Stack alignItems="center" spacing={2}>
                    <UploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {uploading ? 'Uploading...' : 'Choose file to import'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {uploading ? 'Please wait while your file is being processed' : 'Drag and drop or click to browse'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Supported: Word (.docx/.doc) - Max 50MB
                    </Typography>
                  </Stack>
                </Paper>

                {/* Alternative Actions */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Or start from scratch
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleNewTemplate}
                  >
                    Create New Template
                  </Button>
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Paper>

        {/* Main Content Area */}
        <Paper sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 2,
          minWidth: 0, // Prevents flex item from overflowing
          height: { xs: '60vh', md: '100%' },
          minHeight: { xs: 400, md: 500 },
        }}>
          {/* OnlyOffice Editor Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'grey.50',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <ArticleIcon color="primary" />
                <Typography variant="h6">
                  {previewMode ? 'Document Preview' : 'OnlyOffice Editor'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {previewMode ? 'Read-only' : 'Live Editing'}
                </Typography>
              </Stack>
              {templateName && (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, truncateText: 'ellipsis' }}>
                  {templateName}
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Template Content Area */}
          <Box sx={{
            flexGrow: 1,
            overflow: 'hidden',
            backgroundColor: 'background.paper',
            minHeight: 500,
            position: 'relative',
          }}>
            {currentTemplateId ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 4,
                  color: 'text.secondary'
                }}
              >
                <ArticleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.7, color: 'primary.main' }} />
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                  {templateName}
                </Typography>
                <Typography variant="body2" textAlign="center" sx={{ maxWidth: 400, mb: 3 }}>
                  Template ready for editing. Click below to open in OnlyOffice Document Editor for professional document editing experience.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    window.open(`/dashboard/templates/editor?id=${currentTemplateId}&filename=${encodeURIComponent(templateName)}&type=docx`, '_blank');
                  }}
                  size="large"
                  sx={{ mb: 2 }}
                >
                  Edit with OnlyOffice
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Opens in a new tab with full OnlyOffice features
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 4,
                  color: 'text.secondary'
                }}
              >
                <ArticleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  No Template Selected
                </Typography>
                <Typography variant="body2" textAlign="center" sx={{ maxWidth: 400, mb: 2 }}>
                  Create a new template, upload a document from the Upload tab, or select an existing one from the library.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleNewTemplate}
                  sx={{ mb: 1 }}
                >
                  Create New Template
                </Button>
                <Button
                  variant="text"
                  startIcon={<UploadIcon />}
                  onClick={() => setTabValue(2)}
                  size="small"
                >
                  Go to Upload Tab
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* AI Analysis Sidebar */}
      <AIAnalysisSidebar
        templateId={currentTemplateId || 0}
        templateName={templateName}
        isOpen={aiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
        onAnalysisComplete={handleAIAnalysisComplete}
        onApplyChanges={handleAIChangesApplied}
      />
    </Box>
  );
}