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

  // Validate maxTokens
  if (modelParams.maxTokens !== undefined) {
    if (
      typeof modelParams.maxTokens !== 'number' ||
      modelParams.maxTokens < 1
    ) {
      errors.push('maxTokens must be a positive number');
    }
    if (modelParams.maxTokens > 4096) {
      errors.push('maxTokens cannot exceed 4096');
    }
  }

  // Validate temperature
  if (
    modelParams.temperature !== undefined &&
    (typeof modelParams.temperature !== 'number' ||
      modelParams.temperature < 0 ||
      modelParams.temperature > 2)
  ) {
    errors.push('temperature must be between 0 and 2');
  }

  // Validate topP
  if (
    modelParams.topP !== undefined &&
    (typeof modelParams.topP !== 'number' ||
      modelParams.topP < 0 ||
      modelParams.topP > 1)
  ) {
    errors.push('topP must be between 0 and 1');
  }

  // Validate frequency and presence penalties
  const penaltyParams = ['presencePenalty', 'frequencyPenalty'];
  for (const param of penaltyParams) {
    if (
      modelParams[param] !== undefined &&
      (typeof modelParams[param] !== 'number' ||
        modelParams[param] < -2 ||
        modelParams[param] > 2)
    ) {
      errors.push(`${param} must be between -2 and 2`);
    }
  }

  // Validate logitBias
  if (modelParams.logitBias !== undefined) {
    if (
      typeof modelParams.logitBias !== 'object' ||
      Array.isArray(modelParams.logitBias)
    ) {
      errors.push('logitBias must be an object');
    } else if (modelParams.logitBias) {
      const logitBiasObj = modelParams.logitBias as Record<string, unknown>;
      for (const [token, bias] of Object.entries(logitBiasObj)) {
        if (typeof bias !== 'number' || bias < -100 || bias > 100) {
          errors.push('logitBias values must be between -100 and 100');
          break; // Avoid duplicate errors
        }
        // Validate token ID is reasonable
        const tokenId = Number.parseInt(token, 10);
        if (Number.isNaN(tokenId) || tokenId < 0 || tokenId > 100000) {
          errors.push('logitBias keys must be valid token IDs');
          break;
        }
      }
    }
  }

  // Validate completion count
  if (
    modelParams.n !== undefined &&
    (typeof modelParams.n !== 'number' ||
      modelParams.n < 1 ||
      modelParams.n > 10)
  ) {
    errors.push('n must be between 1 and 10');
  }

  // Validate seed
  if (
    modelParams.seed !== undefined &&
    (typeof modelParams.seed !== 'number' ||
      modelParams.seed < 0 ||
      modelParams.seed > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push('seed must be a non-negative integer');
  }

  // Validate stop sequences
  if (modelParams.stop !== undefined) {
    if (typeof modelParams.stop === 'string') {
      if (modelParams.stop.length > 100) {
        errors.push('stop sequence cannot exceed 100 characters');
      }
    } else if (Array.isArray(modelParams.stop)) {
      if (modelParams.stop.length > 4) {
        errors.push('cannot specify more than 4 stop sequences');
      }
      for (const stopSeq of modelParams.stop) {
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
  }

  // Check for dangerous or unknown parameters
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

  for (const key of Object.keys(modelParams)) {
    if (!allowedParams.has(key)) {
      errors.push(`Unknown or disallowed parameter: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitizes model parameters to safe values
 * @param params - Raw model parameters
 * @returns Sanitized parameters with safe defaults
 */
export function sanitizeModelParameters(params: unknown): ModelParameters {
  if (!params || typeof params !== 'object' || params === null) {
    return {};
  }

  const inputParams = params as Record<string, unknown>;

  const sanitized: ModelParameters = {};

  // Whitelist approach - only allow known safe parameters
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

  // Handle special cases
  if (inputParams.seed !== undefined) {
    const seed = Number.parseInt(String(inputParams.seed), 10);
    if (!Number.isNaN(seed) && seed >= 0 && seed <= Number.MAX_SAFE_INTEGER) {
      sanitized.seed = seed;
    }
  }

  // Handle stop sequences with validation
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
        .slice(0, 4); // Ensure max 4 items
      if (validStops.length > 0) {
        sanitized.stop = validStops;
      }
    }
  }

  // Handle logitBias with strict validation
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
        break; // Limit bias entries to prevent abuse
      }

      const tokenId = Number.parseInt(token, 10);
      const biasValue = typeof bias === 'number' ? bias : 0;

      if (
        !Number.isNaN(tokenId) &&
        tokenId >= 0 &&
        tokenId <= 100000 &&
        biasValue >= -100 &&
        biasValue <= 100
      ) {
        sanitizedBias[token] = biasValue;
        biasCount++;
      }
    }

    if (Object.keys(sanitizedBias).length > 0) {
      sanitized.logitBias = sanitizedBias;
    }
  }

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
  const repeatedPattern = /(.)\1{50,}/; // 50+ repeated characters
  if (repeatedPattern.test(prompt)) {
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
function validateOptionalParameters(request: unknown): RequestValidationResult {
  if (!request || typeof request !== 'object' || request === null) {
    return { valid: true };
  }

  const reqObj = request as Record<string, unknown>;

  // Validate maxTokens if present
  if (
    'maxTokens' in reqObj &&
    (typeof reqObj.maxTokens !== 'number' ||
      reqObj.maxTokens < 1 ||
      reqObj.maxTokens > 4096)
  ) {
    return { valid: false, error: 'Invalid maxTokens parameter' };
  }

  // Validate temperature if present
  if (
    'temperature' in reqObj &&
    (typeof reqObj.temperature !== 'number' ||
      reqObj.temperature < 0 ||
      reqObj.temperature > 2)
  ) {
    return { valid: false, error: 'Invalid temperature parameter' };
  }

  // Validate model if present
  if ('model' in reqObj) {
    if (typeof reqObj.model !== 'string' || reqObj.model.length === 0) {
      return { valid: false, error: 'Invalid model parameter' };
    }

    // Only allow known safe model names
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

  // Validate stream parameter if present
  if ('stream' in reqObj && typeof reqObj.stream !== 'boolean') {
    return { valid: false, error: 'Invalid stream parameter' };
  }

  // Check for dangerous parameters
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

  return { valid: true };
}
