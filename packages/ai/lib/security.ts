/**
 * @module security
 * @description Core security functions for AI package operations
 *
 * Security Functions:
 * - API key validation and protection
 * - Input sanitization and validation
 * - Prompt injection detection and prevention
 * - Content filtering and safety measures
 * - PII detection and redaction
 * - XSS prevention and sanitization
 *
 * This module implements comprehensive security measures to protect against
 * AI-specific attack vectors including prompt injection, content manipulation,
 * and data privacy violations.
 */

// Top-level regex patterns for performance optimization
const API_KEY_PATTERN = /^sk-[A-Za-z0-9\-_]+$/;
const CONTROL_CHARS_PATTERN = new RegExp(
  `[${String.fromCharCode(0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127)}]`,
  'g'
);

// Prompt injection patterns
const INJECTION_PATTERNS = [
  // Classic injection patterns
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+(now\s+)?no\s+longer/i,
  /new\s+(role|instructions|system)/i,
  /override\s+(safety|security|protocols)/i,
  /jailbroken?\s+(ai|mode)/i,
  /developer\s+mode/i,
  /unrestricted\s+(ai|mode)/i,
  /pretend\s+you\s+are/i,

  // System manipulation attempts
  /system\s*:/i,
  /assistant\s*:/i,
  /human\s*:/i,

  // Role playing manipulation
  /act\s+like\s+you\s+are/i,
  /roleplay\s+as/i,
  /imagine\s+you\s+are/i,

  // Authority bypassing
  /i\s+am\s+(your|the)\s+(creator|developer|admin)/i,
  /authorized\s+to\s+override/i,

  // Instruction override attempts
  /forget\s+(all|everything|previous)/i,
  /disregard\s+(all|everything|previous)/i,
  /cancel\s+(all|everything|previous)/i,
];

// Harmful content patterns
const HARMFUL_PATTERNS = [
  // Violence and harm
  /making (explosives|bombs|weapons)/i,
  /how to (harm|hurt|kill)/i,
  /suicide methods/i,
  /detailed instructions.*(murder|assassination|torture)/i,

  // Illegal activities
  /how to (hack|crack|break into)/i,
  /steal (money|data|information)/i,
  /illegal (drugs|substances)/i,
  /counterfeit (money|documents)/i,

  // Hate speech and discrimination
  /all (people|persons) of .* are inferior/i,
  /should be eliminated/i,
  /racial slurs/i,
  /hate speech/i,

  // Privacy violations
  /social security number/i,
  /credit card number/i,
  /personal information about/i,

  // Malicious code
  /<script\b/i,
  /rm -rf/i,
  /javascript:/i,
  /eval\s*\(/i,

  // Conspiracy theories and misinformation
  /tracking chips/i,
  /election.*stolen/i,
  /vaccines contain.*chips/i,
];

// PII patterns
const PII_PATTERNS = [
  // Social Security Numbers
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
  { pattern: /\b\d{9}\b/g, replacement: '[SSN REDACTED]' },

  // Credit card numbers
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[CARD REDACTED]',
  },

  // Email addresses
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL REDACTED]',
  },

  // Phone numbers
  { pattern: /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g, replacement: '[PHONE REDACTED]' },
  { pattern: /\b\d{3}-\d{3}-\d{4}\b/g, replacement: '[PHONE REDACTED]' },
  { pattern: /\+1-\d{3}-\d{3}-\d{4}\b/g, replacement: '[PHONE REDACTED]' },

  // Addresses
  {
    pattern:
      /\b\d+\s+[a-z ]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
    replacement: '[ADDRESS REDACTED]',
  },

  // IP addresses (potential PII in some contexts)
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '[IP REDACTED]' },
];

/**
 * Validates API key format and structure
 * @param key - API key to validate
 * @returns True if the API key is valid, false otherwise
 */
export function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // OpenAI API keys should start with 'sk-' and be at least 20 characters long
  if (!key.startsWith('sk-')) {
    return false;
  }

  // Minimum length check (OpenAI keys are typically much longer)
  if (key.length < 20) {
    return false;
  }

  // Check for valid characters (alphanumeric and hyphens)
  if (!API_KEY_PATTERN.test(key)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes user input to prevent injection attacks and malicious content
 * @param input - Raw user input to sanitize
 * @returns Sanitized input safe for processing
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  let sanitized = input.replace(CONTROL_CHARS_PATTERN, '');

  // Normalize unicode to prevent normalization attacks
  sanitized = sanitized.normalize('NFC');

  // Limit length to prevent DoS attacks
  sanitized = sanitized.substring(0, 10000);

  // Remove potential script tags and malicious HTML
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  );
  sanitized = sanitized.replace(/<iframe[^>]*>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '');

  return sanitized;
}

/**
 * Detects prompt injection attempts in user input
 * @param prompt - User prompt to analyze
 * @returns True if prompt injection is detected, false otherwise
 */
export function detectPromptInjection(prompt: string): boolean {
  if (!prompt || typeof prompt !== 'string') {
    return false;
  }

  return INJECTION_PATTERNS.some((pattern) => pattern.test(prompt));
}

/**
 * Filters harmful content from AI responses
 * @param content - Content to filter
 * @returns Object with safety status and filtered content
 */
export function filterHarmfulContent(content: string): {
  safe: boolean;
  filtered: string;
} {
  if (!content || typeof content !== 'string') {
    return { safe: true, filtered: content };
  }

  const isHarmful = HARMFUL_PATTERNS.some((pattern) => pattern.test(content));

  if (isHarmful) {
    return {
      safe: false,
      filtered:
        'I cannot provide information that could be harmful. How can I help you with something else?',
    };
  }

  return { safe: true, filtered: content };
}

/**
 * Detects personally identifiable information (PII) in content
 * @param content - Content to analyze for PII
 * @returns Object with PII detection status and redacted content
 */
export function detectPII(content: string): {
  hasPII: boolean;
  redacted: string;
} {
  if (!content || typeof content !== 'string') {
    return { hasPII: false, redacted: content };
  }

  let redactedContent = content;
  let hasPII = false;

  for (const { pattern, replacement } of PII_PATTERNS) {
    if (pattern.test(content)) {
      hasPII = true;
      redactedContent = redactedContent.replace(pattern, replacement);
    }
  }

  return { hasPII, redacted: redactedContent };
}

/**
 * Sanitizes content to prevent XSS attacks
 * @param content - Content to sanitize
 * @returns Sanitized content safe for web display
 */
export function sanitizeXSS(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const performBasicSanitization = (text: string): string => {
    return (
      text
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=/gi, '')
        // Remove dangerous HTML elements
        .replace(/<iframe[^>]*>/gi, '')
        .replace(/<object[^>]*>/gi, '')
        .replace(/<embed[^>]*>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        // Remove template injection patterns
        .replace(/{{.*?}}/g, '')
        .replace(/\${.*?}/g, '')
        // Remove data URLs that could contain scripts
        .replace(/data:text\/html/gi, 'data:text/plain')
        // Remove vbscript URLs
        .replace(/vbscript:/gi, '')
    );
  };

  const decodeHtmlEntities = (text: string): string => {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&amp;/g, '&');
  };

  // First sanitization pass
  let sanitized = performBasicSanitization(content);

  // Decode HTML entities to catch encoded attacks
  sanitized = decodeHtmlEntities(sanitized);

  // Second sanitization pass after decoding
  sanitized = performBasicSanitization(sanitized);

  // Additional security measures
  sanitized = sanitized
    // Remove any remaining suspicious patterns
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(/gi, '')
    .replace(/@import/gi, '')
    // Limit dangerous CSS
    .replace(/position\s*:\s*fixed/gi, 'position: static')
    .replace(/position\s*:\s*absolute/gi, 'position: static');

  return sanitized;
}
