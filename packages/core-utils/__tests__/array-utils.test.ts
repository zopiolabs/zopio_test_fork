/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { arrayUtils } from '../index.js';

describe('arrayUtils', () => {
  describe('groupBy', () => {
    it('should group objects by a string property', () => {
      const users = [
        { id: 1, name: 'John', role: 'admin' },
        { id: 2, name: 'Jane', role: 'user' },
        { id: 3, name: 'Bob', role: 'admin' },
        { id: 4, name: 'Alice', role: 'user' },
      ];
      
      const grouped = arrayUtils.groupBy(users, 'role');
      
      expect(grouped).toEqual({
        admin: [
          { id: 1, name: 'John', role: 'admin' },
          { id: 3, name: 'Bob', role: 'admin' },
        ],
        user: [
          { id: 2, name: 'Jane', role: 'user' },
          { id: 4, name: 'Alice', role: 'user' },
        ],
      });
    });

    it('should group objects by a numeric property', () => {
      const items = [
        { id: 1, score: 85, category: 'A' },
        { id: 2, score: 92, category: 'B' },
        { id: 3, score: 85, category: 'C' },
        { id: 4, score: 78, category: 'A' },
      ];
      
      const grouped = arrayUtils.groupBy(items, 'score');
      
      expect(grouped).toEqual({
        '85': [
          { id: 1, score: 85, category: 'A' },
          { id: 3, score: 85, category: 'C' },
        ],
        '92': [
          { id: 2, score: 92, category: 'B' },
        ],
        '78': [
          { id: 4, score: 78, category: 'A' },
        ],
      });
    });

    it('should group objects by a boolean property', () => {
      const users = [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: false },
        { id: 3, name: 'Bob', active: true },
        { id: 4, name: 'Alice', active: false },
      ];
      
      const grouped = arrayUtils.groupBy(users, 'active');
      
      expect(grouped).toEqual({
        'true': [
          { id: 1, name: 'John', active: true },
          { id: 3, name: 'Bob', active: true },
        ],
        'false': [
          { id: 2, name: 'Jane', active: false },
          { id: 4, name: 'Alice', active: false },
        ],
      });
    });

    it('should handle empty arrays', () => {
      const empty: Array<{ id: number; name: string }> = [];
      
      const grouped = arrayUtils.groupBy(empty, 'id');
      
      expect(grouped).toEqual({});
    });

    it('should handle arrays with one item', () => {
      const single = [{ id: 1, name: 'John', role: 'admin' }];
      
      const grouped = arrayUtils.groupBy(single, 'role');
      
      expect(grouped).toEqual({
        admin: [{ id: 1, name: 'John', role: 'admin' }],
      });
    });

    it('should handle null and undefined values', () => {
      const items = [
        { id: 1, value: 'test', category: null },
        { id: 2, value: 'test2', category: undefined },
        { id: 3, value: 'test3', category: 'valid' },
        { id: 4, value: 'test4', category: null },
      ];
      
      const grouped = arrayUtils.groupBy(items, 'category');
      
      expect(grouped).toEqual({
        'null': [
          { id: 1, value: 'test', category: null },
          { id: 4, value: 'test4', category: null },
        ],
        'undefined': [
          { id: 2, value: 'test2', category: undefined },
        ],
        'valid': [
          { id: 3, value: 'test3', category: 'valid' },
        ],
      });
    });

    it('should handle objects with nested properties', () => {
      const users = [
        { id: 1, profile: { department: 'Engineering' }, name: 'John' },
        { id: 2, profile: { department: 'Sales' }, name: 'Jane' },
        { id: 3, profile: { department: 'Engineering' }, name: 'Bob' },
      ];
      
      // Note: This tests grouping by a top-level key that contains an object
      // The object will be converted to string "[object Object]"
      const grouped = arrayUtils.groupBy(users, 'profile');
      
      expect(Object.keys(grouped)).toEqual(['[object Object]']);
      expect(grouped['[object Object]']).toHaveLength(3);
    });

    it('should handle arrays with mixed data types in the grouping key', () => {
      const items = [
        { id: 1, type: 'string' },
        { id: 2, type: 42 },
        { id: 3, type: 'string' },
        { id: 4, type: 42 },
        { id: 5, type: true },
      ];
      
      const grouped = arrayUtils.groupBy(items, 'type');
      
      expect(grouped).toEqual({
        'string': [
          { id: 1, type: 'string' },
          { id: 3, type: 'string' },
        ],
        '42': [
          { id: 2, type: 42 },
          { id: 4, type: 42 },
        ],
        'true': [
          { id: 5, type: true },
        ],
      });
    });

    it('should handle date objects', () => {
      const events = [
        { id: 1, date: new Date('2023-01-01'), name: 'Event 1' },
        { id: 2, date: new Date('2023-01-02'), name: 'Event 2' },
        { id: 3, date: new Date('2023-01-01'), name: 'Event 3' },
      ];
      
      const grouped = arrayUtils.groupBy(events, 'date');
      
      const keys = Object.keys(grouped);
      expect(keys).toHaveLength(2);
      
      // Dates are converted to ISO strings when used as keys
      expect(grouped[keys[0]]).toHaveLength(2); // Events with same date
      expect(grouped[keys[1]]).toHaveLength(1); // Event with different date
    });

    it('should preserve original objects without mutation', () => {
      const original = [
        { id: 1, name: 'John', role: 'admin' },
        { id: 2, name: 'Jane', role: 'user' },
      ];
      
      const originalCopy = JSON.parse(JSON.stringify(original));
      const grouped = arrayUtils.groupBy(original, 'role');
      
      expect(original).toEqual(originalCopy);
      expect(grouped.admin[0]).toBe(original[0]); // Same reference
      expect(grouped.user[0]).toBe(original[1]); // Same reference
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        category: `category_${i % 10}`, // Creates 10 different categories
        value: Math.random(),
      }));
      
      const start = performance.now();
      const grouped = arrayUtils.groupBy(largeArray, 'category');
      const end = performance.now();
      
      expect(Object.keys(grouped)).toHaveLength(10);
      expect(grouped['category_0']).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should be fast (less than 100ms)
    });

    it('should handle special string values', () => {
      const items = [
        { id: 1, special: '' },
        { id: 2, special: '0' },
        { id: 3, special: 'false' },
        { id: 4, special: '' },
        { id: 5, special: '0' },
      ];
      
      const grouped = arrayUtils.groupBy(items, 'special');
      
      expect(grouped).toEqual({
        '': [
          { id: 1, special: '' },
          { id: 4, special: '' },
        ],
        '0': [
          { id: 2, special: '0' },
          { id: 5, special: '0' },
        ],
        'false': [
          { id: 3, special: 'false' },
        ],
      });
    });

    it('should handle symbol values by converting to string', () => {
      const sym1 = Symbol('test1');
      const sym2 = Symbol('test2');
      const sym3 = Symbol('test1'); // Different symbol with same description
      
      const items = [
        { id: 1, symbol: sym1 },
        { id: 2, symbol: sym2 },
        { id: 3, symbol: sym1 },
        { id: 4, symbol: sym3 },
      ];
      
      const grouped = arrayUtils.groupBy(items, 'symbol');
      
      // Symbols are converted to their string representation
      const keys = Object.keys(grouped);
      expect(keys).toHaveLength(2); // Two different symbol descriptions
      
      // Items with the same symbol reference should be grouped together
      // sym1 and sym3 have the same description, so they group together
      expect(grouped[sym1.toString()]).toHaveLength(3); // sym1 + sym3
      expect(grouped[sym2.toString()]).toHaveLength(1);
    });
  });
});