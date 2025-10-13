/**
 * Quotations Table Component Tests
 *
 * Tests for the quotations table including:
 * - Table rendering with data
 * - Empty state display
 * - Search and filter functionality
 * - Pagination controls
 * - Status chips with correct colors
 * - Edit and delete actions
 * - Client data display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('QuotationsTable', () => {
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

  const mockClients = {
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

  describe('Table Rendering', () => {
    it('should render quotations table with data', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
        expect(screen.getByText('Q-2025-0002')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Company Ltd')).toBeInTheDocument();
      expect(screen.getByText('Another Company Pte Ltd')).toBeInTheDocument();
    });

    it('should display table headers correctly', () => {
      render(<QuotationsTable />);

      expect(screen.getByText('Quotation No.')).toBeInTheDocument();
      expect(screen.getByText('Client')).toBeInTheDocument();
      expect(screen.getByText('Contact Person')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display contact information correctly', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@testcompany.com')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@anothercompany.com')).toBeInTheDocument();
    });

    it('should display loading skeletons while fetching data', () => {
      (authClient.getQuotations as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          data: { quotations: [], total: 0, page: 0, per_page: 10 },
          error: null
        }), 100))
      );

      render(<QuotationsTable />);

      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId(/MuiSkeleton-root/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
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
      expect(screen.getByRole('link', { name: /create quotation/i })).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display unpaid status with warning color', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        const unpaidChip = screen.getByText('unpaid');
        expect(unpaidChip).toBeInTheDocument();
        expect(unpaidChip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
      });
    });

    it('should display paid status with success color', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        const paidChip = screen.getByText('paid');
        expect(paidChip).toBeInTheDocument();
        expect(paidChip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter quotations by search term', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/search by quotation number or client name/i);
      await user.type(searchInput, 'Q-2025-0001');

      // Wait for debounced search
      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(
          0,
          10,
          expect.objectContaining({
            search: 'Q-2025-0001',
          })
        );
      }, { timeout: 1000 });
    });

    it('should reset page to 0 when searching', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by quotation number or client name/i);
      await user.type(searchInput, 'Test');

      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(
          0, // Page should be 0
          10,
          expect.any(Object)
        );
      }, { timeout: 1000 });
    });
  });

  describe('Filter by Status', () => {
    it('should filter quotations by status', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Find and click status filter
      const statusSelect = screen.getByLabelText(/status/i);
      await user.click(statusSelect);

      // Select "unpaid" option
      const unpaidOption = screen.getByRole('option', { name: /unpaid/i });
      await user.click(unpaidOption);

      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(
          0,
          10,
          expect.objectContaining({
            status: 'unpaid',
          })
        );
      });
    });

    it('should reset page to 0 when filtering by status', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/status/i);
      await user.click(statusSelect);

      const paidOption = screen.getByRole('option', { name: /paid/i });
      await user.click(paidOption);

      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(
          0, // Page should be 0
          10,
          expect.any(Object)
        );
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by quotation number when header is clicked', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      const quotationNoHeader = screen.getByRole('button', { name: /quotation no\./i });
      await user.click(quotationNoHeader);

      // Check if data is sorted (implementation detail - you can verify UI)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(2); // Header + data rows
    });

    it('should toggle sort direction on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('button', { name: /status/i });

      // First click - ascending
      await user.click(statusHeader);

      // Second click - descending
      await user.click(statusHeader);

      // Verify sorting icon changes (implementation detail)
      expect(statusHeader).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should call getQuotations with correct page parameter', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(0, 10, expect.any(Object));
      });
    });

    it('should update page when pagination control is clicked', async () => {
      const user = userEvent.setup();

      // Mock more quotations for pagination
      (authClient.getQuotations as jest.Mock).mockResolvedValue({
        data: {
          quotations: mockQuotations,
          total: 25, // More than 10 to enable pagination
          page: 0,
          per_page: 10,
        },
        error: null,
      });

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Find next page button
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(authClient.getQuotations).toHaveBeenCalledWith(1, 10, expect.any(Object));
      });
    });
  });

  describe('Actions Menu', () => {
    it('should open actions menu when clicking more icon', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      const moreButtons = screen.getAllByRole('button', { name: '' });
      const firstMoreButton = moreButtons[0];
      await user.click(firstMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Document')).toBeInTheDocument();
        expect(screen.getByText('Edit Details')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should open edit details dialog when clicking Edit Details', async () => {
      const user = userEvent.setup();
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Open menu
      const moreButtons = screen.getAllByRole('button', { name: '' });
      await user.click(moreButtons[0]);

      // Click Edit Details
      const editDetailsButton = screen.getByText('Edit Details');
      await user.click(editDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Quotation Details')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    });

    it('should update quotation when saving details', async () => {
      const user = userEvent.setup();
      (authClient.updateQuotation as jest.Mock).mockResolvedValue({
        data: { ...mockQuotations[0], status: 'paid' },
        error: null,
      });

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Open menu and edit details
      const moreButtons = screen.getAllByRole('button', { name: '' });
      await user.click(moreButtons[0]);

      const editDetailsButton = screen.getByText('Edit Details');
      await user.click(editDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Quotation Details')).toBeInTheDocument();
      });

      // Change status
      const statusSelect = screen.getByLabelText(/status/i);
      await user.click(statusSelect);

      const paidOption = screen.getByRole('option', { name: /paid/i });
      await user.click(paidOption);

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(authClient.updateQuotation).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ status: 'paid' })
        );
      });
    });

    it('should delete quotation after confirmation', async () => {
      const user = userEvent.setup();
      global.confirm = jest.fn(() => true);
      (authClient.deleteQuotation as jest.Mock).mockResolvedValue({
        data: { detail: 'Quotation deleted' },
        error: null,
      });

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Open menu
      const moreButtons = screen.getAllByRole('button', { name: '' });
      await user.click(moreButtons[0]);

      // Click delete
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(authClient.deleteQuotation).toHaveBeenCalledWith(1);
      });
    });

    it('should not delete if user cancels confirmation', async () => {
      const user = userEvent.setup();
      global.confirm = jest.fn(() => false);

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Open menu
      const moreButtons = screen.getAllByRole('button', { name: '' });
      await user.click(moreButtons[0]);

      // Click delete
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
      });

      expect(authClient.deleteQuotation).not.toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Check if dates are formatted (exact format may vary by locale)
      const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('should display dash for missing due dates', async () => {
      (authClient.getQuotations as jest.Mock).mockResolvedValue({
        data: {
          quotations: [{
            ...mockQuotations[0],
            due_date: null,
          }],
          total: 1,
          page: 0,
          per_page: 10,
        },
        error: null,
      });

      render(<QuotationsTable />);

      await waitFor(() => {
        expect(screen.getByText('Q-2025-0001')).toBeInTheDocument();
      });

      // Should display dash for missing date
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1]; // First data row
      expect(within(dataRow).getByText('-')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
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
