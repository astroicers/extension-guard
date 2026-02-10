import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs';
import {
  ExtensionGuardScanner,
  VERSION,
  JsonReporter,
  SarifReporter,
  MarkdownReporter,
  loadPolicyConfig,
  PolicyEngine,
  DETECTION_RULES,
} from '@aspect-guard/core';
import type { FullScanReport, Reporter, PolicyViolation, PolicyAction } from '@aspect-guard/core';

// CLI output configuration
interface OutputConfig {
  color: boolean;
  emoji: boolean;
}

let outputConfig: OutputConfig = {
  color: true,
  emoji: true,
};

// Emoji/text mappings
const icons = {
  shield: () => (outputConfig.emoji ? '🛡️' : '[GUARD]'),
  folder: () => (outputConfig.emoji ? '📁' : '[DIR]'),
  critical: () => (outputConfig.emoji ? '⛔' : '[!!!]'),
  high: () => (outputConfig.emoji ? '🔴' : '[!!]'),
  medium: () => (outputConfig.emoji ? '🟡' : '[!]'),
  safe: () => (outputConfig.emoji ? '🟢' : '[OK]'),
  summary: () => (outputConfig.emoji ? '📊' : '[SUM]'),
  time: () => (outputConfig.emoji ? '⏱️' : '[TIME]'),
  check: () => (outputConfig.emoji ? '✓' : '[v]'),
  cross: () => (outputConfig.emoji ? '✗' : '[x]'),
  info: () => (outputConfig.emoji ? 'ℹ' : '[i]'),
};

export function createCli(): Command {
  const program = new Command();

  program
    .name('extension-guard')
    .description('Scan VSCode extensions for security issues')
    .version(VERSION)
    .option('--no-color', 'Disable colored output')
    .option('--no-emoji', 'Disable emoji output')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      outputConfig.color = opts.color !== false;
      outputConfig.emoji = opts.emoji !== false;
      if (!outputConfig.color) {
        chalk.level = 0;
      }
    });

  // Init command - create policy configuration file
  program
    .command('init')
    .description('Create a new .extension-guard.json policy configuration file')
    .option('-f, --force', 'Overwrite existing configuration file')
    .option('-o, --output <path>', 'Output path for configuration file', '.extension-guard.json')
    .action((options) => {
      const configPath = options.output;

      if (fs.existsSync(configPath) && !options.force) {
        console.error(chalk.red(`Error: ${configPath} already exists.`));
        console.error(chalk.dim('Use --force to overwrite.'));
        process.exit(2);
      }

      const template = {
        $schema:
          'https://raw.githubusercontent.com/astroicers/extension-guard/main/schemas/policy.schema.json',
        version: '1.0',
        policy: {
          allowlist: [],
          blocklist: [],
          rules: {
            minTrustScore: {
              enabled: true,
              threshold: 60,
              action: 'warn',
            },
            blockObfuscated: {
              enabled: false,
              action: 'info',
            },
            requireVerifiedPublisher: {
              enabled: false,
              action: 'info',
            },
          },
        },
        scanning: {
          minSeverity: 'info',
          includeDevDependencies: false,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(template, null, 2) + '\n');
      console.log(chalk.green(`${icons.check()} Created ${configPath}`));
      console.log();
      console.log('Next steps:');
      console.log(`  1. Edit ${chalk.cyan(configPath)} to customize your policy`);
      console.log(`  2. Run ${chalk.cyan('extension-guard audit')} to check your extensions`);
      console.log();
    });

  // Rules command - list available detection rules
  program
    .command('rules')
    .description('List available detection rules')
    .option('--details <ruleId>', 'Show detailed information for a specific rule')
    .action((options) => {
      if (options.details) {
        const rule = DETECTION_RULES.find((r) => r.id === options.details);
        if (!rule) {
          console.error(chalk.red(`Error: Rule '${options.details}' not found.`));
          console.log(chalk.dim('Run `extension-guard rules` to see available rules.'));
          process.exit(1);
        }

        console.log();
        console.log(chalk.bold(rule.id));
        console.log(chalk.dim('━'.repeat(60)));
        console.log(`Name:        ${rule.name}`);
        console.log(`Severity:    ${formatSeverity(rule.severity)}`);
        console.log(`Category:    ${rule.category}`);
        console.log(`Description: ${rule.description}`);
        if (rule.mitreAttackId) {
          console.log(`MITRE ATT&CK: ${rule.mitreAttackId}`);
        }
        console.log();
        return;
      }

      console.log();
      console.log(chalk.bold('Available Detection Rules'));
      console.log(chalk.dim('━'.repeat(60)));
      console.log();

      const rulesBySeverity: Record<string, typeof DETECTION_RULES> = {};
      for (const rule of DETECTION_RULES) {
        if (!rulesBySeverity[rule.severity]) {
          rulesBySeverity[rule.severity] = [];
        }
        rulesBySeverity[rule.severity].push(rule);
      }

      const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
      for (const severity of severityOrder) {
        const rules = rulesBySeverity[severity];
        if (rules && rules.length > 0) {
          console.log(formatSeverity(severity));
          for (const rule of rules) {
            console.log(`  ${chalk.cyan(rule.id.padEnd(14))} ${rule.name}`);
          }
          console.log();
        }
      }

      console.log(chalk.dim('Run `extension-guard rules --details <ruleId>` for more information.'));
      console.log();
    });

  program
    .command('scan')
    .description(
      'Scan installed VSCode extensions\n\n' +
        'Examples:\n' +
        '  extension-guard scan                      Scan all detected IDEs\n' +
        '  extension-guard scan --ide cursor         Scan Cursor IDE only\n' +
        '  extension-guard scan --format json -o r.json  Output as JSON file\n' +
        '  extension-guard scan --format sarif       Output for GitHub Code Scanning'
    )
    .option('-p, --path <paths...>', 'Custom extension paths to scan')
    .option('-f, --format <format>', 'Output format (table|json|sarif|markdown)', 'table')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .option('-s, --severity <level>', 'Minimum severity to show', 'info')
    .option('-q, --quiet', 'Only show results, no progress')
    .option('--include-safe', 'Include safe extensions in output')
    .action(async (options) => {
      const isJsonOutput = options.format === 'json' || options.format === 'sarif';
      const spinner = options.quiet || isJsonOutput ? null : ora('Scanning extensions...').start();

      try {
        const scanner = new ExtensionGuardScanner({
          autoDetect: !options.path,
          idePaths: options.path ?? [],
          severity: options.severity,
        });

        const report = await scanner.scan();

        if (spinner) {
          spinner.succeed('Scan complete');
        }

        // Generate output based on format
        const output = generateOutput(report, options.format, {
          includeSafe: options.includeSafe,
        });

        // Write to file or stdout
        if (options.output) {
          fs.writeFileSync(options.output, output);
          if (!options.quiet) {
            console.log(chalk.green(`Report saved to ${options.output}`));
          }
        } else if (options.format === 'table') {
          printTableReport(report);
        } else {
          console.log(output);
        }

        // Exit with error code if critical or high issues found
        const hasCritical = report.summary.bySeverity.critical > 0;
        const hasHigh = report.summary.bySeverity.high > 0;
        if (hasCritical || hasHigh) {
          process.exit(1);
        }
      } catch (error) {
        if (spinner) {
          spinner.fail('Scan failed');
        }
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(3);
      }
    });

  program
    .command('audit')
    .description('Audit extensions against policy rules')
    .option('-c, --config <path>', 'Path to policy config file', '.extension-guard.json')
    .option('-p, --path <paths...>', 'Custom extension paths to scan')
    .option('--fail-on <level>', 'Fail on violations at or above level (block|warn|info)', 'block')
    .option('-f, --format <format>', 'Output format (table|json|sarif|markdown)', 'table')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .option('-q, --quiet', 'Only show results, no progress')
    .action(async (options) => {
      const isJsonOutput = options.format === 'json' || options.format === 'sarif';
      const spinner =
        options.quiet || isJsonOutput ? null : ora('Loading policy configuration...').start();

      try {
        // Load policy configuration
        const policyConfig = await loadPolicyConfig(options.config);

        if (!policyConfig) {
          if (spinner) {
            spinner.fail('Policy configuration not found');
          }
          console.error(chalk.red(`Error: Could not find policy config at ${options.config}`));
          console.error(
            chalk.dim('Create a .extension-guard.json file or specify a path with --config')
          );
          process.exit(2);
        }

        if (spinner) {
          spinner.text = 'Scanning extensions...';
        }

        // Run scan with config-based settings
        const scanner = new ExtensionGuardScanner({
          autoDetect: !options.path,
          idePaths: options.path ?? [],
          severity: policyConfig.scanning?.minSeverity ?? 'info',
        });

        const report = await scanner.scan();

        if (spinner) {
          spinner.text = 'Evaluating policy rules...';
        }

        // Evaluate policy
        const engine = new PolicyEngine(policyConfig);
        const violations = engine.evaluate(report.results);

        if (spinner) {
          spinner.succeed('Audit complete');
        }

        // Generate output based on format
        if (options.format !== 'table') {
          const output = generateOutput(report, options.format, {
            includeSafe: false,
          });
          if (options.output) {
            fs.writeFileSync(options.output, output);
            if (!options.quiet) {
              console.log(chalk.green(`Report saved to ${options.output}`));
            }
          } else {
            console.log(output);
          }
        }

        // Print violations summary
        printAuditResults(violations, options.failOn as PolicyAction);

        // Determine exit code based on --fail-on level
        const shouldFail = hasViolationsAtLevel(violations, options.failOn as PolicyAction);
        if (shouldFail) {
          process.exit(1);
        }
      } catch (error) {
        if (spinner) {
          spinner.fail('Audit failed');
        }
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(3);
      }
    });

  return program;
}

function generateOutput(
  report: FullScanReport,
  format: string,
  options: { includeSafe?: boolean } = {}
): string {
  let reporter: Reporter;

  switch (format) {
    case 'json':
      reporter = new JsonReporter();
      break;
    case 'sarif':
      reporter = new SarifReporter();
      break;
    case 'markdown':
      reporter = new MarkdownReporter();
      break;
    case 'table':
    default:
      // Table format is handled separately
      return '';
  }

  return reporter.generate(report, {
    includeSafe: options.includeSafe,
    includeEvidence: true,
  });
}

function printTableReport(report: FullScanReport): void {
  console.log();
  console.log(chalk.bold(`${icons.shield()}  Extension Guard v${VERSION}`));
  console.log();

  for (const ide of report.environment.ides) {
    console.log(`${icons.folder()} ${chalk.cyan(ide.name)}: ${ide.path} (${ide.extensionCount} extensions)`);
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  const critical = report.results.filter((r) => r.riskLevel === 'critical');
  const high = report.results.filter((r) => r.riskLevel === 'high');
  const medium = report.results.filter((r) => r.riskLevel === 'medium');
  const safe = report.results.filter((r) => r.riskLevel === 'safe' || r.riskLevel === 'low');

  if (critical.length > 0) {
    console.log(chalk.red.bold(`${icons.critical()} CRITICAL (${critical.length})`));
    for (const ext of critical) {
      printExtensionResult(ext);
    }
  }

  if (high.length > 0) {
    console.log(chalk.red(`${icons.high()} HIGH (${high.length})`));
    for (const ext of high) {
      printExtensionResult(ext);
    }
  }

  if (medium.length > 0) {
    console.log(chalk.yellow(`${icons.medium()} MEDIUM (${medium.length})`));
    for (const ext of medium) {
      console.log(`   ${ext.extensionId} (Trust: ${ext.trustScore}/100)`);
    }
    console.log();
  }

  if (safe.length > 0) {
    console.log(chalk.green(`${icons.safe()} SAFE (${safe.length})`));
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  const { bySeverity, byRiskLevel } = report.summary;
  console.log(
    `${icons.summary()} Summary: ${report.uniqueExtensions} scanned · ` +
      `${bySeverity.critical} critical · ${bySeverity.high} high · ` +
      `${bySeverity.medium} medium · ${byRiskLevel.safe} safe`
  );
  console.log(`${icons.time()}  Completed in ${(report.scanDurationMs / 1000).toFixed(1)}s`);
  console.log();
}

function formatSeverity(severity: string): string {
  switch (severity) {
    case 'critical':
      return chalk.red.bold('CRITICAL');
    case 'high':
      return chalk.red('HIGH');
    case 'medium':
      return chalk.yellow('MEDIUM');
    case 'low':
      return chalk.blue('LOW');
    case 'info':
      return chalk.dim('INFO');
    default:
      return severity;
  }
}

function printExtensionResult(result: FullScanReport['results'][0]): void {
  console.log(`   ${chalk.bold(result.extensionId)} v${result.version}`);
  console.log(`   Publisher: ${result.metadata.publisher.name}`);
  console.log(`   Trust Score: ${result.trustScore}/100`);

  if (result.findings.length > 0) {
    for (const finding of result.findings.slice(0, 3)) {
      const icon = finding.severity === 'critical' ? 'CRIT' : finding.severity.toUpperCase();
      console.log(`   │ ${icon}  ${finding.title}`);
      if (finding.evidence.filePath) {
        console.log(
          `   │       at ${finding.evidence.filePath}:${finding.evidence.lineNumber ?? '?'}`
        );
      }
      // Show remediation tip if available
      if (finding.remediation) {
        console.log(chalk.dim(`   │       ${icons.info()} ${finding.remediation}`));
      }
    }
    if (result.findings.length > 3) {
      console.log(chalk.dim(`   │ ... and ${result.findings.length - 3} more findings`));
    }
  }
  console.log();
}

/**
 * Print audit results with violations grouped by action level.
 */
function printAuditResults(violations: PolicyViolation[], failOnLevel: PolicyAction): void {
  console.log();
  console.log(chalk.bold('Policy Audit Results'));
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  if (violations.length === 0) {
    console.log(chalk.green('No policy violations found.'));
    console.log();
    return;
  }

  const blocked = violations.filter((v) => v.action === 'block');
  const warned = violations.filter((v) => v.action === 'warn');
  const info = violations.filter((v) => v.action === 'info');

  if (blocked.length > 0) {
    console.log(chalk.red.bold(`BLOCKED (${blocked.length})`));
    for (const v of blocked) {
      console.log(`   ${chalk.red('x')} ${chalk.bold(v.extensionId)}`);
      console.log(`     Rule: ${v.rule}`);
      console.log(`     ${v.message}`);
    }
    console.log();
  }

  if (warned.length > 0) {
    console.log(chalk.yellow.bold(`WARNINGS (${warned.length})`));
    for (const v of warned) {
      console.log(`   ${chalk.yellow('!')} ${chalk.bold(v.extensionId)}`);
      console.log(`     Rule: ${v.rule}`);
      console.log(`     ${v.message}`);
    }
    console.log();
  }

  if (info.length > 0) {
    console.log(chalk.blue.bold(`INFO (${info.length})`));
    for (const v of info) {
      console.log(`   ${chalk.blue('i')} ${chalk.bold(v.extensionId)}`);
      console.log(`     Rule: ${v.rule}`);
      console.log(`     ${v.message}`);
    }
    console.log();
  }

  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  const total = violations.length;
  const willFail = hasViolationsAtLevel(violations, failOnLevel);

  console.log(
    `Total: ${total} violation${total !== 1 ? 's' : ''} ` +
      `(${blocked.length} blocked, ${warned.length} warnings, ${info.length} info)`
  );
  console.log(`Fail-on level: ${failOnLevel}`);

  if (willFail) {
    console.log(chalk.red(`Status: FAILED - violations found at or above '${failOnLevel}' level`));
  } else {
    console.log(chalk.green(`Status: PASSED - no violations at or above '${failOnLevel}' level`));
  }
  console.log();
}

/**
 * Check if there are violations at or above the specified level.
 * Level hierarchy: block > warn > info
 */
function hasViolationsAtLevel(violations: PolicyViolation[], level: PolicyAction): boolean {
  const levelHierarchy: Record<PolicyAction, number> = {
    block: 3,
    warn: 2,
    info: 1,
  };

  const threshold = levelHierarchy[level];

  return violations.some((v) => levelHierarchy[v.action] >= threshold);
}
