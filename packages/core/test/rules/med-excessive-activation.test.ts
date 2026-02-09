import { describe, it, expect } from 'vitest';
import { medExcessiveActivation } from '../../src/rules/built-in/med-excessive-activation.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-MED-001: Excessive Activation', () => {
  it('should detect activationEvents: ["*"]', () => {
    const manifest: ExtensionManifest = {
      name: 'test',
      publisher: 'test',
      version: '1.0.0',
      activationEvents: ['*'],
    };
    const files = new Map<string, string>();
    const evidences = medExcessiveActivation.detect(files, manifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('activation-star');
  });

  it('should detect onStartupFinished', () => {
    const manifest: ExtensionManifest = {
      name: 'test',
      publisher: 'test',
      version: '1.0.0',
      activationEvents: ['onStartupFinished'],
    };
    const files = new Map<string, string>();
    const evidences = medExcessiveActivation.detect(files, manifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('activation-startup');
  });

  it('should not flag normal activation events', () => {
    const manifest: ExtensionManifest = {
      name: 'test',
      publisher: 'test',
      version: '1.0.0',
      activationEvents: ['onLanguage:python', 'onCommand:myext.start'],
    };
    const files = new Map<string, string>();
    const evidences = medExcessiveActivation.detect(files, manifest);
    expect(evidences).toHaveLength(0);
  });

  it('should not flag extensions without activation events', () => {
    const manifest: ExtensionManifest = {
      name: 'test',
      publisher: 'test',
      version: '1.0.0',
    };
    const files = new Map<string, string>();
    const evidences = medExcessiveActivation.detect(files, manifest);
    expect(evidences).toHaveLength(0);
  });
});
