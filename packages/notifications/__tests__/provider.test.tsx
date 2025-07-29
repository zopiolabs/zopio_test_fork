/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationsProvider } from '../components/provider';

// Keys are mocked in the setup file

describe('NotificationsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when API keys are available', () => {
    render(
      <NotificationsProvider userId="user123">
        <div data-testid="child-content">Test Content</div>
      </NotificationsProvider>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should render children directly when API keys are missing', () => {
    vi.doMock('../keys', () => ({
      keys: () => ({
        KNOCK_SECRET_API_KEY: 'test_secret_key',
        NEXT_PUBLIC_KNOCK_API_KEY: undefined,
        NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: 'test_feed_channel',
      }),
    }));

    render(
      <NotificationsProvider userId="user123">
        <div data-testid="child-content">Test Content</div>
      </NotificationsProvider>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should render children directly when feed channel ID is missing', () => {
    vi.doMock('../keys', () => ({
      keys: () => ({
        KNOCK_SECRET_API_KEY: 'test_secret_key',
        NEXT_PUBLIC_KNOCK_API_KEY: 'test_public_key',
        NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: undefined,
      }),
    }));

    render(
      <NotificationsProvider userId="user123">
        <div data-testid="child-content">Test Content</div>
      </NotificationsProvider>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should pass correct props to KnockProvider', () => {
    const { KnockProvider } = require('@knocklabs/react');
    
    render(
      <NotificationsProvider userId="user123">
        <div>Test Content</div>
      </NotificationsProvider>
    );

    expect(KnockProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test_public_key',
        userId: 'user123',
      }),
      expect.anything()
    );
  });

  it('should pass correct props to KnockFeedProvider', () => {
    const { KnockFeedProvider } = require('@knocklabs/react');
    
    render(
      <NotificationsProvider userId="user123">
        <div>Test Content</div>
      </NotificationsProvider>
    );

    expect(KnockFeedProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        feedId: 'test_feed_channel',
      }),
      expect.anything()
    );
  });

  it('should handle different user IDs', () => {
    const userIds = ['user123', 'admin456', 'test-user-789'];
    
    for (const userId of userIds) {
      const { KnockProvider } = require('@knocklabs/react');
      vi.clearAllMocks();
      
      render(
        <NotificationsProvider userId={userId}>
          <div>Test Content</div>
        </NotificationsProvider>
      );

      expect(KnockProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
        }),
        expect.anything()
      );
    }
  });

  it('should nest providers correctly', () => {
    const { KnockProvider, KnockFeedProvider } = require('@knocklabs/react');
    
    render(
      <NotificationsProvider userId="user123">
        <div data-testid="nested-content">Nested Content</div>
      </NotificationsProvider>
    );

    // Verify KnockProvider was called
    expect(KnockProvider).toHaveBeenCalled();
    
    // Verify KnockFeedProvider was called
    expect(KnockFeedProvider).toHaveBeenCalled();
    
    // Verify content is rendered
    expect(screen.getByTestId('nested-content')).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <NotificationsProvider userId="user123">
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <span data-testid="child3">Child 3</span>
      </NotificationsProvider>
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
    expect(screen.getByTestId('child3')).toBeInTheDocument();
  });

  it('should handle complex nested components', () => {
    const ComplexChild = () => (
      <div data-testid="complex-child">
        <header>Header</header>
        <main>Main Content</main>
        <footer>Footer</footer>
      </div>
    );

    render(
      <NotificationsProvider userId="user123">
        <ComplexChild />
      </NotificationsProvider>
    );

    expect(screen.getByTestId('complex-child')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('should work with React 19 compatibility', () => {
    // Test that the component renders without React 19 compatibility issues
    render(
      <NotificationsProvider userId="user123">
        <div data-testid="react19-test">React 19 Compatible</div>
      </NotificationsProvider>
    );

    expect(screen.getByTestId('react19-test')).toBeInTheDocument();
  });

  it('should handle empty configuration gracefully', () => {
    vi.doMock('../keys', () => ({
      keys: () => ({
        KNOCK_SECRET_API_KEY: '',
        NEXT_PUBLIC_KNOCK_API_KEY: '',
        NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: '',
      }),
    }));

    render(
      <NotificationsProvider userId="user123">
        <div data-testid="empty-config">Empty Config Test</div>
      </NotificationsProvider>
    );

    // Should render children directly when config is empty
    expect(screen.getByTestId('empty-config')).toBeInTheDocument();
  });
});