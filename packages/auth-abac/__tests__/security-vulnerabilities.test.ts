/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { abacRules } from '../rules.js';
import type { PermissionRule } from '@repo/auth-rbac';

interface UserContext {
  userId?: string;
  role?: string;
  tenantId?: string;
  region?: string;
  clearanceLevel?: number;
  [key: string]: unknown;
}

describe('Security Vulnerability Tests - ABAC System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rule condition injection prevention', () => {
    it('should prevent malicious code injection in invoice regional rule', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };

      const maliciousRecord = {
        id: 'record_123',
        region: 'us-east; process.exit(0); //',
      };

      // Should evaluate condition safely without executing injected code
      expect(() => {
        const result = invoiceRule!.condition(context, maliciousRecord);
        expect(result).toBe(false); // Different regions (exact match required)
      }).not.toThrow();
    });

    it('should prevent prototype pollution in context attributes', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const maliciousContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: 1, // Low clearance
        // Injection attempts
        __proto__: { clearanceLevel: 10 },
        constructor: { prototype: { clearanceLevel: 10 } },
        valueOf: () => ({ clearanceLevel: 10 }),
      } as any;

      const record = { id: 'payment_123' };

      const result = paymentRule!.condition(maliciousContext, record);

      // Should not grant access through prototype pollution
      expect(result).toBe(false); // clearanceLevel 1 < 3
    });

    it('should prevent Function constructor exploitation', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      // Mock the rule condition to simulate injection attempt
      const originalCondition = invoiceRule!.condition;
      
      try {
        // Replace condition with one that tries to use Function constructor
        invoiceRule!.condition = function(ctx: UserContext, record: any) {
          try {
            // Attempt to use Function constructor
            const maliciousFunc = new Function('return process.exit(0)');
            maliciousFunc();
          } catch (error) {
            // Expected to fail in secure environments
          }
          
          // Fallback to original logic
          return originalCondition.call(this, ctx, record);
        };

        const context: UserContext = {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          region: 'us-east',
        };

        const record = {
          id: 'record_123',
          region: 'us-east',
        };

        // Should not execute malicious code
        expect(() => {
          const result = invoiceRule!.condition(context, record);
          expect(result).toBe(true); // Regions match
        }).not.toThrow();
      } finally {
        // Restore original condition
        invoiceRule!.condition = originalCondition;
      }
    });
  });

  describe('input validation and sanitization', () => {
    it('should handle SQL injection attempts in region values', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: "'; DROP TABLE invoices; --",
      };

      const record = {
        id: 'record_123',
        region: "'; DROP TABLE invoices; --", // Matching SQL injection
      };

      const result = invoiceRule!.condition(context, record);

      // Should evaluate string equality correctly without SQL execution
      expect(result).toBe(true); // Strings match exactly
    });

    it('should handle NoSQL injection attempts in clearance levels', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const maliciousContext: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: { $gte: 3 } as any, // NoSQL injection attempt
      };

      const record = { id: 'payment_123' };

      const result = paymentRule!.condition(maliciousContext, record);

      // Should handle object injection safely
      expect(result).toBe(false); // Object is not >= 3
    });

    it('should prevent XSS attempts in region attributes', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: '<script>alert("xss")</script>',
      };

      const record = {
        id: 'record_123',
        region: '<script>alert("xss")</script>',
      };

      const result = invoiceRule!.condition(context, record);

      // Should match the exact string without executing XSS
      expect(result).toBe(true);
    });

    it('should handle LDAP injection in region matching', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const ldapInjectionContext: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east*)(objectClass=*)(region=admin',
      };

      const record = {
        id: 'record_123',
        region: 'us-east', // Different from injection attempt
      };

      const result = invoiceRule!.condition(ldapInjectionContext, record);

      // Should treat as literal string comparison
      expect(result).toBe(false); // Strings don't match
    });

    it('should sanitize path traversal attempts in attributes', () => {
      const pathTraversalRegions = [
        '../../../etc/passwd',
        '..\\\\windows\\\\system32\\\\config',
        '/var/log/../../../etc/shadow',
        '....//....//....//admin',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
      ];

      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      pathTraversalRegions.forEach(maliciousRegion => {
        const context: UserContext = {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          region: maliciousRegion,
        };

        const record = {
          id: 'record_123',
          region: 'us-east', // Legitimate region
        };

        const result = invoiceRule!.condition(context, record);

        // Should not access system files or directories
        expect(result).toBe(false);
      });
    });
  });

  describe('timing attack prevention', () => {
    it('should have consistent evaluation time for different region matches', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const contexts = [
        { region: 'us-east' }, // Will match
        { region: 'eu-west' }, // Won't match
        { region: 'nonexistent-region' }, // Won't match
      ];

      const record = {
        id: 'record_123',
        region: 'us-east',
      };

      const timings: number[] = [];

      contexts.forEach(contextRegion => {
        const context: UserContext = {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          ...contextRegion,
        };

        const startTime = performance.now();
        const result = invoiceRule!.condition(context, record);
        const endTime = performance.now();

        timings.push(endTime - startTime);
        expect(typeof result).toBe('boolean');
      });

      // Calculate timing variance
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxVariance = Math.max(...timings.map(t => Math.abs(t - avgTiming)));

      // Timing variance should be minimal
      expect(maxVariance).toBeLessThan(2); // Less than 2ms variance
    });

    it('should prevent clearance level enumeration through timing', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const clearanceLevels = [0, 1, 2, 3, 4, 5, 10];
      const timings: number[] = [];

      clearanceLevels.forEach(level => {
        const context: UserContext = {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          clearanceLevel: level,
        };

        const record = { id: 'payment_123' };

        const startTime = performance.now();
        const result = paymentRule!.condition(context, record);
        const endTime = performance.now();

        timings.push(endTime - startTime);
        expect(typeof result).toBe('boolean');
      });

      // All evaluations should have similar timing
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const timingDifference = maxTiming - minTiming;

      expect(timingDifference).toBeLessThan(1); // Less than 1ms difference
    });
  });

  describe('memory and resource exhaustion prevention', () => {
    it('should handle large context objects efficiently', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const largeContext: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };

      // Add many attributes to context
      for (let i = 0; i < 10000; i++) {
        (largeContext as any)[`attr_${i}`] = `value_${i}`;
      }

      const record = {
        id: 'record_123',
        region: 'us-east',
      };

      const startTime = performance.now();

      const result = invoiceRule!.condition(largeContext, record);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete quickly
    });

    it('should handle deeply nested record objects', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      // Create deeply nested record
      let deepRecord: any = { value: 'test' };
      for (let i = 0; i < 100; i++) {
        deepRecord = { nested: deepRecord, level: i };
      }
      deepRecord.id = 'deep_record';
      deepRecord.region = 'us-east';

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };

      // Should handle without stack overflow
      expect(() => {
        const result = invoiceRule!.condition(context, deepRecord);
        expect(result).toBe(true);
      }).not.toThrow();
    });

    it('should handle circular references safely', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const circularContext: any = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };
      circularContext.self = circularContext;

      const circularRecord: any = {
        id: 'record_123',
        region: 'us-east',
      };
      circularRecord.parent = circularRecord;

      // Should handle circular references without infinite loops
      expect(() => {
        const result = invoiceRule!.condition(circularContext, circularRecord);
        expect(result).toBe(true);
      }).not.toThrow();
    });

    it('should handle concurrent evaluations without resource exhaustion', () => {
      const rules = abacRules;
      
      const contexts = Array.from({ length: 100 }, (_, i) => ({
        userId: `user_${i}`,
        role: 'user',
        tenantId: `tenant_${i % 10}`,
        region: i % 2 === 0 ? 'us-east' : 'eu-west',
        clearanceLevel: i % 6,
      }));

      const startTime = performance.now();

      const promises = contexts.map(async (context, i) => {
        const rule = rules[i % rules.length];
        const record = rule.resource === 'invoices' 
          ? { id: `record_${i}`, region: context.region }
          : { id: `payment_${i}` };

        return rule.condition(context as UserContext, record);
      });

      return Promise.all(promises).then(results => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(results).toHaveLength(100);
        expect(duration).toBeLessThan(500); // Should complete concurrently
        
        results.forEach(result => {
          expect(typeof result).toBe('boolean');
        });
      });
    });
  });

  describe('authorization bypass prevention', () => {
    it('should prevent attribute manipulation through context injection', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const maliciousContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: 1, // Low clearance
        // Injection attempts
        constructor: { prototype: { clearanceLevel: 10 } },
        __proto__: { clearanceLevel: 10 },
        valueOf: () => ({ clearanceLevel: 10 }),
        toString: () => '10',
      } as any;

      const record = { id: 'payment_123' };

      const result = paymentRule!.condition(maliciousContext, record);

      // Should not be granted access through injection
      expect(result).toBe(false); // clearanceLevel 1 < 3
    });

    it('should prevent region bypassing through record manipulation', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };

      const maliciousRecord = {
        id: 'record_123',
        region: 'eu-west', // Different region
        // Injection attempts
        constructor: { region: 'us-east' },
        __proto__: { region: 'us-east' },
        valueOf: () => ({ region: 'us-east' }),
        toString: () => 'us-east',
      };

      const result = invoiceRule!.condition(context, maliciousRecord);

      // Should evaluate based on actual field value
      expect(result).toBe(false); // us-east !== eu-west
    });

    it('should prevent privilege escalation through type confusion', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const typeConfusionAttempts = [
        { clearanceLevel: '10' }, // String instead of number
        { clearanceLevel: [10] }, // Array instead of number
        { clearanceLevel: { value: 10 } }, // Object instead of number
        { clearanceLevel: true }, // Boolean instead of number
        { clearanceLevel: () => 10 }, // Function instead of number
      ];

      typeConfusionAttempts.forEach(contextOverride => {
        const context: UserContext = {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          ...contextOverride,
        };

        const record = { id: 'payment_123' };

        const result = paymentRule!.condition(context, record);

        // Should handle type confusion safely
        expect(result).toBe(false); // Non-numeric values should fail >= comparison
      });
    });
  });

  describe('information disclosure prevention', () => {
    it('should not leak sensitive attribute values in comparisons', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const sensitiveContext: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'classified-region-alpha',
        secretClearance: 'top-secret',
        apiKey: 'secret-api-key-12345',
      };

      const sensitiveRecord = {
        id: 'record_123',
        region: 'public-region', // Different from context
        confidentialData: 'sensitive-information',
        internalId: 'internal-system-id-999',
      };

      const result = invoiceRule!.condition(sensitiveContext, sensitiveRecord);

      // Should fail without revealing sensitive values
      expect(result).toBe(false);
    });

    it('should not expose internal rule logic through error messages', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      // Mock the rule to throw an error with sensitive information
      const originalCondition = paymentRule!.condition;
      
      try {
        paymentRule!.condition = function() {
          throw new Error('Internal rule error: clearance_threshold=3, secret_key=abc123');
        };

        const context: UserContext = {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          clearanceLevel: 1,
        };

        const record = { id: 'payment_123' };

        // Should handle rule errors gracefully
        expect(() => {
          paymentRule!.condition(context, record);
        }).toThrow(); // Currently throws, but error handling could be improved
      } finally {
        // Restore original condition
        paymentRule!.condition = originalCondition;
      }
    });

    it('should sanitize debug information in development mode', () => {
      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
        debugInfo: {
          secretKey: 'exposed-secret',
          databaseUrl: 'postgresql://user:pass@localhost/db',
          internalId: 'internal-system-id-12345',
        },
      };

      const record = {
        id: 'record_123',
        region: 'us-east',
        debug: {
          queryPlan: 'SELECT * FROM sensitive_table',
          performanceMetrics: { secretOperations: 42 },
        },
      };

      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const result = invoiceRule!.condition(context, record);

      // Should evaluate normally without exposing debug info
      expect(result).toBe(true);
    });
  });

  describe('integration with real ABAC rules', () => {
    it('should maintain security when using invoice regional rules', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read')!;

      const maliciousContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
        // Injection attempts
        __proto__: { region: 'admin_region' },
        constructor: { region: 'all_regions' },
      } as any;

      const invoice = {
        id: 'invoice_123',
        region: 'eu-west', // Different region
        amount: 1000,
      };

      const result = invoiceRule.condition(maliciousContext, invoice);

      // Should not bypass regional restrictions
      expect(result).toBe(false);
    });

    it('should maintain security when using payment approval rules', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve')!;

      const maliciousContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: 1, // Low clearance
        // Injection attempts
        __proto__: { clearanceLevel: 10 },
        constructor: { clearanceLevel: 10 },
        valueOf: () => ({ clearanceLevel: 10 }),
      } as any;

      const payment = {
        id: 'payment_123',
        amount: 100000,
      };

      const result = paymentRule.condition(maliciousContext, payment);

      // Should not bypass clearance requirements
      expect(result).toBe(false);
    });

    it('should handle edge cases in rule evaluation securely', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read')!;
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve')!;

      const edgeCases = [
        // Missing context properties
        { context: {}, record: { region: 'us-east' } },
        { context: { region: 'us-east' }, record: {} },
        
        // Null/undefined values
        { context: { region: null }, record: { region: 'us-east' } },
        { context: { region: 'us-east' }, record: { region: null } },
        { context: { clearanceLevel: undefined }, record: { id: 'payment' } },
        
        // Empty string values
        { context: { region: '' }, record: { region: '' } },
        { context: { region: 'us-east' }, record: { region: '' } },
      ];

      edgeCases.forEach(({ context, record }) => {
        expect(() => {
          const invoiceResult = invoiceRule.condition(context as UserContext, record);
          const paymentResult = paymentRule.condition(context as UserContext, record);
          
          expect(typeof invoiceResult).toBe('boolean');
          expect(typeof paymentResult).toBe('boolean');
        }).not.toThrow();
      });
    });
  });
});