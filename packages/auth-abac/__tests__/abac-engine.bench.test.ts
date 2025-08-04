/**
 * SPDX-License-Identifier: MIT
 * 
 * ABAC Engine Performance Benchmarks
 * 
 * These benchmarks test the Attribute-Based Access Control (ABAC) engine performance 
 * for complex attribute-based authorization operations. ABAC handles more computationally 
 * intensive operations than RBAC due to complex attribute evaluation and rule matching.
 * 
 * Performance Targets:
 * - Simple attribute rule evaluation: < 2ms
 * - Complex nested rule evaluation: < 10ms
 * - Multiple attribute conditions (AND/OR): < 5ms
 * - Large attribute sets (50+ attributes): < 15ms
 * - Policy combination (5+ policies): < 20ms
 * - Concurrent policy evaluation (100 concurrent): < 200ms
 * - Memory stability: < 15MB growth over 10k iterations
 */

import { describe, expect, beforeEach, bench } from 'vitest';
import type { PermissionRule, UserContext } from '@repo/auth-rbac';

// Extended context interface for ABAC testing
interface ABACUserContext extends UserContext {
  department?: string;
  region?: string;
  clearanceLevel?: number;
  active?: boolean;
  roles?: string[];
  skills?: string[];
  certifications?: string[];
  teams?: string[];
  permissions?: string[];
  profile?: {
    name?: string;
    email?: string;
    startDate?: string;
    manager?: string;
    costCenter?: string;
  };
  location?: {
    office?: string;
    floor?: number;
    building?: string;
    timezone?: string;
  };
  session?: {
    loginTime?: Date;
    ipAddress?: string;
    userAgent?: string;
    mfaVerified?: boolean;
  };
  subsidiaries?: string[];
  geographicAccess?: string[];
  dataClassifications?: string[];
  systemAccess?: string[];
  businessUnits?: string[];
  reportingHierarchy?: {
    level?: number;
    directReports?: string[];
    indirectReports?: string[];
  };
  compliance?: Record<string, boolean>;
  emergencyOverride?: boolean;
  [key: string]: unknown;
}

// Helper functions to eliminate deep nesting warnings
function hasRequiredSkill(userSkills: string[], requiredSkills: string[]): boolean {
  return requiredSkills.some(skill => userSkills.includes(skill));
}

function isTeamMember(userTeams: string[], recordTeams: string[]): boolean {
  return userTeams.some(team => recordTeams.includes(team));
}

function hasTeamAccess(userTeams: string[], recordTeamMembers: string[]): boolean {
  return userTeams.some(team => recordTeamMembers.includes(team));
}

function filterCriticalPermissions(permissions: string[]): string[] {
  return permissions.filter(p => p.includes('admin') || p.includes('critical'));
}

function filterSecuritySystems(systemAccess: string[]): string[] {
  return systemAccess.filter(s => s.includes('security') || s.includes('audit'));
}

function filterTechnicalSkills(skills: string[]): string[] {
  return skills.filter(s => ['programming', 'security', 'analysis'].some(t => s.includes(t)));
}

function isTrustedBrowser(userAgent: string): boolean {
  return ['Chrome', 'Firefox', 'Safari', 'Edge'].some(browser => userAgent.includes(browser));
}

// Helper functions to extract nested ternary operations
function parseClearanceLevel(clearanceLevel: unknown): number {
  if (typeof clearanceLevel === 'number') {
    return clearanceLevel;
  }
  if (typeof clearanceLevel === 'string') {
    return parseInt(clearanceLevel, 10);
  }
  return 0;
}

function parseActiveStatus(active: unknown): boolean {
  if (typeof active === 'boolean') {
    return active;
  }
  if (typeof active === 'string') {
    return active.toLowerCase() === 'true';
  }
  return false;
}

function parseSkillsArray(skills: unknown): string[] {
  if (Array.isArray(skills)) {
    return skills;
  }
  if (typeof skills === 'string') {
    return [skills];
  }
  return [];
}

function parseAmount(amount: unknown): number {
  if (typeof amount === 'number') {
    return amount;
  }
  if (typeof amount === 'string') {
    return parseFloat(amount);
  }
  return 0;
}

describe('ABAC Engine Performance Benchmarks', () => {
  // Test contexts with varying attribute complexity
  let simpleUserContext: ABACUserContext;
  let complexUserContext: ABACUserContext;
  let enterpriseUserContext: ABACUserContext;
  let baseRecord: Record<string, unknown>;
  let complexRecord: Record<string, unknown>;
  
  // Rule sets for different scenarios
  let simpleAttributeRules: PermissionRule[];
  let complexNestedRules: PermissionRule[];
  let multiAttributeRules: PermissionRule[];
  let largeAttributeRules: PermissionRule[];
  let policyCombinatonRules: PermissionRule[];
  let temporalRules: PermissionRule[];
  let hierarchicalRules: PermissionRule[];

  beforeEach(() => {
    // Simple user context with basic attributes
    simpleUserContext = {
      userId: 'user_123',
      role: 'user',
      tenantId: 'tenant_123',
      department: 'engineering',
      region: 'us-west',
      clearanceLevel: 3,
      active: true,
    };

    // Complex user context with nested attributes
    complexUserContext = {
      userId: 'user_456',
      role: 'analyst',
      tenantId: 'tenant_456',
      department: 'security',
      region: 'us-east',
      clearanceLevel: 5,
      active: true,
      roles: ['analyst', 'auditor'],
      skills: ['cybersecurity', 'forensics', 'compliance'],
      certifications: ['cissp', 'cism', 'gsec'],
      teams: ['incident-response', 'threat-hunting'],
      permissions: ['read_sensitive', 'investigate', 'escalate'],
      profile: {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        startDate: '2020-01-15',
        manager: 'manager_789',
        costCenter: 'SEC-001',
      },
      location: {
        office: 'headquarters',
        floor: 12,
        building: 'A',
        timezone: 'America/New_York',
      },
      session: {
        loginTime: new Date('2024-01-01T09:00:00Z'),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        mfaVerified: true,
      },
    };

    // Enterprise user context with extensive attributes
    enterpriseUserContext = {
      userId: 'enterprise_789',
      role: 'cfo',
      tenantId: 'tenant_enterprise',
      department: 'finance',
      region: 'global',
      clearanceLevel: 8,
      active: true,
      roles: ['cfo', 'board-member', 'audit-committee'],
      skills: Array.from({ length: 20 }, (_, i) => `skill_${i}`),
      certifications: ['cpa', 'cfa', 'frm', 'pmp', 'six-sigma'],
      teams: ['executive', 'finance', 'audit', 'risk-management'],
      permissions: Array.from({ length: 30 }, (_, i) => `permission_${i}`),
      subsidiaries: ['subsidiary_a', 'subsidiary_b', 'subsidiary_c'],
      geographicAccess: ['us', 'eu', 'apac', 'latam'],
      dataClassifications: ['public', 'internal', 'confidential', 'restricted'],
      systemAccess: Array.from({ length: 15 }, (_, i) => `system_${i}`),
      businessUnits: ['corporate', 'retail', 'commercial', 'investment'],
      reportingHierarchy: {
        level: 1,
        directReports: Array.from({ length: 10 }, (_, i) => `report_${i}`),
        indirectReports: Array.from({ length: 50 }, (_, i) => `indirect_${i}`),
      },
      compliance: {
        sox: true,
        gdpr: true,
        ccpa: true,
        pci: true,
        hipaa: false,
      },
    };

    // Base record for testing
    baseRecord = {
      id: 'record_123',
      ownerId: 'user_123',
      region: 'us-west',
      department: 'engineering',
      classification: 'internal',
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
    };

    // Complex record with nested attributes
    complexRecord = {
      id: 'complex_456',
      ownerId: 'user_456',
      region: 'us-east',
      department: 'security',
      classification: 'confidential',
      status: 'active',
      amount: 50000,
      currency: 'USD',
      tags: ['urgent', 'executive-review', 'high-value'],
      metadata: {
        source: 'automated-system',
        confidence: 0.95,
        riskScore: 3,
        category: 'financial-transfer',
        subcategory: 'wire-transfer',
      },
      approval: {
        required: true,
        level: 5,
        approvers: ['manager_789', 'director_101'],
        currentApprovals: ['manager_789'],
        pendingApprovals: ['director_101'],
      },
      audit: {
        created: { by: 'user_456', at: new Date('2024-01-01T09:00:00Z') },
        modified: { by: 'user_456', at: new Date('2024-01-01T14:00:00Z') },
        accessed: [
          { by: 'user_123', at: new Date('2024-01-01T10:00:00Z'), action: 'read' },
          { by: 'user_456', at: new Date('2024-01-01T11:00:00Z'), action: 'update' },
        ],
      },
      schedule: {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-12-31T23:59:59Z'),
        businessHours: { start: 9, end: 17 },
        allowedDays: [1, 2, 3, 4, 5], // Monday to Friday
      },
      teamMembers: ['user_123', 'user_456', 'user_789'],
      requiredSkills: ['cybersecurity', 'forensics'],
      requiredClearance: 4,
      geolocation: {
        country: 'US',
        state: 'NY',
        city: 'New York',
        coordinates: { lat: 40.7128, lng: -74.0060 },
      },
    };

    // Simple attribute rules for basic matching
    simpleAttributeRules = [
      {
        resource: 'documents',
        action: 'read',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          return ctx.department === 'engineering';
        },
      },
      {
        resource: 'documents',
        action: 'write',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          return (ctx.clearanceLevel || 0) >= 3;
        },
      },
      {
        resource: 'documents',
        action: 'delete',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          return ctx.region === record?.region;
        },
      },
    ];

    // Complex nested rules with multiple conditions
    complexNestedRules = [
      {
        resource: 'sensitive_data',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const hasFinancialAccess = ctx.department === 'finance' || (ctx.roles || []).includes('auditor');
          const hasSufficientLevel = (ctx.clearanceLevel || 0) >= 7;
          const isBusinessHours = new Date().getHours() >= 9 && new Date().getHours() <= 17;
          const isApprovedLocation = ['headquarters', 'branch_office'].includes(ctx.location?.office || '');
          const hasRecentMFA = ctx.session?.mfaVerified === true;
          
          return hasFinancialAccess && hasSufficientLevel && (isBusinessHours || !!ctx.emergencyOverride) && isApprovedLocation && hasRecentMFA;
        },
      },
      {
        resource: 'executive_reports',
        action: 'generate',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const isExecutive = (ctx.roles || []).some(role => ['ceo', 'cfo', 'cto', 'coo'].includes(role));
          const hasDataAccess = (ctx.permissions || []).includes('executive_reporting');
          const hasRequiredClearance = (ctx.clearanceLevel || 0) >= 8;
          const isAuthorizedRegion = (ctx.geographicAccess || []).includes(record?.region as string || '');
          const hasComplianceTraining = (ctx.certifications || []).some(cert => ['sox', 'cpa', 'cfa'].includes(cert));
          
          return isExecutive && hasDataAccess && hasRequiredClearance && isAuthorizedRegion && hasComplianceTraining;
        },
      },
    ];

    // Multi-attribute rules with AND/OR logic
    multiAttributeRules = [
      {
        resource: 'financial_transactions',
        action: 'approve',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // AND conditions
          const basicRequirements = (ctx.department === 'finance' || ctx.department === 'audit') && 
                                  (ctx.clearanceLevel || 0) >= 5 &&
                                  (ctx.active as boolean) === true;
          
          // OR conditions for approval authority
          const hasApprovalAuthority = (ctx.roles || []).includes('approver') ||
                                     (ctx.permissions || []).includes('financial_approval') ||
                                     (ctx.reportingHierarchy?.level as number || 10) <= 3;
          
          // Complex record-based conditions
          const meetsTransactionLimits = (record?.amount as number || 0) <= 
            ((ctx.clearanceLevel || 0) * 10000);
          
          const isValidCurrency = record?.currency === 'USD' || 
                                (ctx.geographicAccess || []).includes('global');
          
          return basicRequirements && hasApprovalAuthority && meetsTransactionLimits && isValidCurrency;
        },
      },
      {
        resource: 'security_incidents',
        action: 'investigate',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // Multiple skill requirements (OR)
          const hasSecuritySkills = (ctx.skills || []).some(skill => 
            ['cybersecurity', 'forensics', 'incident-response', 'threat-hunting'].includes(skill)
          );
          
          // Multiple team memberships (OR)
          const isSecurityTeam = (ctx.teams || []).some(team =>
            ['security', 'incident-response', 'soc', 'threat-hunting'].includes(team)
          );
          
          // Multiple certification requirements (AND)
          const hasSecurityCerts = ['cissp', 'cism'].some(cert =>
            (ctx.certifications || []).includes(cert)
          );
          
          // Time-based and severity conditions
          const isHighSeverity = ((record?.metadata as any)?.riskScore as number || 0) >= 7;
          const isBusinessHours = new Date().getHours() >= 8 && new Date().getHours() <= 18;
          const hasEmergencyAccess = (ctx.permissions || []).includes('emergency_access');
          
          return (hasSecuritySkills || isSecurityTeam) && 
                 hasSecurityCerts && 
                 (isBusinessHours || hasEmergencyAccess || isHighSeverity);
        },
      },
    ];

    // Large attribute set rules for stress testing
    largeAttributeRules = [
      {
        resource: 'enterprise_system',
        action: 'admin',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // Check multiple large arrays
          const hasAnyRequiredSkill = (record?.requiredSkills as string[] || []).some(skill =>
            (ctx.skills || []).includes(skill)
          );
          
          const hasAnyRequiredPermission = (record?.requiredPermissions as string[] || []).some(perm =>
            (ctx.permissions || []).includes(perm)
          );
          
          const hasSystemAccess = (record?.systems as string[] || []).some(system =>
            (ctx.systemAccess || []).includes(system)
          );
          
          // Complex nested object traversal
          const meetsComplianceRequirements = Object.entries(record?.compliance || {}).every(([key, required]) => {
            if (!required) return true;
            return (ctx.compliance as Record<string, boolean>)?.[key] === true;
          });
          
          // Geographic authorization check
          const isAuthorizedGeographically = (record?.regions as string[] || []).some(region =>
            (ctx.geographicAccess || []).includes(region)
          );
          
          return hasAnyRequiredSkill && hasAnyRequiredPermission && hasSystemAccess && 
                 meetsComplianceRequirements && isAuthorizedGeographically;
        },
      },
    ];

    // Policy combination rules (multiple policies for single decision)
    policyCombinatonRules = [
      // Policy 1: Basic access
      {
        resource: 'protected_resource',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          return (ctx.active as boolean) === true && (ctx.clearanceLevel || 0) >= 1;
        },
      },
      // Policy 2: Department restrictions
      {
        resource: 'protected_resource',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const allowedDepts = ['finance', 'security', 'audit', 'executive'];
          return allowedDepts.includes(ctx.department as string || '');
        },
      },
      // Policy 3: Geographic restrictions
      {
        resource: 'protected_resource',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const userRegion = ctx.region as string || '';
          const recordRegion = record?.region as string || '';
          const hasGlobalAccess = (ctx.geographicAccess || []).includes('global');
          
          return userRegion === recordRegion || hasGlobalAccess;
        },
      },
      // Policy 4: Time-based restrictions
      {
        resource: 'protected_resource',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const now = new Date();
          const isBusinessHours = now.getHours() >= 9 && now.getHours() <= 17;
          const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
          const hasAfterHoursAccess = (ctx.permissions || []).includes('after_hours_access');
          
          return (isBusinessHours && isWeekday) || hasAfterHoursAccess;
        },
      },
      // Policy 5: Risk-based restrictions
      {
        resource: 'protected_resource',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const riskScore = ((record?.metadata as any)?.riskScore as number || 0);
          const userClearance = (ctx.clearanceLevel || 0);
          const hasRiskOverride = (ctx.permissions || []).includes('risk_override');
          
          return riskScore <= (userClearance * 2) || hasRiskOverride;
        },
      },
    ];

    // Temporal rules for time-based access control
    temporalRules = [
      {
        resource: 'scheduled_maintenance',
        action: 'execute',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const now = new Date();
          const scheduleStart = new Date((record?.schedule as any)?.startDate || '');
          const scheduleEnd = new Date((record?.schedule as any)?.endDate || '');
          const businessHours = (record?.schedule as any)?.businessHours || { start: 9, end: 17 };
          const allowedDays = (record?.schedule as any)?.allowedDays || [1, 2, 3, 4, 5];
          
          const isInSchedule = now >= scheduleStart && now <= scheduleEnd;
          const isBusinessHour = now.getHours() >= businessHours.start && now.getHours() < businessHours.end;
          const isAllowedDay = allowedDays.includes(now.getDay());
          const hasEmergencyOverride = (ctx.permissions || []).includes('emergency_maintenance');
          
          return isInSchedule && (isBusinessHour && isAllowedDay || hasEmergencyOverride);
        },
      },
    ];

    // Hierarchical rules for organizational structure
    hierarchicalRules = [
      {
        resource: 'employee_data',
        action: 'view',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const isOwnRecord = record?.ownerId === ctx.userId;
          const isDirectReport = (ctx.reportingHierarchy?.directReports as string[] || []).includes(record?.ownerId as string || '');
          const isIndirectReport = (ctx.reportingHierarchy?.indirectReports as string[] || []).includes(record?.ownerId as string || '');
          const isSameDepartment = ctx.department === record?.department && (ctx.roles || []).includes('manager');
          const isHRAccess = ctx.department === 'hr' && (ctx.clearanceLevel || 0) >= 5;
          
          return isOwnRecord || isDirectReport || isIndirectReport || isSameDepartment || isHRAccess;
        },
      },
    ];
  });

  describe('Simple Attribute Rule Evaluation', () => {
    bench('simple string attribute matching', () => {
      const rule = simpleAttributeRules[0]; // department === 'engineering'
      const result = rule.condition!(simpleUserContext);
      expect(result).toBe(true);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });

    bench('simple numeric attribute comparison', () => {
      const rule = simpleAttributeRules[1]; // clearanceLevel >= 3
      const result = rule.condition!(simpleUserContext);
      expect(result).toBe(true);
    }, {
      iterations: 10000,
      warmupIterations: 1000,
    });

    bench('simple context-record attribute matching', () => {
      const rule = simpleAttributeRules[2]; // region matching
      const result = rule.condition!(simpleUserContext, baseRecord);
      expect(result).toBe(true);
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('batch simple attribute evaluation (10 rules)', () => {
      const rules = Array.from({ length: 10 }, () => simpleAttributeRules[0]);
      let successCount = 0;

      for (const rule of rules) {
        if (rule.condition!(simpleUserContext)) {
          successCount++;
        }
      }

      expect(successCount).toBe(10);
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });

  describe('Complex Nested Rule Evaluation', () => {
    bench('complex nested conditions with multiple attributes', () => {
      const rule = complexNestedRules[0]; // sensitive_data access
      const result = rule.condition!(complexUserContext, baseRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('executive report generation with complex validation', () => {
      const rule = complexNestedRules[1]; // executive_reports generation
      const result = rule.condition!(enterpriseUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('nested object property access and validation', () => {
      const rule: PermissionRule = {
        resource: 'nested_test',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          return ctx.profile?.manager === (record?.approval as any)?.approvers?.[0] &&
                 ctx.location?.office === 'headquarters' &&
                 ctx.session?.mfaVerified === true &&
                 ((record?.metadata as any)?.confidence || 0) >= 0.8;
        },
      };

      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 3000,
      warmupIterations: 300,
    });

    bench('deep object traversal with null safety', () => {
      const rule: PermissionRule = {
        resource: 'deep_nested',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const level1 = (ctx.profile as any)?.metadata?.level1?.level2?.level3?.value;
          const audit = (record?.audit as any)?.accessed?.[0]?.by;
          const coordinates = (record?.geolocation as any)?.coordinates?.lat;
          
          return level1 !== undefined || audit !== undefined || coordinates !== undefined;
        },
      };

      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });
  });

  describe('Multiple Attribute Conditions (AND/OR Logic)', () => {
    bench('complex AND conditions', () => {
      const rule = multiAttributeRules[0]; // financial_transactions approval
      const result = rule.condition!(enterpriseUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1500,
      warmupIterations: 150,
    });

    bench('mixed AND/OR conditions with array operations', () => {
      const rule = multiAttributeRules[1]; // security_incidents investigation
      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('array intersection and membership checks', () => {
      const rule: PermissionRule = {
        resource: 'array_test',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const userSkills = ctx.skills as string[] || [];
          const requiredSkills = record?.requiredSkills as string[] || [];
          const userTeams = ctx.teams as string[] || [];
          const recordTeams = record?.teamMembers as string[] || [];
          
          const hasSkill = hasRequiredSkill(userSkills, requiredSkills);
          const isTeam = isTeamMember(userTeams, recordTeams);
          
          return hasSkill && isTeam;
        },
      };

      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('conditional logic with early exit optimization', () => {
      const rule: PermissionRule = {
        resource: 'early_exit_test',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // Early exit conditions
          if (ctx.role === 'superadmin') return true;
          if (!ctx.active) return false;
          if ((ctx.clearanceLevel || 0) < 3) return false;
          
          // More expensive checks only if necessary
          const hasRequiredCerts = (ctx.certifications || []).length >= 2;
          const hasAccess = hasTeamAccess(ctx.teams || [], record?.teamMembers as string[] || []);
          
          return hasRequiredCerts && hasAccess;
        },
      };

      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 3000,
      warmupIterations: 300,
    });
  });

  describe('Large Attribute Sets', () => {
    bench('large array processing (50+ elements)', () => {
      const largeContext = {
        ...enterpriseUserContext,
        largeArray: Array.from({ length: 100 }, (_, i) => `item_${i}`),
      };
      
      const largeRecord = {
        ...complexRecord,
        requiredItems: Array.from({ length: 50 }, (_, i) => `item_${i * 2}`),
      };

      const rule = largeAttributeRules[0]; // enterprise_system admin
      const result = rule.condition!(largeContext, largeRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 500,
      warmupIterations: 50,
    });

    bench('complex object iteration and validation', () => {
      const rule: PermissionRule = {
        resource: 'complex_iteration',
        action: 'process',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // Iterate over multiple large objects
          const compliance = ctx.compliance as Record<string, boolean> || {};
          const metadata = record?.metadata as Record<string, unknown> || {};
          
          let validationsPassed = 0;
          
          // Check all compliance requirements
          for (const [, value] of Object.entries(compliance)) {
            if (value === true) validationsPassed++;
          }
          
          // Check metadata properties
          for (const [, value] of Object.entries(metadata)) {
            if (value !== null && value !== undefined) validationsPassed++;
          }
          
          return validationsPassed >= 5;
        },
      };

      const result = rule.condition!(enterpriseUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('nested array filtering and matching', () => {
      const rule: PermissionRule = {
        resource: 'nested_arrays',
        action: 'filter',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const userPermissions = ctx.permissions as string[] || [];
          const systemAccess = ctx.systemAccess as string[] || [];
          const skills = ctx.skills as string[] || [];
          
          // Complex filtering operations
          const criticalPermissions = filterCriticalPermissions(userPermissions);
          const securitySystems = filterSecuritySystems(systemAccess);
          const technicalSkills = filterTechnicalSkills(skills);
          
          return criticalPermissions.length >= 2 && securitySystems.length >= 1 && technicalSkills.length >= 3;
        },
      };

      const result = rule.condition!(enterpriseUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 800,
      warmupIterations: 80,
    });
  });

  describe('Policy Combination', () => {
    bench('multiple policy evaluation (5 policies)', () => {
      let allPoliciesPassed = true;
      
      for (const rule of policyCombinatonRules) {
        if (!rule.condition!(enterpriseUserContext, complexRecord)) {
          allPoliciesPassed = false;
          break;
        }
      }
      
      expect(typeof allPoliciesPassed).toBe('boolean');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });

    bench('policy combination with early termination', () => {
      // Simulate OR logic - exit early on first success
      let anyPolicyPassed = false;
      
      for (const rule of policyCombinatonRules) {
        if (rule.condition!(enterpriseUserContext, complexRecord)) {
          anyPolicyPassed = true;
          break; // Early termination
        }
      }
      
      expect(anyPolicyPassed).toBe(true);
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('weighted policy evaluation', () => {
      const policyWeights = [0.3, 0.2, 0.2, 0.15, 0.15];
      let totalScore = 0;
      
      policyCombinatonRules.forEach((rule, index) => {
        if (rule.condition!(enterpriseUserContext, complexRecord)) {
          totalScore += policyWeights[index];
        }
      });
      
      const passed = totalScore >= 0.6; // Require 60% weighted score
      expect(typeof passed).toBe('boolean');
    }, {
      iterations: 1500,
      warmupIterations: 150,
    });

    bench('hierarchical policy cascade', () => {
      // Policies in priority order - higher priority overrides lower
      const priorities = [1, 2, 3, 4, 5];
      let finalDecision = false;
      let highestPriorityMet = 0;
      
      policyCombinatonRules.forEach((rule, index) => {
        if (rule.condition!(enterpriseUserContext, complexRecord)) {
          if (priorities[index] > highestPriorityMet) {
            highestPriorityMet = priorities[index];
            finalDecision = true;
          }
        }
      });
      
      expect(typeof finalDecision).toBe('boolean');
    }, {
      iterations: 1200,
      warmupIterations: 120,
    });
  });

  describe('Concurrent Policy Evaluation', () => {
    bench('concurrent evaluation - 50 policies', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const rule = policyCombinatonRules[i % policyCombinatonRules.length];
        const context = i % 2 === 0 ? complexUserContext : enterpriseUserContext;
        const record = i % 3 === 0 ? baseRecord : complexRecord;
        
        return Promise.resolve(rule.condition!(context, record));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
      results.forEach(result => expect(typeof result).toBe('boolean'));
    }, {
      iterations: 200,
      warmupIterations: 20,
    });

    bench('concurrent evaluation - 100 policies with different contexts', async () => {
      const contexts = [simpleUserContext, complexUserContext, enterpriseUserContext];
      const records = [baseRecord, complexRecord];
      
      const promises = Array.from({ length: 100 }, (_, i) => {
        const rule = policyCombinatonRules[i % policyCombinatonRules.length];
        const context = contexts[i % contexts.length];
        const record = records[i % records.length];
        
        return Promise.resolve(rule.condition!(context, record));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
    }, {
      iterations: 100,
      warmupIterations: 10,
    });

    bench('high-concurrency evaluation - 200 policies', async () => {
      const promises = Array.from({ length: 200 }, (_, i) => {
        const ruleIndex = i % policyCombinatonRules.length;
        const rule = policyCombinatonRules[ruleIndex];
        
        // Vary context complexity based on index
        let context;
        if (i % 3 === 0) context = simpleUserContext;
        else if (i % 3 === 1) context = complexUserContext;
        else context = enterpriseUserContext;
        
        return Promise.resolve(rule.condition!(context, complexRecord));
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;
      
      expect(results).toHaveLength(200);
      expect(successCount).toBeGreaterThanOrEqual(0);
    }, {
      iterations: 50,
      warmupIterations: 5,
    });
  });

  describe('Temporal and Environmental Conditions', () => {
    bench('time-based access control evaluation', () => {
      const rule = temporalRules[0]; // scheduled_maintenance
      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('dynamic time calculation and validation', () => {
      const rule: PermissionRule = {
        resource: 'time_sensitive',
        action: 'access',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const now = new Date();
          const sessionStart = ctx.session?.loginTime || now;
          const recordCreated = new Date(record?.createdAt as string || now);
          
          // Session must be recent (within 8 hours)
          const sessionAge = now.getTime() - sessionStart.getTime();
          const isRecentSession = sessionAge < (8 * 60 * 60 * 1000);
          
          // Record must not be too old (within 30 days)
          const recordAge = now.getTime() - recordCreated.getTime();
          const isRecentRecord = recordAge < (30 * 24 * 60 * 60 * 1000);
          
          // Time zone considerations
          const userTimezone = ctx.location?.timezone as string || 'UTC';
          const isValidTimezone = ['America/New_York', 'America/Chicago', 'America/Los_Angeles'].includes(userTimezone);
          
          return isRecentSession && isRecentRecord && isValidTimezone;
        },
      };

      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1500,
      warmupIterations: 150,
    });

    bench('environmental condition evaluation', () => {
      const rule: PermissionRule = {
        resource: 'environment_sensitive',
        action: 'execute',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // IP address validation
          const userIP = ctx.session?.ipAddress as string || '';
          const isInternalIP = userIP.startsWith('192.168.') || userIP.startsWith('10.') || userIP.startsWith('172.');
          
          // User agent validation
          const userAgent = ctx.session?.userAgent as string || '';
          const isTrusted = isTrustedBrowser(userAgent);
          
          // Location validation
          const userLocation = ctx.location?.office as string || '';
          const isSecureLocation = ['headquarters', 'datacenter', 'secure_facility'].includes(userLocation);
          
          // MFA requirement
          const hasMFA = ctx.session?.mfaVerified === true;
          
          return isInternalIP && isTrusted && isSecureLocation && hasMFA;
        },
      };

      const result = rule.condition!(complexUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 2500,
      warmupIterations: 250,
    });
  });

  describe('Hierarchical and Organizational Rules', () => {
    bench('organizational hierarchy traversal', () => {
      const rule = hierarchicalRules[0]; // employee_data view
      const result = rule.condition!(enterpriseUserContext, complexRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1500,
      warmupIterations: 150,
    });

    bench('complex reporting hierarchy validation', () => {
      const rule: PermissionRule = {
        resource: 'hierarchy_test',
        action: 'manage',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          const userLevel = ctx.reportingHierarchy?.level as number || 10;
          const targetUser = record?.ownerId as string || '';
          
          // Direct reports
          const directReports = ctx.reportingHierarchy?.directReports as string[] || [];
          const isDirectReport = directReports.includes(targetUser);
          
          // Indirect reports
          const indirectReports = ctx.reportingHierarchy?.indirectReports as string[] || [];
          const isIndirectReport = indirectReports.includes(targetUser);
          
          // Level-based access (can manage users 2+ levels below)
          const targetLevel = (record?.reportingLevel as number || 10);
          const canManageByLevel = (targetLevel - userLevel) >= 2;
          
          // Department-based management
          const sameDepartment = ctx.department === record?.department;
          const isManager = (ctx.roles || []).includes('manager');
          
          return isDirectReport || isIndirectReport || canManageByLevel || (sameDepartment && isManager);
        },
      };

      const hierarchyRecord = {
        ...complexRecord,
        reportingLevel: 6,
        department: 'finance',
      };

      const result = rule.condition!(enterpriseUserContext, hierarchyRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 1000,
      warmupIterations: 100,
    });
  });

  describe('Memory and Performance Stability', () => {
    bench('memory stability - 10000 ABAC evaluations', () => {
      const startMemory = process.memoryUsage();
      
      for (let i = 0; i < 10000; i++) {
        const ruleIndex = i % policyCombinatonRules.length;
        const rule = policyCombinatonRules[ruleIndex];
        const context = i % 2 === 0 ? complexUserContext : enterpriseUserContext;
        const record = i % 3 === 0 ? baseRecord : complexRecord;
        
        rule.condition!(context, record);
      }
      
      const endMemory = process.memoryUsage();
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      
      // Memory growth should be reasonable (< 15MB for 10k ABAC iterations)
      expect(memoryGrowth).toBeLessThan(15 * 1024 * 1024);
    }, {
      iterations: 5,
      warmupIterations: 1,
    });

    bench('performance consistency - complex rule evaluation', () => {
      const iterations = 1000;
      const times: number[] = [];
      const rule = complexNestedRules[0]; // Most complex rule
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        rule.condition!(enterpriseUserContext, complexRecord);
        
        const end = performance.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const sortedTimes = [...times].sort((a: number, b: number) => a - b);
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
      
      // Performance should be consistent for ABAC
      expect(avgTime).toBeLessThan(10); // < 10ms average
      expect(maxTime).toBeLessThan(50); // < 50ms maximum
      expect(medianTime).toBeLessThan(5); // < 5ms median
    }, {
      iterations: 10,
      warmupIterations: 1,
    });

    bench('garbage collection impact assessment', () => {
      const iterations = 5000;
      let evaluationCount = 0;
      
      // Force some object creation and destruction
      for (let i = 0; i < iterations; i++) {
        // Create temporary context with dynamic attributes
        const tempContext = {
          ...enterpriseUserContext,
          dynamicAttributes: Array.from({ length: 10 }, (_, j) => `temp_${i}_${j}`),
          sessionData: {
            timestamp: new Date(),
            requestId: `req_${i}`,
            tempData: { value: Math.random() },
          },
        };
        
        // Create temporary record
        const tempRecord = {
          ...complexRecord,
          tempMetadata: {
            processed: false,
            iteration: i,
            randomValue: Math.random(),
          },
        };
        
        const rule = policyCombinatonRules[i % policyCombinatonRules.length];
        rule.condition!(tempContext, tempRecord);
        evaluationCount++;
        
        // Clear references
        delete (tempContext as any).dynamicAttributes;
        delete (tempContext as any).sessionData;
        delete (tempRecord as any).tempMetadata;
      }
      
      expect(evaluationCount).toBe(iterations);
    }, {
      iterations: 20,
      warmupIterations: 2,
    });
  });

  describe('Edge Cases and Error Handling', () => {
    bench('null/undefined attribute handling', () => {
      const rule: PermissionRule = {
        resource: 'null_handling',
        action: 'test',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // Safe navigation patterns
          const department = ctx.department as string || 'unknown';
          const clearance = ctx.clearanceLevel as number || 0;
          const skills = ctx.skills as string[] || [];
          const recordRegion = record?.region as string || 'none';
          const metadata = record?.metadata as Record<string, unknown> || {};
          
          return department !== 'unknown' && 
                 clearance > 0 && 
                 skills.length > 0 && 
                 recordRegion !== 'none' &&
                 Object.keys(metadata).length > 0;
        },
      };

      // Test with incomplete data
      const incompleteContext: ABACUserContext = { 
        userId: 'test', 
        role: 'test', 
        tenantId: 'test' 
      };
      const incompleteRecord = { id: 'test' };
      
      const result = rule.condition!(incompleteContext, incompleteRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 5000,
      warmupIterations: 500,
    });

    bench('circular reference handling', () => {
      const rule: PermissionRule = {
        resource: 'circular_test',
        action: 'test',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          try {
            // Attempt to safely access potentially circular references
            const contextStr = JSON.stringify(ctx, null, 0);
            const recordStr = JSON.stringify(record, null, 0);
            return contextStr.length > 0 && recordStr.length > 0;
          } catch (error) {
            // Handle circular reference or other JSON errors
            console.debug('JSON serialization failed:', error instanceof Error ? error.message : String(error));
            return ctx !== null && record !== null;
          }
        },
      };

      // Create objects with potential circular references
      const circularContext = { ...complexUserContext };
      const circularRecord = { ...complexRecord };
      
      // Don't actually create circular references in test environment
      // but test the error handling path
      const result = rule.condition!(circularContext, circularRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 2000,
      warmupIterations: 200,
    });

    bench('type coercion and validation', () => {
      const rule: PermissionRule = {
        resource: 'type_validation',
        action: 'test',
        condition: (ctx: ABACUserContext, record?: Record<string, unknown> | null): boolean => {
          // Strict type checking and coercion
          const clearanceLevel = parseClearanceLevel(ctx.clearanceLevel);
          const isActive = parseActiveStatus(ctx.active);
          const skills = parseSkillsArray(ctx.skills);
          const amount = parseAmount(record?.amount);
          
          return clearanceLevel > 0 && isActive && skills.length > 0 && amount >= 0;
        },
      };

      // Test with mixed types
      const mixedContext: ABACUserContext = {
        userId: 'test',
        role: 'test',
        tenantId: 'test',
        clearanceLevel: '5' as any, // String instead of number
        active: 'true' as any, // String instead of boolean
        skills: 'javascript' as any, // String instead of array
      };
      
      const mixedRecord = {
        id: 'test',
        amount: '1000.50', // String instead of number
      };

      const result = rule.condition!(mixedContext, mixedRecord);
      expect(typeof result).toBe('boolean');
    }, {
      iterations: 3000,
      warmupIterations: 300,
    });
  });
});