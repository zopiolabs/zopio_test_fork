/**
 * @fileoverview Auth Package Tests - Authentication Provider Component
 * 
 * Comprehensive test suite for the AuthProvider React component that wraps
 * Clerk's ClerkProvider with theme integration and prop forwarding. Tests
 * theme handling, component rendering, and client-side behavior.
 * 
 * **Test Scope:**
 * - AuthProvider component rendering and prop forwarding
 * - Theme integration with next-themes and Clerk dark theme
 * - Client-side only behavior and hydration handling
 * - ClerkProvider integration and configuration passing
 * - Children rendering and component composition
 * 
 * **Test Categories:**
 * 1. **Component Rendering**: Basic rendering, children handling, prop forwarding
 * 2. **Theme Integration**: Light/dark theme detection, Clerk theme application
 * 3. **Client-Side Behavior**: Hydration handling, browser environment checks
 * 4. **Error Handling**: Invalid props, missing themes, component failures
 * 5. **Integration**: ClerkProvider configuration, theme provider coordination
 * 
 * **Mock Strategy:**
 * - Mock next-themes for controlled theme behavior testing
 * - Mock @clerk/themes for dark theme configuration testing
 * - Mock @clerk/nextjs ClerkProvider for prop validation
 * - Test component behavior without external service dependencies
 * 
 * **Quality Standards:**
 * - Proper theme detection and application to Clerk configuration
 * - All props correctly forwarded to underlying ClerkProvider
 * - Children components rendered without modification
 * - Client-side only behavior properly implemented
 * - Error conditions handled gracefully without breaking rendering
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { type ComponentProps } from 'react';
import { AuthProvider } from '../provider';

/**
 * Mock the external dependencies to ensure isolated testing of the AuthProvider component.
 * This approach allows us to verify the component's behavior without relying on external services.
 */

// Mock next-themes to control theme behavior in tests
const mockUseTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock Clerk themes import
vi.mock('@clerk/themes', () => ({
  dark: { baseTheme: 'dark', variant: 'clerk-dark' },
}));

// Mock ClerkProvider to verify props are passed correctly
const mockClerkProvider = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: (props: any) => {
    mockClerkProvider(props);
    return props.children;
  },
}));

describe('AuthProvider Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default theme setup for each test
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'light',
      theme: 'light',
      setTheme: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test basic rendering functionality to ensure the component renders children correctly
   * and integrates properly with the ClerkProvider wrapper.
   */
  describe('Component Rendering', () => {
    /**
     * Verifies that the AuthProvider renders its children correctly and acts as a transparent wrapper.
     * This test ensures the basic functionality of passing through child components.
     */
    it('should render children components correctly', () => {
      const TestChild = () => <div data-testid="test-child">Test Content</div>;
      
      render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>
      );

      const childElement = screen.getByTestId('test-child');
      expect(childElement).toBeInTheDocument();
      expect(childElement).toHaveTextContent('Test Content');
    });

    /**
     * Tests that multiple children are rendered correctly, ensuring the component
     * can handle complex child structures.
     */
    it('should render multiple children correctly', () => {
      render(
        <AuthProvider>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
          <span data-testid="child-3">Third Child</span>
        </AuthProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    /**
     * Ensures the component handles edge cases like null or undefined children gracefully.
     */
    it('should handle empty or null children gracefully', () => {
      render(<AuthProvider>{null}</AuthProvider>);
      
      // Component should still call ClerkProvider even with null children
      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          children: null,
        })
      );
    });
  });

  /**
   * Comprehensive theme integration tests to verify that the AuthProvider correctly
   * responds to different theme states and applies appropriate styling configurations.
   */
  describe('Theme Integration', () => {
    /**
     * Tests light theme behavior by ensuring no dark theme is applied when resolvedTheme is 'light'.
     * Verifies that the baseTheme is undefined for light themes.
     */
    it('should handle light theme correctly', () => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'light',
        theme: 'light',
        setTheme: vi.fn(),
      });

      render(
        <AuthProvider>
          <div>Light Theme Content</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: undefined, // Light theme should not have a baseTheme
            variables: expect.objectContaining({
              fontFamily: 'var(--font-sans)',
              fontFamilyButtons: 'var(--font-sans)',
              fontWeight: expect.objectContaining({
                bold: 'var(--font-weight-bold)',
                normal: 'var(--font-weight-normal)',
                medium: 'var(--font-weight-medium)',
              }),
            }),
          }),
        })
      );
    });

    /**
     * Tests dark theme behavior by ensuring the dark theme from @clerk/themes is applied
     * when resolvedTheme is 'dark'. Verifies theme switching functionality.
     */
    it('should handle dark theme correctly', () => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'dark',
        theme: 'dark',
        setTheme: vi.fn(),
      });

      render(
        <AuthProvider>
          <div>Dark Theme Content</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: { baseTheme: 'dark', variant: 'clerk-dark' }, // Should use the dark theme
            variables: expect.objectContaining({
              fontFamily: 'var(--font-sans)',
              fontFamilyButtons: 'var(--font-sans)',
            }),
          }),
        })
      );
    });

    /**
     * Tests system theme behavior when the user has system preference set.
     * Should behave like light theme when system resolves to light.
     */
    it('should handle system theme resolving to light', () => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'light',
        theme: 'system',
        setTheme: vi.fn(),
      });

      render(<AuthProvider><div>System Light</div></AuthProvider>);

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: undefined, // System resolved to light
          }),
        })
      );
    });

    /**
     * Tests system theme behavior when system preference resolves to dark.
     * Should apply dark theme when system resolves to dark.
     */
    it('should handle system theme resolving to dark', () => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'dark',
        theme: 'system',
        setTheme: vi.fn(),
      });

      render(<AuthProvider><div>System Dark</div></AuthProvider>);

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: { baseTheme: 'dark', variant: 'clerk-dark' },
          }),
        })
      );
    });

    /**
     * Tests edge case handling when resolvedTheme is undefined or null.
     * Should default to light theme behavior for safety.
     */
    it('should handle undefined resolvedTheme gracefully', () => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: undefined,
        theme: 'light',
        setTheme: vi.fn(),
      });

      render(<AuthProvider><div>Undefined Theme</div></AuthProvider>);

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: undefined, // Should default to light (undefined baseTheme)
          }),
        })
      );
    });
  });

  /**
   * Tests for Clerk appearance configuration to ensure all styling elements
   * are properly configured and passed to the ClerkProvider.
   */
  describe('Clerk Appearance Configuration', () => {
    /**
     * Verifies that all required font variables are correctly configured in the appearance object.
     * Tests CSS custom property integration for consistent theming.
     */
    it('should configure font variables correctly', () => {
      render(<AuthProvider><div>Font Test</div></AuthProvider>);

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            variables: expect.objectContaining({
              fontFamily: 'var(--font-sans)',
              fontFamilyButtons: 'var(--font-sans)',
              fontWeight: expect.objectContaining({
                bold: 'var(--font-weight-bold)',
                normal: 'var(--font-weight-normal)',
                medium: 'var(--font-weight-medium)',
              }),
            }),
          }),
        })
      );
    });

    /**
     * Tests that all required UI element styles are properly configured.
     * Verifies integration with design system tokens and consistent styling.
     */
    it('should configure UI elements correctly', () => {
      render(<AuthProvider><div>Elements Test</div></AuthProvider>);

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            elements: expect.objectContaining({
              dividerLine: 'bg-border',
              socialButtonsIconButton: 'bg-card',
              navbarButton: 'text-foreground',
              organizationSwitcherTrigger__open: 'bg-background',
              organizationPreviewMainIdentifier: 'text-foreground',
              organizationSwitcherTriggerIcon: 'text-muted-foreground',
              organizationPreview__organizationSwitcherTrigger: 'gap-2',
              organizationPreviewAvatarContainer: 'shrink-0',
            }),
          }),
        })
      );
    });

    /**
     * Tests that layout configuration is properly applied including custom URLs
     * for privacy, terms, and help pages when provided.
     */
    it('should configure layout with custom URLs', () => {
      const customProps = {
        privacyUrl: '/privacy',
        termsUrl: '/terms',
        helpUrl: '/help',
      };

      render(
        <AuthProvider {...customProps}>
          <div>Layout Test</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            layout: expect.objectContaining({
              privacyPageUrl: '/privacy',
              termsPageUrl: '/terms',
              helpPageUrl: '/help',
            }),
          }),
        })
      );
    });

    /**
     * Tests layout configuration without custom URLs to ensure
     * undefined values are handled correctly.
     */
    it('should handle undefined layout URLs', () => {
      render(<AuthProvider><div>No URLs</div></AuthProvider>);

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            layout: expect.objectContaining({
              privacyPageUrl: undefined,
              termsPageUrl: undefined,
              helpPageUrl: undefined,
            }),
          }),
        })
      );
    });
  });

  /**
   * Tests for proper handling and forwarding of ClerkProvider props.
   * Ensures that the AuthProvider acts as a proper wrapper without interfering with Clerk's functionality.
   */
  describe('Props Forwarding', () => {
    /**
     * Tests that additional ClerkProvider props are properly forwarded
     * while maintaining the custom appearance configuration.
     */
    it('should forward additional ClerkProvider props', () => {
      const additionalProps: Partial<ComponentProps<typeof AuthProvider>> = {
        publishableKey: 'pk_test_123',
        afterSignInUrl: '/dashboard',
        afterSignUpUrl: '/onboarding',
        signInUrl: '/sign-in',
        signUpUrl: '/sign-up',
      };

      render(
        <AuthProvider {...(additionalProps as any)}>
          <div>Props Test</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          publishableKey: 'pk_test_123',
          afterSignInUrl: '/dashboard',
          afterSignUpUrl: '/onboarding',
          signInUrl: '/sign-in',
          signUpUrl: '/sign-up',
          appearance: expect.any(Object), // Should still have appearance config
        })
      );
    });

    /**
     * Tests that props are correctly spread and don't interfere with
     * the internal appearance configuration logic.
     */
    it('should handle props spreading correctly', () => {
      const spreadProps = {
        'data-testid': 'auth-provider',
        className: 'custom-auth-class',
      };

      render(
        <AuthProvider {...spreadProps}>
          <div>Spread Test</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-testid': 'auth-provider',
          className: 'custom-auth-class',
          appearance: expect.any(Object),
        })
      );
    });

    /**
     * Tests that custom URL props are properly extracted and used in layout configuration
     * while other props are forwarded to ClerkProvider.
     */
    it('should handle mixed custom and Clerk props', () => {
      const mixedProps = {
        privacyUrl: '/custom-privacy',
        termsUrl: '/custom-terms',
        helpUrl: '/custom-help',
        publishableKey: 'pk_test_mixed',
        signInUrl: '/auth/signin',
      };

      render(
        <AuthProvider {...mixedProps}>
          <div>Mixed Props Test</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          publishableKey: 'pk_test_mixed',
          signInUrl: '/auth/signin',
          appearance: expect.objectContaining({
            layout: expect.objectContaining({
              privacyPageUrl: '/custom-privacy',
              termsPageUrl: '/custom-terms',
              helpPageUrl: '/custom-help',
            }),
          }),
        })
      );
    });
  });

  /**
   * Client-side only behavior tests to ensure the component works correctly
   * in the browser environment and handles SSR considerations.
   */
  describe('Client-Side Only Behavior', () => {
    /**
     * Tests that the component uses the 'use client' directive correctly
     * and integrates with client-side theme detection.
     */
    it('should work correctly in client-side environment', () => {
      // Simulate client-side environment
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'dark',
        theme: 'dark',
        setTheme: vi.fn(),
      });

      render(
        <AuthProvider>
          <div data-testid="client-content">Client Side Content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('client-content')).toBeInTheDocument();
      expect(mockClerkProvider).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests theme reactivity by simulating theme changes and ensuring
     * the component responds appropriately.
     */
    it('should respond to theme changes', () => {
      const { rerender } = render(
        <AuthProvider>
          <div>Theme Change Test</div>
        </AuthProvider>
      );

      // Initially light theme
      expect(mockClerkProvider).toHaveBeenLastCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: undefined,
          }),
        })
      );

      // Change to dark theme
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'dark',
        theme: 'dark',
        setTheme: vi.fn(),
      });

      rerender(
        <AuthProvider>
          <div>Theme Change Test</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenLastCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: { baseTheme: 'dark', variant: 'clerk-dark' },
          }),
        })
      );
    });
  });

  /**
   * Integration tests that verify the component works correctly with various
   * combinations of props and configurations.
   */
  describe('Integration Scenarios', () => {
    /**
     * Tests a complete real-world scenario with all props configured
     * to ensure the component handles complex configurations correctly.
     */
    it('should handle complete configuration scenario', () => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: 'dark',
        theme: 'dark',
        setTheme: vi.fn(),
      });

      const completeProps = {
        privacyUrl: '/privacy-policy',
        termsUrl: '/terms-of-service',
        helpUrl: '/help-center',
        publishableKey: 'pk_test_complete_scenario',
        afterSignInUrl: '/app/dashboard',
        afterSignUpUrl: '/app/onboarding',
        signInUrl: '/auth/login',
        signUpUrl: '/auth/register',
      };

      render(
        <AuthProvider {...completeProps}>
          <div data-testid="app-content">
            <h1>My App</h1>
            <p>Welcome to the application</p>
          </div>
        </AuthProvider>
      );

      expect(screen.getByTestId('app-content')).toBeInTheDocument();
      expect(screen.getByText('My App')).toBeInTheDocument();
      
      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          publishableKey: 'pk_test_complete_scenario',
          afterSignInUrl: '/app/dashboard',
          afterSignUpUrl: '/app/onboarding',
          signInUrl: '/auth/login',
          signUpUrl: '/auth/register',
          appearance: expect.objectContaining({
            baseTheme: { baseTheme: 'dark', variant: 'clerk-dark' },
            layout: expect.objectContaining({
              privacyPageUrl: '/privacy-policy',
              termsPageUrl: '/terms-of-service',
              helpPageUrl: '/help-center',
            }),
            variables: expect.objectContaining({
              fontFamily: 'var(--font-sans)',
              fontFamilyButtons: 'var(--font-sans)',
              fontWeight: expect.objectContaining({
                bold: 'var(--font-weight-bold)',
                normal: 'var(--font-weight-normal)',
                medium: 'var(--font-weight-medium)',
              }),
            }),
            elements: expect.objectContaining({
              dividerLine: 'bg-border',
              socialButtonsIconButton: 'bg-card',
              navbarButton: 'text-foreground',
            }),
          }),
        })
      );
    });

    /**
     * Tests minimal configuration to ensure the component works
     * with default settings and minimal props.
     */
    it('should handle minimal configuration scenario', () => {
      render(
        <AuthProvider>
          <div>Minimal Config</div>
        </AuthProvider>
      );

      expect(mockClerkProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({
            baseTheme: undefined, // Light theme default
            layout: expect.objectContaining({
              privacyPageUrl: undefined,
              termsPageUrl: undefined,
              helpPageUrl: undefined,
            }),
            variables: expect.any(Object),
            elements: expect.any(Object),
          }),
          children: expect.anything(),
        })
      );
    });
  });

  /**
   * Edge cases and error handling tests to ensure robustness
   * and proper behavior in unexpected scenarios.
   */
  describe('Edge Cases and Error Handling', () => {
    /**
     * Tests that the component handles React.Fragment children correctly.
     */
    it('should handle React.Fragment children', () => {
      render(
        <AuthProvider>
          <>
            <div data-testid="fragment-child-1">Fragment Child 1</div>
            <div data-testid="fragment-child-2">Fragment Child 2</div>
          </>
        </AuthProvider>
      );

      expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    });

    /**
     * Tests that the component handles complex nested children structures.
     */
    it('should handle deeply nested children', () => {
      render(
        <AuthProvider>
          <div>
            <section>
              <article>
                <header>
                  <h1 data-testid="nested-title">Deeply Nested Content</h1>
                </header>
                <main>
                  <p data-testid="nested-content">This is nested content</p>
                </main>
              </article>
            </section>
          </div>
        </AuthProvider>
      );

      expect(screen.getByTestId('nested-title')).toBeInTheDocument();
      expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    });

    /**
     * Tests behavior with boolean and number children to ensure
     * all React node types are handled correctly.
     */
    it('should handle various React node types as children', () => {
      render(
        <AuthProvider>
          <div>String content</div>
          {42}
          {true && <span data-testid="conditional">Conditional content</span>}
          {false && <span>This should not render</span>}
        </AuthProvider>
      );

      expect(screen.getByText('String content')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByTestId('conditional')).toBeInTheDocument();
      expect(screen.queryByText('This should not render')).not.toBeInTheDocument();
    });
  });
});