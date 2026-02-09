import { describe, it, expect } from 'vitest';
import { ExtensionGuardScanner } from '../../src/scanner/scanner.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/extensions');

describe('ExtensionGuardScanner', () => {
  it('should create scanner with default options', () => {
    const scanner = new ExtensionGuardScanner();
    expect(scanner).toBeDefined();
  });

  it('should create scanner with custom options', () => {
    const scanner = new ExtensionGuardScanner({
      autoDetect: false,
      idePaths: [fixturesPath],
    });
    expect(scanner).toBeDefined();
  });

  describe('scan', () => {
    it('should scan extensions from specified path', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesPath],
      });

      const report = await scanner.scan();

      expect(report).toBeDefined();
      expect(report.totalExtensions).toBeGreaterThanOrEqual(1);
      expect(report.results).toBeInstanceOf(Array);
      expect(report.timestamp).toBeDefined();
      expect(report.scanId).toBeDefined();
    });

    it('should include extension results', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesPath],
      });

      const report = await scanner.scan();
      const benignTheme = report.results.find(
        (r) => r.extensionId === 'test-publisher.benign-theme'
      );

      expect(benignTheme).toBeDefined();
      expect(benignTheme?.displayName).toBe('Benign Theme');
      expect(benignTheme?.trustScore).toBeGreaterThanOrEqual(0);
      expect(benignTheme?.trustScore).toBeLessThanOrEqual(100);
    });

    it('should detect malicious patterns in extensions', async () => {
      const scanner = new ExtensionGuardScanner({
        autoDetect: false,
        idePaths: [fixturesPath],
      });

      const report = await scanner.scan();
      const maliciousExt = report.results.find(
        (r) => r.extensionId === 'evil-publisher.malicious-exfil'
      );

      expect(maliciousExt).toBeDefined();
      expect(maliciousExt?.findings.length).toBeGreaterThan(0);
      expect(maliciousExt?.riskLevel).toBe('critical');
      expect(maliciousExt?.trustScore).toBeLessThan(100);
    });
  });
});
