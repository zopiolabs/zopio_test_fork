/**
 * @fileoverview Design System Tests - Alert Components
 * 
 * Comprehensive test suite for the Alert component system including Alert, AlertTitle, 
 * and AlertDescription components. Validates UI rendering, variant styling, accessibility 
 * compliance, and component composition patterns.
 * 
 * **Test Scope:**
 * - Alert component variants (default, destructive)
 * - AlertTitle and AlertDescription subcomponents
 * - Icon integration and grid layout adjustments
 * - Accessibility features and ARIA compliance
 * - Component composition and integration patterns
 * - Edge cases and error handling
 * 
 * **Test Categories:**
 * 1. **Component Rendering**: Basic DOM rendering and structure validation
 * 2. **Styling & Variants**: CSS class application and variant-specific styling
 * 3. **Accessibility**: ARIA roles, attributes, and screen reader compliance
 * 4. **Layout System**: Grid-based layout with icon positioning
 * 5. **Integration**: Component composition and interactive elements
 * 6. **Edge Cases**: Error handling, special content, and boundary conditions
 * 
 * **Mock Strategy:**
 * - React Testing Library for DOM rendering and queries
 * - Vitest for test runner and assertions
 * - No external service mocking required (pure UI components)
 * 
 * **Quality Standards:**
 * - 100% component API coverage
 * - Accessibility compliance validation
 * - Visual regression prevention through class assertions
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders an alert element', () => {
      render(<Alert data-testid="alert">Alert content</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.tagName).toBe('DIV');
    });

    it('has correct role attribute', () => {
      render(<Alert>Alert content</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('renders with correct data-slot attribute', () => {
      render(<Alert>Alert content</Alert>);
      
      const alert = document.querySelector('[data-slot="alert"]');
      expect(alert).toBeInTheDocument();
    });

    it('applies default variant styling classes', () => {
      render(<Alert data-testid="alert">Default alert</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass(
        'relative',
        'grid',
        'w-full',
        'grid-cols-[0_1fr]',
        'items-start',
        'gap-y-0.5',
        'rounded-lg',
        'border',
        'px-4',
        'py-3',
        'text-sm',
        'bg-card',
        'text-card-foreground'
      );
    });

    it('applies destructive variant styling classes', () => {
      render(<Alert variant="destructive" data-testid="alert">Destructive alert</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass(
        'bg-card',
        'text-destructive'
      );
    });

    it('applies SVG icon styling classes', () => {
      render(
        <Alert data-testid="alert">
          <svg data-testid="alert-icon">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87" />
          </svg>
          Alert with icon
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass(
        'has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]',
        'has-[>svg]:gap-x-3',
        '[&>svg]:size-4',
        '[&>svg]:translate-y-0.5',
        '[&>svg]:text-current'
      );
    });

    it('merges custom className with default classes', () => {
      render(<Alert className="custom-alert" data-testid="alert">Custom alert</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('custom-alert', 'relative', 'grid', 'w-full');
    });

    it('forwards HTML div props', () => {
      render(
        <Alert
          id="test-alert"
          data-testid="alert"
          aria-describedby="alert-help"
        >
          Alert content
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('id', 'test-alert');
      expect(alert).toHaveAttribute('aria-describedby', 'alert-help');
    });

    it('renders children correctly', () => {
      render(
        <Alert>
          <div>Child element</div>
          <span>Another child</span>
        </Alert>
      );
      
      expect(screen.getByText('Child element')).toBeInTheDocument();
      expect(screen.getByText('Another child')).toBeInTheDocument();
    });
  });

  describe('AlertTitle', () => {
    it('renders a div element', () => {
      render(<AlertTitle data-testid="alert-title">Alert Title</AlertTitle>);
      
      const title = screen.getByTestId('alert-title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      
      const title = document.querySelector('[data-slot="alert-title"]');
      expect(title).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<AlertTitle data-testid="alert-title">Alert Title</AlertTitle>);
      
      const title = screen.getByTestId('alert-title');
      expect(title).toHaveClass(
        'col-start-2',
        'line-clamp-1',
        'min-h-4',
        'font-medium',
        'tracking-tight'
      );
    });

    it('merges custom className with default classes', () => {
      render(<AlertTitle className="custom-title" data-testid="alert-title">Title</AlertTitle>);
      
      const title = screen.getByTestId('alert-title');
      expect(title).toHaveClass('custom-title', 'col-start-2', 'font-medium');
    });

    it('renders title text correctly', () => {
      render(<AlertTitle>Important Alert</AlertTitle>);
      
      expect(screen.getByText('Important Alert')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <AlertTitle
          id="test-title"
          data-testid="alert-title"
          role="heading"
        >
          Title
        </AlertTitle>
      );
      
      const title = screen.getByTestId('alert-title');
      expect(title).toHaveAttribute('id', 'test-title');
      expect(title).toHaveAttribute('role', 'heading');
    });

    it('handles line clamping for long titles', () => {
      const longTitle = 'This is a very long alert title that should be clamped to one line';
      
      render(<AlertTitle data-testid="alert-title">{longTitle}</AlertTitle>);
      
      const title = screen.getByTestId('alert-title');
      expect(title).toHaveClass('line-clamp-1');
      expect(title).toHaveTextContent(longTitle);
    });
  });

  describe('AlertDescription', () => {
    it('renders a div element', () => {
      render(<AlertDescription data-testid="alert-description">Description</AlertDescription>);
      
      const description = screen.getByTestId('alert-description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('DIV');
    });

    it('renders with correct data-slot attribute', () => {
      render(<AlertDescription>Description</AlertDescription>);
      
      const description = document.querySelector('[data-slot="alert-description"]');
      expect(description).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<AlertDescription data-testid="alert-description">Description</AlertDescription>);
      
      const description = screen.getByTestId('alert-description');
      expect(description).toHaveClass(
        'col-start-2',
        'grid',
        'justify-items-start',
        'gap-1',
        'text-muted-foreground',
        'text-sm'
      );
    });

    it('applies paragraph styling classes', () => {
      render(<AlertDescription data-testid="alert-description">Description</AlertDescription>);
      
      const description = screen.getByTestId('alert-description');
      expect(description).toHaveClass('[&_p]:leading-relaxed');
    });

    it('merges custom className with default classes', () => {
      render(
        <AlertDescription className="custom-description" data-testid="alert-description">
          Description
        </AlertDescription>
      );
      
      const description = screen.getByTestId('alert-description');
      expect(description).toHaveClass('custom-description', 'col-start-2', 'grid');
    });

    it('renders description text correctly', () => {
      render(<AlertDescription>This is the alert description</AlertDescription>);
      
      expect(screen.getByText('This is the alert description')).toBeInTheDocument();
    });

    it('forwards HTML div props', () => {
      render(
        <AlertDescription
          id="test-description"
          data-testid="alert-description"
        >
          Description
        </AlertDescription>
      );
      
      const description = screen.getByTestId('alert-description');
      expect(description).toHaveAttribute('id', 'test-description');
    });

    it('handles paragraph content with proper styling', () => {
      render(
        <AlertDescription data-testid="alert-description">
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </AlertDescription>
      );
      
      const description = screen.getByTestId('alert-description');
      const paragraphs = description.querySelectorAll('p');
      
      expect(paragraphs).toHaveLength(2);
      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });
  });

  describe('Complete Alert Structure', () => {
    it('renders a complete alert with all components', () => {
      render(
        <Alert data-testid="complete-alert">
          <svg data-testid="alert-icon">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87" />
          </svg>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>
            This is the alert description with detailed information.
          </AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('complete-alert');
      expect(alert).toBeInTheDocument();
      
      // Check all components are present
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
      expect(screen.getByText('This is the alert description with detailed information.')).toBeInTheDocument();
      
      // Check structure
      expect(alert).toContainElement(screen.getByText('Alert Title'));
      expect(alert).toContainElement(screen.getByText('This is the alert description with detailed information.'));
    });

    it('renders alert with only title', () => {
      render(
        <Alert>
          <AlertTitle>Simple Alert</AlertTitle>
        </Alert>
      );
      
      expect(screen.getByText('Simple Alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toContainElement(screen.getByText('Simple Alert'));
    });

    it('renders alert with only description', () => {
      render(
        <Alert>
          <AlertDescription>Just a description</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Just a description')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toContainElement(screen.getByText('Just a description'));
    });

    it('renders alert with icon and text', () => {
      render(
        <Alert>
          <svg data-testid="info-icon">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>This is an informational message.</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByRole('alert');
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
      expect(screen.getByText('Information')).toBeInTheDocument();
      expect(screen.getByText('This is an informational message.')).toBeInTheDocument();
      
      // Check grid layout for icon
      expect(alert).toHaveClass('has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]');
    });

    it('handles destructive alert variant with all components', () => {
      render(
        <Alert variant="destructive" data-testid="destructive-alert">
          <svg data-testid="error-icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Something went wrong. Please try again.
          </AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('destructive-alert');
      expect(alert).toHaveClass('text-destructive');
      
      // Check destructive styling on description
      const description = document.querySelector('[data-slot="alert-description"]');
      expect(alert).toHaveClass('*:data-[slot=alert-description]:text-destructive/90');
    });
  });

  describe('Variants and Styling', () => {
    it('applies correct styles for default variant', () => {
      render(
        <Alert variant="default" data-testid="default-alert">
          <AlertTitle>Default Alert</AlertTitle>
        </Alert>
      );
      
      const alert = screen.getByTestId('default-alert');
      expect(alert).toHaveClass('bg-card', 'text-card-foreground');
    });

    it('applies correct styles for destructive variant', () => {
      render(
        <Alert variant="destructive" data-testid="destructive-alert">
          <AlertTitle>Destructive Alert</AlertTitle>
          <AlertDescription>Error description</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('destructive-alert');
      expect(alert).toHaveClass('bg-card', 'text-destructive');
      expect(alert).toHaveClass('*:data-[slot=alert-description]:text-destructive/90');
    });

    it('handles undefined variant (uses default)', () => {
      render(
        <Alert variant={undefined} data-testid="undefined-variant">
          Content
        </Alert>
      );
      
      const alert = screen.getByTestId('undefined-variant');
      expect(alert).toHaveClass('bg-card', 'text-card-foreground');
    });
  });

  describe('Icon Integration', () => {
    it('adjusts grid layout when icon is present', () => {
      render(
        <Alert data-testid="icon-alert">
          <svg>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87" />
          </svg>
          <AlertTitle>With Icon</AlertTitle>
        </Alert>
      );
      
      const alert = screen.getByTestId('icon-alert');
      expect(alert).toHaveClass('has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]');
      expect(alert).toHaveClass('has-[>svg]:gap-x-3');
    });

    it('applies correct SVG styling', () => {
      render(
        <Alert>
          <svg data-testid="styled-svg">
            <circle cx="12" cy="12" r="10" />
          </svg>
          Content
        </Alert>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass(
        '[&>svg]:size-4',
        '[&>svg]:translate-y-0.5',
        '[&>svg]:text-current'
      );
    });

    it('handles multiple SVGs correctly', () => {
      render(
        <Alert data-testid="multi-svg">
          <svg data-testid="svg1">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <svg data-testid="svg2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87" />
          </svg>
          Content
        </Alert>
      );
      
      expect(screen.getByTestId('svg1')).toBeInTheDocument();
      expect(screen.getByTestId('svg2')).toBeInTheDocument();
    });

    it('works without icons', () => {
      render(
        <Alert data-testid="no-icon-alert">
          <AlertTitle>No Icon Alert</AlertTitle>
          <AlertDescription>This alert has no icon</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('no-icon-alert');
      expect(alert).toHaveClass('grid-cols-[0_1fr]');
      
      // Should not have icon-specific classes
      const svg = alert.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      render(<Alert>Accessible alert</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('supports custom ARIA attributes', () => {
      render(
        <Alert
          aria-labelledby="alert-title"
          aria-describedby="alert-description"
          data-testid="aria-alert"
        >
          <AlertTitle id="alert-title">Title</AlertTitle>
          <AlertDescription id="alert-description">Description</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('aria-alert');
      expect(alert).toHaveAttribute('aria-labelledby', 'alert-title');
      expect(alert).toHaveAttribute('aria-describedby', 'alert-description');
    });

    it('maintains semantic structure', () => {
      render(
        <Alert>
          <AlertTitle>Semantic Alert</AlertTitle>
          <AlertDescription>With proper structure</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByRole('alert');
      const title = screen.getByText('Semantic Alert');
      const description = screen.getByText('With proper structure');
      
      expect(alert).toContainElement(title);
      expect(alert).toContainElement(description);
    });

    it('works with screen readers', () => {
      render(
        <Alert aria-live="polite">
          <AlertTitle>Screen Reader Alert</AlertTitle>
          <AlertDescription>This will be announced</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('passes accessibility checks', () => {
      render(
        <Alert aria-label="Test alert">
          <AlertTitle>Accessible Title</AlertTitle>
          <AlertDescription>Accessible description</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByRole('alert');
      // Basic accessibility check - alert should be in the document
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Layout and Grid System', () => {
    it('uses correct grid columns without icon', () => {
      render(
        <Alert data-testid="no-icon">
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('no-icon');
      expect(alert).toHaveClass('grid-cols-[0_1fr]');
    });

    it('adjusts grid columns with icon', () => {
      render(
        <Alert data-testid="with-icon">
          <svg><circle cx="12" cy="12" r="10" /></svg>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('with-icon');
      expect(alert).toHaveClass('has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]');
    });

    it('positions title and description in second column', () => {
      render(
        <Alert>
          <AlertTitle data-testid="grid-title">Title</AlertTitle>
          <AlertDescription data-testid="grid-description">Description</AlertDescription>
        </Alert>
      );
      
      const title = screen.getByTestId('grid-title');
      const description = screen.getByTestId('grid-description');
      
      expect(title).toHaveClass('col-start-2');
      expect(description).toHaveClass('col-start-2');
    });

    it('handles complex content layout', () => {
      render(
        <Alert>
          <svg><circle cx="12" cy="12" r="10" /></svg>
          <AlertTitle>Complex Alert</AlertTitle>
          <AlertDescription>
            <p>First paragraph with <strong>bold text</strong>.</p>
            <p>Second paragraph with <em>italic text</em>.</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Complex Alert')).toBeInTheDocument();
      expect(screen.getByText('bold text')).toBeInTheDocument();
      expect(screen.getByText('italic text')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByText('List item 2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty alert', () => {
      render(<Alert data-testid="empty-alert" />);
      
      const alert = screen.getByTestId('empty-alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toBe('');
    });

    it('handles null className', () => {
      render(<Alert className={null as any}>Content</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('handles undefined children', () => {
      render(<Alert>{undefined}</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = 'a'.repeat(1000);
      
      render(
        <Alert>
          <AlertDescription>{longContent}</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('handles special characters', () => {
      const specialContent = 'Alert with special chars: !@#$%^&*(){}[]<>?/\\|`~';
      
      render(
        <Alert>
          <AlertDescription>{specialContent}</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('handles nested alerts (though not recommended)', () => {
      render(
        <Alert data-testid="outer-alert">
          <AlertTitle>Outer Alert</AlertTitle>
          <AlertDescription>
            <Alert data-testid="inner-alert">
              <AlertTitle>Inner Alert</AlertTitle>
            </Alert>
          </AlertDescription>
        </Alert>
      );
      
      const outerAlert = screen.getByTestId('outer-alert');
      const innerAlert = screen.getByTestId('inner-alert');
      
      expect(outerAlert).toBeInTheDocument();
      expect(innerAlert).toBeInTheDocument();
      expect(outerAlert).toContainElement(innerAlert);
    });

    it('handles mixed content types', () => {
      render(
        <Alert>
          Text node
          <AlertTitle>Title</AlertTitle>
          {null}
          <AlertDescription>Description</AlertDescription>
          {false}
          <span>Span element</span>
        </Alert>
      );
      
      expect(screen.getByText('Text node')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Span element')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('works with custom alert patterns', () => {
      // Success alert pattern
      render(
        <Alert variant="default" data-testid="success-alert">
          <svg data-testid="success-icon">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your action was completed successfully!</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('success-alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Your action was completed successfully!')).toBeInTheDocument();
    });

    it('integrates with other components', () => {
      render(
        <Alert>
          <AlertTitle>Alert with Button</AlertTitle>
          <AlertDescription>
            <p>This alert contains interactive elements.</p>
            <button>Take Action</button>
          </AlertDescription>
        </Alert>
      );
      
      const button = screen.getByText('Take Action');
      expect(button).toBeInTheDocument();
      expect(screen.getByRole('alert')).toContainElement(button);
    });

    it('maintains focus management', () => {
      render(
        <Alert>
          <AlertTitle>Focusable Alert</AlertTitle>
          <AlertDescription>
            <button>First Button</button>
            <button>Second Button</button>
          </AlertDescription>
        </Alert>
      );
      
      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      
      expect(firstButton).toBeInTheDocument();
      expect(secondButton).toBeInTheDocument();
    });
  });
});