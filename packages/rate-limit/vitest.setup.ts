/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, vi } from 'vitest';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  pexpire: vi.fn(),
  ttl: vi.fn(),
  pttl: vi.fn(),
  exists: vi.fn(),
  multi: vi.fn(() => ({
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([1, 1]),
  })),
};

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedis),
}));

// Mock Upstash Ratelimit
const mockRatelimit = {
  limit: vi.fn(),
  getRemaining: vi.fn(),
  reset: vi.fn(),
};

const mockRatelimitClass = vi.fn(() => mockRatelimit);
mockRatelimitClass.slidingWindow = vi.fn();
mockRatelimitClass.fixedWindow = vi.fn();
mockRatelimitClass.tokenBucket = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: mockRatelimitClass,
}));

// Mock keys - create a global mock that can be controlled by tests
const mockKeys = vi.fn(() => ({
  UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-token',
}));

vi.mock('./src/keys.js', () => ({
  keys: mockKeys,
}));

// Make mockKeys available globally
(globalThis as { __mockKeys?: typeof mockKeys }).__mockKeys = mockKeys;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Export mocks for use in tests
export { mockRedis, mockRatelimit, mockRatelimitClass, mockKeys };
