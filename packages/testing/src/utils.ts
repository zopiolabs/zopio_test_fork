/**
 * SPDX-License-Identifier: MIT
 */

import { type RenderOptions, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { vi } from 'vitest';

// Import React types conditionally to avoid build errors when React is not available
type ReactElement = React.ReactElement;
type ReactNode = React.ReactNode;

/**
 * Test utilities for React components and DOM testing
 */

/**
 * Enhanced render function with user event setup
 */
export function renderWithUserEvents(
  ui: ReactElement,
  options?: RenderOptions
): ReturnType<typeof render> & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  const renderResult = render(ui, options);

  return {
    user,
    ...renderResult,
  };
}

/**
 * Wrapper component for providers in tests
 */
export interface TestWrapperProps {
  children: ReactNode;
}

export function createTestWrapper(
  providers: React.ComponentType<{ children: ReactNode }>[] = []
) {
  return function TestWrapper({ children }: TestWrapperProps) {
    return providers.reduce(
      (
        acc: ReactElement,
        Provider: React.ComponentType<{ children: ReactNode }>
      ) => ({
        type: Provider,
        props: { children: acc },
      }),
      children as ReactElement
    );
  };
}

/**
 * Custom render function with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & {
    providers?: React.ComponentType<{ children: ReactNode }>[];
  }
): ReturnType<typeof render> & { user: ReturnType<typeof userEvent.setup> } {
  const { providers = [], ...renderOptions } = options || {};
  const Wrapper = createTestWrapper(providers);
  const user = userEvent.setup();

  const renderResult = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return {
    user,
    ...renderResult,
  };
}

/**
 * Utility to wait for async operations in tests
 */
export async function waitForAsyncOperation(
  operation: () => Promise<void> | void,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Async operation timed out after ${timeout}ms`));
    }, timeout);

    Promise.resolve(operation())
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console };

  const consoleMocks = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  // Replace console methods
  Object.assign(console, consoleMocks);

  return {
    mocks: consoleMocks,
    restore: () => {
      Object.assign(console, originalConsole);
    },
  };
}

/**
 * Mock environment variables for testing
 */
export function mockEnv(envVars: Record<string, string>) {
  const originalEnv = { ...process.env };

  // Set new environment variables
  Object.assign(process.env, envVars);

  return {
    restore: () => {
      process.env = originalEnv;
    },
  };
}

/**
 * Create a mock function with typed return value
 */
export function createMockFn<TArgs extends unknown[], TReturn>(
  implementation?: (...args: TArgs) => TReturn
) {
  return vi.fn(implementation);
}

/**
 * Create a spy on an object method
 */
export function createSpy<T extends object, K extends keyof T>(
  object: T,
  method: K
) {
  return vi.spyOn(object as T, method as K);
}

/**
 * Test data generation utilities
 */
export const testUtils = {
  /**
   * Generate a random string
   */
  randomString: (length = 10): string => {
    return Math.random()
      .toString(36)
      .substring(2, length + 2);
  },

  /**
   * Generate a random email
   */
  randomEmail: (): string => {
    return `test-${testUtils.randomString(5)}@example.com`;
  },

  /**
   * Generate a random UUID (simple version for testing)
   */
  randomUuid: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Generate a random date within a range
   */
  randomDate: (start = new Date(2020, 0, 1), end = new Date()): Date => {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  },

  /**
   * Generate a random number within a range
   */
  randomNumber: (min = 0, max = 100): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Pick a random item from an array
   */
  randomPick: <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
  },
};

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value should be defined'
): asserts value is T {
  if (value == null) {
    throw new Error(message);
  }
}

/**
 * Sleep utility for tests that need to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve as (value: T | PromiseLike<T>) => void,
    reject: reject as (reason?: unknown) => void,
  };
}
