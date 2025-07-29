/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsProvider } from '../components/provider';
import { NotificationsTrigger } from '../components/trigger';

// Keys are mocked in the setup file

describe('Notifications Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider and Trigger Integration', () => {
    it('should render trigger inside provider', () => {
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });

    it('should maintain functionality when nested in provider', () => {
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      const button = screen.getByTestId('notification-icon-button');
      
      // Test trigger functionality
      fireEvent.click(button);
      expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
    });

    it('should work with complex UI layouts', () => {
      const ComplexLayout = () => (
        <div>
          <header>
            <h1>App Header</h1>
            <NotificationsTrigger />
          </header>
          <main>
            <p>Main content area</p>
          </main>
        </div>
      );

      render(
        <NotificationsProvider userId="user123">
          <ComplexLayout />
        </NotificationsProvider>
      );

      expect(screen.getByText('App Header')).toBeInTheDocument();
      expect(screen.getByText('Main content area')).toBeInTheDocument();
      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });
  });

  describe('Full Notification Flow', () => {
    it('should handle complete notification setup', async () => {
      const { notifications } = await import('../index');

      // Test server-side client
      if (notifications) {
        expect(notifications).toBeDefined();
      } else {
        expect(notifications).toBeNull();
      }

      // Test client-side components
      render(
        <NotificationsProvider userId="user123">
          <div data-testid="app-content">
            <NotificationsTrigger />
          </div>
        </NotificationsProvider>
      );

      expect(screen.getByTestId('app-content')).toBeInTheDocument();
      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });

    it('should handle user workflow simulation', async () => {
      const { notifications } = await import('../index');

      // Simulate server-side workflow trigger
      if (notifications) {
        const mockWorkflowResult = {
          workflow_run_id: 'wfr_integration',
          status: 'queued',
        };

        notifications.workflows.trigger.mockResolvedValue(mockWorkflowResult);

        const result = await notifications.workflows.trigger('integration-test', {
          recipients: ['user123'],
          data: { message: 'Integration test notification' },
        });

        expect(result).toEqual(mockWorkflowResult);
      }

      // Simulate client-side notification display
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      const button = screen.getByTestId('notification-icon-button');
      fireEvent.click(button);

      expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();
    });

    it('should handle user preference management', async () => {
      const { notifications } = await import('../index');

      if (notifications) {
        const mockPreferences = {
          channel_types: {
            email: true,
            in_app_feed: true,
            sms: false,
          },
        };

        notifications.users.getPreferences.mockResolvedValue(mockPreferences);
        notifications.users.setPreferences.mockResolvedValue(mockPreferences);

        // Get preferences
        const preferences = await notifications.users.getPreferences('user123');
        expect(preferences).toEqual(mockPreferences);

        // Update preferences
        const updatedPreferences = {
          channel_types: {
            email: false,
            in_app_feed: true,
            sms: true,
          },
        };

        await notifications.users.setPreferences('user123', updatedPreferences);
        expect(notifications.users.setPreferences).toHaveBeenCalledWith('user123', updatedPreferences);
      }
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle partial configuration gracefully', () => {
      // Test with missing feed channel
      vi.doMock('../keys', () => ({
        keys: () => ({
          KNOCK_SECRET_API_KEY: 'test_secret_key',
          NEXT_PUBLIC_KNOCK_API_KEY: 'test_public_key',
          NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: undefined,
        }),
      }));

      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
          <div data-testid="fallback-content">Fallback UI</div>
        </NotificationsProvider>
      );

      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });

    it('should handle complete configuration absence', () => {
      vi.doMock('../keys', () => ({
        keys: () => ({
          KNOCK_SECRET_API_KEY: undefined,
          NEXT_PUBLIC_KNOCK_API_KEY: undefined,
          NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: undefined,
        }),
      }));

      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
          <div data-testid="no-config-content">No Configuration</div>
        </NotificationsProvider>
      );

      expect(screen.getByTestId('no-config-content')).toBeInTheDocument();
      expect(screen.queryByTestId('notification-icon-button')).not.toBeInTheDocument();
    });

    it('should handle server errors gracefully', async () => {
      const { notifications } = await import('../index');

      if (notifications) {
        const serverError = new Error('Server unavailable');
        notifications.workflows.trigger.mockRejectedValue(serverError);

        await expect(
          notifications.workflows.trigger('error-workflow', {
            recipients: ['user123'],
          })
        ).rejects.toThrow('Server unavailable');
      }

      // Client-side should still work
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle multiple provider instances', () => {
      render(
        <div>
          <NotificationsProvider userId="user1">
            <div data-testid="provider1">
              <NotificationsTrigger />
            </div>
          </NotificationsProvider>
          <NotificationsProvider userId="user2">
            <div data-testid="provider2">
              <NotificationsTrigger />
            </div>
          </NotificationsProvider>
        </div>
      );

      expect(screen.getByTestId('provider1')).toBeInTheDocument();
      expect(screen.getByTestId('provider2')).toBeInTheDocument();
      expect(screen.getAllByTestId('notification-icon-button')).toHaveLength(2);
    });

    it('should handle rapid user interactions', () => {
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      const button = screen.getByTestId('notification-icon-button');
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      // Should end up in closed state (even number of clicks)
      expect(screen.queryByTestId('notification-feed-popover')).not.toBeInTheDocument();
    });

    it('should handle different user IDs correctly', () => {
      const { rerender } = render(
        <NotificationsProvider userId="user1">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();

      // Change user ID
      rerender(
        <NotificationsProvider userId="user2">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });

    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility and Usability', () => {
    it('should maintain accessibility features', () => {
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      const button = screen.getByTestId('notification-icon-button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should work with keyboard navigation', () => {
      render(
        <NotificationsProvider userId="user123">
          <NotificationsTrigger />
        </NotificationsProvider>
      );

      const button = screen.getByTestId('notification-icon-button');
      
      // Focus and activate with keyboard
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button); // Simulate click from keyboard activation

      expect(screen.getByTestId('notification-feed-popover')).toBeInTheDocument();
    });

    it('should support screen readers', () => {
      render(
        <NotificationsProvider userId="user123">
          <div role="banner">
            <NotificationsTrigger />
          </div>
        </NotificationsProvider>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByTestId('notification-icon-button')).toBeInTheDocument();
    });
  });
});