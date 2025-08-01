/**
 * SPDX-License-Identifier: MIT
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        'coverage/',
        'dist/',
        'build/',
      ],
    },
    // Add module name mapper for server-only
    alias: {
      'server-only': new URL(
        './__tests__/mocks/server-only.ts',
        import.meta.url
      ).pathname,
    },
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    },
  },
});
