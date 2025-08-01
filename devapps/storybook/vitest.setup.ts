/**
 * SPDX-License-Identifier: MIT
 *
 * Vitest setup configuration for the Storybook devapp.
 *
 * This setup file configures the test environment for React component testing:
 * - Extends Vitest's expect with Testing Library's DOM matchers
 * - Provides cleanup after each test to prevent test interference
 * - Mocks browser APIs not available in jsdom environment
 * - Sets up common test utilities and global configurations
 *
 * The mocks included here are specifically tailored for testing UI components
 * that rely on browser APIs like matchMedia, IntersectionObserver, and storage.
 */

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

// Extend Vitest's expect with Testing Library's DOM matchers
// This enables assertions like toBeInTheDocument(), toHaveClass(), etc.
expect.extend(matchers);

// Clean up after each test to prevent state leakage between tests
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Setup common browser APIs and test configuration before each test
beforeEach(() => {
  // Mock console methods to reduce noise in test output
  // Only mock warn/error as info/log might be intentional test output
  vi.spyOn(console, 'warn').mockImplementation(() => {
    // Intentionally empty - suppressing console warnings in tests
  });
  vi.spyOn(console, 'error').mockImplementation(() => {
    // Intentionally empty - suppressing console errors in tests
  });
});

// Mock window.matchMedia which is not available in JSDOM
// This is commonly used by responsive components and CSS-in-JS libraries
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

// Mock IntersectionObserver for components that use scroll-based interactions
// Common in lazy loading, infinite scroll, and visibility detection
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for components that respond to size changes
// Used in responsive components and layout-aware UI elements
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage for components that persist state
// Provides a clean slate for each test without actual browser storage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

// Mock sessionStorage for session-based state management
// Similar to localStorage but for session-scoped storage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});
