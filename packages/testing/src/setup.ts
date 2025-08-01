/**
 * SPDX-License-Identifier: MIT
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { browserMocks } from './mocks.js';

/**
 * Global test setup utilities and configurations
 */

/**
 * Setup function to be called in vitest setupFiles
 */
export function setupTests() {
  // Clean up after each test
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Setup common browser APIs
  beforeEach(() => {
    // Mock common browser APIs that are often missing in test environments
    browserMocks.mockLocalStorage();
    browserMocks.mockSessionStorage();
    browserMocks.mockIntersectionObserver();
    browserMocks.mockResizeObserver();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {
      // Suppress console warnings in tests
    });
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console errors in tests
    });
  });

  // Mock window.matchMedia which is not available in JSDOM
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock scrollTo methods
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });

  Object.defineProperty(Element.prototype, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });

  // Mock getComputedStyle
  Object.defineProperty(window, 'getComputedStyle', {
    value: vi.fn().mockImplementation(() => ({
      getPropertyValue: vi.fn().mockReturnValue(''),
    })),
    writable: true,
  });

  // Mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
    writable: true,
  });

  // Setup global fetch mock
  if (!global.fetch) {
    global.fetch = vi.fn();
  }

  // Mock environment variables commonly used in tests
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
}

/**
 * Custom render helpers with providers
 */
export interface TestProviders {
  // Add your app-specific providers here
  theme?: 'light' | 'dark';
  user?: unknown;
  organization?: unknown;
}

/**
 * Setup test providers wrapper
 */
export function createProvidersWrapper(_providers: TestProviders = {}) {
  return function ProvidersWrapper({
    children,
  }: { children: React.ReactNode }) {
    // Here you would wrap with your actual app providers
    // For example: ThemeProvider, AuthProvider, etc.
    return {
      type: 'div',
      props: { 'data-testid': 'providers-wrapper', children },
    };
  };
}

/**
 * Database test helpers
 */
export const dbTestHelpers = {
  /**
   * Clear all test data from database
   */
  clearDatabase: vi.fn().mockResolvedValue(undefined),

  /**
   * Seed test data
   */
  seedTestData: vi.fn().mockResolvedValue(undefined),

  /**
   * Create isolated test transaction
   */
  createTestTransaction: vi.fn().mockImplementation((callback) => callback()),
};

/**
 * API test helpers
 */
export const apiTestHelpers = {
  /**
   * Create mock API context
   */
  createMockApiContext: () => ({
    req: {
      method: 'GET',
      url: '/api/test',
      headers: {},
      body: {},
      query: {},
      cookies: {},
    },
    res: {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    },
  }),

  /**
   * Mock authenticated request
   */
  createAuthenticatedRequest: (userId = 'user_test123') => ({
    method: 'GET',
    url: '/api/test',
    headers: {
      authorization: `Bearer mock-jwt-token-${userId}`,
    },
    body: {},
    query: {},
    cookies: {},
    auth: {
      userId,
      sessionId: 'sess_test123',
      orgId: 'org_test123',
    },
  }),
};

/**
 * Test timing utilities
 */
export const timingHelpers = {
  /**
   * Wait for next React render cycle
   */
  waitForNextRender: () => new Promise((resolve) => setTimeout(resolve, 0)),

  /**
   * Wait for animation frame
   */
  waitForAnimationFrame: () =>
    new Promise((resolve) => requestAnimationFrame(resolve)),

  /**
   * Fast-forward timers
   */
  fastForwardTime: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },

  /**
   * Use fake timers for a test
   */
  useFakeTimers: () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  },
};

/**
 * Error boundary test helper
 */
export function createErrorBoundary() {
  const onError = vi.fn();

  function ErrorBoundary({ children }: { children: React.ReactNode }) {
    try {
      return children;
    } catch (error) {
      onError(error);
      return {
        type: 'div',
        props: {
          'data-testid': 'error-boundary',
          children: 'Something went wrong',
        },
      };
    }
  }

  return { ErrorBoundary, onError };
}

/**
 * Accessibility test helpers
 */
export const a11yHelpers = {
  /**
   * Check if element has proper ARIA labels
   */
  checkAriaLabels: (element: HTMLElement) => {
    const hasAriaLabel = element.getAttribute('aria-label');
    const hasAriaLabelledBy = element.getAttribute('aria-labelledby');
    const hasAriaDescribedBy = element.getAttribute('aria-describedby');

    return {
      hasAriaLabel: Boolean(hasAriaLabel),
      hasAriaLabelledBy: Boolean(hasAriaLabelledBy),
      hasAriaDescribedBy: Boolean(hasAriaDescribedBy),
      hasAnyLabel: Boolean(hasAriaLabel || hasAriaLabelledBy),
    };
  },

  /**
   * Check keyboard navigation
   */
  checkKeyboardNavigation: (element: HTMLElement) => {
    element.focus();
    // This is a test utility function that will be called from within test blocks
    // biome-ignore lint/suspicious/noMisplacedAssertion: This is a test helper function
    expect(element).toHaveFocus();

    // Test Tab navigation
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    // Test Enter activation
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    // Test Space activation (for buttons)
    element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    return true;
  },
};

/**
 * Performance test helpers
 */
export const performanceHelpers = {
  /**
   * Measure render time
   */
  measureRenderTime: <T>(
    renderFunction: () => T
  ): { result: T; time: number } => {
    const start = performance.now();
    const result = renderFunction();
    const end = performance.now();

    return {
      result,
      time: end - start,
    };
  },

  /**
   * Mock performance.now for consistent timing tests
   */
  mockPerformanceNow: () => {
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 16.67; // Simulate 60fps
      return time;
    });
  },
};

/**
 * Visual regression test helpers
 */
export const visualHelpers = {
  /**
   * Take component snapshot
   */
  takeSnapshot: vi.fn().mockResolvedValue('snapshot-data'),

  /**
   * Compare snapshots
   */
  compareSnapshots: vi.fn().mockResolvedValue({ matches: true, diff: null }),

  /**
   * Mock image loading
   */
  mockImageLoad: () => {
    // Mock Image constructor
    const mockImage = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      src: '',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };

    global.Image = vi.fn().mockImplementation(() => mockImage);

    return mockImage;
  },
};
