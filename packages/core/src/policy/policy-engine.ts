/**
 * Policy Engine
 *
 * Evaluates extension scan results against policy rules to determine compliance.
 */

import type { PolicyConfig, PolicyViolation } from './policy.types.js';
import type { ScanResult } from '../types/index.js';

/**
 * Rule ID for obfuscated code detection.
 * Must match the rule ID in high-obfuscated-code.ts
 */
const OBFUSCATION_RULE_ID = 'EG-HIGH-001';

/**
 * Milliseconds in a day for date calculations.
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Extended metadata interface that may include lastUpdated.
 * The base ExtensionInfo type doesn't include this, but it may be
 * added by the scanner when available from marketplace data.
 */
interface ExtendedMetadata {
  lastUpdated?: string;
  publisher: { verified: boolean; name: string };
}

/**
 * PolicyEngine evaluates scan results against configured policy rules.
 *
 * @example
 * ```typescript
 * const config = await loadPolicyConfig();
 * const engine = new PolicyEngine(config);
 * const violations = engine.evaluate(scanResults);
 *
 * if (engine.hasBlockingViolations()) {
 *   console.error('Policy check failed');
 *   process.exit(1);
 * }
 * ```
 */
export class PolicyEngine {
  private violations: PolicyViolation[] = [];

  /**
   * Create a new PolicyEngine instance.
   *
   * @param config - The policy configuration to evaluate against
   */
  constructor(private config: PolicyConfig) {}

  /**
   * Evaluate scan results against the configured policy.
   *
   * Checks are applied in this order for each extension:
   * 1. Blocklist - if matched, block immediately and skip other checks
   * 2. Allowlist - if matched, skip all other checks
   * 3. Individual rules (minTrustScore, blockObfuscated, etc.)
   *
   * @param results - Array of scan results to evaluate
   * @returns Array of policy violations found
   */
  evaluate(results: ScanResult[]): PolicyViolation[] {
    this.violations = [];

    for (const result of results) {
      const extId = result.extensionId;

      // Check blocklist first
      if (this.config.policy?.blocklist?.includes(extId)) {
        this.violations.push({
          extensionId: extId,
          rule: 'blocklist',
          message: 'Extension is blocklisted',
          action: 'block',
        });
        continue; // Skip all other checks for blocklisted extensions
      }

      // Check allowlist - skip all other checks if allowed
      if (this.config.policy?.allowlist?.includes(extId)) {
        continue;
      }

      // Check individual rules
      this.checkMinTrustScore(result);
      this.checkBlockObfuscated(result);
      this.checkRequireVerifiedPublisher(result);
      this.checkMaxDaysSinceUpdate(result);
    }

    return this.violations;
  }

  /**
   * Check if there are any violations with 'block' action.
   *
   * @returns true if any blocking violations exist
   */
  hasBlockingViolations(): boolean {
    return this.violations.some((v) => v.action === 'block');
  }

  /**
   * Get all violations from the last evaluation.
   *
   * @returns Array of all policy violations
   */
  getViolations(): PolicyViolation[] {
    return this.violations;
  }

  /**
   * Check minTrustScore rule.
   */
  private checkMinTrustScore(result: ScanResult): void {
    const rule = this.config.policy?.rules?.minTrustScore;
    if (!rule) return;

    if (result.trustScore < rule.threshold) {
      this.violations.push({
        extensionId: result.extensionId,
        rule: 'minTrustScore',
        message: `Trust score ${result.trustScore} below threshold ${rule.threshold}`,
        action: rule.action,
      });
    }
  }

  /**
   * Check blockObfuscated rule.
   */
  private checkBlockObfuscated(result: ScanResult): void {
    const rule = this.config.policy?.rules?.blockObfuscated;
    if (!rule?.enabled) return;

    const hasObfuscation = result.findings.some((f) => f.ruleId === OBFUSCATION_RULE_ID);
    if (hasObfuscation) {
      this.violations.push({
        extensionId: result.extensionId,
        rule: 'blockObfuscated',
        message: 'Extension contains obfuscated code',
        action: rule.action,
      });
    }
  }

  /**
   * Check requireVerifiedPublisher rule.
   */
  private checkRequireVerifiedPublisher(result: ScanResult): void {
    const rule = this.config.policy?.rules?.requireVerifiedPublisher;
    if (!rule?.enabled) return;

    const metadata = result.metadata as ExtendedMetadata;
    if (!metadata.publisher.verified) {
      // Check if this extension is in the exceptions list
      if (rule.exceptions?.includes(result.extensionId)) {
        return;
      }

      this.violations.push({
        extensionId: result.extensionId,
        rule: 'requireVerifiedPublisher',
        message: 'Extension publisher is not verified',
        action: rule.action,
      });
    }
  }

  /**
   * Check maxDaysSinceUpdate rule.
   */
  private checkMaxDaysSinceUpdate(result: ScanResult): void {
    const rule = this.config.policy?.rules?.maxDaysSinceUpdate;
    if (!rule) return;

    const metadata = result.metadata as ExtendedMetadata;
    if (!metadata.lastUpdated) return;

    const lastUpdatedDate = new Date(metadata.lastUpdated);
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdatedDate.getTime()) / MS_PER_DAY);

    if (daysSinceUpdate > rule.days) {
      this.violations.push({
        extensionId: result.extensionId,
        rule: 'maxDaysSinceUpdate',
        message: `Extension not updated in ${daysSinceUpdate} days (max: ${rule.days})`,
        action: rule.action,
      });
    }
  }
}
