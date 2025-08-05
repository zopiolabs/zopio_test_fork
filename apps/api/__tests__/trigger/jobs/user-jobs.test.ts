/**
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Global disable for test file - job objects need type assertions to access .run method

/**
 * Comprehensive Test Suite: Trigger.dev User Job Definitions
 * 
 * Tests user-related background job functionality with modern testing practices:
 * 
 * Job Coverage:
 * - sendWelcomeEmailJob: Welcome email delivery for new users
 * - notifyAdminsJob: Admin notifications with rule evaluation
 * - processUserDeletionJob: User deletion processing with rule execution
 * 
 * Testing Approaches:
 * - Unit testing with comprehensive mocking
 * - Property-based testing with fast-check
 * - Error handling and edge case validation
 * - Performance and concurrency testing
 * - Security input validation
 * - Contract compliance verification
 * 
 * Quality Standards:
 * - Complete test coverage for all job functions
 * - Performance validation (execution < 100ms)
 * - Security validation for malicious inputs
 * - Error handling for all failure modes
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import type { IO } from '@trigger.dev/sdk';
import { 
  sendWelcomeEmailJob, 
  notifyAdminsJob, 
  processUserDeletionJob 
} from '../../../app/trigger/jobs/user-jobs';

/**
 * Type definitions for test payload structures
 */
interface UserCreatedPayload {
  email: string;
  name?: string;
  userId?: string;
  plan?: string;
}

interface UserDeletedPayload {
  userId: string;
  reason?: string;
}

/**
 * Mock Configuration
 * 
 * Configures external dependencies for isolated unit testing:
 * - @repo/trigger: Mock Trigger.dev client and job definition system
 * - @repo/trigger-rules: Mock rule evaluation engine for business logic testing
 * - Preserves function signatures for type safety
 * - Enables configurable behavior per test
 */

// Mock the Trigger.dev client system
vi.mock('@repo/trigger', () => ({
  client: {
    defineJob: vi.fn().mockImplementation((config) => ({
      ...config,
      run: config.run, // Preserve run function for direct testing
    })),
  },
}));

// Mock the rule evaluation engine
vi.mock('@repo/trigger-rules', () => ({
  evaluateRule: vi.fn(),
}));

// Import after mocking to ensure proper mock application
import { evaluateRule } from '@repo/trigger-rules';

/**
 * Mock IO Interface
 * 
 * Creates a comprehensive mock of the Trigger.dev IO interface:
 * - Complete logging simulation with spy functionality
 * - Async operation support (wait, events, status)
 * - Configurable for different test scenarios
 */
const createMockIO = (): IO => ({
  logger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
  },
  wait: {
    for: vi.fn().mockResolvedValue(undefined),
  },
  sendEvent: vi.fn().mockResolvedValue({ success: true }),
  createStatus: vi.fn().mockResolvedValue({ update: vi.fn() }),
} as unknown as IO);

/**
 * Creates IO mock with configurable failure injection for error testing
 * 
 * @param failures - Configuration for which operations should fail
 * @returns IO mock with failure behavior
 */
const createFailingIO = (failures: {
  logger?: boolean;
  sendEvent?: boolean;
} = {}): IO => ({
  logger: {
    info: failures.logger 
      ? vi.fn().mockRejectedValue(new Error('Logger failure'))
      : vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
  },
  wait: {
    for: vi.fn().mockResolvedValue(undefined),
  },
  sendEvent: failures.sendEvent
    ? vi.fn().mockRejectedValue(new Error('Event dispatch failure'))
    : vi.fn().mockResolvedValue({ success: true }),
  createStatus: vi.fn().mockResolvedValue({ update: vi.fn() }),
} as unknown as IO);

/**
 * Property-based test data generators
 * 
 * Uses fast-check to create comprehensive test data sets that explore
 * edge cases and boundary conditions automatically.
 */

// User creation payload generator
const userCreatedPayloadArbitrary = fc.record({
  email: fc.emailAddress(),
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  userId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
});

// User deletion payload generator
const userDeletedPayloadArbitrary = fc.record({
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  reason: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
});

// Malicious input generator for security testing
const maliciousPayloadArbitrary = fc.record({
  email: fc.oneof(
    fc.constant('"><script>alert("xss")</script>'),
    fc.constant('admin@company.com; DROP TABLE users;--'),
    fc.constant('../../../etc/passwd'),
  ),
  name: fc.oneof(
    fc.constant('A'.repeat(1000)), // Long name
    fc.constant('<script>malicious()</script>'),
    fc.constant('../../config/database.yml'),
  ),
  userId: fc.oneof(
    fc.constant('admin'),
    fc.constant('../../../etc/passwd'),
    fc.constant('SELECT * FROM users WHERE id=1'),
  ),
});

// Unicode test generator
const unicodePayloadArbitrary = fc.record({
  email: fc.oneof(
    fc.constant('用户@example.com'), // Chinese
    fc.constant('пользователь@example.com'), // Russian
    fc.constant('🦄🌟@example.com'), // Emoji
  ),
  name: fc.oneof(
    fc.constant('张三'), // Chinese name
    fc.constant('José María García-López'), // Spanish with accents
    fc.constant('🦄 Unicorn User 🌟'), // Emoji in name
  ),
  userId: fc.string({ minLength: 1, maxLength: 50 }),
});

// Mock the rules.json import - define mock data inline
vi.mock('../../../app/trigger/rules.json', () => ({
  default: [
    {
      event: 'user.created',
      conditions: { 'user.plan': 'pro' },
      actions: [
        { type: 'log', message: '🎉 A new Pro user has joined!' },
        { type: 'email', to: 'admin@example.com', template: 'welcome-pro' },
      ],
    },
    {
      event: 'user.deleted',
      conditions: { userId: '123' },
      actions: [
        { type: 'log', message: '⚠️ Admin user was deleted!' },
      ],
    },
  ],
}));

/**
 * Mock rules for testing rule evaluation logic
 */
const mockRules = [
  {
    event: 'user.created',
    conditions: { 'user.plan': 'pro' },
    actions: [
      { type: 'log', message: '🎉 A new Pro user has joined!' },
      { type: 'email', to: 'admin@example.com', template: 'welcome-pro' },
    ],
  },
  {
    event: 'user.deleted',
    conditions: { userId: '123' },
    actions: [
      { type: 'log', message: '⚠️ Admin user was deleted!' },
    ],
  },
];

/**
 * Test utility functions
 */

/**
 * Measures execution time of an operation
 * 
 * @param operation - Operation to measure
 * @returns Execution time in milliseconds
 */
const measureExecutionTime = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
};

/**
 * Validates job contract compliance
 * 
 * @param job - Job object to validate
 * @returns Validation results
 */
const validateJobContract = (job: any): { isValid: boolean; violations: string[] } => {
  const violations: string[] = [];
  
  if (typeof job.id !== 'string') violations.push('Job must have a string id property');
  if (typeof job.name !== 'string') violations.push('Job must have a string name property');
  if (typeof job.version !== 'string') violations.push('Job must have a string version property');
  if (!job.trigger || typeof job.trigger !== 'object') violations.push('Job must have a trigger object');
  if (typeof job.run !== 'function') violations.push('Job must have a run function');
  if (job.run && job.run.constructor.name !== 'AsyncFunction') violations.push('Job run function must be async');

  return {
    isValid: violations.length === 0,
    violations,
  };
};

describe('User Jobs - Comprehensive Test Suite', () => {
  let mockIO: IO;
  const mockEvaluateRule = vi.mocked(evaluateRule);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIO = createMockIO();
    mockEvaluateRule.mockResolvedValue({ executed: true });
  });

  describe('sendWelcomeEmailJob', () => {
    /**
     * Tests for welcome email job functionality
     * Validates job configuration, payload handling, and execution flow
     */

    it('should have correct job configuration', () => {
      expect(sendWelcomeEmailJob.id).toBe('send-welcome-email');
      expect(sendWelcomeEmailJob.name).toBe('Send Welcome Email');
      expect(sendWelcomeEmailJob.version).toBe('1.0.0');
      expect(sendWelcomeEmailJob.trigger).toBeDefined();
    });

    it('should have async run function', () => {
      expect(typeof (sendWelcomeEmailJob as any).run).toBe('function');
      expect((sendWelcomeEmailJob as any).run.constructor.name).toBe('AsyncFunction');
    });

    it('should send welcome email successfully', async () => {
      const payload: UserCreatedPayload = {
        email: 'newuser@example.com',
        name: 'John Doe',
        userId: 'user_123',
      };

      const result = await (sendWelcomeEmailJob as any).run(payload, mockIO);

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'Sending welcome email to newuser@example.com'
      );
      expect(result).toEqual({
        success: true,
        email: 'newuser@example.com',
      });
    });

    it('should handle payload without optional fields', async () => {
      const payload: UserCreatedPayload = {
        email: 'required@example.com',
      };

      const result = await (sendWelcomeEmailJob as any).run(payload, mockIO);

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'Sending welcome email to required@example.com'
      );
      expect(result).toEqual({
        success: true,
        email: 'required@example.com',
      });
    });

    it('should handle various valid payloads (property-based)', async () => {
      await fc.assert(
        fc.asyncProperty(userCreatedPayloadArbitrary, async (payload) => {
          vi.clearAllMocks();
          
          const result = await (sendWelcomeEmailJob as any).run(payload, mockIO);

          expect(result).toEqual({
            success: true,
            email: payload.email,
          });
          expect(mockIO.logger.info).toHaveBeenCalledWith(
            `Sending welcome email to ${payload.email}`
          );
        }),
        { numRuns: 10 }
      );
    });

    it('should handle special characters in email addresses', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user123@example.co.uk',
      ];

      for (const email of specialEmails) {
        const payload = { email };
        const result = await (sendWelcomeEmailJob as any).run(payload, mockIO);

        expect(result).toEqual({
          success: true,
          email,
        });
        expect(mockIO.logger.info).toHaveBeenCalledWith(
          `Sending welcome email to ${email}`
        );

        vi.clearAllMocks();
      }
    });

    it('should maintain performance under 100ms', async () => {
      const payload: UserCreatedPayload = {
        email: 'performance@example.com',
        name: 'Performance Test',
        userId: 'perf_user',
      };

      const { duration } = await measureExecutionTime(() => 
        (sendWelcomeEmailJob as any).run(payload, mockIO)
      );

      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent executions', async () => {
      const payloads = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        userId: `user_${i}`,
      }));

      const promises = payloads.map((payload) =>
        (sendWelcomeEmailJob as any).run(payload, createMockIO())
      );

      const results = await Promise.all(promises);

      results.forEach((result: any, index: number) => {
        expect(result).toEqual({
          success: true,
          email: `user${index}@example.com`,
        });
      });
    });
  });

  describe('notifyAdminsJob', () => {
    /**
     * Tests for admin notification job with rule evaluation
     * Validates complex business logic including rule processing
     */

    it('should have correct job configuration', () => {
      expect(notifyAdminsJob.id).toBe('notify-admins-new-user');
      expect(notifyAdminsJob.name).toBe('Notify Admins of New User');
      expect(notifyAdminsJob.version).toBe('1.0.0');
      expect(notifyAdminsJob.trigger).toBeDefined();
    });

    it('should notify admins and evaluate matching rules', async () => {
      const payload: UserCreatedPayload = {
        email: 'newadmin@example.com',
        name: 'Admin User',
        userId: 'admin_123',
      };

      const result = await (notifyAdminsJob as any).run(payload, mockIO);

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'New user signed up: newadmin@example.com'
      );

      // Should evaluate rules for 'user.created' event
      const userCreatedRules = mockRules.filter(rule => rule.event === 'user.created');
      expect(mockEvaluateRule).toHaveBeenCalledTimes(userCreatedRules.length);
      
      userCreatedRules.forEach((rule) => {
        expect(mockEvaluateRule).toHaveBeenCalledWith(rule, { user: payload });
      });

      expect(result).toEqual({ success: true });
    });

    it('should handle rule evaluation failures gracefully', async () => {
      mockEvaluateRule.mockRejectedValueOnce(new Error('Rule evaluation failed'));

      const payload: UserCreatedPayload = {
        email: 'test@example.com',
        name: 'Test User',
        userId: 'test_123',
      };

      await expect((notifyAdminsJob as any).run(payload, mockIO)).rejects.toThrow('Rule evaluation failed');

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'New user signed up: test@example.com'
      );
    });

    it('should filter rules correctly by event type', async () => {
      const payload: UserCreatedPayload = {
        email: 'filter@example.com',
        name: 'Filter Test',
        userId: 'filter_123',
      };

      await (notifyAdminsJob as any).run(payload, mockIO);

      // Only user.created rules should be evaluated
      const expectedRules = mockRules.filter(rule => rule.event === 'user.created');
      expect(mockEvaluateRule).toHaveBeenCalledTimes(expectedRules.length);
      
      expectedRules.forEach((rule) => {
        expect(mockEvaluateRule).toHaveBeenCalledWith(rule, { user: payload });
      });
    });

    it('should handle various payloads consistently (property-based)', async () => {
      await fc.assert(
        fc.asyncProperty(userCreatedPayloadArbitrary, async (payload) => {
          vi.clearAllMocks();
          
          const result = await (notifyAdminsJob as any).run(payload, mockIO);

          expect(result).toEqual({ success: true });
          expect(mockIO.logger.info).toHaveBeenCalledWith(
            `New user signed up: ${payload.email}`
          );

          const userCreatedRules = mockRules.filter(rule => rule.event === 'user.created');
          expect(mockEvaluateRule).toHaveBeenCalledTimes(userCreatedRules.length);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('processUserDeletionJob', () => {
    /**
     * Tests for user deletion processing job
     * Validates deletion handling and rule evaluation for deletion events
     */

    it('should have correct job configuration', () => {
      expect(processUserDeletionJob.id).toBe('process-user-deletion');
      expect(processUserDeletionJob.name).toBe('Process User Deletion');
      expect(processUserDeletionJob.version).toBe('1.0.0');
      expect(processUserDeletionJob.trigger).toBeDefined();
    });

    it('should process user deletion with reason', async () => {
      const payload: UserDeletedPayload = {
        userId: 'user_123',
        reason: 'Account closure requested',
      };

      const result = await (processUserDeletionJob as any).run(payload, mockIO);

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'User deleted: user_123, reason: Account closure requested'
      );

      const userDeletedRules = mockRules.filter(rule => rule.event === 'user.deleted');
      expect(mockEvaluateRule).toHaveBeenCalledTimes(userDeletedRules.length);
      
      userDeletedRules.forEach((rule) => {
        expect(mockEvaluateRule).toHaveBeenCalledWith(rule, { user: payload });
      });

      expect(result).toEqual({ success: true });
    });

    it('should process user deletion without reason', async () => {
      const payload: UserDeletedPayload = {
        userId: 'user_456',
      };

      const result = await (processUserDeletionJob as any).run(payload, mockIO);

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'User deleted: user_456, reason: Not specified'
      );

      expect(result).toEqual({ success: true });
    });

    it('should handle undefined reason field', async () => {
      const payload: UserDeletedPayload = {
        userId: 'user_789',
        reason: undefined,
      };

      const result = await (processUserDeletionJob as any).run(payload, mockIO);

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'User deleted: user_789, reason: Not specified'
      );

      expect(result).toEqual({ success: true });
    });

    it('should handle various deletion payloads (property-based)', async () => {
      await fc.assert(
        fc.asyncProperty(userDeletedPayloadArbitrary, async (payload) => {
          vi.clearAllMocks();
          
          const result = await (processUserDeletionJob as any).run(payload, mockIO);

          expect(result).toEqual({ success: true });
          
          const expectedReason = payload.reason || 'Not specified';
          expect(mockIO.logger.info).toHaveBeenCalledWith(
            `User deleted: ${payload.userId}, reason: ${expectedReason}`
          );

          const userDeletedRules = mockRules.filter(rule => rule.event === 'user.deleted');
          expect(mockEvaluateRule).toHaveBeenCalledTimes(userDeletedRules.length);
        }),
        { numRuns: 10 }
      );
    });

    it('should handle deletion rule evaluation errors', async () => {
      mockEvaluateRule.mockRejectedValueOnce(new Error('Deletion rule failed'));

      const payload: UserDeletedPayload = {
        userId: 'error_user',
        reason: 'Test error handling',
      };

      await expect((processUserDeletionJob as any).run(payload, mockIO)).rejects.toThrow('Deletion rule failed');

      expect(mockIO.logger.info).toHaveBeenCalledWith(
        'User deleted: error_user, reason: Test error handling'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Comprehensive error handling tests across all job types
     */

    it('should handle IO logger failures gracefully', async () => {
      const failingIO = createFailingIO({ logger: true });
      const payload = { email: 'logger-fail@example.com' };

      await expect((sendWelcomeEmailJob as any).run(payload, failingIO)).rejects.toThrow('Logger failure');
    });

    it('should handle empty payload objects', async () => {
      const emptyPayload = {} as any;

      // Jobs should handle empty payloads gracefully or throw meaningful errors
      await expect((sendWelcomeEmailJob as any).run(emptyPayload, mockIO)).resolves.toBeDefined();
    });

    it('should handle null and undefined payload values', async () => {
      const nullPayload = null as any;
      const undefinedPayload = undefined as any;

      // Jobs should handle null/undefined payloads appropriately
      await expect((sendWelcomeEmailJob as any).run(nullPayload, mockIO)).rejects.toThrow();
      await expect((sendWelcomeEmailJob as any).run(undefinedPayload, mockIO)).rejects.toThrow();
    });
  });

  describe('Contract Testing: Job Interface Compliance', () => {
    /**
     * Contract testing ensures that job implementations adhere to expected interfaces
     * and behavioral contracts, preventing breaking changes.
     */

    it('should validate sendWelcomeEmailJob contract compliance', () => {
      const validation = validateJobContract(sendWelcomeEmailJob);
      
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should validate notifyAdminsJob contract compliance', () => {
      const validation = validateJobContract(notifyAdminsJob);
      
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should validate processUserDeletionJob contract compliance', () => {
      const validation = validateJobContract(processUserDeletionJob);
      
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should detect contract violations in malformed jobs', () => {
      const malformedJob = {
        // Missing required properties
        name: 'Invalid Job',
        run: () => {}, // Not async
      };

      const validation = validateJobContract(malformedJob);
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('Job must have a string id property');
      expect(validation.violations).toContain('Job must have a string version property');
      expect(validation.violations).toContain('Job must have a trigger object');
      expect(validation.violations).toContain('Job run function must be async');
    });

    it('should validate job return value contracts', async () => {
      // Test that all jobs return expected contract-compliant results
      const jobs = [sendWelcomeEmailJob, notifyAdminsJob, processUserDeletionJob];
      
      for (const job of jobs) {
        const payload = { email: 'contract@example.com', userId: 'contract_123' };
        const result = await (job as any).run(payload, mockIO);
        
        // All jobs should return an object with success property
        expect(result).toEqual(expect.objectContaining({
          success: expect.any(Boolean),
        }));
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      }
    });
  });

  describe('Security Testing: Input Validation', () => {
    /**
     * Security testing to prevent vulnerabilities and ensure robust input validation
     */

    it('should handle malicious email inputs safely', async () => {
      await fc.assert(
        fc.asyncProperty(maliciousPayloadArbitrary, async (maliciousPayload) => {
          vi.clearAllMocks();
          
          try {
            const result = await (sendWelcomeEmailJob as any).run(maliciousPayload, mockIO);
            
            // If the job succeeds, verify no malicious content was processed
            if (result?.success) {
              expect(result.email).toBeDefined();
              // Verify the result doesn't contain obvious attack patterns
              expect(result.email).not.toMatch(/<script/i);
              expect(result.email).not.toMatch(/DROP TABLE/i);
              expect(result.email).not.toMatch(/\.\.\//);
            }
          } catch (error) {
            // Failures should not expose sensitive information
            expect((error as Error).message).not.toContain('database');
            expect((error as Error).message).not.toContain('password');
            expect((error as Error).message).not.toContain('secret');
          }
        }),
        { numRuns: 10 }
      );
    });

    it('should prevent information disclosure in error messages', async () => {
      const sensitivePayloads = [
        { email: 'admin@internal.company.com', userId: 'admin', name: 'Administrator' },
        { email: 'test@example.com', userId: '../../etc/passwd', name: 'Path Traversal' },
        { email: 'sql@example.com', userId: "'; DROP TABLE users; --", name: 'SQL Injection' },
      ];

      for (const payload of sensitivePayloads) {
        try {
          await (notifyAdminsJob as any).run(payload, mockIO);
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          // Verify error messages don't contain sensitive patterns
          expect(errorMessage).not.toMatch(/password/i);
          expect(errorMessage).not.toMatch(/secret/i);
          expect(errorMessage).not.toMatch(/database/i);
          expect(errorMessage).not.toMatch(/admin/i);
          
          // Error messages should be concise
          expect(errorMessage.length).toBeLessThan(200);
        }
      }
    });

    it('should handle Unicode characters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(unicodePayloadArbitrary, async (payload) => {
          vi.clearAllMocks();
          
          try {
            const result = await (sendWelcomeEmailJob as any).run(payload, mockIO);
            
            // Verify Unicode handling doesn't cause security issues
            if (result?.success) {
              expect(result.email).toBeDefined();
              expect(typeof result.email).toBe('string');
            }
          } catch (error) {
            // Unicode handling errors should not expose system internals
            expect((error as Error).message).not.toContain('encoding');
            expect((error as Error).message).not.toContain('buffer');
          }
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Performance Testing', () => {
    /**
     * Performance validation to ensure consistent execution times
     */

    it('should maintain consistent execution times under load', async () => {
      const iterations = 20; // Reasonable number for CI/CD
      const executionTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const payload = {
          email: `load-test-${i}@example.com`,
          name: `Load Test User ${i}`,
          userId: `load_test_${i}`,
        };

        const { duration } = await measureExecutionTime(() =>
          (sendWelcomeEmailJob as any).run(payload, createMockIO())
        );

        executionTimes.push(duration);
      }

      const averageTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...executionTimes);

      expect(averageTime).toBeLessThan(50); // Average execution under 50ms
      expect(maxTime).toBeLessThan(200); // No execution over 200ms
    });

    it('should handle concurrent job execution efficiently', async () => {
      const batchSize = 20; // Reasonable concurrency for testing
      const payloads = Array.from({ length: batchSize }, (_, i) => ({
        userId: `batch_user_${i}`,
        reason: `Batch deletion ${i}`,
      }));

      const { duration } = await measureExecutionTime(() =>
        Promise.all(
          payloads.map((payload) =>
            (processUserDeletionJob as any).run(payload, createMockIO())
          )
        )
      );

      const averageTimePerJob = duration / batchSize;
      expect(averageTimePerJob).toBeLessThan(100); // Each job should average under 100ms
    });
  });

  describe('Integration Testing', () => {
    /**
     * Integration tests that verify job interactions and overall functionality
     */

    it('should validate job type safety', () => {
      // Verify job exports have correct TypeScript types
      expect(typeof (sendWelcomeEmailJob as any).run).toBe('function');
      expect(typeof (notifyAdminsJob as any).run).toBe('function');
      expect(typeof (processUserDeletionJob as any).run).toBe('function');

      expect(sendWelcomeEmailJob.id).toEqual(expect.any(String));
      expect(sendWelcomeEmailJob.name).toEqual(expect.any(String));
      expect(sendWelcomeEmailJob.version).toEqual(expect.any(String));
    });

    it('should handle large payloads efficiently', async () => {
      const largePayload = {
        email: 'memory-test@example.com',
        name: 'Memory Test User',
        userId: 'memory_test_123',
        metadata: {
          largeData: 'x'.repeat(10000), // 10KB of data
          additionalInfo: Array.from({ length: 100 }, (_, i) => ({
            key: `key_${i}`,
            value: `value_${i}`,
          })),
        },
      };

      const result = await (sendWelcomeEmailJob as any).run(largePayload as any, mockIO);
      expect(result).toEqual({
        success: true,
        email: 'memory-test@example.com',
      });
    });

    it('should preserve rule evaluation order consistency', async () => {
      const payload = { email: 'order-test@example.com', userId: 'order_123' };
      
      // Track the order of rule evaluations
      const evaluationOrder: any[] = [];
      mockEvaluateRule.mockImplementation((rule) => {
        evaluationOrder.push(rule);
        return Promise.resolve({ executed: true });
      });

      await (notifyAdminsJob as any).run(payload, mockIO);

      // Verify rules are evaluated in the same order as they appear in the array
      const userCreatedRules = mockRules.filter(rule => rule.event === 'user.created');
      expect(evaluationOrder).toHaveLength(userCreatedRules.length);
      expect(evaluationOrder).toEqual(userCreatedRules);
    });

    it('should handle backwards compatibility with payload formats', async () => {
      // Test legacy payload format support
      const legacyPayload = {
        userEmail: 'legacy@example.com', // Different field name
        displayName: 'Legacy User',
        id: 'legacy_123',
      };

      // Job should handle this gracefully even if field names differ
      await expect((sendWelcomeEmailJob as any).run(legacyPayload as any, mockIO)).resolves.toBeDefined();
    });
  });
});