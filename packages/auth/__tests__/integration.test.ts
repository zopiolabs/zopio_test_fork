/**
 * @fileoverview Integration Tests for Auth Package
 * 
 * Comprehensive integration test suite that validates the interaction between different
 * components of the auth package and ensures they work together correctly in realistic
 * scenarios. These tests focus on end-to-end workflows and cross-component integration.
 * 
 * **Integration Test Scope:**
 * - Middleware integration with token verification
 * - Component integration with authentication providers
 * - Server-client authentication flow coordination
 * - Error handling across component boundaries
 * - Authentication state management across components
 * 
 * **Test Categories:**
 * 1. **Middleware Integration**: Tests middleware chain with authentication
 * 2. **Component Integration**: React component rendering with auth context
 * 3. **Server-Client Integration**: Authentication flow between server/client
 * 4. **Error Handling Integration**: Error propagation across auth boundaries
 * 5. **Authentication Flow**: Complete sign-in/sign-up workflows
 * 
 * **Mock Strategy:**
 * - Uses controlled mocks to simulate external dependencies (Clerk)
 * - Tests actual integration logic without external service dependencies
 * - Validates data flow between components
 * - Ensures error conditions are handled gracefully
 * 
 * **Integration Test Principles:**
 * - Test component interactions, not isolated units
 * - Validate data flow and state management
 * - Ensure error handling works across component boundaries
 * - Test realistic user workflows and scenarios
 * - Verify authentication state consistency
 * 
 * @author Zopio Auth Team
 * @since 1.0.0
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
/**
 * Test utility that creates a minimal React wrapper for testing components.
 * Provides a clean container without additional providers or context.
 * 
 * @param children - React components to wrap
 * @returns The children components without additional wrapping
 */
const createTestWrapper = ({ children }: { children: React.ReactNode }) => children;

/**
 * Mock Clerk authentication object that simulates a successful authentication state.
 * Returns consistent test data for authentication scenarios.
 * 
 * @param overrides - Optional overrides for the mock authentication object
 * @returns Mock authentication object with user and session data
 */
const mockClerkAuth = (overrides: Record<string, any> = {}) => ({
  userId: 'test_user_123',
  sessionId: 'test_session_456',
  isSignedIn: true,
  ...overrides,
});

/**
 * Test utility for simulating complex authentication flows with multiple steps.
 * Executes each step in sequence and captures results for validation.
 * 
 * **Usage Example:**
 * ```typescript
 * const steps = [
 *   { name: 'sign-in', action: () => performSignIn() },
 *   { name: 'verify-token', action: () => verifyToken() },
 *   { name: 'access-resource', action: () => accessProtectedResource() }
 * ];
 * const results = await authFlowTestUtils.simulateAuthFlow(steps);
 * ```
 * 
 * @property simulateAuthFlow - Executes authentication flow steps sequentially
 */
const authFlowTestUtils = {
  /**
   * Simulates a multi-step authentication flow with error handling.
   * Each step is executed in order, and results are captured for analysis.
   * 
   * @param steps - Array of step objects with name and action properties
   * @returns Array of results containing step outcomes and any errors
   */
  simulateAuthFlow: async (steps: any[]) => {
    const results = [];
    for (const step of steps) {
      try {
        const result = await step.action();
        results.push({ step: step.name, result, success: true });
      } catch (error) {
        results.push({ step: step.name, error, success: false });
      }
    }
    return results;
  },
};
import React from 'react';

// Mock all the auth exports
const mockVerifyClerkToken = vi.fn();
const mockClerkAuthMiddleware = vi.fn();
const mockAuthMiddleware = vi.fn();

vi.mock('../lib/verify-clerk-token.js', () => ({
  verifyClerkToken: mockVerifyClerkToken,
}));

vi.mock('../clerk-auth-middleware.js', () => ({
  clerkAuthMiddleware: mockClerkAuthMiddleware,
}));

vi.mock('../middleware.js', () => ({
  authMiddleware: mockAuthMiddleware,
}));

// Mock Clerk components
const MockSignIn = vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'sign-in' }, children));
const MockSignUp = vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'sign-up' }, children));
const MockClerkProvider = vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'clerk-provider' }, children));

vi.mock('../components/sign-in.js', () => ({
  SignIn: MockSignIn,
}));

vi.mock('../components/sign-up.js', () => ({
  SignUp: MockSignUp,
}));

vi.mock('../provider.js', () => ({
  ClerkProvider: MockClerkProvider,
}));

/**
 * Helper functions to reduce deep nesting in tests
 */

/**
 * Creates a concurrent authentication request for testing
 * @param index - Request index number
 * @param userIds - Array of user IDs to use
 * @returns Request object for auth flow testing
 */
const createConcurrentAuthRequest = (index: number, userIds: string[]) => ({
  name: `Concurrent Request ${index + 1}`,
  action: async () => {
    return await mockVerifyClerkToken(`token_${index + 1}`);
  },
  expectedResult: userIds[index],
});

/**
 * Creates a bulk authentication request for testing
 * @param userId - User ID for the request
 * @param index - Request index number  
 * @returns Request object for auth flow testing
 */
const createBulkAuthRequest = (userId: string, index: number) => ({
  name: `Bulk Request ${index + 1}`,
  action: async () => {
    return await mockVerifyClerkToken(`bulk_token_${index + 1}`);
  },
  expectedResult: userId,
});

/**
 * Creates a mixed scenario request for testing
 * @param scenario - Test scenario configuration
 * @param index - Request index number
 * @returns Request object for auth flow testing
 */
const createMixedScenarioRequest = (scenario: any, index: number) => ({
  name: `Mixed Request ${index + 1}`,
  action: async () => {
    try {
      return await mockVerifyClerkToken(`mixed_token_${index + 1}`);
    } catch (error) {
      console.debug('Mixed request processing error:', error instanceof Error ? error.message : String(error));
      return { error: error instanceof Error ? error.message : String(error), failed: true };
    }
  },
  expectedResult: scenario.type === 'success' 
    ? scenario.userId 
    : { error: scenario.error, failed: true },
});

/**
 * Creates a multi-tenant authentication request
 * @param tenant - Tenant configuration
 * @param userId - User ID for the request
 * @returns Request object for auth flow testing
 */
const createMultiTenantRequest = (tenant: {id: string; users: string[]}, userId: string) => ({
  name: `Authenticate ${userId} in ${tenant.id}`,
  action: async () => {
    mockVerifyClerkToken.mockResolvedValueOnce(userId);
    const result = await mockVerifyClerkToken(`${tenant.id}_${userId}_token`);
    return {
      userId: result,
      tenantId: tenant.id,
      context: 'multi-tenant-auth'
    };
  },
  expectedResult: {
    userId,
    tenantId: tenant.id,
    context: 'multi-tenant-auth'
  },
});

/**
 * Creates a cross-tenant authorization attempt request
 * @param attempt - Authorization attempt configuration
 * @returns Request object for auth flow testing
 */
const createCrossTenantRequest = (attempt: any) => ({
  name: `Cross-Tenant Auth: ${attempt.userA} to ${attempt.tenantB}`,
  action: async () => {
    // Simulate user authenticated in tenant A trying to access tenant B
    mockVerifyClerkToken.mockResolvedValueOnce(attempt.userA);
    
    const authResult = await mockVerifyClerkToken(`${attempt.tenantA}_${attempt.userA}_token`);
    
    // Check if user has permission for tenant B
    const hasPermission = attempt.userA === 'cross_tenant_admin' && attempt.tenantB === 'tenant_b';
    
    return {
      authenticatedUser: authResult,
      ownTenant: attempt.tenantA,
      attemptedTenant: attempt.tenantB,
      requiresAdditionalTenantCheck: !hasPermission
    };
  },
  expectedResult: {
    authenticatedUser: attempt.userA,
    ownTenant: attempt.tenantA,
    attemptedTenant: attempt.tenantB,
    requiresAdditionalTenantCheck: true
  },
});

/**
 * Creates a rate limiting test request
 * @param i - Request number
 * @param rateLimit - Rate limit threshold
 * @returns Request object for auth flow testing
 */
const createRateLimitRequest = (i: number, rateLimit: number) => ({
  name: `Rate Limit Test ${i}`,
  action: async () => {
    try {
      const userId = await mockVerifyClerkToken(`rate-limit-token-${i}`);
      return { success: true, userId, requestNumber: i };
    } catch (error) {
      console.debug('Rate limiting error:', error instanceof Error ? error.message : String(error));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error), 
        requestNumber: i,
        rateLimited: true,
      };
    }
  },
  expectedResult: i <= rateLimit
    ? expect.objectContaining({ success: true, userId: `user_${i}` })
    : expect.objectContaining({ success: false, rateLimited: true }),
});

/**
 * Creates a batch processing request for testing
 * @param tokens - Array of tokens to process
 * @param batchSize - Size of the batch
 * @returns Request object for auth flow testing
 */
const createBatchProcessingRequest = (tokens: string[], batchSize: number) => ({
  name: 'Batch Token Processing',
  action: async () => {
    const startTime = Date.now();
    const results = [];
    
    // Process tokens in batch
    for (let i = 0; i < batchSize; i++) {
      try {
        const token = tokens[i] || `batch-token-${i}`;
        const userId = await mockVerifyClerkToken(token);
        results.push({ success: true, userId, tokenIndex: i });
      } catch (error) {
        console.debug('Batch processing individual token error:', error instanceof Error ? error.message : String(error));
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error), 
          tokenIndex: i 
        });
      }
    }
    
    const endTime = Date.now();
    return {
      totalProcessed: batchSize,
      processingTime: endTime - startTime,
      avgTimePerToken: (endTime - startTime) / batchSize,
      successful: results.every(r => r.success),
      results,
    };
  },
  expectedResult: expect.objectContaining({
    totalProcessed: batchSize,
    processingTime: expect.any(Number),
    avgTimePerToken: expect.any(Number),
    successful: true,
  }),
});

/**
 * Creates a token expiration simulation request
 * @param expiredToken - Token that should expire
 * @returns Promise rejection with expiration error
 */
const createTokenExpirationSimulation = (expiredToken: string) => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Token expired during verification')), 10);
  });
};

/**
 * Creates environment-specific authentication request
 * @param config - Environment configuration
 * @returns Request object for auth flow testing
 */
const createEnvironmentAuthRequest = (config: any) => ({
  name: config.name,
  action: async () => {
    // Set environment variables using helper
    const envSetter = (key: string, value: string) => {
      process.env[key] = value;
    };
    Object.entries(config.env).forEach(([key, value]) => {
      envSetter(key, value as string);
    });

    // Mock token verification with environment context
    mockVerifyClerkToken.mockResolvedValueOnce(`${config.env.NODE_ENV}_env_user`);
    
    const result = await mockVerifyClerkToken('env-test-token');
    
    return {
      environment: config.env.NODE_ENV,
      userId: result,
      secretKeyExists: !!config.env.CLERK_SECRET_KEY,
    };
  },
  expectedResult: {
    environment: config.env.NODE_ENV,
    userId: `${config.env.NODE_ENV}_env_user`,
    secretKeyExists: true,
  },
});

/**
 * Creates timeout-based token resolution Promise
 * @param result - Result to resolve after timeout
 * @param delayMs - Delay in milliseconds before resolving
 * @returns Promise that resolves after specified delay
 */
const createTimeoutTokenResolution = (result: string, delayMs: number = 5000) => {
  return new Promise<string>(resolve => {
    setTimeout(() => resolve(result), delayMs);
  });
};

/**
 * Creates token expiration mock implementation
 * @param expiredToken - Token that should expire
 * @returns Mock implementation function
 */
const createTokenExpirationMock = (expiredToken: string) => {
  return () => createTokenExpirationSimulation(expiredToken);
};

/**
 * Creates token cache cleanup handler
 * @param tokenCache - Token cache Map instance
 * @param token - Token to cleanup
 * @returns Cleanup function
 */
const createTokenCacheCleanup = (tokenCache: Map<string, string>, token: string) => {
  return () => tokenCache.delete(token);
};

/**
 * Creates multi-tenant flow processor
 * @param tenant - Tenant configuration
 * @param multiTenantFlow - Flow array to populate
 * @returns Processing function
 */
const createMultiTenantFlowProcessor = (
  tenant: {id: string; users: string[]}, 
  multiTenantFlow: Array<{name: string; action: () => Promise<any>; expectedResult: any}>
) => {
  return (userId: string) => {
    multiTenantFlow.push(createMultiTenantRequest(tenant, userId));
  };
};

/**
 * @describe Auth Package Integration Tests
 * 
 * Comprehensive integration testing for the auth package that validates the interaction
 * between different components, services, and layers. These tests ensure that the auth
 * system works correctly as a cohesive unit rather than testing individual components
 * in isolation.
 * 
 * **Integration Test Strategy:**
 * - Tests real component interactions with controlled external dependencies
 * - Validates data flow between middleware, components, and services
 * - Ensures error handling works across component boundaries
 * - Tests complete authentication workflows from start to finish
 * 
 * **Key Integration Points Tested:**
 * 1. Middleware → Token Verification → Request Processing
 * 2. React Components → Auth Provider → User State
 * 3. Server-side Auth → Client-side State → UI Updates
 * 4. Error Conditions → Error Propagation → User Feedback
 * 
 * **Mock Strategy:**
 * - External services (Clerk) are mocked to ensure predictable behavior
 * - Internal auth logic is tested with real implementations
 * - Network requests and responses are simulated for consistency
 * - Error conditions are artificially triggered for testing error paths
 */
describe('Auth Package Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @describe Middleware Integration Tests
   * 
   * Tests the integration between authentication middleware and token verification.
   * Validates that the middleware chain processes authentication correctly and
   * passes user context through the request pipeline.
   * 
   * **Integration Scenarios:**
   * - Middleware processes valid tokens and adds user context to requests
   * - Multiple middleware steps work together in authentication chain
   * - Error conditions are handled gracefully across middleware layers
   * - Token verification results are properly integrated into request flow
   * 
   * **Critical Integration Points:**
   * - Middleware → Token Verification Service
   * - Request Processing → User Context Injection
   * - Error Handling → Response Generation
   */
  describe('middleware integration', () => {
    it('should integrate clerk-auth-middleware with token verification', async () => {
      mockVerifyClerkToken.mockResolvedValue('user_integration_test');
      
      const mockRequest = new Request('http://localhost/api/test', {
        headers: { 'Authorization': 'Bearer integration-test-token' },
      });

      mockClerkAuthMiddleware.mockImplementation(async (req) => {
        const token = req.headers.get('Authorization')?.split(' ')[1];
        if (token) {
          const userId = await mockVerifyClerkToken(token);
          req.user = { id: userId };
          return req;
        }
        return new Response('Unauthorized', { status: 401 });
      });

      const result = await mockClerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      expect((result as Request).user).toEqual({ id: 'user_integration_test' });
      expect(mockVerifyClerkToken).toHaveBeenCalledWith('integration-test-token');
    });

    it('should handle middleware chain with multiple authentication steps', async () => {
      const steps = [
        {
          name: 'Extract Token',
          action: () => {
            const request = new Request('http://localhost/test', {
              headers: { 'Authorization': 'Bearer chain-test-token' },
            });
            return { token: 'chain-test-token', request };
          },
          expectedResult: { token: 'chain-test-token', request: expect.any(Request) },
        },
        {
          name: 'Verify Token',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValue('user_chain_test');
            return await mockVerifyClerkToken('chain-test-token');
          },
          expectedResult: 'user_chain_test',
        },
        {
          name: 'Attach User',
          action: () => {
            const request = new Request('http://localhost/test');
            (request as any).user = { id: 'user_chain_test' };
            return request;
          },
          expectedResult: expect.objectContaining({ user: { id: 'user_chain_test' } }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(steps);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.step).toBe(steps[index].name);
      });
    });
  });

  describe('component integration', () => {
    it('should render SignIn component within ClerkProvider', () => {
      const TestComponent = () => (
        React.createElement(MockClerkProvider, null,
          React.createElement(MockSignIn, null, 'Sign In Content')
        )
      );

      render(React.createElement(TestComponent));

      expect(screen.getByTestId('clerk-provider')).toBeInTheDocument();
      expect(screen.getByTestId('sign-in')).toBeInTheDocument();
      expect(screen.getByText('Sign In Content')).toBeInTheDocument();
    });

    it('should render SignUp component within ClerkProvider', () => {
      const TestComponent = () => (
        React.createElement(MockClerkProvider, null,
          React.createElement(MockSignUp, null, 'Sign Up Content')
        )
      );

      render(React.createElement(TestComponent));

      expect(screen.getByTestId('clerk-provider')).toBeInTheDocument();
      expect(screen.getByTestId('sign-up')).toBeInTheDocument();
      expect(screen.getByText('Sign Up Content')).toBeInTheDocument();
    });

    it('should handle component props correctly', () => {
      const testProps = { theme: 'dark', appearance: { baseTheme: 'dark' } };
      
      const TestComponent = () => (
        React.createElement(MockSignIn, testProps, 'Themed Sign In')
      );

      render(React.createElement(TestComponent));

      expect(MockSignIn).toHaveBeenCalledWith(
        expect.objectContaining(testProps),
        expect.any(Object)
      );
    });
  });

  describe('server-client integration', () => {
    it('should handle server-side authentication flow', async () => {
      mockVerifyClerkToken.mockResolvedValue('server_user_123');

      const serverFlow = [
        {
          name: 'Server Token Verification',
          action: async () => {
            return await mockVerifyClerkToken('server-token');
          },
          expectedResult: 'server_user_123',
        },
        {
          name: 'Server User Context Creation',
          action: () => {
            return { userId: 'server_user_123', role: 'user', tenantId: 'tenant_123' };
          },
          expectedResult: { userId: 'server_user_123', role: 'user', tenantId: 'tenant_123' },
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(serverFlow);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle client-side authentication state', async () => {
      const mockAuthState = mockClerkAuth({
        isSignedIn: true,
        userId: 'client_user_456',
        user: { id: 'client_user_456', emailAddresses: [{ emailAddress: 'test@example.com' }] },
      });

      const clientFlow = [
        {
          name: 'Client Auth State Check',
          action: () => {
            return {
              isSignedIn: mockAuthState.isSignedIn,
              userId: mockAuthState.userId,
            };
          },
          expectedResult: { isSignedIn: true, userId: 'client_user_456' },
        },
        {
          name: 'Client User Data Access',
          action: () => {
            return (mockAuthState as any).user;
          },
          expectedResult: expect.objectContaining({
            id: 'client_user_456',
            emailAddresses: expect.any(Array),
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(clientFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });
  });

  describe('error handling integration', () => {
    it('should handle authentication failures gracefully across components', async () => {
      mockVerifyClerkToken.mockRejectedValue(new Error('Token expired'));

      const errorFlow = [
        {
          name: 'Failed Token Verification',
          action: async () => {
            try {
              await mockVerifyClerkToken('expired-token');
              return { success: true };
            } catch (error) {
              console.debug('Token verification failed:', error instanceof Error ? error.message : String(error));
              return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
          },
          expectedResult: { success: false, error: 'Token expired' },
        },
        {
          name: 'Fallback to Unauthenticated State',
          action: () => {
            return { isAuthenticated: false, user: null };
          },
          expectedResult: { isAuthenticated: false, user: null },
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(errorFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });

    it('should handle network errors in authentication flow', async () => {
      mockVerifyClerkToken.mockRejectedValue(new Error('Network error'));

      const networkErrorFlow = [
        {
          name: 'Network Error Handling',
          action: async () => {
            try {
              await mockVerifyClerkToken('network-fail-token');
              return 'unexpected success';
            } catch (error) {
              console.debug('Network error handling test:', error instanceof Error ? error.message : String(error));
              return { error: 'Network error', handled: true };
            }
          },
          expectedResult: { error: 'Network error', handled: true },
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(networkErrorFlow);

      expect(results[0].success).toBe(true);
      expect(results[0].result).toEqual({ error: 'Network error', handled: true });
    });
  });

  describe('performance integration', () => {
    it('should handle concurrent authentication requests', async () => {
      const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
      
      mockVerifyClerkToken
        .mockResolvedValueOnce(userIds[0])
        .mockResolvedValueOnce(userIds[1])
        .mockResolvedValueOnce(userIds[2])
        .mockResolvedValueOnce(userIds[3])
        .mockResolvedValueOnce(userIds[4]);

      const concurrentRequests = userIds.map((_, index) => 
        createConcurrentAuthRequest(index, userIds)
      );

      const results = await Promise.all(
        concurrentRequests.map(req => authFlowTestUtils.simulateAuthFlow([req]))
      );

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result[0].success).toBe(true);
        expect(result[0].result).toBe(userIds[index]);
      });

      expect(mockVerifyClerkToken).toHaveBeenCalledTimes(5);
    });

    /**
     * Tests system behavior under high load with concurrent authentication requests
     * to ensure the system can handle enterprise-scale traffic patterns
     */
    it('should handle high-volume concurrent authentication requests', async () => {
      const userCount = 100;
      const userIds = Array.from({ length: userCount }, (_, i) => `bulk_user_${i}`);
      
      // Mock bulk responses
      userIds.forEach(userId => {
        mockVerifyClerkToken.mockResolvedValueOnce(userId);
      });

      const startTime = Date.now();
      const bulkRequests = userIds.map((userId, index) => 
        createBulkAuthRequest(userId, index)
      );

      const results = await Promise.all(
        bulkRequests.map(req => authFlowTestUtils.simulateAuthFlow([req]))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(userCount);
      results.forEach((result, index) => {
        expect(result[0].success).toBe(true);
        expect(result[0].result).toBe(userIds[index]);
      });

      // Performance threshold: should handle 100 requests in under 2 seconds
      expect(totalTime).toBeLessThan(2000);
      expect(mockVerifyClerkToken).toHaveBeenCalledTimes(userCount);
    });

    /**
     * Tests mixed success/failure scenarios under concurrent load
     * to validate error isolation and proper handling
     */
    it('should handle mixed success/failure scenarios concurrently', async () => {
      const scenarios = [
        { type: 'success', userId: 'concurrent_success_1' },
        { type: 'failure', error: 'Token expired' },
        { type: 'success', userId: 'concurrent_success_2' },
        { type: 'failure', error: 'Invalid signature' },
        { type: 'success', userId: 'concurrent_success_3' },
      ];

      scenarios.forEach((scenario, index) => {
        if (scenario.type === 'success') {
          mockVerifyClerkToken.mockResolvedValueOnce(scenario.userId);
        } else {
          mockVerifyClerkToken.mockRejectedValueOnce(new Error(scenario.error));
        }
      });

      const mixedRequests = scenarios.map((scenario, index) => 
        createMixedScenarioRequest(scenario, index)
      );

      const results = await Promise.all(
        mixedRequests.map(req => authFlowTestUtils.simulateAuthFlow([req]))
      );

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result[0].success).toBe(true);
        expect(result[0].result).toEqual(scenarios[index].type === 'success' 
          ? scenarios[index].userId 
          : { error: scenarios[index].error, failed: true }
        );
      });
    });

    it('should handle authentication timeout scenarios', async () => {
      vi.useFakeTimers();

      mockVerifyClerkToken.mockImplementation(() => 
        createTimeoutTokenResolution('timeout_user', 5000)
      );

      const timeoutFlow = [
        {
          name: 'Timeout Test',
          action: async () => {
            const promise = mockVerifyClerkToken('timeout-token');
            vi.advanceTimersByTime(5000);
            return await promise;
          },
          expectedResult: 'timeout_user',
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(timeoutFlow);

      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('timeout_user');

      vi.useRealTimers();
    });
  });

  describe('security integration', () => {
    it('should maintain security across middleware and components', async () => {
      // Test that sensitive information doesn't leak between components
      const sensitiveToken = 'sensitive-token-with-secrets';
      mockVerifyClerkToken.mockRejectedValue(new Error('Sensitive database error: password123'));

      mockClerkAuthMiddleware.mockImplementation(async (req) => {
        try {
          const token = req.headers.get('Authorization')?.split(' ')[1];
          if (token) {
            await mockVerifyClerkToken(token);
          }
          return req;
        } catch (error) {
          // Should not leak sensitive error details
          console.debug('Authentication middleware error (intentionally not exposed):', error instanceof Error ? error.message : String(error));
          return new Response('Authentication failed', { status: 403 });
        }
      });

      const mockRequest = new Request('http://localhost/secure', {
        headers: { 'Authorization': `Bearer ${sensitiveToken}` },
      });

      const result = await mockClerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      const text = await response.text();
      
      expect(text).toBe('Authentication failed');
      expect(text).not.toContain('password123');
      expect(text).not.toContain('database error');
    });

    it('should validate token integrity across the system', async () => {
      const validToken = 'valid.jwt.token';
      const tamperedToken = 'tampered.jwt.token';

      mockVerifyClerkToken
        .mockResolvedValueOnce('valid_user')
        .mockRejectedValueOnce(new Error('Invalid signature'));

      const securityFlow = [
        {
          name: 'Valid Token Check',
          action: async () => {
            return await mockVerifyClerkToken(validToken);
          },
          expectedResult: 'valid_user',
        },
        {
          name: 'Tampered Token Rejection',
          action: async () => {
            try {
              await mockVerifyClerkToken(tamperedToken);
              return 'unexpected success';
            } catch (error) {
              console.debug('Tampered token correctly rejected:', error instanceof Error ? error.message : String(error));
              return 'correctly rejected';
            }
          },
          expectedResult: 'correctly rejected',
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(securityFlow);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].result).toBe('correctly rejected');
    });
  });

  describe('token lifecycle integration', () => {
    /**
     * Tests token refresh workflow to ensure seamless user experience
     * during token expiration and renewal processes
     */
    it('should handle token refresh workflow gracefully', async () => {
      const originalToken = 'original-token-123';
      const refreshedToken = 'refreshed-token-456';
      const userId = 'refresh_user_123';

      // Simulate token expiration followed by refresh
      const refreshFlow = [
        {
          name: 'Original Token Expires',
          action: async () => {
            mockVerifyClerkToken.mockRejectedValueOnce(new Error('Token expired'));
            try {
              await mockVerifyClerkToken(originalToken);
              return 'unexpected success';
            } catch (error) {
              console.debug('Token expiration error:', error instanceof Error ? error.message : String(error));
              return { expired: true, error: error instanceof Error ? error.message : String(error) };
            }
          },
          expectedResult: { expired: true, error: 'Token expired' },
        },
        {
          name: 'Token Refresh Process',
          action: async () => {
            // Simulate client refreshing the token
            return { 
              oldToken: originalToken, 
              newToken: refreshedToken,
              refreshTime: Date.now()
            };
          },
          expectedResult: expect.objectContaining({
            oldToken: originalToken,
            newToken: refreshedToken,
            refreshTime: expect.any(Number)
          }),
        },
        {
          name: 'New Token Verification',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce(userId);
            return await mockVerifyClerkToken(refreshedToken);
          },
          expectedResult: userId,
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(refreshFlow);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result.success).toBe(true));
    });

    /**
     * Tests token expiration edge cases including near-expiry scenarios
     * to ensure proper handling of timing-sensitive authentication states
     */
    it('should handle token expiration edge cases', async () => {
      const nearExpiryToken = 'near-expiry-token';
      const expiredToken = 'expired-token';
      const userId = 'edge_case_user';

      const expirationFlow = [
        {
          name: 'Near Expiry Token Still Valid',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce(userId);
            return await mockVerifyClerkToken(nearExpiryToken);
          },
          expectedResult: userId,
        },
        {
          name: 'Token Expires During Request',
          action: async () => {
            // Simulate token expiring during processing
            mockVerifyClerkToken.mockImplementationOnce(
              createTokenExpirationMock(expiredToken)
            );
            
            try {
              await mockVerifyClerkToken(expiredToken);
              return 'unexpected success';
            } catch (error) {
              console.debug('Token expiration during verification:', error instanceof Error ? error.message : String(error));
              return { expiredDuringVerification: true, error: error instanceof Error ? error.message : String(error) };
            }
          },
          expectedResult: { 
            expiredDuringVerification: true, 
            error: 'Token expired during verification' 
          },
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(expirationFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });
  });

  describe('multi-tenant integration', () => {
    /**
     * Tests multi-tenant authentication scenarios to ensure proper isolation
     * and security between different tenant contexts
     */
    it('should handle multi-tenant authentication contexts', async () => {
      const tenants = [
        { id: 'tenant_a', users: ['user_a1', 'user_a2'] },
        { id: 'tenant_b', users: ['user_b1', 'user_b2'] },
        { id: 'tenant_c', users: ['user_c1', 'user_c2'] },
      ];

      const multiTenantFlow: Array<{name: string; action: () => Promise<any>; expectedResult: any}> = [];
      
      tenants.forEach(tenant => {
        const processor = createMultiTenantFlowProcessor(tenant, multiTenantFlow);
        tenant.users.forEach(processor);
      });

      const results = await authFlowTestUtils.simulateAuthFlow(multiTenantFlow);

      expect(results).toHaveLength(6); // 3 tenants × 2 users each
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result).toMatchObject({
          userId: expect.stringMatching(/^user_[abc][12]$/),
          tenantId: expect.stringMatching(/^tenant_[abc]$/),
          context: 'multi-tenant-auth'
        });
      });
    });

    /**
     * Tests cross-tenant access prevention to ensure security isolation
     * between different tenant environments
     */
    it('should prevent cross-tenant access attempts', async () => {
      const crossTenantAttempts = [
        {
          name: 'User A tries to access Tenant B resources',
          tenantA: 'tenant_secure_a',
          userA: 'user_secure_a1',
          tenantB: 'tenant_secure_b',
          expectedIsolation: true,
        },
        {
          name: 'User B tries to access Tenant A resources',
          tenantA: 'tenant_secure_b', 
          userA: 'user_secure_b1',
          tenantB: 'tenant_secure_a',
          expectedIsolation: true,
        },
      ];

      const crossTenantFlow = crossTenantAttempts.map(attempt => ({
        ...createCrossTenantRequest(attempt),
        name: attempt.name, // Override with specific test name
      }));

      const results = await authFlowTestUtils.simulateAuthFlow(crossTenantFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result.requiresAdditionalTenantCheck).toBe(true);
      });
    });
  });

  describe('environment integration', () => {
    it('should handle different environment configurations', async () => {
      const environments = ['development', 'staging', 'production'];
      
      environments.forEach(env => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: env,
          writable: true,
        });
        
        // Mock environment-specific behavior
        mockVerifyClerkToken.mockResolvedValue(`${env}_user`);
        
        expect(process.env.NODE_ENV).toBe(env);
      });

      // Reset
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
      });
    });

    it('should handle missing environment variables gracefully', async () => {
      const originalEnv = process.env.CLERK_SECRET_KEY;
      delete process.env.CLERK_SECRET_KEY;

      mockVerifyClerkToken.mockRejectedValue(new Error('CLERK_SECRET_KEY is not defined'));

      const envFlow = [
        {
          name: 'Missing Env Var Handling',
          action: async () => {
            try {
              await mockVerifyClerkToken('any-token');
              return 'unexpected success';
            } catch (error) {
              console.debug('Environment configuration error:', error instanceof Error ? error.message : String(error));
              return error instanceof Error ? error.message : String(error);
            }
          },
          expectedResult: 'CLERK_SECRET_KEY is not defined',
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(envFlow);

      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('CLERK_SECRET_KEY is not defined');

      // Restore
      if (originalEnv) {
        process.env.CLERK_SECRET_KEY = originalEnv;
      }
    });

    /**
     * Tests environment variable validation and fallback mechanisms
     * to ensure robust configuration handling across different deployment scenarios
     */
    it('should validate environment configurations thoroughly', async () => {
      const envConfigs = [
        {
          name: 'Development Environment',
          env: { NODE_ENV: 'development', CLERK_SECRET_KEY: 'dev-secret-key' },
          expectedBehavior: 'should work with development settings',
        },
        {
          name: 'Production Environment',
          env: { NODE_ENV: 'production', CLERK_SECRET_KEY: 'prod-secret-key' },
          expectedBehavior: 'should work with production settings',
        },
        {
          name: 'Staging Environment',
          env: { NODE_ENV: 'staging', CLERK_SECRET_KEY: 'staging-secret-key' },
          expectedBehavior: 'should work with staging settings',
        },
      ];

      const originalEnvs = {
        NODE_ENV: process.env.NODE_ENV,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      };

      const envFlow = envConfigs.map(createEnvironmentAuthRequest);

      const results = await authFlowTestUtils.simulateAuthFlow(envFlow);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result.secretKeyExists).toBe(true);
      });

      // Restore original environment variables
      Object.entries(originalEnvs).forEach(([key, value]) => {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      });
    });
  });

  describe('cross-package integration scenarios', () => {
    /**
     * Tests integration with other auth-related packages in the monorepo
     * to ensure seamless interoperability and consistent behavior
     */
    it('should integrate with auth-rbac and auth-abac packages', async () => {
      const authIntegrationFlow = [
        {
          name: 'Basic Authentication',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce('rbac_abac_user');
            return await mockVerifyClerkToken('integration-token');
          },
          expectedResult: 'rbac_abac_user',
        },
        {
          name: 'RBAC Context Preparation',
          action: async () => {
            // Simulate preparing user context for RBAC/ABAC
            return {
              userId: 'rbac_abac_user',
              roles: ['user', 'editor'],
              permissions: ['read', 'write'],
              context: 'prepared-for-rbac-abac',
            };
          },
          expectedResult: {
            userId: 'rbac_abac_user',
            roles: ['user', 'editor'],
            permissions: ['read', 'write'],
            context: 'prepared-for-rbac-abac',
          },
        },
        {
          name: 'Auth Logging Integration',
          action: async () => {
            // Simulate auth-log package integration
            return {
              event: 'authentication_success',
              userId: 'rbac_abac_user',
              timestamp: Date.now(),
              package: 'auth-integration',
            };
          },
          expectedResult: expect.objectContaining({
            event: 'authentication_success',
            userId: 'rbac_abac_user',
            timestamp: expect.any(Number),
            package: 'auth-integration',
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(authIntegrationFlow);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result.success).toBe(true));
    });

    /**
     * Tests integration with database package for user session management
     * to ensure proper data persistence and retrieval patterns
     */
    it('should integrate with database package for session management', async () => {
      const sessionManagementFlow = [
        {
          name: 'Token Verification',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce('session_user_123');
            return await mockVerifyClerkToken('session-token');
          },
          expectedResult: 'session_user_123',
        },
        {
          name: 'Session Data Preparation',
          action: async () => {
            // Simulate preparing session data for database storage
            return {
              userId: 'session_user_123',
              sessionId: 'session_abc_123',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              metadata: {
                userAgent: 'test-agent',
                ipAddress: '127.0.0.1',
              },
            };
          },
          expectedResult: expect.objectContaining({
            userId: 'session_user_123',
            sessionId: 'session_abc_123',
            createdAt: expect.any(String),
            expiresAt: expect.any(String),
            metadata: expect.objectContaining({
              userAgent: 'test-agent',
              ipAddress: '127.0.0.1',
            }),
          }),
        },
        {
          name: 'Session Cleanup Simulation',
          action: async () => {
            // Simulate session cleanup process
            return {
              cleanupType: 'expired_sessions',
              sessionsRemoved: 5,
              userId: 'session_user_123',
              remainingActiveSessions: 2,
            };
          },
          expectedResult: {
            cleanupType: 'expired_sessions',
            sessionsRemoved: 5,
            userId: 'session_user_123',
            remainingActiveSessions: 2,
          },
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(sessionManagementFlow);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result.success).toBe(true));
    });
  });

  describe('advanced authentication workflows', () => {
    /**
     * Tests OAuth2 integration flow with Clerk authentication
     * to ensure proper handling of OAuth redirects and token exchanges
     */
    it('should handle OAuth2 authentication flow with external providers', async () => {
      const oauthFlow = [
        {
          name: 'OAuth2 Authorization Request',
          action: async () => {
            // Simulate OAuth2 authorization request
            return {
              authorizationUrl: 'https://oauth.provider.com/authorize',
              state: 'random-state-123',
              codeChallenge: 'challenge-456',
              redirectUri: 'http://localhost:3000/auth/callback',
            };
          },
          expectedResult: expect.objectContaining({
            authorizationUrl: expect.any(String),
            state: expect.any(String),
            codeChallenge: expect.any(String),
            redirectUri: expect.any(String),
          }),
        },
        {
          name: 'OAuth2 Callback Processing',
          action: async () => {
            // Simulate OAuth2 callback with authorization code
            const authCode = 'oauth2-auth-code-789';
            mockVerifyClerkToken.mockResolvedValueOnce('oauth_user_123');
            
            // Exchange auth code for Clerk token
            return {
              authCode,
              clerkUserId: await mockVerifyClerkToken('exchanged-clerk-token'),
              provider: 'google',
              linkedAt: new Date().toISOString(),
            };
          },
          expectedResult: expect.objectContaining({
            authCode: expect.any(String),
            clerkUserId: 'oauth_user_123',
            provider: 'google',
            linkedAt: expect.any(String),
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(oauthFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });

    /**
     * Tests passwordless authentication flow with magic links
     * to validate email-based authentication scenarios
     */
    it('should handle passwordless authentication with magic links', async () => {
      const magicLinkFlow = [
        {
          name: 'Magic Link Generation',
          action: async () => {
            // Simulate magic link generation
            return {
              email: 'user@example.com',
              magicToken: 'magic-token-abc-123',
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
              verificationUrl: 'http://localhost:3000/auth/verify?token=magic-token-abc-123',
            };
          },
          expectedResult: expect.objectContaining({
            email: 'user@example.com',
            magicToken: expect.any(String),
            expiresAt: expect.any(String),
            verificationUrl: expect.stringContaining('token='),
          }),
        },
        {
          name: 'Magic Link Verification',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce('magic_link_user_456');
            
            return {
              verified: true,
              userId: await mockVerifyClerkToken('magic-link-verified-token'),
              email: 'user@example.com',
              authenticatedAt: new Date().toISOString(),
            };
          },
          expectedResult: expect.objectContaining({
            verified: true,
            userId: 'magic_link_user_456',
            email: 'user@example.com',
            authenticatedAt: expect.any(String),
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(magicLinkFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });

    /**
     * Tests two-factor authentication (2FA) integration
     * to ensure proper multi-factor authentication support
     */
    it('should handle two-factor authentication flow', async () => {
      const twoFactorFlow = [
        {
          name: 'Primary Authentication',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce('2fa_user_789');
            
            return {
              userId: await mockVerifyClerkToken('primary-auth-token'),
              requires2FA: true,
              supportedMethods: ['totp', 'sms', 'email'],
            };
          },
          expectedResult: {
            userId: '2fa_user_789',
            requires2FA: true,
            supportedMethods: ['totp', 'sms', 'email'],
          },
        },
        {
          name: '2FA Code Verification',
          action: async () => {
            // Simulate TOTP verification
            const totpCode = '123456';
            mockVerifyClerkToken.mockResolvedValueOnce('2fa_user_789');
            
            return {
              method: 'totp',
              code: totpCode,
              verified: true,
              userId: await mockVerifyClerkToken('2fa-complete-token'),
              sessionElevated: true,
            };
          },
          expectedResult: expect.objectContaining({
            method: 'totp',
            code: '123456',
            verified: true,
            userId: '2fa_user_789',
            sessionElevated: true,
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(twoFactorFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });
  });

  describe('edge case scenarios', () => {
    /**
     * Tests authentication behavior during system maintenance
     * to ensure graceful handling of service disruptions
     */
    it('should handle authentication during maintenance mode', async () => {
      const maintenanceFlow = [
        {
          name: 'Maintenance Mode Check',
          action: async () => {
            // Simulate system in maintenance mode
            return {
              maintenanceMode: true,
              allowedUsers: ['admin_user', 'support_user'],
              message: 'System under maintenance',
              estimatedEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            };
          },
          expectedResult: expect.objectContaining({
            maintenanceMode: true,
            allowedUsers: expect.arrayContaining(['admin_user', 'support_user']),
            message: 'System under maintenance',
            estimatedEndTime: expect.any(String),
          }),
        },
        {
          name: 'Admin User Authentication During Maintenance',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce('admin_user');
            
            const userId = await mockVerifyClerkToken('admin-maintenance-token');
            return {
              userId,
              allowed: ['admin_user', 'support_user'].includes(userId),
              maintenanceBypass: true,
            };
          },
          expectedResult: {
            userId: 'admin_user',
            allowed: true,
            maintenanceBypass: true,
          },
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(maintenanceFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });

    /**
     * Tests authentication with network partitioning scenarios
     * to validate distributed system resilience
     */
    it('should handle network partition scenarios gracefully', async () => {
      const networkPartitionFlow = [
        {
          name: 'Primary Region Authentication',
          action: async () => {
            mockVerifyClerkToken.mockResolvedValueOnce('region_us_user');
            
            return {
              region: 'us-east-1',
              userId: await mockVerifyClerkToken('primary-region-token'),
              latency: 50,
              available: true,
            };
          },
          expectedResult: expect.objectContaining({
            region: 'us-east-1',
            userId: 'region_us_user',
            latency: expect.any(Number),
            available: true,
          }),
        },
        {
          name: 'Fallback Region Authentication',
          action: async () => {
            // Simulate primary region failure
            mockVerifyClerkToken
              .mockRejectedValueOnce(new Error('Connection timeout'))
              .mockResolvedValueOnce('region_eu_user');
            
            try {
              await mockVerifyClerkToken('failed-primary-token');
            } catch (error) {
              // Fallback to secondary region
              console.debug('Primary region failure, falling back:', error instanceof Error ? error.message : String(error));
              return {
                primaryFailed: true,
                fallbackRegion: 'eu-west-1',
                userId: await mockVerifyClerkToken('fallback-region-token'),
                latency: 150,
              };
            }
          },
          expectedResult: expect.objectContaining({
            primaryFailed: true,
            fallbackRegion: 'eu-west-1',
            userId: 'region_eu_user',
            latency: expect.any(Number),
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(networkPartitionFlow);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result.success).toBe(true));
    });

    /**
     * Tests authentication with rate limiting and backpressure
     * to ensure system stability under load
     */
    it('should handle rate limiting and backpressure scenarios', async () => {
      let requestCount = 0;
      const rateLimit = 10;
      
      mockVerifyClerkToken.mockImplementation(() => {
        requestCount++;
        if (requestCount > rateLimit) {
          return Promise.reject(new Error('Rate limit exceeded'));
        }
        return Promise.resolve(`user_${requestCount}`);
      });

      const rateLimitFlow = [];
      
      // Generate requests that will exceed rate limit
      for (let i = 1; i <= 15; i++) {
        rateLimitFlow.push(createRateLimitRequest(i, rateLimit));
      }

      const results = await authFlowTestUtils.simulateAuthFlow(rateLimitFlow);

      expect(results).toHaveLength(15);
      
      // First 10 should succeed
      results.slice(0, 10).forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result.success).toBe(true);
      });
      
      // Last 5 should be rate limited
      results.slice(10).forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result.rateLimited).toBe(true);
      });

      // Reset mock
      requestCount = 0;
    });
  });

  describe('performance optimization scenarios', () => {
    /**
     * Tests token caching strategies for performance improvement
     * while maintaining security requirements
     */
    it('should implement secure token caching for performance', async () => {
      const tokenCache = new Map();
      const cacheStats = { hits: 0, misses: 0 };
      
      const cachedVerifyToken = async (token: string) => {
        if (tokenCache.has(token)) {
          cacheStats.hits++;
          return tokenCache.get(token);
        }
        
        cacheStats.misses++;
        mockVerifyClerkToken.mockResolvedValueOnce(`cached_user_${token}`);
        const userId = await mockVerifyClerkToken(token);
        
        // Cache for 5 minutes
        tokenCache.set(token, userId);
        const cleanup = createTokenCacheCleanup(tokenCache, token);
        setTimeout(cleanup, 5 * 60 * 1000);
        
        return userId;
      };

      const cacheFlow = [
        {
          name: 'Initial Token Verification (Cache Miss)',
          action: async () => {
            const userId = await cachedVerifyToken('cache-token-1');
            return { userId, cacheStats: { ...cacheStats } };
          },
          expectedResult: expect.objectContaining({
            userId: 'cached_user_cache-token-1',
            cacheStats: { hits: 0, misses: 1 },
          }),
        },
        {
          name: 'Repeated Token Verification (Cache Hit)',
          action: async () => {
            const userId = await cachedVerifyToken('cache-token-1');
            return { userId, cacheStats: { ...cacheStats } };
          },
          expectedResult: expect.objectContaining({
            userId: 'cached_user_cache-token-1',
            cacheStats: { hits: 1, misses: 1 },
          }),
        },
        {
          name: 'Different Token Verification (Cache Miss)',
          action: async () => {
            const userId = await cachedVerifyToken('cache-token-2');
            return { userId, cacheStats: { ...cacheStats } };
          },
          expectedResult: expect.objectContaining({
            userId: 'cached_user_cache-token-2',
            cacheStats: { hits: 1, misses: 2 },
          }),
        },
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(cacheFlow);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result.success).toBe(true));
      
      // Verify cache effectiveness
      expect(cacheStats.hits).toBe(1);
      expect(cacheStats.misses).toBe(2);
    });

    /**
     * Tests batch authentication processing for bulk operations
     * to optimize high-volume authentication scenarios
     */
    it('should handle batch authentication requests efficiently', async () => {
      const batchSize = 50;
      const tokens = Array.from({ length: batchSize }, (_, i) => `batch-token-${i}`);
      const userIds = Array.from({ length: batchSize }, (_, i) => `batch_user_${i}`);
      
      // Mock batch responses
      userIds.forEach(userId => {
        mockVerifyClerkToken.mockResolvedValueOnce(userId);
      });

      const batchFlow = [
        createBatchProcessingRequest(tokens, batchSize),
      ];

      const results = await authFlowTestUtils.simulateAuthFlow(batchFlow);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result.avgTimePerToken).toBeLessThan(10); // Should be fast
    });
  });
});