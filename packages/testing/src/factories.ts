/**
 * SPDX-License-Identifier: MIT
 */

import { testUtils } from './utils.js';

/**
 * Test data factories for common entities used across the Zopio platform
 */

/**
 * User factory for creating test user data
 */
export const userFactory = {
  /**
   * Create a basic user object
   */
  create: (overrides: Partial<TestUser> = {}): TestUser => ({
    id: testUtils.randomUuid(),
    email: testUtils.randomEmail(),
    firstName: testUtils.randomString(8),
    lastName: testUtils.randomString(10),
    displayName: null,
    imageUrl: null,
    createdAt: testUtils.randomDate(),
    updatedAt: testUtils.randomDate(),
    lastSignInAt: testUtils.randomDate(),
    ...overrides,
  }),

  /**
   * Create a user with full profile data
   */
  createWithProfile: (overrides: Partial<TestUser> = {}): TestUser => {
    const baseUser = userFactory.create(overrides);
    return {
      ...baseUser,
      displayName: `${baseUser.firstName} ${baseUser.lastName}`,
      imageUrl: `https://example.com/avatars/${baseUser.id}.jpg`,
      ...overrides,
    };
  },

  /**
   * Create multiple users
   */
  createMany: (
    count: number,
    overrides: Partial<TestUser> = {}
  ): TestUser[] => {
    return Array.from({ length: count }, () => userFactory.create(overrides));
  },
};

/**
 * Organization factory for creating test organization data
 */
export const organizationFactory = {
  /**
   * Create a basic organization object
   */
  create: (overrides: Partial<TestOrganization> = {}): TestOrganization => ({
    id: testUtils.randomUuid(),
    name: `${testUtils.randomString(8)} Corp`,
    slug: testUtils.randomString(6).toLowerCase(),
    description: `A test organization for ${testUtils.randomString(5)}`,
    imageUrl: null,
    createdAt: testUtils.randomDate(),
    updatedAt: testUtils.randomDate(),
    ...overrides,
  }),

  /**
   * Create an organization with logo
   */
  createWithLogo: (
    overrides: Partial<TestOrganization> = {}
  ): TestOrganization => {
    const baseOrg = organizationFactory.create(overrides);
    return {
      ...baseOrg,
      imageUrl: `https://example.com/logos/${baseOrg.id}.png`,
      ...overrides,
    };
  },

  /**
   * Create multiple organizations
   */
  createMany: (
    count: number,
    overrides: Partial<TestOrganization> = {}
  ): TestOrganization[] => {
    return Array.from({ length: count }, () =>
      organizationFactory.create(overrides)
    );
  },
};

/**
 * Permission factory for creating test permission data
 */
export const permissionFactory = {
  /**
   * Create a basic permission object
   */
  create: (overrides: Partial<TestPermission> = {}): TestPermission => ({
    id: testUtils.randomUuid(),
    resource: testUtils.randomPick([
      'user',
      'organization',
      'project',
      'setting',
    ]),
    action: testUtils.randomPick(['create', 'read', 'update', 'delete']),
    conditions: null,
    createdAt: testUtils.randomDate(),
    ...overrides,
  }),

  /**
   * Create a permission with conditions
   */
  createWithConditions: (
    conditions: Record<string, unknown>,
    overrides: Partial<TestPermission> = {}
  ): TestPermission => ({
    ...permissionFactory.create(overrides),
    conditions,
  }),

  /**
   * Create a full CRUD permission set for a resource
   */
  createCrudSet: (resource: string): TestPermission[] => {
    return ['create', 'read', 'update', 'delete'].map((action) =>
      permissionFactory.create({ resource, action })
    );
  },
};

/**
 * API Response factory for creating mock API responses
 */
export const apiResponseFactory = {
  /**
   * Create a successful API response
   */
  success: <T>(
    data: T,
    overrides: Partial<TestApiResponse<T>> = {}
  ): TestApiResponse<T> => ({
    success: true,
    data,
    message: 'Operation completed successfully',
    timestamp: new Date().toISOString(),
    requestId: testUtils.randomUuid(),
    ...overrides,
  }),

  /**
   * Create an error API response
   */
  error: (
    error: string | TestApiError,
    overrides: Partial<TestApiResponse<null>> = {}
  ): TestApiResponse<null> => {
    const errorObj =
      typeof error === 'string'
        ? { message: error, code: 'UNKNOWN_ERROR' }
        : error;

    return {
      success: false,
      data: null,
      error: errorObj,
      timestamp: new Date().toISOString(),
      requestId: testUtils.randomUuid(),
      ...overrides,
    };
  },

  /**
   * Create a paginated API response
   */
  paginated: <T>(
    items: T[],
    page = 1,
    limit = 10,
    total?: number,
    overrides: Partial<TestPaginatedResponse<T>> = {}
  ): TestPaginatedResponse<T> => {
    const actualTotal = total ?? items.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total: actualTotal,
        totalPages: Math.ceil(actualTotal / limit),
        hasNext: page * limit < actualTotal,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
      requestId: testUtils.randomUuid(),
      ...overrides,
    };
  },
};

/**
 * Database record factory for creating test database records
 */
export const dbRecordFactory = {
  /**
   * Create a basic database record with common fields
   */
  create: <T extends Record<string, unknown>>(
    data: T,
    overrides: Partial<TestDbRecord & T> = {}
  ): TestDbRecord & T => ({
    id: testUtils.randomUuid(),
    createdAt: testUtils.randomDate(),
    updatedAt: testUtils.randomDate(),
    ...data,
    ...overrides,
  }),

  /**
   * Create a soft-deleted record
   */
  createDeleted: <T extends Record<string, unknown>>(
    data: T,
    overrides: Partial<TestDbRecord & T> = {}
  ): TestDbRecord & T => {
    const deletedAt = testUtils.randomDate();
    return dbRecordFactory.create(data, {
      deletedAt,
      updatedAt: deletedAt,
      ...overrides,
    });
  },
};

/**
 * Form data factory for creating test form submissions
 */
export const formDataFactory = {
  /**
   * Create user registration form data
   */
  userRegistration: (
    overrides: Partial<TestUserRegistrationForm> = {}
  ): TestUserRegistrationForm => ({
    email: testUtils.randomEmail(),
    firstName: testUtils.randomString(8),
    lastName: testUtils.randomString(10),
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    agreeToTerms: true,
    ...overrides,
  }),

  /**
   * Create user login form data
   */
  userLogin: (
    overrides: Partial<TestUserLoginForm> = {}
  ): TestUserLoginForm => ({
    email: testUtils.randomEmail(),
    password: 'TestPassword123!',
    rememberMe: false,
    ...overrides,
  }),

  /**
   * Create organization creation form data
   */
  organizationCreate: (
    overrides: Partial<TestOrganizationCreateForm> = {}
  ): TestOrganizationCreateForm => ({
    name: `${testUtils.randomString(8)} Corp`,
    description: `A test organization for ${testUtils.randomString(5)}`,
    ...overrides,
  }),
};

// Type definitions for test data structures
export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date | null;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPermission {
  id: string;
  resource: string;
  action: string;
  conditions: Record<string, unknown> | null;
  createdAt: Date;
}

export interface TestApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface TestApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: TestApiError;
  timestamp: string;
  requestId: string;
}

export interface TestPaginatedResponse<T> extends TestApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TestDbRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TestUserRegistrationForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface TestUserLoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface TestOrganizationCreateForm {
  name: string;
  description: string;
}
