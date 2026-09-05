const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateSettings, shellProfile, dimensions, loadSettings } = require('../src/core.cjs');
test('untrusted settings are bounded and unsupported values fall back', () => {
  const result = validateSettings({
    language: 'xx',
    fontSize: 999,
    scrollback: -1,
    accent: 'red;url(evil)',
    cursorStyle: 'unknown',
    extra: 'ignored',
  });
  assert.equal(result.language, 'en');
  assert.equal(result.fontSize, 30);
  assert.equal(result.scrollback, 100);
  assert.equal(result.accent, '#b5f36c');
  assert.equal(result.extra, undefined);
});
test('background material settings are bounded and theme choices are preserved', () => {
  const result = validateSettings({
    theme: 'blueprint',
    backgroundEffects: {
      enabled: false,
      blur: 999,
      opacity: 1,
      noiseAmount: -4,
      noiseScale: 9,
    },
  });
  assert.equal(result.theme, 'blueprint');
  assert.deepEqual(result.backgroundEffects, {
    enabled: false,
    blur: 40,
    opacity: 40,
    noiseAmount: 0,
    noiseScale: 2.5,
  });
  assert.equal(
    validateSettings({ backgroundEffects: { enabled: 'yes' } }).backgroundEffects.enabled,
    true,
  );
});
test('Persian prompts, mixed commands and half-spaces survive settings roundtrip', () => {
  const command = 'Write-Output "سلام دنیا — می‌توانم English 123"';
  const value = { language: 'fa', shortcuts: [{ label: 'فارسی', command, description: 'آزمایش' }] };
  assert.deepEqual(validateSettings(JSON.parse(JSON.stringify(value))).shortcuts, value.shortcuts);
});
test('shortcut configuration cannot sneak in control characters or multiline execution', () => {
  for (const command of ['echo x\recho y', 'echo x\necho y', 'echo \x1b[2J'])
    assert.throws(() => validateSettings({ shortcuts: [{ label: 'bad', command }] }));
  assert.throws(() => validateSettings(null));
});
test('shell profiles use actual Windows shells and UTF-8', () => {
  assert.match(shellProfile('powershell').file, /WindowsPowerShell/);
  assert.match(shellProfile('powershell').args.at(-1), /UTF8Encoding/);
  assert.match(shellProfile('cmd').args.at(-1), /65001/);
  assert.equal(shellProfile('pwsh').file, 'pwsh.exe');
  assert.throws(() => shellProfile('cmd & evil'));
});
test('terminal geometry rejects malformed and oversized dimensions', () => {
  assert.deepEqual(dimensions(80, 24), { cols: 80, rows: 24 });
  for (const pair of [
    [0, 20],
    [80, -1],
    [501, 24],
    [80, 301],
    [80.5, 24],
    ['80', 24],
  ])
    assert.throws(() => dimensions(...pair));
});
test('corrupt preference files recover without preventing startup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triangle-test-'));
  const file = path.join(dir, 'settings.json');
  try {
    fs.writeFileSync(file, '{broken');
    assert.equal(loadSettings(file).language, 'en');
    fs.writeFileSync(file, JSON.stringify({ language: 'fa' }));
    assert.equal(loadSettings(file).language, 'fa');
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
});
