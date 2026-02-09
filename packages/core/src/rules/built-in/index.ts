import { ruleRegistry } from '../rule-registry.js';
import { critDataExfiltration } from './crit-data-exfiltration.js';

export function registerBuiltInRules(): void {
  ruleRegistry.register(critDataExfiltration);
}

export { critDataExfiltration };
