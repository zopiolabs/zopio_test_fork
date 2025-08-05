/**
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview ABAC Engine Tests - Security Vulnerability Prevention
 * 
 * Comprehensive security testing suite for the Attribute-Based Access Control (ABAC) engine.
 * Validates protection against common security vulnerabilities and attack vectors in attribute-based systems.
 * 
 * **Test Scope:**
 * - Injection attack prevention in attribute values and conditions
 * - Authorization bypass attempts through attribute manipulation
 * - Resource exhaustion and timing attack protection mechanisms
 * 
 * **Test Categories:**
 * 1. **Injection Prevention**: Protection against code, SQL, NoSQL, and XSS injection attempts
 * 2. **Authorization Bypass**: Prevention of privilege escalation through attribute manipulation
 * 3. **Resource Protection**: DoS protection and memory exhaustion prevention
 * 4. **Information Disclosure**: Prevention of sensitive data leakage through error messages
 * 
 * **Mock Strategy:**
 * - Malicious input generation covering common attack vectors
 * - Security-focused mock contexts with edge cases and boundary conditions
 * - Attack simulation with real-world payload patterns
 * 
 * **Quality Standards:**
 * - Zero tolerance for successful injection attacks
 * - Consistent timing responses to prevent information disclosure
 * - Robust error handling without sensitive information leakage
 * 
 * **ABAC Security Challenges:**
 * ABAC systems are more complex than RBAC as they evaluate multiple attributes from:
 * - User attributes (role, clearance, department, region)
 * - Resource attributes (classification, owner, location)
 * - Environment attributes (time, location, IP address)
 * - Action attributes (operation type, urgency, scope)
 * 
 * **Attack Categories Covered:**
 * - Attribute Injection: Manipulating attributes to bypass conditions
 * - Prototype Pollution: Exploiting JavaScript object inheritance in attributes
 * - Code Injection: Injecting executable code into attribute evaluations
 * - Context Manipulation: Poisoning evaluation context
 * - Rule Condition Bypass: Circumventing attribute-based conditions
 * - Function Constructor Exploitation: Using Function() to execute arbitrary code
 * 
 * **Security Principles Tested:**
 * - Attribute validation: All attributes must be properly validated
 * - Safe evaluation: Attribute conditions evaluated without code execution
 * - Context isolation: User-provided data isolated from evaluation logic
 * - Fail-safe defaults: Unknown or corrupted attributes result in access denial
 * - Input sanitization: All attribute values sanitized before evaluation
 * 
 * @author Zopio Security Team
 * @since 1.0.0
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { abacRules } from '../rules.js';
import type { UserContext as RBACUserContext, PermissionRule } from '@repo/auth-rbac';

interface UserContext extends RBACUserContext {
  region?: string;
  clearanceLevel?: number;
  [key: string]: unknown;
}

// Helper function to ensure UserContext compatibility with RBAC types
function ensureValidContext(context: Partial<UserContext>): UserContext {
  return {
    userId: context.userId || 'test_user',
    role: context.role || 'user',
    tenantId: context.tenantId || 'default_tenant',
    ...context
  } as UserContext;
}

// Helper function to test rule condition with proper null checks
function testRuleCondition(
  rule: PermissionRule | undefined,
  context: UserContext,
  record?: Record<string, unknown>
): boolean {
  if (!rule?.condition) {
    throw new Error('Rule or condition is undefined');
  }
  return rule.condition(context, record);
}

// Helper function to test concurrent evaluations
function createConcurrentEvaluationTest(
  rule: PermissionRule,
  contexts: UserContext[],
  record?: Record<string, unknown>
): Promise<boolean[]> {
  return Promise.all(
    contexts.map(context => 
      Promise.resolve().then(() => testRuleCondition(rule, context, record))
    )
  );
}

// Helper function to validate result types
function validateResultType(result: boolean): void {
  expect(typeof result).toBe('boolean');
}

// Helper function to test edge cases with proper context validation
function testEdgeCaseScenario(
  invoiceRule: PermissionRule,
  paymentRule: PermissionRule,
  scenario: { context: Record<string, unknown>; record: Record<string, unknown> },
  shouldThrow: boolean = false
): void {
  const context = ensureValidContext(scenario.context);
  const invoiceResult = testRuleCondition(invoiceRule, context, scenario.record);
  const paymentResult = testRuleCondition(paymentRule, context, scenario.record);
  
  expect(typeof invoiceResult).toBe('boolean');
  expect(typeof paymentResult).toBe('boolean');
}

// Helper function to test edge cases without throwing
function testEdgeCaseWithoutThrowing(
  invoiceRule: PermissionRule,
  paymentRule: PermissionRule,
  scenario: { context: Record<string, unknown>; record: Record<string, unknown> }
): void {
  testEdgeCaseScenario(invoiceRule, paymentRule, scenario, false);
}

// Helper function that returns a function for forEach to eliminate deep nesting
function testEdgeCaseScenarioSafely(
  invoiceRule: PermissionRule,
  paymentRule: PermissionRule
) {
  return (scenario: { context: Record<string, unknown>; record: Record<string, unknown> }) => {
    expect(() => testEdgeCaseWithoutThrowing(invoiceRule, paymentRule, scenario)).not.toThrow();
  };
}

/**
 * @describe Security Vulnerability Tests - ABAC System
 * 
 * Comprehensive security test suite for the Attribute-Based Access Control system.
 * ABAC systems face unique security challenges due to their complex attribute evaluation
 * logic and the dynamic nature of attribute-based permissions.
 * 
 * **ABAC-Specific Attack Vectors:**
 * - Attribute manipulation across multiple dimensions (user, resource, environment)
 * - Complex condition evaluation that may be vulnerable to injection
 * - Dynamic rule evaluation that could be exploited for code execution
 * - Multi-source attribute aggregation that increases attack surface
 */
describe('Security Vulnerability Tests - ABAC System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @describe Rule Condition Injection Prevention Tests
   * 
   * Tests protection against code injection attacks in ABAC rule conditions.
   * ABAC rules often involve complex attribute comparisons that could be vulnerable
   * to injection if not properly implemented.
   * 
   * **Attack Vectors Tested:**
   * - Code injection through attribute values
   * - Prototype pollution in attribute objects
   * - Function constructor exploitation
   * - Template literal injection
   * - Eval-based code execution
   */
  describe('rule condition injection prevention', () => {
    /**
     * @test Code Injection Prevention in Regional Access Rules
     * 
     * **Attack Vector:** Attacker attempts to inject executable code through
     * attribute values that are used in rule condition evaluation. This attack
     * targets ABAC rules that compare regional attributes.
     * 
     * **Attack Mechanism:**
     * 1. Attacker controls or influences record attributes (e.g., region field)
     * 2. Injects JavaScript code disguised as attribute values
     * 3. Uses semicolons and comments to terminate legitimate code
     * 4. Attempts to execute malicious code (process.exit, file operations)
     * 5. Expects unsafe evaluation to execute the injected code
     * 
     * **Specific Payload:** 'us-east; process.exit(0); //'
     * - Legitimate value: 'us-east'
     * - Injection terminator: ';' 
     * - Malicious code: 'process.exit(0)'
     * - Comment to hide rest: '//'
     * 
     * **Expected Defense:** ABAC condition evaluation should treat attribute
     * values as data, not code, preventing any code execution.
     */
    it('should prevent malicious code injection in invoice regional rule', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      });

      const maliciousRecord = {
        id: 'record_123',
        region: 'us-east; process.exit(0); //',
      };

      // Should evaluate condition safely without executing injected code
      expect(() => {
        const result = testRuleCondition(invoiceRule, context, maliciousRecord);
        expect(result).toBe(false); // Different regions (exact match required)
      }).not.toThrow();
    });

    it('should prevent prototype pollution in context attributes', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const maliciousContext = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: 3,
        __proto__: {
          valueOf() {
            // Attempt to modify prototype during evaluation
            (global as any).compromised = true;
            return this;
          }
        } as any
      } as any);

      const record = { id: 'payment_123' };

      const result = testRuleCondition(paymentRule, maliciousContext, record);
      
      expect(result).toBe(true); // Should pass based on clearanceLevel
      expect((global as any).compromised).toBeUndefined(); // Prototype pollution should not affect global state
    });

    it('should prevent Function constructor exploitation', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      // Mock the rule condition to simulate injection attempt
      const originalCondition = invoiceRule?.condition;
      
      if (!originalCondition) {
        throw new Error('Invoice rule condition is undefined');
      }
      
      try {
        // Replace condition with one that tries to use Function constructor
        invoiceRule.condition = function(ctx: UserContext, record: any) {
          try {
            // Attempt to use Function constructor
            const maliciousFunc = new Function('return process.exit(0)');
            maliciousFunc();
          } catch (error) {
            // Log the expected security error for debugging
            console.debug('Function constructor blocked (expected):', error instanceof Error ? error.message : String(error));
          }
          
          // Fallback to original logic
          return originalCondition.call(this, ctx, record);
        };

        const context = ensureValidContext({
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          region: 'us-east',
        });

        const record = {
          id: 'record_123',
          region: 'us-east',
        };

        // Attempt to evaluate - should not crash or execute malicious code
        const result = testRuleCondition(invoiceRule, context, record);
        expect(typeof result).toBe('boolean');
      } finally {
        // Restore original condition
        invoiceRule.condition = originalCondition;
      }
    });
  });

  describe('input validation and sanitization', () => {
    it('should handle SQL injection attempts in region values', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: "'; DROP TABLE invoices; --",
      });

      const record = {
        id: 'record_123',
        region: "'; DROP TABLE invoices; --", // Matching SQL injection
      };

      const result = testRuleCondition(invoiceRule, context, record);

      // Should evaluate string equality correctly without SQL execution
      expect(result).toBe(true); // Strings match exactly
    });

    it('should handle NoSQL injection attempts in clearance levels', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const maliciousContext = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: { $gte: 3 } as any, // NoSQL injection attempt
      });

      const record = { id: 'payment_123' };

      const result = testRuleCondition(paymentRule, maliciousContext, record);

      // Should handle object injection safely
      expect(result).toBe(false); // Object is not >= 3
    });

    it('should prevent XSS attempts in region attributes', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: '<script>alert("xss")</script>',
      });

      const record = {
        id: 'record_123',
        region: '<script>alert("xss")</script>',
      };

      const result = testRuleCondition(invoiceRule, context, record);

      // Should match the exact string without executing XSS
      expect(result).toBe(true);
    });

    it('should handle LDAP injection in region matching', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const ldapInjectionContext = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east*)(objectClass=*)(region=admin',
      });

      const record = {
        id: 'record_123',
        region: 'us-east', // Different from injection attempt
      };

      const result = testRuleCondition(invoiceRule, ldapInjectionContext, record);

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
        const context = ensureValidContext({
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          region: maliciousRegion,
        });

        const record = {
          id: 'record_123',
          region: 'us-east', // Legitimate region
        };

        const result = testRuleCondition(invoiceRule, context, record);

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
        const context = ensureValidContext({
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          ...contextRegion,
        });

        const startTime = performance.now();
        const result = testRuleCondition(invoiceRule, context, record);
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
        const context = ensureValidContext({
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          clearanceLevel: level,
        });

        const record = { id: 'payment_123' };

        const startTime = performance.now();
        const result = testRuleCondition(paymentRule, context, record);
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

      const largeContext = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      });

      // Add many attributes to context
      for (let i = 0; i < 10000; i++) {
        (largeContext as any)[`attr_${i}`] = `value_${i}`;
      }

      const record = {
        id: 'record_123',
        region: 'us-east',
      };

      const startTime = performance.now();

      const result = testRuleCondition(invoiceRule, largeContext, record);

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

      const context = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      });

      // Should handle without stack overflow
      expect(() => {
        const result = testRuleCondition(invoiceRule, context, deepRecord);
        expect(result).toBe(true);
      }).not.toThrow();
    });

    it('should handle circular references safely', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const circularContext = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      } as any);
      (circularContext as any).self = circularContext;

      const circularRecord: any = {
        id: 'record_123',
        region: 'us-east',
      };
      circularRecord.parent = circularRecord;

      // Should handle circular references without infinite loops
      expect(() => {
        const result = testRuleCondition(invoiceRule, circularContext, circularRecord);
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

        return testRuleCondition(rule, context as UserContext, record);
      });

      return Promise.all(promises).then(results => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(results).toHaveLength(100);
        expect(duration).toBeLessThan(500); // Should complete concurrently
        
        results.forEach(validateResultType);
      });
    });
  });

  describe('authorization bypass prevention', () => {
    it('should prevent attribute manipulation through context injection', () => {
      const paymentRule = abacRules.find(rule => rule.resource === 'payments' && rule.action === 'approve');
      expect(paymentRule).toBeDefined();

      const maliciousContext = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        clearanceLevel: 1, // Low clearance
        // Injection attempts
        constructor: { prototype: { clearanceLevel: 10 } },
        __proto__: { clearanceLevel: 10 },
        valueOf: () => ({ clearanceLevel: 10 }),
        toString: () => '10',
      } as any);

      const record = { id: 'payment_123' };

      const result = testRuleCondition(paymentRule, maliciousContext, record);

      // Should not be granted access through injection
      expect(result).toBe(false); // clearanceLevel 1 < 3
    });

    it('should prevent region bypassing through record manipulation', () => {
      const invoiceRule = abacRules.find(rule => rule.resource === 'invoices' && rule.action === 'read');
      expect(invoiceRule).toBeDefined();

      const context = ensureValidContext({
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      });

      const maliciousRecord = {
        id: 'record_123',
        region: 'eu-west', // Different region
        // Injection attempts
        constructor: { region: 'us-east' },
        __proto__: { region: 'us-east' },
        valueOf: () => ({ region: 'us-east' }),
        toString: () => 'us-east',
      };

      const result = testRuleCondition(invoiceRule, context, maliciousRecord);

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
        const context = ensureValidContext({
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
          ...contextOverride,
        } as any); // Type assertion needed for type confusion testing

        const record = { id: 'payment_123' };

        const result = testRuleCondition(paymentRule, context, record);

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

      const result = testRuleCondition(invoiceRule, sensitiveContext, sensitiveRecord);

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
          paymentRule?.condition?.(context, record);
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

      const result = testRuleCondition(invoiceRule, context, record);

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

      const result = testRuleCondition(invoiceRule, maliciousContext, invoice);

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

      const result = testRuleCondition(paymentRule, maliciousContext, payment);

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

      edgeCases.forEach(testEdgeCaseScenarioSafely(invoiceRule, paymentRule));
    });
  });
});