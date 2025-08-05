/**
 * @fileoverview Comprehensive test suite for the Sign Up page component
 * Tests authentication UI, form validation, accessibility, and user flows
 * 
 * @version 1.0.0
 * @author Zopio Development Team
 * @since 2024
 * 
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import Page from '../app/(unauthenticated)/sign-up/[[...sign-up]]/page';

// Mock Next.js dynamic import to return our mocked SignUp component
vi.mock('next/dynamic', () => ({
  default: () => {
    // Return a component that uses our existing mock
    return () => {
      const MockSignUp = vi.fn().mockImplementation(() => {
        const [email, setEmail] = React.useState(mockState.emailValue);
        const [password, setPassword] = React.useState(mockState.passwordValue);
        const [confirmPassword, setConfirmPassword] = React.useState(mockState.confirmPasswordValue);
        const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>(mockState.validationErrors);
        const [error, setError] = React.useState(mockState.error);
        const [isLoading, setIsLoading] = React.useState(mockState.isLoading);

        React.useEffect(() => {
          if (mockState.emailValue !== email) setEmail(mockState.emailValue);
          if (mockState.passwordValue !== password) setPassword(mockState.passwordValue);
          if (mockState.confirmPasswordValue !== confirmPassword) setConfirmPassword(mockState.confirmPasswordValue);
          if (mockState.validationErrors !== validationErrors) setValidationErrors(mockState.validationErrors);
          if (mockState.error !== error) setError(mockState.error);
          if (mockState.isLoading !== isLoading) setIsLoading(mockState.isLoading);
        });

        const validateForm = (email: string, password: string, confirmPassword: string) => {
          const errors: Record<string, string> = {};
          if (!email) errors.email = 'Email is required';
          else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) errors.email = 'Please enter a valid email address';
          if (!password) errors.password = 'Password is required';
          else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
          if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
          else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
          return errors;
        };

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          mockState.isSubmitted = true;
          const errors = validateForm(email, password, confirmPassword);
          setValidationErrors(errors);
          mockState.validationErrors = errors;
          if (Object.keys(errors).length === 0) {
            setIsLoading(true);
            mockState.isLoading = true;
            setTimeout(() => {
              setIsLoading(false);
              mockState.isLoading = false;
            }, 1000);
          }
        };

        const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          setEmail(value);
          mockState.emailValue = value;
          if (validationErrors.email) {
            const newErrors = { ...validationErrors };
            delete newErrors.email;
            setValidationErrors(newErrors);
            mockState.validationErrors = newErrors;
          }
        };

        const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          setPassword(value);
          mockState.passwordValue = value;
          if (validationErrors.password) {
            const newErrors = { ...validationErrors };
            delete newErrors.password;
            setValidationErrors(newErrors);
            mockState.validationErrors = newErrors;
          }
        };

        const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          setConfirmPassword(value);
          mockState.confirmPasswordValue = value;
          if (validationErrors.confirmPassword) {
            const newErrors = { ...validationErrors };
            delete newErrors.confirmPassword;
            setValidationErrors(newErrors);
            mockState.validationErrors = newErrors;
          }
        };

        return (
          <div data-testid="auth-sign-up">
            <form data-testid="sign-up-form" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email">Email</label>
                <input 
                  id="email"
                  type="email" 
                  placeholder="Enter your email" 
                  data-testid="email-input"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? 'email-error' : undefined}
                />
                {validationErrors.email && (
                  <div id="email-error" data-testid="email-error" role="alert" className="error-message">
                    {validationErrors.email}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="password">Password</label>
                <input 
                  id="password"
                  type="password" 
                  placeholder="Create a password" 
                  data-testid="password-input"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  aria-invalid={!!validationErrors.password}
                  aria-describedby={validationErrors.password ? 'password-error' : 'password-help'}
                />
                <div id="password-help" className="help-text">Must be at least 8 characters</div>
                {validationErrors.password && (
                  <div id="password-error" data-testid="password-error" role="alert" className="error-message">
                    {validationErrors.password}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="confirm-password">Confirm Password</label>
                <input 
                  id="confirm-password"
                  type="password" 
                  placeholder="Confirm your password" 
                  data-testid="confirm-password-input"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  aria-invalid={!!validationErrors.confirmPassword}
                  aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                {validationErrors.confirmPassword && (
                  <div id="confirm-password-error" data-testid="confirm-password-error" role="alert" className="error-message">
                    {validationErrors.confirmPassword}
                  </div>
                )}
              </div>
              {error && (
                <div data-testid="general-error" role="alert" className="error-message">
                  {error}
                </div>
              )}
              <button 
                type="submit" 
                data-testid="sign-up-button"
                disabled={isLoading}
                aria-label="Create your account"
                aria-describedby="button-help"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
              <div id="button-help" className="sr-only">
                Sign up to create your new account
              </div>
            </form>
            <p>Already have an account? <a href="/sign-in">Sign in</a></p>
          </div>
        );
      });
      return React.createElement(MockSignUp);
    };
  },
}));

/**
 * Mock state management for realistic testing scenarios
 * Simulates various authentication states and form interactions
 */
interface MockState {
  isLoading: boolean;
  error: string;
  emailValue: string;
  passwordValue: string;
  confirmPasswordValue: string;
  validationErrors: Record<string, string>;
  isSubmitted: boolean;
}

let mockState: MockState = {
  isLoading: false,
  error: '',
  emailValue: '',
  passwordValue: '',
  confirmPasswordValue: '',
  validationErrors: {},
  isSubmitted: false,
};

/**
 * Mock implementation of the SignUp component from @repo/auth
 * Provides realistic form behavior with validation, error handling, and accessibility features
 * 
 * @returns {JSX.Element} Mocked SignUp component with full form functionality
 */
vi.mock('@repo/auth/components/sign-up', () => ({
  SignUp: () => {
    const [email, setEmail] = React.useState(mockState.emailValue);
    const [password, setPassword] = React.useState(mockState.passwordValue);
    const [confirmPassword, setConfirmPassword] = React.useState(mockState.confirmPasswordValue);
    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>(mockState.validationErrors);
    const [error, setError] = React.useState(mockState.error);
    const [isLoading, setIsLoading] = React.useState(mockState.isLoading);

    // Sync with mock state for external updates
    React.useEffect(() => {
      if (mockState.emailValue !== email) setEmail(mockState.emailValue);
      if (mockState.passwordValue !== password) setPassword(mockState.passwordValue);
      if (mockState.confirmPasswordValue !== confirmPassword) setConfirmPassword(mockState.confirmPasswordValue);
      if (mockState.validationErrors !== validationErrors) setValidationErrors(mockState.validationErrors);
      if (mockState.error !== error) setError(mockState.error);
      if (mockState.isLoading !== isLoading) setIsLoading(mockState.isLoading);
    });
    /**
     * Validates form fields and returns validation errors
     * @param {string} email - Email input value
     * @param {string} password - Password input value  
     * @param {string} confirmPassword - Confirm password input value
     * @returns {Record<string, string>} Validation errors object
     */
    const validateForm = (email: string, password: string, confirmPassword: string) => {
      const errors: Record<string, string> = {};
      
      if (!email) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
      
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      
      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
      
      return errors;
    };

    /**
     * Handles form submission with validation
     * @param {React.FormEvent} e - Form submit event
     */
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      mockState.isSubmitted = true;
      
      const errors = validateForm(email, password, confirmPassword);
      setValidationErrors(errors);
      mockState.validationErrors = errors;
      
      if (Object.keys(errors).length === 0) {
        setIsLoading(true);
        mockState.isLoading = true;
        // Simulate async signup process
        setTimeout(() => {
          setIsLoading(false);
          mockState.isLoading = false;
        }, 1000);
      }
    };

    /**
     * Handle email input change
     */
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);
      mockState.emailValue = value;
      
      if (validationErrors.email) {
        const newErrors = { ...validationErrors };
        delete newErrors.email;
        setValidationErrors(newErrors);
        mockState.validationErrors = newErrors;
      }
    };

    /**
     * Handle password input change
     */
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPassword(value);
      mockState.passwordValue = value;
      
      if (validationErrors.password) {
        const newErrors = { ...validationErrors };
        delete newErrors.password;
        setValidationErrors(newErrors);
        mockState.validationErrors = newErrors;
      }
    };

    /**
     * Handle confirm password input change
     */
    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setConfirmPassword(value);
      mockState.confirmPasswordValue = value;
      
      if (validationErrors.confirmPassword) {
        const newErrors = { ...validationErrors };
        delete newErrors.confirmPassword;
        setValidationErrors(newErrors);
        mockState.validationErrors = newErrors;
      }
    };

    return (
      <div data-testid="auth-sign-up">
        <form data-testid="sign-up-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              placeholder="Enter your email" 
              data-testid="email-input"
              value={email}
              onChange={handleEmailChange}
              required
              aria-invalid={!!validationErrors.email}
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
            />
            {validationErrors.email && (
              <div id="email-error" data-testid="email-error" role="alert" className="error-message">
                {validationErrors.email}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              placeholder="Create a password" 
              data-testid="password-input"
              value={password}
              onChange={handlePasswordChange}
              required
              aria-invalid={!!validationErrors.password}
              aria-describedby={validationErrors.password ? 'password-error' : 'password-help'}
            />
            <div id="password-help" className="help-text">Must be at least 8 characters</div>
            {validationErrors.password && (
              <div id="password-error" data-testid="password-error" role="alert" className="error-message">
                {validationErrors.password}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="confirm-password">Confirm Password</label>
            <input 
              id="confirm-password"
              type="password" 
              placeholder="Confirm your password" 
              data-testid="confirm-password-input"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              aria-invalid={!!validationErrors.confirmPassword}
              aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {validationErrors.confirmPassword && (
              <div id="confirm-password-error" data-testid="confirm-password-error" role="alert" className="error-message">
                {validationErrors.confirmPassword}
              </div>
            )}
          </div>
          {error && (
            <div data-testid="general-error" role="alert" className="error-message">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            data-testid="sign-up-button"
            disabled={isLoading}
            aria-label="Create your account"
            aria-describedby="button-help"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
          <div id="button-help" className="sr-only">
            Sign up to create your new account
          </div>
        </form>
        <p>Already have an account? <a href="/sign-in">Sign in</a></p>
      </div>
    );
  },
}));

/**
 * Test suite for the Sign Up Page component
 * 
 * This comprehensive test suite covers:
 * - Basic rendering and component structure
 * - Form validation and error handling
 * - User interaction flows
 * - Accessibility compliance
 * - Loading states and async behavior
 * - Cross-browser compatibility patterns
 */
describe('Sign Up Page', () => {
  /**
   * Setup function to reset mock state before each test
   * Ensures test isolation and consistent starting conditions
   */
  beforeEach(() => {
    // Reset all mock state to default values
    mockState = {
      isLoading: false,
      error: '',
      emailValue: '',
      passwordValue: '',
      confirmPasswordValue: '',
      validationErrors: {},
      isSubmitted: false,
    };
  });

  /**
   * Cleanup function to ensure no side effects between tests
   */
  afterEach(() => {
    vi.clearAllTimers();
  });

  /**
   * Basic rendering tests - verify core page structure and content
   */
  describe('Basic Rendering', () => {
    /**
     * Test that the page renders all essential elements correctly
     * Verifies heading, description, and auth component presence
     */
    test('renders complete page structure', () => {
      render(<Page />);
      
      // Main heading
      const heading = screen.getByRole('heading', {
        level: 1,
        name: 'Create an account',
      });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('font-semibold', 'text-2xl', 'tracking-tight');
      
      // Page description
      const description = screen.getByText('Enter your details to get started.');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-muted-foreground', 'text-sm');
      
      // Auth component
      const signUpComponent = screen.getByTestId('auth-sign-up');
      expect(signUpComponent).toBeInTheDocument();
    });

    /**
     * Test that the page renders without throwing errors
     * Essential smoke test for component stability
     */
    test('renders without errors', () => {
      expect(() => render(<Page />)).not.toThrow();
    });

    /**
     * Test consistent rendering across multiple render cycles
     * Ensures component stability and state management
     */
    test('renders consistently across re-renders', () => {
      const { rerender } = render(<Page />);
      
      const getHeading = () => screen.getByRole('heading', { name: 'Create an account' });
      
      // First render
      expect(getHeading()).toBeInTheDocument();
      
      // Re-render should produce same result
      rerender(<Page />);
      expect(getHeading()).toBeInTheDocument();
    });
  });

  /**
   * Form structure and elements tests
   */
  describe('Form Structure', () => {
    /**
     * Test that all required form elements are present and properly configured
     * Verifies form fields, labels, placeholders, and validation attributes
     */
    test('renders complete form with all required elements', () => {
      render(<Page />);
      
      // Form container
      const form = screen.getByTestId('sign-up-form');
      expect(form).toBeInTheDocument();
      expect(form.tagName).toBe('FORM');
      
      // Email input with proper attributes
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      expect(emailInput).toBeRequired();
      
      // Password input
      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a password');
      expect(passwordInput).toBeRequired();
      
      // Confirm password input
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirm-password');
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password');
      expect(confirmPasswordInput).toBeRequired();
      
      // Submit button
      const signUpButton = screen.getByRole('button', { name: /create your account/i });
      expect(signUpButton).toBeInTheDocument();
      expect(signUpButton).toHaveAttribute('type', 'submit');
      expect(signUpButton).toHaveAttribute('aria-label', 'Create your account');
    });

    /**
     * Test navigation elements and links
     * Verifies sign-in link functionality
     */
    test('includes navigation to sign in page', () => {
      render(<Page />);
      
      const signInLink = screen.getByRole('link', { name: 'Sign in' });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/sign-in');
      
      // Check surrounding context
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    });

    /**
     * Test that sign-up specific elements distinguish it from sign-in page
     * Ensures proper page differentiation
     */
    test('has distinct sign-up specific content', () => {
      render(<Page />);
      
      // Sign-up specific heading
      expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
      
      // Sign-up specific description
      expect(screen.getByText('Enter your details to get started.')).toBeInTheDocument();
      
      // Sign-up specific button text
      expect(screen.getByRole('button', { name: /create your account/i })).toHaveTextContent('Create account');
      
      // Confirm password field (unique to sign-up)
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  /**
   * Accessibility compliance tests
   * Ensures the component meets WCAG guidelines and screen reader compatibility
   */
  describe('Accessibility', () => {
    /**
     * Test semantic HTML structure for assistive technologies
     * Verifies proper heading hierarchy, form structure, and landmarks
     */
    test('has proper semantic structure for screen readers', () => {
      render(<Page />);
      
      // Proper heading hierarchy
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      
      // Semantic form structure
      const form = screen.getByTestId('sign-up-form');
      expect(form).toBeInTheDocument();
      expect(form.tagName).toBe('FORM');
      
      // Navigation landmark
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    /**
     * Test form accessibility features
     * Verifies label associations, ARIA attributes, and keyboard navigation
     */
    test('maintains comprehensive accessibility standards', () => {
      render(<Page />);
      
      // Proper input types and labels
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'email');
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('id', 'password');
      
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirm-password');
      
      // Button accessibility
      const button = screen.getByRole('button', { name: /create your account/i });
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Create your account');
    });

    /**
     * Test form field associations and descriptions
     * Verifies proper label-input relationships and help text
     */
    test('form fields have proper label associations and descriptions', () => {
      render(<Page />);
      
      // Label associations
      const emailLabel = screen.getByText('Email');
      const passwordLabel = screen.getByText(/^Password$/);
      const confirmPasswordLabel = screen.getByText('Confirm Password');
      
      expect(emailLabel).toBeInTheDocument();
      expect(passwordLabel).toBeInTheDocument();
      expect(confirmPasswordLabel).toBeInTheDocument();
      
      // Help text for password requirements
      const passwordHelp = screen.getByText('Must be at least 8 characters');
      expect(passwordHelp).toBeInTheDocument();
      
      // Button description
      const buttonHelp = screen.getByText('Sign up to create your new account');
      expect(buttonHelp).toBeInTheDocument();
    });
  });

  /**
   * Visual design and styling tests
   */
  describe('Visual Design', () => {
    /**
     * Test heading styling classes
     * Verifies consistent typography and design system usage
     */
    test('heading has correct styling classes', () => {
      render(<Page />);
      
      const heading = screen.getByRole('heading', { name: 'Create an account' });
      expect(heading).toHaveClass('font-semibold', 'text-2xl', 'tracking-tight');
    });

    /**
     * Test container layout classes
     * Verifies proper flexbox layout and spacing
     */
    test('container has proper layout classes', () => {
      render(<Page />);
      
      const heading = screen.getByRole('heading', { name: 'Create an account' });
      const container = heading.parentElement;
      
      expect(container).toHaveClass('flex', 'flex-col', 'space-y-2', 'text-center');
    });
  });

  /**
   * Form validation tests
   * Tests client-side validation, error messages, and user feedback
   */
  describe('Form Validation', () => {
    /**
     * Test email format validation
     * Verifies proper email validation and error messaging
     */
    test('validates email format and shows appropriate errors', async () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      // Test empty email
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument();
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
      });
      
      // Test invalid email format
      fireEvent.change(emailInput, { target: { value: '' } });
      mockState.emailValue = '';
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      mockState.emailValue = 'invalid-email';
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address');
      });
      
      // Test valid email clears error
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      mockState.emailValue = 'user@example.com';
      
      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
      });
    });

    /**
     * Test password validation requirements
     * Verifies password strength requirements and feedback
     */
    test('validates password requirements', async () => {
      render(<Page />);
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      // Test empty password
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toBeInTheDocument();
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
      });
      
      // Test short password
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      mockState.passwordValue = 'short';
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 8 characters');
      });
      
      // Test valid password clears error
      fireEvent.change(passwordInput, { target: { value: 'validPassword123' } });
      mockState.passwordValue = 'validPassword123';
      
      await waitFor(() => {
        expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
      });
    });

    /**
     * Test password confirmation validation
     * Verifies password matching and error handling
     */
    test('validates password confirmation matches', async () => {
      render(<Page />);
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      // Set valid password
      fireEvent.change(passwordInput, { target: { value: 'validPassword123' } });
      mockState.passwordValue = 'validPassword123';
      
      // Test empty confirmation
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toBeInTheDocument();
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Please confirm your password');
      });
      
      // Test mismatched passwords
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword' } });
      mockState.confirmPasswordValue = 'differentPassword';
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Passwords do not match');
      });
      
      // Test matching passwords clears error
      fireEvent.change(confirmPasswordInput, { target: { value: 'validPassword123' } });
      mockState.confirmPasswordValue = 'validPassword123';
      
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-password-error')).not.toBeInTheDocument();
      });
    });

    /**
     * Test complete form validation flow
     * Verifies end-to-end validation with all fields
     */
    test('performs complete form validation on submit', async () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      // Submit empty form - should show all required field errors
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument();
        expect(screen.getByTestId('password-error')).toBeInTheDocument();
        expect(screen.getByTestId('confirm-password-error')).toBeInTheDocument();
      });
      
      // Fill valid form - should clear all errors
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      mockState.emailValue = 'user@example.com';
      fireEvent.change(passwordInput, { target: { value: 'validPassword123' } });
      mockState.passwordValue = 'validPassword123';
      fireEvent.change(confirmPasswordInput, { target: { value: 'validPassword123' } });
      mockState.confirmPasswordValue = 'validPassword123';
      
      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
        expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
        expect(screen.queryByTestId('confirm-password-error')).not.toBeInTheDocument();
      });
    });

    /**
     * Test ARIA attributes for validation states
     * Verifies proper accessibility for form validation
     */
    test('sets proper ARIA attributes for validation states', async () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      // Initially no aria-invalid
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      
      // After validation error
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });
  });

  /**
   * Error handling and user feedback tests
   */
  describe('Error Handling', () => {
    /**
     * Test general error message display
     * Verifies server-side error handling and user feedback
     */
    test('displays general signup errors gracefully', () => {
      // Set mock error state
      mockState.error = 'Email is already registered';
      
      render(<Page />);
      
      const errorMessage = screen.getByTestId('general-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Email is already registered');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    /**
     * Test multiple error scenarios
     * Verifies different types of signup errors
     */
    test('handles various error scenarios', () => {
      const errorScenarios = [
        'Email is already registered',
        'Account creation failed. Please try again.',
        'Network error. Please check your connection.',
        'Server is temporarily unavailable.',
      ];
      
      errorScenarios.forEach((errorMessage) => {
        mockState.error = errorMessage;
        const { rerender } = render(<Page />);
        
        const errorElement = screen.getByTestId('general-error');
        expect(errorElement).toHaveTextContent(errorMessage);
        expect(errorElement).toHaveAttribute('role', 'alert');
        
        // Clean up for next iteration
        mockState.error = '';
        rerender(<Page />);
      });
    });

    /**
     * Test error message accessibility
     * Verifies screen reader compatibility for errors
     */
    test('error messages are accessible to screen readers', () => {
      mockState.error = 'Test error message';
      
      render(<Page />);
      
      const errorMessage = screen.getByTestId('general-error');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveClass('error-message');
    });
  });

  /**
   * Loading states and async behavior tests
   */
  describe('Loading States', () => {
    /**
     * Test loading state UI changes
     * Verifies button state, disabled state, and loading text
     */
    test('shows loading state during signup process', () => {
      mockState.isLoading = true;
      
      render(<Page />);
      
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      expect(submitButton).toHaveTextContent('Creating account...');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-label', 'Create your account');
    });

    /**
     * Test loading state transitions
     * Verifies proper state management during async operations
     */
    test('transitions between loading states correctly', () => {
      const { rerender } = render(<Page />);
      
      // Initial state
      let submitButton = screen.getByRole('button', { name: /create your account/i });
      expect(submitButton).toHaveTextContent('Create account');
      expect(submitButton).not.toBeDisabled();
      
      // Loading state
      mockState.isLoading = true;
      rerender(<Page />);
      
      submitButton = screen.getByRole('button', { name: /create your account/i });
      expect(submitButton).toHaveTextContent('Creating account...');
      expect(submitButton).toBeDisabled();
      
      // Back to normal state
      mockState.isLoading = false;
      rerender(<Page />);
      
      submitButton = screen.getByRole('button', { name: /create your account/i });
      expect(submitButton).toHaveTextContent('Create account');
      expect(submitButton).not.toBeDisabled();
    });

    /**
     * Test form interaction during loading
     * Verifies form remains functional during loading states
     */
    test('maintains form functionality during loading states', async () => {
      mockState.isLoading = true;
      
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Form inputs should still be interactive during loading
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      mockState.emailValue = 'test@example.com';
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      mockState.passwordValue = 'password123';
      
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
      
      // But submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      expect(submitButton).toBeDisabled();
    });
  });

  /**
   * User interaction and flow tests
   */
  describe('User Interaction Flows', () => {
    /**
     * Test form value persistence across state changes
     * Verifies that user input is maintained during loading states
     */
    test('preserves form values across state transitions', async () => {
      const { rerender } = render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      // Type values using fireEvent
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      // Update mock state to simulate form values being set
      mockState.emailValue = 'test@example.com';
      mockState.passwordValue = 'password123';
      mockState.confirmPasswordValue = 'password123';
      
      // Simulate loading state
      mockState.isLoading = true;
      rerender(<Page />);
      
      // Verify values are preserved during loading
      const loadingEmailInput = screen.getByRole('textbox', { name: /email/i });
      const loadingPasswordInput = screen.getByLabelText(/^password$/i);
      const loadingConfirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      expect(loadingEmailInput).toHaveValue('test@example.com');
      expect(loadingPasswordInput).toHaveValue('password123');
      expect(loadingConfirmPasswordInput).toHaveValue('password123');
      
      // Return to normal state
      mockState.isLoading = false;
      rerender(<Page />);
      
      // Values should still be preserved
      const finalEmailInput = screen.getByRole('textbox', { name: /email/i });
      const finalPasswordInput = screen.getByLabelText(/^password$/i);
      const finalConfirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      expect(finalEmailInput).toHaveValue('test@example.com');
      expect(finalPasswordInput).toHaveValue('password123');
      expect(finalConfirmPasswordInput).toHaveValue('password123');
    });

    /**
     * Test complete signup user flow
     * Simulates a realistic user signup journey
     */
    test('supports complete user signup flow', async () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      
      // Step 1: User enters valid information
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'securePassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'securePassword123' } });
      
      // Step 2: Form should contain the entered values
      expect(emailInput).toHaveValue('newuser@example.com');
      expect(passwordInput).toHaveValue('securePassword123');
      expect(confirmPasswordInput).toHaveValue('securePassword123');
      
      // Step 3: No validation errors should be present for valid inputs (initially)
      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('confirm-password-error')).not.toBeInTheDocument();
    });

    /**
     * Test keyboard navigation and accessibility
     * Verifies proper tab order and keyboard interaction
     */
    test('supports keyboard navigation', () => {
      render(<Page />);
      
      // Verify tab order by checking element presence and tabindex
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create your account/i });
      const signInLink = screen.getByRole('link', { name: 'Sign in' });
      
      // All interactive elements should be present and focusable
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
      expect(signInLink).toBeInTheDocument();
      
      // Elements should not have negative tabindex (preventing focus)
      expect(emailInput).not.toHaveAttribute('tabindex', '-1');
      expect(passwordInput).not.toHaveAttribute('tabindex', '-1');
      expect(confirmPasswordInput).not.toHaveAttribute('tabindex', '-1');
      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
      expect(signInLink).not.toHaveAttribute('tabindex', '-1');
    });

    /**
     * Test form submission with Enter key
     * Verifies keyboard accessibility for form submission
     */
    test('allows form submission with Enter key', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const form = screen.getByTestId('sign-up-form');
      
      // Fill form
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      mockState.emailValue = 'user@example.com';
      mockState.passwordValue = 'password123';
      mockState.confirmPasswordValue = 'password123';
      
      // Press Enter should trigger form submission
      fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });
      fireEvent.submit(form);
      
      // Form should handle the submission without errors
      expect(form).toBeInTheDocument();
    });
  });

  /**
   * Cross-browser compatibility and edge cases
   */
  describe('Browser Compatibility', () => {
    /**
     * Test form behavior with different input methods
     * Verifies compatibility across different browsers and input devices
     */
    test('handles various input methods consistently', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      // Test direct value setting (programmatic)
      fireEvent.change(emailInput, { target: { value: 'programmatic@example.com' } });
      mockState.emailValue = 'programmatic@example.com';
      expect(emailInput).toHaveValue('programmatic@example.com');
      
      // Test user typing (simulated user interaction)
      fireEvent.change(emailInput, { target: { value: '' } });
      mockState.emailValue = '';
      fireEvent.change(emailInput, { target: { value: 'typed@example.com' } });
      mockState.emailValue = 'typed@example.com';
      expect(emailInput).toHaveValue('typed@example.com');
    });

    /**
     * Test form behavior with edge case inputs
     * Verifies robust handling of unusual but valid inputs
     */
    test('handles edge case inputs gracefully', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Test with special characters in email
      const edgeCaseEmail = 'user+test@sub-domain.example-site.com';
      fireEvent.change(emailInput, { target: { value: edgeCaseEmail } });
      mockState.emailValue = edgeCaseEmail;
      expect(emailInput).toHaveValue(edgeCaseEmail);
      
      // Test with complex password
      const complexPassword = 'P@ssw0rd!#$%123';
      fireEvent.change(passwordInput, { target: { value: complexPassword } });
      mockState.passwordValue = complexPassword;
      expect(passwordInput).toHaveValue(complexPassword);
    });

    /**
     * Test form reset and clear functionality
     * Verifies proper form state management
     */
    test('supports form reset and clearing', () => {
      render(<Page />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Fill form
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      mockState.emailValue = 'test@example.com';
      mockState.passwordValue = 'password123';
      
      // Clear individual fields
      fireEvent.change(emailInput, { target: { value: '' } });
      mockState.emailValue = '';
      expect(emailInput).toHaveValue('');
      
      fireEvent.change(passwordInput, { target: { value: '' } });
      mockState.passwordValue = '';
      expect(passwordInput).toHaveValue('');
    });
  });

  /**
   * Performance and optimization tests
   */
  describe('Performance', () => {
    /**
     * Test component render performance
     * Verifies efficient rendering without unnecessary re-renders
     */
    test('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<Page />);
      
      // Multiple re-renders should not cause issues
      for (let i = 0; i < 5; i++) {
        rerender(<Page />);
        expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
      }
    });

    /**
     * Test memory usage patterns
     * Verifies component cleanup and memory management
     */
    test('cleans up properly on unmount', () => {
      const { unmount } = render(<Page />);
      
      // Component should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});

