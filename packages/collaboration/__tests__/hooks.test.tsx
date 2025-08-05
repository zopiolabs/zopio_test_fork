/**
 * @fileoverview Collaboration Package Tests - Hooks Re-exports
 * 
 * Comprehensive test suite for the hooks re-exports in the collaboration package.
 * Tests validation of re-exported hooks from @liveblocks/react/suspense to ensure 
 * proper export functionality, integration with Room context, and type safety.
 * 
 * **Test Scope:**
 * - Re-export validation and hook signature preservation
 * - Hook usage within Room context and provider integration
 * - Type safety validation and TypeScript type preservation
 * - Integration scenarios and common usage patterns
 * - Error handling when used outside proper context
 * 
 * **Test Categories:**
 * 1. **Re-export Validation**: Hook availability, signature matching, type preservation
 * 2. **Room Context Integration**: Hook usage within Room component, provider dependency
 * 3. **Type Safety**: TypeScript type preservation, generic handling, inference validation
 * 4. **Integration Scenarios**: Common patterns, multiple hook usage, cleanup behavior
 * 5. **Error Handling**: Outside context usage, invalid states, provider errors
 * 
 * **Mock Strategy:**
 * - Complete isolation of @liveblocks/react/suspense hooks
 * - Provider context simulation for Room integration tests
 * - Type checking validation through compilation and runtime checks
 * - Controlled error simulation for comprehensive error handling coverage
 * 
 * **Quality Standards:**
 * - Validate all re-exports are properly forwarded
 * - Test hook integration with Room context
 * - Ensure TypeScript types are preserved correctly
 * - Keep tests focused on re-export functionality (not hook implementation)
 * - Clear, descriptive test cases following React hooks testing best practices
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { render, screen, cleanup, renderHook } from '@testing-library/react';
import { act } from 'react';
import React, { type ReactNode } from 'react';

// Mock the Liveblocks React hooks and components
const mockUseRoom = vi.fn();
const mockUseMyPresence = vi.fn();
const mockUseOthers = vi.fn();
const mockUseSelf = vi.fn();
const mockUseStorage = vi.fn();
const mockUseMutation = vi.fn();
const mockUseHistory = vi.fn();
const mockUseUndo = vi.fn();
const mockUseRedo = vi.fn();
const mockUseCanUndo = vi.fn();
const mockUseCanRedo = vi.fn();
const mockUseBatch = vi.fn();
const mockUseStatus = vi.fn();
const mockUseUser = vi.fn();
const mockUseOther = vi.fn();
const mockUseBroadcastEvent = vi.fn();
const mockUseEventListener = vi.fn();
const mockUseErrorListener = vi.fn();
const mockUseLostConnectionListener = vi.fn();

// Mock Room provider components for testing
const mockRoomProvider = vi.fn();
const mockLiveblocksProvider = vi.fn();

vi.mock('@liveblocks/react/suspense', () => ({
  // Core hooks
  useRoom: mockUseRoom,
  useMyPresence: mockUseMyPresence,
  useOthers: mockUseOthers,
  useSelf: mockUseSelf,
  
  // Storage hooks
  useStorage: mockUseStorage,
  useMutation: mockUseMutation,
  
  // History hooks
  useHistory: mockUseHistory,
  useUndo: mockUseUndo,
  useRedo: mockUseRedo,
  useCanUndo: mockUseCanUndo,
  useCanRedo: mockUseCanRedo,
  useBatch: mockUseBatch,
  
  // Status and user hooks
  useStatus: mockUseStatus,
  useUser: mockUseUser,
  useOther: mockUseOther,
  
  // Event hooks
  useBroadcastEvent: mockUseBroadcastEvent,
  useEventListener: mockUseEventListener,
  useErrorListener: mockUseErrorListener,
  
  // Connection hooks
  useLostConnectionListener: mockUseLostConnectionListener,
  
  // Provider components for testing context
  RoomProvider: mockRoomProvider,
  LiveblocksProvider: mockLiveblocksProvider,
}));

// Test wrapper component that provides Room context
const TestRoomWrapper = ({ children }: { children: ReactNode }) => {
  // Setup default mock implementations for providers
  mockLiveblocksProvider.mockImplementation(({ children }: any) => (
    <div data-testid="liveblocks-provider">{children}</div>
  ));
  mockRoomProvider.mockImplementation(({ children }: any) => (
    <div data-testid="room-provider">{children}</div>
  ));

  return (
    <div data-testid="liveblocks-provider">
      <div data-testid="room-provider">{children}</div>
    </div>
  );
};

describe('Collaboration Hooks Re-exports', () => {
  beforeEach(() => {
    // Reset all mocks with default implementations
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default mock return values for hooks
    mockUseRoom.mockReturnValue({ id: 'test-room' });
    mockUseMyPresence.mockReturnValue([{ cursor: null }, vi.fn()]);
    mockUseOthers.mockReturnValue([]);
    mockUseSelf.mockReturnValue({ connectionId: 'test-connection', presence: { cursor: null } });
    mockUseStorage.mockReturnValue(null);
    mockUseMutation.mockReturnValue(vi.fn());
    mockUseHistory.mockReturnValue({ canUndo: false, canRedo: false });
    mockUseUndo.mockReturnValue(vi.fn());
    mockUseRedo.mockReturnValue(vi.fn());
    mockUseCanUndo.mockReturnValue(false);
    mockUseCanRedo.mockReturnValue(false);
    mockUseBatch.mockReturnValue(vi.fn());
    mockUseStatus.mockReturnValue('connected');
    mockUseUser.mockReturnValue({ isLoading: false, user: { name: 'Test User', color: '#000' }, error: undefined });
    mockUseOther.mockReturnValue(null);
    mockUseBroadcastEvent.mockReturnValue(vi.fn());
    mockUseEventListener.mockImplementation(() => {});
    mockUseErrorListener.mockImplementation(() => {});
    mockUseLostConnectionListener.mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Re-export Validation', () => {
    it('should re-export all core hooks from @liveblocks/react/suspense', async () => {
      const hooks = await import('../hooks.js');

      // Verify core hooks are available
      expect(hooks.useRoom).toBeDefined();
      expect(hooks.useMyPresence).toBeDefined();
      expect(hooks.useOthers).toBeDefined();
      expect(hooks.useSelf).toBeDefined();
      
      // Verify all hooks are functions
      expect(typeof hooks.useRoom).toBe('function');
      expect(typeof hooks.useMyPresence).toBe('function');
      expect(typeof hooks.useOthers).toBe('function');
      expect(typeof hooks.useSelf).toBe('function');
    });

    it('should re-export all storage hooks from @liveblocks/react/suspense', async () => {
      const hooks = await import('../hooks.js');

      // Verify storage hooks are available
      expect(hooks.useStorage).toBeDefined();
      expect(hooks.useMutation).toBeDefined();
      
      // Verify all hooks are functions
      expect(typeof hooks.useStorage).toBe('function');
      expect(typeof hooks.useMutation).toBe('function');
    });

    it('should re-export all history hooks from @liveblocks/react/suspense', async () => {
      const hooks = await import('../hooks.js');

      // Verify history hooks are available
      expect(hooks.useHistory).toBeDefined();
      expect(hooks.useUndo).toBeDefined();
      expect(hooks.useRedo).toBeDefined();
      expect(hooks.useCanUndo).toBeDefined();
      expect(hooks.useCanRedo).toBeDefined();
      expect(hooks.useBatch).toBeDefined();
      
      // Verify all hooks are functions
      expect(typeof hooks.useHistory).toBe('function');
      expect(typeof hooks.useUndo).toBe('function');
      expect(typeof hooks.useRedo).toBe('function');
      expect(typeof hooks.useCanUndo).toBe('function');
      expect(typeof hooks.useCanRedo).toBe('function');
      expect(typeof hooks.useBatch).toBe('function');
    });

    it('should re-export all user and status hooks from @liveblocks/react/suspense', async () => {
      const hooks = await import('../hooks.js');

      // Verify user and status hooks are available
      expect(hooks.useStatus).toBeDefined();
      expect(hooks.useUser).toBeDefined();
      expect(hooks.useOther).toBeDefined();
      
      // Verify all hooks are functions
      expect(typeof hooks.useStatus).toBe('function');
      expect(typeof hooks.useUser).toBe('function');
      expect(typeof hooks.useOther).toBe('function');
    });

    it('should re-export all event hooks from @liveblocks/react/suspense', async () => {
      const hooks = await import('../hooks.js');

      // Verify event hooks are available
      expect(hooks.useBroadcastEvent).toBeDefined();
      expect(hooks.useEventListener).toBeDefined();
      expect(hooks.useErrorListener).toBeDefined();
      
      // Verify all hooks are functions
      expect(typeof hooks.useBroadcastEvent).toBe('function');
      expect(typeof hooks.useEventListener).toBe('function');
      expect(typeof hooks.useErrorListener).toBe('function');
    });

    it('should re-export all connection hooks from @liveblocks/react/suspense', async () => {
      const hooks = await import('../hooks.js');

      // Verify connection hooks are available
      expect(hooks.useLostConnectionListener).toBeDefined();
      
      // Verify all hooks are functions
      expect(typeof hooks.useLostConnectionListener).toBe('function');
    });

    it('should preserve hook signatures and behavior from original exports', async () => {
      const hooks = await import('../hooks.js');

      // Test that hooks maintain their original signatures by checking they call the mocked versions
      renderHook(() => hooks.useRoom(), { wrapper: TestRoomWrapper });
      expect(mockUseRoom).toHaveBeenCalledTimes(1);

      renderHook(() => hooks.useMyPresence(), { wrapper: TestRoomWrapper });
      expect(mockUseMyPresence).toHaveBeenCalledTimes(1);

      renderHook(() => hooks.useOthers(), { wrapper: TestRoomWrapper });
      expect(mockUseOthers).toHaveBeenCalledTimes(1);

      renderHook(() => hooks.useSelf(), { wrapper: TestRoomWrapper });
      expect(mockUseSelf).toHaveBeenCalledTimes(1);
    });

    it('should maintain hook return value structures', async () => {
      const hooks = await import('../hooks.js');

      const { result: roomResult } = renderHook(() => hooks.useRoom(), { wrapper: TestRoomWrapper });
      expect(roomResult.current).toEqual({ id: 'test-room' });

      const { result: presenceResult } = renderHook(() => hooks.useMyPresence(), { wrapper: TestRoomWrapper });
      expect(presenceResult.current).toEqual([{ cursor: null }, expect.any(Function)]);

      const { result: othersResult } = renderHook(() => hooks.useOthers(), { wrapper: TestRoomWrapper });
      expect(othersResult.current).toEqual([]);

      const { result: statusResult } = renderHook(() => hooks.useStatus(), { wrapper: TestRoomWrapper });
      expect(statusResult.current).toEqual('connected');
    });
  });

  describe('Room Context Integration', () => {
    it('should work correctly within Room provider context', async () => {
      const hooks = await import('../hooks.js');

      const TestComponent = () => {
        const room = hooks.useRoom();
        const [myPresence] = hooks.useMyPresence();
        const others = hooks.useOthers();
        const status = hooks.useStatus();

        return (
          <div data-testid="hook-consumer">
            <div data-testid="room-id">{room.id}</div>
            <div data-testid="presence-cursor">{JSON.stringify(myPresence.cursor)}</div>
            <div data-testid="others-count">{others.length}</div>
            <div data-testid="connection-status">{status}</div>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <TestComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('hook-consumer')).toBeInTheDocument();
      expect(screen.getByTestId('room-id')).toHaveTextContent('test-room');
      expect(screen.getByTestId('presence-cursor')).toHaveTextContent('null');
      expect(screen.getByTestId('others-count')).toHaveTextContent('0');
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');

      // Verify all hooks were called
      expect(mockUseRoom).toHaveBeenCalled();
      expect(mockUseMyPresence).toHaveBeenCalled();
      expect(mockUseOthers).toHaveBeenCalled();
      expect(mockUseStatus).toHaveBeenCalled();
    });

    it('should support multiple hooks used together', async () => {
      const hooks = await import('../hooks.js');

      const ComplexComponent = () => {
        const room = hooks.useRoom();
        const [myPresence, updateMyPresence] = hooks.useMyPresence();
        const others = hooks.useOthers();
        const self = hooks.useSelf();
        const storage = hooks.useStorage((root) => root);
        const mutation = hooks.useMutation((root) => {}, []);
        const history = hooks.useHistory();
        const status = hooks.useStatus();

        return (
          <div data-testid="complex-hook-consumer">
            <div data-testid="room-info">{room.id}</div>
            <div data-testid="presence-info">{JSON.stringify(myPresence)}</div>
            <div data-testid="others-info">{others.length}</div>
            <div data-testid="self-info">{self?.connectionId}</div>
            <div data-testid="storage-info">{storage ? 'has-storage' : 'no-storage'}</div>
            <div data-testid="history-info">{JSON.stringify(history)}</div>
            <div data-testid="status-info">{status}</div>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <ComplexComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('complex-hook-consumer')).toBeInTheDocument();
      expect(screen.getByTestId('room-info')).toHaveTextContent('test-room');
      expect(screen.getByTestId('self-info')).toHaveTextContent('test-connection');
      expect(screen.getByTestId('storage-info')).toHaveTextContent('no-storage');
      expect(screen.getByTestId('status-info')).toHaveTextContent('connected');

      // Verify all hooks were called
      expect(mockUseRoom).toHaveBeenCalled();
      expect(mockUseMyPresence).toHaveBeenCalled();
      expect(mockUseOthers).toHaveBeenCalled();
      expect(mockUseSelf).toHaveBeenCalled();
      expect(mockUseStorage).toHaveBeenCalled();
      expect(mockUseMutation).toHaveBeenCalled();
      expect(mockUseHistory).toHaveBeenCalled();
      expect(mockUseStatus).toHaveBeenCalled();
    });

    it('should handle hook updates and re-renders correctly', async () => {
      const hooks = await import('../hooks.js');

      // Mock dynamic presence updates
      let presenceValue = { cursor: null };
      const updatePresence = vi.fn((newPresence) => {
        presenceValue = { ...presenceValue, ...newPresence };
      });
      mockUseMyPresence.mockReturnValue([presenceValue, updatePresence]);

      const UpdatingComponent = () => {
        const [myPresence, updateMyPresence] = hooks.useMyPresence();
        
        return (
          <div data-testid="updating-component">
            <div data-testid="current-presence">{JSON.stringify(myPresence)}</div>
            <button
              data-testid="update-button"
              onClick={() => updateMyPresence({ cursor: { x: 100, y: 200 } })}
            >
              Update Presence
            </button>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <UpdatingComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('current-presence')).toHaveTextContent('{"cursor":null}');
      
      // Simulate presence update
      act(() => {
        screen.getByTestId('update-button').click();
      });

      expect(updatePresence).toHaveBeenCalledWith({ cursor: { x: 100, y: 200 } });
    });

    it('should support event listener hooks', async () => {
      const hooks = await import('../hooks.js');

      const EventListenerComponent = () => {
        const broadcastEvent = hooks.useBroadcastEvent();
        
        // Use event listeners
        hooks.useEventListener(() => {});
        
        hooks.useErrorListener((error) => {
          console.error('Liveblocks error:', error);
        });
        
        hooks.useLostConnectionListener(() => {
          console.log('Connection lost');
        });

        return (
          <div data-testid="event-listener-component">
            <button
              data-testid="broadcast-button"
              onClick={() => broadcastEvent({ type: 'test' } as any)}
            >
              Broadcast Event
            </button>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <EventListenerComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('event-listener-component')).toBeInTheDocument();
      
      // Verify event listener hooks were called
      expect(mockUseBroadcastEvent).toHaveBeenCalled();
      expect(mockUseEventListener).toHaveBeenCalled();
      expect(mockUseErrorListener).toHaveBeenCalled();
      expect(mockUseLostConnectionListener).toHaveBeenCalled();
    });
  });

  describe('Type Safety Validation', () => {
    it('should preserve TypeScript types from original exports', async () => {
      const hooks = await import('../hooks.js');

      // Test type preservation by checking function signatures exist
      expect(hooks.useRoom).toEqual(expect.any(Function));
      expect(hooks.useMyPresence).toEqual(expect.any(Function));
      expect(hooks.useOthers).toEqual(expect.any(Function));
      expect(hooks.useSelf).toEqual(expect.any(Function));
      expect(hooks.useStorage).toEqual(expect.any(Function));
      expect(hooks.useMutation).toEqual(expect.any(Function));

      // Verify hooks can be called (types are preserved)
      const { result: roomResult } = renderHook(() => hooks.useRoom(), { wrapper: TestRoomWrapper });
      const { result: presenceResult } = renderHook(() => hooks.useMyPresence(), { wrapper: TestRoomWrapper });
      const { result: othersResult } = renderHook(() => hooks.useOthers(), { wrapper: TestRoomWrapper });

      // Type validation through structure checks
      expect(roomResult.current).toHaveProperty('id');
      expect(Array.isArray(presenceResult.current)).toBe(true);
      expect(presenceResult.current).toHaveLength(2);
      expect(Array.isArray(othersResult.current)).toBe(true);
    });

    it('should support generic type inference for storage hooks', async () => {
      const hooks = await import('../hooks.js');

      // Mock storage with typed data
      const mockStorageData = { count: 42, items: ['a', 'b', 'c'] };
      mockUseStorage.mockReturnValue(mockStorageData);

      const TypedStorageComponent = () => {
        const storage = hooks.useStorage((root) => root);
        const mutation = hooks.useMutation((root) => {}, []);

        return (
          <div data-testid="typed-storage">
            <div data-testid="storage-data">{JSON.stringify(storage)}</div>
            <button
              data-testid="mutate-button"
              onClick={() => mutation()}
            >
              Mutate
            </button>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <TypedStorageComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('storage-data')).toHaveTextContent(JSON.stringify(mockStorageData));
      expect(mockUseStorage).toHaveBeenCalled();
      expect(mockUseMutation).toHaveBeenCalled();
    });

    it('should maintain proper hook parameter types', async () => {
      const hooks = await import('../hooks.js');

      const mockSelector = vi.fn((storage) => storage?.items);
      const mockEventHandler = vi.fn((event) => console.log(event));

      const ParameterTypeComponent = () => {
        // Test hooks with parameters maintain proper types
        const selectedData = hooks.useStorage(mockSelector);
        hooks.useEventListener(mockEventHandler);
        
        const user = hooks.useUser('user-123');
        const other = hooks.useOther('connection-456', (other) => other);

        return (
          <div data-testid="parameter-type-component">
            <div data-testid="selected-data">{JSON.stringify(selectedData)}</div>
            <div data-testid="user-data">{JSON.stringify(user)}</div>
            <div data-testid="other-data">{JSON.stringify(other)}</div>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <ParameterTypeComponent />
        </TestRoomWrapper>
      );

      // Verify hooks with parameters were called correctly
      expect(mockUseStorage).toHaveBeenCalledWith(mockSelector);
      expect(mockUseEventListener).toHaveBeenCalledWith(mockEventHandler);
      expect(mockUseUser).toHaveBeenCalled();
      expect(mockUseOther).toHaveBeenCalledWith('connection-456');
    });
  });

  describe('Integration Scenarios', () => {
    it('should support common collaboration patterns', async () => {
      const hooks = await import('../hooks.js');

      const CollaborationComponent = () => {
        const room = hooks.useRoom();
        const [myPresence, updateMyPresence] = hooks.useMyPresence();
        const others = hooks.useOthers();
        const self = hooks.useSelf();
        const broadcastEvent = hooks.useBroadcastEvent();
        const status = hooks.useStatus();

        // Common collaboration pattern: cursor tracking
        const handleMouseMove = (e: React.MouseEvent) => {
          updateMyPresence({
            cursor: { x: e.clientX, y: e.clientY }
          });
        };

        // Common collaboration pattern: broadcasting events
        const sendMessage = () => {
          broadcastEvent({
            type: 'message'
          } as any);
        };

        return (
          <div 
            data-testid="collaboration-component"
            onMouseMove={handleMouseMove}
          >
            <div data-testid="room-status">Room: {room.id} ({status})</div>
            <div data-testid="participants-count">Participants: {others.length + 1}</div>
            <div data-testid="my-connection">{self?.connectionId}</div>
            <button data-testid="send-message" onClick={sendMessage}>
              Send Message
            </button>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <CollaborationComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('collaboration-component')).toBeInTheDocument();
      expect(screen.getByTestId('room-status')).toHaveTextContent('Room: test-room (connected)');
      expect(screen.getByTestId('participants-count')).toHaveTextContent('Participants: 1');
      expect(screen.getByTestId('my-connection')).toHaveTextContent('test-connection');

      // Verify all collaboration hooks were used
      expect(mockUseRoom).toHaveBeenCalled();
      expect(mockUseMyPresence).toHaveBeenCalled();
      expect(mockUseOthers).toHaveBeenCalled();
      expect(mockUseSelf).toHaveBeenCalled();
      expect(mockUseBroadcastEvent).toHaveBeenCalled();
      expect(mockUseStatus).toHaveBeenCalled();
    });

    it('should support undo/redo functionality patterns', async () => {
      const hooks = await import('../hooks.js');

      // Mock history state
      mockUseCanUndo.mockReturnValue(true);
      mockUseCanRedo.mockReturnValue(false);
      const mockUndo = vi.fn();
      const mockRedo = vi.fn();
      mockUseUndo.mockReturnValue(mockUndo);
      mockUseRedo.mockReturnValue(mockRedo);

      const UndoRedoComponent = () => {
        const canUndo = hooks.useCanUndo();
        const canRedo = hooks.useCanRedo();
        const undo = hooks.useUndo();
        const redo = hooks.useRedo();
        const history = hooks.useHistory();

        return (
          <div data-testid="undo-redo-component">
            <button 
              data-testid="undo-button" 
              disabled={!canUndo}
              onClick={undo}
            >
              Undo
            </button>
            <button 
              data-testid="redo-button" 
              disabled={!canRedo}
              onClick={redo}
            >
              Redo
            </button>
            <div data-testid="history-info">{JSON.stringify(history)}</div>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <UndoRedoComponent />
        </TestRoomWrapper>
      );

      const undoButton = screen.getByTestId('undo-button');
      const redoButton = screen.getByTestId('redo-button');

      expect(undoButton).not.toBeDisabled();
      expect(redoButton).toBeDisabled();

      // Test undo functionality
      act(() => {
        undoButton.click();
      });

      expect(mockUndo).toHaveBeenCalled();

      // Verify all history hooks were used
      expect(mockUseCanUndo).toHaveBeenCalled();
      expect(mockUseCanRedo).toHaveBeenCalled();
      expect(mockUseUndo).toHaveBeenCalled();
      expect(mockUseRedo).toHaveBeenCalled();
      expect(mockUseHistory).toHaveBeenCalled();
    });

    it('should support batched operations', async () => {
      const hooks = await import('../hooks.js');

      const mockBatch = vi.fn((callback) => callback());
      mockUseBatch.mockReturnValue(mockBatch);

      const BatchOperationsComponent = () => {
        const batch = hooks.useBatch();
        const [myPresence, updateMyPresence] = hooks.useMyPresence();
        const mutation = hooks.useMutation((root) => {}, []);

        const performBatchedUpdates = () => {
          batch(() => {
            updateMyPresence({ cursor: { x: 100, y: 100 } });
            mutation();
          });
        };

        return (
          <div data-testid="batch-operations">
            <button 
              data-testid="batch-button"
              onClick={performBatchedUpdates}
            >
              Batch Updates
            </button>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <BatchOperationsComponent />
        </TestRoomWrapper>
      );

      act(() => {
        screen.getByTestId('batch-button').click();
      });

      expect(mockBatch).toHaveBeenCalledWith(expect.any(Function));
      expect(mockUseBatch).toHaveBeenCalled();
    });

    it('should handle hook cleanup on component unmount', async () => {
      const hooks = await import('../hooks.js');

      const CleanupComponent = () => {
        hooks.useEventListener('test-cleanup', () => {});
        hooks.useErrorListener(() => {});
        hooks.useLostConnectionListener(() => {});

        return <div data-testid="cleanup-component">Cleanup Test</div>;
      };

      const { unmount } = render(
        <TestRoomWrapper>
          <CleanupComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('cleanup-component')).toBeInTheDocument();

      // Verify hooks were called
      expect(mockUseEventListener).toHaveBeenCalled();
      expect(mockUseErrorListener).toHaveBeenCalled();
      expect(mockUseLostConnectionListener).toHaveBeenCalled();

      // Unmount and verify cleanup
      unmount();
      expect(screen.queryByTestId('cleanup-component')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle hooks used outside Room context', async () => {
      const hooks = await import('../hooks.js');

      // Mock hooks to throw when used outside context
      mockUseRoom.mockImplementation(() => {
        throw new Error('useRoom must be used within a Room component');
      });

      const OutsideContextComponent = () => {
        try {
          hooks.useRoom();
          return <div data-testid="no-error">No Error</div>;
        } catch (error) {
          return <div data-testid="context-error">{(error as Error).message}</div>;
        }
      };

      render(<OutsideContextComponent />);
      
      // Verify the error was caught and displayed
      expect(screen.getByTestId('context-error')).toBeInTheDocument();
      expect(screen.getByTestId('context-error')).toHaveTextContent('useRoom must be used within a Room component');
    });

    it('should handle connection state errors', async () => {
      const hooks = await import('../hooks.js');

      // Mock connection state errors
      mockUseStatus.mockReturnValue('disconnected');

      const ConnectionErrorComponent = () => {
        const status = hooks.useStatus();

        return (
          <div data-testid="connection-error-component">
            <div data-testid="status">{status}</div>
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <ConnectionErrorComponent />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    });

    it('should handle storage mutation errors', async () => {
      const hooks = await import('../hooks.js');

      const mockMutationWithError = vi.fn((callback) => {
        throw new Error('Storage mutation failed');
      });
      mockUseMutation.mockReturnValue(mockMutationWithError);

      const MutationErrorComponent = () => {
        const mutation = hooks.useMutation((root) => {}, []);
        const [error, setError] = React.useState<string | null>(null);

        const handleMutation = () => {
          try {
            mutation();
          } catch (err) {
            setError((err as Error).message);
          }
        };

        return (
          <div data-testid="mutation-error-component">
            <button data-testid="mutation-button" onClick={handleMutation}>
              Mutate
            </button>
            {error && <div data-testid="mutation-error">{error}</div>}
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <MutationErrorComponent />
        </TestRoomWrapper>
      );

      act(() => {
        screen.getByTestId('mutation-button').click();
      });

      expect(screen.getByTestId('mutation-error')).toHaveTextContent('Storage mutation failed');
    });

    it('should handle user resolution errors', async () => {
      const hooks = await import('../hooks.js');

      // Mock user resolution error for invalid user
      mockUseUser.mockImplementation((userId) => {
        if (userId === 'invalid-user') {
          throw new Error('User not found');
        }
        return { isLoading: false, user: { name: 'Valid User', color: '#000' }, error: undefined };
      });

      const UserErrorComponent = ({ userId }: { userId: string }) => {
        const [error, setError] = React.useState<string | null>(null);

        let user = null;
        try {
          user = hooks.useUser(userId);
          if (error) setError(null); // Clear previous error
        } catch (err) {
          if (!error) setError((err as Error).message); // Only set error if not already set
        }

        return (
          <div data-testid="user-error-component">
            {error && <div data-testid="user-error">{error}</div>}
            {user && <div data-testid="user-name">{user.user?.name}</div>}
          </div>
        );
      };

      // Test with valid user first
      const { rerender } = render(
        <TestRoomWrapper>
          <UserErrorComponent userId="valid-user" />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('Valid User');

      // Test with invalid user
      rerender(
        <TestRoomWrapper>
          <UserErrorComponent userId="invalid-user" />
        </TestRoomWrapper>
      );

      expect(screen.getByTestId('user-error')).toHaveTextContent('User not found');
      expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
    });

    it('should handle event broadcasting errors', async () => {
      const hooks = await import('../hooks.js');

      const mockBroadcastWithError = vi.fn((event) => {
        throw new Error('Broadcast failed');
      });
      mockUseBroadcastEvent.mockReturnValue(mockBroadcastWithError);

      const BroadcastErrorComponent = () => {
        const broadcastEvent = hooks.useBroadcastEvent();
        const [error, setError] = React.useState<string | null>(null);

        const handleBroadcast = () => {
          try {
            broadcastEvent({ type: 'test' } as any);
          } catch (err) {
            setError((err as Error).message);
          }
        };

        return (
          <div data-testid="broadcast-error-component">
            <button data-testid="broadcast-button" onClick={handleBroadcast}>
              Broadcast
            </button>
            {error && <div data-testid="broadcast-error">{error}</div>}
          </div>
        );
      };

      render(
        <TestRoomWrapper>
          <BroadcastErrorComponent />
        </TestRoomWrapper>
      );

      act(() => {
        screen.getByTestId('broadcast-button').click();
      });

      expect(screen.getByTestId('broadcast-error')).toHaveTextContent('Broadcast failed');
    });
  });
});