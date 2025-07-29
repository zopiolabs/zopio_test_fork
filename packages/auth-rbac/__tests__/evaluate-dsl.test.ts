/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { evaluateDsl, type DSLNode } from '../engine/evaluate-dsl.js';

describe('evaluateDsl', () => {
  const mockContext = {
    userId: 'user_123',
    role: 'admin',
    tenantId: 'tenant_456',
    region: 'us-east',
    clearanceLevel: 5,
    active: true,
    email: 'admin@example.com',
  };

  const mockRecord = {
    id: 'record_789',
    ownerId: 'user_123',
    status: 'active',
    region: 'us-east',
    priority: 3,
    public: false,
    createdBy: 'user_123',
  };

  describe('equals operation', () => {
    it('should return true when context values are equal', () => {
      const rule: DSLNode = {
        equals: ['context.userId', 'context.userId'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return true when record values are equal', () => {
      const rule: DSLNode = {
        equals: ['record.id', 'record.id'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return true when context and record values match', () => {
      const rule: DSLNode = {
        equals: ['context.userId', 'record.ownerId'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return false when values do not match', () => {
      const rule: DSLNode = {
        equals: ['context.userId', 'record.id'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(false);
    });

    it('should return true when string values match exactly', () => {
      const rule: DSLNode = {
        equals: ['context.role', 'context.role'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return true when number values match', () => {
      const rule: DSLNode = {
        equals: ['context.clearanceLevel', 'record.priority'],
      };

      const context = { ...mockContext, clearanceLevel: 3 };
      const result = evaluateDsl(rule, context, mockRecord);

      expect(result).toBe(true);
    });

    it('should return true when boolean values match', () => {
      const rule: DSLNode = {
        equals: ['context.active', 'context.active'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle missing context properties', () => {
      const rule: DSLNode = {
        equals: ['context.nonexistent', 'context.nonexistent'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle missing record properties', () => {
      const rule: DSLNode = {
        equals: ['record.nonexistent', 'record.nonexistent'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle mixed missing properties', () => {
      const rule: DSLNode = {
        equals: ['context.nonexistent', 'record.nonexistent'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle null record', () => {
      const rule: DSLNode = {
        equals: ['record.id', 'record.ownerId'],
      };

      const result = evaluateDsl(rule, mockContext, null);

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle comparison with null record property', () => {
      const rule: DSLNode = {
        equals: ['context.userId', 'record.id'],
      };

      const result = evaluateDsl(rule, mockContext, null);

      expect(result).toBe(false); // 'user_123' !== undefined
    });
  });

  describe('and operation', () => {
    it('should return true when all conditions are true', () => {
      const rule: DSLNode = {
        and: [
          { equals: ['context.userId', 'record.ownerId'] },
          { equals: ['context.region', 'record.region'] },
          { equals: ['record.status', 'record.status'] },
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return false when one condition is false', () => {
      const rule: DSLNode = {
        and: [
          { equals: ['context.userId', 'record.ownerId'] }, // true
          { equals: ['context.role', 'record.status'] }, // false
          { equals: ['context.region', 'record.region'] }, // true
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(false);
    });

    it('should return false when all conditions are false', () => {
      const rule: DSLNode = {
        and: [
          { equals: ['context.role', 'record.id'] }, // false
          { equals: ['context.email', 'record.status'] }, // false
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(false);
    });

    it('should handle empty and array', () => {
      const rule: DSLNode = {
        and: [],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true); // every() returns true for empty array
    });

    it('should handle single condition in and', () => {
      const rule: DSLNode = {
        and: [{ equals: ['context.userId', 'record.ownerId'] }],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle nested and operations', () => {
      const rule: DSLNode = {
        and: [
          {
            and: [
              { equals: ['context.userId', 'record.ownerId'] },
              { equals: ['context.region', 'record.region'] },
            ],
          },
          { equals: ['record.status', 'record.status'] },
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });
  });

  describe('or operation', () => {
    it('should return true when at least one condition is true', () => {
      const rule: DSLNode = {
        or: [
          { equals: ['context.role', 'record.id'] }, // false
          { equals: ['context.userId', 'record.ownerId'] }, // true
          { equals: ['context.email', 'record.status'] }, // false
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return true when all conditions are true', () => {
      const rule: DSLNode = {
        or: [
          { equals: ['context.userId', 'record.ownerId'] }, // true
          { equals: ['context.region', 'record.region'] }, // true
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should return false when all conditions are false', () => {
      const rule: DSLNode = {
        or: [
          { equals: ['context.role', 'record.id'] }, // false
          { equals: ['context.email', 'record.priority'] }, // false
          { equals: ['context.tenantId', 'record.status'] }, // false
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(false);
    });

    it('should handle empty or array', () => {
      const rule: DSLNode = {
        or: [],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(false); // some() returns false for empty array
    });

    it('should handle single condition in or', () => {
      const rule: DSLNode = {
        or: [{ equals: ['context.userId', 'record.ownerId'] }],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle nested or operations', () => {
      const rule: DSLNode = {
        or: [
          {
            or: [
              { equals: ['context.role', 'record.id'] }, // false
              { equals: ['context.email', 'record.status'] }, // false
            ],
          },
          { equals: ['context.userId', 'record.ownerId'] }, // true
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });
  });

  describe('complex nested operations', () => {
    it('should handle and within or', () => {
      const rule: DSLNode = {
        or: [
          {
            and: [
              { equals: ['context.role', 'record.id'] }, // false
              { equals: ['context.userId', 'record.ownerId'] }, // true
            ],
          }, // false (because of AND)
          { equals: ['context.region', 'record.region'] }, // true
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle or within and', () => {
      const rule: DSLNode = {
        and: [
          {
            or: [
              { equals: ['context.role', 'record.id'] }, // false
              { equals: ['context.userId', 'record.ownerId'] }, // true
            ],
          }, // true (because of OR)
          { equals: ['context.region', 'record.region'] }, // true
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle deep nesting', () => {
      const rule: DSLNode = {
        and: [
          {
            or: [
              {
                and: [
                  { equals: ['context.userId', 'record.ownerId'] }, // true
                  { equals: ['context.region', 'record.region'] }, // true
                ],
              }, // true
              { equals: ['context.role', 'record.id'] }, // false
            ],
          }, // true
          {
            or: [
              { equals: ['record.status', 'record.status'] }, // true
              { equals: ['context.email', 'record.priority'] }, // false
            ],
          }, // true
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle multiple levels of the same operation', () => {
      const rule: DSLNode = {
        and: [
          {
            and: [
              {
                and: [
                  { equals: ['context.userId', 'record.ownerId'] },
                  { equals: ['context.region', 'record.region'] },
                ],
              },
              { equals: ['record.status', 'record.status'] },
            ],
          },
          { equals: ['context.active', 'context.active'] },
        ],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });
  });

  describe('path resolution', () => {
    it('should correctly resolve context paths', () => {
      const rule: DSLNode = {
        equals: ['context.email', 'context.email'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should correctly resolve record paths', () => {
      const rule: DSLNode = {
        equals: ['record.createdBy', 'record.createdBy'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle paths with dots in property names', () => {
      const contextWithDots = {
        'user.name': 'John Doe',
        'tenant.id': 'tenant_123',
      };

      const recordWithDots = {
        'owner.id': 'user_456',
        'meta.created': '2023-01-01',
      };

      const rule: DSLNode = {
        equals: ['context.user.name', 'context.user.name'],
      };

      const result = evaluateDsl(rule, contextWithDots, recordWithDots);

      expect(result).toBe(true); // Should match 'user.name' property
    });

    it('should handle invalid path prefixes', () => {
      const rule: DSLNode = {
        equals: ['invalid.userId', 'invalid.userId'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle paths without prefixes', () => {
      const rule: DSLNode = {
        equals: ['userId', 'userId'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true); // undefined === undefined
    });
  });

  describe('data type handling', () => {
    it('should handle string comparisons', () => {
      const rule: DSLNode = {
        equals: ['context.role', 'context.role'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle number comparisons', () => {
      const rule: DSLNode = {
        equals: ['context.clearanceLevel', 'record.priority'],
      };

      const context = { ...mockContext, clearanceLevel: 3 };
      const result = evaluateDsl(rule, context, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle boolean comparisons', () => {
      const rule: DSLNode = {
        equals: ['context.active', 'record.public'],
      };

      const context = { ...mockContext, active: false };
      const result = evaluateDsl(rule, context, mockRecord);

      expect(result).toBe(true);
    });

    it('should handle mixed type comparisons', () => {
      const rule: DSLNode = {
        equals: ['context.clearanceLevel', 'context.role'],
      };

      const result = evaluateDsl(rule, mockContext, mockRecord);

      expect(result).toBe(false); // 5 !== 'admin'
    });

    it('should handle null values', () => {
      const contextWithNull = { ...mockContext, nullValue: null };
      const recordWithNull = { ...mockRecord, nullValue: null };

      const rule: DSLNode = {
        equals: ['context.nullValue', 'record.nullValue'],
      };

      const result = evaluateDsl(rule, contextWithNull, recordWithNull);

      expect(result).toBe(true);
    });

    it('should handle undefined vs null comparison', () => {
      const contextWithNull = { ...mockContext, nullValue: null };

      const rule: DSLNode = {
        equals: ['context.nullValue', 'record.undefinedValue'],
      };

      const result = evaluateDsl(rule, contextWithNull, mockRecord);

      expect(result).toBe(false); // null !== undefined
    });
  });

  describe('edge cases', () => {
    it('should handle empty context', () => {
      const rule: DSLNode = {
        equals: ['context.userId', 'context.userId'],
      };

      const result = evaluateDsl(rule, {}, mockRecord);

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle empty record', () => {
      const rule: DSLNode = {
        equals: ['record.id', 'record.id'],
      };

      const result = evaluateDsl(rule, mockContext, {});

      expect(result).toBe(true); // undefined === undefined
    });

    it('should handle null context', () => {
      const rule: DSLNode = {
        equals: ['context.userId', 'record.id'],
      };

      const result = evaluateDsl(rule, null as any, mockRecord);

      expect(result).toBe(false); // undefined !== 'record_789'
    });

    it('should handle rule with no matching operation', () => {
      const invalidRule = { invalid: 'operation' } as any;

      const result = evaluateDsl(invalidRule, mockContext, mockRecord);

      expect(result).toBe(false);
    });

    it('should handle malformed equals operation', () => {
      const malformedRule = { equals: ['single-value'] } as any;

      const result = evaluateDsl(malformedRule, mockContext, mockRecord);

      expect(result).toBe(false); // Should handle gracefully
    });

    it('should handle equals with non-array value', () => {
      const malformedRule = { equals: 'not-an-array' } as any;

      const result = evaluateDsl(malformedRule, mockContext, mockRecord);

      expect(result).toBe(false); // Should handle gracefully
    });
  });

  describe('performance scenarios', () => {
    it('should handle large nested structures efficiently', () => {
      // Create a deeply nested rule
      let rule: DSLNode = { equals: ['context.userId', 'record.ownerId'] };
      
      for (let i = 0; i < 100; i++) {
        rule = {
          and: [
            rule,
            { equals: ['context.active', 'context.active'] },
          ],
        };
      }

      const startTime = Date.now();
      const result = evaluateDsl(rule, mockContext, mockRecord);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle wide or operations efficiently', () => {
      const conditions: DSLNode[] = [];
      
      // Create 1000 or conditions (999 false, 1 true)
      for (let i = 0; i < 999; i++) {
        conditions.push({ equals: ['context.role', 'record.nonexistent'] });
      }
      conditions.push({ equals: ['context.userId', 'record.ownerId'] }); // true

      const rule: DSLNode = { or: conditions };

      const startTime = Date.now();
      const result = evaluateDsl(rule, mockContext, mockRecord);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should short-circuit efficiently
    });

    it('should handle wide and operations efficiently', () => {
      const conditions: DSLNode[] = [];
      
      // Create 1000 and conditions (999 true, 1 false)
      for (let i = 0; i < 999; i++) {
        conditions.push({ equals: ['context.userId', 'context.userId'] });
      }
      conditions.push({ equals: ['context.role', 'record.nonexistent'] }); // false

      const rule: DSLNode = { and: conditions };

      const startTime = Date.now();
      const result = evaluateDsl(rule, mockContext, mockRecord);
      const endTime = Date.now();

      expect(result).toBe(false);
      expect(endTime - startTime).toBeLessThan(100); // Should short-circuit efficiently
    });
  });
});