/**
 * SPDX-License-Identifier: MIT
 */

import { vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * API testing utilities for the apps/api package
 * Provides helpers for testing API routes, webhooks, and authentication
 */

export interface MockRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  url?: string;
  searchParams?: Record<string, string>;
}

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    headers = {},
    body,
    url = 'http://localhost:3000/api/test',
    searchParams = {},
  } = options;

  // Create URL with search params
  const fullUrl = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value);
  });

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const request = new Request(fullUrl.toString(), init) as NextRequest;

  // Add NextRequest-specific properties
  Object.defineProperty(request, 'nextUrl', {
    value: {
      pathname: fullUrl.pathname,
      searchParams: fullUrl.searchParams,
      search: fullUrl.search,
      href: fullUrl.href,
    },
    enumerable: true,
  });

  return request;
}

/**
 * Create an authenticated request with Bearer token
 */
export function createAuthenticatedRequest(
  token: string,
  options: MockRequestOptions = {}
): NextRequest {
  return createMockRequest({
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/**
 * Mock Clerk authentication middleware
 */
export const mockClerkAuth = {
  /**
   * Mock successful authentication
   */
  mockSuccess: (userId = 'user_test123') => {
    const mockClerkAuthMiddleware = vi.fn().mockResolvedValue({
      user: { id: userId },
    });
    
    vi.doMock('@repo/auth', () => ({
      clerkAuthMiddleware: mockClerkAuthMiddleware,
    }));
    
    return mockClerkAuthMiddleware;
  },

  /**
   * Mock authentication failure
   */
  mockFailure: (status = 401, message = 'Unauthorized') => {
    const mockResponse = new Response(message, { status });
    const mockClerkAuthMiddleware = vi.fn().mockResolvedValue(mockResponse);
    
    vi.doMock('@repo/auth', () => ({
      clerkAuthMiddleware: mockClerkAuthMiddleware,
    }));
    
    return mockClerkAuthMiddleware;
  },

  /**
   * Mock authentication error
   */
  mockError: (error = new Error('Authentication error')) => {
    const mockClerkAuthMiddleware = vi.fn().mockRejectedValue(error);
    
    vi.doMock('@repo/auth', () => ({
      clerkAuthMiddleware: mockClerkAuthMiddleware,
    }));
    
    return mockClerkAuthMiddleware;
  },
};

/**
 * Mock external service responses
 */
export const mockExternalServices = {
  /**
   * Mock Clerk API responses
   */
  mockClerkAPI: {
    success: (data: unknown = {}) => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(data),
        headers: new Headers({ 'content-type': 'application/json' }),
      });
    },
    
    error: (status = 400, error = { error: 'Bad Request' }) => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: vi.fn().mockResolvedValue(error),
        headers: new Headers({ 'content-type': 'application/json' }),
      });
    },
    
    networkError: () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));
    },
  },

  /**
   * Mock Stripe webhooks
   */
  mockStripeWebhook: {
    constructEvent: (eventType: string, data: unknown) => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            type: eventType,
            data: { object: data },
            id: 'evt_test123',
            created: Date.now(),
          }),
        },
      };
      
      vi.doMock('@repo/payments', () => ({
        stripe: mockStripe,
      }));
      
      return mockStripe;
    },
    
    constructEventError: (error = new Error('Invalid signature')) => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockImplementation(() => {
            throw error;
          }),
        },
      };
      
      vi.doMock('@repo/payments', () => ({
        stripe: mockStripe,
      }));
      
      return mockStripe;
    },
  },

  /**
   * Mock SVIX webhook verification
   */
  mockSvixWebhook: {
    verify: (eventType: string, data: unknown) => {
      const mockWebhook = vi.fn().mockImplementation(() => ({
        verify: vi.fn().mockReturnValue({
          type: eventType,
          data,
          id: 'msg_test123',
          timestamp: Date.now(),
        }),
      }));
      
      vi.doMock('svix', () => ({
        Webhook: mockWebhook,
      }));
      
      return mockWebhook;
    },
    
    verifyError: (error = new Error('Invalid signature')) => {
      const mockWebhook = vi.fn().mockImplementation(() => ({
        verify: vi.fn().mockImplementation(() => {
          throw error;
        }),
      }));
      
      vi.doMock('svix', () => ({
        Webhook: mockWebhook,
      }));
      
      return mockWebhook;
    },
  },
};

/**
 * Mock environment variables
 */
export function mockEnvironment(envVars: Record<string, string>) {
  // Simply assign to process.env since setup.ts handles base environment
  Object.assign(process.env, envVars);
}

/**
 * Mock database operations
 */
export const mockDatabase = {
  /**
   * Mock successful database operations
   */
  mockSuccess: () => {
    const mockDb = {
      page: {
        create: vi.fn().mockResolvedValue({ id: 'page_test123', name: 'cron-temp' }),
        delete: vi.fn().mockResolvedValue({ id: 'page_test123' }),
      },
      $transaction: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    };
    
    vi.doMock('@repo/database', () => ({
      database: mockDb,
    }));
    
    return mockDb;
  },

  /**
   * Mock database errors
   */
  mockError: (error = new Error('Database error')) => {
    const mockDb = {
      page: {
        create: vi.fn().mockRejectedValue(error),
        delete: vi.fn().mockRejectedValue(error),
      },
      $transaction: vi.fn().mockRejectedValue(error),
      $connect: vi.fn().mockRejectedValue(error),
      $disconnect: vi.fn().mockRejectedValue(error),
    };
    
    vi.doMock('@repo/database', () => ({
      database: mockDb,
    }));
    
    return mockDb;
  },
};

/**
 * Mock analytics services
 */
export const mockAnalytics = {
  /**
   * Mock PostHog analytics
   */
  mockPostHog: () => {
    const mockAnalytics = {
      identify: vi.fn(),
      capture: vi.fn(),
      groupIdentify: vi.fn(),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };
    
    vi.doMock('@repo/analytics/posthog/server', () => ({
      analytics: mockAnalytics,
    }));
    
    return mockAnalytics;
  },
};

/**
 * Mock Trigger.dev services
 */
export const mockTrigger = {
  /**
   * Mock successful event sending
   */
  mockSuccess: (result = { success: true, id: 'trigger_test123' }) => {
    const mockSendEvent = vi.fn().mockResolvedValue(result);
    
    vi.doMock('@repo/trigger', () => ({
      sendEvent: mockSendEvent,
    }));
    
    return mockSendEvent;
  },

  /**
   * Mock trigger error
   */
  mockError: (error = new Error('Trigger error')) => {
    const mockSendEvent = vi.fn().mockRejectedValue(error);
    
    vi.doMock('@repo/trigger', () => ({
      sendEvent: mockSendEvent,
    }));
    
    return mockSendEvent;
  },
};

/**
 * Mock logging service
 */
export const mockLogger = {
  mock: () => {
    const mockLog = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    
    vi.doMock('@repo/observability/log', () => ({
      log: mockLog,
    }));
    
    return mockLog;
  },
};

/**
 * Mock error parsing utility
 */
export const mockErrorParser = {
  mock: () => {
    const mockParseError = vi.fn().mockImplementation((error: unknown) => {
      if (error instanceof Error) {
        return error.message;
      }
      return String(error);
    });
    
    vi.doMock('@repo/observability/error', () => ({
      parseError: mockParseError,
    }));
    
    return mockParseError;
  },
};

/**
 * Test response assertions
 */
export const assertResponse = {
  /**
   * Assert successful response
   */
  success: async (response: Response, expectedData?: unknown) => {
    expect(response.status).toBe(200);
    if (expectedData) {
      const data = await response.json();
      expect(data).toEqual(expectedData);
    }
  },

  /**
   * Assert error response
   */
  error: async (response: Response, expectedStatus: number, expectedMessage?: string) => {
    expect(response.status).toBe(expectedStatus);
    if (expectedMessage) {
      const data = await response.json();
      expect(data).toHaveProperty('error');
      if (typeof data.error === 'string') {
        expect(data.error).toContain(expectedMessage);
      } else {
        expect(data.message).toContain(expectedMessage);
      }
    }
  },

  /**
   * Assert response headers
   */
  headers: (response: Response, expectedHeaders: Record<string, string>) => {
    Object.entries(expectedHeaders).forEach(([key, value]) => {
      expect(response.headers.get(key)).toBe(value);
    });
  },
};

/**
 * Webhook signature helpers
 */
export const webhookSignatures = {
  /**
   * Create mock Stripe signature
   */
  createStripeSignature: (payload: string, secret: string, timestamp?: number) => {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    // This is a simplified version - in real tests you might want to use actual crypto
    const signature = `t=${ts},v1=test_signature`;
    return signature;
  },

  /**
   * Create mock SVIX headers
   */
  createSvixHeaders: (timestamp?: number) => {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    return {
      'svix-id': 'msg_test123',
      'svix-timestamp': ts.toString(),
      'svix-signature': 'v1,test_signature',
    };
  },
};