/**
 * SPDX-License-Identifier: MIT
 */

'use client';

import { fonts } from '@repo/design-system/lib/fonts';
import { Button } from '@repo/design-system/ui/button';
import { captureException } from '@sentry/nextjs';
import type NextError from 'next/error';
import { type FC, useEffect } from 'react';

type GlobalErrorProperties = {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
};

const GlobalError: FC<GlobalErrorProperties> = ({ error, reset }) => {
  useEffect(() => {
    try {
      captureException(error);
    } catch (sentryError) {
      // Sentry might fail, but we shouldn't break the error UI
      // Log the Sentry failure for debugging but don't throw
      // biome-ignore lint/suspicious/noConsole: Console logging is appropriate in global error handler for debugging
      console.error('Failed to capture exception with Sentry:', sentryError);
      // biome-ignore lint/suspicious/noConsole: Console logging is appropriate in global error handler for debugging
      console.error('Original error that failed to capture:', error);
    }
  }, [error]);

  return (
    <html lang="en" className={fonts}>
      <body>
        <h1>Oops, something went wrong</h1>
        <Button onClick={() => reset()}>Try again</Button>
      </body>
    </html>
  );
};

export default GlobalError;
