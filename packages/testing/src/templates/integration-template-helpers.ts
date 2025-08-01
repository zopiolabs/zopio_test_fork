/**
 * SPDX-License-Identifier: MIT
 */

import type { IntegrationTestOptions } from './types.js';

export function generateImports(options: IntegrationTestOptions): string {
  const { modules = [], hasDatabase, hasAuthentication } = options;

  const imports: string[] = [
    "import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';",
  ];

  if (hasDatabase) {
    imports.push("import { database } from '@repo/database';");
  }

  if (hasAuthentication) {
    imports.push(
      "import { createTestUser, cleanupTestUser } from '@repo/testing/auth-helpers';"
    );
  }

  imports.push(
    "import { createTestContext, cleanupTestContext } from '@repo/testing/utils';"
  );

  const moduleImports = modules
    .map((module) => `import { ${module.name} } from '${module.path}';`)
    .join('\n');

  if (moduleImports) {
    imports.push(moduleImports);
  }

  return imports.join('\n');
}

export function generateMocks(hasExternalServices: boolean): string {
  if (!hasExternalServices) {
    return '';
  }

  return `// Mock external services
const mockExternalAPI = vi.fn();
const mockPaymentService = vi.fn();
const mockNotificationService = vi.fn();

vi.mock('@repo/external-api', () => ({
  externalAPI: mockExternalAPI,
}));

vi.mock('@repo/payments', () => ({
  paymentService: mockPaymentService,
}));

vi.mock('@repo/notifications', () => ({
  notificationService: mockNotificationService,
}));`;
}

export function generateTestVariables(options: IntegrationTestOptions): string {
  const { hasAuthentication, hasDatabase } = options;
  const variables: string[] = ['let testContext: any;'];

  if (hasAuthentication) {
    variables.push('let testUser: any;');
  }

  if (hasDatabase) {
    variables.push('let testDatabase: any;');
  }

  return variables.join('\n  ');
}

export function generateBeforeAll(hasDatabase: boolean): string {
  const lines: string[] = [
    '// Set up test environment',
    'testContext = await createTestContext();',
  ];

  if (hasDatabase) {
    lines.push('testDatabase = testContext.database;');
  }

  return lines.join('\n    ');
}

export function generateBeforeEach(options: IntegrationTestOptions): string {
  const { hasAuthentication, hasExternalServices, hasDatabase } = options;
  const lines: string[] = ['vi.clearAllMocks();'];

  if (hasAuthentication) {
    lines.push(`
    // Create test user for each test
    testUser = await createTestUser({
      email: 'test@example.com',
      role: 'user',
    });`);
  }

  if (hasExternalServices) {
    lines.push(`
    // Set up external service mocks
    mockExternalAPI.mockResolvedValue({ success: true, data: {} });
    mockPaymentService.mockResolvedValue({ paymentId: 'payment_123', status: 'succeeded' });
    mockNotificationService.mockResolvedValue({ messageId: 'msg_123', sent: true });`);
  }

  if (hasDatabase) {
    lines.push(`
    // Clean up database before each test
    await testDatabase.$transaction(async (tx: any) => {
      // Clear test data
      await tx.user.deleteMany({ where: { email: { contains: 'test' } } });
      await tx.post.deleteMany({ where: { title: { contains: 'test' } } });
    });`);
  }

  return lines.join('\n');
}

export function generateAfterEach(hasAuthentication: boolean): string {
  const lines: string[] = [];

  if (hasAuthentication) {
    lines.push(`// Clean up test user
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }`);
  }

  return lines.join('\n    ');
}

export function generateModuleTests(
  modules: Array<{ name: string; path: string }>
): string {
  if (modules.length === 0) {
    return '';
  }

  return modules
    .map(
      (module) => `
  describe('${module.name} Module', () => {
    it('should be properly initialized', () => {
      expect(${module.name}).toBeDefined();
      expect(typeof ${module.name}).toBe('object');
    });

    it('should export expected functions', () => {
      // Add specific function checks based on your module
      // expect(${module.name}.someFunction).toBeDefined();
    });
  });`
    )
    .join('\n');
}

export function generateIntegrationTests(
  options: IntegrationTestOptions
): string {
  const { hasDatabase, hasExternalServices, hasAuthentication } = options;
  const tests: string[] = [];

  if (hasDatabase && hasAuthentication) {
    tests.push(`
  describe('User Data Flow', () => {
    it('should create and retrieve user data', async () => {
      const userData = {
        name: 'Test User',
        email: testUser.email,
        userId: testUser.id,
      };

      const created = await testDatabase.userData.create({
        data: userData,
      });

      expect(created).toMatchObject(userData);

      const retrieved = await testDatabase.userData.findUnique({
        where: { id: created.id },
      });

      expect(retrieved).toMatchObject(userData);
    });
  });`);
  }

  if (hasExternalServices) {
    tests.push(`
  describe('External Service Integration', () => {
    it('should handle external API calls', async () => {
      const result = await mockExternalAPI({ data: 'test' });
      
      expect(mockExternalAPI).toHaveBeenCalledWith({ data: 'test' });
      expect(result).toEqual({ success: true, data: {} });
    });

    it('should process payments through payment service', async () => {
      const payment = await mockPaymentService({
        amount: 1000,
        currency: 'USD',
      });

      expect(payment).toEqual({
        paymentId: 'payment_123',
        status: 'succeeded',
      });
    });

    it('should send notifications', async () => {
      const notification = await mockNotificationService({
        to: testUser.email,
        subject: 'Test Notification',
      });

      expect(notification).toEqual({
        messageId: 'msg_123',
        sent: true,
      });
    });
  });`);
  }

  return tests.join('\n');
}

export function generateEndToEndTests(testEndToEnd: boolean): string {
  if (!testEndToEnd) {
    return '';
  }

  return `
  describe('End-to-End Scenarios', () => {
    it('should complete full user workflow', async () => {
      // Step 1: User registration
      const user = await createTestUser({
        email: 'e2e@example.com',
        name: 'E2E Test User',
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('e2e@example.com');

      // Step 2: User performs action
      const action = await performUserAction(user.id, {
        type: 'create_post',
        data: { title: 'Test Post', content: 'Test Content' },
      });

      expect(action.success).toBe(true);

      // Step 3: Verify results
      const userPosts = await getUserPosts(user.id);
      expect(userPosts).toHaveLength(1);
      expect(userPosts[0].title).toBe('Test Post');

      // Cleanup
      await cleanupTestUser(user.id);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid user
      await expect(
        performUserAction('invalid-user-id', { type: 'create_post' })
      ).rejects.toThrow('User not found');

      // Test with invalid action
      await expect(
        performUserAction(testUser.id, { type: 'invalid_action' })
      ).rejects.toThrow('Invalid action type');
    });
  });`;
}

export function generateErrorHandlingTests(
  hasExternalServices: boolean
): string {
  const tests: string[] = [
    `
  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';`,
  ];

  if (hasExternalServices) {
    tests.push(`
      mockExternalAPI.mockRejectedValue(networkError);

      await expect(
        makeAPICall({ endpoint: '/test' })
      ).rejects.toThrow('Network request failed');`);
  }

  tests.push(`
    });

    it('should handle timeout errors', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100);
      });

      await expect(timeoutPromise).rejects.toThrow('Timeout');
    });
  });`);

  return tests.join('');
}

export function generatePerformanceTests(): string {
  return `
  describe('Performance Tests', () => {
    it('should complete operations within acceptable time', async () => {
      const start = performance.now();
      
      // Perform operation
      await performTestOperation();
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations efficiently', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        performTestOperation({ id: i })
      );

      const start = performance.now();
      await Promise.all(operations);
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(2000); // Should handle 10 concurrent operations within 2 seconds
    });
  });`;
}
