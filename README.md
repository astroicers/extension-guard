# Extension Guard

CLI-first security scanner for VSCode extensions. Detect malicious behaviors, generate trust scores, and enforce security policies in your CI/CD pipeline.

## Features

- **Offline scanning** - All analysis runs locally, no data uploaded
- **Multi-IDE support** - VS Code, Cursor, Windsurf, Trae, VSCodium
- **7 detection rules** - Data exfiltration, RCE, credential theft, obfuscation, and more
- **Trust scoring** - 0-100 score based on findings severity
- **Multiple output formats** - Table, JSON, SARIF (GitHub Code Scanning), Markdown
- **Policy engine** - Enforce security policies in CI/CD with exit codes
- **MITRE ATT&CK mapping** - Findings mapped to attack techniques

## Installation

```bash
npm install -g extension-guard
```

## Quick Start

```bash
# Scan all installed extensions
extension-guard scan

# Scan specific IDE
extension-guard scan --ide cursor

# Output as JSON
extension-guard scan --format json -o report.json

# Output as SARIF for GitHub Code Scanning
extension-guard scan --format sarif -o report.sarif
```

## Detection Rules

| Rule ID | Severity | Description |
|---------|----------|-------------|
| EG-CRIT-001 | Critical | Data exfiltration (system info collection + HTTP to IP) |
| EG-CRIT-002 | Critical | Remote code execution (eval, exec, spawn) |
| EG-CRIT-003 | Critical | Credential access (.ssh, .aws, .env files) |
| EG-HIGH-001 | High | Obfuscated code (base64, hex encoding, high entropy) |
| EG-HIGH-002 | High | Suspicious network (HTTP to IP, dynamic URLs) |
| EG-HIGH-006 | High | Hardcoded secrets (API keys, tokens, passwords) |
| EG-MED-001 | Medium | Excessive activation (activationEvents: ["*"]) |

## Policy Engine (CI/CD)

Create `.extension-guard.json` in your project:

```json
{
  "version": "1.0",
  "policy": {
    "blocklist": ["malicious.extension"],
    "rules": {
      "minTrustScore": { "threshold": 70, "action": "block" },
      "blockObfuscated": { "enabled": true, "action": "warn" },
      "requireVerifiedPublisher": { "enabled": true, "action": "info" }
    }
  }
}
```

Run audit in CI:

```bash
# Fail if any blocking violations
extension-guard audit --config .extension-guard.json

# Fail on warnings too
extension-guard audit --fail-on warn
```

Exit codes:
- `0` - No violations at or above fail-on level
- `1` - Violations found
- `2` - Config file not found

## Output Formats

### Table (default)
Human-readable terminal output with colors and formatting.

### JSON
```bash
extension-guard scan --format json -o report.json
```

### SARIF
For GitHub Code Scanning integration:
```bash
extension-guard scan --format sarif -o results.sarif
```

### Markdown
```bash
extension-guard scan --format markdown -o report.md
```

## CLI Reference

```bash
# Scan commands
extension-guard scan [options]
  -i, --ide <ide>          Target IDE (vscode, cursor, windsurf, trae, vscodium)
  -p, --path <paths...>    Custom extension paths
  -f, --format <format>    Output format (table, json, sarif, markdown)
  -o, --output <file>      Output file path
  --include-safe           Include extensions with no findings
  -q, --quiet              Suppress progress output

# Audit command (CI/CD)
extension-guard audit [options]
  -c, --config <path>      Policy config file (default: .extension-guard.json)
  --fail-on <level>        Fail on: block, warn, info (default: block)
  -f, --format <format>    Output format
  -o, --output <file>      Output file path

# Other
extension-guard --version
extension-guard --help
```

## Trust Score

Each extension receives a trust score from 0-100:

| Score | Risk Level |
|-------|------------|
| 80-100 | Low risk |
| 60-79 | Medium risk |
| 40-59 | High risk |
| 0-39 | Critical risk |

Penalties:
- Critical finding: -35 points
- High finding: -18 points
- Medium finding: -8 points
- Low finding: -3 points
- Info finding: -1 point

## Programmatic API

```typescript
import { ExtensionGuardScanner, JsonReporter, SarifReporter } from '@aspect-guard/core';

const scanner = new ExtensionGuardScanner();
const report = await scanner.scan({ ide: 'vscode' });

// Generate JSON report
const jsonReporter = new JsonReporter();
console.log(jsonReporter.generate(report));

// Generate SARIF report
const sarifReporter = new SarifReporter();
console.log(sarifReporter.generate(report));
```

## License

MIT
