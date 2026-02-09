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
} from '@aspect-guard/core';
import type { FullScanReport, Reporter, PolicyViolation, PolicyAction } from '@aspect-guard/core';

export function createCli(): Command {
  const program = new Command();

  program
    .name('extension-guard')
    .description('Scan VSCode extensions for security issues')
    .version(VERSION);

  program
    .command('scan')
    .description('Scan installed VSCode extensions')
    .option('-p, --path <paths...>', 'Custom extension paths to scan')
    .option('-f, --format <format>', 'Output format (table|json|sarif|markdown)', 'table')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .option('-s, --severity <level>', 'Minimum severity to show', 'info')
    .option('-q, --quiet', 'Only show results, no progress')
    .option('--include-safe', 'Include safe extensions in output')
    .action(async (options) => {
      const isJsonOutput = options.format === 'json' || options.format === 'sarif';
      const spinner = (options.quiet || isJsonOutput) ? null : ora('Scanning extensions...').start();

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
      const spinner = (options.quiet || isJsonOutput) ? null : ora('Loading policy configuration...').start();

      try {
        // Load policy configuration
        const policyConfig = await loadPolicyConfig(options.config);

        if (!policyConfig) {
          if (spinner) {
            spinner.fail('Policy configuration not found');
          }
          console.error(chalk.red(`Error: Could not find policy config at ${options.config}`));
          console.error(chalk.dim('Create a .extension-guard.json file or specify a path with --config'));
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
  console.log(chalk.bold(`🛡️  Extension Guard v${VERSION}`));
  console.log();

  for (const ide of report.environment.ides) {
    console.log(`📁 ${chalk.cyan(ide.name)}: ${ide.path} (${ide.extensionCount} extensions)`);
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  const critical = report.results.filter((r) => r.riskLevel === 'critical');
  const high = report.results.filter((r) => r.riskLevel === 'high');
  const medium = report.results.filter((r) => r.riskLevel === 'medium');
  const safe = report.results.filter((r) => r.riskLevel === 'safe' || r.riskLevel === 'low');

  if (critical.length > 0) {
    console.log(chalk.red.bold(`⛔ CRITICAL (${critical.length})`));
    for (const ext of critical) {
      printExtensionResult(ext);
    }
  }

  if (high.length > 0) {
    console.log(chalk.red(`🔴 HIGH (${high.length})`));
    for (const ext of high) {
      printExtensionResult(ext);
    }
  }

  if (medium.length > 0) {
    console.log(chalk.yellow(`🟡 MEDIUM (${medium.length})`));
    for (const ext of medium.slice(0, 3)) {
      console.log(`   ${ext.extensionId}`);
    }
    if (medium.length > 3) {
      console.log(chalk.dim(`   ... and ${medium.length - 3} more`));
    }
  }

  if (safe.length > 0) {
    console.log(chalk.green(`🟢 SAFE (${safe.length})`));
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  const { bySeverity, byRiskLevel } = report.summary;
  console.log(
    `📊 Summary: ${report.uniqueExtensions} scanned · ` +
    `${bySeverity.critical} critical · ${bySeverity.high} high · ` +
    `${bySeverity.medium} medium · ${byRiskLevel.safe} safe`
  );
  console.log(`⏱️  Completed in ${(report.scanDurationMs / 1000).toFixed(1)}s`);
  console.log();
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
        console.log(`   │       at ${finding.evidence.filePath}:${finding.evidence.lineNumber ?? '?'}`);
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

  const blocked = violations.filter(v => v.action === 'block');
  const warned = violations.filter(v => v.action === 'warn');
  const info = violations.filter(v => v.action === 'info');

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

  return violations.some(v => levelHierarchy[v.action] >= threshold);
}
