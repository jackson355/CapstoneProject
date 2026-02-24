'use client';

import type { User } from '@/types/user';
import { config } from '@/config';

export interface SignUpParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInWithOAuthParams {
  provider: 'google' | 'discord';
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

export interface UpdateUserParams {
  name: string;
  email: string;
  password?: string;
  role_id?: number;
}

export interface ChangePasswordParams {
  current_password: string;
  new_password: string;
}

export interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  role_id: number;
}

// Add client types
export interface CreateClientParams {
  company_name: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  postal_code?: string;
}

export interface CreateTemplateParams {
  name: string;
  description?: string;
  template_type: string;
  content: any;
  variables?: any[];
  is_ai_enhanced?: boolean;
  status?: string;
}

export interface UpdateClientParams {
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  postal_code?: string;
}

async function postFormUrlEncoded(url: string, data: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => body.append(k, v));

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

class AuthClient {
  async signUp(_: SignUpParams): Promise<{ error?: string }> {
    return { error: 'Sign up not implemented' };
  }

  async signInWithOAuth(_: SignInWithOAuthParams): Promise<{ error?: string }> {
    return { error: 'Social authentication not implemented' };
  }

  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    const { email, password } = params;

    try {
      const res = await postFormUrlEncoded(`${config.api.baseUrl}/auth/token`, {
        username: email,
        password,
      });

      if (!res.ok) {
        let message = 'Login failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      const token = data.access_token as string | undefined;
      if (!token) {
        return { error: 'No access token received' };
      }
      localStorage.setItem('access_token', token);

      // Optionally fetch current user to populate context
      try {
        const meRes = await fetch(`${config.api.baseUrl}/auth/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const mapped: User = {
            id: String(me.id ?? ''),
            name: me.name ?? undefined,
            email: me.email ?? undefined,
            role_id: me.role_id ?? undefined,
          } as any;
          localStorage.setItem('current_user', JSON.stringify(mapped));
        }
      } catch {}

      return {};
    } catch (e) {
      return { error: 'Network error' };
    }
  }

  async resetPassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Password reset not implemented' };
  }

  async updatePassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Update reset not implemented' };
  }

  async changePassword(params: ChangePasswordParams): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`${config.api.baseUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Change password failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch (e) {
      return { error: 'Network error' };
    }
  }

  async updateUser(userId: string, params: UpdateUserParams): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`${config.api.baseUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Update failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch (e) {
      return { error: 'Network error' };
    }
  }

  async createUser(params: CreateUserParams): Promise<{ error?: string; id?: number }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`${config.api.baseUrl}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Create user failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { id: data.id };
    } catch (e) {
      return { error: 'Network error' };
    }
  }

  // Client CRUD methods
  async createClient(params: CreateClientParams): Promise<{ error?: string; id?: number }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };
    try {
      const res = await fetch(`${config.api.baseUrl}/clients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        let message = 'Create client failed';
        try { const err = await res.json(); message = err.detail || message; } catch {}
        return { error: message };
      }
      const data = await res.json();
      return { id: data.id };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateClient(clientId: number, params: UpdateClientParams): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };
    try {
      const res = await fetch(`${config.api.baseUrl}/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        let message = 'Update client failed';
        try { const err = await res.json(); message = err.detail || message; } catch {}
        return { error: message };
      }
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteClient(clientId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };
    try {
      const res = await fetch(`${config.api.baseUrl}/clients/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = 'Delete client failed';
        try { const err = await res.json(); message = err.detail || message; } catch {}
        return { error: message };
      }
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  async getClientById(clientId: number): Promise<{ data?: any; error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };
    try {
      const res = await fetch(`${config.api.baseUrl}/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = 'Failed to fetch client';
        try { const err = await res.json(); message = err.detail || message; } catch {}
        return { error: message };
      }
      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getUserById(userId: string): Promise<{ data?: any; error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`${config.api.baseUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = 'Failed to fetch user';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }
      const data = await res.json();
      return { data };
    } catch (e) {
      return { error: 'Network error' };
    }
  }

  async deleteUser(userId: string): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`${config.api.baseUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = 'Delete user failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch (e) {
      return { error: 'Network error' };
    }
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { data: null };
    }

    try {
      const meRes = await fetch(`${config.api.baseUrl}/auth/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        return { data: null };
      }
      const me = await meRes.json();
      const mapped: User = {
        id: String(me.id ?? ''),
        name: me.name ?? undefined,
        email: me.email ?? undefined,
        role_id: me.role_id ?? undefined,
      } as any;
      return { data: mapped };
    } catch (e) {
      return { data: null };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    return {};
  }

  // Template API methods
  async createTemplate(params: CreateTemplateParams): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Save template failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async uploadDocxTemplate(
    file: File,
    name: string,
    description?: string,
    templateType: string = 'document'
  ): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      if (description) formData.append('description', description);
      formData.append('template_type', templateType);

      const res = await fetch(`${config.api.baseUrl}/templates/upload-docx`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let message = 'Upload template failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getTemplates(page = 0, perPage = 10): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/?page=${page}&per_page=${perPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch templates';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateTemplate(templateId: number, params: Partial<CreateTemplateParams>): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Update template failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteTemplate(templateId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Delete template failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }


  async getOnlyOfficeConfig(templateId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/onlyoffice-config/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to get OnlyOffice configuration';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createNewTemplate(name: string = 'New Template', templateType: string = 'quotation'): Promise<{ error?: string; data?: any }> {
    // Create a blank template for OnlyOffice editing
    return this.createTemplate({
      name,
      description: 'New template created for OnlyOffice editing',
      template_type: templateType,
      content: { html: '<p>Start building your template here...</p>' },
      variables: [],
      is_ai_enhanced: false,
      status: 'draft'
    });
  }

  // AI Template Conversion Methods

  async analyzeTemplateWithAI(templateId: number, openaiApiKey: string): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const formData = new FormData();
      formData.append('openai_api_key', openaiApiKey);

      const res = await fetch(`${config.api.baseUrl}/templates/ai-analyze/${templateId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let message = 'AI analysis failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async applyAISuggestions(
    templateId: number,
    changes: { variables?: any[]; improvements?: any[] } | any[],
    options: {
      newTemplateName?: string;
      openaiApiKey?: string;
      templateType?: string;
    } = {}
  ): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      let payload: any;

      // Handle both old format (array) and new format (object with variables/improvements)
      if (Array.isArray(changes)) {
        // Legacy format - treat as variables only
        payload = {
          accepted_variables: changes,
          new_template_name: options.newTemplateName,
          openai_api_key: options.openaiApiKey,
          template_type: options.templateType
        };
      } else {
        // New format - both variables and improvements
        payload = {
          variables: changes.variables || [],
          improvements: changes.improvements || [],
          new_template_name: options.newTemplateName,
          openai_api_key: options.openaiApiKey,
          template_type: options.templateType
        };
      }

      const res = await fetch(`${config.api.baseUrl}/templates/ai-apply/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Failed to apply AI suggestions';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async extractTemplateText(templateId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/ai-extract-text/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to extract template text';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Text Improvement Methods

  async improveTemplateText(
    templateId: number,
    openaiApiKey: string,
    improvementType: string = 'grammar_clarity'
  ): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const formData = new FormData();
      formData.append('openai_api_key', openaiApiKey);
      formData.append('improvement_type', improvementType);

      const res = await fetch(`${config.api.baseUrl}/templates/improve-text/${templateId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let message = 'Text improvement failed';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async applyTextImprovements(
    templateId: number,
    improvedSegments: any[],
    options: {
      createNewTemplate?: boolean;
      newTemplateName?: string;
    } = {}
  ): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const payload = {
        improved_segments: improvedSegments,
        create_new_template: options.createNewTemplate ?? true,
        new_template_name: options.newTemplateName
      };

      const res = await fetch(`${config.api.baseUrl}/templates/apply-text-improvements/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Failed to apply text improvements';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Quotation API methods

  async getQuotations(params: { page?: number; per_page?: number; search?: string; status?: string; client_id?: number } = {}): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set('page', String(params.page));
      if (params.per_page !== undefined) queryParams.set('per_page', String(params.per_page));
      if (params.search) queryParams.set('search', params.search);
      if (params.status) queryParams.set('status', params.status);
      if (params.client_id) queryParams.set('client_id', String(params.client_id));

      const res = await fetch(`${config.api.baseUrl}/quotations/?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch quotations';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createQuotation(params: {
    client_id: number;
    selected_contact: { name: string; phone?: string; email: string };
    template_id: number;
    my_company_info?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
    };
    due_date?: string;
    suffix?: string;
  }): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/quotations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to create quotation';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getQuotationById(quotationId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/quotations/${quotationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch quotation';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateQuotation(quotationId: number, params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/quotations/${quotationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to update quotation';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteQuotation(quotationId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/quotations/${quotationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to delete quotation';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  async getOnlyOfficeConfigForQuotation(quotationId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/quotations/onlyoffice-config/${quotationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to get OnlyOffice configuration';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async checkQuotationPlaceholders(quotationId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/quotations/${quotationId}/check-placeholders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to check placeholders';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getTemplatePlaceholders(templateId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/templates/${templateId}/placeholders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch template placeholders';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getClients(page = 0, perPage = 100): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      const res = await fetch(`${config.api.baseUrl}/clients/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch clients';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Partner API methods

  async getPartners(page = 0, perPage = 100, search?: string): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set('search', search);
      const res = await fetch(`${config.api.baseUrl}/partners/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch partners';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createPartner(formData: FormData): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/partners/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        let message = 'Failed to create partner';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getPartnerById(partnerId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/partners/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch partner';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updatePartner(partnerId: number, formData: FormData): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/partners/${partnerId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        let message = 'Failed to update partner';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deletePartner(partnerId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/partners/${partnerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to delete partner';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  async downloadPartnerContract(partnerId: number): Promise<{ error?: string; blob?: Blob; filename?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/partners/${partnerId}/contract`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to download contract';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition');
      let filename = 'contract.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      return { blob, filename };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Invoice API methods

  async getInvoices(params: { page?: number; per_page?: number; search?: string; status?: string; client_id?: number; quotation_id?: number } = {}): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set('page', String(params.page));
      if (params.per_page !== undefined) queryParams.set('per_page', String(params.per_page));
      if (params.search) queryParams.set('search', params.search);
      if (params.status) queryParams.set('status', params.status);
      if (params.client_id) queryParams.set('client_id', String(params.client_id));
      if (params.quotation_id) queryParams.set('quotation_id', String(params.quotation_id));

      const res = await fetch(`${config.api.baseUrl}/invoices/?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch invoices';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createInvoice(params: {
    quotation_id: number;
    template_id: number;
    my_company_info?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
    };
    due_date?: string;
  }): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/invoices/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to create invoice';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getInvoiceById(invoiceId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch invoice';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateInvoice(invoiceId: number, params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to update invoice';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteInvoice(invoiceId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to delete invoice';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  async getOnlyOfficeConfigForInvoice(invoiceId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/invoices/onlyoffice-config/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to get OnlyOffice configuration';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async checkInvoicePlaceholders(invoiceId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/invoices/${invoiceId}/check-placeholders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to check placeholders';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ==================== EMAIL API METHODS ====================

  // Email Templates
  async getEmailTemplates(params: { template_type?: string } = {}): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const queryParams = new URLSearchParams();
      if (params.template_type) queryParams.set('template_type', params.template_type);

      const res = await fetch(`${config.api.baseUrl}/emails/templates?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch email templates';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getEmailTemplateById(templateId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch email template';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createEmailTemplate(params: {
    name: string;
    subject: string;
    body: string;
    template_type: string;
    variables?: string[];
  }): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to create email template';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateEmailTemplate(templateId: number, params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to update email template';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteEmailTemplate(templateId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to delete email template';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  // Send Email
  async sendEmail(params: {
    recipient_email: string;
    recipient_name?: string;
    subject: string;
    body: string;
    quotation_id?: number;
    invoice_id?: number;
    email_template_id?: number;
    attach_document?: boolean;
  }): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to send email';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Email History
  async getEmailHistory(params: { page?: number; per_page?: number; status?: string; quotation_id?: number; invoice_id?: number; search?: string; document_type?: string } = {}): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set('page', String(params.page));
      if (params.per_page !== undefined) queryParams.set('per_page', String(params.per_page));
      if (params.status) queryParams.set('status', params.status);
      if (params.quotation_id) queryParams.set('quotation_id', String(params.quotation_id));
      if (params.invoice_id) queryParams.set('invoice_id', String(params.invoice_id));
      if (params.search) queryParams.set('search', params.search);
      if (params.document_type) queryParams.set('document_type', params.document_type);

      const res = await fetch(`${config.api.baseUrl}/emails/history?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch email history';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getEmailHistoryById(emailId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/history/${emailId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch email';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Scheduled Emails
  async getScheduledEmails(params: { page?: number; per_page?: number; status?: string; trigger_type?: string; search?: string; document_type?: string; quotation_id?: number; invoice_id?: number } = {}): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set('page', String(params.page));
      if (params.per_page !== undefined) queryParams.set('per_page', String(params.per_page));
      if (params.status) queryParams.set('status', params.status);
      if (params.trigger_type) queryParams.set('trigger_type', params.trigger_type);
      if (params.search) queryParams.set('search', params.search);
      if (params.document_type) queryParams.set('document_type', params.document_type);
      if (params.quotation_id) queryParams.set('quotation_id', String(params.quotation_id));
      if (params.invoice_id) queryParams.set('invoice_id', String(params.invoice_id));

      const res = await fetch(`${config.api.baseUrl}/emails/scheduled?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch scheduled emails';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createScheduledEmail(params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to schedule email';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async cancelScheduledEmail(scheduledEmailId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/scheduled/${scheduledEmailId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to cancel scheduled email';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  // Notifications
  async getNotifications(params: { page?: number; per_page?: number; is_read?: boolean } = {}): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set('page', String(params.page));
      if (params.per_page !== undefined) queryParams.set('per_page', String(params.per_page));
      if (params.is_read !== undefined) queryParams.set('is_read', String(params.is_read));

      const res = await fetch(`${config.api.baseUrl}/emails/notifications?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch notifications';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getUnreadNotificationsCount(): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch unread count';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = 'Failed to mark notification as read';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async markAllNotificationsAsRead(): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to mark all notifications as read';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteNotification(notificationId: number): Promise<{ error?: string }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to delete notification';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      return {};
    } catch {
      return { error: 'Network error' };
    }
  }

  // Email Automation Templates
  async getAutomationTemplates(): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/automation-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch automation templates';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async saveAutomationTemplates(templates: any[]): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/automation-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templates }),
      });

      if (!res.ok) {
        let message = 'Failed to save automation templates';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Email Settings
  async getEmailSettings(): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch email settings';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createEmailSettings(params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to create email settings';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateEmailSettings(settingsId: number, params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/emails/settings/${settingsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to update email settings';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Company Settings
  async getCompanySettings(): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/company-settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch company settings';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateCompanySettings(params: any): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/company-settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let message = 'Failed to update company settings';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // Dashboard Methods

  async getDashboardStatistics(): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const res = await fetch(`${config.api.baseUrl}/dashboard/statistics`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to fetch dashboard statistics';
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {}
        return { error: message };
      }

      const data = await res.json();
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }
}

export const authClient = new AuthClient();
