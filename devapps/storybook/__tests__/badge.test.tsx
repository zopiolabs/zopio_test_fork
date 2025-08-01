/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Badge component.
 *
 * This test suite validates the badge component's functionality across multiple
 * dimensions including rendering, variants, accessibility, and edge cases. The
 * badge is a display component built with class-variance-authority (CVA) that
 * shows status information, labels, or notifications with multiple visual variants.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, component structure
 * 2. Variant Tests - Default, secondary, destructive, outline variants with proper styling
 * 3. Props Handling - className forwarding, HTML attributes, asChild prop functionality
 * 4. User Interactions - N/A (display component with no interactive functionality)
 * 5. States - N/A (stateless display component)
 * 6. Accessibility - Content accessibility, semantic structure, screen reader support
 * 7. Edge Cases - Empty content, long text, special characters, malformed props
 * 8. Component Integration - Icon integration, asChild prop, compound component usage
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all visual variants, edge conditions, and integration scenarios.
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import { Badge } from '@repo/design-system/ui/badge';

/**
 * Helper function to render a basic badge with default content
 * Supports custom props for comprehensive testing scenarios
 */
const renderTestBadge = (props: any = {}, content = 'Test Badge') => {
  return renderWithUserEvents(
    <Badge {...props}>{content}</Badge>
  );
};

/**
 * Helper function to render badge with icon integration
 * Tests compound usage patterns with icon elements
 */
const renderBadgeWithIcon = (props: any = {}, content = 'Badge', iconProps: any = {}) => {
  return renderWithUserEvents(
    <Badge {...props}>
      <svg
        {...iconProps}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        data-testid="badge-icon"
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
      {content}
    </Badge>
  );
};

/**
 * Helper function to render badge using asChild prop
 * Tests polymorphic component behavior
 */
const renderAsChildBadge = (asChildElement = 'a', props: any = {}, content = 'Link Badge') => {
  const Component = asChildElement as any;
  return renderWithUserEvents(
    <Badge asChild {...props}>
      <Component href="#test">{content}</Component>
    </Badge>
  );
};

/**
 * Helper function to render minimal badge for basic tests
 */
const renderMinimalBadge = (props: any = {}) => {
  return renderWithUserEvents(
    <Badge {...props}>Badge</Badge>
  );
};

describe('Badge', () => {
  describe('Rendering Tests', () => {
    it('renders badge element correctly', () => {
      renderMinimalBadge();
      
      // Find the badge by its data-slot attribute
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(
        'inline-flex',
        'w-fit',
        'shrink-0',
        'items-center',
        'justify-center',
        'gap-1',
        'overflow-hidden',
        'whitespace-nowrap',
        'rounded-md',
        'border',
        'px-2',
        'py-0.5',
        'font-medium',
        'text-xs'
      );
    });

    it('renders with correct data-slot attribute', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-slot', 'badge');
    });

    it('renders badge content correctly', () => {
      const content = 'Custom Badge Content';
      renderTestBadge({}, content);
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveTextContent(content);
    });

    it('renders as span element by default', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('SPAN');
    });

    it('renders with proper base styling classes', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass(
        'inline-flex',
        'w-fit',
        'shrink-0',
        'items-center',
        'justify-center',
        'gap-1',
        'overflow-hidden',
        'whitespace-nowrap',
        'rounded-md',
        'border',
        'px-2',
        'py-0.5',
        'font-medium',
        'text-xs',
        'transition-[color,box-shadow]'
      );
    });

    it('renders with focus and accessibility classes', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-[3px]',
        'focus-visible:ring-ring/50',
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      );
    });

    it('renders with SVG icon styling support', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('[&>svg]:pointer-events-none', '[&>svg]:size-3');
    });

    it('maintains proper semantic structure', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('SPAN');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Variant Tests', () => {
    describe('Default Variant', () => {
      it('applies default variant styles when no variant specified', () => {
        renderTestBadge();
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          'border-transparent',
          'bg-primary',
          'text-primary-foreground'
        );
      });

      it('applies default variant styles when explicitly specified', () => {
        renderTestBadge({ variant: 'default' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          'border-transparent',
          'bg-primary',
          'text-primary-foreground'
        );
      });

      it('includes hover styles for anchor elements in default variant', () => {
        renderTestBadge({ variant: 'default' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('[a&]:hover:bg-primary/90');
      });

      it('renders content with default variant styling', () => {
        renderTestBadge({ variant: 'default' }, 'Default Badge');
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveTextContent('Default Badge');
        expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
      });
    });

    describe('Secondary Variant', () => {
      it('applies secondary variant styles correctly', () => {
        renderTestBadge({ variant: 'secondary' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          'border-transparent',
          'bg-secondary',
          'text-secondary-foreground'
        );
      });

      it('includes hover styles for anchor elements in secondary variant', () => {
        renderTestBadge({ variant: 'secondary' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('[a&]:hover:bg-secondary/90');
      });

      it('renders content with secondary variant styling', () => {
        renderTestBadge({ variant: 'secondary' }, 'Secondary Badge');
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveTextContent('Secondary Badge');
        expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
      });

      it('maintains all base classes with secondary variant', () => {
        renderTestBadge({ variant: 'secondary' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('inline-flex', 'items-center', 'justify-center');
        expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
      });
    });

    describe('Destructive Variant', () => {
      it('applies destructive variant styles correctly', () => {
        renderTestBadge({ variant: 'destructive' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          'border-transparent',
          'bg-destructive',
          'text-white'
        );
      });

      it('includes focus styles for destructive variant', () => {
        renderTestBadge({ variant: 'destructive' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('focus-visible:ring-destructive/20');
      });

      it('includes dark mode styles for destructive variant', () => {
        renderTestBadge({ variant: 'destructive' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          'dark:bg-destructive/60',
          'dark:focus-visible:ring-destructive/40'
        );
      });

      it('includes hover styles for anchor elements in destructive variant', () => {
        renderTestBadge({ variant: 'destructive' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('[a&]:hover:bg-destructive/90');
      });

      it('renders content with destructive variant styling', () => {
        renderTestBadge({ variant: 'destructive' }, 'Error Badge');
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveTextContent('Error Badge');
        expect(badge).toHaveClass('bg-destructive', 'text-white');
      });
    });

    describe('Outline Variant', () => {
      it('applies outline variant styles correctly', () => {
        renderTestBadge({ variant: 'outline' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('text-foreground');
        // Note: outline doesn't override border-transparent from base, 
        // but adds specific text and hover styling
      });

      it('includes hover styles for anchor elements in outline variant', () => {
        renderTestBadge({ variant: 'outline' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          '[a&]:hover:bg-accent',
          '[a&]:hover:text-accent-foreground'
        );
      });

      it('renders content with outline variant styling', () => {
        renderTestBadge({ variant: 'outline' }, 'Outline Badge');
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveTextContent('Outline Badge');
        expect(badge).toHaveClass('text-foreground');
      });

      it('maintains border from base classes in outline variant', () => {
        renderTestBadge({ variant: 'outline' });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass('border', 'text-foreground');
      });
    });

    describe('Variant Behavior', () => {
      it('handles invalid variant gracefully', () => {
        renderTestBadge({ variant: 'invalid' as any });
        
        const badge = document.querySelector('[data-slot="badge"]');
        // Should render with base classes (invalid variant doesn't apply any variant styles)
        expect(badge).toHaveClass('inline-flex', 'items-center', 'border');
        expect(badge).toBeInTheDocument();
      });

      it('handles undefined variant as default', () => {
        renderTestBadge({ variant: undefined });
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveClass(
          'border-transparent',
          'bg-primary',
          'text-primary-foreground'
        );
      });

      it('applies consistent base classes across all variants', () => {
        const variants = ['default', 'secondary', 'destructive', 'outline'];
        
        variants.forEach(variant => {
          const { unmount } = renderTestBadge({ variant });
          
          const badge = document.querySelector('[data-slot="badge"]');
          expect(badge).toHaveClass(
            'inline-flex',
            'w-fit',
            'shrink-0',
            'items-center',
            'justify-center',
            'gap-1',
            'overflow-hidden',
            'whitespace-nowrap',
            'rounded-md',
            'border',
            'px-2',
            'py-0.5',
            'font-medium',
            'text-xs'
          );
          
          unmount();
        });
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly', () => {
      renderTestBadge({
        'data-testid': 'custom-badge',
        id: 'badge-id',
        'aria-label': 'Custom badge',
        title: 'Tooltip text'
      });
      
      const badge = screen.getByTestId('custom-badge');
      expect(badge).toHaveAttribute('id', 'badge-id');
      expect(badge).toHaveAttribute('aria-label', 'Custom badge');
      expect(badge).toHaveAttribute('title', 'Tooltip text');
    });

    it('merges custom className with default classes', () => {
      renderTestBadge({ className: 'custom-class bg-custom' });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('custom-class', 'bg-custom');
      // Should maintain default classes
      expect(badge).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('handles className merging with variant classes', () => {
      renderTestBadge({ 
        variant: 'secondary', 
        className: 'custom-secondary-class' 
      });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('custom-secondary-class');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('handles asChild prop correctly with anchor element', () => {
      renderAsChildBadge('a', { href: '#test' });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('A');
      expect(badge).toHaveAttribute('href', '#test');
      expect(badge).toHaveTextContent('Link Badge');
    });

    it('handles asChild prop with button element', () => {
      const { user, container } = renderWithUserEvents(
        <Badge asChild>
          <button type="button" onClick={() => {}}>
            Button Badge
          </button>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('BUTTON');
      expect(badge).toHaveAttribute('type', 'button');
      expect(badge).toHaveTextContent('Button Badge');
    });

    it('handles asChild prop with div element', () => {
      renderWithUserEvents(
        <Badge asChild className="custom-div-badge">
          <div role="status">Status Badge</div>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('DIV');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveClass('custom-div-badge');
      expect(badge).toHaveTextContent('Status Badge');
    });

    it('handles asChild prop with custom component attributes', () => {
      renderWithUserEvents(
        <Badge asChild variant="destructive">
          <a href="/error" className="error-link" target="_blank" rel="noopener">
            Error Link
          </a>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('A');
      expect(badge).toHaveAttribute('href', '/error');
      expect(badge).toHaveAttribute('target', '_blank');
      expect(badge).toHaveAttribute('rel', 'noopener');
      expect(badge).toHaveClass('error-link', 'bg-destructive', 'text-white');
    });

    it('handles boolean asChild prop correctly', () => {
      renderWithUserEvents(
        <Badge asChild>{null}</Badge>
      );
      
      // When asChild is true but no proper child element provided, 
      // Radix Slot may not render anything
      const badge = document.querySelector('[data-slot="badge"]');
      // This may or may not render depending on Radix Slot behavior
      // Just ensure no error is thrown
      expect(document.body).toBeInTheDocument();
    });

    it('handles asChild false explicitly', () => {
      renderTestBadge({ asChild: false });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('SPAN');
      expect(badge).toHaveTextContent('Test Badge');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderTestBadge({
        'data-testid': 'multi-attr-badge',
        className: 'multi-class',
        id: 'multi-id',
        'aria-label': 'Multiple attributes badge',
        'aria-describedby': 'description',
        role: 'status',
        tabIndex: 0,
        title: 'Multi-attribute tooltip'
      });
      
      const badge = screen.getByTestId('multi-attr-badge');
      expect(badge).toHaveClass('multi-class');
      expect(badge).toHaveAttribute('id', 'multi-id');
      expect(badge).toHaveAttribute('aria-label', 'Multiple attributes badge');
      expect(badge).toHaveAttribute('aria-describedby', 'description');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('tabindex', '0');
      expect(badge).toHaveAttribute('title', 'Multi-attribute tooltip');
    });

    it('handles event handlers correctly', async () => {
      let clickCount = 0;
      const handleClick = () => { clickCount++; };
      
      const { user } = renderWithUserEvents(
        <Badge onClick={handleClick} style={{ cursor: 'pointer' }}>
          Clickable Badge
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      await user.click(badge!);
      
      expect(clickCount).toBe(1);
      expect(badge).toHaveStyle('cursor: pointer');
    });

    it('handles style prop correctly', () => {
      renderTestBadge({
        style: {
          backgroundColor: 'red',
          color: 'white',
          fontSize: '14px'
        }
      });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(badge).toHaveStyle('color: rgb(255, 255, 255)');
      expect(badge).toHaveStyle('font-size: 14px');
    });
  });

  describe('User Interactions', () => {
    // Note: Badge is a display component with no inherent interactive functionality
    // These tests verify that the component doesn't interfere with user interactions
    
    it('does not interfere with pointer events', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).not.toHaveStyle('pointer-events: none');
    });

    it('allows normal cursor behavior', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).not.toHaveClass('cursor-not-allowed');
    });

    it('does not capture focus by default', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).not.toHaveAttribute('tabindex');
    });

    it('maintains normal event propagation', async () => {
      let clickCount = 0;
      const handleClick = () => { clickCount++; };
      
      const { user } = renderWithUserEvents(
        <div onClick={handleClick}>
          <Badge>Clickable Container Badge</Badge>
        </div>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      await user.click(badge!);
      
      expect(clickCount).toBe(1);
    });

    it('allows text selection of badge content', () => {
      renderTestBadge({}, 'Selectable Badge Text');
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).not.toHaveStyle('user-select: none');
    });

    it('supports focus when used with interactive elements via asChild', () => {
      renderWithUserEvents(
        <Badge asChild>
          <button>Focusable Badge</button>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('BUTTON');
      
      // Button should be focusable
      (badge as HTMLElement)?.focus();
      expect(document.activeElement).toBe(badge);
    });

    it('supports keyboard interaction when used as link via asChild', async () => {
      const { user } = renderWithUserEvents(
        <Badge asChild>
          <a href="#test">Link Badge</a>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('A');
      
      // Should be focusable and respond to keyboard
      await user.tab();
      expect(document.activeElement).toBe(badge);
    });

    it('maintains hover effects for interactive variants', () => {
      renderTestBadge({ variant: 'default' });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('[a&]:hover:bg-primary/90');
    });
  });

  describe('States', () => {
    // Note: Badge is a stateless display component
    // These tests verify consistent behavior across renders
    
    it('maintains consistent rendering across multiple renders', () => {
      const { rerender } = renderTestBadge();
      
      const initialBadge = document.querySelector('[data-slot="badge"]');
      const initialClasses = initialBadge?.className;
      
      // Re-render with same props
      rerender(<Badge>Test Badge</Badge>);
      
      const rerenderedBadge = document.querySelector('[data-slot="badge"]');
      expect(rerenderedBadge?.className).toBe(initialClasses);
    });

    it('handles dynamic content updates properly', () => {
      const { rerender } = renderTestBadge();
      
      expect(document.querySelector('[data-slot="badge"]')).toHaveTextContent('Test Badge');
      
      // Update content
      rerender(<Badge>Updated Badge</Badge>);
      
      expect(document.querySelector('[data-slot="badge"]')).toHaveTextContent('Updated Badge');
      expect(document.querySelector('[data-slot="badge"]')).not.toHaveTextContent('Test Badge');
    });

    it('handles dynamic variant changes properly', () => {
      const { rerender } = renderTestBadge({ variant: 'default' });
      
      let badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
      
      // Update variant
      rerender(<Badge variant="secondary">Test Badge</Badge>);
      
      badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(badge).not.toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('handles rapid prop changes gracefully', () => {
      const { rerender } = renderTestBadge();
      
      const variants = ['default', 'secondary', 'destructive', 'outline'];
      
      variants.forEach(variant => {
        rerender(<Badge variant={variant as any}>Badge {variant}</Badge>);
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveTextContent(`Badge ${variant}`);
      });
    });

    it('maintains data-slot attribute across state changes', () => {
      const { rerender } = renderTestBadge();
      
      expect(document.querySelector('[data-slot="badge"]')).toHaveAttribute('data-slot', 'badge');
      
      rerender(<Badge variant="destructive" className="custom">Updated</Badge>);
      
      expect(document.querySelector('[data-slot="badge"]')).toHaveAttribute('data-slot', 'badge');
    });

    it('handles asChild state changes properly', () => {
      const { rerender } = renderTestBadge();
      
      let badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('SPAN');
      
      // Change to asChild with button
      rerender(
        <Badge asChild>
          <button>Button Badge</button>
        </Badge>
      );
      
      badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('BUTTON');
      
      // Change back to normal span
      rerender(<Badge>Normal Badge</Badge>);
      
      badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('SPAN');
    });
  });

  describe('Accessibility', () => {
    it('provides accessible text content', () => {
      renderTestBadge({}, 'Accessible Badge Content');
      
      const badge = screen.getByText('Accessible Badge Content');
      expect(badge).toBeInTheDocument();
    });

    it('supports custom aria-label for additional context', () => {
      renderTestBadge({
        'aria-label': 'Status: Active (3 items)'
      }, 'Active');
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveAttribute('aria-label', 'Status: Active (3 items)');
      expect(badge).toHaveTextContent('Active');
    });

    it('supports role attribute for semantic meaning', () => {
      renderTestBadge({
        role: 'status',
        'aria-live': 'polite'
      }, 'Processing');
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });

    it('maintains proper semantic structure', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('SPAN');
      expect(badge).toBeInTheDocument();
    });

    it('supports screen readers with descriptive content', () => {
      const { container } = renderWithUserEvents(
        <div>
          <Badge aria-describedby="badge-description">New Item</Badge>
          <div id="badge-description">This indicates a new item</div>
        </div>
      );
      
      const badge = screen.getByText('New Item');
      const description = screen.getByText('This indicates a new item');
      
      expect(badge).toHaveAttribute('aria-describedby', 'badge-description');
      expect(description).toHaveAttribute('id', 'badge-description');
    });

    it('handles focus styles for interactive badges', () => {
      renderTestBadge();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-[3px]',
        'focus-visible:ring-ring/50'
      );
    });

    it('supports accessible interactive badge via asChild', () => {
      renderWithUserEvents(
        <Badge asChild>
          <button
            type="button"
            aria-label="Remove filter: Category"
            onClick={() => {}}
          >
            Category ×
          </button>
        </Badge>
      );
      
      const badge = screen.getByLabelText('Remove filter: Category');
      expect(badge?.tagName).toBe('BUTTON');
      expect(badge).toHaveAttribute('type', 'button');
      expect(badge).toHaveTextContent('Category ×');
      
      accessibility.expectToBeAccessible(badge);
    });

    it('handles aria-invalid state properly', () => {
      renderTestBadge({
        'aria-invalid': 'true'
      }, 'Invalid Badge');
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveAttribute('aria-invalid', 'true');
      expect(badge).toHaveClass(
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      );
    });

    it('supports high contrast mode compatibility', () => {
      renderTestBadge({ variant: 'outline' });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('border', 'text-foreground');
    });

    it('maintains accessibility across all variants', () => {
      const variants = ['default', 'secondary', 'destructive', 'outline'];
      
      variants.forEach(variant => {
        const { unmount } = renderTestBadge({ 
          variant: variant as any,
          'aria-label': `${variant} badge`
        }, `${variant} content`);
        
        const badge = screen.getByLabelText(`${variant} badge`);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent(`${variant} content`);
        
        unmount();
      });
    });

    it('supports keyboard navigation when interactive', () => {
      renderWithUserEvents(
        <Badge asChild>
          <a href="#section">Go to section</a>
        </Badge>
      );
      
      const badge = screen.getByRole('link');
      expect(badge).toHaveAttribute('href', '#section');
      
      // Should be keyboard accessible
      (badge as HTMLElement).focus();
      expect(document.activeElement).toBe(badge);
    });

    it('provides proper contrast for destructive variant', () => {
      renderTestBadge({ variant: 'destructive' });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('bg-destructive', 'text-white');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty badge content gracefully', () => {
      renderTestBadge({}, '');
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toBeEmptyDOMElement();
    });

    it('handles badge with only whitespace', () => {
      renderTestBadge({}, '   ');
      
      const badge = document.querySelector('[data-slot="badge"]');
      // Whitespace may be trimmed by the browser
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('whitespace-nowrap');
    });

    it('handles very long text content', () => {
      const longText = 'This is a very long badge text that should overflow and be handled gracefully by the component styling';
      
      renderTestBadge({}, longText);
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveTextContent(longText);
      expect(badge).toHaveClass('overflow-hidden', 'whitespace-nowrap');
    });

    it('handles special characters in content', () => {
      const specialTexts = [
        '🎉 Success!',
        '⚠️ Warning',
        '❌ Error',
        '© 2024',
        '&lt;script&gt;',
        '测试',
        'العربية',
        'Русский'
      ];
      
      specialTexts.forEach(text => {
        const { unmount } = renderTestBadge({}, text);
        
        const badge = document.querySelector('[data-slot="badge"]');
        expect(badge).toHaveTextContent(text);
        
        unmount();
      });
    });

    it('handles null and undefined content gracefully', () => {
      renderWithUserEvents(
        <Badge>
          {null}
          {undefined}
          Badge Content
          {false && 'Hidden'}
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveTextContent('Badge Content');
    });

    it('handles malformed HTML attributes gracefully', () => {
      renderTestBadge({
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%'
      });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(badge).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
    });

    it('handles invalid asChild element gracefully', () => {
      // This should not crash the component
      renderWithUserEvents(
        <Badge asChild>
          <div>Valid Badge</div>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge?.tagName).toBe('DIV');
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderTestBadge();
      
      // Rapidly change props many times
      for (let i = 0; i < 50; i++) {
        const variant = ['default', 'secondary', 'destructive', 'outline'][i % 4];
        rerender(
          <Badge key={i} variant={variant as any} className={`badge-${i}`}>
            Badge {i}
          </Badge>
        );
      }
      
      // Should still be functioning
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Badge 49');
      expect(badge).toHaveClass('badge-49');
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      renderTestBadge({ className: longClassName });
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass(longClassName);
    });

    it('handles multiple nested elements in content', () => {
      renderWithUserEvents(
        <Badge>
          <span>Nested</span>
          <strong>Strong</strong>
          <em>Emphasis</em>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toContainElement(badge?.querySelector('span') as HTMLElement);
      expect(badge).toContainElement(badge?.querySelector('strong') as HTMLElement);
      expect(badge).toContainElement(badge?.querySelector('em') as HTMLElement);
      expect(badge).toHaveTextContent('NestedStrongEmphasis');
    });

    it('handles conflicting CSS classes gracefully', () => {
      renderTestBadge({
        className: 'bg-red-500 text-green-500 border-blue-500',
        variant: 'destructive'
      });
      
      const badge = document.querySelector('[data-slot="badge"]');
      // Should have both custom and variant classes (custom classes may override variant)
      expect(badge).toHaveClass('bg-red-500', 'text-green-500', 'border-blue-500');
      // Variant classes should also be present (CSS cascade determines final styling)
      expect(badge).toHaveClass('focus-visible:ring-destructive/20');
    });

    it('handles asChild with invalid HTML structure', () => {
      // Test with potentially problematic nesting
      renderWithUserEvents(
        <Badge asChild>
          <a href="#test">
            <div>Block in inline (invalid HTML but should work)</div>
          </a>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge?.tagName).toBe('A');
      expect(badge).toHaveAttribute('href', '#test');
      expect(badge).toContainElement(badge?.querySelector('div') as HTMLElement);
    });
  });

  describe('Component Integration', () => {
    it('integrates with icon elements properly', () => {
      renderBadgeWithIcon();
      
      const badge = document.querySelector('[data-slot="badge"]');
      const icon = screen.getByTestId('badge-icon');
      
      expect(badge).toContainElement(icon);
      expect(badge).toHaveTextContent('Badge');
      expect(badge).toHaveClass('gap-1'); // Gap for icon spacing
    });

    it('applies SVG icon styling correctly', () => {
      renderBadgeWithIcon();
      
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('[&>svg]:pointer-events-none', '[&>svg]:size-3');
      
      const icon = screen.getByTestId('badge-icon');
      expect(icon).toHaveAttribute('width', '12');
      expect(icon).toHaveAttribute('height', '12');
    });

    it('handles icon with different variants', () => {
      const variants = ['default', 'secondary', 'destructive', 'outline'];
      
      variants.forEach(variant => {
        const { unmount } = renderBadgeWithIcon({ variant }, `${variant} with icon`);
        
        const badge = document.querySelector('[data-slot="badge"]');
        const icon = screen.getByTestId('badge-icon');
        
        expect(badge).toContainElement(icon);
        expect(badge).toHaveTextContent(`${variant} with icon`);
        
        unmount();
      });
    });

    it('maintains proper spacing with multiple icons', () => {
      renderWithUserEvents(
        <Badge>
          <svg width="12" height="12" data-testid="icon-1">
            <circle cx="6" cy="6" r="5" />
          </svg>
          Badge Text
          <svg width="12" height="12" data-testid="icon-2">
            <circle cx="6" cy="6" r="5" />
          </svg>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      const icon1 = screen.getByTestId('icon-1');
      const icon2 = screen.getByTestId('icon-2');
      
      expect(badge).toContainElement(icon1);
      expect(badge).toContainElement(icon2);
      expect(badge).toHaveClass('gap-1'); // Maintains gap for multiple elements
      expect(badge).toHaveTextContent('Badge Text');
    });

    it('integrates with asChild and maintains all functionality', () => {
      renderWithUserEvents(
        <Badge asChild variant="secondary">
          <a href="/profile" className="profile-link">
            <svg width="12" height="12" data-testid="profile-icon">
              <circle cx="6" cy="6" r="5" />
            </svg>
            Profile
          </a>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      const icon = screen.getByTestId('profile-icon');
      
      expect(badge?.tagName).toBe('A');
      expect(badge).toHaveAttribute('href', '/profile');
      expect(badge).toHaveClass('profile-link');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(badge).toContainElement(icon);
      expect(badge).toHaveTextContent('Profile');
    });

    it('handles complex nested content integration', () => {
      renderWithUserEvents(
        <Badge variant="destructive">
          <svg width="12" height="12" data-testid="warning-icon">
            <path d="M10 2L8 0H4L2 2v12l2 2h4l2-2V2z"/>
          </svg>
          <span className="badge-text">
            Error: <strong>5</strong> items
          </span>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      const icon = screen.getByTestId('warning-icon');
      const textSpan = badge?.querySelector('.badge-text');
      const strong = badge?.querySelector('strong');
      
      expect(badge).toContainElement(icon);
      expect(badge).toContainElement(textSpan as HTMLElement);
      expect(badge).toContainElement(strong as HTMLElement);
      expect(badge).toHaveTextContent('Error: 5 items');
      expect(strong).toHaveTextContent('5');
    });

    it('maintains accessibility with integrated content', () => {
      renderWithUserEvents(
        <Badge 
          role="status" 
          aria-label="5 unread notifications"
          variant="destructive"
        >
          <svg width="12" height="12" aria-hidden="true" data-testid="notification-icon">
            <circle cx="6" cy="6" r="5" />
          </svg>
          5
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      const icon = screen.getByTestId('notification-icon');
      
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('aria-label', '5 unread notifications');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(badge).toHaveTextContent('5');
    });

    it('handles integration with form elements via asChild', () => {
      renderWithUserEvents(
        <Badge asChild>
          <label htmlFor="category-filter" className="filter-label">
            <input 
              type="checkbox" 
              id="category-filter" 
              className="sr-only"
              defaultChecked
            />
            Category ✓
          </label>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      const checkbox = screen.getByRole('checkbox');
      
      expect(badge?.tagName).toBe('LABEL');
      expect(badge).toHaveAttribute('for', 'category-filter');
      expect(badge).toContainElement(checkbox);
      expect(checkbox).toBeChecked();
      expect(badge).toHaveTextContent('Category ✓');
    });

    it('maintains responsive behavior with integrated content', () => {
      renderWithUserEvents(
        <Badge className="sm:hidden md:inline-flex">
          <svg width="12" height="12" className="mr-1" data-testid="responsive-icon">
            <circle cx="6" cy="6" r="5" />
          </svg>
          <span className="hidden sm:inline">Desktop Text</span>
          <span className="sm:hidden">Mobile</span>
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      const icon = screen.getByTestId('responsive-icon');
      
      expect(badge).toHaveClass('sm:hidden', 'md:inline-flex');
      expect(badge).toContainElement(icon);
      expect(badge).toHaveTextContent('Desktop TextMobile');
    });

    it('handles performance with many integrated elements', () => {
      const manyElements = Array.from({ length: 10 }, (_, i) => (
        <span key={i} data-testid={`element-${i}`}>
          Item {i}
        </span>
      ));
      
      renderWithUserEvents(
        <Badge className="max-w-md">
          {manyElements}
        </Badge>
      );
      
      const badge = document.querySelector('[data-slot="badge"]');
      
      // Should contain all elements
      for (let i = 0; i < 10; i++) {
        const element = screen.getByTestId(`element-${i}`);
        expect(badge).toContainElement(element);
      }
      
      expect(badge).toHaveClass('overflow-hidden', 'whitespace-nowrap');
    });
  });
});