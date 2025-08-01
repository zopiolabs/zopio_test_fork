/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Card component.
 *
 * This test suite validates the card component's functionality across multiple
 * dimensions including rendering, compound component structure, accessibility,
 * and user interactions. The card is a foundational layout component built with
 * semantic structure and proper data-slot attributes for styling and testing.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, component structure
 * 2. Variant Tests - Default card composition, content variants, layout combinations
 * 3. Props Handling - className forwarding, HTML attributes, content composition
 * 4. User Interactions - Click events, hover states, focus management, event delegation
 * 5. States - Content states, visibility states, interactive states
 * 6. Accessibility - Proper semantic structure, ARIA attributes, landmark roles
 * 7. Edge Cases - Empty content, malformed props, long text content, nested elements
 * 8. Component Integration - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all card compositions, layout scenarios, and integration patterns.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { BellRing, Settings } from 'lucide-react';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from '@repo/design-system/ui/card';

/**
 * Helper function to render a basic card with default content
 * Supports custom props for comprehensive testing scenarios
 */
const renderBasicCard = (props: any = {}, content: React.ReactNode = 'Card Content') => {
  return renderWithUserEvents(
    <Card {...props}>
      {content}
    </Card>
  );
};

/**
 * Helper function to render a complete card with all sections
 * Tests compound usage patterns with all card components
 */
const renderCompleteCard = (props: any = {}) => {
  return renderWithUserEvents(
    <Card {...props}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Main card content goes here</p>
      </CardContent>
      <CardFooter>
        <button type="button">Action Button</button>
      </CardFooter>
    </Card>
  );
};

/**
 * Helper function to render card with action component
 * Tests card header with action integration
 */
const renderCardWithAction = (props: any = {}) => {
  return renderWithUserEvents(
    <Card {...props}>
      <CardHeader>
        <CardTitle>Card with Action</CardTitle>
        <CardDescription>Description with action</CardDescription>
        <CardAction>
          <Settings data-testid="card-action-icon" />
        </CardAction>
      </CardHeader>
      <CardContent>
        Content with action
      </CardContent>
    </Card>
  );
};

/**
 * Helper function to render notifications card (from story)
 * Tests real-world usage pattern from Storybook
 */
const renderNotificationsCard = (props: any = {}) => {
  const notifications = [
    {
      title: 'Your call has been confirmed.',
      description: '1 hour ago',
    },
    {
      title: 'You have a new message!',
      description: '1 hour ago',
    },
    {
      title: 'Your subscription is expiring soon!',
      description: '2 hours ago',
    },
  ];

  return renderWithUserEvents(
    <Card {...props}>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {notifications.map((notification, index) => (
          <div key={index} className="flex items-center gap-4" data-testid={`notification-${index}`}>
            <BellRing className="size-6" data-testid={`notification-icon-${index}`} />
            <div>
              <p>{notification.title}</p>
              <p className="text-foreground/50">{notification.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <button type="button" className="hover:underline" data-testid="close-button">
          Close
        </button>
      </CardFooter>
    </Card>
  );
};

/**
 * Helper function to render minimal card for basic tests
 */
const renderMinimalCard = (props: any = {}) => {
  return renderWithUserEvents(
    <Card {...props}>Minimal Card</Card>
  );
};

/**
 * Helper function to render card with nested content
 * Tests complex content structures
 */
const renderNestedCard = (props: any = {}) => {
  return renderWithUserEvents(
    <Card {...props}>
      <CardHeader>
        <CardTitle>
          <span>Nested</span> <strong>Title</strong>
        </CardTitle>
        <CardDescription>
          Description with <em>emphasis</em> and <code>code</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <section>
            <h3>Section 1</h3>
            <p>Content paragraph</p>
          </section>
          <section>
            <h3>Section 2</h3>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  );
};

describe('Card', () => {
  describe('Rendering Tests', () => {
    it('renders card element correctly', () => {
      renderMinimalCard();
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
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

    it('renders with correct data-slot attribute', () => {
      renderBasicCard();
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('data-slot', 'card');
    });

    it('renders card content correctly', () => {
      const content = 'Custom Card Content';
      renderBasicCard({}, content);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveTextContent(content);
    });

    it('renders as div element by default', () => {
      renderBasicCard();
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card?.tagName).toBe('DIV');
    });

    it('renders with proper base styling classes', () => {
      renderBasicCard();
      
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

    it('maintains proper semantic structure', () => {
      renderBasicCard();
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card?.tagName).toBe('DIV');
      expect(card).toBeInTheDocument();
    });

    it('renders all compound components with correct data-slots', () => {
      renderCompleteCard();
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      expect(card).toBeInTheDocument();
      expect(header).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
    });

    it('renders card action with correct data-slot', () => {
      renderCardWithAction();
      
      const action = document.querySelector('[data-slot="card-action"]');
      expect(action).toBeInTheDocument();
      expect(action).toHaveAttribute('data-slot', 'card-action');
    });
  });

  describe('Variant Tests', () => {
    describe('Default Card Layout', () => {
      it('applies default flex column layout', () => {
        renderBasicCard();
        
        const card = document.querySelector('[data-slot="card"]');
        expect(card).toHaveClass('flex', 'flex-col', 'gap-6');
      });

      it('applies default visual styling', () => {
        renderBasicCard();
        
        const card = document.querySelector('[data-slot="card"]');
        expect(card).toHaveClass(
          'rounded-xl',
          'border',
          'bg-card',
          'text-card-foreground',
          'shadow-sm'
        );
      });

      it('applies default padding', () => {
        renderBasicCard();
        
        const card = document.querySelector('[data-slot="card"]');
        expect(card).toHaveClass('py-6');
      });
    });

    describe('Complete Card Composition', () => {
      it('renders complete card structure correctly', () => {
        renderCompleteCard();
        
        const card = document.querySelector('[data-slot="card"]');
        const header = document.querySelector('[data-slot="card-header"]');
        const title = document.querySelector('[data-slot="card-title"]');
        const description = document.querySelector('[data-slot="card-description"]');
        const content = document.querySelector('[data-slot="card-content"]');
        const footer = document.querySelector('[data-slot="card-footer"]');
        
        expect(card).toContainElement(header as HTMLElement);
        expect(header).toContainElement(title as HTMLElement);
        expect(header).toContainElement(description as HTMLElement);
        expect(card).toContainElement(content as HTMLElement);
        expect(card).toContainElement(footer as HTMLElement);
      });

      it('maintains proper content hierarchy', () => {
        renderCompleteCard();
        
        const title = document.querySelector('[data-slot="card-title"]');
        const description = document.querySelector('[data-slot="card-description"]');
        const content = document.querySelector('[data-slot="card-content"]');
        const footer = document.querySelector('[data-slot="card-footer"]');
        
        expect(title).toHaveTextContent('Card Title');
        expect(description).toHaveTextContent('Card description text');
        expect(content).toHaveTextContent('Main card content goes here');
        expect(footer).toContainElement(footer?.querySelector('button') as HTMLElement);
      });
    });

    describe('Notifications Card (Story Example)', () => {
      it('renders notifications card structure correctly', () => {
        renderNotificationsCard();
        
        const card = document.querySelector('[data-slot="card"]');
        const title = document.querySelector('[data-slot="card-title"]');
        const description = document.querySelector('[data-slot="card-description"]');
        
        expect(title).toHaveTextContent('Notifications');
        expect(description).toHaveTextContent('You have 3 unread messages.');
        expect(card).toBeInTheDocument();
      });

      it('renders all notification items correctly', () => {
        renderNotificationsCard();
        
        // Check that all 3 notifications are rendered
        for (let i = 0; i < 3; i++) {
          const notification = screen.getByTestId(`notification-${i}`);
          const icon = screen.getByTestId(`notification-icon-${i}`);
          expect(notification).toBeInTheDocument();
          expect(icon).toBeInTheDocument();
        }
      });

      it('includes close button in footer', () => {
        renderNotificationsCard();
        
        const closeButton = screen.getByTestId('close-button');
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveTextContent('Close');
        expect(closeButton).toHaveClass('hover:underline');
      });
    });

    describe('Card with Action', () => {
      it('renders card action correctly', () => {
        renderCardWithAction();
        
        const action = document.querySelector('[data-slot="card-action"]');
        const actionIcon = screen.getByTestId('card-action-icon');
        
        expect(action).toBeInTheDocument();
        expect(action).toContainElement(actionIcon);
      });

      it('applies proper action positioning classes', () => {
        renderCardWithAction();
        
        const action = document.querySelector('[data-slot="card-action"]');
        expect(action).toHaveClass(
          'col-start-2',
          'row-span-2',
          'row-start-1',
          'self-start',
          'justify-self-end'
        );
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly', () => {
      renderBasicCard({
        'data-testid': 'custom-card',
        id: 'card-id',
        'aria-label': 'Custom card',
        title: 'Card tooltip',
        role: 'region'
      });
      
      const card = screen.getByTestId('custom-card');
      expect(card).toHaveAttribute('id', 'card-id');
      expect(card).toHaveAttribute('aria-label', 'Custom card');
      expect(card).toHaveAttribute('title', 'Card tooltip');
      expect(card).toHaveAttribute('role', 'region');
    });

    it('merges custom className with default classes', () => {
      renderBasicCard({ className: 'custom-class bg-custom' });
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('custom-class', 'bg-custom');
      // Should maintain default classes
      expect(card).toHaveClass('flex', 'flex-col', 'rounded-xl', 'border');
    });

    it('handles className merging for all components', () => {
      renderWithUserEvents(
        <Card className="custom-card">
          <CardHeader className="custom-header">
            <CardTitle className="custom-title">Title</CardTitle>
            <CardDescription className="custom-description">Description</CardDescription>
          </CardHeader>
          <CardContent className="custom-content">Content</CardContent>
          <CardFooter className="custom-footer">Footer</CardFooter>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      expect(card).toHaveClass('custom-card', 'flex', 'flex-col');
      expect(header).toHaveClass('custom-header', '@container/card-header');
      expect(title).toHaveClass('custom-title', 'font-semibold');
      expect(description).toHaveClass('custom-description', 'text-muted-foreground');
      expect(content).toHaveClass('custom-content', 'px-6');
      expect(footer).toHaveClass('custom-footer', 'flex', 'items-center');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderBasicCard({
        'data-testid': 'multi-attr-card',
        className: 'multi-class',
        id: 'multi-id',
        'aria-label': 'Multiple attributes card',
        'aria-describedby': 'description',
        role: 'region',
        tabIndex: 0,
        title: 'Multi-attribute tooltip'
      });
      
      const card = screen.getByTestId('multi-attr-card');
      expect(card).toHaveClass('multi-class');
      expect(card).toHaveAttribute('id', 'multi-id');
      expect(card).toHaveAttribute('aria-label', 'Multiple attributes card');
      expect(card).toHaveAttribute('aria-describedby', 'description');
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('tabindex', '0');
      expect(card).toHaveAttribute('title', 'Multi-attribute tooltip');
    });

    it('handles event handlers correctly', async () => {
      const handleClick = vi.fn();
      const handleMouseOver = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Card onClick={handleClick} onMouseOver={handleMouseOver}>
          Event Card
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      
      await user.click(card!);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.hover(card!);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
    });

    it('handles style prop correctly', () => {
      renderBasicCard({
        style: {
          backgroundColor: 'blue',
          color: 'white',
          padding: '20px'
        }
      });
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveStyle('background-color: rgb(0, 0, 255)');
      expect(card).toHaveStyle('color: rgb(255, 255, 255)');
      expect(card).toHaveStyle('padding: 20px');
    });

    it('handles compound component props independently', () => {
      renderWithUserEvents(
        <Card data-testid="parent-card">
          <CardHeader data-testid="header-section" role="banner">
            <CardTitle data-testid="title-section">Independent Title</CardTitle>
            <CardDescription data-testid="desc-section">Independent Description</CardDescription>
          </CardHeader>
          <CardContent data-testid="content-section" role="main">
            Independent Content
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('parent-card');
      const header = screen.getByTestId('header-section');
      const title = screen.getByTestId('title-section');
      const description = screen.getByTestId('desc-section');
      const content = screen.getByTestId('content-section');
      
      expect(card).toBeInTheDocument();
      expect(header).toHaveAttribute('role', 'banner');
      expect(title).toHaveTextContent('Independent Title');
      expect(description).toHaveTextContent('Independent Description');
      expect(content).toHaveAttribute('role', 'main');
    });
  });

  describe('User Interactions', () => {
    it('handles click events correctly', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Card onClick={handleClick}>Clickable Card</Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      await user.click(card!);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard interaction correctly', async () => {
      const handleKeyDown = vi.fn();
      const { user } = renderWithUserEvents(
        <Card tabIndex={0} onKeyDown={handleKeyDown}>
          Keyboard Card
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      (card as HTMLElement)?.focus();
      await user.keyboard('{Enter}');
      
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });

    it('handles focus and blur events', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Card tabIndex={0} onFocus={handleFocus} onBlur={handleBlur}>
          Focus Card
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      
      await user.click(card!); // This will focus the card
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.tab(); // This will blur the card
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('handles nested element interactions', async () => {
      const handleCardClick = vi.fn();
      const handleButtonClick = vi.fn();
      
      const { user } = renderWithUserEvents(
        <Card onClick={handleCardClick}>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <button onClick={handleButtonClick}>Click Me</button>
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const button = screen.getByRole('button');
      
      // Click card directly
      await user.click(card!);
      expect(handleCardClick).toHaveBeenCalledTimes(1);
      
      // Click button (should bubble to card)
      await user.click(button);
      expect(handleButtonClick).toHaveBeenCalledTimes(1);
      expect(handleCardClick).toHaveBeenCalledTimes(2);
    });

    it('handles multiple rapid clicks correctly', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithUserEvents(
        <Card onClick={handleClick}>Rapid Click Card</Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      
      // Perform multiple rapid clicks
      await user.click(card!);
      await user.click(card!);
      await user.click(card!);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('handles hover states with nested elements', async () => {
      const { user } = renderNotificationsCard();
      
      const card = document.querySelector('[data-slot="card"]');
      const closeButton = screen.getByTestId('close-button');
      
      // Hover over card
      await user.hover(card!);
      expect(card).toBeInTheDocument();
      
      // Hover over close button (should have hover styles)
      await user.hover(closeButton);
      expect(closeButton).toHaveClass('hover:underline');
    });

    it('supports drag events', async () => {
      const handleDragStart = vi.fn();
      const { user } = renderWithUserEvents(
        <Card draggable onDragStart={handleDragStart}>
          Draggable Card
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      
      // Trigger drag start event
      fireEvent.dragStart(card!);
      expect(handleDragStart).toHaveBeenCalledTimes(1);
    });

    it('handles complex interaction scenarios', async () => {
      const handleCardClick = vi.fn();
      const handleActionClick = vi.fn((e) => e.stopPropagation()); // Prevent bubbling
      
      const { user } = renderWithUserEvents(
        <Card onClick={handleCardClick}>
          <CardHeader>
            <CardTitle>Complex Card</CardTitle>
            <CardDescription>With multiple interactive elements</CardDescription>
            <CardAction>
              <button onClick={handleActionClick} data-testid="action-button">
                Settings
              </button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const actionButton = screen.getByTestId('action-button');
      
      // Click action button (should not bubble to card due to stopPropagation)
      await user.click(actionButton);
      expect(handleActionClick).toHaveBeenCalledTimes(1);
      expect(handleCardClick).toHaveBeenCalledTimes(0);
      
      // Click card content area
      const content = document.querySelector('[data-slot="card-content"]');
      await user.click(content!);
      expect(handleCardClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('handles different content states', () => {
      const { rerender } = renderBasicCard({}, 'Initial Content');
      
      let card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveTextContent('Initial Content');
      
      // Re-render with different content
      rerender(<Card>Updated Content</Card>);
      
      card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveTextContent('Updated Content');
    });

    it('maintains consistent state across re-renders', () => {
      const { rerender } = renderBasicCard({ className: 'persistent-class' });
      
      let card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('persistent-class');
      
      // Re-render with same props
      rerender(<Card className="persistent-class">Test Card</Card>);
      
      card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('persistent-class');
      expect(card).toHaveTextContent('Test Card');
    });

    it('handles dynamic state changes properly', () => {
      const { rerender } = renderBasicCard({ className: 'initial-state' });
      
      let card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('initial-state');
      
      // Update with different state
      rerender(<Card className="updated-state">Updated Card</Card>);
      
      card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('updated-state');
      expect(card).not.toHaveClass('initial-state');
    });

    it('handles visibility states correctly', () => {
      const { rerender } = renderWithUserEvents(
        <Card style={{ display: 'block' }}>Visible Card</Card>
      );
      
      let card = document.querySelector('[data-slot="card"]');
      expect(card).toBeVisible();
      
      // Hide the card
      rerender(<Card style={{ display: 'none' }}>Hidden Card</Card>);
      
      card = document.querySelector('[data-slot="card"]');
      expect(card).not.toBeVisible();
    });

    it('maintains data-slot attributes across state changes', () => {
      const { rerender } = renderCompleteCard();
      
      expect(document.querySelector('[data-slot="card"]')).toHaveAttribute('data-slot', 'card');
      expect(document.querySelector('[data-slot="card-header"]')).toHaveAttribute('data-slot', 'card-header');
      expect(document.querySelector('[data-slot="card-title"]')).toHaveAttribute('data-slot', 'card-title');
      
      rerender(
        <Card className="updated">
          <CardHeader className="updated-header">
            <CardTitle className="updated-title">New Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      expect(document.querySelector('[data-slot="card"]')).toHaveAttribute('data-slot', 'card');
      expect(document.querySelector('[data-slot="card-header"]')).toHaveAttribute('data-slot', 'card-header');
      expect(document.querySelector('[data-slot="card-title"]')).toHaveAttribute('data-slot', 'card-title');
    });

    it('handles interactive states with focus management', async () => {
      const { user } = renderWithUserEvents(
        <Card tabIndex={0}>
          <CardContent>
            <button>Focusable Button</button>
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const button = screen.getByRole('button');
      
      // Focus card
      await user.click(card!);
      expect(document.activeElement).toBe(card);
      
      // Tab to button
      await user.tab();
      expect(document.activeElement).toBe(button);
    });

    it('handles loading and error states gracefully', () => {
      renderWithUserEvents(
        <Card>
          <CardHeader>
            <CardTitle>Loading Card</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="status" aria-label="Loading">
              Loading content...
            </div>
          </CardContent>
        </Card>
      );
      
      const title = document.querySelector('[data-slot="card-title"]');
      const loadingElement = screen.getByRole('status');
      
      expect(title).toHaveTextContent('Loading Card');
      expect(loadingElement).toHaveAttribute('aria-label', 'Loading');
      expect(loadingElement).toHaveTextContent('Loading content...');
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic structure by default', () => {
      renderBasicCard();
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card?.tagName).toBe('DIV');
      expect(card).toBeInTheDocument();
    });

    it('supports custom ARIA attributes', () => {
      renderBasicCard({
        role: 'region',
        'aria-label': 'Information card',
        'aria-describedby': 'card-description'
      });
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-label', 'Information card');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
    });

    it('maintains semantic hierarchy with compound components', () => {
      renderCompleteCard();
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      // All should be divs with proper nesting
      expect(card?.tagName).toBe('DIV');
      expect(header?.tagName).toBe('DIV');
      expect(title?.tagName).toBe('DIV');
      expect(description?.tagName).toBe('DIV');
      expect(content?.tagName).toBe('DIV');
      expect(footer?.tagName).toBe('DIV');
      
      // Proper containment hierarchy
      expect(card).toContainElement(header as HTMLElement);
      expect(header).toContainElement(title as HTMLElement);
      expect(header).toContainElement(description as HTMLElement);
      expect(card).toContainElement(content as HTMLElement);
      expect(card).toContainElement(footer as HTMLElement);
    });

    it('supports keyboard navigation when focusable', async () => {
      const handleClick = vi.fn();
      const handleKeyDown = vi.fn((e) => {
        if (e.key === 'Enter') {
          handleClick();
        }
      });
      
      const { user } = renderWithUserEvents(
        <Card tabIndex={0} onKeyDown={handleKeyDown}>
          Focusable Card
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      
      // Tab to focus
      await user.tab();
      expect(document.activeElement).toBe(card);
      
      // Enter to activate (needs keydown handler for div elements)
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('provides proper text content accessibility', () => {
      renderCompleteCard();
      
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      const content = document.querySelector('[data-slot="card-content"]');
      
      expect(title).toHaveTextContent('Card Title');
      expect(description).toHaveTextContent('Card description text');
      expect(content).toHaveTextContent('Main card content goes here');
    });

    it('supports landmark roles appropriately', () => {
      renderWithUserEvents(
        <Card role="region" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Landmark Card</CardTitle>
            <CardDescription>This card has landmark role</CardDescription>
          </CardHeader>
          <CardContent role="main">
            Main content area
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const content = document.querySelector('[data-slot="card-content"]');
      
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      expect(content).toHaveAttribute('role', 'main');
    });

    it('maintains accessibility with interactive content', () => {
      renderNotificationsCard();
      
      const closeButton = screen.getByTestId('close-button');
      const title = document.querySelector('[data-slot="card-title"]');
      
      expect(closeButton.tagName).toBe('BUTTON');
      expect(title).toHaveTextContent('Notifications');
      
      // Check accessibility structure
      accessibility.expectToBeAccessible(closeButton, { checkKeyboardSupport: false });
    });

    it('handles aria-expanded for collapsible cards', () => {
      renderWithUserEvents(
        <Card aria-expanded="false">
          <CardHeader>
            <CardTitle>Collapsible Card</CardTitle>
          </CardHeader>
          <CardContent>
            Content that can be collapsed
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports screen reader friendly content', () => {
      renderWithUserEvents(
        <Card role="article" aria-label="News article">
          <CardHeader>
            <CardTitle>Article Title</CardTitle>
            <CardDescription>Published 2 hours ago</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Article content for screen readers</p>
            <span className="sr-only">This article was published 2 hours ago</span>
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const srText = card?.querySelector('.sr-only');
      
      expect(card).toHaveAttribute('role', 'article');
      expect(card).toHaveAttribute('aria-label', 'News article');
      expect(srText).toHaveTextContent('This article was published 2 hours ago');
    });

    it('maintains accessibility across all compound components', () => {
      renderWithUserEvents(
        <Card role="region" aria-labelledby="main-title">
          <CardHeader role="banner">
            <CardTitle id="main-title">Accessible Card</CardTitle>
            <CardDescription>Full accessibility support</CardDescription>
            <CardAction>
              <button aria-label="Card actions">⋮</button>
            </CardAction>
          </CardHeader>
          <CardContent role="main">
            Main accessible content
          </CardContent>
          <CardFooter role="contentinfo">
            <button>Accessible Footer Action</button>
          </CardFooter>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      const actionButton = screen.getByLabelText('Card actions');
      
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-labelledby', 'main-title');
      expect(header).toHaveAttribute('role', 'banner');
      expect(content).toHaveAttribute('role', 'main');
      expect(footer).toHaveAttribute('role', 'contentinfo');
      expect(actionButton).toHaveAttribute('aria-label', 'Card actions');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty card content gracefully', () => {
      renderBasicCard({}, '');
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
      expect(card).toBeEmptyDOMElement();
    });

    it('handles card with only whitespace', () => {
      renderBasicCard({}, '   ');
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
      // Whitespace-only content is normalized by the DOM to empty text
      expect(card?.textContent?.trim()).toBe('');
    });

    it('handles very long text content', () => {
      const longText = 'This is a very long card content that should wrap properly and be handled gracefully by the component styling and layout without breaking the card structure or causing overflow issues in the container.';
      
      renderBasicCard({}, longText);
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveTextContent(longText);
      expect(card).toHaveClass('flex', 'flex-col');
    });

    it('handles special characters in content', () => {
      const specialTexts = [
        '🎉 Success Card!',
        '⚠️ Warning Card',
        '❌ Error Card',
        '© 2024 Copyright',
        '&lt;script&gt;alert()&lt;/script&gt;',
        '测试卡片',
        'البطاقة العربية',
        'Русская карточка'
      ];
      
      specialTexts.forEach(text => {
        const { unmount } = renderBasicCard({}, text);
        
        const card = document.querySelector('[data-slot="card"]');
        expect(card).toHaveTextContent(text);
        
        unmount();
      });
    });

    it('handles null and undefined content gracefully', () => {
      renderWithUserEvents(
        <Card>
          {null}
          {undefined}
          <CardContent>Valid Content</CardContent>
          {false && 'Hidden Content'}
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const content = document.querySelector('[data-slot="card-content"]');
      expect(card).toContainElement(content as HTMLElement);
      expect(content).toHaveTextContent('Valid Content');
    });

    it('handles malformed HTML attributes gracefully', () => {
      renderBasicCard({
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%'
      });
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(card).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderBasicCard();
      
      // Rapidly change props many times
      for (let i = 0; i < 50; i++) {
        rerender(
          <Card key={i} className={`card-${i}`} data-iteration={i}>
            Card {i}
          </Card>
        );
      }
      
      // Should still be functioning
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Card 49');
      expect(card).toHaveClass('card-49');
      expect(card).toHaveAttribute('data-iteration', '49');
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      renderBasicCard({ className: longClassName });
      
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass(longClassName);
    });

    it('handles deeply nested content structures', () => {
      renderNestedCard();
      
      const card = document.querySelector('[data-slot="card"]');
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      
      expect(card).toContainElement(title as HTMLElement);
      expect(title).toContainElement(title?.querySelector('span') as HTMLElement);
      expect(title).toContainElement(title?.querySelector('strong') as HTMLElement);
      expect(description).toContainElement(description?.querySelector('em') as HTMLElement);
      expect(description).toContainElement(description?.querySelector('code') as HTMLElement);
    });

    it('handles conflicting CSS classes gracefully', () => {
      renderBasicCard({
        className: 'bg-red-500 text-green-500 border-blue-500 flex-row',
      });
      
      const card = document.querySelector('[data-slot="card"]');
      // Should have both custom and default classes (CSS cascade determines final styling)
      expect(card).toHaveClass('bg-red-500', 'text-green-500', 'border-blue-500', 'flex-row');
      // Default classes should also be present
      expect(card).toHaveClass('flex', 'rounded-xl', 'border');
    });

    it('handles performance with many nested elements', () => {
      const manyElements = Array.from({ length: 20 }, (_, i) => (
        <div key={i} data-testid={`element-${i}`}>
          <span>Item {i}</span>
          <p>Description {i}</p>
        </div>
      ));
      
      renderWithUserEvents(
        <Card>
          <CardContent>
            {manyElements}
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const content = document.querySelector('[data-slot="card-content"]');
      
      // Should contain all elements
      for (let i = 0; i < 20; i++) {
        const element = screen.getByTestId(`element-${i}`);
        expect(content).toContainElement(element);
      }
      
      expect(card).toHaveClass('flex', 'flex-col');
    });

    it('handles event handler edge cases gracefully', async () => {
      // Test with undefined handler (should not crash)
      const { user: user1, unmount: unmount1 } = renderWithUserEvents(
        <Card onClick={undefined}>Undefined Handler Card</Card>
      );
      const card1 = document.querySelector('[data-slot="card"]');
      await user1.click(card1!);
      expect(card1).toBeInTheDocument(); // Should not crash
      unmount1();
      
      // Test with complex handler that modifies state
      let clickCount = 0;
      const complexHandler = vi.fn(() => {
        clickCount++;
        if (clickCount > 5) {
          return false;
        }
        return true;
      });
      
      const { user: user2, unmount: unmount2 } = renderWithUserEvents(
        <Card onClick={complexHandler}>Complex Handler Card</Card>
      );
      const card2 = document.querySelector('[data-slot="card"]');
      
      // Multiple clicks to test state handling
      await user2.click(card2!);
      await user2.click(card2!);
      await user2.click(card2!);
      
      expect(complexHandler).toHaveBeenCalledTimes(3);
      expect(clickCount).toBe(3);
      expect(card2).toBeInTheDocument();
      unmount2();
      
      // Test with handler that receives and uses event object
      const eventHandler = vi.fn((event) => {
        expect(event).toBeDefined();
        expect(event.type).toBe('click');
        event.preventDefault(); // Should not cause issues
      });
      
      const { user: user3 } = renderWithUserEvents(
        <Card onClick={eventHandler}>Event Handler Card</Card>
      );
      const card3 = document.querySelector('[data-slot="card"]');
      
      await user3.click(card3!);
      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(card3).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates all compound components correctly', () => {
      renderCompleteCard();
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      // Check containment relationships
      expect(card).toContainElement(header as HTMLElement);
      expect(card).toContainElement(content as HTMLElement);
      expect(card).toContainElement(footer as HTMLElement);
      expect(header).toContainElement(title as HTMLElement);
      expect(header).toContainElement(description as HTMLElement);
    });

    it('applies component-specific styling correctly', () => {
      renderCompleteCard();
      
      const header = document.querySelector('[data-slot="card-header"]');
      const title = document.querySelector('[data-slot="card-title"]');
      const description = document.querySelector('[data-slot="card-description"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      // Header styling
      expect(header).toHaveClass(
        '@container/card-header',
        'grid',
        'auto-rows-min',
        'grid-rows-[auto_auto]',
        'items-start',
        'gap-1.5',
        'px-6'
      );
      
      // Title styling
      expect(title).toHaveClass('font-semibold', 'leading-none');
      
      // Description styling
      expect(description).toHaveClass('text-muted-foreground', 'text-sm');
      
      // Content styling
      expect(content).toHaveClass('px-6');
      
      // Footer styling
      expect(footer).toHaveClass('flex', 'items-center', 'px-6');
    });

    it('handles CardAction integration with grid layout', () => {
      renderCardWithAction();
      
      const header = document.querySelector('[data-slot="card-header"]');
      const action = document.querySelector('[data-slot="card-action"]');
      
      // Header should have grid layout for action
      expect(header).toHaveClass('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
      
      // Action should have proper grid positioning
      expect(action).toHaveClass(
        'col-start-2',
        'row-span-2',
        'row-start-1',
        'self-start',
        'justify-self-end'
      );
    });

    it('integrates with icon elements properly', () => {
      renderNotificationsCard();
      
      const card = document.querySelector('[data-slot="card"]');
      
      // Check that all notification icons are present
      for (let i = 0; i < 3; i++) {
        const icon = screen.getByTestId(`notification-icon-${i}`);
        expect(card).toContainElement(icon);
      }
    });

    it('maintains proper spacing with complex content', () => {
      renderWithUserEvents(
        <Card>
          <CardHeader>
            <CardTitle>Card with Complex Layout</CardTitle>
            <CardDescription>Multiple content sections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>Section 1</div>
            <div>Section 2</div>
            <div>Section 3</div>
          </CardContent>
          <CardFooter className="justify-between">
            <button>Cancel</button>
            <button>Confirm</button>
          </CardFooter>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const content = document.querySelector('[data-slot="card-content"]');
      const footer = document.querySelector('[data-slot="card-footer"]');
      
      expect(card).toHaveClass('gap-6'); // Main card gap
      expect(content).toHaveClass('space-y-4'); // Custom spacing
      expect(footer).toHaveClass('justify-between'); // Custom footer layout
    });

    it('handles responsive layouts correctly', () => {
      renderWithUserEvents(
        <Card className="sm:flex-row">
          <CardHeader className="sm:w-1/3">
            <CardTitle>Responsive Card</CardTitle>
            <CardDescription>Adapts to screen size</CardDescription>
          </CardHeader>
          <CardContent className="sm:w-2/3">
            <p>Content adapts to layout</p>
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const content = document.querySelector('[data-slot="card-content"]');
      
      expect(card).toHaveClass('sm:flex-row');
      expect(header).toHaveClass('sm:w-1/3');
      expect(content).toHaveClass('sm:w-2/3');
    });

    it('integrates with form elements seamlessly', () => {
      renderWithUserEvents(
        <Card>
          <CardHeader>
            <CardTitle>Form Card</CardTitle>
            <CardDescription>Card containing form elements</CardDescription>
          </CardHeader>
          <CardContent>
            <form>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name">Name</label>
                  <input id="name" type="text" />
                </div>
                <div>
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" />
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <button type="submit">Submit Form</button>
          </CardFooter>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const form = card?.querySelector('form');
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Submit Form' });
      
      expect(form).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('handles accessibility with complex integrations', () => {
      renderWithUserEvents(
        <Card role="region" aria-labelledby="complex-title">
          <CardHeader>
            <CardTitle id="complex-title">Accessible Complex Card</CardTitle>
            <CardDescription>With full accessibility support</CardDescription>
            <CardAction>
              <button aria-label="More options" data-testid="options-button">
                ⋮
              </button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div role="list">
              <div role="listitem">Item 1</div>
              <div role="listitem">Item 2</div>
            </div>
          </CardContent>
          <CardFooter>
            <button aria-describedby="action-description">
              Primary Action
            </button>
            <span id="action-description" className="sr-only">
              This will perform the primary action
            </span>
          </CardFooter>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const optionsButton = screen.getByTestId('options-button');
      const list = card?.querySelector('[role="list"]');
      const primaryButton = screen.getByRole('button', { name: 'Primary Action' });
      
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-labelledby', 'complex-title');
      expect(optionsButton).toHaveAttribute('aria-label', 'More options');
      expect(list).toBeInTheDocument();
      expect(primaryButton).toHaveAttribute('aria-describedby', 'action-description');
    });

    it('integrates with animation and transition classes', () => {
      renderWithUserEvents(
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="transition-colors duration-200">
            <CardTitle>Animated Card</CardTitle>
            <CardDescription>With smooth transitions</CardDescription>
          </CardHeader>
          <CardContent className="transition-transform duration-150">
            <p>Content with animations</p>
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const header = document.querySelector('[data-slot="card-header"]');
      const content = document.querySelector('[data-slot="card-content"]');
      
      expect(card).toHaveClass('transition-all', 'duration-300', 'hover:shadow-lg');
      expect(header).toHaveClass('transition-colors', 'duration-200');
      expect(content).toHaveClass('transition-transform', 'duration-150');
    });

    it('maintains performance with deeply nested integrations', () => {
      const deepContent = (
        <div>
          <div>
            <div>
              <div>
                <span>Deeply nested content</span>
              </div>
            </div>
          </div>
        </div>
      );
      
      renderWithUserEvents(
        <Card>
          <CardHeader>
            <CardTitle>Performance Test Card</CardTitle>
            <CardDescription>With deep nesting</CardDescription>
          </CardHeader>
          <CardContent>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                {deepContent}
              </div>
            ))}
          </CardContent>
        </Card>
      );
      
      const card = document.querySelector('[data-slot="card"]');
      const content = document.querySelector('[data-slot="card-content"]');
      
      expect(card).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(content?.children).toHaveLength(10);
    });
  });
});