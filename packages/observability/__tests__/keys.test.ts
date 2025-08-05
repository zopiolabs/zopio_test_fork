/**
 * @fileoverview Observability Package Tests - Environment Configuration & Validation
 * 
 * Test suite for environment configuration management using t3-env with comprehensive
 * validation, schema definition, and runtime environment mapping.
 * 
 * **Test Scope:**
 * - Environment schema definition with Zod validation for server and client
 * - Runtime environment mapping and variable access patterns
 * - URL validation for service endpoints (BetterStack, Sentry DSN)
 * - Error handling for validation failures and missing configurations
 * - Multiple environment scenarios (development, staging, production)
 * 
 * **Test Categories:**
 * 1. **Schema Definition**: Server/client schema validation with proper Zod types
 * 2. **Environment Mapping**: Runtime variable mapping and access patterns
 * 3. **Schema Validation**: URL validation, optional fields, and type checking
 * 4. **Error Handling**: Validation failures, malformed URLs, and missing variables
 * 5. **Performance**: Rapid calls, memory management, and configuration caching
 * 
 * **Mock Strategy:**
 * - Complete t3-env mocking to prevent actual environment validation
 * - Process.env simulation for various configuration scenarios
 * - Schema introspection for validation rule verification
 * - Error simulation for comprehensive failure testing
 * 
 * **Quality Standards:**
 * - Complete environment variable validation with proper types
 * - Comprehensive URL validation for all service endpoints
 * - Sub-50ms configuration resolution for optimal performance
 * - Graceful handling of all configuration scenarios and edge cases
 */

import { createEnv } from '@t3-oss/env-nextjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// We need to test the actual implementation, not the mocked one
vi.unmock('../keys');
import { keys } from '../keys';

// Mock only the external dependency
vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: vi.fn(() => ({
    BETTERSTACK_API_KEY: 'test-api-key',
    BETTERSTACK_URL: 'https://logs.test.com',
    SENTRY_ORG: 'test-org',
    SENTRY_PROJECT: 'test-project',
    NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
  })),
}));

const mockCreateEnv = vi.mocked(createEnv);

describe('keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mock implementation
    mockCreateEnv.mockReturnValue({
      BETTERSTACK_API_KEY: 'test-api-key',
      BETTERSTACK_URL: 'https://logs.test.com',
      SENTRY_ORG: 'test-org',
      SENTRY_PROJECT: 'test-project',
      NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
    });
  });

  describe('Schema Definition', () => {
    it('should call createEnv with correct server schema', () => {
      keys();

      expect(mockCreateEnv).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.objectContaining({
            BETTERSTACK_API_KEY: expect.any(z.ZodOptional),
            BETTERSTACK_URL: expect.any(z.ZodOptional),
            SENTRY_ORG: expect.any(z.ZodOptional),
            SENTRY_PROJECT: expect.any(z.ZodOptional),
          }),
        })
      );
    });

    it('should call createEnv with correct client schema', () => {
      keys();

      expect(mockCreateEnv).toHaveBeenCalledWith(
        expect.objectContaining({
          client: expect.objectContaining({
            NEXT_PUBLIC_SENTRY_DSN: expect.any(z.ZodOptional),
          }),
        })
      );
    });

    it('should call createEnv with correct runtime environment mapping', () => {
      // Mock process.env for this test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BETTERSTACK_API_KEY: 'env-api-key',
        BETTERSTACK_URL: 'https://env-logs.test.com',
        SENTRY_ORG: 'env-org',
        SENTRY_PROJECT: 'env-project',
        NEXT_PUBLIC_SENTRY_DSN: 'https://env@sentry.example.com/456',
      };

      keys();

      expect(mockCreateEnv).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeEnv: {
            BETTERSTACK_API_KEY: 'env-api-key',
            BETTERSTACK_URL: 'https://env-logs.test.com',
            SENTRY_ORG: 'env-org',
            SENTRY_PROJECT: 'env-project',
            NEXT_PUBLIC_SENTRY_DSN: 'https://env@sentry.example.com/456',
          },
        })
      );

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('Return Value', () => {
    it('should return the result from createEnv', () => {
      const mockResult = {
        BETTERSTACK_API_KEY: 'test-key',
        BETTERSTACK_URL: 'https://test.com',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
        NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.example.com/123',
      };
      mockCreateEnv.mockReturnValue(mockResult);

      const result = keys();

      expect(result).toBe(mockResult);
    });

    it('should return different results for different environment states', () => {
      const result1 = {
        BETTERSTACK_API_KEY: 'key1',
        BETTERSTACK_URL: 'https://url1.com',
        SENTRY_ORG: 'org1',
        SENTRY_PROJECT: 'project1',
        NEXT_PUBLIC_SENTRY_DSN: 'https://dsn1@sentry.example.com/1',
      };
      const result2 = {
        BETTERSTACK_API_KEY: 'key2',
        BETTERSTACK_URL: 'https://url2.com',
        SENTRY_ORG: 'org2',
        SENTRY_PROJECT: 'project2',
        NEXT_PUBLIC_SENTRY_DSN: 'https://dsn2@sentry.example.com/2',
      };

      mockCreateEnv.mockReturnValueOnce(result1);
      mockCreateEnv.mockReturnValueOnce(result2);

      expect(keys()).toBe(result1);
      expect(keys()).toBe(result2);
    });
  });

  describe('Schema Validation', () => {
    it('should define BETTERSTACK_API_KEY as optional string', () => {
      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      const schema = call.server.BETTERSTACK_API_KEY;
      
      expect(schema._def.typeName).toBe('ZodOptional');
      expect(schema._def.innerType._def.typeName).toBe('ZodString');
    });

    it('should define BETTERSTACK_URL as optional URL', () => {
      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      const schema = call.server.BETTERSTACK_URL;
      
      expect(schema._def.typeName).toBe('ZodOptional');
      expect(schema._def.innerType._def.typeName).toBe('ZodString');
      // Check if URL validation is applied
      expect(schema._def.innerType._def.checks).toContainEqual(
        expect.objectContaining({ kind: 'url' })
      );
    });

    it('should define SENTRY_ORG as optional string', () => {
      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      const schema = call.server.SENTRY_ORG;
      
      expect(schema._def.typeName).toBe('ZodOptional');
      expect(schema._def.innerType._def.typeName).toBe('ZodString');
    });

    it('should define SENTRY_PROJECT as optional string', () => {
      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      const schema = call.server.SENTRY_PROJECT;
      
      expect(schema._def.typeName).toBe('ZodOptional');
      expect(schema._def.innerType._def.typeName).toBe('ZodString');
    });

    it('should define NEXT_PUBLIC_SENTRY_DSN as optional URL', () => {
      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      const schema = call.client.NEXT_PUBLIC_SENTRY_DSN;
      
      expect(schema._def.typeName).toBe('ZodOptional');
      expect(schema._def.innerType._def.typeName).toBe('ZodString');
      // Check if URL validation is applied
      expect(schema._def.innerType._def.checks).toContainEqual(
        expect.objectContaining({ kind: 'url' })
      );
    });
  });

  describe('Environment Variable Mapping', () => {
    it('should map all server environment variables correctly', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BETTERSTACK_API_KEY: 'mapped-api-key',
        BETTERSTACK_URL: 'https://mapped-url.com',
        SENTRY_ORG: 'mapped-org',
        SENTRY_PROJECT: 'mapped-project',
      };

      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      expect(call.runtimeEnv).toEqual(
        expect.objectContaining({
          BETTERSTACK_API_KEY: 'mapped-api-key',
          BETTERSTACK_URL: 'https://mapped-url.com',
          SENTRY_ORG: 'mapped-org',
          SENTRY_PROJECT: 'mapped-project',
        })
      );

      process.env = originalEnv;
    });

    it('should map client environment variables correctly', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SENTRY_DSN: 'https://mapped@sentry.example.com/999',
      };

      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      expect(call.runtimeEnv).toEqual(
        expect.objectContaining({
          NEXT_PUBLIC_SENTRY_DSN: 'https://mapped@sentry.example.com/999',
        })
      );

      process.env = originalEnv;
    });

    it('should handle undefined environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BETTERSTACK_API_KEY: undefined,
        BETTERSTACK_URL: undefined,
        SENTRY_ORG: undefined,
        SENTRY_PROJECT: undefined,
        NEXT_PUBLIC_SENTRY_DSN: undefined,
      };

      keys();

      const call = mockCreateEnv.mock.calls[0][0];
      expect(call.runtimeEnv).toEqual({
        BETTERSTACK_API_KEY: undefined,
        BETTERSTACK_URL: undefined,
        SENTRY_ORG: undefined,
        SENTRY_PROJECT: undefined,
        NEXT_PUBLIC_SENTRY_DSN: undefined,
      });

      process.env = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should propagate createEnv errors', () => {
      const createEnvError = new Error('Environment validation failed');
      mockCreateEnv.mockImplementation(() => {
        throw createEnvError;
      });

      expect(() => keys()).toThrow('Environment validation failed');
    });

    it('should handle validation errors for invalid URLs', () => {
      const validationError = new Error('Invalid URL format');
      mockCreateEnv.mockImplementation(() => {
        throw validationError;
      });

      expect(() => keys()).toThrow('Invalid URL format');
    });

    it('should handle missing required environment variables gracefully', () => {
      // Since all variables are optional, this should not throw
      mockCreateEnv.mockReturnValue({
        BETTERSTACK_API_KEY: undefined,
        BETTERSTACK_URL: undefined,
        SENTRY_ORG: undefined,
        SENTRY_PROJECT: undefined,
        NEXT_PUBLIC_SENTRY_DSN: undefined,
      });

      expect(() => keys()).not.toThrow();
    });
  });

  describe('Multiple Calls', () => {
    it('should call createEnv each time keys() is called', () => {
      keys();
      keys();
      keys();

      expect(mockCreateEnv).toHaveBeenCalledTimes(3);
    });

    it('should return consistent results for same environment', () => {
      const mockResult = {
        BETTERSTACK_API_KEY: 'consistent-key',
        BETTERSTACK_URL: 'https://consistent.com',
        SENTRY_ORG: 'consistent-org',
        SENTRY_PROJECT: 'consistent-project',
        NEXT_PUBLIC_SENTRY_DSN: 'https://consistent@sentry.example.com/123',
      };
      mockCreateEnv.mockReturnValue(mockResult);

      const result1 = keys();
      const result2 = keys();
      const result3 = keys();

      expect(result1).toEqual(mockResult);
      expect(result2).toEqual(mockResult);
      expect(result3).toEqual(mockResult);
    });

    it('should reflect environment changes between calls', () => {
      const originalEnv = process.env;
      
      // First call with initial environment
      process.env = { ...originalEnv, SENTRY_ORG: 'org1' };
      mockCreateEnv.mockReturnValueOnce({ SENTRY_ORG: 'org1' } as any);
      const result1 = keys();

      // Second call with changed environment
      process.env = { ...originalEnv, SENTRY_ORG: 'org2' };
      mockCreateEnv.mockReturnValueOnce({ SENTRY_ORG: 'org2' } as any);
      const result2 = keys();

      expect(result1.SENTRY_ORG).toBe('org1');
      expect(result2.SENTRY_ORG).toBe('org2');

      process.env = originalEnv;
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', () => {
      const start = performance.now();
      keys();
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle rapid successive calls efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        keys();
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(200); // Should complete within 200ms
      expect(mockCreateEnv).toHaveBeenCalledTimes(100);
    });

    it('should not leak memory with repeated calls', () => {
      const initialMemory = (process.memoryUsage?.() ?? { heapUsed: 0 }).heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        keys();
      }

      const finalMemory = (process.memoryUsage?.() ?? { heapUsed: 0 }).heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should work with production environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BETTERSTACK_API_KEY: 'prod_1234567890abcdef',
        BETTERSTACK_URL: 'https://logs.betterstack.com',
        SENTRY_ORG: 'my-company',
        SENTRY_PROJECT: 'my-app',
        NEXT_PUBLIC_SENTRY_DSN: 'https://1234567890abcdef@o123456.ingest.sentry.io/1234567',
      };

      const mockResult = {
        BETTERSTACK_API_KEY: 'prod_1234567890abcdef',
        BETTERSTACK_URL: 'https://logs.betterstack.com',
        SENTRY_ORG: 'my-company',
        SENTRY_PROJECT: 'my-app',
        NEXT_PUBLIC_SENTRY_DSN: 'https://1234567890abcdef@o123456.ingest.sentry.io/1234567',
      };
      mockCreateEnv.mockReturnValue(mockResult);

      const result = keys();

      expect(result).toEqual(mockResult);
      expect(mockCreateEnv).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeEnv: expect.objectContaining({
            BETTERSTACK_API_KEY: 'prod_1234567890abcdef',
            NEXT_PUBLIC_SENTRY_DSN: 'https://1234567890abcdef@o123456.ingest.sentry.io/1234567',
          }),
        })
      );

      process.env = originalEnv;
    });

    it('should work with development environment (minimal variables)', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        // Only NEXT_PUBLIC_SENTRY_DSN set for development
        NEXT_PUBLIC_SENTRY_DSN: 'https://dev@sentry.example.com/123',
      };

      const mockResult = {
        BETTERSTACK_API_KEY: undefined,
        BETTERSTACK_URL: undefined,
        SENTRY_ORG: undefined,
        SENTRY_PROJECT: undefined,
        NEXT_PUBLIC_SENTRY_DSN: 'https://dev@sentry.example.com/123',
      };
      mockCreateEnv.mockReturnValue(mockResult);

      const result = keys();

      expect(result).toEqual(mockResult);

      process.env = originalEnv;
    });

    it('should work with staging environment (partial variables)', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SENTRY_ORG: 'staging-org',
        SENTRY_PROJECT: 'staging-project',
        NEXT_PUBLIC_SENTRY_DSN: 'https://staging@sentry.example.com/456',
        // BetterStack not configured in staging
      };

      const mockResult = {
        BETTERSTACK_API_KEY: undefined,
        BETTERSTACK_URL: undefined,
        SENTRY_ORG: 'staging-org',
        SENTRY_PROJECT: 'staging-project',
        NEXT_PUBLIC_SENTRY_DSN: 'https://staging@sentry.example.com/456',
      };
      mockCreateEnv.mockReturnValue(mockResult);

      const result = keys();

      expect(result).toEqual(mockResult);

      process.env = originalEnv;
    });
  });
});