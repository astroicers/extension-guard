/**
 * Known-Good Hash Database
 *
 * This module manages the database of known-good extension hashes.
 * The database can be:
 * 1. Bundled with the package (for critical extensions)
 * 2. Downloaded from a remote server (for community-maintained hashes)
 * 3. Locally maintained by the user
 *
 * IMPORTANT: This is a static snapshot. For production use, consider:
 * - Fetching from VS Code Marketplace API
 * - Community-maintained hash repository
 * - User-generated baseline from clean install
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ExtensionHash } from './integrity-verifier.js';

/**
 * Hash database structure
 */
export interface HashDatabase {
  version: string;
  updatedAt: string;
  hashes: ExtensionHash[];
}

/**
 * In-memory cache of loaded hashes
 */
let hashCache: Map<string, ExtensionHash> | null = null;

/**
 * Default path for local hash database
 */
export function getDefaultDatabasePath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, '.extension-guard', 'hash-database.json');
}

/**
 * Load hash database from a JSON file
 */
export function loadHashDatabase(filePath?: string): Map<string, ExtensionHash> {
  const dbPath = filePath || getDefaultDatabasePath();

  if (hashCache && !filePath) {
    return hashCache;
  }

  const hashes = new Map<string, ExtensionHash>();

  try {
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      const db: HashDatabase = JSON.parse(content);

      for (const hash of db.hashes) {
        const key = `${hash.extensionId}@${hash.version}`;
        hashes.set(key, hash);
      }
    }
  } catch {
    // Silently fail - database might not exist yet
  }

  // Also load bundled hashes
  const bundled = getBundledHashes();
  for (const [key, hash] of bundled) {
    if (!hashes.has(key)) {
      hashes.set(key, hash);
    }
  }

  if (!filePath) {
    hashCache = hashes;
  }

  return hashes;
}

/**
 * Save hash database to a JSON file
 */
export function saveHashDatabase(
  hashes: Map<string, ExtensionHash>,
  filePath?: string
): void {
  const dbPath = filePath || getDefaultDatabasePath();
  const dir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db: HashDatabase = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    hashes: Array.from(hashes.values()),
  };

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  // Update cache
  if (!filePath) {
    hashCache = hashes;
  }
}

/**
 * Add or update a hash in the database
 */
export function addHash(hash: ExtensionHash, filePath?: string): void {
  const hashes = loadHashDatabase(filePath);
  const key = `${hash.extensionId}@${hash.version}`;
  hashes.set(key, hash);
  saveHashDatabase(hashes, filePath);
}

/**
 * Get a hash from the database
 */
export function getHash(
  extensionId: string,
  version: string,
  filePath?: string
): ExtensionHash | undefined {
  const hashes = loadHashDatabase(filePath);
  return hashes.get(`${extensionId}@${version}`);
}

/**
 * Clear the hash cache (useful for testing)
 */
export function clearHashCache(): void {
  hashCache = null;
}

/**
 * Bundled hashes for critical extensions
 *
 * These are hashes of known-good versions of high-risk extensions.
 * They are bundled with the package to provide baseline protection
 * without requiring network access.
 *
 * NOTE: In production, these should be regularly updated and
 * ideally fetched from a trusted source.
 */
function getBundledHashes(): Map<string, ExtensionHash> {
  const hashes = new Map<string, ExtensionHash>();

  // This is a placeholder structure.
  // In production, this would contain actual verified hashes.
  //
  // Example:
  // {
  //   extensionId: 'github.copilot',
  //   version: '1.388.0',
  //   manifestHash: 'abc123...',
  //   contentHash: 'def456...',
  //   structureHash: 'ghi789...',
  //   combinedHash: 'jkl012...',
  //   recordedAt: '2026-02-01T00:00:00Z',
  //   source: 'marketplace',
  // }

  return hashes;
}

/**
 * Generate a baseline database from currently installed extensions
 * This is useful for users to create their own trusted baseline
 */
export async function generateBaseline(
  _extensionPaths: string[],
  _outputPath?: string
): Promise<{ generated: number; errors: string[] }> {
  // This is implemented in CLI directly for better UX
  // Keeping this function signature for API completeness
  return {
    generated: 0,
    errors: ['Use CLI baseline command instead'],
  };
}
