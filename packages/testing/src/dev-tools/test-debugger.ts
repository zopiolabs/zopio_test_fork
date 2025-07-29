/**
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Interactive test debugger for troubleshooting failing tests
 */
export class TestDebugger {
  private testPath: string;
  private debugMode: boolean = false;
  private breakpoints: Map<string, number[]> = new Map();
  private watchedVariables: Set<string> = new Set();

  constructor(testPath: string) {
    this.testPath = testPath;
  }

  /**
   * Enable debug mode with enhanced logging
   */
  enableDebugMode(): void {
    this.debugMode = true;
    process.env.DEBUG = '1';
    process.env.VITEST_DEBUG = '1';
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.debugMode = false;
    delete process.env.DEBUG;
    delete process.env.VITEST_DEBUG;
  }

  /**
   * Add breakpoint to specific test file and line
   */
  addBreakpoint(filePath: string, lineNumber: number): void {
    if (!this.breakpoints.has(filePath)) {
      this.breakpoints.set(filePath, []);
    }
    this.breakpoints.get(filePath)!.push(lineNumber);
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(filePath: string, lineNumber: number): void {
    const breakpoints = this.breakpoints.get(filePath);
    if (breakpoints) {
      const index = breakpoints.indexOf(lineNumber);
      if (index > -1) {
        breakpoints.splice(index, 1);
      }
    }
  }

  /**
   * Watch variable during test execution
   */
  watchVariable(variableName: string): void {
    this.watchedVariables.add(variableName);
  }

  /**
   * Run single test with debugging enabled
   */
  async debugTest(testName?: string): Promise<DebugResult> {
    const startTime = Date.now();
    
    try {
      // Enable debug mode
      this.enableDebugMode();

      // Build command with debug options
      let command = 'pnpm test';
      
      if (testName) {
        command += ` -- --run "${testName}"`;
      } else {
        command += ` -- --run ${this.testPath}`;
      }

      // Add debug flags
      command += ' --reporter=verbose';
      
      if (this.debugMode) {
        command += ' --no-coverage';
        // Add inspector for Node.js debugging
        command = `NODE_OPTIONS="--inspect-brk=9229" ${command}`;
      }

      console.log(`🐛 Running debug session: ${command}`);
      console.log('💡 Connect your debugger to localhost:9229');

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 60000, // 1 minute timeout
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        output: stdout,
        errors: stderr,
        breakpointsHit: this.getBreakpointsHit(stdout),
        variableValues: this.extractVariableValues(stdout),
        suggestions: this.generateDebugSuggestions(stdout, stderr),
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        duration,
        output: error.stdout || '',
        errors: error.stderr || error.message,
        breakpointsHit: [],
        variableValues: new Map(),
        suggestions: this.generateErrorSuggestions(error),
      };
    } finally {
      this.disableDebugMode();
    }
  }

  /**
   * Analyze test failure and provide debugging insights
   */
  async analyzeFailure(testOutput: string): Promise<FailureAnalysis> {
    const analysis: FailureAnalysis = {
      errorType: this.detectErrorType(testOutput),
      rootCause: await this.findRootCause(testOutput),
      stackTrace: this.parseStackTrace(testOutput),
      contextVariables: this.extractContextVariables(testOutput),
      suggestedFixes: [],
      relatedIssues: [],
    };

    // Generate suggestions based on error type
    analysis.suggestedFixes = await this.generateFixSuggestions(analysis);
    analysis.relatedIssues = await this.findRelatedIssues(analysis);

    return analysis;
  }

  /**
   * Create interactive debugging session
   */
  async startInteractiveSession(): Promise<void> {
    console.log('🎯 Starting interactive debugging session...');
    console.log('Available commands:');
    console.log('  - debug: Run test with debugger');
    console.log('  - breakpoint <file> <line>: Add breakpoint');
    console.log('  - watch <variable>: Watch variable');
    console.log('  - analyze: Analyze last failure');
    console.log('  - help: Show this help');
    console.log('  - exit: Exit session\n');

    // In a real implementation, this would use readline or inquirer
    // for interactive command input
    console.log('💡 Interactive session would start here');
  }

  /**
   * Generate test isolation sandbox
   */
  async createTestSandbox(testFile: string): Promise<TestSandbox> {
    const sandboxDir = path.join(process.cwd(), '.test-sandbox', Date.now().toString());
    await fs.mkdir(sandboxDir, { recursive: true });

    // Copy test file and dependencies
    const testContent = await fs.readFile(testFile, 'utf8');
    const dependencies = this.extractDependencies(testContent);

    // Create isolated environment
    const sandboxTestFile = path.join(sandboxDir, path.basename(testFile));
    await fs.writeFile(sandboxTestFile, testContent);

    // Copy dependencies
    for (const dep of dependencies) {
      try {
        const depPath = require.resolve(dep, { paths: [path.dirname(testFile)] });
        const depContent = await fs.readFile(depPath, 'utf8');
        const sandboxDepPath = path.join(sandboxDir, path.basename(depPath));
        await fs.writeFile(sandboxDepPath, depContent);
      } catch {
        // Dependency not found or external module
      }
    }

    return {
      path: sandboxDir,
      testFile: sandboxTestFile,
      cleanup: async () => {
        await fs.rm(sandboxDir, { recursive: true, force: true });
      },
    };
  }

  /**
   * Profile test execution performance
   */
  async profileExecution(testFile: string): Promise<ExecutionProfile> {
    const startTime = process.hrtime.bigint();
    const initialMemory = process.memoryUsage();

    try {
      const { stdout } = await execAsync(
        `pnpm test -- --run ${testFile} --reporter=json`,
        { cwd: process.cwd() }
      );

      const endTime = process.hrtime.bigint();
      const finalMemory = process.memoryUsage();
      const result = JSON.parse(stdout);

      return {
        duration: Number(endTime - startTime) / 1000000, // Convert to milliseconds
        memoryUsage: {
          initial: initialMemory,
          final: finalMemory,
          peak: finalMemory.heapUsed - initialMemory.heapUsed,
        },
        testCount: result.numTotalTests || 0,
        passedTests: result.numPassedTests || 0,
        failedTests: result.numFailedTests || 0,
        slowTests: this.identifySlowTests(result),
        bottlenecks: this.identifyBottlenecks(result),
      };

    } catch (error: any) {
      const endTime = process.hrtime.bigint();
      
      return {
        duration: Number(endTime - startTime) / 1000000,
        memoryUsage: {
          initial: initialMemory,
          final: process.memoryUsage(),
          peak: 0,
        },
        testCount: 0,
        passedTests: 0,
        failedTests: 1,
        slowTests: [],
        bottlenecks: [],
        error: error.message,
      };
    }
  }

  // Private helper methods

  private detectErrorType(output: string): ErrorType {
    if (output.includes('timeout')) return 'timeout';
    if (output.includes('AssertionError')) return 'assertion';
    if (output.includes('TypeError')) return 'type';
    if (output.includes('ReferenceError')) return 'reference';
    if (output.includes('SyntaxError')) return 'syntax';
    if (output.includes('Module not found')) return 'import';
    if (output.includes('Network')) return 'network';
    return 'unknown';
  }

  private async findRootCause(output: string): Promise<string> {
    // Analyze stack trace and error patterns to identify root cause
    const lines = output.split('\n');
    const errorLine = lines.find(line => 
      line.includes('Error:') || line.includes('Failed:')
    );

    if (errorLine) {
      // Extract specific error message
      const match = errorLine.match(/Error: (.+)/) || errorLine.match(/Failed: (.+)/);
      if (match) {
        return match[1].trim();
      }
    }

    return 'Unable to determine root cause';
  }

  private parseStackTrace(output: string): StackFrame[] {
    const lines = output.split('\n');
    const stackFrames: StackFrame[] = [];
    
    let inStackTrace = false;
    
    for (const line of lines) {
      if (line.includes('at ') && (line.includes('.test.') || line.includes('.spec.'))) {
        inStackTrace = true;
      }
      
      if (inStackTrace && line.trim().startsWith('at ')) {
        const match = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
        if (match) {
          stackFrames.push({
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
          });
        }
      }
      
      if (inStackTrace && !line.trim().startsWith('at ') && line.trim() !== '') {
        break;
      }
    }
    
    return stackFrames;
  }

  private extractContextVariables(output: string): Map<string, any> {
    const variables = new Map<string, any>();
    
    // Look for logged variable values
    const lines = output.split('\n');
    for (const line of lines) {
      // Look for console.log patterns with variable names
      const match = line.match(/(\w+):\s*(.+)/);
      if (match) {
        try {
          variables.set(match[1], JSON.parse(match[2]));
        } catch {
          variables.set(match[1], match[2]);
        }
      }
    }
    
    return variables;
  }

  private async generateFixSuggestions(analysis: FailureAnalysis): Promise<string[]> {
    const suggestions: string[] = [];
    
    switch (analysis.errorType) {
      case 'timeout':
        suggestions.push('Increase test timeout with { timeout: 10000 }');
        suggestions.push('Check for infinite loops or hanging promises');
        suggestions.push('Use waitFor() for DOM updates');
        break;
        
      case 'assertion':
        suggestions.push('Check expected vs actual values');
        suggestions.push('Verify test data setup');
        suggestions.push('Use more specific matchers');
        break;
        
      case 'import':
        suggestions.push('Check import paths and file extensions');
        suggestions.push('Verify module is installed and exported');
        suggestions.push('Update vitest.config.ts aliases');
        break;
        
      case 'type':
        suggestions.push('Check TypeScript types and interfaces');
        suggestions.push('Verify mock return types');
        suggestions.push('Add proper type assertions');
        break;
        
      default:
        suggestions.push('Review error message and stack trace');
        suggestions.push('Check test setup and teardown');
        suggestions.push('Verify mock configurations');
    }
    
    return suggestions;
  }

  private async findRelatedIssues(analysis: FailureAnalysis): Promise<RelatedIssue[]> {
    // In a real implementation, this would search through:
    // - Git history for similar issues
    // - Documentation for known issues
    // - Stack Overflow or issue trackers
    
    return [
      {
        type: 'documentation',
        title: 'Common Test Debugging Patterns',
        url: '/docs/troubleshooting.md',
        relevance: 0.8,
      },
    ];
  }

  private getBreakpointsHit(output: string): string[] {
    // Parse output for breakpoint hits
    return [];
  }

  private extractVariableValues(output: string): Map<string, any> {
    return new Map();
  }

  private generateDebugSuggestions(stdout: string, stderr: string): string[] {
    const suggestions: string[] = [];
    
    if (stderr.includes('timeout')) {
      suggestions.push('Consider increasing test timeout');
    }
    
    if (stdout.includes('console.log')) {
      suggestions.push('Remove console.log statements before committing');
    }
    
    return suggestions;
  }

  private generateErrorSuggestions(error: any): string[] {
    const suggestions: string[] = [];
    
    if (error.code === 'TIMEOUT') {
      suggestions.push('Test execution timed out - check for infinite loops');
    }
    
    return suggestions;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    // Extract require statements
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    return [...new Set(dependencies)];
  }

  private identifySlowTests(result: any): SlowTest[] {
    const slowTests: SlowTest[] = [];
    
    if (result.testResults) {
      result.testResults.forEach((file: any) => {
        if (file.assertionResults) {
          file.assertionResults.forEach((test: any) => {
            if (test.duration && test.duration > 1000) { // Slower than 1 second
              slowTests.push({
                name: test.title,
                file: file.name,
                duration: test.duration,
              });
            }
          });
        }
      });
    }
    
    return slowTests.sort((a, b) => b.duration - a.duration);
  }

  private identifyBottlenecks(result: any): Bottleneck[] {
    // Analyze test execution patterns to identify bottlenecks
    return [];
  }
}

// Types and interfaces

export interface DebugResult {
  success: boolean;
  duration: number;
  output: string;
  errors: string;
  breakpointsHit: string[];
  variableValues: Map<string, any>;
  suggestions: string[];
}

export interface FailureAnalysis {
  errorType: ErrorType;
  rootCause: string;
  stackTrace: StackFrame[];
  contextVariables: Map<string, any>;
  suggestedFixes: string[];
  relatedIssues: RelatedIssue[];
}

export interface TestSandbox {
  path: string;
  testFile: string;
  cleanup: () => Promise<void>;
}

export interface ExecutionProfile {
  duration: number;
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
    peak: number;
  };
  testCount: number;
  passedTests: number;
  failedTests: number;
  slowTests: SlowTest[];
  bottlenecks: Bottleneck[];
  error?: string;
}

export type ErrorType = 
  | 'timeout'
  | 'assertion'
  | 'type'
  | 'reference'
  | 'syntax'
  | 'import'
  | 'network'
  | 'unknown';

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

export interface RelatedIssue {
  type: 'documentation' | 'github' | 'stackoverflow' | 'internal';
  title: string;
  url: string;
  relevance: number;
}

export interface SlowTest {
  name: string;
  file: string;
  duration: number;
}

export interface Bottleneck {
  type: 'setup' | 'execution' | 'teardown' | 'import';
  description: string;
  impact: number;
  suggestions: string[];
}

/**
 * Create a test debugger instance
 */
export function createTestDebugger(testPath: string): TestDebugger {
  return new TestDebugger(testPath);
}

/**
 * Quick debug helper for single test
 */
export async function debugSingleTest(testPath: string, testName?: string): Promise<DebugResult> {
  const debugger = new TestDebugger(testPath);
  return debugger.debugTest(testName);
}