/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from '../../app/api-keys/route';
import {
  assertResponse,
  createAuthenticatedRequest,
  createMockRequest,
  mockClerkAuth,
} from '../utils/api-test-helpers';

// Mock the controller functions
vi.mock('../../app/api-keys/controller', () => ({
  createApiKeyController: vi.fn(),
  listApiKeysController: vi.fn(),
  deleteApiKeyController: vi.fn(),
}));

import {
  createApiKeyController,
  deleteApiKeyController,
  listApiKeysController,
} from '../../app/api-keys/controller';

describe('API Keys Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  describe('POST /api-keys', () => {
    it('should create API key with valid authentication', async () => {
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(createApiKeyController);
      
      const expectedResult = {
        id: 'key_test123',
        name: 'Test API Key',
        key: 'sk_test_generated_key',
      };
      
      mockController.mockResolvedValue(expectedResult);

      const request = createAuthenticatedRequest('valid_token', {
        method: 'POST',
        body: {
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '30d',
        },
      });

      const response = await POST(request);

      expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
      expect(mockController).toHaveBeenCalledWith({
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      });
      
      await assertResponse.success(response, expectedResult);
    });

    it('should handle authentication failure', async () => {
      mockClerkAuth.mockFailure(401, 'Unauthorized');

      const request = createMockRequest({
        method: 'POST',
        body: { name: 'Test API Key' },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should handle controller errors', async () => {
      mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(createApiKeyController);
      mockController.mockRejectedValue(new Error('Controller error'));

      const request = createAuthenticatedRequest('valid_token', {
        method: 'POST',
        body: {
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '30d',
        },
      });

      await expect(POST(request)).rejects.toThrow('Controller error');
    });

    it('should handle invalid JSON body', async () => {
      mockClerkAuth.mockSuccess('user_test123');

      const request = new Request('http://localhost/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      }) as any;

      await expect(POST(request)).rejects.toThrow();
    });

    it('should handle missing request body', async () => {
      mockClerkAuth.mockSuccess('user_test123');

      const request = createAuthenticatedRequest('valid_token', {
        method: 'POST',
        // No body
      });

      await expect(POST(request)).rejects.toThrow();
    });
  });

  describe('GET /api-keys', () => {
    it('should list API keys with valid authentication', async () => {
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(listApiKeysController);
      
      const expectedResult = [
        {
          id: 'key_test123',
          name: 'Test API Key 1',
          scopes: ['read'],
        },
        {
          id: 'key_test456',
          name: 'Test API Key 2',
          scopes: ['read', 'write'],
        },
      ];
      
      mockController.mockResolvedValue(expectedResult);

      const request = createAuthenticatedRequest('valid_token');

      const response = await GET(request);

      expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
      expect(mockController).toHaveBeenCalledWith();
      
      await assertResponse.success(response, expectedResult);
    });

    it('should handle authentication failure', async () => {
      mockClerkAuth.mockFailure(403, 'Forbidden');

      const request = createMockRequest();

      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should handle empty API key list', async () => {
      mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(listApiKeysController);
      mockController.mockResolvedValue([]);

      const request = createAuthenticatedRequest('valid_token');

      const response = await GET(request);

      await assertResponse.success(response, []);
    });

    it('should handle controller errors', async () => {
      mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(listApiKeysController);
      mockController.mockRejectedValue(new Error('List error'));

      const request = createAuthenticatedRequest('valid_token');

      await expect(GET(request)).rejects.toThrow('List error');
    });
  });

  describe('DELETE /api-keys', () => {
    it('should delete API key with valid authentication and ID', async () => {
      const mockAuthMiddleware = mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(deleteApiKeyController);
      
      const expectedResult = {
        success: true,
        id: 'key_test123',
      };
      
      mockController.mockResolvedValue(expectedResult);

      const request = createAuthenticatedRequest('valid_token', {
        method: 'DELETE',
        url: 'http://localhost/api-keys',
        searchParams: { id: 'key_test123' },
      });

      const response = await DELETE(request);

      expect(mockAuthMiddleware).toHaveBeenCalledWith(request);
      expect(mockController).toHaveBeenCalledWith('key_test123');
      
      await assertResponse.success(response, expectedResult);
    });

    it('should handle missing ID parameter', async () => {
      mockClerkAuth.mockSuccess('user_test123');

      const request = createAuthenticatedRequest('valid_token', {
        method: 'DELETE',
        url: 'http://localhost/api-keys',
        // No id parameter
      });

      const response = await DELETE(request);

      await assertResponse.error(response, 400, 'Missing id parameter');
    });

    it('should handle authentication failure', async () => {
      mockClerkAuth.mockFailure(401, 'Unauthorized');

      const request = createMockRequest({
        method: 'DELETE',
        searchParams: { id: 'key_test123' },
      });

      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });

    it('should handle controller errors', async () => {
      mockClerkAuth.mockSuccess('user_test123');
      const mockController = vi.mocked(deleteApiKeyController);
      mockController.mockRejectedValue(new Error('Delete error'));

      const request = createAuthenticatedRequest('valid_token', {
        method: 'DELETE',
        searchParams: { id: 'key_test123' },
      });

      await expect(DELETE(request)).rejects.toThrow('Delete error');
    });

    it('should handle empty ID parameter', async () => {
      mockClerkAuth.mockSuccess('user_test123');

      const request = createAuthenticatedRequest('valid_token', {
        method: 'DELETE',
        searchParams: { id: '' },
      });

      const response = await DELETE(request);

      await assertResponse.error(response, 400, 'Missing id parameter');
    });

    it('should handle URL parsing errors', async () => {
      mockClerkAuth.mockSuccess('user_test123');

      // Create a request with an invalid URL to test error handling
      const request = createAuthenticatedRequest('valid_token', {
        method: 'DELETE',
        url: 'not-a-valid-url',
      });

      await expect(DELETE(request)).rejects.toThrow();
    });
  });

  describe('Authentication Integration', () => {
    it('should pass user information from auth middleware', async () => {
      const userId = 'user_specific_123';
      mockClerkAuth.mockSuccess(userId);
      const mockController = vi.mocked(createApiKeyController);
      mockController.mockResolvedValue({});

      const request = createAuthenticatedRequest('valid_token', {
        method: 'POST',
        body: {
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '30d',
        },
      });

      // Mock the request object to have user property
      Object.defineProperty(request, 'user', {
        value: { id: userId },
        writable: true,
      });

      await POST(request);

      // Verify that the controller receives the expected data
      expect(mockController).toHaveBeenCalledWith({
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      });
    });

    it('should handle auth middleware response objects', async () => {
      const errorResponse = new Response('Auth failed', { status: 403 });
      mockClerkAuth.mockFailure(403, 'Auth failed');

      const request = createMockRequest({
        method: 'POST',
        body: { name: 'Test' },
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Type Guard Function', () => {
    it('should correctly identify Response objects', async () => {
      // Test the isResponse type guard indirectly through the route handlers
      const response = new Response('Error', { status: 400 });
      mockClerkAuth.mockFailure(400, 'Error');

      const request = createMockRequest({
        method: 'GET',
      });

      const result = await GET(request);

      expect(result.status).toBe(400);
    });
  });
});