/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock the t3-env library to avoid server-side restrictions in tests
vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: vi.fn((config) => {
    // Create a mock that validates the schema and returns the runtime values
    const mockEnv = {};
    
    // Validate server schema
    if (config.server) {
      Object.entries(config.server).forEach(([key, schema]) => {
        const value = config.runtimeEnv[key];
        if (value !== undefined) {
          try {
            schema.parse(value);
            mockEnv[key] = value;
          } catch (error) {
            throw new Error(`Invalid environment variables`);
          }
        } else if (!schema._def?.typeName || schema._def.typeName !== 'ZodOptional') {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      });
    }
    
    // Validate client schema  
    if (config.client) {
      Object.entries(config.client).forEach(([key, schema]) => {
        const value = config.runtimeEnv[key];
        if (value !== undefined) {
          try {
            schema.parse(value);
            mockEnv[key] = value;
          } catch (error) {
            throw new Error(`Invalid environment variables`);
          }
        } else {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      });
    }
    
    return mockEnv;
  }),
}));

/**
 * Test suite for environment configuration validation in the auth package
 * 
 * This suite validates:
 * - Environment variable schema validation
 * - Required vs optional field handling
 * - Proper error messages for invalid configurations
 * - Runtime environment integration
 */
describe('Keys Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables that could interfere with tests
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
    delete process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL;
    delete process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL;
    delete process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL;
    
    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('keys() function', () => {
    it('should export a keys function', async () => {
      const { keys } = await import('../keys.js');
      
      expect(keys).toBeDefined();
      expect(typeof keys).toBe('function');
    });

    it('should return environment configuration with all required fields', async () => {
      // Set valid environment variables
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      const config = keys();

      expect(config).toBeDefined();
      expect(config.CLERK_SECRET_KEY).toBe('sk_test_validkey123456789');
      expect(config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe('pk_test_validkey123456789');
      expect(config.NEXT_PUBLIC_CLERK_SIGN_IN_URL).toBe('/sign-in');
      expect(config.NEXT_PUBLIC_CLERK_SIGN_UP_URL).toBe('/sign-up');
      expect(config.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL).toBe('/dashboard');
      expect(config.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL).toBe('/welcome');
    });

    it('should handle optional CLERK_WEBHOOK_SECRET when provided', async () => {
      // Set valid environment variables including optional webhook secret
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_webhook_secret123';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      const config = keys();

      expect(config.CLERK_WEBHOOK_SECRET).toBe('whsec_test_webhook_secret123');
    });

    it('should handle missing optional CLERK_WEBHOOK_SECRET', async () => {
      // Set valid environment variables without optional webhook secret
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      const config = keys();

      expect(config.CLERK_WEBHOOK_SECRET).toBeUndefined();
    });
  });

  describe('Server Environment Validation', () => {
    it('should validate CLERK_SECRET_KEY starts with "sk_"', async () => {
      process.env.CLERK_SECRET_KEY = 'invalid_secret_key';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });

    it('should reject missing CLERK_SECRET_KEY', async () => {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });

    it('should validate CLERK_WEBHOOK_SECRET starts with "whsec_" when provided', async () => {
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.CLERK_WEBHOOK_SECRET = 'invalid_webhook_secret';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });
  });

  describe('Client Environment Validation', () => {
    it('should validate NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY starts with "pk_"', async () => {
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'invalid_publishable_key';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });

    it('should reject missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', async () => {
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });

    it('should validate all URL fields start with "/"', async () => {
      const urlFields = [
        'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
      ];

      for (const field of urlFields) {
        // Reset to valid state
        process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
        process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

        // Set invalid URL for current field
        process.env[field] = 'invalid-url-without-slash';

        const { keys } = await import('../keys.js');
        
        expect(() => keys()).toThrow('Invalid environment variables');
      }
    });

    it('should reject missing required URL fields', async () => {
      const requiredUrlFields = [
        'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_SIGN_UP_URL', 
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
      ];

      for (const field of requiredUrlFields) {
        // Reset to valid state
        process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
        process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

        // Remove the required field
        delete process.env[field];

        const { keys } = await import('../keys.js');
        
        expect(() => keys()).toThrow();
      }
    });
  });

  describe('Runtime Environment Integration', () => {
    it('should properly map process.env values to runtime configuration', async () => {
      const expectedValues = {
        CLERK_SECRET_KEY: 'sk_test_runtime123456789',
        CLERK_WEBHOOK_SECRET: 'whsec_test_runtime123',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_runtime123456789',
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/runtime-sign-in',
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/runtime-sign-up',
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/runtime-dashboard',
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/runtime-welcome',
      };

      // Set environment variables
      Object.entries(expectedValues).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const { keys } = await import('../keys.js');
      const config = keys();

      // Verify all values are correctly mapped
      Object.entries(expectedValues).forEach(([key, expectedValue]) => {
        expect(config[key as keyof typeof config]).toBe(expectedValue);
      });
    });

    it('should handle undefined optional values correctly', async () => {
      // Set required values only
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      // Explicitly ensure webhook secret is undefined
      delete process.env.CLERK_WEBHOOK_SECRET;

      const { keys } = await import('../keys.js');
      const config = keys();

      expect(config.CLERK_WEBHOOK_SECRET).toBeUndefined();
      expect(config.CLERK_SECRET_KEY).toBeDefined();
      expect(config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeDefined();
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle empty string values appropriately', async () => {
      process.env.CLERK_SECRET_KEY = '';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });

    it('should handle whitespace-only values appropriately', async () => {
      process.env.CLERK_SECRET_KEY = '   ';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow();
    });

    it('should handle complex URL paths correctly', async () => {
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/auth/sign-in?redirect=true';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/auth/sign-up?welcome=true';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard?onboarded=true';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome/new-user';

      const { keys } = await import('../keys.js');
      const config = keys();

      expect(config.NEXT_PUBLIC_CLERK_SIGN_IN_URL).toBe('/auth/sign-in?redirect=true');
      expect(config.NEXT_PUBLIC_CLERK_SIGN_UP_URL).toBe('/auth/sign-up?welcome=true');
      expect(config.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL).toBe('/dashboard?onboarded=true');
      expect(config.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL).toBe('/welcome/new-user');
    });

    it('should validate proper Clerk key formats', async () => {
      const validKeyFormats = [
        { key: 'CLERK_SECRET_KEY', validValue: 'sk_test_1234567890abcdef', invalidValue: 'pk_test_1234567890abcdef' },
        { key: 'CLERK_WEBHOOK_SECRET', validValue: 'whsec_test_1234567890abcdef', invalidValue: 'sk_test_1234567890abcdef' },
        { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', validValue: 'pk_test_1234567890abcdef', invalidValue: 'sk_test_1234567890abcdef' },
      ];

      for (const { key, validValue, invalidValue } of validKeyFormats) {
        // Test valid format
        process.env.CLERK_SECRET_KEY = key === 'CLERK_SECRET_KEY' ? validValue : 'sk_test_validkey123456789';
        process.env.CLERK_WEBHOOK_SECRET = key === 'CLERK_WEBHOOK_SECRET' ? validValue : undefined;
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = key === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' ? validValue : 'pk_test_validkey123456789';
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
        process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

        const { keys } = await import('../keys.js');
        expect(() => keys()).not.toThrow();

        // Test invalid format (skip webhook secret as it's optional)
        if (key !== 'CLERK_WEBHOOK_SECRET') {
          process.env[key] = invalidValue;
          expect(() => keys()).toThrow();
        }
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide meaningful error messages for validation failures', async () => {
      // Test secret key validation error
      process.env.CLERK_SECRET_KEY = 'invalid_key';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');

      expect(() => keys()).toThrow('Invalid environment variables');
    });

    it('should provide clear error messages for URL validation failures', async () => {
      process.env.CLERK_SECRET_KEY = 'sk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123456789';
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = 'invalid-url';
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = '/dashboard';
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = '/welcome';

      const { keys } = await import('../keys.js');

      expect(() => keys()).toThrow('Invalid environment variables');
    });
  });
});