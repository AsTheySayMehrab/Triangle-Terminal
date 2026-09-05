const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
if (process.platform !== 'win32') throw new Error('This preview builds on Windows x64 only.');
if (args.length && (args.length !== 2 || args[0] !== '--output')) {
  throw new Error('Usage: npm run dist -- [--output <directory>]');
}
function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
// Run npm in the tooling directory, without linking the application into its dependencies.
run(
  process.env.ComSpec || 'cmd.exe',
  ['/d', '/s', '/c', 'npm ci --no-audit --no-fund'],
  path.join(__dirname, 'packaging'),
);
const builderArgs = [
  path.join(__dirname, 'packaging', 'node_modules', 'electron-builder', 'cli.js'),
  '--win',
  'portable',
  '--x64',
  '--publish',
  'never',
];
if (args.length) builderArgs.push('--config.directories.output=' + path.resolve(args[1]));
run(process.execPath, builderArgs, root);
