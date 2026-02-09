import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

const DANGEROUS_PATTERNS = [
  { name: 'eval', pattern: /\beval\s*\(/g },
  { name: 'Function-constructor', pattern: /new\s+Function\s*\(/g },
  { name: 'child_process-exec', pattern: /(?:require\s*\(\s*['"]child_process['"]\s*\)|child_process)\.exec\s*\(/g },
  { name: 'child_process-execSync', pattern: /(?:require\s*\(\s*['"]child_process['"]\s*\)|child_process)\.execSync\s*\(/g },
  { name: 'child_process-spawn-shell', pattern: /\.spawn\s*\([^)]*\{[^}]*shell\s*:\s*true/g },
  { name: 'vm-runInContext', pattern: /vm\.run(?:InContext|InNewContext|InThisContext)\s*\(/g },
  { name: 'vm-Script', pattern: /new\s+vm\.Script\s*\(/g },
];

const DYNAMIC_REQUIRE = /require\s*\(\s*(?:[^'"`\s)]|`[^`]*\$\{)/g;

export const critRemoteExecution: DetectionRule = {
  id: 'EG-CRIT-002',
  name: 'Remote Code Execution',
  description: 'Detects dangerous code execution patterns like eval, exec, or dynamic require',
  severity: 'critical',
  category: 'remote-code-execution',
  mitreAttackId: 'T1059',
  enabled: true,

  detect(
    files: Map<string, string>,
    _manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    for (const [filePath, content] of files) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
        continue;
      }

      const lines = content.split('\n');

      for (const { name, pattern } of DANGEROUS_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            matchedPattern: name,
            snippet: match[0],
          });
        }
      }

      DYNAMIC_REQUIRE.lastIndex = 0;
      let match;
      while ((match = DYNAMIC_REQUIRE.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim(),
          matchedPattern: 'dynamic-require',
          snippet: match[0],
        });
      }
    }

    return evidences;
  },
};
