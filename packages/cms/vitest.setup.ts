/**
 * SPDX-License-Identifier: MIT
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Global test setup for CMS package
 */

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Setup common browser APIs
beforeEach(() => {
  // Mock console methods to avoid noise in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {
    // Intentionally empty - suppressing console noise in tests
  });
  vi.spyOn(console, 'error').mockImplementation(() => {
    // Intentionally empty - suppressing console noise in tests
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

// Mock getComputedStyle with more complete implementation
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn().mockImplementation((_element) => {
    const style = {
      getPropertyValue: vi.fn().mockImplementation((property) => {
        // Mock common CSS properties that tests might need
        if (property === 'visibility') {
          return 'visible';
        }
        if (property === 'display') {
          return 'block';
        }
        if (property === 'overflow-y') {
          return 'auto';
        }
        return '';
      }),
      visibility: 'visible',
      display: 'block',
      'overflow-y': 'auto',
    };
    return style;
  }),
  writable: true,
});

// Extend Element prototype with better style and computed style mocking
Object.defineProperty(Element.prototype, 'style', {
  get() {
    return {
      getPropertyValue: (property: string) => {
        if (property === 'visibility') {
          return 'visible';
        }
        if (property === 'display') {
          return 'block';
        }
        return '';
      },
      visibility: 'visible',
      display: 'block',
    };
  },
  set() {
    // Intentionally empty - setter not needed for test mocks
  },
});

// Override Element.prototype to provide consistent style access
Object.defineProperty(Element.prototype, 'computedStyleMap', {
  value: () =>
    new Map([
      ['visibility', { value: 'visible' }],
      ['display', { value: 'block' }],
    ]),
  writable: true,
});

// Mock CSSStyleDeclaration for better compatibility
const mockCSSStyleDeclaration = {
  getPropertyValue: (property: string) => {
    if (property === 'visibility') {
      return 'visible';
    }
    if (property === 'display') {
      return 'block';
    }
    return '';
  },
  visibility: 'visible',
  display: 'block',
  position: 'static',
  top: '0px',
  left: '0px',
  width: '100px',
  height: '100px',
  opacity: '1',
  length: 0,
  cssText: '',
  parentRule: null,
  item: () => '',
  removeProperty: () => '',
  setProperty: () => {
    // Intentionally empty - CSS property setting not needed in tests
  },
};

// Ensure consistent getComputedStyle across different contexts
window.getComputedStyle = vi.fn().mockImplementation((_element) => {
  return {
    ...mockCSSStyleDeclaration,
    display: 'block',
    visibility: 'visible',
  };
});

// Setup global fetch mock
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock environment variables commonly used in tests
process.env.NODE_ENV = 'test';

// Mock IntersectionObserver which is not available in JSDOM
global.IntersectionObserver = vi
  .fn()
  .mockImplementation((_callback, _options) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

// Mock ResizeObserver which is not available in JSDOM
global.ResizeObserver = vi.fn().mockImplementation((_callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
