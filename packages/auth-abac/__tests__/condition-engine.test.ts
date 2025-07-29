/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import type { PermissionRule } from '@repo/auth-rbac';

describe('ABAC Condition Evaluation Engine', () => {
  describe('attribute-based conditions', () => {
    it('should evaluate single attribute conditions', () => {
      const rule: PermissionRule = {
        resource: 'documents',
        action: 'read',
        condition: (ctx, record) => {
          return ctx.department === 'engineering';
        },
      };

      const engineeringContext = { department: 'engineering', userId: 'user_1' };
      const salesContext = { department: 'sales', userId: 'user_2' };

      expect(rule.condition(engineeringContext, null)).toBe(true);
      expect(rule.condition(salesContext, null)).toBe(false);
    });

    it('should evaluate multiple attribute conditions with AND logic', () => {
      const rule: PermissionRule = {
        resource: 'sensitive_data',
        action: 'access',
        condition: (ctx, record) => {
          return ctx.department === 'security' && 
                 ctx.clearanceLevel >= 4 && 
                 ctx.active === true;
        },
      };

      const validContext = {
        department: 'security',
        clearanceLevel: 5,
        active: true,
        userId: 'user_security',
      };

      const invalidDepartment = {
        department: 'marketing',
        clearanceLevel: 5,
        active: true,
        userId: 'user_marketing',
      };

      const invalidClearance = {
        department: 'security',
        clearanceLevel: 2,
        active: true,
        userId: 'user_low_clearance',
      };

      const inactiveUser = {
        department: 'security',
        clearanceLevel: 5,
        active: false,
        userId: 'user_inactive',
      };

      expect(rule.condition(validContext, null)).toBe(true);
      expect(rule.condition(invalidDepartment, null)).toBe(false);
      expect(rule.condition(invalidClearance, null)).toBe(false);
      expect(rule.condition(inactiveUser, null)).toBe(false);
    });

    it('should evaluate multiple attribute conditions with OR logic', () => {
      const rule: PermissionRule = {
        resource: 'emergency_system',
        action: 'activate',
        condition: (ctx, record) => {
          return ctx.role === 'admin' || 
                 ctx.emergencyContact === true || 
                 ctx.onCallStatus === 'primary';
        },
      };

      const adminContext = { role: 'admin', userId: 'admin_user' };
      const emergencyContact = { 
        role: 'user', 
        emergencyContact: true, 
        userId: 'emergency_user' 
      };
      const onCallPrimary = { 
        role: 'user', 
        onCallStatus: 'primary', 
        userId: 'oncall_user' 
      };
      const regularUser = { 
        role: 'user', 
        emergencyContact: false, 
        onCallStatus: 'backup', 
        userId: 'regular_user' 
      };

      expect(rule.condition(adminContext, null)).toBe(true);
      expect(rule.condition(emergencyContact, null)).toBe(true);
      expect(rule.condition(onCallPrimary, null)).toBe(true);
      expect(rule.condition(regularUser, null)).toBe(false);
    });

    it('should evaluate complex nested conditions', () => {
      const rule: PermissionRule = {
        resource: 'financial_records',
        action: 'audit',
        condition: (ctx, record) => {
          const hasFinancialAccess = ctx.department === 'finance' || ctx.role === 'auditor';
          const hasSufficientLevel = ctx.accessLevel >= 7;
          const isBusinessHours = ctx.currentHour >= 9 && ctx.currentHour <= 17;
          const isApprovedLocation = ['headquarters', 'branch_office'].includes(ctx.location);

          return hasFinancialAccess && hasSufficientLevel && (isBusinessHours || ctx.emergencyOverride) && isApprovedLocation;
        },
      };

      const validBusinessHours = {
        department: 'finance',
        accessLevel: 8,
        currentHour: 14,
        location: 'headquarters',
        userId: 'finance_user',
      };

      const validEmergencyOverride = {
        department: 'finance',
        accessLevel: 8,
        currentHour: 22, // After hours
        location: 'headquarters',
        emergencyOverride: true,
        userId: 'emergency_finance',
      };

      const invalidLocation = {
        department: 'finance',
        accessLevel: 8,
        currentHour: 14,
        location: 'home_office',
        userId: 'remote_finance',
      };

      const invalidAccessLevel = {
        department: 'finance',
        accessLevel: 5,
        currentHour: 14,
        location: 'headquarters',
        userId: 'junior_finance',
      };

      expect(rule.condition(validBusinessHours, null)).toBe(true);
      expect(rule.condition(validEmergencyOverride, null)).toBe(true);
      expect(rule.condition(invalidLocation, null)).toBe(false);
      expect(rule.condition(invalidAccessLevel, null)).toBe(false);
    });
  });

  describe('record-based conditions', () => {
    it('should evaluate conditions based on record attributes', () => {
      const rule: PermissionRule = {
        resource: 'projects',
        action: 'modify',
        condition: (ctx, record) => {
          if (!record) return false;
          return record.status === 'draft' || record.ownerId === ctx.userId;
        },
      };

      const context = { userId: 'user_123', role: 'editor' };
      const draftRecord = { status: 'draft', ownerId: 'other_user', id: 'project_1' };
      const ownedRecord = { status: 'published', ownerId: 'user_123', id: 'project_2' };
      const restrictedRecord = { status: 'published', ownerId: 'other_user', id: 'project_3' };

      expect(rule.condition(context, draftRecord)).toBe(true);
      expect(rule.condition(context, ownedRecord)).toBe(true);
      expect(rule.condition(context, restrictedRecord)).toBe(false);
      expect(rule.condition(context, null)).toBe(false);
    });

    it('should evaluate conditions with record relationships', () => {
      const rule: PermissionRule = {
        resource: 'team_documents',
        action: 'edit',
        condition: (ctx, record) => {
          if (!record) return false;
          
          const isTeamMember = record.teamMembers?.includes(ctx.userId);
          const isManager = ctx.role === 'manager' && record.department === ctx.department;
          const isOwner = record.createdBy === ctx.userId;

          return isTeamMember || isManager || isOwner;
        },
      };

      const context = { 
        userId: 'user_456', 
        role: 'manager', 
        department: 'engineering' 
      };

      const teamRecord = {
        teamMembers: ['user_123', 'user_456', 'user_789'],
        department: 'marketing',
        createdBy: 'user_123',
        id: 'doc_team',
      };

      const managedRecord = {
        teamMembers: ['user_123', 'user_789'],
        department: 'engineering',
        createdBy: 'user_123',
        id: 'doc_managed',
      };

      const ownedRecord = {
        teamMembers: ['user_123', 'user_789'],
        department: 'marketing',
        createdBy: 'user_456',
        id: 'doc_owned',
      };

      const restrictedRecord = {
        teamMembers: ['user_123', 'user_789'],
        department: 'marketing',
        createdBy: 'user_000',
        id: 'doc_restricted',
      };

      expect(rule.condition(context, teamRecord)).toBe(true); // Team member
      expect(rule.condition(context, managedRecord)).toBe(true); // Manager
      expect(rule.condition(context, ownedRecord)).toBe(true); // Owner
      expect(rule.condition(context, restrictedRecord)).toBe(false); // No access
    });

    it('should evaluate time-based conditions', () => {
      const rule: PermissionRule = {
        resource: 'scheduled_reports',
        action: 'run',
        condition: (ctx, record) => {
          if (!record) return false;
          
          const now = new Date();
          const scheduleStart = new Date(record.scheduleStart);
          const scheduleEnd = new Date(record.scheduleEnd);
          
          const isInSchedule = now >= scheduleStart && now <= scheduleEnd;
          const hasScheduleOverride = ctx.permissions?.includes('schedule_override');
          const isOwner = record.createdBy === ctx.userId;

          return isInSchedule || (hasScheduleOverride && isOwner);
        },
      };

      const context = { 
        userId: 'user_scheduler', 
        permissions: ['schedule_override'] 
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const activeSchedule = {
        scheduleStart: oneHourAgo.toISOString(),
        scheduleEnd: oneHourLater.toISOString(),
        createdBy: 'other_user',
        id: 'report_active',
      };

      const expiredSchedule = {
        scheduleStart: yesterday.toISOString(),
        scheduleEnd: oneHourAgo.toISOString(),
        createdBy: 'user_scheduler',
        id: 'report_expired',
      };

      const futureSchedule = {
        scheduleStart: oneHourLater.toISOString(),
        scheduleEnd: tomorrow.toISOString(),
        createdBy: 'other_user',
        id: 'report_future',
      };

      expect(rule.condition(context, activeSchedule)).toBe(true); // In schedule
      expect(rule.condition(context, expiredSchedule)).toBe(true); // Override + owner
      expect(rule.condition(context, futureSchedule)).toBe(false); // Not in schedule, not owner
    });
  });

  describe('context-record interaction conditions', () => {
    it('should evaluate conditions that compare context and record attributes', () => {
      const rule: PermissionRule = {
        resource: 'regional_data',
        action: 'access',
        condition: (ctx, record) => {
          if (!record) return false;

          const sameRegion = ctx.region === record.region;
          const hasGlobalAccess = ctx.globalPermissions?.includes('cross_region_access');
          const isDataOwner = record.dataOwner === ctx.userId;
          const isSupervisor = record.supervisorId === ctx.userId;

          return sameRegion || hasGlobalAccess || isDataOwner || isSupervisor;
        },
      };

      const context = {
        userId: 'user_regional',
        region: 'us-west',
        globalPermissions: [],
      };

      const sameRegionRecord = {
        region: 'us-west',
        dataOwner: 'other_user',
        supervisorId: 'supervisor_123',
        id: 'data_same_region',
      };

      const differentRegionRecord = {
        region: 'eu-central',
        dataOwner: 'other_user',
        supervisorId: 'supervisor_123',
        id: 'data_different_region',
      };

      const ownedRecord = {
        region: 'eu-central',
        dataOwner: 'user_regional',
        supervisorId: 'supervisor_123',
        id: 'data_owned',
      };

      const supervisedRecord = {
        region: 'eu-central',
        dataOwner: 'other_user',
        supervisorId: 'user_regional',
        id: 'data_supervised',
      };

      const globalContext = {
        ...context,
        globalPermissions: ['cross_region_access'],
      };

      expect(rule.condition(context, sameRegionRecord)).toBe(true);
      expect(rule.condition(context, differentRegionRecord)).toBe(false);
      expect(rule.condition(context, ownedRecord)).toBe(true);
      expect(rule.condition(context, supervisedRecord)).toBe(true);
      expect(rule.condition(globalContext, differentRegionRecord)).toBe(true);
    });

    it('should evaluate hierarchical relationship conditions', () => {
      const rule: PermissionRule = {
        resource: 'employee_records',
        action: 'view',
        condition: (ctx, record) => {
          if (!record) return false;

          const isOwnRecord = record.employeeId === ctx.userId;
          const isDirectReport = record.managerId === ctx.userId;
          const isSameDepartment = record.department === ctx.department && ctx.role === 'hr';
          const isHRAdmin = ctx.role === 'hr_admin';

          // Check for hierarchical access (manager of manager)
          const isIndirectManager = ctx.directReports?.some((reportId: string) => {
            // This would normally query a database, but for testing we'll use context data
            return ctx.managerHierarchy?.[reportId] === record.employeeId;
          });

          return isOwnRecord || isDirectReport || isSameDepartment || isHRAdmin || isIndirectManager;
        },
      };

      const managerContext = {
        userId: 'manager_123',
        role: 'manager',
        department: 'engineering',
        directReports: ['employee_456', 'employee_789'],
        managerHierarchy: {
          employee_456: 'employee_999', // employee_456 manages employee_999
        },
      };

      const ownRecord = {
        employeeId: 'manager_123',
        managerId: 'senior_manager',
        department: 'engineering',
        id: 'record_own',
      };

      const directReportRecord = {
        employeeId: 'employee_456',
        managerId: 'manager_123',
        department: 'engineering',
        id: 'record_direct',
      };

      const indirectReportRecord = {
        employeeId: 'employee_999',
        managerId: 'employee_456',
        department: 'engineering',
        id: 'record_indirect',
      };

      const unrelatedRecord = {
        employeeId: 'employee_unrelated',
        managerId: 'other_manager',
        department: 'marketing',
        id: 'record_unrelated',
      };

      expect(rule.condition(managerContext, ownRecord)).toBe(true);
      expect(rule.condition(managerContext, directReportRecord)).toBe(true);
      expect(rule.condition(managerContext, indirectReportRecord)).toBe(true);
      expect(rule.condition(managerContext, unrelatedRecord)).toBe(false);
    });
  });

  describe('dynamic condition evaluation', () => {
    it('should evaluate conditions that change based on external factors', () => {
      let currentSystemLoad = 50; // Simulated system load
      
      const rule: PermissionRule = {
        resource: 'compute_intensive_task',
        action: 'execute',
        condition: (ctx, record) => {
          const hasHighPriority = ctx.priority >= 8;
          const isSystemLoadLow = currentSystemLoad < 70;
          const hasEmergencyOverride = ctx.emergencyMode === true;
          const isOffPeakHours = new Date().getHours() < 8 || new Date().getHours() > 18;

          return hasHighPriority && (isSystemLoadLow || hasEmergencyOverride || isOffPeakHours);
        },
      };

      const highPriorityContext = { userId: 'user_hp', priority: 9 };
      const lowPriorityContext = { userId: 'user_lp', priority: 5 };
      const emergencyContext = { userId: 'user_em', priority: 6, emergencyMode: true };

      // Low system load - high priority should work
      currentSystemLoad = 30;
      expect(rule.condition(highPriorityContext, null)).toBe(true);
      expect(rule.condition(lowPriorityContext, null)).toBe(false);

      // High system load - only emergency should work
      currentSystemLoad = 90;
      expect(rule.condition(highPriorityContext, null)).toBe(false);
      expect(rule.condition(emergencyContext, null)).toBe(true);
    });

    it('should evaluate conditions with function calls and computations', () => {
      const calculateRiskScore = (ctx: any, record: any): number => {
        let score = 0;
        
        if (record?.amount > 10000) score += 3;
        if (record?.region !== ctx.region) score += 2;
        if (!ctx.twoFactorEnabled) score += 2;
        if (ctx.recentFailedLogins > 3) score += 1;
        
        return score;
      };

      const rule: PermissionRule = {
        resource: 'financial_transfer',
        action: 'approve',
        condition: (ctx, record) => {
          if (!record) return false;
          
          const riskScore = calculateRiskScore(ctx, record);
          const requiredApprovalLevel = riskScore <= 2 ? 3 : riskScore <= 5 ? 5 : 8;
          
          return ctx.approvalLevel >= requiredApprovalLevel;
        },
      };

      const context = {
        userId: 'approver_123',
        region: 'us-east',
        approvalLevel: 5,
        twoFactorEnabled: true,
        recentFailedLogins: 1,
      };

      const lowRiskTransfer = {
        amount: 5000,
        region: 'us-east',
        id: 'transfer_low_risk',
      };

      const mediumRiskTransfer = {
        amount: 15000,
        region: 'us-west',
        id: 'transfer_medium_risk',
      };

      const highRiskTransfer = {
        amount: 50000,
        region: 'eu-central',
        id: 'transfer_high_risk',
      };

      expect(rule.condition(context, lowRiskTransfer)).toBe(true); // Risk score: 0, needs level 3
      expect(rule.condition(context, mediumRiskTransfer)).toBe(true); // Risk score: 5, needs level 5
      expect(rule.condition(context, highRiskTransfer)).toBe(false); // Risk score: 8, needs level 8
    });
  });

  describe('condition performance and reliability', () => {
    it('should handle conditions that throw exceptions', () => {
      const faultyRule: PermissionRule = {
        resource: 'faulty_resource',
        action: 'test',
        condition: (ctx, record) => {
          if (ctx.triggerError) {
            throw new Error('Simulated condition error');
          }
          return true;
        },
      };

      const normalContext = { userId: 'user_normal' };
      const errorContext = { userId: 'user_error', triggerError: true };

      expect(faultyRule.condition(normalContext, null)).toBe(true);
      expect(() => faultyRule.condition(errorContext, null)).toThrow('Simulated condition error');
    });

    it('should handle conditions with async-like patterns (Promise-based)', async () => {
      const mockAsyncCheck = vi.fn().mockResolvedValue(true);
      
      // Note: ABAC conditions are synchronous, but we can test patterns that might be used
      const rule: PermissionRule = {
        resource: 'async_resource',
        action: 'test',
        condition: (ctx, record) => {
          // In real scenarios, you might cache async results in context
          return ctx.asyncCheckResult === true;
        },
      };

      // Simulate async operation completion
      const asyncResult = await mockAsyncCheck();
      const contextWithAsyncResult = { 
        userId: 'user_async', 
        asyncCheckResult: asyncResult 
      };

      expect(rule.condition(contextWithAsyncResult, null)).toBe(true);
    });

    it('should maintain performance with complex conditions', () => {
      const complexRule: PermissionRule = {
        resource: 'complex_resource',
        action: 'process',
        condition: (ctx, record) => {
          // Simulate complex computation
          let result = true;
          
          for (let i = 0; i < 1000; i++) {
            result = result && (i % 2 === 0 || ctx.userId.length > 5);
          }
          
          if (record) {
            for (const key of Object.keys(record)) {
              result = result && key.length > 0;
            }
          }
          
          return result && ctx.hasAccess;
        },
      };

      const context = { userId: 'user_complex', hasAccess: true };
      const record = { field1: 'value1', field2: 'value2', field3: 'value3' };

      const startTime = performance.now();
      
      // Run the condition multiple times
      for (let i = 0; i < 100; i++) {
        complexRule.condition(context, record);
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in reasonable time
    });

    it('should handle conditions with large data structures', () => {
      const rule: PermissionRule = {
        resource: 'large_data',
        action: 'analyze',
        condition: (ctx, record) => {
          if (!record || !record.dataSet) return false;
          
          // Process large dataset
          const dataSet = record.dataSet as number[];
          const hasPermission = ctx.analysisLevel >= 3;
          const datasetSize = dataSet.length;
          
          // Only allow analysis of large datasets for high-level users
          return hasPermission && (datasetSize < 1000 || ctx.analysisLevel >= 5);
        },
      };

      const context = { userId: 'analyst_123', analysisLevel: 5 };
      
      // Create large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => i);
      const recordWithLargeData = {
        id: 'large_record',
        dataSet: largeDataset,
      };

      const smallDataset = Array.from({ length: 500 }, (_, i) => i);
      const recordWithSmallData = {
        id: 'small_record',
        dataSet: smallDataset,
      };

      const startTime = performance.now();
      
      const largeResult = rule.condition(context, recordWithLargeData);
      const smallResult = rule.condition(context, recordWithSmallData);
      
      const endTime = performance.now();

      expect(largeResult).toBe(true);
      expect(smallResult).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should handle large data efficiently
    });
  });
});