/**
 * List of well-known, trusted publishers.
 *
 * Extensions from these publishers receive "soft trust" treatment:
 * - Their findings are downgraded one additional severity level
 * - They are NOT completely bypassed (supply chain attacks can hit anyone)
 *
 * This list is intentionally conservative and includes only:
 * - Major IDE vendors (Microsoft, GitHub)
 * - Well-established tool vendors with long track records
 */
export const TRUSTED_PUBLISHERS = [
  // Microsoft official
  'ms-python',
  'ms-vscode',
  'ms-dotnettools',
  'ms-azuretools',
  'ms-toolsai',
  'microsoft',
  'vscode',

  // GitHub
  'github',

  // Major language support
  'golang',
  'rust-lang',
  'redhat',
  'oracle',
  'julialang',

  // Major tool vendors
  'esbenp', // Prettier
  'dbaeumer', // ESLint
  'eamodio', // GitLens

  // Cloud providers
  'amazonwebservices',
  'googlecloudtools',
  'hashicorp',

  // Other major vendors
  'jetbrains',
  'docker',
  'mongodb',
  'prisma',
  'vscjava', // Microsoft Java

  // Popular developer tool vendors
  'formulahendry', // Code Runner (10M+ downloads)
  'ritwickdey', // Live Server (50M+ downloads)
  'humao', // REST Client (5M+ downloads)
  'rangav', // Thunder Client (3M+ downloads)
  'mtxr', // SQLTools
  'cweijan', // Database Client

  // Remote development
  'ms-vscode-remote', // Remote-SSH, Dev Containers, WSL

  // Testing
  'hbenl', // Test Explorer UI
  'firsttris', // Jest Runner
  'orta', // vscode-jest

  // Notebooks
  'ms-toolsai', // Jupyter
];

/**
 * Specific extension IDs that are trusted regardless of publisher.
 * Use this for known extensions from smaller publishers.
 */
export const TRUSTED_EXTENSION_IDS = [
  // These are explicitly trusted extension IDs
  'github.copilot',
  'github.copilot-chat',
  'ms-python.python',
  'ms-python.vscode-pylance',
  'ms-vscode.cpptools',
  'golang.go',
  'rust-lang.rust-analyzer',
];

/**
 * Check if an extension is from a trusted publisher.
 */
export function isTrustedPublisher(publisher: string): boolean {
  const normalized = publisher.toLowerCase();
  return TRUSTED_PUBLISHERS.some((p) => normalized === p.toLowerCase());
}

/**
 * Check if an extension ID is explicitly trusted.
 */
export function isTrustedExtension(extensionId: string): boolean {
  const normalized = extensionId.toLowerCase();
  return TRUSTED_EXTENSION_IDS.some((id) => normalized === id.toLowerCase());
}
