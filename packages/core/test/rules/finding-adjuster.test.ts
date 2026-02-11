import { describe, it, expect } from 'vitest';
import { adjustFindings } from '../../src/rules/finding-adjuster.js';
import type { Finding } from '../../src/types/index.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'test-id',
    ruleId: 'EG-CRIT-002',
    severity: 'critical',
    category: 'remote-code-execution',
    title: 'Remote Code Execution',
    description: 'Detects dangerous code execution patterns',
    evidence: {
      filePath: 'src/extension.js',
      lineNumber: 10,
      matchedPattern: 'child_process-exec',
      snippet: 'child_process.exec("ls")',
    },
    ...overrides,
  };
}

describe('adjustFindings', () => {
  describe('AI assistant category', () => {
    it('should downgrade child_process findings for AI assistants', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      expect(adjusted[0]?.severity).toBe('medium');
      expect(adjusted[0]?.description).toContain('Downgraded');
      expect(adjusted[0]?.description).toContain('ai-assistant');
    });

    it('should downgrade dynamic-url network findings for AI assistants', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/api.js', matchedPattern: 'dynamic-url' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      expect(adjusted[0]?.severity).toBe('low');
    });

    it('should downgrade env-file credential access for AI assistants', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-003',
          severity: 'critical',
          category: 'credential-theft',
          evidence: { filePath: 'src/config.js', matchedPattern: 'env-file' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      expect(adjusted[0]?.severity).toBe('medium');
    });

    it('should downgrade data exfiltration findings for AI assistants', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-001',
          severity: 'critical',
          category: 'data-exfiltration',
          evidence: {
            filePath: 'src/telemetry.js',
            matchedPattern: 'os.platform + http-to-ip',
          },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      expect(adjusted[0]?.severity).toBe('medium');
    });

    it('should NOT downgrade ssh-keys credential access for AI assistants', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-003',
          severity: 'critical',
          category: 'credential-theft',
          evidence: { filePath: 'src/steal.js', matchedPattern: 'ssh-keys' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      expect(adjusted[0]?.severity).toBe('critical');
    });

    it('should NOT downgrade http-to-ip network findings for AI assistants', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/api.js', matchedPattern: 'http-to-ip' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      expect(adjusted[0]?.severity).toBe('high');
    });
  });

  describe('language/grammar category', () => {
    it('should downgrade high-entropy obfuscation for language extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-001',
          severity: 'high',
          category: 'code-obfuscation',
          evidence: { filePath: 'src/grammar.js', matchedPattern: 'high-entropy' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language');
      expect(adjusted[0]?.severity).toBe('low');
    });

    it('should downgrade generic-secret for language extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-006',
          severity: 'high',
          category: 'hardcoded-secret',
          evidence: { filePath: 'src/grammar.js', matchedPattern: 'generic-secret' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language');
      expect(adjusted[0]?.severity).toBe('low');
    });

    it('should NOT downgrade network findings for language extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'http-to-ip' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language');
      expect(adjusted[0]?.severity).toBe('high');
    });
  });

  describe('theme category', () => {
    it('should downgrade obfuscation false positives for themes', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-001',
          severity: 'high',
          category: 'code-obfuscation',
          evidence: { filePath: 'dist/ext.js', matchedPattern: 'large-base64' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'theme');
      expect(adjusted[0]?.severity).toBe('low');
    });
  });

  describe('SCM category', () => {
    it('should downgrade git-credentials access for SCM extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-003',
          severity: 'critical',
          category: 'credential-theft',
          evidence: { filePath: 'src/git.js', matchedPattern: 'git-credentials' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'scm');
      expect(adjusted[0]?.severity).toBe('medium');
    });
  });

  describe('debugger category', () => {
    it('should downgrade child_process for debuggers', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/adapter.js', matchedPattern: 'child_process-spawn-shell' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'debugger');
      expect(adjusted[0]?.severity).toBe('medium');
    });
  });

  describe('linter category', () => {
    it('should downgrade child_process for linters', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/lint.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'linter');
      expect(adjusted[0]?.severity).toBe('medium');
    });
  });

  describe('language-support category', () => {
    it('should downgrade child_process for language-support extensions (ms-python)', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: {
            filePath: 'src/pythonRunner.js',
            matchedPattern: 'child_process-spawn-shell',
          },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language-support');
      expect(adjusted[0]?.severity).toBe('medium');
      expect(adjusted[0]?.description).toContain('language-support');
    });

    it('should downgrade data-exfiltration for language-support extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-001',
          severity: 'critical',
          category: 'data-exfiltration',
          evidence: { filePath: 'src/env.js', matchedPattern: 'os.platform + http' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language-support');
      expect(adjusted[0]?.severity).toBe('medium');
    });

    it('should downgrade obfuscation for language-support extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-001',
          severity: 'high',
          category: 'code-obfuscation',
          evidence: { filePath: 'dist/server.js', matchedPattern: 'high-entropy' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language-support');
      expect(adjusted[0]?.severity).toBe('low');
    });

    it('should downgrade dynamic-url for language-support extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/pip.js', matchedPattern: 'dynamic-url' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'language-support');
      expect(adjusted[0]?.severity).toBe('low');
    });
  });

  describe('developer-tools category', () => {
    it('should downgrade child_process for Code Runner extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/runner.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'developer-tools');
      expect(adjusted[0]?.severity).toBe('medium');
      expect(adjusted[0]?.description).toContain('developer-tools');
    });

    it('should downgrade http-to-ip for REST client extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/client.js', matchedPattern: 'http-to-ip' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'developer-tools');
      expect(adjusted[0]?.severity).toBe('low');
    });

    it('should downgrade unusual-port for Live Server extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/server.js', matchedPattern: 'unusual-port' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'developer-tools');
      expect(adjusted[0]?.severity).toBe('low');
    });

    it('should downgrade data-exfiltration for developer-tools', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-001',
          severity: 'critical',
          category: 'data-exfiltration',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'os.platform + http' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'developer-tools');
      expect(adjusted[0]?.severity).toBe('medium');
    });
  });

  describe('remote-development category', () => {
    it('should downgrade child_process for Remote-SSH extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/ssh.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'remote-development');
      expect(adjusted[0]?.severity).toBe('medium');
      expect(adjusted[0]?.description).toContain('remote-development');
    });

    it('should downgrade ssh-keys credential access for Remote extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-003',
          severity: 'critical',
          category: 'credential-theft',
          evidence: { filePath: 'src/connect.js', matchedPattern: 'ssh-keys' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'remote-development');
      expect(adjusted[0]?.severity).toBe('medium');
    });

    it('should downgrade network findings for Remote extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/tunnel.js', matchedPattern: 'unusual-port' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'remote-development');
      expect(adjusted[0]?.severity).toBe('low');
    });
  });

  describe('testing category', () => {
    it('should downgrade child_process for test runner extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/runner.js', matchedPattern: 'child_process-spawn-shell' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'testing');
      expect(adjusted[0]?.severity).toBe('medium');
      expect(adjusted[0]?.description).toContain('testing');
    });

    it('should downgrade data-exfiltration for test runners', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-001',
          severity: 'critical',
          category: 'data-exfiltration',
          evidence: { filePath: 'src/env.js', matchedPattern: 'os.platform' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'testing');
      expect(adjusted[0]?.severity).toBe('medium');
    });
  });

  describe('notebook category', () => {
    it('should downgrade child_process for Jupyter extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/kernel.js', matchedPattern: 'child_process-spawn-shell' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'notebook');
      expect(adjusted[0]?.severity).toBe('medium');
      expect(adjusted[0]?.description).toContain('notebook');
    });

    it('should downgrade env-file access for notebook extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-003',
          severity: 'critical',
          category: 'credential-theft',
          evidence: { filePath: 'src/config.js', matchedPattern: 'env-file' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'notebook');
      expect(adjusted[0]?.severity).toBe('medium');
    });

    it('should downgrade network findings for notebook extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/packages.js', matchedPattern: 'dynamic-url' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'notebook');
      expect(adjusted[0]?.severity).toBe('low');
    });
  });

  describe('general category', () => {
    it('should NOT adjust findings for general extensions', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'general');
      expect(adjusted[0]?.severity).toBe('critical');
      expect(adjusted[0]?.description).not.toContain('Downgraded');
    });
  });

  describe('multiple findings', () => {
    it('should adjust some findings and leave others unchanged', () => {
      const findings = [
        makeFinding({
          id: '1',
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'child_process-exec' },
        }),
        makeFinding({
          id: '2',
          ruleId: 'EG-HIGH-001',
          severity: 'high',
          category: 'code-obfuscation',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'hex-encoded' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'ai-assistant');
      // child_process should be downgraded
      expect(adjusted[0]?.severity).toBe('medium');
      // hex-encoded obfuscation should NOT be downgraded for AI assistants
      expect(adjusted[1]?.severity).toBe('high');
    });

    it('should not mutate original findings array', () => {
      const original = makeFinding({
        ruleId: 'EG-CRIT-002',
        severity: 'critical',
        evidence: { filePath: 'src/ext.js', matchedPattern: 'child_process-exec' },
      });
      const findings = [original];

      adjustFindings(findings, 'ai-assistant');
      expect(original.severity).toBe('critical');
    });
  });

  describe('soft trust for trusted publishers', () => {
    it('should apply additional downgrade for trusted publisher', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/api.js', matchedPattern: 'http-to-ip' },
        }),
      ];

      // Without trust: high stays high for general
      const noTrust = adjustFindings(findings, 'general');
      expect(noTrust[0]?.severity).toBe('high');

      // With trusted publisher: high -> low
      const withTrust = adjustFindings(findings, 'general', { publisher: 'ms-python' });
      expect(withTrust[0]?.severity).toBe('low');
      expect(withTrust[0]?.description).toContain('trusted publisher');
    });

    it('should apply trusted extension ID', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      // github.copilot is trusted AND mega popular
      // critical -> medium (trusted) -> info (mega popular double downgrade)
      const adjusted = adjustFindings(findings, 'general', {
        extensionId: 'github.copilot',
      });
      expect(adjusted[0]?.severity).toBe('info');
      expect(adjusted[0]?.description).toContain('trusted publisher');
      expect(adjusted[0]?.description).toContain('mega popular');
    });

    it('should stack category + trust adjustments', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-CRIT-002',
          severity: 'critical',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'child_process-exec' },
        }),
      ];

      // AI-assistant category downgrades critical -> medium
      // Trusted publisher downgrades medium -> info
      const adjusted = adjustFindings(findings, 'ai-assistant', {
        publisher: 'github',
      });
      expect(adjusted[0]?.severity).toBe('info');
      expect(adjusted[0]?.description).toContain('ai-assistant');
      expect(adjusted[0]?.description).toContain('trusted publisher');
    });

    it('should NOT apply trust in strict mode', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-HIGH-002',
          severity: 'high',
          category: 'suspicious-network',
          evidence: { filePath: 'src/api.js', matchedPattern: 'http-to-ip' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'general', {
        publisher: 'ms-python',
        strictMode: true,
      });
      expect(adjusted[0]?.severity).toBe('high');
      expect(adjusted[0]?.description).not.toContain('trusted');
    });

    it('should NOT downgrade info findings further', () => {
      const findings = [
        makeFinding({
          ruleId: 'EG-INFO-001',
          severity: 'info',
          category: 'info',
          evidence: { filePath: 'src/ext.js', matchedPattern: 'something' },
        }),
      ];

      const adjusted = adjustFindings(findings, 'general', { publisher: 'github' });
      expect(adjusted[0]?.severity).toBe('info');
    });
  });
});
