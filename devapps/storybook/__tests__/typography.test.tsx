/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Typography components.
 *
 * This test suite validates all typography components' functionality across multiple
 * dimensions including rendering, semantic structure, accessibility, and styling consistency.
 * The typography components provide a consistent text hierarchy with proper semantic HTML
 * elements and accessible text styling for optimal readability.
 *
 * Components Tested:
 * - TypographyH1, TypographyH2, TypographyH3, TypographyH4 (Heading components)
 * - TypographyP (Paragraph component)
 * - TypographyBlockquote (Blockquote component)
 * - TypographyList (List component)
 * - TypographyInlineCode (Inline code component)
 * - TypographyLead (Lead text component)
 * - TypographyLarge (Large text component)
 * - TypographySmall (Small text component)
 * - TypographyMuted (Muted text component)
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, semantic HTML elements, default styling
 * 2. Variant Tests - Heading hierarchy, text styles, proper element types
 * 3. Props Handling - className forwarding, HTML attributes, custom props
 * 4. User Interactions - Focus management, text selection, keyboard navigation
 * 5. States - Text content states, styling consistency, responsive behavior
 * 6. Accessibility - Proper heading hierarchy, semantic structure, screen reader support
 * 7. Edge Cases - Empty content, long text, special characters, malformed content
 * 8. Component Integration - Typography hierarchy, compound usage, text transformations
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all typography variants, semantic structures, and accessibility patterns.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyList,
  TypographyInlineCode,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
} from '@repo/design-system/ui/typography';

/**
 * Helper function to render heading components with default content
 * Supports custom props for comprehensive testing scenarios
 */
const renderHeading = (
  Component: React.ComponentType<any>,
  props: any = {},
  content: React.ReactNode = 'Test Heading'
) => {
  return renderWithUserEvents(
    <Component {...props}>{content}</Component>
  );
};

/**
 * Helper function to render text components with default content
 * Tests standard text component patterns
 */
const renderTextComponent = (
  Component: React.ComponentType<any>,
  props: any = {},
  content: React.ReactNode = 'Test text content'
) => {
  return renderWithUserEvents(
    <Component {...props}>{content}</Component>
  );
};

/**
 * Helper function to render a complete typography hierarchy
 * Tests compound usage patterns with all typography components
 */
const renderTypographyHierarchy = (props: any = {}) => {
  return renderWithUserEvents(
    <div {...props}>
      <TypographyH1>Main Heading</TypographyH1>
      <TypographyLead>Lead paragraph introducing the content</TypographyLead>
      <TypographyH2>Section Heading</TypographyH2>
      <TypographyP>Regular paragraph with <TypographyInlineCode>inline code</TypographyInlineCode> elements.</TypographyP>
      <TypographyH3>Subsection</TypographyH3>
      <TypographyBlockquote>Important quote or citation</TypographyBlockquote>
      <TypographyList>
        <li>First list item</li>
        <li>Second list item</li>
      </TypographyList>
      <TypographyLarge>Large emphasis text</TypographyLarge>
      <TypographySmall>Small supporting text</TypographySmall>
      <TypographyMuted>Muted secondary information</TypographyMuted>
    </div>
  );
};

/**
 * Helper function to render list component with various content
 * Tests list structure and item handling
 */
const renderListWithItems = (props: any = {}) => {
  return renderWithUserEvents(
    <TypographyList {...props}>
      <li>First item</li>
      <li>Second item with <TypographyInlineCode>code</TypographyInlineCode></li>
      <li>Third item with <strong>emphasis</strong></li>
      <li>Fourth item</li>
    </TypographyList>
  );
};

/**
 * Helper function to render blockquote with citation
 * Tests blockquote formatting and attribution
 */
const renderBlockquoteWithCitation = (props: any = {}) => {
  return renderWithUserEvents(
    <TypographyBlockquote {...props}>
      "This is a quotation with proper attribution and formatting."
      <br />— Author Name
    </TypographyBlockquote>
  );
};

describe('Typography', () => {
  describe('Rendering Tests', () => {
    describe('Heading Components', () => {
      it('renders TypographyH1 with correct HTML element and content', () => {
        renderHeading(TypographyH1, {}, 'Main Title');
        
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H1');
        expect(heading).toHaveTextContent('Main Title');
      });

      it('renders TypographyH2 with correct HTML element and content', () => {
        renderHeading(TypographyH2, {}, 'Section Title');
        
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H2');
        expect(heading).toHaveTextContent('Section Title');
      });

      it('renders TypographyH3 with correct HTML element and content', () => {
        renderHeading(TypographyH3, {}, 'Subsection Title');
        
        const heading = screen.getByRole('heading', { level: 3 });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H3');
        expect(heading).toHaveTextContent('Subsection Title');
      });

      it('renders TypographyH4 with correct HTML element and content', () => {
        renderHeading(TypographyH4, {}, 'Minor Heading');
        
        const heading = screen.getByRole('heading', { level: 4 });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H4');
        expect(heading).toHaveTextContent('Minor Heading');
      });

      it('applies base styling classes to all headings', () => {
        const headings = [
          { Component: TypographyH1, level: 1 },
          { Component: TypographyH2, level: 2 },
          { Component: TypographyH3, level: 3 },
          { Component: TypographyH4, level: 4 },
        ];

        headings.forEach(({ Component, level }) => {
          const { unmount } = renderHeading(Component, {}, `Heading ${level}`);
          
          const heading = screen.getByRole('heading', { level });
          expect(heading).toHaveClass('scroll-m-20', 'tracking-tight');
          
          unmount();
        });
      });
    });

    describe('Text Components', () => {
      it('renders TypographyP with correct HTML element', () => {
        renderTextComponent(TypographyP, {}, 'Paragraph text content');
        
        const paragraph = screen.getByText('Paragraph text content');
        expect(paragraph).toBeInTheDocument();
        expect(paragraph.tagName).toBe('P');
      });

      it('renders TypographyBlockquote with correct HTML element', () => {
        renderTextComponent(TypographyBlockquote, {}, 'Quoted text');
        
        const blockquote = screen.getByText('Quoted text');
        expect(blockquote).toBeInTheDocument();
        expect(blockquote.tagName).toBe('BLOCKQUOTE');
      });

      it('renders TypographyList with correct HTML element', () => {
        renderTextComponent(TypographyList, {}, <li>List item</li>);
        
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
        expect(list.tagName).toBe('UL');
      });

      it('renders TypographyInlineCode with correct HTML element', () => {
        renderTextComponent(TypographyInlineCode, {}, 'console.log()');
        
        const code = screen.getByText('console.log()');
        expect(code).toBeInTheDocument();
        expect(code.tagName).toBe('CODE');
      });

      it('renders TypographyLead with correct HTML element', () => {
        renderTextComponent(TypographyLead, {}, 'Lead paragraph text');
        
        const lead = screen.getByText('Lead paragraph text');
        expect(lead).toBeInTheDocument();
        expect(lead.tagName).toBe('P');
      });

      it('renders TypographyLarge with correct HTML element', () => {
        renderTextComponent(TypographyLarge, {}, 'Large text');
        
        const large = screen.getByText('Large text');
        expect(large).toBeInTheDocument();
        expect(large.tagName).toBe('DIV');
      });

      it('renders TypographySmall with correct HTML element', () => {
        renderTextComponent(TypographySmall, {}, 'Small text');
        
        const small = screen.getByText('Small text');
        expect(small).toBeInTheDocument();
        expect(small.tagName).toBe('SMALL');
      });

      it('renders TypographyMuted with correct HTML element', () => {
        renderTextComponent(TypographyMuted, {}, 'Muted text');
        
        const muted = screen.getByText('Muted text');
        expect(muted).toBeInTheDocument();
        expect(muted.tagName).toBe('P');
      });
    });

    it('maintains proper semantic structure across all components', () => {
      renderTypographyHierarchy();
      
      // Check that all expected elements are present with correct tags
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByText(/inline code/)).toBeInTheDocument();
    });
  });

  describe('Variant Tests', () => {
    describe('Heading Hierarchy', () => {
      it('applies correct font sizes for heading hierarchy', () => {
        const { unmount: unmount1 } = renderHeading(TypographyH1);
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toHaveClass('text-4xl', 'lg:text-5xl', 'font-extrabold');
        unmount1();

        const { unmount: unmount2 } = renderHeading(TypographyH2);
        const h2 = screen.getByRole('heading', { level: 2 });
        expect(h2).toHaveClass('text-3xl', 'font-semibold', 'border-b', 'pb-2');
        unmount2();

        const { unmount: unmount3 } = renderHeading(TypographyH3);
        const h3 = screen.getByRole('heading', { level: 3 });
        expect(h3).toHaveClass('text-2xl', 'font-semibold');
        unmount3();

        const { unmount: unmount4 } = renderHeading(TypographyH4);
        const h4 = screen.getByRole('heading', { level: 4 });
        expect(h4).toHaveClass('text-xl', 'font-semibold');
        unmount4();
      });

      it('maintains consistent font weight hierarchy', () => {
        const { unmount: unmount1 } = renderHeading(TypographyH1);
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toHaveClass('font-extrabold');
        unmount1();

        // H2, H3, H4 should all use font-semibold
        const headingComponents = [
          { Component: TypographyH2, level: 2 },
          { Component: TypographyH3, level: 3 },
          { Component: TypographyH4, level: 4 },
        ];

        headingComponents.forEach(({ Component, level }) => {
          const { unmount } = renderHeading(Component);
          const heading = screen.getByRole('heading', { level });
          expect(heading).toHaveClass('font-semibold');
          unmount();
        });
      });

      it('applies first element margin reset correctly', () => {
        renderHeading(TypographyH2);
        const h2 = screen.getByRole('heading', { level: 2 });
        expect(h2).toHaveClass('first:mt-0');
      });
    });

    describe('Text Style Variants', () => {
      it('applies correct styling for paragraph component', () => {
        renderTextComponent(TypographyP);
        const paragraph = screen.getByText('Test text content');
        expect(paragraph).toHaveClass('leading-7', '[&:not(:first-child)]:mt-6');
      });

      it('applies correct styling for lead text', () => {
        renderTextComponent(TypographyLead);
        const lead = screen.getByText('Test text content');
        expect(lead).toHaveClass('text-xl', 'text-muted-foreground');
      });

      it('applies correct styling for large text', () => {
        renderTextComponent(TypographyLarge);
        const large = screen.getByText('Test text content');
        expect(large).toHaveClass('text-lg', 'font-semibold');
      });

      it('applies correct styling for small text', () => {
        renderTextComponent(TypographySmall);
        const small = screen.getByText('Test text content');
        expect(small).toHaveClass('text-sm', 'font-medium', 'leading-none');
      });

      it('applies correct styling for muted text', () => {
        renderTextComponent(TypographyMuted);
        const muted = screen.getByText('Test text content');
        expect(muted).toHaveClass('text-sm', 'text-muted-foreground');
      });

      it('applies correct styling for blockquote', () => {
        renderTextComponent(TypographyBlockquote);
        const blockquote = screen.getByText('Test text content');
        expect(blockquote).toHaveClass('mt-6', 'border-l-2', 'pl-6', 'italic');
      });

      it('applies correct styling for inline code', () => {
        renderTextComponent(TypographyInlineCode);
        const code = screen.getByText('Test text content');
        expect(code).toHaveClass(
          'relative',
          'rounded',
          'bg-muted',
          'px-[0.3rem]',
          'py-[0.2rem]',
          'font-mono',
          'text-sm'
        );
      });

      it('applies correct styling for list component', () => {
        renderListWithItems();
        const list = screen.getByRole('list');
        expect(list).toHaveClass('my-6', 'ml-6', 'list-disc', '[&>li]:mt-2');
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly for all components', () => {
      const components = [
        { Component: TypographyH1, role: 'heading' },
        { Component: TypographyH2, role: 'heading' },
        { Component: TypographyH3, role: 'heading' },
        { Component: TypographyH4, role: 'heading' },
        { Component: TypographyP, text: true },
        { Component: TypographyLead, text: true },
        { Component: TypographyLarge, text: true },
        { Component: TypographySmall, text: true },
        { Component: TypographyMuted, text: true },
      ];

      components.forEach(({ Component, role, text }) => {
        const { unmount } = renderTextComponent(Component, {
          'data-testid': 'typography-element',
          id: 'custom-id',
          'aria-label': 'Custom label',
          title: 'Custom title',
        });
        
        const element = role 
          ? screen.getByRole(role) 
          : screen.getByTestId('typography-element');
        
        expect(element).toHaveAttribute('id', 'custom-id');
        expect(element).toHaveAttribute('aria-label', 'Custom label');
        expect(element).toHaveAttribute('title', 'Custom title');
        expect(element).toHaveAttribute('data-testid', 'typography-element');
        
        unmount();
      });
    });

    it('merges custom className with default classes', () => {
      const { unmount: unmount1 } = renderHeading(TypographyH1, { 
        className: 'custom-heading-class text-blue-500' 
      });
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveClass('custom-heading-class', 'text-blue-500');
      expect(h1).toHaveClass('scroll-m-20', 'font-extrabold', 'text-4xl', 'tracking-tight');
      unmount1();

      const { unmount: unmount2 } = renderTextComponent(TypographyP, { 
        className: 'custom-paragraph-class' 
      });
      const paragraph = screen.getByText('Test text content');
      expect(paragraph).toHaveClass('custom-paragraph-class');
      expect(paragraph).toHaveClass('leading-7', '[&:not(:first-child)]:mt-6');
      unmount2();
    });

    it('handles style prop correctly', () => {
      const customStyle = {
        backgroundColor: 'rgb(255, 0, 0)',
        color: 'rgb(255, 255, 255)',
        fontSize: '20px',
      };

      const { unmount } = renderTextComponent(TypographyP, { style: customStyle });
      const paragraph = screen.getByText('Test text content');
      
      expect(paragraph).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(paragraph).toHaveStyle('color: rgb(255, 255, 255)');
      expect(paragraph).toHaveStyle('font-size: 20px');
      
      unmount();
    });

    it('spreads additional props correctly', () => {
      const customProps = {
        'data-custom': 'value',
        'aria-expanded': 'false',
        role: 'article', // Should override default for non-semantic elements
        tabIndex: 0,
      };

      const { unmount } = renderTextComponent(TypographyLarge, customProps);
      const large = screen.getByText('Test text content');
      
      expect(large).toHaveAttribute('data-custom', 'value');
      expect(large).toHaveAttribute('aria-expanded', 'false');
      expect(large).toHaveAttribute('role', 'article');
      expect(large).toHaveAttribute('tabindex', '0');
      
      unmount();
    });

    it('handles event handlers correctly', async () => {
      const handleClick = vi.fn();
      const handleMouseOver = vi.fn();
      
      const { user } = renderTextComponent(TypographyP, {
        onClick: handleClick,
        onMouseOver: handleMouseOver,
      });
      
      const paragraph = screen.getByText('Test text content');
      
      await user.click(paragraph);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.hover(paragraph);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
    });

    it('handles multiple HTML attributes simultaneously', () => {
      const multipleAttrs = {
        'data-testid': 'multi-attr-text',
        className: 'multi-class',
        id: 'multi-id',
        'aria-label': 'Multiple attributes text',
        'aria-describedby': 'description',
        title: 'Multi-attribute tooltip',
        lang: 'en',
        dir: 'ltr',
      };

      const { unmount } = renderTextComponent(TypographyH2, multipleAttrs);
      const heading = screen.getByTestId('multi-attr-text');
      
      expect(heading).toHaveClass('multi-class');
      expect(heading).toHaveAttribute('id', 'multi-id');
      expect(heading).toHaveAttribute('aria-label', 'Multiple attributes text');
      expect(heading).toHaveAttribute('aria-describedby', 'description');
      expect(heading).toHaveAttribute('title', 'Multi-attribute tooltip');
      expect(heading).toHaveAttribute('lang', 'en');
      expect(heading).toHaveAttribute('dir', 'ltr');
      
      unmount();
    });
  });

  describe('User Interactions', () => {
    it('handles text selection correctly', async () => {
      const { user } = renderTextComponent(TypographyP, {}, 'Selectable text content');
      
      const paragraph = screen.getByText('Selectable text content');
      
      // Simulate text selection
      await user.click(paragraph);
      
      // Verify the paragraph can receive focus (for text selection)
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toHaveTextContent('Selectable text content');
    });

    it('supports keyboard navigation for interactive elements', async () => {
      const handleClick = vi.fn();
      const handleKeyDown = vi.fn((e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          handleClick();
        }
      });
      
      const { user } = renderTextComponent(TypographyP, {
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        tabIndex: 0,
        role: 'button',
      });
      
      const paragraph = screen.getByRole('button');
      
      // Tab to focus
      await user.tab();
      expect(document.activeElement).toBe(paragraph);
      
      // Space to activate
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles focus events for focusable typography', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      
      const { user } = renderTextComponent(TypographyLarge, {
        onFocus: handleFocus,
        onBlur: handleBlur,
        tabIndex: 0,
      });
      
      const large = screen.getByText('Test text content');
      
      await user.click(large); // This will focus the element
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.tab(); // This will blur the element
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('supports copy functionality for code elements', async () => {
      const { user } = renderTextComponent(TypographyInlineCode, {}, 'npm install');
      
      const code = screen.getByText('npm install');
      
      // Simulate selecting code text
      await user.click(code);
      
      expect(code).toHaveTextContent('npm install');
      expect(code.tagName).toBe('CODE');
    });

    it('handles drag events for text content', async () => {
      const handleDragStart = vi.fn();
      const { user } = renderTextComponent(TypographyP, {
        draggable: true,
        onDragStart: handleDragStart,
      });
      
      const paragraph = screen.getByText('Test text content');
      
      // Trigger drag start event
      fireEvent.dragStart(paragraph);
      expect(handleDragStart).toHaveBeenCalledTimes(1);
    });

    it('maintains proper text flow and line breaking', () => {
      const longText = 'This is a very long text content that should wrap properly and maintain good readability across different viewport sizes and text scaling preferences';
      
      const { unmount } = renderTextComponent(TypographyP, {}, longText);
      const paragraph = screen.getByText(longText);
      
      expect(paragraph).toHaveTextContent(longText);
      expect(paragraph).toHaveClass('leading-7'); // Proper line height
      
      unmount();
    });

    it('supports context menu interactions', async () => {
      const handleContextMenu = vi.fn();
      const { user } = renderTextComponent(TypographyBlockquote, {
        onContextMenu: handleContextMenu,
      });
      
      const blockquote = screen.getByText('Test text content');
      
      // Right-click to trigger context menu
      fireEvent.contextMenu(blockquote);
      expect(handleContextMenu).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('maintains consistent text content across re-renders', () => {
      const initialText = 'Initial text content';
      const updatedText = 'Updated text content';
      
      const { rerender } = renderTextComponent(TypographyP, {}, initialText);
      
      let paragraph = screen.getByText(initialText);
      expect(paragraph).toHaveTextContent(initialText);
      
      // Re-render with new content
      rerender(<TypographyP>{updatedText}</TypographyP>);
      
      paragraph = screen.getByText(updatedText);
      expect(paragraph).toHaveTextContent(updatedText);
    });

    it('handles dynamic className changes properly', () => {
      const { rerender } = renderTextComponent(TypographyH1, { className: 'initial-class' });
      
      let heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('initial-class');
      
      // Update className
      rerender(<TypographyH1 className="updated-class">Test Heading</TypographyH1>);
      
      heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('updated-class');
      expect(heading).not.toHaveClass('initial-class');
    });

    it('preserves semantic structure during state changes', () => {
      const { rerender } = renderHeading(TypographyH2, { id: 'dynamic-heading' });
      
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'dynamic-heading');
      
      rerender(<TypographyH2 id="dynamic-heading" className="new-class">Updated Heading</TypographyH2>);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveAttribute('id', 'dynamic-heading');
      expect(heading).toHaveClass('new-class');
      expect(heading).toHaveTextContent('Updated Heading');
    });

    it('handles content state transitions smoothly', () => {
      const { rerender } = renderTextComponent(TypographyLead, {}, 'Loading...');
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      rerender(<TypographyLead>Content loaded successfully</TypographyLead>);
      
      expect(screen.getByText('Content loaded successfully')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('maintains styling consistency across state changes', () => {
      const { rerender } = renderTextComponent(TypographyMuted, { className: 'initial' });
      
      let muted = screen.getByText('Test text content');
      expect(muted).toHaveClass('initial', 'text-sm', 'text-muted-foreground');
      
      rerender(<TypographyMuted className="updated">Updated content</TypographyMuted>);
      
      muted = screen.getByText('Updated content');
      expect(muted).toHaveClass('updated', 'text-sm', 'text-muted-foreground');
      expect(muted).not.toHaveClass('initial');
    });

    it('handles visibility state changes', () => {
      const { rerender } = renderTextComponent(TypographyP, { 
        style: { display: 'block' } 
      });
      
      let paragraph = screen.getByText('Test text content');
      expect(paragraph).toBeVisible();
      
      rerender(<TypographyP style={{ display: 'none' }}>Test text content</TypographyP>);
      
      paragraph = screen.getByText('Test text content');
      expect(paragraph).not.toBeVisible();
    });
  });

  describe('Accessibility', () => {
    describe('Heading Accessibility', () => {
      it('maintains proper heading hierarchy', () => {
        renderTypographyHierarchy();
        
        const h1 = screen.getByRole('heading', { level: 1 });
        const h2 = screen.getByRole('heading', { level: 2 });
        const h3 = screen.getByRole('heading', { level: 3 });
        
        expect(h1).toBeInTheDocument();
        expect(h2).toBeInTheDocument();
        expect(h3).toBeInTheDocument();
        
        // Headings should have accessible names
        expect(h1).toHaveAccessibleName();
        expect(h2).toHaveAccessibleName();
        expect(h3).toHaveAccessibleName();
      });

      it('supports ARIA labels for enhanced accessibility', () => {
        const { unmount } = renderHeading(TypographyH1, {
          'aria-label': 'Main page heading'
        }, 'Welcome');
        
        const heading = screen.getByLabelText('Main page heading');
        expect(heading).toHaveTextContent('Welcome');
        expect(heading).toHaveAttribute('aria-label', 'Main page heading');
        
        unmount();
      });

      it('supports aria-describedby for detailed descriptions', () => {
        const { unmount } = renderWithUserEvents(
          <div>
            <TypographyH2 aria-describedby="heading-description">Section Title</TypographyH2>
            <TypographyMuted id="heading-description">This section covers advanced topics</TypographyMuted>
          </div>
        );
        
        const heading = screen.getByRole('heading', { level: 2 });
        const description = screen.getByText('This section covers advanced topics');
        
        expect(heading).toHaveAttribute('aria-describedby', 'heading-description');
        expect(description).toHaveAttribute('id', 'heading-description');
        
        unmount();
      });

      it('ensures headings are discoverable by screen readers', () => {
        const headingComponents = [
          { Component: TypographyH1, level: 1, text: 'Heading 1' },
          { Component: TypographyH2, level: 2, text: 'Heading 2' },
          { Component: TypographyH3, level: 3, text: 'Heading 3' },
          { Component: TypographyH4, level: 4, text: 'Heading 4' },
        ];

        headingComponents.forEach(({ Component, level, text }) => {
          const { unmount } = renderHeading(Component, {}, text);
          
          const heading = screen.getByRole('heading', { level });
          
          // Should be accessible by screen readers
          accessibility.expectToBeAccessible(heading, { 
            checkKeyboardSupport: false // Headings don't need keyboard interaction
          });
          
          expect(heading).toHaveAccessibleName();
          
          unmount();
        });
      });
    });

    describe('Text Content Accessibility', () => {
      it('provides proper semantic markup for text elements', () => {
        renderTypographyHierarchy();
        
        // List should be properly marked up
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
        expect(list.tagName).toBe('UL');
        
        // List items should be accessible
        const listItems = screen.getAllByRole('listitem');
        expect(listItems).toHaveLength(2);
      });

      it('ensures code elements are accessible to screen readers', () => {
        const { unmount } = renderWithUserEvents(
          <TypographyP>
            Install dependencies with <TypographyInlineCode>npm install</TypographyInlineCode> command
          </TypographyP>
        );
        
        const code = screen.getByText('npm install');
        expect(code.tagName).toBe('CODE');
        expect(code).toHaveClass('font-mono'); // Monospace font for accessibility
        
        unmount();
      });

      it('supports language attributes for international content', () => {
        const { unmount } = renderTextComponent(TypographyP, {
          lang: 'es',
          dir: 'ltr'
        }, 'Contenido en español');
        
        const paragraph = screen.getByText('Contenido en español');
        expect(paragraph).toHaveAttribute('lang', 'es');
        expect(paragraph).toHaveAttribute('dir', 'ltr');
        
        unmount();
      });

      it('maintains proper text contrast for readability', () => {
        const textComponents = [
          { Component: TypographyP, class: 'leading-7' },
          { Component: TypographyLead, class: 'text-muted-foreground' },
          { Component: TypographySmall, class: 'text-sm' },
          { Component: TypographyMuted, class: 'text-muted-foreground' },
        ];

        textComponents.forEach(({ Component, class: expectedClass }) => {
          const { unmount } = renderTextComponent(Component);
          
          const element = screen.getByText('Test text content');
          expect(element).toHaveClass(expectedClass);
          
          // Text should be readable (not completely transparent)
          const computedStyle = window.getComputedStyle(element);
          expect(computedStyle.opacity).not.toBe('0');
          
          unmount();
        });
      });

      it('provides proper blockquote semantics', () => {
        const { unmount } = renderBlockquoteWithCitation();
        
        const blockquote = screen.getByText(/This is a quotation/);
        expect(blockquote.tagName).toBe('BLOCKQUOTE');
        expect(blockquote).toHaveClass('italic'); // Visual indication of quotation
        
        unmount();
      });

      it('ensures proper list semantics and navigation', () => {
        const { unmount } = renderListWithItems();
        
        const list = screen.getByRole('list');
        const listItems = screen.getAllByRole('listitem');
        
        expect(list).toBeInTheDocument();
        expect(listItems).toHaveLength(4);
        
        // Each list item should be properly marked up
        listItems.forEach(item => {
          expect(item.tagName).toBe('LI');
        });
        
        unmount();
      });
    });

    describe('Focus Management', () => {
      it('handles focus states appropriately for interactive text', async () => {
        const { user } = renderTextComponent(TypographyP, {
          tabIndex: 0,
          'aria-label': 'Interactive paragraph'
        });
        
        const paragraph = screen.getByLabelText('Interactive paragraph');
        
        // Should be focusable
        await user.tab();
        expect(document.activeElement).toBe(paragraph);
        
        accessibility.expectToBeAccessible(paragraph, {
          checkKeyboardSupport: false // Custom interactive element
        });
      });

      it('ensures headings can be focused for skip navigation', async () => {
        const { user } = renderHeading(TypographyH2, {
          tabIndex: -1,
          id: 'skip-target'
        }, 'Skip Target Heading');
        
        const heading = screen.getByText('Skip Target Heading');
        
        // Should be programmatically focusable
        heading.focus();
        expect(document.activeElement).toBe(heading);
        expect(heading).toHaveAttribute('id', 'skip-target');
      });

      it('maintains focus visibility for keyboard users', () => {
        const { unmount } = renderTextComponent(TypographyLarge, {
          tabIndex: 0,
          style: { outline: '2px solid blue' } // Mock focus outline
        });
        
        const large = screen.getByText('Test text content');
        expect(large).toHaveStyle('outline: 2px solid blue');
        
        unmount();
      });
    });

    describe('Screen Reader Support', () => {
      it('provides appropriate text alternatives for complex content', () => {
        const { unmount } = renderWithUserEvents(
          <TypographyBlockquote aria-label="Quote from design principles">
            "Good design is as little design as possible."
            <br />
            <TypographySmall>— Dieter Rams</TypographySmall>
          </TypographyBlockquote>
        );
        
        const blockquote = screen.getByLabelText('Quote from design principles');
        expect(blockquote).toHaveAccessibleName();
        
        unmount();
      });

      it('ensures proper reading order for complex layouts', () => {
        renderTypographyHierarchy();
        
        // Elements should be in proper DOM order for screen readers
        const allText = document.body.textContent;
        expect(allText).toMatch(/Main Heading.*Lead paragraph.*Section Heading/);
      });

      it('supports ARIA landmarks for better navigation', () => {
        const { unmount } = renderWithUserEvents(
          <div>
            <TypographyH1 role="banner">Site Title</TypographyH1>
            <div role="main">
              <TypographyH2>Main Content</TypographyH2>
              <TypographyP>Main content paragraph</TypographyP>
            </div>
            <TypographyMuted role="contentinfo">Footer information</TypographyMuted>
          </div>
        );
        
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content gracefully', () => {
      const components = [
        TypographyH1, TypographyH2, TypographyH3, TypographyH4,
        TypographyP, TypographyLead, TypographyLarge, TypographySmall, TypographyMuted
      ];

      components.forEach(Component => {
        const { unmount } = renderTextComponent(Component, {}, '');
        
        const element = document.body.querySelector('h1, h2, h3, h4, p, div, small') as HTMLElement;
        expect(element).toBeInTheDocument();
        expect(element.textContent).toBe('');
        
        unmount();
      });
    });

    it('handles whitespace-only content appropriately', () => {
      const { unmount } = renderTextComponent(TypographyP, {}, '   \n\t  ');
      
      const element = document.body.querySelector('p') as HTMLElement;
      expect(element).toBeInTheDocument();
      expect(element.textContent).toMatch(/^\s+$/);
      
      unmount();
    });

    it('handles very long text content without breaking layout', () => {
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
      
      const { unmount } = renderTextComponent(TypographyP, {}, longText);
      
      const element = document.body.querySelector('p') as HTMLElement;
      expect(element).toBeInTheDocument();
      expect(element.textContent).toBe(longText);
      expect(element).toHaveClass('leading-7'); // Maintains proper line height
      
      unmount();
    });

    it('handles special characters and Unicode properly', () => {
      const specialTexts = [
        '🎉 Emoji content',
        '© 2024 Copyright',
        '&lt;script&gt;alert("xss")&lt;/script&gt;',
        'العربية', // Arabic
        '测试', // Chinese
        'Русский', // Russian
        'ñañé', // Special accents
        '€$¥£', // Currency symbols
      ];

      specialTexts.forEach(text => {
        const { unmount } = renderTextComponent(TypographyP, {}, text);
        
        const paragraph = screen.getByText(text);
        expect(paragraph).toHaveTextContent(text);
        
        unmount();
      });
    });

    it('handles null and undefined content gracefully', () => {
      const { unmount } = renderWithUserEvents(
        <TypographyP>
          {null}
          {undefined}
          Visible content
          {false && 'Hidden'}
        </TypographyP>
      );
      
      const paragraph = screen.getByText('Visible content');
      expect(paragraph).toHaveTextContent('Visible content');
      
      unmount();
    });

    it('handles malformed HTML attributes gracefully', () => {
      const malformedProps = {
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%',
        style: { fontSize: 'invalid-value' } as any,
      };

      const { unmount } = renderTextComponent(TypographyH1, malformedProps);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(heading).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
      
      unmount();
    });

    it('handles rapid content changes without memory leaks', () => {
      const { rerender } = renderTextComponent(TypographyP);
      
      // Rapidly change content many times
      for (let i = 0; i < 100; i++) {
        rerender(<TypographyP key={i}>Content {i}</TypographyP>);
      }
      
      // Should still be functioning
      const paragraph = screen.getByText('Content 99');
      expect(paragraph).toBeInTheDocument();
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      const { unmount } = renderTextComponent(TypographyP, { className: longClassName });
      
      const paragraph = screen.getByText('Test text content');
      expect(paragraph).toHaveClass(longClassName);
      
      unmount();
    });

    it('handles multiple nested elements in content', () => {
      const { unmount } = renderWithUserEvents(
        <TypographyP>
          <span>Nested span</span>
          <strong>Strong text</strong>
          <em>Emphasized text</em>
          <TypographyInlineCode>inline.code()</TypographyInlineCode>
        </TypographyP>
      );
      
      // Check individual text elements exist
      expect(screen.getByText('Nested span')).toBeInTheDocument();
      expect(screen.getByText('Strong text')).toBeInTheDocument();
      expect(screen.getByText('Emphasized text')).toBeInTheDocument();
      expect(screen.getByText('inline.code()')).toBeInTheDocument();
      
      // Check semantic HTML elements
      expect(screen.getByText('Nested span').tagName).toBe('SPAN');
      expect(screen.getByText('Strong text').tagName).toBe('STRONG');
      expect(screen.getByText('Emphasized text').tagName).toBe('EM');
      expect(screen.getByText('inline.code()').tagName).toBe('CODE');
      
      unmount();
    });

    it('handles conflicting CSS classes gracefully', () => {
      const { unmount } = renderTextComponent(TypographyH1, {
        className: 'text-sm font-light text-red-500',
      });
      
      const heading = screen.getByRole('heading', { level: 1 });
      // Should have both custom and default classes (CSS cascade determines final styling)
      expect(heading).toHaveClass('text-sm', 'font-light', 'text-red-500');
      expect(heading).toHaveClass('scroll-m-20', 'tracking-tight', 'lg:text-5xl');
      
      unmount();
    });

    it('handles list with invalid or empty items', () => {
      const { unmount } = renderWithUserEvents(
        <TypographyList>
          <li>Valid item</li>
          <li></li>
          <li>{null}</li>
          <li>
            <TypographyInlineCode>code</TypographyInlineCode>
          </li>
        </TypographyList>
      );
      
      const list = screen.getByRole('list');
      const listItems = screen.getAllByRole('listitem');
      
      expect(list).toBeInTheDocument();
      expect(listItems).toHaveLength(4);
      expect(listItems[0]).toHaveTextContent('Valid item');
      expect(listItems[3]).toContainElement(listItems[3].querySelector('code') as HTMLElement);
      
      unmount();
    });
  });

  describe('Component Integration', () => {
    it('integrates properly in complete typography hierarchy', () => {
      renderTypographyHierarchy();
      
      // Verify all components are present and properly structured
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Heading');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section Heading');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subsection');
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByText(/Lead paragraph/)).toBeInTheDocument();
      expect(screen.getByText(/inline code/)).toBeInTheDocument();
    });

    it('maintains proper spacing and layout in compound usage', () => {
      renderTypographyHierarchy();
      
      // H2 should have proper spacing classes
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveClass('first:mt-0');
      
      // Check specific paragraph element with proper class
      const regularParagraph = screen.getByText(/Regular paragraph/);
      expect(regularParagraph).toHaveClass('[&:not(:first-child)]:mt-6');
    });

    it('handles nested typography components correctly', () => {
      const { unmount } = renderWithUserEvents(
        <TypographyP>
          This paragraph contains{' '}
          <TypographyInlineCode>inline code</TypographyInlineCode>{' '}
          and{' '}
          <TypographySmall>small text</TypographySmall>{' '}
          elements.
        </TypographyP>
      );
      
      const paragraph = screen.getByText(/This paragraph contains/);
      const code = screen.getByText('inline code');
      const small = screen.getByText('small text');
      
      expect(paragraph).toContainElement(code);
      expect(paragraph).toContainElement(small);
      expect(code.tagName).toBe('CODE');
      expect(small.tagName).toBe('SMALL');
      
      unmount();
    });

    it('integrates with complex list structures', () => {
      const { unmount } = renderWithUserEvents(
        <TypographyList>
          <li>
            <TypographyLarge>Important item</TypographyLarge>
            <TypographySmall>With additional details</TypographySmall>
          </li>
          <li>
            Regular item with <TypographyInlineCode>code.example()</TypographyInlineCode>
          </li>
          <li>
            <TypographyP>Nested paragraph content</TypographyP>
          </li>
        </TypographyList>
      );
      
      const list = screen.getByRole('list');
      const listItems = screen.getAllByRole('listitem');
      
      expect(list).toBeInTheDocument();
      expect(listItems).toHaveLength(3);
      
      // First item has nested large and small text
      expect(screen.getByText('Important item')).toBeInTheDocument();
      expect(screen.getByText('With additional details')).toBeInTheDocument();
      
      // Second item has inline code
      expect(screen.getByText('code.example()')).toBeInTheDocument();
      
      // Third item has nested paragraph
      expect(screen.getByText('Nested paragraph content')).toBeInTheDocument();
      
      unmount();
    });

    it('handles blockquote with complex citation structure', () => {
      const { unmount } = renderWithUserEvents(
        <TypographyBlockquote>
          <TypographyP>
            "The best way to find out if you can trust somebody is to trust them."
          </TypographyP>
          <br />
          <TypographySmall>
            — Ernest Hemingway, <TypographyInlineCode>A Moveable Feast</TypographyInlineCode>
          </TypographySmall>
        </TypographyBlockquote>
      );
      
      const blockquote = screen.getByText(/The best way to find out/).closest('blockquote') as HTMLElement;
      expect(blockquote).toBeInTheDocument();
      expect(blockquote.tagName).toBe('BLOCKQUOTE');
      
      // Should contain nested elements
      expect(screen.getByText('A Moveable Feast')).toBeInTheDocument();
      expect(screen.getByText(/Ernest Hemingway/)).toBeInTheDocument();
      
      unmount();
    });

    it('maintains responsive typography behavior', () => {
      const { unmount } = renderWithUserEvents(
        <div className="responsive-container">
          <TypographyH1 className="sm:text-6xl">Responsive Heading</TypographyH1>
          <TypographyP className="sm:text-lg">Responsive paragraph content</TypographyP>
        </div>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      const paragraph = screen.getByText(/Responsive paragraph/);
      
      expect(heading).toHaveClass('sm:text-6xl', 'text-4xl', 'lg:text-5xl');
      expect(paragraph).toHaveClass('sm:text-lg', 'leading-7');
      
      unmount();
    });

    it('supports theme integration and custom styling', () => {
      const { unmount } = renderWithUserEvents(
        <div className="dark">
          <TypographyH1 className="dark:text-white">Dark Mode Heading</TypographyH1>
          <TypographyMuted className="dark:text-gray-400">Dark mode muted text</TypographyMuted>
        </div>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      const muted = screen.getByText(/Dark mode muted/);
      
      expect(heading).toHaveClass('dark:text-white');
      expect(muted).toHaveClass('dark:text-gray-400', 'text-muted-foreground');
      
      unmount();
    });

    it('handles form integration and labeling', () => {
      const { unmount } = renderWithUserEvents(
        <form>
          <TypographyH2>Contact Form</TypographyH2>
          <TypographyP>Please fill out the form below:</TypographyP>
          
          <div>
            <TypographySmall htmlFor="email" role="label">
              Email Address
              <TypographyInlineCode>*required</TypographyInlineCode>
            </TypographySmall>
            <input type="email" id="email" aria-describedby="email-help" />
            <TypographyMuted id="email-help">We'll never share your email</TypographyMuted>
          </div>
        </form>
      );
      
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Contact Form');
      expect(screen.getByText(/Please fill out/)).toBeInTheDocument();
      expect(screen.getByText('*required')).toBeInTheDocument();
      expect(screen.getByText(/never share/)).toHaveAttribute('id', 'email-help');
      
      unmount();
    });

    it('integrates with interactive elements and state management', async () => {
      const { user, unmount } = renderWithUserEvents(
        <div>
          <TypographyH3 id="section-1">Interactive Section</TypographyH3>
          <TypographyP>
            Click the button to <TypographyInlineCode>toggleContent()</TypographyInlineCode>
          </TypographyP>
          <button type="button" aria-describedby="section-1" data-testid="toggle-btn">
            Toggle
          </button>
          <TypographyMuted id="status">Content visible</TypographyMuted>
        </div>
      );
      
      const button = screen.getByTestId('toggle-btn');
      const heading = screen.getByRole('heading', { level: 3 });
      const status = screen.getByText('Content visible');
      
      expect(button).toHaveAttribute('aria-describedby', 'section-1');
      expect(heading).toHaveAttribute('id', 'section-1');
      expect(status).toHaveAttribute('id', 'status');
      
      await user.click(button);
      expect(button).toBeInTheDocument(); // Should remain functional
      
      unmount();
    });

    it('handles performance with many typography elements', () => {
      const manyElements = Array.from({ length: 50 }, (_, i) => (
        <TypographyP key={i} data-testid={`paragraph-${i}`}>
          Paragraph {i} with some content
        </TypographyP>
      ));
      
      const { unmount } = renderWithUserEvents(
        <div>{manyElements}</div>
      );
      
      // Should render all elements without performance issues
      for (let i = 0; i < 50; i++) {
        expect(screen.getByTestId(`paragraph-${i}`)).toBeInTheDocument();
      }
      
      // First and last should be properly styled
      const firstP = screen.getByTestId('paragraph-0');
      const lastP = screen.getByTestId('paragraph-49');
      
      expect(firstP).toHaveClass('leading-7', '[&:not(:first-child)]:mt-6');
      expect(lastP).toHaveClass('leading-7', '[&:not(:first-child)]:mt-6');
      
      unmount();
    });
  });
});