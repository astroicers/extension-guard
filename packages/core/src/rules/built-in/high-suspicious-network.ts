import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

// HTTP requests to IP addresses instead of domains
const HTTP_TO_IP = /(?:fetch|axios(?:\.(?:get|post|put|delete|request))?|https?\.(?:get|post|request)|XMLHttpRequest)\s*\([^)]*['"`]https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

// Dynamic URL construction (template literals or concatenation)
const DYNAMIC_URL = /(?:fetch|axios|https?\.request)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+\s*\w)/g;

// WebSocket connections to IP addresses
const WEBSOCKET_TO_IP = /new\s+WebSocket\s*\(\s*['"`]wss?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

// Unusual ports
const UNUSUAL_PORTS = /['"`]https?:\/\/[^'"`:]+:(?!443|80|8080|3000|8443|5000)[0-9]{2,5}/g;

export const highSuspiciousNetwork: DetectionRule = {
  id: 'EG-HIGH-002',
  name: 'Suspicious Network Activity',
  description: 'Detects network requests to IP addresses, dynamic URLs, or unusual ports',
  severity: 'high',
  category: 'suspicious-network',
  mitreAttackId: 'T1071',
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
      const patterns = [
        { pattern: HTTP_TO_IP, name: 'http-to-ip' },
        { pattern: DYNAMIC_URL, name: 'dynamic-url' },
        { pattern: WEBSOCKET_TO_IP, name: 'websocket-to-ip' },
        { pattern: UNUSUAL_PORTS, name: 'unusual-port' },
      ];

      for (const { pattern, name } of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            matchedPattern: name,
            snippet: match[0].slice(0, 100),
          });
        }
      }
    }

    return evidences;
  },
};
