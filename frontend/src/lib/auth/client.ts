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
          openai_api_key: options.openaiApiKey
        };
      } else {
        // New format - both variables and improvements
        payload = {
          variables: changes.variables || [],
          improvements: changes.improvements || [],
          new_template_name: options.newTemplateName,
          openai_api_key: options.openaiApiKey
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

  async getQuotations(page = 0, perPage = 10, filters?: { search?: string; status?: string; client_id?: number }): Promise<{ error?: string; data?: any }> {
    const token = localStorage.getItem('access_token');
    if (!token) return { error: 'Not authenticated' };

    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.client_id) params.set('client_id', String(filters.client_id));

      const res = await fetch(`${config.api.baseUrl}/quotations/?${params.toString()}`, {
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
      const res = await fetch(`${config.api.baseUrl}/clients?${params.toString()}`, {
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
}

export const authClient = new AuthClient();
