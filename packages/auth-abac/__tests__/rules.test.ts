/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { abacRules } from '../rules.js';

describe('ABAC Rules', () => {
  describe('invoice regional access rule', () => {
    const invoiceRule = abacRules.find(rule => 
      rule.resource === 'invoices' && rule.action === 'read'
    );

    it('should exist and be properly configured', () => {
      expect(invoiceRule).toBeDefined();
      expect(invoiceRule?.resource).toBe('invoices');
      expect(invoiceRule?.action).toBe('read');
      expect(typeof invoiceRule?.condition).toBe('function');
    });

    it('should allow access when user and record are in same region', () => {
      const context = { region: 'us-east' };
      const record = { region: 'us-east', id: 'invoice_123' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(true);
    });

    it('should deny access when user and record are in different regions', () => {
      const context = { region: 'us-east' };
      const record = { region: 'eu-west', id: 'invoice_456' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(false);
    });

    it('should deny access when context has no region', () => {
      const context = {};
      const record = { region: 'us-east', id: 'invoice_789' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(false);
    });

    it('should deny access when record has no region', () => {
      const context = { region: 'us-east' };
      const record = { id: 'invoice_101' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(false);
    });

    it('should deny access when record is null', () => {
      const context = { region: 'us-east' };

      const result = invoiceRule?.condition?.(context, null);
      expect(result).toBe(false);
    });

    it('should deny access when record is undefined', () => {
      const context = { region: 'us-east' };

      const result = invoiceRule?.condition?.(context, undefined);
      expect(result).toBe(false);
    });

    it('should handle string region comparison correctly', () => {
      const context = { region: 'asia-pacific' };
      const record = { region: 'asia-pacific', id: 'invoice_asia' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(true);
    });

    it('should be case sensitive for regions', () => {
      const context = { region: 'US-EAST' };
      const record = { region: 'us-east', id: 'invoice_case' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(false);
    });

    it('should handle empty string regions', () => {
      const context = { region: '' };
      const record = { region: '', id: 'invoice_empty' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(true); // Both are empty strings, so they match
    });

    it('should handle special characters in region names', () => {
      const context = { region: 'us-east-1a' };
      const record = { region: 'us-east-1a', id: 'invoice_special' };

      const result = invoiceRule?.condition?.(context, record);
      expect(result).toBe(true);
    });
  });

  describe('payment approval clearance rule', () => {
    const paymentRule = abacRules.find(rule => 
      rule.resource === 'payments' && rule.action === 'approve'
    );

    it('should exist and be properly configured', () => {
      expect(paymentRule).toBeDefined();
      expect(paymentRule?.resource).toBe('payments');
      expect(paymentRule?.action).toBe('approve');
      expect(typeof paymentRule?.condition).toBe('function');
    });

    it('should allow access when clearance level is 3', () => {
      const context = { clearanceLevel: 3 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(true);
    });

    it('should allow access when clearance level is above 3', () => {
      const context = { clearanceLevel: 5 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(true);
    });

    it('should deny access when clearance level is below 3', () => {
      const context = { clearanceLevel: 2 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(false);
    });

    it('should deny access when clearance level is 0', () => {
      const context = { clearanceLevel: 0 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(false);
    });

    it('should deny access when clearance level is undefined', () => {
      const context = {};

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(false);
    });

    it('should deny access when clearance level is null', () => {
      const context = { clearanceLevel: null };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(false);
    });

    it('should handle negative clearance levels', () => {
      const context = { clearanceLevel: -1 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(false);
    });

    it('should handle very high clearance levels', () => {
      const context = { clearanceLevel: 100 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(true);
    });

    it('should handle decimal clearance levels', () => {
      const context = { clearanceLevel: 3.5 };

      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(true);
    });

    it('should handle string clearance levels', () => {
      const context = { clearanceLevel: '5' as any };

      // The rule uses >= comparison, so string comparison might behave unexpectedly
      const result = paymentRule?.condition?.(context, null);
      expect(result).toBe(true); // '5' >= 3 is true in JavaScript
    });

    it('should not consider record data for payment approval', () => {
      const context = { clearanceLevel: 5 };
      const record = { amount: 1000000, priority: 'high' };

      const result = paymentRule?.condition?.(context, record);
      expect(result).toBe(true); // Record is ignored
    });
  });

  describe('rule array structure', () => {
    it('should contain exactly 2 rules', () => {
      expect(abacRules).toHaveLength(2);
    });

    it('should have all rules with required properties', () => {
      abacRules.forEach((rule, index) => {
        expect(rule).toHaveProperty('resource');
        expect(rule).toHaveProperty('action');
        expect(rule).toHaveProperty('condition');
        
        expect(typeof rule.resource).toBe('string');
        expect(typeof rule.action).toBe('string');
        expect(typeof rule.condition).toBe('function');
        
        expect(rule.resource.length).toBeGreaterThan(0);
        expect(rule.action.length).toBeGreaterThan(0);
      });
    });

    it('should have unique resource-action combinations', () => {
      const combinations = abacRules.map(rule => `${rule.resource}:${rule.action}`);
      const uniqueCombinations = new Set(combinations);
      
      expect(uniqueCombinations.size).toBe(combinations.length);
    });

    it('should export rules that can be used with RBAC evaluator', () => {
      // Test that rules conform to PermissionRule interface
      abacRules.forEach(rule => {
        expect(rule).toMatchObject({
          resource: expect.any(String),
          action: expect.any(String),
          condition: expect.any(Function),
        });
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex context objects', () => {
      const complexContext = {
        userId: 'user_123',
        role: 'regional_manager',
        region: 'us-east',
        clearanceLevel: 4,
        department: 'finance',
        permissions: ['read', 'write', 'approve'],
        metadata: {
          lastLogin: new Date(),
          sessionId: 'session_456',
        },
      };

      const invoiceRule = abacRules.find(rule => 
        rule.resource === 'invoices' && rule.action === 'read'
      );
      
      const paymentRule = abacRules.find(rule => 
        rule.resource === 'payments' && rule.action === 'approve'
      );

      // Invoice rule should only care about region
      const invoiceRecord = { region: 'us-east', id: 'invoice_complex' };
      expect(invoiceRule?.condition?.(complexContext, invoiceRecord)).toBe(true);

      // Payment rule should only care about clearance level
      expect(paymentRule?.condition?.(complexContext, null)).toBe(true);
    });

    it('should handle edge cases in real-world scenarios', () => {
      // Test with empty context
      const emptyContext = {};
      
      abacRules.forEach(rule => {
        const result = rule.condition(emptyContext, null);
        expect(typeof result).toBe('boolean');
      });

      // Test with null context (edge case)
      abacRules.forEach(rule => {
        const result = rule.condition(null as any, null);
        expect(typeof result).toBe('boolean');
      });
    });

    it('should maintain consistent behavior across multiple calls', () => {
      const context = { region: 'us-west', clearanceLevel: 3 };
      const record = { region: 'us-west', id: 'invoice_consistent' };

      const invoiceRule = abacRules.find(rule => 
        rule.resource === 'invoices' && rule.action === 'read'
      );

      // Call multiple times with same parameters
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(invoiceRule?.condition?.(context, record));
      }

      // All results should be the same
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe(true);
    });

    it('should handle concurrent access correctly', async () => {
      const contexts = [
        { region: 'us-east', clearanceLevel: 5 },
        { region: 'us-west', clearanceLevel: 2 },
        { region: 'eu-central', clearanceLevel: 4 },
        { region: 'asia-pacific', clearanceLevel: 1 },
      ];

      const records = [
        { region: 'us-east', id: 'invoice_1' },
        { region: 'us-west', id: 'invoice_2' },
        { region: 'eu-central', id: 'invoice_3' },
        { region: 'asia-pacific', id: 'invoice_4' },
      ];

      const invoiceRule = abacRules.find(rule => 
        rule.resource === 'invoices' && rule.action === 'read'
      );

      const paymentRule = abacRules.find(rule => 
        rule.resource === 'payments' && rule.action === 'approve'
      );

      // Test concurrent access
      const promises = contexts.map(async (context, index) => {
        const invoiceResult = invoiceRule?.condition?.(context, records[index]);
        const paymentResult = paymentRule?.condition?.(context, null);
        
        return { invoiceResult, paymentResult };
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      
      // Verify expected results
      expect(results[0]).toEqual({ invoiceResult: true, paymentResult: true }); // same region, clearance >= 3
      expect(results[1]).toEqual({ invoiceResult: true, paymentResult: false }); // same region, clearance < 3
      expect(results[2]).toEqual({ invoiceResult: true, paymentResult: true }); // same region, clearance >= 3
      expect(results[3]).toEqual({ invoiceResult: true, paymentResult: false }); // same region, clearance < 3
    });
  });

  describe('performance characteristics', () => {
    it('should execute rules efficiently', () => {
      const context = { region: 'performance-test', clearanceLevel: 10 };
      const record = { region: 'performance-test', id: 'perf_invoice' };

      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        abacRules.forEach(rule => {
          rule.condition(context, record);
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 10k iterations quickly
      expect(totalTime).toBeLessThan(100); // Less than 100ms
    });

    it('should handle large context objects without performance degradation', () => {
      // Create large context object
      const largeContext: Record<string, any> = {
        region: 'performance-region',
        clearanceLevel: 5,
      };

      // Add 1000 additional properties
      for (let i = 0; i < 1000; i++) {
        largeContext[`property_${i}`] = `value_${i}`;
      }

      const record = { region: 'performance-region', id: 'large_context_test' };

      const startTime = performance.now();

      // Run rules 1000 times with large context
      for (let i = 0; i < 1000; i++) {
        abacRules.forEach(rule => {
          rule.condition(largeContext, record);
        });
      }

      const endTime = performance.now();
      
      // Should still complete quickly despite large context
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large record objects efficiently', () => {
      const context = { region: 'perf-region', clearanceLevel: 3 };
      
      // Create large record object
      const largeRecord: Record<string, any> = {
        region: 'perf-region',
        id: 'large_record_test',
      };

      // Add 1000 additional properties
      for (let i = 0; i < 1000; i++) {
        largeRecord[`field_${i}`] = `data_${i}`;
      }

      const startTime = performance.now();

      // Run rules 1000 times with large record
      for (let i = 0; i < 1000; i++) {
        abacRules.forEach(rule => {
          rule.condition(context, largeRecord);
        });
      }

      const endTime = performance.now();
      
      // Should complete efficiently despite large record
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});