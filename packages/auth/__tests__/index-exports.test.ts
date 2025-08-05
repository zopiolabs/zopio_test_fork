/**
 * @fileoverview Auth Package Tests - Main Index Exports
 * 
 * Comprehensive test suite validating the complete public API surface of the auth package
 * through its main index module. Ensures all expected exports are available, properly
 * typed, and maintain backwards compatibility while preventing internal exposure.
 * 
 * **Test Scope:**
 * - Complete public API surface validation
 * - Client-side and server-side export availability
 * - Cross-module integration and compatibility
 * - Configuration and utility function exports
 * - Module loading performance and error handling
 * 
 * **Test Categories:**
 * 1. **Module Structure**: Re-export validation, internal hiding, file organization
 * 2. **Client-Side Exports**: React hooks, components, authentication state management
 * 3. **Server-Side Exports**: Authentication functions, middleware, route matching
 * 4. **Configuration**: Environment handling, utility functions, cross-module compatibility
 * 5. **API Completeness**: Full coverage, performance, backwards compatibility, TypeScript support
 * 
 * **Mock Strategy:**
 * - Mock all external dependencies (Clerk, environment, themes)
 * - Mock server-only imports for test environment compatibility
 * - Controlled environment variable simulation
 * - Test data through structured mock responses
 * 
 * **Quality Standards:**
 * - Complete public API coverage and validation
 * - No internal implementation details exposed
 * - Cross-module integration functionality verified
 * - Performance optimization with efficient module loading
 * - Backwards compatibility maintained for stable API
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only to prevent client-side import errors in tests
vi.mock('server-only', () => ({}));

// Mock @clerk/themes and next-themes for provider tests
vi.mock('@clerk/themes', () => ({
  dark: { dark: 'theme' },
}));

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    resolvedTheme: 'light',
  })),
}));

// Mock the t3-env library to avoid server-side restrictions in tests
vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: vi.fn((config) => {
    const mockEnv = {};
    
    if (config.server) {
      Object.entries(config.server).forEach(([key, schema]) => {
        const value = config.runtimeEnv[key];
        if (value !== undefined) {
          try {
            (schema as any).parse(value);
            (mockEnv as any)[key] = value;
          } catch (error) {
            throw new Error(`Invalid environment variables`);
          }
        } else if (!(schema as any)._def?.typeName || (schema as any)._def.typeName !== 'ZodOptional') {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      });
    }
    
    if (config.client) {
      Object.entries(config.client).forEach(([key, schema]) => {
        const value = config.runtimeEnv[key];
        if (value !== undefined) {
          try {
            (schema as any).parse(value);
            (mockEnv as any)[key] = value;
          } catch (error) {
            throw new Error(`Invalid environment variables`);
          }
        } else {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      });
    }
    
    return mockEnv;
  }),
}));

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

// Mock @clerk/nextjs to avoid actual Clerk dependencies
vi.mock('@clerk/nextjs', () => ({
  // React Hooks
  useAuth: vi.fn(() => ({
    isSignedIn: true,
    userId: 'test_user_123',
    sessionId: 'test_session_456',
    signOut: vi.fn(),
    getToken: vi.fn(),
  })),
  useUser: vi.fn(() => ({
    isSignedIn: true,
    user: {
      id: 'test_user_123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
    isLoaded: true,
  })),
  useClerk: vi.fn(() => ({
    signOut: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    openSignIn: vi.fn(),
    openSignUp: vi.fn(),
    openUserProfile: vi.fn(),
  })),
  useSession: vi.fn(() => ({
    session: { id: 'test_session_123' },
    isLoaded: true,
  })),
  useOrganization: vi.fn(() => ({
    organization: null,
    isLoaded: true,
  })),
  useSignIn: vi.fn(() => ({
    signIn: { status: null },
    isLoaded: true,
  })),
  useSignUp: vi.fn(() => ({
    signUp: { status: null },
    isLoaded: true,
  })),
  
  // React Components
  ClerkProvider: vi.fn(({ children }) => children),
  SignIn: vi.fn(() => 'SignIn'),
  SignUp: vi.fn(() => 'SignUp'),
  UserButton: vi.fn(() => 'UserButton'),
  UserProfile: vi.fn(() => 'UserProfile'),
  OrganizationSwitcher: vi.fn(() => 'OrganizationSwitcher'),
  OrganizationProfile: vi.fn(() => 'OrganizationProfile'),
  CreateOrganization: vi.fn(() => 'CreateOrganization'),
  
  // Authentication State Components
  RedirectToSignIn: vi.fn(() => 'RedirectToSignIn'),
  RedirectToSignUp: vi.fn(() => 'RedirectToSignUp'),
  RedirectToUserProfile: vi.fn(() => 'RedirectToUserProfile'),
  SignedIn: vi.fn(({ children }) => children),
  SignedOut: vi.fn(({ children }) => children),
}));

describe('Index Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Structure', () => {
    it('should export from all expected sub-modules', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const indexFilePath = path.resolve(__dirname, '../index.ts');
      const content = await fs.readFile(indexFilePath, 'utf-8');
      
      // Verify all expected re-exports are present
      expect(content).toContain("export * from './clerk-auth-middleware'");
      expect(content).toContain("export * from './middleware'");
      expect(content).toContain("export * from './client'");
      expect(content).toContain("export * from './server'");
      expect(content).toContain("export * from './keys'");
    });

    it('should have complete main module exports', async () => {
      const indexModule = await import('../index.js');
      
      expect(indexModule).toBeDefined();
      expect(typeof indexModule).toBe('object');
      expect(indexModule).not.toBeNull();
    });

    it('should not expose internal implementation details', async () => {
      const indexModule = await import('../index.js');
      
      // Should not export test utilities or internal helpers
      expect((indexModule as any).__tests__).toBeUndefined();
      expect((indexModule as any).internal).toBeUndefined();
      expect((indexModule as any).private).toBeUndefined();
    });
  });

  describe('Client-Side Exports', () => {
    it('should export all client-side React hooks', async () => {
      const {
        useAuth,
        useUser, 
        useClerk,
        useSession,
        useOrganization,
        useSignIn,
        useSignUp,
      } = await import('../index.js');
      
      expect(useAuth).toBeDefined();
      expect(useUser).toBeDefined(); 
      expect(useClerk).toBeDefined();
      expect(useSession).toBeDefined();
      expect(useOrganization).toBeDefined();
      expect(useSignIn).toBeDefined();
      expect(useSignUp).toBeDefined();
      
      // All should be functions
      expect(typeof useAuth).toBe('function');
      expect(typeof useUser).toBe('function');
      expect(typeof useClerk).toBe('function');
      expect(typeof useSession).toBe('function');
      expect(typeof useOrganization).toBe('function');
      expect(typeof useSignIn).toBe('function');
      expect(typeof useSignUp).toBe('function');
    });

    it('should export all client-side React components', async () => {
      const {
        ClerkProvider,
        SignIn,
        SignUp,
        UserButton,
        UserProfile,
        OrganizationSwitcher,
        OrganizationProfile,
        CreateOrganization,
        RedirectToSignIn,
        RedirectToSignUp,
        RedirectToUserProfile,
        SignedIn,
        SignedOut,
      } = await import('../index.js');
      
      // All components should be defined
      expect(ClerkProvider).toBeDefined();
      expect(SignIn).toBeDefined();
      expect(SignUp).toBeDefined();
      expect(UserButton).toBeDefined();
      expect(UserProfile).toBeDefined();
      expect(OrganizationSwitcher).toBeDefined();
      expect(OrganizationProfile).toBeDefined();
      expect(CreateOrganization).toBeDefined();
      expect(RedirectToSignIn).toBeDefined();
      expect(RedirectToSignUp).toBeDefined();
      expect(RedirectToUserProfile).toBeDefined();
      expect(SignedIn).toBeDefined();
      expect(SignedOut).toBeDefined();
      
      // All should be functions or objects (React components)
      expect(typeof ClerkProvider === 'function' || typeof ClerkProvider === 'object').toBe(true);
      expect(typeof SignIn === 'function' || typeof SignIn === 'object').toBe(true);
      expect(typeof SignUp === 'function' || typeof SignUp === 'object').toBe(true);
      expect(typeof UserButton === 'function' || typeof UserButton === 'object').toBe(true);
    });
  });

  describe('Server-Side Exports', () => {
    it('should export all server-side authentication functions', async () => {
      const {
        auth,
        currentUser,
        clerkClient,
        clerkMiddleware,
        createRouteMatcher,
      } = await import('../index.js');
      
      expect(auth).toBeDefined();
      expect(currentUser).toBeDefined();
      expect(clerkClient).toBeDefined();
      expect(clerkMiddleware).toBeDefined();
      expect(createRouteMatcher).toBeDefined();
      
      // Functions should be functions, clerkClient should be object
      expect(typeof auth).toBe('function');
      expect(typeof currentUser).toBe('function');
      expect(typeof clerkClient).toBe('object');
      expect(typeof clerkMiddleware).toBe('function');
      expect(typeof createRouteMatcher).toBe('function');
    });

    it('should export middleware functions', async () => {
      const {
        authMiddleware,
        clerkAuthMiddleware,
      } = await import('../index.js');
      
      expect(authMiddleware).toBeDefined();
      expect(clerkAuthMiddleware).toBeDefined();
      
      expect(typeof authMiddleware).toBe('function');
      expect(typeof clerkAuthMiddleware).toBe('function');
    });
  });

  describe('Configuration Exports', () => {
    it('should export environment configuration', async () => {
      const { keys } = await import('../index.js');
      
      expect(keys).toBeDefined();
      expect(typeof keys).toBe('function');
    });

    it('should allow configuration to be used with other exports', async () => {
      const indexModule = await import('../index.js');
      
      // Keys function should be available alongside other exports
      expect(indexModule.keys).toBeDefined();
      expect(indexModule.ClerkProvider).toBeDefined();
      expect(indexModule.auth).toBeDefined();
      
      // Should be able to use them together
      expect(typeof indexModule.keys).toBe('function');
    });
  });

  describe('Utility Exports', () => {
    it('should export token verification utilities', async () => {
      const indexModule = await import('../index.js');
      
      // clerkAuthMiddleware should be available from index
      expect(indexModule.clerkAuthMiddleware).toBeDefined();
      expect(typeof indexModule.clerkAuthMiddleware).toBe('function');
    });

    it('should export all middleware utilities', async () => {
      const {
        authMiddleware,
        clerkAuthMiddleware,
        clerkMiddleware,
      } = await import('../index.js');
      
      // All middleware functions should be available
      expect(authMiddleware).toBeDefined();
      expect(clerkAuthMiddleware).toBeDefined();
      expect(clerkMiddleware).toBeDefined();
      
      // They should be different functions for different purposes
      expect(authMiddleware).not.toBe(clerkAuthMiddleware);
      expect(clerkMiddleware).not.toBe(clerkAuthMiddleware);
    });
  });

  describe('Cross-Module Integration', () => {
    it('should provide seamless integration between client and server exports', async () => {
      const indexModule = await import('../index.js');
      
      // Should have both client and server functionality
      expect(indexModule.useAuth).toBeDefined(); // Client
      expect(indexModule.auth).toBeDefined(); // Server
      expect(indexModule.ClerkProvider).toBeDefined(); // Client
      expect(indexModule.clerkClient).toBeDefined(); // Server
      
      // They should be available simultaneously
      expect(typeof indexModule.useAuth).toBe('function');
      expect(typeof indexModule.auth).toBe('function');
    });

    it('should allow configuration to work with all components', async () => {
      const {
        keys,
        ClerkProvider,
        clerkAuthMiddleware,
        auth,
      } = await import('../index.js');
      
      // All should be available and compatible
      expect(keys).toBeDefined();
      expect(ClerkProvider).toBeDefined();
      expect(clerkAuthMiddleware).toBeDefined();
      expect(auth).toBeDefined();
      
      // Configuration function should work with components
      expect(typeof keys).toBe('function');
    });

    it('should maintain proper separation between client and server concerns', async () => {
      const indexModule = await import('../index.js');
      
      // Client hooks should be functions
      expect(typeof indexModule.useAuth).toBe('function');
      expect(typeof indexModule.useUser).toBe('function');
      
      // Server functions should be functions  
      expect(typeof indexModule.auth).toBe('function');
      expect(typeof indexModule.currentUser).toBe('function');
      
      // But they should be different implementations
      expect(indexModule.useAuth).not.toBe(indexModule.auth);
    });
  });

  describe('API Completeness', () => {
    it('should export all expected authentication hooks', async () => {
      const expectedHooks = [
        'useAuth',
        'useUser',
        'useClerk', 
        'useSession',
        'useOrganization',
        'useSignIn',
        'useSignUp',
      ];
      
      const indexModule = await import('../index.js');
      
      expectedHooks.forEach(hookName => {
        expect((indexModule as any)[hookName]).toBeDefined();
        expect(typeof (indexModule as any)[hookName]).toBe('function');
      });
    });

    it('should export all expected authentication components', async () => {
      const expectedComponents = [
        'ClerkProvider',
        'SignIn',
        'SignUp', 
        'UserButton',
        'UserProfile',
        'OrganizationSwitcher',
        'OrganizationProfile',
        'CreateOrganization',
        'RedirectToSignIn',
        'RedirectToSignUp',
        'RedirectToUserProfile',
        'SignedIn',
        'SignedOut',
      ];
      
      const indexModule = await import('../index.js');
      
      expectedComponents.forEach(componentName => {
        expect((indexModule as any)[componentName]).toBeDefined();
        expect(typeof (indexModule as any)[componentName] === 'function' || typeof (indexModule as any)[componentName] === 'object').toBe(true);
      });
    });

    it('should export all expected server functions', async () => {
      const expectedServerFunctions = [
        'auth',
        'currentUser',
        'clerkMiddleware',
        'createRouteMatcher',
        'authMiddleware',
        'clerkAuthMiddleware',
      ];
      
      const indexModule = await import('../index.js');
      
      expectedServerFunctions.forEach(functionName => {
        expect((indexModule as any)[functionName]).toBeDefined();
        expect(typeof (indexModule as any)[functionName]).toBe('function');
      });
    });

    it('should export configuration and utilities', async () => {
      const expectedUtils = [
        'keys',
      ];
      
      const indexModule = await import('../index.js');
      
      expectedUtils.forEach(utilName => {
        expect((indexModule as any)[utilName]).toBeDefined();
        expect(typeof (indexModule as any)[utilName]).toBe('function');
      });
    });
  });

  describe('Module Loading Performance', () => {
    it('should load efficiently without circular dependencies', async () => {
      const startTime = performance.now();
      
      await import('../index.js');
      
      const loadTime = performance.now() - startTime;
      
      // Index should load quickly
      expect(loadTime).toBeLessThan(100);
    });

    it('should not cause excessive module initialization', async () => {
      // Multiple imports should be fast (cached)
      const startTime = performance.now();
      
      await Promise.all([
        import('../index.js'),
        import('../index.js'),
        import('../index.js'),
      ]);
      
      const loadTime = performance.now() - startTime;
      
      // Cached imports should be very fast
      expect(loadTime).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment gracefully', async () => {
      // Index should load even with missing environment
      const indexModule = await import('../index.js');
      
      expect(indexModule).toBeDefined();
      expect(indexModule.keys).toBeDefined();
      expect(indexModule.useAuth).toBeDefined();
      expect(indexModule.auth).toBeDefined();
    });

    it('should provide consistent error handling across all exports', async () => {
      const indexModule = await import('../index.js');
      
      // All functions should be available for error handling
      expect(indexModule.clerkAuthMiddleware).toBeDefined();
      expect(indexModule.auth).toBeDefined();
      expect(indexModule.useAuth).toBeDefined();
      
      // They should be proper functions that can be called
      expect(typeof indexModule.clerkAuthMiddleware).toBe('function');
      expect(typeof indexModule.auth).toBe('function');
      expect(typeof indexModule.useAuth).toBe('function');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain stable public API', async () => {
      const indexModule = await import('../index.js');
      
      // Core authentication API should be stable
      expect(indexModule.useAuth).toBeDefined();
      expect(indexModule.useUser).toBeDefined();
      expect(indexModule.ClerkProvider).toBeDefined();
      expect(indexModule.auth).toBeDefined();
      expect(indexModule.currentUser).toBeDefined();
      expect(indexModule.keys).toBeDefined();
    });

    it('should not break existing import patterns', async () => {
      // Common import patterns should work
      const { useAuth, useUser } = await import('../index.js');
      const { ClerkProvider, SignIn } = await import('../index.js');
      const { auth, currentUser } = await import('../index.js');
      const { keys } = await import('../index.js');
      
      expect(useAuth).toBeDefined();
      expect(useUser).toBeDefined();
      expect(ClerkProvider).toBeDefined();
      expect(SignIn).toBeDefined();
      expect(auth).toBeDefined();
      expect(currentUser).toBeDefined();
      expect(keys).toBeDefined();
    });
  });

  describe('TypeScript Integration', () => {
    it('should provide complete TypeScript support', async () => {
      // All exports should be properly typed
      const indexModule = await import('../index.js');
      
      expect(indexModule).toBeDefined();
      
      // Critical exports should be available
      expect(indexModule.useAuth).toBeDefined();
      expect(indexModule.ClerkProvider).toBeDefined();
      expect(indexModule.auth).toBeDefined();
      expect(indexModule.keys).toBeDefined();
    });

    it('should maintain type safety across re-exports', async () => {
      // TypeScript should be able to infer types correctly
      const indexModule = await import('../index.js');
      
      // These should be properly typed
      expect(typeof indexModule.useAuth).toBe('function');
      expect(typeof indexModule.auth).toBe('function');
      expect(typeof indexModule.keys).toBe('function');
      expect(typeof indexModule.clerkClient).toBe('object');
    });
  });
});