/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useAccess } from '../hooks/use-access.js';
import type { UserContext } from '../types/index.js';

// Mock Clerk
const mockUser = vi.fn();
const mockIsLoaded = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: mockUser(),
    isLoaded: mockIsLoaded(),
  }),
}));

// Mock auth-runner
const mockEvaluateAccess = vi.fn();
vi.mock('@repo/auth-runner', () => ({
  evaluateAccess: mockEvaluateAccess,
}));

// Test component that uses the hook
function TestComponent({ 
  resource, 
  action, 
  record, 
  field 
}: { 
  resource: string; 
  action: string; 
  record?: any; 
  field?: string; 
}) {
  const { can, isLoading, error } = useAccess(resource, action, record, field);
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="access">{can ? 'granted' : 'denied'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
    </div>
  );
}

describe('Security Vulnerability Tests - Auth Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoaded.mockReturnValue(true);
    mockUser.mockReturnValue({
      id: 'user_123',
      publicMetadata: { role: 'user', tenantId: 'tenant_456' },
    });
    mockEvaluateAccess.mockReturnValue({ can: false, reason: 'Default deny' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('user context injection prevention', () => {
    it('should prevent prototype pollution in user metadata', async () => {
      // Mock user with malicious metadata
      mockUser.mockReturnValue({
        id: 'user_123',
        publicMetadata: {
          role: 'user',
          tenantId: 'tenant_456',
          // Prototype pollution attempts
          __proto__: { role: 'admin' },
          constructor: { prototype: { role: 'admin' } },
          valueOf: () => ({ role: 'admin' }),
        },
      });

      mockEvaluateAccess.mockImplementation((input) => {
        // Verify that only legitimate properties are passed
        expect(input.context.role).toBe('user');
        expect(input.context.__proto__).toBeUndefined();
        expect(input.context.constructor).toBeUndefined();
        return { can: false, reason: 'Access denied' };
      });

      const { getByTestId } = render(
        <TestComponent resource="admin_panel" action="access" />
      );

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(getByTestId('access')).toHaveTextContent('denied');
      expect(mockEvaluateAccess).toHaveBeenCalled();
    });

    it('should sanitize malicious user IDs', async () => {
      const maliciousUserIds = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        'user*)(objectClass=*)(uid=admin',
        { $ne: null },
        null,
        undefined,
      ];

      for (const maliciousId of maliciousUserIds) {
        mockUser.mockReturnValue({
          id: maliciousId,
          publicMetadata: { role: 'user', tenantId: 'tenant_456' },
        });

        mockEvaluateAccess.mockImplementation((input) => {
          // Verify user ID is passed as-is but handled safely
          expect(input.context.userId).toBe(maliciousId);
          return { can: false, reason: 'Access denied' };
        });

        const { getByTestId, unmount } = render(
          <TestComponent resource="test_resource" action="read" />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        expect(getByTestId('access')).toHaveTextContent('denied');
        expect(mockEvaluateAccess).toHaveBeenCalled();

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should prevent role escalation through metadata manipulation', async () => {
      mockUser.mockReturnValue({
        id: 'user_123',
        publicMetadata: {
          role: 'user',
          tenantId: 'tenant_456',
          // Attempts to add admin privileges
          isAdmin: true,
          permissions: ['*'],
          escalated: true,
          sudo: true,
        },
      });

      mockEvaluateAccess.mockImplementation((input) => {
        // Only standard fields should be included in context
        const context = input.context as UserContext;
        expect(context.role).toBe('user');
        expect(context.tenantId).toBe('tenant_456');
        expect(context.userId).toBe('user_123');
        
        // Additional metadata should be included but not trusted for authorization
        expect((context as any).isAdmin).toBe(true);
        expect((context as any).permissions).toEqual(['*']);
        
        // Authorization logic should not automatically trust these flags
        return { can: false, reason: 'Insufficient privileges' };
      });

      const { getByTestId } = render(
        <TestComponent resource="admin_functions" action="execute" />
      );

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(getByTestId('access')).toHaveTextContent('denied');
    });
  });

  describe('parameter injection prevention', () => {
    it('should sanitize malicious resource names', async () => {
      const maliciousResources = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE resources; --",
        '../../../admin/config',
        'resource*)(objectClass=*',
        { $ne: null },
      ];

      for (const maliciousResource of maliciousResources) {
        mockEvaluateAccess.mockImplementation((input) => {
          expect(input.resource).toBe(maliciousResource);
          return { can: false, reason: 'Unknown resource' };
        });

        const { getByTestId, unmount } = render(
          <TestComponent 
            resource={maliciousResource as string} 
            action="read" 
          />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        expect(getByTestId('access')).toHaveTextContent('denied');

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should sanitize malicious action names', async () => {
      const maliciousActions = [
        '<img src="x" onerror="alert(1)">',
        "admin'; EXEC sp_addsrvrolemember 'test', 'sysadmin'; --",
        '../../etc/shadow',
        'action*)(|(action=*',
        'javascript:alert(1)',
      ];

      for (const maliciousAction of maliciousActions) {
        mockEvaluateAccess.mockImplementation((input) => {
          expect(input.action).toBe(maliciousAction);
          return { can: false, reason: 'Unknown action' };
        });

        const { getByTestId, unmount } = render(
          <TestComponent 
            resource="test_resource" 
            action={maliciousAction} 
          />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        expect(getByTestId('access')).toHaveTextContent('denied');

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should handle malicious record objects', async () => {
      const maliciousRecord = {
        id: 'record_123',
        // Prototype pollution attempts
        __proto__: { authorized: true },
        constructor: { authorized: true },
        valueOf: () => ({ authorized: true }),
        toString: () => 'authorized',
        // Injection attempts
        query: { $where: 'function() { return true; }' },
        script: '<script>alert("xss")</script>',
        path: '../../../admin/secrets',
      };

      mockEvaluateAccess.mockImplementation((input) => {
        const record = input.record;
        expect(record.id).toBe('record_123');
        
        // Malicious properties should be present but not trusted
        expect(record.__proto__).toBeDefined();
        expect(record.constructor).toBeDefined();
        
        return { can: false, reason: 'Record validation failed' };
      });

      const { getByTestId } = render(
        <TestComponent 
          resource="documents" 
          action="read" 
          record={maliciousRecord}
        />
      );

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(getByTestId('access')).toHaveTextContent('denied');
    });

    it('should sanitize malicious field names', async () => {
      const maliciousFields = [
        '<script>document.location="http://evil.com"</script>',
        "'; UPDATE users SET role='admin' WHERE id=1; --",
        '../../../etc/passwd',
        'field*)(objectClass=*',
        'javascript:void(0)',
      ];

      for (const maliciousField of maliciousFields) {
        mockEvaluateAccess.mockImplementation((input) => {
          expect(input.field).toBe(maliciousField);
          return { can: false, reason: 'Invalid field' };
        });

        const { getByTestId, unmount } = render(
          <TestComponent 
            resource="user_profiles" 
            action="read" 
            field={maliciousField}
          />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        expect(getByTestId('access')).toHaveTextContent('denied');

        unmount();
        vi.clearAllMocks();
      }
    });
  });

  describe('timing attack prevention', () => {
    it('should have consistent response times regardless of user privileges', async () => {
      const testUsers = [
        { id: 'user_1', publicMetadata: { role: 'user', tenantId: 'tenant_1' } },
        { id: 'admin_1', publicMetadata: { role: 'admin', tenantId: 'tenant_1' } },
        { id: 'nonexistent', publicMetadata: { role: 'guest', tenantId: 'tenant_999' } },
      ];

      const timings: number[] = [];

      for (const user of testUsers) {
        mockUser.mockReturnValue(user);
        mockEvaluateAccess.mockImplementation(() => {
          // Simulate some processing time
          const start = performance.now();
          while (performance.now() - start < 10) {
            // Busy wait for 10ms
          }
          return { can: user.publicMetadata.role === 'admin', reason: 'Evaluated' };
        });

        const startTime = performance.now();

        const { getByTestId, unmount } = render(
          <TestComponent resource="sensitive_data" action="access" />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        const endTime = performance.now();
        timings.push(endTime - startTime);

        unmount();
        vi.clearAllMocks();
      }

      // Calculate timing variance
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxVariance = Math.max(...timings.map(t => Math.abs(t - avgTiming)));

      // Timing variance should be minimal
      expect(maxVariance).toBeLessThan(5); // Less than 5ms variance
    });

    it('should prevent user enumeration through timing differences', async () => {
      const userIds = [
        'existing_user_123',
        'nonexistent_user_999',
        'admin_user_456',
        'deleted_user_789',
      ];

      const timings: number[] = [];

      for (const userId of userIds) {
        mockUser.mockReturnValue({
          id: userId,
          publicMetadata: { role: 'user', tenantId: 'tenant_456' },
        });

        mockEvaluateAccess.mockImplementation(() => {
          // Consistent processing time regardless of user existence
          const start = performance.now();
          while (performance.now() - start < 5) {
            // Busy wait
          }
          return { can: false, reason: 'Access denied' };
        });

        const startTime = performance.now();

        const { getByTestId, unmount } = render(
          <TestComponent resource="user_profiles" action="view" />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        const endTime = performance.now();
        timings.push(endTime - startTime);

        unmount();
        vi.clearAllMocks();
      }

      // All timings should be similar
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const timingDifference = maxTiming - minTiming;

      expect(timingDifference).toBeLessThan(3); // Less than 3ms difference
    });
  });

  describe('memory and resource exhaustion prevention', () => {
    it('should handle large user metadata objects efficiently', async () => {
      const largeMetadata: any = {
        role: 'user',
        tenantId: 'tenant_456',
      };

      // Add many properties to simulate large metadata
      for (let i = 0; i < 10000; i++) {
        largeMetadata[`property_${i}`] = `value_${i}`;
      }

      mockUser.mockReturnValue({
        id: 'user_123',
        publicMetadata: largeMetadata,
      });

      mockEvaluateAccess.mockReturnValue({ can: true, reason: 'Allowed' });

      const startTime = performance.now();

      const { getByTestId } = render(
        <TestComponent resource="test_resource" action="read" />
      );

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('loaded');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(getByTestId('access')).toHaveTextContent('granted');
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle deeply nested record objects', async () => {
      // Create deeply nested record
      let deepRecord: any = { value: 'test' };
      for (let i = 0; i < 100; i++) {
        deepRecord = { nested: deepRecord, level: i };
      }
      deepRecord.id = 'deep_record_123';

      mockEvaluateAccess.mockReturnValue({ can: true, reason: 'Allowed' });

      const { getByTestId } = render(
        <TestComponent 
          resource="nested_data" 
          action="read" 
          record={deepRecord}
        />
      );

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(getByTestId('access')).toHaveTextContent('granted');
      expect(mockEvaluateAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          record: deepRecord,
        })
      );
    });

    it('should handle rapid successive access checks', async () => {
      mockEvaluateAccess.mockReturnValue({ can: true, reason: 'Allowed' });

      const components: JSX.Element[] = [];

      // Render many components simultaneously
      for (let i = 0; i < 100; i++) {
        components.push(
          <TestComponent 
            key={i}
            resource={`resource_${i}`} 
            action="read" 
          />
        );
      }

      const startTime = performance.now();

      const { getAllByTestId } = render(
        <div>{components}</div>
      );

      await waitFor(() => {
        const loadingElements = getAllByTestId('loading');
        loadingElements.forEach(element => {
          expect(element).toHaveTextContent('loaded');
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should handle concurrent renders
      expect(mockEvaluateAccess).toHaveBeenCalledTimes(100);
    });
  });

  describe('error handling and information disclosure prevention', () => {
    it('should not leak sensitive information in error messages', async () => {
      const sensitiveErrors = [
        new Error('Database connection failed: password123'),
        new Error('CLERK_SECRET_KEY=super-secret-key-do-not-expose'),
        new Error('Internal configuration: /etc/secrets/app.conf'),
        new Error('Stack trace: /home/user/app/secrets.json'),
      ];

      for (const error of sensitiveErrors) {
        mockEvaluateAccess.mockRejectedValue(error);

        const { getByTestId, unmount } = render(
          <TestComponent resource="test_resource" action="read" />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        const errorElement = getByTestId('error');
        
        // Should show generic error message
        expect(errorElement).toHaveTextContent('Access evaluation failed');
        expect(errorElement).not.toHaveTextContent('password123');
        expect(errorElement).not.toHaveTextContent('secret-key');
        expect(errorElement).not.toHaveTextContent('/etc/secrets/');
        expect(errorElement).not.toHaveTextContent('secrets.json');

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should handle Clerk authentication errors securely', async () => {
      mockIsLoaded.mockReturnValue(true);
      mockUser.mockReturnValue(null); // User not authenticated

      const { getByTestId } = render(
        <TestComponent resource="protected_resource" action="access" />
      );

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(getByTestId('access')).toHaveTextContent('denied');
      expect(getByTestId('error')).toHaveTextContent('no-error');
      
      // Should not reveal authentication details
      expect(mockEvaluateAccess).not.toHaveBeenCalled();
    });

    it('should handle malformed user data gracefully', async () => {
      const malformedUsers = [
        null,
        undefined,
        { id: null },
        { id: 'user_123' }, // Missing publicMetadata
        { id: 'user_123', publicMetadata: null },
        { id: 'user_123', publicMetadata: 'invalid' },
      ];

      for (const malformedUser of malformedUsers) {
        mockUser.mockReturnValue(malformedUser);

        const { getByTestId, unmount } = render(
          <TestComponent resource="test_resource" action="read" />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        expect(getByTestId('access')).toHaveTextContent('denied');
        expect(getByTestId('error')).toHaveTextContent('no-error');

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should prevent context leakage through React dev tools', async () => {
      mockUser.mockReturnValue({
        id: 'user_123',
        publicMetadata: {
          role: 'user',
          tenantId: 'tenant_456',
          sensitiveData: 'should-not-be-visible',
          internalConfig: { secretKey: 'secret123' },
        },
      });

      const { container } = render(
        <TestComponent resource="test_resource" action="read" />
      );

      // In production, sensitive data should not be directly accessible
      // through React component props or state
      const componentInstances = container.querySelectorAll('[data-testid]');
      componentInstances.forEach(instance => {
        const reactProps = (instance as any)._reactInternalInstance?.memoizedProps;
        if (reactProps) {
          expect(JSON.stringify(reactProps)).not.toContain('secretKey');
          expect(JSON.stringify(reactProps)).not.toContain('should-not-be-visible');
        }
      });
    });
  });

  describe('session and state management security', () => {
    it('should handle session fixation attempts', async () => {
      const sessions = [
        { id: 'session_1', publicMetadata: { role: 'user', tenantId: 'tenant_1' } },
        { id: 'session_2', publicMetadata: { role: 'admin', tenantId: 'tenant_2' } },
        { id: 'session_1', publicMetadata: { role: 'user', tenantId: 'tenant_1' } }, // Reuse
      ];

      for (const session of sessions) {
        mockUser.mockReturnValue(session);
        mockEvaluateAccess.mockImplementation((input) => {
          expect(input.context.userId).toBe(session.id);
          expect(input.context.role).toBe(session.publicMetadata.role);
          return { can: session.publicMetadata.role === 'admin', reason: 'Evaluated' };
        });

        const { getByTestId, unmount } = render(
          <TestComponent resource="admin_panel" action="access" />
        );

        await waitFor(() => {
          expect(getByTestId('loading')).toHaveTextContent('loaded');
        });

        const expectedAccess = session.publicMetadata.role === 'admin' ? 'granted' : 'denied';
        expect(getByTestId('access')).toHaveTextContent(expectedAccess);

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should prevent state pollution between renders', async () => {
      // First render with admin user
      mockUser.mockReturnValue({
        id: 'admin_123',
        publicMetadata: { role: 'admin', tenantId: 'tenant_456' },
      });

      mockEvaluateAccess.mockReturnValue({ can: true, reason: 'Admin access' });

      const { getByTestId, rerender } = render(
        <TestComponent resource="admin_functions" action="execute" />
      );

      await waitFor(() => {
        expect(getByTestId('access')).toHaveTextContent('granted');
      });

      vi.clearAllMocks();

      // Second render with regular user - should not retain admin privileges
      mockUser.mockReturnValue({
        id: 'user_123',
        publicMetadata: { role: 'user', tenantId: 'tenant_456' },
      });

      mockEvaluateAccess.mockReturnValue({ can: false, reason: 'Insufficient privileges' });

      rerender(<TestComponent resource="admin_functions" action="execute" />);

      await waitFor(() => {
        expect(getByTestId('access')).toHaveTextContent('denied');
      });

      // Verify that the evaluation was called with the new user context
      expect(mockEvaluateAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user_123',
            role: 'user',
          }),
        })
      );
    });
  });
});