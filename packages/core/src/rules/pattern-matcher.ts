/**
 * Shared pattern matching utilities for detection rules.
 * Reduces code duplication across rules and improves maintainability.
 */

import type { Evidence } from '../types/index.js';

/**
 * Pattern definition for matching in file content
 */
export interface MatchPattern {
  /** Name of the pattern for evidence reporting */
  name: string;
  /** Regex pattern (should have 'g' flag for multiple matches) */
  pattern: RegExp;
  /** If specified, use this capture group for the matched value */
  matchGroup?: number;
}

/**
 * Options for file filtering
 */
export interface FileFilterOptions {
  /** File extensions to include (e.g., ['.js', '.ts']) */
  extensions?: string[];
  /** Regex patterns to exclude files */
  excludePatterns?: RegExp[];
}

/**
 * Options for pattern matching
 */
export interface MatchOptions {
  /** Maximum length for snippet in evidence */
  maxSnippetLength?: number;
  /** Function to validate matched value (return false to skip) */
  validate?: (value: string, content: string, matchIndex: number) => boolean;
}

/** Default code file extensions */
export const CODE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];

/** Simple JS/TS extensions */
export const JS_TS_EXTENSIONS = ['.js', '.ts'];

/**
 * Check if a file should be processed based on extension
 */
export function hasExtension(filePath: string, extensions: string[]): boolean {
  return extensions.some((ext) => filePath.endsWith(ext));
}

/**
 * Check if a file matches any exclusion pattern
 */
export function isExcluded(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

/**
 * Get line number from content index (1-based)
 */
export function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/**
 * Get line content at a specific line number (1-based)
 */
export function getLineContent(lines: string[], lineNumber: number): string {
  return lines[lineNumber - 1]?.trim() ?? '';
}

/**
 * Check if an index position is inside a comment
 */
export function isInComment(content: string, matchIndex: number): boolean {
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

  return lastBlockStart > lastBlockEnd;
}

/**
 * Match all patterns in a single file and generate evidence
 */
export function matchPatternsInFile(
  filePath: string,
  content: string,
  patterns: MatchPattern[],
  options: MatchOptions = {}
): Evidence[] {
  const evidences: Evidence[] = [];
  const lines = content.split('\n');
  const maxSnippetLength = options.maxSnippetLength ?? 100;

  for (const { name, pattern, matchGroup } of patterns) {
    // Reset regex lastIndex to avoid issues with global flag
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const matchIndex = match.index;

      // Get the matched value (either from capture group or full match)
      const matchedValue = matchGroup !== undefined ? match[matchGroup] : match[0];

      // Skip if no value matched
      if (!matchedValue) {
        continue;
      }

      // Run custom validation if provided
      if (options.validate && !options.validate(matchedValue, content, matchIndex)) {
        continue;
      }

      const lineNumber = getLineNumber(content, matchIndex);
      const lineContent = getLineContent(lines, lineNumber);

      evidences.push({
        filePath,
        lineNumber,
        lineContent: lineContent.length > maxSnippetLength
          ? lineContent.slice(0, maxSnippetLength) + '...'
          : lineContent,
        matchedPattern: name,
        snippet: matchedValue.length > maxSnippetLength
          ? matchedValue.slice(0, maxSnippetLength) + '...'
          : matchedValue,
      });
    }
  }

  return evidences;
}

/**
 * Match patterns across all files with filtering
 */
export function matchPatternsInFiles(
  files: Map<string, string>,
  patterns: MatchPattern[],
  filterOptions: FileFilterOptions = {},
  matchOptions: MatchOptions = {}
): Evidence[] {
  const evidences: Evidence[] = [];
  const extensions = filterOptions.extensions ?? JS_TS_EXTENSIONS;
  const excludePatterns = filterOptions.excludePatterns ?? [];

  for (const [filePath, content] of files) {
    // Check file extension
    if (!hasExtension(filePath, extensions)) {
      continue;
    }

    // Check exclusion patterns
    if (excludePatterns.length > 0 && isExcluded(filePath, excludePatterns)) {
      continue;
    }

    // Skip empty files
    if (!content || content.trim().length === 0) {
      continue;
    }

    const fileEvidences = matchPatternsInFile(filePath, content, patterns, matchOptions);
    evidences.push(...fileEvidences);
  }

  return evidences;
}

/**
 * Check if content within a context window matches a pattern
 */
export function hasPatternInContext(
  content: string,
  matchIndex: number,
  matchLength: number,
  contextPattern: RegExp,
  contextWindow: number = 200
): boolean {
  const startIndex = Math.max(0, matchIndex - contextWindow);
  const endIndex = Math.min(content.length, matchIndex + matchLength + contextWindow);
  const context = content.slice(startIndex, endIndex);
  return contextPattern.test(context);
}
