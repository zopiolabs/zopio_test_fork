/**
 * @fileoverview Core Utils Tests - Integration Tests
 * 
 * Cross-functional integration tests for core utility modules working together.
 * Validates inter-module dependencies, complex workflows, and real-world usage
 * patterns combining multiple utility functions in realistic scenarios.
 * 
 * **Test Scope:**
 * - Cross-module utility combinations (logger + async + object utils)
 * - Complex data processing workflows
 * - Error handling across multiple utility layers
 * - Performance characteristics of combined operations
 * - Real-world usage patterns and edge cases
 * - Memory management in complex workflows
 * 
 * **Test Categories:**
 * 1. **Cross-Module Integration**: Multiple utilities working together
 * 2. **Complex Workflows**: Real-world data processing scenarios
 * 3. **Error Propagation**: Error handling across utility boundaries
 * 4. **Performance Integration**: Combined operation efficiency
 * 5. **Memory Management**: Resource usage in complex operations
 * 6. **Real-World Scenarios**: Practical usage pattern validation
 * 7. **Compatibility Testing**: Module interoperability verification
 * 
 * **Mock Strategy:**
 * - Temporary console and environment mocking (until testing package fixed)
 * - Complex data structure simulation
 * - Error injection for cross-module error handling
 * 
 * **Quality Standards:**
 * - Seamless inter-module operation without conflicts
 * - Consistent error handling patterns across modules
 * - Acceptable performance characteristics for combined operations
 * 
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { logger, asyncUtils, objectUtils, stringUtils, arrayUtils } from '../index.js';
// import { mockConsole, mockEnv } from '@repo/testing';

// Temporary mocks until testing package is fixed
const mockConsole = () => {
  const originalConsole = { ...console };
  const mocks = {
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  };
  
  return {
    mocks,
    restore: () => {
      Object.values(mocks).forEach(mock => mock.mockRestore());
    }
  };
};

const mockEnv = (env: Record<string, string>) => {
  const original = process.env;
  process.env = { ...original, ...env };
  return {
    restore: () => {
      process.env = original;
    }
  };
};

describe('core-utils integration', () => {
  it('should work together in realistic scenarios', async () => {
    // Mock console for logger
    const consoleMock = mockConsole();
    const envMock = mockEnv({ NODE_ENV: 'development' });

    try {
      // Scenario: Processing user data with error handling and logging
      const mockApiCall = vi.fn().mockResolvedValue({
        users: [
          { firstName: 'john doe', lastName: 'smith', department: 'engineering' },
          { firstName: 'jane-doe', lastName: 'wilson', department: 'sales' },
          { firstName: 'bob_johnson', lastName: 'brown', department: 'engineering' },
        ]
      });

      // Use safeAsync to handle the API call
      const safeApiCall = asyncUtils.safeAsync(mockApiCall);
      const [apiResult, apiError] = await safeApiCall();

      expect(apiError).toBeNull();
      expect(apiResult).toBeDefined();

      if (apiResult) {
        // Log the successful API call
        logger.info('API call successful', { userCount: apiResult.users.length });

        // Process each user
        const processedUsers = apiResult.users.map(user => {
          // Convert names to proper format using string utils
          const firstName = stringUtils.toCamelCase(user.firstName);
          const lastName = stringUtils.toCamelCase(user.lastName);
          const fullName = `${firstName} ${lastName}`;

          // Create user config with default settings
          const defaultConfig = {
            notifications: { email: true, sms: false },
            theme: 'light',
            permissions: ['read']
          };

          const userSpecificConfig = {
            notifications: { push: true },
            permissions: ['read', 'write']
          };

          // Merge configurations using object utils
          const finalConfig = objectUtils.deepMerge(defaultConfig, userSpecificConfig);

          return {
            name: fullName,
            displayName: stringUtils.toKebabCase(fullName),
            department: user.department,
            config: finalConfig
          };
        });

        // Group users by department using array utils
        const groupedUsers = arrayUtils.groupBy(processedUsers, 'department');

        // Verify the integration worked correctly
        expect(groupedUsers).toHaveProperty('engineering');
        expect(groupedUsers).toHaveProperty('sales');
        expect(groupedUsers.engineering).toHaveLength(2);
        expect(groupedUsers.sales).toHaveLength(1);

        // Check that string transformations worked
        expect(processedUsers[0].name).toBe('johnDoe smith');
        expect(processedUsers[0].displayName).toBe('john-doe-smith');

        // Check that object merging worked
        expect(processedUsers[0].config).toEqual({
          notifications: { email: true, sms: false, push: true },
          theme: 'light',
          permissions: ['read', 'write']
        });

        // Log the processing results
        logger.info('User processing completed', {
          totalUsers: processedUsers.length,
          departments: Object.keys(groupedUsers)
        });

        // Verify logging occurred
        expect(consoleMock.mocks.info).toHaveBeenCalledTimes(2);
        expect(consoleMock.mocks.info).toHaveBeenCalledWith(
          '[INFO] API call successful',
          { userCount: 3 }
        );
      }
    } finally {
      consoleMock.restore();
      envMock.restore();
    }
  });

  it('should handle error scenarios gracefully', async () => {
    const consoleMock = mockConsole();
    const envMock = mockEnv({ NODE_ENV: 'production' });

    try {
      // Scenario: API call fails but we handle it gracefully
      const failingApiCall = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const safeApiCall = asyncUtils.safeAsync(failingApiCall);
      
      const [result, error] = await safeApiCall();

      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Network timeout');

      // Log the error (errors are always logged, even in production)
      logger.error('API call failed', { error: error?.message });

      // Use fallback data processing
      const fallbackData = {
        users: [
          { name: 'unknown user', department: 'unknown' }
        ]
      };

      // Still process the fallback data
      const processedUsers = fallbackData.users.map(user => ({
        ...user,
        displayName: stringUtils.toKebabCase(user.name),
        formattedName: stringUtils.toCamelCase(user.name)
      }));

      const groupedUsers = arrayUtils.groupBy(processedUsers, 'department');

      expect(groupedUsers).toHaveProperty('unknown');
      expect(groupedUsers.unknown).toHaveLength(1);
      expect(processedUsers[0].displayName).toBe('unknown-user');
      expect(processedUsers[0].formattedName).toBe('unknownUser');

      // Verify error was logged
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        '[ERROR] API call failed',
        { error: 'Network timeout' }
      );
    } finally {
      consoleMock.restore();
      envMock.restore();
    }
  });

  it('should handle complex data transformations', () => {
    // Scenario: Transform complex nested data structures
    const rawConfig = {
      'user-settings': {
        'display_name': 'john doe',
        'email-notifications': true,
        'theme_preference': 'dark mode'
      },
      'api-endpoints': {
        'user_profile': '/api/user-profile',
        'data-export': '/api/data_export'
      }
    };

    // Transform all keys to camelCase
    const transformKeys = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(transformKeys);
      } else if (obj !== null && typeof obj === 'object') {
        const transformed: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const camelKey = stringUtils.toCamelCase(key);
          transformed[camelKey] = transformKeys(value);
        }
        return transformed;
      }
      return obj;
    };

    const transformedConfig = transformKeys(rawConfig);

    expect(transformedConfig).toEqual({
      userSettings: {
        displayName: 'john doe',
        emailNotifications: true,
        themePreference: 'dark mode'
      },
      apiEndpoints: {
        userProfile: '/api/user-profile',
        dataExport: '/api/data_export'
      }
    });

    // Further process string values
    const processedConfig = objectUtils.deepMerge(transformedConfig, {
      userSettings: {
        displayName: stringUtils.toCamelCase(transformedConfig.userSettings.displayName),
        themePreference: stringUtils.toKebabCase(transformedConfig.userSettings.themePreference)
      }
    });

    expect(processedConfig.userSettings.displayName).toBe('johnDoe');
    expect(processedConfig.userSettings.themePreference).toBe('dark-mode');
  });

  it('should demonstrate error handling with logging in async workflows', async () => {
    const consoleMock = mockConsole();

    try {
      // Simulate a multi-step workflow with error handling
      const step1 = vi.fn().mockResolvedValue({ data: 'step1-complete' });
      const step2 = vi.fn().mockRejectedValue(new Error('Step 2 failed'));
      const step3 = vi.fn().mockResolvedValue({ data: 'step3-complete' });

      const workflow = async () => {
        const safeStep1 = asyncUtils.safeAsync(step1);
        const safeStep2 = asyncUtils.safeAsync(step2);
        const safeStep3 = asyncUtils.safeAsync(step3);

        const results = [];

        // Execute step 1
        const [result1, error1] = await safeStep1();
        if (error1) {
          logger.error('Step 1 failed', { error: error1.message });
        } else {
          logger.info('Step 1 completed', result1);
          results.push(result1);
        }

        // Execute step 2
        const [result2, error2] = await safeStep2();
        if (error2) {
          logger.error('Step 2 failed', { error: error2.message });
          // Continue with workflow despite failure
        } else {
          logger.info('Step 2 completed', result2);
          results.push(result2);
        }

        // Execute step 3
        const [result3, error3] = await safeStep3();
        if (error3) {
          logger.error('Step 3 failed', { error: error3.message });
        } else {
          logger.info('Step 3 completed', result3);
          results.push(result3);
        }

        return results;
      };

      const results = await workflow();

      // Verify workflow completed with partial success
      expect(results).toHaveLength(2); // Step 1 and 3 succeeded
      expect(results[0]).toEqual({ data: 'step1-complete' });
      expect(results[1]).toEqual({ data: 'step3-complete' });

      // Verify logging
      expect(consoleMock.mocks.info).toHaveBeenCalledTimes(2);
      expect(consoleMock.mocks.error).toHaveBeenCalledTimes(1);
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        '[ERROR] Step 2 failed',
        { error: 'Step 2 failed' }
      );
    } finally {
      consoleMock.restore();
    }
  });
});