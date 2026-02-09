import type { DetectionRule } from '../rule.interface.js';
import type { Evidence } from '../../types/index.js';
import type { ExtensionManifest } from '../../types/index.js';

export const medExcessiveActivation: DetectionRule = {
  id: 'EG-MED-001',
  name: 'Excessive Activation Events',
  description:
    'Extension uses "*" activation event which means it activates on every action, potentially for surveillance',
  severity: 'medium',
  category: 'excessive-permission',
  enabled: true,

  detect(_files: Map<string, string>, manifest: ExtensionManifest): Evidence[] {
    const evidences: Evidence[] = [];

    const activationEvents = manifest.activationEvents ?? [];

    // Check for "*" activation event
    if (activationEvents.includes('*')) {
      evidences.push({
        filePath: 'package.json',
        lineNumber: 1,
        matchedPattern: 'activation-star',
        snippet: 'activationEvents: ["*"]',
        lineContent: 'Extension activates on every VS Code action',
      });
    }

    // Check for onStartupFinished (runs immediately after VS Code starts)
    if (activationEvents.includes('onStartupFinished')) {
      evidences.push({
        filePath: 'package.json',
        lineNumber: 1,
        matchedPattern: 'activation-startup',
        snippet: 'activationEvents: ["onStartupFinished"]',
        lineContent: 'Extension activates immediately on VS Code startup',
      });
    }

    return evidences;
  },
};
