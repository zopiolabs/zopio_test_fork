/**
 * SPDX-License-Identifier: MIT
 */

import { vi } from 'vitest';
import { organizationFactory, userFactory } from './factories.js';

/**
 * Mock factories for external services and dependencies
 */

/**
 * Clerk authentication service mocks
 */
export const clerkMocks = {
  /**
   * Mock the useUser hook
   */
  useUser: () => ({
    user: userFactory.createWithProfile(),
    isLoaded: true,
    isSignedIn: true,
  }),

  /**
   * Mock the useAuth hook
   */
  useAuth: () => ({
    userId: 'user_test123',
    sessionId: 'sess_test123',
    orgId: 'org_test123',
    orgRole: 'admin',
    orgSlug: 'test-org',
    isLoaded: true,
    isSignedIn: true,
    signOut: vi.fn(),
    getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  }),

  /**
   * Mock the useOrganization hook
   */
  useOrganization: () => ({
    organization: organizationFactory.createWithLogo(),
    isLoaded: true,
    membership: {
      id: 'mem_test123',
      role: 'admin',
      permissions: ['org:read', 'org:write'],
    },
  }),

  /**
   * Mock Clerk client methods
   */
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue(userFactory.createWithProfile()),
      getUserList: vi.fn().mockResolvedValue([]),
      updateUser: vi.fn().mockResolvedValue(userFactory.createWithProfile()),
      deleteUser: vi.fn().mockResolvedValue({}),
    },
    organizations: {
      getOrganization: vi
        .fn()
        .mockResolvedValue(organizationFactory.createWithLogo()),
      getOrganizationList: vi.fn().mockResolvedValue([]),
      createOrganization: vi
        .fn()
        .mockResolvedValue(organizationFactory.create()),
      updateOrganization: vi
        .fn()
        .mockResolvedValue(organizationFactory.create()),
      deleteOrganization: vi.fn().mockResolvedValue({}),
    },
    sessions: {
      getSessionList: vi.fn().mockResolvedValue([]),
      getSession: vi.fn().mockResolvedValue({}),
      revokeSession: vi.fn().mockResolvedValue({}),
    },
  },
};

/**
 * Database/Prisma mocks
 */
export const prismaMocks = {
  /**
   * Create a mock Prisma client
   */
  createMockPrismaClient: () => ({
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    organization: {
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
  }),

  /**
   * Mock successful database operations
   */
  mockSuccessfulOperations: (mockClient: any) => {
    mockClient.user.findUnique.mockResolvedValue(userFactory.create());
    mockClient.user.findMany.mockResolvedValue(userFactory.createMany(3));
    mockClient.user.create.mockResolvedValue(userFactory.create());
    mockClient.user.update.mockResolvedValue(userFactory.create());
    mockClient.user.delete.mockResolvedValue(userFactory.create());
    mockClient.user.count.mockResolvedValue(10);

    mockClient.organization.findUnique.mockResolvedValue(
      organizationFactory.create()
    );
    mockClient.organization.findMany.mockResolvedValue(
      organizationFactory.createMany(2)
    );
    mockClient.organization.create.mockResolvedValue(
      organizationFactory.create()
    );
    mockClient.organization.update.mockResolvedValue(
      organizationFactory.create()
    );
    mockClient.organization.delete.mockResolvedValue(
      organizationFactory.create()
    );
    mockClient.organization.count.mockResolvedValue(5);

    mockClient.$transaction.mockImplementation((callback: any) =>
      callback(mockClient)
    );
    mockClient.$connect.mockResolvedValue(undefined);
    mockClient.$disconnect.mockResolvedValue(undefined);

    return mockClient;
  },
};

/**
 * Next.js specific mocks
 */
export const nextjsMocks = {
  /**
   * Mock Next.js router
   */
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/test-path',
    query: {},
    asPath: '/test-path',
    route: '/test-path',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),

  /**
   * Mock Next.js server actions
   */
  mockServerAction: <T>(returnValue: T) => {
    return vi.fn().mockResolvedValue(returnValue);
  },

  /**
   * Mock Next.js API response
   */
  mockApiResponse: () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  }),

  /**
   * Mock Next.js request object
   */
  mockApiRequest: (overrides: Record<string, unknown> = {}) => ({
    method: 'GET',
    url: '/api/test',
    headers: {},
    body: {},
    query: {},
    cookies: {},
    ...overrides,
  }),
};

/**
 * HTTP/Fetch mocks
 */
export const httpMocks = {
  /**
   * Mock fetch with successful response
   */
  mockFetchSuccess: <T>(data: T, status = 200) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: vi.fn().mockResolvedValue(data),
      text: vi.fn().mockResolvedValue(JSON.stringify(data)),
      headers: new Headers({
        'content-type': 'application/json',
      }),
    });
  },

  /**
   * Mock fetch with error response
   */
  mockFetchError: (status = 500, message = 'Internal Server Error') => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: message,
      json: vi.fn().mockResolvedValue({ error: message }),
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: message })),
      headers: new Headers({
        'content-type': 'application/json',
      }),
    });
  },

  /**
   * Mock fetch with network error
   */
  mockFetchNetworkError: (error = 'Network Error') => {
    global.fetch = vi.fn().mockRejectedValue(new Error(error));
  },

  /**
   * Reset fetch mock
   */
  resetFetchMock: () => {
    vi.restoreAllMocks();
  },
};

/**
 * Email service mocks
 */
export const emailMocks = {
  /**
   * Mock email sending service
   */
  mockEmailService: () => ({
    sendEmail: vi.fn().mockResolvedValue({
      messageId: 'msg_test123',
      success: true,
    }),
    sendTemplate: vi.fn().mockResolvedValue({
      messageId: 'msg_test123',
      success: true,
    }),
    validateEmail: vi.fn().mockReturnValue(true),
  }),

  /**
   * Mock email templates
   */
  mockEmailTemplates: {
    welcome: vi.fn().mockReturnValue('<html>Welcome!</html>'),
    passwordReset: vi.fn().mockReturnValue('<html>Reset Password</html>'),
    invitation: vi.fn().mockReturnValue('<html>You are invited!</html>'),
  },
};

/**
 * File storage mocks
 */
export const storageMocks = {
  /**
   * Mock file upload service
   */
  mockFileUpload: () => ({
    uploadFile: vi.fn().mockResolvedValue({
      url: 'https://example.com/uploads/file.jpg',
      key: 'uploads/file.jpg',
      size: 1024,
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed-url'),
  }),

  /**
   * Mock image processing service
   */
  mockImageProcessor: () => ({
    resize: vi.fn().mockResolvedValue('https://example.com/resized.jpg'),
    crop: vi.fn().mockResolvedValue('https://example.com/cropped.jpg'),
    optimize: vi.fn().mockResolvedValue('https://example.com/optimized.jpg'),
  }),
};

/**
 * Analytics/Tracking mocks
 */
export const analyticsMocks = {
  /**
   * Mock analytics service
   */
  mockAnalytics: () => ({
    track: vi.fn(),
    identify: vi.fn(),
    page: vi.fn(),
    group: vi.fn(),
    alias: vi.fn(),
  }),

  /**
   * Mock performance monitoring
   */
  mockPerformanceMonitoring: () => ({
    startTransaction: vi.fn().mockReturnValue({
      setTag: vi.fn(),
      setData: vi.fn(),
      finish: vi.fn(),
    }),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  }),
};

/**
 * Payment service mocks (Stripe)
 */
export const paymentMocks = {
  /**
   * Mock Stripe service
   */
  mockStripe: () => ({
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      update: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      del: vi.fn().mockResolvedValue({ deleted: true }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({ id: 'sub_test123' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'sub_test123' }),
      update: vi.fn().mockResolvedValue({ id: 'sub_test123' }),
      cancel: vi.fn().mockResolvedValue({ status: 'canceled' }),
    },
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
      }),
      confirm: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } },
      }),
    },
  }),
};

/**
 * Global mock setup for common browser APIs
 */
export const browserMocks = {
  /**
   * Mock localStorage
   */
  mockLocalStorage: () => {
    const store: Record<string, string> = {};

    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      length: 0,
      key: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });

    return mockStorage;
  },

  /**
   * Mock sessionStorage
   */
  mockSessionStorage: () => {
    const store: Record<string, string> = {};

    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      length: 0,
      key: vi.fn(),
    };

    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
    });

    return mockStorage;
  },

  /**
   * Mock window.location
   */
  mockLocation: (overrides: Partial<Location> = {}) => {
    const mockLocation = {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      ...overrides,
    };

    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    return mockLocation;
  },

  /**
   * Mock IntersectionObserver
   */
  mockIntersectionObserver: () => {
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.prototype.disconnect = vi.fn();
    mockIntersectionObserver.prototype.observe = vi.fn();
    mockIntersectionObserver.prototype.unobserve = vi.fn();

    Object.defineProperty(window, 'IntersectionObserver', {
      value: mockIntersectionObserver,
      writable: true,
    });

    return mockIntersectionObserver;
  },

  /**
   * Mock ResizeObserver
   */
  mockResizeObserver: () => {
    const mockResizeObserver = vi.fn();
    mockResizeObserver.prototype.disconnect = vi.fn();
    mockResizeObserver.prototype.observe = vi.fn();
    mockResizeObserver.prototype.unobserve = vi.fn();

    Object.defineProperty(window, 'ResizeObserver', {
      value: mockResizeObserver,
      writable: true,
    });

    return mockResizeObserver;
  },
};
