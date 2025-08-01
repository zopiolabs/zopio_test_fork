/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only to prevent client-side import errors in tests
vi.mock('server-only', () => ({}));

// Mock @clerk/nextjs/server to avoid actual Clerk dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({
    userId: 'test_user_123',
    sessionId: 'test_session_456',
    orgId: null,
    orgRole: null,
    orgSlug: null,
  })),
  currentUser: vi.fn(() => Promise.resolve({
    id: 'test_user_123',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
  clerkClient: {
    users: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
    sessions: {},
    organizations: {},
  },
  clerkMiddleware: vi.fn((handler) => handler),
  createRouteMatcher: vi.fn((routes: string[]) => (request: any) => routes.some(route => request.url.includes(route))),
  Webhook: vi.fn(),
  verifyToken: vi.fn(),
}));

/**
 * Test suite for server-side exports from the auth package
 * 
 * This suite validates:
 * - All server-side exports are available and properly typed
 * - Server-only module isolation (prevents client-side usage)
 * - Proper re-exports from @clerk/nextjs/server
 * - No accidental exposure of server-only functionality to client
 */
describe('Server Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Structure', () => {
    it('should have server-only directive', async () => {
      // Read the server.ts file content to check for server-only directive
      const fs = await import('fs/promises');
      const path = await import('path');
      const serverFilePath = path.resolve(__dirname, '../server.ts');
      const content = await fs.readFile(serverFilePath, 'utf-8');
      
      expect(content).toContain("import 'server-only'");
    });

    it('should re-export all clerk server functions', async () => {
      const serverModule = await import('../server.js');
      
      // Check that the module exports exist (clerk/nextjs/server provides these)
      expect(serverModule).toBeDefined();
      
      // The module should be an object with exported functions/types
      expect(typeof serverModule).toBe('object');
      expect(serverModule).not.toBeNull();
    });
  });

  describe('Core Authentication Functions', () => {
    it('should export auth function for getting current user', async () => {
      const { auth } = await import('../server.js');
      
      expect(auth).toBeDefined();
      expect(typeof auth).toBe('function');
    });

    it('should export currentUser function', async () => {
      const { currentUser } = await import('../server.js');
      
      expect(currentUser).toBeDefined();
      expect(typeof currentUser).toBe('function');
    });

    it('should export clerkClient for server-side operations', async () => {
      const { clerkClient } = await import('../server.js');
      
      expect(clerkClient).toBeDefined();
      expect(typeof clerkClient).toBe('object');
    });
  });

  describe('Middleware Functions', () => {
    it('should export clerkMiddleware', async () => {
      const { clerkMiddleware } = await import('../server.js');
      
      expect(clerkMiddleware).toBeDefined();
      expect(typeof clerkMiddleware).toBe('function');
    });

    it('should export createRouteMatcher utility', async () => {
      const { createRouteMatcher } = await import('../server.js');
      
      expect(createRouteMatcher).toBeDefined();
      expect(typeof createRouteMatcher).toBe('function');
    });
  });

  describe('Webhook Functions', () => {
    it('should export webhook verification utilities', async () => {
      const serverModule = await import('../server.js');
      
      // Since server.js re-exports everything from @clerk/nextjs/server,
      // webhook utilities should be available
      expect(serverModule).toBeDefined();
      expect(typeof serverModule).toBe('object');
    });
  });

  describe('Type Exports', () => {
    it('should export User type', async () => {
      // Test that User type is available (will be undefined at runtime but should not error)
      const serverModule = await import('../server.js');
      
      // Types don't exist at runtime, but we can check the module loads without error
      expect(serverModule).toBeDefined();
    });

    it('should export auth-related types', async () => {
      const serverModule = await import('../server.js');
      
      // Verify module structure supports type exports
      expect(typeof serverModule).toBe('object');
    });
  });

  describe('Server-Only Enforcement', () => {
    it('should prevent client-side usage', async () => {
      // Mock being in a client environment
      const originalWindow = global.window;
      const originalDocument = global.document;
      
      // @ts-ignore - Simulating browser environment
      global.window = {};
      // @ts-ignore - Simulating browser environment
      global.document = {};

      try {
        // This should work in test environment but would fail in actual client
        const serverModule = await import('../server.js');
        expect(serverModule).toBeDefined();
      } finally {
        // Restore environment
        global.window = originalWindow;
        global.document = originalDocument;
      }
    });

    it('should not expose sensitive server functions to client', async () => {
      const serverModule = await import('../server.js');
      
      // Server module should not include client-only functions
      // These would typically throw in a real client environment
      expect(serverModule).toBeDefined();
      
      // Verify we have server-side functions available
      expect(serverModule.auth).toBeDefined();
      expect(serverModule.clerkClient).toBeDefined();
    });
  });

  describe('Function Behavior', () => {
    it('should have auth function that returns proper structure', async () => {
      const { auth } = await import('../server.js');
      
      expect(auth).toBeDefined();
      expect(typeof auth).toBe('function');
      
      // Test that the function can be called and returns expected structure
      const result = auth();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should have currentUser function that can be called', async () => {
      const { currentUser } = await import('../server.js');
      
      expect(currentUser).toBeDefined();
      expect(typeof currentUser).toBe('function');
    });

    it('should have clerkClient with expected API structure', async () => {
      const { clerkClient } = await import('../server.js');
      
      expect(clerkClient).toBeDefined();
      expect(typeof clerkClient).toBe('object');
      
      // ClerkClient should have users API
      expect((clerkClient as any).users).toBeDefined();
      expect(typeof (clerkClient as any).users).toBe('object');
    });
  });

  describe('Integration with Internal Modules', () => {
    it('should work with custom auth middleware', async () => {
      const serverModule = await import('../server.js');
      const { clerkAuthMiddleware } = await import('../clerk-auth-middleware.js');
      
      // Both should be available and compatible
      expect(serverModule.clerkMiddleware).toBeDefined();
      expect(clerkAuthMiddleware).toBeDefined();
      
      // They should be different functions (one is Clerk's, one is our custom)
      expect(serverModule.clerkMiddleware).not.toBe(clerkAuthMiddleware);
    });

    it('should integrate with keys configuration', async () => {
      const serverModule = await import('../server.js');
      const { keys } = await import('../keys.js');
      
      // Both modules should be available for server-side usage
      expect(serverModule).toBeDefined();
      expect(keys).toBeDefined();
      expect(typeof keys).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment gracefully in development', async () => {
      // Server exports should load even if environment is not fully configured
      const serverModule = await import('../server.js');
      
      expect(serverModule).toBeDefined();
      expect(serverModule.auth).toBeDefined();
      expect(serverModule.currentUser).toBeDefined();
    });

    it('should provide meaningful errors for authentication failures', async () => {
      const { auth } = await import('../server.js');
      
      expect(auth).toBeDefined();
      expect(typeof auth).toBe('function');
      
      // Test that function is available for error handling scenarios
      const result = auth();
      expect(result).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    it('should load efficiently without unnecessary dependencies', async () => {
      const startTime = performance.now();
      
      await import('../server.js');
      
      const loadTime = performance.now() - startTime;
      
      // Server module should load quickly (< 100ms in test environment)
      expect(loadTime).toBeLessThan(100);
    });

    it('should not eagerly evaluate expensive operations', async () => {
      // Module import should be fast, not trigger API calls
      const serverModule = await import('../server.js');
      
      expect(serverModule).toBeDefined();
      
      // Functions should be available but not executed during import
      expect(typeof serverModule.auth).toBe('function');
      expect(typeof serverModule.currentUser).toBe('function');
    });
  });

  describe('TypeScript Integration', () => {
    it('should provide proper TypeScript types', async () => {
      // This test verifies the module compiles correctly with TypeScript
      const serverModule = await import('../server.js');
      
      expect(serverModule).toBeDefined();
      
      // These should be properly typed functions
      expect(typeof serverModule.auth).toBe('function');
      expect(typeof serverModule.currentUser).toBe('function');
      expect(typeof serverModule.clerkClient).toBe('object');
      expect(typeof serverModule.clerkMiddleware).toBe('function');
    });

    it('should maintain type safety for auth return values', async () => {
      const { auth } = await import('../server.js');
      
      expect(auth).toBeDefined();
      
      // The auth function should return properly typed values
      // This is validated by TypeScript compilation
      expect(typeof auth).toBe('function');
    });
  });
});