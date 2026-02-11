import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DetectedIDE } from '../types/index.js';

/**
 * IDE extension paths organized by IDE name.
 * Each IDE has multiple possible paths to support:
 * - Different OS (Windows, macOS, Linux)
 * - Different installation methods (user, system, portable)
 * - Remote development scenarios (SSH, WSL, containers)
 *
 * Paths use these placeholders:
 * - ~ : User home directory
 * - %USERPROFILE% : Windows user profile
 * - %APPDATA% : Windows AppData/Roaming
 * - %LOCALAPPDATA% : Windows AppData/Local
 *
 * References:
 * - https://code.visualstudio.com/docs/editor/extension-marketplace
 * - https://code.visualstudio.com/docs/remote/troubleshooting
 * - https://vscodium.com/
 * - https://zed.dev/docs/extensions/installing-extensions
 */
export const IDE_PATHS: Record<string, string[]> = {
  // VS Code - Standard installation
  'VS Code': [
    // Linux & macOS
    '~/.vscode/extensions',
    // Windows
    '%USERPROFILE%/.vscode/extensions',
    '%USERPROFILE%\\.vscode\\extensions',
  ],

  // VS Code Insiders - Preview builds
  'VS Code Insiders': [
    // Linux & macOS
    '~/.vscode-insiders/extensions',
    // Windows
    '%USERPROFILE%/.vscode-insiders/extensions',
    '%USERPROFILE%\\.vscode-insiders\\extensions',
  ],

  // VS Code Server - Remote SSH connections
  'VS Code Server': ['~/.vscode-server/extensions'],

  // VS Code Server Insiders - Remote SSH for Insiders
  'VS Code Server Insiders': ['~/.vscode-server-insiders/extensions'],

  // Cursor - AI-powered code editor (VS Code fork)
  // https://cursor.com
  Cursor: [
    // Linux & macOS
    '~/.cursor/extensions',
    // Windows
    '%USERPROFILE%/.cursor/extensions',
    '%USERPROFILE%\\.cursor\\extensions',
    // macOS alternate location
    '~/Library/Application Support/Cursor/User/extensions',
  ],

  // Cursor Server - Remote Cursor connections
  'Cursor Server': ['~/.cursor-server/extensions'],

  // Windsurf - Codeium AI IDE (VS Code fork)
  // https://codeium.com/windsurf
  Windsurf: [
    // Linux & macOS
    '~/.windsurf/extensions',
    // Windows
    '%USERPROFILE%/.windsurf/extensions',
    '%USERPROFILE%\\.windsurf\\extensions',
    // macOS alternate location
    '~/Library/Application Support/Windsurf/extensions',
  ],

  // Windsurf Server - Remote Windsurf connections
  'Windsurf Server': ['~/.windsurf-server/extensions'],

  // Trae - ByteDance AI IDE (VS Code fork)
  // https://www.trae.ai / https://www.marscode.com
  Trae: [
    // Linux & macOS
    '~/.trae/extensions',
    // Windows
    '%USERPROFILE%/.trae/extensions',
    '%USERPROFILE%\\.trae\\extensions',
  ],

  // VSCodium - Open source VS Code without telemetry
  // https://vscodium.com
  VSCodium: [
    // Linux & macOS
    '~/.vscode-oss/extensions',
    // Windows
    '%USERPROFILE%/.vscode-oss/extensions',
    '%USERPROFILE%\\.vscode-oss\\extensions',
    // Flatpak installation (Linux)
    '~/.var/app/com.vscodium.codium/data/codium/extensions',
  ],

  // VSCodium Insiders
  'VSCodium Insiders': [
    '~/.vscode-oss-insiders/extensions',
    '%USERPROFILE%/.vscode-oss-insiders/extensions',
  ],

  // Code - OSS (open source build from Microsoft repo)
  'Code - OSS': ['~/.config/Code - OSS/extensions', '~/.vscode-oss/extensions'],

  // Positron - Posit's data science IDE (VS Code fork)
  // https://github.com/posit-dev/positron
  Positron: [
    '~/.positron/extensions',
    '%USERPROFILE%/.positron/extensions',
    '~/Library/Application Support/Positron/extensions',
  ],

  // Theia - Eclipse Theia IDE (VS Code compatible)
  // https://theia-ide.org
  Theia: ['~/.theia/extensions', '%USERPROFILE%/.theia/extensions'],

  // OpenVSCode Server - Web-based VS Code
  // https://github.com/gitpod-io/openvscode-server
  'OpenVSCode Server': ['~/.openvscode-server/extensions'],

  // code-server - VS Code in the browser
  // https://github.com/coder/code-server
  'code-server': ['~/.local/share/code-server/extensions', '~/.config/code-server/extensions'],

  // GitHub Codespaces (when accessed locally)
  'GitHub Codespaces': ['~/.codespaces/.vscode-remote/extensions'],

  // Gitpod
  Gitpod: ['/workspace/.gitpod/extensions', '~/.gitpod/extensions'],

  // DevPod
  DevPod: ['~/.devpod/extensions'],

  // Lapce - Lightning-fast native code editor (has its own extension format but partially compatible)
  // https://lapce.dev
  // Note: Lapce uses a different extension format, included for future compatibility
  // Lapce: [
  //   '~/.lapce/plugins',
  //   '~/Library/Application Support/Lapce/plugins',
  // ],

  // Zed - High-performance editor (different extension format, not VS Code compatible)
  // https://zed.dev
  // Note: Zed uses its own extension format, not VS Code compatible
  // Included as reference for potential future support
  // Zed: [
  //   '~/Library/Application Support/Zed/extensions',
  //   '~/.local/share/zed/extensions',
  // ],
};

/**
 * Expand path placeholders to actual paths
 */
export function expandPath(inputPath: string): string {
  let result = inputPath;
  const home = os.homedir();

  // Expand ~ to home directory
  if (result.startsWith('~/')) {
    result = path.join(home, result.slice(2));
  } else if (result.startsWith('~\\')) {
    result = path.join(home, result.slice(2));
  } else if (result === '~') {
    result = home;
  }

  // Windows environment variables
  if (process.platform === 'win32') {
    result = result.replace(/%USERPROFILE%/gi, home);
    result = result.replace(
      /%APPDATA%/gi,
      process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    );
    result = result.replace(
      /%LOCALAPPDATA%/gi,
      process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    );
  } else {
    // On non-Windows, just remove Windows-style placeholders if they exist
    result = result.replace(/%USERPROFILE%/gi, home);
  }

  // Normalize path separators for current OS
  return path.normalize(result);
}

/**
 * Count extensions in a directory
 */
function countExtensions(dirPath: string): number {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    // Count directories that look like extensions (contain package.json or have publisher.name format)
    return entries.filter((entry) => {
      if (!entry.isDirectory()) return false;
      // Skip hidden directories and common non-extension directories
      if (entry.name.startsWith('.')) return false;
      if (entry.name === 'node_modules') return false;
      return true;
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Detect all installed IDE extension paths
 */
export function detectIDEPaths(): DetectedIDE[] {
  const detected: DetectedIDE[] = [];

  for (const [ideName, paths] of Object.entries(IDE_PATHS)) {
    for (const idePath of paths) {
      const expandedPath = expandPath(idePath);
      if (fs.existsSync(expandedPath)) {
        const extensionCount = countExtensions(expandedPath);
        // Only add if there are actually extensions (or the directory exists)
        if (extensionCount > 0) {
          detected.push({
            name: ideName,
            path: expandedPath,
            extensionCount,
          });
          break; // Found this IDE, move to next
        }
      }
    }
  }

  return detected;
}

/**
 * Get list of all supported IDE names
 */
export function getSupportedIDEs(): string[] {
  return Object.keys(IDE_PATHS);
}

/**
 * Check if a specific IDE is installed
 */
export function isIDEInstalled(ideName: string): boolean {
  const paths = IDE_PATHS[ideName];
  if (!paths) return false;

  return paths.some((p) => {
    const expanded = expandPath(p);
    return fs.existsSync(expanded) && countExtensions(expanded) > 0;
  });
}

/**
 * Get the extension path for a specific IDE
 */
export function getIDEExtensionPath(ideName: string): string | null {
  const paths = IDE_PATHS[ideName];
  if (!paths) return null;

  for (const p of paths) {
    const expanded = expandPath(p);
    if (fs.existsSync(expanded)) {
      return expanded;
    }
  }

  return null;
}
