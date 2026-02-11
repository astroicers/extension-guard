import { describe, it, expect } from 'vitest';
import {
  categorizeExtension,
  type ExtensionCategory,
} from '../../src/scanner/extension-categorizer.js';
import type { ExtensionManifest } from '../../src/types/index.js';

function manifest(overrides: Partial<ExtensionManifest> = {}): ExtensionManifest {
  return {
    name: 'test-ext',
    publisher: 'test',
    version: '1.0.0',
    ...overrides,
  };
}

describe('categorizeExtension', () => {
  describe('theme detection', () => {
    it('should detect theme from categories', () => {
      expect(categorizeExtension(manifest({ categories: ['Themes'] }))).toBe('theme');
    });

    it('should detect icon theme from categories', () => {
      expect(categorizeExtension(manifest({ categories: ['Icon Themes'] }))).toBe('theme');
    });

    it('should detect theme from contributes only themes', () => {
      expect(
        categorizeExtension(
          manifest({
            contributes: {
              themes: [{ label: 'My Theme', uiTheme: 'vs-dark', path: './theme.json' }],
            },
          })
        )
      ).toBe('theme');
    });

    it('should NOT detect theme if contributes has commands too', () => {
      const result = categorizeExtension(
        manifest({
          contributes: {
            themes: [{ label: 'My Theme', uiTheme: 'vs-dark', path: './theme.json' }],
            commands: [{ command: 'ext.do', title: 'Do' }],
          },
        })
      );
      expect(result).not.toBe('theme');
    });
  });

  describe('language detection', () => {
    it('should detect language from contributes.grammars', () => {
      expect(
        categorizeExtension(
          manifest({
            contributes: {
              grammars: [
                { language: 'foo', scopeName: 'source.foo', path: './foo.tmLanguage.json' },
              ],
            },
          })
        )
      ).toBe('language');
    });

    it('should detect language from contributes.languages', () => {
      expect(
        categorizeExtension(
          manifest({
            contributes: {
              languages: [{ id: 'adblock', aliases: ['Adblock'] }],
            },
          })
        )
      ).toBe('language');
    });

    it('should NOT detect language if too many commands', () => {
      const result = categorizeExtension(
        manifest({
          contributes: {
            grammars: [{ language: 'foo', scopeName: 'source.foo', path: './foo.tmLanguage.json' }],
            commands: [
              { command: 'a', title: 'A' },
              { command: 'b', title: 'B' },
              { command: 'c', title: 'C' },
              { command: 'd', title: 'D' },
            ],
          },
        })
      );
      expect(result).not.toBe('language');
    });
  });

  describe('AI assistant detection', () => {
    it('should detect AI assistant from Machine Learning category', () => {
      expect(categorizeExtension(manifest({ categories: ['Machine Learning'] }))).toBe(
        'ai-assistant'
      );
    });

    it('should detect AI assistant from keywords', () => {
      const m = manifest() as Record<string, unknown>;
      m.keywords = ['ai', 'coding'];
      expect(categorizeExtension(m as ExtensionManifest)).toBe('ai-assistant');
    });

    it('should detect AI assistant from displayName containing copilot', () => {
      expect(categorizeExtension(manifest({ displayName: 'My Copilot Extension' }))).toBe(
        'ai-assistant'
      );
    });

    it('should detect AI assistant from name containing assistant', () => {
      expect(categorizeExtension(manifest({ name: 'code-assistant' }))).toBe('ai-assistant');
    });

    it('should detect Kilo Code as AI assistant', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'kilo-code',
            displayName: 'Kilo Code',
            description: 'AI coding assistant powered by LLM',
          })
        )
      ).toBe('ai-assistant');
    });

    it('should detect Continue as AI assistant', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'continue',
            displayName: 'Continue',
            description: 'The open-source AI code assistant',
          })
        )
      ).toBe('ai-assistant');
    });
  });

  describe('SCM detection', () => {
    it('should detect SCM from categories', () => {
      expect(categorizeExtension(manifest({ categories: ['SCM Providers'] }))).toBe('scm');
    });
  });

  describe('debugger detection', () => {
    it('should detect debugger from categories', () => {
      expect(categorizeExtension(manifest({ categories: ['Debuggers'] }))).toBe('debugger');
    });

    it('should detect debugger from contributes.debuggers', () => {
      expect(
        categorizeExtension(
          manifest({
            contributes: { debuggers: [{ type: 'node', label: 'Node.js' }] },
          })
        )
      ).toBe('debugger');
    });
  });

  describe('linter detection', () => {
    it('should detect linter from categories', () => {
      expect(categorizeExtension(manifest({ categories: ['Linters'] }))).toBe('linter');
    });

    it('should detect formatter from categories', () => {
      expect(categorizeExtension(manifest({ categories: ['Formatters'] }))).toBe('linter');
    });

    it('should detect eslint from displayName', () => {
      expect(categorizeExtension(manifest({ displayName: 'ESLint' }))).toBe('linter');
    });
  });

  describe('language-support detection', () => {
    it('should detect ms-python as language-support', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'python',
            publisher: 'ms-python',
            displayName: 'Python',
            categories: ['Programming Languages', 'Linters', 'Formatters'],
          })
        )
      ).toBe('language-support');
    });

    it('should detect ms-vscode C++ as language-support', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'cpptools',
            publisher: 'ms-vscode',
            displayName: 'C/C++',
          })
        )
      ).toBe('language-support');
    });

    it('should detect golang.go as language-support', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'go',
            publisher: 'golang',
            displayName: 'Go',
          })
        )
      ).toBe('language-support');
    });

    it('should detect rust-analyzer as language-support', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'rust-analyzer',
            publisher: 'rust-lang',
            displayName: 'rust-analyzer',
          })
        )
      ).toBe('language-support');
    });

    it('should detect Programming Languages category as language-support', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'some-lang',
            publisher: 'some-publisher',
            categories: ['Programming Languages'],
          })
        )
      ).toBe('language-support');
    });

    it('should prioritize ai-assistant over language-support for Copilot', () => {
      // Even if Copilot has Programming Languages category, AI keywords take priority
      expect(
        categorizeExtension(
          manifest({
            name: 'copilot',
            publisher: 'github',
            displayName: 'GitHub Copilot',
            categories: ['Programming Languages', 'Machine Learning'],
          })
        )
      ).toBe('ai-assistant');
    });
  });

  describe('developer-tools detection', () => {
    it('should detect Code Runner from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'code-runner',
            publisher: 'formulahendry',
            displayName: 'Code Runner',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect Code Runner from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'my-runner',
            publisher: 'unknown',
            displayName: 'Code Runner Plus',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect REST Client from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'rest-client',
            publisher: 'humao',
            displayName: 'REST Client',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect REST Client from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'http-tool',
            publisher: 'unknown',
            displayName: 'REST Client Pro',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect Thunder Client from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'thunder-client',
            publisher: 'rangav',
            displayName: 'Thunder Client',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect Live Server from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'liveserver',
            publisher: 'ritwickdey',
            displayName: 'Live Server',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect Live Server from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'preview',
            publisher: 'unknown',
            displayName: 'Live Server Preview',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect API client from description', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'my-tool',
            publisher: 'unknown',
            description: 'A powerful API client for testing REST endpoints',
          })
        )
      ).toBe('developer-tools');
    });

    it('should detect database client from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'db-tool',
            publisher: 'unknown',
            displayName: 'MongoDB Client',
          })
        )
      ).toBe('developer-tools');
    });
  });

  describe('remote-development detection', () => {
    it('should detect Remote-SSH from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'remote-ssh',
            publisher: 'ms-vscode-remote',
            displayName: 'Remote - SSH',
          })
        )
      ).toBe('remote-development');
    });

    it('should detect Dev Containers from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'container',
            publisher: 'unknown',
            displayName: 'Dev Container Tools',
          })
        )
      ).toBe('remote-development');
    });

    it('should detect WSL from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'wsl-extension',
            publisher: 'unknown',
            displayName: 'WSL Remote',
          })
        )
      ).toBe('remote-development');
    });

    it('should detect GitHub Codespaces from description', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'cloud-dev',
            publisher: 'unknown',
            description: 'Develop in GitHub Codespaces directly',
          })
        )
      ).toBe('remote-development');
    });
  });

  describe('testing detection', () => {
    it('should detect from Testing category', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'my-test',
            publisher: 'unknown',
            categories: ['Testing'],
          })
        )
      ).toBe('testing');
    });

    it('should detect Jest Runner from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'jest',
            publisher: 'firsttris',
            displayName: 'Jest Runner',
          })
        )
      ).toBe('testing');
    });

    it('should detect Test Explorer from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'test-ext',
            publisher: 'unknown',
            displayName: 'Test Explorer UI',
          })
        )
      ).toBe('testing');
    });

    it('should detect Playwright from description', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'e2e',
            publisher: 'unknown',
            description: 'Run Playwright tests from VS Code',
          })
        )
      ).toBe('testing');
    });
  });

  describe('notebook detection', () => {
    it('should detect from Notebooks category', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'my-notebook',
            publisher: 'unknown',
            categories: ['Notebooks'],
          })
        )
      ).toBe('notebook');
    });

    it('should detect Jupyter from publisher', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'jupyter',
            publisher: 'ms-toolsai',
            displayName: 'Jupyter',
          })
        )
      ).toBe('notebook');
    });

    it('should detect from contributes.notebooks', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'custom-notebook',
            publisher: 'unknown',
            contributes: {
              notebooks: [{ type: 'my-notebook', displayName: 'My Notebook' }],
            },
          })
        )
      ).toBe('notebook');
    });

    it('should detect Jupyter from displayName', () => {
      expect(
        categorizeExtension(
          manifest({
            name: 'nb',
            publisher: 'unknown',
            displayName: 'Jupyter Notebook Viewer',
          })
        )
      ).toBe('notebook');
    });
  });

  describe('general fallback', () => {
    it('should return general for unknown extensions', () => {
      expect(
        categorizeExtension(manifest({ name: 'my-extension', displayName: 'My Extension' }))
      ).toBe('general');
    });

    it('should return general for empty manifest', () => {
      expect(categorizeExtension(manifest())).toBe('general');
    });
  });
});
