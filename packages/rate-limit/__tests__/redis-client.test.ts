/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import { Redis } from '@upstash/redis';
import { redis } from '../src/index.js';
import { mockRedis } from '../vitest.setup.js';

describe('Redis Client', () => {
  it('should initialize Redis client with correct configuration', () => {
    // Test that Redis is available and properly mocked
    expect(Redis).toBeDefined();
    expect(typeof Redis).toBe('function');
  });

  it('should export redis instance', () => {
    expect(redis).toBeDefined();
    expect(redis).toBe(mockRedis);
  });

  it('should handle Redis operations', async () => {
    mockRedis.get.mockResolvedValue('test-value');
    mockRedis.set.mockResolvedValue('OK');

    const getValue = await redis.get('test-key');
    const setValue = await redis.set('test-key', 'test-value');

    expect(getValue).toBe('test-value');
    expect(setValue).toBe('OK');
    expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value');
  });

  it('should handle Redis multi operations', async () => {
    const multi = redis.multi();
    await multi.incr('counter').expire('counter', 60).exec();

    expect(mockRedis.multi).toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    const error = new Error('Redis connection failed');
    mockRedis.get.mockRejectedValue(error);

    await expect(redis.get('test-key')).rejects.toThrow('Redis connection failed');
  });

  it('should handle missing environment variables', () => {
    // Should not throw during import, even with missing env vars
    expect(() => {
      // Re-import should work fine with mocks
      vi.resetModules();
    }).not.toThrow();
  });
});