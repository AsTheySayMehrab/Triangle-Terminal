const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function codexBinary() {
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    const root = directory.replace(/^"|"$/g, '');
    const candidates = [path.join(root, 'codex.exe')];
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const triple = arch === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc';
    for (const prefix of [
      'node_modules/@openai',
      'node_modules/@openai/codex/node_modules/@openai',
    ]) {
      candidates.push(
        path.join(root, prefix, `codex-win32-${arch}`, 'vendor', triple, 'codex/codex.exe'),
      );
      candidates.push(
        path.join(root, prefix, `codex-win32-${arch}`, 'vendor', triple, 'bin/codex.exe'),
      );
    }
    for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Codex was not found. Install the official Codex CLI and sign in with ChatGPT.');
}
function normalizeLimits(result) {
  const bucket = result.rateLimitsByLimitId?.codex || result.rateLimits;
  const windows = [bucket?.primary, bucket?.secondary];
  const read = (minutes) => {
    const value = windows.find((w) => w?.windowDurationMins === minutes);
    if (!value || !Number.isFinite(value.usedPercent)) return null;
    return {
      remaining: Math.max(0, Math.min(100, 100 - value.usedPercent)),
      resetsAt: value.resetsAt ?? null,
    };
  };
  return { fiveHour: read(300), weekly: read(10080), updatedAt: Date.now() };
}
function readCodexUsage(binary = codexBinary()) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ['app-server'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    let buffer = '',
      done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(
      () => finish(new Error('Usage request timed out. Check your connection and retry.')),
      15000,
    );
    const send = (value) => child.stdin.write(JSON.stringify(value) + '\n');
    child.on('error', () => finish(new Error('Unable to start the official Codex CLI.')));
    child.stdin.on('error', () => finish(new Error('Codex usage connection closed.')));
    child.on('exit', () =>
      finish(
        new Error('Codex exited before returning usage. Update Codex and sign in with ChatGPT.'),
      ),
    );
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
      buffer += data;
      if (buffer.length > 1048576) return finish(new Error('Unexpected Codex response.'));
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id !== 1 && message.id !== 2) continue;
        if (message.error)
          return finish(
            new Error('Usage unavailable. Sign in to Codex with ChatGPT, then refresh.'),
          );
        if (message.id === 1) {
          send({ method: 'initialized' });
          send({ id: 2, method: 'account/rateLimits/read' });
        } else return finish(null, normalizeLimits(message.result || {}));
      }
    });
    send({
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'triangle_terminal', version: '0.1.0' } },
    });
  });
}
module.exports = { readCodexUsage, normalizeLimits };
