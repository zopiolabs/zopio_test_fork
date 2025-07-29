/**
 * SPDX-License-Identifier: MIT
 */

import { createVitestConfig } from '@repo/testing/configs';

export default createVitestConfig('auth', {
  test: {
    name: 'auth',
    environment: 'jsdom',
    setupFiles: ['@repo/testing/setup'],
  },
});
