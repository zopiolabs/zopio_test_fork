/**
 * @fileoverview Health endpoint API tests
 *
 * Comprehensive test suite for the health check endpoint that validates:
 * - Plain text responses for test environments and explicit Accept headers
 * - HTML dashboard responses for browser requests
 * - Response headers and content types
 * - Edge cases and error scenarios
 * - Performance characteristics
 *
 * The health endpoint serves dual purposes:
 * 1. Simple text response for monitoring and CI/CD systems
 * 2. Rich HTML dashboard for human-readable status information
 *
 * @module HealthEndpointTests
 * @author Zopio Development Team
 * @since 1.0.0
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GET } from '../app/health/route';

/**
 * Test suite for health endpoint functionality
 *
 * Tests the health check endpoint which provides system status information
 * in two formats: plain text for automated systems and HTML for human viewing.
 * The endpoint behavior is determined by the Accept header and NODE_ENV.
 */
describe('Health Endpoint', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    vi.unstubAllEnvs();
  });

  /**
   * Test suite for plain text responses
   *
   * Validates scenarios where the endpoint should return simple "OK" text:
   * - Test environment
   * - Explicit text/plain Accept header
   * - Monitoring and CI/CD use cases
   */
  describe('Plain Text Response', () => {
    /**
     * Should return plain text when Accept header includes text/plain
     */
    test('returns OK with text/plain accept header', async () => {
      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/plain',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe('OK');
    });

    /**
     * Should return plain text in test environment regardless of Accept header
     */
    test('returns OK in test environment', async () => {
      vi.stubEnv('NODE_ENV', 'test');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'application/json', // Different accept header
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe('OK');
    });

    /**
     * Should handle mixed Accept headers containing text/plain
     */
    test('returns OK with mixed accept headers including text/plain', async () => {
      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe('OK');
    });

    /**
     * Should handle case-insensitive Accept header matching
     */
    test('handles case-insensitive accept header matching', async () => {
      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'TEXT/PLAIN',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe('OK');
    });
  });

  /**
   * Test suite for HTML dashboard responses
   *
   * Validates scenarios where the endpoint should return rich HTML dashboard:
   * - Browser requests without text/plain Accept header
   * - HTML structure and content validation
   * - Dynamic content like uptime and timestamp
   */
  describe('HTML Dashboard Response', () => {
    /**
     * Should return HTML dashboard for browser requests
     */
    test('returns HTML dashboard for browser requests', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const response = await GET(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>API Status</title>');
      expect(html).toContain('API Status');
      expect(html).toContain('Status:');
      expect(html).toContain('OK');
      expect(html).toContain('Uptime:');
      expect(html).toContain('Timestamp:');
      expect(html).toContain('Version:');
    });

    /**
     * Should return HTML when no Accept header is provided
     */
    test('returns HTML dashboard when no accept header provided', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health');

      const response = await GET(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(html).toContain('<!DOCTYPE html>');
    });

    /**
     * Should include proper HTML structure and accessibility features
     */
    test('includes proper HTML structure and accessibility', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html',
        },
      });

      const response = await GET(request);
      const html = await response.text();

      // HTML structure validation
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<meta charset="UTF-8"');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>API Status</title>');

      // Content validation
      expect(html).toContain('<h1>API Status</h1>');
      expect(html).toContain('class="ok"');
      expect(html).toContain('Version:</span><span>1.0.0</span>');
    });

    /**
     * Should include dynamic uptime information
     */
    test('includes dynamic uptime information', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html',
        },
      });

      const response = await GET(request);
      const html = await response.text();

      // Should contain uptime with 's' suffix (seconds)
      expect(html).toMatch(/Uptime:<\/span><span>\d+s<\/span>/);
    });

    /**
     * Should include current timestamp
     */
    test('includes current timestamp', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html',
        },
      });

      const response = await GET(request);
      const html = await response.text();

      // Should contain timestamp (basic format validation)
      expect(html).toMatch(/Timestamp:<\/span><span>[\d\/\s:,APM]+<\/span>/);
    });
  });

  /**
   * Test suite for edge cases and error scenarios
   *
   * Validates the endpoint's robustness with unusual inputs and conditions
   */
  describe('Edge Cases', () => {
    /**
     * Should handle requests with missing headers object
     */
    test('handles requests with missing headers', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      // Create request without explicit headers
      const request = new Request('http://localhost/health');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    /**
     * Should handle empty Accept header
     */
    test('handles empty accept header', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: '',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    /**
     * Should handle unusual Accept header values
     */
    test('handles unusual accept headers', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const testCases = [
        'application/json',
        'image/png',
        '*/*',
        '   text/html   ', // with whitespace
        'application/vnd.api+json',
      ];

      for (const acceptHeader of testCases) {
        const request = new Request('http://localhost/health', {
          headers: {
            Accept: acceptHeader,
          },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        if (acceptHeader.toLowerCase().includes('text/plain')) {
          expect(response.headers.get('Content-Type')).toBe('text/plain');
        } else {
          expect(response.headers.get('Content-Type')).toBe('text/html');
        }
      }
    });

    /**
     * Should handle different NODE_ENV values
     */
    test('handles different NODE_ENV values', async () => {
      const environments = ['development', 'production', 'staging', 'local'];

      for (const env of environments) {
        vi.stubEnv('NODE_ENV', env);

        const request = new Request('http://localhost/health', {
          headers: {
            Accept: 'text/html',
          },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        if (env === 'test') {
          expect(response.headers.get('Content-Type')).toBe('text/plain');
        } else {
          expect(response.headers.get('Content-Type')).toBe('text/html');
        }
      }
    });
  });

  /**
   * Test suite for performance and reliability
   *
   * Validates the endpoint's performance characteristics and reliability
   */
  describe('Performance and Reliability', () => {
    /**
     * Should respond quickly for plain text requests
     */
    test('responds quickly for plain text requests', async () => {
      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/plain',
        },
      });

      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // Should respond in under 100ms
    });

    /**
     * Should respond quickly for HTML requests
     */
    test('responds quickly for HTML requests', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html',
        },
      });

      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // Should respond in under 100ms
    });

    /**
     * Should handle concurrent requests correctly
     */
    test('handles concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        new Request('http://localhost/health', {
          headers: {
            Accept: 'text/plain',
          },
        })
      );

      const responses = await Promise.all(
        requests.map(request => GET(request))
      );

      // All responses should be successful
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
      }
    });

    /**
     * Should produce consistent responses for identical requests
     */
    test('produces consistent responses', async () => {
      const request = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/plain',
        },
      });

      const responses = await Promise.all([
        GET(request.clone()),
        GET(request.clone()),
        GET(request.clone()),
      ]);

      const texts = await Promise.all(
        responses.map(response => response.text())
      );

      // All responses should be identical
      expect(new Set(texts).size).toBe(1); // Only one unique response
      expect(texts[0]).toBe('OK');
    });
  });

  /**
   * Test suite for HTTP specification compliance
   *
   * Validates the endpoint follows HTTP standards and best practices
   */
  describe('HTTP Compliance', () => {
    /**
     * Should set appropriate Content-Type headers
     */
    test('sets correct content-type headers', async () => {
      // Test plain text
      const plainRequest = new Request('http://localhost/health', {
        headers: { Accept: 'text/plain' },
      });
      const plainResponse = await GET(plainRequest);
      expect(plainResponse.headers.get('Content-Type')).toBe('text/plain');

      // Test HTML
      vi.stubEnv('NODE_ENV', 'production');
      const htmlRequest = new Request('http://localhost/health', {
        headers: { Accept: 'text/html' },
      });
      const htmlResponse = await GET(htmlRequest);
      expect(htmlResponse.headers.get('Content-Type')).toBe('text/html');
    });

    /**
     * Should return valid HTTP status codes
     */
    test('returns valid HTTP status codes', async () => {
      const request = new Request('http://localhost/health', {
        headers: { Accept: 'text/plain' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true); // Response is successful
    });

    /**
     * Should handle different HTTP methods gracefully
     */
    test('is designed for GET requests', async () => {
      // The route file only exports GET, which is correct for health checks
      const request = new Request('http://localhost/health', {
        method: 'GET',
        headers: { Accept: 'text/plain' },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});
