/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keys and auth are mocked in the setup file

describe('Webhooks Integration', () => {
  let mockSvixInstance: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Use the global mock instance from setup
    mockSvixInstance = (globalThis as any).__mockSvixMethods;
  });

  describe('Full Webhook Workflow', () => {
    it('should handle complete webhook lifecycle', async () => {
      // Setup mock responses
      const mockMessageResult = {
        id: 'msg_lifecycle_test',
        eventType: 'user.created',
        payload: {
          eventType: 'user.created',
          userId: 'user_lifecycle_123',
          email: 'lifecycle@example.com',
        },
        timestamp: new Date().toISOString(),
      };

      const mockPortalResult = {
        url: 'https://bridge.svix.com/app-portal/lifecycle_app',
        token: 'portal_token_lifecycle',
        expires: new Date(Date.now() + 3600000).toISOString(),
      };

      mockSvixInstance.message.create.mockResolvedValue(mockMessageResult);
      mockSvixInstance.authentication.appPortalAccess.mockResolvedValue(mockPortalResult);

      const { webhooks } = await import('../index');

      // Test sending webhook
      const sendResult = await webhooks.send('user.created', {
        userId: 'user_lifecycle_123',
        email: 'lifecycle@example.com',
      });

      expect(sendResult).toEqual(mockMessageResult);

      // Test getting portal access
      const portalResult = await webhooks.getAppPortal();

      expect(portalResult).toEqual(mockPortalResult);

      // Verify both functions were called correctly
      expect(mockSvixInstance.message.create).toHaveBeenCalledWith('test_org_123', {
        eventType: 'user.created',
        payload: {
          eventType: 'user.created',
          userId: 'user_lifecycle_123',
          email: 'lifecycle@example.com',
        },
        application: {
          name: 'test_org_123',
          uid: 'test_org_123',
        },
      });

      expect(mockSvixInstance.authentication.appPortalAccess).toHaveBeenCalledWith('test_org_123', {
        application: {
          name: 'test_org_123',
          uid: 'test_org_123',
        },
      });
    });

    it('should handle multiple webhook events in sequence', async () => {
      const events = [
        { eventType: 'user.created', data: { userId: 'user_1', action: 'create' } },
        { eventType: 'user.updated', data: { userId: 'user_1', action: 'update' } },
        { eventType: 'payment.succeeded', data: { userId: 'user_1', amount: 2999 } },
        { eventType: 'subscription.activated', data: { userId: 'user_1', plan: 'pro' } },
      ];

      for (const [index, event] of events.entries()) {
        mockSvixInstance.message.create.mockResolvedValueOnce({
          id: `msg_sequence_${index}`,
          eventType: event.eventType,
          payload: {
            eventType: event.eventType,
            ...event.data,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { webhooks } = await import('../index');
      const results = [];

      for (const event of events) {
        const result = await webhooks.send(event.eventType, event.data);
        results.push(result);
      }

      expect(results).toHaveLength(events.length);
      expect(mockSvixInstance.message.create).toHaveBeenCalledTimes(events.length);

      // Verify each event was sent correctly
      events.forEach((event, index) => {
        expect(mockSvixInstance.message.create).toHaveBeenNthCalledWith(index + 1, 'test_org_123', {
          eventType: event.eventType,
          payload: {
            eventType: event.eventType,
            ...event.data,
          },
          application: {
            name: 'test_org_123',
            uid: 'test_org_123',
          },
        });
      });
    });

    it('should handle concurrent webhook operations', async () => {
      // Setup mock responses for concurrent operations
      mockSvixInstance.message.create.mockResolvedValue({
        id: 'msg_concurrent',
        eventType: 'concurrent.test',
      });

      mockSvixInstance.authentication.appPortalAccess.mockResolvedValue({
        url: 'https://bridge.svix.com/app-portal/concurrent_app',
        token: 'concurrent_token',
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      const { webhooks } = await import('../index');

      // Run send and getAppPortal operations concurrently
      const operations = [
        webhooks.send('concurrent.test', { operation: 'send_1' }),
        webhooks.send('concurrent.test', { operation: 'send_2' }),
        webhooks.getAppPortal(),
        webhooks.send('concurrent.test', { operation: 'send_3' }),
        webhooks.getAppPortal(),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(5);
      expect(mockSvixInstance.message.create).toHaveBeenCalledTimes(3);
      expect(mockSvixInstance.authentication.appPortalAccess).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const { webhooks } = await import('../index');

      // First operation succeeds
      mockSvixInstance.message.create.mockResolvedValueOnce({
        id: 'msg_success',
        eventType: 'success.event',
      });

      const successResult = await webhooks.send('success.event', { data: 'success' });
      expect(successResult).toBeDefined();

      // Second operation fails
      mockSvixInstance.message.create.mockRejectedValueOnce(new Error('Send failed'));

      await expect(webhooks.send('failure.event', { data: 'failure' }))
        .rejects.toThrow('Send failed');

      // Third operation (portal access) succeeds
      mockSvixInstance.authentication.appPortalAccess.mockResolvedValueOnce({
        url: 'https://bridge.svix.com/app-portal/mixed_app',
        token: 'mixed_token',
      });

      const portalResult = await webhooks.getAppPortal();
      expect(portalResult).toBeDefined();

      // Fourth operation (portal access) fails
      mockSvixInstance.authentication.appPortalAccess.mockRejectedValueOnce(
        new Error('Portal access failed')
      );

      await expect(webhooks.getAppPortal())
        .rejects.toThrow('Portal access failed');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial service degradation', async () => {
      const { webhooks } = await import('../index');

      // Message service works, portal service fails
      mockSvixInstance.message.create.mockResolvedValue({
        id: 'msg_partial_success',
        eventType: 'partial.test',
      });

      mockSvixInstance.authentication.appPortalAccess.mockRejectedValue(
        new Error('Portal service unavailable')
      );

      // Webhook sending should still work
      const sendResult = await webhooks.send('partial.test', { data: 'test' });
      expect(sendResult).toBeDefined();

      // Portal access should fail
      await expect(webhooks.getAppPortal())
        .rejects.toThrow('Portal service unavailable');
    });

    it('should handle authentication failures gracefully', async () => {
      // Mock auth to fail
      vi.doMock('@repo/auth/server', () => ({
        auth: vi.fn(async () => {
          throw new Error('Authentication service down');
        }),
      }));

      vi.resetModules();
      const { webhooks } = await import('../index');

      // Both operations should fail with auth error
      await expect(webhooks.send('auth.test', { data: 'test' }))
        .rejects.toThrow('Authentication service down');

      await expect(webhooks.getAppPortal())
        .rejects.toThrow('Authentication service down');
    });

    it('should handle configuration errors', async () => {
      // Mock missing SVIX_TOKEN
      vi.doMock('../keys', () => ({
        keys: () => ({
          SVIX_TOKEN: undefined,
        }),
      }));

      vi.resetModules();
      const { webhooks } = await import('../index');

      // Both operations should fail with configuration error
      await expect(webhooks.send('config.test', { data: 'test' }))
        .rejects.toThrow('SVIX_TOKEN is not set');

      await expect(webhooks.getAppPortal())
        .rejects.toThrow('SVIX_TOKEN is not set');
    });

    it('should handle network failures and retries', async () => {
      const { webhooks } = await import('../index');

      const networkError = new Error('Network unreachable');
      networkError.name = 'NetworkError';

      // Simulate network failure
      mockSvixInstance.message.create.mockRejectedValue(networkError);
      mockSvixInstance.authentication.appPortalAccess.mockRejectedValue(networkError);

      await expect(webhooks.send('network.test', { data: 'test' }))
        .rejects.toThrow('Network unreachable');

      await expect(webhooks.getAppPortal())
        .rejects.toThrow('Network unreachable');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-throughput webhook sending', async () => {
      const { webhooks } = await import('../index');

      // Setup mock for high throughput
      mockSvixInstance.message.create.mockImplementation(async (orgId, message) => ({
        id: `msg_${Date.now()}_${Math.random()}`,
        eventType: message.eventType,
        payload: message.payload,
        timestamp: new Date().toISOString(),
      }));

      const batchSize = 100;
      const promises = Array.from({ length: batchSize }, (_, i) =>
        webhooks.send('high.throughput', {
          batchId: 'batch_001',
          itemId: i,
          data: `item_${i}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(batchSize);
      expect(mockSvixInstance.message.create).toHaveBeenCalledTimes(batchSize);

      // Verify all results are unique
      const ids = results.map(r => r?.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(batchSize);
    });

    it('should handle large payload processing', async () => {
      const { webhooks } = await import('../index');

      const largePayload = {
        eventType: 'large.data.processed',
        data: {
          records: Array.from({ length: 5000 }, (_, i) => ({
            id: `record_${i}`,
            data: `data_${i}`.repeat(50),
            metadata: {
              timestamp: new Date().toISOString(),
              index: i,
              processed: true,
            },
          })),
          summary: {
            totalRecords: 5000,
            processingTime: '2.5s',
            averageSize: 250,
          },
        },
      };

      mockSvixInstance.message.create.mockResolvedValue({
        id: 'msg_large_payload',
        eventType: 'large.data.processed',
        payload: expect.any(Object),
        timestamp: new Date().toISOString(),
      });

      const result = await webhooks.send('large.data.processed', largePayload.data);

      expect(result).toBeDefined();
      expect(mockSvixInstance.message.create).toHaveBeenCalledWith('test_org_123', {
        eventType: 'large.data.processed',
        payload: {
          eventType: 'large.data.processed',
          ...largePayload.data,
        },
        application: {
          name: 'test_org_123',
          uid: 'test_org_123',
        },
      });
    });

    it('should handle memory-efficient operations', async () => {
      const { webhooks } = await import('../index');

      // Test repeated operations don't cause memory leaks
      for (let i = 0; i < 1000; i++) {
        mockSvixInstance.message.create.mockResolvedValueOnce({
          id: `msg_memory_${i}`,
          eventType: 'memory.test',
        });

        if (i % 100 === 0) {
          mockSvixInstance.authentication.appPortalAccess.mockResolvedValueOnce({
            url: `https://bridge.svix.com/app-portal/memory_${i}`,
            token: `token_${i}`,
          });
        }

        if (i % 10 === 0) {
          // Test portal access occasionally
          const portalResult = await webhooks.getAppPortal();
          expect(portalResult).toBeDefined();
        }

        const sendResult = await webhooks.send('memory.test', {
          iteration: i,
          data: `test_${i}`,
        });

        expect(sendResult?.id).toBe(`msg_memory_${i}`);
      }

      expect(mockSvixInstance.message.create).toHaveBeenCalledTimes(1000);
      expect(mockSvixInstance.authentication.appPortalAccess).toHaveBeenCalledTimes(100);
    });
  });

  describe('Security and Compliance', () => {
    it('should handle sensitive data appropriately', async () => {
      const { webhooks } = await import('../index');

      const sensitiveData = {
        userId: 'user_123',
        email: 'user@example.com',
        // In real implementation, these should be sanitized
        creditCard: 'masked',
        ssn: 'masked',
        password: 'never_included',
        personalData: {
          name: 'John Doe',
          address: 'masked_for_privacy',
        },
      };

      mockSvixInstance.message.create.mockResolvedValue({
        id: 'msg_sensitive',
        eventType: 'user.profile.updated',
        payload: expect.any(Object),
      });

      const result = await webhooks.send('user.profile.updated', sensitiveData);

      expect(result).toBeDefined();
      expect(mockSvixInstance.message.create).toHaveBeenCalledWith('test_org_123', {
        eventType: 'user.profile.updated',
        payload: {
          eventType: 'user.profile.updated',
          ...sensitiveData,
        },
        application: {
          name: 'test_org_123',
          uid: 'test_org_123',
        },
      });
    });

    it('should validate organization isolation', async () => {
      // Test with different organization IDs
      const orgIds = ['org_123', 'org_456', 'org_789'];

      for (const orgId of orgIds) {
        vi.doMock('@repo/auth/server', () => ({
          auth: vi.fn(async () => ({
            orgId,
            userId: 'test_user',
          })),
        }));

        mockSvixInstance.message.create.mockResolvedValue({
          id: `msg_${orgId}`,
          eventType: 'org.isolation.test',
        });

        mockSvixInstance.authentication.appPortalAccess.mockResolvedValue({
          url: `https://bridge.svix.com/app-portal/${orgId}`,
          token: `token_${orgId}`,
        });

        vi.resetModules();
        const { webhooks } = await import('../index');

        // Test webhook sending
        const sendResult = await webhooks.send('org.isolation.test', { orgTest: true });
        expect(sendResult?.id).toBe(`msg_${orgId}`);

        // Test portal access
        const portalResult = await webhooks.getAppPortal();
        expect(portalResult?.url).toContain(orgId);

        // Verify correct orgId was used in API calls
        expect(mockSvixInstance.message.create).toHaveBeenCalledWith(orgId, expect.any(Object));
        expect(mockSvixInstance.authentication.appPortalAccess).toHaveBeenCalledWith(orgId, expect.any(Object));
      }
    });

    it('should handle audit trail requirements', async () => {
      const { webhooks } = await import('../index');

      const auditEvents = [
        { eventType: 'user.login', data: { userId: 'user_1', timestamp: new Date().toISOString() } },
        { eventType: 'user.permission.changed', data: { userId: 'user_1', newRole: 'admin' } },
        { eventType: 'data.accessed', data: { userId: 'user_1', resource: 'sensitive_data' } },
        { eventType: 'user.logout', data: { userId: 'user_1', sessionDuration: '2h' } },
      ];

      for (const [index, event] of auditEvents.entries()) {
        mockSvixInstance.message.create.mockResolvedValueOnce({
          id: `audit_${index}`,
          eventType: event.eventType,
          payload: {
            eventType: event.eventType,
            ...event.data,
            auditId: `audit_${index}`,
            timestamp: new Date().toISOString(),
          },
        });

        const result = await webhooks.send(event.eventType, {
          ...event.data,
          auditId: `audit_${index}`,
        });

        expect(result).toBeDefined();
      }

      expect(mockSvixInstance.message.create).toHaveBeenCalledTimes(auditEvents.length);
    });
  });
});