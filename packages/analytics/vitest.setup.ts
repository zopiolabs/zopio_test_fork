import { beforeEach, vi } from 'vitest';

// Mock PostHog globals for testing environment
Object.defineProperty(globalThis, 'posthog', {
  value: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    has_opted_out_capturing: vi.fn(() => false),
  },
  writable: true,
});

// Mock window.gtag for Google Analytics testing
Object.defineProperty(globalThis, 'gtag', {
  value: vi.fn(),
  writable: true,
});

// Set up global mocks and reset state
beforeEach(() => {
  // Clear all mocks between tests
  vi.clearAllMocks();

  // Reset document.cookie
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: '',
  });

  // Reset performance API mock
  Object.defineProperty(globalThis, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
    },
    writable: true,
  });
});
