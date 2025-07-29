/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApiKeyController,
  deleteApiKeyController,
  listApiKeysController,
} from '../../app/api-keys/controller';
import { mockExternalServices, mockEnvironment } from '../utils/api-test-helpers';

describe('API Keys Controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  mockEnvironment({
    CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
  });

  describe('createApiKeyController', () => {
    it('should create API key successfully', async () => {
      const mockResponse = {
        id: 'key_test123',
        name: 'Test API Key',
        user_id: 'user_test123',
        scopes: ['read'],
        expires_at: '2024-12-31T23:59:59.000Z',
      };

      mockExternalServices.mockClerkAPI.success(mockResponse);

      const input = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      const result = await createApiKeyController(input);

      expect(result).toEqual({
        ...mockResponse,
        key: expect.stringMatching(/^sk_[a-f0-9]{64}$/),
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.clerk.com/v1/api_keys',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer sk_test_clerk_secret_key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"name":"Test API Key"'),
        })
      );
    });

    it('should validate input parameters', async () => {
      const input = {
        userId: 'user_test123',
        name: '', // Invalid: empty name
        scopes: ['read'],
        expiration: '30d',
      };

      await expect(createApiKeyController(input)).rejects.toThrow();
    });

    it('should validate expiration format', async () => {
      const input = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: 'invalid', // Invalid format
      };

      await expect(createApiKeyController(input)).rejects.toThrow();
    });

    it('should handle different expiration units', async () => {
      mockExternalServices.mockClerkAPI.success({});

      const testCases = [
        { expiration: '7d', expectedDays: 7 },
        { expiration: '3m', expectedMonths: 3 },
        { expiration: '1y', expectedYears: 1 },
      ];

      for (const testCase of testCases) {
        const input = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: testCase.expiration,
        };

        await createApiKeyController(input);

        const call = (fetch as any).mock.calls.pop();
        const body = JSON.parse(call[1].body);
        const expiresAt = new Date(body.expires_at);
        const now = new Date();

        if (testCase.expectedDays) {
          expect(expiresAt.getTime()).toBeGreaterThan(
            now.getTime() + (testCase.expectedDays - 1) * 24 * 60 * 60 * 1000
          );
        }
      }
    });

    it('should handle Clerk API errors', async () => {
      mockExternalServices.mockClerkAPI.error(400, { error: 'Invalid request' });

      const input = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      await expect(createApiKeyController(input)).rejects.toThrow(
        'Clerk API error'
      );
    });

    it('should handle network errors', async () => {
      mockExternalServices.mockClerkAPI.networkError();

      const input = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      await expect(createApiKeyController(input)).rejects.toThrow();
    });

    it('should generate secure API keys', async () => {
      mockExternalServices.mockClerkAPI.success({});

      const input = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      const result1 = await createApiKeyController(input);
      const result2 = await createApiKeyController(input);

      // Keys should be different
      expect(result1.key).not.toBe(result2.key);
      
      // Keys should follow the format
      expect(result1.key).toMatch(/^sk_[a-f0-9]{64}$/);
      expect(result2.key).toMatch(/^sk_[a-f0-9]{64}$/);
    });
  });

  describe('listApiKeysController', () => {
    it('should list API keys successfully', async () => {
      const mockResponse = [
        {
          id: 'key_test123',
          name: 'Test API Key 1',
          user_id: 'user_test123',
          scopes: ['read'],
          expires_at: '2024-12-31T23:59:59.000Z',
        },
        {
          id: 'key_test456',
          name: 'Test API Key 2',
          user_id: 'user_test123',
          scopes: ['read', 'write'],
          expires_at: '2024-12-31T23:59:59.000Z',
        },
      ];

      mockExternalServices.mockClerkAPI.success(mockResponse);

      const result = await listApiKeysController();

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.clerk.com/v1/api_keys',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer sk_test_clerk_secret_key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle empty response', async () => {
      mockExternalServices.mockClerkAPI.success([]);

      const result = await listApiKeysController();

      expect(result).toEqual([]);
    });

    it('should handle Clerk API errors', async () => {
      mockExternalServices.mockClerkAPI.error(500, { error: 'Internal error' });

      // Note: This controller doesn't handle errors, so fetch will return the error response
      const result = await listApiKeysController();
      expect(result).toEqual({ error: 'Internal error' });
    });
  });

  describe('deleteApiKeyController', () => {
    it('should delete API key successfully', async () => {
      mockExternalServices.mockClerkAPI.success({});

      const result = await deleteApiKeyController('key_test123');

      expect(result).toEqual({
        success: true,
        id: 'key_test123',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.clerk.com/v1/api_keys/key_test123',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer sk_test_clerk_secret_key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle Clerk API deletion errors', async () => {
      mockExternalServices.mockClerkAPI.error(404, { error: 'Not found' });

      await expect(deleteApiKeyController('key_nonexistent')).rejects.toThrow(
        'Clerk API error'
      );
    });

    it('should handle network errors', async () => {
      mockExternalServices.mockClerkAPI.networkError();

      await expect(deleteApiKeyController('key_test123')).rejects.toThrow();
    });
  });
});