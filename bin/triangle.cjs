#!/usr/bin/env node
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
       /\\
      /  \\     T R I A N G L E
     / /\\ \\    T E R M I N A L
    /_/__\\_\\

Usage: triangle [options]

  --cwd <path>                 Open a project directory
  --shell <powershell|cmd|pwsh> Choose the initial shell
  --language <en|fa>            Choose the interface language
  --version                    Print version
  --help                       Show this help

Inside the app, your shell supports its usual commands and installed AI CLIs.
Ctrl+Shift+T: new session    Ctrl+Shift+F: bilingual editor    Ctrl+,: settings
`);
  process.exit(0);
}
if (args.includes('--version')) {
  console.log(require('../package.json').version);
  process.exit(0);
}
const forwarded = [];
for (let i = 0; i < args.length; i++) {
  const key = args[i];
  if (!['--cwd', '--shell', '--language'].includes(key) || !args[i + 1]) {
    console.error('Unknown or incomplete option: ' + key);
    process.exit(1);
  }
  let value = args[++i];
  if (key === '--cwd') {
    value = path.resolve(value);
    if (!fs.existsSync(value) || !fs.statSync(value).isDirectory()) {
      console.error('Directory does not exist: ' + value);
      process.exit(1);
    }
  }
  if (key === '--shell' && !['powershell', 'cmd', 'pwsh'].includes(value)) {
    console.error('Shell must be powershell, cmd, or pwsh');
    process.exit(1);
  }
  if (key === '--language' && !['en', 'fa'].includes(value)) {
    console.error('Language must be en or fa');
    process.exit(1);
  }
  forwarded.push(key, value);
}
if (!args.includes('--cwd')) forwarded.push('--cwd', process.cwd());
let electron;
try {
  electron = require('electron');
} catch {
  console.error('Run npm install in the Triangle Terminal project first.');
  process.exit(1);
}
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [path.join(__dirname, '..'), ...forwarded], {
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.unref();
