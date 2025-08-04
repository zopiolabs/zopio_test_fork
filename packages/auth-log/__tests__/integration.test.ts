/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logAccessAttempt } from '../logger.js';
import { createBetterStackLogger } from '../adapters/betterstack.js';
import type { AccessLogEntry } from '../types.js';
import fs from 'node:fs';

// Mock all dependencies
vi.mock('../adapters/console.js', () => ({
  consoleLogger: {
    write: vi.fn(),
  },
}));

vi.mock('../adapters/file.js', () => ({
  fileLogger: {
    write: vi.fn(),
  },
}));

vi.mock('../adapters/betterstack.js', () => ({
  createBetterStackLogger: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    appendFileSync: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper functions to reduce deep nesting
function createEnvironmentSetter(env: Record<string, string | undefined>) {
  return (key: string, value: string | undefined) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  };
}

function createEnvironmentCleaner(env: Record<string, string | undefined>) {
  return (key: string) => {
    delete process.env[key];
  };
}

/**
 * Helper function creates timeout delay Promises for async logger simulation, eliminating deep nesting in setTimeout callback chains
 */
function createTimeoutDelay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Helper function applies environment variable settings, eliminating deep nesting in Object.entries().forEach() chains
 */
function applyEnvironmentSettings(env: Record<string, string | undefined>): void {
  const envSetter = createEnvironmentSetter(env);
  Object.entries(env).forEach(([key, value]) => envSetter(key, value));
}

/**
 * Helper function creates performance logging Promises for the given entry, eliminating deep nesting in Promise.all.map callback chains
 */
function createPerformanceLogPromise(entry: AccessLogEntry) {
  return Promise.resolve().then(() => logAccessAttempt(entry));
}

/**
 * Helper function creates delay Promises, eliminating deep nesting in setTimeout callback chains
 */
function createDelayPromise(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper function creates performance test entry data arrays, eliminating deep nesting in Array.from callback chains
 */
function createPerformanceTestData(): string[] {
  return Array.from({ length: 10 }, (_, j) => `item_${j}`);
}

/**
 * Helper function processes user actions for multi-tenant entries, eliminating deep nesting in forEach callback chains
 */
function processUserActionsForTenant(
  tenantId: string,
  userIndex: number,
  tenantIndex: number,
  multiTenantEntries: AccessLogEntry[]
): void {
  // Each user performs multiple actions
  const userActions = [
    {
      resource: 'tenant_dashboard',
      action: 'access',
      can: true,
    },
    {
      resource: 'tenant_data',
      action: 'read',
      can: true,
    },
    {
      resource: 'cross_tenant_data',
      action: 'read',
      can: false,
      reason: 'Cross-tenant access denied',
    },
    {
      resource: 'tenant_settings',
      action: 'modify',
      can: userIndex <= 2, // Only first 2 users per tenant can modify settings
      reason: userIndex > 2 ? 'Insufficient privileges for tenant settings modification' : undefined,
    },
  ];

  const actionProcessor = createUserActionProcessor(tenantId, userIndex, tenantIndex);
  userActions.forEach((action, actionIndex) => {
    multiTenantEntries.push(actionProcessor(action, actionIndex));
  });
}

function createUserActionProcessor(tenantId: string, userIndex: number, tenantIndex: number) {
  return (action: any, actionIndex: number) => {
    const userId = `user_${userIndex}_${tenantId}`;
    return {
      timestamp: `2024-01-15T11:18:${String(tenantIndex * 10 + actionIndex).padStart(2, '0')}.000Z`,
      resource: action.resource,
      action: action.action,
      context: {
        userId,
        tenantId,
        role: userIndex <= 2 ? 'tenant_admin' : 'tenant_user',
        crossTenantAttempt: action.resource === 'cross_tenant_data',
        tenantIsolation: true,
      },
      recordId: `${tenantId}_record_${userIndex}_${actionIndex}`,
      can: action.can,
      reason: action.reason,
    };
  };
}

function createTenantLogFilter(tenantId: string) {
  return (output: string) => output.includes(tenantId);
}

describe('Auth Log Package Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockStderr: any;
  let mockStdout: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    
    // Mock stderr and stdout
    mockStderr = { write: vi.spyOn(process.stderr, 'write').mockImplementation(() => true) };
    mockStdout = { write: vi.spyOn(process.stdout, 'write').mockImplementation(() => true) };
    
    // Clear environment variables
    delete process.env.AUTH_LOG_TARGET;
    delete process.env.BETTERSTACK_SOURCE_TOKEN;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Restore spied functions
    if (mockStderr?.write?.mockRestore) mockStderr.write.mockRestore();
    if (mockStdout?.write?.mockRestore) mockStdout.write.mockRestore();
    vi.restoreAllMocks();
  });

  describe('end-to-end logger integration', () => {
    /**
     * Tests complete logging flow from logger.js to console adapter
     * to ensure proper end-to-end functionality
     */
    it('should complete full logging flow with console adapter', () => {
      // No environment variables set - should default to console
      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T11:10:00.000Z',
        resource: 'integration_test',
        action: 'console_flow',
        context: {
          userId: 'integration_user_1',
          testType: 'e2e_console',
        },
        can: true,
      };

      logAccessAttempt(entry);

      // Verify the flow: logger -> config -> console adapter -> stdout
      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      
      const outputCall = mockStdout.write.mock.calls[0][0];
      expect(outputCall).toContain('[AUTH-LOG]');
      expect(outputCall).toContain('integration_test');
      expect(outputCall).toContain('console_flow');
      expect(outputCall).toContain('integration_user_1');
      expect(outputCall).toContain('"can":true');
    });

    /**
     * Tests complete logging flow with file adapter
     * to ensure proper file logging integration
     */
    it('should complete full logging flow with file adapter', () => {
      process.env.AUTH_LOG_TARGET = 'file';
      const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T11:10:01.000Z',
        resource: 'integration_test',
        action: 'file_flow',
        context: {
          userId: 'integration_user_2',
          testType: 'e2e_file',
          metadata: {
            sessionId: 'sess_integration_123',
            requestId: 'req_integration_456',
          },
        },
        recordId: 'record_integration_789',
        field: 'sensitive_field',
        can: false,
        reason: 'Integration test: access denied for demonstration',
      };

      logAccessAttempt(entry);

      // Verify the flow: logger -> config -> file adapter -> fs.appendFileSync
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        './logs/access.log',
        `${JSON.stringify(entry)}\n`
      );

      // Verify the file content structure
      const [filePath, content] = mockFs.appendFileSync.mock.calls[0];
      expect(filePath).toBe('./logs/access.log');
      expect(content).toContain('integration_test');
      expect(content).toContain('file_flow');
      expect(content).toContain('integration_user_2');
      expect(content).toContain('"can":false');
      expect(content).toContain('Integration test: access denied');
    });

    /**
     * Tests complete logging flow with BetterStack adapter
     * to ensure proper API integration
     */
    it('should complete full logging flow with BetterStack adapter', async () => {
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'integration-test-token-123';

      const mockBetterStackLogger = {
        write: vi.fn().mockImplementation(async (entry: AccessLogEntry) => {
          // Simulate the actual BetterStack write logic
          const response = await mockFetch('https://in.logs.betterstack.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer integration-test-token-123',
            },
            body: JSON.stringify({
              ...entry,
              level: entry.can ? 'info' : 'warn',
              message: `Auth ${entry.can ? 'ALLOWED' : 'DENIED'}: ${entry.action} ${entry.resource}${entry.field ? '.' + entry.field : ''}`,
              service: 'auth-service',
            }),
          });
          
          if (!response.ok) {
            throw new Error('API request failed');
          }
        }),
      };

      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const entry: AccessLogEntry = {
        timestamp: '2024-01-15T11:10:02.000Z',
        resource: 'integration_test',
        action: 'betterstack_flow',
        context: {
          userId: 'integration_user_3',
          testType: 'e2e_betterstack',
          requestMetadata: {
            userAgent: 'IntegrationTestAgent/1.0',
            ipAddress: '192.168.1.100',
            sessionDuration: 3600,
          },
        },
        recordId: 'integration_record_abc',
        can: true,
      };

      logAccessAttempt(entry);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify the flow: logger -> config -> BetterStack adapter -> fetch
      expect(createBetterStackLogger).toHaveBeenCalledWith({
        sourceToken: 'integration-test-token-123',
      });
      expect(mockBetterStackLogger.write).toHaveBeenCalledWith(entry);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the API request structure
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://in.logs.betterstack.com');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers.Authorization).toBe('Bearer integration-test-token-123');

      const requestBody = JSON.parse(options.body);
      expect(requestBody.timestamp).toBe(entry.timestamp);
      expect(requestBody.resource).toBe(entry.resource);
      expect(requestBody.level).toBe('info');
      expect(requestBody.message).toBe('Auth ALLOWED: betterstack_flow integration_test');
      expect(requestBody.service).toBe('auth-service');
    });
  });

  describe('environment-based adapter switching', () => {
    /**
     * Tests dynamic adapter switching based on environment variables
     * to ensure proper configuration-driven behavior
     */
    it('should switch adapters based on environment configuration', () => {
      const testScenarios = [
        {
          name: 'Default to console logger',
          env: {},
          expectedAdapter: 'console',
        },
        {
          name: 'Explicit console logger',
          env: { AUTH_LOG_TARGET: 'console' },
          expectedAdapter: 'console',
        },
        {
          name: 'File logger',
          env: { AUTH_LOG_TARGET: 'file' },
          expectedAdapter: 'file',
        },
        {
          name: 'BetterStack with token',
          env: { 
            AUTH_LOG_TARGET: 'betterstack',
            BETTERSTACK_SOURCE_TOKEN: 'test-token-456',
          },
          expectedAdapter: 'betterstack',
        },
        {
          name: 'BetterStack without token (fallback to console)',
          env: { AUTH_LOG_TARGET: 'betterstack' },
          expectedAdapter: 'console',
        },
      ];

      testScenarios.forEach(({ name, env, expectedAdapter }) => {
        vi.clearAllMocks();
        
        // Set environment variables
        applyEnvironmentSettings(env);

        // Mock BetterStack logger creation
        if (expectedAdapter === 'betterstack') {
          const mockBetterStackLogger = { write: vi.fn() };
          (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
        }

        const entry: AccessLogEntry = {
          timestamp: '2024-01-15T11:11:00.000Z',
          resource: 'adapter_switch_test',
          action: 'environment_test',
          context: {
            scenario: name,
            expectedAdapter,
          },
          can: true,
        };

        logAccessAttempt(entry);

        // Verify correct adapter was used
        switch (expectedAdapter) {
          case 'console':
            expect(mockStdout.write).toHaveBeenCalledTimes(1);
            expect(mockStdout.write.mock.calls[0][0]).toContain(name.replace(/\s+/g, '_'));
            break;
          
          case 'file': {
            const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };
            expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
            expect(mockFs.appendFileSync).toHaveBeenCalledWith(
              './logs/access.log',
              expect.stringContaining(name.replace(/\s+/g, '_'))
            );
            break;
          }
          
          case 'betterstack':
            expect(createBetterStackLogger).toHaveBeenCalledWith({
              sourceToken: 'test-token-456',
            });
            break;
        }

        // Clean up environment
        const envCleaner = createEnvironmentCleaner(env);
        Object.keys(env).forEach(envCleaner);
      });
    });

    /**
     * Tests adapter switching with configuration changes during runtime
     * to ensure proper handling of dynamic configuration updates
     */
    it('should handle runtime environment changes', () => {
      const configurationChanges = [
        { target: 'console', token: undefined },
        { target: 'file', token: undefined },
        { target: 'betterstack', token: 'runtime-token-1' },
        { target: 'console', token: undefined },
        { target: 'betterstack', token: 'runtime-token-2' },
      ];

      configurationChanges.forEach((config, index) => {
        vi.clearAllMocks();
        
        // Update environment
        if (config.target) {
          process.env.AUTH_LOG_TARGET = config.target;
        }
        if (config.token) {
          process.env.BETTERSTACK_SOURCE_TOKEN = config.token;
        } else {
          delete process.env.BETTERSTACK_SOURCE_TOKEN;
        }

        // Mock BetterStack logger if needed
        if (config.target === 'betterstack' && config.token) {
          const mockBetterStackLogger = { write: vi.fn() };
          (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
        }

        const entry: AccessLogEntry = {
          timestamp: `2024-01-15T11:12:${String(index).padStart(2, '0')}.000Z`,
          resource: 'runtime_config_test',
          action: 'config_change',
          context: {
            changeIndex: index,
            target: config.target,
            hasToken: !!config.token,
          },
          can: true,
        };

        logAccessAttempt(entry);

        // Verify the correct adapter is used after each configuration change
        switch (config.target) {
          case 'console':
            expect(mockStdout.write).toHaveBeenCalledTimes(1);
            break;
          
          case 'file': {
            const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };
            expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
            break;
          }
          
          case 'betterstack':
            if (config.token) {
              expect(createBetterStackLogger).toHaveBeenCalledWith({
                sourceToken: config.token,
              });
            } else {
              // Should fallback to console
              expect(mockStdout.write).toHaveBeenCalledTimes(1);
              expect(mockStderr.write).toHaveBeenCalledWith(
                '[AUTH-LOG] BETTERSTACK_SOURCE_TOKEN is not set, falling back to console logger\n'
              );
            }
            break;
        }
      });
    });
  });

  describe('cross-adapter compatibility', () => {
    /**
     * Tests that the same log entry produces consistent output across adapters
     * to ensure adapter interface compatibility
     */
    it('should produce consistent log entries across different adapters', async () => {
      const testEntry: AccessLogEntry = {
        timestamp: '2024-01-15T11:13:00.000Z',
        resource: 'cross_adapter_test',
        action: 'compatibility_test',
        context: {
          userId: 'compatibility_user',
          sessionId: 'compat_session_123',
          testData: {
            string: 'test string',
            number: 42,
            boolean: true,
            array: ['item1', 'item2', 'item3'],
            object: {
              nested: 'value',
              count: 10,
            },
          },
        },
        recordId: 'compat_record_456',
        field: 'test_field',
        can: false,
        reason: 'Cross-adapter compatibility test denial',
      };

      // Test console adapter
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'console';
      logAccessAttempt(testEntry);
      
      expect(mockStdout.write).toHaveBeenCalledTimes(1);
      const consoleOutput = mockStdout.write.mock.calls[0][0];
      
      // Test file adapter
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'file';
      const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };
      logAccessAttempt(testEntry);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      const fileOutput = mockFs.appendFileSync.mock.calls[0][1];
      
      // Test BetterStack adapter
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'compat-test-token';
      
      const mockBetterStackLogger = { write: vi.fn() };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      const mockResponse = { ok: true, status: 200, text: vi.fn().mockResolvedValue('Success') };
      mockFetch.mockResolvedValue(mockResponse);
      
      logAccessAttempt(testEntry);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockBetterStackLogger.write).toHaveBeenCalledWith(testEntry);

      // Verify all adapters received the same entry data
      // Console and file should contain the core entry data
      expect(consoleOutput).toContain('cross_adapter_test');
      expect(consoleOutput).toContain('compatibility_test');
      expect(consoleOutput).toContain('compatibility_user');
      expect(consoleOutput).toContain('"can":false');
      
      expect(fileOutput).toContain('cross_adapter_test');
      expect(fileOutput).toContain('compatibility_test');
      expect(fileOutput).toContain('compatibility_user');
      expect(fileOutput).toContain('"can":false');
      
      // BetterStack adapter receives the exact entry object
      expect(mockBetterStackLogger.write).toHaveBeenCalledWith(testEntry);
    });

    /**
     * Tests adapter performance characteristics with the same workload
     * to ensure consistent performance across adapters
     */
    it('should maintain reasonable performance across all adapters', async () => {
      const testEntries: AccessLogEntry[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2024-01-15T11:14:${String(Math.floor(i / 60)).padStart(2, '0')}.${String((i % 60) * 1000).padStart(3, '0')}Z`,
        resource: `performance_test_${i % 10}`,
        action: 'performance_benchmark',
        context: {
          userId: `perf_user_${i % 20}`,
          requestId: `perf_req_${i}`,
          metadata: {
            batchId: Math.floor(i / 25),
            index: i,
            data: createPerformanceTestData(),
          },
        },
        can: i % 3 !== 0, // 67% success rate
        reason: i % 3 === 0 ? `Performance test denial ${i}` : undefined,
      }));

      const performanceResults: Record<string, number> = {};

      // Test console adapter performance
      process.env.AUTH_LOG_TARGET = 'console';
      const consoleStartTime = Date.now();
      testEntries.forEach(entry => logAccessAttempt(entry));
      performanceResults.console = Date.now() - consoleStartTime;
      expect(performanceResults.console).toBeLessThan(1000); // Less than 1 second

      // Test file adapter performance
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'file';
      const fileStartTime = Date.now();
      testEntries.forEach(entry => logAccessAttempt(entry));
      performanceResults.file = Date.now() - fileStartTime;
      expect(performanceResults.file).toBeLessThan(1000); // Less than 1 second

      // Test BetterStack adapter performance
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'perf-test-token';
      
      const mockBetterStackLogger = { 
        write: vi.fn().mockImplementation(async () => {
          // Simulate network delay
          await createDelayPromise(1);
        }),
      };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      
      const betterStackStartTime = Date.now();
      await Promise.all(testEntries.map(createPerformanceLogPromise));
      performanceResults.betterstack = Date.now() - betterStackStartTime;
      expect(performanceResults.betterstack).toBeLessThan(2000); // Allow more time for async operations

      // Verify all adapters processed all entries
      expect(mockStdout.write).toHaveBeenCalledTimes(100); // Console calls
      const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(100); // File calls
      expect(mockBetterStackLogger.write).toHaveBeenCalledTimes(100); // BetterStack calls
    });
  });

  describe('error handling integration', () => {
    /**
     * Tests error propagation and handling across the entire logging stack
     * to ensure proper error handling integration
     */
    it('should handle errors consistently across adapters', async () => {
      const errorTestEntry: AccessLogEntry = {
        timestamp: '2024-01-15T11:15:00.000Z',
        resource: 'error_handling_test',
        action: 'error_integration',
        context: {
          userId: 'error_test_user',
          errorType: 'integration_test',
        },
        can: true,
      };

      // Test console adapter error handling
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'console';
      mockStdout.write.mockImplementation(() => {
        throw new Error('Console write error');
      });
      
      expect(() => logAccessAttempt(errorTestEntry)).toThrow('Console write error');

      // Test file adapter error handling
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'file';
      const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('File write error: ENOSPC');
      });
      
      expect(() => logAccessAttempt(errorTestEntry)).toThrow('File write error: ENOSPC');

      // Test BetterStack adapter error handling
      vi.clearAllMocks();
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'error-test-token';
      
      const mockBetterStackLogger = {
        write: vi.fn().mockImplementation(async () => {
          // Simulate different types of network errors
          mockFetch.mockRejectedValue(new Error('Network timeout'));
          await mockFetch('test');
        }),
      };
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
      
      await expect(mockBetterStackLogger.write(errorTestEntry)).rejects.toThrow('Network timeout');
    });

    /**
     * Tests graceful degradation when adapters fail
     * to ensure system resilience
     */
    it('should handle adapter failures gracefully in production scenarios', async () => {
      // Test scenario: BetterStack API is down, should log error but not crash
      process.env.AUTH_LOG_TARGET = 'betterstack';
      process.env.BETTERSTACK_SOURCE_TOKEN = 'degradation-test-token';
      
      const resilientBetterStackLogger = {
        write: vi.fn().mockImplementation(async (entry: AccessLogEntry) => {
          try {
            mockFetch.mockRejectedValue(new Error('API service unavailable'));
            await mockFetch('https://in.logs.betterstack.com', {
              method: 'POST',
              body: JSON.stringify(entry),
            });
          } catch (error) {
            // Log error to stderr but don't throw
            process.stderr.write(`[AUTH-LOG] Error sending log to BetterStack: ${(error as Error).message}\n`);
          }
        }),
      };
      
      (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(resilientBetterStackLogger);

      const degradationTestEntry: AccessLogEntry = {
        timestamp: '2024-01-15T11:16:00.000Z',
        resource: 'degradation_test',
        action: 'resilience_test',
        context: {
          userId: 'resilience_user',
          scenario: 'api_unavailable',
        },
        can: true,
      };

      // Should not throw even though BetterStack fails
      await expect(
        Promise.resolve().then(() => logAccessAttempt(degradationTestEntry))
      ).resolves.not.toThrow();

      expect(resilientBetterStackLogger.write).toHaveBeenCalledWith(degradationTestEntry);
      expect(mockStderr.write).toHaveBeenCalledWith(
        '[AUTH-LOG] Error sending log to BetterStack: API service unavailable\n'
      );
    });
  });

  describe('real-world usage scenarios', () => {
    /**
     * Tests typical authentication flow logging patterns
     * to ensure practical usability
     */
    it('should handle typical authentication workflow logging', async () => {
      // Simulate a complete authentication workflow with different outcomes
      const authWorkflow = [
        {
          timestamp: '2024-01-15T11:17:00.000Z',
          resource: 'login_endpoint',
          action: 'authenticate',
          context: {
            userId: 'workflow_user_123',
            loginAttempt: 1,
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (compatible; TestBrowser/1.0)',
          },
          can: true,
        },
        {
          timestamp: '2024-01-15T11:17:01.000Z',
          resource: 'user_profile',
          action: 'read',
          context: {
            userId: 'workflow_user_123',
            sessionId: 'workflow_session_abc123',
            isOwnResource: true,
          },
          recordId: 'profile_workflow_user_123',
          can: true,
        },
        {
          timestamp: '2024-01-15T11:17:02.000Z',
          resource: 'admin_panel',
          action: 'access',
          context: {
            userId: 'workflow_user_123',
            role: 'user',
            attemptedEscalation: true,
          },
          can: false,
          reason: 'User role insufficient for admin panel access',
        },
        {
          timestamp: '2024-01-15T11:17:03.000Z',
          resource: 'document',
          action: 'read',
          context: {
            userId: 'workflow_user_123',
            documentType: 'public',
            accessPattern: 'normal',
          },
          recordId: 'doc_public_456',
          can: true,
        },
        {
          timestamp: '2024-01-15T11:17:04.000Z',
          resource: 'document',
          action: 'read',
          context: {
            userId: 'workflow_user_123',
            documentType: 'confidential',
            requiredClearance: 'secret',
            userClearance: 'public',
          },
          recordId: 'doc_confidential_789',
          field: 'sensitive_content',
          can: false,
          reason: 'Insufficient security clearance for confidential document access',
        },
      ];

      // Test workflow with different adapters
      const adapters = ['console', 'file', 'betterstack'];
      
      for (const adapter of adapters) {
        vi.clearAllMocks();
        
        // Configure adapter
        process.env.AUTH_LOG_TARGET = adapter;
        if (adapter === 'betterstack') {
          process.env.BETTERSTACK_SOURCE_TOKEN = 'workflow-test-token';
          const mockBetterStackLogger = { write: vi.fn() };
          (createBetterStackLogger as ReturnType<typeof vi.fn>).mockReturnValue(mockBetterStackLogger);
          const mockResponse = { ok: true, status: 200, text: vi.fn().mockResolvedValue('Success') };
          mockFetch.mockResolvedValue(mockResponse);
        }

        // Execute workflow
        for (const entry of authWorkflow) {
          logAccessAttempt(entry as AccessLogEntry);
        }

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify all entries were logged
        switch (adapter) {
          case 'console':
            expect(mockStdout.write).toHaveBeenCalledTimes(authWorkflow.length);
            break;
          
          case 'file': {
            const mockFs = fs as unknown as { appendFileSync: ReturnType<typeof vi.fn> };
            expect(mockFs.appendFileSync).toHaveBeenCalledTimes(authWorkflow.length);
            break;
          }
          
          case 'betterstack':
            expect(mockFetch).toHaveBeenCalledTimes(authWorkflow.length);
            break;
        }
      }
    });

    /**
     * Tests high-volume logging scenarios
     * to ensure scalability and performance
     */
    it('should handle high-volume production-like logging', async () => {
      // Simulate high-volume production logging
      const volumeTest = {
        usersCount: 50,
        requestsPerUser: 20,
        duration: 60, // seconds
      };

      const highVolumeEntries: AccessLogEntry[] = [];
      const startTime = Date.now();

      // Generate realistic high-volume log entries
      for (let userId = 1; userId <= volumeTest.usersCount; userId++) {
        for (let requestId = 1; requestId <= volumeTest.requestsPerUser; requestId++) {
          const entryTime = startTime + (requestId * (volumeTest.duration * 1000) / volumeTest.requestsPerUser);
          const resources = ['api_endpoint', 'user_profile', 'document', 'settings', 'dashboard'];
          const actions = ['read', 'write', 'update', 'delete', 'execute'];
          
          highVolumeEntries.push({
            timestamp: new Date(entryTime).toISOString(),
            resource: resources[requestId % resources.length],
            action: actions[requestId % actions.length],
            context: {
              userId: `high_volume_user_${userId}`,
              requestId: `hvol_req_${userId}_${requestId}`,
              batchId: Math.floor(requestId / 5),
              load: 'high_volume_test',
              performanceMetrics: {
                responseTime: Math.floor(Math.random() * 500) + 50,
                memoryUsage: Math.floor(Math.random() * 100) + 50,
              },
            },
            recordId: `hvol_record_${userId}_${requestId}`,
            can: requestId % 7 !== 0, // ~86% success rate
            reason: requestId % 7 === 0 ? `Rate limited: request ${requestId}` : undefined,
          });
        }
      }

      // Test with console adapter (fastest)
      process.env.AUTH_LOG_TARGET = 'console';
      
      const testStartTime = Date.now();
      highVolumeEntries.forEach(entry => logAccessAttempt(entry));
      const testEndTime = Date.now();
      const totalProcessingTime = testEndTime - testStartTime;

      // Performance assertions
      expect(highVolumeEntries).toHaveLength(volumeTest.usersCount * volumeTest.requestsPerUser);
      expect(totalProcessingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockStdout.write).toHaveBeenCalledTimes(highVolumeEntries.length);

      // Verify memory usage didn't explode
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });

    /**
     * Tests multi-tenant logging scenarios
     * to ensure proper tenant isolation and logging
     */
    it('should handle multi-tenant logging scenarios', () => {
      const tenants = ['tenant_alpha', 'tenant_beta', 'gamma_corp', 'delta_inc'];
      const usersPerTenant = 5;
      const multiTenantEntries: AccessLogEntry[] = [];

      // Generate multi-tenant log entries
      tenants.forEach((tenantId, tenantIndex) => {
        for (let userIndex = 1; userIndex <= usersPerTenant; userIndex++) {
          
          processUserActionsForTenant(tenantId, userIndex, tenantIndex, multiTenantEntries);
        }
      });

      // Log all multi-tenant entries
      process.env.AUTH_LOG_TARGET = 'console';
      multiTenantEntries.forEach(entry => logAccessAttempt(entry));

      // Verify all entries were logged
      expect(mockStdout.write).toHaveBeenCalledTimes(multiTenantEntries.length);
      expect(multiTenantEntries).toHaveLength(tenants.length * usersPerTenant * 4);

      // Verify tenant isolation is properly logged
      const logOutputs = mockStdout.write.mock.calls.map((call: any[]) => call[0]);
      
      // Each tenant should have entries logged
      tenants.forEach(tenantId => {
        const tenantLogFilter = createTenantLogFilter(tenantId);
        const tenantLogs = logOutputs.filter(tenantLogFilter);
        expect(tenantLogs.length).toBe(usersPerTenant * 4);
      });

      // Verify cross-tenant access denials are logged
      const crossTenantDenials = logOutputs.filter((output: string) => 
        output.includes('cross_tenant_data') && output.includes('"can":false')
      );
      expect(crossTenantDenials).toHaveLength(tenants.length * usersPerTenant);
    });
  });
});