# [0.6.0](https://github.com/astroicers/extension-guard/compare/v0.5.7...v0.6.0) (2026-02-14)


### Features

* **vscode:** add extension detail panel for viewing security findings ([84ff980](https://github.com/astroicers/extension-guard/commit/84ff98092097fd2c41e60adc495d7ea6bff16df4))

## [0.5.8](https://github.com/astroicers/extension-guard/compare/v0.5.7...v0.5.8) (2026-02-14)


### Features

* **vscode:** add extension detail panel with security findings view ([extension-detail-panel](https://github.com/astroicers/extension-guard/commit/extension-detail-panel))
  - Click extension in sidebar to view detailed security information
  - Display trust score, risk level, publisher, license, categories
  - Show all security findings with severity, rule ID, description
  - Code snippets with context lines and line highlighting
  - Clickable file paths to navigate directly to source code
  - Remediation guidance and MITRE ATT&CK references
  - Actions: Disable extension, View in Extensions, Re-scan

## [0.5.7](https://github.com/astroicers/extension-guard/compare/v0.5.6...v0.5.7) (2026-02-12)


### Features

* **scanner:** auto-exclude extension-guard-vscode from scanning itself ([#self-exclusion](https://github.com/astroicers/extension-guard/issues/self-exclusion))
  - Add `SELF_EXTENSION_IDS` constant and `isSelfExtension()` helper
  - Add `includeSelfExtensions` option in `ScanOptions` (default: false)
  - Add `skippedExtensions` field in `FullScanReport`
  - Display skipped extensions in CLI output

## [0.5.6](https://github.com/astroicers/extension-guard/compare/v0.5.5...v0.5.6) (2026-02-11)


### Bug Fixes

* marketplace publish with correct PAT ([ea29b01](https://github.com/astroicers/extension-guard/commit/ea29b0190681e4839eeeb90a5ed6cd10c35878fa))

## [0.5.5](https://github.com/astroicers/extension-guard/compare/v0.5.4...v0.5.5) (2026-02-11)


### Bug Fixes

* publish with new VSCE_PAT token ([10a24a0](https://github.com/astroicers/extension-guard/commit/10a24a090e2f289d7b5e6fa0d7cbd1e0a2ea216c))

## [0.5.4](https://github.com/astroicers/extension-guard/compare/v0.5.3...v0.5.4) (2026-02-11)


### Bug Fixes

* retry marketplace publish ([b58cc51](https://github.com/astroicers/extension-guard/commit/b58cc516b75e3bca089e2b80348cfbc621f5ec3d))

## [0.5.3](https://github.com/astroicers/extension-guard/compare/v0.5.2...v0.5.3) (2026-02-11)


### Bug Fixes

* trigger release with updated VSCE_PAT ([b2c0e57](https://github.com/astroicers/extension-guard/commit/b2c0e575c83a59771c02fbddda73e555b78a2635))

## [0.5.2](https://github.com/astroicers/extension-guard/compare/v0.5.1...v0.5.2) (2026-02-11)


### Bug Fixes

* formatting for CI ([71d3418](https://github.com/astroicers/extension-guard/commit/71d341809508d933882ee05cce62460caab4db22))

## [0.5.1](https://github.com/astroicers/extension-guard/compare/v0.5.0...v0.5.1) (2026-02-11)


### Performance Improvements

* **scanner:** implement concurrent extension scanning ([989b1d9](https://github.com/astroicers/extension-guard/commit/989b1d9f4cdb8f1973144d430be900627d0b39b6))

# [0.5.0](https://github.com/astroicers/extension-guard/compare/v0.4.0...v0.5.0) (2026-02-11)


### Bug Fixes

* **ci:** upgrade Node.js to 22 for semantic-release ([4859613](https://github.com/astroicers/extension-guard/commit/48596139a5d7167d4d58bd94e4cbb97c424ef693))
* formatting and TypeScript errors for CI ([b49aa35](https://github.com/astroicers/extension-guard/commit/b49aa352b5be0a95e32d052ad2e6484ff1a0f17b))
* remove broken screenshot image from vscode README ([de634c9](https://github.com/astroicers/extension-guard/commit/de634c9fc5bd97f8f2334065d5e2d4da2c11a24c))
* **vscode:** use VS Code API for extension path detection ([a698d7c](https://github.com/astroicers/extension-guard/commit/a698d7ced9e1a00a76c575c124a28aa9c17a3fe9))


### Features

* **ci:** add semantic-release for automatic versioning ([b7b8b0f](https://github.com/astroicers/extension-guard/commit/b7b8b0ff2dbfb89767ec82dd45d54c29eb8829e8))
* **core:** expand IDE path detection to support 19 VS Code variants ([62e9924](https://github.com/astroicers/extension-guard/commit/62e9924f775f33efcc1771a9ae69406f17f27b0a))
* **vscode:** add security report webview panel ([39420b4](https://github.com/astroicers/extension-guard/commit/39420b4cafb04db42cd2e85fd4fd52cf1f764d9d))
