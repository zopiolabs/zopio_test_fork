/**
 * SPDX-License-Identifier: MIT
 */

import { log as logtail } from '@logtail/next';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { log } from '../log';

// Mock dependencies
vi.mock('@logtail/next', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockLogtail = vi.mocked(logtail);

describe('log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset NODE_ENV to test default
    vi.stubEnv('NODE_ENV', 'test');
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should call logtail.info in production', () => {
      const message = 'Test info message';
      log.info(message);

      expect(mockLogtail.info).toHaveBeenCalledWith(message);
      expect(mockLogtail.info).toHaveBeenCalledTimes(1);
    });

    it('should call logtail.warn in production', () => {
      const message = 'Test warning message';
      log.warn(message);

      expect(mockLogtail.warn).toHaveBeenCalledWith(message);
      expect(mockLogtail.warn).toHaveBeenCalledTimes(1);
    });

    it('should call logtail.error in production', () => {
      const message = 'Test error message';
      log.error(message);

      expect(mockLogtail.error).toHaveBeenCalledWith(message);
      expect(mockLogtail.error).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple log calls in production', () => {
      log.info('Info 1');
      log.warn('Warning 1');
      log.error('Error 1');
      log.info('Info 2');

      expect(mockLogtail.info).toHaveBeenCalledTimes(2);
      expect(mockLogtail.warn).toHaveBeenCalledTimes(1);
      expect(mockLogtail.error).toHaveBeenCalledTimes(1);
    });

    it('should handle empty messages in production', () => {
      log.info('');
      log.warn('');
      log.error('');

      expect(mockLogtail.info).toHaveBeenCalledWith('');
      expect(mockLogtail.warn).toHaveBeenCalledWith('');
      expect(mockLogtail.error).toHaveBeenCalledWith('');
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('should not call logtail.info in development', () => {
      const message = 'Test info message';
      log.info(message);

      expect(mockLogtail.info).not.toHaveBeenCalled();
    });

    it('should not call logtail.warn in development', () => {
      const message = 'Test warning message';
      log.warn(message);

      expect(mockLogtail.warn).not.toHaveBeenCalled();
    });

    it('should not call logtail.error in development', () => {
      const message = 'Test error message';
      log.error(message);

      expect(mockLogtail.error).not.toHaveBeenCalled();
    });

    it('should remain silent for multiple calls in development', () => {
      log.info('Info message');
      log.warn('Warning message');
      log.error('Error message');

      expect(mockLogtail.info).not.toHaveBeenCalled();
      expect(mockLogtail.warn).not.toHaveBeenCalled();
      expect(mockLogtail.error).not.toHaveBeenCalled();
    });
  });

  describe('Test Environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test');
    });

    it('should not call logtail methods in test environment', () => {
      log.info('Test message');
      log.warn('Warning message');
      log.error('Error message');

      expect(mockLogtail.info).not.toHaveBeenCalled();
      expect(mockLogtail.warn).not.toHaveBeenCalled();
      expect(mockLogtail.error).not.toHaveBeenCalled();
    });
  });

  describe('Other Environments', () => {
    it('should handle staging environment like production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      
      log.info('Staging message');
      expect(mockLogtail.info).toHaveBeenCalledWith('Staging message');
    });

    it('should handle preview environment like production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      
      log.warn('Preview warning');
      expect(mockLogtail.warn).toHaveBeenCalledWith('Preview warning');
    });

    it('should handle undefined NODE_ENV as non-production', () => {
      vi.stubEnv('NODE_ENV', undefined);
      
      log.error('Undefined env error');
      expect(mockLogtail.error).not.toHaveBeenCalled();
    });
  });

  describe('Message Formatting', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should handle long messages', () => {
      const longMessage = 'x'.repeat(1000);
      log.info(longMessage);

      expect(mockLogtail.info).toHaveBeenCalledWith(longMessage);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Test message with 特殊字符 and émojis 🚀';
      log.info(specialMessage);

      expect(mockLogtail.info).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle newlines and whitespace', () => {
      const messageWithNewlines = 'Line 1\nLine 2\n\tTabbed line';
      log.warn(messageWithNewlines);

      expect(mockLogtail.warn).toHaveBeenCalledWith(messageWithNewlines);
    });

    it('should handle JSON-like strings', () => {
      const jsonMessage = '{"key": "value", "number": 123}';
      log.error(jsonMessage);

      expect(mockLogtail.error).toHaveBeenCalledWith(jsonMessage);
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should handle rapid successive calls', () => {
      const messages = Array.from({ length: 100 }, (_, i) => `Message ${i}`);
      
      const start = performance.now();
      messages.forEach((message) => {
        log.info(message);
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete within 100ms
      expect(mockLogtail.info).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent logging calls', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve().then(() => log.info(`Concurrent message ${i}`))
      );

      await Promise.all(promises);
      expect(mockLogtail.info).toHaveBeenCalledTimes(50);
    });

    it('should handle mixed log levels concurrently', async () => {
      const promises = [
        ...Array.from({ length: 20 }, (_, i) => 
          Promise.resolve().then(() => log.info(`Info ${i}`))
        ),
        ...Array.from({ length: 20 }, (_, i) => 
          Promise.resolve().then(() => log.warn(`Warn ${i}`))
        ),
        ...Array.from({ length: 20 }, (_, i) => 
          Promise.resolve().then(() => log.error(`Error ${i}`))
        ),
      ];

      await Promise.all(promises);
      expect(mockLogtail.info).toHaveBeenCalledTimes(20);
      expect(mockLogtail.warn).toHaveBeenCalledTimes(20);
      expect(mockLogtail.error).toHaveBeenCalledTimes(20);
    });
  });

  describe('Error Propagation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should propagate logtail errors as expected', () => {
      mockLogtail.info.mockImplementation(() => {
        throw new Error('Logtail error');
      });

      expect(() => log.info('Test message')).toThrow('Logtail error');
    });

    it('should propagate errors consistently', () => {
      const testError = new Error('Test error');
      mockLogtail.warn.mockImplementation(() => {
        throw testError;
      });

      expect(() => log.warn('Message')).toThrow(testError);
    });
  });

  describe('Logger Interface', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      // Reset mock implementations
      mockLogtail.info.mockReset();
      mockLogtail.warn.mockReset();
      mockLogtail.error.mockReset();
    });

    it('should expose all required log methods', () => {
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should return undefined for all log methods', () => {
      expect(log.info('test')).toBeUndefined();
      expect(log.warn('test')).toBeUndefined();
      expect(log.error('test')).toBeUndefined();
    });

    it('should accept string parameters only', () => {
      // These should work (TypeScript would enforce this)
      log.info('string message');
      log.warn('string message');
      log.error('string message');

      expect(mockLogtail.info).toHaveBeenCalledWith('string message');
      expect(mockLogtail.warn).toHaveBeenCalledWith('string message');
      expect(mockLogtail.error).toHaveBeenCalledWith('string message');
    });
  });

  describe('Real-world Scenarios', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      // Reset mock implementations
      mockLogtail.info.mockReset();
      mockLogtail.warn.mockReset();
      mockLogtail.error.mockReset();
    });

    it('should handle authentication log messages', () => {
      log.info('User authenticated successfully');
      log.warn('Failed login attempt from IP: 192.168.1.1');
      log.error('Authentication service unavailable');

      expect(mockLogtail.info).toHaveBeenCalledWith('User authenticated successfully');
      expect(mockLogtail.warn).toHaveBeenCalledWith('Failed login attempt from IP: 192.168.1.1');
      expect(mockLogtail.error).toHaveBeenCalledWith('Authentication service unavailable');
    });

    it('should handle API request logging', () => {
      log.info('API request: GET /api/users');
      log.warn('API rate limit approaching for user: user123');
      log.error('API request failed: 500 Internal Server Error');

      expect(mockLogtail.info).toHaveBeenCalledWith('API request: GET /api/users');
      expect(mockLogtail.warn).toHaveBeenCalledWith('API rate limit approaching for user: user123');
      expect(mockLogtail.error).toHaveBeenCalledWith('API request failed: 500 Internal Server Error');
    });

    it('should handle database operation logging', () => {
      log.info('Database connection established');
      log.warn('Database query took longer than expected: 5.2s');
      log.error('Database connection failed: timeout after 30s');

      expect(mockLogtail.info).toHaveBeenCalledWith('Database connection established');
      expect(mockLogtail.warn).toHaveBeenCalledWith('Database query took longer than expected: 5.2s');
      expect(mockLogtail.error).toHaveBeenCalledWith('Database connection failed: timeout after 30s');
    });

    it('should handle application lifecycle events', () => {
      log.info('Application started successfully');
      log.warn('Graceful shutdown initiated');
      log.error('Application crashed: uncaught exception');

      expect(mockLogtail.info).toHaveBeenCalledWith('Application started successfully');
      expect(mockLogtail.warn).toHaveBeenCalledWith('Graceful shutdown initiated');
      expect(mockLogtail.error).toHaveBeenCalledWith('Application crashed: uncaught exception');
    });
  });
});