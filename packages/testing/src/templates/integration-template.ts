/**
 * SPDX-License-Identifier: MIT
 */

import {
  generateAfterEach,
  generateBeforeAll,
  generateBeforeEach,
  generateEndToEndTests,
  generateErrorHandlingTests,
  generateImports,
  generateIntegrationTests,
  generateMocks,
  generateModuleTests,
  generatePerformanceTests,
  generateTestVariables,
} from './integration-template-helpers.js';
import type { IntegrationTestOptions, TestTemplate } from './types.js';

/**
 * Template for integration tests between multiple modules
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

    return `/**
 * SPDX-License-Identifier: MIT
 */

${generateImports(options)}

${generateMocks(hasExternalServices)}

describe('${testName} Integration Tests', () => {
  ${generateTestVariables(options)}

  beforeAll(async () => {
    ${generateBeforeAll(hasDatabase)}
  });

  afterAll(async () => {
    // Clean up test environment
    await cleanupTestContext(testContext);
  });

  beforeEach(async () => {
    ${generateBeforeEach(options)}
  });

  afterEach(async () => {
    ${generateAfterEach(hasAuthentication)}
  });

  ${generateModuleTests(modules)}

  ${generateIntegrationTests(options)}

  ${generateEndToEndTests(testEndToEnd)}

  ${generateErrorHandlingTests(hasExternalServices)}

  ${generatePerformanceTests()}
});

// Helper functions for test operations
async function performUserAction(userId: string, action: any) {
  // Implement your user action logic here
  return { success: true, result: action };
}

async function getUserPosts(userId: string) {
  // Implement your data fetching logic here
  return testDatabase.post.findMany({
    where: { userId },
  });
}

async function makeAPICall(options: any) {
  // Implement your API call logic here
  return mockExternalAPI(options);
}

async function performTestOperation(options?: any) {
  // Implement your test operation logic here
  await new Promise(resolve => setTimeout(resolve, 10));
  return { success: true, ...options };
}
`;
  },
};
