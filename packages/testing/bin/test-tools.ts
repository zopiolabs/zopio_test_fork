#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import { Command } from 'commander';
import { program as generateTests } from '../src/cli/generate-tests.js';
import { program as scaffoldPackage } from '../src/cli/scaffold-package.js';
import { program as analyzeTests } from '../src/cli/analyze-tests.js';
import { program as maintenance } from '../src/cli/maintenance.js';

const program = new Command();

program
  .name('test-tools')
  .description('Comprehensive testing tools for Zopio monorepo')
  .version('1.0.0');

// Add sub-commands
program
  .command('generate', 'Generate test files from templates')
  .alias('gen');

program
  .command('scaffold', 'Scaffold testing infrastructure for packages')
  .alias('init');

program
  .command('analyze', 'Analyze test suite quality and coverage')
  .alias('check');

program
  .command('maintain', 'Automated test maintenance and optimization')
  .alias('fix');

// Quick commands for common operations
program
  .command('quick-start')
  .description('Quick start guide for testing framework')
  .action(() => {
    console.log(`
🚀 Zopio Testing Framework Quick Start

## Generate Tests
  npx test-tools generate interactive    # Interactive test generation
  npx test-tools gen single -t component --name Button --path ./src/Button.tsx

## Package Setup
  npx test-tools scaffold init ./packages/my-package    # Initialize testing infrastructure
  npx test-tools scaffold complete ./packages/my-package    # Generate missing tests

## Analysis
  npx test-tools analyze coverage    # Coverage analysis
  npx test-tools analyze quality     # Quality analysis
  npx test-tools check comprehensive # Full analysis

## Maintenance
  npx test-tools maintain health     # Health check
  npx test-tools maintain flaky      # Detect flaky tests
  npx test-tools fix cleanup         # Clean up obsolete tests

## Documentation
  See packages/testing/docs/README.md for comprehensive guide

## Examples
  cd packages/design-system
  npx test-tools scaffold init .
  npx test-tools generate single -t component --name Button --path ./src/Button.tsx
  npx test-tools analyze coverage --threshold 80
  npx test-tools maintain health
`);
  });

program
  .command('doctor')
  .description('Diagnose testing setup issues')
  .option('--fix', 'Automatically fix detected issues')
  .action(async (options) => {
    console.log('🔍 Diagnosing testing setup...\n');
    
    const issues = [];
    
    // Check for vitest config
    try {
      await import('./vitest.config.ts');
      console.log('✅ Vitest configuration found');
    } catch {
      console.log('❌ No vitest.config.ts found');
      issues.push('missing-vitest-config');
    }
    
    // Check for test directory
    const fs = await import('node:fs/promises');
    try {
      await fs.access('__tests__');
      console.log('✅ Test directory exists');
    } catch {
      console.log('❌ No __tests__ directory found');
      issues.push('missing-test-directory');
    }
    
    // Check for testing package
    try {
      await import('@repo/testing');
      console.log('✅ @repo/testing package available');
    } catch {
      console.log('❌ @repo/testing package not found');
      issues.push('missing-testing-package');
    }
    
    if (issues.length === 0) {
      console.log('\n🎉 Testing setup looks good!');
    } else {
      console.log(`\n⚠️  Found ${issues.length} issues`);
      
      if (options.fix) {
        console.log('\n🔧 Attempting to fix issues...');
        
        if (issues.includes('missing-test-directory')) {
          await fs.mkdir('__tests__', { recursive: true });
          console.log('✅ Created __tests__ directory');
        }
        
        if (issues.includes('missing-vitest-config')) {
          const path = await import('node:path');
          const packageName = path.basename(process.cwd());
          const config = `/**
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
          await fs.writeFile('vitest.config.ts', config);
          console.log('✅ Created vitest.config.ts');
        }
      } else {
        console.log('\n💡 Run with --fix to automatically resolve issues');
      }
    }
  });

program.parse();

// Export for programmatic use
export { program };