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
  ExtensionManifest,
} from '../types/index.js';
import { detectIDEPaths } from './ide-detector.js';
import { readExtensionsFromDirectory } from './extension-reader.js';
import { collectFiles } from './file-collector.js';
import { VERSION } from '../index.js';
import { RuleEngine } from '../rules/rule-engine.js';
import { adjustFindings } from '../rules/finding-adjuster.js';
import { registerBuiltInRules } from '../rules/built-in/index.js';
import { categorizeExtension } from './extension-categorizer.js';

// Register built-in rules once at module load
let rulesRegistered = false;
function ensureRulesRegistered(): void {
  if (!rulesRegistered) {
    registerBuiltInRules();
    rulesRegistered = true;
  }
}

const DEFAULT_OPTIONS: Required<ScanOptions> = {
  idePaths: [],
  autoDetect: true,
  severity: 'info',
  rules: [],
  skipRules: [],
  concurrency: 4,
  timeout: 30000,
};

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 35,
  high: 18,
  medium: 8,
  low: 3,
  info: 1,
};

export class ExtensionGuardScanner {
  private options: Required<ScanOptions>;
  private ruleEngine: RuleEngine;

  constructor(options?: Partial<ScanOptions>) {
    ensureRulesRegistered();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.ruleEngine = new RuleEngine({
      rules: this.options.rules.length > 0 ? this.options.rules : undefined,
      skipRules: this.options.skipRules.length > 0 ? this.options.skipRules : undefined,
      minSeverity: this.options.severity,
    });
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

    const extensionMap = new Map<
      string,
      { ide: DetectedIDE; ext: Awaited<ReturnType<typeof readExtensionsFromDirectory>>[number] }
    >();
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

    // Parse manifest for rule engine
    const manifestContent = files.get('package.json');
    let manifest: ExtensionManifest = {
      name: ext.id.split('.')[1] || ext.id,
      publisher: ext.publisher.name,
      version: ext.version,
    };
    if (manifestContent) {
      try {
        manifest = JSON.parse(manifestContent);
      } catch {
        // Use default manifest
      }
    }

    // Run rules
    const rawFindings = this.ruleEngine.run(files, manifest);

    // Infer extension category and adjust findings for expected behavior
    // Also apply soft trust for known publishers
    const category = categorizeExtension(manifest);
    const findings = adjustFindings(rawFindings, category, {
      publisher: ext.publisher.name,
      extensionId: ext.id,
    });

    // Calculate trust score
    const trustScore = this.calculateTrustScore(findings);
    const riskLevel = this.calculateRiskLevel(trustScore, findings);

    return {
      extensionId: ext.id,
      displayName: ext.displayName,
      version: ext.version,
      trustScore,
      riskLevel,
      findings,
      metadata: ext,
      analyzedFiles: files.size,
      scanDurationMs: Date.now() - startTime,
    };
  }

  private calculateTrustScore(findings: ScanResult['findings']): number {
    let score = 100;

    // Apply penalties per finding
    for (const finding of findings) {
      score -= SEVERITY_PENALTY[finding.severity];
    }

    // Clamp to [0, 100]
    return Math.max(0, Math.min(100, score));
  }

  private calculateRiskLevel(trustScore: number, findings: ScanResult['findings']): RiskLevel {
    // If any critical finding, always critical
    if (findings.some((f) => f.severity === 'critical')) {
      return 'critical';
    }
    // If any high finding, at least high
    if (findings.some((f) => f.severity === 'high')) {
      return 'high';
    }

    // Otherwise, base on trust score
    if (trustScore >= 90) return 'safe';
    if (trustScore >= 70) return 'low';
    if (trustScore >= 45) return 'medium';
    if (trustScore >= 20) return 'high';
    return 'critical';
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
    const overallHealthScore =
      totalExtensions > 0 ? Math.round((safeCount / totalExtensions) * 100) : 100;

    return {
      byRiskLevel,
      bySeverity,
      byCategory,
      topFindings,
      overallHealthScore,
    };
  }
}
