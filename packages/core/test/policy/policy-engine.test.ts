import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolicyEngine } from '../../src/policy/policy-engine.js';
import { loadPolicyConfig } from '../../src/policy/policy-loader.js';
import type { PolicyConfig, PolicyViolation } from '../../src/policy/index.js';
import type { ScanResult } from '../../src/types/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Helper to create mock scan results
function createMockScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    extensionId: 'test.extension',
    displayName: 'Test Extension',
    version: '1.0.0',
    trustScore: 80,
    riskLevel: 'low',
    findings: [],
    metadata: {
      id: 'test.extension',
      displayName: 'Test Extension',
      version: '1.0.0',
      publisher: { name: 'test', verified: true },
      description: 'A test extension',
      categories: [],
      activationEvents: [],
      extensionDependencies: [],
      installPath: '/test/path',
      engines: { vscode: '^1.80.0' },
      fileCount: 10,
      totalSize: 50000,
    },
    analyzedFiles: 10,
    scanDurationMs: 100,
    ...overrides,
  };
}

describe('PolicyEngine', () => {
  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const config: PolicyConfig = { version: '1' };
      const engine = new PolicyEngine(config);
      expect(engine).toBeInstanceOf(PolicyEngine);
    });
  });

  describe('evaluate', () => {
    describe('blocklist', () => {
      it('should flag blocklisted extensions with block action', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            blocklist: ['malicious.ext'],
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'malicious.ext' })];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(1);
        expect(violations[0]).toEqual({
          extensionId: 'malicious.ext',
          rule: 'blocklist',
          message: 'Extension is blocklisted',
          action: 'block',
        });
      });

      it('should not check other rules for blocklisted extensions', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            blocklist: ['test.ext'],
            rules: {
              minTrustScore: { threshold: 90, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'test.ext', trustScore: 50 })];

        const violations = engine.evaluate(results);

        // Should only have blocklist violation, not minTrustScore
        expect(violations).toHaveLength(1);
        expect(violations[0].rule).toBe('blocklist');
      });
    });

    describe('allowlist', () => {
      it('should skip all checks for allowlisted extensions', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            allowlist: ['trusted.ext'],
            rules: {
              minTrustScore: { threshold: 90, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'trusted.ext', trustScore: 20 })];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });

      it('should still check non-allowlisted extensions', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            allowlist: ['trusted.ext'],
            rules: {
              minTrustScore: { threshold: 90, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({ extensionId: 'trusted.ext', trustScore: 20 }),
          createMockScanResult({ extensionId: 'other.ext', trustScore: 50 }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(1);
        expect(violations[0].extensionId).toBe('other.ext');
      });
    });

    describe('minTrustScore', () => {
      it('should flag extensions below trust threshold', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              minTrustScore: { threshold: 70, action: 'warn' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'low.score', trustScore: 50 })];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(1);
        expect(violations[0]).toEqual({
          extensionId: 'low.score',
          rule: 'minTrustScore',
          message: 'Trust score 50 below threshold 70',
          action: 'warn',
        });
      });

      it('should not flag extensions at or above threshold', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              minTrustScore: { threshold: 70, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({ extensionId: 'exact.score', trustScore: 70 }),
          createMockScanResult({ extensionId: 'high.score', trustScore: 90 }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });
    });

    describe('blockObfuscated', () => {
      it('should flag extensions with obfuscated code when enabled', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              blockObfuscated: { enabled: true, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({
            extensionId: 'obfuscated.ext',
            findings: [
              {
                id: 'finding-1',
                ruleId: 'EG-HIGH-001',
                severity: 'high',
                category: 'code-obfuscation',
                title: 'Obfuscated Code',
                description: 'Code appears obfuscated',
                evidence: { filePath: 'dist/index.js' },
              },
            ],
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(1);
        expect(violations[0]).toEqual({
          extensionId: 'obfuscated.ext',
          rule: 'blockObfuscated',
          message: 'Extension contains obfuscated code',
          action: 'block',
        });
      });

      it('should not flag extensions without obfuscated code', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              blockObfuscated: { enabled: true, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'clean.ext', findings: [] })];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });

      it('should not check when disabled', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              blockObfuscated: { enabled: false, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({
            extensionId: 'obfuscated.ext',
            findings: [
              {
                id: 'finding-1',
                ruleId: 'EG-HIGH-001',
                severity: 'high',
                category: 'code-obfuscation',
                title: 'Obfuscated Code',
                description: 'Code appears obfuscated',
                evidence: { filePath: 'dist/index.js' },
              },
            ],
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });
    });

    describe('requireVerifiedPublisher', () => {
      it('should flag extensions with unverified publisher when enabled', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              requireVerifiedPublisher: { enabled: true, action: 'warn' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({
            extensionId: 'unverified.ext',
            metadata: {
              id: 'unverified.ext',
              displayName: 'Unverified Extension',
              version: '1.0.0',
              publisher: { name: 'unknown', verified: false },
              description: 'An unverified extension',
              categories: [],
              activationEvents: [],
              extensionDependencies: [],
              installPath: '/test/path',
              engines: { vscode: '^1.80.0' },
              fileCount: 10,
              totalSize: 50000,
            },
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(1);
        expect(violations[0]).toEqual({
          extensionId: 'unverified.ext',
          rule: 'requireVerifiedPublisher',
          message: 'Extension publisher is not verified',
          action: 'warn',
        });
      });

      it('should not flag verified publishers', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              requireVerifiedPublisher: { enabled: true, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'verified.ext' })]; // Default mock has verified: true

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });

      it('should respect exceptions list', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              requireVerifiedPublisher: {
                enabled: true,
                action: 'block',
                exceptions: ['internal.ext'],
              },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({
            extensionId: 'internal.ext',
            metadata: {
              id: 'internal.ext',
              displayName: 'Internal Extension',
              version: '1.0.0',
              publisher: { name: 'internal', verified: false },
              description: 'An internal extension',
              categories: [],
              activationEvents: [],
              extensionDependencies: [],
              installPath: '/test/path',
              engines: { vscode: '^1.80.0' },
              fileCount: 10,
              totalSize: 50000,
            },
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });

      it('should not check when disabled', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              requireVerifiedPublisher: { enabled: false, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({
            extensionId: 'unverified.ext',
            metadata: {
              id: 'unverified.ext',
              displayName: 'Unverified Extension',
              version: '1.0.0',
              publisher: { name: 'unknown', verified: false },
              description: 'An unverified extension',
              categories: [],
              activationEvents: [],
              extensionDependencies: [],
              installPath: '/test/path',
              engines: { vscode: '^1.80.0' },
              fileCount: 10,
              totalSize: 50000,
            },
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });
    });

    describe('maxDaysSinceUpdate', () => {
      it('should flag extensions not updated within threshold', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              maxDaysSinceUpdate: { days: 365, action: 'info' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        // Set lastUpdated to 400 days ago
        const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
        const results = [
          createMockScanResult({
            extensionId: 'stale.ext',
            metadata: {
              id: 'stale.ext',
              displayName: 'Stale Extension',
              version: '1.0.0',
              publisher: { name: 'test', verified: true },
              description: 'A stale extension',
              categories: [],
              activationEvents: [],
              extensionDependencies: [],
              installPath: '/test/path',
              engines: { vscode: '^1.80.0' },
              fileCount: 10,
              totalSize: 50000,
              lastUpdated: oldDate,
            } as any,
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(1);
        expect(violations[0].rule).toBe('maxDaysSinceUpdate');
        expect(violations[0].action).toBe('info');
        expect(violations[0].message).toMatch(/Extension not updated in \d+ days/);
      });

      it('should not flag recently updated extensions', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              maxDaysSinceUpdate: { days: 365, action: 'warn' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        // Set lastUpdated to 30 days ago
        const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const results = [
          createMockScanResult({
            extensionId: 'fresh.ext',
            metadata: {
              id: 'fresh.ext',
              displayName: 'Fresh Extension',
              version: '1.0.0',
              publisher: { name: 'test', verified: true },
              description: 'A fresh extension',
              categories: [],
              activationEvents: [],
              extensionDependencies: [],
              installPath: '/test/path',
              engines: { vscode: '^1.80.0' },
              fileCount: 10,
              totalSize: 50000,
              lastUpdated: recentDate,
            } as any,
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });

      it('should skip check if lastUpdated is not available', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              maxDaysSinceUpdate: { days: 365, action: 'warn' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult({ extensionId: 'no.date.ext' })];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });
    });

    describe('multiple rules', () => {
      it('should collect violations from multiple rules', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              minTrustScore: { threshold: 70, action: 'warn' },
              requireVerifiedPublisher: { enabled: true, action: 'info' },
            },
          },
        };
        const engine = new PolicyEngine(config);
        const results = [
          createMockScanResult({
            extensionId: 'problematic.ext',
            trustScore: 50,
            metadata: {
              id: 'problematic.ext',
              displayName: 'Problematic Extension',
              version: '1.0.0',
              publisher: { name: 'unknown', verified: false },
              description: 'A problematic extension',
              categories: [],
              activationEvents: [],
              extensionDependencies: [],
              installPath: '/test/path',
              engines: { vscode: '^1.80.0' },
              fileCount: 10,
              totalSize: 50000,
            },
          }),
        ];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(2);
        expect(violations.map(v => v.rule).sort()).toEqual(['minTrustScore', 'requireVerifiedPublisher']);
      });
    });

    describe('empty/no config', () => {
      it('should return no violations with minimal config', () => {
        const config: PolicyConfig = { version: '1' };
        const engine = new PolicyEngine(config);
        const results = [createMockScanResult()];

        const violations = engine.evaluate(results);

        expect(violations).toHaveLength(0);
      });

      it('should return no violations with empty results', () => {
        const config: PolicyConfig = {
          version: '1',
          policy: {
            rules: {
              minTrustScore: { threshold: 70, action: 'block' },
            },
          },
        };
        const engine = new PolicyEngine(config);

        const violations = engine.evaluate([]);

        expect(violations).toHaveLength(0);
      });
    });
  });

  describe('hasBlockingViolations', () => {
    it('should return true when there are block violations', () => {
      const config: PolicyConfig = {
        version: '1',
        policy: {
          blocklist: ['bad.ext'],
        },
      };
      const engine = new PolicyEngine(config);
      const results = [createMockScanResult({ extensionId: 'bad.ext' })];

      engine.evaluate(results);

      expect(engine.hasBlockingViolations()).toBe(true);
    });

    it('should return false when only warn/info violations exist', () => {
      const config: PolicyConfig = {
        version: '1',
        policy: {
          rules: {
            minTrustScore: { threshold: 70, action: 'warn' },
          },
        },
      };
      const engine = new PolicyEngine(config);
      const results = [createMockScanResult({ extensionId: 'low.ext', trustScore: 50 })];

      engine.evaluate(results);

      expect(engine.hasBlockingViolations()).toBe(false);
    });

    it('should return false when no violations exist', () => {
      const config: PolicyConfig = { version: '1' };
      const engine = new PolicyEngine(config);
      const results = [createMockScanResult()];

      engine.evaluate(results);

      expect(engine.hasBlockingViolations()).toBe(false);
    });
  });

  describe('getViolations', () => {
    it('should return all violations after evaluation', () => {
      const config: PolicyConfig = {
        version: '1',
        policy: {
          blocklist: ['bad.ext'],
          rules: {
            minTrustScore: { threshold: 70, action: 'warn' },
          },
        },
      };
      const engine = new PolicyEngine(config);
      const results = [
        createMockScanResult({ extensionId: 'bad.ext' }),
        createMockScanResult({ extensionId: 'low.ext', trustScore: 50 }),
      ];

      engine.evaluate(results);
      const violations = engine.getViolations();

      expect(violations).toHaveLength(2);
    });

    it('should return empty array before evaluation', () => {
      const config: PolicyConfig = { version: '1' };
      const engine = new PolicyEngine(config);

      expect(engine.getViolations()).toHaveLength(0);
    });
  });
});

describe('loadPolicyConfig', () => {
  const testDir = '/tmp/extension-guard-policy-test';

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should load valid policy config from specified path', async () => {
    const configPath = path.join(testDir, '.extension-guard.json');
    const config: PolicyConfig = {
      version: '1',
      policy: {
        blocklist: ['bad.ext'],
      },
    };
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadPolicyConfig(configPath);

    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe('1');
    expect(loaded?.policy?.blocklist).toContain('bad.ext');
  });

  it('should return null if config file does not exist', async () => {
    const configPath = path.join(testDir, 'nonexistent.json');

    const loaded = await loadPolicyConfig(configPath);

    expect(loaded).toBeNull();
  });

  it('should search in current directory if no path specified', async () => {
    // Mock process.cwd() since process.chdir() is not supported in workers
    const originalCwd = process.cwd;
    const configPath = path.join(testDir, '.extension-guard.json');
    process.cwd = () => testDir;

    const config: PolicyConfig = {
      version: '1',
      scanning: { timeout: 5000 },
    };
    await fs.writeFile(configPath, JSON.stringify(config));

    try {
      const loaded = await loadPolicyConfig();

      expect(loaded).not.toBeNull();
      expect(loaded?.scanning?.timeout).toBe(5000);
    } finally {
      process.cwd = originalCwd;
    }
  });

  it('should return null if no config in current directory', async () => {
    // Mock process.cwd() since process.chdir() is not supported in workers
    const originalCwd = process.cwd;
    const emptyDir = path.join(testDir, 'empty');
    await fs.mkdir(emptyDir, { recursive: true });
    process.cwd = () => emptyDir;

    try {
      const loaded = await loadPolicyConfig();

      expect(loaded).toBeNull();
    } finally {
      process.cwd = originalCwd;
    }
  });

  it('should throw on invalid JSON', async () => {
    const configPath = path.join(testDir, '.extension-guard.json');
    await fs.writeFile(configPath, '{ invalid json }');

    await expect(loadPolicyConfig(configPath)).rejects.toThrow();
  });

  it('should throw on missing version field', async () => {
    const configPath = path.join(testDir, '.extension-guard.json');
    await fs.writeFile(configPath, JSON.stringify({ policy: {} }));

    await expect(loadPolicyConfig(configPath)).rejects.toThrow(/version/i);
  });

  it('should accept config with all valid fields', async () => {
    const configPath = path.join(testDir, '.extension-guard.json');
    const config: PolicyConfig = {
      version: '1',
      scanning: {
        minSeverity: 'medium',
        skipRules: ['EG-HIGH-001'],
        timeout: 30000,
      },
      policy: {
        allowlist: ['trusted.ext'],
        blocklist: ['bad.ext'],
        rules: {
          minTrustScore: { threshold: 70, action: 'block' },
          requireVerifiedPublisher: { enabled: true, action: 'warn', exceptions: ['internal.ext'] },
          maxDaysSinceUpdate: { days: 365, action: 'info' },
          blockObfuscated: { enabled: true, action: 'block' },
        },
      },
    };
    await fs.writeFile(configPath, JSON.stringify(config));

    const loaded = await loadPolicyConfig(configPath);

    expect(loaded).toEqual(config);
  });
});
