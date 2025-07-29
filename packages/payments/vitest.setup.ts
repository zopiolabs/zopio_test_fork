/**
 * SPDX-License-Identifier: MIT
 */

import { afterAll, afterEach, beforeAll } from 'vitest';

// Mock server-only to prevent client component errors
vi.mock('server-only', () => ({}));

// Mock keys module
vi.mock('./keys', () => ({
  keys: vi.fn(() => ({
    STRIPE_SECRET_KEY: 'sk_test_123456789',
    STRIPE_WEBHOOK_SECRET: 'whsec_test123456789',
  })),
}));

// Mock Stripe SDK
vi.mock('stripe', () => {
  const mockStripe = {
    // Customer methods
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    },
    // Payment methods
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      list: vi.fn(),
    },
    // Payment methods
    paymentMethods: {
      create: vi.fn(),
      retrieve: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      list: vi.fn(),
    },
    // Subscriptions
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      list: vi.fn(),
    },
    // Products
    products: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    // Prices
    prices: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    // Invoices
    invoices: {
      create: vi.fn(),
      retrieve: vi.fn(),
      pay: vi.fn(),
      list: vi.fn(),
    },
    // Webhooks
    webhooks: {
      constructEvent: vi.fn(),
    },
  };

  return {
    default: vi.fn(() => mockStripe),
    Stripe: vi.fn(() => mockStripe),
  };
});

// Mock Stripe Agent Toolkit
vi.mock('@stripe/agent-toolkit/ai-sdk', () => ({
  StripeAgentToolkit: vi.fn().mockImplementation(() => ({
    getTools: vi.fn(() => []),
    createPaymentLink: vi.fn(),
    createProduct: vi.fn(),
    createPrice: vi.fn(),
  })),
}));

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123456789';
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  vi.resetAllMocks();
});
