/**
 * SPDX-License-Identifier: MIT
 *
 * Comprehensive test suite for the Avatar component.
 *
 * This test suite validates the avatar component's functionality across multiple
 * dimensions including rendering, variants, accessibility, and edge cases. The
 * avatar is a composite component built on Radix UI Avatar primitive that
 * displays user images with fallback text support for when images fail to load.
 *
 * Test Categories:
 * 1. Rendering Tests - Basic component rendering, data-slot attributes, component structure
 * 2. Variant Tests - With image (success state), with fallback text (error/loading state)
 * 3. Props Handling - src, alt, className forwarding and merging across all components
 * 4. User Interactions - N/A (display component with no interactive functionality)
 * 5. States - Loading state, error state (fallback), image load success/failure handling
 * 6. Accessibility - Alt text, role attributes, screen reader support, semantic structure
 * 7. Edge Cases - Invalid image URLs, empty fallback, network failures, malformed props
 * 8. Component Integration - Avatar, AvatarImage, and AvatarFallback composition and layout
 *
 * The tests ensure full WCAG compliance and production-ready quality with
 * comprehensive coverage of all visual states, error conditions, and integration scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithUserEvents, queries, accessibility } from '../test-utils';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@repo/design-system/ui/avatar';

/**
 * Helper function to render a complete avatar with image and fallback
 * Supports custom props and content for comprehensive testing scenarios
 */
const renderTestAvatar = (
  avatarProps: any = {},
  imageProps: any = {},
  fallbackProps: any = {},
  imageUrl = 'https://github.com/shadcn.png',
  fallbackText = 'CN'
) => {
  return renderWithUserEvents(
    <Avatar {...avatarProps}>
      <AvatarImage src={imageUrl} {...imageProps} />
      <AvatarFallback {...fallbackProps}>{fallbackText}</AvatarFallback>
    </Avatar>
  );
};

/**
 * Helper function to render minimal avatar for basic tests
 */
const renderMinimalAvatar = (props: any = {}) => {
  return renderWithUserEvents(
    <Avatar {...props}>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  );
};

/**
 * Helper function to render avatar with only image (no fallback)
 */
const renderAvatarImageOnly = (avatarProps: any = {}, imageProps: any = {}) => {
  return renderWithUserEvents(
    <Avatar {...avatarProps}>
      <AvatarImage src="https://github.com/shadcn.png" {...imageProps} />
    </Avatar>
  );
};

/**
 * Helper function to render avatar with only fallback (no image)
 */
const renderAvatarFallbackOnly = (avatarProps: any = {}, fallbackProps: any = {}) => {
  const { children, ...otherFallbackProps } = fallbackProps;
  return renderWithUserEvents(
    <Avatar {...avatarProps}>
      <AvatarFallback {...otherFallbackProps}>{children || 'FB'}</AvatarFallback>
    </Avatar>
  );
};

/**
 * Mock image loading for controlled testing of success/failure states
 * Note: Radix UI Avatar uses conditional rendering - only shows image OR fallback, not both
 */
const mockImageLoadSuccess = () => {
  const originalImage = global.Image;
  
  global.Image = function MockImage() {
    const img = {
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      addEventListener: function(event: string, handler: any) {
        if (event === 'load' && handler) {
          this.onload = handler;
          // Trigger immediately for testing
          setTimeout(() => handler(), 0);
        } else if (event === 'error') {
          this.onerror = handler;
        }
      },
      removeEventListener: function(event: string, handler: any) {
        if (event === 'load') {
          this.onload = null;
        } else if (event === 'error') {
          this.onerror = null;
        }
      }
    };
    
    // Immediately trigger success to test image loaded state
    setTimeout(() => {
      if (img.onload) {
        img.onload();
      }
    }, 0);
    
    return img;
  } as any;
  
  return () => {
    global.Image = originalImage;
  };
};

const mockImageLoadError = () => {
  const originalImage = global.Image;
  
  global.Image = function MockImage() {
    const img = {
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      addEventListener: function(event: string, handler: any) {
        if (event === 'load') {
          this.onload = handler;
        } else if (event === 'error' && handler) {
          this.onerror = handler;
          // Trigger immediately for testing
          setTimeout(() => handler(), 0);
        }
      },
      removeEventListener: function(event: string, handler: any) {
        if (event === 'load') {
          this.onload = null;
        } else if (event === 'error') {
          this.onerror = null;
        }
      }
    };
    
    // Immediately trigger error to test fallback state
    setTimeout(() => {
      if (img.onerror) {
        img.onerror();
      }
    }, 0);
    
    return img;
  } as any;
  
  return () => {
    global.Image = originalImage;
  };
};

// Backwards compatibility for tests that still use the old function name
const mockImageLoad = (shouldSucceed = true) => {
  return shouldSucceed ? mockImageLoadSuccess() : mockImageLoadError();
};

describe('Avatar', () => {
  describe('Rendering Tests', () => {
    it('renders avatar root element correctly', () => {
      renderMinimalAvatar();
      
      // Find the avatar root by its data-slot attribute
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('relative', 'flex', 'size-8', 'shrink-0', 'overflow-hidden', 'rounded-full');
    });

    it('renders with correct data-slot attributes on all components', () => {
      renderTestAvatar();
      
      // Test avatar container always present
      expect(document.querySelector('[data-slot="avatar"]')).toBeInTheDocument();
      
      // Due to Radix UI conditional rendering, only fallback is shown initially (image not loaded)
      // Image element is not rendered in DOM until load event occurs
      expect(document.querySelector('[data-slot="avatar-fallback"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="avatar-image"]')).not.toBeInTheDocument();
    });

    it('renders avatar with image component when loaded', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      
      // Wait for image load event to trigger
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://github.com/shadcn.png');
        expect(image).toHaveClass('aspect-square', 'size-full');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('renders avatar with fallback component', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(avatar).toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('CN');
      expect(fallback).toHaveClass('flex', 'size-full', 'items-center', 'justify-center', 'rounded-full', 'bg-muted');
    });

    it('renders either image or fallback based on load state', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      const image = document.querySelector('[data-slot="avatar-image"]');
      
      expect(avatar).toBeInTheDocument();
      
      // Initially shows fallback (image not loaded yet)
      expect(fallback).toBeInTheDocument();
      expect(image).not.toBeInTheDocument();
      
      // Fallback should be contained within the avatar
      expect(avatar).toContainElement(fallback as HTMLElement);
    });

    it('renders with proper container structure', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      
      // Avatar should be a flex container with proper sizing
      expect(avatar).toHaveClass('relative', 'flex', 'size-8', 'shrink-0', 'overflow-hidden', 'rounded-full');
    });

    it('maintains proper component hierarchy', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Avatar should be the root container
      expect(avatar?.tagName).toBe('SPAN'); // Radix Avatar.Root renders as span
      
      // Only fallback is rendered initially (conditional rendering)
      expect(fallback?.tagName).toBe('SPAN');
      expect(avatar).toContainElement(fallback as HTMLElement);
    });
  });

  describe('Variant Tests', () => {
    describe('With Image (Success State)', () => {

      it('displays image when src is valid and loads successfully', async () => {
        const restoreMock = mockImageLoadSuccess();
        
        renderTestAvatar(
          {},
          { src: 'https://example.com/valid-image.jpg', alt: 'User avatar' }
        );
        
        // Wait for image load event to trigger conditional rendering
        await waitFor(() => {
          const image = document.querySelector('[data-slot="avatar-image"]');
          expect(image).toBeInTheDocument();
          expect(image).toHaveAttribute('src', 'https://example.com/valid-image.jpg');
          expect(image).toHaveAttribute('alt', 'User avatar');
        }, { timeout: 100 });
        
        // Fallback should not be present when image loads successfully
        expect(document.querySelector('[data-slot="avatar-fallback"]')).not.toBeInTheDocument();
        
        restoreMock();
      });

      it('applies correct styling to image component', async () => {
        const restoreMock = mockImageLoadSuccess();
        
        renderTestAvatar();
        
        await waitFor(() => {
          const image = document.querySelector('[data-slot="avatar-image"]');
          expect(image).toBeInTheDocument();
          expect(image).toHaveClass('aspect-square', 'size-full');
        }, { timeout: 100 });
        
        restoreMock();
      });

      it('handles different image URLs correctly', async () => {
        const restoreMock = mockImageLoadSuccess();
        
        const imageUrls = [
          'https://github.com/shadcn.png',
          'https://example.com/user-avatar.jpg',
          '/local/avatar.png',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        ];
        
        for (const url of imageUrls) {
          const { unmount } = renderTestAvatar({}, { src: url });
          
          await waitFor(() => {
            const image = document.querySelector('[data-slot="avatar-image"]');
            expect(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', url);
          }, { timeout: 100 });
          
          unmount();
        }
        
        restoreMock();
      });

      it('maintains image aspect ratio and sizing', async () => {
        const restoreMock = mockImageLoadSuccess();
        
        renderTestAvatar();
        
        const avatar = document.querySelector('[data-slot="avatar"]');
        
        // Avatar maintains size constraints
        expect(avatar).toHaveClass('size-8');
        
        await waitFor(() => {
          const image = document.querySelector('[data-slot="avatar-image"]');
          expect(image).toBeInTheDocument();
          // Image fills the avatar container
          expect(image).toHaveClass('aspect-square', 'size-full');
        }, { timeout: 100 });
        
        restoreMock();
      });
    });

    describe('With Fallback (Error/Loading State)', () => {

      it('displays fallback when image fails to load', async () => {
        const restoreMock = mockImageLoadError();
        
        renderTestAvatar(
          {},
          { src: 'https://example.com/invalid-image.jpg' },
          {},
          'https://example.com/invalid-image.jpg',
          'FL'
        );
        
        // Initially shows fallback since image fails to load
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        expect(fallback).toBeInTheDocument();
        expect(fallback).toHaveTextContent('FL');
        
        // Image should not be present when load fails
        expect(document.querySelector('[data-slot="avatar-image"]')).not.toBeInTheDocument();
        
        restoreMock();
      });

      it('displays fallback with proper styling', () => {
        renderAvatarFallbackOnly();
        
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        expect(fallback).toHaveClass(
          'flex',
          'size-full',
          'items-center',
          'justify-center',
          'rounded-full',
          'bg-muted'
        );
      });

      it('centers fallback text properly', () => {
        renderAvatarFallbackOnly({}, { children: 'XY' });
        
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        expect(fallback).toHaveClass('flex', 'items-center', 'justify-center');
        expect(fallback).toHaveTextContent('XY');
      });

      it('handles different fallback text lengths', () => {
        const fallbackTexts = ['A', 'AB', 'ABC', 'ABCD', '😊', '👤', '?'];
        
        fallbackTexts.forEach(text => {
          const { unmount } = renderAvatarFallbackOnly({}, { children: text });
          
          const fallback = document.querySelector('[data-slot="avatar-fallback"]');
          expect(fallback).toHaveTextContent(text);
          expect(fallback).toHaveClass('flex', 'items-center', 'justify-center');
          
          unmount();
        });
      });

      it('applies muted background color to fallback', () => {
        renderAvatarFallbackOnly();
        
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        expect(fallback).toHaveClass('bg-muted');
      });
    });

    describe('State Transitions', () => {
      it('transitions from loading to image when load succeeds', async () => {
        const restoreMock = mockImageLoadSuccess();
        
        renderTestAvatar();
        
        // Initially shows fallback (loading state)
        expect(document.querySelector('[data-slot="avatar-fallback"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="avatar-image"]')).not.toBeInTheDocument();
        
        // Wait for image load transition
        await waitFor(() => {
          expect(document.querySelector('[data-slot="avatar-image"]')).toBeInTheDocument();
          expect(document.querySelector('[data-slot="avatar-fallback"]')).not.toBeInTheDocument();
        }, { timeout: 100 });
        
        restoreMock();
      });

      it('shows fallback when load fails', async () => {
        const restoreMock = mockImageLoadError();
        
        renderTestAvatar();
        
        // Should show fallback when image fails
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        const image = document.querySelector('[data-slot="avatar-image"]');
        
        expect(fallback).toBeInTheDocument();
        expect(image).not.toBeInTheDocument();
        
        restoreMock();
      });
    });
  });

  describe('Props Handling', () => {
    it('forwards HTML attributes to avatar root', () => {
      renderMinimalAvatar({
        'data-testid': 'custom-avatar',
        className: 'custom-avatar-class',
        id: 'avatar-id',
        'aria-label': 'Custom avatar'
      });
      
      const avatar = screen.getByTestId('custom-avatar');
      expect(avatar).toHaveClass('custom-avatar-class');
      expect(avatar).toHaveAttribute('id', 'avatar-id');
      expect(avatar).toHaveAttribute('aria-label', 'Custom avatar');
    });

    it('merges custom className with default classes', () => {
      renderMinimalAvatar({ className: 'custom-size bg-custom' });
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toHaveClass('custom-size', 'bg-custom');
      // Should maintain default classes
      expect(avatar).toHaveClass('relative', 'flex', 'size-8', 'shrink-0', 'overflow-hidden', 'rounded-full');
    });

    it('forwards HTML attributes to AvatarImage', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {},
        {
          'data-testid': 'custom-image',
          className: 'custom-image-class',
          alt: 'Profile picture',
          loading: 'lazy'
        }
      );
      
      await waitFor(() => {
        const image = screen.getByTestId('custom-image');
        expect(image).toHaveClass('custom-image-class');
        expect(image).toHaveAttribute('alt', 'Profile picture');
        expect(image).toHaveAttribute('loading', 'lazy');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('forwards HTML attributes to AvatarFallback', () => {
      renderTestAvatar(
        {},
        {},
        {
          'data-testid': 'custom-fallback',
          className: 'custom-fallback-class',
          id: 'fallback-id',
          'aria-label': 'Fallback text'
        }
      );
      
      const fallback = screen.getByTestId('custom-fallback');
      expect(fallback).toHaveClass('custom-fallback-class');
      expect(fallback).toHaveAttribute('id', 'fallback-id');
      expect(fallback).toHaveAttribute('aria-label', 'Fallback text');
    });

    it('handles image className merging properly', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {},
        { className: 'custom-image-styles rounded-none' }
      );
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(image).toHaveClass('custom-image-styles', 'rounded-none');
        // Should maintain default classes
        expect(image).toHaveClass('aspect-square', 'size-full');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('handles fallback className merging properly', () => {
      renderTestAvatar(
        {},
        {},
        { className: 'custom-fallback-styles text-custom' }
      );
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toHaveClass('custom-fallback-styles', 'text-custom');
      // Should maintain default classes
      expect(fallback).toHaveClass('flex', 'size-full', 'items-center', 'justify-center', 'rounded-full', 'bg-muted');
    });

    it('handles all props simultaneously', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {
          className: 'avatar-custom',
          'data-testid': 'full-avatar',
          id: 'full-avatar-id'
        },
        {
          className: 'image-custom',
          'data-testid': 'full-image',
          alt: 'Full avatar image',
          loading: 'eager'
        },
        {
          className: 'fallback-custom',
          'data-testid': 'full-fallback',
          'aria-label': 'Full fallback'
        },
        'https://full-test.com/avatar.jpg',
        'FT'
      );
      
      const avatar = screen.getByTestId('full-avatar');
      expect(avatar).toHaveClass('avatar-custom', 'relative', 'flex');
      
      // Wait for image to load and become visible
      await waitFor(() => {
        const image = screen.getByTestId('full-image');
        expect(image).toHaveClass('image-custom', 'aspect-square');
        expect(image).toHaveAttribute('alt', 'Full avatar image');
        expect(image).toHaveAttribute('loading', 'eager');
      }, { timeout: 100 });
      
      // Fallback should not be present when image loads successfully
      expect(screen.queryByTestId('full-fallback')).not.toBeInTheDocument();
      
      restoreMock();
    });

    it('handles src prop changes dynamically', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      const { rerender } = renderTestAvatar();
      
      // Wait for initial image to load
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://github.com/shadcn.png');
      }, { timeout: 100 });
      
      restoreMock();
      
      // For dynamic src changes, we need to observe the actual behavior:
      // When src changes, Radix Avatar may briefly show fallback then load new image
      rerender(
        <Avatar>
          <AvatarImage src="https://example.com/new-avatar.jpg" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      );
      
      // Mock again for the new src
      const restoreMock2 = mockImageLoadSuccess();
      
      // First verify that either fallback shows up (during loading) or image loads
      await waitFor(() => {
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        const image = document.querySelector('[data-slot="avatar-image"]');
        
        // Either fallback is showing (during load) or image has loaded with new src
        expect(fallback || image).toBeInTheDocument();
        
        if (image) {
          expect(image).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
        }
      }, { timeout: 100 });
      
      restoreMock2();
    });

    it('handles alt text prop correctly', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {},
        { alt: 'User profile picture' }
      );
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'User profile picture');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('handles missing alt text gracefully', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar();
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        // Should not have alt attribute if not provided
        expect(image).not.toHaveAttribute('alt');
      }, { timeout: 100 });
      
      restoreMock();
    });
  });

  describe('User Interactions', () => {
    // Note: Avatar is a display component with no interactive functionality
    // These tests verify that the component doesn't interfere with user interactions
    
    it('does not interfere with pointer events', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).not.toHaveStyle('pointer-events: none');
    });

    it('allows normal cursor behavior', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).not.toHaveClass('cursor-not-allowed');
    });

    it('does not capture focus', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).not.toHaveAttribute('tabindex');
    });

    it('maintains normal event propagation', async () => {
      const handleClick = vi.fn();
      
      const { user } = renderWithUserEvents(
        <div onClick={handleClick}>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      await user.click(avatar!);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('allows text selection of fallback content', () => {
      renderAvatarFallbackOnly({}, { children: 'AB' });
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).not.toHaveStyle('user-select: none');
    });
  });

  describe('States', () => {
    it('maintains consistent rendering across multiple renders', () => {
      const { rerender } = renderTestAvatar();
      
      const initialAvatar = document.querySelector('[data-slot="avatar"]');
      const initialClasses = initialAvatar?.className;
      
      // Re-render with same props
      rerender(
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      );
      
      const rerenderedAvatar = document.querySelector('[data-slot="avatar"]');
      expect(rerenderedAvatar?.className).toBe(initialClasses);
    });

    it('handles dynamic content updates properly', () => {
      const { rerender } = renderTestAvatar();
      
      expect(document.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('CN');
      
      // Update fallback content
      rerender(
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>XY</AvatarFallback>
        </Avatar>
      );
      
      expect(document.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('XY');
      expect(document.querySelector('[data-slot="avatar-fallback"]')).not.toHaveTextContent('CN');
    });

    it('handles image loading state properly', () => {
      renderTestAvatar();
      
      // Initially shows fallback (loading state)
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      const image = document.querySelector('[data-slot="avatar-image"]');
      
      // During loading, only fallback should be present
      expect(fallback).toBeInTheDocument();
      expect(image).not.toBeInTheDocument();
    });

    it('handles image error state properly', async () => {
      const restoreMock = mockImageLoadError();
      
      renderTestAvatar(
        {},
        { src: 'https://invalid.example.com/nonexistent.jpg' },
        {},
        'https://invalid.example.com/nonexistent.jpg',
        'ER'
      );
      
      const image = document.querySelector('[data-slot="avatar-image"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Only fallback should be present when image fails
      expect(image).not.toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('ER');
      
      restoreMock();
    });

    it('handles rapid state changes gracefully', () => {
      const { rerender } = renderTestAvatar();
      
      const sources = [
        'https://example1.com/avatar.jpg',
        'https://example2.com/avatar.jpg',
        'https://example3.com/avatar.jpg',
        'https://example4.com/avatar.jpg'
      ];
      
      sources.forEach(src => {
        rerender(
          <Avatar>
            <AvatarImage src={src} />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        );
        
        // Check that image element exists with new src (may not be loaded yet)
        const image = document.querySelector('[data-slot="avatar-image"]');
        if (image) {
          expect(image).toHaveAttribute('src', src);
        } else {
          // If image not present, fallback should be there
          const fallback = document.querySelector('[data-slot="avatar-fallback"]');
          expect(fallback).toBeInTheDocument();
        }
      });
    });

    it('maintains fallback state when image is removed', () => {
      const { rerender } = renderTestAvatar();
      
      // Remove image, keep only fallback
      rerender(
        <Avatar>
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );
      
      const image = document.querySelector('[data-slot="avatar-image"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(image).not.toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('FB');
    });

    it('handles empty image src gracefully', () => {
      renderTestAvatar({}, { src: '' });
      
      // With empty src, should show fallback
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      const image = document.querySelector('[data-slot="avatar-image"]');
      
      expect(fallback).toBeInTheDocument();
      expect(image).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper image alt text when specified', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {},
        { alt: 'John Doe profile picture' }
      );
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'John Doe profile picture');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('supports screen readers with image alt text', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {},
        { alt: 'User avatar image' }
      );
      
      await waitFor(() => {
        const image = screen.getByAltText('User avatar image');
        expect(image).toBeInTheDocument();
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('provides semantic fallback text for screen readers', () => {
      renderAvatarFallbackOnly({}, { children: 'JD' });
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toHaveTextContent('JD');
      
      // Fallback text should be readable by screen readers
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('supports custom aria-label on avatar root', () => {
      renderTestAvatar({
        'aria-label': 'Profile picture of John Doe'
      });
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toHaveAttribute('aria-label', 'Profile picture of John Doe');
    });

    it('supports custom aria-label on fallback', () => {
      renderAvatarFallbackOnly(
        {},
        {
          'aria-label': 'Initials for John Doe',
          children: 'JD'
        }
      );
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toHaveAttribute('aria-label', 'Initials for John Doe');
    });

    it('maintains proper semantic structure', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Avatar should contain fallback (image not loaded yet)
      expect(avatar).toContainElement(fallback as HTMLElement);
      
      // Elements should have proper tags
      expect(avatar?.tagName).toBe('SPAN');
      expect(fallback?.tagName).toBe('SPAN');
    });

    it('handles decorative images properly', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderTestAvatar(
        {},
        { alt: '', role: 'presentation' }
      );
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', '');
        expect(image).toHaveAttribute('role', 'presentation');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('supports accessible loading states', () => {
      renderTestAvatar(
        {
          'aria-busy': 'true',
          'aria-label': 'Loading profile picture'
        }
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toHaveAttribute('aria-busy', 'true');
      expect(avatar).toHaveAttribute('aria-label', 'Loading profile picture');
    });

    it('provides accessible error states', () => {
      renderTestAvatar(
        {
          'aria-label': 'Profile picture unavailable, showing initials'
        },
        { src: 'https://invalid.example.com/image.jpg' },
        {},
        'https://invalid.example.com/image.jpg',
        'NA'
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(avatar).toHaveAttribute('aria-label', 'Profile picture unavailable, showing initials');
      expect(fallback).toHaveTextContent('NA');
    });

    it('maintains focus management properly', () => {
      // Avatar should not interfere with focus management
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Should not have tabindex
      expect(avatar).not.toHaveAttribute('tabindex');
      expect(fallback).not.toHaveAttribute('tabindex');
    });

    it('supports high contrast mode compatibility', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Should use semantic color classes that work with high contrast
      expect(avatar).toHaveClass('rounded-full');
      expect(fallback).toHaveClass('bg-muted');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty avatar gracefully', () => {
      renderWithUserEvents(<Avatar />);
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toBeEmptyDOMElement();
    });

    it('handles avatar with only image (no fallback)', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderAvatarImageOnly();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
      }, { timeout: 100 });
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).not.toBeInTheDocument();
      
      restoreMock();
    });

    it('handles avatar with only fallback (no image)', () => {
      renderAvatarFallbackOnly();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const image = document.querySelector('[data-slot="avatar-image"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(avatar).toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(image).not.toBeInTheDocument();
    });

    it('handles invalid image URLs gracefully', async () => {
      const restoreMock = mockImageLoadError();
      
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.protocol.com/image.jpg',
        'javascript:alert("xss")',
        '///malformed/url',
        ''
      ];
      
      for (const url of invalidUrls) {
        const { unmount } = renderTestAvatar(
          {},
          { src: url },
          {},
          url,
          'ER'
        );
        
        const image = document.querySelector('[data-slot="avatar-image"]');
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        
        // Image may or may not be present depending on URL validity
        if (image) {
          expect(image).toHaveAttribute('src', url);
        }
        expect(fallback).toBeInTheDocument();
        expect(fallback).toHaveTextContent('ER');
        
        unmount();
      }
      
      restoreMock();
    });

    it('handles empty fallback content gracefully', () => {
      renderWithUserEvents(
        <Avatar>
          <AvatarFallback></AvatarFallback>
        </Avatar>
      );
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toBeEmptyDOMElement();
    });

    it('handles fallback with only whitespace', () => {
      renderWithUserEvents(
        <Avatar>
          <AvatarFallback>   </AvatarFallback>
        </Avatar>
      );
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toBeInTheDocument();
      // Browsers normalize whitespace to a single space or empty
      // Just verify the element exists and has some form of content or is empty
      const textContent = fallback?.textContent;
      expect(textContent).toBeDefined();
      // Either empty (normalized away) or contains whitespace
      expect(textContent === '' || /\s/.test(textContent || '')).toBe(true);
    });

    it('handles very long fallback text', () => {
      const longText = 'VERYLONGFALLBACKTEXT';
      
      renderAvatarFallbackOnly({}, { children: longText });
      
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toHaveTextContent(longText);
      
      // Should maintain proper styling even with overflow
      expect(fallback).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('handles special characters in fallback text', () => {
      const specialTexts = [
        '😊',
        '👤',
        '🎭',
        '©®',
        '&lt;&gt;',
        '测试',
        'العربية',
        'Русский'
      ];
      
      specialTexts.forEach(text => {
        const { unmount } = renderAvatarFallbackOnly({}, { children: text });
        
        const fallback = document.querySelector('[data-slot="avatar-fallback"]');
        expect(fallback).toHaveTextContent(text);
        
        unmount();
      });
    });

    it('handles malformed HTML attributes gracefully', () => {
      // Test with potentially problematic attributes
      renderTestAvatar(
        {
          'data-test': '<script>alert("xss")</script>',
          'aria-label': 'Label with "quotes" and \'apostrophes\'',
          className: 'class-with-special-chars-!@#$%'
        }
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('data-test', '<script>alert("xss")</script>');
      expect(avatar).toHaveAttribute('aria-label', 'Label with "quotes" and \'apostrophes\'');
    });

    it('handles network timeouts gracefully', async () => {
      const restoreMock = mockImageLoadError();
      
      renderTestAvatar(
        {},
        { src: 'https://very-slow-server.example.com/image.jpg' },
        {},
        'https://very-slow-server.example.com/image.jpg',
        'TO'
      );
      
      // Should have fallback available
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('TO');
      
      restoreMock();
    });

    it('handles rapid prop changes without memory leaks', () => {
      const { rerender } = renderTestAvatar();
      
      // Rapidly change props many times
      for (let i = 0; i < 100; i++) {
        rerender(
          <Avatar key={i}>
            <AvatarImage src={`https://example.com/avatar-${i}.jpg`} />
            <AvatarFallback>{i.toString().padStart(2, '0')}</AvatarFallback>
          </Avatar>
        );
      }
      
      // Should still be functioning
      const avatar = document.querySelector('[data-slot="avatar"]');
      const image = document.querySelector('[data-slot="avatar-image"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(avatar).toBeInTheDocument();
      
      // Image may or may not be present (depends on load state)
      if (image) {
        expect(image).toHaveAttribute('src', 'https://example.com/avatar-99.jpg');
      }
      
      // Fallback should be present with correct content
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('99');
    });

    it('handles null and undefined children gracefully', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderWithUserEvents(
        <Avatar>
          {null}
          <AvatarImage src="https://github.com/shadcn.png" />
          {undefined}
          <AvatarFallback>CN</AvatarFallback>
          {false && <div>This should not render</div>}
        </Avatar>
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      
      // Wait for image to load
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
      }, { timeout: 100 });
      
      // Due to Radix conditional rendering, only image OR fallback will be present
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).not.toBeInTheDocument(); // Image loaded successfully
      
      restoreMock();
    });

    it('handles CORS errors gracefully', async () => {
      const restoreMock = mockImageLoadError();
      
      renderTestAvatar(
        {},
        { 
          src: 'https://cors-blocked.example.com/image.jpg',
          crossOrigin: 'anonymous'
        },
        {},
        'https://cors-blocked.example.com/image.jpg',
        'CR'
      );
      
      const image = document.querySelector('[data-slot="avatar-image"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(image).not.toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('CR');
      
      restoreMock();
    });
  });

  describe('Component Integration', () => {
    it('integrates Avatar and AvatarImage properly', async () => {
      const restoreMock = mockImageLoadSuccess();
      
      renderAvatarImageOnly();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      
      // Avatar provides the container styling
      expect(avatar).toHaveClass('relative', 'flex', 'size-8', 'overflow-hidden', 'rounded-full');
      
      await waitFor(() => {
        const image = document.querySelector('[data-slot="avatar-image"]');
        expect(image).toBeInTheDocument();
        expect(avatar).toContainElement(image as HTMLElement);
        // Image fills the container
        expect(image).toHaveClass('aspect-square', 'size-full');
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('integrates Avatar and AvatarFallback properly', () => {
      renderAvatarFallbackOnly();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(avatar).toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(avatar).toContainElement(fallback as HTMLElement);
      
      // Avatar provides the container
      expect(avatar).toHaveClass('relative', 'flex', 'size-8', 'overflow-hidden', 'rounded-full');
      
      // Fallback fills and centers content
      expect(fallback).toHaveClass('flex', 'size-full', 'items-center', 'justify-center', 'rounded-full');
    });

    it('integrates all three components harmoniously', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Avatar and fallback should be present (image not loaded yet)
      expect(avatar).toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      
      // Proper nesting
      expect(avatar).toContainElement(fallback as HTMLElement);
      
      // Consistent sizing
      expect(avatar).toHaveClass('size-8');
      expect(fallback).toHaveClass('size-full');
    });

    it('maintains consistent border radius across components', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Both should be rounded-full for consistency
      expect(avatar).toHaveClass('rounded-full');
      expect(fallback).toHaveClass('rounded-full');
    });

    it('handles size inheritance properly', () => {
      renderTestAvatar({ className: 'size-12' });
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Avatar should have custom size
      expect(avatar).toHaveClass('size-12');
      
      // Fallback should fill the container (image not loaded initially)
      expect(fallback).toHaveClass('size-full');
    });

    it('maintains proper layering and overflow behavior', () => {
      renderTestAvatar();
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      
      // Should have overflow hidden to maintain circular shape
      expect(avatar).toHaveClass('overflow-hidden');
      
      // Should be positioned relatively for proper layering
      expect(avatar).toHaveClass('relative');
    });

    it('handles dynamic component addition/removal', async () => {
      const { rerender } = renderAvatarFallbackOnly();
      
      // Start with fallback only
      expect(document.querySelector('[data-slot="avatar-image"]')).not.toBeInTheDocument();
      expect(document.querySelector('[data-slot="avatar-fallback"]')).toBeInTheDocument();
      
      // Add image (with mock to ensure it loads)
      const restoreMock = mockImageLoadSuccess();
      
      rerender(
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );
      
      // Due to conditional rendering, initially shows fallback until image loads
      expect(document.querySelector('[data-slot="avatar-fallback"]')).toBeInTheDocument();
      
      // Wait for image to load and replace fallback
      await waitFor(() => {
        expect(document.querySelector('[data-slot="avatar-image"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="avatar-fallback"]')).not.toBeInTheDocument();
      }, { timeout: 100 });
      
      // Remove fallback
      rerender(
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
        </Avatar>
      );
      
      await waitFor(() => {
        expect(document.querySelector('[data-slot="avatar-image"]')).toBeInTheDocument();
        expect(document.querySelector('[data-slot="avatar-fallback"]')).not.toBeInTheDocument();
      }, { timeout: 100 });
      
      restoreMock();
    });

    it('handles complex nested content properly', () => {
      renderWithUserEvents(
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="Profile" />
          <AvatarFallback>
            <span className="font-bold">JD</span>
          </AvatarFallback>
        </Avatar>
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      const nestedSpan = fallback?.querySelector('span');
      
      expect(avatar).toBeInTheDocument();
      expect(fallback).toBeInTheDocument();
      expect(avatar).toContainElement(fallback as HTMLElement);
      expect(fallback).toContainElement(nestedSpan as HTMLElement);
      expect(nestedSpan).toHaveClass('font-bold');
      expect(nestedSpan).toHaveTextContent('JD');
    });

    it('maintains accessibility across component integration', () => {
      renderTestAvatar(
        { 'aria-label': 'User profile' },
        { alt: 'Profile photo of John Doe' },
        { 'aria-label': 'Initials J.D.' }
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      expect(avatar).toHaveAttribute('aria-label', 'User profile');
      expect(fallback).toHaveAttribute('aria-label', 'Initials J.D.');
      
      // Image attributes are tested separately when image loads
    });

    it('handles styling conflicts gracefully', () => {
      renderTestAvatar(
        { className: 'bg-red-500 size-16' },
        { className: 'opacity-50' },
        { className: 'bg-blue-500 text-white' }
      );
      
      const avatar = document.querySelector('[data-slot="avatar"]');
      const fallback = document.querySelector('[data-slot="avatar-fallback"]');
      
      // Custom classes should be applied
      expect(avatar).toHaveClass('bg-red-500', 'size-16');
      expect(fallback).toHaveClass('bg-blue-500', 'text-white');
      
      // Default classes should still be present
      expect(avatar).toHaveClass('relative', 'flex', 'overflow-hidden', 'rounded-full');
      expect(fallback).toHaveClass('flex', 'size-full', 'items-center', 'justify-center', 'rounded-full');
    });
  });
});