/**
 * SPDX-License-Identifier: MIT
 */

import { createVitestConfig } from '@repo/testing/configs';

export default createVitestConfig('auth-runner', {
  test: {
    name: 'auth-runner',
    environment: 'node',
    setupFiles: ['@repo/testing/setup'],
  },
});
