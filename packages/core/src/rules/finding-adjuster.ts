import type { Finding, Severity } from '../types/index.js';
import type { ExtensionCategory } from '../scanner/extension-categorizer.js';
import { isTrustedPublisher, isTrustedExtension } from '../data/trusted-publishers.js';
import { isVerifiedPublisher } from '../data/verified-publishers.js';
import { getPopularityTier } from '../data/popular-extensions.js';

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

  'developer-tools': [
    {
      // Code runners spawn processes to execute code (python, node, bash, etc.)
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
        'eval',
        'Function-constructor',
      ],
    },
    {
      // REST clients, API testers make network requests by design
      ruleIds: ['EG-HIGH-002'],
      matchedPatterns: ['dynamic-url', 'http-to-ip', 'unusual-port'],
    },
    {
      // Live servers spawn HTTP servers on various ports
      ruleIds: ['EG-HIGH-002'],
      matchedPatterns: ['unusual-port'],
    },
    {
      // Developer tools may collect system info for environment detection
      ruleIds: ['EG-CRIT-001'],
    },
    {
      // Developer tools may have bundled code with high entropy
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
    },
  ],

  'remote-development': [
    {
      // Remote extensions spawn SSH, docker, WSL processes
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
      ],
    },
    {
      // Remote extensions make network connections by design
      ruleIds: ['EG-HIGH-002'],
      matchedPatterns: ['dynamic-url', 'http-to-ip', 'unusual-port'],
    },
    {
      // Remote extensions collect system info for environment detection
      ruleIds: ['EG-CRIT-001'],
    },
    {
      // Remote extensions may access SSH keys and credentials legitimately
      ruleIds: ['EG-CRIT-003'],
      matchedPatterns: ['ssh-keys', 'ssh-config'],
    },
    {
      // Remote extensions may have bundled code
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
    },
  ],

  testing: [
    {
      // Test runners spawn test processes
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
      ],
    },
    {
      // Test runners may collect system info for environment detection
      ruleIds: ['EG-CRIT-001'],
    },
    {
      // Test runners may have bundled code
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
    },
  ],

  notebook: [
    {
      // Notebook extensions spawn kernels (Python, Julia, etc.)
      ruleIds: ['EG-CRIT-002'],
      matchedPatterns: [
        'child_process-exec',
        'child_process-execSync',
        'child_process-spawn-shell',
        'dynamic-require',
      ],
    },
    {
      // Notebook extensions make network connections for package management
      ruleIds: ['EG-HIGH-002'],
      matchedPatterns: ['dynamic-url', 'unusual-port'],
    },
    {
      // Notebook extensions collect system info for environment detection
      ruleIds: ['EG-CRIT-001'],
    },
    {
      // Notebook extensions may read environment files for kernel config
      ruleIds: ['EG-CRIT-003'],
      matchedPatterns: ['env-file'],
    },
    {
      // Notebook extensions may have bundled code
      ruleIds: ['EG-HIGH-001'],
      matchedPatterns: ['high-entropy', 'large-base64'],
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
  /** Map of file paths to file contents for bundle detection */
  files?: Map<string, string>;
}

/**
 * Two-level downgrade map (for mega popular extensions)
 */
const DOUBLE_DOWNGRADE_MAP: Record<Severity, Severity> = {
  critical: 'low',
  high: 'info',
  medium: 'info',
  low: 'info',
  info: 'info',
};

/**
 * Adjust findings based on the extension's inferred category and trust status.
 *
 * Four layers of adjustment:
 * 1. Category-based: Expected behaviors for extension type (e.g., AI tools use network)
 * 2. Soft Trust: Trusted publishers get an additional severity downgrade
 * 3. Verified Publisher: Verified publishers on marketplace get severity downgrade
 * 4. Popularity: Extensions with 10M+ downloads get double downgrade, 1M+ get single
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

  // Check trust levels (only if not in strict mode)
  const isTrusted =
    !strictMode &&
    ((publisher && isTrustedPublisher(publisher)) ||
      (extensionId && isTrustedExtension(extensionId)));

  const isVerified = !strictMode && publisher && isVerifiedPublisher(publisher);

  const popularityTier = !strictMode && extensionId ? getPopularityTier(extensionId) : null;

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

    // Layer 3: Verified Publisher adjustment (if not already trusted)
    if (!isTrusted && isVerified && adjustedFinding.severity !== 'info') {
      const downgraded = DOWNGRADE_MAP[adjustedFinding.severity];
      adjustedFinding = {
        ...adjustedFinding,
        severity: downgraded,
      };
      reasons.push(`verified publisher`);
    }

    // Layer 4: Popularity-based adjustment
    if (popularityTier && adjustedFinding.severity !== 'info') {
      if (popularityTier === 'mega') {
        // 10M+ downloads: double downgrade
        const downgraded = DOUBLE_DOWNGRADE_MAP[adjustedFinding.severity];
        adjustedFinding = {
          ...adjustedFinding,
          severity: downgraded,
        };
        reasons.push(`mega popular (10M+ downloads)`);
      } else if (popularityTier === 'popular') {
        // 1M+ downloads: single downgrade
        const downgraded = DOWNGRADE_MAP[adjustedFinding.severity];
        adjustedFinding = {
          ...adjustedFinding,
          severity: downgraded,
        };
        reasons.push(`popular (1M+ downloads)`);
      }
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
