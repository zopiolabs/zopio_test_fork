/**
 * SPDX-License-Identifier: MIT
 */

import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock keys module
vi.mock('./keys', () => ({
  keys: vi.fn(() => ({
    KNOCK_SECRET_API_KEY: 'test_secret_key',
    NEXT_PUBLIC_KNOCK_API_KEY: 'test_public_key',
    NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: 'test_feed_channel',
  })),
}));

// Mock Knock React components with simple implementations
vi.mock('@knocklabs/react', () => {
  const React = require('react');

  return {
    KnockProvider: vi.fn(({ children }) => children),
    KnockFeedProvider: vi.fn(({ children }) => children),
    NotificationIconButton: React.forwardRef((props, ref) =>
      React.createElement(
        'button',
        {
          ...props,
          ref,
          'data-testid': 'notification-icon-button',
        },
        'Notifications'
      )
    ),
    NotificationFeedPopover: ({ isVisible, onClose }) =>
      isVisible
        ? React.createElement(
            'div',
            {
              'data-testid': 'notification-feed-popover',
              onClick: onClose,
            },
            'Feed Popover'
          )
        : null,
  };
});

// Mock Knock Node.js client
vi.mock('@knocklabs/node', () => ({
  Knock: vi.fn().mockImplementation(() => ({
    notify: vi.fn(),
    workflows: {
      trigger: vi.fn(),
    },
    users: {
      identify: vi.fn(),
      getPreferences: vi.fn(),
      setPreferences: vi.fn(),
    },
  })),
}));

// Mock CSS imports
vi.mock('@knocklabs/react/dist/index.css', () => ({}));
vi.mock('./styles.css', () => ({}));

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.KNOCK_SECRET_API_KEY = 'test_secret_key';
  process.env.NEXT_PUBLIC_KNOCK_API_KEY = 'test_public_key';
  process.env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID = 'test_feed_channel';
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  vi.resetAllMocks();
});
