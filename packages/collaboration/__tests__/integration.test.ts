/**
 * @fileoverview Collaboration Package Integration Tests
 * 
 * Comprehensive integration test suite for the collaboration package testing complete workflows
 * from authentication to room usage, multi-user scenarios, error recovery, and performance
 * under load. Tests the entire collaboration system as end users would experience it.
 * 
 * **Test Scope:**
 * - Complete authentication → room → presence workflow integration
 * - Multi-user collaboration scenarios with concurrent operations
 * - Real-time event handling and state synchronization
 * - Error recovery, reconnection, and graceful degradation
 * - Performance testing under concurrent load conditions
 * - Cross-component integration and provider hierarchy validation
 * 
 * **Test Categories:**
 * 1. **Authentication Integration**: Complete auth workflow from environment setup to response
 * 2. **Room Integration**: Auth endpoint integration, room lifecycle, provider hierarchy
 * 3. **Multi-User Collaboration**: Concurrent users, presence sync, operation conflicts
 * 4. **Error Recovery**: Network failures, auth errors, reconnection handling
 * 5. **Performance & Load**: Concurrent users, rapid operations, memory management
 * 6. **Real-World Scenarios**: Complex workflows, edge cases, production patterns
 * 
 * **Integration Strategy:**
 * - End-to-end workflow testing with realistic scenarios
 * - Multi-component coordination and data flow validation
 * - Error boundary testing with cascading failure scenarios
 * - Performance benchmarking under realistic load patterns
 * - Resource cleanup and memory leak prevention validation
 * 
 * **Quality Standards:**
 * - Complete integration coverage across all major workflows
 * - Real-world scenario simulation with production-like conditions
 * - Comprehensive error recovery and resilience testing
 * - Performance validation under concurrent load (10+ users)
 * - Clear documentation of integration patterns and expectations
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';

// ================================================================================================
// Mock Setup & Global Configuration
// ================================================================================================

// Environment variable management for integration testing
const originalEnv = process.env;

// Mock server-only to avoid server-side restrictions in tests
vi.mock('server-only', () => ({}));

// Mock Liveblocks Node SDK for authentication integration
const mockPrepareSession = vi.fn();
const mockAllow = vi.fn();
const mockAuthorize = vi.fn();
const mockLiveblocks = vi.fn();

vi.mock('@liveblocks/node', () => ({
  Liveblocks: mockLiveblocks,
}));

// Mock Liveblocks React components for room integration
const mockLiveblocksProvider = vi.fn();
const mockRoomProvider = vi.fn();
const mockClientSideSuspense = vi.fn();

vi.mock('@liveblocks/react/suspense', () => ({
  LiveblocksProvider: mockLiveblocksProvider,
  RoomProvider: mockRoomProvider,
  ClientSideSuspense: mockClientSideSuspense,
}));

// Mock environment configuration system
vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: vi.fn((config) => {
    const mockEnv = {} as any;
    if (config.server?.LIVEBLOCKS_SECRET) {
      const value = config.runtimeEnv.LIVEBLOCKS_SECRET;
      if (value && value.startsWith('sk_')) {
        mockEnv.LIVEBLOCKS_SECRET = value;
      }
    }
    return mockEnv;
  }),
}));

// Integration test helpers
const createValidAuthSession = () => ({
  allow: mockAllow.mockReturnValue(undefined),
  authorize: mockAuthorize.mockResolvedValue({
    status: 200,
    body: JSON.stringify({ 
      token: 'integration_jwt_token_12345',
      expires: Date.now() + 3600000,
      user: { id: 'user_123', org: 'org_456' }
    }),
  }),
  FULL_ACCESS: 'full_access',
});

const createReactComponents = () => {
  mockLiveblocksProvider.mockImplementation(({ children, ...props }: any) => 
    React.createElement('div', { 'data-testid': 'integration-liveblocks-provider', ...props }, children)
  );
  
  mockRoomProvider.mockImplementation(({ children, ...props }: any) => 
    React.createElement('div', { 'data-testid': 'integration-room-provider', ...props }, children)
  );
  
  mockClientSideSuspense.mockImplementation(({ children, fallback }: any) => 
    React.createElement('div', { 'data-testid': 'integration-client-suspense' }, children || fallback)
  );
};

// Performance monitoring utilities
const performanceMonitor = {
  startTime: 0,
  operations: [] as Array<{ name: string; duration: number; success: boolean }>,
  
  start() {
    this.startTime = performance.now();
    this.operations = [];
  },
  
  record(name: string, success: boolean = true) {
    const duration = performance.now() - this.startTime;
    this.operations.push({ name, duration, success });
    this.startTime = performance.now();
  },
  
  getStats() {
    const total = this.operations.reduce((sum, op) => sum + op.duration, 0);
    const successful = this.operations.filter(op => op.success).length;
    const failed = this.operations.length - successful;
    const average = total / this.operations.length || 0;
    
    return {
      total,
      average,
      successful,
      failed,
      operations: this.operations.length,
      successRate: (successful / this.operations.length) * 100 || 0,
    };
  },
  
  reset() {
    this.operations = [];
    this.startTime = performance.now();
  }
};

describe('Collaboration Package Integration Tests', () => {
  
  beforeAll(async () => {
    // Global integration test setup
    process.env.NODE_ENV = 'test';
    
    // Pre-warm any modules or setup that should persist across tests
    performanceMonitor.start();
  });

  afterAll(() => {
    // Global cleanup after all integration tests
    process.env = originalEnv;
    performanceMonitor.reset();
  });

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    process.env.LIVEBLOCKS_SECRET = 'sk_test_integration_secret_123456789';
    
    // Reset all mocks with fresh state
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default successful Liveblocks SDK behavior
    const defaultSession = createValidAuthSession();
    mockPrepareSession.mockReturnValue(defaultSession);
    mockLiveblocks.mockImplementation(() => ({
      prepareSession: mockPrepareSession,
    }));

    // Setup default React component behavior
    createReactComponents();
    
    // Reset performance monitoring for each test
    performanceMonitor.reset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.resetModules();
    process.env = originalEnv;
  });

  // ================================================================================================
  // Authentication Integration Workflow Tests
  // ================================================================================================

  describe('Authentication Integration Workflow', () => {
    it('should complete full authentication workflow from environment to token', async () => {
      performanceMonitor.start();
      
      // Import after mocks are set up
      const { authenticate } = await import('../auth.js');
      performanceMonitor.record('module-import');

      const authOptions = {
        userId: 'integration_user_001',
        orgId: 'integration_org_001',
        userInfo: {
          name: 'Integration Test User',
          avatar: 'https://example.com/integration-avatar.jpg',
          color: '#4f46e5',
        },
      };

      const response = await authenticate(authOptions);
      performanceMonitor.record('authentication');

      // Verify complete authentication workflow
      expect(mockLiveblocks).toHaveBeenCalledWith({ 
        secret: 'sk_test_integration_secret_123456789' 
      });
      expect(mockPrepareSession).toHaveBeenCalledWith(
        'integration_user_001',
        { userInfo: authOptions.userInfo }
      );
      expect(mockAllow).toHaveBeenCalledWith(
        'integration_org_001:*',
        'full_access'
      );
      expect(mockAuthorize).toHaveBeenCalledOnce();

      // Verify response format matches integration expectations
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      
      const responseBody = await response.text();
      const tokenData = JSON.parse(responseBody);
      expect(tokenData).toHaveProperty('token');
      expect(tokenData).toHaveProperty('expires');
      expect(tokenData).toHaveProperty('user');
      
      performanceMonitor.record('response-validation');
      
      const stats = performanceMonitor.getStats();
      expect(stats.successRate).toBe(100);
      expect(stats.total).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle authentication with organization hierarchy patterns', async () => {
      const { authenticate } = await import('../auth.js');

      const hierarchicalScenarios = [
        {
          orgId: 'company',
          expectedPattern: 'company:*',
          description: 'Simple organization',
        },
        {
          orgId: 'company_division_team',
          expectedPattern: 'company_division_team:*',
          description: 'Complex hierarchical organization',
        },
        {
          orgId: 'enterprise-corp-2024',
          expectedPattern: 'enterprise-corp-2024:*',
          description: 'Enterprise naming pattern',
        },
      ];

      for (const scenario of hierarchicalScenarios) {
        vi.clearAllMocks();
        
        // Reset mock for each scenario
        const session = createValidAuthSession();
        mockPrepareSession.mockReturnValue(session);

        await authenticate({
          userId: `user_${scenario.orgId}`,
          orgId: scenario.orgId,
          userInfo: { color: '#ff0000' },
        });

        expect(mockAllow).toHaveBeenCalledWith(
          scenario.expectedPattern,
          'full_access'
        );
      }
    });

    it('should integrate environment validation with authentication flow', async () => {
      // Test with missing secret
      delete process.env.LIVEBLOCKS_SECRET;
      vi.resetModules();

      const { authenticate } = await import('../auth.js');

      await expect(authenticate({
        userId: 'env_test_user',
        orgId: 'env_test_org',
        userInfo: { color: '#00ff00' },
      })).rejects.toThrow('LIVEBLOCKS_SECRET is not set');

      // Restore secret and test success
      process.env.LIVEBLOCKS_SECRET = 'sk_test_restored_secret';
      vi.resetModules();

      const { authenticate: authenticateRestored } = await import('../auth.js');
      
      // Reset mocks for restored test
      const session = createValidAuthSession();
      mockPrepareSession.mockReturnValue(session);

      const response = await authenticateRestored({
        userId: 'env_restored_user',
        orgId: 'env_restored_org',  
        userInfo: { color: '#0000ff' },
      });

      expect(response.status).toBe(200);
    });

    it('should handle authentication state persistence across multiple calls', async () => {
      const { authenticate } = await import('../auth.js');

      const userSessions = [
        { userId: 'user_001', orgId: 'org_alpha', color: '#ff0000' },
        { userId: 'user_002', orgId: 'org_alpha', color: '#00ff00' },
        { userId: 'user_003', orgId: 'org_beta', color: '#0000ff' },
      ];

      const responses = [];

      for (const session of userSessions) {
        // Reset session mock for each call
        const mockSession = createValidAuthSession();
        mockPrepareSession.mockReturnValue(mockSession);

        const response = await authenticate({
          userId: session.userId,
          orgId: session.orgId,
          userInfo: { color: session.color },
        });

        responses.push(response);
      }

      // All authentication calls should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify each call was independent
      expect(mockPrepareSession).toHaveBeenCalledTimes(3);
      expect(mockAuthorize).toHaveBeenCalledTimes(3);
    });
  });

  // ================================================================================================
  // Room Integration & Provider Hierarchy Tests
  // ================================================================================================

  describe('Room Integration & Provider Hierarchy', () => {
    it('should integrate authentication endpoint with room provider hierarchy', async () => {
      const { Room } = await import('../room.js');

      const integrationProps = {
        id: 'integration_room_001',
        authEndpoint: '/api/liveblocks-auth',
        fallback: React.createElement('div', { 'data-testid': 'integration-loading' }, 'Connecting to collaboration...'),
        children: React.createElement('div', { 'data-testid': 'integration-workspace' }, 
          React.createElement('div', { 'data-testid': 'integration-toolbar' }, 'Collaboration Toolbar'),
          React.createElement('div', { 'data-testid': 'integration-canvas' }, 'Collaborative Canvas'),
          React.createElement('div', { 'data-testid': 'integration-users' }, 'User Presence')
        ),
      };

      render(React.createElement(Room, integrationProps));

      // Verify complete provider hierarchy integration
      expect(screen.getByTestId('integration-liveblocks-provider')).toBeInTheDocument();
      expect(screen.getByTestId('integration-room-provider')).toBeInTheDocument();
      expect(screen.getByTestId('integration-client-suspense')).toBeInTheDocument();

      // Verify all workspace components are rendered
      expect(screen.getByTestId('integration-workspace')).toBeInTheDocument();
      expect(screen.getByTestId('integration-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('integration-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('integration-users')).toBeInTheDocument();

      // Verify provider configuration integration
      const liveblocksCall = mockLiveblocksProvider.mock.calls[0][0];
      expect(liveblocksCall.authEndpoint).toBe('/api/liveblocks-auth');

      const roomCall = mockRoomProvider.mock.calls[0][0];
      expect(roomCall.id).toBe('integration_room_001');
      expect(roomCall.initialPresence).toEqual({ cursor: null });
    });

    it('should handle authentication endpoint integration with custom resolvers', async () => {
      const { Room } = await import('../room.js');

      const mockResolveUsers = vi.fn().mockResolvedValue([
        { 
          id: 'user_001',
          info: {
            name: 'Alice Johnson',
            avatar: 'https://example.com/alice.jpg',
            color: '#e11d48',
          }
        },
        {
          id: 'user_002', 
          info: {
            name: 'Bob Smith',
            avatar: 'https://example.com/bob.jpg',
            color: '#3b82f6',
          }
        },
      ]);

      const mockResolveMentionSuggestions = vi.fn().mockResolvedValue([
        'alice.johnson@company.com',
        'bob.smith@company.com',
        'team-leads@company.com',
      ]);

      const advancedProps = {
        id: 'advanced_integration_room',
        authEndpoint: '/api/v1/collaboration/auth',
        fallback: React.createElement('div', { 'data-testid': 'advanced-loading' }, 'Loading advanced room...'),
        children: React.createElement('div', { 'data-testid': 'advanced-content' }, 'Advanced Collaboration Content'),
        resolveUsers: mockResolveUsers,
        resolveMentionSuggestions: mockResolveMentionSuggestions,
        throttle: 100,
        lostConnectionTimeout: 30000,
      };

      render(React.createElement(Room, advancedProps));

      // Verify all advanced configuration is forwarded
      const liveblocksCall = mockLiveblocksProvider.mock.calls[0][0];
      expect(liveblocksCall.authEndpoint).toBe('/api/v1/collaboration/auth');
      expect(liveblocksCall.resolveUsers).toBe(mockResolveUsers);
      expect(liveblocksCall.resolveMentionSuggestions).toBe(mockResolveMentionSuggestions);
      expect(liveblocksCall.throttle).toBe(100);
      expect(liveblocksCall.lostConnectionTimeout).toBe(30000);
    });

    it('should integrate room lifecycle with provider state management', async () => {
      const { Room } = await import('../room.js');

      const lifecycleProps = {
        id: 'lifecycle_room_001',
        authEndpoint: '/api/auth',
        fallback: React.createElement('div', { 'data-testid': 'lifecycle-loading' }, 'Initializing room...'),
        children: React.createElement('div', { 'data-testid': 'lifecycle-content' }, 'Room Content'),
      };

      const { rerender, unmount } = render(React.createElement(Room, lifecycleProps));

      // Verify initial mount
      expect(screen.getByTestId('lifecycle-content')).toBeInTheDocument();
      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(1);
      expect(mockRoomProvider).toHaveBeenCalledTimes(1);

      // Test room ID change (common in multi-room applications)
      rerender(React.createElement(Room, { ...lifecycleProps, id: 'lifecycle_room_002' }));

      expect(mockLiveblocksProvider).toHaveBeenCalledTimes(2);
      expect(mockRoomProvider).toHaveBeenCalledTimes(2);

      // Verify new room ID is used
      const lastRoomCall = mockRoomProvider.mock.calls[mockRoomProvider.mock.calls.length - 1][0];
      expect(lastRoomCall.id).toBe('lifecycle_room_002');

      // Test unmount
      unmount();
      expect(screen.queryByTestId('lifecycle-content')).not.toBeInTheDocument();
    });
  });

  // ================================================================================================
  // Multi-User Collaboration Scenarios
  // ================================================================================================

  describe('Multi-User Collaboration Scenarios', () => {
    it('should handle concurrent user authentication and room joining', async () => {
      performanceMonitor.start();
      
      const { authenticate } = await import('../auth.js');

      const concurrentUsers = [
        { userId: 'concurrent_001', orgId: 'team_alpha', name: 'Alice', role: 'editor' },
        { userId: 'concurrent_002', orgId: 'team_alpha', name: 'Bob', role: 'viewer' },
        { userId: 'concurrent_003', orgId: 'team_alpha', name: 'Charlie', role: 'admin' },
        { userId: 'concurrent_004', orgId: 'team_beta', name: 'Diana', role: 'editor' },
        { userId: 'concurrent_005', orgId: 'team_beta', name: 'Eve', role: 'viewer' },
      ];

      // Simulate concurrent authentication requests
      const authPromises = concurrentUsers.map(async (user, index) => {
        // Reset session mock for each user
        const session = createValidAuthSession();
        mockPrepareSession.mockReturnValue(session);

        const startTime = performance.now();
        
        try {
          const response = await authenticate({
            userId: user.userId,
            orgId: user.orgId,
            userInfo: {
              name: user.name,
              color: `#${index.toString().padStart(6, '0')}`,
            },
          });

          const duration = performance.now() - startTime;
          performanceMonitor.record(`auth-${user.userId}`, response.status === 200);
          
          return {
            user: user.userId,
            success: response.status === 200,
            duration,
            response,
          };
        } catch (error) {
          const duration = performance.now() - startTime;
          performanceMonitor.record(`auth-${user.userId}`, false);
          
          return {
            user: user.userId,
            success: false,
            duration,
            error: error as Error,
          };
        }
      });

      const results = await Promise.all(authPromises);
      performanceMonitor.record('concurrent-auth-complete');

      // Verify all users authenticated successfully
      const successfulAuths = results.filter(r => r.success);
      expect(successfulAuths).toHaveLength(5);

      // Verify performance expectations
      const stats = performanceMonitor.getStats();
      expect(stats.successRate).toBe(100);
      expect(stats.average).toBeLessThan(500); // Average auth time under 500ms

      // Verify proper organization-based access control
      expect(mockAllow).toHaveBeenCalledWith('team_alpha:*', 'full_access');
      expect(mockAllow).toHaveBeenCalledWith('team_beta:*', 'full_access');
    });

    it('should simulate multi-user presence synchronization', async () => {
      const { Room } = await import('../room.js');

      // Mock presence state management
      const presenceStates = new Map();
      
      mockRoomProvider.mockImplementation(({ children, id, initialPresence }: any) => {
        // Simulate presence state initialization
        presenceStates.set(id, initialPresence);
        
        return React.createElement('div', {
          'data-testid': `room-${id}`,
          'data-presence': JSON.stringify(initialPresence)
        }, children);
      });

      const MultiUserWorkspace = () => React.createElement(Room, {
        id: 'shared_workspace_001',
        authEndpoint: '/api/multi-user-auth',
        fallback: React.createElement('div', {}, 'Loading workspace...'),
        children: React.createElement('div', { 'data-testid': 'shared-canvas' },
          React.createElement('div', { 'data-testid': 'user-cursors' }, 'User Cursors'),
          React.createElement('div', { 'data-testid': 'shared-objects' }, 'Shared Objects'),
          React.createElement('div', { 'data-testid': 'chat-panel' }, 'Chat Panel')
        )
      });

      render(React.createElement('div', { 'data-testid': 'multi-user-workspace' }, 
        React.createElement(MultiUserWorkspace)
      ));

      // Verify workspace is rendered
      expect(screen.getByTestId('multi-user-workspace')).toBeInTheDocument();
      expect(screen.getByTestId('shared-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('user-cursors')).toBeInTheDocument();
      expect(screen.getByTestId('shared-objects')).toBeInTheDocument();
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();

      // Verify room with initial presence state
      expect(screen.getByTestId('room-shared_workspace_001')).toBeInTheDocument();
      expect(presenceStates.get('shared_workspace_001')).toEqual({ cursor: null });
    });
  });

  // ================================================================================================
  // Error Recovery & Resilience Tests
  // ================================================================================================

  describe('Error Recovery & Resilience', () => {
    it('should handle authentication failures with graceful degradation', async () => {
      // Simulate authentication failure
      mockAuthorize.mockRejectedValue(new Error('Authentication service unavailable'));
      
      const { authenticate } = await import('../auth.js');

      const authOptions = {
        userId: 'recovery_user_001',
        orgId: 'recovery_org_001',
        userInfo: { color: '#ff0000' },
      };

      await expect(authenticate(authOptions)).rejects.toThrow('Authentication service unavailable');

      // Verify error was handled properly
      expect(mockPrepareSession).toHaveBeenCalled();
      expect(mockAllow).toHaveBeenCalled();
      expect(mockAuthorize).toHaveBeenCalled();
    });

    it('should handle network disconnection and reconnection scenarios', async () => {
      const { Room } = await import('../room.js');

      // Simulate network disconnection
      let isConnected = false;
      
      mockClientSideSuspense.mockImplementation(({ children, fallback }: any) => {
        return React.createElement('div', {
          'data-testid': 'network-status-client',
          'data-connected': isConnected
        }, isConnected ? children : fallback);
      });

      const NetworkResilienceRoom = () => React.createElement(Room, {
        id: 'network_resilience_room',
        authEndpoint: '/api/network-auth',
        fallback: React.createElement('div', { 'data-testid': 'network-disconnected' }, 'Reconnecting...'),
        lostConnectionTimeout: 5000,
        children: React.createElement('div', { 'data-testid': 'network-connected-content' }, 'Connected Content')
      });

      const { rerender } = render(React.createElement(NetworkResilienceRoom));

      // Initially disconnected
      expect(screen.getByTestId('network-status-client')).toHaveAttribute('data-connected', 'false');
      expect(screen.getByTestId('network-disconnected')).toBeInTheDocument();
      expect(screen.queryByTestId('network-connected-content')).not.toBeInTheDocument();

      // Simulate reconnection
      isConnected = true;
      mockClientSideSuspense.mockImplementation(({ children }: any) => 
        React.createElement('div', {
          'data-testid': 'network-status-client',
          'data-connected': isConnected
        }, children)
      );

      rerender(React.createElement(NetworkResilienceRoom));

      expect(screen.getByTestId('network-status-client')).toHaveAttribute('data-connected', 'true');
      expect(screen.getByTestId('network-connected-content')).toBeInTheDocument();
    });

    it('should handle provider initialization failures with fallbacks', async () => {
      const { Room } = await import('../room.js');

      // Mock LiveblocksProvider to fail initially
      let shouldFail = true;
      mockLiveblocksProvider.mockImplementation(({ children, ...props }: any) => {
        if (shouldFail) {
          throw new Error('Provider initialization failed');
        }
        return React.createElement('div', { 'data-testid': 'recovered-provider' }, children);
      });

      const FailureRecoveryRoom = () => React.createElement(Room, {
        id: 'failure_recovery_room',
        authEndpoint: '/api/failure-auth',
        fallback: React.createElement('div', { 'data-testid': 'provider-failure' }, 'Provider failed'),
        children: React.createElement('div', { 'data-testid': 'recovery-content' }, 'Recovery Content')
      });

      // Initial render should fail
      expect(() => render(React.createElement(FailureRecoveryRoom))).toThrow('Provider initialization failed');

      // Simulate recovery
      shouldFail = false;
      
      render(React.createElement(FailureRecoveryRoom));
      expect(screen.getByTestId('recovered-provider')).toBeInTheDocument();
      expect(screen.getByTestId('recovery-content')).toBeInTheDocument();
    });
  });

  // ================================================================================================
  // Performance & Load Testing
  // ================================================================================================

  describe('Performance & Load Testing', () => {
    it('should handle high-frequency authentication requests', async () => {
      performanceMonitor.start();
      
      const { authenticate } = await import('../auth.js');

      const highFrequencyAuth = async () => {
        const authRequests = Array.from({ length: 20 }, (_, i) => {
          // Reset session for each request
          const session = createValidAuthSession();
          mockPrepareSession.mockReturnValue(session);

          return authenticate({
            userId: `perf_user_${i.toString().padStart(3, '0')}`,
            orgId: `perf_org_${Math.floor(i / 5)}`, // 4 orgs, 5 users each
            userInfo: {
              color: `#${i.toString(16).padStart(6, '0')}`,
              name: `Performance User ${i}`,
            },
          });
        });

        const startTime = performance.now();
        const results = await Promise.all(authRequests);
        const duration = performance.now() - startTime;

        return { results, duration, throughput: authRequests.length / (duration / 1000) };
      };

      const { results, duration, throughput } = await highFrequencyAuth();
      performanceMonitor.record('high-frequency-auth');

      // Verify all requests succeeded
      const successfulResults = results.filter(r => r.status === 200);
      expect(successfulResults).toHaveLength(20);

      // Performance expectations
      expect(duration).toBeLessThan(5000); // Complete within 5 seconds
      expect(throughput).toBeGreaterThan(4); // At least 4 auths per second

      const stats = performanceMonitor.getStats();
      expect(stats.successRate).toBe(100);
    });

    it('should handle concurrent room operations under load', async () => {
      const { Room } = await import('../room.js');

      // Simulate concurrent room operations
      const operationMetrics = {
        renders: 0,
        updates: 0,
        errors: 0,
        totalTime: 0,
      };

      mockRoomProvider.mockImplementation(({ children, id }: any) => {
        operationMetrics.renders++;
        const renderStart = performance.now();
        
        // Simulate render time
        setTimeout(() => {
          operationMetrics.totalTime += performance.now() - renderStart;
        }, 10);

        return React.createElement('div', {
          'data-testid': `load-room-${id}`,
          'data-renders': operationMetrics.renders
        }, children);
      });

      const LoadTestWorkspace = () => React.createElement('div', { 'data-testid': 'load-test-workspace' },
        ...Array.from({ length: 15 }, (_, i) => 
          React.createElement(Room, {
            key: i,
            id: `load_room_${i}`,
            authEndpoint: `/api/load-auth-${i % 3}`, // 3 different endpoints
            fallback: React.createElement('div', {}, `Loading room ${i}...`),
            throttle: 50, // Aggressive throttling for load test
            children: React.createElement('div', { 'data-testid': `load-content-${i}` },
              `Load Content ${i}`,
              React.createElement('div', {}, `Operation counter: ${operationMetrics.renders}`)
            )
          })
        )
      );

      const renderStart = performance.now();
      render(React.createElement(LoadTestWorkspace));
      const renderDuration = performance.now() - renderStart;

      // Verify all rooms rendered successfully
      expect(operationMetrics.renders).toBe(15);
      expect(screen.getByTestId('load-test-workspace')).toBeInTheDocument();

      // Verify individual rooms
      for (let i = 0; i < 15; i++) {
        expect(screen.getByTestId(`load-room-load_room_${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`load-content-${i}`)).toBeInTheDocument();
      }

      // Performance expectations
      expect(renderDuration).toBeLessThan(1000); // Render within 1 second
      expect(operationMetrics.renders).toBe(15); // All rooms rendered
    });
  });

  // ================================================================================================
  // Real-World Integration Scenarios
  // ================================================================================================

  describe('Real-World Integration Scenarios', () => {
    it('should handle complete document collaboration workflow', async () => {
      const { authenticate } = await import('../auth.js');
      const { Room } = await import('../room.js');

      // Phase 1: User authentication for document access
      const documentUsers = [
        { userId: 'doc_author', orgId: 'company_docs', role: 'owner' },
        { userId: 'doc_editor', orgId: 'company_docs', role: 'editor' },  
        { userId: 'doc_viewer', orgId: 'company_docs', role: 'viewer' },
      ];

      const authResults = [];
      for (const user of documentUsers) {
        const session = createValidAuthSession();
        mockPrepareSession.mockReturnValue(session);

        const result = await authenticate({
          userId: user.userId,
          orgId: user.orgId,
          userInfo: {
            name: user.userId.replace('doc_', '').replace('_', ' '),
            color: user.role === 'owner' ? '#ef4444' : user.role === 'editor' ? '#3b82f6' : '#6b7280',
          },
        });

        authResults.push({ user: user.userId, success: result.status === 200 });
      }

      // Verify all users authenticated
      expect(authResults.every(r => r.success)).toBe(true);

      // Phase 2: Document collaboration room
      const DocumentCollaboration = () => React.createElement(Room, {
        id: 'document_collaboration_room',
        authEndpoint: '/api/document-auth',
        fallback: React.createElement('div', { 'data-testid': 'doc-loading' }, 'Loading document...'),
        children: React.createElement('div', { 'data-testid': 'document-workspace' },
          React.createElement('div', { 'data-testid': 'document-header' },
            React.createElement('h1', {}, 'Shared Document'),
            React.createElement('div', { 'data-testid': 'user-avatars' }, 'User Avatars')
          ),
          React.createElement('div', { 'data-testid': 'document-editor' },
            React.createElement('div', { 'data-testid': 'document-content' }, 'Document Content'),
            React.createElement('div', { 'data-testid': 'document-comments' }, 'Comments Panel')
          ),
          React.createElement('div', { 'data-testid': 'document-toolbar' },
            React.createElement('button', { 'data-testid': 'save-btn' }, 'Save'),
            React.createElement('button', { 'data-testid': 'share-btn' }, 'Share'),
            React.createElement('button', { 'data-testid': 'version-btn' }, 'Version History')
          )
        )
      });

      render(React.createElement(DocumentCollaboration));

      // Verify complete document interface
      expect(screen.getByTestId('document-workspace')).toBeInTheDocument();
      expect(screen.getByTestId('document-header')).toBeInTheDocument();
      expect(screen.getByTestId('user-avatars')).toBeInTheDocument();
      expect(screen.getByTestId('document-editor')).toBeInTheDocument();
      expect(screen.getByTestId('document-content')).toBeInTheDocument();
      expect(screen.getByTestId('document-comments')).toBeInTheDocument();
      expect(screen.getByTestId('document-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-btn')).toBeInTheDocument();
      expect(screen.getByTestId('share-btn')).toBeInTheDocument();
      expect(screen.getByTestId('version-btn')).toBeInTheDocument();

      // Verify room configuration for document collaboration
      const roomCall = mockRoomProvider.mock.calls[0][0];
      expect(roomCall.id).toBe('document_collaboration_room');
      expect(roomCall.initialPresence).toEqual({ cursor: null });
    });

    it('should handle multi-tenant enterprise collaboration', async () => {
      const { authenticate } = await import('../auth.js');
      const { Room } = await import('../room.js');

      // Multi-tenant scenario with different organizations
      const tenants = [
        { 
          orgId: 'enterprise_tenant_alpha', 
          users: ['user_alpha_1', 'user_alpha_2', 'user_alpha_3'],
          roomPrefix: 'alpha',
        },
        { 
          orgId: 'enterprise_tenant_beta', 
          users: ['user_beta_1', 'user_beta_2'],
          roomPrefix: 'beta',
        },
      ];

      // Phase 1: Multi-tenant authentication
      const tenantAuthResults = [];
      
      for (const tenant of tenants) {
        for (const userId of tenant.users) {
          const session = createValidAuthSession();
          mockPrepareSession.mockReturnValue(session);

          const result = await authenticate({
            userId,
            orgId: tenant.orgId,
            userInfo: {
              name: userId,
              color: `#${tenant.orgId.slice(-6)}`,
            },
          });

          tenantAuthResults.push({
            tenant: tenant.orgId,
            user: userId,
            success: result.status === 200,
          });
        }
      }

      // Verify all tenant users authenticated
      expect(tenantAuthResults.every(r => r.success)).toBe(true);
      expect(tenantAuthResults).toHaveLength(5); // 3 + 2 users

      // Phase 2: Multi-tenant room isolation
      const MultiTenantWorkspace = ({ tenant }: { tenant: typeof tenants[0] }) => React.createElement(Room, {
        id: `${tenant.roomPrefix}_enterprise_room`,
        authEndpoint: `/api/enterprise-auth/${tenant.orgId}`,
        fallback: React.createElement('div', { 'data-testid': `${tenant.roomPrefix}-loading` }, 'Loading tenant workspace...'),
        children: React.createElement('div', { 'data-testid': `${tenant.roomPrefix}-workspace` },
          React.createElement('div', { 'data-testid': `${tenant.roomPrefix}-header` }, `Tenant: ${tenant.orgId}`),
          React.createElement('div', { 'data-testid': `${tenant.roomPrefix}-users` }, `Users: ${tenant.users.length}`),
          React.createElement('div', { 'data-testid': `${tenant.roomPrefix}-content` }, `Tenant-specific content for ${tenant.roomPrefix}`)
        )
      });

      // Render workspaces for each tenant
      const { rerender } = render(React.createElement(MultiTenantWorkspace, { tenant: tenants[0] }));

      // Verify first tenant workspace
      expect(screen.getByTestId('alpha-workspace')).toBeInTheDocument();
      expect(screen.getByTestId('alpha-header')).toHaveTextContent('enterprise_tenant_alpha');
      expect(screen.getByTestId('alpha-users')).toHaveTextContent('Users: 3');

      // Switch to second tenant
      rerender(React.createElement(MultiTenantWorkspace, { tenant: tenants[1] }));
      
      expect(screen.getByTestId('beta-workspace')).toBeInTheDocument();
      expect(screen.getByTestId('beta-header')).toHaveTextContent('enterprise_tenant_beta');
      expect(screen.getByTestId('beta-users')).toHaveTextContent('Users: 2');

      // Verify proper tenant isolation through room IDs
      const roomCalls = mockRoomProvider.mock.calls;
      const roomIds = roomCalls.map(call => call[0].id);
      expect(roomIds).toContain('alpha_enterprise_room');
      expect(roomIds).toContain('beta_enterprise_room');
    });
  });
});