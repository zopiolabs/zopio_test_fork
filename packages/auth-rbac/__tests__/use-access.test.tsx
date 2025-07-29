/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAccess } from '../hooks/use-access.js';
import { createTestWrapper } from '@repo/testing';

// Mock SWR
const mockUseSWR = vi.fn();
vi.mock('swr', () => ({
  default: mockUseSWR,
}));

describe('useAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});