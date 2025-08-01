/**
 * SPDX-License-Identifier: MIT
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Global test setup for auth package tests
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

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn().mockReturnValue(''),
  })),
  writable: true,
});

// Setup global fetch mock
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock environment variables commonly used in tests
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
