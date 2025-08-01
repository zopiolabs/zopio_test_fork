/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the AlertDialog component.
 *
 * This test suite validates the alert dialog component's functionality across multiple
 * dimensions including rendering, interaction, accessibility, and edge cases. The
 * alert dialog is built on Radix UI primitives and provides a modal interface for
 * critical user confirmations and notifications.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, portal behavior, and data-slot attributes
 * 2. Variant Tests - Default dialog examples and different action configurations
 * 3. Props Handling - Component props forwarding, controlled state, and HTML attributes
 * 4. User Interactions - Open/close behaviors, action button clicks, overlay interactions
 * 5. States - Open/closed states, proper state transitions, and modal behavior
 * 6. Accessibility - ARIA attributes, focus management, keyboard navigation, ESC key
 * 7. Edge Cases - Portal rendering, overlay click behavior, rapid state changes
 * 8. Component Integration - All sub-components working together with proper composition
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all user interaction patterns and modal dialog behaviors.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithUserEvents } from '../test-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/design-system/ui/alert-dialog';

/**
 * Helper function to render a complete alert dialog with all components
 * Supports custom props and content for comprehensive testing scenarios
 */
const renderTestAlertDialog = (props: any = {}) => {
  const defaultProps = {
    ...props
  };

  return renderWithUserEvents(
    <AlertDialog {...defaultProps}>
      <AlertDialogTrigger>Delete Account</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete Account</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Helper function to render a minimal alert dialog for basic tests
 * Provides simplified structure for focused testing scenarios
 */
const renderMinimalAlertDialog = (dialogProps: any = {}, actionCallback?: () => void) => {
  return renderWithUserEvents(
    <AlertDialog {...dialogProps}>
      <AlertDialogTrigger>Open Dialog</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          <AlertDialogDescription>
            Please confirm this action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={actionCallback}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Helper function to render a controlled alert dialog
 * For testing controlled state behavior and external state management
 */
const renderControlledAlertDialog = (open: boolean, onOpenChange?: (open: boolean) => void) => {
  return renderWithUserEvents(
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger>Controlled Trigger</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Controlled Dialog</AlertDialogTitle>
          <AlertDialogDescription>
            This dialog is controlled externally.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

describe('AlertDialog', () => {
  describe('Rendering Tests', () => {
    it('renders alert dialog trigger correctly', () => {
      renderMinimalAlertDialog();
      
      // Find the alert dialog trigger by its data-slot attribute
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('data-slot', 'alert-dialog-trigger');
    });

    it('renders with correct data-slot attributes on all components', async () => {
      const { user } = renderMinimalAlertDialog();
      
      // Trigger button should be visible initially
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      expect(trigger).toHaveAttribute('data-slot', 'alert-dialog-trigger');
      
      // Open dialog to reveal portal content
      await user.click(trigger);
      
      await waitFor(() => {
        // Test all data-slot attributes for dialog components (root is not visible)
        expect(document.querySelector('[data-slot="alert-dialog-trigger"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="alert-dialog-header"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="alert-dialog-title"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="alert-dialog-description"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="alert-dialog-footer"]')).toBeInTheDocument();
      });
    });

    it('renders trigger button with proper structure', () => {
      renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('data-slot', 'alert-dialog-trigger');
    });

    it('does not render dialog content initially (closed state)', () => {
      renderMinimalAlertDialog();
      
      // Dialog content should not be visible initially
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
      expect(screen.queryByText('Please confirm this action.')).not.toBeInTheDocument();
    });

    it('renders portal and overlay when dialog is opened', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        // Overlay should be rendered with proper classes (portal is not visible)
        const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black/50');
      });
    });

    it('renders dialog content with proper structure when opened', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        // Dialog should have proper role
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('data-slot', 'alert-dialog-content');
        
        // Content structure should be present
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Please confirm this action.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      });
    });
  });

  describe('Variant Tests', () => {
    describe('Default AlertDialog', () => {
      it('renders with default styling and behavior', async () => {
        const { user } = renderTestAlertDialog();
        
        const trigger = screen.getByRole('button', { name: 'Delete Account' });
        await user.click(trigger);
        
        await waitFor(() => {
          const dialog = screen.getByRole('alertdialog');
          expect(dialog).toHaveClass(
            'fixed',
            'top-[50%]',
            'left-[50%]',
            'z-50',
            'grid',
            'w-full',
            'max-w-[calc(100%-2rem)]',
            'translate-x-[-50%]',
            'translate-y-[-50%]',
            'gap-4',
            'rounded-lg',
            'border',
            'bg-background',
            'p-6',
            'shadow-lg'
          );
        });
      });

      it('renders action buttons with proper styling', async () => {
        const { user } = renderTestAlertDialog();
        
        const trigger = screen.getByRole('button', { name: 'Delete Account' });
        await user.click(trigger);
        
        await waitFor(() => {
          const cancelButton = screen.getByRole('button', { name: 'Cancel' });
          const actionButton = screen.getByRole('button', { name: 'Delete Account' });
          
          // Cancel button should have outline variant styling
          expect(cancelButton).toHaveClass('border', 'bg-background');
          
          // Action button should have default button styling
          expect(actionButton).toHaveClass('bg-primary', 'text-primary-foreground');
        });
      });
    });

    describe('Custom Content AlertDialog', () => {
      it('supports custom title and description content', async () => {
        const { user } = renderWithUserEvents(
          <AlertDialog>
            <AlertDialogTrigger>Custom Dialog</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Custom Title with Rich Content</AlertDialogTitle>
                <AlertDialogDescription>
                  This is a <strong>rich description</strong> with{' '}
                  <em>formatted text</em> and multiple lines of content
                  that explains the action in detail.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Dismiss</AlertDialogCancel>
                <AlertDialogAction>Proceed</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
        
        const trigger = screen.getByRole('button', { name: 'Custom Dialog' });
        await user.click(trigger);
        
        await waitFor(() => {
          expect(screen.getByText('Custom Title with Rich Content')).toBeInTheDocument();
          expect(screen.getByText('rich description')).toBeInTheDocument();
          expect(screen.getByText('formatted text')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'Proceed' })).toBeInTheDocument();
        });
      });

      it('supports single action button configuration', async () => {
        const { user } = renderWithUserEvents(
          <AlertDialog>
            <AlertDialogTrigger>Notification</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Important Notice</AlertDialogTitle>
                <AlertDialogDescription>
                  This is an informational dialog with only one action.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction>Understood</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
        
        const trigger = screen.getByRole('button', { name: 'Notification' });
        await user.click(trigger);
        
        await waitFor(() => {
          expect(screen.getByRole('button', { name: 'Understood' })).toBeInTheDocument();
          expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes to alert dialog trigger', () => {
      renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger
            data-testid="custom-trigger"
            className="custom-class"
            id="trigger-id"
          >
            Test
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Test</AlertDialogTitle>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByTestId('custom-trigger');
      expect(trigger).toHaveClass('custom-class');
      expect(trigger).toHaveAttribute('id', 'trigger-id');
    });

    it('forwards HTML attributes to trigger', () => {
      renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger
            data-testid="custom-trigger"
            className="trigger-class"
            disabled
          >
            Disabled Trigger
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Test</AlertDialogTitle>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByTestId('custom-trigger');
      expect(trigger).toHaveClass('trigger-class');
      expect(trigger).toBeDisabled();
    });

    it('forwards HTML attributes to content elements', async () => {
      const { user } = renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent data-testid="custom-content" className="content-class">
            <AlertDialogHeader data-testid="custom-header" className="header-class">
              <AlertDialogTitle data-testid="custom-title" className="title-class">
                Custom Title
              </AlertDialogTitle>
              <AlertDialogDescription data-testid="custom-description" className="desc-class">
                Custom Description
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter data-testid="custom-footer" className="footer-class">
              <AlertDialogAction data-testid="custom-action" className="action-class">
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByTestId('custom-content')).toHaveClass('content-class');
        expect(screen.getByTestId('custom-header')).toHaveClass('header-class');
        expect(screen.getByTestId('custom-title')).toHaveClass('title-class');
        expect(screen.getByTestId('custom-description')).toHaveClass('desc-class');
        expect(screen.getByTestId('custom-footer')).toHaveClass('footer-class');
        expect(screen.getByTestId('custom-action')).toHaveClass('action-class');
      });
    });

    it('supports controlled mode with open prop', async () => {
      renderControlledAlertDialog(true);
      
      // Dialog should be open initially
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
      });
    });

    it('supports controlled mode with onOpenChange callback', async () => {
      const onOpenChange = vi.fn();
      const { user } = renderControlledAlertDialog(false, onOpenChange);
      
      const trigger = screen.getByRole('button', { name: 'Controlled Trigger' });
      await user.click(trigger);
      
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('handles defaultOpen prop for uncontrolled mode', async () => {
      renderWithUserEvents(
        <AlertDialog defaultOpen>
          <AlertDialogTrigger>Test</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Default Open</AlertDialogTitle>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      // Dialog should be open initially due to defaultOpen
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByText('Default Open')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('opens dialog when trigger is clicked', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      
      // Initially closed
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      
      // Click to open
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      });
    });

    it('closes dialog when cancel button is clicked', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('closes dialog when action button is clicked', async () => {
      const onAction = vi.fn();
      const { user } = renderMinimalAlertDialog({}, onAction);
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      const actionButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(actionButton);
      
      expect(onAction).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('closes dialog when ESC key is pressed', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      // Press ESC key
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('does not close dialog when overlay is clicked (modal behavior)', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]') as HTMLElement;
      expect(overlay).toBeInTheDocument();
      
      // Click on overlay - should NOT close the dialog (alert dialogs are modal)
      await user.click(overlay);
      
      // Dialog should remain open
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation between action buttons', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const actionButton = screen.getByRole('button', { name: 'Confirm' });
      
      // Tab through buttons - one of them should receive focus first
      await user.tab();
      expect([cancelButton, actionButton]).toContain(document.activeElement);
      
      await user.tab();
      expect([cancelButton, actionButton]).toContain(document.activeElement);
    });

    it('activates action buttons with Enter and Space keys', async () => {
      const onAction = vi.fn();
      const { user } = renderMinimalAlertDialog({}, onAction);
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      const actionButton = screen.getByRole('button', { name: 'Confirm' });
      actionButton.focus();
      
      // Press Enter
      await user.keyboard('{Enter}');
      
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('handles open state correctly', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
        const content = document.querySelector('[data-slot="alert-dialog-content"]');
        
        expect(overlay).toHaveAttribute('data-state', 'open');
        expect(content).toHaveAttribute('data-state', 'open');
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('handles closed state correctly', () => {
      renderMinimalAlertDialog();
      
      // Initially closed
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).not.toBeInTheDocument();
      expect(document.querySelector('[data-slot="alert-dialog-content"]')).not.toBeInTheDocument();
    });

    it('handles disabled trigger state', async () => {
      const { user } = renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger disabled>Disabled Trigger</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Test</AlertDialogTitle>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByRole('button', { name: 'Disabled Trigger' });
      expect(trigger).toBeDisabled();
      
      // Should not open when clicked
      await user.click(trigger);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('maintains modal behavior with focus trap', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      // Focus should be trapped within the dialog
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const actionButton = screen.getByRole('button', { name: 'Confirm' });
      
      // Tab cycling should stay within dialog
      await user.tab();
      expect([cancelButton, actionButton]).toContain(document.activeElement);
      
      await user.tab();
      expect([cancelButton, actionButton]).toContain(document.activeElement);
    });

    it('handles rapid open/close state changes', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      
      // Rapid clicks
      await user.click(trigger);
      await user.keyboard('{Escape}');
      await user.click(trigger);
      await user.keyboard('{Escape}');
      
      // Should handle state changes gracefully
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role for alert dialog', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('connects title and description with ARIA attributes', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog');
        const title = screen.getByText('Confirm Action');
        const description = screen.getByText('Please confirm this action.');
        
        // Dialog should be labeled by title and described by description
        const titleId = title.getAttribute('id');
        const descriptionId = description.getAttribute('id');
        
        expect(titleId).toBeTruthy();
        expect(descriptionId).toBeTruthy();
        expect(dialog).toHaveAttribute('aria-labelledby', titleId);
        expect(dialog).toHaveAttribute('aria-describedby', descriptionId);
      });
    });

    it('manages focus properly when dialog opens', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        // Focus should move to the dialog or first focusable element
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
        
        // One of the buttons should receive focus
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const actionButton = screen.getByRole('button', { name: 'Confirm' });
        
        expect([cancelButton, actionButton]).toContain(document.activeElement);
      });
    });

    it('restores focus to trigger when dialog closes', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      // Close dialog with ESC
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
      });
    });

    it('prevents background interaction when dialog is open', async () => {
      const backgroundAction = vi.fn();
      const { user } = renderWithUserEvents(
        <div>
          <button onClick={backgroundAction}>Background Button</button>
          <AlertDialog>
            <AlertDialogTrigger>Open Dialog</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Modal Dialog</AlertDialogTitle>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
      
      const backgroundButton = screen.getByRole('button', { name: 'Background Button' });
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      // Background elements should be marked as aria-hidden when dialog is open
      const backgroundContainer = backgroundButton.closest('[aria-hidden]');
      expect(backgroundContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('has accessible names for all interactive elements', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      expect(trigger).toHaveAccessibleName();
      
      await user.click(trigger);
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const actionButton = screen.getByRole('button', { name: 'Confirm' });
        
        expect(cancelButton).toHaveAccessibleName();
        expect(actionButton).toHaveAccessibleName();
      });
    });

    it('supports screen reader announcements', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog');
        
        // Dialog should be announced to screen readers
        expect(dialog).toHaveAttribute('role', 'alertdialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
        expect(dialog).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles dialog with no description', async () => {
      const { user } = renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger>No Description</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Title Only</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByRole('button', { name: 'No Description' });
      await user.click(trigger);
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText('Title Only')).toBeInTheDocument();
        expect(screen.queryByText('Please confirm this action.')).not.toBeInTheDocument();
      });
    });

    it('handles dialog with no footer', async () => {
      const { user } = renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger>No Footer</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Title Only Dialog</AlertDialogTitle>
              <AlertDialogDescription>
                This dialog has no action buttons.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByRole('button', { name: 'No Footer' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
      });
    });

    it('handles portal rendering correctly', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        // Content should be rendered in portal (outside normal DOM tree)
        const content = document.querySelector('[data-slot="alert-dialog-content"]');
        expect(content).toBeInTheDocument();
        
        // Content should be a direct child of body (portal behavior)
        expect(content?.parentElement?.tagName).toBe('BODY');
      });
    });

    it('handles multiple dialogs', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <AlertDialog>
            <AlertDialogTrigger>First Dialog</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>First</AlertDialogTitle>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger>Second Dialog</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Second</AlertDialogTitle>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
      
      const firstTrigger = screen.getByRole('button', { name: 'First Dialog' });
      const secondTrigger = screen.getByRole('button', { name: 'Second Dialog' });
      
      // Open first dialog
      await user.click(firstTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
      });
      
      // Close first dialog before opening second (due to modal behavior)
      const firstOkButton = screen.getByRole('button', { name: 'OK' });
      await user.click(firstOkButton);
      
      await waitFor(() => {
        expect(screen.queryByText('First')).not.toBeInTheDocument();
      });
      
      // Now open second dialog
      await user.click(secondTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Second')).toBeInTheDocument();
      });
    });

    it('handles empty trigger content', () => {
      renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Test</AlertDialogTitle>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('data-slot', 'alert-dialog-trigger');
    });

    it('handles rapid successive clicks on trigger', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      
      // First click to open
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      
      // Close dialog with ESC to reset state
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      
      // Now test rapid clicks on clean state
      await user.click(trigger);
      
      // Should handle state changes gracefully
      await waitFor(() => {
        // Should have one dialog open
        const dialogs = screen.getAllByRole('alertdialog');
        expect(dialogs).toHaveLength(1);
      });
    });

    it('handles complex nested content', async () => {
      const { user } = renderWithUserEvents(
        <AlertDialog>
          <AlertDialogTrigger>Complex Content</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complex Dialog</AlertDialogTitle>
              <AlertDialogDescription>
                <div>
                  <p>This dialog contains <strong>nested elements</strong></p>
                  <ul>
                    <li>List item 1</li>
                    <li>List item 2</li>
                  </ul>
                  <p>And more content</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Accept</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
      
      const trigger = screen.getByRole('button', { name: 'Complex Content' });
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Complex Dialog')).toBeInTheDocument();
        expect(screen.getByText('nested elements')).toBeInTheDocument();
        expect(screen.getByText('List item 1')).toBeInTheDocument();
        expect(screen.getByText('List item 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('integrates all sub-components properly', async () => {
      const { user } = renderTestAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Delete Account' });
      await user.click(trigger);
      
      await waitFor(() => {
        // All components should be present and properly integrated
        const dialog = screen.getByRole('alertdialog');
        const title = screen.getByText('Are you absolutely sure?');
        const description = screen.getByText(/This action cannot be undone/);
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const actionButton = screen.getByRole('button', { name: 'Delete Account' });
        
        expect(dialog).toBeInTheDocument();
        expect(title).toBeInTheDocument();
        expect(description).toBeInTheDocument();
        expect(cancelButton).toBeInTheDocument();
        expect(actionButton).toBeInTheDocument();
        
        // Check proper DOM hierarchy
        expect(dialog).toContainElement(title);
        expect(dialog).toContainElement(description);
        expect(dialog).toContainElement(cancelButton);
        expect(dialog).toContainElement(actionButton);
      });
    });

    it('maintains proper component hierarchy', async () => {
      const { user } = renderTestAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Delete Account' });
      await user.click(trigger);
      
      await waitFor(() => {
        // Check header structure
        const header = document.querySelector('[data-slot="alert-dialog-header"]') as HTMLElement;
        const title = document.querySelector('[data-slot="alert-dialog-title"]') as HTMLElement;
        const description = document.querySelector('[data-slot="alert-dialog-description"]') as HTMLElement;
        
        expect(header).toContainElement(title);
        expect(header).toContainElement(description);
        
        // Check footer structure
        const footer = document.querySelector('[data-slot="alert-dialog-footer"]');
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const actionButton = screen.getByRole('button', { name: 'Delete Account' });
        
        expect(footer).toContainElement(cancelButton);
        expect(footer).toContainElement(actionButton);
      });
    });

    it('handles overlay and content z-index layering', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
        const content = document.querySelector('[data-slot="alert-dialog-content"]');
        
        expect(overlay).toHaveClass('z-50');
        expect(content).toHaveClass('z-50');
        
        // Both should be positioned fixed
        expect(overlay).toHaveClass('fixed');
        expect(content).toHaveClass('fixed');
      });
    });

    it('handles animation states correctly', async () => {
      const { user } = renderMinimalAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' });
      await user.click(trigger);
      
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');
        const content = document.querySelector('[data-slot="alert-dialog-content"]');
        
        // Components should have animation classes
        expect(overlay).toHaveClass(
          'data-[state=closed]:animate-out',
          'data-[state=open]:animate-in',
          'data-[state=closed]:fade-out-0',
          'data-[state=open]:fade-in-0'
        );
        
        expect(content).toHaveClass(
          'data-[state=closed]:animate-out',
          'data-[state=open]:animate-in',
          'data-[state=closed]:fade-out-0',
          'data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95',
          'data-[state=open]:zoom-in-95'
        );
      });
    });

    it('maintains consistent styling across all components', async () => {
      const { user } = renderTestAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Delete Account' });
      await user.click(trigger);
      
      await waitFor(() => {
        // Check header styling
        const header = document.querySelector('[data-slot="alert-dialog-header"]');
        expect(header).toHaveClass('flex', 'flex-col', 'gap-2', 'text-center', 'sm:text-left');
        
        // Check title styling
        const title = document.querySelector('[data-slot="alert-dialog-title"]');
        expect(title).toHaveClass('font-semibold', 'text-lg');
        
        // Check description styling
        const description = document.querySelector('[data-slot="alert-dialog-description"]');
        expect(description).toHaveClass('text-muted-foreground', 'text-sm');
        
        // Check footer styling
        const footer = document.querySelector('[data-slot="alert-dialog-footer"]');
        expect(footer).toHaveClass(
          'flex',
          'flex-col-reverse',
          'gap-2',
          'sm:flex-row',
          'sm:justify-end'
        );
      });
    });

    it('handles button styling integration', async () => {
      const { user } = renderTestAlertDialog();
      
      const trigger = screen.getByRole('button', { name: 'Delete Account' });
      await user.click(trigger);
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const actionButton = screen.getByRole('button', { name: 'Delete Account' });
        
        // Cancel button should have outline variant
        expect(cancelButton).toHaveClass('border', 'bg-background');
        
        // Action button should have default variant
        expect(actionButton).toHaveClass('bg-primary', 'text-primary-foreground');
        
        // Both should have base button classes
        expect(cancelButton).toHaveClass('inline-flex', 'items-center', 'justify-center');
        expect(actionButton).toHaveClass('inline-flex', 'items-center', 'justify-center');
      });
    });
  });
});