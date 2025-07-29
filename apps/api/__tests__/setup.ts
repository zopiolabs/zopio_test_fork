/**
 * SPDX-License-Identifier: MIT
 */

import { afterEach, vi } from 'vitest';

// Mock environment variables for testing
Object.assign(process.env, {
  NODE_ENV: 'test',
  CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
  CLERK_WEBHOOK_SECRET: 'whsec_test_clerk_secret',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_stripe_secret', 
  TRIGGER_API_KEY: 'tr_test_api_key',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_publishable',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
});

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock Next.js headers function
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn(),
  }),
}));

// Mock environment module to prevent validation errors
vi.mock('@/env', () => ({
  env: {
    CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
    CLERK_WEBHOOK_SECRET: 'whsec_test_clerk_secret',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_stripe_secret',
    TRIGGER_API_KEY: 'tr_test_api_key',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_publishable',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
  },
}));

// Global test cleanup
afterEach(() => {
  vi.clearAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};