import type { Severity } from './severity.js';

export interface ScanOptions {
  idePaths?: string[];
  autoDetect?: boolean;
  severity?: Severity;
  rules?: string[];
  skipRules?: string[];
  concurrency?: number;
  timeout?: number;
}

export interface InspectOptions {
  vsixPath: string;
  severity?: Severity;
  rules?: string[];
}
