/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Clerk NextJS middleware first
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: vi.fn(),
}));

import { authMiddleware } from '../middleware.js';
import { clerkMiddleware as mockClerkMiddleware } from '@clerk/nextjs/server';

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export clerkMiddleware as authMiddleware', () => {
    expect(authMiddleware).toBe(mockClerkMiddleware);
  });

  it('should be a function', () => {
    expect(typeof authMiddleware).toBe('function');
  });

  it('should maintain the same interface as clerkMiddleware', () => {
    // Test that our middleware export maintains the same signature
    const mockHandler = vi.fn();
    mockClerkMiddleware.mockReturnValue(mockHandler);

    const result = authMiddleware();
    
    expect(mockClerkMiddleware).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockHandler);
  });

  it('should pass through all arguments to clerkMiddleware', () => {
    const mockOptions = {
      publicRoutes: ['/public'],
      ignoredRoutes: ['/api/webhook'],
    };

    authMiddleware(mockOptions);

    expect(mockClerkMiddleware).toHaveBeenCalledWith(mockOptions);
  });

  it('should handle multiple calls independently', () => {
    const options1 = { publicRoutes: ['/home'] };
    const options2 = { publicRoutes: ['/about'] };
    
    mockClerkMiddleware.mockReturnValueOnce('handler1');
    mockClerkMiddleware.mockReturnValueOnce('handler2');

    const handler1 = authMiddleware(options1);
    const handler2 = authMiddleware(options2);

    expect(mockClerkMiddleware).toHaveBeenCalledTimes(2);
    expect(mockClerkMiddleware).toHaveBeenNthCalledWith(1, options1);
    expect(mockClerkMiddleware).toHaveBeenNthCalledWith(2, options2);
    expect(handler1).toBe('handler1');
    expect(handler2).toBe('handler2');
  });

  it('should handle no arguments', () => {
    authMiddleware();
    
    expect(mockClerkMiddleware).toHaveBeenCalledWith();
  });

  it('should handle undefined arguments', () => {
    authMiddleware(undefined);
    
    expect(mockClerkMiddleware).toHaveBeenCalledWith(undefined);
  });

  it('should preserve function properties and context', () => {
    const mockFunction = vi.fn();
    (mockFunction as any).someProperty = 'test';
    mockClerkMiddleware.mockReturnValue(mockFunction);

    const result = authMiddleware();

    expect(result).toBe(mockFunction);
    expect((result as any).someProperty).toBe('test');
  });
});