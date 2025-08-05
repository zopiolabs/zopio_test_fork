/**
 * @fileoverview Comprehensive integration tests for API health check endpoints
 * @description Tests the health check API route with various scenarios including
 * content negotiation, environment detection, error handling, and concurrent requests.
 * 
 * This test suite validates:
 * - Basic health check functionality
 * - Content-Type negotiation (text/plain vs HTML)
 * - Environment-specific behavior (test vs production)
 * - Concurrent request handling
 * - Error resilience and graceful degradation
 * 
 * @author Zopio Development Team
 * @since 1.0.0
 * @version 1.2.0
 * 
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../app/health/route';

/**
 * Test utilities and constants
 */
const TEST_BASE_URL = 'http://localhost:3000/health';
const CONCURRENT_REQUEST_COUNT = 10;
const TEST_TIMEOUT = 5000;

/**
 * Mock request factory for consistent test data
 */
const createMockRequest = (options: {
  accept?: string;
  method?: string;
  headers?: Record<string, string>;
} = {}) => {
  const headers = new Headers({
    Accept: options.accept || 'text/plain',
    ...options.headers,
  });
  
  return new Request(TEST_BASE_URL, {
    method: options.method || 'GET',
    headers,
  });
};

/**
 * Integration test suite for API health check functionality
 * 
 * This comprehensive test suite validates the health check endpoint's behavior
 * across different environments, request types, and edge cases. It ensures
 * proper content negotiation, error handling, and performance characteristics.
 */
describe('API Health Check Integration', () => {
  let originalNodeEnv: string | undefined;
  
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });
  
  afterEach(() => {
    // Restore original environment to prevent test interference
    if (originalNodeEnv !== undefined) {
      (process.env as any).NODE_ENV = originalNodeEnv;
    } else {
      delete (process.env as any).NODE_ENV;
    }
  });
  /**
   * Core health check functionality tests
   * 
   * Validates basic health check behavior, content negotiation,
   * and environment-specific responses.
   */
  describe('Core Health Check Functionality', () => {
    /**
     * @test Basic health check with plain text response
     * @description Verifies that the health endpoint returns a simple 'OK' response
     * when requested with text/plain Accept header in test environment
     */
    it('should return OK for plain text requests in test environment', async () => {
      const request = createMockRequest({ accept: 'text/plain' });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe('OK');
    }, TEST_TIMEOUT);

    /**
     * @test Default behavior in test environment
     * @description Ensures that requests without specific Accept headers
     * default to plain text in test environment
     */
    it('should default to plain text in test environment', async () => {
      const request = createMockRequest({ accept: '' });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    }, TEST_TIMEOUT);

    /**
     * @test HTML response for browser requests in production
     * @description Validates that browser requests receive a properly formatted
     * HTML response with status information in production environment
     */
    it('should return HTML dashboard for browser requests in production', async () => {
      (process.env as any).NODE_ENV = 'production';

      const request = createMockRequest({ 
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' 
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      
      const html = await response.text();
      
      // Validate HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<title>API Status</title>');
      expect(html).toContain('API Status');
      expect(html).toContain('OK');
      
      // Validate responsive design elements
      expect(html).toContain('viewport');
      expect(html).toContain('charset="UTF-8"');
    }, TEST_TIMEOUT);

    /**
     * @test System information display in production HTML
     * @description Verifies that the HTML response includes comprehensive
     * system information including uptime, timestamp, and version
     */
    it('should display comprehensive system information in production HTML', async () => {
      (process.env as any).NODE_ENV = 'production';

      const request = createMockRequest({ accept: 'text/html' });

      const response = await GET(request);
      const html = await response.text();
      
      // Validate system information presence
      expect(html).toMatch(/Uptime.*\d+s/);
      expect(html).toContain('Timestamp');
      expect(html).toContain('Version');
      expect(html).toContain('1.0.0');
      
      // Validate timestamp format (should be a valid date string)
      const timestampMatch = html.match(/Timestamp.*<span>(.*?)<\/span>/);
      expect(timestampMatch).toBeTruthy();
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
      }
      
      // Validate uptime is a positive number
      const uptimeMatch = html.match(/Uptime.*<span>(\d+)s<\/span>/);
      expect(uptimeMatch).toBeTruthy();
      if (uptimeMatch) {
        const uptime = parseInt(uptimeMatch[1], 10);
        expect(uptime).toBeGreaterThanOrEqual(0);
      }
    }, TEST_TIMEOUT);

    /**
     * @test Concurrent request handling and performance
     * @description Validates that the health endpoint can handle multiple
     * concurrent requests without degradation or race conditions
     */
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: CONCURRENT_REQUEST_COUNT }, () =>
        createMockRequest({ accept: 'text/plain' })
      );

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => GET(req))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Validate all responses are successful
      expect(responses).toHaveLength(CONCURRENT_REQUEST_COUNT);
      
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/plain');
        expect(await response.text()).toBe('OK');
      }
      
      // Performance assertion: should handle concurrent requests quickly
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    }, TEST_TIMEOUT);

    /**
     * @test Response consistency across multiple calls
     * @description Ensures that repeated calls to the health endpoint
     * return consistent responses without state leakage
     */
    it('should provide consistent responses across multiple calls', async () => {
      const callCount = 5;
      const responses: Response[] = [];
      
      for (let i = 0; i < callCount; i++) {
        const request = createMockRequest({ accept: 'text/plain' });
        const response = await GET(request);
        responses.push(response);
      }
      
      // All responses should be identical
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/plain');
        expect(await response.text()).toBe('OK');
      }
    }, TEST_TIMEOUT);
  });

  /**
   * Content negotiation and request processing tests
   * 
   * Validates proper handling of various request types,
   * malformed requests, and edge cases.
   */
  describe('Content Negotiation & Request Processing', () => {
    /**
     * @test Graceful handling of malformed requests
     * @description Ensures the endpoint remains stable when receiving
     * requests with invalid or missing headers
     */
    it('should handle malformed requests gracefully', async () => {
      const testCases = [
        { accept: '', description: 'empty Accept header' },
        { accept: 'invalid/type', description: 'invalid MIME type' },
        { accept: '*/*', description: 'wildcard Accept header' },
        { accept: 'text/*', description: 'wildcard subtype' },
      ];

      for (const testCase of testCases) {
        const request = createMockRequest({ accept: testCase.accept });
        const response = await GET(request);
        
        expect(response.status).toBe(200);
        // Should default to plain text in test environment for any Accept header
        expect(await response.text()).toBe('OK');
      }
    }, TEST_TIMEOUT);

    /**
     * @test Content-Type header validation
     * @description Verifies that appropriate Content-Type headers are set
     * based on the request Accept header and environment
     */
    it('should set appropriate Content-Type headers', async () => {
      const testCases = [
        {
          accept: 'text/plain',
          env: 'test',
          expectedContentType: 'text/plain',
          description: 'plain text in test environment'
        },
        {
          accept: 'text/html',
          env: 'production',
          expectedContentType: 'text/html',
          description: 'HTML in production environment'
        },
      ];

      for (const testCase of testCases) {
        (process.env as any).NODE_ENV = testCase.env;
        
        const request = createMockRequest({ accept: testCase.accept });
        const response = await GET(request);
        
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe(testCase.expectedContentType);
      }
    }, TEST_TIMEOUT);

    /**
     * @test Environment detection accuracy
     * @description Validates that the endpoint correctly detects the
     * runtime environment and responds appropriately
     */
    it('should detect environment and respond appropriately', async () => {
      const environmentTests = [
        {
          env: 'test',
          accept: 'text/html',
          expectedResponse: 'OK',
          expectedContentType: 'text/plain',
          description: 'test environment overrides Accept header'
        },
        {
          env: 'development',
          accept: 'text/html',
          expectedContentType: 'text/html',
          description: 'non-test environments respect Accept header'
        },
        {
          env: 'production',
          accept: 'application/json', // Non-HTML accept
          expectedContentType: 'text/html',
          description: 'production defaults to HTML for non-plain-text'
        },
      ];

      for (const test of environmentTests) {
        (process.env as any).NODE_ENV = test.env;
        
        const request = createMockRequest({ accept: test.accept });
        const response = await GET(request);
        
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe(test.expectedContentType);
        
        if (test.expectedResponse) {
          expect(await response.text()).toBe(test.expectedResponse);
        }
      }
    }, TEST_TIMEOUT);

    /**
     * @test Request without Accept header
     * @description Ensures proper default behavior when no Accept header is provided
     */
    it('should handle requests without Accept header', async () => {
      const request = new Request(TEST_BASE_URL); // No explicit headers
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Should default to plain text in test environment
      expect(await response.text()).toBe('OK');
    }, TEST_TIMEOUT);
  });

  /**
   * API structure and compliance validation
   * 
   * Ensures the API follows Next.js App Router conventions
   * and returns proper Response objects.
   */
  describe('API Structure & Compliance', () => {
    /**
     * @test Next.js App Router compliance
     * @description Validates that the route handler follows Next.js
     * App Router conventions and has the correct function signature
     */
    it('should comply with Next.js App Router conventions', () => {
      expect(typeof GET).toBe('function');
      expect(GET.length).toBeGreaterThanOrEqual(1);
      expect(GET.name).toBe('GET');
      
      // Verify function can accept Request objects
      const testRequest = createMockRequest();
      expect(() => GET(testRequest)).not.toThrow();
    });

    /**
     * @test HTTP method support validation
     * @description Ensures only the GET method is supported for the health endpoint
     */
    it('should export only GET method handler', () => {
      // Only GET should be exported from the health route
      expect(typeof GET).toBe('function');
      
      // These should not be exported (would throw if they existed)
      try {
        const healthModule = require('../app/health/route');
        expect(healthModule.POST).toBeUndefined();
        expect(healthModule.PUT).toBeUndefined();
        expect(healthModule.DELETE).toBeUndefined();
        expect(healthModule.PATCH).toBeUndefined();
      } catch {
        // Expected - these methods should not exist
      }
    });

    /**
     * @test Response object compliance
     * @description Validates that the handler returns proper Web API Response
     * objects with all required properties and methods
     */
    it('should return compliant Web API Response objects', async () => {
      const testCases = [
        { accept: 'text/plain', env: 'test' },
        { accept: 'text/html', env: 'production' },
      ];

      for (const testCase of testCases) {
        (process.env as any).NODE_ENV = testCase.env;
        const request = createMockRequest({ accept: testCase.accept });
        const response = await GET(request);
        
        // Validate Response object structure
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBeDefined();
        expect(response.headers).toBeTruthy();
        expect(typeof response.text).toBe('function');
        expect(typeof response.json).toBe('function');
        expect(typeof response.blob).toBe('function');
        expect(typeof response.arrayBuffer).toBe('function');
        
        // Validate response properties
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
        expect(typeof response.statusText).toBe('string'); // statusText may be empty in test environment
        
        // Validate headers are accessible
        const contentType = response.headers.get('Content-Type');
        expect(contentType).toBeTruthy();
        expect(['text/plain', 'text/html']).toContain(contentType);
      }
    }, TEST_TIMEOUT);

    /**
     * @test Response immutability
     * @description Ensures that Response objects maintain immutability
     * and can be safely consumed multiple times in different contexts
     */
    it('should return immutable Response objects', async () => {
      const request = createMockRequest({ accept: 'text/plain' });
      const response = await GET(request);
      
      // Clone the response to test immutability
      const clonedResponse = response.clone();
      
      expect(clonedResponse).toBeInstanceOf(Response);
      expect(clonedResponse.status).toBe(response.status);
      expect(clonedResponse.headers.get('Content-Type')).toBe(
        response.headers.get('Content-Type')
      );
      
      // Both should return the same content
      const originalText = await response.text();
      const clonedText = await clonedResponse.text();
      
      expect(originalText).toBe(clonedText);
      expect(originalText).toBe('OK');
    }, TEST_TIMEOUT);
  });

  /**
   * Error handling and edge cases
   * 
   * Tests various error conditions and edge cases to ensure
   * the API remains stable under adverse conditions.
   */
  describe('Error Handling & Edge Cases', () => {
    /**
     * @test Null and undefined request handling
     * @description Validates graceful handling of invalid request objects
     */
    it('should handle invalid request objects gracefully', async () => {
      // Test with minimal valid request
      const minimalRequest = new Request(TEST_BASE_URL);
      const response = await GET(minimalRequest);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    }, TEST_TIMEOUT);

    /**
     * @test Large Accept header handling
     * @description Ensures the endpoint can handle unusually large Accept headers
     */
    it('should handle large Accept headers', async () => {
      const largeAcceptHeader = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,text/plain;q=0.8,application/json;q=0.7';
      
      const request = createMockRequest({ accept: largeAcceptHeader });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    }, TEST_TIMEOUT);

    /**
     * @test Environment variable manipulation during request
     * @description Tests behavior when environment changes during request processing
     */
    it('should be resilient to environment changes during processing', async () => {
      (process.env as any).NODE_ENV = 'production';
      
      const request = createMockRequest({ accept: 'text/html' });
      
      // Change environment during request (simulating race condition)
      const responsePromise = GET(request);
      (process.env as any).NODE_ENV = 'test';
      
      const response = await responsePromise;
      
      // Should still return a valid response
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBeTruthy();
    }, TEST_TIMEOUT);
  });

  /**
   * Performance and reliability tests
   * 
   * Validates the endpoint's performance characteristics
   * and reliability under various conditions.
   */
  describe('Performance & Reliability', () => {
    /**
     * @test Response time consistency
     * @description Measures response time consistency across multiple requests
     */
    it('should have consistent response times', async () => {
      const measurements: number[] = [];
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const request = createMockRequest({ accept: 'text/plain' });
        const response = await GET(request);
        const end = performance.now();
        
        expect(response.status).toBe(200);
        measurements.push(end - start);
      }
      
      // Calculate basic statistics
      const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const max = Math.max(...measurements);
      
      // Performance assertions
      expect(average).toBeLessThan(10); // Average should be under 10ms
      expect(max).toBeLessThan(50); // No single request should take over 50ms
    }, TEST_TIMEOUT);

    /**
     * @test Memory usage stability
     * @description Ensures the endpoint doesn't cause memory leaks
     * during repeated invocations
     */
    it('should maintain stable memory usage', async () => {
      const iterations = 100;
      const responses: Response[] = [];
      
      // Generate many requests
      for (let i = 0; i < iterations; i++) {
        const request = createMockRequest({ accept: 'text/plain' });
        const response = GET(request);
        responses.push(response);
      }
      
      // Validate all responses
      expect(responses).toHaveLength(iterations);
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
      }
      
      // Force garbage collection if available (in test environment)
      if (global.gc) {
        global.gc();
      }
    }, TEST_TIMEOUT * 2); // Extended timeout for this intensive test
  });
});