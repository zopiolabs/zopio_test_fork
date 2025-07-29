/**
 * SPDX-License-Identifier: MIT
 */

import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Mock server-only module
vi.mock('server-only', () => ({}));

// Mock keys module
vi.mock('./keys', () => ({
  keys: vi.fn(() => ({
    SVIX_TOKEN: 'testsk_test_token_12345',
  })),
}));

// Mock auth module
vi.mock('@repo/auth/server', () => ({
  auth: vi.fn(async () => ({
    orgId: 'test_org_123',
    userId: 'test_user_456',
  })),
}));

// Create global mock instances that will be reused
const mockSvixMethods = {
  message: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
  },
  authentication: {
    appPortalAccess: vi.fn(),
  },
  application: {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  endpoint: {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getSecret: vi.fn(),
    rotateSecret: vi.fn(),
  },
  eventType: {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const mockWebhookMethods = {
  verify: vi.fn(),
};

// Mock Svix SDK with shared instances
vi.mock('svix', () => ({
  Svix: vi.fn().mockImplementation(() => mockSvixMethods),
  Webhook: vi.fn().mockImplementation(() => mockWebhookMethods),
}));

// Export mock instances for use in tests
(globalThis as any).__mockSvixMethods = mockSvixMethods;
(globalThis as any).__mockWebhookMethods = mockWebhookMethods;

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.SVIX_TOKEN = 'testsk_test_token_12345';
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  vi.resetAllMocks();
});
