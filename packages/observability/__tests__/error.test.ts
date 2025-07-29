/**
 * SPDX-License-Identifier: MIT
 */

import { captureException } from '@sentry/nextjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { log } from '../log';
import { parseError } from '../error';

// Mock dependencies
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));
vi.mock('../log', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCaptureException = vi.mocked(captureException);
const mockLog = vi.mocked(log);

describe('parseError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Message Extraction', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      const result = parseError(error);

      expect(result).toBe('Test error message');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Parsing error: Test error message');
    });

    it('should extract message from object with message property', () => {
      const error = { message: 'Custom error message' };
      const result = parseError(error);

      expect(result).toBe('Custom error message');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Parsing error: Custom error message');
    });

    it('should convert primitive values to string', () => {
      const error = 'String error';
      const result = parseError(error);

      expect(result).toBe('String error');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Parsing error: String error');
    });

    it('should handle null and undefined values', () => {
      const nullResult = parseError(null);
      expect(nullResult).toBe('null');

      const undefinedResult = parseError(undefined);
      expect(undefinedResult).toBe('undefined');

      expect(mockCaptureException).toHaveBeenCalledTimes(2);
      expect(mockLog.error).toHaveBeenCalledTimes(2);
    });

    it('should handle empty string error', () => {
      const result = parseError('');
      expect(result).toBe('An error occurred');
      expect(mockCaptureException).toHaveBeenCalledWith('');
      expect(mockLog.error).toHaveBeenCalledWith('Parsing error: An error occurred');
    });
  });

  describe('Complex Error Objects', () => {
    it('should handle nested error objects', () => {
      const error = {
        message: 'Nested error',
        code: 'ERR_TEST',
        details: { nested: true },
      };
      const result = parseError(error);

      expect(result).toBe('Nested error');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });

    it('should handle error-like objects without proper message', () => {
      const error = { code: 'ERR_NO_MESSAGE', status: 500 };
      const result = parseError(error);

      expect(result).toBe('[object Object]');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });

    it('should handle TypeError instances', () => {
      const error = new TypeError('Type error occurred');
      const result = parseError(error);

      expect(result).toBe('Type error occurred');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });

    it('should handle ReferenceError instances', () => {
      const error = new ReferenceError('Reference error occurred');
      const result = parseError(error);

      expect(result).toBe('Reference error occurred');
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });
  });

  describe('Sentry Integration', () => {
    it('should call captureException for all error types', () => {
      const errors = [
        new Error('Test error'),
        { message: 'Object error' },
        'String error',
        123,
        null,
      ];

      errors.forEach((error) => {
        parseError(error);
      });

      expect(mockCaptureException).toHaveBeenCalledTimes(5);
      errors.forEach((error) => {
        expect(mockCaptureException).toHaveBeenCalledWith(error);
      });
    });

    it('should handle Sentry captureException failure gracefully', () => {
      const originalConsoleError = console.error;
      const consoleErrorSpy = vi.fn();
      console.error = consoleErrorSpy;

      const sentryError = new Error('Sentry failed');
      mockCaptureException.mockImplementation(() => {
        throw sentryError;
      });

      const error = new Error('Original error');
      const result = parseError(error);

      expect(result).toBe('Original error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing error:', sentryError);

      console.error = originalConsoleError;
    });

    it('should handle log.error failure gracefully', () => {
      const originalConsoleError = console.error;
      const consoleErrorSpy = vi.fn();
      console.error = consoleErrorSpy;

      const logError = new Error('Log failed');
      mockLog.error.mockImplementation(() => {
        throw logError;
      });

      const error = new Error('Original error');
      const result = parseError(error);

      expect(result).toBe('Original error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing error:', expect.any(Error));

      console.error = originalConsoleError;
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large error messages efficiently', () => {
      const largeMessage = 'x'.repeat(10000);
      const error = new Error(largeMessage);
      
      const start = performance.now();
      const result = parseError(error);
      const end = performance.now();

      expect(result).toBe(largeMessage);
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle circular reference objects', () => {
      const circularError: any = { message: 'Circular error' };
      circularError.self = circularError;

      const result = parseError(circularError);
      expect(result).toBe('Circular error');
      expect(mockCaptureException).toHaveBeenCalledWith(circularError);
    });

    it('should process multiple errors in succession without memory leaks', () => {
      const errors = Array.from({ length: 1000 }, (_, i) => new Error(`Error ${i}`));
      
      const results = errors.map(parseError);
      
      expect(results).toHaveLength(1000);
      results.forEach((result, index) => {
        expect(result).toBe(`Error ${index}`);
      });
      expect(mockCaptureException).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbol errors', () => {
      const symbolError = Symbol('test error');
      const result = parseError(symbolError);

      expect(result).toBe('Symbol(test error)');
      expect(mockCaptureException).toHaveBeenCalledWith(symbolError);
    });

    it('should handle function errors', () => {
      const functionError = () => 'error';
      const result = parseError(functionError);

      expect(result).toBe('() => "error"');
      expect(mockCaptureException).toHaveBeenCalledWith(functionError);
    });

    it('should handle BigInt errors', () => {
      const bigIntError = BigInt(123);
      const result = parseError(bigIntError);

      expect(result).toBe('123');
      expect(mockCaptureException).toHaveBeenCalledWith(bigIntError);
    });

    it('should handle array errors', () => {
      const arrayError = ['error', 'array'];
      const result = parseError(arrayError);

      expect(result).toBe('error,array');
      expect(mockCaptureException).toHaveBeenCalledWith(arrayError);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle fetch API errors', () => {
      const fetchError = new TypeError('Failed to fetch');
      fetchError.name = 'TypeError';
      
      const result = parseError(fetchError);
      expect(result).toBe('Failed to fetch');
    });

    it('should handle async operation errors', async () => {
      const asyncError = new Error('Async operation failed');
      
      const result = parseError(asyncError);
      expect(result).toBe('Async operation failed');
    });

    it('should handle validation errors', () => {
      const validationError = {
        message: 'Validation failed',
        errors: ['Field is required', 'Invalid format'],
        code: 'VALIDATION_ERROR',
      };
      
      const result = parseError(validationError);
      expect(result).toBe('Validation failed');
    });

    it('should handle network timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      const result = parseError(timeoutError);
      expect(result).toBe('Request timeout');
    });
  });
});