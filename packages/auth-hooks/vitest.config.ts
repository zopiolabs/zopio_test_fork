/**
 * SPDX-License-Identifier: MIT
 */

import { createVitestConfig } from '@repo/testing/configs';

export default createVitestConfig('auth-hooks', {
  test: {
    name: 'auth-hooks',
    environment: 'jsdom',
    setupFiles: ['@repo/testing/setup'],
  },
});
