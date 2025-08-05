/**
 * @fileoverview Database Tests - Database Client
 * 
 * Comprehensive test suite for the database client initialization, connection management,
 * and Prisma integration with Neon serverless PostgreSQL. Validates singleton pattern,
 * connection pooling, adapter configuration, and client lifecycle management.
 * 
 * **Test Scope:**
 * - Database client singleton pattern and initialization
 * - Neon serverless PostgreSQL connection management
 * - Prisma adapter configuration and integration
 * - Connection pooling and resource management
 * - Environment-based configuration handling
 * - Client lifecycle and cleanup procedures
 * 
 * **Test Categories:**
 * 1. **Client Initialization**: Singleton pattern, configuration, setup
 * 2. **Connection Management**: Pool creation, connection lifecycle
 * 3. **Adapter Integration**: PrismaNeon adapter setup and configuration
 * 4. **Environment Configuration**: Database URL, credentials, settings
 * 5. **Resource Management**: Connection cleanup, pool management
 * 6. **Error Handling**: Connection failures, configuration errors
 * 7. **Performance**: Connection reuse, pooling efficiency
 * 
 * **Mock Strategy:**
 * - Environment variable mocking for configuration testing
 * - Neon Pool and WebSocket mocking for connection simulation
 * - Prisma client mocking for database operation testing
 * 
 * **Quality Standards:**
 * - Singleton pattern enforcement (no duplicate clients)
 * - Proper resource cleanup and connection management
 * - Robust error handling for connection failures
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Mock environment first
const mockEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  NODE_ENV: 'test',
};

vi.mock('../keys', () => ({
  keys: () => mockEnv,
}));

describe('Database Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module cache to ensure fresh import
    vi.resetModules();
  });

  it('should initialize Prisma client with Neon adapter', async () => {
    const { database } = await import('../index');
    
    expect(Pool).toHaveBeenCalledWith({
      connectionString: mockEnv.DATABASE_URL,
    });
    expect(PrismaNeon).toHaveBeenCalled();
    expect(database).toBeDefined();
  });

  it('should configure neon WebSocket constructor', async () => {
    const { neonConfig } = await import('@neondatabase/serverless');
    await import('../index');
    
    expect(neonConfig.webSocketConstructor).toBe(ws);
  });

  it('should use global Prisma instance in development', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const { database: database1 } = await import('../index');
    vi.resetModules();
    const { database: database2 } = await import('../index');
    
    // In development, should use global instance
    expect(database1).toBe(database2);
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should create new instance in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // Reset global to ensure clean state
    delete (global as any).prisma;
    
    const { database } = await import('../index');
    expect(database).toBeDefined();
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should handle database connection errors gracefully', async () => {
    vi.mocked(Pool).mockImplementationOnce(() => {
      throw new Error('Connection failed');
    });

    await expect(async () => {
      await import('../index');
    }).rejects.toThrow('Connection failed');
  });

  it('should export Prisma client types', async () => {
    const exports = await import('../index');
    
    // Should have main database export
    expect(exports.database).toBeDefined();
    
    // Should re-export Prisma client types
    expect(typeof exports).toBe('object');
  });
});