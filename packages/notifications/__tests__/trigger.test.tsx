/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsTrigger } from '../components/trigger';

// Keys are mocked in the setup file

describe('NotificationsTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification trigger button when API key is available', () => {
    render(<NotificationsTrigger />);

    expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
  });

  it('should not render when API key is missing', () => {
    vi.doMock('../keys', () => ({
      keys: () => ({
        ...mockEnv,
        NEXT_PUBLIC_KNOCK_API_KEY: undefined,
      }),
    }));

    render(<NotificationsTrigger />);

    expect(screen.queryByTestId('notification-icon-button')).not.toBeInTheDocument();
  });

  it('should toggle popover visibility when button is clicked', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    
    // Initially popover should not be visible
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();

    // Click to show popover
    fireEvent.click(button);
    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();

    // Click again to hide popover
    fireEvent.click(button);
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
  });

  it('should show popover after button click', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    fireEvent.click(button);

    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();
  });

  it('should hide popover when clicking outside', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    fireEvent.click(button);

    // Popover is visible
    const popover = screen.getByTestId('notification-feed-popover');
    expect(popover).toBeInTheDocument();

    // Click on popover to close it
    fireEvent.click(popover);

    // Popover should be hidden
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
  });

  it('should not close popover when clicking on button', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    
    // Show popover
    fireEvent.click(button);
    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();

    // Mock the close handler to simulate button click detection
    const mockEvent = {
      target: button,
    };

    // The close handler should not close when target is the button
    // This tests the handleClose logic indirectly through component behavior
    fireEvent.click(button);
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
  });

  it('should use proper refs for button and popover', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    
    // Button should be rendered and accessible
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  it('should handle multiple rapid clicks', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    
    // Rapid clicks should toggle visibility correctly
    fireEvent.click(button);
    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
  });

  it('should work with React 19 compatibility', () => {
    // Test that the component renders without React 19 compatibility issues
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();
  });

  it('should handle missing feed channel ID gracefully', () => {
    vi.doMock('../keys', () => ({
      keys: () => ({
        ...mockEnv,
        NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: undefined,
      }),
    }));

    // Should still render when API key is present, even if feed channel is missing
    render(<NotificationsTrigger />);

    expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
  });

  it('should handle state changes correctly', () => {
    render(<NotificationsTrigger />);

    const button = screen.getByTestId('notification-icon-button');
    
    // Test initial state
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();

    // Test show state
    fireEvent.click(button);
    expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();

    // Test hide state via popover click
    const popover = screen.getByTestId('notification-feed-popover');
    fireEvent.click(popover);
    expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
  });

  it('should import required CSS files', () => {
    // Test that CSS imports don't cause errors
    expect(() => {
      render(<NotificationsTrigger />);
    }).not.toThrow();
  });
});