import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

const SENSITIVE_PATHS = [
  { name: 'ssh-keys', pattern: /['"`][^'"`]*\.ssh[/\\](?:id_rsa|id_ed25519|id_ecdsa|known_hosts|config|authorized_keys)[^'"`]*['"`]/gi },
  { name: 'gnupg', pattern: /['"`][^'"`]*\.gnupg[/\\][^'"`]*['"`]/gi },
  { name: 'aws-credentials', pattern: /['"`][^'"`]*\.aws[/\\]credentials[^'"`]*['"`]/gi },
  { name: 'azure-config', pattern: /['"`][^'"`]*\.azure[/\\][^'"`]*['"`]/gi },
  { name: 'kube-config', pattern: /['"`][^'"`]*\.kube[/\\]config[^'"`]*['"`]/gi },
  { name: 'git-credentials', pattern: /['"`][^'"`]*\.git-credentials[^'"`]*['"`]/gi },
  { name: 'env-file', pattern: /['"`][^'"`]*\.env(?:\.\w+)?['"`]/gi },
  { name: 'npmrc', pattern: /['"`][^'"`]*\.npmrc[^'"`]*['"`]/gi },
  { name: 'docker-config', pattern: /['"`][^'"`]*\.docker[/\\]config\.json[^'"`]*['"`]/gi },
  { name: 'netrc', pattern: /['"`][^'"`]*\.netrc[^'"`]*['"`]/gi },
];

const FILE_READ_CONTEXT = /(?:readFile|readFileSync|createReadStream|access|accessSync|exists|existsSync|stat|statSync|open|openSync)/;

export const critCredentialAccess: DetectionRule = {
  id: 'EG-CRIT-003',
  name: 'Credential File Access',
  description: 'Detects attempts to read sensitive credential files like SSH keys, AWS credentials, or .env files',
  severity: 'critical',
  category: 'credential-theft',
  mitreAttackId: 'T1552.004',
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

      for (const { name, pattern } of SENSITIVE_PATHS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const startIndex = Math.max(0, match.index - 200);
          const endIndex = Math.min(content.length, match.index + match[0].length + 200);
          const context = content.slice(startIndex, endIndex);

          if (FILE_READ_CONTEXT.test(context)) {
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
      }
    }

    return evidences;
  },
};
