/**
 * List of popular extensions with high download counts.
 *
 * Extensions with millions of downloads have been vetted by the community
 * through widespread usage. Supply chain attacks on these would be extremely
 * visible and risky for attackers.
 *
 * Threshold tiers:
 * - 10M+ downloads: Highest trust (downgrade by 2 severity levels)
 * - 1M+ downloads: High trust (downgrade by 1 severity level)
 *
 * Note: This data is manually maintained. In the future, this could be
 * fetched from the marketplace API and cached locally.
 *
 * Last updated: 2026-02
 */

export interface PopularExtension {
  id: string;
  downloads: number;
  tier: 'mega' | 'popular'; // mega: 10M+, popular: 1M+
}

/**
 * Extensions with 10M+ downloads (mega popular)
 */
export const MEGA_POPULAR_EXTENSIONS: PopularExtension[] = [
  // Python ecosystem
  { id: 'ms-python.python', downloads: 120_000_000, tier: 'mega' },
  { id: 'ms-python.vscode-pylance', downloads: 80_000_000, tier: 'mega' },

  // C/C++
  { id: 'ms-vscode.cpptools', downloads: 60_000_000, tier: 'mega' },

  // GitHub Copilot
  { id: 'github.copilot', downloads: 50_000_000, tier: 'mega' },
  { id: 'github.copilot-chat', downloads: 30_000_000, tier: 'mega' },

  // ESLint & Prettier
  { id: 'dbaeumer.vscode-eslint', downloads: 45_000_000, tier: 'mega' },
  { id: 'esbenp.prettier-vscode', downloads: 50_000_000, tier: 'mega' },

  // Live Server
  { id: 'ritwickdey.liveserver', downloads: 60_000_000, tier: 'mega' },

  // GitLens
  { id: 'eamodio.gitlens', downloads: 40_000_000, tier: 'mega' },

  // Docker
  { id: 'ms-azuretools.vscode-docker', downloads: 35_000_000, tier: 'mega' },

  // Remote Development
  { id: 'ms-vscode-remote.remote-ssh', downloads: 25_000_000, tier: 'mega' },
  { id: 'ms-vscode-remote.remote-containers', downloads: 20_000_000, tier: 'mega' },
  { id: 'ms-vscode-remote.remote-wsl', downloads: 20_000_000, tier: 'mega' },

  // IntelliCode
  { id: 'visualstudioexptteam.vscodeintellicode', downloads: 40_000_000, tier: 'mega' },

  // Path Intellisense
  { id: 'christian-kohler.path-intellisense', downloads: 20_000_000, tier: 'mega' },

  // Material Icon Theme
  { id: 'pkief.material-icon-theme', downloads: 30_000_000, tier: 'mega' },

  // One Dark Pro
  { id: 'zhuangtongfa.material-theme', downloads: 15_000_000, tier: 'mega' },

  // Bracket Pair Colorizer (now built-in but still installed)
  { id: 'coenraads.bracket-pair-colorizer-2', downloads: 12_000_000, tier: 'mega' },

  // Code Runner
  { id: 'formulahendry.code-runner', downloads: 20_000_000, tier: 'mega' },

  // Auto Rename Tag
  { id: 'formulahendry.auto-rename-tag', downloads: 18_000_000, tier: 'mega' },

  // Code Spell Checker
  { id: 'streetsidesoftware.code-spell-checker', downloads: 15_000_000, tier: 'mega' },

  // Markdown All in One
  { id: 'yzhang.markdown-all-in-one', downloads: 12_000_000, tier: 'mega' },

  // Debugger for Chrome (deprecated but still installed)
  { id: 'msjsdiag.debugger-for-chrome', downloads: 25_000_000, tier: 'mega' },

  // Go
  { id: 'golang.go', downloads: 15_000_000, tier: 'mega' },

  // Java
  { id: 'redhat.java', downloads: 20_000_000, tier: 'mega' },
  { id: 'vscjava.vscode-java-debug', downloads: 15_000_000, tier: 'mega' },
  { id: 'vscjava.vscode-java-pack', downloads: 18_000_000, tier: 'mega' },

  // C#
  { id: 'ms-dotnettools.csharp', downloads: 25_000_000, tier: 'mega' },
];

/**
 * Extensions with 1M-10M downloads (popular)
 */
export const POPULAR_EXTENSIONS: PopularExtension[] = [
  // REST Clients
  { id: 'humao.rest-client', downloads: 5_000_000, tier: 'popular' },
  { id: 'rangav.vscode-thunder-client', downloads: 3_000_000, tier: 'popular' },

  // Database
  { id: 'mtxr.sqltools', downloads: 4_000_000, tier: 'popular' },
  { id: 'cweijan.vscode-database-client2', downloads: 2_000_000, tier: 'popular' },

  // Jupyter
  { id: 'ms-toolsai.jupyter', downloads: 8_000_000, tier: 'popular' },
  { id: 'ms-toolsai.jupyter-keymap', downloads: 5_000_000, tier: 'popular' },

  // Kubernetes
  { id: 'ms-kubernetes-tools.vscode-kubernetes-tools', downloads: 4_000_000, tier: 'popular' },

  // Vue / React / Angular
  { id: 'vue.volar', downloads: 8_000_000, tier: 'popular' },
  { id: 'dsznajder.es7-react-js-snippets', downloads: 9_000_000, tier: 'popular' },
  { id: 'angular.ng-template', downloads: 5_000_000, tier: 'popular' },

  // Svelte
  { id: 'svelte.svelte-vscode', downloads: 3_000_000, tier: 'popular' },

  // Astro
  { id: 'astro-build.astro-vscode', downloads: 2_000_000, tier: 'popular' },

  // Tailwind CSS
  { id: 'bradlc.vscode-tailwindcss', downloads: 8_000_000, tier: 'popular' },

  // YAML
  { id: 'redhat.vscode-yaml', downloads: 9_000_000, tier: 'popular' },

  // XML
  { id: 'redhat.vscode-xml', downloads: 6_000_000, tier: 'popular' },

  // Rust
  { id: 'rust-lang.rust-analyzer', downloads: 5_000_000, tier: 'popular' },

  // PowerShell
  { id: 'ms-vscode.powershell', downloads: 8_000_000, tier: 'popular' },

  // Terraform
  { id: 'hashicorp.terraform', downloads: 9_000_000, tier: 'popular' },

  // TODO Highlight
  { id: 'wayou.vscode-todo-highlight', downloads: 6_000_000, tier: 'popular' },

  // Bookmarks
  { id: 'alefragnani.bookmarks', downloads: 5_000_000, tier: 'popular' },

  // Project Manager
  { id: 'alefragnani.project-manager', downloads: 4_000_000, tier: 'popular' },

  // Rainbow CSV
  { id: 'mechatroner.rainbow-csv', downloads: 4_000_000, tier: 'popular' },

  // Markdown Preview
  { id: 'bierner.markdown-preview-github-styles', downloads: 3_000_000, tier: 'popular' },

  // markdownlint
  { id: 'davidanson.vscode-markdownlint', downloads: 6_000_000, tier: 'popular' },

  // Error Lens
  { id: 'usernamehw.errorlens', downloads: 5_000_000, tier: 'popular' },

  // Playwright
  { id: 'ms-playwright.playwright', downloads: 2_000_000, tier: 'popular' },

  // Jest
  { id: 'orta.vscode-jest', downloads: 3_000_000, tier: 'popular' },

  // Swagger / OpenAPI
  { id: 'arjun.swagger-viewer', downloads: 2_000_000, tier: 'popular' },

  // Figma
  { id: 'figma.figma-vscode-extension', downloads: 1_000_000, tier: 'popular' },

  // Atlassian
  { id: 'atlassian.atlascode', downloads: 2_000_000, tier: 'popular' },
];

/**
 * All popular extensions combined
 */
export const ALL_POPULAR_EXTENSIONS: PopularExtension[] = [
  ...MEGA_POPULAR_EXTENSIONS,
  ...POPULAR_EXTENSIONS,
];

/**
 * Get popularity tier for an extension.
 * Returns null if not in the popular extensions list.
 */
export function getPopularityTier(extensionId: string): 'mega' | 'popular' | null {
  const normalized = extensionId.toLowerCase();
  const ext = ALL_POPULAR_EXTENSIONS.find((e) => e.id.toLowerCase() === normalized);
  return ext?.tier ?? null;
}

/**
 * Check if an extension is mega popular (10M+ downloads)
 */
export function isMegaPopular(extensionId: string): boolean {
  return getPopularityTier(extensionId) === 'mega';
}

/**
 * Check if an extension is popular (1M+ downloads)
 */
export function isPopular(extensionId: string): boolean {
  return getPopularityTier(extensionId) !== null;
}
