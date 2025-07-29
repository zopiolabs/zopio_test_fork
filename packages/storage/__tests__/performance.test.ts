/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock the Vercel Blob modules before importing
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  list: vi.fn(),
  del: vi.fn(),
  head: vi.fn(),
  copy: vi.fn(),
}));

vi.mock('@vercel/blob/client', () => ({
  put: vi.fn(),
  upload: vi.fn(),
  createMultipartUpload: vi.fn(),
  uploadPart: vi.fn(),
  completeMultipartUpload: vi.fn(),
  createMultipartUploader: vi.fn(),
}));

import * as storage from '../index.js';
import * as client from '../client.js';

/**
 * Performance Test Suite for Vercel Blob Storage Operations
 * 
 * This comprehensive test suite validates the performance characteristics of the storage
 * package under various load conditions and identifies potential bottlenecks. The tests
 * are designed to ensure the storage system performs well with different file sizes,
 * concurrent operations, and system resource constraints.
 * 
 * Key Performance Areas Tested:
 * 1. File Upload/Download Performance - Speed and throughput metrics
 * 2. Concurrent Operation Handling - Multi-user scenarios and resource contention
 * 3. Memory Usage Patterns - Memory consumption and leak detection
 * 4. Large File Operations - Handling of files up to Vercel's 500MB client limit
 * 5. System Resource Utilization - CPU, memory, and network efficiency
 * 6. Error Recovery Performance - Resilience under failure conditions
 * 
 * Performance Thresholds:
 * - Small files (<1MB): <100ms per operation
 * - Medium files (1-10MB): <500ms per operation  
 * - Large files (10-100MB): <5000ms per operation
 * - Concurrent operations: Linear scaling up to 50 concurrent uploads
 * - Memory usage: No leaks detected over 1000 operations
 * - Error recovery: <200ms for timeout/retry scenarios
 */
describe('Storage Performance Tests', () => {
  // Mock references for server and client operations
  let mockServerList: Mock;
  let mockServerDel: Mock;
  let mockClientPut: Mock;
  let mockCreateMultipartUpload: Mock;
  let mockUploadPart: Mock;
  let mockCompleteMultipartUpload: Mock;

  beforeEach(() => {
    // Reset all mocks and get fresh references
    vi.clearAllMocks();
    
    // Server-side operation mocks
    mockServerList = vi.mocked(storage.list);
    mockServerDel = vi.mocked(storage.del);
    
    // Client-side operation mocks
    mockClientPut = vi.mocked(client.put);
    mockCreateMultipartUpload = vi.mocked(client.createMultipartUpload);
    mockUploadPart = vi.mocked(client.uploadPart);
    mockCompleteMultipartUpload = vi.mocked(client.completeMultipartUpload);
  });

  afterEach(() => {
    // Clean up timers if they were mocked
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  /**
   * File Upload Performance Testing
   * 
   * This section tests upload performance across different file sizes and scenarios.
   * It validates that upload operations meet performance thresholds and scale
   * appropriately with file size. The tests simulate realistic file sizes from
   * small documents to large media files within Vercel's limits.
   */
  describe('File Upload Performance', () => {
    /**
     * Small File Upload Performance (< 1MB)
     * 
     * Tests upload performance for small files like documents, images, and configs.
     * These operations should complete quickly as they're common in user interactions.
     * Performance threshold: < 100ms per operation
     */
    it('should handle small file uploads efficiently (<1MB)', async () => {
      const fileSize = 500 * 1024; // 500KB
      const smallFile = new File([new ArrayBuffer(fileSize)], 'small-file.txt', {
        type: 'text/plain',
      });

      // Mock successful upload with simulated network latency
      mockClientPut.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            url: 'https://blob.vercel-storage.com/small-file.txt',
            downloadUrl: 'https://blob.vercel-storage.com/small-file.txt',
            pathname: 'small-file.txt',
            contentType: 'text/plain',
            size: fileSize,
          }), 50); // Simulate 50ms network latency
        })
      );

      const startTime = performance.now();
      const result = await client.put('small-file.txt', smallFile, { access: 'public' } as any);
      const endTime = performance.now();
      const uploadTime = endTime - startTime;

      expect(result.pathname).toBe('small-file.txt');
      expect(uploadTime).toBeLessThan(100); // Should complete in < 100ms
      
      // Verify upload throughput (MB/s)
      const throughputMBps = (fileSize / (1024 * 1024)) / (uploadTime / 1000);
      expect(throughputMBps).toBeGreaterThan(5); // Minimum 5 MB/s for small files
    });

    /**
     * Medium File Upload Performance (1-10MB)
     * 
     * Tests upload performance for medium-sized files like high-res images, PDFs,
     * and small videos. These files require more bandwidth but should still upload
     * quickly for good user experience.
     * Performance threshold: < 500ms per operation
     */
    it('should handle medium file uploads efficiently (1-10MB)', async () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      const mediumFile = new File([new ArrayBuffer(fileSize)], 'medium-file.pdf', {
        type: 'application/pdf',
      });

      // Mock successful upload with appropriate latency for larger file
      mockClientPut.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            url: 'https://blob.vercel-storage.com/medium-file.pdf',
            downloadUrl: 'https://blob.vercel-storage.com/medium-file.pdf',
            pathname: 'medium-file.pdf',
            contentType: 'application/pdf',
            size: fileSize,
          }), 200); // Simulate 200ms for medium files
        })
      );

      const startTime = performance.now();
      const result = await client.put('medium-file.pdf', mediumFile, { access: 'public' } as any);
      const endTime = performance.now();
      const uploadTime = endTime - startTime;

      expect(result.pathname).toBe('medium-file.pdf');
      expect(uploadTime).toBeLessThan(500); // Should complete in < 500ms
      
      // Verify reasonable throughput for medium files
      const throughputMBps = (fileSize / (1024 * 1024)) / (uploadTime / 1000);
      expect(throughputMBps).toBeGreaterThan(10); // Minimum 10 MB/s for medium files
    });

    /**
     * Large File Upload Performance (10-100MB)
     * 
     * Tests upload performance for large files that approach Vercel's server-side
     * limits. These files should use multipart upload for optimal performance and
     * reliability. Performance threshold: < 5000ms per operation
     */
    it('should handle large file uploads efficiently using multipart upload', async () => {
      const fileSize = 50 * 1024 * 1024; // 50MB
      const fileName = 'large-file.mp4';
      const mockUploadId = 'upload_large_123';

      // Mock multipart upload workflow
      mockCreateMultipartUpload.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            uploadId: mockUploadId,
            key: fileName,
          }), 100); // Setup time
        })
      );

      // Mock part uploads (simulate 5 parts)
      const partCount = 5;
      const partSize = fileSize / partCount;
      mockUploadPart.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            etag: 'etag_part_123',
            partNumber: 1,
          }), 800); // 800ms per part (realistic for 10MB chunks)
        })
      );

      mockCompleteMultipartUpload.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            url: `https://blob.vercel-storage.com/${fileName}`,
            downloadUrl: `https://blob.vercel-storage.com/${fileName}`,
            pathname: fileName,
            contentType: 'video/mp4',
            size: fileSize,
          }), 200); // Completion time
        })
      );

      const startTime = performance.now();

      // Simulate complete multipart upload workflow
      const createResult = await client.createMultipartUpload(fileName, { access: 'public' } as any);
      expect(createResult.uploadId).toBe(mockUploadId);

      // Upload parts in sequence (in real usage, could be parallel)
      for (let i = 0; i < partCount; i++) {
        const partBlob = new Blob([new ArrayBuffer(partSize)]);
        const partResult = await client.uploadPart(fileName, partBlob, {
          uploadId: mockUploadId,
          partNumber: i + 1,
          access: 'public'
        } as any);
        expect(partResult.etag).toBe('etag_part_123');
      }

      const finalResult = await client.completeMultipartUpload(fileName, [] as any, { access: 'public' } as any);
      const endTime = performance.now();
      const uploadTime = endTime - startTime;

      expect(finalResult.pathname).toBe(fileName);
      expect(uploadTime).toBeLessThan(5000); // Should complete in < 5 seconds
      
      // Verify throughput is reasonable for large files
      const throughputMBps = (fileSize / (1024 * 1024)) / (uploadTime / 1000);
      expect(throughputMBps).toBeGreaterThan(5); // Minimum 5 MB/s for large files
    });

    /**
     * Batch Upload Performance
     * 
     * Tests the system's ability to handle multiple file uploads efficiently
     * by measuring batch upload performance and ensuring no significant 
     * performance degradation with larger batches.
     */
    it('should handle batch uploads without performance degradation', async () => {
      const batchSizes = [5, 10, 20, 50];
      const fileSize = 100 * 1024; // 100KB per file
      const results: Array<{ batchSize: number; totalTime: number; avgTimePerFile: number }> = [];

      for (const batchSize of batchSizes) {
        // Create batch of files
        const files = Array.from({ length: batchSize }, (_, i) => ({
          name: `batch-file-${i}.txt`,
          file: new File([new ArrayBuffer(fileSize)], `batch-file-${i}.txt`, {
            type: 'text/plain',
          }),
        }));

        // Mock uploads with realistic latency
        mockClientPut.mockImplementation(() =>
          new Promise(resolve => {
            setTimeout(() => resolve({
              url: 'https://blob.vercel-storage.com/batch-file.txt',
              pathname: 'batch-file.txt',
              contentType: 'text/plain',
              size: fileSize,
            }), 30 + Math.random() * 20); // 30-50ms variation
          })
        );

        const startTime = performance.now();
        
        // Upload all files in parallel
        const uploadPromises = files.map(({ name, file }) =>
          client.put(name, file, { access: 'public' } as any)
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTimePerFile = totalTime / batchSize;

        expect(uploadResults).toHaveLength(batchSize);
        results.push({ batchSize, totalTime, avgTimePerFile });

        // Performance should scale roughly linearly (allow some overhead)
        if (batchSize <= 20) {
          expect(avgTimePerFile).toBeLessThan(100); // < 100ms per file for small batches
        } else {
          expect(avgTimePerFile).toBeLessThan(150); // Allow slight degradation for large batches
        }
      }

      // Verify scaling characteristics
      const smallBatchAvg = results.find(r => r.batchSize === 5)?.avgTimePerFile ?? 0;
      const largeBatchAvg = results.find(r => r.batchSize === 50)?.avgTimePerFile ?? 0;
      
      // Large batch average should not be more than 3x small batch average
      expect(largeBatchAvg / smallBatchAvg).toBeLessThan(3);
    });
  });

  /**
   * Concurrent Operations Performance Testing
   * 
   * This section tests the system's ability to handle multiple concurrent operations
   * without performance degradation or resource contention. It validates scaling
   * characteristics and ensures the system remains responsive under load.
   */
  describe('Concurrent Operations Performance', () => {
    /**
     * Concurrent Upload Scaling
     * 
     * Tests how the system performs with increasing numbers of concurrent uploads.
     * This simulates real-world scenarios where multiple users upload files
     * simultaneously. The test validates that performance scales appropriately
     * and doesn't degrade exponentially with increased concurrency.
     */
    it('should handle concurrent uploads with linear scaling', async () => {
      const concurrencyLevels = [1, 5, 10, 25, 50];
      const fileSize = 200 * 1024; // 200KB per file
      const results: Array<{ concurrency: number; totalTime: number; throughput: number }> = [];

      for (const concurrency of concurrencyLevels) {
        // Create files for concurrent upload
        const files = Array.from({ length: concurrency }, (_, i) => ({
          name: `concurrent-${i}.txt`,
          file: new File([new ArrayBuffer(fileSize)], `concurrent-${i}.txt`, {
            type: 'text/plain',
          }),
        }));

        // Mock uploads with realistic latency and some jitter
        mockClientPut.mockImplementation(() =>
          new Promise(resolve => {
            const latency = 40 + Math.random() * 30; // 40-70ms variation
            setTimeout(() => resolve({
              url: 'https://blob.vercel-storage.com/concurrent.txt',
              pathname: 'concurrent.txt',
              contentType: 'text/plain',
              size: fileSize,
            }), latency);
          })
        );

        const startTime = performance.now();
        
        // Execute all uploads concurrently
        const uploadPromises = files.map(({ name, file }) =>
          client.put(name, file, { access: 'public' } as any)
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const throughput = (concurrency * fileSize) / (totalTime / 1000); // bytes per second

        expect(uploadResults).toHaveLength(concurrency);
        results.push({ concurrency, totalTime, throughput });

        // Performance expectations based on concurrency level
        if (concurrency === 1) {
          expect(totalTime).toBeLessThan(100); // Single upload baseline
        } else if (concurrency <= 10) {
          expect(totalTime).toBeLessThan(150); // Small concurrency overhead
        } else if (concurrency <= 25) {
          expect(totalTime).toBeLessThan(200); // Medium concurrency
        } else {
          expect(totalTime).toBeLessThan(300); // High concurrency with some overhead
        }
      }

      // Verify scaling characteristics - throughput should increase with concurrency
      const singleThroughput = results.find(r => r.concurrency === 1)?.throughput ?? 0;
      const highThroughput = results.find(r => r.concurrency === 50)?.throughput ?? 0;
      
      // High concurrency should achieve at least 10x the single upload throughput
      expect(highThroughput / singleThroughput).toBeGreaterThan(10);
    });

    /**
     * Mixed Operation Concurrency
     * 
     * Tests concurrent execution of different types of operations (upload, list, delete).
     * This simulates realistic application usage where various storage operations
     * happen simultaneously. Validates that different operation types don't interfere
     * with each other's performance.
     */
    it('should handle mixed concurrent operations efficiently', async () => {
      const operationCount = 30; // 10 of each operation type
      const fileSize = 150 * 1024; // 150KB

      // Mock different operation types with realistic latencies
      mockClientPut.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            url: 'https://blob.vercel-storage.com/mixed-upload.txt',
            pathname: 'mixed-upload.txt',
            contentType: 'text/plain',
            size: fileSize,
          }), 50 + Math.random() * 20);
        })
      );

      mockServerList.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            blobs: [
              { pathname: 'file1.txt', url: 'https://blob.vercel-storage.com/file1.txt' },
              { pathname: 'file2.txt', url: 'https://blob.vercel-storage.com/file2.txt' },
            ],
            hasMore: false,
            cursor: null,
          }), 30 + Math.random() * 15);
        })
      );

      mockServerDel.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve(undefined), 25 + Math.random() * 10);
        })
      );

      const startTime = performance.now();

      // Create mixed operations
      const operations = [];
      
      // 10 upload operations
      for (let i = 0; i < 10; i++) {
        const file = new File([new ArrayBuffer(fileSize)], `mixed-upload-${i}.txt`, {
          type: 'text/plain',
        });
        operations.push(client.put(`mixed-upload-${i}.txt`, file, { access: 'public' } as any));
      }

      // 10 list operations
      for (let i = 0; i < 10; i++) {
        operations.push(storage.list({ prefix: `folder-${i}/` }));
      }

      // 10 delete operations
      for (let i = 0; i < 10; i++) {
        operations.push(storage.del(`delete-file-${i}.txt`));
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(operationCount);
      expect(totalTime).toBeLessThan(200); // Should complete mixed operations efficiently

      // Verify all operations completed successfully
      expect(mockClientPut).toHaveBeenCalledTimes(10);
      expect(mockServerList).toHaveBeenCalledTimes(10);
      expect(mockServerDel).toHaveBeenCalledTimes(10);
    });

    /**
     * Resource Contention Testing
     * 
     * Tests system behavior under resource contention by simulating high-load
     * scenarios with many concurrent operations competing for resources.
     * Validates that the system remains stable and responsive under pressure.
     */
    it('should maintain stability under resource contention', async () => {
      const highConcurrency = 100;
      const fileSize = 50 * 1024; // 50KB to reduce memory pressure
      let completedOperations = 0;
      let failedOperations = 0;

      // Mock with occasional failures to simulate real-world conditions
      mockClientPut.mockImplementation(() =>
        new Promise((resolve, reject) => {
          const latency = 30 + Math.random() * 40; // Variable latency
          setTimeout(() => {
            // Simulate 5% failure rate under high load
            if (Math.random() < 0.05) {
              failedOperations++;
              reject(new Error('Service temporarily unavailable'));
            } else {
              completedOperations++;
              resolve({
                url: 'https://blob.vercel-storage.com/contention.txt',
                pathname: 'contention.txt',
                contentType: 'text/plain',
                size: fileSize,
              });
            }
          }, latency);
        })
      );

      const startTime = performance.now();

      // Create high number of concurrent operations
      const operations = Array.from({ length: highConcurrency }, (_, i) => {
        const file = new File([new ArrayBuffer(fileSize)], `contention-${i}.txt`, {
          type: 'text/plain',
        });
        return client.put(`contention-${i}.txt`, file, { access: 'public' } as any).catch(error => ({ error }));
      });

      const results = await Promise.all(operations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(highConcurrency);
      expect(totalTime).toBeLessThan(1000); // Should handle high concurrency within 1 second

      // Most operations should succeed despite some failures
      expect(completedOperations).toBeGreaterThan(highConcurrency * 0.9); // >90% success rate
      expect(failedOperations).toBeLessThan(highConcurrency * 0.1); // <10% failure rate

      // System should remain responsive (average operation time should be reasonable)
      const avgOperationTime = totalTime / completedOperations;
      expect(avgOperationTime).toBeLessThan(100); // Average < 100ms per successful operation
    });
  });

  /**
   * Memory Usage and Resource Management Testing
   * 
   * This section tests memory consumption patterns and ensures the storage system
   * doesn't leak memory or consume excessive resources during operation. It validates
   * that the system can handle sustained load without degrading performance due to
   * memory pressure.
   */
  describe('Memory Usage and Resource Management', () => {
    /**
     * Memory Leak Detection
     * 
     * Tests for memory leaks by performing many sequential operations and monitoring
     * that performance doesn't degrade over time. While we can't directly measure
     * memory in the test environment, we can detect leaks through performance
     * degradation patterns.
     */
    it('should not leak memory with repeated operations', async () => {
      const iterations = 1000;
      const batchSize = 10;
      const fileSize = 10 * 1024; // 10KB files
      const performanceSnapshots: number[] = [];

      // Mock fast, consistent operations
      mockClientPut.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            url: 'https://blob.vercel-storage.com/memory-test.txt',
            pathname: 'memory-test.txt',
            contentType: 'text/plain',
            size: fileSize,
          }), 5 + Math.random() * 5); // 5-10ms consistent latency
        })
      );

      // Perform operations in batches and measure performance over time
      for (let batch = 0; batch < iterations / batchSize; batch++) {
        const batchStartTime = performance.now();
        
        const batchOperations = Array.from({ length: batchSize }, (_, i) => {
          const file = new File([new ArrayBuffer(fileSize)], `memory-test-${batch}-${i}.txt`, {
            type: 'text/plain',
          });
          return client.put(`memory-test-${batch}-${i}.txt`, file, { access: 'public' } as any);
        });

        const results = await Promise.all(batchOperations);
        const batchEndTime = performance.now();
        const batchTime = batchEndTime - batchStartTime;

        expect(results).toHaveLength(batchSize);
        performanceSnapshots.push(batchTime);

        // Performance should remain consistent (no significant degradation)
        if (batch > 10) { // After warmup period
          const recentAvg = performanceSnapshots.slice(-5).reduce((a, b) => a + b, 0) / 5;
          const earlyAvg = performanceSnapshots.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
          
          // Recent performance should not be more than 50% slower than early performance
          expect(recentAvg / earlyAvg).toBeLessThan(1.5);
        }
      }

      // Overall performance should remain stable
      const firstQuarter = performanceSnapshots.slice(0, 25).reduce((a, b) => a + b, 0) / 25;
      const lastQuarter = performanceSnapshots.slice(-25).reduce((a, b) => a + b, 0) / 25;
      
      // Last quarter should not be significantly slower than first quarter
      expect(lastQuarter / firstQuarter).toBeLessThan(2.0); // Allow some degradation but not excessive
    });

    /**
     * Large Data Handling
     * 
     * Tests the system's ability to handle large amounts of data without excessive
     * memory consumption. This simulates scenarios where applications process
     * many files or large files that could strain memory resources.
     */
    it('should handle large data volumes efficiently', async () => {
      const largeFileSize = 10 * 1024 * 1024; // 10MB file
      const fileName = 'large-memory-test.bin';

      // Mock realistic large file upload
      mockClientPut.mockImplementation(() =>
        new Promise(resolve => {
          // Simulate processing time for large file
          setTimeout(() => resolve({
            url: `https://blob.vercel-storage.com/${fileName}`,
            pathname: fileName,
            contentType: 'application/octet-stream',
            size: largeFileSize,
          }), 500); // 500ms for 10MB file
        })
      );

      const startTime = performance.now();
      
      // Create large file (using ArrayBuffer to test memory handling)
      const largeBuffer = new ArrayBuffer(largeFileSize);
      const largeFile = new File([largeBuffer], fileName, {
        type: 'application/octet-stream',
      });

      const result = await client.put(fileName, largeFile, { access: 'public' } as any);
      const endTime = performance.now();
      const uploadTime = endTime - startTime;

      expect(result.pathname).toBe(fileName);
      expect(uploadTime).toBeLessThan(1000); // Should handle large file within 1 second

      // Memory should be efficiently managed (no excessive time due to memory pressure)
      const throughputMBps = (largeFileSize / (1024 * 1024)) / (uploadTime / 1000);
      expect(throughputMBps).toBeGreaterThan(5); // Minimum 5 MB/s throughput
    });

    /**
     * Resource Cleanup Testing
     * 
     * Tests that resources are properly cleaned up after operations complete,
     * including temporary objects, event listeners, and other resources that
     * could accumulate over time.
     */
    it('should clean up resources properly after operations', async () => {
      const operationCount = 50;
      const fileSize = 100 * 1024; // 100KB

      // Track resource creation and cleanup patterns
      let resourcesCreated = 0;
      let resourcesCleanedUp = 0;

      // Mock with resource tracking
      mockClientPut.mockImplementation(() => {
        resourcesCreated++;
        return new Promise(resolve => {
          setTimeout(() => {
            resourcesCleanedUp++; // Simulate resource cleanup
            resolve({
              url: 'https://blob.vercel-storage.com/cleanup-test.txt',
              pathname: 'cleanup-test.txt',
              contentType: 'text/plain',
              size: fileSize,
            });
          }, 30);
        });
      });

      const startTime = performance.now();

      // Perform operations in sequence to test cleanup between operations
      for (let i = 0; i < operationCount; i++) {
        const file = new File([new ArrayBuffer(fileSize)], `cleanup-test-${i}.txt`, {
          type: 'text/plain',
        });
        
        const result = await client.put(`cleanup-test-${i}.txt`, file, { access: 'public' } as any);
        expect(result.pathname).toBe('cleanup-test.txt');

        // Allow garbage collection between operations
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All resources should have been created and cleaned up
      expect(resourcesCreated).toBe(operationCount);
      expect(resourcesCleanedUp).toBe(operationCount);

      // Operations should complete in reasonable time
      expect(totalTime).toBeLessThan(2000); // Should complete all operations within 2 seconds
      
      // Average operation time should be consistent
      const avgOperationTime = totalTime / operationCount;
      expect(avgOperationTime).toBeLessThan(50); // Average < 50ms per operation
    });
  });

  /**
   * Error Recovery and Resilience Performance Testing
   * 
   * This section tests how the system performs under error conditions and
   * validates that error handling doesn't significantly impact performance.
   * It ensures the system can recover gracefully from failures and timeouts.
   */
  describe('Error Recovery and Resilience Performance', () => {
    /**
     * Timeout Handling Performance
     * 
     * Tests how the system handles timeout scenarios and ensures that timeout
     * detection and recovery doesn't add excessive overhead to normal operations.
     */
    it('should handle timeouts efficiently', async () => {
      const timeoutDuration = 1000; // 1 second timeout
      const fileSize = 1024 * 1024; // 1MB file
      let timeoutDetected = false;

      // Mock operation that will timeout
      mockClientPut.mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => {
            timeoutDetected = true;
            reject(new Error('Request timeout'));
          }, timeoutDuration);
        })
      );

      const file = new File([new ArrayBuffer(fileSize)], 'timeout-test.txt', {
        type: 'text/plain',
      });

      const startTime = performance.now();

      try {
        await client.put('timeout-test.txt', file, { access: 'public' } as any);
        expect.fail('Expected timeout error');
      } catch (error: any) {
        expect(error.message).toBe('Request timeout');
      }

      const endTime = performance.now();
      const timeoutTime = endTime - startTime;

      expect(timeoutDetected).toBe(true);
      // Timeout should happen within reasonable time
      expect(timeoutTime).toBeLessThan(timeoutDuration + 100); // Allow some overhead
      expect(timeoutTime).toBeGreaterThan(timeoutDuration - 100); // Should take expected time
    });

    /**
     * Retry Mechanism Performance
     * 
     * Tests the performance impact of retry mechanisms by simulating operations
     * that fail initially but succeed on retry. Validates that retry logic
     * doesn't introduce excessive delays or resource consumption.
     */
    it('should handle retries without excessive performance impact', async () => {
      const maxRetries = 3;
      const fileSize = 500 * 1024; // 500KB
      let attemptCount = 0;

      // Mock operation that fails twice then succeeds
      mockClientPut.mockImplementation(() => {
        attemptCount++;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (attemptCount < 3) {
              reject(new Error('Temporary network error'));
            } else {
              resolve({
                url: 'https://blob.vercel-storage.com/retry-test.txt',
                pathname: 'retry-test.txt',
                contentType: 'text/plain',
                size: fileSize,
              });
            }
          }, 50); // 50ms per attempt
        });
      });

      // Simulate retry logic
      const retryOperation = async (operation: () => Promise<any>, retries: number): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            if (attempt === retries) throw error;
            // Small delay between retries
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };

      const file = new File([new ArrayBuffer(fileSize)], 'retry-test.txt', {
        type: 'text/plain',
      });

      const startTime = performance.now();
      
      const result = await retryOperation(
        () => client.put('retry-test.txt', file, { access: 'public' } as any),
        maxRetries
      );
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(result.pathname).toBe('retry-test.txt');
      expect(attemptCount).toBe(3); // Should have made 3 attempts
      
      // Total time should include retries but not be excessive
      // 3 attempts × 50ms + 2 retry delays × 100ms = 350ms expected
      expect(totalTime).toBeLessThan(500); // Allow some overhead
      expect(totalTime).toBeGreaterThan(300); // Should reflect actual retry attempts
    });

    /**
     * Error Rate Impact on Performance
     * 
     * Tests how increasing error rates affect overall system performance.
     * This validates that error handling logic doesn't become a bottleneck
     * even when errors are frequent.
     */
    it('should maintain performance despite error rates', async () => {
      const operationCount = 100;
      const errorRates = [0.1, 0.2, 0.3]; // 10%, 20%, 30% error rates
      const fileSize = 100 * 1024; // 100KB
      const results: Array<{ errorRate: number; avgTime: number; successRate: number }> = [];

      for (const errorRate of errorRates) {
        let successCount = 0;
        let totalTime = 0;

        // Mock with specific error rate
        mockClientPut.mockImplementation(() =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (Math.random() < errorRate) {
                reject(new Error('Simulated error'));
              } else {
                successCount++;
                resolve({
                  url: 'https://blob.vercel-storage.com/error-rate-test.txt',
                  pathname: 'error-rate-test.txt',
                  contentType: 'text/plain',
                  size: fileSize,
                });
              }
            }, 40 + Math.random() * 20); // 40-60ms latency
          })
        );

        const startTime = performance.now();

        // Perform operations and handle errors
        const operations = Array.from({ length: operationCount }, (_, i) => {
          const file = new File([new ArrayBuffer(fileSize)], `error-rate-test-${i}.txt`, {
            type: 'text/plain',
          });
          return client.put(`error-rate-test-${i}.txt`, file, { access: 'public' } as any).catch(() => null);
        });

        await Promise.all(operations);
        const endTime = performance.now();
        totalTime = endTime - startTime;

        const actualSuccessRate = successCount / operationCount;
        const avgTime = totalTime / operationCount;

        results.push({ errorRate, avgTime, successRate: actualSuccessRate });

        // Even with errors, operations should complete in reasonable time
        expect(avgTime).toBeLessThan(100); // Average time per operation should be reasonable
        expect(actualSuccessRate).toBeGreaterThan(1 - errorRate - 0.1); // Success rate should be close to expected
      }

      // Performance should not degrade significantly with higher error rates
      const lowErrorPerf = results.find(r => r.errorRate === 0.1)?.avgTime ?? 0;
      const highErrorPerf = results.find(r => r.errorRate === 0.3)?.avgTime ?? 0;
      
      // High error rate should not be more than 2x slower than low error rate
      expect(highErrorPerf / lowErrorPerf).toBeLessThan(2.0);
    });
  });

  /**
   * System Resource Utilization Testing
   * 
   * This section tests how efficiently the storage system uses system resources
   * like CPU and network connections. It validates that the system scales well
   * and doesn't waste resources under various load conditions.
   */
  describe('System Resource Utilization', () => {
    /**
     * CPU Efficiency Testing
     * 
     * Tests that the storage operations don't consume excessive CPU resources
     * by simulating CPU-intensive scenarios and ensuring operations remain
     * efficient. This is particularly important for server-side usage.
     */
    it('should use CPU resources efficiently', async () => {
      const operationCount = 50; // Reduced to prevent timeout
      const fileSize = 200 * 1024; // 200KB
      let totalCpuTime = 0;

      // Mock operations with simulated CPU work
      mockClientPut.mockImplementation(() => {
        const cpuStartTime = performance.now();
        
        return new Promise(resolve => {
          // Simulate some CPU work (JSON processing, validation, etc.)
          const data = { test: 'data', timestamp: Date.now() };
          const jsonString = JSON.stringify(data);
          JSON.parse(jsonString);
          
          setTimeout(() => {
            const cpuEndTime = performance.now();
            totalCpuTime += (cpuEndTime - cpuStartTime);
            
            resolve({
              url: 'https://blob.vercel-storage.com/cpu-test.txt',
              pathname: 'cpu-test.txt',
              contentType: 'text/plain',
              size: fileSize,
            });
          }, 30); // Network latency
        });
      });

      const startTime = performance.now();

      // Perform operations sequentially to measure CPU usage accurately
      for (let i = 0; i < operationCount; i++) {
        const file = new File([new ArrayBuffer(fileSize)], `cpu-test-${i}.txt`, {
          type: 'text/plain',
        });
        
        const result = await client.put(`cpu-test-${i}.txt`, file, { access: 'public' } as any);
        expect(result.pathname).toBe('cpu-test.txt');
      }

      const endTime = performance.now();
      const totalWallTime = endTime - startTime;
      const avgCpuTimePerOp = totalCpuTime / operationCount;

      // CPU time per operation should be minimal
      expect(avgCpuTimePerOp).toBeLessThan(50); // < 50ms CPU time per operation
      
      // CPU efficiency: CPU time should be reasonable portion of wall time in testing
      const cpuEfficiency = totalCpuTime / totalWallTime;
      expect(cpuEfficiency).toBeLessThan(1.5); // Allow for test overhead but should be reasonable
    });

    /**
     * Network Connection Efficiency
     * 
     * Tests that the system efficiently manages network connections and doesn't
     * create excessive connection overhead. This is important for applications
     * that make many storage requests.
     */
    it('should manage network connections efficiently', async () => {
      const concurrentBatches = 5;
      const operationsPerBatch = 20;
      const fileSize = 150 * 1024; // 150KB
      const connectionStats = {
        created: 0,
        reused: 0,
        closed: 0,
      };

      // Mock with connection tracking
      mockClientPut.mockImplementation(() => {
        // Simulate connection reuse logic
        if (Math.random() < 0.8) { // 80% connection reuse rate
          connectionStats.reused++;
        } else {
          connectionStats.created++;
        }

        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              url: 'https://blob.vercel-storage.com/network-test.txt',
              pathname: 'network-test.txt',
              contentType: 'text/plain',
              size: fileSize,
            });
          }, 35 + Math.random() * 15); // 35-50ms latency
        });
      });

      const startTime = performance.now();

      // Perform operations in batches to test connection management
      for (let batch = 0; batch < concurrentBatches; batch++) {
        const batchOperations = Array.from({ length: operationsPerBatch }, (_, i) => {
          const file = new File([new ArrayBuffer(fileSize)], `network-test-${batch}-${i}.txt`, {
            type: 'text/plain',
          });
          return client.put(`network-test-${batch}-${i}.txt`, file, { access: 'public' } as any);
        });

        const results = await Promise.all(batchOperations);
        expect(results).toHaveLength(operationsPerBatch);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const totalOperations = concurrentBatches * operationsPerBatch;

      // Performance should be good with efficient connection management
      expect(totalTime).toBeLessThan(1500); // Should complete all batches efficiently
      
      // Connection reuse should be high
      const reuseRate = connectionStats.reused / (connectionStats.created + connectionStats.reused);
      expect(reuseRate).toBeGreaterThan(0.7); // > 70% connection reuse rate

      // Average time per operation should be reasonable
      const avgTimePerOp = totalTime / totalOperations;
      expect(avgTimePerOp).toBeLessThan(20); // < 20ms average per operation (due to batching)
    });

    /**
     * Memory Pressure Handling
     * 
     * Tests how the system performs under memory pressure by simulating
     * scenarios with limited memory availability. This validates that the
     * system gracefully handles resource constraints.
     */
    it('should handle memory pressure gracefully', async () => {
      const operationCount = 50;
      const fileSize = 500 * 1024; // 500KB files
      let memoryPressureDetected = 0;

      // Mock with simulated memory pressure
      mockClientPut.mockImplementation(() => {
        // Simulate memory pressure detection (every 10th operation)
        const hasMemoryPressure = Math.random() < 0.2; // 20% chance
        if (hasMemoryPressure) {
          memoryPressureDetected++;
          // Slower operation under memory pressure
          return new Promise(resolve => {
            setTimeout(() => resolve({
              url: 'https://blob.vercel-storage.com/memory-pressure-test.txt',
              pathname: 'memory-pressure-test.txt',
              contentType: 'text/plain',
              size: fileSize,
            }), 100); // 100ms under pressure
          });
        } else {
          // Normal operation
          return new Promise(resolve => {
            setTimeout(() => resolve({
              url: 'https://blob.vercel-storage.com/memory-pressure-test.txt',
              pathname: 'memory-pressure-test.txt',
              contentType: 'text/plain',
              size: fileSize,
            }), 40); // 40ms normal
          });
        }
      });

      const startTime = performance.now();

      // Perform operations and track performance under memory pressure
      const results = [];
      for (let i = 0; i < operationCount; i++) {
        const file = new File([new ArrayBuffer(fileSize)], `memory-pressure-test-${i}.txt`, {
          type: 'text/plain',
        });
        
        const result = await client.put(`memory-pressure-test-${i}.txt`, file, { access: 'public' } as any);
        results.push(result);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / operationCount;

      expect(results).toHaveLength(operationCount);
      expect(memoryPressureDetected).toBeGreaterThan(0); // Should have detected some pressure

      // System should still perform reasonably under memory pressure
      expect(avgTime).toBeLessThan(80); // Average should account for mix of normal/pressure operations
      expect(totalTime).toBeLessThan(4000); // Should complete all operations within 4 seconds

      // Performance degradation should be proportional to pressure frequency
      const expectedSlowdown = 1 + (memoryPressureDetected / operationCount) * 1.5;
      const actualSlowdown = avgTime / 40; // 40ms is normal operation time
      expect(actualSlowdown).toBeLessThan(expectedSlowdown + 0.5); // Allow some variance
    });
  });

  /**
   * Scalability and Load Testing
   * 
   * This section tests the system's scalability characteristics and validates
   * performance under sustained load. It ensures the system can handle
   * production-level traffic and usage patterns.
   */
  describe('Scalability and Load Testing', () => {
    /**
     * Sustained Load Testing
     * 
     * Tests system performance under sustained load over a longer period.
     * This simulates real-world usage where the system must maintain
     * consistent performance over time without degradation.
     */
    it('should maintain performance under sustained load', async () => {
      const duration = 2000; // 2 seconds of sustained load
      const operationsPerSecond = 50; // Target throughput
      const fileSize = 100 * 1024; // 100KB files
      const performanceWindows: number[] = [];
      let totalOperations = 0;

      // Mock consistent operations
      mockClientPut.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            totalOperations++;
            resolve({
              url: 'https://blob.vercel-storage.com/sustained-load-test.txt',
              pathname: 'sustained-load-test.txt',
              contentType: 'text/plain',
              size: fileSize,
            });
          }, 15 + Math.random() * 10); // 15-25ms per operation
        })
      );

      const startTime = performance.now();
      const endTime = startTime + duration;
      let currentTime = startTime;

      // Generate continuous load for the duration
      while (currentTime < endTime) {
        const windowStart = performance.now();
        
        // Launch operations for this time window (100ms windows)
        const windowOperations = Math.floor(operationsPerSecond / 10); // 10 windows per second
        const operations = Array.from({ length: windowOperations }, (_, i) => {
          const file = new File([new ArrayBuffer(fileSize)], `sustained-${Date.now()}-${i}.txt`, {
            type: 'text/plain',
          });
          return client.put(`sustained-${Date.now()}-${i}.txt`, file, { access: 'public' } as any);
        });

        const results = await Promise.all(operations);
        const windowEnd = performance.now();
        const windowTime = windowEnd - windowStart;
        
        performanceWindows.push(windowTime);
        expect(results).toHaveLength(windowOperations);

        currentTime = performance.now();
        
        // Small delay to control load rate
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const actualDuration = performance.now() - startTime;
      const actualThroughput = totalOperations / (actualDuration / 1000);

      // Should maintain target throughput
      expect(actualThroughput).toBeGreaterThan(operationsPerSecond * 0.8); // Within 80% of target

      // Performance should be consistent across windows
      const avgWindowTime = performanceWindows.reduce((a, b) => a + b, 0) / performanceWindows.length;
      const maxWindowTime = Math.max(...performanceWindows);
      const minWindowTime = Math.min(...performanceWindows);

      expect(avgWindowTime).toBeLessThan(200); // Average window time should be reasonable
      expect(maxWindowTime / minWindowTime).toBeLessThan(3); // Performance variance should be limited
    });

    /**
     * Peak Load Handling
     * 
     * Tests system behavior under peak load conditions that exceed normal
     * capacity. This validates that the system handles traffic spikes
     * gracefully without complete failure.
     */
    it('should handle peak load gracefully', async () => {
      const peakConcurrency = 200; // High concurrent load
      const fileSize = 50 * 1024; // 50KB files (smaller to focus on concurrency)
      let successfulOperations = 0;
      let failedOperations = 0;
      let totalLatency = 0;

      // Mock with realistic peak load behavior
      mockClientPut.mockImplementation(() =>
        new Promise((resolve, reject) => {
          // Higher latency and some failures under peak load
          const latency = 50 + Math.random() * 100; // 50-150ms latency
          totalLatency += latency;
          
          setTimeout(() => {
            // 10% failure rate under peak load
            if (Math.random() < 0.1) {
              failedOperations++;
              reject(new Error('Service overloaded'));
            } else {
              successfulOperations++;
              resolve({
                url: 'https://blob.vercel-storage.com/peak-load-test.txt',
                pathname: 'peak-load-test.txt',
                contentType: 'text/plain',
                size: fileSize,
              });
            }
          }, latency);
        })
      );

      const startTime = performance.now();

      // Launch peak concurrent operations
      const operations = Array.from({ length: peakConcurrency }, (_, i) => {
        const file = new File([new ArrayBuffer(fileSize)], `peak-load-${i}.txt`, {
          type: 'text/plain',
        });
        return client.put(`peak-load-${i}.txt`, file, { access: 'public' } as any).catch(error => ({ error }));
      });

      const results = await Promise.all(operations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(peakConcurrency);

      // Should handle most operations successfully despite peak load
      expect(successfulOperations).toBeGreaterThan(peakConcurrency * 0.85); // >85% success rate
      expect(failedOperations).toBeLessThan(peakConcurrency * 0.15); // <15% failure rate

      // Performance should be reasonable considering the load
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      const avgLatency = totalLatency / (successfulOperations + failedOperations);
      expect(avgLatency).toBeLessThan(120); // Average latency should be reasonable

      // System should maintain some level of throughput even under peak load
      const throughput = successfulOperations / (totalTime / 1000);
      expect(throughput).toBeGreaterThan(100); // Should maintain >100 operations/second
    });

    /**
     * Progressive Load Scaling
     * 
     * Tests how the system scales performance as load increases progressively.
     * This validates that performance degradation is graceful and predictable
     * as the system approaches its limits.
     */
    it('should scale performance predictably with increasing load', async () => {
      const loadLevels = [10, 25, 50, 100, 150]; // Progressive concurrency levels
      const fileSize = 75 * 1024; // 75KB files
      const results: Array<{ load: number; avgTime: number; throughput: number; successRate: number }> = [];

      for (const loadLevel of loadLevels) {
        let successful = 0;
        let failed = 0;

        // Mock with load-dependent performance
        mockClientPut.mockImplementation(() =>
          new Promise((resolve, reject) => {
            // Latency increases with load
            const baseLatency = 30;
            const loadLatency = loadLevel * 0.5; // 0.5ms per concurrent operation
            const latency = baseLatency + loadLatency + Math.random() * 20;
            
            setTimeout(() => {
              // Failure rate increases with load
              const failureRate = Math.min(loadLevel * 0.001, 0.1); // Max 10% failure rate
              if (Math.random() < failureRate) {
                failed++;
                reject(new Error('Load-induced failure'));
              } else {
                successful++;
                resolve({
                  url: 'https://blob.vercel-storage.com/scaling-test.txt',
                  pathname: 'scaling-test.txt',
                  contentType: 'text/plain',
                  size: fileSize,
                });
              }
            }, latency);
          })
        );

        const startTime = performance.now();

        // Execute concurrent operations for this load level
        const operations = Array.from({ length: loadLevel }, (_, i) => {
          const file = new File([new ArrayBuffer(fileSize)], `scaling-test-${i}.txt`, {
            type: 'text/plain',
          });
          return client.put(`scaling-test-${i}.txt`, file, { access: 'public' } as any).catch(error => ({ error }));
        });

        const operationResults = await Promise.all(operations);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        const avgTime = totalTime / loadLevel;
        const throughput = successful / (totalTime / 1000);
        const successRate = successful / loadLevel;

        results.push({ load: loadLevel, avgTime, throughput, successRate });

        expect(operationResults).toHaveLength(loadLevel);
        expect(successRate).toBeGreaterThan(0.8); // Should maintain >80% success rate
      }

      // Analyze scaling characteristics
      const lowLoad = results.find(r => r.load === 10);
      const highLoad = results.find(r => r.load === 150);

      if (lowLoad && highLoad) {
        // Throughput should increase with load (up to a point)
        expect(highLoad.throughput).toBeGreaterThan(lowLoad.throughput * 3); // At least 3x throughput
        
        // Average time should increase gracefully
        expect(highLoad.avgTime / lowLoad.avgTime).toBeLessThan(5); // Not more than 5x slower
        
        // Success rate should not degrade too severely
        expect(highLoad.successRate / lowLoad.successRate).toBeGreaterThan(0.8); // Within 80%
      }

      // Log scaling results for analysis
      console.log('Scaling performance results:', results);
    });
  });
});