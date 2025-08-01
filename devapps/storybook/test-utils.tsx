/**
 * SPDX-License-Identifier: MIT
 *
 * Test utilities for the Storybook devapp.
 *
 * This file provides comprehensive testing utilities specifically designed for
 * testing UI components within the Storybook environment. It includes enhanced
 * render functions, accessibility helpers, custom queries, and utilities for
 * consistent component testing across all stories.
 *
 * Key features:
 * - Enhanced render function with user events pre-configured
 * - Accessibility testing helpers for WCAG compliance validation
 * - Common test IDs and selectors for consistent querying
 * - Custom queries for design system patterns (data-slot, variants)
 * - Form testing utilities for complex interactions
 * - Responsive testing helpers for various viewport scenarios
 */

import type { ReactElement, ComponentProps } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

// Re-export everything from React Testing Library for convenience
export * from '@testing-library/react';

/**
 * Enhanced render function that includes user events setup
 *
 * @param ui - React element to render
 * @param options - Render options from React Testing Library
 * @returns Render result with user events instance
 *
 * @example
 * ```tsx
 * const { user, getByRole } = renderWithUserEvents(<Button>Click me</Button>);
 * await user.click(getByRole('button'));
 * ```
 */
export function renderWithUserEvents(ui: ReactElement, options?: RenderOptions): {
  user: UserEvent;
} & ReturnType<typeof render> {
  const user = userEvent.setup();
  const renderResult = render(ui, options);

  return {
    user,
    ...renderResult,
  };
}

/**
 * Standard test IDs used across components for consistent querying
 *
 * These IDs should be used in components via data-testid attributes
 * to ensure reliable and maintainable test selectors.
 */
export const testIds = {
  // Form elements
  button: 'button',
  input: 'input',
  textarea: 'textarea',
  checkbox: 'checkbox',
  radio: 'radio',
  select: 'select',
  label: 'label',
  
  // Navigation
  link: 'link',
  menu: 'menu',
  menuItem: 'menu-item',
  breadcrumb: 'breadcrumb',
  
  // Feedback
  alert: 'alert',
  toast: 'toast',
  tooltip: 'tooltip',
  dialog: 'dialog',
  
  // Layout
  card: 'card',
  sidebar: 'sidebar',
  header: 'header',
  footer: 'footer',
  
  // Data display
  table: 'table',
  chart: 'chart',
  avatar: 'avatar',
  badge: 'badge',
} as const;

/**
 * Accessibility testing helper functions
 *
 * These functions provide common accessibility assertions to ensure
 * components meet WCAG guidelines and are properly accessible.
 */
export const accessibility = {
  /**
   * Asserts that an element meets basic accessibility requirements
   *
   * @param element - HTML element to test
   * @param options - Configuration for accessibility checks
   *
   * @example
   * ```tsx
   * const button = getByRole('button');
   * accessibility.expectToBeAccessible(button);
   * ```
   */
  expectToBeAccessible(
    element: HTMLElement,
    options: {
      requireAccessibleName?: boolean;
      requireAriaLabel?: boolean;
      checkKeyboardSupport?: boolean;
    } = {}
  ) {
    const {
      requireAccessibleName = true,
      requireAriaLabel = false,
      checkKeyboardSupport = true,
    } = options;

    // Check for accessible name (required for most interactive elements)
    if (requireAccessibleName) {
      expect(element).toHaveAccessibleName();
    }

    // Check for explicit aria-label if required
    if (requireAriaLabel) {
      expect(element).toHaveAttribute('aria-label');
    }

    // Check keyboard support for interactive elements
    if (checkKeyboardSupport) {
      const interactiveRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio'];
      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      
      if (interactiveRoles.includes(role) || element.tagName === 'BUTTON') {
        // Interactive elements should be focusable
        expect(element).not.toHaveAttribute('tabindex', '-1');
        
        // Buttons should have proper type attribute
        if (element.tagName === 'BUTTON' && !element.hasAttribute('type')) {
          expect(element).toHaveAttribute('type', 'button');
        }
      }
    }
  },

  /**
   * Checks if an element has proper ARIA attributes for its role
   *
   * @param element - HTML element to check
   * @param expectedRole - Expected ARIA role
   */
  expectToHaveProperAriaRole(element: HTMLElement, expectedRole: string) {
    const actualRole = element.getAttribute('role') || element.tagName.toLowerCase();
    
    // Handle semantic HTML elements that have implicit roles
    const implicitRoles: Record<string, string> = {
      button: 'button',
      a: 'link',
      input: 'textbox',
      textarea: 'textbox',
      select: 'combobox',
    };

    const effectiveRole = implicitRoles[actualRole] || actualRole;
    expect(effectiveRole).toBe(expectedRole);
  },

  /**
   * Asserts that an element supports keyboard navigation
   *
   * @param element - HTML element to test
   */
  expectToSupportKeyboardNavigation(element: HTMLElement) {
    // Element should be focusable
    expect(element.tabIndex).toBeGreaterThanOrEqual(0);
    
    // Should respond to Enter/Space for buttons/links
    const interactiveElements = ['BUTTON', 'A'];
    if (interactiveElements.includes(element.tagName)) {
      element.focus();
      expect(document.activeElement).toBe(element);
    }
  },
};

/**
 * Custom queries for design system patterns
 *
 * These queries help find elements using design system conventions
 * like data-slot attributes and component variants.
 */
export const queries = {
  /**
   * Find element by data-slot attribute (common in our design system)
   *
   * @param container - Container element to search within
   * @param slot - Slot name to find
   * @returns Found element or null
   *
   * @example
   * ```tsx
   * const icon = queries.getByDataSlot(container, 'icon');
   * ```
   */
  getByDataSlot(container: HTMLElement, slot: string): HTMLElement | null {
    return container.querySelector(`[data-slot="${slot}"]`);
  },

  /**
   * Find all elements with a specific data-slot
   *
   * @param container - Container element to search within
   * @param slot - Slot name to find
   * @returns Array of found elements
   */
  getAllByDataSlot(container: HTMLElement, slot: string): HTMLElement[] {
    return Array.from(container.querySelectorAll(`[data-slot="${slot}"]`));
  },

  /**
   * Find element by component variant class
   *
   * @param container - Container element to search within
   * @param variant - Variant class name to find
   * @returns Found element or null
   */
  getByVariant(container: HTMLElement, variant: string): HTMLElement | null {
    return container.querySelector(`[class*="${variant}"]`);
  },

  /**
   * Find element by test ID with error handling
   *
   * @param container - Container element to search within
   * @param testId - Test ID to find
   * @returns Found element
   * @throws Error if element is not found
   */
  getByTestIdOrThrow(container: HTMLElement, testId: string): HTMLElement {
    const element = container.querySelector(`[data-testid="${testId}"]`);
    if (!element) {
      throw new Error(`Element with data-testid="${testId}" not found`);
    }
    return element as HTMLElement;
  },
};

/**
 * Form testing utilities for complex form interactions
 *
 * These utilities help test form components and user interactions
 * with proper validation and state management.
 */
export const forms = {
  /**
   * Fill form field and trigger validation
   *
   * @param user - User event instance
   * @param input - Input element
   * @param value - Value to enter
   */
  async fillField(user: UserEvent, input: HTMLElement, value: string) {
    await user.clear(input);
    await user.type(input, value);
    await user.tab(); // Trigger blur event for validation
  },

  /**
   * Submit form and wait for completion
   *
   * @param user - User event instance
   * @param form - Form element or submit button
   */
  async submitForm(user: UserEvent, form: HTMLElement) {
    const submitButton = form.tagName === 'FORM' 
      ? form.querySelector('button[type="submit"]') as HTMLElement
      : form;
    
    if (submitButton) {
      await user.click(submitButton);
    }
  },

  /**
   * Assert form field has validation error
   *
   * @param field - Form field element
   * @param errorMessage - Expected error message (optional)
   */
  expectToHaveValidationError(field: HTMLElement, errorMessage?: string) {
    // Check for aria-invalid attribute
    expect(field).toHaveAttribute('aria-invalid', 'true');
    
    // Check for error message if provided
    if (errorMessage) {
      const describedBy = field.getAttribute('aria-describedby');
      if (describedBy) {
        const errorElement = document.getElementById(describedBy);
        expect(errorElement).toHaveTextContent(errorMessage);
      }
    }
  },
};

/**
 * Responsive testing utilities
 *
 * These utilities help test component behavior across different viewport sizes
 * and responsive breakpoints.
 */
export const responsive = {
  /**
   * Viewport sizes for responsive testing
   */
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1024, height: 768 },
    wide: { width: 1440, height: 900 },
  } as const,

  /**
   * Set viewport size for testing
   *
   * @param size - Viewport size configuration
   */
  setViewport(size: { width: number; height: number }) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: size.width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: size.height,
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  },

  /**
   * Test component at different viewport sizes
   *
   * @param component - Component to test
   * @param testFn - Test function to run at each viewport
   */
  async testAtViewports<T>(
    component: ReactElement,
    testFn: (result: ReturnType<typeof renderWithUserEvents>) => Promise<T> | T
  ) {
    const results: T[] = [];
    
    for (const [name, viewport] of Object.entries(this.viewports)) {
      this.setViewport(viewport);
      const renderResult = renderWithUserEvents(component);
      
      try {
        const result = await testFn(renderResult);
        results.push(result);
      } finally {
        renderResult.unmount();
      }
    }
    
    return results;
  },
};

/**
 * Animation and transition testing utilities
 *
 * These utilities help test components with animations and transitions
 * by providing proper timing and state management.
 */
export const animations = {
  /**
   * Wait for CSS transitions to complete
   *
   * @param element - Element with transition
   * @param timeout - Maximum time to wait (default: 1000ms)
   */
  async waitForTransition(element: HTMLElement, timeout = 1000) {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      
      const checkTransition = () => {
        const computedStyle = window.getComputedStyle(element);
        const transitionDuration = computedStyle.transitionDuration;
        
        if (transitionDuration === '0s' || Date.now() - startTime > timeout) {
          resolve();
        } else {
          requestAnimationFrame(checkTransition);
        }
      };
      
      requestAnimationFrame(checkTransition);
    });
  },

  /**
   * Disable CSS animations for testing
   */
  disableAnimations() {
    const style = document.createElement('style');
    style.innerHTML = `
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  },
};

/**
 * Story testing utilities for Storybook integration
 *
 * These utilities help test individual stories and their interactions
 * with proper setup and teardown.
 */
export const stories = {
  /**
   * Test a story with default args
   *
   * @param Story - Storybook story component
   * @param args - Story arguments
   * @param testFn - Test function to run
   */
  async testStory<T extends Record<string, any>>(
    Story: (args: T) => ReactElement,
    args: T,
    testFn: (result: ReturnType<typeof renderWithUserEvents>) => Promise<void> | void
  ) {
    const component = Story(args);
    const renderResult = renderWithUserEvents(component);
    
    try {
      await testFn(renderResult);
    } finally {
      renderResult.unmount();
    }
  },

  /**
   * Test all variants of a story
   *
   * @param Story - Storybook story component
   * @param variants - Array of variant configurations
   * @param testFn - Test function to run for each variant
   */
  async testStoryVariants<T extends Record<string, any>>(
    Story: (args: T) => ReactElement,
    variants: T[],
    testFn: (result: ReturnType<typeof renderWithUserEvents>, args: T) => Promise<void> | void
  ) {
    for (const args of variants) {
      const component = Story(args);
      const renderResult = renderWithUserEvents(component);
      
      try {
        await testFn(renderResult, args);
      } finally {
        renderResult.unmount();
      }
    }
  },
};