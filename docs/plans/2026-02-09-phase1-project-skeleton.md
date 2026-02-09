# Extension Guard Phase 1: Project Skeleton Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the monorepo skeleton with core scanning infrastructure and basic CLI.

**Architecture:** pnpm monorepo with packages/core (scanning engine) and packages/cli (command-line interface). Core exports ExtensionGuardScanner class that reads extension directories and collects file contents. CLI wraps core with commander.js.

**Tech Stack:** TypeScript (strict), Node.js 18+, ESM, pnpm workspaces, vitest, tsup, commander, chalk, ora

---

## Task 1: Initialize pnpm Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: Create root package.json**

```json
{
  "name": "extension-guard-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

**Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
*.log
coverage/
.env
.env.*
!.env.example
```

**Step 5: Create .npmrc**

```
auto-install-peers=true
strict-peer-dependencies=false
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize pnpm monorepo structure"
```

---

## Task 2: Create @aspect-guard/core Package Skeleton

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/src/index.ts`

**Step 1: Create packages/core directory structure**

```bash
mkdir -p packages/core/src
```

**Step 2: Create packages/core/package.json**

```json
{
  "name": "@aspect-guard/core",
  "version": "0.1.0",
  "description": "Core scanning engine for Extension Guard",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "data"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {},
  "devDependencies": {
    "tsup": "^8.0.0",
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

**Step 3: Create packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 4: Create packages/core/tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
});
```

**Step 5: Create packages/core/src/index.ts (placeholder)**

```typescript
// Extension Guard Core - Scanning Engine
// @aspect-guard/core

export const VERSION = '0.1.0';

// Types will be exported here
export * from './types/index.js';

// Scanner will be exported here
// export { ExtensionGuardScanner } from './scanner/scanner.js';
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(core): create @aspect-guard/core package skeleton"
```

---

## Task 3: Define Core Types

**Files:**
- Create: `packages/core/src/types/index.ts`
- Create: `packages/core/src/types/severity.ts`
- Create: `packages/core/src/types/extension.ts`
- Create: `packages/core/src/types/finding.ts`
- Create: `packages/core/src/types/scan-result.ts`
- Create: `packages/core/src/types/config.ts`

**Step 1: Create types directory**

```bash
mkdir -p packages/core/src/types
```

**Step 2: Create packages/core/src/types/severity.ts**

```typescript
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

export function isAtLeastSeverity(
  severity: Severity,
  minimum: Severity
): boolean {
  return SEVERITY_ORDER[severity] <= SEVERITY_ORDER[minimum];
}
```

**Step 3: Create packages/core/src/types/extension.ts**

```typescript
export interface ExtensionInfo {
  id: string;
  displayName: string;
  version: string;
  publisher: {
    name: string;
    verified: boolean;
  };
  description: string;
  categories: string[];
  activationEvents: string[];
  extensionDependencies: string[];
  installPath: string;
  engines: { vscode: string };
  repository?: string;
  license?: string;
  fileCount: number;
  totalSize: number;
}

export interface ExtensionManifest {
  name: string;
  publisher: string;
  version: string;
  displayName?: string;
  description?: string;
  categories?: string[];
  activationEvents?: string[];
  contributes?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  main?: string;
  browser?: string;
  engines?: { vscode?: string };
  repository?: string | { url: string };
  license?: string;
  [key: string]: unknown;
}
```

**Step 4: Create packages/core/src/types/finding.ts**

```typescript
import type { Severity } from './severity.js';

export type FindingCategory =
  | 'data-exfiltration'
  | 'remote-code-execution'
  | 'credential-theft'
  | 'keylogger'
  | 'code-obfuscation'
  | 'suspicious-network'
  | 'excessive-permission'
  | 'known-malicious'
  | 'hardcoded-secret'
  | 'vulnerable-dependency'
  | 'persistence'
  | 'supply-chain'
  | 'crypto-mining';

export interface Evidence {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
  lineContent?: string;
  contextBefore?: string[];
  contextAfter?: string[];
  matchedPattern?: string;
  snippet?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence: Evidence;
  mitreAttackId?: string;
  remediation?: string;
}
```

**Step 5: Create packages/core/src/types/scan-result.ts**

```typescript
import type { Severity, RiskLevel } from './severity.js';
import type { ExtensionInfo } from './extension.js';
import type { Finding, FindingCategory } from './finding.js';

export interface ScanResult {
  extensionId: string;
  displayName: string;
  version: string;
  trustScore: number;
  riskLevel: RiskLevel;
  findings: Finding[];
  metadata: ExtensionInfo;
  analyzedFiles: number;
  scanDurationMs: number;
}

export interface ScanSummary {
  byRiskLevel: Record<RiskLevel, number>;
  bySeverity: Record<Severity, number>;
  byCategory: Partial<Record<FindingCategory, number>>;
  topFindings: Finding[];
  overallHealthScore: number;
}

export interface DetectedIDE {
  name: string;
  path: string;
  extensionCount: number;
}

export interface FullScanReport {
  scanId: string;
  version: string;
  timestamp: string;
  environment: {
    os: string;
    ides: DetectedIDE[];
  };
  totalExtensions: number;
  uniqueExtensions: number;
  results: ScanResult[];
  summary: ScanSummary;
  scanDurationMs: number;
}

export interface PolicyViolation {
  extensionId: string;
  rule: string;
  message: string;
  action: 'block' | 'warn' | 'info';
}

export interface AuditReport extends FullScanReport {
  policyPath: string;
  policyViolations: PolicyViolation[];
  auditPassed: boolean;
}
```

**Step 6: Create packages/core/src/types/config.ts**

```typescript
import type { Severity } from './severity.js';

export interface ScanOptions {
  idePaths?: string[];
  autoDetect?: boolean;
  severity?: Severity;
  rules?: string[];
  skipRules?: string[];
  concurrency?: number;
  timeout?: number;
}

export interface InspectOptions {
  vsixPath: string;
  severity?: Severity;
  rules?: string[];
}
```

**Step 7: Create packages/core/src/types/index.ts**

```typescript
export * from './severity.js';
export * from './extension.js';
export * from './finding.js';
export * from './scan-result.js';
export * from './config.js';
```

**Step 8: Run typecheck to verify**

```bash
cd packages/core && pnpm typecheck
```

Expected: No errors

**Step 9: Commit**

```bash
git add -A
git commit -m "feat(core): define core types (severity, extension, finding, scan-result)"
```

---

## Task 4: Implement IDE Path Detection

**Files:**
- Create: `packages/core/src/scanner/ide-detector.ts`
- Create: `packages/core/test/scanner/ide-detector.test.ts`

**Step 1: Create scanner directory**

```bash
mkdir -p packages/core/src/scanner
mkdir -p packages/core/test/scanner
```

**Step 2: Write the failing test (packages/core/test/scanner/ide-detector.test.ts)**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectIDEPaths, IDE_PATHS, expandPath } from '../../src/scanner/ide-detector.js';
import * as fs from 'node:fs';
import * as os from 'node:os';

vi.mock('node:fs');
vi.mock('node:os');

describe('ide-detector', () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
    vi.mocked(os.platform).mockReturnValue('linux');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      expect(expandPath('~/.vscode/extensions')).toBe('/home/testuser/.vscode/extensions');
    });

    it('should not modify absolute paths without ~', () => {
      expect(expandPath('/usr/local/bin')).toBe('/usr/local/bin');
    });
  });

  describe('detectIDEPaths', () => {
    it('should return empty array when no IDE paths exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = detectIDEPaths();
      expect(result).toEqual([]);
    });

    it('should detect VS Code extensions path when it exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === '/home/testuser/.vscode/extensions';
      });
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'ext1', isDirectory: () => true },
        { name: 'ext2', isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      const result = detectIDEPaths();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'VS Code',
        path: '/home/testuser/.vscode/extensions',
        extensionCount: 2,
      });
    });

    it('should detect multiple IDEs', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return (
          path === '/home/testuser/.vscode/extensions' ||
          path === '/home/testuser/.cursor/extensions'
        );
      });
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'ext1', isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      const result = detectIDEPaths();
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toContain('VS Code');
      expect(result.map((r) => r.name)).toContain('Cursor');
    });
  });

  describe('IDE_PATHS', () => {
    it('should include all supported IDEs', () => {
      const expectedIDEs = ['VS Code', 'VS Code Insiders', 'Cursor', 'Windsurf', 'Trae', 'VSCodium'];
      for (const ide of expectedIDEs) {
        expect(IDE_PATHS).toHaveProperty(ide);
      }
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- ide-detector
```

Expected: FAIL (module not found)

**Step 4: Implement packages/core/src/scanner/ide-detector.ts**

```typescript
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DetectedIDE } from '../types/index.js';

export const IDE_PATHS: Record<string, string[]> = {
  'VS Code': ['~/.vscode/extensions'],
  'VS Code Insiders': ['~/.vscode-insiders/extensions'],
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
```

**Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- ide-detector
```

Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(core): implement IDE path detection"
```

---

## Task 5: Implement Extension Reader

**Files:**
- Create: `packages/core/src/scanner/extension-reader.ts`
- Create: `packages/core/test/scanner/extension-reader.test.ts`
- Create: `packages/core/test/fixtures/extensions/benign-theme/package.json`

**Step 1: Create test fixture**

```bash
mkdir -p packages/core/test/fixtures/extensions/benign-theme
```

**Step 2: Create fixture packages/core/test/fixtures/extensions/benign-theme/package.json**

```json
{
  "name": "benign-theme",
  "displayName": "Benign Theme",
  "description": "A simple color theme",
  "version": "1.0.0",
  "publisher": "test-publisher",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Themes"],
  "contributes": {
    "themes": [
      {
        "label": "Benign Theme",
        "uiTheme": "vs-dark",
        "path": "./themes/benign-color-theme.json"
      }
    ]
  }
}
```

**Step 3: Write the failing test (packages/core/test/scanner/extension-reader.test.ts)**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { readExtension, readExtensionsFromDirectory } from '../../src/scanner/extension-reader.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/extensions');

describe('extension-reader', () => {
  describe('readExtension', () => {
    it('should read extension info from a valid extension directory', async () => {
      const extPath = path.join(fixturesPath, 'benign-theme');
      const result = await readExtension(extPath);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-publisher.benign-theme');
      expect(result?.displayName).toBe('Benign Theme');
      expect(result?.version).toBe('1.0.0');
      expect(result?.publisher.name).toBe('test-publisher');
      expect(result?.categories).toContain('Themes');
    });

    it('should return null for non-existent directory', async () => {
      const result = await readExtension('/non/existent/path');
      expect(result).toBeNull();
    });

    it('should return null for directory without package.json', async () => {
      const result = await readExtension(fixturesPath);
      expect(result).toBeNull();
    });
  });

  describe('readExtensionsFromDirectory', () => {
    it('should read all extensions from a directory', async () => {
      const results = await readExtensionsFromDirectory(fixturesPath);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.id === 'test-publisher.benign-theme')).toBe(true);
    });

    it('should return empty array for non-existent directory', async () => {
      const results = await readExtensionsFromDirectory('/non/existent/path');
      expect(results).toEqual([]);
    });
  });
});
```

**Step 4: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- extension-reader
```

Expected: FAIL (module not found)

**Step 5: Implement packages/core/src/scanner/extension-reader.ts**

```typescript
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
```

**Step 6: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- extension-reader
```

Expected: PASS

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(core): implement extension reader"
```

---

## Task 6: Implement File Collector

**Files:**
- Create: `packages/core/src/scanner/file-collector.ts`
- Create: `packages/core/test/scanner/file-collector.test.ts`
- Create: `packages/core/test/fixtures/extensions/benign-theme/src/extension.js`

**Step 1: Create fixture file**

```bash
mkdir -p packages/core/test/fixtures/extensions/benign-theme/src
```

**Step 2: Create packages/core/test/fixtures/extensions/benign-theme/src/extension.js**

```javascript
const vscode = require('vscode');

function activate(context) {
  console.log('Benign theme activated');
}

function deactivate() {}

module.exports = { activate, deactivate };
```

**Step 3: Write the failing test (packages/core/test/scanner/file-collector.test.ts)**

```typescript
import { describe, it, expect } from 'vitest';
import { collectFiles, shouldCollectFile } from '../../src/scanner/file-collector.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/extensions');

describe('file-collector', () => {
  describe('shouldCollectFile', () => {
    it('should collect .js files', () => {
      expect(shouldCollectFile('src/extension.js')).toBe(true);
    });

    it('should collect .ts files', () => {
      expect(shouldCollectFile('src/main.ts')).toBe(true);
    });

    it('should collect .json files', () => {
      expect(shouldCollectFile('package.json')).toBe(true);
    });

    it('should not collect .png files', () => {
      expect(shouldCollectFile('images/icon.png')).toBe(false);
    });

    it('should not collect files in node_modules', () => {
      expect(shouldCollectFile('node_modules/lodash/index.js')).toBe(false);
    });

    it('should not collect .map files', () => {
      expect(shouldCollectFile('dist/extension.js.map')).toBe(false);
    });
  });

  describe('collectFiles', () => {
    it('should collect all relevant files from extension directory', async () => {
      const extPath = path.join(fixturesPath, 'benign-theme');
      const files = await collectFiles(extPath);

      expect(files.size).toBeGreaterThanOrEqual(2);
      expect(files.has('package.json')).toBe(true);
      expect(files.has('src/extension.js')).toBe(true);
    });

    it('should return empty map for non-existent directory', async () => {
      const files = await collectFiles('/non/existent/path');
      expect(files.size).toBe(0);
    });

    it('should contain file contents', async () => {
      const extPath = path.join(fixturesPath, 'benign-theme');
      const files = await collectFiles(extPath);

      const packageJson = files.get('package.json');
      expect(packageJson).toBeDefined();
      expect(packageJson).toContain('benign-theme');
    });
  });
});
```

**Step 4: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- file-collector
```

Expected: FAIL (module not found)

**Step 5: Implement packages/core/src/scanner/file-collector.ts**

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const COLLECTED_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
]);

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
]);

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

export async function collectFiles(
  extensionPath: string
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  async function walk(currentPath: string, relativePath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = relativePath
          ? path.join(relativePath, entry.name)
          : entry.name;

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
```

**Step 6: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- file-collector
```

Expected: PASS

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(core): implement file collector"
```

---

## Task 7: Implement Basic Scanner Class

**Files:**
- Create: `packages/core/src/scanner/scanner.ts`
- Create: `packages/core/test/scanner/scanner.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the failing test (packages/core/test/scanner/scanner.test.ts)**

```typescript
import { describe, it, expect } from 'vitest';
import { ExtensionGuardScanner } from '../../src/scanner/scanner.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/extensions');

describe('ExtensionGuardScanner', () => {
  it('should create scanner with default options', () => {
    const scanner = new ExtensionGuardScanner();
    expect(scanner).toBeDefined();
  });

  it('should create scanner with custom options', () => {
    const scanner = new ExtensionGuardScanner({
      autoDetect: false,
      idePaths: [fixturesPath],
    });
    expect(scanner).toBeDefined();
  });

  describe('scan', () => {
    it('should scan extensions from specified path', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesPath],
      });

      const report = await scanner.scan();

      expect(report).toBeDefined();
      expect(report.totalExtensions).toBeGreaterThanOrEqual(1);
      expect(report.results).toBeInstanceOf(Array);
      expect(report.timestamp).toBeDefined();
      expect(report.scanId).toBeDefined();
    });

    it('should include extension results', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesPath],
      });

      const report = await scanner.scan();
      const benignTheme = report.results.find(
        (r) => r.extensionId === 'test-publisher.benign-theme'
      );

      expect(benignTheme).toBeDefined();
      expect(benignTheme?.displayName).toBe('Benign Theme');
      expect(benignTheme?.trustScore).toBeGreaterThanOrEqual(0);
      expect(benignTheme?.trustScore).toBeLessThanOrEqual(100);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- scanner.test
```

Expected: FAIL (module not found)

**Step 3: Implement packages/core/src/scanner/scanner.ts**

```typescript
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import type {
  ScanOptions,
  FullScanReport,
  ScanResult,
  ScanSummary,
  RiskLevel,
  Severity,
  FindingCategory,
  DetectedIDE,
} from '../types/index.js';
import { detectIDEPaths } from './ide-detector.js';
import { readExtensionsFromDirectory } from './extension-reader.js';
import { collectFiles } from './file-collector.js';
import { VERSION } from '../index.js';

const DEFAULT_OPTIONS: Required<ScanOptions> = {
  idePaths: [],
  autoDetect: true,
  severity: 'info',
  rules: [],
  skipRules: [],
  concurrency: 4,
  timeout: 30000,
};

export class ExtensionGuardScanner {
  private options: Required<ScanOptions>;

  constructor(options?: Partial<ScanOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async scan(options?: Partial<ScanOptions>): Promise<FullScanReport> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    // Detect IDE paths
    let ides: DetectedIDE[];
    if (mergedOptions.autoDetect && mergedOptions.idePaths.length === 0) {
      ides = detectIDEPaths();
    } else {
      ides = mergedOptions.idePaths.map((p) => ({
        name: 'Custom',
        path: p,
        extensionCount: 0,
      }));
    }

    // Collect all extensions
    const allExtensions = await Promise.all(
      ides.map((ide) => readExtensionsFromDirectory(ide.path))
    );

    const extensionMap = new Map<string, { ide: DetectedIDE; ext: Awaited<ReturnType<typeof readExtensionsFromDirectory>>[number] }>();
    for (let i = 0; i < ides.length; i++) {
      const ide = ides[i]!;
      for (const ext of allExtensions[i]!) {
        if (!extensionMap.has(ext.id)) {
          extensionMap.set(ext.id, { ide, ext });
        }
      }
      // Update extension count
      ide.extensionCount = allExtensions[i]!.length;
    }

    // Scan each extension
    const results: ScanResult[] = [];
    for (const { ext } of extensionMap.values()) {
      const result = await this.scanExtension(ext);
      results.push(result);
    }

    // Calculate summary
    const summary = this.calculateSummary(results);

    return {
      scanId: randomUUID(),
      version: VERSION,
      timestamp: new Date().toISOString(),
      environment: {
        os: `${os.platform()} ${os.release()}`,
        ides,
      },
      totalExtensions: Array.from(allExtensions).reduce((sum, arr) => sum + arr.length, 0),
      uniqueExtensions: extensionMap.size,
      results,
      summary,
      scanDurationMs: Date.now() - startTime,
    };
  }

  private async scanExtension(
    ext: Awaited<ReturnType<typeof readExtensionsFromDirectory>>[number]
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const files = await collectFiles(ext.installPath);

    // TODO: Run analyzers here
    // For now, return a basic result with no findings

    return {
      extensionId: ext.id,
      displayName: ext.displayName,
      version: ext.version,
      trustScore: 100, // Will be calculated by scorer
      riskLevel: 'safe',
      findings: [],
      metadata: ext,
      analyzedFiles: files.size,
      scanDurationMs: Date.now() - startTime,
    };
  }

  private calculateSummary(results: ScanResult[]): ScanSummary {
    const byRiskLevel: Record<RiskLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      safe: 0,
    };

    const bySeverity: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byCategory: Partial<Record<FindingCategory, number>> = {};

    for (const result of results) {
      byRiskLevel[result.riskLevel]++;

      for (const finding of result.findings) {
        bySeverity[finding.severity]++;
        byCategory[finding.category] = (byCategory[finding.category] ?? 0) + 1;
      }
    }

    // Collect top findings (sorted by severity)
    const allFindings = results.flatMap((r) => r.findings);
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };
    const topFindings = allFindings
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 10);

    // Calculate overall health score
    const totalExtensions = results.length;
    const safeCount = byRiskLevel.safe + byRiskLevel.low;
    const overallHealthScore = totalExtensions > 0
      ? Math.round((safeCount / totalExtensions) * 100)
      : 100;

    return {
      byRiskLevel,
      bySeverity,
      byCategory,
      topFindings,
      overallHealthScore,
    };
  }
}
```

**Step 4: Update packages/core/src/index.ts**

```typescript
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
```

**Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- scanner.test
```

Expected: PASS

**Step 6: Run all core tests**

```bash
cd packages/core && pnpm test
```

Expected: All tests pass

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(core): implement basic ExtensionGuardScanner"
```

---

## Task 8: Create CLI Package Skeleton

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/cli.ts`

**Step 1: Create packages/cli directory**

```bash
mkdir -p packages/cli/src
```

**Step 2: Create packages/cli/package.json**

```json
{
  "name": "extension-guard",
  "version": "0.1.0",
  "description": "CLI for scanning VSCode extensions for security issues",
  "type": "module",
  "bin": {
    "extension-guard": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@aspect-guard/core": "workspace:*",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

**Step 3: Create packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create packages/cli/tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

**Step 5: Create packages/cli/src/cli.ts**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ExtensionGuardScanner, VERSION } from '@aspect-guard/core';

export function createCli(): Command {
  const program = new Command();

  program
    .name('extension-guard')
    .description('Scan VSCode extensions for security issues')
    .version(VERSION);

  program
    .command('scan')
    .description('Scan installed VSCode extensions')
    .option('-p, --path <paths...>', 'Custom extension paths to scan')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .option('-s, --severity <level>', 'Minimum severity to show', 'info')
    .option('-q, --quiet', 'Only show results, no progress')
    .action(async (options) => {
      const spinner = options.quiet ? null : ora('Scanning extensions...').start();

      try {
        const scanner = new ExtensionGuardScanner({
          autoDetect: !options.path,
          idePaths: options.path ?? [],
          severity: options.severity,
        });

        const report = await scanner.scan();

        if (spinner) {
          spinner.succeed('Scan complete');
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(report, null, 2));
        } else {
          printTableReport(report);
        }

        // Exit with error code if critical or high issues found
        const hasCritical = report.summary.bySeverity.critical > 0;
        const hasHigh = report.summary.bySeverity.high > 0;
        if (hasCritical || hasHigh) {
          process.exit(1);
        }
      } catch (error) {
        if (spinner) {
          spinner.fail('Scan failed');
        }
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(3);
      }
    });

  return program;
}

function printTableReport(report: Awaited<ReturnType<typeof ExtensionGuardScanner.prototype.scan>>): void {
  console.log();
  console.log(chalk.bold(`🛡️  Extension Guard v${VERSION}`));
  console.log();

  for (const ide of report.environment.ides) {
    console.log(`📁 ${chalk.cyan(ide.name)}: ${ide.path} (${ide.extensionCount} extensions)`);
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  // Group by risk level
  const critical = report.results.filter((r) => r.riskLevel === 'critical');
  const high = report.results.filter((r) => r.riskLevel === 'high');
  const medium = report.results.filter((r) => r.riskLevel === 'medium');
  const safe = report.results.filter((r) => r.riskLevel === 'safe' || r.riskLevel === 'low');

  if (critical.length > 0) {
    console.log(chalk.red.bold(`⛔ CRITICAL (${critical.length})`));
    for (const ext of critical) {
      printExtensionResult(ext);
    }
  }

  if (high.length > 0) {
    console.log(chalk.red(`🔴 HIGH (${high.length})`));
    for (const ext of high) {
      printExtensionResult(ext);
    }
  }

  if (medium.length > 0) {
    console.log(chalk.yellow(`🟡 MEDIUM (${medium.length})`));
    for (const ext of medium.slice(0, 3)) {
      console.log(`   ${ext.extensionId}`);
    }
    if (medium.length > 3) {
      console.log(chalk.dim(`   ... and ${medium.length - 3} more`));
    }
  }

  if (safe.length > 0) {
    console.log(chalk.green(`🟢 SAFE (${safe.length})`));
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  const { bySeverity, byRiskLevel } = report.summary;
  console.log(
    `📊 Summary: ${report.uniqueExtensions} scanned · ` +
    `${bySeverity.critical} critical · ${bySeverity.high} high · ` +
    `${bySeverity.medium} medium · ${byRiskLevel.safe} safe`
  );
  console.log(`⏱️  Completed in ${(report.scanDurationMs / 1000).toFixed(1)}s`);
  console.log();
}

function printExtensionResult(result: Awaited<ReturnType<typeof ExtensionGuardScanner.prototype.scan>>['results'][0]): void {
  console.log(`   ${chalk.bold(result.extensionId)} v${result.version}`);
  console.log(`   Publisher: ${result.metadata.publisher.name}`);
  console.log(`   Trust Score: ${result.trustScore}/100`);

  if (result.findings.length > 0) {
    for (const finding of result.findings.slice(0, 3)) {
      const icon = finding.severity === 'critical' ? 'CRIT' : finding.severity.toUpperCase();
      console.log(`   │ ${icon}  ${finding.title}`);
      if (finding.evidence.filePath) {
        console.log(`   │       at ${finding.evidence.filePath}:${finding.evidence.lineNumber ?? '?'}`);
      }
    }
    if (result.findings.length > 3) {
      console.log(chalk.dim(`   │ ... and ${result.findings.length - 3} more findings`));
    }
  }
  console.log();
}
```

**Step 6: Create packages/cli/src/index.ts**

```typescript
import { createCli } from './cli.js';

const cli = createCli();
cli.parse();
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(cli): create extension-guard CLI package"
```

---

## Task 9: Install Dependencies and Build

**Step 1: Install all dependencies**

```bash
cd /home/ubuntu/extension-guard && pnpm install
```

**Step 2: Build all packages**

```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Run tests**

```bash
pnpm test
```

Expected: All tests pass

**Step 4: Test CLI manually**

```bash
node packages/cli/dist/index.js scan --help
```

Expected: Shows help output

```bash
node packages/cli/dist/index.js scan --path packages/core/test/fixtures/extensions
```

Expected: Scans the fixture extensions and shows output

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify build and tests pass"
```

---

## Task 10: Add vitest Configuration

**Files:**
- Create: `vitest.config.ts` (root)
- Create: `packages/core/vitest.config.ts`

**Step 1: Create root vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Step 2: Create packages/core/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**/*.ts'],
    },
  },
});
```

**Step 3: Update root package.json devDependencies**

Add to root package.json:
```json
{
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: add vitest configuration"
```

---

## Summary

After completing all tasks, you will have:

1. **pnpm monorepo** with proper workspace configuration
2. **@aspect-guard/core package** with:
   - Core types (Severity, Extension, Finding, ScanResult)
   - IDE path detection
   - Extension reader
   - File collector
   - Basic ExtensionGuardScanner class
   - Unit tests with fixtures
3. **extension-guard CLI** with:
   - `scan` command
   - Table and JSON output formats
   - Progress spinner

This completes Phase 1. The scanner currently returns all extensions as "safe" with a trust score of 100 because we haven't implemented the analyzers yet (Phase 2).
