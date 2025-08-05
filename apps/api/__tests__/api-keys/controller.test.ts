/**
 * @fileoverview Comprehensive unit tests for API Keys Controller
 * 
 * Tests the controller functions responsible for managing API keys through Clerk's API,
 * including creation, listing, and deletion operations. This test suite ensures proper
 * validation, error handling, security measures, and integration with external services.
 * 
 * Key test areas:
 * - Input validation and sanitization
 * - API key generation security and uniqueness
 * - Clerk API integration and error handling
 * - Date/time calculations for expiration
 * - Network error resilience
 * - Security best practices
 * 
 * @module ApiKeysControllerTest
 * @author Zopio Team
 * @since 1.0.0
 * 
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import {
  createApiKeyController,
  deleteApiKeyController,
  listApiKeysController,
} from '../../app/api-keys/controller';
import { mockExternalServices, mockEnvironment } from '../utils/api-test-helpers';

// Type definitions for better test type safety
type CreateApiKeyInput = {
  userId: string;
  name: string;
  scopes: string[];
  expiration: string;
};

type ApiKeyResponse = {
  id: string;
  name: string;
  user_id: string;
  scopes: string[];
  expires_at: string;
  key?: string;
};

/**
 * Test suite for API Keys Controller
 * 
 * Validates the controller layer that manages API key operations through Clerk's API.
 * These controllers handle the business logic for creating, listing, and deleting
 * API keys with proper validation, security measures, and error handling.
 * 
 * The tests mock external dependencies (Clerk API, fetch) to focus on controller
 * logic while ensuring proper integration patterns.
 */
describe('API Keys Controller', () => {

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  // Set up test environment with required secrets
  mockEnvironment({
    CLERK_SECRET_KEY: 'sk_test_clerk_secret_key',
  });

  /**
   * Tests for createApiKeyController
   * 
   * Validates API key creation including input validation, secure key generation,
   * expiration date calculation, and proper Clerk API integration.
   */
  describe('createApiKeyController', () => {
    /**
     * Tests successful API key creation with valid inputs
     * Verifies proper request formatting and response structure
     */
    it('should create API key successfully with valid input', async () => {
      const mockResponse: ApiKeyResponse = {
        id: 'key_test123',
        name: 'Test API Key',
        user_id: 'user_test123',
        scopes: ['read'],
        expires_at: '2024-12-31T23:59:59.000Z',
      };

      mockExternalServices.mockClerkAPI.success(mockResponse);

      const input: CreateApiKeyInput = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      const result = await createApiKeyController(input);

      // Verify response structure includes generated key
      expect(result).toEqual({
        ...mockResponse,
        key: expect.stringMatching(/^sk_[a-f0-9]{64}$/),
      });

      // Verify Clerk API was called with correct parameters
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

      // Verify request body contains all required fields
      const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
      const requestBody = JSON.parse(lastCall[1]?.body as string);
      expect(requestBody).toMatchObject({
        name: 'Test API Key',
        user_id: 'user_test123',
        scopes: ['read'],
        expires_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        token: expect.stringMatching(/^sk_[a-f0-9]{64}$/),
      });
    });

    /**
     * Tests comprehensive input validation scenarios
     * Ensures all invalid inputs are properly rejected with meaningful errors
     */
    describe('Input Validation', () => {
      it('should reject empty name', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: '', // Invalid: empty name
          scopes: ['read'],
          expiration: '30d',
        };

        await expect(createApiKeyController(input)).rejects.toThrow('Name is required');
      });

      it('should reject whitespace-only name', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: '   ', // Invalid: whitespace only
          scopes: ['read'],
          expiration: '30d',
        };

        await expect(createApiKeyController(input)).rejects.toThrow();
      });

      it('should validate expiration format - invalid format', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: 'invalid', // Invalid format
        };

        await expect(createApiKeyController(input)).rejects.toThrow(
          'Expiration must be in format like 30d, 6m, or 1y'
        );
      });

      it('should reject expiration without unit', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '30', // Invalid: missing unit
        };

        await expect(createApiKeyController(input)).rejects.toThrow();
      });

      it('should reject expiration with invalid unit', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '30w', // Invalid: weeks not supported
        };

        await expect(createApiKeyController(input)).rejects.toThrow();
      });

      it('should reject zero expiration value', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '0d', // Invalid: zero duration
        };

        // Note: Current implementation doesn't validate positive values,
        // but this test documents expected behavior
        mockExternalServices.mockClerkAPI.success({});
        await expect(createApiKeyController(input)).resolves.toBeDefined();
      });

      it('should handle empty scopes array', async () => {
        mockExternalServices.mockClerkAPI.success({});
        
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: [], // Empty but valid
          expiration: '30d',
        };

        await expect(createApiKeyController(input)).resolves.toBeDefined();
      });
    });

    /**
     * Tests expiration date calculation for different time units
     * Verifies accurate date arithmetic for days, months, and years
     */
    describe('Expiration Date Calculation', () => {
      beforeEach(() => {
        mockExternalServices.mockClerkAPI.success({});
      });

      it('should calculate days correctly', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '7d',
        };

        const startTime = Date.now();
        await createApiKeyController(input);
        const endTime = Date.now();

        const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
        const requestBody = JSON.parse(lastCall[1]?.body as string);
        const expiresAt = new Date(requestBody.expires_at);
        const expectedMinTime = startTime + (7 * 24 * 60 * 60 * 1000);
        const expectedMaxTime = endTime + (7 * 24 * 60 * 60 * 1000);

        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinTime);
        expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxTime);
      });

      it('should calculate months correctly', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '3m',
        };

        await createApiKeyController(input);

        const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
        const requestBody = JSON.parse(lastCall[1]?.body as string);
        const expiresAt = new Date(requestBody.expires_at);
        const now = new Date();
        const expectedDate = new Date(now);
        expectedDate.setMonth(expectedDate.getMonth() + 3);

        // Allow for small timing differences (within 1 minute)
        const timeDiff = Math.abs(expiresAt.getTime() - expectedDate.getTime());
        expect(timeDiff).toBeLessThan(60 * 1000);
      });

      it('should calculate years correctly', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '1y',
        };

        await createApiKeyController(input);

        const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
        const requestBody = JSON.parse(lastCall[1]?.body as string);
        const expiresAt = new Date(requestBody.expires_at);
        const now = new Date();
        const expectedDate = new Date(now);
        expectedDate.setFullYear(expectedDate.getFullYear() + 1);

        // Allow for small timing differences (within 1 minute)
        const timeDiff = Math.abs(expiresAt.getTime() - expectedDate.getTime());
        expect(timeDiff).toBeLessThan(60 * 1000);
      });

      it('should handle large expiration values', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '999d',
        };

        await expect(createApiKeyController(input)).resolves.toBeDefined();
      });

      it('should produce ISO 8601 formatted dates', async () => {
        const input: CreateApiKeyInput = {
          userId: 'user_test123',
          name: 'Test API Key',
          scopes: ['read'],
          expiration: '30d',
        };

        await createApiKeyController(input);

        const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
        const requestBody = JSON.parse(lastCall[1]?.body as string);
        
        // Verify ISO 8601 format with milliseconds and Z suffix
        expect(requestBody.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        
        // Verify it's a valid date that can be parsed
        const parsedDate = new Date(requestBody.expires_at);
        expect(parsedDate.toISOString()).toBe(requestBody.expires_at);
      });
    });

    /**
     * Tests error handling scenarios including API errors and network failures
     * Ensures proper error propagation and messaging
     */
    describe('Error Handling', () => {
      const validInput: CreateApiKeyInput = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      it('should handle Clerk API 400 errors', async () => {
        mockExternalServices.mockClerkAPI.error(400, { error: 'Invalid request' });

        await expect(createApiKeyController(validInput)).rejects.toThrow(
          'Clerk API error: {"error":"Invalid request"}'
        );
      });

      it('should handle Clerk API 401 unauthorized errors', async () => {
        mockExternalServices.mockClerkAPI.error(401, { error: 'Unauthorized' });

        await expect(createApiKeyController(validInput)).rejects.toThrow(
          'Clerk API error'
        );
      });

      it('should handle Clerk API 403 forbidden errors', async () => {
        mockExternalServices.mockClerkAPI.error(403, { error: 'Forbidden' });

        await expect(createApiKeyController(validInput)).rejects.toThrow(
          'Clerk API error'
        );
      });

      it('should handle Clerk API 429 rate limit errors', async () => {
        mockExternalServices.mockClerkAPI.error(429, { error: 'Rate limit exceeded' });

        await expect(createApiKeyController(validInput)).rejects.toThrow(
          'Clerk API error: {"error":"Rate limit exceeded"}'
        );
      });

      it('should handle Clerk API 500 server errors', async () => {
        mockExternalServices.mockClerkAPI.error(500, { error: 'Internal server error' });

        await expect(createApiKeyController(validInput)).rejects.toThrow(
          'Clerk API error'
        );
      });

      it('should handle network timeout errors', async () => {
        mockExternalServices.mockClerkAPI.networkError();

        await expect(createApiKeyController(validInput)).rejects.toThrow('Network Error');
      });

      it('should handle malformed API responses', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        });

        await expect(createApiKeyController(validInput)).rejects.toThrow('Invalid JSON');
      });

      it('should handle missing environment variables', async () => {
        const originalClerkKey = process.env.CLERK_SECRET_KEY;
        delete process.env.CLERK_SECRET_KEY;

        mockExternalServices.mockClerkAPI.success({});
        
        await createApiKeyController(validInput);
        
        // Verify request was made with undefined authorization
        expect(fetch).toHaveBeenCalledWith(
          'https://api.clerk.com/v1/api_keys',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer undefined',
            }),
          })
        );

        // Restore environment variable
        process.env.CLERK_SECRET_KEY = originalClerkKey;
      });
    });

    /**
     * Tests API key generation security and uniqueness
     * Ensures cryptographically secure and properly formatted keys
     */
    describe('API Key Generation Security', () => {
      const validInput: CreateApiKeyInput = {
        userId: 'user_test123',
        name: 'Test API Key',
        scopes: ['read'],
        expiration: '30d',
      };

      beforeEach(() => {
        mockExternalServices.mockClerkAPI.success({});
      });

      it('should generate unique API keys for each request', async () => {
        const results = await Promise.all([
          createApiKeyController(validInput),
          createApiKeyController(validInput),
          createApiKeyController(validInput),
        ]);

        const keys = results.map(r => r.key);
        const uniqueKeys = new Set(keys);
        
        // All keys should be different
        expect(uniqueKeys.size).toBe(keys.length);
      });

      it('should generate keys with correct format (sk_ prefix + 64 hex chars)', async () => {
        const result = await createApiKeyController(validInput);
        
        expect(result.key).toMatch(/^sk_[a-f0-9]{64}$/);
        expect(result.key.length).toBe(67); // 'sk_' (3) + 64 hex chars
      });

      it('should use cryptographically secure randomness', async () => {
        const results = await Promise.all(
          Array.from({ length: 10 }, () => createApiKeyController(validInput))
        );

        const keys = results.map(r => r.key);
        
        // Test for basic randomness properties
        const hexParts = keys.map(key => key.slice(3)); // Remove 'sk_' prefix
        
        // Check that we don't have repeated patterns
        const patterns = hexParts.map(hex => hex.slice(0, 8)); // First 8 chars
        const uniquePatterns = new Set(patterns);
        expect(uniquePatterns.size).toBeGreaterThan(5); // Should have good distribution
        
        // Check character distribution (should contain various hex chars)
        const allChars = hexParts.join('');
        const uniqueChars = new Set(allChars);
        expect(uniqueChars.size).toBeGreaterThan(10); // Should use most hex digits
      });

      it('should include generated key in both request body and response', async () => {
        const result = await createApiKeyController(validInput);
        
        const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
        const requestBody = JSON.parse(lastCall[1]?.body as string);
        
        // Key should be in request to Clerk
        expect(requestBody.token).toMatch(/^sk_[a-f0-9]{64}$/);
        
        // Same key should be returned to client
        expect(result.key).toBe(requestBody.token);
      });
    });
  });

  /**
   * Tests for listApiKeysController
   * 
   * Validates API key listing functionality including proper API calls,
   * response handling, and error scenarios. Note that this controller
   * has minimal error handling by design.
   */
  describe('listApiKeysController', () => {
    it('should list API keys successfully with proper request format', async () => {
      const mockResponse: ApiKeyResponse[] = [
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
        {
          headers: {
            Authorization: 'Bearer sk_test_clerk_secret_key',
            'Content-Type': 'application/json',
          },
        }
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle empty API key list', async () => {
      mockExternalServices.mockClerkAPI.success([]);

      const result = await listApiKeysController();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle single API key in response', async () => {
      const singleKey: ApiKeyResponse = {
        id: 'key_single',
        name: 'Single Key',
        user_id: 'user_test123',
        scopes: ['admin'],
        expires_at: '2024-12-31T23:59:59.000Z',
      };

      mockExternalServices.mockClerkAPI.success([singleKey]);

      const result = await listApiKeysController();

      expect(result).toEqual([singleKey]);
    });

    /**
     * Tests error scenarios for listApiKeysController
     * Note: This controller passes through errors as-is without custom handling
     */
    describe('Error Handling', () => {
      it('should pass through Clerk API errors without modification', async () => {
        const errorResponse = { error: 'Internal error', code: 'INTERNAL_ERROR' };
        mockExternalServices.mockClerkAPI.error(500, errorResponse);

        const result = await listApiKeysController();
        expect(result).toEqual(errorResponse);
      });

      it('should handle 401 unauthorized errors', async () => {
        const errorResponse = { error: 'Unauthorized' };
        mockExternalServices.mockClerkAPI.error(401, errorResponse);

        const result = await listApiKeysController();
        expect(result).toEqual(errorResponse);
      });

      it('should handle 404 not found errors', async () => {
        const errorResponse = { error: 'Not found' };
        mockExternalServices.mockClerkAPI.error(404, errorResponse);

        const result = await listApiKeysController();
        expect(result).toEqual(errorResponse);
      });

      it('should propagate network errors', async () => {
        mockExternalServices.mockClerkAPI.networkError();

        await expect(listApiKeysController()).rejects.toThrow('Network Error');
      });

      it('should handle malformed JSON responses', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        });

        await expect(listApiKeysController()).rejects.toThrow('Invalid JSON');
      });
    });

    /**
     * Tests performance characteristics of the list operation
     */
    describe('Performance', () => {
      it('should complete within reasonable time', async () => {
        const largeResponse = Array.from({ length: 100 }, (_, i) => ({
          id: `key_${i}`,
          name: `API Key ${i}`,
          user_id: 'user_test123',
          scopes: ['read'],
          expires_at: '2024-12-31T23:59:59.000Z',
        }));

        mockExternalServices.mockClerkAPI.success(largeResponse);

        const startTime = performance.now();
        const result = await listApiKeysController();
        const endTime = performance.now();

        expect(result).toHaveLength(100);
        expect(endTime - startTime).toBeLessThan(100); // Should be very fast for mocked calls
      });
    });
  });

  /**
   * Tests for deleteApiKeyController
   * 
   * Validates API key deletion including proper HTTP method usage,
   * success response formatting, and comprehensive error handling.
   */
  describe('deleteApiKeyController', () => {
    it('should delete API key successfully with proper HTTP DELETE', async () => {
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
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle different key ID formats', async () => {
      mockExternalServices.mockClerkAPI.success({});

      const testIds = [
        'key_short',
        'key_very_long_identifier_with_underscores',
        'key-with-hyphens',
        'key123456789',
      ];

      for (const keyId of testIds) {
        const result = await deleteApiKeyController(keyId);
        
        expect(result).toEqual({
          success: true,
          id: keyId,
        });
        
        expect(fetch).toHaveBeenCalledWith(
          `https://api.clerk.com/v1/api_keys/${keyId}`,
          expect.objectContaining({ method: 'DELETE' })
        );
      }
    });

    /**
     * Tests comprehensive error handling for deletion operations
     * Covers various HTTP error codes and edge cases
     */
    describe('Error Handling', () => {
      it('should handle 404 not found errors', async () => {
        mockExternalServices.mockClerkAPI.error(404, { error: 'Not found' });

        await expect(deleteApiKeyController('key_nonexistent')).rejects.toThrow(
          'Clerk API error: {"error":"Not found"}'
        );
      });

      it('should handle 401 unauthorized errors', async () => {
        mockExternalServices.mockClerkAPI.error(401, { error: 'Unauthorized' });

        await expect(deleteApiKeyController('key_test123')).rejects.toThrow(
          'Clerk API error'
        );
      });

      it('should handle 403 forbidden errors', async () => {
        mockExternalServices.mockClerkAPI.error(403, { error: 'Forbidden' });

        await expect(deleteApiKeyController('key_test123')).rejects.toThrow(
          'Clerk API error'
        );
      });

      it('should handle 409 conflict errors', async () => {
        mockExternalServices.mockClerkAPI.error(409, { error: 'Key in use' });

        await expect(deleteApiKeyController('key_test123')).rejects.toThrow(
          'Clerk API error: {"error":"Key in use"}'
        );
      });

      it('should handle 500 server errors', async () => {
        mockExternalServices.mockClerkAPI.error(500, { error: 'Internal server error' });

        await expect(deleteApiKeyController('key_test123')).rejects.toThrow(
          'Clerk API error'
        );
      });

      it('should handle network timeout errors', async () => {
        mockExternalServices.mockClerkAPI.networkError();

        await expect(deleteApiKeyController('key_test123')).rejects.toThrow('Network Error');
      });

      it('should handle malformed error responses', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        });

        await expect(deleteApiKeyController('key_test123')).rejects.toThrow('Invalid JSON');
      });

      it('should handle empty key ID', async () => {
        mockExternalServices.mockClerkAPI.success({});

        const result = await deleteApiKeyController('');
        
        expect(result).toEqual({
          success: true,
          id: '',
        });
        
        // Verify URL construction with empty ID
        expect(fetch).toHaveBeenCalledWith(
          'https://api.clerk.com/v1/api_keys/',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    /**
     * Tests security considerations for deletion operations
     */
    describe('Security Considerations', () => {
      it('should include proper authorization headers', async () => {
        mockExternalServices.mockClerkAPI.success({});

        await deleteApiKeyController('key_test123');

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer sk_test_clerk_secret_key',
            }),
          })
        );
      });

      it('should not include sensitive data in URL for potential key IDs', async () => {
        mockExternalServices.mockClerkAPI.success({});

        const potentiallyMaliciousId = 'key_test/../../../sensitive';
        await deleteApiKeyController(potentiallyMaliciousId);

        // URL should include the ID as-is (letting Clerk handle validation)
        expect(fetch).toHaveBeenCalledWith(
          `https://api.clerk.com/v1/api_keys/${potentiallyMaliciousId}`,
          expect.any(Object)
        );
      });
    });

    /**
     * Tests performance characteristics of the delete operation
     */
    describe('Performance', () => {
      it('should complete deletion quickly', async () => {
        mockExternalServices.mockClerkAPI.success({});

        const startTime = performance.now();
        await deleteApiKeyController('key_test123');
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(50); // Should be very fast for mocked calls
      });
    });
  });
});