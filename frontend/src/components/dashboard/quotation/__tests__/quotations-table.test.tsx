/**
 * Quotations Table Component Tests - CRITICAL TESTS ONLY
 *
 * Focuses on the most important user flows:
 * - Table rendering with data
 * - Empty state display
 * - Status display with colors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QuotationsTable } from '../quotations-table';
import { authClient } from '@/lib/auth/client';

// Mock auth client
jest.mock('@/lib/auth/client', () => ({
  authClient: {
    getQuotations: jest.fn(),
    getClientById: jest.fn(),
    updateQuotation: jest.fn(),
    deleteQuotation: jest.fn(),
  },
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

describe('QuotationsTable - Critical Tests', () => {
  const mockQuotations = [
    {
      id: 1,
      quotation_number: 'Q-2025-0001',
      client_id: 1,
      selected_contact: {
        name: 'John Doe',
        email: 'john@testcompany.com',
        phone: '+65 9123 4567',
      },
      template_id: 1,
      status: 'unpaid',
      due_date: '2025-02-15T00:00:00Z',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    },
    {
      id: 2,
      quotation_number: 'Q-2025-0002',
      client_id: 2,
      selected_contact: {
        name: 'Jane Smith',
        email: 'jane@anothercompany.com',
        phone: '+65 9234 5678',
      },
      template_id: 1,
      status: 'paid',
      due_date: '2025-02-20T00:00:00Z',
      created_at: '2025-01-16T10:00:00Z',
      updated_at: '2025-01-16T10:00:00Z',
    },
  ];

  const mockClients: Record<number, {
    id: number;
    company_name: string;
    uen: string;
    industry: string;
  }> = {
    1: {
      id: 1,
      company_name: 'Test Company Ltd',
      uen: '202012345A',
      industry: 'Technology',
    },
    2: {
      id: 2,
      company_name: 'Another Company Pte Ltd',
      uen: '202098765B',
      industry: 'Finance',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    (authClient.getQuotations as jest.Mock).mockResolvedValue({
      data: {
        quotations: mockQuotations,
        total: 2,
        page: 0,
        per_page: 10,
      },
      error: null,
    });

    (authClient.getClientById as jest.Mock).mockImplementation((clientId: number) => {
      return Promise.resolve({
        data: mockClients[clientId],
        error: null,
      });
    });
  });

  describe('✅ CRITICAL: Table Rendering', () => {
    it('should render quotations table with data', async () => {
      render(<QuotationsTable />);

      // Wait for quotations to load
      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      expect(screen.getByText('Q-2025-0002')).toBeInTheDocument();
      expect(screen.getByText('Test Company Ltd')).toBeInTheDocument();
      expect(screen.getByText('Another Company Pte Ltd')).toBeInTheDocument();
    });

    it('should display table headers correctly', async () => {
      render(<QuotationsTable />);

      // Wait for table to render
      await waitFor(() => {
        expect(screen.getByText('Quotation No.')).toBeInTheDocument();
      });

      expect(screen.getByText('Client')).toBeInTheDocument();
      expect(screen.getByText('Contact Person')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      // Status appears in header and as chip text, use getAllByText
      expect(screen.getAllByText(/status/i).length).toBeGreaterThan(0);
    });

    it('should display contact information correctly', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('john@testcompany.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@anothercompany.com')).toBeInTheDocument();
    });
  });

  describe('✅ CRITICAL: Empty State', () => {
    it('should display empty state when no quotations exist', async () => {
      (authClient.getQuotations as jest.Mock).mockResolvedValue({
        data: {
          quotations: [],
          total: 0,
          page: 0,
          per_page: 10,
        },
        error: null,
      });

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('No quotations found')).toBeInTheDocument();
      });

      expect(screen.getByText(/try adjusting your search or create a new quotation/i)).toBeInTheDocument();
    });
  });

  describe('✅ CRITICAL: Status Display', () => {
    it('should display unpaid and paid status', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('unpaid')).toBeInTheDocument();
      });

      expect(screen.getByText('paid')).toBeInTheDocument();
    });
  });

  describe('✅ CRITICAL: API Integration', () => {
    it('should call getQuotations on mount', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(
          0,
          10,
          expect.any(Object)
        );
      });
    });

    it('should fetch client data for displayed quotations', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(authClient.getClientById).toHaveBeenCalledWith(1);
        expect(authClient.getClientById).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('✅ CRITICAL: Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (authClient.getQuotations as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching quotations:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should display empty state on fetch error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (authClient.getQuotations as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('No quotations found')).toBeInTheDocument();
      });
    });
  });
});
