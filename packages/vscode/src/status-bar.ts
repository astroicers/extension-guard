import * as vscode from 'vscode';
import { getScannerService } from './scanner-service';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'extensionGuardView.focus';
    this.statusBarItem.show();
    this.update();
  }

  update(): void {
    const scanner = getScannerService();
    const riskyCount = scanner.getRiskyExtensions().length;
    const totalCount = scanner.getAllCached().length;

    if (totalCount === 0) {
      // No scan performed yet
      this.statusBarItem.text = '$(shield) Extension Guard';
      this.statusBarItem.tooltip = 'Click to scan extensions';
      this.statusBarItem.backgroundColor = undefined;
    } else if (riskyCount > 0) {
      // Has risky extensions
      this.statusBarItem.text = `$(shield) ${riskyCount} risk(s)`;
      this.statusBarItem.tooltip = `Extension Guard: ${riskyCount} risky extension(s) detected. Click to view.`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      // All safe
      this.statusBarItem.text = '$(shield) Safe';
      this.statusBarItem.tooltip = `Extension Guard: All ${totalCount} extensions are safe!`;
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  setScanning(isScanning: boolean): void {
    if (isScanning) {
      this.statusBarItem.text = '$(sync~spin) Scanning...';
      this.statusBarItem.tooltip = 'Extension Guard is scanning extensions...';
    } else {
      this.update();
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

// Singleton
let instance: StatusBarManager | null = null;

export function getStatusBarManager(): StatusBarManager {
  if (!instance) {
    instance = new StatusBarManager();
  }
  return instance;
}

export function disposeStatusBarManager(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
