import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';
import { matchPatternsInFiles, type MatchPattern } from '../pattern-matcher.js';

const PATTERNS: MatchPattern[] = [
  // HTTP requests to IP addresses instead of domains
  {
    name: 'http-to-ip',
    pattern:
      /(?:fetch|axios(?:\.(?:get|post|put|delete|request))?|https?\.(?:get|post|request)|XMLHttpRequest)\s*\([^)]*['"`]https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
  },
  // Dynamic URL construction (template literals or concatenation)
  {
    name: 'dynamic-url',
    pattern: /(?:fetch|axios|https?\.request)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+\s*\w)/g,
  },
  // WebSocket connections to IP addresses
  {
    name: 'websocket-to-ip',
    pattern: /new\s+WebSocket\s*\(\s*['"`]wss?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
  },
  // Unusual ports
  {
    name: 'unusual-port',
    pattern: /['"`]https?:\/\/[^'"`:]+:(?!443|80|8080|3000|8443|5000)[0-9]{2,5}/g,
  },
];

export const highSuspiciousNetwork: DetectionRule = {
  id: 'EG-HIGH-002',
  name: 'Suspicious Network Activity',
  description: 'Detects network requests to IP addresses, dynamic URLs, or unusual ports',
  severity: 'high',
  category: 'suspicious-network',
  mitreAttackId: 'T1071',
  enabled: true,

  detect(files: Map<string, string>, _manifest: ExtensionManifest): Evidence[] {
    return matchPatternsInFiles(files, PATTERNS);
  },
};
