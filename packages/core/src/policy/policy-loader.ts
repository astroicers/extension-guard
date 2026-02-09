/**
 * Policy Loader
 *
 * Loads and validates Extension Guard policy configuration files.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PolicyConfig } from './policy.types.js';

const DEFAULT_CONFIG_NAME = '.extension-guard.json';

/**
 * Load and validate a policy configuration file.
 *
 * @param configPath - Optional path to the config file. If not provided,
 *                     searches for .extension-guard.json in the current directory.
 * @returns The parsed PolicyConfig or null if not found.
 * @throws Error if the file exists but is invalid JSON or fails validation.
 */
export async function loadPolicyConfig(configPath?: string): Promise<PolicyConfig | null> {
  const resolvedPath = configPath ?? path.join(process.cwd(), DEFAULT_CONFIG_NAME);

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const config = JSON.parse(content) as unknown;

    validatePolicyConfig(config);

    return config as PolicyConfig;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Validate that the parsed config matches the expected PolicyConfig schema.
 *
 * @param config - The parsed JSON object
 * @throws Error if validation fails
 */
function validatePolicyConfig(config: unknown): asserts config is PolicyConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Policy config must be an object');
  }

  const obj = config as Record<string, unknown>;

  // Version is required
  if (typeof obj.version !== 'string') {
    throw new Error('Policy config must have a "version" field of type string');
  }

  // Validate scanning section if present
  if (obj.scanning !== undefined) {
    validateScanningConfig(obj.scanning);
  }

  // Validate policy section if present
  if (obj.policy !== undefined) {
    validatePolicySection(obj.policy);
  }
}

/**
 * Validate the scanning configuration section.
 */
function validateScanningConfig(scanning: unknown): void {
  if (typeof scanning !== 'object' || scanning === null) {
    throw new Error('scanning must be an object');
  }

  const obj = scanning as Record<string, unknown>;

  if (obj.minSeverity !== undefined) {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!validSeverities.includes(obj.minSeverity as string)) {
      throw new Error(`scanning.minSeverity must be one of: ${validSeverities.join(', ')}`);
    }
  }

  if (obj.skipRules !== undefined) {
    if (!Array.isArray(obj.skipRules) || !obj.skipRules.every(r => typeof r === 'string')) {
      throw new Error('scanning.skipRules must be an array of strings');
    }
  }

  if (obj.timeout !== undefined) {
    if (typeof obj.timeout !== 'number' || obj.timeout <= 0) {
      throw new Error('scanning.timeout must be a positive number');
    }
  }
}

/**
 * Validate the policy configuration section.
 */
function validatePolicySection(policy: unknown): void {
  if (typeof policy !== 'object' || policy === null) {
    throw new Error('policy must be an object');
  }

  const obj = policy as Record<string, unknown>;

  if (obj.allowlist !== undefined) {
    if (!Array.isArray(obj.allowlist) || !obj.allowlist.every(id => typeof id === 'string')) {
      throw new Error('policy.allowlist must be an array of extension ID strings');
    }
  }

  if (obj.blocklist !== undefined) {
    if (!Array.isArray(obj.blocklist) || !obj.blocklist.every(id => typeof id === 'string')) {
      throw new Error('policy.blocklist must be an array of extension ID strings');
    }
  }

  if (obj.rules !== undefined) {
    validatePolicyRules(obj.rules);
  }
}

/**
 * Validate the policy rules section.
 */
function validatePolicyRules(rules: unknown): void {
  if (typeof rules !== 'object' || rules === null) {
    throw new Error('policy.rules must be an object');
  }

  const obj = rules as Record<string, unknown>;
  const validActions = ['block', 'warn', 'info'];

  if (obj.minTrustScore !== undefined) {
    const rule = obj.minTrustScore as Record<string, unknown>;
    if (typeof rule.threshold !== 'number' || rule.threshold < 0 || rule.threshold > 100) {
      throw new Error('minTrustScore.threshold must be a number between 0 and 100');
    }
    if (!validActions.includes(rule.action as string)) {
      throw new Error(`minTrustScore.action must be one of: ${validActions.join(', ')}`);
    }
  }

  if (obj.requireVerifiedPublisher !== undefined) {
    const rule = obj.requireVerifiedPublisher as Record<string, unknown>;
    if (typeof rule.enabled !== 'boolean') {
      throw new Error('requireVerifiedPublisher.enabled must be a boolean');
    }
    if (!validActions.includes(rule.action as string)) {
      throw new Error(`requireVerifiedPublisher.action must be one of: ${validActions.join(', ')}`);
    }
    if (rule.exceptions !== undefined) {
      if (!Array.isArray(rule.exceptions) || !rule.exceptions.every(e => typeof e === 'string')) {
        throw new Error('requireVerifiedPublisher.exceptions must be an array of strings');
      }
    }
  }

  if (obj.maxDaysSinceUpdate !== undefined) {
    const rule = obj.maxDaysSinceUpdate as Record<string, unknown>;
    if (typeof rule.days !== 'number' || rule.days <= 0) {
      throw new Error('maxDaysSinceUpdate.days must be a positive number');
    }
    if (!validActions.includes(rule.action as string)) {
      throw new Error(`maxDaysSinceUpdate.action must be one of: ${validActions.join(', ')}`);
    }
  }

  if (obj.blockObfuscated !== undefined) {
    const rule = obj.blockObfuscated as Record<string, unknown>;
    if (typeof rule.enabled !== 'boolean') {
      throw new Error('blockObfuscated.enabled must be a boolean');
    }
    if (!validActions.includes(rule.action as string)) {
      throw new Error(`blockObfuscated.action must be one of: ${validActions.join(', ')}`);
    }
  }
}

/**
 * Type guard for Node.js errors with error codes.
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
