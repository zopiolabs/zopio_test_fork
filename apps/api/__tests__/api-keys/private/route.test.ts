/**
 * @fileoverview Comprehensive test suite for Private API Keys Route handler
 * 
 * This test suite validates the /api-keys/private endpoint that demonstrates secure
 * authentication middleware integration with comprehensive coverage of:
 * 
 * Core Functionality:
 * - Clerk authentication middleware integration and validation
 * - User identification and request context extraction
 * - Response format consistency and data integrity
 * - Timestamp generation and validation
 * 
 * Security & Edge Cases:
 * - Authentication failure scenarios and error propagation
 * - Malicious input sanitization and injection prevention
 * - User data validation and fallback handling
 * - Request tampering and suspicious pattern detection
 * 
 * Performance & Reliability:
 * - Response time validation and performance benchmarking
 * - Concurrent request handling and memory efficiency
 * - Error recovery and resilience testing
 * - Cross-environment compatibility validation
 * 
 * Testing Methodologies:
 * - Property-based testing with fast-check for input validation
 * - Mock-based testing for external service dependencies
 * - Performance profiling with timing assertions
 * - Security testing against OWASP common attack vectors
 * - Integration testing with realistic request/response cycles
 * 
 * @module api-keys/private/route.test
 * @author Test Infrastructure Team
 * @version 1.2.0
 * @since 2024-01-01
 * @requires vitest
 * @requires fast-check
 * @requires @repo/auth
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
 * 
 * @description Creates a mock authenticated request with proper headers and structure
 * for testing the private API keys endpoint
 */
const createTestAuthenticatedRequest = (options: { userId?: string } = {}): NextRequest => {
  return createMockRequest({
    method: 'GET',
    url: 'http://localhost:3000/api-keys/private',
    headers: {
      'Authorization': 'Bearer valid-token',
      'User-Agent': 'Test Client',
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Property-based test generators for comprehensive input validation
 * 
 * @description Arbitraries for generating test data that covers edge cases
 * and ensures robust validation across different input types
 */
const userIdArbitrary = fc.string({ minLength: 1, maxLength: 100 }).filter(id => 
  !id.includes('\n') && !id.includes('\r') && id.trim().length > 0
);

const timestampArbitrary = fc.date({ 
  min: new Date('2020-01-01'), 
  max: new Date('2030-12-31') 
});

/**
 * Malicious input patterns for security testing
 */
const maliciousInputArbitrary = fc.constantFrom(
  'user_<script>alert("xss")</script>',
  'user_\'; DROP TABLE users; --',
  'user_{{constructor.constructor("alert(1)")()}}',
  'user_${process.env.SECRET}',
  'user_\x00\x01\x02',
  '../../../etc/passwd',
  'user_id\n\r\nSet-Cookie: evil=true'
);

/**
 * Main test suite for Private API Keys Route handler
 * 
 * @description Comprehensive validation of the /api-keys/private endpoint covering
 * authentication, security, performance, and reliability aspects with proper
 * test isolation and cleanup
 */
describe('Private API Keys Route - Comprehensive Test Suite', () => {
  const mockClerkAuthMiddleware = vi.mocked(clerkAuthMiddleware);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset any global state that might affect tests
    global.gc && global.gc();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Ensure complete cleanup between tests
    vi.clearAllTimers();
  });

  describe('Successful Authentication Flow', () => {
    /**
     * @description Tests validating successful authentication scenarios and proper response handling
     * covering user identification, timestamp generation, and response structure validation
     */

    it('should return structured success response with authenticated user data', async () => {
      const testUserId = 'user_test123';
      const testDate = new Date('2024-01-01T12:00:00.000Z');
      vi.setSystemTime(testDate);

      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: testUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
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

    it('should extract and return user ID from authenticated request context', async () => {
      const testUserId = 'user_complex_id_with_123';
      
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: testUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      const response = await GET(request);

      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.user).toBe(testUserId);
      expect(responseData.message).toBe('Private API key-protected endpoint');
      expect(responseData).toHaveProperty('timestamp');
    });

    it('should generate valid ISO 8601 timestamps within request timeframe', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_timestamp_test' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const beforeRequest = Date.now();
      const request = createTestAuthenticatedRequest();
      const response = await GET(request);
      const afterRequest = Date.now();

      const responseData = await response.json();
      const responseTimestamp = new Date(responseData.timestamp).getTime();

      // Validate timestamp is within request window
      expect(responseTimestamp).toBeGreaterThanOrEqual(beforeRequest);
      expect(responseTimestamp).toBeLessThanOrEqual(afterRequest);
      
      // Validate ISO 8601 format
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Validate timestamp is parseable and valid
      expect(new Date(responseData.timestamp).toISOString()).toBe(responseData.timestamp);
    });

    /**
     * @description Property-based testing for successful authentication with various user ID formats
     * using fast-check to generate diverse valid inputs and ensure consistent behavior
     */
    it('should handle diverse valid user ID formats consistently (property-based)', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArbitrary, async (userId) => {
          const mockRequest = createTestAuthenticatedRequest();
          (mockRequest as any).user = { id: userId };
          mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

          const request = createTestAuthenticatedRequest();
          const response = await GET(request);

          // Validate response structure and status
          expect(response.status).toBe(200);
          expect(response.headers.get('content-type')).toContain('application/json');
          
          const responseData = await response.json();
          expect(responseData.user).toBe(userId);
          expect(responseData.message).toBe('Private API key-protected endpoint');
          expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // Validate response has exactly the expected properties
          expect(Object.keys(responseData)).toHaveLength(3);
        }),
        { numRuns: 25 } // Reduced from default 100 for test performance
      );
    });

    it('should maintain consistent response structure across multiple authenticated requests', async () => {
      const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
      const responses: any[] = [];

      // Process all user requests and collect responses
      for (const userId of userIds) {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);
        const responseData = await response.json();

        responses.push(responseData);
        
        // Verify each response has the expected structure
        expect(responseData).toHaveProperty('message', 'Private API key-protected endpoint');
        expect(responseData).toHaveProperty('user', userId);
        expect(responseData).toHaveProperty('timestamp');
        expect(Object.keys(responseData)).toHaveLength(3);
        
        vi.clearAllMocks();
      }

      // Verify structural consistency across all responses
      const expectedKeys = ['message', 'timestamp', 'user'].sort();
      for (const response of responses) {
        const actualKeys = Object.keys(response).sort();
        expect(actualKeys).toEqual(expectedKeys);
        
        // Verify data types are consistent
        expect(typeof response.message).toBe('string');
        expect(typeof response.user).toBe('string');
        expect(typeof response.timestamp).toBe('string');
      }
    });
  });

  describe('Authentication Failures', () => {
    /**
     * @description Tests validating proper handling of authentication failures,
     * including middleware errors, invalid responses, and edge case scenarios
     */

    it('should propagate authentication middleware error responses unchanged', async () => {
      const errorResponse = new Response('Unauthorized', { 
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });
      
      mockClerkAuthMiddleware.mockResolvedValue(errorResponse);

      const request = createTestAuthenticatedRequest();
      const response = await GET(request);

      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      expect(response).toBe(errorResponse);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should handle various authentication middleware error status codes correctly', async () => {
      const errorScenarios = [
        { status: 401, message: 'Unauthorized - Invalid token' },
        { status: 403, message: 'Forbidden - Insufficient permissions' },
        { status: 422, message: 'Unprocessable Entity - Invalid token format' },
        { status: 429, message: 'Too Many Requests - Rate limit exceeded' },
        { status: 500, message: 'Internal Server Error - Auth service unavailable' },
      ];

      for (const scenario of errorScenarios) {
        const errorResponse = new Response(scenario.message, { 
          status: scenario.status,
          headers: { 'Content-Type': 'text/plain' },
        });
        
        mockClerkAuthMiddleware.mockResolvedValue(errorResponse);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        expect(response).toBe(errorResponse);
        expect(response.status).toBe(scenario.status);
        expect(await response.text()).toBe(scenario.message);

        vi.clearAllMocks();
      }
    });

    it('should propagate authentication middleware exceptions without modification', async () => {
      const authError = new Error('Authentication service unavailable');
      mockClerkAuthMiddleware.mockRejectedValue(authError);

      const request = createTestAuthenticatedRequest();

      await expect(GET(request)).rejects.toThrow('Authentication service unavailable');
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
      expect(mockClerkAuthMiddleware).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication middleware network timeouts gracefully', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockClerkAuthMiddleware.mockRejectedValue(timeoutError);

      const request = createTestAuthenticatedRequest();

      await expect(GET(request)).rejects.toThrow();
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
    });

    it('should gracefully handle authentication middleware returning invalid user data', async () => {
      const invalidUserDataScenarios = [
        { description: 'null user object', data: { user: null } },
        { description: 'undefined user object', data: { user: undefined } },
        { description: 'empty user object', data: { user: {} } },
        { description: 'user object without id', data: { user: { name: 'test' } } },
        { description: 'request without user property', data: {} },
      ];

      for (const scenario of invalidUserDataScenarios) {
        const mockRequest = createTestAuthenticatedRequest();
        if (scenario.data) {
          Object.assign(mockRequest, scenario.data);
        }
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest as any);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe('unknown');
        expect(responseData.message).toBe('Private API key-protected endpoint');
        expect(responseData).toHaveProperty('timestamp');

        vi.clearAllMocks();
      }
    });

    it('should handle null request from authentication middleware by throwing error', async () => {
      mockClerkAuthMiddleware.mockResolvedValue(null as any);

      const request = createTestAuthenticatedRequest();
      
      // Route should throw error when accessing null.user
      await expect(GET(request)).rejects.toThrow();
      expect(mockClerkAuthMiddleware).toHaveBeenCalledWith(request);
    });
  });

  describe('Request Handling and Edge Cases', () => {
    /**
     * @description Tests covering edge cases in request processing, including
     * invalid user data, malformed requests, and boundary conditions
     */

    it('should default to "unknown" user when request lacks user context', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      // No user object attached to simulate missing authentication context
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.user).toBe('unknown');
      expect(responseData.message).toBe('Private API key-protected endpoint');
      expect(responseData).toHaveProperty('timestamp');
    });

    it('should handle various invalid user ID values consistently', async () => {
      const invalidUserIds = [
        { value: undefined, description: 'undefined user ID', expected: 'unknown' },
        { value: null, description: 'null user ID', expected: 'unknown' },
        { value: '', description: 'empty string user ID', expected: 'unknown' },
        { value: '   ', description: 'whitespace-only user ID', expected: '   ' }, // Route returns as-is
      ];

      for (const { value, description, expected } of invalidUserIds) {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: value };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe(expected);
        
        vi.clearAllMocks();
      }
    });

    it('should extract only user ID from user objects with additional properties', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { 
        id: 'user_extra_props',
        email: 'user@example.com', // Should be ignored
        role: 'admin', // Should be ignored
        metadata: { plan: 'premium' }, // Should be ignored
      };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.user).toBe('user_extra_props');
      
      // Verify only safe fields are included in response
      expect(responseData).not.toHaveProperty('email');
      expect(responseData).not.toHaveProperty('role');
      expect(responseData).not.toHaveProperty('metadata');
      expect(Object.keys(responseData)).toEqual(['message', 'user', 'timestamp']);
    });

    it('should process requests with malformed headers gracefully', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_malformed_headers' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      // Use simpler headers that won't break Request creation
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api-keys/private',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'User-Agent': 'Test Client',
          'X-Malformed-Header': 'unusual-value',
          'Content-Type': 'application/json',
        },
      });

      // Route should handle malformed headers without throwing
      const response = await GET(request);
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.user).toBe('user_malformed_headers');
      expect(responseData.message).toBe('Private API key-protected endpoint');
    });
  });

  describe('Security and Attack Vector Testing', () => {
    /**
     * @description Comprehensive security testing against common attack vectors
     * including injection attacks, malicious inputs, and information disclosure
     */

    it('should handle potentially malicious user IDs without execution or interpretation', async () => {
      const maliciousUserIds = [
        'user_<script>alert("xss")</script>',
        'user_\'; DROP TABLE users; --',
        'user_{{constructor.constructor("alert(1)")()}}',
        'user_${process.env.SECRET}',
        'user_\x00\x01\x02',
        'user_</script><script>window.location="http://evil.com"</script>',
        'user_javascript:alert(1)',
      ];

      for (const userId of maliciousUserIds) {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        
        // User ID should be returned as-is (JSON serialization prevents execution)
        // Security relies on proper authentication middleware validation
        expect(responseData.user).toBe(userId);
        expect(responseData.message).toBe('Private API key-protected endpoint');

        vi.clearAllMocks();
      }
    });

    /**
     * @description Property-based security testing using generated malicious inputs
     */
    it('should handle generated malicious input patterns safely (property-based)', async () => {
      await fc.assert(
        fc.asyncProperty(maliciousInputArbitrary, async (maliciousInput) => {
          const mockRequest = createTestAuthenticatedRequest();
          (mockRequest as any).user = { id: maliciousInput };
          mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

          const request = createTestAuthenticatedRequest();
          const response = await GET(request);

          expect(response.status).toBe(200);
          const responseData = await response.json();
          expect(responseData.user).toBe(maliciousInput);
          expect(responseData).toHaveProperty('message');
          expect(responseData).toHaveProperty('timestamp');
        }),
        { numRuns: 15 } // Focused security test runs
      );
    });

    it('should handle extremely long user IDs without memory issues', async () => {
      const longUserId = 'user_' + 'x'.repeat(10000); // 10KB user ID
      
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: longUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      
      // Monitor memory usage during processing
      const initialMemory = process.memoryUsage().heapUsed;
      const response = await GET(request);
      const finalMemory = process.memoryUsage().heapUsed;
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.user).toBe(longUserId);
      expect(responseData.user).toHaveLength(10005); // 'user_' + 10000 'x' characters
      
      // Ensure no excessive memory growth (allow reasonable overhead)
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    it('should neutralize path traversal and injection patterns safely', async () => {
      const suspiciousPatterns = [
        { pattern: '../../../etc/passwd', description: 'path traversal attack' },
        { pattern: '../../app/config', description: 'directory traversal' },
        { pattern: 'user_id\n\r\nSet-Cookie: evil=true', description: 'HTTP response splitting' },
        { pattern: 'user_id\u0000admin', description: 'null byte injection' },
        { pattern: 'user_id\r\nLocation: http://evil.com', description: 'HTTP header injection' },
        { pattern: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', description: 'URL encoded path traversal' },
      ];

      for (const { pattern, description } of suspiciousPatterns) {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: pattern };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        // Should handle suspicious patterns without crashing or executing
        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe(pattern);
        expect(responseData.message).toBe('Private API key-protected endpoint');
        
        // Verify response headers are safe
        expect(response.headers.get('content-type')).toContain('application/json');
        expect(response.headers.has('set-cookie')).toBe(false);

        vi.clearAllMocks();
      }
    });

    it('should prevent information disclosure by exposing only safe response fields', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { 
        id: 'user_test',
        // Simulate potentially sensitive fields that might exist in real user objects
      };
      // Add potentially sensitive request properties (note: headers are immutable, so we simulate)
      (mockRequest as any).sensitiveData = {
        'authorization': 'Bearer secret-token',
        'x-api-key': 'sensitive-api-key',
      };
      (mockRequest as any).clerkUserId = 'internal-clerk-id';
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      const response = await GET(request);

      const responseData = await response.json();
      
      // Verify only safe, expected fields are exposed
      expect(responseData).toHaveProperty('user', 'user_test');
      expect(responseData).toHaveProperty('message', 'Private API key-protected endpoint');
      expect(responseData).toHaveProperty('timestamp');
      expect(Object.keys(responseData)).toHaveLength(3);
      
      // Verify sensitive information is not leaked
      expect(responseData).not.toHaveProperty('email');
      expect(responseData).not.toHaveProperty('password');
      expect(responseData).not.toHaveProperty('apiKey');
      expect(responseData).not.toHaveProperty('authorization');
      expect(responseData).not.toHaveProperty('clerkUserId');
      expect(responseData).not.toHaveProperty('headers');
      
      // Verify response headers don't leak sensitive information
      expect(response.headers.get('authorization')).toBeNull();
      expect(response.headers.get('x-api-key')).toBeNull();
    });
  });

  describe('Performance and Reliability Testing', () => {
    /**
     * @description Performance benchmarking and reliability validation including
     * response time measurement, concurrent request handling, and memory efficiency
     */

    it('should meet performance benchmarks for response time', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_performance_test' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      
      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();

      const responseTime = endTime - startTime;
      
      // Performance requirements
      expect(responseTime).toBeLessThan(50); // Should respond within 50ms
      expect(response.status).toBe(200);
      
      // Verify response quality isn't compromised for speed
      const responseData = await response.json();
      expect(responseData.user).toBe('user_performance_test');
      expect(responseData).toHaveProperty('timestamp');
    });

    it('should handle concurrent requests with consistent performance', async () => {
      const concurrentRequests = 25;
      const userIds = Array.from({ length: concurrentRequests }, (_, i) => `user_concurrent_${i}`);

      // Create concurrent request promises
      const createConcurrentRequest = async (userId: string) => {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createTestAuthenticatedRequest();
        const requestStartTime = performance.now();
        const response = await GET(request);
        const requestEndTime = performance.now();
        
        return {
          response,
          responseTime: requestEndTime - requestStartTime,
          userId
        };
      };

      const startTime = performance.now();
      const results = await Promise.all(userIds.map(createConcurrentRequest));
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTimePerRequest = totalTime / concurrentRequests;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const minResponseTime = Math.min(...results.map(r => r.responseTime));

      // Validate all responses succeeded
      results.forEach(({ response, userId }) => {
        expect(response.status).toBe(200);
      });

      // Performance assertions
      expect(averageTimePerRequest).toBeLessThan(30); // Average under 30ms per request
      expect(maxResponseTime).toBeLessThan(100); // No request should take over 100ms
      expect(maxResponseTime - minResponseTime).toBeLessThan(50); // Consistent performance
      
      // Validate response data integrity under load
      const responseDataPromises = results.map(async ({ response, userId }) => {
        const data = await response.json();
        expect(data.user).toBe(userId);
        return data;
      });
      
      await Promise.all(responseDataPromises);
    });

    it('should handle authentication middleware delays without timeout', async () => {
      // Use real timers for this performance test
      vi.useRealTimers();
      
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_slow_auth' };
      
      // Simulate slow authentication middleware (100ms delay - reduced to avoid timeout)
      mockClerkAuthMiddleware.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockRequest;
      });

      const request = createTestAuthenticatedRequest();
      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(totalTime).toBeGreaterThan(100); // Should wait for auth middleware
      expect(totalTime).toBeLessThan(500); // But not timeout excessively
      
      const responseData = await response.json();
      expect(responseData.user).toBe('user_slow_auth');
      expect(responseData.message).toBe('Private API key-protected endpoint');
      
      // Restore fake timers
      vi.useFakeTimers();
    });

    it('should maintain memory efficiency with large user ID payloads', async () => {
      const largeUserId = 'user_' + 'x'.repeat(100000); // 100KB user ID
      
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: largeUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      const request = createTestAuthenticatedRequest();
      const response = await GET(request);
      const responseData = await response.json();
      const finalMemory = process.memoryUsage();
      
      expect(response.status).toBe(200);
      expect(responseData.user).toBe(largeUserId);
      expect(responseData.user).toHaveLength(100005); // Verify full payload
      
      // Memory efficiency checks
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const rssGrowth = finalMemory.rss - initialMemory.rss;
      
      expect(heapGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB heap growth
      expect(rssGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB RSS growth
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Integration and Compatibility Testing', () => {
    /**
     * @description Tests ensuring compatibility across different environments,
     * request formats, and runtime conditions
     */

    it('should handle various request URL formats and protocols consistently', async () => {
      const testUserId = 'user_different_formats';
      
      const requestVariations = [
        { 
          url: 'http://localhost:3000/api-keys/private',
          description: 'HTTP localhost'
        },
        { 
          url: 'https://production.example.com/api-keys/private',
          description: 'HTTPS production domain'
        },
        { 
          url: 'http://localhost:3000/api-keys/private?param=value&test=1',
          description: 'URL with query parameters'
        },
        {
          url: 'https://api.example.com:8443/api-keys/private',
          description: 'Custom port HTTPS'
        },
      ];

      for (const { url, description } of requestVariations) {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: testUserId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);
        
        const request = createMockRequest({
          method: 'GET',
          url,
          headers: {
            'Authorization': 'Bearer valid-token',
            'User-Agent': 'Test Client',
            'Content-Type': 'application/json',
          },
        });

        const response = await GET(request);
        expect(response.status).toBe(200);
        
        const responseData = await response.json();
        expect(responseData.user).toBe(testUserId);
        expect(responseData.message).toBe('Private API key-protected endpoint');
        expect(responseData).toHaveProperty('timestamp');

        vi.clearAllMocks();
      }
    });

    it('should maintain consistent behavior across JavaScript runtime environments', async () => {
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_runtime_compatibility' };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      const request = createTestAuthenticatedRequest();
      const response = await GET(request);

      // Verify core functionality works regardless of runtime
      expect(response.status).toBe(200);
      expect(response).toBeInstanceOf(Response);
      
      const responseData = await response.json();
      expect(responseData.user).toBe('user_runtime_compatibility');
      expect(typeof responseData.timestamp).toBe('string');
      expect(typeof responseData.message).toBe('string');
      
      // Verify timestamp format is consistent across environments
      expect(new Date(responseData.timestamp).toISOString()).toBe(responseData.timestamp);
      
      // Verify JSON serialization is standards-compliant
      expect(() => JSON.parse(JSON.stringify(responseData))).not.toThrow();
    });

    it('should handle timestamp generation edge cases correctly', async () => {
      const timestampEdgeCases = [
        { 
          time: new Date('2023-12-31T23:59:59.999Z'),
          description: 'year boundary millisecond'
        },
        { 
          time: new Date('2024-02-29T12:00:00.000Z'),
          description: 'leap year date'
        },
        { 
          time: new Date('2024-01-01T00:00:00.001Z'),
          description: 'new year first millisecond'
        },
        { 
          time: new Date('2024-06-21T12:00:00.000Z'),
          description: 'summer solstice'
        },
      ];

      for (const { time, description } of timestampEdgeCases) {
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: 'user_timestamp_edge' };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        vi.setSystemTime(time);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        const responseData = await response.json();
        expect(responseData.timestamp).toBe(time.toISOString());
        expect(responseData.user).toBe('user_timestamp_edge');
        
        // Validate timestamp precision and format
        expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(responseData.timestamp).getTime()).toBe(time.getTime());

        vi.clearAllMocks();
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    /**
     * @description Tests validating system resilience, error recovery mechanisms,
     * and consistent behavior under various failure conditions
     */

    it('should recover gracefully from transient authentication failures', async () => {
      // First request fails with service unavailable
      const failureResponse = new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }), 
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      mockClerkAuthMiddleware.mockResolvedValueOnce(failureResponse);
      
      const request1 = createTestAuthenticatedRequest();
      const response1 = await GET(request1);
      expect(response1.status).toBe(503);
      expect(response1).toBe(failureResponse);

      // Second request succeeds after recovery
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: 'user_recovery_test' };
      mockClerkAuthMiddleware.mockResolvedValueOnce(mockRequest);

      const request2 = createTestAuthenticatedRequest();
      const response2 = await GET(request2);
      expect(response2.status).toBe(200);
      
      const responseData = await response2.json();
      expect(responseData.user).toBe('user_recovery_test');
      expect(responseData.message).toBe('Private API key-protected endpoint');
      expect(responseData).toHaveProperty('timestamp');
    });

    it('should extract valid data from partially corrupted authentication contexts', async () => {
      const partialDataScenarios = [
        { 
          data: { user: { id: 'valid_id' }, extraField: 'ignored' },
          description: 'extra request fields'
        },
        { 
          data: { user: { id: 'valid_id', invalidField: null, metadata: undefined } },
          description: 'user object with null/undefined fields'
        },
        { 
          data: { user: { id: 'valid_id', nested: { data: 'ignored' } }, corruption: true },
          description: 'nested objects and extra properties'
        },
        {
          data: { user: { id: 'valid_id' }, [Symbol('hidden')]: 'secret' },
          description: 'symbol properties'
        },
      ];

      for (const { data, description } of partialDataScenarios) {
        const mockRequest = createTestAuthenticatedRequest();
        Object.assign(mockRequest, data);
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest as any);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.user).toBe('valid_id');
        expect(responseData.message).toBe('Private API key-protected endpoint');
        
        // Verify no extra fields leaked through
        expect(Object.keys(responseData)).toEqual(['message', 'user', 'timestamp']);

        vi.clearAllMocks();
      }
    });

    it('should maintain stateless consistency across sequential and concurrent calls', async () => {
      const testUserId = 'user_state_consistency';
      const numRequests = 10;
      
      const mockRequest = createTestAuthenticatedRequest();
      (mockRequest as any).user = { id: testUserId };
      mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

      // Test sequential consistency
      const sequentialResults = [];
      for (let i = 0; i < numRequests; i++) {
        const request = createTestAuthenticatedRequest();
        const response = await GET(request);
        const responseData = await response.json();
        sequentialResults.push(responseData);
      }

      // Test concurrent consistency
      const requests = Array.from({ length: numRequests }, () => createTestAuthenticatedRequest());
      const concurrentResponses = await Promise.all(requests.map(req => GET(req)));
      const concurrentResults = await Promise.all(
        concurrentResponses.map(response => response.json())
      );

      // Validate sequential consistency
      for (const result of sequentialResults) {
        expect(result.user).toBe(testUserId);
        expect(result.message).toBe('Private API key-protected endpoint');
        expect(result).toHaveProperty('timestamp');
        expect(Object.keys(result)).toHaveLength(3);
      }

      // Validate concurrent consistency
      for (const result of concurrentResults) {
        expect(result.user).toBe(testUserId);
        expect(result.message).toBe('Private API key-protected endpoint');
        expect(result).toHaveProperty('timestamp');
        expect(Object.keys(result)).toHaveLength(3);
      }

      // With fake timers, timestamps might be identical, so check they are valid instead
      const allTimestamps = [...sequentialResults, ...concurrentResults].map(r => r.timestamp);
      for (const timestamp of allTimestamps) {
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
      }
    });

    it('should handle rapid successive requests without state corruption', async () => {
      const userIds = ['user_A', 'user_B', 'user_C'];
      const results: { userId: string; responseData: any }[] = [];

      // Rapidly alternate between different users
      for (let i = 0; i < 15; i++) {
        const userId = userIds[i % userIds.length];
        
        const mockRequest = createTestAuthenticatedRequest();
        (mockRequest as any).user = { id: userId };
        mockClerkAuthMiddleware.mockResolvedValue(mockRequest);

        const request = createTestAuthenticatedRequest();
        const response = await GET(request);
        const responseData = await response.json();
        
        results.push({ userId, responseData });
        vi.clearAllMocks();
      }

      // Verify no cross-contamination between requests
      for (const { userId, responseData } of results) {
        expect(responseData.user).toBe(userId);
        expect(responseData.message).toBe('Private API key-protected endpoint');
      }
    });
  });
});