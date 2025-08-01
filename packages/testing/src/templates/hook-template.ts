/**
 * SPDX-License-Identifier: MIT
 */

import type { HookTestOptions, TestTemplate } from './types.js';

// Helper functions to reduce complexity
function generateMockImports(options: HookTestOptions): string {
  const imports: string[] = [];

  if (options.hasAsyncBehavior) {
    imports.push(`// Mock external async dependencies
const mockAsyncService = vi.fn();
vi.mock('../lib/async-service.js', () => ({
  asyncService: mockAsyncService,
}));`);
  }

  if (options.hasEffects) {
    imports.push(`// Mock external effects
const mockExternalEffect = vi.fn();
vi.mock('../lib/external-effect.js', () => ({
  externalEffect: mockExternalEffect,
}));`);
  }

  return imports.join('\n\n');
}

function generateStateManagementTests(hookName: string): string {
  return `describe('State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => ${hookName}());
      
      expect(result.current.state).toBeDefined();
      expect(result.current.setState).toBeInstanceOf(Function);
    });

    it('should update state correctly', () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.setState('new value');
      });
      
      expect(result.current.state).toBe('new value');
    });

    it('should handle multiple state updates', () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.setState('first');
        result.current.setState('second');
        result.current.setState('third');
      });
      
      expect(result.current.state).toBe('third');
    });
  });`;
}

function generateAsyncBehaviorTests(hookName: string): string {
  return `describe('Async Behavior', () => {
    it('should handle async operations', async () => {
      mockAsyncService.mockResolvedValue({ data: 'async result' });
      
      const { result } = renderHook(() => ${hookName}());
      
      expect(result.current.loading).toBe(false);
      
      act(() => {
        result.current.fetchData();
      });
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual({ data: 'async result' });
      });
    });

    it('should handle async errors', async () => {
      const error = new Error('Async operation failed');
      mockAsyncService.mockRejectedValue(error);
      
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.fetchData();
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(error);
      });
    });

    it('should abort pending operations on unmount', async () => {
      mockAsyncService.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      const { result, unmount } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.fetchData();
      });
      
      expect(result.current.loading).toBe(true);
      
      unmount();
      
      // Should not throw or cause warnings
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    });
  });`;
}

function generateEffectsTests(hookName: string): string {
  return `describe('Side Effects', () => {
    it('should run effects on mount', () => {
      renderHook(() => ${hookName}());
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
    });

    it('should run effects when dependencies change', () => {
      const { rerender } = renderHook(
        ({ prop }) => ${hookName}(prop),
        { initialProps: { prop: 'initial' } }
      );
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
      
      rerender({ prop: 'updated' });
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(2);
    });

    it('should not run effects when dependencies are unchanged', () => {
      const { rerender } = renderHook(
        ({ prop }) => ${hookName}(prop),
        { initialProps: { prop: 'initial' } }
      );
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
      
      rerender({ prop: 'initial' });
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
    });
  });`;
}

function generateCleanupTests(hookName: string): string {
  return `describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const cleanupFn = vi.fn();
      mockExternalEffect.mockReturnValue(cleanupFn);
      
      const { unmount } = renderHook(() => ${hookName}());
      
      expect(cleanupFn).not.toHaveBeenCalled();
      
      unmount();
      
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });

    it('should cleanup before running new effects', () => {
      const cleanupFn = vi.fn();
      mockExternalEffect.mockReturnValue(cleanupFn);
      
      const { rerender } = renderHook(
        ({ prop }) => ${hookName}(prop),
        { initialProps: { prop: 'initial' } }
      );
      
      rerender({ prop: 'updated' });
      
      expect(cleanupFn).toHaveBeenCalledTimes(1);
      expect(mockExternalEffect).toHaveBeenCalledTimes(2);
    });
  });`;
}

function generateErrorStateTests(
  hookName: string,
  hasStateManagement: boolean
): string {
  return `describe('Error States', () => {
    it('should handle errors gracefully', () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        ${hasStateManagement ? 'result.current.setState(null);' : 'result.current.triggerError();'}
      });
      
      expect(result.current.error).toBeDefined();
    });

    it('should recover from errors', () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        ${hasStateManagement ? 'result.current.setState(null);' : 'result.current.triggerError();'}
      });
      
      expect(result.current.error).toBeDefined();
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.error).toBeNull();
    });

    it('should provide error boundaries', () => {
      const onError = vi.fn();
      
      const { result } = renderHook(() => ${hookName}({ onError }));
      
      act(() => {
        ${hasStateManagement ? 'result.current.setState(null);' : 'result.current.triggerError();'}
      });
      
      expect(onError).toHaveBeenCalled();
    });
  });`;
}

function generateEdgeCasesTests(
  hookName: string,
  hasStateManagement: boolean
): string {
  return `describe('Edge Cases', () => {
    it('should handle rapid consecutive calls', () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          ${hasStateManagement ? 'result.current.setState(`value-$\\{i}`);' : 'result.current.execute();'}
        }
      });
      
      // Should handle all calls without crashing
      expect(result.current).toBeDefined();
    });

    it('should handle null/undefined parameters', () => {
      const { result } = renderHook(() => ${hookName}(null));
      
      expect(result.current).toBeDefined();
      expect(() => {
        act(() => {
          ${hasStateManagement ? 'result.current.setState(undefined);' : 'result.current.execute();'}
        });
      }).not.toThrow();
    });

    it('should handle component re-renders efficiently', () => {
      const { result, rerender } = renderHook(() => ${hookName}());
      
      const initialReference = result.current;
      
      rerender();
      
      // Stable references should be maintained
      expect(result.current.setState).toBe(initialReference.setState);
    });
  });`;
}

function generatePerformanceTests(hookName: string): string {
  return `describe('Performance', () => {
    it('should memoize expensive computations', () => {
      const expensiveComputation = vi.fn();
      
      const { result, rerender } = renderHook(
        ({ value }) => ${hookName}({ value, compute: expensiveComputation }),
        { initialProps: { value: 1 } }
      );
      
      expect(expensiveComputation).toHaveBeenCalledTimes(1);
      
      // Same value, should not recompute
      rerender({ value: 1 });
      expect(expensiveComputation).toHaveBeenCalledTimes(1);
      
      // Different value, should recompute
      rerender({ value: 2 });
      expect(expensiveComputation).toHaveBeenCalledTimes(2);
    });

    it('should batch state updates', () => {
      const { result } = renderHook(() => ${hookName}());
      
      let renderCount = 0;
      result.current.onRender = () => renderCount++;
      
      act(() => {
        // Multiple updates should be batched
        result.current.setState('first');
        result.current.setState('second');
        result.current.setState('third');
      });
      
      // Should only render once despite multiple updates
      expect(renderCount).toBe(1);
    });
  });`;
}

function generateBeforeEach(options: HookTestOptions): string {
  const setup: string[] = ['vi.clearAllMocks();'];

  if (options.hasAsyncBehavior) {
    setup.push('mockAsyncService.mockReset();');
  }

  if (options.hasEffects) {
    setup.push('mockExternalEffect.mockReset();');
  }

  return setup.join('\n    ');
}

/**
 * Template for React hook tests
 */
export const hookTestTemplate: TestTemplate = {
  name: 'React Hook Test',
  description:
    'Template for testing custom React hooks with state management and effects',

  generate: (options: HookTestOptions) => {
    const {
      hookName,
      hookPath,
      hasAsyncBehavior = false,
      hasStateManagement = true,
      hasEffects = false,
      hasCleanup = false,
      testErrorStates = true,
    } = options;

    const testSections: string[] = [];

    if (hasStateManagement) {
      testSections.push(generateStateManagementTests(hookName));
    }

    if (hasAsyncBehavior) {
      testSections.push(generateAsyncBehaviorTests(hookName));
    }

    if (hasEffects) {
      testSections.push(generateEffectsTests(hookName));
    }

    if (hasCleanup) {
      testSections.push(generateCleanupTests(hookName));
    }

    if (testErrorStates) {
      testSections.push(generateErrorStateTests(hookName, hasStateManagement));
    }

    testSections.push(generateEdgeCasesTests(hookName, hasStateManagement));
    testSections.push(generatePerformanceTests(hookName));

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ${hookName} } from '${hookPath}';

${generateMockImports(options)}

describe('${hookName}', () => {
  beforeEach(() => {
    ${generateBeforeEach(options)}
  });

  ${
    hasCleanup
      ? `afterEach(() => {
    vi.restoreAllMocks();
  });`
      : ''
  }

  ${testSections.join('\n\n  ')}

  describe('TypeScript Support', () => {
    it('should have proper TypeScript types', () => {
      const { result } = renderHook(() => ${hookName}());
      
      // This test ensures TypeScript compilation works correctly
      // The actual type checking happens at compile time
      expect(result.current).toBeDefined();
    });
  });
});
`;
  },
};
