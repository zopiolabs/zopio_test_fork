/**
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        'generated/**',
        'keys.ts', // Simple t3-env wrapper, covered by integration tests
        '**/*.d.ts',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/__tests__/**',
        '**/vitest.config.{ts,js}',
        '**/vitest.setup.{ts,js}',
      ],
    },
  },
});
