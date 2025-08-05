/**
 * SPDX-License-Identifier: MIT
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Global test setup for collaboration package tests
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
  vi.stubEnv('NODE_ENV', 'test');
}
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

// Mock WebSocket for Liveblocks testing (if needed)
const MockWebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  readyState: 1, // OPEN
}));

// Add static properties to the WebSocket constructor
Object.defineProperty(MockWebSocket, 'CONNECTING', {
  value: 0,
  writable: false,
});
Object.defineProperty(MockWebSocket, 'OPEN', {
  value: 1,
  writable: false,
});
Object.defineProperty(MockWebSocket, 'CLOSING', {
  value: 2,
  writable: false,
});
Object.defineProperty(MockWebSocket, 'CLOSED', {
  value: 3,
  writable: false,
});

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
