import { describe, it, expect } from 'vitest';
import type {
  PolicyConfig,
  PolicyRules,
  PolicyAction,
  PolicyViolation,
} from '../../src/policy/index.js';
import type { Severity } from '../../src/types/index.js';

describe('Policy Types', () => {
  describe('PolicyAction', () => {
    it('should accept valid action values', () => {
      const actions: PolicyAction[] = ['block', 'warn', 'info'];
      expect(actions).toHaveLength(3);
    });
  });

  describe('PolicyConfig', () => {
    it('should accept minimal config with just version', () => {
      const config: PolicyConfig = {
        version: '1',
      };
      expect(config.version).toBe('1');
    });

    it('should accept full config with all options', () => {
      const config: PolicyConfig = {
        version: '1',
        scanning: {
          minSeverity: 'medium',
          skipRules: ['EG-HIGH-001'],
          timeout: 30000,
        },
        policy: {
          allowlist: ['publisher.trusted-ext'],
          blocklist: ['publisher.malicious-ext'],
          rules: {
            minTrustScore: { threshold: 70, action: 'block' },
            requireVerifiedPublisher: { enabled: true, action: 'warn', exceptions: ['internal.ext'] },
            maxDaysSinceUpdate: { days: 365, action: 'info' },
            blockObfuscated: { enabled: true, action: 'block' },
          },
        },
      };
      expect(config.version).toBe('1');
      expect(config.scanning?.minSeverity).toBe('medium');
      expect(config.policy?.rules?.minTrustScore?.threshold).toBe(70);
    });

    it('should allow partial scanning options', () => {
      const config: PolicyConfig = {
        version: '1',
        scanning: {
          timeout: 60000,
        },
      };
      expect(config.scanning?.timeout).toBe(60000);
      expect(config.scanning?.minSeverity).toBeUndefined();
    });

    it('should allow partial policy options', () => {
      const config: PolicyConfig = {
        version: '1',
        policy: {
          blocklist: ['bad.extension'],
        },
      };
      expect(config.policy?.blocklist).toContain('bad.extension');
      expect(config.policy?.allowlist).toBeUndefined();
    });
  });

  describe('PolicyRules', () => {
    it('should accept individual rule configurations', () => {
      const rules: PolicyRules = {
        minTrustScore: { threshold: 50, action: 'warn' },
      };
      expect(rules.minTrustScore?.threshold).toBe(50);
      expect(rules.minTrustScore?.action).toBe('warn');
    });

    it('should accept requireVerifiedPublisher with exceptions', () => {
      const rules: PolicyRules = {
        requireVerifiedPublisher: {
          enabled: true,
          action: 'block',
          exceptions: ['local.dev-ext', 'internal.tool'],
        },
      };
      expect(rules.requireVerifiedPublisher?.exceptions).toHaveLength(2);
    });

    it('should accept all rule types', () => {
      const rules: PolicyRules = {
        minTrustScore: { threshold: 70, action: 'block' },
        requireVerifiedPublisher: { enabled: true, action: 'warn' },
        maxDaysSinceUpdate: { days: 180, action: 'info' },
        blockObfuscated: { enabled: true, action: 'block' },
      };
      expect(Object.keys(rules)).toHaveLength(4);
    });
  });

  describe('PolicyViolation', () => {
    it('should represent a policy violation', () => {
      const violation: PolicyViolation = {
        extensionId: 'publisher.risky-extension',
        rule: 'minTrustScore',
        message: 'Extension trust score (45) is below minimum threshold (70)',
        action: 'block',
      };
      expect(violation.extensionId).toBe('publisher.risky-extension');
      expect(violation.rule).toBe('minTrustScore');
      expect(violation.action).toBe('block');
    });

    it('should support all action types in violations', () => {
      const violations: PolicyViolation[] = [
        { extensionId: 'a.ext', rule: 'blocklist', message: 'Blocklisted', action: 'block' },
        { extensionId: 'b.ext', rule: 'verifiedPublisher', message: 'Not verified', action: 'warn' },
        { extensionId: 'c.ext', rule: 'lastUpdated', message: 'Stale', action: 'info' },
      ];
      expect(violations.map(v => v.action)).toEqual(['block', 'warn', 'info']);
    });
  });
});
