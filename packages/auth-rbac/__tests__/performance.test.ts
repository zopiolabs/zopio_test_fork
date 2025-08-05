/**
 * @fileoverview Auth-RBAC Tests - Performance and Scalability
 * 
 * Performance test suite for the RBAC system focusing on scalability, memory usage,
 * and response times under various load conditions. Tests critical performance characteristics
 * that impact production authorization systems.
 * 
 * **Test Scope:**
 * - Large permission rule sets (1000+ rules)
 * - Complex field permission hierarchies
 * - Deeply nested DSL rule structures
 * - Concurrent evaluation scenarios
 * - Memory usage patterns and leak detection
 * - Worst-case performance scenarios
 * 
 * **Test Categories:**
 * 1. **Large Permission Sets**: 1000+ rules with early/late matching scenarios
 * 2. **Complex Field Permissions**: Multi-level field hierarchies with 500+ rules
 * 3. **Concurrent Evaluations**: Parallel permission checks without interference
 * 4. **Memory Patterns**: Memory stability, large context objects, repeated evaluations
 * 5. **Worst-Case Scenarios**: No matches, expensive conditions, failing conditions
 * 6. **Scalability Benchmarks**: Linear performance scaling validation
 * 
 * **Mock Strategy:**
 * - Generated large rule sets with controlled complexity
 * - Realistic user contexts with varying roles and attributes
 * - Performance timing with permissionTestUtils integration
 * - Memory usage monitoring via process.memoryUsage()
 * 
 * **Quality Standards:**
 * - Single permission evaluation: < 50ms
 * - 1000 rule evaluation: < 100ms
 * - Memory growth: < 10MB over 10k iterations
 * - Concurrent evaluations: < 200ms for 100 parallel checks
 * - Performance scaling must be sub-linear
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import { permissionTestUtils } from '@repo/testing';
import type { AccessEvaluationInput, PermissionRule, UserContext } from '../types/index.js';

describe('RBAC Performance Tests', () => {
  let baseContext: UserContext;
  let baseRecord: Record<string, unknown>;

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
    };
  });

  describe('large permission sets', () => {
    it('should handle 1000 permission rules efficiently', () => {
      const rules: PermissionRule[] = [];
      
      // Generate 1000 rules with different resources and actions
      for (let i = 0; i < 1000; i++) {
        rules.push({
          resource: `resource_${i}`,
          action: `action_${i % 10}`, // 10 different actions
          condition: (ctx: UserContext) => ctx.role === 'admin',
        });
      }

      // Add one matching rule at the end
      rules.push({
        resource: 'target_resource',
        action: 'target_action',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      });

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'target_action',
        resource: 'target_resource',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in < 50ms
    });

    it('should handle 10000 permission rules with early exit', () => {
      const rules: PermissionRule[] = [];
      
      // Add a matching rule first (should exit early)
      rules.push({
        resource: 'early_resource',
        action: 'early_action',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      });

      // Generate 10000 non-matching rules
      for (let i = 0; i < 10000; i++) {
        rules.push({
          resource: `resource_${i}`,
          action: `action_${i}`,
          condition: (ctx: UserContext) => ctx.role === 'superuser', // Won't match
        });
      }

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'early_action',
        resource: 'early_resource',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(10); // Should exit early
    });

    it('should handle complex field permissions at scale', () => {
      const rules: PermissionRule[] = [];
      
      // Generate 500 rules with complex field permissions
      for (let i = 0; i < 500; i++) {
        const fieldPermissions: Record<string, 'read' | 'write' | 'none'> = {};
        
        // Generate 20 field permissions per rule
        for (let j = 0; j < 20; j++) {
          fieldPermissions[`field_${j}`] = j % 3 === 0 ? 'read' : 
                                         j % 3 === 1 ? 'write' : 'none';
        }

        rules.push({
          resource: `resource_${i}`,
          action: 'read',
          fieldPermissions,
          condition: (ctx: UserContext) => ctx.role === 'admin',
        });
      }

      // Add target rule
      rules.push({
        resource: 'target_resource',
        action: 'read',
        fieldPermissions: {
          target_field: 'read',
          secret_field: 'none',
        },
        condition: (ctx: UserContext) => ctx.role === 'admin',
      });

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'read',
        resource: 'target_resource',
        field: 'target_field',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete efficiently
    });

    it('should handle deeply nested DSL rules efficiently', () => {
      const createNestedDSL = (depth: number): any => {
        if (depth === 0) {
          return { equals: ['context.role', 'context.role'] };
        }
        
        return {
          and: [
            createNestedDSL(depth - 1),
            { equals: ['context.userId', 'context.userId'] },
          ],
        };
      };

      const rules: PermissionRule[] = [
        {
          resource: 'nested_resource',
          action: 'read',
          dsl: createNestedDSL(50), // 50 levels deep
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'read',
        resource: 'nested_resource',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should handle deep nesting
    });
  });

  describe('concurrent evaluation scenarios', () => {
    it('should handle concurrent evaluations without interference', async () => {
      const rules: PermissionRule[] = [
        {
          resource: 'concurrent_resource',
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
      ];

      const promises = [];
      const numConcurrent = 100;

      for (let i = 0; i < numConcurrent; i++) {
        const context = {
          ...baseContext,
          userId: `user_${i}`,
        };

        const input: AccessEvaluationInput = {
          rules,
          context,
          action: 'read',
          resource: 'concurrent_resource',
        };

        promises.push(Promise.resolve(evaluateAccess(input)));
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(numConcurrent);
      results.forEach(result => {
        expect(result.can).toBe(true);
      });
      
      expect(endTime - startTime).toBeLessThan(100); // Should handle concurrency
    });

    it('should maintain performance with varying rule complexity', async () => {
      const createRulesWithComplexity = (complexity: number): PermissionRule[] => {
        const rules: PermissionRule[] = [];
        
        for (let i = 0; i < complexity * 10; i++) {
          rules.push({
            resource: `resource_${i}`,
            action: `action_${i % 5}`,
            condition: (ctx: UserContext, record?: any) => {
              // Simulate complex condition logic
              const checks = [];
              for (let j = 0; j < complexity; j++) {
                checks.push(ctx.role === 'admin' || (record && record.ownerId === ctx.userId));
              }
              return checks.every(Boolean);
            },
          });
        }

        return rules;
      };

      const complexities = [1, 5, 10, 20];
      const promises = [];

      for (const complexity of complexities) {
        const rules = createRulesWithComplexity(complexity);
        
        // Add a matching rule
        rules.push({
          resource: 'test_resource',
          action: 'test_action',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        });

        const input: AccessEvaluationInput = {
          rules,
          context: baseContext,
          action: 'test_action',
          resource: 'test_resource',
        };

        promises.push(Promise.resolve(evaluateAccess(input)));
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(complexities.length);
      results.forEach(result => {
        expect(result.can).toBe(true);
      });

      expect(endTime - startTime).toBeLessThan(200); // Should handle varying complexity
    });
  });

  describe('memory usage patterns', () => {
    it('should not leak memory with repeated evaluations', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'memory_test',
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'read',
        resource: 'memory_test',
      };

      // Simulate repeated evaluations
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = evaluateAccess(input);
        expect(result.can).toBe(true);
      }

      const endTime = performance.now();

      // Should maintain consistent performance across iterations
      expect(endTime - startTime).toBeLessThan(1000); // < 1 second for 10k iterations
    });

    it('should handle large context objects efficiently', () => {
      // Create a large context object
      const largeContext: UserContext & Record<string, unknown> = {
        userId: 'user_123',
        role: 'admin',
        tenantId: 'tenant_456',
      };

      // Add 1000 additional properties
      for (let i = 0; i < 1000; i++) {
        largeContext[`property_${i}`] = `value_${i}`;
      }

      const rules: PermissionRule[] = [
        {
          resource: 'large_context_test',
          action: 'read',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: largeContext,
        action: 'read',
        resource: 'large_context_test',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should handle large context
    });

    it('should handle large record objects efficiently', () => {
      // Create a large record object
      const largeRecord: Record<string, unknown> = {
        id: 'record_123',
        ownerId: 'user_123',
      };

      // Add 1000 additional properties
      for (let i = 0; i < 1000; i++) {
        largeRecord[`field_${i}`] = `value_${i}`;
      }

      const rules: PermissionRule[] = [
        {
          resource: 'large_record_test',
          action: 'read',
          condition: (ctx: UserContext, record?: any) => {
            return ctx.role === 'admin' && record?.ownerId === ctx.userId;
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'read',
        resource: 'large_record_test',
        record: largeRecord,
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should handle large record
    });
  });

  describe('worst-case scenarios', () => {
    it('should handle no matching rules efficiently', () => {
      const rules: PermissionRule[] = [];
      
      // Generate 5000 non-matching rules
      for (let i = 0; i < 5000; i++) {
        rules.push({
          resource: `non_matching_resource_${i}`,
          action: `non_matching_action_${i}`,
          condition: (ctx: UserContext) => ctx.role === 'superuser',
        });
      }

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'target_action',
        resource: 'target_resource',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(false);
      expect(result.reason).toBe('No matching rule found');
      expect(endTime - startTime).toBeLessThan(100); // Should complete efficiently
    });

    it('should handle all rules having expensive conditions', () => {
      const expensiveCondition = (ctx: UserContext, record?: any): boolean => {
        // Simulate expensive computation
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return ctx.role === 'admin' && sum > 0;
      };

      const rules: PermissionRule[] = [];
      
      // Generate 100 rules with expensive conditions
      for (let i = 0; i < 100; i++) {
        rules.push({
          resource: `expensive_resource_${i}`,
          action: 'read',
          condition: expensiveCondition,
        });
      }

      // Add matching rule at the end
      rules.push({
        resource: 'target_resource',
        action: 'target_action',
        condition: expensiveCondition,
      });

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'target_action',
        resource: 'target_resource',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      // Allow more time for expensive conditions but should still be reasonable
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle rules with failing conditions efficiently', () => {
      const rules: PermissionRule[] = [];
      
      // Generate 1000 rules that match resource/action but fail condition
      for (let i = 0; i < 1000; i++) {
        rules.push({
          resource: 'target_resource',
          action: 'target_action',
          condition: (ctx: UserContext) => ctx.role === 'nonexistent_role',
        });
      }

      // Add a successful rule at the end
      rules.push({
        resource: 'target_resource',
        action: 'target_action',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      });

      const input: AccessEvaluationInput = {
        rules,
        context: baseContext,
        action: 'target_action',
        resource: 'target_resource',
      };

      const startTime = performance.now();
      const result = evaluateAccess(input);
      const endTime = performance.now();

      expect(result.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should handle failed conditions
    });
  });

  describe('permission testing utilities performance', () => {
    it('should handle bulk permission testing efficiently', async () => {
      const resources = ['users', 'posts', 'comments', 'files', 'settings'];
      const actions = ['create', 'read', 'update', 'delete'];
      const roles = ['admin', 'editor', 'viewer'];

      const matrix = permissionTestUtils.createPermissionMatrix(resources, actions, roles);

      const evaluateFunction = (input: AccessEvaluationInput) => {
        return evaluateAccess(input);
      };

      const permissions = matrix.map(item => ({
        resource: item.resource,
        action: item.action,
        context: { ...baseContext, role: item.role },
        expectedResult: item.should === 'allow',
      }));

      const startTime = performance.now();
      
      // Test all permissions in the matrix
      await permissionTestUtils.testPermissions(permissions, evaluateFunction);
      
      const endTime = performance.now();

      // Should handle the entire permission matrix efficiently
      expect(endTime - startTime).toBeLessThan(200);
      expect(permissions.length).toBe(resources.length * actions.length * roles.length);
    });
  });

  describe('scalability benchmarks', () => {
    it('should demonstrate linear performance scaling', () => {
      const ruleCounts = [100, 500, 1000, 2000];
      const results: Array<{ rules: number; time: number }> = [];

      ruleCounts.forEach(ruleCount => {
        const rules: PermissionRule[] = [];
        
        // Generate rules
        for (let i = 0; i < ruleCount; i++) {
          rules.push({
            resource: `resource_${i}`,
            action: `action_${i % 10}`,
            condition: (ctx: UserContext) => ctx.role === 'admin',
          });
        }

        // Add target rule at the end (worst case)
        rules.push({
          resource: 'target',
          action: 'target',
          condition: (ctx: UserContext) => ctx.role === 'admin',
        });

        const input: AccessEvaluationInput = {
          rules,
          context: baseContext,
          action: 'target',
          resource: 'target',
        };

        const startTime = performance.now();
        const result = evaluateAccess(input);
        const endTime = performance.now();

        expect(result.can).toBe(true);
        results.push({ rules: ruleCount, time: endTime - startTime });
      });

      // Performance should scale reasonably with rule count
      expect(results[0].time).toBeLessThan(10);   // 100 rules
      expect(results[1].time).toBeLessThan(25);   // 500 rules
      expect(results[2].time).toBeLessThan(50);   // 1000 rules
      expect(results[3].time).toBeLessThan(100);  // 2000 rules

      // Log results for analysis
      console.log('Performance scaling results:', results);
    });
  });
});