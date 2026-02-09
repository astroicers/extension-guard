import { describe, it, expect } from 'vitest';
import { readExtension, readExtensionsFromDirectory } from '../../src/scanner/extension-reader.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/extensions');

describe('extension-reader', () => {
  describe('readExtension', () => {
    it('should read extension info from a valid extension directory', async () => {
      const extPath = path.join(fixturesPath, 'benign-theme');
      const result = await readExtension(extPath);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-publisher.benign-theme');
      expect(result?.displayName).toBe('Benign Theme');
      expect(result?.version).toBe('1.0.0');
      expect(result?.publisher.name).toBe('test-publisher');
      expect(result?.categories).toContain('Themes');
    });

    it('should return null for non-existent directory', async () => {
      const result = await readExtension('/non/existent/path');
      expect(result).toBeNull();
    });

    it('should return null for directory without package.json', async () => {
      const result = await readExtension(fixturesPath);
      expect(result).toBeNull();
    });
  });

  describe('readExtensionsFromDirectory', () => {
    it('should read all extensions from a directory', async () => {
      const results = await readExtensionsFromDirectory(fixturesPath);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.id === 'test-publisher.benign-theme')).toBe(true);
    });

    it('should return empty array for non-existent directory', async () => {
      const results = await readExtensionsFromDirectory('/non/existent/path');
      expect(results).toEqual([]);
    });
  });
});
