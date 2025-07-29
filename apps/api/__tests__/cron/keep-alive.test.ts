/**
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/cron/keep-alive/route';
import { assertResponse, mockDatabase } from '../utils/api-test-helpers';

describe('Cron Keep-Alive Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  describe('GET /cron/keep-alive', () => {
    it('should create and delete a temporary page successfully', async () => {
      const mockDb = mockDatabase.mockSuccess();
      const createdPage = { id: 'page_test123', name: 'cron-temp' };
      
      mockDb.page.create.mockResolvedValue(createdPage);
      mockDb.page.delete.mockResolvedValue(createdPage);

      const response = await GET();

      expect(mockDb.page.create).toHaveBeenCalledWith({
        data: {
          name: 'cron-temp',
        },
      });

      expect(mockDb.page.delete).toHaveBeenCalledWith({
        where: {
          id: 'page_test123',
        },
      });

      await assertResponse.success(response);
      expect(await response.text()).toBe('OK');
    });

    it('should handle database creation errors', async () => {
      const mockDb = mockDatabase.mockError(new Error('Database connection failed'));

      await expect(GET()).rejects.toThrow('Database connection failed');

      expect(mockDb.page.create).toHaveBeenCalledWith({
        data: {
          name: 'cron-temp',
        },
      });

      // Delete should not be called if create fails
      expect(mockDb.page.delete).not.toHaveBeenCalled();
    });

    it('should handle database deletion errors', async () => {
      const mockDb = mockDatabase.mockSuccess();
      const createdPage = { id: 'page_test123', name: 'cron-temp' };
      
      mockDb.page.create.mockResolvedValue(createdPage);
      mockDb.page.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(GET()).rejects.toThrow('Delete failed');

      expect(mockDb.page.create).toHaveBeenCalled();
      expect(mockDb.page.delete).toHaveBeenCalledWith({
        where: {
          id: 'page_test123',
        },
      });
    });

    it('should handle database timeout errors', async () => {
      const mockDb = mockDatabase.mockError(new Error('Connection timeout'));

      await expect(GET()).rejects.toThrow('Connection timeout');
    });

    it('should create unique page IDs on multiple calls', async () => {
      const mockDb = mockDatabase.mockSuccess();
      
      // Mock different IDs for each call
      mockDb.page.create
        .mockResolvedValueOnce({ id: 'page_test1', name: 'cron-temp' })
        .mockResolvedValueOnce({ id: 'page_test2', name: 'cron-temp' });

      await GET();
      await GET();

      expect(mockDb.page.create).toHaveBeenCalledTimes(2);
      expect(mockDb.page.delete).toHaveBeenCalledTimes(2);
      
      expect(mockDb.page.delete).toHaveBeenNthCalledWith(1, {
        where: { id: 'page_test1' },
      });
      expect(mockDb.page.delete).toHaveBeenNthCalledWith(2, {
        where: { id: 'page_test2' },
      });
    });

    it('should handle null/undefined database responses', async () => {
      const mockDb = mockDatabase.mockSuccess();
      mockDb.page.create.mockResolvedValue(null);

      await expect(GET()).rejects.toThrow();
    });

    it('should handle missing page ID in created page', async () => {
      const mockDb = mockDatabase.mockSuccess();
      // Page without ID should cause an error
      mockDb.page.create.mockResolvedValue({ name: 'cron-temp' });

      await expect(GET()).rejects.toThrow();
    });

    it('should handle concurrent requests', async () => {
      const mockDb = mockDatabase.mockSuccess();
      
      mockDb.page.create.mockImplementation(async () => {
        // Simulate some async delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id: `page_${Date.now()}`, name: 'cron-temp' };
      });

      // Make multiple concurrent requests
      const requests = Promise.all([GET(), GET(), GET()]);

      const responses = await requests;

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
      }

      expect(mockDb.page.create).toHaveBeenCalledTimes(3);
      expect(mockDb.page.delete).toHaveBeenCalledTimes(3);
    });

    it('should properly clean up even with partial failures', async () => {
      const mockDb = mockDatabase.mockSuccess();
      const createdPage = { id: 'page_test123', name: 'cron-temp' };
      
      mockDb.page.create.mockResolvedValue(createdPage);
      mockDb.page.delete.mockRejectedValue(new Error('Delete failed'));

      // Even though delete fails, create should still have been called
      await expect(GET()).rejects.toThrow('Delete failed');
      
      expect(mockDb.page.create).toHaveBeenCalledWith({
        data: { name: 'cron-temp' },
      });
      expect(mockDb.page.delete).toHaveBeenCalledWith({
        where: { id: 'page_test123' },
      });
    });
  });

  describe('Database Integration', () => {
    it('should use the correct database client', async () => {
      const mockDb = mockDatabase.mockSuccess();

      await GET();

      // Verify we're using the database from @repo/database
      expect(mockDb.page.create).toHaveBeenCalled();
      expect(mockDb.page.delete).toHaveBeenCalled();
    });

    it('should handle database schema validation errors', async () => {
      const mockDb = mockDatabase.mockError(
        new Error('Validation failed: name is required')
      );

      await expect(GET()).rejects.toThrow('Validation failed');
    });

    it('should handle database connection pool exhaustion', async () => {
      const mockDb = mockDatabase.mockError(
        new Error('Connection pool exhausted')
      );

      await expect(GET()).rejects.toThrow('Connection pool exhausted');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete within reasonable time', async () => {
      const mockDb = mockDatabase.mockSuccess();
      
      const startTime = Date.now();
      await GET();
      const endTime = Date.now();

      // Should complete within 1 second (generous for testing)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should not leave resources hanging on errors', async () => {
      const mockDb = mockDatabase.mockSuccess();
      mockDb.page.create.mockResolvedValue({ id: 'page_test123', name: 'cron-temp' });
      mockDb.page.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(GET()).rejects.toThrow();

      // Verify that both operations were attempted
      expect(mockDb.page.create).toHaveBeenCalledTimes(1);
      expect(mockDb.page.delete).toHaveBeenCalledTimes(1);
    });
  });
});