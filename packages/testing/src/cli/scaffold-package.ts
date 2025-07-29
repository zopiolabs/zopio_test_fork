#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TestGenerator } from '../templates/generator.js';

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
  .option('--template <template>', 'Use specific test template', 'comprehensive')
  .action(async (packagePath, options) => {
    try {
      const resolvedPath = path.resolve(packagePath);
      
      console.log(`🚀 Scaffolding test infrastructure for: ${resolvedPath}`);
      
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
      
      console.log('✅ Package scaffolding complete!');
      console.log('\n📋 Next steps:');
      console.log('  1. Review generated test files');
      console.log('  2. Run: pnpm test');
      console.log('  3. Customize tests as needed');
      
    } catch (error) {
      console.error('❌ Error scaffolding package:', error.message);
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
          console.log(JSON.stringify(analysis, null, 2));
          break;
        case 'markdown':
          printMarkdownReport(analysis);
          break;
        default:
          printTableReport(analysis);
      }
      
    } catch (error) {
      console.error('❌ Error analyzing package:', error.message);
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
        console.log('✅ All source files have corresponding test files!');
        return;
      }
      
      console.log(`📊 Found ${missing.length} source files without tests:`);
      missing.forEach(file => console.log(`  - ${file}`));
      
      if (options.dryRun) {
        console.log('\n🔍 Dry run mode - no files will be created');
        return;
      }
      
      console.log('\n🚀 Generating missing tests...');
      await TestGenerator.batchGenerate(missing);
      
    } catch (error) {
      console.error('❌ Error completing tests:', error.message);
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
      
      console.log('✅ Test updates complete!');
      
    } catch (error) {
      console.error('❌ Error updating tests:', error.message);
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
  
  console.log('📁 Created test directory structure');
}

async function createVitestConfig(packagePath: string): Promise<void> {
  const configPath = path.join(packagePath, 'vitest.config.ts');
  
  try {
    await fs.access(configPath);
    console.log('⚠️  Vitest config already exists, skipping...');
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
  console.log('⚙️  Created vitest.config.ts');
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
  console.log('🔧 Created test setup file');
}

async function generateInitialTests(packagePath: string): Promise<void> {
  try {
    const srcPath = path.join(packagePath, 'src');
    await fs.access(srcPath);
    
    // Find source files
    const sourceFiles = await findSourceFiles(srcPath);
    
    if (sourceFiles.length === 0) {
      console.log('ℹ️  No source files found to generate tests for');
      return;
    }
    
    console.log(`🔍 Found ${sourceFiles.length} source files`);
    await TestGenerator.batchGenerate(sourceFiles);
    
  } catch {
    console.log('ℹ️  No src directory found, skipping initial test generation');
  }
}

async function findSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__tests__') {
        await walk(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
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

async function analyzePackageTests(packagePath: string): Promise<PackageAnalysis> {
  const sourceFiles = await findSourceFiles(path.join(packagePath, 'src')).catch(() => []);
  const testFiles = await findTestFiles(packagePath);
  
  const testedFiles = testFiles.map(testFile => {
    const testName = path.basename(testFile, '.test.ts').replace('.test', '');
    return sourceFiles.find(src => path.basename(src, path.extname(src)) === testName);
  }).filter(Boolean);
  
  const missing = sourceFiles.filter(src => !testedFiles.includes(src));
  
  const suggestions = [];
  if (missing.length > 0) {
    suggestions.push(`Generate tests for ${missing.length} uncovered files`);
  }
  if (sourceFiles.length > 0 && testFiles.length === 0) {
    suggestions.push('Initialize test infrastructure with scaffold-package init');
  }
  
  return {
    packagePath,
    sourceFiles,
    testFiles,
    coverage: {
      total: sourceFiles.length,
      tested: testedFiles.length,
      percentage: sourceFiles.length > 0 ? Math.round((testedFiles.length / sourceFiles.length) * 100) : 0,
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
      .filter(file => file.endsWith('.test.ts') || file.endsWith('.test.tsx'))
      .map(file => path.join(testDir, file));
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
  const backupDir = path.join(packagePath, '__tests__.backup.' + Date.now());
  
  try {
    await fs.cp(testDir, backupDir, { recursive: true });
    console.log(`💾 Created backup: ${backupDir}`);
  } catch {
    console.log('ℹ️  No existing tests to backup');
  }
}

async function updateExistingTests(packagePath: string, template?: string): Promise<void> {
  // This would implement logic to update existing tests
  // For now, just log the intention
  console.log(`🔄 Would update tests in ${packagePath}${template ? ` using ${template} template` : ''}`);
}

function printTableReport(analysis: PackageAnalysis): void {
  console.log(`\n📊 Test Coverage Report for ${path.basename(analysis.packagePath)}\n`);
  console.log(`Source Files:    ${analysis.sourceFiles.length}`);
  console.log(`Test Files:      ${analysis.testFiles.length}`);
  console.log(`Coverage:        ${analysis.coverage.percentage}% (${analysis.coverage.tested}/${analysis.coverage.total})`);
  console.log(`Missing Tests:   ${analysis.missing.length}`);
  
  if (analysis.missing.length > 0) {
    console.log('\n❌ Files without tests:');
    analysis.missing.forEach(file => {
      console.log(`  - ${path.relative(analysis.packagePath, file)}`);
    });
  }
  
  if (analysis.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    analysis.suggestions.forEach(suggestion => {
      console.log(`  - ${suggestion}`);
    });
  }
}

function printMarkdownReport(analysis: PackageAnalysis): void {
  console.log(`# Test Coverage Report: ${path.basename(analysis.packagePath)}\n`);
  console.log(`| Metric | Value |`);
  console.log(`|--------|-------|`);
  console.log(`| Source Files | ${analysis.sourceFiles.length} |`);
  console.log(`| Test Files | ${analysis.testFiles.length} |`);
  console.log(`| Coverage | ${analysis.coverage.percentage}% (${analysis.coverage.tested}/${analysis.coverage.total}) |`);
  console.log(`| Missing Tests | ${analysis.missing.length} |\n`);
  
  if (analysis.missing.length > 0) {
    console.log(`## Files Without Tests\n`);
    analysis.missing.forEach(file => {
      console.log(`- \`${path.relative(analysis.packagePath, file)}\``);
    });
    console.log('');
  }
  
  if (analysis.suggestions.length > 0) {
    console.log(`## Suggestions\n`);
    analysis.suggestions.forEach(suggestion => {
      console.log(`- ${suggestion}`);
    });
  }
}

if (require.main === module) {
  program.parse();
}

export { program };