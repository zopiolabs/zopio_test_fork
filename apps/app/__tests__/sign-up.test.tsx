/**
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import React from 'react';
import Page from '../app/(unauthenticated)/sign-up/[[...sign-up]]/page';

// Mock state for more realistic testing
let mockIsLoading = false;
let mockError = '';
let mockEmailValue = '';
let mockPasswordValue = '';
let mockConfirmPasswordValue = '';

// Mock the auth package SignUp component with more realistic behavior
vi.mock('@repo/auth/components/sign-up', () => ({
  SignUp: () => (
    <div data-testid="auth-sign-up">
      <form data-testid="sign-up-form" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="email">Email</label>
          <input 
            id="email"
            type="email" 
            placeholder="Email" 
            data-testid="email-input"
            value={mockEmailValue}
            onChange={(e) => { mockEmailValue = e.target.value; }}
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
            value={mockPasswordValue}
            onChange={(e) => { mockPasswordValue = e.target.value; }}
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-password">Confirm Password</label>
          <input 
            id="confirm-password"
            type="password" 
            placeholder="Confirm Password" 
            data-testid="confirm-password-input"
            value={mockConfirmPasswordValue}
            onChange={(e) => { mockConfirmPasswordValue = e.target.value; }}
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
          data-testid="sign-up-button"
          disabled={mockIsLoading}
          aria-label="Create your account"
        >
          {mockIsLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p>Already have an account? <a href="/sign-in">Sign in</a></p>
    </div>
  ),
}));

describe('Sign Up Page', () => {
  beforeEach(() => {
    // Reset mock state before each test
    mockIsLoading = false;
    mockError = '';
    mockEmailValue = '';
    mockPasswordValue = '';
    mockConfirmPasswordValue = '';
  });

  test('renders sign up page correctly', () => {
    render(<Page />);
    
    // Check for the main heading
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Create an account',
    });
    expect(heading).toBeInTheDocument();
  });

  test('renders page description', () => {
    render(<Page />);
    
    const description = screen.getByText('Enter your details to get started.');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-muted-foreground', 'text-sm');
  });

  test('renders auth SignUp component', () => {
    render(<Page />);
    
    const signUpComponent = screen.getByTestId('auth-sign-up');
    expect(signUpComponent).toBeInTheDocument();
  });

  test('renders sign up form with all required elements', () => {
    render(<Page />);
    
    // Check form is present
    const form = screen.getByTestId('sign-up-form');
    expect(form).toBeInTheDocument();
    
    // Check form inputs using more specific queries
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeRequired();
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();
    
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    expect(confirmPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toBeRequired();
    
    // Check submit button using aria-label to avoid duplicate text issues
    const signUpButton = screen.getByRole('button', { name: /create your account/i });
    expect(signUpButton).toBeInTheDocument();
    expect(signUpButton).toHaveAttribute('type', 'submit');
  });

  test('includes link to sign in page', () => {
    render(<Page />);
    
    const signInLink = screen.getByRole('link', { name: 'Sign in' });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/sign-in');
  });

  test('page renders without errors', () => {
    // This test ensures the component can be rendered without throwing
    expect(() => render(<Page />)).not.toThrow();
  });

  test('component has proper semantic structure', () => {
    render(<Page />);
    
    // Should have proper heading structure
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    
    // Should have a form for user interaction
    const form = screen.getByTestId('sign-up-form');
    expect(form).toBeInTheDocument();
    
    // Should have navigation link
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  test('maintains accessibility standards', () => {
    render(<Page />);
    
    // Form inputs should have appropriate types and labels
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailInput).toHaveAttribute('type', 'email');
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    // Button should have proper type and accessible name
    const button = screen.getByRole('button', { name: /create your account/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  test('renders consistently', () => {
    const { rerender } = render(<Page />);
    
    // First render
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    
    // Re-render should produce same result
    rerender(<Page />);
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
  });

  test('has distinct content from sign in page', () => {
    render(<Page />);
    
    // Should have sign up specific heading
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    
    // Should have sign up specific description
    expect(screen.getByText('Enter your details to get started.')).toBeInTheDocument();
    
    // Should have sign up specific button
    expect(screen.getByRole('button', { name: /create your account/i })).toHaveTextContent('Create account');
    
    // Should have link to sign in (opposite direction from sign in page)
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('includes password confirmation field', () => {
    render(<Page />);
    
    // Sign up should have an additional password confirmation field
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    expect(confirmPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toBeRequired();
  });

  test('heading has correct styling classes', () => {
    render(<Page />);
    
    const heading = screen.getByRole('heading', { name: 'Create an account' });
    expect(heading).toHaveClass('font-semibold', 'text-2xl', 'tracking-tight');
  });

  test('container has proper layout classes', () => {
    render(<Page />);
    
    const heading = screen.getByRole('heading', { name: 'Create an account' });
    const container = heading.parentElement;
    
    expect(container).toHaveClass('flex', 'flex-col', 'space-y-2', 'text-center');
  });

  test('validates email format', () => {
    render(<Page />);
    
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const submitButton = screen.getByRole('button', { name: /create your account/i });
    
    // Test with invalid email format
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    // Check that the input shows invalid state (browser validation)
    expect(emailInput).toBeInvalid();
  });

  test('handles sign up errors gracefully', () => {
    // Set mock error state
    mockError = 'Email is already registered';
    
    render(<Page />);
    
    // Check that error message is displayed
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Email is already registered');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  test('handles loading state during sign up', () => {
    // Set mock loading state
    mockIsLoading = true;
    
    render(<Page />);
    
    const submitButton = screen.getByRole('button', { name: /create your account/i });
    
    // Check that button shows loading state
    expect(submitButton).toHaveTextContent('Creating account...');
    expect(submitButton).toBeDisabled();
  });

  test('preserves form values when toggling between states', () => {
    // Initial render
    const { rerender } = render(<Page />);
    
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    // Type values
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    // Simulate state change (like toggling to loading state)
    mockIsLoading = true;
    rerender(<Page />);
    
    // Check that values are preserved
    const updatedEmailInput = screen.getByRole('textbox', { name: /email/i });
    const updatedPasswordInput = screen.getByLabelText(/^password$/i);
    const updatedConfirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    expect(updatedEmailInput).toHaveValue('test@example.com');
    expect(updatedPasswordInput).toHaveValue('password123');
    expect(updatedConfirmPasswordInput).toHaveValue('password123');
    
    // Toggle back to normal state
    mockIsLoading = false;
    rerender(<Page />);
    
    // Values should still be preserved
    const finalEmailInput = screen.getByRole('textbox', { name: /email/i });
    const finalPasswordInput = screen.getByLabelText(/^password$/i);
    const finalConfirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    expect(finalEmailInput).toHaveValue('test@example.com');
    expect(finalPasswordInput).toHaveValue('password123');
    expect(finalConfirmPasswordInput).toHaveValue('password123');
  });

  test('form fields are properly associated with labels', () => {
    render(<Page />);
    
    // Check that form fields have proper label associations
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailInput).toHaveAttribute('id', 'email');
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('id', 'password');
    
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    expect(confirmPasswordInput).toHaveAttribute('id', 'confirm-password');
  });

  test('form has proper semantic structure for screen readers', () => {
    render(<Page />);
    
    // Should have proper form element
    const form = screen.getByTestId('sign-up-form');
    expect(form).toBeInTheDocument();
    expect(form.tagName).toBe('FORM');
    
    // Should have proper input associations
    const emailLabel = screen.getByText('Email');
    const passwordLabel = screen.getByText(/^Password$/);
    const confirmPasswordLabel = screen.getByText('Confirm Password');
    
    expect(emailLabel).toBeInTheDocument();
    expect(passwordLabel).toBeInTheDocument();
    expect(confirmPasswordLabel).toBeInTheDocument();
    
    // Button should have proper accessibility attributes
    const button = screen.getByRole('button', { name: /create your account/i });
    expect(button).toHaveAttribute('aria-label', 'Create your account');
  });
});

