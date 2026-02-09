import { describe, it, expect } from 'vitest';
import { collectFiles, shouldCollectFile } from '../../src/scanner/file-collector.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/extensions');

describe('file-collector', () => {
  describe('shouldCollectFile', () => {
    it('should collect .js files', () => {
      expect(shouldCollectFile('src/extension.js')).toBe(true);
    });

    it('should collect .ts files', () => {
      expect(shouldCollectFile('src/main.ts')).toBe(true);
    });

    it('should collect .json files', () => {
      expect(shouldCollectFile('package.json')).toBe(true);
    });

    it('should not collect .png files', () => {
      expect(shouldCollectFile('images/icon.png')).toBe(false);
    });

    it('should not collect files in node_modules', () => {
      expect(shouldCollectFile('node_modules/lodash/index.js')).toBe(false);
    });

    it('should not collect .map files', () => {
      expect(shouldCollectFile('dist/extension.js.map')).toBe(false);
    });
  });

  describe('collectFiles', () => {
    it('should collect all relevant files from extension directory', async () => {
      const extPath = path.join(fixturesPath, 'benign-theme');
      const files = await collectFiles(extPath);

      expect(files.size).toBeGreaterThanOrEqual(2);
      expect(files.has('package.json')).toBe(true);
      expect(files.has('src/extension.js')).toBe(true);
    });

    it('should return empty map for non-existent directory', async () => {
      const files = await collectFiles('/non/existent/path');
      expect(files.size).toBe(0);
    });

    it('should contain file contents', async () => {
      const extPath = path.join(fixturesPath, 'benign-theme');
      const files = await collectFiles(extPath);

      const packageJson = files.get('package.json');
      expect(packageJson).toBeDefined();
      expect(packageJson).toContain('benign-theme');
    });
  });
});
