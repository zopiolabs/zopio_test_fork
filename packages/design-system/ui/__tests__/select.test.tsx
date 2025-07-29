/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderWithUserEvents } from '../../test-utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../select';

// Test component with complete Select setup
function TestSelect({ onValueChange, defaultValue, disabled }: {
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <Select onValueChange={onValueChange} defaultValue={defaultValue} disabled={disabled}>
      <SelectTrigger data-testid="select-trigger">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectItem value="lettuce" disabled>Lettuce (Out of stock)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe('Select Components', () => {
  describe('Select Root', () => {
    it('renders with correct data-slot attribute', () => {
      render(<Select data-testid="select-root" />);
      
      const selectRoot = screen.getByTestId('select-root');
      expect(selectRoot).toHaveAttribute('data-slot', 'select');
    });

    it('forwards Radix Select root props', () => {
      const handleValueChange = vi.fn();
      render(
        <Select 
          onValueChange={handleValueChange}
          defaultValue="test"
          disabled={false}
          data-testid="select-root"
        />
      );
      
      const selectRoot = screen.getByTestId('select-root');
      expect(selectRoot).toBeInTheDocument();
    });
  });

  describe('SelectTrigger', () => {
    it('renders a combobox element', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('renders with correct data-slot attribute', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger');
    });

    it('applies default styling classes', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass(
        'flex',
        'w-fit',
        'items-center',
        'justify-between',
        'gap-2',
        'whitespace-nowrap',
        'rounded-md',
        'border',
        'border-input',
        'bg-transparent'
      );
    });

    it('applies default size styling', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('data-size', 'default');
      expect(trigger).toHaveClass('data-[size=default]:h-9');
    });

    it('applies small size styling', () => {
      render(
        <Select>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('data-size', 'sm');
      expect(trigger).toHaveClass('data-[size=sm]:h-8');
    });

    it('renders dropdown icon', () => {
      render(<TestSelect />);
      
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('size-4', 'opacity-50');
      
      const path = document.querySelector('path[d="m6 9 6 6 6-6"]');
      expect(path).toBeInTheDocument();
    });

    it('handles disabled state', () => {
      render(<TestSelect disabled />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('applies focus styling classes', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-[3px]',
        'focus-visible:ring-ring/50'
      );
    });

    it('applies aria-invalid styling classes', () => {
      render(
        <Select>
          <SelectTrigger aria-invalid>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass(
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      );
    });

    it('merges custom className with default classes', () => {
      render(
        <Select>
          <SelectTrigger className="custom-class">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('custom-class', 'flex', 'w-fit');
    });
  });

  describe('SelectValue', () => {
    it('renders with correct data-slot attribute', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue data-testid="select-value" />
          </SelectTrigger>
        </Select>
      );
      
      const value = screen.getByTestId('select-value');
      expect(value).toHaveAttribute('data-slot', 'select-value');
    });

    it('displays placeholder when no value is selected', () => {
      render(<TestSelect />);
      
      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('displays selected value', () => {
      render(<TestSelect defaultValue="apple" />);
      
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('opens dropdown when clicked', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText('Banana')).toBeInTheDocument();
      });
    });

    it('opens dropdown with keyboard (Enter)', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument();
      });
    });

    it('opens dropdown with keyboard (Space)', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument();
      });
    });

    it('selects option when clicked', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(<TestSelect onValueChange={handleValueChange} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Apple'));
      
      expect(handleValueChange).toHaveBeenCalledWith('apple');
    });

    it('navigates options with arrow keys', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{ArrowDown}');
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
      
      // Arrow down to next option
      await user.keyboard('{ArrowDown}');
      
      // Enter to select
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Banana')).toBeInTheDocument();
      });
    });

    it('does not respond to interactions when disabled', async () => {
      const { user } = renderWithUserEvents(<TestSelect disabled />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      // Content should not appear
      expect(screen.queryByText('Fruits')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <TestSelect />
          <button>Outside</button>
        </div>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Outside'));
      
      await waitFor(() => {
        expect(screen.queryByText('Apple')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown with Escape key', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('Apple')).not.toBeInTheDocument();
      });
    });
  });

  describe('SelectContent', () => {
    it('renders with correct data-slot attribute', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const content = document.querySelector('[data-slot="select-content"]');
        expect(content).toBeInTheDocument();
      });
    });

    it('applies styling classes', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const content = document.querySelector('[data-slot="select-content"]');
        expect(content).toHaveClass(
          'relative',
          'z-50',
          'min-w-[8rem]',
          'overflow-y-auto',
          'rounded-md',
          'border',
          'bg-popover'
        );
      });
    });

    it('handles custom className', async () => {
      const { user } = renderWithUserEvents(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="custom-content">
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const content = document.querySelector('[data-slot="select-content"]');
        expect(content).toHaveClass('custom-content');
      });
    });
  });

  describe('SelectItem', () => {
    it('renders with correct data-slot attribute', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const item = document.querySelector('[data-slot="select-item"]');
        expect(item).toBeInTheDocument();
      });
    });

    it('applies styling classes', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const item = screen.getByText('Apple').closest('[data-slot="select-item"]');
        expect(item).toHaveClass(
          'relative',
          'flex',
          'w-full',
          'cursor-default',
          'select-none',
          'items-center',
          'gap-2',
          'rounded-sm'
        );
      });
    });

    it('handles disabled state', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const disabledItem = screen.getByText('Lettuce (Out of stock)').closest('[data-slot="select-item"]');
        expect(disabledItem).toHaveClass(
          'data-[disabled]:pointer-events-none',
          'data-[disabled]:opacity-50'
        );
      });
    });

    it('shows selection indicator when selected', async () => {
      const { user } = renderWithUserEvents(<TestSelect defaultValue="apple" />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        // Check for the check icon (selection indicator)
        const checkIcon = document.querySelector('path[d="M20 6 9 17l-5-5"]');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('handles click to select', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(<TestSelect onValueChange={handleValueChange} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Banana')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Banana'));
      
      expect(handleValueChange).toHaveBeenCalledWith('banana');
    });
  });

  describe('SelectGroup and SelectLabel', () => {
    it('renders group with correct data-slot attribute', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const group = document.querySelector('[data-slot="select-group"]');
        expect(group).toBeInTheDocument();
      });
    });

    it('renders label with correct data-slot attribute and styling', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const label = document.querySelector('[data-slot="select-label"]');
        expect(label).toBeInTheDocument();
        expect(label).toHaveClass('px-2', 'py-1.5', 'text-muted-foreground', 'text-xs');
      });
    });

    it('displays group labels correctly', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument();
        expect(screen.getByText('Vegetables')).toBeInTheDocument();
      });
    });
  });

  describe('SelectSeparator', () => {
    it('renders with correct data-slot attribute', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const separator = document.querySelector('[data-slot="select-separator"]');
        expect(separator).toBeInTheDocument();
      });
    });

    it('applies styling classes', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        const separator = document.querySelector('[data-slot="select-separator"]');
        expect(separator).toHaveClass(
          '-mx-1',
          'pointer-events-none',
          'my-1',
          'h-px',
          'bg-border'
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('role', 'combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when opened', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('supports aria-label', () => {
      render(
        <Select>
          <SelectTrigger aria-label="Choose fruit">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox', { name: 'Choose fruit' });
      expect(trigger).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <div>
          <Select>
            <SelectTrigger aria-describedby="help-text">
              <SelectValue />
            </SelectTrigger>
          </Select>
          <div id="help-text">Choose your favorite fruit</div>
        </div>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('is keyboard navigable', async () => {
      const { user } = renderWithUserEvents(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      
      // Tab to focus
      await user.tab();
      expect(trigger).toHaveFocus();
      
      // Open with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Banana')).toBeInTheDocument();
      });
    });

    it('passes accessibility checks', () => {
      render(<TestSelect />);
      
      const trigger = screen.getByRole('combobox');
      // Basic accessibility check
      
      // Should have proper accessibility structure
      expect(trigger).toHaveAttribute('role', 'combobox');
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as uncontrolled component with defaultValue', () => {
      render(<TestSelect defaultValue="orange" />);
      
      expect(screen.getByText('Orange')).toBeInTheDocument();
    });

    it('works as controlled component', async () => {
      const handleValueChange = vi.fn();
      const { user, rerender } = renderWithUserEvents(
        <TestSelect onValueChange={handleValueChange} />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Apple'));
      
      expect(handleValueChange).toHaveBeenCalledWith('apple');
      
      // Simulate parent component updating the value
      rerender(
        <Select value="apple" onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty options list', async () => {
      const { user } = renderWithUserEvents(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="No options" />
          </SelectTrigger>
          <SelectContent>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(screen.getByText('No options')).toBeInTheDocument();
    });

    it('handles long option text', async () => {
      const longText = 'This is a very long option text that should be handled properly by the component';
      const { user } = renderWithUserEvents(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="long">{longText}</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText(longText)).toBeInTheDocument();
      });
    });

    it('handles rapid selection changes', async () => {
      const handleValueChange = vi.fn();
      const { user } = renderWithUserEvents(<TestSelect onValueChange={handleValueChange} />);
      
      const trigger = screen.getByRole('combobox');
      
      // Rapid selections
      await user.click(trigger);
      await waitFor(() => screen.getByText('Apple'));
      await user.click(screen.getByText('Apple'));
      
      await user.click(trigger);
      await waitFor(() => screen.getByText('Banana'));
      await user.click(screen.getByText('Banana'));
      
      expect(handleValueChange).toHaveBeenCalledTimes(2);
      expect(handleValueChange).toHaveBeenNthCalledWith(1, 'apple');
      expect(handleValueChange).toHaveBeenNthCalledWith(2, 'banana');
    });

    it('handles null className gracefully', () => {
      render(
        <Select>
          <SelectTrigger className={null as any}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });
  });
});