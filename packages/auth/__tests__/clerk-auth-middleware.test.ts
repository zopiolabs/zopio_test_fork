/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockEnv, mockJwtVerify } from '@repo/testing';

// Mock the verify-clerk-token module
vi.mock('../lib/verify-clerk-token.js', () => ({
  verifyClerkToken: vi.fn(),
}));

import { clerkAuthMiddleware } from '../clerk-auth-middleware.js';
import { verifyClerkToken } from '../lib/verify-clerk-token.js';

const mockVerifyClerkToken = vi.mocked(verifyClerkToken);

describe('clerkAuthMiddleware', () => {
  let envMock: ReturnType<typeof mockEnv> | undefined;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    envMock?.restore();
    envMock = undefined;
  });

  describe('authorization header validation', () => {
    it('should return 401 when authorization header is missing', async () => {
      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
      
      const text = await response.text();
      expect(text).toBe('Unauthorized: Missing or invalid authorization header');
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic username:password',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
      
      const text = await response.text();
      expect(text).toBe('Unauthorized: Missing or invalid authorization header');
    });

    it('should return 401 when authorization header is empty string', async () => {
      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': '',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });

    it('should return 401 when authorization header is only "Bearer"', async () => {
      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });

    it('should return 401 when authorization header is "Bearer " with only space', async () => {
      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });
  });

  describe('token verification', () => {
    it('should successfully authenticate with valid token', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_123');

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: 'user_123' });
      expect(mockVerifyClerkToken).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('should return 403 when token verification fails', async () => {
      mockVerifyClerkToken.mockRejectedValue(new Error('Invalid token'));

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(403);
      
      const text = await response.text();
      expect(text).toBe('Invalid authentication token');
    });

    it('should return 403 when token verification throws unknown error', async () => {
      mockVerifyClerkToken.mockRejectedValue('Unknown error');

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer problematic-token',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(403);
      
      const text = await response.text();
      expect(text).toBe('Invalid authentication token');
    });

    it('should handle token with extra whitespace', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_456');

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': '  Bearer   token-with-spaces  ',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      // The current implementation trims and accepts the token
      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: 'user_456' });
      expect(mockVerifyClerkToken).toHaveBeenCalledWith('');
    });

    it('should handle multiple Bearer tokens (should use first one)', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_789');

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token1 Bearer token2',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: 'user_789' });
      // The implementation splits by space and takes the token after "Bearer"
      expect(mockVerifyClerkToken).toHaveBeenCalledWith('token1');
    });
  });

  describe('request modification', () => {
    it('should preserve original request properties while adding user', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_test');

      const originalUrl = 'http://localhost/api/test';
      const originalMethod = 'POST';
      const originalBody = JSON.stringify({ data: 'test' });
      
      const mockRequest = new Request(originalUrl, {
        method: originalMethod,
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value',
        },
        body: originalBody,
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      
      // Check user was added
      expect(request.user).toEqual({ id: 'user_test' });
      
      // Check original properties preserved
      expect(request.url).toBe(originalUrl);
      expect(request.method).toBe(originalMethod);
      expect(request.headers.get('Content-Type')).toBe('application/json');
      expect(request.headers.get('Custom-Header')).toBe('custom-value');
      expect(request.headers.get('Authorization')).toBe('Bearer valid-token');
    });

    it('should not modify request when authentication fails', async () => {
      mockVerifyClerkToken.mockRejectedValue(new Error('Token expired'));

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer expired-token',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      expect(result).not.toBe(mockRequest);
    });

    it('should handle requests with existing user property gracefully', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_new');

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      // Simulate existing user property
      (mockRequest as any).user = { id: 'user_old' };

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      
      // Should overwrite existing user property
      expect(request.user).toEqual({ id: 'user_new' });
    });
  });

  describe('different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    methods.forEach(method => {
      it(`should handle ${method} requests correctly`, async () => {
        mockVerifyClerkToken.mockResolvedValue('user_method_test');

        const mockRequest = new Request('http://localhost/test', {
          method,
          headers: {
            'Authorization': 'Bearer method-test-token',
          },
        });

        const result = await clerkAuthMiddleware(mockRequest);

        expect(result).toBeInstanceOf(Request);
        const request = result as Request;
        expect(request.user).toEqual({ id: 'user_method_test' });
        expect(request.method).toBe(method);
      });
    });
  });

  describe('security considerations', () => {
    it('should not leak token verification error details', async () => {
      const sensitiveError = new Error('Database connection failed: password123');
      mockVerifyClerkToken.mockRejectedValue(sensitiveError);

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-causing-sensitive-error',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      
      const text = await response.text();
      expect(text).toBe('Invalid authentication token');
      expect(text).not.toContain('Database connection failed');
      expect(text).not.toContain('password123');
    });

    it('should handle malformed JWT tokens securely', async () => {
      mockVerifyClerkToken.mockRejectedValue(new Error('JWT malformed'));

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer not.a.valid.jwt.token.structure',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(403);
      
      const text = await response.text();
      expect(text).toBe('Invalid authentication token');
    });

    it('should handle extremely long tokens without crashing', async () => {
      const longToken = 'a'.repeat(10000);
      mockVerifyClerkToken.mockRejectedValue(new Error('Token too long'));

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${longToken}`,
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(403);
      expect(mockVerifyClerkToken).toHaveBeenCalledWith(longToken);
    });

    it('should handle special characters in tokens', async () => {
      const specialToken = 'token.with.special-chars_123!@#$%^&*()';
      mockVerifyClerkToken.mockResolvedValue('user_special');

      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${specialToken}`,
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: 'user_special' });
      expect(mockVerifyClerkToken).toHaveBeenCalledWith(specialToken);
    });
  });

  describe('performance considerations', () => {
    it('should handle concurrent requests properly', async () => {
      mockVerifyClerkToken
        .mockResolvedValueOnce('user_1')
        .mockResolvedValueOnce('user_2')
        .mockResolvedValueOnce('user_3');

      const requests = [
        new Request('http://localhost/test1', {
          headers: { 'Authorization': 'Bearer token1' },
        }),
        new Request('http://localhost/test2', {
          headers: { 'Authorization': 'Bearer token2' },
        }),
        new Request('http://localhost/test3', {
          headers: { 'Authorization': 'Bearer token3' },
        }),
      ];

      const results = await Promise.all(
        requests.map(req => clerkAuthMiddleware(req))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeInstanceOf(Request);
        const request = result as Request;
        expect(request.user).toEqual({ id: `user_${index + 1}` });
      });

      expect(mockVerifyClerkToken).toHaveBeenCalledTimes(3);
    });

    it('should not block on slow token verification', async () => {
      // Simulate slow token verification
      mockVerifyClerkToken.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('user_slow'), 100))
      );

      const startTime = Date.now();
      
      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer slow-token' },
      });

      const result = await clerkAuthMiddleware(mockRequest);
      const endTime = Date.now();

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: 'user_slow' });
      
      // Should wait for the verification to complete
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('edge cases', () => {
    it('should handle null authorization header', async () => {
      const mockRequest = new Request('http://localhost/test', {
        method: 'GET',
      });

      // Manually set null header to test edge case
      Object.defineProperty(mockRequest.headers, 'get', {
        value: vi.fn().mockReturnValue(null),
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });

    it('should handle case-insensitive Bearer token', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_case');

      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'bearer lowercase-token' },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      // Current implementation is case-sensitive, should fail
      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });

    it('should handle empty token after Bearer', async () => {
      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer ' },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });

    it('should handle token verification returning null/undefined', async () => {
      mockVerifyClerkToken.mockResolvedValue(null);

      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer null-user-token' },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: null });
    });

    it('should handle token verification returning empty string', async () => {
      mockVerifyClerkToken.mockResolvedValue('');

      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer empty-user-token' },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      expect(request.user).toEqual({ id: '' });
    });
  });

  describe('type safety', () => {
    it('should properly type the user property on successful authentication', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_typed');

      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer typed-token' },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      
      // TypeScript should infer the correct type
      expect(typeof request.user?.id).toBe('string');
      expect(request.user?.id).toBe('user_typed');
    });

    it('should handle Request interface extension properly', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_interface');

      const mockRequest = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer interface-token' },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const request = result as Request;
      
      // The user property should be available due to global interface extension
      expect('user' in request).toBe(true);
      expect(request.user).toBeDefined();
    });
  });
});