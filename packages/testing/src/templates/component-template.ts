/**
 * SPDX-License-Identifier: MIT
 */

import type { ComponentTestOptions, TestTemplate } from './types.js';

/**
 * Template for React component tests
 */
export const componentTestTemplate: TestTemplate = {
  name: 'Component Test',
  description:
    'Template for testing React components with accessibility and interaction patterns',

  generate: (options: ComponentTestOptions) => {
    const {
      componentName,
      componentPath,
      hasProps = true,
      hasEvents = false,
      hasAsyncBehavior = false,
      hasAccessibility = true,
      testAsyncLoading = false,
      testErrorStates = false,
    } = options;

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DesignSystemProvider } from '@repo/design-system/providers';
import { ${componentName} } from '${componentPath}';
import type { ${componentName}Props } from '${componentPath}';

// Mock external dependencies if needed
${
  hasAsyncBehavior
    ? `const mockAsyncFunction = vi.fn();
vi.mock('../lib/async-operations.js', () => ({
  performAsyncOperation: mockAsyncFunction,
}));`
    : ''
}

describe('${componentName}', () => {
  const defaultProps: ${componentName}Props = {
    ${
      hasProps
        ? `// Add default props here
    title: 'Test Title',
    onClick: vi.fn(),`
        : '// Component has no props'
    }
  };

  const renderComponent = (props: Partial<${componentName}Props> = {}) => {
    return render(
      <DesignSystemProvider>
        <${componentName} {...defaultProps} {...props} />
      </DesignSystemProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ${hasAsyncBehavior ? 'mockAsyncFunction.mockResolvedValue({ success: true });' : ''}
  });

  describe('Rendering', () => {
    it('should render correctly with default props', () => {
      renderComponent();
      
      ${hasProps ? `expect(screen.getByText('Test Title')).toBeInTheDocument();` : `expect(screen.getByRole('${componentName.toLowerCase()}')).toBeInTheDocument();`}
    });

    ${
      hasProps
        ? `it('should render with custom props', () => {
      renderComponent({ title: 'Custom Title' });
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });`
        : ''
    }

    it('should apply correct CSS classes', () => {
      renderComponent();
      
      const element = screen.getByRole('${componentName.toLowerCase()}');
      expect(element).toHaveClass('expected-class');
    });
  });

  ${
    hasEvents
      ? `describe('User Interactions', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderComponent({ onClick: handleClick });
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderComponent({ onClick: handleClick });
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });`
      : ''
  }

  ${
    hasAccessibility
      ? `describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderComponent();
      
      const element = screen.getByRole('${componentName.toLowerCase()}');
      expect(element).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      renderComponent();
      
      const element = screen.getByRole('${componentName.toLowerCase()}');
      expect(element).toHaveAttribute('tabIndex', '0');
    });

    it('should have adequate color contrast', () => {
      // This would typically use axe-core or similar accessibility testing tools
      renderComponent();
      
      const element = screen.getByRole('${componentName.toLowerCase()}');
      expect(element).toBeVisible();
    });
  });`
      : ''
  }

  ${
    hasAsyncBehavior
      ? `describe('Async Behavior', () => {
    ${
      testAsyncLoading
        ? `it('should show loading state during async operations', async () => {
      mockAsyncFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      renderComponent();
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });`
        : ''
    }

    ${
      testErrorStates
        ? `it('should handle async errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAsyncFunction.mockRejectedValue(new Error('Async operation failed'));
      
      renderComponent();
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
      });
      
      consoleError.mockRestore();
    });`
        : ''
    }
  });`
      : ''
  }

  describe('Edge Cases', () => {
    it('should handle empty props gracefully', () => {
      renderComponent({});
      
      expect(screen.getByRole('${componentName.toLowerCase()}')).toBeInTheDocument();
    });

    ${
      hasProps
        ? `it('should handle null/undefined props', () => {
      renderComponent({ title: undefined });
      
      expect(screen.getByRole('${componentName.toLowerCase()}')).toBeInTheDocument();
    });`
        : ''
    }
  });

  describe('Integration', () => {
    it('should integrate properly with design system', () => {
      renderComponent();
      
      const element = screen.getByRole('${componentName.toLowerCase()}');
      expect(element).toHaveClass('design-system-component');
    });
  });
});`;
  },
};
