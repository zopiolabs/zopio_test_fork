/**
 * SPDX-License-Identifier: MIT
 */

import { type RenderOptions, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

export function renderWithUserEvents(
  ui: ReactElement,
  options?: RenderOptions
) {
  const user = userEvent.setup();
  const renderResult = render(ui, options);

  return {
    user,
    ...renderResult,
  };
}
