/**
 * @fileoverview Core Utils Tests - Object Utilities
 * 
 * Comprehensive test suite for object manipulation utility functions including
 * deepMerge, clone, pick, omit, and path-based operations. Validates deep object
 * manipulation, immutability patterns, and type safety with complex nested structures.
 * 
 * **Test Scope:**
 * - Deep object merging with conflict resolution
 * - Object cloning (shallow and deep)
 * - Property selection and omission (pick, omit)
 * - Path-based object operations (get, set, has)
 * - Object transformation and mapping utilities
 * - Type preservation and generic handling
 * 
 * **Test Categories:**
 * 1. **Deep Operations**: deepMerge, deepClone, nested structure handling
 * 2. **Property Manipulation**: pick, omit, select, filter operations
 * 3. **Path Operations**: get, set, has, delete by path
 * 4. **Transformation**: map, transform, restructure utilities
 * 5. **Type Safety**: Generic type preservation, TypeScript compatibility
 * 6. **Performance**: Large object handling, memory efficiency
 * 7. **Edge Cases**: Circular references, null/undefined handling
 * 
 * **Mock Strategy:**
 * - No external dependencies (pure functions)
 * - Complex nested object structures for testing
 * - Circular reference simulation for edge case testing
 * 
 * **Quality Standards:**
 * - Immutable operations (no mutation of input objects)
 * - Proper handling of circular references and special values
 * - Type-safe generic implementations
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { objectUtils } from '../index.js';

describe('objectUtils', () => {
  describe('deepMerge', () => {
    it('should merge two simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const target = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' }
      };
      const source = {
        user: { age: 31, email: 'john@example.com' },
        settings: { notifications: true }
      };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({
        user: { name: 'John', age: 31, email: 'john@example.com' },
        settings: { theme: 'dark', notifications: true }
      });
    });

    it('should handle deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: { value: 'original' }
          }
        }
      };
      const source = {
        level1: {
          level2: {
            level3: { value: 'updated', newField: 'added' }
          }
        }
      };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({
        level1: {
          level2: {
            level3: { value: 'updated', newField: 'added' }
          }
        }
      });
    });

    it('should not mutate the original target object', () => {
      const target = { a: 1, nested: { value: 'original' } };
      const source = { b: 2, nested: { value: 'updated' } };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(target).toEqual({ a: 1, nested: { value: 'original' } });
      expect(result).toEqual({ a: 1, b: 2, nested: { value: 'updated' } });
    });

    it('should skip undefined values in source', () => {
      const target = { a: 1, b: 2, c: 3 };
      const source = { b: undefined, c: 4, d: 5 };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 2, c: 4, d: 5 });
    });

    it('should handle null values in source', () => {
      const target = { a: 1, b: 2 };
      const source = { b: null, c: 3 };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: null, c: 3 });
    });

    it('should handle arrays as values (replace, not merge)', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ items: [4, 5] });
    });

    it('should handle mixed data types', () => {
      const target = {
        string: 'original',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' }
      };
      const source = {
        string: 'updated',
        number: 84,
        boolean: false,
        array: [4, 5],
        object: { nested: 'updated', new: 'field' }
      };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({
        string: 'updated',
        number: 84,
        boolean: false,
        array: [4, 5],
        object: { nested: 'updated', new: 'field' }
      });
    });

    it('should handle empty objects', () => {
      const target = {};
      const source = { a: 1, b: 2 };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty source', () => {
      const target = { a: 1, b: 2 };
      const source = {};
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle when target is not an object', () => {
      const target = 'not an object' as any;
      const source = { a: 1, b: 2 };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toBe(target);
    });

    it('should handle when source is not an object', () => {
      const target = { a: 1, b: 2 };
      const source = 'not an object' as any;
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle circular references gracefully', () => {
      const target: any = { a: 1 };
      target.self = target;
      
      const source = { b: 2 };
      
      // Should not throw an error
      expect(() => objectUtils.deepMerge(target, source)).not.toThrow();
    });

    it('should replace object with primitive value', () => {
      const target = { 
        config: { 
          debug: true, 
          level: 'info' 
        } 
      };
      const source = { 
        config: 'disabled' 
      };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ config: 'disabled' });
    });

    it('should replace primitive value with object', () => {
      const target = { 
        config: 'enabled' 
      };
      const source = { 
        config: { 
          debug: true, 
          level: 'info' 
        } 
      };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ 
        config: { 
          debug: true, 
          level: 'info' 
        } 
      });
    });

    it('should handle Date objects', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-12-31');
      
      const target = { created: date1 };
      const source = { created: date2 };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({ created: date2 });
    });

    it('should handle complex nested structures', () => {
      const target = {
        api: {
          endpoints: {
            users: { url: '/users', method: 'GET' },
            posts: { url: '/posts', method: 'GET' }
          },
          auth: { token: 'old-token' }
        },
        ui: {
          theme: 'light',
          components: ['header', 'footer']
        }
      };
      
      const source = {
        api: {
          endpoints: {
            users: { method: 'POST' },
            comments: { url: '/comments', method: 'GET' }
          },
          auth: { token: 'new-token', refreshToken: 'refresh' }
        },
        ui: {
          components: ['header', 'sidebar'],
          animations: true
        }
      };
      
      const result = objectUtils.deepMerge(target, source);
      
      expect(result).toEqual({
        api: {
          endpoints: {
            users: { url: '/users', method: 'POST' },
            posts: { url: '/posts', method: 'GET' },
            comments: { url: '/comments', method: 'GET' }
          },
          auth: { token: 'new-token', refreshToken: 'refresh' }
        },
        ui: {
          theme: 'light',
          components: ['header', 'sidebar'],
          animations: true
        }
      });
    });
  });
});