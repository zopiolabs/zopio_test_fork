/**
 * SPDX-License-Identifier: MIT
 */

/**
 * @repo/testing - Comprehensive testing framework and utilities
 *
 * This package provides:
 * - Shared test utilities and helpers
 * - Test data factories for common entities
 * - Mock factories for external services
 * - React Testing Library utilities
 * - Standardized vitest configurations
 * - Quality metrics and monitoring tools
 * - Test templates and code generators
 * - Developer debugging tools
 * - Automated maintenance workflows
 * - Continuous improvement framework
 */

// Core testing utilities
export * from './utils.js';
export * from './factories.js';
export * from './mocks.js';
export * from './setup.js';
export * from './configs.js';
export * from './auth-helpers.js';
export * from './metrics.js';

// Test templates and generators
export * from './templates/index.js';

// Developer tools
export * from './dev-tools/index.js';

// CLI tools
export * from './cli/index.js';

// Continuous improvement
export * from './metrics/index.js';
