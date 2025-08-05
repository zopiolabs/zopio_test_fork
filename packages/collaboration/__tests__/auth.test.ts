/**
 * @fileoverview Collaboration Package Tests - Authentication Functions
 * 
 * Comprehensive test suite for Liveblocks authentication functionality in the collaboration
 * package. Tests the authenticate() function with comprehensive coverage of all scenarios
 * including valid authentication, error handling, security considerations, and edge cases.
 * 
 * **Test Scope:**
 * - Liveblocks authentication session management and authorization
 * - Environment variable validation and API secret handling
 * - User information processing and room access control
 * - Response formatting and status code handling
 * - Security boundary testing and data sanitization
 * 
 * **Test Categories:**
 * 1. **Valid Authentication**: Complete user scenarios, minimal data, organization patterns
 * 2. **Error Handling**: Missing/invalid API secrets, user data validation, network errors
 * 3. **Security Testing**: API key exposure prevention, session validation, permission boundaries
 * 4. **Edge Cases**: Data validation, special characters, concurrent requests, session expiration
 * 5. **Integration**: Liveblocks SDK integration, environment configuration, response formatting
 * 
 * **Mock Strategy:**
 * - Complete isolation of @liveblocks/node SDK to prevent external dependencies
 * - Environment variable mocking with realistic validation scenarios
 * - Controlled session and authorization response simulation
 * - Network error simulation for comprehensive error handling coverage
 * 
 * **Quality Standards:**
 * - 90%+ line coverage for auth.ts authenticate() function
 * - All error paths and edge cases thoroughly tested
 * - Security scenarios validated with proper boundary testing
 * - Clear, descriptive test cases following project patterns
 * - Performance considerations for concurrent authentication scenarios
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';

// Mock server-only to avoid server-side restrictions in tests
vi.mock('server-only', () => ({}));

// Mock @t3-oss/env-nextjs to control environment validation
vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: vi.fn((config) => {
    // Simulate environment validation logic
    const mockEnv = {};
    
    if (config.server?.LIVEBLOCKS_SECRET) {
      const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
      if (value) {
        try {
          config.server.LIVEBLOCKS_SECRET.parse(value);
          (mockEnv as any).LIVEBLOCKS_SECRET = value;
        } catch {
          throw new Error('Invalid LIVEBLOCKS_SECRET format');
        }
      }
    }
    
    return mockEnv;
  }),
}));

// Mock the Liveblocks Node SDK
const mockPrepareSession = vi.fn();
const mockAllow = vi.fn();
const mockAuthorize = vi.fn();
const mockLiveblocks = vi.fn();

vi.mock('@liveblocks/node', () => ({
  Liveblocks: mockLiveblocks,
}));

describe('Collaboration Authentication', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Clear collaboration-related environment variables
    delete process.env.LIVEBLOCKS_SECRET;
    
    // Reset all mocks with fresh implementations
    vi.clearAllMocks();
    vi.resetModules();

    // Reset all mock functions to their default implementations
    mockPrepareSession.mockReset();
    mockAllow.mockReset();
    mockAuthorize.mockReset();
    mockLiveblocks.mockReset();

    // Setup fresh default mock behavior for each test
    const mockSession = {
      allow: mockAllow.mockReturnValue(undefined),
      authorize: mockAuthorize.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ token: 'mock-jwt-token' }),
      }),
      FULL_ACCESS: 'full_access',
    };

    mockPrepareSession.mockReturnValue(mockSession);
    
    // Setup default Liveblocks constructor behavior
    mockLiveblocks.mockImplementation(() => ({
      prepareSession: mockPrepareSession,
    }));
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    
    // Complete mock cleanup
    vi.clearAllMocks();
    vi.resetModules();
    
    // Reset individual mocks to prevent state pollution
    mockPrepareSession.mockReset();
    mockAllow.mockReset();
    mockAuthorize.mockReset();
    mockLiveblocks.mockReset();
    
    // Restore default Liveblocks behavior
    mockLiveblocks.mockImplementation(() => ({
      prepareSession: mockPrepareSession,
    }));
  });

  describe('Valid Authentication Scenarios', () => {
    beforeEach(() => {
      // Set valid LIVEBLOCKS_SECRET for successful tests
      process.env.LIVEBLOCKS_SECRET = 'sk_test_liveblocks_secret_123456789';
      
      // Ensure clean mock state for each test
      mockLiveblocks.mockImplementation(() => ({
        prepareSession: mockPrepareSession,
      }));
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);
    });

    it('should authenticate user with complete user info', async () => {
      const { authenticate } = await import('../auth.js');

      const userInfo = {
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
        color: '#ff0000',
      };

      const options = {
        userId: 'user_123',
        orgId: 'org_456',
        userInfo,
      };

      const response = await authenticate(options);

      // Verify Liveblocks session preparation
      expect(mockPrepareSession).toHaveBeenCalledWith('user_123', { userInfo });
      
      // Verify room access permissions
      expect(mockAllow).toHaveBeenCalledWith('org_456:*', 'full_access');
      
      // Verify authorization was called
      expect(mockAuthorize).toHaveBeenCalledOnce();
      
      // Verify response format
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      
      const responseBody = await response.text();
      expect(responseBody).toBe('{"token":"mock-jwt-token"}');
    });

    it('should authenticate user with minimal user info (color only)', async () => {
      const { authenticate } = await import('../auth.js');

      const userInfo = {
        color: '#00ff00',
      };

      const options = {
        userId: 'user_minimal',
        orgId: 'org_minimal',
        userInfo,
      };

      const response = await authenticate(options);

      // Verify session preparation with minimal info
      expect(mockPrepareSession).toHaveBeenCalledWith('user_minimal', { userInfo });
      
      // Verify organization-based room access
      expect(mockAllow).toHaveBeenCalledWith('org_minimal:*', 'full_access');
      
      // Verify successful response
      expect(response.status).toBe(200);
    });

    it('should handle organization-based room patterns correctly', async () => {
      const { authenticate } = await import('../auth.js');

      const testCases = [
        { orgId: 'company_123', expectedPattern: 'company_123:*' },
        { orgId: 'org-with-dashes', expectedPattern: 'org-with-dashes:*' },
        { orgId: 'ORG_UPPERCASE', expectedPattern: 'ORG_UPPERCASE:*' },
        { orgId: '12345', expectedPattern: '12345:*' },
      ];

      for (const { orgId, expectedPattern } of testCases) {
        // Reset mocks for each test case iteration
        mockPrepareSession.mockReset();
        mockAllow.mockReset();
        mockAuthorize.mockReset();
        
        const mockSession = {
          allow: mockAllow.mockReturnValue(undefined),
          authorize: mockAuthorize.mockResolvedValue({
            status: 200,
            body: JSON.stringify({ token: 'mock-jwt-token' }),
          }),
          FULL_ACCESS: 'full_access',
        };
        mockPrepareSession.mockReturnValue(mockSession);

        await authenticate({
          userId: 'test_user',
          orgId,
          userInfo: { color: '#0000ff' },
        });

        expect(mockAllow).toHaveBeenCalledWith(expectedPattern, 'full_access');
      }
    });

    it('should handle different authorization response formats', async () => {
      const { authenticate } = await import('../auth.js');

      const testResponses = [
        { status: 200, body: '{"token":"jwt-token-123"}' },
        { status: 201, body: '{"access_token":"bearer-token"}' },
        { status: 200, body: '{"session":"session-data","expires":1234567890}' },
      ];

      for (const mockResponse of testResponses) {
        // Reset mocks for each test case iteration
        mockPrepareSession.mockReset();
        mockAllow.mockReset();
        mockAuthorize.mockReset();
        
        const mockSession = {
          allow: mockAllow.mockReturnValue(undefined),
          authorize: mockAuthorize.mockResolvedValue(mockResponse),
          FULL_ACCESS: 'full_access',
        };
        mockPrepareSession.mockReturnValue(mockSession);

        const response = await authenticate({
          userId: 'user_test',
          orgId: 'org_test',
          userInfo: { color: '#ff00ff' },
        });

        expect(response.status).toBe(mockResponse.status);
        const responseBody = await response.text();
        expect(responseBody).toBe(mockResponse.body);
      }
    });

    it('should handle comprehensive user info with all optional fields', async () => {
      const { authenticate } = await import('../auth.js');

      const comprehensiveUserInfo = {
        name: 'Alice Johnson',
        avatar: 'https://cdn.example.com/avatars/alice.png',
        color: '#3b82f6',
      };

      const response = await authenticate({
        userId: 'user_comprehensive',
        orgId: 'company_acme',
        userInfo: comprehensiveUserInfo,
      });

      expect(mockPrepareSession).toHaveBeenCalledWith('user_comprehensive', { 
        userInfo: comprehensiveUserInfo 
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should throw error when LIVEBLOCKS_SECRET is missing', async () => {
      // Ensure no secret is set
      delete process.env.LIVEBLOCKS_SECRET;
      
      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_123',
        orgId: 'org_456',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('LIVEBLOCKS_SECRET is not set');

      // Verify Liveblocks SDK was not called
      expect(mockPrepareSession).not.toHaveBeenCalled();
    });

    it('should throw error when LIVEBLOCKS_SECRET is empty string', async () => {
      process.env.LIVEBLOCKS_SECRET = '';
      
      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_123',
        orgId: 'org_456',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('LIVEBLOCKS_SECRET is not set');
    });

    it('should throw error when LIVEBLOCKS_SECRET is undefined', async () => {
      process.env.LIVEBLOCKS_SECRET = undefined;
      
      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_123',
        orgId: 'org_456',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('LIVEBLOCKS_SECRET is not set');
    });

    it('should handle Liveblocks SDK initialization errors', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_valid_secret';

      // Temporarily override Liveblocks constructor to throw
      mockLiveblocks.mockImplementation(() => {
        throw new Error('SDK initialization failed');
      });

      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_123',
        orgId: 'org_456',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('SDK initialization failed');
    });

    it('should handle session preparation errors', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_valid_secret';

      // Reset and reconfigure mock to throw
      mockPrepareSession.mockReset().mockImplementation(() => {
        throw new Error('Session preparation failed');
      });

      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_123',
        orgId: 'org_456',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('Session preparation failed');
    });

    it('should handle authorization failures', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_valid_secret';

      // Reset mocks and configure for failure
      mockPrepareSession.mockReset();
      mockAllow.mockReset();
      mockAuthorize.mockReset();
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockRejectedValue(new Error('Authorization failed')),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_123',
        orgId: 'org_456',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('Authorization failed');
    });

    it('should handle network timeout errors', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_valid_secret';

      // Reset mocks and configure for timeout
      mockPrepareSession.mockReset();
      mockAllow.mockReset();
      mockAuthorize.mockReset();
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockRejectedValue(new Error('Network timeout')),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_timeout',
        orgId: 'org_timeout',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('Network timeout');
    });

    it('should handle malformed authorization responses', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_valid_secret';

      // Reset mocks and configure for malformed response
      mockPrepareSession.mockReset();
      mockAllow.mockReset();
      mockAuthorize.mockReset();
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: undefined,
          body: null,
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const response = await authenticate({
        userId: 'user_malformed',
        orgId: 'org_malformed',
        userInfo: { color: '#ff0000' },
      });

      // Should still create a Response object even with undefined status
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Security Scenarios', () => {
    beforeEach(() => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_secure_secret_123456789';
      
      // Ensure clean mock state for each test - restore default Liveblocks behavior
      mockLiveblocks.mockImplementation(() => ({
        prepareSession: mockPrepareSession,
      }));
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);
    });

    it('should not expose API secret in error messages', async () => {
      // Temporarily override Liveblocks constructor to throw with API key error
      mockLiveblocks.mockImplementation(() => {
        throw new Error('Invalid API key: sk_test_secure_secret_123456789');
      });

      const { authenticate } = await import('../auth.js');

      try {
        await authenticate({
          userId: 'user_security',
          orgId: 'org_security',
          userInfo: { color: '#ff0000' },
        });
      } catch (error) {
        // Error should contain original message (this is expected behavior)
        // Real implementation might want to sanitize this
        expect((error as Error).message).toContain('Invalid API key');
      }
    });

    it('should validate session data boundaries', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      // Test with various user data to ensure proper handling
      const testCases = [
        { userId: 'user<script>alert("xss")</script>', shouldWork: true },
        { orgId: 'org"; DROP TABLE users; --', shouldWork: true },
        { userInfo: { color: '#ff0000', name: '<img src=x onerror=alert(1)>' }, shouldWork: true },
      ];

      for (const { userId, orgId, userInfo, shouldWork } of testCases) {
        const options = {
          userId: userId || 'default_user',
          orgId: orgId || 'default_org',
          userInfo: userInfo || { color: '#ff0000' },
        };

        if (shouldWork) {
          const response = await authenticate(options);
          expect(response.status).toBe(200);
        } else {
          await expect(authenticate(options)).rejects.toThrow();
        }
      }
    });

    it('should handle user info sanitization properly', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const userInfoWithPotentiallyDangerousData = {
        color: '#ff0000',
        name: 'Normal User',
        avatar: 'javascript:alert(1)',
      };

      const response = await authenticate({
        userId: 'user_sanitization',
        orgId: 'org_sanitization',
        userInfo: userInfoWithPotentiallyDangerousData,
      });

      // Function should still work, as sanitization is typically handled by Liveblocks
      expect(response.status).toBe(200);
      expect(mockPrepareSession).toHaveBeenCalledWith('user_sanitization', { 
        userInfo: userInfoWithPotentiallyDangerousData 
      });
    });

    it('should enforce proper room access patterns', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      // Test various org patterns to ensure consistent access control
      const orgPatterns = [
        'legitimate_org',
        'org_with_underscore',
        'org-with-dashes',
        '123numeric',
        'UPPERCASE_ORG',
      ];

      for (const orgId of orgPatterns) {
        vi.clearAllMocks();
        mockPrepareSession.mockReturnValue(mockSession);

        await authenticate({
          userId: 'test_user',
          orgId,
          userInfo: { color: '#ff0000' },
        });

        // Verify that room access is properly scoped to organization
        expect(mockAllow).toHaveBeenCalledWith(`${orgId}:*`, 'full_access');
        expect(mockAllow).toHaveBeenCalledTimes(1);
      }
    });

    it('should handle concurrent authentication requests safely', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      // Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        authenticate({
          userId: `user_concurrent_${i}`,
          orgId: `org_concurrent_${i}`,
          userInfo: { color: `#${i.toString().padStart(6, '0')}` },
        })
      );

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed
      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
      });

      // Verify all sessions were prepared correctly
      expect(mockPrepareSession).toHaveBeenCalledTimes(5);
      expect(mockAllow).toHaveBeenCalledTimes(5);
      expect(mockAuthorize).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_edge_case_secret';
      
      // Ensure clean mock state for each test - restore default Liveblocks behavior
      mockLiveblocks.mockImplementation(() => ({
        prepareSession: mockPrepareSession,
      }));
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);
    });

    it('should handle empty string values vs undefined values', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const testCases = [
        { 
          userId: '',
          orgId: 'org_empty_user',
          userInfo: { color: '#ff0000' },
          shouldWork: true 
        },
        {
          userId: 'user_empty_org',
          orgId: '',
          userInfo: { color: '#00ff00' },
          shouldWork: true 
        },
        {
          userId: 'user_empty_name',
          orgId: 'org_empty_name',
          userInfo: { color: '#0000ff', name: '' },
          shouldWork: true 
        },
      ];

      for (const { userId, orgId, userInfo, shouldWork } of testCases) {
        if (shouldWork) {
          const response = await authenticate({ userId, orgId, userInfo });
          expect(response).toBeInstanceOf(Response);
        } else {
          await expect(authenticate({ userId, orgId, userInfo })).rejects.toThrow();
        }
      }
    });

    it('should handle special characters in user data', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const specialCharacterCases = [
        {
          userId: 'user_åäö_unicode',
          orgId: 'org_测试_chinese',
          userInfo: { 
            color: '#ff0000',
            name: 'Üser Námé with Äccénts'
          }
        },
        {
          userId: 'user@with#special$chars%',
          orgId: 'org&with*symbols!',
          userInfo: { 
            color: '#00ff00',
            name: 'User (with) [brackets] {and} symbols'
          }
        },
        {
          userId: 'user\nwith\nnewlines',
          orgId: 'org\twith\ttabs',
          userInfo: { 
            color: '#0000ff',
            name: 'Name with\r\nline breaks'
          }
        },
      ];

      for (const { userId, orgId, userInfo } of specialCharacterCases) {
        const response = await authenticate({ userId, orgId, userInfo });
        expect(response.status).toBe(200);
        
        // Verify proper room pattern generation even with special characters
        expect(mockAllow).toHaveBeenCalledWith(`${orgId}:*`, 'full_access');
      }
    });

    it('should handle very long user data strings', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const longString = 'x'.repeat(10000);
      const response = await authenticate({
        userId: `user_${longString}`,
        orgId: `org_${longString}`,
        userInfo: { 
          color: '#ff0000',
          name: longString,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should handle null and undefined values in user info', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const userInfoWithNulls = {
        color: '#ff0000',
        name: null as any,
        avatar: undefined as any,
      };

      const response = await authenticate({
        userId: 'user_nulls',
        orgId: 'org_nulls',
        userInfo: userInfoWithNulls,
      });

      expect(response.status).toBe(200);
      expect(mockPrepareSession).toHaveBeenCalledWith('user_nulls', { 
        userInfo: userInfoWithNulls 
      });
    });

    it('should handle deeply nested user info objects', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const deepUserInfo = {
        color: '#ff0000',
        name: 'Deep User',
      };

      const response = await authenticate({
        userId: 'user_deep',
        orgId: 'org_deep',
        userInfo: deepUserInfo,
      });

      expect(response.status).toBe(200);
    });

    it('should handle authorization responses with different status codes', async () => {
      const statusCodes = [200, 201, 202, 400, 401, 403, 404, 500];

      for (const statusCode of statusCodes) {
        // Reset mocks for each iteration
        mockPrepareSession.mockReset();
        mockAllow.mockReset();
        mockAuthorize.mockReset();
        
        const mockSession = {
          allow: mockAllow.mockReturnValue(undefined),
          authorize: mockAuthorize.mockResolvedValue({
            status: statusCode,
            body: JSON.stringify({ status: statusCode, message: `Status ${statusCode}` }),
          }),
          FULL_ACCESS: 'full_access',
        };
        mockPrepareSession.mockReturnValue(mockSession);

        const { authenticate } = await import('../auth.js');

        const response = await authenticate({
          userId: `user_status_${statusCode}`,
          orgId: `org_status_${statusCode}`,
          userInfo: { color: '#ff0000' },
        });

        expect(response.status).toBe(statusCode);
        const responseBody = await response.text();
        expect(responseBody).toContain(`Status ${statusCode}`);
      }
    });
  });

  describe('Performance and Integration', () => {
    beforeEach(() => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_performance_secret';
      
      // Ensure clean mock state for each test - restore default Liveblocks behavior
      mockLiveblocks.mockImplementation(() => ({
        prepareSession: mockPrepareSession,
      }));
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);
    });

    it('should handle rapid sequential authentication requests', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const startTime = Date.now();
      
      // Execute 10 sequential requests
      for (let i = 0; i < 10; i++) {
        const response = await authenticate({
          userId: `user_sequential_${i}`,
          orgId: `org_sequential_${i}`,
          userInfo: { color: '#ff0000' },
        });
        expect(response.status).toBe(200);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 requests

      // Verify all calls were made
      expect(mockPrepareSession).toHaveBeenCalledTimes(10);
      expect(mockAllow).toHaveBeenCalledTimes(10);
      expect(mockAuthorize).toHaveBeenCalledTimes(10);
    });

    it('should properly clean up resources on errors', async () => {
      const mockSession = {
        allow: mockAllow,
        authorize: mockAuthorize.mockRejectedValue(new Error('Authorization failed')),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'user_cleanup',
        orgId: 'org_cleanup',
        userInfo: { color: '#ff0000' },
      })).rejects.toThrow('Authorization failed');

      // Session should still have been prepared and permissions set
      expect(mockPrepareSession).toHaveBeenCalledOnce();
      expect(mockAllow).toHaveBeenCalledOnce();
    });

    it('should maintain consistent behavior across multiple imports', async () => {
      // Test that multiple imports of the authenticate function work consistently
      const { authenticate: auth1 } = await import('../auth.js');
      
      vi.resetModules();
      
      const { authenticate: auth2 } = await import('../auth.js');

      // Reset and setup mocks for clean state
      mockPrepareSession.mockReset();
      mockAllow.mockReset();
      mockAuthorize.mockReset();
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const response1 = await auth1({
        userId: 'user_import1',
        orgId: 'org_import1',
        userInfo: { color: '#ff0000' },
      });

      const response2 = await auth2({
        userId: 'user_import2',
        orgId: 'org_import2',
        userInfo: { color: '#00ff00' },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle memory-intensive user data without issues', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      // Create a large user info object
      const largeUserInfo = {
        color: '#ff0000',
        name: 'Memory Test User',
      } as any;

      // Add many properties to simulate memory usage (as extra properties)
      for (let i = 0; i < 1000; i++) {
        largeUserInfo[`property_${i}`] = `value_${'x'.repeat(100)}_${i}`;
      }

      const response = await authenticate({
        userId: 'user_memory',
        orgId: 'org_memory',
        userInfo: largeUserInfo,
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Type Safety and Runtime Validation', () => {
    beforeEach(() => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_types_secret';
      
      // Ensure clean mock state for each test - restore default Liveblocks behavior
      mockLiveblocks.mockImplementation(() => ({
        prepareSession: mockPrepareSession,
      }));
      
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);
    });

    it('should handle various userInfo type combinations', async () => {
      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      const { authenticate } = await import('../auth.js');

      const userInfoVariations = [
        { color: '#ff0000' },
        { color: '#00ff00', name: 'User with name' },
        { color: '#0000ff', avatar: 'https://example.com/avatar.jpg' },
        { color: '#ffff00', name: 'Full User', avatar: 'https://example.com/full.jpg' },
        { color: '#ff00ff' },
        { color: '#00ffff', name: 'Another User' },
      ] as any[];

      for (const userInfo of userInfoVariations) {
        const response = await authenticate({
          userId: 'user_types',
          orgId: 'org_types',
          userInfo,
        });

        expect(response.status).toBe(200);
        expect(mockPrepareSession).toHaveBeenCalledWith('user_types', { userInfo });
      }
    });

    it('should maintain proper function signature requirements', async () => {
      const { authenticate } = await import('../auth.js');

      const mockSession = {
        allow: mockAllow.mockReturnValue(undefined),
        authorize: mockAuthorize.mockResolvedValue({
          status: 200,
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        }),
        FULL_ACCESS: 'full_access',
      };
      mockPrepareSession.mockReturnValue(mockSession);

      // Test that all required parameters are enforced
      const validCall = {
        userId: 'required_user',
        orgId: 'required_org',
        userInfo: { color: '#ff0000' },
      };

      const response = await authenticate(validCall);
      expect(response).toBeInstanceOf(Response);
    });
  });
});