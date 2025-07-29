# Testing Framework Documentation

Comprehensive testing infrastructure for the Zopio monorepo with automated test generation, maintenance tools, and best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Templates](#test-templates)
- [Code Generation](#code-generation)
- [Best Practices](#best-practices)
- [Maintenance Tools](#maintenance-tools)
- [Developer Tools](#developer-tools)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Installing Dependencies

The testing framework is already included as `@repo/testing`. For new packages:

```bash
# Add to package.json dependencies
{
  "devDependencies": {
    "@repo/testing": "workspace:*"
  }
}
```

### Creating Your First Test

Generate a test using our CLI tools:

```bash
# Interactive generation
npx generate-tests interactive

# Component test
npx generate-tests single -t component -o __tests__/Button.test.tsx --name Button --path "../src/Button"

# Utility function test  
npx generate-tests single -t utility -o __tests__/utils.test.ts --name formatDate --path "../src/utils"

# API route test
npx generate-tests single -t api -o __tests__/route.test.ts --name userHandler --path "../app/api/users/route"
```

### Running Tests

```bash
# Run tests for specific package
cd packages/your-package
pnpm test

# Run with watch mode
pnpm test:watch

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test Button.test.tsx
```

## Test Templates

We provide six standardized test templates:

### 1. Component Tests
For React components with accessibility, interaction, and integration testing.

```typescript
// Generated structure includes:
- Rendering tests
- Props validation
- User interactions (click, keyboard)
- Accessibility compliance
- Async behavior handling
- Error state testing
- Integration with design system
```

### 2. Utility Function Tests
For pure functions and utility modules with comprehensive edge case coverage.

```typescript
// Generated structure includes:
- Basic functionality tests
- Input validation
- Error handling
- Edge cases (empty, null, large inputs)
- Performance testing (optional)
- Type safety validation
- Async behavior (if applicable)
```

### 3. API Route Tests
For Next.js API routes with authentication, validation, and security testing.

```typescript
// Generated structure includes:
- HTTP method handling
- Authentication requirements
- Input validation
- Rate limiting
- Database operations
- Error handling
- Security headers
- CORS handling
```

### 4. React Hook Tests
For custom React hooks with state management and lifecycle testing.

```typescript
// Generated structure includes:
- Initialization testing
- State management
- Effect handling
- Cleanup operations
- Async operations
- Error states
- Memory management
- Performance optimization
```

### 5. Integration Tests
For testing interactions between multiple modules and external services.

```typescript
// Generated structure includes:
- Module integration
- Database transactions
- External service calls
- Authentication flows
- End-to-end workflows
- Error recovery
- Performance under load
```

### 6. Security Tests
For security-focused testing including authentication, authorization, and vulnerability prevention.

```typescript
// Generated structure includes:
- Authentication bypass attempts
- Authorization escalation
- Input validation attacks
- SQL injection prevention
- XSS prevention
- CSRF protection
- Session security
- Data protection
```

## Code Generation

### Automatic Test Generation

Generate tests for existing source files:

```bash
# Auto-generate for entire directory
npx generate-tests auto ./src

# Auto-generate for specific files
npx generate-tests batch src/utils.ts src/hooks.ts src/components/Button.tsx

# Analyze and generate missing tests
npx scaffold-package complete ./packages/my-package
```

### Package Scaffolding

Set up complete testing infrastructure for a new package:

```bash
# Initialize testing infrastructure
npx scaffold-package init ./packages/new-package

# This creates:
# - __tests__/ directory structure
# - vitest.config.ts
# - Test setup files
# - Helper utilities
# - Initial tests for existing source files
```

### Template Customization

Create custom templates for specific use cases:

```typescript
import { TestGenerator } from '@repo/testing/templates';

const customTemplate = TestGenerator.createCustomTemplate(
  'Custom Template',
  'Description of what this template does',
  (options) => {
    return `// Your custom test template code here`;
  }
);

TestGenerator.registerTemplate('custom', customTemplate);
```

## Best Practices

### Test Organization

```
packages/your-package/
├── src/
│   ├── components/
│   ├── utils/
│   └── hooks/
├── __tests__/
│   ├── components/           # Component tests
│   ├── utils/               # Utility tests
│   ├── hooks/               # Hook tests
│   ├── integration/         # Integration tests
│   ├── fixtures/            # Test data
│   ├── helpers/             # Test utilities
│   └── setup.ts            # Test setup
└── vitest.config.ts
```

### Naming Conventions

- Test files: `ComponentName.test.tsx` or `functionName.test.ts`
- Test suites: `describe('ComponentName', () => {})`
- Test cases: `it('should do something specific', () => {})`
- Mock files: `__mocks__/moduleName.ts`

### Writing Effective Tests

#### 1. Follow the AAA Pattern
```typescript
it('should calculate total price with tax', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];
  const taxRate = 0.1;
  
  // Act
  const total = calculateTotalWithTax(items, taxRate);
  
  // Assert
  expect(total).toBe(330);
});
```

#### 2. Test Behavior, Not Implementation
```typescript
// Good - tests behavior
it('should display error message when validation fails', async () => {
  render(<LoginForm />);
  
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});

// Bad - tests implementation details
it('should call setError when validateForm returns false', () => {
  // This tests internal implementation
});
```

#### 3. Use Descriptive Test Names
```typescript
// Good
it('should display loading spinner while authentication is in progress', () => {});
it('should redirect to dashboard after successful login', () => {});
it('should show error message when network request fails', () => {});

// Bad
it('should work', () => {});
it('should handle error', () => {});
it('should render correctly', () => {});
```

#### 4. Test Edge Cases
```typescript
describe('formatCurrency', () => {
  it('should format positive numbers', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });
  
  it('should format negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-$100.00');
  });
  
  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
  
  it('should handle very large numbers', () => {
    expect(formatCurrency(999999999.99)).toBe('$999,999,999.99');
  });
  
  it('should throw error for invalid input', () => {
    expect(() => formatCurrency(NaN)).toThrow('Invalid number');
  });
});
```

### Mocking Best Practices

#### 1. Mock External Dependencies
```typescript
// Mock external APIs
vi.mock('@repo/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock database
vi.mock('@repo/database', () => ({
  database: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));
```

#### 2. Use Factory Functions for Test Data
```typescript
// __tests__/helpers/factories.ts
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    ...overrides,
  };
}

// In tests
const user = createMockUser({ email: 'custom@example.com' });
```

#### 3. Clean Up Mocks
```typescript
describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
});
```

### Accessibility Testing

Always include accessibility tests for components:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

it('should support keyboard navigation', async () => {
  render(<Button onClick={handleClick}>Click me</Button>);
  
  const button = screen.getByRole('button');
  button.focus();
  
  await userEvent.keyboard('{Enter}');
  expect(handleClick).toHaveBeenCalled();
});
```

### Performance Testing

Include performance tests for critical paths:

```typescript
it('should complete operation within acceptable time', async () => {
  const start = performance.now();
  
  await performExpensiveOperation(largeDataSet);
  
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000); // 1 second
});

it('should handle concurrent operations efficiently', async () => {
  const operations = Array.from({ length: 100 }, () => 
    performOperation({ id: Math.random() })
  );
  
  const start = performance.now();
  const results = await Promise.all(operations);
  const duration = performance.now() - start;
  
  expect(results).toHaveLength(100);
  expect(duration).toBeLessThan(5000); // 5 seconds for 100 operations
});
```

## Maintenance Tools

### Test Analysis

Analyze your test suite health:

```bash
# Get coverage report
npx scaffold-package analyze ./packages/my-package

# Generate markdown report
npx scaffold-package analyze ./packages/my-package --format markdown

# JSON output for CI integration
npx scaffold-package analyze ./packages/my-package --format json
```

### Test Maintenance

Keep your tests up to date:

```bash
# Find and generate missing tests
npx scaffold-package complete ./packages/my-package

# Update existing tests to latest templates
npx scaffold-package update ./packages/my-package --backup

# Dry run to see what would be generated
npx scaffold-package complete ./packages/my-package --dry-run
```

### Automated Maintenance

Set up automated test maintenance in your CI/CD:

```yaml
# .github/workflows/test-maintenance.yml
name: Test Maintenance

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  maintain-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      
      # Check for missing tests
      - run: |
          for package in packages/*/; do
            echo "Analyzing $package"
            npx scaffold-package analyze "$package" --format json > "${package}/test-analysis.json"
          done
      
      # Generate missing tests
      - run: |
          for package in packages/*/; do
            echo "Completing tests for $package"
            npx scaffold-package complete "$package"
          done
      
      # Create PR if changes were made
      - uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: generate missing tests'
          title: 'Automated Test Generation'
          body: |
            This PR was automatically generated to add missing test files.
            
            Changes:
            - Generated tests for uncovered source files
            - Updated test infrastructure where needed
            
            Please review the generated tests and customize as needed.
```

## Developer Tools

### Test Health Dashboard

Monitor test health across your entire monorepo:

```bash
# Generate test health dashboard
pnpm coverage:dashboard

# This creates test-health-dashboard.html with:
# - Coverage metrics per package
# - Test execution times
# - Flaky test detection
# - Maintenance recommendations
```

### Debug Tools

Debug failing tests efficiently:

```typescript
// Enable debug mode
DEBUG=1 pnpm test

// Debug specific test
DEBUG=1 pnpm test -- --reporter=verbose Button.test.tsx

// Test with browser debugging (for jsdom environment)
pnpm test -- --inspector-brk
```

### VS Code Integration

Enhance your development experience with VS Code extensions:

```json
// .vscode/settings.json
{
  "vitest.enable": true,
  "vitest.commandLine": "pnpm test",
  "testing.automaticallyOpenPeekView": "never"
}
```

Recommended extensions:
- Vitest Extension
- Jest Runner
- Test Explorer UI

## Troubleshooting

### Common Issues

#### 1. Import Resolution Issues
```typescript
// Problem: Module not found errors
// Solution: Update vitest config with proper aliases

export default createVitestConfig('package-name', {
  test: {
    // ... other config
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/testing': path.resolve(__dirname, '../../packages/testing/src'),
    },
  },
});
```

#### 2. Mock Issues
```typescript
// Problem: Mocks not working
// Solution: Ensure mocks are hoisted and properly configured

// Place at top of file, before imports
vi.mock('@repo/external-service', () => ({
  externalFunction: vi.fn(),
}));

// Or use vi.hoisted for complex mocks
const mockExternalService = vi.hoisted(() => ({
  externalFunction: vi.fn(),
}));

vi.mock('@repo/external-service', () => mockExternalService);
```

#### 3. Async Test Issues
```typescript
// Problem: Tests timing out or not waiting for async operations
// Solution: Properly handle async operations

// Use waitFor for DOM updates
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// Use proper async/await
it('should handle async operation', async () => {
  const result = await performAsyncOperation();
  expect(result).toBeDefined();
});

// Increase timeout for slow operations
it('should handle slow operation', async () => {
  // Test implementation
}, 10000); // 10 second timeout
```

#### 4. Test Isolation Issues
```typescript
// Problem: Tests affecting each other
// Solution: Proper setup and cleanup

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset global state
  resetGlobalState();
});

afterEach(() => {
  // Cleanup DOM
  cleanup();
  
  // Restore all mocks
  vi.restoreAllMocks();
});
```

### Performance Issues

#### 1. Slow Test Execution
```bash
# Run tests with timing information
pnpm test -- --reporter=verbose

# Identify slow tests
pnpm test -- --reporter=json | jq '.testResults[] | select(.duration > 1000)'

# Run tests in parallel (default, but can be configured)
pnpm test -- --threads=4
```

#### 2. Memory Issues
```typescript
// Avoid memory leaks in tests
afterEach(() => {
  // Cleanup event listeners
  document.removeEventListener('click', handler);
  
  // Clear timers
  vi.clearAllTimers();
  
  // Cleanup component instances
  cleanup();
});
```

### Getting Help

1. **Documentation**: Check this documentation first
2. **Examples**: Look at existing tests in the codebase
3. **Issue Tracker**: Report bugs or request features
4. **Team Chat**: Ask questions in the development channel
5. **Code Review**: Request review for complex test scenarios

### Continuous Improvement

We continuously improve our testing infrastructure. Contribute by:

1. **Sharing Patterns**: Document useful test patterns you discover
2. **Template Improvements**: Suggest improvements to existing templates
3. **Tool Enhancement**: Contribute to maintenance and debugging tools
4. **Best Practices**: Share learnings and best practices with the team

---

For more specific guidance, see our specialized documentation:
- [Component Testing Guide](./component-testing.md)
- [API Testing Guide](./api-testing.md)
- [Security Testing Guide](./security-testing.md)
- [Performance Testing Guide](./performance-testing.md)