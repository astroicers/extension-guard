import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const COLLECTED_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.json']);

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.svn', '.hg', '__pycache__']);

const IGNORED_PATTERNS = [/\.min\.js$/, /\.map$/, /\.d\.ts$/];

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function shouldCollectFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();

  if (!COLLECTED_EXTENSIONS.has(ext)) {
    return false;
  }

  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return false;
    }
  }

  for (const pattern of IGNORED_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  return true;
}

export async function collectFiles(extensionPath: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  async function walk(currentPath: string, relativePath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          if (!IGNORED_DIRECTORIES.has(entry.name)) {
            await walk(fullPath, relPath);
          }
        } else if (entry.isFile()) {
          if (shouldCollectFile(relPath)) {
            try {
              const stat = await fs.stat(fullPath);
              if (stat.size <= MAX_FILE_SIZE) {
                const content = await fs.readFile(fullPath, 'utf-8');
                files.set(relPath, content);
              }
            } catch {
              // Skip files we can't read
            }
          }
        }
      }
    } catch {
      // Skip directories we can't access
    }
  }

  await walk(extensionPath, '');
  return files;
}
