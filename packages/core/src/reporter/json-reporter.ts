import type { Reporter, ReporterOptions } from './reporter.interface.js';
import type { FullScanReport, ScanResult, Severity } from '../types/index.js';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export class JsonReporter implements Reporter {
  readonly format = 'json';

  generate(report: FullScanReport, options: ReporterOptions = {}): string {
    const {
      includeEvidence = true,
      includeSafe = true,
      minSeverity = 'info',
    } = options;

    const filteredResults = this.filterResults(report.results, {
      includeSafe,
      minSeverity,
      includeEvidence,
    });

    const output = {
      ...report,
      results: filteredResults,
    };

    return JSON.stringify(output, null, 2);
  }

  private filterResults(
    results: ScanResult[],
    options: { includeSafe: boolean; minSeverity: Severity; includeEvidence: boolean }
  ): ScanResult[] {
    let filtered = results;

    if (!options.includeSafe) {
      filtered = filtered.filter((r) => r.riskLevel !== 'safe' && r.riskLevel !== 'low');
    }

    const minOrder = SEVERITY_ORDER[options.minSeverity];

    return filtered.map((result) => {
      const filteredFindings = result.findings.filter(
        (f) => SEVERITY_ORDER[f.severity] <= minOrder
      );

      const findingsOutput = options.includeEvidence
        ? filteredFindings
        : filteredFindings.map(({ evidence, ...rest }) => rest);

      return {
        ...result,
        findings: findingsOutput as ScanResult['findings'],
      };
    });
  }
}
