/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

// Get the global mock from setup
const mockKeys = (globalThis as { __mockKeys?: any }).__mockKeys;

describe('Keys Configuration', () => {
  it('should export keys as a function', async () => {
    const { keys } = await import('../src/keys.js');
    
    expect(typeof keys).toBe('function');
  });

  it('should return environment configuration', async () => {
    const { keys } = await import('../src/keys.js');
    const result = keys();

    // Test that we get the expected structure
    expect(result).toHaveProperty('UPSTASH_REDIS_REST_URL');
    expect(result).toHaveProperty('UPSTASH_REDIS_REST_TOKEN');
    expect(mockKeys).toHaveBeenCalled();
  });

  it('should handle missing environment variables', async () => {
    // Override the mock for this test
    mockKeys.mockReturnValueOnce({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });

    const { keys } = await import('../src/keys.js');
    const result = keys();

    expect(result.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(result.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
  });

  it('should handle production environment configuration', async () => {
    // Override the mock for this test
    mockKeys.mockReturnValueOnce({
      UPSTASH_REDIS_REST_URL: 'https://prod-redis.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'prod-token',
    });

    const { keys } = await import('../src/keys.js');
    const result = keys();

    expect(result.UPSTASH_REDIS_REST_URL).toBe('https://prod-redis.upstash.io');
    expect(result.UPSTASH_REDIS_REST_TOKEN).toBe('prod-token');
  });

  it('should handle development environment configuration', async () => {
    // Override the mock for this test  
    mockKeys.mockReturnValueOnce({
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    });

    const { keys } = await import('../src/keys.js');
    const result = keys();

    // In development, missing values should be handled gracefully
    expect(result.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(result.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
  });
});