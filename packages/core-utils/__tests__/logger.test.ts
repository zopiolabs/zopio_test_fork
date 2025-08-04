/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../index.js';
// import { mockConsole, mockEnv } from '@repo/testing';

// Temporary mocks until testing package is fixed
const mockConsole = () => {
  const originalConsole = { ...console };
  const mocks = {
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  };
  
  return {
    mocks,
    restore: () => {
      Object.values(mocks).forEach(mock => mock.mockRestore());
    }
  };
};

const mockEnv = (env: Record<string, string>) => {
  const original = process.env;
  process.env = { ...original, ...env };
  return {
    restore: () => {
      process.env = original;
    }
  };
};

describe('logger', () => {
  let consoleMock: ReturnType<typeof mockConsole>;
  let envMock: ReturnType<typeof mockEnv>;

  beforeEach(() => {
    consoleMock = mockConsole();
  });

  afterEach(() => {
    consoleMock.restore();
    envMock?.restore();
  });

  describe('info', () => {
    it('should log info messages in development', () => {
      envMock = mockEnv({ NODE_ENV: 'development' });
      
      logger.info('Test info message', { data: 'test' });
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith(
        '[INFO] Test info message',
        { data: 'test' }
      );
    });

    it('should log info messages in test environment', () => {
      envMock = mockEnv({ NODE_ENV: 'test' });
      
      logger.info('Test info message', { data: 'test' });
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith(
        '[INFO] Test info message',
        { data: 'test' }
      );
    });

    it('should not log info messages in production', () => {
      envMock = mockEnv({ NODE_ENV: 'production' });
      
      logger.info('Test info message', { data: 'test' });
      
      expect(consoleMock.mocks.info).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      envMock = mockEnv({ NODE_ENV: 'development' });
      
      logger.info('Test message', 'arg1', 'arg2', { key: 'value' });
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith(
        '[INFO] Test message',
        'arg1',
        'arg2',
        { key: 'value' }
      );
    });
  });

  describe('error', () => {
    it('should always log error messages', () => {
      envMock = mockEnv({ NODE_ENV: 'production' });
      
      logger.error('Test error message', { error: 'details' });
      
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        '[ERROR] Test error message',
        { error: 'details' }
      );
    });

    it('should log error messages in development', () => {
      envMock = mockEnv({ NODE_ENV: 'development' });
      
      logger.error('Test error message', { error: 'details' });
      
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        '[ERROR] Test error message',
        { error: 'details' }
      );
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Something failed', error);
      
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        '[ERROR] Something failed',
        error
      );
    });
  });

  describe('warn', () => {
    it('should always log warning messages', () => {
      envMock = mockEnv({ NODE_ENV: 'production' });
      
      logger.warn('Test warning message', { warning: 'details' });
      
      expect(consoleMock.mocks.warn).toHaveBeenCalledWith(
        '[WARN] Test warning message',
        { warning: 'details' }
      );
    });

    it('should log warning messages in development', () => {
      envMock = mockEnv({ NODE_ENV: 'development' });
      
      logger.warn('Test warning message', { warning: 'details' });
      
      expect(consoleMock.mocks.warn).toHaveBeenCalledWith(
        '[WARN] Test warning message',
        { warning: 'details' }
      );
    });
  });

  describe('debug', () => {
    it('should log debug messages only in development', () => {
      envMock = mockEnv({ NODE_ENV: 'development' });
      
      logger.debug('Test debug message', { debug: 'info' });
      
      expect(consoleMock.mocks.debug).toHaveBeenCalledWith(
        '[DEBUG] Test debug message',
        { debug: 'info' }
      );
    });

    it('should not log debug messages in production', () => {
      envMock = mockEnv({ NODE_ENV: 'production' });
      
      logger.debug('Test debug message', { debug: 'info' });
      
      expect(consoleMock.mocks.debug).not.toHaveBeenCalled();
    });

    it('should not log debug messages in test environment', () => {
      envMock = mockEnv({ NODE_ENV: 'test' });
      
      logger.debug('Test debug message', { debug: 'info' });
      
      expect(consoleMock.mocks.debug).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages', () => {
      logger.info('');
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith('[INFO] ');
    });

    it('should handle null and undefined arguments', () => {
      logger.info('Test', null, undefined);
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith(
        '[INFO] Test',
        null,
        undefined
      );
    });

    it('should handle circular references in objects', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw
      expect(() => logger.info('Circular test', circular)).not.toThrow();
    });
  });
});