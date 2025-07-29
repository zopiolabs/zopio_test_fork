/**
 * SPDX-License-Identifier: MIT
 */

import type { SecurityTestOptions, TestTemplate } from './types.js';

/**
 * Template for security-focused tests
 */
export const securityTestTemplate: TestTemplate = {
  name: 'Security Test',
  description:
    'Template for testing security vulnerabilities, authentication, and authorization',

  generate: (options: SecurityTestOptions) => {
    const {
      moduleName,
      modulePath,
      testAuthentication = true,
      testAuthorization = true,
      testInputValidation = true,
      testSqlInjection = true,
      testXss = true,
      testCsrf = true,
    } = options;

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${moduleName} } from '${modulePath}';
import { createTestUser, createTestContext } from '@repo/testing/auth-helpers';

// Mock security services
const mockAuthService = vi.fn();
const mockTokenValidator = vi.fn();
const mockRoleChecker = vi.fn();

vi.mock('@repo/auth', () => ({
  authService: mockAuthService,
  validateToken: mockTokenValidator,
  checkRole: mockRoleChecker,
}));

describe('${moduleName} Security Tests', () => {
  let testContext: any;
  let testUser: any;
  let maliciousUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    testContext = await createTestContext();
    
    // Create test users with different roles
    testUser = await createTestUser({
      email: 'user@example.com',
      role: 'user',
      permissions: ['read', 'write']
    });
    
    maliciousUser = await createTestUser({
      email: 'malicious@example.com',
      role: 'user',
      permissions: ['read']
    });
    
    // Set up default mocks
    mockTokenValidator.mockResolvedValue(testUser);
    mockRoleChecker.mockReturnValue(true);
  });

  ${
    testAuthentication
      ? `describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      mockTokenValidator.mockResolvedValue(null);
      
      await expect(${moduleName}.performSecureOperation({
        data: 'test'
      })).rejects.toThrow('Authentication required');
    });

    it('should reject invalid authentication tokens', async () => {
      const invalidTokens = [
        null,
        undefined,
        '',
        'invalid-token',
        'Bearer ',
        'Bearer invalid',
        'expired-token',
        'malformed.jwt.token'
      ];
      
      for (const token of invalidTokens) {
        mockTokenValidator.mockResolvedValue(null);
        
        await expect(${moduleName}.performSecureOperation({
          token,
          data: 'test'
        })).rejects.toThrow('Invalid or expired token');
      }
    });

    it('should handle token expiration', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockTokenValidator.mockRejectedValue(expiredError);
      
      await expect(${moduleName}.performSecureOperation({
        token: 'expired-token',
        data: 'test'
      })).rejects.toThrow('Token expired');
    });

    it('should prevent token reuse after logout', async () => {
      const validToken = 'valid-token';
      
      // First request should succeed
      mockTokenValidator.mockResolvedValue(testUser);
      const result1 = await ${moduleName}.performSecureOperation({
        token: validToken,
        data: 'test'
      });
      expect(result1.success).toBe(true);
      
      // Simulate logout
      await ${moduleName}.logout({ token: validToken });
      
      // Second request with same token should fail
      mockTokenValidator.mockResolvedValue(null);
      await expect(${moduleName}.performSecureOperation({
        token: validToken,
        data: 'test'
      })).rejects.toThrow('Token invalidated');
    });

    it('should implement session timeout', async () => {
      // Mock old session
      const oldUser = { ...testUser, lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000) }; // 24 hours ago
      mockTokenValidator.mockResolvedValue(oldUser);
      
      await expect(${moduleName}.performSecureOperation({
        token: 'old-session-token',
        data: 'test'
      })).rejects.toThrow('Session expired');
    });
  });`
      : ''
  }

  ${
    testAuthorization
      ? `describe('Authorization Security', () => {
    it('should enforce role-based access control', async () => {
      mockRoleChecker.mockReturnValue(false);
      
      await expect(${moduleName}.performAdminOperation({
        userId: testUser.id,
        action: 'admin-only'
      })).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent privilege escalation', async () => {
      // User tries to elevate their own role
      await expect(${moduleName}.updateUser({
        userId: testUser.id,
        updates: { role: 'admin' },
        requesterId: testUser.id
      })).rejects.toThrow('Cannot modify own role');
      
      // User tries to give themselves new permissions
      await expect(${moduleName}.updateUser({
        userId: testUser.id,
        updates: { permissions: ['admin', 'delete'] },
        requesterId: testUser.id
      })).rejects.toThrow('Cannot modify own permissions');
    });

    it('should prevent unauthorized data access', async () => {
      // User tries to access another user's private data
      const otherUser = await createTestUser({
        email: 'other@example.com',
        role: 'user'
      });
      
      await expect(${moduleName}.getUserPrivateData({
        userId: otherUser.id,
        requesterId: testUser.id
      })).rejects.toThrow('Access denied');
    });

    it('should implement resource-level permissions', async () => {
      // User tries to modify resource they don't own
      const resourceId = 'resource-123';
      
      await expect(${moduleName}.updateResource({
        resourceId,
        updates: { title: 'Modified' },
        userId: maliciousUser.id
      })).rejects.toThrow('Not authorized to modify this resource');
    });

    it('should validate permission inheritance', async () => {
      // Test that child resources inherit parent permissions
      const parentResource = 'parent-resource';
      const childResource = 'child-resource';
      
      await expect(${moduleName}.accessChildResource({
        parentId: parentResource,
        childId: childResource,
        userId: maliciousUser.id,
        permission: 'write'
      })).rejects.toThrow('No write access to parent resource');
    });
  });`
      : ''
  }

  ${
    testInputValidation
      ? `describe('Input Validation Security', () => {
    it('should validate input types', async () => {
      const invalidInputs = [
        { input: null, expected: 'Input cannot be null' },
        { input: undefined, expected: 'Input is required' },
        { input: {}, expected: 'Invalid input format' },
        { input: [], expected: 'Array input not allowed' },
        { input: 123, expected: 'String expected' },
        { input: true, expected: 'String expected' }
      ];
      
      for (const testCase of invalidInputs) {
        await expect(${moduleName}.processInput({
          data: testCase.input,
          userId: testUser.id
        })).rejects.toThrow(testCase.expected);
      }
    });

    it('should validate input length and size', async () => {
      const tooLongInput = 'x'.repeat(10001); // Assuming 10KB limit
      const tooShortInput = '';
      
      await expect(${moduleName}.processInput({
        data: tooLongInput,
        userId: testUser.id
      })).rejects.toThrow('Input too long');
      
      await expect(${moduleName}.processInput({
        data: tooShortInput,
        userId: testUser.id
      })).rejects.toThrow('Input cannot be empty');
    });

    it('should sanitize file uploads', async () => {
      const maliciousFiles = [
        { name: 'script.exe', type: 'application/x-executable' },
        { name: 'malware.bat', type: 'application/x-msdos-program' },
        { name: 'virus.js', type: 'application/javascript' },
        { name: '../../../etc/passwd', type: 'text/plain' }
      ];
      
      for (const file of maliciousFiles) {
        await expect(${moduleName}.uploadFile({
          file,
          userId: testUser.id
        })).rejects.toThrow('File type not allowed');
      }
    });

    it('should validate email formats', async () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user..user@example.com',
        'user@example',
        '<script>alert("xss")</script>@example.com'
      ];
      
      for (const email of invalidEmails) {
        await expect(${moduleName}.updateEmail({
          email,
          userId: testUser.id
        })).rejects.toThrow('Invalid email format');
      }
    });

    it('should validate URL inputs', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://malicious.com/backdoor',
        'http://evil.com/redirect?url=javascript:alert("xss")'
      ];
      
      for (const url of maliciousUrls) {
        await expect(${moduleName}.processUrl({
          url,
          userId: testUser.id
        })).rejects.toThrow('Invalid or unsafe URL');
      }
    });
  });`
      : ''
  }

  ${
    testSqlInjection
      ? `describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in user input', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET role='admin' WHERE id=1; --",
        "' UNION SELECT * FROM users WHERE '1'='1",
        "'; INSERT INTO users (role) VALUES ('admin'); --",
        "1; DELETE FROM users; --"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        const result = await ${moduleName}.searchUsers({
          query: payload,
          userId: testUser.id
        });
        
        // Should return safe results, not execute malicious SQL
        expect(result.users).toBeDefined();
        expect(result.users.length).toBeLessThan(1000); // Reasonable limit
        expect(result.error).toBeUndefined();
      }
    });

    it('should use parameterized queries', async () => {
      const testQuery = "test'; DROP TABLE users; --";
      
      const result = await ${moduleName}.findUserByName({
        name: testQuery,
        userId: testUser.id
      });
      
      // Should find no users (query treated as literal string)
      expect(result.users).toHaveLength(0);
    });

    it('should prevent blind SQL injection', async () => {
      const blindSqlPayloads = [
        "admin' AND (SELECT COUNT(*) FROM users) > 0 --",
        "admin' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1)='a' --",
        "admin' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --"
      ];
      
      for (const payload of blindSqlPayloads) {
        const start = Date.now();
        
        await ${moduleName}.getUserByRole({
          role: payload,
          userId: testUser.id
        });
        
        const duration = Date.now() - start;
        
        // Response time should be consistent (no time-based inference)
        expect(duration).toBeLessThan(1000);
      }
    });
  });`
      : ''
  }

  ${
    testXss
      ? `describe('XSS Prevention', () => {
    it('should prevent stored XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\\'xss\\')">',
        '<svg onload="alert(\\'xss\\')">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(\\'xss\\')"></iframe>',
        '<div onclick="alert(\\'xss\\')">Click me</div>'
      ];
      
      for (const payload of xssPayloads) {
        const result = await ${moduleName}.createPost({
          content: payload,
          userId: testUser.id
        });
        
        expect(result.post.content).not.toContain('<script>');
        expect(result.post.content).not.toContain('javascript:');
        expect(result.post.content).not.toContain('onerror=');
        expect(result.post.content).not.toContain('onload=');
      }
    });

    it('should prevent reflected XSS attacks', async () => {
      const xssPayload = '<script>alert("reflected-xss")</script>';
      
      const result = await ${moduleName}.searchPosts({
        query: xssPayload,
        userId: testUser.id
      });
      
      // Response should not contain unescaped script tags
      expect(JSON.stringify(result)).not.toContain('<script>');
    });

    it('should sanitize HTML content', async () => {
      const maliciousHtml = \`
        <div>
          <script>alert('xss')</script>
          <img src="x" onerror="alert('xss')">
          <p>Safe content</p>
          <a href="javascript:alert('xss')">Link</a>
        </div>
      \`;
      
      const result = await ${moduleName}.createPost({
        content: maliciousHtml,
        userId: testUser.id
      });
      
      expect(result.post.content).toContain('<p>Safe content</p>');
      expect(result.post.content).not.toContain('<script>');
      expect(result.post.content).not.toContain('onerror=');
      expect(result.post.content).not.toContain('javascript:');
    });

    it('should handle DOM-based XSS prevention', async () => {
      const domXssPayloads = [
        'document.write("<script>alert(\\'xss\\')</script>")',
        'window.location="javascript:alert(\\'xss\\')"',
        'eval("alert(\\'xss\\')")'
      ];
      
      for (const payload of domXssPayloads) {
        const result = await ${moduleName}.processClientScript({
          script: payload,
          userId: testUser.id
        });
        
        expect(result.error).toBe('Unsafe script detected');
        expect(result.executed).toBe(false);
      }
    });
  });`
      : ''
  }

  ${
    testCsrf
      ? `describe('CSRF Prevention', () => {
    it('should require CSRF tokens for state-changing operations', async () => {
      await expect(${moduleName}.deleteUser({
        userId: testUser.id,
        requesterId: testUser.id
        // Missing CSRF token
      })).rejects.toThrow('CSRF token required');
    });

    it('should validate CSRF token authenticity', async () => {
      const invalidTokens = [
        'invalid-token',
        'expired-token',
        'token-for-different-user',
        ''
      ];
      
      for (const token of invalidTokens) {
        await expect(${moduleName}.deleteUser({
          userId: testUser.id,
          requesterId: testUser.id,
          csrfToken: token
        })).rejects.toThrow('Invalid CSRF token');
      }
    });

    it('should prevent CSRF token reuse', async () => {
      const csrfToken = 'valid-csrf-token-123';
      
      // First request should succeed
      mockTokenValidator.mockResolvedValue({ ...testUser, csrfToken });
      
      const result1 = await ${moduleName}.updateProfile({
        userId: testUser.id,
        updates: { name: 'Updated Name' },
        csrfToken
      });
      expect(result1.success).toBe(true);
      
      // Second request with same token should fail
      await expect(${moduleName}.updateProfile({
        userId: testUser.id,
        updates: { email: 'new@example.com' },
        csrfToken
      })).rejects.toThrow('CSRF token already used');
    });

    it('should validate origin header', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://attacker.com',
        'null',
        'data:',
        'file://'
      ];
      
      for (const origin of maliciousOrigins) {
        await expect(${moduleName}.updateProfile({
          userId: testUser.id,
          updates: { name: 'Hacked' },
          origin,
          csrfToken: 'valid-token'
        })).rejects.toThrow('Invalid origin');
      }
    });
  });`
      : ''
  }

  describe('Session Security', () => {
    it('should prevent session fixation', async () => {
      const oldSessionId = 'old-session-123';
      
      // Simulate login with existing session
      const result = await ${moduleName}.login({
        email: testUser.email,
        password: 'password123',
        existingSessionId: oldSessionId
      });
      
      // Should create new session, not reuse old one
      expect(result.sessionId).not.toBe(oldSessionId);
      expect(result.sessionId).toBeDefined();
    });

    it('should implement secure session cookies', async () => {
      const result = await ${moduleName}.login({
        email: testUser.email,
        password: 'password123'
      });
      
      expect(result.cookieOptions.httpOnly).toBe(true);
      expect(result.cookieOptions.secure).toBe(true);
      expect(result.cookieOptions.sameSite).toBe('strict');
    });

    it('should detect concurrent sessions from different locations', async () => {
      // Login from first location
      const session1 = await ${moduleName}.login({
        email: testUser.email,
        password: 'password123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ip: '192.168.1.1'
      });
      
      // Login from different location
      const session2 = await ${moduleName}.login({
        email: testUser.email,
        password: 'password123',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        ip: '10.0.0.1'
      });
      
      // Should flag suspicious activity
      expect(session2.suspiciousActivity).toBe(true);
      expect(session2.requiresVerification).toBe(true);
    });
  });

  describe('Data Protection', () => {
    it('should encrypt sensitive data at rest', async () => {
      const sensitiveData = 'confidential information';
      
      const result = await ${moduleName}.storeSensitiveData({
        data: sensitiveData,
        userId: testUser.id
      });
      
      // Data should be encrypted in storage
      expect(result.storedData).not.toBe(sensitiveData);
      expect(result.encrypted).toBe(true);
      expect(result.storedData).toMatch(/^[a-f0-9]+$/); // Hex encrypted data
    });

    it('should implement secure password hashing', async () => {
      const password = 'mySecurePassword123!';
      
      const result = await ${moduleName}.hashPassword(password);
      
      expect(result.hash).not.toBe(password);
      expect(result.hash).toContain('$'); // bcrypt format
      expect(result.saltRounds).toBeGreaterThanOrEqual(12);
    });

    it('should prevent timing attacks on password verification', async () => {
      const validPassword = 'correct-password';
      const invalidPassword = 'wrong-password';
      
      // Time password verification for valid and invalid passwords
      const times = [];
      
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await ${moduleName}.verifyPassword({
          password: i % 2 === 0 ? validPassword : invalidPassword,
          userId: testUser.id
        }).catch(() => {}); // Ignore failures
        times.push(performance.now() - start);
      }
      
      // Timing should be consistent regardless of password validity
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const timingVariance = (maxTime - minTime) / minTime;
      
      expect(timingVariance).toBeLessThan(0.5); // Less than 50% variance
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    it('should implement rate limiting for sensitive operations', async () => {
      const attempts = [];
      
      // Attempt multiple login tries
      for (let i = 0; i < 10; i++) {
        attempts.push(
          ${moduleName}.login({
            email: testUser.email,
            password: 'wrong-password',
            ip: '192.168.1.1'
          }).catch(error => error)
        );
      }
      
      const results = await Promise.all(attempts);
      const rateLimited = results.filter(r => r.message?.includes('rate limit'));
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should prevent brute force attacks', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await ${moduleName}.login({
          email: testUser.email,
          password: 'wrong-password'
        }).catch(() => {});
      }
      
      // Account should be temporarily locked
      await expect(${moduleName}.login({
        email: testUser.email,
        password: 'correct-password'
      })).rejects.toThrow('Account temporarily locked');
    });

    it('should handle large payload attacks', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      await expect(${moduleName}.processData({
        data: largePayload,
        userId: testUser.id
      })).rejects.toThrow('Payload too large');
    });
  });
});`;
  },
};
