import { ExtensionGuardScanner, ScanResult, FullScanReport } from '@aspect-guard/core';

export class ScannerService {
  private scanner: ExtensionGuardScanner;
  private cache: Map<string, ScanResult> = new Map();
  private lastReport: FullScanReport | null = null;

  constructor() {
    this.scanner = new ExtensionGuardScanner();
  }

  async scanAll(): Promise<FullScanReport> {
    this.lastReport = await this.scanner.scan();
    this.lastReport.results.forEach((r) => this.cache.set(r.extensionId, r));
    return this.lastReport;
  }

  async scanExtensionPath(extensionPath: string): Promise<ScanResult | null> {
    const report = await this.scanner.scan({ idePaths: [extensionPath] });
    const result = report.results[0] ?? null;
    if (result) {
      this.cache.set(result.extensionId, result);
    }
    return result;
  }

  getCached(extensionId: string): ScanResult | undefined {
    return this.cache.get(extensionId);
  }

  getAllCached(): ScanResult[] {
    return Array.from(this.cache.values());
  }

  getLastReport(): FullScanReport | null {
    return this.lastReport;
  }

  clearCache(): void {
    this.cache.clear();
    this.lastReport = null;
  }

  // Helper methods for UI
  getRiskyExtensions(): ScanResult[] {
    return this.getAllCached().filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high');
  }

  getMediumRiskExtensions(): ScanResult[] {
    return this.getAllCached().filter((r) => r.riskLevel === 'medium');
  }

  getSafeExtensions(): ScanResult[] {
    return this.getAllCached().filter((r) => r.riskLevel === 'low' || r.riskLevel === 'safe');
  }

  getOverallTrustScore(): number {
    const results = this.getAllCached();
    if (results.length === 0) return 100;
    const sum = results.reduce((acc, r) => acc + r.trustScore, 0);
    return Math.round(sum / results.length);
  }
}

// Singleton instance
let instance: ScannerService | null = null;

export function getScannerService(): ScannerService {
  if (!instance) {
    instance = new ScannerService();
  }
  return instance;
}
