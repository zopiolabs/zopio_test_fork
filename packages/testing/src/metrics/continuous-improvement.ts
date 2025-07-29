/**
 * SPDX-License-Identifier: MIT
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Continuous improvement framework for test suite quality
 */
export class ContinuousImprovementFramework {
  private projectPath: string;
  private metricsHistory: TestMetric[] = [];
  private feedbackLoop: FeedbackLoop;
  private improvementSuggestions: ImprovementEngine;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.feedbackLoop = new FeedbackLoop();
    this.improvementSuggestions = new ImprovementEngine();
  }

  /**
   * Initialize continuous improvement tracking
   */
  async initialize(): Promise<void> {
    // Load historical metrics
    await this.loadHistoricalMetrics();

    // Set up monitoring hooks
    await this.setupMonitoringHooks();

    // Initialize baseline metrics
    await this.collectBaselineMetrics();
  }

  /**
   * Collect current test metrics
   */
  async collectMetrics(): Promise<TestMetric> {
    const timestamp = new Date();

    const [coverage, quality, performance, maintenance] = await Promise.all([
      this.collectCoverageMetrics(),
      this.collectQualityMetrics(),
      this.collectPerformanceMetrics(),
      this.collectMaintenanceMetrics(),
    ]);

    const metric: TestMetric = {
      timestamp,
      coverage,
      quality,
      performance,
      maintenance,
      overall: this.calculateOverallScore(
        coverage,
        quality,
        performance,
        maintenance
      ),
    };

    this.metricsHistory.push(metric);
    await this.saveMetrics(metric);

    return metric;
  }

  /**
   * Analyze trends and generate insights
   */
  async analyzeTrends(periodDays = 30): Promise<TrendAnalysis> {
    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const recentMetrics = this.metricsHistory.filter(
      (m) => m.timestamp >= cutoffDate
    );

    if (recentMetrics.length < 2) {
      throw new Error('Insufficient data for trend analysis');
    }

    const trends: TrendAnalysis = {
      period: { start: cutoffDate, end: new Date() },
      coverage: this.calculateCoverageTrend(recentMetrics),
      quality: this.calculateQualityTrend(recentMetrics),
      performance: this.calculatePerformanceTrend(recentMetrics),
      maintenance: this.calculateMaintenanceTrend(recentMetrics),
      overall: this.calculateOverallTrend(recentMetrics),
      insights: this.generateTrendInsights(recentMetrics),
      predictions: await this.generatePredictions(recentMetrics),
    };

    return trends;
  }

  /**
   * Generate improvement recommendations
   */
  async generateRecommendations(): Promise<ImprovementRecommendation[]> {
    const currentMetrics = await this.collectMetrics();
    const trends = await this.analyzeTrends();

    return this.improvementSuggestions.generate(currentMetrics, trends);
  }

  /**
   * Execute improvement actions
   */
  async executeImprovement(
    recommendation: ImprovementRecommendation
  ): Promise<ImprovementResult> {
    const startTime = Date.now();
    const beforeMetrics = await this.collectMetrics();

    try {
      // Execute the improvement action
      const executionResult =
        await this.executeImprovementAction(recommendation);

      // Wait for effects to settle
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Collect after metrics
      const afterMetrics = await this.collectMetrics();
      const executionTime = Date.now() - startTime;

      const result: ImprovementResult = {
        recommendation,
        executed: true,
        executionTime,
        beforeMetrics,
        afterMetrics,
        impact: this.calculateImpact(beforeMetrics, afterMetrics),
        success: executionResult.success,
        details: executionResult.details,
        rollbackPossible: executionResult.rollbackPossible,
      };

      // Record feedback
      await this.feedbackLoop.recordImprovement(result);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      const result: ImprovementResult = {
        recommendation,
        executed: false,
        executionTime,
        beforeMetrics,
        afterMetrics: beforeMetrics,
        impact: {
          overall: 0,
          coverage: 0,
          quality: 0,
          performance: 0,
          maintenance: 0,
        },
        success: false,
        details: { error: error.message },
        rollbackPossible: false,
      };

      await this.feedbackLoop.recordImprovement(result);

      return result;
    }
  }

  /**
   * Generate comprehensive improvement report
   */
  async generateImprovementReport(): Promise<ImprovementReport> {
    const currentMetrics = await this.collectMetrics();
    const trends = await this.analyzeTrends();
    const recommendations = await this.generateRecommendations();
    const executedImprovements =
      await this.feedbackLoop.getExecutedImprovements();

    return {
      timestamp: new Date(),
      current: currentMetrics,
      trends,
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      executedImprovements: executedImprovements.slice(-20), // Last 20 improvements
      summary: {
        overallHealthScore: currentMetrics.overall,
        trendsDirection: this.getTrendsDirection(trends),
        priorityRecommendations: recommendations.filter(
          (r) => r.priority === 'high'
        ).length,
        recentImprovements: executedImprovements.filter(
          (i) =>
            i.recommendation.executedAt &&
            Date.now() - i.recommendation.executedAt.getTime() <
              7 * 24 * 60 * 60 * 1000
        ).length,
      },
      actionPlan: this.generateActionPlan(recommendations),
    };
  }

  /**
   * Set up automated monitoring and alerts
   */
  async setupAutomatedMonitoring(): Promise<void> {
    const monitoringConfig = {
      metrics: {
        collectInterval: 3600000, // 1 hour
        thresholds: {
          coverage: { min: 80, target: 90 },
          quality: { min: 7, target: 9 },
          performance: { maxSlowTests: 5, maxAvgTime: 10000 },
        },
      },
      alerts: {
        coverageDropThreshold: 5, // Alert if coverage drops by 5%
        qualityScoreMin: 6, // Alert if quality score goes below 6
        performanceDegradationThreshold: 20, // Alert if performance degrades by 20%
      },
      actions: {
        autoFix: true,
        createIssues: true,
        notifyTeam: true,
      },
    };

    await this.saveMonitoringConfig(monitoringConfig);
  }

  // Private helper methods

  private async loadHistoricalMetrics(): Promise<void> {
    try {
      const metricsPath = path.join(
        this.projectPath,
        '.test-metrics',
        'history.json'
      );
      const data = await fs.readFile(metricsPath, 'utf8');
      this.metricsHistory = JSON.parse(data).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch {
      // No historical data available
      this.metricsHistory = [];
    }
  }

  private async setupMonitoringHooks(): Promise<void> {
    // Set up Git hooks for automatic metric collection
    const hookScript = `#!/bin/sh
# Auto-generated by test improvement framework
npx test-maintenance health --json > .test-metrics/latest.json
`;

    const hooksDir = path.join(this.projectPath, '.git', 'hooks');
    const postCommitHook = path.join(hooksDir, 'post-commit');

    try {
      await fs.writeFile(postCommitHook, hookScript);
      await fs.chmod(postCommitHook, 0o755);
    } catch {}
  }

  private async collectBaselineMetrics(): Promise<void> {
    const _baseline = await this.collectMetrics();
  }

  private async collectCoverageMetrics(): Promise<CoverageMetrics> {
    try {
      const { stdout } = await execAsync(
        'pnpm test -- --coverage --reporter=json',
        {
          cwd: this.projectPath,
        }
      );

      const result = JSON.parse(stdout);
      const total = result.total || {};

      return {
        lines: Math.round(total.lines?.pct || 0),
        functions: Math.round(total.functions?.pct || 0),
        branches: Math.round(total.branches?.pct || 0),
        statements: Math.round(total.statements?.pct || 0),
        trend: 'stable', // Would be calculated from history
      };
    } catch {
      return {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
        trend: 'declining',
      };
    }
  }

  private async collectQualityMetrics(): Promise<QualityMetrics> {
    try {
      const testFiles = await this.findTestFiles();
      let totalScore = 0;
      let issueCount = 0;

      for (const file of testFiles) {
        const content = await fs.readFile(file, 'utf8');
        const analysis = this.analyzeTestFileQuality(content);
        totalScore += analysis.score;
        issueCount += analysis.issues;
      }

      const averageScore =
        testFiles.length > 0 ? totalScore / testFiles.length : 0;

      return {
        score: Math.round(averageScore),
        issues: issueCount,
        testFiles: testFiles.length,
        trend: 'improving', // Would be calculated from history
      };
    } catch {
      return { score: 0, issues: 0, testFiles: 0, trend: 'declining' };
    }
  }

  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const runs = 3;
      const durations = [];

      for (let i = 0; i < runs; i++) {
        const start = Date.now();
        await execAsync('pnpm test -- --run', { cwd: this.projectPath });
        durations.push(Date.now() - start);
      }

      const averageTime = durations.reduce((sum, d) => sum + d, 0) / runs;
      const slowTests = 0; // Would be calculated from detailed results

      return {
        averageExecutionTime: Math.round(averageTime),
        slowTestCount: slowTests,
        flakiness: 0, // Would be calculated from multiple runs
        trend: 'stable', // Would be calculated from history
      };
    } catch {
      return {
        averageExecutionTime: 0,
        slowTestCount: 0,
        flakiness: 0,
        trend: 'declining',
      };
    }
  }

  private async collectMaintenanceMetrics(): Promise<MaintenanceMetrics> {
    const testFiles = await this.findTestFiles();
    const sourceFiles = await this.findSourceFiles();

    return {
      testCoverage: testFiles.length / Math.max(1, sourceFiles.length),
      obsoleteTests: 0, // Would be calculated by analyzing unused tests
      duplicateTests: 0, // Would be calculated by analyzing similar tests
      trend: 'stable', // Would be calculated from history
    };
  }

  private calculateOverallScore(
    coverage: CoverageMetrics,
    quality: QualityMetrics,
    performance: PerformanceMetrics,
    maintenance: MaintenanceMetrics
  ): number {
    const coverageScore = coverage.lines / 10;
    const qualityScore = quality.score;
    const performanceScore = Math.max(0, 10 - performance.slowTestCount * 2);
    const maintenanceScore = Math.min(10, maintenance.testCoverage * 10);

    return Math.round(
      (coverageScore + qualityScore + performanceScore + maintenanceScore) / 4
    );
  }

  private calculateCoverageTrend(metrics: TestMetric[]): TrendData {
    const values = metrics.map((m) => m.coverage.lines);
    return this.calculateTrendData(values);
  }

  private calculateQualityTrend(metrics: TestMetric[]): TrendData {
    const values = metrics.map((m) => m.quality.score);
    return this.calculateTrendData(values);
  }

  private calculatePerformanceTrend(metrics: TestMetric[]): TrendData {
    const values = metrics.map((m) => m.performance.averageExecutionTime);
    return this.calculateTrendData(values, true); // Lower is better for performance
  }

  private calculateMaintenanceTrend(metrics: TestMetric[]): TrendData {
    const values = metrics.map((m) => m.maintenance.testCoverage * 10);
    return this.calculateTrendData(values);
  }

  private calculateOverallTrend(metrics: TestMetric[]): TrendData {
    const values = metrics.map((m) => m.overall);
    return this.calculateTrendData(values);
  }

  private calculateTrendData(
    values: number[],
    lowerIsBetter = false
  ): TrendData {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, confidence: 0 };
    }

    const recent = values.slice(-5); // Last 5 values
    const older = values.slice(-10, -5) || values.slice(0, -5);

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, v) => sum + v, 0) / older.length
        : recentAvg;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    const direction =
      Math.abs(change) < 2
        ? 'stable'
        : lowerIsBetter
          ? change < 0
            ? 'improving'
            : 'declining'
          : change > 0
            ? 'improving'
            : 'declining';

    return {
      direction,
      change: Math.round(change),
      confidence: Math.min(1, values.length / 10), // More data = higher confidence
    };
  }

  private generateTrendInsights(metrics: TestMetric[]): string[] {
    const insights: string[] = [];

    // Coverage insights
    const coverageTrend = this.calculateCoverageTrend(metrics);
    if (coverageTrend.direction === 'declining') {
      insights.push(
        `Coverage has been declining by ${Math.abs(coverageTrend.change)}% - consider prioritizing test writing`
      );
    }

    // Quality insights
    const qualityTrend = this.calculateQualityTrend(metrics);
    if (qualityTrend.direction === 'improving') {
      insights.push(
        `Test quality has been improving by ${qualityTrend.change}% - good progress on code standards`
      );
    }

    // Performance insights
    const performanceTrend = this.calculatePerformanceTrend(metrics);
    if (performanceTrend.direction === 'declining') {
      insights.push(
        `Test execution time increasing by ${Math.abs(performanceTrend.change)}% - investigate slow tests`
      );
    }

    return insights;
  }

  private async generatePredictions(
    metrics: TestMetric[]
  ): Promise<PredictionData[]> {
    const predictions: PredictionData[] = [];

    // Simple linear regression for predictions
    if (metrics.length >= 10) {
      const coverageValues = metrics.map((m) => m.coverage.lines);
      const coveragePrediction = this.predictNextValue(coverageValues);

      predictions.push({
        metric: 'coverage',
        predictedValue: Math.round(coveragePrediction),
        confidence: 0.7,
        timeframe: '30 days',
      });
    }

    return predictions;
  }

  private predictNextValue(values: number[]): number {
    // Simple linear trend prediction
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * n + intercept; // Predict next value
  }

  private async executeImprovementAction(
    recommendation: ImprovementRecommendation
  ): Promise<{
    success: boolean;
    details: any;
    rollbackPossible: boolean;
  }> {
    // Execute improvement based on type
    switch (recommendation.type) {
      case 'generate-missing-tests':
        return this.generateMissingTests(recommendation);

      case 'optimize-slow-tests':
        return this.optimizeSlowTests(recommendation);

      case 'fix-quality-issues':
        return this.fixQualityIssues(recommendation);

      case 'update-dependencies':
        return this.updateTestDependencies(recommendation);

      default:
        throw new Error(`Unknown improvement type: ${recommendation.type}`);
    }
  }

  private async generateMissingTests(
    recommendation: ImprovementRecommendation
  ): Promise<any> {
    try {
      await execAsync('npx scaffold-package complete .', {
        cwd: this.projectPath,
      });
      return {
        success: true,
        details: { testsGenerated: recommendation.estimatedImpact },
        rollbackPossible: true,
      };
    } catch (error: any) {
      return {
        success: false,
        details: { error: error.message },
        rollbackPossible: false,
      };
    }
  }

  private async optimizeSlowTests(
    _recommendation: ImprovementRecommendation
  ): Promise<any> {
    // Implementation would optimize slow tests
    return { success: true, details: {}, rollbackPossible: false };
  }

  private async fixQualityIssues(
    recommendation: ImprovementRecommendation
  ): Promise<any> {
    try {
      await execAsync('npx test-maintenance fix --type=all', {
        cwd: this.projectPath,
      });
      return {
        success: true,
        details: { issuesFixed: recommendation.estimatedImpact },
        rollbackPossible: true,
      };
    } catch (error: any) {
      return {
        success: false,
        details: { error: error.message },
        rollbackPossible: false,
      };
    }
  }

  private async updateTestDependencies(
    recommendation: ImprovementRecommendation
  ): Promise<any> {
    try {
      await execAsync('npx test-maintenance update-deps', {
        cwd: this.projectPath,
      });
      return {
        success: true,
        details: { dependenciesUpdated: recommendation.estimatedImpact },
        rollbackPossible: true,
      };
    } catch (error: any) {
      return {
        success: false,
        details: { error: error.message },
        rollbackPossible: false,
      };
    }
  }

  private calculateImpact(
    before: TestMetric,
    after: TestMetric
  ): ImpactMeasurement {
    return {
      overall: after.overall - before.overall,
      coverage: after.coverage.lines - before.coverage.lines,
      quality: after.quality.score - before.quality.score,
      performance:
        before.performance.averageExecutionTime -
        after.performance.averageExecutionTime,
      maintenance:
        (after.maintenance.testCoverage - before.maintenance.testCoverage) * 10,
    };
  }

  private getTrendsDirection(
    trends: TrendAnalysis
  ): 'improving' | 'declining' | 'stable' {
    const directions = [
      trends.coverage.direction,
      trends.quality.direction,
      trends.performance.direction,
      trends.maintenance.direction,
    ];

    const improving = directions.filter((d) => d === 'improving').length;
    const declining = directions.filter((d) => d === 'declining').length;

    if (improving > declining) {
      return 'improving';
    }
    if (declining > improving) {
      return 'declining';
    }
    return 'stable';
  }

  private generateActionPlan(
    recommendations: ImprovementRecommendation[]
  ): ActionPlan {
    const highPriority = recommendations.filter((r) => r.priority === 'high');
    const mediumPriority = recommendations.filter(
      (r) => r.priority === 'medium'
    );

    return {
      immediate: highPriority.slice(0, 3),
      shortTerm: mediumPriority.slice(0, 5),
      longTerm: recommendations.filter((r) => r.priority === 'low').slice(0, 3),
      estimatedTotalEffort: recommendations.reduce(
        (sum, r) => sum + r.estimatedEffort,
        0
      ),
    };
  }

  private async saveMetrics(metric: TestMetric): Promise<void> {
    const metricsDir = path.join(this.projectPath, '.test-metrics');
    await fs.mkdir(metricsDir, { recursive: true });

    // Save individual metric
    const filename = `metric-${metric.timestamp.toISOString().split('T')[0]}.json`;
    await fs.writeFile(
      path.join(metricsDir, filename),
      JSON.stringify(metric, null, 2)
    );

    // Update history
    const historyPath = path.join(metricsDir, 'history.json');
    await fs.writeFile(
      historyPath,
      JSON.stringify(this.metricsHistory, null, 2)
    );

    // Save latest
    const latestPath = path.join(metricsDir, 'latest.json');
    await fs.writeFile(latestPath, JSON.stringify(metric, null, 2));
  }

  private async saveMonitoringConfig(config: any): Promise<void> {
    const configPath = path.join(
      this.projectPath,
      '.test-metrics',
      'monitoring.json'
    );
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  private async findTestFiles(): Promise<string[]> {
    // Implementation to find test files
    return [];
  }

  private async findSourceFiles(): Promise<string[]> {
    // Implementation to find source files
    return [];
  }

  private analyzeTestFileQuality(content: string): {
    score: number;
    issues: number;
  } {
    // Basic quality analysis
    let score = 10;
    let issues = 0;

    if (!content.includes('describe(')) {
      score -= 2;
      issues++;
    }

    if (content.includes('console.log')) {
      score -= 1;
      issues++;
    }

    return { score: Math.max(0, score), issues };
  }
}

// Supporting classes

class FeedbackLoop {
  private improvements: ImprovementResult[] = [];

  async recordImprovement(result: ImprovementResult): Promise<void> {
    this.improvements.push(result);
    // Save to persistent storage
  }

  async getExecutedImprovements(): Promise<ImprovementResult[]> {
    return this.improvements;
  }
}

class ImprovementEngine {
  generate(
    currentMetrics: TestMetric,
    _trends: TrendAnalysis
  ): ImprovementRecommendation[] {
    const recommendations: ImprovementRecommendation[] = [];

    // Coverage recommendations
    if (currentMetrics.coverage.lines < 80) {
      recommendations.push({
        id: 'improve-coverage',
        title: 'Improve Test Coverage',
        description: `Coverage is at ${currentMetrics.coverage.lines}%, below the recommended 80%`,
        type: 'generate-missing-tests',
        priority: 'high',
        estimatedEffort: Math.ceil((80 - currentMetrics.coverage.lines) / 10),
        estimatedImpact: 80 - currentMetrics.coverage.lines,
        category: 'coverage',
      });
    }

    // Quality recommendations
    if (currentMetrics.quality.score < 7) {
      recommendations.push({
        id: 'improve-quality',
        title: 'Fix Test Quality Issues',
        description: `Test quality score is ${currentMetrics.quality.score}/10, with ${currentMetrics.quality.issues} issues`,
        type: 'fix-quality-issues',
        priority: 'medium',
        estimatedEffort: Math.ceil(currentMetrics.quality.issues / 5),
        estimatedImpact: currentMetrics.quality.issues,
        category: 'quality',
      });
    }

    // Performance recommendations
    if (currentMetrics.performance.slowTestCount > 5) {
      recommendations.push({
        id: 'optimize-performance',
        title: 'Optimize Slow Tests',
        description: `${currentMetrics.performance.slowTestCount} tests are running slowly`,
        type: 'optimize-slow-tests',
        priority: 'medium',
        estimatedEffort: currentMetrics.performance.slowTestCount * 0.5,
        estimatedImpact: currentMetrics.performance.slowTestCount,
        category: 'performance',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

// Types and interfaces

export interface TestMetric {
  timestamp: Date;
  coverage: CoverageMetrics;
  quality: QualityMetrics;
  performance: PerformanceMetrics;
  maintenance: MaintenanceMetrics;
  overall: number;
}

export interface CoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface QualityMetrics {
  score: number;
  issues: number;
  testFiles: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface PerformanceMetrics {
  averageExecutionTime: number;
  slowTestCount: number;
  flakiness: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface MaintenanceMetrics {
  testCoverage: number;
  obsoleteTests: number;
  duplicateTests: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface TrendAnalysis {
  period: { start: Date; end: Date };
  coverage: TrendData;
  quality: TrendData;
  performance: TrendData;
  maintenance: TrendData;
  overall: TrendData;
  insights: string[];
  predictions: PredictionData[];
}

export interface TrendData {
  direction: 'improving' | 'declining' | 'stable';
  change: number;
  confidence: number;
}

export interface PredictionData {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeframe: string;
}

export interface ImprovementRecommendation {
  id: string;
  title: string;
  description: string;
  type:
    | 'generate-missing-tests'
    | 'optimize-slow-tests'
    | 'fix-quality-issues'
    | 'update-dependencies';
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: number; // hours
  estimatedImpact: number;
  category: 'coverage' | 'quality' | 'performance' | 'maintenance';
  executedAt?: Date;
}

export interface ImprovementResult {
  recommendation: ImprovementRecommendation;
  executed: boolean;
  executionTime: number;
  beforeMetrics: TestMetric;
  afterMetrics: TestMetric;
  impact: ImpactMeasurement;
  success: boolean;
  details: any;
  rollbackPossible: boolean;
}

export interface ImpactMeasurement {
  overall: number;
  coverage: number;
  quality: number;
  performance: number;
  maintenance: number;
}

export interface ImprovementReport {
  timestamp: Date;
  current: TestMetric;
  trends: TrendAnalysis;
  recommendations: ImprovementRecommendation[];
  executedImprovements: ImprovementResult[];
  summary: {
    overallHealthScore: number;
    trendsDirection: 'improving' | 'declining' | 'stable';
    priorityRecommendations: number;
    recentImprovements: number;
  };
  actionPlan: ActionPlan;
}

export interface ActionPlan {
  immediate: ImprovementRecommendation[];
  shortTerm: ImprovementRecommendation[];
  longTerm: ImprovementRecommendation[];
  estimatedTotalEffort: number;
}

/**
 * Create a continuous improvement framework instance
 */
export function createContinuousImprovementFramework(
  projectPath?: string
): ContinuousImprovementFramework {
  return new ContinuousImprovementFramework(projectPath);
}
