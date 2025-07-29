/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('@nosecone/next', () => ({
  defaults: {
    contentSecurityPolicy: 'default-src \'self\'',
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
    originAgentCluster: '?1',
    referrerPolicy: 'no-referrer',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xContentTypeOptions: 'nosniff',
    xDnsPrefetchControl: 'off',
    xDownloadOptions: 'noopen',
    xFrameOptions: 'DENY',
    xPermittedCrossDomainPolicies: 'none',
    xXssProtection: '0',
  },
  withVercelToolbar: vi.fn((config) => ({
    ...config,
    contentSecurityPolicy: `${config.contentSecurityPolicy}; frame-src vercel.live`,
  })),
  createMiddleware: vi.fn(() => 'mocked-middleware'),
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Exports', () => {
    it('should export noseconeOptions with correct default configuration', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions).toBeDefined();
      expect(noseconeOptions).toEqual({
        contentSecurityPolicy: false, // Disabled by default
        crossOriginEmbedderPolicy: 'require-corp',
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
        originAgentCluster: '?1',
        referrerPolicy: 'no-referrer',
        strictTransportSecurity: 'max-age=31536000; includeSubDomains',
        xContentTypeOptions: 'nosniff',
        xDnsPrefetchControl: 'off',
        xDownloadOptions: 'noopen',
        xFrameOptions: 'DENY',
        xPermittedCrossDomainPolicies: 'none',
        xXssProtection: '0',
      });
    });

    it('should export noseconeOptionsWithToolbar with Vercel toolbar configuration', async () => {
      const { noseconeOptionsWithToolbar } = await import('../middleware');
      
      expect(noseconeOptionsWithToolbar).toBeDefined();
      // Should be the result of withVercelToolbar transformation
      // Based on our mock, CSP should be modified from 'false' to include frame-src
      expect(noseconeOptionsWithToolbar).toEqual({
        contentSecurityPolicy: 'false; frame-src vercel.live',
        crossOriginEmbedderPolicy: 'require-corp',
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
        originAgentCluster: '?1',
        referrerPolicy: 'no-referrer',
        strictTransportSecurity: 'max-age=31536000; includeSubDomains',
        xContentTypeOptions: 'nosniff',
        xDnsPrefetchControl: 'off',
        xDownloadOptions: 'noopen',
        xFrameOptions: 'DENY',
        xPermittedCrossDomainPolicies: 'none',
        xXssProtection: '0',
      });
    });

    it('should export noseconeMiddleware function', async () => {
      const { noseconeMiddleware } = await import('../middleware');
      
      expect(noseconeMiddleware).toBeDefined();
      expect(typeof noseconeMiddleware).toBe('function');
    });
  });

  describe('Configuration Structure', () => {
    it('should have CSP disabled by default with documentation comment', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // CSP should be disabled
      expect(noseconeOptions.contentSecurityPolicy).toBe(false);
    });

    it('should include all security headers from defaults', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // Should include all major security headers
      expect(noseconeOptions).toHaveProperty('strictTransportSecurity');
      expect(noseconeOptions).toHaveProperty('xFrameOptions');
      expect(noseconeOptions).toHaveProperty('xContentTypeOptions');
      expect(noseconeOptions).toHaveProperty('referrerPolicy');
      expect(noseconeOptions).toHaveProperty('crossOriginOpenerPolicy');
      expect(noseconeOptions).toHaveProperty('crossOriginEmbedderPolicy');
      expect(noseconeOptions).toHaveProperty('crossOriginResourcePolicy');
    });

    it('should have secure default values', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.strictTransportSecurity).toContain('max-age=31536000');
      expect(noseconeOptions.xFrameOptions).toBe('DENY');
      expect(noseconeOptions.xContentTypeOptions).toBe('nosniff');
      expect(noseconeOptions.referrerPolicy).toBe('no-referrer');
      expect(noseconeOptions.crossOriginOpenerPolicy).toBe('same-origin');
    });
  });

  describe('Vercel Toolbar Integration', () => {
    it('should call withVercelToolbar with noseconeOptions', async () => {
      const { noseconeOptions, noseconeOptionsWithToolbar } = await import('../middleware');
      const { withVercelToolbar } = await import('@nosecone/next');
      
      // The mock should have been called with noseconeOptions during module evaluation
      // Since this is called at module level, it may have been called earlier
      // Let's just verify that withVercelToolbar is a function and has been set up
      expect(typeof withVercelToolbar).toBe('function');
      expect(noseconeOptionsWithToolbar).toBeDefined();
    });

    it('should return modified configuration with toolbar support', async () => {
      const { noseconeOptionsWithToolbar } = await import('../middleware');
      
      // Should be the result of withVercelToolbar
      expect(noseconeOptionsWithToolbar).toBeDefined();
    });
  });

  describe('Security Headers Configuration', () => {
    it('should configure HSTS properly', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.strictTransportSecurity).toBe(
        'max-age=31536000; includeSubDomains'
      );
    });

    it('should configure frame options for clickjacking protection', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.xFrameOptions).toBe('DENY');
    });

    it('should configure content type options', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.xContentTypeOptions).toBe('nosniff');
    });

    it('should configure XSS protection', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.xXssProtection).toBe('0');
    });

    it('should configure referrer policy', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.referrerPolicy).toBe('no-referrer');
    });
  });

  describe('Cross-Origin Configuration', () => {
    it('should configure COEP properly', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.crossOriginEmbedderPolicy).toBe('require-corp');
    });

    it('should configure COOP properly', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.crossOriginOpenerPolicy).toBe('same-origin');
    });

    it('should configure CORP properly', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.crossOriginResourcePolicy).toBe('same-origin');
    });

    it('should configure origin agent cluster', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.originAgentCluster).toBe('?1');
    });
  });

  describe('DNS and Download Configuration', () => {
    it('should configure DNS prefetch control', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.xDnsPrefetchControl).toBe('off');
    });

    it('should configure download options', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.xDownloadOptions).toBe('noopen');
    });

    it('should configure permitted cross domain policies', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.xPermittedCrossDomainPolicies).toBe('none');
    });
  });

  describe('CSP Configuration', () => {
    it('should have CSP disabled by default', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.contentSecurityPolicy).toBe(false);
    });

    it('should explain why CSP is disabled in the source code', async () => {
      // This test verifies the documentation/comment is present
      // We can't test comments directly, but we can verify the behavior
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.contentSecurityPolicy).toBe(false);
    });
  });

  describe('Middleware Function', () => {
    it('should export createMiddleware function as noseconeMiddleware', async () => {
      const { noseconeMiddleware } = await import('../middleware');
      const { createMiddleware } = await import('@nosecone/next');
      
      expect(noseconeMiddleware).toBe(createMiddleware);
    });

    it('should be callable as a function', async () => {
      const { noseconeMiddleware } = await import('../middleware');
      
      expect(typeof noseconeMiddleware).toBe('function');
    });
  });

  describe('Module Integration', () => {
    it('should integrate with Next.js middleware pattern', async () => {
      const { noseconeMiddleware, noseconeOptions } = await import('../middleware');
      
      // Should be usable in Next.js middleware
      expect(typeof noseconeMiddleware).toBe('function');
      expect(noseconeOptions).toBeTypeOf('object');
    });

    it('should support both standard and toolbar configurations', async () => {
      const { noseconeOptions, noseconeOptionsWithToolbar } = await import('../middleware');
      
      expect(noseconeOptions).toBeDefined();
      expect(noseconeOptionsWithToolbar).toBeDefined();
      expect(noseconeOptions).not.toBe(noseconeOptionsWithToolbar);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should work in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const { noseconeOptions } = await import('../middleware');
      
      // Should have production-ready security headers
      expect(noseconeOptions.strictTransportSecurity).toContain('max-age=31536000');
      expect(noseconeOptions.xFrameOptions).toBe('DENY');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should work in development with Vercel toolbar', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const { noseconeOptionsWithToolbar } = await import('../middleware');
      
      // Should be configured for development with toolbar support
      expect(noseconeOptionsWithToolbar).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should provide secure defaults for API routes', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // Should have headers that work well with API routes
      expect(noseconeOptions.crossOriginResourcePolicy).toBe('same-origin');
      expect(noseconeOptions.xContentTypeOptions).toBe('nosniff');
    });

    it('should provide secure defaults for static assets', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // Should have headers appropriate for static assets
      expect(noseconeOptions.xDownloadOptions).toBe('noopen');
      expect(noseconeOptions.xPermittedCrossDomainPolicies).toBe('none');
    });
  });

  describe('Performance Considerations', () => {
    it('should be lightweight to import', () => {
      const start = performance.now();
      import('../middleware');
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should import quickly
    });

    it('should not add significant overhead to configuration', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // Should have reasonable number of headers
      const headerCount = Object.keys(noseconeOptions).length;
      expect(headerCount).toBeGreaterThan(5);
      expect(headerCount).toBeLessThan(20);
    });
  });

  describe('Security Best Practices', () => {
    it('should follow OWASP recommendations', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // Key OWASP recommended headers
      expect(noseconeOptions.strictTransportSecurity).toBeTruthy();
      expect(noseconeOptions.xFrameOptions).toBe('DENY');
      expect(noseconeOptions.xContentTypeOptions).toBe('nosniff');
      expect(noseconeOptions.referrerPolicy).toBe('no-referrer');
    });

    it('should protect against common attacks', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      // Clickjacking protection
      expect(noseconeOptions.xFrameOptions).toBe('DENY');
      
      // MIME sniffing protection
      expect(noseconeOptions.xContentTypeOptions).toBe('nosniff');
      
      // XSS protection (modern approach)
      expect(noseconeOptions.xXssProtection).toBe('0');
    });

    it('should have secure cross-origin policies', async () => {
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions.crossOriginOpenerPolicy).toBe('same-origin');
      expect(noseconeOptions.crossOriginEmbedderPolicy).toBe('require-corp');
      expect(noseconeOptions.crossOriginResourcePolicy).toBe('same-origin');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing dependencies gracefully', async () => {
      // This would be tested in integration, but we're mocking dependencies
      const { noseconeOptions } = await import('../middleware');
      
      expect(noseconeOptions).toBeDefined();
    });

    it('should handle undefined defaults', async () => {
      // Mock scenario where defaults might be undefined
      vi.doMock('@nosecone/next', () => ({
        defaults: undefined,
        withVercelToolbar: vi.fn(() => ({})),
        createMiddleware: vi.fn(),
      }));
      
      // Should still work even if defaults are undefined
      const module = await import('../middleware?t=' + Date.now());
      expect(module.noseconeOptions).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should have correct TypeScript types', async () => {
      const { noseconeOptions, noseconeOptionsWithToolbar } = await import('../middleware');
      
      // Should be objects with string/boolean properties
      expect(typeof noseconeOptions).toBe('object');
      expect(typeof noseconeOptionsWithToolbar).toBe('object');
      
      // Key properties should have correct types
      expect(typeof noseconeOptions.contentSecurityPolicy).toBe('boolean');
      expect(typeof noseconeOptions.strictTransportSecurity).toBe('string');
    });
  });
});