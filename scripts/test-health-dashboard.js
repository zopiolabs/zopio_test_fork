#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Test Health Dashboard Generator
 * 
 * Generates a comprehensive HTML dashboard showing test suite health,
 * performance trends, coverage analysis, and quality metrics.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

class TestHealthDashboard {
  constructor() {
    this.projectRoot = resolve(process.cwd());
    this.dashboardData = {
      timestamp: new Date().toISOString(),
      overview: {},
      packages: {},
      trends: {},
      alerts: [],
      recommendations: []
    };
  }

  /**
   * Generate complete dashboard
   */
  async generate() {
    console.log('🔍 Analyzing test health...');
    
    try {
      await this.collectOverviewMetrics();
      await this.analyzePackages();
      await this.analyzeTrends();
      await this.generateAlerts();
      await this.generateRecommendations();
      await this.generateHTML();
      
      console.log('✅ Dashboard generated: ./test-health-dashboard.html');
    } catch (error) {
      console.error('❌ Dashboard generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Collect overview metrics
   */
  async collectOverviewMetrics() {
    console.log('  📊 Collecting overview metrics...');
    
    const overview = {
      totalPackages: 0,
      packagesWithTests: 0,
      overallCoverage: { lines: 0, branches: 0, functions: 0, statements: 0 },
      lastTestRun: null,
      testHealth: 'unknown',
      performanceScore: 0
    };

    // Count packages
    const packagesDir = join(this.projectRoot, 'packages');
    if (existsSync(packagesDir)) {
      const packages = readdirSync(packagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      overview.totalPackages = packages.length;
      
      // Count packages with tests
      for (const pkg of packages) {
        const testDir = join(packagesDir, pkg, '__tests__');
        const vitestConfig = join(packagesDir, pkg, 'vitest.config.ts');
        
        if (existsSync(testDir) || existsSync(vitestConfig)) {
          overview.packagesWithTests++;
        }
      }
    }

    // Collect aggregated coverage
    const coverageFile = join(this.projectRoot, 'coverage', 'coverage-summary.json');
    if (existsSync(coverageFile)) {
      try {
        const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
        if (coverage.total) {
          overview.overallCoverage = {
            lines: coverage.total.lines.pct,
            branches: coverage.total.branches.pct,
            functions: coverage.total.functions.pct,
            statements: coverage.total.statements.pct
          };
        }
      } catch (error) {
        console.warn('Could not parse coverage summary:', error.message);
      }
    }

    // Calculate health score
    const coverageAvg = (overview.overallCoverage.lines + overview.overallCoverage.branches + 
                        overview.overallCoverage.functions + overview.overallCoverage.statements) / 4;
    const testCoverage = overview.packagesWithTests / overview.totalPackages;
    
    overview.performanceScore = Math.round((coverageAvg * 0.6 + testCoverage * 100 * 0.4));
    
    if (overview.performanceScore >= 90) overview.testHealth = 'excellent';
    else if (overview.performanceScore >= 80) overview.testHealth = 'good';
    else if (overview.performanceScore >= 70) overview.testHealth = 'fair';
    else if (overview.performanceScore >= 60) overview.testHealth = 'poor';
    else overview.testHealth = 'critical';

    this.dashboardData.overview = overview;
  }

  /**
   * Analyze individual packages
   */
  async analyzePackages() {
    console.log('  📦 Analyzing packages...');
    
    const packagesDir = join(this.projectRoot, 'packages');
    if (!existsSync(packagesDir)) return;

    const packages = readdirSync(packagesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const pkg of packages) {
      const packageData = await this.analyzePackage(pkg);
      this.dashboardData.packages[pkg] = packageData;
    }
  }

  /**
   * Analyze individual package
   */
  async analyzePackage(packageName) {
    const packageDir = join(this.projectRoot, 'packages', packageName);
    const packageData = {
      name: packageName,
      hasTests: false,
      testCount: 0,
      coverage: null,
      lastRun: null,
      health: 'unknown',
      issues: [],
      metrics: {}
    };

    // Check for tests
    const testDir = join(packageDir, '__tests__');
    const vitestConfig = join(packageDir, 'vitest.config.ts');
    
    if (existsSync(testDir) || existsSync(vitestConfig)) {
      packageData.hasTests = true;
      
      // Count test files
      if (existsSync(testDir)) {
        const testFiles = readdirSync(testDir)
          .filter(file => file.endsWith('.test.ts') || file.endsWith('.test.tsx'));
        packageData.testCount = testFiles.length;
      }
    }

    // Check for package-specific coverage
    const coverageFile = join(packageDir, 'coverage', 'coverage-summary.json');
    if (existsSync(coverageFile)) {
      try {
        const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
        if (coverage.total) {
          packageData.coverage = {
            lines: coverage.total.lines.pct,
            branches: coverage.total.branches.pct,
            functions: coverage.total.functions.pct,
            statements: coverage.total.statements.pct
          };
        }
      } catch (error) {
        console.warn(`Could not parse coverage for ${packageName}:`, error.message);
      }
    }

    // Check for metrics
    const metricsFile = join(packageDir, 'coverage', `test-metrics-${packageName}.json`);
    if (existsSync(metricsFile)) {
      try {
        const metrics = JSON.parse(readFileSync(metricsFile, 'utf8'));
        if (metrics.length > 0) {
          const latest = metrics[metrics.length - 1];
          packageData.metrics = {
            duration: latest.duration,
            passRate: (latest.passedTests / latest.totalTests * 100).toFixed(2),
            slowTests: latest.slowTests.length,
            flakeDetection: latest.flakeDetection.retryCount
          };
        }
      } catch (error) {
        console.warn(`Could not parse metrics for ${packageName}:`, error.message);
      }
    }

    // Determine health
    if (!packageData.hasTests) {
      packageData.health = 'no-tests';
      packageData.issues.push('No tests found');
    } else if (packageData.coverage) {
      const avgCoverage = (packageData.coverage.lines + packageData.coverage.branches + 
                          packageData.coverage.functions + packageData.coverage.statements) / 4;
      
      if (avgCoverage >= 90) packageData.health = 'excellent';
      else if (avgCoverage >= 80) packageData.health = 'good';
      else if (avgCoverage >= 70) packageData.health = 'fair';
      else if (avgCoverage >= 60) packageData.health = 'poor';
      else packageData.health = 'critical';

      if (avgCoverage < 80) {
        packageData.issues.push(`Coverage below 80% (${avgCoverage.toFixed(1)}%)`);
      }
    } else {
      packageData.health = 'unknown';
    }

    // Check for performance issues
    if (packageData.metrics.slowTests > 0) {
      packageData.issues.push(`${packageData.metrics.slowTests} slow tests detected`);
    }

    if (packageData.metrics.flakeDetection > 0) {
      packageData.issues.push(`Flaky tests detected (${packageData.metrics.flakeDetection} retries)`);
    }

    return packageData;
  }

  /**
   * Analyze trends
   */
  async analyzeTrends() {
    console.log('  📈 Analyzing trends...');
    
    // This would require historical data
    // For now, create placeholder trends
    this.dashboardData.trends = {
      coverage: { direction: 'stable', change: 0 },
      performance: { direction: 'stable', change: 0 },
      testCount: { direction: 'improving', change: 5 },
      flakiness: { direction: 'stable', change: 0 }
    };
  }

  /**
   * Generate alerts
   */
  async generateAlerts() {
    console.log('  🚨 Generating alerts...');
    
    const alerts = [];

    // Check overall coverage
    const avgCoverage = (this.dashboardData.overview.overallCoverage.lines + 
                        this.dashboardData.overview.overallCoverage.branches + 
                        this.dashboardData.overview.overallCoverage.functions + 
                        this.dashboardData.overview.overallCoverage.statements) / 4;

    if (avgCoverage < 80) {
      alerts.push({
        level: 'warning',
        message: `Overall coverage is ${avgCoverage.toFixed(1)}% (below 80% threshold)`,
        action: 'Increase test coverage across packages'
      });
    }

    // Check packages without tests
    const packagesWithoutTests = Object.values(this.dashboardData.packages)
      .filter(pkg => !pkg.hasTests).length;

    if (packagesWithoutTests > 0) {
      alerts.push({
        level: 'error',
        message: `${packagesWithoutTests} packages have no tests`,
        action: 'Add test suites to untested packages'
      });
    }

    // Check for critical health packages
    const criticalPackages = Object.values(this.dashboardData.packages)
      .filter(pkg => pkg.health === 'critical').length;

    if (criticalPackages > 0) {
      alerts.push({
        level: 'error',
        message: `${criticalPackages} packages have critical test health`,
        action: 'Urgently improve test coverage for critical packages'
      });
    }

    this.dashboardData.alerts = alerts;
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations() {
    console.log('  💡 Generating recommendations...');
    
    const recommendations = [];

    // Coverage recommendations
    const lowCoveragePackages = Object.values(this.dashboardData.packages)
      .filter(pkg => pkg.coverage && 
        (pkg.coverage.lines + pkg.coverage.branches + pkg.coverage.functions + pkg.coverage.statements) / 4 < 80);

    if (lowCoveragePackages.length > 0) {
      recommendations.push({
        category: 'Coverage',
        priority: 'high',
        title: 'Improve coverage for low-coverage packages',
        description: `${lowCoveragePackages.length} packages have coverage below 80%`,
        packages: lowCoveragePackages.map(pkg => pkg.name)
      });
    }

    // Performance recommendations
    const slowPackages = Object.values(this.dashboardData.packages)
      .filter(pkg => pkg.metrics.slowTests > 0);

    if (slowPackages.length > 0) {
      recommendations.push({
        category: 'Performance',
        priority: 'medium',
        title: 'Optimize slow tests',
        description: `${slowPackages.length} packages have slow tests`,
        packages: slowPackages.map(pkg => pkg.name)
      });
    }

    // Test coverage recommendations
    const untestedPackages = Object.values(this.dashboardData.packages)
      .filter(pkg => !pkg.hasTests);

    if (untestedPackages.length > 0) {
      recommendations.push({
        category: 'Testing',
        priority: 'high',
        title: 'Add tests to untested packages',
        description: `${untestedPackages.length} packages have no tests`,
        packages: untestedPackages.map(pkg => pkg.name)
      });
    }

    this.dashboardData.recommendations = recommendations;
  }

  /**
   * Generate HTML dashboard
   */
  async generateHTML() {
    console.log('  🎨 Generating HTML dashboard...');
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Health Dashboard - Zopio</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        .header {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .header h1 { color: #1e293b; margin-bottom: 8px; }
        .header .subtitle { color: #64748b; font-size: 14px; }
        .header .timestamp { color: #94a3b8; font-size: 12px; margin-top: 8px; }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 24px; }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        
        .card h3 { margin-bottom: 16px; color: #1e293b; }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .metric:last-child { border-bottom: none; }
        
        .metric-value {
            font-weight: 600;
            font-size: 18px;
        }
        
        .health-excellent { color: #16a34a; }
        .health-good { color: #65a30d; }
        .health-fair { color: #d97706; }
        .health-poor { color: #dc2626; }
        .health-critical { color: #991b1b; }
        .health-unknown { color: #6b7280; }
        .health-no-tests { color: #9333ea; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 8px 0;
        }
        
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        
        .coverage-90 { background: #16a34a; }
        .coverage-80 { background: #65a30d; }
        .coverage-70 { background: #d97706; }
        .coverage-60 { background: #dc2626; }
        .coverage-low { background: #991b1b; }
        
        .alert {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 4px solid;
        }
        
        .alert-error {
            background: #fef2f2;
            color: #991b1b;
            border-color: #dc2626;
        }
        
        .alert-warning {
            background: #fffbeb;
            color: #92400e;
            border-color: #d97706;
        }
        
        .packages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        
        .package-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
        }
        
        .package-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .package-name { font-weight: 600; color: #1e293b; }
        .package-status { font-size: 12px; padding: 4px 8px; border-radius: 12px; }
        
        .recommendation {
            border-left: 4px solid;
            padding: 16px;
            margin-bottom: 12px;
            background: white;
            border-radius: 0 8px 8px 0;
        }
        
        .rec-high { border-color: #dc2626; }
        .rec-medium { border-color: #d97706; }
        .rec-low { border-color: #16a34a; }
        
        .packages-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 8px;
        }
        
        .package-tag {
            background: #e2e8f0;
            color: #475569;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Health Dashboard</h1>
            <div class="subtitle">Comprehensive test suite monitoring and analysis</div>
            <div class="timestamp">Generated: ${new Date(this.dashboardData.timestamp).toLocaleString()}</div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📊 Overview</h3>
                <div class="metric">
                    <span>Total Packages</span>
                    <span class="metric-value">${this.dashboardData.overview.totalPackages}</span>
                </div>
                <div class="metric">
                    <span>Packages with Tests</span>
                    <span class="metric-value">${this.dashboardData.overview.packagesWithTests}</span>
                </div>
                <div class="metric">
                    <span>Test Health</span>
                    <span class="metric-value health-${this.dashboardData.overview.testHealth}">
                        ${this.dashboardData.overview.testHealth.toUpperCase()}
                    </span>
                </div>
                <div class="metric">
                    <span>Performance Score</span>
                    <span class="metric-value">${this.dashboardData.overview.performanceScore}/100</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📈 Coverage Summary</h3>
                <div class="metric">
                    <span>Lines</span>
                    <span class="metric-value">${this.dashboardData.overview.overallCoverage.lines.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getCoverageClass(this.dashboardData.overview.overallCoverage.lines)}" 
                         style="width: ${this.dashboardData.overview.overallCoverage.lines}%"></div>
                </div>
                <div class="metric">
                    <span>Branches</span>
                    <span class="metric-value">${this.dashboardData.overview.overallCoverage.branches.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getCoverageClass(this.dashboardData.overview.overallCoverage.branches)}" 
                         style="width: ${this.dashboardData.overview.overallCoverage.branches}%"></div>
                </div>
                <div class="metric">
                    <span>Functions</span>
                    <span class="metric-value">${this.dashboardData.overview.overallCoverage.functions.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.getCoverageClass(this.dashboardData.overview.overallCoverage.functions)}" 
                         style="width: ${this.dashboardData.overview.overallCoverage.functions}%"></div>
                </div>
            </div>
        </div>
        
        ${this.dashboardData.alerts.length > 0 ? `
        <div class="card">
            <h3>🚨 Alerts</h3>
            ${this.dashboardData.alerts.map(alert => `
                <div class="alert alert-${alert.level}">
                    <strong>${alert.message}</strong><br>
                    <small>Action: ${alert.action}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="card">
            <h3>📦 Package Status</h3>
            <div class="packages-grid">
                ${Object.values(this.dashboardData.packages).map(pkg => `
                    <div class="package-card">
                        <div class="package-header">
                            <span class="package-name">${pkg.name}</span>
                            <span class="package-status health-${pkg.health}">${pkg.health.replace('-', ' ')}</span>
                        </div>
                        ${pkg.coverage ? `
                            <div style="margin-bottom: 8px;">
                                <small>Coverage: ${((pkg.coverage.lines + pkg.coverage.branches + pkg.coverage.functions + pkg.coverage.statements)/4).toFixed(1)}%</small>
                                <div class="progress-bar" style="height: 4px;">
                                    <div class="progress-fill ${this.getCoverageClass((pkg.coverage.lines + pkg.coverage.branches + pkg.coverage.functions + pkg.coverage.statements)/4)}" 
                                         style="width: ${(pkg.coverage.lines + pkg.coverage.branches + pkg.coverage.functions + pkg.coverage.statements)/4}%"></div>
                                </div>
                            </div>
                        ` : ''}
                        ${pkg.issues.length > 0 ? `
                            <div style="font-size: 12px; color: #dc2626;">
                                ${pkg.issues.map(issue => `• ${issue}`).join('<br>')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${this.dashboardData.recommendations.length > 0 ? `
        <div class="card">
            <h3>💡 Recommendations</h3>
            ${this.dashboardData.recommendations.map(rec => `
                <div class="recommendation rec-${rec.priority}">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    ${rec.packages ? `
                        <div class="packages-list">
                            ${rec.packages.map(pkg => `<span class="package-tag">${pkg}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    writeFileSync(join(this.projectRoot, 'test-health-dashboard.html'), html);
  }

  /**
   * Get CSS class for coverage percentage
   */
  getCoverageClass(percentage) {
    if (percentage >= 90) return 'coverage-90';
    if (percentage >= 80) return 'coverage-80';
    if (percentage >= 70) return 'coverage-70';
    if (percentage >= 60) return 'coverage-60';
    return 'coverage-low';
  }
}

// Run dashboard generation
const dashboard = new TestHealthDashboard();
dashboard.generate().catch(console.error);