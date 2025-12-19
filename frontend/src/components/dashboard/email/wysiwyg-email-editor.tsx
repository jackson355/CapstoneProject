'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberListIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon,
} from '@mui/icons-material';

interface WYSIWYGEmailEditorProps {
  subject: string;
  body: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  variables?: Record<string, string>;
  availableVariables?: { key: string; label: string; value: string }[];
}

export function WYSIWYGEmailEditor({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  variables = {},
  availableVariables = [],
}: WYSIWYGEmailEditorProps): React.JSX.Element {
  const theme = useTheme();
  const [showPreview, setShowPreview] = React.useState<boolean>(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color: #2196F3; text-decoration: underline;',
        },
      }),
      Image,
      Underline,
      TextStyle,
      Color,
    ],
    content: body,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onBodyChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 400px; padding: 16px;',
      },
    },
  });

  React.useEffect(() => {
    if (editor && body !== editor.getHTML()) {
      editor.commands.setContent(body);
    }
  }, [body, editor]);

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || `{{${key}}}`);
    });
    return result;
  };

  const insertVariable = (variable: string): void => {
    editor?.commands.insertContent(`{{${variable}}}`);
  };

  const addLink = (): void => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = (): void => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) {
    return <Typography>Loading editor...</Typography>;
  }

  return (
    <Box>
      {/* Subject Line */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Subject Line
          </Typography>
          <TextField
            fullWidth
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Enter email subject..."
            variant="outlined"
            size="small"
          />
        </CardContent>
      </Card>

      {/* Email Body Editor */}
      <Card sx={{ mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Email Body Editor
              </Typography>
            </Box>

            {/* Formatting Toolbar */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <ButtonGroup size="small" variant="outlined">
                  <Tooltip title="Bold">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      sx={{
                        bgcolor: editor.isActive('bold') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <BoldIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Italic">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      sx={{
                        bgcolor: editor.isActive('italic') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ItalicIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Underline">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      sx={{
                        bgcolor: editor.isActive('underline') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <UnderlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>

                <ButtonGroup size="small" variant="outlined">
                  <Tooltip title="Heading 1">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      sx={{
                        bgcolor: editor.isActive('heading', { level: 1 }) ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>H1</Typography>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Heading 2">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      sx={{
                        bgcolor: editor.isActive('heading', { level: 2 }) ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>H2</Typography>
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>

                <ButtonGroup size="small" variant="outlined">
                  <Tooltip title="Bullet List">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      sx={{
                        bgcolor: editor.isActive('bulletList') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <BulletListIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Numbered List">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      sx={{
                        bgcolor: editor.isActive('orderedList') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <NumberListIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>

                <ButtonGroup size="small" variant="outlined">
                  <Tooltip title="Add Link">
                    <IconButton size="small" onClick={addLink}>
                      <LinkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Add Image">
                    <IconButton size="small" onClick={addImage}>
                      <ImageIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>

                <ButtonGroup size="small" variant="outlined">
                  <Tooltip title="Code Block">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                      sx={{
                        bgcolor: editor.isActive('codeBlock') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <CodeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Block Quote">
                    <IconButton
                      size="small"
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      sx={{
                        bgcolor: editor.isActive('blockquote') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <QuoteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>
              </Stack>
            </Box>

            {/* Editor Content */}
            <Box
              sx={{
                '& .ProseMirror': {
                  minHeight: '400px',
                  '& p': { margin: '0.5em 0' },
                  '& h1': { fontSize: '2em', fontWeight: 'bold', margin: '0.67em 0' },
                  '& h2': { fontSize: '1.5em', fontWeight: 'bold', margin: '0.75em 0' },
                  '& h3': { fontSize: '1.17em', fontWeight: 'bold', margin: '0.83em 0' },
                  '& ul, & ol': { paddingLeft: '2em', margin: '0.5em 0' },
                  '& blockquote': {
                    borderLeft: '3px solid',
                    borderColor: 'divider',
                    paddingLeft: '1em',
                    marginLeft: 0,
                    fontStyle: 'italic',
                    color: 'text.secondary',
                  },
                  '& code': {
                    bgcolor: 'action.hover',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  },
                  '& pre': {
                    bgcolor: 'action.hover',
                    padding: '1em',
                    borderRadius: '4px',
                    overflow: 'auto',
                    '& code': { bgcolor: 'transparent', padding: 0 },
                  },
                  '& img': { maxWidth: '100%', height: 'auto', borderRadius: '4px' },
                },
              }}
            >
              <EditorContent editor={editor} />
            </Box>

            {/* Preview Button */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Button
                variant={showPreview ? 'contained' : 'outlined'}
                onClick={() => setShowPreview(!showPreview)}
                fullWidth
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </Box>
          </Card>

      {/* Email Preview */}
      {showPreview && (
        <Card sx={{ mb: 3, mt: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Email Preview
            </Typography>
            <Typography variant="caption">
              This is how recipients will see your email
            </Typography>
          </Box>
          <CardContent>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {/* Subject Preview */}
              <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Subject:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {replaceVariables(subject) || <em style={{ color: theme.palette.text.disabled }}>No subject</em>}
                </Typography>
              </Box>

              {/* Body Preview */}
              <Box
                sx={{
                  '& p': { margin: '0.5em 0' },
                  '& h1': { fontSize: '2em', fontWeight: 'bold', margin: '0.67em 0' },
                  '& h2': { fontSize: '1.5em', fontWeight: 'bold', margin: '0.75em 0' },
                  '& h3': { fontSize: '1.17em', fontWeight: 'bold', margin: '0.83em 0' },
                  '& ul, & ol': { paddingLeft: '2em', margin: '0.5em 0' },
                  '& blockquote': {
                    borderLeft: '3px solid',
                    borderColor: 'divider',
                    paddingLeft: '1em',
                    marginLeft: 0,
                    fontStyle: 'italic',
                    color: 'text.secondary',
                  },
                  '& code': {
                    bgcolor: 'action.hover',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  },
                  '& pre': {
                    bgcolor: 'action.hover',
                    padding: '1em',
                    borderRadius: '4px',
                    overflow: 'auto',
                    '& code': { bgcolor: 'transparent', padding: 0 },
                  },
                  '& img': { maxWidth: '100%', height: 'auto', borderRadius: '4px' },
                  '& a': { color: 'primary.main', textDecoration: 'underline' },
                }}
                dangerouslySetInnerHTML={{ __html: replaceVariables(body) || '<p style="color: #999; font-style: italic;">Email content will appear here...</p>' }}
              />
            </Paper>
          </CardContent>
        </Card>
      )}

      {/* Available Variables Reference - Below Editor */}
      {availableVariables.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Available Variables
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click to insert these variables into your email. They will be automatically replaced with the actual values when sent.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
              {availableVariables.map((v) => (
                <Paper
                  key={v.key}
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 1,
                    },
                  }}
                  onClick={() => insertVariable(v.key)}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {v.label}
                      </Typography>
                      <Chip label="Click to insert" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    </Stack>
                    <Box sx={{
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}>
                      {`{{${v.key}}}`}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Will show as:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {v.value || <em style={{ color: theme.palette.text.disabled }}>Not available</em>}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
