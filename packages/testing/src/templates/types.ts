/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Base interface for all test templates
 */
export interface TestTemplate {
  name: string;
  description: string;
  generate: (options: Record<string, unknown>) => string;
}

/**
 * Options for component test template
 */
export interface ComponentTestOptions {
  componentName: string;
  componentPath: string;
  hasProps?: boolean;
  hasEvents?: boolean;
  hasAsyncBehavior?: boolean;
  hasAccessibility?: boolean;
  testAsyncLoading?: boolean;
  testErrorStates?: boolean;
}

/**
 * Options for utility function test template
 */
export interface UtilityTestOptions {
  functionName: string;
  functionPath: string;
  isAsync?: boolean;
  hasValidation?: boolean;
  hasErrorHandling?: boolean;
  testPerformance?: boolean;
}

/**
 * Options for API route test template
 */
export interface APITestOptions {
  routeName: string;
  routePath: string;
  methods?: string[];
  requiresAuth?: boolean;
  hasValidation?: boolean;
  hasRateLimit?: boolean;
  testDatabase?: boolean;
}

/**
 * Options for React hook test template
 */
export interface HookTestOptions {
  hookName: string;
  hookPath: string;
  hasAsyncBehavior?: boolean;
  hasStateManagement?: boolean;
  hasEffects?: boolean;
  hasCleanup?: boolean;
  testErrorStates?: boolean;
}

/**
 * Options for integration test template
 */
export interface IntegrationTestOptions {
  testName: string;
  modules?: Array<{
    name: string;
    path: string;
  }>;
  hasDatabase?: boolean;
  hasExternalServices?: boolean;
  hasAuthentication?: boolean;
  testEndToEnd?: boolean;
}

/**
 * Options for security test template
 */
export interface SecurityTestOptions {
  moduleName: string;
  modulePath: string;
  testAuthentication?: boolean;
  testAuthorization?: boolean;
  testInputValidation?: boolean;
  testSqlInjection?: boolean;
  testXss?: boolean;
  testCsrf?: boolean;
}

/**
 * Generator configuration interface
 */
export interface GeneratorConfig {
  outputPath: string;
  template: TestTemplate;
  options: Record<string, unknown>;
  overwrite?: boolean;
}

/**
 * Test scaffolding options
 */
export interface ScaffoldOptions {
  packagePath: string;
  testType:
    | 'component'
    | 'utility'
    | 'api'
    | 'hook'
    | 'integration'
    | 'security';
  templateOptions: Record<string, unknown>;
  createDirectory?: boolean;
}

/**
 * Test analysis result
 */
export interface TestAnalysisResult {
  filePath: string;
  testType: string;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  patterns: string[];
  suggestions: string[];
  issues: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    line?: number;
  }>;
}
