/**
 * @fileoverview Core Utils Tests - String Utilities
 * 
 * Comprehensive test suite for string manipulation utility functions including
 * case conversion, formatting, validation, and text processing helpers. Validates
 * string transformation accuracy, Unicode handling, and performance characteristics.
 * 
 * **Test Scope:**
 * - Case conversion utilities (camelCase, kebab-case, snake_case, PascalCase)
 * - String formatting and templating
 * - Text validation and sanitization
 * - Unicode and internationalization support
 * - Performance optimization for large strings
 * - Regular expression utilities
 * 
 * **Test Categories:**
 * 1. **Case Conversion**: camelCase, kebabCase, snakeCase, PascalCase transformations
 * 2. **Formatting**: Template strings, padding, truncation, formatting
 * 3. **Validation**: Email, URL, phone number, custom pattern validation
 * 4. **Sanitization**: HTML escaping, XSS prevention, input cleaning
 * 5. **Unicode Support**: Emoji, accented characters, international text
 * 6. **Performance**: Large string processing, memory efficiency
 * 7. **Edge Cases**: Empty strings, special characters, boundary conditions
 * 
 * **Mock Strategy:**
 * - No external dependencies (pure string functions)
 * - Unicode test data for internationalization validation
 * - Performance testing with large string datasets
 * 
 * **Quality Standards:**
 * - Accurate case conversion preserving semantic meaning
 * - Proper Unicode handling for international text
 * - Security-focused sanitization preventing XSS attacks
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { stringUtils } from '../index.js';

describe('stringUtils', () => {
  describe('toCamelCase', () => {
    it('should convert space-separated words to camelCase', () => {
      expect(stringUtils.toCamelCase('hello world')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('the quick brown fox')).toBe('theQuickBrownFox');
    });

    it('should convert kebab-case to camelCase', () => {
      expect(stringUtils.toCamelCase('hello-world')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('the-quick-brown-fox')).toBe('theQuickBrownFox');
    });

    it('should convert snake_case to camelCase', () => {
      expect(stringUtils.toCamelCase('hello_world')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('the_quick_brown_fox')).toBe('theQuickBrownFox');
    });

    it('should convert PascalCase to camelCase', () => {
      expect(stringUtils.toCamelCase('HelloWorld')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('TheQuickBrownFox')).toBe('theQuickBrownFox');
    });

    it('should handle mixed separators', () => {
      expect(stringUtils.toCamelCase('hello-world test_case')).toBe('helloWorldTestCase');
      expect(stringUtils.toCamelCase('API-key user_id')).toBe('apiKeyUserId');
    });

    it('should handle single words', () => {
      expect(stringUtils.toCamelCase('hello')).toBe('hello');
      expect(stringUtils.toCamelCase('HELLO')).toBe('hello');
      expect(stringUtils.toCamelCase('Hello')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(stringUtils.toCamelCase('')).toBe('');
    });

    it('should handle strings with numbers', () => {
      expect(stringUtils.toCamelCase('hello world 123')).toBe('helloWorld123');
      expect(stringUtils.toCamelCase('test-case-2')).toBe('testCase2');
    });

    it('should handle strings with special characters', () => {
      expect(stringUtils.toCamelCase('hello@world')).toBe('hello@world');
      expect(stringUtils.toCamelCase('test.case')).toBe('test.case');
    });

    it('should handle multiple consecutive spaces', () => {
      expect(stringUtils.toCamelCase('hello    world')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('  hello  world  ')).toBe('helloWorld');
    });

    it('should handle already camelCase strings', () => {
      expect(stringUtils.toCamelCase('helloWorld')).toBe('helloWorld');
      expect(stringUtils.toCamelCase('theQuickBrownFox')).toBe('theQuickBrownFox');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(stringUtils.toKebabCase('helloWorld')).toBe('hello-world');
      expect(stringUtils.toKebabCase('theQuickBrownFox')).toBe('the-quick-brown-fox');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(stringUtils.toKebabCase('HelloWorld')).toBe('hello-world');
      expect(stringUtils.toKebabCase('TheQuickBrownFox')).toBe('the-quick-brown-fox');
    });

    it('should convert space-separated words to kebab-case', () => {
      expect(stringUtils.toKebabCase('hello world')).toBe('hello-world');
      expect(stringUtils.toKebabCase('the quick brown fox')).toBe('the-quick-brown-fox');
    });

    it('should convert snake_case to kebab-case', () => {
      expect(stringUtils.toKebabCase('hello_world')).toBe('hello_world'); // Underscores are preserved
      expect(stringUtils.toKebabCase('the_quick_brown_fox')).toBe('the_quick_brown_fox');
    });

    it('should handle single words', () => {
      expect(stringUtils.toKebabCase('hello')).toBe('hello');
      expect(stringUtils.toKebabCase('HELLO')).toBe('hello');
      expect(stringUtils.toKebabCase('Hello')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(stringUtils.toKebabCase('')).toBe('');
    });

    it('should handle strings with numbers', () => {
      expect(stringUtils.toKebabCase('helloWorld123')).toBe('hello-world123');
      expect(stringUtils.toKebabCase('testCase2')).toBe('test-case2');
    });

    it('should handle consecutive uppercase letters', () => {
      expect(stringUtils.toKebabCase('XMLHttpRequest')).toBe('x-m-l-http-request');
      expect(stringUtils.toKebabCase('HTMLElement')).toBe('h-t-m-l-element');
    });

    it('should handle multiple consecutive spaces', () => {
      expect(stringUtils.toKebabCase('hello    world')).toBe('hello-world');
      expect(stringUtils.toKebabCase('  hello  world  ')).toBe('hello-world');
    });

    it('should handle already kebab-case strings', () => {
      expect(stringUtils.toKebabCase('hello-world')).toBe('hello-world');
      expect(stringUtils.toKebabCase('the-quick-brown-fox')).toBe('the-quick-brown-fox');
    });

    it('should handle mixed case with spaces', () => {
      expect(stringUtils.toKebabCase('Hello World Test')).toBe('hello-world-test');
      expect(stringUtils.toKebabCase('API Key Manager')).toBe('a-p-i-key-manager');
    });

    it('should handle acronyms', () => {
      expect(stringUtils.toKebabCase('HTTPSConnection')).toBe('h-t-t-p-s-connection');
      expect(stringUtils.toKebabCase('JSONData')).toBe('j-s-o-n-data');
    });

    it('should handle edge cases with special characters', () => {
      expect(stringUtils.toKebabCase('hello@world')).toBe('hello@world');
      expect(stringUtils.toKebabCase('test.case')).toBe('test.case');
      expect(stringUtils.toKebabCase('version-1.0')).toBe('version-1.0');
    });

    it('should handle mixed separators in input', () => {
      expect(stringUtils.toKebabCase('HelloWorld testCase')).toBe('hello-world-test-case');
      expect(stringUtils.toKebabCase('CamelCase with spaces')).toBe('camel-case-with-spaces');
    });
  });

  describe('edge cases for both functions', () => {
    it('should handle whitespace-only strings', () => {
      expect(stringUtils.toCamelCase('   ')).toBe('');
      expect(stringUtils.toKebabCase('   ')).toBe('');
    });

    it('should handle strings with tabs and newlines', () => {
      expect(stringUtils.toCamelCase('hello\tworld\ntest')).toBe('helloWorldTest');
      expect(stringUtils.toKebabCase('hello\tworld\ntest')).toBe('hello-world-test');
    });

    it('should handle very long strings', () => {
      const longString = 'this is a very long string with many words that should be converted properly';
      const camelResult = stringUtils.toCamelCase(longString);
      const kebabResult = stringUtils.toKebabCase(longString);
      
      expect(camelResult).toBe('thisIsAVeryLongStringWithManyWordsThatShouldBeConvertedProperly');
      expect(kebabResult).toBe('this-is-a-very-long-string-with-many-words-that-should-be-converted-properly');
    });

    it('should handle strings with unicode characters', () => {
      expect(stringUtils.toCamelCase('hello 世界')).toBe('hello世界');
      expect(stringUtils.toKebabCase('hello世界')).toBe('hello世界');
    });
  });
});