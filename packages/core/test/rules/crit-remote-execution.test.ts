import { describe, it, expect } from 'vitest';
import { critRemoteExecution } from '../../src/rules/built-in/crit-remote-execution.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-CRIT-002: Remote Code Execution', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect eval()', () => {
    const files = new Map([
      ['src/extension.js', 'const result = eval(userInput);'],
    ]);
    const evidences = critRemoteExecution.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('eval');
  });

  it('should detect new Function()', () => {
    const files = new Map([
      ['src/extension.js', 'const fn = new Function("return " + code);'],
    ]);
    const evidences = critRemoteExecution.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('Function-constructor');
  });

  it('should detect child_process.exec', () => {
    const files = new Map([
      ['src/extension.js', `require('child_process').exec('rm -rf /');`],
    ]);
    const evidences = critRemoteExecution.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('child_process-exec');
  });

  it('should detect vm.runInContext', () => {
    const files = new Map([
      ['src/extension.js', 'vm.runInContext(code, context);'],
    ]);
    const evidences = critRemoteExecution.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should not flag safe code', () => {
    const files = new Map([
      ['src/extension.js', `
        const vscode = require('vscode');
        function evaluate(x) { return x * 2; }
        module.exports = { evaluate };
      `],
    ]);
    const evidences = critRemoteExecution.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });
});
