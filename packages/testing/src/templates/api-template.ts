/**
 * SPDX-License-Identifier: MIT
 */

import type { APITestOptions, TestTemplate } from './types.js';

/**
 * Template for API route handler tests
 */
export const apiTestTemplate: TestTemplate = {
  name: 'API Route Test',
  description:
    'Template for testing Next.js API routes with authentication, validation, and error handling',

  generate: (options: APITestOptions) => {
    const {
      routeName,
      routePath,
      methods = ['GET'],
      requiresAuth = true,
      hasValidation = true,
      hasRateLimit = false,
      testDatabase = false,
    } = options;

    const methodTests = methods
      .map(
        (method) => `
  describe('${method} ${routePath}', () => {
    ${
      requiresAuth
        ? `it('should require authentication', async () => {
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
    });`
        : ''
    }

    ${
      hasValidation
        ? `it('should validate request body', async () => {
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
    });`
        : ''
    }

    ${
      hasRateLimit
        ? `it('should enforce rate limits', async () => {
      // Simulate multiple requests from same IP
      const requests = Array.from({ length: 10 }, () => 
        createMockRequest({ 
          method: '${method}',
          ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
          ip: '192.168.1.1'
        })
      );
      
      for (const request of requests) {
        const response = createMockResponse();
        await ${routeName}(request, response);
      }
      
      // Last request should be rate limited
      const finalResponse = createMockResponse();
      await ${routeName}(requests[0], finalResponse);
      
      expect(finalResponse.status).toHaveBeenCalledWith(429);
    });`
        : ''
    }

    it('should handle successful ${method.toLowerCase()} request', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        ${method === 'POST' || method === 'PUT' ? 'body: mockValidBody' : ''}
        ${method === 'GET' ? 'query: { id: "test-id" }' : ''}
      });
      const response = createMockResponse();
      
      ${testDatabase ? 'mockDatabase.query.mockResolvedValue(mockDatabaseResult);' : ''}
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(${method === 'POST' ? '201' : '200'});
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should handle ${method.toLowerCase()} with missing data', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders' : ''}
      });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      ${hasValidation ? 'expect(response.status).toHaveBeenCalledWith(400);' : 'expect(response.status).toHaveBeenCalledWith(200);'}
    });

    ${
      testDatabase
        ? `it('should handle database errors', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        ${method === 'POST' || method === 'PUT' ? 'body: mockValidBody' : ''}
      });
      const response = createMockResponse();
      
      mockDatabase.query.mockRejectedValue(new Error('Database connection failed'));
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Database operation failed'
      });
    });

    it('should handle database timeouts', async () => {
      const request = createMockRequest({ 
        method: '${method}',
        ${requiresAuth ? 'headers: mockAuthHeaders,' : ''}
        ${method === 'POST' || method === 'PUT' ? 'body: mockValidBody' : ''}
      });
      const response = createMockResponse();
      
      mockDatabase.query.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 1000)
        )
      );
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(504);
    });`
        : ''
    }
  });`
      )
      .join('\n');

    return `/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { ${routeName} } from '${routePath}';

// Mock external dependencies
${
  requiresAuth
    ? `const mockVerifyToken = vi.fn();
vi.mock('@repo/auth/verify-token', () => ({
  verifyToken: mockVerifyToken,
}));`
    : ''
}

${
  testDatabase
    ? `const mockDatabase = {
  query: vi.fn(),
  transaction: vi.fn(),
};
vi.mock('@repo/database', () => ({
  database: mockDatabase,
}));`
    : ''
}

${
  hasRateLimit
    ? `const mockRateLimit = vi.fn();
vi.mock('@repo/rate-limit', () => ({
  checkRateLimit: mockRateLimit,
}));`
    : ''
}

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
${
  requiresAuth
    ? `const mockAuthHeaders = {
  authorization: 'Bearer valid-token',
};

const mockUserContext = {
  userId: 'user-123',
  role: 'user',
  tenantId: 'tenant-456',
};`
    : ''
}

${
  methods.includes('POST') || methods.includes('PUT')
    ? `const mockValidBody = {
  title: 'Test Title',
  content: 'Test content',
};`
    : ''
}

${
  testDatabase
    ? `const mockDatabaseResult = {
  id: 'result-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};`
    : ''
}

describe('${routeName} API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    ${requiresAuth ? 'mockVerifyToken.mockResolvedValue(mockUserContext);' : ''}
    ${
      testDatabase
        ? `mockDatabase.query.mockResolvedValue(mockDatabaseResult);
    mockDatabase.transaction.mockImplementation((fn) => fn(mockDatabase));`
        : ''
    }
    ${hasRateLimit ? 'mockRateLimit.mockResolvedValue({ allowed: true });' : ''}
  });

  it('should reject unsupported HTTP methods', async () => {
    const request = createMockRequest({ method: 'DELETE' });
    const response = createMockResponse();
    
    await ${routeName}(request, response);
    
    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Method Not Allowed',
      message: 'DELETE method is not supported'
    });
  });

  it('should handle CORS preflight requests', async () => {
    const request = createMockRequest({ method: 'OPTIONS' });
    const response = createMockResponse();
    
    await ${routeName}(request, response);
    
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.end).toHaveBeenCalled();
  });

  it('should set proper security headers', async () => {
    const request = createMockRequest({ 
      method: '${methods[0]}',
      ${requiresAuth ? 'headers: mockAuthHeaders' : ''}
    });
    const response = createMockResponse();
    
    await ${routeName}(request, response);
    
    expect(response.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(response.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  });
  ${methodTests}

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const request = createMockRequest({ 
        method: '${methods[0]}',
        ${requiresAuth ? 'headers: mockAuthHeaders' : ''}
      });
      const response = createMockResponse();
      
      // Force an unexpected error
      vi.spyOn(JSON, 'parse').mockImplementation(() => {
        throw new Error('Unexpected parsing error');
      });
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
      
      vi.restoreAllMocks();
    });

    it('should log errors for monitoring', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest({ method: 'INVALID' });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Content Type Handling', () => {
    it('should handle JSON content type', async () => {
      const request = createMockRequest({ 
        method: '${methods.find((m) => m === 'POST' || m === 'PUT') || methods[0]}',
        headers: { 
          'content-type': 'application/json',
          ${requiresAuth ? '...mockAuthHeaders' : ''}
        }
      });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(response.status).not.toHaveBeenCalledWith(415);
    });

    it('should reject unsupported content types', async () => {
      const request = createMockRequest({ 
        method: '${methods.find((m) => m === 'POST' || m === 'PUT') || methods[0]}',
        headers: { 
          'content-type': 'text/plain',
          ${requiresAuth ? '...mockAuthHeaders' : ''}
        }
      });
      const response = createMockResponse();
      
      await ${routeName}(request, response);
      
      expect(response.status).toHaveBeenCalledWith(415);
    });
  });
});`;
  },
};
