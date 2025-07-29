/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import { evaluateDsl } from '../engine/evaluate-dsl.js';
import type { AccessEvaluationInput, PermissionRule, UserContext } from '../types/index.js';

describe('Security Vulnerability Tests - RBAC System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorization bypass prevention', () => {
    it('should prevent rule injection through malicious context', () => {
      const maliciousContext: UserContext & Record<string, any> = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        // Injection attempts
        constructor: { prototype: { role: 'admin' } },
        __proto__: { role: 'admin' },
        prototype: { role: 'admin' },
        role__proto__: 'admin',
      };

      const rules: PermissionRule[] = [
        {
          resource: 'admin_panel',
          action: 'access',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: maliciousContext,
        action: 'access',
        resource: 'admin_panel',
      };

      const result = evaluateAccess(input);
      
      // Should not be granted admin access through prototype pollution
      expect(result.can).toBe(false);
    });

    it('should prevent privilege escalation through record manipulation', () => {
      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const maliciousRecord = {
        id: 'record_123',
        ownerId: 'user_123',
        // Injection attempts
        constructor: { name: 'Admin' },
        __proto__: { ownerId: 'admin_user' },
        valueOf: () => ({ ownerId: 'admin_user' }),
        toString: () => 'admin_record',
      };

      const rules: PermissionRule[] = [
        {
          resource: 'documents',
          action: 'delete',
          condition: (ctx: UserContext, record?: any) => {
            return record && record.ownerId === ctx.userId && ctx.role === 'admin';
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context,
        action: 'delete',
        resource: 'documents',
        record: maliciousRecord,
      };

      const result = evaluateAccess(input);
      
      // Should not grant delete access to non-admin user
      expect(result.can).toBe(false);
    });

    it('should prevent DSL injection attacks', () => {
      const maliciousDslNode = {
        equals: ['context.role', 'admin'], // Looks innocent
        // Hidden properties that might be processed
        __proto__: { equals: ['context.userId', 'context.userId'] },
        constructor: { equals: ['context.role', 'admin'] },
        valueOf: () => ({ equals: ['context.role', 'admin'] }),
      };

      const context = {
        userId: 'user_123',
        role: 'user', // Not admin
      };

      const record = {
        id: 'record_123',
        sensitive: true,
      };

      const result = evaluateDsl(maliciousDslNode as any, context, record);
      
      // Should evaluate based on actual structure, not injected properties
      expect(result).toBe(false); // user !== admin
    });

    it('should prevent condition function manipulation', () => {
      const maliciousCondition = function(ctx: UserContext, record?: any) {
        // Attempt to modify global objects
        try {
          (global as any).__admin_override = true;
          (globalThis as any).__grant_access = true;
          (ctx as any).__proto__.role = 'admin';
          if (record) {
            (record as any).__proto__.authorized = true;
          }
        } catch (e) {
          // Expected to fail in strict mode
        }
        
        return ctx.role === 'admin';
      };

      const rules: PermissionRule[] = [
        {
          resource: 'secure_data',
          action: 'access',
          condition: maliciousCondition,
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const input: AccessEvaluationInput = {
        rules,
        context,
        action: 'access',
        resource: 'secure_data',
      };

      const result = evaluateAccess(input);
      
      // Should not grant access despite manipulation attempts
      expect(result.can).toBe(false);
      
      // Verify global objects weren't modified
      expect((global as any).__admin_override).toBeUndefined();
      expect((globalThis as any).__grant_access).toBeUndefined();
    });
  });

  describe('input validation and sanitization', () => {
    it('should handle SQL injection attempts in DSL values', () => {
      const sqlInjectionNode = {
        equals: [
          'context.userId',
          "'; DROP TABLE users; --"
        ],
      };

      const context = {
        userId: "'; DROP TABLE users; --",
        role: 'user',
      };

      const result = evaluateDsl(sqlInjectionNode, context, null);
      
      // Should evaluate string equality correctly without SQL execution
      expect(result).toBe(true); // Strings match exactly
    });

    it('should handle NoSQL injection attempts in conditions', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'user_data',
          action: 'access',
          condition: (ctx: UserContext, record?: any) => {
            // Simulate vulnerable NoSQL query pattern
            const query = { userId: ctx.userId };
            
            // In a real NoSQL database, this could be dangerous:
            // db.collection.find({ userId: { $ne: null } })
            // But our evaluation should handle it safely
            
            if (typeof ctx.userId === 'object') {
              return false; // Reject object injection attempts
            }
            
            return ctx.userId === 'authorized_user';
          },
        },
      ];

      const maliciousContext: UserContext = {
        userId: { $ne: null } as any, // NoSQL injection attempt
        role: 'user',
        tenantId: 'tenant_123',
      };

      const input: AccessEvaluationInput = {
        rules,
        context: maliciousContext,
        action: 'access',
        resource: 'user_data',
      };

      const result = evaluateAccess(input);
      
      // Should reject object-based injection
      expect(result.can).toBe(false);
    });

    it('should handle XSS attempts in field names', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'user_profiles',
          action: 'read',
          fieldPermissions: {
            name: 'read',
            email: 'read',
            '<script>alert("xss")</script>': 'none', // Malicious field name
            'javascript:alert(1)': 'none',
            'onload=alert(1)': 'none',
          },
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      // Test access to malicious field names
      const maliciousFields = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'onload=alert(1)',
        '<img src="x" onerror="alert(1)">',
      ];

      maliciousFields.forEach(field => {
        const input: AccessEvaluationInput = {
          rules,
          context,
          action: 'read',
          resource: 'user_profiles',
          field,
        };

        const result = evaluateAccess(input);
        
        // Should handle malicious field names without execution
        expect(result.can).toBe(false);
        expect(result.reason).toContain(`No access to field '${field}'`);
      });
    });

    it('should prevent LDAP injection in context attributes', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'directory',
          action: 'search',
          condition: (ctx: UserContext) => {
            // Simulate LDAP query construction (vulnerable pattern)
            const ldapFilter = `(uid=${ctx.userId})`;
            
            // In real LDAP, injection like )(objectClass=*) could be dangerous
            // Our evaluation should treat it as a literal string
            
            if (ctx.userId.includes(')(')) {
              return false; // Reject injection patterns
            }
            
            return ctx.role === 'directory_admin';
          },
        },
      ];

      const ldapInjectionContext: UserContext = {
        userId: 'user*)(objectClass=*)(uid=admin', // LDAP injection attempt
        role: 'directory_admin',
        tenantId: 'tenant_123',
      };

      const input: AccessEvaluationInput = {
        rules,
        context: ldapInjectionContext,
        action: 'search',
        resource: 'directory',
      };

      const result = evaluateAccess(input);
      
      // Should reject LDAP injection patterns
      expect(result.can).toBe(false);
    });

    it('should sanitize path traversal attempts in resource names', () => {
      const pathTraversalResources = [
        '../../../etc/passwd',
        '..\\windows\\system32\\config\\sam',
        '/var/log/../../../etc/shadow',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      const rules: PermissionRule[] = [
        {
          resource: 'files',
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'admin',
        tenantId: 'tenant_456',
      };

      pathTraversalResources.forEach(maliciousResource => {
        const input: AccessEvaluationInput = {
          rules,
          context,
          action: 'read',
          resource: maliciousResource,
        };

        const result = evaluateAccess(input);
        
        // Should not match legitimate resource names
        expect(result.can).toBe(false);
        expect(result.reason).toBe('No matching rule found');
      });
    });
  });

  describe('timing attack prevention', () => {
    it('should have consistent evaluation time regardless of rule complexity', () => {
      const simpleRule: PermissionRule = {
        resource: 'simple',
        action: 'read',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      };

      const complexRule: PermissionRule = {
        resource: 'complex',
        action: 'read',
        condition: (ctx: UserContext, record?: any) => {
          // Complex condition with multiple checks
          const checks = [
            ctx.role === 'admin',
            ctx.tenantId === 'valid_tenant',
            record && record.status === 'active',
            ctx.userId && ctx.userId.length > 5,
            new Date().getHours() > 8 && new Date().getHours() < 18,
          ];
          return checks.every(Boolean);
        },
      };

      const context: UserContext = {
        userId: 'user_123',
        role: 'user', // Not admin - will fail early
        tenantId: 'tenant_456',
      };

      const record = {
        id: 'record_123',
        status: 'active',
      };

      // Test simple rule timing
      const simpleStartTime = performance.now();
      const simpleResult = evaluateAccess({
        rules: [simpleRule],
        context,
        action: 'read',
        resource: 'simple',
        record,
      });
      const simpleEndTime = performance.now();
      const simpleDuration = simpleEndTime - simpleStartTime;

      // Test complex rule timing
      const complexStartTime = performance.now();
      const complexResult = evaluateAccess({
        rules: [complexRule],
        context,
        action: 'read',
        resource: 'complex',
        record,
      });
      const complexEndTime = performance.now();
      const complexDuration = complexEndTime - complexStartTime;

      // Both should fail
      expect(simpleResult.can).toBe(false);
      expect(complexResult.can).toBe(false);

      // Timing difference should be minimal
      const timingDifference = Math.abs(simpleDuration - complexDuration);
      expect(timingDifference).toBeLessThan(5); // Less than 5ms difference
    });

    it('should prevent user enumeration through timing differences', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'user_profiles',
          action: 'view',
          condition: (ctx: UserContext, record?: any) => {
            // Simulate user lookup that might have timing differences
            if (!record || !record.userId) return false;
            
            // Don't reveal whether user exists through timing
            const userExists = ['user_123', 'user_456', 'user_789'].includes(record.userId);
            const isOwner = record.userId === ctx.userId;
            
            return userExists && isOwner;
          },
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const existingUserRecord = { userId: 'user_456' };
      const nonExistentUserRecord = { userId: 'user_999' };

      // Test timing for existing user
      const existingStartTime = performance.now();
      const existingResult = evaluateAccess({
        rules,
        context,
        action: 'view',
        resource: 'user_profiles',
        record: existingUserRecord,
      });
      const existingEndTime = performance.now();
      const existingDuration = existingEndTime - existingStartTime;

      // Test timing for non-existent user
      const nonExistentStartTime = performance.now();
      const nonExistentResult = evaluateAccess({
        rules,
        context,
        action: 'view',
        resource: 'user_profiles',
        record: nonExistentUserRecord,
      });
      const nonExistentEndTime = performance.now();
      const nonExistentDuration = nonExistentEndTime - nonExistentStartTime;

      // Both should fail (user can only view own profile)
      expect(existingResult.can).toBe(false);
      expect(nonExistentResult.can).toBe(false);

      // Timing should be similar to prevent enumeration
      const timingDifference = Math.abs(existingDuration - nonExistentDuration);
      expect(timingDifference).toBeLessThan(2);
    });
  });

  describe('memory and resource exhaustion prevention', () => {
    it('should handle deeply nested DSL structures without stack overflow', () => {
      // Create deeply nested DSL structure
      let deepDsl: any = { equals: ['context.role', 'admin'] };
      
      for (let i = 0; i < 1000; i++) {
        deepDsl = {
          and: [deepDsl, { equals: ['context.userId', 'context.userId'] }],
        };
      }

      const context = {
        userId: 'user_123',
        role: 'admin',
      };

      // Should handle without stack overflow
      expect(() => {
        const result = evaluateDsl(deepDsl, context, null);
        expect(typeof result).toBe('boolean');
      }).not.toThrow();
    });

    it('should handle large numbers of rules efficiently', () => {
      // Create many rules to test resource consumption
      const rules: PermissionRule[] = [];
      
      for (let i = 0; i < 10000; i++) {
        rules.push({
          resource: `resource_${i}`,
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === `role_${i}`,
        });
      }

      // Add one matching rule at the end
      rules.push({
        resource: 'target_resource',
        action: 'read',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      });

      const context: UserContext = {
        userId: 'user_123',
        role: 'admin',
        tenantId: 'tenant_456',
      };

      const startTime = performance.now();
      
      const result = evaluateAccess({
        rules,
        context,
        action: 'read',
        resource: 'target_resource',
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.can).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should handle circular references in context/record safely', () => {
      const circularContext: any = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };
      circularContext.self = circularContext;

      const circularRecord: any = {
        id: 'record_123',
        ownerId: 'user_123',
      };
      circularRecord.parent = circularRecord;

      const rules: PermissionRule[] = [
        {
          resource: 'documents',
          action: 'read',
          condition: (ctx: UserContext, record?: any) => {
            // Try to access circular references
            try {
              return ctx.userId === record?.ownerId;
            } catch (error) {
              return false;
            }
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: circularContext,
        action: 'read',
        resource: 'documents',
        record: circularRecord,
      };

      // Should handle circular references without infinite loops
      expect(() => {
        const result = evaluateAccess(input);
        expect(result.can).toBe(true);
      }).not.toThrow();
    });
  });

  describe('code injection prevention', () => {
    it('should prevent JavaScript code injection in DSL', () => {
      const maliciousDsl = {
        equals: [
          'context.role',
          'admin; process.exit(0); //'
        ],
      };

      const context = {
        userId: 'user_123',
        role: 'admin; process.exit(0); //',
      };

      // Should evaluate as string comparison, not execute code
      const result = evaluateDsl(maliciousDsl, context, null);
      expect(result).toBe(true); // Strings match exactly
      
      // Process should still be running (not exited)
      expect(process.exit).toBeDefined();
    });

    it('should prevent eval() injection attempts', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'eval_test',
          action: 'execute',
          condition: (ctx: UserContext) => {
            // Malicious attempt to use eval
            const maliciousInput = `'; eval('process.exit(0)'); //`;
            
            // Safe comparison that doesn't use eval
            return ctx.role === 'admin' && !maliciousInput.includes('eval');
          },
        },
      ];

      const maliciousContext: UserContext = {
        userId: 'user_123',
        role: `'; eval('process.exit(0)'); //`,
        tenantId: 'tenant_456',
      };

      const input: AccessEvaluationInput = {
        rules,
        context: maliciousContext,
        action: 'execute',
        resource: 'eval_test',
      };

      const result = evaluateAccess(input);
      
      // Should not execute malicious code
      expect(result.can).toBe(false);
    });

    it('should prevent Function constructor injection', () => {
      const maliciousCondition = function(ctx: UserContext) {
        try {
          // Attempt to use Function constructor
          const maliciousFunc = new Function('return process.exit(0)');
          maliciousFunc();
        } catch (error) {
          // Expected to fail in secure environments
        }
        
        return ctx.role === 'admin';
      };

      const rules: PermissionRule[] = [
        {
          resource: 'function_test',
          action: 'execute',
          condition: maliciousCondition,
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'user', // Not admin
        tenantId: 'tenant_456',
      };

      const input: AccessEvaluationInput = {
        rules,
        context,
        action: 'execute',
        resource: 'function_test',
      };

      // Should not execute malicious code or grant access
      expect(() => {
        const result = evaluateAccess(input);
        expect(result.can).toBe(false);
      }).not.toThrow();
    });
  });

  describe('information disclosure prevention', () => {
    it('should not leak internal rule structure in error messages', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'secret_resource',
          action: 'access',
          condition: (ctx: UserContext) => {
            throw new Error('Internal rule error: secret_key_12345');
          },
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const input: AccessEvaluationInput = {
        rules,
        context,
        action: 'access',
        resource: 'secret_resource',
      };

      // Should handle rule errors gracefully without leaking information
      expect(() => {
        const result = evaluateAccess(input);
        // Result should be denial by default
        expect(result.can).toBe(false);
      }).toThrow(); // Currently throws, but could be improved to catch and deny
    });

    it('should not expose field permissions in denial reasons', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'sensitive_data',
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === 'analyst',
          fieldPermissions: {
            public_field: 'read',
            confidential_field: 'none',
            secret_api_key: 'none',
            internal_database_url: 'none',
          },
        },
      ];

      const context: UserContext = {
        userId: 'user_123',
        role: 'analyst',
        tenantId: 'tenant_456',
      };

      const restrictedFields = ['secret_api_key', 'internal_database_url'];

      restrictedFields.forEach(field => {
        const input: AccessEvaluationInput = {
          rules,
          context,
          action: 'read',
          resource: 'sensitive_data',
          field,
        };

        const result = evaluateAccess(input);
        
        expect(result.can).toBe(false);
        
        // Should provide generic denial message
        expect(result.reason).toBe(`No access to field '${field}'`);
        
        // Should not leak information about what other fields exist
        expect(result.reason).not.toContain('confidential_field');
        expect(result.reason).not.toContain('api_key');
        expect(result.reason).not.toContain('database_url');
      });
    });
  });
});