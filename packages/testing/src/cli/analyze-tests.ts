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

// Regex constants for performance
const INCOMPLETE_ASSERTION_REGEX = /expect\([^)]+\)\.toBe\($/;
const TEST_NAMING_REGEX = /it\(['"](.*?)['"],/g;
const TEST_FILE_REGEX = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

// Type definitions for test results
interface TestResult {
  name: string;
  title: string;
  duration: number;
}

interface FileResult {
  name: string;
  assertionResults?: TestResult[];
}

interface PerformanceResult {
  testResults?: FileResult[];
  numTotalTests?: number;
}

const program = new Command();

program
  .name('analyze-tests')
  .description('Analyze test suite quality, coverage, and performance')
  .version('1.0.0');

// Coverage analysis
program
  .command('coverage')
  .description('Analyze test coverage and identify gaps')
  .argument('[path]', 'Path to analyze', '.')
  .option('--threshold <number>', 'Coverage threshold percentage', '80')
  .option('--format <format>', 'Output format (table, json, lcov)', 'table')
  .option('--detailed', 'Show detailed per-file coverage')
  .action(async (targetPath, options) => {
    try {
      const coverage = await analyzeCoverage(targetPath, {
        threshold: Number.parseInt(options.threshold),
        detailed: options.detailed,
      });

      switch (options.format) {
        case 'json':
          break;
        case 'lcov':
          break;
        default:
          printCoverageTable(coverage, options.threshold);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Quality analysis
program
  .command('quality')
  .description('Analyze test code quality and best practices')
  .argument('[path]', 'Path to analyze', '.')
  .option(
    '--rules <rules>',
    'Quality rules to check',
    'naming,structure,mocking,assertions'
  )
  .option('--severity <level>', 'Minimum severity level', 'warning')
  .action(async (targetPath, options) => {
    try {
      const rules = options.rules.split(',').map((r: string) => r.trim());
      const analysis = await analyzeTestQuality(targetPath, {
        rules,
        minSeverity: options.severity,
      });

      printQualityReport(analysis);

      // Exit with error if critical issues found
      const criticalIssues = analysis.issues.filter(
        (i) => i.severity === 'error'
      );
      if (criticalIssues.length > 0) {
        process.exit(1);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Performance analysis
program
  .command('performance')
  .description('Analyze test execution performance')
  .option('--runs <number>', 'Number of performance runs', '3')
  .option('--profile', 'Generate detailed performance profile')
  .action(async (options) => {
    try {
      const performance = await analyzePerformance({
        runs: Number.parseInt(options.runs),
        generateProfile: options.profile,
      });

      printPerformanceReport(performance);

      if (options.profile) {
        await savePerformanceProfile(performance);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Dependency analysis
program
  .command('dependencies')
  .description('Analyze test dependencies and imports')
  .argument('[path]', 'Path to analyze', '.')
  .option('--unused', 'Find unused test dependencies')
  .option('--circular', 'Detect circular dependencies')
  .option('--external', 'Analyze external dependencies')
  .action((targetPath, options) => {
    try {
      const analysis = analyzeDependencies(targetPath, {
        findUnused: options.unused,
        detectCircular: options.circular,
        analyzeExternal: options.external,
      });

      printDependencyReport(analysis);
    } catch (_error) {
      process.exit(1);
    }
  });

// Pattern analysis
program
  .command('patterns')
  .description('Analyze test patterns and anti-patterns')
  .argument('[path]', 'Path to analyze', '.')
  .option('--anti-patterns', 'Focus on anti-patterns only')
  .action(async (targetPath, options) => {
    try {
      const patterns = await analyzeTestPatterns(targetPath, {
        focusAntiPatterns: options.antiPatterns,
      });

      printPatternReport(patterns);
    } catch (_error) {
      process.exit(1);
    }
  });

// Complexity analysis
program
  .command('complexity')
  .description('Analyze test complexity and maintainability')
  .argument('[path]', 'Path to analyze', '.')
  .option('--threshold <number>', 'Complexity threshold', '10')
  .option(
    '--metrics <metrics>',
    'Metrics to analyze',
    'cyclomatic,cognitive,lines'
  )
  .action(async (targetPath, options) => {
    try {
      const metrics = options.metrics.split(',').map((m: string) => m.trim());
      const complexity = await analyzeComplexity(targetPath, {
        threshold: Number.parseInt(options.threshold),
        metrics,
      });

      printComplexityReport(complexity);
    } catch (_error) {
      process.exit(1);
    }
  });

// Duplication analysis
program
  .command('duplication')
  .description('Find duplicated test code and logic')
  .argument('[path]', 'Path to analyze', '.')
  .option('--threshold <number>', 'Minimum lines for duplication', '5')
  .option('--similarity <number>', 'Similarity threshold (0-1)', '0.8')
  .action(async (targetPath, options) => {
    try {
      const duplication = await analyzeDuplication(targetPath, {
        minLines: Number.parseInt(options.threshold),
        similarity: Number.parseFloat(options.similarity),
      });

      printDuplicationReport(duplication);
    } catch (_error) {
      process.exit(1);
    }
  });

// Comprehensive analysis
program
  .command('comprehensive')
  .description('Run comprehensive test suite analysis')
  .argument('[path]', 'Path to analyze', '.')
  .option('--output <file>', 'Output file for detailed report')
  .option(
    '--format <format>',
    'Report format (markdown, html, json)',
    'markdown'
  )
  .action(async (targetPath, options) => {
    try {
      const analysis = await runComprehensiveAnalysis(targetPath);

      let report: string;
      switch (options.format) {
        case 'html':
          report = formatAsHTML(analysis);
          break;
        case 'json':
          report = JSON.stringify(analysis, null, 2);
          break;
        default:
          report = formatAsMarkdown(analysis);
      }

      if (options.output) {
        await fs.writeFile(options.output, report);
      } else {
        process.stdout.write(report);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

// Helper functions and interfaces

interface CoverageAnalysis {
  overall: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  files: Array<{
    path: string;
    coverage: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
    uncoveredLines: number[];
  }>;
  gaps: Array<{
    file: string;
    type: 'file' | 'function' | 'branch';
    description: string;
  }>;
}

interface QualityAnalysis {
  score: number;
  issues: Array<{
    file: string;
    line: number;
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  summary: {
    totalFiles: number;
    totalIssues: number;
    ruleBreakdown: Record<string, number>;
  };
}

interface PerformanceAnalysis {
  totalTime: number;
  averageTime: number;
  runs: Array<{
    duration: number;
    testCount: number;
    slowTests: Array<{
      name: string;
      duration: number;
      file: string;
    }>;
  }>;
  trends: {
    improvement: number; // percentage change
    consistency: number; // coefficient of variation
  };
  recommendations: string[];
}

async function analyzeCoverage(
  targetPath: string,
  _options: { threshold: number; detailed: boolean }
): Promise<CoverageAnalysis> {
  try {
    const { stdout } = await execAsync(
      'pnpm test -- --coverage --reporter=json',
      { cwd: targetPath }
    );
    const coverageData = JSON.parse(stdout);

    return {
      overall: {
        lines: Math.round(coverageData.total?.lines?.pct || 0),
        functions: Math.round(coverageData.total?.functions?.pct || 0),
        branches: Math.round(coverageData.total?.branches?.pct || 0),
        statements: Math.round(coverageData.total?.statements?.pct || 0),
      },
      files: Object.entries(coverageData.coverage || {}).map(
        ([path, data]: [string, unknown]) => ({
          path,
          coverage: {
            lines: Math.round(data.lines?.pct || 0),
            functions: Math.round(data.functions?.pct || 0),
            branches: Math.round(data.branches?.pct || 0),
            statements: Math.round(data.statements?.pct || 0),
          },
          uncoveredLines: Object.keys(data.statementMap || {})
            .filter((line) => !data.s[line])
            .map((line) => Number.parseInt(line)),
        })
      ),
      gaps: [], // Would be populated with detailed gap analysis
    };
  } catch {
    return {
      overall: { lines: 0, functions: 0, branches: 0, statements: 0 },
      files: [],
      gaps: [],
    };
  }
}

async function analyzeTestQuality(
  targetPath: string,
  options: { rules: string[]; minSeverity: string }
): Promise<QualityAnalysis> {
  const testFiles = await findTestFiles(targetPath);
  const issues: QualityAnalysis['issues'] = [];
  const ruleBreakdown: Record<string, number> = {};

  for (const file of testFiles) {
    const content = await fs.readFile(file, 'utf8');
    const fileIssues = checkTestFileQuality(file, content, options.rules);
    issues.push(...fileIssues);

    for (const issue of fileIssues) {
      ruleBreakdown[issue.rule] = (ruleBreakdown[issue.rule] || 0) + 1;
    }
  }

  // Filter by severity
  const filteredIssues = issues.filter((issue) => {
    const severityOrder = { info: 0, warning: 1, error: 2 };
    return (
      severityOrder[issue.severity] >=
      severityOrder[options.minSeverity as keyof typeof severityOrder]
    );
  });

  const score = Math.max(0, 10 - filteredIssues.length / testFiles.length);

  return {
    score: Math.round(score),
    issues: filteredIssues,
    summary: {
      totalFiles: testFiles.length,
      totalIssues: filteredIssues.length,
      ruleBreakdown,
    },
  };
}

// Helper functions to reduce complexity
function checkNamingConventions(
  filePath: string,
  content: string
): QualityAnalysis['issues'] {
  const issues: QualityAnalysis['issues'] = [];
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec loop
  while ((match = TEST_NAMING_REGEX.exec(content)) !== null) {
    const testName = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;

    if (testName.length < 10) {
      issues.push({
        file: filePath,
        line: lineNumber,
        rule: 'naming',
        severity: 'warning',
        message: `Test name too short: "${testName}"`,
        suggestion:
          'Use descriptive test names that explain the behavior being tested',
      });
    }

    if (
      testName.includes('should work') ||
      testName.includes('works correctly')
    ) {
      issues.push({
        file: filePath,
        line: lineNumber,
        rule: 'naming',
        severity: 'error',
        message: `Generic test name: "${testName}"`,
        suggestion: 'Describe the specific behavior being tested',
      });
    }
  }

  return issues;
}

function checkTestStructure(
  filePath: string,
  content: string
): QualityAnalysis['issues'] {
  const issues: QualityAnalysis['issues'] = [];

  if (!content.includes('describe(')) {
    issues.push({
      file: filePath,
      line: 1,
      rule: 'structure',
      severity: 'warning',
      message: 'Missing describe blocks for test organization',
      suggestion: 'Group related tests using describe blocks',
    });
  }

  const testCount = (content.match(/it\(/g) || []).length;
  if (
    testCount > 3 &&
    !content.includes('beforeEach') &&
    !content.includes('afterEach')
  ) {
    issues.push({
      file: filePath,
      line: 1,
      rule: 'structure',
      severity: 'info',
      message: 'Consider adding setup/cleanup for multiple tests',
      suggestion: 'Use beforeEach/afterEach for common test setup and cleanup',
    });
  }

  return issues;
}

function checkMockingPractices(
  filePath: string,
  content: string
): QualityAnalysis['issues'] {
  const issues: QualityAnalysis['issues'] = [];

  if (content.includes('vi.mock') && !content.includes('vi.clearAllMocks')) {
    issues.push({
      file: filePath,
      line: 1,
      rule: 'mocking',
      severity: 'warning',
      message: 'Mocks used without proper cleanup',
      suggestion: 'Add vi.clearAllMocks() in beforeEach or afterEach',
    });
  }

  return issues;
}

function checkAssertionQuality(
  filePath: string,
  lines: string[]
): QualityAnalysis['issues'] {
  const issues: QualityAnalysis['issues'] = [];

  for (const [index, line] of lines.entries()) {
    if (line.includes('expect(') && line.includes('.toBe(true)')) {
      issues.push({
        file: filePath,
        line: index + 1,
        rule: 'assertions',
        severity: 'info',
        message: 'Generic boolean assertion found',
        suggestion:
          'Use more specific assertions like toBeInTheDocument(), toHaveClass(), etc.',
      });
    }

    if (line.includes('expect(') && INCOMPLETE_ASSERTION_REGEX.test(line)) {
      issues.push({
        file: filePath,
        line: index + 1,
        rule: 'assertions',
        severity: 'warning',
        message: 'Incomplete assertion detected',
        suggestion: 'Complete the assertion with expected value',
      });
    }
  }

  return issues;
}

function checkTestFileQuality(
  filePath: string,
  content: string,
  rules: string[]
): QualityAnalysis['issues'] {
  const issues: QualityAnalysis['issues'] = [];
  const lines = content.split('\n');

  if (rules.includes('naming')) {
    issues.push(...checkNamingConventions(filePath, content));
  }

  if (rules.includes('structure')) {
    issues.push(...checkTestStructure(filePath, content));
  }

  if (rules.includes('mocking')) {
    issues.push(...checkMockingPractices(filePath, content));
  }

  if (rules.includes('assertions')) {
    issues.push(...checkAssertionQuality(filePath, lines));
  }

  return issues;
}

async function analyzePerformance(options: {
  runs: number;
  generateProfile: boolean;
}): Promise<PerformanceAnalysis> {
  const runs: PerformanceAnalysis['runs'] = [];

  for (let i = 0; i < options.runs; i++) {
    const start = Date.now();

    try {
      const { stdout } = await execAsync('pnpm test -- --reporter=json');
      const result = JSON.parse(stdout);
      const duration = Date.now() - start;

      const slowTests =
        (result as PerformanceResult).testResults
          ?.flatMap((file: FileResult) =>
            file.assertionResults?.map((test: TestResult) => ({
              name: test.title,
              duration: test.duration || 0,
              file: file.name,
            }))
          )
          .filter((test) => test && test.duration > 1000) // Tests slower than 1s
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10) || [];

      runs.push({
        duration,
        testCount: result.numTotalTests || 0,
        slowTests,
      });
    } catch (_error) {
      runs.push({
        duration: Date.now() - start,
        testCount: 0,
        slowTests: [],
      });
    }
  }

  const totalTime = runs.reduce((sum, run) => sum + run.duration, 0);
  const averageTime = totalTime / runs.length;

  // Calculate trends
  const durations = runs.map((run) => run.duration);
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const variance =
    durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length;
  const consistency = Math.sqrt(variance) / mean; // Coefficient of variation

  const recommendations: string[] = [];

  if (averageTime > 30000) {
    // 30 seconds
    recommendations.push(
      'Consider parallelizing tests or optimizing slow test cases'
    );
  }

  if (consistency > 0.2) {
    recommendations.push(
      'Test execution time varies significantly - investigate flaky or environment-dependent tests'
    );
  }

  const allSlowTests = runs.flatMap((run) => run.slowTests);
  if (allSlowTests.length > 0) {
    recommendations.push(
      `${allSlowTests.length} slow tests detected - consider optimizing or marking as integration tests`
    );
  }

  return {
    totalTime,
    averageTime,
    runs,
    trends: {
      improvement: 0, // Would calculate based on historical data
      consistency,
    },
    recommendations,
  };
}

function analyzeDependencies(_targetPath: string, _options: unknown) {
  // Implementation would analyze test dependencies
  return {
    unused: [],
    circular: [],
    external: [],
    recommendations: [],
  };
}

function analyzeTestPatterns(_targetPath: string, _options: unknown) {
  // Implementation would analyze test patterns
  return {
    goodPatterns: [],
    antiPatterns: [],
    recommendations: [],
  };
}

function analyzeComplexity(_targetPath: string, _options: unknown) {
  // Implementation would analyze test complexity
  return {
    overall: 0,
    files: [],
    recommendations: [],
  };
}

function analyzeDuplication(_targetPath: string, _options: unknown) {
  // Implementation would analyze code duplication
  return {
    duplicates: [],
    totalLines: 0,
    duplicatedLines: 0,
    recommendations: [],
  };
}

async function runComprehensiveAnalysis(targetPath: string) {
  const [coverage, quality, performance, dependencies] = await Promise.all([
    analyzeCoverage(targetPath, { threshold: 80, detailed: true }),
    analyzeTestQuality(targetPath, {
      rules: ['naming', 'structure', 'mocking', 'assertions'],
      minSeverity: 'info',
    }),
    analyzePerformance({ runs: 3, generateProfile: false }),
    Promise.resolve(analyzeDependencies(targetPath, {})),
  ]);

  return {
    timestamp: new Date().toISOString(),
    path: targetPath,
    coverage,
    quality,
    performance,
    dependencies,
    summary: {
      overallScore: Math.round(
        (coverage.overall.lines +
          quality.score +
          (performance.averageTime < 10000 ? 10 : 5)) /
          3
      ),
      criticalIssues: quality.issues.filter((i) => i.severity === 'error')
        .length,
      recommendations: [
        ...performance.recommendations,
        ...(coverage.overall.lines < 80 ? ['Improve test coverage'] : []),
        ...(quality.score < 7 ? ['Address test quality issues'] : []),
      ],
    },
  };
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

// Print functions
function printCoverageTable(
  coverage: CoverageAnalysis,
  threshold: number
): void {
  const lowCoverageFiles = coverage.files.filter(
    (f) => f.coverage.lines < threshold
  );
  if (lowCoverageFiles.length > 0) {
    // Low coverage files would be logged here
    for (const _file of lowCoverageFiles) {
      // Display low coverage file info
    }
  }
}

function getSeverityEmoji(severity: string): string {
  if (severity === 'error') {
    return '❌';
  }
  if (severity === 'warning') {
    return '⚠️';
  }
  return 'ℹ️';
}

function printQualityReport(analysis: QualityAnalysis): void {
  if (analysis.issues.length === 0) {
    return;
  }

  const bySeverity = analysis.issues.reduce(
    (acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  for (const [severity, _count] of Object.entries(bySeverity)) {
    const _emoji = getSeverityEmoji(severity);
  }

  for (const issue of analysis.issues.slice(0, 10)) {
    const _severityEmoji = getSeverityEmoji(issue.severity);
    if (issue.suggestion) {
      // Issue suggestions would be displayed here
    }
  }
}

function printPerformanceReport(performance: PerformanceAnalysis): void {
  const allSlowTests = performance.runs.flatMap((run) => run.slowTests);
  if (allSlowTests.length > 0) {
    const uniqueSlowTests = allSlowTests
      .reduce((acc, test) => {
        const key = `${test.file}:${test.name}`;
        if (!acc.has(key) || acc.get(key)?.duration < test.duration) {
          acc.set(key, test);
        }
        return acc;
      }, new Map())
      .values();

    const topSlowTests = Array.from(uniqueSlowTests)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    // Top slow tests would be displayed here
    for (const _test of topSlowTests) {
      // Display test info
    }
  }

  if (performance.recommendations.length > 0) {
    for (const _rec of performance.recommendations) {
      // Display recommendation
    }
  }
}

function printDependencyReport(_analysis: unknown): void {
  // Implementation would print dependency analysis
}

function printPatternReport(_patterns: unknown): void {
  // Implementation would print pattern analysis
}

function printComplexityReport(_complexity: unknown): void {
  // Implementation would print complexity analysis
}

function printDuplicationReport(_duplication: unknown): void {
  // Implementation would print duplication analysis
}

// Removed unused function formatAsLCOV

function formatAsHTML(analysis: unknown): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Test Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .score { font-size: 2em; font-weight: bold; }
    .good { color: green; }
    .warning { color: orange; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Test Analysis Report</h1>
  <p>Generated: ${analysis.timestamp}</p>
  <div class="score">Overall Score: ${analysis.summary.overallScore}/10</div>
  <!-- More HTML content would go here -->
</body>
</html>`;
}

function formatAsMarkdown(analysis: unknown): string {
  return `# Test Analysis Report

Generated: ${analysis.timestamp}

## Summary

- **Overall Score**: ${analysis.summary.overallScore}/10
- **Critical Issues**: ${analysis.summary.criticalIssues}
- **Test Coverage**: ${analysis.coverage.overall.lines}%
- **Quality Score**: ${analysis.quality.score}/10
- **Average Test Time**: ${Math.round(analysis.performance.averageTime)}ms

## Coverage

| Metric | Coverage | Status |
|--------|----------|--------|
| Lines | ${analysis.coverage.overall.lines}% | ${analysis.coverage.overall.lines >= 80 ? '✅' : '❌'} |
| Functions | ${analysis.coverage.overall.functions}% | ${analysis.coverage.overall.functions >= 80 ? '✅' : '❌'} |
| Branches | ${analysis.coverage.overall.branches}% | ${analysis.coverage.overall.branches >= 80 ? '✅' : '❌'} |
| Statements | ${analysis.coverage.overall.statements}% | ${analysis.coverage.overall.statements >= 80 ? '✅' : '❌'} |

## Quality Issues

${
  analysis.quality.issues.length > 0
    ? analysis.quality.issues
        .slice(0, 10)
        .map(
          (issue: QualityAnalysis['issues'][0]) =>
            `- **${issue.severity}**: ${issue.message} (${path.basename(issue.file)}:${issue.line})`
        )
        .join('\n')
    : 'No quality issues found ✅'
}

## Recommendations

${analysis.summary.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
}

async function savePerformanceProfile(
  performance: PerformanceAnalysis
): Promise<void> {
  const profileData = {
    timestamp: new Date().toISOString(),
    runs: performance.runs,
    analysis: {
      averageTime: performance.averageTime,
      consistency: performance.trends.consistency,
    },
    slowTests: performance.runs.flatMap((run) => run.slowTests),
  };

  await fs.writeFile(
    'test-performance-profile.json',
    JSON.stringify(profileData, null, 2)
  );
}

if (require.main === module) {
  program.parse();
}

export { program };
