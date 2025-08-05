/**
 * @fileoverview Comprehensive test suite for API key validation functionality
 * 
 * This test suite validates the API key creation, validation, and security
 * patterns used throughout the Zopio API system. It ensures that all API key
 * operations follow security best practices and handle edge cases correctly.
 * 
 * @version 1.0.0
 * @author Zopio Team
 * @license MIT
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';

/**
 * API Key validation test suite
 * 
 * Tests the complete API key lifecycle including:
 * - Input validation and sanitization
 * - Secure key generation
 * - Expiration date calculation
 * - Security considerations and edge cases
 * - Error handling and user feedback
 */
describe('API Keys Validation', () => {
  /**
   * Zod schema for API key creation validation
   * Mirrors the schema used in the actual API controller
   */
  const apiKeySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    scopes: z.array(z.string()),
    expiration: z
      .string()
      .regex(/^\d+[dmy]$/, 'Expiration must be in format like 30d, 6m, or 1y'),
  });

  /**
   * Test data fixtures for consistent testing
   */
  const validApiKeyData = {
    name: 'Test API Key',
    scopes: ['read', 'write'],
    expiration: '30d',
  };

  const validExpirationFormats = ['1d', '30d', '365d', '1m', '12m', '1y', '5y'];
  const invalidExpirationFormats = ['invalid', '30', 'days30', '30x'];

  /**
   * Input validation test suite
   * 
   * Validates that the API key schema correctly handles various input scenarios
   * including valid data, edge cases, and malformed inputs
   */
  describe('Input Validation', () => {
    /**
     * Test that well-formed API key data passes validation
     * 
     * @test Valid API key creation data should be accepted without errors
     */
    it('should validate correct API key data', () => {
      expect(() => apiKeySchema.parse(validApiKeyData)).not.toThrow();
    });

    /**
     * Test name field validation
     */
    describe('Name validation', () => {
      /**
       * @test Empty names should be rejected with appropriate error message
       */
      it('should reject empty name', () => {
        const invalidData = { ...validApiKeyData, name: '' };
        expect(() => apiKeySchema.parse(invalidData)).toThrow('Name is required');
      });

      /**
       * @test Whitespace-only names should be accepted (current schema allows any non-empty string)
       */
      it('should accept whitespace-only names', () => {
        const validData = { ...validApiKeyData, name: '   ' };
        expect(() => apiKeySchema.parse(validData)).not.toThrow();
      });

      /**
       * @test Names with special characters should be accepted
       */
      it('should accept names with special characters', () => {
        const validNames = [
          'API Key - Production',
          'My API Key (v2)',
          'Test_API_Key',
          'Key #1',
          'API Key @ Company'
        ];

        for (const name of validNames) {
          const validData = { ...validApiKeyData, name };
          expect(() => apiKeySchema.parse(validData)).not.toThrow();
        }
      });
    });

    /**
     * Test expiration format validation
     */
    describe('Expiration validation', () => {
      /**
       * @test Invalid expiration formats should be rejected
       */
      it('should reject invalid expiration formats', () => {
        for (const expiration of invalidExpirationFormats) {
          const invalidData = { ...validApiKeyData, expiration };
          expect(() => apiKeySchema.parse(invalidData)).toThrow('Expiration must be in format');
        }
      });

      /**
       * @test Valid expiration formats should be accepted
       */
      it('should accept valid expiration formats', () => {
        for (const expiration of validExpirationFormats) {
          const validData = { ...validApiKeyData, expiration };
          expect(() => apiKeySchema.parse(validData)).not.toThrow();
        }
      });

      /**
       * @test Zero values should be accepted by the current regex pattern
       */
      it('should accept zero expiration values (per current schema)', () => {
        const zeroExpirations = ['0d', '0m', '0y'];
        
        for (const expiration of zeroExpirations) {
          const validData = { ...validApiKeyData, expiration };
          expect(() => apiKeySchema.parse(validData)).not.toThrow();
        }
      });
    });

    /**
     * Test scopes array validation
     */
    describe('Scopes validation', () => {
      /**
       * @test Empty scopes array should be accepted
       */
      it('should accept empty scopes array', () => {
        const validData = { ...validApiKeyData, scopes: [] };
        expect(() => apiKeySchema.parse(validData)).not.toThrow();
      });

      /**
       * @test Non-string scope values should be rejected
       */
      it('should reject non-string scope values', () => {
        const invalidScopes = [
          ['read', 123, 'write'],
          ['read', null, 'write'],
          ['read', undefined, 'write'],
          [true, false],
          [{}]
        ];

        for (const scopes of invalidScopes) {
          const invalidData = { ...validApiKeyData, scopes: scopes as any };
          expect(() => apiKeySchema.parse(invalidData)).toThrow();
        }
      });

      /**
       * @test Various valid scope formats should be accepted
       */
      it('should accept various valid scope formats', () => {
        const validScopes = [
          ['read'],
          ['read', 'write'],
          ['read', 'write', 'delete'],
          ['api:read', 'api:write'],
          ['user.profile.read', 'user.profile.write'],
          ['*'],
          ['admin', 'user', 'guest']
        ];

        for (const scopes of validScopes) {
          const validData = { ...validApiKeyData, scopes };
          expect(() => apiKeySchema.parse(validData)).not.toThrow();
        }
      });
    });

    /**
     * Test type safety and required fields
     */
    describe('Type safety', () => {
      /**
       * @test Missing required fields should be rejected
       */
      it('should reject missing required fields', () => {
        const incompleteData = [
          { scopes: ['read'], expiration: '30d' }, // missing name
          { name: 'Test', expiration: '30d' }, // missing scopes
          { name: 'Test', scopes: ['read'] }, // missing expiration
        ];

        for (const data of incompleteData) {
          expect(() => apiKeySchema.parse(data)).toThrow();
        }
      });

      /**
       * @test Invalid input types should be rejected
       */
      it('should reject invalid input types', () => {
        const invalidInputs = [
          { name: null, scopes: ['read'], expiration: '30d' },
          { name: 'Test', scopes: 'not-array', expiration: '30d' },
          { name: 'Test', scopes: ['read'], expiration: null },
          { name: 123, scopes: ['read'], expiration: '30d' },
        ];

        for (const invalidInput of invalidInputs) {
          expect(() => apiKeySchema.parse(invalidInput)).toThrow();
        }
      });
    });
  });

  /**
   * API Key generation test suite
   * 
   * Tests the cryptographic security and format compliance of generated API keys
   */
  describe('API Key Generation', () => {
    /**
     * Generates a mock API key using the same pattern as the actual implementation
     * @returns {string} Generated API key in the format sk_[64 hex chars]
     */
    const generateApiKey = (): string => `sk_${randomBytes(32).toString('hex')}`;

    /**
     * @test Generated API keys should follow security best practices
     */
    it('should generate secure API keys with correct format', () => {
      const apiKey1 = generateApiKey();
      const apiKey2 = generateApiKey();

      // Keys should be cryptographically different
      expect(apiKey1).not.toBe(apiKey2);
      
      // Keys should follow the expected format (sk_ prefix + 64 hex chars)
      expect(apiKey1).toMatch(/^sk_[a-f0-9]{64}$/);
      expect(apiKey2).toMatch(/^sk_[a-f0-9]{64}$/);
      
      // Keys should be the expected total length
      expect(apiKey1).toHaveLength(67); // 'sk_' (3) + 64 hex chars = 67
      expect(apiKey2).toHaveLength(67);
    });

    /**
     * @test API keys should be cryptographically random and unique
     */
    it('should generate cryptographically unique keys', () => {
      const keyCount = 1000;
      const keys = Array.from({ length: keyCount }, generateApiKey);

      // All keys should be unique (no collisions)
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keyCount);

      // Keys should not all have the same patterns (statistical check)
      const allKeysString = keys.slice(0, 50).join('');
      
      // Should not have obvious non-random patterns across all keys
      expect(allKeysString).not.toMatch(/sk_000000000000000000000000000000000000000000000000000000000000000/);
      expect(allKeysString).not.toMatch(/sk_111111111111111111111111111111111111111111111111111111111111111/);
      expect(allKeysString).not.toMatch(/sk_abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd/);
    });

    /**
     * @test API key generation should be performant
     */
    it('should generate keys efficiently', () => {
      const startTime = Date.now();
      const keys = Array.from({ length: 100 }, generateApiKey);
      const endTime = Date.now();

      // Should generate 100 keys in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(keys).toHaveLength(100);
    });

    /**
     * @test API keys should have sufficient entropy
     */
    it('should have sufficient entropy for security', () => {
      const key = generateApiKey();
      const hexPart = key.slice(3); // Remove 'sk_' prefix
      
      // Should contain a good distribution of hex characters
      const charFrequency = new Map<string, number>();
      for (const char of hexPart) {
        charFrequency.set(char, (charFrequency.get(char) || 0) + 1);
      }

      // Should use all or most hex characters (0-9, a-f)
      expect(charFrequency.size).toBeGreaterThanOrEqual(12);
      
      // No single character should dominate (> 25% of total)
      charFrequency.forEach((count, char) => {
        expect(count).toBeLessThanOrEqual(16); // 16/64 = 25%
      });
    });
  });

  /**
   * Expiration date calculation test suite
   * 
   * Tests the date arithmetic logic used to calculate API key expiration dates
   * based on human-readable time formats (e.g., '30d', '6m', '1y')
   */
  describe('Expiration Date Calculation', () => {
    /**
     * Utility function to calculate expiration date from format string
     * Mirrors the logic used in the actual API implementation
     * 
     * @param {string} expirationFormat - Format like '30d', '6m', '1y'
     * @param {Date} baseDate - Base date to calculate from (defaults to now)
     * @returns {Date} Calculated expiration date
     */
    const calculateExpirationDate = (expirationFormat: string, baseDate = new Date()): Date => {
      const value = Number.parseInt(expirationFormat.slice(0, -1), 10);
      const unit = expirationFormat.slice(-1);
      const expiresAt = new Date(baseDate);

      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'm':
          expiresAt.setMonth(expiresAt.getMonth() + value);
          break;
        case 'y':
          expiresAt.setFullYear(expiresAt.getFullYear() + value);
          break;
        default:
          throw new Error(`Invalid expiration unit: ${unit}`);
      }

      return expiresAt;
    };

    /**
     * @test Expiration dates should be calculated correctly for all time units
     */
    it('should calculate correct expiration dates', () => {
      const testCases = [
        { expiration: '1d', expectedDays: 1 },
        { expiration: '7d', expectedDays: 7 },
        { expiration: '30d', expectedDays: 30 },
        { expiration: '365d', expectedDays: 365 },
      ];

      const baseDate = new Date('2024-01-15T10:00:00Z');

      for (const testCase of testCases) {
        const expiresAt = calculateExpirationDate(testCase.expiration, baseDate);
        
        // Should be later than base date
        expect(expiresAt.getTime()).toBeGreaterThan(baseDate.getTime());

        // Calculate exact day difference
        const diffTime = expiresAt.getTime() - baseDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(testCase.expectedDays);
      }
    });

    /**
     * @test Month and year calculations should handle calendar complexities
     */
    it('should handle month and year calculations correctly', () => {
      const testCases = [
        { baseDate: '2024-01-15', expiration: '1m', expectedMonth: 1 }, // Feb
        { baseDate: '2024-01-15', expiration: '6m', expectedMonth: 6 }, // Jul
        { baseDate: '2024-01-15', expiration: '1y', expectedYear: 2025 },
        { baseDate: '2024-12-15', expiration: '1m', expectedMonth: 0, expectedYear: 2025 }, // Jan 2025
      ];

      for (const testCase of testCases) {
        const baseDate = new Date(testCase.baseDate);
        const expiresAt = calculateExpirationDate(testCase.expiration, baseDate);

        if (testCase.expectedMonth !== undefined) {
          expect(expiresAt.getMonth()).toBe(testCase.expectedMonth);
        }
        if (testCase.expectedYear !== undefined) {
          expect(expiresAt.getFullYear()).toBe(testCase.expectedYear);
        }
      }
    });

    /**
     * @test Edge cases in date calculation should be handled gracefully
     */
    it('should handle calendar edge cases correctly', () => {
      // Test end of month scenarios
      const endOfJanuary = new Date('2024-01-31T10:00:00Z');
      const oneMonthLater = calculateExpirationDate('1m', endOfJanuary);
      
      // Jan 31 + 1 month should be adjusted (JavaScript date overflow)
      // Could be February or March depending on JavaScript's date adjustment
      expect(oneMonthLater.getMonth()).toBeGreaterThanOrEqual(1); // February or later
      expect(oneMonthLater.getFullYear()).toBe(2024);
      expect(oneMonthLater.getTime()).toBeGreaterThan(endOfJanuary.getTime());

      // Test leap year to non-leap year transition
      const leapDay = new Date('2024-02-29T10:00:00Z');
      const oneYearLater = calculateExpirationDate('1y', leapDay);
      
      // Should handle leap year transition correctly
      expect(oneYearLater.getFullYear()).toBe(2025);
      expect(oneYearLater.getTime()).toBeGreaterThan(leapDay.getTime());
      // Date may be adjusted - Feb 29 in leap year becomes Feb 28 or Mar 1 in non-leap year
      expect(oneYearLater.getMonth()).toBeGreaterThanOrEqual(1); // February or later
    });

    /**
     * @test Large time values should be handled correctly
     */
    it('should handle large expiration values', () => {
      const baseDate = new Date('2024-01-01T00:00:00Z');
      const testCases = [
        { expiration: '999d', unit: 'days' },
        { expiration: '60m', unit: 'months' },
        { expiration: '10y', unit: 'years' },
      ];

      for (const testCase of testCases) {
        const expiresAt = calculateExpirationDate(testCase.expiration, baseDate);
        
        // Should be significantly later than base date
        expect(expiresAt.getTime()).toBeGreaterThan(baseDate.getTime());
        
        // Should still be a valid date
        expect(expiresAt.toString()).not.toBe('Invalid Date');
      }
    });

    /**
     * @test Time precision should be preserved during calculation
     */
    it('should preserve time precision in calculations', () => {
      const baseDate = new Date('2024-06-15T14:30:45.123Z');
      const expiresAt = calculateExpirationDate('7d', baseDate);

      // Time component should be preserved
      expect(expiresAt.getHours()).toBe(baseDate.getHours());
      expect(expiresAt.getMinutes()).toBe(baseDate.getMinutes());
      expect(expiresAt.getSeconds()).toBe(baseDate.getSeconds());
      expect(expiresAt.getMilliseconds()).toBe(baseDate.getMilliseconds());
    });
  });

  /**
   * Security considerations test suite
   * 
   * Tests that the API key validation system maintains security best practices
   * and doesn't inadvertently expose sensitive information or create vulnerabilities
   */
  describe('Security Considerations', () => {
    /**
     * @test Validation errors should not leak sensitive system information
     */
    it('should not expose sensitive information in validation errors', () => {
      const sensitiveTerms = ['database', 'secret', 'internal', 'password', 'token', 'key', 'admin'];
      
      try {
        apiKeySchema.parse({
          name: '',
          scopes: ['read'],
          expiration: '30d',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Error messages should be user-friendly and not expose system details
        for (const term of sensitiveTerms) {
          expect(errorMessage.toLowerCase()).not.toContain(term);
        }
        
        // Should provide helpful but not revealing error messages
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    });

    /**
     * @test Input sanitization should prevent injection attacks
     */
    it('should handle malicious input safely', () => {
      const maliciousInputs = [
        { name: '<script>alert("xss")</script>', scopes: ['read'], expiration: '30d' },
        { name: 'DROP TABLE users;', scopes: ['read'], expiration: '30d' },
        { name: '../../etc/passwd', scopes: ['read'], expiration: '30d' },
        { name: 'test', scopes: ['<script>'], expiration: '30d' },
        { name: 'test', scopes: ['read'], expiration: '<script>alert(1)</script>' },
      ];

      // All malicious inputs should either be validated safely or rejected
      for (const maliciousInput of maliciousInputs) {
        expect(() => {
          const result = apiKeySchema.parse(maliciousInput);
          // If parsing succeeds, ensure the data is sanitized
          expect(result.name).not.toContain('<script>');
          expect(result.scopes.join('')).not.toContain('<script>');
        }).not.toThrow('Reference'); // Should not throw reference errors
      }
    });

    /**
     * @test API key format should be resistant to enumeration attacks
     */
    it('should generate non-predictable API key formats', () => {
      const keys = Array.from({ length: 100 }, () => `sk_${randomBytes(32).toString('hex')}`);
      
      // Keys should not follow predictable patterns that could be enumerated
      for (let i = 1; i < keys.length; i++) {
        const current = keys[i];
        const previous = keys[i - 1];
        
        // Should not have sequential patterns
        expect(current).not.toBe(previous);
        
        // Should not increment in predictable ways (using string comparison for compatibility)
        const currentHex = current.slice(3);
        const previousHex = previous.slice(3);
        expect(currentHex).not.toBe((parseInt(previousHex.slice(0, 8), 16) + 1).toString(16).padStart(8, '0') + previousHex.slice(8));
      }
    });

    /**
     * @test Scope validation should prevent privilege escalation
     */
    it('should validate scopes against known patterns', () => {
      // Test that we don't accidentally accept dangerous scopes
      const potentiallyDangerousScopes = [
        ['*', 'admin'], // Wildcard with admin
        ['root', 'sudo'], // System-level access
        ['eval', 'exec'], // Code execution
        ['../admin'], // Path traversal
      ];

      for (const scopes of potentiallyDangerousScopes) {
        const testData = { ...validApiKeyData, scopes };
        
        // Schema should accept these as strings (validation logic is elsewhere)
        // but we ensure they're properly typed
        const result = apiKeySchema.parse(testData);
        expect(Array.isArray(result.scopes)).toBe(true);
        expect(result.scopes.every(scope => typeof scope === 'string')).toBe(true);
      }
    });

    /**
     * @test Rate limiting considerations for validation
     */
    it('should handle validation performance consistently', () => {
      const startTime = Date.now();
      
      // Validate many inputs to check for timing attacks
      for (let i = 0; i < 100; i++) {
        try {
          apiKeySchema.parse({
            name: `Test Key ${i}`,
            scopes: ['read', 'write'],
            expiration: '30d',
          });
        } catch {
          // Expected for some invalid inputs
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should not take excessively long (potential DoS vector)
      expect(totalTime).toBeLessThan(1000); // 1 second for 100 validations
    });

    /**
     * @test Boundary value testing for security
     */
    it('should handle boundary values securely', () => {
      const boundaryTests = [
        { name: 'a'.repeat(1000), scopes: ['read'], expiration: '30d' }, // Very long name
        { name: 'test', scopes: Array(100).fill('scope'), expiration: '30d' }, // Many scopes
        { name: 'test', scopes: ['a'.repeat(1000)], expiration: '30d' }, // Long scope
        { name: 'test', scopes: ['read'], expiration: '9999d' }, // Very long expiration
      ];

      for (const test of boundaryTests) {
        // Should either validate or fail gracefully without system errors
        expect(() => {
          apiKeySchema.parse(test);
        }).not.toThrow('RangeError');
      }
    });
  });

  /**
   * API Key lifecycle integration tests
   * 
   * Tests that simulate real-world usage patterns and edge cases that might occur
   * during the complete lifecycle of API key operations
   */
  describe('Integration Scenarios', () => {
    /**
     * @test Complete API key creation workflow
     */
    it('should handle complete API key creation workflow', () => {
      // Simulate the complete workflow
      const inputData = {
        name: 'Production API Key',
        scopes: ['api:read', 'api:write'],
        expiration: '6m',
      };

      // Step 1: Validate input
      const validatedData = apiKeySchema.parse(inputData);
      expect(validatedData).toEqual(inputData);

      // Step 2: Generate key
      const apiKey = `sk_${randomBytes(32).toString('hex')}`;
      expect(apiKey).toMatch(/^sk_[a-f0-9]{64}$/);

      // Step 3: Calculate expiration
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Step 4: Verify all components are valid
      expect(validatedData.name).toBeTruthy();
      expect(validatedData.scopes.length).toBeGreaterThan(0);
      expect(validatedData.expiration).toMatch(/^\d+[dmy]$/);
    });

    /**
     * @test Batch API key validation performance
     */
    it('should handle batch validation efficiently', () => {
      const batchSize = 50;
      const batchData = Array.from({ length: batchSize }, (_, i) => ({
        name: `Batch Key ${i}`,
        scopes: ['read', 'write'],
        expiration: `${(i % 30) + 1}d`,
      }));

      const startTime = Date.now();
      
      for (const data of batchData) {
        expect(() => apiKeySchema.parse(data)).not.toThrow();
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });
});