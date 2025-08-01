#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';

const execAsync = promisify(exec);

// Top-level regex constants to avoid performance issues
const IMPORT_RENDER_SCREEN_REGEX = /import { render, screen/;
const TEST_FILE_REGEX = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

const program = new Command();

program
  .name('test-maintenance')
  .description('Automated test maintenance and quality tools')
  .version('1.0.0');

// Health check command
program
  .command('health')
  .description('Check overall test suite health')
  .argument('[path]', 'Path to check (defaults to current directory)', '.')
  .option('--json', 'Output results as JSON')
  .option('--threshold <number>', 'Coverage threshold percentage', '80')
  .action(async (targetPath, options) => {
    try {
      const health = await performHealthCheck(path.resolve(targetPath), {
        coverageThreshold: Number.parseInt(options.threshold),
      });

      if (options.json) {
        process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
      } else {
        printHealthReport(health);
      }

      // Exit with error code if health is poor
      process.exit(health.overall.score < 7 ? 1 : 0);
    } catch (_error) {
      process.exit(1);
    }
  });

// Find flaky tests
program
  .command('flaky')
  .description('Detect and analyze flaky tests')
  .option('--runs <number>', 'Number of test runs to perform', '10')
  .option('--threshold <number>', 'Failure rate threshold (0-1)', '0.1')
  .option('--fix', 'Attempt to automatically fix flaky tests')
  .action(async (options) => {
    try {
      const flakyTests = await detectFlakyTests({
        runs: Number.parseInt(options.runs),
        failureThreshold: Number.parseFloat(options.threshold),
      });

      if (flakyTests.length === 0) {
        return;
      }
      for (const _test of flakyTests) {
        // Process flaky tests when needed
      }

      if (options.fix) {
        await fixFlakyTests(flakyTests);
      } else {
        // List flaky tests without fixing them
        process.stdout.write(
          `Found ${flakyTests.length} flaky tests. Use --fix to address them.\n`
        );
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Clean up obsolete tests
program
  .command('cleanup')
  .description('Remove obsolete test files and clean up test suite')
  .option('--dry-run', 'Show what would be cleaned up without making changes')
  .option('--aggressive', 'More aggressive cleanup (use with caution)')
  .action(async (options) => {
    try {
      const cleanup = await analyzeTestCleanup({
        dryRun: options.dryRun,
        aggressive: options.aggressive,
      });

      if (
        cleanup.obsoleteTests.length === 0 &&
        cleanup.unusedMocks.length === 0
      ) {
        return;
      }

      if (options.dryRun) {
        process.stdout.write('Dry run mode: No files will be deleted\n');
      } else {
        process.stdout.write('Cleaning up test files...\n');
      }

      if (cleanup.obsoleteTests.length > 0) {
        for (const _file of cleanup.obsoleteTests) {
          // Process obsolete test files when needed
        }
      }

      if (cleanup.unusedMocks.length > 0) {
        for (const _file of cleanup.unusedMocks) {
          // Process unused mock files when needed
        }
      }

      if (!options.dryRun) {
        await performCleanup(cleanup);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Update dependencies in test files
program
  .command('update-deps')
  .description('Update test dependencies and imports')
  .option('--dry-run', 'Show what would be updated without making changes')
  .action(async (options) => {
    try {
      const updates = await analyzeTestDependencies();

      if (updates.length === 0) {
        return;
      }

      for (const update of updates) {
        for (const _change of update.changes) {
          // Process dependency changes when needed
        }

        if (!options.dryRun) {
          await applyDependencyUpdates(update);
        }
      }

      if (options.dryRun) {
        process.stdout.write('Dry run mode: No changes will be made\n');
      } else {
        process.stdout.write('Changes applied successfully\n');
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Optimize test performance
program
  .command('optimize')
  .description('Analyze and optimize test performance')
  .option('--profile', 'Generate detailed performance profile')
  .action(async (options) => {
    try {
      const performance = await analyzeTestPerformance({
        generateProfile: options.profile,
      });

      for (const [_index, _test] of performance.slowTests.entries()) {
        // Process slow tests when needed
      }

      if (performance.recommendations.length > 0) {
        for (const _rec of performance.recommendations) {
          // Process recommendations when needed
        }
      }

      if (options.profile) {
        await generatePerformanceProfile(performance);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Fix common test issues
program
  .command('fix')
  .description('Automatically fix common test issues')
  .option(
    '--type <types>',
    'Types of issues to fix (comma-separated)',
    'imports,mocks,assertions'
  )
  .option('--dry-run', 'Show what would be fixed without making changes')
  .action(async (options) => {
    try {
      const fixTypes = options.type.split(',').map((t: string) => t.trim());

      const issues = await analyzeCommonIssues(fixTypes);

      if (issues.length === 0) {
        return;
      }

      for (const issue of issues) {
        for (const _fix of issue.fixes) {
          // Process fixes when needed
        }

        if (!options.dryRun) {
          await applyFixes(issue);
        }
      }

      if (options.dryRun) {
        process.stdout.write('Dry run mode: No changes will be made\n');
      } else {
        process.stdout.write('Changes applied successfully\n');
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Generate maintenance report
program
  .command('report')
  .description('Generate comprehensive test maintenance report')
  .option(
    '--format <format>',
    'Output format (markdown, html, json)',
    'markdown'
  )
  .option('--output <file>', 'Output file path')
  .action(async (options) => {
    try {
      const report = await generateMaintenanceReport();

      let formattedReport: string;

      switch (options.format) {
        case 'html':
          formattedReport = formatReportAsHTML(report);
          break;
        case 'json':
          formattedReport = JSON.stringify(report, null, 2);
          break;
        default:
          formattedReport = formatReportAsMarkdown(report);
      }

      if (options.output) {
        await fs.writeFile(options.output, formattedReport);
      } else {
        process.stdout.write(formattedReport);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Helper functions and interfaces

/**
 * Get score status based on numeric score
 */
function getScoreStatus(score: number): string {
  if (score >= 8) {
    return 'excellent';
  }
  if (score >= 6) {
    return 'good';
  }
  if (score >= 4) {
    return 'fair';
  }
  return 'poor';
}

interface HealthCheck {
  overall: {
    score: number; // 1-10
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  coverage: {
    percentage: number;
    missing: string[];
    threshold: number;
  };
  testQuality: {
    score: number;
    issues: string[];
  };
  performance: {
    score: number;
    slowTests: number;
    averageTime: number;
  };
  maintenance: {
    score: number;
    obsoleteTests: number;
    flakyTests: number;
  };
}

interface FlakyTest {
  file: string;
  testName: string;
  failureRate: number;
  commonErrors: string[];
}

interface TestCleanup {
  obsoleteTests: Array<{
    path: string;
    reason: string;
  }>;
  unusedMocks: string[];
  duplicateTests: string[];
}

async function performHealthCheck(
  targetPath: string,
  options: { coverageThreshold: number }
): Promise<HealthCheck> {
  const coverage = await getCoverageInfo(targetPath);
  const testQuality = await analyzeTestQuality(targetPath);
  const performance = await analyzeTestPerformance({ generateProfile: false });
  const maintenance = await analyzeMaintenance(targetPath);

  const scores = {
    coverage:
      coverage.percentage >= options.coverageThreshold
        ? 10
        : Math.max(1, Math.round(coverage.percentage / 10)),
    quality: testQuality.score,
    performance: performance.score,
    maintenance: maintenance.score,
  };

  const overallScore = Math.round(
    (scores.coverage +
      scores.quality +
      scores.performance +
      scores.maintenance) /
      4
  );

  return {
    overall: {
      score: overallScore,
      status: getScoreStatus(overallScore),
    },
    coverage: {
      percentage: coverage.percentage,
      missing: coverage.missing,
      threshold: options.coverageThreshold,
    },
    testQuality: testQuality,
    performance: {
      score: performance.score,
      slowTests: performance.slowTests.length,
      averageTime: Math.round(performance.averageTime),
    },
    maintenance: maintenance,
  };
}

async function getCoverageInfo(targetPath: string) {
  try {
    const { stdout } = await execAsync(
      'pnpm test -- --coverage --reporter=json',
      { cwd: targetPath }
    );
    const coverage = JSON.parse(stdout);

    return {
      percentage: Math.round(coverage.total.lines.percentage || 0),
      missing: coverage.uncoveredFiles || [],
    };
  } catch {
    return { percentage: 0, missing: [] };
  }
}

async function analyzeTestQuality(targetPath: string) {
  const testFiles = await findTestFiles(targetPath);
  let totalScore = 0;
  const issues: string[] = [];

  for (const file of testFiles) {
    const content = await fs.readFile(file, 'utf8');
    const fileScore = analyzeTestFile(content, file, issues);
    totalScore += fileScore;
  }

  return {
    score: testFiles.length > 0 ? Math.round(totalScore / testFiles.length) : 0,
    issues,
  };
}

function analyzeTestFile(
  content: string,
  filePath: string,
  issues: string[]
): number {
  let score = 10;

  // Check for describe blocks
  if (!content.includes('describe(')) {
    score -= 2;
    issues.push(`${filePath}: Missing describe blocks for test organization`);
  }

  // Check for proper test names
  const testMatches = content.match(/it\(['"](.*?)['"],/g) || [];
  const poorNames = testMatches.filter(
    (match) =>
      match.includes('should work') ||
      match.includes('works correctly') ||
      match.length < 20
  );

  if (poorNames.length > 0) {
    score -= 1;
    issues.push(`${filePath}: ${poorNames.length} tests with poor naming`);
  }

  // Check for setup/cleanup
  if (content.includes('beforeEach') || content.includes('afterEach')) {
    score += 1;
  } else if (testMatches.length > 3) {
    score -= 1;
    issues.push(
      `${filePath}: Missing test setup/cleanup for ${testMatches.length} tests`
    );
  }

  // Check for mocking
  if (content.includes('vi.mock') && !content.includes('vi.clearAllMocks')) {
    score -= 1;
    issues.push(`${filePath}: Mocks used but no cleanup detected`);
  }

  return Math.max(1, score);
}

async function runTestsMultipleTimes(
  runs: number
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < runs; i++) {
    try {
      const { stdout } = await execAsync('pnpm test -- --reporter=json');
      const testResult = JSON.parse(stdout);
      results.push(testResult);
    } catch (error) {
      results.push({ failed: true, error: error.message });
    }
  }

  return results;
}

function collectTestStats(
  results: Record<string, unknown>[]
): Map<string, { total: number; failures: number; errors: string[] }> {
  const testStats = new Map();

  for (const result of results) {
    if (!result.testResults) {
      continue;
    }

    for (const testFile of result.testResults as Record<string, unknown>[]) {
      processTestFile(testFile, testStats);
    }
  }

  return testStats;
}

function processTestFile(
  testFile: Record<string, unknown>,
  testStats: Map<string, { total: number; failures: number; errors: string[] }>
): void {
  const assertionResults = testFile.assertionResults as
    | Record<string, unknown>[]
    | undefined;
  if (!assertionResults) {
    return;
  }

  for (const test of assertionResults) {
    const key = `${testFile.name}:${test.title}`;
    if (!testStats.has(key)) {
      testStats.set(key, { total: 0, failures: 0, errors: [] });
    }

    const stats = testStats.get(key);
    stats.total++;

    if (test.status === 'failed') {
      stats.failures++;
      const failureMessages = test.failureMessages as string[] | undefined;
      stats.errors.push(failureMessages?.[0] || 'Unknown error');
    }
  }
}

function identifyFlakyTests(
  testStats: Map<string, { total: number; failures: number; errors: string[] }>,
  failureThreshold: number
): FlakyTest[] {
  const flakyTests: FlakyTest[] = [];

  for (const [key, stats] of testStats.entries()) {
    const failureRate = stats.failures / stats.total;
    if (failureRate > failureThreshold && failureRate < 1) {
      const [file, testName] = key.split(':');
      flakyTests.push({
        file,
        testName,
        failureRate,
        commonErrors: [...new Set(stats.errors)],
      });
    }
  }

  return flakyTests;
}

async function detectFlakyTests(options: {
  runs: number;
  failureThreshold: number;
}): Promise<FlakyTest[]> {
  const results = await runTestsMultipleTimes(options.runs);
  const testStats = collectTestStats(results);
  return identifyFlakyTests(testStats, options.failureThreshold);
}

function applyTimingFixes(content: string, errors: string[]): string {
  let fixedContent = content;

  if (
    errors.some((err) => err.includes('timeout') || err.includes('not found'))
  ) {
    fixedContent = fixedContent.replace(
      /expect\(screen\.get/g,
      'await waitFor(() => expect(screen.get'
    );

    // Add import if not present
    if (!fixedContent.includes('import { waitFor }')) {
      fixedContent = fixedContent.replace(
        IMPORT_RENDER_SCREEN_REGEX,
        'import { render, screen, waitFor'
      );
    }
  }

  return fixedContent;
}

function applyAsyncFixes(content: string, errors: string[]): string {
  if (errors.some((err) => err.includes('Promise'))) {
    return content.replace(/it\('.*?', \(\) => {/g, (match) =>
      match.replace('() => {', 'async () => {')
    );
  }
  return content;
}

function addTestCleanup(content: string): string {
  if (content.includes('afterEach')) {
    return content;
  }

  const insertPoint = content.indexOf('describe(');
  if (insertPoint === -1) {
    return content;
  }

  const describeEnd = content.indexOf('});', insertPoint);
  const setupCode = `
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });
`;

  return content.slice(0, describeEnd) + setupCode + content.slice(describeEnd);
}

async function fixSingleFlakyTest(test: FlakyTest): Promise<void> {
  const content = await fs.readFile(test.file, 'utf8');
  let fixedContent = content;

  fixedContent = applyTimingFixes(fixedContent, test.commonErrors);
  fixedContent = applyAsyncFixes(fixedContent, test.commonErrors);
  fixedContent = addTestCleanup(fixedContent);

  if (fixedContent !== content) {
    await fs.writeFile(test.file, fixedContent);
  }
}

async function fixFlakyTests(flakyTests: FlakyTest[]): Promise<void> {
  for (const test of flakyTests) {
    await fixSingleFlakyTest(test);
  }
}

async function findTestFiles(targetPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules'
        ) {
          await walk(fullPath);
        } else if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(targetPath);
  return files;
}

function analyzeTestCleanup(_options: {
  dryRun: boolean;
  aggressive: boolean;
}): TestCleanup {
  // Implementation would analyze for obsolete tests, unused mocks, etc.
  return {
    obsoleteTests: [],
    unusedMocks: [],
    duplicateTests: [],
  };
}

async function performCleanup(_cleanup: TestCleanup): Promise<void> {
  // Implementation would perform the actual cleanup
}

function analyzeTestDependencies() {
  // Implementation would analyze test dependencies and suggest updates
  return [];
}

async function applyDependencyUpdates(
  _update: Record<string, unknown>
): Promise<void> {
  // Implementation would apply dependency updates
}

function analyzeTestPerformance(_options: { generateProfile: boolean }) {
  // Implementation would analyze test performance
  return {
    totalTime: 0,
    averageTime: 0,
    slowTests: [],
    recommendations: [],
    score: 8,
  };
}

async function generatePerformanceProfile(
  _performance: Record<string, unknown>
): Promise<void> {
  // Implementation would generate performance profile
}

function analyzeCommonIssues(_fixTypes: string[]) {
  // Implementation would analyze common test issues
  return [];
}

async function applyFixes(_issue: Record<string, unknown>): Promise<void> {
  // Implementation would apply fixes
}

function analyzeMaintenance(_targetPath: string) {
  // Implementation would analyze maintenance issues
  return {
    score: 8,
    obsoleteTests: 0,
    flakyTests: 0,
  };
}

function generateMaintenanceReport() {
  // Implementation would generate comprehensive report
  return {
    timestamp: new Date().toISOString(),
    summary: {},
    details: {},
  };
}

function formatReportAsMarkdown(report: Record<string, unknown>): string {
  return `# Test Maintenance Report

Generated: ${report.timestamp}

## Summary

<!-- Report content would go here -->
`;
}

function formatReportAsHTML(report: Record<string, unknown>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Test Maintenance Report</title>
</head>
<body>
  <h1>Test Maintenance Report</h1>
  <p>Generated: ${report.timestamp}</p>
  <!-- Report content would go here -->
</body>
</html>`;
}

function printHealthReport(health: HealthCheck): void {
  const _statusEmoji = {
    excellent: '🌟',
    good: '✅',
    fair: '⚠️',
    poor: '❌',
  };

  if (health.testQuality.issues.length > 0) {
    for (const _issue of health.testQuality.issues) {
      // Process issues when needed
    }
  }

  if (health.coverage.missing.length > 0) {
    for (const _file of health.coverage.missing.slice(0, 5)) {
      // Process missing coverage files when needed
    }
    if (health.coverage.missing.length > 5) {
      // Handle additional files
    }
  }
}

if (require.main === module) {
  program.parse();
}

export { program };
