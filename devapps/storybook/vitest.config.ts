/**
 * SPDX-License-Identifier: MIT
 *
 * Vitest configuration for the Storybook devapp.
 *
 * This configuration sets up testing for the Storybook component library explorer,
 * including:
 * - React component testing environment with jsdom
 * - Path aliases for internal packages and local imports
 * - Comprehensive test coverage configuration
 * - Story file inclusion patterns for testing
 * - Coverage thresholds aligned with project quality standards
 *
 * The setup file handles browser API mocks and testing library extensions
 * necessary for component testing in a Node.js environment.
 */

import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Local aliases for storybook internal imports
      '@': resolve(__dirname, './'),
      // Repository package aliases for shared modules
      '@repo': resolve(__dirname, '../../packages'),
    },
  },
  test: {
    // Test suite name for identification in monorepo context
    name: 'storybook',
    // Use jsdom environment for React component testing
    environment: 'jsdom',
    // Setup file for test environment configuration
    setupFiles: ['./vitest.setup.ts'],
    // Enable global test functions (describe, it, expect, etc.)
    globals: true,
    // Coverage configuration for code quality reporting
    coverage: {
      // Use V8 coverage provider for accurate reporting
      provider: 'v8',
      // Multiple reporter formats for different use cases
      reporter: ['text', 'json', 'html', 'lcov'],
      // Coverage reports output directory
      reportsDirectory: './coverage',
      // Include story files for coverage analysis
      include: ['stories/**/*.tsx'],
      // Exclude non-testable files from coverage
      exclude: [
        '**/*.stories.tsx', // Story definition files
        '**/*.d.ts', // TypeScript declaration files
        'node_modules/**', // External dependencies
      ],
      // Coverage thresholds aligned with project quality standards
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
      },
    },
    // Test file patterns to include
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // Directories and files to exclude from testing
    exclude: ['node_modules', 'dist', '.turbo'],
  },
});
