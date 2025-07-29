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
      reporter: ['text', 'lcov', 'html', 'json', 'json-summary', 'text-summary'],
      reportsDirectory: './coverage',

      // Coverage thresholds - differentiated by package type
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
        perFile: true,
        // Allow some packages to have lower thresholds temporarily
        allowExternalThreshold: true,
      },

      // Watermarks for coverage reporting colors
      watermarks: {
        statements: [70, 85],
        functions: [70, 85],
        branches: [70, 80],
        lines: [70, 85],
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
    reporters: ['default', 'json', 'html'],
    
    // Output JSON report for CI/CD
    outputFile: {
      json: './test-results.json',
      html: './test-results.html',
    },

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
