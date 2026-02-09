import { describe, it, expect } from 'vitest';
import { critCredentialAccess } from '../../src/rules/built-in/crit-credential-access.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-CRIT-003: Credential Access', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
  };

  it('should detect SSH key access', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        const fs = require('fs');
        const key = fs.readFileSync('~/.ssh/id_rsa');
      `,
      ],
    ]);
    const evidences = critCredentialAccess.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('ssh-keys');
  });

  it('should detect AWS credentials access', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        const creds = fs.readFile('~/.aws/credentials', callback);
      `,
      ],
    ]);
    const evidences = critCredentialAccess.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('aws-credentials');
  });

  it('should detect .env file access', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        fs.readFileSync('.env.production');
      `,
      ],
    ]);
    const evidences = critCredentialAccess.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0]?.matchedPattern).toBe('env-file');
  });

  it('should detect kube config access', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        const config = fs.readFileSync('~/.kube/config');
      `,
      ],
    ]);
    const evidences = critCredentialAccess.detect(files, mockManifest);
    expect(evidences.length).toBeGreaterThan(0);
  });

  it('should not flag normal file operations', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        const config = fs.readFileSync('./config.json');
        const data = fs.readFileSync('./package.json');
      `,
      ],
    ]);
    const evidences = critCredentialAccess.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });

  it('should not flag without file read context', () => {
    const files = new Map([
      [
        'src/extension.js',
        `
        const path = '~/.ssh/id_rsa';
        console.log('Path is:', path);
      `,
      ],
    ]);
    const evidences = critCredentialAccess.detect(files, mockManifest);
    expect(evidences).toHaveLength(0);
  });
});
