/**
 * SPDX-License-Identifier: MIT
 */

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

// Extend vitest expect with jest-dom matchers types
declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T> {
    toBeInTheDocument(): T;
    toHaveClass(...classNames: string[]): T;
    toHaveAttribute(name: string, value?: string | RegExp): T;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace?: boolean }): T;
    toContainElement(element: HTMLElement | null): T;
    toHaveStyle(style: string | Record<string, any>): T;
    toBeVisible(): T;
    toBeEnabled(): T;
    toBeDisabled(): T;
    toBeEmpty(): T;
    toHaveFocus(): T;
    toHaveValue(value: string | string[] | number): T;
    toBeChecked(): T;
    toBePartiallyChecked(): T;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): T;
    toHaveFormValues(expectedValues: Record<string, any>): T;
    toHaveErrorMessage(text: string | RegExp): T;
    toHaveDescription(text: string | RegExp): T;
    toBeRequired(): T;
    toBeInvalid(): T;
    toBeValid(): T;
  }
  interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}
}

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Global cleanup to prevent test pollution
afterEach(() => {
  // Clean up DOM after each test - this is the primary cleanup
  cleanup();
  
  // Force complete DOM reset
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Clear all document state
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur?.();
  }
  
  // Clear all mocks and timers
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  
  // Clear any lingering event listeners and restore mocks
  vi.restoreAllMocks();
  
  // Reset any global state that might affect tests
  window.location.hash = '';
  window.scrollX = 0;
  window.scrollY = 0;
  
  // Force garbage collection of any React components
  global.gc?.();
});

// Reset environment before each test
beforeEach(() => {
  // Ensure DOM is clean before starting
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Clear any console methods that might have been mocked
  vi.clearAllMocks();
  
  // Reset document title and meta
  document.title = '';
  
  // Clear any focus states
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur?.();
  }
  
  // Reset CSS custom properties that might affect styling
  document.documentElement.style.cssText = '';
  
  // Reset any aria-* attributes on document element
  document.documentElement.removeAttribute('aria-hidden');
  document.documentElement.removeAttribute('aria-expanded');
});

// Setup global test environment
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px 0px 0px 0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  private readonly callback: IntersectionObserverCallback;
  
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock window.requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0);
  return 0;
});

global.cancelAnimationFrame = vi.fn();

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  const storage: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: createStorageMock(),
});

// Utility function for complete test cleanup (can be imported by test files if needed)
export const testCleanup = () => {
  cleanup();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.documentElement.style.cssText = '';
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  
  // Clear any focus states
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur?.();
  }
};

// Utility function for resetting test environment
export const resetTestEnvironment = () => {
  // Reset any global state
  window.location.hash = '';
  
  // Clear any pending timeouts/intervals
  vi.clearAllTimers();
  vi.useRealTimers();
  
  // Reset window properties that might affect tests
  window.scrollX = 0;
  window.scrollY = 0;
  
  // Reset focus
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur?.();
  }
  
  // Clear any global event listeners
  const events = ['resize', 'scroll', 'click', 'keydown', 'keyup', 'focus', 'blur'];
  events.forEach(eventType => {
    const listeners = (window as any)._eventListeners?.[eventType] || [];
    listeners.forEach((listener: any) => {
      window.removeEventListener(eventType, listener);
    });
  });
};

// Utility function for isolating component tests
export const isolateComponent = () => {
  // Create a fresh container for each component test
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'test-container');
  document.body.appendChild(container);
  return container;
};

