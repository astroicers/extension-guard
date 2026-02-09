import * as vscode from 'vscode';

export function activate(_context: vscode.ExtensionContext) {
  console.log('Extension Guard is now active!');

  // Placeholder for scanner service, sidebar, etc.
  // The _context parameter will be used in future implementations for:
  // - Registering disposables
  // - Storing extension state
  // - Managing subscriptions
  vscode.window.showInformationMessage('Extension Guard activated');
}

export function deactivate() {}
