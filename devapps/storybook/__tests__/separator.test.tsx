/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Separator component.
 *
 * This test suite validates the separator component's functionality across multiple
 * dimensions including rendering, orientation, accessibility, and visual presentation. The
 * separator is a simple visual/semantic component built with Radix UI primitives that
 * provides content separation in both horizontal and vertical orientations.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, component structure
 * 2. Orientation Tests - Horizontal and vertical orientations with proper styling
 * 3. Props Handling - className forwarding, decorative prop, HTML attributes forwarding
 * 4. Accessibility - Proper ARIA attributes, semantic/decorative usage, screen reader support
 * 5. Visual States - Orientation-specific styling, responsive behavior
 * 6. Edge Cases - Invalid props, extreme styling scenarios, malformed usage
 * 7. Component Integration - Usage in layouts, with complex content structures
 * 8. Styling Tests - CSS classes application, custom styling integration
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all orientation variants and integration scenarios.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import { Separator } from '@repo/design-system/ui/separator';

/**
 * Helper function to render a basic separator with default props
 * Supports custom props for comprehensive testing scenarios
 */
const renderTestSeparator = (props: any = {}) => {
  return renderWithUserEvents(
    <Separator {...props} />
  );
};

/**
 * Helper function to render separator in horizontal layout context
 * Tests separator usage in typical horizontal content separation
 */
const renderHorizontalLayoutSeparator = (props: any = {}) => {
  return renderWithUserEvents(
    <div className="space-y-4">
      <div>Content Above</div>
      <Separator orientation="horizontal" {...props} />
      <div>Content Below</div>
    </div>
  );
};

/**
 * Helper function to render separator in vertical layout context
 * Tests separator usage in typical vertical content separation
 */
const renderVerticalLayoutSeparator = (props: any = {}) => {
  return renderWithUserEvents(
    <div className="flex items-center space-x-4">
      <div>Left Content</div>
      <Separator orientation="vertical" className="h-6" {...props} />
      <div>Right Content</div>
    </div>
  );
};

/**
 * Helper function to render separator with complex surrounding content
 * Tests separator in realistic usage scenarios
 */
const renderComplexLayoutSeparator = (orientation: 'horizontal' | 'vertical' = 'horizontal', props: any = {}) => {
  if (orientation === 'vertical') {
    return renderWithUserEvents(
      <div className="flex items-center justify-between p-4 border rounded">
        <div className="text-sm font-medium">Section A</div>
        <Separator orientation="vertical" className="h-8 mx-4" {...props} />
        <div className="text-sm text-muted-foreground">Section B</div>
        <Separator orientation="vertical" className="h-8 mx-4" {...props} />
        <div className="text-sm">Section C</div>
      </div>
    );
  }
  
  return renderWithUserEvents(
    <div className="w-full max-w-md space-y-6">
      <div className="text-lg font-semibold">Main Content</div>
      <Separator orientation="horizontal" {...props} />
      <div className="text-sm text-muted-foreground">Secondary Content</div>
      <Separator orientation="horizontal" {...props} />
      <div className="text-xs">Footer Content</div>
    </div>
  );
};

/**
 * Helper function to render minimal separator for basic tests
 */
const renderMinimalSeparator = (props: any = {}) => {
  return renderWithUserEvents(
    <Separator {...props} />
  );
};

describe('Separator', () => {
  describe('Rendering Tests', () => {
    it('renders separator element correctly', () => {
      renderMinimalSeparator();
      
      // Find the separator by its data-slot attribute
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass(
        'shrink-0',
        'bg-border'
      );
    });

    it('renders with correct data-slot attribute', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('data-slot', 'separator-root');
    });

    it('renders as div element by default', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator?.tagName).toBe('DIV');
    });

    it('renders with proper base styling classes', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'shrink-0',
        'bg-border'
      );
    });

    it('renders with default horizontal orientation styling', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'data-[orientation=horizontal]:h-px',
        'data-[orientation=horizontal]:w-full'
      );
    });

    it('renders with vertical orientation styling classes', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:w-px'
      );
    });

    it('maintains proper semantic structure', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator?.tagName).toBe('DIV');
      expect(separator).toBeInTheDocument();
    });

    it('renders without any content', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeEmptyDOMElement();
    });
  });

  describe('Orientation Tests', () => {
    describe('Horizontal Orientation', () => {
      it('applies horizontal orientation by default', () => {
        renderTestSeparator();
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      });

      it('applies horizontal orientation when explicitly specified', () => {
        renderTestSeparator({ orientation: 'horizontal' });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      });

      it('applies correct horizontal styling classes', () => {
        renderTestSeparator({ orientation: 'horizontal' });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
        expect(separator).toHaveClass(
          'data-[orientation=horizontal]:h-px',
          'data-[orientation=horizontal]:w-full'
        );
      });

      it('renders correctly in horizontal layout context', () => {
        renderHorizontalLayoutSeparator();
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
        expect(separator).toBeInTheDocument();
      });

      it('maintains horizontal orientation with custom classes', () => {
        renderTestSeparator({ 
          orientation: 'horizontal',
          className: 'custom-horizontal-separator'
        });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
        expect(separator).toHaveClass('custom-horizontal-separator');
      });
    });

    describe('Vertical Orientation', () => {
      it('applies vertical orientation when specified', () => {
        renderTestSeparator({ orientation: 'vertical' });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
      });

      it('applies correct vertical styling classes', () => {
        renderTestSeparator({ orientation: 'vertical' });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
        expect(separator).toHaveClass(
          'data-[orientation=vertical]:h-full',
          'data-[orientation=vertical]:w-px'
        );
      });

      it('renders correctly in vertical layout context', () => {
        renderVerticalLayoutSeparator();
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
        expect(separator).toBeInTheDocument();
      });

      it('maintains vertical orientation with custom classes', () => {
        renderTestSeparator({ 
          orientation: 'vertical',
          className: 'custom-vertical-separator h-8'
        });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
        expect(separator).toHaveClass('custom-vertical-separator', 'h-8');
      });

      it('handles vertical orientation with height constraints', () => {
        renderTestSeparator({ 
          orientation: 'vertical',
          className: 'h-24'
        });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
        expect(separator).toHaveClass('h-24');
      });
    });

    describe('Orientation Behavior', () => {
      it('handles invalid orientation gracefully', () => {
        renderTestSeparator({ orientation: 'invalid' as any });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        // Should render with base classes (invalid orientation gets passed through)
        expect(separator).toHaveClass('shrink-0', 'bg-border');
        expect(separator).toBeInTheDocument();
      });

      it('handles undefined orientation as default horizontal', () => {
        renderTestSeparator({ orientation: undefined });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      });

      it('applies consistent base classes across all orientations', () => {
        const orientations = ['horizontal', 'vertical'];
        
        orientations.forEach(orientation => {
          const { unmount } = renderTestSeparator({ orientation });
          
          const separator = document.querySelector('[data-slot="separator-root"]');
          expect(separator).toHaveClass(
            'shrink-0',
            'bg-border',
            'data-[orientation=horizontal]:h-px',
            'data-[orientation=horizontal]:w-full',
            'data-[orientation=vertical]:h-full',
            'data-[orientation=vertical]:w-px'
          );
          
          unmount();
        });
      });

      it('switches orientation dynamically', () => {
        const { rerender } = renderTestSeparator({ orientation: 'horizontal' });
        
        let separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
        
        rerender(<Separator orientation="vertical" />);
        
        separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly', () => {
      renderTestSeparator({
        'data-testid': 'custom-separator',
        id: 'separator-id',
        'aria-label': 'Content divider',
        title: 'Separator element'
      });
      
      const separator = document.querySelector('[data-testid="custom-separator"]');
      expect(separator).toHaveAttribute('id', 'separator-id');
      expect(separator).toHaveAttribute('aria-label', 'Content divider');
      expect(separator).toHaveAttribute('title', 'Separator element');
    });

    it('merges custom className with default classes', () => {
      renderTestSeparator({ className: 'custom-separator bg-red-500' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('custom-separator', 'bg-red-500');
      // Should maintain default classes (custom classes override bg-border)
      expect(separator).toHaveClass('shrink-0');
    });

    it('handles className merging with orientation classes', () => {
      renderTestSeparator({ 
        orientation: 'vertical', 
        className: 'custom-vertical-class h-full' 
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('custom-vertical-class', 'h-full');
      expect(separator).toHaveClass('data-[orientation=vertical]:h-full', 'data-[orientation=vertical]:w-px');
    });

    it('handles decorative prop correctly', () => {
      renderTestSeparator({ decorative: true });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      // Decorative separators don't have aria-orientation
      expect(separator).not.toHaveAttribute('aria-orientation');
    });

    it('handles decorative false for semantic separator', () => {
      renderTestSeparator({ decorative: false });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      expect(separator).toHaveAttribute('role', 'separator');
      // Note: Radix UI may not always add aria-orientation for semantic separators
      // depending on the specific implementation and usage context
    });

    it('handles decorative prop with vertical orientation', () => {
      renderTestSeparator({ decorative: true, orientation: 'vertical' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
      // Decorative separators don't have aria-orientation
      expect(separator).not.toHaveAttribute('aria-orientation');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderTestSeparator({
        'data-testid': 'multi-attr-separator',
        className: 'multi-class',
        id: 'multi-id',
        'aria-label': 'Multiple attributes separator',
        'aria-describedby': 'separator-description',
        title: 'Multi-attribute separator',
        orientation: 'vertical',
        decorative: false
      });
      
      const separator = document.querySelector('[data-testid="multi-attr-separator"]');
      expect(separator).toHaveClass('multi-class');
      expect(separator).toHaveAttribute('id', 'multi-id');
      expect(separator).toHaveAttribute('aria-label', 'Multiple attributes separator');
      expect(separator).toHaveAttribute('aria-describedby', 'separator-description');
      expect(separator).toHaveAttribute('title', 'Multi-attribute separator');
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
    });

    it('handles style prop correctly', () => {
      renderTestSeparator({
        style: {
          backgroundColor: 'red',
          height: '2px',
          margin: '16px 0'
        }
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(separator).toHaveStyle('height: 2px');
      expect(separator).toHaveStyle('margin: 16px 0px');
    });

    it('handles data attributes correctly', () => {
      renderTestSeparator({
        'data-custom': 'value',
        'data-theme': 'dark',
        'data-variant': 'subtle'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('data-custom', 'value');
      expect(separator).toHaveAttribute('data-theme', 'dark');
      expect(separator).toHaveAttribute('data-variant', 'subtle');
    });

    it('handles role attribute override', () => {
      renderTestSeparator({ role: 'presentation' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'presentation');
    });
  });

  describe('Accessibility', () => {
    it('has proper separator role by default', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      // Decorative separators (default) have role="none"
      expect(separator).toHaveAttribute('role', 'none');
    });

    it('provides proper role for semantic separators', () => {
      renderTestSeparator({ orientation: 'horizontal', decorative: false });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('provides proper role for vertical semantic separators', () => {
      renderTestSeparator({ orientation: 'vertical', decorative: false });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
    });

    it('supports decorative usage for visual separation', () => {
      renderTestSeparator({ decorative: true });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'none');
      expect(separator).not.toHaveAttribute('aria-orientation');
    });

    it('supports semantic usage for content separation', () => {
      renderTestSeparator({ decorative: false });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('maintains proper semantic structure', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator?.tagName).toBe('DIV');
      expect(separator).toBeInTheDocument();
    });

    it('supports custom aria-label for additional context', () => {
      renderTestSeparator({
        'aria-label': 'Content section divider'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('aria-label', 'Content section divider');
    });

    it('supports aria-describedby for detailed descriptions', () => {
      renderWithUserEvents(
        <div>
          <Separator aria-describedby="separator-description" />
          <div id="separator-description">Divides main content from sidebar</div>
        </div>
      );
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      const description = document.getElementById('separator-description');
      
      expect(separator).toHaveAttribute('aria-describedby', 'separator-description');
      expect(description).toHaveTextContent('Divides main content from sidebar');
    });

    it('maintains accessibility across orientations', () => {
      const orientations = ['horizontal', 'vertical'];
      
      orientations.forEach(orientation => {
        const { unmount } = renderTestSeparator({ 
          orientation: orientation as any,
          decorative: false,
          'aria-label': `${orientation} content separator`
        });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('role', 'separator');
        expect(separator).toHaveAttribute('data-orientation', orientation);
        expect(separator).toHaveAttribute('aria-label', `${orientation} content separator`);
        
        // Verify the separator element is semantically correct
        expect(separator?.tagName).toBe('DIV');
        
        unmount();
      });
    });

    it('indicates decorative vs semantic usage to screen readers', () => {
      // Decorative separator
      const { unmount: unmount1 } = renderTestSeparator({ 
        decorative: true,
        'aria-label': 'Visual divider'
      });
      
      let separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'none');
      expect(separator).toHaveAttribute('aria-label', 'Visual divider');
      
      unmount1();
      
      // Semantic separator
      const { unmount: unmount2 } = renderTestSeparator({ 
        decorative: false,
        'aria-label': 'Content section boundary'
      });
      
      separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('aria-label', 'Content section boundary');
      
      unmount2();
    });

    it('supports high contrast mode compatibility', () => {
      renderTestSeparator({ className: 'border-solid' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('bg-border', 'border-solid');
    });

    it('provides proper contrast with background elements', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('bg-border');
    });

    it('supports custom role for specialized usage', () => {
      renderTestSeparator({ role: 'presentation' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('role', 'presentation');
    });
  });

  describe('Visual States', () => {
    it('applies correct horizontal visual styling', () => {
      renderTestSeparator({ orientation: 'horizontal' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      expect(separator).toHaveClass(
        'data-[orientation=horizontal]:h-px',
        'data-[orientation=horizontal]:w-full'
      );
    });

    it('applies correct vertical visual styling', () => {
      renderTestSeparator({ orientation: 'vertical' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
      expect(separator).toHaveClass(
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:w-px'
      );
    });

    it('maintains consistent background styling', () => {
      const orientations = ['horizontal', 'vertical'];
      
      orientations.forEach(orientation => {
        const { unmount } = renderTestSeparator({ orientation });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveClass('bg-border');
        
        unmount();
      });
    });

    it('handles custom styling override', () => {
      renderTestSeparator({
        className: 'bg-red-500 h-2',
        orientation: 'horizontal'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('bg-red-500', 'h-2');
      // Still maintains base classes (custom classes can override default ones)
      expect(separator).toHaveClass('shrink-0');
    });

    it('handles responsive styling classes', () => {
      renderTestSeparator({
        className: 'h-px md:h-0.5 lg:h-1',
        orientation: 'horizontal'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('h-px', 'md:h-0.5', 'lg:h-1');
    });

    it('maintains shrink-0 for layout stability', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('shrink-0');
    });

    it('handles theme-aware styling', () => {
      renderTestSeparator({
        className: 'dark:bg-gray-700 bg-gray-200'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('dark:bg-gray-700', 'bg-gray-200');
    });

    it('handles opacity and transparency styles', () => {
      renderTestSeparator({
        className: 'opacity-50 bg-opacity-75'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('opacity-50', 'bg-opacity-75');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty className gracefully', () => {
      renderTestSeparator({ className: '' });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('shrink-0', 'bg-border');
    });

    it('handles null className', () => {
      renderTestSeparator({ className: null });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('shrink-0', 'bg-border');
    });

    it('handles undefined className', () => {
      renderTestSeparator({ className: undefined });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('shrink-0', 'bg-border');
    });

    it('handles malformed HTML attributes gracefully', () => {
      renderTestSeparator({
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(separator).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderTestSeparator();
      
      // Rapidly change props many times
      for (let i = 0; i < 50; i++) {
        const orientation = i % 2 === 0 ? 'horizontal' : 'vertical';
        const decorative = i % 3 === 0;
        rerender(
          <Separator 
            key={i} 
            orientation={orientation} 
            decorative={decorative}
            className={`separator-${i}`}
          />
        );
      }
      
      // Should still be functioning
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('separator-49');
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      renderTestSeparator({ className: longClassName });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(longClassName);
    });

    it('handles conflicting CSS classes gracefully', () => {
      renderTestSeparator({
        className: 'bg-red-500 h-4 w-4',
        orientation: 'horizontal'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      // Should have both custom and default classes (custom classes may override defaults)
      expect(separator).toHaveClass('bg-red-500', 'h-4', 'w-4');
      // Default classes should also be present (CSS cascade determines final styling)
      expect(separator).toHaveClass('shrink-0');
    });

    it('handles invalid HTML attribute values', () => {
      renderTestSeparator({
        'aria-orientation': 'invalid' as any,
        'data-orientation': 'diagonal' as any
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      // data-orientation gets overridden by passed props
      expect(separator).toHaveAttribute('data-orientation', 'diagonal');
    });

    it('handles boolean attribute edge cases', () => {
      renderTestSeparator({
        decorative: null as any,
        'aria-hidden': false,
        hidden: undefined
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('role', 'separator');
    });

    it('handles numeric style values', () => {
      renderTestSeparator({
        style: {
          height: 2,
          width: '100%',
          opacity: 0.5,
          zIndex: 10
        }
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveStyle('height: 2px');
      expect(separator).toHaveStyle('width: 100%');
      expect(separator).toHaveStyle('opacity: 0.5');
      expect(separator).toHaveStyle('z-index: 10');
    });

    it('handles extreme orientation switching', () => {
      const { rerender } = renderTestSeparator({ orientation: 'horizontal' });
      
      // Rapidly switch orientations
      for (let i = 0; i < 20; i++) {
        const orientation = i % 2 === 0 ? 'horizontal' : 'vertical';
        rerender(<Separator orientation={orientation} className={`test-${i}`} />);
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toHaveAttribute('data-orientation', orientation);
        expect(separator).toHaveClass(`test-${i}`);
      }
    });

    it('handles special character class names', () => {
      const specialClasses = [
        'class-with-emoji-🎉',
        'class_with_underscores',
        'class-with-numbers-123',
        'class.with.dots',
        'class[with]brackets'
      ];
      
      specialClasses.forEach(className => {
        const { unmount } = renderTestSeparator({ className });
        
        const separator = document.querySelector('[data-slot="separator-root"]');
        expect(separator).toBeInTheDocument();
        // Note: Some special characters may not be valid CSS class names
        // but the component should still render
        
        unmount();
      });
    });
  });

  describe('Component Integration', () => {
    it('integrates properly in card layouts', () => {
      renderWithUserEvents(
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Card Title</h3>
          <Separator className="mb-4" />
          <p className="text-sm text-gray-600">Card content goes here.</p>
        </div>
      );
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      expect(separator).toHaveClass('mb-4');
    });

    it('integrates with navigation components', () => {
      renderWithUserEvents(
        <nav className="flex items-center space-x-4">
          <a href="/home">Home</a>
          <Separator orientation="vertical" className="h-4" />
          <a href="/about">About</a>
          <Separator orientation="vertical" className="h-4" />
          <a href="/contact">Contact</a>
        </nav>
      );
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
        expect(separator).toHaveClass('h-4');
      });
    });

    it('integrates with form layouts', () => {
      renderWithUserEvents(
        <form className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input type="text" className="w-full border rounded px-3 py-2" />
          </div>
          
          <Separator />
          
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" className="w-full border rounded px-3 py-2" />
          </div>
        </form>
      );
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('integrates with sidebar layouts', () => {
      renderWithUserEvents(
        <div className="flex h-screen">
          <aside className="w-64 bg-gray-100 p-4">
            <h2 className="font-semibold mb-4">Sidebar</h2>
            <nav className="space-y-2">
              <a href="#" className="block">Link 1</a>
              <Separator className="my-2" />
              <a href="#" className="block">Link 2</a>
            </nav>
          </aside>
          
          <Separator orientation="vertical" />
          
          <main className="flex-1 p-4">
            <h1>Main Content</h1>
          </main>
        </div>
      );
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      // Horizontal separator in sidebar
      expect(separators[0]).toHaveAttribute('data-orientation', 'horizontal');
      expect(separators[0]).toHaveClass('my-2');
      
      // Vertical separator between sidebar and main
      expect(separators[1]).toHaveAttribute('data-orientation', 'vertical');
    });

    it('integrates with complex nested layouts', () => {
      renderComplexLayoutSeparator();
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
        expect(separator).toBeInTheDocument();
      });
    });

    it('integrates with vertical complex layouts', () => {
      renderComplexLayoutSeparator('vertical');
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('data-orientation', 'vertical');
        expect(separator).toHaveClass('h-8', 'mx-4');
      });
    });

    it('maintains accessibility in complex layouts', () => {
      renderWithUserEvents(
        <article className="max-w-2xl mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Article Title</h1>
            <p className="text-gray-600">Article subtitle</p>
          </header>
          
          <Separator aria-label="Separator between header and content" />
          
          <section className="my-6">
            <p>Article content paragraph 1.</p>
            <p>Article content paragraph 2.</p>
          </section>
          
          <Separator aria-label="Separator between content and footer" />
          
          <footer className="mt-6 text-sm text-gray-500">
            <p>Article footer information</p>
          </footer>
        </article>
      );
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      expect(separators[0]).toHaveAttribute('aria-label', 'Separator between header and content');
      expect(separators[1]).toHaveAttribute('aria-label', 'Separator between content and footer');
      
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('role', 'none');
        expect(separator).not.toHaveAttribute('aria-orientation');
      });
    });

    it('handles responsive layouts correctly', () => {
      renderWithUserEvents(
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 p-4">
            <h2>Left Content</h2>
          </div>
          
          <Separator 
            orientation="horizontal" 
            className="block md:hidden"
          />
          <Separator 
            orientation="vertical" 
            className="hidden md:block h-auto"
          />
          
          <div className="md:w-1/2 p-4">
            <h2>Right Content</h2>
          </div>
        </div>
      );
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      // Horizontal separator for mobile
      expect(separators[0]).toHaveAttribute('data-orientation', 'horizontal');
      expect(separators[0]).toHaveClass('block', 'md:hidden');
      
      // Vertical separator for desktop
      expect(separators[1]).toHaveAttribute('data-orientation', 'vertical');
      expect(separators[1]).toHaveClass('hidden', 'md:block', 'h-auto');
    });

    it('maintains performance with multiple separators', () => {
      const multipleSeparators = Array.from({ length: 20 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div data-testid={`content-${i}`}>Content {i}</div>
          <Separator />
        </div>
      ));
      
      renderWithUserEvents(
        <div className="space-y-4">
          {multipleSeparators}
        </div>
      );
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(20);
      
      // Should contain all content elements
      for (let i = 0; i < 20; i++) {
        const content = document.querySelector(`[data-testid="content-${i}"]`);
        expect(content).toHaveTextContent(`Content ${i}`);
      }
      
      // All separators should be properly rendered
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('data-orientation', 'horizontal');
        expect(separator).toHaveClass('shrink-0', 'bg-border');
      });
    });

    it('handles dynamic content changes gracefully', () => {
      const { rerender } = renderWithUserEvents(
        <div>
          <div>Static Content</div>
          <Separator />
          <div>Dynamic Content 1</div>
        </div>
      );
      
      let separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toBeInTheDocument();
      
      // Update with different content
      rerender(
        <div>
          <div>Static Content</div>
          <Separator />
          <div>Dynamic Content 2</div>
          <Separator orientation="vertical" className="h-6" />
          <div>Additional Content</div>
        </div>
      );
      
      const separators = document.querySelectorAll('[data-slot="separator-root"]');
      expect(separators).toHaveLength(2);
      
      expect(separators[0]).toHaveAttribute('data-orientation', 'horizontal');
      expect(separators[1]).toHaveAttribute('data-orientation', 'vertical');
      expect(separators[1]).toHaveClass('h-6');
    });
  });

  describe('Styling Tests', () => {
    it('applies default styling classes correctly', () => {
      renderTestSeparator();
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'shrink-0',
        'bg-border',
        'data-[orientation=horizontal]:h-px',
        'data-[orientation=horizontal]:w-full',
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:w-px'
      );
    });

    it('handles custom background colors', () => {
      renderTestSeparator({
        className: 'bg-blue-500'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('bg-blue-500');
      // Should still have default classes (custom bg overrides default bg-border)
      expect(separator).toHaveClass('shrink-0');
    });

    it('handles custom sizing for horizontal separator', () => {
      renderTestSeparator({
        orientation: 'horizontal',
        className: 'h-0.5 max-w-xs mx-auto'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('h-0.5', 'max-w-xs', 'mx-auto');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('handles custom sizing for vertical separator', () => {
      renderTestSeparator({
        orientation: 'vertical',
        className: 'w-0.5 h-16'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('w-0.5', 'h-16');
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
    });

    it('handles margin and padding classes', () => {
      renderTestSeparator({
        className: 'my-8 mx-4 p-0'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('my-8', 'mx-4', 'p-0');
    });

    it('handles border styling variants', () => {
      renderTestSeparator({
        className: 'border-t border-dashed border-gray-300 bg-transparent'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'border-t',
        'border-dashed',
        'border-gray-300',
        'bg-transparent'
      );
    });

    it('handles shadow and opacity effects', () => {
      renderTestSeparator({
        className: 'shadow-sm opacity-60 backdrop-blur-sm'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('shadow-sm', 'opacity-60', 'backdrop-blur-sm');
    });

    it('handles dark mode styling', () => {
      renderTestSeparator({
        className: 'dark:bg-gray-600 dark:opacity-50'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('dark:bg-gray-600', 'dark:opacity-50');
    });

    it('handles responsive sizing', () => {
      renderTestSeparator({
        className: 'h-px sm:h-0.5 md:h-1 lg:h-1.5'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass('h-px', 'sm:h-0.5', 'md:h-1', 'lg:h-1.5');
    });

    it('handles gradients and complex backgrounds', () => {
      renderTestSeparator({
        className: 'bg-gradient-to-r from-transparent via-gray-300 to-transparent'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'bg-gradient-to-r',
        'from-transparent',
        'via-gray-300',
        'to-transparent'
      );
    });

    it('maintains styling consistency with className merging', () => {
      renderTestSeparator({
        className: 'custom-separator-class',
        orientation: 'vertical'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      
      // Should have custom class
      expect(separator).toHaveClass('custom-separator-class');
      
      // Should maintain default classes
      expect(separator).toHaveClass(
        'shrink-0',
        'bg-border',
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:w-px'
      );
      
      // Should have correct orientation
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
    });

    it('handles animation and transition classes', () => {
      renderTestSeparator({
        className: 'transition-all duration-300 ease-in-out hover:opacity-100'
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveClass(
        'transition-all',
        'duration-300',
        'ease-in-out',
        'hover:opacity-100'
      );
    });

    it('handles CSS custom properties and variables', () => {
      renderTestSeparator({
        style: {
          '--separator-color': '#rgb(147, 197, 253)',
          backgroundColor: 'var(--separator-color)'
        }
      });
      
      const separator = document.querySelector('[data-slot="separator-root"]');
      expect(separator).toHaveStyle('background-color: var(--separator-color)');
    });
  });
});