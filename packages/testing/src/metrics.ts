/**
 * SPDX-License-Identifier: MIT
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Test metrics tracking and reporting
 */

export interface TestMetrics {
  timestamp: string;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  slowTests: Array<{
    name: string;
    duration: number;
  }>;
  flakeDetection: {
    suspiciousTests: string[];
    retryCount: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface TestTrends {
  metrics: TestMetrics[];
  averages: {
    duration: number;
    coverage: TestMetrics['coverage'];
    passRate: number;
  };
  trends: {
    coverageTrend: 'improving' | 'stable' | 'declining';
    performanceTrend: 'improving' | 'stable' | 'declining';
    flakinessTrend: 'improving' | 'stable' | 'declining';
  };
}

/**
 * Track test metrics
 */
export class TestMetricsTracker {
  private metricsFile: string;
  private maxHistorySize = 100;

  constructor(packageName?: string) {
    this.metricsFile = packageName
      ? `./coverage/test-metrics-${packageName}.json`
      : './coverage/test-metrics.json';
  }

  /**
   * Record test run metrics
   */
  recordMetrics(metrics: TestMetrics): void {
    const history = this.loadHistory();
    history.push(metrics);

    // Keep only the last N entries
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }

    writeFileSync(this.metricsFile, JSON.stringify(history, null, 2));
  }

  /**
   * Load metrics history
   */
  loadHistory(): TestMetrics[] {
    if (!existsSync(this.metricsFile)) {
      return [];
    }

    try {
      const content = readFileSync(this.metricsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Calculate trends and insights
   */
  calculateTrends(): TestTrends {
    const metrics = this.loadHistory();
    if (metrics.length === 0) {
      throw new Error('No metrics data available');
    }

    const recent = metrics.slice(-10); // Last 10 runs
    const older = metrics.slice(0, -10);

    const averages = {
      duration: recent.reduce((acc, m) => acc + m.duration, 0) / recent.length,
      coverage: {
        lines:
          recent.reduce((acc, m) => acc + m.coverage.lines, 0) / recent.length,
        branches:
          recent.reduce((acc, m) => acc + m.coverage.branches, 0) /
          recent.length,
        functions:
          recent.reduce((acc, m) => acc + m.coverage.functions, 0) /
          recent.length,
        statements:
          recent.reduce((acc, m) => acc + m.coverage.statements, 0) /
          recent.length,
      },
      passRate:
        recent.reduce((acc, m) => acc + m.passedTests / m.totalTests, 0) /
        recent.length,
    };

    const trends = this.calculateTrendDirection(recent, older);

    return {
      metrics,
      averages,
      trends,
    };
  }

  /**
   * Detect flaky tests
   */
  detectFlakiness(metrics: TestMetrics[]): string[] {
    const _testResults = new Map<string, number[]>();

    // Analyze test patterns across runs
    for (const metric of metrics) {
      // This would need integration with actual test results
      // For now, detect based on retry patterns and duration variance
      if (metric.flakeDetection.retryCount > 0) {
        return metric.flakeDetection.suspiciousTests;
      }
    }

    return [];
  }

  /**
   * Generate performance insights
   */
  generateInsights(): {
    slowTests: string[];
    coverageGaps: string[];
    recommendations: string[];
  } {
    const trends = this.calculateTrends();
    const recommendations: string[] = [];
    const slowTests: string[] = [];
    const coverageGaps: string[] = [];

    // Performance analysis
    if (trends.trends.performanceTrend === 'declining') {
      recommendations.push(
        'Test performance is declining. Consider optimizing slow tests.'
      );
    }

    // Coverage analysis
    if (trends.averages.coverage.lines < 80) {
      coverageGaps.push('Overall line coverage below 80%');
      recommendations.push(
        'Increase test coverage, especially for core functionality.'
      );
    }

    // Flakiness analysis
    if (trends.trends.flakinessTrend === 'declining') {
      recommendations.push(
        'Test flakiness is increasing. Review and stabilize failing tests.'
      );
    }

    return {
      slowTests,
      coverageGaps,
      recommendations,
    };
  }

  private calculateTrendDirection(
    recent: TestMetrics[],
    older: TestMetrics[]
  ): TestTrends['trends'] {
    if (older.length === 0) {
      return {
        coverageTrend: 'stable',
        performanceTrend: 'stable',
        flakinessTrend: 'stable',
      };
    }

    const recentAvgCoverage =
      recent.reduce((acc, m) => acc + m.coverage.lines, 0) / recent.length;
    const olderAvgCoverage =
      older.reduce((acc, m) => acc + m.coverage.lines, 0) / older.length;
    const coverageDiff = recentAvgCoverage - olderAvgCoverage;

    const recentAvgDuration =
      recent.reduce((acc, m) => acc + m.duration, 0) / recent.length;
    const olderAvgDuration =
      older.reduce((acc, m) => acc + m.duration, 0) / older.length;
    const durationDiff = recentAvgDuration - olderAvgDuration;

    const recentFlakiness =
      recent.reduce((acc, m) => acc + m.flakeDetection.retryCount, 0) /
      recent.length;
    const olderFlakiness =
      older.reduce((acc, m) => acc + m.flakeDetection.retryCount, 0) /
      older.length;
    const flakinessDiff = recentFlakiness - olderFlakiness;

    // Determine coverage trend
    let coverageTrend: 'improving' | 'declining' | 'stable';
    if (coverageDiff > 2) {
      coverageTrend = 'improving';
    } else if (coverageDiff < -2) {
      coverageTrend = 'declining';
    } else {
      coverageTrend = 'stable';
    }

    // Determine performance trend
    let performanceTrend: 'improving' | 'declining' | 'stable';
    if (durationDiff < -1000) {
      performanceTrend = 'improving';
    } else if (durationDiff > 1000) {
      performanceTrend = 'declining';
    } else {
      performanceTrend = 'stable';
    }

    // Determine flakiness trend
    let flakinessTrend: 'improving' | 'declining' | 'stable';
    if (flakinessDiff < -0.1) {
      flakinessTrend = 'improving';
    } else if (flakinessDiff > 0.1) {
      flakinessTrend = 'declining';
    } else {
      flakinessTrend = 'stable';
    }

    return {
      coverageTrend,
      performanceTrend,
      flakinessTrend,
    };
  }
}

/**
 * Generate coverage badge data
 */
export function generateCoverageBadge(coverage: TestMetrics['coverage']): {
  schemaVersion: number;
  label: string;
  message: string;
  color: string;
} {
  const avgCoverage = Math.round(
    (coverage.lines +
      coverage.branches +
      coverage.functions +
      coverage.statements) /
      4
  );

  let color = 'red';
  if (avgCoverage >= 90) {
    color = 'brightgreen';
  } else if (avgCoverage >= 80) {
    color = 'green';
  } else if (avgCoverage >= 70) {
    color = 'yellow';
  } else if (avgCoverage >= 60) {
    color = 'orange';
  }

  return {
    schemaVersion: 1,
    label: 'coverage',
    message: `${avgCoverage}%`,
    color,
  };
}

/**
 * Export metrics for external systems
 */
export function exportMetricsForCI(metrics: TestMetrics): void {
  // Export for GitHub Actions
  if (process.env.GITHUB_ENV) {
    const exports = [
      `TEST_COVERAGE_LINES=${metrics.coverage.lines}`,
      `TEST_COVERAGE_BRANCHES=${metrics.coverage.branches}`,
      `TEST_COVERAGE_FUNCTIONS=${metrics.coverage.functions}`,
      `TEST_COVERAGE_STATEMENTS=${metrics.coverage.statements}`,
      `TEST_DURATION=${metrics.duration}`,
      `TEST_PASS_RATE=${((metrics.passedTests / metrics.totalTests) * 100).toFixed(2)}`,
    ];

    const envFile = process.env.GITHUB_ENV;
    const content = readFileSync(envFile, 'utf-8');
    writeFileSync(envFile, `${content}\n${exports.join('\n')}`);
  }

  // Export JSON summary for other systems
  const summary = {
    coverage: metrics.coverage,
    performance: {
      duration: metrics.duration,
      slowTestCount: metrics.slowTests.length,
    },
    quality: {
      passRate: (metrics.passedTests / metrics.totalTests) * 100,
      flakeScore: metrics.flakeDetection.retryCount,
    },
  };

  writeFileSync(
    './coverage/test-summary.json',
    JSON.stringify(summary, null, 2)
  );
}
