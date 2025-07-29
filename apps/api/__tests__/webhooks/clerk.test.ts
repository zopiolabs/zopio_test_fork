/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/webhooks/clerk/route';
import {
  assertResponse,
  createMockRequest,
  mockAnalytics,
  mockEnvironment,
  mockExternalServices,
  mockLogger,
  webhookSignatures,
} from '../utils/api-test-helpers';

describe('Clerk Webhook', () => {
  let mockAnalyticsService: ReturnType<typeof mockAnalytics.mockPostHog>;
  let mockLogService: ReturnType<typeof mockLogger.mock>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    mockAnalyticsService = mockAnalytics.mockPostHog();
    mockLogService = mockLogger.mock();
  });

  mockEnvironment({
    CLERK_WEBHOOK_SECRET: 'whsec_test_secret_key',
  });

  describe('POST /webhooks/clerk', () => {
    it('should handle user.created event successfully', async () => {
      const userData = {
        id: 'user_test123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'John',
        last_name: 'Doe',
        created_at: Date.now(),
        image_url: 'https://example.com/avatar.jpg',
        phone_numbers: [{ phone_number: '+1234567890' }],
      };

      const webhookEvent = {
        type: 'user.created',
        data: userData,
      };

      mockExternalServices.mockSvixWebhook.verify('user.created', userData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: webhookEvent,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('User created');

      expect(mockAnalyticsService.identify).toHaveBeenCalledWith({
        distinctId: 'user_test123',
        properties: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: new Date(userData.created_at),
          avatar: 'https://example.com/avatar.jpg',
          phoneNumber: '+1234567890',
        },
      });

      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Created',
        distinctId: 'user_test123',
      });

      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle user.updated event successfully', async () => {
      const userData = {
        id: 'user_test123',
        email_addresses: [{ email_address: 'updated@example.com' }],
        first_name: 'Jane',
        last_name: 'Smith',
        created_at: Date.now(),
        image_url: 'https://example.com/new-avatar.jpg',
        phone_numbers: [],
      };

      const webhookEvent = {
        type: 'user.updated',
        data: userData,
      };

      mockExternalServices.mockSvixWebhook.verify('user.updated', userData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: webhookEvent,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('User updated');

      expect(mockAnalyticsService.identify).toHaveBeenCalledWith({
        distinctId: 'user_test123',
        properties: {
          email: 'updated@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          createdAt: new Date(userData.created_at),
          avatar: 'https://example.com/new-avatar.jpg',
          phoneNumber: undefined,
        },
      });

      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Updated',
        distinctId: 'user_test123',
      });
    });

    it('should handle user.deleted event successfully', async () => {
      const deleteData = {
        id: 'user_test123',
        deleted: true,
      };

      const webhookEvent = {
        type: 'user.deleted',
        data: deleteData,
      };

      mockExternalServices.mockSvixWebhook.verify('user.deleted', deleteData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: webhookEvent,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('User deleted');

      expect(mockAnalyticsService.identify).toHaveBeenCalledWith({
        distinctId: 'user_test123',
        properties: {
          deleted: expect.any(Date),
        },
      });

      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'User Deleted',
        distinctId: 'user_test123',
      });
    });

    it('should handle organization.created event successfully', async () => {
      const orgData = {
        id: 'org_test123',
        name: 'Test Organization',
        image_url: 'https://example.com/org-logo.jpg',
        created_by: 'user_test123',
      };

      const webhookEvent = {
        type: 'organization.created',
        data: orgData,
      };

      mockExternalServices.mockSvixWebhook.verify('organization.created', orgData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: webhookEvent,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('Organization created');

      expect(mockAnalyticsService.groupIdentify).toHaveBeenCalledWith({
        groupKey: 'org_test123',
        groupType: 'company',
        distinctId: 'user_test123',
        properties: {
          name: 'Test Organization',
          avatar: 'https://example.com/org-logo.jpg',
        },
      });

      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'Organization Created',
        distinctId: 'user_test123',
      });
    });

    it('should handle organizationMembership.created event successfully', async () => {
      const membershipData = {
        organization: { id: 'org_test123' },
        public_user_data: { user_id: 'user_test456' },
      };

      const webhookEvent = {
        type: 'organizationMembership.created',
        data: membershipData,
      };

      mockExternalServices.mockSvixWebhook.verify('organizationMembership.created', membershipData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: webhookEvent,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('Organization membership created');

      expect(mockAnalyticsService.groupIdentify).toHaveBeenCalledWith({
        groupKey: 'org_test123',
        groupType: 'company',
        distinctId: 'user_test456',
      });

      expect(mockAnalyticsService.capture).toHaveBeenCalledWith({
        event: 'Organization Member Created',
        distinctId: 'user_test456',
      });
    });

    it('should handle unknown event types gracefully', async () => {
      const unknownData = { id: 'unknown_test123' };

      const webhookEvent = {
        type: 'unknown.event',
        data: unknownData,
      };

      mockExternalServices.mockSvixWebhook.verify('unknown.event', unknownData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: webhookEvent,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Webhook received: id=unknown_test123, type=unknown.event'
      );

      // Analytics should not be called for unknown events
      expect(mockAnalyticsService.identify).not.toHaveBeenCalled();
      expect(mockAnalyticsService.capture).not.toHaveBeenCalled();
      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should return error when webhook secret is not configured', async () => {
      vi.doMock('@/env', () => ({
        env: { CLERK_WEBHOOK_SECRET: undefined },
      }));

      const request = createMockRequest({
        method: 'POST',
        body: { type: 'user.created', data: {} },
      });

      const response = await POST(request);

      const responseData = await response.json();
      expect(responseData).toEqual({
        message: 'Not configured',
        ok: false,
      });
    });

    it('should handle missing SVIX headers', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          // Missing SVIX headers
        },
        body: { type: 'user.created', data: {} },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Error occurred -- no svix headers');
    });

    it('should handle invalid webhook signatures', async () => {
      mockExternalServices.mockSvixWebhook.verifyError(new Error('Invalid signature'));

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'user.created', data: {} },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Error occurred');

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Error verifying webhook: Invalid signature'
      );
    });

    it('should handle webhook verification errors with non-Error objects', async () => {
      mockExternalServices.mockSvixWebhook.verifyError('String error');

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'user.created', data: {} },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockLogService.error).toHaveBeenCalledWith(
        'Error verifying webhook: String error'
      );
    });

    it('should handle partial SVIX headers', async () => {
      const incompleteHeaders = {
        'svix-id': 'msg_test123',
        // Missing svix-timestamp and svix-signature
      };

      const request = createMockRequest({
        method: 'POST',
        headers: incompleteHeaders,
        body: { type: 'user.created', data: {} },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Error occurred -- no svix headers');
    });

    it('should log all webhook events', async () => {
      const userData = { id: 'user_test123' };
      mockExternalServices.mockSvixWebhook.verify('user.created', userData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'user.created', data: userData },
      });

      await POST(request);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Webhook received: id=user_test123, type=user.created'
      );
    });

    it('should handle organization events without created_by', async () => {
      const orgData = {
        id: 'org_test123',
        name: 'Test Organization',
        image_url: 'https://example.com/org-logo.jpg',
        // Missing created_by field
      };

      mockExternalServices.mockSvixWebhook.verify('organization.created', orgData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'organization.created', data: orgData },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);

      expect(mockAnalyticsService.groupIdentify).toHaveBeenCalledWith({
        groupKey: 'org_test123',
        groupType: 'company',
        distinctId: undefined,
        properties: {
          name: 'Test Organization',
          avatar: 'https://example.com/org-logo.jpg',
        },
      });

      // Should not capture event without user ID
      expect(mockAnalyticsService.capture).not.toHaveBeenCalled();
    });

    it('should handle user deletion events without ID', async () => {
      const deleteData = {
        // Missing id field
        deleted: true,
      };

      mockExternalServices.mockSvixWebhook.verify('user.deleted', deleteData);

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'user.deleted', data: deleteData },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);

      // Should not call analytics methods without user ID
      expect(mockAnalyticsService.identify).not.toHaveBeenCalled();
      expect(mockAnalyticsService.capture).not.toHaveBeenCalled();
    });

    it('should handle concurrent webhook requests', async () => {
      const userData1 = { id: 'user_test1' };
      const userData2 = { id: 'user_test2' };

      mockExternalServices.mockSvixWebhook.verify('user.created', userData1);

      const requests = [userData1, userData2].map((data, index) => {
        const svixHeaders = webhookSignatures.createSvixHeaders();
        return createMockRequest({
          method: 'POST',
          headers: svixHeaders,
          body: { type: 'user.created', data },
        });
      });

      const responses = await Promise.all(requests.map(req => POST(req)));

      for (const response of responses) {
        expect(response.status).toBe(201);
      }

      expect(mockAnalyticsService.shutdown).toHaveBeenCalledTimes(2);
    });
  });

  describe('Analytics Integration', () => {
    it('should always shutdown analytics service', async () => {
      mockExternalServices.mockSvixWebhook.verifyError(new Error('Invalid signature'));

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'user.created', data: {} },
      });

      await POST(request);

      expect(mockAnalyticsService.shutdown).toHaveBeenCalled();
    });

    it('should handle analytics service errors gracefully', async () => {
      const userData = { id: 'user_test123' };
      mockExternalServices.mockSvixWebhook.verify('user.created', userData);
      mockAnalyticsService.identify.mockRejectedValue(new Error('Analytics error'));

      const svixHeaders = webhookSignatures.createSvixHeaders();
      const request = createMockRequest({
        method: 'POST',
        headers: svixHeaders,
        body: { type: 'user.created', data: userData },
      });

      // Should not throw, but handle analytics errors gracefully
      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });
});