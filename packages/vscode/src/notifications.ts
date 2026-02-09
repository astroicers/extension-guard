import * as vscode from 'vscode';
import { ScanResult } from '@aspect-guard/core';

export async function showRiskWarning(result: ScanResult): Promise<void> {
  const riskLevel = result.riskLevel;

  if (riskLevel !== 'critical' && riskLevel !== 'high') {
    return; // Only show warnings for critical/high risk
  }

  const topFindings = result.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 3)
    .map((f) => `• ${f.ruleId}: ${f.title}`)
    .join('\n');

  const message = `⚠️ Security Risk Detected!\n\n"${result.displayName || result.extensionId}" has been flagged as ${riskLevel.toUpperCase()} RISK.\n\nTrust Score: ${result.trustScore}/100\n\nFindings:\n${topFindings}`;

  const selection = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    'Disable Extension',
    'View Details',
    'Ignore'
  );

  switch (selection) {
    case 'Disable Extension':
      await disableExtension(result.extensionId);
      break;
    case 'View Details':
      await vscode.commands.executeCommand('extensionGuardView.focus');
      break;
    case 'Ignore':
      // Do nothing, user acknowledged
      break;
  }
}

export async function showMultipleRisksWarning(results: ScanResult[]): Promise<void> {
  const riskyResults = results.filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high');

  if (riskyResults.length === 0) {
    return;
  }

  if (riskyResults.length === 1) {
    return showRiskWarning(riskyResults[0]!);
  }

  // Multiple risky extensions
  const extensionList = riskyResults
    .slice(0, 5)
    .map((r) => `• ${r.displayName || r.extensionId} (Score: ${r.trustScore})`)
    .join('\n');

  const message = `⚠️ Multiple Security Risks Detected!\n\n${riskyResults.length} extensions flagged:\n${extensionList}${riskyResults.length > 5 ? `\n...and ${riskyResults.length - 5} more` : ''}`;

  const selection = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    'View Details',
    'Ignore'
  );

  if (selection === 'View Details') {
    await vscode.commands.executeCommand('extensionGuardView.focus');
  }
}

export function showScanComplete(totalCount: number, riskyCount: number): void {
  if (riskyCount > 0) {
    vscode.window
      .showWarningMessage(
        `Extension Guard: Scan complete. ${riskyCount} risky extension(s) found out of ${totalCount}.`,
        'View Details'
      )
      .then((selection) => {
        if (selection === 'View Details') {
          vscode.commands.executeCommand('extensionGuardView.focus');
        }
      });
  } else {
    vscode.window.showInformationMessage(
      `Extension Guard: Scan complete. All ${totalCount} extensions are safe!`
    );
  }
}

export function showNewExtensionScanned(result: ScanResult): void {
  if (result.riskLevel === 'critical' || result.riskLevel === 'high') {
    showRiskWarning(result);
  } else {
    // Optional: show subtle notification for safe extensions
    vscode.window.showInformationMessage(
      `Extension Guard: "${result.displayName || result.extensionId}" scanned - Trust Score: ${result.trustScore}/100`
    );
  }
}

async function disableExtension(extensionId: string): Promise<void> {
  try {
    // VS Code doesn't have a direct API to disable extensions
    // We can only suggest the user to do it manually
    const selection = await vscode.window.showInformationMessage(
      `To disable "${extensionId}", go to Extensions view and click the gear icon > Disable.`,
      'Open Extensions'
    );

    if (selection === 'Open Extensions') {
      await vscode.commands.executeCommand('workbench.extensions.search', extensionId);
    }
  } catch (error) {
    console.error('Extension Guard: Failed to disable extension:', error);
  }
}
