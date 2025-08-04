/**
 * SPDX-License-Identifier: MIT
 * 
 * JWT Token Verification Performance Benchmarks
 * 
 * These benchmarks test the performance of JWT token verification operations
 * which are critical for authentication flow performance.
 * 
 * Performance Expectations:
 * - Single token verification: < 5ms
 * - Batch token verification (100): < 100ms
 * - Concurrent token verification (100): < 200ms
 * - Memory usage should remain stable across iterations
 */

import { describe, expect, beforeEach, bench } from 'vitest';
import { verifyClerkToken } from '../lib/verify-clerk-token.js';
import { SignJWT } from 'jose';

describe('JWT Token Verification Benchmarks', () => {
  let validToken: string;
  let secret: Uint8Array;
  let tokens: string[];

  beforeEach(async () => {
    // Set up test environment
    process.env.CLERK_SECRET_KEY = 'test-secret-key-32-characters-long';
    secret = new TextEncoder().encode(process.env.CLERK_SECRET_KEY);

    // Create a valid JWT token for testing
    validToken = await new SignJWT({ sub: 'user_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);

    // Create batch of tokens for batch testing
    tokens = [];
    for (let i = 0; i < 100; i++) {
      const token = await new SignJWT({ sub: `user_${i}` })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret);
      tokens.push(token);
    }
  });

  describe('Single Token Verification', () => {
    bench('verify valid JWT token', async () => {
      const userId = await verifyClerkToken(validToken);
      expect(userId).toBe('user_123');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('verify valid JWT token - cold start', async () => {
      const userId = await verifyClerkToken(validToken);
      expect(userId).toBe('user_123');
    }, {
      iterations: 100,
      warmupIterations: 0, // No warmup to test cold start performance
    });
  });

  describe('Batch Token Verification', () => {
    bench('verify 10 tokens sequentially', async () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        const userId = await verifyClerkToken(tokens[i]);
        results.push(userId);
      }
      expect(results).toHaveLength(10);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('verify 50 tokens sequentially', async () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        const userId = await verifyClerkToken(tokens[i]);
        results.push(userId);
      }
      expect(results).toHaveLength(50);
    }, {
      iterations: 50,
      warmupIterations: 5,
    });

    bench('verify 100 tokens sequentially', async () => {
      const results = [];
      for (let i = 0; i < 100; i++) {
        const userId = await verifyClerkToken(tokens[i]);
        results.push(userId);
      }
      expect(results).toHaveLength(100);
    }, {
      iterations: 20,
      warmupIterations: 2,
    });
  });

  describe('Concurrent Token Verification', () => {
    bench('verify 10 tokens concurrently', async () => {
      const promises = tokens.slice(0, 10).map(token => verifyClerkToken(token));
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('verify 50 tokens concurrently', async () => {
      const promises = tokens.slice(0, 50).map(token => verifyClerkToken(token));
      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
    }, {
      iterations: 50,
      warmupIterations: 5,
    });

    bench('verify 100 tokens concurrently', async () => {
      const promises = tokens.map(token => verifyClerkToken(token));
      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
    }, {
      iterations: 20,
      warmupIterations: 2,
    });
  });

  describe('Error Handling Performance', () => {
    bench('handle invalid token errors', async () => {
      const invalidToken = 'invalid.jwt.token';
      try {
        await verifyClerkToken(invalidToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid or expired token');
      }
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('handle malformed token errors', async () => {
      const malformedToken = 'not-a-jwt-token-at-all';
      try {
        await verifyClerkToken(malformedToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid or expired token');
      }
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('handle expired token errors', async () => {
      // Create an expired token
      const expiredToken = await new SignJWT({ sub: 'user_expired' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(-1) // Already expired
        .sign(secret);

      try {
        await verifyClerkToken(expiredToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid or expired token');
      }
    }, {
      iterations: 500,
      warmupIterations: 50,
    });
  });

  describe('Memory and Resource Usage', () => {
    bench('repeated verification memory stability', async () => {
      // Test that repeated verifications don't cause memory leaks
      const startMemory = process.memoryUsage();
      
      for (let i = 0; i < 1000; i++) {
        await verifyClerkToken(validToken);
      }
      
      const endMemory = process.memoryUsage();
      
      // Memory usage shouldn't grow significantly (allow 50MB variance)
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
    }, {
      iterations: 10,
      warmupIterations: 1,
    });

    bench('high-frequency verification', async () => {
      // Simulate high-frequency verification scenario
      const verifications = Array.from({ length: 500 }, () => verifyClerkToken(validToken));
      
      const results = await Promise.all(verifications);
      expect(results).toHaveLength(500);
      results.forEach(userId => {
        expect(userId).toBe('user_123');
      });
    }, {
      iterations: 20,
      warmupIterations: 2,
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    bench('verify tokens with large payloads', async () => {
      // Create a token with a large payload
      const largePayload = {
        sub: 'user_123',
        // Add large data to simulate real-world tokens with extensive claims
        claims: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `claim_${i}`,
          value: `value_${'x'.repeat(100)}_${i}`,
        })),
      };

      const largeToken = await new SignJWT(largePayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret);

      const userId = await verifyClerkToken(largeToken);
      expect(userId).toBe('user_123');
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('mixed valid and invalid tokens', async () => {
      // Create a mix of valid and invalid tokens
      const mixedTokens = [
        ...tokens.slice(0, 50), // 50 valid tokens
        ...Array.from({ length: 50 }, () => 'invalid.token.here'), // 50 invalid tokens
      ];

      let validCount = 0;
      let errorCount = 0;

      await Promise.allSettled(
        mixedTokens.map(async (token) => {
          try {
            await verifyClerkToken(token);
            validCount++;
          } catch {
            errorCount++;
          }
        })
      );

      expect(validCount).toBe(50);
      expect(errorCount).toBe(50);
    }, {
      iterations: 20,
      warmupIterations: 2,
    });
  });

  describe('Configuration Performance', () => {
    bench('verification with missing secret key', async () => {
      const originalKey = process.env.CLERK_SECRET_KEY;
      delete process.env.CLERK_SECRET_KEY;

      try {
        await verifyClerkToken(validToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('CLERK_SECRET_KEY is not defined');
      } finally {
        process.env.CLERK_SECRET_KEY = originalKey;
      }
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });
});