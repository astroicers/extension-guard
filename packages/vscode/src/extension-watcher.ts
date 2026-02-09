import * as vscode from 'vscode';
import { ScanResult } from '@aspect-guard/core';
import { getScannerService } from './scanner-service';

export type ExtensionWatcherCallback = (results: ScanResult[]) => void;

export class ExtensionWatcher implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private knownExtensions: Set<string> = new Set();
  private onNewExtensionCallbacks: ExtensionWatcherCallback[] = [];
  private onScanCompleteCallbacks: ExtensionWatcherCallback[] = [];

  constructor() {
    // Initialize with current extensions
    vscode.extensions.all.forEach(ext => {
      this.knownExtensions.add(ext.id);
    });

    // Listen for extension changes
    this.disposables.push(
      vscode.extensions.onDidChange(() => {
        this.checkForNewExtensions();
      })
    );
  }

  private async checkForNewExtensions(): Promise<void> {
    const currentExtensions = new Set(vscode.extensions.all.map(ext => ext.id));
    const newExtensions: string[] = [];

    // Find newly installed extensions
    currentExtensions.forEach(id => {
      if (!this.knownExtensions.has(id)) {
        newExtensions.push(id);
      }
    });

    // Update known extensions
    this.knownExtensions = currentExtensions;

    if (newExtensions.length > 0) {
      console.log('Extension Guard: New extensions detected:', newExtensions);
      await this.scanNewExtensions(newExtensions);
    }
  }

  private async scanNewExtensions(extensionIds: string[]): Promise<void> {
    const scanner = getScannerService();
    const results: ScanResult[] = [];

    for (const id of extensionIds) {
      const ext = vscode.extensions.getExtension(id);
      if (ext?.extensionPath) {
        const result = await scanner.scanExtensionPath(ext.extensionPath);
        if (result) {
          results.push(result);
        }
      }
    }

    if (results.length > 0) {
      this.notifyNewExtensions(results);
    }
  }

  private notifyNewExtensions(results: ScanResult[]): void {
    this.onNewExtensionCallbacks.forEach(callback => {
      try {
        callback(results);
      } catch (error) {
        console.error('Extension Guard: Callback error:', error);
      }
    });
  }

  public onNewExtension(callback: ExtensionWatcherCallback): vscode.Disposable {
    this.onNewExtensionCallbacks.push(callback);
    return {
      dispose: () => {
        const index = this.onNewExtensionCallbacks.indexOf(callback);
        if (index > -1) {
          this.onNewExtensionCallbacks.splice(index, 1);
        }
      }
    };
  }

  public onScanComplete(callback: ExtensionWatcherCallback): vscode.Disposable {
    this.onScanCompleteCallbacks.push(callback);
    return {
      dispose: () => {
        const index = this.onScanCompleteCallbacks.indexOf(callback);
        if (index > -1) {
          this.onScanCompleteCallbacks.splice(index, 1);
        }
      }
    };
  }

  public async performFullScan(): Promise<ScanResult[]> {
    const scanner = getScannerService();
    const report = await scanner.scanAll();

    this.onScanCompleteCallbacks.forEach(callback => {
      try {
        callback(report.results);
      } catch (error) {
        console.error('Extension Guard: Scan complete callback error:', error);
      }
    });

    return report.results;
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.onNewExtensionCallbacks = [];
    this.onScanCompleteCallbacks = [];
  }
}

// Singleton instance
let instance: ExtensionWatcher | null = null;

export function getExtensionWatcher(): ExtensionWatcher {
  if (!instance) {
    instance = new ExtensionWatcher();
  }
  return instance;
}

export function disposeExtensionWatcher(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
