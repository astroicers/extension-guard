# Contributing to Extension Guard

Thank you for your interest in contributing to Extension Guard!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/aspect-guard/extension-guard.git
cd extension-guard

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
extension-guard/
├── packages/
│   ├── core/          # Core scanning engine (@aspect-guard/core)
│   │   ├── src/
│   │   │   ├── scanner/   # IDE detection, file collection
│   │   │   ├── rules/     # Detection rules
│   │   │   ├── reporter/  # Output formatters
│   │   │   ├── policy/    # Policy engine
│   │   │   └── types/     # TypeScript types
│   │   └── test/
│   └── cli/           # CLI application (extension-guard)
├── schemas/           # JSON schemas
└── docs/              # Documentation
```

## Adding a New Detection Rule

1. Create the rule file in `packages/core/src/rules/built-in/`:

```typescript
// packages/core/src/rules/built-in/high-example-rule.ts
import type { DetectionRule, Finding, Extension, ExtensionFile } from '../../types/index.js';

export const exampleRule: DetectionRule = {
  id: 'EG-HIGH-XXX',
  name: 'Example Rule',
  description: 'Detects example pattern',
  severity: 'high',
  tags: ['example'],
  mitre: ['T1234'],

  analyze(extension: Extension, files: ExtensionFile[]): Finding[] {
    const findings: Finding[] = [];
    // Your detection logic here
    return findings;
  }
};
```

2. Add tests in `packages/core/test/rules/`:

```typescript
// packages/core/test/rules/high-example-rule.test.ts
import { describe, it, expect } from 'vitest';
import { exampleRule } from '../../src/rules/built-in/high-example-rule.js';

describe('EG-HIGH-XXX: Example Rule', () => {
  it('should detect example pattern', () => {
    // Test implementation
  });
});
```

3. Register the rule in `packages/core/src/rules/built-in/index.ts`

4. Run tests: `pnpm test`

## Rule ID Convention

- `EG-CRIT-XXX` - Critical severity (data exfiltration, RCE)
- `EG-HIGH-XXX` - High severity (obfuscation, suspicious network)
- `EG-MED-XXX` - Medium severity (excessive permissions)
- `EG-LOW-XXX` - Low severity (best practice violations)
- `EG-INFO-XXX` - Informational

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for your changes
4. Ensure all tests pass: `pnpm test`
5. Ensure code is formatted: `pnpm format`
6. Commit with conventional commits: `git commit -m "feat: add new rule"`
7. Push and create a Pull Request

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

## Code Style

- TypeScript strict mode
- ESM modules
- Prettier for formatting
- Vitest for testing

## Questions?

Open an issue or start a discussion on GitHub.
