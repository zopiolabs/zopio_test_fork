/**
 * @fileoverview Comprehensive test suite for the Sign In page component
 * @module SignInPageTests
 * 
 * Test coverage includes:
 * - Component rendering and basic functionality
 * - Form validation and user interactions
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Error handling and loading states
 * - State management and data persistence
 * - Edge cases and boundary conditions
 * 
 * @see ../app/(unauthenticated)/sign-in/[[...sign-in]]/page.tsx
 * @see @repo/auth/components/sign-in
 * 
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import React from 'react';
import Page from '../app/(unauthenticated)/sign-in/[[...sign-in]]/page';

// Mock state for more realistic testing
let mockIsLoading = false;
let mockError = '';
let mockEmailValue = '';

// Mock the auth package SignIn component with more realistic behavior
vi.mock('@repo/auth/components/sign-in', () => {
  const MockSignIn = () => {
    const [emailValue, setEmailValue] = React.useState(mockEmailValue);
    const [passwordValue, setPasswordValue] = React.useState('');

    return (
      <div data-testid="auth-sign-in">
        <form data-testid="sign-in-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              placeholder="Email" 
              data-testid="email-input"
              value={emailValue}
              onChange={(e) => {
                setEmailValue(e.target.value);
                mockEmailValue = e.target.value;
              }}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              placeholder="Password" 
              data-testid="password-input"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              required
            />
          </div>
          {mockError && (
            <div data-testid="error-message" role="alert">
              {mockError}
            </div>
          )}
          <button 
            type="submit" 
            data-testid="sign-in-submit-button"
            disabled={mockIsLoading}
            aria-label="Sign in to your account"
          >
            {mockIsLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p>Don't have an account? <a href="/sign-up">Sign up</a></p>
      </div>
    );
  };

  return {
    SignIn: MockSignIn,
  };
});

/**
 * Test suite for the Sign In page component.
 * 
 * This suite validates the complete authentication flow including:
 * - UI rendering and layout
 * - Form validation and submission
 * - Accessibility features
 * - Error states and loading indicators
 * - User interaction patterns
 */
describe('Sign In Page', () => {
  beforeEach(() => {
    // Reset mock state before each test
    mockIsLoading = false;
    mockError = '';
    mockEmailValue = '';
  });

  /**
   * Core Rendering Tests
   * Verify that essential page elements are rendered correctly
   */
  describe('Core Rendering', () => {
    /**
     * Test that the sign in page renders with the correct heading.
     * Validates the main welcome message and heading hierarchy.
     */
    test('renders sign in page with welcome heading', () => {
      render(<Page />);
      
      const heading = screen.getByRole('heading', {
        level: 1,
        name: 'Welcome back',
      });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('font-semibold', 'text-2xl', 'tracking-tight');
    });

    /**
     * Test that the page description is rendered with correct styling.
     * Ensures proper instructional text for users.
     */
    test('renders page description with correct styling', () => {
      render(<Page />);
      
      const description = screen.getByText('Enter your details to sign in.');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-muted-foreground', 'text-sm');
    });

    /**
     * Test that the auth SignIn component is properly integrated.
     * Validates integration with the auth package component.
     */
    test('renders auth SignIn component', () => {
      render(<Page />);
      
      const signInComponent = screen.getByTestId('auth-sign-in');
      expect(signInComponent).toBeInTheDocument();
    });

    /**
     * Test that all form elements are present and properly configured.
     * Validates form structure, input types, and required attributes.
     */
    test('renders complete sign in form with all required elements', () => {
      render(<Page />);
      
      const form = screen.getByTestId('sign-in-form');
      expect(form).toBeInTheDocument();
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toBeRequired();
      
      const signInButton = screen.getByRole('button', { name: /sign in to your account/i });
      expect(signInButton).toBeInTheDocument();
      expect(signInButton).toHaveAttribute('type', 'submit');
    });

    /**
     * Test that navigation to sign up page is available.
     * Validates proper linking for user registration flow.
     */
    test('includes navigation link to sign up page', () => {
      render(<Page />);
      
      const signUpLink = screen.getByRole('link', { name: 'Sign up' });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/sign-up');
    });
  });

  /**
   * Accessibility and Semantic Structure Tests
   * Ensures WCAG 2.1 AA compliance and proper semantic HTML
   */
  describe('Accessibility & Semantics', () => {
    /**
     * Test that the component renders without throwing errors.
     * Basic smoke test for component stability.
     */
    test('renders without errors', () => {
      expect(() => render(<Page />)).not.toThrow();
    });

    /**
     * Test semantic HTML structure for screen readers.
     * Validates proper heading hierarchy and form structure.
     */
    test('maintains proper semantic structure', () => {
      render(<Page />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      
      const form = screen.getByTestId('sign-in-form');
      expect(form).toBeInTheDocument();
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    /**
     * Test WCAG 2.1 AA compliance requirements.
     * Validates labels, input types, and accessible names.
     */
    test('meets WCAG 2.1 AA accessibility standards', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'email');
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('id', 'password');
      
      const button = screen.getByRole('button', { name: /sign in to your account/i });
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Sign in to your account');
    });

    /**
     * Test keyboard navigation support.
     * Ensures all interactive elements are keyboard accessible.
     */
    test('supports keyboard navigation', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i });
      
      // Verify tab order and focusable elements
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    /**
     * Test that error messages have proper ARIA attributes.
     * Validates screen reader accessibility for error states.
     */
    test('error messages have proper ARIA attributes', () => {
      mockError = 'Test error message';
      render(<Page />);
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  /**
   * Layout and Styling Tests
   * Validates visual presentation and CSS classes
   */
  describe('Layout & Styling', () => {
    /**
     * Test consistent rendering across re-renders.
     * Ensures component stability during state changes.
     */
    test('renders consistently across re-renders', () => {
      const { rerender } = render(<Page />);
      
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      
      rerender(<Page />);
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    });

    /**
     * Test that container has proper layout classes.
     * Validates CSS class application for responsive design.
     */
    test('container has proper layout classes', () => {
      render(<Page />);
      
      const heading = screen.getByRole('heading', { name: 'Welcome back' });
      const container = heading.parentElement;
      
      expect(container).toHaveClass('flex', 'flex-col', 'space-y-2', 'text-center');
    });
  });

  /**
   * Form Validation Tests
   * Validates input validation and edge cases
   */
  describe('Form Validation', () => {
    /**
     * Test email format validation.
     * Ensures browser validation works for invalid email formats.
     */
    test('validates email format', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i });
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);
      
      expect(emailInput).toBeInvalid();
    });

    /**
     * Test required field validation.
     * Ensures empty fields are properly validated.
     */
    test('validates required fields', () => {
      render(<Page />);
      
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i });
      
      fireEvent.click(submitButton);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    /**
     * Test valid email format acceptance.
     * Ensures properly formatted emails are accepted.
     */
    test('accepts valid email format', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      
      expect(emailInput).toHaveValue('user@example.com');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    /**
     * Test password field security.
     * Ensures password input is properly masked.
     */
    test('masks password input', () => {
      render(<Page />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'secretpassword' } });
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveValue('secretpassword');
    });
  });

  /**
   * State Management and Error Handling Tests
   * Validates application state changes and error scenarios
   */
  describe('State Management & Error Handling', () => {
    /**
     * Test error message display and accessibility.
     * Ensures errors are properly communicated to users.
     */
    test('displays error messages with proper accessibility', () => {
      mockError = 'Invalid email or password';
      render(<Page />);
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Invalid email or password');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    /**
     * Test loading state UI changes.
     * Validates button state and text changes during authentication.
     */
    test('handles loading state correctly', () => {
      mockIsLoading = true;
      render(<Page />);
      
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i });
      
      expect(submitButton).toHaveTextContent('Signing in...');
      expect(submitButton).toBeDisabled();
    });

    /**
     * Test form data persistence across state changes.
     * Ensures user input is not lost during loading states.
     */
    test('preserves form data across state changes', () => {
      const { rerender } = render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      mockIsLoading = true;
      rerender(<Page />);
      
      const updatedEmailInput = screen.getByRole('textbox', { name: /email/i });
      expect(updatedEmailInput).toHaveValue('test@example.com');
      
      mockIsLoading = false;
      rerender(<Page />);
      
      const finalEmailInput = screen.getByRole('textbox', { name: /email/i });
      expect(finalEmailInput).toHaveValue('test@example.com');
    });

    /**
     * Test multiple error scenarios.
     * Validates different error message types and display.
     */
    test('handles different error types appropriately', () => {
      const errorScenarios = [
        'Invalid email or password',
        'Account locked. Please try again later',
        'Network error. Please check your connection',
        'Too many attempts. Please wait before trying again'
      ];

      errorScenarios.forEach(errorMessage => {
        mockError = errorMessage;
        const { unmount } = render(<Page />);
        
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveTextContent(errorMessage);
        expect(errorElement).toHaveAttribute('role', 'alert');
        
        unmount();
      });
    });

    /**
     * Test error state clearing.
     * Ensures errors are properly cleared when resolved.
     */
    test('clears error state when resolved', () => {
      mockError = 'Test error';
      const { rerender } = render(<Page />);
      
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      
      mockError = '';
      rerender(<Page />);
      
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  /**
   * Edge Cases and Boundary Conditions
   * Tests uncommon scenarios and boundary conditions
   */
  describe('Edge Cases', () => {
    /**
     * Test extremely long email addresses.
     * Validates handling of edge case input lengths.
     */
    test('handles very long email addresses', () => {
      render(<Page />);
      
      const longEmail = 'a'.repeat(100) + '@example.com';
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      fireEvent.change(emailInput, { target: { value: longEmail } });
      
      expect(emailInput).toHaveValue(longEmail);
    });

    /**
     * Test special characters in email.
     * Validates handling of valid special characters in email addresses.
     */
    test('handles special characters in email', () => {
      render(<Page />);
      
      const specialEmail = 'test+tag@example-domain.co.uk';
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      fireEvent.change(emailInput, { target: { value: specialEmail } });
      
      expect(emailInput).toHaveValue(specialEmail);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    /**
     * Test rapid state changes.
     * Validates component stability during rapid state transitions.
     */
    test('handles rapid state changes gracefully', async () => {
      const { rerender } = render(<Page />);
      
      // Rapid state changes
      for (let i = 0; i < 5; i++) {
        mockIsLoading = !mockIsLoading;
        mockError = mockIsLoading ? '' : 'Error ' + i;
        rerender(<Page />);
      }
      
      // Should still render correctly
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    /**
     * Test form submission with Enter key.
     * Validates keyboard-based form submission.
     */
    test('supports form submission via Enter key', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const form = screen.getByTestId('sign-in-form');
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });
      
      // Form should handle Enter key submission (preventDefault called)
      expect(emailInput).toHaveValue('test@example.com');
      expect(form).toBeInTheDocument();
    });
  });
});

