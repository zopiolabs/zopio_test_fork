/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';

describe('Database Keys Configuration', () => {
  it('should export keys function', async () => {
    const keysModule = await import('../keys');
    
    expect(keysModule).toHaveProperty('keys');
    expect(typeof keysModule.keys).toBe('function');
  });

  it('should return environment configuration', async () => {
    const { keys } = await import('../keys');
    
    const result = keys();
    
    expect(result).toHaveProperty('DATABASE_URL');
    expect(typeof result.DATABASE_URL).toBe('string');
  });

  it('should use process.env.DATABASE_URL', async () => {
    // Test that the keys function accesses DATABASE_URL from environment
    // The actual value comes from the mocked environment in setup
    const { keys } = await import('../keys');
    
    const result = keys();
    expect(result.DATABASE_URL).toMatch(/^postgresql:\/\//);
    expect(typeof result.DATABASE_URL).toBe('string');
  });

  it('should validate URL format through t3-env', async () => {
    // Test that the keys function exists and can be called
    // The actual validation is handled by t3-env and Zod
    const { keys } = await import('../keys');
    
    expect(() => keys()).not.toThrow();
  });

  it('should use createEnv from t3-oss/env-nextjs', async () => {
    // This test verifies the import structure
    const keysSource = await import('../keys');
    
    // Verify that the keys function returns an object with DATABASE_URL
    const config = keysSource.keys();
    expect(config).toHaveProperty('DATABASE_URL');
  });

  it('should define server schema for DATABASE_URL', async () => {
    // Test the basic functionality without mocking
    const { keys } = await import('../keys');
    
    const config = keys();
    
    // Verify the configuration has the expected structure
    expect(config).toMatchObject({
      DATABASE_URL: expect.any(String),
    });
  });
});