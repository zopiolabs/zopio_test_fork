/**
 * SPDX-License-Identifier: MIT
 */

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export function renderWithUserEvents(ui: React.ReactElement, options?: any) {
  const user = userEvent.setup();
  const renderResult = render(ui, options);

  return {
    user,
    ...renderResult,
  };
}
