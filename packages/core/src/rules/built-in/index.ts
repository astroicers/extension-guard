import { ruleRegistry } from '../rule-registry.js';
import { critDataExfiltration } from './crit-data-exfiltration.js';
import { critRemoteExecution } from './crit-remote-execution.js';
import { critCredentialAccess } from './crit-credential-access.js';

export function registerBuiltInRules(): void {
  ruleRegistry.register(critDataExfiltration);
  ruleRegistry.register(critRemoteExecution);
  ruleRegistry.register(critCredentialAccess);
}

export { critDataExfiltration, critRemoteExecution, critCredentialAccess };
