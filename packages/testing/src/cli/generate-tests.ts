#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import * as path from 'node:path';
import { Command } from 'commander';
import {
  TestGenerator,
  autoGenerateTestsForDirectory,
  generateTestFile,
} from '../templates/generator.js';

// Top-level regex for performance
const FILE_EXTENSION_REGEX = /\.(ts|tsx|js|jsx)$/;

const program = new Command();

program
  .name('generate-tests')
  .description('Generate test files from templates')
  .version('1.0.0');

// Generate single test command
program
  .command('single')
  .description('Generate a single test file')
  .requiredOption(
    '-t, --type <type>',
    'Test type (component, utility, api, hook, integration, security)'
  )
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('-f, --force', 'Overwrite existing file')
  .option('--name <name>', 'Component/function/module name')
  .option('--path <path>', 'Import path for the module being tested')
  .option('--methods <methods>', 'API methods (comma-separated)', 'GET,POST')
  .option('--async', 'Function is async')
  .option('--no-auth', 'API does not require authentication')
  .option('--no-validation', 'Skip input validation tests')
  .option('--database', 'Include database tests')
  .action(async (options) => {
    try {
      const methods = options.methods.split(',').map((m: string) => m.trim());

      const templateOptions = {
        componentName: options.name,
        functionName: options.name,
        moduleName: options.name,
        routeName: options.name,
        hookName: options.name,
        componentPath: options.path,
        functionPath: options.path,
        modulePath: options.path,
        routePath: options.path,
        hookPath: options.path,
        methods,
        isAsync: options.async,
        requiresAuth: options.auth !== false,
        hasValidation: options.validation !== false,
        testDatabase: options.database,
        hasProps: true,
        hasEvents: true,
        hasAsyncBehavior: options.async,
        hasAccessibility: true,
        hasStateManagement: true,
        hasEffects: true,
        hasCleanup: true,
        testAuthentication: true,
        testAuthorization: true,
        testInputValidation: options.validation !== false,
        testSqlInjection: options.database,
        testXss: true,
        testCsrf: true,
      };

      await generateTestFile(
        options.type,
        path.resolve(options.output),
        templateOptions,
        options.force
      );
    } catch (_error) {
      process.exit(1);
    }
  });

// Auto-generate tests command
program
  .command('auto')
  .description('Auto-generate tests for source files')
  .argument('<source>', 'Source file or directory')
  .option(
    '-e, --extensions <exts>',
    'File extensions to process',
    '.ts,.tsx,.js,.jsx'
  )
  .option(
    '--exclude <patterns>',
    'Exclude patterns',
    '*.test.*,*.spec.*,__tests__,node_modules'
  )
  .action(async (source, options) => {
    try {
      const sourcePath = path.resolve(source);
      const extensions = options.extensions.split(',');
      const exclude = options.exclude.split(',');

      await autoGenerateTestsForDirectory(sourcePath, {
        extensions,
        exclude,
      });
    } catch (_error) {
      process.exit(1);
    }
  });

// List templates command
program
  .command('list')
  .description('List available test templates')
  .action(() => {
    const templates = TestGenerator.listTemplates();

    process.stdout.write('\\nAvailable test templates:\\n\\n');

    for (const { key, template } of templates) {
      process.stdout.write(`  ${key.padEnd(15)} - ${template.description}\\n`);
    }

    process.stdout.write(
      '\\nUsage: generate-tests <type> <name> <path> [output]\\n'
    );
  });

// Interactive template command
program
  .command('interactive')
  .description('Interactive test generation wizard')
  .action(async () => {
    try {
      const { default: inquirer } = await import('inquirer');

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'What type of test would you like to generate?',
          choices: [
            { name: 'React Component Test', value: 'component' },
            { name: 'Utility Function Test', value: 'utility' },
            { name: 'API Route Test', value: 'api' },
            { name: 'React Hook Test', value: 'hook' },
            { name: 'Integration Test', value: 'integration' },
            { name: 'Security Test', value: 'security' },
          ],
        },
        {
          type: 'input',
          name: 'name',
          message: 'What is the name of the component/function/module?',
          validate: (input: string) => input.length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'path',
          message: 'What is the import path?',
          validate: (input: string) =>
            input.length > 0 || 'Import path is required',
        },
        {
          type: 'input',
          name: 'output',
          message: 'Where should the test file be created?',
          default: (answers: { name: string }) =>
            `__tests__/${answers.name}.test.ts`,
        },
        {
          type: 'confirm',
          name: 'async',
          message: 'Does this involve async operations?',
          default: false,
          when: (answers: { type: string }) =>
            ['utility', 'api', 'hook'].includes(answers.type),
        },
        {
          type: 'confirm',
          name: 'database',
          message: 'Does this involve database operations?',
          default: false,
          when: (answers: { type: string }) =>
            ['api', 'integration', 'security'].includes(answers.type),
        },
        {
          type: 'checkbox',
          name: 'methods',
          message: 'Which HTTP methods should be tested?',
          choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: ['GET', 'POST'],
          when: (answers: { type: string }) => answers.type === 'api',
        },
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Overwrite existing file if it exists?',
          default: false,
        },
      ]);

      const templateOptions = {
        componentName: answers.name,
        functionName: answers.name,
        moduleName: answers.name,
        routeName: answers.name,
        hookName: answers.name,
        componentPath: answers.path,
        functionPath: answers.path,
        modulePath: answers.path,
        routePath: answers.path,
        hookPath: answers.path,
        methods: answers.methods || ['GET'],
        isAsync: answers.async,
        requiresAuth: true,
        hasValidation: true,
        testDatabase: answers.database,
        hasProps: true,
        hasEvents: true,
        hasAsyncBehavior: answers.async,
        hasAccessibility: true,
        hasStateManagement: true,
        hasEffects: true,
        hasCleanup: true,
        testAuthentication: true,
        testAuthorization: true,
        testInputValidation: true,
        testSqlInjection: answers.database,
        testXss: true,
        testCsrf: true,
      };

      await generateTestFile(
        answers.type,
        path.resolve(answers.output),
        templateOptions,
        answers.overwrite
      );
    } catch (error) {
      if (error.message.includes('User force closed')) {
        process.exit(0);
      }
      process.exit(1);
    }
  });

// Batch generate command
program
  .command('batch')
  .description('Generate tests for multiple source files')
  .argument('<files...>', 'Source files')
  .option('-t, --type <type>', 'Force specific test type')
  .action(async (files, options) => {
    try {
      const resolvedFiles = files.map((file: string) => path.resolve(file));

      if (options.type) {
        // Generate with specific type for all files
        for (const file of resolvedFiles) {
          const name = path.basename(file, path.extname(file));
          const testPath = file.replace(FILE_EXTENSION_REGEX, '.test.$1');

          await generateTestFile(options.type, testPath, {
            componentName: name,
            functionName: name,
            moduleName: name,
            componentPath: file,
            functionPath: file,
            modulePath: file,
          });
        }
      } else {
        // Auto-detect type for each file
        await TestGenerator.batchGenerate(resolvedFiles);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

export { program };
