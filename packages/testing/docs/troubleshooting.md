# Testing Troubleshooting Guide

Comprehensive guide for debugging and resolving common testing issues in the Zopio monorepo.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Common Error Categories](#common-error-categories)
- [Import and Module Issues](#import-and-module-issues)
- [Mock and Spy Problems](#mock-and-spy-problems)
- [Async Testing Issues](#async-testing-issues)
- [DOM and Component Testing](#dom-and-component-testing)
- [Performance Problems](#performance-problems)
- [CI/CD Issues](#cicd-issues)
- [Advanced Debugging](#advanced-debugging)

## Quick Diagnosis

### Test Failure Checklist

When a test fails, run through this checklist:

1. **Read the error message carefully**
   - Note the specific error type
   - Check line numbers and stack trace
   - Look for timeout vs assertion failures

2. **Check test isolation**
   ```bash
   # Run single test to isolate issue
   pnpm test -- --run Button.test.tsx
   
   # Run with verbose output
   pnpm test -- --reporter=verbose Button.test.tsx
   ```

3. **Verify environment setup**
   ```bash
   # Check if setup files are loading
   DEBUG=1 pnpm test
   
   # Verify vitest config
   cat vitest.config.ts
   ```

4. **Check recent changes**
   ```bash
   # See what changed recently
   git diff HEAD~1 --name-only | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$'
   ```

### Emergency Debugging Commands

```bash
# Quick test health check
pnpm test -- --run --reporter=json | jq '.success'

# Find flaky tests
pnpm test -- --run --repeat=10 Button.test.tsx

# Memory usage analysis
pnpm test -- --run --reporter=verbose | grep -i memory

# Performance analysis
time pnpm test -- --run Button.test.tsx
```

## Common Error Categories

### 1. Module Resolution Errors

**Symptoms:**
- `Cannot resolve module '@repo/package-name'`
- `Module not found: 'relative/path'`
- `Failed to resolve import`

**Solutions:**

#### Update Vitest Configuration
```typescript
// vitest.config.ts
import { createVitestConfig } from '@repo/testing/configs';
import path from 'node:path';

export default createVitestConfig('package-name', {
  test: {
    // ... other config
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/testing': path.resolve(__dirname, '../../packages/testing/src'),
      // Add any missing package aliases
      '@repo/package-name': path.resolve(__dirname, '../package-name/src'),
    },
  },
});
```

#### Check Package Dependencies
```bash
# Verify package is properly linked
pnpm ls @repo/package-name

# Reinstall dependencies
pnpm install

# Check for circular dependencies
pnpm why @repo/package-name
```

#### Fix Import Paths
```typescript
// Wrong - relative path from test directory
import { utils } from '../../src/utils';

// Correct - use alias or proper relative path
import { utils } from '@/utils';
// or
import { utils } from '../src/utils';
```

### 2. TypeScript Compilation Errors

**Symptoms:**
- `Type 'X' is not assignable to type 'Y'`
- `Property 'x' does not exist on type`
- `Cannot find name 'vi'`

**Solutions:**

#### Update Test TypeScript Configuration
```json
// tsconfig.json in test package
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  },
  "include": [
    "src/**/*",
    "__tests__/**/*",
    "vitest.config.ts"
  ]
}
```

#### Add Missing Type Declarations
```typescript
// types/test.d.ts
import 'vitest/globals';
import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): void;
    }
  }
}
```

### 3. Setup and Configuration Issues

**Symptoms:**
- Tests run but setup files don't execute
- Global mocks not working
- Environment not properly configured

**Solutions:**

#### Verify Setup File Loading
```typescript
// vitest.config.ts
export default createVitestConfig('package-name', {
  test: {
    setupFiles: ['@repo/testing/setup', './__tests__/setup.ts'],
    environment: 'jsdom', // or 'node' for backend tests
  },
});

// __tests__/setup.ts
console.log('Test setup loaded'); // Should appear in test output

import '@repo/testing/setup';

// Package-specific setup
beforeEach(() => {
  console.log('Running beforeEach setup');
});
```

#### Debug Configuration Loading
```bash
# Check if config is valid
npx vitest --config vitest.config.ts --run --reporter=verbose

# Validate setup files exist
ls -la __tests__/setup.ts
ls -la ../../packages/testing/src/setup.ts
```

## Import and Module Issues

### ESM vs CommonJS Problems

**Error:** `require() of ES modules is not supported`

**Solution:**
```typescript
// Wrong - using require in ESM
const { utils } = require('./utils');

// Correct - use dynamic import or static import
import { utils } from './utils';

// For dynamic imports in tests
const { utils } = await import('./utils');
```

### Barrel Export Issues

**Error:** `Cannot read property 'default' of undefined`

**Solution:**
```typescript
// Check barrel exports in index.ts
// Wrong - mixing default and named exports
export { default as Component } from './Component';
export { namedExport } from './utils';

// Correct - consistent export style
export { Component } from './Component';
export { namedExport } from './utils';

// Or use default exports consistently
export { default as Component } from './Component';
export { default as utils } from './utils';
```

### Path Resolution in Monorepo

**Error:** `Module '@repo/package' not found`

**Solution:**
```bash
# Check workspace configuration
cat pnpm-workspace.yaml

# Verify package is in workspace
pnpm ls --depth=0

# Check package.json name field
grep -r "\"name\":" packages/*/package.json
```

## Mock and Spy Problems

### Mock Hoisting Issues

**Error:** `Cannot access 'mockFunction' before initialization`

**Solution:**
```typescript
// Wrong - mock after import
import { service } from '@repo/service';
const mockService = vi.fn();
vi.mock('@repo/service', () => ({ service: mockService }));

// Correct - hoist mock
const mockService = vi.hoisted(() => vi.fn());
vi.mock('@repo/service', () => ({ service: mockService }));
import { service } from '@repo/service';
```

### Partial Mocking Problems

**Error:** `TypeError: Cannot read property 'x' of undefined`

**Solution:**
```typescript
// Wrong - completely replacing module
vi.mock('@repo/utils', () => ({
  formatDate: vi.fn(),
  // Missing other exports that tests might use
}));

// Correct - partial mocking
vi.mock('@repo/utils', async () => {
  const actual = await vi.importActual('@repo/utils');
  return {
    ...actual,
    formatDate: vi.fn(),
  };
});
```

### Mock Cleanup Issues

**Error:** Mocks affecting other tests

**Solution:**
```typescript
// Add proper cleanup
describe('MyComponent', () => {
  const mockService = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history
    mockService.mockReset(); // Reset mock implementation
  });
  
  afterEach(() => {
    vi.restoreAllMocks(); // Restore original implementations
  });
  
  afterAll(() => {
    vi.unmock('@repo/service'); // Remove mock completely
  });
});
```

### Factory Mock Issues

**Error:** `Mock function called with unexpected arguments`

**Solution:**
```typescript
// Create flexible mock factories
function createMockUser(overrides = {}) {
  return {
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  };
}

// Use in tests
const mockUser = createMockUser({ email: 'custom@example.com' });
mockService.mockResolvedValue(mockUser);

// Verify mock calls with matchers
expect(mockService).toHaveBeenCalledWith(
  expect.objectContaining({
    email: expect.stringMatching(/@example\.com$/),
  })
);
```

## Async Testing Issues

### Promise Resolution Problems

**Error:** `Test timeout after 5000ms`

**Solution:**
```typescript
// Wrong - not waiting for promise
it('should handle async operation', () => {
  performAsyncOperation();
  expect(result).toBe('expected'); // Runs before promise resolves
});

// Correct - properly await promise
it('should handle async operation', async () => {
  const result = await performAsyncOperation();
  expect(result).toBe('expected');
});

// For DOM updates, use waitFor
it('should update UI after async operation', async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

### Timer and Fake Time Issues

**Error:** `setTimeout/setInterval not working in tests`

**Solution:**
```typescript
// Use fake timers for controlled testing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should handle delayed execution', async () => {
  const callback = vi.fn();
  
  setTimeout(callback, 1000);
  
  // Fast-forward time
  vi.advanceTimersByTime(1000);
  
  expect(callback).toHaveBeenCalled();
});

// For real timers with timeout
it('should complete within time limit', async () => {
  const result = await performSlowOperation();
  expect(result).toBeDefined();
}, 10000); // 10 second timeout
```

### Race Condition Issues

**Error:** Tests pass/fail inconsistently

**Solution:**
```typescript
// Wrong - race condition between async operations
it('should handle concurrent operations', async () => {
  const operation1 = performAsync1();
  const operation2 = performAsync2();
  
  expect(await operation1).toBe('result1');
  expect(await operation2).toBe('result2'); // May depend on operation1
});

// Correct - explicit ordering or independence
it('should handle concurrent operations', async () => {
  const [result1, result2] = await Promise.all([
    performAsync1(),
    performAsync2(),
  ]);
  
  expect(result1).toBe('result1');
  expect(result2).toBe('result2');
});

// Or test them sequentially if order matters
it('should handle sequential operations', async () => {
  const result1 = await performAsync1();
  expect(result1).toBe('result1');
  
  const result2 = await performAsync2(result1);
  expect(result2).toBe('result2');
});
```

## DOM and Component Testing

### Render Issues

**Error:** `TestingLibraryElementError: Unable to find element`

**Solution:**
```typescript
// Debug what's actually rendered
it('should render component', () => {
  render(<MyComponent />);
  
  // Debug DOM structure
  screen.debug();
  
  // Or debug specific element
  const element = screen.getByTestId('my-element');
  screen.debug(element);
});

// Check if element is in document
expect(screen.getByText('Expected Text')).toBeInTheDocument();
```

### Event Simulation Problems

**Error:** `Events not triggering expected behavior`

**Solution:**
```typescript
// Wrong - direct event simulation
fireEvent.click(button);

// Correct - user-event for realistic interactions
import { userEvent } from '@testing-library/user-event';

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick} />);
  
  const button = screen.getByRole('button');
  await user.click(button);
  
  expect(handleClick).toHaveBeenCalled();
});
```

### Provider and Context Issues

**Error:** `useContext must be used within a Provider`

**Solution:**
```typescript
// Create test wrapper with all required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DesignSystemProvider>
      <AuthProvider>
        <QueryClient client={testQueryClient}>
          {children}
        </QueryClient>
      </AuthProvider>
    </DesignSystemProvider>
  );
}

// Use wrapper in tests
it('should render with context', () => {
  render(<MyComponent />, { wrapper: TestWrapper });
  
  expect(screen.getByText('Context Value')).toBeInTheDocument();
});

// Or use custom render
function customRender(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: TestWrapper, ...options });
}
```

### CSS and Style Issues

**Error:** `Styles not applied or computed styles incorrect`

**Solution:**
```typescript
// Import CSS in test setup
// __tests__/setup.ts
import '@/styles/globals.css';

// Test computed styles
it('should apply correct styles', () => {
  render(<StyledComponent />);
  
  const element = screen.getByTestId('styled-element');
  
  expect(element).toHaveStyle({
    color: 'rgb(255, 0, 0)',
    'font-size': '16px',
  });
});

// Use CSS-in-JS testing utilities
import { matchers } from '@emotion/jest';
expect.extend(matchers);

expect(element).toHaveStyleRule('color', 'red');
```

## Performance Problems

### Slow Test Execution

**Symptoms:**
- Tests taking longer than expected
- CI timeouts
- Development feedback loops too slow

**Solutions:**

#### Identify Slow Tests
```bash
# Run with timing information
pnpm test -- --reporter=verbose

# Profile test execution
NODE_OPTIONS="--inspect" pnpm test

# Find tests taking longer than 1 second
pnpm test -- --reporter=json | jq '.testResults[] | select(.duration > 1000) | {name: .name, duration: .duration}'
```

#### Optimize Test Setup
```typescript
// Wrong - expensive setup in every test
beforeEach(async () => {
  await setupCompleteDatabase();
  await seedAllTestData();
  await initializeAllServices();
});

// Correct - lazy initialization and shared setup
let testContext: TestContext;

beforeAll(async () => {
  testContext = await createSharedTestContext();
});

beforeEach(() => {
  // Only reset what's necessary
  testContext.clearData();
  vi.clearAllMocks();
});

afterAll(async () => {
  await testContext.cleanup();
});
```

#### Use Test Parallelization
```typescript
// vitest.config.ts
export default createVitestConfig('package-name', {
  test: {
    // Configure thread pool
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: Math.max(1, Math.floor(os.cpus().length / 2)),
      },
    },
    // Separate slow tests
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
```

### Memory Leaks

**Symptoms:**
- Tests consume increasing memory
- Out of memory errors in CI
- Jest/Vitest heap out of memory

**Solutions:**

#### Identify Memory Leaks
```bash
# Run with memory monitoring
NODE_OPTIONS="--max-old-space-size=4096" pnpm test

# Use heap profiling
NODE_OPTIONS="--inspect --heap-prof" pnpm test
```

#### Fix Common Memory Leaks
```typescript
// Clean up event listeners
afterEach(() => {
  // Remove DOM event listeners
  document.removeEventListener('click', globalHandler);
  
  // Clean up React Testing Library
  cleanup();
  
  // Clear all timers
  vi.clearAllTimers();
  vi.useRealTimers();
});

// Avoid retaining references
let globalRef: any = null;

afterEach(() => {
  globalRef = null; // Clear reference
});

// Use weak references for caches
const weakCache = new WeakMap();
```

### Large Test Suites

**Solutions:**

#### Split Test Files
```bash
# Split large test files
# Instead of: Button.test.tsx (500 lines)
# Create:
Button.rendering.test.tsx
Button.interactions.test.tsx
Button.accessibility.test.tsx
Button.performance.test.tsx
```

#### Use Test Sharding
```typescript
// vitest.config.ts
export default createVitestConfig('package-name', {
  test: {
    // Shard tests across multiple processes
    shard: process.env.CI ? '1/4' : undefined,
  },
});
```

## CI/CD Issues

### Flaky Tests

**Symptoms:**
- Tests pass locally but fail in CI
- Intermittent failures
- Timing-dependent failures

**Solutions:**

#### Detect Flaky Tests
```bash
# Run tests multiple times
pnpm test -- --run --repeat=10

# Use GitHub Actions matrix for detection
# .github/workflows/flaky-test-detection.yml
strategy:
  matrix:
    run: [1, 2, 3, 4, 5]
```

#### Fix Common Flaky Test Causes
```typescript
// Wrong - depending on system timing
it('should update after delay', () => {
  triggerUpdate();
  setTimeout(() => {
    expect(getState()).toBe('updated');
  }, 100); // Flaky - depends on system speed
});

// Correct - explicit waiting
it('should update after delay', async () => {
  triggerUpdate();
  
  await waitFor(() => {
    expect(getState()).toBe('updated');
  }, { timeout: 5000 });
});

// Wrong - depending on execution order
it('should handle concurrent updates', async () => {
  updateA();
  updateB();
  expect(getResult()).toBe('A-B'); // Flaky - order not guaranteed
});

// Correct - explicit ordering
it('should handle sequential updates', async () => {
  await updateA();
  await updateB();
  expect(getResult()).toBe('A-B');
});
```

### Environment Differences

**Symptoms:**
- Tests pass in development but fail in CI
- Different behavior across environments
- Missing dependencies in CI

**Solutions:**

#### Standardize Environment
```yaml
# .github/workflows/test.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18' # Match local development
    cache: 'pnpm'

- name: Install dependencies
  run: |
    pnpm install --frozen-lockfile
    pnpm build # Ensure all packages are built

- name: Run tests
  run: pnpm test
  env:
    NODE_ENV: test
    TZ: UTC # Standardize timezone
```

#### Debug CI Environment
```typescript
// Add environment debugging to tests
beforeAll(() => {
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('Environment:', process.env.NODE_ENV);
});
```

### Resource Limits

**Error:** `FATAL ERROR: Reached heap limit`

**Solution:**
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=8192" pnpm test

# Use memory-efficient test patterns
pnpm test -- --run --no-coverage # Skip coverage for memory-intensive runs
```

## Advanced Debugging

### Interactive Debugging

#### Debug in VS Code
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Vitest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--inspect-brk", "${relativeFile}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Debug in Browser
```bash
# For jsdom tests that need browser debugging
pnpm test -- --run --inspect-brk --pool=forks
```

### Advanced Logging

```typescript
// Create debug logger
const debug = process.env.DEBUG ? console.log : () => {};

beforeEach(() => {
  debug('Test starting:', expect.getState().currentTestName);
});

afterEach(() => {
  debug('Test finished:', expect.getState().currentTestName);
});

// Log test data
it('should process data correctly', () => {
  const input = createTestData();
  debug('Input data:', JSON.stringify(input, null, 2));
  
  const result = processData(input);
  debug('Result:', JSON.stringify(result, null, 2));
  
  expect(result).toMatchSnapshot();
});
```

### Custom Matchers for Better Errors

```typescript
// Create domain-specific matchers
expect.extend({
  toBeValidUser(received) {
    const pass = received && 
                 typeof received.id === 'string' &&
                 typeof received.email === 'string' &&
                 received.email.includes('@');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid user`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid user with id and email`,
        pass: false,
      };
    }
  },
});

// Use in tests
expect(user).toBeValidUser();
```

### Test Data Analysis

```bash
# Analyze test execution patterns
pnpm test -- --reporter=json > test-results.json

# Extract timing data
jq '.testResults[].duration' test-results.json | sort -rn | head -10

# Find most common failure reasons
jq -r '.testResults[].failureMessages[]' test-results.json | sort | uniq -c | sort -rn
```

### Automated Issue Detection

```typescript
// Create test health monitor
export function createTestHealthMonitor() {
  const issues: string[] = [];
  
  // Detect slow tests
  afterEach(() => {
    const testState = expect.getState();
    if (testState.executionTime > 5000) {
      issues.push(`Slow test detected: ${testState.currentTestName} (${testState.executionTime}ms)`);
    }
  });
  
  // Detect memory usage
  afterEach(() => {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      issues.push(`High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    }
  });
  
  afterAll(() => {
    if (issues.length > 0) {
      console.warn('Test health issues detected:');
      issues.forEach(issue => console.warn(`  - ${issue}`));
    }
  });
}
```

### Getting Help

When you're stuck:

1. **Check this guide first** - Many issues are covered here
2. **Search the codebase** - Look for similar test patterns
3. **Create minimal reproduction** - Isolate the problem
4. **Ask for help** - Include error messages, environment details, and reproduction steps
5. **Document the solution** - Help others by updating this guide

Remember: Good error messages and systematic debugging are key to resolving testing issues efficiently.