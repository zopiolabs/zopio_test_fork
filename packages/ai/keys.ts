/**
 * SPDX-License-Identifier: MIT
 */

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () => {
  // In test environment, allow direct access to process.env
  if (process.env.NODE_ENV === 'test') {
    return {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
  }

  return createEnv({
    server: {
      OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
    },
    runtimeEnv: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  });
};
