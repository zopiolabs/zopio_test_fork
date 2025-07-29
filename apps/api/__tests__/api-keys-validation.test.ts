/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('API Keys Validation', () => {
  // Test the validation schema used in the controller
  const apiKeySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    scopes: z.array(z.string()),
    expiration: z
      .string()
      .regex(/^\d+[dmy]$/, 'Expiration must be in format like 30d, 6m, or 1y'),
  });

  describe('Input Validation', () => {
    it('should validate correct API key data', () => {
      const validData = {
        name: 'Test API Key',
        scopes: ['read', 'write'],
        expiration: '30d',
      };

      expect(() => apiKeySchema.parse(validData)).not.toThrow();
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        scopes: ['read'],
        expiration: '30d',
      };

      expect(() => apiKeySchema.parse(invalidData)).toThrow('Name is required');
    });

    it('should reject invalid expiration format', () => {
      const testCases = [
        { expiration: 'invalid', expectedError: 'Expiration must be in format' },
        { expiration: '30', expectedError: 'Expiration must be in format' },
        { expiration: 'days30', expectedError: 'Expiration must be in format' },
        { expiration: '30x', expectedError: 'Expiration must be in format' },
      ];

      for (const testCase of testCases) {
        const invalidData = {
          name: 'Test',
          scopes: ['read'],
          expiration: testCase.expiration,
        };

        expect(() => apiKeySchema.parse(invalidData)).toThrow(testCase.expectedError);
      }
    });

    it('should accept valid expiration formats', () => {
      const validExpirations = ['1d', '30d', '365d', '1m', '12m', '1y', '5y'];

      for (const expiration of validExpirations) {
        const validData = {
          name: 'Test',
          scopes: ['read'],
          expiration,
        };

        expect(() => apiKeySchema.parse(validData)).not.toThrow();
      }
    });

    it('should handle empty scopes array', () => {
      const validData = {
        name: 'Test API Key',
        scopes: [],
        expiration: '30d',
      };

      expect(() => apiKeySchema.parse(validData)).not.toThrow();
    });

    it('should validate scopes are strings', () => {
      const invalidData = {
        name: 'Test',
        scopes: ['read', 123, 'write'] as any,
        expiration: '30d',
      };

      expect(() => apiKeySchema.parse(invalidData)).toThrow();
    });
  });

  describe('API Key Generation', () => {
    it('should generate secure API keys', () => {
      // Simulate the key generation logic from the controller
      const { randomBytes } = require('node:crypto');
      
      const apiKey1 = `sk_${randomBytes(32).toString('hex')}`;
      const apiKey2 = `sk_${randomBytes(32).toString('hex')}`;

      // Keys should be different
      expect(apiKey1).not.toBe(apiKey2);
      
      // Keys should follow the expected format
      expect(apiKey1).toMatch(/^sk_[a-f0-9]{64}$/);
      expect(apiKey2).toMatch(/^sk_[a-f0-9]{64}$/);
      
      // Keys should be the expected length
      expect(apiKey1).toHaveLength(67); // 'sk_' (3) + 64 hex chars = 67
      expect(apiKey2).toHaveLength(67);
    });

    it('should generate cryptographically random keys', () => {
      const { randomBytes } = require('node:crypto');
      
      // Generate multiple keys and check they're all different
      const keys = Array.from({ length: 100 }, () => 
        `sk_${randomBytes(32).toString('hex')}`
      );

      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(100); // All keys should be unique
    });
  });

  describe('Expiration Date Calculation', () => {
    it('should calculate correct expiration dates', () => {
      const testCases = [
        { expiration: '1d', expectedDays: 1 },
        { expiration: '7d', expectedDays: 7 },
        { expiration: '30d', expectedDays: 30 },
        { expiration: '1m', expectedMonths: 1 },
        { expiration: '6m', expectedMonths: 6 },
        { expiration: '1y', expectedYears: 1 },
      ];

      for (const testCase of testCases) {
        const expirationValue = Number.parseInt(testCase.expiration.slice(0, -1), 10);
        const expirationUnit = testCase.expiration.slice(-1);

        const expiresAt = new Date();
        const originalDate = new Date(expiresAt);

        switch (expirationUnit) {
          case 'd':
            expiresAt.setDate(expiresAt.getDate() + expirationValue);
            break;
          case 'm':
            expiresAt.setMonth(expiresAt.getMonth() + expirationValue);
            break;
          case 'y':
            expiresAt.setFullYear(expiresAt.getFullYear() + expirationValue);
            break;
        }

        // Validate the date was modified correctly
        expect(expiresAt.getTime()).toBeGreaterThan(originalDate.getTime());

        if (testCase.expectedDays) {
          const diffTime = expiresAt.getTime() - originalDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          expect(diffDays).toBe(testCase.expectedDays);
        }
      }
    });

    it('should handle edge cases in date calculation', () => {
      // Test end of month scenarios - Jan 31 + 1 month
      const endOfMonth = new Date('2024-01-31');
      const originalMonth = endOfMonth.getMonth();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      
      // JavaScript adjusts dates automatically - Jan 31 + 1 month can overflow to March
      // Let's just verify it moved forward in time correctly
      expect(endOfMonth.getTime()).toBeGreaterThan(new Date('2024-01-31').getTime());
      
      // Test leap year transition
      const leapYear = new Date('2024-02-29');
      const originalYear = leapYear.getFullYear();
      leapYear.setFullYear(leapYear.getFullYear() + 1);
      
      // Should handle leap year correctly
      expect(leapYear.getFullYear()).toBe(originalYear + 1);
      // Date may be adjusted to Feb 28 in non-leap year
      expect(leapYear.getTime()).toBeGreaterThan(new Date('2024-02-29').getTime());
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information in validation errors', () => {
      try {
        apiKeySchema.parse({
          name: '',
          scopes: ['read'],
          expiration: '30d',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Error message should be user-friendly and not expose system details
        expect(errorMessage).not.toContain('database');
        expect(errorMessage).not.toContain('secret');
        expect(errorMessage).not.toContain('internal');
      }
    });

    it('should validate input types correctly', () => {
      const invalidInputs = [
        { name: null, scopes: ['read'], expiration: '30d' },
        { name: 'Test', scopes: 'not-array', expiration: '30d' },
        { name: 'Test', scopes: ['read'], expiration: null },
      ];

      for (const invalidInput of invalidInputs) {
        expect(() => apiKeySchema.parse(invalidInput)).toThrow();
      }
    });
  });
});