/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyClerkToken } from '../lib/verify-clerk-token.js';

// Mock utilities directly to avoid testing package issues
const mockEnv = (envVars: Record<string, string>) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...envVars };
  return {
    restore: () => {
      process.env = originalEnv;
    },
  };
};

// Mock the jose library
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify as mockJwtVerify } from 'jose';

describe('verifyClerkToken', () => {
  let envMock: ReturnType<typeof mockEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    envMock?.restore();
  });

  it('should successfully verify a valid token and return user ID', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    const mockPayload = { sub: 'user_12345' };
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    const result = await verifyClerkToken('valid-jwt-token');

    expect(result).toBe('user_12345');
    expect(mockJwtVerify).toHaveBeenCalledWith(
      'valid-jwt-token',
      expect.any(Uint8Array)
    );
  });

  it('should throw error when CLERK_SECRET_KEY is not defined', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: '' });

    await expect(verifyClerkToken('some-token')).rejects.toThrow(
      'CLERK_SECRET_KEY is not defined'
    );

    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('should throw error when token has no user ID (sub)', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    const mockPayload = { iss: 'clerk', exp: 123456789 }; // No sub
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    await expect(verifyClerkToken('token-without-sub')).rejects.toThrow(
      'Invalid token: No user ID found'
    );
  });

  it('should throw error when JWT verification fails', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    mockJwtVerify.mockRejectedValue(new Error('JWT verification failed'));

    await expect(verifyClerkToken('invalid-token')).rejects.toThrow(
      'Invalid or expired token'
    );
  });

  it('should handle tokens with additional payload data', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    const mockPayload = {
      sub: 'user_67890',
      iss: 'clerk',
      exp: 123456789,
      email: 'test@example.com',
      role: 'admin',
    };
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    const result = await verifyClerkToken('token-with-extra-data');

    expect(result).toBe('user_67890');
  });

  it('should encode the secret key properly', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'my-secret-key' });
    
    const mockPayload = { sub: 'user_test' };
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    await verifyClerkToken('test-token');

    // Verify that the secret is encoded as Uint8Array
    const [[, encodedSecret]] = mockJwtVerify.mock.calls;
    expect(encodedSecret).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(encodedSecret)).toBe('my-secret-key');
  });

  it('should handle empty token', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    mockJwtVerify.mockRejectedValue(new Error('Empty token'));

    await expect(verifyClerkToken('')).rejects.toThrow(
      'Invalid or expired token'
    );
  });

  it('should handle malformed token', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    mockJwtVerify.mockRejectedValue(new Error('Malformed JWT'));

    await expect(verifyClerkToken('not.a.valid.jwt')).rejects.toThrow(
      'Invalid or expired token'
    );
  });

  it('should handle expired token', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    mockJwtVerify.mockRejectedValue(new Error('Token expired'));

    await expect(verifyClerkToken('expired.jwt.token')).rejects.toThrow(
      'Invalid or expired token'
    );
  });

  it('should handle null/undefined sub in token payload', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    const mockPayload = { sub: null };
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    await expect(verifyClerkToken('token-with-null-sub')).rejects.toThrow(
      'Invalid token: No user ID found'
    );
  });

  it('should handle undefined sub in token payload', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    const mockPayload = { sub: undefined };
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    await expect(verifyClerkToken('token-with-undefined-sub')).rejects.toThrow(
      'Invalid token: No user ID found'
    );
  });

  it('should handle empty string sub in token payload', async () => {
    envMock = mockEnv({ CLERK_SECRET_KEY: 'test-secret-key' });
    
    const mockPayload = { sub: '' };
    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    await expect(verifyClerkToken('token-with-empty-sub')).rejects.toThrow(
      'Invalid token: No user ID found'
    );
  });

  it('should work with different secret key formats', async () => {
    const secretKeys = [
      'simple-key',
      'complex-key-with-special-chars!@#$%',
      'very-long-secret-key-that-is-more-than-256-characters-long'.repeat(10),
      '123456789',
    ];

    for (const secretKey of secretKeys) {
      envMock?.restore();
      envMock = mockEnv({ CLERK_SECRET_KEY: secretKey });
      
      const mockPayload = { sub: 'user_test' };
      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await verifyClerkToken('test-token');

      expect(result).toBe('user_test');
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'test-token',
        expect.any(Uint8Array)
      );

      vi.clearAllMocks();
    }
  });
});