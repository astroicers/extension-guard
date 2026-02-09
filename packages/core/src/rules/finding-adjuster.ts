import type { Finding, Severity } from '../types/index.js';
import type { ExtensionCategory } from '../scanner/extension-categorizer.js';

/**
 * Severity one level below the given severity.
 * Used to downgrade findings that match expected behavior for the category.
 */
const DOWNGRADE_MAP: Record<Severity, Severity> = {
  critical: 'medium',
  high: 'low',
  medium: 'info',
  low: 'info',
  info: 'info',
};

/**
 * Rule IDs and matched patterns that are expected (not suspicious) for each category.
 * When a finding matches, its severity is downgraded.
 */
interface ExpectedBehavior {
  ruleIds?: string[];
  matchedPatterns?: string[];
  categories?: string[];
}

/**
 * For each extension category, define which rule findings are considered
 * expected/legitimate behavior and should be downgraded.
 */
const EXPECTED_BEHAVIORS: Partial<Record<ExtensionCategory, ExpectedBehavior[]>> = {
  'ai-assistant': [
    {
      // AI tools legitimately use child_process, eval for code execution
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
        'eval',
        'Function-constructor',
        'dynamic-require',
      ],
    },
    {
      // AI tools legitimately make network requests
      ruleIds: ['EG-HIGH-002'],
      matchedPatterns: ['dynamic-url', 'unusual-port'],
    },
    {
      // AI tools often read .env for API keys
      ruleIds: ['EG-CRIT-003'],
      matchedPatterns: ['env-file'],
    },
    {
      // AI tools collect system info for telemetry / model context
      ruleIds: ['EG-CRIT-001'],
    },
  ],

  theme: [
    {
      // Theme extensions with bundled JS may trigger obfuscation (false positive)
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
    },
  ],

  language: [
    {
      // Grammar extensions often have high-entropy bundled code or regex-heavy files
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
    },
    {
      // Grammar files use words like "token", "secret" in syntax definitions
      ruleIds: ['EG-HIGH-006'],
      matchedPatterns: ['generic-secret'],
    },
  ],

  scm: [
    {
      // SCM extensions legitimately access git credentials
      ruleIds: ['EG-CRIT-003'],
      matchedPatterns: ['git-credentials'],
    },
    {
      // SCM extensions may spawn git processes
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: ['child_process-exec', 'child_process-execSync', 'child_process-spawn-shell'],
    },
  ],

  debugger: [
    {
      // Debuggers legitimately spawn processes
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
      ],
    },
    {
      // Debuggers may use dynamic require for adapter loading
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: ['dynamic-require'],
    },
  ],

  linter: [
    {
      // Linters legitimately spawn processes (eslint, prettier, etc.)
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
      ],
    },
  ],
};

/**
 * Check if a finding matches an expected behavior definition.
 */
function matchesExpectedBehavior(finding: Finding, behavior: ExpectedBehavior): boolean {
  // Must match rule ID if specified
  if (behavior.ruleIds && !behavior.ruleIds.includes(finding.ruleId)) {
    return false;
  }

  // If matchedPatterns specified, the finding's evidence must match one
  if (behavior.matchedPatterns && behavior.matchedPatterns.length > 0) {
    const pattern = finding.evidence.matchedPattern ?? '';
    if (!behavior.matchedPatterns.some((p) => pattern.includes(p))) {
      return false;
    }
  }

  // If categories specified, the finding's category must match
  if (behavior.categories && behavior.categories.length > 0) {
    if (!behavior.categories.includes(finding.category)) {
      return false;
    }
  }

  return true;
}

/**
 * Adjust findings based on the extension's inferred category.
 * Findings that match expected behavior for the category are downgraded in severity.
 * Returns a new array with adjusted findings (original array is not mutated).
 */
export function adjustFindings(
  findings: Finding[],
  category: ExtensionCategory
): Finding[] {
  const behaviors = EXPECTED_BEHAVIORS[category];

  // No adjustments for 'general' or categories without defined expected behaviors
  if (!behaviors || behaviors.length === 0) {
    return findings;
  }

  return findings.map((finding) => {
    for (const behavior of behaviors) {
      if (matchesExpectedBehavior(finding, behavior)) {
        const downgraded = DOWNGRADE_MAP[finding.severity];
        return {
          ...finding,
          severity: downgraded,
          description: `${finding.description} [Downgraded: expected behavior for ${category} extension]`,
        };
      }
    }
    return finding;
  });
}
