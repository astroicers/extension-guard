import * as vscode from 'vscode';
import type { FullScanReport, ScanResult } from '@aspect-guard/core';

let currentPanel: vscode.WebviewPanel | undefined;

export function showReportPanel(context: vscode.ExtensionContext, report: FullScanReport): void {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // If panel exists, reveal it
  if (currentPanel) {
    currentPanel.reveal(column);
    currentPanel.webview.html = getWebviewContent(report);
    return;
  }

  // Create new panel
  currentPanel = vscode.window.createWebviewPanel(
    'extensionGuardReport',
    'Extension Guard Report',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  currentPanel.webview.html = getWebviewContent(report);

  // Handle panel disposal
  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    null,
    context.subscriptions
  );

  // Handle messages from webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
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
      }
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewContent(report: FullScanReport): string {
  const { results, summary } = report;

  // Group by risk level
  const critical = results.filter((r) => r.riskLevel === 'critical');
  const high = results.filter((r) => r.riskLevel === 'high');
  const medium = results.filter((r) => r.riskLevel === 'medium');
  const safe = results.filter((r) => r.riskLevel === 'safe' || r.riskLevel === 'low');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Guard Report</title>
  <style>
    :root {
      --bg-color: var(--vscode-editor-background);
      --text-color: var(--vscode-editor-foreground);
      --border-color: var(--vscode-panel-border);
      --card-bg: var(--vscode-editorWidget-background);
      --critical-color: #f44336;
      --high-color: #ff5722;
      --medium-color: #ff9800;
      --safe-color: #4caf50;
      --info-color: #2196f3;
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
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
    }

    .header .version {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: var(--card-bg);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      border: 1px solid var(--border-color);
    }

    .summary-card .number {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .summary-card .label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
    }

    .summary-card.critical .number { color: var(--critical-color); }
    .summary-card.high .number { color: var(--high-color); }
    .summary-card.medium .number { color: var(--medium-color); }
    .summary-card.safe .number { color: var(--safe-color); }
    .summary-card.score .number { color: var(--info-color); }

    .section {
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: 600;
    }

    .section-header .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: normal;
    }

    .extension-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .extension-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.2s;
    }

    .extension-card:hover {
      border-color: var(--vscode-focusBorder);
    }

    .extension-card.critical { border-left: 4px solid var(--critical-color); }
    .extension-card.high { border-left: 4px solid var(--high-color); }
    .extension-card.medium { border-left: 4px solid var(--medium-color); }
    .extension-card.safe { border-left: 4px solid var(--safe-color); }

    .extension-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .extension-name {
      font-weight: 600;
      font-size: 14px;
    }

    .extension-version {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .trust-score {
      font-size: 14px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--vscode-badge-background);
    }

    .extension-meta {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .findings-list {
      margin-top: 8px;
      padding-left: 16px;
      border-left: 2px solid var(--border-color);
    }

    .finding {
      font-size: 12px;
      padding: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .finding-severity {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .finding-severity.critical { background: var(--critical-color); color: white; }
    .finding-severity.high { background: var(--high-color); color: white; }
    .finding-severity.medium { background: var(--medium-color); color: black; }
    .finding-severity.low { background: var(--safe-color); color: white; }
    .finding-severity.info { background: var(--info-color); color: white; }

    .finding-location {
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family);
    }

    .extension-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
    }

    .btn-danger {
      background: var(--critical-color);
      color: white;
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn:hover {
      opacity: 0.9;
    }

    .safe-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 8px;
    }

    .safe-item {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .safe-item .score {
      color: var(--safe-color);
      font-weight: 600;
    }

    .downgraded-badge {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-badge-background);
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 4px;
    }

    .timestamp {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 24px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Extension Guard Report</h1>
    <span class="version">v${report.version}</span>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="number">${report.uniqueExtensions}</div>
      <div class="label">Scanned</div>
    </div>
    <div class="summary-card critical">
      <div class="number">${summary.byRiskLevel.critical}</div>
      <div class="label">Critical</div>
    </div>
    <div class="summary-card high">
      <div class="number">${summary.byRiskLevel.high}</div>
      <div class="label">High</div>
    </div>
    <div class="summary-card medium">
      <div class="number">${summary.byRiskLevel.medium}</div>
      <div class="label">Medium</div>
    </div>
    <div class="summary-card safe">
      <div class="number">${summary.byRiskLevel.safe + summary.byRiskLevel.low}</div>
      <div class="label">Safe</div>
    </div>
    <div class="summary-card score">
      <div class="number">${summary.overallHealthScore}</div>
      <div class="label">Health Score</div>
    </div>
  </div>

  ${renderRiskSection('⛔ Critical Risk', 'critical', critical)}
  ${renderRiskSection('🔴 High Risk', 'high', high)}
  ${renderRiskSection('🟡 Medium Risk', 'medium', medium)}
  ${renderSafeSection(safe)}

  <div class="timestamp">
    Scanned at ${new Date(report.timestamp).toLocaleString()} • Completed in ${(report.scanDurationMs / 1000).toFixed(1)}s
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function disableExtension(extensionId) {
      vscode.postMessage({ command: 'disableExtension', extensionId });
    }

    function openExtension(extensionId) {
      vscode.postMessage({ command: 'openExtension', extensionId });
    }
  </script>
</body>
</html>`;
}

function renderRiskSection(title: string, riskLevel: string, extensions: ScanResult[]): string {
  if (extensions.length === 0) return '';

  return `
    <div class="section">
      <div class="section-header">
        ${title}
        <span class="badge">${extensions.length}</span>
      </div>
      <div class="extension-list">
        ${extensions.map((ext) => renderExtensionCard(ext, riskLevel)).join('')}
      </div>
    </div>
  `;
}

function renderExtensionCard(ext: ScanResult, riskLevel: string): string {
  const topFindings = ext.findings.slice(0, 5);
  const hasMore = ext.findings.length > 5;
  const downgraded = ext.findings.filter((f) => f.description?.includes('[Downgraded:')).length;

  return `
    <div class="extension-card ${riskLevel}">
      <div class="extension-header">
        <div>
          <div class="extension-name">${ext.extensionId}</div>
          <div class="extension-version">v${ext.version}</div>
        </div>
        <div class="trust-score">${ext.trustScore}/100</div>
      </div>
      <div class="extension-meta">
        Publisher: ${ext.metadata.publisher.name}
        ${downgraded > 0 ? `<span class="downgraded-badge">${downgraded} downgraded</span>` : ''}
      </div>
      ${
        topFindings.length > 0
          ? `
        <div class="findings-list">
          ${topFindings
            .map(
              (f) => `
            <div class="finding">
              <span class="finding-severity ${f.severity}">${f.severity}</span>
              <span>${f.title}</span>
              <span class="finding-location">${f.evidence.filePath}${f.evidence.lineNumber ? ':' + f.evidence.lineNumber : ''}</span>
            </div>
          `
            )
            .join('')}
          ${hasMore ? `<div class="finding" style="color: var(--vscode-descriptionForeground)">... and ${ext.findings.length - 5} more</div>` : ''}
        </div>
      `
          : ''
      }
      <div class="extension-actions">
        <button class="btn btn-danger" onclick="disableExtension('${ext.extensionId}')">Disable Extension</button>
        <button class="btn btn-secondary" onclick="openExtension('${ext.extensionId}')">View in Extensions</button>
      </div>
    </div>
  `;
}

function renderSafeSection(extensions: ScanResult[]): string {
  if (extensions.length === 0) return '';

  return `
    <div class="section">
      <div class="section-header">
        🟢 Safe Extensions
        <span class="badge">${extensions.length}</span>
      </div>
      <div class="safe-list">
        ${extensions
          .sort((a, b) => b.trustScore - a.trustScore)
          .map(
            (ext) => `
          <div class="safe-item">
            <span>${ext.extensionId}</span>
            <span class="score">${ext.trustScore}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}
