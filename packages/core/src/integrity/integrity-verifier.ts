/**
 * Extension Integrity Verifier
 *
 * Verifies that installed extensions match their known-good hashes.
 * This detects supply chain attacks where an official extension has been
 * tampered with after installation or during distribution.
 *
 * Verification methods:
 * 1. File content hash - SHA256 of all JS files concatenated
 * 2. Manifest hash - SHA256 of package.json
 * 3. Structure hash - Hash of file list (detects added/removed files)
 */

import { createHash } from 'node:crypto';

/**
 * Hash record for a specific extension version
 */
export interface ExtensionHash {
  /** Extension ID (publisher.name) */
  extensionId: string;
  /** Version string */
  version: string;
  /** SHA256 of package.json content */
  manifestHash: string;
  /** SHA256 of all JS file contents concatenated (sorted by path) */
  contentHash: string;
  /** SHA256 of sorted file path list */
  structureHash: string;
  /** Combined hash for quick comparison */
  combinedHash: string;
  /** When this hash was recorded */
  recordedAt: string;
  /** Source of the hash (marketplace, manual, etc.) */
  source: 'marketplace' | 'manual' | 'community';
}

/**
 * Result of integrity verification
 */
export interface IntegrityResult {
  extensionId: string;
  version: string;
  status: 'verified' | 'modified' | 'unknown' | 'error';
  /** Which parts were modified (if status is 'modified') */
  modifications?: {
    manifest: boolean;
    content: boolean;
    structure: boolean;
  };
  /** The computed hashes */
  computedHashes?: {
    manifestHash: string;
    contentHash: string;
    structureHash: string;
    combinedHash: string;
  };
  /** The expected hashes (if known) */
  expectedHashes?: ExtensionHash;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Compute SHA256 hash of a string
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Compute hashes for an extension from its files
 */
export function computeExtensionHashes(
  extensionId: string,
  version: string,
  files: Map<string, string>
): Omit<ExtensionHash, 'recordedAt' | 'source'> {
  // Manifest hash
  const manifestContent = files.get('package.json') ?? '';
  const manifestHash = sha256(manifestContent);

  // Content hash - concatenate all JS files sorted by path
  const jsFiles = Array.from(files.entries())
    .filter(([path]) => path.endsWith('.js') || path.endsWith('.ts'))
    .sort(([a], [b]) => a.localeCompare(b));

  const contentHash = sha256(jsFiles.map(([, content]) => content).join('\n'));

  // Structure hash - sorted list of all file paths
  const sortedPaths = Array.from(files.keys()).sort();
  const structureHash = sha256(sortedPaths.join('\n'));

  // Combined hash
  const combinedHash = sha256(`${manifestHash}:${contentHash}:${structureHash}`);

  return {
    extensionId,
    version,
    manifestHash,
    contentHash,
    structureHash,
    combinedHash,
  };
}

/**
 * Verify extension integrity against known hashes
 */
export function verifyIntegrity(
  extensionId: string,
  version: string,
  files: Map<string, string>,
  knownHashes: Map<string, ExtensionHash>
): IntegrityResult {
  try {
    // Compute current hashes
    const computed = computeExtensionHashes(extensionId, version, files);

    // Look up known hash
    const key = `${extensionId}@${version}`;
    const expected = knownHashes.get(key);

    if (!expected) {
      return {
        extensionId,
        version,
        status: 'unknown',
        computedHashes: {
          ...computed,
        },
      };
    }

    // Compare hashes
    const manifestModified = computed.manifestHash !== expected.manifestHash;
    const contentModified = computed.contentHash !== expected.contentHash;
    const structureModified = computed.structureHash !== expected.structureHash;

    if (manifestModified || contentModified || structureModified) {
      return {
        extensionId,
        version,
        status: 'modified',
        modifications: {
          manifest: manifestModified,
          content: contentModified,
          structure: structureModified,
        },
        computedHashes: {
          ...computed,
        },
        expectedHashes: expected,
      };
    }

    return {
      extensionId,
      version,
      status: 'verified',
      computedHashes: {
        ...computed,
      },
      expectedHashes: expected,
    };
  } catch (error) {
    return {
      extensionId,
      version,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a hash record for an extension (for adding to the database)
 */
export function createHashRecord(
  extensionId: string,
  version: string,
  files: Map<string, string>,
  source: ExtensionHash['source'] = 'manual'
): ExtensionHash {
  const hashes = computeExtensionHashes(extensionId, version, files);
  return {
    ...hashes,
    recordedAt: new Date().toISOString(),
    source,
  };
}
