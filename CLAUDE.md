# Extension Guard — Claude Code 開發指引

## 專案概述

CLI-first 的 VSCode Extension 供應鏈安全掃描工具。掃描已安裝的 IDE extensions，偵測惡意行為、洩漏的 secrets、過度權限、已知威脅。

**核心原則：**
- 離線優先：所有分析在本機完成，不上傳任何資料到雲端
- CLI-First：核心引擎獨立於任何 IDE，可在 terminal、CI/CD、Docker 中執行
- 開源透明：掃描邏輯完全公開，使用者可以審查和貢獻規則
- 零信任掃描：在 IDE 外部獨立執行，不受被掃描對象影響

## Monorepo 結構

```
extension-guard/
├── packages/
│   ├── core/          # @aspect-guard/core - 核心掃描引擎（純 TypeScript，零 IDE 依賴）
│   ├── cli/           # extension-guard CLI - 開發者 & CI/CD 的主要介面
│   ├── action/        # extension-guard-action - GitHub Action
│   └── vscode/        # extension-guard-vscode - VSCode Extension（薄殼）
├── schemas/           # JSON Schema 定義
└── docs/              # 文件
```

## 技術棧

| 用途 | 選擇 |
|------|------|
| 語言 | TypeScript (strict mode) |
| Runtime | Node.js >= 18, ESM |
| AST 解析 | @typescript-eslint/typescript-estree |
| CLI 框架 | commander + chalk + ora |
| 測試 | vitest |
| 打包 | tsup (esbuild) |
| .vsix 解壓 | yauzl |
| Package manager | pnpm workspace |

## 架構原則

1. **core package 不依賴任何 IDE API** — 所有 VSCode 相關邏輯都在 vscode package
2. **每個 Analyzer 實作 Analyzer interface** — 見 `analyzers/analyzer.interface.ts`
3. **每個 Detection Rule 是獨立檔案** — 實作 DetectionRule interface，放在 `rules/built-in/`
4. **所有 Finding 必須包含 Evidence** — 檔案路徑 + 行號 + 問題內容
5. **平行分析** — Analyzer 之間用 Promise.all 並行執行
6. **錯誤處理** — 不拋例外，回傳空 Finding 陣列，確保一個 extension 分析失敗不影響其他
7. **最小依賴** — core 的生產依賴盡量維持零（僅允許 yauzl 和 typescript-estree）

## 命名慣例

| 類型 | 慣例 | 範例 |
|------|------|------|
| 檔案 | kebab-case | `behavior-analyzer.ts` |
| Class / Interface | PascalCase | `ExtensionGuardScanner` |
| 函式 / 變數 | camelCase | `scanExtensions` |
| 常數 | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| 規則 ID | EG-{SEVERITY}-{NUMBER} | `EG-CRIT-001` |

## 規則 ID 對照表

| Severity | Prefix | 範圍 |
|----------|--------|------|
| Critical | EG-CRIT | 001-099 |
| High | EG-HIGH | 001-099 |
| Medium | EG-MED | 001-099 |
| Low | EG-LOW | 001-099 |
| Info | EG-INFO | 001-099 |

## 核心介面

```typescript
// Analyzer 介面 — 所有分析模組必須實作
interface Analyzer {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  analyze(ext: ExtensionInfo, files: Map<string, string>): Promise<Finding[]>;
}

// DetectionRule 介面 — 所有偵測規則必須實作
interface DetectionRule {
  id: string;                    // e.g., "EG-CRIT-001"
  name: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  mitreAttackId?: string;        // e.g., "T1041"
  enabled: boolean;
  detect(files: Map<string, string>, manifest: ExtensionManifest): Evidence[];
}

// Finding — 每個發現的安全問題
interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence: Evidence;
  mitreAttackId?: string;
  remediation?: string;
}

// Evidence — 問題的具體證據
interface Evidence {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
  lineContent?: string;
  matchedPattern?: string;
  snippet?: string;
}
```

## 測試要求

- 每個偵測規則至少 1 positive + 1 negative fixture
- Fixtures 放 `packages/core/test/fixtures/extensions/`
- 每個 fixture 模擬一個完整的 extension 目錄結構
- 測試命名：`{module-name}.test.ts`

### Fixture 結構範例

```
test/fixtures/extensions/
├── malicious-exfil/          # 資料外洩樣本（positive）
│   ├── package.json
│   └── src/extension.js
├── malicious-keylogger/      # 鍵盤記錄器樣本（positive）
├── benign-theme/             # 正常的 theme（negative）
└── benign-linter/            # 正常的 linter（negative）
```

## 開發指令

```bash
# 安裝依賴
pnpm install

# 建構所有 packages
pnpm build

# 執行所有測試
pnpm test

# 僅測試特定 package
pnpm --filter @aspect-guard/core test
pnpm --filter extension-guard test

# 開發模式（watch）
pnpm --filter @aspect-guard/core dev

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## 開發流程

### 新增偵測規則

1. 在 `packages/core/src/rules/built-in/` 建立規則檔案
2. 檔案命名：`{severity}-{rule-name}.ts`（如 `crit-data-exfiltration.ts`）
3. 實作 `DetectionRule` 介面
4. 在 `rules/built-in/index.ts` 匯出
5. 建立 positive 和 negative fixture
6. 撰寫測試

### 新增 Analyzer

1. 在 `packages/core/src/analyzers/` 建立目錄
2. 實作 `Analyzer` 介面
3. 在 scanner 中註冊
4. 撰寫測試

### 新增 Reporter

1. 在 `packages/core/src/reporter/` 建立檔案
2. 實作 `Reporter` 介面
3. 在 CLI 中註冊對應的 `--format` 選項

## Exit Codes

| Code | 意義 |
|------|------|
| 0 | 掃描完成，無超過門檻的問題 |
| 1 | 發現超過 `--fail-on` 門檻的問題 |
| 2 | 配置錯誤（policy 檔案格式錯誤等） |
| 3 | 執行錯誤（路徑不存在、權限不足等） |

## 支援的 IDE 路徑

```typescript
const IDE_PATHS = {
  'VS Code': ['~/.vscode/extensions'],
  'VS Code Insiders': ['~/.vscode-insiders/extensions'],
  'Cursor': ['~/.cursor/extensions'],
  'Windsurf': ['~/.windsurf/extensions'],
  'Trae': ['~/.trae/extensions'],
  'VSCodium': ['~/.vscode-oss/extensions'],
};
```

## 安全注意事項

- 不要在規則中執行任何被掃描的程式碼
- 只讀取和分析檔案內容，不執行
- 敏感資訊（如偵測到的 secrets）要在輸出中 mask
- 不要將任何資料上傳到外部服務

## 相關文件

- [extension-guard-v2-design.md](./extension-guard-v2-design.md) — 完整設計文件
- [docs/rules.md](./docs/rules.md) — 規則詳細說明
- [docs/contributing.md](./docs/contributing.md) — 貢獻指南
- [docs/custom-rules.md](./docs/custom-rules.md) — 自定義規則教學
