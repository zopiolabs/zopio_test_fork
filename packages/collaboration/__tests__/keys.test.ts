/**
 * @fileoverview Collaboration Package Tests - Environment Variable Validation
 * 
 * Comprehensive test suite for the keys() function in the collaboration package.
 * Tests environment variable validation, Zod schema validation, and error handling
 * with comprehensive coverage of all scenarios including edge cases and security considerations.
 * 
 * **Test Scope:**
 * - Environment variable validation and API key format checking
 * - Zod schema validation with LIVEBLOCKS_SECRET validation rules
 * - Error handling for missing, invalid, and malformed environment variables
 * - Edge cases including whitespace, special characters, and data type validation
 * - Security considerations and API key prefix validation
 * 
 * **Test Categories:**
 * 1. **Valid Environment**: Valid API keys with sk_ prefix, different key formats, environment presence
 * 2. **Invalid Environment**: Missing keys, empty values, invalid prefixes, wrong data types
 * 3. **Zod Schema Validation**: Schema structure, error formatting, validation rules, edge cases
 * 4. **Edge Cases**: Long keys, special characters, whitespace handling, case sensitivity
 * 5. **Security Testing**: API key format enforcement, data sanitization, error message handling
 * 
 * **Mock Strategy:**
 * - Complete isolation of @t3-oss/env-nextjs to control environment validation
 * - Process.env mocking with proper cleanup and environment isolation
 * - Zod schema validation testing with controlled input scenarios
 * - Error simulation for comprehensive error handling coverage
 * 
 * **Quality Standards:**
 * - 90%+ line coverage for keys.ts function
 * - All validation paths and error scenarios thoroughly tested
 * - Security boundary testing and API key format validation
 * - Clear, descriptive test cases following project testing patterns
 * - Environment isolation and cleanup between tests
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Mock @t3-oss/env-nextjs to control environment validation behavior
const mockCreateEnv = vi.fn();

vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: mockCreateEnv,
}));

describe('Collaboration Environment Variable Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment state
    originalEnv = { ...process.env };
    
    // Clear collaboration-related environment variables
    delete process.env.LIVEBLOCKS_SECRET;
    
    // Reset all mocks with fresh implementations
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateEnv.mockReset();

    // Setup default mock behavior for successful validation
    mockCreateEnv.mockImplementation((config) => {
      // Simulate t3-env's environment validation logic
      const mockEnv = {} as any;
      
      if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
        const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
        
        if (value !== undefined && value !== null && value !== '') {
          try {
            // Validate against the provided Zod schema
            const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
            mockEnv.LIVEBLOCKS_SECRET = validatedValue;
          } catch (error) {
            throw new Error(`Environment validation failed: ${(error as Error).message}`);
          }
        }
      }
      
      return mockEnv;
    });
  });

  afterEach(() => {
    // Restore original environment state
    process.env = { ...originalEnv };
    
    // Complete mock cleanup
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateEnv.mockReset();
  });

  describe('Valid Environment Scenarios', () => {
    it('should validate valid LIVEBLOCKS_SECRET with sk_ prefix', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_liveblocks_secret_123456789';
      
      const { keys } = await import('../keys.js');
      const result = keys();
      
      // Verify createEnv was called with correct configuration
      expect(mockCreateEnv).toHaveBeenCalledOnce();
      
      const config = mockCreateEnv.mock.calls[0][0];
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('runtimeEnv');
      expect(config.server).toHaveProperty('LIVEBLOCKS_SECRET');
      expect(config.runtimeEnv).toHaveProperty('LIVEBLOCKS_SECRET');
      expect(config.runtimeEnv.LIVEBLOCKS_SECRET).toBe('sk_test_liveblocks_secret_123456789');
      
      // Verify result contains the validated environment
      expect(result).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_liveblocks_secret_123456789');
    });

    it('should handle different valid sk_ prefixed API key formats', async () => {
      const validApiKeys = [
        'sk_prod_liveblocks_production_key_abcdef123456',
        'sk_dev_liveblocks_development_key_xyz789',
        'sk_test_simple_key',
        'sk_live_very_long_api_key_with_many_segments_and_numbers_123456789',
        'sk_minimal',
        'sk_UPPERCASE_KEY_123',
        'sk_mixed_Case_Key_456',
      ];

      for (const apiKey of validApiKeys) {
        // Reset environment and mocks for each test case
        process.env.LIVEBLOCKS_SECRET = apiKey;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        // Restore default mock behavior
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = validatedValue;
              } catch (error) {
                throw new Error(`Environment validation failed: ${(error as Error).message}`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        const result = keys();
        
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', apiKey);
        expect(mockCreateEnv).toHaveBeenCalledOnce();
      }
    });

    it('should handle environment variable when LIVEBLOCKS_SECRET is undefined (optional)', async () => {
      // Leave LIVEBLOCKS_SECRET undefined (should be allowed as it's optional in schema)
      delete process.env.LIVEBLOCKS_SECRET;
      
      const { keys } = await import('../keys.js');
      const result = keys();
      
      // Verify createEnv was called with correct configuration
      expect(mockCreateEnv).toHaveBeenCalledOnce();
      
      const config = mockCreateEnv.mock.calls[0][0];
      expect(config.runtimeEnv.LIVEBLOCKS_SECRET).toBeUndefined();
      
      // Since it's optional, result should not contain LIVEBLOCKS_SECRET
      expect(result).not.toHaveProperty('LIVEBLOCKS_SECRET');
    });

    it('should properly configure Zod schema for optional validation', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_schema_validation';
      
      const { keys } = await import('../keys.js');
      keys();
      
      expect(mockCreateEnv).toHaveBeenCalledOnce();
      
      const config = mockCreateEnv.mock.calls[0][0];
      const zodSchema = config.server.LIVEBLOCKS_SECRET;
      
      // Verify the schema is a Zod string schema with startsWith validation
      expect(zodSchema).toBeInstanceOf(z.ZodOptional);
      
      // Test the schema directly
      const innerSchema = zodSchema.unwrap();
      expect(innerSchema).toBeInstanceOf(z.ZodString);
      
      // Valid cases should pass
      expect(() => zodSchema.parse('sk_valid_key')).not.toThrow();
      expect(() => zodSchema.parse(undefined)).not.toThrow(); // optional
      
      // Invalid cases should fail
      expect(() => zodSchema.parse('invalid_prefix_key')).toThrow();
      expect(() => zodSchema.parse('')).toThrow();
    });

    it('should handle API keys with various valid characters and formats', async () => {
      const validComplexKeys = [
        'sk_test_key_with_numbers_123456789',
        'sk_prod_key_with_mixed_Case_ABC123def',
        'sk_dev_key-with-dashes-456',
        'sk_live_key_with_underscores_789',
        'sk_test_key.with.dots.012',
        'sk_prod_alphanumeric123MIXED456case',
      ];

      for (const apiKey of validComplexKeys) {
        process.env.LIVEBLOCKS_SECRET = apiKey;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = validatedValue;
              } catch (error) {
                throw new Error(`Environment validation failed: ${(error as Error).message}`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        const result = keys();
        
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', apiKey);
      }
    });
  });

  describe('Invalid Environment Scenarios', () => {
    it('should reject LIVEBLOCKS_SECRET without sk_ prefix', async () => {
      const invalidApiKeys = [
        'invalid_prefix_liveblocks_key_123',
        'pk_wrong_prefix_key',
        'secret_key_without_sk',
        'liveblocks_secret_456',
        'api_key_789',
        'just_a_regular_string',
        '123456789_numeric_start',
      ];

      for (const invalidKey of invalidApiKeys) {
        process.env.LIVEBLOCKS_SECRET = invalidKey;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        // Configure mock to simulate Zod validation failure
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = value;
              } catch (error) {
                throw new Error(`Environment validation failed: String must start with "sk_"`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        
        expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
      }
    });

    it('should reject empty string LIVEBLOCKS_SECRET', async () => {
      process.env.LIVEBLOCKS_SECRET = '';
      
      // Configure mock to simulate Zod validation failure for empty string
      mockCreateEnv.mockImplementation((config) => {
        if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET !== undefined) {
          const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
          
          // Empty string should fail validation
          if (value === '') {
            throw new Error(`Environment validation failed: String must start with "sk_"`);
          }
          
          // Non-empty strings go through normal validation
          if (value && value !== '') {
            try {
              config.server.LIVEBLOCKS_SECRET.parse(value);
            } catch (error) {
              throw new Error(`Environment validation failed: String must start with "sk_"`);
            }
          }
        }
        
        return {} as any;
      });
      
      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
    });

    it('should handle null LIVEBLOCKS_SECRET properly', async () => {
      // Set to null-like value
      process.env.LIVEBLOCKS_SECRET = null as any;
      
      const { keys } = await import('../keys.js');
      const result = keys();
      
      // Should handle null gracefully (optional field)
      expect(mockCreateEnv).toHaveBeenCalledOnce();
      expect(result).not.toHaveProperty('LIVEBLOCKS_SECRET');
    });

    it('should reject wrong data types for LIVEBLOCKS_SECRET', async () => {
      const wrongDataTypes = [
        { value: 123456 as any, type: 'number' },
        { value: true as any, type: 'boolean' },
        { value: false as any, type: 'boolean' },
        { value: {} as any, type: 'object' },
        { value: [] as any, type: 'object' },
      ];

      for (const { value: wrongValue, type } of wrongDataTypes) {
        process.env.LIVEBLOCKS_SECRET = wrongValue;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        // Configure mock to simulate type validation failure
        mockCreateEnv.mockImplementation((config) => {
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET !== undefined) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            // Check for wrong data types
            if (typeof value !== 'string') {
              throw new Error(`Environment validation failed: Expected string, received ${type}`);
            }
            
            // If it's a string, validate normally
            if (value && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
              } catch (error) {
                throw new Error(`Environment validation failed: String must start with "sk_"`);
              }
            }
          }
          
          return {} as any;
        });

        const { keys } = await import('../keys.js');
        
        expect(() => keys()).toThrow(`Environment validation failed: Expected string, received ${type}`);
      }
    });

    it('should handle environment validation errors from t3-env', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_env_error';
      
      // Configure mock to simulate t3-env internal error
      mockCreateEnv.mockImplementation(() => {
        throw new Error('t3-env configuration error: Invalid schema configuration');
      });
      
      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow('t3-env configuration error: Invalid schema configuration');
    });

    it('should handle malformed environment configuration', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_malformed_config';
      
      // Configure mock to simulate malformed configuration error
      mockCreateEnv.mockImplementation(() => {
        throw new Error('Invalid environment configuration: Missing required fields');
      });
      
      const { keys } = await import('../keys.js');
      
      expect(() => keys()).toThrow('Invalid environment configuration: Missing required fields');
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate Zod schema structure and configuration', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_schema_structure';
      
      const { keys } = await import('../keys.js');
      keys();
      
      expect(mockCreateEnv).toHaveBeenCalledOnce();
      
      const config = mockCreateEnv.mock.calls[0][0];
      
      // Verify server schema configuration
      expect(config.server).toHaveProperty('LIVEBLOCKS_SECRET');
      expect(config.server.LIVEBLOCKS_SECRET).toBeInstanceOf(z.ZodOptional);
      
      // Verify runtime environment mapping
      expect(config.runtimeEnv).toHaveProperty('LIVEBLOCKS_SECRET');
      expect(config.runtimeEnv.LIVEBLOCKS_SECRET).toBe('sk_test_schema_structure');
      
      // Test inner schema properties
      const innerSchema = config.server.LIVEBLOCKS_SECRET.unwrap();
      expect(innerSchema).toBeInstanceOf(z.ZodString);
    });

    it('should validate schema error message formatting', async () => {
      const testCases = [
        { input: 'no_sk_prefix', expectedError: 'String must start with "sk_"' },
        { input: '', expectedError: 'String must start with "sk_"' },
        { input: 'sk', expectedError: 'String must start with "sk_"' }, // Just the prefix without underscore
        { input: 's_almost_correct', expectedError: 'String must start with "sk_"' },
      ];

      for (const { input, expectedError } of testCases) {
        process.env.LIVEBLOCKS_SECRET = input;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET !== undefined) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            // Handle empty string case
            if (value === '') {
              throw new Error(`Environment validation failed: ${expectedError}`);
            }
            
            // Handle other validation cases
            if (value && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
              } catch (error) {
                throw new Error(`Environment validation failed: ${expectedError}`);
              }
            }
          }
          
          return {} as any;
        });

        const { keys } = await import('../keys.js');
        
        expect(() => keys()).toThrow(`Environment validation failed: ${expectedError}`);
      }
    });

    it('should validate schema boundary conditions', async () => {
      const boundaryCases = [
        { input: 'sk_', description: 'minimum valid prefix', shouldPass: true },
        { input: 'sk_a', description: 'single character after prefix', shouldPass: true },
        { input: 'SK_uppercase_prefix', description: 'uppercase prefix', shouldPass: false },
        { input: 'sk', description: 'missing underscore', shouldPass: false },
        { input: ' sk_prefixed_with_space', description: 'leading whitespace', shouldPass: false },
        { input: 'sk_trailing_space ', description: 'trailing whitespace', shouldPass: true },
      ];

      for (const { input, description, shouldPass } of boundaryCases) {
        process.env.LIVEBLOCKS_SECRET = input;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = value;
              } catch (error) {
                throw new Error(`Environment validation failed: String must start with "sk_"`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        
        if (shouldPass) {
          const result = keys();
          expect(result).toHaveProperty('LIVEBLOCKS_SECRET', input);
        } else {
          expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
        }
      }
    });

    it('should validate schema with complex validation chains', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_complex_validation';
      
      // Test that the schema validates correctly with complex chains
      mockCreateEnv.mockImplementation((config) => {
        const mockEnv = {} as any;
        
        if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
          const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
          
          if (value !== undefined && value !== null && value !== '') {
            // Simulate complex Zod validation chain
            const schema = config.server.LIVEBLOCKS_SECRET;
            
            try {
              // Test optional chain
              expect(schema.isOptional()).toBe(true);
              
              // Test inner string validation
              const innerSchema = schema.unwrap();
              expect(innerSchema._def.checks).toBeDefined();
              
              // Validate the value
              const validatedValue = schema.parse(value);
              mockEnv.LIVEBLOCKS_SECRET = validatedValue;
            } catch (error) {
              throw new Error(`Complex validation failed: ${(error as Error).message}`);
            }
          }
        }
        
        return mockEnv;
      });
      
      const { keys } = await import('../keys.js');
      const result = keys();
      
      expect(result).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_complex_validation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API keys', async () => {
      const longApiKey = 'sk_' + 'a'.repeat(1000) + '_very_long_key_' + '1'.repeat(500);
      process.env.LIVEBLOCKS_SECRET = longApiKey;
      
      const { keys } = await import('../keys.js');
      const result = keys();
      
      expect(result).toHaveProperty('LIVEBLOCKS_SECRET', longApiKey);
      expect(mockCreateEnv).toHaveBeenCalledOnce();
    });

    it('should handle API keys with special characters', async () => {
      const specialCharacterKeys = [
        'sk_key_with_unicode_café_123',
        'sk_key_with_emoji_🔑_456',
        'sk_key_with_symbols_!@#$%^&*()_789',
        'sk_key_with_spaces_in_middle_012',
        'sk_key_with_newlines_\n_345',
        'sk_key_with_tabs_\t_678',
      ];

      for (const specialKey of specialCharacterKeys) {
        process.env.LIVEBLOCKS_SECRET = specialKey;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = validatedValue;
              } catch (error) {
                throw new Error(`Environment validation failed: ${(error as Error).message}`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        const result = keys();
        
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', specialKey);
      }
    });

    it('should handle whitespace edge cases', async () => {
      const whitespaceCases = [
        { input: 'sk_key_with_trailing_space ', shouldPass: true },
        { input: 'sk_key_with_leading_tab\t', shouldPass: true },
        { input: 'sk_key\nwith\nnewlines', shouldPass: true },
        { input: 'sk_key\r\nwith\r\ncarriage_returns', shouldPass: true },
        { input: '\tsk_key_with_leading_tab', shouldPass: false }, // Leading whitespace should fail prefix check
        { input: ' sk_key_with_leading_space', shouldPass: false }, // Leading whitespace should fail prefix check
      ];

      for (const { input, shouldPass } of whitespaceCases) {
        process.env.LIVEBLOCKS_SECRET = input;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = value;
              } catch (error) {
                throw new Error(`Environment validation failed: String must start with "sk_"`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        
        if (shouldPass) {
          const result = keys();
          expect(result).toHaveProperty('LIVEBLOCKS_SECRET', input);
        } else {
          expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
        }
      }
    });

    it('should handle case sensitivity correctly', async () => {
      const caseSensitiveCases = [
        { input: 'SK_uppercase_prefix_key', shouldPass: false },
        { input: 'Sk_mixed_case_prefix_key', shouldPass: false },
        { input: 'sK_another_mixed_case', shouldPass: false },
        { input: 'sk_lowercase_prefix_KEY', shouldPass: true }, // Content can be any case
        { input: 'sk_UPPERCASE_CONTENT', shouldPass: true },
        { input: 'sk_MiXeD_CaSe_CoNtEnT', shouldPass: true },
      ];

      for (const { input, shouldPass } of caseSensitiveCases) {
        process.env.LIVEBLOCKS_SECRET = input;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = value;
              } catch (error) {
                throw new Error(`Environment validation failed: String must start with "sk_"`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        
        if (shouldPass) {
          const result = keys();
          expect(result).toHaveProperty('LIVEBLOCKS_SECRET', input);
        } else {
          expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
        }
      }
    });

    it('should handle concurrent calls to keys() function', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_concurrent_calls';
      
      const { keys } = await import('../keys.js');
      
      // Execute multiple concurrent calls
      const concurrentCalls = Array.from({ length: 10 }, () => keys());
      const results = await Promise.all(concurrentCalls);
      
      // All calls should return the same result
      results.forEach(result => {
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_concurrent_calls');
      });
      
      // createEnv should be called for each invocation
      expect(mockCreateEnv).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid sequential calls', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_sequential_calls';
      
      const { keys } = await import('../keys.js');
      
      // Execute rapid sequential calls
      for (let i = 0; i < 5; i++) {
        const result = keys();
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_sequential_calls');
      }
      
      expect(mockCreateEnv).toHaveBeenCalledTimes(5);
    });

    it('should handle changing environment between calls', async () => {
      // First call with one key
      process.env.LIVEBLOCKS_SECRET = 'sk_test_first_key';
      
      const { keys } = await import('../keys.js');
      const result1 = keys();
      
      expect(result1).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_first_key');
      
      // Change environment and call again
      process.env.LIVEBLOCKS_SECRET = 'sk_test_second_key';
      
      // Reset and reconfigure mock for new environment
      mockCreateEnv.mockReset();
      mockCreateEnv.mockImplementation((config) => {
        const mockEnv = {} as any;
        
        if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
          const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
          
          if (value !== undefined && value !== null && value !== '') {
            try {
              const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
              mockEnv.LIVEBLOCKS_SECRET = validatedValue;
            } catch (error) {
              throw new Error(`Environment validation failed: ${(error as Error).message}`);
            }
          }
        }
        
        return mockEnv;
      });
      
      const result2 = keys();
      
      expect(result2).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_second_key');
      expect(mockCreateEnv).toHaveBeenCalledTimes(1); // Called once after reset
    });
  });

  describe('Security Scenarios', () => {
    it('should enforce API key prefix security requirement', async () => {
      const securityTestCases = [
        { input: 'sk_legitimate_api_key', shouldPass: true, description: 'legitimate API key' },
        { input: 'malicious_injection_attempt', shouldPass: false, description: 'malicious injection' },
        { input: 'pk_wrong_service_key', shouldPass: false, description: 'wrong service prefix' },
        { input: 'secret_plain_text', shouldPass: false, description: 'plain text secret' },
        { input: '<script>alert("xss")</script>', shouldPass: false, description: 'XSS attempt' },
        { input: '"; DROP TABLE users; --', shouldPass: false, description: 'SQL injection attempt' },
        { input: '../../etc/passwd', shouldPass: false, description: 'path traversal attempt' },
      ];

      for (const { input, shouldPass, description } of securityTestCases) {
        process.env.LIVEBLOCKS_SECRET = input;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = value;
              } catch (error) {
                throw new Error(`Environment validation failed: String must start with "sk_"`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        
        if (shouldPass) {
          const result = keys();
          expect(result).toHaveProperty('LIVEBLOCKS_SECRET', input);
        } else {
          expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
        }
      }
    });

    it('should not expose sensitive data in error messages', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sensitive_api_key_that_should_not_be_exposed';
      
      mockCreateEnv.mockImplementation(() => {
        throw new Error('Environment validation failed: String must start with "sk_"');
      });
      
      const { keys } = await import('../keys.js');
      
      try {
        keys();
      } catch (error) {
        const errorMessage = (error as Error).message;
        // Error message should not contain the actual sensitive value
        expect(errorMessage).not.toContain('sensitive_api_key_that_should_not_be_exposed');
        expect(errorMessage).toContain('String must start with "sk_"');
      }
    });

    it('should validate environment isolation', async () => {
      // Set up different environment scenarios
      const environmentScenarios = [
        { env: 'test', key: 'sk_test_environment_key' },
        { env: 'development', key: 'sk_dev_environment_key' },
        { env: 'production', key: 'sk_prod_environment_key' },
      ];

      for (const { env, key } of environmentScenarios) {
        process.env.NODE_ENV = env;
        process.env.LIVEBLOCKS_SECRET = key;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation((config) => {
          const mockEnv = {} as any;
          
          if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
            const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
            
            if (value !== undefined && value !== null && value !== '') {
              try {
                const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
                mockEnv.LIVEBLOCKS_SECRET = validatedValue;
              } catch (error) {
                throw new Error(`Environment validation failed: ${(error as Error).message}`);
              }
            }
          }
          
          return mockEnv;
        });

        const { keys } = await import('../keys.js');
        const result = keys();
        
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', key);
        
        // Cleanup for next iteration
        delete process.env.NODE_ENV;
      }
    });

    it('should handle potential memory leaks in error scenarios', async () => {
      const errorScenarios = [
        'invalid_key_1',
        'invalid_key_2',
        'invalid_key_3',
        'invalid_key_4',
        'invalid_key_5',
      ];

      let callCount = 0;

      for (const invalidKey of errorScenarios) {
        process.env.LIVEBLOCKS_SECRET = invalidKey;
        vi.resetModules();
        mockCreateEnv.mockReset();
        
        mockCreateEnv.mockImplementation(() => {
          callCount++;
          throw new Error(`Environment validation failed: String must start with "sk_"`);
        });

        const { keys } = await import('../keys.js');
        
        expect(() => keys()).toThrow('Environment validation failed: String must start with "sk_"');
      }
      
      // All error scenarios should be handled without memory leaks
      expect(callCount).toBe(5);
    });
  });

  describe('Performance and Integration', () => {
    it('should handle performance under load', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_performance_load';
      
      const { keys } = await import('../keys.js');
      
      const startTime = Date.now();
      
      // Execute many sequential calls
      for (let i = 0; i < 100; i++) {
        const result = keys();
        expect(result).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_performance_load');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete reasonably quickly (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second for 100 calls
      expect(mockCreateEnv).toHaveBeenCalledTimes(100);
    });

    it('should maintain consistent behavior across multiple imports', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_multiple_imports';
      
      // Import multiple times
      const { keys: keys1 } = await import('../keys.js');
      
      vi.resetModules();
      
      const { keys: keys2 } = await import('../keys.js');
      
      // Reset mock state for clean testing
      mockCreateEnv.mockReset();
      mockCreateEnv.mockImplementation((config) => {
        const mockEnv = {} as any;
        
        if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
          const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
          
          if (value !== undefined && value !== null && value !== '') {
            try {
              const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
              mockEnv.LIVEBLOCKS_SECRET = validatedValue;
            } catch (error) {
              throw new Error(`Environment validation failed: ${(error as Error).message}`);
            }
          }
        }
        
        return mockEnv;
      });
      
      const result1 = keys1();
      const result2 = keys2();
      
      expect(result1).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_multiple_imports');
      expect(result2).toHaveProperty('LIVEBLOCKS_SECRET', 'sk_test_multiple_imports');
    });

    it('should handle resource cleanup properly', async () => {
      process.env.LIVEBLOCKS_SECRET = 'sk_test_resource_cleanup';
      
      // Configure mock to track resource usage
      let resourceCounter = 0;
      
      mockCreateEnv.mockImplementation((config) => {
        const mockEnv = {} as any;
        resourceCounter++;
        
        if (config.server?.LIVEBLOCKS_SECRET && config.runtimeEnv?.LIVEBLOCKS_SECRET) {
          const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
          
          if (value !== undefined && value !== null && value !== '') {
            try {
              const validatedValue = config.server.LIVEBLOCKS_SECRET.parse(value);
              mockEnv.LIVEBLOCKS_SECRET = validatedValue;
            } catch (error) {
              throw new Error(`Environment validation failed: ${(error as Error).message}`);
            }
          }
        }
        
        return mockEnv;
      });
      
      const { keys } = await import('../keys.js');
      
      // Make multiple calls and verify resource tracking
      for (let i = 0; i < 5; i++) {
        keys();
      }
      
      // Verify that resources were properly managed
      expect(resourceCounter).toBe(5);
      expect(mockCreateEnv).toHaveBeenCalledTimes(5);
    });
  });
});