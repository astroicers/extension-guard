# Extension Guard v0.1.0 Launch Posts

## Hacker News - Show HN

**Title:** Show HN: Extension Guard – CLI scanner to detect malicious VSCode extensions

**Post:**

I built Extension Guard to scan VSCode extensions for malicious behavior - completely offline.

After reading about supply chain attacks targeting IDE extensions, I realized there's no easy way to audit what extensions are actually doing. So I built a CLI tool that:

- Scans extensions locally (no data leaves your machine)
- Detects 7 types of threats: data exfiltration, RCE, credential theft, obfuscated code, hardcoded secrets, etc.
- Generates trust scores (0-100) for each extension
- Outputs SARIF for GitHub Code Scanning integration
- Includes a policy engine for CI/CD pipelines

Works with VS Code, Cursor, Windsurf, and other VS Code forks.

```bash
npm install -g extension-guard
extension-guard scan
```

Built with TypeScript, fully open source (MIT). Looking for feedback on detection rules - what patterns should we add?

GitHub: https://github.com/astroicers/extension-guard

---

## Reddit - r/vscode

**Title:** I built an open-source CLI to scan your VS Code extensions for malicious behavior

**Post:**

Hey everyone!

I've been working on **Extension Guard** - a CLI tool that scans your installed VS Code extensions for security issues.

**Why I built this:**
- Supply chain attacks on IDE extensions are increasing
- Extensions have broad access to your filesystem, network, and credentials
- There's no built-in way to audit what extensions are actually doing

**What it does:**
- 🔒 Runs completely offline (no data uploaded)
- 🔍 Detects data exfiltration, RCE, credential theft, obfuscated code
- 📊 Generates trust scores (0-100)
- 📄 Multiple output formats (Table, JSON, SARIF, Markdown)
- 🔧 Policy engine for CI/CD integration

**Quick start:**
```bash
npm install -g extension-guard
extension-guard scan
```

Also works with Cursor, Windsurf, and other VS Code forks.

It's fully open source (MIT): https://github.com/astroicers/extension-guard

Would love to hear your feedback! What detection patterns would you want to see added?

---

## Reddit - r/netsec

**Title:** Extension Guard: Open-source CLI for detecting malicious VS Code extensions (MITRE ATT&CK mapped)

**Post:**

Released **Extension Guard** - a security scanner for VS Code extensions with findings mapped to MITRE ATT&CK techniques.

**Detection capabilities:**
- T1005: Data from Local System (credential file access)
- T1059: Command and Scripting Interpreter (eval, exec patterns)
- T1041: Exfiltration Over C2 Channel (HTTP to IP addresses)
- T1027: Obfuscated Files or Information (base64, hex encoding, high entropy)
- T1552.001: Credentials In Files (hardcoded secrets)

**Features:**
- Offline analysis (no telemetry)
- SARIF output for GitHub Code Scanning
- Policy engine with allowlist/blocklist for CI/CD
- Trust scoring system

```bash
npm install -g extension-guard
extension-guard scan --format sarif -o results.sarif
```

GitHub: https://github.com/astroicers/extension-guard

Looking for feedback from the security community on detection rules. What patterns have you seen in malicious extensions?

---

## Twitter/X

**Thread:**

🧵 1/5
Just released Extension Guard v0.1.0 - an open-source CLI to scan your VS Code extensions for malicious behavior.

Runs completely offline. No data leaves your machine.

GitHub: https://github.com/astroicers/extension-guard

🔍 2/5
What it detects:
• Data exfiltration
• Remote code execution
• Credential theft
• Obfuscated code
• Hardcoded secrets
• Suspicious network calls

All findings mapped to MITRE ATT&CK.

📊 3/5
Each extension gets a trust score (0-100).

Output formats:
• Terminal table
• JSON
• SARIF (GitHub Code Scanning)
• Markdown

🔧 4/5
CI/CD integration:

```bash
extension-guard audit --fail-on block
```

Exit codes for pipeline automation. Policy engine with allowlist/blocklist.

🚀 5/5
Quick start:

```bash
npm install -g extension-guard
extension-guard scan
```

Works with VS Code, Cursor, Windsurf, and other forks.

MIT licensed. PRs welcome!

#VSCode #Security #OpenSource #DevTools

---

## Dev.to / Medium Article Outline

**Title:** How I Built a Security Scanner for VS Code Extensions

**Sections:**
1. The Problem: Supply chain attacks on IDE extensions
2. What makes extensions dangerous (filesystem, network, credentials access)
3. Architecture: Rule-based detection with MITRE ATT&CK mapping
4. Detection patterns explained (with code examples)
5. Trust scoring algorithm
6. CI/CD integration with policy engine
7. Future roadmap
8. Call to action: Contribute detection rules

---

## Suggested Posting Schedule

| Platform | Best Time (UTC) | Notes |
|----------|-----------------|-------|
| Hacker News | Tuesday-Thursday, 14:00-16:00 | Avoid weekends |
| r/vscode | Weekday, any time | Active community |
| r/netsec | Tuesday-Thursday | Security focus |
| Twitter/X | Tuesday-Thursday, 15:00-17:00 | Thread format |
| Dev.to | Tuesday-Wednesday | Long-form article |
