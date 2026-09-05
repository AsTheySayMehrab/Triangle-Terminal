const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const root = path.join(__dirname, '..');
const packaged = process.argv.includes('--packaged');
const executableFlag = process.argv.indexOf('--exe');
const executable = packaged
  ? executableFlag >= 0 && process.argv[executableFlag + 1]
    ? path.resolve(process.argv[executableFlag + 1])
    : path.join(root, 'release', 'win-unpacked', 'Triangle Terminal.exe')
  : require('electron');
env.TRIANGLE_TEST_OUTPUT = path.join(root, 'test-results', packaged ? 'packaged' : 'source');
const args = packaged ? ['--smoke-test'] : [root, '--smoke-test'];
args.push('--cwd', process.env.SystemRoot || 'C:\\Windows');
const child = spawn(executable, args, { env, stdio: 'inherit', windowsHide: true });
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
