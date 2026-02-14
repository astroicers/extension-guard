/**
 * Extension IDs that belong to Extension Guard itself.
 *
 * These extensions are automatically excluded from scanning to prevent
 * false positives from the scanner analyzing itself. Self-exclusion
 * can be disabled via ScanOptions.includeSelfExtensions for testing.
 */
export const SELF_EXTENSION_IDS = ['aspect-guard.extension-guard-vscode'] as const;

/**
 * Type for self-extension IDs.
 */
export type SelfExtensionId = (typeof SELF_EXTENSION_IDS)[number];

/**
 * Check if an extension ID belongs to Extension Guard.
 */
export function isSelfExtension(extensionId: string): boolean {
  const normalized = extensionId.toLowerCase();
  return SELF_EXTENSION_IDS.some((id) => normalized === id.toLowerCase());
}
