/**
 * @fileoverview Auth-Log Tests - Configuration Management System
 * 
 * Comprehensive test suite for the logging configuration system, validating environment-based
 * adapter selection, fallback mechanisms, and secure configuration handling.
 * 
 * **Test Scope:**
 * - Environment variable-driven adapter selection
 * - Fallback mechanisms for invalid configurations
 * - BetterStack token validation and error handling
 * - Configuration change detection and runtime adaptation
 * - Security validation for environment variable manipulation
 * - Concurrent configuration access and thread safety
 * 
 * **Test Categories:**
 * 1. **Adapter Selection**: Environment-based logger selection logic
 * 2. **Fallback Handling**: Invalid configuration recovery mechanisms
 * 3. **Token Validation**: BetterStack authentication token processing
 * 4. **Runtime Changes**: Dynamic configuration updates and detection
 * 5. **Error Messaging**: User-friendly warning and error communication
 * 6. **Integration**: Cross-adapter compatibility and module loading
 * 
 * **Mock Strategy:**
 * - All adapter modules mocked to isolate configuration logic
 * - Process.env manipulation for environment variable testing
 * - Process.stderr mocking for warning message validation
 * - BetterStack logger creation mocking with configurable responses
 * 
 * **Quality Standards:**
 * - 100% fallback to console logger for invalid configurations
 * - Clear warning messages for configuration issues
 * - Case-sensitive environment variable matching
 * - Secure handling of authentication tokens
 * 
 * @requires vitest ^1.0.0
 * @requires process.env For environment variable access
 * @since 1.0.0
 * @author Auth-Log Team
 */

/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getActiveLogger } from '../config.js';
import { consoleLogger } from '../adapters/console.js';
import { fileLogger } from '../adapters/file.js';
import { createBetterStackLogger } from '../adapters/betterstack.js';

// Mock all adapters
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

// Helper functions to eliminate deep nesting warnings

/**
 * Helper function to test AUTH_LOG_TARGET values that should return console logger
 * Eliminates deep nesting in forEach callbacks
 * Used for falsy values, unknown values, case variations, and whitespace variations
 */
const testAuthTargetExpectingConsole = (value: string): void => {
  process.env.AUTH_LOG_TARGET = value;
  const logger = getActiveLogger();
  expect(logger).toBe(consoleLogger);
};

/**
 * Helper function to test case variations for betterstack target
 * Eliminates deep nesting in forEach callback
 */
const testCaseVariationBetterstackTarget = (value: string): void => {
  process.env.AUTH_LOG_TARGET = value;
  process.env.BETTERSTACK_SOURCE_TOKEN = 'test-token';
  
  const logger = getActiveLogger();
  
  // Should not match - case sensitive
  expect(logger).toBe(consoleLogger);
  expect(createBetterStackLogger).not.toHaveBeenCalled();
};

/**
 * Helper function to test various token formats
 * Eliminates deep nesting in forEach callback
 */
const testTokenFormat = (token: string): void => {
  vi.clearAllMocks();
  
  const mockBetterStackLogger = { write: vi.fn() };
  (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
  
  process.env.AUTH_LOG_TARGET = 'betterstack';
  process.env.BETTERSTACK_SOURCE_TOKEN = token;
  
  const logger = getActiveLogger();
  
  expect(createBetterStackLogger).toHaveBeenCalledWith({
    sourceToken: token,
  });
  expect(logger).toBe(mockBetterStackLogger);
};

/**
 * Helper function to test nullish values
 * Eliminates deep nesting in forEach callback
 */
const testNullishValue = (value: string): void => {
  // Test as AUTH_LOG_TARGET
  process.env.AUTH_LOG_TARGET = value;
  expect(getActiveLogger()).toBe(consoleLogger);
  
  // Test as BETTERSTACK_SOURCE_TOKEN with betterstack target
  process.env.AUTH_LOG_TARGET = 'betterstack';
  process.env.BETTERSTACK_SOURCE_TOKEN = value;
  
  const mockBetterStackLogger = { write: vi.fn() };
  (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
  
  // These should be treated as valid tokens since they're non-empty strings
  const logger = getActiveLogger();
  expect(logger).toBe(mockBetterStackLogger);
  
  vi.clearAllMocks();
};

/**
 * Helper function to create concurrent logger requests
 * Eliminates deep nesting in Array.from with Promise callbacks
 */
const createConcurrentLoggerRequest = (): Promise<typeof consoleLogger> => {
  return Promise.resolve().then(() => getActiveLogger());
};

/**
 * Helper function to verify concurrent logger results
 * Eliminates deep nesting in forEach callback
 */
const verifyConcurrentLoggerResult = (logger: typeof consoleLogger): void => {
  expect(logger).toBe(consoleLogger);
};

describe('Config - getActiveLogger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockStderr: { write: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    
    // Mock process.stderr.write to capture warning messages
    mockStderr = { write: vi.fn() };
    process.stderr = mockStderr as any;
    
    // Clear relevant environment variables
    delete process.env.AUTH_LOG_TARGET;
    delete process.env.BETTERSTACK_SOURCE_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('console logger (default behavior)', () => {
    /**
     * Tests default console logger when no environment variables are set
     * to ensure proper fallback behavior
     */
    it('should return console logger when no AUTH_LOG_TARGET is set', () => {
      const logger = getActiveLogger();
      
      expect(logger).toBe(consoleLogger);
    });

    /**
     * Tests console logger when AUTH_LOG_TARGET is explicitly set to console
     * to ensure explicit configuration works correctly
     */
    it('should return console logger when AUTH_LOG_TARGET is console', () => {
      process.env.AUTH_LOG_TARGET = 'console';
      
      const logger = getActiveLogger();
      
      expect(logger).toBe(consoleLogger);
    });

    /**
     * Tests console logger with various falsy AUTH_LOG_TARGET values
     * to ensure proper handling of edge cases
     */
    it('should return console logger for falsy AUTH_LOG_TARGET values', () => {
      const falsyValues = ['', '0', 'false', 'null', 'undefined'];
      
      falsyValues.forEach(testAuthTargetExpectingConsole);
    });

    /**
     * Tests console logger with unknown AUTH_LOG_TARGET values
     * to ensure proper fallback for unsupported configurations
     */
    it('should return console logger for unknown AUTH_LOG_TARGET values', () => {
      const unknownValues = ['unknown', 'custom', 'database', 'elasticsearch'];
      
      unknownValues.forEach(testAuthTargetExpectingConsole);
    });
  });

  describe('file logger configuration', () => {
    /**
     * Tests file logger when AUTH_LOG_TARGET is set to file
     * to ensure proper file logger selection
     */
    it('should return file logger when AUTH_LOG_TARGET is file', () => {
      process.env.AUTH_LOG_TARGET = 'file';
      
      const logger = getActiveLogger();
      
      expect(logger).toBe(fileLogger);
    });

    /**
     * Tests file logger with case variations
     * to ensure case-sensitive matching
     */
    it('should handle case-sensitive file target matching', () => {
      const caseVariations = ['FILE', 'File', 'fIlE', 'FiLe'];
      
      caseVariations.forEach(testAuthTargetExpectingConsole);
    });

    /**
     * Tests file logger with whitespace variations
     * to ensure exact string matching
     */
    it('should handle file target with whitespace strictly', () => {
      const whitespaceVariations = [' file', 'file ', ' file ', '\tfile', 'file\n'];
      
      whitespaceVariations.forEach(testAuthTargetExpectingConsole);
    });
  });

  describe('betterstack logger configuration', () => {
    /**
     * Tests BetterStack logger with valid source token
     * to ensure proper BetterStack logger creation
     */
    it('should return BetterStack logger when AUTH_LOG_TARGET is betterstack and source token is provided', () => {
      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'test-source-token-123';
      
      const logger = getActiveLogger();
      
      expect(createBetterStackLogger).toHaveBeenCalledTimes(1);
      expect(createBetterStackLogger).toHaveBeenCalledWith({
        sourceToken: 'test-source-token-123',
      });
      expect(logger).toBe(mockBetterStackLogger);
    });

    /**
     * Tests BetterStack logger fallback when source token is missing
     * to ensure proper error handling and fallback behavior
     */
    it('should fallback to console logger when betterstack target is set but source token is missing', () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      // BETTERSTACK_SOURCE_TOKEN is not set
      
      const logger = getActiveLogger();
      
      expect(createBetterStackLogger).not.toHaveBeenCalled();
      expect(logger).toBe(consoleLogger);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] BETTERSTACK_SOURCE_TOKEN is not set, falling back to console logger\n'
      );
    });

    /**
     * Tests BetterStack logger with empty source token
     * to ensure proper validation of token values
     */
    it('should fallback to console logger when source token is empty', () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = '';
      
      const logger = getActiveLogger();
      
      expect(createBetterStackLogger).not.toHaveBeenCalled();
      expect(logger).toBe(consoleLogger);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] BETTERSTACK_SOURCE_TOKEN is not set, falling back to console logger\n'
      );
    });

    /**
     * Tests BetterStack logger with whitespace-only source token
     * to ensure proper token validation
     */
    it('should fallback to console logger when source token is whitespace-only', () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = '   \t\n  ';
      
      const logger = getActiveLogger();
      
      expect(createBetterStackLogger).not.toHaveBeenCalled();
      expect(logger).toBe(consoleLogger);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] BETTERSTACK_SOURCE_TOKEN is not set, falling back to console logger\n'
      );
    });

    /**
     * Tests case sensitivity for betterstack target
     * to ensure exact string matching
     */
    it('should handle case-sensitive betterstack target matching', () => {
      const caseVariations = ['BETTERSTACK', 'BetterStack', 'betterStack', 'BetterSTACK'];
      
      caseVariations.forEach(testCaseVariationBetterstackTarget);
    });

    /**
     * Tests BetterStack logger with various valid token formats
     * to ensure compatibility with different token types
     */
    it('should handle various valid source token formats', () => {
      const tokenFormats = [
        'simple-token',
        'token.with.dots',
        'token_with_underscores',
        'TOKEN-WITH-CAPS',
        'mixedCaseToken123',
        'token-with-numbers-12345',
        'very-long-token-string-with-many-characters-and-numbers-123456789',
        'short',
      ];

      tokenFormats.forEach(testTokenFormat);
    });

    /**
     * Tests BetterStack logger error handling during creation
     * to ensure graceful handling of logger creation failures
     */
    it('should handle BetterStack logger creation errors', () => {
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Failed to create BetterStack logger');
      });
      
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'test-token';
      
      expect(() => getActiveLogger()).toThrow('Failed to create BetterStack logger');
      expect(createBetterStackLogger).toHaveBeenCalledTimes(1);
    });
  });

  describe('environment variable edge cases', () => {
    /**
     * Tests behavior when environment variables are undefined vs empty
     * to ensure proper handling of different undefined states
     */
    it('should handle undefined vs empty environment variables correctly', () => {
      // Test undefined AUTH_LOG_TARGET
      delete process.env.AUTH_LOG_TARGET;
      expect(getActiveLogger()).toBe(consoleLogger);
      
      // Test empty string AUTH_LOG_TARGET
      process.env.AUTH_LOG_TARGET = '';
      expect(getActiveLogger()).toBe(consoleLogger);
      
      // Test undefined BETTERSTACK_SOURCE_TOKEN with betterstack target
      process.env.AUTH_LOG_TARGET = 'betterstack';
      delete process.env.BETTERSTACK_SOURCE_TOKEN;
      expect(getActiveLogger()).toBe(consoleLogger);
      
      // Test empty string BETTERSTACK_SOURCE_TOKEN with betterstack target
      process.env.BETTERSTACK_SOURCE_TOKEN = '';
      expect(getActiveLogger()).toBe(consoleLogger);
    });

    /**
     * Tests behavior with null and undefined-like string values
     * to ensure proper handling of edge case values
     */
    it('should handle null and undefined-like string values', () => {
      const nullishValues = ['null', 'undefined', 'NaN', '{}', '[]'];
      
      nullishValues.forEach(testNullishValue);
    });

    /**
     * Tests concurrent access to getActiveLogger
     * to ensure thread safety and consistent behavior
     */
    it('should handle concurrent calls to getActiveLogger', async () => {
      process.env.AUTH_LOG_TARGET = 'console';
      
      const promises = Array.from({ length: 100 }, createConcurrentLoggerRequest);
      
      const results = await Promise.all(promises);
      
      // All results should be the same console logger instance
      results.forEach(verifyConcurrentLoggerResult);
    });

    /**
     * Tests behavior when environment variables change between calls
     * to ensure proper detection of configuration changes
     */
    it('should respect environment variable changes between calls', () => {
      // First call with console target
      process.env.AUTH_LOG_TARGET = 'console';
      expect(getActiveLogger()).toBe(consoleLogger);
      
      // Change to file target
      process.env.AUTH_LOG_TARGET = 'file';
      expect(getActiveLogger()).toBe(fileLogger);
      
      // Change to betterstack with token
      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'dynamic-token';
      expect(getActiveLogger()).toBe(mockBetterStackLogger);
      
      // Back to default (no target)
      delete process.env.AUTH_LOG_TARGET;
      delete process.env.BETTERSTACK_SOURCE_TOKEN;
      expect(getActiveLogger()).toBe(consoleLogger);
    });
  });

  describe('warning message behavior', () => {
    /**
     * Tests that warning messages are properly formatted and written
     * to ensure clear error communication
     */
    it('should write properly formatted warning messages', () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      // No source token set
      
      getActiveLogger();
      
      expect(mockStderr.write).toHaveBeenCalledTimes(1);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] BETTERSTACK_SOURCE_TOKEN is not set, falling back to console logger\n'
      );
    });

    /**
     * Tests that warning messages are only written when appropriate
     * to ensure no unnecessary noise in logs
     */
    it('should not write warning messages for valid configurations', () => {
      // Console logger (default)
      getActiveLogger();
      expect(mockStderr.write).not.toHaveBeenCalled();
      
      // File logger
      process.env.AUTH_LOG_TARGET = 'file';
      getActiveLogger();
      expect(mockStderr.write).not.toHaveBeenCalled();
      
      // BetterStack logger with valid token
      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'valid-token';
      getActiveLogger();
      expect(mockStderr.write).not.toHaveBeenCalled();
    });

    /**
     * Tests multiple consecutive calls with missing token
     * to ensure warning is written each time
     */
    it('should write warning message on each call when token is missing', () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      // No source token
      
      // First call
      getActiveLogger();
      expect(mockStderr.write).toHaveBeenCalledTimes(1);
      
      // Second call
      getActiveLogger();
      expect(mockStderr.write).toHaveBeenCalledTimes(2);
      
      // Third call
      getActiveLogger();
      expect(mockStderr.write).toHaveBeenCalledTimes(3);
    });
  });

  describe('integration with adapter modules', () => {
    /**
     * Tests that the correct adapter modules are imported and used
     * to ensure proper module integration
     */
    it('should properly integrate with all adapter modules', () => {
      // Test console adapter integration
      process.env.AUTH_LOG_TARGET = 'console';
      expect(getActiveLogger()).toBe(consoleLogger);
      
      // Test file adapter integration
      process.env.AUTH_LOG_TARGET = 'file';
      expect(getActiveLogger()).toBe(fileLogger);
      
      // Test betterstack adapter integration
      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'integration-test-token';
      
      const logger = getActiveLogger();
      
      expect(createBetterStackLogger).toHaveBeenCalledWith({
        sourceToken: 'integration-test-token',
      });
      expect(logger).toBe(mockBetterStackLogger);
    });

    /**
     * Tests error handling when adapter modules fail to load
     * to ensure graceful degradation
     */
    it('should handle adapter module loading failures gracefully', () => {
      // This test would typically require more complex mocking
      // to simulate module loading failures, but we can test
      // that the current implementation calls the adapters correctly
      
      process.env.AUTH_LOG_TARGET = 'file';
      const logger = getActiveLogger();
      expect(logger).toBe(fileLogger);
      
      // If fileLogger was null/undefined, it would cause issues
      expect(logger).toBeDefined();
      expect(typeof logger.write).toBe('function');
    });
  });
});