# Extension Guard Phase 3: Reporters & Policy Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement multiple output formats (SARIF, JSON, Markdown) and the Policy Engine for CI/CD integration.

**Architecture:** Reporter interface with multiple implementations. Policy Engine loads .extension-guard.json and evaluates extensions against rules.

**Tech Stack:** TypeScript, SARIF 2.1.0 spec, JSON Schema validation

---

## Task 1: Create Reporter Interface and JSON Reporter

**Files:**
- Create: `packages/core/src/reporter/reporter.interface.ts`
- Create: `packages/core/src/reporter/json-reporter.ts`
- Create: `packages/core/src/reporter/index.ts`
- Create: `packages/core/test/reporter/json-reporter.test.ts`

**Implementation:**

```typescript
// reporter.interface.ts
import type { FullScanReport } from '../types/index.js';

export interface ReporterOptions {
  includeEvidence?: boolean;
  includeSafe?: boolean;
  minSeverity?: string;
}

export interface Reporter {
  readonly format: string;
  generate(report: FullScanReport, options?: ReporterOptions): string;
}
```

```typescript
// json-reporter.ts
export class JsonReporter implements Reporter {
  readonly format = 'json';

  generate(report: FullScanReport, options?: ReporterOptions): string {
    const filtered = this.filterReport(report, options);
    return JSON.stringify(filtered, null, 2);
  }
}
```

---

## Task 2: Implement SARIF Reporter

**Files:**
- Create: `packages/core/src/reporter/sarif-reporter.ts`
- Create: `packages/core/test/reporter/sarif-reporter.test.ts`

SARIF 2.1.0 format for GitHub Code Scanning integration.

```typescript
// sarif-reporter.ts
export class SarifReporter implements Reporter {
  readonly format = 'sarif';

  generate(report: FullScanReport): string {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: 'Extension Guard',
            version: report.version,
            informationUri: 'https://github.com/aspect-guard/extension-guard',
            rules: this.extractRules(report),
          }
        },
        results: this.extractResults(report),
      }]
    };
    return JSON.stringify(sarif, null, 2);
  }
}
```

---

## Task 3: Implement Markdown Reporter

**Files:**
- Create: `packages/core/src/reporter/markdown-reporter.ts`
- Create: `packages/core/test/reporter/markdown-reporter.test.ts`

```typescript
// markdown-reporter.ts
export class MarkdownReporter implements Reporter {
  readonly format = 'markdown';

  generate(report: FullScanReport): string {
    let md = `# Extension Guard Scan Report\n\n`;
    md += `**Date:** ${report.timestamp}\n`;
    md += `**Extensions Scanned:** ${report.uniqueExtensions}\n\n`;
    // ... generate tables and findings
    return md;
  }
}
```

---

## Task 4: Update CLI with Reporter Support

**Files:**
- Modify: `packages/cli/src/cli.ts`

Add `--output` flag and support for json, sarif, markdown formats.

---

## Task 5: Create Policy Schema and Types

**Files:**
- Create: `packages/core/src/policy/policy.types.ts`
- Create: `schemas/policy.v1.json`

```typescript
// policy.types.ts
export interface PolicyConfig {
  version: string;
  scanning?: {
    minSeverity?: Severity;
    skipRules?: string[];
    timeout?: number;
  };
  policy?: {
    allowlist?: string[];
    blocklist?: string[];
    rules?: PolicyRules;
  };
}

export interface PolicyRules {
  minTrustScore?: { threshold: number; action: PolicyAction };
  requireVerifiedPublisher?: { enabled: boolean; action: PolicyAction; exceptions?: string[] };
  maxDaysSinceUpdate?: { days: number; action: PolicyAction };
  blockObfuscated?: { enabled: boolean; action: PolicyAction };
}

export type PolicyAction = 'block' | 'warn' | 'info';
```

---

## Task 6: Implement Policy Engine

**Files:**
- Create: `packages/core/src/policy/policy-engine.ts`
- Create: `packages/core/src/policy/policy-loader.ts`
- Create: `packages/core/test/policy/policy-engine.test.ts`

```typescript
// policy-engine.ts
export class PolicyEngine {
  constructor(private config: PolicyConfig) {}

  evaluate(results: ScanResult[]): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const result of results) {
      // Check allowlist/blocklist
      // Check trust score threshold
      // Check other policy rules
    }

    return violations;
  }
}
```

---

## Task 7: Add CLI Audit Command

**Files:**
- Modify: `packages/cli/src/cli.ts`

Add `audit` command that:
1. Loads .extension-guard.json
2. Runs scan
3. Evaluates policy
4. Returns exit code based on violations

```bash
extension-guard audit --config .extension-guard.json --fail-on high
```

---

## Task 8: Add More Detection Rules

**Files:**
- Create: `packages/core/src/rules/built-in/high-hardcoded-secret.ts`
- Create: `packages/core/src/rules/built-in/low-unverified-publisher.ts`

Implement:
- EG-HIGH-006: Hardcoded secrets (API keys, tokens, passwords)
- EG-LOW-002: Unverified publisher

---

## Summary

After Phase 3:
- Multiple output formats: JSON, SARIF, Markdown
- Policy Engine for CI/CD
- `audit` command with exit codes
- 8 total detection rules
