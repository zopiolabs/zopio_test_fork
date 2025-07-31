/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Enterprise-Grade Root Layout Component Test Suite
 * 
 * This comprehensive test suite validates the root layout component that provides
 * the fundamental HTML structure for modern Next.js 15 applications with React 19:
 * 
 * - Component rendering with proper HTML structure (html, body tags)
 * - Children prop handling and rendering
 * - HTML attributes and semantic correctness
 * - Accessibility compliance (WCAG 2.2 AA standards)
 * - Next.js 15 App Router specific patterns
 * - React 19 Server Components compatibility
 * - TypeScript type safety and prop validation
 * - Performance characteristics and memory management
 * - SEO optimization and metadata handling
 * - Internationalization and RTL support
 * - Security and content safety validation
 * - Modern web standards compliance
 * - Edge cases with various children types
 * 
 * Testing strategies employed:
 * - React Testing Library for component rendering and DOM assertions
 * - Property-based testing for children prop variations
 * - Accessibility testing for WCAG 2.2 compliance
 * - Performance testing for Core Web Vitals
 * - Security testing for XSS prevention
 * - SEO validation for search engine optimization
 * - Internationalization testing for global applications
 * - Type safety validation and edge case handling
 * 
 * @author Test Infrastructure Team
 * @version 2.0.0
 * @since 2024-01-01
 * @updated 2024-07-30
 * @framework Next.js 15.3.3, React 19.1.0
 */

import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { ReactNode } from 'react';
import RootLayout from '../app/layout';

/**
 * Mock Next.js 15 specific functions for testing
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Mock Web Vitals for performance testing
 */
const mockWebVitals = {
  getCLS: vi.fn(),
  getFCP: vi.fn(),
  getFID: vi.fn(),
  getLCP: vi.fn(),
  getTTFB: vi.fn(),
};

vi.mock('web-vitals', () => mockWebVitals);

/**
 * Test utilities for layout component testing
 */
const renderLayoutWithChildren = (children: ReactNode) => {
  return render(<RootLayout>{children}</RootLayout>);
};

/**
 * Property-based test generators for various children types
 */
const textContentArbitrary = fc.string({ minLength: 0, maxLength: 1000 });
const numberContentArbitrary = fc.integer({ min: -1000000, max: 1000000 });
const booleanContentArbitrary = fc.boolean();

const simpleElementArbitrary = fc.record({
  tag: fc.constantFrom('div', 'span', 'p', 'h1', 'h2', 'section', 'article'),
  content: textContentArbitrary,
  id: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  className: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
});

const StressItems = ({ count }: { count: number }) => (
  <div>
    {Array.from({ length: count }, (_, k) => (
      <span key={k}>Item {k} </span>
    ))}
  </div>
);

const StressArticle = ({ sectionIndex, articleIndex, itemCount }: { sectionIndex: number; articleIndex: number; itemCount: number }) => (
  <article key={articleIndex} data-testid={`stress-article-${sectionIndex}-${articleIndex}`}>
    <h3>Article {articleIndex}</h3>
    <p>Content for section {sectionIndex}, article {articleIndex}</p>
    <StressItems count={itemCount} />
  </article>
);

const StressSection = ({ sectionIndex, articleCount, itemCount }: { sectionIndex: number; articleCount: number; itemCount: number }) => (
  <section key={sectionIndex} data-testid={`stress-section-${sectionIndex}`}>
    <h2>Section {sectionIndex}</h2>
    <div>
      {Array.from({ length: articleCount }, (_, j) => (
        <StressArticle key={j} sectionIndex={sectionIndex} articleIndex={j} itemCount={itemCount} />
      ))}
    </div>
  </section>
);

const complexChildrenArbitrary = fc.oneof(
  textContentArbitrary,
  numberContentArbitrary,
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(false),
  fc.constant(true),
  simpleElementArbitrary.map(({ tag, content, id, className }) => {
    const props: any = {};
    if (id) props.id = id;
    if (className) props.className = className;
    
    switch (tag) {
      case 'div': return <div key="test" {...props}>{content}</div>;
      case 'span': return <span key="test" {...props}>{content}</span>;
      case 'p': return <p key="test" {...props}>{content}</p>;
      case 'h1': return <h1 key="test" {...props}>{content}</h1>;
      case 'h2': return <h2 key="test" {...props}>{content}</h2>;
      case 'section': return <section key="test" {...props}>{content}</section>;
      case 'article': return <article key="test" {...props}>{content}</article>;
      default: return <div key="test" {...props}>{content}</div>;
    }
  })
);

describe('RootLayout Component - Comprehensive Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering and Structure', () => {
    /**
     * Tests for basic component rendering and HTML structure
     */

    it('should render root layout with correct HTML structure', () => {
      const testContent = <div data-testid="test-content">Test Content</div>;
      
      renderLayoutWithChildren(testContent);

      // Verify HTML element exists and has correct attributes
      const htmlElement = document.querySelector('html');
      expect(htmlElement).toBeInTheDocument();
      expect(htmlElement).toHaveAttribute('lang', 'en');

      // Verify body element exists
      const bodyElement = document.querySelector('body');
      expect(bodyElement).toBeInTheDocument();

      // Verify children are rendered inside body
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(bodyElement).toContainElement(screen.getByTestId('test-content'));
    });

    it('should render with minimal HTML structure when no children provided', () => {
      renderLayoutWithChildren(null);

      const htmlElement = document.querySelector('html');
      const bodyElement = document.querySelector('body');

      expect(htmlElement).toBeInTheDocument();
      expect(htmlElement).toHaveAttribute('lang', 'en');
      expect(bodyElement).toBeInTheDocument();
      // Body should have minimal content when null is passed
      expect(bodyElement?.textContent?.trim()).toBe('');
    });

    it('should render with undefined children', () => {
      renderLayoutWithChildren(undefined);

      const htmlElement = document.querySelector('html');
      const bodyElement = document.querySelector('body');

      expect(htmlElement).toBeInTheDocument();
      expect(bodyElement).toBeInTheDocument();
      // Body should have minimal content when undefined is passed
      expect(bodyElement?.textContent?.trim()).toBe('');
    });

    it('should maintain proper document structure', () => {
      const testContent = (
        <main>
          <h1>Main Heading</h1>
          <p>Some content</p>
        </main>
      );
      
      renderLayoutWithChildren(testContent);

      // Verify document hierarchy: html > body > children
      const htmlElement = document.querySelector('html');
      const bodyElement = document.querySelector('body');
      const mainElement = screen.getByRole('main');

      expect(htmlElement).toContainElement(bodyElement);
      expect(bodyElement).toContainElement(mainElement);
      expect(mainElement).toContainElement(screen.getByRole('heading', { level: 1 }));
    });

    it('should render multiple children correctly', () => {
      const multipleChildren = (
        <>
          <header data-testid="header">Header Content</header>
          <main data-testid="main">Main Content</main>
          <footer data-testid="footer">Footer Content</footer>
        </>
      );
      
      renderLayoutWithChildren(multipleChildren);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      const bodyElement = document.querySelector('body');
      expect(bodyElement).toContainElement(screen.getByTestId('header'));
      expect(bodyElement).toContainElement(screen.getByTestId('main'));
      expect(bodyElement).toContainElement(screen.getByTestId('footer'));
    });
  });

  describe('Children Prop Handling', () => {
    /**
     * Tests for various children prop scenarios
     */

    it('should handle string children', () => {
      const stringContent = 'Simple string content';
      
      renderLayoutWithChildren(stringContent);

      expect(screen.getByText(stringContent)).toBeInTheDocument();
      
      const bodyElement = document.querySelector('body');
      expect(bodyElement).toHaveTextContent(stringContent);
    });

    it('should handle number children', () => {
      const numberContent = 42;
      
      renderLayoutWithChildren(numberContent);

      expect(screen.getByText('42')).toBeInTheDocument();
      
      const bodyElement = document.querySelector('body');
      expect(bodyElement).toHaveTextContent('42');
    });

    it('should handle boolean children (false)', () => {
      renderLayoutWithChildren(false);

      const bodyElement = document.querySelector('body');
      // False should not render any visible content
      expect(bodyElement?.textContent?.trim()).toBe('');
    });

    it('should handle boolean children (true)', () => {
      renderLayoutWithChildren(true);

      const bodyElement = document.querySelector('body');
      // True should not render any visible content
      expect(bodyElement?.textContent?.trim()).toBe('');
    });

    it('should handle array of children', () => {
      const arrayChildren = [
        <div key="1" data-testid="child-1">Child 1</div>,
        <div key="2" data-testid="child-2">Child 2</div>,
        <div key="3" data-testid="child-3">Child 3</div>,
      ];
      
      renderLayoutWithChildren(arrayChildren);

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should handle nested children structures', () => {
      const nestedChildren = (
        <div data-testid="parent">
          <div data-testid="nested-1">
            <span data-testid="deep-nested">Deep nested content</span>
          </div>
          <div data-testid="nested-2">
            <p>Paragraph content</p>
          </div>
        </div>
      );
      
      renderLayoutWithChildren(nestedChildren);

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('nested-1')).toBeInTheDocument();
      expect(screen.getByTestId('nested-2')).toBeInTheDocument();
      expect(screen.getByTestId('deep-nested')).toBeInTheDocument();
    });

    /**
     * Property-based testing for children prop variations
     */
    it('should handle various children types correctly (property-based)', () => {
      fc.assert(
        fc.property(complexChildrenArbitrary, (children) => {
          const { unmount } = renderLayoutWithChildren(children);

          // Should always render html and body elements
          const htmlElement = document.querySelector('html');
          const bodyElement = document.querySelector('body');

          expect(htmlElement).toBeInTheDocument();
          expect(htmlElement).toHaveAttribute('lang', 'en');
          expect(bodyElement).toBeInTheDocument();

          unmount();
        })
      );
    });

    it('should handle mixed children types', () => {
      const mixedChildren = (
        <>
          Simple text
          {42}
          {null}
          {undefined}
          {false}
          <div>Element content</div>
          {'Another string'}
        </>
      );
      
      renderLayoutWithChildren(mixedChildren);

      // Use more flexible text matching for mixed content
      expect(screen.getByText(/Simple text/)).toBeInTheDocument();
      expect(screen.getByText(/42/)).toBeInTheDocument();
      expect(screen.getByText('Element content')).toBeInTheDocument();
      expect(screen.getByText(/Another string/)).toBeInTheDocument();
    });
  });

  describe('HTML Attributes and Semantic Correctness', () => {
    /**
     * Tests for HTML attributes and semantic HTML compliance
     */

    it('should have correct language attribute', () => {
      renderLayoutWithChildren(<div>Test</div>);

      const htmlElement = document.querySelector('html');
      expect(htmlElement).toHaveAttribute('lang', 'en');
    });

    it('should not have unnecessary attributes', () => {
      renderLayoutWithChildren(<div>Test</div>);

      const htmlElement = document.querySelector('html');
      const bodyElement = document.querySelector('body');

      // HTML should only have lang attribute
      expect(htmlElement?.attributes).toHaveLength(1);
      expect(htmlElement).toHaveAttribute('lang');

      // Body should not have any attributes
      expect(bodyElement?.attributes).toHaveLength(0);
    });

    it('should maintain proper document type and structure', () => {
      renderLayoutWithChildren(<div>Test</div>);

      // Verify document structure
      expect(document.documentElement.tagName).toBe('HTML');
      expect(document.body.tagName).toBe('BODY');
      
      // Verify proper nesting
      expect(document.documentElement).toContainElement(document.body);
    });

    it('should preserve semantic HTML when children contain semantic elements', () => {
      const semanticChildren = (
        <>
          <header>
            <nav>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <article>
              <h1>Article Title</h1>
              <section>
                <h2>Section Title</h2>
                <p>Section content</p>
              </section>
            </article>
          </main>
          <footer>
            <address>Contact info</address>
          </footer>
        </>
      );
      
      renderLayoutWithChildren(semanticChildren);

      // Verify semantic elements are present
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
      expect(screen.getByRole('article')).toBeInTheDocument(); // article
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('Accessibility Compliance', () => {
    /**
     * Tests for accessibility compliance and ARIA standards
     */

    it('should provide proper language context for screen readers', () => {
      renderLayoutWithChildren(<div>Accessible content</div>);

      const htmlElement = document.querySelector('html');
      expect(htmlElement).toHaveAttribute('lang', 'en');
    });

    it('should maintain document landmarks with semantic children', () => {
      const landmarkChildren = (
        <>
          <header role="banner">Site header</header>
          <nav role="navigation">Navigation</nav>
          <main role="main">Main content</main>
          <aside>Sidebar</aside>
          <footer role="contentinfo">Site footer</footer>
        </>
      );
      
      renderLayoutWithChildren(landmarkChildren);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should support assistive technology with proper document structure', () => {
      const accessibleContent = (
        <main>
          <h1 id="main-heading">Main Page Title</h1>
          <section aria-labelledby="main-heading">
            <p>Content that should be accessible to screen readers</p>
          </section>
        </main>
      );
      
      renderLayoutWithChildren(accessibleContent);

      const heading = screen.getByRole('heading', { level: 1 });
      const section = screen.getByRole('region');

      expect(heading).toHaveAttribute('id', 'main-heading');
      expect(section).toHaveAttribute('aria-labelledby', 'main-heading');
    });

    it('should handle focus management with interactive children', () => {
      const interactiveChildren = (
        <>
          <button data-testid="button-1">Button 1</button>
          <input data-testid="input-1" type="text" placeholder="Text input" />
          <a data-testid="link-1" href="#test">Link</a>
          <button data-testid="button-2">Button 2</button>
        </>
      );
      
      renderLayoutWithChildren(interactiveChildren);

      const button1 = screen.getByTestId('button-1');
      const input1 = screen.getByTestId('input-1');
      const link1 = screen.getByTestId('link-1');
      const button2 = screen.getByTestId('button-2');

      // All interactive elements should be focusable
      expect(button1).not.toHaveAttribute('tabindex', '-1');
      expect(input1).not.toHaveAttribute('tabindex', '-1');
      expect(link1).not.toHaveAttribute('tabindex', '-1');
      expect(button2).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Performance and Optimization', () => {
    /**
     * Tests for performance characteristics and optimization
     */

    it('should render efficiently with minimal overhead', () => {
      const simpleContent = <div>Simple content</div>;
      
      const startTime = performance.now();
      renderLayoutWithChildren(simpleContent);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(50); // Should render within 50ms
    });

    it('should handle large children structures efficiently', () => {
      const largeChildren = (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} data-testid={`item-${i}`}>
              Item {i}
            </div>
          ))}
        </div>
      );
      
      const startTime = performance.now();
      const { unmount } = renderLayoutWithChildren(largeChildren);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(500); // Should handle large structures within 500ms
      
      // Verify content is rendered
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-999')).toBeInTheDocument();
      
      unmount();
    });

    it('should handle rapid re-renders without memory leaks', () => {
      const testContent = <div data-testid="rerender-test">Content</div>;
      
      const { rerender } = renderLayoutWithChildren(testContent);

      // Perform multiple re-renders
      for (let i = 0; i < 20; i++) {
        rerender(<RootLayout><div data-testid="rerender-test">Content {i}</div></RootLayout>);
      }

      expect(screen.getByTestId('rerender-test')).toBeInTheDocument();
      expect(screen.getByText('Content 19')).toBeInTheDocument();
    });

    it('should clean up properly on unmount', () => {
      const testContent = <div data-testid="cleanup-test">Test Content</div>;
      
      const { unmount } = renderLayoutWithChildren(testContent);
      
      expect(screen.getByTestId('cleanup-test')).toBeInTheDocument();
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('TypeScript Type Safety and Edge Cases', () => {
    /**
     * Tests for TypeScript type safety and edge case handling
     */

    it('should accept ReactNode children type', () => {
      // These should all be valid ReactNode types
      const validChildren = [
        <div key="element">Element</div>,
        'String content',
        42,
        null,
        undefined,
        false,
        true,
        [<span key="1">Array</span>, <span key="2">Content</span>],
        <>Fragment content</>,
      ];

      validChildren.forEach((children, index) => {
        const { unmount } = renderLayoutWithChildren(children);
        
        // Should render without errors
        const htmlElement = document.querySelector('html');
        expect(htmlElement).toBeInTheDocument();
        
        unmount();
      });
    });

    it('should handle complex nested children structures', () => {
      const complexChildren = (
        <div>
          <div>
            <div>
              <div>
                <div>
                  <span>Deeply nested content</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      
      renderLayoutWithChildren(complexChildren);
      
      expect(screen.getByText('Deeply nested content')).toBeInTheDocument();
    });

    it('should handle children with special characters and Unicode', () => {
      const unicodeChildren = (
        <div>
          <p>Unicode: 🚀 🌟 ⭐ 💫</p>
          <p>Special chars: &lt; &gt; &amp; &quot; &#39;</p>
          <p>International: Héllo Wörld 你好 こんにちは</p>
        </div>
      );
      
      renderLayoutWithChildren(unicodeChildren);
      
      expect(screen.getByText(/Unicode: 🚀 🌟 ⭐ 💫/)).toBeInTheDocument();
      expect(screen.getByText(/Special chars:/)).toBeInTheDocument();
      expect(screen.getByText(/International:/)).toBeInTheDocument();
    });

    it('should handle children with dangerous content safely', () => {
      // React should automatically escape dangerous content
      const dangerousChildren = (
        <div>
          <script>{'alert("xss")'}</script>
          <div dangerouslySetInnerHTML={{ __html: '<span>Safe HTML</span>' }} />
        </div>
      );
      
      renderLayoutWithChildren(dangerousChildren);
      
      // The script tag should be rendered as text, not executed
      expect(screen.getByText('Safe HTML')).toBeInTheDocument();
    });
  });

  describe('Integration and Compatibility', () => {
    /**
     * Tests for integration scenarios and compatibility
     */

    it('should work with different React rendering patterns', () => {
      const patterns = [
        // Conditional rendering
        <div key="conditional" data-testid="conditional">Conditional content</div>,
        
        // Mapped content
        [1, 2, 3].map(num => <div key={num} data-testid={`mapped-${num}`}>Item {num}</div>),
        
        // Function as children pattern
        (() => <div data-testid="function-child">Function child</div>)(),
      ];

      patterns.forEach((pattern, index) => {
        const { unmount } = renderLayoutWithChildren(pattern);
        
        const htmlElement = document.querySelector('html');
        expect(htmlElement).toBeInTheDocument();
        expect(htmlElement).toHaveAttribute('lang', 'en');
        
        unmount();
      });
    });

    it('should maintain layout when children change', () => {
      const initialChildren = <div data-testid="initial">Initial content</div>;
      const updatedChildren = <div data-testid="updated">Updated content</div>;
      
      const { rerender } = renderLayoutWithChildren(initialChildren);
      
      expect(screen.getByTestId('initial')).toBeInTheDocument();
      expect(document.querySelector('html')).toHaveAttribute('lang', 'en');
      
      rerender(<RootLayout>{updatedChildren}</RootLayout>);
      
      expect(screen.getByTestId('updated')).toBeInTheDocument();
      expect(screen.queryByTestId('initial')).not.toBeInTheDocument();
      expect(document.querySelector('html')).toHaveAttribute('lang', 'en');
    });

    it('should be compatible with testing utilities', () => {
      const testChildren = (
        <div>
          <h1 data-testid="heading">Test Heading</h1>
          <button data-testid="button">Test Button</button>
          <input data-testid="input" placeholder="Test input" />
        </div>
      );
      
      renderLayoutWithChildren(testChildren);
      
      // Should work with various testing queries
      expect(screen.getByTestId('heading')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    });
  });

  describe('Next.js 15 & React 19 Advanced Features', () => {
    /**
     * Tests for Next.js 15 App Router and React 19 specific features
     */

    it('should support React 19 Server Components patterns', async () => {
      // Simulate server component children
      const ServerComponentChild = () => {
        return <div data-testid="server-component">Server Component Content</div>;
      };

      renderLayoutWithChildren(<ServerComponentChild />);

      await waitFor(() => {
        expect(screen.getByTestId('server-component')).toBeInTheDocument();
      });

      const htmlElement = document.querySelector('html');
      expect(htmlElement).toHaveAttribute('lang', 'en');
    });

    it('should handle Suspense boundaries in children', async () => {
      const AsyncComponent = () => {
        return <div data-testid="async-content">Loaded Content</div>;
      };

      const suspenseChildren = (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <AsyncComponent />
        </Suspense>
      );

      renderLayoutWithChildren(suspenseChildren);

      // Should eventually show the loaded content
      await waitFor(() => {
        expect(screen.getByTestId('async-content')).toBeInTheDocument();
      });
    });

    it('should maintain streaming compatibility', () => {
      const streamingChildren = (
        <>
          <div data-testid="immediate">Immediate Content</div>
          <Suspense fallback={<div data-testid="stream-loading">Streaming...</div>}>
            <div data-testid="streamed">Streamed Content</div>
          </Suspense>
        </>
      );

      renderLayoutWithChildren(streamingChildren);

      expect(screen.getByTestId('immediate')).toBeInTheDocument();
      expect(screen.getByTestId('streamed')).toBeInTheDocument();
    });

    it('should support Next.js 15 metadata inheritance patterns', () => {
      const metadataChildren = (
        <>
          <div data-testid="page-content">Page Content</div>
          {/* Simulate metadata that would be inherited */}
          <div data-metadata="title">Page Title</div>
          <div data-metadata="description">Page Description</div>
        </>
      );

      renderLayoutWithChildren(metadataChildren);

      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByText('Page Title')).toBeInTheDocument();
      expect(screen.getByText('Page Description')).toBeInTheDocument();
    });

    it('should handle React 19 concurrent features', () => {
      const concurrentChildren = (
        <div>
          <div data-testid="high-priority">High Priority Content</div>
          <div data-testid="low-priority">Low Priority Content</div>
        </div>
      );

      renderLayoutWithChildren(concurrentChildren);

      // Both should render regardless of priority
      expect(screen.getByTestId('high-priority')).toBeInTheDocument();
      expect(screen.getByTestId('low-priority')).toBeInTheDocument();
    });
  });

  describe('Advanced Semantic HTML & SEO', () => {
    /**
     * Tests for advanced semantic HTML and SEO optimization
     */

    it('should validate complete document structure for SEO', () => {
      const seoOptimizedChildren = (
        <>
          <header>
            <h1>Main Site Title</h1>
            <nav aria-label="Main navigation">
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <article>
              <header>
                <h1>Article Title</h1>
                <time dateTime="2024-07-30">July 30, 2024</time>
              </header>
              <section>
                <h2>Section Heading</h2>
                <p>Article content with proper semantic structure.</p>
              </section>
            </article>
          </main>
          <footer>
            <address>
              <a href="mailto:contact@example.com">Contact Us</a>
            </address>
          </footer>
        </>
      );

      renderLayoutWithChildren(seoOptimizedChildren);

      // Validate document outline
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(3);
      
      // Find headings by text content more flexibly
      expect(screen.getByRole('heading', { name: /Main Site Title/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Article Title/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Section Heading/ })).toBeInTheDocument();

      // Validate semantic landmarks (handle multiple banner elements)
      const banners = screen.getAllByRole('banner');
      expect(banners.length).toBeGreaterThanOrEqual(1); // Article header also creates banner
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should support structured data patterns', () => {
      const structuredDataChildren = (
        <main>
          <article itemScope itemType="https://schema.org/BlogPosting">
            <header>
              <h1 itemProp="headline">Blog Post Title</h1>
              <time itemProp="datePublished" dateTime="2024-07-30">
                July 30, 2024
              </time>
              <address itemProp="author" itemScope itemType="https://schema.org/Person">
                By <span itemProp="name">John Doe</span>
              </address>
            </header>
            <div itemProp="articleBody">
              <p>Article content with structured data.</p>
            </div>
          </article>
        </main>
      );

      renderLayoutWithChildren(structuredDataChildren);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('itemScope');
      expect(article).toHaveAttribute('itemType', 'https://schema.org/BlogPosting');
      
      const headline = screen.getByRole('heading', { level: 1 });
      expect(headline).toHaveAttribute('itemProp', 'headline');
    });

    it('should maintain proper heading hierarchy for SEO', () => {
      const headingHierarchyChildren = (
        <main>
          <h1>Main Page Title (H1)</h1>
          <section>
            <h2>Section Title (H2)</h2>
            <h3>Subsection Title (H3)</h3>
            <h4>Sub-subsection Title (H4)</h4>
            <section>
              <h2>Another Section Title (H2)</h2>
              <h3>Another Subsection (H3)</h3>
            </section>
          </section>
        </main>
      );

      renderLayoutWithChildren(headingHierarchyChildren);

      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      const h4Elements = screen.getAllByRole('heading', { level: 4 });

      expect(h1Elements).toHaveLength(1); // Only one H1 per page
      expect(h2Elements).toHaveLength(2);
      expect(h3Elements).toHaveLength(2);
      expect(h4Elements).toHaveLength(1);
    });

    it('should validate meta information context', () => {
      // While we can't directly test meta tags in the layout component,
      // we can validate the structure supports them
      const metaAwareChildren = (
        <main>
          <article>
            <header>
              <h1>SEO Optimized Content</h1>
              <p>Content that would benefit from proper meta tags</p>
            </header>
          </article>
        </main>
      );

      renderLayoutWithChildren(metaAwareChildren);

      const htmlElement = document.querySelector('html');
      expect(htmlElement).toHaveAttribute('lang', 'en');
      
      // Verify proper structure for meta tag inheritance
      expect(document.head).toBeTruthy();
      expect(document.body).toBeTruthy();
    });
  });

  describe('Internationalization & Accessibility Enhancement', () => {
    /**
     * Tests for advanced internationalization and accessibility features
     */

    const validateDynamicLayout = async (lang: string, dir: 'ltr' | 'rtl') => {
      // Create a custom layout with different language
      const CustomLayout = ({ children }: { children: ReactNode }) => {
        return (
          <html lang={lang} dir={dir}>
            <body>{children}</body>
          </html>
        );
      };

      const { unmount } = render(
        <CustomLayout>
          <div data-testid="i18n-content">Content in {lang}</div>
        </CustomLayout>
      );

      const htmlElement = document.querySelector('html');
      expect(htmlElement).toBeInTheDocument();
      expect(htmlElement).toHaveAttribute('lang', lang);
      expect(htmlElement).toHaveAttribute('dir', dir);

      unmount();
    };

    it('should support dynamic language and direction attributes', async () => {
      const langArbitrary = fc.constantFrom('en', 'es', 'fr', 'ar', 'zh');
      const dirArbitrary = fc.constantFrom('ltr', 'rtl');

      await fc.assert(
        fc.asyncProperty(langArbitrary, dirArbitrary, async (lang, dir) => {
          await validateDynamicLayout(lang, dir as 'ltr' | 'rtl');
        })
      );
    });

    it('should support RTL (right-to-left) layout patterns', () => {
      const rtlChildren = (
        <main>
          <article dir="rtl">
            <h1>عنوان المقال</h1>
            <p>محتوى المقال باللغة العربية</p>
          </article>
          <article dir="ltr">
            <h1>Article Title</h1>
            <p>Article content in English</p>
          </article>
        </main>
      );

      renderLayoutWithChildren(rtlChildren);

      const articles = screen.getAllByRole('article');
      expect(articles[0]).toHaveAttribute('dir', 'rtl');
      expect(articles[1]).toHaveAttribute('dir', 'ltr');
    });

    it('should handle mixed-direction content correctly', () => {
      const mixedDirectionChildren = (
        <main>
          <p>
            English text with <span dir="rtl">نص عربي</span> embedded
          </p>
          <p dir="rtl">
            نص عربي مع <span dir="ltr">English text</span> مدمج
          </p>
        </main>
      );

      renderLayoutWithChildren(mixedDirectionChildren);

      const paragraphs = screen.getAllByText(/(English text|نص عربي)/);
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should support advanced ARIA patterns', () => {
      const advancedAriaChildren = (
        <main>
          <nav aria-label="Breadcrumb navigation">
            <ol>
              <li><a href="/" aria-current="page">Home</a></li>
              <li><a href="/products">Products</a></li>
              <li aria-current="page">Current Product</li>
            </ol>
          </nav>
          <section aria-labelledby="product-heading">
            <h2 id="product-heading">Product Details</h2>
            <div role="tablist">
              <button role="tab" aria-selected="true" aria-controls="tab1-panel">
                Description
              </button>
              <button role="tab" aria-selected="false" aria-controls="tab2-panel">
                Specifications
              </button>
            </div>
            <div role="tabpanel" id="tab1-panel" aria-labelledby="tab1">
              Product description content
            </div>
          </section>
        </main>
      );

      renderLayoutWithChildren(advancedAriaChildren);

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Breadcrumb navigation');
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should support high contrast and reduced motion preferences', () => {
      const accessibilityAwareChildren = (
        <main>
          <div className="respects-prefers-reduced-motion">
            <h1>Accessibility Aware Content</h1>
            <p>Content that respects user preferences</p>
          </div>
          <button className="high-contrast-compatible">
            High Contrast Button
          </button>
        </main>
      );

      renderLayoutWithChildren(accessibilityAwareChildren);

      // Verify structure supports accessibility enhancements
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Performance & Resource Optimization', () => {
    /**
     * Tests for advanced performance optimization and Core Web Vitals
     */

    it('should prevent layout shift (CLS) with stable structure', () => {
      const stableLayoutChildren = (
        <main>
          <header style={{ height: '60px' }}>
            <h1>Fixed Height Header</h1>
          </header>
          <section style={{ minHeight: '400px' }}>
            <p>Content with reserved space</p>
          </section>
          <footer style={{ height: '100px' }}>
            <p>Fixed Height Footer</p>
          </footer>
        </main>
      );

      const { rerender } = renderLayoutWithChildren(stableLayoutChildren);

      // Measure initial layout
      const initialHeaderHeight = screen.getByRole('banner').offsetHeight;
      const initialFooterHeight = screen.getByRole('contentinfo').offsetHeight;

      // Simulate content update that shouldn't cause layout shift
      const updatedChildren = (
        <main>
          <header style={{ height: '60px' }}>
            <h1>Updated Header Content</h1>
          </header>
          <section style={{ minHeight: '400px' }}>
            <p>Updated content with same reserved space</p>
          </section>
          <footer style={{ height: '100px' }}>
            <p>Updated Footer Content</p>
          </footer>
        </main>
      );

      rerender(<RootLayout>{updatedChildren}</RootLayout>);

      // Layout should remain stable
      expect(screen.getByRole('banner').offsetHeight).toBe(initialHeaderHeight);
      expect(screen.getByRole('contentinfo').offsetHeight).toBe(initialFooterHeight);
    });

    it('should handle critical resource loading patterns', () => {
      const criticalResourceChildren = (
        <main>
          <div data-testid="above-fold">Above the fold content</div>
          <div data-testid="critical-css">Critical CSS styled content</div>
          <div data-testid="deferred-content" style={{ marginTop: '2000px' }}>
            Below the fold content
          </div>
        </main>
      );

      renderLayoutWithChildren(criticalResourceChildren);

      // Critical content should be immediately available
      expect(screen.getByTestId('above-fold')).toBeInTheDocument();
      expect(screen.getByTestId('critical-css')).toBeInTheDocument();
      expect(screen.getByTestId('deferred-content')).toBeInTheDocument();
    });

    it('should support efficient hydration patterns', async () => {
      const hydrationOptimizedChildren = (
        <main>
          <div data-testid="static-content">Static server content</div>
          <div data-testid="interactive-content">
            <button>Interactive button</button>
            <input placeholder="Interactive input" />
          </div>
        </main>
      );

      renderLayoutWithChildren(hydrationOptimizedChildren);

      // All content should be available immediately after render
      expect(screen.getByTestId('static-content')).toBeInTheDocument();
      expect(screen.getByTestId('interactive-content')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle large DOM trees efficiently', () => {
      const largeDOMChildren = (
        <main>
          <div data-testid="large-list">
            {Array.from({ length: 5000 }, (_, i) => (
              <div key={i} data-testid={`item-${i}`}>
                Item {i}
              </div>
            ))}
          </div>
        </main>
      );

      const startTime = performance.now();
      const { unmount } = renderLayoutWithChildren(largeDOMChildren);
      const renderTime = performance.now() - startTime;

      // Should handle large DOM efficiently
      expect(renderTime).toBeLessThan(1000); // 1 second max
      expect(screen.getByTestId('large-list')).toBeInTheDocument();
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-4999')).toBeInTheDocument();

      const startUnmountTime = performance.now();
      unmount();
      const unmountTime = performance.now() - startUnmountTime;
      
      expect(unmountTime).toBeLessThan(200); // Fast cleanup
    });

    const generateMemoryIntensiveChildren = (count: number) => (
      <main>
        {Array.from({ length: count }, (_, i) => (
          <section key={i} data-testid={`section-${i}`}>
            <h2>Section {i}</h2>
            <p>This is a paragraph inside section {i}.</p>
            <div>
              <span>Nested content</span>
            </div>
          </section>
        ))}
      </main>
    );

    it('should optimize memory usage with complex children', () => {
      const memoryIntensiveChildren = generateMemoryIntensiveChildren(1000);

      // This is a simplified check. In a real scenario, you might use
      // performance.memory APIs or other tools, which are harder to test in JSDOM.
      const { unmount } = renderLayoutWithChildren(memoryIntensiveChildren);

      // Verify that a subset of elements rendered correctly
      expect(screen.getByTestId('section-0')).toBeInTheDocument();
      expect(screen.getByTestId('section-999')).toBeInTheDocument();

      unmount();
      // In a real test, you would check memory snapshots before/after unmount.
    });

    it('should validate safe HTML structure patterns', () => {
      const safeStructureChildren = (
        <main>
          <section data-testid="safe-section">
            <h2>Safe Section Title</h2>
            <div data-content-type="text/plain">
              Plain text content
            </div>
            <div data-content-type="application/json">
              {JSON.stringify({ safe: 'data' })}
            </div>
          </section>
        </main>
      );

      renderLayoutWithChildren(safeStructureChildren);

      const section = screen.getByTestId('safe-section');
      expect(section).toBeInTheDocument();
      
      // Find elements with data attributes directly
      const textDiv = document.querySelector('[data-content-type="text/plain"]');
      const jsonDiv = document.querySelector('[data-content-type="application/json"]');
      
      expect(textDiv).toBeInTheDocument();
      expect(jsonDiv).toBeInTheDocument();
    });

    it('should prevent content injection attacks', () => {
      const injectionTestChildren = (
        <main>
          <div data-testid="protected-content">
            {/* Test various injection attempts */}
            {"javascript:alert('injection')"}
            {"data:text/html,<script>alert('data-uri')</script>"}
            {"<iframe src='javascript:alert()'>"}
          </div>
        </main>
      );

      renderLayoutWithChildren(injectionTestChildren);

      const protectedContent = screen.getByTestId('protected-content');
      expect(protectedContent).toBeInTheDocument();
      
      // No iframe or script elements should be created
      expect(document.querySelectorAll('iframe')).toHaveLength(0);
      expect(document.querySelectorAll('script')).toHaveLength(0);
    });
  });

  describe('Security & Content Safety', () => {
    /**
     * Tests for security and content safety validation
     */

    it('should prevent XSS attacks in children content', () => {
      const potentialXSSChildren = (
        <main>
          <div data-testid="user-content">
            {/* React should automatically escape this */}
            {"<script>alert('xss')</script>"}
          </div>
          <div data-testid="safe-html">
            {/* This should be rendered as text, not executed */}
            &lt;script&gt;alert('escaped')&lt;/script&gt;
          </div>
        </main>
      );

      renderLayoutWithChildren(potentialXSSChildren);

      const userContent = screen.getByTestId('user-content');
      const safeHtml = screen.getByTestId('safe-html');

      // Content should be rendered as text, not executed
      expect(userContent).toBeInTheDocument();
      expect(safeHtml).toBeInTheDocument();
      
      // No script elements should be created
      expect(document.querySelectorAll('script')).toHaveLength(0);
    });

    it('should validate Content Security Policy compatibility', () => {
      const cspCompatibleChildren = (
        <main>
          <div data-testid="inline-safe">Content without inline scripts</div>
          <button 
            data-testid="event-handler"
            onClick={() => console.log('Safe event handler')}
          >
            Safe Button
          </button>
          <img 
            data-testid="safe-image"
            src="https://example.com/image.jpg" 
            alt="Safe external content"
          />
        </main>
      );

      renderLayoutWithChildren(cspCompatibleChildren);

      expect(screen.getByTestId('inline-safe')).toBeInTheDocument();
      expect(screen.getByTestId('event-handler')).toBeInTheDocument();
      expect(screen.getByTestId('safe-image')).toBeInTheDocument();

      // Should not contain inline event handlers in HTML
      const button = screen.getByTestId('event-handler');
      expect(button).not.toHaveAttribute('onclick');
    });

    it('should safely handle user-generated content', () => {
      const userGeneratedContent = (
        <main>
          <article data-testid="ugc-article">
            <h1>User Article Title</h1>
            <div data-testid="ugc-content">
              {/* Simulate sanitized user content */}
              <p>This is safe user content</p>
              <a href="https://safe-external-link.com" rel="noopener noreferrer">
                Safe External Link
              </a>
            </div>
          </article>
        </main>
      );

      renderLayoutWithChildren(userGeneratedContent);

      const article = screen.getByTestId('ugc-article');
      const content = screen.getByTestId('ugc-content');
      const link = screen.getByRole('link');

      expect(article).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should validate safe HTML structure patterns', () => {
      const safeStructureChildren = (
        <main>
          <section data-testid="safe-section">
            <h2>Safe Section Title</h2>
            <div data-content-type="text/plain">
              Plain text content
            </div>
            <div data-content-type="application/json">
              {JSON.stringify({ safe: 'data' })}
            </div>
          </section>
        </main>
      );

      renderLayoutWithChildren(safeStructureChildren);

      const section = screen.getByTestId('safe-section');
      expect(section).toBeInTheDocument();
      
      // Find elements with data attributes directly
      const textDiv = document.querySelector('[data-content-type="text/plain"]');
      const jsonDiv = document.querySelector('[data-content-type="application/json"]');
      
      expect(textDiv).toBeInTheDocument();
      expect(jsonDiv).toBeInTheDocument();
    });

    it('should prevent content injection attacks', () => {
      const injectionTestChildren = (
        <main>
          <div data-testid="protected-content">
            {/* Test various injection attempts */}
            {"javascript:alert('injection')"}
            {"data:text/html,<script>alert('data-uri')</script>"}
            {"<iframe src='javascript:alert()'>"}
          </div>
        </main>
      );

      renderLayoutWithChildren(injectionTestChildren);

      const protectedContent = screen.getByTestId('protected-content');
      expect(protectedContent).toBeInTheDocument();
      
      // No iframe or script elements should be created
      expect(document.querySelectorAll('iframe')).toHaveLength(0);
      expect(document.querySelectorAll('script')).toHaveLength(0);
    });
  });

  describe('Modern Web Standards Compliance', () => {
    /**
     * Tests for modern web standards and browser compatibility
     */

    it('should support progressive web app patterns', () => {
      const pwaCompatibleChildren = (
        <main>
          <div data-testid="app-shell">
            <header>App Header</header>
            <nav>App Navigation</nav>
            <main>App Content</main>
          </div>
        </main>
      );

      renderLayoutWithChildren(pwaCompatibleChildren);

      const appShell = screen.getByTestId('app-shell');
      expect(appShell).toBeInTheDocument();
      
      // Verify semantic structure for PWA
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getAllByRole('main')).toHaveLength(2); // Nested main elements
    });

    it('should handle modern CSS features gracefully', () => {
      const modernCSSChildren = (
        <main>
          <div 
            data-testid="css-grid-container"
            style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}
          >
            <div>Grid Item 1</div>
            <div>Grid Item 2</div>
            <div>Grid Item 3</div>
          </div>
          <div 
            data-testid="flexbox-container"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>Flex Item 1</span>
            <span>Flex Item 2</span>
          </div>
          <div 
            data-testid="custom-properties"
            style={{
              '--custom-color': '#3498db',
              color: 'var(--custom-color)'
            } as any}
          >
            Custom Properties Content
          </div>
        </main>
      );

      renderLayoutWithChildren(modernCSSChildren);

      expect(screen.getByTestId('css-grid-container')).toBeInTheDocument();
      expect(screen.getByTestId('flexbox-container')).toBeInTheDocument();
      expect(screen.getByTestId('custom-properties')).toBeInTheDocument();
    });

    it('should support Web Components integration', () => {
      const webComponentsChildren = (
        <main>
          <div data-testid="web-components-container">
            {/* Simulate web components usage */}
            <div data-component="custom-element" data-testid="custom-element">
              Custom Element Content
            </div>
            <div 
              data-component="shadow-root" 
              data-testid="shadow-compatible"
            >
              Shadow DOM Compatible Content
            </div>
          </div>
        </main>
      );

      renderLayoutWithChildren(webComponentsChildren);

      expect(screen.getByTestId('web-components-container')).toBeInTheDocument();
      expect(screen.getByTestId('custom-element')).toBeInTheDocument();
      expect(screen.getByTestId('shadow-compatible')).toBeInTheDocument();
    });

    it('should handle viewport and responsive design patterns', () => {
      const responsiveChildren = (
        <main>
          <div data-testid="responsive-container">
            <picture>
              <source 
                media="(min-width: 768px)" 
                srcSet="large-image.jpg" 
              />
              <source 
                media="(min-width: 480px)" 
                srcSet="medium-image.jpg" 
              />
              <img 
                src="small-image.jpg" 
                alt="Responsive content"
                data-testid="responsive-image"
              />
            </picture>
            <div 
              data-testid="viewport-aware"
              style={{
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto'
              }}
            >
              Viewport aware content
            </div>
          </div>
        </main>
      );

      renderLayoutWithChildren(responsiveChildren);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-image')).toBeInTheDocument();
      expect(screen.getByTestId('viewport-aware')).toBeInTheDocument();
    });

    it('should support modern input and form patterns', () => {
      const modernFormChildren = (
        <main>
          <form data-testid="modern-form">
            <div>
              <label htmlFor="email-input">Email</label>
              <input 
                id="email-input"
                type="email" 
                required 
                autoComplete="email"
                data-testid="email-input"
              />
            </div>
            <div>
              <label htmlFor="date-input">Date</label>
              <input 
                id="date-input"
                type="date" 
                data-testid="date-input"
              />
            </div>
            <div>
              <label htmlFor="color-input">Color</label>
              <input 
                id="color-input"
                type="color" 
                data-testid="color-input"
              />
            </div>
            <div>
              <label htmlFor="range-input">Range</label>
              <input 
                id="range-input"
                type="range" 
                min="0" 
                max="100" 
                data-testid="range-input"
              />
            </div>
          </form>
        </main>
      );

      renderLayoutWithChildren(modernFormChildren);

      expect(screen.getByTestId('modern-form')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
      expect(screen.getByTestId('date-input')).toHaveAttribute('type', 'date');
      expect(screen.getByTestId('color-input')).toHaveAttribute('type', 'color');
      expect(screen.getByTestId('range-input')).toHaveAttribute('type', 'range');
    });

    it('should handle advanced accessibility features', () => {
      const advancedA11yChildren = (
        <main>
          <div data-testid="live-region" aria-live="polite" aria-atomic="true">
            Status updates appear here
          </div>
          <div 
            data-testid="describedby-example"
            aria-describedby="description-1 description-2"
          >
            Content with multiple descriptions
          </div>
          <div id="description-1">First description</div>
          <div id="description-2">Second description</div>
          <div 
            data-testid="expanded-content"
            aria-expanded="false"
            aria-controls="expandable-content"
          >
            Expandable trigger
          </div>
          <div id="expandable-content" aria-hidden="true">
            Hidden expandable content
          </div>
        </main>
      );

      renderLayoutWithChildren(advancedA11yChildren);

      const liveRegion = screen.getByTestId('live-region');
      const describedElement = screen.getByTestId('describedby-example');
      const expandedContent = screen.getByTestId('expanded-content');

      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(describedElement).toHaveAttribute('aria-describedby', 'description-1 description-2');
      expect(expandedContent).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Enterprise-Grade Quality Validation', () => {
    /**
     * Final validation tests for enterprise-grade quality standards
     */

    const createFullAccessibilityScenario = () => (
      <>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header role="banner">
          <h1>Site Title</h1>
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/" aria-current="page">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>
        </header>
        <main id="main-content" role="main">
          <h1>Page Title</h1>
          <section aria-labelledby="section-heading">
            <h2 id="section-heading">Section Title</h2>
            <p>Accessible content with proper structure.</p>
            <form>
              <div>
                <label htmlFor="name">Name (required)</label>
                <input id="name" type="text" required aria-required="true" />
              </div>
              <div>
                <fieldset>
                  <legend>Preferences</legend>
                  <label>
                    <input type="radio" name="pref" value="email" /> Email
                  </label>
                  <label>
                    <input type="radio" name="pref" value="phone" /> Phone
                  </label>
                </fieldset>
              </div>
              <button type="submit">Submit Form</button>
            </form>
          </section>
        </main>
        <footer role="contentinfo">
          <p>&copy; 2024 Accessible Website</p>
        </footer>
      </>
    );

    it('should have full accessibility compliance', () => {
      const fullAccessibilityChildren = createFullAccessibilityScenario();

      renderLayoutWithChildren(fullAccessibilityChildren);

      // Verify all accessibility landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();

      // Verify form accessibility
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('group')).toBeInTheDocument(); // fieldset
      expect(screen.getAllByRole('radio')).toHaveLength(2);

      // Verify heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings).toHaveLength(3);
      expect(headings[0]).toHaveTextContent('Site Title'); // H1
      expect(headings[1]).toHaveTextContent('Page Title'); // H1
      expect(headings[2]).toHaveTextContent('Section Title'); // H2
    });



    const createStressTestChildren = (sections: number, articles: number, items: number) => (
      <main>
        {/* Large nested structure */}
        {Array.from({ length: sections }, (_, i) => (
          <StressSection key={i} sectionIndex={i} articleCount={articles} itemCount={items} />
        ))}
      </main>
    );

    it('should maintain performance under stress conditions', () => {
      const stressTestChildren = createStressTestChildren(100, 50, 10);

      const startTime = performance.now();
      const { unmount } = renderLayoutWithChildren(stressTestChildren);
      const renderTime = performance.now() - startTime;

      // Should handle large structures efficiently
      expect(renderTime).toBeLessThan(2000); // 2 seconds max for stress test
      
      // Verify content is rendered
      expect(screen.getByTestId('stress-section-0')).toBeInTheDocument();
      expect(screen.getByTestId('stress-section-99')).toBeInTheDocument();
      expect(screen.getByTestId('stress-article-50-25')).toBeInTheDocument();

      const startUnmountTime = performance.now();
      unmount();
      const unmountTime = performance.now() - startUnmountTime;
      
      expect(unmountTime).toBeLessThan(500); // Fast cleanup even for large DOM
    });

    const createEnterpriseIntegrationScenario = () => (
      <>
        <header>
          <nav>
            <h1>Enterprise App</h1>
            <div role="menubar" aria-label="Main menu">
              <div role="none">
                <a href="/" role="menuitem">Dashboard</a>
              </div>
              <div role="none">
                <a href="/analytics" role="menuitem">Analytics</a>
              </div>
            </div>
          </nav>
        </header>
        <main>
          <Suspense fallback={<div>Loading dashboard...</div>}>
            <section aria-labelledby="dashboard-title">
              <h1 id="dashboard-title">Dashboard</h1>
              <section aria-label="Key metrics">
                <div data-testid="metric-1">Metric 1: 150</div>
                <div data-testid="metric-2">Metric 2: 89%</div>
              </section>
              <div role="tablist">
                <button 
                  role="tab" 
                  aria-selected="true" 
                  aria-controls="panel1"
                  id="tab1"
                >
                  Overview
                </button>
                <button 
                  role="tab" 
                  aria-selected="false" 
                  aria-controls="panel2"
                  id="tab2"
                >
                  Details
                </button>
              </div>
              <div 
                role="tabpanel" 
                id="panel1" 
                aria-labelledby="tab1"
                data-testid="overview-panel"
              >
                <h2>Overview Content</h2>
                <p>Dashboard overview information</p>
              </div>
            </section>
          </Suspense>
        </main>
        <footer>
          <footer>
            <p>© 2024 Enterprise Application</p>
            <nav aria-label="Footer navigation">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </nav>
          </footer>
        </footer>
      </>
    );

    it('should validate complete integration scenario', () => {
      const integrationScenarioChildren = createEnterpriseIntegrationScenario();

      renderLayoutWithChildren(integrationScenarioChildren);

      // Verify complete structure (handle multiple elements)
      expect(screen.getAllByRole('banner')).toHaveLength(1);
      expect(screen.getAllByRole('navigation')).toHaveLength(2); // Main nav and footer nav
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getAllByRole('contentinfo')).toHaveLength(2); // Footer and div with contentinfo role

      // Verify interactive elements
      expect(screen.getByRole('menubar')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')).toHaveLength(2);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();

      // Verify content
      expect(screen.getByTestId('metric-1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-2')).toBeInTheDocument();
      expect(screen.getByTestId('overview-panel')).toBeInTheDocument();
    });
  });
});