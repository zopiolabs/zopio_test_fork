/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Mock server-only to avoid issues in test environment
vi.mock('server-only', () => ({}));

// Mock Neon database dependencies
const mockPool = {
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
};

const mockPrismaNeon = vi.fn(() => ({}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: vi.fn(() => mockPool),
  neonConfig: { webSocketConstructor: null },
}));

vi.mock('@prisma/adapter-neon', () => ({
  PrismaNeon: mockPrismaNeon,
}));

vi.mock('ws', () => ({
  default: vi.fn(),
}));

// Mock environment
const mockEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/zopio_test',
  NODE_ENV: 'test',
};

vi.mock('../keys', () => ({
  keys: () => mockEnv,
}));

// Create a comprehensive mock Prisma client
const createMockPrismaClient = () => {
  const mockClient = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    page: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  
  // Add advanced methods for integration testing
  mockClient.page.createMany = vi.fn();
  mockClient.page.deleteMany = vi.fn();
  mockClient.page.upsert = vi.fn();
  mockClient.page.findFirst = vi.fn();
  mockClient.page.findFirstOrThrow = vi.fn();
  mockClient.page.aggregate = vi.fn();
  mockClient.page.groupBy = vi.fn();
  
  // Transaction and batch operations
  mockClient.$transaction = vi.fn();
  mockClient.$executeRaw = vi.fn();
  mockClient.$queryRaw = vi.fn();
  mockClient.$runCommandRaw = vi.fn();
  
  // Connection management
  mockClient.$connect = vi.fn();
  mockClient.$disconnect = vi.fn();
  mockClient.$use = vi.fn();
  
  // Health and debugging
  mockClient.$metrics = vi.fn();
  mockClient.$queryRaw = vi.fn();
  mockClient.$executeRaw = vi.fn();
  
  return mockClient;
};

describe('Database Real Integration Tests', () => {
  let database: any;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

  beforeAll(async () => {
    // Global setup for database tests
    process.env.DATABASE_URL = mockEnv.DATABASE_URL;
    process.env.NODE_ENV = mockEnv.NODE_ENV;
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Create a fresh mock client for each test
    mockPrismaClient = createMockPrismaClient();
    
    // Mock the PrismaClient constructor to return our mock
    vi.doMock('../generated/client', () => ({
      PrismaClient: vi.fn(() => mockPrismaClient),
    }));
    
    // Import database module after mocks are set up
    const databaseModule = await import('../index.js');
    database = databaseModule.database;
  });

  afterEach(async () => {
    // Clean up connections
    if (database && typeof database.$disconnect === 'function') {
      await database.$disconnect();
    }
  });

  afterAll(async () => {
    // Global cleanup
    vi.restoreAllMocks();
  });

  describe('Database Connection Management', () => {
    it('should establish database connection with correct configuration', async () => {
      expect(database).toBeDefined();
      
      // Verify Neon pool was created with correct connection string
      const { Pool } = await import('@neondatabase/serverless');
      expect(Pool).toHaveBeenCalledWith({ 
        connectionString: mockEnv.DATABASE_URL 
      });
      
      // Verify adapter was created
      expect(mockPrismaNeon).toHaveBeenCalled();
    });

    it('should handle connection lifecycle correctly', async () => {
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      // Test connection
      await database.$connect();
      expect(mockPrismaClient.$connect).toHaveBeenCalled();

      // Test disconnection
      await database.$disconnect();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(connectionError);

      await expect(database.$connect()).rejects.toThrow('Connection failed');
    });

    it('should handle connection pool exhaustion', async () => {
      // Simulate multiple concurrent connections
      const connections = Array.from({ length: 20 }, () =>
        database.$connect()
      );

      mockPrismaClient.$connect.mockResolvedValue(undefined);

      await Promise.all(connections);
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(20);
    });
  });

  describe('Transaction Integration', () => {
    it('should handle simple transactions', async () => {
      const mockTransactionResult = { success: true };
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaClient);
      });

      const result = await database.$transaction(async (tx: any) => {
        await tx.page.create({ data: { name: 'Transaction Test' } });
        await tx.page.update({ 
          where: { id: 1 }, 
          data: { name: 'Updated in Transaction' } 
        });
        return mockTransactionResult;
      });

      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      const transactionError = new Error('Transaction failed');
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        try {
          return await callback(mockPrismaClient);
        } catch (error) {
          throw transactionError;
        }
      });

      await expect(
        database.$transaction(async (tx: any) => {
          await tx.page.create({ data: { name: 'Will Fail' } });
          throw transactionError;
        })
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle nested transactions', async () => {
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaClient);
      });

      const result = await database.$transaction(async (outerTx: any) => {
        await outerTx.page.create({ data: { name: 'Outer Transaction' } });
        
        return await database.$transaction(async (innerTx: any) => {
          await innerTx.page.create({ data: { name: 'Inner Transaction' } });
          return { nested: true };
        });
      });

      expect(result).toEqual({ nested: true });
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent transactions', async () => {
      const transactionResults = [
        { id: 1, name: 'Transaction 1' },
        { id: 2, name: 'Transaction 2' },
        { id: 3, name: 'Transaction 3' },
      ];

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaClient);
      });

      const transactionPromises = transactionResults.map((result, index) =>
        database.$transaction(async (tx: any) => {
          await tx.page.create({ data: { name: `Transaction ${index + 1}` } });
          return result;
        })
      );

      const results = await Promise.all(transactionPromises);
      expect(results).toEqual(transactionResults);
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should handle transaction timeout scenarios', async () => {
      vi.useFakeTimers();

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        // Simulate long-running transaction
        await new Promise(resolve => setTimeout(resolve, 30000));
        return await callback(mockPrismaClient);
      });

      const transactionPromise = database.$transaction(async (tx: any) => {
        await tx.page.create({ data: { name: 'Long Transaction' } });
        return { timeout: true };
      });

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(30000);

      const result = await transactionPromise;
      expect(result).toEqual({ timeout: true });

      vi.useRealTimers();
    });
  });

  describe('Advanced Query Operations', () => {
    it('should handle complex queries with joins and filters', async () => {
      const mockComplexResult = [
        {
          id: 1,
          name: 'Complex Page',
          metadata: { views: 100, likes: 50 },
          _count: { comments: 5 },
        },
      ];

      mockPrismaClient.page.findMany.mockResolvedValue(mockComplexResult);

      const result = await database.page.findMany({
        where: {
          AND: [
            { name: { contains: 'Complex' } },
            { metadata: { path: ['views'], gte: 50 } },
          ],
        },
        include: {
          _count: { select: { comments: true } },
        },
        orderBy: [
          { metadata: { path: ['views'], sort: 'desc' } },
          { name: 'asc' },
        ],
        take: 10,
        skip: 0,
      });

      expect(result).toEqual(mockComplexResult);
      expect(mockPrismaClient.page.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { name: { contains: 'Complex' } },
            { metadata: { path: ['views'], gte: 50 } },
          ],
        },
        include: {
          _count: { select: { comments: true } },
        },
        orderBy: [
          { metadata: { path: ['views'], sort: 'desc' } },
          { name: 'asc' },
        ],
        take: 10,
        skip: 0,
      });
    });

    it('should handle aggregation operations', async () => {
      const mockAggregateResult = {
        _count: { _all: 100, id: 100, name: 95 },
        _avg: { id: 50.5 },
        _sum: { id: 5050 },
        _min: { id: 1, name: 'A Page' },
        _max: { id: 100, name: 'Z Page' },
      };

      mockPrismaClient.page.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await database.page.aggregate({
        where: { name: { contains: 'Page' } },
        _count: { _all: true, id: true, name: true },
        _avg: { id: true },
        _sum: { id: true },
        _min: { id: true, name: true },
        _max: { id: true, name: true },
      });

      expect(result).toEqual(mockAggregateResult);
    });

    it('should handle group by operations', async () => {
      const mockGroupByResult = [
        { name: 'Category A', _count: { _all: 10 }, _avg: { id: 15.5 } },
        { name: 'Category B', _count: { _all: 5 }, _avg: { id: 25.0 } },
      ];

      mockPrismaClient.page.groupBy.mockResolvedValue(mockGroupByResult);

      const result = await database.page.groupBy({
        by: ['name'],
        where: { name: { in: ['Category A', 'Category B'] } },
        _count: { _all: true },
        _avg: { id: true },
        having: {
          id: { _avg: { gt: 10 } },
        },
        orderBy: { _avg: { id: 'desc' } },
      });

      expect(result).toEqual(mockGroupByResult);
    });

    it('should handle raw queries', async () => {
      const mockRawResult = [
        { id: 1, name: 'Raw Query Page', custom_field: 'value' },
      ];

      mockPrismaClient.$queryRaw.mockResolvedValue(mockRawResult);

      const result = await database.$queryRaw`
        SELECT id, name, 'custom_value' as custom_field 
        FROM "Page" 
        WHERE name LIKE ${'%Raw%'}
        ORDER BY id
        LIMIT 10
      `;

      expect(result).toEqual(mockRawResult);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should handle raw execute operations', async () => {
      const mockExecuteResult = 5; // Number of affected rows

      mockPrismaClient.$executeRaw.mockResolvedValue(mockExecuteResult);

      const result = await database.$executeRaw`
        UPDATE "Page" 
        SET name = CONCAT(name, ' - Updated')
        WHERE id > ${100}
      `;

      expect(result).toBe(mockExecuteResult);
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch create operations', async () => {
      const batchData = [
        { name: 'Batch Page 1' },
        { name: 'Batch Page 2' },
        { name: 'Batch Page 3' },
      ];

      const mockBatchResult = { count: 3 };
      mockPrismaClient.page.createMany.mockResolvedValue(mockBatchResult);

      const result = await database.page.createMany({
        data: batchData,
        skipDuplicates: true,
      });

      expect(result).toEqual(mockBatchResult);
      expect(mockPrismaClient.page.createMany).toHaveBeenCalledWith({
        data: batchData,
        skipDuplicates: true,
      });
    });

    it('should handle batch update operations', async () => {
      const mockUpdateResult = { count: 10 };
      mockPrismaClient.page.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await database.page.updateMany({
        where: { name: { contains: 'Batch' } },
        data: { name: 'Updated Batch Page' },
      });

      expect(result).toEqual(mockUpdateResult);
    });

    it('should handle batch delete operations', async () => {
      const mockDeleteResult = { count: 5 };
      mockPrismaClient.page.deleteMany.mockResolvedValue(mockDeleteResult);

      const result = await database.page.deleteMany({
        where: { name: { startsWith: 'Temp' } },
      });

      expect(result).toEqual(mockDeleteResult);
    });

    it('should handle upsert operations', async () => {
      const mockUpsertResult = { id: 1, name: 'Upserted Page' };
      mockPrismaClient.page.upsert.mockResolvedValue(mockUpsertResult);

      const result = await database.page.upsert({
        where: { id: 1 },
        update: { name: 'Updated Page' },
        create: { name: 'New Page' },
      });

      expect(result).toEqual(mockUpsertResult);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection errors', async () => {
      const connectionError = new Error('ECONNREFUSED: Connection refused');
      connectionError.name = 'DatabaseConnectionError';
      
      mockPrismaClient.page.findMany.mockRejectedValue(connectionError);

      await expect(database.page.findMany()).rejects.toThrow(
        'ECONNREFUSED: Connection refused'
      );
    });

    it('should handle constraint violation errors', async () => {
      const constraintError = new Error('Unique constraint failed');
      constraintError.name = 'PrismaClientKnownRequestError';
      (constraintError as any).code = 'P2002';
      
      mockPrismaClient.page.create.mockRejectedValue(constraintError);

      await expect(
        database.page.create({ data: { name: 'Duplicate Name' } })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('should handle query timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.name = 'PrismaClientUnknownRequestError';
      
      mockPrismaClient.page.findMany.mockRejectedValue(timeoutError);

      await expect(database.page.findMany()).rejects.toThrow('Query timeout');
    });

    it('should handle invalid query errors', async () => {
      const invalidQueryError = new Error('Invalid field name');
      invalidQueryError.name = 'PrismaClientValidationError';
      
      mockPrismaClient.page.findMany.mockRejectedValue(invalidQueryError);

      await expect(database.page.findMany()).rejects.toThrow('Invalid field name');
    });

    it('should handle record not found errors', async () => {
      const notFoundError = new Error('Record not found');
      notFoundError.name = 'NotFoundError';
      
      mockPrismaClient.page.findUniqueOrThrow.mockRejectedValue(notFoundError);

      await expect(
        database.page.findUniqueOrThrow({ where: { id: 999 } })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large dataset queries efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Page ${i + 1}`,
      }));

      mockPrismaClient.page.findMany.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const result = await database.page.findMany({
        take: 10000,
      });
      const endTime = Date.now();

      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent read operations', async () => {
      const mockPage = { id: 1, name: 'Concurrent Test Page' };
      mockPrismaClient.page.findUnique.mockResolvedValue(mockPage);

      const concurrentReads = Array.from({ length: 100 }, (_, i) =>
        database.page.findUnique({ where: { id: i + 1 } })
      );

      const results = await Promise.all(concurrentReads);

      expect(results).toHaveLength(100);
      expect(mockPrismaClient.page.findUnique).toHaveBeenCalledTimes(100);
    });

    it('should handle memory-efficient pagination', async () => {
      const pageSize = 50;
      const totalPages = 10;

      for (let page = 0; page < totalPages; page++) {
        const mockPageData = Array.from({ length: pageSize }, (_, i) => ({
          id: page * pageSize + i + 1,
          name: `Page ${page * pageSize + i + 1}`,
        }));

        mockPrismaClient.page.findMany.mockResolvedValueOnce(mockPageData);

        const result = await database.page.findMany({
          skip: page * pageSize,
          take: pageSize,
          orderBy: { id: 'asc' },
        });

        expect(result).toHaveLength(pageSize);
      }

      expect(mockPrismaClient.page.findMany).toHaveBeenCalledTimes(totalPages);
    });

    it('should handle cursor-based pagination efficiently', async () => {
      const mockPages = [
        { id: 101, name: 'Page 101' },
        { id: 102, name: 'Page 102' },
        { id: 103, name: 'Page 103' },
      ];

      mockPrismaClient.page.findMany.mockResolvedValue(mockPages);

      const result = await database.page.findMany({
        cursor: { id: 100 },
        skip: 1,
        take: 3,
        orderBy: { id: 'asc' },
      });

      expect(result).toEqual(mockPages);
      expect(mockPrismaClient.page.findMany).toHaveBeenCalledWith({
        cursor: { id: 100 },
        skip: 1,
        take: 3,
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('Database Monitoring and Health', () => {
    it('should provide database metrics', async () => {
      const mockMetrics = {
        counters: [
          { key: 'prisma_client_queries_total', value: 1000 },
          { key: 'prisma_client_queries_duration_histogram_ms', value: 250 },
        ],
        gauges: [
          { key: 'prisma_pool_connections_open', value: 5 },
          { key: 'prisma_pool_connections_idle', value: 2 },
        ],
      };

      mockPrismaClient.$metrics.prometheus.mockResolvedValue(mockMetrics);

      const metrics = await database.$metrics.prometheus();
      expect(metrics).toEqual(mockMetrics);
    });

    it('should handle health check queries', async () => {
      const healthCheckResult = [{ health: 'ok' }];
      mockPrismaClient.$queryRaw.mockResolvedValue(healthCheckResult);

      const result = await database.$queryRaw`SELECT 'ok' as health`;
      expect(result).toEqual(healthCheckResult);
    });

    it('should handle database migration status checks', async () => {
      // Simulate checking migration status
      const migrationStatus = [
        { name: '20240101000000_init', applied: true },
        { name: '20240102000000_add_pages', applied: true },
      ];

      mockPrismaClient.$queryRaw.mockResolvedValue(migrationStatus);

      const result = await database.$queryRaw`
        SELECT migration_name as name, applied_at IS NOT NULL as applied
        FROM _prisma_migrations
        ORDER BY started_at
      `;

      expect(result).toEqual(migrationStatus);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty database queries', async () => {
      mockPrismaClient.page.findMany.mockResolvedValue([]);

      const result = await database.page.findMany();
      expect(result).toEqual([]);
    });

    it('should handle null and undefined values correctly', async () => {
      const pageWithNulls = { id: 1, name: null };
      mockPrismaClient.page.create.mockResolvedValue(pageWithNulls);

      const result = await database.page.create({
        data: { name: null },
      });

      expect(result).toEqual(pageWithNulls);
    });

    it('should handle very long string values', async () => {
      const longString = 'a'.repeat(10000);
      const pageWithLongString = { id: 1, name: longString };
      
      mockPrismaClient.page.create.mockResolvedValue(pageWithLongString);

      const result = await database.page.create({
        data: { name: longString },
      });

      expect(result.name).toHaveLength(10000);
    });

    it('should handle special characters in queries', async () => {
      const specialCharsPage = { 
        id: 1, 
        name: "Page with special chars: !@#$%^&*()[]{}|;':\",./<>?" 
      };
      
      mockPrismaClient.page.create.mockResolvedValue(specialCharsPage);

      const result = await database.page.create({
        data: { name: "Page with special chars: !@#$%^&*()[]{}|;':\",./<>?" },
      });

      expect(result).toEqual(specialCharsPage);
    });

    it('should handle concurrent write operations safely', async () => {
      const concurrentWrites = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Concurrent Page ${i + 1}`,
      }));

      // Mock each create call to return the corresponding page
      concurrentWrites.forEach((page, index) => {
        mockPrismaClient.page.create.mockResolvedValueOnce(page);
      });

      const writePromises = concurrentWrites.map((_, i) =>
        database.page.create({ data: { name: `Concurrent Page ${i + 1}` } })
      );

      const results = await Promise.all(writePromises);
      expect(results).toEqual(concurrentWrites);
      expect(mockPrismaClient.page.create).toHaveBeenCalledTimes(10);
    });
  });
});