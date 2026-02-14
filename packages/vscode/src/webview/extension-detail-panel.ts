import * as vscode from 'vscode';
import type { ScanResult, Finding } from '@aspect-guard/core';
import { getScannerService } from '../scanner-service';
import { getTreeProvider } from '../sidebar/provider';
import { getStatusBarManager } from '../status-bar';
import { addSuppression, removeSuppression, isSuppressed } from '../suppression-manager';

let currentPanel: vscode.WebviewPanel | undefined;
let currentResult: ScanResult | undefined;

export function showExtensionDetailPanel(
  context: vscode.ExtensionContext,
  result: ScanResult
): void {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // Store current result
  currentResult = result;

  // If panel exists, update content
  if (currentPanel) {
    currentPanel.reveal(column);
    currentPanel.title = `${result.displayName || result.extensionId}`;
    currentPanel.webview.html = getWebviewContent(result);
    return;
  }

  // Create new panel
  currentPanel = vscode.window.createWebviewPanel(
    'extensionGuardDetail',
    `${result.displayName || result.extensionId}`,
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  currentPanel.webview.html = getWebviewContent(result);

  // Handle panel disposal
  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
      currentResult = undefined;
    },
    null,
    context.subscriptions
  );

  // Handle messages from webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'openFile':
          await openFileAtLine(message.filePath, message.lineNumber);
          break;
        case 'disableExtension':
          await vscode.commands.executeCommand(
            'workbench.extensions.disableExtension',
            message.extensionId
          );
          vscode.window.showInformationMessage(`Disabled extension: ${message.extensionId}`);
          break;
        case 'openExtension':
          await vscode.commands.executeCommand(
            'workbench.extensions.search',
            `@id:${message.extensionId}`
          );
          break;
        case 'rescan':
          await rescanExtension(context, message.extensionId);
          break;
        case 'suppressFinding':
          await addSuppression(message.extensionId, message.ruleId, message.findingId);
          vscode.window.showInformationMessage(`Finding suppressed: ${message.ruleId}`);
          getTreeProvider().refresh();
          // Refresh panel to show updated state
          if (currentResult && currentPanel) {
            currentPanel.webview.html = getWebviewContent(currentResult);
          }
          break;
        case 'unsuppressFinding':
          await removeSuppression(message.extensionId, message.ruleId, message.findingId);
          vscode.window.showInformationMessage(`Finding restored: ${message.ruleId}`);
          getTreeProvider().refresh();
          // Refresh panel to show updated state
          if (currentResult && currentPanel) {
            currentPanel.webview.html = getWebviewContent(currentResult);
          }
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}

async function openFileAtLine(filePath: string, lineNumber?: number): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);

    if (lineNumber && lineNumber > 0) {
      const position = new vscode.Position(lineNumber - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }
  } catch {
    vscode.window.showWarningMessage(`Cannot open file: ${filePath}`);
  }
}

async function rescanExtension(
  _context: vscode.ExtensionContext,
  extensionId: string
): Promise<void> {
  const scanner = getScannerService();
  const ext = vscode.extensions.getExtension(extensionId);

  if (!ext?.extensionPath) {
    vscode.window.showWarningMessage(`Extension not found: ${extensionId}`);
    return;
  }

  const statusBar = getStatusBarManager();
  statusBar.setScanning(true);

  try {
    const result = await scanner.scanExtensionPath(ext.extensionPath);
    if (result) {
      getTreeProvider().refresh();
      statusBar.update();
      // Update the current panel with new results
      if (currentPanel) {
        currentPanel.webview.html = getWebviewContent(result);
      }
      vscode.window.showInformationMessage(
        `Re-scanned "${result.displayName}" - Trust Score: ${result.trustScore}/100`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Scan failed: ${error}`);
  } finally {
    statusBar.setScanning(false);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getWebviewContent(result: ScanResult): string {
  const riskLevelLabel = result.riskLevel.toUpperCase();
  const riskLevelClass = result.riskLevel === 'safe' || result.riskLevel === 'low' ? 'safe' : result.riskLevel;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(result.displayName || result.extensionId)}</title>
  <style>
    :root {
      --bg-color: var(--vscode-editor-background);
      --text-color: var(--vscode-editor-foreground);
      --border-color: var(--vscode-panel-border);
      --card-bg: var(--vscode-editorWidget-background);
      --critical-color: #f44336;
      --high-color: #ff5722;
      --medium-color: #ff9800;
      --low-color: #8bc34a;
      --safe-color: #4caf50;
      --info-color: #2196f3;
      --code-bg: var(--vscode-textCodeBlock-background, rgba(0, 0, 0, 0.2));
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-color);
      background: var(--bg-color);
      padding: 20px;
      line-height: 1.5;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-left h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .header-left .extension-id {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family);
    }

    .header-right {
      text-align: right;
    }

    .trust-score {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .trust-score.critical { color: var(--critical-color); }
    .trust-score.high { color: var(--high-color); }
    .trust-score.medium { color: var(--medium-color); }
    .trust-score.low { color: var(--low-color); }
    .trust-score.safe { color: var(--safe-color); }

    .risk-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-badge.critical { background: var(--critical-color); color: white; }
    .risk-badge.high { background: var(--high-color); color: white; }
    .risk-badge.medium { background: var(--medium-color); color: black; }
    .risk-badge.low { background: var(--low-color); color: white; }
    .risk-badge.safe { background: var(--safe-color); color: white; }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title .count {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: normal;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      background: var(--card-bg);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .metadata-item {
      font-size: 12px;
    }

    .metadata-item dt {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 2px;
    }

    .metadata-item dd {
      font-weight: 500;
    }

    .findings-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      border-left: 4px solid var(--border-color);
    }

    .finding-card.critical { border-left-color: var(--critical-color); }
    .finding-card.high { border-left-color: var(--high-color); }
    .finding-card.medium { border-left-color: var(--medium-color); }
    .finding-card.low { border-left-color: var(--low-color); }
    .finding-card.info { border-left-color: var(--info-color); }

    .finding-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .severity-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-badge.critical { background: var(--critical-color); color: white; }
    .severity-badge.high { background: var(--high-color); color: white; }
    .severity-badge.medium { background: var(--medium-color); color: black; }
    .severity-badge.low { background: var(--low-color); color: white; }
    .severity-badge.info { background: var(--info-color); color: white; }

    .rule-id {
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .category-badge {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 3px;
    }

    .mitre-link {
      font-size: 10px;
      color: var(--info-color);
      text-decoration: none;
    }

    .mitre-link:hover {
      text-decoration: underline;
    }

    .finding-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .finding-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
    }

    .evidence {
      margin-top: 12px;
    }

    .file-location {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
      color: var(--info-color);
      cursor: pointer;
      margin-bottom: 8px;
    }

    .file-location:hover {
      text-decoration: underline;
    }

    .code-snippet {
      background: var(--code-bg);
      border-radius: 4px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      overflow-x: auto;
      margin-bottom: 8px;
    }

    .code-line {
      display: flex;
      white-space: pre;
    }

    .line-number {
      color: var(--vscode-editorLineNumber-foreground);
      min-width: 40px;
      text-align: right;
      padding-right: 12px;
      user-select: none;
    }

    .line-content {
      flex: 1;
    }

    .code-line.highlighted {
      background: rgba(255, 235, 59, 0.15);
      margin: 0 -12px;
      padding: 0 12px;
    }

    .code-line.highlighted .line-content {
      color: var(--vscode-editor-foreground);
    }

    .code-line.context {
      opacity: 0.6;
    }

    .matched-pattern {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .matched-pattern code {
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .remediation {
      margin-top: 12px;
      padding: 12px;
      background: rgba(76, 175, 80, 0.1);
      border-radius: 4px;
      border-left: 3px solid var(--safe-color);
    }

    .remediation-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--safe-color);
      margin-bottom: 4px;
    }

    .remediation-text {
      font-size: 12px;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      transition: opacity 0.2s;
    }

    .btn:hover {
      opacity: 0.85;
    }

    .btn-danger {
      background: var(--critical-color);
      color: white;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .no-findings {
      text-align: center;
      padding: 32px;
      color: var(--vscode-descriptionForeground);
    }

    .no-findings .icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .finding-card.suppressed {
      opacity: 0.5;
      border-left-color: var(--vscode-descriptionForeground);
    }

    .finding-card.suppressed .finding-title {
      text-decoration: line-through;
    }

    .suppressed-badge {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--vscode-descriptionForeground);
      color: var(--bg-color);
      border-radius: 3px;
      margin-left: auto;
    }

    .finding-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }

    .btn-small {
      padding: 4px 8px;
      font-size: 11px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-color);
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-small:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${escapeHtml(result.displayName || result.extensionId)}</h1>
      <div class="extension-id">${escapeHtml(result.extensionId)} • v${escapeHtml(result.version)}</div>
    </div>
    <div class="header-right">
      <div class="trust-score ${riskLevelClass}">${result.trustScore}/100</div>
      <span class="risk-badge ${riskLevelClass}">${riskLevelLabel} Risk</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Extension Information</div>
    <div class="metadata-grid">
      <div class="metadata-item">
        <dt>Publisher</dt>
        <dd>${escapeHtml(result.metadata.publisher?.name || 'Unknown')}</dd>
      </div>
      <div class="metadata-item">
        <dt>Version</dt>
        <dd>${escapeHtml(result.version)}</dd>
      </div>
      <div class="metadata-item">
        <dt>License</dt>
        <dd>${escapeHtml(result.metadata.license || 'Not specified')}</dd>
      </div>
      <div class="metadata-item">
        <dt>Categories</dt>
        <dd>${result.metadata.categories?.length ? escapeHtml(result.metadata.categories.join(', ')) : 'None'}</dd>
      </div>
      <div class="metadata-item">
        <dt>Files Analyzed</dt>
        <dd>${result.analyzedFiles} files</dd>
      </div>
      <div class="metadata-item">
        <dt>Scan Duration</dt>
        <dd>${(result.scanDurationMs / 1000).toFixed(2)}s</dd>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">
      Security Findings
      <span class="count">${result.findings.length}</span>
    </div>
    ${result.findings.length > 0 ? renderFindings(result) : renderNoFindings()}
  </div>

  <div class="actions">
    <button class="btn btn-danger" onclick="disableExtension('${escapeHtml(result.extensionId)}')">Disable Extension</button>
    <button class="btn btn-secondary" onclick="openExtension('${escapeHtml(result.extensionId)}')">View in Extensions</button>
    <button class="btn btn-primary" onclick="rescan('${escapeHtml(result.extensionId)}')">Re-scan</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function openFile(filePath, lineNumber) {
      vscode.postMessage({ command: 'openFile', filePath, lineNumber });
    }

    function disableExtension(extensionId) {
      vscode.postMessage({ command: 'disableExtension', extensionId });
    }

    function openExtension(extensionId) {
      vscode.postMessage({ command: 'openExtension', extensionId });
    }

    function rescan(extensionId) {
      vscode.postMessage({ command: 'rescan', extensionId });
    }

    function suppressFinding(extensionId, ruleId, findingId) {
      vscode.postMessage({ command: 'suppressFinding', extensionId, ruleId, findingId });
    }

    function unsuppressFinding(extensionId, ruleId, findingId) {
      vscode.postMessage({ command: 'unsuppressFinding', extensionId, ruleId, findingId });
    }
  </script>
</body>
</html>`;
}

function renderFindings(result: ScanResult): string {
  // Sort findings by severity, then by suppression status
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const sorted = [...result.findings].sort((a, b) => {
    const aSuppressed = isSuppressed(result.extensionId, a.ruleId, a.id);
    const bSuppressed = isSuppressed(result.extensionId, b.ruleId, b.id);

    // Non-suppressed first
    if (aSuppressed !== bSuppressed) {
      return aSuppressed ? 1 : -1;
    }

    return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
  });

  const suppressedCount = result.findings.filter((f) =>
    isSuppressed(result.extensionId, f.ruleId, f.id)
  ).length;

  return `
    ${suppressedCount > 0 ? `<div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 12px;">${suppressedCount} finding(s) suppressed</div>` : ''}
    <div class="findings-list">
      ${sorted.map((f) => renderFinding(f, result.extensionId, result.metadata.installPath)).join('')}
    </div>
  `;
}

function renderFinding(finding: Finding, extensionId: string, installPath: string): string {
  const evidence = finding.evidence;
  const fullPath = installPath && evidence.filePath
    ? `${installPath}/${evidence.filePath}`.replace(/\/+/g, '/')
    : evidence.filePath;
  const suppressed = isSuppressed(extensionId, finding.ruleId, finding.id);

  return `
    <div class="finding-card ${finding.severity}${suppressed ? ' suppressed' : ''}">
      <div class="finding-header">
        <span class="severity-badge ${finding.severity}">${finding.severity}</span>
        <span class="rule-id">${escapeHtml(finding.ruleId)}</span>
        <span class="category-badge">${escapeHtml(finding.category)}</span>
        ${
          finding.mitreAttackId
            ? `<a class="mitre-link" href="https://attack.mitre.org/techniques/${finding.mitreAttackId}/" target="_blank">${escapeHtml(finding.mitreAttackId)}</a>`
            : ''
        }
        ${suppressed ? '<span class="suppressed-badge">Suppressed</span>' : ''}
      </div>
      <div class="finding-title">${escapeHtml(finding.title)}</div>
      <div class="finding-description">${escapeHtml(finding.description)}</div>

      <div class="evidence">
        ${
          evidence.filePath
            ? `<div class="file-location" onclick="openFile('${escapeHtml(fullPath)}', ${evidence.lineNumber || 1})">
                 ${escapeHtml(evidence.filePath)}${evidence.lineNumber ? ':' + evidence.lineNumber : ''}
               </div>`
            : ''
        }
        ${renderCodeSnippet(evidence)}
        ${
          evidence.matchedPattern
            ? `<div class="matched-pattern">Matched: <code>${escapeHtml(evidence.matchedPattern)}</code></div>`
            : ''
        }
      </div>

      ${
        finding.remediation
          ? `<div class="remediation">
               <div class="remediation-title">Remediation</div>
               <div class="remediation-text">${escapeHtml(finding.remediation)}</div>
             </div>`
          : ''
      }

      <div class="finding-actions">
        ${
          suppressed
            ? `<button class="btn-small" onclick="unsuppressFinding('${escapeHtml(extensionId)}', '${escapeHtml(finding.ruleId)}', '${escapeHtml(finding.id)}')">Restore Finding</button>`
            : `<button class="btn-small" onclick="suppressFinding('${escapeHtml(extensionId)}', '${escapeHtml(finding.ruleId)}', '${escapeHtml(finding.id)}')">Suppress (Ignore)</button>`
        }
      </div>
    </div>
  `;
}

function renderCodeSnippet(evidence: { lineNumber?: number; lineContent?: string; contextBefore?: string[]; contextAfter?: string[] }): string {
  if (!evidence.lineContent && !evidence.contextBefore?.length && !evidence.contextAfter?.length) {
    return '';
  }

  const lines: { number: number; content: string; highlighted: boolean }[] = [];
  const startLine = evidence.lineNumber || 1;

  // Context before
  if (evidence.contextBefore?.length) {
    evidence.contextBefore.forEach((content, i) => {
      lines.push({
        number: startLine - evidence.contextBefore!.length + i,
        content,
        highlighted: false,
      });
    });
  }

  // Main line
  if (evidence.lineContent) {
    lines.push({
      number: startLine,
      content: evidence.lineContent,
      highlighted: true,
    });
  }

  // Context after
  if (evidence.contextAfter?.length) {
    evidence.contextAfter.forEach((content, i) => {
      lines.push({
        number: startLine + 1 + i,
        content,
        highlighted: false,
      });
    });
  }

  if (lines.length === 0) return '';

  return `
    <div class="code-snippet">
      ${lines
        .map(
          (line) => `
        <div class="code-line ${line.highlighted ? 'highlighted' : 'context'}">
          <span class="line-number">${line.number}</span>
          <span class="line-content">${escapeHtml(line.content)}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderNoFindings(): string {
  return `
    <div class="no-findings">
      <div class="icon">&#10003;</div>
      <div>No security issues detected</div>
    </div>
  `;
}
