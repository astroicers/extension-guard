import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { getExtensionWatcher, disposeExtensionWatcher } from './extension-watcher';
import { getTreeProvider } from './sidebar/provider';
import { getStatusBarManager, disposeStatusBarManager } from './status-bar';
import { showNewExtensionScanned, showWelcomeMessage } from './notifications';
import { initSuppressionManager } from './suppression-manager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Extension Guard is now active!');

  // Initialize suppression manager
  initSuppressionManager(context);

  // Register tree view
  const treeProvider = getTreeProvider();
  const treeView = vscode.window.createTreeView('extensionGuardView', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Initialize status bar
  const statusBar = getStatusBarManager();
  context.subscriptions.push(statusBar);

  // Register commands
  registerCommands(context);

  // Show welcome message on first activation
  showWelcomeMessage(context);

  // Set up extension watcher
  const watcher = getExtensionWatcher();
  context.subscriptions.push(watcher);

  // Handle new extension installations
  watcher.onNewExtension((results) => {
    treeProvider.refresh();
    statusBar.update();
    results.forEach((result) => showNewExtensionScanned(result));
  });

  // Handle scan completions
  watcher.onScanComplete(() => {
    treeProvider.refresh();
    statusBar.update();
  });

  // Perform initial scan on activation
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Extension Guard: Scanning extensions...',
      cancellable: false,
    },
    async () => {
      await watcher.performFullScan();
      statusBar.update();
      treeProvider.refresh();
    }
  );
}

export function deactivate(): void {
  disposeExtensionWatcher();
  disposeStatusBarManager();
}
