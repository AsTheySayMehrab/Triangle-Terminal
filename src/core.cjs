const fs = require('node:fs');
const path = require('node:path');

const defaults = {
  language: 'en',
  theme: 'midnight',
  accent: '#b5f36c',
  fontFamily: 'Cascadia Code, Consolas, monospace',
  fontSize: 15,
  cursorStyle: 'bar',
  scrollback: 5000,
  readerDirection: 'auto',
  showBanner: true,
  defaultShell: 'powershell',
  readerVisible: false,
  backgroundEffects: {
    enabled: true,
    blur: 18,
    opacity: 84,
    noiseAmount: 5,
    noiseScale: 1.2,
  },
  shortcuts: [
    { label: 'Codex', command: 'codex', description: 'OpenAI coding agent' },
    { label: 'Claude Code', command: 'claude', description: 'Anthropic coding agent' },
    { label: 'Gemini CLI', command: 'gemini', description: 'Google coding agent' },
    { label: 'Git status', command: 'git status', description: 'Changes in this project' },
  ],
};
function validateSettings(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Settings must be an object');
  const result = {
    ...defaults,
    backgroundEffects: { ...defaults.backgroundEffects },
    shortcuts: defaults.shortcuts.map((x) => ({ ...x })),
  };
  const enums = {
    language: ['en', 'fa'],
    theme: ['midnight', 'graphite', 'blueprint', 'light'],
    cursorStyle: ['bar', 'block', 'underline'],
    readerDirection: ['auto', 'rtl', 'ltr'],
    defaultShell: ['powershell', 'cmd', 'pwsh'],
  };
  for (const [key, choices] of Object.entries(enums))
    if (choices.includes(value[key])) result[key] = value[key];
  for (const [key, min, max] of [
    ['fontSize', 11, 30],
    ['scrollback', 100, 20000],
  ]) {
    if (Number.isInteger(value[key])) result[key] = Math.min(max, Math.max(min, value[key]));
  }
  if (typeof value.accent === 'string' && /^#[0-9a-f]{6}$/i.test(value.accent))
    result.accent = value.accent;
  if (
    typeof value.fontFamily === 'string' &&
    value.fontFamily.trim() &&
    value.fontFamily.length <= 200
  )
    result.fontFamily = value.fontFamily;
  for (const key of ['showBanner', 'readerVisible'])
    if (typeof value[key] === 'boolean') result[key] = value[key];
  if (value.backgroundEffects && typeof value.backgroundEffects === 'object') {
    const effects = value.backgroundEffects;
    if (typeof effects.enabled === 'boolean') result.backgroundEffects.enabled = effects.enabled;
    for (const [key, min, max] of [
      ['blur', 0, 40],
      ['opacity', 40, 96],
      ['noiseAmount', 0, 18],
    ]) {
      if (Number.isFinite(effects[key]))
        result.backgroundEffects[key] = Math.min(max, Math.max(min, Math.round(effects[key])));
    }
    if (Number.isFinite(effects.noiseScale))
      result.backgroundEffects.noiseScale = Math.min(
        2.5,
        Math.max(0.5, Math.round(effects.noiseScale * 10) / 10),
      );
  }
  if (Array.isArray(value.shortcuts))
    result.shortcuts = value.shortcuts.slice(0, 16).map((x) => {
      if (
        !x ||
        typeof x.label !== 'string' ||
        !x.label.trim() ||
        typeof x.command !== 'string' ||
        !x.command.trim() ||
        /[\r\n\x00-\x1f]/.test(x.command) ||
        x.command.length > 2000
      )
        throw new Error('Each shortcut needs a label and a single-line command');
      return {
        label: x.label.slice(0, 40),
        command: x.command,
        description: String(x.description || '').slice(0, 100),
      };
    });
  return result;
}
function shellProfile(id, env = process.env) {
  const root = env.SystemRoot || 'C:\\Windows';
  const utf8 =
    '[Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding = [System.Text.UTF8Encoding]::new($false)';
  if (id === 'cmd')
    return { file: path.win32.join(root, 'System32', 'cmd.exe'), args: ['/K', 'chcp 65001 >nul'] };
  if (id === 'powershell')
    return {
      file: path.win32.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      args: ['-NoLogo', '-NoExit', '-Command', utf8],
    };
  if (id === 'pwsh') return { file: 'pwsh.exe', args: ['-NoLogo', '-NoExit', '-Command', utf8] };
  throw new Error('Unknown shell profile');
}
function dimensions(cols, rows) {
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 2 ||
    cols > 500 ||
    rows < 1 ||
    rows > 300
  )
    throw new Error('Invalid terminal dimensions');
  return { cols, rows };
}
function loadSettings(file) {
  try {
    return validateSettings(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return validateSettings();
  }
}
module.exports = { defaults, validateSettings, shellProfile, dimensions, loadSettings };
