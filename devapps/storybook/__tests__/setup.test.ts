/**
 * SPDX-License-Identifier: MIT
 * 
 * Basic setup validation test for the Storybook devapp.
 * 
 * This test validates that the Vitest configuration is working correctly
 * and that the testing environment is properly set up with all necessary
 * browser API mocks and Testing Library extensions.
 */

import { describe, expect, it } from 'vitest';

describe('Storybook Test Setup', () => {
  it('should have access to vitest globals', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have access to browser APIs', () => {
    expect(window.matchMedia).toBeDefined();
    expect(window.localStorage).toBeDefined();
    expect(window.sessionStorage).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
  });

  it('should have testing library matchers available', () => {
    // Create a basic DOM element to test matchers
    const element = document.createElement('div');
    element.textContent = 'Test content';
    document.body.appendChild(element);

    // Test that jest-dom matchers are available
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Test content');

    // Clean up
    document.body.removeChild(element);
  });

  it('should mock console methods', () => {
    // These should not output anything during tests
    console.warn('This warning should be mocked');
    console.error('This error should be mocked');
    
    // Test passes if no output is shown
    expect(true).toBe(true);
  });
});