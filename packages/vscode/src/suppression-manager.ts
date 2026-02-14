import * as vscode from 'vscode';

const GLOBAL_STATE_KEY = 'extensionGuard.suppressions';

export interface Suppression {
  extensionId: string;
  ruleId: string;
  findingId?: string;
  reason?: string;
  suppressedAt: string;
}

let context: vscode.ExtensionContext | null = null;

export function initSuppressionManager(ctx: vscode.ExtensionContext): void {
  context = ctx;
}

function getSuppressions(): Suppression[] {
  if (!context) return [];
  return context.globalState.get<Suppression[]>(GLOBAL_STATE_KEY) || [];
}

async function saveSuppressions(suppressions: Suppression[]): Promise<void> {
  if (!context) return;
  await context.globalState.update(GLOBAL_STATE_KEY, suppressions);
}

export async function addSuppression(
  extensionId: string,
  ruleId: string,
  findingId?: string,
  reason?: string
): Promise<void> {
  const suppressions = getSuppressions();

  // Check if already suppressed
  const existing = suppressions.find(
    (s) => s.extensionId === extensionId && s.ruleId === ruleId && s.findingId === findingId
  );

  if (existing) {
    return; // Already suppressed
  }

  suppressions.push({
    extensionId,
    ruleId,
    findingId,
    reason,
    suppressedAt: new Date().toISOString(),
  });

  await saveSuppressions(suppressions);
}

export async function removeSuppression(
  extensionId: string,
  ruleId: string,
  findingId?: string
): Promise<void> {
  const suppressions = getSuppressions();

  const filtered = suppressions.filter(
    (s) => !(s.extensionId === extensionId && s.ruleId === ruleId && s.findingId === findingId)
  );

  await saveSuppressions(filtered);
}

export function isSuppressed(
  extensionId: string,
  ruleId: string,
  findingId?: string
): boolean {
  const suppressions = getSuppressions();

  return suppressions.some(
    (s) =>
      s.extensionId === extensionId &&
      s.ruleId === ruleId &&
      (s.findingId === undefined || s.findingId === findingId)
  );
}

export function getSuppressionCount(): number {
  return getSuppressions().length;
}

export function getAllSuppressions(): Suppression[] {
  return getSuppressions();
}

export async function clearAllSuppressions(): Promise<void> {
  await saveSuppressions([]);
}

export function getSuppressionsForExtension(extensionId: string): Suppression[] {
  return getSuppressions().filter((s) => s.extensionId === extensionId);
}
