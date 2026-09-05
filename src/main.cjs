const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  powerMonitor,
  clipboard,
  session,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const pty = require('node-pty');
const { validateSettings, shellProfile, dimensions, loadSettings } = require('./core.cjs');
let window;
const sessions = new Map();
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const smoke = process.argv.includes('--smoke-test');
const testOutput = process.env.TRIANGLE_TEST_OUTPUT || path.join(__dirname, '..', 'test-results');
let inputDirectory;
if (smoke) app.setPath('userData', path.join(testOutput, 'profile'));
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let nativeBackdropSupported = false;
function supportsNativeBackdrop() {
  if (process.platform !== 'win32') return false;
  const build = Number(process.getSystemVersion().split('.')[2]);
  return Number.isFinite(build) && build >= 22621;
}
function applyWindowMaterial(settings) {
  if (!window) return false;
  let updated = false;
  if (typeof window.setBackgroundMaterial === 'function') {
    try {
      window.setBackgroundMaterial(
        nativeBackdropSupported && settings.backgroundEffects.enabled ? 'acrylic' : 'none',
      );
      updated = true;
    } catch {}
  }
  if (typeof window.setTitleBarOverlay === 'function') {
    try {
      window.setTitleBarOverlay({
        color: '#00000000',
        symbolColor: settings.theme === 'light' ? '#1b261d' : '#edf4e9',
        height: 32,
      });
      updated = true;
    } catch {}
  }
  return updated;
}
function trusted(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame?.url !== page)
    throw new Error('Untrusted IPC sender');
}
function handle(channel, callback) {
  ipcMain.handle(channel, (event, ...args) => {
    trusted(event);
    return callback(...args);
  });
}
function getSession(id) {
  const s = sessions.get(id);
  if (!s) throw new Error('Session has ended');
  return s;
}
function send(channel, data) {
  if (window && !window.isDestroyed()) window.webContents.send(channel, data);
}
function stop(id) {
  const s = sessions.get(id);
  if (s) {
    sessions.delete(id);
    try {
      s.process.kill();
    } catch {}
    try {
      fs.unlinkSync(s.inputFile);
    } catch {}
  }
}
let battery = { percent: null, charging: null };
function refreshBattery() {
  execFile(
    shellProfile('powershell').file,
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress',
    ],
    { windowsHide: true, timeout: 5000 },
    (error, stdout) => {
      if (error) {
        battery = { percent: null, charging: null };
        return;
      }
      try {
        const values = JSON.parse(stdout || 'null');
        const item = Array.isArray(values) ? values[0] : values;
        battery = {
          percent: Number.isFinite(item?.EstimatedChargeRemaining)
            ? item.EstimatedChargeRemaining
            : null,
          charging: item ? [2, 3, 6, 7, 8, 9].includes(item.BatteryStatus) : null,
        };
      } catch {
        battery = { percent: null, charging: null };
      }
    },
  );
}
app.whenReady().then(() => {
  inputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'triangle-input-'));
  const initialSettings = loadSettings(settingsFile());
  nativeBackdropSupported = supportsNativeBackdrop();
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 920,
    minHeight: 650,
    title: 'Triangle Terminal',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#edf4e9',
      height: 32,
    },
    transparent: true,
    backgroundColor: '#00000000',
    backgroundMaterial:
      nativeBackdropSupported && initialSettings.backgroundEffects.enabled ? 'acrylic' : 'none',
    roundedCorners: true,
    darkTheme: true,
    show: !smoke,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
      offscreen: smoke,
    },
  });
  applyWindowMaterial(initialSettings);
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  handle('bootstrap', () => {
    const settings = loadSettings(settingsFile());
    const shell = process.argv[process.argv.indexOf('--shell') + 1];
    const language = process.argv[process.argv.indexOf('--language') + 1];
    if (process.argv.includes('--shell') && ['powershell', 'cmd', 'pwsh'].includes(shell))
      settings.defaultShell = shell;
    if (process.argv.includes('--language') && ['fa', 'en'].includes(language))
      settings.language = language;
    return {
      settings,
      defaults: validateSettings(),
      cwd: startupDirectory(),
      platform: process.platform,
      version: app.getVersion(),
      nativeBackdropSupported,
    };
  });
  handle('settings:save', (input) => {
    const settings = validateSettings(input);
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(settingsFile() + '.tmp', JSON.stringify(settings, null, 2), 'utf8');
    fs.renameSync(settingsFile() + '.tmp', settingsFile());
    applyWindowMaterial(settings);
    return settings;
  });
  handle('folder:choose', async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  handle('session:create', (input) => {
    if (sessions.size >= 12) throw new Error('Maximum 12 terminal sessions');
    const profile = shellProfile(input.shell);
    const size = dimensions(input.cols, input.rows);
    if (
      typeof input.cwd !== 'string' ||
      !path.isAbsolute(input.cwd) ||
      !fs.statSync(input.cwd).isDirectory()
    )
      throw new Error('Choose an existing directory');
    const id = randomUUID();
    const token = randomUUID();
    const inputFile = path.join(inputDirectory, id + '.txt');
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      TRIANGLE_TERMINAL: '1',
      TRIANGLE_SESSION_TOKEN: token,
      TRIANGLE_INPUT_FILE: inputFile,
    };
    delete env.ELECTRON_RUN_AS_NODE;
    if (input.shell !== 'cmd') {
      // External PowerShell cannot read files inside app.asar; Electron can.
      profile.args[profile.args.length - 1] +=
        '; ' + fs.readFileSync(path.join(__dirname, 'powershell-integration.ps1'), 'utf8');
      if (smoke) {
        profile.args.unshift('-NoProfile');
        profile.args[profile.args.length - 1] +=
          '\nSet-PSReadLineOption -HistorySaveStyle SaveNothing';
      }
    }
    const proc = pty.spawn(profile.file, profile.args, {
      ...size,
      name: 'xterm-256color',
      cwd: input.cwd,
      env,
      useConptyDll: true,
    });
    const s = {
      process: proc,
      pending: '',
      attached: false,
      atPrompt: false,
      markerTail: '',
      inputFile,
    };
    sessions.set(id, s);
    proc.onData((data) => {
      const combined = s.markerTail + data;
      const marker = new RegExp('\\x1b\\]777;triangle;' + token + ';(prompt|busy)\\x07', 'g');
      for (const match of combined.matchAll(marker)) {
        s.atPrompt = match[1] === 'prompt';
      }
      s.markerTail = combined.slice(-100);
      if (s.attached) send('session:data', { id, data });
      else s.pending = (s.pending + data).slice(-1048576);
    });
    proc.onExit(({ exitCode }) => {
      s.exitCode = exitCode;
      try {
        fs.unlinkSync(s.inputFile);
      } catch {}
      if (s.attached) {
        send('session:exit', { id, exitCode });
        sessions.delete(id);
      }
    });
    return { id, pid: proc.pid };
  });
  handle('session:attach', (id) => {
    const s = getSession(id);
    s.attached = true;
    if (s.pending) send('session:data', { id, data: s.pending });
    s.pending = '';
    if (s.exitCode !== undefined) {
      send('session:exit', { id, exitCode: s.exitCode });
      sessions.delete(id);
    }
  });
  handle('session:write', (id, data) => {
    if (typeof data !== 'string' || data.length > 262144) throw new Error('Input is too large');
    getSession(id).process.write(data);
  });
  handle('session:submit', (id, text) => {
    if (typeof text !== 'string' || text.length > 262144) throw new Error('Input is too large');
    const s = getSession(id);
    if (!s.atPrompt) return false;
    fs.writeFileSync(s.inputFile, text, { encoding: 'utf8', mode: 0o600 });
    s.atPrompt = false;
    s.markerTail = '';
    s.process.write('\x07');
    return true;
  });
  handle('session:resize', (id, cols, rows) => {
    const size = dimensions(cols, rows);
    const s = sessions.get(id);
    if (s && s.exitCode === undefined) s.process.resize(size.cols, size.rows);
  });
  handle('session:close', (id) => stop(id));
  handle('clipboard:write', (value) => {
    if (typeof value !== 'string' || value.length > 2097152)
      throw new Error('Invalid clipboard text');
    clipboard.writeText(value);
  });
  handle('clipboard:read', () => clipboard.readText());
  handle('system:stats', () => ({
    battery,
    onBattery: powerMonitor.isOnBatteryPower(),
    idleSeconds: powerMonitor.getSystemIdleTime(),
    memoryUsed: os.totalmem() - os.freemem(),
    memoryTotal: os.totalmem(),
    cpu: os.cpus()[0]?.model || 'CPU',
    cores: os.availableParallelism(),
    uptime: os.uptime(),
  }));
  handle('transcript:save', async (text) => {
    if (typeof text !== 'string' || text.length > 8388608)
      throw new Error('Transcript is too large');
    const result = await dialog.showSaveDialog(window, {
      defaultPath: 'triangle-session.txt',
      filters: [{ name: 'Text', extensions: ['txt'] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, text, 'utf8');
      return true;
    }
    return false;
  });
  refreshBattery();
  const timer = setInterval(refreshBattery, 60000);
  timer.unref();
  window.on('closed', () => {
    for (const id of sessions.keys()) stop(id);
    window = null;
  });
  window.on('close', (event) => {
    if (smoke || sessions.size === 0) return;
    const persian = loadSettings(settingsFile()).language === 'fa';
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      buttons: persian ? ['انصراف', 'بستن همه نشست‌ها'] : ['Cancel', 'Close all sessions'],
      defaultId: 0,
      cancelId: 0,
      title: 'Triangle Terminal',
      message: persian ? 'همه نشست‌ها بسته شوند؟' : 'Close all terminal sessions?',
      detail: persian
        ? 'برنامه‌های در حال اجرا متوقف خواهند شد.'
        : 'Running programs in these sessions will be stopped.',
    });
    if (choice === 0) event.preventDefault();
  });
  window.loadFile(path.join(__dirname, 'index.html'));
  if (smoke) require('../test/electron-smoke.cjs').run({ app, window, resultDir: testOutput });
});
function startupDirectory() {
  const index = process.argv.indexOf('--cwd');
  const candidate = index >= 0 ? process.argv[index + 1] : process.cwd();
  try {
    if (candidate && path.isAbsolute(candidate) && fs.statSync(candidate).isDirectory())
      return candidate;
  } catch {}
  return os.homedir();
}
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  for (const id of sessions.keys()) stop(id);
  if (inputDirectory)
    try {
      fs.rmdirSync(inputDirectory);
    } catch {}
});
