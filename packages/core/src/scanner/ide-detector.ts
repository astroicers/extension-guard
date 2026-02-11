import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DetectedIDE } from '../types/index.js';

export const IDE_PATHS: Record<string, string[]> = {
  'VS Code': ['~/.vscode/extensions'],
  'VS Code Insiders': ['~/.vscode-insiders/extensions'],
  'VS Code Server': ['~/.vscode-server/extensions'],
  Cursor: ['~/.cursor/extensions'],
  Windsurf: ['~/.windsurf/extensions'],
  Trae: ['~/.trae/extensions'],
  VSCodium: ['~/.vscode-oss/extensions'],
};

export function expandPath(inputPath: string): string {
  if (inputPath.startsWith('~')) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  if (inputPath.includes('%USERPROFILE%')) {
    return inputPath.replace('%USERPROFILE%', os.homedir());
  }
  return inputPath;
}

function countExtensions(dirPath: string): number {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).length;
  } catch {
    return 0;
  }
}

export function detectIDEPaths(): DetectedIDE[] {
  const detected: DetectedIDE[] = [];

  for (const [ideName, paths] of Object.entries(IDE_PATHS)) {
    for (const idePath of paths) {
      const expandedPath = expandPath(idePath);
      if (fs.existsSync(expandedPath)) {
        detected.push({
          name: ideName,
          path: expandedPath,
          extensionCount: countExtensions(expandedPath),
        });
        break;
      }
    }
  }

  return detected;
}
