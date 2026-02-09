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
    ruleRegistry.clear();
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

    expect(ruleIds).toContain('TEST-001');
    expect(ruleIds).not.toContain('TEST-002');
  });

  it('should filter by specific rules when provided', () => {
    const anotherRule: DetectionRule = {
      ...mockRule,
      id: 'TEST-003',
    };
    ruleRegistry.register(anotherRule);

    const engine = new RuleEngine({ rules: ['TEST-003'] });
    const files = new Map([['test.js', 'malicious']]);

    const findings = engine.run(files, mockManifest);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('TEST-003');
  });

  it('should skip rules in skipRules list', () => {
    const engine = new RuleEngine({ skipRules: ['TEST-001'] });
    const files = new Map([['test.js', 'malicious']]);

    const findings = engine.run(files, mockManifest);

    expect(findings).toHaveLength(0);
  });
});
