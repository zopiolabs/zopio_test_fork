/**
 * SPDX-License-Identifier: MIT
 */

import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Mock server-only to prevent client component errors
vi.mock('server-only', () => ({}));

// Mock keys module
vi.mock('./keys', () => ({
  keys: vi.fn(() => ({
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  })),
}));

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
});

// Mock Prisma client for isolated testing
vi.mock('./generated/client', () => {
  const mockPrismaClient = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    page: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    Prisma: {
      PrismaClientKnownRequestError: class extends Error {
        code: string;
        
        constructor(
          message: string,
          code: string
        ) {
          super(message);
          this.code = code;
          this.name = 'PrismaClientKnownRequestError';
        }
      },
      PrismaClientUnknownRequestError: class extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'PrismaClientUnknownRequestError';
        }
      },
      PrismaClientValidationError: class extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'PrismaClientValidationError';
        }
      },
    },
  };
});

// Mock Neon serverless adapter
vi.mock('@neondatabase/serverless', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
  neonConfig: {
    webSocketConstructor: undefined,
  },
}));

// Mock Prisma Neon adapter
vi.mock('@prisma/adapter-neon', () => ({
  PrismaNeon: vi.fn().mockImplementation(() => ({})),
}));

// Mock ws
vi.mock('ws', () => ({
  default: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  vi.resetAllMocks();
});
