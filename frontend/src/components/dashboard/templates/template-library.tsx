'use client';

import * as React from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Article as ArticleIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { authClient } from '@/lib/auth/client';

interface TemplateLibraryProps {
  onEditTemplate?: (template: any) => void;
}

export function TemplateLibrary({ onEditTemplate }: TemplateLibraryProps): React.JSX.Element {
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  React.useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const result = await authClient.getTemplates();
        if (result.data && result.data.templates) {
          setTemplates(result.data.templates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: any) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleEditTemplate = () => {
    if (selectedTemplate && onEditTemplate) {
      onEditTemplate(selectedTemplate);
    }
    handleMenuClose();
  };

  const handleEditWithOnlyOffice = () => {
    if (selectedTemplate) {
      // Navigate to OnlyOffice editor
      const editorUrl = `/dashboard/templates/editor?id=${selectedTemplate.id}&filename=${encodeURIComponent(selectedTemplate.name)}&type=docx`;
      window.open(editorUrl, '_blank');
    }
    handleMenuClose();
  };

  const handleDeleteTemplate = () => {
    console.log('Delete template clicked, selectedTemplate:', selectedTemplate); // Debug log
    setDeleteDialogOpen(true);
    // Don't close menu immediately to preserve selectedTemplate
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) {
      console.error('No template selected for deletion');
      return;
    }

    console.log('Confirming delete for template:', selectedTemplate); // Debug log
    setDeleting(true);

    try {
      const result = await authClient.deleteTemplate(selectedTemplate.id);

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('Template deleted successfully from server'); // Debug log

      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id));

      // Show success message
      setSnackbar({ open: true, message: `Template "${selectedTemplate.name}" deleted successfully!`, severity: 'success' });

      // Clean up state
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      handleMenuClose();

      console.log('Template removed from local state'); // Debug log
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(`Failed to delete template: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setDeleting(false);
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

  const getTypeIcon = (type: string) => {
    return <ArticleIcon fontSize="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Template Library
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Loading templates...
        </Typography>
      </Box>
    );
  }

  if (templates.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Template Library
          </Typography>
          <Chip label="0" size="small" variant="outlined" />
        </Stack>

        {/* Empty State */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
            textAlign: 'center',
          }}
        >
          <DescriptionIcon
            sx={{
              fontSize: 48,
              color: 'text.secondary',
              mb: 2,
            }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No saved templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save your first template to see it here
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            size="small"
          >
            Create Template
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Template Library
        </Typography>
        <Chip label={templates.length} size="small" variant="outlined" />
      </Stack>

      {/* Template List */}
      <List disablePadding>
        {templates.map((template, index) => (
          <ListItem
            key={template.id}
            onClick={() => onEditTemplate && onEditTemplate(template)}
            sx={{
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
                cursor: 'pointer',
              },
              pr: 1,
              display: 'flex',
              alignItems: 'flex-start',
              minHeight: 'auto',
            }}
          >
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              {getTypeIcon(template.template_type)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
              {/* Template Name and AI Badge */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '180px',
                    flexShrink: 1
                  }}
                  title={template.name}
                >
                  {template.name}
                </Typography>
                {template.is_ai_enhanced && (
                  <Chip
                    label="AI"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
                  />
                )}
              </Stack>

              {/* Template Type and Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                <Chip
                  label={template.template_type}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    textTransform: 'capitalize',
                    flexShrink: 0
                  }}
                />
                <Chip
                  label={template.status}
                  size="small"
                  color={getStatusColor(template.status) as any}
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    textTransform: 'capitalize',
                    flexShrink: 0
                  }}
                />
              </Box>
            </Box>

            {/* Three Dots Menu */}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e, template);
              }}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>

      {/* Menu for template actions */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleDeleteTemplate} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          handleMenuClose();
        }}
        maxWidth="sm"
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedTemplate?.name || 'this template'}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            handleMenuClose();
          }}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={deleting}
            variant="contained"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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


    </Box>
  );
}