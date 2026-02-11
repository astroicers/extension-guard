#!/usr/bin/env node

/**
 * Update version numbers across all packages in the monorepo.
 * Called by semantic-release during the prepare phase.
 *
 * Usage: node scripts/update-versions.js <version>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/update-versions.js <version>');
  process.exit(1);
}

console.log(`Updating all packages to version ${version}...`);

// Files to update
const packageJsonPaths = [
  'packages/core/package.json',
  'packages/cli/package.json',
  'packages/vscode/package.json',
];

const coreIndexPath = 'packages/core/src/index.ts';

// Update package.json files
for (const relativePath of packageJsonPaths) {
  const filePath = join(rootDir, relativePath);
  try {
    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    content.version = version;
    writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`  ✓ Updated ${relativePath}`);
  } catch (error) {
    console.error(`  ✗ Failed to update ${relativePath}: ${error.message}`);
    process.exit(1);
  }
}

// Update VERSION constant in core/src/index.ts
const indexPath = join(rootDir, coreIndexPath);
try {
  let content = readFileSync(indexPath, 'utf-8');
  content = content.replace(
    /export const VERSION = '[^']+';/,
    `export const VERSION = '${version}';`
  );
  writeFileSync(indexPath, content);
  console.log(`  ✓ Updated ${coreIndexPath}`);
} catch (error) {
  console.error(`  ✗ Failed to update ${coreIndexPath}: ${error.message}`);
  process.exit(1);
}

console.log(`\nAll packages updated to version ${version}`);
