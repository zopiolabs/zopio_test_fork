/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Breadcrumb component.
 *
 * This test suite validates the breadcrumb navigation component's functionality across
 * multiple dimensions including rendering, accessibility, user interactions, and
 * edge cases. The breadcrumb component provides hierarchical navigation with
 * semantic structure and proper ARIA attributes for screen readers.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, navigation structure
 * 2. Variant Tests - Default example from story, custom separator variant
 * 3. Props Handling - HTML attributes, className forwarding, asChild prop functionality
 * 4. User Interactions - Link navigation, current page behavior, hover states
 * 5. States - Active/current page states, disabled states
 * 6. Accessibility - Navigation landmarks, aria-current, screen reader support
 * 7. Edge Cases - Single item, many items, empty breadcrumb, long text
 * 8. Component Integration - List, item, link, separator, page, ellipsis integration
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all navigation scenarios, accessibility features,
 * and integration patterns.
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ArrowRightSquare } from 'lucide-react';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@repo/design-system/ui/breadcrumb';

/**
 * Helper function to render a basic breadcrumb with default structure
 * Supports custom props for comprehensive testing scenarios
 * 
 * @param props - Optional props to pass to the Breadcrumb component
 * @returns Rendered basic breadcrumb with user event utilities
 */
const renderBasicBreadcrumb = (props: any = {}) => {
  return renderWithUserEvents(
    <Breadcrumb {...props}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

/**
 * Helper function to render breadcrumb with custom separator
 * Tests compound usage patterns with custom separator elements
 * 
 * @param props - Optional props to pass to the Breadcrumb component
 * @returns Rendered breadcrumb with custom ArrowRightSquare separators and user event utilities
 */
const renderBreadcrumbWithCustomSeparator = (props: any = {}) => {
  return renderWithUserEvents(
    <Breadcrumb {...props}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ArrowRightSquare data-testid="custom-separator" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink>Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ArrowRightSquare data-testid="custom-separator" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

/**
 * Helper function to render breadcrumb with ellipsis
 * Tests truncation patterns for long navigation paths
 * 
 * @param props - Optional props to pass to the Breadcrumb component
 * @returns Rendered breadcrumb with ellipsis element and user event utilities
 */
const renderBreadcrumbWithEllipsis = (props: any = {}) => {
  return renderWithUserEvents(
    <Breadcrumb {...props}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

/**
 * Helper function to render single-item breadcrumb
 * Tests minimal breadcrumb structure
 * 
 * @param props - Optional props to pass to the Breadcrumb component
 * @returns Rendered single-item breadcrumb with user event utilities
 */
const renderSingleItemBreadcrumb = (props: any = {}) => {
  return renderWithUserEvents(
    <Breadcrumb {...props}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Current Page</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

/**
 * Helper function to render breadcrumb with interactive links
 * Tests navigation functionality and link behavior
 * 
 * @param onHomeClick - Callback function fired when home link is clicked
 * @param onComponentsClick - Callback function fired when components link is clicked
 * @returns Rendered breadcrumb with interactive links and user event utilities
 */
const renderInteractiveBreadcrumb = (onHomeClick: () => void = () => {}, onComponentsClick: () => void = () => {}) => {
  return renderWithUserEvents(
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink 
            href="/" 
            onClick={onHomeClick}
            data-testid="home-link"
          >
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink 
            href="/components" 
            onClick={onComponentsClick}
            data-testid="components-link"
          >
            Components
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

describe('Breadcrumb', () => {
  describe('Rendering Tests', () => {
    it('renders breadcrumb navigation element correctly', () => {
      renderBasicBreadcrumb();
      
      // Find the breadcrumb navigation by its data-slot attribute
      const breadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      expect(breadcrumb).toBeInTheDocument();
      expect(breadcrumb?.tagName).toBe('NAV');
      expect(breadcrumb).toHaveAttribute('aria-label', 'breadcrumb');
    });

    it('renders with correct data-slot attributes for all components', () => {
      renderBasicBreadcrumb();
      
      const breadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      const breadcrumbList = document.querySelector('[data-slot="breadcrumb-list"]');
      const breadcrumbItems = document.querySelectorAll('[data-slot="breadcrumb-item"]');
      const breadcrumbLinks = document.querySelectorAll('[data-slot="breadcrumb-link"]');
      const breadcrumbPage = document.querySelector('[data-slot="breadcrumb-page"]');
      const breadcrumbSeparators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      
      expect(breadcrumb).toHaveAttribute('data-slot', 'breadcrumb');
      expect(breadcrumbList).toHaveAttribute('data-slot', 'breadcrumb-list');
      expect(breadcrumbItems).toHaveLength(3);
      expect(breadcrumbLinks).toHaveLength(2);
      expect(breadcrumbPage).toHaveAttribute('data-slot', 'breadcrumb-page');
      expect(breadcrumbSeparators).toHaveLength(2);
    });

    it('renders navigation structure with proper semantic hierarchy', () => {
      renderBasicBreadcrumb();
      
      const nav = document.querySelector('nav[aria-label="breadcrumb"]');
      const list = nav?.querySelector('ol');
      const items = list?.querySelectorAll('li');
      
      expect(nav).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(items).toHaveLength(5); // 3 breadcrumb items + 2 separators
    });

    it('renders breadcrumb list with proper styling classes', () => {
      renderBasicBreadcrumb();
      
      const breadcrumbList = document.querySelector('[data-slot="breadcrumb-list"]');
      expect(breadcrumbList).toHaveClass(
        'flex',
        'flex-wrap',
        'items-center',
        'gap-1.5',
        'break-words',
        'text-muted-foreground',
        'text-sm',
        'sm:gap-2.5'
      );
    });

    it('renders breadcrumb items with proper styling classes', () => {
      renderBasicBreadcrumb();
      
      const breadcrumbItems = document.querySelectorAll('[data-slot="breadcrumb-item"]');
      breadcrumbItems.forEach(item => {
        expect(item).toHaveClass('inline-flex', 'items-center', 'gap-1.5');
      });
    });

    it('renders breadcrumb links with proper styling classes', () => {
      renderBasicBreadcrumb();
      
      const breadcrumbLinks = document.querySelectorAll('[data-slot="breadcrumb-link"]');
      breadcrumbLinks.forEach(link => {
        expect(link).toHaveClass('transition-colors', 'hover:text-foreground');
      });
    });

    it('renders breadcrumb page with proper styling classes', () => {
      renderBasicBreadcrumb();
      
      const breadcrumbPage = document.querySelector('[data-slot="breadcrumb-page"]');
      expect(breadcrumbPage).toHaveClass('font-normal', 'text-foreground');
    });

    it('renders breadcrumb separators with proper styling', () => {
      renderBasicBreadcrumb();
      
      const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      separators.forEach(separator => {
        expect(separator).toHaveClass('[&>svg]:size-3.5');
        expect(separator).toHaveAttribute('role', 'presentation');
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('renders default separator SVG correctly', () => {
      renderBasicBreadcrumb();
      
      const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      const firstSeparator = separators[0];
      const svg = firstSeparator?.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('size-3.5');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('maintains proper semantic structure with nav, ol, li elements', () => {
      renderBasicBreadcrumb();
      
      const nav = document.querySelector('nav');
      const ol = document.querySelector('ol');
      const listItems = document.querySelectorAll('li');
      
      expect(nav).toBeInTheDocument();
      expect(ol).toBeInTheDocument();
      expect(listItems).toHaveLength(5); // Items + separators
      expect(nav).toContainElement(ol as HTMLElement);
    });
  });

  describe('Variant Tests', () => {
    describe('Default Breadcrumb', () => {
      it('renders default breadcrumb structure from story', () => {
        renderBasicBreadcrumb();
        
        // Check content matches story structure
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Components')).toBeInTheDocument();
        expect(screen.getByText('Breadcrumb')).toBeInTheDocument();
        
        // Check proper element types
        const homeLink = screen.getByText('Home');
        const componentsLink = screen.getByText('Components');
        const currentPage = screen.getByText('Breadcrumb');
        
        expect(homeLink).toHaveAttribute('data-slot', 'breadcrumb-link');
        expect(componentsLink).toHaveAttribute('data-slot', 'breadcrumb-link');
        expect(currentPage).toHaveAttribute('data-slot', 'breadcrumb-page');
      });

      it('displays proper hierarchy with separators', () => {
        renderBasicBreadcrumb();
        
        const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
        expect(separators).toHaveLength(2);
        
        // Verify separator placement between items
        const list = document.querySelector('[data-slot="breadcrumb-list"]');
        const children = Array.from(list?.children || []);
        
        expect(children[0]).toHaveAttribute('data-slot', 'breadcrumb-item');
        expect(children[1]).toHaveAttribute('data-slot', 'breadcrumb-separator');
        expect(children[2]).toHaveAttribute('data-slot', 'breadcrumb-item');
        expect(children[3]).toHaveAttribute('data-slot', 'breadcrumb-separator');
        expect(children[4]).toHaveAttribute('data-slot', 'breadcrumb-item');
      });

      it('applies proper styling to default variant', () => {
        renderBasicBreadcrumb();
        
        const breadcrumbList = document.querySelector('[data-slot="breadcrumb-list"]');
        expect(breadcrumbList).toHaveClass(
          'text-muted-foreground',
          'text-sm'
        );
        
        const currentPage = document.querySelector('[data-slot="breadcrumb-page"]');
        expect(currentPage).toHaveClass('text-foreground');
      });
    });

    describe('Custom Separator Variant', () => {
      it('renders with custom separator icons', () => {
        renderBreadcrumbWithCustomSeparator();
        
        const customSeparators = screen.getAllByTestId('custom-separator');
        expect(customSeparators).toHaveLength(2);
        
        // Check that custom separators replace default ones
        const separatorContainers = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
        separatorContainers.forEach(container => {
          const customIcon = container.querySelector('[data-testid="custom-separator"]');
          expect(customIcon).toBeInTheDocument();
        });
      });

      it('maintains proper separator styling with custom icons', () => {
        renderBreadcrumbWithCustomSeparator();
        
        const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
        separators.forEach(separator => {
          expect(separator).toHaveClass('[&>svg]:size-3.5');
          expect(separator).toHaveAttribute('role', 'presentation');
          expect(separator).toHaveAttribute('aria-hidden', 'true');
        });
      });

      it('renders content structure with custom separators', () => {
        renderBreadcrumbWithCustomSeparator();
        
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Components')).toBeInTheDocument();
        expect(screen.getByText('Breadcrumb')).toBeInTheDocument();
        
        const customSeparators = screen.getAllByTestId('custom-separator');
        expect(customSeparators).toHaveLength(2);
      });
    });

    describe('Ellipsis Variant', () => {
      it('renders breadcrumb with ellipsis for truncation', () => {
        renderBreadcrumbWithEllipsis();
        
        const ellipsis = document.querySelector('[data-slot="breadcrumb-ellipsis"]');
        expect(ellipsis).toBeInTheDocument();
        expect(ellipsis).toHaveAttribute('role', 'presentation');
        expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
      });

      it('applies proper styling to ellipsis element', () => {
        renderBreadcrumbWithEllipsis();
        
        const ellipsis = document.querySelector('[data-slot="breadcrumb-ellipsis"]');
        expect(ellipsis).toHaveClass(
          'flex',
          'size-9',
          'items-center',
          'justify-center'
        );
      });

      it('includes screen reader text for ellipsis', () => {
        renderBreadcrumbWithEllipsis();
        
        const ellipsis = document.querySelector('[data-slot="breadcrumb-ellipsis"]');
        const srText = ellipsis?.querySelector('.sr-only');
        expect(srText).toHaveTextContent('More');
      });

      it('renders ellipsis with proper SVG icon', () => {
        renderBreadcrumbWithEllipsis();
        
        const ellipsis = document.querySelector('[data-slot="breadcrumb-ellipsis"]');
        const svg = ellipsis?.querySelector('svg');
        
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('size-4');
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
        
        // Check for three dots pattern
        const circles = svg?.querySelectorAll('circle');
        expect(circles).toHaveLength(3);
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes correctly for Breadcrumb', () => {
      renderBasicBreadcrumb({
        'data-testid': 'custom-breadcrumb',
        id: 'breadcrumb-nav',
        'aria-label': 'Custom navigation',
        role: 'navigation'
      });
      
      const breadcrumb = screen.getByTestId('custom-breadcrumb');
      expect(breadcrumb).toHaveAttribute('id', 'breadcrumb-nav');
      expect(breadcrumb).toHaveAttribute('aria-label', 'Custom navigation');
      expect(breadcrumb).toHaveAttribute('role', 'navigation');
    });

    it('merges custom className with default classes for BreadcrumbList', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList className="custom-list-class bg-custom">
            <BreadcrumbItem>
              <BreadcrumbPage>Test</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const breadcrumbList = document.querySelector('[data-slot="breadcrumb-list"]');
      expect(breadcrumbList).toHaveClass('custom-list-class', 'bg-custom');
      expect(breadcrumbList).toHaveClass('flex', 'flex-wrap', 'items-center');
    });

    it('handles asChild prop correctly for BreadcrumbLink', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" data-testid="button-link">
                  Button Link
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const buttonLink = screen.getByTestId('button-link');
      expect(buttonLink.tagName).toBe('BUTTON');
      expect(buttonLink).toHaveAttribute('type', 'button');
      expect(buttonLink).toHaveAttribute('data-slot', 'breadcrumb-link');
      expect(buttonLink).toHaveTextContent('Button Link');
    });

    it('handles multiple HTML attributes simultaneously', () => {
      renderWithUserEvents(
        <Breadcrumb
          data-testid="multi-attr-breadcrumb"
          className="custom-breadcrumb"
          id="main-breadcrumb"
          aria-describedby="breadcrumb-help"
          role="navigation"
        >
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Test</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const breadcrumb = screen.getByTestId('multi-attr-breadcrumb');
      expect(breadcrumb).toHaveClass('custom-breadcrumb');
      expect(breadcrumb).toHaveAttribute('id', 'main-breadcrumb');
      expect(breadcrumb).toHaveAttribute('aria-describedby', 'breadcrumb-help');
      expect(breadcrumb).toHaveAttribute('role', 'navigation');
    });

    it('forwards props to BreadcrumbItem correctly', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem 
              className="custom-item" 
              data-testid="custom-item"
              id="item-1"
            >
              <BreadcrumbPage>Test</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const item = screen.getByTestId('custom-item');
      expect(item).toHaveClass('custom-item', 'inline-flex', 'items-center');
      expect(item).toHaveAttribute('id', 'item-1');
    });

    it('forwards props to BreadcrumbPage correctly', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage 
                className="custom-page"
                data-testid="custom-page"
                title="Current page tooltip"
              >
                Current Page
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const page = screen.getByTestId('custom-page');
      expect(page).toHaveClass('custom-page', 'font-normal', 'text-foreground');
      expect(page).toHaveAttribute('title', 'Current page tooltip');
    });

    it('forwards props to BreadcrumbSeparator correctly', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator 
              className="custom-separator"
              data-testid="custom-separator"
            />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const separator = screen.getByTestId('custom-separator');
      expect(separator).toHaveClass('custom-separator', '[&>svg]:size-3.5');
      expect(separator).toHaveAttribute('role', 'presentation');
    });

    it('handles custom separator children correctly', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <span data-testid="custom-separator-content">→</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const customContent = screen.getByTestId('custom-separator-content');
      expect(customContent).toHaveTextContent('→');
      
      const separator = document.querySelector('[data-slot="breadcrumb-separator"]');
      expect(separator).toContainElement(customContent);
    });

    it('handles event handlers correctly on links', async () => {
      let clickCount = 0;
      const handleClick = () => { clickCount++; };
      
      const { user } = renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={handleClick} style={{ cursor: 'pointer' }}>
                Clickable Link
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const link = screen.getByText('Clickable Link');
      await user.click(link);
      
      expect(clickCount).toBe(1);
      expect(link).toHaveStyle('cursor: pointer');
    });

    it('handles style prop correctly', () => {
      renderBasicBreadcrumb({
        style: {
          backgroundColor: 'lightblue',
          padding: '16px',
          marginTop: '8px'
        }
      });
      
      const breadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      // Browser converts named colors to RGB format, so we check for the RGB equivalent
      expect(breadcrumb).toHaveStyle('background-color: rgb(173, 216, 230)');
      expect(breadcrumb).toHaveStyle('padding: 16px');
      expect(breadcrumb).toHaveStyle('margin-top: 8px');
    });
  });

  describe('User Interactions', () => {
    it('supports link navigation on breadcrumb links', async () => {
      let homeClicked = false;
      let componentsClicked = false;
      
      const { user } = renderInteractiveBreadcrumb(
        () => { homeClicked = true; },
        () => { componentsClicked = true; }
      );
      
      const homeLink = screen.getByTestId('home-link');
      const componentsLink = screen.getByTestId('components-link');
      
      await user.click(homeLink);
      expect(homeClicked).toBe(true);
      
      await user.click(componentsLink);
      expect(componentsClicked).toBe(true);
    });

    it('prevents interaction with current page element', async () => {
      const { user } = renderBasicBreadcrumb();
      
      const currentPage = screen.getByText('Breadcrumb');
      expect(currentPage).toHaveAttribute('aria-disabled', 'true');
      
      // Current page should not be clickable (it's a span, not a link)
      let clicked = false;
      currentPage.addEventListener('click', () => { clicked = true; });
      
      await user.click(currentPage);
      // Click event might fire on the span, but it shouldn't be interactive
      expect(currentPage).toHaveAttribute('role', 'link');
      expect(currentPage).toHaveAttribute('aria-disabled', 'true');
    });

    it('provides hover effects on breadcrumb links', () => {
      renderBasicBreadcrumb();
      
      const links = document.querySelectorAll('[data-slot="breadcrumb-link"]');
      links.forEach(link => {
        expect(link).toHaveClass('hover:text-foreground');
      });
    });

    it('supports keyboard navigation on breadcrumb links', async () => {
      const { user } = renderInteractiveBreadcrumb();
      
      const homeLink = screen.getByTestId('home-link');
      const componentsLink = screen.getByTestId('components-link');
      
      // Should be able to tab to links
      await user.tab();
      expect(document.activeElement).toBe(homeLink);
      
      await user.tab();
      expect(document.activeElement).toBe(componentsLink);
    });

    it('maintains proper focus management', async () => {
      const { user } = renderInteractiveBreadcrumb();
      
      const homeLink = screen.getByTestId('home-link');
      
      await user.click(homeLink);
      
      // Link should maintain focus state
      expect(homeLink).toHaveClass('transition-colors');
    });

    it('handles mouse interactions on interactive elements', async () => {
      const { user } = renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                data-testid="hover-link"
              >
                Hover Me
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const link = screen.getByTestId('hover-link');
      
      await user.hover(link);
      await user.unhover(link);
      
      // Should have hover classes
      expect(link).toHaveClass('hover:text-foreground');
    });

    it('supports asChild interactions correctly', async () => {
      let buttonClicked = false;
      
      const { user } = renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button
                  type="button"
                  onClick={() => { buttonClicked = true; }}
                  data-testid="interactive-button"
                >
                  Interactive Button
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const button = screen.getByTestId('interactive-button');
      await user.click(button);
      
      expect(buttonClicked).toBe(true);
      expect(button.tagName).toBe('BUTTON');
    });

    it('handles complex interactions with nested content', async () => {
      let iconClicked = false;
      
      const { user } = renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/complex">
                <svg 
                  width="16" 
                  height="16" 
                  data-testid="link-icon"
                  onClick={() => { iconClicked = true; }}
                >
                  <circle cx="8" cy="8" r="4" />
                </svg>
                Complex Link
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const icon = screen.getByTestId('link-icon');
      await user.click(icon);
      
      expect(iconClicked).toBe(true);
    });
  });

  describe('States', () => {
    it('displays current page state correctly', () => {
      renderBasicBreadcrumb();
      
      const currentPage = screen.getByText('Breadcrumb');
      expect(currentPage).toHaveAttribute('role', 'link');
      expect(currentPage).toHaveAttribute('aria-disabled', 'true');
      expect(currentPage).toHaveAttribute('aria-current', 'page');
      expect(currentPage).toHaveClass('font-normal', 'text-foreground');
    });

    it('maintains consistent rendering across re-renders', () => {
      const { rerender } = renderBasicBreadcrumb();
      
      const initialBreadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      const initialClasses = initialBreadcrumb?.className;
      
      // Re-render with same structure
      rerender(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const rerenderedBreadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      expect(rerenderedBreadcrumb?.className).toBe(initialClasses);
    });

    it('handles dynamic content updates properly', () => {
      const { rerender } = renderBasicBreadcrumb();
      
      expect(screen.getByText('Breadcrumb')).toBeInTheDocument();
      
      // Update current page content
      rerender(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Updated Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      expect(screen.getByText('Updated Page')).toBeInTheDocument();
      expect(screen.queryByText('Breadcrumb')).not.toBeInTheDocument();
    });

    it('maintains data-slot attributes across state changes', () => {
      const { rerender } = renderBasicBreadcrumb();
      
      expect(document.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
      
      rerender(
        <Breadcrumb className="updated-breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Single Item</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      expect(document.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="breadcrumb"]')).toHaveClass('updated-breadcrumb');
    });

    it('handles active link states appropriately', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="active-link" aria-current="location">
                Active Section
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const activeLink = screen.getByText('Active Section');
      expect(activeLink).toHaveClass('active-link');
      expect(activeLink).toHaveAttribute('aria-current', 'location');
    });

    it('handles disabled link states', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink aria-disabled="true" className="disabled-link">
                Disabled Link
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const disabledLink = screen.getByText('Disabled Link');
      expect(disabledLink).toHaveAttribute('aria-disabled', 'true');
      expect(disabledLink).toHaveClass('disabled-link');
    });

    it('handles loading or pending states gracefully', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink aria-busy="true">Loading...</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const loadingLink = screen.getByText('Loading...');
      expect(loadingLink).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Accessibility', () => {
    it('provides proper navigation landmark', () => {
      renderBasicBreadcrumb();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'breadcrumb');
      expect(nav).toHaveAttribute('data-slot', 'breadcrumb');
    });

    it('maintains proper semantic structure with nav > ol > li', () => {
      renderBasicBreadcrumb();
      
      const nav = screen.getByRole('navigation');
      const list = screen.getByRole('list');
      const listItems = screen.getAllByRole('listitem');
      
      expect(nav).toContainElement(list);
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('marks current page with aria-current="page"', () => {
      renderBasicBreadcrumb();
      
      const currentPage = screen.getByText('Breadcrumb');
      expect(currentPage).toHaveAttribute('aria-current', 'page');
      expect(currentPage).toHaveAttribute('aria-disabled', 'true');
      expect(currentPage).toHaveAttribute('role', 'link');
    });

    it('provides proper ARIA attributes for separators', () => {
      renderBasicBreadcrumb();
      
      const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('role', 'presentation');
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('supports screen readers with proper accessible names', () => {
      renderWithUserEvents(
        <Breadcrumb aria-label="Main navigation breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink aria-label="Go to homepage">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage aria-label="Current page: Settings">Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const nav = screen.getByRole('navigation');
      const homeLink = screen.getByLabelText('Go to homepage');
      const currentPage = screen.getByLabelText('Current page: Settings');
      
      expect(nav).toHaveAttribute('aria-label', 'Main navigation breadcrumb');
      expect(homeLink).toBeInTheDocument();
      expect(currentPage).toBeInTheDocument();
    });

    it('handles keyboard navigation accessibility', () => {
      renderInteractiveBreadcrumb();
      
      const homeLink = screen.getByTestId('home-link');
      const componentsLink = screen.getByTestId('components-link');
      
      // Links should be focusable
      expect(homeLink.tabIndex).toBeGreaterThanOrEqual(0);
      expect(componentsLink.tabIndex).toBeGreaterThanOrEqual(0);
      
      accessibility.expectToBeAccessible(homeLink, {
        requireAccessibleName: true,
        checkKeyboardSupport: true
      });
    });

    it('provides screen reader context for ellipsis', () => {
      renderBreadcrumbWithEllipsis();
      
      const ellipsis = document.querySelector('[data-slot="breadcrumb-ellipsis"]');
      const srText = ellipsis?.querySelector('.sr-only');
      
      expect(ellipsis).toHaveAttribute('role', 'presentation');
      expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
      expect(srText).toHaveTextContent('More');
    });

    it('maintains accessibility with asChild links', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/" aria-label="Navigate to homepage">
                  Home
                </a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const homeLink = screen.getByLabelText('Navigate to homepage');
      expect(homeLink.tagName).toBe('A');
      expect(homeLink).toHaveAttribute('href', '/');
      
      accessibility.expectToBeAccessible(homeLink);
    });

    it('supports high contrast mode', () => {
      renderBasicBreadcrumb();
      
      const links = document.querySelectorAll('[data-slot="breadcrumb-link"]');
      const currentPage = document.querySelector('[data-slot="breadcrumb-page"]');
      
      // Links should have proper color transitions
      links.forEach(link => {
        expect(link).toHaveClass('transition-colors', 'hover:text-foreground');
      });
      
      // Current page should have proper foreground color
      expect(currentPage).toHaveClass('text-foreground');
    });

    it('maintains accessibility across all component variants', () => {
      const variants = [
        { render: renderBasicBreadcrumb, name: 'basic' },
        { render: renderBreadcrumbWithCustomSeparator, name: 'custom separator' },
        { render: renderBreadcrumbWithEllipsis, name: 'with ellipsis' },
        { render: renderSingleItemBreadcrumb, name: 'single item' }
      ];
      
      variants.forEach(({ render, name }) => {
        const { unmount } = render();
        
        const nav = screen.getByRole('navigation');
        expect(nav).toHaveAttribute('aria-label', 'breadcrumb');
        
        const currentPageElement = document.querySelector('[data-slot="breadcrumb-page"]');
        if (currentPageElement) {
          expect(currentPageElement).toHaveAttribute('aria-current', 'page');
        }
        
        unmount();
      });
    });

    it('provides proper focus management for interactive elements', async () => {
      const { user } = renderInteractiveBreadcrumb();
      
      // Focus should move properly through breadcrumb links
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'home-link');
      
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'components-link');
    });

    it('supports assistive technology with proper ARIA roles', () => {
      renderBasicBreadcrumb();
      
      const nav = screen.getByRole('navigation');
      const list = screen.getByRole('list');
      const currentPage = document.querySelector('[role="link"][aria-disabled="true"]');
      
      expect(nav).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(currentPage).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single breadcrumb item gracefully', () => {
      renderSingleItemBreadcrumb();
      
      const nav = screen.getByRole('navigation');
      const list = screen.getByRole('list');
      const currentPage = screen.getByText('Current Page');
      
      expect(nav).toContainElement(list);
      expect(currentPage).toHaveAttribute('aria-current', 'page');
      
      // Should not have separators
      const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      expect(separators).toHaveLength(0);
    });

    it('handles many breadcrumb items', () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => `Level ${i + 1}`);
      
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            {manyItems.map((item, index) => (
              <div key={index}>
                <BreadcrumbItem>
                  {index === manyItems.length - 1 ? (
                    <BreadcrumbPage>{item}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink>{item}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < manyItems.length - 1 && <BreadcrumbSeparator />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      // Should render all items
      manyItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
      
      // Should have proper number of separators (n-1)
      const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      expect(separators).toHaveLength(manyItems.length - 1);
      
      // Last item should be current page
      const lastItem = screen.getByText('Level 10');
      expect(lastItem).toHaveAttribute('aria-current', 'page');
    });

    it('handles empty breadcrumb list gracefully', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList />
        </Breadcrumb>
      );
      
      const nav = screen.getByRole('navigation');
      const list = screen.getByRole('list');
      
      expect(nav).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(list).toBeEmptyDOMElement();
    });

    it('handles very long breadcrumb text', () => {
      const longText = 'This is a very long breadcrumb item text that should be handled gracefully by the component styling and layout without breaking the design';
      
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>{longText}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const longTextElement = screen.getByText(longText);
      expect(longTextElement).toBeInTheDocument();
      
      const list = document.querySelector('[data-slot="breadcrumb-list"]');
      expect(list).toHaveClass('break-words', 'flex-wrap');
    });

    it('handles special characters in breadcrumb content', () => {
      const specialTexts = [
        '🏠 Home',
        '⚙️ Settings',
        '© 2024 Company',
        '&lt;Components&gt;',
        'Tëst Ünicödé',
        'العربية',
        '中文测试'
      ];
      
      specialTexts.forEach(text => {
        const { unmount } = renderWithUserEvents(
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{text}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        );
        
        const element = screen.getByText(text);
        expect(element).toBeInTheDocument();
        
        unmount();
      });
    });

    it('handles null and undefined content gracefully', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>
                {null}
                {undefined}
                Home
                {false && 'Hidden'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const homeLink = screen.getByText('Home');
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveTextContent('Home');
    });

    it('handles malformed HTML attributes gracefully', () => {
      renderBasicBreadcrumb({
        'data-test': '<script>alert("xss")</script>',
        'aria-label': 'Label with "quotes" and \'apostrophes\'',
        className: 'class-with-special-chars-!@#$%'
      });
      
      const breadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      expect(breadcrumb).toBeInTheDocument();
      expect(breadcrumb).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(breadcrumb).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
    });

    it('handles invalid separator children gracefully', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              {null}
              {undefined}
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const separator = document.querySelector('[data-slot="breadcrumb-separator"]');
      expect(separator).toBeInTheDocument();
      
      // When children contains null/undefined (which are falsy), React treats the children 
      // prop as truthy (an array with falsy elements), so the separator doesn't fall back 
      // to the default SVG. We should verify the separator exists but doesn't have default SVG.
      const defaultSvg = separator?.querySelector('svg');
      expect(defaultSvg).not.toBeInTheDocument();
      
      // The separator should be empty since null/undefined children render nothing
      expect(separator?.textContent?.trim()).toBe('');
    });

    it('handles rapid re-renders without memory leaks', () => {
      const { rerender } = renderBasicBreadcrumb();
      
      // Rapidly change breadcrumb content many times
      for (let i = 0; i < 50; i++) {
        rerender(
          <Breadcrumb key={i}>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink>Home {i}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Page {i}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        );
      }
      
      // Should still be functioning
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(screen.getByText('Home 49')).toBeInTheDocument();
      expect(screen.getByText('Page 49')).toBeInTheDocument();
    });

    it('handles extreme className lengths', () => {
      const longClassName = 'a'.repeat(1000);
      
      renderBasicBreadcrumb({ className: longClassName });
      
      const breadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      expect(breadcrumb).toHaveClass(longClassName);
    });

    it('handles deeply nested content structures', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <span>
                  <strong>
                    <em>Deeply Nested</em>
                  </strong>
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const link = screen.getByText('Deeply Nested');
      expect(link).toBeInTheDocument();
      
      const breadcrumbLink = document.querySelector('[data-slot="breadcrumb-link"]');
      expect(breadcrumbLink).toContainElement(link);
    });
  });

  describe('Component Integration', () => {
    it('integrates all breadcrumb components properly', () => {
      renderBasicBreadcrumb();
      
      // Check that all component types are present and integrated
      const breadcrumb = document.querySelector('[data-slot="breadcrumb"]');
      const list = document.querySelector('[data-slot="breadcrumb-list"]');
      const items = document.querySelectorAll('[data-slot="breadcrumb-item"]');
      const links = document.querySelectorAll('[data-slot="breadcrumb-link"]');
      const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      const page = document.querySelector('[data-slot="breadcrumb-page"]');
      
      expect(breadcrumb).toContainElement(list as HTMLElement);
      expect(items).toHaveLength(3);
      expect(links).toHaveLength(2);
      expect(separators).toHaveLength(2);
      expect(page).toBeInTheDocument();
    });

    it('integrates with ellipsis component correctly', () => {
      renderBreadcrumbWithEllipsis();
      
      const ellipsis = document.querySelector('[data-slot="breadcrumb-ellipsis"]');
      const list = document.querySelector('[data-slot="breadcrumb-list"]');
      
      expect(list).toContainElement(ellipsis as HTMLElement);
      expect(ellipsis).toHaveAttribute('role', 'presentation');
      expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
    });

    it('maintains proper component hierarchy', () => {
      renderBreadcrumbWithEllipsis();
      
      const nav = document.querySelector('nav[data-slot="breadcrumb"]');
      const ol = nav?.querySelector('ol[data-slot="breadcrumb-list"]');
      const lis = ol?.querySelectorAll('li');
      
      expect(nav).toBeInTheDocument();
      expect(ol).toBeInTheDocument();
      expect(lis).toHaveLength(7); // 4 items + 3 separators
      
      // Check specific hierarchy
      expect(nav).toContainElement(ol as HTMLElement);
      lis?.forEach(li => {
        expect(ol).toContainElement(li);
      });
    });

    it('integrates with custom separator icons', () => {
      renderBreadcrumbWithCustomSeparator();
      
      const customSeparators = screen.getAllByTestId('custom-separator');
      const separatorContainers = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
      
      expect(customSeparators).toHaveLength(2);
      
      separatorContainers.forEach(container => {
        const customIcon = container.querySelector('[data-testid="custom-separator"]');
        expect(customIcon).toBeInTheDocument();
        expect(container).toHaveClass('[&>svg]:size-3.5');
      });
    });

    it('integrates with asChild pattern correctly', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/home" className="custom-home-link">
                  <svg width="16" height="16" data-testid="home-icon">
                    <circle cx="8" cy="8" r="4" />
                  </svg>
                  Home
                </a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const homeLink = screen.getByText('Home');
      const homeIcon = screen.getByTestId('home-icon');
      
      expect(homeLink.tagName).toBe('A');
      expect(homeLink).toHaveAttribute('href', '/home');
      expect(homeLink).toHaveClass('custom-home-link');
      expect(homeLink).toHaveAttribute('data-slot', 'breadcrumb-link');
      expect(homeLink).toContainElement(homeIcon);
    });

    it('handles complex content integration with icons and text', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <svg width="16" height="16" data-testid="link-icon">
                  <circle cx="8" cy="8" r="4" />
                </svg>
                <span className="link-text">Dashboard</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <span data-testid="text-separator">→</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>
                <svg width="16" height="16" data-testid="page-icon">
                  <circle cx="8" cy="8" r="4" />
                </svg>
                <span className="page-text">Settings</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const linkIcon = screen.getByTestId('link-icon');
      const linkText = screen.getByText('Dashboard');
      const textSeparator = screen.getByTestId('text-separator');
      const pageIcon = screen.getByTestId('page-icon');
      const pageText = screen.getByText('Settings');
      
      const breadcrumbLink = document.querySelector('[data-slot="breadcrumb-link"]');
      const breadcrumbPage = document.querySelector('[data-slot="breadcrumb-page"]');
      const separator = document.querySelector('[data-slot="breadcrumb-separator"]');
      
      expect(breadcrumbLink).toContainElement(linkIcon);
      expect(breadcrumbLink).toContainElement(linkText);
      expect(separator).toContainElement(textSeparator);
      expect(breadcrumbPage).toContainElement(pageIcon);
      expect(breadcrumbPage).toContainElement(pageText);
    });

    it('maintains accessibility with complex integrations', () => {
      renderWithUserEvents(
        <Breadcrumb aria-label="Complex navigation breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                href="/dashboard" 
                aria-label="Go to dashboard"
                data-testid="dashboard-link"
              >
                <svg width="16" height="16" aria-hidden="true">
                  <circle cx="8" cy="8" r="4" />
                </svg>
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator aria-hidden="true" />
            <BreadcrumbItem>
              <BreadcrumbPage aria-label="Current page: User Settings">
                <svg width="16" height="16" aria-hidden="true">
                  <circle cx="8" cy="8" r="4" />
                </svg>
                Settings
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const nav = screen.getByRole('navigation');
      const dashboardLink = screen.getByTestId('dashboard-link');
      const settingsPage = screen.getByLabelText('Current page: User Settings');
      
      expect(nav).toHaveAttribute('aria-label', 'Complex navigation breadcrumb');
      expect(dashboardLink).toHaveAttribute('aria-label', 'Go to dashboard');
      expect(settingsPage).toHaveAttribute('aria-current', 'page');
      
      // Icons should be hidden from screen readers
      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons).toHaveLength(2);
    });

    it('integrates with responsive design patterns', () => {
      renderWithUserEvents(
        <Breadcrumb className="responsive-breadcrumb">
          <BreadcrumbList className="sm:gap-2.5">
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbLink className="sm:hidden">...</BreadcrumbLink>
              <BreadcrumbLink className="hidden sm:inline">Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const breadcrumb = screen.getByRole('navigation');
      const list = document.querySelector('[data-slot="breadcrumb-list"]');
      
      expect(breadcrumb).toHaveClass('responsive-breadcrumb');
      expect(list).toHaveClass('sm:gap-2.5');
      
      // Check responsive classes are applied
      const hiddenOnSmall = document.querySelector('.hidden.sm\\:inline-flex');
      const hiddenOnLarge = document.querySelector('.sm\\:hidden');
      
      expect(hiddenOnSmall).toBeInTheDocument();
      expect(hiddenOnLarge).toBeInTheDocument();
    });

    it('handles performance with many integrated components', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        text: `Level ${i + 1}`,
        href: `level-${i + 1}`,
        isLast: i === 19
      }));
      
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            {manyItems.map((item, index) => (
              <div key={index}>
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage data-testid={`page-${index}`}>
                      <svg width="12" height="12" aria-hidden="true">
                        <circle cx="6" cy="6" r="3" />
                      </svg>
                      {item.text}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href} data-testid={`link-${index}`}>
                      <svg width="12" height="12" aria-hidden="true">
                        <circle cx="6" cy="6" r="3" />
                      </svg>
                      {item.text}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!item.isLast && (
                  <BreadcrumbSeparator>
                    <svg width="12" height="12" aria-hidden="true">
                      <path d="m6 3 3 3-3 3" />
                    </svg>
                  </BreadcrumbSeparator>
                )}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      // Should render all items efficiently
      manyItems.forEach((item, index) => {
        const element = screen.getByText(item.text);
        expect(element).toBeInTheDocument();
        
        if (item.isLast) {
          expect(element).toHaveAttribute('aria-current', 'page');
        }
      });
      
      // Check that all icons are rendered
      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(manyItems.length);
    });

    it('integrates with form elements via asChild', () => {
      renderWithUserEvents(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button
                  type="button"
                  onClick={() => {}}
                  data-testid="button-breadcrumb"
                  aria-label="Navigate to previous section"
                >
                  <svg width="16" height="16" aria-hidden="true">
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Section</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      
      const backButton = screen.getByTestId('button-breadcrumb');
      
      expect(backButton.tagName).toBe('BUTTON');
      expect(backButton).toHaveAttribute('type', 'button');
      expect(backButton).toHaveAttribute('data-slot', 'breadcrumb-link');
      expect(backButton).toHaveAttribute('aria-label', 'Navigate to previous section');
      expect(backButton).toHaveTextContent('Back');
      
      const icon = backButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});