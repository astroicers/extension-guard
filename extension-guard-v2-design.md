# Extension Guard v2 — CLI-First Architecture

## Design & Architecture Document

---

## 1. 產品重新定位

### 1.1 為什麼不是 VSCode Extension

上一版設計以 VSCode Extension 為載體，但存在根本矛盾：

| 問題 | 說明 |
|------|------|
| 信任悖論 | 用 extension 掃描 extension，自身也在同一個不受信任的環境中執行 |
| Runtime 共享 | 惡意 extension 可以 hook VSCode API，攔截 `vscode.extensions.all` 回傳結果 |
| 審核矛盾 | 掃描工具本身要通過被質疑的 Marketplace 審核 |
| 無法 CI/CD | Extension 無法脫離 IDE 獨立執行，企業付費場景走不通 |
| 權限受限 | Extension sandbox 限制了深度檔案系統存取能力 |

### 1.2 競品分析

目前市場上的方案：

| 工具 | 類型 | 限制 |
|------|------|------|
| ExtensionTotal | SaaS + VSCode Extension | 需要 API Key，分析在雲端，有隱私疑慮；閉源 |
| VSCan | Web-only | 僅能掃描 Marketplace 上的 extension，無法掃描本機已安裝的 |
| VSExInspector | Python 研究工具 | Marketplace 監控導向，非安全掃描；違反 ToS |
| Snyk VSCode | VSCode Extension | 聚焦程式碼/依賴漏洞，不掃描 extension 本身 |

**市場空缺：沒有一個開源、離線、CLI-native 的 VSCode Extension 安全掃描工具。**

### 1.3 新定位

```
Extension Guard = 開源的 VSCode Extension 安全掃描引擎

本機離線分析 · CLI-First · CI/CD Ready · 多 IDE 支援
```

核心原則：
- **離線優先**：所有分析在本機完成，不上傳任何資料到雲端
- **CLI-First**：核心引擎獨立於任何 IDE，可在 terminal、CI/CD、Docker 中執行
- **開源透明**：掃描邏輯完全公開，使用者可以審查和貢獻規則
- **零信任掃描**：在 IDE 外部獨立執行，不受被掃描對象影響

---

## 2. 多層產品架構

```
                    ┌─────────────────────────────────┐
                    │         使用者接觸點              │
                    ├────────┬────────┬────────┬───────┤
                    │  CLI   │ VSCode │ GitHub │ Web   │
                    │ (npx)  │  Ext   │ Action │ UI    │
                    │        │ (thin) │        │       │
                    └───┬────┴───┬────┴───┬────┴──┬────┘
                        │        │        │       │
                        ▼        ▼        ▼       ▼
               ┌─────────────────────────────────────────┐
               │       @aspect-guard/core (npm)           │
               │       核心掃描引擎 · Pure TypeScript      │
               │                                          │
               │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
               │  │ Analyzer │ │  Rules   │ │ Scorer  │  │
               │  │ Pipeline │ │  Engine  │ │         │  │
               │  └──────────┘ └──────────┘ └─────────┘  │
               │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
               │  │ Reporter │ │  Policy  │ │  Known  │  │
               │  │          │ │  Engine  │ │  DB     │  │
               │  └──────────┘ └──────────┘ └─────────┘  │
               └─────────────────────────────────────────┘

     開發優先順序：  ①CLI ──▶ ②GitHub Action ──▶ ③VSCode Ext ──▶ ④Web
```

### 各層定位

| 層級 | Package | 角色 | 開發時程 |
|------|---------|------|---------|
| 核心引擎 | `@aspect-guard/core` | 所有掃描邏輯，純 TypeScript，零 IDE 依賴 | Phase 1 |
| CLI | `extension-guard` (bin) | 開發者 & CI/CD 的主要介面 | Phase 1 |
| GitHub Action | `extension-guard-action` | PR 檢查、定時掃描 | Phase 2 |
| VSCode Extension | `extension-guard-vscode` | IDE 內的薄殼，呼叫 core | Phase 3 |
| Web UI | `extension-guard-web` | 線上掃描 .vsix，類似 VirusTotal | Phase 4 |

---

## 3. CLI 設計

### 3.1 命令結構

```bash
extension-guard <command> [options]

Commands:
  scan              掃描已安裝的 VSCode extensions
  inspect <path>    掃描指定的 .vsix 檔案（安裝前檢查）
  audit             根據 policy 檔案稽核已安裝 extensions
  report            生成掃描報告
  db update         更新已知惡意 extension 資料庫
  db search <name>  查詢 extension 是否在資料庫中
  policy init       初始化 .extension-guard.json 配置檔
  policy validate   驗證 policy 配置檔

Global Options:
  --format, -f      輸出格式 (table|json|sarif|markdown)  [default: "table"]
  --output, -o      輸出檔案路徑
  --severity, -s    最低顯示嚴重度 (critical|high|medium|low|info)
  --config, -c      指定 policy 配置檔路徑
  --ide-path        指定 IDE extension 目錄路徑
  --quiet, -q       僅輸出結果，不顯示進度
  --verbose, -v     顯示詳細分析過程
  --no-color        停用 ANSI 色彩
  --version         顯示版本
  --help            顯示說明
```

### 3.2 核心使用場景

#### 場景 1：個人開發者 — 掃描本機

```bash
# 基礎掃描（自動偵測 VSCode / Cursor / Windsurf 路徑）
$ npx extension-guard scan

🛡️  Extension Guard v0.1.0
📁  Detected: VS Code (68 extensions)
📁  Detected: Cursor (52 extensions)
⏳  Scanning 98 unique extensions...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ CRITICAL  suspicious-ai-helper v1.2.3
   Publisher: unknown-dev-2024 (unverified)
   Trust Score: 8/100
   ┌──────────────────────────────────────────────────┐
   │ CRIT  Data Exfiltration (T1041)                  │
   │       POST request to 45.33.xx.xx with system    │
   │       info at src/extension.js:142                │
   │                                                   │
   │ CRIT  Credential Theft (T1552.004)               │
   │       Reads ~/.ssh/id_rsa at src/utils.js:67     │
   │                                                   │
   │ HIGH  Code Obfuscation                           │
   │       Base64 encoded payload at src/loader.js:12 │
   └──────────────────────────────────────────────────┘
   ⚡ Recommended: UNINSTALL IMMEDIATELY

🔴 HIGH  code-formatter-pro v2.0.1
   Publisher: fmt-tools (unverified)
   Trust Score: 31/100
   ┌──────────────────────────────────────────────────┐
   │ HIGH  Suspicious Network (T1071)                 │
   │       Connects to dynamically constructed URL    │
   │       at dist/main.js:891                        │
   │                                                   │
   │ HIGH  Excessive Permission                       │
   │       activationEvents: ["*"] (全域啟動)          │
   │       但僅宣稱為 code formatter                   │
   └──────────────────────────────────────────────────┘

🟡 MEDIUM (5)  theme-ultra, snippet-master, ...
🟢 SAFE   (91) ms-python.python, dbaeumer.vscode-eslint, ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary: 98 scanned · 2 critical · 1 high · 5 medium · 91 safe
⏱️  Completed in 4.2s
```

#### 場景 2：安裝前檢查 — 掃描 .vsix

```bash
# 下載的 .vsix 安裝前先掃描
$ extension-guard inspect ./cool-theme-3.1.0.vsix

🔍 Inspecting: cool-theme-3.1.0.vsix
   Publisher: cool-themes · Version: 3.1.0 · Size: 2.3 MB

   Findings:
   ⚠️  HIGH  Obfuscated JavaScript in dist/extension.js
             90% of code is minified with no source map
   ⚠️  MEDIUM  Accesses vscode.workspace.openTextDocument API
               Unusual for a theme extension
   ℹ️  INFO  Publisher unverified

   Trust Score: 42/100 (HIGH RISK)
   💡 Recommendation: Review source code before installing
```

#### 場景 3：CI/CD — Policy 稽核

```bash
# 在 CI/CD pipeline 中稽核團隊的 extension 配置
$ extension-guard audit \
    --config .extension-guard.json \
    --format sarif \
    --output results.sarif \
    --fail-on high

# Exit code: 0 = pass, 1 = policy violation found
# SARIF 輸出可直接上傳到 GitHub Code Scanning
```

#### 場景 4：Docker（免安裝 Node）

```bash
# 掃描掛載的 extensions 目錄
$ docker run --rm \
    -v ~/.vscode/extensions:/scan:ro \
    astroicers/extension-guard scan --ide-path /scan

# 掃描 .vsix 檔案
$ docker run --rm \
    -v ./my-extension.vsix:/scan/ext.vsix:ro \
    astroicers/extension-guard inspect /scan/ext.vsix
```

### 3.3 IDE 路徑自動偵測

```typescript
// 支援的 IDE 與預設路徑

const IDE_PATHS: Record<string, string[]> = {
  'VS Code': [
    // macOS
    '~/.vscode/extensions',
    // Linux
    '~/.vscode/extensions',
    // Windows
    '%USERPROFILE%\\.vscode\\extensions',
  ],
  'VS Code Insiders': [
    '~/.vscode-insiders/extensions',
  ],
  'Cursor': [
    '~/.cursor/extensions',
  ],
  'Windsurf': [
    '~/.windsurf/extensions',
  ],
  'Trae': [
    '~/.trae/extensions',
  ],
  'VSCodium': [
    '~/.vscode-oss/extensions',
  ],
};
```

### 3.4 輸出格式

| 格式 | 用途 | Flag |
|------|------|------|
| `table` | 終端機人類閱讀（預設） | `--format table` |
| `json` | 程式化處理、API 整合 | `--format json` |
| `sarif` | GitHub Code Scanning、SAST 工具整合 | `--format sarif` |
| `markdown` | 報告、文件、Issue | `--format markdown` |
| `html` | 獨立可開啟的報告頁面 | `--format html` |
| `csv` | 試算表、資料匯出 | `--format csv` |

---

## 4. 核心引擎設計 (@aspect-guard/core)

### 4.1 模組架構

```
@aspect-guard/core/
├── src/
│   ├── index.ts                       # Public API 匯出
│   │
│   ├── scanner/
│   │   ├── scanner.ts                 # 主掃描入口（協調所有模組）
│   │   ├── extension-reader.ts        # 讀取 extension 目錄/vsix 解壓
│   │   ├── file-collector.ts          # 收集 JS/TS/JSON 檔案內容
│   │   └── vsix-extractor.ts          # .vsix 解壓與解析
│   │
│   ├── analyzers/                     # 各分析模組（實作 Analyzer 介面）
│   │   ├── analyzer.interface.ts      # 共用介面
│   │   ├── behavior/
│   │   │   ├── behavior-analyzer.ts   # 行為分析主模組
│   │   │   ├── ast-walker.ts          # AST 遍歷器
│   │   │   └── pattern-matcher.ts     # Pattern 比對引擎
│   │   ├── secrets/
│   │   │   ├── secrets-scanner.ts     # Secrets 掃描主模組
│   │   │   ├── entropy.ts             # Shannon entropy 計算
│   │   │   └── patterns.ts            # Secret pattern 定義
│   │   ├── permissions/
│   │   │   ├── permission-auditor.ts  # Permission 審計
│   │   │   └── api-mapping.ts         # VSCode API → 風險對應表
│   │   ├── obfuscation/
│   │   │   ├── obfuscation-detector.ts
│   │   │   └── metrics.ts             # 混淆度指標計算
│   │   ├── dependencies/
│   │   │   ├── dependency-auditor.ts  # 依賴鏈安全
│   │   │   └── vulnerability-db.ts    # CVE 比對
│   │   └── known-threats/
│   │       ├── known-db-matcher.ts    # 已知惡意比對
│   │       └── hash-comparator.ts     # Hash-based 辨識
│   │
│   ├── rules/
│   │   ├── rule.interface.ts          # 規則介面定義
│   │   ├── rule-engine.ts             # 規則引擎核心
│   │   ├── rule-registry.ts           # 規則註冊表
│   │   └── built-in/                  # 內建規則（每個檔案一條規則）
│   │       ├── crit-data-exfiltration.ts
│   │       ├── crit-remote-execution.ts
│   │       ├── crit-credential-access.ts
│   │       ├── crit-keylogger.ts
│   │       ├── high-obfuscated-code.ts
│   │       ├── high-suspicious-network.ts
│   │       ├── high-dynamic-url.ts
│   │       ├── high-persistence.ts
│   │       ├── med-excessive-activation.ts
│   │       ├── med-unnecessary-api.ts
│   │       ├── med-vulnerable-dep.ts
│   │       ├── low-abandoned.ts
│   │       ├── low-unverified-publisher.ts
│   │       └── index.ts               # 統一匯出所有規則
│   │
│   ├── scorer/
│   │   ├── trust-scorer.ts            # 信任分數計算
│   │   └── weights.ts                 # 分數權重配置
│   │
│   ├── policy/
│   │   ├── policy-engine.ts           # Policy 執行引擎
│   │   ├── policy-schema.ts           # JSON Schema 定義
│   │   └── policy-loader.ts           # 載入 .extension-guard.json
│   │
│   ├── database/
│   │   ├── known-malicious.json       # 已知惡意 extension 資料
│   │   ├── secret-patterns.json       # Secret 偵測 patterns
│   │   ├── api-risk-map.json          # VSCode API 風險等級對應
│   │   └── db-manager.ts             # 資料庫更新管理
│   │
│   ├── reporter/
│   │   ├── reporter.interface.ts      # Reporter 介面
│   │   ├── table-reporter.ts          # Terminal table 輸出
│   │   ├── json-reporter.ts           # JSON 結構化輸出
│   │   ├── sarif-reporter.ts          # SARIF 格式（GitHub 整合）
│   │   ├── markdown-reporter.ts       # Markdown 報告
│   │   ├── html-reporter.ts           # 獨立 HTML 報告頁
│   │   └── csv-reporter.ts            # CSV 匯出
│   │
│   └── types/
│       ├── extension.ts               # Extension 資訊型別
│       ├── finding.ts                 # 發現型別
│       ├── scan-result.ts             # 掃描結果型別
│       ├── rule.ts                    # 規則型別
│       └── config.ts                  # 配置型別
│
├── data/
│   └── known-threats/                 # 已知威脅資料（隨 npm 發佈）
│       ├── malicious-extensions.json
│       ├── revoked-publishers.json
│       └── threat-signatures.json
│
└── test/
    ├── fixtures/
    │   ├── extensions/                # 模擬 extension 目錄結構
    │   │   ├── malicious-exfil/       # 資料外洩樣本
    │   │   ├── malicious-keylogger/   # 鍵盤記錄器樣本
    │   │   ├── malicious-miner/       # 挖礦樣本
    │   │   ├── suspicious-obfuscated/ # 混淆程式碼樣本
    │   │   ├── benign-theme/          # 正常的 theme
    │   │   ├── benign-linter/         # 正常的 linter
    │   │   └── benign-formatter/      # 正常的 formatter
    │   └── vsix/                      # 測試用 .vsix 檔案
    │       ├── clean.vsix
    │       └── suspicious.vsix
    ├── unit/
    │   ├── analyzers/
    │   │   ├── behavior-analyzer.test.ts
    │   │   ├── secrets-scanner.test.ts
    │   │   ├── permission-auditor.test.ts
    │   │   └── obfuscation-detector.test.ts
    │   ├── rules/
    │   │   ├── data-exfiltration.test.ts
    │   │   ├── remote-execution.test.ts
    │   │   └── ...
    │   ├── scorer/
    │   │   └── trust-scorer.test.ts
    │   └── reporter/
    │       ├── json-reporter.test.ts
    │       └── sarif-reporter.test.ts
    └── integration/
        ├── full-scan.test.ts
        └── vsix-inspect.test.ts
```

### 4.2 核心介面定義

```typescript
// ===== scanner/scanner.ts =====
// 主掃描器 — 核心引擎唯一入口

export interface ScanOptions {
  idePaths?: string[];               // 自訂 extension 目錄
  autoDetect?: boolean;              // 自動偵測 IDE 路徑
  severity?: Severity;               // 最低回報嚴重度
  rules?: string[];                  // 指定規則（空 = 全部）
  skipRules?: string[];              // 排除規則
  concurrency?: number;              // 平行分析數量
  timeout?: number;                  // 單一 extension 超時（ms）
}

export interface InspectOptions {
  vsixPath: string;                  // .vsix 檔案路徑
  severity?: Severity;
  rules?: string[];
}

export class ExtensionGuardScanner {
  constructor(options?: Partial<ScanOptions>);
  
  // 掃描已安裝的所有 extensions
  scan(options?: ScanOptions): Promise<FullScanReport>;
  
  // 掃描單一 .vsix 檔案
  inspect(options: InspectOptions): Promise<ScanResult>;
  
  // 根據 policy 稽核
  audit(policyPath: string): Promise<AuditReport>;
  
  // 註冊自定義規則
  registerRule(rule: DetectionRule): void;
  
  // 註冊自定義 Analyzer
  registerAnalyzer(analyzer: Analyzer): void;
}

// ===== analyzers/analyzer.interface.ts =====
// 所有 Analyzer 模組的共用介面

export interface Analyzer {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  /**
   * 分析單一 extension
   * @param ext - Extension metadata
   * @param files - 檔案名 → 內容 的 Map
   * @returns 發現的安全問題陣列
   */
  analyze(
    ext: ExtensionInfo,
    files: Map<string, string>
  ): Promise<Finding[]>;
}

// ===== rules/rule.interface.ts =====
// 偵測規則介面

export interface DetectionRule {
  id: string;                        // e.g., "EG-CRIT-001"
  name: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  mitreAttackId?: string;            // e.g., "T1041"
  enabled: boolean;
  
  /**
   * 對一組檔案執行偵測
   * @returns 命中的 evidence 陣列（空 = 未命中）
   */
  detect(
    files: Map<string, string>,       // fileName → content
    manifest: ExtensionManifest       // package.json parsed
  ): Evidence[];
}

// ===== types/extension.ts =====

export interface ExtensionInfo {
  id: string;                        // publisher.name
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
  totalSize: number;                 // bytes
}

export interface ExtensionManifest {
  name: string;
  publisher: string;
  version: string;
  activationEvents?: string[];
  contributes?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  main?: string;
  browser?: string;
  [key: string]: unknown;
}

// ===== types/finding.ts =====

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
  | 'data-exfiltration'
  | 'remote-code-execution'
  | 'credential-theft'
  | 'keylogger'
  | 'code-obfuscation'
  | 'suspicious-network'
  | 'excessive-permission'
  | 'known-malicious'
  | 'hardcoded-secret'
  | 'vulnerable-dependency'
  | 'persistence'
  | 'supply-chain'
  | 'crypto-mining';

export interface Finding {
  id: string;                        // 唯一識別碼
  ruleId: string;                    // 觸發的規則 ID
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence: Evidence;
  mitreAttackId?: string;
  remediation?: string;
}

export interface Evidence {
  filePath: string;                  // 相對於 extension root
  lineNumber?: number;
  columnNumber?: number;
  lineContent?: string;              // 問題行
  contextBefore?: string[];          // 前幾行
  contextAfter?: string[];           // 後幾行
  matchedPattern?: string;
  snippet?: string;                  // 經過 sanitize 的程式碼片段
}

// ===== types/scan-result.ts =====

export interface ScanResult {
  extensionId: string;
  displayName: string;
  version: string;
  trustScore: number;                // 0-100
  riskLevel: RiskLevel;
  findings: Finding[];
  metadata: ExtensionInfo;
  analyzedFiles: number;
  scanDurationMs: number;
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';

export interface FullScanReport {
  scanId: string;
  version: string;                   // Extension Guard 版本
  timestamp: string;                 // ISO 8601
  environment: {
    os: string;
    ides: { name: string; path: string; extensionCount: number }[];
  };
  totalExtensions: number;
  uniqueExtensions: number;          // 去重後（跨 IDE）
  results: ScanResult[];
  summary: ScanSummary;
  scanDurationMs: number;
}

export interface ScanSummary {
  byRiskLevel: Record<RiskLevel, number>;
  bySeverity: Record<Severity, number>;
  byCategory: Record<FindingCategory, number>;
  topFindings: Finding[];
  overallHealthScore: number;
}

export interface AuditReport extends FullScanReport {
  policyPath: string;
  policyViolations: PolicyViolation[];
  auditPassed: boolean;
}

export interface PolicyViolation {
  extensionId: string;
  rule: string;
  message: string;
  action: 'block' | 'warn' | 'info';
}
```

### 4.3 Analysis Pipeline 流程

```
scan() / inspect() 被呼叫
           │
           ▼
┌─────────────────────────┐
│  1. Extension Discovery  │
│                          │
│  scan: 偵測 IDE 路徑     │
│        列舉所有 extension│
│        跨 IDE 去重       │
│                          │
│  inspect: 解壓 .vsix    │
│           驗證結構完整性  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  2. Quick Reject         │  ★ 快速路徑
│                          │
│  比對 known-malicious DB │
│  比對 revoked publishers │
│  Hash 比對               │
│                          │
│  命中 → 直接標記 CRITICAL│
│  未命中 → 繼續深度分析   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  3. File Collection      │
│                          │
│  讀取 package.json       │
│  收集 .js / .ts 原始碼   │
│  收集 .json 配置         │
│  計算各檔案 hash         │
│  跳過 binary / 圖片      │
│                          │
│  建立 Map<path, content> │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  4. Parallel Analysis                    │
│                                          │
│  ┌───────────────────┐                   │
│  │ Behavior Analyzer │ regex + AST 掃描  │
│  │                   │ 偵測可疑行為模式   │
│  └───────────────────┘                   │
│  ┌───────────────────┐                   │
│  │ Secrets Scanner   │ pattern + entropy │
│  │                   │ 偵測洩漏的 secrets │
│  └───────────────────┘                   │
│  ┌───────────────────┐                   │
│  │ Permission Auditor│ manifest 分析     │
│  │                   │ API 呼叫 vs 功能   │
│  └───────────────────┘                   │  全部以 Promise.all
│  ┌───────────────────┐                   │  平行執行
│  │ Obfuscation       │ entropy + 結構    │
│  │ Detector          │ 偵測打包/混淆程度  │
│  └───────────────────┘                   │
│  ┌───────────────────┐                   │
│  │ Dependency Auditor│ npm audit data    │
│  │                   │ CVE 比對          │
│  └───────────────────┘                   │
│                                          │
│  每個 Analyzer 內部呼叫 Rule Engine      │
│  Rule Engine 執行對應 category 的規則     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────┐
│  5. Score Calculation    │
│                          │
│  收集所有 findings       │
│  套用加權公式            │
│  計算 Trust Score 0-100  │
│  決定 Risk Level         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  6. Policy Evaluation    │  (audit 模式)
│                          │
│  載入 .extension-guard   │
│  比對 allowlist/blocklist│
│  驗證規則條件            │
│  產生 PolicyViolation    │
│  決定 exit code          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  7. Report Generation    │
│                          │
│  根據 --format 選擇      │
│  Reporter 實作           │
│  輸出到 stdout / 檔案    │
└─────────────────────────┘
```

### 4.4 偵測規則設計

每條規則是獨立檔案，實作 `DetectionRule` 介面。

規則命名規則：`EG-{SEVERITY}-{NUMBER}`

```typescript
// ===== 範例：rules/built-in/crit-data-exfiltration.ts =====

import { DetectionRule, Evidence, ExtensionManifest } from '../types';

export const critDataExfiltration: DetectionRule = {
  id: 'EG-CRIT-001',
  name: 'Data Exfiltration Pattern',
  description: 'Detects code that collects system info and sends it to external servers',
  severity: 'critical',
  category: 'data-exfiltration',
  mitreAttackId: 'T1041',
  enabled: true,

  detect(
    files: Map<string, string>,
    manifest: ExtensionManifest
  ): Evidence[] {
    const evidences: Evidence[] = [];

    // 偵測 patterns
    const exfilPatterns = [
      // 收集系統資訊 + 發送
      {
        name: 'system-info-collection',
        pattern: /(?:os\.hostname|os\.userInfo|os\.platform|os\.arch|os\.networkInterfaces)\(\)/g,
      },
      // HTTP POST 到外部（含 IP 地址）
      {
        name: 'http-post-to-ip',
        pattern: /(?:axios|fetch|http\.request|https\.request)\s*\(\s*['"`]https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
      },
      // 將檔案內容 POST 出去
      {
        name: 'file-read-and-send',
        pattern: /(?:readFileSync|readFile)\s*\([^)]*\)[\s\S]{0,200}(?:\.post|fetch|request)\s*\(/g,
      },
    ];

    for (const [filePath, content] of files) {
      const lines = content.split('\n');
      for (const { name, pattern } of exfilPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            matchedPattern: name,
            snippet: content.slice(
              Math.max(0, match.index - 100),
              Math.min(content.length, match.index + match[0].length + 100)
            ),
          });
        }
      }
    }

    return evidences;
  },
};
```

```typescript
// ===== 範例：rules/built-in/crit-credential-access.ts =====

export const critCredentialAccess: DetectionRule = {
  id: 'EG-CRIT-003',
  name: 'Credential File Access',
  description: 'Detects attempts to read sensitive credential files',
  severity: 'critical',
  category: 'credential-theft',
  mitreAttackId: 'T1552.004',
  enabled: true,

  detect(files, manifest): Evidence[] {
    const sensitivePathPatterns = [
      /\.ssh[/\\](?:id_rsa|id_ed25519|id_ecdsa|known_hosts|config|authorized_keys)/,
      /\.gnupg[/\\]/,
      /\.aws[/\\]credentials/,
      /\.azure[/\\]/,
      /\.kube[/\\]config/,
      /\.git-credentials/,
      /\.env(?:\.\w+)?/,
      /\.npmrc/,
      /\.docker[/\\]config\.json/,
      /\.netrc/,
    ];

    const evidences: Evidence[] = [];
    for (const [filePath, content] of files) {
      const lines = content.split('\n');
      for (const pathPattern of sensitivePathPatterns) {
        // 在程式碼中搜尋這些路徑字串
        const codePattern = new RegExp(
          `(?:readFile|readFileSync|access|exists|stat|open)\\s*\\([^)]*${pathPattern.source}`,
          'g'
        );
        let match;
        while ((match = codePattern.exec(content)) !== null) {
          const lineNumber = content.slice(0, match.index).split('\n').length;
          evidences.push({
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            matchedPattern: pathPattern.source,
          });
        }
      }
    }
    return evidences;
  },
};
```

### 4.5 完整規則清單

| Rule ID | Severity | Category | 偵測目標 | MITRE |
|---------|----------|----------|----------|-------|
| EG-CRIT-001 | Critical | data-exfiltration | 收集系統資訊並外傳 | T1041 |
| EG-CRIT-002 | Critical | remote-code-execution | child_process exec/spawn, eval() | T1059 |
| EG-CRIT-003 | Critical | credential-theft | 讀取 .ssh, .aws, .kube 等憑證檔 | T1552.004 |
| EG-CRIT-004 | Critical | keylogger | 監聽 keyboard/input 事件 | T1056.001 |
| EG-CRIT-005 | Critical | known-malicious | 命中已知惡意 extension DB | — |
| EG-CRIT-006 | Critical | remote-code-execution | 從遠端下載並執行 binary | T1105 |
| EG-CRIT-007 | Critical | crypto-mining | 偵測 crypto miner 特徵 | T1496 |
| EG-HIGH-001 | High | code-obfuscation | 大量 Base64 編碼程式碼 | T1027 |
| EG-HIGH-002 | High | suspicious-network | 連線到 IP 位址而非域名 | T1071 |
| EG-HIGH-003 | High | suspicious-network | 動態拼接 URL | T1071 |
| EG-HIGH-004 | High | persistence | 修改 VSCode settings.json | T1546.016 |
| EG-HIGH-005 | High | persistence | 程式化安裝其他 extension | T1176 |
| EG-HIGH-006 | High | hardcoded-secret | 含 API key / token / password | T1552.001 |
| EG-HIGH-007 | High | supply-chain | postinstall script 執行 | T1195.002 |
| EG-MED-001 | Medium | excessive-permission | activationEvents 包含 "*" | — |
| EG-MED-002 | Medium | excessive-permission | 使用與功能不符的 VSCode API | — |
| EG-MED-003 | Medium | vulnerable-dependency | 含已知有 CVE 的 npm 依賴 | — |
| EG-MED-004 | Medium | supply-chain | 使用已廢棄的 npm package | — |
| EG-MED-005 | Medium | code-obfuscation | Webpack 打包無 source map | — |
| EG-LOW-001 | Low | supply-chain | 超過 12 個月未更新 | — |
| EG-LOW-002 | Low | supply-chain | Publisher 未通過驗證 | — |
| EG-LOW-003 | Low | supply-chain | 無 repository 連結 | — |
| EG-INFO-001 | Info | supply-chain | 安裝量低於 1000 | — |

### 4.6 信任分數計算

```typescript
// scorer/trust-scorer.ts

export interface ScoringConfig {
  // 每個 finding 的扣分
  findingPenalty: Record<Severity, number>;
  
  // 最大扣分上限（避免單一類別過度懲罰）
  maxPenaltyPerCategory: number;
  
  // Metadata 調整分
  metadataModifiers: MetadataModifier[];
}

export const DEFAULT_SCORING: ScoringConfig = {
  findingPenalty: {
    critical: -35,
    high: -18,
    medium: -8,
    low: -3,
    info: -1,
  },

  maxPenaltyPerCategory: -50,  // 單一 category 最多扣 50

  metadataModifiers: [
    // 加分
    { condition: 'publisher.verified === true',     score: +5 },
    { condition: 'installCount > 100000',           score: +5 },
    { condition: 'installCount > 10000',            score: +3 },
    { condition: 'repository !== undefined',         score: +3 },
    { condition: 'daysSinceUpdate < 90',            score: +3 },
    { condition: 'hasSourceMap === true',            score: +2 },
    
    // 扣分
    { condition: 'publisher.verified === false',    score: -5 },
    { condition: 'installCount < 1000',             score: -3 },
    { condition: 'daysSinceUpdate > 730',           score: -10 },
    { condition: 'daysSinceUpdate > 365',           score: -5 },
    { condition: 'repository === undefined',         score: -5 },
    { condition: 'hasObfuscatedCode === true',      score: -12 },
    { condition: 'activationAll === true',          score: -8 },
  ],
};

// 計算流程:
// 1. 起始分 = 100
// 2. 依 findings 扣分（同 category 最多扣 maxPenaltyPerCategory）
// 3. 依 metadata 加減分
// 4. Clamp to [0, 100]
// 5. 對應 RiskLevel:
//    90-100 = safe
//    70-89  = low
//    45-69  = medium
//    20-44  = high
//    0-19   = critical
```

---

## 5. GitHub Action 設計

### 5.1 使用方式

```yaml
# .github/workflows/extension-audit.yml

name: Extension Guard Audit
on:
  push:
    paths:
      - '.vscode/extensions.json'
      - '.extension-guard.json'
  schedule:
    - cron: '0 9 * * 1'  # 每週一早上 9 點

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extension Guard Audit
        uses: astroicers/extension-guard-action@v1
        with:
          policy: .extension-guard.json
          format: sarif
          fail-on: high

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: extension-guard.sarif
```

### 5.2 檢查項目

GitHub Action 可以掃描兩種東西：

| 目標 | 說明 |
|------|------|
| `.vscode/extensions.json` | Workspace 推薦的 extension 清單 |
| `devcontainer.json` | DevContainer 指定安裝的 extension |
| `.vsix` 檔案 | Repo 中包含的自訂 extension |

---

## 6. Policy as Code

### 6.1 `.extension-guard.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/astroicers/extension-guard/main/schemas/policy.v1.json",
  "version": "1.0",
  
  "scanning": {
    "minSeverity": "medium",
    "skipRules": [],
    "timeout": 30000
  },

  "policy": {
    "allowlist": [
      "ms-python.python",
      "ms-vscode.cpptools",
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "github.copilot"
    ],
    
    "blocklist": [
      "unknown-dev-2024.*",
      "suspicious-publisher.*"
    ],

    "rules": {
      "minTrustScore": {
        "threshold": 40,
        "action": "block"
      },
      "requireVerifiedPublisher": {
        "enabled": true,
        "action": "warn",
        "exceptions": ["internal-team.*"]
      },
      "maxDaysSinceUpdate": {
        "days": 730,
        "action": "warn"
      },
      "blockObfuscated": {
        "enabled": true,
        "action": "warn"
      },
      "disallowPermissions": {
        "permissions": ["shell", "process"],
        "action": "block",
        "exceptions": ["ms-vscode-remote.*"]
      }
    }
  },

  "reporting": {
    "format": "sarif",
    "includeEvidence": true,
    "includeSafe": false
  }
}
```

### 6.2 Exit Codes

| Code | 意義 | 使用場景 |
|------|------|---------|
| 0 | 掃描完成，無超過門檻的問題 | CI pass |
| 1 | 發現超過 `--fail-on` 門檻的問題 | CI fail |
| 2 | 配置錯誤（policy 檔案格式錯誤等） | 設定修正 |
| 3 | 執行錯誤（路徑不存在、權限不足等） | 環境修正 |

---

## 7. VSCode Extension（薄殼）

Phase 3 開發的 VSCode Extension 只做三件事：

```typescript
// extension-guard-vscode/src/extension.ts

export function activate(context: vscode.ExtensionContext) {
  
  // 1. 呼叫 @aspect-guard/core 做掃描
  const scanner = new ExtensionGuardScanner({
    idePaths: [getVSCodeExtensionsPath()],
  });
  
  // 2. 把結果顯示在 TreeView 側邊欄
  const treeProvider = new ResultTreeProvider(results);
  vscode.window.registerTreeDataProvider('extensionGuard', treeProvider);
  
  // 3. 在 Status Bar 顯示摘要
  statusBar.text = `$(shield) ${summary.safeCount} safe · ${summary.criticalCount} ⚠️`;
}

// 就這樣。所有分析邏輯在 @aspect-guard/core 中。
// VSCode Extension 只是 UI 渲染層。
```

---

## 8. 技術棧

| 用途 | 選擇 | 原因 |
|------|------|------|
| 語言 | TypeScript (strict) | 類型安全、Claude Code 效率最高 |
| Runtime | Node.js >= 18 | LTS、原生 ESM 支援 |
| AST 解析 | `@typescript-eslint/typescript-estree` | 同時支援 JS 和 TS |
| CLI 框架 | `commander` + `chalk` + `ora` | 輕量、成熟、無額外依賴 |
| 測試 | `vitest` | 快、ESM 原生、零配置 |
| 打包 | `tsup` (esbuild) | 極快的打包 + 型別生成 |
| .vsix 解壓 | `yauzl` | 純 JS ZIP 解壓，零 native 依賴 |
| Monorepo | `pnpm` workspace | 管理 core / cli / action / vscode 多 package |
| SARIF 輸出 | 手動建構 JSON | SARIF 規範簡單，不需額外 lib |

### 依賴策略

**核心引擎 (`@aspect-guard/core`) 零生產依賴**——所有需要的功能自行實作或只用 Node.js 內建模組。這對安全掃描工具至關重要——一個宣稱做供應鏈安全的工具本身不應該有複雜的依賴鏈。

唯一例外：
- `yauzl`：.vsix 解壓（ZIP format 自行實作不實際）
- `@typescript-eslint/typescript-estree`：AST 解析（重寫 parser 不合理）

---

## 9. Monorepo 結構

```
extension-guard/
├── packages/
│   ├── core/                          # @aspect-guard/core
│   │   ├── src/                       # 核心引擎（見 4.1 模組架構）
│   │   ├── data/                      # 已知威脅資料庫
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                           # extension-guard CLI
│   │   ├── src/
│   │   │   ├── index.ts               # CLI entry point
│   │   │   ├── commands/
│   │   │   │   ├── scan.ts
│   │   │   │   ├── inspect.ts
│   │   │   │   ├── audit.ts
│   │   │   │   ├── report.ts
│   │   │   │   ├── db.ts
│   │   │   │   └── policy.ts
│   │   │   └── utils/
│   │   │       ├── terminal-output.ts # ANSI 格式化
│   │   │       └── progress.ts        # 進度條
│   │   ├── package.json               # bin: { "extension-guard": ... }
│   │   └── tsconfig.json
│   │
│   ├── action/                        # extension-guard-action
│   │   ├── action.yml
│   │   ├── src/
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── vscode/                        # extension-guard-vscode（Phase 3）
│       ├── src/
│       │   ├── extension.ts
│       │   └── providers/
│       └── package.json
│
├── schemas/
│   └── policy.v1.json                 # Policy JSON Schema
│
├── docs/
│   ├── rules.md                       # 規則說明文件
│   ├── contributing.md                # 貢獻指南
│   └── custom-rules.md               # 自定義規則教學
│
├── CLAUDE.md                          # Claude Code 開發指引
├── pnpm-workspace.yaml
├── package.json                       # Root workspace
├── tsconfig.base.json
├── vitest.config.ts
├── LICENSE                            # MIT
└── README.md
```

---

## 10. Claude Code 開發策略

### 10.1 CLAUDE.md

```markdown
# Extension Guard — Claude Code 開發指引

## 專案概述
CLI-first 的 VSCode Extension 供應鏈安全掃描工具。
掃描已安裝的 IDE extensions，偵測惡意行為、洩漏的 secrets、
過度權限、已知威脅。

## Monorepo 結構
- packages/core: 核心掃描引擎（純 TypeScript，零 IDE 依賴）
- packages/cli: CLI 介面
- packages/action: GitHub Action
- packages/vscode: VSCode Extension（薄殼）

## 技術棧
- TypeScript strict mode
- Node.js >= 18, ESM
- AST: @typescript-eslint/typescript-estree
- CLI: commander + chalk + ora
- Test: vitest
- Build: tsup
- Package manager: pnpm

## 架構原則
1. core package 不依賴任何 IDE API
2. 每個 Analyzer 實作 Analyzer interface
3. 每個 Detection Rule 是獨立檔案，實作 DetectionRule interface
4. 所有 Finding 必須包含 Evidence（檔案路徑 + 行號 + 內容）
5. 平行分析：Analyzer 之間用 Promise.all 並行
6. 錯誤不拋例外，回傳空 Finding 陣列
7. core 的生產依賴盡量維持零（除 yauzl 和 estree）

## 命名慣例
- 檔案：kebab-case
- Class / Interface：PascalCase
- 函式 / 變數：camelCase
- 常數：UPPER_SNAKE_CASE
- 規則 ID：EG-{SEVERITY}-{NUMBER}

## 測試要求
- 每個偵測規則至少 1 positive + 1 negative fixture
- Fixtures 放 test/fixtures/extensions/
- 每個 fixture 模擬一個完整的 extension 目錄結構
- 測試指令：pnpm test

## 開發指令
- pnpm install：安裝依賴
- pnpm build：建構所有 packages
- pnpm test：執行所有測試
- pnpm --filter @aspect-guard/core test：僅測試 core
```

### 10.2 逐步開發 Prompt 策略

```
Phase 1 — 專案骨架 + Core 基礎 (Day 1)
│
├── Prompt 1: 建立 monorepo 骨架
│   "建立 pnpm monorepo，包含 packages/core 和 packages/cli，
│    設定 tsconfig、vitest、tsup。core 匯出 ExtensionGuardScanner class。"
│
├── Prompt 2: Extension Reader
│   "實作 extension-reader.ts，讀取指定目錄下所有 extension 的
│    package.json 並解析為 ExtensionInfo。包含 IDE 路徑自動偵測。"
│
├── Prompt 3: File Collector
│   "實作 file-collector.ts，收集 extension 目錄中所有 .js .ts .json
│    檔案的內容，回傳 Map<string, string>。跳過 node_modules 和 binary。"
│
└── Prompt 4: 基礎 CLI scan 命令
    "實作 CLI scan 命令，呼叫 core 的 ExtensionGuardScanner.scan()，
     用 table 格式在終端顯示結果。"

Phase 2 — Analyzer 模組 (Day 2-3)
│
├── Prompt 5: Rule Engine + 規則介面
│   "實作 rule-engine.ts 和 rule.interface.ts。
│    RuleEngine.run() 接收 files Map + manifest，
│    遍歷所有註冊的規則並收集 Evidence。"
│
├── Prompt 6: Behavior Analyzer + 3 條 CRITICAL 規則
│   "實作 behavior-analyzer.ts 和以下三條規則：
│    EG-CRIT-001 (data exfiltration)
│    EG-CRIT-002 (remote code execution)
│    EG-CRIT-003 (credential access)
│    每條規則附 unit test + fixture。"
│
├── Prompt 7: Secrets Scanner
│   "實作 secrets-scanner.ts，含 pattern matching 和 Shannon entropy。
│    偵測 AWS keys、GitHub tokens、database URLs 等。
│    附 secret-patterns.json 和 unit tests。"
│
├── Prompt 8: Permission Auditor
│   "實作 permission-auditor.ts，分析 package.json 的 activationEvents
│    和 contributes，偵測過度權限和不合理的 API 使用。"
│
├── Prompt 9: Obfuscation Detector
│   "實作 obfuscation-detector.ts，偵測 webpack 打包無 source map、
│    大量 Base64 字串、字串拼接隱藏 URL 等。"
│
└── Prompt 10: 剩餘的 HIGH / MEDIUM / LOW 規則
    "實作所有剩餘的偵測規則（見規則清單），每條附 test。"

Phase 3 — 評分 + 資料庫 + Reporter (Day 4)
│
├── Prompt 11: Trust Scorer
│   "實作 trust-scorer.ts，接收 findings + metadata，
│    計算 0-100 信任分數和 RiskLevel。"
│
├── Prompt 12: Known Malicious DB
│   "建立 malicious-extensions.json（收集已知案例），
│    實作 known-db-matcher.ts 做 hash + ID 比對。"
│
├── Prompt 13: SARIF Reporter
│   "實作 sarif-reporter.ts，輸出符合 SARIF 2.1.0 規範的 JSON，
│    可上傳到 GitHub Code Scanning。"
│
└── Prompt 14: 其他 Reporters
    "實作 json / markdown / html / csv reporter。"

Phase 4 — Policy + CLI 完善 (Day 5)
│
├── Prompt 15: Policy Engine
│   "實作 policy-engine.ts + policy-loader.ts，
│    載入 .extension-guard.json 並產生 PolicyViolation。"
│
├── Prompt 16: CLI inspect / audit 命令
│   "實作 inspect 和 audit 子命令。
│    inspect 支援 .vsix 掃描。audit 支援 policy 稽核 + exit code。"
│
└── Prompt 17: .vsix Extractor
    "實作 vsix-extractor.ts，用 yauzl 解壓 .vsix，
     解析其中的 extension 結構。"

Phase 5 — GitHub Action + 文件 (Day 6)
│
├── Prompt 18: GitHub Action
│   "建立 packages/action，包含 action.yml 和 main.ts。
│    支援 SARIF 上傳和 PR comment。"
│
├── Prompt 19: Integration Tests
│   "寫 full-scan 和 vsix-inspect 的 integration test，
│    使用完整的 fixture extension。"
│
└── Prompt 20: README + 文件
    "撰寫 README.md（含安裝、使用、CI/CD 範例）、
     rules.md（規則說明）、contributing.md。"
```

---

## 11. 與 ExtensionTotal 的差異化

| 比較維度 | Extension Guard | ExtensionTotal |
|----------|----------------|----------------|
| 執行環境 | 本機離線 | 雲端 API |
| 隱私 | 零資料上傳 | Extension ID 上傳到雲端 |
| 開源 | MIT License，完全透明 | 閉源 |
| CLI 支援 | CLI-First 原生設計 | 無 CLI |
| CI/CD 整合 | GitHub Action + SARIF | Jamf script（endpoint） |
| .vsix 掃描 | 支援安裝前檢查 | 僅 Marketplace 上架的 |
| MITRE ATT&CK | 每條 finding 對應 | 無 |
| Policy as Code | .extension-guard.json | 無 |
| 自定義規則 | 支援用戶自訂 | 不支援 |
| 多 IDE 支援 | VSCode / Cursor / Windsurf / Trae | 僅 VSCode |
| 費用 | 完全免費 | 個人免費（250 req/day），企業付費 |
| 分析深度 | 本地 AST + regex + entropy | 雲端 40+ findings + LLM |

**核心差異：Extension Guard 是「本機的 npm audit for IDE extensions」，ExtensionTotal 是「雲端的 VirusTotal for extensions」。兩者定位不同，可以互補。**

---

## 12. 商業模式

Extension Guard 本體永久開源免費。營收來自增值服務：

| 層級 | 內容 | 定價 |
|------|------|------|
| Community | CLI + 所有掃描功能 + GitHub Action | 永久免費 (MIT) |
| Pro API | 即時威脅 DB 更新 API + 雲端 .vsix 掃描 + 優先支援 | $9/month |
| Enterprise | 集中式 dashboard + LDAP/SSO 整合 + SLA + 客製規則 | $19/user/month |

開源 CLI 是流量入口和品牌建設；企業管理功能是營收來源。

---

## 13. 未來擴展

| 方向 | 說明 | 時程 |
|------|------|------|
| MCP Server | 讓 AI 工具（Claude Code 等）直接查詢 extension 安全狀態 | Phase 5 |
| AI 深度分析 | 接 Claude API 做語意級程式碼意圖分析 | Phase 6 |
| Browser Extension 掃描 | 擴展到 Chrome / Firefox extension | Phase 7 |
| JetBrains Plugin 掃描 | 涵蓋 IntelliJ 系列 IDE | Phase 7 |
| 即時 Marketplace 監控 | 持續監控新上架/更新的 extension | Phase 8 |
| npm / PyPI 整合 | 用同一引擎掃描 npm package 和 PyPI package | Phase 9 |
