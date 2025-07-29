/**
 * SPDX-License-Identifier: MIT
 */

import type { IntegrationTestOptions, TestTemplate } from './types.js';

/**
 * Template for integration tests
 */
export const integrationTestTemplate: TestTemplate = {
  name: 'Integration Test',
  description:
    'Template for testing integration between multiple modules and external services',

  generate: (options: IntegrationTestOptions) => {
    const {
      testName,
      modules = [],
      hasDatabase = true,
      hasExternalServices = true,
      hasAuthentication = true,
      testEndToEnd = true,
    } = options;

    const moduleImports = modules
      .map((module) => `import { ${module.name} } from '${module.path}';`)
      .join('\n');

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
${hasDatabase ? `import { database } from '@repo/database';` : ''}
${hasAuthentication ? `import { createTestUser, cleanupTestUser } from '@repo/testing/auth-helpers';` : ''}
import { createTestContext, cleanupTestContext } from '@repo/testing/utils';
${moduleImports}

${
  hasExternalServices
    ? `// Mock external services
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
}));`
    : ''
}

describe('${testName} Integration Tests', () => {
  let testContext: any;
  ${hasAuthentication ? 'let testUser: any;' : ''}
  ${hasDatabase ? 'let testDatabase: any;' : ''}

  beforeAll(async () => {
    // Set up test environment
    testContext = await createTestContext();
    ${hasDatabase ? 'testDatabase = testContext.database;' : ''}
  });

  afterAll(async () => {
    // Clean up test environment
    await cleanupTestContext(testContext);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    ${
      hasAuthentication
        ? `// Create test user for each test
    testUser = await createTestUser({
      email: 'test@example.com',
      role: 'user',
    });`
        : ''
    }

    ${
      hasExternalServices
        ? `// Set up external service mocks
    mockExternalAPI.mockResolvedValue({ success: true, data: {} });
    mockPaymentService.mockResolvedValue({ paymentId: 'payment_123', status: 'succeeded' });
    mockNotificationService.mockResolvedValue({ messageId: 'msg_123', sent: true });`
        : ''
    }

    ${
      hasDatabase
        ? `// Clean up database before each test
    await testDatabase.$transaction(async (tx: any) => {
      // Clear test data
      await tx.user.deleteMany({ where: { email: { contains: 'test' } } });
      await tx.post.deleteMany({ where: { title: { contains: 'test' } } });
    });`
        : ''
    }
  });

  afterEach(async () => {
    ${
      hasAuthentication
        ? `// Clean up test user
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }`
        : ''
    }
  });

  describe('Module Integration', () => {
    ${modules
      .map(
        (module) => `
    it('should integrate ${module.name} correctly', async () => {
      // Test integration with ${module.name}
      const result = await ${module.name}.performOperation({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        data: 'test data'
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });`
      )
      .join('\n')}

    it('should handle cross-module data flow', async () => {
      // Test data flow between modules
      ${
        modules.length > 1
          ? `
      const step1Result = await ${modules[0]?.name}.initialize({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        config: { test: true }
      });
      
      const step2Result = await ${modules[1]?.name}.process(step1Result.data);
      
      expect(step1Result.success).toBe(true);
      expect(step2Result.success).toBe(true);
      expect(step2Result.data).toContain(step1Result.data.id);`
          : `
      // Single module test
      const result = await ${modules[0]?.name}.execute();
      expect(result).toBeDefined();`
      }
    });

    it('should handle module dependencies', async () => {
      // Test that modules properly depend on each other
      ${modules
        .map(
          (module) => `
      const ${module.name.toLowerCase()}Status = await ${module.name}.healthCheck();
      expect(${module.name.toLowerCase()}Status.healthy).toBe(true);`
        )
        .join('')}
      
      // Test integrated functionality
      const integratedResult = await performIntegratedOperation();
      expect(integratedResult.success).toBe(true);
    });
  });

  ${
    hasDatabase
      ? `describe('Database Integration', () => {
    it('should handle database transactions across modules', async () => {
      const result = await testDatabase.$transaction(async (tx: any) => {
        // Create data through module 1
        const created = await ${modules[0]?.name}.createWithTransaction(tx, {
          ${hasAuthentication ? 'userId: testUser.id,' : ''}
          title: 'Test Integration'
        });
        
        // Update data through module 2
        ${
          modules[1]
            ? `const updated = await ${modules[1].name}.updateWithTransaction(tx, created.id, {
          status: 'processed'
        });
        
        return { created, updated };`
            : 'return { created };'
        }
      });
      
      expect(result.created).toBeDefined();
      ${modules[1] ? `expect(result.updated.status).toBe('processed');` : ''}
    });

    it('should handle database connection failures', async () => {
      // Simulate database connection failure
      const originalConnect = testDatabase.$connect;
      testDatabase.$connect = vi.fn().mockRejectedValue(new Error('Connection failed'));
      
      await expect(${modules[0]?.name}.performDatabaseOperation()).rejects.toThrow('Connection failed');
      
      // Restore connection
      testDatabase.$connect = originalConnect;
    });

    it('should handle concurrent database operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        ${modules[0]?.name}.createConcurrently({
          ${hasAuthentication ? 'userId: testUser.id,' : ''}
          title: \`Concurrent Test \${i}\`
        })
      );
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should maintain data consistency', async () => {
      // Create related data across modules
      const parentData = await ${modules[0]?.name}.create({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        title: 'Parent Item'
      });
      
      ${
        modules[1]
          ? `const childData = await ${modules[1].name}.create({
        parentId: parentData.id,
        content: 'Child Item'
      });`
          : ''
      }
      
      // Verify relationships
      const retrieved = await ${modules[0]?.name}.getWithRelations(parentData.id);
      expect(retrieved.id).toBe(parentData.id);
      ${
        modules[1]
          ? `expect(retrieved.children).toHaveLength(1);
      expect(retrieved.children[0].id).toBe(childData.id);`
          : ''
      }
    });
  });`
      : ''
  }

  ${
    hasExternalServices
      ? `describe('External Service Integration', () => {
    it('should integrate with external APIs', async () => {
      const result = await ${modules[0]?.name}.callExternalService({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        action: 'fetch_data'
      });
      
      expect(mockExternalAPI).toHaveBeenCalledWith({
        action: 'fetch_data',
        ${hasAuthentication ? 'userId: testUser.id' : ''}
      });
      expect(result.success).toBe(true);
    });

    it('should handle external service failures', async () => {
      mockExternalAPI.mockRejectedValue(new Error('Service unavailable'));
      
      const result = await ${modules[0]?.name}.callExternalService({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        action: 'fetch_data'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should handle external service timeouts', async () => {
      mockExternalAPI.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        )
      );
      
      await expect(${modules[0]?.name}.callExternalService({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        action: 'fetch_data',
        timeout: 1000
      })).rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting from external services', async () => {
      mockExternalAPI.mockRejectedValue(new Error('Rate limit exceeded'));
      
      const result = await ${modules[0]?.name}.callExternalService({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        action: 'fetch_data'
      });
      
      expect(result.success).toBe(false);
      expect(result.shouldRetry).toBe(true);
    });
  });`
      : ''
  }

  ${
    hasAuthentication
      ? `describe('Authentication Integration', () => {
    it('should handle authenticated operations', async () => {
      const result = await ${modules[0]?.name}.performAuthenticatedOperation({
        userId: testUser.id,
        action: 'protected_action'
      });
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUser.id);
    });

    it('should reject unauthenticated operations', async () => {
      await expect(${modules[0]?.name}.performAuthenticatedOperation({
        userId: null,
        action: 'protected_action'
      })).rejects.toThrow('Authentication required');
    });

    it('should handle invalid authentication', async () => {
      await expect(${modules[0]?.name}.performAuthenticatedOperation({
        userId: 'invalid-user-id',
        action: 'protected_action'
      })).rejects.toThrow('Invalid user');
    });

    it('should handle authorization across modules', async () => {
      // Create user with limited permissions
      const limitedUser = await createTestUser({
        email: 'limited@example.com',
        role: 'limited'
      });
      
      await expect(${modules[0]?.name}.performAuthenticatedOperation({
        userId: limitedUser.id,
        action: 'admin_action'
      })).rejects.toThrow('Insufficient permissions');
      
      await cleanupTestUser(limitedUser.id);
    });
  });`
      : ''
  }

  ${
    testEndToEnd
      ? `describe('End-to-End Workflows', () => {
    it('should complete full user workflow', async () => {
      // Step 1: User registration/authentication
      ${hasAuthentication ? 'const user = testUser;' : `const user = { id: 'test-user' };`}
      
      // Step 2: Initial data creation
      const initialData = await ${modules[0]?.name}.initialize({
        userId: user.id,
        type: 'workflow_test'
      });
      
      expect(initialData.success).toBe(true);
      
      ${
        modules[1]
          ? `// Step 3: Process data through second module
      const processedData = await ${modules[1].name}.process({
        userId: user.id,
        dataId: initialData.data.id,
        action: 'transform'
      });
      
      expect(processedData.success).toBe(true);`
          : ''
      }
      
      ${
        hasExternalServices
          ? `// Step 4: External service integration
      const externalResult = await ${modules[0]?.name}.syncWithExternal({
        userId: user.id,
        dataId: initialData.data.id
      });
      
      expect(externalResult.success).toBe(true);
      expect(mockExternalAPI).toHaveBeenCalled();`
          : ''
      }
      
      // Step 5: Verify final state
      const finalState = await ${modules[0]?.name}.getFinalState(initialData.data.id);
      expect(finalState.completed).toBe(true);
      ${modules[1] ? `expect(finalState.processedBy).toBe('${modules[1].name}');` : ''}
    });

    it('should handle workflow interruptions', async () => {
      // Start workflow
      const workflow = await ${modules[0]?.name}.startWorkflow({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        type: 'interruptible'
      });
      
      // Simulate interruption
      mockExternalAPI.mockRejectedValue(new Error('Service interrupted'));
      
      // Continue workflow should handle gracefully
      const result = await ${modules[0]?.name}.continueWorkflow(workflow.id);
      
      expect(result.canResume).toBe(true);
      expect(result.error).toContain('Service interrupted');
    });

    it('should handle data consistency across workflow steps', async () => {
      const workflowId = 'consistency-test';
      
      // Step 1
      await ${modules[0]?.name}.workflowStep1({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        workflowId,
        data: { step: 1 }
      });
      
      ${
        modules[1]
          ? `// Step 2
      await ${modules[1].name}.workflowStep2({
        workflowId,
        data: { step: 2 }
      });`
          : ''
      }
      
      // Verify consistency
      const workflowState = await ${modules[0]?.name}.getWorkflowState(workflowId);
      expect(workflowState.steps).toHaveLength(${modules.length});
      expect(workflowState.consistent).toBe(true);
    });
  });`
      : ''
  }

  describe('Error Handling and Recovery', () => {
    it('should handle cascade failures', async () => {
      // Cause failure in one module
      ${
        hasDatabase
          ? `const originalQuery = testDatabase.query;
      testDatabase.query = vi.fn().mockRejectedValue(new Error('Database failure'));`
          : ''
      }
      
      const result = await ${modules[0]?.name}.performOperation({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        data: 'test'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database failure');
      
      ${
        hasDatabase
          ? `// Restore database
      testDatabase.query = originalQuery;`
          : ''
      }
    });

    it('should implement circuit breaker pattern', async () => {
      // Cause multiple failures to trigger circuit breaker
      mockExternalAPI.mockRejectedValue(new Error('Service down'));
      
      const failures = [];
      for (let i = 0; i < 5; i++) {
        try {
          await ${modules[0]?.name}.callExternalService({ action: 'test' });
        } catch (error) {
          failures.push(error);
        }
      }
      
      expect(failures).toHaveLength(5);
      
      // Next call should be circuit broken
      const result = await ${modules[0]?.name}.callExternalService({ action: 'test' });
      expect(result.circuitBroken).toBe(true);
    });

    it('should implement retry mechanisms', async () => {
      let callCount = 0;
      mockExternalAPI.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({ success: true });
      });
      
      const result = await ${modules[0]?.name}.callExternalServiceWithRetry({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        action: 'retry_test',
        maxRetries: 3
      });
      
      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-concurrency operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        ${modules[0]?.name}.performOperation({
          ${hasAuthentication ? 'userId: testUser.id,' : ''}
          data: \`concurrent-\${i}\`
        })
      );
      
      const start = performance.now();
      const results = await Promise.all(operations);
      const duration = performance.now() - start;
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle memory efficiently', async () => {
      // Process large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000) // 1KB per item
      }));
      
      const result = await ${modules[0]?.name}.processLargeDataset({
        ${hasAuthentication ? 'userId: testUser.id,' : ''}
        dataset: largeDataset
      });
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1000);
    });
  });
});

// Helper function for integrated operations
async function performIntegratedOperation() {
  // Implementation would depend on specific modules
  return { success: true };
}`;
  },
};
