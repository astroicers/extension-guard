import { describe, it, expect } from 'vitest';
import { isSelfExtension, SELF_EXTENSION_IDS } from '../../src/data/self-extensions.js';
import { ExtensionGuardScanner } from '../../src/scanner/scanner.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesWithSelfPath = path.join(__dirname, '../fixtures/extensions-with-self');

describe('Self-Extension Exclusion', () => {
  describe('isSelfExtension', () => {
    it('should identify extension-guard-vscode as self extension', () => {
      expect(isSelfExtension('aspect-guard.extension-guard-vscode')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isSelfExtension('Aspect-Guard.Extension-Guard-VSCode')).toBe(true);
      expect(isSelfExtension('ASPECT-GUARD.EXTENSION-GUARD-VSCODE')).toBe(true);
    });

    it('should not match other extensions', () => {
      expect(isSelfExtension('ms-python.python')).toBe(false);
      expect(isSelfExtension('github.copilot')).toBe(false);
      expect(isSelfExtension('aspect-guard.other-extension')).toBe(false);
    });
  });

  describe('SELF_EXTENSION_IDS', () => {
    it('should contain extension-guard-vscode', () => {
      expect(SELF_EXTENSION_IDS).toContain('aspect-guard.extension-guard-vscode');
    });

    it('should be a readonly tuple', () => {
      expect(Array.isArray(SELF_EXTENSION_IDS)).toBe(true);
    });
  });

  describe('ExtensionGuardScanner', () => {
    it('should skip self-extensions by default', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesWithSelfPath],
      });

      const report = await scanner.scan();

      // Should not include extension-guard-vscode in results
      const selfExtResult = report.results.find(
        (r) => r.extensionId === 'aspect-guard.extension-guard-vscode'
      );
      expect(selfExtResult).toBeUndefined();

      // Should include normal extension in results
      const normalExtResult = report.results.find(
        (r) => r.extensionId === 'other.normal-extension'
      );
      expect(normalExtResult).toBeDefined();

      // Should report self-extension as skipped
      expect(report.skippedExtensions).toBeDefined();
      expect(report.skippedExtensions?.length).toBe(1);
      expect(
        report.skippedExtensions?.find(
          (s) => s.extensionId === 'aspect-guard.extension-guard-vscode'
        )
      ).toBeDefined();
      expect(report.skippedExtensions?.[0]?.reason).toBe('self-extension');
    });

    it('should include self-extensions when includeSelfExtensions is true', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesWithSelfPath],
        includeSelfExtensions: true,
      });

      const report = await scanner.scan();

      // Should include extension-guard-vscode in results
      const selfExtResult = report.results.find(
        (r) => r.extensionId === 'aspect-guard.extension-guard-vscode'
      );
      expect(selfExtResult).toBeDefined();
      expect(selfExtResult?.displayName).toBe('Extension Guard');

      // Should not report it as skipped
      const skippedSelf = report.skippedExtensions?.find(
        (s) => s.extensionId === 'aspect-guard.extension-guard-vscode'
      );
      expect(skippedSelf).toBeUndefined();
    });

    it('should not have skippedExtensions field when nothing is skipped', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesWithSelfPath],
        includeSelfExtensions: true,
      });

      const report = await scanner.scan();

      // When includeSelfExtensions is true and no other extensions are skipped,
      // skippedExtensions should be undefined
      expect(report.skippedExtensions).toBeUndefined();
    });
  });
});
