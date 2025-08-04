/**
 * SPDX-License-Identifier: MIT
 */

/**
 * Core utilities for Zopio modules
 */

/**
 * Logger utility for consistent logging across Zopio modules
 */

// Define a type for log levels
type LogLevel = 'info' | 'error' | 'warn' | 'debug';

// Create a logging function that can be disabled by linting rules
const logMessage = (
  level: LogLevel,
  message: string,
  args: unknown[]
): void => {
  switch (level) {
    case 'info':
      // biome-ignore lint/suspicious/noConsole: This is a logger utility
      console.info(`[INFO] ${message}`, ...args);
      break;
    case 'error':
      // biome-ignore lint/suspicious/noConsole: This is a logger utility
      console.error(`[ERROR] ${message}`, ...args);
      break;
    case 'warn':
      // biome-ignore lint/suspicious/noConsole: This is a logger utility
      console.warn(`[WARN] ${message}`, ...args);
      break;
    case 'debug':
      // biome-ignore lint/suspicious/noConsole: This is a logger utility
      console.debug(`[DEBUG] ${message}`, ...args);
      break;
    default:
      // Handle unexpected log levels
      // biome-ignore lint/suspicious/noConsole: This is a logger utility
      // biome-ignore lint/suspicious/noConsoleLog: This is a logger utility
      console.log(`[UNKNOWN] ${message}`, ...args);
  }
};

/**
 * Logger utility for consistent logging across Zopio modules
 */
export const logger = {
  /**
   * Log an informational message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void {
    // In production, this would use a proper logging service
    if (process.env.NODE_ENV !== 'production') {
      logMessage('info', message, args);
    }
  },

  /**
   * Log an error message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  error(message: string, ...args: unknown[]): void {
    // Errors are always logged
    logMessage('error', message, args);
  },

  /**
   * Log a warning message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  warn(message: string, ...args: unknown[]): void {
    // Warnings are always logged
    logMessage('warn', message, args);
  },

  /**
   * Log a debug message (only in development)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      logMessage('debug', message, args);
    }
  },
};

/**
 * Utility for handling async operations
 */
export const asyncUtils = {
  /**
   * Wrap an async function to catch errors
   * @param fn The async function to wrap
   * @returns A function that returns a promise that never rejects
   */
  safeAsync: <T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>
  ): ((...args: A) => Promise<[T | null, Error | null]>) => {
    return async (...args: A): Promise<[T | null, Error | null]> => {
      try {
        const result = await fn(...args);
        return [result, null];
      } catch (error) {
        return [null, error as Error];
      }
    };
  },
};

/**
 * Utility for working with objects
 */
export const objectUtils = {
  /**
   * Deep merge two objects
   * @param target The target object
   * @param source The source object
   * @returns The merged object
   */
  deepMerge: <T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
  ): T => {
    if (!isObject(target) || !isObject(source)) {
      return target;
    }

    const output = { ...target } as T;

    for (const key of Object.keys(source)) {
      const sourceValue = source[key as keyof typeof source];
      const targetKey = key as keyof T;

      // Skip undefined values
      if (sourceValue === undefined) {
        continue;
      }

      // Handle nested objects
      if (
        key in target &&
        isObject(target[targetKey]) &&
        isObject(sourceValue) &&
        !(sourceValue instanceof Date) // Don't treat Date objects as mergeable objects
      ) {
        output[targetKey] = objectUtils.deepMerge(
          target[targetKey] as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[keyof T];
      } else {
        // For non-objects, new keys, or Date objects, just assign the value
        output[targetKey] = sourceValue as T[keyof T];
      }
    }

    return output;
  },
};

/**
 * Check if a value is an object
 * @param item The value to check
 * @returns True if the value is an object
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Utility for working with strings
 */
export const stringUtils = {
  /**
   * Convert a string to camelCase
   * @param str The string to convert
   * @returns The camelCase string
   */
  toCamelCase: (str: string): string => {
    // Trim whitespace and handle empty strings
    const trimmed = str.trim();
    if (!trimmed) {
      return '';
    }

    // Check if string is already in camelCase (starts with lowercase, has uppercase inside)
    const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
    const hasUpperCase = /[A-Z]/;
    if (camelCasePattern.test(trimmed) && hasUpperCase.test(trimmed)) {
      return trimmed;
    }

    // Replace whitespace (spaces, tabs, newlines) with a delimiter
    const normalized = trimmed.replace(/[\s\t\n]+/g, ' ');

    // Replace separators (-, _) with spaces, preserving special characters like @ and .
    const withSpaces = normalized.replace(/[-_]+/g, ' ');

    // Also handle PascalCase by inserting spaces before capital letters
    const withPascalSpaces = withSpaces.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Split by spaces and process each word
    const parts = withPascalSpaces.split(' ').filter((part) => part.length > 0);

    const transformPart = /^([^a-zA-Z]*)([a-zA-Z])(.*)$/;

    return parts
      .map((part, index) => {
        if (!part) {
          return '';
        }

        // First part is all lowercase
        if (index === 0) {
          return part.toLowerCase();
        }

        // For other parts, capitalize first letter and lowercase the rest
        // Only transform alphabetic characters
        const match = part.match(transformPart);
        if (match) {
          const [, prefix, firstLetter, rest] = match;
          return prefix + firstLetter.toUpperCase() + rest.toLowerCase();
        }

        return part;
      })
      .join('');
  },

  /**
   * Convert a string to kebab-case
   * @param str The string to convert
   * @returns The kebab-case string
   */
  toKebabCase: (str: string): string => {
    // Trim whitespace and handle empty strings
    const trimmed = str.trim();
    if (!trimmed) {
      return '';
    }

    // Check if it's a single word (all lowercase, all uppercase, or single capital)
    const allLowerCase = /^[a-z]+$/;
    const allUpperCase = /^[A-Z]+$/;
    const singleCapital = /^[A-Z][a-z]+$/;

    if (
      allLowerCase.test(trimmed) ||
      allUpperCase.test(trimmed) ||
      singleCapital.test(trimmed)
    ) {
      return trimmed.toLowerCase();
    }

    return (
      trimmed
        // Insert hyphens before each uppercase letter
        .replace(/([A-Z])/g, '-$1')
        // Handle the start of string
        .replace(/^-/, '')
        // Replace whitespace (spaces, tabs, newlines) with dashes
        .replace(/[\s\t\n]+/g, '-')
        // Remove duplicate hyphens
        .replace(/-+/g, '-')
        // Convert to lowercase
        .toLowerCase()
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
    );
  },
};

/**
 * Utility for working with arrays
 */
export const arrayUtils = {
  /**
   * Group an array of objects by a key
   * @param array The array to group
   * @param key The key to group by
   * @returns The grouped object
   */
  groupBy: <T extends Record<string, unknown>, K extends keyof T>(
    array: T[],
    key: K
  ): Record<string, T[]> => {
    return array.reduce(
      (result, item) => {
        const groupKey = String(item[key]);
        result[groupKey] = result[groupKey] || [];
        result[groupKey].push(item);
        return result;
      },
      {} as Record<string, T[]>
    );
  },
};
