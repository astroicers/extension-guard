import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import type {
  ScanOptions,
  FullScanReport,
  ScanResult,
  ScanSummary,
  RiskLevel,
  Severity,
  FindingCategory,
  DetectedIDE,
} from '../types/index.js';
import { detectIDEPaths } from './ide-detector.js';
import { readExtensionsFromDirectory } from './extension-reader.js';
import { collectFiles } from './file-collector.js';
import { VERSION } from '../index.js';

const DEFAULT_OPTIONS: Required<ScanOptions> = {
  idePaths: [],
  autoDetect: true,
  severity: 'info',
  rules: [],
  skipRules: [],
  concurrency: 4,
  timeout: 30000,
};

export class ExtensionGuardScanner {
  private options: Required<ScanOptions>;

  constructor(options?: Partial<ScanOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async scan(options?: Partial<ScanOptions>): Promise<FullScanReport> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    // Detect IDE paths
    let ides: DetectedIDE[];
    if (mergedOptions.autoDetect && mergedOptions.idePaths.length === 0) {
      ides = detectIDEPaths();
    } else {
      ides = mergedOptions.idePaths.map((p) => ({
        name: 'Custom',
        path: p,
        extensionCount: 0,
      }));
    }

    // Collect all extensions
    const allExtensions = await Promise.all(
      ides.map((ide) => readExtensionsFromDirectory(ide.path))
    );

    const extensionMap = new Map<string, { ide: DetectedIDE; ext: Awaited<ReturnType<typeof readExtensionsFromDirectory>>[number] }>();
    for (let i = 0; i < ides.length; i++) {
      const ide = ides[i]!;
      for (const ext of allExtensions[i]!) {
        if (!extensionMap.has(ext.id)) {
          extensionMap.set(ext.id, { ide, ext });
        }
      }
      // Update extension count
      ide.extensionCount = allExtensions[i]!.length;
    }

    // Scan each extension
    const results: ScanResult[] = [];
    for (const { ext } of extensionMap.values()) {
      const result = await this.scanExtension(ext);
      results.push(result);
    }

    // Calculate summary
    const summary = this.calculateSummary(results);

    return {
      scanId: randomUUID(),
      version: VERSION,
      timestamp: new Date().toISOString(),
      environment: {
        os: `${os.platform()} ${os.release()}`,
        ides,
      },
      totalExtensions: Array.from(allExtensions).reduce((sum, arr) => sum + arr.length, 0),
      uniqueExtensions: extensionMap.size,
      results,
      summary,
      scanDurationMs: Date.now() - startTime,
    };
  }

  private async scanExtension(
    ext: Awaited<ReturnType<typeof readExtensionsFromDirectory>>[number]
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const files = await collectFiles(ext.installPath);

    // TODO: Run analyzers here
    // For now, return a basic result with no findings

    return {
      extensionId: ext.id,
      displayName: ext.displayName,
      version: ext.version,
      trustScore: 100, // Will be calculated by scorer
      riskLevel: 'safe',
      findings: [],
      metadata: ext,
      analyzedFiles: files.size,
      scanDurationMs: Date.now() - startTime,
    };
  }

  private calculateSummary(results: ScanResult[]): ScanSummary {
    const byRiskLevel: Record<RiskLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      safe: 0,
    };

    const bySeverity: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byCategory: Partial<Record<FindingCategory, number>> = {};

    for (const result of results) {
      byRiskLevel[result.riskLevel]++;

      for (const finding of result.findings) {
        bySeverity[finding.severity]++;
        byCategory[finding.category] = (byCategory[finding.category] ?? 0) + 1;
      }
    }

    // Collect top findings (sorted by severity)
    const allFindings = results.flatMap((r) => r.findings);
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };
    const topFindings = allFindings
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 10);

    // Calculate overall health score
    const totalExtensions = results.length;
    const safeCount = byRiskLevel.safe + byRiskLevel.low;
    const overallHealthScore = totalExtensions > 0
      ? Math.round((safeCount / totalExtensions) * 100)
      : 100;

    return {
      byRiskLevel,
      bySeverity,
      byCategory,
      topFindings,
      overallHealthScore,
    };
  }
}
