import * as vscode from 'vscode';
import { ScanResult, Finding } from '@aspect-guard/core';

export class OverviewItem extends vscode.TreeItem {
  constructor(trustScore: number, extensionCount: number) {
    super(`Overview`, vscode.TreeItemCollapsibleState.None);
    this.description = `Trust Score: ${trustScore}/100 (${extensionCount} extensions)`;
    this.iconPath = new vscode.ThemeIcon('graph');
    this.contextValue = 'overview';
  }
}

export class CategoryItem extends vscode.TreeItem {
  constructor(
    public readonly category: 'high-risk' | 'medium-risk' | 'safe',
    public readonly results: ScanResult[]
  ) {
    const label =
      category === 'high-risk' ? 'High Risk' : category === 'medium-risk' ? 'Medium Risk' : 'Safe';
    const icon =
      category === 'high-risk' ? 'warning' : category === 'medium-risk' ? 'alert' : 'check';

    super(
      label,
      results.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.description = `(${results.length})`;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = 'category';
  }
}

export class ExtensionItem extends vscode.TreeItem {
  constructor(public readonly result: ScanResult) {
    super(
      result.displayName || result.extensionId,
      result.findings.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.description = `Score: ${result.trustScore}`;

    // Icon based on risk level
    const iconName =
      result.riskLevel === 'critical' || result.riskLevel === 'high'
        ? 'error'
        : result.riskLevel === 'medium'
          ? 'warning'
          : 'pass';
    this.iconPath = new vscode.ThemeIcon(iconName);

    this.tooltip = `${result.extensionId}\nVersion: ${result.version}\nTrust Score: ${result.trustScore}/100\nRisk Level: ${result.riskLevel}\n\nClick to view details`;
    this.contextValue = 'extension';

    // Click to show detail panel
    this.command = {
      command: 'extension-guard.showExtensionDetail',
      title: 'Show Extension Details',
      arguments: [this.result],
    };
  }
}

export class FindingItem extends vscode.TreeItem {
  constructor(public readonly finding: Finding) {
    super(`${finding.ruleId}: ${finding.title}`, vscode.TreeItemCollapsibleState.None);

    const iconName =
      finding.severity === 'critical' || finding.severity === 'high'
        ? 'error'
        : finding.severity === 'medium'
          ? 'warning'
          : 'info';
    this.iconPath = new vscode.ThemeIcon(iconName);

    this.tooltip = finding.description;
    this.contextValue = 'finding';
  }
}

export class ScanNowItem extends vscode.TreeItem {
  constructor() {
    super('Scan Now', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('refresh');
    this.command = {
      command: 'extension-guard.scan',
      title: 'Scan All Extensions',
    };
    this.contextValue = 'scanNow';
  }
}
