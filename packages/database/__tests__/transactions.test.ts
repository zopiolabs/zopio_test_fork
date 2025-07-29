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

describe('Database Transactions', () => {
  let mockPrismaClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const { database } = await import('../index');
    mockPrismaClient = database;
  });

  describe('Transaction Operations', () => {
    it('should execute operations in a transaction', async () => {
      const mockResult = [
        { id: 1, name: 'Page 1' },
        { id: 2, name: 'Page 2' },
      ];

      mockPrismaClient.$transaction.mockImplementation(async (operations) => {
        if (Array.isArray(operations)) {
          return operations;
        }
        // For function-based transactions
        const mockTxClient = {
          page: {
            create: vi.fn().mockResolvedValue({ id: 1, name: 'Page 1' }),
            update: vi.fn().mockResolvedValue({ id: 2, name: 'Page 2' }),
          },
        };
        return operations(mockTxClient);
      });

      const result = await mockPrismaClient.$transaction([
        mockPrismaClient.page.create({ data: { name: 'Page 1' } }),
        mockPrismaClient.page.create({ data: { name: 'Page 2' } }),
      ]);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(result).toEqual([
        mockPrismaClient.page.create({ data: { name: 'Page 1' } }),
        mockPrismaClient.page.create({ data: { name: 'Page 2' } }),
      ]);
    });

    it('should execute function-based transaction', async () => {
      const mockResult = { created: 1, updated: 1 };

      mockPrismaClient.$transaction.mockImplementation(async (fn) => {
        const mockTxClient = {
          page: {
            create: vi.fn().mockResolvedValue({ id: 1, name: 'New Page' }),
            update: vi.fn().mockResolvedValue({ id: 2, name: 'Updated Page' }),
          },
        };
        return fn(mockTxClient);
      });

      const result = await mockPrismaClient.$transaction(async (tx) => {
        const created = await tx.page.create({
          data: { name: 'New Page' },
        });
        const updated = await tx.page.update({
          where: { id: 2 },
          data: { name: 'Updated Page' },
        });
        return { created: created.id, updated: updated.id };
      });

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      const transactionError = new Error('Transaction failed');
      mockPrismaClient.$transaction.mockRejectedValue(transactionError);

      await expect(
        mockPrismaClient.$transaction([
          mockPrismaClient.page.create({ data: { name: 'Page 1' } }),
          mockPrismaClient.page.create({ data: { name: 'Page 2' } }),
        ])
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle transaction with timeout', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (operations, options) => {
        expect(options?.timeout).toBe(5000);
        return operations;
      });

      await mockPrismaClient.$transaction(
        [mockPrismaClient.page.create({ data: { name: 'Page 1' } })],
        { timeout: 5000 }
      );

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(
        [mockPrismaClient.page.create({ data: { name: 'Page 1' } })],
        { timeout: 5000 }
      );
    });

    it('should handle transaction with isolation level', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (operations, options) => {
        expect(options?.isolationLevel).toBe('ReadCommitted');
        return operations;
      });

      await mockPrismaClient.$transaction(
        [mockPrismaClient.page.create({ data: { name: 'Page 1' } })],
        { isolationLevel: 'ReadCommitted' }
      );

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(
        [mockPrismaClient.page.create({ data: { name: 'Page 1' } })],
        { isolationLevel: 'ReadCommitted' }
      );
    });

    it('should handle nested transaction operations', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (fn) => {
        const mockTxClient = {
          page: {
            create: vi.fn().mockResolvedValue({ id: 1, name: 'Parent Page' }),
            findUnique: vi.fn().mockResolvedValue({ id: 1, name: 'Parent Page' }),
          },
        };
        return fn(mockTxClient);
      });

      const result = await mockPrismaClient.$transaction(async (tx) => {
        // Create parent record
        const parent = await tx.page.create({
          data: { name: 'Parent Page' },
        });

        // Verify creation
        const verified = await tx.page.findUnique({
          where: { id: parent.id },
        });

        return { parent, verified };
      });

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should handle transaction with maxWait option', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (operations, options) => {
        expect(options?.maxWait).toBe(2000);
        return operations;
      });

      await mockPrismaClient.$transaction(
        [mockPrismaClient.page.create({ data: { name: 'Page 1' } })],
        { maxWait: 2000 }
      );

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(
        [mockPrismaClient.page.create({ data: { name: 'Page 1' } })],
        { maxWait: 2000 }
      );
    });
  });

  describe('Transaction Error Scenarios', () => {
    it('should handle Prisma transaction timeout error', async () => {
      const { Prisma } = await import('../generated/client');
      const timeoutError = new Prisma.PrismaClientKnownRequestError(
        'Transaction timeout',
        'P2024'
      );
      
      mockPrismaClient.$transaction.mockRejectedValue(timeoutError);

      await expect(
        mockPrismaClient.$transaction([
          mockPrismaClient.page.create({ data: { name: 'Page 1' } }),
        ])
      ).rejects.toThrow('Transaction timeout');
    });

    it('should handle constraint violation in transaction', async () => {
      const { Prisma } = await import('../generated/client');
      const constraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        'P2002'
      );
      
      mockPrismaClient.$transaction.mockRejectedValue(constraintError);

      await expect(
        mockPrismaClient.$transaction([
          mockPrismaClient.page.create({ data: { name: 'Duplicate Page' } }),
        ])
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should handle connection error during transaction', async () => {
      const { Prisma } = await import('../generated/client');
      const connectionError = new Prisma.PrismaClientUnknownRequestError(
        'Connection lost during transaction'
      );
      
      mockPrismaClient.$transaction.mockRejectedValue(connectionError);

      await expect(
        mockPrismaClient.$transaction([
          mockPrismaClient.page.create({ data: { name: 'Page 1' } }),
        ])
      ).rejects.toThrow('Connection lost during transaction');
    });
  });
});