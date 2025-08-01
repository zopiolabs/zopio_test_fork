/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Skeleton component.
 *
 * This test suite validates the skeleton component's functionality as a loading
 * placeholder component. The skeleton is a non-interactive component that provides
 * visual feedback during loading states. It's designed to maintain accessibility
 * for screen readers while providing a smooth loading experience.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, DOM structure
 * 2. Animation Tests - Pulse animation presence, loading state indication
 * 3. Props Handling - className forwarding, HTML attributes, style merging
 * 4. Shape Variants - Different shapes (circular, rectangular), size variations
 * 5. Styling Tests - CSS classes, animation classes, background styling
 * 6. Accessibility - ARIA attributes for loading states, screen reader support
 * 7. Edge Cases - Empty content, extreme dimensions, rapid prop changes
 * 8. Component Integration - Multiple skeleton usage, compound patterns, responsive behavior
 *
 * The skeleton component is primarily a visual element focused on providing
 * loading feedback with proper accessibility support for assistive technologies.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import { Skeleton } from '@repo/design-system/ui/skeleton';

/**
 * Helper function to render a basic skeleton with default content
 * Supports custom props for comprehensive testing scenarios
 */
const renderTestSkeleton = (props: any = {}) => {
  return renderWithUserEvents(
    <Skeleton {...props} />
  );
};

/**
 * Helper function to render skeleton with specific dimensions
 * Tests loading placeholder with defined size and shape
 */
const renderSkeletonWithDimensions = (props: any = {}, className = 'h-4 w-32') => {
  return renderWithUserEvents(
    <Skeleton className={className} {...props} />
  );
};

/**
 * Helper function to render circular skeleton (avatar placeholder)
 * Tests circular shape variant commonly used for profile pictures
 */
const renderCircularSkeleton = (props: any = {}, size = 'h-12 w-12') => {
  return renderWithUserEvents(
    <Skeleton className={`${size} rounded-full`} {...props} />
  );
};

/**
 * Helper function to render skeleton with custom styling
 * Tests style merging and CSS property application
 */
const renderSkeletonWithStyles = (props: any = {}, customStyle: React.CSSProperties = {}) => {
  return renderWithUserEvents(
    <Skeleton style={customStyle} {...props} />
  );
};

/**
 * Helper function to render multiple skeletons for layout testing
 * Tests compound usage patterns common in loading interfaces
 */
const renderMultipleSkeletons = (count = 3, props: any = {}) => {
  return renderWithUserEvents(
    <div>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full mb-2" {...props} />
      ))}
    </div>
  );
};

/**
 * Helper function to render skeleton with loading text context
 * Tests accessibility integration with loading announcements
 */
const renderSkeletonWithLoadingContext = (props: any = {}) => {
  return renderWithUserEvents(
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        Loading content...
      </div>
      <Skeleton className="h-6 w-48" {...props} />
    </div>
  );
};

/**
 * Helper function to render skeleton within card layout
 * Tests integration with typical loading card patterns
 */
const renderSkeletonCard = (props: any = {}) => {
  return renderWithUserEvents(
    <div className="card">
      <Skeleton className="h-32 w-full mb-4" {...props} />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

describe('Skeleton', () => {
  describe('Rendering Tests', () => {
    it('renders skeleton element correctly', () => {
      renderTestSkeleton();
      
      // Find the skeleton by its data-slot attribute
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton?.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
    });

    it('renders with default base styling classes', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass(
        'animate-pulse',
        'rounded-md',
        'bg-accent'
      );
    });

    it('renders as div element by default', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton?.tagName).toBe('DIV');
    });

    it('maintains proper semantic structure', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton?.tagName).toBe('DIV');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders with consistent default animation', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('renders with proper background color class', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('bg-accent');
    });

    it('renders with default border radius', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('rounded-md');
    });

    it('renders empty content by design', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeEmptyDOMElement();
    });

    it('maintains skeleton structure across re-renders', () => {
      const { rerender } = renderTestSkeleton();
      
      let skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      
      // Re-render with same component
      rerender(<Skeleton />);
      
      skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
    });
  });

  describe('Animation Tests', () => {
    it('applies pulse animation class correctly', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('maintains animation during prop changes', () => {
      const { rerender } = renderTestSkeleton();
      
      let skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      
      // Re-render with different props
      rerender(<Skeleton className="custom-class" />);
      
      skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('preserves animation with custom classes', () => {
      renderTestSkeleton({ className: 'h-8 w-64 custom-skeleton' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('animation works with different dimensions', () => {
      renderSkeletonWithDimensions({}, 'h-12 w-12 rounded-full');
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('h-12', 'w-12', 'rounded-full');
    });

    it('handles animation with inline styles', () => {
      renderSkeletonWithStyles({}, { width: '200px', height: '20px' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveStyle('width: 200px');
      expect(skeleton).toHaveStyle('height: 20px');
    });

    it('maintains animation across multiple instances', () => {
      renderMultipleSkeletons(3);
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(3);
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('preserves animation state during rapid updates', () => {
      const { rerender } = renderTestSkeleton();
      
      // Rapidly change props multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<Skeleton className={`iteration-${i}`} />);
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('animate-pulse');
        expect(skeleton).toHaveClass(`iteration-${i}`);
      }
    });

    it('supports animation with accessibility announcements', () => {
      renderSkeletonWithLoadingContext();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      const loadingText = document.querySelector('[role="status"]');
      
      expect(skeleton).toHaveClass('animate-pulse');
      expect(loadingText).toHaveTextContent('Loading content...');
      expect(loadingText).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly', () => {
      renderTestSkeleton({
        'data-testid': 'custom-skeleton',
        id: 'skeleton-id',
        title: 'Loading placeholder',
        role: 'status'
      });
      
      const skeleton = document.querySelector('[data-testid="custom-skeleton"]');
      expect(skeleton).toHaveAttribute('id', 'skeleton-id');
      expect(skeleton).toHaveAttribute('title', 'Loading placeholder');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('merges custom className with default classes', () => {
      renderTestSkeleton({ className: 'custom-class h-8 w-64' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('custom-class', 'h-8', 'w-64');
      // Should maintain default classes
      expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-accent');
    });

    it('handles className merging with conflicting styles', () => {
      renderTestSkeleton({ 
        className: 'bg-red-500 animate-bounce rounded-lg' 
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('bg-red-500', 'animate-bounce', 'rounded-lg');
      // With twMerge, conflicting classes are replaced, not combined
      expect(skeleton).not.toHaveClass('animate-pulse', 'rounded-md', 'bg-accent');
    });

    it('handles style prop correctly', () => {
      renderSkeletonWithStyles({}, {
        backgroundColor: 'rgb(255, 0, 0)',
        borderRadius: '8px',
        opacity: 0.7
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(skeleton).toHaveStyle('border-radius: 8px');
      expect(skeleton).toHaveStyle('opacity: 0.7');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderTestSkeleton({
        'data-testid': 'multi-attr-skeleton',
        className: 'multi-class h-4 w-32',
        id: 'multi-id',
        'aria-label': 'Loading content placeholder',
        'aria-describedby': 'loading-description',
        role: 'status',
        title: 'Content is loading...',
        tabIndex: -1
      });
      
      const skeleton = document.querySelector('[data-testid="multi-attr-skeleton"]');
      expect(skeleton).toHaveClass('multi-class', 'h-4', 'w-32');
      expect(skeleton).toHaveAttribute('id', 'multi-id');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content placeholder');
      expect(skeleton).toHaveAttribute('aria-describedby', 'loading-description');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('title', 'Content is loading...');
      expect(skeleton).toHaveAttribute('tabindex', '-1');
    });

    it('handles spread props correctly', () => {
      const customProps = {
        'data-custom': 'value',
        className: 'spread-class',
        style: { width: '100px' },
        id: 'spread-id'
      };
      
      renderTestSkeleton(customProps);
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveAttribute('data-custom', 'value');
      expect(skeleton).toHaveClass('spread-class');
      expect(skeleton).toHaveStyle('width: 100px');
      expect(skeleton).toHaveAttribute('id', 'spread-id');
    });

    it('handles event handlers gracefully', () => {
      // Skeleton is not interactive, but should handle event props without errors
      renderTestSkeleton({
        onClick: () => {},
        onMouseOver: () => {},
        onFocus: () => {}
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('handles boolean props correctly', () => {
      renderTestSkeleton({
        hidden: false,
        'aria-hidden': 'false',
        'data-visible': true
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).not.toHaveAttribute('hidden');
      expect(skeleton).toHaveAttribute('aria-hidden', 'false');
      expect(skeleton).toHaveAttribute('data-visible', 'true');
    });

    it('maintains data-slot attribute with custom props', () => {
      renderTestSkeleton({
        className: 'custom-props-test',
        style: { opacity: 0.5 },
        'data-custom': 'test'
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
      expect(skeleton).toHaveClass('custom-props-test');
      expect(skeleton).toHaveStyle('opacity: 0.5');
      expect(skeleton).toHaveAttribute('data-custom', 'test');
    });
  });

  describe('Shape Variants', () => {
    describe('Rectangular Skeletons', () => {
      it('renders rectangular skeleton with default styling', () => {
        renderSkeletonWithDimensions({}, 'h-4 w-64');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-4', 'w-64');
        expect(skeleton).toHaveClass('rounded-md'); // Default border radius
      });

      it('renders wide rectangular skeleton for text lines', () => {
        renderSkeletonWithDimensions({}, 'h-3 w-full');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-3', 'w-full');
        expect(skeleton).toHaveClass('animate-pulse', 'bg-accent');
      });

      it('renders narrow rectangular skeleton for small text', () => {
        renderSkeletonWithDimensions({}, 'h-2 w-16');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-2', 'w-16');
        expect(skeleton).toHaveClass('rounded-md');
      });

      it('renders tall rectangular skeleton for buttons', () => {
        renderSkeletonWithDimensions({}, 'h-10 w-32');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-10', 'w-32');
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    describe('Circular Skeletons', () => {
      it('renders circular skeleton for avatar placeholder', () => {
        renderCircularSkeleton();
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-12', 'w-12', 'rounded-full');
        expect(skeleton).toHaveClass('animate-pulse', 'bg-accent');
      });

      it('renders small circular skeleton for profile pics', () => {
        renderCircularSkeleton({}, 'h-8 w-8');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-8', 'w-8', 'rounded-full');
      });

      it('renders large circular skeleton for hero avatars', () => {
        renderCircularSkeleton({}, 'h-24 w-24');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-24', 'w-24', 'rounded-full');
      });

      it('maintains circular shape with custom background', () => {
        renderCircularSkeleton({ 
          className: 'h-16 w-16 rounded-full bg-gray-300' 
        });
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-16', 'w-16', 'rounded-full', 'bg-gray-300');
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    describe('Custom Shapes', () => {
      it('renders square skeleton with equal dimensions', () => {
        renderSkeletonWithDimensions({}, 'h-20 w-20');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-20', 'w-20');
        expect(skeleton).toHaveClass('rounded-md');
      });

      it('renders rounded rectangle with custom border radius', () => {
        renderSkeletonWithDimensions({}, 'h-6 w-48 rounded-lg');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-6', 'w-48', 'rounded-lg');
      });

      it('renders skeleton with no border radius', () => {
        renderSkeletonWithDimensions({}, 'h-8 w-32 rounded-none');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-8', 'w-32', 'rounded-none');
        // With twMerge, rounded-none overrides rounded-md
        expect(skeleton).not.toHaveClass('rounded-md');
      });

      it('handles complex shape combinations', () => {
        renderSkeletonWithDimensions({}, 'h-12 w-64 rounded-t-lg rounded-b-none');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-12', 'w-64', 'rounded-t-lg', 'rounded-b-none');
      });
    });

    describe('Responsive Shapes', () => {
      it('handles responsive width variations', () => {
        renderSkeletonWithDimensions({}, 'h-4 w-32 sm:w-48 md:w-64 lg:w-full');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass(
          'h-4', 'w-32', 'sm:w-48', 'md:w-64', 'lg:w-full'
        );
      });

      it('handles responsive height variations', () => {
        renderSkeletonWithDimensions({}, 'h-3 sm:h-4 md:h-5 w-48');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass('h-3', 'sm:h-4', 'md:h-5', 'w-48');
      });

      it('handles responsive shape changes', () => {
        renderSkeletonWithDimensions({}, 'h-8 w-8 rounded-full sm:h-4 sm:w-32 sm:rounded-md');
        
        const skeleton = document.querySelector('[data-slot="skeleton"]');
        expect(skeleton).toHaveClass(
          'h-8', 'w-8', 'rounded-full', 
          'sm:h-4', 'sm:w-32', 'sm:rounded-md'
        );
      });
    });
  });

  describe('Styling Tests', () => {
    it('applies default background color class', () => {
      renderTestSkeleton();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('bg-accent');
    });

    it('allows custom background color override', () => {
      renderTestSkeleton({ className: 'bg-gray-200' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('bg-gray-200');
      // With twMerge, bg-gray-200 overrides bg-accent
      expect(skeleton).not.toHaveClass('bg-accent');
    });

    it('supports opacity modifications', () => {
      renderTestSkeleton({ className: 'opacity-50' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('opacity-50');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('handles gradient backgrounds via classes', () => {
      renderTestSkeleton({ className: 'bg-gradient-to-r from-gray-200 to-gray-300' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('bg-gradient-to-r', 'from-gray-200', 'to-gray-300');
    });

    it('supports shadow and depth styling', () => {
      renderTestSkeleton({ className: 'shadow-sm border border-gray-100' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('shadow-sm', 'border', 'border-gray-100');
    });

    it('handles dark mode styling variations', () => {
      renderTestSkeleton({ className: 'dark:bg-gray-700 dark:animate-pulse' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('dark:bg-gray-700', 'dark:animate-pulse');
    });

    it('supports custom animation timing', () => {
      renderTestSkeleton({ className: 'animate-pulse duration-1000' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse', 'duration-1000');
    });

    it('handles inline style overrides', () => {
      renderSkeletonWithStyles({}, {
        backgroundColor: '#f0f0f0',
        animationDuration: '2s',
        borderRadius: '12px'
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveStyle('background-color: rgb(240, 240, 240)');
      expect(skeleton).toHaveStyle('animation-duration: 2s');
      expect(skeleton).toHaveStyle('border-radius: 12px');
    });

    it('maintains styling consistency across instances', () => {
      renderMultipleSkeletons(4);
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(4);
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-accent');
      });
    });

    it('handles complex CSS class combinations', () => {
      renderTestSkeleton({ 
        className: 'h-6 w-48 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400 rounded-full shadow-lg border-2 border-blue-100 opacity-75'
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass(
        'h-6', 'w-48', 'bg-gradient-to-r', 'from-blue-200', 'via-blue-300', 
        'to-blue-400', 'rounded-full', 'shadow-lg', 'border-2', 'border-blue-100', 'opacity-75'
      );
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate semantic structure for loading state', () => {
      renderTestSkeleton({ role: 'status', 'aria-label': 'Loading content' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });

    it('supports aria-hidden for decorative skeletons', () => {
      renderTestSkeleton({ 'aria-hidden': 'true' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('handles screen reader announcements correctly', () => {
      renderSkeletonWithLoadingContext();
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      const status = document.querySelector('[role="status"]');
      
      expect(skeleton).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('Loading content...');
      expect(status).toHaveClass('sr-only');
    });

    it('supports aria-describedby for detailed loading context', () => {
      renderWithUserEvents(
        <div>
          <Skeleton 
            className="h-4 w-48" 
            aria-describedby="loading-description"
            role="status"
          />
          <div id="loading-description" className="sr-only">
            Loading article content, please wait...
          </div>
        </div>
      );
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      const description = document.getElementById('loading-description');
      
      expect(skeleton).toHaveAttribute('aria-describedby', 'loading-description');
      expect(description).toHaveTextContent('Loading article content, please wait...');
    });

    it('maintains accessibility with custom ARIA attributes', () => {
      renderTestSkeleton({
        role: 'status',
        'aria-label': 'Loading user profile',
        'aria-live': 'polite',
        'aria-busy': 'true'
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading user profile');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('provides proper focus management (non-focusable)', () => {
      renderTestSkeleton({ tabIndex: -1 });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveAttribute('tabindex', '-1');
      // Skeleton should not be focusable by default
      expect(skeleton).not.toHaveAttribute('tabindex', '0');
    });

    it('supports high contrast mode compatibility', () => {
      renderTestSkeleton({ className: 'border border-current' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('border', 'border-current');
      expect(skeleton).toHaveClass('bg-accent');
    });

    it('handles reduced motion preferences', () => {
      renderTestSkeleton({ className: 'motion-reduce:animate-none' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
    });

    it('provides context for screen readers with multiple skeletons', () => {
      renderWithUserEvents(
        <div>
          <div role="status" aria-live="polite" className="sr-only">
            Loading 3 items...
          </div>
          <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
          <Skeleton className="h-4 w-3/4 mb-2" aria-hidden="true" />
          <Skeleton className="h-4 w-1/2" aria-hidden="true" />
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      const status = document.querySelector('[role="status"]');
      
      expect(skeletons).toHaveLength(3);
      expect(status).toHaveTextContent('Loading 3 items...');
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('maintains accessibility standards across variants', () => {
      const variants = [
        { className: 'h-4 w-32', 'aria-label': 'Loading text' },
        { className: 'h-12 w-12 rounded-full', 'aria-label': 'Loading avatar' },
        { className: 'h-24 w-full', 'aria-label': 'Loading image' }
      ];
      
      variants.forEach((props, index) => {
        const { unmount } = renderTestSkeleton({ 
          ...props,
          role: 'status',
          'data-testid': `skeleton-${index}`
        });
        
        const skeleton = document.querySelector(`[data-testid="skeleton-${index}"]`);
        expect(skeleton).toHaveAttribute('role', 'status');
        expect(skeleton).toHaveAttribute('aria-label', props['aria-label']);
        
        // Basic accessibility check
        accessibility.expectToBeAccessible(skeleton! as HTMLElement, { 
          requireAccessibleName: false,
          checkKeyboardSupport: false 
        });
        
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles extremely small dimensions', () => {
      renderSkeletonWithDimensions({}, 'h-0.5 w-1');
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('h-0.5', 'w-1');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('handles extremely large dimensions', () => {
      renderSkeletonWithDimensions({}, 'h-96 w-full');
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('h-96', 'w-full');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('handles empty className gracefully', () => {
      renderTestSkeleton({ className: '' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-accent');
    });

    it('handles null and undefined className', () => {
      const { unmount: unmount1 } = renderTestSkeleton({ className: null });
      let skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      unmount1();
      
      const { unmount: unmount2 } = renderTestSkeleton({ className: undefined });
      skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass('animate-pulse');
      unmount2();
    });

    it('handles malformed CSS class names gracefully', () => {
      renderTestSkeleton({ className: 'class-with-!@#$%^&*()' });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderTestSkeleton();
      
      // Rapidly change props many times
      for (let i = 0; i < 50; i++) {
        const className = `h-${i % 12 + 1} w-${(i % 6 + 1) * 8} skeleton-${i}`;
        rerender(
          <Skeleton key={i} className={className} data-iteration={i} />
        );
      }
      
      // Should still be functioning
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveAttribute('data-iteration', '49');
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'skeleton-' + 'a'.repeat(1000);
      
      renderTestSkeleton({ className: longClassName });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveClass(longClassName);
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('handles conflicting animation classes', () => {
      renderTestSkeleton({ 
        className: 'animate-bounce animate-spin animate-ping' 
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      // With twMerge, only the last animation class should be present
      expect(skeleton).toHaveClass('animate-ping');
      expect(skeleton).not.toHaveClass('animate-bounce', 'animate-spin', 'animate-pulse');
    });

    it('handles invalid HTML attributes gracefully', () => {
      renderTestSkeleton({
        'data-test': '<script>alert("xss")</script>',
        'invalid-attr': 'value',
        123: 'numeric-key', // Invalid attribute name
        className: 'safe-class'
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('safe-class', 'animate-pulse');
      expect(skeleton).toHaveAttribute('data-test', '<script>alert("xss")</script>');
    });

    it('handles complex inline style objects', () => {
      renderSkeletonWithStyles({}, {
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
        transform: 'translateZ(0)'
      });
      
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toHaveStyle('background-size: 200% 100%');
      expect(skeleton).toHaveStyle('animation: shimmer 2s infinite');
      expect(skeleton).toHaveStyle('transform: translateZ(0)');
    });

    it('maintains performance with many skeleton instances', () => {
      renderWithUserEvents(
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <Skeleton key={i} className={`h-4 w-${(i % 10) + 10} mb-1 skeleton-${i}`} />
          ))}
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(100);
      
      // Sample a few to verify they're working correctly
      expect(skeletons[0]).toHaveClass('animate-pulse', 'skeleton-0');
      expect(skeletons[50]).toHaveClass('animate-pulse', 'skeleton-50');
      expect(skeletons[99]).toHaveClass('animate-pulse', 'skeleton-99');
    });

    it('handles nested skeleton structures gracefully', () => {
      renderWithUserEvents(
        <div>
          <Skeleton className="h-32 w-full p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </Skeleton>
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(3);
      
      // All should maintain their animation
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });
  });

  describe('Component Integration', () => {
    it('integrates well in card layouts', () => {
      renderSkeletonCard();
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(3);
      
      // Verify the card structure
      const card = document.querySelector('.card');
      expect(card).toBeInTheDocument();
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
        expect(card).toContainElement(skeleton as HTMLElement);
      });
    });

    it('works well in list item placeholders', () => {
      renderWithUserEvents(
        <div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center space-x-4 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(15); // 3 skeletons per item × 5 items
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('integrates with form field placeholders', () => {
      renderWithUserEvents(
        <form>
          <div className="mb-4">
            <Skeleton className="h-4 w-16 mb-2" /> {/* Label placeholder */}
            <Skeleton className="h-10 w-full rounded-md" /> {/* Input placeholder */}
          </div>
          <div className="mb-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-24 w-full rounded-md" /> {/* Textarea placeholder */}
          </div>
          <Skeleton className="h-10 w-24 rounded-md" /> {/* Button placeholder */}
        </form>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(5);
      
      const form = document.querySelector('form');
      skeletons.forEach(skeleton => {
        expect(form).toContainElement(skeleton as HTMLElement);
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('supports complex loading layouts', () => {
      renderWithUserEvents(
        <div className="max-w-4xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          {/* Content grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(27); // 3 header + 4 per card × 6 cards
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('maintains consistency in loading states', () => {
      renderWithUserEvents(
        <div>
          <div role="status" aria-live="polite" className="sr-only">
            Loading page content...
          </div>
          
          {/* Navigation skeleton */}
          <nav className="mb-8">
            <div className="flex space-x-4">
              <Skeleton className="h-6 w-16" aria-hidden="true" />
              <Skeleton className="h-6 w-20" aria-hidden="true" />
              <Skeleton className="h-6 w-18" aria-hidden="true" />
            </div>
          </nav>
          
          {/* Main content skeleton */}
          <main>
            <Skeleton className="h-10 w-full mb-6" aria-hidden="true" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-64 col-span-2" aria-hidden="true" />
              <Skeleton className="h-64" aria-hidden="true" />
            </div>
          </main>
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      const status = document.querySelector('[role="status"]');
      
      expect(skeletons).toHaveLength(6);
      expect(status).toHaveTextContent('Loading page content...');
      
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('handles responsive skeleton layouts', () => {
      renderWithUserEvents(
        <div className="responsive-skeleton-layout">
          <Skeleton className="h-8 w-full sm:w-3/4 md:w-1/2 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton 
                key={i} 
                className="h-32 w-full lg:h-40"
                data-testid={`responsive-skeleton-${i}`}
              />
            ))}
          </div>
        </div>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(5);
      
      // Check responsive classes
      expect(skeletons[0]).toHaveClass('sm:w-3/4', 'md:w-1/2');
      expect(skeletons[1]).toHaveClass('lg:h-40');
    });

    it('maintains accessibility in complex layouts', () => {
      renderWithUserEvents(
        <article>
          <div role="status" aria-live="polite" className="sr-only">
            Loading article...
          </div>
          
          <header className="mb-6">
            <Skeleton className="h-8 w-3/4 mb-2" aria-hidden="true" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" aria-hidden="true" />
              <Skeleton className="h-4 w-32" aria-hidden="true" />
            </div>
          </header>
          
          <div className="content">
            <Skeleton className="h-40 w-full mb-4" aria-hidden="true" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full mb-2" aria-hidden="true" />
            ))}
            <Skeleton className="h-4 w-2/3" aria-hidden="true" />
          </div>
        </article>
      );
      
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      const article = document.querySelector('article');
      const status = document.querySelector('[role="status"]');
      
      expect(skeletons).toHaveLength(9);
      expect(status).toHaveAttribute('aria-live', 'polite');
      
      skeletons.forEach(skeleton => {
        expect(article).toContainElement(skeleton as HTMLElement);
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('handles dynamic content loading simulation', () => {
      const { rerender } = renderWithUserEvents(
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
      
      let skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(3);
      
      // Simulate partial content loading
      rerender(
        <div>
          <h1 className="h-6 mb-4">Loaded Title</h1>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
      
      skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(2);
      expect(document.querySelector('h1')).toHaveTextContent('Loaded Title');
      
      // Simulate full content loading
      rerender(
        <div>
          <h1 className="h-6 mb-4">Loaded Title</h1>
          <p className="mb-2">Loaded content paragraph one.</p>
          <p>Loaded content paragraph two.</p>
        </div>
      );
      
      skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(0);
      expect(document.querySelectorAll('p')).toHaveLength(2);
    });
  });
});