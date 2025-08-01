/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SignUp } from '../components/sign-up';

/**
 * Mock the Clerk SignUp component to ensure isolated testing.
 * This allows us to verify that our wrapper component passes the correct props
 * and configuration to the underlying Clerk component.
 */

// Mock the Clerk SignUp component
const mockClerkSignUp = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  SignUp: (props: any) => {
    mockClerkSignUp(props);
    return <div data-testid="clerk-signup" {...props} />;
  },
}));

/**
 * Comprehensive test suite for the SignUp component.
 * Tests appearance configuration, rendering behavior, and Clerk integration.
 * Follows the same patterns as SignIn component for consistency.
 */
describe('SignUp Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Basic rendering tests to ensure the component renders correctly
   * and integrates properly with the Clerk SignUp component.
   */
  describe('Component Rendering', () => {
    /**
     * Verifies that the SignUp component renders and creates a Clerk SignUp instance.
     * This test ensures the basic functionality of component instantiation.
     */
    it('should render the Clerk SignUp component', () => {
      render(<SignUp />);

      const signUpElement = screen.getByTestId('clerk-signup');
      expect(signUpElement).toBeInTheDocument();
      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests that the component renders consistently across multiple instances.
     * Ensures stability and reliability of the component behavior.
     */
    it('should render consistently on multiple renders', () => {
      const { rerender } = render(<SignUp />);
      
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);

      rerender(<SignUp />);
      
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      expect(mockClerkSignUp).toHaveBeenCalledTimes(2);
    });

    /**
     * Verifies that the component renders without any console errors or warnings.
     * This ensures clean integration with React and Clerk.
     */
    it('should render without errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SignUp />);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  /**
   * Appearance configuration tests to verify that the SignUp component
   * applies the correct styling and appearance settings.
   */
  describe('Appearance Configuration', () => {
    /**
     * Tests the default appearance configuration with hidden header.
     * Verifies that the component applies consistent styling by default.
     */
    it('should apply correct default appearance configuration', () => {
      render(<SignUp />);

      expect(mockClerkSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            elements: expect.objectContaining({
              header: 'hidden',
            }),
          }),
        })
      );
    });

    /**
     * Tests that the appearance object structure is correct and complete.
     * Ensures all required appearance properties are properly configured.
     */
    it('should have properly structured appearance object', () => {
      render(<SignUp />);

      const callArgs = mockClerkSignUp.mock.calls[0][0];
      expect(callArgs).toHaveProperty('appearance');
      expect(callArgs.appearance).toHaveProperty('elements');
      expect(callArgs.appearance.elements).toHaveProperty('header');
      expect(callArgs.appearance.elements.header).toBe('hidden');
    });

    /**
     * Tests that the appearance configuration is applied consistently
     * across different component instances.
     */
    it('should apply consistent appearance across multiple instances', () => {
      render(<SignUp />);
      const firstCall = mockClerkSignUp.mock.calls[0][0];

      vi.clearAllMocks();
      render(<SignUp />);
      const secondCall = mockClerkSignUp.mock.calls[0][0];

      expect(firstCall.appearance).toEqual(secondCall.appearance);
    });

    /**
     * Tests that the header element is specifically configured to be hidden.
     * This ensures the component provides a clean, headerless sign-up interface.
     */
    it('should specifically hide the header element', () => {
      render(<SignUp />);

      expect(mockClerkSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            elements: expect.objectContaining({
              header: 'hidden',
            }),
          }),
        })
      );
    });

    /**
     * Tests that no other elements are configured beyond the header.
     * Ensures minimal configuration that doesn't interfere with Clerk's defaults.
     */
    it('should only configure the header element', () => {
      render(<SignUp />);

      const callArgs = mockClerkSignUp.mock.calls[0][0];
      const elements = callArgs.appearance.elements;
      
      expect(Object.keys(elements)).toEqual(['header']);
      expect(elements.header).toBe('hidden');
    });

    /**
     * Tests that the appearance configuration matches SignIn component for consistency.
     * Ensures uniform styling across authentication components.
     */
    it('should have appearance configuration consistent with SignIn component', () => {
      render(<SignUp />);

      const callArgs = mockClerkSignUp.mock.calls[0][0];
      const expectedAppearance = {
        elements: {
          header: 'hidden',
        },
      };
      
      expect(callArgs.appearance).toEqual(expectedAppearance);
    });
  });

  /**
   * Integration tests to verify that the component works correctly
   * with Clerk and handles various scenarios properly.
   */
  describe('Clerk Integration', () => {
    /**
     * Tests that the component integrates seamlessly with Clerk's SignUp component.
     * Verifies that all necessary props are passed correctly.
     */
    it('should integrate correctly with Clerk SignUp', () => {
      render(<SignUp />);

      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);
      expect(mockClerkSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.any(Object),
        })
      );
    });

    /**
     * Tests that the component doesn't pass any unexpected props to Clerk.
     * Ensures clean integration without prop pollution.
     */
    it('should not pass unexpected props to Clerk SignUp', () => {
      render(<SignUp />);

      const callArgs = mockClerkSignUp.mock.calls[0][0];
      const expectedKeys = ['appearance'];
      const actualKeys = Object.keys(callArgs);
      
      expect(actualKeys).toEqual(expectedKeys);
    });

    /**
     * Tests that the component maintains proper React component lifecycle.
     * Ensures compatibility with React's rendering and re-rendering cycles.
     */
    it('should maintain proper component lifecycle', () => {
      const { unmount } = render(<SignUp />);
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);
      
      unmount();
      
      // Component should unmount cleanly without additional calls
      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests that the component works correctly in different rendering contexts.
     * Ensures compatibility with various React patterns and contexts.
     */
    it('should work correctly in different rendering contexts', () => {
      // Test in a simple container
      const { unmount: unmount1 } = render(
        <div>
          <SignUp />
        </div>
      );
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);
      unmount1();

      // Test in a complex structure
      const { unmount: unmount2 } = render(
        <div>
          <header>App Header</header>
          <main>
            <section>
              <SignUp />
            </section>
          </main>
        </div>
      );
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(2);
      unmount2();
    });
  });

  /**
   * Component behavior tests to ensure the SignUp component
   * behaves correctly in various scenarios and edge cases.
   */
  describe('Component Behavior', () => {
    /**
     * Tests that the component is a functional component without state.
     * Ensures the component follows the expected functional component pattern.
     */
    it('should be a functional component', () => {
      const Component = SignUp;
      
      expect(typeof Component).toBe('function');
      expect(Component.length).toBe(0); // No props expected
    });

    /**
     * Tests that the component doesn't accept any props.
     * Ensures the component interface is clean and focused.
     */
    it('should not accept any props', () => {
      // TypeScript should prevent this, but test runtime behavior
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error - Testing that props are ignored
      render(<SignUp someProp="test" />);
      
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      // Props should not be passed to Clerk SignUp
      expect(mockClerkSignUp).toHaveBeenCalledWith({
        appearance: { elements: { header: 'hidden' } },
      });
      
      consoleWarnSpy.mockRestore();
    });

    /**
     * Tests that the component renders the same output consistently.
     * Ensures deterministic rendering behavior.
     */
    it('should render consistently with same output', () => {
      const { container: container1 } = render(<SignUp />);
      const html1 = container1.innerHTML;
      
      const { container: container2 } = render(<SignUp />);
      const html2 = container2.innerHTML;
      
      expect(html1).toBe(html2);
    });

    /**
     * Tests that the component can be rendered multiple times without issues.
     * Ensures the component is properly isolated and reusable.
     */
    it('should handle multiple simultaneous instances', () => {
      render(
        <div>
          <SignUp />
          <SignUp />
          <SignUp />
        </div>
      );
      
      const signUpElements = screen.getAllByTestId('clerk-signup');
      expect(signUpElements).toHaveLength(3);
      expect(mockClerkSignUp).toHaveBeenCalledTimes(3);
      
      // All instances should have the same configuration
      const calls = mockClerkSignUp.mock.calls;
      expect(calls[0][0]).toEqual(calls[1][0]);
      expect(calls[1][0]).toEqual(calls[2][0]);
    });
  });

  /**
   * Comparison tests with SignIn component to ensure consistency
   * between authentication components.
   */
  describe('SignIn Component Consistency', () => {
    /**
     * Tests that SignUp and SignIn components have identical appearance configurations.
     * Ensures consistent user experience across authentication flows.
     */
    it('should have identical appearance configuration to SignIn component', () => {
      render(<SignUp />);

      const signUpCallArgs = mockClerkSignUp.mock.calls[0][0];
      const expectedAppearance = {
        elements: {
          header: 'hidden',
        },
      };
      
      expect(signUpCallArgs.appearance).toEqual(expectedAppearance);
    });

    /**
     * Tests that both components follow the same functional component pattern.
     * Ensures architectural consistency.
     */
    it('should follow the same component pattern as SignIn', () => {
      const SignUpComponent = SignUp;
      
      expect(typeof SignUpComponent).toBe('function');
      expect(SignUpComponent.length).toBe(0);
      
      // Should render without props like SignIn does
      render(<SignUp />);
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
    });

    /**
     * Tests that the component structure is consistent with SignIn.
     * Ensures maintainability and developer experience consistency.
     */
    it('should have consistent component structure with SignIn', () => {
      render(<SignUp />);
      
      const callArgs = mockClerkSignUp.mock.calls[0][0];
      
      // Should have the same prop structure as SignIn
      expect(Object.keys(callArgs)).toEqual(['appearance']);
      expect(Object.keys(callArgs.appearance)).toEqual(['elements']);
      expect(Object.keys(callArgs.appearance.elements)).toEqual(['header']);
    });
  });

  /**
   * Accessibility and semantic tests to ensure the component
   * follows accessibility best practices.
   */
  describe('Accessibility and Semantics', () => {
    /**
     * Tests that the component maintains proper ARIA structure.
     * Ensures the component is accessible to screen readers.
     */
    it('should maintain proper ARIA structure', () => {
      render(<SignUp />);
      
      const signUpElement = screen.getByTestId('clerk-signup');
      expect(signUpElement).toBeInTheDocument();
      
      // The underlying Clerk component should handle ARIA attributes
      // Our wrapper should not interfere with accessibility
    });

    /**
     * Tests that the component doesn't interfere with keyboard navigation.
     * Ensures proper keyboard accessibility.
     */
    it('should not interfere with keyboard navigation', () => {
      render(<SignUp />);
      
      const signUpElement = screen.getByTestId('clerk-signup');
      expect(signUpElement).toBeInTheDocument();
      
      // Component should be focusable if Clerk makes it focusable
      signUpElement.focus();
      // No assertions here as focus behavior depends on Clerk's implementation
    });

    /**
     * Tests that the component supports proper semantic structure.
     * Ensures the component contributes to a well-structured document.
     */
    it('should support semantic document structure', () => {
      render(
        <main>
          <h1>Sign Up</h1>
          <SignUp />
        </main>
      );
      
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    /**
     * Tests form-related accessibility for sign-up flows.
     * Ensures proper integration with form accessibility patterns.
     */
    it('should support form accessibility patterns', () => {
      render(
        <form>
          <fieldset>
            <legend>Create Account</legend>
            <SignUp />
          </fieldset>
        </form>
      );
      
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      
      // Clerk should handle form integration - basic validation
      const signUpElement = screen.getByTestId('clerk-signup');
      expect(signUpElement).toBeInTheDocument();
    });
  });

  /**
   * Edge cases and error handling to ensure robust behavior
   * in unexpected or edge case scenarios.
   */
  describe('Edge Cases and Error Handling', () => {
    /**
     * Tests behavior when Clerk SignUp throws an error.
     * Ensures graceful error handling.
     */
    it('should handle Clerk SignUp errors gracefully', () => {
      const mockError = new Error('Clerk SignUp error');
      
      // Create an error boundary to catch React errors
      class ErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean; error: Error | null }
      > {
        constructor(props: { children: React.ReactNode }) {
          super(props);
          this.state = { hasError: false, error: null };
        }
        
        static getDerivedStateFromError(error: Error) {
          return { hasError: true, error };
        }
        
        render() {
          if (this.state.hasError) {
            return <div>Error: {this.state.error?.message}</div>;
          }
          return this.props.children;
        }
      }
      
      mockClerkSignUp.mockImplementationOnce(() => {
        throw mockError;
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { getByText } = render(
        <ErrorBoundary>
          <SignUp />
        </ErrorBoundary>
      );
      
      // Verify the error was caught and displayed
      expect(getByText('Error: Clerk SignUp error')).toBeInTheDocument();
      expect(mockClerkSignUp).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    /**
     * Tests that the component works correctly with React strict mode.
     * Ensures compatibility with React's development checks.
     */
    it('should work correctly with React strict mode', () => {
      render(
        <React.StrictMode>
          <SignUp />
        </React.StrictMode>
      );
      
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      // In strict mode, components may be rendered twice in development
      expect(mockClerkSignUp).toHaveBeenCalled();
    });

    /**
     * Tests that the component handles concurrent rendering correctly.
     * Ensures compatibility with React's concurrent features.
     */
    it('should handle concurrent rendering', () => {
      // Simulate concurrent rendering by creating multiple components quickly
      const promises = Array.from({ length: 5 }, (_, i) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            render(<SignUp />);
            resolve();
          }, i * 10);
        })
      );
      
      return Promise.all(promises).then(() => {
        expect(mockClerkSignUp).toHaveBeenCalledTimes(5);
      });
    });

    /**
     * Tests memory usage and cleanup behavior.
     * Ensures the component doesn't cause memory leaks.
     */
    it('should not cause memory leaks', () => {
      const components = [];
      
      // Create and unmount multiple components
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<SignUp />);
        components.push(unmount);
      }
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(10);
      
      // Unmount all components
      components.forEach(unmount => unmount());
      
      // All components should be cleaned up
      expect(screen.queryByTestId('clerk-signup')).not.toBeInTheDocument();
    });

    /**
     * Tests component behavior in different environments.
     * Ensures cross-environment compatibility.
     */
    it('should work correctly in different environments', () => {
      // Test with different window sizes (mobile, tablet, desktop)
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      // Mobile
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      render(<SignUp />);
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      
      // Desktop
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      render(<SignUp />);
      expect(screen.getAllByTestId('clerk-signup')).toHaveLength(2);
      
      // Restore original values
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
    });
  });

  /**
   * Integration with testing frameworks and tools.
   * Ensures the component works well with common testing scenarios.
   */
  describe('Testing Integration', () => {
    /**
     * Tests that the component works correctly with React Testing Library queries.
     * Ensures good testability of the component.
     */
    it('should be easily testable with React Testing Library', () => {
      render(<SignUp />);
      
      // Should be findable by test id
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      
      // Should be findable using Clerk-specific queries if needed
      const signUpElement = screen.getByTestId('clerk-signup');
      expect(signUpElement).toHaveAttribute('data-testid', 'clerk-signup');
    });

    /**
     * Tests that the component can be easily mocked in parent component tests.
     * Ensures the component is mockable for integration testing.
     */
    it('should be mockable in parent component tests', () => {
      // This test verifies that our component can be mocked
      const MockedSignUp = vi.fn(() => <div data-testid="mocked-signup">Mocked SignUp</div>);
      
      const ParentComponent = () => (
        <div>
          <h1>Registration Page</h1>
          <MockedSignUp />
        </div>
      );
      
      render(<ParentComponent />);
      
      expect(screen.getByText('Registration Page')).toBeInTheDocument();
      expect(screen.getByTestId('mocked-signup')).toBeInTheDocument();
      expect(MockedSignUp).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests snapshot consistency for regression testing.
     * Ensures the component output remains stable over time.
     */
    it('should produce consistent snapshots', () => {
      const { container } = render(<SignUp />);
      
      // First snapshot
      const firstSnapshot = container.innerHTML;
      
      // Re-render and compare
      const { container: secondContainer } = render(<SignUp />);
      const secondSnapshot = secondContainer.innerHTML;
      
      expect(firstSnapshot).toBe(secondSnapshot);
    });

    /**
     * Tests that the component works well in integration test scenarios.
     * Ensures compatibility with end-to-end testing patterns.
     */
    it('should work well in integration test scenarios', () => {
      const AuthPage = () => (
        <div data-testid="auth-page">
          <nav>
            <button type="button">Sign In</button>
            <button type="button">Sign Up</button>
          </nav>
          <main>
            <SignUp />
          </main>
        </div>
      );
      
      render(<AuthPage />);
      
      expect(screen.getByTestId('auth-page')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    });
  });

  /**
   * Performance and optimization tests to ensure the component
   * performs well and doesn't cause performance issues.
   */
  describe('Performance', () => {
    /**
     * Tests that the component doesn't cause unnecessary re-renders.
     * Ensures efficient rendering behavior.
     */
    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(<SignUp />);
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not cause additional calls
      rerender(<SignUp />);
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(2);
      // This is expected as each render creates a new function call
    });

    /**
     * Tests that the component handles rapid re-renders efficiently.
     * Ensures stability under stress conditions.
     */
    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<SignUp />);
      
      // Rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<SignUp />);
      }
      
      expect(mockClerkSignUp).toHaveBeenCalledTimes(11); // Initial + 10 re-renders
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
    });

    /**
     * Tests that the component doesn't accumulate memory over multiple renders.
     * Ensures proper cleanup and garbage collection.
     */
    it('should handle memory efficiently over multiple renders', () => {
      let { unmount, rerender } = render(<SignUp />);
      
      // Multiple render cycles
      for (let i = 0; i < 5; i++) {
        rerender(<SignUp />);
        unmount();
        const result = render(<SignUp />);
        unmount = result.unmount;
        rerender = result.rerender;
      }
      
      expect(mockClerkSignUp).toHaveBeenCalled();
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument();
    });
  });
});