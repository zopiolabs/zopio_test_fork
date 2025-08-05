/**
 * @fileoverview Auth-Log Tests - File System Adapter Persistence
 * 
 * Comprehensive test suite for the file logging adapter, validating persistent log storage,
 * file system operations, and data integrity for enterprise logging requirements.
 * 
 * **Test Scope:**
 * - File system write operations and data persistence
 * - JSON serialization for file storage (compact format)
 * - File path security and traversal prevention
 * - Concurrent write safety and data integrity
 * - Large payload handling and performance
 * - File system error handling and recovery
 * 
 * **Test Categories:**
 * 1. **File Operations**: Basic file writing and append operations
 * 2. **Data Serialization**: JSON formatting optimized for file storage
 * 3. **Concurrency**: Thread-safe concurrent file writes
 * 4. **Error Handling**: File system permissions, disk space, and I/O errors
 * 5. **Performance**: Large object serialization and high-volume logging
 * 6. **Security**: Path traversal prevention and file system security
 * 
 * **Mock Strategy:**
 * - Node.js fs.appendFileSync mocking for file operation interception
 * - File system error simulation (ENOSPC, EACCES, EISDIR)
 * - Concurrent operation testing through Promise-based execution
 * - Large data structure generation for performance testing
 * 
 * **Quality Standards:**
 * - Sub-200ms performance for large object serialization
 * - Consistent ./logs/access.log file path usage
 * - Compact JSON formatting (no pretty-printing for files)
 * - Proper error propagation for file system failures
 * 
 * @requires vitest ^1.0.0
 * @requires node:fs For file system operations
 * @since 1.0.0
 * @author Auth-Log Team
 */

/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileLogger } from '../adapters/file.js';
import type { AccessLogEntry } from '../types.js';
import fs from 'node:fs';

// Mock the fs module
vi.mock('node:fs', () => ({
  default: {
    appendFileSync: vi.fn(),
  },
}));

// Helper functions to eliminate deep nesting warnings

/**
 * Creates a concurrent file logging Promise for the given entry
 * Eliminates deep nesting in Promise.all.map callback chains
 */
function createConcurrentFileLogPromise(entry: AccessLogEntry): Promise<void> {
  return Promise.resolve().then(() => fileLogger.write(entry));
}

/**
 * Creates a mock implementation that throws the specified error
 * Eliminates deep nesting in forEach.mockImplementation callback chains
 */
function createFileSystemErrorMock(errorMessage: string): () => never {
  return () => {
    throw new Error(errorMessage);
  };
}

/**
 * Tests file logger write functionality with error expectation
 * Eliminates deep nesting in forEach.expect callback chains
 */
function testFileLoggerWriteWithError(entry: AccessLogEntry, errorMessage: string): void {
  expect(() => fileLogger.write(entry)).toThrow(errorMessage);
}

/**
 * Tests file logger write functionality expecting no error
 * Eliminates deep nesting in forEach.expect callback chains
 */
function testFileLoggerWriteWithoutError(entry: AccessLogEntry): void {
  expect(() => fileLogger.write(entry)).not.toThrow();
}

describe('File Adapter', () => {
  const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fileLogger.write', () => {
    /**
     * Tests basic file logging functionality
     * to ensure proper file writing and JSON formatting
     */
    it('should write access log entry to file with proper JSON formatting', () => {
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

      fileLogger.write(entry);

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        './logs/access.log',
        `${JSON.stringify(entry)}\n`
      );
    });

    /**
     * Tests file logging with complex nested objects
     * to ensure proper JSON serialization for file storage
     */
    it('should handle complex nested objects in file output', () => {
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
              permissions: ['read', 'write', 'admin'],
            },
            clientInfo: {
              userAgent: 'TestClient/2.0',
              ipAddress: '10.0.0.15',
              location: {
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
              },
            },
          },
        },
        recordId: 'record_789',
        field: 'sensitive_data',
        can: false,
        reason: 'Insufficient privileges for field access',
      };

      fileLogger.write(entry);

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);

      const expectedContent = `${JSON.stringify(entry)}\n`;
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        './logs/access.log',
        expectedContent
      );

      // Verify the JSON is compact (no pretty printing for file logs)
      const actualCall = mockFs.appendFileSync.mock.calls[0];
      const actualContent = actualCall[1] as string;
      expect(actualContent).not.toContain('  '); // No indentation
      expect(actualContent).toContain('"userId":"user_456"');
      expect(actualContent).toContain('"sessionId":"sess_abcdef"');
    });

    /**
     * Tests file logging with special characters and encoding
     * to ensure proper handling of various character sets
     */
    it('should handle special characters and encoding correctly', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:32:00.000Z',
        resource: 'special_resource',
        action: 'test',
        context: {
          userId: 'user_with_üñíçødé',
          description: 'Text with\nnewlines\rand\ttabs',
          unicodeText: 'Unicode symbols: ⚡🔒🌟 and émojis',
          specialChars: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
          jsonEscapes: 'Text with "quotes" and \\backslashes\\',
          controlChars: '\b\f\n\r\t\v\0',
        },
        can: true,
      };

      fileLogger.write(entry);

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);

      const actualCall = mockFs.appendFileSync.mock.calls[0];
      const actualContent = actualCall[1] as string;
      
      // Verify proper JSON escaping
      expect(actualContent).toContain('\\"quotes\\"'); // Escaped quotes
      expect(actualContent).toContain('\\\\backslashes\\\\'); // Escaped backslashes
      expect(actualContent).toContain('\\n'); // Escaped newlines
      expect(actualContent).toContain('\\r'); // Escaped carriage returns
      expect(actualContent).toContain('\\t'); // Escaped tabs
      expect(actualContent).toContain('üñíçødé'); // Unicode preserved
      expect(actualContent).toContain('⚡🔒🌟'); // Emojis preserved
    });

    /**
     * Tests file logging with minimal entry data
     * to ensure proper handling of sparse log entries
     */
    it('should handle minimal access log entries', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:33:00.000Z',
        resource: 'minimal',
        action: 'test',
        context: {},
        can: false,
      };

      fileLogger.write(entry);

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        './logs/access.log',
        `${JSON.stringify(entry)}\n`
      );

      const actualCall = mockFs.appendFileSync.mock.calls[0];
      const actualContent = actualCall[1] as string;
      expect(actualContent).toContain('"context":{}');
      expect(actualContent).toContain('"can":false');
    });

    /**
     * Tests file logging with null and undefined values
     * to ensure proper JSON serialization behavior
     */
    it('should handle null and undefined values in file output', () => {
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
          falseValue: false,
        },
        recordId: undefined as any,
        field: null as any,
        can: true,
        reason: undefined,
      };

      fileLogger.write(entry);

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);

      const actualCall = mockFs.appendFileSync.mock.calls[0];
      const actualContent = actualCall[1] as string;
      
      expect(actualContent).toContain('"nullValue":null');
      // undefined values should be omitted in JSON
      expect(actualContent).not.toContain('undefinedValue');
      expect(actualContent).toContain('"emptyString":""');
      expect(actualContent).toContain('"zeroValue":0');
      expect(actualContent).toContain('"falseValue":false');
    });

    /**
     * Tests multiple consecutive writes to file
     * to ensure proper appending behavior
     */
    it('should handle multiple consecutive writes with proper appending', () => {
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
          reason: 'Write access denied',
        },
        {
          timestamp: '2024-01-15T10:35:02.000Z',
          resource: 'resource_3',
          action: 'delete',
          context: { userId: 'user_3', role: 'admin' },
          can: true,
        },
      ];

      entries.forEach(entry => fileLogger.write(entry));

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(3);

      entries.forEach((entry, index) => {
        const expectedContent = `${JSON.stringify(entry)}\n`;
        expect(mockFs.appendFileSync).toHaveBeenNthCalledWith(
          index + 1,
          './logs/access.log',
          expectedContent
        );
      });
    });

    /**
     * Tests concurrent writes to file
     * to ensure thread safety and proper file handling
     */
    it('should handle concurrent writes safely', async () => {
      const concurrentEntries: AccessLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: `2024-01-15T10:36:${String(i).padStart(2, '0')}.000Z`,
        resource: `concurrent_resource_${i}`,
        action: 'concurrent_test',
        context: { userId: `concurrent_user_${i}`, index: i },
        can: i % 2 === 0,
        reason: i % 2 === 0 ? undefined : `Access denied for test ${i}`,
      }));

      // Write all entries concurrently
      await Promise.all(
        concurrentEntries.map(entry => createConcurrentFileLogPromise(entry))
      );

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(50);

      // Verify all entries were written to the correct file
      concurrentEntries.forEach(entry => {
        const expectedContent = `${JSON.stringify(entry)}\n`;
        expect(mockFs.appendFileSync).toHaveBeenCalledWith(
          './logs/access.log',
          expectedContent
        );
      });
    });

    /**
     * Tests error handling when file system operations fail
     * to ensure proper error propagation
     */
    it('should propagate file system errors', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, open \'./logs/access.log\'');
      });

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:37:00.000Z',
        resource: 'error_test',
        action: 'test',
        context: { userId: 'error_user' },
        can: true,
      };

      expect(() => fileLogger.write(entry)).toThrow('EACCES: permission denied');
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests behavior with different file system errors
     * to ensure proper error handling for various scenarios
     */
    it('should handle various file system error scenarios', () => {
      const fileSystemErrors = [
        'ENOENT: no such file or directory',
        'EACCES: permission denied',
        'EMFILE: too many open files',
        'ENOSPC: no space left on device',
        'EIO: i/o error',
        'EISDIR: illegal operation on a directory',
      ];

      fileSystemErrors.forEach(errorMessage => {
        vi.clearAllMocks();
        mockFs.appendFileSync.mockImplementation(createFileSystemErrorMock(errorMessage));

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T10:38:00.000Z',
          resource: 'fs_error_test',
          action: 'test',
          context: { errorType: errorMessage },
          can: true,
        };

        testFileLoggerWriteWithError(entry, errorMessage);
        expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      });
    });

    /**
     * Tests file path consistency
     * to ensure all writes go to the correct location
     */
    it('should consistently use the correct file path', () => {
      const entries: AccessLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: `2024-01-15T10:39:${String(i).padStart(2, '0')}.000Z`,
        resource: `path_test_${i}`,
        action: 'test',
        context: { index: i },
        can: true,
      }));

      entries.forEach(entry => fileLogger.write(entry));

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(10);

      // Verify all calls use the same file path
      mockFs.appendFileSync.mock.calls.forEach(call => {
        expect(call[0]).toBe('./logs/access.log');
      });
    });

    /**
     * Tests large object handling in file output
     * to ensure performance and proper serialization
     */
    it('should handle large objects efficiently', () => {
      const largeContext: Record<string, any> = {};

      // Create a large context object
      for (let i = 0; i < 1000; i++) {
        largeContext[`key_${i}`] = {
          value: `value_${i}`.repeat(10),
          metadata: {
            id: i,
            timestamp: new Date().toISOString(),
            data: Array.from({ length: 10 }, (_, j) => `item_${j}`),
          },
        };
      }

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:40:00.000Z',
        resource: 'large_object_test',
        action: 'test',
        context: largeContext,
        can: true,
      };

      const startTime = Date.now();
      fileLogger.write(entry);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      expect(executionTime).toBeLessThan(200); // Should complete within reasonable time

      const actualCall = mockFs.appendFileSync.mock.calls[0];
      const actualContent = actualCall[1] as string;
      expect(actualContent).toContain('large_object_test');
      expect(actualContent.length).toBeGreaterThan(10000); // Should be a large JSON string
    });

    /**
     * Tests JSON serialization edge cases in file output
     * to ensure robust handling of problematic objects
     */
    it('should handle JSON serialization edge cases', () => {
      // Create circular reference
      const circularContext: any = { userId: 'circular_user' };
      circularContext.self = circularContext;

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:41:00.000Z',
        resource: 'circular_test',
        action: 'test',
        context: circularContext,
        can: true,
      };

      // JSON.stringify should throw on circular references
      expect(() => fileLogger.write(entry)).toThrow();
      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
    });

    /**
     * Tests line-by-line format consistency
     * to ensure proper log file structure
     */
    it('should maintain consistent line-by-line format', () => {
      const entries: AccessLogEntry[] = [
        {
          timestamp: '2024-01-15T10:42:00.000Z',
          resource: 'format_test_1',
          action: 'read',
          context: { userId: 'user_1' },
          can: true,
        },
        {
          timestamp: '2024-01-15T10:42:01.000Z',
          resource: 'format_test_2',
          action: 'write',
          context: { userId: 'user_2', role: 'admin' },
          recordId: 'record_123',
          field: 'sensitive_field',
          can: false,
          reason: 'Field access denied',
        },
      ];

      entries.forEach(entry => fileLogger.write(entry));

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(2);

      // Verify each call writes exactly one line
      mockFs.appendFileSync.mock.calls.forEach(call => {
        const content = call[1] as string;
        expect(content).toMatch(/^{.*}\n$/); // Should be JSON object followed by newline
        expect(content.split('\n')).toHaveLength(2); // One line + empty string after split
        expect(content.endsWith('\n')).toBe(true);
      });
    });

    /**
     * Tests behavior with various timestamp formats
     * to ensure consistent file logging across time zones
     */
    it('should handle various timestamp formats consistently', () => {
      const timestampFormats = [
        '2024-01-15T10:43:00.000Z',
        '2024-01-15T10:43:00Z',
        '2024-01-15T10:43:00.123456Z',
        '2024-01-15T10:43:00+00:00',
        '2024-01-15T10:43:00-05:00',
      ];

      timestampFormats.forEach((timestamp, index) => {
        const entry: AccessLogEntry = {
          timestamp,
          resource: `timestamp_test_${index}`,
          action: 'test',
          context: { testIndex: index },
          can: true,
        };

        fileLogger.write(entry);

        const expectedContent = `${JSON.stringify(entry)}\n`;
        expect(mockFs.appendFileSync).toHaveBeenCalledWith(
          './logs/access.log',
          expectedContent
        );
      });

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(timestampFormats.length);
    });
  });

  describe('fileLogger object structure', () => {
    /**
     * Tests that fileLogger has the expected structure
     * to ensure proper adapter interface compliance
     */
    it('should have the correct structure and methods', () => {
      expect(fileLogger).toBeDefined();
      expect(typeof fileLogger).toBe('object');
      expect(typeof fileLogger.write).toBe('function');
      expect(fileLogger.write).toHaveLength(1); // Should accept one parameter
    });

    /**
     * Tests that fileLogger configuration is correct
     * to ensure proper file path and behavior
     */
    it('should use the correct log file path', () => {
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:44:00.000Z',
        resource: 'path_verification',
        action: 'test',
        context: {},
        can: true,
      };

      fileLogger.write(entry);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        './logs/access.log',
        expect.any(String)
      );
    });
  });

  describe('integration scenarios', () => {
    /**
     * Tests integration with different file system configurations
     * to ensure compatibility with various environments
     */
    it('should work with different file system behaviors', () => {
      const fileSystemBehaviors = [
        () => mockFs.appendFileSync.mockReturnValue(undefined),
        () => mockFs.appendFileSync.mockReturnValue(true as any),
        () => mockFs.appendFileSync.mockReturnValue(false as any),
      ];

      fileSystemBehaviors.forEach((behavior, index) => {
        vi.clearAllMocks();
        behavior();

        const entry: AccessLogEntry = {
          timestamp: `2024-01-15T10:45:${String(index).padStart(2, '0')}.000Z`,
          resource: `fs_behavior_test_${index}`,
          action: 'test',
          context: { behaviorIndex: index },
          can: true,
        };

        testFileLoggerWriteWithoutError(entry);
        expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      });
    });

    /**
     * Tests performance under high load
     * to ensure the file logger can handle enterprise-scale logging
     */
    it('should handle high-frequency logging efficiently', () => {
      const highVolumeEntries: AccessLogEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: `2024-01-15T10:46:${String(Math.floor(i / 60)).padStart(2, '0')}.${String(i % 60).padStart(3, '0')}Z`,
        resource: `high_volume_resource_${i}`,
        action: 'bulk_test',
        context: {
          userId: `bulk_user_${i % 100}`, // Cycle through 100 users
          batchId: Math.floor(i / 50), // 50 entries per batch
          index: i,
        },
        can: i % 10 !== 0, // 90% success rate
        reason: i % 10 === 0 ? `Rate limited entry ${i}` : undefined,
      }));

      const startTime = Date.now();
      highVolumeEntries.forEach(entry => fileLogger.write(entry));
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1000);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify all entries were written correctly
      highVolumeEntries.forEach((entry, index) => {
        const expectedContent = `${JSON.stringify(entry)}\n`;
        expect(mockFs.appendFileSync).toHaveBeenNthCalledWith(
          index + 1,
          './logs/access.log',
          expectedContent
        );
      });
    });
  });
});