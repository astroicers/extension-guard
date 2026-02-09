import * as vscode from 'vscode';
import { getScannerService } from './scanner-service';
import { getTreeProvider } from './sidebar/provider';
import { getStatusBarManager } from './status-bar';
import { showScanComplete, showMultipleRisksWarning } from './notifications';

export function registerCommands(context: vscode.ExtensionContext): void {
  // Scan all extensions command
  const scanCommand = vscode.commands.registerCommand('extension-guard.scan', async () => {
    const statusBar = getStatusBarManager();
    const treeProvider = getTreeProvider();
    const scanner = getScannerService();

    statusBar.setScanning(true);

    try {
      const report = await scanner.scanAll();
      const riskyCount = scanner.getRiskyExtensions().length;

      treeProvider.refresh();
      statusBar.update();

      showScanComplete(report.results.length, riskyCount);

      // Show warnings for risky extensions
      if (riskyCount > 0) {
        showMultipleRisksWarning(report.results);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Extension Guard: Scan failed - ${error}`);
    } finally {
      statusBar.setScanning(false);
    }
  });

  // Scan specific extension (from context menu)
  const scanExtensionCommand = vscode.commands.registerCommand(
    'extension-guard.scanExtension',
    async (extensionId?: string) => {
      if (!extensionId) {
        vscode.window.showWarningMessage('No extension specified');
        return;
      }

      const scanner = getScannerService();
      const ext = vscode.extensions.getExtension(extensionId);

      if (!ext?.extensionPath) {
        vscode.window.showWarningMessage(`Extension not found: ${extensionId}`);
        return;
      }

      try {
        const result = await scanner.scanExtensionPath(ext.extensionPath);
        if (result) {
          getTreeProvider().refresh();
          getStatusBarManager().update();
          vscode.window.showInformationMessage(
            `Extension Guard: "${result.displayName}" - Trust Score: ${result.trustScore}/100`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Extension Guard: Scan failed - ${error}`);
      }
    }
  );

  context.subscriptions.push(scanCommand, scanExtensionCommand);
}
