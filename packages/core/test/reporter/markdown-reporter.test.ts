import { describe, it, expect } from 'vitest';
import { MarkdownReporter } from '../../src/reporter/markdown-reporter.js';
import type { FullScanReport } from '../../src/types/index.js';

describe('MarkdownReporter', () => {
  const mockReport: FullScanReport = {
    scanId: 'test-123',
    version: '0.1.0',
    timestamp: '2024-01-01T00:00:00.000Z',
    environment: {
      os: 'linux 5.15',
      ides: [{ name: 'VS Code', path: '/home/user/.vscode/extensions', extensionCount: 2 }],
    },
    totalExtensions: 2,
    uniqueExtensions: 2,
    results: [
      {
        extensionId: 'test.safe-ext',
        displayName: 'Safe Extension',
        version: '1.0.0',
        trustScore: 100,
        riskLevel: 'safe',
        findings: [],
        metadata: { publisher: { name: 'safe-pub', verified: true } } as any,
        analyzedFiles: 5,
        scanDurationMs: 100,
      },
      {
        extensionId: 'test.risky-ext',
        displayName: 'Risky Extension',
        version: '1.0.0',
        trustScore: 30,
        riskLevel: 'high',
        findings: [
          {
            id: 'finding-1',
            ruleId: 'EG-CRIT-001',
            severity: 'critical',
            category: 'data-exfiltration',
            title: 'Data Exfiltration',
            description: 'Collects and sends system info',
            evidence: { filePath: 'src/extension.js', lineNumber: 10 },
            mitreAttackId: 'T1041',
          },
        ],
        metadata: { publisher: { name: 'risky-pub', verified: false } } as any,
        analyzedFiles: 5,
        scanDurationMs: 100,
      },
    ],
    summary: {
      byRiskLevel: { critical: 0, high: 1, medium: 0, low: 0, safe: 1 },
      bySeverity: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: { 'data-exfiltration': 1 },
      topFindings: [],
      overallHealthScore: 50,
    },
    scanDurationMs: 200,
  };

  it('should generate markdown with header', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport);
    expect(output).toContain('# Extension Guard Scan Report');
  });

  it('should include environment info', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport);
    expect(output).toContain('VS Code');
    expect(output).toContain('linux');
  });

  it('should include summary table', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport);
    expect(output).toContain('| Total Extensions | 2 |');
    expect(output).toContain('| Health Score | 50% |');
  });

  it('should show high risk extensions', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport);
    expect(output).toContain('## ⚠️ High Risk Extensions');
    expect(output).toContain('test.risky-ext');
  });

  it('should include finding details', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport);
    expect(output).toContain('Data Exfiltration');
    expect(output).toContain('src/extension.js:10');
    expect(output).toContain('T1041');
  });

  it('should exclude safe extensions by default', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport);
    expect(output).not.toContain('## ✅ Safe Extensions');
  });

  it('should include safe extensions when includeSafe is true', () => {
    const reporter = new MarkdownReporter();
    const output = reporter.generate(mockReport, { includeSafe: true });
    expect(output).toContain('## ✅ Safe Extensions');
    expect(output).toContain('test.safe-ext');
  });

  it('should have format property set to markdown', () => {
    const reporter = new MarkdownReporter();
    expect(reporter.format).toBe('markdown');
  });
});
