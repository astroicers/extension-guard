import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

// Minimum length for a value to be considered a potential secret
const MIN_SECRET_LENGTH = 8;

// Minimum entropy for generic-secret values — filters out natural language and config values
const MIN_GENERIC_SECRET_ENTROPY = 3.0;

// Patterns that indicate placeholder values (false positives)
const PLACEHOLDER_PATTERNS = [
  /^your[_-]?/i,
  /^<[^>]+>$/,
  /^replace[_-]?me$/i,
  /^xxx+$/i,
  /^x{3,}[_-]x{3,}/i,
  /^todo$/i,
  /^fixme$/i,
  /^example$/i,
  /^placeholder$/i,
  /^changeme$/i,
  /^\*+$/,
  /^\.+$/,
  /^test$/i,
  /^demo$/i,
];

// Common false-positive values for generic-secret pattern
// These are legitimate config/code patterns, not actual secrets
const FALSE_POSITIVE_VALUES = [
  /^(?:true|false|null|undefined|none)$/i,
  /^(?:string|number|boolean|object|array|function)$/i,
  /^(?:keyword|identifier|operator|punctuation|comment|variable|constant)$/i, // TextMate token types
  /^(?:bearer|basic|digest)\s/i, // Auth scheme names, not actual tokens
  /^(?:process\.env|os\.environ)/i, // Env access patterns
  /^https?:\/\//i, // URLs
  /^\$\{/, // Template literals
  /^%[sd]/, // Format strings
];

// File patterns to exclude (test files, examples, docs)
const EXCLUDED_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /(?:^|\/)test\//,
  /(?:^|\/)tests\//,
  /(?:^|\/)examples?\//,
  /(?:^|\/)demo\//,
  /\.md$/,
  /\.txt$/,
  /\.rst$/,
];

// Code file extensions to scan
const CODE_FILE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];

interface SecretPattern {
  name: string;
  pattern: RegExp;
  matchGroup?: number;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // AWS Access Key ID (starts with AKIA)
  {
    name: 'aws-access-key',
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  // AWS Secret Access Key
  {
    name: 'aws-secret-key',
    pattern:
      /(?:aws[_-]?secret(?:[_-]?access)?[_-]?key|secret[_-]?access[_-]?key)\s*[:=]\s*['"`]([A-Za-z0-9/+=]{40})['"`]/gi,
    matchGroup: 1,
  },
  // GitHub tokens (ghp_, gho_, ghs_, ghr_)
  {
    name: 'github-token',
    pattern: /gh[pors]_[A-Za-z0-9]{36,}/g,
  },
  // Slack tokens (xoxb-, xoxp-, xoxa-, xoxr-)
  {
    name: 'slack-token',
    pattern: /xox[bpar]-[0-9]+-[0-9]+-[A-Za-z0-9]+/g,
  },
  // Private keys
  {
    name: 'private-key',
    pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
  },
  // Bearer tokens (JWT format)
  {
    name: 'bearer-token',
    pattern: /Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,
    matchGroup: 1,
  },
  // API key assignments
  {
    name: 'api-key',
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"`]([A-Za-z0-9_-]{16,})['"`]/gi,
    matchGroup: 1,
  },
  // Generic secrets (password, secret, token, passwd, pwd)
  {
    name: 'generic-secret',
    pattern: /(?:password|passwd|pwd|secret|token)\s*[:=]\s*['"`]([^'"`]{8,})['"`]/gi,
    matchGroup: 1,
  },
];

function isCodeFile(filePath: string): boolean {
  return CODE_FILE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function isExcludedFile(filePath: string): boolean {
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function isFalsePositiveValue(value: string): boolean {
  return FALSE_POSITIVE_VALUES.some((pattern) => pattern.test(value));
}

function calculateSecretEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isInComment(content: string, matchIndex: number): boolean {
  // Find the start of the line containing the match
  const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
  const lineContent = content.slice(lineStart, matchIndex);

  // Check for single-line comment
  if (lineContent.includes('//')) {
    return true;
  }

  // Check for block comment - look for /* before the match without a closing */
  const beforeMatch = content.slice(0, matchIndex);
  const lastBlockStart = beforeMatch.lastIndexOf('/*');
  const lastBlockEnd = beforeMatch.lastIndexOf('*/');

  if (lastBlockStart > lastBlockEnd) {
    return true;
  }

  return false;
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

export const highHardcodedSecret: DetectionRule = {
  id: 'EG-HIGH-006',
  name: 'Hardcoded Secrets',
  description: 'Detects hardcoded API keys, tokens, passwords, and other secrets in code',
  severity: 'high',
  category: 'hardcoded-secret',
  mitreAttackId: 'T1552.001',
  enabled: true,

  detect(files: Map<string, string>, _manifest: ExtensionManifest): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      // Skip non-code files
      if (!isCodeFile(filePath)) {
        continue;
      }

      // Skip test/example files
      if (isExcludedFile(filePath)) {
        continue;
      }

      // Skip empty files
      if (!content || content.trim().length === 0) {
        continue;
      }

      const lines = content.split('\n');

      for (const secretPattern of SECRET_PATTERNS) {
        // Reset regex lastIndex to avoid issues with global flag
        secretPattern.pattern.lastIndex = 0;

        let match;
        while ((match = secretPattern.pattern.exec(content)) !== null) {
          const matchIndex = match.index;

          // Skip if in a comment
          if (isInComment(content, matchIndex)) {
            continue;
          }

          // Get the actual secret value (either from capture group or full match)
          const secretValue =
            secretPattern.matchGroup !== undefined ? match[secretPattern.matchGroup] : match[0];

          // Skip if no secret value found
          if (!secretValue) {
            continue;
          }

          // Skip short values for generic patterns
          if (secretPattern.name === 'generic-secret' && secretValue.length < MIN_SECRET_LENGTH) {
            continue;
          }

          // Skip placeholder values
          if (isPlaceholder(secretValue)) {
            continue;
          }

          // Skip known false-positive values
          if (isFalsePositiveValue(secretValue)) {
            continue;
          }

          // For generic-secret, require minimum entropy to filter out
          // natural language config values like tokenType = "keyword"
          if (secretPattern.name === 'generic-secret') {
            const entropy = calculateSecretEntropy(secretValue);
            if (entropy < MIN_GENERIC_SECRET_ENTROPY) {
              continue;
            }
          }

          const lineNumber = getLineNumber(content, matchIndex);
          const lineContent = lines[lineNumber - 1]?.trim() || '';

          evidences.push({
            filePath,
            lineNumber,
            lineContent: lineContent.length > 100 ? lineContent.slice(0, 100) + '...' : lineContent,
            matchedPattern: secretPattern.name,
            snippet: `Detected ${secretPattern.name}: ${secretValue.slice(0, 20)}${secretValue.length > 20 ? '...' : ''}`,
          });
        }
      }
    }

    return evidences;
  },
};
