import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

const MIN_BASE64_LENGTH = 100;
const BASE64_PATTERN = /['"`]([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?['"`]/g;
const HEX_PATTERN = /(?:\\x[0-9a-fA-F]{2}){10,}/g;
const CHAR_CODE_PATTERN = /String\.fromCharCode\s*\(\s*(?:\d+\s*,?\s*){5,}\)/g;
const UNICODE_ESCAPE_PATTERN = /(?:\\u[0-9a-fA-F]{4}){10,}/g;

// Bundled/minified files: single large JS in dist/ or out/ directory, or well-known bundler output
const BUNDLED_FILE_PATTERN = /(?:^|\/)(?:dist|out|build|bundle)\//;
const BUNDLED_FILE_SIZE_THRESHOLD = 100 * 1024; // 100KB — typical bundle size

function calculateEntropy(str: string): number {
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

export const highObfuscatedCode: DetectionRule = {
  id: 'EG-HIGH-001',
  name: 'Code Obfuscation Detected',
  description: 'Detects heavily obfuscated code patterns that may hide malicious behavior',
  severity: 'high',
  category: 'code-obfuscation',
  mitreAttackId: 'T1027',
  enabled: true,

  detect(files: Map<string, string>, _manifest: ExtensionManifest): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');

      // Check for large base64 strings
      BASE64_PATTERN.lastIndex = 0;
      let match;
      while ((match = BASE64_PATTERN.exec(content)) !== null) {
        const base64Content = match[0].slice(1, -1);
        if (base64Content.length >= MIN_BASE64_LENGTH) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: (lines[lineNumber - 1]?.trim() || '').slice(0, 80) + '...',
            matchedPattern: 'large-base64',
            snippet: `Base64 string of ${base64Content.length} characters`,
          });
        }
      }

      // Check for hex-encoded strings
      HEX_PATTERN.lastIndex = 0;
      while ((match = HEX_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: (lines[lineNumber - 1]?.trim() || '').slice(0, 80) + '...',
          matchedPattern: 'hex-encoded',
          snippet: match[0].slice(0, 50) + '...',
        });
      }

      // Check for String.fromCharCode abuse
      CHAR_CODE_PATTERN.lastIndex = 0;
      while ((match = CHAR_CODE_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim(),
          matchedPattern: 'charcode-obfuscation',
          snippet: match[0].slice(0, 80),
        });
      }

      // Check for unicode escape sequences
      UNICODE_ESCAPE_PATTERN.lastIndex = 0;
      while ((match = UNICODE_ESCAPE_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: (lines[lineNumber - 1]?.trim() || '').slice(0, 80) + '...',
          matchedPattern: 'unicode-escape',
          snippet: match[0].slice(0, 50) + '...',
        });
      }

      // Check overall file entropy for large files
      // Skip bundled/minified files (>100KB in dist/out/build dirs) — they naturally have high entropy
      const isBundled =
        BUNDLED_FILE_PATTERN.test(filePath) && content.length > BUNDLED_FILE_SIZE_THRESHOLD;

      if (!isBundled && content.length > 5000) {
        const entropy = calculateEntropy(content);
        // Threshold raised from 5.8 to 6.2 — bundled JS with regex-heavy content
        // (grammar definitions, URL patterns) routinely hits 5.8-6.0
        if (entropy > 6.2) {
          evidences.push({
            filePath,
            lineNumber: 1,
            matchedPattern: 'high-entropy',
            snippet: `File entropy: ${entropy.toFixed(2)} (threshold: 6.2)`,
          });
        }
      }
    }

    return evidences;
  },
};
