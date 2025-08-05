/**
 * @fileoverview Observability Package Tests - Sentry Client Initialization
 * 
 * Test suite for Sentry client-side initialization covering configuration validation,
 * replay integration, error handling, and performance optimization.
 * 
 * **Test Scope:**
 * - Sentry client initialization with comprehensive configuration options
 * - DSN validation and environment-based setup
 * - Replay integration configuration for session recording
 * - Error handling during initialization and service failures
 * - Performance optimization and memory management
 * 
 * **Test Categories:**
 * 1. **Successful Initialization**: Valid DSN and complete configuration setup
 * 2. **DSN Validation**: Invalid/missing DSN handling and fallback behavior
 * 3. **Configuration Options**: Timeout, sampling rates, and performance settings
 * 4. **Error Handling**: Initialization failures, service errors, and exception handling
 * 5. **Performance**: Memory management, rapid calls, and resource optimization
 * 
 * **Mock Strategy:**
 * - Complete Sentry Next.js SDK mocking to prevent actual service calls
 * - Environment configuration simulation for various scenarios
 * - Error injection for comprehensive failure testing
 * - Performance monitoring for optimization validation
 * 
 * **Quality Standards:**
 * - Zero actual Sentry calls to prevent quota usage and costs
 * - Complete error handling for all initialization failure scenarios
 * - Sub-50ms initialization time for optimal performance
 * - Comprehensive replay integration with privacy-first configuration
 */

import { init, replayIntegration } from '@sentry/nextjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { initializeSentry } from '../client';
import { keys } from '../keys';
import { log } from '../log';

// Mock dependencies
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
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
const mockReplayIntegration = vi.mocked(replayIntegration);
const mockKeys = vi.mocked(keys);
const mockLog = vi.mocked(log);

describe('initializeSentry (client)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockReplayIntegration.mockReturnValue({ name: 'Replay' } as any);
    mockInit.mockReturnValue(undefined);
    mockKeys.mockReturnValue({
      NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
      BETTERSTACK_API_KEY: 'test-key',
      BETTERSTACK_URL: 'https://logs.test.com',
      SENTRY_ORG: 'test-org',
      SENTRY_PROJECT: 'test-project',
    });
  });

  describe('Successful Initialization', () => {
    it('should initialize Sentry with valid DSN', () => {
      const result = initializeSentry();

      expect(mockKeys).toHaveBeenCalledTimes(1);
      expect(mockInit).toHaveBeenCalledWith({
        dsn: 'https://test@sentry.example.com/123',
        shutdownTimeout: 3000,
        maxValueLength: 1000,
        tracesSampleRate: 0.1,
        debug: false,
        replaysOnErrorSampleRate: 0.5,
        replaysSessionSampleRate: 0.05,
        integrations: [{ name: 'Replay' }],
      });
      expect(result).toBeUndefined();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should configure replay integration correctly', () => {
      initializeSentry();

      expect(mockReplayIntegration).toHaveBeenCalledWith({
        maskAllText: true,
        blockAllMedia: true,
      });
    });

    it('should return init result when available', () => {
      const mockInitResult = { some: 'result' };
      mockInit.mockReturnValue(mockInitResult as any);

      const result = initializeSentry();

      expect(result).toBe(mockInitResult);
    });
  });

  describe('DSN Validation', () => {
    it('should return undefined when DSN is not provided', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: undefined,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const result = initializeSentry();

      expect(mockInit).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should return undefined when DSN is empty string', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: '',
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const result = initializeSentry();

      expect(mockInit).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return undefined when DSN is not a string', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: 123 as any,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const result = initializeSentry();

      expect(mockInit).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle null DSN', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: null as any,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const result = initializeSentry();

      expect(mockInit).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('Configuration Options', () => {
    it('should set correct timeout options', () => {
      initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          shutdownTimeout: 3000,
          maxValueLength: 1000,
        })
      );
    });

    it('should set performance monitoring options', () => {
      initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1,
          debug: false,
        })
      );
    });

    it('should set replay sampling rates', () => {
      initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          replaysOnErrorSampleRate: 0.5,
          replaysSessionSampleRate: 0.05,
        })
      );
    });

    it('should include replay integration in integrations array', () => {
      initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          integrations: [{ name: 'Replay' }],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle keys() function throwing error', () => {
      const keysError = new Error('Keys error');
      mockKeys.mockImplementation(() => {
        throw keysError;
      });

      const result = initializeSentry();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry client: Keys error'
      );
      expect(mockInit).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle init() function throwing error', () => {
      const initError = new Error('Init error');
      mockInit.mockImplementation(() => {
        throw initError;
      });

      const result = initializeSentry();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry client: Init error'
      );
      expect(result).toBeUndefined();
    });

    it('should handle replayIntegration() throwing error', () => {
      const replayError = new Error('Replay error');
      mockReplayIntegration.mockImplementation(() => {
        throw replayError;
      });

      const result = initializeSentry();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry client: Replay error'
      );
      expect(result).toBeUndefined();
    });

    it('should handle non-Error exceptions', () => {
      mockKeys.mockImplementation(() => {
        throw 'String error';
      });

      const result = initializeSentry();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry client: String error'
      );
      expect(result).toBeUndefined();
    });

    it('should handle null/undefined exceptions', () => {
      mockKeys.mockImplementation(() => {
        throw null;
      });

      const result = initializeSentry();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to initialize Sentry client: null'
      );
      expect(result).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle keys returning partial configuration', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
        // Missing other properties
      } as any);

      const result = initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.example.com/123',
        })
      );
      expect(result).toBeUndefined();
    });

    it('should handle whitespace-only DSN', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: '   ',
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const result = initializeSentry();

      // Whitespace string has length > 0, so it should initialize
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: '   ',
        })
      );
    });

    it('should handle very long DSN', () => {
      const longDsn = 'https://test@sentry.example.com/123' + 'x'.repeat(1000);
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: longDsn,
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
      });

      const result = initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: longDsn,
        })
      );
    });
  });

  describe('Performance', () => {
    it('should complete initialization within reasonable time', () => {
      const start = performance.now();
      initializeSentry();
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle multiple rapid initialization calls', () => {
      const results = Array.from({ length: 100 }, () => initializeSentry());

      expect(results).toHaveLength(100);
      expect(mockKeys).toHaveBeenCalledTimes(100);
      expect(mockInit).toHaveBeenCalledTimes(100);
    });

    it('should not leak memory with repeated calls', () => {
      const initialMemory = (process.memoryUsage?.() ?? { heapUsed: 0 }).heapUsed;
      
      // Make many initialization calls
      for (let i = 0; i < 1000; i++) {
        initializeSentry();
      }

      const finalMemory = (process.memoryUsage?.() ?? { heapUsed: 0 }).heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should work with production-like DSN', () => {
      mockKeys.mockReturnValue({
        NEXT_PUBLIC_SENTRY_DSN: 'https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/1234567',
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://logs.test.com',
        SENTRY_ORG: 'my-org',
        SENTRY_PROJECT: 'my-project',
      });

      const result = initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/1234567',
        })
      );
    });

    it('should handle environment-specific configurations', () => {
      // Simulate different environment configurations
      const environments = [
        { dsn: 'https://dev@sentry.example.com/123' },
        { dsn: 'https://staging@sentry.example.com/456' },
        { dsn: 'https://prod@sentry.example.com/789' },
      ];

      environments.forEach((env) => {
        mockKeys.mockReturnValue({
          NEXT_PUBLIC_SENTRY_DSN: env.dsn,
          BETTERSTACK_API_KEY: 'test-key',
          BETTERSTACK_URL: 'https://logs.test.com',
          SENTRY_ORG: 'test-org',
          SENTRY_PROJECT: 'test-project',
        });

        const result = initializeSentry();
        expect(mockInit).toHaveBeenCalledWith(
          expect.objectContaining({ dsn: env.dsn })
        );
      });
    });

    it('should handle client-side browser environment', () => {
      // Simulate browser environment
      Object.defineProperty(globalThis, 'window', {
        value: { location: { hostname: 'localhost' } },
        writable: true,
      });

      const result = initializeSentry();

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.example.com/123',
          integrations: [{ name: 'Replay' }],
        })
      );

      // Clean up
      delete (globalThis as any).window;
    });
  });
});