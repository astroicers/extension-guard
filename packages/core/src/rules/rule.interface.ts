import type { Severity, FindingCategory, ExtensionManifest, Evidence } from '../types/index.js';

export type { Evidence };

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  mitreAttackId?: string;
  enabled: boolean;

  detect(
    files: Map<string, string>,
    manifest: ExtensionManifest
  ): Evidence[];
}
