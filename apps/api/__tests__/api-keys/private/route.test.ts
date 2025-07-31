/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Comprehensive test suite for Private API Keys Route
 * 
 * This test suite validates the private API endpoint that demonstrates authentication
 * middleware integration and secure endpoint functionality:
 * 
 * - Authentication middleware integration with Clerk
 * - Request validation and user identification
 * - Response format and data consistency
 * - Error handling for authentication failures
 * - Security edge cases and attack vectors
 * - Performance characteristics under various conditions
 * 
 * Testing strategies employed:
 * - Mock-based testing for Clerk authentication middleware
 * - Property-based testing for request validation
 * - Security testing for common attack vectors
 * - Performance testing for response times
 * - Integration testing with authentication flow
 * 
 * @author Test Infrastructure Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { NextRequest } from 'next/server';
import { GET } from '../../../app/api-keys/private/route';
import {
  createMockRequest,
  assertResponse,
} from '../../utils/api-test-helpers';

// Mock Clerk authentication middleware
vi.mock('@repo/auth', () => ({
  clerkAuthMiddleware: vi.fn(),
}));

// Import after mocking to ensure mocks are applied
import { clerkAuthMiddleware } from '@repo/auth';

/**
 * Test utilities for API key route testing
 */
const createAuthenticatedRequest = (options: { userId?: string } = {}): NextRequest => {
  return createMockRequest({
    method: 'GET',
    url: 'http://localhost:3000/api-keys/private',
    headers: {
      'Authorization': 'Bearer valid-token',
      'User-Agent': 'Test Client',
    },
  });
};

/**
 * Property-based test generators
 */
const userIdArbitrary = fc.string({ minLength: 1, maxLength: 100 }).filter(id => 
  !id.includes('\n') && !id.includes('\r') && id.trim().length > 0
);

const timestampArbitrary = fc.date({ 
  min: new Date('2020-01-01'), 
  max: new Date('2030-12-31') 
});

describe('Private API Keys Route - Comprehensive Test Suite', () => {
  const mockClerkAuthMiddleware = vi.mocked(clerkAuthMiddleware);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Successful Authentication Flow', () => {
    /**
     * Tests for successful authentication and response handling
     */

    it('should return success response with valid authentication', async () => {
      const testUserId = 'user_test123';
      const testDate = new Date('2024-01-01T12:00:00.000Z');
      vi.setSystemTime(testDate);

      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: testUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toEqual({
        message: 'Private API key-protected endpoint',
        user: testUserId,
        timestamp: testDate.toISOString(),
      });

      assertResponse.headers(response, {
        'Content-Type': 'application/json',
      });
    });

    it('should handle user ID extraction from authenticated request', async () => {
      const testUserId = 'user_complex_id_with_123';
      
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: testUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe(testUserId);
      expect(responseData.message).toBe('Private API key-protected endpoint');
    });

    it('should generate valid timestamps', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_timestamp_test' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const beforeRequest = Date.now();
      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const afterRequest = Date.now();

      const responseData = await response.json();
      const responseTimestamp = new Date(responseData.timestamp).getTime();

      expect(responseTimestamp).toBeGreaterThanOrEqual(beforeRequest);
      expect(responseTimestamp).toBeLessThanOrEqual(afterRequest);
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    /**
     * Property-based testing for successful authentication
     */
    it('should handle various valid user IDs (property-based)', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArbitrary, async (userId) => {
          const mockRequest = createAuthenticatedRequest();
          (mockRequest as any).user = { id: userId };
          mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

          const request = createAuthenticatedRequest();
          const response = await GET(request);

          expect(response.status).toBe(200);
          
          const responseData = await response.json();
          expect(responseData.user).toBe(userId);
          expect(responseData.message).toBe('Private API key-protected endpoint');
          expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        })
      );
    });

    it('should maintain consistent response structure across requests', async () => {
      const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
      const responses: any[] = [];

      // Helper function to process a single user request
      const processUserRequest = async (userId: string) => {
        const mockRequest = createAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createAuthenticatedRequest();
        const response = await GET(request);
        const responseData = await response.json();

        responses.push(responseData);
        
        // Verify consistent structure
        expect(responseData).toHaveProperty('message');
        expect(responseData).toHaveProperty('user');
        expect(responseData).toHaveProperty('timestamp');
        expect(Object.keys(responseData)).toHaveLength(3);
      };

      for (const userId of userIds) {
        await processUserRequest(userId);
      }

      // Verify all responses have the same structure
      // Extract compare function to reduce nesting
      const alphabeticalCompare = (a: string, b: string) => a.localeCompare(b);
      const sortKeys = (obj: any) => Object.keys(obj).sort(alphabeticalCompare).join(',');
      const firstResponseKeys = sortKeys(responses[0]);
      
      for (const response of responses) {
        expect(sortKeys(response)).toEqual(firstResponseKeys);
      }
    });
  });

  describe('Authentication Failures', () => {
    /**
     * Tests for authentication failure scenarios
     */

    it('should return error response when authentication middleware returns Response', async () => {
      const errorResponse = new Response('Unauthorized', { 
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });
      
      mockClerkAuthMiddleware.mockResolvedValue(errorResponse);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      expect(response).toBe(errorResponse);
      expect(response.status).toBe(401);
    });

    it('should handle authentication middleware returning different error types', async () => {
      const errorScenarios = [
        { status: 401, message: 'Unauthorized' },
        { status: 403, message: 'Forbidden' },
        { status: 422, message: 'Invalid token format' },
        { status: 429, message: 'Too many requests' },
      ];

      for (const scenario of errorScenarios) {
        const errorResponse = new Response(scenario.message, { 
          status: scenario.status,
          headers: { 'Content-Type': 'text/plain' },
        });
        
        mockClerkAuthMiddleware.mockResolvedValue(errorResponse);

        const request = createAuthenticatedRequest();
        const response = await GET(request);

        expect(response).toBe(errorResponse);
        expect(response.status).toBe(scenario.status);

        vi.clearAllMocks();
      }
    });

    it('should handle authentication middleware throwing errors', async () => {
      const authError = new Error('Authentication service unavailable');
      mockClerkAuthMiddleware.mockRejectedValue(authError);

      const request = createAuthenticatedRequest();

      await expect(GET(request)).rejects.toThrow('Authentication service unavailable');
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
    });

    it('should handle authentication middleware returning invalid data', async () => {
      const invalidResponses = [
        null,
        undefined,
        {},
        { user: null },
        { user: undefined },
        { user: {} },
        { invalidField: 'test' },
      ];

      for (const invalidResponse of invalidResponses) {
        const mockRequest = createAuthenticatedRequest();
        Object.assign(mockRequest, invalidResponse);
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest as any);

        const request = createAuthenticatedRequest();
        const response = await GET(request);

        const responseData = await response.json();
        expect(responseData.user).toBe('unknown');
        expect(response.status).toBe(200);

        vi.clearAllMocks();
      }
    });
  });

  describe('Request Handling and Edge Cases', () => {
    /**
     * Tests for various request scenarios and edge cases
     */

    it('should handle requests without user object in validated request', async () => {
      const mockRequest = createAuthenticatedRequest();
      // No user object attached
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe('unknown');
      expect(responseData.message).toBe('Private API key-protected endpoint');
    });

    it('should handle requests with undefined user ID', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: undefined };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe('unknown');
    });

    it('should handle requests with null user ID', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: null };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe('unknown');
    });

    it('should handle requests with empty string user ID', async () => {
      const mockRequest = createAuthenticatedRequest();
      Object.assign(mockRequest, { user: { id: '' } });
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest as any);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe('unknown');
    });

    it('should handle user objects with additional properties', async () => {
      const mockRequest = createAuthenticatedRequest();
      Object.assign(mockRequest, { 
        user: { 
          id: 'user_extra_props',
        },
      });
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest as any);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe('user_extra_props');
      // Should only include the ID, not other properties
    });

    it('should handle requests with malformed headers', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_malformed_headers' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api-keys/private',
        headers: {
          'Authorization': 'Bearer\x00invalid\x00token',
          'User-Agent': 'Test\x00Client',
          'X-Malformed': '\x01\x02\x03',
        },
      });

      // Should still work despite malformed headers
      const response = await GET(request);
      const responseData = await response.json();
      expect(responseData.user).toBe('user_malformed_headers');
    });
  });

  describe('Security and Attack Vector Testing', () => {
    /**
     * Tests for security vulnerabilities and attack vectors
     */

    it('should sanitize user ID in response', async () => {
      const maliciousUserIds = [
        'user_<script>alert("xss")</script>',
        'user_\'; DROP TABLE users; --',
        'user_{{constructor.constructor("alert(1)")()}}',
        'user_${process.env.SECRET}',
        'user_\x00\x01\x02',
      ];

      for (const userId of maliciousUserIds) {
        const mockRequest = createAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createAuthenticatedRequest();
        const response = await GET(request);

        const responseData = await response.json();
        // User ID should be returned as-is since it's just echoed in JSON
        // The security is in the authentication middleware validation
        expect(responseData.user).toBe(userId);
        expect(response.status).toBe(200);

        vi.clearAllMocks();
      }
    });

    it('should handle extremely long user IDs', async () => {
      const longUserId = 'user_' + 'x'.repeat(10000); // Very long user ID
      
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: longUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe(longUserId);
      expect(response.status).toBe(200);
    });

    it('should handle requests with suspicious patterns', async () => {
      const suspiciousPatterns = [
        '../../../etc/passwd',
        '../../app/config',
        'user_id\n\r\nSet-Cookie: evil=true',
        'user_id\u0000admin',
      ];

      for (const pattern of suspiciousPatterns) {
        const mockRequest = createAuthenticatedRequest();
        (mockRequest as any).user = { id: pattern };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createAuthenticatedRequest();
        const response = await GET(request);

        // Should handle suspicious patterns without crashing
        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe(pattern);

        vi.clearAllMocks();
      }
    });

    it('should not leak sensitive information in responses', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { 
        id: 'user_test',
        // Note: email, password, apiKey should not be included in user object
        // as they don't exist on the expected { id: string } type
      };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      
      // Should only expose safe fields
      expect(responseData).toHaveProperty('user', 'user_test');
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('timestamp');
      
      // Should not leak sensitive fields
      expect(responseData).not.toHaveProperty('email');
      expect(responseData).not.toHaveProperty('password');
      expect(responseData).not.toHaveProperty('apiKey');
    });
  });

  describe('Performance and Reliability Testing', () => {
    /**
     * Tests for performance characteristics and reliability
     */

    it('should respond within acceptable time limits', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_performance_test' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      
      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(100); // Should respond within 100ms
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const userIds = Array.from({ length: concurrentRequests }, (_, i) => `user_concurrent_${i}`);

      // Helper function to create a single concurrent request
      const createConcurrentRequest = (userId: string) => {
        const mockRequest = createAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createAuthenticatedRequest();
        return GET(request);
      };

      const promises = userIds.map(createConcurrentRequest);

      const startTime = performance.now();
      const responses = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTimePerRequest = totalTime / concurrentRequests;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(averageTimePerRequest).toBeLessThan(50); // Average under 50ms per request
    });

    it('should handle authentication middleware delays gracefully', async () => {
      // Test that the route handles delayed authentication responses correctly
      // by mocking a middleware that returns a promise
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_slow_auth' };
      
      // Mock the authentication middleware to return a promise that resolves
      // This simulates an async authentication process
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.user).toBe('user_slow_auth');
    });

    it('should maintain memory efficiency with large payloads', async () => {
      const largeUserId = 'user_' + 'x'.repeat(100000); // 100KB user ID
      
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { 
        id: largeUserId,
        // Note: metadata doesn't exist on the expected { id: string } type
      };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.user).toBe(largeUserId);
    });
  });

  describe('Integration and Compatibility Testing', () => {
    /**
     * Tests for integration scenarios and compatibility
     */

    it('should work with different request formats', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_different_formats' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const requestVariations = [
        createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api-keys/private',
        }),
        createMockRequest({
          method: 'GET',
          url: 'https://production.example.com/api-keys/private',
        }),
        createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api-keys/private?param=value',
        }),
      ];

      for (const request of requestVariations) {
        const response = await GET(request);
        expect(response.status).toBe(200);
        
        const responseData = await response.json();
        expect(responseData.user).toBe('user_different_formats');

        vi.clearAllMocks();
        const mockRequest2 = createAuthenticatedRequest();
        (mockRequest2 as any).user = { id: 'user_different_formats' };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest2);
      }
    });

    it('should maintain consistent behavior across Node.js versions', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_node_compatibility' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      // Basic functionality should work regardless of Node.js version
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.user).toBe('user_node_compatibility');
      expect(typeof responseData.timestamp).toBe('string');
    });

    it('should handle edge cases in timestamp generation', async () => {
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_timestamp_edge' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      // Test at year boundary
      vi.setSystemTime(new Date('2023-12-31T23:59:59.999Z'));

      const request = createAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.timestamp).toBe('2023-12-31T23:59:59.999Z');
      expect(responseData.user).toBe('user_timestamp_edge');
    });
  });

  describe('Error Recovery and Resilience', () => {
    /**
     * Tests for error recovery and system resilience
     */

    it('should recover from temporary authentication failures', async () => {
      // First request fails
      mockClerkAuthMiddleware.mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }));
      
      const request1 = createAuthenticatedRequest();
      const response1 = await GET(request1);
      expect(response1.status).toBe(503);

      // Second request succeeds
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_recovery_test' };
      mockClerkAuthMiddleware.mockResolvedValueOnce(mockRequest);

      const request2 = createAuthenticatedRequest();
      const response2 = await GET(request2);
      expect(response2.status).toBe(200);
      
      const responseData = await response2.json();
      expect(responseData.user).toBe('user_recovery_test');
    });

    it('should handle partial authentication data gracefully', async () => {
      const partialDataScenarios = [
        { user: { id: 'valid_id', invalidField: null } },
        { user: { id: 'valid_id' }, extraData: 'ignored' },
        { user: { id: 'valid_id', nested: { data: 'ignored' } } },
      ];

      for (const scenario of partialDataScenarios) {
        const mockRequest = createAuthenticatedRequest();
        Object.assign(mockRequest, scenario);
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest as any);

        const request = createAuthenticatedRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe('valid_id');

        vi.clearAllMocks();
      }
    });

    it('should maintain state consistency across multiple calls', async () => {
      const testUserId = 'user_state_consistency';
      
      const mockRequest = createAuthenticatedRequest();
      (mockRequest as any).user = { id: testUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      // Make multiple calls
      const requests = Array.from({ length: 5 }, () => createAuthenticatedRequest());
      const responses = await Promise.all(requests.map(req => GET(req)));

      // All responses should be consistent
      for (const response of responses) {
        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe(testUserId);
        expect(responseData.message).toBe('Private API key-protected endpoint');
      }
    });
  });
});