/**
 * @fileoverview Design System Tests - Card Components
 * 
 * Comprehensive test suite for the Card component system including Card, CardHeader, CardFooter,
 * CardTitle, CardAction, CardDescription, and CardContent components. Validates compound component
 * composition, grid layout system, responsive design patterns, and interactive behavior.
 * 
 * **Test Scope:**
 * - Card container and layout system
 * - Header component with grid-based action positioning
 * - Content, footer, title, description, and action subcomponents
 * - Responsive design and container queries
 * - Interactive behavior and event handling
 * - Accessibility features and semantic structure
 * 
 * **Test Categories:**
 * 1. **Component Rendering**: DOM structure validation for all card components
 * 2. **Layout System**: Grid-based layouts, spacing, and responsive behavior
 * 3. **Component Composition**: Complex card structures with multiple components
 * 4. **Interactive Elements**: Click handling, focus management, user interactions
 * 5. **Responsive Design**: Container queries and adaptive layouts
 * 6. **Accessibility**: ARIA attributes, semantic roles, keyboard navigation
 * 7. **Edge Cases**: Boundary conditions, nested structures, special content
 * 
 * **Mock Strategy:**
 * - Vitest mocking for event handlers and user interactions
 * - React Testing Library user events for realistic behavior testing
 * - No external dependencies (pure UI component system)
 * 
 * **Quality Standards:**
 * - Complete API coverage for all card components
 * - Grid layout validation and responsive behavior
 * - Accessibility compliance and keyboard navigation
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithUserEvents } from '../../test-utils';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders a div element', () => {
      render(<Card data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<Card>Content</Card>);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<Card>Content</Card>);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass(
        'flex',
        'flex-col',
        'gap-6',
        'rounded-xl',
        'border',
        'bg-card',
        'py-6',
        'text-card-foreground',
        'shadow-sm'
      );
    });

    it('merges custom className with default classes', () => {
      render(<Card className="custom-class">Content</Card>);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('custom-class', 'flex', 'flex-col', 'gap-6');
    });

    it('forwards HTML div props', () => {
      render(
        <Card
          id="test-card"
          data-testid="card-element"
          onClick={() => {}}
          role="article"
        >
          Content
        </Card>
      );
      
      const card = screen.getByTestId('card-element');
      expect(card).toHaveAttribute('id', 'test-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('renders children correctly', () => {
      render(
        <Card>
          <div>Child 1</div>
          <span>Child 2</span>
        </Card>
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('handles click events', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Card onClick={handleClick} data-testid="clickable-card">
          Clickable content
        </Card>
      );
      
      const card = screen.getByTestId('clickable-card');
      await user.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('CardHeader', () => {
    it('renders a div element', () => {
      render(<CardHeader data-testid="card-header">Header</CardHeader>);
      
      const header = screen.getByTestId('card-header');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<CardHeader>Header</CardHeader>);
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardHeader>Header</CardHeader>);
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass(
        '@container/card-header',
        'grid',
        'auto-rows-min',
        'grid-rows-[auto_auto]',
        'items-start',
        'gap-1.5',
        'px-6'
      );
    });

    it('applies grid layout classes for card actions', () => {
      render(<CardHeader>Header</CardHeader>);
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
    });

    it('applies border bottom spacing class', () => {
      render(<CardHeader>Header</CardHeader>);
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass('[.border-b]:pb-6');
    });

    it('merges custom className with default classes', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>);
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass('custom-header', 'grid', 'px-6');
    });

    it('forwards HTML div props', () => {
      render(
        <CardHeader
          id="test-header"
          data-testid="header-element"
          role="banner"
        >
          Header content
        </CardHeader>
      );
      
      const header = screen.getByTestId('header-element');
      expect(header).toHaveAttribute('id', 'test-header');
      expect(header).toHaveAttribute('role', 'banner');
    });
  });

  describe('CardTitle', () => {
    it('renders a div element', () => {
      render(<CardTitle data-testid="card-title">Title</CardTitle>);
      
      const title = screen.getByTestId('card-title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<CardTitle>Title</CardTitle>);
      
      const title = document.querySelector('[data-slot="card-title"]');
      expect(title).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardTitle>Title</CardTitle>);
      
      const title = document.querySelector('[data-slot="card-title"]');
      expect(title).toHaveClass('font-semibold', 'leading-none');
    });

    it('merges custom className with default classes', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      
      const title = document.querySelector('[data-slot="card-title"]');
      expect(title).toHaveClass('custom-title', 'font-semibold', 'leading-none');
    });

    it('renders title text correctly', () => {
      render(<CardTitle>My Card Title</CardTitle>);
      
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <CardTitle
          id="test-title"
          data-testid="title-element"
        >
          Title content
        </CardTitle>
      );
      
      const title = screen.getByTestId('title-element');
      expect(title).toHaveAttribute('id', 'test-title');
    });
  });

  describe('CardDescription', () => {
    it('renders a div element', () => {
      render(<CardDescription data-testid="card-description">Description</CardDescription>);
      
      const description = screen.getByTestId('card-description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<CardDescription>Description</CardDescription>);
      
      const description = document.querySelector('[data-slot="card-description"]');
      expect(description).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardDescription>Description</CardDescription>);
      
      const description = document.querySelector('[data-slot="card-description"]');
      expect(description).toHaveClass('text-muted-foreground', 'text-sm');
    });

    it('merges custom className with default classes', () => {
      render(<CardDescription className="custom-description">Description</CardDescription>);
      
      const description = document.querySelector('[data-slot="card-description"]');
      expect(description).toHaveClass('custom-description', 'text-muted-foreground', 'text-sm');
    });

    it('renders description text correctly', () => {
      render(<CardDescription>This is a card description</CardDescription>);
      
      expect(screen.getByText('This is a card description')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <CardDescription
          id="test-description"
          data-testid="description-element"
        >
          Description content
        </CardDescription>
      );
      
      const description = screen.getByTestId('description-element');
      expect(description).toHaveAttribute('id', 'test-description');
    });
  });

  describe('CardAction', () => {
    it('renders a div element', () => {
      render(<CardAction data-testid="card-action">Action</CardAction>);
      
      const action = screen.getByTestId('card-action');
      expect(action).toBeInTheDocument();
      expect(action.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<CardAction>Action</CardAction>);
      
      const action = document.querySelector('[data-slot="card-action"]');
      expect(action).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardAction>Action</CardAction>);
      
      const action = document.querySelector('[data-slot="card-action"]');
      expect(action).toHaveClass(
        'col-start-2',
        'row-span-2',
        'row-start-1',
        'self-start',
        'justify-self-end'
      );
    });

    it('merges custom className with default classes', () => {
      render(<CardAction className="custom-action">Action</CardAction>);
      
      const action = document.querySelector('[data-slot="card-action"]');
      expect(action).toHaveClass('custom-action', 'col-start-2', 'row-span-2');
    });

    it('renders action content correctly', () => {
      render(<CardAction>Action Button</CardAction>);
      
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <CardAction
          id="test-action"
          data-testid="action-element"
        >
          Action content
        </CardAction>
      );
      
      const action = screen.getByTestId('action-element');
      expect(action).toHaveAttribute('id', 'test-action');
    });
  });

  describe('CardContent', () => {
    it('renders a div element', () => {
      render(<CardContent data-testid="card-content">Content</CardContent>);
      
      const content = screen.getByTestId('card-content');
      expect(content).toBeInTheDocument();
      expect(content.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<CardContent>Content</CardContent>);
      
      const content = document.querySelector('[data-slot="card-content"]');
      expect(content).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardContent>Content</CardContent>);
      
      const content = document.querySelector('[data-slot="card-content"]');
      expect(content).toHaveClass('px-6');
    });

    it('merges custom className with default classes', () => {
      render(<CardContent className="custom-content">Content</CardContent>);
      
      const content = document.querySelector('[data-slot="card-content"]');
      expect(content).toHaveClass('custom-content', 'px-6');
    });

    it('renders content correctly', () => {
      render(<CardContent>Main card content</CardContent>);
      
      expect(screen.getByText('Main card content')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <CardContent
          id="test-content"
          data-testid="content-element"
        >
          Content
        </CardContent>
      );
      
      const content = screen.getByTestId('content-element');
      expect(content).toHaveAttribute('id', 'test-content');
    });
  });

  describe('CardFooter', () => {
    it('renders a div element', () => {
      render(<CardFooter data-testid="card-footer">Footer</CardFooter>);
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toBeInTheDocument();
      expect(footer.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<CardFooter>Footer</CardFooter>);
      
      const footer = document.querySelector('[data-slot="card-footer"]');
      expect(footer).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<CardFooter>Footer</CardFooter>);
      
      const footer = document.querySelector('[data-slot="card-footer"]');
      expect(footer).toHaveClass('flex', 'items-center', 'px-6');
    });

    it('applies border top spacing class', () => {
      render(<CardFooter>Footer</CardFooter>);
      
      const footer = document.querySelector('[data-slot="card-footer"]');
      expect(footer).toHaveClass('[.border-t]:pt-6');
    });

    it('merges custom className with default classes', () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>);
      
      const footer = document.querySelector('[data-slot="card-footer"]');
      expect(footer).toHaveClass('custom-footer', 'flex', 'items-center', 'px-6');
    });

    it('renders footer content correctly', () => {
      render(<CardFooter>Footer content</CardFooter>);
      
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <CardFooter
          id="test-footer"
          data-testid="footer-element"
        >
          Footer content
        </CardFooter>
      );
      
      const footer = screen.getByTestId('footer-element');
      expect(footer).toHaveAttribute('id', 'test-footer');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
            <CardAction>
              <button>Action</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter>
            <button>Footer Action</button>
          </CardFooter>
        </Card>
      );
      
      const card = screen.getByTestId('complete-card');
      expect(card).toBeInTheDocument();
      
      // Check all components are present
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description text')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('This is the main content of the card.')).toBeInTheDocument();
      expect(screen.getByText('Footer Action')).toBeInTheDocument();
      
      // Check structure
      expect(card).toContainElement(screen.getByText('Card Title'));
      expect(card).toContainElement(screen.getByText('Footer Action'));
    });

    it('handles card with only header and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Simple Card</CardTitle>
          </CardHeader>
          <CardContent>
            Simple content
          </CardContent>
        </Card>
      );
      
      expect(screen.getByText('Simple Card')).toBeInTheDocument();
      expect(screen.getByText('Simple content')).toBeInTheDocument();
    });

    it('handles card with custom content structure', () => {
      render(
        <Card>
          <div className="custom-layout">
            <h2>Custom Header</h2>
            <div>Custom Content</div>
          </div>
        </Card>
      );
      
      expect(screen.getByText('Custom Header')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('handles interactive card components', async () => {
      const handleHeaderClick = vi.fn();
      const handleActionClick = vi.fn();
      const handleFooterClick = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Card>
          <CardHeader onClick={handleHeaderClick}>
            <CardTitle>Interactive Card</CardTitle>
            <CardAction>
              <button onClick={handleActionClick}>Action</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            Content
          </CardContent>
          <CardFooter>
            <button onClick={handleFooterClick}>Footer Button</button>
          </CardFooter>
        </Card>
      );
      
      // Click header
      const header = document.querySelector('[data-slot="card-header"]');
      if (header) {
        await user.click(header);
        expect(handleHeaderClick).toHaveBeenCalledTimes(1);
      }
      
      // Click action button
      await user.click(screen.getByText('Action'));
      expect(handleActionClick).toHaveBeenCalledTimes(1);
      
      // Click footer button
      await user.click(screen.getByText('Footer Button'));
      expect(handleFooterClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive and Layout', () => {
    it('applies container query classes to header', () => {
      render(<CardHeader>Header</CardHeader>);
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass('@container/card-header');
    });

    it('handles complex grid layouts in header', () => {
      render(
        <CardHeader>
          <CardTitle>Title with Action</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
      );
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass(
        'grid',
        'auto-rows-min',
        'grid-rows-[auto_auto]',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto]'
      );
      
      const action = document.querySelector('[data-slot="card-action"]');
      expect(action).toHaveClass(
        'col-start-2',
        'row-span-2',
        'row-start-1',
        'self-start',
        'justify-self-end'
      );
    });

    it('applies consistent padding across components', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      
      const header = document.querySelector('[data-slot="card-header"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      expect(header).toHaveClass('px-6');
      expect(content).toHaveClass('px-6');
      expect(footer).toHaveClass('px-6');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty card', () => {
      render(<Card data-testid="empty-card" />);
      
      const card = screen.getByTestId('empty-card');
      expect(card).toBeInTheDocument();
      expect(card.textContent).toBe('');
    });

    it('handles null className', () => {
      render(<Card className={null as any}>Content</Card>);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('handles undefined children', () => {
      render(<Card>{undefined}</Card>);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('handles multiple children of same type', () => {
      render(
        <Card>
          <CardContent>Content 1</CardContent>
          <CardContent>Content 2</CardContent>
        </Card>
      );
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('handles nested cards', () => {
      render(
        <Card data-testid="outer-card">
          <CardContent>
            <Card data-testid="inner-card">
              <CardContent>Nested content</CardContent>
            </Card>
          </CardContent>
        </Card>
      );
      
      const outerCard = screen.getByTestId('outer-card');
      const innerCard = screen.getByTestId('inner-card');
      
      expect(outerCard).toBeInTheDocument();
      expect(innerCard).toBeInTheDocument();
      expect(outerCard).toContainElement(innerCard);
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = 'a'.repeat(1000);
      
      render(
        <Card>
          <CardContent>{longContent}</CardContent>
        </Card>
      );
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const specialContent = 'Content with special chars: !@#$%^&*(){}[]<>?/\\|`~';
      
      render(
        <Card>
          <CardContent>{specialContent}</CardContent>
        </Card>
      );
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('can be used with semantic roles', () => {
      render(
        <Card role="article" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Article Title</CardTitle>
          </CardHeader>
          <CardContent>Article content</CardContent>
        </Card>
      );
      
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
    });

    it('supports ARIA attributes', () => {
      render(
        <Card
          aria-describedby="card-description"
          aria-expanded="true"
        >
          <CardContent id="card-description">
            Accessible card content
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
      expect(card).toHaveAttribute('aria-expanded', 'true');
    });

    it('maintains focus management for interactive elements', async () => {
      const { user } = renderWithUserEvents(
        <Card>
          <CardHeader>
            <CardTitle>Focusable Card</CardTitle>
            <CardAction>
              <button>First Button</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <button>Second Button</button>
          </CardContent>
          <CardFooter>
            <button>Third Button</button>
          </CardFooter>
        </Card>
      );
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('First Button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Second Button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Third Button')).toHaveFocus();
    });
  });
});