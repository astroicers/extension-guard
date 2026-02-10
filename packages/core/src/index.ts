// Extension Guard Core - Scanning Engine
// @aspect-guard/core

export const VERSION = '0.3.0';

// Types
export * from './types/index.js';

// Scanner
export { ExtensionGuardScanner } from './scanner/scanner.js';
export { detectIDEPaths, IDE_PATHS, expandPath } from './scanner/ide-detector.js';
export { readExtension, readExtensionsFromDirectory } from './scanner/extension-reader.js';
export { collectFiles, shouldCollectFile } from './scanner/file-collector.js';
export { categorizeExtension } from './scanner/extension-categorizer.js';
export type { ExtensionCategory } from './scanner/extension-categorizer.js';

// Rules
export * from './rules/index.js';
export { registerBuiltInRules, DETECTION_RULES } from './rules/built-in/index.js';
export { adjustFindings } from './rules/finding-adjuster.js';
export type { AdjustFindingsOptions } from './rules/finding-adjuster.js';

// Trusted Publishers
export {
  TRUSTED_PUBLISHERS,
  TRUSTED_EXTENSION_IDS,
  isTrustedPublisher,
  isTrustedExtension,
} from './data/trusted-publishers.js';

// Reporter
export * from './reporter/index.js';

// Policy
export * from './policy/index.js';
