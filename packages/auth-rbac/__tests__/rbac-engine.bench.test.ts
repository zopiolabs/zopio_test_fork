/**
 * SPDX-License-Identifier: MIT
 * 
 * RBAC Engine Performance Benchmarks
 * 
 * These benchmarks test the core RBAC engine performance for critical authorization operations.
 * These tests focus on the core evaluation functions that are called for every protected operation.
 * 
 * Performance Targets:
 * - Single permission check: < 1ms
 * - Multiple permission checks (hasAllPermissions): < 50ms for 100 checks
 * - Batch permission evaluation: < 100ms for 1000 evaluations
 * - Role hierarchy resolution: < 2ms
 * - Concurrent permission checks: < 100ms for 100 concurrent evaluations
 * - Memory stability: < 10MB growth over 10k iterations
 */

import { describe, expect, beforeEach, bench } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import { evaluateDsl } from '../engine/evaluate-dsl.js';
import type { 
  AccessEvaluationInput, 
  PermissionRule, 
  UserContext 
} from '../types/index.js';
import type { DSLNode } from '../engine/evaluate-dsl.js';

describe('RBAC Engine Core Benchmarks', () => {
  let adminContext: UserContext;
  let editorContext: UserContext;
  let userContext: UserContext;
  let baseRecord: Record<string, unknown>;
  let basicRules: PermissionRule[];
  let hierarchicalRules: PermissionRule[];
  let fieldLevelRules: PermissionRule[];
  let dslRules: PermissionRule[];

  beforeEach(() => {
    // User contexts for different roles
    adminContext = {
      userId: 'admin_123',
      role: 'admin',
      tenantId: 'tenant_456',
    };

    editorContext = {
      userId: 'editor_456', 
      role: 'editor',
      tenantId: 'tenant_456',
    };

    userContext = {
      userId: 'user_789',
      role: 'user',
      tenantId: 'tenant_456',
    };

    baseRecord = {
      id: 'record_123',
      ownerId: 'user_789',
      status: 'active',
      tenantId: 'tenant_456',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Basic RBAC rules for fundamental operations
    basicRules = [
      {
        resource: 'users',
        action: 'read',
        condition: (ctx: UserContext) => ['admin', 'editor', 'user'].includes(ctx.role),
      },
      {
        resource: 'users',
        action: 'create',
        condition: (ctx: UserContext) => ['admin', 'editor'].includes(ctx.role),
      },
      {
        resource: 'users',
        action: 'update',
        condition: (ctx: UserContext, record?: any) => {
          return ctx.role === 'admin' || (record && record.ownerId === ctx.userId);
        },
      },
      {
        resource: 'users',
        action: 'delete',
        condition: (ctx: UserContext) => ctx.role === 'admin',
      },
      {
        resource: 'posts',
        action: 'read',
        condition: (ctx: UserContext) => true, // Public read
      },
      {
        resource: 'posts',
        action: 'create',
        condition: (ctx: UserContext) => ['admin', 'editor', 'user'].includes(ctx.role),
      },
      {
        resource: 'posts',
        action: 'update',
        condition: (ctx: UserContext, record?: any) => {
          if (ctx.role === 'admin') return true;
          if (ctx.role === 'editor') return record?.status !== 'published';
          return record && record.ownerId === ctx.userId;
        },
      },
      {
        resource: 'posts',
        action: 'delete',
        condition: (ctx: UserContext, record?: any) => {
          return ctx.role === 'admin' || (record && record.ownerId === ctx.userId);
        },
      },
    ];

    // Hierarchical rules with complex role inheritance
    hierarchicalRules = [
      {
        resource: 'organization',
        action: 'read',
        condition: (ctx: UserContext) => {
          const roleHierarchy: Record<string, string[]> = {
            'superadmin': ['admin', 'manager', 'editor', 'user', 'viewer'],
            'admin': ['manager', 'editor', 'user', 'viewer'],
            'manager': ['editor', 'user', 'viewer'],
            'editor': ['user', 'viewer'],
            'user': ['viewer'],
            'viewer': []
          };
          
          const hasRole = (userRole: string, requiredRole: string): boolean => {
            if (userRole === requiredRole) return true;
            return roleHierarchy[userRole]?.includes(requiredRole) || false;
          };
          
          return hasRole(ctx.role, 'viewer');
        },
      },
      {
        resource: 'organization',
        action: 'manage',
        condition: (ctx: UserContext) => {
          const roleHierarchy: Record<string, string[]> = {
            'superadmin': ['admin', 'manager'],
            'admin': ['manager'],
            'manager': []
          };
          
          const hasRole = (userRole: string, requiredRole: string): boolean => {
            if (userRole === requiredRole) return true;
            return roleHierarchy[userRole]?.includes(requiredRole) || false;
          };
          
          return hasRole(ctx.role, 'manager');
        },
      },
    ];

    // Field-level permission rules
    fieldLevelRules = [
      {
        resource: 'profile',
        action: 'read',
        fieldPermissions: {
          id: 'read',
          name: 'read', 
          email: 'read',
          phone: 'read',
          ssn: 'none',
          salary: 'none',
          internalNotes: 'none',
        },
        condition: (ctx: UserContext) => ['admin', 'editor', 'user'].includes(ctx.role),
      },
      {
        resource: 'profile',
        action: 'update',
        fieldPermissions: {
          id: 'none',
          name: 'write',
          email: 'write', 
          phone: 'write',
          ssn: 'none',
          salary: 'write', // Simplified for type compatibility
          internalNotes: 'write', // Simplified for type compatibility
        },
        condition: (ctx: UserContext, record?: any) => {
          return ctx.role === 'admin' || (record && record.ownerId === ctx.userId);
        },
      },
    ];

    // DSL-based rules for complex conditions
    dslRules = [
      {
        resource: 'documents',
        action: 'read',
        dsl: {
          or: [
            { equals: ['context.role', 'admin'] },
            {
              and: [
                { equals: ['context.tenantId', 'record.tenantId'] },
                { equals: ['context.userId', 'record.ownerId'] }
              ]
            }
          ]
        } as DSLNode,
      },
      {
        resource: 'documents',
        action: 'update',
        dsl: {
          and: [
            { equals: ['context.tenantId', 'record.tenantId'] },
            {
              or: [
                { equals: ['context.role', 'admin'] },
                { equals: ['context.userId', 'record.ownerId'] }
              ]
            }
          ]
        } as DSLNode,
      },
    ];
  });

  describe('Core Permission Evaluation', () => {
    bench('hasPermission - single permission check (admin read users)', () => {
      const input: AccessEvaluationInput = {
        rules: basicRules,
        context: adminContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });

    bench('hasPermission - single permission check with record context', () => {
      const input: AccessEvaluationInput = {
        rules: basicRules,
        context: userContext,
        action: 'update',
        resource: 'users',
        record: baseRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('hasPermission - denied permission (user delete)', () => {
      const input: AccessEvaluationInput = {
        rules: basicRules,
        context: userContext,
        action: 'delete',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(false);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });
  });

  describe('Multiple Permission Evaluation (hasAllPermissions)', () => {
    bench('hasAllPermissions - 5 permissions sequentially', () => {
      const permissions = [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'create' },
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'create' },
        { resource: 'posts', action: 'update' },
      ];

      let allGranted = true;
      for (const perm of permissions) {
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: editorContext,
          action: perm.action,
          resource: perm.resource,
          record: baseRecord,
        };
        
        const result = evaluateAccess(input);
        if (!result.can) {
          allGranted = false;
          break;
        }
      }

      expect(allGranted).toBe(true);
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('hasAllPermissions - 10 permissions sequentially', () => {
      const permissions = [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'update' },
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'create' },
        { resource: 'posts', action: 'update' },
        { resource: 'comments', action: 'read' },
        { resource: 'comments', action: 'create' },
        { resource: 'comments', action: 'update' },
        { resource: 'comments', action: 'delete' },
      ];

      let grantedCount = 0;
      for (const perm of permissions) {
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: adminContext,
          action: perm.action,
          resource: perm.resource,
          record: baseRecord,
        };
        
        const result = evaluateAccess(input);
        if (result.can) grantedCount++;
      }

      expect(grantedCount).toBeGreaterThan(0);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('hasAnyPermissions - 10 permissions (early success)', () => {
      const permissions = [
        { resource: 'restricted', action: 'access' }, // Will fail
        { resource: 'users', action: 'read' }, // Will succeed - early exit
        { resource: 'posts', action: 'create' },
        { resource: 'posts', action: 'update' },
        { resource: 'comments', action: 'create' },
      ];

      let hasAny = false;
      for (const perm of permissions) {
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: userContext,
          action: perm.action,
          resource: perm.resource,
          record: baseRecord,
        };
        
        const result = evaluateAccess(input);
        if (result.can) {
          hasAny = true;
          break; // Early exit on first success
        }
      }

      expect(hasAny).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });
  });

  describe('Role Hierarchy Resolution', () => {
    bench('hierarchical permission check (complex role inheritance)', () => {
      const input: AccessEvaluationInput = {
        rules: hierarchicalRules,
        context: { ...adminContext, role: 'admin' },
        action: 'read',
        resource: 'organization',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('hierarchical permission check (deep inheritance)', () => {
      const input: AccessEvaluationInput = {
        rules: hierarchicalRules,
        context: { ...adminContext, role: 'superadmin' },
        action: 'manage',
        resource: 'organization',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });

  describe('Field-Level Permissions', () => {
    bench('field-level permission check (allowed field)', () => {
      const input: AccessEvaluationInput = {
        rules: fieldLevelRules,
        context: userContext,
        action: 'read',
        resource: 'profile',
        record: baseRecord,
        field: 'name',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('field-level permission check (restricted field)', () => {
      const input: AccessEvaluationInput = {
        rules: fieldLevelRules,
        context: userContext,
        action: 'read',
        resource: 'profile',
        record: baseRecord,
        field: 'ssn',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(false);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('batch field permission checks (10 fields)', () => {
      const fields = ['id', 'name', 'email', 'phone', 'ssn', 'salary', 'internalNotes', 'avatar', 'bio', 'preferences'];
      let allowedFields = 0;

      for (const field of fields) {
        const input: AccessEvaluationInput = {
          rules: fieldLevelRules,
          context: editorContext,
          action: 'read',
          resource: 'profile',
          record: baseRecord,
          field,
        };

        const result = evaluateAccess(input);
        if (result.can) allowedFields++;
      }

      expect(allowedFields).toBeGreaterThan(0);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });

  describe('DSL Rule Evaluation', () => {
    bench('DSL rule evaluation (simple OR condition)', () => {
      const input: AccessEvaluationInput = {
        rules: dslRules,
        context: adminContext,
        action: 'read',
        resource: 'documents',
        record: baseRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('DSL rule evaluation (complex AND/OR condition)', () => {
      const input: AccessEvaluationInput = {
        rules: dslRules,
        context: userContext,
        action: 'update',
        resource: 'documents',
        record: baseRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('direct DSL evaluation (without full rule processing)', () => {
      const dslRule: DSLNode = {
        and: [
          { equals: ['context.tenantId', 'record.tenantId'] },
          { equals: ['context.userId', 'record.ownerId'] }
        ]
      };

      const result = evaluateDsl(dslRule, userContext, baseRecord);
      expect(result).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });
  });

  describe('Batch Permission Evaluation', () => {
    bench('batch evaluation - 100 permission checks', () => {
      const actions = ['read', 'create', 'update', 'delete'];
      const resources = ['users', 'posts', 'comments', 'documents', 'profiles'];
      let evaluationCount = 0;
      let successCount = 0;

      for (let i = 0; i < 100; i++) {
        const action = actions[i % actions.length];
        const resource = resources[i % resources.length];
        
        const contexts = [adminContext, editorContext, userContext];
        const context = contexts[i % 3];
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context,
          action,
          resource,
          record: baseRecord,
        };

        const result = evaluateAccess(input);
        evaluationCount++;
        if (result.can) successCount++;
      }

      expect(evaluationCount).toBe(100);
      expect(successCount).toBeGreaterThan(0);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('batch evaluation - 1000 permission checks', () => {
      const actions = ['read', 'create', 'update', 'delete'];
      const resources = ['users', 'posts', 'comments'];
      let evaluationCount = 0;

      for (let i = 0; i < 1000; i++) {
        const action = actions[i % actions.length];
        const resource = resources[i % resources.length];
        
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: adminContext,
          action,
          resource,
          record: baseRecord,
        };

        evaluateAccess(input);
        evaluationCount++;
      }

      expect(evaluationCount).toBe(1000);
    }, {
      iterations: 10,
      warmupIterations: 1,
    });
  });

  describe('Concurrent Permission Checks', () => {
    bench('concurrent evaluation - 50 permissions', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: { ...userContext, userId: `user_${i}` },
          action: 'read',
          resource: 'users',
          record: { ...baseRecord, ownerId: `user_${i}` },
        };

        return Promise.resolve(evaluateAccess(input));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
      results.forEach(result => expect(typeof result.can).toBe('boolean'));
    }, {
      iterations: 200,
      warmupIterations: 20,
    });

    bench('concurrent evaluation - 100 permissions with different contexts', async () => {
      const contexts = [adminContext, editorContext, userContext];
      
      const promises = Array.from({ length: 100 }, (_, i) => {
        const context = contexts[i % contexts.length];
        const resources = ['users', 'posts', 'comments'];
        const resource = resources[i % 3];
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: { ...context, userId: `${context.role}_${i}` },
          action: i % 2 === 0 ? 'read' : 'create',
          resource,
          record: baseRecord,
        };

        return Promise.resolve(evaluateAccess(input));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });
  });

  describe('Memory and Performance Stability', () => {
    bench('memory stability - 10000 evaluations', () => {
      const startMemory = process.memoryUsage();
      
      for (let i = 0; i < 10000; i++) {
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: i % 2 === 0 ? adminContext : userContext,
          action: 'read',
          resource: 'users',
          record: baseRecord,
        };
        
        evaluateAccess(input);
      }
      
      const endMemory = process.memoryUsage();
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      
      // Memory growth should be minimal (< 10MB for 10k iterations)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    }, {
      iterations: 5,
      warmupIterations: 1,
    });

    bench('performance consistency - repeated evaluations', () => {
      const iterations = 1000;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const input: AccessEvaluationInput = {
          rules: basicRules,
          context: adminContext,
          action: 'read',
          resource: 'users',
          record: baseRecord,
        };
        
        evaluateAccess(input);
        
        const end = performance.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      // Average should be well under 1ms, max should be reasonable
      expect(avgTime).toBeLessThan(1);
      expect(maxTime).toBeLessThan(10);
    }, {
      iterations: 10,
      warmupIterations: 1,
    });
  });

  describe('Edge Cases and Error Handling', () => {
    bench('missing context properties', () => {
      const incompleteContext = {
        userId: 'user_123',
        // Missing role and tenantId
      } as UserContext;

      const input: AccessEvaluationInput = {
        rules: basicRules,
        context: incompleteContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      expect(typeof result.can).toBe('boolean');
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('null/undefined record handling', () => {
      const input: AccessEvaluationInput = {
        rules: basicRules,
        context: userContext,
        action: 'update',
        resource: 'users',
        record: null,
      };

      const result = evaluateAccess(input);
      expect(typeof result.can).toBe('boolean');
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('empty rules array', () => {
      const input: AccessEvaluationInput = {
        rules: [],
        context: adminContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(false);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });

    bench('complex nested record properties', () => {
      const complexRecord = {
        ...baseRecord,
        metadata: {
          owner: { id: 'user_789', profile: { name: 'John Doe' } },
          permissions: { read: true, write: false, admin: false },
          audit: { createdBy: 'system', modifiedBy: 'user_789', timestamp: new Date() },
          nested: {
            level1: { level2: { level3: { value: 'deep_value' } } }
          }
        }
      };

      const complexRule: PermissionRule = {
        resource: 'complex',
        action: 'access',
        condition: (ctx: UserContext, record?: any) => {
          return record?.metadata?.owner?.id === ctx.userId &&
                 record?.metadata?.permissions?.read === true;
        },
      };

      const input: AccessEvaluationInput = {
        rules: [complexRule],
        context: userContext,
        action: 'access',
        resource: 'complex',
        record: complexRecord,
      };

      const result = evaluateAccess(input);
      expect(result.can).toBe(true);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });
});