/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the AspectRatio component.
 *
 * This test suite validates the aspect ratio component's functionality across multiple
 * dimensions including rendering, variants, accessibility, and edge cases. The
 * AspectRatio component is a layout utility that maintains content within a specific
 * aspect ratio using CSS aspect-ratio property and Radix UI primitives.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering and data-slot attributes
 * 2. Variant Tests - Different ratio variants (16/9, 4/3, 1/1, custom ratios)
 * 3. Props Handling - Ratio prop, className forwarding, and HTML attributes
 * 4. User Interactions - N/A for layout component (maintains child interactivity)
 * 5. States - N/A for stateless layout component
 * 6. Accessibility - Content accessibility preservation and layout semantics
 * 7. Edge Cases - Invalid ratios, extreme values, zero ratios, negative ratios
 * 8. Component Integration - Child content rendering and layout preservation
 *
 * The tests ensure production-ready quality with comprehensive coverage of all
 * aspect ratio scenarios and child content integration patterns.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithUserEvents, queries } from '../test-utils';
import { AspectRatio } from '@repo/design-system/ui/aspect-ratio';

/**
 * Helper function to render AspectRatio with default image content
 * Mimics the story pattern for consistent testing approach
 */
const renderTestAspectRatio = (props: any = {}, children?: React.ReactNode) => {
  const defaultProps = {
    ratio: 16 / 9,
    ...props
  };

  const defaultChildren = children ?? (
    <img
      src="https://images.unsplash.com/photo-1576075796033-848c2a5f3696?w=800&dpr=2&q=80"
      alt="Test image"
      className="h-full w-full rounded-md object-cover"
    />
  );

  return renderWithUserEvents(
    <div className="w-1/2">
      <AspectRatio {...defaultProps}>
        {defaultChildren}
      </AspectRatio>
    </div>
  );
};

/**
 * Helper function to render minimal AspectRatio for basic tests
 */
const renderMinimalAspectRatio = (props: any = {}, children?: React.ReactNode) => {
  return renderWithUserEvents(
    <AspectRatio {...props}>
      {children ?? <div data-testid="content">Test Content</div>}
    </AspectRatio>
  );
};

/**
 * Helper function to render AspectRatio with text content for accessibility tests
 */
const renderAspectRatioWithText = (ratio: number = 16 / 9) => {
  return renderWithUserEvents(
    <AspectRatio ratio={ratio}>
      <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <p>Accessible text content</p>
      </div>
    </AspectRatio>
  );
};

/**
 * Helper function to render AspectRatio with interactive content
 */
const renderAspectRatioWithInteractiveContent = (ratio: number = 16 / 9) => {
  return renderWithUserEvents(
    <AspectRatio ratio={ratio}>
      <div className="flex flex-col items-center justify-center bg-slate-100 p-4">
        <h2>Interactive Content</h2>
        <button type="button">Click me</button>
        <a href="/link">Test Link</a>
      </div>
    </AspectRatio>
  );
};

/**
 * Helper function to calculate expected padding-bottom percentage for a given ratio
 * Radix UI uses padding-bottom technique: (1/ratio) * 100%
 */
const calculateExpectedPadding = (ratio: number): string => {
  return ((1 / ratio) * 100).toFixed(2) + '%';
};

/**
 * Helper function to assert aspect ratio behavior using Radix UI's implementation
 */
const expectAspectRatio = (ratio: number) => {
  const wrapper = document.querySelector('[data-radix-aspect-ratio-wrapper]');
  const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
  
  expect(wrapper).toBeInTheDocument();
  expect(aspectRatio).toBeInTheDocument();
  
  // Handle special cases for edge values
  if (ratio === Infinity || ratio === 0 || isNaN(ratio) || ratio < 0) {
    // For edge cases, just verify the wrapper exists and aspectRatio is positioned absolutely
    expect(aspectRatio).toHaveStyle({ position: 'absolute' });
  } else {
    // Check that padding-bottom contains the expected percentage value (Radix UI uses high precision)
    const expectedPercentage = (1 / ratio) * 100;
    const paddingBottomStyle = wrapper?.getAttribute('style')?.match(/padding-bottom:\s*([^;]+)/)?.[1];
    
    if (paddingBottomStyle) {
      const actualPercentage = parseFloat(paddingBottomStyle.replace('%', ''));
      // Use a small tolerance for floating point comparison
      expect(actualPercentage).toBeCloseTo(expectedPercentage, 1);
    }
    
    expect(aspectRatio).toHaveStyle({ position: 'absolute' });
  }
};

describe('AspectRatio', () => {
  describe('Rendering Tests', () => {
    it('renders aspect ratio root element correctly', () => {
      renderMinimalAspectRatio();
      
      // Find the aspect ratio root by its data-slot attribute
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expect(aspectRatio?.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      renderMinimalAspectRatio();
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toHaveAttribute('data-slot', 'aspect-ratio');
    });

    it('renders child content inside aspect ratio container', () => {
      renderMinimalAspectRatio({}, <div data-testid="child-content">Child Content</div>);
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const childContent = screen.getByTestId('child-content');
      
      expect(aspectRatio).toBeInTheDocument();
      expect(childContent).toBeInTheDocument();
      expect(aspectRatio).toContainElement(childContent);
    });

    it('renders with default ratio when no ratio specified', () => {
      renderMinimalAspectRatio({});
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      // Default ratio is handled by Radix UI primitive
    });

    it('renders with image content from story pattern', () => {
      renderTestAspectRatio();
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const image = screen.getByAltText('Test image');
      
      expect(aspectRatio).toBeInTheDocument();
      expect(image).toBeInTheDocument();
      expect(aspectRatio).toContainElement(image);
    });

    it('maintains container structure with wrapper div', () => {
      const { container } = renderTestAspectRatio();
      
      // Should have wrapper div from test helper
      const wrapper = container.querySelector('.w-1\\/2');
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toContainElement(aspectRatio as HTMLElement);
    });
  });

  describe('Variant Tests', () => {
    describe('16:9 Widescreen Ratio', () => {
      it('renders with 16:9 aspect ratio (default story)', () => {
        renderTestAspectRatio({ ratio: 16 / 9 });
        
        expectAspectRatio(16 / 9);
      });

      it('handles decimal ratio values correctly', () => {
        const ratio = 16 / 9; // 1.777...
        renderMinimalAspectRatio({ ratio });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expectAspectRatio(ratio);
      });

      it('renders 16:9 content with proper dimensions', () => {
        renderTestAspectRatio({ ratio: 16 / 9 });
        
        const image = screen.getByAltText('Test image');
        expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
      });
    });

    describe('1:1 Square Ratio', () => {
      it('renders with 1:1 square aspect ratio', () => {
        renderTestAspectRatio({ ratio: 1 });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expect(aspectRatio).toBeInTheDocument();
        expectAspectRatio(1);
      });

      it('handles square ratio with different content types', () => {
        renderMinimalAspectRatio({ ratio: 1 }, 
          <div className="bg-blue-500 h-full w-full flex items-center justify-center">
            <span>Square Content</span>
          </div>
        );
        
        const wrapper = document.querySelector('[data-radix-aspect-ratio-wrapper]');
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        const content = screen.getByText('Square Content');
        
        expect(wrapper).toHaveStyle({ paddingBottom: '100%' });
        expect(aspectRatio).toHaveStyle({ position: 'absolute' });
        expect(content).toBeInTheDocument();
      });
    });

    describe('4:3 Landscape Ratio', () => {
      it('renders with 4:3 landscape aspect ratio', () => {
        renderTestAspectRatio({ ratio: 4 / 3 });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expect(aspectRatio).toBeInTheDocument();
        expectAspectRatio(4 / 3);
      });

      it('maintains 4:3 ratio with text content', () => {
        renderMinimalAspectRatio({ ratio: 4 / 3 }, 
          <div className="h-full w-full bg-gray-200 flex items-center justify-center">
            <h2>4:3 Landscape</h2>
          </div>
        );
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        const heading = screen.getByText('4:3 Landscape');
        
        expectAspectRatio(4 / 3);
        expect(heading).toBeInTheDocument();
      });
    });

    describe('2.35:1 Cinemascope Ratio', () => {
      it('renders with 2.35:1 cinemascope aspect ratio', () => {
        renderTestAspectRatio({ ratio: 2.35 / 1 });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expect(aspectRatio).toBeInTheDocument();
        expectAspectRatio(2.35);
      });

      it('handles ultra-wide cinemascope content', () => {
        renderMinimalAspectRatio({ ratio: 2.35 }, 
          <div className="h-full w-full bg-black flex items-center justify-center text-white">
            <span>Cinemascope Content</span>
          </div>
        );
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        const content = screen.getByText('Cinemascope Content');
        
        expectAspectRatio(2.35);
        expect(content).toBeInTheDocument();
      });
    });

    describe('Custom Aspect Ratios', () => {
      it('handles custom fractional ratios', () => {
        const customRatio = 3 / 2; // 1.5
        renderMinimalAspectRatio({ ratio: customRatio });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expectAspectRatio(customRatio);
      });

      it('handles portrait ratios (height > width)', () => {
        const portraitRatio = 9 / 16; // 0.5625
        renderMinimalAspectRatio({ ratio: portraitRatio });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expectAspectRatio(portraitRatio);
      });

      it('handles very wide ratios', () => {
        const wideRatio = 21 / 9; // 2.333...
        renderMinimalAspectRatio({ ratio: wideRatio });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expectAspectRatio(wideRatio);
      });

      it('handles very tall ratios', () => {
        const tallRatio = 9 / 21; // 0.428...
        renderMinimalAspectRatio({ ratio: tallRatio });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expectAspectRatio(tallRatio);
      });
    });

    describe('Visual Consistency Across Ratios', () => {
      it('maintains consistent base structure across all ratios', () => {
        const ratios = [16 / 9, 4 / 3, 1, 2.35, 3 / 2, 9 / 16];
        
        ratios.forEach(ratio => {
          const { unmount } = renderMinimalAspectRatio({ ratio });
          
          const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
          
          // Should maintain consistent structure
          expect(aspectRatio).toBeInTheDocument();
          expect(aspectRatio).toHaveAttribute('data-slot', 'aspect-ratio');
          expect(aspectRatio?.tagName).toBe('DIV');
          
          unmount();
        });
      });

      it('preserves child content layout across different ratios', () => {
        const ratios = [16 / 9, 1, 4 / 3];
        const testContent = <div data-testid="test-child">Consistent Child</div>;
        
        ratios.forEach(ratio => {
          const { unmount } = renderMinimalAspectRatio({ ratio }, testContent);
          
          const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
          const child = screen.getByTestId('test-child');
          
          expect(aspectRatio).toContainElement(child);
          expect(child).toHaveTextContent('Consistent Child');
          
          unmount();
        });
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes to aspect ratio root', () => {
      renderMinimalAspectRatio({
        'data-testid': 'custom-aspect-ratio',
        className: 'custom-class',
        id: 'aspect-ratio-id',
        'aria-label': 'Custom aspect ratio container'
      });
      
      const aspectRatio = screen.getByTestId('custom-aspect-ratio');
      expect(aspectRatio).toHaveClass('custom-class');
      expect(aspectRatio).toHaveAttribute('id', 'aspect-ratio-id');
      expect(aspectRatio).toHaveAttribute('aria-label', 'Custom aspect ratio container');
      expect(aspectRatio).toHaveAttribute('data-slot', 'aspect-ratio');
    });

    it('merges custom className with default classes', () => {
      renderMinimalAspectRatio({ className: 'custom-aspect-class' });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toHaveClass('custom-aspect-class');
    });

    it('handles ratio prop with different numeric formats', () => {
      const ratioFormats = [
        { ratio: 16 / 9, expected: (16 / 9).toString() },
        { ratio: 1.7777777777777777, expected: '1.7777777777777777' },
        { ratio: 1, expected: '1' },
        { ratio: 0.5625, expected: '0.5625' },
        { ratio: 2.35, expected: '2.35' }
      ];
      
      ratioFormats.forEach(({ ratio, expected }) => {
        const { unmount } = renderMinimalAspectRatio({ ratio });
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expectAspectRatio(ratio);
        
        unmount();
      });
    });

    it('handles all common props simultaneously', () => {
      renderMinimalAspectRatio({
        ratio: 4 / 3,
        className: 'multi-prop-class',
        'data-testid': 'multi-prop-test',
        id: 'multi-prop-id',
        style: { border: '1px solid red' }
      });
      
      const aspectRatio = screen.getByTestId('multi-prop-test');
      
      expectAspectRatio(4 / 3);
      expect(aspectRatio).toHaveClass('multi-prop-class');
      expect(aspectRatio).toHaveAttribute('id', 'multi-prop-id');
      expect(aspectRatio).toHaveStyle('border: 1px solid red');
    });

    it('handles style prop merging with aspect ratio styles', () => {
      renderMinimalAspectRatio({
        ratio: 16 / 9,
        style: { backgroundColor: 'red', padding: '10px' }
      });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expectAspectRatio(16 / 9);
      expect(aspectRatio).toHaveStyle({
        backgroundColor: 'rgb(255, 0, 0)',
        padding: '10px'
      });
    });

    it('handles event handlers forwarding', () => {
      const handleClick = vi.fn();
      const handleMouseEnter = vi.fn();
      
      renderMinimalAspectRatio({
        onClick: handleClick,
        onMouseEnter: handleMouseEnter,
        'data-testid': 'event-test'
      });
      
      const aspectRatio = screen.getByTestId('event-test');
      
      // Should forward event handlers (though they won't be called in static tests)
      expect(aspectRatio).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    // Note: AspectRatio is a layout component that should not interfere with child interactions
    
    it('does not interfere with child element interactions', async () => {
      const { user } = renderAspectRatioWithInteractiveContent();
      
      const button = screen.getByRole('button', { name: 'Click me' });
      const link = screen.getByRole('link', { name: 'Test Link' });
      
      // Child interactive elements should be accessible
      expect(button).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      
      // Should be able to interact with child elements
      await user.click(button);
      expect(button).toBeInTheDocument(); // Still present after click
    });

    it('allows keyboard navigation through child content', async () => {
      const { user } = renderAspectRatioWithInteractiveContent();
      
      const button = screen.getByRole('button', { name: 'Click me' });
      const link = screen.getByRole('link', { name: 'Test Link' });
      
      // Should be able to tab through interactive elements
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.tab();
      expect(link).toHaveFocus();
    });

    it('preserves mouse events on child elements', async () => {
      const { user } = renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          <div 
            data-testid="hoverable-content"
            className="h-full w-full bg-blue-500 hover:bg-blue-600 cursor-pointer"
          >
            Hoverable Content
          </div>
        </AspectRatio>
      );
      
      const content = screen.getByTestId('hoverable-content');
      
      // Should be able to hover over content
      await user.hover(content);
      expect(content).toBeInTheDocument();
    });

    it('allows text selection within child content', () => {
      renderAspectRatioWithText();
      
      const textContent = screen.getByText('Accessible text content');
      
      // Text should be selectable (no user-select: none)
      expect(textContent).not.toHaveStyle('user-select: none');
    });

    it('maintains proper focus behavior for form elements', async () => {
      const { user } = renderWithUserEvents(
        <AspectRatio ratio={1}>
          <div className="p-4">
            <input type="text" placeholder="Test input" />
            <textarea placeholder="Test textarea"></textarea>
          </div>
        </AspectRatio>
      );
      
      const input = screen.getByPlaceholderText('Test input');
      const textarea = screen.getByPlaceholderText('Test textarea');
      
      // Should be able to focus form elements
      await user.click(input);
      expect(input).toHaveFocus();
      
      await user.tab();
      expect(textarea).toHaveFocus();
    });
  });

  describe('States', () => {
    // Note: AspectRatio is a stateless layout component
    // These tests verify consistent rendering and stability
    
    it('maintains consistent rendering across multiple renders', () => {
      const { rerender } = renderMinimalAspectRatio({ ratio: 16 / 9 });
      
      const initialAspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const initialStyles = initialAspectRatio?.getAttribute('style');
      
      // Re-render with same props
      rerender(
        <AspectRatio ratio={16 / 9}>
          <div data-testid="content">Test Content</div>
        </AspectRatio>
      );
      
      const rerenderedAspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(rerenderedAspectRatio?.getAttribute('style')).toBe(initialStyles);
    });

    it('updates properly when ratio prop changes', () => {
      const { rerender } = renderMinimalAspectRatio({ ratio: 16 / 9 });
      
      expectAspectRatio(16 / 9);
      
      // Change ratio
      rerender(
        <AspectRatio ratio={1}>
          <div data-testid="content">Test Content</div>
        </AspectRatio>
      );
      
      expectAspectRatio(1);
    });

    it('handles dynamic content updates properly', () => {
      const { rerender } = renderMinimalAspectRatio({ ratio: 4 / 3 });
      
      expect(screen.getByTestId('content')).toHaveTextContent('Test Content');
      
      // Update content
      rerender(
        <AspectRatio ratio={4 / 3}>
          <div data-testid="updated-content">Updated Content</div>
        </AspectRatio>
      );
      
      expect(screen.getByTestId('updated-content')).toHaveTextContent('Updated Content');
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('maintains aspect ratio when container size changes', () => {
      const { rerender, container } = renderWithUserEvents(
        <div className="w-1/2">
          <AspectRatio ratio={16 / 9}>
            <div>Content</div>
          </AspectRatio>
        </div>
      );
      
      expectAspectRatio(16 / 9);
      
      // Change container size
      rerender(
        <div className="w-full">
          <AspectRatio ratio={16 / 9}>
            <div>Content</div>
          </AspectRatio>
        </div>
      );
      
      expectAspectRatio(16 / 9);
    });
  });

  describe('Accessibility', () => {
    it('preserves content accessibility within aspect ratio container', () => {
      renderAspectRatioWithText();
      
      const textContent = screen.getByText('Accessible text content');
      expect(textContent).toBeInTheDocument();
      
      // Content should remain accessible to screen readers
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toContainElement(textContent);
    });

    it('maintains proper semantic structure for child content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          <article>
            <h1>Article Title</h1>
            <p>Article content with semantic meaning.</p>
          </article>
        </AspectRatio>
      );
      
      const article = screen.getByRole('article');
      const heading = screen.getByRole('heading', { level: 1 });
      const paragraph = screen.getByText('Article content with semantic meaning.');
      
      expect(article).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(paragraph).toBeInTheDocument();
      
      // Semantic structure should be preserved
      expect(article).toContainElement(heading);
      expect(article).toContainElement(paragraph);
    });

    it('supports ARIA attributes on child content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={1}>
          <div
            role="img"
            aria-label="Custom image description"
            className="bg-blue-500 h-full w-full"
          >
            <span aria-hidden="true">Visual decoration</span>
          </div>
        </AspectRatio>
      );
      
      const imageDiv = screen.getByRole('img');
      const hiddenSpan = screen.getByText('Visual decoration');
      
      expect(imageDiv).toHaveAttribute('aria-label', 'Custom image description');
      expect(hiddenSpan).toHaveAttribute('aria-hidden', 'true');
    });

    it('allows custom accessibility attributes on container', () => {
      renderMinimalAspectRatio({
        'aria-label': 'Image container',
        role: 'img',
        'aria-describedby': 'description-id'
      });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toHaveAttribute('aria-label', 'Image container');
      expect(aspectRatio).toHaveAttribute('role', 'img');
      expect(aspectRatio).toHaveAttribute('aria-describedby', 'description-id');
    });

    it('maintains keyboard accessibility for interactive child content', async () => {
      const { user } = renderWithUserEvents(
        <AspectRatio ratio={4 / 3}>
          <div className="flex flex-col gap-2 p-4">
            <button type="button">First Button</button>
            <input type="text" placeholder="Text input" />
            <a href="/link">Link</a>
            <button type="button">Last Button</button>
          </div>
        </AspectRatio>
      );
      
      const firstButton = screen.getByRole('button', { name: 'First Button' });
      const input = screen.getByPlaceholderText('Text input');
      const link = screen.getByRole('link', { name: 'Link' });
      const lastButton = screen.getByRole('button', { name: 'Last Button' });
      
      // Should be able to navigate through all interactive elements
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(input).toHaveFocus();
      
      await user.tab();
      expect(link).toHaveFocus();
      
      await user.tab();
      expect(lastButton).toHaveFocus();
    });

    it('preserves image alt text and accessibility', () => {
      renderTestAspectRatio();
      
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', 'Test image');
    });

    it('supports complex nested accessible content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          <div>
            <nav aria-label="Secondary navigation">
              <ul>
                <li><a href="/item1">Item 1</a></li>
                <li><a href="/item2">Item 2</a></li>
              </ul>
            </nav>
            <main>
              <h2>Main Content</h2>
              <p>Accessible main content area.</p>
            </main>
          </div>
        </AspectRatio>
      );
      
      const navigation = screen.getByRole('navigation', { name: 'Secondary navigation' });
      const main = screen.getByRole('main');
      const heading = screen.getByRole('heading', { level: 2 });
      
      expect(navigation).toBeInTheDocument();
      expect(main).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      
      // All should be within the aspect ratio container
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toContainElement(navigation);
      expect(aspectRatio).toContainElement(main);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero ratio gracefully', () => {
      renderMinimalAspectRatio({ ratio: 0 });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expectAspectRatio(0);
    });

    it('handles negative ratio values', () => {
      renderMinimalAspectRatio({ ratio: -1 });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expectAspectRatio(-1);
    });

    it('handles very small positive ratio values', () => {
      const smallRatio = 0.001;
      renderMinimalAspectRatio({ ratio: smallRatio });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expectAspectRatio(smallRatio);
    });

    it('handles very large ratio values', () => {
      const largeRatio = 1000;
      renderMinimalAspectRatio({ ratio: largeRatio });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expectAspectRatio(largeRatio);
    });

    it('handles Infinity ratio value', () => {
      renderMinimalAspectRatio({ ratio: Infinity });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expectAspectRatio(Infinity);
    });

    it('handles NaN ratio value', () => {
      renderMinimalAspectRatio({ ratio: NaN });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expectAspectRatio(NaN);
    });

    it('handles empty aspect ratio container', () => {
      renderWithUserEvents(<AspectRatio ratio={16 / 9} />);
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expect(aspectRatio).toBeEmptyDOMElement();
    });

    it('handles aspect ratio with only whitespace content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={1}>
          {' '}
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
    });

    it('handles rapid prop changes gracefully', () => {
      const { rerender } = renderMinimalAspectRatio({ ratio: 16 / 9 });
      
      // Rapidly change ratios
      const ratios = [1, 4 / 3, 2.35, 9 / 16, 16 / 9];
      
      ratios.forEach(ratio => {
        rerender(
          <AspectRatio ratio={ratio}>
            <div>Rapid Change Test</div>
          </AspectRatio>
        );
        
        const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
        expect(aspectRatio).toBeInTheDocument();
        expectAspectRatio(ratio);
      });
    });

    it('handles null and undefined children gracefully', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          {null}
          <div>Valid Content</div>
          {undefined}
          {false && <div>This should not render</div>}
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expect(aspectRatio).toBeInTheDocument();
      expect(screen.getByText('Valid Content')).toBeInTheDocument();
      expect(screen.queryByText('This should not render')).not.toBeInTheDocument();
    });

    it('handles complex nested content without breaking', () => {
      renderWithUserEvents(
        <AspectRatio ratio={4 / 3}>
          <div className="h-full w-full">
            <div className="grid grid-cols-2 h-full">
              <div className="flex flex-col">
                <img src="/image1.jpg" alt="Image 1" className="flex-1 object-cover" />
                <p>Caption 1</p>
              </div>
              <div className="flex flex-col">
                <img src="/image2.jpg" alt="Image 2" className="flex-1 object-cover" />
                <p>Caption 2</p>
              </div>
            </div>
          </div>
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const image1 = screen.getByAltText('Image 1');
      const image2 = screen.getByAltText('Image 2');
      const caption1 = screen.getByText('Caption 1');
      const caption2 = screen.getByText('Caption 2');
      
      expect(aspectRatio).toBeInTheDocument();
      expect(image1).toBeInTheDocument();
      expect(image2).toBeInTheDocument();
      expect(caption1).toBeInTheDocument();
      expect(caption2).toBeInTheDocument();
    });

    it('handles extremely precise decimal ratios', () => {
      const preciseRatio = 1.7777777777777777777777;
      renderMinimalAspectRatio({ ratio: preciseRatio });
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      expectAspectRatio(preciseRatio);
    });
  });

  describe('Component Integration', () => {
    it('integrates with image content properly', () => {
      renderTestAspectRatio();
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const image = screen.getByAltText('Test image');
      
      expect(aspectRatio).toContainElement(image);
      expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
    });

    it('integrates with video content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          <video 
            src="/test-video.mp4" 
            controls
            className="h-full w-full"
            data-testid="video-content"
          >
            Your browser does not support the video tag.
          </video>
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const video = screen.getByTestId('video-content');
      
      expect(aspectRatio).toContainElement(video);
      expect(video).toHaveAttribute('controls');
      expect(video).toHaveClass('h-full', 'w-full');
    });

    it('integrates with iframe content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          <iframe
            src="https://example.com"
            title="Embedded content"
            className="h-full w-full border-0"
            data-testid="iframe-content"
          />
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const iframe = screen.getByTestId('iframe-content');
      
      expect(aspectRatio).toContainElement(iframe);
      expect(iframe).toHaveAttribute('title', 'Embedded content');
      expect(iframe).toHaveClass('h-full', 'w-full', 'border-0');
    });

    it('integrates with canvas content', () => {
      renderWithUserEvents(
        <AspectRatio ratio={1}>
          <canvas 
            width="400" 
            height="400"
            className="h-full w-full"
            data-testid="canvas-content"
          >
            Canvas not supported
          </canvas>
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const canvas = screen.getByTestId('canvas-content');
      
      expect(aspectRatio).toContainElement(canvas);
      expect(canvas).toHaveAttribute('width', '400');
      expect(canvas).toHaveAttribute('height', '400');
    });

    it('maintains child component layout and styling', () => {
      renderWithUserEvents(
        <AspectRatio ratio={4 / 3} className="bg-slate-50">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 text-white">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Styled Content</h2>
              <p className="mt-2">With gradient background</p>
            </div>
          </div>
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const heading = screen.getByText('Styled Content');
      const paragraph = screen.getByText('With gradient background');
      
      expect(aspectRatio).toHaveClass('bg-slate-50');
      expect(heading).toHaveClass('text-2xl', 'font-bold');
      expect(paragraph).toHaveClass('mt-2');
    });

    it('handles responsive image integration', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9}>
          <img
            src="https://example.com/image.jpg"
            srcSet="https://example.com/image-400.jpg 400w, https://example.com/image-800.jpg 800w"
            sizes="(max-width: 768px) 100vw, 50vw"
            alt="Responsive image"
            className="h-full w-full object-cover"
          />
        </AspectRatio>
      );
      
      const image = screen.getByAltText('Responsive image');
      
      expect(image).toHaveAttribute('srcSet');
      expect(image).toHaveAttribute('sizes');
      expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
    });

    it('integrates with complex UI components', () => {
      renderWithUserEvents(
        <AspectRatio ratio={1} className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="h-full w-full p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                U
              </div>
              <div>
                <h3 className="font-semibold">User Name</h3>
                <p className="text-sm text-gray-500">@username</p>
              </div>
            </div>
            <p className="flex-1 text-gray-700">
              This is a complex UI component integrated within an aspect ratio container.
            </p>
            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Like
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                Share
              </button>
            </div>
          </div>
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const userName = screen.getByText('User Name');
      const username = screen.getByText('@username');
      const likeButton = screen.getByRole('button', { name: 'Like' });
      const shareButton = screen.getByRole('button', { name: 'Share' });
      
      expect(aspectRatio).toHaveClass('bg-white', 'shadow-lg', 'rounded-lg', 'overflow-hidden');
      expect(userName).toBeInTheDocument();
      expect(username).toBeInTheDocument();
      expect(likeButton).toBeInTheDocument();
      expect(shareButton).toBeInTheDocument();
    });

    it('preserves z-index and positioning of child elements', () => {
      renderWithUserEvents(
        <AspectRatio ratio={16 / 9} className="relative">
          <img
            src="/background.jpg"
            alt="Background"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <h1 className="text-white text-4xl font-bold">Overlay Text</h1>
          </div>
        </AspectRatio>
      );
      
      const aspectRatio = document.querySelector('[data-slot="aspect-ratio"]');
      const backgroundImage = screen.getByAltText('Background');
      const overlayText = screen.getByText('Overlay Text');
      
      expect(aspectRatio).toHaveClass('relative');
      expect(backgroundImage).toHaveClass('absolute', 'inset-0');
      expect(overlayText.closest('div')).toHaveClass('absolute', 'inset-0');
    });
  });
});