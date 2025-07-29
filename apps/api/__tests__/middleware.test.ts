/**
 * SPDX-License-Identifier: MIT
 */

import * as Sentry from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '../middleware';
import { createMockRequest, mockClerkAuth } from './utils/api-test-helpers';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('API Middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  describe('middleware function', () => {
    it('should allow public paths', async () => {
      const publicPaths = [
        '/',
        '/health',
        '/webhooks/clerk',
        '/webhooks/stripe',
        '/_next/static/chunks/main.js',
        '/favicon.ico',
      ];

      for (const path of publicPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // NextResponse.next() returns a response, we check it doesn't have error status
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(500);
      }
    });

    it('should allow API key paths', async () => {
      const apiKeyPaths = [
        '/api-keys',
        '/api-keys/private',
      ];

      for (const path of apiKeyPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // Should pass through to route handlers
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(500);
      }
    });

    it('should apply auth middleware to protected routes', async () => {
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');

      const request = createMockRequest({
        url: 'http://localhost/protected-route',
      });

      const response = await middleware(request);

      expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
      expect(response.status).not.toBe(401);
    });

    it('should handle auth middleware failures', async () => {
      const authResponse = new Response('Unauthorized', { status: 401 });
      mockClerkAuth.mockFailure(401, 'Unauthorized');

      const request = createMockRequest({
        url: 'http://localhost/protected-route',
      });

      const response = await middleware(request);

      expect(response.status).toBe(401);
    });

    it('should handle auth middleware errors with Sentry', async () => {
      const authError = new Error('Auth service unavailable');
      mockClerkAuth.mockError(authError);

      const request = createMockRequest({
        url: 'http://localhost/protected-route',
      });

      const response = await middleware(request);

      expect(Sentry.captureException).toHaveBeenCalledWith(authError, {
        tags: { source: 'auth-middleware' },
        extra: { path: '/protected-route' },
      });

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Authentication error',
        message: 'Failed to authenticate request',
      });
    });

    it('should handle different webhook paths', async () => {
      const webhookPaths = [
        '/webhooks',
        '/webhooks/clerk',
        '/webhooks/stripe',
        '/webhooks/custom',
        '/webhooks/nested/path',
      ];

      for (const path of webhookPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // Should be public, no auth required
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('should handle nested static paths', async () => {
      const staticPaths = [
        '/_next/static/js/main.js',
        '/_next/static/css/styles.css',
        '/_next/static/chunks/webpack.js',
        '/_next/static/media/image.png',
      ];

      for (const path of staticPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // Should be public
        expect(response.status).not.toBe(401);
      }
    });

    it('should handle complex protected routes', async () => {
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');

      const protectedPaths = [
        '/admin',
        '/dashboard',
        '/user/profile',
        '/api/internal/data',
      ];

      for (const path of protectedPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        await middleware(request);

        expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
        vi.resetAllMocks();
        mockAuthMiddleware.mockClear();
      }
    });

    it('should handle path matching edge cases', async () => {
      // Test paths that start with public prefixes but aren't public
      const edgeCasePaths = [
        '/healthy', // starts with '/health' but isn't '/health'
        '/webhook', // starts with '/webhook' but isn't '/webhooks'
      ];

      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');

      for (const path of edgeCasePaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        await middleware(request);

        expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
        vi.resetAllMocks();
        mockAuthMiddleware.mockClear();
      }
    });

    it('should handle root path correctly', async () => {
      const request = createMockRequest({
        url: 'http://localhost/',
      });

      const response = await middleware(request);

      // Root should be public
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should handle query parameters in public paths', async () => {
      const request = createMockRequest({
        url: 'http://localhost/health?check=true',
      });

      const response = await middleware(request);

      // Should still be public
      expect(response.status).not.toBe(401);
    });

    it('should handle hash fragments in public paths', async () => {
      const request = createMockRequest({
        url: 'http://localhost/health#section',
      });

      const response = await middleware(request);

      // Should still be public
      expect(response.status).not.toBe(401);
    });

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');

      for (const method of methods) {
        const request = createMockRequest({
          method,
          url: 'http://localhost/protected',
        });

        await middleware(request);

        expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
        vi.resetAllMocks();
        mockAuthMiddleware.mockClear();
      }
    });

    it('should handle concurrent requests', async () => {
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');

      const requests = Array.from({ length: 5 }, (_, i) =>
        createMockRequest({
          url: `http://localhost/protected-${i}`,
        })
      );

      const responses = await Promise.all(
        requests.map(req => middleware(req))
      );

      for (const response of responses) {
        expect(response.status).not.toBe(500);
      }

      expect(mockAuthMiddleware).toHaveBeenCalledTimes(5);
    });

    it('should handle malformed URLs gracefully', async () => {
      // This should be handled by Next.js URL parsing, but test edge cases
      const request = createMockRequest({
        url: 'http://localhost//double/slash',
      });

      // Should not throw an error
      const response = await middleware(request);
      expect(response).toBeDefined();
    });

    it('should preserve request headers through middleware', async () => {
      const mockAuthMiddleware = vi.fn().mockResolvedValue({
        user: { id: 'user_test123' },
      });

      vi.doMock('@repo/auth', () => ({
        clerkAuthMiddleware: mockAuthMiddleware,
      }));

      const customHeaders = {
        'X-Custom-Header': 'test-value',
        'Authorization': 'Bearer token123',
      };

      const request = createMockRequest({
        url: 'http://localhost/protected',
        headers: customHeaders,
      });

      await middleware(request);

      expect(mockAuthMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            get: expect.any(Function),
          }),
        })
      );
    });

    it('should handle auth middleware response format correctly', async () => {
      // Test when auth middleware returns the request object (success case)
      const enhancedRequest = { user: { id: 'user_test123' } };
      const mockAuthMiddleware = vi.fn().mockResolvedValue(enhancedRequest);

      vi.doMock('@repo/auth', () => ({
        clerkAuthMiddleware: mockAuthMiddleware,
      }));

      const request = createMockRequest({
        url: 'http://localhost/protected',
      });

      const response = await middleware(request);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('middleware configuration', () => {
    it('should have correct matcher configuration', () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher).toContain('/((?!_next/static|favicon.ico).*)');
    });

    it('should match expected routes based on matcher', () => {
      const matcher = config.matcher[0];
      const regex = new RegExp(matcher.replace(/^\/\(/, '(').replace(/\)$/, ''));

      // Should match
      const shouldMatch = [
        '/api/test',
        '/health',
        '/webhooks/stripe',
        '/protected',
        '/admin/users',
      ];

      // Should not match
      const shouldNotMatch = [
        '/_next/static/js/main.js',
        '/favicon.ico',
      ];

      for (const path of shouldMatch) {
        expect(regex.test(path)).toBe(true);
      }

      for (const path of shouldNotMatch) {
        expect(regex.test(path)).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should capture non-auth errors to Sentry', async () => {
      const networkError = new Error('Network error');
      mockClerkAuth.mockError(networkError);

      const request = createMockRequest({
        url: 'http://localhost/protected',
      });

      await middleware(request);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          tags: { source: 'auth-middleware' },
          extra: { path: '/protected' },
        })
      );
    });

    it('should return proper error response format', async () => {
      mockClerkAuth.mockError(new Error('Service unavailable'));

      const request = createMockRequest({
        url: 'http://localhost/protected',
      });

      const response = await middleware(request);

      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/json');

      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Authentication error',
        message: 'Failed to authenticate request',
      });
    });

    it('should handle Sentry initialization errors gracefully', async () => {
      // Mock Sentry.captureException to throw
      vi.mocked(Sentry.captureException).mockImplementation(() => {
        throw new Error('Sentry error');
      });

      mockClerkAuth.mockError(new Error('Auth error'));

      const request = createMockRequest({
        url: 'http://localhost/protected',
      });

      // Should not throw despite Sentry error
      const response = await middleware(request);
      expect(response.status).toBe(500);
    });
  });

  describe('Performance', () => {
    it('should handle high frequency requests', async () => {
      const startTime = Date.now();

      const requests = Array.from({ length: 100 }, () =>
        createMockRequest({
          url: 'http://localhost/health',
        })
      );

      await Promise.all(requests.map(req => middleware(req)));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 requests
    });

    it('should not have memory leaks with many requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process many public requests (no auth required)
      for (let i = 0; i < 1000; i++) {
        const request = createMockRequest({
          url: 'http://localhost/health',
        });
        await middleware(request);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 1000 requests)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});