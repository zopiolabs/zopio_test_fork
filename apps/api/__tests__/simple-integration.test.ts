/**
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { GET } from '../app/health/route';

describe('Basic API Functionality', () => {
  describe('Health Check', () => {
    it('should return OK for test requests', async () => {
      const mockRequest = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/plain',
        },
      });

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    });

    it('should return HTML for browser requests in non-test environment', async () => {
      // Temporarily change NODE_ENV to simulate production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockRequest = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      
      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('API Status');
      expect(html).toContain('OK');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should show process uptime in production mode', async () => {
      // Temporarily change NODE_ENV to simulate production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockRequest = new Request('http://localhost/health', {
        headers: {
          Accept: 'text/html',
        },
      });

      const response = await GET(mockRequest);
      const html = await response.text();
      
      // Should contain uptime information
      expect(html).toMatch(/Uptime.*\d+s/);
      expect(html).toContain('Timestamp');
      expect(html).toContain('Version');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        new Request('http://localhost/health', {
          headers: { Accept: 'text/plain' },
        })
      );

      const responses = await Promise.all(
        requests.map(req => GET(req))
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('OK');
      }
    });
  });

  describe('Request Processing', () => {
    it('should handle malformed requests gracefully', async () => {
      // Test with invalid headers
      const invalidRequest = new Request('http://localhost/health', {
        headers: {
          Accept: '', // Empty accept header
        },
      });

      const response = await GET(invalidRequest);
      expect(response.status).toBe(200);
    });

    it('should detect test environment correctly', async () => {
      // Should return plain text in test environment
      const testRequest = new Request('http://localhost/health');
      const response = await GET(testRequest);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    });
  });

  describe('API Structure Validation', () => {
    it('should have proper route structure', () => {
      // Validate that routes are properly exported
      expect(typeof GET).toBe('function');
      expect(GET.length).toBeGreaterThanOrEqual(1); // Should accept at least one parameter
    });

    it('should handle Response object properly', async () => {
      const request = new Request('http://localhost/health', {
        headers: { Accept: 'text/plain' },
      });

      const response = await GET(request);
      
      // Validate response is a proper Response object
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBeDefined();
      expect(response.headers).toBeDefined();
      expect(typeof response.text).toBe('function');
    });
  });
});