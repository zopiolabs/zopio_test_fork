#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Test Suite Health Monitor
 * 
 * Continuous monitoring of test suite health with alerting capabilities.
 * Integrates with GitHub, Slack, and other notification systems.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

class TestMonitor {
  constructor(options = {}) {
    this.projectRoot = resolve(process.cwd());
    this.options = {
      // Alerting thresholds
      coverageThreshold: options.coverageThreshold || 80,
      performanceThreshold: options.performanceThreshold || 300000, // 5 minutes
      flakeThreshold: options.flakeThreshold || 3,
      failureThreshold: options.failureThreshold || 5,
      
      // Notification settings
      enableSlack: options.enableSlack || false,
      enableEmail: options.enableEmail || false,
      enableGitHub: options.enableGitHub || true,
      
      // Monitoring intervals
      checkInterval: options.checkInterval || 300000, // 5 minutes
      reportInterval: options.reportInterval || 86400000, // 24 hours
      
      ...options
    };
    
    this.alerts = [];
    this.metrics = {
      lastCheck: null,
      checks: 0,
      alerts: 0,
      issues: []
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    console.log('🔍 Starting test suite monitoring...');
    console.log(`  Coverage threshold: ${this.options.coverageThreshold}%`);
    console.log(`  Performance threshold: ${this.options.performanceThreshold}ms`);
    console.log(`  Check interval: ${this.options.checkInterval}ms`);
    
    // Initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.options.checkInterval);
    
    // Set up daily reports
    setInterval(() => {
      this.generateDailyReport();
    }, this.options.reportInterval);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping test monitor...');
      this.generateFinalReport();
      process.exit(0);
    });
    
    console.log('✅ Monitor started. Press Ctrl+C to stop.');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    console.log(`\n🔍 Health check #${++this.metrics.checks} - ${new Date().toLocaleString()}`);
    this.metrics.lastCheck = new Date().toISOString();
    
    const issues = [];
    
    try {
      // Check coverage
      const coverageIssues = await this.checkCoverage();
      issues.push(...coverageIssues);
      
      // Check test performance
      const performanceIssues = await this.checkPerformance();
      issues.push(...performanceIssues);
      
      // Check for flaky tests
      const flakeIssues = await this.checkFlakiness();
      issues.push(...flakeIssues);
      
      // Check test failures
      const failureIssues = await this.checkFailures();
      issues.push(...failureIssues);
      
      // Update metrics
      this.metrics.issues = issues;
      
      // Process alerts
      if (issues.length > 0) {
        await this.processAlerts(issues);
      } else {
        console.log('  ✅ All checks passed');
      }
      
      // Update health status
      await this.updateHealthStatus(issues);
      
    } catch (error) {
      console.error('  ❌ Health check failed:', error.message);
      issues.push({
        type: 'system',
        severity: 'critical',
        message: `Health check system failure: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check coverage thresholds
   */
  async checkCoverage() {
    const issues = [];
    const coverageFile = join(this.projectRoot, 'coverage', 'coverage-summary.json');
    
    if (!existsSync(coverageFile)) {
      issues.push({
        type: 'coverage',
        severity: 'warning',
        message: 'No coverage report found',
        timestamp: new Date().toISOString()
      });
      return issues;
    }
    
    try {
      const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
      const total = coverage.total;
      
      const metrics = {
        lines: total.lines.pct,
        branches: total.branches.pct,
        functions: total.functions.pct,
        statements: total.statements.pct
      };
      
      const avgCoverage = Object.values(metrics).reduce((a, b) => a + b, 0) / 4;
      
      if (avgCoverage < this.options.coverageThreshold) {
        issues.push({
          type: 'coverage',
          severity: 'error',
          message: `Overall coverage ${avgCoverage.toFixed(1)}% below threshold ${this.options.coverageThreshold}%`,
          details: metrics,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check individual metrics
      Object.entries(metrics).forEach(([metric, value]) => {
        if (value < this.options.coverageThreshold - 10) { // More lenient for individual metrics
          issues.push({
            type: 'coverage',
            severity: 'warning',
            message: `${metric} coverage ${value.toFixed(1)}% significantly below threshold`,
            details: { [metric]: value },
            timestamp: new Date().toISOString()
          });
        }
      });
      
    } catch (error) {
      issues.push({
        type: 'coverage',
        severity: 'error',
        message: `Failed to parse coverage report: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
    
    return issues;
  }

  /**
   * Check test performance
   */
  async checkPerformance() {
    const issues = [];
    
    // Check for recent test results
    const testResults = await this.findRecentTestResults();
    
    for (const result of testResults) {
      if (result.duration > this.options.performanceThreshold) {
        issues.push({
          type: 'performance',
          severity: 'warning',
          message: `Test suite "${result.name}" took ${(result.duration / 1000).toFixed(1)}s (threshold: ${(this.options.performanceThreshold / 1000).toFixed(1)}s)`,
          details: { duration: result.duration, threshold: this.options.performanceThreshold },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return issues;
  }

  /**
   * Check for flaky tests
   */
  async checkFlakiness() {
    const issues = [];
    
    // Look for test metrics files
    try {
      const metricsFiles = await this.findMetricsFiles();
      
      for (const file of metricsFiles) {
        const metrics = JSON.parse(readFileSync(file, 'utf8'));
        const recent = metrics.slice(-5); // Last 5 runs
        
        const totalRetries = recent.reduce((acc, m) => acc + (m.flakeDetection?.retryCount || 0), 0);
        
        if (totalRetries > this.options.flakeThreshold) {
          issues.push({
            type: 'flakiness',
            severity: 'warning',
            message: `Package "${file}" has ${totalRetries} test retries in recent runs`,
            details: { retries: totalRetries, threshold: this.options.flakeThreshold },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      // Silently continue if metrics files are not available
    }
    
    return issues;
  }

  /**
   * Check for test failures
   */
  async checkFailures() {
    const issues = [];
    
    try {
      // Run a quick test check
      const result = execSync('pnpm test -- --run --reporter=json --bail=5', { 
        encoding: 'utf8',
        timeout: 60000,
        stdio: 'pipe'
      });
      
      const testResult = JSON.parse(result);
      
      if (testResult.numFailedTests > this.options.failureThreshold) {
        issues.push({
          type: 'failures',
          severity: 'error',
          message: `${testResult.numFailedTests} tests failing (threshold: ${this.options.failureThreshold})`,
          details: {
            failed: testResult.numFailedTests,
            total: testResult.numTotalTests,
            threshold: this.options.failureThreshold
          },
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      // Test run failed
      issues.push({
        type: 'failures',
        severity: 'critical',  
        message: 'Test suite execution failed',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
    
    return issues;
  }

  /**
   * Process and send alerts
   */
  async processAlerts(issues) {
    console.log(`  🚨 ${issues.length} issues detected`);
    
    for (const issue of issues) {
      console.log(`    ${this.getSeverityIcon(issue.severity)} ${issue.message}`);
      
      // Add to alerts if not already present
      const existing = this.alerts.find(a => 
        a.type === issue.type && a.message === issue.message
      );
      
      if (!existing) {
        this.alerts.push(issue);
        this.metrics.alerts++;
        
        // Send notifications
        if (issue.severity === 'critical' || issue.severity === 'error') {
          await this.sendAlert(issue);
        }
      }
    }
  }

  /**
   * Send alert notification
   */
  async sendAlert(issue) {
    try {
      // GitHub issue creation
      if (this.options.enableGitHub && process.env.GITHUB_TOKEN) {
        await this.createGitHubIssue(issue);
      }
      
      // Slack notification
      if (this.options.enableSlack && process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(issue);
      }
      
      // Email notification
      if (this.options.enableEmail && process.env.EMAIL_CONFIG) {
        await this.sendEmailAlert(issue);
      }
      
    } catch (error) {
      console.error('    ❌ Failed to send alert:', error.message);
    }
  }

  /**
   * Create GitHub issue for critical alerts
   */
  async createGitHubIssue(issue) {
    if (issue.severity !== 'critical' && issue.severity !== 'error') return;
    
    const title = `🚨 Test Suite Alert: ${issue.message}`;
    const body = `
## Test Suite Health Alert

**Type:** ${issue.type}
**Severity:** ${issue.severity}
**Time:** ${issue.timestamp}

**Issue:** ${issue.message}

${issue.details ? `
**Details:**
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`
` : ''}

**Recommended Actions:**
${this.getRecommendedActions(issue).map(action => `- ${action}`).join('\n')}

---
*This issue was automatically created by the test monitoring system.*
`;

    // This would integrate with GitHub API
    console.log(`    📝 Would create GitHub issue: ${title}`);
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(issue) {
    const color = {
      critical: 'danger',
      error: 'danger', 
      warning: 'warning',
      info: 'good'
    }[issue.severity] || 'warning';
    
    const message = {
      text: `Test Suite Alert: ${issue.message}`,
      attachments: [{
        color,
        fields: [
          { title: 'Type', value: issue.type, short: true },
          { title: 'Severity', value: issue.severity, short: true },
          { title: 'Time', value: new Date(issue.timestamp).toLocaleString(), short: false }
        ]
      }]
    };
    
    console.log(`    📱 Would send Slack alert: ${issue.message}`);
  }

  /**
   * Update health status file
   */
  async updateHealthStatus(issues) {
    const status = {
      timestamp: new Date().toISOString(),
      healthy: issues.length === 0,
      issueCount: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      errorIssues: issues.filter(i => i.severity === 'error').length,
      warningIssues: issues.filter(i => i.severity === 'warning').length,
      issues: issues.slice(0, 10), // Keep only recent issues
      metrics: this.metrics
    };
    
    writeFileSync(
      join(this.projectRoot, 'test-health-status.json'),
      JSON.stringify(status, null, 2)
    );
  }

  /**
   * Generate daily report
   */
  async generateDailyReport() {
    console.log('\n📊 Generating daily test health report...');
    
    const report = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalChecks: this.metrics.checks,
        totalAlerts: this.metrics.alerts,
        currentIssues: this.metrics.issues.length,
        healthScore: this.calculateHealthScore()
      },
      issues: this.alerts.slice(-20), // Last 20 alerts
      recommendations: this.generateRecommendations()
    };
    
    const filename = `test-health-report-${report.date}.json`;
    writeFileSync(join(this.projectRoot, filename), JSON.stringify(report, null, 2));
    
    console.log(`  ✅ Daily report saved: ${filename}`);
    console.log(`  📈 Health score: ${report.summary.healthScore}/100`);
  }

  /**
   * Generate final report on shutdown
   */
  generateFinalReport() {
    console.log('\n📋 Generating final monitoring report...');
    
    const report = {
      sessionStart: this.metrics.sessionStart || new Date().toISOString(),
      sessionEnd: new Date().toISOString(),
      totalChecks: this.metrics.checks,
      totalAlerts: this.metrics.alerts,
      finalHealthScore: this.calculateHealthScore(),
      allAlerts: this.alerts
    };
    
    writeFileSync(
      join(this.projectRoot, 'test-monitor-final-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`  ✅ Final report saved`);
    console.log(`  📊 Session summary: ${this.metrics.checks} checks, ${this.metrics.alerts} alerts`);
  }

  // Helper methods
  getSeverityIcon(severity) {
    const icons = {
      critical: '🔥',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[severity] || '❓';
  }

  getRecommendedActions(issue) {
    const actions = {
      coverage: [
        'Run test coverage analysis to identify gaps',
        'Add unit tests for uncovered code paths',
        'Review and improve existing test quality'
      ],
      performance: [
        'Profile slow tests to identify bottlenecks',
        'Consider parallelization or test optimization',
        'Review test setup and teardown procedures'
      ],
      flakiness: [
        'Investigate and fix intermittent test failures',
        'Review test isolation and cleanup',
        'Consider using test retries as a temporary measure'
      ],
      failures: [
        'Investigate and fix failing tests immediately',
        'Review recent code changes for breaking changes',
        'Ensure test environment is properly configured'
      ]
    };
    
    return actions[issue.type] || ['Investigate and resolve the issue'];
  }

  calculateHealthScore() {
    const totalPossibleIssues = 10; // Baseline expectation
    const criticalWeight = 10;
    const errorWeight = 5;
    const warningWeight = 2;
    
    const currentIssues = this.metrics.issues || [];
    const criticalCount = currentIssues.filter(i => i.severity === 'critical').length;
    const errorCount = currentIssues.filter(i => i.severity === 'error').length;
    const warningCount = currentIssues.filter(i => i.severity === 'warning').length;
    
    const issueScore = (criticalCount * criticalWeight) + (errorCount * errorWeight) + (warningCount * warningWeight);
    const maxScore = totalPossibleIssues * criticalWeight;
    
    return Math.max(0, Math.round(100 - (issueScore / maxScore * 100)));
  }

  async findRecentTestResults() {
    // This would scan for recent test result files
    return []; // Placeholder
  }

  async findMetricsFiles() {
    // This would scan for test metrics files
    return []; // Placeholder
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    coverageThreshold: parseInt(process.env.COVERAGE_THRESHOLD) || 80,
    performanceThreshold: parseInt(process.env.PERFORMANCE_THRESHOLD) || 300000,
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 300000,
    enableSlack: process.env.ENABLE_SLACK === 'true',
    enableEmail: process.env.ENABLE_EMAIL === 'true',
    enableGitHub: process.env.ENABLE_GITHUB !== 'false'
  };
  
  const monitor = new TestMonitor(options);
  
  if (process.argv.includes('--one-shot')) {
    monitor.performHealthCheck().then(() => process.exit(0));
  } else {
    monitor.startMonitoring();
  }
}

export { TestMonitor };