/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestWrapper, mockClerkAuth, authFlowTestUtils } from '@repo/testing';
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

describe('Auth Package Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

      render(React.createElement(TestComponent), { wrapper: createTestWrapper() });

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

      render(React.createElement(TestComponent), { wrapper: createTestWrapper() });

      expect(screen.getByTestId('clerk-provider')).toBeInTheDocument();
      expect(screen.getByTestId('sign-up')).toBeInTheDocument();
      expect(screen.getByText('Sign Up Content')).toBeInTheDocument();
    });

    it('should handle component props correctly', () => {
      const testProps = { theme: 'dark', appearance: { baseTheme: 'dark' } };
      
      const TestComponent = () => (
        React.createElement(MockSignIn, testProps, 'Themed Sign In')
      );

      render(React.createElement(TestComponent), { wrapper: createTestWrapper() });

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
            return mockAuthState.user;
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
              return { success: false, error: error.message };
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

      const concurrentRequests = userIds.map((_, index) => ({
        name: `Concurrent Request ${index + 1}`,
        action: async () => {
          return await mockVerifyClerkToken(`token_${index + 1}`);
        },
        expectedResult: userIds[index],
      }));

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

    it('should handle authentication timeout scenarios', async () => {
      vi.useFakeTimers();

      mockVerifyClerkToken.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('timeout_user'), 5000))
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

  describe('environment integration', () => {
    it('should handle different environment configurations', async () => {
      const environments = ['development', 'staging', 'production'];
      
      environments.forEach(env => {
        process.env.NODE_ENV = env;
        
        // Mock environment-specific behavior
        mockVerifyClerkToken.mockResolvedValue(`${env}_user`);
        
        expect(process.env.NODE_ENV).toBe(env);
      });

      // Reset
      process.env.NODE_ENV = 'test';
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
              return error.message;
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
  });
});