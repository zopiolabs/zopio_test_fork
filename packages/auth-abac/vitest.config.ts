/**
 * SPDX-License-Identifier: MIT
 */

import { createVitestConfig } from '@repo/testing/configs';

export default createVitestConfig('auth-abac', {
  test: {
    name: 'auth-abac',
    environment: 'node',
    setupFiles: ['@repo/testing/setup'],
  },
});
