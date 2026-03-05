#!/usr/bin/env node
/**
 * Cross-platform rollback script wrapper
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
  scriptPath = path.join(scriptDir, 'rollback.ps1');
  command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
} else {
  // Linux/Mac: Use bash
  scriptPath = path.join(scriptDir, 'rollback.sh');
  command = `bash "${scriptPath}"`;
}

console.log(`🔄 Running rollback script for ${platform}...`);
console.log(`📄 Script: ${scriptPath}`);
console.log('');

try {
  execSync(command, { stdio: 'inherit', cwd: process.cwd() });
} catch (error) {
  console.error('❌ Rollback failed!');
  process.exit(1);
}

