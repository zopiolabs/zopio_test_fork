# Zopio Testing Implementation Roadmap

## Overview

This document provides detailed, step-by-step instructions for AI agents to implement comprehensive test coverage across the Zopio monorepo. Each task is designed to be atomic, actionable, and verifiable.

## Implementation Phases

### Phase 1: Foundation Setup (Estimated: 8-12 hours)

#### Task 1.1: Enhance Testing Infrastructure Package

**Objective**: Create comprehensive shared testing utilities and configurations

**Files to Create/Modify**:
```
packages/testing/
├── src/
│   ├── index.ts
│   ├── utils/
│   │   ├── test-helpers.ts
│   │   ├── mock-factories.ts
│   │   ├── custom-matchers.ts
│   │   └── setup-tests.ts
│   ├── mocks/
│   │   ├── clerk.ts
│   │   ├── database.ts
│   │   ├── sentry.ts
│   │   └── next-router.ts
│   ├── fixtures/
│   │   ├── user-fixtures.ts
│   │   ├── api-fixtures.ts
│   │   └── component-fixtures.ts
│   └── react/
│       ├── render-with-providers.tsx
│       └── test-providers.tsx
├── package.json
└── vitest.config.ts
```

**Step-by-Step Instructions**:

1. **Update package.json dependencies**:
```bash
cd packages/testing
```

Add these dependencies to `package.json`:
```json
{
  "dependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0", 
    "@testing-library/user-event": "^14.0.0",
    "msw": "^2.0.0",
    "vitest-mock-extended": "latest",
    "happy-dom": "^12.0.0"
  }
}
```

2. **Create shared test utilities** (`src/utils/test-helpers.ts`):
```typescript
import { vi } from 'vitest';

// User mocking utilities
export const createMockUser = (overrides: Partial<UserContext> = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  roles: ['user'],
  permissions: ['read'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// API mocking utilities
export const createMockRequest = (url: string, options: RequestInit = {}) => 
  new Request(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

export const createMockResponse = (data: any, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

// Database mocking utilities
export const createMockPrismaClient = () => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn()
});

// Environment mocking
export const mockEnvironment = (envVars: Record<string, string>) => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, ...envVars };
  });
  afterEach(() => {
    process.env = originalEnv;
  });
};

// Async testing utilities
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForElement = async (selector: string, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
};
```

3. **Create mock factories** (`src/utils/mock-factories.ts`):
```typescript
import { vi } from 'vitest';

// Clerk mocks
export const createClerkMocks = () => ({
  useAuth: vi.fn(() => ({
    isSignedIn: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    signOut: vi.fn()
  })),
  useUser: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User'
    }
  })),
  SignIn: vi.fn(({ children }) => <div data-testid="sign-in">{children}</div>),
  SignUp: vi.fn(({ children }) => <div data-testid="sign-up">{children}</div>)
});

// Next.js router mocks
export const createNextRouterMock = (pathname = '/') => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname,
  query: {},
  asPath: pathname,
  route: pathname,
  basePath: '',
  isReady: true,
  isPreview: false,
  isLocaleDomain: false
});

// Sentry mocks
export const createSentryMocks = () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => callback({
    setTag: vi.fn(),
    setLevel: vi.fn(),
    setContext: vi.fn()
  }))
});
```

4. **Create React testing utilities** (`src/react/render-with-providers.tsx`):
```typescript
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { DesignSystemProvider } from '@repo/design-system';
import { ThemeProvider } from 'next-themes';

// Theme provider for testing
const TestThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    disableTransitionOnChange
  >
    {children}
  </ThemeProvider>
);

// Complete provider wrapper
const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <DesignSystemProvider>
    <TestThemeProvider>
      {children}
    </TestThemeProvider>
  </DesignSystemProvider>
);

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {}
) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
```

5. **Create vitest setup file** (`src/utils/setup-tests.ts`):
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add custom matchers
expect.extend(toHaveNoViolations);

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test configuration
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});
```

6. **Update main index.ts**:
```typescript
// packages/testing/src/index.ts
export * from './utils/test-helpers';
export * from './utils/mock-factories';
export * from './react/render-with-providers';
export * from './mocks/clerk';
export * from './mocks/database';
export * from './mocks/sentry';
export * from './mocks/next-router';
```

**Validation Commands**:
```bash
cd packages/testing
pnpm install
pnpm build
pnpm typecheck
```

#### Task 1.2: Create Package Template Structure

**Objective**: Establish consistent test structure across all packages

**Template Structure**:
```
packages/[package-name]/
├── __tests__/
│   ├── unit/
│   │   ├── [file-name].test.ts
│   │   └── components/
│   │       └── [component-name].test.tsx
│   ├── integration/
│   │   └── [workflow-name].integration.test.ts
│   ├── __mocks__/
│   │   └── [dependency-name].ts
│   └── test-utils.ts
├── vitest.config.ts (if needed)
└── package.json (updated with test script)
```

**Script to Generate Template**:
```bash
#!/bin/bash
# create-test-structure.sh

PACKAGE_NAME=$1
PACKAGE_PATH="packages/$PACKAGE_NAME"

if [ -z "$PACKAGE_NAME" ]; then
  echo "Usage: ./create-test-structure.sh <package-name>"
  exit 1
fi

# Create test directories
mkdir -p "$PACKAGE_PATH/__tests__/unit"
mkdir -p "$PACKAGE_PATH/__tests__/integration" 
mkdir -p "$PACKAGE_PATH/__tests__/__mocks__"

# Create test-utils.ts
cat > "$PACKAGE_PATH/__tests__/test-utils.ts" << 'EOF'
/**
 * Test utilities specific to this package
 */
import { vi } from 'vitest';
import { createMockUser, createMockRequest } from '@repo/testing';

// Package-specific test helpers go here
export const createMock[PackageName] = () => {
  // Mock implementation
};

export { createMockUser, createMockRequest };
EOF

echo "Test structure created for $PACKAGE_NAME"
```

### Phase 2: Critical Package Testing (Estimated: 40-50 hours)

#### Task 2.1: Test @repo/core-utils Package

**Priority**: Highest (foundation package used by all others)

**Implementation Steps**:

1. **Analyze package structure**:
```bash
cd packages/core-utils
ls -la src/  # Check if src directory exists, or files are in root
cat index.ts  # Understand exported functions
```

2. **Create comprehensive test file** (`__tests__/unit/index.test.ts`):
```typescript
/**
 * Comprehensive tests for @repo/core-utils
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  logger, 
  asyncUtils, 
  objectUtils, 
  stringUtils, 
  arrayUtils 
} from '../../index';

describe('@repo/core-utils', () => {
  describe('logger', () => {
    let consoleSpies: Record<string, any>;

    beforeEach(() => {
      consoleSpies = {
        info: vi.spyOn(console, 'info').mockImplementation(),
        error: vi.spyOn(console, 'error').mockImplementation(),
        warn: vi.spyOn(console, 'warn').mockImplementation(),
        debug: vi.spyOn(console, 'debug').mockImplementation(),
        log: vi.spyOn(console, 'log').mockImplementation()
      };
    });

    afterEach(() => {
      Object.values(consoleSpies).forEach(spy => spy.mockRestore());
      process.env.NODE_ENV = 'test';
    });

    describe('info', () => {
      it('should log info messages in development', () => {
        process.env.NODE_ENV = 'development';
        logger.info('Test message', { key: 'value' });
        
        expect(consoleSpies.info).toHaveBeenCalledWith(
          '[INFO] Test message', 
          { key: 'value' }
        );
      });

      it('should suppress info messages in production', () => {
        process.env.NODE_ENV = 'production';
        logger.info('Test message');
        
        expect(consoleSpies.info).not.toHaveBeenCalled();
      });

      it('should log info messages in test environment', () => {
        process.env.NODE_ENV = 'test';
        logger.info('Test message');
        
        expect(consoleSpies.info).not.toHaveBeenCalled();
      });
    });

    describe('error', () => {
      it('should always log error messages', () => {
        process.env.NODE_ENV = 'production';
        logger.error('Error message', { error: 'details' });
        
        expect(consoleSpies.error).toHaveBeenCalledWith(
          '[ERROR] Error message',
          { error: 'details' }
        );
      });

      it('should handle multiple arguments', () => {
        logger.error('Error', 'arg1', 'arg2', { key: 'value' });
        
        expect(consoleSpies.error).toHaveBeenCalledWith(
          '[ERROR] Error',
          'arg1',
          'arg2', 
          { key: 'value' }
        );
      });
    });

    describe('warn', () => {
      it('should always log warning messages', () => {
        process.env.NODE_ENV = 'production';
        logger.warn('Warning message');
        
        expect(consoleSpies.warn).toHaveBeenCalledWith('[WARN] Warning message');
      });
    });

    describe('debug', () => {
      it('should log debug messages only in development', () => {
        process.env.NODE_ENV = 'development';
        logger.debug('Debug message');
        
        expect(consoleSpies.debug).toHaveBeenCalledWith('[DEBUG] Debug message');
      });

      it('should suppress debug messages in production', () => {
        process.env.NODE_ENV = 'production';
        logger.debug('Debug message');
        
        expect(consoleSpies.debug).not.toHaveBeenCalled();
      });
    });
  });

  describe('asyncUtils', () => {
    describe('safeAsync', () => {
      it('should return result and null error on success', async () => {
        const successFn = async (x: number) => x * 2;
        const safeFn = asyncUtils.safeAsync(successFn);
        
        const [result, error] = await safeFn(5);
        
        expect(result).toBe(10);
        expect(error).toBeNull();
      });

      it('should return null result and error on failure', async () => {
        const errorMessage = 'Test error';
        const failFn = async () => { 
          throw new Error(errorMessage); 
        };
        const safeFn = asyncUtils.safeAsync(failFn);
        
        const [result, error] = await safeFn();
        
        expect(result).toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBe(errorMessage);
      });

      it('should preserve function arguments', async () => {
        const multiArgFn = async (a: number, b: string, c: boolean) => 
          `${a}-${b}-${c}`;
        const safeFn = asyncUtils.safeAsync(multiArgFn);
        
        const [result, error] = await safeFn(42, 'test', true);
        
        expect(result).toBe('42-test-true');
        expect(error).toBeNull();
      });

      it('should handle non-Error exceptions', async () => {
        const failFn = async () => { 
          throw 'String error'; 
        };
        const safeFn = asyncUtils.safeAsync(failFn);
        
        const [result, error] = await safeFn();
        
        expect(result).toBeNull();
        expect(error).toBe('String error');
      });

      it('should maintain function context', async () => {
        class TestClass {
          value = 42;
          
          async getValue() {
            return this.value;
          }
        }
        
        const instance = new TestClass();
        const safeFn = asyncUtils.safeAsync(instance.getValue.bind(instance));
        
        const [result, error] = await safeFn();
        
        expect(result).toBe(42);
        expect(error).toBeNull();
      });
    });
  });

  describe('objectUtils', () => {
    describe('deepMerge', () => {
      it('should merge simple objects', () => {
        const target = { a: 1, b: 2 };
        const source = { b: 3, c: 4 };
        const result = objectUtils.deepMerge(target, source);
        
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
        expect(result).not.toBe(target); // Should not mutate original
      });

      it('should merge nested objects', () => {
        const target = { a: { x: 1, y: 2 }, b: 3 };
        const source = { a: { y: 4, z: 5 }, c: 6 };
        const result = objectUtils.deepMerge(target, source);
        
        expect(result).toEqual({
          a: { x: 1, y: 4, z: 5 },
          b: 3,
          c: 6
        });
      });

      it('should handle null and undefined values', () => {
        const target = { a: 1, b: null, c: undefined };
        const source = { b: 2, c: 3, d: undefined };
        const result = objectUtils.deepMerge(target, source);
        
        expect(result).toEqual({ a: 1, b: 2, c: 3 });
      });

      it('should handle array values correctly', () => {
        const target = { arrays: [1, 2, 3] };
        const source = { arrays: [4, 5, 6] };
        const result = objectUtils.deepMerge(target, source);
        
        expect(result).toEqual({ arrays: [4, 5, 6] });
      });

      it('should handle deeply nested structures', () => {
        const target = {
          level1: {
            level2: {
              level3: { value: 'original' }
            }
          }
        };
        const source = {
          level1: {
            level2: {
              level3: { value: 'updated', newKey: 'new' }
            }
          }
        };
        const result = objectUtils.deepMerge(target, source);
        
        expect(result).toEqual({
          level1: {
            level2: {
              level3: { value: 'updated', newKey: 'new' }
            }
          }
        });
      });

      it('should handle non-object parameters gracefully', () => {
        const target = { a: 1 };
        const result1 = objectUtils.deepMerge(target, null as any);
        const result2 = objectUtils.deepMerge(target, 'string' as any);
        
        expect(result1).toEqual({ a: 1 });
        expect(result2).toEqual({ a: 1 });
      });
    });
  });

  describe('stringUtils', () => {
    describe('toCamelCase', () => {
      it('should convert space-separated words to camelCase', () => {
        expect(stringUtils.toCamelCase('hello world')).toBe('helloWorld');
        expect(stringUtils.toCamelCase('the quick brown fox')).toBe('theQuickBrownFox');
      });

      it('should handle PascalCase input', () => {
        expect(stringUtils.toCamelCase('HelloWorld')).toBe('helloWorld');
        expect(stringUtils.toCamelCase('XMLHttpRequest')).toBe('xMLHttpRequest');
      });

      it('should handle mixed separators', () => {
        expect(stringUtils.toCamelCase('hello-world test')).toBe('helloWorldTest');
        expect(stringUtils.toCamelCase('API_KEY value')).toBe('aPIKEYValue');
      });

      it('should handle edge cases', () => {
        expect(stringUtils.toCamelCase('')).toBe('');
        expect(stringUtils.toCamelCase('a')).toBe('a');
        expect(stringUtils.toCamelCase('A')).toBe('a');
      });

      it('should handle multiple spaces', () => {
        expect(stringUtils.toCamelCase('hello    world')).toBe('helloWorld');
      });
    });

    describe('toKebabCase', () => {
      it('should convert camelCase to kebab-case', () => {
        expect(stringUtils.toKebabCase('helloWorld')).toBe('hello-world');
        expect(stringUtils.toKebabCase('theQuickBrownFox')).toBe('the-quick-brown-fox');
      });

      it('should convert PascalCase to kebab-case', () => {
        expect(stringUtils.toKebabCase('HelloWorld')).toBe('hello-world');
        expect(stringUtils.toKebabCase('XMLHttpRequest')).toBe('x-m-l-http-request');
      });

      it('should handle space-separated words', () => {
        expect(stringUtils.toKebabCase('hello world')).toBe('hello-world');
        expect(stringUtils.toKebabCase('the quick brown fox')).toBe('the-quick-brown-fox');
      });

      it('should handle edge cases', () => {
        expect(stringUtils.toKebabCase('')).toBe('');
        expect(stringUtils.toKebabCase('a')).toBe('a');
        expect(stringUtils.toKebabCase('A')).toBe('a');
      });

      it('should handle multiple spaces', () => {
        expect(stringUtils.toKebabCase('hello    world')).toBe('hello-world');
      });

      it('should handle already kebab-case strings', () => {
        expect(stringUtils.toKebabCase('hello-world')).toBe('hello-world');
      });
    });
  });

  describe('arrayUtils', () => {
    describe('groupBy', () => {
      it('should group objects by specified key', () => {
        const array = [
          { category: 'fruit', name: 'apple' },
          { category: 'fruit', name: 'banana' },
          { category: 'vegetable', name: 'carrot' },
          { category: 'fruit', name: 'orange' }
        ];
        
        const result = arrayUtils.groupBy(array, 'category');
        
        expect(result).toEqual({
          fruit: [
            { category: 'fruit', name: 'apple' },
            { category: 'fruit', name: 'banana' },
            { category: 'fruit', name: 'orange' }
          ],
          vegetable: [
            { category: 'vegetable', name: 'carrot' }
          ]
        });
      });

      it('should handle numeric grouping keys', () => {
        const array = [
          { score: 95, name: 'Alice' },
          { score: 87, name: 'Bob' },
          { score: 95, name: 'Charlie' }
        ];
        
        const result = arrayUtils.groupBy(array, 'score');
        
        expect(result).toEqual({
          '95': [
            { score: 95, name: 'Alice' },
            { score: 95, name: 'Charlie' }
          ],
          '87': [
            { score: 87, name: 'Bob' }
          ]
        });
      });

      it('should handle empty arrays', () => {
        const result = arrayUtils.groupBy([], 'key');
        expect(result).toEqual({});
      });

      it('should handle arrays with missing keys', () => {
        const array = [
          { category: 'fruit', name: 'apple' },
          { name: 'mystery' },
          { category: 'vegetable', name: 'carrot' }
        ];
        
        const result = arrayUtils.groupBy(array, 'category');
        
        expect(result).toEqual({
          fruit: [{ category: 'fruit', name: 'apple' }],
          undefined: [{ name: 'mystery' }],
          vegetable: [{ category: 'vegetable', name: 'carrot' }]
        });
      });

      it('should handle boolean grouping keys', () => {
        const array = [
          { active: true, name: 'Alice' },
          { active: false, name: 'Bob' },
          { active: true, name: 'Charlie' }
        ];
        
        const result = arrayUtils.groupBy(array, 'active');
        
        expect(result).toEqual({
          'true': [
            { active: true, name: 'Alice' },
            { active: true, name: 'Charlie' }
          ],
          'false': [
            { active: false, name: 'Bob' }
          ]
        });
      });
    });
  });

  describe('integration tests', () => {
    it('should work together in complex scenarios', async () => {
      // Test logger with async utilities
      const logErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      
      const failingAsyncFn = async (data: any) => {
        logger.debug('Processing data', data);
        throw new Error('Processing failed');
      };
      
      const safeFn = asyncUtils.safeAsync(failingAsyncFn);
      const [result, error] = await safeFn({ key: 'value' });
      
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      
      logErrorSpy.mockRestore();
    });

    it('should handle utility function combinations', () => {
      const data = [
        { category: 'ComponentName', type: 'UI' },
        { category: 'api-endpoint', type: 'API' },
        { category: 'HelperFunction', type: 'Utility' }
      ];
      
      // Group by camelCase category
      const processed = data.map(item => ({
        ...item,
        category: stringUtils.toCamelCase(item.category)
      }));
      
      const grouped = arrayUtils.groupBy(processed, 'type');
      
      expect(grouped).toEqual({
        UI: [{ category: 'componentName', type: 'UI' }],
        API: [{ category: 'apiEndpoint', type: 'API' }],
        Utility: [{ category: 'helperFunction', type: 'Utility' }]
      });
    });
  });
});
```

3. **Add test script to package.json**:
```json
{
  "scripts": {
    "test": "vitest run --coverage",
    "test:watch": "vitest --coverage"
  }
}
```

4. **Run tests and verify coverage**:
```bash
cd packages/core-utils
pnpm test
# Should show 90%+ coverage for all metrics
```

**Validation Criteria**:
- ✅ All exported functions tested
- ✅ Error scenarios covered  
- ✅ Edge cases handled
- ✅ Integration scenarios tested
- ✅ 90%+ coverage achieved
- ✅ Tests pass consistently

#### Task 2.2: Test @repo/auth Package

**Implementation Steps**:

1. **Analyze package structure**:
```bash
cd packages/auth
find . -name "*.ts" -o -name "*.tsx" | head -20
```

2. **Create mock files** (`__tests__/__mocks__/clerk.ts`):
```typescript
import { vi } from 'vitest';

export const mockClerk = {
  authenticateRequest: vi.fn(),
  verifyToken: vi.fn(),
  redirectToSignIn: vi.fn(),
  redirectToSignUp: vi.fn()
};

export const useAuth = vi.fn(() => ({
  isSignedIn: true,
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  signOut: vi.fn(),
  getToken: vi.fn(() => Promise.resolve('mock-token'))
}));

export const useUser = vi.fn(() => ({
  user: {
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User'
  },
  isLoaded: true
}));

export const SignIn = vi.fn(({ children }) => 
  <div data-testid="clerk-sign-in">{children}</div>
);

export const SignUp = vi.fn(({ children }) => 
  <div data-testid="clerk-sign-up">{children}</div>
);

export const authMiddleware = vi.fn((config) => (req) => {
  // Mock middleware implementation
  return new Response('OK', { status: 200 });
});
```

3. **Test middleware** (`__tests__/unit/clerk-auth-middleware.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { clerkAuthMiddleware } from '../../clerk-auth-middleware';

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  authMiddleware: vi.fn((config) => vi.fn((req) => {
    // Mock implementation based on request
    const url = new URL(req.url);
    
    if (config.publicRoutes?.some((route: string) => url.pathname.startsWith(route))) {
      return new Response('OK', { status: 200 });
    }
    
    // Check for auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 307,
        headers: { location: '/sign-in' }
      });
    }
    
    return new Response('OK', { status: 200 });
  }))
}));

describe('clerkAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow access to public routes', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await clerkAuthMiddleware(request);
    
    expect(response.status).toBe(200);
  });

  it('should redirect unauthenticated users to sign-in', async () => {
    const request = new NextRequest('http://localhost/dashboard');
    const response = await clerkAuthMiddleware(request);
    
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/sign-in');
  });

  it('should allow authenticated requests', async () => {
    const request = new NextRequest('http://localhost/dashboard', {
      headers: { authorization: 'Bearer valid-token' }
    });
    const response = await clerkAuthMiddleware(request);
    
    expect(response.status).toBe(200);
  });

  it('should handle API routes correctly', async () => {
    const request = new NextRequest('http://localhost/api/private');
    const response = await clerkAuthMiddleware(request);
    
    // Should check authentication for private API routes
    expect(response.status).toBe(200);
  });
});
```

4. **Test components** (`__tests__/unit/components/sign-in.test.tsx`):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignInComponent } from '../../../components/sign-in';

// Mock Clerk components
vi.mock('@clerk/nextjs', () => ({
  SignIn: vi.fn(() => <div data-testid="clerk-sign-in">Sign In Form</div>)
}));

describe('SignInComponent', () => {
  it('should render Clerk SignIn component', () => {
    render(<SignInComponent />);
    
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument();
    expect(screen.getByText('Sign In Form')).toBeInTheDocument();
  });

  it('should apply custom styling', () => {
    render(<SignInComponent className="custom-class" />);
    
    const signInElement = screen.getByTestId('clerk-sign-in');
    expect(signInElement.parentElement).toHaveClass('custom-class');
  });
});
```

5. **Test token verification** (`__tests__/unit/lib/verify-clerk-token.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyClerkToken } from '../../../lib/verify-clerk-token';

// Mock Clerk JWT verification
vi.mock('@clerk/clerk-sdk-node', () => ({
  verifyToken: vi.fn()
}));

import { verifyToken } from '@clerk/clerk-sdk-node';

describe('verifyClerkToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user info for valid tokens', async () => {
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      exp: Date.now() + 3600000
    };
    
    vi.mocked(verifyToken).mockResolvedValue(mockPayload);
    
    const result = await verifyClerkToken('valid-token');
    
    expect(result).toEqual({
      valid: true,
      userId: 'user-123',
      email: 'test@example.com'
    });
  });

  it('should return error for invalid tokens', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));
    
    const result = await verifyClerkToken('invalid-token');
    
    expect(result).toEqual({
      valid: false,
      error: 'Invalid token'
    });
  });

  it('should handle expired tokens', async () => {
    const expiredPayload = {
      sub: 'user-123',
      exp: Date.now() - 3600000  // Expired 1 hour ago
    };
    
    vi.mocked(verifyToken).mockResolvedValue(expiredPayload);
    
    const result = await verifyClerkToken('expired-token');
    
    expect(result).toEqual({
      valid: false,
      error: 'Token expired'
    });
  });
});
```

**Continue with similar patterns for all critical packages...**

### Phase 3: UI Component Testing (Estimated: 30-40 hours)

#### Task 3.1: Test @repo/design-system Package

**Special Requirements**: Accessibility testing, visual regression testing, user interaction testing

**Implementation Pattern for Each Component**:

```typescript
// __tests__/unit/ui/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../../../ui/button';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Test Button');
    });

    it('should render as different elements with asChild prop', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      
      const element = screen.getByRole('link');
      expect(element).toHaveTextContent('Link Button');
      expect(element).toHaveAttribute('href', '/test');
    });
  });

  describe('Variants', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
    
    it.each(variants)('should render %s variant correctly', (variant) => {
      render(<Button variant={variant}>Test</Button>);
      const button = screen.getByRole('button');
      
      // Check that variant-specific classes are applied
      expect(button).toBeInTheDocument();
      expect(button.className).toContain(variant === 'default' ? 'bg-primary' : '');
    });
  });

  describe('Sizes', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const;
    
    it.each(sizes)('should render %s size correctly', (size) => {
      render(<Button size={size}>Test</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      if (size === 'icon') {
        expect(button.className).toContain('size-9');
      }
    });
  });

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      await user.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should not trigger onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      await user.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick}>Keyboard Test</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledOnce();
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async () => {
      const { container } = render(<Button>Accessible button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes when disabled', () => {
      render(<Button disabled>Disabled button</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should support ARIA labels', () => {
      render(<Button aria-label="Custom label">Icon</Button>);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should have focus indicators', () => {
      render(<Button>Focus test</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      expect(button.className).toContain('focus-visible:ring');
    });
  });

  describe('Props and Ref Forwarding', () => {
    it('should forward refs correctly', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Ref test</Button>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    });

    it('should spread additional props', () => {
      render(<Button data-testid="custom-button" title="Custom title">Test</Button>);
      const button = screen.getByTestId('custom-button');
      
      expect(button).toHaveAttribute('title', 'Custom title');
    });

    it('should override default className', () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole('button');
      
      expect(button.className).toContain('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      render(<Button>{null}</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle complex children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });
});
```

### Phase 4: Medium Complexity Packages (Estimated: 25-35 hours)

**Packages to Test**: observability, email, payments, rate-limit, security, webhooks, cms, collaboration

**Implementation Strategy**:
1. Focus on core business logic first
2. Mock external services (Stripe, Sentry, email providers)
3. Test error handling extensively
4. Validate configuration options

### Phase 5: Integration Testing (Estimated: 15-20 hours)

**Application-Level Integration Tests**:

1. **API Route Testing**:
```typescript
// apps/api/__tests__/integration/health.integration.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../../app/health/route';

describe('/api/health', () => {
  it('should return health status', async () => {
    const request = new Request('http://localhost/api/health');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');
  });
});
```

2. **Cross-Package Integration**:
```typescript
// __tests__/integration/auth-rbac-integration.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateAccess } from '@repo/auth-rbac';
import { createMockUser } from '@repo/testing';

describe('Auth-RBAC Integration', () => {
  it('should work with complete auth flow', () => {
    const user = createMockUser({ roles: ['admin'] });
    const rules = [
      { resource: 'user', action: 'delete', roles: ['admin'] }
    ];
    
    const result = evaluateAccess({
      rules,
      context: user,
      action: 'delete',
      resource: 'user'
    });
    
    expect(result.can).toBe(true);
  });
});
```

## Validation & Quality Assurance

### Coverage Requirements Validation

**Command to Check Coverage**:
```bash
# Check overall coverage
pnpm test -- --coverage --run

# Check specific package coverage
cd packages/[package-name]
pnpm test -- --coverage --run --reporter=json > coverage.json

# Validate coverage thresholds
node -e "
const coverage = require('./coverage.json');
const { lines, branches, functions, statements } = coverage.coverageMap.getCoverageSummary();
console.log(\`Lines: \${lines.pct}%\`);
console.log(\`Branches: \${branches.pct}%\`);
console.log(\`Functions: \${functions.pct}%\`);
console.log(\`Statements: \${statements.pct}%\`);
"
```

### Quality Gates Checklist

For each package, ensure:
- [ ] All exported functions have tests
- [ ] Error scenarios are covered
- [ ] Edge cases are handled
- [ ] External dependencies are mocked
- [ ] 80%+ coverage achieved (90%+ for critical packages)
- [ ] Tests run in CI without warnings
- [ ] No console errors or warnings
- [ ] Accessibility tests pass (for UI components)
- [ ] Performance considerations addressed

### Final Validation Commands

```bash
# Run full test suite
pnpm test

# Check linting
pnpm lint

# Check type safety
pnpm typecheck

# Check naming conventions
pnpm check-naming

# Run build to ensure tests don't break compilation
pnpm build
```

## Success Metrics

**Quantitative Metrics**:
- Overall test coverage: 80%+ lines/branches/functions/statements
- Critical packages coverage: 90%+
- Test execution time: <2 minutes for full suite
- Test stability: <1% flaky test rate

**Qualitative Metrics**:
- All business logic functions tested
- Error handling comprehensively covered
- External integrations properly mocked
- Accessibility standards met for UI components
- Performance considerations addressed

## Maintenance Guidelines

**Ongoing Tasks**:
1. **New Feature Development**: Require 100% test coverage for new code
2. **Bug Fixes**: Add regression tests for all reported bugs
3. **Dependency Updates**: Update test mocks when external APIs change
4. **Performance Monitoring**: Regular review of test execution times
5. **Coverage Monitoring**: Weekly coverage reports and threshold enforcement

This roadmap provides comprehensive, actionable instructions for implementing a world-class testing suite across the Zopio monorepo. Each task is designed to be independently executable by AI agents while maintaining consistency and quality across the entire implementation.