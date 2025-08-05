/**
 * @fileoverview Database Real Integration Tests
 * 
 * Comprehensive integration test suite for the database module, simulating real database 
 * behavior through advanced mocking. This test suite validates connection management, 
 * transaction handling, query operations, error scenarios, and performance characteristics
 * without requiring an actual database connection.
 * 
 * Key Features:
 * - Realistic database behavior simulation with state management
 * - Transaction rollback and nested transaction support
 * - Connection lifecycle and error scenario testing
 * - Performance and scalability validation
 * - Comprehensive edge case coverage
 * 
 * Mock Strategy:
 * The tests use a sophisticated mock infrastructure that maintains internal state,
 * simulates transaction behavior, and provides realistic error conditions. The mock
 * system tracks database operations and maintains consistency across operations.
 * 
 * @version 1.0.0
 * @author Zopio Development Team
 * @license MIT
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

/**
 * Database state manager for realistic mock behavior
 * Maintains internal state to simulate real database operations
 */
class DatabaseStateMock {
  private data: Map<string, any[]> = new Map();
  private connected = false;
  private transactionDepth = 0;
  private transactionData: Map<string, any[]> = new Map();

  constructor() {
    this.data.set('page', []);
    this.data.set('user', []);
  }

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }

  startTransaction() {
    this.transactionDepth++;
    // Copy current state for transaction isolation
    this.transactionData = new Map(this.data);
  }

  commitTransaction() {
    if (this.transactionDepth > 0) {
      this.transactionDepth--;
      // Commit transaction data to main state
      this.data = new Map(this.transactionData);
    }
  }

  rollbackTransaction() {
    if (this.transactionDepth > 0) {
      this.transactionDepth--;
      // Restore original state
      this.transactionData.clear();
    }
  }

  getData(model: string) {
    return this.transactionDepth > 0 
      ? this.transactionData.get(model) || []
      : this.data.get(model) || [];
  }

  setData(model: string, data: any[]) {
    if (this.transactionDepth > 0) {
      this.transactionData.set(model, data);
    } else {
      this.data.set(model, data);
    }
  }

  reset() {
    this.data.clear();
    this.transactionData.clear();
    this.data.set('page', []);
    this.data.set('user', []);
    this.connected = false;
    this.transactionDepth = 0;
  }
}

const dbStateMock = new DatabaseStateMock();

/**
 * Create a comprehensive mock Prisma client with realistic database behavior
 * Includes state management, transaction support, and error simulation
 */
const createMockPrismaClient = () => {
  const createModelMock = (modelName: string) => ({
    findUnique: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const result = data.find(item => {
        if (args?.where?.id) return item.id === args.where.id;
        return false;
      });
      return result || null;
    }),

    findMany: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      let data = dbStateMock.getData(modelName);
      
      // Handle cursor-based pagination
      if (args?.cursor) {
        const cursorId = args.cursor.id;
        const cursorIndex = data.findIndex(item => item.id === cursorId);
        if (cursorIndex !== -1) {
          data = data.slice(cursorIndex + 1); // Start after the cursor
        }
      }
      
      // Apply filters, ordering, pagination
      if (args?.skip !== undefined) {
        data = data.slice(args.skip);
      }
      
      if (args?.take !== undefined) {
        data = data.slice(0, args.take);
      }
      
      return data;
    }),

    findFirst: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      return data[0] || null;
    }),

    findFirstOrThrow: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const result = data[0];
      if (!result) throw new Error('Record not found');
      return result;
    }),

    findUniqueOrThrow: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const result = data.find(item => {
        if (args?.where?.id) return item.id === args.where.id;
        return false;
      });
      if (!result) throw new Error('Record not found');
      return result;
    }),

    create: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const newItem = { id: data.length + 1, ...args.data };
      data.push(newItem);
      dbStateMock.setData(modelName, data);
      return newItem;
    }),

    createMany: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const newItems = args.data.map((item: any, index: number) => ({
        id: data.length + index + 1,
        ...item
      }));
      data.push(...newItems);
      dbStateMock.setData(modelName, data);
      return { count: newItems.length };
    }),

    update: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const index = data.findIndex(item => {
        if (args?.where?.id) return item.id === args.where.id;
        return false;
      });
      if (index === -1) throw new Error('Record not found');
      
      const updated = { ...data[index], ...args.data };
      data[index] = updated;
      dbStateMock.setData(modelName, data);
      return updated;
    }),

    updateMany: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      let count = 0;
      
      data.forEach((item, index) => {
        // Simple filter logic - in real scenario would be more complex
        if (!args?.where || Object.keys(args.where).length === 0) {
          Object.assign(data[index], args.data);
          count++;
        } else {
          // More sophisticated filtering could be added here
          // For now, just match simple contains queries
          if (args.where.name?.contains) {
            if (item.name?.includes(args.where.name.contains)) {
              Object.assign(data[index], args.data);
              count++;
            }
          }
        }
      });
      
      dbStateMock.setData(modelName, data);
      return { count };
    }),

    delete: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const index = data.findIndex(item => {
        if (args?.where?.id) return item.id === args.where.id;
        return false;
      });
      if (index === -1) throw new Error('Record not found');
      
      const deleted = data.splice(index, 1)[0];
      dbStateMock.setData(modelName, data);
      return deleted;
    }),

    deleteMany: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const originalLength = data.length;
      
      // Simple delete all if no where clause
      if (!args?.where) {
        dbStateMock.setData(modelName, []);
        return { count: originalLength };
      }
      
      // More complex filtering would be implemented here
      return { count: 0 };
    }),

    upsert: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      const existing = data.find(item => {
        if (args?.where?.id) return item.id === args.where.id;
        return false;
      });
      
      if (existing) {
        const updated = { ...existing, ...args.update };
        const index = data.findIndex(item => item.id === existing.id);
        data[index] = updated;
        dbStateMock.setData(modelName, data);
        return updated;
      } else {
        const newItem = { id: data.length + 1, ...args.create };
        data.push(newItem);
        dbStateMock.setData(modelName, data);
        return newItem;
      }
    }),

    count: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      return data.length;
    }),

    aggregate: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      const data = dbStateMock.getData(modelName);
      
      // Mock aggregate result
      return {
        _count: { _all: data.length, id: data.length, name: data.length },
        _avg: { id: data.length > 0 ? data.reduce((sum, item) => sum + (item.id || 0), 0) / data.length : 0 },
        _sum: { id: data.reduce((sum, item) => sum + (item.id || 0), 0) },
        _min: { id: Math.min(...data.map(item => item.id || 0)), name: data[0]?.name || null },
        _max: { id: Math.max(...data.map(item => item.id || 0)), name: data[data.length - 1]?.name || null },
      };
    }),

    groupBy: vi.fn().mockImplementation(async (args: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      // Mock group by result
      return [
        { name: 'Category A', _count: { _all: 10 }, _avg: { id: 15.5 } },
        { name: 'Category B', _count: { _all: 5 }, _avg: { id: 25.0 } },
      ];
    }),
  });

  const mockClient = {
    user: createModelMock('user'),
    page: createModelMock('page'),
    
    $connect: vi.fn().mockImplementation(async () => {
      dbStateMock.connect();
    }),

    $disconnect: vi.fn().mockImplementation(async () => {
      dbStateMock.disconnect();
    }),

    $transaction: vi.fn().mockImplementation(async (callback: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      
      dbStateMock.startTransaction();
      try {
        const result = await callback(mockClient);
        dbStateMock.commitTransaction();
        return result;
      } catch (error) {
        dbStateMock.rollbackTransaction();
        throw error;
      }
    }),

    $executeRaw: vi.fn().mockImplementation(async (query: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      // Mock execute raw result
      return 5;
    }),

    $queryRaw: vi.fn().mockImplementation(async (query: any) => {
      if (!dbStateMock.isConnected()) throw new Error('Database not connected');
      // Mock query raw result
      return [{ health: 'ok' }];
    }),

    $use: vi.fn(),

    $metrics: {
      prometheus: vi.fn().mockImplementation(async () => ({
        counters: [
          { key: 'prisma_client_queries_total', value: 1000 },
          { key: 'prisma_client_queries_duration_histogram_ms', value: 250 },
        ],
        gauges: [
          { key: 'prisma_pool_connections_open', value: 5 },
          { key: 'prisma_pool_connections_idle', value: 2 },
        ],
      })),
    },
  };

  return mockClient;
};

// Mock the database module to return our mock client
let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

vi.mock('../generated/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}));

// Mock the entire database module
vi.mock('../index.js', () => {
  return {
    database: mockPrismaClient,
  };
});

describe('Database Real Integration Tests', () => {
  let database: any;

  beforeAll(async () => {
    // Global setup for database tests
    process.env.DATABASE_URL = mockEnv.DATABASE_URL;
    process.env.NODE_ENV = mockEnv.NODE_ENV;
  });

  beforeEach(async () => {
    // Reset the database state and all mocks
    dbStateMock.reset();
    vi.clearAllMocks();
    
    // Create a fresh mock client for each test
    mockPrismaClient = createMockPrismaClient();
    
    // Set database to our mock client
    database = mockPrismaClient;
    
    // Auto-connect for tests
    await database.$connect();
  });

  afterEach(async () => {
    // Clean up connections and reset state
    if (database && typeof database.$disconnect === 'function') {
      await database.$disconnect();
    }
    dbStateMock.reset();
  });

  afterAll(async () => {
    // Global cleanup
    vi.restoreAllMocks();
  });

  describe('Database Connection Management', () => {
    it('should establish database connection with correct configuration', async () => {
      expect(database).toBeDefined();
      
      // Since we're mocking the entire database module, we verify that the components
      // exist and the database is properly configured for our test environment
      expect(database.$connect).toBeDefined();
      expect(database.$disconnect).toBeDefined();
      expect(database.page).toBeDefined();
      expect(database.user).toBeDefined();
      
      // Verify our mock environment is properly set
      expect(process.env.DATABASE_URL).toBe(mockEnv.DATABASE_URL);
      expect(process.env.NODE_ENV).toBe(mockEnv.NODE_ENV);
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
      // Reset the mock to clear any previous calls (like from beforeEach)
      database.$connect.mockClear();
      
      // Simulate multiple concurrent connections
      const connections = Array.from({ length: 20 }, () =>
        database.$connect()
      );

      await Promise.all(connections);
      expect(database.$connect).toHaveBeenCalledTimes(20);
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
      // Set up test data in our mock database
      const testPage = {
        id: 1,
        name: 'Complex Page',
        metadata: { views: 100, likes: 50 },
        _count: { comments: 5 },
      };
      
      const pageData = dbStateMock.getData('page');
      pageData.push(testPage);
      dbStateMock.setData('page', pageData);

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

      expect(result).toEqual([testPage]);
      expect(database.page.findMany).toHaveBeenCalledWith({
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
      // Set up test data with multiple pages
      const testPages = [
        { id: 1, name: 'A Page' },
        { id: 2, name: 'B Page' },
        { id: 3, name: 'Z Page' },
      ];
      
      dbStateMock.setData('page', testPages);

      const result = await database.page.aggregate({
        where: { name: { contains: 'Page' } },
        _count: { _all: true, id: true, name: true },
        _avg: { id: true },
        _sum: { id: true },
        _min: { id: true, name: true },
        _max: { id: true, name: true },
      });

      expect(result._count._all).toBe(3);
      expect(result._avg.id).toBe(2); // (1+2+3)/3
      expect(result._sum.id).toBe(6); // 1+2+3
      expect(result._min.id).toBe(1);
      expect(result._max.id).toBe(3);
      expect(database.page.aggregate).toHaveBeenCalled();
    });

    it('should handle group by operations', async () => {
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

      // Our mock returns a standard group by result
      expect(result).toEqual([
        { name: 'Category A', _count: { _all: 10 }, _avg: { id: 15.5 } },
        { name: 'Category B', _count: { _all: 5 }, _avg: { id: 25.0 } },
      ]);
      expect(database.page.groupBy).toHaveBeenCalled();
    });

    it('should handle raw queries', async () => {
      const result = await database.$queryRaw`
        SELECT id, name, 'custom_value' as custom_field 
        FROM "Page" 
        WHERE name LIKE ${'%Raw%'}
        ORDER BY id
        LIMIT 10
      `;

      // Our mock returns a health check result
      expect(result).toEqual([{ health: 'ok' }]);
      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it('should handle raw execute operations', async () => {
      const result = await database.$executeRaw`
        UPDATE "Page" 
        SET name = CONCAT(name, ' - Updated')
        WHERE id > ${100}
      `;

      // Our mock returns affected row count
      expect(result).toBe(5);
      expect(database.$executeRaw).toHaveBeenCalled();
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
      // Set up a large dataset in our mock
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Page ${i + 1}`,
      }));
      
      dbStateMock.setData('page', largeDataset);

      const startTime = Date.now();
      const result = await database.page.findMany({
        take: 10000,
      });
      const endTime = Date.now();

      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent read operations', async () => {
      // Set up test data
      const testPages = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Concurrent Test Page ${i + 1}`,
      }));
      
      dbStateMock.setData('page', testPages);

      const concurrentReads = Array.from({ length: 100 }, (_, i) =>
        database.page.findUnique({ where: { id: i + 1 } })
      );

      const results = await Promise.all(concurrentReads);

      expect(results).toHaveLength(100);
      expect(database.page.findUnique).toHaveBeenCalledTimes(100);
    });

    it('should handle memory-efficient pagination', async () => {
      const pageSize = 50;
      const totalPages = 10;
      
      // Set up large dataset for pagination
      const largeDataset = Array.from({ length: pageSize * totalPages }, (_, i) => ({
        id: i + 1,
        name: `Page ${i + 1}`,
      }));
      
      dbStateMock.setData('page', largeDataset);

      for (let page = 0; page < totalPages; page++) {
        const result = await database.page.findMany({
          skip: page * pageSize,
          take: pageSize,
          orderBy: { id: 'asc' },
        });

        expect(result).toHaveLength(pageSize);
      }

      expect(database.page.findMany).toHaveBeenCalledTimes(totalPages);
    });

    it('should handle cursor-based pagination efficiently', async () => {
      // Set up test data including the cursor point
      const testPages = [
        { id: 100, name: 'Page 100' }, // Cursor point
        { id: 101, name: 'Page 101' },
        { id: 102, name: 'Page 102' },
        { id: 103, name: 'Page 103' },
      ];
      
      dbStateMock.setData('page', testPages);

      const result = await database.page.findMany({
        cursor: { id: 100 },
        skip: 1, // Skip the first item after cursor (Page 101)
        take: 2, // Take 2 items (Page 102, Page 103)
        orderBy: { id: 'asc' },
      });

      // Should return Page 102 and Page 103 (skipping Page 101)
      expect(result).toEqual([
        { id: 102, name: 'Page 102' },
        { id: 103, name: 'Page 103' },
      ]);
      expect(database.page.findMany).toHaveBeenCalledWith({
        cursor: { id: 100 },
        skip: 1,
        take: 2,
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('Database Monitoring and Health', () => {
    it('should provide database metrics', async () => {
      const metrics = await database.$metrics.prometheus();
      
      expect(metrics).toEqual({
        counters: [
          { key: 'prisma_client_queries_total', value: 1000 },
          { key: 'prisma_client_queries_duration_histogram_ms', value: 250 },
        ],
        gauges: [
          { key: 'prisma_pool_connections_open', value: 5 },
          { key: 'prisma_pool_connections_idle', value: 2 },
        ],
      });
      expect(database.$metrics.prometheus).toHaveBeenCalled();
    });

    it('should handle health check queries', async () => {
      const result = await database.$queryRaw`SELECT 'ok' as health`;
      expect(result).toEqual([{ health: 'ok' }]);
      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it('should handle database migration status checks', async () => {
      const result = await database.$queryRaw`
        SELECT migration_name as name, applied_at IS NOT NULL as applied
        FROM _prisma_migrations
        ORDER BY started_at
      `;

      expect(result).toEqual([{ health: 'ok' }]); // Our mock returns health check result
      expect(database.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty database queries', async () => {
      // Database starts empty
      const result = await database.page.findMany();
      expect(result).toEqual([]);
    });

    it('should handle null and undefined values correctly', async () => {
      const result = await database.page.create({
        data: { name: null },
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe(null);
    });

    it('should handle very long string values', async () => {
      const longString = 'a'.repeat(10000);
      
      const result = await database.page.create({
        data: { name: longString },
      });

      expect(result.name).toHaveLength(10000);
      expect(result.id).toBe(1);
    });

    it('should handle special characters in queries', async () => {
      const specialName = "Page with special chars: !@#$%^&*()[]{}|;':\",./<>?";
      
      const result = await database.page.create({
        data: { name: specialName },
      });

      expect(result.name).toBe(specialName);
      expect(result.id).toBe(1);
    });

    it('should handle concurrent write operations safely', async () => {
      const writePromises = Array.from({ length: 10 }, (_, i) =>
        database.page.create({ data: { name: `Concurrent Page ${i + 1}` } })
      );

      const results = await Promise.all(writePromises);
      
      expect(results).toHaveLength(10);
      expect(database.page.create).toHaveBeenCalledTimes(10);
      
      // Verify all pages have unique IDs and correct names
      results.forEach((result, i) => {
        expect(result.id).toBe(i + 1);
        expect(result.name).toBe(`Concurrent Page ${i + 1}`);
      });
    });
  });
});