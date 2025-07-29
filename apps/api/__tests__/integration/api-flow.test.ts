/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from '../../app/api-keys/route';
import { GET as healthGet } from '../../app/health/route';
import { POST as triggerPost } from '../../app/trigger/route';
import {
  assertResponse,
  createAuthenticatedRequest,
  createMockRequest,
  mockAnalytics,
  mockClerkAuth,
  mockDatabase,
  mockEnvironment,
  mockExternalServices,
  mockTrigger,
} from '../utils/api-test-helpers';

describe('API Integration Flow Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  mockEnvironment({
    CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_stripe_secret',
    CLERK_WEBHOOK_SECRET: 'whsec_test_clerk_secret',
  });

  describe('API Key Management Flow', () => {
    it('should handle complete API key lifecycle', async () => {
      // Mock successful authentication
      mockClerkAuth.mockSuccess('user_test123');
      
      // Mock Clerk API responses
      const createdKey = {
        id: 'key_test123',
        name: 'Integration Test Key',
        user_id: 'user_test123',
        scopes: ['read', 'write'],
        expires_at: '2024-12-31T23:59:59.000Z',
        key: 'sk_generated_key_123',
      };

      mockExternalServices.mockClerkAPI.success(createdKey);

      // 1. Create API Key
      const createRequest = createAuthenticatedRequest('valid_token', {
        method: 'POST',
        body: {
          name: 'Integration Test Key',
          scopes: ['read', 'write'],
          expiration: '90d',
        },
      });

      const createResponse = await POST(createRequest);
      await assertResponse.success(createResponse);

      const createData = await createResponse.json();
      expect(createData.name).toBe('Integration Test Key');
      expect(createData.key).toMatch(/^sk_/);

      // 2. List API Keys
      const keysList = [createdKey];
      mockExternalServices.mockClerkAPI.success(keysList);

      const listRequest = createAuthenticatedRequest('valid_token', {
        method: 'GET',
      });

      const listResponse = await GET(listRequest);
      await assertResponse.success(listResponse);

      const listData = await listResponse.json();
      expect(Array.isArray(listData)).toBe(true);
      expect(listData).toHaveLength(1);
      expect(listData[0].name).toBe('Integration Test Key');

      // 3. Delete API Key
      mockExternalServices.mockClerkAPI.success({});

      const deleteRequest = createAuthenticatedRequest('valid_token', {
        method: 'DELETE',
        searchParams: { id: 'key_test123' },
      });

      const deleteResponse = await DELETE(deleteRequest);
      await assertResponse.success(deleteResponse);

      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);
      expect(deleteData.id).toBe('key_test123');
    });

    it('should handle API key creation with validation errors', async () => {
      mockClerkAuth.mockSuccess('user_test123');

      const createRequest = createAuthenticatedRequest('valid_token', {
        method: 'POST',
        body: {
          name: '', // Invalid: empty name
          scopes: ['read'],
          expiration: 'invalid', // Invalid format
        },
      });

      await expect(POST(createRequest)).rejects.toThrow();
    });

    it('should handle unauthorized access consistently', async () => {
      mockClerkAuth.mockFailure(401, 'Unauthorized');

      const endpoints = [
        { method: 'POST', handler: POST, body: { name: 'Test' } },
        { method: 'GET', handler: GET },
        { method: 'DELETE', handler: DELETE, searchParams: { id: 'key123' } },
      ];

      for (const endpoint of endpoints) {
        const request = createMockRequest({
          method: endpoint.method as any,
          body: endpoint.body,
          searchParams: endpoint.searchParams,
        });

        const response = await endpoint.handler(request as any);
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Health Check and Monitoring Flow', () => {
    it('should handle health check in different environments', async () => {
      // Test request
      const testRequest = createMockRequest({
        headers: { Accept: 'text/plain' },
      });

      const testResponse = await healthGet(testRequest as any);
      expect(testResponse.status).toBe(200);
      expect(await testResponse.text()).toBe('OK');

      // Browser request
      const browserRequest = createMockRequest({
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });

      const browserResponse = await healthGet(browserRequest as any);
      expect(browserResponse.status).toBe(200);
      expect(browserResponse.headers.get('Content-Type')).toBe('text/html');

      const htmlContent = await browserResponse.text();
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('API Status');
    });

    it('should handle cron job with database operations', async () => {
      const { GET: cronGet } = await import('../../app/cron/keep-alive/route');
      const mockDb = mockDatabase.mockSuccess();

      const page = { id: 'page_test123', name: 'cron-temp' };
      mockDb.page.create.mockResolvedValue(page);
      mockDb.page.delete.mockResolvedValue(page);

      const response = await cronGet();

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
      expect(mockDb.page.create).toHaveBeenCalledWith({
        data: { name: 'cron-temp' },
      });
      expect(mockDb.page.delete).toHaveBeenCalledWith({
        where: { id: 'page_test123' },
      });
    });
  });

  describe('Event Processing Flow', () => {
    it('should handle trigger event processing end-to-end', async () => {
      const mockResult = { success: true, id: 'trigger_test123' };
      const mockSendEvent = mockTrigger.mockSuccess(mockResult);

      const eventData = {
        event: 'user.action.performed',
        payload: {
          userId: 'user_test123',
          action: 'button_click',
          metadata: { page: '/dashboard', timestamp: Date.now() },
        },
      };

      const request = createMockRequest({
        method: 'POST',
        body: eventData,
      });

      const response = await triggerPost(request as any);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('user.action.performed');
      expect(responseData.result).toEqual(mockResult);

      expect(mockSendEvent).toHaveBeenCalledWith(
        'user.action.performed',
        eventData.payload
      );
    });

    it('should handle complex event payloads', async () => {
      const mockSendEvent = mockTrigger.mockSuccess({ success: true });

      const complexPayload = {
        user: {
          id: 'user_test123',
          profile: { name: 'John Doe', email: 'john@example.com' },
        },
        transaction: {
          id: 'tx_test123',
          amount: 2500,
          currency: 'USD',
          items: [
            { id: 'item_1', name: 'Product A', price: 1000 },
            { id: 'item_2', name: 'Product B', price: 1500 },
          ],
        },
        metadata: {
          source: 'checkout',
          timestamp: Date.now(),
          sessionId: 'sess_test123',
        },
      };

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'purchase.completed',
          payload: complexPayload,
        },
      });

      const response = await triggerPost(request as any);

      expect(response.status).toBe(200);
      expect(mockSendEvent).toHaveBeenCalledWith(
        'purchase.completed',
        complexPayload
      );
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle analytics and database operations together', async () => {
      const mockAnalyticsService = mockAnalytics.mockPostHog();
      const mockDb = mockDatabase.mockSuccess();

      // Simulate a user creation flow
      const page = { id: 'page_test123', name: 'user-temp' };
      mockDb.page.create.mockResolvedValue(page);
      mockDb.page.delete.mockResolvedValue(page);

      // Create a database record (simulating user creation)
      const { GET: cronGet } = await import('../../app/cron/keep-alive/route');
      await cronGet();

      expect(mockDb.page.create).toHaveBeenCalled();
      expect(mockDb.page.delete).toHaveBeenCalled();
    });

    it('should handle error propagation across services', async () => {
      mockTrigger.mockError(new Error('External service unavailable'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'critical.event',
          payload: { priority: 'high' },
        },
      });

      const response = await triggerPost(request as any);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('External service unavailable');
    });

    it('should handle service recovery after failures', async () => {
      // First request fails
      mockTrigger.mockError(new Error('Service temporarily unavailable'));

      const failingRequest = createMockRequest({
        method: 'POST',
        body: { event: 'test.event', payload: {} },
      });

      const failResponse = await triggerPost(failingRequest as any);
      expect(failResponse.status).toBe(500);

      // Second request succeeds (service recovered)
      mockTrigger.mockSuccess({ success: true });

      const successRequest = createMockRequest({
        method: 'POST',
        body: { event: 'test.event', payload: {} },
      });

      const successResponse = await triggerPost(successRequest as any);
      expect(successResponse.status).toBe(200);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent API key operations', async () => {
      mockClerkAuth.mockSuccess('user_test123');
      
      const operations = [
        { operation: 'create', data: { name: 'Key 1', scopes: ['read'] } },
        { operation: 'create', data: { name: 'Key 2', scopes: ['write'] } },
        { operation: 'create', data: { name: 'Key 3', scopes: ['admin'] } },
      ];

      // Mock different responses for each creation
      operations.forEach((_, index) => {
        mockExternalServices.mockClerkAPI.success({
          id: `key_test${index}`,
          name: `Key ${index + 1}`,
        });
      });

      const requests = operations.map(op =>
        createAuthenticatedRequest('valid_token', {
          method: 'POST',
          body: {
            ...op.data,
            expiration: '30d',
          },
        })
      );

      const responses = await Promise.all(
        requests.map(request => POST(request))
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });

    it('should handle mixed concurrent operations', async () => {
      const mockDb = mockDatabase.mockSuccess();
      const mockSendEvent = mockTrigger.mockSuccess({ success: true });
      
      mockDb.page.create.mockResolvedValue({ id: 'page_test', name: 'cron-temp' });
      mockDb.page.delete.mockResolvedValue({ id: 'page_test' });

      const operations = [
        () => healthGet(createMockRequest({ headers: { Accept: 'text/plain' } }) as any),
        () => triggerPost(createMockRequest({ method: 'POST', body: { event: 'test', payload: {} } }) as any),
        async () => {
          const { GET: cronGet } = await import('../../app/cron/keep-alive/route');
          return cronGet();
        },
      ];

      const responses = await Promise.all(
        operations.map(operation => operation())
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      expect(mockSendEvent).toHaveBeenCalled();
      expect(mockDb.page.create).toHaveBeenCalled();
    });
  });

  describe('Data Validation and Security', () => {
    it('should validate input data across all endpoints', async () => {
      const testCases = [
        {
          endpoint: 'api-keys',
          handler: POST,
          invalidData: { name: null, scopes: 'invalid', expiration: 123 },
        },
        {
          endpoint: 'trigger',
          handler: triggerPost,
          invalidData: { event: null, payload: 'not-an-object' },
        },
      ];

      for (const testCase of testCases) {
        if (testCase.endpoint === 'api-keys') {
          mockClerkAuth.mockSuccess('user_test123');
        }

        const request = createMockRequest({
          method: 'POST',
          body: testCase.invalidData,
        });

        try {
          const response = await testCase.handler(request as any);
          // Should either return error status or throw
          if (response.status !== 400 && response.status !== 500) {
            expect.fail(`Expected error response for invalid data in ${testCase.endpoint}`);
          }
        } catch (error) {
          // Throwing is also acceptable for validation errors
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle authentication consistently across protected endpoints', async () => {
      const protectedEndpoints = [
        { handler: POST, method: 'POST', body: { name: 'Test' } },
        { handler: GET, method: 'GET' },
        { handler: DELETE, method: 'DELETE', searchParams: { id: 'test' } },
      ];

      // Test with no auth
      for (const endpoint of protectedEndpoints) {
        mockClerkAuth.mockFailure(401, 'No token provided');

        const request = createMockRequest({
          method: endpoint.method as any,
          body: endpoint.body,
          searchParams: endpoint.searchParams,
        });

        const response = await endpoint.handler(request as any);
        expect(response.status).toBe(401);
      }

      // Test with invalid auth
      for (const endpoint of protectedEndpoints) {
        mockClerkAuth.mockFailure(403, 'Invalid token');

        const request = createAuthenticatedRequest('invalid_token', {
          method: endpoint.method as any,
          body: endpoint.body,
          searchParams: endpoint.searchParams,
        });

        const response = await endpoint.handler(request as any);
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle resource cleanup on errors', async () => {
      const mockDb = mockDatabase.mockSuccess();
      mockDb.page.create.mockResolvedValue({ id: 'page_test', name: 'cron-temp' });
      mockDb.page.delete.mockRejectedValue(new Error('Delete failed'));

      const { GET: cronGet } = await import('../../app/cron/keep-alive/route');

      await expect(cronGet()).rejects.toThrow('Delete failed');

      // Verify create was called before the error
      expect(mockDb.page.create).toHaveBeenCalled();
      expect(mockDb.page.delete).toHaveBeenCalled();
    });

    it('should handle memory-intensive operations', async () => {
      const largePayload = {
        event: 'bulk.data.processed',
        payload: {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: `item_${i}`,
            data: 'x'.repeat(1000), // 1KB per item = ~1MB total
            metadata: { index: i, timestamp: Date.now() },
          })),
        },
      };

      const mockSendEvent = mockTrigger.mockSuccess({ success: true });

      const request = createMockRequest({
        method: 'POST',
        body: largePayload,
      });

      const response = await triggerPost(request as any);

      expect(response.status).toBe(200);
      expect(mockSendEvent).toHaveBeenCalledWith(
        'bulk.data.processed',
        largePayload.payload
      );
    });
  });
});