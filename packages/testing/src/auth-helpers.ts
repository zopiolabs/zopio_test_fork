/**
 * SPDX-License-Identifier: MIT
 */

import { vi } from 'vitest';
import { organizationFactory, userFactory } from './factories.js';
import { clerkMocks } from './mocks.js';

// Type definitions
interface PermissionContext {
  userId: string;
  role: string;
  tenantId: string;
  [key: string]: unknown;
}

interface PermissionRecord {
  id?: string;
  [key: string]: unknown;
}

interface PermissionRule {
  resource: string;
  action: string;
  condition?: (
    context: PermissionContext,
    record?: PermissionRecord
  ) => boolean;
  dsl?: Record<string, unknown>;
  fieldPermissions?: Record<string, 'read' | 'write' | 'none'>;
}

interface User {
  id: string;
  [key: string]: unknown;
}

interface Organization {
  id: string;
  slug?: string;
  [key: string]: unknown;
}

interface Session {
  userId: string;
  sessionId: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

interface AuthRequest {
  headers: {
    authorization?: string;
  };
  user?: {
    role?: string;
    permissions?: string[];
  };
}

interface AuthResponse {
  status: (code: number) => AuthResponse;
  json: (data: Record<string, unknown>) => void;
}

type NextFunction = () => void;

/**
 * Authentication-specific test helpers and utilities
 */

/**
 * Create a mock user context for RBAC testing
 */
export function createMockUserContext(
  overrides: Partial<{
    userId: string;
    role: string;
    tenantId: string;
  }> = {}
) {
  return {
    userId: 'user_test123',
    role: 'admin',
    tenantId: 'tenant_test456',
    ...overrides,
  };
}

/**
 * Create mock permission rules for testing
 */
export function createMockPermissionRule(
  overrides: Partial<{
    resource: string;
    action: string;
    condition?: (
      context: PermissionContext,
      record?: PermissionRecord
    ) => boolean;
    dsl?: Record<string, unknown>;
    fieldPermissions?: Record<string, 'read' | 'write' | 'none'>;
  }> = {}
) {
  return {
    resource: 'users',
    action: 'read',
    condition: undefined,
    dsl: undefined,
    fieldPermissions: undefined,
    ...overrides,
  };
}

/**
 * Create a set of common CRUD permission rules
 */
export function createCrudPermissionRules(resource: string) {
  return [
    createMockPermissionRule({ resource, action: 'create' }),
    createMockPermissionRule({ resource, action: 'read' }),
    createMockPermissionRule({ resource, action: 'update' }),
    createMockPermissionRule({ resource, action: 'delete' }),
  ];
}

/**
 * Mock Clerk authentication state
 */
export function mockClerkAuth(
  overrides: Partial<{
    isSignedIn: boolean;
    userId: string;
    sessionId: string;
    orgId: string;
    orgRole: string;
    user: User;
    organization: Organization;
  }> = {}
) {
  const mockUser = userFactory.createWithProfile();
  const mockOrg = organizationFactory.createWithLogo();

  const authState = {
    isSignedIn: true,
    userId: mockUser.id,
    sessionId: 'sess_test123',
    orgId: mockOrg.id,
    orgRole: 'admin',
    user: mockUser,
    organization: mockOrg,
    ...overrides,
  };

  // Mock Clerk hooks
  vi.mocked(clerkMocks.useAuth).mockReturnValue({
    userId: authState.userId,
    sessionId: authState.sessionId,
    orgId: authState.orgId,
    orgRole: authState.orgRole,
    orgSlug: authState.organization?.slug || 'test-org',
    isLoaded: true,
    isSignedIn: authState.isSignedIn,
    signOut: vi.fn(),
    getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  });

  vi.mocked(clerkMocks.useUser).mockReturnValue({
    user: authState.user,
    isLoaded: true,
    isSignedIn: authState.isSignedIn,
  });

  vi.mocked(clerkMocks.useOrganization).mockReturnValue({
    organization: authState.organization,
    isLoaded: true,
    membership: {
      id: 'mem_test123',
      role: authState.orgRole,
      permissions: ['org:read', 'org:write'],
    },
  });

  return authState;
}

/**
 * Mock JWT token verification
 */
export function mockJwtVerify(shouldSucceed = true, userIdOverride?: string) {
  const mockVerify = vi.fn();

  if (shouldSucceed) {
    mockVerify.mockResolvedValue({
      payload: {
        sub: userIdOverride || 'user_test123',
        iss: 'clerk',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      },
    });
  } else {
    mockVerify.mockRejectedValue(new Error('JWT verification failed'));
  }

  return mockVerify;
}

/**
 * Create mock access evaluation input
 */
export function createMockAccessEvaluationInput(
  overrides: Partial<{
    rules: PermissionRule[];
    context: PermissionContext;
    action: string;
    resource: string;
    record?: PermissionRecord;
    field?: string;
  }> = {}
) {
  return {
    rules: [createMockPermissionRule()],
    context: createMockUserContext(),
    action: 'read',
    resource: 'users',
    record: undefined,
    field: undefined,
    ...overrides,
  };
}

/**
 * Permission testing utilities
 */
export const permissionTestUtils = {
  /**
   * Test that a set of permissions work correctly
   */
  testPermissions<T>(
    permissions: Array<{
      resource: string;
      action: string;
      context?: PermissionContext;
      record?: PermissionRecord;
      field?: string;
      expectedResult: boolean;
      expectedReason?: string;
    }>,
    evaluateFunction: (input: {
      rules: PermissionRule[];
      context: PermissionContext;
      action: string;
      resource: string;
      record?: PermissionRecord;
      field?: string;
    }) => T
  ) {
    for (const permission of permissions) {
      const input = createMockAccessEvaluationInput({
        rules: [
          createMockPermissionRule({
            resource: permission.resource,
            action: permission.action,
          }),
        ],
        context: permission.context || createMockUserContext(),
        action: permission.action,
        resource: permission.resource,
        record: permission.record,
        field: permission.field,
      });

      const result = evaluateFunction(input);

      if (typeof result === 'object' && result !== null && 'can' in result) {
        // biome-ignore lint/suspicious/noMisplacedAssertion: This is a test utility function that will be called from within test blocks
        expect((result as { can: boolean }).can).toBe(
          permission.expectedResult
        );
        if (permission.expectedReason) {
          // biome-ignore lint/suspicious/noMisplacedAssertion: This is a test utility function that will be called from within test blocks
          expect((result as { can: boolean; reason?: string }).reason).toBe(
            permission.expectedReason
          );
        }
      }
    }
  },

  /**
   * Create a permission matrix for testing
   */
  createPermissionMatrix(
    resources: string[],
    actions: string[],
    roles: string[]
  ) {
    const matrix: Array<{
      resource: string;
      action: string;
      role: string;
      should: 'allow' | 'deny';
    }> = [];

    for (const resource of resources) {
      for (const action of actions) {
        for (const role of roles) {
          // Default logic - admins can do everything, users can only read
          const should =
            role === 'admin' || action === 'read' ? 'allow' : 'deny';

          matrix.push({
            resource,
            action,
            role,
            should,
          });
        }
      }
    }

    return matrix;
  },
};

/**
 * Session testing utilities
 */
export const sessionTestUtils = {
  /**
   * Create a mock session for testing
   */
  createMockSession(
    overrides: Partial<{
      userId: string;
      sessionId: string;
      isActive: boolean;
      expiresAt: Date;
      createdAt: Date;
    }> = {}
  ) {
    return {
      userId: 'user_test123',
      sessionId: 'sess_test456',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Mock session validation
   */
  mockSessionValidation(isValid = true, session?: Session) {
    const mockValidate = vi.fn();

    if (isValid) {
      mockValidate.mockResolvedValue(
        session || sessionTestUtils.createMockSession()
      );
    } else {
      mockValidate.mockRejectedValue(new Error('Invalid session'));
    }

    return mockValidate;
  },
};

/**
 * Organization/tenant testing utilities
 */
export const organizationTestUtils = {
  /**
   * Create mock organization membership
   */
  createMockMembership(
    overrides: Partial<{
      userId: string;
      orgId: string;
      role: string;
      permissions: string[];
      isActive: boolean;
    }> = {}
  ) {
    return {
      userId: 'user_test123',
      orgId: 'org_test456',
      role: 'member',
      permissions: ['org:read'],
      isActive: true,
      ...overrides,
    };
  },

  /**
   * Create mock organization hierarchy
   */
  createMockOrgHierarchy(levels = 3) {
    const hierarchy: ReturnType<typeof organizationFactory.create>[] = [];

    for (let i = 0; i < levels; i++) {
      hierarchy.push(
        organizationFactory.create({
          id: `org_level_${i}`,
          name: `Level ${i} Organization`,
          // Parent reference for hierarchy
          ...(i > 0 && { parentId: `org_level_${i - 1}` }),
        })
      );
    }

    return hierarchy;
  },
};

/**
 * Authentication flow testing utilities
 */
export const authFlowTestUtils = {
  /**
   * Simulate complete authentication flow
   */
  async simulateAuthFlow(
    steps: Array<{
      name: string;
      action: () => Promise<unknown> | unknown;
      expectedResult?: unknown;
      shouldSucceed?: boolean;
    }>
  ) {
    const results: Array<{
      step: string;
      result?: unknown;
      error?: unknown;
      success: boolean;
    }> = [];

    for (const step of steps) {
      try {
        const result = await Promise.resolve(step.action());

        if (step.shouldSucceed !== false) {
          if (step.expectedResult !== undefined) {
            // biome-ignore lint/suspicious/noMisplacedAssertion: This is a test utility function that will be called from within test blocks
            expect(result).toEqual(step.expectedResult);
          }
        } else {
          throw new Error(`Step ${step.name} should have failed but succeeded`);
        }

        results.push({ step: step.name, result, success: true });
      } catch (error) {
        if (step.shouldSucceed !== false) {
          throw error;
        }

        results.push({ step: step.name, error, success: false });
      }
    }

    return results;
  },

  /**
   * Create mock authentication middleware
   */
  createMockAuthMiddleware(
    options: {
      requireAuth?: boolean;
      requireRole?: string;
      requirePermission?: string;
    } = {}
  ) {
    return vi
      .fn()
      .mockImplementation(
        (req: AuthRequest, res: AuthResponse, next: NextFunction) => {
          // Mock authentication logic
          const isAuthenticated =
            req.headers.authorization?.startsWith('Bearer ');

          if (options.requireAuth && !isAuthenticated) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          if (options.requireRole) {
            const userRole = req.user?.role || 'user';
            if (userRole !== options.requireRole) {
              return res.status(403).json({ error: 'Forbidden' });
            }
          }

          if (options.requirePermission) {
            const userPermissions = req.user?.permissions || [];
            if (!userPermissions.includes(options.requirePermission)) {
              return res
                .status(403)
                .json({ error: 'Insufficient permissions' });
            }
          }

          next();
        }
      );
  },
};
