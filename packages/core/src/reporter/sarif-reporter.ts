import type { Reporter, ReporterOptions } from './reporter.interface.js';
import type { FullScanReport, Finding, ScanResult } from '../types/index.js';

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
  properties?: { 'security-severity'?: string; tags?: string[] };
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number; startColumn?: number };
    };
  }>;
  properties?: Record<string, unknown>;
}

interface SarifOutput {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

const SEVERITY_TO_LEVEL: Record<string, 'error' | 'warning' | 'note'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'note',
  info: 'note',
};

const SEVERITY_TO_SCORE: Record<string, string> = {
  critical: '9.0',
  high: '7.0',
  medium: '5.0',
  low: '3.0',
  info: '1.0',
};

export class SarifReporter implements Reporter {
  readonly format = 'sarif';

  generate(report: FullScanReport, _options?: ReporterOptions): string {
    const rules = this.extractRules(report);
    const results = this.extractResults(report, rules);

    const sarif: SarifOutput = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Extension Guard',
              version: report.version,
              informationUri: 'https://github.com/aspect-guard/extension-guard',
              rules,
            },
          },
          results,
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  private extractRules(report: FullScanReport): SarifRule[] {
    const ruleMap = new Map<string, SarifRule>();

    for (const result of report.results) {
      for (const finding of result.findings) {
        if (!ruleMap.has(finding.ruleId)) {
          ruleMap.set(finding.ruleId, {
            id: finding.ruleId,
            name: finding.title,
            shortDescription: { text: finding.title },
            fullDescription: { text: finding.description },
            defaultConfiguration: { level: SEVERITY_TO_LEVEL[finding.severity] || 'note' },
            properties: {
              'security-severity': SEVERITY_TO_SCORE[finding.severity] || '1.0',
              tags: ['security', finding.category],
            },
          });
        }
      }
    }

    return Array.from(ruleMap.values());
  }

  private extractResults(report: FullScanReport, rules: SarifRule[]): SarifResult[] {
    const results: SarifResult[] = [];
    const ruleIndexMap = new Map(rules.map((r, i) => [r.id, i]));

    for (const scanResult of report.results) {
      for (const finding of scanResult.findings) {
        const ruleIndex = ruleIndexMap.get(finding.ruleId) ?? 0;

        results.push({
          ruleId: finding.ruleId,
          ruleIndex,
          level: SEVERITY_TO_LEVEL[finding.severity] || 'note',
          message: {
            text: `${finding.title} in ${scanResult.extensionId}: ${finding.description}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: `${scanResult.extensionId}/${finding.evidence.filePath}`,
                },
                region: finding.evidence.lineNumber
                  ? {
                      startLine: finding.evidence.lineNumber,
                      startColumn: finding.evidence.columnNumber,
                    }
                  : undefined,
              },
            },
          ],
          properties: {
            extensionId: scanResult.extensionId,
            trustScore: scanResult.trustScore,
            mitreAttackId: finding.mitreAttackId,
          },
        });
      }
    }

    return results;
  }
}
