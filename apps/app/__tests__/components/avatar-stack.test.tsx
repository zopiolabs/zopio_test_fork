/**
 * SPDX-License-Identifier: MIT
 */

import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { AvatarStack } from '../../app/(authenticated)/components/avatar-stack';

/**
 * Mock the collaboration hooks for testing isolation.
 * These mocks provide controlled user presence data.
 */
vi.mock('@repo/collaboration/hooks', () => ({
  useOthers: vi.fn(),
  useSelf: vi.fn(),
}));

/**
 * Mock the design system avatar components.
 * Provides testable DOM elements with data-testid attributes.
 */
vi.mock('@repo/design-system/ui/avatar', () => ({
  Avatar: ({ className, children }: { className: string; children: React.ReactNode }) => (
    <div className={className} data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt || ''} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ className, children }: { className: string; children: React.ReactNode }) => (
    <div className={className} data-testid="avatar-fallback">{children}</div>
  ),
}));

/**
 * Mock the design system tooltip components.
 * Provides testable tooltip functionality without real positioning logic.
 */
vi.mock('@repo/design-system/ui/tooltip', () => ({
  Tooltip: ({ children, delayDuration }: { children: React.ReactNode; delayDuration?: number }) => (
    <div data-testid="tooltip" data-delay-duration={delayDuration}>{children}</div>
  ),
  TooltipContent: ({ children, collisionPadding }: { children: React.ReactNode; collisionPadding?: number }) => (
    <div data-testid="tooltip-content" data-collision-padding={collisionPadding}>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

// Mock imports
import { useOthers, useSelf } from '@repo/collaboration/hooks';

const mockUseOthers = useOthers as ReturnType<typeof vi.fn>;
const mockUseSelf = useSelf as ReturnType<typeof vi.fn>;

/**
 * Test data factory functions for consistent user data creation.
 * These helpers ensure test data follows expected patterns.
 */
const createMockUser = (id: string, name: string, avatar?: string) => ({
  connectionId: id,
  info: {
    name,
    ...(avatar && { avatar })
  }
});

const createMockUsers = (count: number, hasAvatars = false) => 
  Array.from({ length: count }, (_, i) => createMockUser(
    `user${i + 1}`,
    `User ${i + 1}`,
    hasAvatars ? `https://example.com/avatar${i + 1}.jpg` : undefined
  ));

/**
 * AvatarStack Component Test Suite
 * 
 * Tests the real-time collaboration avatar stack component that displays
 * user presence indicators. The component shows up to 3 other users plus
 * an overflow indicator for additional users, and always includes the current
 * user's avatar when present.
 * 
 * @see {@link ../../app/(authenticated)/components/avatar-stack.tsx} - Source component
 */
describe('AvatarStack', () => {
  /**
   * Setup function to reset all mocks before each test.
   * Ensures clean state for consistent test execution.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Basic rendering tests for fundamental component behavior.
   */
  describe('Basic Rendering', () => {
    /**
     * Tests the empty state when no users are present.
     * Verifies that the component renders its container but no avatars.
     */
    test('should render empty state when no users are present', () => {
      mockUseOthers.mockReturnValue([]);
      mockUseSelf.mockReturnValue(null);

      const { container } = render(<AvatarStack />);

      // Find the main container div
      const avatarStackContainer = container.querySelector('div.-space-x-1.flex.items-center.px-4');
      expect(avatarStackContainer).toBeInTheDocument();
      expect(avatarStackContainer).toHaveClass('-space-x-1', 'flex', 'items-center', 'px-4');
      
      // Should not render any avatars
      const avatars = screen.queryAllByTestId('avatar');
      expect(avatars).toHaveLength(0);
    });

    /**
     * Tests rendering of a single user avatar with complete user information.
     * Verifies avatar image, alt text, and tooltip display.
     */
    test('should render single user avatar with complete information', () => {
      const mockUser = createMockUser('user1', 'John Doe', 'https://example.com/avatar1.jpg');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(1);
      
      // Check avatar image properties
      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
      expect(avatarImage).toHaveAttribute('alt', 'John Doe');
      
      // Check tooltip content displays user name
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent('John Doe');
    });

    /**
     * Tests rendering of multiple users up to the display limit.
     * Verifies that all users within the limit are displayed.
     */
    test('should render multiple users up to display limit', () => {
      const mockUsers = createMockUsers(3, true);
      
      mockUseOthers.mockReturnValue(mockUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(3);
      
      // Check that all users are rendered in tooltips
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('User 3')).toBeInTheDocument();
    });

    /**
     * Tests rendering with exactly two users.
     * Verifies proper display of pairs without overflow logic.
     */
    test('should render exactly two users correctly', () => {
      const mockUsers = createMockUsers(2, true);
      
      mockUseOthers.mockReturnValue(mockUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(2);
      
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
    });
  });

  /**
   * Overflow handling tests for when user count exceeds display limit.
   */
  describe('Overflow Handling', () => {
    /**
     * Tests overflow indicator display when user count exceeds limit.
     * Verifies correct count calculation and display logic.
     */
    test('should show overflow indicator when more than 3 users', () => {
      const mockUsers = createMockUsers(5);
      
      mockUseOthers.mockReturnValue(mockUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      // Should render 3 users + 1 overflow indicator = 4 avatars total
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(4);
      
      // Check overflow indicator shows correct count
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+2'
      );
      expect(overflowFallback).toBeInTheDocument();
      
      // Verify only first 3 users are shown by name
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('User 3')).toBeInTheDocument();
      
      // Fourth and fifth users should not be shown by name
      expect(screen.queryByText('User 4')).not.toBeInTheDocument();
      expect(screen.queryByText('User 5')).not.toBeInTheDocument();
    });

    /**
     * Tests overflow behavior with exactly 4 users.
     * Verifies boundary condition for overflow logic activation.
     */
    test('should show +1 overflow indicator with exactly 4 users', () => {
      const mockUsers = createMockUsers(4);
      
      mockUseOthers.mockReturnValue(mockUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(4); // 3 users + 1 overflow
      
      // Check overflow shows +1
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+1'
      );
      expect(overflowFallback).toBeInTheDocument();
    });

    /**
     * Tests overflow calculation with large user counts.
     * Verifies accurate counting for edge cases.
     */
    test('should calculate overflow correctly for large user counts', () => {
      const mockUsers = createMockUsers(10);
      
      mockUseOthers.mockReturnValue(mockUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      // Should still render 4 avatars total (3 users + overflow)
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(4);
      
      // Check overflow shows +7 (10 - 3 displayed)
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+7'
      );
      expect(overflowFallback).toBeInTheDocument();
    });
  });

  /**
   * Self user integration tests for current user display.
   */
  describe('Self User Integration', () => {
    /**
     * Tests inclusion of self user when present.
     * Verifies self user appears in addition to others.
     */
    test('should include self user when present', () => {
      const mockOthers = [createMockUser('user1', 'John Doe')];
      const mockSelf = createMockUser('self', 'Current User', 'https://example.com/self.jpg');
      
      mockUseOthers.mockReturnValue(mockOthers);
      mockUseSelf.mockReturnValue(mockSelf);

      render(<AvatarStack />);

      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(2);
      
      // Check both users are present
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Current User')).toBeInTheDocument();
    });

    /**
     * Tests self user display when others exceed limit.
     * Verifies self user is always shown regardless of overflow.
     */
    test('should always show self user even with overflow', () => {
      const mockOthers = createMockUsers(5);
      const mockSelf = createMockUser('self', 'Current User');
      
      mockUseOthers.mockReturnValue(mockOthers);
      mockUseSelf.mockReturnValue(mockSelf);

      render(<AvatarStack />);

      // Should render 3 others + overflow + self = 5 avatars total
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(5);
      
      // Self user should always be present
      expect(screen.getByText('Current User')).toBeInTheDocument();
      
      // Overflow should account for remaining others (5 - 3 = 2)
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+2'
      );
      expect(overflowFallback).toBeInTheDocument();
    });

    /**
     * Tests self user only scenario.
     * Verifies component works when only current user is present.
     */
    test('should show only self user when no others present', () => {
      const mockSelf = createMockUser('self', 'Solo User');
      
      mockUseOthers.mockReturnValue([]);
      mockUseSelf.mockReturnValue(mockSelf);

      render(<AvatarStack />);

      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(1);
      
      expect(screen.getByText('Solo User')).toBeInTheDocument();
    });
  });

  /**
   * Avatar rendering logic tests for different user data scenarios.
   */
  describe('Avatar Rendering Logic', () => {
    /**
     * Tests avatar fallback behavior when users lack avatar images.
     * Verifies initials generation from user names.
     */
    test('should show initials fallback for users without avatar images', () => {
      const mockUser = createMockUser('user1', 'No Avatar User');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      // Should show fallback with first two characters of name
      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toHaveTextContent('No');
    });

    /**
     * Tests initials generation for various name formats.
     * Verifies proper handling of different naming patterns.
     */
    test('should generate initials correctly for different name formats', () => {
      const testCases = [
        { name: 'John Doe', expected: 'Jo' },
        { name: 'A', expected: 'A' },
        { name: 'Alice', expected: 'Al' },
        { name: 'Mary Jane Watson', expected: 'Ma' },
        { name: 'X Y', expected: 'X' } // Fixed: no trailing space
      ];

      testCases.forEach(({ name, expected }, index) => {
        const mockUser = createMockUser(`user${index}`, name);
        
        mockUseOthers.mockReturnValue([mockUser]);
        mockUseSelf.mockReturnValue(null);

        const { unmount } = render(<AvatarStack />);

        const avatarFallback = screen.getByTestId('avatar-fallback');
        expect(avatarFallback).toHaveTextContent(expected);
        
        unmount();
      });
    });

    /**
     * Tests avatar image display when URLs are provided.
     * Verifies proper src and alt attribute assignment.
     */
    test('should display avatar images when URLs are provided', () => {
      const mockUser = createMockUser('user1', 'Avatar User', 'https://example.com/avatar.jpg');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatarImage).toHaveAttribute('alt', 'Avatar User');
    });

    /**
     * Tests graceful handling of users without names.
     * Verifies fallback to 'Unknown' label.
     */
    test('should handle users without names gracefully', () => {
      const mockUser = {
        connectionId: 'user1',
        info: {}
      };
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      // Should show "Unknown" in tooltip
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent('Unknown');
    });

    /**
     * Tests handling of empty or whitespace-only names.
     * Verifies proper fallback behavior for edge cases.
     */
    test('should handle empty or whitespace names', () => {
      // Test empty string
      const emptyUser = {
        connectionId: 'user1',
        info: { name: '' }
      };
      
      mockUseOthers.mockReturnValue([emptyUser]);
      mockUseSelf.mockReturnValue(null);

      const { unmount } = render(<AvatarStack />);

      const tooltipContent = screen.getByTestId('tooltip-content');
      // Component uses ?? operator, so empty string won't trigger 'Unknown'
      expect(tooltipContent).toHaveTextContent('');
      
      unmount();

      // Test with various whitespace characters
      const whitespaceTestCases = [' ', '  ', '\t', '\n'];
      
      whitespaceTestCases.forEach((name, index) => {
        const mockUser = {
          connectionId: `user${index}`,
          info: { name }
        };
        
        mockUseOthers.mockReturnValue([mockUser]);
        mockUseSelf.mockReturnValue(null);

        const { unmount: unmountWhitespace } = render(<AvatarStack />);

        // Whitespace names will be displayed as-is (not Unknown)
        const tooltipContent = screen.getByTestId('tooltip-content');
        expect(tooltipContent.textContent).toBe(name);
        
        unmountWhitespace();
      });
    });

    /**
     * Tests handling of users with malformed info objects.
     * Verifies resilience against various data structures.
     */
    test('should handle malformed user info gracefully', () => {
      const testCases = [
        { connectionId: 'user1', info: null },
        { connectionId: 'user2', info: undefined },
        { connectionId: 'user3' }, // missing info
      ];
      
      testCases.forEach((mockUser, index) => {
        mockUseOthers.mockReturnValue([mockUser as any]);
        mockUseSelf.mockReturnValue(null);

        const { unmount } = render(<AvatarStack />);

        // Should not crash and should show Unknown
        const tooltipContent = screen.getByTestId('tooltip-content');
        expect(tooltipContent).toHaveTextContent('Unknown');
        
        unmount();
      });
    });
  });

  /**
   * Component styling and accessibility tests.
   */
  describe('Styling and Accessibility', () => {
    /**
     * Tests avatar styling classes for consistent appearance.
     * Verifies size, background, and ring styling.
     */
    test('should apply correct styling classes to avatars', () => {
      const mockUser = createMockUser('user1', 'Test User');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('h-7', 'w-7', 'bg-secondary', 'ring-1', 'ring-background');
    });

    /**
     * Tests fallback text styling for readability.
     * Verifies proper typography sizing.
     */
    test('should apply correct styling to fallback text', () => {
      const mockUser = createMockUser('user1', 'Test User');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toHaveClass('text-xs');
    });

    /**
     * Tests container layout classes for proper positioning.
     * Verifies flex layout and spacing configuration.
     */
    test('should apply correct layout classes to container', () => {
      const mockUser = createMockUser('user1', 'Test User');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      const { container } = render(<AvatarStack />);

      const stackContainer = container.querySelector('div.-space-x-1.flex.items-center.px-4');
      expect(stackContainer).toBeInTheDocument();
      expect(stackContainer).toHaveClass('-space-x-1', 'flex', 'items-center', 'px-4');
    });

    /**
     * Tests tooltip accessibility and configuration.
     * Verifies proper delay and collision padding settings.
     */
    test('should configure tooltips with proper accessibility settings', () => {
      const mockUser = createMockUser('user1', 'Test User');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-delay-duration', '0');
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-collision-padding', '4');
    });

    /**
     * Tests avatar image accessibility attributes.
     * Verifies proper alt text for screen readers.
     */
    test('should provide proper alt text for avatar images', () => {
      const mockUser = createMockUser('user1', 'Accessible User', 'https://example.com/avatar.jpg');
      
      mockUseOthers.mockReturnValue([mockUser]);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('alt', 'Accessible User');
    });

    /**
     * Tests tooltip content accessibility.
     * Verifies meaningful content for assistive technologies.
     */
    test('should provide meaningful tooltip content for accessibility', () => {
      const mockUsers = [
        createMockUser('user1', 'First User'),
        createMockUser('user2', 'Second User')
      ];
      
      mockUseOthers.mockReturnValue(mockUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      const tooltipContents = screen.getAllByTestId('tooltip-content');
      expect(tooltipContents[0]).toHaveTextContent('First User');
      expect(tooltipContents[1]).toHaveTextContent('Second User');
    });
  });

  /**
   * Props validation and edge case tests.
   */
  describe('Props Validation and Edge Cases', () => {
    /**
     * Tests component behavior with undefined hook returns.
     * Verifies that component expects proper hook data structure.
     * This is testing a potential edge case that would require defensive programming.
     */
    test('should handle undefined hook returns (edge case)', () => {
      mockUseOthers.mockReturnValue(undefined as any);
      mockUseSelf.mockReturnValue(undefined as any);

      // This is currently expected to throw because the component doesn't handle
      // undefined values defensively. This test documents current behavior.
      expect(() => render(<AvatarStack />)).toThrow();
    });

    /**
     * Tests component behavior with null hook returns.
     * Verifies that component expects proper hook data structure.
     * This is testing a potential edge case that would require defensive programming.
     */
    test('should handle null hook returns (edge case)', () => {
      mockUseOthers.mockReturnValue(null as any);
      mockUseSelf.mockReturnValue(null);

      // This is currently expected to throw because the component doesn't handle
      // null values defensively. This test documents current behavior.
      expect(() => render(<AvatarStack />)).toThrow();
    });

    /**
     * Tests component with mixed valid and invalid user data.
     * Verifies filtering and error handling for malformed data.
     */
    test('should handle mixed valid and invalid user data', () => {
      const mixedUsers = [
        createMockUser('user1', 'Valid User'),
        { connectionId: 'user2' }, // missing info
        createMockUser('user3', 'Another Valid User'),
        null, // invalid user
        { connectionId: 'user4', info: { name: '' } } // empty name
      ];
      
      mockUseOthers.mockReturnValue(mixedUsers as any);
      mockUseSelf.mockReturnValue(null);

      expect(() => render(<AvatarStack />)).not.toThrow();
      
      // Should still render valid users
      expect(screen.getByText('Valid User')).toBeInTheDocument();
      expect(screen.getByText('Another Valid User')).toBeInTheDocument();
    });

    /**
     * Tests performance with large user arrays.
     * Verifies component maintains performance with many users.
     */
    test('should maintain performance with large user arrays', () => {
      const largeUserArray = createMockUsers(100);
      
      mockUseOthers.mockReturnValue(largeUserArray);
      mockUseSelf.mockReturnValue(null);

      const startTime = performance.now();
      render(<AvatarStack />);
      const endTime = performance.now();

      // Should render quickly even with many users
      expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
      
      // Should still only show 4 avatars (3 + overflow)
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(4);
    });

    /**
     * Tests component rerender behavior with changing user data.
     * Verifies proper updates when collaboration state changes.
     */
    test('should update properly when user data changes', () => {
      const initialUsers = createMockUsers(2);
      mockUseOthers.mockReturnValue(initialUsers);
      mockUseSelf.mockReturnValue(null);

      const { rerender } = render(<AvatarStack />);
      
      expect(screen.getAllByTestId('avatar')).toHaveLength(2);
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();

      // Update with more users
      const updatedUsers = createMockUsers(5);
      mockUseOthers.mockReturnValue(updatedUsers);
      
      rerender(<AvatarStack />);
      
      // Should now show overflow
      expect(screen.getAllByTestId('avatar')).toHaveLength(4);
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+2'
      );
      expect(overflowFallback).toBeInTheDocument();
    });

    /**
     * Tests component with users that have special characters in names.
     * Verifies proper handling of Unicode and special characters.
     */
    test('should handle special characters in user names', () => {
      const specialUsers = [
        createMockUser('user1', 'José María', 'https://example.com/jose.jpg'),
        createMockUser('user2', '李小明'),
        createMockUser('user3', 'Müller-Schmidt'),
        createMockUser('user4', 'O\'Reilly')
      ];
      
      mockUseOthers.mockReturnValue(specialUsers);
      mockUseSelf.mockReturnValue(null);

      render(<AvatarStack />);

      // Should render first 3 users
      expect(screen.getByText('José María')).toBeInTheDocument();
      expect(screen.getByText('李小明')).toBeInTheDocument();
      expect(screen.getByText('Müller-Schmidt')).toBeInTheDocument();
      
      // Should show overflow for 4th user
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+1'
      );
      expect(overflowFallback).toBeInTheDocument();
    });
  });

  /**
   * Integration tests for real-world usage scenarios.
   */
  describe('Integration Scenarios', () => {
    /**
     * Tests typical collaboration session scenario.
     * Verifies component behavior in common use cases.
     */
    test('should handle typical collaboration session', () => {
      // Simulate a typical session: 2 others + self
      const others = [
        createMockUser('collaborator1', 'Alice Designer', 'https://example.com/alice.jpg'),
        createMockUser('collaborator2', 'Bob Developer')
      ];
      const self = createMockUser('current', 'Current User', 'https://example.com/current.jpg');
      
      mockUseOthers.mockReturnValue(others);
      mockUseSelf.mockReturnValue(self);

      render(<AvatarStack />);

      // Should show all 3 users
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(3);
      
      expect(screen.getByText('Alice Designer')).toBeInTheDocument();
      expect(screen.getByText('Bob Developer')).toBeInTheDocument();
      expect(screen.getByText('Current User')).toBeInTheDocument();
      
      // Alice should have avatar image
      const aliceImage = screen.getAllByTestId('avatar-image').find(img => 
        img.getAttribute('alt') === 'Alice Designer'
      );
      expect(aliceImage).toHaveAttribute('src', 'https://example.com/alice.jpg');
      
      // Bob should show initials fallback
      const bobFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === 'Bo'
      );
      expect(bobFallback).toBeInTheDocument();
    });

    /**
     * Tests busy collaboration session with many users.
     * Verifies proper overflow handling in active sessions.
     */
    test('should handle busy collaboration session with overflow', () => {
      // Simulate busy session: 6 others + self
      const others = createMockUsers(6, true);
      const self = createMockUser('current', 'Session Owner');
      
      mockUseOthers.mockReturnValue(others);
      mockUseSelf.mockReturnValue(self);

      render(<AvatarStack />);

      // Should show 3 others + overflow + self = 5 avatars
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(5);
      
      // First 3 others should be visible
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('User 3')).toBeInTheDocument();
      
      // Self should always be visible
      expect(screen.getByText('Session Owner')).toBeInTheDocument();
      
      // Should show +3 overflow (6 others - 3 displayed = 3)
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+3'
      );
      expect(overflowFallback).toBeInTheDocument();
    });

    /**
     * Tests component behavior during user joins/leaves.
     * Verifies dynamic updates in real-time scenarios.
     */
    test('should update dynamically as users join and leave', () => {
      // Start with empty session
      mockUseOthers.mockReturnValue([]);
      mockUseSelf.mockReturnValue(null);

      const { rerender } = render(<AvatarStack />);
      expect(screen.queryAllByTestId('avatar')).toHaveLength(0);

      // User joins
      const firstUser = createMockUser('user1', 'First Joiner');
      mockUseOthers.mockReturnValue([firstUser]);
      rerender(<AvatarStack />);
      
      expect(screen.getAllByTestId('avatar')).toHaveLength(1);
      expect(screen.getByText('First Joiner')).toBeInTheDocument();

      // More users join
      const moreUsers = createMockUsers(4);
      mockUseOthers.mockReturnValue(moreUsers);
      rerender(<AvatarStack />);
      
      // Should show overflow
      expect(screen.getAllByTestId('avatar')).toHaveLength(4);
      const overflowFallback = screen.getAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent === '+1'
      );
      expect(overflowFallback).toBeInTheDocument();

      // Users leave, back to 2
      const remainingUsers = createMockUsers(2);
      mockUseOthers.mockReturnValue(remainingUsers);
      rerender(<AvatarStack />);
      
      // No overflow anymore
      expect(screen.getAllByTestId('avatar')).toHaveLength(2);
      expect(screen.queryAllByTestId('avatar-fallback').find(fallback => 
        fallback.textContent?.startsWith('+')
      )).toBeUndefined();
    });
  });
});