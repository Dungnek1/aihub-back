#!/usr/bin/env node
/**
 * Cross-platform script to resolve failed Prisma migrations
 * Automatically selects the correct script based on OS
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const platform = os.platform();
const scriptDir = __dirname;

let scriptPath;
let command;

if (platform === 'win32') {
  // Windows: Use PowerShell
  scriptPath = path.join(scriptDir, 'resolve-failed-migrations.ps1');
  const args = process.argv.slice(2).map(arg => `"${arg}"`).join(' ');
  command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" ${args}`;
} else {
  // Linux/Mac: Use bash
  scriptPath = path.join(scriptDir, 'resolve-failed-migrations.sh');
  const args = process.argv.slice(2).map(arg => `"${arg}"`).join(' ');
  command = `bash "${scriptPath}" ${args}`;
}

console.log(`🔄 Resolving failed migrations for ${platform}...`);
console.log(`📄 Script: ${scriptPath}`);
console.log('');

try {
  execSync(command, { stdio: 'inherit', cwd: process.cwd() });
} catch (error) {
  console.error('❌ Failed to resolve migrations!');
  process.exit(1);
}

