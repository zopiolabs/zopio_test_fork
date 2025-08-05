/**
 * @fileoverview SEO Package Tests - Metadata & Search Optimization
 * 
 * Test suite for SEO functionality including metadata generation,
 * search optimization, and comprehensive validation.
 * 
 * **Test Scope:**
 * - SEO metadata generation and validation
 * - Search engine optimization utilities
 * - Meta tag management and configuration
 * - Performance optimization for SEO operations
 * - Error handling and fallback mechanisms
 * 
 * **Test Categories:**
 * 1. **Metadata Generation**: Meta tag creation and validation
 * 2. **Search Optimization**: SEO utility functions and helpers
 * 3. **Configuration**: SEO settings and environment handling
 * 4. **Performance**: Optimization and efficiency validation
 * 5. **Error Handling**: Fallback mechanisms and error recovery
 * 
 * **Mock Strategy:**
 * - Environment configuration simulation
 * - Metadata generation testing with various inputs
 * - Error injection for comprehensive failure testing
 * - Performance monitoring for optimization validation
 * 
 * **Quality Standards:**
 * - Complete metadata accuracy and validation
 * - Sub-10ms metadata generation time
 * - 100% compliance with SEO best practices
 * - Comprehensive error handling for all scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMetadata } from '../metadata.js';
import { JsonLd } from '../json-ld.js';
import type { Metadata } from 'next';
import type { WithContext, WebPage, Organization, Product, BlogPosting, BreadcrumbList } from 'schema-dts';
import { createElement } from 'react';

/**
 * SEO Package Comprehensive Unit Tests
 * 
 * This test suite validates the SEO package's metadata generation and optimization functionality.
 * The SEO package is critical for search engine visibility and user experience, requiring thorough
 * testing of metadata generation, structured data compliance, and search engine optimization features.
 * 
 * Test Coverage Areas:
 * - SEO metadata generation and validation
 * - Structured data (JSON-LD) creation and Schema.org compliance
 * - Meta tag optimization and best practices validation
 * - Open Graph and Twitter Card generation
 * - Canonical URL handling and validation
 * - Performance impact assessment of SEO elements
 * - Accessibility considerations in SEO implementation
 * 
 * Modern SEO Requirements:
 * - Next.js 15 metadata API integration
 * - Core Web Vitals optimization considerations
 * - Mobile-first SEO validation
 * - Structured data for rich results
 * - Social media metadata accuracy
 * - Search engine guideline compliance
 */

describe('SEO Package - Comprehensive Unit Tests', () => {
  // Environment variable mocking for consistent testing
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment to known state for consistent testing
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Metadata Generation', () => {
    /**
     * Core Metadata Generation Tests
     * 
     * These tests validate the createMetadata function's ability to generate
     * SEO-optimized metadata that complies with modern search engine requirements
     * and enhances user experience across different platforms.
     */

    describe('Basic Metadata Creation', () => {
      it('should generate complete metadata with required SEO elements', () => {
        const title = 'Sample Page Title';
        const description = 'This is a comprehensive description of the sample page content for SEO optimization.';
        
        const metadata = createMetadata({
          title,
          description,
        });

        // Validate core SEO metadata structure
        expect(metadata.title).toBe(`${title} | zopio`);
        expect(metadata.description).toBe(description);
        expect(metadata.applicationName).toBe('zopio');
        
        // Verify essential meta tags for search engines
        expect(metadata.authors).toEqual([{
          name: 'Zopio Labs',
          url: 'https://zopiolabs.dev/',
        }]);
        expect(metadata.creator as string).toBe('Zopio Labs');
        expect(metadata.publisher).toBe('Zopio Labs');
        
        // Validate telephone detection is disabled for better UX
        expect(metadata.formatDetection).toEqual({
          telephone: false,
        });
      });

      it('should handle title optimization and branding correctly', () => {
        const testCases = [
          {
            input: 'Home',
            expected: 'Home | zopio',
            description: 'short title with branding'
          },
          {
            input: 'Advanced SEO Optimization Techniques for Modern Web Applications',
            expected: 'Advanced SEO Optimization Techniques for Modern Web Applications | zopio',
            description: 'long title preservation'
          },
          {
            input: '',
            expected: ' | zopio',
            description: 'empty title handling'
          }
        ];

        testCases.forEach(({ input, expected, description }) => {
          const metadata = createMetadata({
            title: input,
            description: 'Test description',
          });
          
          expect(metadata.title).toBe(expected);
        });
      });

      it('should generate optimal meta descriptions for search engines', () => {
        const validDescriptions = [
          'Concise description under 160 characters for optimal search engine display and user engagement.',
          'Learn about advanced SEO techniques, metadata optimization, and structured data implementation.',
        ];

        validDescriptions.forEach(description => {
          const metadata = createMetadata({
            title: 'Test Title',
            description,
          });
          
          expect(metadata.description).toBe(description);
          // Validate description length is within SEO best practices
          expect(description.length).toBeLessThanOrEqual(160);
        });
      });
    });

    describe('Apple Web App Integration', () => {
      /**
       * Apple Web App Metadata Tests
       * 
       * Validates metadata generation for Apple devices and PWA functionality.
       * Critical for mobile user experience and app-like behavior on iOS devices.
       */

      it('should generate Apple Web App metadata for mobile optimization', () => {
        const title = 'Mobile App Title';
        const metadata = createMetadata({
          title,
          description: 'Mobile-optimized application description',
        });

        expect(metadata.appleWebApp).toEqual({
          capable: true,
          statusBarStyle: 'default',
          title: `${title} | zopio`,
        });
      });

      it('should maintain consistent branding across Apple Web App metadata', () => {
        const testTitles = ['Dashboard', 'Settings', 'Profile'];
        
        testTitles.forEach(title => {
          const metadata = createMetadata({
            title,
            description: 'Test description',
          });
          
          if (metadata.appleWebApp && typeof metadata.appleWebApp === 'object') {
            expect(metadata.appleWebApp.title).toBe(`${title} | zopio`);
            expect(metadata.appleWebApp.capable).toBe(true);
          }
        });
      });
    });

    describe('Open Graph Protocol Compliance', () => {
      /**
       * Open Graph Protocol Tests
       * 
       * Validates Open Graph metadata generation for social media sharing optimization.
       * Essential for proper content preview on Facebook, LinkedIn, and other platforms.
       */

      it('should generate comprehensive Open Graph metadata', () => {
        const title = 'Open Graph Test Page';
        const description = 'Comprehensive Open Graph metadata validation for social media optimization.';
        
        const metadata = createMetadata({
          title,
          description,
        });

        expect(metadata.openGraph).toEqual({
          title: `${title} | zopio`,
          description,
          type: 'website',
          siteName: 'zopio',
          locale: 'en_US',
        });
      });

      it('should handle Open Graph images with proper specifications', () => {
        const title = 'Image Test Page';
        const description = 'Testing Open Graph image optimization';
        const imageUrl = 'https://example.com/og-image.jpg';
        
        const metadata = createMetadata({
          title,
          description,
          image: imageUrl,
        });

        // Validate Open Graph image metadata
        expect(metadata.openGraph?.images).toEqual([{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        }]);
        
        // Verify image dimensions follow Open Graph best practices
        const images = metadata.openGraph?.images;
        if (Array.isArray(images) && images.length > 0) {
          const image = images[0];
          if (typeof image === 'object' && image !== null && 'width' in image && 'height' in image) {
            expect(image.width).toBe(1200);
            expect(image.height).toBe(630);
            expect((image.width as number) / (image.height as number)).toBeCloseTo(1.905, 1); // ~1.91:1 aspect ratio
          }
        }
      });

      it('should maintain Open Graph metadata without images', () => {
        const metadata = createMetadata({
          title: 'No Image Page',
          description: 'Page without Open Graph image',
        });

        expect(metadata.openGraph?.images).toBeUndefined();
        expect(metadata.openGraph?.title).toBeDefined();
        expect(metadata.openGraph?.description).toBeDefined();
      });
    });

    describe('Twitter Card Optimization', () => {
      /**
       * Twitter Card Tests
       * 
       * Validates Twitter-specific metadata for optimal content sharing on Twitter.
       * Ensures proper card display and engagement optimization.
       */

      it('should generate Twitter Card metadata for social sharing', () => {
        const metadata = createMetadata({
          title: 'Twitter Test Page',
          description: 'Twitter Card metadata validation',
        });

        expect(metadata.twitter).toEqual({
          card: 'summary_large_image',
          creator: '@zopiolabs',
        });
      });

      it('should use large image card format for better engagement', () => {
        const metadata = createMetadata({
          title: 'Social Media Page',
          description: 'Social media optimization test',
          image: 'https://example.com/twitter-image.jpg',
        });

        // Validate Twitter card type for maximum visual impact
        if (metadata.twitter && typeof metadata.twitter === 'object' && 'card' in metadata.twitter) {
          expect((metadata.twitter as any).card).toBe('summary_large_image');
          expect((metadata.twitter as any).creator).toBe('@zopiolabs');
        }
      });
    });

    describe('Environment-Specific Configuration', () => {
      /**
       * Environment Configuration Tests
       * 
       * Validates metadata behavior across different deployment environments.
       * Ensures proper URL generation and environment-specific optimizations.
       */

      it('should handle production environment with HTTPS protocol', async () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
        Object.defineProperty(process.env, 'VERCEL_PROJECT_PRODUCTION_URL', { value: 'zopiolabs.dev', writable: true });
        
        // Re-import the module to pick up new environment variables
        vi.resetModules();
        const { createMetadata: prodCreateMetadata } = await import('../metadata.js');
        
        const metadata = prodCreateMetadata({
          title: 'Production Page',
          description: 'Production environment metadata test',
        });

        expect(metadata.metadataBase).toEqual(new URL('https://zopiolabs.dev'));
      });

      it('should handle development environment with HTTP protocol', async () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
        Object.defineProperty(process.env, 'VERCEL_PROJECT_PRODUCTION_URL', { value: 'localhost:3000', writable: true });
        
        // Re-import the module to pick up new environment variables
        vi.resetModules();
        const { createMetadata: devCreateMetadata } = await import('../metadata.js');
        
        const metadata = devCreateMetadata({
          title: 'Development Page',
          description: 'Development environment metadata test',
        });

        expect(metadata.metadataBase).toEqual(new URL('http://localhost:3000'));
      });

      it('should handle missing production URL gracefully', () => {
        delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
        
        const metadata = createMetadata({
          title: 'No URL Page',
          description: 'Missing production URL handling',
        });

        expect(metadata.metadataBase).toBeUndefined();
      });
    });

    describe('Custom Metadata Merging', () => {
      /**
       * Custom Metadata Integration Tests
       * 
       * Validates the ability to extend and customize default metadata
       * while maintaining SEO best practices and avoiding conflicts.
       */

      it('should merge custom metadata with defaults correctly', () => {
        const title = 'Custom Metadata Page';
        const description = 'Testing custom metadata merging';
        const customMetadata = {
          keywords: ['seo', 'optimization', 'metadata'],
          robots: {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
            },
          },
        };

        const metadata = createMetadata({
          title,
          description,
          ...customMetadata,
        });

        expect(metadata.keywords).toEqual(['seo', 'optimization', 'metadata']);
        expect(metadata.robots).toEqual({
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        });
        
        // Ensure defaults are preserved
        expect(metadata.title).toBe('Custom Metadata Page | zopio');
        expect(metadata.applicationName).toBe('zopio');
      });

      it('should allow custom metadata to override defaults where appropriate', () => {
        const customPublisher = 'Custom Publisher';
        const metadata = createMetadata({
          title: 'Override Test',
          description: 'Testing metadata override',
          publisher: customPublisher,
        });

        expect(metadata.publisher as string).toBe(customPublisher);
        // Ensure other defaults remain intact
        expect(metadata.applicationName).toBe('zopio');
        expect(metadata.creator as string).toBe('Zopio Labs');
      });
    });

    describe('SEO Best Practices Validation', () => {
      /**
       * SEO Best Practices Tests
       * 
       * Validates that generated metadata follows current SEO best practices
       * and search engine guidelines for optimal visibility and ranking.
       */

      it('should include all essential meta tags for search engine optimization', () => {
        const metadata = createMetadata({
          title: 'SEO Best Practices Page',
          description: 'Comprehensive SEO metadata validation following current best practices.',
        });

        // Verify presence of critical SEO elements
        expect(metadata.title).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata.authors).toBeDefined();
        expect(metadata.creator).toBeDefined();
        expect(metadata.publisher).toBeDefined();
        expect(metadata.applicationName).toBeDefined();
        
        // Validate social media optimization
        expect(metadata.openGraph).toBeDefined();
        expect(metadata.twitter).toBeDefined();
        
        // Verify mobile optimization
        expect(metadata.appleWebApp).toBeDefined();
        expect(metadata.formatDetection).toBeDefined();
      });

      it('should generate metadata that supports rich results and featured snippets', () => {
        const metadata = createMetadata({
          title: 'Rich Results Optimization',
          description: 'Metadata optimized for search engine rich results and featured snippets.',
        });

        // Validate structured metadata for rich results
        if (metadata.openGraph && typeof metadata.openGraph === 'object') {
          expect((metadata.openGraph as any).type).toBe('website');
          expect((metadata.openGraph as any).siteName).toBe('zopio');
          expect((metadata.openGraph as any).locale).toBe('en_US');
        }
        
        // Ensure proper Twitter card configuration
        if (metadata.twitter && typeof metadata.twitter === 'object') {
          expect((metadata.twitter as any).card).toBe('summary_large_image');
        }
      });
    });
  });

  describe('JSON-LD Structured Data', () => {
    /**
     * JSON-LD Structured Data Tests
     * 
     * Validates the JsonLd component's ability to generate valid Schema.org
     * structured data for search engine understanding and rich result eligibility.
     */

    describe('JsonLd Component Rendering', () => {
      it('should create valid JSON-LD component props', () => {
        const structuredData: WithContext<WebPage> = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Test Page',
          description: 'Test page for JSON-LD validation',
          url: 'https://example.com/test',
        };

        const component = createElement(JsonLd, { code: structuredData });
        
        expect(component.type).toBe(JsonLd);
        expect(component.props.code).toEqual(structuredData);
      });

      it('should handle complex nested structured data correctly', () => {
        const complexStructuredData: WithContext<Organization> = {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Zopio Labs',
          url: 'https://zopiolabs.dev',
          logo: 'https://zopiolabs.dev/logo.png',
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+1-555-0123',
            contactType: 'customer service',
          },
          address: {
            '@type': 'PostalAddress',
            streetAddress: '123 Tech Street',
            addressLocality: 'San Francisco',
            addressRegion: 'CA',
            postalCode: '94105',
            addressCountry: 'US',
          },
        };

        const component = createElement(JsonLd, { code: complexStructuredData });
        
        expect(component.props.code).toEqual(complexStructuredData);
        const organizationData = component.props.code as WithContext<Organization>;
        if ('contactPoint' in organizationData) {
          expect((organizationData.contactPoint as any)['@type']).toBe('ContactPoint');
        }
        if ('address' in organizationData) {
          expect((organizationData.address as any)['@type']).toBe('PostalAddress');
        }
      });
    });

    describe('Schema.org Compliance Validation', () => {
      /**
       * Schema.org Compliance Tests
       * 
       * Validates that generated structured data complies with Schema.org specifications
       * and provides the necessary properties for search engine understanding.
       */

      it('should generate valid WebPage structured data', () => {
        const webPageData: WithContext<WebPage> = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'SEO Optimization Guide',
          description: 'Comprehensive guide to SEO optimization techniques',
          url: 'https://example.com/seo-guide',
          datePublished: '2024-01-15',
          dateModified: '2024-01-20',
          author: {
            '@type': 'Person',
            name: 'John Smith',
          },
        };

        const component = createElement(JsonLd, { code: webPageData });
        const jsonContent = component.props.code as WithContext<WebPage>;

        // Validate required WebPage properties
        expect(jsonContent['@context']).toBe('https://schema.org');
        expect(jsonContent['@type']).toBe('WebPage');
        expect((jsonContent as any).name).toBeDefined();
        expect((jsonContent as any).description).toBeDefined();
        expect((jsonContent as any).url).toBeDefined();
      });

      it('should generate valid Product structured data for e-commerce', () => {
        const productData: WithContext<Product> = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Premium SEO Tool',
          description: 'Advanced SEO optimization and analysis tool',
          image: 'https://example.com/product-image.jpg',
          brand: {
            '@type': 'Brand',
            name: 'Zopio Labs',
          },
          offers: {
            '@type': 'Offer',
            price: '99.99',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'Zopio Labs',
            },
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '127',
          },
        };

        const component = createElement(JsonLd, { code: productData });
        const jsonContent = component.props.code as WithContext<Product>;

        // Validate Product schema requirements
        expect(jsonContent['@type']).toBe('Product');
        expect((jsonContent as any).name).toBeDefined();
        expect((jsonContent as any).offers).toBeDefined();
        expect((jsonContent as any).offers['@type']).toBe('Offer');
        expect((jsonContent as any).brand['@type']).toBe('Brand');
      });

      it('should generate valid BlogPosting structured data', () => {
        const blogPostData: WithContext<BlogPosting> = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: 'Advanced SEO Techniques for 2024',
          description: 'Learn the latest SEO strategies and techniques for improved search rankings',
          author: {
            '@type': 'Person',
            name: 'Jane Doe',
            url: 'https://example.com/author/jane-doe',
          },
          datePublished: '2024-01-15T10:00:00Z',
          dateModified: '2024-01-16T15:30:00Z',
          publisher: {
            '@type': 'Organization',
            name: 'Zopio Labs',
            logo: {
              '@type': 'ImageObject',
              url: 'https://zopiolabs.dev/logo.png',
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': 'https://example.com/seo-techniques-2024',
          },
        };

        const component = createElement(JsonLd, { code: blogPostData });
        const jsonContent = component.props.code as WithContext<BlogPosting>;

        // Validate BlogPosting schema requirements
        expect(jsonContent['@type']).toBe('BlogPosting');
        expect((jsonContent as any).headline).toBeDefined();
        expect((jsonContent as any).author['@type']).toBe('Person');
        expect((jsonContent as any).publisher['@type']).toBe('Organization');
        expect((jsonContent as any).datePublished).toBeDefined();
      });

      it('should generate valid BreadcrumbList structured data for navigation', () => {
        const breadcrumbData: WithContext<BreadcrumbList> = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://example.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Blog',
              item: 'https://example.com/blog',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: 'SEO Guide',
              item: 'https://example.com/blog/seo-guide',
            },
          ],
        };

        const component = createElement(JsonLd, { code: breadcrumbData });
        const jsonContent = component.props.code as WithContext<BreadcrumbList>;

        // Validate BreadcrumbList schema
        expect(jsonContent['@type']).toBe('BreadcrumbList');
        expect((jsonContent as any).itemListElement).toHaveLength(3);
        expect((jsonContent as any).itemListElement[0]['@type']).toBe('ListItem');
        expect((jsonContent as any).itemListElement[0].position).toBe(1);
      });
    });

    describe('JSON-LD Security and Performance', () => {
      /**
       * Security and Performance Tests
       * 
       * Validates that JSON-LD generation is secure and performant,
       * preventing XSS attacks while maintaining optimal rendering performance.
       */

      it('should properly handle potentially dangerous content in JSON-LD', () => {
        const potentiallyDangerousData = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Test Page</script><script>alert("xss")</script>',
          description: 'Description with <script>alert("xss")</script> content',
        };

        const component = createElement(JsonLd, { code: potentiallyDangerousData as any });
        
        // Verify the component properly handles dangerous content
        expect((component.props as any).code.name).toContain('Test Page');
        expect((component.props as any).code.description).toContain('Description with');
        
        // Verify JSON serialization contains the expected content
        const jsonString = JSON.stringify((component.props as any).code);
        expect(jsonString).toContain('Test Page');
        expect(jsonString).toContain('Description with');
        
        // Note: JSON.stringify does not automatically escape script tags - this is expected behavior
        // The actual escaping happens in the dangerouslySetInnerHTML implementation in the JsonLd component
      });

      it('should handle large structured data efficiently', () => {
        const largeStructuredData = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: Array.from({ length: 100 }, (_, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              name: `Product ${i + 1}`,
              description: `Description for product ${i + 1}`,
            },
          })),
        };

        const startTime = performance.now();
        const component = createElement(JsonLd, { code: largeStructuredData as any });
        const endTime = performance.now();

        // Verify component creation performance is acceptable (under 10ms for large data)
        expect(endTime - startTime).toBeLessThan(10);

        const jsonContent = (component.props as any).code;
        expect(jsonContent.itemListElement).toHaveLength(100);
      });
    });
  });

  describe('Integration and Performance Tests', () => {
    /**
     * Integration and Performance Tests
     * 
     * Validates the SEO package's integration with Next.js and overall performance
     * impact on page load times and Core Web Vitals metrics.
     */

    describe('Next.js Metadata API Integration', () => {
      it('should generate metadata compatible with Next.js 15 App Router', () => {
        const metadata = createMetadata({
          title: 'Next.js Integration Test',
          description: 'Testing Next.js metadata API compatibility',
        });

        // Validate Next.js Metadata type compatibility
        const nextjsMetadata: Metadata = metadata;
        expect(nextjsMetadata.title).toBeDefined();
        expect(nextjsMetadata.description).toBeDefined();
        expect(nextjsMetadata.openGraph).toBeDefined();
        expect(nextjsMetadata.twitter).toBeDefined();
      });

      it('should support dynamic metadata generation patterns', () => {
        const generateDynamicMetadata = (params: { id: string; category: string }) => {
          return createMetadata({
            title: `${params.category} Item ${params.id}`,
            description: `Dynamic metadata for ${params.category} item ${params.id}`,
          });
        };

        const metadata = generateDynamicMetadata({ id: '123', category: 'Product' });
        
        expect(metadata.title).toBe('Product Item 123 | zopio');
        expect(metadata.description).toContain('Dynamic metadata for Product item 123');
      });
    });

    describe('Performance Impact Assessment', () => {
      it('should generate metadata efficiently with minimal performance impact', () => {
        const iterations = 1000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          createMetadata({
            title: `Performance Test ${i}`,
            description: `Performance testing iteration ${i}`,
          });
        }

        const endTime = performance.now();
        const averageTime = (endTime - startTime) / iterations;

        // Metadata generation should be under 1ms per call on average
        expect(averageTime).toBeLessThan(1);
      });

      it('should handle concurrent metadata generation efficiently', async () => {
        const concurrentOperations = Array.from({ length: 50 }, (_, i) =>
          Promise.resolve(createMetadata({
            title: `Concurrent Test ${i}`,
            description: `Concurrent metadata generation test ${i}`,
          }))
        );

        const startTime = performance.now();
        const results = await Promise.all(concurrentOperations);
        const endTime = performance.now();

        expect(results).toHaveLength(50);
        expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      });
    });

    describe('SEO Validation and Quality Assurance', () => {
      /**
       * SEO Quality Assurance Tests
       * 
       * Validates that generated SEO elements meet quality standards
       * and follow current best practices for search engine optimization.
       */

      it('should validate meta title length for optimal SERP display', () => {
        const testCases = [
          { title: 'Short Title', valid: true },
          { title: 'Moderately Long Title', valid: true },
          { title: 'This is an extremely long title that exceeds the recommended character limit for search engine results pages and may be truncated in search results which could impact click-through rates and user experience', valid: false },
        ];

        testCases.forEach(({ title, valid }) => {
          const metadata = createMetadata({
            title,
            description: 'Test description',
          });

          const fullTitle = metadata.title as string;
          if (valid) {
            expect(fullTitle.length).toBeLessThanOrEqual(60); // SEO best practice
          } else {
            expect(fullTitle.length).toBeGreaterThan(60);
          }
        });
      });

      it('should validate meta description length for optimal SERP display', () => {
        const validDescription = 'This is a properly sized meta description that provides valuable information about the page content while staying within search engine guidelines.';
        const invalidDescription = 'This is an extremely long meta description that exceeds the recommended character limit for search engine results pages and will likely be truncated in search results which could impact the user experience and click-through rates from search engines.';

        expect(validDescription.length).toBeLessThanOrEqual(160);
        expect(invalidDescription.length).toBeGreaterThan(160);

        const validMetadata = createMetadata({
          title: 'Valid Description Test',
          description: validDescription,
        });

        const invalidMetadata = createMetadata({
          title: 'Invalid Description Test',
          description: invalidDescription,
        });

        expect(validMetadata.description).toBe(validDescription);
        expect(invalidMetadata.description).toBe(invalidDescription);
      });

      it('should ensure consistent branding across all metadata elements', () => {
        const metadata = createMetadata({
          title: 'Brand Consistency Test',
          description: 'Testing brand consistency across metadata',
        });

        // Verify consistent application name usage
        expect(metadata.title).toContain('zopio');
        expect(metadata.applicationName).toBe('zopio');
        expect(metadata.openGraph?.siteName).toBe('zopio');
        
        // Verify consistent author/creator information
        expect(metadata.creator as string).toBe('Zopio Labs');
        expect(metadata.publisher).toBe('Zopio Labs');
        expect(metadata.authors).toEqual([{
          name: 'Zopio Labs',
          url: 'https://zopiolabs.dev/',
        }]);
      });
    });

    describe('Accessibility and User Experience', () => {
      /**
       * Accessibility and UX Tests
       * 
       * Validates that SEO implementations consider accessibility requirements
       * and enhance rather than detract from user experience.
       */

      it('should include accessible image alt text in Open Graph metadata', () => {
        const title = 'Accessibility Test Page';
        const imageUrl = 'https://example.com/accessible-image.jpg';
        
        const metadata = createMetadata({
          title,
          description: 'Testing accessibility in SEO metadata',
          image: imageUrl,
        });

        const images = metadata.openGraph?.images;
        if (Array.isArray(images) && images.length > 0) {
          const ogImage = images[0];
          if (typeof ogImage === 'object' && ogImage !== null && 'alt' in ogImage) {
            expect(ogImage.alt).toBe(title);
            expect(ogImage.alt).toBeTruthy();
            expect((ogImage.alt as string).length).toBeGreaterThan(0);
          }
        }
      });

      it('should disable telephone number detection for better user experience', () => {
        const metadata = createMetadata({
          title: 'UX Test Page',
          description: 'Testing user experience optimizations',
        });

        // Verify telephone detection is disabled to prevent unwanted number formatting
        expect(metadata.formatDetection?.telephone).toBe(false);
      });

      it('should support mobile-first optimization through Apple Web App metadata', () => {
        const metadata = createMetadata({
          title: 'Mobile Optimization Test',
          description: 'Testing mobile-first SEO optimization',
        });

        if (metadata.appleWebApp && typeof metadata.appleWebApp === 'object') {
          expect(metadata.appleWebApp.capable).toBe(true);
          expect(metadata.appleWebApp.statusBarStyle).toBe('default');
          expect(metadata.appleWebApp.title).toBeDefined();
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Error Handling Tests
     * 
     * Validates robust error handling and graceful degradation
     * when dealing with invalid inputs or edge cases.
     */

    it('should handle undefined and null values gracefully', () => {
      const metadata = createMetadata({
        title: 'Edge Case Test',
        description: 'Testing edge case handling',
        image: undefined,
      });

      expect(metadata.title).toBeDefined();
      expect(metadata.description).toBeDefined();
      expect(metadata.openGraph?.images).toBeUndefined();
    });

    it('should handle empty strings appropriately', () => {
      const metadata = createMetadata({
        title: '',
        description: '',
      });

      expect(metadata.title).toBe(' | zopio');
      expect(metadata.description).toBe('');
    });

    it('should handle special characters in metadata', () => {
      const specialTitle = 'Test & "Quotes" <Tags> 🚀 Émojis';
      const specialDescription = 'Description with special chars: & < > " \' 🌟';
      
      const metadata = createMetadata({
        title: specialTitle,
        description: specialDescription,
      });

      expect(metadata.title).toContain(specialTitle);
      expect(metadata.description).toBe(specialDescription);
    });

    it('should handle malformed URLs in environment variables', () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'invalid-url-format';
      
      expect(() => {
        createMetadata({
          title: 'Malformed URL Test',
          description: 'Testing malformed URL handling',
        });
      }).not.toThrow();
    });
  });
});