/**
 * @module validation
 * @description Input validation and sanitization functions for AI operations
 *
 * Functions:
 * - validateModelParameters: Validates AI model configuration parameters
 * - sanitizeModelParameters: Sanitizes and normalizes model parameters
 * - validateRequestStructure: Validates incoming request structure and format
 *
 * This module implements comprehensive validation to ensure that all inputs
 * to AI operations are properly formatted, within safe bounds, and free
 * from potentially malicious content.
 */

// Pre-compiled regex patterns for performance
const REPEATED_CHARACTER_PATTERN = /(.)\1{50,}/; // 50+ repeated characters

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Request validation result interface
 */
interface RequestValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Model parameters interface for type safety
 */
interface ModelParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  logitBias?: Record<string, number>;
  n?: number;
  seed?: number;
  stop?: string | string[];
  [key: string]: unknown;
}

/**
 * Validates maxTokens parameter
 * @param maxTokens - MaxTokens value to validate
 * @returns Array of error messages
 */
function validateMaxTokens(maxTokens: unknown): string[] {
  if (maxTokens === undefined) {
    return [];
  }

  const errors: string[] = [];
  if (typeof maxTokens !== 'number' || maxTokens < 1) {
    errors.push('maxTokens must be a positive number');
  }
  if (typeof maxTokens === 'number' && maxTokens > 4096) {
    errors.push('maxTokens cannot exceed 4096');
  }
  return errors;
}

/**
 * Validates temperature parameter
 * @param temperature - Temperature value to validate
 * @returns Array of error messages
 */
function validateTemperature(temperature: unknown): string[] {
  if (temperature === undefined) {
    return [];
  }

  if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
    return ['temperature must be between 0 and 2'];
  }
  return [];
}

/**
 * Validates topP parameter
 * @param topP - TopP value to validate
 * @returns Array of error messages
 */
function validateTopP(topP: unknown): string[] {
  if (topP === undefined) {
    return [];
  }

  if (typeof topP !== 'number' || topP < 0 || topP > 1) {
    return ['topP must be between 0 and 1'];
  }
  return [];
}

/**
 * Validates penalty parameters
 * @param params - Parameters object containing penalties
 * @returns Array of error messages
 */
function validatePenalties(params: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const penaltyParams = ['presencePenalty', 'frequencyPenalty'];

  for (const param of penaltyParams) {
    if (
      params[param] !== undefined &&
      (typeof params[param] !== 'number' ||
        params[param] < -2 ||
        params[param] > 2)
    ) {
      errors.push(`${param} must be between -2 and 2`);
    }
  }
  return errors;
}

/**
 * Validates logitBias parameter
 * @param logitBias - LogitBias value to validate
 * @returns Array of error messages
 */
function validateLogitBias(logitBias: unknown): string[] {
  if (logitBias === undefined) {
    return [];
  }

  const errors: string[] = [];
  if (typeof logitBias !== 'object' || Array.isArray(logitBias)) {
    errors.push('logitBias must be an object');
  } else if (logitBias) {
    const logitBiasObj = logitBias as Record<string, unknown>;
    for (const [token, bias] of Object.entries(logitBiasObj)) {
      if (typeof bias !== 'number' || bias < -100 || bias > 100) {
        errors.push('logitBias values must be between -100 and 100');
        break;
      }
      const tokenId = Number.parseInt(token, 10);
      if (Number.isNaN(tokenId) || tokenId < 0 || tokenId > 100000) {
        errors.push('logitBias keys must be valid token IDs');
        break;
      }
    }
  }
  return errors;
}

/**
 * Validates completion count parameter
 * @param n - Completion count value to validate
 * @returns Array of error messages
 */
function validateCompletionCount(n: unknown): string[] {
  if (n === undefined) {
    return [];
  }

  if (typeof n !== 'number' || n < 1 || n > 10) {
    return ['n must be between 1 and 10'];
  }
  return [];
}

/**
 * Validates seed parameter
 * @param seed - Seed value to validate
 * @returns Array of error messages
 */
function validateSeed(seed: unknown): string[] {
  if (seed === undefined) {
    return [];
  }

  if (typeof seed !== 'number' || seed < 0 || seed > Number.MAX_SAFE_INTEGER) {
    return ['seed must be a non-negative integer'];
  }
  return [];
}

/**
 * Validates stop sequences parameter
 * @param stop - Stop sequences value to validate
 * @returns Array of error messages
 */
function validateStopSequences(stop: unknown): string[] {
  if (stop === undefined) {
    return [];
  }

  const errors: string[] = [];
  if (typeof stop === 'string') {
    if (stop.length > 100) {
      errors.push('stop sequence cannot exceed 100 characters');
    }
  } else if (Array.isArray(stop)) {
    if (stop.length > 4) {
      errors.push('cannot specify more than 4 stop sequences');
    }
    for (const stopSeq of stop) {
      if (typeof stopSeq !== 'string' || stopSeq.length > 100) {
        errors.push(
          'each stop sequence must be a string of 100 characters or less'
        );
        break;
      }
    }
  } else {
    errors.push('stop must be a string or array of strings');
  }
  return errors;
}

/**
 * Validates for unknown or dangerous parameters
 * @param params - Parameters object to validate
 * @returns Array of error messages
 */
function validateUnknownParameters(params: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allowedParams = new Set([
    'maxTokens',
    'temperature',
    'topP',
    'frequencyPenalty',
    'presencePenalty',
    'logitBias',
    'n',
    'seed',
    'stop',
    'model',
    'prompt',
    'messages',
  ]);

  for (const key of Object.keys(params)) {
    if (!allowedParams.has(key)) {
      errors.push(`Unknown or disallowed parameter: ${key}`);
    }
  }
  return errors;
}

/**
 * Validates model parameters for safety and correctness
 * @param params - Model parameters to validate
 * @returns Validation result with errors if any
 */
export function validateModelParameters(params: unknown): ValidationResult {
  const errors: string[] = [];

  if (!params || typeof params !== 'object' || params === null) {
    return { valid: false, errors: ['Parameters must be an object'] };
  }

  // Type guard for params
  const modelParams = params as Record<string, unknown>;

  // Validate individual parameters
  errors.push(...validateMaxTokens(modelParams.maxTokens));
  errors.push(...validateTemperature(modelParams.temperature));
  errors.push(...validateTopP(modelParams.topP));
  errors.push(...validatePenalties(modelParams));
  errors.push(...validateLogitBias(modelParams.logitBias));
  errors.push(...validateCompletionCount(modelParams.n));
  errors.push(...validateSeed(modelParams.seed));
  errors.push(...validateStopSequences(modelParams.stop));
  errors.push(...validateUnknownParameters(modelParams));

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitizes model parameters to safe values
 * @param params - Raw model parameters
 * @returns Sanitized parameters with safe defaults
 */
/**
 * Sanitizes numeric parameters with validation
 * @param inputParams - Input parameters object
 * @param sanitized - Sanitized parameters object to populate
 */
function sanitizeNumericParameters(
  inputParams: Record<string, unknown>,
  sanitized: ModelParameters
): void {
  const allowedParams = {
    maxTokens: { type: 'number', min: 1, max: 4096, default: 1000 },
    temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
    topP: { type: 'number', min: 0, max: 1, default: 1 },
    frequencyPenalty: { type: 'number', min: -2, max: 2, default: 0 },
    presencePenalty: { type: 'number', min: -2, max: 2, default: 0 },
    n: { type: 'number', min: 1, max: 10, default: 1 },
  };

  for (const [key, config] of Object.entries(allowedParams)) {
    if (key in inputParams) {
      const value = inputParams[key];
      if (
        typeof value === 'number' &&
        value >= config.min &&
        value <= config.max
      ) {
        sanitized[key as keyof ModelParameters] = value;
      } else {
        sanitized[key as keyof ModelParameters] = config.default;
      }
    }
  }
}

/**
 * Sanitizes seed parameter
 * @param inputParams - Input parameters object
 * @param sanitized - Sanitized parameters object to populate
 */
function sanitizeSeed(
  inputParams: Record<string, unknown>,
  sanitized: ModelParameters
): void {
  if (inputParams.seed !== undefined) {
    const seed = Number.parseInt(String(inputParams.seed), 10);
    if (!Number.isNaN(seed) && seed >= 0 && seed <= Number.MAX_SAFE_INTEGER) {
      sanitized.seed = seed;
    }
  }
}

/**
 * Sanitizes stop sequences parameter
 * @param inputParams - Input parameters object
 * @param sanitized - Sanitized parameters object to populate
 */
function sanitizeStopSequences(
  inputParams: Record<string, unknown>,
  sanitized: ModelParameters
): void {
  if (inputParams.stop !== undefined) {
    if (
      typeof inputParams.stop === 'string' &&
      inputParams.stop.length <= 100
    ) {
      sanitized.stop = inputParams.stop;
    } else if (
      Array.isArray(inputParams.stop) &&
      inputParams.stop.length <= 4
    ) {
      const validStops = inputParams.stop
        .filter(
          (stop: unknown) => typeof stop === 'string' && stop.length <= 100
        )
        .slice(0, 4);
      if (validStops.length > 0) {
        sanitized.stop = validStops;
      }
    }
  }
}

/**
 * Checks if a token-bias pair is valid
 * @param tokenId - The token ID to validate
 * @param biasValue - The bias value to validate
 * @returns True if valid
 */
function isValidTokenBias(tokenId: number, biasValue: number): boolean {
  return (
    !Number.isNaN(tokenId) &&
    tokenId >= 0 &&
    tokenId <= 100000 &&
    biasValue >= -100 &&
    biasValue <= 100
  );
}

/**
 * Sanitizes logit bias parameter
 * @param inputParams - Input parameters object
 * @param sanitized - Sanitized parameters object to populate
 */
function sanitizeLogitBias(
  inputParams: Record<string, unknown>,
  sanitized: ModelParameters
): void {
  if (
    inputParams.logitBias &&
    typeof inputParams.logitBias === 'object' &&
    !Array.isArray(inputParams.logitBias)
  ) {
    const sanitizedBias: Record<string, number> = {};
    let biasCount = 0;

    const logitBiasObj = inputParams.logitBias as Record<string, unknown>;
    for (const [token, bias] of Object.entries(logitBiasObj)) {
      if (biasCount >= 300) {
        break;
      }

      const tokenId = Number.parseInt(token, 10);
      const biasValue = typeof bias === 'number' ? bias : 0;

      if (isValidTokenBias(tokenId, biasValue)) {
        sanitizedBias[token] = biasValue;
        biasCount++;
      }
    }

    if (Object.keys(sanitizedBias).length > 0) {
      sanitized.logitBias = sanitizedBias;
    }
  }
}

export function sanitizeModelParameters(params: unknown): ModelParameters {
  if (!params || typeof params !== 'object' || params === null) {
    return {};
  }

  const inputParams = params as Record<string, unknown>;
  const sanitized: ModelParameters = {};

  // Sanitize different parameter types
  sanitizeNumericParameters(inputParams, sanitized);
  sanitizeSeed(inputParams, sanitized);
  sanitizeStopSequences(inputParams, sanitized);
  sanitizeLogitBias(inputParams, sanitized);

  return sanitized;
}

/**
 * Validates the structure of incoming requests
 * @param request - Request object to validate
 * @returns Validation result with error message if invalid
 */
export function validateRequestStructure(
  request: unknown
): RequestValidationResult {
  // Check if request exists and is an object
  if (!request || typeof request !== 'object' || request === null) {
    return { valid: false, error: 'Invalid request format' };
  }

  const requestObj = request as Record<string, unknown>;

  // Check for required prompt field
  if (!('prompt' in requestObj)) {
    return { valid: false, error: 'Missing prompt field' };
  }

  // Validate prompt field
  const promptValidation = validatePromptField(requestObj.prompt);
  if (!promptValidation.valid) {
    return promptValidation;
  }

  // Validate optional parameters
  const paramValidation = validateOptionalParameters(requestObj);
  if (!paramValidation.valid) {
    return paramValidation;
  }

  // Check for excessive number of fields (potential DoS)
  const fieldCount = Object.keys(requestObj).length;
  if (fieldCount > 20) {
    return { valid: false, error: 'Request has too many fields' };
  }

  // Check total request size (approximate)
  try {
    const requestSize = JSON.stringify(requestObj).length;
    if (requestSize > 100000) {
      // 100KB limit
      return { valid: false, error: 'Request size too large' };
    }
  } catch {
    return { valid: false, error: 'Request serialization failed' };
  }

  return { valid: true };
}

/**
 * Validates the prompt field specifically
 * @param prompt - Prompt value to validate
 * @returns Validation result
 */
function validatePromptField(prompt: unknown): RequestValidationResult {
  if (typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt must be a string' };
  }

  if (prompt.length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (prompt.length > 10000) {
    return { valid: false, error: 'Prompt too long' };
  }

  // Check for null bytes and other dangerous characters
  if (prompt.includes('\x00')) {
    return { valid: false, error: 'Invalid characters in prompt' };
  }

  // Check for excessive whitespace (potential padding attack)
  const whitespaceRatio = (prompt.match(/\s/g) || []).length / prompt.length;
  if (whitespaceRatio > 0.8) {
    return { valid: false, error: 'Prompt contains excessive whitespace' };
  }

  // Check for repeated characters (potential pattern attack)
  if (hasRepeatedCharacters(prompt)) {
    return {
      valid: false,
      error: 'Prompt contains excessive repeated characters',
    };
  }

  return { valid: true };
}

/**
 * Validates optional parameters in the request
 * @param request - Request object to validate
 * @returns Validation result
 */
/**
 * Validates maxTokens in request
 * @param reqObj - Request object
 * @returns Validation result or null if valid
 */
function validateRequestMaxTokens(
  reqObj: Record<string, unknown>
): RequestValidationResult | null {
  if (
    'maxTokens' in reqObj &&
    (typeof reqObj.maxTokens !== 'number' ||
      reqObj.maxTokens < 1 ||
      reqObj.maxTokens > 4096)
  ) {
    return { valid: false, error: 'Invalid maxTokens parameter' };
  }
  return null;
}

/**
 * Validates temperature in request
 * @param reqObj - Request object
 * @returns Validation result or null if valid
 */
function validateRequestTemperature(
  reqObj: Record<string, unknown>
): RequestValidationResult | null {
  if (
    'temperature' in reqObj &&
    (typeof reqObj.temperature !== 'number' ||
      reqObj.temperature < 0 ||
      reqObj.temperature > 2)
  ) {
    return { valid: false, error: 'Invalid temperature parameter' };
  }
  return null;
}

/**
 * Validates model parameter in request
 * @param reqObj - Request object
 * @returns Validation result or null if valid
 */
function validateRequestModel(
  reqObj: Record<string, unknown>
): RequestValidationResult | null {
  if ('model' in reqObj) {
    if (typeof reqObj.model !== 'string' || reqObj.model.length === 0) {
      return { valid: false, error: 'Invalid model parameter' };
    }

    const allowedModels = [
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-turbo',
      'gpt-4o',
      'text-davinci-003',
      'text-curie-001',
      'text-babbage-001',
      'text-ada-001',
    ];

    if (!allowedModels.includes(reqObj.model as string)) {
      return { valid: false, error: 'Unsupported model parameter' };
    }
  }
  return null;
}

/**
 * Validates stream parameter in request
 * @param reqObj - Request object
 * @returns Validation result or null if valid
 */
function validateRequestStream(
  reqObj: Record<string, unknown>
): RequestValidationResult | null {
  if ('stream' in reqObj && typeof reqObj.stream !== 'boolean') {
    return { valid: false, error: 'Invalid stream parameter' };
  }
  return null;
}

/**
 * Checks for dangerous parameters in request
 * @param reqObj - Request object
 * @returns Validation result or null if valid
 */
function checkDangerousParameters(
  reqObj: Record<string, unknown>
): RequestValidationResult | null {
  const dangerousParams = [
    'eval',
    'exec',
    'system',
    'shell',
    'cmd',
    'process',
    'require',
    'import',
    '__import__',
    'open',
    'file',
    'subprocess',
    'os',
    'sys',
    'globals',
    'locals',
  ];

  for (const dangerousParam of dangerousParams) {
    if (dangerousParam in reqObj) {
      return {
        valid: false,
        error: `Dangerous parameter detected: ${dangerousParam}`,
      };
    }
  }
  return null;
}

function validateOptionalParameters(request: unknown): RequestValidationResult {
  if (!request || typeof request !== 'object' || request === null) {
    return { valid: true };
  }

  const reqObj = request as Record<string, unknown>;

  // Run individual validations
  const validators = [
    validateRequestMaxTokens,
    validateRequestTemperature,
    validateRequestModel,
    validateRequestStream,
    checkDangerousParameters,
  ];

  for (const validator of validators) {
    const result = validator(reqObj);
    if (result) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Checks if a string contains excessive repeated characters
 * @param str - String to check
 * @returns True if excessive repeated characters are found
 */
function hasRepeatedCharacters(str: string): boolean {
  return REPEATED_CHARACTER_PATTERN.test(str);
}
