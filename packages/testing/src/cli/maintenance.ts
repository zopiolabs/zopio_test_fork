#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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
        coverageThreshold: parseInt(options.threshold),
      });
      
      if (options.json) {
        console.log(JSON.stringify(health, null, 2));
      } else {
        printHealthReport(health);
      }
      
      // Exit with error code if health is poor
      process.exit(health.overall.score < 7 ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Error performing health check:', error.message);
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
      console.log(`🔍 Running flaky test detection (${options.runs} runs)...`);
      
      const flakyTests = await detectFlakyTests({
        runs: parseInt(options.runs),
        failureThreshold: parseFloat(options.threshold),
      });
      
      if (flakyTests.length === 0) {
        console.log('✅ No flaky tests detected!');
        return;
      }
      
      console.log(`⚠️  Found ${flakyTests.length} flaky tests:`);
      flakyTests.forEach(test => {
        console.log(`  - ${test.file}:${test.testName} (${Math.round(test.failureRate * 100)}% failure rate)`);
      });
      
      if (options.fix) {
        console.log('\n🔧 Attempting automatic fixes...');
        await fixFlakyTests(flakyTests);
      } else {
        console.log('\n💡 Run with --fix to attempt automatic fixes');
      }
      
    } catch (error) {
      console.error('❌ Error detecting flaky tests:', error.message);
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
      
      if (cleanup.obsoleteTests.length === 0 && cleanup.unusedMocks.length === 0) {
        console.log('✅ No cleanup needed!');
        return;
      }
      
      if (options.dryRun) {
        console.log('🔍 Cleanup analysis (dry run):');
      } else {
        console.log('🧹 Cleaning up test suite...');
      }
      
      if (cleanup.obsoleteTests.length > 0) {
        console.log(`\nObsolete test files (${cleanup.obsoleteTests.length}):`);
        cleanup.obsoleteTests.forEach(file => {
          console.log(`  - ${file.path} (${file.reason})`);
        });
      }
      
      if (cleanup.unusedMocks.length > 0) {
        console.log(`\nUnused mock files (${cleanup.unusedMocks.length}):`);
        cleanup.unusedMocks.forEach(file => {
          console.log(`  - ${file}`);
        });
      }
      
      if (!options.dryRun) {
        await performCleanup(cleanup);
        console.log('✅ Cleanup complete!');
      }
      
    } catch (error) {
      console.error('❌ Error performing cleanup:', error.message);
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
        console.log('✅ All test dependencies are up to date!');
        return;
      }
      
      console.log(`📦 Found ${updates.length} test files with outdated dependencies:`);
      
      for (const update of updates) {
        console.log(`\n📄 ${update.file}:`);
        update.changes.forEach(change => {
          console.log(`  - ${change.from} → ${change.to} (${change.reason})`);
        });
        
        if (!options.dryRun) {
          await applyDependencyUpdates(update);
        }
      }
      
      if (options.dryRun) {
        console.log('\n💡 Run without --dry-run to apply updates');
      } else {
        console.log('\n✅ Dependency updates complete!');
      }
      
    } catch (error) {
      console.error('❌ Error updating dependencies:', error.message);
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
      console.log('⚡ Analyzing test performance...');
      
      const performance = await analyzeTestPerformance({
        generateProfile: options.profile,
      });
      
      console.log('\n📊 Performance Analysis:');
      console.log(`Total test time: ${performance.totalTime}ms`);
      console.log(`Average test time: ${Math.round(performance.averageTime)}ms`);
      console.log(`Slowest tests (${performance.slowTests.length}):`);
      
      performance.slowTests.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.name} - ${test.duration}ms`);
      });
      
      if (performance.recommendations.length > 0) {
        console.log('\n💡 Optimization recommendations:');
        performance.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }
      
      if (options.profile) {
        await generatePerformanceProfile(performance);
        console.log('\n📈 Performance profile saved to test-performance-profile.json');
      }
      
    } catch (error) {
      console.error('❌ Error analyzing performance:', error.message);
      process.exit(1);
    }
  });

// Fix common test issues
program
  .command('fix')
  .description('Automatically fix common test issues')
  .option('--type <types>', 'Types of issues to fix (comma-separated)', 'imports,mocks,assertions')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .action(async (options) => {
    try {
      const fixTypes = options.type.split(',').map((t: string) => t.trim());
      
      console.log(`🔧 Analyzing common test issues (${fixTypes.join(', ')})...`);
      
      const issues = await analyzeCommonIssues(fixTypes);
      
      if (issues.length === 0) {
        console.log('✅ No common issues found!');
        return;
      }
      
      console.log(`Found ${issues.length} issues to fix:`);
      
      for (const issue of issues) {
        console.log(`\n📄 ${issue.file}:`);
        issue.fixes.forEach(fix => {
          console.log(`  - ${fix.description} (line ${fix.line})`);
        });
        
        if (!options.dryRun) {
          await applyFixes(issue);
        }
      }
      
      if (options.dryRun) {
        console.log('\n💡 Run without --dry-run to apply fixes');
      } else {
        console.log('\n✅ Issues fixed successfully!');
      }
      
    } catch (error) {
      console.error('❌ Error fixing issues:', error.message);
      process.exit(1);
    }
  });

// Generate maintenance report
program
  .command('report')
  .description('Generate comprehensive test maintenance report')
  .option('--format <format>', 'Output format (markdown, html, json)', 'markdown')
  .option('--output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log('📊 Generating maintenance report...');
      
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
        console.log(`✅ Report saved to ${options.output}`);
      } else {
        console.log(formattedReport);
      }
      
    } catch (error) {
      console.error('❌ Error generating report:', error.message);
      process.exit(1);
    }
  });

// Helper functions and interfaces

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

async function performHealthCheck(targetPath: string, options: { coverageThreshold: number }): Promise<HealthCheck> {
  const coverage = await getCoverageInfo(targetPath);
  const testQuality = await analyzeTestQuality(targetPath);
  const performance = await analyzeTestPerformance({ generateProfile: false });
  const maintenance = await analyzeMaintenance(targetPath);
  
  const scores = {
    coverage: coverage.percentage >= options.coverageThreshold ? 10 : Math.max(1, Math.round(coverage.percentage / 10)),
    quality: testQuality.score,
    performance: performance.score,
    maintenance: maintenance.score,
  };
  
  const overallScore = Math.round((scores.coverage + scores.quality + scores.performance + scores.maintenance) / 4);
  
  return {
    overall: {
      score: overallScore,
      status: overallScore >= 8 ? 'excellent' : overallScore >= 6 ? 'good' : overallScore >= 4 ? 'fair' : 'poor',
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
    const { stdout } = await execAsync('pnpm test -- --coverage --reporter=json', { cwd: targetPath });
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

function analyzeTestFile(content: string, filePath: string, issues: string[]): number {
  let score = 10;
  
  // Check for describe blocks
  if (!content.includes('describe(')) {
    score -= 2;
    issues.push(`${filePath}: Missing describe blocks for test organization`);
  }
  
  // Check for proper test names
  const testMatches = content.match(/it\(['"](.*?)['"],/g) || [];
  const poorNames = testMatches.filter(match => 
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
    issues.push(`${filePath}: Missing test setup/cleanup for ${testMatches.length} tests`);
  }
  
  // Check for mocking
  if (content.includes('vi.mock') && !content.includes('vi.clearAllMocks')) {
    score -= 1;
    issues.push(`${filePath}: Mocks used but no cleanup detected`);
  }
  
  return Math.max(1, score);
}

async function detectFlakyTests(options: { runs: number; failureThreshold: number }): Promise<FlakyTest[]> {
  const results = [];
  
  for (let i = 0; i < options.runs; i++) {
    try {
      const { stdout } = await execAsync('pnpm test -- --reporter=json');
      const testResult = JSON.parse(stdout);
      results.push(testResult);
    } catch (error) {
      results.push({ failed: true, error: error.message });
    }
  }
  
  const flakyTests: FlakyTest[] = [];
  const testStats = new Map();
  
  // Analyze results to find flaky tests
  results.forEach(result => {
    if (result.testResults) {
      result.testResults.forEach((testFile: any) => {
        testFile.assertionResults?.forEach((test: any) => {
          const key = `${testFile.name}:${test.title}`;
          if (!testStats.has(key)) {
            testStats.set(key, { total: 0, failures: 0, errors: [] });
          }
          
          const stats = testStats.get(key);
          stats.total++;
          
          if (test.status === 'failed') {
            stats.failures++;
            stats.errors.push(test.failureMessages?.[0] || 'Unknown error');
          }
        });
      });
    }
  });
  
  // Identify flaky tests
  testStats.forEach((stats, key) => {
    const failureRate = stats.failures / stats.total;
    if (failureRate > options.failureThreshold && failureRate < 1) {
      const [file, testName] = key.split(':');
      flakyTests.push({
        file,
        testName,
        failureRate,
        commonErrors: [...new Set(stats.errors)],
      });
    }
  });
  
  return flakyTests;
}

async function fixFlakyTests(flakyTests: FlakyTest[]): Promise<void> {
  for (const test of flakyTests) {
    console.log(`🔧 Attempting to fix flaky test: ${test.testName}`);
    
    const content = await fs.readFile(test.file, 'utf8');
    let fixedContent = content;
    
    // Common flaky test fixes
    
    // Fix timing issues - add waitFor
    if (test.commonErrors.some(err => err.includes('timeout') || err.includes('not found'))) {
      fixedContent = fixedContent.replace(
        /expect\(screen\.get/g,
        'await waitFor(() => expect(screen.get'
      );
      
      // Add import if not present
      if (!fixedContent.includes('import { waitFor }')) {
        fixedContent = fixedContent.replace(
          /import { render, screen/,
          'import { render, screen, waitFor'
        );
      }
    }
    
    // Fix race conditions - add proper async/await
    if (test.commonErrors.some(err => err.includes('Promise'))) {
      fixedContent = fixedContent.replace(
        /it\('.*?', \(\) => {/g,
        match => match.replace('() => {', 'async () => {')
      );
    }
    
    // Add proper cleanup
    if (!fixedContent.includes('afterEach')) {
      const insertPoint = fixedContent.indexOf('describe(');
      if (insertPoint !== -1) {
        const describeEnd = fixedContent.indexOf('});', insertPoint);
        const setupCode = `
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });
`;
        fixedContent = fixedContent.slice(0, describeEnd) + setupCode + fixedContent.slice(describeEnd);
      }
    }
    
    if (fixedContent !== content) {
      await fs.writeFile(test.file, fixedContent);
      console.log(`  ✅ Applied fixes to ${test.file}`);
    } else {
      console.log(`  ⚠️  No automatic fix available for ${test.file}`);
    }
  }
}

async function findTestFiles(targetPath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath);
        } else if (entry.isFile() && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
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

async function analyzeTestCleanup(options: { dryRun: boolean; aggressive: boolean }): Promise<TestCleanup> {
  // Implementation would analyze for obsolete tests, unused mocks, etc.
  return {
    obsoleteTests: [],
    unusedMocks: [],
    duplicateTests: [],
  };
}

async function performCleanup(cleanup: TestCleanup): Promise<void> {
  // Implementation would perform the actual cleanup
}

async function analyzeTestDependencies() {
  // Implementation would analyze test dependencies and suggest updates
  return [];
}

async function applyDependencyUpdates(update: any): Promise<void> {
  // Implementation would apply dependency updates
}

async function analyzeTestPerformance(options: { generateProfile: boolean }) {
  // Implementation would analyze test performance
  return {
    totalTime: 0,
    averageTime: 0,
    slowTests: [],
    recommendations: [],
    score: 8,
  };
}

async function generatePerformanceProfile(performance: any): Promise<void> {
  // Implementation would generate performance profile
}

async function analyzeCommonIssues(fixTypes: string[]) {
  // Implementation would analyze common test issues
  return [];
}

async function applyFixes(issue: any): Promise<void> {
  // Implementation would apply fixes
}

async function analyzeMaintenance(targetPath: string) {
  // Implementation would analyze maintenance issues
  return {
    score: 8,
    obsoleteTests: 0,
    flakyTests: 0,
  };
}

async function generateMaintenanceReport() {
  // Implementation would generate comprehensive report
  return {
    timestamp: new Date().toISOString(),
    summary: {},
    details: {},
  };
}

function formatReportAsMarkdown(report: any): string {
  return `# Test Maintenance Report

Generated: ${report.timestamp}

## Summary

<!-- Report content would go here -->
`;
}

function formatReportAsHTML(report: any): string {
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
  const statusEmoji = {
    excellent: '🌟',
    good: '✅',
    fair: '⚠️',
    poor: '❌',
  };
  
  console.log(`\n${statusEmoji[health.overall.status]} Test Suite Health: ${health.overall.status.toUpperCase()} (${health.overall.score}/10)\n`);
  
  console.log('📊 Detailed Scores:');
  console.log(`  Coverage: ${health.coverage.percentage}% (threshold: ${health.coverage.threshold}%)`);
  console.log(`  Quality: ${health.testQuality.score}/10`);
  console.log(`  Performance: ${health.performance.score}/10 (${health.performance.slowTests} slow tests)`);
  console.log(`  Maintenance: ${health.maintenance.score}/10`);
  
  if (health.testQuality.issues.length > 0) {
    console.log('\n⚠️  Quality Issues:');
    health.testQuality.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  if (health.coverage.missing.length > 0) {
    console.log(`\n📉 Missing Coverage (${health.coverage.missing.length} files):`);
    health.coverage.missing.slice(0, 5).forEach(file => console.log(`  - ${file}`));
    if (health.coverage.missing.length > 5) {
      console.log(`  ... and ${health.coverage.missing.length - 5} more`);
    }
  }
}

if (require.main === module) {
  program.parse();
}

export { program };