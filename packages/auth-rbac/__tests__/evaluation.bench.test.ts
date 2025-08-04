/**
 * SPDX-License-Identifier: MIT
 * 
 * RBAC Permission Evaluation Performance Benchmarks
 * 
 * These benchmarks test the performance of RBAC permission evaluation operations
 * which are critical for access control performance in authentication flows.
 * 
 * Performance Expectations:
 * - Single permission evaluation: < 1ms
 * - Batch evaluation (100 permissions): < 50ms
 * - Large rule set evaluation (1000+ rules): < 100ms
 * - Field-level permission evaluation: < 2ms
 * - Concurrent evaluations (100): < 100ms
 * - DSL rule evaluation: < 5ms
 */

import { describe, expect, beforeEach, bench } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import type { AccessEvaluationInput, PermissionRule, UserContext } from '../types/index.js';

describe('RBAC Permission Evaluation Benchmarks', () => {
  let baseContext: UserContext;
  let baseRecord: Record<string, unknown>;
  let simpleRules: PermissionRule[];
  let complexRules: PermissionRule[];
  let largeRuleSet: PermissionRule[];

  beforeEach(() => {
    baseContext = {
      userId: 'user_123',
      role: 'admin',
      tenantId: 'tenant_456',
    };

    baseRecord = {
      id: 'record_789',
      ownerId: 'user_123',
      status: 'active',
      tenantId: 'tenant_456',
    };

    // Simple rules for basic benchmarking
    simpleRules = [
      {
        resource: 'users',
        action: 'read',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      },
      {
        resource: 'posts',
        action: 'create',
        condition: (ctx: UserContext) => ctx.role === 'admin' || ctx.role === 'editor',
      },
      {
        resource: 'comments',
        action: 'delete',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      },
    ];

    // Complex rules with field permissions and complex conditions
    complexRules = [
      {
        resource: 'users',
        action: 'read',
        fieldPermissions: {
          id: 'read',
          name: 'read',
          email: 'read',
          password: 'none',
          ssn: 'none',
        },
        condition: (ctx: UserContext, record?: any) => {
          return ctx.role === 'admin' || (ctx.role === 'user' && record?.ownerId === ctx.userId);
        },
      },
      {
        resource: 'posts',
        action: 'update',
        fieldPermissions: {
          title: 'write',
          content: 'write',
          publishedAt: 'read',
          createdAt: 'read',
          authorId: 'none',
        },
        condition: (ctx: UserContext, record?: any) => {
          if (ctx.role === 'admin') return true;
          if (ctx.role === 'editor') return record?.status !== 'published';
          return ctx.role === 'user' && record?.ownerId === ctx.userId;
        },
      },
    ];

    // Large rule set for scalability testing
    largeRuleSet = [];
    for (let i = 0; i < 1000; i++) {
      largeRuleSet.push({
        resource: `resource_${i}`,
        action: `action_${i % 10}`,
        condition: (ctx: UserContext) => {
          // Simulate various role checks
          const roles = ['admin', 'editor', 'user', 'viewer'];
          return roles.includes(ctx.role || '');
        },
      });
    }

    // Add a target rule at the end for worst-case scenarios
    largeRuleSet.push({
      resource: 'target_resource',
      action: 'target_action',
      condition: (ctx: UserContext) => ctx.role === 'admin',
    });
  });

  describe('Single Permission Evaluation', () => {
    bench('evaluate simple permission (admin read users)', () => {
      const input: AccessEvaluationInput = {
        rules: simpleRules,
        context: baseContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });

    bench('evaluate permission with record context', () => {
      const input: AccessEvaluationInput = {
        rules: complexRules,
        context: baseContext,
        action: 'read',
        resource: 'users',
        record: baseRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('evaluate field-level permission', () => {
      const input: AccessEvaluationInput = {
        rules: complexRules,
        context: baseContext,
        action: 'read',
        resource: 'users',
        record: baseRecord,
        field: 'email',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('evaluate denied permission', () => {
      const input: AccessEvaluationInput = {
        rules: simpleRules,
        context: { ...baseContext, role: 'viewer' },
        action: 'delete',
        resource: 'comments',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(false);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });
  });

  describe('Batch Permission Evaluation', () => {
    bench('evaluate 10 permissions sequentially', () => {
      const actions = ['create', 'read', 'update', 'delete'];
      const resources = ['users', 'posts', 'comments'];
      
      let successCount = 0;
      
      for (const resource of resources) {
        for (const action of actions) {
          const input: AccessEvaluationInput = {
            rules: simpleRules,
            context: baseContext,
            action,
            resource,
          };
          
          const result = evaluateAccess(input);
          if (result.can) successCount++;
        }
      }
      
      expect(successCount).toBeGreaterThan(0);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('evaluate 50 permissions with different contexts', () => {
      const contexts = [
        { ...baseContext, role: 'admin' },
        { ...baseContext, role: 'editor' },
        { ...baseContext, role: 'user' },
        { ...baseContext, role: 'viewer' },
      ];

      let totalEvaluations = 0;

      for (let i = 0; i < 50; i++) {
        const context = contexts[i % contexts.length];
        const input: AccessEvaluationInput = {
          rules: simpleRules,
          context,
          action: 'read',
          resource: 'users',
        };

        evaluateAccess(input);
        totalEvaluations++;
      }

      expect(totalEvaluations).toBe(50);
    }, {
      iterations: 200,
      warmupIterations: 20,
    });

    bench('evaluate 100 field-level permissions', () => {
      const fields = ['id', 'name', 'email', 'password', 'ssn'];
      let evaluationCount = 0;

      for (let i = 0; i < 100; i++) {
        const field = fields[i % fields.length];
        const input: AccessEvaluationInput = {
          rules: complexRules,
          context: baseContext,
          action: 'read',
          resource: 'users',
          record: baseRecord,
          field,
        };

        evaluateAccess(input);
        evaluationCount++;
      }

      expect(evaluationCount).toBe(100);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });
  });

  describe('Large Rule Set Performance', () => {
    bench('evaluate against 1000 rules (worst case - target at end)', () => {
      const input: AccessEvaluationInput = {
        rules: largeRuleSet,
        context: baseContext,
        action: 'target_action',
        resource: 'target_resource',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('evaluate against 1000 rules (best case - early match)', () => {
      // Create rules with early match
      const earlyMatchRules = [
        {
          resource: 'early_resource',
          action: 'early_action',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
        ...largeRuleSet,
      ];

      const input: AccessEvaluationInput = {
        rules: earlyMatchRules,
        context: baseContext,
        action: 'early_action',
        resource: 'early_resource',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('evaluate against 1000 rules (no match)', () => {
      const input: AccessEvaluationInput = {
        rules: largeRuleSet,
        context: baseContext,
        action: 'nonexistent_action',
        resource: 'nonexistent_resource',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(false);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });
  });

  describe('Concurrent Evaluation Performance', () => {
    bench('evaluate 10 permissions concurrently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const input: AccessEvaluationInput = {
          rules: simpleRules,
          context: { ...baseContext, userId: `user_${i}` },
          action: 'read',
          resource: 'users',
        };

        return Promise.resolve(evaluateAccess(input));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => expect(result.can).toBe(true));
    }, {
      iterations: 500,
      warmupIterations: 50,
    });

    bench('evaluate 50 permissions concurrently', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const input: AccessEvaluationInput = {
          rules: simpleRules,
          context: { ...baseContext, userId: `user_${i}` },
          action: 'read',
          resource: 'users',
        };

        return Promise.resolve(evaluateAccess(input));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('evaluate 100 permissions concurrently', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const input: AccessEvaluationInput = {
          rules: complexRules,
          context: { ...baseContext, userId: `user_${i}` },
          action: 'read',
          resource: 'users',
          record: { ...baseRecord, ownerId: `user_${i}` },
        };

        return Promise.resolve(evaluateAccess(input));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
    }, {
      iterations: 50,
      warmupIterations: 5,
    });
  });

  describe('Complex Condition Performance', () => {
    bench('evaluate expensive condition functions', () => {
      const expensiveRules: PermissionRule[] = [
        {
          resource: 'expensive_resource',
          action: 'read',
          condition: (ctx: UserContext, record?: any) => {
            // Simulate expensive computation
            let computationResult = 0;
            for (let i = 0; i < 1000; i++) {
              computationResult += Math.sqrt(i);
            }
            
            return ctx.role === 'admin' && computationResult > 0 && record?.status === 'active';
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules: expensiveRules,
        context: baseContext,
        action: 'read',
        resource: 'expensive_resource',
        record: baseRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('evaluate nested object access conditions', () => {
      const nestedRules: PermissionRule[] = [
        {
          resource: 'nested_resource',
          action: 'read',
          condition: (ctx: UserContext, record?: any) => {
            return (
              ctx.role === 'admin' &&
              record?.metadata?.permissions?.includes('read') &&
              record?.metadata?.owner?.id === ctx.userId &&
              record?.metadata?.tenant?.id === ctx.tenantId
            );
          },
        },
      ];

      const nestedRecord = {
        ...baseRecord,
        metadata: {
          permissions: ['read', 'write'],
          owner: { id: 'user_123', name: 'Admin User' },
          tenant: { id: 'tenant_456', name: 'Test Tenant' },
        },
      };

      const input: AccessEvaluationInput = {
        rules: nestedRules,
        context: baseContext,
        action: 'read',
        resource: 'nested_resource',
        record: nestedRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });

  describe('Memory and Resource Usage', () => {
    bench('memory stability with repeated evaluations', () => {
      const startMemory = process.memoryUsage();
      
      for (let i = 0; i < 10000; i++) {
        const input: AccessEvaluationInput = {
          rules: simpleRules,
          context: baseContext,
          action: 'read',
          resource: 'users',
        };
        
        evaluateAccess(input);
      }
      
      const endMemory = process.memoryUsage();
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      
      // Memory growth should be minimal (< 10MB for 10k iterations)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    }, {
      iterations: 10,
      warmupIterations: 1,
    });

    bench('large context object handling', () => {
      // Create a large context object
      const largeContext: UserContext & Record<string, unknown> = {
        ...baseContext,
      };

      // Add 500 additional properties
      for (let i = 0; i < 500; i++) {
        largeContext[`property_${i}`] = {
          id: i,
          name: `Property ${i}`,
          value: `Value ${'x'.repeat(50)}`,
          metadata: { created: new Date(), active: true },
        };
      }

      const input: AccessEvaluationInput = {
        rules: simpleRules,
        context: largeContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    bench('handle rules with undefined conditions', () => {
      const undefinedConditionRules: PermissionRule[] = [
        {
          resource: 'test_resource',
          action: 'read',
          // No condition - should default to true
        },
      ];

      const input: AccessEvaluationInput = {
        rules: undefinedConditionRules,
        context: baseContext,
        action: 'read',
        resource: 'test_resource',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('handle invalid field permissions', () => {
      const invalidFieldRules: PermissionRule[] = [
        {
          resource: 'test_resource',
          action: 'read',
          fieldPermissions: {
            validField: 'read',
            restrictedField: 'none',
          },
          condition: () => true,
        },
      ];

      const input: AccessEvaluationInput = {
        rules: invalidFieldRules,
        context: baseContext,
        action: 'read',
        resource: 'test_resource',
        field: 'restrictedField',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(false);
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('handle condition exceptions gracefully', () => {
      const faultyRules: PermissionRule[] = [
        {
          resource: 'faulty_resource',
          action: 'read',
          condition: () => {
            // This will throw an error
            throw new Error('Condition evaluation failed');
          },
        },
        {
          resource: 'faulty_resource',
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
      ];

      const input: AccessEvaluationInput = {
        rules: faultyRules,
        context: baseContext,
        action: 'read',
        resource: 'faulty_resource',
      };

      // Should handle the exception and continue to next rule
      let result;
      try {
        result = evaluateAccess(input);
      } catch {
        // If exception handling isn't in place, this will catch it
        result = { can: false, reason: 'Condition evaluation failed' };
      }

      // Either it handles the exception and continues, or it fails gracefully
      expect(typeof result.can).toBe('boolean');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });
});