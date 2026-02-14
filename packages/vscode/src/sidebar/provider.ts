import * as vscode from 'vscode';
import { getScannerService } from '../scanner-service';
import { OverviewItem, CategoryItem, ExtensionItem, FindingItem, ScanNowItem } from './items';
import type { ScanResult } from '@aspect-guard/core';

type TreeItemType = OverviewItem | CategoryItem | ExtensionItem | FindingItem | ScanNowItem;

export type RiskFilter = 'all' | 'critical' | 'high' | 'medium' | 'safe';

export class ExtensionGuardTreeProvider implements vscode.TreeDataProvider<TreeItemType> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private searchQuery: string = '';
  private riskFilter: RiskFilter = 'all';

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query.toLowerCase().trim();
    this.refresh();
  }

  getSearchQuery(): string {
    return this.searchQuery;
  }

  setRiskFilter(filter: RiskFilter): void {
    this.riskFilter = filter;
    this.refresh();
  }

  getRiskFilter(): RiskFilter {
    return this.riskFilter;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.riskFilter = 'all';
    this.refresh();
  }

  private matchesSearch(result: ScanResult): boolean {
    if (!this.searchQuery) return true;

    const searchFields = [
      result.extensionId,
      result.displayName || '',
      result.metadata.publisher?.name || '',
    ].map((s) => s.toLowerCase());

    return searchFields.some((field) => field.includes(this.searchQuery));
  }

  private matchesRiskFilter(result: ScanResult): boolean {
    if (this.riskFilter === 'all') return true;

    switch (this.riskFilter) {
      case 'critical':
        return result.riskLevel === 'critical';
      case 'high':
        return result.riskLevel === 'critical' || result.riskLevel === 'high';
      case 'medium':
        return result.riskLevel === 'medium';
      case 'safe':
        return result.riskLevel === 'safe' || result.riskLevel === 'low';
      default:
        return true;
    }
  }

  private filterResults(results: ScanResult[]): ScanResult[] {
    return results.filter((r) => this.matchesSearch(r) && this.matchesRiskFilter(r));
  }

  getTreeItem(element: TreeItemType): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItemType): Thenable<TreeItemType[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element instanceof CategoryItem) {
      return Promise.resolve(element.results.map((r) => new ExtensionItem(r)));
    }

    if (element instanceof ExtensionItem) {
      return Promise.resolve(element.result.findings.map((f) => new FindingItem(f)));
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<TreeItemType[]> {
    const scanner = getScannerService();
    const allResults = scanner.getAllCached();

    const items: TreeItemType[] = [];

    // Apply filters
    const filteredResults = this.filterResults(allResults);

    // Show filter indicator if active
    const hasActiveFilter = this.searchQuery || this.riskFilter !== 'all';
    const filterSuffix = hasActiveFilter
      ? ` (filtered: ${filteredResults.length}/${allResults.length})`
      : '';

    // Overview
    const trustScore = scanner.getOverallTrustScore();
    items.push(new OverviewItem(trustScore, allResults.length, filterSuffix));

    // High Risk
    const highRisk = filteredResults.filter(
      (r) => r.riskLevel === 'critical' || r.riskLevel === 'high'
    );
    items.push(new CategoryItem('high-risk', highRisk));

    // Medium Risk
    const mediumRisk = filteredResults.filter((r) => r.riskLevel === 'medium');
    items.push(new CategoryItem('medium-risk', mediumRisk));

    // Safe
    const safe = filteredResults.filter((r) => r.riskLevel === 'safe' || r.riskLevel === 'low');
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
