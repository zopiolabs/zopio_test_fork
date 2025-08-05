/**
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Auth Hooks Tests - useAccess Hook Functionality
 * 
 * Comprehensive test suite for the useAccess React hook that provides client-side authorization capabilities.
 * Validates hook behavior, performance, error handling, and integration with authentication providers.
 * 
 * **Test Scope:**
 * - Hook functionality with various parameter combinations and contexts
 * - Integration with Clerk authentication and auth-runner evaluation engine
 * - Performance characteristics and memoization behavior under different scenarios
 * 
 * **Test Categories:**
 * 1. **Basic Functionality**: Core hook behavior with standard parameter validation
 * 2. **Error Handling**: Graceful handling of evaluation failures and malformed inputs
 * 3. **Parameter Validation**: Input sanitization and edge case handling
 * 4. **Performance Testing**: Memoization, rapid re-renders, and concurrent usage
 * 
 * **Mock Strategy:**
 * - Mock auth-runner evaluation engine for controlled testing scenarios
 * - Mock Clerk authentication provider with various user states
 * - React Testing Library with custom test wrappers for hook testing
 * 
 * **Quality Standards:**
 * - 100% accuracy in access evaluation result propagation
 * - Robust memoization behavior to prevent unnecessary re-evaluations
 * - Comprehensive error handling with user-friendly error messages
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, render } from '@testing-library/react';
import React from 'react';
import { useAccess } from '../hooks/use-access.js';
import { createTestWrapper, mockClerkAuth, authFlowTestUtils } from '@repo/testing';

// Mock the auth-runner module
const mockEvaluateAccess = vi.fn();
vi.mock('@repo/auth-runner', () => ({
  evaluateAccess: mockEvaluateAccess,
}));

describe('useAccess Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return access result for valid parameters', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: true,
        reason: undefined,
        loading: false,
      });

      expect(mockEvaluateAccess).toHaveBeenCalledWith({
        resource: 'documents',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'admin',
          tenantId: 'tenant_456',
        },
      });
    });

    it('should return denied access for failed evaluation', () => {
      mockEvaluateAccess.mockReturnValue({
        can: false,
        reason: 'Insufficient permissions',
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'sensitive_data',
          action: 'delete',
          context: {
            userId: 'user_123',
            role: 'viewer',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: false,
        reason: 'Insufficient permissions',
        loading: false,
      });
    });

    it('should handle access evaluation with record parameter', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const record = { id: 'doc_123', ownerId: 'user_123' };
      
      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'edit',
          record,
          context: {
            userId: 'user_123',
            role: 'editor',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.can).toBe(true);
      expect(mockEvaluateAccess).toHaveBeenCalledWith({
        resource: 'documents',
        action: 'edit',
        record,
        context: {
          userId: 'user_123',
          role: 'editor',
          tenantId: 'tenant_456',
        },
      });
    });

    it('should handle access evaluation with field parameter', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'user_profiles',
          action: 'read',
          field: 'email',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.can).toBe(true);
      expect(mockEvaluateAccess).toHaveBeenCalledWith({
        resource: 'user_profiles',
        action: 'read',
        field: 'email',
        context: {
          userId: 'user_123',
          role: 'admin',
          tenantId: 'tenant_456',
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle evaluation errors gracefully', () => {
      mockEvaluateAccess.mockImplementation(() => {
        throw new Error('Evaluation failed');
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: false,
        reason: 'Evaluation failed',
        loading: false,
      });
    });

    it('should handle non-Error exceptions', () => {
      mockEvaluateAccess.mockImplementation(() => {
        throw 'String error';
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: false,
        reason: 'Unknown error',
        loading: false,
      });
    });

    it('should handle null/undefined evaluation results', () => {
      mockEvaluateAccess.mockReturnValue(null);

      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: false,
        reason: 'Unknown error',
        loading: false,
      });
    });

    it('should handle malformed evaluation results', () => {
      mockEvaluateAccess.mockReturnValue({ invalid: 'result' });

      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: false,
        reason: 'Unknown error',
        loading: false,
      });
    });
  });

  describe('parameter validation', () => {
    it('should handle missing required parameters', () => {
      const { result } = renderHook(
        () => useAccess({
          resource: '',
          action: 'read',
          context: {
            userId: 'user_123',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.can).toBe(false);
      expect(result.current.reason).toBeDefined();
    });

    it('should handle invalid context parameters', () => {
      const { result } = renderHook(
        () => useAccess({
          resource: 'documents',
          action: 'read',
          context: {
            userId: '',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      // Should still call evaluateAccess with empty userId
      expect(mockEvaluateAccess).toHaveBeenCalled();
    });

    it('should handle special characters in parameters', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'api/v1/documents',
          action: 'read:metadata',
          field: 'user.profile.email',
          context: {
            userId: 'user_123@domain.com',
            role: 'admin',
            tenantId: 'tenant_456',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.can).toBe(true);
      expect(mockEvaluateAccess).toHaveBeenCalledWith({
        resource: 'api/v1/documents',
        action: 'read:metadata',
        field: 'user.profile.email',
        context: {
          userId: 'user_123@domain.com',
          role: 'admin',
          tenantId: 'tenant_456',
        },
      });
    });
  });

  describe('memoization and performance', () => {
    it('should memoize results for identical parameters', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const params = {
        resource: 'documents',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'admin',
          tenantId: 'tenant_456',
        },
      };

      const { result, rerender } = renderHook(
        ({ params }) => useAccess(params),
        {
          wrapper: createTestWrapper(),
          initialProps: { params },
        }
      );

      expect(mockEvaluateAccess).toHaveBeenCalledTimes(1);
      
      // Re-render with same parameters
      rerender({ params });
      expect(mockEvaluateAccess).toHaveBeenCalledTimes(1); // Should not call again
    });

    it('should re-evaluate when parameters change', () => {
      mockEvaluateAccess
        .mockReturnValueOnce({ can: true, reason: undefined })
        .mockReturnValueOnce({ can: false, reason: 'Access denied' });

      const initialParams = {
        resource: 'documents',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'admin',
          tenantId: 'tenant_456',
        },
      };

      const { result, rerender } = renderHook(
        ({ params }) => useAccess(params),
        {
          wrapper: createTestWrapper(),
          initialProps: { params: initialParams },
        }
      );

      expect(result.current.can).toBe(true);
      expect(mockEvaluateAccess).toHaveBeenCalledTimes(1);

      // Change parameters
      const newParams = {
        ...initialParams,
        action: 'delete',
      };

      rerender({ params: newParams });

      expect(result.current.can).toBe(false);
      expect(mockEvaluateAccess).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid parameter changes efficiently', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const baseParams = {
        resource: 'documents',
        action: 'read',
        context: {
          userId: 'user_123',
          role: 'admin',
          tenantId: 'tenant_456',
        },
      };

      const { rerender } = renderHook(
        ({ action }) => useAccess({ ...baseParams, action }),
        {
          wrapper: createTestWrapper(),
          initialProps: { action: 'read' },
        }
      );

      // Rapidly change action multiple times
      const actions = ['read', 'write', 'delete', 'create', 'update'];
      actions.forEach(action => {
        rerender({ action });
      });

      expect(mockEvaluateAccess).toHaveBeenCalledTimes(actions.length);
    });
  });

  describe('integration with auth providers', () => {
    it('should work with mock Clerk authentication', () => {
      const mockAuthState = mockClerkAuth({
        isSignedIn: true,
        userId: 'clerk_user_123',
        user: { id: 'clerk_user_123', emailAddresses: [{ emailAddress: 'user@example.com' }] },
      });

      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'user_data',
          action: 'read',
          context: {
            userId: mockAuthState.userId,
            role: 'user',
            tenantId: 'tenant_123',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.can).toBe(true);
      expect(mockEvaluateAccess).toHaveBeenCalledWith({
        resource: 'user_data',
        action: 'read',
        context: {
          userId: 'clerk_user_123',
          role: 'user',
          tenantId: 'tenant_123',
        },
      });
    });

    it('should handle unauthenticated state', () => {
      mockClerkAuth({
        isSignedIn: false,
        userId: null,
        user: null,
      });

      mockEvaluateAccess.mockImplementation(() => {
        throw new Error('User not authenticated');
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'protected_resource',
          action: 'access',
          context: {
            userId: '',
            role: 'anonymous',
            tenantId: '',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current).toEqual({
        can: false,
        reason: 'User not authenticated',
        loading: false,
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle hierarchical permission checking', () => {
      mockEvaluateAccess.mockImplementation(({ resource, action, context }) => {
        // Simulate hierarchical access control
        const hierarchy = {
          admin: ['manager', 'user'],
          manager: ['user'],
          user: [],
        };

        const hasRole = (userRole: string, requiredRole: string): boolean => {
          if (userRole === requiredRole) return true;
          return hierarchy[userRole as keyof typeof hierarchy]?.includes(requiredRole) || false;
        };

        if (resource === 'admin_panel' && !hasRole(context.role, 'admin')) {
          return { can: false, reason: 'Admin access required' };
        }

        if (resource === 'reports' && !hasRole(context.role, 'manager')) {
          return { can: false, reason: 'Manager access required' };
        }

        return { can: true, reason: undefined };
      });

      const adminContext = {
        userId: 'admin_user',
        role: 'admin',
        tenantId: 'tenant_123',
      };

      const managerContext = {
        userId: 'manager_user',
        role: 'manager',
        tenantId: 'tenant_123',
      };

      const userContext = {
        userId: 'regular_user',
        role: 'user',
        tenantId: 'tenant_123',
      };

      // Test admin access
      const { result: adminResult } = renderHook(
        () => useAccess({
          resource: 'admin_panel',
          action: 'access',
          context: adminContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(adminResult.current.can).toBe(true);

      // Test manager accessing admin panel
      const { result: managerAdminResult } = renderHook(
        () => useAccess({
          resource: 'admin_panel',
          action: 'access',
          context: managerContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(managerAdminResult.current.can).toBe(false);
      expect(managerAdminResult.current.reason).toBe('Admin access required');

      // Test manager accessing reports
      const { result: managerReportResult } = renderHook(
        () => useAccess({
          resource: 'reports',
          action: 'view',
          context: managerContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(managerReportResult.current.can).toBe(true);

      // Test user accessing reports
      const { result: userReportResult } = renderHook(
        () => useAccess({
          resource: 'reports',
          action: 'view',
          context: userContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(userReportResult.current.can).toBe(false);
      expect(userReportResult.current.reason).toBe('Manager access required');
    });

    it('should handle attribute-based access control (ABAC)', () => {
      mockEvaluateAccess.mockImplementation(({ resource, action, context, record }) => {
        // Simulate ABAC rules
        if (resource === 'regional_data') {
          if (!record || !context.region) {
            return { can: false, reason: 'Regional information required' };
          }
          
          if (record.region !== context.region && !context.globalAccess) {
            return { can: false, reason: 'Region mismatch' };
          }
        }

        if (resource === 'sensitive_data' && (context.clearanceLevel || 0) < 5) {
          return { can: false, reason: 'Insufficient clearance level' };
        }

        return { can: true, reason: undefined };
      });

      const context = {
        userId: 'user_regional',
        role: 'analyst',
        tenantId: 'tenant_123',
        region: 'us-east',
        clearanceLevel: 6,
      };

      // Test same region access
      const { result: sameRegionResult } = renderHook(
        () => useAccess({
          resource: 'regional_data',
          action: 'read',
          record: { id: 'data_123', region: 'us-east' },
          context,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(sameRegionResult.current.can).toBe(true);

      // Test different region access
      const { result: differentRegionResult } = renderHook(
        () => useAccess({
          resource: 'regional_data',
          action: 'read',
          record: { id: 'data_456', region: 'us-west' },
          context,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(differentRegionResult.current.can).toBe(false);
      expect(differentRegionResult.current.reason).toBe('Region mismatch');

      // Test clearance level access
      const { result: clearanceResult } = renderHook(
        () => useAccess({
          resource: 'sensitive_data',
          action: 'access',
          context,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(clearanceResult.current.can).toBe(true);

      // Test insufficient clearance
      const { result: lowClearanceResult } = renderHook(
        () => useAccess({
          resource: 'sensitive_data',
          action: 'access',
          context: { ...context, clearanceLevel: 3 },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(lowClearanceResult.current.can).toBe(false);
      expect(lowClearanceResult.current.reason).toBe('Insufficient clearance level');
    });

    it('should handle field-level permissions', () => {
      mockEvaluateAccess.mockImplementation(({ resource, action, field, context }) => {
        const fieldPermissions = {
          user_profiles: {
            name: ['read'],
            email: ['read', 'write'],
            ssn: ['admin_read'],
            salary: ['admin_read', 'admin_write'],
          },
        };

        const permissions = fieldPermissions[resource as keyof typeof fieldPermissions];
        if (!permissions || !field) {
          return { can: true, reason: undefined }; // No field restrictions
        }

        const fieldPerms = permissions[field as keyof typeof permissions];
        if (!fieldPerms) {
          return { can: false, reason: `Field '${field}' not accessible` };
        }

        const requiredPerm = `${context.role === 'admin' ? 'admin_' : ''}${action}`;
        if (!fieldPerms.includes(requiredPerm)) {
          return { can: false, reason: `Insufficient permissions for field '${field}'` };
        }

        return { can: true, reason: undefined };
      });

      const adminContext = {
        userId: 'admin_user',
        role: 'admin',
        tenantId: 'tenant_123',
      };

      const userContext = {
        userId: 'regular_user',
        role: 'user',
        tenantId: 'tenant_123',
      };

      // Test admin accessing sensitive field
      const { result: adminSalaryResult } = renderHook(
        () => useAccess({
          resource: 'user_profiles',
          action: 'read',
          field: 'salary',
          context: adminContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(adminSalaryResult.current.can).toBe(true);

      // Test user accessing sensitive field
      const { result: userSalaryResult } = renderHook(
        () => useAccess({
          resource: 'user_profiles',
          action: 'read',
          field: 'salary',
          context: userContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(userSalaryResult.current.can).toBe(false);
      expect(userSalaryResult.current.reason).toBe("Insufficient permissions for field 'salary'");

      // Test accessing allowed field
      const { result: userNameResult } = renderHook(
        () => useAccess({
          resource: 'user_profiles',
          action: 'read',
          field: 'name',
          context: userContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(userNameResult.current.can).toBe(true);

      // Test accessing non-existent field
      const { result: invalidFieldResult } = renderHook(
        () => useAccess({
          resource: 'user_profiles',
          action: 'read',
          field: 'nonexistent',
          context: userContext,
        }),
        { wrapper: createTestWrapper() }
      );

      expect(invalidFieldResult.current.can).toBe(false);
      expect(invalidFieldResult.current.reason).toBe("Field 'nonexistent' not accessible");
    });
  });

  describe('performance and stress testing', () => {
    it('should handle rapid successive calls efficiently', () => {
      let callCount = 0;
      mockEvaluateAccess.mockImplementation(() => {
        callCount++;
        return { can: true, reason: undefined };
      });

      const { result, rerender } = renderHook(
        ({ counter }) => useAccess({
          resource: 'test_resource',
          action: 'read',
          context: {
            userId: `user_${counter}`,
            role: 'user',
            tenantId: 'tenant_123',
          },
        }),
        {
          wrapper: createTestWrapper(),
          initialProps: { counter: 0 },
        }
      );

      // Rapidly change the user ID 100 times
      for (let i = 1; i <= 100; i++) {
        rerender({ counter: i });
      }

      expect(callCount).toBe(101); // Initial + 100 rerenders
      expect(result.current.can).toBe(true);
    });

    it('should handle large context objects without performance degradation', () => {
      const largeContext = {
        userId: 'user_large',
        role: 'admin',
        tenantId: 'tenant_123',
      };

      // Add 1000 additional properties
      for (let i = 0; i < 1000; i++) {
        (largeContext as any)[`property_${i}`] = `value_${i}`;
      }

      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const startTime = performance.now();

      const { result } = renderHook(
        () => useAccess({
          resource: 'large_context_test',
          action: 'read',
          context: largeContext,
        }),
        { wrapper: createTestWrapper() }
      );

      const endTime = performance.now();

      expect(result.current.can).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle concurrent hook instances', async () => {
      mockEvaluateAccess.mockImplementation(({ context }) => ({
        can: context.userId.startsWith('admin_'),
        reason: context.userId.startsWith('admin_') ? undefined : 'Not admin',
      }));

      const TestComponent = () => {
        const access1 = useAccess({
          resource: 'resource1',
          action: 'read',
          context: { userId: 'admin_1', role: 'admin', tenantId: 'tenant_1' },
        });

        const access2 = useAccess({
          resource: 'resource2',
          action: 'write',
          context: { userId: 'user_2', role: 'user', tenantId: 'tenant_2' },
        });

        const access3 = useAccess({
          resource: 'resource3',
          action: 'delete',
          context: { userId: 'admin_3', role: 'admin', tenantId: 'tenant_3' },
        });

        return (
          <div>
            <span data-testid="access1">{access1.can ? 'allowed' : 'denied'}</span>
            <span data-testid="access2">{access2.can ? 'allowed' : 'denied'}</span>
            <span data-testid="access3">{access3.can ? 'allowed' : 'denied'}</span>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(getByTestId('access1')).toHaveTextContent('allowed');
        expect(getByTestId('access2')).toHaveTextContent('denied');
        expect(getByTestId('access3')).toHaveTextContent('allowed');
      });

      expect(mockEvaluateAccess).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases and error boundaries', () => {
    it('should handle hook cleanup on unmount', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const { unmount } = renderHook(
        () => useAccess({
          resource: 'cleanup_test',
          action: 'read',
          context: {
            userId: 'user_cleanup',
            role: 'user',
            tenantId: 'tenant_123',
          },
        }),
        { wrapper: createTestWrapper() }
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle hook with changing wrapper', () => {
      mockEvaluateAccess.mockReturnValue({
        can: true,
        reason: undefined,
      });

      const FirstWrapper = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="first-wrapper">{children}</div>
      );

      const SecondWrapper = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="second-wrapper">{children}</div>
      );

      const { result, rerender } = renderHook(
        () => useAccess({
          resource: 'wrapper_test',
          action: 'read',
          context: {
            userId: 'user_wrapper',
            role: 'user',
            tenantId: 'tenant_123',
          },
        }),
        { wrapper: FirstWrapper }
      );

      expect(result.current.can).toBe(true);

      // Change wrapper (this is unusual but tests robustness)
      rerender(undefined, { wrapper: SecondWrapper });

      expect(result.current.can).toBe(true);
    });
  });
});