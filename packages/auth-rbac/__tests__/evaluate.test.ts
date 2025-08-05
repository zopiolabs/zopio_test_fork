/**
 * @fileoverview Auth-RBAC Tests - Access Evaluation Engine
 * 
 * Comprehensive test suite for the core access evaluation engine that processes permission rules
 * against user contexts and data records. Tests cover rule matching, condition evaluation,
 * field-level permissions, and complex authorization scenarios.
 * 
 * **Test Scope:**
 * - Basic rule matching for resources and actions
 * - Condition function evaluation with context and records
 * - DSL-based rule evaluation integration
 * - Field-level permission enforcement
 * - Multiple rule processing and precedence
 * - Complex authorization scenarios
 * 
 * **Test Categories:**
 * 1. **Rule Matching**: Resource/action matching, precedence, and selection
 * 2. **Condition Evaluation**: Function-based conditions, DSL conditions, default behaviors
 * 3. **Field Permissions**: Field-level access control, restricted fields, undefined fields
 * 4. **Multiple Rules**: Rule priority, condition chaining, early termination
 * 5. **Complex Scenarios**: Combined conditions and field permissions, null/undefined handling
 * 6. **Edge Cases**: Empty rules, malformed input, special characters
 * 
 * **Mock Strategy:**
 * - Mock DSL evaluator to isolate access evaluation logic
 * - Static user contexts with realistic role/tenant data
 * - Condition functions with various complexity levels
 * - Deterministic mock responses for predictable testing
 * 
 * **Quality Standards:**
 * - All authorization failures must provide clear reasons
 * - Field-level restrictions must be enforced consistently
 * - Rule evaluation must be deterministic and reproducible
 * - Performance must be maintained across complex rule sets
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import type {
  AccessEvaluationInput,
  PermissionRule,
  UserContext,
} from '../types/index.js';

// Mock the DSL evaluator
const mockEvaluateDsl = vi.fn();
vi.mock('../engine/evaluate-dsl.js', () => ({
  evaluateDsl: mockEvaluateDsl,
}));

/**
 * @describe Access Evaluation Engine Tests
 * 
 * Core test suite for the access evaluation engine that processes permission rules
 * against user contexts and records to determine authorization decisions.
 */
describe('Access Evaluation Engine', () => {
  const mockUserContext: UserContext = {
    userId: 'user_123',
    role: 'admin',
    tenantId: 'tenant_456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @describe Basic Rule Matching Tests
   * 
   * Tests fundamental rule matching logic for resources and actions,
   * including positive and negative authorization scenarios.
   */
  describe('basic rule matching', () => {
    it('should grant access when rule matches resource and action', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
    });

    it('should deny access when no rule matches', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'write',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: 'No matching rule found',
      });
    });

    it('should deny access when resource does not match', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'posts',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: 'No matching rule found',
      });
    });
  });

  /**
   * @describe Condition Evaluation Tests
   * 
   * Tests the evaluation of permission conditions using both function-based
   * and DSL-based approaches with various context and record combinations.
   */
  describe('condition evaluation', () => {
    it('should grant access when condition function returns true', () => {
      const mockCondition = vi.fn().mockReturnValue(true);
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        record: { id: '123', name: 'John' },
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockCondition).toHaveBeenCalledWith(mockUserContext, {
        id: '123',
        name: 'John',
      });
    });

    it('should deny access when condition function returns false', () => {
      const mockCondition = vi.fn().mockReturnValue(false);
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        record: { id: '123', name: 'John' },
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: 'No matching rule found',
      });
      expect(mockCondition).toHaveBeenCalledWith(mockUserContext, {
        id: '123',
        name: 'John',
      });
    });

    it('should use DSL when condition function is not provided', () => {
      mockEvaluateDsl.mockReturnValue(true);
      const mockDslNode = { type: 'equals', field: 'userId', value: 'user_123' };

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          dsl: mockDslNode,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        record: { userId: 'user_123' },
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockEvaluateDsl).toHaveBeenCalledWith(
        mockDslNode,
        mockUserContext,
        { userId: 'user_123' }
      );
    });

    it('should default to true when no condition or DSL is provided', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          // No condition or DSL
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
    });
  });

  /**
   * @describe Field-Level Permission Tests
   * 
   * Tests fine-grained field-level access control, including allowed fields,
   * restricted fields, and undefined field handling.
   */
  describe('field-level permissions', () => {
    it('should grant access to allowed fields', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          fieldPermissions: {
            name: 'read',
            email: 'read',
            password: 'none',
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        field: 'name',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
    });

    it('should deny access to fields with none permission', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          fieldPermissions: {
            name: 'read',
            email: 'read',
            password: 'none',
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        field: 'password',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: "No access to field 'password'",
      });
    });

    it('should deny access to undefined fields when field permissions exist', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          fieldPermissions: {
            name: 'read',
            email: 'read',
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        field: 'ssn',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: "No access to field 'ssn'",
      });
    });

    it('should allow access when no field is specified and field permissions exist', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          fieldPermissions: {
            name: 'read',
            password: 'none',
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        // No field specified
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
    });
  });

  /**
   * @describe Multiple Rules Processing Tests
   * 
   * Tests the processing of multiple permission rules with proper precedence,
   * early termination, and rule selection logic.
   */
  describe('multiple rules', () => {
    it('should use the first matching rule', () => {
      const mockCondition1 = vi.fn().mockReturnValue(true);
      const mockCondition2 = vi.fn().mockReturnValue(false);

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition1,
        },
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition2,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockCondition1).toHaveBeenCalled();
      expect(mockCondition2).not.toHaveBeenCalled();
    });

    it('should continue to next rule when condition fails', () => {
      const mockCondition1 = vi.fn().mockReturnValue(false);
      const mockCondition2 = vi.fn().mockReturnValue(true);

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition1,
        },
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition2,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockCondition1).toHaveBeenCalled();
      expect(mockCondition2).toHaveBeenCalled();
    });

    it('should skip non-matching rules', () => {
      const mockCondition = vi.fn().mockReturnValue(true);

      const rules: PermissionRule[] = [
        {
          resource: 'posts',
          action: 'read',
          condition: mockCondition,
        },
        {
          resource: 'users',
          action: 'write',
          condition: mockCondition,
        },
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockCondition).toHaveBeenCalledTimes(1); // Only called for the matching rule
    });
  });

  /**
   * @describe Complex Authorization Scenarios Tests
   * 
   * Tests complex combinations of conditions, field permissions, and edge cases
   * that occur in real-world authorization scenarios.
   */
  describe('complex scenarios', () => {
    it('should handle condition and field permissions together', () => {
      const mockCondition = vi.fn().mockReturnValue(true);

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: mockCondition,
          fieldPermissions: {
            name: 'read',
            email: 'none',
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        field: 'email',
        record: { id: '123' },
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: "No access to field 'email'",
      });
      expect(mockCondition).toHaveBeenCalledWith(mockUserContext, { id: '123' });
    });

    it('should handle DSL and field permissions together', () => {
      mockEvaluateDsl.mockReturnValue(true);
      const mockDslNode = { type: 'equals', field: 'role', value: 'admin' };

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          dsl: mockDslNode,
          fieldPermissions: {
            name: 'read',
            ssn: 'none',
          },
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
        field: 'name',
        record: { role: 'admin' },
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockEvaluateDsl).toHaveBeenCalledWith(
        mockDslNode,
        mockUserContext,
        { role: 'admin' }
      );
    });

    it('should handle null record properly', () => {
      const mockCondition = vi.fn().mockReturnValue(true);

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'create',
          condition: mockCondition,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'create',
        resource: 'users',
        record: null,
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockCondition).toHaveBeenCalledWith(mockUserContext, null);
    });

    it('should handle undefined record properly', () => {
      const mockCondition = vi.fn().mockReturnValue(true);

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'create',
          condition: mockCondition,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'create',
        resource: 'users',
        // record is undefined
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
      expect(mockCondition).toHaveBeenCalledWith(mockUserContext, undefined);
    });
  });

  /**
   * @describe Edge Cases Tests
   * 
   * Tests various edge cases and error conditions to ensure robust handling
   * of malformed input and unexpected authorization scenarios.
   */
  describe('edge cases', () => {
    it('should handle empty rules array', () => {
      const input: AccessEvaluationInput = {
        rules: [],
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({
        can: false,
        reason: 'No matching rule found',
      });
    });

    it('should handle empty strings for resource and action', () => {
      const rules: PermissionRule[] = [
        {
          resource: '',
          action: '',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: '',
        resource: '',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
    });

    it('should handle special characters in resource and action names', () => {
      const rules: PermissionRule[] = [
        {
          resource: 'api/v1/users',
          action: 'read:profile',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read:profile',
        resource: 'api/v1/users',
      };

      const result = evaluateAccess(input);

      expect(result).toEqual({ can: true });
    });

    it('should handle condition function errors gracefully', () => {
      const errorCondition = vi.fn().mockImplementation(() => {
        throw new Error('Condition evaluation failed');
      });

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: errorCondition,
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: mockUserContext,
        action: 'read',
        resource: 'users',
      };

      // Should handle the error and either deny access or continue to next rule
      expect(() => {
        const result = evaluateAccess(input);
        expect(typeof result.can).toBe('boolean');
      }).not.toThrow();
    });

    it('should handle malformed context objects', () => {
      const malformedContext = null as any;

      const rules: PermissionRule[] = [
        {
          resource: 'users',
          action: 'read',
          condition: (ctx: UserContext) => ctx?.role === 'admin',
        },
      ];

      const input: AccessEvaluationInput = {
        rules,
        context: malformedContext,
        action: 'read',
        resource: 'users',
      };

      const result = evaluateAccess(input);
      
      // Should handle null context gracefully
      expect(result.can).toBe(false);
    });
  });
});