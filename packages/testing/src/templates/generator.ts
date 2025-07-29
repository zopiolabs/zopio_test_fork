/**
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  apiTestTemplate,
  componentTestTemplate,
  hookTestTemplate,
  integrationTestTemplate,
  securityTestTemplate,
  utilityTestTemplate,
} from './index.js';
import type {
  GeneratorConfig,
  ScaffoldOptions,
  TestAnalysisResult,
  TestTemplate,
} from './types.js';

/**
 * Test template registry
 */
const TEMPLATES: Record<string, TestTemplate> = {
  component: componentTestTemplate,
  utility: utilityTestTemplate,
  api: apiTestTemplate,
  hook: hookTestTemplate,
  integration: integrationTestTemplate,
  security: securityTestTemplate,
};

/**
 * Code generator for creating standardized test files
 */
export class TestGenerator {
  /**
   * Generate a test file from a template
   */
  static async generateTest(config: GeneratorConfig): Promise<void> {
    const { outputPath, template, options, overwrite = false } = config;

    // Check if file exists and handle overwrite logic
    const fileExists = await fs
      .access(outputPath)
      .then(() => true)
      .catch(() => false);

    if (fileExists && !overwrite) {
      throw new Error(
        `Test file already exists: ${outputPath}. Use overwrite: true to replace it.`
      );
    }

    // Generate test content
    const testContent = template.generate(options);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write test file
    await fs.writeFile(outputPath, testContent, 'utf8');
  }

  /**
   * Scaffold tests for an entire package
   */
  static async scaffoldPackageTests(options: ScaffoldOptions): Promise<void> {
    const {
      packagePath,
      testType,
      templateOptions,
      createDirectory = true,
    } = options;

    const template = TEMPLATES[testType];
    if (!template) {
      throw new Error(`Unknown test type: ${testType}`);
    }

    // Determine test directory
    const testDir = path.join(packagePath, '__tests__');

    if (createDirectory) {
      await fs.mkdir(testDir, { recursive: true });
    }

    // Generate test file name
    const testFileName = `${templateOptions.componentName || templateOptions.functionName || templateOptions.moduleName || 'generated'}.test.ts`;
    const testFilePath = path.join(testDir, testFileName);

    // Generate test
    await TestGenerator.generateTest({
      outputPath: testFilePath,
      template,
      options: templateOptions,
      overwrite: false,
    });

    // Create vitest config if it doesn't exist
    await TestGenerator.ensureVitestConfig(packagePath);
  }

  /**
   * Auto-detect and generate tests for existing code files
   */
  static async autoGenerateTests(sourcePath: string): Promise<void> {
    const sourceContent = await fs.readFile(sourcePath, 'utf8');
    const analysis = await TestGenerator.analyzeSourceFile(
      sourcePath,
      sourceContent
    );

    const packageDir = TestGenerator.findPackageRoot(sourcePath);
    const relativePath = path.relative(packageDir, sourcePath);
    const testPath = TestGenerator.getTestPath(sourcePath);

    // Determine test type and generate appropriate template options
    const { testType, templateOptions } = TestGenerator.inferTestConfiguration(
      analysis,
      relativePath
    );

    const template = TEMPLATES[testType];
    if (!template) {
      return;
    }

    await TestGenerator.generateTest({
      outputPath: testPath,
      template,
      options: templateOptions,
      overwrite: false,
    });
  }

  /**
   * Batch generate tests for multiple files
   */
  static async batchGenerate(sourcePaths: string[]): Promise<void> {
    const results = await Promise.allSettled(
      sourcePaths.map(async (sourcePath) => {
        try {
          await TestGenerator.autoGenerateTests(sourcePath);
          return { success: true, path: sourcePath };
        } catch (error) {
          return { success: false, path: sourcePath, error: error.message };
        }
      })
    );

    const _successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.filter(
      (r) => r.status === 'fulfilled' && !r.value.success
    ).length;
    if (failed > 0) {
      results.forEach((result) => {
        if (result.status === 'fulfilled' && !result.value.success) {
        }
      });
    }
  }

  /**
   * Create test template for custom scenarios
   */
  static createCustomTemplate(
    name: string,
    description: string,
    generateFn: (options: any) => string
  ): TestTemplate {
    return {
      name,
      description,
      generate: generateFn,
    };
  }

  /**
   * Register a custom template
   */
  static registerTemplate(key: string, template: TestTemplate): void {
    TEMPLATES[key] = template;
  }

  /**
   * List available templates
   */
  static listTemplates(): Array<{ key: string; template: TestTemplate }> {
    return Object.entries(TEMPLATES).map(([key, template]) => ({
      key,
      template,
    }));
  }

  /**
   * Private helper methods
   */

  private static async analyzeSourceFile(
    filePath: string,
    content: string
  ): Promise<TestAnalysisResult> {
    const lines = content.split('\n');

    return {
      filePath,
      testType: TestGenerator.detectTestType(content, filePath),
      coverage: {
        lines: 0,
        functions: TestGenerator.countFunctions(content),
        branches: TestGenerator.countBranches(content),
        statements: TestGenerator.countStatements(content),
      },
      patterns: TestGenerator.detectPatterns(content),
      suggestions: TestGenerator.generateSuggestions(content),
      issues: TestGenerator.detectIssues(content, lines),
    };
  }

  private static detectTestType(content: string, filePath: string): string {
    // Component detection
    if (
      content.includes('export default function') ||
      (content.includes('export const') && content.includes('React'))
    ) {
      return 'component';
    }

    // API route detection
    if (
      filePath.includes('/api/') ||
      content.includes('NextRequest') ||
      content.includes('NextResponse')
    ) {
      return 'api';
    }

    // Hook detection
    if (
      (content.includes('useState') || content.includes('useEffect')) &&
      content.includes('export')
    ) {
      return 'hook';
    }

    // Security module detection
    if (
      content.includes('auth') ||
      content.includes('security') ||
      content.includes('jwt')
    ) {
      return 'security';
    }

    // Default to utility
    return 'utility';
  }

  private static countFunctions(content: string): number {
    const functionRegex =
      /(function\s+\w+|const\s+\w+\s*=\s*\(|export\s+(default\s+)?function)/g;
    return (content.match(functionRegex) || []).length;
  }

  private static countBranches(content: string): number {
    const branchRegex = /(if\s*\(|else|switch|case|catch|\?|\|\||&&)/g;
    return (content.match(branchRegex) || []).length;
  }

  private static countStatements(content: string): number {
    const statementRegex = /;/g;
    return (content.match(statementRegex) || []).length;
  }

  private static detectPatterns(content: string): string[] {
    const patterns: string[] = [];

    if (content.includes('async') && content.includes('await')) {
      patterns.push('async');
    }

    if (content.includes('try') && content.includes('catch')) {
      patterns.push('error-handling');
    }

    if (content.includes('useState') || content.includes('useEffect')) {
      patterns.push('react-hooks');
    }

    if (content.includes('database') || content.includes('prisma')) {
      patterns.push('database');
    }

    if (content.includes('auth') || content.includes('token')) {
      patterns.push('authentication');
    }

    return patterns;
  }

  private static generateSuggestions(content: string): string[] {
    const suggestions: string[] = [];

    if (!content.includes('try') && content.includes('await')) {
      suggestions.push('Consider adding error handling for async operations');
    }

    if (content.includes('console.log')) {
      suggestions.push('Replace console.log with proper logging');
    }

    if (!content.includes('/**') && content.includes('export')) {
      suggestions.push('Add JSDoc comments for exported functions');
    }

    return suggestions;
  }

  private static detectIssues(
    _content: string,
    lines: string[]
  ): Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    line?: number;
  }> {
    const issues: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      line?: number;
    }> = [];

    lines.forEach((line, index) => {
      if (line.includes('any')) {
        issues.push({
          type: 'warning',
          message: 'Usage of "any" type reduces type safety',
          line: index + 1,
        });
      }

      if (line.includes('console.log')) {
        issues.push({
          type: 'info',
          message: 'Console.log should be removed before production',
          line: index + 1,
        });
      }

      if (line.includes('// TODO') || line.includes('// FIXME')) {
        issues.push({
          type: 'info',
          message: 'TODO/FIXME comment found',
          line: index + 1,
        });
      }
    });

    return issues;
  }

  private static inferTestConfiguration(
    analysis: TestAnalysisResult,
    relativePath: string
  ): { testType: string; templateOptions: any } {
    const testType = analysis.testType;
    const fileName = path.basename(relativePath, path.extname(relativePath));
    const isAsync = analysis.patterns.includes('async');
    const hasErrorHandling = analysis.patterns.includes('error-handling');

    switch (testType) {
      case 'component':
        return {
          testType,
          templateOptions: {
            componentName: fileName,
            componentPath: relativePath.replace(/\\/g, '/'),
            hasProps: true,
            hasEvents: true,
            hasAsyncBehavior: isAsync,
            hasAccessibility: true,
            testAsyncLoading: isAsync,
            testErrorStates: hasErrorHandling,
          },
        };

      case 'utility':
        return {
          testType,
          templateOptions: {
            functionName: fileName,
            functionPath: relativePath.replace(/\\/g, '/'),
            isAsync,
            hasValidation: true,
            hasErrorHandling,
            testPerformance: analysis.coverage.functions > 5,
          },
        };

      case 'api':
        return {
          testType,
          templateOptions: {
            routeName: fileName,
            routePath: relativePath.replace(/\\/g, '/'),
            methods: ['GET', 'POST'],
            requiresAuth: analysis.patterns.includes('authentication'),
            hasValidation: true,
            hasRateLimit: false,
            testDatabase: analysis.patterns.includes('database'),
          },
        };

      case 'hook':
        return {
          testType,
          templateOptions: {
            hookName: fileName,
            hookPath: relativePath.replace(/\\/g, '/'),
            hasAsyncBehavior: isAsync,
            hasStateManagement: analysis.patterns.includes('react-hooks'),
            hasEffects: analysis.patterns.includes('react-hooks'),
            hasCleanup: true,
            testErrorStates: hasErrorHandling,
          },
        };

      case 'security':
        return {
          testType,
          templateOptions: {
            moduleName: fileName,
            modulePath: relativePath.replace(/\\/g, '/'),
            testAuthentication: analysis.patterns.includes('authentication'),
            testAuthorization: true,
            testInputValidation: true,
            testSqlInjection: analysis.patterns.includes('database'),
            testXss: true,
            testCsrf: true,
          },
        };

      default:
        return {
          testType: 'utility',
          templateOptions: {
            functionName: fileName,
            functionPath: relativePath.replace(/\\/g, '/'),
            isAsync,
            hasValidation: true,
            hasErrorHandling,
            testPerformance: false,
          },
        };
    }
  }

  private static findPackageRoot(filePath: string): string {
    let currentDir = path.dirname(filePath);

    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');

      try {
        fs.accessSync(packageJsonPath);
        return currentDir;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }

    throw new Error(`Could not find package.json for file: ${filePath}`);
  }

  private static getTestPath(sourcePath: string): string {
    const packageRoot = TestGenerator.findPackageRoot(sourcePath);
    const relativePath = path.relative(packageRoot, sourcePath);
    const parsed = path.parse(relativePath);

    // Place test files in __tests__ directory
    const testDir = path.join(packageRoot, '__tests__');
    const testFileName = `${parsed.name}.test${parsed.ext}`;

    return path.join(testDir, testFileName);
  }

  private static async ensureVitestConfig(packagePath: string): Promise<void> {
    const configPath = path.join(packagePath, 'vitest.config.ts');

    try {
      await fs.access(configPath);
      return; // Config already exists
    } catch {
      // Create basic vitest config
      const packageName = path.basename(packagePath);
      const configContent = `/**
 * SPDX-License-Identifier: MIT
 */

import { createVitestConfig } from '@repo/testing/configs';

export default createVitestConfig('${packageName}', {
  test: {
    name: '${packageName}',
    environment: 'jsdom',
    setupFiles: ['@repo/testing/setup'],
  },
});
`;

      await fs.writeFile(configPath, configContent, 'utf8');
    }
  }
}

/**
 * CLI-friendly helper functions
 */

/**
 * Generate a single test file
 */
export async function generateTestFile(
  templateType: string,
  outputPath: string,
  options: any,
  overwrite = false
): Promise<void> {
  const template = TEMPLATES[templateType];
  if (!template) {
    throw new Error(`Unknown template type: ${templateType}`);
  }

  await TestGenerator.generateTest({
    outputPath,
    template,
    options,
    overwrite,
  });
}

/**
 * Auto-generate tests for a directory
 */
export async function autoGenerateTestsForDirectory(
  directoryPath: string,
  options: { extensions?: string[]; exclude?: string[] } = {}
): Promise<void> {
  const {
    extensions = ['.ts', '.tsx', '.js', '.jsx'],
    exclude = ['*.test.*', '*.spec.*', '__tests__'],
  } = options;

  const files = await findSourceFiles(directoryPath, extensions, exclude);
  await TestGenerator.batchGenerate(files);
}

/**
 * Find source files in a directory
 */
async function findSourceFiles(
  dir: string,
  extensions: string[],
  exclude: string[]
): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (
          !exclude.some((pattern) =>
            entry.name.includes(pattern.replace('*', ''))
          )
        ) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        // Include files with correct extensions, excluding test files
        const hasValidExtension = extensions.some((ext) =>
          entry.name.endsWith(ext)
        );
        const isExcluded = exclude.some((pattern) => {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(entry.name);
        });

        if (hasValidExtension && !isExcluded) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return files;
}
