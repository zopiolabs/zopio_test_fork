/**
 * SPDX-License-Identifier: MIT
 */

import type { APITestOptions, TestTemplate } from './types.js';

// Helper functions to reduce complexity
function generateAuthTests(method: string, routeName: string): string {
  return `it('should require authentication', async () => {
      const request = createMockRequest({ method: '${method}' });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    });

    it('should reject invalid authentication tokens', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        headers: { authorization: 'Bearer invalid-token' }
      });
      const response = createMockResponse();
      
      mockVerifyToken.mockResolvedValue(null);
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(401);
    });`;
}

function generateValidationTests(
  method: string,
  routeName: string,
  requiresAuth: boolean
): string {
  return `it('should validate request body', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        body: { invalid: 'data' }
      });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    it('should validate query parameters', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        query: { limit: 'invalid' }
      });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(400);
    });`;
}

function generateRateLimitTests(
  method: string,
  routeName: string,
  requiresAuth: boolean
): string {
  return `it('should enforce rate limits', async () => {
      // Simulate multiple requests from same IP
      const requests = Array.from({ length: 10 }, () => 
        createMockRequest({ 
          method: '${method}',
          ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
          ip: '192.168.1.1' 
        })
      );
      
      mockRateLimit.mockResolvedValueOnce(true);
      mockRateLimit.mockResolvedValue(false);
      
      for (const request of requests) {
        const response = createMockResponse();
        await ${routeName}(request, response);
        
        if (mockRateLimit.mock.calls.length > 1) {
          expect(response.status).toHaveBeenCalledWith(429);
        }
      }
    });`;
}

function generateDatabaseTests(
  method: string,
  routeName: string,
  requiresAuth: boolean
): string {
  return `it('should handle database errors gracefully', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        ${method === 'POST' || method === 'PUT' ? 'body: mockValidBody,' : ''}
      });
      const response = createMockResponse();
      
      mockDatabase.query.mockRejectedValue(new Error('Database connection failed'));
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
    });`;
}

function generateSuccessTests(
  method: string,
  routeName: string,
  requiresAuth: boolean,
  testDatabase: boolean
): string {
  const baseTest = `it('should handle successful ${method} request', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        ${method === 'POST' || method === 'PUT' ? 'body: mockValidBody,' : ''}
        ${method === 'GET' ? 'query: { limit: 10, offset: 0 },' : ''}
      });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(${method === 'POST' ? '201' : '200'});
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ${method === 'GET' ? 'data: expect.any(Array)' : 'success: true'}
        })
      );
      ${testDatabase ? 'expect(mockDatabase.query).toHaveBeenCalled();' : ''}
    });`;

  return baseTest;
}

function generateMockImports(options: APITestOptions): string {
  const imports: string[] = [];

  if (options.requiresAuth) {
    imports.push(`const mockVerifyToken = vi.fn();
vi.mock('@repo/auth/verify-token', () => ({
  verifyToken: mockVerifyToken,
}));`);
  }

  if (options.testDatabase) {
    imports.push(`const mockDatabase = {
  query: vi.fn(),
  transaction: vi.fn(),
};
vi.mock('@repo/database', () => ({
  database: mockDatabase,
}));`);
  }

  if (options.hasRateLimit) {
    imports.push(`const mockRateLimit = vi.fn();
vi.mock('@repo/rate-limit', () => ({
  checkRateLimit: mockRateLimit,
}));`);
  }

  return imports.join('\n\n');
}

function generateMockData(options: APITestOptions): string {
  const mockData: string[] = [];

  if (options.requiresAuth) {
    mockData.push(`const mockAuthHeaders = {
  authorization: 'Bearer valid-token',
};

const mockUserContext = {
  userId: 'user-123',
  role: 'user',
  tenantId: 'tenant-456',
};`);
  }

  if (options.methods.includes('POST') || options.methods.includes('PUT')) {
    mockData.push(`const mockValidBody = {
  title: 'Test Title',
  content: 'Test content',
};`);
  }

  if (options.testDatabase) {
    mockData.push(`const mockDatabaseResult = {
  id: 'result-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};`);
  }

  return mockData.join('\n\n');
}

function generateBeforeEach(options: APITestOptions): string {
  const mocks: string[] = ['vi.clearAllMocks();'];

  if (options.requiresAuth) {
    mocks.push('mockVerifyToken.mockResolvedValue(mockUserContext);');
  }

  if (options.testDatabase) {
    mocks.push(`mockDatabase.query.mockResolvedValue(mockDatabaseResult);
    mockDatabase.transaction.mockImplementation((fn) => fn(mockDatabase));`);
  }

  if (options.hasRateLimit) {
    mocks.push('mockRateLimit.mockResolvedValue(true);');
  }

  return mocks.join('\n    ');
}

function generateMethodTests(method: string, options: APITestOptions): string {
  const tests: string[] = [];

  tests.push(`  describe('${method} ${options.routePath}', () => {`);

  if (options.requiresAuth) {
    tests.push(generateAuthTests(method, options.routeName));
  }

  if (options.hasValidation) {
    tests.push(
      generateValidationTests(method, options.routeName, options.requiresAuth)
    );
  }

  if (options.hasRateLimit) {
    tests.push(
      generateRateLimitTests(method, options.routeName, options.requiresAuth)
    );
  }

  if (options.testDatabase) {
    tests.push(
      generateDatabaseTests(method, options.routeName, options.requiresAuth)
    );
  }

  tests.push(
    generateSuccessTests(
      method,
      options.routeName,
      options.requiresAuth,
      options.testDatabase
    )
  );

  tests.push('  });');

  return tests.filter(Boolean).join('\n\n    ');
}

/**
 * Template for API route handler tests
 */
export const apiTestTemplate: TestTemplate = {
  name: 'API Route Test',
  description:
    'Template for testing Next.js API routes with authentication, validation, and error handling',

  generate: (options: APITestOptions) => {
    const { routeName, routePath, methods = ['GET'] } = options;

    const methodTests = methods
      .map((method) => generateMethodTests(method, options))
      .join('\n\n');

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { ${routeName} } from '${routePath}';

// Mock external dependencies
${generateMockImports(options)}

// Test helpers
const createMockRequest = (options: any = {}) => {
  const { req } = createMocks({
    method: 'GET',
    url: '${routePath}',
    ...options,
  });
  return req;
};

const createMockResponse = () => {
  const { res } = createMocks();
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

// Mock data
${generateMockData(options)}

describe('${routeName} API Route', () => {
  beforeEach(() => {
    ${generateBeforeEach(options)}
  });

${methodTests}

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      const request = createMockRequest({ 
        method: 'GET',
        ${options.requiresAuth ? 'headers: mockAuthHeaders,' : ''}
      });
      const response = createMockResponse();
      
      // Force an unexpected error
      vi.spyOn(console, 'error').mockImplementation(() => {});
      request.method = null; // This should cause an error
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(500);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('CORS and Security Headers', () => {
    it('should set proper security headers', async () => {
      const request = createMockRequest({ 
        method: 'OPTIONS',
      });
      const response = createMockResponse();
      
      response.setHeader = vi.fn();
      
      await ${routeName}(request, response);
      
      expect(response.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.any(String)
      );
    });
  });
});
`;
  },
};
