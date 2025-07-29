/**
 * SPDX-License-Identifier: MIT
 * 
 * Basic infrastructure test to verify CMS test setup is working correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock basehub dependencies
vi.mock('basehub/react-rich-text', () => ({
  RichText: ({ content, components, children, ...props }: any) => (
    <div 
      data-testid="rich-text-content" 
      data-has-components={!!components}
      {...props}
    >
      {children || JSON.stringify(content)}
    </div>
  ),
}));

vi.mock('basehub/next-image', () => ({
  BaseHubImage: ({ src, alt, width, height, blurDataURL, ...props }: any) => (
    <img
      data-testid="basehub-image"
      src={src}
      alt={alt}
      width={width}
      height={height}
      data-blur-url={blurDataURL}
      data-security-validated="true"
      {...props}
    />
  ),
}));

vi.mock('basehub/react-code-block', () => ({
  CodeBlock: ({ code, language, ...props }: any) => (
    <pre 
      data-testid="code-block"
      data-language={language}
      {...props}
    >
      <code>{code}</code>
    </pre>
  ),
}));

// Import CMS components
import { Body } from '../components/body';
import { Image } from '../components/image';
import { TableOfContents } from '../components/toc';
import { Feed } from '../components/feed';
import { Toolbar } from '../components/toolbar';
import { CodeBlock } from '../components/code-block';

describe('CMS Test Infrastructure', () => {
  it('should render a simple React component', () => {
    const TestComponent = () => <div data-testid="test">Infrastructure works!</div>;
    render(<TestComponent />);
    expect(screen.getByTestId('test')).toHaveTextContent('Infrastructure works!');
  });

  it('should be able to import and render Body component', () => {
    // Simple test to verify Body component can be imported and basic props work
    expect(() => {
      render(<Body content={null} />);
    }).not.toThrow();
  });

  it('should be able to import and render Image component', () => {
    // Simple test to verify Image component can be imported
    expect(() => {
      render(<Image src="test.jpg" alt="test" width={100} height={100} />);
    }).not.toThrow();
  });

  it('should be able to import and render TableOfContents component', () => {
    // Simple test to verify TableOfContents component can be imported
    expect(() => {
      render(<TableOfContents data={null} />);
    }).not.toThrow();
  });

  it('should be able to import and render Feed component', () => {
    // Simple test to verify Feed component can be imported
    render(<Feed><div data-testid="feed-content">Test feed</div></Feed>);
    expect(screen.getByTestId('feed-content')).toHaveTextContent('Test feed');
  });

  it('should be able to import and render Toolbar component', () => {
    // Simple test to verify Toolbar component can be imported
    render(<Toolbar><button>Test toolbar</button></Toolbar>);
    expect(screen.getByText('Test toolbar')).toBeInTheDocument();
  });

  it('should be able to import and render CodeBlock component', () => {
    // Simple test to verify CodeBlock component can be imported
    expect(() => {
      render(<CodeBlock />);
    }).not.toThrow();
  });

  it('should have jest-dom matchers available', () => {
    const TestComponent = () => <div>Testing matchers</div>;
    render(<TestComponent />);
    const element = screen.getByText('Testing matchers');
    
    // These matchers come from @testing-library/jest-dom
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Testing matchers');
  });
});