# Zopio Monorepo Testing Architecture

## Executive Summary

This document provides comprehensive testing architecture guidelines for the Zopio monorepo, a modern full-stack business framework with 31 packages, 3 applications, and ~1,081 TypeScript files requiring test coverage.

**Current Testing State**: Minimal (3 test files in apps/, empty __tests__ directories in packages/)  
**Target Coverage**: 80% lines/branches/functions/statements (per Vitest config)  
**Testing Strategy**: Comprehensive unit testing with integration points for critical business logic

---

## 1. Current State Analysis

### 1.1 Existing Test Infrastructure

**Testing Framework**: Vitest 3.1.4 with V8 coverage provider
- **Root Config**: `/vitest.config.mjs` (80% coverage thresholds, per-file enforcement)
- **App-Specific Configs**: React Testing Library + jsdom for UI apps
- **Pipeline Integration**: Turbo monorepo with `test` task dependency on build

**Existing Test Files**:
```
apps/api/__tests__/health.test.ts          # API health endpoint test
apps/app/__tests__/sign-in.test.tsx        # Sign-in page component test  
apps/app/__tests__/sign-up.test.tsx        # Sign-up page component test
```

**Test Infrastructure Status**:
- ✅ Vitest configuration established
- ✅ Coverage reporting (HTML, LCOV, JSON)
- ✅ Turbo integration for monorepo testing
- ❌ Package-level test suites missing
- ❌ Testing utilities package incomplete
- ❌ Mock strategies undefined

### 1.2 Package Analysis Summary

**31 Packages Categorized**:
- **High-Complexity/Critical** (9): auth*, database, design-system, observability, security  
- **Medium-Complexity** (12): cms, collaboration, email, feature-flags, payments, rate-limit, etc.
- **Low-Complexity/Utility** (10): core-utils, seo, storage, trigger-rules, etc.

**Testing Priorities**:
1. **Critical Business Logic**: Authentication, authorization, database operations
2. **Security Components**: RBAC/ABAC engines, middleware, validation
3. **UI Components**: Design system components with accessibility testing
4. **Utilities**: Core utilities, string/array/object helpers
5. **Integration Points**: API routes, webhooks, external service integrations

---

## 2. Testing Strategy & Framework Choices

### 2.1 Technology Stack

**Core Testing Framework**: Vitest 3.1.4
- **Rationale**: Native ESM support, fast execution, TypeScript-first, excellent monorepo support
- **Environment**: Node.js for packages, jsdom for React components
- **Coverage**: V8 provider with HTML/LCOV reporting

**Supporting Libraries**:
```json
{
  "@testing-library/react": "^14.0.0",           // React component testing
  "@testing-library/jest-dom": "^6.0.0",         // DOM matchers
  "@testing-library/user-event": "^14.0.0",      // User interaction simulation
  "msw": "^2.0.0",                               // API mocking
  "happy-dom": "^12.0.0",                        // Alternative to jsdom
  "vitest-mock-extended": "latest"                // Advanced mocking utilities
}
```

### 2.2 Testing Patterns & Conventions

**File Organization**:
```
packages/[package-name]/
├── src/
│   ├── components/
│   ├── utils/
│   └── index.ts
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   ├── utils/
│   │   └── index.test.ts
│   ├── integration/
│   └── __mocks__/
├── vitest.config.ts        # Package-specific config if needed
└── package.json
```

**Naming Conventions**:
- **Unit Tests**: `*.test.ts`, `*.test.tsx`
- **Integration Tests**: `*.integration.test.ts`
- **Mock Files**: `__mocks__/[module-name].ts`
- **Test Utilities**: `test-utils/` directory in each package

**Import Patterns**:
```typescript
// Test imports
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Package imports (use alias)
import { logger } from '@repo/core-utils';
import { Button } from '@repo/design-system/ui';
```

---

## 3. Package-by-Package Testing Plan

### 3.1 Critical Packages (Priority 1)

#### 3.1.1 `@repo/auth` - Authentication Core
**Complexity**: High | **Files**: 7 | **Priority**: Critical

**Test Coverage Requirements**:
- **Clerk Integration** (`clerk-auth-middleware.ts`):
  - JWT token validation
  - Session management
  - Error handling for invalid tokens
  - Middleware request/response flow

- **Authentication Components** (`components/`):
  - Sign-in/sign-up form validation
  - Error state handling
  - Accessibility compliance
  - Integration with Clerk providers

- **Server/Client Utilities**:
  - Token verification functions
  - Session state management
  - Environment key validation

**Test Implementation**:
```typescript
// __tests__/unit/lib/verify-clerk-token.test.ts
describe('verifyClerkToken', () => {
  it('should validate genuine JWT tokens', async () => {
    const validToken = generateMockClerkToken();
    const result = await verifyClerkToken(validToken);
    expect(result).toMatchObject({ valid: true, userId: expect.any(String) });
  });

  it('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken();
    const result = await verifyClerkToken(expiredToken);
    expect(result).toMatchObject({ valid: false, error: 'Token expired' });
  });
});
```

#### 3.1.2 `@repo/auth-rbac` - Role-Based Access Control  
**Complexity**: High | **Files**: 8 | **Priority**: Critical

**Test Coverage Requirements**:
- **Permission Engine** (`engine/evaluate.ts`):
  - Rule matching algorithms
  - Condition evaluation logic
  - Field-level permission checks
  - DSL expression parsing
  - Performance with large rule sets

- **RBAC Rules** (`config/rules.ts`):
  - Rule definition validation
  - Default permission fallbacks
  - Resource/action pattern matching

**Critical Test Scenarios**:
```typescript
// __tests__/unit/engine/evaluate.test.ts
describe('evaluateAccess', () => {
  it('should grant access for matching rules', () => {
    const rules = [{ resource: 'user', action: 'read', condition: () => true }];
    const result = evaluateAccess({ rules, context: mockUser, action: 'read', resource: 'user' });
    expect(result).toEqual({ can: true });
  });

  it('should enforce field-level restrictions', () => {
    const rules = [{ 
      resource: 'user', 
      action: 'read', 
      fieldPermissions: { email: 'none' }
    }];
    const result = evaluateAccess({ 
      rules, 
      context: mockUser, 
      action: 'read', 
      resource: 'user', 
      field: 'email' 
    });
    expect(result).toEqual({ can: false, reason: "No access to field 'email'" });
  });
});
```

#### 3.1.3 `@repo/auth-abac` - Attribute-Based Access Control
**Complexity**: High | **Files**: 3 | **Priority**: Critical

**Test Coverage Requirements**:
- **ABAC Rules Engine** (`rules.ts`):
  - Attribute evaluation logic
  - Complex condition combinations
  - Dynamic rule application
  - Performance optimization testing

#### 3.1.4 `@repo/database` - Prisma Database Layer
**Complexity**: High | **Files**: 4 | **Priority**: Critical

**Test Coverage Requirements**:
- **Connection Singleton** (`index.ts`):
  - Database connection pooling
  - Transaction handling
  - Error recovery mechanisms
  - Environment-specific configurations

**Test Implementation Strategy**:
```typescript
// __tests__/unit/index.test.ts
describe('database connection', () => {
  it('should return singleton instance', () => {
    const db1 = database;
    const db2 = database;
    expect(db1).toBe(db2);
  });

  it('should handle connection errors gracefully', async () => {
    // Mock connection failure
    vi.mocked(PrismaClient).mockImplementationOnce(() => {
      throw new Error('Connection failed');
    });
    
    expect(() => database).toThrow('Connection failed');
  });
});
```

#### 3.1.5 `@repo/design-system` - UI Component Library
**Complexity**: High | **Files**: 50+ components | **Priority**: High

**Test Coverage Requirements**:
- **Core Components** (`ui/`): All 50+ components need comprehensive testing
  - **Accessibility**: ARIA attributes, keyboard navigation, screen reader support
  - **Variants**: All CVA variants and combinations
  - **User Interactions**: Click, hover, focus, form submission
  - **Props Validation**: Type safety and prop forwarding

- **Utility Functions** (`lib/utils.ts`):
  - `cn()` class merging function
  - Color manipulation utilities
  - Responsive utility functions

- **Hooks** (`hooks/`):
  - `use-mobile.ts` responsive detection
  - `use-toast.ts` notification system

**Component Testing Pattern**:
```typescript
// __tests__/unit/ui/button.test.tsx
describe('Button', () => {
  it('should render with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('should support all variants', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
    variants.forEach(variant => {
      render(<Button variant={variant}>Test</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be accessible', () => {
    render(<Button disabled>Disabled button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('disabled');
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });
});
```

### 3.2 Medium-Complexity Packages (Priority 2)

#### 3.2.1 `@repo/observability` - Error Tracking & Logging
**Files**: 6 | **Focus**: Error parsing, Sentry integration, logging utilities

#### 3.2.2 `@repo/email` - Email System
**Files**: 3 | **Focus**: Template rendering, delivery validation, React Email integration

#### 3.2.3 `@repo/payments` - Stripe Integration  
**Files**: 4 | **Focus**: Payment processing, webhook validation, subscription management

#### 3.2.4 `@repo/rate-limit` - Rate Limiting
**Files**: 4 | **Focus**: Rate limiting algorithms, Redis integration, middleware testing

### 3.3 Utility Packages (Priority 3)

#### 3.3.1 `@repo/core-utils` - Core Utilities
**Complexity**: Medium | **Files**: 1 large file | **Priority**: High (used everywhere)

**Test Coverage Requirements**:
- **Logger Functions**: All log levels, environment-based filtering
- **Async Utilities**: `safeAsync` error handling wrapper
- **Object Utilities**: `deepMerge` function with nested objects
- **String Utilities**: `toCamelCase`, `toKebabCase` conversion
- **Array Utilities**: `groupBy` function with complex objects

**Test Implementation**:
```typescript
// __tests__/unit/index.test.ts
describe('logger', () => {
  it('should log info messages in development', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation();
    process.env.NODE_ENV = 'development';
    
    logger.info('Test message', { key: 'value' });
    
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test message', { key: 'value' });
  });

  it('should suppress info messages in production', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation();
    process.env.NODE_ENV = 'production';
    
    logger.info('Test message');
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('asyncUtils.safeAsync', () => {
  it('should return result on success', async () => {
    const successFn = async (x: number) => x * 2;
    const safeFn = asyncUtils.safeAsync(successFn);
    
    const [result, error] = await safeFn(5);
    
    expect(result).toBe(10);
    expect(error).toBeNull();
  });

  it('should return error on failure', async () => {
    const failFn = async () => { throw new Error('Test error'); };
    const safeFn = asyncUtils.safeAsync(failFn);
    
    const [result, error] = await safeFn();
    
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Test error');
  });
});
```

---

## 4. Implementation Roadmap

### Phase 1: Foundation Setup (Week 1-2)

#### 4.1 Testing Infrastructure Enhancement

**Task 1.1**: Enhance `@repo/testing` package
```bash
# Create comprehensive testing utilities
mkdir -p packages/testing/src/{mocks,fixtures,utils}
```

**Task 1.2**: Create package-specific Vitest configs
```typescript
// packages/[package]/vitest.config.ts template
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' for React components
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['__tests__/**', '**/*.d.ts', '**/node_modules/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'), 
      '@repo': resolve(__dirname, '../')
    }
  }
});
```

**Task 1.3**: Setup shared test utilities
```typescript
// packages/testing/src/utils/test-helpers.ts
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  roles: ['user'],
  ...overrides
});

export const createMockRequest = (url: string, options = {}) => 
  new Request(url, { headers: { 'Content-Type': 'application/json' }, ...options });

// React Testing Library setup
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const AllProviders = ({ children }: { children: React.ReactNode }) => (
    <DesignSystemProvider>
      <ThemeProvider defaultTheme="light">
        {children}
      </ThemeProvider>
    </DesignSystemProvider>
  );
  
  return render(ui, { wrapper: AllProviders, ...options });
};
```

### Phase 2: Critical Package Testing (Week 3-6)

**Priority Order**:
1. `@repo/core-utils` (foundation for other packages)
2. `@repo/auth` & `@repo/auth-rbac` & `@repo/auth-abac` (security critical)
3. `@repo/database` (data integrity critical)
4. `@repo/observability` (error handling critical)
5. `@repo/design-system` (UI components - large scope)

**Implementation Steps per Package**:

1. **Create test directory structure**:
   ```bash
   mkdir -p packages/[package]/__tests__/{unit,integration,__mocks__}
   ```

2. **Implement unit tests for all exported functions/components**
3. **Add integration tests for complex workflows**
4. **Create mocks for external dependencies**
5. **Achieve 80% coverage threshold**
6. **Document test patterns in package README**

### Phase 3: Medium-Complexity Packages (Week 7-10)

**Packages**: observability, email, payments, rate-limit, security, webhooks, cms, collaboration, feature-flags, internationalization, notifications, seo

**Focus**:
- API integration testing
- Middleware testing patterns
- External service mocking (Stripe, Sentry, email providers)
- React component testing for UI-heavy packages

### Phase 4: Utility & Low-Complexity Packages (Week 11-12)

**Packages**: storage, trigger, trigger-rules, analytics, mcp, next-config, typescript-config

**Focus**:
- Configuration validation testing
- Utility function edge cases
- Performance testing for optimization utilities

### Phase 5: Integration & E2E Testing (Week 13-14)

**Application-Level Testing**:
- API route testing with database integration
- React component integration testing
- Authentication flow testing
- Cross-package integration scenarios

---

## 5. Testing Standards & Guidelines

### 5.1 Code Quality Standards

**Test Code Quality**:
- **Descriptive Test Names**: Use `it('should [expected behavior] when [condition]')` pattern
- **Clear Assertions**: One logical assertion per test
- **Test Organization**: Group related tests with `describe` blocks
- **Setup/Teardown**: Use `beforeEach`/`afterEach` for test isolation

**Coverage Requirements**:
- **Minimum**: 80% lines/branches/functions/statements (enforced by Vitest)
- **Critical Packages**: 90%+ coverage for auth, database, security packages
- **UI Components**: Focus on user interactions and accessibility over coverage percentage

### 5.2 Testing Patterns

**Mock Strategies**:
```typescript
// External service mocking
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn()
}));

// Database mocking
vi.mock('@repo/database', () => ({
  database: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

// React component mocking
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/test'
  })
}));
```

**Async Testing Patterns**:
```typescript
// Testing async operations
it('should handle async operations', async () => {
  const promise = asyncOperation();
  await expect(promise).resolves.toBe('expected result');
});

// Testing with waitFor
it('should update UI after async operation', async () => {
  render(<AsyncComponent />);
  fireEvent.click(screen.getByRole('button'));
  
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

**Error Testing Patterns**:
```typescript
// Testing error scenarios
it('should handle errors gracefully', async () => {
  const errorFn = vi.fn().mockRejectedValue(new Error('Test error'));
  
  const [result, error] = await safeAsync(errorFn)();
  
  expect(result).toBeNull();
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe('Test error');
});
```

### 5.3 Accessibility Testing

**Component Accessibility Tests**:
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('should be accessible', async () => {
  const { container } = render(<Button>Accessible button</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

it('should support keyboard navigation', () => {
  render(<Button>Navigate me</Button>);
  const button = screen.getByRole('button');
  
  button.focus();
  expect(button).toHaveFocus();
  
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onClick).toHaveBeenCalled();
});
```

---

## 6. Quality Gates & CI/CD Integration

### 6.1 Pre-commit Quality Gates

**Husky Integration** (already configured):
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["pnpm lint", "pnpm typecheck", "pnpm test --run --coverage"]
  }
}
```

**Coverage Enforcement**:
- Per-file 80% coverage requirement (configured in `vitest.config.mjs`)
- Critical packages: 90% coverage requirement
- New code: 100% coverage requirement (via coverage delta checking)

### 6.2 CI/CD Pipeline Integration

**GitHub Actions Integration** (enhance existing workflow):
```yaml
# Add to existing CI workflow
- name: Run Tests
  run: pnpm test:ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    
- name: Comment Coverage
  uses: romeovs/lcov-reporter-action@v0.3.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    lcov-file: ./coverage/lcov.info
```

**Quality Gate Pipeline**:
1. **Lint & Type Check**: `pnpm lint && pnpm typecheck`
2. **Unit Tests**: `pnpm test -- --coverage --run`
3. **Coverage Validation**: Enforce 80% minimum, 90% for critical packages
4. **Integration Tests**: Package interaction validation
5. **Build Validation**: Ensure tests don't break builds

### 6.3 Performance Testing

**Test Performance Monitoring**:
```typescript
// Performance testing utilities
import { performance } from 'perf_hooks';

const measureAsync = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`${label}: ${end - start}ms`);
  return result;
};

// Usage in tests
it('should perform database queries efficiently', async () => {
  const result = await measureAsync(
    () => database.user.findMany(),
    'findMany query'
  );
  
  expect(result).toBeDefined();
  // Performance assertion could be added here
});
```

---

## 7. Implementation Instructions for AI Agents

### 7.1 Step-by-Step Implementation Guide

**Agent Task Template**:
```markdown
## Task: Implement tests for @repo/[package-name]

### Pre-Implementation Steps:
1. Read package source code in `/packages/[package-name]/`
2. Identify all exported functions, classes, and components
3. Analyze dependencies and external integrations
4. Review existing patterns in similar packages

### Implementation Steps:
1. Create test directory structure:
   ```bash
   mkdir -p packages/[package-name]/__tests__/{unit,integration,__mocks__}
   ```

2. Create package-specific vitest config (if needed)
3. Implement unit tests for each module:
   - Test all exported functions
   - Test error scenarios
   - Test edge cases
   - Mock external dependencies
4. Implement integration tests for complex workflows
5. Create comprehensive mocks for external services
6. Run coverage report and ensure 80%+ coverage
7. Update package README with testing information

### Quality Checklist:
- [ ] All exported functions tested
- [ ] Error scenarios covered
- [ ] External dependencies mocked
- [ ] 80%+ code coverage achieved
- [ ] Tests pass in CI environment
- [ ] No console warnings or errors
- [ ] Performance considerations addressed
```

### 7.2 Package-Specific Implementation Templates

**Authentication Package Template**:
```typescript
// packages/auth/__tests__/unit/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../middleware';

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  authMiddleware: vi.fn((config) => (req) => {
    // Mock implementation
    return NextResponse.next();
  })
}));

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow access to public routes', async () => {
    const request = new NextRequest('http://localhost/public');
    const response = await authMiddleware(request);
    
    expect(response.status).toBe(200);
  });

  it('should redirect unauthenticated users to sign-in', async () => {
    // Mock unauthenticated state
    const request = new NextRequest('http://localhost/dashboard');
    const response = await authMiddleware(request);
    
    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toContain('/sign-in');
  });
});
```

**Utility Package Template**:
```typescript
// packages/core-utils/__tests__/unit/index.test.ts
import { describe, it, expect, vi } from 'vitest';
import { logger, asyncUtils, objectUtils, stringUtils, arrayUtils } from '../index';

describe('logger', () => {
  // ... logger tests
});

describe('asyncUtils', () => {
  // ... async utility tests
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
  });
});
```

**React Component Template**:
```typescript
// packages/design-system/__tests__/unit/ui/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../../../ui/button';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('should render children correctly', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Test Button');
  });

  it('should apply variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should be accessible', async () => {
    const { container } = render(<Button>Accessible button</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should forward refs correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });
});
```

### 7.3 Execution Workflow for AI Agents

**Phase 1 Commands**:
```bash
# Setup testing infrastructure 
cd packages/testing
npm install @testing-library/react @testing-library/jest-dom @testing-library/user-event msw vitest-mock-extended

# Create test utilities
mkdir -p src/{mocks,fixtures,utils}
# Implement shared test utilities
```

**Package Testing Commands**:
```bash
# For each package
cd packages/[package-name]

# Create test structure
mkdir -p __tests__/{unit,integration,__mocks__}

# Install package-specific test dependencies (if needed)
# npm install [specific dependencies]

# Run tests during development
pnpm test -- --coverage --watch

# Final validation
pnpm test -- --coverage --run
pnpm lint
pnpm typecheck
```

**Coverage Validation Commands**:
```bash
# Check coverage for specific package
cd packages/[package-name]
pnpm test -- --coverage --run --reporter=json > coverage.json

# Check overall coverage
pnpm test -- --coverage --run
open coverage/index.html  # Review HTML coverage report
```

---

## 8. Success Metrics & Monitoring

### 8.1 Coverage Metrics

**Target Coverage Levels**:
- **Overall Monorepo**: 80% (minimum enforced)
- **Critical Packages**: 90%+ (auth*, database, security, observability)
- **UI Components**: 85%+ (focus on user interactions)
- **Utility Packages**: 95%+ (comprehensive edge case testing)

**Coverage Tracking**:
```bash
# Generate coverage reports
pnpm coverage:report

# Coverage metrics to track:
- Line coverage: 80%+ overall, 90%+ critical
- Branch coverage: 80%+ overall, 85%+ critical  
- Function coverage: 90%+ overall, 95%+ critical
- Statement coverage: 80%+ overall, 90%+ critical
```

### 8.2 Quality Metrics

**Test Quality Indicators**:
- **Test-to-Code Ratio**: Aim for 1:1 (similar LOC in tests vs source)
- **Test Execution Time**: <2 minutes for full suite
- **Test Stability**: <1% flaky test rate
- **Mock Coverage**: All external dependencies mocked

**Performance Metrics**:
- **Test Suite Execution**: <120 seconds for full monorepo
- **Individual Package Tests**: <30 seconds per package
- **Coverage Report Generation**: <10 seconds

### 8.3 Maintenance & Evolution

**Ongoing Maintenance Tasks**:
1. **Weekly**: Review coverage reports, fix any drops below threshold
2. **Monthly**: Update test dependencies, review test patterns
3. **Quarterly**: Performance review of test suite, optimization opportunities
4. **Per Release**: Validate all tests pass, coverage requirements met

**Test Evolution Strategy**:
- **New Features**: 100% test coverage requirement
- **Bug Fixes**: Add regression tests for all bugs
- **Refactoring**: Maintain or improve test coverage
- **Dependencies**: Update test mocks when external APIs change

---

## 9. Conclusion

This comprehensive testing architecture provides a complete roadmap for implementing robust test coverage across the Zopio monorepo. The strategy prioritizes critical business logic while establishing sustainable testing patterns that can evolve with the codebase.

**Key Success Factors**:
1. **Systematic Implementation**: Follow the phased approach to avoid overwhelming scope
2. **Quality Over Quantity**: Focus on meaningful tests that catch real issues
3. **Automation**: Leverage CI/CD integration for consistent quality gates
4. **Documentation**: Maintain clear testing patterns for future development
5. **Continuous Improvement**: Regular review and optimization of test strategies

**Expected Outcomes**:
- **Reliability**: Significant reduction in production bugs
- **Confidence**: Safe refactoring and feature development
- **Quality**: Consistent code quality across all packages
- **Developer Experience**: Clear testing patterns and comprehensive tooling
- **Maintainability**: Self-documenting code through comprehensive test suites

This architecture serves as the foundation for building a world-class testing suite that supports the Zopio platform's growth and reliability requirements.