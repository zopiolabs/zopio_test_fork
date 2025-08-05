/**
 * @fileoverview Auth Package Tests - Authentication Middleware
 * 
 * Test suite validating the authentication middleware wrapper that re-exports
 * Clerk's clerkMiddleware as authMiddleware. Ensures proper interface preservation,
 * argument handling, and functional compatibility with the underlying Clerk middleware.
 * 
 * **Test Scope:**
 * - Middleware function re-export and interface preservation
 * - Argument passing and option handling to underlying Clerk middleware
 * - Function signature compatibility and return value preservation
 * - Multiple call handling and context preservation
 * - Edge cases with undefined and no arguments
 * 
 * **Test Categories:**
 * 1. **Basic Functionality**: Export validation, function type verification
 * 2. **Interface Compatibility**: Signature preservation, argument forwarding
 * 3. **Multiple Calls**: Independent call handling, return value management
 * 4. **Edge Cases**: No arguments, undefined values, property preservation
 * 
 * **Mock Strategy:**
 * - Mock @clerk/nextjs/server to control clerkMiddleware behavior
 * - Test wrapper functionality without external Clerk dependencies
 * - Validate argument forwarding through controlled mock interactions
 * - Verify return value and property preservation through mock implementations
 * 
 * **Quality Standards:**
 * - Perfect interface compatibility with Clerk's clerkMiddleware
 * - All arguments correctly forwarded without modification
 * - Return values and function properties preserved completely
 * - Multiple calls handled independently and correctly
 * - Edge cases with undefined/null arguments handled gracefully
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Clerk NextJS middleware first
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: vi.fn(),
}));

import { authMiddleware } from '../middleware.js';
import { clerkMiddleware } from '@clerk/nextjs/server';

const mockClerkMiddleware = vi.mocked(clerkMiddleware);

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
    mockClerkMiddleware.mockReturnValue(mockHandler as any);

    const result = authMiddleware();
    
    expect(mockClerkMiddleware).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockHandler);
  });

  it('should pass through all arguments to clerkMiddleware', () => {
    const mockOptions = {
      publicRoutes: ['/public'],
      ignoredRoutes: ['/api/webhook'],
    };

    authMiddleware(mockOptions as any);

    expect(mockClerkMiddleware).toHaveBeenCalledWith(mockOptions);
  });

  it('should handle multiple calls independently', () => {
    const options1 = { publicRoutes: ['/home'] };
    const options2 = { publicRoutes: ['/about'] };
    
    mockClerkMiddleware.mockReturnValueOnce('handler1' as any);
    mockClerkMiddleware.mockReturnValueOnce('handler2' as any);

    const handler1 = authMiddleware(options1 as any);
    const handler2 = authMiddleware(options2 as any);

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
    mockClerkMiddleware.mockReturnValue(mockFunction as any);

    const result = authMiddleware();

    expect(result).toBe(mockFunction);
    expect((result as any).someProperty).toBe('test');
  });
});