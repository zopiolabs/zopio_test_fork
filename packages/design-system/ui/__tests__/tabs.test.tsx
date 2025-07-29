/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderWithUserEvents } from '../../test-utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

// Test component with complete Tabs setup
function TestTabs({ 
  defaultValue = 'tab1', 
  onValueChange, 
  disabled 
}: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Tabs defaultValue={defaultValue} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="tab1" disabled={disabled}>
          Tab 1
        </TabsTrigger>
        <TabsTrigger value="tab2">
          Tab 2
        </TabsTrigger>
        <TabsTrigger value="tab3" disabled>
          Tab 3 (Disabled)
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <div>Content for Tab 1</div>
      </TabsContent>
      <TabsContent value="tab2">
        <div>Content for Tab 2</div>
      </TabsContent>
      <TabsContent value="tab3">
        <div>Content for Tab 3</div>
      </TabsContent>
    </Tabs>
  );
}

describe('Tabs Components', () => {
  describe('Tabs Root', () => {
    it('renders with correct data-slot attribute', () => {
      render(
        <Tabs data-testid="tabs-root">
          <div>Tabs content</div>
        </Tabs>
      );
      
      const tabsRoot = screen.getByTestId('tabs-root');
      expect(tabsRoot).toHaveAttribute('data-slot', 'tabs');
    });

    it('applies default styling classes', () => {
      render(
        <Tabs data-testid="tabs-root">
          <div>Content</div>
        </Tabs>
      );
      
      const tabsRoot = screen.getByTestId('tabs-root');
      expect(tabsRoot).toHaveClass('flex', 'flex-col', 'gap-2');
    });

    it('merges custom className with default classes', () => {
      render(
        <Tabs className="custom-tabs" data-testid="tabs-root">
          <div>Content</div>
        </Tabs>
      );
      
      const tabsRoot = screen.getByTestId('tabs-root');
      expect(tabsRoot).toHaveClass('custom-tabs', 'flex', 'flex-col', 'gap-2');
    });

    it('forwards Radix Tabs root props', () => {
      const handleValueChange = vi.fn();
      
      render(
        <Tabs 
          defaultValue="test"
          onValueChange={handleValueChange}
          orientation="vertical"
          data-testid="tabs-root"
        >
          <div>Content</div>
        </Tabs>
      );
      
      const tabsRoot = screen.getByTestId('tabs-root');
      expect(tabsRoot).toBeInTheDocument();
      expect(tabsRoot).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  describe('TabsList', () => {
    it('renders with correct data-slot attribute', () => {
      render(
        <Tabs>
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveAttribute('data-slot', 'tabs-list');
    });

    it('renders as a tablist element', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Tabs>
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass(
        'inline-flex',
        'h-9',
        'w-fit',
        'items-center',
        'justify-center',
        'rounded-lg',
        'bg-muted',
        'p-[3px]',
        'text-muted-foreground'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Tabs>
          <TabsList className="custom-list" data-testid="tabs-list">
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('custom-list', 'inline-flex', 'h-9');
    });

    it('contains tab triggers', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByRole('tablist');
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      expect(tabsList).toContainElement(tab1);
      expect(tabsList).toContainElement(tab2);
    });
  });

  describe('TabsTrigger', () => {
    it('renders with correct data-slot attribute', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" data-testid="tabs-trigger">
              Test Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveAttribute('data-slot', 'tabs-trigger');
    });

    it('renders as a tab element', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test">Test Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab = screen.getByRole('tab', { name: 'Test Tab' });
      expect(tab).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" data-testid="tabs-trigger">
              Test Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass(
        'inline-flex',
        'h-[calc(100%-1px)]',
        'flex-1',
        'items-center',
        'justify-center',
        'gap-1.5',
        'whitespace-nowrap',
        'rounded-md'
      );
    });

    it('applies focus styling classes', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" data-testid="tabs-trigger">
              Test Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:outline-1',
        'focus-visible:outline-ring',
        'focus-visible:ring-[3px]',
        'focus-visible:ring-ring/50'
      );
    });

    it('applies active state styling classes', () => {
      render(
        <Tabs defaultValue="active-tab">
          <TabsList>
            <TabsTrigger value="active-tab" data-testid="tabs-trigger">
              Active Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass(
        'data-[state=active]:bg-background',
        'data-[state=active]:shadow-sm'
      );
    });

    it('applies disabled styling classes', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" disabled data-testid="tabs-trigger">
              Disabled Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass(
        'disabled:pointer-events-none',
        'disabled:opacity-50'
      );
    });

    it('applies dark mode styling classes', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" data-testid="tabs-trigger">
              Test Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass(
        'dark:text-muted-foreground',
        'dark:data-[state=active]:border-input',
        'dark:data-[state=active]:bg-input/30',
        'dark:data-[state=active]:text-foreground'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" className="custom-trigger" data-testid="tabs-trigger">
              Test Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass('custom-trigger', 'inline-flex', 'items-center');
    });

    it('handles SVG icons with correct classes', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="test" data-testid="tabs-trigger">
              <svg data-testid="tab-icon" className="custom-icon-class">
                <path d="M12 2l3.09 6.26L22 9.27" />
              </svg>
              Tab with Icon
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass('[&_svg:not([class*="size-"])]:size-4');
      expect(tabsTrigger).toHaveClass('[&_svg]:pointer-events-none');
      expect(tabsTrigger).toHaveClass('[&_svg]:shrink-0');
    });
  });

  describe('TabsContent', () => {
    it('renders with correct data-slot attribute', () => {
      render(
        <Tabs defaultValue="test">
          <TabsContent value="test" data-testid="tabs-content">
            Test Content
          </TabsContent>
        </Tabs>
      );
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveAttribute('data-slot', 'tabs-content');
    });

    it('renders as a tabpanel element', () => {
      render(
        <Tabs defaultValue="test">
          <TabsContent value="test">
            Test Content
          </TabsContent>
        </Tabs>
      );
      
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toBeInTheDocument();
      expect(tabpanel).toHaveTextContent('Test Content');
    });

    it('applies default styling classes', () => {
      render(
        <Tabs defaultValue="test">
          <TabsContent value="test" data-testid="tabs-content">
            Test Content
          </TabsContent>
        </Tabs>
      );
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveClass('flex-1', 'outline-none');
    });

    it('merges custom className with default classes', () => {
      render(
        <Tabs defaultValue="test">
          <TabsContent value="test" className="custom-content" data-testid="tabs-content">
            Test Content
          </TabsContent>
        </Tabs>
      );
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveClass('custom-content', 'flex-1', 'outline-none');
    });

    it('shows content for active tab', () => {
      render(
        <Tabs defaultValue="active">
          <TabsContent value="active">
            Active Content
          </TabsContent>
          <TabsContent value="inactive">
            Inactive Content
          </TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Active Content')).toBeInTheDocument();
      expect(screen.queryByText('Inactive Content')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('switches tabs when clicked', async () => {
      const { user } = renderWithUserEvents(<TestTabs />);
      
      // Initially shows tab1 content
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument();
      expect(screen.queryByText('Content for Tab 2')).not.toBeInTheDocument();
      
      // Click tab2
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);
      
      // Should show tab2 content
      await waitFor(() => {
        expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument();
        expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
      });
    });

    it('calls onValueChange when tab is switched', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <TestTabs onValueChange={handleValueChange} />
      );
      
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);
      
      expect(handleValueChange).toHaveBeenCalledWith('tab2');
    });

    it('navigates tabs with arrow keys', async () => {
      const { user } = renderWithUserEvents(<TestTabs />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      // Focus first tab
      tab1.focus();
      expect(tab1).toHaveFocus();
      
      // Right arrow should move to next tab
      await user.keyboard('{ArrowRight}');
      expect(tab2).toHaveFocus();
      
      // Left arrow should move back to previous tab
      await user.keyboard('{ArrowLeft}');
      expect(tab1).toHaveFocus();
    });

    it('activates tab with Enter key', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <TestTabs onValueChange={handleValueChange} />
      );
      
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();
      await user.keyboard('{Enter}');
      
      expect(handleValueChange).toHaveBeenCalledWith('tab2');
    });

    it('activates tab with Space key', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <TestTabs onValueChange={handleValueChange} />
      );
      
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();
      await user.keyboard(' ');
      
      expect(handleValueChange).toHaveBeenCalledWith('tab2');
    });

    it('does not respond to interactions when disabled', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <TestTabs onValueChange={handleValueChange} disabled />
      );
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      await user.click(tab1);
      
      // Should not change from default tab since it's disabled
      expect(handleValueChange).not.toHaveBeenCalled();
    });

    it('skips disabled tabs during keyboard navigation', async () => {
      const { user } = renderWithUserEvents(<TestTabs />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      const tab3 = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' });
      
      // Start at tab2
      tab2.focus();
      expect(tab2).toHaveFocus();
      
      // Right arrow should skip disabled tab3 and wrap to tab1
      await user.keyboard('{ArrowRight}');
      
      // Should focus tab1 (skipping disabled tab3)
      expect(tab1).toHaveFocus();
    });

    it('does not activate disabled tabs', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <TestTabs onValueChange={handleValueChange} />
      );
      
      const tab3 = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' });
      await user.click(tab3);
      
      expect(handleValueChange).not.toHaveBeenCalledWith('tab3');
      expect(screen.queryByText('Content for Tab 3')).not.toBeInTheDocument();
    });
  });

  describe('States and Attributes', () => {
    it('sets correct ARIA attributes for active tab', () => {
      render(<TestTabs defaultValue="tab2" />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });

    it('sets correct disabled attributes', () => {
      render(<TestTabs />);
      
      const tab3 = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' });
      expect(tab3).toBeDisabled();
      expect(tab3).toHaveAttribute('aria-disabled', 'true');
    });

    it('associates tabs with their panels', () => {
      render(<TestTabs />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const panel1 = screen.getByRole('tabpanel');
      
      const tabId = tab1.getAttribute('id');
      const panelAriaLabelledBy = panel1.getAttribute('aria-labelledby');
      
      expect(tabId).toBe(panelAriaLabelledBy);
    });

    it('maintains tabindex correctly', () => {
      render(<TestTabs defaultValue="tab2" />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      const tab3 = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' });
      
      // Only active tab should have tabindex="0"
      expect(tab1).toHaveAttribute('tabindex', '-1');
      expect(tab2).toHaveAttribute('tabindex', '0');
      expect(tab3).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA structure', () => {
      render(<TestTabs />);
      
      const tablist = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');
      const tabpanel = screen.getByRole('tabpanel');
      
      expect(tablist).toBeInTheDocument();
      expect(tabs).toHaveLength(3);
      expect(tabpanel).toBeInTheDocument();
    });

    it('supports aria-label on tablist', () => {
      render(
        <Tabs>
          <TabsList aria-label="Navigation tabs">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tablist = screen.getByRole('tablist', { name: 'Navigation tabs' });
      expect(tablist).toBeInTheDocument();
    });

    it('supports custom ARIA attributes on tabs', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger 
              value="tab1" 
              aria-describedby="tab-help"
              data-testid="custom-tab"
            >
              Tab 1
            </TabsTrigger>
          </TabsList>
          <div id="tab-help">Help text for tab</div>
        </Tabs>
      );
      
      const tab = screen.getByTestId('custom-tab');
      expect(tab).toHaveAttribute('aria-describedby', 'tab-help');
    });

    it('is keyboard navigable', async () => {
      const { user } = renderWithUserEvents(<TestTabs />);
      
      // Tab should focus the active tab
      await user.tab();
      
      const activeTab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(activeTab).toHaveFocus();
      
      // Arrow keys should navigate between tabs
      await user.keyboard('{ArrowRight}');
      
      const nextTab = screen.getByRole('tab', { name: 'Tab 2' });
      expect(nextTab).toHaveFocus();
    });

    it('passes accessibility checks', () => {
      render(<TestTabs />);
      
      const tablist = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');
      const tabpanel = screen.getByRole('tabpanel');
      
      // Check basic accessibility structure
      expect(tablist).toHaveAttribute('role', 'tablist');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('role', 'tab');
      });
      expect(tabpanel).toHaveAttribute('role', 'tabpanel');
    });

    it('maintains focus management correctly', async () => {
      const { user } = renderWithUserEvents(<TestTabs />);
      
      // Focus should go to active tab when tabbing to tabs
      await user.tab();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();
      
      // Arrow navigation should update focus
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
      
      // Activation should maintain focus on activated tab
      await user.keyboard('{Enter}');
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
    });
  });

  describe('Complete Tabs Workflow', () => {
    it('renders complete tabs with all components working together', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <Tabs defaultValue="home" onValueChange={handleValueChange}>
          <TabsList aria-label="Main navigation">
            <TabsTrigger value="home">🏠 Home</TabsTrigger>
            <TabsTrigger value="profile">👤 Profile</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="home">
            <h2>Welcome Home</h2>
            <p>This is the home page content.</p>
          </TabsContent>
          <TabsContent value="profile">
            <h2>Your Profile</h2>
            <p>Manage your profile information here.</p>
          </TabsContent>
          <TabsContent value="settings">
            <h2>Settings</h2>
            <p>Configure your preferences.</p>
          </TabsContent>
        </Tabs>
      );
      
      // Initial state
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
      expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();
      
      // Click profile tab
      await user.click(screen.getByRole('tab', { name: '👤 Profile' }));
      
      expect(handleValueChange).toHaveBeenCalledWith('profile');
      
      await waitFor(() => {
        expect(screen.queryByText('Welcome Home')).not.toBeInTheDocument();
        expect(screen.getByText('Your Profile')).toBeInTheDocument();
      });
      
      // Keyboard navigation to settings
      const settingsTab = screen.getByRole('tab', { name: '⚙️ Settings' });
      settingsTab.focus();
      await user.keyboard('{Enter}');
      
      expect(handleValueChange).toHaveBeenCalledWith('settings');
      
      await waitFor(() => {
        expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('handles controlled tabs', async () => {
      const { user, rerender } = renderWithUserEvents(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      
      // Clicking should not change content in controlled mode
      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      
      // Parent needs to update the value prop
      rerender(
        <Tabs value="tab2" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles tabs with no initial value', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      
      // Should not show any content initially
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('handles tabs with invalid default value', () => {
      render(
        <Tabs defaultValue="nonexistent">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      
      // Should not show any content for invalid default
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('handles empty tabs list', () => {
      render(
        <Tabs>
          <TabsList></TabsList>
        </Tabs>
      );
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    });

    it('handles null className gracefully', () => {
      render(
        <Tabs>
          <TabsList className={null as any}>
            <TabsTrigger value="tab1" className={null as any}>
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className={null as any}>
            Content
          </TabsContent>
        </Tabs>
      );
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab')).toBeInTheDocument();
    });

    it('handles rapid tab switching', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(
        <TestTabs onValueChange={handleValueChange} />
      );
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      // Rapid clicks
      await user.click(tab2);
      await user.click(tab1);
      await user.click(tab2);
      
      expect(handleValueChange).toHaveBeenCalledTimes(3);
    });

    it('handles very long tab labels', () => {
      const longLabel = 'This is a very long tab label that might cause layout issues';
      
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="long">{longLabel}</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      expect(screen.getByText(longLabel)).toBeInTheDocument();
      
      const trigger = screen.getByRole('tab');
      expect(trigger).toHaveClass('whitespace-nowrap');
    });
  });
});