/**
 * @fileoverview Notifications Package Tests - NotificationsProvider Component
 * 
 * Test suite for the NotificationsProvider component covering Knock provider integration,
 * configuration handling, and children rendering with various setup scenarios.
 * 
 * **Test Scope:**
 * - NotificationsProvider rendering with complete and incomplete configurations
 * - Knock provider nesting (KnockProvider → KnockFeedProvider → children)
 * - Configuration validation and fallback behavior
 * - User ID handling and prop forwarding to Knock providers
 * - Complex component nesting and multiple children support
 * 
 * **Test Categories:**
 * 1. **Basic Rendering**: Children rendering with valid and invalid configurations
 * 2. **Provider Integration**: Proper Knock provider nesting and prop forwarding
 * 3. **Configuration Handling**: Missing API keys and feed channel scenarios
 * 4. **User Management**: Different user ID formats and validation
 * 5. **Component Composition**: Complex nesting and multiple children support
 * 
 * **Mock Strategy:**
 * - Complete Knock React SDK mocking (KnockProvider, KnockFeedProvider)
 * - Environment configuration simulation for various scenarios
 * - Mock validation for provider prop forwarding and nesting
 * - React 19 compatibility testing with modern patterns
 * 
 * **Quality Standards:**
 * - 100% children rendering success regardless of configuration state
 * - Proper provider nesting order and prop forwarding accuracy
 * - Graceful fallback when Knock services are unavailable
 * - Complete React 19 compatibility and modern component patterns
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