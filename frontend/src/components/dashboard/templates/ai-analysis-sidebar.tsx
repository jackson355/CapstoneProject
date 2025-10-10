'use client';

import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as AIIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Visibility as PreviewIcon,
  PlayArrow as ApplyIcon,
  Save as SaveIcon,
  Lightbulb as SuggestionIcon,
  Assignment as VariableIcon,
  AutoAwesome as EnhanceIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface AIVariable {
  name: string;
  original_text: string;
  suggested_placeholder: string;
  description: string;
  type: string;
  context: string;
  confidence: number;
  start_position?: number;
  end_position?: number;
}

interface AITextImprovement {
  location: string;
  original_text: string;
  improved_text: string;
  improvement_type: string;
}

interface AIAnalysisResult {
  template_type: string;
  document_category: string;
  confidence_score: number;
  summary: string;
  variables: AIVariable[];
  text_improvements: AITextImprovement[];
  suggestions: string[];
}

interface AIAnalysisSidebarProps {
  templateId: number;
  templateName: string;
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: AIAnalysisResult) => void;
  onApplyChanges?: (changes: { variables: AIVariable[], improvements: AITextImprovement[] }, newTemplateName?: string) => void;
}

export const AIAnalysisSidebar = React.memo(function AIAnalysisSidebar({
  templateId,
  templateName,
  isOpen,
  onClose,
  onAnalysisComplete,
  onApplyChanges,
}: AIAnalysisSidebarProps): React.JSX.Element {
  // State
  const [apiKey, setApiKey] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<AIAnalysisResult | null>(null);
  const [selectedVariables, setSelectedVariables] = React.useState<Set<number>>(new Set());
  const [selectedImprovements, setSelectedImprovements] = React.useState<Set<number>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = React.useState('');
  const [showApplyDialog, setShowApplyDialog] = React.useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
  const [selectedVariable, setSelectedVariable] = React.useState<AIVariable | null>(null);
  const [selectedImprovement, setSelectedImprovement] = React.useState<AITextImprovement | null>(null);
  const [activeTab, setActiveTab] = React.useState<'variables' | 'improvements'>('variables');

  // Reset state when sidebar closes
  React.useEffect(() => {
    if (!isOpen) {
      setAnalysisResult(null);
      setSelectedVariables(new Set());
      setSelectedImprovements(new Set());
      setError(null);
      setNewTemplateName('');
      setShowApplyDialog(false);
      setPreviewDialogOpen(false);
      setSelectedVariable(null);
      setSelectedImprovement(null);
      setActiveTab('variables');
    }
  }, [isOpen]);

  // Auto-generate new template name when analysis completes
  const hasCalledCallback = React.useRef(false);
  React.useEffect(() => {
    if (analysisResult && !newTemplateName && !hasCalledCallback.current) {
      setNewTemplateName(`${templateName} (AI Enhanced)`);
      onAnalysisComplete?.(analysisResult);
      hasCalledCallback.current = true;
    }
  }, [analysisResult, templateName, newTemplateName, onAnalysisComplete]);

  // Reset callback flag when sidebar closes
  React.useEffect(() => {
    if (!isOpen) {
      hasCalledCallback.current = false;
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { authClient } = await import('@/lib/auth/client');
      const result = await authClient.analyzeTemplateWithAI(templateId, apiKey);

      if (result.error) {
        setError(result.error);
      } else {
        setAnalysisResult(result.data.analysis);
        // Select all variables by default
        if (result.data.analysis.variables?.length > 0) {
          const allVariableIndices = new Set<number>(result.data.analysis.variables.map((_: any, index: number) => index));
          setSelectedVariables(allVariableIndices);
        }

        // Select all improvements by default
        if (result.data.analysis.text_improvements?.length > 0) {
          const allImprovementIndices = new Set<number>(result.data.analysis.text_improvements.map((_: any, index: number) => index));
          setSelectedImprovements(allImprovementIndices);
        }
      }
    } catch (err) {
      setError('Failed to analyze template. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVariableToggle = (index: number) => {
    const newSelected = new Set(selectedVariables);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVariables(newSelected);
  };

  const handleImprovementToggle = (index: number) => {
    const newSelected = new Set(selectedImprovements);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImprovements(newSelected);
  };

  const handleSelectAll = () => {
    if (activeTab === 'variables' && analysisResult?.variables) {
      const allIndices = new Set<number>(analysisResult.variables.map((_, index) => index));
      setSelectedVariables(allIndices);
    } else if (activeTab === 'improvements' && analysisResult?.text_improvements) {
      const allIndices = new Set<number>(analysisResult.text_improvements.map((_, index) => index));
      setSelectedImprovements(allIndices);
    }
  };

  const handleSelectNone = () => {
    if (activeTab === 'variables') {
      setSelectedVariables(new Set());
    } else if (activeTab === 'improvements') {
      setSelectedImprovements(new Set());
    }
  };

  const handleApply = () => {
    if (selectedVariables.size === 0 && selectedImprovements.size === 0) {
      setError('Please select at least one variable or improvement to apply');
      return;
    }
    setShowApplyDialog(true);
  };

  const handleConfirmApply = async () => {
    if (!analysisResult) return;

    setIsApplying(true);
    setError(null);

    try {
      const acceptedVariables = Array.from(selectedVariables)
        .map(index => analysisResult.variables?.[index])
        .filter(Boolean);

      const acceptedImprovements = Array.from(selectedImprovements)
        .map(index => analysisResult.text_improvements?.[index])
        .filter(Boolean);

      const { authClient } = await import('@/lib/auth/client');
      const result = await authClient.applyAISuggestions(
        templateId,
        { variables: acceptedVariables, improvements: acceptedImprovements },
        {
          newTemplateName: newTemplateName.trim() || undefined
        }
      );

      if (result.error) {
        setError(result.error);
      } else {
        onApplyChanges?.({ variables: acceptedVariables, improvements: acceptedImprovements }, newTemplateName.trim() || undefined);
        setShowApplyDialog(false);
        onClose();
      }
    } catch (err) {
      setError('Failed to apply changes. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePreviewVariable = (variable: AIVariable) => {
    setSelectedVariable(variable);
    setSelectedImprovement(null);
    setPreviewDialogOpen(true);
  };

  const handlePreviewImprovement = (improvement: AITextImprovement) => {
    setSelectedImprovement(improvement);
    setSelectedVariable(null);
    setPreviewDialogOpen(true);
  };

  if (!isOpen) return <div style={{ display: 'none' }} />;

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
            <AIIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Template Enhancement
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Convert documents to templates and improve text quality
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 1 }}>
        <Stack spacing={3}>
          {/* API Key Input */}
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EnhanceIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    OpenAI Configuration
                  </Typography>
                </Stack>
                <TextField
                  label="OpenAI API Key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  size="small"
                  fullWidth
                  helperText="Your API key is only used for this analysis and not stored"
                />
                <Button
                  variant="contained"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !apiKey.trim()}
                  startIcon={isAnalyzing ? <CircularProgress size={20} /> : <AIIcon />}
                  fullWidth
                >
                  {isAnalyzing ? 'Analyzing Document...' : 'Analyze with AI'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <Stack spacing={2}>
              {/* Overview */}
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <InfoIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Analysis Overview
                      </Typography>
                    </Stack>

                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Document Type
                        </Typography>
                        <Chip
                          label={analysisResult.template_type}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Confidence Score
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LinearProgress
                            variant="determinate"
                            value={analysisResult.confidence_score * 100}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {Math.round(analysisResult.confidence_score * 100)}%
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Summary
                        </Typography>
                        <Typography variant="body2">
                          {analysisResult.summary}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Variables and Improvements Tabs */}
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    {/* Tab Headers */}
                    <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
                      <Tab
                        label={`Variables (${analysisResult.variables?.length || 0})`}
                        value="variables"
                        icon={<VariableIcon />}
                      />
                      <Tab
                        label={`Text Improvements (${analysisResult.text_improvements?.length || 0})`}
                        value="improvements"
                        icon={<EnhanceIcon />}
                      />
                    </Tabs>

                    {/* Tab Content Header */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {activeTab === 'variables' ? 'Template Variables' : 'Text Improvements'}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={handleSelectAll}>
                          Select All
                        </Button>
                        <Button size="small" onClick={handleSelectNone} color="secondary">
                          Select None
                        </Button>
                      </Stack>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {activeTab === 'variables'
                        ? 'Review and select variables to convert. Selected items will become reusable placeholders.'
                        : 'Review and select text improvements. Selected items will have improved grammar and clarity.'
                      }
                    </Typography>

                    {/* Variables Tab Content */}
                    {activeTab === 'variables' && (
                      <Box sx={{ p: 0.5 }}>
                        {analysisResult.variables?.map((variable, index) => {
                          const typeIcon = {
                            text: '📝',
                            number: '🔢',
                            currency: '💰',
                            date: '📅',
                            email: '📧',
                            phone: '📞',
                            address: '🏠',
                            percentage: '%',
                            boolean: '✓'
                          }[variable.type] || '📝';

                          const isSelected = selectedVariables.has(index);

                          return (
                            <Box
                              key={`variable-${index}-${variable.name}`}
                              sx={{
                                border: '1px solid',
                                borderColor: isSelected ? '#1976d2' : '#e0e0e0',
                                borderRadius: 1.5,
                                mb: 1.5,
                                p: 1.5,
                                bgcolor: isSelected ? '#e3f2fd' : '#ffffff',
                                transition: 'all 0.2s ease-in-out',
                                boxShadow: isSelected ? '0 2px 4px rgba(25, 118, 210, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                  borderColor: isSelected ? '#1565c0' : '#bdbdbd',
                                  boxShadow: isSelected ? '0 4px 8px rgba(25, 118, 210, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.15)',
                                },
                              }}
                            >
                              {/* Main Grid Layout */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 1.5, alignItems: 'flex-start' }}>

                                {/* Left: Icon */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', mt: 0.25 }}>
                                  {typeIcon}
                                </Box>

                                {/* Center: Content */}
                                <Box sx={{ minWidth: 0 }}>
                                  {/* Variable Name */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '200px',
                                        flexShrink: 1
                                      }}
                                      title={variable.name}
                                    >
                                      {variable.name}
                                    </Typography>
                                    <Chip
                                      label={variable.type}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        '& .MuiChip-label': { px: 0.75 },
                                        flexShrink: 0
                                      }}
                                      color="primary"
                                      variant="outlined"
                                    />
                                  </Box>

                                  {/* Description */}
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      mb: 0.75,
                                      fontSize: '0.8rem',
                                      lineHeight: 1.3,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '280px'
                                    }}
                                    title={variable.description}
                                  >
                                    {variable.description}
                                  </Typography>

                                  {/* Original Text */}
                                  <Box sx={{ mb: 0.75 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                      Original:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="error.main"
                                      sx={{
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        bgcolor: 'error.50',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        display: 'inline-block',
                                        ml: 1,
                                        maxWidth: '250px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'top'
                                      }}
                                      title={`"${variable.original_text}"`}
                                    >
                                      "{variable.original_text}"
                                    </Typography>
                                  </Box>

                                  {/* Placeholder */}
                                  <Box sx={{ mb: variable.context ? 1 : 0 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                      Placeholder:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="success.main"
                                      sx={{
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        bgcolor: 'success.50',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        display: 'inline-block',
                                        ml: 1,
                                        maxWidth: '250px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'top'
                                      }}
                                      title={variable.suggested_placeholder}
                                    >
                                      {variable.suggested_placeholder}
                                    </Typography>
                                  </Box>

                                  {/* Context (if exists) */}
                                  {variable.context && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontSize: '0.7rem',
                                        fontStyle: 'italic',
                                        lineHeight: 1.3,
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '280px'
                                      }}
                                      title={`Context: ${variable.context}`}
                                    >
                                      Context: {variable.context}
                                    </Typography>
                                  )}
                                </Box>

                                {/* Right: Controls */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                  {/* Confidence Badge */}
                                  <Chip
                                    label={`${Math.round(variable.confidence * 100)}%`}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      '& .MuiChip-label': { px: 0.75 }
                                    }}
                                    color={variable.confidence > 0.8 ? 'success' : variable.confidence > 0.6 ? 'warning' : 'default'}
                                  />

                                  {/* Preview Button */}
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreviewVariable(variable)}
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      color: 'text.secondary',
                                      '&:hover': { color: 'primary.main' }
                                    }}
                                  >
                                    <PreviewIcon fontSize="small" />
                                  </IconButton>

                                  {/* Checkbox */}
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleVariableToggle(index)}
                                    size="small"
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      p: 0
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          );
                        }) || []}
                      </Box>
                    )}

                    {/* Text Improvements Tab Content */}
                    {activeTab === 'improvements' && (
                      <Box sx={{ p: 0.5 }}>
                        {analysisResult.text_improvements?.map((improvement, index) => {
                          const isSelected = selectedImprovements.has(index);

                          return (
                            <Box
                              key={`improvement-${index}-${improvement.location}`}
                              sx={{
                                border: '1px solid',
                                borderColor: isSelected ? '#1976d2' : '#e0e0e0',
                                borderRadius: 1.5,
                                mb: 1.5,
                                p: 1.5,
                                bgcolor: isSelected ? '#e3f2fd' : '#ffffff',
                                transition: 'all 0.2s ease-in-out',
                                boxShadow: isSelected ? '0 2px 4px rgba(25, 118, 210, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                  borderColor: isSelected ? '#1565c0' : '#bdbdbd',
                                  boxShadow: isSelected ? '0 4px 8px rgba(25, 118, 210, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.15)',
                                },
                              }}
                            >
                              {/* Main Grid Layout */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 1.5, alignItems: 'flex-start' }}>

                                {/* Left: Icon */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', mt: 0.25 }}>
                                  📝
                                </Box>

                                {/* Center: Content */}
                                <Box sx={{ minWidth: 0 }}>
                                  {/* Location and Type */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '180px',
                                        flexShrink: 1
                                      }}
                                      title={improvement.location}
                                    >
                                      {improvement.location}
                                    </Typography>
                                    <Chip
                                      label={improvement.improvement_type || "Grammar"}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        '& .MuiChip-label': { px: 0.75 },
                                        flexShrink: 0
                                      }}
                                      color="success"
                                      variant="outlined"
                                    />
                                  </Box>

                                  {/* Before Text */}
                                  <Box sx={{ mb: 0.75 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                      Before:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="error.main"
                                      sx={{
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        bgcolor: 'error.50',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        display: 'inline-block',
                                        ml: 1,
                                        maxWidth: '250px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'top'
                                      }}
                                      title={`"${improvement.original_text}"`}
                                    >
                                      "{improvement.original_text}"
                                    </Typography>
                                  </Box>

                                  {/* After Text */}
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                      After:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="success.main"
                                      sx={{
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        bgcolor: 'success.50',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        display: 'inline-block',
                                        ml: 1,
                                        maxWidth: '250px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'top'
                                      }}
                                      title={`"${improvement.improved_text}"`}
                                    >
                                      "{improvement.improved_text}"
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Right: Controls */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                  {/* Type Badge */}
                                  <Chip
                                    label="Fix"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      '& .MuiChip-label': { px: 0.75 }
                                    }}
                                    color="success"
                                  />

                                  {/* Preview Button */}
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreviewImprovement(improvement)}
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      color: 'text.secondary',
                                      '&:hover': { color: 'primary.main' }
                                    }}
                                  >
                                    <PreviewIcon fontSize="small" />
                                  </IconButton>

                                  {/* Checkbox */}
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleImprovementToggle(index)}
                                    size="small"
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      p: 0
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          );
                        }) || []}
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Suggestions */}
              {analysisResult.suggestions?.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <SuggestionIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        AI Suggestions ({analysisResult.suggestions?.length || 0})
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {analysisResult.suggestions?.map((suggestion, index) => (
                        <ListItem key={`suggestion-${index}`}>
                          <ListItemText
                            primary={suggestion}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      )) || []}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Action Bar */}
      {analysisResult && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {selectedVariables.size} variables and {selectedImprovements.size} improvements selected
            </Typography>
            <Button
              variant="contained"
              onClick={handleApply}
              disabled={selectedVariables.size === 0 && selectedImprovements.size === 0}
              startIcon={<ApplyIcon />}
              fullWidth
            >
              Apply Selected Changes
            </Button>
          </Stack>
        </Box>
      )}

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onClose={() => setShowApplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply AI Enhancements</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              This will create a new template with {selectedVariables.size} variables and {selectedImprovements.size} text improvements applied.
              The original template formatting will remain exactly the same.
            </Alert>

            <TextField
              label="New Template Name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              fullWidth
              helperText="Leave empty to update the existing template"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApplyDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmApply}
            variant="contained"
            disabled={isApplying}
            startIcon={isApplying ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isApplying ? 'Applying...' : 'Apply Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Variable Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedVariable ? 'Variable Preview' : 'Text Improvement Preview'}</DialogTitle>
        <DialogContent>
          {selectedVariable && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Variable Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedVariable.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {selectedVariable.description}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Original Text
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'error.50' }}>
                  <Typography variant="body2">
                    "{selectedVariable.original_text}"
                  </Typography>
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Suggested Placeholder
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'success.50' }}>
                  <Typography variant="body2">
                    {selectedVariable.suggested_placeholder}
                  </Typography>
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Variable Details
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`Type: ${selectedVariable.type}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Confidence: ${Math.round(selectedVariable.confidence * 100)}%`}
                    color={selectedVariable.confidence > 0.8 ? 'success' : selectedVariable.confidence > 0.6 ? 'warning' : 'default'}
                    variant="outlined"
                    size="small"
                  />
                </Stack>
              </Box>

              {selectedVariable.context && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Context
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    {selectedVariable.context}
                  </Typography>
                </Box>
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                All formatting, tables, images, and document structure will remain exactly the same.
                Only the specified text will be replaced with the placeholder.
              </Alert>
            </Stack>
          )}

          {selectedImprovement && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedImprovement.location}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Original Text
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'error.50' }}>
                  <Typography variant="body2">
                    "{selectedImprovement.original_text}"
                  </Typography>
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Improved Text
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'success.50' }}>
                  <Typography variant="body2">
                    "{selectedImprovement.improved_text}"
                  </Typography>
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Improvement Type
                </Typography>
                <Chip
                  label={selectedImprovement.improvement_type || "Grammar & Clarity"}
                  color="success"
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                All formatting, tables, images, and document structure will remain exactly the same.
                Only the text content will be improved.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});