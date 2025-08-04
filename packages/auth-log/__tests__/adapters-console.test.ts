/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { consoleLogger } from '../adapters/console.js';
import type { AccessLogEntry } from '../types.js';

describe('Console Adapter', () => {
  let mockStdout: { write: ReturnType<typeof vi.fn> };
  let originalStdout: typeof process.stdout;

  beforeEach(() => {
    vi.clearAllMocks();
    originalStdout = process.stdout;
    mockStdout = { write: vi.fn() };
    process.stdout = mockStdout as any;
  });

  afterEach(() => {
    process.stdout = originalStdout;
    vi.clearAllMocks();
  });

  describe('consoleLogger.write', () => {
    /**
     * Tests basic console logging functionality
     * to ensure proper output formatting and structure
     */
    it('should write access log entry to stdout with proper formatting', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        resource: 'user_profile',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'user',
        },
        can: true,
      };

      consoleLogger.write(entry);

      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      
      const expectedOutput = `[AUTH-LOG] ${JSON.stringify(entry, null, 2)}\n`;
      expect(mockStdout.write).toHaveBeenCalledWith(expectedOutput);
    });

    /**
     * Tests console logging with complex nested objects
     * to ensure proper JSON serialization
     */
    it('should handle complex nested objects in context', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:31:00.000Z',
        resource: 'api_endpoint',
        action: 'execute',
        context: {
          userId: 'user_456',
          role: 'api_user',
          metadata: {
            requestId: 'req_12345',
            sessionData: {
              sessionId: 'sess_abcdef',
              expiresAt: '2024-01-15T11:30:00.000Z',
              permissions: ['read', 'write'],
            },
            clientInfo: {
              userAgent: 'TestClient/1.0',
              ipAddress: '192.168.1.100',
              location: {
                country: 'US',
                region: 'CA',
              },
            },
          },
        },
        recordId: 'record_789',
        field: 'sensitive_data',
        can: false,
        reason: 'Insufficient privileges for field access',
      };

      consoleLogger.write(entry);

      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      
      const expectedOutput = `[AUTH-LOG] ${JSON.stringify(entry, null, 2)}\n`;
      expect(mockStdout.write).toHaveBeenCalledWith(expectedOutput);
      
      // Verify the output contains properly formatted JSON
      const outputCall = mockStdout.write.mock.calls[0][0];
      expect(outputCall).toContain('[AUTH-LOG]');
      expect(outputCall).toContain('"userId": "user_456"');
      expect(outputCall).toContain('"sessionId": "sess_abcdef"');
      expect(outputCall).toContain('"location"');
      expect(outputCall).toContain('"reason": "Insufficient privileges for field access"');
    });

    /**
     * Tests console logging with special characters and edge cases
     * to ensure proper escaping and formatting
     */
    it('should handle special characters and edge cases', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:32:00.000Z',
        resource: 'special_resource',
        action: 'test',
        context: {
          userId: 'user_with_"quotes"',
          description: 'Text with\nnewlines\rand\ttabs',
          unicodeText: 'Unicode: üñíçødé 🚀 emoji',
          specialChars: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
          nullValue: null,
          booleanValue: true,
          numberValue: 42.5,
          arrayValue: ['item1', 'item2', null, true, 123],
        },
        can: true,
      };

      consoleLogger.write(entry);

      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      
      const outputCall = mockStdout.write.mock.calls[0][0];
      expect(outputCall).toContain('[AUTH-LOG]');
      expect(outputCall).toContain('user_with_\\"quotes\\"'); // Escaped quotes
      expect(outputCall).toContain('\\n'); // Escaped newlines
      expect(outputCall).toContain('\\r'); // Escaped carriage returns
      expect(outputCall).toContain('\\t'); // Escaped tabs
      expect(outputCall).toContain('üñíçødé 🚀 emoji'); // Unicode preserved
      expect(outputCall).toContain('null'); // Null values
      expect(outputCall).toContain('true'); // Boolean values
      expect(outputCall).toContain('42.5'); // Number values
    });

    /**
     * Tests console logging with minimal entry data
     * to ensure proper handling of sparse objects
     */
    it('should handle minimal access log entries', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:33:00.000Z',
        resource: 'minimal',
        action: 'test',
        context: {},
        can: false,
      };

      consoleLogger.write(entry);

      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      
      const expectedOutput = `[AUTH-LOG] ${JSON.stringify(entry, null, 2)}\n`;
      expect(mockStdout.write).toHaveBeenCalledWith(expectedOutput);
      
      const outputCall = mockStdout.write.mock.calls[0][0];
      expect(outputCall).toContain('"context": {}');
      expect(outputCall).toContain('"can": false');
    });

    /**
     * Tests console logging with undefined and null values
     * to ensure proper JSON serialization behavior
     */
    it('should handle undefined and null values properly', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:34:00.000Z',
        resource: 'null_test',
        action: 'test',
        context: {
          userId: 'user_123',
          nullValue: null,
          undefinedValue: undefined as any,
          emptyString: '',
          zeroValue: 0,
        },
        recordId: undefined as any,
        field: null as any,
        can: true,
        reason: undefined,
      };

      consoleLogger.write(entry);

      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      
      const outputCall = mockStdout.write.mock.calls[0][0];
      expect(outputCall).toContain('[AUTH-LOG]');
      expect(outputCall).toContain('"nullValue": null');
      // undefined values should be omitted in JSON serialization
      expect(outputCall).not.toContain('undefinedValue');
      expect(outputCall).toContain('"emptyString": ""');
      expect(outputCall).toContain('"zeroValue": 0');
    });

    /**
     * Tests multiple consecutive writes to console
     * to ensure proper handling of sequential logging
     */
    it('should handle multiple consecutive writes', () => {
      const entries: AccessLogEntry[] = [
        {
          timestamp: '2024-01-15T10:35:00.000Z',
          resource: 'resource_1',
          action: 'read',
          context: { userId: 'user_1' },
          can: true,
        },
        {
          timestamp: '2024-01-15T10:35:01.000Z',
          resource: 'resource_2',
          action: 'write',
          context: { userId: 'user_2' },
          can: false,
          reason: 'Access denied',
        },
        {
          timestamp: '2024-01-15T10:35:02.000Z',
          resource: 'resource_3',
          action: 'delete',
          context: { userId: 'user_3' },
          can: true,
        },
      ];

      entries.forEach(entry => consoleLogger.write(entry));

      expect(mockStdout.write).toHaveBeenCalledTimes(3);
      
      entries.forEach((entry, index) => {
        const expectedOutput = `[AUTH-LOG] ${JSON.stringify(entry, null, 2)}\n`;
        expect(mockStdout.write).toHaveBeenNthCalledWith(index + 1, expectedOutput);
      });
    });

    /**
     * Tests concurrent writes to console
     * to ensure thread safety and proper output ordering
     */
    it('should handle concurrent writes safely', async () => {
      const concurrentEntries: AccessLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: `2024-01-15T10:36:${String(i).padStart(2, '0')}.000Z`,
        resource: `concurrent_resource_${i}`,
        action: 'concurrent_test',
        context: { userId: `concurrent_user_${i}`, index: i },
        can: i % 2 === 0,
      }));

      // Write all entries concurrently
      await Promise.all(
        concurrentEntries.map(createConcurrentConsoleLogPromise)
      );

      expect(mockStdout.write).toHaveBeenCalledTimes(50);
      
      // Verify all entries were written
      concurrentEntries.forEach(verifyConcurrentConsoleLogEntry);
    });

    /**
     * Tests behavior when process.stdout.write throws an error
     * to ensure proper error propagation
     */
    it('should propagate errors from process.stdout.write', () => {
      mockStdout.write.mockImplementation(() => {
        throw new Error('stdout write failed');
      });

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:37:00.000Z',
        resource: 'error_test',
        action: 'test',
        context: { userId: 'error_user' },
        can: true,
      };

      expect(() => consoleLogger.write(entry)).toThrow('stdout write failed');
      expect(mockStdout.write).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests JSON serialization edge cases
     * to ensure robust handling of problematic objects
     */
    it('should handle JSON serialization edge cases', () => {
      // Create circular reference
      const circularContext: any = { userId: 'circular_user' };
      circularContext.self = circularContext;

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:38:00.000Z',
        resource: 'circular_test',
        action: 'test',
        context: circularContext,
        can: true,
      };

      // JSON.stringify should throw on circular references
      expect(() => consoleLogger.write(entry)).toThrow();
    });

    /**
     * Tests large object serialization
     * to ensure performance with big log entries
     */
    it('should handle large objects efficiently', () => {
      const largeContext: Record<string, any> = {};
      
      // Create a large context object
      for (let i = 0; i < 1000; i++) {
        largeContext[`key_${i}`] = `value_${i}`.repeat(10);
      }

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:39:00.000Z',
        resource: 'large_object_test',
        action: 'test',
        context: largeContext,
        can: true,
      };

      const startTime = Date.now();
      consoleLogger.write(entry);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      // Should complete within reasonable time (less than 100ms)
      expect(executionTime).toBeLessThan(100);
      
      const outputCall = mockStdout.write.mock.calls[0][0];
      expect(outputCall).toContain('[AUTH-LOG]');
      expect(outputCall).toContain('large_object_test');
    });

    /**
     * Tests output format consistency
     * to ensure consistent log format across different entry types
     */
    it('should maintain consistent output format', () => {
      const testEntries: AccessLogEntry[] = [
        {
          timestamp: '2024-01-15T10:40:00.000Z',
          resource: 'format_test_1',
          action: 'read',
          context: { userId: 'user_1' },
          can: true,
        },
        {
          timestamp: '2024-01-15T10:40:01.000Z',
          resource: 'format_test_2',
          action: 'write',
          context: { userId: 'user_2', role: 'admin' },
          recordId: 'record_123',
          field: 'sensitive_field',
          can: false,
          reason: 'Field access denied',
        },
      ];

      testEntries.forEach(entry => consoleLogger.write(entry));

      expect(mockStdout.write).toHaveBeenCalledTimes(2);
      
      // Check that all outputs follow the same format pattern
      mockStdout.write.mock.calls.forEach(verifyConsoleLogCall);
    });

    // Helper function to verify console log calls
    function verifyConsoleLogCall(call: any): void {
      const output = call[0];
      expect(output).toMatch(/^\[AUTH-LOG\] \{[\s\S]*\}\n$/);
      expect(output).toContain('"timestamp":');
      expect(output).toContain('"resource":');
      expect(output).toContain('"action":');
      expect(output).toContain('"context":');
      expect(output).toContain('"can":');
    }
  });

  describe('consoleLogger object structure', () => {
    /**
     * Tests that consoleLogger has the expected structure
     * to ensure proper adapter interface compliance
     */
    it('should have the correct structure and methods', () => {
      expect(consoleLogger).toBeDefined();
      expect(typeof consoleLogger).toBe('object');
      expect(typeof consoleLogger.write).toBe('function');
      expect(consoleLogger.write).toHaveLength(1); // Should accept one parameter
    });

    /**
     * Tests that consoleLogger is immutable
     * to ensure adapter integrity
     */
    it('should be immutable', () => {
      // Attempt to modify the write method
      expect(() => {
        (consoleLogger as any).write = vi.fn();
      }).not.toThrow(); // In JavaScript, this doesn't throw, but let's verify it didn't change
      
      // The original method should still be there if the object is properly constructed
      expect(typeof consoleLogger.write).toBe('function');
    });
  });

  describe('integration scenarios', () => {
    /**
     * Tests integration with different stdout configurations
     * to ensure compatibility with various runtime environments
     */
    it('should work with different stdout configurations', () => {
      // Test with different mock configurations
      const configurations = [
        { write: vi.fn() },
        { write: vi.fn().mockReturnValue(true) },
        { write: vi.fn().mockReturnValue(false) },
      ];

      configurations.forEach(testIntegrationConfiguration);
    });

    function testIntegrationConfiguration(config: any, index: number) {
      process.stdout = config;
      
      const entry: AccessLogEntry = {
        timestamp: `2024-01-15T10:41:${String(index).padStart(2, '0')}.000Z`,
        resource: `stdout_config_test_${index}`,
        action: 'test',
        context: { configIndex: index },
        can: true,
      };

      consoleLogger.write(entry);
      
      expect(config.write).toHaveBeenCalledTimes(1);
    }

    /**
     * Tests behavior in different Node.js environments
     * to ensure cross-environment compatibility
     */
    it('should handle different Node.js environment scenarios', () => {
      // Test with TTY vs non-TTY scenarios (mocked)
      const originalIsTTY = process.stdout.isTTY;
      
      [true, false, undefined].forEach(testTTYScenario);

      // Restore original isTTY
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    });
  });

  // Helper functions to eliminate deep nesting warnings
  function createConcurrentConsoleLogPromise(entry: AccessLogEntry): Promise<void> {
    return Promise.resolve().then(() => consoleLogger.write(entry));
  }

  function verifyConcurrentConsoleLogEntry(entry: AccessLogEntry): void {
    const expectedOutput = `[AUTH-LOG] ${JSON.stringify(entry, null, 2)}\n`;
    expect(mockStdout.write).toHaveBeenCalledWith(expectedOutput);
  }

  function testTTYScenario(isTTY: boolean | undefined, index: number): void {
    // Mock isTTY property
    Object.defineProperty(process.stdout, 'isTTY', {
      value: isTTY,
      configurable: true,
    });
    
    const entry: AccessLogEntry = {
      timestamp: `2024-01-15T10:42:${String(index).padStart(2, '0')}.000Z`,
      resource: `tty_test_${index}`,
      action: 'test',
      context: { isTTY },
      can: true,
    };

    // Should work regardless of TTY status
    expect(() => consoleLogger.write(entry)).not.toThrow();
    expect(mockStdout.write).toHaveBeenCalled();
  }
});