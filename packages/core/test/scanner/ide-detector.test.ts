import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectIDEPaths, IDE_PATHS, expandPath } from '../../src/scanner/ide-detector.js';
import * as fs from 'node:fs';
import * as os from 'node:os';

vi.mock('node:fs');
vi.mock('node:os');

describe('ide-detector', () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
    vi.mocked(os.platform).mockReturnValue('linux');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      expect(expandPath('~/.vscode/extensions')).toBe('/home/testuser/.vscode/extensions');
    });

    it('should not modify absolute paths without ~', () => {
      expect(expandPath('/usr/local/bin')).toBe('/usr/local/bin');
    });
  });

  describe('detectIDEPaths', () => {
    it('should return empty array when no IDE paths exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = detectIDEPaths();
      expect(result).toEqual([]);
    });

    it('should detect VS Code extensions path when it exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === '/home/testuser/.vscode/extensions';
      });
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'ext1', isDirectory: () => true },
        { name: 'ext2', isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      const result = detectIDEPaths();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'VS Code',
        path: '/home/testuser/.vscode/extensions',
        extensionCount: 2,
      });
    });

    it('should detect multiple IDEs', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return (
          path === '/home/testuser/.vscode/extensions' ||
          path === '/home/testuser/.cursor/extensions'
        );
      });
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'ext1', isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      const result = detectIDEPaths();
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toContain('VS Code');
      expect(result.map((r) => r.name)).toContain('Cursor');
    });
  });

  describe('IDE_PATHS', () => {
    it('should include all supported IDEs', () => {
      const expectedIDEs = [
        'VS Code',
        'VS Code Insiders',
        'Cursor',
        'Windsurf',
        'Trae',
        'VSCodium',
      ];
      for (const ide of expectedIDEs) {
        expect(IDE_PATHS).toHaveProperty(ide);
      }
    });
  });
});
