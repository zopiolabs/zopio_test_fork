/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/webhooks/stripe/route';
import {
  assertResponse,
  createMockRequest,
  mockAnalytics,
  mockEnvironment,
  mockErrorParser,
  mockExternalServices,
  mockLogger,
  webhookSignatures,
} from '../utils/api-test-helpers';

describe('Stripe Webhook', () => {
  let mockAnalyticsService: ReturnType<typeof mockAnalytics.mockPostHog>;
  let mockLogService: ReturnType<typeof mockLogger.mock>;
  let mockParseError: ReturnType<typeof mockErrorParser.mock>;
  let mockClerkClient: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    mockAnalyticsService = mockAnalytics.mockPostHog();
    mockLogService = mockLogger.mock();
    mockParseError = mockErrorParser.mock();

    // Mock clerk client
    mockClerkClient = {
      users: {
        getUserList: vi.fn(),
      },
    };

    vi.doMock('@repo/auth/server', () => ({
      clerkClient: vi.fn().mockResolvedValue(mockClerkClient),
    }));
  });

  mockEnvironment({
    STRIPE_WEBHOOK_SECRET: 'whsec_test_stripe_secret',
  });

  describe('POST /webhooks/stripe', () => {
    it('should handle checkout.session.completed event successfully', async () => {
      const checkoutSession = {
        id: 'cs_test123',
        customer: 'cus_test123',
        payment_status: 'paid',
        amount_total: 2000,
      };

      const userData = [
        {
          id: 'user_test123',
          privateMetadata: { stripeCustomerId: 'cus_test123' },
        },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: userData });
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const stripeSignature = webhookSignatures.createStripeSignature(
        JSON.stringify({ type: 'checkout.session.completed', data: { object: checkoutSession } }),
        'whsec_test_stripe_secret'
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': stripeSignature,
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.ok).toBe(true);

      expect(mockClerkClient.users.getUserList).toHaveBeenCalled();
      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Subscribed',
        distinctId: 'user_test123',
      });
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle subscription_schedule.canceled event successfully', async () => {
      const subscriptionSchedule = {
        id: 'sub_sched_test123',
        customer: 'cus_test456',
        status: 'canceled',
      };

      const userData = [
        {
          id: 'user_test456',
          privateMetadata: { stripeCustomerId: 'cus_test456' },
        },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: userData });
      mockExternalServices.mockStripeWebhook.constructEvent(
        'subscription_schedule.canceled',
        subscriptionSchedule
      );

      const stripeSignature = webhookSignatures.createStripeSignature(
        JSON.stringify({ type: 'subscription_schedule.canceled', data: { object: subscriptionSchedule } }),
        'whsec_test_stripe_secret'
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': stripeSignature,
        },
        body: JSON.stringify({
          type: 'subscription_schedule.canceled',
          data: { object: subscriptionSchedule },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Unsubscribed',
        distinctId: 'user_test456',
      });
    });

    it('should handle events with customer object instead of string', async () => {
      const checkoutSession = {
        id: 'cs_test123',
        customer: { id: 'cus_test789' }, // Customer as object
        payment_status: 'paid',
      };

      const userData = [
        {
          id: 'user_test789',
          privateMetadata: { stripeCustomerId: 'cus_test789' },
        },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: userData });
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Subscribed',
        distinctId: 'user_test789',
      });
    });

    it('should handle events without customer', async () => {
      const checkoutSession = {
        id: 'cs_test123',
        // No customer field
        payment_status: 'paid',
      };

      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // Should not call getUserList or analytics.capture
      expect(mockClerkClient.users.getUserList).not.toHaveBeenCalled();
      expect(mockAnalyticsService.capture).not.toHaveBeenCalled();
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle events when user not found in Clerk', async () => {
      const checkoutSession = {
        id: 'cs_test123',
        customer: 'cus_nonexistent',
        payment_status: 'paid',
      };

      // No matching user found
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [] });
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockClerkClient.users.getUserList).toHaveBeenCalled();
      
      // Should not call analytics.capture for non-existent user
      expect(mockAnalyticsService.capture).not.toHaveBeenCalled();
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle unhandled event types', async () => {
      const unknownEvent = {
        id: 'evt_unknown123',
        type: 'unknown.event',
      };

      mockExternalServices.mockStripeWebhook.constructEvent(
        'unknown.event',
        unknownEvent
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'unknown.event',
          data: { object: unknownEvent },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockLogService.warn).toHaveBeenCalledWith(
        'Unhandled event type unknown.event'
      );
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should return error when webhook secret is not configured', async () => {
      vi.doMock('@/env', () => ({
        env: { STRIPE_WEBHOOK_SECRET: undefined },
      }));

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST(request);

      const responseData = await response.json();
      expect(responseData).toEqual({
        message: 'Not configured',
        ok: false,
      });
    });

    it('should handle missing stripe-signature header', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          // Missing stripe-signature header
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.message).toBe('something went wrong');
      expect(responseData.ok).toBe(false);

      expect(mockParseError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'missing stripe-signature header',
        })
      );
    });

    it('should handle invalid webhook signatures', async () => {
      mockExternalServices.mockStripeWebhook.constructEventError(
        new Error('Invalid signature')
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.message).toBe('something went wrong');
      expect(responseData.ok).toBe(false);

      expect(mockLogService.error).toHaveBeenCalled();
    });

    it('should handle Clerk API errors', async () => {
      const checkoutSession = {
        id: 'cs_test123',
        customer: 'cus_test123',
      };

      mockClerkClient.users.getUserList.mockRejectedValue(
        new Error('Clerk API error')
      );
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockLogService.error).toHaveBeenCalled();
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle analytics service errors', async () => {
      const checkoutSession = {
        id: 'cs_test123',
        customer: 'cus_test123',
      };

      const userData = [
        {
          id: 'user_test123',
          privateMetadata: { stripeCustomerId: 'cus_test123' },
        },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: userData });
      mockAnalyticsService.capture.mockRejectedValue(new Error('Analytics error'));
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle request body parsing errors', async () => {
      const request = new Request('http://localhost/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      }) as any;

      const response = await POST(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.ok).toBe(false);
    });

    it('should find users with matching stripe customer IDs', async () => {
      const checkoutSession = {
        customer: 'cus_target123',
      };

      const userData = [
        {
          id: 'user_1',
          privateMetadata: { stripeCustomerId: 'cus_other123' },
        },
        {
          id: 'user_2',
          privateMetadata: { stripeCustomerId: 'cus_target123' }, // This should match
        },
        {
          id: 'user_3',
          privateMetadata: { stripeCustomerId: 'cus_another123' },
        },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: userData });
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Subscribed',
        distinctId: 'user_2', // Should match the correct user
      });
    });

    it('should handle concurrent webhook requests', async () => {
      const sessions = [
        { customer: 'cus_test1', id: 'cs_1' },
        { customer: 'cus_test2', id: 'cs_2' },
      ];

      const users = [
        { id: 'user_1', privateMetadata: { stripeCustomerId: 'cus_test1' } },
        { id: 'user_2', privateMetadata: { stripeCustomerId: 'cus_test2' } },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: users });

      const requests = sessions.map((session) => {
        mockExternalServices.mockStripeWebhook.constructEvent(
          'checkout.session.completed',
          session
        );

        return createMockRequest({
          method: 'POST',
          headers: {
            'stripe-signature': 'valid_signature',
          },
          body: JSON.stringify({
            type: 'checkout.session.completed',
            data: { object: session },
          }),
        });
      });

      const responses = await Promise.all(requests.map(req => POST(req)));

      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      expect(mockAnalyticsService.shutdown).toHaveBeenCalledTimes(2);
    });

    it('should handle users without stripe customer metadata', async () => {
      const checkoutSession = {
        customer: 'cus_test123',
      };

      const userData = [
        {
          id: 'user_1',
          privateMetadata: {}, // No stripeCustomerId
        },
        {
          id: 'user_2',
          privateMetadata: { otherField: 'value' }, // No stripeCustomerId
        },
      ];

      mockClerkClient.users.getUserList.mockResolvedValue({ data: userData });
      mockExternalServices.mockStripeWebhook.constructEvent(
        'checkout.session.completed',
        checkoutSession
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: { object: checkoutSession },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // Should not find any matching user
      expect(mockAnalyticsService.capture).not.toHaveBeenCalled();
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log all errors with parseError utility', async () => {
      const error = new Error('Test error');
      mockParseError.mockReturnValue('Parsed error message');
      
      mockExternalServices.mockStripeWebhook.constructEventError(error);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      });

      await POST(request);

      expect(mockParseError).toHaveBeenCalledWith(error);
      expect(mockLogService.error).toHaveBeenCalledWith('Parsed error message');
    });

    it('should always shutdown analytics even on errors', async () => {
      mockExternalServices.mockStripeWebhook.constructEventError(
        new Error('Webhook error')
      );

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'test.event' }),
      });

      await POST(request);

      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });
  });
});