/**
 * Bundle/Minified File Detector
 *
 * Detects if a JavaScript file is bundled/minified output from tools like:
 * - webpack
 * - esbuild
 * - rollup
 * - parcel
 * - vite
 *
 * Bundled files often trigger false positives because:
 * - They contain many library dependencies inlined
 * - Minification creates high-entropy code patterns
 * - Source maps and comments are stripped
 */

export interface BundleDetectionResult {
  isBundled: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  bundler?: string;
}

/**
 * Common bundler signatures in the output
 */
const BUNDLER_SIGNATURES: Record<string, RegExp[]> = {
  webpack: [
    /\/\*{3}\/ var __webpack_/,
    /\/\*! For license information /,
    /webpackChunk/,
    /__webpack_require__/,
    /\/\*\*\*\/ \(/,
  ],
  esbuild: [
    /\/\/ src\//,
    /__esm\s*\(/,
    /__export\s*\(/,
    /var __defProp\s*=/,
    /var __getOwnPropDesc\s*=/,
  ],
  rollup: [
    /\/\*\* @license/,
    /\(function \(global, factory\)/,
    /typeof exports === 'object'/,
    /define\(\['exports'/,
  ],
  parcel: [/parcelRequire/, /@parcel\/transformer/],
  vite: [/vite\/modulepreload-polyfill/, /import\.meta\.hot/],
  browserify: [/require=\(function e\(t,n,r\)/, /typeof require=="function"/],
};

/**
 * Patterns indicating minified code
 * Note: Currently checked via line length heuristics instead
 */
// const MINIFICATION_PATTERNS = [
//   /[,;]\s*[a-z]\s*=/gi,
//   /\)\s*\{\s*return\s+[a-z]\s*\(/gi,
// ];

/**
 * Common chunk patterns
 */
const CHUNK_PATTERNS = [
  /\d+\.chunk\.js$/i,
  /chunk-[a-f0-9]+\.js$/i,
  /\.bundle\.js$/i,
  /\.min\.js$/i,
  /\.prod\.js$/i,
  /vendor[\.\-]/i,
  /runtime[\.\-][a-f0-9]+\.js$/i,
];

/**
 * Detect if a file is a bundled/minified output
 */
export function detectBundle(filePath: string, content: string): BundleDetectionResult {
  const reasons: string[] = [];
  let detectedBundler: string | undefined;

  // Check filename patterns
  const filename = filePath.split('/').pop() || filePath;
  for (const pattern of CHUNK_PATTERNS) {
    if (pattern.test(filename)) {
      reasons.push(`Filename matches chunk pattern: ${filename}`);
      break;
    }
  }

  // Check for bundler signatures
  for (const [bundler, patterns] of Object.entries(BUNDLER_SIGNATURES)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        reasons.push(`Contains ${bundler} signature`);
        detectedBundler = bundler;
        break;
      }
    }
    if (detectedBundler) break;
  }

  // Check for minification indicators
  const lines = content.split('\n');
  const longLineCount = lines.filter((line) => line.length > 500).length;
  const totalLines = lines.length;

  if (totalLines > 0 && longLineCount / totalLines > 0.1) {
    reasons.push(`High percentage of long lines (${longLineCount}/${totalLines})`);
  }

  // Check for average line length (minified files have very long average)
  const totalChars = content.length;
  const avgLineLength = totalChars / Math.max(totalLines, 1);
  if (avgLineLength > 200) {
    reasons.push(`High average line length (${Math.round(avgLineLength)} chars)`);
  }

  // Check for source map reference
  if (/\/\/# sourceMappingURL=/.test(content)) {
    reasons.push('Contains source map reference');
  }

  // Check for common bundled patterns
  if (/\(self\["webpackChunk/.test(content)) {
    reasons.push('Contains webpack chunk pattern');
    if (!detectedBundler) detectedBundler = 'webpack';
  }

  // Check for many export/import patterns (common in bundled code)
  const exportCount = (content.match(/export\s*\{|exports\./g) || []).length;
  if (exportCount > 20) {
    reasons.push(`Many export statements (${exportCount})`);
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (detectedBundler || reasons.length >= 3) {
    confidence = 'high';
  } else if (reasons.length >= 2) {
    confidence = 'medium';
  }

  return {
    isBundled: reasons.length > 0,
    confidence,
    reasons,
    bundler: detectedBundler,
  };
}

/**
 * Check if a file path looks like a bundled output location
 */
export function isBundleOutputPath(filePath: string): boolean {
  const bundleOutputDirs = [
    '/dist/',
    '/build/',
    '/out/',
    '/lib/',
    '/.output/',
    '/bundle/',
    '/packed/',
    '/compiled/',
  ];

  const normalizedPath = filePath.toLowerCase();
  return bundleOutputDirs.some((dir) => normalizedPath.includes(dir));
}

/**
 * Determine if findings from this file should be treated with reduced severity
 * because it's likely bundled code (which commonly contains many false positives)
 */
export function shouldReduceSeverityForBundle(
  filePath: string,
  content: string
): { reduce: boolean; reason?: string } {
  // First check if it's in a typical bundle output directory
  if (isBundleOutputPath(filePath)) {
    const result = detectBundle(filePath, content);
    if (result.isBundled && result.confidence !== 'low') {
      return {
        reduce: true,
        reason: `Bundled file (${result.bundler || 'detected'}, ${result.confidence} confidence)`,
      };
    }
  }

  // Also check files that end with common bundle extensions
  if (/\.(bundle|min|prod|chunk)\.js$/i.test(filePath)) {
    return {
      reduce: true,
      reason: 'Bundle filename pattern',
    };
  }

  return { reduce: false };
}
