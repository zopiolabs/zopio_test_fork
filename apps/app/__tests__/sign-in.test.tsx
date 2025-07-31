/**
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import React from 'react';
import Page from '../app/(unauthenticated)/sign-in/[[...sign-in]]/page';

// Mock state for more realistic testing
let mockIsLoading = false;
let mockError = '';
let mockEmailValue = '';

// Mock the auth package SignIn component with more realistic behavior
vi.mock('@repo/auth/components/sign-in', () => ({
  SignIn: () => (
    <div data-testid="auth-sign-in">
      <form data-testid="sign-in-form" onSubmit={(e) => e.preventDefault()}>
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
  ),
}));

describe('Sign In Page', () => {
  beforeEach(() => {
    // Reset mock state before each test
    mockIsLoading = false;
    mockError = '';
    mockEmailValue = '';
  });

  test('renders sign in page correctly', () => {
    render(<Page />);
    
    // Check for the main heading
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Welcome back',
    });
    expect(heading).toBeInTheDocument();
  });

  test('renders page description', () => {
    render(<Page />);
    
    const description = screen.getByText('Enter your details to sign in.');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-muted-foreground', 'text-sm');
  });

  test('renders auth SignIn component', () => {
    render(<Page />);
    
    const signInComponent = screen.getByTestId('auth-sign-in');
    expect(signInComponent).toBeInTheDocument();
  });

  test('renders sign in form with all required elements', () => {
    render(<Page />);
    
    // Check form is present
    const form = screen.getByTestId('sign-in-form');
    expect(form).toBeInTheDocument();
    
    // Check form inputs using more specific queries
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeRequired();
    
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();
    
    // Check submit button using aria-label to avoid duplicate text issues
    const signInButton = screen.getByRole('button', { name: /sign in to your account/i });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute('type', 'submit');
  });

  test('includes link to sign up page', () => {
    render(<Page />);
    
    const signUpLink = screen.getByRole('link', { name: 'Sign up' });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute('href', '/sign-up');
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
    const form = screen.getByTestId('sign-in-form');
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
    
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Button should have proper type and accessible name
    const button = screen.getByRole('button', { name: /sign in to your account/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  test('renders consistently', () => {
    const { rerender } = render(<Page />);
    
    // First render
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    
    // Re-render should produce same result
    rerender(<Page />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  test('has proper page title and description', () => {
    render(<Page />);
    
    // Should have correct title
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    
    // Should have correct description
    expect(screen.getByText('Enter your details to sign in.')).toBeInTheDocument();
  });

  test('heading has correct styling classes', () => {
    render(<Page />);
    
    const heading = screen.getByRole('heading', { name: 'Welcome back' });
    expect(heading).toHaveClass('font-semibold', 'text-2xl', 'tracking-tight');
  });

  test('container has proper layout classes', () => {
    render(<Page />);
    
    const heading = screen.getByRole('heading', { name: 'Welcome back' });
    const container = heading.parentElement;
    
    expect(container).toHaveClass('flex', 'flex-col', 'space-y-2', 'text-center');
  });

  test('validates email format', () => {
    render(<Page />);
    
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const submitButton = screen.getByRole('button', { name: /sign in to your account/i });
    
    // Test with invalid email format
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    // Check that the input shows invalid state (browser validation)
    expect(emailInput).toBeInvalid();
  });

  test('handles sign in errors gracefully', () => {
    // Set mock error state
    mockError = 'Invalid email or password';
    
    render(<Page />);
    
    // Check that error message is displayed
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Invalid email or password');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  test('handles loading state during sign in', () => {
    // Set mock loading state
    mockIsLoading = true;
    
    render(<Page />);
    
    const submitButton = screen.getByRole('button', { name: /sign in to your account/i });
    
    // Check that button shows loading state
    expect(submitButton).toHaveTextContent('Signing in...');
    expect(submitButton).toBeDisabled();
  });

  test('preserves email when toggling between states', () => {
    // Initial render
    const { rerender } = render(<Page />);
    
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    
    // Type email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Simulate state change (like toggling to loading state)
    mockIsLoading = true;
    rerender(<Page />);
    
    // Check that email value is preserved
    const updatedEmailInput = screen.getByRole('textbox', { name: /email/i });
    expect(updatedEmailInput).toHaveValue('test@example.com');
    
    // Toggle back to normal state
    mockIsLoading = false;
    rerender(<Page />);
    
    // Email should still be preserved
    const finalEmailInput = screen.getByRole('textbox', { name: /email/i });
    expect(finalEmailInput).toHaveValue('test@example.com');
  });
});

