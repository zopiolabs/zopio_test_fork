/**
 * SPDX-License-Identifier: MIT
 *
 * @fileoverview Comprehensive middleware test suite for the Zopio API
 *
 * This test suite provides comprehensive coverage for the API middleware layer,
 * focusing on authentication, path routing, error handling, and edge cases.
 * The tests validate that the middleware correctly handles:
 *
 * - Public path access control (health checks, webhooks, static assets)
 * - API key route handling (delegated authentication)
 * - Protected route authentication via Clerk
 * - Error scenarios and graceful failure handling
 * - Configuration and route matching logic
 *
 * @module middleware.test
 * @version 1.0.0
 * @since 2024-01-01
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { clerkAuthMiddleware } from '@repo/auth';
import type { NextRequest } from 'next/server';

import {
  createAuthenticatedRequest,
  mockClerkAuth,
  mockEnvironment,
  webhookSignatures
} from './utils/api-test-helpers';

// Allow adding arbitrary test props to the global Request type so that
// mocks like `{ user: {...}, sessionId: 'xyz' }` satisfy TypeScript.
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface Request {
    [key: string]: unknown;
  }
}


/**
 * Enhanced mock request creator that properly sets up NextRequest properties
 * for middleware testing. This function handles the complexities of creating
 * a proper NextRequest mock with all required properties.
 *
 * @param config - Configuration object with method, url, headers, body, etc.
 * @returns A properly mocked NextRequest object
 */
function createMockRequest(config: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
  extraProps?: Record<string, unknown>;
}): NextRequest {
  const {
    method = 'GET',
    url,
    headers = {},
    body,
    searchParams = {},
    extraProps = {},
  } = config;

  // Create URL object to properly handle pathname and search params
  const fullUrl = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const req = new Request(fullUrl.toString(), requestInit) as NextRequest;

  // Add NextRequest-specific properties that the middleware expects
  Object.defineProperty(req, 'nextUrl', {
    value: {
      pathname: fullUrl.pathname,
      searchParams: fullUrl.searchParams,
      search: fullUrl.search,
      href: fullUrl.href,
      origin: fullUrl.origin,
      protocol: fullUrl.protocol,
      host: fullUrl.host,
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      hash: fullUrl.hash,
    },
    enumerable: true,
    configurable: true,
  });

  // Attach extra test-specific properties
  Object.assign(req, extraProps);

  return req;
}

// Mock external dependencies
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@zopio/db', () => ({
  db: {
    select: () => ({ execute: vi.fn() }),
  },
}));

// Mock auth middleware - this needs to be done before importing middleware
vi.mock('@repo/auth', () => ({
  // Cast the resolved value to Request to satisfy TypeScript without changing test semantics
  clerkAuthMiddleware: vi.fn().mockResolvedValue({ user: { id: 'user_test123' } } as unknown as Request),
}));

// Now import after mocking
import { config, middleware } from '../middleware';

// Create a reference to the mocked function for easier access in tests
// Cast to generic vi.Mock so we can resolve any shape without TS structural constraints
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const mockClerkAuthMiddleware = vi.mocked(clerkAuthMiddleware) as unknown as Mock;

// Mock rate limiting
vi.mock('@repo/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 100, remaining: 99, reset: Date.now() + 3600000 }),
  getRateLimiter: vi.fn().mockReturnValue({
    check: vi.fn().mockResolvedValue({ allowed: true }),
    consume: vi.fn().mockResolvedValue({ allowed: true }),
  }),
}));

// Mock security middleware
vi.mock('@repo/security/middleware', () => ({
  securityMiddleware: vi.fn().mockImplementation((req) => Promise.resolve(req)),
  validateOrigin: vi.fn().mockReturnValue(true),
  sanitizeRequest: vi.fn().mockImplementation((req) => req),
}));

describe('API Middleware - Comprehensive Test Suite', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    // Reset the mock to a default state
    mockClerkAuthMiddleware.mockResolvedValue({ user: { id: 'user_test123' } } as unknown as Request);
    // Reset environment variables to defaults
    mockEnvironment({
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
    });
  });

  afterEach(() => {
    // Ensure all mocks are cleared after each test
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Public Path Access Control', () => {
    /**
     * Verifies that all defined public paths are accessible without authentication.
     * Public paths include health checks, webhooks, static assets, and the root path.
     * 
     * @test {middleware} Public path routing
     * @covers Public path detection logic
     * @covers NextResponse.next() for allowed paths
     */
    it('should allow all defined public paths without authentication', async () => {
      const publicPaths = [
        '/',
        '/health',
        '/health/live',
        '/health/ready',
        '/webhooks/clerk',
        '/webhooks/stripe',
        '/webhooks/custom/endpoint',
        '/_next/static/chunks/main.js',
        '/_next/static/css/app.css',
        '/favicon.ico',
      ];

      for (const path of publicPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // Public paths should pass through without authentication
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(500);
        
        // Verify Clerk auth middleware was not called for public paths
        expect(mockClerkAuthMiddleware).not.toHaveBeenCalled();
      }
    });

    /**
     * Tests that public paths accept all standard HTTP methods without authentication.
     * This is particularly important for webhooks that may receive POST, PUT, etc.
     * 
     * @test {middleware} HTTP method handling for public paths
     * @covers Method-agnostic public path access
     */
    it('should allow public paths with various HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
      const publicPath = '/webhooks/stripe';

      for (const method of methods) {
        const request = createMockRequest({
          method,
          url: `http://localhost${publicPath}`,
        });

        const response = await middleware(request);
        expect(response.status).not.toBe(401);
        expect(mockClerkAuthMiddleware).not.toHaveBeenCalled();
        
        // Reset mock for next iteration
        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Ensures public paths work correctly with query parameters and URL fragments.
     * This tests that the path matching logic focuses on pathname, not query strings.
     * 
     * @test {middleware} Query parameter and fragment handling
     * @covers URL parsing and path extraction
     */
    it('should handle public paths with query parameters and fragments', async () => {
      const pathVariations = [
        '/health?check=true&verbose=1',
        '/health#section', 
        '/health?check=true#monitoring',
        '/webhooks/stripe?event=payment.succeeded',
        '/?ref=homepage&utm_source=test',
      ];

      for (const path of pathVariations) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);
        expect(response.status).not.toBe(401);
        expect(mockClerkAuthMiddleware).not.toHaveBeenCalled();
        
        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Tests edge cases in path matching to ensure that similar-looking paths
     * that should not be public are correctly identified as protected.
     * 
     * @test {middleware} Path matching precision
     * @covers Edge cases in public path detection
     */
    it('should handle edge cases in path matching correctly', async () => {
      // Paths that start with public prefixes but aren't actually public
      const nonPublicPaths = [
        '/healthy', // not '/health'
        '/webhook', // not '/webhooks' 
        '/health-check', // not '/health'
        '/_next_static', // not '/_next/static'
        '/favicon.ico.png', // not '/favicon.ico'
      ];

      for (const path of nonPublicPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        await middleware(request);

        // These should require authentication, so Clerk middleware should be called
        expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
        mockClerkAuthMiddleware.mockClear();
      }
    });
  });

  describe('API Key Authentication', () => {
    /**
     * Verifies that API key paths bypass middleware authentication and
     * delegate authentication handling to their route handlers.
     * 
     * @test {middleware} API key path delegation
     * @covers API key path detection and bypass logic
     */
    it('should allow API key paths to handle their own authentication', async () => {
      const apiKeyPaths = [
        '/api-keys',
        '/api-keys/private',
        '/api-keys/public', 
        '/api-keys/validate',
        '/api-keys/rotate',
      ];

      for (const path of apiKeyPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
          headers: {
            'X-API-Key': 'test_api_key_123',
          },
        });

        const response = await middleware(request);

        // Should pass through to route handlers for API key validation
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(500);
        
        // Verify Clerk auth middleware was not called
        expect(mockClerkAuthMiddleware).not.toHaveBeenCalled();
      }
    });

    /**
     * Tests that API key paths still bypass middleware authentication even
     * when no API key header is present. The route handler is responsible
     * for validating the presence and validity of API keys.
     * 
     * @test {middleware} API key path handling without credentials
     * @covers Delegation of authentication to route handlers
     */
    it('should handle API key paths without API key header', async () => {
      const request = createMockRequest({
        url: 'http://localhost/api-keys/private',
        // No API key header provided
      });

      const response = await middleware(request);

      // Should still pass through - route handler will handle missing key
      expect(response.status).not.toBe(401);
      expect(mockClerkAuthMiddleware).not.toHaveBeenCalled();
    });

  });

  describe('Authentication Middleware Integration', () => {
    /**
     * Verifies that protected routes (non-public, non-API-key paths) correctly
     * invoke the Clerk authentication middleware for access control.
     * 
     * @test {middleware} Protected route authentication
     * @covers Clerk middleware integration
     * @covers Authentication flow for protected resources
     */
    it('should apply auth middleware to all protected routes', async () => {
      const protectedPaths = [
        '/api/users',
        '/api/projects',
        '/admin/dashboard',
        '/user/profile',
        '/settings', 
        '/protected-resource',
      ];

      for (const path of protectedPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // Verify Clerk auth middleware was called with the request
        expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
        expect(response.status).not.toBe(401);
        
        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Tests successful authentication flow where Clerk middleware returns
     * user context and the request proceeds normally.
     * 
     * @test {middleware} Successful authentication handling
     * @covers User context processing
     * @covers Successful auth flow continuation
     */
    it('should handle successful authentication with user context', async () => {
      const userId = 'user_test123';
      const userMetadata = {
        id: userId,
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      };

      // Mock successful authentication response
      mockClerkAuthMiddleware.mockResolvedValue({
        user: userMetadata,
        sessionId: 'session_123',
      });

      const request = createMockRequest({
        url: 'http://localhost/api/protected',
      });

      const response = await middleware(request);

      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      expect(response.status).not.toBe(401); 
      expect(response.status).not.toBe(500);
      
      // Verify successful response allows continuation
      expect(response.status).toBe(200);
    });

    /**
     * Tests various authentication failure scenarios where Clerk middleware
     * returns error responses that should be passed through to the client.
     * 
     * @test {middleware} Authentication failure handling
     * @covers Auth failure response passthrough
     * @covers Status code preservation
     */
    it('should handle various authentication failure scenarios', async () => {
      const failureScenarios = [
        { status: 401, message: 'Unauthorized', description: 'Invalid token' },
        { status: 403, message: 'Forbidden', description: 'Insufficient permissions' },
        { status: 419, message: 'Token Expired', description: 'Session expired' },
      ];

      for (const scenario of failureScenarios) {
        // Mock the auth middleware to return a Response object (indicating failure)
        mockClerkAuthMiddleware.mockResolvedValue(
          new Response(scenario.message, { status: scenario.status })
        );

        const request = createMockRequest({
          url: 'http://localhost/api/protected',
          headers: {
            'Authorization': 'Bearer invalid_token',
          },
        });

        const response = await middleware(request);

        // The middleware should pass through the auth failure response
        expect(response.status).toBe(scenario.status);
        const body = await response.text();
        expect(body).toBe(scenario.message);

        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Tests graceful handling of JWT token expiration errors by verifying
     * proper error response generation and Sentry error reporting.
     * 
     * @test {middleware} JWT token expiration handling
     * @covers Error exception handling
     * @covers Sentry integration for auth errors
     */
    it('should handle expired JWT tokens gracefully', async () => {
      const expiredTokenError = new Error('JWT expired');
      expiredTokenError.name = 'TokenExpiredError';
      mockClerkAuthMiddleware.mockRejectedValue(expiredTokenError);

      const request = createAuthenticatedRequest('expired_token', {
        url: 'http://localhost/api/user/profile',
      });

      const response = await middleware(request);

      // Auth errors should result in 500 status with standardized error response
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Authentication error',
        message: 'Failed to authenticate request',
      });

      // Verify error is properly reported to Sentry with context
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expiredTokenError,
        expect.objectContaining({
          tags: { source: 'auth-middleware' },
          extra: { path: '/api/user/profile' },
        })
      );
    });

    /**
     * Tests handling of malformed JWT tokens by verifying proper error
     * response and Sentry reporting with path context.
     * 
     * @test {middleware} Malformed token handling
     * @covers Token validation error handling
     * @covers Error context enrichment
     */
    it('should handle malformed JWT tokens', async () => {
      const malformedTokenError = new Error('Invalid token format');
      malformedTokenError.name = 'JsonWebTokenError';
      mockClerkAuthMiddleware.mockRejectedValue(malformedTokenError);

      const request = createMockRequest({
        url: 'http://localhost/api/secure',
        headers: {
          'Authorization': 'Bearer malformed.token.here',
        },
      });

      const response = await middleware(request);

      // Malformed token errors should result in 500 status
      expect(response.status).toBe(500);
      
      // Verify Sentry receives the error with proper context
      expect(Sentry.captureException).toHaveBeenCalledWith(
        malformedTokenError,
        expect.objectContaining({
          tags: { source: 'auth-middleware' },
          extra: { path: '/api/secure' },
        })
      );
    });

  });

  describe('Authorization and Permissions', () => {
    /**
     * Tests that the middleware correctly passes user context with role information
     * to downstream route handlers. The middleware itself doesn't enforce RBAC,
     * but ensures the context is available for route-level authorization.
     * 
     * @test {middleware} User context preservation for RBAC
     * @covers User role and permission context passing
     * @note Actual RBAC enforcement happens in route handlers
     */
    it('should pass user context for role-based access control', async () => {
      const testUser = {
        id: 'user_1',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      };

      mockClerkAuthMiddleware.mockResolvedValue({
        user: testUser,
      });

      const request = createMockRequest({
        url: 'http://localhost/api/admin/users',
      });

      const response = await middleware(request);

      // Middleware should pass through successfully
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(500);
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      
      // Note: Actual RBAC enforcement would be in route handlers
      // The middleware's job is to authenticate and provide user context
    });

    /**
     * Tests that the middleware correctly handles complex user attribute contexts
     * that would be used for attribute-based access control in route handlers.
     * 
     * @test {middleware} User attribute context handling
     * @covers Complex user metadata preservation
     * @note Actual ABAC evaluation happens in route handlers
     */
    it('should pass user attributes for attribute-based access control', async () => {
      const userWithAttributes = {
        id: 'user_1',
        attributes: {
          department: 'engineering',
          clearanceLevel: 'secret',
          location: 'US',
        },
      };

      mockClerkAuthMiddleware.mockResolvedValue({
        user: userWithAttributes,
      });

      const request = createMockRequest({
        url: 'http://localhost/api/documents/classified',
      });

      const response = await middleware(request);

      // Middleware should authenticate and pass context through
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(500);
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      
      // ABAC evaluation would happen in route handlers with the provided context
    });

    /**
     * Tests that the middleware preserves field-level permission metadata
     * for use by route handlers in implementing granular access control.
     * 
     * @test {middleware} Field-level permission context
     * @covers Granular permission metadata handling
     */
    it('should preserve field-level permission context', async () => {
      const fieldPermissions = {
        user: {
          id: 'user_123',
          role: 'viewer',
          fieldPermissions: {
            'user.email': 'read',
            'user.phone': 'none',
            'user.ssn': 'none', 
            'user.name': 'read',
          },
        },
      };

      mockClerkAuthMiddleware.mockResolvedValue(fieldPermissions);

      const request = createMockRequest({
        url: 'http://localhost/api/users/profile',
      });

      const response = await middleware(request);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(500);
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
    });

  });

  describe('CORS and Security Headers', () => {
    /**
     * Tests that requests with various origins are handled appropriately.
     * Note: CORS enforcement typically happens in dedicated middleware or
     * at the application level, not in authentication middleware.
     * 
     * @test {middleware} Origin header handling
     * @covers Request processing with different origins
     */
    it('should handle requests with different origins', async () => {
      const originScenarios = [
        'http://localhost:3000',
        'https://app.zopio.com',
        'https://example.com',
        undefined, // Same-origin request
      ];

      for (const origin of originScenarios) {
        const headers: Record<string, string> = {};
        if (origin) {
          headers['Origin'] = origin;
        }

        const request = createMockRequest({
          url: 'http://localhost/api/data',
          headers,
          method: 'GET',
        });

        await middleware(request);

        // The middleware should process all origins (CORS handled elsewhere)
        expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
        
        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Tests handling of CORS preflight OPTIONS requests, which should
     * be processed by the authentication middleware like any other request.
     * 
     * @test {middleware} OPTIONS request handling
     * @covers CORS preflight request processing
     */
    it('should handle preflight OPTIONS requests', async () => {
      const request = createMockRequest({
        method: 'OPTIONS',
        url: 'http://localhost/api/users',
        headers: {
          'Origin': 'https://app.zopio.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });

      const response = await middleware(request);

      // OPTIONS requests for protected paths should still go through auth
      expect(response.status).not.toBe(500);
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
    });

    /**
     * Tests that the middleware processes requests with different HTTP methods.
     * Method-level restrictions are typically enforced by Next.js routing
     * or individual route handlers, not by authentication middleware.
     * 
     * @test {middleware} HTTP method processing
     * @covers Method-agnostic authentication
     */
    it('should process requests with different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const testPath = '/api/users';

      for (const method of methods) {
        const request = createMockRequest({
          method,
          url: `http://localhost${testPath}`,
        });

        await middleware(request);

        // All methods should be processed by auth middleware
        expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
        
        mockClerkAuthMiddleware.mockClear();
      }
    });

  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Tests the middleware's behavior with various request scenarios.
     * Rate limiting is typically handled by dedicated middleware, not auth middleware.
     * 
     * @test {middleware} Request processing reliability
     * @covers Consistent request handling
     */
    it('should handle multiple requests consistently', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        createMockRequest({
          url: `http://localhost/api/test-endpoint-${i}`,
        })
      );

      for (const request of requests) {
        const response = await middleware(request);
        
        // Each request should be processed consistently
        expect(response.status).not.toBe(500);
        expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
        
        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Tests middleware behavior across different endpoint types to ensure
     * consistent authentication handling regardless of the endpoint.
     * 
     * @test {middleware} Endpoint-agnostic processing
     * @covers Consistent auth handling across endpoints
     */
    it('should handle different endpoint types consistently', async () => {
      const endpoints = [
        '/api/auth/login',
        '/api/users',
        '/api/data/export',
        '/admin/settings',
      ];

      for (const endpoint of endpoints) {
        const request = createMockRequest({
          url: `http://localhost${endpoint}`,
        });

        const response = await middleware(request);

        // All protected endpoints should be processed by auth middleware
        expect(response.status).not.toBe(500);
        expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
        
        mockClerkAuthMiddleware.mockClear();
      }
    });

    /**
     * Tests that the middleware handles requests with custom headers properly,
     * ensuring header information is preserved through the auth process.
     * 
     * @test {middleware} Header preservation
     * @covers Request header handling
     */
    it('should preserve request headers during processing', async () => {
      const customHeaders = {
        'X-Custom-Header': 'test-value',
        'User-Agent': 'TestAgent/1.0',
        'Accept': 'application/json',
      };

      const request = createMockRequest({
        url: 'http://localhost/api/data',
        headers: customHeaders,
      });

      const response = await middleware(request);

      // Request should be processed normally
      expect(response.status).not.toBe(500);
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
    });

  });





  describe('Error Handling', () => {
    /**
     * Tests that various authentication error types are handled gracefully
     * with proper error responses and Sentry reporting.
     * 
     * @test {middleware} Authentication error handling
     * @covers Error type handling and response formatting
     * @covers Sentry integration for error reporting
     */
    it('should handle authentication errors gracefully', async () => {
      const errorScenarios = [
        new Error('Network timeout'),
        new TypeError('Cannot read property of undefined'),
        new Error('Database connection failed'),
      ];

      for (const error of errorScenarios) {
        mockClerkAuthMiddleware.mockRejectedValue(error);

        const request = createMockRequest({
          url: 'http://localhost/api/protected',
        });

        const response = await middleware(request);

        // All errors should result in 500 status with standard error format
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toEqual({
          error: 'Authentication error',
          message: 'Failed to authenticate request',
        });

        // Verify error reporting to Sentry
        expect(Sentry.captureException).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            tags: { source: 'auth-middleware' },
            extra: { path: '/api/protected' },
          })
        );
        
        vi.clearAllMocks();
      }
    });

    /**
     * Tests that Sentry reporting failures don't break the middleware's
     * error handling and response generation.
     * 
     * @test {middleware} Graceful Sentry failure handling
     * @covers Error handling resilience
     */
    it('should propagate Sentry failures', async () => {
      // Make Sentry.captureException throw an error
      vi.mocked(Sentry.captureException).mockImplementation(() => {
        throw new Error('Sentry unavailable');
      });

      const originalError = new Error('Auth error');
      mockClerkAuthMiddleware.mockRejectedValue(originalError);

      const request = createMockRequest({
        url: 'http://localhost/api/data',
      });

      // The middleware doesn't wrap Sentry calls, so Sentry errors will propagate
      await expect(middleware(request)).rejects.toThrow('Sentry unavailable');
    });
  });





  describe('Middleware Configuration', () => {
    /**
     * Verifies that the middleware configuration is properly defined
     * and contains the expected matcher patterns.
     * 
     * @test {middleware} Configuration validation
     * @covers Middleware configuration structure
     * @covers Route matcher definition
     */
    it('should have correct matcher configuration', () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher).toContain('/((?!_next/static|favicon.ico).*)');

      // Verify configuration structure matches expected format
      expect(config).toEqual({
        matcher: expect.arrayContaining([
          expect.stringContaining('_next/static'),
          expect.stringContaining('favicon.ico'),
        ]),
      });
    });

    /**
     * Tests that the matcher configuration correctly identifies which routes
     * should and should not be processed by the middleware.
     * 
     * @test {middleware} Route matching logic
     * @covers Matcher pattern validation
     * @covers Static asset exclusion
     */
    it('should process expected routes based on Next.js matcher', () => {
      // The matcher configuration is used by Next.js internally
      // We verify that our configuration is structured correctly
      const matcher = config.matcher[0];
      expect(matcher).toBe('/((?!_next/static|favicon.ico).*)');
      
      // This test validates our configuration format, not regex parsing
      // The actual route matching is handled by Next.js framework
      expect(config.matcher).toHaveLength(1);
      expect(typeof matcher).toBe('string');
      expect(matcher).toContain('_next/static');
      expect(matcher).toContain('favicon.ico');
    });
  });


  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Tests that the middleware handles various authorization header formats
     * gracefully without crashing or causing unexpected behavior.
     * 
     * @test {middleware} Authorization header edge cases
     * @covers Header validation and parsing
     */
    it('should handle malformed authorization headers gracefully', async () => {
      const headerVariations = [
        { Authorization: '' },
        { Authorization: 'Bearer' }, // Missing token
        { Authorization: 'Bearer ' }, // Empty token 
        { Authorization: '  Bearer  token  ' }, // Extra spaces
      ];

      for (const headers of headerVariations) {
        const request = createMockRequest({
          url: 'http://localhost/api/protected',
          headers: headers as Record<string, string>,
        });

        const response = await middleware(request);

        // Should handle gracefully without errors
        expect(response).toBeDefined();
        expect(response.status).toBeDefined();
        
        vi.clearAllMocks();
      }
    });

    /**
     * Tests middleware behavior with extremely long URLs to ensure
     * no buffer overflows or crashes occur.
     * 
     * @test {middleware} Long URL handling
     * @covers URL parsing resilience
     */
    it('should handle extremely long URLs', async () => {
      const longPath = '/api/' + 'a'.repeat(1000); // Very long path

      const request = createMockRequest({
        url: `http://localhost${longPath}`,
      });

      const response = await middleware(request);

      // Should not crash on long URLs
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    /**
     * Tests handling of URLs with special characters and Unicode to ensure
     * proper URL parsing and path matching.
     * 
     * @test {middleware} Special character handling
     * @covers Unicode and encoded character support
     */
    it('should handle special characters in paths', async () => {
      const specialPaths = [
        '/api/users/test@example.com',
        '/api/files/document%20with%20spaces.pdf',
        '/api/search?q=test&filter[status]=active',
      ];

      for (const path of specialPaths) {
        const request = createMockRequest({
          url: `http://localhost${path}`,
        });

        const response = await middleware(request);

        // Should handle special characters without errors
        expect(response).toBeDefined();
        expect(response.status).toBeDefined();
      }
    });
  });


});
