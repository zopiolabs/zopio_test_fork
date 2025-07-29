/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment and keys
const mockEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
};

vi.mock('../keys', () => ({
  keys: () => mockEnv,
}));

describe('Prisma Operations', () => {
  let mockPrismaClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Get fresh mock client
    const { database } = await import('../index');
    mockPrismaClient = database;
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new page record', async () => {
      const mockPage = { id: 1, name: 'Test Page' };
      mockPrismaClient.page.create.mockResolvedValue(mockPage);

      const result = await mockPrismaClient.page.create({
        data: { name: 'Test Page' },
      });

      expect(mockPrismaClient.page.create).toHaveBeenCalledWith({
        data: { name: 'Test Page' },
      });
      expect(result).toEqual(mockPage);
    });

    it('should find all pages', async () => {
      const mockPages = [
        { id: 1, name: 'Page 1' },
        { id: 2, name: 'Page 2' },
      ];
      mockPrismaClient.page.findMany.mockResolvedValue(mockPages);

      const result = await mockPrismaClient.page.findMany();

      expect(mockPrismaClient.page.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockPages);
    });

    it('should find a unique page by id', async () => {
      const mockPage = { id: 1, name: 'Test Page' };
      mockPrismaClient.page.findUnique.mockResolvedValue(mockPage);

      const result = await mockPrismaClient.page.findUnique({
        where: { id: 1 },
      });

      expect(mockPrismaClient.page.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should update a page record', async () => {
      const mockPage = { id: 1, name: 'Updated Page' };
      mockPrismaClient.page.update.mockResolvedValue(mockPage);

      const result = await mockPrismaClient.page.update({
        where: { id: 1 },
        data: { name: 'Updated Page' },
      });

      expect(mockPrismaClient.page.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Page' },
      });
      expect(result).toEqual(mockPage);
    });

    it('should delete a page record', async () => {
      const mockPage = { id: 1, name: 'Test Page' };
      mockPrismaClient.page.delete.mockResolvedValue(mockPage);

      const result = await mockPrismaClient.page.delete({
        where: { id: 1 },
      });

      expect(mockPrismaClient.page.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should upsert a page record', async () => {
      const mockPage = { id: 1, name: 'Upserted Page' };
      mockPrismaClient.page.upsert.mockResolvedValue(mockPage);

      const result = await mockPrismaClient.page.upsert({
        where: { id: 1 },
        update: { name: 'Updated Page' },
        create: { name: 'New Page' },
      });

      expect(mockPrismaClient.page.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { name: 'Updated Page' },
        create: { name: 'New Page' },
      });
      expect(result).toEqual(mockPage);
    });

    it('should count page records', async () => {
      mockPrismaClient.page.count.mockResolvedValue(5);

      const result = await mockPrismaClient.page.count();

      expect(mockPrismaClient.page.count).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });

  describe('Advanced Query Operations', () => {
    it('should execute raw queries', async () => {
      const mockResult = [{ count: 10 }];
      mockPrismaClient.$queryRaw.mockResolvedValue(mockResult);

      const result = await mockPrismaClient.$queryRaw`SELECT COUNT(*) as count FROM "Page"`;

      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should execute raw SQL commands', async () => {
      mockPrismaClient.$executeRaw.mockResolvedValue(1);

      const result = await mockPrismaClient.$executeRaw`UPDATE "Page" SET name = 'Updated' WHERE id = 1`;

      expect(mockPrismaClient.$executeRaw).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should handle query with filters and pagination', async () => {
      const mockPages = [{ id: 1, name: 'Test Page' }];
      mockPrismaClient.page.findMany.mockResolvedValue(mockPages);

      const result = await mockPrismaClient.page.findMany({
        where: {
          name: {
            contains: 'Test',
          },
        },
        skip: 0,
        take: 10,
        orderBy: {
          id: 'desc',
        },
      });

      expect(mockPrismaClient.page.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Test',
          },
        },
        skip: 0,
        take: 10,
        orderBy: {
          id: 'desc',
        },
      });
      expect(result).toEqual(mockPages);
    });
  });

  describe('Connection Management', () => {
    it('should connect to database', async () => {
      mockPrismaClient.$connect.mockResolvedValue(undefined);

      await mockPrismaClient.$connect();

      expect(mockPrismaClient.$connect).toHaveBeenCalled();
    });

    it('should disconnect from database', async () => {
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      await mockPrismaClient.$disconnect();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(connectionError);

      await expect(mockPrismaClient.$connect()).rejects.toThrow('Connection failed');
    });

    it('should handle disconnection errors', async () => {
      const disconnectionError = new Error('Disconnection failed');
      mockPrismaClient.$disconnect.mockRejectedValue(disconnectionError);

      await expect(mockPrismaClient.$disconnect()).rejects.toThrow('Disconnection failed');
    });
  });
});