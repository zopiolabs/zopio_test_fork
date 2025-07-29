/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/trigger/route';
import {
  assertResponse,
  createMockRequest,
  mockTrigger,
} from '../utils/api-test-helpers';

// Mock the trigger package before importing the route
vi.mock('@repo/trigger', () => ({
  sendEvent: vi.fn(),
}));

describe('Trigger Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  describe('POST /trigger', () => {
    it('should send event to Trigger.dev successfully', async () => {
      const mockResult = { success: true, id: 'trigger_test123' };
      const mockSendEvent = mockTrigger.mockSuccess(mockResult);

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.created',
          payload: { userId: 'user_test123', email: 'test@example.com' },
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith('user.created', {
        userId: 'user_test123',
        email: 'test@example.com',
      });

      const responseData = await response.json();
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        message: 'Event user.created sent to Trigger.dev',
        result: mockResult,
      });

      assertResponse.headers(response, {
        'Content-Type': 'application/json',
      });
    });

    it('should handle missing request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        // No body
      });

      const response = await POST(request);

      await assertResponse.error(response, 400, 'Missing required fields');
    });

    it('should handle empty request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {},
      });

      const response = await POST(request);

      await assertResponse.error(response, 400, 'Missing required fields');
    });

    it('should handle missing event field', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          payload: { userId: 'user_test123' },
          // Missing event field
        },
      });

      const response = await POST(request);

      await assertResponse.error(response, 400, 'Missing required fields');
    });

    it('should handle null event field', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          event: null,
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      await assertResponse.error(response, 400, 'Missing required fields');
    });

    it('should handle empty string event field', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          event: '',
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      await assertResponse.error(response, 400, 'Missing required fields');
    });

    it('should allow events without payload', async () => {
      const mockResult = { success: true, id: 'trigger_test123' };
      const mockSendEvent = mockTrigger.mockSuccess(mockResult);

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'system.healthcheck',
          // No payload field
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith('system.healthcheck', undefined);
      expect(response.status).toBe(200);
    });

    it('should handle sendEvent errors', async () => {
      const mockSendEvent = mockTrigger.mockError(new Error('Trigger API failed'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.created',
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith('user.created', {
        userId: 'user_test123',
      });

      await assertResponse.error(response, 500, 'Failed to process event');
      
      const responseData = await response.json();
      expect(responseData.message).toBe('Trigger API failed');
    });

    it('should handle network timeouts', async () => {
      const mockSendEvent = mockTrigger.mockError(new Error('Network timeout'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.updated',
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      await assertResponse.error(response, 500, 'Failed to process event');

      const responseData = await response.json();
      expect(responseData.message).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      const mockSendEvent = mockTrigger.mockError('String error');

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.deleted',
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      await assertResponse.error(response, 500, 'Failed to process event');

      const responseData = await response.json();
      expect(responseData.message).toBe('Unknown error');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://localhost/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      }) as any;

      const response = await POST(request);

      await assertResponse.error(response, 500, 'Failed to process event');
    });

    it('should handle different event types', async () => {
      const testEvents = [
        { event: 'user.created', payload: { id: '1' } },
        { event: 'user.updated', payload: { id: '2' } },
        { event: 'user.deleted', payload: { id: '3' } },
        { event: 'organization.created', payload: { name: 'Test Org' } },
        { event: 'payment.completed', payload: { amount: 100 } },
      ];

      for (const testEvent of testEvents) {
        const mockSendEvent = mockTrigger.mockSuccess({ success: true });

        const request = createMockRequest({
          method: 'POST',
          body: testEvent,
        });

        const response = await POST(request);

        expect(mockSendEvent).toHaveBeenCalledWith(
          testEvent.event,
          testEvent.payload
        );
        expect(response.status).toBe(200);

        const responseData = await response.json();
        expect(responseData.message).toBe(
          `Event ${testEvent.event} sent to Trigger.dev`
        );

        vi.resetAllMocks();
      }
    });

    it('should handle large payloads', async () => {
      const mockResult = { success: true, id: 'trigger_large' };
      const mockSendEvent = mockTrigger.mockSuccess(mockResult);

      const largePayload = {
        userId: 'user_test123',
        data: 'x'.repeat(10000), // 10KB string
        metadata: {
          timestamp: Date.now(),
          source: 'api',
          nested: {
            level1: { level2: { level3: 'deep data' } },
          },
        },
      };

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'data.processed',
          payload: largePayload,
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith('data.processed', largePayload);
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests', async () => {
      const mockResults = [
        { success: true, id: 'trigger_1' },
        { success: true, id: 'trigger_2' },
        { success: true, id: 'trigger_3' },
      ];

      const requests = mockResults.map((result, index) => {
        mockTrigger.mockSuccess(result);

        return createMockRequest({
          method: 'POST',
          body: {
            event: `concurrent.event.${index}`,
            payload: { index },
          },
        });
      });

      const responses = await Promise.all(
        requests.map((request) => POST(request))
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });

    it('should preserve payload data types', async () => {
      const mockSendEvent = mockTrigger.mockSuccess({ success: true });

      const complexPayload = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: '2024-01-01T00:00:00.000Z',
      };

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'complex.data',
          payload: complexPayload,
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith('complex.data', complexPayload);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive error details', async () => {
      mockTrigger.mockError(new Error('Internal API key invalid'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'sensitive.event',
          payload: { data: 'test' },
        },
      });

      const response = await POST(request);

      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('Internal API key invalid');
    });

    it('should handle malformed request bodies gracefully', async () => {
      const request = new Request('http://localhost/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"event": "test", "payload":}', // Invalid JSON
      }) as any;

      const response = await POST(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
    });
  });
});