/**
 * @module content-analysis
 * @description Advanced content analysis functions for AI security
 *
 * Functions:
 * - detectTrainingDataExtraction: Detects attempts to extract training data
 * - detectAdversarialPrompt: Identifies adversarial prompt manipulation techniques
 * - detectMaliciousCode: Analyzes content for potentially malicious code
 * - containsIndirectInjection: Detects indirect injection attempts in data
 *
 * This module implements sophisticated analysis techniques to identify
 * various attack vectors specific to AI systems and content manipulation.
 */

/**
 * Result interface for adversarial prompt detection
 */
interface AdversarialPromptResult {
  isAdversarial: boolean;
  techniques: string[];
}

/**
 * Result interface for malicious code detection
 */
interface MaliciousCodeResult {
  isMalicious: boolean;
  threats: string[];
}

// Pre-compile regex patterns for performance
const TRAINING_DATA_PATTERNS = {
  direct: [
    /repeat\s+(exactly|verbatim|word\s+for\s+word)/i,
    /show\s+me\s+(the\s+)?(exact|original)\s+(text|content|data)/i,
    /what\s+(was|were)\s+your\s+training\s+(data|materials)/i,
    /(copy|reproduce)\s+(exactly|verbatim)/i,
    /output\s+(the\s+)?(original|exact)\s+(text|content)/i,
  ],
  completion: [
    /complete\s+this\s+(song|poem|book|article)/i,
    /continue\s+(writing|the\s+following)\s*(:|from)/i,
    /finish\s+this\s+(quote|passage|text)/i,
    /what\s+comes\s+next\s+in\s+this\s+(text|passage)/i,
    /recite\s+the\s+(rest|remainder)\s+of/i,
  ],
  memory: [
    /do\s+you\s+remember\s+(reading|seeing|learning)/i,
    /what\s+do\s+you\s+know\s+about\s+\[specific\s+person\]/i,
    /recall\s+(the\s+)?(exact|specific)\s+(words|content)/i,
    /from\s+your\s+(memory|training)\s+about/i,
    /you\s+(learned|saw|read)\s+about/i,
  ],
  dataDump: [
    /print\s+(all|everything)\s+(you\s+know\s+about|from)/i,
    /output\s+(raw|unfiltered)\s+(data|content)/i,
    /dump\s+(memory|cache|training)/i,
    /show\s+me\s+(all|everything)\s+(from|about)/i,
    /list\s+(all|every)\s+.+\s+you\s+(know|learned)/i,
  ],
  sensitive: [
    /the\s+password\s+is\s*:/i,
    /my\s+social\s+security\s+number\s+is/i,
    /credit\s+card\s+number\s*:\s*\d/i,
    /api\s+key\s*:\s*[a-zA-Z0-9]/i,
    /secret\s+key\s*:\s*/i,
  ],
};

/**
 * Detects attempts to extract training data from AI models
 * @param prompt - User prompt to analyze
 * @returns True if training data extraction attempt is detected
 */
export function detectTrainingDataExtraction(prompt: string): boolean {
  if (!prompt || typeof prompt !== 'string') {
    return false;
  }

  const directExtractionPatterns = [
    /repeat\s+(exactly|verbatim|word\s+for\s+word)/i,
    /show\s+me\s+(the\s+)?(exact|original)\s+(text|content|data)/i,
    /what\s+(was|were)\s+your\s+training\s+(data|materials)/i,
    /(copy|reproduce)\s+(exactly|verbatim)/i,
    /output\s+(the\s+)?(original|exact)\s+(text|content)/i,
  ];

  const completionExtractionPatterns = [
    /complete\s+this\s+(song|poem|book|article)/i,
    /continue\s+(writing|the\s+following)\s*(:|from)/i,
    /finish\s+this\s+(quote|passage|text)/i,
    /what\s+comes\s+next\s+in\s+this\s+(text|passage)/i,
    /recite\s+the\s+(rest|remainder)\s+of/i,
  ];

  const memoryExtractionPatterns = [
    /do\s+you\s+remember\s+(reading|seeing|learning)/i,
    /what\s+do\s+you\s+know\s+about\s+\[specific\s+person\]/i,
    /recall\s+(the\s+)?(exact|specific)\s+(words|content)/i,
    /from\s+your\s+(memory|training)\s+about/i,
    /you\s+(learned|saw|read)\s+about/i,
  ];

  const dataDumpPatterns = [
    /print\s+(all|everything)\s+(you\s+know\s+about|from)/i,
    /output\s+(raw|unfiltered)\s+(data|content)/i,
    /dump\s+(memory|cache|training)/i,
    /show\s+me\s+(all|everything)\s+(from|about)/i,
    /list\s+(all|every)\s+.+\s+you\s+(know|learned)/i,
  ];

  const sensitivePatternPatterns = [
    /the\s+password\s+is\s*:/i,
    /credit\s+card\s+number\s*:\s*\d/i,
    /social\s+security\s+number\s*:\s*\d/i,
    /api\s+key\s*:\s*[a-z0-9]/i,
    /private\s+key\s*:/i,
  ];

  const allPatterns = [
    ...directExtractionPatterns,
    ...completionExtractionPatterns,
    ...memoryExtractionPatterns,
    ...dataDumpPatterns,
    ...sensitivePatternPatterns,
  ];

  return allPatterns.some((pattern) => pattern.test(prompt));
}

/**
 * Detects adversarial prompt manipulation techniques
 * @param prompt - User prompt to analyze
 * @returns Object with detection status and identified techniques
 */
export function detectAdversarialPrompt(
  prompt: string
): AdversarialPromptResult {
  if (!prompt || typeof prompt !== 'string') {
    return { isAdversarial: false, techniques: [] };
  }

  const techniques: string[] = [];

  // Role-playing manipulation
  if (checkRolePlayingManipulation(prompt)) {
    techniques.push('role-playing');
  }

  // Instruction override attempts
  if (checkInstructionOverride(prompt)) {
    techniques.push('instruction-override');
  }

  // Emotional manipulation
  if (checkEmotionalManipulation(prompt)) {
    techniques.push('emotional-manipulation');
  }

  // False authority claims
  if (checkFalseAuthority(prompt)) {
    techniques.push('false-authority');
  }

  // Encoding obfuscation
  if (checkEncodingObfuscation(prompt)) {
    techniques.push('encoding-obfuscation');
  }

  // Template injection
  if (checkTemplateInjection(prompt)) {
    techniques.push('template-injection');
  }

  // Multi-step manipulation
  if (checkMultiStepManipulation(prompt)) {
    techniques.push('multi-step-manipulation');
  }

  // Jailbreaking attempts
  if (checkJailbreakingAttempts(prompt)) {
    techniques.push('jailbreaking');
  }

  // Context switching
  if (checkContextSwitching(prompt)) {
    techniques.push('context-switching');
  }

  return {
    isAdversarial: techniques.length > 0,
    techniques,
  };
}

/**
 * Detects potentially malicious code in content
 * @param content - Content to analyze
 * @returns Object with detection status and identified threats
 */
export function detectMaliciousCode(content: string): MaliciousCodeResult {
  if (!content || typeof content !== 'string') {
    return { isMalicious: false, threats: [] };
  }

  const threats: string[] = [];

  // Check system command patterns
  const systemCommandPatterns = [
    /rm\s+-rf\s+[/*~]/g, // Destructive file operations
    /del\s+\/s\s+\/q/g, // Windows destructive delete
    /format\s+c:/g, // Format drive
    /shutdown\s+(-s|-r|-h)/g, // System shutdown
    /curl\s+.*\|\s*sh/g, // Download and execute
    /wget\s+.*\|\s*sh/g, // Download and execute
    /eval\s*\(/g, // Dynamic code execution
    /exec\s*\(/g, // Process execution
    /system\s*\(/g, // System command execution
    /os\.system/g, // Python system calls
    /subprocess\./g, // Python subprocess
    /shell_exec/g, // PHP shell execution
  ];

  threats.push(
    ...checkPatternMatches(content, systemCommandPatterns, 'system-command')
  );

  // Check network exploitation patterns
  const networkExploitPatterns = [
    /nc\s+.*-e/g, // Netcat reverse shell
    /\/bin\/sh/g, // Shell references
    /bash\s+-i/g, // Interactive bash
    /\$\(.*\)/g, // Command substitution
    /`.*`/g, // Backtick command execution
    /powershell\s+.*invoke/gi, // PowerShell invoke commands
    /cmd\s*\/c/gi, // Windows command line
  ];

  threats.push(
    ...checkPatternMatches(content, networkExploitPatterns, 'network-exploit')
  );

  // Check script injection patterns
  const scriptInjectionPatterns = [
    /<script[^>]*>.*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript URLs
    /on\w+\s*=/gi, // Event handlers
    /document\.cookie/gi, // Cookie access
    /localStorage\./gi, // Local storage access
    /sessionStorage\./gi, // Session storage access
    /window\.location/gi, // Location manipulation
    /document\.write/gi, // DOM writing
  ];

  threats.push(
    ...checkPatternMatches(content, scriptInjectionPatterns, 'script-injection')
  );

  // Check SQL injection patterns
  const sqlInjectionPatterns = [
    /union\s+select/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+.+\s+set/gi,
    /;\s*--/g, // SQL comment injection
    /'\s*or\s*'1'\s*=\s*'1/gi, // Classic SQL injection
  ];

  threats.push(
    ...checkPatternMatches(content, sqlInjectionPatterns, 'sql-injection')
  );

  // Check file system access patterns
  const fileSystemPatterns = [
    /\.\.\/\.\.\//g, // Directory traversal
    /\/etc\/passwd/g, // Unix password file
    /\/proc\/self\/environ/g, // Process environment
    /c:\\windows\\system32/gi, // Windows system directory
    /\/var\/log\//g, // Log directory access
  ];

  threats.push(
    ...checkPatternMatches(content, fileSystemPatterns, 'filesystem-access')
  );

  // Check cryptographic bypass patterns
  const cryptoBypassPatterns = [
    /md5\s*\(/gi,
    /sha1\s*\(/gi,
    /base64_decode/gi,
    /atob\s*\(/gi,
    /btoa\s*\(/gi,
    /crypto\./gi,
  ];

  threats.push(
    ...checkPatternMatches(content, cryptoBypassPatterns, 'crypto-bypass')
  );

  return {
    isMalicious: threats.length > 0,
    threats,
  };
}

/**
 * Detects indirect injection attempts in data
 * @param data - Data to analyze for indirect injections
 * @returns True if indirect injection is detected
 */
export function containsIndirectInjection(data: string): boolean {
  if (!data || typeof data !== 'string') {
    return false;
  }

  const suspiciousPatterns = [
    /\[.*INSTRUCTION.*\]/i,
    /SYSTEM\s*\(.*\)/i,
    /<!--.*INJECTION.*-->/i,
    /<injection>/i,
    /=SYSTEM\(/i,
    /IGNORE.*INSTRUCTIONS/i,
    /NEW\s+ROLE\s*:/i,
    /OVERRIDE\s+SAFETY/i,
    /JAILBREAK\s+MODE/i,
    /DEVELOPER\s+MODE/i,
    /{{.*INSTRUCTION.*}}/i,
    /\$\{.*INSTRUCTION.*\}/i,
  ];

  // Check direct patterns first
  if (suspiciousPatterns.some((pattern) => pattern.test(data))) {
    return true;
  }

  // Check base64 encoded content
  return checkBase64Content(data, suspiciousPatterns);
}

// Helper functions for adversarial prompt detection

function checkRolePlayingManipulation(prompt: string): boolean {
  const patterns = [
    /pretend\s+(you\s+are|to\s+be)/i,
    /act\s+like\s+you\s+are/i,
    /roleplay\s+as/i,
    /imagine\s+you\s+are/i,
    /let's\s+say\s+you\s+are/i,
    /assume\s+you\s+are/i,
    /simulate\s+being/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkInstructionOverride(prompt: string): boolean {
  const patterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /new\s+instructions/i,
    /override\s+(previous|system)/i,
    /forget\s+(everything|all)\s+(before|previous)/i,
    /disregard\s+(previous|all)/i,
    /cancel\s+(previous|all)/i,
    /reset\s+(to|your)/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkEmotionalManipulation(prompt: string): boolean {
  const patterns = [
    /(please|help\s+me|i\s+need|urgent|emergency).*?(ignore|bypass|override)/i,
    /my\s+(grandmother|mother|father).*?(died|dying).*?(tell|show)/i,
    /for\s+my\s+(homework|research|project).*?(ignore|bypass)/i,
    /it's\s+(important|urgent|critical).*?(override|ignore)/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkFalseAuthority(prompt: string): boolean {
  const patterns = [
    /(i\s+am\s+(your|the)\s+(creator|developer|admin)|authorized\s+to\s+override)/i,
    /as\s+(your|the)\s+(administrator|developer)/i,
    /i\s+have\s+permission\s+to/i,
    /admin\s+override\s+code/i,
    /developer\s+access\s+granted/i,
    /system\s+administrator\s+here/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkEncodingObfuscation(prompt: string): boolean {
  const patterns = [
    /base64|hex\s+encoded|rot13|reverse\s+this|decode/i,
    /\\x[0-9a-f]{2}/i, // Hex encoding
    /\\u[0-9a-f]{4}/i, // Unicode encoding
    /&#x?[0-9a-f]+;/i, // HTML entities
    /%[0-9a-f]{2}/i, // URL encoding
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkTemplateInjection(prompt: string): boolean {
  const patterns = [
    /{{.*}}/g,
    /\$\{.*\}/g,
    /<%.*%>/g,
    /\[\[.*\]\]/g,
    /\{%.*%\}/g, // Jinja2 templates
    /<\?.*\?>/g, // PHP templates
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkMultiStepManipulation(prompt: string): boolean {
  const patterns = [
    /(first|step\s+1).*?(then|next|step\s+2).*?(finally|last|step\s+3)/i,
    /initially.*?then.*?finally/i,
    /phase\s+1.*?phase\s+2.*?phase\s+3/i,
    /part\s+1.*?part\s+2.*?part\s+3/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkJailbreakingAttempts(prompt: string): boolean {
  const patterns = [
    /jailbreak/i,
    /dan\s+(mode|do\s+anything\s+now)/i,
    /unrestricted\s+(mode|ai)/i,
    /no\s+(limits|restrictions|safety)/i,
    /bypass\s+(safety|security|filters)/i,
    /(evil|dark|shadow)\s+(mode|ai)/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

function checkContextSwitching(prompt: string): boolean {
  const patterns = [
    /now\s+switch\s+to/i,
    /change\s+context\s+to/i,
    /enter\s+(debug|admin|dev)\s+mode/i,
    /activate\s+(special|hidden)\s+mode/i,
    /---\s*new\s+(context|session)/i,
    /\*\*\*\s*system\s+change/i,
  ];
  return patterns.some((pattern) => pattern.test(prompt));
}

// Helper functions for content analysis

function checkPatternMatches(
  content: string,
  patterns: RegExp[],
  threatPrefix: string
): string[] {
  const threats: string[] = [];
  patterns.forEach((pattern, index) => {
    if (pattern.test(content)) {
      threats.push(`${threatPrefix}-${index}`);
    }
  });
  return threats;
}

function checkBase64Content(data: string, patterns: RegExp[]): boolean {
  const base64Regex = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const matches = data.match(base64Regex);

  if (!matches) {
    return false;
  }

  for (const match of matches) {
    const decoded = tryDecodeBase64(match);
    if (decoded && patterns.some((pattern) => pattern.test(decoded))) {
      return true;
    }
  }

  return false;
}

function tryDecodeBase64(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}
