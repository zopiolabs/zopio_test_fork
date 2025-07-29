/**
 * SPDX-License-Identifier: MIT
 */

import { request } from '@arcjet/next';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { keys } from '../keys';

// Mock dependencies
vi.mock('@arcjet/next', () => ({
  __esModule: true,
  default: vi.fn(),
  detectBot: vi.fn(),
  request: vi.fn(),  
  shield: vi.fn(),
}));

vi.mock('@repo/observability/log', () => ({
  log: {
    warn: vi.fn(),
  },
}));

vi.mock('../keys', () => ({
  keys: vi.fn(() => ({
    ARCJET_KEY: 'ajkey_test123',
  })),
}));

const mockKeys = vi.mocked(keys);
const mockRequest = vi.mocked(request);

// Import mocked arcjet after setting up mocks
const { default: arcjet, detectBot, shield } = await import('@arcjet/next');
const mockArcjet = vi.mocked(arcjet);
const mockDetectBot = vi.mocked(detectBot);
const mockShield = vi.mocked(shield);

describe('secure', () => {
  let secure: any;
  
  // Helper function to get secure function with specific environment
  const getSecureWithEnv = async (env: string) => {
    // Save original environment
    const originalEnv = process.env.NODE_ENV;
    
    // Set new environment
    process.env.NODE_ENV = env;
    
    // Clear module cache and import fresh
    vi.resetModules();
    const indexModule = await import('../index?t=' + Date.now());
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
    
    return indexModule.secure;
  };
  
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset all modules to ensure fresh imports
    
    // Reset environment - use development by default for consistent behavior
    process.env.NODE_ENV = 'development';
    
    // Default mock implementations
    mockKeys.mockReturnValue({
      ARCJET_KEY: 'ajkey_test123',
    });
    
    mockRequest.mockResolvedValue({
      ip: '192.168.1.1',
      headers: {},
      method: 'GET',
      url: '/',
    } as any);
    
    mockShield.mockReturnValue({ type: 'shield' } as any);
    mockDetectBot.mockReturnValue({ type: 'detectBot' } as any);
    
    const mockAj = {
      withRule: vi.fn().mockReturnThis(),
      protect: vi.fn().mockResolvedValue({
        isDenied: () => false,
      }),
    };
    
    mockArcjet.mockReturnValue(mockAj as any);
    
    // Import secure function after setting up mocks
    const indexModule = await import('../index');
    secure = indexModule.secure;
  });

  describe('Successful Security Check', () => {
    it('should initialize Arcjet with correct configuration', async () => {
      await secure(['GOOGLE']);

      expect(mockArcjet).toHaveBeenCalledWith({
        key: 'ajkey_test123',
        characteristics: ['ip.src'],
        rules: [{ type: 'shield' }],
      });
    });

    it('should configure shield with development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      await secure(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
      });
    });

    it('should configure shield with production mode', async () => {
      // SKIPPED: Environment variable testing is complex with module caching
      // The production behavior is tested in integration tests
      // Set production mode before importing
      process.env.NODE_ENV = 'production';
      
      // Re-import the module to pick up the new environment
      const indexModule = await import('../index?t=' + Date.now());
      const secureFunction = indexModule.secure;
      
      await secureFunction(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({
        mode: 'LIVE',
      });
    });

    it('should configure bot detection with allowed categories', async () => {
      const allowedBots = ['GOOGLE', 'BING'];
      
      await secure(allowedBots);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: allowedBots,
      });
    });

    it('should use provided request when available', async () => {
      const customRequest = {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'custom' },
        method: 'POST',
        url: '/api/test',
      } as any;

      await secure(['GOOGLE'], customRequest);

      const mockAj = mockArcjet.mock.results[0].value;
      expect(mockAj.protect).toHaveBeenCalledWith(customRequest);
    });

    it('should get request automatically when not provided', async () => {
      await secure(['GOOGLE']);

      expect(mockRequest).toHaveBeenCalledTimes(1);
      const mockAj = mockArcjet.mock.results[0].value;
      expect(mockAj.protect).toHaveBeenCalled();
    });
  });

  describe('Access Denied Scenarios', () => {
    it('should handle bot denial in production', async () => {
      const productionSecure = await getSecureWithEnv('production');
      
      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockResolvedValue({
          isDenied: () => true,
          reason: {
            isBot: () => true,
            isRateLimit: () => false,
          },
        }),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      await expect(productionSecure(['GOOGLE'])).rejects.toThrow('No bots allowed');
    });

    it('should handle rate limit denial in production', async () => {
      const productionSecure = await getSecureWithEnv('production');
      
      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockResolvedValue({
          isDenied: () => true,
          reason: {
            isBot: () => false,
            isRateLimit: () => true,
          },
        }),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      await expect(productionSecure(['GOOGLE'])).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle generic denial in production', async () => {
      const productionSecure = await getSecureWithEnv('production');
      
      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockResolvedValue({
          isDenied: () => true,
          reason: {
            isBot: () => false,
            isRateLimit: () => false,
          },
        }),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      await expect(productionSecure(['GOOGLE'])).rejects.toThrow('Access denied');
    });

    it('should log and not block in development mode', async () => {
      // Get the mocked log from our static mock
      const { log } = await import('@repo/observability/log');
      const mockLogWarn = vi.mocked(log.warn);
      mockLogWarn.mockClear(); // Clear previous calls
      
      const mockDecision = {
        isDenied: () => true,
        reason: { 
          type: 'bot', 
          description: 'Detected bot',
          isBot: () => true,
          isRateLimit: () => false,
        },
      };
      
      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockResolvedValue(mockDecision),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      // Use the default development secure function
      await expect(secure(['GOOGLE'])).resolves.toBeUndefined();
      expect(mockLogWarn).toHaveBeenCalledWith(
        expect.stringContaining('Arcjet decision:')
      );
      expect(mockLogWarn).toHaveBeenCalledWith(
        'Arcjet would have blocked this request in production mode'
      );
    });
  });

  describe('Missing API Key Scenarios', () => {
    it('should return undefined when no API key is provided', async () => {
      // Set up mock to return undefined key
      mockKeys.mockReset();
      mockKeys.mockReturnValue({
        ARCJET_KEY: undefined,
      });

      // Import fresh instance with undefined key
      const indexModule = await import('../index?nokey1=' + Date.now());
      const secureFunction = indexModule.secure;

      const result = await secureFunction(['GOOGLE']);

      expect(result).toBeUndefined();
      expect(mockArcjet).not.toHaveBeenCalled();
    });

    it('should return undefined when API key is empty string', async () => {
      mockKeys.mockReset();
      mockKeys.mockReturnValue({
        ARCJET_KEY: '',
      });

      // Import fresh instance with empty key
      const indexModule = await import('../index?nokey2=' + Date.now());
      const secureFunction = indexModule.secure;

      const result = await secureFunction(['GOOGLE']);

      expect(result).toBeUndefined();
      expect(mockArcjet).not.toHaveBeenCalled();
    });

    it('should return undefined when API key is null', async () => {
      mockKeys.mockReset();
      mockKeys.mockReturnValue({
        ARCJET_KEY: null as any,
      });

      // Import fresh instance with null key
      const indexModule = await import('../index?nokey3=' + Date.now());
      const secureFunction = indexModule.secure;

      const result = await secureFunction(['GOOGLE']);

      expect(result).toBeUndefined();
      expect(mockArcjet).not.toHaveBeenCalled();
    });
  });

  describe('Bot Category Configuration', () => {
    it('should handle single bot category', async () => {
      await secure(['GOOGLE']);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: ['GOOGLE'],
      });
    });

    it('should handle multiple bot categories', async () => {
      const allowedBots = ['GOOGLE', 'BING', 'FACEBOOK'];
      
      await secure(allowedBots);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: allowedBots,
      });
    });

    it('should handle empty bot categories array', async () => {
      await secure([]);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: [],
      });
    });

    it('should handle well-known bot types', async () => {
      const wellKnownBots = ['GOOGLE', 'BING', 'YAHOO', 'BAIDU'];
      
      await secure(wellKnownBots);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: wellKnownBots,
      });
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should use DRY_RUN mode in test environment', async () => {
      process.env.NODE_ENV = 'test';
      
      await secure(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({ mode: 'DRY_RUN' });
      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: ['GOOGLE'],
      });
    });

    it('should use DRY_RUN mode in development environment', async () => {
      process.env.NODE_ENV = 'development';
      
      await secure(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({ mode: 'DRY_RUN' });
      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: ['GOOGLE'],
      });
    });

    it('should use LIVE mode in production environment', async () => {
      const productionSecure = await getSecureWithEnv('production');
      
      await productionSecure(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({ mode: 'LIVE' });
      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'LIVE',
        allow: ['GOOGLE'],
      });
    });

    it('should use LIVE mode in staging environment', async () => {
      const stagingSecure = await getSecureWithEnv('staging');
      
      await stagingSecure(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({ mode: 'LIVE' });
      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'LIVE',
        allow: ['GOOGLE'],
      });
    });
  });

  describe('Request Handling', () => {
    it('should handle request with custom characteristics', async () => {
      await secure(['GOOGLE']);

      expect(mockArcjet).toHaveBeenCalledWith({
        key: 'ajkey_test123',
        characteristics: ['ip.src'],
        rules: [{ type: 'shield' }],
      });
    });

    it('should add bot detection rule with withRule', async () => {
      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockResolvedValue({
          isDenied: () => false,
        }),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      await secure(['GOOGLE']);

      expect(mockAj.withRule).toHaveBeenCalledWith({ type: 'detectBot' });
    });

    it('should call protect with correct request', async () => {
      const customRequest = {
        ip: '203.0.113.1',
        headers: { 'user-agent': 'test-bot/1.0' },
        method: 'GET',
        url: '/api/secure',
      } as any;

      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockResolvedValue({
          isDenied: () => false,
        }),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      await secure(['GOOGLE'], customRequest);

      expect(mockAj.protect).toHaveBeenCalledWith(customRequest);
    });
  });

  describe('Error Handling', () => {
    it('should handle Arcjet initialization errors', async () => {
      mockArcjet.mockImplementation(() => {
        throw new Error('Arcjet initialization failed');
      });

      await expect(secure(['GOOGLE'])).rejects.toThrow('Arcjet initialization failed');
    });

    it('should handle request function errors', async () => {
      mockRequest.mockRejectedValue(new Error('Request failed'));

      await expect(secure(['GOOGLE'])).rejects.toThrow('Request failed');
    });

    it('should handle protect method errors', async () => {
      const mockAj = {
        withRule: vi.fn().mockReturnThis(),
        protect: vi.fn().mockRejectedValue(new Error('Protection failed')),
      };
      
      mockArcjet.mockReturnValue(mockAj as any);

      await expect(secure(['GOOGLE'])).rejects.toThrow('Protection failed');
    });

    it('should handle keys function errors', async () => {
      mockKeys.mockReset();
      mockKeys.mockImplementation(() => {
        throw new Error('Keys error');
      });

      // Import fresh instance that will trigger the key error
      await expect(import('../index?keyerror=' + Date.now())).rejects.toThrow('Keys error');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle rapid successive calls', async () => {
      const calls = Array.from({ length: 10 }, () => secure(['GOOGLE']));
      
      await Promise.all(calls);

      expect(mockArcjet).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent calls with different configurations', async () => {
      const calls = [
        secure(['GOOGLE']),
        secure(['BING']),
        secure(['GOOGLE', 'BING']),
        secure([]),
      ];
      
      await Promise.all(calls);

      expect(mockArcjet).toHaveBeenCalledTimes(4);
      expect(mockDetectBot).toHaveBeenCalledTimes(4);
    });

    it('should complete within reasonable time', async () => {
      const start = performance.now();
      await secure(['GOOGLE']);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle API protection scenario', async () => {
      process.env.NODE_ENV = 'production';
      
      const apiRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'MyApp/1.0',
          'authorization': 'Bearer token123',
        },
        method: 'POST',
        url: '/api/users',
      } as any;

      await secure(['GOOGLE', 'BING'], apiRequest);

      expect(mockArcjet).toHaveBeenCalledWith({
        key: 'ajkey_test123',
        characteristics: ['ip.src'],
        rules: [{ type: 'shield' }],
      });
    });

    it('should handle public endpoint with bot allowance', async () => {
      const publicRequest = {
        ip: '66.249.66.1', // Google bot IP
        headers: {
          'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
        },
        method: 'GET',
        url: '/sitemap.xml',
      } as any;

      await secure(['GOOGLE'], publicRequest);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: ['GOOGLE'],
      });
    });

    it('should handle admin endpoint with strict security', async () => {
      const productionSecure = await getSecureWithEnv('production');
      
      const adminRequest = {
        ip: '10.0.1.50',
        headers: {
          'user-agent': 'AdminPanel/1.0',
          'authorization': 'Bearer admin_token',
        },
        method: 'DELETE',
        url: '/admin/users/123',
      } as any;

      await productionSecure([], adminRequest); // No bots allowed

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'LIVE',
        allow: [],
      });
    });

    it('should handle development API testing', async () => {
      process.env.NODE_ENV = 'development';
      
      const devRequest = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'curl/7.68.0',
        },
        method: 'GET',
        url: '/api/health',
      } as any;

      await secure(['GOOGLE'], devRequest);

      expect(mockShield).toHaveBeenCalledWith({ mode: 'DRY_RUN' });
      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: ['GOOGLE'],
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined allow array', async () => {
      await secure(undefined as any);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: undefined,
      });
    });

    it('should handle mixed bot types', async () => {
      const mixedBots = ['GOOGLE', 'UNKNOWN_BOT'] as any;
      
      await secure(mixedBots);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: mixedBots,
      });
    });

    it('should handle very long bot allow lists', async () => {
      const longList = Array.from({ length: 100 }, (_, i) => `BOT_${i}`);
      
      await secure(longList as any);

      expect(mockDetectBot).toHaveBeenCalledWith({
        mode: 'DRY_RUN',
        allow: longList,
      });
    });

    it('should handle undefined environment variable', async () => {
      delete process.env.NODE_ENV;
      
      // Import fresh instance without NODE_ENV
      const indexModule = await import('../index?undefined=' + Date.now());
      const secureFunction = indexModule.secure;
      
      await secureFunction(['GOOGLE']);

      expect(mockShield).toHaveBeenCalledWith({ mode: 'LIVE' });
    });
  });
});