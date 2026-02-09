export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

export function isAtLeastSeverity(
  severity: Severity,
  minimum: Severity
): boolean {
  return SEVERITY_ORDER[severity] <= SEVERITY_ORDER[minimum];
}
