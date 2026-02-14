import * as vscode from 'vscode';
import type { FullScanReport, ScanResult, Finding } from '@aspect-guard/core';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export async function exportReport(report: FullScanReport, format: ExportFormat): Promise<void> {
  let content: string;
  let defaultFileName: string;
  let filters: Record<string, string[]>;

  switch (format) {
    case 'json':
      content = exportAsJson(report);
      defaultFileName = `extension-guard-report-${formatDate(report.timestamp)}.json`;
      filters = { 'JSON Files': ['json'] };
      break;
    case 'csv':
      content = exportAsCsv(report);
      defaultFileName = `extension-guard-report-${formatDate(report.timestamp)}.csv`;
      filters = { 'CSV Files': ['csv'] };
      break;
    case 'markdown':
      content = exportAsMarkdown(report);
      defaultFileName = `extension-guard-report-${formatDate(report.timestamp)}.md`;
      filters = { 'Markdown Files': ['md'] };
      break;
  }

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultFileName),
    filters,
  });

  if (uri) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
  }
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0] ?? 'unknown';
}

function exportAsJson(report: FullScanReport): string {
  return JSON.stringify(report, null, 2);
}

function exportAsCsv(report: FullScanReport): string {
  const headers = [
    'Extension ID',
    'Display Name',
    'Version',
    'Publisher',
    'Trust Score',
    'Risk Level',
    'Finding Count',
    'Critical',
    'High',
    'Medium',
    'Low',
  ];

  const rows = report.results.map((result) => {
    const severityCounts = countSeverities(result.findings);
    return [
      result.extensionId,
      result.displayName || '',
      result.version,
      result.metadata.publisher?.name || '',
      result.trustScore.toString(),
      result.riskLevel,
      result.findings.length.toString(),
      severityCounts.critical.toString(),
      severityCounts.high.toString(),
      severityCounts.medium.toString(),
      severityCounts.low.toString(),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ].join('\n');

  return csvContent;
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function countSeverities(findings: Finding[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
} {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) {
    if (finding.severity in counts) {
      counts[finding.severity as keyof typeof counts]++;
    }
  }
  return counts;
}

function exportAsMarkdown(report: FullScanReport): string {
  const lines: string[] = [];

  lines.push('# Extension Guard Security Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`**Scan Duration:** ${(report.scanDurationMs / 1000).toFixed(2)}s`);
  lines.push(`**Version:** ${report.version}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Scanned | ${report.uniqueExtensions} |`);
  lines.push(`| Critical Risk | ${report.summary.byRiskLevel.critical} |`);
  lines.push(`| High Risk | ${report.summary.byRiskLevel.high} |`);
  lines.push(`| Medium Risk | ${report.summary.byRiskLevel.medium} |`);
  lines.push(`| Safe | ${report.summary.byRiskLevel.safe + report.summary.byRiskLevel.low} |`);
  lines.push(`| Health Score | ${report.summary.overallHealthScore}/100 |`);
  lines.push('');

  // Group by risk level
  const critical: ScanResult[] = [];
  const high: ScanResult[] = [];
  const medium: ScanResult[] = [];
  const safe: ScanResult[] = [];

  for (const result of report.results) {
    if (result.riskLevel === 'critical') {
      critical.push(result);
    } else if (result.riskLevel === 'high') {
      high.push(result);
    } else if (result.riskLevel === 'medium') {
      medium.push(result);
    } else {
      safe.push(result);
    }
  }

  // Critical Risk
  if (critical.length > 0) {
    lines.push('## ⛔ Critical Risk Extensions');
    lines.push('');
    for (const result of critical) {
      lines.push(...renderExtensionMarkdown(result));
    }
  }

  // High Risk
  if (high.length > 0) {
    lines.push('## 🔴 High Risk Extensions');
    lines.push('');
    for (const result of high) {
      lines.push(...renderExtensionMarkdown(result));
    }
  }

  // Medium Risk
  if (medium.length > 0) {
    lines.push('## 🟡 Medium Risk Extensions');
    lines.push('');
    for (const result of medium) {
      lines.push(...renderExtensionMarkdown(result));
    }
  }

  // Safe
  if (safe.length > 0) {
    lines.push('## 🟢 Safe Extensions');
    lines.push('');
    lines.push('| Extension | Publisher | Score |');
    lines.push('|-----------|-----------|-------|');
    for (const result of safe) {
      lines.push(
        `| ${result.displayName || result.extensionId} | ${result.metadata.publisher?.name || 'Unknown'} | ${result.trustScore}/100 |`
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Generated by [Extension Guard](https://github.com/astroicers/extension-guard)*');

  return lines.join('\n');
}

function renderExtensionMarkdown(result: ScanResult): string[] {
  const lines: string[] = [];

  lines.push(`### ${result.displayName || result.extensionId}`);
  lines.push('');
  lines.push(`- **ID:** \`${result.extensionId}\``);
  lines.push(`- **Version:** ${result.version}`);
  lines.push(`- **Publisher:** ${result.metadata.publisher?.name || 'Unknown'}`);
  lines.push(`- **Trust Score:** ${result.trustScore}/100`);
  lines.push(`- **Risk Level:** ${result.riskLevel.toUpperCase()}`);
  lines.push('');

  if (result.findings.length > 0) {
    lines.push('**Findings:**');
    lines.push('');
    for (const finding of result.findings) {
      const location = finding.evidence.filePath
        ? ` (\`${finding.evidence.filePath}${finding.evidence.lineNumber ? ':' + finding.evidence.lineNumber : ''}\`)`
        : '';
      lines.push(
        `- **[${finding.severity.toUpperCase()}]** ${finding.ruleId}: ${finding.title}${location}`
      );
    }
    lines.push('');
  }

  return lines;
}
