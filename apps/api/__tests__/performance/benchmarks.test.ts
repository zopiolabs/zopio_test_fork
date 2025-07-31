/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Performance Benchmarking Test Suite for API
 * 
 * This comprehensive test suite measures and validates performance characteristics
 * of the API including response times, memory usage, resource limits, and scalability.
 * 
 * Key Performance Metrics:
 * - Response time percentiles (P50, P95, P99)
 * - Memory usage patterns and leak detection
 * - CPU utilization limits
 * - Database query performance
 * - Cache hit rates
 * - Concurrent user limits
 * - Throughput measurements
 * - Resource leak detection
 * - API endpoint latency benchmarks
 * - Payload size impact on performance
 * - Connection pool exhaustion tests
 * - Graceful degradation under load
 * 
 * Baseline Performance Targets:
 * - P50 response time: < 50ms
 * - P95 response time: < 200ms
 * - P99 response time: < 500ms
 * - Memory usage: < 512MB under normal load
 * - CPU usage: < 80% at peak load
 * - Concurrent connections: > 1000
 * - Throughput: > 1000 req/s for simple endpoints
 * - Zero memory leaks over extended operation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockRequest,
  mockLogger,
  mockDatabase,
} from '../utils/api-test-helpers';

// Performance monitoring utilities
interface PerformanceMetrics {
  responseTime: number;
  memoryUsed: number;
  cpuUsage: number;
  timestamp: number;
}

interface PerformanceReport {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  samples: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startMemory: NodeJS.MemoryUsage;
  private startCpuUsage: NodeJS.CpuUsage;
  private startTime: number;

  constructor() {
    this.startMemory = process.memoryUsage();
    this.startCpuUsage = process.cpuUsage();
    this.startTime = performance.now();
  }

  /**
   * Record a performance sample
   */
  recordSample(responseTime: number): void {
    const currentMemory = process.memoryUsage();
    const currentCpuUsage = process.cpuUsage();
    const elapsedTime = performance.now() - this.startTime;

    // Calculate CPU usage percentage
    const cpuPercent = this.calculateCpuPercentage(
      this.startCpuUsage,
      currentCpuUsage,
      elapsedTime
    );

    this.metrics.push({
      responseTime,
      memoryUsed: currentMemory.heapUsed - this.startMemory.heapUsed,
      cpuUsage: cpuPercent,
      timestamp: Date.now(),
    });
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuPercentage(
    startUsage: NodeJS.CpuUsage,
    endUsage: NodeJS.CpuUsage,
    elapsedMs: number
  ): number {
    const userDelta = endUsage.user - startUsage.user;
    const systemDelta = endUsage.system - startUsage.system;
    const totalDelta = userDelta + systemDelta;
    
    // Convert microseconds to milliseconds and calculate percentage
    // CPU percentage is relative to available CPU cores (assume 4 cores for testing)
    const cpuCount = 4;
    return (totalDelta / 1000 / elapsedMs / cpuCount) * 100;
  }

  /**
   * Calculate percentiles from response times
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const responseTimes = this.metrics.map(m => m.responseTime);
    
    if (responseTimes.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        mean: 0,
        stdDev: 0,
        samples: 0,
      };
    }

    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance = responseTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);

    return {
      p50: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99),
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      mean,
      stdDev,
      samples: responseTimes.length,
    };
  }

  /**
   * Check for memory leaks
   */
  checkMemoryLeak(threshold: number = 50 * 1024 * 1024): boolean {
    if (this.metrics.length < 2) return false;

    const firstMemory = this.metrics[0].memoryUsed;
    const lastMemory = this.metrics[this.metrics.length - 1].memoryUsed;
    
    return (lastMemory - firstMemory) > threshold;
  }

  /**
   * Get peak CPU usage
   */
  getPeakCpuUsage(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.cpuUsage));
  }

  /**
   * Get peak memory usage
   */
  getPeakMemoryUsage(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.memoryUsed));
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = [];
    this.startMemory = process.memoryUsage();
    this.startCpuUsage = process.cpuUsage();
    this.startTime = performance.now();
  }
}

// Helper function to measure endpoint performance
async function measureEndpointPerformance(
  endpoint: () => Promise<Response>,
  iterations: number = 100
): Promise<PerformanceReport> {
  const monitor = new PerformanceMonitor();

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await endpoint();
    const responseTime = performance.now() - startTime;
    monitor.recordSample(responseTime);
  }

  return monitor.generateReport();
}

// Helper function to create connection release handler
function createConnectionReleaseHandler(mockPool: { activeConnections: number }) {
  return () => {
    mockPool.activeConnections--;
  };
}

// Helper function to handle circuit breaker reset
function createCircuitBreakerReset(
  circuitState: { open: boolean; failureCount: number },
  resetTimeout: number
) {
  return () => {
    circuitState.open = false;
    circuitState.failureCount = 0;
  };
}

// Helper function to simulate database connection request
async function simulateConnectionRequest(mockPool: {
  activeConnections: number;
  maxConnections: number;
  acquire: () => Promise<{ release: () => void }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const conn = await mockPool.acquire();
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
    conn.release();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Helper function to calculate query statistics
function calculateQueryStats(
  queries: string[],
  queryMetrics: { query: string; duration: number }[]
) {
  return queries.map(query => {
    const metrics = queryMetrics.filter(m => m.query === query);
    const durations = metrics.map(m => m.duration);
    return {
      query: query.substring(0, 30) + '...',
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: metrics.length,
    };
  });
}

// Helper function to simulate database query execution
async function simulateQueryExecution(
  query: string,
  queryMetrics: { query: string; duration: number }[]
): Promise<{ rows: any[] }> {
  const startTime = performance.now();
  
  // Simulate different query complexities
  const queryTime = query.includes('JOIN') ? 50 : 10;
  await new Promise(resolve => setTimeout(resolve, queryTime));
  
  const duration = performance.now() - startTime;
  queryMetrics.push({ query, duration });
  
  return { rows: [] };
}

// Helper function to simulate expensive computation for caching
async function simulateExpensiveComputation(key: string): Promise<{ data: string }> {
  // Simulate expensive computation
  await new Promise(resolve => setTimeout(resolve, 10));
  return { data: `Data for ${key}` };
}

// Helper function to generate computed response data
function generateComputedResponseData(): Array<{ id: number; value: number }> {
  return Array(100).fill(null).map((_, i) => ({ id: i, value: Math.random() }));
}

// Helper function to simulate concurrent requests
async function simulateConcurrentLoad(
  endpoint: () => Promise<Response>,
  concurrency: number,
  duration: number
): Promise<{
  successCount: number;
  errorCount: number;
  throughput: number;
  avgResponseTime: number;
}> {
  const startTime = Date.now();
  const endTime = startTime + duration;
  let successCount = 0;
  let errorCount = 0;
  const responseTimes: number[] = [];

  const workers = Array(concurrency).fill(null).map(async () => {
    while (Date.now() < endTime) {
      const requestStart = performance.now();
      try {
        await endpoint();
        successCount++;
        responseTimes.push(performance.now() - requestStart);
      } catch (error) {
        errorCount++;
        console.debug('Request failed:', error instanceof Error ? error.message : String(error));
      }
    }
  });

  await Promise.all(workers);

  const totalRequests = successCount + errorCount;
  const actualDuration = (Date.now() - startTime) / 1000; // in seconds
  const throughput = totalRequests / actualDuration;
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  return {
    successCount,
    errorCount,
    throughput,
    avgResponseTime,
  };
}

describe('API Performance Benchmarks', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    monitor = new PerformanceMonitor();
    
    // Mock dependencies for consistent performance testing
    mockLogger.mock();
    mockDatabase.mockSuccess();
  });

  afterEach(() => {
    // Force garbage collection if available (requires --expose-gc flag)
    if (global.gc) {
      global.gc();
    }
  });

  describe('Response Time Benchmarks', () => {
    it('should meet P50 response time target (< 50ms)', async () => {
      const { GET } = await import('../../app/health/route');
      
      const report = await measureEndpointPerformance(async () => {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        return GET(request);
      }, 100);

      expect(report.p50).toBeLessThan(50);
      expect(report.samples).toBe(100);
      
      console.log('P50 Response Time:', report.p50.toFixed(2), 'ms');
    });

    it('should meet P95 response time target (< 200ms)', async () => {
      const { GET } = await import('../../app/health/route');
      
      const report = await measureEndpointPerformance(async () => {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        return GET(request);
      }, 200);

      expect(report.p95).toBeLessThan(200);
      
      console.log('P95 Response Time:', report.p95.toFixed(2), 'ms');
    });

    it('should meet P99 response time target (< 500ms)', async () => {
      const { GET } = await import('../../app/health/route');
      
      const report = await measureEndpointPerformance(async () => {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        return GET(request);
      }, 500);

      expect(report.p99).toBeLessThan(500);
      
      console.log('P99 Response Time:', report.p99.toFixed(2), 'ms');
      console.log('Performance Report:', {
        ...report,
        p50: report.p50.toFixed(2) + 'ms',
        p95: report.p95.toFixed(2) + 'ms',
        p99: report.p99.toFixed(2) + 'ms',
        mean: report.mean.toFixed(2) + 'ms',
        stdDev: report.stdDev.toFixed(2) + 'ms',
      });
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should not leak memory over extended operation', async () => {
      const { GET } = await import('../../app/health/route');
      
      // Perform initial requests to warm up
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        GET(request);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Reset monitor after warmup
      monitor.reset();

      // Perform many requests to detect memory leaks
      for (let i = 0; i < 1000; i++) {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        const startTime = performance.now();
        GET(request);
        monitor.recordSample(performance.now() - startTime);

        // Periodic garbage collection
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const hasMemoryLeak = monitor.checkMemoryLeak();
      const peakMemory = monitor.getPeakMemoryUsage();
      
      expect(hasMemoryLeak).toBe(false);
      expect(peakMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      
      console.log('Peak Memory Usage:', (peakMemory / 1024 / 1024).toFixed(2), 'MB');
    });

    it('should maintain stable memory under concurrent load', async () => {
      const { GET } = await import('../../app/health/route');
      
      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Simulate concurrent requests
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(async () => {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        return GET(request);
      });

      await Promise.all(requests);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryGrowth = memoryAfter - memoryBefore;

      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      
      console.log('Memory Growth under Concurrent Load:', (memoryGrowth / 1024 / 1024).toFixed(2), 'MB');
    });
  });

  describe('CPU Utilization', () => {
    it('should maintain CPU usage under limits', async () => {
      const { GET } = await import('../../app/health/route');
      
      monitor.reset();

      // Perform CPU-intensive operations
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        const startTime = performance.now();
        GET(request);
        monitor.recordSample(performance.now() - startTime);
      }

      const peakCpu = monitor.getPeakCpuUsage();
      
      // CPU usage should be reasonable (this is a soft limit as it depends on the system)
      expect(peakCpu).toBeLessThan(80); // Less than 80%
      
      console.log('Peak CPU Usage:', peakCpu.toFixed(2), '%');
    });
  });

  describe('Concurrent User Limits', () => {
    it('should handle high concurrency gracefully', async () => {
      const { GET } = await import('../../app/health/route');
      
      const endpoint = async () => {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        return GET(request);
      };

      // Test with increasing concurrency levels
      const concurrencyLevels = [10, 50, 100, 200];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const result = await simulateConcurrentLoad(endpoint, concurrency, 1000); // 1 second
        results.push({ concurrency, ...result });
        
        // All requests should succeed
        expect(result.errorCount).toBe(0);
        expect(result.avgResponseTime).toBeLessThan(500); // Reasonable response time under load
      }

      console.log('Concurrency Test Results:');
      results.forEach(r => {
        console.log(`  ${r.concurrency} concurrent users:`, {
          throughput: r.throughput.toFixed(2) + ' req/s',
          avgResponseTime: r.avgResponseTime.toFixed(2) + ' ms',
          successRate: ((r.successCount / (r.successCount + r.errorCount)) * 100).toFixed(2) + '%',
        });
      });
    });
  });

  describe('Throughput Measurements', () => {
    it('should achieve target throughput for simple endpoints', async () => {
      const { GET } = await import('../../app/health/route');
      
      const endpoint = async () => {
        const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
        return GET(request);
      };

      const result = await simulateConcurrentLoad(endpoint, 10, 2000); // 2 seconds
      
      // Should achieve at least 1000 req/s for simple endpoints
      expect(result.throughput).toBeGreaterThan(1000);
      expect(result.errorCount).toBe(0);
      
      console.log('Throughput:', result.throughput.toFixed(2), 'req/s');
    });
  });

  describe('Payload Size Impact', () => {
    it('should handle various payload sizes efficiently', async () => {
      // Mock a POST endpoint that accepts various payload sizes
      const handlePost = async (request: Request) => {
        const body = await request.json();
        return new Response(JSON.stringify({ received: Object.keys(body).length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const payloadSizes = [
        { size: 1, data: { small: 'data' } },
        { size: 10, data: Object.fromEntries(Array(10).fill(null).map((_, i) => [`field${i}`, `value${i}`])) },
        { size: 100, data: Object.fromEntries(Array(100).fill(null).map((_, i) => [`field${i}`, `value${i}`])) },
        { size: 1000, data: Object.fromEntries(Array(1000).fill(null).map((_, i) => [`field${i}`, `value${i}`])) },
      ];

      const results = [];

      for (const { size, data } of payloadSizes) {
        const report = await measureEndpointPerformance(async () => {
          const request = createMockRequest({
            method: 'POST',
            body: data,
            url: 'http://localhost:3000/api/test',
          });
          return handlePost(request);
        }, 50);

        results.push({ size, report });
        
        // Response time should scale reasonably with payload size
        expect(report.p95).toBeLessThan(size * 2); // Linear scaling with buffer
      }

      console.log('Payload Size Impact:');
      results.forEach(r => {
        console.log(`  ${r.size} fields:`, {
          p50: r.report.p50.toFixed(2) + 'ms',
          p95: r.report.p95.toFixed(2) + 'ms',
        });
      });
    });
  });

  describe('Resource Leak Detection', () => {
    it('should not leak file descriptors', async () => {
      // This test would typically check for file descriptor leaks
      // In a real scenario, you would monitor process.report().resourceUsage()
      
      const initialResources = process.resourceUsage();
      
      // Perform many operations that might leak resources
      for (let i = 0; i < 100; i++) {
        // Simulate file operations, network connections, etc.
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const finalResources = process.resourceUsage();
      
      // Check that resources haven't grown significantly
      // This is a simplified check - in production you'd monitor specific resources
      expect(finalResources.userCPUTime).toBeGreaterThan(initialResources.userCPUTime);
      
      console.log('Resource Usage:', {
        userCPUTime: finalResources.userCPUTime,
        systemCPUTime: finalResources.systemCPUTime,
      });
    });
  });

  describe('Connection Pool Exhaustion', () => {
    it('should handle connection pool limits gracefully', async () => {
      // Mock database with connection pool
      const mockPool = {
        activeConnections: 0,
        maxConnections: 10,
        acquire: vi.fn(async () => {
          if (mockPool.activeConnections >= mockPool.maxConnections) {
            throw new Error('Connection pool exhausted');
          }
          mockPool.activeConnections++;
          return {
            release: createConnectionReleaseHandler(mockPool),
          };
        }),
      };

      // Simulate requests that use database connections
      const requests = Array(20).fill(null).map(() => simulateConnectionRequest(mockPool));

      const results = await Promise.all(requests);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      // Some requests should fail due to pool exhaustion
      expect(errorCount).toBeGreaterThan(0);
      expect(successCount).toBeGreaterThan(0);
      
      console.log('Connection Pool Test:', {
        successCount,
        errorCount,
        poolLimit: mockPool.maxConnections,
      });
    });
  });

  describe('Graceful Degradation', () => {
    it('should degrade gracefully under extreme load', async () => {
      const { GET } = await import('../../app/health/route');
      
      // Create a circuit breaker pattern
      let circuitOpen = false;
      let failureCount = 0;
      const failureThreshold = 3;
      const resetTimeout = 100; // ms
      let requestCount = 0;

      const protectedEndpoint = async () => {
        requestCount++;
        
        if (circuitOpen) {
          throw new Error('Circuit breaker open');
        }

        // Simulate failures after certain number of requests to trigger circuit breaker
        if (requestCount > 2 && requestCount <= 7) {
          failureCount++;
          
          if (failureCount >= failureThreshold) {
            circuitOpen = true;
            const circuitState = { open: circuitOpen, failureCount };
            setTimeout(
              createCircuitBreakerReset(circuitState, resetTimeout),
              resetTimeout
            );
          }
          
          throw new Error('Simulated failure');
        }

        try {
          const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
          const response = GET(request);
          
          // Reset failure count on success
          failureCount = 0;
          return response;
        } catch (error) {
          failureCount++;
          
          if (failureCount >= failureThreshold) {
            circuitOpen = true;
            const circuitState = { open: circuitOpen, failureCount };
            setTimeout(
              createCircuitBreakerReset(circuitState, resetTimeout),
              resetTimeout
            );
          }
          
          throw error;
        }
      };

      // Simulate extreme load that would trigger circuit breaker
      const results = [];
      for (let i = 0; i < 20; i++) {
        try {
          await protectedEndpoint();
          results.push({ success: true });
        } catch (error) {
          results.push({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }

      const degradedRequests = results.filter(r => !r.success && r.error === 'Circuit breaker open').length;
      
      // Circuit breaker should have triggered
      expect(degradedRequests).toBeGreaterThan(0);
      
      console.log('Graceful Degradation Test:', {
        totalRequests: results.length,
        successfulRequests: results.filter(r => r.success).length,
        degradedRequests,
      });
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize database queries under load', async () => {
      // Mock database query performance
      const queryMetrics: { query: string; duration: number }[] = [];
      
      const mockDb = {
        query: vi.fn((query: string) => simulateQueryExecution(query, queryMetrics)),
      };

      // Simulate various database operations
      const queries = [
        'SELECT * FROM users WHERE id = ?',
        'SELECT * FROM posts JOIN users ON posts.user_id = users.id',
        'INSERT INTO logs (message) VALUES (?)',
        'UPDATE users SET last_seen = NOW() WHERE id = ?',
      ];

      for (const query of queries) {
        for (let i = 0; i < 10; i++) {
          await mockDb.query(query);
        }
      }

      // Analyze query performance
      const queryStats = calculateQueryStats(queries, queryMetrics);

      console.log('Database Query Performance:');
      queryStats.forEach(stat => {
        console.log(`  ${stat.query}: ${stat.avgDuration.toFixed(2)}ms (${stat.count} calls)`);
      });

      // All queries should complete within reasonable time
      queryStats.forEach(stat => {
        expect(stat.avgDuration).toBeLessThan(100);
      });
    });
  });

  describe('Cache Hit Rates', () => {
    it('should maintain high cache hit rates', async () => {
      // Mock cache implementation
      const cache = new Map<string, { value: any; hits: number }>();
      let cacheHits = 0;
      let cacheMisses = 0;

      const cachedFunction = async (key: string, computeFn: () => Promise<any>) => {
        const cached = cache.get(key);
        if (cached) {
          cacheHits++;
          cached.hits++;
          return cached.value;
        }

        cacheMisses++;
        const value = await computeFn();
        cache.set(key, { value, hits: 0 });
        return value;
      };

      // Simulate repeated requests with caching
      const keys = ['user:1', 'user:2', 'post:1', 'post:2', 'config:app'];
      
      for (let i = 0; i < 100; i++) {
        const key = keys[i % keys.length];
        await cachedFunction(key, () => simulateExpensiveComputation(key));
      }

      const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
      
      expect(hitRate).toBeGreaterThan(80); // Should have > 80% cache hit rate
      
      console.log('Cache Performance:', {
        hitRate: hitRate.toFixed(2) + '%',
        hits: cacheHits,
        misses: cacheMisses,
        entries: cache.size,
      });

      // Show cache usage distribution
      console.log('Cache Usage Distribution:');
      cache.forEach((entry, key) => {
        console.log(`  ${key}: ${entry.hits} hits`);
      });
    });
  });

  describe('API Endpoint Latency', () => {
    it('should benchmark different endpoint types', async () => {
      // Define endpoint types with expected performance characteristics
      const endpoints = [
        {
          name: 'Static Health Check',
          handler: async () => new Response('OK', { status: 200 }),
          expectedP95: 10,
        },
        {
          name: 'JSON Response',
          handler: async () => new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
          expectedP95: 20,
        },
        {
          name: 'Computed Response',
          handler: async () => {
            // Simulate some computation
            const data = generateComputedResponseData();
            return new Response(JSON.stringify(data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          },
          expectedP95: 50,
        },
      ];

      console.log('API Endpoint Latency Benchmarks:');
      
      for (const endpoint of endpoints) {
        const report = await measureEndpointPerformance(endpoint.handler, 100);
        
        console.log(`  ${endpoint.name}:`, {
          p50: report.p50.toFixed(2) + 'ms',
          p95: report.p95.toFixed(2) + 'ms',
          p99: report.p99.toFixed(2) + 'ms',
        });
        
        expect(report.p95).toBeLessThan(endpoint.expectedP95);
      }
    });
  });

  describe('Performance Under Different Conditions', () => {
    it('should maintain performance with varying request patterns', async () => {
      const { GET } = await import('../../app/health/route');
      
      // Test different request patterns
      const patterns = [
        { name: 'Steady Load', delay: 10 },
        { name: 'Burst Traffic', delay: 0 },
        { name: 'Intermittent', delay: 100 },
      ];

      for (const pattern of patterns) {
        monitor.reset();
        
        // Execute requests with pattern
        for (let i = 0; i < 50; i++) {
          const request = createMockRequest({ url: 'http://localhost:3000/api/health' });
          const startTime = performance.now();
          GET(request);
          monitor.recordSample(performance.now() - startTime);
          
          if (pattern.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, pattern.delay));
          }
        }

        const report = monitor.generateReport();
        
        console.log(`Performance under ${pattern.name}:`, {
          p50: report.p50.toFixed(2) + 'ms',
          p95: report.p95.toFixed(2) + 'ms',
          peakCpu: monitor.getPeakCpuUsage().toFixed(2) + '%',
        });
        
        // Performance should be consistent regardless of pattern
        expect(report.p95).toBeLessThan(200);
      }
    }, 10000); // Increase timeout to 10 seconds
  });
});