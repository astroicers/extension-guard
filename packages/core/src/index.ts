// Extension Guard Core - Scanning Engine
// @aspect-guard/core

export const VERSION = '0.1.0';

// Types
export * from './types/index.js';

// Scanner
export { ExtensionGuardScanner } from './scanner/scanner.js';
export { detectIDEPaths, IDE_PATHS, expandPath } from './scanner/ide-detector.js';
export { readExtension, readExtensionsFromDirectory } from './scanner/extension-reader.js';
export { collectFiles, shouldCollectFile } from './scanner/file-collector.js';

// Rules
export * from './rules/index.js';
export { registerBuiltInRules } from './rules/built-in/index.js';
