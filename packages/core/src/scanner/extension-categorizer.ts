import type { ExtensionManifest } from '../types/index.js';

/**
 * Inferred extension category used to adjust finding severity.
 * Extensions in different categories have different "normal" behaviors.
 */
export type ExtensionCategory =
  | 'theme' // Color themes, icon themes — should have zero runtime behavior
  | 'language' // Grammars, syntax highlighting, snippets — minimal runtime
  | 'ai-assistant' // AI coding tools — legitimately need network, process, env
  | 'scm' // Source control — may access git-credentials legitimately
  | 'debugger' // Debuggers — may spawn processes legitimately
  | 'linter' // Linters, formatters — may spawn processes
  | 'language-support' // Language servers, Python, Go, Rust — spawn interpreters/compilers
  | 'developer-tools' // Code runners, REST clients, live servers — spawn processes, network
  | 'remote-development' // Remote-SSH, Dev Containers, WSL — spawn processes, network
  | 'testing' // Test runners — spawn test processes
  | 'notebook' // Jupyter, notebooks — spawn kernels, network
  | 'general'; // Everything else

/**
 * Publishers known to provide language support extensions (Python, Go, Rust, etc.)
 * These extensions legitimately spawn language servers and interpreters.
 */
const LANGUAGE_SUPPORT_PUBLISHERS = [
  'ms-python',
  'ms-vscode',
  'golang',
  'rust-lang',
  'microsoft',
  'redhat',
  'oracle',
  'julialang',
  'haskell',
  // Additional language support publishers
  'zigtools',
  'elixir-lsp',
  'dart-code',
  'scala-lang',
  'vscjava',
  'crystal-lang-tools',
  'nim-lang',
  'vlang-vscode',
];

/**
 * Keywords to detect developer tool extensions (code runners, REST clients, live servers)
 * These extensions legitimately spawn processes and make network requests.
 */
const DEVELOPER_TOOL_KEYWORDS = [
  // Code execution
  'code runner',
  'coderunner',
  'run code',
  'execute code',
  'run script',
  'script runner',
  // REST/API clients
  'rest client',
  'api client',
  'http client',
  'thunder client',
  'postman',
  'insomnia',
  'api tester',
  'http request',
  // Live servers
  'live server',
  'liveserver',
  'live preview',
  'browser sync',
  'browsersync',
  'local server',
  'dev server',
  'http server',
  // Terminal/Shell
  'terminal',
  'shell',
  'integrated terminal',
  // Task runners
  'task runner',
  'npm scripts',
  'gulp',
  'grunt',
  // Database clients
  'database client',
  'sql client',
  'mongodb client',
  'redis client',
];

/**
 * Publishers known to provide developer tools (code runners, REST clients, etc.)
 */
const DEVELOPER_TOOL_PUBLISHERS = [
  'formulahendry', // Code Runner
  'rangav', // Thunder Client
  'humao', // REST Client
  'ritwickdey', // Live Server
  'techer', // Live Server (alternative)
  'negokaz', // Live Server (alternative)
  'qwtel', // HTTP/S Server
  'hediet', // Debug Visualizer
  'mtxr', // SQLTools
  'cweijan', // Database Client
];

/**
 * Keywords to detect remote development extensions (SSH, containers, WSL)
 * These extensions legitimately spawn processes and make network connections.
 */
const REMOTE_DEV_KEYWORDS = [
  'remote-ssh',
  'remote ssh',
  'remote - ssh',
  'dev container',
  'devcontainer',
  'dev-container',
  'docker container',
  'wsl',
  'windows subsystem',
  'remote development',
  'remote explorer',
  'ssh remote',
  'ssh connection',
  'container development',
  'codespace',
  'github codespaces',
  'tunnel',
  'remote tunnels',
];

/**
 * Publishers known to provide remote development extensions.
 */
const REMOTE_DEV_PUBLISHERS = [
  'ms-vscode-remote', // Remote-SSH, Dev Containers, WSL
  'ms-azuretools', // Azure (containers, etc.)
];

/**
 * Keywords to detect testing extensions (test runners, test frameworks)
 * These extensions legitimately spawn test processes.
 */
const TESTING_KEYWORDS = [
  'test runner',
  'test explorer',
  'test adapter',
  'jest runner',
  'mocha test',
  'pytest',
  'vitest',
  'karma',
  'jasmine',
  'cypress',
  'playwright',
  'selenium',
  'unit test',
  'integration test',
  'e2e test',
  'end-to-end test',
  'test coverage',
  'code coverage',
];

/**
 * Publishers known to provide testing extensions.
 */
const TESTING_PUBLISHERS = [
  'hbenl', // Test Explorer UI
  'firsttris', // Jest Runner
  'orta', // Jest (vscode-jest)
  'ms-playwright', // Playwright
];

/**
 * Keywords to detect notebook extensions (Jupyter, etc.)
 * These extensions legitimately spawn kernels and make network requests.
 */
const NOTEBOOK_KEYWORDS = [
  'jupyter',
  'notebook',
  'ipynb',
  'kernel',
  'jupyter notebook',
  'jupyter lab',
  'ipython',
  'data science',
  'interactive python',
];

/**
 * Publishers known to provide notebook extensions.
 */
const NOTEBOOK_PUBLISHERS = [
  'ms-toolsai', // Jupyter
];

const AI_KEYWORDS = [
  'copilot',
  'ai',
  'gpt',
  'llm',
  'chatbot',
  'assistant',
  'autocomplete',
  'code completion',
  'machine learning',
  'neural',
  'openai',
  'anthropic',
  'gemini',
  'claude',
  'codeium',
  'tabnine',
  'kilo',
  'continue',
  'cursor',
  'supermaven',
  // Additional AI tools
  'aider',
  'codestral',
  'mistral',
  'deepseek',
  'qwen',
  'sourcery',
  'codewhisperer',
  'amazon q',
  'bito',
  'blackbox',
  'codegpt',
  'cody', // Sourcegraph
];

/**
 * Infer an extension's category from its manifest (package.json).
 * Uses categories, contributes, keywords, displayName, and description.
 */
export function categorizeExtension(manifest: ExtensionManifest): ExtensionCategory {
  const categories = (manifest.categories ?? []).map((c) => c.toLowerCase());
  const contributes = manifest.contributes ?? {};
  const contributeKeys = Object.keys(contributes);
  const keywords = ((manifest as Record<string, unknown>).keywords as string[] | undefined) ?? [];
  const displayName = (manifest.displayName ?? '').toLowerCase();
  const description = (manifest.description ?? '').toLowerCase();
  const name = (manifest.name ?? '').toLowerCase();

  // Theme: explicit category or only contributes themes
  if (
    categories.includes('themes') ||
    categories.includes('icon themes') ||
    isThemeOnlyExtension(contributeKeys, contributes)
  ) {
    return 'theme';
  }

  // Language/Grammar: contributes grammars or languages with minimal other functionality
  if (isLanguageExtension(contributeKeys, contributes)) {
    return 'language';
  }

  // Remote development: SSH, containers, WSL
  // Must be checked BEFORE language-support (ms-vscode-remote contains ms-vscode)
  if (isRemoteDevelopment(manifest, displayName, description, name)) {
    return 'remote-development';
  }

  // AI assistant: check categories, keywords, name, description
  if (isAIAssistant(categories, keywords, displayName, description, name)) {
    return 'ai-assistant';
  }

  // Language support: extensions that run language servers, interpreters, compilers
  // Must be checked AFTER ai-assistant (some AI tools also have language support)
  if (isLanguageSupport(manifest, categories)) {
    return 'language-support';
  }

  // SCM
  if (categories.includes('scm providers') || contributeKeys.includes('scm')) {
    return 'scm';
  }

  // Debugger
  if (categories.includes('debuggers') || contributeKeys.includes('debuggers')) {
    return 'debugger';
  }

  // Linter / Formatter
  if (
    categories.includes('linters') ||
    categories.includes('formatters') ||
    displayName.includes('lint') ||
    displayName.includes('format') ||
    displayName.includes('prettier') ||
    displayName.includes('eslint')
  ) {
    return 'linter';
  }

  // Developer tools: code runners, REST clients, live servers
  if (isDeveloperTool(manifest, displayName, description, name)) {
    return 'developer-tools';
  }

  // Testing: test runners, test frameworks
  if (isTesting(manifest, categories, displayName, description, name)) {
    return 'testing';
  }

  // Notebook: Jupyter, ipynb
  if (isNotebook(manifest, categories, displayName, description, name, contributeKeys)) {
    return 'notebook';
  }

  return 'general';
}

function isThemeOnlyExtension(
  contributeKeys: string[],
  _contributes: Record<string, unknown>
): boolean {
  const hasThemes = contributeKeys.includes('themes') || contributeKeys.includes('iconThemes');
  if (!hasThemes) return false;

  // If the extension ONLY contributes themes (no commands, no other functionality)
  const functionalKeys = contributeKeys.filter(
    (k) => k !== 'themes' && k !== 'iconThemes' && k !== 'colors'
  );
  return functionalKeys.length === 0;
}

function isLanguageExtension(
  contributeKeys: string[],
  contributes: Record<string, unknown>
): boolean {
  const hasGrammars =
    contributeKeys.includes('grammars') || contributeKeys.includes('languages');
  if (!hasGrammars) return false;

  // Language extension if it contributes grammars/languages but not many commands
  const commands = contributes.commands;
  if (Array.isArray(commands) && commands.length > 3) {
    return false; // Too many commands — likely a full-featured extension
  }

  return true;
}

function isAIAssistant(
  categories: string[],
  keywords: string[],
  displayName: string,
  description: string,
  name: string
): boolean {
  // Check explicit ML category
  if (categories.includes('machine learning') || categories.includes('data science')) {
    return true;
  }

  // Check keywords, displayName, description, name against AI keywords
  const searchableText = [
    ...keywords.map((k) => k.toLowerCase()),
    displayName,
    description,
    name,
  ].join(' ');

  // Use word boundary matching to avoid false positives like "continue" matching "container"
  return AI_KEYWORDS.some((kw) => {
    // For multi-word keywords, use simple includes
    if (kw.includes(' ')) {
      return searchableText.includes(kw);
    }
    // For single-word keywords, use word boundary regex
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(searchableText);
  });
}

/**
 * Detect language support extensions (Python, Go, Rust, Java, C++, etc.)
 * These extensions need to spawn language servers and interpreters.
 */
function isLanguageSupport(manifest: ExtensionManifest, categories: string[]): boolean {
  const publisher = (manifest.publisher ?? '').toLowerCase();

  // Check known language support publishers
  if (LANGUAGE_SUPPORT_PUBLISHERS.some((p) => publisher.includes(p))) {
    return true;
  }

  // Check for "Programming Languages" category
  if (categories.includes('programming languages')) {
    return true;
  }

  return false;
}

/**
 * Detect developer tool extensions (code runners, REST clients, live servers, etc.)
 * These extensions legitimately spawn processes and make network requests.
 */
function isDeveloperTool(
  manifest: ExtensionManifest,
  displayName: string,
  description: string,
  name: string
): boolean {
  const publisher = (manifest.publisher ?? '').toLowerCase();

  // Check known developer tool publishers
  if (DEVELOPER_TOOL_PUBLISHERS.some((p) => publisher === p)) {
    return true;
  }

  // Check displayName, description, name against developer tool keywords
  const searchableText = [displayName, description, name].join(' ');

  return DEVELOPER_TOOL_KEYWORDS.some((kw) => searchableText.includes(kw));
}

/**
 * Detect remote development extensions (SSH, containers, WSL, etc.)
 * These extensions legitimately spawn processes and make network connections.
 */
function isRemoteDevelopment(
  manifest: ExtensionManifest,
  displayName: string,
  description: string,
  name: string
): boolean {
  const publisher = (manifest.publisher ?? '').toLowerCase();

  // Check known remote development publishers
  if (REMOTE_DEV_PUBLISHERS.some((p) => publisher === p)) {
    return true;
  }

  // Check displayName, description, name against remote development keywords
  const searchableText = [displayName, description, name].join(' ');

  return REMOTE_DEV_KEYWORDS.some((kw) => searchableText.includes(kw));
}

/**
 * Detect testing extensions (test runners, test frameworks, etc.)
 * These extensions legitimately spawn test processes.
 */
function isTesting(
  manifest: ExtensionManifest,
  categories: string[],
  displayName: string,
  description: string,
  name: string
): boolean {
  const publisher = (manifest.publisher ?? '').toLowerCase();

  // Check known testing publishers
  if (TESTING_PUBLISHERS.some((p) => publisher === p)) {
    return true;
  }

  // Check for "Testing" category
  if (categories.includes('testing')) {
    return true;
  }

  // Check displayName, description, name against testing keywords
  const searchableText = [displayName, description, name].join(' ');

  return TESTING_KEYWORDS.some((kw) => searchableText.includes(kw));
}

/**
 * Detect notebook extensions (Jupyter, etc.)
 * These extensions legitimately spawn kernels and make network requests.
 */
function isNotebook(
  manifest: ExtensionManifest,
  categories: string[],
  displayName: string,
  description: string,
  name: string,
  contributeKeys: string[]
): boolean {
  const publisher = (manifest.publisher ?? '').toLowerCase();

  // Check known notebook publishers
  if (NOTEBOOK_PUBLISHERS.some((p) => publisher === p)) {
    return true;
  }

  // Check for "Notebooks" category
  if (categories.includes('notebooks')) {
    return true;
  }

  // Check if contributes notebooks
  if (contributeKeys.includes('notebooks') || contributeKeys.includes('notebookRenderer')) {
    return true;
  }

  // Check displayName, description, name against notebook keywords
  const searchableText = [displayName, description, name].join(' ');

  return NOTEBOOK_KEYWORDS.some((kw) => searchableText.includes(kw));
}
