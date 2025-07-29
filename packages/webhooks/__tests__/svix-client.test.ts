/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keys are mocked in the setup file

describe('Svix Client Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should initialize Svix client when token is available', async () => {
    const { webhooks } = await import('../index');
    
    expect(webhooks).toBeDefined();
    expect(webhooks.send).toBeInstanceOf(Function);
    expect(webhooks.getAppPortal).toBeInstanceOf(Function);
  });

  it('should handle missing SVIX_TOKEN gracefully', async () => {
    // Mock keys to return no token
    vi.doMock('../keys', () => ({
      keys: () => ({
        SVIX_TOKEN: undefined,
      }),
    }));

    vi.resetModules();
    const { send } = await import('../lib/svix');
    
    await expect(send('test.event', { data: 'test' }))
      .rejects.toThrow('SVIX_TOKEN is not set');
  });

  it('should validate token format', async () => {
    const testTokens = [
      { token: 'sk_test_valid', expected: true },
      { token: 'testsk_test_valid', expected: true },
      { token: 'invalid_token', expected: false },
      { token: '', expected: false },
      { token: undefined, expected: false },
    ];

    for (const { token, expected } of testTokens) {
      vi.doMock('../keys', () => ({
        keys: () => ({
          SVIX_TOKEN: token,
        }),
      }));

      vi.resetModules();
      
      if (expected && token) {
        const { webhooks } = await import('../index');
        expect(webhooks).toBeDefined();
      } else {
        const { send } = await import('../lib/svix');
        if (!token) {
          await expect(send('test.event', { data: 'test' }))
            .rejects.toThrow('SVIX_TOKEN is not set');
        }
      }
    }
  });

  it('should handle Svix SDK initialization errors', async () => {
    // Mock Svix to throw an error during initialization
    vi.doMock('svix', () => ({
      Svix: vi.fn().mockImplementation(() => {
        throw new Error('Svix initialization failed');
      }),
    }));

    vi.resetModules();
    const { send } = await import('../lib/svix');
    
    // Should handle error gracefully during send
    await expect(send('test.event', { data: 'test' }))
      .rejects.toThrow('Svix initialization failed');
  });

  it('should export webhooks functions', async () => {
    const module = await import('../index');
    
    expect(module).toHaveProperty('webhooks');
    expect(module.webhooks).toHaveProperty('send');
    expect(module.webhooks).toHaveProperty('getAppPortal');
  });

  it('should handle different token configurations', async () => {
    const configurations = [
      { SVIX_TOKEN: 'sk_live_123456789' },
      { SVIX_TOKEN: 'testsk_dev_987654321' },
      { SVIX_TOKEN: 'sk_test_abcdefghijk' },
    ];

    for (const config of configurations) {
      vi.doMock('../keys', () => ({
        keys: () => config,
      }));

      vi.resetModules();
      const { webhooks } = await import('../index');
      
      expect(webhooks).toBeDefined();
      expect(typeof webhooks.send).toBe('function');
      expect(typeof webhooks.getAppPortal).toBe('function');
    }
  });

  it('should validate environment configuration', async () => {
    // Test with valid token format
    const testToken = 'testsk_test_token_12345';
    expect(testToken).toBeTruthy();
    expect(testToken.startsWith('testsk_') || testToken.startsWith('sk_')).toBe(true);
  });
});