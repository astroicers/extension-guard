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
  | 'general'; // Everything else

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

  // AI assistant: check categories, keywords, name, description
  if (isAIAssistant(categories, keywords, displayName, description, name)) {
    return 'ai-assistant';
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

  return AI_KEYWORDS.some((kw) => searchableText.includes(kw));
}
