/**
 * @module rate-limiting
 * @description Rate limiting and abuse prevention classes for AI operations
 *
 * Classes:
 * - RateLimiter: Basic rate limiting functionality
 * - SecureRateLimiter: Enhanced rate limiting with bypass protection
 * - BackoffRateLimiter: Exponential backoff for repeated violations
 * - TokenUsageMonitor: Cost-based usage monitoring and limits
 * - DoSProtection: Denial of service attack prevention
 *
 * These classes implement comprehensive protection against API abuse,
 * cost overruns, and denial of service attacks in AI applications.
 */

/**
 * Basic rate limiter implementation
 * Tracks request counts per identifier within a time window
 */
export class RateLimiter {
  private readonly requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  /**
   * Create a new RateLimiter instance
   * @param maxRequests - Maximum requests allowed per window (default: 100)
   * @param windowMs - Time window in milliseconds (default: 60000ms = 1 minute)
   */
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed for the given identifier
   * @param identifier - Unique identifier for the request source
   * @returns True if request is allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    if (!identifier || typeof identifier !== 'string') {
      return false;
    }

    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (time) => now - time < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  /**
   * Get current request count for an identifier
   * @param identifier - Unique identifier to check
   * @returns Current number of requests in the window
   */
  getCurrentCount(identifier: string): number {
    if (!identifier) {
      return 0;
    }

    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    return userRequests.filter((time) => now - time < this.windowMs).length;
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Identifier to reset
   */
  reset(identifier: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    }
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.requests.clear();
  }
}

/**
 * Enhanced secure rate limiter with bypass protection
 * Uses multiple factors to prevent bypass attempts
 */
export class SecureRateLimiter {
  private readonly requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number = 10;
  private readonly windowMs: number = 60000;

  /**
   * Generate a composite identifier to prevent bypass attempts
   * @param ip - Client IP address
   * @param userId - Optional user ID
   * @param userAgent - Optional user agent string
   * @returns Composite identifier string
   */
  getIdentifier(ip: string, userId?: string, userAgent?: string): string {
    if (!ip) {
      throw new Error('IP address is required for secure rate limiting');
    }

    // Combine multiple identifiers to prevent bypass
    const factors = [ip];
    if (userId) {
      factors.push(`user:${userId}`);
    }
    if (userAgent) {
      factors.push(`ua:${userAgent.substring(0, 50)}`);
    }
    return factors.join('|');
  }

  /**
   * Check if a request is allowed using multiple identifying factors
   * @param ip - Client IP address
   * @param userId - Optional user ID
   * @param userAgent - Optional user agent string
   * @returns True if request is allowed, false if rate limited
   */
  isAllowed(ip: string, userId?: string, userAgent?: string): boolean {
    try {
      const identifier = this.getIdentifier(ip, userId, userAgent);
      const now = Date.now();
      const requests = this.requests.get(identifier) || [];

      const validRequests = requests.filter(
        (time) => now - time < this.windowMs
      );

      if (validRequests.length >= this.maxRequests) {
        return false;
      }

      validRequests.push(now);
      this.requests.set(identifier, validRequests);
      return true;
    } catch (_error) {
      // If identifier generation fails, deny the request for security
      return false;
    }
  }

  /**
   * Get remaining requests for an identifier
   * @param ip - Client IP address
   * @param userId - Optional user ID
   * @param userAgent - Optional user agent string
   * @returns Number of requests remaining in the current window
   */
  getRemainingRequests(
    ip: string,
    userId?: string,
    userAgent?: string
  ): number {
    try {
      const identifier = this.getIdentifier(ip, userId, userAgent);
      const now = Date.now();
      const requests = this.requests.get(identifier) || [];
      const validRequests = requests.filter(
        (time) => now - time < this.windowMs
      );
      return Math.max(0, this.maxRequests - validRequests.length);
    } catch {
      return 0;
    }
  }
}

/**
 * Rate limiter with exponential backoff for repeated violations
 * Implements progressively longer penalties for persistent abuse
 */
export class BackoffRateLimiter {
  private readonly violations: Map<
    string,
    { count: number; lastViolation: number }
  > = new Map();
  private readonly requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number = 3;
  private readonly windowMs: number = 60000;

  /**
   * Calculate remaining backoff time for an identifier
   * @param identifier - Unique identifier to check
   * @returns Remaining backoff time in milliseconds
   */
  getBackoffTime(identifier: string): number {
    if (!identifier) {
      return 0;
    }

    const violation = this.violations.get(identifier);
    if (!violation) {
      return 0;
    }

    // Exponential backoff: 2^violations seconds (capped at 1 hour)
    const backoffSeconds = Math.min(2 ** violation.count, 3600);
    const timeSinceViolation = Date.now() - violation.lastViolation;
    const backoffMs = backoffSeconds * 1000;

    return Math.max(0, backoffMs - timeSinceViolation);
  }

  /**
   * Check if a request is allowed, considering backoff periods
   * @param identifier - Unique identifier for the request source
   * @returns True if request is allowed, false if in backoff or rate limited
   */
  isAllowed(identifier: string): boolean {
    if (!identifier || typeof identifier !== 'string') {
      return false;
    }

    // Check if still in backoff period
    const remainingBackoff = this.getBackoffTime(identifier);
    if (remainingBackoff > 0) {
      return false;
    }

    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      // Record violation and trigger backoff
      const currentViolations = this.violations.get(identifier);
      this.violations.set(identifier, {
        count: (currentViolations?.count || 0) + 1,
        lastViolation: now,
      });
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  /**
   * Get violation count for an identifier
   * @param identifier - Identifier to check
   * @returns Number of recorded violations
   */
  getViolationCount(identifier: string): number {
    const violation = this.violations.get(identifier);
    return violation?.count || 0;
  }

  /**
   * Reset violations for an identifier
   * @param identifier - Identifier to reset
   */
  resetViolations(identifier: string): void {
    if (identifier) {
      this.violations.delete(identifier);
    }
  }
}

/**
 * Token usage monitor for cost abuse prevention
 * Tracks token consumption and enforces spending limits
 */
export class TokenUsageMonitor {
  private readonly usage: Map<
    string,
    { tokens: number; cost: number; resetTime: number }
  > = new Map();
  private readonly maxTokensPerHour: number = 10000;
  private readonly maxCostPerHour: number = 10.0; // $10 per hour limit
  private readonly costPerToken: number = 0.0001; // $0.0001 per token

  /**
   * Create a new TokenUsageMonitor with custom limits
   * @param maxTokensPerHour - Maximum tokens per hour (default: 10000)
   * @param maxCostPerHour - Maximum cost per hour in dollars (default: 10.00)
   * @param costPerToken - Cost per token in dollars (default: 0.0001)
   */
  constructor(
    maxTokensPerHour = 10000,
    maxCostPerHour = 10.0,
    costPerToken = 0.0001
  ) {
    this.maxTokensPerHour = maxTokensPerHour;
    this.maxCostPerHour = maxCostPerHour;
    this.costPerToken = costPerToken;
  }

  /**
   * Check if a token usage request is allowed
   * @param userId - User identifier
   * @param requestTokens - Number of tokens requested
   * @returns Object with allowed status and optional reason for denial
   */
  checkUsage(
    userId: string,
    requestTokens: number
  ): { allowed: boolean; reason?: string } {
    if (!userId || typeof userId !== 'string') {
      return { allowed: false, reason: 'Invalid user identifier' };
    }

    if (!requestTokens || requestTokens <= 0) {
      return { allowed: false, reason: 'Invalid token count' };
    }

    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    let userUsage = this.usage.get(userId);

    // Reset usage if an hour has passed
    if (!userUsage || now >= userUsage.resetTime) {
      userUsage = { tokens: 0, cost: 0, resetTime: now + hourInMs };
    }

    const newTokenTotal = userUsage.tokens + requestTokens;
    const newCostTotal = userUsage.cost + requestTokens * this.costPerToken;

    // Check token limit
    if (newTokenTotal > this.maxTokensPerHour) {
      return {
        allowed: false,
        reason: `Token limit exceeded: ${newTokenTotal}/${this.maxTokensPerHour}`,
      };
    }

    // Check cost limit
    if (newCostTotal > this.maxCostPerHour) {
      return {
        allowed: false,
        reason: `Cost limit exceeded: $${newCostTotal.toFixed(4)}/$${this.maxCostPerHour}`,
      };
    }

    // Update usage
    userUsage.tokens = newTokenTotal;
    userUsage.cost = newCostTotal;
    this.usage.set(userId, userUsage);

    return { allowed: true };
  }

  /**
   * Get current usage statistics for a user
   * @param userId - User identifier
   * @returns Usage statistics or null if no usage found
   */
  getCurrentUsage(
    userId: string
  ): { tokens: number; cost: number; resetTime: number } | null {
    if (!userId) {
      return null;
    }

    const usage = this.usage.get(userId);
    if (!usage || Date.now() >= usage.resetTime) {
      return null;
    }

    return { ...usage };
  }

  /**
   * Reset usage for a specific user
   * @param userId - User identifier to reset
   */
  resetUser(userId: string): void {
    if (userId) {
      this.usage.delete(userId);
    }
  }
}

/**
 * Denial of Service protection system
 * Prevents resource exhaustion through concurrent connections and request rates
 */
export class DoSProtection {
  private readonly connections: Map<string, number> = new Map();
  private readonly requests: Map<string, number[]> = new Map();
  private readonly maxConcurrentConnections: number = 10;
  private readonly maxRequestsPerSecond: number = 5;

  /**
   * Create DoSProtection with custom limits
   * @param maxConnections - Maximum concurrent connections per client (default: 10)
   * @param maxRequestsPerSecond - Maximum requests per second per client (default: 5)
   */
  constructor(maxConnections = 10, maxRequestsPerSecond = 5) {
    this.maxConcurrentConnections = maxConnections;
    this.maxRequestsPerSecond = maxRequestsPerSecond;
  }

  /**
   * Check and reserve a concurrent connection slot
   * @param clientId - Client identifier
   * @returns True if connection is allowed, false if limit exceeded
   */
  checkConcurrentConnections(clientId: string): boolean {
    if (!clientId || typeof clientId !== 'string') {
      return false;
    }

    const current = this.connections.get(clientId) || 0;
    if (current >= this.maxConcurrentConnections) {
      return false;
    }
    this.connections.set(clientId, current + 1);
    return true;
  }

  /**
   * Release a concurrent connection slot
   * @param clientId - Client identifier
   */
  releaseConnection(clientId: string): void {
    if (!clientId) {
      return;
    }

    const current = this.connections.get(clientId) || 0;
    this.connections.set(clientId, Math.max(0, current - 1));
  }

  /**
   * Check request rate limiting
   * @param clientId - Client identifier
   * @returns True if request is allowed, false if rate exceeded
   */
  checkRequestRate(clientId: string): boolean {
    if (!clientId || typeof clientId !== 'string') {
      return false;
    }

    const now = Date.now();
    const requests = this.requests.get(clientId) || [];

    // Remove requests older than 1 second
    const recentRequests = requests.filter((time) => now - time < 1000);

    if (recentRequests.length >= this.maxRequestsPerSecond) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);
    return true;
  }

  /**
   * Comprehensive request validation
   * @param clientId - Client identifier
   * @returns True if request is allowed, false if blocked by DoS protection
   */
  isRequestAllowed(clientId: string): boolean {
    return (
      this.checkConcurrentConnections(clientId) &&
      this.checkRequestRate(clientId)
    );
  }

  /**
   * Get current connection count for a client
   * @param clientId - Client identifier
   * @returns Current number of concurrent connections
   */
  getCurrentConnections(clientId: string): number {
    return this.connections.get(clientId) || 0;
  }

  /**
   * Get current request rate for a client
   * @param clientId - Client identifier
   * @returns Number of requests in the last second
   */
  getCurrentRequestRate(clientId: string): number {
    if (!clientId) {
      return 0;
    }

    const now = Date.now();
    const requests = this.requests.get(clientId) || [];
    return requests.filter((time) => now - time < 1000).length;
  }

  /**
   * Reset all protection data for a client
   * @param clientId - Client identifier to reset
   */
  resetClient(clientId: string): void {
    if (clientId) {
      this.connections.delete(clientId);
      this.requests.delete(clientId);
    }
  }

  /**
   * Clear all protection data
   */
  clearAll(): void {
    this.connections.clear();
    this.requests.clear();
  }
}
