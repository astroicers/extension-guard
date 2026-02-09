import { describe, it, expect } from 'vitest';
import { SarifReporter } from '../../src/reporter/sarif-reporter.js';
import type { FullScanReport } from '../../src/types/index.js';

describe('SarifReporter', () => {
  const mockReport: FullScanReport = {
    scanId: 'test-123',
    version: '0.1.0',
    timestamp: '2024-01-01T00:00:00.000Z',
    environment: { os: 'linux', ides: [] },
    totalExtensions: 1,
    uniqueExtensions: 1,
    results: [
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
        metadata: {} as any,
        analyzedFiles: 5,
        scanDurationMs: 100,
      },
    ],
    summary: {
      byRiskLevel: { critical: 0, high: 1, medium: 0, low: 0, safe: 0 },
      bySeverity: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: {},
      topFindings: [],
      overallHealthScore: 0,
    },
    scanDurationMs: 100,
  };

  it('should generate valid SARIF JSON', () => {
    const reporter = new SarifReporter();
    const output = reporter.generate(mockReport);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('should have correct SARIF schema and version', () => {
    const reporter = new SarifReporter();
    const sarif = JSON.parse(reporter.generate(mockReport));
    expect(sarif.$schema).toContain('sarif-schema-2.1.0');
    expect(sarif.version).toBe('2.1.0');
  });

  it('should include tool information', () => {
    const reporter = new SarifReporter();
    const sarif = JSON.parse(reporter.generate(mockReport));
    expect(sarif.runs[0].tool.driver.name).toBe('Extension Guard');
    expect(sarif.runs[0].tool.driver.version).toBe('0.1.0');
  });

  it('should extract rules from findings', () => {
    const reporter = new SarifReporter();
    const sarif = JSON.parse(reporter.generate(mockReport));
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.rules[0].id).toBe('EG-CRIT-001');
  });

  it('should include results with locations', () => {
    const reporter = new SarifReporter();
    const sarif = JSON.parse(reporter.generate(mockReport));
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].ruleId).toBe('EG-CRIT-001');
    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.region.startLine).toBe(10);
  });

  it('should map severity to SARIF level correctly', () => {
    const reporter = new SarifReporter();
    const sarif = JSON.parse(reporter.generate(mockReport));
    // critical -> error
    expect(sarif.runs[0].results[0].level).toBe('error');
  });

  it('should have format property set to sarif', () => {
    const reporter = new SarifReporter();
    expect(reporter.format).toBe('sarif');
  });
});
