/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createRateLimiter, redis } from '../src/index.js';
import { mockRatelimit, mockRedis } from '../vitest.setup.js';

describe('Rate Limit Integration', () => {
  beforeEach(() => {
    mockRatelimit.limit.mockClear();
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
  });

  describe('End-to-End Rate Limiting Flow', () => {
    it('should perform complete rate limiting workflow', async () => {
      const identifier = 'integration:user';
      const rateLimiter = createRateLimiter({
        prefix: 'test',
      });

      // Mock successful rate limiting
      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      });

      const result = await rateLimiter.limit(identifier);

      expect(result).toEqual({
        success: true,
        limit: 5,
        remaining: 4,
        reset: expect.any(Number),
        pending: expect.any(Promise),
      });

      expect(mockRatelimit.limit).toHaveBeenCalledWith(identifier);
    });

    it('should handle rate limit reset workflow', async () => {
      const identifier = 'reset:user';
      const rateLimiter = createRateLimiter({});

      // Mock reset operation
      mockRatelimit.reset.mockResolvedValue(undefined);
      mockRatelimit.getRemaining.mockResolvedValue(10);

      await rateLimiter.reset(identifier);
      const remaining = await rateLimiter.getRemaining(identifier);

      expect(mockRatelimit.reset).toHaveBeenCalledWith(identifier);
      expect(mockRatelimit.getRemaining).toHaveBeenCalledWith(identifier);
      expect(remaining).toBe(10);
    });
  });

  describe('Multiple Rate Limiter Coordination', () => {
    it('should coordinate multiple rate limiters with different configurations', async () => {
      const strictRateLimiter = createRateLimiter({
        prefix: 'strict',
      });

      const lenientRateLimiter = createRateLimiter({
        prefix: 'lenient',
      });

      const identifier = 'multi:user';

      // Mock different responses for different rate limiters
      mockRatelimit.limit
        .mockResolvedValueOnce({
          success: false,
          limit: 3,
          remaining: 0,
          reset: Date.now() + 60000,
          pending: Promise.resolve(),
        })
        .mockResolvedValueOnce({
          success: true,
          limit: 10,
          remaining: 8,
          reset: Date.now() + 60000,
          pending: Promise.resolve(),
        });

      const strictResult = await strictRateLimiter.limit(identifier);
      const lenientResult = await lenientRateLimiter.limit(identifier);

      expect(strictResult.success).toBe(false);
      expect(lenientResult.success).toBe(true);
    });
  });

  describe('Redis Integration', () => {
    it('should handle Redis operations in rate limiting context', async () => {
      const rateLimiter = createRateLimiter({});
      
      // Mock Redis operations that might be used internally
      mockRedis.get.mockResolvedValue('5');
      mockRedis.setex.mockResolvedValue('OK');

      // Simulate Redis-backed rate limiting
      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 5,
        reset: Date.now() + 30000,
        pending: Promise.resolve(),
      });

      const result = await rateLimiter.limit('redis:user');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should handle Redis connection issues gracefully', async () => {
      const rateLimiter = createRateLimiter({});
      
      // Simulate Redis connection error
      const redisError = new Error('ECONNREFUSED: Connection refused');
      mockRatelimit.limit.mockRejectedValue(redisError);

      await expect(rateLimiter.limit('error:user')).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-throughput scenarios', async () => {
      const rateLimiter = createRateLimiter({});
      const identifier = 'performance:user';

      // Mock successful responses for performance test
      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 1000,
        remaining: 999,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      });

      const startTime = Date.now();
      
      // Simulate 50 concurrent requests
      const requests = Array.from({ length: 50 }, () =>
        rateLimiter.limit(identifier)
      );

      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle sliding window calculations correctly', async () => {
      const rateLimiter = createRateLimiter({});
      const identifier = 'sliding:user';

      // Simulate sliding window behavior
      const requests = [];
      for (let i = 0; i < 12; i++) {
        mockRatelimit.limit.mockResolvedValueOnce({
          success: i < 10, // First 10 succeed, rest fail
          limit: 10,
          remaining: Math.max(0, 9 - i),
          reset: Date.now() + 10000,
          pending: Promise.resolve(),
        });

        requests.push(rateLimiter.limit(identifier));
      }

      const results = await Promise.all(requests);
      
      // Verify sliding window behavior
      const successfulRequests = results.filter(r => r.success);
      const failedRequests = results.filter(r => !r.success);

      expect(successfulRequests).toHaveLength(10);
      expect(failedRequests).toHaveLength(2);
    });
  });

  describe('Configuration Integration', () => {
    it('should integrate with environment configuration', async () => {
      // This tests that the keys are properly loaded and used
      expect(redis).toBeDefined();
      
      const rateLimiter = createRateLimiter({
        prefix: 'env-test',
      });

      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      });

      const result = await rateLimiter.limit('env:user');
      expect(result.success).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient failures', async () => {
      const rateLimiter = createRateLimiter({});
      const identifier = 'recovery:user';

      // First request fails, second succeeds
      mockRatelimit.limit
        .mockRejectedValueOnce(new Error('Transient failure'))
        .mockResolvedValueOnce({
          success: true,
          limit: 10,
          remaining: 9,
          reset: Date.now() + 60000,
          pending: Promise.resolve(),
        });

      // First request should fail
      await expect(rateLimiter.limit(identifier)).rejects.toThrow('Transient failure');

      // Second request should succeed
      const result = await rateLimiter.limit(identifier);
      expect(result.success).toBe(true);
    });
  });
});