/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateAccess } from '../engine/evaluate.js';
import type { AccessEvaluationInput, PermissionRule, UserContext } from '../types/index.js';

describe('Role Inheritance Patterns', () => {
  let baseContext: UserContext;
  let baseRecord: Record<string, unknown>;

  beforeEach(() => {
    baseContext = {
      userId: 'user_123',
      role: 'editor',
      tenantId: 'tenant_456',
    };

    baseRecord = {
      id: 'record_789',
      ownerId: 'user_123',
      status: 'active',
    };
  });

  describe('hierarchical role inheritance', () => {
    it('should support basic role hierarchy (admin > editor > viewer)', () => {
      const roleHierarchy = {
        admin: ['editor', 'viewer'],
        editor: ['viewer'],
        viewer: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'documents',
          action: 'read',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'viewer'),
        },
        {
          resource: 'documents',
          action: 'write',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'editor'),
        },
        {
          resource: 'documents',
          action: 'delete',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'admin'),
        },
      ];

      // Test viewer permissions
      const viewerContext = { ...baseContext, role: 'viewer' };
      
      expect(evaluateAccess({
        rules,
        context: viewerContext,
        action: 'read',
        resource: 'documents',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: viewerContext,
        action: 'write',
        resource: 'documents',
      }).can).toBe(false);

      // Test editor permissions (should inherit viewer permissions)
      const editorContext = { ...baseContext, role: 'editor' };
      
      expect(evaluateAccess({
        rules,
        context: editorContext,
        action: 'read',
        resource: 'documents',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: editorContext,
        action: 'write',
        resource: 'documents',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: editorContext,
        action: 'delete',
        resource: 'documents',
      }).can).toBe(false);

      // Test admin permissions (should inherit all permissions)
      const adminContext = { ...baseContext, role: 'admin' };
      
      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'read',
        resource: 'documents',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'write',
        resource: 'documents',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'delete',
        resource: 'documents',
      }).can).toBe(true);
    });

    it('should support multi-level inheritance (superadmin > admin > manager > user)', () => {
      const roleHierarchy = {
        superadmin: ['admin', 'manager', 'user'],
        admin: ['manager', 'user'],
        manager: ['user'],
        user: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'system',
          action: 'configure',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'superadmin'),
        },
        {
          resource: 'users',
          action: 'manage',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'admin'),
        },
        {
          resource: 'reports',
          action: 'view',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'manager'),
        },
        {
          resource: 'profile',
          action: 'edit',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'user'),
        },
      ];

      // Test that superadmin can do everything
      const superadminContext = { ...baseContext, role: 'superadmin' };
      
      expect(evaluateAccess({
        rules,
        context: superadminContext,
        action: 'configure',
        resource: 'system',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: superadminContext,
        action: 'manage',
        resource: 'users',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: superadminContext,
        action: 'view',
        resource: 'reports',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: superadminContext,
        action: 'edit',
        resource: 'profile',
      }).can).toBe(true);

      // Test that admin cannot configure system but can do lower-level tasks
      const adminContext = { ...baseContext, role: 'admin' };
      
      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'configure',
        resource: 'system',
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'manage',
        resource: 'users',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'view',
        resource: 'reports',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'edit',
        resource: 'profile',
      }).can).toBe(true);
    });

    it('should support diamond inheritance pattern', () => {
      // Diamond pattern: superuser inherits from both admin and power_user
      // admin and power_user both inherit from user
      const roleHierarchy = {
        superuser: ['admin', 'power_user', 'user'],
        admin: ['user'],
        power_user: ['user'],
        user: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'content',
          action: 'create',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'user'),
        },
        {
          resource: 'admin_panel',
          action: 'access',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'admin'),
        },
        {
          resource: 'advanced_features',
          action: 'use',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'power_user'),
        },
        {
          resource: 'system_settings',
          action: 'modify',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'superuser'),
        },
      ];

      // Test superuser has access to everything through diamond inheritance
      const superuserContext = { ...baseContext, role: 'superuser' };
      
      expect(evaluateAccess({
        rules,
        context: superuserContext,
        action: 'create',
        resource: 'content',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: superuserContext,
        action: 'access',
        resource: 'admin_panel',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: superuserContext,
        action: 'use',
        resource: 'advanced_features',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: superuserContext,
        action: 'modify',
        resource: 'system_settings',
      }).can).toBe(true);

      // Test that admin only has admin and user permissions
      const adminContext = { ...baseContext, role: 'admin' };
      
      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'create',
        resource: 'content',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'access',
        resource: 'admin_panel',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'use',
        resource: 'advanced_features',
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'modify',
        resource: 'system_settings',
      }).can).toBe(false);
    });
  });

  describe('role-based field inheritance', () => {
    it('should inherit field permissions based on role hierarchy', () => {
      const roleHierarchy = {
        admin: ['editor', 'viewer'],
        editor: ['viewer'],
        viewer: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const getFieldPermissions = (userRole: string) => {
        const permissions: Record<string, 'read' | 'write' | 'none'> = {
          public_field: 'read',
          restricted_field: 'none',
          admin_field: 'none',
        };

        if (hasRole(userRole, 'viewer')) {
          permissions.public_field = 'read';
        }

        if (hasRole(userRole, 'editor')) {
          permissions.restricted_field = 'read';
        }

        if (hasRole(userRole, 'admin')) {
          permissions.admin_field = 'write';
          permissions.restricted_field = 'write';
        }

        return permissions;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'documents',
          action: 'read',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'viewer'),
          fieldPermissions: getFieldPermissions('viewer'),
        },
        {
          resource: 'documents',
          action: 'read',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'editor'),
          fieldPermissions: getFieldPermissions('editor'),
        },
        {
          resource: 'documents',
          action: 'read',
          condition: (ctx: UserContext) => hasRole(ctx.role, 'admin'),
          fieldPermissions: getFieldPermissions('admin'),
        },
      ];

      // Test viewer field access
      const viewerContext = { ...baseContext, role: 'viewer' };
      
      expect(evaluateAccess({
        rules,
        context: viewerContext,
        action: 'read',
        resource: 'documents',
        field: 'public_field',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: viewerContext,
        action: 'read',
        resource: 'documents',
        field: 'restricted_field',
      }).can).toBe(false);

      // Test editor field access (inherits viewer permissions)
      const editorContext = { ...baseContext, role: 'editor' };
      
      expect(evaluateAccess({
        rules,
        context: editorContext,
        action: 'read',
        resource: 'documents',
        field: 'public_field',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: editorContext,
        action: 'read',
        resource: 'documents',
        field: 'restricted_field',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: editorContext,
        action: 'read',
        resource: 'documents',
        field: 'admin_field',
      }).can).toBe(false);

      // Test admin field access (inherits all permissions)
      const adminContext = { ...baseContext, role: 'admin' };
      
      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'read',
        resource: 'documents',
        field: 'public_field',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'read',
        resource: 'documents',
        field: 'restricted_field',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: adminContext,
        action: 'read',
        resource: 'documents',
        field: 'admin_field',
      }).can).toBe(true);
    });
  });

  describe('context-aware role inheritance', () => {
    it('should support tenant-specific role inheritance', () => {
      interface TenantUserContext extends UserContext {
        tenantRole?: string;
        globalRole?: string;
      }

      const tenantRoleHierarchy = {
        tenant_admin: ['tenant_editor', 'tenant_viewer'],
        tenant_editor: ['tenant_viewer'],
        tenant_viewer: [],
      };

      const globalRoleHierarchy = {
        global_admin: ['global_manager'],
        global_manager: [],
      };

      const hasTenantRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return tenantRoleHierarchy[userRole as keyof typeof tenantRoleHierarchy]?.includes(requiredRole) || false;
      };

      const hasGlobalRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return globalRoleHierarchy[userRole as keyof typeof globalRoleHierarchy]?.includes(requiredRole) || false;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'tenant_data',
          action: 'read',
          condition: (ctx: TenantUserContext) => 
            hasTenantRole(ctx.tenantRole || '', 'tenant_viewer') ||
            hasGlobalRole(ctx.globalRole || '', 'global_manager'),
        },
        {
          resource: 'tenant_settings',
          action: 'modify',
          condition: (ctx: TenantUserContext) => 
            hasTenantRole(ctx.tenantRole || '', 'tenant_admin') ||
            hasGlobalRole(ctx.globalRole || '', 'global_admin'),
        },
        {
          resource: 'global_settings',
          action: 'modify',
          condition: (ctx: TenantUserContext) => 
            hasGlobalRole(ctx.globalRole || '', 'global_admin'),
        },
      ];

      // Test tenant viewer
      const tenantViewerContext: TenantUserContext = {
        ...baseContext,
        tenantRole: 'tenant_viewer',
        globalRole: undefined,
      };

      expect(evaluateAccess({
        rules,
        context: tenantViewerContext,
        action: 'read',
        resource: 'tenant_data',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: tenantViewerContext,
        action: 'modify',
        resource: 'tenant_settings',
      }).can).toBe(false);

      // Test global manager (should have tenant access through global role)
      const globalManagerContext: TenantUserContext = {
        ...baseContext,
        tenantRole: undefined,
        globalRole: 'global_manager',
      };

      expect(evaluateAccess({
        rules,
        context: globalManagerContext,
        action: 'read',
        resource: 'tenant_data',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: globalManagerContext,
        action: 'modify',
        resource: 'tenant_settings',
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: globalManagerContext,
        action: 'modify',
        resource: 'global_settings',
      }).can).toBe(false);

      // Test global admin (should have all access)
      const globalAdminContext: TenantUserContext = {
        ...baseContext,
        tenantRole: undefined,
        globalRole: 'global_admin',
      };

      expect(evaluateAccess({
        rules,
        context: globalAdminContext,
        action: 'read',
        resource: 'tenant_data',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: globalAdminContext,
        action: 'modify',
        resource: 'tenant_settings',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: globalAdminContext,
        action: 'modify',
        resource: 'global_settings',
      }).can).toBe(true);
    });

    it('should support time-based role elevation', () => {
      interface TimedUserContext extends UserContext {
        baseRole: string;
        elevatedRole?: string;
        elevationExpiry?: Date;
      }

      const roleHierarchy = {
        emergency_admin: ['admin', 'user'],
        admin: ['user'],
        user: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const getEffectiveRole = (ctx: TimedUserContext): string => {
        if (ctx.elevatedRole && ctx.elevationExpiry && new Date() < ctx.elevationExpiry) {
          return ctx.elevatedRole;
        }
        return ctx.baseRole;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'emergency_functions',
          action: 'execute',
          condition: (ctx: TimedUserContext) => 
            hasRole(getEffectiveRole(ctx), 'emergency_admin'),
        },
        {
          resource: 'admin_panel',
          action: 'access',
          condition: (ctx: TimedUserContext) => 
            hasRole(getEffectiveRole(ctx), 'admin'),
        },
        {
          resource: 'user_content',
          action: 'view',
          condition: (ctx: TimedUserContext) => 
            hasRole(getEffectiveRole(ctx), 'user'),
        },
      ];

      // Test user with active elevation
      const elevatedUserContext: TimedUserContext = {
        ...baseContext,
        baseRole: 'user',
        elevatedRole: 'emergency_admin',
        elevationExpiry: new Date(Date.now() + 60000), // 1 minute from now
      };

      expect(evaluateAccess({
        rules,
        context: elevatedUserContext,
        action: 'execute',
        resource: 'emergency_functions',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: elevatedUserContext,
        action: 'access',
        resource: 'admin_panel',
      }).can).toBe(true);

      // Test user with expired elevation
      const expiredElevationContext: TimedUserContext = {
        ...baseContext,
        baseRole: 'user',
        elevatedRole: 'emergency_admin',
        elevationExpiry: new Date(Date.now() - 60000), // 1 minute ago
      };

      expect(evaluateAccess({
        rules,
        context: expiredElevationContext,
        action: 'execute',
        resource: 'emergency_functions',
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: expiredElevationContext,
        action: 'access',
        resource: 'admin_panel',
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: expiredElevationContext,
        action: 'view',
        resource: 'user_content',
      }).can).toBe(true);
    });
  });

  describe('dynamic role resolution', () => {
    it('should resolve roles based on record ownership', () => {
      interface OwnershipUserContext extends UserContext {
        baseRole: string;
      }

      const getDynamicRole = (ctx: OwnershipUserContext, record?: any): string => {
        // Elevate to owner role if user owns the record
        if (record && record.ownerId === ctx.userId) {
          return 'owner';
        }
        return ctx.baseRole;
      };

      const roleHierarchy = {
        owner: ['collaborator', 'viewer'],
        collaborator: ['viewer'],
        viewer: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'documents',
          action: 'read',
          condition: (ctx: OwnershipUserContext, record?: any) => 
            hasRole(getDynamicRole(ctx, record), 'viewer'),
        },
        {
          resource: 'documents',
          action: 'edit',
          condition: (ctx: OwnershipUserContext, record?: any) => 
            hasRole(getDynamicRole(ctx, record), 'collaborator'),
        },
        {
          resource: 'documents',
          action: 'delete',
          condition: (ctx: OwnershipUserContext, record?: any) => 
            hasRole(getDynamicRole(ctx, record), 'owner'),
        },
      ];

      const userContext: OwnershipUserContext = {
        ...baseContext,
        baseRole: 'viewer',
      };

      // Test with owned record (should get owner permissions)
      const ownedRecord = { ...baseRecord, ownerId: 'user_123' };

      expect(evaluateAccess({
        rules,
        context: userContext,
        action: 'read',
        resource: 'documents',
        record: ownedRecord,
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: userContext,
        action: 'edit',
        resource: 'documents',
        record: ownedRecord,
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: userContext,
        action: 'delete',
        resource: 'documents',
        record: ownedRecord,
      }).can).toBe(true);

      // Test with non-owned record (should get base permissions)
      const nonOwnedRecord = { ...baseRecord, ownerId: 'other_user' };

      expect(evaluateAccess({
        rules,
        context: userContext,
        action: 'read',
        resource: 'documents',
        record: nonOwnedRecord,
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: userContext,
        action: 'edit',
        resource: 'documents',
        record: nonOwnedRecord,
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: userContext,
        action: 'delete',
        resource: 'documents',
        record: nonOwnedRecord,
      }).can).toBe(false);
    });

    it('should support conditional role inheritance based on attributes', () => {
      interface AttributeUserContext extends UserContext {
        department: string;
        seniority: number;
        specializations: string[];
      }

      const getDynamicRole = (ctx: AttributeUserContext): string => {
        // Senior staff in engineering get elevated permissions
        if (ctx.department === 'engineering' && ctx.seniority >= 5) {
          return 'senior_engineer';
        }
        
        // Staff with security specialization get security permissions
        if (ctx.specializations.includes('security')) {
          return 'security_specialist';
        }
        
        // Department leads get management permissions
        if (ctx.seniority >= 8) {
          return 'department_lead';
        }

        return 'staff';
      };

      const roleHierarchy = {
        department_lead: ['senior_engineer', 'security_specialist', 'staff'],
        senior_engineer: ['staff'],
        security_specialist: ['staff'],
        staff: [],
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        if (userRole === requiredRole) return true;
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(requiredRole) || false;
      };

      const rules: PermissionRule[] = [
        {
          resource: 'code_repository',
          action: 'admin',
          condition: (ctx: AttributeUserContext) => 
            hasRole(getDynamicRole(ctx), 'senior_engineer'),
        },
        {
          resource: 'security_logs',
          action: 'access',
          condition: (ctx: AttributeUserContext) => 
            hasRole(getDynamicRole(ctx), 'security_specialist'),
        },
        {
          resource: 'department_reports',
          action: 'approve',
          condition: (ctx: AttributeUserContext) => 
            hasRole(getDynamicRole(ctx), 'department_lead'),
        },
      ];

      // Test senior engineer
      const seniorEngineerContext: AttributeUserContext = {
        ...baseContext,
        department: 'engineering',
        seniority: 6,
        specializations: ['backend', 'devops'],
      };

      expect(evaluateAccess({
        rules,
        context: seniorEngineerContext,
        action: 'admin',
        resource: 'code_repository',
      }).can).toBe(true);

      expect(evaluateAccess({
        rules,
        context: seniorEngineerContext,
        action: 'access',
        resource: 'security_logs',
      }).can).toBe(false);

      // Test security specialist
      const securitySpecialistContext: AttributeUserContext = {
        ...baseContext,
        department: 'security',
        seniority: 4,
        specializations: ['security', 'compliance'],
      };

      expect(evaluateAccess({
        rules,
        context: securitySpecialistContext,
        action: 'admin',
        resource: 'code_repository',
      }).can).toBe(false);

      expect(evaluateAccess({
        rules,
        context: securitySpecialistContext,
        action: 'access',
        resource: 'security_logs',
      }).can).toBe(true);

      // Test department lead (should inherit all permissions)
      const departmentLeadContext: AttributeUserContext = {
        ...baseContext,
        department: 'engineering',
        seniority: 10,
        specializations: ['management', 'strategy'],
      };

      expect(evaluateAccess({
        rules,
        context: departmentLeadContext,
        action: 'admin',
        resource: 'code_repository',
      }).can).toBe(false); // Not senior engineer due to lack of engineering seniority

      expect(evaluateAccess({
        rules,
        context: departmentLeadContext,
        action: 'approve',
        resource: 'department_reports',
      }).can).toBe(true);
    });
  });
});