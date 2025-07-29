/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import type { PermissionRule } from '@repo/auth-rbac';

describe('ABAC Attribute Matching Logic', () => {
  describe('exact attribute matching', () => {
    it('should match exact string values', () => {
      const rule: PermissionRule = {
        resource: 'documents',
        action: 'read',
        condition: (ctx, record) => {
          return ctx.department === 'engineering';
        },
      };

      expect(rule.condition({ department: 'engineering' }, null)).toBe(true);
      expect(rule.condition({ department: 'marketing' }, null)).toBe(false);
      expect(rule.condition({ department: 'Engineering' }, null)).toBe(false); // Case sensitive
    });

    it('should match exact numeric values', () => {
      const rule: PermissionRule = {
        resource: 'sensitive_data',
        action: 'access',
        condition: (ctx, record) => {
          return ctx.clearanceLevel === 5;
        },
      };

      expect(rule.condition({ clearanceLevel: 5 }, null)).toBe(true);
      expect(rule.condition({ clearanceLevel: 4 }, null)).toBe(false);
      expect(rule.condition({ clearanceLevel: '5' }, null)).toBe(false); // Type matters
    });

    it('should match exact boolean values', () => {
      const rule: PermissionRule = {
        resource: 'admin_panel',
        action: 'access',
        condition: (ctx, record) => {
          return ctx.isActive === true;
        },
      };

      expect(rule.condition({ isActive: true }, null)).toBe(true);
      expect(rule.condition({ isActive: false }, null)).toBe(false);
      expect(rule.condition({ isActive: 'true' }, null)).toBe(false); // Type matters
    });

    it('should match exact array values', () => {
      const rule: PermissionRule = {
        resource: 'project',
        action: 'modify',
        condition: (ctx, record) => {
          return JSON.stringify(ctx.roles) === JSON.stringify(['admin', 'editor']);
        },
      };

      expect(rule.condition({ roles: ['admin', 'editor'] }, null)).toBe(true);
      expect(rule.condition({ roles: ['editor', 'admin'] }, null)).toBe(false); // Order matters
      expect(rule.condition({ roles: ['admin'] }, null)).toBe(false);
    });
  });

  describe('pattern-based attribute matching', () => {
    it('should match string patterns with wildcards', () => {
      const matchesPattern = (value: string, pattern: string): boolean => {
        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        return new RegExp(`^${regexPattern}$`).test(value);
      };

      const rule: PermissionRule = {
        resource: 'emails',
        action: 'read',
        condition: (ctx, record) => {
          return matchesPattern(ctx.email, '*@company.com');
        },
      };

      expect(rule.condition({ email: 'john@company.com' }, null)).toBe(true);
      expect(rule.condition({ email: 'jane.doe@company.com' }, null)).toBe(true);
      expect(rule.condition({ email: 'contractor@external.com' }, null)).toBe(false);
    });

    it('should match string patterns with regex', () => {
      const rule: PermissionRule = {
        resource: 'user_data',
        action: 'view',
        condition: (ctx, record) => {
          const phonePattern = /^\+1-\d{3}-\d{3}-\d{4}$/;
          return phonePattern.test(ctx.phone);
        },
      };

      expect(rule.condition({ phone: '+1-555-123-4567' }, null)).toBe(true);
      expect(rule.condition({ phone: '+1-555-1234' }, null)).toBe(false);
      expect(rule.condition({ phone: '555-123-4567' }, null)).toBe(false);
    });

    it('should match numeric ranges', () => {
      const rule: PermissionRule = {
        resource: 'financial_data',
        action: 'approve',
        condition: (ctx, record) => {
          return ctx.salaryLevel >= 5 && ctx.salaryLevel <= 8;
        },
      };

      expect(rule.condition({ salaryLevel: 5 }, null)).toBe(true);
      expect(rule.condition({ salaryLevel: 7 }, null)).toBe(true);
      expect(rule.condition({ salaryLevel: 8 }, null)).toBe(true);
      expect(rule.condition({ salaryLevel: 4 }, null)).toBe(false);
      expect(rule.condition({ salaryLevel: 9 }, null)).toBe(false);
    });

    it('should match date ranges', () => {
      const rule: PermissionRule = {
        resource: 'time_sensitive_data',
        action: 'access',
        condition: (ctx, record) => {
          const userStartDate = new Date(ctx.startDate);
          const cutoffDate = new Date('2023-01-01');
          return userStartDate <= cutoffDate;
        },
      };

      expect(rule.condition({ startDate: '2022-06-15' }, null)).toBe(true);
      expect(rule.condition({ startDate: '2023-01-01' }, null)).toBe(true);
      expect(rule.condition({ startDate: '2023-06-15' }, null)).toBe(false);
    });
  });

  describe('set-based attribute matching', () => {
    it('should match array membership (contains)', () => {
      const rule: PermissionRule = {
        resource: 'project_files',
        action: 'edit',
        condition: (ctx, record) => {
          const allowedRoles = ['editor', 'admin', 'project_manager'];
          return allowedRoles.includes(ctx.role);
        },
      };

      expect(rule.condition({ role: 'editor' }, null)).toBe(true);
      expect(rule.condition({ role: 'admin' }, null)).toBe(true);
      expect(rule.condition({ role: 'viewer' }, null)).toBe(false);
    });

    it('should match array intersection (any common elements)', () => {
      const rule: PermissionRule = {
        resource: 'shared_documents',
        action: 'view',
        condition: (ctx, record) => {
          if (!record || !record.requiredSkills || !ctx.skills) return false;
          
          const userSkills = ctx.skills as string[];
          const requiredSkills = record.requiredSkills as string[];
          
          return requiredSkills.some(skill => userSkills.includes(skill));
        },
      };

      const context = { skills: ['javascript', 'python', 'sql'] };
      
      const frontendDoc = { requiredSkills: ['javascript', 'css'], id: 'frontend_doc' };
      const backendDoc = { requiredSkills: ['java', 'spring'], id: 'backend_doc' };
      const databaseDoc = { requiredSkills: ['sql', 'mongodb'], id: 'database_doc' };

      expect(rule.condition(context, frontendDoc)).toBe(true); // Has javascript
      expect(rule.condition(context, backendDoc)).toBe(false); // No intersection
      expect(rule.condition(context, databaseDoc)).toBe(true); // Has sql
    });

    it('should match array subset (all elements included)', () => {
      const rule: PermissionRule = {
        resource: 'secure_system',
        action: 'admin',
        condition: (ctx, record) => {
          const requiredPermissions = ['read', 'write', 'delete', 'admin'];
          const userPermissions = ctx.permissions as string[];
          
          if (!userPermissions) return false;
          
          return requiredPermissions.every(perm => userPermissions.includes(perm));
        },
      };

      const fullAccessContext = { permissions: ['read', 'write', 'delete', 'admin', 'audit'] };
      const partialAccessContext = { permissions: ['read', 'write'] };
      const noAccessContext = { permissions: [] };

      expect(rule.condition(fullAccessContext, null)).toBe(true);
      expect(rule.condition(partialAccessContext, null)).toBe(false);
      expect(rule.condition(noAccessContext, null)).toBe(false);
    });

    it('should match set operations (union, intersection, difference)', () => {
      const rule: PermissionRule = {
        resource: 'collaborative_project',
        action: 'contribute',
        condition: (ctx, record) => {
          if (!record || !record.projectTeams || !ctx.teams) return false;
          
          const userTeams = new Set(ctx.teams as string[]);
          const projectTeams = new Set(record.projectTeams as string[]);
          
          // User must be in at least one project team
          const intersection = new Set([...userTeams].filter(team => projectTeams.has(team)));
          
          return intersection.size > 0;
        },
      };

      const context = { teams: ['frontend', 'devops', 'qa'] };
      
      const frontendProject = { projectTeams: ['frontend', 'design'], id: 'frontend_proj' };
      const backendProject = { projectTeams: ['backend', 'database'], id: 'backend_proj' };
      const crossFunctionalProject = { projectTeams: ['frontend', 'backend', 'qa'], id: 'cross_proj' };

      expect(rule.condition(context, frontendProject)).toBe(true); // frontend intersection
      expect(rule.condition(context, backendProject)).toBe(false); // No intersection
      expect(rule.condition(context, crossFunctionalProject)).toBe(true); // Multiple intersections
    });
  });

  describe('hierarchical attribute matching', () => {
    it('should match organizational hierarchy', () => {
      const rule: PermissionRule = {
        resource: 'department_budget',
        action: 'view',
        condition: (ctx, record) => {
          if (!record) return false;
          
          // Build hierarchy path from context
          const hierarchy = ctx.orgPath as string;
          const resourcePath = record.orgPath as string;
          
          // Can access if resource is within user's hierarchy
          return resourcePath.startsWith(hierarchy);
        },
      };

      const managerContext = { orgPath: 'company/engineering/' };
      
      const teamBudget = { orgPath: 'company/engineering/frontend/', id: 'team_budget' };
      const departmentBudget = { orgPath: 'company/engineering/', id: 'dept_budget' };
      const otherDeptBudget = { orgPath: 'company/marketing/', id: 'other_budget' };

      expect(rule.condition(managerContext, teamBudget)).toBe(true);
      expect(rule.condition(managerContext, departmentBudget)).toBe(true);
      expect(rule.condition(managerContext, otherDeptBudget)).toBe(false);
    });

    it('should match role hierarchy with inheritance', () => {
      const roleHierarchy = {
        ceo: { level: 10, inherits: [] },
        cto: { level: 9, inherits: [] },
        director: { level: 8, inherits: [] },
        manager: { level: 6, inherits: ['director'] },
        senior: { level: 4, inherits: ['manager'] },
        junior: { level: 2, inherits: ['senior'] },
      };

      const hasRoleAccess = (userRole: string, requiredLevel: number): boolean => {
        const role = roleHierarchy[userRole as keyof typeof roleHierarchy];
        if (!role) return false;
        
        if (role.level >= requiredLevel) return true;
        
        // Check inherited roles
        return role.inherits.some(inheritedRole => 
          hasRoleAccess(inheritedRole, requiredLevel)
        );
      };

      const rule: PermissionRule = {
        resource: 'strategic_plans',
        action: 'edit',
        condition: (ctx, record) => {
          return hasRoleAccess(ctx.role, 8); // Director level or above
        },
      };

      expect(rule.condition({ role: 'ceo' }, null)).toBe(true);
      expect(rule.condition({ role: 'director' }, null)).toBe(true);
      expect(rule.condition({ role: 'manager' }, null)).toBe(true); // Inherits director
      expect(rule.condition({ role: 'senior' }, null)).toBe(true); // Inherits manager → director
      expect(rule.condition({ role: 'junior' }, null)).toBe(true); // Inherits senior → manager → director
    });

    it('should match geographic hierarchy', () => {
      const rule: PermissionRule = {
        resource: 'regional_reports',
        action: 'aggregate',
        condition: (ctx, record) => {
          if (!record) return false;
          
          const userRegion = ctx.region as string;
          const dataRegion = record.region as string;
          
          // Define geographic hierarchy
          const hierarchy = {
            'global': ['americas', 'emea', 'apac'],
            'americas': ['north-america', 'south-america'],
            'north-america': ['us', 'canada'],
            'us': ['us-west', 'us-east', 'us-central'],
          };

          const canAccess = (userReg: string, dataReg: string): boolean => {
            if (userReg === dataReg) return true;
            
            const subordinates = hierarchy[userReg as keyof typeof hierarchy];
            if (!subordinates) return false;
            
            return subordinates.some(sub => canAccess(sub, dataReg));
          };

          return canAccess(userRegion, dataRegion);
        },
      };

      const globalContext = { region: 'global' };
      const usContext = { region: 'us' };
      const westContext = { region: 'us-west' };

      const westRecord = { region: 'us-west', id: 'west_report' };
      const eastRecord = { region: 'us-east', id: 'east_report' };
      const canadaRecord = { region: 'canada', id: 'canada_report' };

      expect(rule.condition(globalContext, westRecord)).toBe(true); // Global can access all
      expect(rule.condition(usContext, westRecord)).toBe(true); // US can access US regions
      expect(rule.condition(usContext, canadaRecord)).toBe(false); // US cannot access Canada
      expect(rule.condition(westContext, westRecord)).toBe(true); // Same region
      expect(rule.condition(westContext, eastRecord)).toBe(false); // Different US regions
    });
  });

  describe('temporal attribute matching', () => {
    it('should match time-based access windows', () => {
      const rule: PermissionRule = {
        resource: 'maintenance_system',
        action: 'access',
        condition: (ctx, record) => {
          const now = new Date();
          const currentHour = now.getHours();
          const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
          
          // Maintenance window: weekdays 2-6 AM
          const isWeekday = currentDay >= 1 && currentDay <= 5;
          const isMaintenanceHour = currentHour >= 2 && currentHour < 6;
          const hasEmergencyAccess = ctx.emergencyAccess === true;
          
          return (isWeekday && isMaintenanceHour) || hasEmergencyAccess;
        },
      };

      // Mock current time for testing
      const originalDate = Date;
      
      // Tuesday 3 AM - should allow
      global.Date = class extends originalDate {
        constructor() { super('2024-01-02T03:00:00Z'); } // Tuesday
        getHours() { return 3; }
        getDay() { return 2; } // Tuesday
      } as any;

      expect(rule.condition({}, null)).toBe(true);

      // Sunday 3 AM - should deny (weekend)
      global.Date = class extends originalDate {
        constructor() { super('2024-01-07T03:00:00Z'); } // Sunday
        getHours() { return 3; }
        getDay() { return 0; } // Sunday
      } as any;

      expect(rule.condition({}, null)).toBe(false);

      // Tuesday 10 AM - should deny (outside window)
      global.Date = class extends originalDate {
        constructor() { super('2024-01-02T10:00:00Z'); } // Tuesday
        getHours() { return 10; }
        getDay() { return 2; } // Tuesday
      } as any;

      expect(rule.condition({}, null)).toBe(false);

      // Sunday 3 AM with emergency access - should allow
      global.Date = class extends originalDate {
        constructor() { super('2024-01-07T03:00:00Z'); } // Sunday
        getHours() { return 3; }
        getDay() { return 0; } // Sunday
      } as any;

      expect(rule.condition({ emergencyAccess: true }, null)).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });

    it('should match date-based validity periods', () => {
      const rule: PermissionRule = {
        resource: 'temporary_project',
        action: 'access',
        condition: (ctx, record) => {
          if (!record) return false;
          
          const now = new Date();
          const projectStart = new Date(record.startDate as string);
          const projectEnd = new Date(record.endDate as string);
          
          const isValidPeriod = now >= projectStart && now <= projectEnd;
          const isProjectMember = (record.members as string[] || []).includes(ctx.userId);
          const hasAdminOverride = ctx.role === 'admin';
          
          return isValidPeriod && (isProjectMember || hasAdminOverride);
        },
      };

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const memberContext = { userId: 'user_123', role: 'member' };
      const adminContext = { userId: 'admin_456', role: 'admin' };

      const activeProject = {
        startDate: yesterday.toISOString(),
        endDate: nextWeek.toISOString(),
        members: ['user_123', 'user_789'],
        id: 'active_project',
      };

      const expiredProject = {
        startDate: yesterday.toISOString(),
        endDate: yesterday.toISOString(),
        members: ['user_123', 'user_789'],
        id: 'expired_project',
      };

      const futureProject = {
        startDate: tomorrow.toISOString(),
        endDate: nextWeek.toISOString(),
        members: ['user_123', 'user_789'],
        id: 'future_project',
      };

      expect(rule.condition(memberContext, activeProject)).toBe(true);
      expect(rule.condition(memberContext, expiredProject)).toBe(false);
      expect(rule.condition(memberContext, futureProject)).toBe(false);
      expect(rule.condition(adminContext, expiredProject)).toBe(false); // Admin can't override time
    });

    it('should match age-based restrictions', () => {
      const rule: PermissionRule = {
        resource: 'age_restricted_content',
        action: 'view',
        condition: (ctx, record) => {
          if (!ctx.birthDate) return false;
          
          const birthDate = new Date(ctx.birthDate as string);
          const now = new Date();
          const ageInYears = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          
          const minAge = record?.minAge as number || 18;
          const hasParentalConsent = ctx.parentalConsent === true;
          
          return ageInYears >= minAge || (ageInYears >= 13 && hasParentalConsent);
        },
      };

      const adultContext = { birthDate: '1990-01-01' }; // 34 years old in 2024
      const minorContext = { birthDate: '2010-01-01' }; // 14 years old in 2024
      const minorWithConsentContext = { 
        birthDate: '2010-01-01', 
        parentalConsent: true 
      };
      const childContext = { birthDate: '2015-01-01' }; // 9 years old in 2024

      const adultContent = { minAge: 18, id: 'adult_content' };
      const teenContent = { minAge: 13, id: 'teen_content' };

      expect(rule.condition(adultContext, adultContent)).toBe(true);
      expect(rule.condition(adultContext, teenContent)).toBe(true);
      expect(rule.condition(minorContext, adultContent)).toBe(false);
      expect(rule.condition(minorContext, teenContent)).toBe(true);
      expect(rule.condition(minorWithConsentContext, adultContent)).toBe(true);
      expect(rule.condition(childContext, teenContent)).toBe(false);
    });
  });

  describe('complex attribute matching combinations', () => {
    it('should combine multiple matching strategies', () => {
      const rule: PermissionRule = {
        resource: 'complex_system',
        action: 'execute',
        condition: (ctx, record) => {
          if (!record) return false;
          
          // Geographic matching
          const sameRegion = ctx.region === record.region;
          
          // Set-based matching
          const hasRequiredSkill = (record.requiredSkills as string[] || [])
            .some(skill => (ctx.skills as string[] || []).includes(skill));
          
          // Hierarchical matching
          const sufficientLevel = (ctx.accessLevel as number || 0) >= (record.minAccessLevel as number || 0);
          
          // Pattern matching
          const validEmail = /^[^@]+@company\.com$/.test(ctx.email as string || '');
          
          // Temporal matching
          const now = new Date();
          const startTime = new Date(`${now.toDateString()} ${record.allowedStartTime}`);
          const endTime = new Date(`${now.toDateString()} ${record.allowedEndTime}`);
          const inTimeWindow = now >= startTime && now <= endTime;
          
          return sameRegion && hasRequiredSkill && sufficientLevel && validEmail && inTimeWindow;
        },
      };

      const context = {
        region: 'us-east',
        skills: ['python', 'sql', 'aws'],
        accessLevel: 7,
        email: 'john.doe@company.com',
      };

      const record = {
        region: 'us-east',
        requiredSkills: ['python', 'docker'],
        minAccessLevel: 5,
        allowedStartTime: '09:00:00',
        allowedEndTime: '17:00:00',
        id: 'complex_task',
      };

      // Mock time to be within window (12:00 PM)
      const originalDate = Date;
      global.Date = class extends originalDate {
        constructor() { super(); }
        static now() { return new Date('2024-01-02T12:00:00Z').getTime(); }
      } as any;

      expect(rule.condition(context, record)).toBe(true);

      // Test failure cases
      expect(rule.condition({ ...context, region: 'us-west' }, record)).toBe(false); // Wrong region
      expect(rule.condition({ ...context, skills: ['java'] }, record)).toBe(false); // No required skill
      expect(rule.condition({ ...context, accessLevel: 3 }, record)).toBe(false); // Insufficient level
      expect(rule.condition({ ...context, email: 'john@external.com' }, record)).toBe(false); // Wrong email domain

      // Restore Date
      global.Date = originalDate;
    });

    it('should handle conditional attribute matching', () => {
      const rule: PermissionRule = {
        resource: 'conditional_access',
        action: 'perform',
        condition: (ctx, record) => {
          if (!record) return false;
          
          const recordType = record.type as string;
          
          switch (recordType) {
            case 'financial':
              return (ctx.department === 'finance' || ctx.role === 'cfo') && 
                     (ctx.certifications as string[] || []).includes('cpa');
            
            case 'legal':
              return ctx.department === 'legal' && 
                     (ctx.barAdmissions as string[] || []).length > 0;
            
            case 'technical':
              return (ctx.department === 'engineering' || ctx.department === 'devops') &&
                     (ctx.yearsExperience as number || 0) >= 3;
            
            case 'hr':
              return ctx.department === 'hr' && 
                     (ctx.hrCertifications as string[] || []).includes('shrm');
            
            default:
              return ctx.role === 'admin'; // Default fallback
          }
        },
      };

      const financeContext = {
        department: 'finance',
        role: 'analyst',
        certifications: ['cpa', 'cfa'],
      };

      const legalContext = {
        department: 'legal',
        barAdmissions: ['ny', 'ca'],
      };

      const techContext = {
        department: 'engineering',
        yearsExperience: 5,
      };

      const hrContext = {
        department: 'hr',
        hrCertifications: ['shrm', 'hrci'],
      };

      const adminContext = {
        role: 'admin',
        department: 'admin',
      };

      expect(rule.condition(financeContext, { type: 'financial', id: 'fin_record' })).toBe(true);
      expect(rule.condition(legalContext, { type: 'legal', id: 'legal_record' })).toBe(true);
      expect(rule.condition(techContext, { type: 'technical', id: 'tech_record' })).toBe(true);
      expect(rule.condition(hrContext, { type: 'hr', id: 'hr_record' })).toBe(true);
      expect(rule.condition(adminContext, { type: 'unknown', id: 'unknown_record' })).toBe(true);

      // Test cross-department access failures
      expect(rule.condition(financeContext, { type: 'legal', id: 'legal_record' })).toBe(false);
      expect(rule.condition(techContext, { type: 'financial', id: 'fin_record' })).toBe(false);
    });
  });
});