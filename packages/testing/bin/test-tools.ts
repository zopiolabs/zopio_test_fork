#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('test-tools')
  .description('Comprehensive testing tools for Zopio monorepo')
  .version('1.0.0');

// Add sub-commands
program.command('generate', 'Generate test files from templates').alias('gen');

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
    process.stdout.write(
      '\n🚀 Quick Start Guide for Zopio Testing Framework\n\n'
    );
    process.stdout.write(
      '1. Install dependencies: pnpm add -D @repo/testing vitest @testing-library/react\n'
    );
    process.stdout.write(
      '2. Create vitest.config.ts: pnpm test-tools doctor --fix\n'
    );
    process.stdout.write(
      '3. Generate test files: pnpm test-tools generate <type>\n'
    );
    process.stdout.write('4. Run tests: pnpm test\n\n');
    process.stdout.write(
      'For detailed documentation, visit: https://zopio.dev/docs/testing\n'
    );
  });

program
  .command('doctor')
  .description('Diagnose testing setup issues')
  .option('--fix', 'Automatically fix detected issues')
  .action(async (options) => {
    const issues: string[] = [];

    // Check for vitest config
    try {
      await import('./vitest.config.ts');
    } catch {
      issues.push('missing-vitest-config');
    }

    // Check for test directory
    const fs = await import('node:fs/promises');
    try {
      await fs.access('__tests__');
    } catch {
      issues.push('missing-test-directory');
    }

    // Check for testing package
    try {
      await import('@repo/testing');
    } catch {
      issues.push('missing-testing-package');
    }

    if (issues.length === 0) {
      process.stdout.write(
        '✅ Testing setup is healthy! No issues detected.\n'
      );
    } else if (options.fix) {
      if (issues.includes('missing-test-directory')) {
        await fs.mkdir('__tests__', { recursive: true });
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
      }
    } else {
      process.stdout.write('\n❌ Testing setup issues detected:\n\n');
      for (const issue of issues) {
        switch (issue) {
          case 'missing-vitest-config':
            process.stdout.write('  - Missing vitest.config.ts file\n');
            break;
          case 'missing-test-directory':
            process.stdout.write('  - Missing __tests__ directory\n');
            break;
          case 'missing-testing-package':
            process.stdout.write(
              '  - Missing @repo/testing package dependency\n'
            );
            break;
          default:
            process.stdout.write(`  - Unknown issue: ${issue}\n`);
            break;
        }
      }
      process.stdout.write(
        '\nRun with --fix flag to automatically resolve these issues.\n'
      );
    }
  });

program.parse();

// Export for programmatic use
export { program };
