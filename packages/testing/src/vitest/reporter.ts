/**
 * SPDX-License-Identifier: MIT
 */

import type { File, Reporter, Task } from 'vitest';
import { type TestMetrics, TestMetricsTracker } from '../metrics';

/**
 * Custom Vitest reporter for quality metrics tracking
 */
export class QualityMetricsReporter implements Reporter {
  private startTime = 0;
  private metricsTracker: TestMetricsTracker;
  private slowTests: Array<{ name: string; duration: number }> = [];
  private retryCount = 0;

  constructor(packageName?: string) {
    this.metricsTracker = new TestMetricsTracker(packageName);
  }

  onInit() {
    this.startTime = Date.now();
  }

  onTaskUpdate(packs: [string, File | undefined][]) {
    // Track retry attempts for flakiness detection
    for (const [, file] of packs) {
      if (file) {
        this.trackTaskRetries(file);
      }
    }
  }

  onFinished(files: File[] = []) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Collect test statistics
    const stats = this.collectTestStats(files);

    // Track slow tests
    this.trackSlowTests(files);

    // Detect potential flaky tests
    const suspiciousTests = this.detectSuspiciousTests(files);

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    const metrics: TestMetrics = {
      timestamp: new Date().toISOString(),
      duration,
      totalTests: stats.total,
      passedTests: stats.passed,
      failedTests: stats.failed,
      skippedTests: stats.skipped,
      coverage: {
        lines: 0, // Will be populated by coverage reporter
        branches: 0,
        functions: 0,
        statements: 0,
      },
      slowTests: this.slowTests,
      flakeDetection: {
        suspiciousTests,
        retryCount: this.retryCount,
      },
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
      },
    };

    // Record metrics
    this.metricsTracker.recordMetrics(metrics);

    // Log quality insights
    this.logQualityInsights();
  }

  private collectTestStats(files: File[]) {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const countTests = (task: Task) => {
      if (task.type === 'test') {
        total++;
        if (task.mode === 'skip') {
          skipped++;
        } else if (task.result?.state === 'pass') {
          passed++;
        } else if (task.result?.state === 'fail') {
          failed++;
        }
      }
      task.tasks?.forEach(countTests);
    };

    for (const file of files) {
      countTests(file);
    }

    return { total, passed, failed, skipped };
  }

  private trackTaskRetries(file: File) {
    const countRetries = (task: Task) => {
      if (task.result?.retryCount && task.result.retryCount > 0) {
        this.retryCount += task.result.retryCount;
      }
      if (task.tasks) {
        for (const subtask of task.tasks) {
          countRetries(subtask);
        }
      }
    };

    countRetries(file);
  }

  private trackSlowTests(files: File[]) {
    const SLOW_TEST_THRESHOLD = 1000; // 1 second

    const collectSlowTests = (task: Task, filePath: string) => {
      if (
        task.type === 'test' &&
        task.result?.duration &&
        task.result.duration > SLOW_TEST_THRESHOLD
      ) {
        this.slowTests.push({
          name: `${filePath} > ${task.name}`,
          duration: task.result.duration,
        });
      }
      if (task.tasks) {
        for (const t of task.tasks) {
          collectSlowTests(t, filePath);
        }
      }
    };

    for (const file of files) {
      if (file.filepath) {
        collectSlowTests(file, file.filepath);
      }
    }

    // Sort by duration (slowest first)
    this.slowTests.sort((a, b) => b.duration - a.duration);

    // Keep only top 10 slowest tests
    this.slowTests = this.slowTests.slice(0, 10);
  }

  private detectSuspiciousTests(files: File[]): string[] {
    const suspicious: string[] = [];

    const checkSuspicious = (task: Task, filePath: string) => {
      if (
        task.type === 'test' &&
        task.result?.retryCount &&
        task.result.retryCount > 0 &&
        task.result.state === 'fail'
      ) {
        suspicious.push(`${filePath} > ${task.name}`);
      }

      // Check for tests with highly variable durations (if we had historical data)
      // This would require storing previous run data

      if (task.tasks) {
        for (const t of task.tasks) {
          checkSuspicious(t, filePath);
        }
      }
    };

    for (const file of files) {
      if (file.filepath) {
        checkSuspicious(file, file.filepath);
      }
    }

    return suspicious;
  }

  private logQualityInsights() {
    try {
      const insights = this.metricsTracker.generateInsights();

      if (insights.recommendations.length > 0) {
        // Log recommendations (implementation pending)
        // for (const rec of insights.recommendations) {
        //   console.log(rec);
        // }
      }

      if (this.slowTests.length > 0) {
        // Log slow tests (implementation pending)
        // for (const test of this.slowTests.slice(0, 5)) {
        //   console.log(`Slow test: ${test.name} - ${test.duration}ms`);
        // }
      }

      if (this.retryCount > 0) {
        // Log retry information (implementation pending)
        // console.log(`Tests with retries: ${this.retryCount}`);
      }
    } catch (_error) {
      // Silently continue if insights generation fails
    }
  }
}

/**
 * Create reporter instance for package
 */
export function createQualityReporter(packageName?: string) {
  return new QualityMetricsReporter(packageName);
}
