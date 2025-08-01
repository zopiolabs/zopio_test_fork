/**
 * SPDX-License-Identifier: MIT
 *
 * Type definitions for the Vitest testing environment.
 *
 * This file extends the global type definitions to include:
 * - Testing Library's jest-dom matcher types
 * - Vitest's global test functions
 * - Custom environment types for component testing
 *
 * These types enable proper TypeScript support for test files
 * and ensure type safety when using testing utilities.
 */

import '@testing-library/jest-dom';
import 'vitest/globals';

declare module 'vitest' {
  interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R;
    toHaveClass(className: string): R;
    toHaveTextContent(text: string | RegExp): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toHaveAttribute(name: string, value?: string): R;
    toHaveStyle(style: Record<string, unknown> | string): R;
    toHaveFocus(): R;
    toBeChecked(): R;
    toBePartiallyChecked(): R;
    toHaveValue(value: string | string[] | number): R;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    toBeRequired(): R;
    toBeInvalid(): R;
    toBeValid(): R;
    toHaveDescription(description?: string | RegExp): R;
    toHaveAccessibleName(name?: string | RegExp): R;
    toHaveAccessibleDescription(description?: string | RegExp): R;
    toHaveRole(role: string): R;
  }
}
