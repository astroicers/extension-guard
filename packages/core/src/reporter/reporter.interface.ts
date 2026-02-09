import type { FullScanReport, Severity } from '../types/index.js';

export interface ReporterOptions {
  includeEvidence?: boolean;
  includeSafe?: boolean;
  minSeverity?: Severity;
}

export interface Reporter {
  readonly format: string;
  generate(report: FullScanReport, options?: ReporterOptions): string;
}
