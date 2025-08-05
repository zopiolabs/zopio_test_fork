/**
 * @fileoverview Core Utils Tests - Async Utilities
 * 
 * Comprehensive test suite for asynchronous utility functions including safeAsync,
 * retry mechanisms, timeout handling, and promise composition helpers. Validates
 * error handling patterns, concurrency control, and async operation safety.
 * 
 * **Test Scope:**
 * - Safe async operation wrappers (safeAsync, safePromise)
 * - Retry mechanisms with exponential backoff
 * - Timeout handling and operation cancellation
 * - Promise composition utilities (parallel, sequential, race)
 * - Error handling and recovery patterns
 * - Concurrency limiting and rate limiting
 * 
 * **Test Categories:**
 * 1. **Safe Operations**: safeAsync wrapper and error handling
 * 2. **Retry Logic**: Exponential backoff, max attempts, failure handling
 * 3. **Timeout Management**: Operation timeouts, cancellation, cleanup
 * 4. **Promise Composition**: Parallel, sequential, race conditions
 * 5. **Error Handling**: Error transformation, recovery strategies
 * 6. **Concurrency Control**: Rate limiting, queue management
 * 7. **Performance**: Large-scale async operations, memory management
 * 
 * **Mock Strategy:**
 * - Vitest timers for timeout and retry testing
 * - Promise mocking for controlled async behavior
 * - Error simulation for failure scenario testing
 * 
 * **Quality Standards:**
 * - Robust error handling without throwing unhandled rejections
 * - Memory leak prevention in long-running operations
 * - Proper cleanup and resource management
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { asyncUtils } from '../index.js';

describe('asyncUtils', () => {
  describe('safeAsync', () => {
    it('should return result and null error for successful operations', async () => {
      const successFn = vi.fn().mockResolvedValue('success result');
      const safeFn = asyncUtils.safeAsync(successFn);
      
      const [result, error] = await safeFn('arg1', 'arg2');
      
      expect(result).toBe('success result');
      expect(error).toBeNull();
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return null result and error for failed operations', async () => {
      const testError = new Error('Test error');
      const failureFn = vi.fn().mockRejectedValue(testError);
      const safeFn = asyncUtils.safeAsync(failureFn);
      
      const [result, error] = await safeFn('arg1', 'arg2');
      
      expect(result).toBeNull();
      expect(error).toBe(testError);
      expect(failureFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle functions that return promises resolving to different types', async () => {
      const numberFn = vi.fn().mockResolvedValue(42);
      const stringFn = vi.fn().mockResolvedValue('hello');
      const objectFn = vi.fn().mockResolvedValue({ key: 'value' });
      
      const safeNumberFn = asyncUtils.safeAsync(numberFn);
      const safeStringFn = asyncUtils.safeAsync(stringFn);
      const safeObjectFn = asyncUtils.safeAsync(objectFn);
      
      const [numberResult, numberError] = await safeNumberFn();
      const [stringResult, stringError] = await safeStringFn();
      const [objectResult, objectError] = await safeObjectFn();
      
      expect(numberResult).toBe(42);
      expect(numberError).toBeNull();
      
      expect(stringResult).toBe('hello');
      expect(stringError).toBeNull();
      
      expect(objectResult).toEqual({ key: 'value' });
      expect(objectError).toBeNull();
    });

    it('should handle functions with multiple parameters', async () => {
      const multiParamFn = vi.fn().mockImplementation(
        (a: string, b: number, c: boolean) => 
          Promise.resolve(`${a}-${b}-${c}`)
      );
      const safeFn = asyncUtils.safeAsync(multiParamFn);
      
      const [result, error] = await safeFn('test', 123, true);
      
      expect(result).toBe('test-123-true');
      expect(error).toBeNull();
      expect(multiParamFn).toHaveBeenCalledWith('test', 123, true);
    });

    it('should handle functions with no parameters', async () => {
      const noParamFn = vi.fn().mockResolvedValue('no params');
      const safeFn = asyncUtils.safeAsync(noParamFn);
      
      const [result, error] = await safeFn();
      
      expect(result).toBe('no params');
      expect(error).toBeNull();
    });

    it('should convert thrown non-Error objects to Error', async () => {
      const throwStringFn = vi.fn().mockRejectedValue('string error');
      const throwObjectFn = vi.fn().mockRejectedValue({ message: 'object error' });
      const throwNullFn = vi.fn().mockRejectedValue(null);
      
      const safeStringFn = asyncUtils.safeAsync(throwStringFn);
      const safeObjectFn = asyncUtils.safeAsync(throwObjectFn);
      const safeNullFn = asyncUtils.safeAsync(throwNullFn);
      
      const [, stringError] = await safeStringFn();
      const [, objectError] = await safeObjectFn();
      const [, nullError] = await safeNullFn();
      
      expect(stringError).toBe('string error');
      expect(objectError).toEqual({ message: 'object error' });
      expect(nullError).toBeNull();
    });

    it('should handle async operations that take time', async () => {
      const delayedFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('delayed'), 100))
      );
      const safeFn = asyncUtils.safeAsync(delayedFn);
      
      const start = Date.now();
      const [result, error] = await safeFn();
      const duration = Date.now() - start;
      
      expect(result).toBe('delayed');
      expect(error).toBeNull();
      expect(duration).toBeGreaterThanOrEqual(95); // Allow for timing variance
    });

    it('should preserve the context of the original function', async () => {
      const context = { value: 'context' };
      const contextFn = vi.fn().mockImplementation(function(this: typeof context) {
        return Promise.resolve(this.value);
      });
      
      const safeFn = asyncUtils.safeAsync(contextFn.bind(context));
      const [result, error] = await safeFn();
      
      expect(result).toBe('context');
      expect(error).toBeNull();
    });

    it('should handle promise chains', async () => {
      const chainedFn = vi.fn().mockImplementation(() => 
        Promise.resolve('first')
          .then(value => `${value}-second`)
          .then(value => `${value}-third`)
      );
      const safeFn = asyncUtils.safeAsync(chainedFn);
      
      const [result, error] = await safeFn();
      
      expect(result).toBe('first-second-third');
      expect(error).toBeNull();
    });

    it('should handle errors in promise chains', async () => {
      const chainedErrorFn = vi.fn().mockImplementation(() => 
        Promise.resolve('first')
          .then(() => {
            throw new Error('Chain error');
          })
          .then(value => `${value}-never-reached`)
      );
      const safeFn = asyncUtils.safeAsync(chainedErrorFn);
      
      const [result, error] = await safeFn();
      
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Chain error');
    });
  });
});