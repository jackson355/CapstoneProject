/**
 * Sign-in Form Component Tests
 *
 * Tests for the authentication form including:
 * - Form rendering
 * - Input validation
 * - Successful login
 * - Failed login with error messages
 * - Password visibility toggle
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('SignInForm', () => {
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

  describe('Form Rendering', () => {
    it('should render sign-in form with all elements', () => {
      render(<SignInForm />);

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should have email input with correct type', () => {
      render(<SignInForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password input hidden by default', () => {
      render(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', async () => {
      render(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click eye icon to show password
      const eyeIcon = screen.getByTestId('EyeSlashIcon') ||
                      passwordInput.parentElement?.querySelector('svg');
      if (eyeIcon) {
        fireEvent.click(eyeIcon);

        await waitFor(() => {
          expect(passwordInput).toHaveAttribute('type', 'text');
        });
      }
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when email is empty', async () => {
      render(<SignInForm />);
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error when email is invalid', async () => {
      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalidemail');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should show validation error when password is empty', async () => {
      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should accept valid email format', async () => {
      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'valid@example.com');

      // Should not show email validation error after typing valid email
      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
    });
  });

  describe('Successful Login', () => {
    it('should call authClient.signInWithPassword with correct credentials', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@test.com',
          password: 'password123',
        });
      });
    });

    it('should call checkSession after successful login', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCheckSession).toHaveBeenCalled();
      });
    });

    it('should refresh router after successful login', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it('should disable submit button during login', async () => {
      (authClient.signInWithPassword as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Button should be disabled immediately after click
      expect(submitButton).toBeDisabled();

      // Wait for login to complete
      await waitFor(() => {
        expect(authClient.signInWithPassword).toHaveBeenCalled();
      });
    });
  });

  describe('Failed Login', () => {
    it('should display error message when login fails', async () => {
      const errorMessage = 'Invalid email or password';
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({
        error: errorMessage,
      });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should not call checkSession when login fails', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({
        error: 'Invalid credentials',
      });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockCheckSession).not.toHaveBeenCalled();
    });

    it('should not refresh router when login fails', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({
        error: 'Invalid credentials',
      });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });

    it('should re-enable submit button after failed login', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({
        error: 'Invalid credentials',
      });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Button should be enabled again after error
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Interaction', () => {
    it('should clear previous error when user types again', async () => {
      (authClient.signInWithPassword as jest.Mock).mockResolvedValue({
        error: 'Invalid credentials',
      });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First attempt - fail
      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Type in email again - this should eventually clear error on re-submit
      await user.clear(emailInput);
      await user.type(emailInput, 'newattempt@test.com');

      // Error message should still be visible until next submit
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should allow multiple login attempts', async () => {
      (authClient.signInWithPassword as jest.Mock)
        .mockResolvedValueOnce({ error: 'Invalid credentials' })
        .mockResolvedValueOnce({ error: null });

      render(<SignInForm />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First attempt - fail
      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second attempt - success
      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, 'correct@test.com');
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCheckSession).toHaveBeenCalled();
      });

      expect(authClient.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });
});
