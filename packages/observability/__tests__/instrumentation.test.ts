/**
 * SPDX-License-Identifier: MIT
 */

import { init } from '@sentry/nextjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { initializeSentry } from '../instrumentation';
import { keys } from '../keys';
import { log } from '../log';

// Mock dependencies
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));
vi.mock('../keys', () => ({
  keys: vi.fn(() => ({
    NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
    BETTERSTACK_API_KEY: 'test-key',
    BETTERSTACK_URL: 'https://logs.test.com',
    SENTRY_ORG: 'test-org',
    SENTRY_PROJECT: 'test-project',
  })),
}));
vi.mock('../log', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockInit = vi.mocked(init);
const mockKeys = vi.mocked(keys);
const mockLog = vi.mocked(log);

describe('initializeSentry (instrumentation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment
    delete process.env.NEXT_RUNTIME;
    
    // Default mock implementations
    mockInit.mockReturnValue(undefined);
    mockKeys.mockReturnValue({
      NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
      BETTERSTACK_API_KEY: 'test-key',
      BETTERSTACK_URL: 'https://logs.test.com',
      SENTRY_ORG: 'test-org',
      SENTRY_PROJECT: 'test-project',
    });
  });

  describe('Function Structure', () => {
    it('should return a register function', () => {
      const result = initializeSentry();
      
      expect(typeof result).toBe('function');
    });

    it('should return a register function that can be called', () => {
      const register = initializeSentry();
      
      expect(() => register()).not.toThrow();
    });
  });

  describe('Successful Initialization', () => {
    it('should initialize Sentry with valid DSN in nodejs runtime', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const register = initializeSentry();
      
      register();

      expect(mockKeys).toHaveBeenCalledTimes(1);
      expect(mockInit).toHaveBeenCalledWith({
        dsn: 'https://test@sentry.example.com/123',
        shutdownTimeout: 3000,
        maxValueLength: 1000,
        enableTracing: false,
        tracesSampleRate: 0.1,
      });
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should initialize Sentry with valid DSN in edge runtime', () => {
      process.env.NEXT_RUNTIME = 'edge';
      const register = initializeSentry();
      
      register();

      expect(mockKeys).toHaveBeenCalledTimes(1);
      expect(mockInit).toHaveBeenCalledWith({
        dsn: 'https://test@sentry.example.com/123',
        shutdownTimeout: 3000,
        maxValueLength: 1000,
        enableTracing: false,
        tracesSampleRate: 0.1,
      });
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should not initialize Sentry if runtime is not nodejs or edge', () => {
      process.env.NEXT_RUNTIME = 'unknown';
      const register = initializeSentry();
      
      register();

      expect(mockKeys).toHaveBeenCalledTimes(1);
      expect(mockInit).not.toHaveBeenCalled();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should not initialize Sentry if NEXT_RUNTIME is undefined', () => {
      // NEXT_RUNTIME undefined (default state)
      const register = initializeSentry();
      
      register();

      expect(mockKeys).toHaveBeenCalledTimes(1);
      expect(mockInit).not.toHaveBeenCalled();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });
  });

  describe('DSN Validation', () => {
    it('should not initialize when DSN is not provided', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: undefined,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const register = initializeSentry();
      register();

      expect(mockInit).not.toHaveBeenCalled();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should not initialize when DSN is empty string', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: '',
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const register = initializeSentry();
      register();

      expect(mockInit).not.toHaveBeenCalled();
    });

    it('should not initialize when DSN is not a string', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: 123 as any,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const register = initializeSentry();
      register();

      expect(mockInit).not.toHaveBeenCalled();
    });

    it('should not initialize when DSN is null', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: null as any,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const register = initializeSentry();
      register();

      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    beforeEach(() => {
      process.env.NEXT_RUNTIME = 'nodejs';
    });

    it('should set correct timeout and size limits', () => {
      const register = initializeSentry();
      register();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          shutdownTimeout: 3000,
          maxValueLength: 1000,
        })
      );
    });

    it('should disable tracing for performance', () => {
      const register = initializeSentry();
      register();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          enableTracing: false,
          tracesSampleRate: 0.1,
        })
      );
    });

    it('should use the same configuration for both runtimes', () => {
      const expectedConfig = {
        dsn: 'https://test@sentry.example.com/123',
        shutdownTimeout: 3000,
        maxValueLength: 1000,
        enableTracing: false,
        tracesSampleRate: 0.1,
      };

      // Test nodejs runtime
      process.env.NEXT_RUNTIME = 'nodejs';
      let register = initializeSentry();
      register();
      expect(mockInit).toHaveBeenCalledWith(expectedConfig);

      mockInit.mockClear();

      // Test edge runtime
      process.env.NEXT_RUNTIME = 'edge';
      register = initializeSentry();
      register();
      expect(mockInit).toHaveBeenCalledWith(expectedConfig);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NEXT_RUNTIME = 'nodejs';
    });

    it('should handle keys() function throwing error', () => {
      const keysError = new Error('Keys error');
      mockKeys.mockImplementation(() => {
        throw keysError;
      });

      const register = initializeSentry();
      register();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry: Keys error'
      );
      expect(mockInit).not.toHaveBeenCalled();
    });

    it('should handle init() function throwing error', () => {
      const initError = new Error('Init error');
      mockInit.mockImplementation(() => {
        throw initError;
      });

      const register = initializeSentry();
      register();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry: Init error'
      );
    });

    it('should handle keys returning null/undefined', () => {
      mockKeys.mockReturnValue(null as any);

      const register = initializeSentry();
      register();

      expect(mockInit).not.toHaveBeenCalled();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', () => {
      mockKeys.mockImplementation(() => {
        throw 'String error';
      });

      const register = initializeSentry();
      register();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry: String error'
      );
    });

    it('should handle null/undefined exceptions', () => {
      mockKeys.mockImplementation(() => {
        throw null;
      });

      const register = initializeSentry();
      register();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry: null'
      );
    });

    it('should not throw from register function', () => {
      mockKeys.mockImplementation(() => {
        throw new Error('Critical error');
      });

      const register = initializeSentry();
      
      expect(() => register()).not.toThrow();
    });
  });

  describe('Runtime Environment Handling', () => {
    it('should handle various NEXT_RUNTIME values', () => {
      const runtimes = [
        { runtime: 'nodejs', shouldInit: true },
        { runtime: 'edge', shouldInit: true },
        { runtime: 'experimental-edge', shouldInit: false },
        { runtime: 'browser', shouldInit: false },
        { runtime: '', shouldInit: false },
        { runtime: undefined, shouldInit: false },
      ];

      runtimes.forEach(({ runtime, shouldInit }) => {
        mockInit.mockClear();
        
        if (runtime === undefined) {
          delete process.env.NEXT_RUNTIME;
        } else {
          process.env.NEXT_RUNTIME = runtime;
        }

        const register = initializeSentry();
        register();

        if (shouldInit) {
          expect(mockInit).toHaveBeenCalledTimes(1);
        } else {
          expect(mockInit).not.toHaveBeenCalled();
        }
      });
    });

    it('should initialize for both supported runtimes with same config', () => {
      const supportedRuntimes = ['nodejs', 'edge'];
      
      supportedRuntimes.forEach((runtime) => {
        mockInit.mockClear();
        process.env.NEXT_RUNTIME = runtime;

        const register = initializeSentry();
        register();

        expect(mockInit).toHaveBeenCalledWith({
          dsn: 'https://test@sentry.example.com/123',
          shutdownTimeout: 3000,
          maxValueLength: 1000,
          enableTracing: false,
          tracesSampleRate: 0.1,
        });
      });
    });
  });

  describe('Multiple Calls', () => {
    beforeEach(() => {
      process.env.NEXT_RUNTIME = 'nodejs';
    });

    it('should handle multiple register calls', () => {
      const register = initializeSentry();
      
      register();
      register();
      register();

      expect(mockKeys).toHaveBeenCalledTimes(3);
      expect(mockInit).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple initializeSentry calls', () => {
      const register1 = initializeSentry();
      const register2 = initializeSentry();
      const register3 = initializeSentry();

      register1();
      register2();
      register3();

      expect(mockKeys).toHaveBeenCalledTimes(3);
      expect(mockInit).toHaveBeenCalledTimes(3);
    });

    it('should maintain independent error handling per call', () => {
      // First call succeeds
      const register1 = initializeSentry();
      register1();
      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(mockLog.warn).not.toHaveBeenCalled();

      // Second call fails
      mockKeys.mockImplementationOnce(() => {
        throw new Error('Second call error');
      });
      const register2 = initializeSentry();
      register2();
      expect(mockInit).toHaveBeenCalledTimes(1); // Still 1, second call failed
      expect(mockLog.warn).toHaveBeenCalledWith('Failed to initialize Sentry: Second call error');

      // Third call succeeds
      const register3 = initializeSentry();
      register3();
      expect(mockInit).toHaveBeenCalledTimes(2); // Now 2, third call succeeded
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      process.env.NEXT_RUNTIME = 'nodejs';
    });

    it('should complete registration within reasonable time', () => {
      const register = initializeSentry();
      
      const start = performance.now();
      register();
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle rapid repeated calls efficiently', () => {
      const register = initializeSentry();
      
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        register();
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(200); // Should complete within 200ms
      expect(mockKeys).toHaveBeenCalledTimes(100);
      expect(mockInit).toHaveBeenCalledTimes(100);
    });

    it('should not leak memory with repeated calls', () => {
      const initialMemory = (process.memoryUsage?.() ?? { heapUsed: 0 }).heapUsed;
      
      // Create many register functions and call them
      for (let i = 0; i < 1000; i++) {
        const register = initializeSentry();
        register();
      }

      const finalMemory = (process.memoryUsage?.() ?? { heapUsed: 0 }).heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should work with Next.js instrumentation file pattern', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      
      // Simulate how Next.js would use this
      const instrumentationFunction = initializeSentry();
      
      // Next.js calls the returned function
      expect(() => instrumentationFunction()).not.toThrow();
      expect(mockInit).toHaveBeenCalledTimes(1);
    });

    it('should handle serverless environment initialization', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      
      // Simulate rapid serverless function starts
      const functions = Array.from({ length: 10 }, () => {
        const register = initializeSentry();
        return () => register();
      });

      functions.forEach((fn) => fn());

      expect(mockInit).toHaveBeenCalledTimes(10);
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should work with edge runtime deployment', () => {
      process.env.NEXT_RUNTIME = 'edge';
      
      const register = initializeSentry();
      register();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.example.com/123',
          enableTracing: false, // Important for edge runtime performance
        })
      );
    });

    it('should handle production environment configuration', () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: 'https://prod@o123456.ingest.sentry.io/1234567',
        BETTERSTACK_API_KEY: 'prod-key',
        BETTERSTACK_URL: 'https://logs.betterstack.com',
        SENTRY_ORG: 'my-company',
        SENTRY_PROJECT: 'my-project',
      });

      const register = initializeSentry();
      register();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://prod@o123456.ingest.sentry.io/1234567',
        })
      );
    });
  });
});