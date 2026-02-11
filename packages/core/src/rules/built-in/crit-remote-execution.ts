import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';
import { matchPatternsInFiles, type MatchPattern } from '../pattern-matcher.js';

const PATTERNS: MatchPattern[] = [
  { name: 'eval', pattern: /\beval\s*\(/g },
  { name: 'Function-constructor', pattern: /new\s+Function\s*\(/g },
  {
    name: 'child_process-exec',
    pattern: /(?:require\s*\(\s*['"]child_process['"]\s*\)|child_process)\.exec\s*\(/g,
  },
  {
    name: 'child_process-execSync',
    pattern: /(?:require\s*\(\s*['"]child_process['"]\s*\)|child_process)\.execSync\s*\(/g,
  },
  { name: 'child_process-spawn-shell', pattern: /\.spawn\s*\([^)]*\{[^}]*shell\s*:\s*true/g },
  { name: 'vm-runInContext', pattern: /vm\.run(?:InContext|InNewContext|InThisContext)\s*\(/g },
  { name: 'vm-Script', pattern: /new\s+vm\.Script\s*\(/g },
  { name: 'dynamic-require', pattern: /require\s*\(\s*(?:[^'"`\s)]|`[^`]*\$\{)/g },
];

export const critRemoteExecution: DetectionRule = {
  id: 'EG-CRIT-002',
  name: 'Remote Code Execution',
  description: 'Detects dangerous code execution patterns like eval, exec, or dynamic require',
  severity: 'critical',
  category: 'remote-code-execution',
  mitreAttackId: 'T1059',
  enabled: true,

  detect(files: Map<string, string>, _manifest: ExtensionManifest): Evidence[] {
    return matchPatternsInFiles(files, PATTERNS);
  },
};
