/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import { Ratelimit } from '@upstash/ratelimit';
import { createRateLimiter, slidingWindow } from '../src/index.js';
import { mockRatelimit, mockRatelimitClass } from '../vitest.setup.js';

describe('Rate Limiter', () => {
  describe('createRateLimiter', () => {
    it('should create rate limiter with default configuration', () => {
      const rateLimiter = createRateLimiter({});

      expect(mockRatelimitClass).toHaveBeenCalledWith({
        redis: expect.any(Object),
        limiter: undefined, // This will be set by the default limiter logic
        prefix: 'zopio',
      });
    });

    it('should create rate limiter with custom configuration', () => {
      const customLimiter = vi.fn();
      const rateLimiter = createRateLimiter({
        limiter: customLimiter,
        prefix: 'custom-prefix',
      });

      expect(mockRatelimitClass).toHaveBeenCalledWith({
        redis: expect.any(Object),
        limiter: customLimiter,
        prefix: 'custom-prefix',
      });
    });

    it('should use sliding window limiter by default', () => {
      mockRatelimitClass.slidingWindow = vi.fn().mockReturnValue('sliding-window-limiter');
      
      createRateLimiter({});

      expect(mockRatelimitClass.slidingWindow).toHaveBeenCalledWith(10, '10 s');
    });

    it('should handle custom limiter configuration', () => {
      const customLimiter = vi.fn();
      
      createRateLimiter({
        limiter: customLimiter,
      });

      expect(mockRatelimitClass).toHaveBeenCalledWith(
        expect.objectContaining({
          limiter: customLimiter,
        })
      );
    });
  });

  describe('Rate Limiting Operations', () => {
    it('should perform rate limiting', async () => {
      const identifier = 'user:123';
      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
        pending: Promise.resolve(),
      });

      const rateLimiter = createRateLimiter({});
      const result = await rateLimiter.limit(identifier);

      expect(mockRatelimit.limit).toHaveBeenCalledWith(identifier);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should handle rate limit exceeded', async () => {
      const identifier = 'user:456';
      mockRatelimit.limit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 10000,
        pending: Promise.resolve(),
      });

      const rateLimiter = createRateLimiter({});
      const result = await rateLimiter.limit(identifier);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should get remaining requests', async () => {
      const identifier = 'user:789';
      mockRatelimit.getRemaining.mockResolvedValue(5);

      const rateLimiter = createRateLimiter({});
      const remaining = await rateLimiter.getRemaining(identifier);

      expect(mockRatelimit.getRemaining).toHaveBeenCalledWith(identifier);
      expect(remaining).toBe(5);
    });

    it('should reset rate limit', async () => {
      const identifier = 'user:reset';
      mockRatelimit.reset.mockResolvedValue(undefined);

      const rateLimiter = createRateLimiter({});
      await rateLimiter.reset(identifier);

      expect(mockRatelimit.reset).toHaveBeenCalledWith(identifier);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      const identifier = 'user:error';
      const error = new Error('Redis connection failed');
      mockRatelimit.limit.mockRejectedValue(error);

      const rateLimiter = createRateLimiter({});
      
      await expect(rateLimiter.limit(identifier)).rejects.toThrow('Redis connection failed');
    });

    it('should handle invalid identifier', async () => {
      const identifier = '';
      mockRatelimit.limit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 10000,
        pending: Promise.resolve(),
      });

      const rateLimiter = createRateLimiter({});
      const result = await rateLimiter.limit(identifier);

      expect(result.success).toBe(false);
    });
  });

  describe('Sliding Window Export', () => {
    it('should export slidingWindow from Ratelimit', () => {
      expect(slidingWindow).toBeDefined();
      expect(typeof slidingWindow).toBe('function');
    });
  });
});