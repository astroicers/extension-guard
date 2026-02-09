import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ExtensionGuardScanner, VERSION } from '@aspect-guard/core';

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
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .option('-s, --severity <level>', 'Minimum severity to show', 'info')
    .option('-q, --quiet', 'Only show results, no progress')
    .action(async (options) => {
      const isJsonOutput = options.format === 'json';
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

        if (isJsonOutput) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          printTableReport(report);
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

  return program;
}

function printTableReport(report: Awaited<ReturnType<typeof ExtensionGuardScanner.prototype.scan>>): void {
  console.log();
  console.log(chalk.bold(`🛡️  Extension Guard v${VERSION}`));
  console.log();

  for (const ide of report.environment.ides) {
    console.log(`📁 ${chalk.cyan(ide.name)}: ${ide.path} (${ide.extensionCount} extensions)`);
  }

  console.log();
  console.log(chalk.dim('━'.repeat(60)));
  console.log();

  // Group by risk level
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

function printExtensionResult(result: Awaited<ReturnType<typeof ExtensionGuardScanner.prototype.scan>>['results'][0]): void {
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
