import type { ExtensionManifest, Finding, Severity } from '../types/index.js';
import { SEVERITY_ORDER } from '../types/index.js';
import type { DetectionRule, Evidence } from './rule.interface.js';
import { ruleRegistry } from './rule-registry.js';
import { randomUUID } from 'node:crypto';

export interface RuleEngineOptions {
  rules?: string[];
  skipRules?: string[];
  minSeverity?: Severity;
}

export class RuleEngine {
  private options: RuleEngineOptions;

  constructor(options: RuleEngineOptions = {}) {
    this.options = options;
  }

  run(files: Map<string, string>, manifest: ExtensionManifest): Finding[] {
    const findings: Finding[] = [];
    const rules = this.getApplicableRules();

    for (const rule of rules) {
      try {
        const evidences = rule.detect(files, manifest);
        for (const evidence of evidences) {
          findings.push(this.createFinding(rule, evidence));
        }
      } catch {
        // Rule failed, continue with other rules
      }
    }

    return findings;
  }

  private getApplicableRules(): DetectionRule[] {
    let rules = ruleRegistry.getEnabled();

    if (this.options.rules && this.options.rules.length > 0) {
      rules = rules.filter((r) => this.options.rules!.includes(r.id));
    }

    if (this.options.skipRules && this.options.skipRules.length > 0) {
      rules = rules.filter((r) => !this.options.skipRules!.includes(r.id));
    }

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
