#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Command } from 'commander';
import { TestGenerator } from '../templates/generator.js';

// Top-level regex for performance
const SOURCE_FILE_REGEX = /\.(ts|tsx|js|jsx)$/;

const program = new Command();

program
  .name('scaffold-package')
  .description('Scaffold comprehensive test suite for a package')
  .version('1.0.0');

// Main scaffold command
program
  .command('init')
  .description('Initialize testing infrastructure for a package')
  .argument('<package-path>', 'Path to the package')
  .option('--skip-config', 'Skip vitest config creation')
  .option('--skip-setup', 'Skip test setup files')
  .option(
    '--template <template>',
    'Use specific test template',
    'comprehensive'
  )
  .action(async (packagePath, options) => {
    try {
      const resolvedPath = path.resolve(packagePath);

      // Create test directory structure
      await createTestStructure(resolvedPath);

      // Create vitest config
      if (!options.skipConfig) {
        await createVitestConfig(resolvedPath);
      }

      // Create test setup files
      if (!options.skipSetup) {
        await createTestSetup(resolvedPath);
      }

      // Generate initial tests based on existing source files
      await generateInitialTests(resolvedPath);
    } catch (_error) {
      process.exit(1);
    }
  });

// Analyze existing tests
program
  .command('analyze')
  .description('Analyze existing test coverage and structure')
  .argument('<package-path>', 'Path to the package')
  .option('--format <format>', 'Output format (table, json, markdown)', 'table')
  .action(async (packagePath, options) => {
    try {
      const resolvedPath = path.resolve(packagePath);
      const analysis = await analyzePackageTests(resolvedPath);

      switch (options.format) {
        case 'json':
          break;
        case 'markdown':
          printMarkdownReport(analysis);
          break;
        default:
          printTableReport(analysis);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Generate missing tests
program
  .command('complete')
  .description('Generate tests for source files that lack coverage')
  .argument('<package-path>', 'Path to the package')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(async (packagePath, options) => {
    try {
      const resolvedPath = path.resolve(packagePath);
      const missing = await findMissingTests(resolvedPath);

      if (missing.length === 0) {
        return;
      }
      // Files to be generated are passed to batchGenerate below

      if (options.dryRun) {
        return;
      }
      await TestGenerator.batchGenerate(missing);
    } catch (_error) {
      process.exit(1);
    }
  });

// Update test templates
program
  .command('update')
  .description('Update existing tests to match current templates')
  .argument('<package-path>', 'Path to the package')
  .option('--backup', 'Create backup of existing tests')
  .option('--template <template>', 'Use specific template for updates')
  .action(async (packagePath, options) => {
    try {
      const resolvedPath = path.resolve(packagePath);

      if (options.backup) {
        await createTestBackup(resolvedPath);
      }

      await updateExistingTests(resolvedPath, options.template);
    } catch (_error) {
      process.exit(1);
    }
  });

// Helper functions

async function createTestStructure(packagePath: string): Promise<void> {
  const testDir = path.join(packagePath, '__tests__');
  const fixtures = path.join(testDir, 'fixtures');
  const helpers = path.join(testDir, 'helpers');

  await fs.mkdir(testDir, { recursive: true });
  await fs.mkdir(fixtures, { recursive: true });
  await fs.mkdir(helpers, { recursive: true });

  // Create basic helper files
  await fs.writeFile(
    path.join(helpers, 'test-utils.ts'),
    `/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Test utilities specific to this package
 */

export function createMockData() {
  return {
    id: 'test-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTestContext() {
  return {
    userId: 'test-user',
    timestamp: Date.now(),
  };
}
`
  );
}

async function createVitestConfig(packagePath: string): Promise<void> {
  const configPath = path.join(packagePath, 'vitest.config.ts');

  try {
    await fs.access(configPath);
    return;
  } catch {
    // Config doesn't exist, create it
  }

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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },
  },
});
`;

  await fs.writeFile(configPath, configContent);
}

async function createTestSetup(packagePath: string): Promise<void> {
  const setupPath = path.join(packagePath, '__tests__', 'setup.ts');

  const setupContent = `/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Test setup file for this package
 * This file runs before each test file
 */

import '@repo/testing/setup';

// Package-specific test setup
beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Package-specific global mocks
vi.mock('some-external-dependency', () => ({
  default: vi.fn(),
}));
`;

  await fs.writeFile(setupPath, setupContent);
}

async function generateInitialTests(packagePath: string): Promise<void> {
  try {
    const srcPath = path.join(packagePath, 'src');
    await fs.access(srcPath);

    // Find source files
    const sourceFiles = await findSourceFiles(srcPath);

    if (sourceFiles.length === 0) {
      return;
    }
    await TestGenerator.batchGenerate(sourceFiles);
  } catch {
    // Ignore errors when no source files are found
  }
}

async function findSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== '__tests__'
      ) {
        await walk(fullPath);
      } else if (
        entry.isFile() &&
        SOURCE_FILE_REGEX.test(entry.name) &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.spec.')
      ) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

interface PackageAnalysis {
  packagePath: string;
  sourceFiles: string[];
  testFiles: string[];
  coverage: {
    total: number;
    tested: number;
    percentage: number;
  };
  missing: string[];
  suggestions: string[];
}

async function analyzePackageTests(
  packagePath: string
): Promise<PackageAnalysis> {
  const sourceFiles = await findSourceFiles(
    path.join(packagePath, 'src')
  ).catch(() => []);
  const testFiles = await findTestFiles(packagePath);

  const testedFiles = testFiles
    .map((testFile) => {
      const testName = path.basename(testFile, '.test.ts').replace('.test', '');
      return sourceFiles.find(
        (src) => path.basename(src, path.extname(src)) === testName
      );
    })
    .filter(Boolean);

  const missing = sourceFiles.filter((src) => !testedFiles.includes(src));

  const suggestions: string[] = [];
  if (missing.length > 0) {
    suggestions.push(`Generate tests for ${missing.length} uncovered files`);
  }
  if (sourceFiles.length > 0 && testFiles.length === 0) {
    suggestions.push(
      'Initialize test infrastructure with scaffold-package init'
    );
  }

  return {
    packagePath,
    sourceFiles,
    testFiles,
    coverage: {
      total: sourceFiles.length,
      tested: testedFiles.length,
      percentage:
        sourceFiles.length > 0
          ? Math.round((testedFiles.length / sourceFiles.length) * 100)
          : 0,
    },
    missing,
    suggestions,
  };
}

async function findTestFiles(packagePath: string): Promise<string[]> {
  const testDir = path.join(packagePath, '__tests__');
  try {
    const files = await fs.readdir(testDir);
    return files
      .filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx'))
      .map((file) => path.join(testDir, file));
  } catch {
    return [];
  }
}

async function findMissingTests(packagePath: string): Promise<string[]> {
  const analysis = await analyzePackageTests(packagePath);
  return analysis.missing;
}

async function createTestBackup(packagePath: string): Promise<void> {
  const testDir = path.join(packagePath, '__tests__');
  const backupDir = path.join(packagePath, `__tests__.backup.${Date.now()}`);

  try {
    await fs.cp(testDir, backupDir, { recursive: true });
  } catch {
    // Ignore errors when no source files are found
  }
}

async function updateExistingTests(
  _packagePath: string,
  _template?: string
): Promise<void> {
  // TODO: Implement test update logic
  // This function will be implemented when test update functionality is needed
}

function printTableReport(analysis: PackageAnalysis): void {
  if (analysis.missing.length > 0) {
    process.stdout.write('\nMissing test files:\n');
    for (const file of analysis.missing) {
      process.stdout.write(`  - ${file}\n`);
    }
  }

  if (analysis.suggestions.length > 0) {
    process.stdout.write('\nSuggestions:\n');
    for (const suggestion of analysis.suggestions) {
      process.stdout.write(`  - ${suggestion}\n`);
    }
  }
}

function printMarkdownReport(analysis: PackageAnalysis): void {
  if (analysis.missing.length > 0) {
    process.stdout.write('\n## Missing Test Files\n\n');
    for (const file of analysis.missing) {
      process.stdout.write(`- [ ] ${file}\n`);
    }
  }

  if (analysis.suggestions.length > 0) {
    process.stdout.write('\n## Suggestions\n\n');
    for (const suggestion of analysis.suggestions) {
      process.stdout.write(`- ${suggestion}\n`);
    }
  }
}

if (require.main === module) {
  program.parse();
}

export { program };
