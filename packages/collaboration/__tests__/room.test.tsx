/**
 * @fileoverview Collaboration Package Tests - Room React Component
 * 
 * Comprehensive test suite for the Room React component in the collaboration package.
 * Tests all component rendering scenarios, prop forwarding, provider integration,
 * error handling, and edge cases with comprehensive coverage.
 * 
 * **Test Scope:**
 * - Room component rendering with various prop combinations
 * - LiveblocksProvider and RoomProvider integration and configuration
 * - ClientSideSuspense behavior and fallback rendering
 * - Prop forwarding validation and component lifecycle
 * - Error boundary testing and invalid prop handling
 * 
 * **Test Categories:**
 * 1. **Component Rendering**: Basic rendering, prop combinations, children rendering, suspense behavior
 * 2. **Prop Forwarding**: Auth endpoint config, initial presence, room ID patterns, Liveblocks props
 * 3. **Provider Integration**: LiveblocksProvider wrapping, RoomProvider config, provider hierarchy
 * 4. **Error Handling**: Missing props, invalid room IDs, auth failures, network errors
 * 5. **Edge Cases**: Empty children, complex nested children, re-rendering, unmounting
 * 
 * **Mock Strategy:**
 * - Complete isolation of @liveblocks/react/suspense components
 * - React component lifecycle and prop forwarding validation
 * - Provider hierarchy and configuration testing
 * - Controlled error simulation for comprehensive error handling coverage
 * 
 * **Quality Standards:**
 * - 90%+ line coverage for room.tsx component
 * - All component paths and prop combinations tested
 * - Error scenarios and edge cases thoroughly validated
 * - Clear, descriptive test cases following React testing best practices
 * - Component lifecycle and cleanup validation
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';

// Mock the Liveblocks React components
const mockLiveblocksProvider = vi.fn();
const mockRoomProvider = vi.fn();
const mockClientSideSuspense = vi.fn();

vi.mock('@liveblocks/react/suspense', () => ({
  LiveblocksProvider: mockLiveblocksProvider,
  RoomProvider: mockRoomProvider,
  ClientSideSuspense: mockClientSideSuspense,
}));

// Mock components are now defined inline in beforeEach to prevent recursive calls

// Helper function to check mock calls with React's additional arguments
const expectMockCalledWith = (mockFn: any, expectedProps: any) => {
  const calls = mockFn.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const [firstCall] = calls;
  const [actualProps] = firstCall;
  
  // Extract only the expected properties from actual props for comparison
  const relevantProps = Object.keys(expectedProps).reduce((acc, key) => {
    acc[key] = actualProps[key];
    return acc;
  }, {} as any);
  
  expect(relevantProps).toEqual(expect.objectContaining(expectedProps));
};

describe('Collaboration Room Component', () => {
  beforeEach(() => {
    // Reset all mocks with fresh implementations
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default mock implementations - avoid recursive calls
    mockLiveblocksProvider.mockImplementation(({ children, ...props }: any) => {
      return <div data-testid="liveblocks-provider" {...props}>{children}</div>;
    });
    mockRoomProvider.mockImplementation(({ children, ...props }: any) => {
      return <div data-testid="room-provider" {...props}>{children}</div>;
    });
    mockClientSideSuspense.mockImplementation(({ children, fallback, ...props }: any) => {
      return (
        <div data-testid="client-side-suspense" {...props}>
          {children || fallback}
        </div>
      );
    });
  });

  afterEach(() => {
    // Complete cleanup
    cleanup();
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Component Rendering Scenarios', () => {
    it('should render with required props only', async () => {
      const { Room } = await import('../room.js');

      const requiredProps = {
        id: 'test-room-123',
        authEndpoint: '/api/liveblocks-auth',
        fallback: <div data-testid="loading">Loading...</div>,
        children: <div data-testid="room-content">Room Content</div>,
      };

      render(<Room {...requiredProps} />);

      // Verify basic structure is rendered
      expect(screen.getByTestId('liveblocks-provider')).toBeInTheDocument();
      expect(screen.getByTestId('room-provider')).toBeInTheDocument();
      expect(screen.getByTestId('client-side-suspense')).toBeInTheDocument();
      expect(screen.getByTestId('room-content')).toBeInTheDocument();

      // Verify providers were called with correct props
      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/liveblocks-auth',
      });

      expectMockCalledWith(mockRoomProvider, {
        id: 'test-room-123',
        initialPresence: { cursor: null },
      });
    });

    it('should render with all optional props', async () => {
      const { Room } = await import('../room.js');

      const mockResolveUsers = vi.fn().mockResolvedValue([
        { name: 'John Doe', avatar: 'avatar.jpg' }
      ]);

      const mockResolveMentionSuggestions = vi.fn().mockResolvedValue([
        'user1', 'user2'
      ]);

      const allProps = {
        id: 'comprehensive-room',
        authEndpoint: '/api/comprehensive-auth',
        fallback: <div data-testid="comprehensive-loading">Loading...</div>,
        children: <div data-testid="comprehensive-content">Comprehensive Content</div>,
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 100,
        lostConnectionTimeout: 5000,
        backgroundKeepAliveTimeout: 15000,
      };

      render(<Room {...allProps} />);

      // Verify all components are rendered
      expect(screen.getByTestId('liveblocks-provider')).toBeInTheDocument();
      expect(screen.getByTestId('room-provider')).toBeInTheDocument();
      expect(screen.getByTestId('client-side-suspense')).toBeInTheDocument();
      expect(screen.getByTestId('comprehensive-content')).toBeInTheDocument();

      // Verify LiveblocksProvider received all forwarded props
      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/comprehensive-auth',
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 100,
        lostConnectionTimeout: 5000,
        backgroundKeepAliveTimeout: 15000,
      });

      // Verify RoomProvider configuration
      expectMockCalledWith(mockRoomProvider, {
        id: 'comprehensive-room',
        initialPresence: { cursor: null },
      });
    });

    it('should render children components correctly', async () => {
      const { Room } = await import('../room.js');

      const ComplexChildren = () => (
        <div data-testid="complex-children">
          <h1>Room Header</h1>
          <div data-testid="room-toolbar">Toolbar</div>
          <div data-testid="room-canvas">Canvas</div>
          <footer data-testid="room-footer">Footer</footer>
        </div>
      );

      const props = {
        id: 'children-test-room',
        authEndpoint: '/api/auth',
        fallback: <div data-testid="children-loading">Loading...</div>,
        children: <ComplexChildren />,
      };

      render(<Room {...props} />);

      // Verify all child elements are rendered
      expect(screen.getByTestId('complex-children')).toBeInTheDocument();
      expect(screen.getByText('Room Header')).toBeInTheDocument();
      expect(screen.getByTestId('room-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('room-footer')).toBeInTheDocument();
    });

    it('should render suspense fallback when appropriate', async () => {
      const { Room } = await import('../room.js');

      // Mock ClientSideSuspense to show fallback
      mockClientSideSuspense.mockImplementation(({ fallback }: any) => {
        return <div data-testid="client-side-suspense">{fallback}</div>;
      });

      const props = {
        id: 'suspense-room',
        authEndpoint: '/api/auth',
        fallback: <div data-testid="suspense-fallback">Loading Room...</div>,
        children: <div data-testid="suspense-content">Room Content</div>,
      };

      render(<Room {...props} />);

      // Verify fallback is shown instead of children
      expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
      expect(screen.getByText('Loading Room...')).toBeInTheDocument();
      expect(screen.queryByTestId('suspense-content')).not.toBeInTheDocument();

      // Verify ClientSideSuspense was called with fallback
      expectMockCalledWith(mockClientSideSuspense, {
        fallback: expect.any(Object),
      });
    });

    it('should handle multiple child components', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'multi-child-room',
        authEndpoint: '/api/auth',
        fallback: <div data-testid="multi-loading">Loading...</div>,
        children: (
          <>
            <div data-testid="child-1">First Child</div>
            <div data-testid="child-2">Second Child</div>
            <div data-testid="child-3">Third Child</div>
          </>
        ),
      };

      render(<Room {...props} />);

      // Verify all children are rendered
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });
  });

  describe('Prop Forwarding Validation', () => {
    it('should forward auth endpoint configuration correctly', async () => {
      const { Room } = await import('../room.js');

      const authEndpoints = [
        '/api/liveblocks-auth',
        '/api/v1/collaboration/auth',
        'https://api.example.com/liveblocks/auth',
        '/custom-auth-endpoint',
      ];

      for (const authEndpoint of authEndpoints) {
        vi.clearAllMocks();

        const props = {
          id: `room-${authEndpoint.replace(/[^a-zA-Z0-9]/g, '-')}`,
          authEndpoint,
          fallback: <div>Loading...</div>,
          children: <div>Content</div>,
        };

        render(<Room {...props} />);

        expectMockCalledWith(mockLiveblocksProvider, {
          authEndpoint,
        });

        cleanup();
      }
    });

    it('should forward initial presence state correctly', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'presence-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      };

      render(<Room {...props} />);

      // Verify initialPresence is set to default cursor: null
      expectMockCalledWith(mockRoomProvider, {
        initialPresence: { cursor: null },
      });
    });

    it('should handle various room ID patterns', async () => {
      const { Room } = await import('../room.js');

      const roomIdPatterns = [
        'simple-room',
        'room_with_underscores',
        'room-with-dashes',
        'RoomWithCamelCase',
        'room123WithNumbers',
        'room:with:colons',
        'room/with/slashes',
        'org_456:room_789',
        'very-long-room-id-with-many-characters-and-separators',
      ];

      for (const roomId of roomIdPatterns) {
        vi.clearAllMocks();

        const props = {
          id: roomId,
          authEndpoint: '/api/auth',
          fallback: <div>Loading...</div>,
          children: <div>Content</div>,
        };

        render(<Room {...props} />);

        expectMockCalledWith(mockRoomProvider, {
          id: roomId,
        });

        cleanup();
      }
    });

    it('should forward all Liveblocks provider props', async () => {
      const { Room } = await import('../room.js');

      const mockResolveUsers = vi.fn();
      const mockResolveMentionSuggestions = vi.fn();

      const liveblocksProps = {
        id: 'forwarding-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 250,
        lostConnectionTimeout: 10000,
        backgroundKeepAliveTimeout: 30000,
        polite: true,
      };

      render(<Room {...liveblocksProps} />);

      // Verify all props except Room-specific ones are forwarded to LiveblocksProvider
      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/auth',
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 250,
        lostConnectionTimeout: 10000,
        backgroundKeepAliveTimeout: 30000,
        polite: true,
      });

      // Verify Room-specific props are not forwarded to LiveblocksProvider
      const liveblocksCall = mockLiveblocksProvider.mock.calls[0][0];
      expect(liveblocksCall).not.toHaveProperty('id');
      expect(liveblocksCall).not.toHaveProperty('fallback');
      // Note: children will be present as React components but they're the RoomProvider children
    });

    it('should handle custom Liveblocks provider configuration', async () => {
      const { Room } = await import('../room.js');

      const customConfig = {
        id: 'custom-config-room',
        authEndpoint: '/api/custom-auth',
        fallback: <div data-testid="custom-loading">Custom Loading</div>,
        children: <div data-testid="custom-content">Custom Content</div>,
        // Remove publicApiKey due to type compatibility issues
        // publicApiKey: 'pk_test_custom_key',
        baseUrl: 'https://custom.liveblocks.io',
        enabledFeatures: ['comments', 'notifications'],
      };

      render(<Room {...customConfig} />);

      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/custom-auth',
        // Remove publicApiKey from expected calls
        // publicApiKey: 'pk_test_custom_key',
        baseUrl: 'https://custom.liveblocks.io',
        enabledFeatures: ['comments', 'notifications'],
      });
    });
  });

  describe('Integration with Providers', () => {
    it('should wrap components in correct provider hierarchy', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'hierarchy-room',
        authEndpoint: '/api/auth',
        fallback: <div data-testid="hierarchy-loading">Loading...</div>,
        children: <div data-testid="hierarchy-content">Content</div>,
      };

      render(<Room {...props} />);

      // Verify provider hierarchy through DOM structure
      const liveblocksProvider = screen.getByTestId('liveblocks-provider');
      const roomProvider = screen.getByTestId('room-provider');
      const clientSideSuspense = screen.getByTestId('client-side-suspense');

      expect(liveblocksProvider).toBeInTheDocument();
      expect(roomProvider).toBeInTheDocument();
      expect(clientSideSuspense).toBeInTheDocument();

      // Verify RoomProvider is inside LiveblocksProvider
      expect(liveblocksProvider).toContainElement(roomProvider);
      
      // Verify ClientSideSuspense is inside RoomProvider
      expect(roomProvider).toContainElement(clientSideSuspense);
      
      // Verify content is inside ClientSideSuspense
      expect(clientSideSuspense).toContainElement(screen.getByTestId('hierarchy-content'));
    });

    it('should configure LiveblocksProvider correctly', async () => {
      const { Room } = await import('../room.js');

      const mockResolveUsers = vi.fn();
      const mockResolveMentionSuggestions = vi.fn();

      const props = {
        id: 'liveblocks-config-room',
        authEndpoint: '/api/liveblocks-config',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 150,
      };

      render(<Room {...props} />);

      // Verify LiveblocksProvider configuration
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);
      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/liveblocks-config',
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 150,
      });
    });

    it('should configure RoomProvider correctly', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'room-config-test',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      };

      render(<Room {...props} />);

      // Verify RoomProvider configuration
      expect(mockRoomProvider).toHaveBeenCalledTimes(1);
      expectMockCalledWith(mockRoomProvider, {
        id: 'room-config-test',
        initialPresence: { cursor: null },
      });
    });

    it('should configure ClientSideSuspense behavior', async () => {
      const { Room } = await import('../room.js');

      const fallbackComponent = <div data-testid="suspense-test-loading">Suspense Loading</div>;

      const props = {
        id: 'suspense-config-room',
        authEndpoint: '/api/auth',
        fallback: fallbackComponent,
        children: <div data-testid="suspense-test-content">Suspense Content</div>,
      };

      render(<Room {...props} />);

      // Verify ClientSideSuspense was called with correct fallback
      expect(mockClientSideSuspense).toHaveBeenCalledTimes(1);
      expectMockCalledWith(mockClientSideSuspense, {
        fallback: fallbackComponent,
      });
    });

    it('should validate provider hierarchy with multiple renders', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'multi-render-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div data-testid="multi-render-content">Content</div>,
      };

      // Render multiple times to ensure consistent behavior
      const { rerender } = render(<Room {...props} />);

      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);
      expect(mockRoomProvider).toHaveBeenCalledTimes(1);
      expect(mockClientSideSuspense).toHaveBeenCalledTimes(1);

      // Re-render with updated props
      rerender(<Room {...props} id="updated-room" />);

      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(2);
      expect(mockRoomProvider).toHaveBeenCalledTimes(2);
      expect(mockClientSideSuspense).toHaveBeenCalledTimes(2);

      // Verify the updated room ID was used
      const lastCall = mockRoomProvider.mock.calls[mockRoomProvider.mock.calls.length - 1][0];
      expect(lastCall.id).toBe('updated-room');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required props gracefully', async () => {
      const { Room } = await import('../room.js');

      // Test with missing id prop
      const propsWithoutId = {
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      } as any;

      expect(() => {
        render(<Room {...propsWithoutId} />);
      }).not.toThrow();

      // Verify providers were still called (TypeScript would catch this in real usage)
      expect(mockLiveblocksProvider).toHaveBeenCalled();
      expect(mockRoomProvider).toHaveBeenCalled();
    });

    it('should handle missing authEndpoint prop', async () => {
      const { Room } = await import('../room.js');

      const propsWithoutAuth = {
        id: 'no-auth-room',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      } as any;

      expect(() => {
        render(<Room {...propsWithoutAuth} />);
      }).not.toThrow();

      // Verify components still render
      expect(screen.getByTestId('liveblocks-provider')).toBeInTheDocument();
      expect(screen.getByTestId('room-provider')).toBeInTheDocument();
    });

    it('should handle invalid room IDs', async () => {
      const { Room } = await import('../room.js');

      const invalidRoomIds = [
        '', // empty string
        null as any, // null
        undefined as any, // undefined
        123 as any, // number
        {} as any, // object
        [] as any, // array
      ];

      for (const invalidId of invalidRoomIds) {
        vi.clearAllMocks();

        const props = {
          id: invalidId,
          authEndpoint: '/api/auth',
          fallback: <div>Loading...</div>,
          children: <div>Content</div>,
        };

        expect(() => {
          render(<Room {...props} />);
        }).not.toThrow();

        // Verify RoomProvider was called with the invalid ID
        expectMockCalledWith(mockRoomProvider, {
          id: invalidId,
        });

        cleanup();
      }
    });

    it('should handle auth endpoint failures', async () => {
      const { Room } = await import('../room.js');

      // Mock LiveblocksProvider to simulate auth failure
      mockLiveblocksProvider.mockImplementation(({ children, ...props }: any) => {
        throw new Error('Authentication failed');
      });

      const props = {
        id: 'auth-error-room',
        authEndpoint: '/api/failing-auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      };

      expect(() => {
        render(<Room {...props} />);
      }).toThrow('Authentication failed');

      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/failing-auth',
      });
    });

    it('should handle network errors', async () => {
      const { Room } = await import('../room.js');

      // Mock ClientSideSuspense to simulate network error
      mockClientSideSuspense.mockImplementation(({ children, fallback }: any) => {
        throw new Error('Network timeout');
      });

      const props = {
        id: 'network-error-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      };

      expect(() => {
        render(<Room {...props} />);
      }).toThrow('Network timeout');
    });

    it('should handle provider initialization errors', async () => {
      const { Room } = await import('../room.js');

      // Mock RoomProvider to simulate initialization error
      mockRoomProvider.mockImplementation(({ children, ...props }: any) => {
        throw new Error('Room initialization failed');
      });

      const props = {
        id: 'init-error-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      };

      expect(() => {
        render(<Room {...props} />);
      }).toThrow('Room initialization failed');
    });

    it('should handle malformed props gracefully', async () => {
      const { Room } = await import('../room.js');

      const malformedProps = {
        id: 'malformed-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
        resolveUsers: 'not-a-function' as any,
        resolveMentionSuggestions: 123 as any,
        throttle: 'invalid' as any,
      };

      expect(() => {
        render(<Room {...malformedProps} />);
      }).not.toThrow();

      // Verify malformed props are still forwarded
      expectMockCalledWith(mockLiveblocksProvider, {
        resolveUsers: 'not-a-function',
        resolveMentionSuggestions: 123,
        throttle: 'invalid',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'empty-children-room',
        authEndpoint: '/api/auth',
        fallback: <div data-testid="empty-loading">Loading...</div>,
        children: null,
      };

      render(<Room {...props} />);

      // Verify providers are still rendered
      expect(screen.getByTestId('liveblocks-provider')).toBeInTheDocument();
      expect(screen.getByTestId('room-provider')).toBeInTheDocument();
      expect(screen.getByTestId('client-side-suspense')).toBeInTheDocument();

      // Verify ClientSideSuspense received null children
      expectMockCalledWith(mockClientSideSuspense, {
        fallback: expect.any(Object),
      });
    });

    it('should handle complex nested children', async () => {
      const { Room } = await import('../room.js');

      const NestedComponent = () => (
        <div data-testid="nested-root">
          <div data-testid="level-1">
            <div data-testid="level-2">
              <div data-testid="level-3">
                <span data-testid="deep-content">Deep nested content</span>
              </div>
            </div>
          </div>
        </div>
      );

      const props = {
        id: 'nested-children-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <NestedComponent />,
      };

      render(<Room {...props} />);

      // Verify all nested elements are rendered
      expect(screen.getByTestId('nested-root')).toBeInTheDocument();
      expect(screen.getByTestId('level-1')).toBeInTheDocument();
      expect(screen.getByTestId('level-2')).toBeInTheDocument();
      expect(screen.getByTestId('level-3')).toBeInTheDocument();
      expect(screen.getByTestId('deep-content')).toBeInTheDocument();
      expect(screen.getByText('Deep nested content')).toBeInTheDocument();
    });

    it('should handle re-rendering behavior', async () => {
      const { Room } = await import('../room.js');

      const initialProps = {
        id: 'rerender-room',
        authEndpoint: '/api/auth',
        fallback: <div data-testid="initial-loading">Initial Loading</div>,
        children: <div data-testid="initial-content">Initial Content</div>,
      };

      const { rerender } = render(<Room {...initialProps} />);

      // Verify initial render
      expect(screen.getByTestId('initial-content')).toBeInTheDocument();
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);
      expect(mockRoomProvider).toHaveBeenCalledTimes(1);

      // Re-render with updated props
      const updatedProps = {
        ...initialProps,
        id: 'updated-rerender-room',
        authEndpoint: '/api/updated-auth',
        children: <div data-testid="updated-content">Updated Content</div>,
      };

      rerender(<Room {...updatedProps} />);

      // Verify updated render
      expect(screen.getByTestId('updated-content')).toBeInTheDocument();
      expect(screen.queryByTestId('initial-content')).not.toBeInTheDocument();
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(2);
      expect(mockRoomProvider).toHaveBeenCalledTimes(2);

      // Verify updated props were used
      const lastLiveblocksCall = mockLiveblocksProvider.mock.calls[mockLiveblocksProvider.mock.calls.length - 1][0];
      expect(lastLiveblocksCall.authEndpoint).toBe('/api/updated-auth');
      
      const lastRoomCall = mockRoomProvider.mock.calls[mockRoomProvider.mock.calls.length - 1][0];
      expect(lastRoomCall.id).toBe('updated-rerender-room');
    });

    it('should handle unmounting and cleanup', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'unmount-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div data-testid="unmount-content">Content</div>,
      };

      const { unmount } = render(<Room {...props} />);

      // Verify component is mounted
      expect(screen.getByTestId('unmount-content')).toBeInTheDocument();
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);

      // Unmount component
      unmount();

      // Verify component is unmounted
      expect(screen.queryByTestId('unmount-content')).not.toBeInTheDocument();
    });

    it('should handle rapid prop changes', async () => {
      const { Room } = await import('../room.js');

      const baseProps = {
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
      };

      const { rerender } = render(<Room {...baseProps} id="rapid-1" />);

      // Rapidly change room IDs
      const roomIds = ['rapid-2', 'rapid-3', 'rapid-4', 'rapid-5'];
      
      roomIds.forEach((id) => {
        rerender(<Room {...baseProps} id={id} />);
      });

      // Verify all renders occurred
      expect(mockRoomProvider).toHaveBeenCalledTimes(5); // initial + 4 rerenders

      // Verify last call used final ID
      const lastCall = mockRoomProvider.mock.calls[mockRoomProvider.mock.calls.length - 1][0];
      expect(lastCall.id).toBe('rapid-5');
    });

    it('should handle special character room IDs', async () => {
      const { Room } = await import('../room.js');

      const specialCharacterIds = [
        'room@with#special$chars',
        'room with spaces',
        'room\nwith\nnewlines',
        'room\twith\ttabs',
        'room-with-émojis-🎉',
        'room/with/forward/slashes',
        'room\\with\\back\\slashes',
        'room?with=query&params',
      ];

      for (const roomId of specialCharacterIds) {
        vi.clearAllMocks();

        const props = {
          id: roomId,
          authEndpoint: '/api/auth',
          fallback: <div>Loading...</div>,
          children: <div>Content</div>,
        };

        render(<Room {...props} />);

        expectMockCalledWith(mockRoomProvider, {
          id: roomId,
        });

        cleanup();
      }
    });

    it('should handle null and undefined fallback', async () => {
      const { Room } = await import('../room.js');

      const testCases = [
        { fallback: null, testId: 'null-fallback' },
        { fallback: undefined, testId: 'undefined-fallback' },
      ];

      for (const { fallback, testId } of testCases) {
        vi.clearAllMocks();

        const props = {
          id: `${testId}-room`,
          authEndpoint: '/api/auth',
          fallback: fallback as any,
          children: <div data-testid={testId}>Content</div>,
        };

        render(<Room {...props} />);

        expectMockCalledWith(mockClientSideSuspense, {
          fallback,
        });

        cleanup();
      }
    });

    it('should handle very long room IDs', async () => {
      const { Room } = await import('../room.js');

      const longRoomId = 'very-long-room-id-'.repeat(100) + 'end';

      const props = {
        id: longRoomId,
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div data-testid="long-id-content">Content</div>,
      };

      render(<Room {...props} />);

      expect(screen.getByTestId('long-id-content')).toBeInTheDocument();
      expectMockCalledWith(mockRoomProvider, {
        id: longRoomId,
      });

      // Verify the long ID doesn't break anything
      expect(longRoomId.length).toBeGreaterThan(1000);
    });
  });

  describe('Component Lifecycle and Performance', () => {
    it('should render efficiently with minimal re-renders', async () => {
      const { Room } = await import('../room.js');

      const props = {
        id: 'performance-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div data-testid="performance-content">Content</div>,
      };

      render(<Room {...props} />);

      // Verify single render call
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);
      expect(mockRoomProvider).toHaveBeenCalledTimes(1);
      expect(mockClientSideSuspense).toHaveBeenCalledTimes(1);
    });

    it('should handle component props consistency', async () => {
      const { Room } = await import('../room.js');

      const mockResolveUsers = vi.fn();
      const mockResolveMentionSuggestions = vi.fn();

      const props = {
        id: 'consistency-room',
        authEndpoint: '/api/auth',
        fallback: <div>Loading...</div>,
        children: <div>Content</div>,
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
      };

      render(<Room {...props} />);

      // Verify prop consistency across providers
      expectMockCalledWith(mockLiveblocksProvider, {
        authEndpoint: '/api/auth',
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
      });

      expectMockCalledWith(mockRoomProvider, {
        id: 'consistency-room',
        initialPresence: { cursor: null },
      });
    });

    it('should maintain component integrity under stress', async () => {
      const { Room } = await import('../room.js');

      // Stress test with many props and complex children
      const stressProps = {
        id: 'stress-test-room-with-very-long-name-and-special-characters-@#$%',
        authEndpoint: '/api/stress-test-auth-endpoint-with-long-path',
        fallback: (
          <div data-testid="stress-fallback">
            <div>Loading layer 1</div>
            <div>Loading layer 2</div>
            <div>Loading layer 3</div>
          </div>
        ),
        children: (
          <div data-testid="stress-children">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} data-testid={`stress-child-${i}`}>
                Child {i}
              </div>
            ))}
          </div>
        ),
        resolveUsers: vi.fn().mockResolvedValue([]),
        resolveMentionSuggestions: vi.fn().mockResolvedValue([]),
        throttle: 500,
        lostConnectionTimeout: 15000,
        backgroundKeepAliveTimeout: 45000,
      };

      render(<Room {...stressProps} />);

      // Verify stress test components render
      expect(screen.getByTestId('stress-children')).toBeInTheDocument();
      expect(screen.getByTestId('stress-child-0')).toBeInTheDocument();
      expect(screen.getByTestId('stress-child-49')).toBeInTheDocument();

      // Verify all providers were called correctly
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);
      expect(mockRoomProvider).toHaveBeenCalledTimes(1);
      expect(mockClientSideSuspense).toHaveBeenCalledTimes(1);
    });
  });
});