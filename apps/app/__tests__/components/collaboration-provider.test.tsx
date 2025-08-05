/**
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Unit tests for the CollaborationProvider component.
 * 
 * The CollaborationProvider is a React component that wraps the Liveblocks Room
 * component to provide real-time collaboration functionality for an organization.
 * It handles user resolution and mention suggestions through server actions.
 * 
 * @module CollaborationProviderTests
 * @author Zopio Development Team
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { CollaborationProvider } from '../../app/(authenticated)/components/collaboration-provider';

/**
 * Mock implementation for the user actions module.
 * Provides test doubles for getUsers and searchUsers functions.
 */
vi.mock('@/app/actions/users/get', () => ({
  getUsers: vi.fn(),
}));

vi.mock('@/app/actions/users/search', () => ({
  searchUsers: vi.fn(),
}));

/**
 * Props interface for the mocked Room component.
 * Defines the expected shape of props passed to the Room component.
 */
interface MockRoomProps {
  id: string;
  authEndpoint: string;
  fallback: ReactNode;
  resolveUsers: (params: { userIds: string[] }) => Promise<any>;
  resolveMentionSuggestions: (params: { text: string }) => Promise<any>;
  children: ReactNode;
}

/**
 * Mock implementation of the Liveblocks Room component.
 * Creates a test double that exposes internal props and provides
 * interactive elements for testing resolver functions.
 */
vi.mock('@repo/collaboration/room', () => ({
  Room: ({ 
    id, 
    authEndpoint, 
    fallback, 
    resolveUsers, 
    resolveMentionSuggestions, 
    children 
  }: MockRoomProps) => (
    <div 
      data-testid="collaboration-room"
      data-room-id={id}
      data-auth-endpoint={authEndpoint}
    >
      <div data-testid="room-fallback">{fallback}</div>
      <div data-testid="room-content">{children}</div>
      <button 
        data-testid="test-resolve-users" 
        onClick={async () => {
          try {
            await resolveUsers({ userIds: ['user1', 'user2'] });
          } catch (error) {
            // Mock error handling for testing - errors are expected and tested separately
            console.warn('Mock resolveUsers error:', error);
          }
        }}
      >
        Test Resolve Users
      </button>
      <button 
        data-testid="test-resolve-mentions" 
        onClick={async () => {
          try {
            await resolveMentionSuggestions({ text: 'john' });
          } catch (error) {
            // Mock error handling for testing - errors are expected and tested separately
            console.warn('Mock resolveMentionSuggestions error:', error);
          }
        }}
      >
        Test Resolve Mentions
      </button>
    </div>
  ),
}));

// Import mocked functions for type-safe access
import { getUsers } from '@/app/actions/users/get';
import { searchUsers } from '@/app/actions/users/search';

/**
 * Type-safe references to mocked functions.
 * Provides proper TypeScript typing for the mocked implementations.
 */
const mockGetUsers = getUsers as ReturnType<typeof vi.fn>;
const mockSearchUsers = searchUsers as ReturnType<typeof vi.fn>;

/**
 * Test suite for the CollaborationProvider component.
 * 
 * This test suite validates the CollaborationProvider's core functionality including:
 * - Proper rendering and prop passing to the Room component
 * - User resolution functionality through server actions
 * - Mention suggestion functionality
 * - Error handling for both success and failure scenarios
 * - Edge cases and boundary conditions
 * 
 * @group unit
 * @group collaboration
 */
describe('CollaborationProvider', () => {
  /**
   * Test data constants used across multiple test cases.
   * Centralized to ensure consistency and maintainability.
   */
  const TEST_ORG_ID = 'test-org-123';
  const TEST_USERS = [
    { id: 'user1', name: 'John Doe', email: 'john@example.com' },
    { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
  ];
  const TEST_MENTIONS = [
    { id: 'user1', name: 'John Doe', email: 'john@example.com' },
    { id: 'user3', name: 'Johnny Smith', email: 'johnny@example.com' }
  ];

  /**
   * Setup function that runs before each test.
   * Clears all mock function call history and return values.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Cleanup function that runs after each test.
   * Ensures no side effects persist between tests.
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * @group rendering
   * @description Validates that the CollaborationProvider correctly renders
   * the Room component with the expected props and structure.
   */
  describe('Component Rendering', () => {
    /**
     * Test that the CollaborationProvider renders the Room component
     * with correct props and passes children through properly.
     */
    test('renders Room component with correct props', () => {
      const childContent = 'Test children content';

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>{childContent}</div>
        </CollaborationProvider>
      );

      // Verify Room component is rendered
      const room = screen.getByTestId('collaboration-room');
      expect(room).toBeInTheDocument();

      // Verify room ID follows expected format: {orgId}:presence
      expect(room).toHaveAttribute('data-room-id', `${TEST_ORG_ID}:presence`);

      // Verify correct auth endpoint is set
      expect(room).toHaveAttribute('data-auth-endpoint', '/api/collaboration/auth');

      // Verify children are passed through correctly
      const content = screen.getByTestId('room-content');
      expect(content).toHaveTextContent(childContent);
    });

    /**
     * Test that the loading fallback is rendered correctly with proper styling.
     */
    test('renders loading fallback with correct styling', () => {
      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const fallback = screen.getByTestId('room-fallback');
      expect(fallback).toHaveTextContent('Loading...');
      
      // Verify fallback contains styled loading element
      const loadingDiv = fallback.querySelector('div.px-3.text-muted-foreground.text-xs');
      expect(loadingDiv).toBeInTheDocument();
      expect(loadingDiv).toHaveTextContent('Loading...');
    });

    /**
     * Test that different orgId values are handled correctly.
     */
    test('handles different orgId values correctly', () => {
      const testOrgIds = [
        'simple-org',
        'org_with_underscores',
        'org-with-dashes',
        '123-numeric-org',
        'UPPERCASE-ORG'
      ];

      testOrgIds.forEach((orgId) => {
        const { unmount } = render(
          <CollaborationProvider orgId={orgId}>
            <div>Content</div>
          </CollaborationProvider>
        );

        const room = screen.getByTestId('collaboration-room');
        expect(room).toHaveAttribute('data-room-id', `${orgId}:presence`);
        
        unmount();
      });
    });

    /**
     * Test that children components are passed through correctly.
     */
    test('passes through complex children correctly', () => {
      const ComplexChild = () => (
        <div>
          <h1>Complex Child</h1>
          <button>Child Button</button>
          <span>Additional content</span>
        </div>
      );

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <ComplexChild />
        </CollaborationProvider>
      );

      const content = screen.getByTestId('room-content');
      expect(content).toContainElement(screen.getByRole('heading', { name: 'Complex Child' }));
      expect(content).toContainElement(screen.getByRole('button', { name: 'Child Button' }));
      expect(content).toContainElement(screen.getByText('Additional content'));
    });

    /**
     * Test that multiple children are handled correctly.
     */
    test('handles multiple children correctly', () => {
      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </CollaborationProvider>
      );

      const content = screen.getByTestId('room-content');
      expect(content).toHaveTextContent('First child');
      expect(content).toHaveTextContent('Second child');
      expect(content).toHaveTextContent('Third child');
    });
  });

  /**
   * @group user-resolution
   * @description Tests for the user resolution functionality that converts
   * user IDs to user metadata for collaboration features.
   */
  describe('User Resolution', () => {
    /**
     * Test successful user resolution with valid response data.
     */
    test('resolves users successfully with valid data', async () => {
      mockGetUsers.mockResolvedValue({
        data: TEST_USERS
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-users');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledWith(['user1', 'user2']);
      });

      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });

    /**
     * Test error handling when user resolution fails.
     */
    test('handles user resolution errors gracefully', async () => {
      mockGetUsers.mockResolvedValue({
        error: 'User not found'
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-users');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledWith(['user1', 'user2']);
      });
      
      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });

    /**
     * Test that user resolution handles empty user arrays.
     */
    test('handles empty user arrays', async () => {
      mockGetUsers.mockResolvedValue({
        data: []
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-users');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledWith(['user1', 'user2']);
      });
    });

    /**
     * Test that user resolution throws an error for error responses.
     */
    test('throws error when getUsers returns error response', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockGetUsers.mockResolvedValue({
        error: 'Authentication failed'
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-users');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Mock resolveUsers error:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  /**
   * @group mention-suggestions
   * @description Tests for the mention suggestion functionality that provides
   * autocomplete suggestions for user mentions in collaboration contexts.
   */
  describe('Mention Suggestions', () => {
    /**
     * Test successful mention suggestion resolution.
     */
    test('resolves mention suggestions successfully', async () => {
      mockSearchUsers.mockResolvedValue({
        data: TEST_MENTIONS
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-mentions');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockSearchUsers).toHaveBeenCalledWith('john');
      });

      expect(mockSearchUsers).toHaveBeenCalledTimes(1);
    });

    /**
     * Test error handling for mention suggestion failures.
     */
    test('handles mention suggestion errors gracefully', async () => {
      mockSearchUsers.mockResolvedValue({
        error: 'Search failed'
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-mentions');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(mockSearchUsers).toHaveBeenCalledWith('john');
      });
      
      expect(mockSearchUsers).toHaveBeenCalledTimes(1);
    });

    /**
     * Test mention suggestions with empty results.
     */
    test('handles empty mention suggestion results', async () => {
      mockSearchUsers.mockResolvedValue({
        data: []
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-mentions');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockSearchUsers).toHaveBeenCalledWith('john');
      });
    });

    /**
     * Test that mention suggestions throw error for error responses.
     */
    test('throws error when searchUsers returns error response', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSearchUsers.mockResolvedValue({
        error: 'Network error'
      });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-mentions');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Mock resolveMentionSuggestions error:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  /**
   * @group edge-cases
   * @description Tests for edge cases and boundary conditions.
   */
  describe('Edge Cases and Error Handling', () => {
    /**
     * Test behavior with special characters in orgId.
     */
    test('handles special characters in orgId', () => {
      const specialOrgIds = [
        'org@special',
        'org#hash',
        'org$dollar',
        'org%percent',
        'org&ampersand'
      ];

      specialOrgIds.forEach((orgId) => {
        const { unmount } = render(
          <CollaborationProvider orgId={orgId}>
            <div>Content</div>
          </CollaborationProvider>
        );

        const room = screen.getByTestId('collaboration-room');
        expect(room).toHaveAttribute('data-room-id', `${orgId}:presence`);
        
        unmount();
      });
    });

    /**
     * Test component rerendering with different orgId values.
     */
    test('updates room ID when orgId changes', () => {
      const { rerender } = render(
        <CollaborationProvider orgId="org-1">
          <div>Content</div>
        </CollaborationProvider>
      );

      let room = screen.getByTestId('collaboration-room');
      expect(room).toHaveAttribute('data-room-id', 'org-1:presence');

      rerender(
        <CollaborationProvider orgId="different-org-456">
          <div>Content</div>
        </CollaborationProvider>
      );

      room = screen.getByTestId('collaboration-room');
      expect(room).toHaveAttribute('data-room-id', 'different-org-456:presence');
    });

    /**
     * Test that component handles null or undefined children gracefully.
     */
    test('handles null children gracefully', () => {
      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          {null}
        </CollaborationProvider>
      );

      const content = screen.getByTestId('room-content');
      expect(content).toBeInTheDocument();
    });

    /**
     * Test that component handles undefined children gracefully.
     */
    test('handles undefined children gracefully', () => {
      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          {undefined}
        </CollaborationProvider>
      );

      const content = screen.getByTestId('room-content');
      expect(content).toBeInTheDocument();
    });

    /**
     * Test component with very long orgId values.
     */
    test('handles long orgId values', () => {
      const longOrgId = 'a'.repeat(100);
      
      render(
        <CollaborationProvider orgId={longOrgId}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const room = screen.getByTestId('collaboration-room');
      expect(room).toHaveAttribute('data-room-id', `${longOrgId}:presence`);
    });
  });

  /**
   * @group integration
   * @description Integration tests that verify the component works correctly
   * with mock implementations of external dependencies.
   */
  describe('Integration Tests', () => {
    /**
     * Test that all resolver functions are properly bound to the Room component.
     */
    test('resolver functions are properly integrated with Room component', async () => {
      mockGetUsers.mockResolvedValue({ data: TEST_USERS });
      mockSearchUsers.mockResolvedValue({ data: ['user1'] });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Test Content</div>
        </CollaborationProvider>
      );

      // Test user resolution
      const userButton = screen.getByTestId('test-resolve-users');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledTimes(1);
      });

      // Test mention suggestions
      const mentionButton = screen.getByTestId('test-resolve-mentions');
      fireEvent.click(mentionButton);

      await waitFor(() => {
        expect(mockSearchUsers).toHaveBeenCalledTimes(1);
      });

      // Verify both functions were called independently
      expect(mockGetUsers).toHaveBeenCalledWith(['user1', 'user2']);
      expect(mockSearchUsers).toHaveBeenCalledWith('john');
    });

    /**
     * Test sequential calls to resolver functions.
     */
    test('handles sequential resolver function calls', async () => {
      mockGetUsers.mockResolvedValue({ data: TEST_USERS });

      render(
        <CollaborationProvider orgId={TEST_ORG_ID}>
          <div>Content</div>
        </CollaborationProvider>
      );

      const testButton = screen.getByTestId('test-resolve-users');
      
      // First call
      fireEvent.click(testButton);
      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledTimes(1);
      });

      // Second call
      fireEvent.click(testButton);
      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledTimes(2);
      });

      // Verify both calls had the same parameters
      expect(mockGetUsers).toHaveBeenNthCalledWith(1, ['user1', 'user2']);
      expect(mockGetUsers).toHaveBeenNthCalledWith(2, ['user1', 'user2']);
    });
  });
});

