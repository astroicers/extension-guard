import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

const SYSTEM_INFO_PATTERNS = [
  { name: 'os.hostname', pattern: /os\.hostname\s*\(\)/g },
  { name: 'os.userInfo', pattern: /os\.userInfo\s*\(\)/g },
  { name: 'os.platform', pattern: /os\.platform\s*\(\)/g },
  { name: 'os.arch', pattern: /os\.arch\s*\(\)/g },
  { name: 'os.networkInterfaces', pattern: /os\.networkInterfaces\s*\(\)/g },
  { name: 'os.cpus', pattern: /os\.cpus\s*\(\)/g },
  { name: 'os.homedir', pattern: /os\.homedir\s*\(\)/g },
  { name: 'process.env', pattern: /process\.env(?:\[|\.)/g },
];

const HTTP_TO_IP_PATTERN = /(?:https?\.request|fetch|axios\.(?:get|post|put|request))\s*\(\s*['"`]https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

export const critDataExfiltration: DetectionRule = {
  id: 'EG-CRIT-001',
  name: 'Data Exfiltration Pattern',
  description: 'Detects code that collects system info and sends it to external servers via IP address',
  severity: 'critical',
  category: 'data-exfiltration',
  mitreAttackId: 'T1041',
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

      // Check for system info collection
      let hasSystemInfo = false;
      let systemInfoPatternName = '';
      let systemInfoLine = 0;

      for (const { name, pattern } of SYSTEM_INFO_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(content);
        if (match) {
          hasSystemInfo = true;
          systemInfoPatternName = name;
          systemInfoLine = content.slice(0, match.index).split('\n').length;
          break;
        }
      }

      // Check for HTTP to IP
      HTTP_TO_IP_PATTERN.lastIndex = 0;
      const httpMatch = HTTP_TO_IP_PATTERN.exec(content);

      if (hasSystemInfo && httpMatch) {
        const httpToIpLine = content.slice(0, httpMatch.index).split('\n').length;
        evidences.push({
          filePath,
          lineNumber: httpToIpLine,
          lineContent: lines[httpToIpLine - 1]?.trim(),
          matchedPattern: `${systemInfoPatternName} + http-to-ip`,
          snippet: `System info (${systemInfoPatternName}) collected at line ${systemInfoLine}, sent to IP at line ${httpToIpLine}`,
        });
      }
    }

    return evidences;
  },
};
