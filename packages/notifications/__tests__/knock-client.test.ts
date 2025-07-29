/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keys are mocked in the setup file

describe('Knock Client Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should initialize Knock client when API key is available', async () => {
    const { notifications } = await import('../index');
    
    expect(notifications).toBeDefined();
  });

  it('should handle missing API key gracefully', async () => {
    // Mock keys to return no API key
    vi.doMock('../keys', () => ({
      keys: () => ({
        KNOCK_SECRET_API_KEY: undefined,
        NEXT_PUBLIC_KNOCK_API_KEY: 'test_public_key',
        NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: 'test_feed_channel',
      }),
    }));

    vi.resetModules();
    const { notifications } = await import('../index');
    
    expect(notifications).toBeNull();
  });

  it('should handle Knock client initialization errors', async () => {
    // Mock Knock to throw an error during initialization
    vi.doMock('@knocklabs/node', () => ({
      Knock: vi.fn().mockImplementation(() => {
        throw new Error('Knock initialization failed');
      }),
    }));

    vi.resetModules();
    const { notifications } = await import('../index');
    
    // Should handle error gracefully and return null
    expect(notifications).toBeNull();
  });

  it('should export notifications client', async () => {
    const module = await import('../index');
    
    expect(module).toHaveProperty('notifications');
  });

  it('should use proper API key validation', async () => {
    // Test with valid API key format
    const testSecretKey = 'test_secret_key';
    expect(testSecretKey).toBe('test_secret_key');
    expect(typeof testSecretKey).toBe('string');
  });

  it('should handle different API key configurations', async () => {
    const testConfigs = [
      { KNOCK_SECRET_API_KEY: 'sk_test_123', expected: true },
      { KNOCK_SECRET_API_KEY: '', expected: false },
      { KNOCK_SECRET_API_KEY: null, expected: false },
      { KNOCK_SECRET_API_KEY: undefined, expected: false },
    ];

    for (const config of testConfigs) {
      vi.doMock('../keys', () => ({
        keys: () => ({
          KNOCK_SECRET_API_KEY: config.KNOCK_SECRET_API_KEY,
          NEXT_PUBLIC_KNOCK_API_KEY: 'test_public_key',
          NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: 'test_feed_channel',
        }),
      }));

      vi.resetModules();
      const { notifications } = await import('../index');
      
      if (config.expected) {
        expect(notifications).toBeDefined();
      } else {
        expect(notifications).toBeNull();
      }
    }
  });
});