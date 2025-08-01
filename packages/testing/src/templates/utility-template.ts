/**
 * SPDX-License-Identifier: MIT
 */

import type { TestTemplate, UtilityTestOptions } from './types.js';

// Helper functions to generate test sections
function generateImports(
  functionName: string,
  functionPath: string,
  isAsync: boolean
): string {
  return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${functionName} } from '${functionPath}';

${
  isAsync
    ? `// Mock external dependencies for async operations
const mockExternalService = vi.fn();
vi.mock('../lib/external-service.js', () => ({
  externalService: mockExternalService,
}));`
    : ''
}`;
}

function generateSetup(isAsync: boolean): string {
  if (!isAsync) {
    return '';
  }
  return `beforeEach(() => {
    vi.clearAllMocks();
    mockExternalService.mockResolvedValue({ success: true });
  });`;
}

function generateBasicTests(functionName: string, isAsync: boolean): string {
  return `describe('Basic Functionality', () => {
    it('should return expected result for valid input', ${isAsync ? 'async ' : ''}() => {
      const input = 'valid input';
      const expectedOutput = 'expected output';
      
      ${isAsync ? 'const result = await ' : 'const result = '}${functionName}(input);
      
      expect(result).toBe(expectedOutput);
    });

    it('should handle typical use cases', ${isAsync ? 'async ' : ''}() => {
      const testCases = [
        { input: 'case1', expected: 'result1' },
        { input: 'case2', expected: 'result2' },
        { input: 'case3', expected: 'result3' },
      ];

      for (const testCase of testCases) {
        ${isAsync ? 'const result = await ' : 'const result = '}${functionName}(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });
  });`;
}

function generateValidationTests(
  functionName: string,
  isAsync: boolean,
  hasValidation: boolean
): string {
  if (!hasValidation) {
    return '';
  }
  return `describe('Input Validation', () => {
    it('should validate required parameters', ${isAsync ? 'async ' : ''}() => {
      ${isAsync ? 'await expect(' : 'expect('}${functionName}${isAsync ? '(null)' : '(null)'}${isAsync ? ')' : ''}.toThrow('Input is required');
    });

    it('should validate parameter types', ${isAsync ? 'async ' : ''}() => {
      ${isAsync ? 'await expect(' : 'expect('}${functionName}${isAsync ? '(123 as any)' : '(123 as any)'}${isAsync ? ')' : ''}.toThrow('Invalid input type');
    });

    it('should validate parameter ranges/constraints', ${isAsync ? 'async ' : ''}() => {
      ${isAsync ? 'await expect(' : 'expect('}${functionName}${isAsync ? '("")' : '("")'}${isAsync ? ')' : ''}.toThrow('Input cannot be empty');
    });
  });`;
}

function generateErrorHandlingTests(
  functionName: string,
  isAsync: boolean,
  hasErrorHandling: boolean
): string {
  if (!hasErrorHandling) {
    return '';
  }

  if (isAsync) {
    return `describe('Error Handling', () => {
    it('should handle external service failures', async () => {
      mockExternalService.mockRejectedValue(new Error('Service unavailable'));
      
      await expect(${functionName}('input')).rejects.toThrow('Service unavailable');
    });

    it('should handle timeout scenarios', async () => {
      mockExternalService.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1000)
        )
      );
      
      await expect(${functionName}('input')).rejects.toThrow('Timeout');
    });
  });`;
  }

  return `describe('Error Handling', () => {
    it('should handle invalid input gracefully', () => {
      expect(() => ${functionName}(null as any)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        ${functionName}(null as any);
      } catch (error) {
        expect(error.message).toContain('meaningful error description');
      }
    });
  });`;
}

function generateEdgeCaseTests(functionName: string, isAsync: boolean): string {
  return `describe('Edge Cases', () => {
    it('should handle empty input', ${isAsync ? 'async ' : ''}() => {
      ${isAsync ? 'const result = await ' : 'const result = '}${functionName}('');
      expect(result).toBeDefined();
    });

    it('should handle very large input', ${isAsync ? 'async ' : ''}() => {
      const largeInput = 'x'.repeat(10000);
      ${isAsync ? 'const result = await ' : 'const result = '}${functionName}(largeInput);
      expect(result).toBeDefined();
    });

    it('should handle special characters', ${isAsync ? 'async ' : ''}() => {
      const specialInput = '!@#$%^&*()';
      ${isAsync ? 'const result = await ' : 'const result = '}${functionName}(specialInput);
      expect(result).toBeDefined();
    });

    it('should handle unicode characters', ${isAsync ? 'async ' : ''}() => {
      const unicodeInput = '🚀 测试 ñ';
      ${isAsync ? 'const result = await ' : 'const result = '}${functionName}(unicodeInput);
      expect(result).toBeDefined();
    });
  });`;
}

function generatePerformanceTests(
  functionName: string,
  isAsync: boolean,
  testPerformance: boolean
): string {
  if (!testPerformance) {
    return '';
  }
  return `describe('Performance', () => {
    it('should execute within acceptable time limits', ${isAsync ? 'async ' : ''}() => {
      const start = performance.now();
      ${isAsync ? 'await ' : ''}${functionName}('performance test input');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // 100ms threshold
    });

    it('should handle multiple concurrent calls', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        ${isAsync ? '' : 'Promise.resolve('}${functionName}(\`concurrent-\${i}\`)${isAsync ? '' : ')'}
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(result => result !== null)).toBe(true);
    });
  });`;
}

function generateTypeSafetyTests(
  functionName: string,
  isAsync: boolean
): string {
  return `describe('Type Safety', () => {
    it('should maintain type safety', ${isAsync ? 'async ' : ''}() => {
      ${isAsync ? 'const result = await ' : 'const result = '}${functionName}('typed input');
      
      // TypeScript should enforce correct return type
      expect(typeof result).toBe('string'); // Adjust based on actual return type
    });
  });`;
}

function generateAsyncTests(functionName: string, isAsync: boolean): string {
  if (!isAsync) {
    return '';
  }
  return `describe('Async Behavior', () => {
    it('should resolve promises correctly', async () => {
      const result = await ${functionName}('async input');
      expect(result).toBeDefined();
    });

    it('should handle promise rejection', async () => {
      mockExternalService.mockRejectedValue(new Error('Async error'));
      
      await expect(${functionName}('failing input')).rejects.toThrow('Async error');
    });

    it('should handle promise timeout', async () => {
      mockExternalService.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );
      
      // Should timeout or handle long-running operations appropriately
      await expect(${functionName}('slow input')).resolves.toBeDefined();
    }, 6000);
  });`;
}

/**
 * Template for utility function tests
 */
export const utilityTestTemplate: TestTemplate = {
  name: 'Utility Function Test',
  description:
    'Template for testing utility functions with comprehensive edge cases',

  generate: (options: UtilityTestOptions) => {
    const {
      functionName,
      functionPath,
      isAsync = false,
      hasValidation = true,
      hasErrorHandling = true,
      testPerformance = false,
    } = options;

    // Generate test sections
    const imports = generateImports(functionName, functionPath, isAsync);
    const setup = generateSetup(isAsync);
    const basicTests = generateBasicTests(functionName, isAsync);
    const validationTests = generateValidationTests(
      functionName,
      isAsync,
      hasValidation
    );
    const errorHandlingTests = generateErrorHandlingTests(
      functionName,
      isAsync,
      hasErrorHandling
    );
    const edgeCaseTests = generateEdgeCaseTests(functionName, isAsync);
    const performanceTests = generatePerformanceTests(
      functionName,
      isAsync,
      testPerformance
    );
    const typeSafetyTests = generateTypeSafetyTests(functionName, isAsync);
    const asyncTests = generateAsyncTests(functionName, isAsync);

    // Combine all sections
    const sections = [
      imports,
      '',
      `describe('${functionName}', () => {`,
      setup ? `  ${setup}\n` : '',
      `  ${basicTests}`,
      validationTests ? `\n\n  ${validationTests}` : '',
      errorHandlingTests ? `\n\n  ${errorHandlingTests}` : '',
      `\n\n  ${edgeCaseTests}`,
      performanceTests ? `\n\n  ${performanceTests}` : '',
      `\n\n  ${typeSafetyTests}`,
      asyncTests ? `\n\n  ${asyncTests}` : '',
      '});',
    ];

    return sections.filter((section) => section !== '').join('\n');
  },
};
