import type { Finding, Severity } from '../types/index.js';
import type { ExtensionCategory } from '../scanner/extension-categorizer.js';
import { isTrustedPublisher, isTrustedExtension } from '../data/trusted-publishers.js';

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
      // This includes os.hostname, os.platform, os.userInfo, process.env, etc.
      ruleIds: ['EG-CRIT-001'],
    },
    {
      // AI tools may have obfuscated/minified bundled code
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
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

  'language-support': [
    {
      // Language servers spawn interpreters/compilers (python, go, rustc, javac)
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
        'dynamic-require',
      ],
    },
    {
      // Language servers may collect system info for environment detection
      ruleIds: ['EG-CRIT-001'],
    },
    {
      // Language servers may have bundled code with high entropy
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
    },
    {
      // Language servers may make network requests for package management
      ruleIds: ['EG-HIGH-002'],
      matchedPatterns: ['dynamic-url'],
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
 * Options for adjusting findings.
 */
export interface AdjustFindingsOptions {
  /** Publisher name for soft trust check */
  publisher?: string;
  /** Full extension ID (publisher.name) for soft trust check */
  extensionId?: string;
  /** Skip soft trust adjustments (strict mode) */
  strictMode?: boolean;
}

/**
 * Adjust findings based on the extension's inferred category and trust status.
 *
 * Two layers of adjustment:
 * 1. Category-based: Expected behaviors for extension type (e.g., AI tools use network)
 * 2. Soft Trust: Trusted publishers get an additional severity downgrade
 *
 * Returns a new array with adjusted findings (original array is not mutated).
 */
export function adjustFindings(
  findings: Finding[],
  category: ExtensionCategory,
  options: AdjustFindingsOptions = {}
): Finding[] {
  const { publisher, extensionId, strictMode = false } = options;
  const behaviors = EXPECTED_BEHAVIORS[category];

  // Check if this is a trusted extension
  const isTrusted =
    !strictMode &&
    ((publisher && isTrustedPublisher(publisher)) ||
      (extensionId && isTrustedExtension(extensionId)));

  return findings.map((finding) => {
    let adjustedFinding = finding;
    let reasons: string[] = [];

    // Layer 1: Category-based adjustment
    if (behaviors && behaviors.length > 0) {
      for (const behavior of behaviors) {
        if (matchesExpectedBehavior(finding, behavior)) {
          const downgraded = DOWNGRADE_MAP[adjustedFinding.severity];
          adjustedFinding = {
            ...adjustedFinding,
            severity: downgraded,
          };
          reasons.push(`expected behavior for ${category} extension`);
          break;
        }
      }
    }

    // Layer 2: Soft Trust adjustment (additional downgrade for trusted publishers)
    if (isTrusted && adjustedFinding.severity !== 'info') {
      const downgraded = DOWNGRADE_MAP[adjustedFinding.severity];
      adjustedFinding = {
        ...adjustedFinding,
        severity: downgraded,
      };
      reasons.push(`trusted publisher`);
    }

    // Add reason to description if any adjustments were made
    if (reasons.length > 0) {
      adjustedFinding = {
        ...adjustedFinding,
        description: `${finding.description} [Downgraded: ${reasons.join(' + ')}]`,
      };
    }

    return adjustedFinding;
  });
}
