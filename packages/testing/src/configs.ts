/**
 * SPDX-License-Identifier: MIT
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Standardized Vitest configurations for different package types
 */

/**
 * Get coverage thresholds based on package type
 */
function getCoverageThresholds(packageType: string) {
  const thresholds = {
    utility: { lines: 90, branches: 85, functions: 90, statements: 90 },
    react: { lines: 85, branches: 80, functions: 85, statements: 85 },
    api: { lines: 80, branches: 75, functions: 80, statements: 80 },
    database: { lines: 75, branches: 70, functions: 75, statements: 75 },
    auth: { lines: 90, branches: 90, functions: 90, statements: 90 },
    integration: { lines: 70, branches: 65, functions: 70, statements: 70 },
    nextjs: { lines: 80, branches: 75, functions: 80, statements: 80 },
  };

  return (
    thresholds[packageType as keyof typeof thresholds] || {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    }
  );
}

/**
 * Helper function to create a vitest config for a specific package type
 */
export function createVitestConfig(
  packageType:
    | 'utility'
    | 'react'
    | 'api'
    | 'database'
    | 'auth'
    | 'integration'
    | 'nextjs',
  customConfig: Record<string, unknown> = {}
) {
  const baseConfig = {
    plugins: [react()],
    test: {
      environment:
        packageType === 'utility' ||
        packageType === 'api' ||
        packageType === 'database' ||
        packageType === 'integration'
          ? ('node' as const)
          : ('jsdom' as const),
      setupFiles: ['@repo/testing/setup'],
      globals: true,
      clearMocks: true,
      restoreMocks: true,
      unstubGlobals: true,
      unstubEnvs: true,
      coverage: {
        provider: 'v8' as const,
        reporter: [
          'text',
          'json',
          'html',
          'lcov',
          'json-summary',
          'text-summary',
        ],
        reportsDirectory: './coverage',
        exclude: [
          'node_modules/**',
          'dist/**',
          '.turbo/**',
          'coverage/**',
          '**/*.d.ts',
          '**/*.test.{ts,tsx,js,jsx}',
          '**/__tests__/**',
          '**/test-utils/**',
          '**/vitest.config.{ts,js}',
          '**/vite.config.{ts,js}',
        ],
        // Package-specific coverage thresholds
        thresholds: getCoverageThresholds(packageType),
        watermarks: {
          statements: [60, 80] as [number, number],
          functions: [60, 80] as [number, number],
          branches: [60, 75] as [number, number],
          lines: [60, 80] as [number, number],
        },
        all: true,
        skipFull: false,
      },
      typecheck: {
        enabled: true,
      },
      // Timeout adjustments based on package type
      testTimeout:
        packageType === 'database' || packageType === 'integration'
          ? 10000
          : 5000,

      // Output configuration for CI/CD
      outputFile: {
        json: './test-results.json',
        html: './test-results.html',
      },

      // Reporter configuration
      reporters: process.env.CI
        ? ['default', 'json', 'junit']
        : ['default', 'html'],

      // Performance monitoring
      logHeapUsage: true,
      slowTestThreshold: 1000,
    },
  };

  return defineConfig({
    ...baseConfig,
    ...customConfig,
    test: {
      ...baseConfig.test,
      ...(customConfig.test &&
      typeof customConfig.test === 'object' &&
      !Array.isArray(customConfig.test)
        ? (customConfig.test as Record<string, unknown>)
        : {}),
    },
  });
}

/**
 * Preset configurations that can be imported directly
 */
export const presets = {
  utility: () => createVitestConfig('utility'),
  react: () => createVitestConfig('react'),
  api: () => createVitestConfig('api'),
  database: () => createVitestConfig('database'),
  auth: () => createVitestConfig('auth'),
  integration: () => createVitestConfig('integration'),
  nextjs: () => createVitestConfig('nextjs'),
};
