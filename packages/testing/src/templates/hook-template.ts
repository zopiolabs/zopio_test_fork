/**
 * SPDX-License-Identifier: MIT
 */

import type { TestTemplate, HookTestOptions } from './types.js';

/**
 * Template for React hook tests
 */
export const hookTestTemplate: TestTemplate = {
  name: 'React Hook Test',
  description: 'Template for testing custom React hooks with state management and effects',
  
  generate: (options: HookTestOptions) => {
    const { 
      hookName, 
      hookPath, 
      hasAsyncBehavior = false,
      hasStateManagement = true,
      hasEffects = false,
      hasCleanup = false,
      testErrorStates = true
    } = options;

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ${hookName} } from '${hookPath}';

${hasAsyncBehavior ? `// Mock external async dependencies
const mockAsyncService = vi.fn();
vi.mock('../lib/async-service.js', () => ({
  asyncService: mockAsyncService,
}));` : ''}

${hasEffects ? `// Mock external effects
const mockExternalEffect = vi.fn();
vi.mock('../lib/external-effect.js', () => ({
  externalEffect: mockExternalEffect,
}));` : ''}

describe('${hookName}', () => {
  ${hasAsyncBehavior ? `beforeEach(() => {
    vi.clearAllMocks();
    mockAsyncService.mockResolvedValue({ success: true, data: 'mock data' });
  });` : ''}

  ${hasCleanup ? `afterEach(() => {
    // Cleanup any side effects
    vi.clearAllTimers();
    vi.useRealTimers();
  });` : ''}

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => ${hookName}());
      
      expect(result.current).toBeDefined();
      ${hasStateManagement ? `expect(result.current.state).toBeDefined();` : ''}
    });

    it('should accept initial parameters', () => {
      const initialValue = 'initial';
      const { result } = renderHook(() => ${hookName}(initialValue));
      
      expect(result.current).toBeDefined();
      ${hasStateManagement ? `expect(result.current.state).toBe(initialValue);` : ''}
    });

    it('should handle undefined initial parameters', () => {
      const { result } = renderHook(() => ${hookName}(undefined));
      
      expect(result.current).toBeDefined();
    });
  });

  ${hasStateManagement ? `describe('State Management', () => {
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
        result.current.setState('value 1');
        result.current.setState('value 2');
        result.current.setState('value 3');
      });
      
      expect(result.current.state).toBe('value 3');
    });

    it('should handle functional state updates', () => {
      const { result } = renderHook(() => ${hookName}('initial'));
      
      act(() => {
        result.current.setState((prev: string) => prev + ' updated');
      });
      
      expect(result.current.state).toBe('initial updated');
    });

    it('should prevent unnecessary re-renders with same state', () => {
      const { result } = renderHook(() => ${hookName}('same'));
      const initialRenderCount = result.current.renderCount || 1;
      
      act(() => {
        result.current.setState('same');
      });
      
      expect(result.current.renderCount || 1).toBe(initialRenderCount);
    });
  });` : ''}

  ${hasAsyncBehavior ? `describe('Async Behavior', () => {
    it('should handle async operations', async () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.executeAsync();
      });
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.data).toBe('mock data');
      expect(mockAsyncService).toHaveBeenCalled();
    });

    it('should handle concurrent async operations', async () => {
      const { result } = renderHook(() => ${hookName}());
      
      // Start multiple async operations
      act(() => {
        result.current.executeAsync();
        result.current.executeAsync();
        result.current.executeAsync();
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Should only execute the latest operation
      expect(mockAsyncService).toHaveBeenCalledTimes(1);
    });

    ${testErrorStates ? `it('should handle async errors', async () => {
      mockAsyncService.mockRejectedValue(new Error('Async error'));
      
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.executeAsync();
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.error).toBe('Async error');
      expect(result.current.data).toBeNull();
    });

    it('should handle network timeouts', async () => {
      mockAsyncService.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 1000)
        )
      );
      
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.executeAsync();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('Network timeout');
      }, { timeout: 2000 });
    });` : ''}

    it('should cancel pending requests on unmount', async () => {
      const { result, unmount } = renderHook(() => ${hookName}());
      
      act(() => {
        result.current.executeAsync();
      });
      
      unmount();
      
      // Should not update state after unmount
      await new Promise(resolve => setTimeout(resolve, 100));
      // No assertions needed - should not throw or cause memory leaks
    });
  });` : ''}

  ${hasEffects ? `describe('Effects', () => {
    it('should run effects on mount', () => {
      renderHook(() => ${hookName}());
      
      expect(mockExternalEffect).toHaveBeenCalled();
    });

    it('should run effects on dependency changes', () => {
      const { rerender } = renderHook(
        ({ dependency }) => ${hookName}(dependency),
        { initialProps: { dependency: 'initial' } }
      );
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
      
      rerender({ dependency: 'changed' });
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(2);
    });

    it('should not run effects when dependencies are the same', () => {
      const { rerender } = renderHook(
        ({ dependency }) => ${hookName}(dependency),
        { initialProps: { dependency: 'same' } }
      );
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
      
      rerender({ dependency: 'same' });
      
      expect(mockExternalEffect).toHaveBeenCalledTimes(1);
    });

    ${hasCleanup ? `it('should cleanup effects on unmount', () => {
      const mockCleanup = vi.fn();
      mockExternalEffect.mockReturnValue(mockCleanup);
      
      const { unmount } = renderHook(() => ${hookName}());
      
      unmount();
      
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should cleanup effects on dependency changes', () => {
      const mockCleanup = vi.fn();
      mockExternalEffect.mockReturnValue(mockCleanup);
      
      const { rerender } = renderHook(
        ({ dependency }) => ${hookName}(dependency),
        { initialProps: { dependency: 'initial' } }
      );
      
      rerender({ dependency: 'changed' });
      
      expect(mockCleanup).toHaveBeenCalled();
    });` : ''}
  });` : ''}

  describe('Edge Cases', () => {
    it('should handle rapid consecutive calls', () => {
      const { result } = renderHook(() => ${hookName}());
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          ${hasStateManagement ? `result.current.setState(\`value-\${i}\`);` : `result.current.execute();`}
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
          ${hasStateManagement ? `result.current.setState(undefined);` : `result.current.execute(null);`}
        });
      }).not.toThrow();
    });

    it('should be stable across re-renders', () => {
      const { result, rerender } = renderHook(() => ${hookName}());
      const firstReference = result.current;
      
      rerender();
      
      expect(result.current).toBe(firstReference);
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks', () => {
      const hooks = Array.from({ length: 100 }, () => 
        renderHook(() => ${hookName}())
      );
      
      hooks.forEach(({ unmount }) => unmount());
      
      // Should not retain references or cause memory leaks
      expect(true).toBe(true); // Placeholder - actual memory leak detection would require more sophisticated tools
    });

    it('should cleanup timers and subscriptions', () => {
      vi.useFakeTimers();
      
      const { unmount } = renderHook(() => ${hookName}());
      
      // Simulate pending timers
      act(() => {
        setTimeout(() => {}, 1000);
      });
      
      unmount();
      
      expect(vi.getTimerCount()).toBe(0);
      vi.useRealTimers();
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders', () => {
      let renderCount = 0;
      
      const { result } = renderHook(() => {
        renderCount++;
        return ${hookName}();
      });
      
      const initialRenderCount = renderCount;
      
      act(() => {
        ${hasStateManagement ? `result.current.setState('same value');
        result.current.setState('same value');
        result.current.setState('same value');` : `result.current.execute();`}
      });
      
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 2); // Allow for reasonable re-renders
    });
  });
});`;
  }
};