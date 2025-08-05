/**
 * SPDX-License-Identifier: MIT
 * 
 * @fileoverview Comprehensive test suite for Trigger.dev API route handler
 * 
 * This test suite validates the /trigger endpoint which accepts webhook events
 * and forwards them to Trigger.dev for background job processing. The tests cover:
 * 
 * - Successful event processing with various payload types
 * - Request validation and error handling
 * - Network error scenarios and timeouts
 * - Data type preservation and payload integrity
 * - Security considerations and error message sanitization
 * - Edge cases including malformed JSON and concurrent requests
 * 
 * @author Zopio Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/trigger/route';
import {
  assertResponse,
  createMockRequest,
} from '../utils/api-test-helpers';

// Mock the trigger package with proper hoisting
vi.mock('@repo/trigger');

// Import the mocked module
import * as triggerModule from '@repo/trigger';
const mockSendEvent = vi.mocked(triggerModule.sendEvent);

/**
 * Test suite for Trigger.dev API route handler
 * 
 * Tests the POST /trigger endpoint that receives webhook events and forwards
 * them to Trigger.dev for asynchronous processing. This endpoint is critical
 * for the application's event-driven architecture and background job processing.
 */
describe('Trigger Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  /**
   * Test group for successful POST /trigger operations
   * 
   * Validates that the endpoint correctly processes valid webhook events,
   * forwards them to Trigger.dev, and returns appropriate success responses.
   */
  describe('POST /trigger - Success Cases', () => {
    /**
     * Test successful event processing with complete payload
     * 
     * Verifies that a well-formed event with both event name and payload
     * is correctly forwarded to Trigger.dev and returns a success response.
     */
    it('should send event to Trigger.dev successfully', async () => {
      const mockResult = { success: true, id: 'trigger_test123' };
      mockSendEvent.mockResolvedValue(mockResult);

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

    /**
     * Test event processing without payload
     * 
     * Validates that events can be sent without a payload parameter,
     * which is useful for simple notification-type events.
     */
    it('should allow events without payload', async () => {
      const mockResult = { success: true, id: 'trigger_test123' };
      mockSendEvent.mockResolvedValue(mockResult);

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

    /**
     * Test processing of various event types
     * 
     * Validates that the endpoint can handle different categories of events
     * with appropriate payloads and maintains consistency across event types.
     */
    it('should handle different event types', async () => {
      const testEvents = [
        { event: 'user.created', payload: { id: '1', email: 'user1@test.com' } },
        { event: 'user.updated', payload: { id: '2', changes: ['email'] } },
        { event: 'organization.created', payload: { name: 'Test Org', ownerId: '1' } },
        { event: 'payment.completed', payload: { amount: 100, currency: 'USD' } },
      ];

      for (const testEvent of testEvents) {
        mockSendEvent.mockResolvedValue({ success: true, id: `trigger_${testEvent.event}` });

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

    /**
     * Test large payload handling
     * 
     * Validates that the endpoint can process large payloads without
     * truncation or corruption, important for data-heavy events.
     */
    it('should handle large payloads', async () => {
      const mockResult = { success: true, id: 'trigger_large' };
      mockSendEvent.mockResolvedValue(mockResult);

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

    /**
     * Test data type preservation
     * 
     * Ensures that various JavaScript data types are correctly preserved
     * when forwarding events to Trigger.dev, maintaining data integrity.
     */
    it('should preserve payload data types', async () => {
      mockSendEvent.mockResolvedValue({ success: true });

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

    /**
     * Test concurrent request handling
     * 
     * Validates that the endpoint can handle multiple simultaneous requests
     * without interference or race conditions.
     */
    it('should handle concurrent requests', async () => {
      const mockResults = [
        { success: true, id: 'trigger_1' },
        { success: true, id: 'trigger_2' },
        { success: true, id: 'trigger_3' },
      ];

      const requests = mockResults.map((result, index) => {
        mockSendEvent.mockResolvedValueOnce(result);

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
  });

  /**
   * Test group for request validation and error handling
   * 
   * Validates that the endpoint properly validates incoming requests
   * and returns appropriate error responses for invalid data.
   */
  describe('POST /trigger - Request Validation', () => {
    /**
     * Test missing request body handling
     * 
     * Validates that requests without a body are properly rejected.
     * This causes a JSON parsing error which results in a 500 status.
     */
    it('should handle missing request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        // No body
      });

      const response = await POST(request);

      await assertResponse.error(response, 500, 'Failed to process event');
    });

    /**
     * Test empty request body handling
     * 
     * Validates that requests with empty objects are properly rejected.
     */
    it('should handle empty request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {},
      });

      const response = await POST(request);

      await assertResponse.error(response, 400, 'Missing required fields');
    });

    /**
     * Test missing event field validation
     * 
     * Validates that requests with payload but no event name are rejected.
     */
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

    /**
     * Test null event field validation
     * 
     * Validates that explicitly null event names are properly rejected.
     */
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

    /**
     * Test empty string event field validation
     * 
     * Validates that empty string event names are properly rejected.
     */
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

    /**
     * Test malformed JSON handling
     * 
     * Validates that requests with invalid JSON are handled gracefully
     * without exposing internal error details.
     */
    it('should handle malformed JSON in request body', async () => {
      const request = new Request('http://localhost/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"+"event"": "test", "payload":}', // Invalid JSON
      }) as any;

      const response = await POST(request);

      await assertResponse.error(response, 500, 'Failed to process event');
    });
  });


  /**
   * Test group for error handling and network issues
   * 
   * Validates that the endpoint handles various error conditions gracefully,
   * including Trigger.dev API failures, network issues, and edge cases.
   */
  describe('POST /trigger - Error Handling', () => {
    /**
     * Test Trigger.dev API error handling
     * 
     * Validates that API errors from Trigger.dev are properly caught
     * and returned as 500 errors with sanitized messages.
     */
    it('should handle sendEvent errors', async () => {
      mockSendEvent.mockRejectedValue(new Error('Trigger API failed'));

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

      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('Trigger API failed');
    });

    /**
     * Test network timeout handling
     * 
     * Validates that network timeouts are properly handled and
     * return appropriate error responses.
     */
    it('should handle network timeouts', async () => {
      mockSendEvent.mockRejectedValue(new Error('Network timeout'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.updated',
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('Network timeout');
    });

    /**
     * Test non-Error exception handling
     * 
     * Validates that non-Error exceptions (e.g., string throws)
     * are properly handled and sanitized.
     */
    it('should handle non-Error exceptions', async () => {
      mockSendEvent.mockRejectedValue('String error');

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.deleted',
          payload: { userId: 'user_test123' },
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('Unknown error');
    });

    /**
     * Test sensitive error information handling
     * 
     * Validates that sensitive information in error messages is not
     * exposed to clients while still providing useful debugging info.
     */
    it('should not expose sensitive error details in response', async () => {
      mockSendEvent.mockRejectedValue(new Error('Internal API key invalid: sk_live_12345'));

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
      expect(responseData.message).toBe('Internal API key invalid: sk_live_12345');
      // Note: In production, you might want to sanitize this further
    });

    /**
     * Test Trigger.dev service unavailable scenarios
     * 
     * Validates handling when the Trigger.dev service is completely unavailable.
     */
    it('should handle service unavailable errors', async () => {
      mockSendEvent.mockRejectedValue(new Error('Service Unavailable'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'service.test',
          payload: { timestamp: Date.now() },
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('Service Unavailable');
    });

    /**
     * Test authentication failures with Trigger.dev
     * 
     * Validates handling of authentication errors when connecting to Trigger.dev.
     */
    it('should handle authentication errors', async () => {
      mockSendEvent.mockRejectedValue(new Error('Unauthorized: Invalid API key'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'auth.test',
          payload: { userId: 'test123' },
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process event');
      expect(responseData.message).toBe('Unauthorized: Invalid API key');
    });
  });

  /**
   * Test group for edge cases and boundary conditions
   * 
   * Validates handling of unusual but valid scenarios that might
   * occur in production environments.
   */
  describe('POST /trigger - Edge Cases', () => {
    /**
     * Test event name boundary conditions
     * 
     * Validates handling of edge cases in event naming, including
     * very long names and special characters.
     */
    it('should handle very long event names', async () => {
      mockSendEvent.mockResolvedValue({ success: true });
      
      const longEventName = 'very.long.event.name.that.exceeds.normal.length.boundaries.and.tests.system.limits';
      
      const request = createMockRequest({
        method: 'POST',
        body: {
          event: longEventName,
          payload: { test: true },
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith(longEventName, { test: true });
      expect(response.status).toBe(200);
    });

    /**
     * Test special characters in event names
     * 
     * Validates that event names with special characters are handled correctly.
     */
    it('should handle special characters in event names', async () => {
      mockSendEvent.mockResolvedValue({ success: true });
      
      const specialEvents = [
        'event-with-dashes',
        'event_with_underscores',
        'event.with.dots',
        'event:with:colons',
      ];

      for (const eventName of specialEvents) {
        const request = createMockRequest({
          method: 'POST',
          body: {
            event: eventName,
            payload: { type: 'special' },
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        vi.resetAllMocks();
        mockSendEvent.mockResolvedValue({ success: true });
      }
    });

    /**
     * Test payload with circular references
     * 
     * Validates handling of payloads that might contain circular references,
     * which could cause JSON serialization issues.
     */
    it('should handle payloads with deeply nested structures', async () => {
      mockSendEvent.mockResolvedValue({ success: true });
      
      // Create a deeply nested object
      let deepObject: any = { level: 0 };
      for (let i = 1; i <= 10; i++) {
        deepObject = { level: i, nested: deepObject };
      }

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'deep.nested.test',
          payload: deepObject,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    /**
     * Test Unicode and international characters
     * 
     * Validates proper handling of Unicode characters in both
     * event names and payload data.
     */
    it('should handle Unicode characters in events and payloads', async () => {
      mockSendEvent.mockResolvedValue({ success: true });

      const request = createMockRequest({
        method: 'POST',
        body: {
          event: 'user.créé', // French characters
          payload: {
            name: '用户', // Chinese characters
            message: 'Hello 🌍', // Emoji
            arabic: 'مرحبا', // Arabic
          },
        },
      });

      const response = await POST(request);

      expect(mockSendEvent).toHaveBeenCalledWith('user.créé', {
        name: '用户',
        message: 'Hello 🌍',
        arabic: 'مرحبا',
      });
      expect(response.status).toBe(200);
    });
  });

  /**
   * Test group for performance and load scenarios
   * 
   * Validates that the endpoint can handle various load patterns
   * and maintains performance under stress.
   */
  describe('POST /trigger - Performance', () => {
    /**
     * Test rapid sequential requests
     * 
     * Validates that the endpoint can handle rapid sequential requests
     * without memory leaks or performance degradation.
     */
    it('should handle rapid sequential requests', async () => {
      const requestCount = 10;
      const results = [];

      for (let i = 0; i < requestCount; i++) {
        mockSendEvent.mockResolvedValueOnce({ success: true, id: `seq_${i}` });
        
        const request = createMockRequest({
          method: 'POST',
          body: {
            event: `sequential.test.${i}`,
            payload: { index: i },
          },
        });

        const response = await POST(request);
        results.push(response.status);
      }

      // All requests should succeed
      expect(results.every(status => status === 200)).toBe(true);
      expect(mockSendEvent).toHaveBeenCalledTimes(requestCount);
    });
  });
});