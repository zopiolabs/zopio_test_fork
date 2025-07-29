/**
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'seo',
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/__tests__/**',
        '**/vitest.config.{ts,js}',
        '**/test-setup.ts',
      ],
    },
  },
});
