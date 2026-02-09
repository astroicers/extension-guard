/**
 * Policy Engine Types
 *
 * Defines the structure for Extension Guard policy configurations.
 * Policies allow organizations to enforce security standards for VSCode extensions.
 */

import type { Severity } from '../types/index.js';

/**
 * Root policy configuration structure.
 * Supports both scanning configuration and policy enforcement rules.
 */
export interface PolicyConfig {
  /** Schema version for the policy file (e.g., "1") */
  version: string;

  /** Scanning behavior configuration */
  scanning?: {
    /** Minimum severity level to report (findings below this are ignored) */
    minSeverity?: Severity;
    /** Rule IDs to skip during scanning */
    skipRules?: string[];
    /** Scan timeout in milliseconds */
    timeout?: number;
  };

  /** Policy enforcement configuration */
  policy?: {
    /** Extension IDs that are always allowed (bypass policy checks) */
    allowlist?: string[];
    /** Extension IDs that are always blocked */
    blocklist?: string[];
    /** Configurable policy rules */
    rules?: PolicyRules;
  };
}

/**
 * Configurable policy rules for extension evaluation.
 * Each rule can specify its own action when violated.
 */
export interface PolicyRules {
  /** Minimum trust score requirement */
  minTrustScore?: {
    /** Score threshold (0-100) */
    threshold: number;
    /** Action to take when score is below threshold */
    action: PolicyAction;
  };

  /** Require extensions to have a verified publisher */
  requireVerifiedPublisher?: {
    /** Whether this rule is enabled */
    enabled: boolean;
    /** Action to take when publisher is not verified */
    action: PolicyAction;
    /** Extension IDs exempt from this rule */
    exceptions?: string[];
  };

  /** Maximum days since last extension update */
  maxDaysSinceUpdate?: {
    /** Maximum allowed days since last update */
    days: number;
    /** Action to take when extension is too old */
    action: PolicyAction;
  };

  /** Block extensions with obfuscated code */
  blockObfuscated?: {
    /** Whether this rule is enabled */
    enabled: boolean;
    /** Action to take when obfuscated code is detected */
    action: PolicyAction;
  };
}

/**
 * Action to take when a policy rule is violated.
 * - 'block': Prevent extension usage (fail the check)
 * - 'warn': Allow but generate a warning
 * - 'info': Log for informational purposes only
 */
export type PolicyAction = 'block' | 'warn' | 'info';

// Re-export PolicyViolation from types module for convenience
// The type is defined there as it's part of the AuditReport structure
export type { PolicyViolation } from '../types/scan-result.js';
