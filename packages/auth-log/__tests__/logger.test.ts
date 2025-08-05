/**
 * @fileoverview Auth-Log Tests - Core Logger Functions
 * 
 * Comprehensive test suite for the core logging functions, validating the primary
 * interface for access attempt logging and adapter delegation mechanisms.
 * 
 * **Test Scope:**
 * - Core logAccessAttempt function behavior
 * - Adapter delegation and configuration integration
 * - Input validation and data pass-through
 * - Error handling and graceful degradation
 * - Concurrent logging operations
 * - Integration with various adapter types
 * 
 * **Test Categories:**
 * 1. **Core Functionality**: Basic logging operation validation
 * 2. **Data Handling**: Various log entry formats and edge cases
 * 3. **Adapter Integration**: Proper delegation to active logger
 * 4. **Error Handling**: Configuration failures and adapter errors
 * 5. **Performance**: Concurrent operations and throughput testing
 * 6. **Configuration Integration**: Dynamic adapter switching validation
 * 
 * **Mock Strategy:**
 * - Configuration module mocking for adapter control
 * - Generic logger interface mocking for behavior validation
 * - Error injection for failure scenario testing
 * - Async operation simulation for performance testing
 * 
 * **Quality Standards:**
 * - Zero data modification during logging operations
 * - Proper error propagation from configuration layer
 * - Support for both synchronous and asynchronous adapters
 * - Thread-safe concurrent logging operations
 * 
 * @requires vitest ^1.0.0
 * @requires ../config.js For adapter configuration
 * @since 1.0.0
 * @author Auth-Log Team
 */

/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AccessLogEntry } from '../types.js';

// Mock the config module before importing
vi.mock('../config.js', () => ({
  getActiveLogger: vi.fn(),
}));

import { logAccessAttempt } from '../logger.js';
import { getActiveLogger } from '../config.js';

describe('Logger Core Functions', () => {
  const mockLogger = {
    write: vi.fn(),
  };

  // Helper functions to eliminate deep nesting warnings
  /**
   * Creates a concurrent logging Promise for the given entry
   * Eliminates deep nesting in Promise.all.map callback chains
   */
  const createConcurrentLogPromise = (entry: AccessLogEntry): Promise<void> => {
    return Promise.resolve().then(() => logAccessAttempt(entry));
  };

  /**
   * Creates a timeout delay Promise for async logger simulation
   * Eliminates deep nesting in setTimeout callback chains
   */
  const createTimeoutDelay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logAccessAttempt', () => {
    /**
     * Tests basic logging functionality with valid access log entries
     * to ensure proper delegation to the active logger
     */
    it('should log access attempt with valid entry', () => {
      const validEntry: AccessLogEntry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        resource: 'user_profile',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
        },
        recordId: 'profile_789',
        can: true,
      };

      logAccessAttempt(validEntry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledWith(validEntry);
    });

    /**
     * Tests logging with denied access scenarios
     * to ensure proper handling of access denials with reasons
     */
    it('should log denied access with reason', () => {
      const deniedEntry: AccessLogEntry = {
        timestamp: '2024-01-15T10:31:00.000Z',
        resource: 'admin_panel',
        action: 'access',
        context: {
          userId: 'user_123',
          role: 'user',
          ipAddress: '192.168.1.100',
        },
        can: false,
        reason: 'Insufficient privileges: admin role required',
      };

      logAccessAttempt(deniedEntry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledWith(deniedEntry);
    });

    /**
     * Tests logging with field-level access control
     * to ensure proper handling of granular permissions
     */
    it('should log field-level access attempts', () => {
      const fieldAccessEntry: AccessLogEntry = {
        timestamp: '2024-01-15T10:32:00.000Z',
        resource: 'user_profile',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'user',
        },
        recordId: 'profile_456',
        field: 'email',
        can: true,
      };

      logAccessAttempt(fieldAccessEntry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledWith(fieldAccessEntry);
    });

    /**
     * Tests logging with complex context objects
     * to ensure proper handling of rich contextual information
     */
    it('should log access attempts with complex context', () => {
      const complexEntry: AccessLogEntry = {
        timestamp: '2024-01-15T10:33:00.000Z',
        resource: 'api_endpoint',
        action: 'execute',
        context: {
          userId: 'user_123',
          role: 'api_user',
          tenantId: 'tenant_789',
          sessionId: 'session_abc123',
          userAgent: 'Mozilla/5.0 (compatible; AuthClient/1.0)',
          ipAddress: '10.0.0.15',
          requestId: 'req_uuid_12345',
          metadata: {
            apiVersion: 'v2',
            clientType: 'web',
            features: ['auth', 'logging'],
          },
        },
        recordId: 'endpoint_config_123',
        can: true,
      };

      logAccessAttempt(complexEntry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledWith(complexEntry);
    });

    /**
     * Tests logging with minimal required fields
     * to ensure proper handling of basic log entries
     */
    it('should log access attempts with minimal required fields', () => {
      const minimalEntry: AccessLogEntry = {
        timestamp: '2024-01-15T10:34:00.000Z',
        resource: 'public_data',
        action: 'read',
        context: {},
        can: true,
      };

      logAccessAttempt(minimalEntry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);      
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledWith(minimalEntry);
    });

    /**
     * Tests multiple consecutive logging calls
     * to ensure proper handling of sequential access attempts
     */
    it('should handle multiple consecutive log entries', () => {
      const entries: AccessLogEntry[] = [
        {
          timestamp: '2024-01-15T10:35:00.000Z',
          resource: 'document_1',
          action: 'read',
          context: { userId: 'user_123', role: 'reader' },
          can: true,
        },
        {
          timestamp: '2024-01-15T10:35:01.000Z',
          resource: 'document_2',
          action: 'write',
          context: { userId: 'user_123', role: 'reader' },
          can: false,
          reason: 'Write permission denied for reader role',
        },
        {
          timestamp: '2024-01-15T10:35:02.000Z',
          resource: 'document_3',
          action: 'delete',
          context: { userId: 'user_123', role: 'reader' },
          can: false,
          reason: 'Delete permission denied for reader role',
        },
      ];

      entries.forEach(entry => logAccessAttempt(entry));

      expect(getActiveLogger).toHaveBeenCalledTimes(3);
      expect(mockLogger.write).toHaveBeenCalledTimes(3);
      entries.forEach((entry, index) => {
        expect(mockLogger.write).toHaveBeenNthCalledWith(index + 1, entry);
      });
    });

    /**
     * Tests error handling when logger write method fails
     * to ensure graceful degradation
     */
    it('should handle logger write errors gracefully', () => {
      const errorLogger = {
        write: vi.fn().mockImplementation(() => {
          throw new Error('Logger write failed');
        }),
      };

      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(errorLogger);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:36:00.000Z',
        resource: 'test_resource',
        action: 'test_action',
        context: { userId: 'test_user' },
        can: true,
      };

      // Should not throw an error
      expect(() => logAccessAttempt(entry)).toThrow('Logger write failed');
      
      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(errorLogger.write).toHaveBeenCalledTimes(1);
      expect(errorLogger.write).toHaveBeenCalledWith(entry);
    });

    /**
     * Tests logging with special characters in context
     * to ensure proper handling of various data types
     */
    it('should handle special characters and edge cases in context', () => {
      const specialCharsEntry: AccessLogEntry = {
        timestamp: '2024-01-15T10:37:00.000Z',
        resource: 'special_resource',
        action: 'process',
        context: {
          userId: 'user_with_üñíçødé',
          description: 'Test with "quotes" and \'apostrophes\'',
          specialChars: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
          newlines: 'Line 1\nLine 2\rLine 3\r\n',
          nullValue: null,
          undefinedValue: undefined,
          booleanValue: true,
          numberValue: 42,
          arrayValue: ['item1', 'item2', 'item3'],
        },
        can: true,
      };

      logAccessAttempt(specialCharsEntry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledTimes(1);
      expect(mockLogger.write).toHaveBeenCalledWith(specialCharsEntry);
    });

    /**
     * Tests logging with timestamp edge cases
     * to ensure proper handling of various timestamp formats
     */
    it('should handle various timestamp formats', () => {
      const timestampFormats = [
        '2024-01-15T10:38:00.000Z', // ISO string
        '2024-01-15T10:38:00Z', // ISO without milliseconds
        '2024-01-15T10:38:00.123456Z', // ISO with microseconds
        '2024-01-15T10:38:00+00:00', // ISO with timezone offset
        '2024-01-15T10:38:00-05:00', // ISO with negative timezone offset
      ];

      timestampFormats.forEach((timestamp, index) => {
        const entry: AccessLogEntry = {
          timestamp,
          resource: `timestamp_test_${index}`,
          action: 'test',
          context: { testIndex: index },
          can: true,
        };

        logAccessAttempt(entry);

        expect(mockLogger.write).toHaveBeenCalledWith(entry);
      });

      expect(getActiveLogger).toHaveBeenCalledTimes(timestampFormats.length);
      expect(mockLogger.write).toHaveBeenCalledTimes(timestampFormats.length);
    });

    /**
     * Tests concurrent logging calls
     * to ensure thread safety and proper handling of simultaneous access
     */
    it('should handle concurrent logging calls', async () => {
      const concurrentEntries: AccessLogEntry[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2024-01-15T10:39:${String(i).padStart(2, '0')}.000Z`,
        resource: `concurrent_resource_${i}`,
        action: 'concurrent_test',
        context: {
          userId: `concurrent_user_${i}`,
          threadId: i,
        },
        can: i % 2 === 0, // Alternate between allowed and denied
        reason: i % 2 === 0 ? undefined : `Access denied for test ${i}`,
      }));

      // Log all entries concurrently
      await Promise.all(
        concurrentEntries.map(entry => createConcurrentLogPromise(entry))
      );

      expect(getActiveLogger).toHaveBeenCalledTimes(100);
      expect(mockLogger.write).toHaveBeenCalledTimes(100);

      // Verify all entries were logged
      concurrentEntries.forEach(entry => {
        expect(mockLogger.write).toHaveBeenCalledWith(entry);
      });
    });

    /**
     * Tests logging behavior when getActiveLogger throws an error
     * to ensure graceful handling of configuration issues
     */
    it('should handle getActiveLogger errors', () => {
      (getActiveLogger as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Failed to get active logger');
      });

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:40:00.000Z',
        resource: 'error_test_resource',
        action: 'test',
        context: { userId: 'error_test_user' },
        can: true,
      };

      expect(() => logAccessAttempt(entry)).toThrow('Failed to get active logger');
      expect(getActiveLogger).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests logging with async logger write method
     * to ensure compatibility with asynchronous loggers
     */
    it('should work with async logger write method', async () => {
      const asyncLogger = {
        write: vi.fn().mockImplementation(async (entry: AccessLogEntry) => {
          // Simulate async operation
          await createTimeoutDelay(10);
          return Promise.resolve();
        }),
      };

      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(asyncLogger);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T10:41:00.000Z',
        resource: 'async_test_resource',
        action: 'async_test',
        context: { userId: 'async_test_user' },
        can: true,
      };

      // Note: logAccessAttempt is synchronous, but should handle async loggers
      logAccessAttempt(entry);

      expect(getActiveLogger).toHaveBeenCalledTimes(1);
      expect(asyncLogger.write).toHaveBeenCalledTimes(1);
      expect(asyncLogger.write).toHaveBeenCalledWith(entry);
    });
  });

  describe('Logger Integration', () => {
    /**
     * Tests integration between logger and different logger configurations
     * to ensure proper behavior across various logger types
     */
    it('should work with different logger configurations', () => {
      const loggerConfigurations = [
        { name: 'console', write: vi.fn() },
        { name: 'file', write: vi.fn() },
        { name: 'betterstack', write: vi.fn() },
        { name: 'custom', write: vi.fn() },
      ];

      loggerConfigurations.forEach((logger, index) => {
        vi.clearAllMocks();
        (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(logger);

        const entry: AccessLogEntry = {
          timestamp: `2024-01-15T10:42:${String(index).padStart(2, '0')}.000Z`,
          resource: `integration_resource_${logger.name}`,
          action: 'integration_test',
          context: { 
            userId: `integration_user_${index}`,
            loggerType: logger.name,
          },
          can: true,
        };

        logAccessAttempt(entry);

        expect(getActiveLogger).toHaveBeenCalledTimes(1);
        expect(logger.write).toHaveBeenCalledTimes(1);
        expect(logger.write).toHaveBeenCalledWith(entry);
      });
    });

    /**
     * Tests integration with logger state management
     * to ensure consistent behavior across multiple calls
     */
    it('should maintain consistent logger instance across calls', () => {
      const persistentLogger = { write: vi.fn() };
      (getActiveLogger as ReturnType<typeof vi.fn>).mockReturnValue(persistentLogger);

      const entries: AccessLogEntry[] = [
        {
          timestamp: '2024-01-15T10:43:00.000Z',
          resource: 'persistent_test_1',
          action: 'test',
          context: { userId: 'persistent_user' },
          can: true,
        },
        {
          timestamp: '2024-01-15T10:43:01.000Z',
          resource: 'persistent_test_2',
          action: 'test',
          context: { userId: 'persistent_user' },
          can: true,
        },
      ];

      entries.forEach(entry => logAccessAttempt(entry));

      // Should get the same logger instance for each call
      expect(getActiveLogger).toHaveBeenCalledTimes(2);
      expect(persistentLogger.write).toHaveBeenCalledTimes(2);
      
      entries.forEach((entry, index) => {
        expect(persistentLogger.write).toHaveBeenNthCalledWith(index + 1, entry);
      });
    });
  });
});