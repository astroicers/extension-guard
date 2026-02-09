import { describe, it, expect } from 'vitest';
import { JsonReporter } from '../../src/reporter/json-reporter.js';
import type { FullScanReport } from '../../src/types/index.js';

describe('JsonReporter', () => {
  const mockReport: FullScanReport = {
    scanId: 'test-123',
    version: '0.1.0',
    timestamp: '2024-01-01T00:00:00.000Z',
    environment: {
      os: 'linux',
      ides: [{ name: 'VS Code', path: '/test', extensionCount: 2 }],
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
        metadata: {} as any,
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
            description: 'Test finding',
            evidence: {
              filePath: 'src/extension.js',
              lineNumber: 10,
              lineContent: 'malicious code',
            },
          },
        ],
        metadata: {} as any,
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

  it('should generate valid JSON', () => {
    const reporter = new JsonReporter();
    const output = reporter.generate(mockReport);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('should include all results by default', () => {
    const reporter = new JsonReporter();
    const output = JSON.parse(reporter.generate(mockReport));
    expect(output.results).toHaveLength(2);
  });

  it('should exclude safe extensions when includeSafe is false', () => {
    const reporter = new JsonReporter();
    const output = JSON.parse(reporter.generate(mockReport, { includeSafe: false }));
    expect(output.results).toHaveLength(1);
    expect(output.results[0].extensionId).toBe('test.risky-ext');
  });

  it('should include evidence by default', () => {
    const reporter = new JsonReporter();
    const output = JSON.parse(reporter.generate(mockReport));
    const finding = output.results[1].findings[0];
    expect(finding.evidence).toBeDefined();
    expect(finding.evidence.filePath).toBe('src/extension.js');
  });

  it('should exclude evidence when includeEvidence is false', () => {
    const reporter = new JsonReporter();
    const output = JSON.parse(reporter.generate(mockReport, { includeEvidence: false }));
    const finding = output.results[1].findings[0];
    expect(finding.evidence).toBeUndefined();
  });

  it('should have format property set to json', () => {
    const reporter = new JsonReporter();
    expect(reporter.format).toBe('json');
  });
});
