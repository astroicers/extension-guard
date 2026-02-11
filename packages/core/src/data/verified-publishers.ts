/**
 * List of verified publishers from VS Code Marketplace.
 *
 * These publishers have undergone verification by Microsoft and display
 * a verified badge on the marketplace. Extensions from verified publishers
 * are treated similarly to trusted publishers.
 *
 * Note: This list is maintained manually based on known verified publishers.
 * In the future, this could be fetched from the marketplace API.
 */
export const VERIFIED_PUBLISHERS = [
  // Microsoft & GitHub (already trusted, but also verified)
  'microsoft',
  'ms-python',
  'ms-vscode',
  'ms-dotnettools',
  'ms-azuretools',
  'ms-toolsai',
  'ms-vscode-remote',
  'ms-kubernetes-tools',
  'ms-playwright',
  'vscode',
  'github',
  'vscjava',

  // Major cloud providers (verified)
  'amazonwebservices',
  'googlecloudtools',
  'hashicorp',

  // Major language/framework vendors (verified)
  'golang',
  'rust-lang',
  'redhat',
  'oracle',
  'julialang',
  'dart-code',
  'flutter',
  'svelte',
  'vue',
  'angular',
  'astro-build',

  // Major tool vendors (verified)
  'jetbrains',
  'docker',
  'mongodb',
  'prisma',
  'atlassian',
  'gitlab',
  'sourcegraph',
  'snyk-security',
  'sonarqube',
  'datadog',

  // Popular extension vendors (verified)
  'davidanson', // markdownlint
  'esbenp', // Prettier
  'dbaeumer', // ESLint
  'eamodio', // GitLens
  'streetsidesoftware', // Code Spell Checker
  'editorconfig',
  'christian-kohler', // Path Intellisense
  'visualstudioexptteam', // IntelliCode
  'bierner', // Markdown Preview
  'jock', // SVG Viewer
  'pkief', // Material Icon Theme
  'zhuangtongfa', // One Dark Pro
  'mechatroner', // Rainbow CSV
];

/**
 * Check if a publisher is verified on the marketplace.
 */
export function isVerifiedPublisher(publisher: string): boolean {
  const normalized = publisher.toLowerCase();
  return VERIFIED_PUBLISHERS.some((p) => normalized === p.toLowerCase());
}
