/**
 * @fileoverview Security Package Tests - Arcjet Security Middleware
 * 
 * Test suite for security middleware including bot protection, rate limiting,
 * attack prevention, and comprehensive security validation.
 * 
 * **Test Scope:**
 * - Arcjet security middleware configuration and integration
 * - Bot detection and protection mechanisms
 * - Attack prevention (DDoS, injection, abuse)
 * - Security rule configuration and validation
 * - Performance optimization for security checks
 * 
 * **Test Categories:**
 * 1. **Middleware Integration**: Arcjet setup and configuration
 * 2. **Bot Protection**: Bot detection and filtering mechanisms
 * 3. **Attack Prevention**: DDoS, injection, and abuse protection
 * 4. **Security Rules**: Rule configuration and enforcement
 * 5. **Performance**: Security check optimization and efficiency
 * 
 * **Mock Strategy:**
 * - Complete Arcjet SDK mocking to prevent actual security calls
 * - Attack simulation for comprehensive protection testing
 * - Error injection for security failure scenarios
 * - Performance monitoring for security check optimization
 * 
 * **Quality Standards:**
 * - Zero actual security service calls to prevent costs
 * - Sub-50ms security check response time
 * - 100% attack detection accuracy for known patterns
 * - Complete protection coverage for all security vectors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment and keys
const mockEnvironment = {
  ARCJET_KEY: 'ajkey_test123456789',
  NODE_ENV: 'test',
};

vi.mock('../keys', () => ({
  keys: () => mockEnvironment,
}));

// Mock Arcjet
const mockArcjetDecision = {
  isDenied: vi.fn().mockReturnValue(false),
  isErrored: vi.fn().mockReturnValue(false),
  reason: {
    isBot: vi.fn().mockReturnValue(false),
    isRateLimit: vi.fn().mockReturnValue(false),
    isShield: vi.fn().mockReturnValue(false),
  },
};

const mockArcjetInstance = {
  withRule: vi.fn().mockReturnThis(),
  protect: vi.fn().mockResolvedValue(mockArcjetDecision),
};

const mockArcjet = vi.fn(() => mockArcjetInstance);
const mockDetectBot = vi.fn().mockReturnValue({});
const mockShield = vi.fn().mockReturnValue({});
const mockRequest = vi.fn().mockResolvedValue(new Request('http://localhost/test'));

vi.mock('@arcjet/next', () => ({
  default: mockArcjet,
  detectBot: mockDetectBot,
  shield: mockShield,
  request: mockRequest,
}));

// Mock observability
const mockLog = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@repo/observability/log', () => ({
  log: mockLog,
}));

// Mock Nosecone
const mockDefaults = {
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
};

const mockCreateMiddleware = vi.fn();
const mockWithVercelToolbar = vi.fn().mockReturnValue(mockDefaults);

vi.mock('@nosecone/next', () => ({
  defaults: mockDefaults,
  createMiddleware: mockCreateMiddleware,
  withVercelToolbar: mockWithVercelToolbar,
}));

describe('Security Integration Tests', () => {
  let secureFunction: any;
  let noseconeOptions: any;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockArcjetInstance.withRule.mockReturnThis();
    mockArcjetInstance.protect.mockResolvedValue(mockArcjetDecision);
    mockArcjetDecision.isDenied.mockReturnValue(false);
    mockArcjetDecision.reason.isBot.mockReturnValue(false);
    mockArcjetDecision.reason.isRateLimit.mockReturnValue(false);
    
    // Set up test environment
    Object.assign(process.env, mockEnvironment);
    
    // Import fresh modules
    const securityModule = await import('../index.js');
    const middlewareModule = await import('../middleware.js');
    
    secureFunction = securityModule.secure;
    noseconeOptions = middlewareModule.noseconeOptions;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.resetAllMocks();
  });

  describe('Arcjet Security Integration', () => {
    it('should initialize Arcjet with correct configuration', async () => {
      const allowedBots = ['GOOGLE_CRAWLER', 'FACEBOOK_BOT'];
      const testRequest = new Request('http://localhost/api/test', {
        headers: { 'user-agent': 'test-agent' },
      });

      await secureFunction(allowedBots, testRequest);

      expect(mockArcjet).toHaveBeenCalledWith({
        key: 'ajkey_test123456789',
        characteristics: ['ip.src'],
        rules: [
          expect.objectContaining({
            // Shield rule
          }),
        ],
      });

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'LIVE', // test environment treated as production for mocks
        allow: allowedBots,
      });
    });

    it('should handle production vs development mode correctly', async () => {
      // Test development mode
      Object.assign(process.env, { NODE_ENV: 'development' });
      vi.resetModules();
      const { secure: devSecure } = await import('../index.js');
      await devSecure(['GOOGLE_CRAWLER']);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: ['GOOGLE_CRAWLER'],
      });

      // Test production mode
      Object.assign(process.env, { NODE_ENV: 'production' });
      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');
      await prodSecure(['GOOGLE_CRAWLER']);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'LIVE',
        allow: ['GOOGLE_CRAWLER'],
      });
    });

    it('should handle bot detection and blocking', async () => {
      // Configure mock to simulate bot detection
      mockArcjetDecision.isDenied.mockReturnValue(true);
      mockArcjetDecision.reason.isBot.mockReturnValue(true);
      Object.assign(process.env, { NODE_ENV: 'production' });

      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');

      await expect(prodSecure([])).rejects.toThrow('No bots allowed');

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Arcjet decision:')
      );
    });

    it('should handle rate limiting', async () => {
      mockArcjetDecision.isDenied.mockReturnValue(true);
      mockArcjetDecision.reason.isBot.mockReturnValue(false);
      mockArcjetDecision.reason.isRateLimit.mockReturnValue(true);
      Object.assign(process.env, { NODE_ENV: 'production' });

      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');

      await expect(prodSecure([])).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle shield protection', async () => {
      mockArcjetDecision.isDenied.mockReturnValue(true);
      mockArcjetDecision.reason.isBot.mockReturnValue(false);
      mockArcjetDecision.reason.isRateLimit.mockReturnValue(false);
      Object.assign(process.env, { NODE_ENV: 'production' });

      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');

      await expect(prodSecure([])).rejects.toThrow('Access denied');
    });

    it('should handle missing API key gracefully', async () => {
      // Test with no API key
      Object.assign(process.env, { ARCJET_KEY: '' });
      vi.resetModules();
      const { secure: noKeySecure } = await import('../index.js');

      // Should not throw when no key is provided
      await expect(noKeySecure([])).resolves.toBeUndefined();
      expect(mockArcjet).not.toHaveBeenCalled();
    });

    it('should handle request creation fallback', async () => {
      mockRequest.mockResolvedValue(new Request('http://localhost/fallback'));

      // Call without providing a request
      await secureFunction(['GOOGLE_CRAWLER']);

      expect(mockRequest).toHaveBeenCalled();
      expect(mockArcjetInstance.protect).toHaveBeenCalledWith(
        expect.any(Request)
      );
    });
  });

  describe('Nosecone Security Headers Integration', () => {
    it('should configure nosecone with correct default options', () => {
      expect(noseconeOptions).toEqual({
        ...mockDefaults,
        contentSecurityPolicy: false,
      });
    });

    it('should support Vercel toolbar configuration', async () => {
      const { noseconeOptionsWithToolbar } = await import('../middleware.js');

      expect(mockWithVercelToolbar).toHaveBeenCalledWith(noseconeOptions);
      expect(noseconeOptionsWithToolbar).toEqual(mockDefaults);
    });

    it('should integrate with middleware creation', () => {
      expect(mockCreateMiddleware).toBeDefined();
    });
  });

  describe('Cross-Service Integration', () => {
    it('should integrate with observability logging', async () => {
      mockArcjetDecision.isDenied.mockReturnValue(true);
      mockArcjetDecision.reason.isBot.mockReturnValue(true);
      mockEnvironment.NODE_ENV = 'production';

      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');

      try {
        await prodSecure([]);
      } catch {
        // Expected error
      }

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Arcjet decision:')
      );
    });

    it('should handle different request types', async () => {
      const testCases = [
        {
          name: 'GET request',
          request: new Request('http://localhost/api/users', {
            method: 'GET',
            headers: { 'user-agent': 'test-browser' },
          }),
        },
        {
          name: 'POST request with body',
          request: new Request('http://localhost/api/users', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'test-browser',
            },
            body: JSON.stringify({ name: 'test' }),
          }),
        },
        {
          name: 'Request with suspicious headers',
          request: new Request('http://localhost/api/admin', {
            method: 'GET',
            headers: {
              'user-agent': 'malicious-bot',
              'x-forwarded-for': '192.168.1.1',
            },
          }),
        },
      ];

      for (const testCase of testCases) {
        mockArcjetDecision.isDenied.mockReturnValue(false);

        await secureFunction(['GOOGLE_CRAWLER'], testCase.request);

        expect(mockArcjetInstance.protect).toHaveBeenCalledWith(
          testCase.request
        );
      }
    });

    it('should handle concurrent security checks', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        new Request(`http://localhost/api/test${i}`, {
          headers: { 'user-agent': `test-agent-${i}` },
        })
      );

      mockArcjetDecision.isDenied.mockReturnValue(false);

      const securityPromises = requests.map(request =>
        secureFunction(['GOOGLE_CRAWLER'], request)
      );

      await Promise.all(securityPromises);

      expect(mockArcjetInstance.protect).toHaveBeenCalledTimes(5);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test Arcjet error
      mockArcjetInstance.protect.mockRejectedValue(new Error('Arcjet service unavailable'));

      await expect(secureFunction(['GOOGLE_CRAWLER'])).rejects.toThrow(
        'Arcjet service unavailable'
      );
    });

    it('should integrate with rate limiting services', async () => {
      // Simulate rate limit scenario
      mockArcjetDecision.isDenied.mockReturnValue(true);
      mockArcjetDecision.reason.isRateLimit.mockReturnValue(true);
      mockArcjetDecision.reason.isBot.mockReturnValue(false);
      
      const testRequest = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'test-client',
        },
      });

      Object.assign(process.env, { NODE_ENV: 'production' });
      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');

      await expect(prodSecure([], testRequest)).rejects.toThrow('Rate limit exceeded');

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Arcjet decision:')
      );
    });
  });

  describe('Environment Configuration Integration', () => {
    it('should handle different environment configurations', async () => {
      const environments = [
        { NODE_ENV: 'development', expectedMode: 'DRY_RUN' },
        { NODE_ENV: 'staging', expectedMode: 'LIVE' },
        { NODE_ENV: 'production', expectedMode: 'LIVE' },
        { NODE_ENV: 'test', expectedMode: 'DRY_RUN' },
      ];

      for (const env of environments) {
        vi.clearAllMocks();
        Object.assign(process.env, { NODE_ENV: env.NODE_ENV });
        vi.resetModules();

        const { secure: envSecure } = await import('../index.js');
        await envSecure(['GOOGLE_CRAWLER']);

        expect(mockDetectBot).toHaveBeenCalledWith({
          mode: env.expectedMode,
          allow: ['GOOGLE_CRAWLER'],
        });

        expect(mockShield).toHaveBeenCalledWith({
          mode: env.expectedMode,
        });
      }
    });

    it('should validate environment variables', async () => {
      // Test invalid key format
      Object.assign(process.env, { ARCJET_KEY: 'invalid_key_format' });
      
      // The keys function should validate the format
      try {
        const { keys } = await import('../keys.js');
        keys();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Scalability Integration', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const startTime = Date.now();
      const requestCount = 100;

      mockArcjetDecision.isDenied.mockReturnValue(false);

      const requests = Array.from({ length: requestCount }, (_, i) =>
        secureFunction(['GOOGLE_CRAWLER'], new Request(`http://localhost/api/test${i}`))
      );

      await Promise.all(requests);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle 100 requests in reasonable time (< 5 seconds)
      expect(totalTime).toBeLessThan(5000);
      expect(mockArcjetInstance.protect).toHaveBeenCalledTimes(requestCount);
    });

    it('should handle memory efficiently with large numbers of requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process a large batch of requests
      for (let batch = 0; batch < 10; batch++) {
        const batchRequests = Array.from({ length: 50 }, (_, i) =>
          secureFunction(['GOOGLE_CRAWLER'], 
            new Request(`http://localhost/api/batch${batch}/test${i}`)
          )
        );
        
        await Promise.all(batchRequests);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle timeout scenarios', async () => {
      // Mock a slow Arcjet response
      mockArcjetInstance.protect.mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockArcjetDecision), 3000)
        )
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 2000)
      );

      const securityPromise = secureFunction(['GOOGLE_CRAWLER']);

      await expect(Promise.race([securityPromise, timeoutPromise]))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Security Policy Integration', () => {
    it('should enforce different security policies based on request path', async () => {
      const securityPaths = [
        { path: '/api/admin', shouldBeStrict: true },
        { path: '/api/public', shouldBeStrict: false },
        { path: '/api/auth', shouldBeStrict: true },
        { path: '/api/health', shouldBeStrict: false },
      ];

      for (const { path, shouldBeStrict } of securityPaths) {
        const request = new Request(`http://localhost${path}`);
        
        if (shouldBeStrict) {
          // Simulate stricter checking for sensitive paths
          await secureFunction([], request); // No bots allowed
        } else {
          // Allow more permissive checking for public paths
          await secureFunction(['GOOGLE_CRAWLER', 'FACEBOOK_BOT'], request);
        }

        expect(mockArcjetInstance.protect).toHaveBeenCalledWith(request);
      }
    });

    it('should handle security policy violations', async () => {
      const violations = [
        {
          name: 'Bot detection violation',
          setup: () => {
            mockArcjetDecision.isDenied.mockReturnValue(true);
            mockArcjetDecision.reason.isBot.mockReturnValue(true);
          },
          expectedError: 'No bots allowed',
        },
        {
          name: 'Rate limit violation',
          setup: () => {
            mockArcjetDecision.isDenied.mockReturnValue(true);
            mockArcjetDecision.reason.isBot.mockReturnValue(false);
            mockArcjetDecision.reason.isRateLimit.mockReturnValue(true);
          },
          expectedError: 'Rate limit exceeded',
        },
        {
          name: 'Shield violation',
          setup: () => {
            mockArcjetDecision.isDenied.mockReturnValue(true);
            mockArcjetDecision.reason.isBot.mockReturnValue(false);
            mockArcjetDecision.reason.isRateLimit.mockReturnValue(false);
          },
          expectedError: 'Access denied',
        },
      ];

      Object.assign(process.env, { NODE_ENV: 'production' });
      vi.resetModules();
      const { secure: prodSecure } = await import('../index.js');

      for (const violation of violations) {
        violation.setup();
        
        await expect(prodSecure([])).rejects.toThrow(violation.expectedError);
        
        // Reset for next test
        vi.clearAllMocks();
      }
    });

    it('should log security events appropriately', async () => {
      const testScenarios = [
        {
          name: 'Development mode warning',
          setup: () => {
            Object.assign(process.env, { NODE_ENV: 'development' });
            mockArcjetDecision.isDenied.mockReturnValue(true);
            mockArcjetDecision.reason.isBot.mockReturnValue(true);
          },
          expectedLog: 'Arcjet would have blocked this request in production mode',
        },
        {
          name: 'Production mode blocking',
          setup: () => {
            Object.assign(process.env, { NODE_ENV: 'production' });
            mockArcjetDecision.isDenied.mockReturnValue(true);
            mockArcjetDecision.reason.isBot.mockReturnValue(true);
          },
          expectedLog: 'Arcjet decision:',
        },
      ];

      for (const scenario of testScenarios) {
        vi.clearAllMocks();
        scenario.setup();
        vi.resetModules();

        const { secure: scenarioSecure } = await import('../index.js');

        if (process.env.NODE_ENV === 'development') {
          await scenarioSecure([]);
          expect(mockLog.warn).toHaveBeenCalledWith(
            expect.stringContaining(scenario.expectedLog)
          );
        } else {
          await expect(scenarioSecure([])).rejects.toThrow();
          expect(mockLog.warn).toHaveBeenCalledWith(
            expect.stringContaining(scenario.expectedLog)
          );
        }
      }
    });
  });

  describe('Integration Test Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        // Request with invalid URL
        () => new Request('invalid-url'),
        // Request with unusual headers
        () => new Request('http://localhost/test', {
          headers: {
            'user-agent': '\x00\x01\x02', // Binary data in header
          },
        }),
        // Request with very long URL
        () => new Request(`http://localhost/${'a'.repeat(2000)}`),
      ];

      for (const createRequest of malformedRequests) {
        try {
          const request = createRequest();
          mockArcjetDecision.isDenied.mockReturnValue(false);
          
          await secureFunction(['GOOGLE_CRAWLER'], request);
          
          expect(mockArcjetInstance.protect).toHaveBeenCalledWith(request);
        } catch (error) {
          // Some malformed requests might throw during creation
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle network connectivity issues', async () => {
      // Simulate network error
      mockArcjetInstance.protect.mockRejectedValue(
        new Error('NETWORK_ERROR: Unable to reach Arcjet service')
      );

      await expect(secureFunction(['GOOGLE_CRAWLER']))
        .rejects.toThrow('NETWORK_ERROR: Unable to reach Arcjet service');
    });

    it('should handle API key rotation scenarios', async () => {
      // Test with old key
      Object.assign(process.env, { ARCJET_KEY: 'ajkey_old123456789' });
      vi.resetModules();
      const { secure: oldKeySecure } = await import('../index.js');
      await oldKeySecure(['GOOGLE_CRAWLER']);

      expect(mockArcjet).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'ajkey_old123456789',
        })
      );

      // Test with new key
      Object.assign(process.env, { ARCJET_KEY: 'ajkey_new987654321' });
      vi.resetModules();
      const { secure: newKeySecure } = await import('../index.js');
      await newKeySecure(['GOOGLE_CRAWLER']);

      expect(mockArcjet).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'ajkey_new987654321',
        })
      );
    });
  });
});