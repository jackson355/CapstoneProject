'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Alert,
  CircularProgress,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { authClient } from '@/lib/auth/client';
import { logger } from '@/lib/default-logger';

export default function EmailSettingsPage(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setStatus] = React.useState<boolean>(false);
  const [testing, setTesting] = React.useState<boolean>(false);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingsId, setSettingsId] = React.useState<number | null>(null);

  const [settings, setSettings] = React.useState({
    provider: 'smtp',
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    use_tls: true,
    use_ssl: false,
    sendgrid_api_key: '',
    from_email: '',
    from_name: '',
    reply_to_email: '',
    email_signature: '',
  });

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await authClient.getEmailSettings();
      if (response.data) {
        setSettingsId(response.data.id);
        setSettings({
          provider: response.data.provider || 'smtp',
          smtp_server: response.data.smtp_server || '',
          smtp_port: response.data.smtp_port || 587,
          smtp_username: response.data.smtp_username || '',
          smtp_password: response.data.smtp_password || '',
          use_tls: response.data.use_tls ?? true,
          use_ssl: response.data.use_ssl ?? false,
          sendgrid_api_key: response.data.sendgrid_api_key || '',
          from_email: response.data.from_email || '',
          from_name: response.data.from_name || '',
          reply_to_email: response.data.reply_to || '',
          email_signature: response.data.email_signature || '',
        });
      }
    } catch (error) {
      logger.error('Failed to fetch email settings', error);
      setMessage({ type: 'error', text: 'Failed to load email settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!settingsId) {
      setMessage({ type: 'error', text: 'Settings ID not found' });
      return;
    }

    try {
      setStatus(true);
      setMessage(null);

      // Transform reply_to_email to reply_to for backend
      const payload: any = {
        ...settings,
        reply_to: settings.reply_to_email,
      };
      delete payload.reply_to_email;

      // Only include password/API key if it's been changed (not empty)
      if (!payload.smtp_password) {
        delete payload.smtp_password;
      }
      if (!payload.sendgrid_api_key) {
        delete payload.sendgrid_api_key;
      }

      await authClient.updateEmailSettings(settingsId, payload);
      setMessage({ type: 'success', text: 'Email settings saved successfully!' });
    } catch (error) {
      logger.error('Failed to save email settings', error);
      setMessage({ type: 'error', text: 'Failed to save email settings' });
    } finally {
      setStatus(false);
    }
  };

  const handleTestConnection = async (): Promise<void> => {
    if (!settingsId) {
      setMessage({ type: 'error', text: 'Settings ID not found' });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);

      // Transform reply_to_email to reply_to for backend
      const payload: any = {
        ...settings,
        reply_to: settings.reply_to_email,
      };
      delete payload.reply_to_email;

      // Only include password/API key if it's been changed (not empty)
      if (!payload.smtp_password) {
        delete payload.smtp_password;
      }
      if (!payload.sendgrid_api_key) {
        delete payload.sendgrid_api_key;
      }

      // First save the settings
      await authClient.updateEmailSettings(settingsId, payload);

      // Then send a test email with dynamic subject based on provider
      const providerName = settings.provider === 'sendgrid' ? 'SendGrid' : 'SMTP';
      await authClient.sendEmail({
        recipient_email: settings.from_email,
        subject: `Test Email - ${providerName} Configuration`,
        body: `<p>This is a test email to verify your ${providerName} configuration.</p><p>If you receive this email, your settings are correct!</p>`,
      });

      setMessage({ type: 'success', text: `Test email sent to ${settings.from_email}. Check your inbox!` });
    } catch (error) {
      logger.error('Test email failed', error);
      setMessage({ type: 'error', text: 'Test email failed. Please check your SMTP settings.' });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({
      ...prev,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Email Settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Configure SMTP settings for sending emails from the system
          </Typography>
        </div>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {settingsId && (
          <Alert severity="info">
            {settings.provider === 'sendgrid'
              ? 'Your SendGrid API key is stored securely and not displayed. Leave the API key field empty to keep your current key, or enter a new one to update it.'
              : 'Your SMTP password is stored securely and not displayed. Leave the password field empty to keep your current password, or enter a new one to update it.'
            }
          </Alert>
        )}

        <Card>
          <CardHeader title="Email Provider" />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Email Provider</InputLabel>
                  <Select
                    value={settings.provider}
                    label="Email Provider"
                    onChange={(e) => setSettings((prev) => ({ ...prev, provider: e.target.value }))}
                  >
                    <MenuItem value="smtp">SMTP (Generic)</MenuItem>
                    <MenuItem value="sendgrid">SendGrid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {settings.provider === 'smtp' && (
          <Card>
            <CardHeader title="SMTP Configuration" />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="SMTP Server"
                  value={settings.smtp_server}
                  onChange={handleChange('smtp_server')}
                  placeholder="smtp.gmail.com"
                  helperText="SMTP server hostname"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={settings.smtp_port}
                  onChange={handleChange('smtp_port')}
                  helperText="Usually 587 for TLS"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={settings.smtp_username}
                  onChange={handleChange('smtp_username')}
                  placeholder="your-email@gmail.com"
                  helperText="SMTP username (usually your email)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.smtp_password}
                  onChange={handleChange('smtp_password')}
                  placeholder={settingsId ? "Leave empty to keep current password" : "Enter SMTP password"}
                  helperText={settingsId ? "SMTP password (leave empty to keep current)" : "SMTP password or app password"}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.use_tls}
                        onChange={handleChange('use_tls')}
                      />
                    }
                    label="Use TLS"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.use_ssl}
                        onChange={handleChange('use_ssl')}
                      />
                    }
                    label="Use SSL"
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        )}

        {settings.provider === 'sendgrid' && (
          <Card>
            <CardHeader title="SendGrid Configuration" />
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="SendGrid API Key"
                    type={showPassword ? 'text' : 'password'}
                    value={settings.sendgrid_api_key}
                    onChange={handleChange('sendgrid_api_key')}
                    placeholder={settingsId ? "Leave empty to keep current API key" : "Enter your SendGrid API key"}
                    helperText="You can find this in your SendGrid account settings"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <strong>SendGrid Setup:</strong>
                    <br />
                    1. Log in to your SendGrid account
                    <br />
                    2. Go to Settings → API Keys
                    <br />
                    3. Create a new API key with "Mail Send" permissions
                    <br />
                    4. Copy and paste the API key above
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader title="Email Details" />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  type="email"
                  value={settings.from_email}
                  onChange={handleChange('from_email')}
                  placeholder="noreply@company.com"
                  helperText="Email address shown as sender"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Name"
                  value={settings.from_name}
                  onChange={handleChange('from_name')}
                  placeholder="Your Company"
                  helperText="Name shown as sender"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reply-To Email (Optional)"
                  type="email"
                  value={settings.reply_to_email}
                  onChange={handleChange('reply_to_email')}
                  placeholder="support@company.com"
                  helperText="Email address for replies"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Email Signature" />
          <Divider />
          <CardContent>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Signature"
              value={settings.email_signature}
              onChange={handleChange('email_signature')}
              placeholder="Best regards,&#10;Your Company&#10;www.yourcompany.com"
              helperText="Signature added to all outgoing emails"
            />
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={
              saving ||
              testing ||
              !settings.from_email ||
              (settings.provider === 'smtp' && !settings.smtp_server && !settingsId) ||
              (settings.provider === 'sendgrid' && !settings.sendgrid_api_key && !settingsId)
            }
          >
            {testing ? <CircularProgress size={20} /> : 'Test Connection'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || testing}
          >
            {saving ? <CircularProgress size={20} /> : 'Save Settings'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
