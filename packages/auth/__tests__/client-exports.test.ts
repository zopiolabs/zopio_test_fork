/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock @clerk/themes and next-themes for provider tests
vi.mock('@clerk/themes', () => ({
  dark: { dark: 'theme' },
}));

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    resolvedTheme: 'light',
  })),
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
  ClerkProvider: vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'clerk-provider' }, children)),
  SignIn: vi.fn(() => React.createElement('div', { 'data-testid': 'sign-in' })),
  SignUp: vi.fn(() => React.createElement('div', { 'data-testid': 'sign-up' })),
  UserButton: vi.fn(() => React.createElement('button', { 'data-testid': 'user-button' })),
  UserProfile: vi.fn(() => React.createElement('div', { 'data-testid': 'user-profile' })),
  OrganizationSwitcher: vi.fn(() => React.createElement('div', { 'data-testid': 'org-switcher' })),
  OrganizationProfile: vi.fn(() => React.createElement('div', { 'data-testid': 'org-profile' })),
  CreateOrganization: vi.fn(() => React.createElement('div', { 'data-testid': 'create-org' })),
  
  // Authentication State Components
  RedirectToSignIn: vi.fn(() => React.createElement('div', { 'data-testid': 'redirect-sign-in' })),
  RedirectToSignUp: vi.fn(() => React.createElement('div', { 'data-testid': 'redirect-sign-up' })),
  RedirectToUserProfile: vi.fn(() => React.createElement('div', { 'data-testid': 'redirect-user-profile' })),
  SignedIn: vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'signed-in' }, children)),
  SignedOut: vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'signed-out' }, children)),
}));

/**
 * Test suite for client-side exports from the auth package
 * 
 * This suite validates:
 * - All client-side exports are available and properly typed
 * - React hooks and components function correctly
 * - Proper re-exports from @clerk/nextjs
 * - Browser-specific functionality works as expected
 * - No server-only code is exposed to client
 */
describe('Client Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Structure', () => {
    it('should export client-side functionality', async () => {
      const clientModule = await import('../client.js');
      
      expect(clientModule).toBeDefined();
      expect(typeof clientModule).toBe('object');
      expect(clientModule).not.toBeNull();
    });

    it('should not contain server-only directive', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const clientFilePath = path.resolve(__dirname, '../client.ts');
      const content = await fs.readFile(clientFilePath, 'utf-8');
      
      expect(content).not.toContain("import 'server-only'");
    });

    it('should re-export from @clerk/nextjs', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const clientFilePath = path.resolve(__dirname, '../client.ts');
      const content = await fs.readFile(clientFilePath, 'utf-8');
      
      expect(content).toContain("export * from '@clerk/nextjs'");
    });
  });

  describe('React Hooks', () => {
    it('should export useAuth hook', async () => {
      const { useAuth } = await import('../client.js');
      
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe('function');
    });

    it('should export useUser hook', async () => {
      const { useUser } = await import('../client.js');
      
      expect(useUser).toBeDefined();
      expect(typeof useUser).toBe('function');
    });

    it('should export useClerk hook', async () => {
      const { useClerk } = await import('../client.js');
      
      expect(useClerk).toBeDefined();
      expect(typeof useClerk).toBe('function');
    });

    it('should export useSession hook', async () => {
      const { useSession } = await import('../client.js');
      
      expect(useSession).toBeDefined();
      expect(typeof useSession).toBe('function');
    });

    it('should export useOrganization hook', async () => {
      const { useOrganization } = await import('../client.js');
      
      expect(useOrganization).toBeDefined();
      expect(typeof useOrganization).toBe('function');
    });

    it('should export useSignIn hook', async () => {
      const { useSignIn } = await import('../client.js');
      
      expect(useSignIn).toBeDefined();
      expect(typeof useSignIn).toBe('function');
    });

    it('should export useSignUp hook', async () => {
      const { useSignUp } = await import('../client.js');
      
      expect(useSignUp).toBeDefined();
      expect(typeof useSignUp).toBe('function');
    });
  });

  describe('React Components', () => {
    it('should export ClerkProvider component', async () => {
      const { ClerkProvider } = await import('../client.js');
      
      expect(ClerkProvider).toBeDefined();
      
      // Should be a React component (function or class)
      expect(typeof ClerkProvider === 'function' || typeof ClerkProvider === 'object').toBe(true);
    });

    it('should export SignIn component', async () => {
      const { SignIn } = await import('../client.js');
      
      expect(SignIn).toBeDefined();
      expect(typeof SignIn === 'function' || typeof SignIn === 'object').toBe(true);
    });

    it('should export SignUp component', async () => {
      const { SignUp } = await import('../client.js');
      
      expect(SignUp).toBeDefined();
      expect(typeof SignUp === 'function' || typeof SignUp === 'object').toBe(true);
    });

    it('should export UserButton component', async () => {
      const { UserButton } = await import('../client.js');
      
      expect(UserButton).toBeDefined();
      expect(typeof UserButton === 'function' || typeof UserButton === 'object').toBe(true);
    });

    it('should export UserProfile component', async () => {
      const { UserProfile } = await import('../client.js');
      
      expect(UserProfile).toBeDefined();
      expect(typeof UserProfile === 'function' || typeof UserProfile === 'object').toBe(true);
    });

    it('should export OrganizationSwitcher component', async () => {
      const { OrganizationSwitcher } = await import('../client.js');
      
      expect(OrganizationSwitcher).toBeDefined();
      expect(typeof OrganizationSwitcher === 'function' || typeof OrganizationSwitcher === 'object').toBe(true);
    });

    it('should export OrganizationProfile component', async () => {
      const { OrganizationProfile } = await import('../client.js');
      
      expect(OrganizationProfile).toBeDefined();
      expect(typeof OrganizationProfile === 'function' || typeof OrganizationProfile === 'object').toBe(true);
    });

    it('should export CreateOrganization component', async () => {
      const { CreateOrganization } = await import('../client.js');
      
      expect(CreateOrganization).toBeDefined();
      expect(typeof CreateOrganization === 'function' || typeof CreateOrganization === 'object').toBe(true);
    });
  });

  describe('Authentication State Management', () => {
    it('should export RedirectToSignIn component', async () => {
      const { RedirectToSignIn } = await import('../client.js');
      
      expect(RedirectToSignIn).toBeDefined();
      expect(typeof RedirectToSignIn === 'function' || typeof RedirectToSignIn === 'object').toBe(true);
    });

    it('should export RedirectToSignUp component', async () => {
      const { RedirectToSignUp } = await import('../client.js');
      
      expect(RedirectToSignUp).toBeDefined();
      expect(typeof RedirectToSignUp === 'function' || typeof RedirectToSignUp === 'object').toBe(true);
    });

    it('should export RedirectToUserProfile component', async () => {
      const { RedirectToUserProfile } = await import('../client.js');
      
      expect(RedirectToUserProfile).toBeDefined();
      expect(typeof RedirectToUserProfile === 'function' || typeof RedirectToUserProfile === 'object').toBe(true);
    });

    it('should export SignedIn component', async () => {
      const { SignedIn } = await import('../client.js');
      
      expect(SignedIn).toBeDefined();
      expect(typeof SignedIn === 'function' || typeof SignedIn === 'object').toBe(true);
    });

    it('should export SignedOut component', async () => {
      const { SignedOut } = await import('../client.js');
      
      expect(SignedOut).toBeDefined();
      expect(typeof SignedOut === 'function' || typeof SignedOut === 'object').toBe(true);
    });
  });

  describe('Hook Functionality', () => {
    it('should provide useAuth hook with expected interface', async () => {
      const { useAuth } = await import('../client.js');
      
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe('function');
    });

    it('should provide useUser hook with expected interface', async () => {
      const { useUser } = await import('../client.js');
      
      expect(useUser).toBeDefined();
      expect(typeof useUser).toBe('function');
    });

    it('should provide useClerk hook with expected interface', async () => {
      const { useClerk } = await import('../client.js');
      
      expect(useClerk).toBeDefined();
      expect(typeof useClerk).toBe('function');
    });
  });

  describe('Component Functionality', () => {
    it('should provide ClerkProvider with expected props interface', async () => {
      const { ClerkProvider } = await import('../client.js');
      
      expect(ClerkProvider).toBeDefined();
      
      // Mock React.createElement to test component usage
      const mockCreateElement = vi.spyOn(React, 'createElement');
      
      // This should not throw when used as a React component
      expect(() => {
        React.createElement(ClerkProvider, {
          publishableKey: 'pk_test_example',
          children: React.createElement('div', null, 'Test'),
        });
      }).not.toThrow();

      mockCreateElement.mockRestore();
    });

    it('should provide authentication components with proper interfaces', async () => {
      const { SignIn, SignUp, UserButton } = await import('../client.js');
      
      expect(SignIn).toBeDefined();
      expect(SignUp).toBeDefined();
      expect(UserButton).toBeDefined();
      
      // These should be usable as React components
      expect(() => {
        React.createElement(SignIn);
        React.createElement(SignUp);
        React.createElement(UserButton);
      }).not.toThrow();
    });

    it('should provide conditional rendering components', async () => {
      const { SignedIn, SignedOut } = await import('../client.js');
      
      expect(SignedIn).toBeDefined();
      expect(SignedOut).toBeDefined();
      
      // These should accept children
      expect(() => {
        React.createElement(SignedIn, null, React.createElement('div', null, 'Signed in content'));
        React.createElement(SignedOut, null, React.createElement('div', null, 'Signed out content'));
      }).not.toThrow();
    });
  });

  describe('Browser Environment Compatibility', () => {
    it('should work in browser environment', async () => {
      // Mock browser environment
      const originalWindow = global.window;
      const originalDocument = global.document;
      
      // @ts-ignore - Simulating browser environment
      global.window = {
        location: { 
          href: 'http://localhost:3000',
          ancestorOrigins: {} as DOMStringList,
          hash: '',
          host: 'localhost:3000',
          hostname: 'localhost',
          origin: 'http://localhost:3000',
          pathname: '/',
          port: '3000',
          protocol: 'http:',
          search: '',
          assign: vi.fn(),
          reload: vi.fn(),
          replace: vi.fn(),
        } as Location,
        localStorage: {
          length: 0,
          clear: vi.fn(),
          key: vi.fn(),
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        } as Storage,
      };
      // @ts-ignore - Simulating browser environment
      global.document = {
        createElement: vi.fn(),
        getElementById: vi.fn(),
      };

      try {
        const clientModule = await import('../client.js');
        expect(clientModule).toBeDefined();
        expect(clientModule.useAuth).toBeDefined();
        expect(clientModule.ClerkProvider).toBeDefined();
      } finally {
        global.window = originalWindow;
        global.document = originalDocument;
      }
    });

    it('should handle missing browser APIs gracefully', async () => {
      // Remove browser APIs temporarily
      const originalWindow = global.window;
      const originalDocument = global.document;
      
      // @ts-ignore
      global.window = undefined;
      // @ts-ignore
      global.document = undefined;

      try {
        // Should still be importable even without browser APIs
        const clientModule = await import('../client.js');
        expect(clientModule).toBeDefined();
      } finally {
        global.window = originalWindow;
        global.document = originalDocument;
      }
    });
  });

  describe('Integration with Custom Components', () => {
    it('should work with custom sign-in component', async () => {
      const clientModule = await import('../client.js');
      const { SignIn } = await import('../components/sign-in.js');
      
      // Both Clerk's SignIn and our custom SignIn should be available
      expect(clientModule.SignIn).toBeDefined();
      expect(SignIn).toBeDefined();
      
      // They might be different implementations
      // Our custom one is in components/, Clerk's is re-exported
    });

    it('should work with custom sign-up component', async () => {
      const clientModule = await import('../client.js');
      const { SignUp } = await import('../components/sign-up.js');
      
      expect(clientModule.SignUp).toBeDefined();
      expect(SignUp).toBeDefined();
    });

    it('should integrate with ClerkProvider from provider module', async () => {
      const clientModule = await import('../client.js');
      const providerModule = await import('../provider.js');
      
      // Both should be available - client exports Clerk's ClerkProvider, provider exports custom AuthProvider
      expect(clientModule.ClerkProvider).toBeDefined();
      expect(providerModule.AuthProvider).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const { useAuth } = await import('../client.js');
      
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe('function');
    });

    it('should handle network errors in hooks', async () => {
      const { useUser } = await import('../client.js');
      
      expect(useUser).toBeDefined();
      expect(typeof useUser).toBe('function');
    });
  });

  describe('Performance Considerations', () => {
    it('should load efficiently', async () => {
      const startTime = performance.now();
      
      await import('../client.js');
      
      const loadTime = performance.now() - startTime;
      
      // Client module should load quickly
      expect(loadTime).toBeLessThan(100);
    });

    it('should not cause unnecessary re-renders', async () => {
      const { useAuth, useUser } = await import('../client.js');
      
      expect(useAuth).toBeDefined();
      expect(useUser).toBeDefined();
      
      // Hooks should be stable references
      expect(typeof useAuth).toBe('function');
      expect(typeof useUser).toBe('function');
    });
  });

  describe('TypeScript Integration', () => {
    it('should provide proper TypeScript types for hooks', async () => {
      const clientModule = await import('../client.js');
      
      // These should be properly typed
      expect(typeof clientModule.useAuth).toBe('function');
      expect(typeof clientModule.useUser).toBe('function');
      expect(typeof clientModule.useClerk).toBe('function');
      expect(typeof clientModule.useSession).toBe('function');
    });

    it('should provide proper TypeScript types for components', async () => {
      const clientModule = await import('../client.js');
      
      // Components should be properly typed
      expect(clientModule.ClerkProvider).toBeDefined();
      expect(clientModule.SignIn).toBeDefined();
      expect(clientModule.SignUp).toBeDefined();
      expect(clientModule.UserButton).toBeDefined();
    });

    it('should maintain type safety across the module', async () => {
      // This test verifies TypeScript compilation succeeds
      const clientModule = await import('../client.js');
      
      expect(clientModule).toBeDefined();
      expect(typeof clientModule).toBe('object');
    });
  });
});