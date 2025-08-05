/**
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import { Header } from '../../app/(authenticated)/components/header';

// Mock the design system components
vi.mock('@repo/design-system/ui/breadcrumb', () => ({
  Breadcrumb: ({ children }: { children: React.ReactNode }) => (
    <nav data-testid="breadcrumb" aria-label="breadcrumb">{children}</nav>
  ),
  BreadcrumbItem: ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <li className={className} data-testid="breadcrumb-item">{children}</li>
  ),
  BreadcrumbLink: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="breadcrumb-link">{children}</a>
  ),
  BreadcrumbList: ({ children }: { children: React.ReactNode }) => (
    <ol data-testid="breadcrumb-list">{children}</ol>
  ),
  BreadcrumbPage: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="breadcrumb-page">{children}</span>
  ),
  BreadcrumbSeparator: ({ className }: { className?: string }) => (
    <li className={className} data-testid="breadcrumb-separator" aria-hidden="true">/</li>
  ),
}));

vi.mock('@repo/design-system/ui/separator', () => ({
  Separator: ({ orientation, className }: { orientation?: string; className?: string }) => (
    <hr 
      className={className} 
      data-testid="separator" 
      data-orientation={orientation}
    />
  ),
}));

vi.mock('@repo/design-system/ui/sidebar', () => ({
  SidebarTrigger: ({ className }: { className?: string }) => (
    <button className={className} data-testid="sidebar-trigger" aria-label="Toggle sidebar">
      ☰
    </button>
  ),
}));

describe('Header', () => {
  test('renders basic header structure', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('flex', 'h-16', 'shrink-0', 'items-center', 'justify-between', 'gap-2');
  });

  test('renders sidebar trigger', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const sidebarTrigger = screen.getByTestId('sidebar-trigger');
    expect(sidebarTrigger).toBeInTheDocument();
    expect(sidebarTrigger).toHaveClass('-ml-1');
    expect(sidebarTrigger).toHaveAttribute('aria-label', 'Toggle sidebar');
  });

  test('renders separator with correct orientation', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
    expect(separator).toHaveClass('mr-2', 'h-4');
  });

  test('renders breadcrumb navigation', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb).toHaveAttribute('aria-label', 'breadcrumb');

    const breadcrumbList = screen.getByTestId('breadcrumb-list');
    expect(breadcrumbList).toBeInTheDocument();
  });

  test('renders single page in breadcrumb', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    // Should render the page from pages array
    const breadcrumbLink = screen.getByTestId('breadcrumb-link');
    expect(breadcrumbLink).toHaveTextContent('Home');
    expect(breadcrumbLink).toHaveAttribute('href', '#');

    // Should render the current page
    const breadcrumbPage = screen.getByTestId('breadcrumb-page');
    expect(breadcrumbPage).toHaveTextContent('Dashboard');
  });

  test('renders multiple pages in breadcrumb', () => {
    render(<Header pages={['Home', 'Settings', 'Profile']} page="Edit" />);

    const breadcrumbLinks = screen.getAllByTestId('breadcrumb-link');
    expect(breadcrumbLinks).toHaveLength(3);
    expect(breadcrumbLinks[0]).toHaveTextContent('Home');
    expect(breadcrumbLinks[1]).toHaveTextContent('Settings');
    expect(breadcrumbLinks[2]).toHaveTextContent('Profile');

    const breadcrumbPage = screen.getByTestId('breadcrumb-page');
    expect(breadcrumbPage).toHaveTextContent('Edit');
  });

  test('renders breadcrumb separators', () => {
    render(<Header pages={['Home', 'Settings']} page="Profile" />);

    const separators = screen.getAllByTestId('breadcrumb-separator');
    // Should have separators between pages and before current page
    expect(separators.length).toBeGreaterThanOrEqual(2);
    
    separators.forEach(separator => {
      expect(separator).toHaveAttribute('aria-hidden', 'true');
      expect(separator).toHaveClass('hidden', 'md:block');
    });
  });

  test('breadcrumb items have responsive classes', () => {
    render(<Header pages={['Home', 'Settings']} page="Profile" />);

    const breadcrumbItems = screen.getAllByTestId('breadcrumb-item');
    
    // The pages from the array should have responsive classes
    const pageItems = breadcrumbItems.slice(0, -1); // All except the last one (current page)
    pageItems.forEach(item => {
      expect(item).toHaveClass('hidden', 'md:block');
    });
    
    // The current page item should NOT have responsive classes (it's always visible)
    const currentPageItem = breadcrumbItems[breadcrumbItems.length - 1];
    expect(currentPageItem).not.toHaveClass('hidden');
    expect(currentPageItem).not.toHaveClass('md:block');
  });

  test('renders children when provided', () => {
    const childContent = (
      <div data-testid="header-children">
        <button>Action Button</button>
        <span>Additional Content</span>
      </div>
    );

    render(
      <Header pages={['Home']} page="Dashboard">
        {childContent}
      </Header>
    );

    const children = screen.getByTestId('header-children');
    expect(children).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    expect(screen.getByText('Additional Content')).toBeInTheDocument();
  });

  test('renders without children', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Should still render the main navigation elements
    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
  });

  test('handles empty pages array', () => {
    render(<Header pages={[]} page="Dashboard" />);

    // Should still render the current page
    const breadcrumbPage = screen.getByTestId('breadcrumb-page');
    expect(breadcrumbPage).toHaveTextContent('Dashboard');

    // Should not render any breadcrumb links
    const breadcrumbLinks = screen.queryAllByTestId('breadcrumb-link');
    expect(breadcrumbLinks).toHaveLength(0);
  });

  test('handles special characters in page names', () => {
    const specialPages = ['Home & Garden', 'Settings/Config', 'User@Profile'];
    render(<Header pages={specialPages} page="Dashboard & More" />);

    const breadcrumbLinks = screen.getAllByTestId('breadcrumb-link');
    expect(breadcrumbLinks[0]).toHaveTextContent('Home & Garden');
    expect(breadcrumbLinks[1]).toHaveTextContent('Settings/Config');
    expect(breadcrumbLinks[2]).toHaveTextContent('User@Profile');

    const breadcrumbPage = screen.getByTestId('breadcrumb-page');
    expect(breadcrumbPage).toHaveTextContent('Dashboard & More');
  });

  test('header has correct layout classes', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const header = screen.getByRole('banner');
    
    // Verify flex layout classes
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('h-16'); // Fixed height
    expect(header).toHaveClass('shrink-0'); // Prevent shrinking
    expect(header).toHaveClass('items-center'); // Vertical alignment
    expect(header).toHaveClass('justify-between'); // Space between left and right content
    expect(header).toHaveClass('gap-2'); // Gap between items
  });

  test('left section has correct layout', () => {
    render(<Header pages={['Home']} page="Dashboard" />);

    const header = screen.getByRole('banner');
    const leftSection = header.firstElementChild;
    
    expect(leftSection).toHaveClass('flex', 'items-center', 'gap-2', 'px-4');
  });

  test('breadcrumb links point to hash', () => {
    render(<Header pages={['Home', 'Settings']} page="Profile" />);

    const breadcrumbLinks = screen.getAllByTestId('breadcrumb-link');
    breadcrumbLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '#');
    });
  });

  /**
   * Props validation tests to ensure proper prop handling.
   */
  describe('Props Validation', () => {
    /**
     * Tests that all required props are handled correctly.
     * Verifies prop types and required prop enforcement.
     */
    test('should handle all required props correctly', () => {
      const props = {
        pages: ['Home', 'Settings'],
        page: 'Profile'
      };

      render(<Header {...props} />);

      // Verify pages array is rendered
      const breadcrumbLinks = screen.getAllByTestId('breadcrumb-link');
      expect(breadcrumbLinks).toHaveLength(2);
      expect(breadcrumbLinks[0]).toHaveTextContent('Home');
      expect(breadcrumbLinks[1]).toHaveTextContent('Settings');

      // Verify current page is rendered
      const breadcrumbPage = screen.getByTestId('breadcrumb-page');
      expect(breadcrumbPage).toHaveTextContent('Profile');
    });

    /**
     * Tests handling of various page array lengths.
     * Verifies component scales properly with different navigation depths.
     */
    test('should handle various page array lengths', () => {
      // Test with long navigation path
      const longPages = ['Root', 'Category', 'Subcategory', 'Item', 'Details'];
      render(<Header pages={longPages} page="Edit" />);

      const breadcrumbLinks = screen.getAllByTestId('breadcrumb-link');
      expect(breadcrumbLinks).toHaveLength(5);
      
      // Verify all pages are rendered in order
      longPages.forEach((page, index) => {
        expect(breadcrumbLinks[index]).toHaveTextContent(page);
      });
    });

    /**
     * Tests breadcrumb links configuration.
     * Verifies that all links point to hash anchors as expected.
     */
    test('should configure breadcrumb links correctly', () => {
      render(<Header pages={['Home', 'Settings']} page="Profile" />);

      const breadcrumbLinks = screen.getAllByTestId('breadcrumb-link');
      breadcrumbLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '#');
      });
    });
  });

  /**
   * Layout integration tests to verify component positioning and structure.
   */
  describe('Layout Integration', () => {
    /**
     * Tests header layout classes for proper flex positioning.
     * Verifies the component maintains consistent layout structure.
     */
    test('should apply correct layout classes to header', () => {
      render(<Header pages={['Home']} page="Dashboard" />);

      const header = screen.getByRole('banner');
      
      // Verify flex layout classes
      expect(header).toHaveClass('flex'); // Flexbox layout
      expect(header).toHaveClass('h-16'); // Fixed height
      expect(header).toHaveClass('shrink-0'); // Prevent shrinking
      expect(header).toHaveClass('items-center'); // Vertical alignment
      expect(header).toHaveClass('justify-between'); // Space between left and right content
      expect(header).toHaveClass('gap-2'); // Gap between items
    });

    /**
     * Tests left section layout structure.
     * Verifies navigation elements are properly positioned.
     */
    test('should structure left section layout correctly', () => {
      render(<Header pages={['Home']} page="Dashboard" />);

      const header = screen.getByRole('banner');
      const leftSection = header.firstElementChild;
      
      expect(leftSection).toHaveClass('flex', 'items-center', 'gap-2', 'px-4');
      
      // Verify element order and presence
      expect(leftSection?.children).toHaveLength(3); // trigger, separator, breadcrumb
    });

    /**
     * Tests header component integration with different layouts.
     * Verifies compatibility with various page structures.
     */
    test('should integrate properly with page layouts', () => {
      render(
        <div className="app-layout">
          <Header pages={['Dashboard']} page="Analytics">
            <div className="header-actions">
              <button>Export</button>
              <button>Settings</button>
            </div>
          </Header>
          <main>Page Content</main>
        </div>
      );

      // Header should maintain its structure within parent layout
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'h-16', 'shrink-0');
      
      // Children should be positioned correctly
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});

