import type { DetectionRule } from './rule.interface.js';

class RuleRegistry {
  private rules: Map<string, DetectionRule> = new Map();

  register(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  get(id: string): DetectionRule | undefined {
    return this.rules.get(id);
  }

  getAll(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  getEnabled(): DetectionRule[] {
    return this.getAll().filter((rule) => rule.enabled);
  }

  getByCategory(category: string): DetectionRule[] {
    return this.getAll().filter((rule) => rule.category === category);
  }

  getBySeverity(severity: string): DetectionRule[] {
    return this.getAll().filter((rule) => rule.severity === severity);
  }

  clear(): void {
    this.rules.clear();
  }
}

export const ruleRegistry = new RuleRegistry();
