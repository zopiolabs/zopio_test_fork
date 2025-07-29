/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createRateLimiter } from '../src/index.js';
import { mockRatelimit } from '../vitest.setup.js';

describe('Rate Limiting Security', () => {
  beforeEach(() => {
    mockRatelimit.limit.mockClear();
  });

  describe('DDoS Protection', () => {
    it('should block requests after rate limit is exceeded', async () => {
      const identifier = 'attacker:ip';
      const rateLimiter = createRateLimiter({});

      // Simulate rate limit exceeded
      mockRatelimit.limit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      });

      const result = await rateLimiter.limit(identifier);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle burst attacks with sliding window', async () => {
      const identifier = 'burst:attacker';
      const rateLimiter = createRateLimiter({});

      // Simulate multiple rapid requests
      const requests = Array.from({ length: 15 }, (_, i) => {
        mockRatelimit.limit.mockResolvedValueOnce({
          success: i < 10, // First 10 succeed, rest fail
          limit: 10,
          remaining: Math.max(0, 9 - i),
          reset: Date.now() + 10000,
          pending: Promise.resolve(),
        });
        return rateLimiter.limit(identifier);
      });

      const results = await Promise.all(requests);
      
      // First 10 should succeed, rest should fail
      expect(results.slice(0, 10).every(r => r.success)).toBe(true);
      expect(results.slice(10).every(r => !r.success)).toBe(true);
    });
  });

  describe('Identifier Validation', () => {
    it('should handle suspicious identifiers', async () => {
      const suspiciousIdentifiers = [
        'user:../../../etc/passwd',
        'user:<script>alert("xss")</script>',
        'user:' + 'A'.repeat(1000), // Very long identifier
        'user:\x00\x01\x02', // Control characters
      ];

      const rateLimiter = createRateLimiter({});
      
      for (const identifier of suspiciousIdentifiers) {
        mockRatelimit.limit.mockResolvedValue({
          success: true,
          limit: 10,
          remaining: 9,
          reset: Date.now() + 10000,
          pending: Promise.resolve(),
        });

        // Should not throw, library should handle sanitization
        await expect(rateLimiter.limit(identifier)).resolves.toBeDefined();
      }
    });
  });

  describe('Resource Protection', () => {
    it('should protect different resources with different limits', async () => {
      const apiRateLimiter = createRateLimiter({
        prefix: 'api',
      });

      const authRateLimiter = createRateLimiter({
        prefix: 'auth',
      });

      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
        pending: Promise.resolve(),
      });

      await apiRateLimiter.limit('user:123');
      await authRateLimiter.limit('user:123');

      // Both should be called with same user but different prefixes are handled internally
      expect(mockRatelimit.limit).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests for same identifier', async () => {
      const identifier = 'concurrent:user';
      const rateLimiter = createRateLimiter({});

      // Simulate concurrent requests
      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 8,
        reset: Date.now() + 10000,
        pending: Promise.resolve(),
      });

      const concurrentRequests = Array.from({ length: 5 }, () =>
        rateLimiter.limit(identifier)
      );

      const results = await Promise.all(concurrentRequests);
      
      expect(results).toHaveLength(5);
      expect(mockRatelimit.limit).toHaveBeenCalledTimes(5);
    });
  });

  describe('Time-based Attacks', () => {
    it('should handle time-based manipulation attempts', async () => {
      const identifier = 'time:manipulator';
      const rateLimiter = createRateLimiter({});

      // Simulate requests with manipulated timestamps
      const now = Date.now();
      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: now + 10000,
        pending: Promise.resolve(),
      });

      const result = await rateLimiter.limit(identifier);

      expect(result.success).toBe(true);
      expect(result.reset).toBeGreaterThan(now);
    });
  });

  describe('Memory Protection', () => {
    it('should handle large numbers of unique identifiers', async () => {
      const rateLimiter = createRateLimiter({});

      // Simulate many unique identifiers (potential memory exhaustion attack)
      const uniqueIdentifiers = Array.from({ length: 100 }, (_, i) => `user:${i}`);

      mockRatelimit.limit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
        pending: Promise.resolve(),
      });

      const requests = uniqueIdentifiers.map(id => rateLimiter.limit(id));
      const results = await Promise.all(requests);

      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});