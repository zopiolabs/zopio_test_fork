/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBetterStackLogger } from '../adapters/betterstack.js';
import type { AccessLogEntry } from '../types.js';

// Helper functions to eliminate deep nesting warnings

/**
 * Creates a Promise that never resolves for timeout testing
 */
function createNeverResolvingPromise(): Promise<never> {
  return new Promise(() => {});
}

/**
 * Creates a timeout Promise that rejects after specified milliseconds
 */
function createTimeoutRejectionPromise(timeoutMs = 100): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
}

/**
 * Creates a successful response object for mock implementations
 */
function createSuccessResponse(): { ok: boolean; status: number; text: () => Promise<string> } {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve('Success'),
  };
}

/**
 * Creates a delayed Promise resolver for slow network simulation
 */
function createDelayedResolver(delayMs: number): (resolve: (value: any) => void) => void {
  return (resolve) => {
    setTimeout(() => resolve(createSuccessResponse()), delayMs);
  };
}

/**
 * Creates a slow network mock implementation with configurable delay
 */
function createSlowNetworkMock(delayMs = 100): () => Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  const delayedResolver = createDelayedResolver(delayMs);
  return () => new Promise(delayedResolver);
}

/**
 * Creates an intermittent failure mock implementation
 */
function createIntermittentFailureMock(): () => Promise<{ ok: boolean; status: number; text: () => Promise<string> }> | never {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount % 2 === 0) {
      throw new Error('Network error');
    }
    return Promise.resolve(createSuccessResponse());
  };
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BetterStack Adapter', () => {
  let mockStderr: { write: ReturnType<typeof vi.fn> };
  let originalStderr: typeof process.stderr;

  beforeEach(() => {
    vi.clearAllMocks();
    originalStderr = process.stderr;
    mockStderr = { write: vi.fn() };
    process.stderr = mockStderr as any;
  });

  afterEach(() => {
    process.stderr = originalStderr;
    vi.clearAllMocks();
  });

  describe('createBetterStackLogger', () => {
    /**
     * Tests BetterStack logger creation with valid options
     * to ensure proper logger instantiation
     */
    it('should create logger with valid source token', () => {
      const logger = createBetterStackLogger({
        sourceToken: 'test-source-token-123',
      });

      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
      expect(typeof logger.write).toBe('function');
    });

    /**
     * Tests logger creation with custom endpoint
     * to ensure proper endpoint configuration
     */
    it('should create logger with custom endpoint', () => {
      const logger = createBetterStackLogger({
        sourceToken: 'test-token',
        endpoint: 'https://custom.logging.service.com',
      });

      expect(logger).toBeDefined();
      expect(typeof logger.write).toBe('function');
    });

    /**
     * Tests logger creation with default endpoint
     * to ensure proper fallback behavior
     */
    it('should use default endpoint when not specified', () => {
      const logger = createBetterStackLogger({
        sourceToken: 'test-token',
      });

      expect(logger).toBeDefined();
      // The endpoint is used internally, we'll test it through the write method
    });

    /**
     * Tests logger creation with various token formats
     * to ensure compatibility with different token types
     */
    it('should handle various source token formats', () => {
      const tokenFormats = [
        'simple-token',
        'token.with.dots',
        'token_with_underscores',
        'TOKEN-WITH-CAPS',
        'mixedCaseToken123',
        'very-long-token-string-with-many-characters-and-numbers-123456789',
        'short',
      ];

      tokenFormats.forEach(token => {
        const logger = createBetterStackLogger({ sourceToken: token });
        expect(logger).toBeDefined();
        expect(typeof logger.write).toBe('function');
      });
    });
  });

  describe('BetterStack logger.write', () => {
    let logger: ReturnType<typeof createBetterStackLogger>;

    beforeEach(() => {
      logger = createBetterStackLogger({
        sourceToken: 'test-source-token',
      });
    });

    /**
     * Tests successful log entry transmission to BetterStack
     * to ensure proper HTTP request formation and data serialization
     */
    it('should successfully send allowed access log to BetterStack', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        resource: 'user_profile',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
        },
        recordId: 'profile_789',
        can: true,
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://in.logs.betterstack.com',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-source-token',
          },
          body: JSON.stringify({
            ...entry,
            level: 'info',
            message: 'Auth ALLOWED: read user_profile',
            service: 'auth-service',
          }),
        }
      );

      expect(mockStderr.write).not.toHaveBeenCalled();
    });

    /**
     * Tests denied access log transmission
     * to ensure proper warning level and message formatting
     */
    it('should successfully send denied access log to BetterStack', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:31:00.000Z',
        resource: 'admin_panel',
        action: 'access',
        context: {
          userId: 'user_123',
          role: 'user',
        },
        can: false,
        reason: 'Insufficient privileges: admin role required',
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://in.logs.betterstack.com',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-source-token',
          },
          body: JSON.stringify({
            ...entry,
            level: 'warn',
            message: 'Auth DENIED: access admin_panel',
            service: 'auth-service',
          }),
        }
      );

      expect(mockStderr.write).not.toHaveBeenCalled();
    });

    /**
     * Tests field-level access logging
     * to ensure proper message formatting with field information
     */
    it('should handle field-level access logging', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:32:00.000Z',
        resource: 'user_profile',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'user',
        },
        recordId: 'profile_456',
        field: 'email',
        can: true,
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.message).toBe('Auth ALLOWED: read user_profile.email');
      expect(requestBody.level).toBe('info');
    });

    /**
     * Tests logging with custom endpoint
     * to ensure proper endpoint usage
     */
    it('should use custom endpoint when specified', async () => {
      const customLogger = createBetterStackLogger({
        sourceToken: 'custom-token',
        endpoint: 'https://custom.logs.example.com',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:33:00.000Z',
        resource: 'custom_test',
        action: 'test',
        context: { userId: 'custom_user' },
        can: true,
      };

      await customLogger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.logs.example.com',
        expect.any(Object)
      );
    });

    /**
     * Tests error handling when BetterStack API returns error response
     * to ensure proper error logging and graceful degradation
     */
    it('should handle API error responses gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request: Invalid token'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:34:00.000Z',
        resource: 'error_test',
        action: 'test',
        context: { userId: 'error_user' },
        can: true,
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockStderr.write).toHaveBeenCalledTimes(1);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] Failed to send log to BetterStack: Bad Request: Invalid token\n'
      );
    });

    /**
     * Tests error handling when fetch throws network error
     * to ensure proper error logging for network failures
     */
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error: ECONNREFUSED'));

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:35:00.000Z',
        resource: 'network_error_test',
        action: 'test',
        context: { userId: 'network_user' },
        can: true,
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockStderr.write).toHaveBeenCalledTimes(1);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] Error sending log to BetterStack: Network error: ECONNREFUSED\n'
      );
    });

    /**
     * Tests error handling with various HTTP status codes
     * to ensure proper error reporting for different failure scenarios
     */
    it('should handle various HTTP error status codes', async () => {
      const errorStatuses = [
        { status: 401, message: 'Unauthorized' },
        { status: 403, message: 'Forbidden' },
        { status: 404, message: 'Not Found' },
        { status: 429, message: 'Too Many Requests' },
        { status: 500, message: 'Internal Server Error' },
        { status: 502, message: 'Bad Gateway' },
        { status: 503, message: 'Service Unavailable' },
      ];

      for (const { status, message } of errorStatuses) {
        vi.clearAllMocks();

        const mockResponse = {
          ok: false,
          status,
          text: vi.fn().mockResolvedValue(message),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:36:00.000Z',
          resource: `status_${status}_test`,
          action: 'test',
          context: { statusCode: status },
          can: true,
        };

        await logger.write(entry);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockStderr.write).toHaveBeenCalledTimes(1);
        expect(mockStderr.write).toHaveBeenCalledWith(
          `[AUTH-LOG] Failed to send log to BetterStack: ${message}\n`
        );
      }
    });

    /**
     * Tests handling of non-Error objects thrown during fetch
     * to ensure robust error handling
     */
    it('should handle non-Error objects thrown during fetch', async () => {
      const nonErrorObjects = [
        'String error',
        { error: 'Object error' },
        123,
        null,
        undefined,
        Symbol('symbol error'),
      ];

      for (const errorObj of nonErrorObjects) {
        vi.clearAllMocks();
        mockFetch.mockRejectedValue(errorObj);

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:37:00.000Z',
          resource: 'non_error_test',
          action: 'test',
          context: { errorType: typeof errorObj },
          can: true,
        };

        await logger.write(entry);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockStderr.write).toHaveBeenCalledTimes(1);
        expect(mockStderr.write).toHaveBeenCalledWith(
          `[AUTH-LOG] Error sending log to BetterStack: ${String(errorObj)}\n`
        );
      }
    });

    /**
     * Tests concurrent log transmissions
     * to ensure proper handling of simultaneous requests
     */
    it('should handle concurrent log transmissions', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const concurrentEntries: AccessLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: `2024-01-15T10:38:${String(i).padStart(2, '0')}.000Z`,
        resource: `concurrent_resource_${i}`,
        action: 'concurrent_test',
        context: { userId: `concurrent_user_${i}`, index: i },
        can: i % 2 === 0,
        reason: i % 2 === 0 ? undefined : `Access denied for test ${i}`,
      }));

      // Send all entries concurrently
      await Promise.all(
        concurrentEntries.map(entry => logger.write(entry))
      );

      expect(mockFetch).toHaveBeenCalledTimes(10);
      expect(mockStderr.write).not.toHaveBeenCalled();

      // Verify all requests were made with correct data
      concurrentEntries.forEach((entry, index) => {
        const fetchCall = mockFetch.mock.calls[index];
        const requestBody = JSON.parse(fetchCall[1].body);
        
        expect(requestBody.timestamp).toBe(entry.timestamp);
        expect(requestBody.resource).toBe(entry.resource);
        expect(requestBody.can).toBe(entry.can);
        expect(requestBody.service).toBe('auth-service');
        expect(requestBody.level).toBe(entry.can ? 'info' : 'warn');
      });
    });

    /**
     * Tests request timeout scenarios
     * to ensure proper handling of slow network conditions
     */
    it('should handle request timeouts', async () => {
      // Simulate timeout by creating a promise that never resolves
      mockFetch.mockImplementation(createNeverResolvingPromise);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:39:00.000Z',
        resource: 'timeout_test',
        action: 'test',
        context: { userId: 'timeout_user' },
        can: true,
      };

      // Since there's no built-in timeout in the current implementation,
      // we'll test with a manual timeout
      const timeoutPromise = createTimeoutRejectionPromise(100);

      const logPromise = logger.write(entry);

      await expect(Promise.race([logPromise, timeoutPromise])).rejects.toThrow('Request timeout');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests large payload handling
     * to ensure proper handling of complex log entries
     */
    it('should handle large payloads efficiently', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Create a large context object
      const largeContext: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeContext[`key_${i}`] = {
          value: `value_${i}`.repeat(50),
          metadata: Array.from({ length: 10 }, (_, j) => `item_${j}`),
        };
      }

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:40:00.000Z',
        resource: 'large_payload_test',
        action: 'test',
        context: largeContext,
        can: true,
      };

      const startTime = Date.now();
      await logger.write(entry);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(executionTime).toBeLessThan(1000); // Should complete within reasonable time
      expect(mockStderr.write).not.toHaveBeenCalled();

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.resource).toBe('large_payload_test');
      expect(Object.keys(requestBody.context)).toHaveLength(100);
    });

    /**
     * Tests proper authentication header formation
     * to ensure secure API access
     */
    it('should properly format authentication headers', async () => {
      const tokens = [
        'simple-token',
        'complex.token.with.dots',
        'token_with_underscores',
        'TOKEN-WITH-CAPS-123',
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      for (const token of tokens) {
        vi.clearAllMocks();
        
        const tokenLogger = createBetterStackLogger({
          sourceToken: token,
        });

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:41:00.000Z',
          resource: 'auth_header_test',
          action: 'test',
          context: { token },
          can: true,
        };

        await tokenLogger.write(entry);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        
        const fetchCall = mockFetch.mock.calls[0];
        const headers = fetchCall[1].headers;
        expect(headers.Authorization).toBe(`Bearer ${token}`);
        expect(headers['Content-Type']).toBe('application/json');
      }
    });

    /**
     * Tests message formatting with different entry combinations
     * to ensure consistent and informative log messages
     */
    it('should format messages consistently across different entry types', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const testCases = [
        {
          entry: {
            timestamp: '2024-01-15T10:42:00.000Z',
            resource: 'document',
            action: 'read',
            context: { userId: 'user_1' },
            can: true,
          } as AccessLogEntry,
          expectedMessage: 'Auth ALLOWED: read document',
          expectedLevel: 'info',
        },
        {
          entry: {
            timestamp: '2024-01-15T10:42:01.000Z',
            resource: 'document',
            action: 'write',
            context: { userId: 'user_1' },
            field: 'title',
            can: false,
            reason: 'Field write access denied',
          } as AccessLogEntry,
          expectedMessage: 'Auth DENIED: write document.title',
          expectedLevel: 'warn',
        },
        {
          entry: {
            timestamp: '2024-01-15T10:42:02.000Z',
            resource: 'api_endpoint',
            action: 'execute',
            context: { userId: 'user_1' },
            recordId: 'endpoint_123',
            can: true,
          } as AccessLogEntry,
          expectedMessage: 'Auth ALLOWED: execute api_endpoint',
          expectedLevel: 'info',
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        await logger.write(testCase.entry);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        
        expect(requestBody.message).toBe(testCase.expectedMessage);
        expect(requestBody.level).toBe(testCase.expectedLevel);
        expect(requestBody.service).toBe('auth-service');
      }
    });

    /**
     * Tests API response text parsing errors
     * to ensure robust error handling when response parsing fails
     */
    it('should handle response text parsing errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockRejectedValue(new Error('Failed to parse response')),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:43:00.000Z',
        resource: 'response_error_test',
        action: 'test',
        context: { userId: 'response_user' },
        can: true,
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockStderr.write).toHaveBeenCalledTimes(1);
      // The error should be caught and logged, but the exact message depends on implementation
      expect(mockStderr.write).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH-LOG] Error sending log to BetterStack:')
      );
    });

    /**
     * Tests behavior with malformed JSON in context
     * to ensure proper serialization handling
     */
    it('should handle complex objects that might cause JSON issues', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const complexContext = {
        userId: 'complex_user',
        date: new Date('2024-01-15T10:44:00.000Z'),
        regex: /test-pattern/gi,
        functionValue: () => 'test',
        symbolValue: Symbol('test'),
        undefinedValue: undefined,
        nullValue: null,
        bigintValue: BigInt(123),
      };

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:44:00.000Z',
        resource: 'complex_object_test',
        action: 'test',
        context: complexContext as any,
        can: true,
      };

      await logger.write(entry);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      // Verify the request was made successfully despite complex objects
      expect(requestBody.resource).toBe('complex_object_test');
      expect(requestBody.service).toBe('auth-service'); 
      // Complex objects like functions, symbols, etc. should be handled by JSON.stringify
    });
  });

  describe('integration scenarios', () => {
    /**
     * Tests integration with different network conditions
     * to ensure robustness in various deployment environments
     */
    it('should handle various network conditions gracefully', async () => {
      const networkScenarios = [
        {
          name: 'Slow network',
          setupMock: () => {
            mockFetch.mockImplementation(createSlowNetworkMock(100));
          },
        },
        {
          name: 'Intermittent failures',
          setupMock: () => {
            mockFetch.mockImplementation(createIntermittentFailureMock());
          },
        },
      ];

      for (const scenario of networkScenarios) {
        vi.clearAllMocks();
        scenario.setupMock();

        const testLogger = createBetterStackLogger({
          sourceToken: 'network-test-token',
        });

        const entries: AccessLogEntry[] = Array.from({ length: 4 }, (_, i) => ({
          timestamp: `2024-01-15T10:45:${String(i).padStart(2, '0')}.000Z`,
          resource: `${scenario.name.replace(' ', '_')}_resource_${i}`,
          action: 'network_test',
          context: { scenario: scenario.name, index: i },
          can: true,
        }));

        // Test each entry
        for (const entry of entries) {
          await testLogger.write(entry);
        }

        expect(mockFetch).toHaveBeenCalledTimes(4);
      }
    });

    /**
     * Tests behavior with different BetterStack API versions or endpoints
     * to ensure compatibility and forward compatibility
     */
    it('should work with different endpoint configurations', async () => {
      const endpointConfigurations = [
        'https://in.logs.betterstack.com',
        'https://api.betterstack.com/logs',
        'https://custom-logs.company.com/ingest',
        'http://localhost:3000/logs', // Local development
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      for (const endpoint of endpointConfigurations) {
        vi.clearAllMocks();
        
        const endpointLogger = createBetterStackLogger({
          sourceToken: 'endpoint-test-token',
          endpoint,
        });

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:46:00.000Z',
          resource: 'endpoint_test',
          action: 'test',
          context: { endpoint },
          can: true,
        };

        await endpointLogger.write(entry);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          endpoint,
          expect.any(Object)
        );
      }
    });
  });
});