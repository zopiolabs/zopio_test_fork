/**
 * SPDX-License-Identifier: MIT
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Interactive coverage visualizer and analyzer
 */
export class CoverageVisualizer {
  private projectPath: string;
  private coverageData: CoverageData | null = null;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  /**
   * Generate and load coverage data
   */
  async loadCoverage(): Promise<CoverageData> {
    try {
      const { stdout } = await execAsync(
        'pnpm test -- --coverage --reporter=json',
        {
          cwd: this.projectPath,
        }
      );

      const testResult = JSON.parse(stdout);

      // Load coverage files
      const coverageDir = path.join(this.projectPath, 'coverage');
      const lcovPath = path.join(coverageDir, 'lcov.info');
      const jsonPath = path.join(coverageDir, 'coverage-final.json');

      let lcovData = '';
      let jsonData = {};

      try {
        lcovData = await fs.readFile(lcovPath, 'utf8');
      } catch {
        // Ignore if LCOV file doesn't exist
      }

      try {
        const jsonContent = await fs.readFile(jsonPath, 'utf8');
        jsonData = JSON.parse(jsonContent);
      } catch {
        // Ignore if JSON coverage file doesn't exist
      }

      this.coverageData = {
        summary: this.extractSummary(testResult),
        files: this.processFilesCoverage(jsonData),
        uncovered: this.findUncoveredLines(jsonData),
        hotspots: this.identifyHotspots(jsonData),
        trends: await this.analyzeTrends(),
        lcov: lcovData,
      };

      return this.coverageData;
    } catch (error: unknown) {
      throw new Error(
        `Failed to load coverage data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate interactive HTML coverage report
   */
  async generateInteractiveReport(outputPath?: string): Promise<string> {
    if (!this.coverageData) {
      await this.loadCoverage();
    }

    const reportPath =
      outputPath || path.join(this.projectPath, 'coverage-report.html');
    if (!this.coverageData) {
      throw new Error('Coverage data not loaded');
    }
    const htmlContent = this.generateHTMLReport(this.coverageData);

    await fs.writeFile(reportPath, htmlContent);

    return reportPath;
  }

  /**
   * Generate coverage heatmap for specific directory
   */
  async generateHeatmap(targetDir: string): Promise<CoverageHeatmap> {
    if (!this.coverageData) {
      await this.loadCoverage();
    }

    const files = this.coverageData?.files.filter((file) =>
      file.path.startsWith(targetDir)
    );

    const heatmap: CoverageHeatmap = {
      directory: targetDir,
      files: files.map((file) => ({
        path: file.path,
        coverage: file.coverage.lines.percentage,
        complexity: this.calculateComplexity(file),
        risk: this.calculateRisk(file),
        color: this.getCoverageColor(file.coverage.lines.percentage),
      })),
      summary: {
        totalFiles: files.length,
        averageCoverage:
          files.reduce((sum, f) => sum + f.coverage.lines.percentage, 0) /
          files.length,
        lowCoverageFiles: files.filter((f) => f.coverage.lines.percentage < 80)
          .length,
        highRiskFiles: files.filter((f) => this.calculateRisk(f) > 0.7).length,
      },
    };

    return heatmap;
  }

  /**
   * Find coverage gaps and suggest test priorities
   */
  async analyzeCoverageGaps(): Promise<CoverageGapAnalysis> {
    if (!this.coverageData) {
      await this.loadCoverage();
    }

    const gaps: CoverageGap[] = [];
    const priorities: TestPriority[] = [];

    if (!this.coverageData?.files) {
      return {
        gaps: [],
        priorities: [],
        recommendations: ['No coverage data available'],
        summary: {
          totalGaps: 0,
          criticalGaps: 0,
          estimatedEffort: 0,
        },
      };
    }

    for (const file of this.coverageData.files) {
      // Identify uncovered critical paths
      const criticalGaps = this.findCriticalGaps(file);
      gaps.push(...criticalGaps);

      // Calculate test priorities
      const priority = this.calculateTestPriority(file);
      if (priority.score > 0.5) {
        priorities.push(priority);
      }
    }

    return {
      gaps: gaps.sort((a, b) => b.impact - a.impact),
      priorities: priorities.sort((a, b) => b.score - a.score),
      recommendations: this.generateCoverageRecommendations(gaps, priorities),
      summary: {
        totalGaps: gaps.length,
        criticalGaps: gaps.filter((g) => g.impact > 0.8).length,
        estimatedEffort: priorities.reduce(
          (sum, p) => sum + p.estimatedHours,
          0
        ),
      },
    };
  }

  /**
   * Compare coverage between two commits/branches
   */
  async compareCoverage(
    baseline: string,
    current = 'HEAD'
  ): Promise<CoverageComparison> {
    // Get coverage for baseline
    await execAsync(`git checkout ${baseline}`, { cwd: this.projectPath });
    const baselineCoverage = await this.loadCoverage();

    // Get coverage for current
    await execAsync(`git checkout ${current}`, { cwd: this.projectPath });
    const currentCoverage = await this.loadCoverage();

    const comparison: CoverageComparison = {
      baseline: {
        commit: baseline,
        coverage: baselineCoverage.summary,
      },
      current: {
        commit: current,
        coverage: currentCoverage.summary,
      },
      changes: this.calculateCoverageChanges(baselineCoverage, currentCoverage),
      newFiles: currentCoverage.files.filter(
        (file) =>
          !baselineCoverage.files.some(
            (baseFile) => baseFile.path === file.path
          )
      ),
      deletedFiles: baselineCoverage.files.filter(
        (file) =>
          !currentCoverage.files.some(
            (currentFile) => currentFile.path === file.path
          )
      ),
      modifiedFiles: this.findModifiedFiles(baselineCoverage, currentCoverage),
    };

    return comparison;
  }

  /**
   * Generate coverage diff visualization
   */
  async generateDiffVisualization(
    comparison: CoverageComparison
  ): Promise<string> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Coverage Diff Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .improved { color: green; }
    .degraded { color: red; }
    .unchanged { color: gray; }
    .file-diff { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
    .coverage-bar { height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
    .coverage-fill { height: 100%; transition: width 0.3s ease; }
  </style>
</head>
<body>
  <h1>Coverage Diff Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Baseline:</strong> ${comparison.baseline.commit} (${comparison.baseline.coverage.lines.percentage}%)</p>
    <p><strong>Current:</strong> ${comparison.current.commit} (${comparison.current.coverage.lines.percentage}%)</p>
    <p><strong>Change:</strong> 
      <span class="${comparison.changes.lines.change >= 0 ? 'improved' : 'degraded'}">
        ${comparison.changes.lines.change >= 0 ? '+' : ''}${comparison.changes.lines.change.toFixed(2)}%
      </span>
    </p>
  </div>

  <div class="changes">
    <h2>File Changes</h2>
    ${comparison.modifiedFiles
      .map(
        (file) => `
      <div class="file-diff">
        <h3>${file.path}</h3>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${file.current.coverage.lines.percentage}%; background: ${this.getCoverageColor(file.current.coverage.lines.percentage)}"></div>
        </div>
        <p>Coverage: ${file.baseline.coverage.lines.percentage}% → ${file.current.coverage.lines.percentage}%</p>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;

    const diffPath = path.join(this.projectPath, 'coverage-diff.html');
    await fs.writeFile(diffPath, htmlContent);

    return diffPath;
  }

  /**
   * Track coverage trends over time
   */
  async trackTrends(commits: string[]): Promise<CoverageTrend[]> {
    const trends: CoverageTrend[] = [];

    for (const commit of commits) {
      try {
        await execAsync(`git checkout ${commit}`, { cwd: this.projectPath });
        const coverage = await this.loadCoverage();

        const commitInfo = await execAsync(
          `git show --format="%H %s %ad" --no-patch ${commit}`,
          {
            cwd: this.projectPath,
          }
        );

        const [hash, ...messageParts] = commitInfo.stdout.trim().split(' ');
        const message = messageParts.join(' ');

        trends.push({
          commit: hash,
          message,
          timestamp: new Date(), // Would parse from git
          coverage: coverage.summary,
          fileCount: coverage.files.length,
        });
      } catch {
        // Ignore failed coverage collection for this commit
      }
    }

    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Private helper methods

  private extractSummary(testResult: unknown): CoverageSummary {
    const total =
      testResult.coverageMap?.getCoverageSummary?.() || testResult.total || {};

    return {
      lines: {
        total: total.lines?.total || 0,
        covered: total.lines?.covered || 0,
        percentage: Math.round(total.lines?.pct || 0),
      },
      functions: {
        total: total.functions?.total || 0,
        covered: total.functions?.covered || 0,
        percentage: Math.round(total.functions?.pct || 0),
      },
      branches: {
        total: total.branches?.total || 0,
        covered: total.branches?.covered || 0,
        percentage: Math.round(total.branches?.pct || 0),
      },
      statements: {
        total: total.statements?.total || 0,
        covered: total.statements?.covered || 0,
        percentage: Math.round(total.statements?.pct || 0),
      },
    };
  }

  private processFilesCoverage(
    jsonData: Record<string, unknown>
  ): FileCoverage[] {
    const files: FileCoverage[] = [];

    for (const [filePath, data] of Object.entries(jsonData)) {
      const fileData = data as Record<string, unknown>;
      files.push(this.createFileCoverage(filePath, fileData));
    }

    return files;
  }

  private createFileCoverage(
    filePath: string,
    fileData: Record<string, unknown>
  ): FileCoverage {
    return {
      path: filePath,
      coverage: {
        lines: this.calculateLinesCoverage(fileData),
        functions: this.calculateFunctionsCoverage(fileData),
        branches: this.calculateBranchCoverage(fileData),
        statements: this.calculateStatementsCoverage(fileData),
      },
      uncoveredLines: this.extractUncoveredLines(fileData),
      uncoveredFunctions: this.extractUncoveredFunctions(fileData),
    };
  }

  private calculateLinesCoverage(
    fileData: Record<string, unknown>
  ): CoverageMetric {
    const total = Object.keys(fileData.statementMap || {}).length;
    const covered = Object.values(fileData.s || {}).filter(Boolean).length;
    return {
      total,
      covered,
      percentage: Math.round((covered / Math.max(1, total)) * 100),
    };
  }

  private calculateFunctionsCoverage(
    fileData: Record<string, unknown>
  ): CoverageMetric {
    const total = Object.keys(fileData.fnMap || {}).length;
    const covered = Object.values(fileData.f || {}).filter(Boolean).length;
    return {
      total,
      covered,
      percentage: Math.round((covered / Math.max(1, total)) * 100),
    };
  }

  private calculateBranchCoverage(
    fileData: Record<string, unknown>
  ): CoverageMetric {
    const total = Object.keys(fileData.branchMap || {}).length;
    const covered = Object.values(fileData.b || {})
      .flat()
      .filter(Boolean).length;
    const totalBranches = Object.values(fileData.b || {}).flat().length;
    return {
      total,
      covered,
      percentage: Math.round((covered / Math.max(1, totalBranches)) * 100),
    };
  }

  private calculateStatementsCoverage(
    fileData: Record<string, unknown>
  ): CoverageMetric {
    const total = Object.keys(fileData.statementMap || {}).length;
    const covered = Object.values(fileData.s || {}).filter(Boolean).length;
    return {
      total,
      covered,
      percentage: Math.round((covered / Math.max(1, total)) * 100),
    };
  }

  private extractUncoveredLines(fileData: Record<string, unknown>): number[] {
    return Object.entries(fileData.s || {})
      .filter(([, covered]) => !covered)
      .map(([line]) => Number.parseInt(line));
  }

  private extractUncoveredFunctions(
    fileData: Record<string, unknown>
  ): string[] {
    return Object.entries(fileData.f || {})
      .filter(([, covered]) => !covered)
      .map(([fnId]) => fileData.fnMap[fnId]?.name || `function_${fnId}`);
  }

  private findUncoveredLines(
    jsonData: Record<string, unknown>
  ): UncoveredRegion[] {
    const uncovered: UncoveredRegion[] = [];

    for (const [filePath, data] of Object.entries(jsonData)) {
      const fileData = data as Record<string, unknown>;

      // Find consecutive uncovered lines
      const uncoveredLines = Object.entries(fileData.s || {})
        .filter(([, covered]) => !covered)
        .map(([line]) => Number.parseInt(line))
        .sort((a, b) => a - b);

      let currentRegion: UncoveredRegion | null = null;

      for (const line of uncoveredLines) {
        if (!currentRegion || line > currentRegion.endLine + 1) {
          if (currentRegion) {
            uncovered.push(currentRegion);
          }
          currentRegion = {
            file: filePath,
            startLine: line,
            endLine: line,
            type: 'statement',
            severity: 'medium',
          };
        } else {
          currentRegion.endLine = line;
        }
      }

      if (currentRegion) {
        uncovered.push(currentRegion);
      }
    }

    return uncovered;
  }

  private identifyHotspots(
    jsonData: Record<string, unknown>
  ): CoverageHotspot[] {
    const hotspots: CoverageHotspot[] = [];

    for (const [filePath, data] of Object.entries(jsonData)) {
      const fileData = data as Record<string, unknown>;

      // Calculate complexity and coverage correlation
      const functionCount = Object.keys(fileData.fnMap || {}).length;
      const branchCount = Object.keys(fileData.branchMap || {}).length;
      const complexity = functionCount + branchCount;

      const linesCovered = Object.values(fileData.s || {}).filter(
        Boolean
      ).length;
      const totalLines = Object.keys(fileData.statementMap || {}).length;
      const coverage = totalLines > 0 ? linesCovered / totalLines : 1;

      if (complexity > 10 && coverage < 0.8) {
        hotspots.push({
          file: filePath,
          complexity,
          coverage: Math.round(coverage * 100),
          risk: (1 - coverage) * (complexity / 50), // Normalized risk score
          priority: 'high',
          reason: `High complexity (${complexity}) with low coverage (${Math.round(coverage * 100)}%)`,
        });
      }
    }

    return hotspots.sort((a, b) => b.risk - a.risk);
  }

  private analyzeTrends(): CoverageTrend[] {
    // Implementation would analyze historical coverage data
    return [];
  }

  private generateHTMLReport(coverageData: CoverageData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Interactive Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
    .file-list { margin-top: 30px; }
    .file-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
    .file-name { flex: 1; font-family: monospace; }
    .coverage-bar { width: 200px; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; margin: 0 10px; }
    .coverage-fill { height: 100%; transition: width 0.3s ease; }
    .coverage-text { width: 60px; text-align: right; font-weight: bold; }
    .hotspot { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Coverage Report</h1>
    
    <div class="summary">
      <div class="metric">
        <div class="metric-value">${coverageData.summary.lines.percentage}%</div>
        <div>Lines</div>
      </div>
      <div class="metric">
        <div class="metric-value">${coverageData.summary.functions.percentage}%</div>
        <div>Functions</div>
      </div>
      <div class="metric">
        <div class="metric-value">${coverageData.summary.branches.percentage}%</div>
        <div>Branches</div>
      </div>
      <div class="metric">
        <div class="metric-value">${coverageData.summary.statements.percentage}%</div>
        <div>Statements</div>
      </div>
    </div>

    <h2>Coverage Hotspots</h2>
    ${coverageData.hotspots
      .map(
        (hotspot) => `
      <div class="hotspot">
        <strong>${hotspot.file}</strong><br>
        Risk: ${Math.round(hotspot.risk * 100)}% | Complexity: ${hotspot.complexity} | Coverage: ${hotspot.coverage}%<br>
        <em>${hotspot.reason}</em>
      </div>
    `
      )
      .join('')}

    <h2>File Coverage</h2>
    <div class="file-list">
      ${coverageData.files
        .map(
          (file) => `
        <div class="file-item">
          <div class="file-name">${file.path}</div>
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${file.coverage.lines.percentage}%; background: ${this.getCoverageColor(file.coverage.lines.percentage)}"></div>
          </div>
          <div class="coverage-text">${file.coverage.lines.percentage}%</div>
        </div>
      `
        )
        .join('')}
    </div>
  </div>
</body>
</html>`;
  }

  private calculateComplexity(file: FileCoverage): number {
    // Simplified complexity calculation
    return file.coverage.functions.total + file.coverage.branches.total;
  }

  private calculateRisk(file: FileCoverage): number {
    const complexity = this.calculateComplexity(file);
    const coverage = file.coverage.lines.percentage / 100;
    return (1 - coverage) * Math.min(1, complexity / 20);
  }

  private getCoverageColor(percentage: number): string {
    if (percentage >= 90) {
      return '#28a745';
    }
    if (percentage >= 80) {
      return '#ffc107';
    }
    if (percentage >= 60) {
      return '#fd7e14';
    }
    return '#dc3545';
  }

  private findCriticalGaps(file: FileCoverage): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    if (file.coverage.lines.percentage < 50) {
      gaps.push({
        file: file.path,
        type: 'low-coverage',
        description: `Very low line coverage (${file.coverage.lines.percentage}%)`,
        impact: 0.9,
        effort: 'high',
        priority: 'critical',
      });
    }

    if (file.uncoveredFunctions.length > 0) {
      gaps.push({
        file: file.path,
        type: 'uncovered-functions',
        description: `${file.uncoveredFunctions.length} uncovered functions`,
        impact: 0.7,
        effort: 'medium',
        priority: 'high',
      });
    }

    return gaps;
  }

  private calculateTestPriority(file: FileCoverage): TestPriority {
    const complexity = this.calculateComplexity(file);
    const coverage = file.coverage.lines.percentage / 100;
    const risk = this.calculateRisk(file);

    const score = (1 - coverage) * 0.4 + (complexity / 50) * 0.3 + risk * 0.3;

    return {
      file: file.path,
      score,
      reasons: [
        coverage < 0.8 ? `Low coverage (${Math.round(coverage * 100)}%)` : null,
        complexity > 10 ? `High complexity (${complexity})` : null,
        risk > 0.5 ? `High risk (${Math.round(risk * 100)}%)` : null,
      ].filter(Boolean) as string[],
      estimatedHours: Math.ceil(score * 8), // Rough estimation
    };
  }

  private generateCoverageRecommendations(
    gaps: CoverageGap[],
    priorities: TestPriority[]
  ): string[] {
    const recommendations: string[] = [];

    if (gaps.some((g) => g.priority === 'critical')) {
      recommendations.push('Address critical coverage gaps immediately');
    }

    if (priorities.length > 10) {
      recommendations.push(
        'Consider implementing coverage requirements in CI/CD'
      );
    }

    const totalEffort = priorities.reduce(
      (sum, p) => sum + p.estimatedHours,
      0
    );
    if (totalEffort > 40) {
      recommendations.push(
        `Large testing effort estimated (${totalEffort}h) - consider phased approach`
      );
    }

    return recommendations;
  }

  private calculateCoverageChanges(
    baseline: CoverageData,
    current: CoverageData
  ): CoverageChanges {
    return {
      lines: {
        baseline: baseline.summary.lines.percentage,
        current: current.summary.lines.percentage,
        change:
          current.summary.lines.percentage - baseline.summary.lines.percentage,
      },
      functions: {
        baseline: baseline.summary.functions.percentage,
        current: current.summary.functions.percentage,
        change:
          current.summary.functions.percentage -
          baseline.summary.functions.percentage,
      },
      branches: {
        baseline: baseline.summary.branches.percentage,
        current: current.summary.branches.percentage,
        change:
          current.summary.branches.percentage -
          baseline.summary.branches.percentage,
      },
      statements: {
        baseline: baseline.summary.statements.percentage,
        current: current.summary.statements.percentage,
        change:
          current.summary.statements.percentage -
          baseline.summary.statements.percentage,
      },
    };
  }

  private findModifiedFiles(
    baseline: CoverageData,
    current: CoverageData
  ): ModifiedFile[] {
    const modified: ModifiedFile[] = [];

    for (const currentFile of current.files) {
      const baselineFile = baseline.files.find(
        (f) => f.path === currentFile.path
      );

      if (
        baselineFile &&
        baselineFile.coverage.lines.percentage !==
          currentFile.coverage.lines.percentage
      ) {
        modified.push({
          path: currentFile.path,
          baseline: baselineFile,
          current: currentFile,
          change:
            currentFile.coverage.lines.percentage -
            baselineFile.coverage.lines.percentage,
        });
      }
    }

    return modified.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }
}

// Types and interfaces

export interface CoverageData {
  summary: CoverageSummary;
  files: FileCoverage[];
  uncovered: UncoveredRegion[];
  hotspots: CoverageHotspot[];
  trends: CoverageTrend[];
  lcov: string;
}

export interface CoverageSummary {
  lines: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  statements: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface FileCoverage {
  path: string;
  coverage: CoverageSummary;
  uncoveredLines: number[];
  uncoveredFunctions: string[];
}

export interface UncoveredRegion {
  file: string;
  startLine: number;
  endLine: number;
  type: 'statement' | 'function' | 'branch';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CoverageHotspot {
  file: string;
  complexity: number;
  coverage: number;
  risk: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface CoverageTrend {
  commit: string;
  message: string;
  timestamp: Date;
  coverage: CoverageSummary;
  fileCount: number;
}

export interface CoverageHeatmap {
  directory: string;
  files: Array<{
    path: string;
    coverage: number;
    complexity: number;
    risk: number;
    color: string;
  }>;
  summary: {
    totalFiles: number;
    averageCoverage: number;
    lowCoverageFiles: number;
    highRiskFiles: number;
  };
}

export interface CoverageGapAnalysis {
  gaps: CoverageGap[];
  priorities: TestPriority[];
  recommendations: string[];
  summary: {
    totalGaps: number;
    criticalGaps: number;
    estimatedEffort: number;
  };
}

export interface CoverageGap {
  file: string;
  type:
    | 'low-coverage'
    | 'uncovered-functions'
    | 'missing-branches'
    | 'critical-path';
  description: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TestPriority {
  file: string;
  score: number;
  reasons: string[];
  estimatedHours: number;
}

export interface CoverageComparison {
  baseline: {
    commit: string;
    coverage: CoverageSummary;
  };
  current: {
    commit: string;
    coverage: CoverageSummary;
  };
  changes: CoverageChanges;
  newFiles: FileCoverage[];
  deletedFiles: FileCoverage[];
  modifiedFiles: ModifiedFile[];
}

export interface CoverageChanges {
  lines: CoverageChange;
  functions: CoverageChange;
  branches: CoverageChange;
  statements: CoverageChange;
}

export interface CoverageChange {
  baseline: number;
  current: number;
  change: number;
}

export interface ModifiedFile {
  path: string;
  baseline: FileCoverage;
  current: FileCoverage;
  change: number;
}

/**
 * Create a coverage visualizer instance
 */
export function createCoverageVisualizer(
  projectPath?: string
): CoverageVisualizer {
  return new CoverageVisualizer(projectPath);
}
