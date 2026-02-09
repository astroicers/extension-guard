import { describe, it, expect } from 'vitest';
import { highObfuscatedCode } from '../../src/rules/built-in/high-obfuscated-code.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-HIGH-001: Obfuscated Code', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect large base64 strings', () => {
    // Valid base64 string (groups of 4 chars with proper padding)
    const largeBase64 = 'AAAA'.repeat(30) + 'AA=='; // 122 chars, valid base64
    const files = new Map([['src/extension.js', `const payload = "${largeBase64}";`]]);
    const evidences = highObfuscatedCode.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('large-base64');
  });

  it('should detect hex-encoded strings', () => {
    const hexString = '\\x68\\x65\\x6c\\x6c\\x6f\\x20\\x77\\x6f\\x72\\x6c\\x64\\x21';
    const files = new Map([['src/extension.js', `const x = "${hexString}";`]]);
    const evidences = highObfuscatedCode.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('hex-encoded');
  });

  it('should detect String.fromCharCode abuse', () => {
    const files = new Map([
      ['src/extension.js', `const str = String.fromCharCode(72, 101, 108, 108, 111, 32);`],
    ]);
    const evidences = highObfuscatedCode.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('charcode-obfuscation');
  });

  it('should detect unicode escape sequences', () => {
    const unicode =
      '\\u0048\\u0065\\u006c\\u006c\\u006f\\u0020\\u0057\\u006f\\u0072\\u006c\\u0064\\u0021';
    const files = new Map([['src/extension.js', `const x = "${unicode}";`]]);
    const evidences = highObfuscatedCode.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('unicode-escape');
  });

  it('should not flag normal code', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        const vscode = require('vscode');
        function activate() { console.log('Hello'); }
        module.exports = { activate };
      `,
      ],
    ]);
    const evidences = highObfuscatedCode.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });

  it('should not flag short base64 strings', () => {
    const files = new Map([
      ['src/extension.js', `const icon = "SGVsbG8=";`], // "Hello" in base64, only 8 chars
    ]);
    const evidences = highObfuscatedCode.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });
});
