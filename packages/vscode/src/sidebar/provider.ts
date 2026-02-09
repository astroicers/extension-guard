import * as vscode from 'vscode';
import { getScannerService } from '../scanner-service';
import {
  OverviewItem,
  CategoryItem,
  ExtensionItem,
  FindingItem,
  ScanNowItem
} from './items';

type TreeItemType = OverviewItem | CategoryItem | ExtensionItem | FindingItem | ScanNowItem;

export class ExtensionGuardTreeProvider implements vscode.TreeDataProvider<TreeItemType> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItemType): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItemType): Thenable<TreeItemType[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element instanceof CategoryItem) {
      return Promise.resolve(
        element.results.map(r => new ExtensionItem(r))
      );
    }

    if (element instanceof ExtensionItem) {
      return Promise.resolve(
        element.result.findings.map(f => new FindingItem(f))
      );
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<TreeItemType[]> {
    const scanner = getScannerService();
    const results = scanner.getAllCached();

    const items: TreeItemType[] = [];

    // Overview
    const trustScore = scanner.getOverallTrustScore();
    items.push(new OverviewItem(trustScore, results.length));

    // High Risk
    const highRisk = scanner.getRiskyExtensions();
    items.push(new CategoryItem('high-risk', highRisk));

    // Medium Risk
    const mediumRisk = scanner.getMediumRiskExtensions();
    items.push(new CategoryItem('medium-risk', mediumRisk));

    // Safe
    const safe = scanner.getSafeExtensions();
    items.push(new CategoryItem('safe', safe));

    // Scan Now button
    items.push(new ScanNowItem());

    return items;
  }
}

// Singleton
let provider: ExtensionGuardTreeProvider | null = null;

export function getTreeProvider(): ExtensionGuardTreeProvider {
  if (!provider) {
    provider = new ExtensionGuardTreeProvider();
  }
  return provider;
}
