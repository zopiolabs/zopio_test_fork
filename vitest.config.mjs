/**
 * SPDX-License-Identifier: MIT
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable coverage by default
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      reportsDirectory: './coverage',

      // Coverage thresholds
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        perFile: true,
      },

      // Files to exclude from coverage
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/test/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.stories.tsx',
        'packages/*/generated/**',
        'apps/*/generated/**',
        'packages/database/generated/**',
        'devapps/**',
        'websites/**',
        'e2e/**',
        'scripts/**',
        'registry/**',
      ],

      // Include all source files for coverage
      all: true,
      src: ['./apps', './packages'],
    },

    // Test environment
    environment: 'node',

    // Global test timeout
    testTimeout: 30000,

    // Disable threads for better coverage accuracy
    pool: 'forks',

    // Reporter configuration
    reporters: ['default'],

    // Watch mode exclusions
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.{git,cache,temp,tmp}/**',
    ],
  },

  // Resolve aliases for monorepo packages
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo': resolve(__dirname, './packages'),
    },
  },
});
