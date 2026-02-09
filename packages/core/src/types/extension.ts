export interface ExtensionInfo {
  id: string;
  displayName: string;
  version: string;
  publisher: {
    name: string;
    verified: boolean;
  };
  description: string;
  categories: string[];
  activationEvents: string[];
  extensionDependencies: string[];
  installPath: string;
  engines: { vscode: string };
  repository?: string;
  license?: string;
  fileCount: number;
  totalSize: number;
}

export interface ExtensionManifest {
  name: string;
  publisher: string;
  version: string;
  displayName?: string;
  description?: string;
  categories?: string[];
  activationEvents?: string[];
  contributes?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  main?: string;
  browser?: string;
  engines?: { vscode?: string };
  repository?: string | { url: string };
  license?: string;
  [key: string]: unknown;
}
