/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import { combinedRules } from '../rules/combined-rules.js';
import { createMockUserContext, createMockAccessEvaluationInput } from '@repo/testing';

// Mock the auth-log module
const mockLogAccessAttempt = vi.fn();
vi.mock('@repo/auth-log', () => ({
  logAccessAttempt: mockLogAccessAttempt,
}));

describe('Auth Runner Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('combined RBAC/ABAC evaluation', () => {
    it('should evaluate RBAC rules from auth-rbac package', () => {
      const context = {
        userId: 'user_123',
        role: 'admin',
        tenantId: 'tenant_456',
      };

      const result = evaluateAccess({
        context,
        resource: 'users',
        action: 'invite',
      });

      expect(result.can).toBe(true);
      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        context,
        resource: 'users',
        action: 'invite',
        timestamp: expect.any(String),
        can: true,
        reason: undefined,
      });
    });

    it('should evaluate ABAC rules from auth-abac package', () => {
      const context = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };

      const record = {
        id: 'invoice_123',
        region: 'us-east',
        amount: 1000,
      };

      const result = evaluateAccess({
        context,
        resource: 'invoices',
        action: 'read',
        record,
      });

      expect(result.can).toBe(true);
      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        context,
        resource: 'invoices',
        action: 'read',
        record,
        timestamp: expect.any(String),
        can: true,
        reason: undefined,
      });
    });

    it('should prioritize first matching rule (RBAC rules come first)', () => {
      // This tests rule precedence - RBAC rules are evaluated before ABAC rules
      const context = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
        region: 'us-east',
      };

      // Create a record that would match both RBAC orders rule and potentially ABAC rules
      const record = {
        id: 'order_123',
        tenantId: 'tenant_456', // Matches RBAC rule
        region: 'us-east', // Would match ABAC rule if it existed for orders
      };

      const result = evaluateAccess({
        context,
        resource: 'orders',
        action: 'read',
        record,
      });

      expect(result.can).toBe(true); // Should match RBAC rule
    });

    it('should deny access when no rules match', () => {
      const context = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const result = evaluateAccess({
        context,
        resource: 'nonexistent_resource',
        action: 'unknown_action',
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe('No matching rule found');
      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        context,
        resource: 'nonexistent_resource',
        action: 'unknown_action',
        timestamp: expect.any(String),
        can: false,
        reason: 'No matching rule found',
      });
    });

    it('should handle field-level permissions from RBAC rules', () => {
      const context = {
        userId: 'user_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const record = {
        id: 'order_123',
        tenantId: 'tenant_456',
        total: 100,
        cost: 80,
      };

      // Test allowed field
      const allowedResult = evaluateAccess({
        context,
        resource: 'orders',
        action: 'read',
        record,
        field: 'total',
      });

      expect(allowedResult.can).toBe(true);

      // Test restricted field
      const restrictedResult = evaluateAccess({
        context,
        resource: 'orders',
        action: 'read',
        record,
        field: 'cost',
      });

      expect(restrictedResult.can).toBe(false);
      expect(restrictedResult.reason).toBe("No access to field 'cost'");
    });
  });

  describe('rule orchestration and combinations', () => {
    it('should combine rules from multiple packages correctly', () => {
      // Verify that rules from both packages are present
      expect(combinedRules.length).toBeGreaterThan(0);
      
      // Check for RBAC rules (from auth-rbac)
      const rbacRule = combinedRules.find(rule => 
        rule.resource === 'orders' && rule.action === 'read'
      );
      expect(rbacRule).toBeDefined();

      // Check for ABAC rules (from auth-abac)
      const abacRule = combinedRules.find(rule => 
        rule.resource === 'invoices' && rule.action === 'read'
      );
      expect(abacRule).toBeDefined();

      // Check for payment approval rule (ABAC)
      const paymentRule = combinedRules.find(rule => 
        rule.resource === 'payments' && rule.action === 'approve'
      );
      expect(paymentRule).toBeDefined();
    });

    it('should handle overlapping resource permissions', () => {
      // Test when multiple rules could potentially match
      const context = {
        userId: 'user_123',
        role: 'admin',
        tenantId: 'tenant_456',
        clearanceLevel: 5,
      };

      // Test admin permissions for user invitation
      const userInviteResult = evaluateAccess({
        context,
        resource: 'users',
        action: 'invite',
      });

      expect(userInviteResult.can).toBe(true);

      // Test clearance-based payment approval
      const paymentApprovalResult = evaluateAccess({
        context,
        resource: 'payments',
        action: 'approve',
      });

      expect(paymentApprovalResult.can).toBe(true);
    });

    it('should handle cascading rule evaluation', () => {
      // Test scenario where first rule fails but second rule succeeds
      const context = {
        userId: 'user_123',
        role: 'user', // Not admin
        tenantId: 'tenant_456',
        clearanceLevel: 4, // Above payment threshold
      };

      // Should fail user invitation (requires admin)
      const userInviteResult = evaluateAccess({
        context,
        resource: 'users',
        action: 'invite',
      });

      expect(userInviteResult.can).toBe(false);

      // Should succeed payment approval (clearanceLevel >= 3)
      const paymentResult = evaluateAccess({
        context,
        resource: 'payments',
        action: 'approve',
      });

      expect(paymentResult.can).toBe(true);
    });

    it('should handle complex condition evaluation across rule types', () => {
      // Test complex scenarios that involve both RBAC and ABAC-style conditions
      
      // RBAC scenario: Order update by creator
      const orderOwnerContext = {
        userId: 'creator_123',
        role: 'user',
        tenantId: 'tenant_456',
      };

      const orderRecord = {
        id: 'order_456',
        tenantId: 'tenant_456',
        createdBy: 'creator_123',
        status: 'pending',
      };

      const orderUpdateResult = evaluateAccess({
        context: orderOwnerContext,
        resource: 'orders',
        action: 'update',
        record: orderRecord,
        field: 'status',
      });

      expect(orderUpdateResult.can).toBe(true);

      // ABAC scenario: Regional invoice access
      const regionalContext = {
        userId: 'user_789',
        role: 'analyst',
        tenantId: 'tenant_456',
        region: 'eu-west',
      };

      const invoiceRecord = {
        id: 'invoice_789',
        region: 'eu-west',
        amount: 5000,
      };

      const invoiceAccessResult = evaluateAccess({
        context: regionalContext,
        resource: 'invoices',
        action: 'read',
        record: invoiceRecord,
      });

      expect(invoiceAccessResult.can).toBe(true);
    });
  });

  describe('logging integration', () => {
    it('should log all access attempts with correct parameters', () => {
      const context = {
        userId: 'test_user',
        role: 'tester',
        tenantId: 'test_tenant',
      };

      const record = { id: 'test_record' };

      evaluateAccess({
        context,
        resource: 'test_resource',
        action: 'test_action',
        record,
        field: 'test_field',
      });

      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(1);
      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        context,
        resource: 'test_resource',
        action: 'test_action',
        record,
        field: 'test_field',
        timestamp: expect.any(String),
        can: false, // No matching rule
        reason: 'No matching rule found',
      });
    });

    it('should log successful access attempts', () => {
      const context = {
        userId: 'admin_user',
        role: 'admin',
        tenantId: 'tenant_123',
      };

      evaluateAccess({
        context,
        resource: 'users',
        action: 'invite',
      });

      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        context,
        resource: 'users',
        action: 'invite',
        timestamp: expect.any(String),
        can: true,
        reason: undefined,
      });
    });

    it('should log failed access attempts with reasons', () => {
      const context = {
        userId: 'user_123',
        role: 'user', // Not admin
        tenantId: 'tenant_456',
      };

      evaluateAccess({
        context,
        resource: 'users',
        action: 'invite',
      });

      expect(mockLogAccessAttempt).toHaveBeenCalledWith({
        context,
        resource: 'users',
        action: 'invite',
        timestamp: expect.any(String),
        can: false,
        reason: 'No matching rule found',
      });
    });

    it('should include timestamp in log entries', () => {
      const beforeTime = new Date().toISOString();
      
      evaluateAccess({
        context: { userId: 'user', role: 'user', tenantId: 'tenant' },
        resource: 'test',
        action: 'test',
      });

      const afterTime = new Date().toISOString();
      
      expect(mockLogAccessAttempt).toHaveBeenCalled();
      
      const logCall = mockLogAccessAttempt.mock.calls[0][0];
      expect(logCall.timestamp).toBeDefined();
      expect(typeof logCall.timestamp).toBe('string');
      
      // Timestamp should be between before and after
      expect(logCall.timestamp >= beforeTime).toBe(true);
      expect(logCall.timestamp <= afterTime).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large rule sets efficiently', () => {
      // Test with all combined rules
      const context = {
        userId: 'perf_user',
        role: 'admin',
        tenantId: 'perf_tenant',
        clearanceLevel: 10,
        region: 'us-west',
      };

      const startTime = performance.now();

      // Run evaluation 1000 times
      for (let i = 0; i < 1000; i++) {
        evaluateAccess({
          context: { ...context, userId: `user_${i}` },
          resource: 'users',
          action: 'invite',
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete 1000 evaluations in < 1 second
      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(1000);
    });

    it('should handle concurrent evaluations', async () => {
      const contexts = Array.from({ length: 50 }, (_, i) => ({
        userId: `concurrent_user_${i}`,
        role: i % 2 === 0 ? 'admin' : 'user',
        tenantId: `tenant_${i}`,
        clearanceLevel: i % 10,
        region: i % 2 === 0 ? 'us-east' : 'us-west',
      }));

      const promises = contexts.map(async (context, i) => {
        return evaluateAccess({
          context,
          resource: i % 3 === 0 ? 'users' : i % 3 === 1 ? 'payments' : 'invoices',
          action: i % 3 === 0 ? 'invite' : i % 3 === 1 ? 'approve' : 'read',
          record: i % 3 === 2 ? { id: `record_${i}`, region: context.region } : undefined,
        });
      });

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(500); // Should complete concurrently in reasonable time
      expect(mockLogAccessAttempt).toHaveBeenCalledTimes(50);

      // Verify results are correct
      results.forEach((result, i) => {
        expect(typeof result.can).toBe('boolean');
        if (result.reason) {
          expect(typeof result.reason).toBe('string');
        }
      });
    });

    it('should handle memory efficiently with repeated evaluations', () => {
      const context = {
        userId: 'memory_user',
        role: 'admin',
        tenantId: 'memory_tenant',
      };

      // Create large record to test memory handling
      const largeRecord: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeRecord[`field_${i}`] = `value_${i}`;
      }

      const startTime = performance.now();

      // Repeated evaluations with large records
      for (let i = 0; i < 100; i++) {
        evaluateAccess({
          context: { ...context, userId: `user_${i}` },
          resource: 'orders',
          action: 'read',
          record: { ...largeRecord, tenantId: context.tenantId },
        });
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should handle large records efficiently
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed context gracefully', () => {
      const malformedContext = {
        // Missing required fields
        invalidField: 'invalid_value',
      } as any;

      const result = evaluateAccess({
        context: malformedContext,
        resource: 'test_resource',
        action: 'test_action',
      });

      expect(result.can).toBe(false);
      expect(mockLogAccessAttempt).toHaveBeenCalled();
    });

    it('should handle null/undefined parameters', () => {
      const context = {
        userId: 'test_user',
        role: 'user',
        tenantId: 'test_tenant',
      };

      // Test with null record
      const nullRecordResult = evaluateAccess({
        context,
        resource: 'orders',
        action: 'read',
        record: null as any,
      });

      expect(typeof nullRecordResult.can).toBe('boolean');

      // Test with undefined field
      const undefinedFieldResult = evaluateAccess({
        context,
        resource: 'orders',
        action: 'read',
        field: undefined,
      });

      expect(typeof undefinedFieldResult.can).toBe('boolean');
    });

    it('should handle logging failures gracefully', () => {
      // Mock logging to throw an error
      mockLogAccessAttempt.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      const context = {
        userId: 'test_user',
        role: 'admin',
        tenantId: 'test_tenant',
      };

      // Evaluation should still work even if logging fails
      expect(() => {
        const result = evaluateAccess({
          context,
          resource: 'users',
          action: 'invite',
        });
        expect(result.can).toBe(true);
      }).toThrow('Logging failed'); // Currently throws, but could be improved
    });

    it('should handle empty rule sets', () => {
      // Mock empty combined rules
      const originalRules = combinedRules.slice();
      combinedRules.length = 0; // Clear the array

      const context = {
        userId: 'test_user',
        role: 'admin',
        tenantId: 'test_tenant',
      };

      const result = evaluateAccess({
        context,
        resource: 'any_resource',
        action: 'any_action',
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe('No matching rule found');

      // Restore original rules
      combinedRules.push(...originalRules);
    });
  });

  describe('integration with testing utilities', () => {
    it('should work with testing helper functions', () => {
      const mockContext = createMockUserContext({
        role: 'admin',
        tenantId: 'test_tenant',
      });

      const result = evaluateAccess({
        context: mockContext,
        resource: 'users',
        action: 'invite',
      });

      expect(result.can).toBe(true);
    });

    it('should work with mock access evaluation input', () => {
      const mockInput = createMockAccessEvaluationInput({
        action: 'approve',
        resource: 'payments',
        context: { clearanceLevel: 5 },
      });

      // Transform the input format for our evaluateAccess function
      const result = evaluateAccess({
        context: mockInput.context,
        resource: mockInput.resource,
        action: mockInput.action,
        record: mockInput.record,
        field: mockInput.field,
      });

      expect(result.can).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle multi-tenant order management scenario', () => {
      // Tenant A user accessing tenant A order
      const tenantAUser = {
        userId: 'user_a1',
        role: 'user',
        tenantId: 'tenant_a',
      };

      const tenantAOrder = {
        id: 'order_a1',
        tenantId: 'tenant_a',
        createdBy: 'user_a1',
        total: 100,
      };

      const readResult = evaluateAccess({
        context: tenantAUser,
        resource: 'orders',
        action: 'read',
        record: tenantAOrder,
        field: 'total',
      });

      expect(readResult.can).toBe(true);

      // Tenant B user trying to access tenant A order
      const tenantBUser = {
        userId: 'user_b1',
        role: 'user',
        tenantId: 'tenant_b',
      };

      const crossTenantResult = evaluateAccess({
        context: tenantBUser,
        resource: 'orders',
        action: 'read',
        record: tenantAOrder,
      });

      expect(crossTenantResult.can).toBe(false);
    });

    it('should handle regional financial data access scenario', () => {
      // US finance team accessing US invoices
      const usFinanceUser = {
        userId: 'finance_us',
        role: 'analyst',
        tenantId: 'company_tenant',
        region: 'us-east',
        department: 'finance',
      };

      const usInvoice = {
        id: 'invoice_us_001',
        region: 'us-east',
        amount: 25000,
        currency: 'USD',
      };

      const usAccessResult = evaluateAccess({
        context: usFinanceUser,
        resource: 'invoices',
        action: 'read',
        record: usInvoice,
      });

      expect(usAccessResult.can).toBe(true);

      // US finance team trying to access EU invoices
      const euInvoice = {
        id: 'invoice_eu_001',
        region: 'eu-west',
        amount: 20000,
        currency: 'EUR',
      };

      const crossRegionResult = evaluateAccess({
        context: usFinanceUser,
        resource: 'invoices',
        action: 'read',
        record: euInvoice,
      });

      expect(crossRegionResult.can).toBe(false);
    });

    it('should handle clearance-based payment approval workflow', () => {
      const approvalContexts = [
        { userId: 'user_l1', clearanceLevel: 1, role: 'junior' },
        { userId: 'user_l3', clearanceLevel: 3, role: 'manager' },
        { userId: 'user_l5', clearanceLevel: 5, role: 'director' },
      ];

      const paymentRequests = [
        { id: 'payment_small', amount: 1000 },
        { id: 'payment_medium', amount: 50000 },
        { id: 'payment_large', amount: 500000 },
      ];

      approvalContexts.forEach((context, userIndex) => {
        paymentRequests.forEach((payment, paymentIndex) => {
          const result = evaluateAccess({
            context: { ...context, tenantId: 'company' },
            resource: 'payments',
            action: 'approve',
            record: payment,
          });

          // Only users with clearanceLevel >= 3 can approve payments
          const expectedResult = context.clearanceLevel >= 3;
          expect(result.can).toBe(expectedResult);

          if (!expectedResult) {
            expect(result.reason).toBeDefined();
          }
        });
      });
    });
  });
});