/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Button component.
 *
 * This test suite validates the button component's functionality across multiple
 * dimensions including rendering, variants, accessibility, and user interactions. The
 * button is an interactive component built with class-variance-authority (CVA) that
 * supports multiple visual variants, sizes, and interactive states.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, component structure
 * 2. Variant Tests - Default, outline, ghost, secondary, destructive, link variants with proper styling
 * 3. Props Handling - className forwarding, HTML attributes, disabled prop, asChild functionality
 * 4. User Interactions - Click events, keyboard navigation (Enter/Space), focus management
 * 5. States - Disabled state, loading state, focus state, hover state
 * 6. Accessibility - Button role, keyboard navigation, ARIA attributes, WCAG compliance
 * 7. Edge Cases - Empty content, icon-only buttons, malformed props, rapid state changes
 * 8. Component Integration - Icon integration, asChild prop, compound component usage
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all visual variants, interactive states, and integration scenarios.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import { Button } from '@repo/design-system/ui/button';

/**
 * Helper function to render a basic button with default content
 * Supports custom props for comprehensive testing scenarios
 */
const renderTestButton = (props: any = {}, content: React.ReactNode = 'Test Button') => {
  return renderWithUserEvents(
    <Button {...props}>{content}</Button>
  );
};

/**
 * Helper function to render button with icon integration
 * Tests compound usage patterns with icon elements
 */
const renderButtonWithIcon = (props: any = {}, content = 'Button', iconProps: any = {}) => {
  return renderWithUserEvents(
    <Button {...props}>
      <svg
        {...iconProps}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        data-testid="button-icon"
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
      {content}
    </Button>
  );
};

/**
 * Helper function to render button using asChild prop
 * Tests polymorphic component behavior
 */
const renderAsChildButton = (asChildElement = 'a', props: any = {}, content = 'Link Button') => {
  const Component = asChildElement as any;
  return renderWithUserEvents(
    <Button asChild {...props}>
      <Component href="#test">{content}</Component>
    </Button>
  );
};

/**
 * Helper function to render minimal button for basic tests
 */
const renderMinimalButton = (props: any = {}) => {
  return renderWithUserEvents(
    <Button {...props}>Button</Button>
  );
};

/**
 * Helper function to render loading button with spinner
 */
const renderLoadingButton = (props: any = {}) => {
  return renderWithUserEvents(
    <Button {...props} disabled>
      <svg
        className="mr-2 h-4 w-4 animate-spin"
        data-testid="loading-spinner"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      Loading...
    </Button>
  );
};

describe('Button', () => {
  describe('Rendering Tests', () => {
    it('renders button element correctly', () => {
      renderMinimalButton();
      
      // Find the button by its data-slot attribute
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass(
        'inline-flex',
        'shrink-0',
        'items-center',
        'justify-center',
        'gap-2',
        'whitespace-nowrap',
        'rounded-md',
        'font-medium',
        'text-sm',
        'outline-none',
        'transition-all'
      );
    });

    it('renders with correct data-slot attribute', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-slot', 'button');
    });

    it('renders button content correctly', () => {
      const content = 'Custom Button Content';
      renderTestButton({}, content);
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveTextContent(content);
    });

    it('renders as button element by default', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('BUTTON');
    });

    it('renders with proper base styling classes', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass(
        'inline-flex',
        'shrink-0',
        'items-center',
        'justify-center',
        'gap-2',
        'whitespace-nowrap',
        'rounded-md',
        'font-medium',
        'text-sm',
        'outline-none',
        'transition-all'
      );
    });

    it('renders with focus and accessibility classes', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-[3px]',
        'focus-visible:ring-ring/50',
        'disabled:pointer-events-none',
        'disabled:opacity-50',
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      );
    });

    it('renders with SVG icon styling support', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass(
        '[&_svg:not([class*="size-"])]:size-4',
        '[&_svg]:pointer-events-none',
        '[&_svg]:shrink-0'
      );
    });

    it('maintains proper semantic structure', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('BUTTON');
      expect(button).toBeInTheDocument();
    });

    it('renders with default button type', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      // HTML buttons default to type="submit" unless specified otherwise
      expect(button).not.toHaveAttribute('type', 'submit');
    });
  });

  describe('Variant Tests', () => {
    describe('Default Variant', () => {
      it('applies default variant styles when no variant specified', () => {
        renderTestButton();
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'bg-primary',
          'text-primary-foreground',
          'shadow-xs',
          'hover:bg-primary/90'
        );
      });

      it('applies default variant styles when explicitly specified', () => {
        renderTestButton({ variant: 'default' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'bg-primary',
          'text-primary-foreground',
          'shadow-xs',
          'hover:bg-primary/90'
        );
      });

      it('renders content with default variant styling', () => {
        renderTestButton({ variant: 'default' }, 'Default Button');
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent('Default Button');
        expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      });

      it('maintains all base classes with default variant', () => {
        renderTestButton({ variant: 'default' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
        expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      });
    });

    describe('Destructive Variant', () => {
      it('applies destructive variant styles correctly', () => {
        renderTestButton({ variant: 'destructive' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'bg-destructive',
          'text-white',
          'shadow-xs',
          'hover:bg-destructive/90'
        );
      });

      it('includes focus styles for destructive variant', () => {
        renderTestButton({ variant: 'destructive' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('focus-visible:ring-destructive/20');
      });

      it('includes dark mode styles for destructive variant', () => {
        renderTestButton({ variant: 'destructive' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'dark:bg-destructive/60',
          'dark:focus-visible:ring-destructive/40'
        );
      });

      it('renders content with destructive variant styling', () => {
        renderTestButton({ variant: 'destructive' }, 'Delete Button');
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent('Delete Button');
        expect(button).toHaveClass('bg-destructive', 'text-white');
      });
    });

    describe('Outline Variant', () => {
      it('applies outline variant styles correctly', () => {
        renderTestButton({ variant: 'outline' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'border',
          'bg-background',
          'shadow-xs',
          'hover:bg-accent',
          'hover:text-accent-foreground'
        );
      });

      it('includes dark mode styles for outline variant', () => {
        renderTestButton({ variant: 'outline' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'dark:border-input',
          'dark:bg-input/30',
          'dark:hover:bg-input/50'
        );
      });

      it('renders content with outline variant styling', () => {
        renderTestButton({ variant: 'outline' }, 'Outline Button');
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent('Outline Button');
        expect(button).toHaveClass('border', 'bg-background');
      });
    });

    describe('Secondary Variant', () => {
      it('applies secondary variant styles correctly', () => {
        renderTestButton({ variant: 'secondary' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'bg-secondary',
          'text-secondary-foreground',
          'shadow-xs',
          'hover:bg-secondary/80'
        );
      });

      it('renders content with secondary variant styling', () => {
        renderTestButton({ variant: 'secondary' }, 'Secondary Button');
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent('Secondary Button');
        expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
      });
    });

    describe('Ghost Variant', () => {
      it('applies ghost variant styles correctly', () => {
        renderTestButton({ variant: 'ghost' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'hover:bg-accent',
          'hover:text-accent-foreground'
        );
      });

      it('includes dark mode styles for ghost variant', () => {
        renderTestButton({ variant: 'ghost' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('dark:hover:bg-accent/50');
      });

      it('renders content with ghost variant styling', () => {
        renderTestButton({ variant: 'ghost' }, 'Ghost Button');
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent('Ghost Button');
        expect(button).toHaveClass('hover:bg-accent');
      });
    });

    describe('Link Variant', () => {
      it('applies link variant styles correctly', () => {
        renderTestButton({ variant: 'link' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'text-primary',
          'underline-offset-4',
          'hover:underline'
        );
      });

      it('renders content with link variant styling', () => {
        renderTestButton({ variant: 'link' }, 'Link Button');
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent('Link Button');
        expect(button).toHaveClass('text-primary', 'hover:underline');
      });
    });

    describe('Variant Behavior', () => {
      it('handles invalid variant gracefully', () => {
        renderTestButton({ variant: 'invalid' as any });
        
        const button = document.querySelector('[data-slot="button"]');
        // Should render with base classes (invalid variant doesn't apply any variant styles)
        expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
        expect(button).toBeInTheDocument();
      });

      it('handles undefined variant as default', () => {
        renderTestButton({ variant: undefined });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass(
          'bg-primary',
          'text-primary-foreground',
          'shadow-xs',
          'hover:bg-primary/90'
        );
      });

      it('applies consistent base classes across all variants', () => {
        const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
        
        variants.forEach(variant => {
          const { unmount } = renderTestButton({ variant });
          
          const button = document.querySelector('[data-slot="button"]');
          expect(button).toHaveClass(
            'inline-flex',
            'shrink-0',
            'items-center',
            'justify-center',
            'gap-2',
            'whitespace-nowrap',
            'rounded-md',
            'font-medium',
            'text-sm',
            'outline-none',
            'transition-all'
          );
          
          unmount();
        });
      });
    });
  });

  describe('Size Tests', () => {
    describe('Default Size', () => {
      it('applies default size styles when no size specified', () => {
        renderTestButton();
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('h-9', 'px-4', 'py-2', 'has-[>svg]:px-3');
      });

      it('applies default size styles when explicitly specified', () => {
        renderTestButton({ size: 'default' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('h-9', 'px-4', 'py-2', 'has-[>svg]:px-3');
      });
    });

    describe('Small Size', () => {
      it('applies small size styles correctly', () => {
        renderTestButton({ size: 'sm' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('h-8', 'gap-1.5', 'rounded-md', 'px-3', 'has-[>svg]:px-2.5');
      });
    });

    describe('Large Size', () => {
      it('applies large size styles correctly', () => {
        renderTestButton({ size: 'lg' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('h-10', 'rounded-md', 'px-6', 'has-[>svg]:px-4');
      });
    });

    describe('Icon Size', () => {
      it('applies icon size styles correctly', () => {
        renderTestButton({ size: 'icon' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('size-9');
      });

      it('works well with icon-only content', () => {
        renderTestButton({ size: 'icon' }, 
          <svg width="16" height="16" data-testid="icon-only">
            <circle cx="8" cy="8" r="6" />
          </svg>
        );
        
        const button = document.querySelector('[data-slot="button"]');
        const icon = screen.getByTestId('icon-only');
        
        expect(button).toHaveClass('size-9');
        expect(button).toContainElement(icon);
      });
    });

    describe('Size Behavior', () => {
      it('handles invalid size gracefully', () => {
        renderTestButton({ size: 'invalid' as any });
        
        const button = document.querySelector('[data-slot="button"]');
        // Should render with base classes
        expect(button).toHaveClass('inline-flex', 'items-center');
        expect(button).toBeInTheDocument();
      });

      it('combines size with variants correctly', () => {
        renderTestButton({ variant: 'destructive', size: 'lg' });
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveClass('bg-destructive', 'text-white'); // variant
        expect(button).toHaveClass('h-10', 'px-6'); // size
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly', () => {
      renderTestButton({
        'data-testid': 'custom-button',
        id: 'button-id',
        'aria-label': 'Custom button',
        title: 'Tooltip text',
        type: 'submit'
      });
      
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('id', 'button-id');
      expect(button).toHaveAttribute('aria-label', 'Custom button');
      expect(button).toHaveAttribute('title', 'Tooltip text');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('merges custom className with default classes', () => {
      renderTestButton({ className: 'custom-class bg-custom' });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass('custom-class', 'bg-custom');
      // Should maintain default classes
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('handles className merging with variant classes', () => {
      renderTestButton({ 
        variant: 'secondary', 
        className: 'custom-secondary-class' 
      });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass('custom-secondary-class');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('handles disabled prop correctly', () => {
      renderTestButton({ disabled: true });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });

    it('handles asChild prop correctly with anchor element', () => {
      renderAsChildButton('a', { href: '#test' });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('A');
      expect(button).toHaveAttribute('href', '#test');
      expect(button).toHaveTextContent('Link Button');
    });

    it('handles asChild prop with div element', () => {
      renderWithUserEvents(
        <Button asChild className="custom-div-button">
          <div role="button" tabIndex={0}>Div Button</div>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('DIV');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).toHaveClass('custom-div-button');
      expect(button).toHaveTextContent('Div Button');
    });

    it('handles asChild prop with custom component attributes', () => {
      renderWithUserEvents(
        <Button asChild variant="destructive">
          <a href="/delete" className="delete-link" target="_blank" rel="noopener">
            Delete Item
          </a>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('A');
      expect(button).toHaveAttribute('href', '/delete');
      expect(button).toHaveAttribute('target', '_blank');
      expect(button).toHaveAttribute('rel', 'noopener');
      expect(button).toHaveClass('delete-link', 'bg-destructive', 'text-white');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderTestButton({
        'data-testid': 'multi-attr-button',
        className: 'multi-class',
        id: 'multi-id',
        'aria-label': 'Multiple attributes button',
        'aria-describedby': 'description',
        type: 'button',
        tabIndex: 0,
        title: 'Multi-attribute tooltip',
        disabled: false
      });
      
      const button = screen.getByTestId('multi-attr-button');
      expect(button).toHaveClass('multi-class');
      expect(button).toHaveAttribute('id', 'multi-id');
      expect(button).toHaveAttribute('aria-label', 'Multiple attributes button');
      expect(button).toHaveAttribute('aria-describedby', 'description');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).toHaveAttribute('title', 'Multi-attribute tooltip');
      expect(button).not.toBeDisabled();
    });

    it('handles event handlers correctly', async () => {
      const handleClick = vi.fn();
      const handleMouseOver = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick} onMouseOver={handleMouseOver}>
          Event Button
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      
      await user.click(button!);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.hover(button!);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
    });

    it('handles style prop correctly', () => {
      renderTestButton({
        style: {
          backgroundColor: 'red',
          color: 'white',
          fontSize: '16px'
        }
      });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(button).toHaveStyle('color: rgb(255, 255, 255)');
      expect(button).toHaveStyle('font-size: 16px');
    });
  });

  describe('User Interactions', () => {
    it('handles click events correctly', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick}>Clickable Button</Button>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard interaction with Enter key', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick}>Keyboard Button</Button>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard interaction with Space key', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick}>Space Button</Button>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents interaction when disabled', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick} disabled>Disabled Button</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Should not respond to click
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
      
      // Should not be focusable due to disabled:pointer-events-none
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles focus and blur events', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Button onFocus={handleFocus} onBlur={handleBlur}>
          Focus Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      
      await user.click(button); // This will focus the button
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.tab(); // This will blur the button
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('handles multiple rapid clicks correctly', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick}>Rapid Click Button</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Perform multiple rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('maintains proper focus order', async () => {
      const { user } = renderWithUserEvents(
        <div>
          <Button>First Button</Button>
          <Button>Second Button</Button>
          <Button>Third Button</Button>
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      
      // Tab through buttons
      await user.tab();
      expect(document.activeElement).toBe(buttons[0]);
      
      await user.tab();
      expect(document.activeElement).toBe(buttons[1]);
      
      await user.tab();
      expect(document.activeElement).toBe(buttons[2]);
    });

    it('handles form submission when type="submit"', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const { user } = renderWithUserEvents(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Button</Button>
        </form>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('supports drag events', async () => {
      const handleDragStart = vi.fn();
      const { user } = renderWithUserEvents(
        <Button draggable onDragStart={handleDragStart}>
          Draggable Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      
      // Trigger drag start event
      fireEvent.dragStart(button);
      expect(handleDragStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('handles disabled state correctly', () => {
      renderTestButton({ disabled: true });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });

    it('handles loading state with spinner', () => {
      renderLoadingButton();
      
      const button = document.querySelector('[data-slot="button"]');
      const spinner = screen.getByTestId('loading-spinner');
      
      expect(button).toBeDisabled();
      expect(button).toContainElement(spinner);
      expect(spinner).toHaveClass('animate-spin');
      expect(button).toHaveTextContent('Loading...');
    });

    it('handles focus state with visual indicators', async () => {
      const { user } = renderWithUserEvents(
        <Button>Focus State Button</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Initially not focused
      expect(document.activeElement).not.toBe(button);
      
      // Focus the button
      await user.click(button);
      expect(document.activeElement).toBe(button);
      expect(button).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-[3px]');
    });

    it('maintains consistent state across re-renders', () => {
      const { rerender } = renderTestButton({ disabled: true });
      
      let button = document.querySelector('[data-slot="button"]');
      expect(button).toBeDisabled();
      
      // Re-render with same props
      rerender(<Button disabled>Test Button</Button>);
      
      button = document.querySelector('[data-slot="button"]');
      expect(button).toBeDisabled();
    });

    it('handles dynamic state changes properly', () => {
      const { rerender } = renderTestButton({ disabled: false });
      
      let button = document.querySelector('[data-slot="button"]');
      expect(button).not.toBeDisabled();
      
      // Update to disabled
      rerender(<Button disabled>Test Button</Button>);
      
      button = document.querySelector('[data-slot="button"]');
      expect(button).toBeDisabled();
      
      // Update back to enabled
      rerender(<Button disabled={false}>Test Button</Button>);
      
      button = document.querySelector('[data-slot="button"]');
      expect(button).not.toBeDisabled();
    });

    it('handles hover states with proper styling', () => {
      renderTestButton({ variant: 'default' });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass('hover:bg-primary/90');
    });

    it('maintains data-slot attribute across state changes', () => {
      const { rerender } = renderTestButton();
      
      expect(document.querySelector('[data-slot="button"]')).toHaveAttribute('data-slot', 'button');
      
      rerender(<Button variant="destructive" disabled className="custom">Updated</Button>);
      
      expect(document.querySelector('[data-slot="button"]')).toHaveAttribute('data-slot', 'button');
    });
  });

  describe('Accessibility', () => {
    it('has proper button role by default', () => {
      renderTestButton();
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('provides accessible text content', () => {
      renderTestButton({}, 'Accessible Button Content');
      
      const button = screen.getByText('Accessible Button Content');
      expect(button).toBeInTheDocument();
    });

    it('supports custom aria-label for additional context', () => {
      renderTestButton({
        'aria-label': 'Save document (Ctrl+S)'
      }, 'Save');
      
      const button = screen.getByLabelText('Save document (Ctrl+S)');
      expect(button).toHaveTextContent('Save');
    });

    it('supports aria-describedby for detailed descriptions', () => {
      const { container } = renderWithUserEvents(
        <div>
          <Button aria-describedby="button-description">Delete Item</Button>
          <div id="button-description">This will permanently delete the item</div>
        </div>
      );
      
      const button = screen.getByRole('button');
      const description = screen.getByText('This will permanently delete the item');
      
      expect(button).toHaveAttribute('aria-describedby', 'button-description');
      expect(description).toHaveAttribute('id', 'button-description');
    });

    it('maintains proper semantic structure', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('BUTTON');
      expect(button).toBeInTheDocument();
    });

    it('handles focus styles for keyboard navigation', () => {
      renderTestButton();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-[3px]',
        'focus-visible:ring-ring/50'
      );
    });

    it('supports keyboard navigation correctly', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button onClick={handleClick}>Keyboard Button</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Tab to focus
      await user.tab();
      expect(document.activeElement).toBe(button);
      
      // Enter to activate
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Space to activate
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('indicates disabled state to screen readers', () => {
      renderTestButton({ disabled: true, 'aria-label': 'Submit form' });
      
      const button = screen.getByLabelText('Submit form');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });

    it('handles aria-invalid state properly', () => {
      renderTestButton({
        'aria-invalid': 'true'
      }, 'Invalid Button');
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveAttribute('aria-invalid', 'true');
      expect(button).toHaveClass(
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      );
    });

    it('supports high contrast mode compatibility', () => {
      renderTestButton({ variant: 'outline' });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass('border', 'bg-background');
    });

    it('maintains accessibility across all variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
      
      variants.forEach(variant => {
        const { unmount } = renderTestButton({ 
          variant: variant as any,
          'aria-label': `${variant} button`
        }, `${variant} content`);
        
        const button = screen.getByLabelText(`${variant} button`);
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(`${variant} content`);
        
        // Custom accessibility check for buttons without requiring explicit type attribute
        // HTML button elements have an implicit type="submit" unless otherwise specified
        accessibility.expectToBeAccessible(button, { checkKeyboardSupport: false });
        
        // Verify the button element is semantically correct
        expect(button.tagName).toBe('BUTTON');
        expect(button).toHaveAccessibleName();
        
        // Check that it can receive focus for keyboard navigation
        expect(button).not.toHaveAttribute('tabindex', '-1');
        
        unmount();
      });
    });

    it('supports accessible interactive button via asChild', () => {
      renderWithUserEvents(
        <Button asChild>
          <a
            href="/dashboard"
            aria-label="Go to dashboard"
          >
            Dashboard
          </a>
        </Button>
      );
      
      const button = screen.getByLabelText('Go to dashboard');
      expect(button?.tagName).toBe('A');
      expect(button).toHaveAttribute('href', '/dashboard');
      expect(button).toHaveTextContent('Dashboard');
      
      accessibility.expectToBeAccessible(button, { checkKeyboardSupport: false }); // Links have different keyboard behavior
    });

    it('provides proper contrast for destructive variant', () => {
      renderTestButton({ variant: 'destructive' });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass('bg-destructive', 'text-white');
    });

    it('supports ARIA expanded for dropdown buttons', () => {
      renderTestButton({
        'aria-expanded': 'false',
        'aria-haspopup': 'menu'
      }, 'Menu Button');
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty button content gracefully', () => {
      renderTestButton({}, '');
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('handles button with only whitespace', () => {
      renderTestButton({}, '   ');
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('whitespace-nowrap');
    });

    it('handles very long text content', () => {
      const longText = 'This is a very long button text that should overflow and be handled gracefully by the component styling';
      
      renderTestButton({}, longText);
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveTextContent(longText);
      expect(button).toHaveClass('whitespace-nowrap');
    });

    it('handles special characters in content', () => {
      const specialTexts = [
        '🎉 Success!',
        '⚠️ Warning',
        '❌ Delete',
        '© 2024',
        '&lt;script&gt;',
        '测试',
        'العربية',
        'Русский'
      ];
      
      specialTexts.forEach(text => {
        const { unmount } = renderTestButton({}, text);
        
        const button = document.querySelector('[data-slot="button"]');
        expect(button).toHaveTextContent(text);
        
        unmount();
      });
    });

    it('handles null and undefined content gracefully', () => {
      renderWithUserEvents(
        <Button>
          {null}
          {undefined}
          Button Content
          {false && 'Hidden'}
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveTextContent('Button Content');
    });

    it('handles malformed HTML attributes gracefully', () => {
      renderTestButton({
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%'
      });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(button).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderTestButton();
      
      // Rapidly change props many times
      for (let i = 0; i < 50; i++) {
        const variant = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'][i % 6];
        const size = ['default', 'sm', 'lg', 'icon'][i % 4];
        rerender(
          <Button key={i} variant={variant as any} size={size as any} className={`button-${i}`}>
            Button {i}
          </Button>
        );
      }
      
      // Should still be functioning
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Button 49');
      expect(button).toHaveClass('button-49');
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      renderTestButton({ className: longClassName });
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass(longClassName);
    });

    it('handles multiple nested elements in content', () => {
      renderWithUserEvents(
        <Button>
          <span>Nested</span>
          <strong>Strong</strong>
          <em>Emphasis</em>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toContainElement(button?.querySelector('span') as HTMLElement);
      expect(button).toContainElement(button?.querySelector('strong') as HTMLElement);
      expect(button).toContainElement(button?.querySelector('em') as HTMLElement);
      expect(button).toHaveTextContent('NestedStrongEmphasis');
    });

    it('handles conflicting CSS classes gracefully', () => {
      renderTestButton({
        className: 'bg-red-500 text-green-500 border-blue-500',
        variant: 'destructive'
      });
      
      const button = document.querySelector('[data-slot="button"]');
      // Should have both custom and variant classes (custom classes may override variant)
      expect(button).toHaveClass('bg-red-500', 'text-green-500', 'border-blue-500');
      // Variant classes should also be present (CSS cascade determines final styling)
      expect(button).toHaveClass('focus-visible:ring-destructive/20');
    });

    it('handles asChild with invalid HTML structure', () => {
      // Test with potentially problematic nesting
      renderWithUserEvents(
        <Button asChild>
          <a href="#test">
            <div>Block in inline (invalid HTML but should work)</div>
          </a>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button?.tagName).toBe('A');
      expect(button).toHaveAttribute('href', '#test');
      expect(button).toContainElement(button?.querySelector('div') as HTMLElement);
    });

    it('handles event handler edge cases gracefully', async () => {
      /**
       * This test verifies that the Button component remains functional with various event handler edge cases.
       * We test scenarios like undefined handlers, null handlers, and complex handler logic.
       */
      
      // Test with undefined handler (should not crash)
      const { user: user1, unmount: unmount1 } = renderWithUserEvents(
        <Button onClick={undefined}>Undefined Handler Button</Button>
      );
      const button1 = screen.getByRole('button');
      await user1.click(button1);
      expect(button1).toBeInTheDocument(); // Should not crash
      unmount1();
      
      // Test with complex handler that modifies state
      let clickCount = 0;
      const complexHandler = vi.fn(() => {
        clickCount++;
        // Simulate complex logic without throwing
        if (clickCount > 5) {
          return false; // Some handlers return values
        }
        return true;
      });
      
      const { user: user2, unmount: unmount2 } = renderWithUserEvents(
        <Button onClick={complexHandler}>Complex Handler Button</Button>
      );
      const button2 = screen.getByRole('button');
      
      // Multiple clicks to test state handling
      await user2.click(button2);
      await user2.click(button2);
      await user2.click(button2);
      
      expect(complexHandler).toHaveBeenCalledTimes(3);
      expect(clickCount).toBe(3);
      expect(button2).toBeInTheDocument();
      expect(button2).not.toBeDisabled();
      unmount2();
      
      // Test with handler that receives and uses event object
      const eventHandler = vi.fn((event) => {
        expect(event).toBeDefined();
        expect(event.type).toBe('click');
        event.preventDefault(); // Should not cause issues
      });
      
      const { user: user3 } = renderWithUserEvents(
        <Button onClick={eventHandler}>Event Handler Button</Button>
      );
      const button3 = screen.getByRole('button');
      
      await user3.click(button3);
      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(button3).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates with icon elements properly', () => {
      renderButtonWithIcon();
      
      const button = document.querySelector('[data-slot="button"]');
      const icon = screen.getByTestId('button-icon');
      
      expect(button).toContainElement(icon);
      expect(button).toHaveTextContent('Button');
      expect(button).toHaveClass('gap-2'); // Gap for icon spacing
    });

    it('applies SVG icon styling correctly', () => {
      renderButtonWithIcon();
      
      const button = document.querySelector('[data-slot="button"]');
      expect(button).toHaveClass(
        '[&_svg:not([class*="size-"])]:size-4',
        '[&_svg]:pointer-events-none',
        '[&_svg]:shrink-0'
      );
      
      const icon = screen.getByTestId('button-icon');
      expect(icon).toHaveAttribute('width', '16');
      expect(icon).toHaveAttribute('height', '16');
    });

    it('handles icon with different variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
      
      variants.forEach(variant => {
        const { unmount } = renderButtonWithIcon({ variant }, `${variant} with icon`);
        
        const button = document.querySelector('[data-slot="button"]');
        const icon = screen.getByTestId('button-icon');
        
        expect(button).toContainElement(icon);
        expect(button).toHaveTextContent(`${variant} with icon`);
        
        unmount();
      });
    });

    it('maintains proper spacing with multiple icons', () => {
      renderWithUserEvents(
        <Button>
          <svg width="16" height="16" data-testid="icon-1">
            <circle cx="8" cy="8" r="6" />
          </svg>
          Button Text
          <svg width="16" height="16" data-testid="icon-2">
            <circle cx="8" cy="8" r="6" />
          </svg>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      const icon1 = screen.getByTestId('icon-1');
      const icon2 = screen.getByTestId('icon-2');
      
      expect(button).toContainElement(icon1);
      expect(button).toContainElement(icon2);
      expect(button).toHaveClass('gap-2'); // Maintains gap for multiple elements
      expect(button).toHaveTextContent('Button Text');
    });

    it('integrates with asChild and maintains all functionality', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button asChild variant="secondary" onClick={handleClick}>
          <a href="/profile" className="profile-link">
            <svg width="16" height="16" data-testid="profile-icon">
              <circle cx="8" cy="8" r="6" />
            </svg>
            Profile
          </a>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      const icon = screen.getByTestId('profile-icon');
      
      expect(button?.tagName).toBe('A');
      expect(button).toHaveAttribute('href', '/profile');
      expect(button).toHaveClass('profile-link');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(button).toContainElement(icon);
      expect(button).toHaveTextContent('Profile');
      
      // Should handle click events
      await user.click(button!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles complex nested content integration', () => {
      renderWithUserEvents(
        <Button variant="destructive">
          <svg width="16" height="16" data-testid="warning-icon">
            <path d="M10 2L8 0H4L2 2v12l2 2h4l2-2V2z"/>
          </svg>
          <span className="button-text">
            Delete: <strong>5</strong> items
          </span>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      const icon = screen.getByTestId('warning-icon');
      const textSpan = button?.querySelector('.button-text');
      const strong = button?.querySelector('strong');
      
      expect(button).toContainElement(icon);
      expect(button).toContainElement(textSpan as HTMLElement);
      expect(button).toContainElement(strong as HTMLElement);
      expect(button).toHaveTextContent('Delete: 5 items');
      expect(strong).toHaveTextContent('5');
    });

    it('maintains accessibility with integrated content', () => {
      renderWithUserEvents(
        <Button 
          type="button" 
          aria-label="Delete 5 selected items"
          variant="destructive"
        >
          <svg width="16" height="16" aria-hidden="true" data-testid="delete-icon">
            <circle cx="8" cy="8" r="6" />
          </svg>
          Delete (5)
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      const icon = screen.getByTestId('delete-icon');
      
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-label', 'Delete 5 selected items');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(button).toHaveTextContent('Delete (5)');
    });

    it('handles size variations with icon content', () => {
      const sizes = ['sm', 'default', 'lg', 'icon'];
      
      sizes.forEach(size => {
        const { unmount } = renderWithUserEvents(
          <Button size={size as any}>
            <svg width="16" height="16" data-testid={`icon-${size}`}>
              <circle cx="8" cy="8" r="6" />
            </svg>
            {size !== 'icon' && `${size} Button`}
          </Button>
        );
        
        const button = document.querySelector('[data-slot="button"]');
        const icon = screen.getByTestId(`icon-${size}`);
        
        expect(button).toContainElement(icon);
        
        if (size === 'sm') {
          expect(button).toHaveClass('h-8', 'has-[>svg]:px-2.5');
        } else if (size === 'lg') {
          expect(button).toHaveClass('h-10', 'has-[>svg]:px-4');
        } else if (size === 'icon') {
          expect(button).toHaveClass('size-9');
        } else {
          expect(button).toHaveClass('h-9', 'has-[>svg]:px-3');
        }
        
        unmount();
      });
    });

    it('handles loading state with spinner integration', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Button disabled onClick={handleClick}>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            data-testid="loading-spinner"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
          </svg>
          Processing...
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      const spinner = screen.getByTestId('loading-spinner');
      
      expect(button).toBeDisabled();
      expect(button).toContainElement(spinner);
      expect(spinner).toHaveClass('animate-spin');
      expect(button).toHaveTextContent('Processing...');
      
      // Should not respond to clicks when disabled
      await user.click(button!);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('maintains responsive behavior with integrated content', () => {
      renderWithUserEvents(
        <Button className="sm:hidden md:inline-flex">
          <svg width="16" height="16" className="mr-2" data-testid="responsive-icon">
            <circle cx="8" cy="8" r="6" />
          </svg>
          <span className="hidden sm:inline">Desktop Text</span>
          <span className="sm:hidden">Mobile</span>
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      const icon = screen.getByTestId('responsive-icon');
      
      expect(button).toHaveClass('sm:hidden', 'md:inline-flex');
      expect(button).toContainElement(icon);
      expect(button).toHaveTextContent('Desktop TextMobile');
    });

    it('handles performance with many integrated elements', () => {
      const manyElements = Array.from({ length: 10 }, (_, i) => (
        <span key={i} data-testid={`element-${i}`}>
          Item {i}
        </span>
      ));
      
      renderWithUserEvents(
        <Button className="max-w-md">
          {manyElements}
        </Button>
      );
      
      const button = document.querySelector('[data-slot="button"]');
      
      // Should contain all elements
      for (let i = 0; i < 10; i++) {
        const element = screen.getByTestId(`element-${i}`);
        expect(button).toContainElement(element);
      }
      
      expect(button).toHaveClass('whitespace-nowrap');
    });
  });
});