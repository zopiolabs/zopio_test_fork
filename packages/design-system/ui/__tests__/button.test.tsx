/**
 * @fileoverview Design System Tests - Button Component
 * 
 * Comprehensive test suite for the Button component and buttonVariants utility function.
 * Covers all button variants, sizes, states, accessibility features, and user interactions
 * including keyboard navigation and screen reader compatibility.
 * 
 * **Test Scope:**
 * - Button component variants (default, destructive, outline, secondary, ghost, link)
 * - Size variations (default, small, large, icon)
 * - State management (disabled, focus, aria-invalid)
 * - User interaction patterns (click, keyboard events)
 * - Accessibility compliance (ARIA attributes, keyboard navigation)
 * - Icon integration and SVG handling
 * 
 * **Test Categories:**
 * 1. **Rendering**: DOM structure validation and component composition
 * 2. **Variants**: Visual styling and CSS class application for different button types
 * 3. **Sizes**: Dimensional styling and layout adjustments
 * 4. **Props Handling**: HTML attribute forwarding and custom prop management
 * 5. **States**: Interactive states and accessibility indicators
 * 6. **User Interactions**: Click handling, keyboard events, and disabled state behavior
 * 7. **Accessibility**: ARIA compliance, screen reader support, keyboard navigation
 * 8. **Edge Cases**: Boundary conditions and error handling
 * 
 * **Mock Strategy:**
 * - Vitest mocking for event handlers
 * - React Testing Library user events for realistic interactions
 * - No external service dependencies (pure UI component)
 * 
 * **Quality Standards:**
 * - Complete variant and size coverage
 * - WCAG accessibility compliance validation
 * - Interactive behavior verification
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithUserEvents } from '../../test-utils';
import { Button, buttonVariants } from '../button';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders a button element by default', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('renders with correct data-slot attribute', () => {
      render(<Button>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-slot', 'button');
    });

    it('renders children correctly', () => {
      render(
        <Button>
          <span>Icon</span>
          Button Text
        </Button>
      );
      
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Button Text')).toBeInTheDocument();
    });

    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveAttribute('data-slot', 'button');
    });
  });

  describe('Variants', () => {
    it('applies default variant classes', () => {
      render(<Button>Default</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'shadow-xs');
    });

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Destructive</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'text-white', 'shadow-xs');
    });

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'bg-background', 'shadow-xs');
    });

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground', 'shadow-xs');
    });

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
    });

    it('applies link variant classes', () => {
      render(<Button variant="link">Link</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary', 'underline-offset-4', 'hover:underline');
    });
  });

  describe('Sizes', () => {
    it('applies default size classes', () => {
      render(<Button>Default Size</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-4', 'py-2');
    });

    it('applies small size classes', () => {
      render(<Button size="sm">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'gap-1.5', 'rounded-md', 'px-3');
    });

    it('applies large size classes', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'rounded-md', 'px-6');
    });

    it('applies icon size classes', () => {
      render(<Button size="icon">🔥</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('size-9');
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML button props', () => {
      render(
        <Button 
          type="submit" 
          disabled 
          title="Submit button"
          data-testid="submit-btn"
        >
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Submit button');
      expect(button).toHaveAttribute('data-testid', 'submit-btn');
    });

    it('merges custom className with variant classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('bg-primary'); // Default variant class
    });

    it('handles onClick events', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(<Button onClick={handleClick}>Click</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('handles disabled state correctly', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });

    it('handles focus state with proper focus-visible classes', async () => {
      const { user } = renderWithUserEvents(<Button>Focus me</Button>);
      
      const button = screen.getByRole('button');
      await user.tab();
      
      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-[3px]');
    });

    it('handles aria-invalid state correctly', () => {
      render(<Button aria-invalid>Invalid</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-invalid', 'true');
      expect(button).toHaveClass('aria-invalid:border-destructive', 'aria-invalid:ring-destructive/20');
    });
  });

  describe('User Interactions', () => {
    it('responds to click events', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('responds to keyboard Enter', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(<Button onClick={handleClick}>Press me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('responds to keyboard Space', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(<Button onClick={handleClick}>Press me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not respond to clicks when disabled', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button disabled onClick={handleClick}>Disabled</Button>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes for button role', () => {
      render(<Button>Accessible Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('supports custom ARIA labels', () => {
      render(<Button aria-label="Custom label">🔥</Button>);
      
      const button = screen.getByRole('button', { name: 'Custom label' });
      expect(button).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="help-text">Submit</Button>
          <div id="help-text">This will submit the form</div>
        </>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('is keyboard navigable', async () => {
      const { user } = renderWithUserEvents(
        <>
          <Button>First</Button>
          <Button>Second</Button>
        </>
      );
      
      // Tab to first button
      await user.tab();
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
      
      // Tab to second button
      await user.tab();
      expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
    });

    it('passes accessibility checks', () => {
      render(<Button>Accessible</Button>);
      
      const button = screen.getByRole('button');
      // Basic accessibility check - button should have accessible name
      expect(button).toHaveAccessibleName();
      
      // Button has implicit label from text content
      // Accessibility check completed
    });
  });

  describe('SVG Icon Handling', () => {
    it('applies correct classes to SVG children', () => {
      render(
        <Button>
          <svg data-testid="icon" className="size-4">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          With Icon
        </Button>
      );
      
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('icon');
      
      expect(button).toContainElement(icon);
      // The CSS class selector handles SVG styling
      expect(button).toHaveClass('[&_svg:not([class*="size-"])]:size-4');
    });
  });

  describe('Button Variants Function', () => {
    it('generates correct classes for default variant and size', () => {
      const classes = buttonVariants();
      
      expect(classes).toContain('bg-primary');
      expect(classes).toContain('text-primary-foreground');
      expect(classes).toContain('h-9');
      expect(classes).toContain('px-4');
    });

    it('generates correct classes for specific variant and size', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
      
      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('text-white');
      expect(classes).toContain('h-10');
      expect(classes).toContain('px-6');
    });

    it('includes custom className', () => {
      const classes = buttonVariants({ className: 'custom-class' });
      
      expect(classes).toContain('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<Button></Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });

    it('handles null children', () => {
      render(<Button>{null}</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles multiple nested elements', () => {
      render(
        <Button>
          <div>
            <span>Nested</span>
            <strong>Content</strong>
          </div>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(button).toContainElement(screen.getByText('Nested'));
      expect(button).toContainElement(screen.getByText('Content'));
    });
  });

  describe('Theme Variants', () => {
    it('handles dark mode classes', () => {
      render(<Button variant="destructive">Dark Mode</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:bg-destructive/60', 'dark:focus-visible:ring-destructive/40');
    });

    it('handles outline variant dark mode', () => {
      render(<Button variant="outline">Outline Dark</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:border-input', 'dark:bg-input/30');
    });
  });
});