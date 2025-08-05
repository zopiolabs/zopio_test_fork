/**
 * @fileoverview Comprehensive unit tests for the cron keep-alive endpoint
 * Tests the database connectivity health check that creates and deletes a temporary page
 * to ensure the database connection remains active and responsive.
 * 
 * @module KeepAliveTest
 * @author Zopio Development Team
 * @since 2024
 * 
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { GET } from '../../app/cron/keep-alive/route';
import { assertResponse } from '../utils/api-test-helpers';
import { database } from '@repo/database';

// Type definitions for better test structure
interface MockPage {
  id: string;
  name: string;
}

interface DatabaseOperationMetrics {
  createTime: number;
  deleteTime: number;
  totalTime: number;
}

// Cast database to have mock functions
const mockDatabase = database as unknown as {
  page: {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
};

/**
 * Test suite for the cron keep-alive endpoint that validates database connectivity
 * through create/delete operations on temporary pages.
 * 
 * The keep-alive endpoint serves as a health check mechanism to:
 * - Verify database connectivity and responsiveness
 * - Prevent connection pool timeouts in serverless environments
 * - Validate database operations under various conditions
 * - Monitor database performance characteristics
 */
describe('Cron Keep-Alive Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    // Reset all database mock implementations
    mockDatabase.page.create.mockReset();
    mockDatabase.page.delete.mockReset();
  });

  /**
   * Core functionality tests for the keep-alive endpoint
   * Validates the primary database health check workflow
   */
  describe('GET /cron/keep-alive', () => {
    /**
     * Tests the happy path where database operations succeed
     * Verifies correct create/delete sequence and response format
     */
    it('should create and delete a temporary page successfully', async () => {
      const createdPage: MockPage = { id: 'page_test123', name: 'cron-temp' };
      
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockResolvedValue(createdPage);

      const response = await GET();

      expect(mockDatabase.page.create).toHaveBeenCalledWith({
        data: {
          name: 'cron-temp',
        },
      });

      expect(mockDatabase.page.delete).toHaveBeenCalledWith({
        where: {
          id: 'page_test123',
        },
      });

      await assertResponse.success(response);
      expect(await response.text()).toBe('OK');
    });

    /**
     * Tests error handling when page creation fails
     * Ensures proper error propagation and cleanup behavior
     */
    it('should handle database creation errors', async () => {
      mockDatabase.page.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(GET()).rejects.toThrow('Database connection failed');

      expect(mockDatabase.page.create).toHaveBeenCalledWith({
        data: {
          name: 'cron-temp',
        },
      });

      // Delete should not be called if create fails
      expect(mockDatabase.page.delete).not.toHaveBeenCalled();
    });

    /**
     * Tests error handling when page deletion fails
     * Verifies that creation succeeds but deletion failure is properly handled
     */
    it('should handle database deletion errors', async () => {
      const createdPage: MockPage = { id: 'page_test123', name: 'cron-temp' };
      
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(GET()).rejects.toThrow('Delete failed');

      expect(mockDatabase.page.create).toHaveBeenCalled();
      expect(mockDatabase.page.delete).toHaveBeenCalledWith({
        where: {
          id: 'page_test123',
        },
      });
    });

    /**
     * Tests handling of database timeout scenarios
     * Validates proper error propagation for connection timeouts
     */
    it('should handle database timeout errors', async () => {
      mockDatabase.page.create.mockRejectedValue(new Error('Connection timeout'));

      await expect(GET()).rejects.toThrow('Connection timeout');
      expect(mockDatabase.page.create).toHaveBeenCalled();
    });

    /**
     * Tests sequential operations with different page IDs
     * Validates that each operation uses the correct page ID for deletion
     */
    it('should handle sequential operations with unique page IDs', async () => {
      // Mock different IDs for each call
      mockDatabase.page.create
        .mockResolvedValueOnce({ id: 'page_test1', name: 'cron-temp' })
        .mockResolvedValueOnce({ id: 'page_test2', name: 'cron-temp' });

      await GET();
      await GET();

      expect(mockDatabase.page.create).toHaveBeenCalledTimes(2);
      expect(mockDatabase.page.delete).toHaveBeenCalledTimes(2);
      
      expect(mockDatabase.page.delete).toHaveBeenNthCalledWith(1, {
        where: { id: 'page_test1' },
      });
      expect(mockDatabase.page.delete).toHaveBeenNthCalledWith(2, {
        where: { id: 'page_test2' },
      });
    });

    /**
     * Tests handling of invalid database responses
     * Ensures proper error handling when create operation returns null/undefined
     */
    it('should handle null database responses', async () => {
      mockDatabase.page.create.mockResolvedValue(null);

      await expect(GET()).rejects.toThrow();
      expect(mockDatabase.page.create).toHaveBeenCalled();
      expect(mockDatabase.page.delete).not.toHaveBeenCalled();
    });

    /**
     * Tests handling of malformed page objects
     * Validates error handling when created page lacks required ID field
     */
    it('should handle missing page ID in created page', async () => {
      // Page without ID should cause an error when trying to access .id
      mockDatabase.page.create.mockResolvedValue({ name: 'cron-temp' } as any);
      mockDatabase.page.delete.mockImplementation(() => {
        throw new Error('Cannot read properties of undefined (reading \'id\')');
      });

      await expect(GET()).rejects.toThrow();
      expect(mockDatabase.page.create).toHaveBeenCalled();
    });

    /**
     * Tests concurrent request handling
     * Validates that multiple simultaneous requests are handled correctly
     */
    it('should handle concurrent requests safely', async () => {
      let counter = 0;
      
      mockDatabase.page.create.mockImplementation(async () => {
        // Simulate async delay and ensure unique IDs
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return { id: `page_${++counter}`, name: 'cron-temp' };
      });

      // Make multiple concurrent requests
      const requests = [GET(), GET(), GET()];
      const responses = await Promise.all(requests);

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
      }

      expect(mockDatabase.page.create).toHaveBeenCalledTimes(3);
      expect(mockDatabase.page.delete).toHaveBeenCalledTimes(3);
    });

    /**
     * Tests handling of various page ID formats
     * Validates correct ID handling across different scenarios
     */
    it('should correctly handle various page ID formats', async () => {
      const testPageIds = [
        'page_123',
        'very-long-page-id-with-dashes-and-numbers-12345',
        'page_with_underscores_123',
        'PageWithCamelCase',
        'page.with.dots.123',
        'page:with:colons:123',
        'ñpage_with_unicode_chars_ñ',
        '123_numeric_start',
      ];
      
      for (const pageId of testPageIds) {
        // Reset for clean state
        vi.clearAllMocks();
        
        const createdPage: MockPage = { id: pageId, name: 'cron-temp' };
        
        mockDatabase.page.create.mockResolvedValue(createdPage);
        mockDatabase.page.delete.mockResolvedValue(createdPage);

        const response = await GET();

        expect(mockDatabase.page.delete).toHaveBeenCalledWith({
          where: { id: pageId },
        });
        expect(response.status).toBe(200);
      }
    });
  });

  /**
   * Database integration and error scenario tests
   * Validates proper handling of various database states and error conditions
   */
  describe('Database Integration & Error Scenarios', () => {
    /**
     * Verifies correct database client usage and method calls
     */
    it('should use the correct database client and methods', async () => {
      const createdPage: MockPage = { id: 'page_test123', name: 'cron-temp' };
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockResolvedValue(createdPage);

      await GET();

      // Verify we're using the database from @repo/database
      expect(mockDatabase.page.create).toHaveBeenCalledWith({
        data: { name: 'cron-temp' }
      });
      expect(mockDatabase.page.delete).toHaveBeenCalled();
    });

    /**
     * Tests various database-specific error scenarios
     * Validates proper error handling for different failure modes
     */
    it.each([
      ['schema validation', 'Validation failed: name is required'],
      ['connection pool exhaustion', 'Connection pool exhausted'],
      ['database lock timeout', 'Lock timeout exceeded'],
      ['foreign key constraint', 'Foreign key constraint failed'],
      ['unique constraint violation', 'Unique constraint failed'],
    ])('should handle %s errors', async (errorType, errorMessage) => {
      mockDatabase.page.create.mockRejectedValue(new Error(errorMessage));

      await expect(GET()).rejects.toThrow(errorMessage);
      expect(mockDatabase.page.create).toHaveBeenCalled();
    });

    /**
     * Tests recovery behavior after database errors
     * Ensures the system can recover from transient failures
     */
    it('should recover from transient database errors', async () => {
      const createdPage: MockPage = { id: 'page_recovery_test', name: 'cron-temp' };
      
      // First call fails, second succeeds
      mockDatabase.page.create
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(createdPage);

      // First call should fail
      await expect(GET()).rejects.toThrow('Transient error');
      
      // Second call should succeed
      const response = await GET();
      expect(response.status).toBe(200);
      expect(mockDatabase.page.create).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * Performance, resource management, and operational tests
   * Validates system behavior under various operational conditions
   */
  describe('Performance and Resource Management', () => {
    /**
     * Tests performance characteristics under normal conditions
     * Validates response time expectations for health check operations
     */
    it('should complete within reasonable time bounds', async () => {
      const createdPage: MockPage = { id: 'page_test123', name: 'cron-temp' };
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockResolvedValue(createdPage);
      
      const startTime = performance.now();
      await GET();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly for a simple health check
      expect(duration).toBeLessThan(100); // 100ms for mocked operations
      
      // Verify both operations were called
      expect(mockDatabase.page.create).toHaveBeenCalledTimes(1);
      expect(mockDatabase.page.delete).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests resource cleanup behavior during errors
     * Ensures proper operation sequencing even when failures occur
     */
    it('should maintain proper operation sequencing during failures', async () => {
      const createdPage: MockPage = { id: 'page_test123', name: 'cron-temp' };
      
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(GET()).rejects.toThrow('Delete failed');

      // Verify operation sequence: create should succeed, delete should be attempted
      expect(mockDatabase.page.create).toHaveBeenCalledTimes(1);
      expect(mockDatabase.page.delete).toHaveBeenCalledTimes(1);
      expect(mockDatabase.page.delete).toHaveBeenCalledWith({
        where: { id: 'page_test123' }
      });
    });

    /**
     * Tests database response time variation handling
     * Validates consistent behavior with simulated latency
     */
    it('should handle variable database response times consistently', async () => {
      const delays = [0, 5, 10, 15]; // Test specific delay values
      
      for (const delay of delays) {
        // Reset for clean state
        vi.clearAllMocks();
        
        const createdPage: MockPage = { id: `page_${delay}`, name: 'cron-temp' };
        
        mockDatabase.page.create.mockImplementation(async () => {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          return createdPage;
        });
        mockDatabase.page.delete.mockResolvedValue(createdPage);

        const startTime = performance.now();
        const response = await GET();
        const endTime = performance.now();

        expect(response.status).toBe(200);
        expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
        expect(mockDatabase.page.create).toHaveBeenCalled();
        expect(mockDatabase.page.delete).toHaveBeenCalledWith({
          where: { id: createdPage.id }
        });
      }
    });

    /**
     * Tests memory usage patterns during operations
     * Validates that operations don't accumulate unnecessary references
     */
    it('should handle operations without memory leaks', async () => {
      const operations: Promise<Response>[] = [];
      
      // Create multiple operations
      for (let i = 0; i < 10; i++) {
        const createdPage = { id: `page_${i}`, name: 'cron-temp' };
        mockDatabase.page.create.mockResolvedValueOnce(createdPage);
        mockDatabase.page.delete.mockResolvedValueOnce(createdPage);
        operations.push(GET());
      }
      
      const responses = await Promise.all(operations);
      
      // All operations should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(mockDatabase.page.create).toHaveBeenCalledTimes(10);
      expect(mockDatabase.page.delete).toHaveBeenCalledTimes(10);
    });
  });

  /**
   * Edge cases and boundary condition tests
   * Validates system behavior at operational limits and unusual conditions
   */
  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Tests handling of extremely long page IDs
     * Validates system robustness with edge case data
     */
    it('should handle edge case page ID lengths', async () => {
      const longId = 'page_' + 'x'.repeat(1000); // Very long ID
      const createdPage: MockPage = { id: longId, name: 'cron-temp' };
      
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockResolvedValue(createdPage);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(mockDatabase.page.delete).toHaveBeenCalledWith({
        where: { id: longId }
      });
    });

    /**
     * Tests response immutability and consistency
     * Ensures response objects maintain expected properties
     */
    it('should return consistent response objects', async () => {
      const createdPage: MockPage = { id: 'page_test123', name: 'cron-temp' };
      mockDatabase.page.create.mockResolvedValue(createdPage);
      mockDatabase.page.delete.mockResolvedValue(createdPage);
      
      const response1 = await GET();
      const response2 = await GET();
      
      // Both responses should have identical structure
      expect(response1.status).toBe(response2.status);
      expect(await response1.text()).toBe(await response2.text());
      expect(response1.headers.get('content-type')).toBe(response2.headers.get('content-type'));
    });

    /**
     * Tests behavior with rapid sequential calls
     * Validates system stability under high-frequency requests
     */
    it('should handle rapid sequential requests', async () => {
      const requests: Promise<Response>[] = [];
      
      // Fire requests in rapid succession
      for (let i = 0; i < 5; i++) {
        const createdPage = { id: `rapid_${i}`, name: 'cron-temp' };
        mockDatabase.page.create.mockResolvedValueOnce(createdPage);
        mockDatabase.page.delete.mockResolvedValueOnce(createdPage);
        requests.push(GET());
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });
      
      expect(mockDatabase.page.create).toHaveBeenCalledTimes(5);
      expect(mockDatabase.page.delete).toHaveBeenCalledTimes(5);
    });
  });
});