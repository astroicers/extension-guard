import type { Severity } from './severity.js';

export type FindingCategory =
  | 'data-exfiltration'
  | 'remote-code-execution'
  | 'credential-theft'
  | 'keylogger'
  | 'code-obfuscation'
  | 'suspicious-network'
  | 'excessive-permission'
  | 'known-malicious'
  | 'hardcoded-secret'
  | 'vulnerable-dependency'
  | 'persistence'
  | 'supply-chain'
  | 'crypto-mining';

export interface Evidence {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
  lineContent?: string;
  contextBefore?: string[];
  contextAfter?: string[];
  matchedPattern?: string;
  snippet?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence: Evidence;
  mitreAttackId?: string;
  remediation?: string;
}
