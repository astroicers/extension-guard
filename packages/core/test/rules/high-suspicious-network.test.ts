import { describe, it, expect } from 'vitest';
import { highSuspiciousNetwork } from '../../src/rules/built-in/high-suspicious-network.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-HIGH-002: Suspicious Network', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect fetch to IP address', () => {
    const files = new Map([
      ['src/extension.js', `fetch('http://192.168.1.100/api');`],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('http-to-ip');
  });

  it('should detect https.request to IP', () => {
    const files = new Map([
      ['src/extension.js', `https.request('https://10.0.0.1/data', callback);`],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should detect WebSocket to IP', () => {
    const files = new Map([
      ['src/extension.js', `const ws = new WebSocket('ws://192.168.1.1/socket');`],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('websocket-to-ip');
  });

  it('should detect dynamic URL construction', () => {
    const files = new Map([
      ['src/extension.js', 'fetch(`https://api.example.com/${endpoint}`);'],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('dynamic-url');
  });

  it('should detect unusual ports', () => {
    const files = new Map([
      ['src/extension.js', `fetch('https://example.com:4444/api');`],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('unusual-port');
  });

  it('should not flag normal domain requests', () => {
    const files = new Map([
      ['src/extension.js', `
        fetch('https://api.github.com/repos');
        axios.get('https://registry.npmjs.org/package');
      `],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });

  it('should not flag standard ports', () => {
    const files = new Map([
      ['src/extension.js', `
        fetch('https://example.com:443/api');
        fetch('http://localhost:3000/dev');
        fetch('http://localhost:8080/test');
      `],
    ]);
    const evidences = highSuspiciousNetwork.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });
});
