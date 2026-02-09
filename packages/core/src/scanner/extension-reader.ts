import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ExtensionInfo, ExtensionManifest } from '../types/index.js';

export async function readExtension(
  extensionPath: string
): Promise<ExtensionInfo | null> {
  try {
    const packageJsonPath = path.join(extensionPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const manifest: ExtensionManifest = JSON.parse(content);

    if (!manifest.name || !manifest.publisher || !manifest.version) {
      return null;
    }

    const stats = await getDirectoryStats(extensionPath);

    const repository = typeof manifest.repository === 'string'
      ? manifest.repository
      : manifest.repository?.url;

    return {
      id: `${manifest.publisher}.${manifest.name}`,
      displayName: manifest.displayName ?? manifest.name,
      version: manifest.version,
      publisher: {
        name: manifest.publisher,
        verified: false,
      },
      description: manifest.description ?? '',
      categories: manifest.categories ?? [],
      activationEvents: manifest.activationEvents ?? [],
      extensionDependencies: manifest.extensionDependencies ?? [],
      installPath: extensionPath,
      engines: { vscode: manifest.engines?.vscode ?? '*' },
      repository,
      license: manifest.license,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
    };
  } catch {
    return null;
  }
}

async function getDirectoryStats(
  dirPath: string
): Promise<{ fileCount: number; totalSize: number }> {
  let fileCount = 0;
  let totalSize = 0;

  async function walk(currentPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else {
          fileCount++;
          try {
            const stat = await fs.stat(fullPath);
            totalSize += stat.size;
          } catch {
            // Skip files we can't stat
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(dirPath);
  return { fileCount, totalSize };
}

export async function readExtensionsFromDirectory(
  directoryPath: string
): Promise<ExtensionInfo[]> {
  const extensions: ExtensionInfo[] = [];

  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory());

    const results = await Promise.all(
      directories.map((dir) =>
        readExtension(path.join(directoryPath, dir.name))
      )
    );

    for (const result of results) {
      if (result) {
        extensions.push(result);
      }
    }
  } catch {
    return [];
  }

  return extensions;
}
