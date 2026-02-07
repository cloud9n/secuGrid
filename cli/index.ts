#!/usr/bin/env node
import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('secugrid')
    .description('SecuGrid AI Security Audit CLI')
    .version('1.0.0');

program
    .command('scan')
    .description('Scan a directory for security vulnerabilities')
    .argument('[dir]', 'directory to scan', '.')
    .option('-k, --key <key>', 'SecuGrid API Key')
    .option('-e, --exclude <patterns...>', 'Exclude patterns')
    .action(async (dir, options) => {
        const apiKey = options.key || process.env.SECUGRID_API_KEY;
        if (!apiKey) {
            console.error(chalk.red('Error: API Key is required. Provide it via -k/--key or SECUGRID_API_KEY env var.'));
            process.exit(1);
        }

        const absoluteDir = path.resolve(dir);
        console.log(chalk.cyan(`Starting SecuGrid audit in: ${absoluteDir}`));

        try {
            // Find all source files
            const patterns = options.exclude || ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];
            const files = await glob('**/*.{ts,tsx,js,jsx,py,go,java,c,cpp,php}', {
                cwd: absoluteDir,
                ignore: patterns,
                absolute: true,
            });

            if (files.length === 0) {
                console.warn(chalk.yellow('No supported source files found to scan.'));
                return;
            }

            console.log(chalk.blue(`Found ${files.length} files. Preparing analysis...`));

            // For this implementation, we read a sample of files to avoid hitting limits or implement a multi-part scan
            // Let's take the first 20 files as a proof of concept or concatenate
            const maxFiles = 30;
            const filesToRead = files.slice(0, maxFiles);

            let combinedContent = '';
            for (const file of filesToRead) {
                const content = fs.readFileSync(file, 'utf-8');
                const relativePath = path.relative(absoluteDir, file);
                combinedContent += `\n--- FILE: ${relativePath} ---\n${content}\n`;
            }

            console.log(chalk.yellow('Analyzing project architecture and source code...'));

            const API_URL = process.env.SECUGRID_API_URL || 'http://localhost:5000/api';

            const response = await axios.post(`${API_URL}/scans/cli`, {
                codeContent: combinedContent,
                targetUrl: `cli://${path.basename(absoluteDir)}`
            }, {
                headers: {
                    'X-API-KEY': apiKey
                }
            });

            const report = response.data;

            console.log('\n' + chalk.bold.green('=== SecuGrid Audit Report ==='));
            console.log(chalk.white(`Target: ${report.targetUrl}`));
            console.log(chalk.white(`Score:  ${getScoreColor(report.stats.securityScore)(report.stats.securityScore + '/100')}`));
            console.log(chalk.white(`Threats identified: ${report.stats.threatsIdentified}`));
            console.log('-----------------------------\n');

            if (report.vulnerabilities.length === 0) {
                console.log(chalk.green('✔ No critical vulnerabilities found. Good job!'));
            } else {
                report.vulnerabilities.forEach((vuln: any, index: number) => {
                    const color = getSeverityColor(vuln.severity);
                    console.log(`${chalk.bold(index + 1 + '.')} ${color(vuln.severity)} - ${chalk.bold(vuln.title)}`);
                    console.log(chalk.gray(`   Path: ${vuln.affectedPath}`));
                    console.log(chalk.white(`   ${vuln.description}`));
                    console.log(chalk.cyan(`   Fix:  ${vuln.remediation}\n`));
                });
            }

            console.log(chalk.bold.blue('Audit completed successfully.'));

        } catch (error: any) {
            if (error.response) {
                console.error(chalk.red(`Scan failed: ${error.response.data.error || error.response.statusText}`));
            } else {
                console.error(chalk.red(`Scan failed: ${error.message}`));
            }
            process.exit(1);
        }
    });

function getSeverityColor(severity: string) {
    switch (severity.toUpperCase()) {
        case 'CRITICAL': return chalk.bgRed.white.bold;
        case 'HIGH': return chalk.red.bold;
        case 'MEDIUM': return chalk.yellow.bold;
        case 'LOW': return chalk.blue.bold;
        default: return chalk.gray.bold;
    }
}

function getScoreColor(score: number) {
    if (score >= 80) return chalk.green;
    if (score >= 50) return chalk.yellow;
    return chalk.red;
}

program.parse();
