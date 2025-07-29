/**
 * SPDX-License-Identifier: MIT
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'cms',
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '.turbo/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/__tests__/**',
        '**/vitest.config.{ts,js}',
        // Exclude re-export files from coverage
        'index.ts',
        'keys.ts',
        'next-config.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
    typecheck: {
      enabled: true,
    },
    testTimeout: 5000,
  },
});
