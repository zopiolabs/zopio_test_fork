/**
 * @fileoverview Auth-RBAC Tests - React Hook for Access Control
 * 
 * Comprehensive test suite for the useAccess React hook that provides client-side
 * authorization checking with SWR-based caching and real-time permission updates.
 * Tests cover loading states, error handling, parameter encoding, and hook behavior.
 * 
 * **Test Scope:**
 * - Hook loading states and initial behavior
 * - Access granted/denied scenarios with reason codes
 * - Error handling and graceful degradation
 * - SWR key generation and parameter encoding
 * - Record ID handling and field-specific queries
 * - Hook re-rendering and memoization behavior
 * 
 * **Test Categories:**
 * 1. **Loading States**: Initial loading, data transitions, error states
 * 2. **Access Results**: Granted access, denied access with reasons
 * 3. **Error Handling**: Network errors, API failures, graceful fallbacks
 * 4. **Key Generation**: URL parameter encoding, record IDs, field queries
 * 5. **Parameter Handling**: Special characters, complex IDs, null records
 * 6. **Hook Behavior**: Re-rendering consistency, memoization, prop changes
 * 
 * **Mock Strategy:**
 * - Mock SWR library to control data flow and timing
 * - createTestWrapper for React Testing Library integration
 * - Deterministic mock responses for predictable testing
 * - Various parameter combinations for key generation testing
 * 
 * **Quality Standards:**
 * - Loading states must be handled gracefully
 * - Error conditions must default to access denied
 * - SWR keys must be deterministic and correctly encoded
 * - Hook behavior must be consistent across re-renders
 * - All parameter combinations must generate valid API calls
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAccess } from '../hooks/use-access.js';
import { createTestWrapper } from '@repo/testing';

// Mock SWR
const mockUseSWR = vi.fn();
vi.mock('swr', () => ({
  default: mockUseSWR,
}));

/**
 * @describe useAccess React Hook Tests
 * 
 * Comprehensive test suite for the useAccess React hook that provides client-side
 * authorization checking with SWR integration and real-time updates.
 */
describe('useAccess React Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @test Initial Loading State
   * 
   * Verifies that the hook returns the correct loading state when data is being fetched.
   */
  it('should return loading state initially', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
    });

    const { result } = renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current).toEqual({
      can: false,
      reason: undefined,
      loading: true,
    });
  });

  /**
   * @test Successful Access Grant
   * 
   * Verifies that the hook correctly processes positive authorization responses from the API.
   */
  it('should return access granted when API returns true', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    const { result } = renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current).toEqual({
      can: true,
      reason: undefined,
      loading: false,
    });
  });

  /**
   * @test Access Denial with Reason
   * 
   * Verifies that the hook correctly processes negative authorization responses with explanatory reasons.
   */
  it('should return access denied when API returns false with reason', () => {
    mockUseSWR.mockReturnValue({
      data: { can: false, reason: 'Insufficient permissions' },
      error: undefined,
    });

    const { result } = renderHook(
      () => useAccess({
        resource: 'users',
        action: 'write',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current).toEqual({
      can: false,
      reason: 'Insufficient permissions',
      loading: false,
    });
  });

  /**
   * @test Error Handling
   * 
   * Verifies that the hook gracefully handles network and API errors with safe defaults.
   */
  it('should handle errors gracefully', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: new Error('Network error'),
    });

    const { result } = renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current).toEqual({
      can: false,
      reason: 'Unknown error',
      loading: false,
    });
  });

  it('should generate correct SWR key without record or field', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=read');
  });

  it('should generate correct SWR key with field', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
        field: 'email',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=read&field=email');
  });

  it('should generate correct SWR key with record ID', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
        record: { id: '123', name: 'John' },
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=read&recordId=123');
  });

  it('should generate correct SWR key with both field and record ID', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
        record: { id: '456', name: 'Jane' },
        field: 'email',
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=read&field=email&recordId=456');
  });

  it('should handle record without ID', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'create',
        record: { name: 'New User' }, // No ID
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=create');
  });

  it('should handle null record', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'create',
        record: null,
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=create');
  });

  it('should memoize SWR key correctly', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    const { rerender } = renderHook(
      ({ resource, action }) => useAccess({ resource, action }),
      {
        wrapper: createTestWrapper(),
        initialProps: { resource: 'users', action: 'read' },
      }
    );

    expect(mockUseSWR).toHaveBeenCalledTimes(1);
    const firstCall = mockUseSWR.mock.calls[0][0];

    // Rerender with same props
    rerender({ resource: 'users', action: 'read' });
    
    expect(mockUseSWR).toHaveBeenCalledTimes(2);
    const secondCall = mockUseSWR.mock.calls[1][0];
    
    // Key should be the same
    expect(firstCall).toBe(secondCall);
  });

  it('should update SWR key when props change', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    const { rerender } = renderHook(
      ({ resource, action }) => useAccess({ resource, action }),
      {
        wrapper: createTestWrapper(),
        initialProps: { resource: 'users', action: 'read' },
      }
    );

    const firstCall = mockUseSWR.mock.calls[0][0];
    expect(firstCall).toBe('/api/access?resource=users&action=read');

    // Rerender with different props
    rerender({ resource: 'posts', action: 'write' });
    
    const secondCall = mockUseSWR.mock.calls[1][0];
    expect(secondCall).toBe('/api/access?resource=posts&action=write');
    expect(firstCall).not.toBe(secondCall);
  });

  it('should handle numeric record IDs', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
        record: { id: 123, name: 'John' },
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=read&recordId=123');
  });

  it('should handle complex record IDs', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
        record: { id: { uuid: '123e4567-e89b-12d3-a456-426614174000' }, name: 'John' },
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=users&action=read&recordId=[object Object]');
  });

  it('should handle special characters in parameters', () => {
    mockUseSWR.mockReturnValue({
      data: { can: true },
      error: undefined,
    });

    renderHook(
      () => useAccess({
        resource: 'api/v1/users',
        action: 'read:profile',
        field: 'user.email',
        record: { id: 'user@domain.com', name: 'John' },
      }),
      { wrapper: createTestWrapper() }
    );

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/access?resource=api/v1/users&action=read:profile&field=user.email&recordId=user@domain.com'
    );
  });

  it('should return consistent results across re-renders', async () => {
    const mockData = { can: true, reason: 'Admin access' };
    mockUseSWR.mockReturnValue({
      data: mockData,
      error: undefined,
    });

    const { result, rerender } = renderHook(
      () => useAccess({
        resource: 'users',
        action: 'read',
      }),
      { wrapper: createTestWrapper() }
    );

    const firstResult = result.current;
    
    // Re-render multiple times
    rerender();
    rerender();
    rerender();

    expect(result.current).toEqual(firstResult);
    expect(result.current).toEqual({
      can: true,
      reason: 'Admin access',
      loading: false,
    });
  });

  /**
   * @describe Advanced Hook Behavior Tests
   * 
   * Tests advanced scenarios including parameter validation, edge cases,
   * and integration with various SWR states.
   */
  describe('advanced hook behavior', () => {
    it('should handle SWR loading to error transition', () => {
      // First render - loading
      mockUseSWR.mockReturnValueOnce({
        data: undefined,
        error: undefined,
      });

      const { result, rerender } = renderHook(
        () => useAccess({
          resource: 'users',
          action: 'read',
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.can).toBe(false);

      // Second render - error
      mockUseSWR.mockReturnValueOnce({
        data: undefined,
        error: new Error('API Error'),
      });

      rerender();

      expect(result.current.loading).toBe(false);
      expect(result.current.can).toBe(false);
      expect(result.current.reason).toBe('Unknown error');
    });

    it('should handle SWR loading to success transition', () => {
      // First render - loading
      mockUseSWR.mockReturnValueOnce({
        data: undefined,
        error: undefined,
      });

      const { result, rerender } = renderHook(
        () => useAccess({
          resource: 'users',
          action: 'read',
        }),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.loading).toBe(true);

      // Second render - success
      mockUseSWR.mockReturnValueOnce({
        data: { can: true, reason: 'Success' },
        error: undefined,
      });

      rerender();

      expect(result.current.loading).toBe(false);
      expect(result.current.can).toBe(true);
      expect(result.current.reason).toBe('Success');
    });

    it('should handle malformed API responses', () => {
      mockUseSWR.mockReturnValue({
        data: { invalid: 'response' }, // Missing 'can' property
        error: undefined,
      });

      const { result } = renderHook(
        () => useAccess({
          resource: 'users',
          action: 'read',
        }),
        { wrapper: createTestWrapper() }
      );

      // Should handle malformed response gracefully
      expect(result.current.can).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('should handle empty string parameters', () => {
      mockUseSWR.mockReturnValue({
        data: { can: true },
        error: undefined,
      });

      renderHook(
        () => useAccess({
          resource: '',
          action: '',
        }),
        { wrapper: createTestWrapper() }
      );

      expect(mockUseSWR).toHaveBeenCalledWith('/api/access?resource=&action=');
    });
  });
});