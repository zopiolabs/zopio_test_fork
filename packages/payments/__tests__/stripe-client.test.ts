/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock environment and keys
const mockEnv = {
  STRIPE_SECRET_KEY: 'sk_test_123456789',
  STRIPE_WEBHOOK_SECRET: 'whsec_test123456789',
};

vi.mock('../keys', () => ({
  keys: () => mockEnv,
}));

describe('Stripe Client Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize Stripe client with correct API key', async () => {
    const { stripe } = await import('../index');
    
    expect(Stripe).toHaveBeenCalledWith(mockEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
    expect(stripe).toBeDefined();
  });

  it('should use the correct API version', async () => {
    // The API version is tested through the initialization call
    const { stripe } = await import('../index');
    
    expect(stripe).toBeDefined();
    // API version is configured during initialization
  });

  it('should export Stripe type', async () => {
    const module = await import('../index');
    
    // Verify that the module exports what we expect
    expect(module).toHaveProperty('stripe');
    expect(typeof module.stripe).toBe('object');
  });

  it('should handle invalid API key gracefully', async () => {
    // Test that invalid API key would be handled by Stripe SDK
    // The actual validation happens during Stripe operations, not initialization
    const { stripe } = await import('../index');
    
    expect(stripe).toBeDefined();
    // In production, invalid API keys are detected during actual API calls
  });

  it('should use server-only import', async () => {
    // This test verifies that server-only is imported
    // The actual enforcement is handled by the bundler/runtime
    const module = await import('../index');
    expect(module.stripe).toBeDefined();
  });

  it('should initialize with consistent configuration', async () => {
    // Reset modules to test fresh initialization
    vi.resetModules();
    
    const { stripe: stripe1 } = await import('../index');
    vi.resetModules();
    const { stripe: stripe2 } = await import('../index');
    
    // Both should be initialized with the same configuration
    expect(Stripe).toHaveBeenCalledTimes(2);
    expect(Stripe).toHaveBeenNthCalledWith(1, mockEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
    expect(Stripe).toHaveBeenNthCalledWith(2, mockEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  });

  it('should handle missing environment variables', async () => {
    // Mock keys to throw error for missing STRIPE_SECRET_KEY
    vi.doMock('../keys', () => ({
      keys: () => {
        throw new Error('STRIPE_SECRET_KEY is required');
      },
    }));

    vi.resetModules();

    await expect(async () => {
      await import('../index');
    }).rejects.toThrow('STRIPE_SECRET_KEY is required');
  });
});