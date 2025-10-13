/**
 * Sign-in Form Component Tests - CRITICAL TESTS ONLY
 *
 * Focuses on the most important user flows:
 * - Form rendering
 * - Successful login
 * - Failed login with error messages
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { SignInForm } from '../sign-in-form';
import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth client
jest.mock('@/lib/auth/client', () => ({
  authClient: {
    signInWithPassword: jest.fn(),
  },
}));

// Mock useUser hook
jest.mock('@/hooks/use-user', () => ({
  useUser: jest.fn(),
}));

describe('SignInForm - Critical Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockCheckSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useUser as jest.Mock).mockReturnValue({
      checkSession: mockCheckSession,
    });
  });

  describe('✅ CRITICAL: Form Rendering', () => {
    it('should render sign-in form with essential elements', () => {
      const { container } = render(<SignInForm />);

      // Check for heading
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

      // Check for inputs using querySelector (more reliable for MUI)
      const emailInput = container.querySelector('input[name="email"]');
      const passwordInput = container.querySelector('input[name="password"]');

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();

      // Check for button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should have correct input types', () => {
      const { container } = render(<SignInForm />);

      const emailInput = container.querySelector('input[name="email"]');
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('✅ CRITICAL: Successful Login Flow', () => {
    it('should successfully log in with valid credentials', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

      const { container } = render(<SignInForm />);
      const user = userEvent.setup();

      // Find inputs by their name attribute
      const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
      const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // User types credentials
      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should call API with correct data
      await waitFor(() => {
        expect(authClient.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@test.com',
          password: 'password123',
        });
      });

      // Should check session after login
      await waitFor(() => {
        expect(mockCheckSession).toHaveBeenCalled();
      });

      // Should refresh router
      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });
  });

  describe('✅ CRITICAL: Failed Login Flow', () => {
    it('should display error message when login fails', async () => {
      const errorMessage = 'Invalid email or password';
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({
        error: errorMessage,
      });

      const { container } = render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
      const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should NOT call checkSession on failure
      expect(mockCheckSession).not.toHaveBeenCalled();

      // Should NOT refresh router on failure
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });

  describe('✅ CRITICAL: Form Validation', () => {
    it('should show error when submitting empty email', async () => {
      render(<SignInForm />);
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when submitting empty password', async () => {
      const { container } = render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });
});
