# Extension Guard for VS Code

Security scanner that detects malicious behaviors in your installed VS Code extensions.

![Extension Guard Sidebar](https://raw.githubusercontent.com/astroicers/extension-guard/main/packages/vscode/resources/screenshot-sidebar.png)

## Features

### Real-time Security Scanning

- **Auto-scan on install** - New extensions are automatically scanned when installed
- **Trust scores** - Each extension gets a 0-100 trust score based on detected risks
- **Risk categorization** - Extensions grouped by risk level (Critical, High, Medium, Safe)

### Sidebar Panel

View all your extensions organized by security risk:

- **Overview** - Quick summary with overall trust score
- **High Risk** - Extensions with critical or high severity findings
- **Medium Risk** - Extensions with medium severity findings
- **Safe** - Extensions with no security concerns

### Detection Rules

Extension Guard detects:

| Risk | Detection |
|------|-----------|
| Critical | Data exfiltration (system info + HTTP to IP) |
| Critical | Remote code execution (eval, exec, spawn) |
| Critical | Credential theft (.ssh, .aws, .env access) |
| High | Obfuscated code (base64, hex, high entropy) |
| High | Suspicious network (HTTP to IP, dynamic URLs) |
| High | Hardcoded secrets (API keys, tokens) |
| Medium | Excessive activation (activationEvents: ["*"]) |

### Warning Dialogs

When a risky extension is detected:

- Modal warning with finding details
- One-click "Disable Extension" action
- "View Details" to see full analysis

### Status Bar

Quick security indicator in your status bar:

- Shield icon shows current security status
- Red when risks detected, green when all safe
- Click to open Extension Guard sidebar

## Commands

Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **Extension Guard: Scan All Extensions** - Manually trigger a full scan
- **Extension Guard: Scan This Extension** - Scan a specific extension

## How It Works

Extension Guard uses the [@aspect-guard/core](https://www.npmjs.com/package/@aspect-guard/core) scanning engine to analyze extension source code for malicious patterns. All analysis runs **locally** - no data is ever uploaded.

The scanner looks for:
- Suspicious API calls (file system, network, process execution)
- Patterns matching known malware techniques
- Code obfuscation and encoding
- Hardcoded credentials and secrets
- Excessive permissions relative to stated functionality

Each finding is mapped to [MITRE ATT&CK](https://attack.mitre.org/) techniques for standardized threat classification.

## Trust Score

Each extension receives a trust score from 0-100:

| Score | Risk Level |
|-------|------------|
| 80-100 | Low risk (Safe) |
| 60-79 | Medium risk |
| 40-59 | High risk |
| 0-39 | Critical risk |

Penalties are applied for:
- Critical findings: -35 points
- High findings: -18 points
- Medium findings: -8 points
- Low findings: -3 points

## CLI Tool

For CI/CD integration and advanced scanning, use the [Extension Guard CLI](https://www.npmjs.com/package/extension-guard):

```bash
npm install -g extension-guard
extension-guard scan
```

Features:
- Policy enforcement with exit codes
- SARIF output for GitHub Code Scanning
- Multi-IDE support (Cursor, Windsurf, VSCodium)

## Privacy

Extension Guard runs **100% offline**. No telemetry, no cloud services, no data collection. All analysis happens on your local machine.

## Requirements

- VS Code 1.85.0 or higher

## Links

- [GitHub Repository](https://github.com/astroicers/extension-guard)
- [CLI on npm](https://www.npmjs.com/package/extension-guard)
- [Report Issues](https://github.com/astroicers/extension-guard/issues)

## License

MIT - see [LICENSE](https://github.com/astroicers/extension-guard/blob/main/LICENSE) for details.
