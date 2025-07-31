/**
 * SPDX-License-Identifier: MIT
 */

import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables for testing
Object.assign(process.env, {
  NODE_ENV: 'test',
  CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
  CLERK_WEBHOOK_SECRET: 'whsec_' + Buffer.from('test_secret_key_with_sufficient_entropy_for_security').toString('base64'),
  STRIPE_WEBHOOK_SECRET: 'whsec_test_stripe_secret',
  STRIPE_SECRET_KEY: 'sk_test_stripe_secret_key',
  TRIGGER_API_KEY: 'tr_test_api_key',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_publishable',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  // Analytics env vars
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_key_1234567890',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
});

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock Next.js headers function
const mockHeaders = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({
    get: vi.fn((key: string) => {
      // Get headers from the global mock store
      return mockHeaders.get(key) || null;
    }),
  })),
}));

// Export helper to set mock headers for tests
export function setMockHeaders(headers: Record<string, string>) {
  mockHeaders.clear();
  Object.entries(headers).forEach(([key, value]) => {
    mockHeaders.set(key, value);
  });
}

// Mock server-only module
vi.mock('server-only', () => ({}));

// Mock analytics module to prevent environment variable validation issues
vi.mock('@repo/analytics/posthog/server', () => ({
  analytics: {
    identify: vi.fn(),
    capture: vi.fn(),
    groupIdentify: vi.fn(),
    shutdown: vi.fn(),
  },
}));

// Mock log module
vi.mock('@repo/observability/log', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock svix module
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockImplementation((body, headers) => {
      // Simple mock verification - in real tests this would be overridden
      return JSON.parse(body);
    }),
  })),
}));

// Mock payments module to prevent Stripe initialization
vi.mock('@repo/payments', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

// Mock environment module to prevent validation errors
vi.mock('@/env', () => ({
  env: {
    CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
    CLERK_WEBHOOK_SECRET: 'whsec_' + Buffer.from('test_secret_key_with_sufficient_entropy_for_security').toString('base64'),
    STRIPE_WEBHOOK_SECRET: 'whsec_test_stripe_secret',
    STRIPE_SECRET_KEY: 'sk_test_stripe_secret_key',
    TRIGGER_API_KEY: 'tr_test_api_key',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_publishable',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
    NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_key_1234567890',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
  },
}));

// Mock database keys module
vi.mock('@repo/database/keys', () => ({
  keys: () => ({
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  }),
}));

// Mock the entire database module to prevent initialization issues
vi.mock('@repo/database', () => ({
  database: {
    page: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Mock trigger module
vi.mock('@repo/trigger', () => ({
  sendEvent: vi.fn().mockResolvedValue({ success: true }),
}));

// Global test cleanup
afterEach(() => {
  vi.clearAllMocks();
});

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  ...console,
  log: vi.fn((...args) => originalConsole.log(...args)), // Pass through for debugging
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};