import { ruleRegistry } from '../rule-registry.js';
import { critDataExfiltration } from './crit-data-exfiltration.js';
import { critRemoteExecution } from './crit-remote-execution.js';
import { critCredentialAccess } from './crit-credential-access.js';
import { highSuspiciousNetwork } from './high-suspicious-network.js';
import { highObfuscatedCode } from './high-obfuscated-code.js';
import { highHardcodedSecret } from './high-hardcoded-secret.js';
import { medExcessiveActivation } from './med-excessive-activation.js';

export function registerBuiltInRules(): void {
  ruleRegistry.register(critDataExfiltration);
  ruleRegistry.register(critRemoteExecution);
  ruleRegistry.register(critCredentialAccess);
  ruleRegistry.register(highSuspiciousNetwork);
  ruleRegistry.register(highObfuscatedCode);
  ruleRegistry.register(highHardcodedSecret);
  ruleRegistry.register(medExcessiveActivation);
}

export {
  critDataExfiltration,
  critRemoteExecution,
  critCredentialAccess,
  highSuspiciousNetwork,
  highObfuscatedCode,
  highHardcodedSecret,
  medExcessiveActivation,
};

/**
 * All built-in detection rules with their metadata.
 * Useful for CLI commands that list rules.
 */
export const DETECTION_RULES = [
  critDataExfiltration,
  critRemoteExecution,
  critCredentialAccess,
  highSuspiciousNetwork,
  highObfuscatedCode,
  highHardcodedSecret,
  medExcessiveActivation,
];
