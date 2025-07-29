/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing
const mockRbacEvaluate = vi.fn();
const mockAbacRules = [
  {
    resource: 'documents',
    action: 'read',
    condition: (context: any, record: any) => context.department === record.department,
    dsl: {
      type: 'condition',
      field: 'department',
      operator: 'equals',
      value: '{{context.department}}',
    },
  },
];

const mockRbacRules = [
  {
    resource: 'users',
    action: 'read',
    condition: undefined,
    dsl: undefined,
  },
];

const mockLogAccessAttempt = vi.fn();

const mockAuthLogAdapter = {
  log: vi.fn(),
  flush: vi.fn(),
  close: vi.fn(),
};

// Mock all external packages
vi.mock('@repo/auth-rbac/engine/evaluate', () => ({
  evaluateAccess: mockRbacEvaluate,
}));

vi.mock('@repo/auth-rbac', () => ({
  rules: mockRbacRules,
}));

vi.mock('@repo/auth-abac', () => ({
  abacRules: mockAbacRules,
}));

vi.mock('@repo/auth-log', () => ({
  logAccessAttempt: mockLogAccessAttempt,
  createAdapter: vi.fn(() => mockAuthLogAdapter),
}));

describe('Cross-Package Authentication Integration', () => {
  let evaluateAccess: any;
  let combinedRules: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockRbacEvaluate.mockReturnValue({
      can: true,
      reason: 'Access granted by RBAC rule',
    });
    
    mockLogAccessAttempt.mockResolvedValue(undefined);
    
    // Import modules after mocks are setup
    const evaluateModule = await import('../engine/evaluate.js');
    const rulesModule = await import('../rules/combined-rules.js');
    
    evaluateAccess = evaluateModule.evaluateAccess;
    combinedRules = rulesModule.combinedRules;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rule Integration', () => {
    it('should combine RBAC and ABAC rules correctly', () => {
      expect(combinedRules).toEqual([...mockRbacRules, ...mockAbacRules]);
      expect(combinedRules).toHaveLength(2);
      
      // Verify RBAC rule structure
      expect(combinedRules[0]).toEqual({
        resource: 'users',
        action: 'read',
        condition: undefined,
        dsl: undefined,
      });
      
      // Verify ABAC rule structure
      expect(combinedRules[1]).toEqual({
        resource: 'documents',
        action: 'read',
        condition: expect.any(Function),
        dsl: {
          type: 'condition',
          field: 'department',
          operator: 'equals',
          value: '{{context.department}}',
        },
      });
    });

    it('should handle rule priority and conflict resolution', () => {
      // Ensure RBAC rules come before ABAC rules for proper priority
      const rbacRuleIndex = combinedRules.findIndex((rule: any) => 
        rule.resource === 'users' && rule.condition === undefined
      );
      
      const abacRuleIndex = combinedRules.findIndex((rule: any) => 
        rule.resource === 'documents' && rule.condition !== undefined
      );
      
      expect(rbacRuleIndex).toBeLessThan(abacRuleIndex);
    });

    it('should handle empty rule sets gracefully', async () => {
      // Test with empty RBAC rules
      vi.doMock('@repo/auth-rbac', () => ({ rules: [] }));
      vi.resetModules();
      
      const { combinedRules: emptyRbacRules } = await import('../rules/combined-rules.js');
      expect(emptyRbacRules).toEqual(mockAbacRules);
      
      // Test with empty ABAC rules
      vi.doMock('@repo/auth-abac', () => ({ abacRules: [] }));
      vi.resetModules();
      
      const { combinedRules: emptyAbacRules } = await import('../rules/combined-rules.js');
      expect(emptyAbacRules).toEqual([]);
    });
  });

  describe('Access Evaluation Integration', () => {
    it('should integrate RBAC evaluation with logging', async () => {
      const testContext = {
        context: {
          userId: 'user_123',
          role: 'admin',
          tenantId: 'tenant_456',
        },
        resource: 'users',
        action: 'read',
      };

      const result = evaluateAccess(testContext);

      // Verify RBAC evaluation was called with combined rules
      expect(mockRbacEvaluate).toHaveBeenCalledWith({
        rules: combinedRules,
        ...testContext,
      });

      // Verify logging was called
      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        ...testContext,
        timestamp: expect.any(String),
        can: true,
        reason: 'Access granted by RBAC rule',
      });

      // Verify result structure
      expect(result).toEqual({
        can: true,
        reason: 'Access granted by RBAC rule',
      });
    });

    it('should handle access denial with proper logging', async () => {
      mockRbacEvaluate.mockReturnValue({
        can: false,
        reason: 'Access denied: insufficient permissions',
      });

      const testContext = {
        context: {
          userId: 'user_789',
          role: 'user',
          tenantId: 'tenant_456',
        },
        resource: 'admin',
        action: 'delete',
      };

      const result = evaluateAccess(testContext);

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Access denied: insufficient permissions');

      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        ...testContext,
        timestamp: expect.any(String),
        can: false,
        reason: 'Access denied: insufficient permissions',
      });
    });

    it('should handle record-level access control', async () => {
      mockRbacEvaluate.mockReturnValue({
        can: true,
        reason: 'Access granted with record-level check',
      });

      const testContext = {
        context: {
          userId: 'user_123',
          role: 'manager',
          tenantId: 'tenant_456',
          department: 'engineering',
        },
        resource: 'documents',
        action: 'read',
        record: {
          id: 'doc_123',
          department: 'engineering',
          owner: 'user_456',
        },
      };

      const result = evaluateAccess(testContext);

      expect(mockRbacEvaluate).toHaveBeenCalledWith({
        rules: combinedRules,
        ...testContext,
      });

      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        ...testContext,
        timestamp: expect.any(String),
        can: true,
        reason: 'Access granted with record-level check',
      });

      expect(result.can).toBe(true);
    });

    it('should handle field-level access control', async () => {
      mockRbacEvaluate.mockReturnValue({
        can: false,
        reason: 'Field access denied: sensitive information',
      });

      const testContext = {
        context: {
          userId: 'user_123',
          role: 'user',
          tenantId: 'tenant_456',
        },
        resource: 'users',
        action: 'read',
        field: 'salary',
        record: {
          id: 'user_456',
          name: 'John Doe',
          salary: 100000,
        },
      };

      const result = evaluateAccess(testContext);

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Field access denied: sensitive information');

      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        ...testContext,
        timestamp: expect.any(String),
        can: false,
        reason: 'Field access denied: sensitive information',
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle RBAC evaluation errors gracefully', async () => {
      const rbacError = new Error('RBAC evaluation failed');
      mockRbacEvaluate.mockImplementation(() => {
        throw rbacError;
      });

      const testContext = {
        context: { userId: 'user_123', role: 'admin', tenantId: 'tenant_456' },
        resource: 'users',
        action: 'read',
      };

      expect(() => evaluateAccess(testContext)).toThrow('RBAC evaluation failed');
      
      // Logging should not be called if evaluation fails
      expect(mockLogAccessAttempt).not.toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      const loggingError = new Error('Logging service unavailable');
      mockLogAccessAttempt.mockRejectedValue(loggingError);

      const testContext = {
        context: { userId: 'user_123', role: 'admin', tenantId: 'tenant_456' },
        resource: 'users',
        action: 'read',
      };

      // Should not throw even if logging fails
      const result = evaluateAccess(testContext);
      
      expect(result).toEqual({
        can: true,
        reason: 'Access granted by RBAC rule',
      });

      // Verify logging was attempted
      expect(mockLogAccessAttempt).toHaveBeenCalled();
    });

    it('should handle malformed rule configurations', async () => {
      // Test with malformed RBAC rules
      const malformedRules = [
        { resource: 'users' }, // Missing action
        { action: 'read' }, // Missing resource
        null, // Null rule
        undefined, // Undefined rule
      ];

      vi.doMock('@repo/auth-rbac', () => ({ rules: malformedRules }));
      vi.resetModules();

      const { combinedRules: testRules } = await import('../rules/combined-rules.js');
      
      // Should still include ABAC rules and handle malformed RBAC rules
      expect(testRules).toContain(...mockAbacRules);
      expect(testRules.length).toBeGreaterThan(mockAbacRules.length);
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-frequency access evaluations', async () => {
      const testContexts = Array.from({ length: 1000 }, (_, i) => ({
        context: {
          userId: `user_${i}`,
          role: i % 2 === 0 ? 'admin' : 'user',
          tenantId: 'tenant_456',
        },
        resource: 'users',
        action: 'read',
      }));

      const startTime = Date.now();

      const results = testContexts.map(context => evaluateAccess(context));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle 1000 evaluations in reasonable time (< 1 second)
      expect(totalTime).toBeLessThan(1000);
      expect(results).toHaveLength(1000);
      expect(mockRbacEvaluate).toHaveBeenCalledTimes(1000);
      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(1000);
    });

    it('should handle concurrent access evaluations', async () => {
      const concurrentContexts = Array.from({ length: 50 }, (_, i) => ({
        context: {
          userId: `concurrent_user_${i}`,
          role: 'user',
          tenantId: 'tenant_456',
        },
        resource: 'documents',
        action: 'read',
      }));

      const concurrentPromises = concurrentContexts.map(context =>
        Promise.resolve(evaluateAccess(context))
      );

      const results = await Promise.all(concurrentPromises);

      expect(results).toHaveLength(50);
      expect(mockRbacEvaluate).toHaveBeenCalledTimes(50);
      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(50);

      // All results should be consistent
      results.forEach(result => {
        expect(result).toEqual({
          can: true,
          reason: 'Access granted by RBAC rule',
        });
      });
    });

    it('should handle memory efficiently with large rule sets', async () => {
      // Create large rule sets
      const largeRbacRules = Array.from({ length: 500 }, (_, i) => ({
        resource: `resource_${i}`,
        action: 'read',
        condition: undefined,
        dsl: undefined,
      }));

      const largeAbacRules = Array.from({ length: 500 }, (_, i) => ({
        resource: `abac_resource_${i}`,
        action: 'read',
        condition: (context: any) => context.userId === `user_${i}`,
        dsl: { type: 'condition', field: 'userId', operator: 'equals', value: `user_${i}` },
      }));

      vi.doMock('@repo/auth-rbac', () => ({ rules: largeRbacRules }));
      vi.doMock('@repo/auth-abac', () => ({ abacRules: largeAbacRules }));
      vi.resetModules();

      const { combinedRules: largeRuleSet } = await import('../rules/combined-rules.js');
      expect(largeRuleSet).toHaveLength(1000);

      // Test evaluation with large rule set
      const testContext = {
        context: { userId: 'user_1', role: 'user', tenantId: 'tenant_456' },
        resource: 'resource_1',
        action: 'read',
      };

      const result = evaluateAccess(testContext);
      expect(result).toBeDefined();
    });
  });

  describe('Real-World Scenarios Integration', () => {
    it('should handle multi-tenant access control', async () => {
      const tenantContexts = [
        {
          context: { userId: 'user_123', role: 'admin', tenantId: 'tenant_a' },
          resource: 'tenant_data',
          action: 'read',
          record: { tenantId: 'tenant_a', data: 'sensitive' },
        },
        {
          context: { userId: 'user_123', role: 'admin', tenantId: 'tenant_b' },
          resource: 'tenant_data',
          action: 'read',
          record: { tenantId: 'tenant_a', data: 'sensitive' }, // Different tenant
        },
      ];

      // Mock different responses for different tenant contexts
      mockRbacEvaluate
        .mockReturnValueOnce({ can: true, reason: 'Same tenant access' })
        .mockReturnValueOnce({ can: false, reason: 'Cross-tenant access denied' });

      const results = tenantContexts.map(context => evaluateAccess(context));

      expect(results[0].can).toBe(true);
      expect(results[1].can).toBe(false);

      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(2);
    });

    it('should handle role hierarchy and inheritance', async () => {
      const roleContexts = [
        {
          context: { userId: 'user_1', role: 'super_admin', tenantId: 'tenant_456' },
          resource: 'system',
          action: 'configure',
        },
        {
          context: { userId: 'user_2', role: 'admin', tenantId: 'tenant_456' },
          resource: 'users',
          action: 'manage',
        },
        {
          context: { userId: 'user_3', role: 'user', tenantId: 'tenant_456' },
          resource: 'profile',
          action: 'read',
        },
      ];

      // Mock hierarchical access responses
      mockRbacEvaluate
        .mockReturnValueOnce({ can: true, reason: 'Super admin access' })
        .mockReturnValueOnce({ can: true, reason: 'Admin access' })
        .mockReturnValueOnce({ can: true, reason: 'User access' });

      const results = roleContexts.map(context => evaluateAccess(context));

      results.forEach(result => {
        expect(result.can).toBe(true);
      });

      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(3);
    });

    it('should handle dynamic permission evaluation', async () => {
      const dynamicContext = {
        context: {
          userId: 'user_123',
          role: 'manager',
          tenantId: 'tenant_456',
          department: 'engineering',
          clearanceLevel: 3,
        },
        resource: 'project',
        action: 'access',
        record: {
          department: 'engineering',
          clearanceRequired: 2,
          status: 'active',
        },
      };

      mockRbacEvaluate.mockReturnValue({
        can: true,
        reason: 'Dynamic evaluation: clearance level sufficient',
      });

      const result = evaluateAccess(dynamicContext);

      expect(result.can).toBe(true);
      expect(mockRbacEvaluate).toHaveBeenCalledWith({
        rules: combinedRules,
        ...dynamicContext,
      });

      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        ...dynamicContext,
        timestamp: expect.any(String),
        can: true,
        reason: 'Dynamic evaluation: clearance level sufficient',
      });
    });

    it('should handle time-based access control', async () => {
      const currentTime = new Date();
      const timeBasedContext = {
        context: {
          userId: 'user_123',
          role: 'contractor',
          tenantId: 'tenant_456',
          contractStartDate: new Date(currentTime.getTime() - 86400000), // Yesterday
          contractEndDate: new Date(currentTime.getTime() + 86400000), // Tomorrow
        },
        resource: 'internal_systems',
        action: 'access',
      };

      mockRbacEvaluate.mockReturnValue({
        can: true,
        reason: 'Time-based access: within contract period',
      });

      const result = evaluateAccess(timeBasedContext);

      expect(result.can).toBe(true);
      expect(result.reason).toBe('Time-based access: within contract period');
    });
  });

  describe('Audit and Compliance Integration', () => {
    it('should log all access attempts for audit trails', async () => {
      const auditContexts = [
        {
          context: { userId: 'auditor_1', role: 'auditor', tenantId: 'tenant_456' },
          resource: 'audit_logs',
          action: 'read',
        },
        {
          context: { userId: 'user_1', role: 'user', tenantId: 'tenant_456' },
          resource: 'sensitive_data',
          action: 'access',
        },
      ];

      mockRbacEvaluate
        .mockReturnValueOnce({ can: true, reason: 'Auditor access granted' })
        .mockReturnValueOnce({ can: false, reason: 'Sensitive data access denied' });

      auditContexts.forEach(context => evaluateAccess(context));

      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(2);

      // Verify audit log entries
      expect(mockLogAccessAttempt).toHaveBeenNthCalledWith(1, {
        ...auditContexts[0],
        timestamp: expect.any(String),
        can: true,
        reason: 'Auditor access granted',
      });

      expect(mockLogAccessAttempt).toHaveBeenNthCalledWith(2, {
        ...auditContexts[1],
        timestamp: expect.any(String),
        can: false,
        reason: 'Sensitive data access denied',
      });
    });

    it('should handle compliance reporting requirements', async () => {
      const complianceContext = {
        context: {
          userId: 'compliance_officer',
          role: 'compliance',
          tenantId: 'tenant_456',
          auditSession: 'audit_2024_001',
        },
        resource: 'compliance_reports',
        action: 'generate',
      };

      mockRbacEvaluate.mockReturnValue({
        can: true,
        reason: 'Compliance officer access for audit session',
      });

      const result = evaluateAccess(complianceContext);

      expect(result.can).toBe(true);
      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        ...complianceContext,
        timestamp: expect.any(String),
        can: true,
        reason: 'Compliance officer access for audit session',
      });
    });

    it('should track failed access attempts for security monitoring', async () => {
      const suspiciousContexts = [
        {
          context: { userId: 'suspicious_user', role: 'user', tenantId: 'tenant_456' },
          resource: 'admin_panel',
          action: 'access',
        },
        {
          context: { userId: 'external_user', role: 'guest', tenantId: 'different_tenant' },
          resource: 'internal_data',
          action: 'read',
        },
      ];

      mockRbacEvaluate
        .mockReturnValueOnce({ can: false, reason: 'Unauthorized admin access attempt' })
        .mockReturnValueOnce({ can: false, reason: 'Cross-tenant access denied' });

      suspiciousContexts.forEach(context => evaluateAccess(context));

      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(2);

      // All attempts should be logged as failed
      expect(mockLogAccessAttempt).toHaveBeenNthCalledWith(1, {
        ...suspiciousContexts[0],
        timestamp: expect.any(String),
        can: false,
        reason: 'Unauthorized admin access attempt',
      });

      expect(mockLogAccessAttempt).toHaveBeenNthCalledWith(2, {
        ...suspiciousContexts[1],
        timestamp: expect.any(String),
        can: false,
        reason: 'Cross-tenant access denied',
      });
    });
  });
});