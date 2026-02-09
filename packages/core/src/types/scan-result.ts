import type { Severity, RiskLevel } from './severity.js';
import type { ExtensionInfo } from './extension.js';
import type { Finding, FindingCategory } from './finding.js';

export interface ScanResult {
  extensionId: string;
  displayName: string;
  version: string;
  trustScore: number;
  riskLevel: RiskLevel;
  findings: Finding[];
  metadata: ExtensionInfo;
  analyzedFiles: number;
  scanDurationMs: number;
}

export interface ScanSummary {
  byRiskLevel: Record<RiskLevel, number>;
  bySeverity: Record<Severity, number>;
  byCategory: Partial<Record<FindingCategory, number>>;
  topFindings: Finding[];
  overallHealthScore: number;
}

export interface DetectedIDE {
  name: string;
  path: string;
  extensionCount: number;
}

export interface FullScanReport {
  scanId: string;
  version: string;
  timestamp: string;
  environment: {
    os: string;
    ides: DetectedIDE[];
  };
  totalExtensions: number;
  uniqueExtensions: number;
  results: ScanResult[];
  summary: ScanSummary;
  scanDurationMs: number;
}

export interface PolicyViolation {
  extensionId: string;
  rule: string;
  message: string;
  action: 'block' | 'warn' | 'info';
}

export interface AuditReport extends FullScanReport {
  policyPath: string;
  policyViolations: PolicyViolation[];
  auditPassed: boolean;
}
