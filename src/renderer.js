'use strict';
const $ = (id) => document.getElementById(id);
const api = window.triangle;
const sessions = new Map();
let settings,
  defaultSettings,
  cwd,
  activeId,
  serial = 0,
  closingId,
  toastTimer,
  readerTimer,
  nativeBackdropSupported = false;
let workMs = 0,
  paused = false,
  lastTick = performance.now(),
  lastStats = null;
const started = performance.now();
const fa = {
  workspace: 'فضای کار',
  chooseFolder: 'انتخاب پوشه پروژه',
  sessions: 'نشست‌ها',
  launchpad: 'هوش مصنوعی و میان‌برها',
  localFirst: 'ترمینال محلی · روی دستگاه شما',
  settings: 'شخصی‌سازی فضای کار',
  developerSpace: 'فضای توسعه شما',
  sessionTime: 'زمان نشست',
  sinceOpened: 'از زمان باز شدن فضای کار',
  focusTime: 'زمان کار',
  pause: 'توقف',
  resume: 'ادامه',
  idlePause: 'توقف خودکار پس از ۶۰ ثانیه بی‌کاری',
  battery: 'شارژ باتری',
  reading: 'در حال خواندن وضعیت سیستم…',
  memory: 'حافظه سیستم',
  reader: 'نمایش فارسی',
  export: 'ذخیره خروجی',
  readerTitle: 'نمایشگر دوزبانه',
  readerHint:
    'متن زنده و قابل انتخاب با حروف فارسی پیوسته. برای برنامه‌های تعاملی از ترمینال استفاده کنید.',
  composer: 'ویرایشگر دوزبانه دستور و پیام',
  composerHint: 'ارسال با Ctrl+Enter · ترتیب اصلی یونیکد متن حفظ می‌شود',
  copy: 'کپی',
  send: 'ارسال به ترمینال ↵',
  footer: 'وضوح بیشتر، امکان‌های بیشتر.',
  quota: 'اعتبار هوش مصنوعی: نامشخص · از ابزار ارائه‌دهنده بررسی کنید',
  language: 'زبان',
  theme: 'پوسته',
  accent: 'رنگ اصلی',
  fontSize: 'اندازه قلم',
  fontFamily: 'قلم ترمینال',
  cursor: 'نشانگر',
  scrollback: 'تعداد خطوط تاریخچه',
  defaultShell: 'پوسته پیش‌فرض',
  banner: 'نمایش طرح متنی آغازین',
  shortcutJson: 'میان‌برها (JSON: label, command, description)',
  shortcutNote:
    'میان‌برها دستور را در ویرایشگر قرار می‌دهند. بررسی کنید و سپس بفرستید. ابزارهای هوش مصنوعی باید جداگانه نصب شوند.',
  reset: 'بازنشانی',
  save: 'ذخیره تنظیمات',
  closeTitle: 'این ترمینال بسته شود؟',
  closeWarning: 'پوسته و برنامه‌های در حال اجرای آن متوقف خواهند شد.',
  cancel: 'انصراف',
  close: 'بستن ترمینال',
  ready: 'آماده',
  exited: 'پایان یافته',
  copied: 'کپی شد',
  saved: 'تنظیمات ذخیره شد',
  staged: 'دستور آماده شد؛ بررسی کنید و بفرستید.',
  paused: 'زمان‌سنج متوقف است',
  idle: 'بی‌کار · زمان‌سنج متوقف است',
  active: 'در حال کار · توقف خودکار هنگام بی‌کاری',
  noBattery: 'باتری موجود نیست یا وضعیت در دسترس نیست',
  charging: 'متصل به برق',
  discharging: 'در حال استفاده از باتری',
  closeFirst: 'ابتدا یک ترمینال باز کنید',
  exported: 'خروجی ذخیره شد',
  startedIn: 'پوشه شروع',
  noSession: 'نشستی باز نیست',
};
Object.assign(fa, {
  newSessionHint:
    '\u06cc\u06a9 \u067e\u0648\u0633\u062a\u0647 \u0631\u0627 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f \u0648 \u0633\u067e\u0633 \u0646\u0634\u0633\u062a \u0631\u0627 \u0628\u0627\u0632 \u06a9\u0646\u06cc\u062f',
  terminalWorkspace: '\u0645\u062d\u06cc\u0637 \u062a\u0631\u0645\u06cc\u0646\u0627\u0644',
  preview: '\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634',
  preferences: '\u062a\u0646\u0638\u06cc\u0645\u0627\u062a',
  settingsIntro:
    '\u0645\u0627\u062f\u0647\u060c \u0632\u0628\u0627\u0646 \u0648 \u062c\u0632\u0626\u06cc\u0627\u062a \u062a\u0631\u0645\u06cc\u0646\u0627\u0644 \u0631\u0627 \u062a\u0646\u0638\u06cc\u0645 \u06a9\u0646\u06cc\u062f.',
  themeIntro:
    '\u06cc\u06a9 \u0633\u0637\u062d \u0645\u062a\u0645\u0631\u06a9\u0632 \u0628\u0631\u0627\u06cc \u06a9\u0627\u0631 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f.',
  livePreview: '\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u0632\u0646\u062f\u0647',
  themeMidnight: '\u0646\u06cc\u0645\u0647\u200c\u0634\u0628',
  themeMidnightNote:
    '\u0633\u0628\u0632 \u0639\u0645\u06cc\u0642 \u0648 \u0644\u06cc\u0645\u0648\u06cc \u0646\u0631\u0645',
  themeGraphite: '\u06af\u0631\u0627\u0641\u06cc\u062a',
  themeGraphiteNote:
    '\u062a\u06cc\u0631\u0647 \u0645\u062a\u0639\u0627\u062f\u0644 \u0648 \u0628\u0646\u0641\u0634 \u0646\u0631\u0645',
  themeBlueprint: '\u0646\u0642\u0634\u0647',
  themeBlueprintNote:
    '\u0622\u0628\u06cc \u062a\u06cc\u0631\u0647 \u0648 \u0633\u06cc\u0627\u0646 \u0633\u0641\u06cc\u062f',
  themeLight: '\u06a9\u0627\u063a\u0630',
  themeLightNote:
    '\u0631\u0648\u0634\u0646 \u06af\u0631\u0645 \u0648 \u067e\u0631\u062a\u0645\u0627\u06cc\u0647',
  background: '\u0645\u0627\u062f\u0647 \u067e\u0633\u200c\u0632\u0645\u06cc\u0646\u0647',
  backgroundNote:
    '\u0645\u0627\u062f\u0647 Acrylic \u062f\u0631 \u0648\u06cc\u0646\u062f\u0648\u0632 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc\u200c\u0634\u062f\u0647. \u062f\u0631 \u0633\u0627\u06cc\u0631 \u0633\u06cc\u0633\u062a\u0645\u200c\u0647\u0627 \u0633\u0637\u062d \u062a\u0648\u067e\u0631\u0641\u0644 \u062c\u0627\u06cc\u06af\u0632\u06cc\u0646 \u0645\u06cc\u200c\u0634\u0648\u062f.',
  backgroundEnabled: '\u067e\u0633\u200c\u0632\u0645\u06cc\u0646\u0647 \u0634\u0641\u0627\u0641',
  backgroundNative:
    '\u0645\u0627\u062f\u0647 Acrylic \u062f\u0631 \u0627\u06cc\u0646 \u0648\u06cc\u0646\u062f\u0648\u0632 \u0641\u0639\u0627\u0644 \u0627\u0633\u062a.',
  backgroundFallback:
    '\u0627\u06cc\u0646 \u062f\u0633\u062a\u06af\u0627\u0647 \u0627\u0632 \u0633\u0637\u062d \u062c\u0627\u0645\u062f \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0645\u06cc\u200c\u06a9\u0646\u062f.',
  backgroundEnabledNote:
    '\u0645\u06cc\u0632\u0627\u0646 \u062e\u0648\u0627\u0646\u0627\u06cc\u06cc \u0631\u0627 \u062d\u0641\u0638 \u0645\u06cc\u200c\u06a9\u0646\u062f.',
  blurAmount: '\u0645\u06cc\u0632\u0627\u0646 \u062a\u0627\u0631\u06cc',
  opacity: '\u0634\u0641\u0627\u0641\u06cc\u062a',
  noiseAmount: '\u0645\u06cc\u0632\u0627\u0646 \u0646\u0648\u06cc\u0632',
  noiseScale: '\u0627\u0646\u062f\u0627\u0632\u0647 \u0646\u0648\u06cc\u0632',
  workspaceSettings:
    '\u062c\u0632\u0626\u06cc\u0627\u062a \u0645\u062d\u06cc\u0637 \u06a9\u0627\u0631',
  workspaceSettingsIntro:
    '\u06a9\u0646\u062a\u0631\u0644\u0647\u0627\u06cc\u06cc \u06a9\u0647 \u0631\u0641\u062a\u0627\u0631 \u062a\u0631\u0645\u06cc\u0646\u0627\u0644 \u0631\u0627 \u062a\u063a\u06cc\u06cc\u0631 \u0645\u06cc\u200c\u062f\u0647\u0646\u062f.',
  zwnj: '\u0646\u06cc\u0645\u200c\u0641\u0627\u0635\u0644\u0647',
  hideReader:
    '\u067e\u0646\u0647\u0627\u0646 \u06a9\u0631\u062f\u0646 \u062e\u0648\u0627\u0646\u0646\u062f\u0647',
});
const en = {
  resume: 'Resume',
  ready: 'Ready',
  exited: 'Exited',
  copied: 'Copied',
  saved: 'Preferences saved',
  staged: 'Command staged. Review it, then send.',
  paused: 'Work timer paused',
  idle: 'Idle · work timer paused',
  active: 'Working · pauses automatically when idle',
  noBattery: 'No battery or status unavailable',
  charging: 'Connected to power',
  discharging: 'Running on battery',
  closeFirst: 'Open a terminal first',
  exported: 'Transcript saved',
  startedIn: 'Started in',
  noSession: 'No open session',
  hideReader: 'Hide reader',
  backgroundNative: 'Native Acrylic is available on this Windows build.',
  backgroundFallback: 'This device uses a solid fallback for the background.',
};
document.querySelectorAll('[data-i18n]').forEach((node) => {
  en[node.dataset.i18n] = node.textContent;
});
const t = (key) => (settings?.language === 'fa' ? fa[key] : en[key]) || en[key] || key;
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 4500);
}
function safe(promise) {
  return promise.catch((error) => {
    toast(error.message || String(error));
  });
}
function palette() {
  const style = getComputedStyle(document.body);
  const palettes = {
    light: {
      black: '#20271c',
      red: '#9e3024',
      green: '#3a6416',
      yellow: '#775700',
      blue: '#28538c',
      magenta: '#75409b',
      cyan: '#126d62',
      white: '#43533c',
      brightBlack: '#66735f',
      brightRed: '#ad3a29',
      brightGreen: '#3a6416',
      brightYellow: '#775700',
      brightBlue: '#28538c',
      brightMagenta: '#75409b',
      brightCyan: '#126d62',
      brightWhite: '#263122',
    },
    graphite: {
      black: '#25222d',
      red: '#ff9e9e',
      green: '#b7f0a1',
      yellow: '#e8d08a',
      blue: '#9dc8ff',
      magenta: '#d2b3ff',
      cyan: '#9ee5dc',
      white: '#eeeaf5',
      brightBlack: '#817889',
    },
    blueprint: {
      black: '#11212c',
      red: '#ff9f96',
      green: '#a4e6b0',
      yellow: '#f0d88b',
      blue: '#92cfff',
      magenta: '#d3b5ff',
      cyan: '#72e7ef',
      white: '#e8f6f7',
      brightBlack: '#668b95',
    },
    midnight: {
      black: '#263026',
      red: '#e79889',
      green: '#b5f36c',
      yellow: '#edce80',
      blue: '#8bbde1',
      magenta: '#c6a5e3',
      cyan: '#88d5c7',
      white: '#e7eddf',
      brightBlack: '#7c8c76',
    },
  };
  const colors = palettes[settings.theme] || palettes.midnight;
  return {
    background: style.getPropertyValue('--terminal').trim() || '#070b08',
    foreground: style.getPropertyValue('--text').trim(),
    cursor: settings.accent,
    selectionBackground: settings.accent + '55',
    ...colors,
  };
}
function backgroundValues(
  value = settings?.backgroundEffects || defaultSettings?.backgroundEffects,
) {
  const fallback = defaultSettings?.backgroundEffects || {
    enabled: true,
    blur: 18,
    opacity: 84,
    noiseAmount: 5,
    noiseScale: 1.2,
  };
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallback.enabled,
    blur: Number.isFinite(value?.blur) ? value.blur : fallback.blur,
    opacity: Number.isFinite(value?.opacity) ? value.opacity : fallback.opacity,
    noiseAmount: Number.isFinite(value?.noiseAmount) ? value.noiseAmount : fallback.noiseAmount,
    noiseScale: Number.isFinite(value?.noiseScale) ? value.noiseScale : fallback.noiseScale,
  };
}
function syncAppearanceControls(value) {
  const effects = backgroundValues(value);
  const form = $('settings-form');
  if (!form) return;
  form.elements.backgroundEnabled.checked = effects.enabled;
  form.elements.backgroundBlur.value = effects.blur;
  form.elements.backgroundOpacity.value = effects.opacity;
  form.elements.backgroundNoiseAmount.value = effects.noiseAmount;
  form.elements.backgroundNoiseScale.value = effects.noiseScale;
  $('background-blur-value').textContent = effects.blur + 'px';
  $('background-opacity-value').textContent = effects.opacity + '%';
  $('background-noise-amount-value').textContent = effects.noiseAmount + '%';
  $('background-noise-scale-value').textContent = Number(effects.noiseScale).toFixed(1) + 'x';
  $('background-effects').classList.toggle('is-disabled', !effects.enabled);
  for (const name of [
    'backgroundBlur',
    'backgroundOpacity',
    'backgroundNoiseAmount',
    'backgroundNoiseScale',
  ])
    form.elements[name].disabled = !effects.enabled;
}
function readAppearanceControls() {
  const form = $('settings-form');
  return {
    enabled: form.elements.backgroundEnabled.checked,
    blur: Number(form.elements.backgroundBlur.value),
    opacity: Number(form.elements.backgroundOpacity.value),
    noiseAmount: Number(form.elements.backgroundNoiseAmount.value),
    noiseScale: Number(form.elements.backgroundNoiseScale.value),
  };
}
function applyBackgroundEffects(value) {
  const effects = backgroundValues(value);
  document.documentElement.style.setProperty('--blur-amount', effects.blur + 'px');
  document.documentElement.style.setProperty(
    '--surface-opacity',
    (effects.opacity / 100).toFixed(2),
  );
  document.documentElement.style.setProperty(
    '--noise-opacity',
    (effects.noiseAmount / 100).toFixed(3),
  );
  document.documentElement.style.setProperty(
    '--noise-size',
    Math.round(effects.noiseScale * 140) + 'px',
  );
  const reduced = window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
  document.body.dataset.material =
    nativeBackdropSupported && effects.enabled && !reduced ? 'on' : 'off';
  syncAppearanceControls(effects);
}
function updateThemePicker(theme) {
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    const selected = button.dataset.themeChoice === theme;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-checked', String(selected));
  });
}
function updateBackgroundSupport() {
  $('background-support').textContent = t(
    nativeBackdropSupported ? 'backgroundNative' : 'backgroundFallback',
  );
}
function previewSettings() {
  const form = $('settings-form');
  document.body.dataset.theme = form.elements.theme.value;
  updateThemePicker(form.elements.theme.value);
  applyBackgroundEffects(readAppearanceControls());
}
function applySettings() {
  document.documentElement.lang = settings.language;
  document.body.dir = settings.language === 'fa' ? 'rtl' : 'ltr';
  document.body.dataset.theme = settings.theme;
  document.documentElement.style.setProperty('--accent', settings.accent);
  document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
  updateThemePicker(settings.theme);
  applyBackgroundEffects(settings.backgroundEffects);
  updateBackgroundSupport();
  document
    .querySelectorAll('[data-i18n]')
    .forEach((node) => (node.textContent = t(node.dataset.i18n)));
  $('pause-work').textContent = t(paused ? 'resume' : 'pause');
  $('reader-panel').hidden = !settings.readerVisible;
  $('reader-toggle').textContent = t(settings.readerVisible ? 'hideReader' : 'reader');
  $('reader-toggle').setAttribute('aria-pressed', String(settings.readerVisible));
  $('reader-direction').value = settings.readerDirection;
  $('shell-select').value = settings.defaultShell;
  for (const s of sessions.values()) {
    s.term.options.theme = palette();
    s.term.options.fontFamily = settings.fontFamily;
    s.term.options.fontSize = settings.fontSize;
    s.term.options.cursorStyle = settings.cursorStyle;
    s.term.options.scrollback = settings.scrollback;
  }
  renderShortcuts();
  updateActive();
  requestAnimationFrame(fitActive);
  refreshReader();
  tick();
}
function renderShortcuts() {
  $('shortcuts').replaceChildren();
  settings.shortcuts.forEach((shortcut) => {
    const button = document.createElement('button');
    button.className = 'shortcut';
    const text = document.createElement('span');
    text.className = 'shortcut-copy';
    const label = document.createElement('b');
    label.textContent = shortcut.label;
    const description = document.createElement('small');
    description.textContent = shortcut.description;
    text.append(label, description);
    const command = document.createElement('code');
    command.className = 'shortcut-command';
    command.textContent = shortcut.command;
    button.append(text, command);
    button.title = shortcut.command;
    button.onclick = () => {
      $('command').value = shortcut.command;
      $('command').focus();
      toast(t('staged'));
    };
    $('shortcuts').append(button);
  });
}
const banner = [
  '',
  '       /\\',
  '      /  \\     T R I A N G L E',
  '     / /\\ \\    T E R M I N A L',
  '    /_/__\\_\\',
  '',
  '  Your shell. Your language. Your space.',
  '',
].join('\r\n');
async function newSession(shell = $('shell-select').value) {
  if (sessions.size >= 12) {
    toast('Maximum 12 terminal sessions');
    return;
  }
  const pane = document.createElement('div');
  pane.className = 'terminal-pane';
  $('terminals').append(pane);
  const welcome = document.createElement('pre');
  welcome.className = 'ascii-banner';
  welcome.textContent = banner;
  welcome.hidden = !settings.showBanner;
  const host = document.createElement('div');
  host.className = 'terminal-host';
  pane.append(welcome, host);
  const term = new Terminal({
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    cursorStyle: settings.cursorStyle,
    cursorBlink: true,
    theme: palette(),
    scrollback: settings.scrollback,
    allowProposedApi: false,
    allowTransparency: false,
    convertEol: false,
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(host);
  let result;
  try {
    result = await api.createSession({ shell, cwd, cols: 80, rows: 24 });
  } catch (error) {
    term.dispose();
    pane.remove();
    toast(error.message);
    return;
  }
  const name = { powershell: 'PowerShell', cmd: 'CMD', pwsh: 'PowerShell 7' }[shell];
  const s = {
    ...result,
    shell,
    cwd,
    term,
    fit,
    pane,
    welcome,
    name: name + ' ' + ++serial,
    exited: false,
    draft: '',
  };
  sessions.set(s.id, s);
  term.onData((data) => {
    if (!s.exited) safe(api.write(s.id, data));
  });
  term.onKey(() => {
    if (!welcome.hidden) {
      welcome.hidden = true;
      requestAnimationFrame(fitActive);
    }
  });
  term.onResize(({ cols, rows }) => {
    if (!s.exited) safe(api.resize(s.id, cols, rows));
  });
  term.onWriteParsed(() => {
    if (s.id === activeId) scheduleReader();
  });
  term.attachCustomKeyEventHandler((event) => {
    if (
      event.ctrlKey &&
      event.shiftKey &&
      ['T', 'W', 'C', 'V', 'F'].includes(event.key.toUpperCase())
    )
      return false;
    if (event.ctrlKey && event.key === ',') return false;
    return true;
  });
  renderSessions();
  activate(s.id);
  await safe(api.attachSession(s.id));
}
function renderSessions() {
  $('session-list').replaceChildren();
  for (const s of sessions.values()) {
    const row = document.createElement('div');
    row.className = 'session-row' + (s.id === activeId ? ' active' : '');
    row.dataset.id = s.id;
    const open = document.createElement('button');
    open.className = 'session-open';
    row.classList.toggle('exited', s.exited);
    open.textContent = s.name;
    open.onclick = () => activate(s.id);
    const close = document.createElement('button');
    close.className = 'session-close';
    close.textContent = '×';
    close.title = t('close');
    close.onclick = () => requestClose(s.id);
    row.append(open, close);
    $('session-list').append(row);
  }
}
function activate(id) {
  const previous = sessions.get(activeId);
  if (previous) previous.draft = $('command').value;
  activeId = id;
  const s = sessions.get(id);
  $('command').value = s?.draft || '';
  for (const session of sessions.values())
    session.pane.classList.toggle('active', session.id === id);
  renderSessions();
  updateActive();
  fitActive();
  refreshReader();
  s?.term.focus();
}
function updateActive() {
  const s = sessions.get(activeId);
  $('active-title').textContent = s?.name || t('noSession');
  $('process-id').textContent = s ? 'PID ' + s.pid : '';
  $('cwd-label').textContent = s ? t('startedIn') + ': ' + s.cwd : '';
  $('cwd-label').title = $('cwd-label').textContent;
  $('connection-status').textContent = s
    ? s.exited
      ? t('exited') + ' / ' + s.exitCode
      : t('ready')
    : t('noSession');
  $('send-command').disabled = !s || s.exited;
}
function fitActive() {
  const s = sessions.get(activeId);
  if (s && s.pane.clientWidth > 0) s.fit.fit();
}
function requestClose(id) {
  const s = sessions.get(id);
  if (!s) return;
  if (s.exited) return closeSession(id);
  closingId = id;
  $('close-dialog').showModal();
}
async function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return;
  await safe(api.closeSession(id));
  s.term.dispose();
  s.pane.remove();
  sessions.delete(id);
  if (activeId === id) activate(sessions.keys().next().value);
  else renderSessions();
}
function bufferLines(s, limit) {
  if (!s) return [];
  const buffer = s.term.buffer.active;
  const lines = [];
  for (let i = Math.max(0, buffer.length - limit); i < buffer.length; i++) {
    const line = buffer.getLine(i);
    if (!line) continue;
    const next = buffer.getLine(i + 1);
    const text = line.translateToString(!next?.isWrapped);
    if (line.isWrapped && lines.length) lines[lines.length - 1] += text;
    else lines.push(text);
  }
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}
function scheduleReader() {
  if (!readerTimer)
    readerTimer = setTimeout(() => {
      readerTimer = null;
      refreshReader();
    }, 120);
}
function refreshReader() {
  if (!settings?.readerVisible) return;
  const output = $('reader-output');
  const atBottom = output.scrollHeight - output.scrollTop - output.clientHeight < 50;
  const fragment = document.createDocumentFragment();
  for (const text of bufferLines(sessions.get(activeId), 600)) {
    const line = document.createElement('div');
    line.dir = settings.readerDirection;
    line.textContent = text;
    fragment.append(line);
  }
  output.replaceChildren(fragment);
  if (atBottom) output.scrollTop = output.scrollHeight;
}
async function sendCommand() {
  const s = sessions.get(activeId);
  if (!s || s.exited) return toast(t('closeFirst'));
  const value = $('command').value;
  if (!value.trim()) return;
  if (!s.welcome.hidden) {
    s.welcome.hidden = true;
    fitActive();
  }
  // xterm applies bracketed-paste mode when the foreground application supports it.
  if (!(await api.submit(s.id, value))) {
    s.term.paste(value);
    await api.write(s.id, '\r');
  }
  $('command').value = '';
  s.draft = '';
  s.term.focus();
}
function duration(ms) {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((x) => String(x).padStart(2, '0'))
    .join(':');
}
function tick() {
  const now = performance.now();
  const delta = Math.min(now - lastTick, 2000);
  lastTick = now;
  if (!paused && document.hasFocus() && lastStats && lastStats.idleSeconds < 60) workMs += delta;
  $('clock').textContent = new Date().toLocaleTimeString(
    settings?.language === 'fa' ? 'fa-IR' : 'en-GB',
    { hour12: false },
  );
  $('session-time').textContent = duration(now - started);
  $('work-time').textContent = duration(workMs);
  $('work-state').textContent = t(
    paused ? 'paused' : !document.hasFocus() || lastStats?.idleSeconds >= 60 ? 'idle' : 'active',
  );
}
async function pollStats() {
  try {
    lastStats = await api.stats();
    const b = lastStats.battery;
    $('battery-metric').hidden = b.percent === null;
    $('battery-value').textContent = b.percent === null ? '-' : b.percent + '%';
    $('battery-state').textContent =
      b.percent === null ? t('noBattery') : t(lastStats.onBattery ? 'discharging' : 'charging');
    const used = lastStats.memoryUsed / 1073741824,
      total = lastStats.memoryTotal / 1073741824;
    $('memory-value').textContent = used.toFixed(1) + ' GB';
    $('memory-state').textContent =
      '/ ' + total.toFixed(1) + ' GB · ' + lastStats.cores + ' logical CPUs';
    $('memory-meter').style.width = (used / total) * 100 + '%';
  } catch (error) {
    $('memory-state').textContent = error.message;
  }
}
function fillSettings(value) {
  const form = $('settings-form');
  for (const key of [
    'language',
    'theme',
    'accent',
    'fontSize',
    'fontFamily',
    'cursorStyle',
    'scrollback',
    'defaultShell',
  ])
    form.elements[key].value = value[key];
  form.elements.showBanner.checked = value.showBanner;
  form.elements.shortcuts.value = JSON.stringify(value.shortcuts, null, 2);
  form.elements.backgroundEnabled.checked = value.backgroundEffects.enabled;
  form.elements.backgroundBlur.value = value.backgroundEffects.blur;
  form.elements.backgroundOpacity.value = value.backgroundEffects.opacity;
  form.elements.backgroundNoiseAmount.value = value.backgroundEffects.noiseAmount;
  form.elements.backgroundNoiseScale.value = value.backgroundEffects.noiseScale;
  updateThemePicker(value.theme);
  syncAppearanceControls(value.backgroundEffects);
}
function openSettings() {
  fillSettings(settings);
  $('settings-error').textContent = '';
  $('settings-dialog').showModal();
  previewSettings();
}
async function persist() {
  settings = await api.saveSettings(settings);
  applySettings();
}
api.onData(({ id, data }) => {
  sessions.get(id)?.term.write(data);
});
api.onExit(({ id, exitCode }) => {
  const s = sessions.get(id);
  if (s) {
    s.exited = true;
    s.exitCode = exitCode;
    s.term.write('\r\n\x1b[90m[Process exited: ' + exitCode + ']\x1b[0m\r\n');
    renderSessions();
    updateActive();
  }
});
$('new-session').onclick = () => safe(newSession());
$('workspace').onclick = () =>
  safe(
    (async () => {
      const folder = await api.chooseFolder();
      if (folder) {
        cwd = folder;
        updateFolder();
        await newSession();
      }
    })(),
  );
function updateFolder() {
  $('folder-name').textContent = cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
  $('workspace').title = cwd;
  $('header-path').textContent = cwd;
}
$('language-button').onclick = () =>
  safe(
    (async () => {
      settings.language = settings.language === 'en' ? 'fa' : 'en';
      await persist();
      await pollStats();
    })(),
  );
$('reader-toggle').onclick = () =>
  safe(
    (async () => {
      settings.readerVisible = !settings.readerVisible;
      await persist();
    })(),
  );
$('reader-direction').onchange = () =>
  safe(
    (async () => {
      settings.readerDirection = $('reader-direction').value;
      await persist();
    })(),
  );
$('input-direction').onchange = () => {
  $('command').dir = $('input-direction').value;
  $('command').focus();
};
$('send-command').onclick = () => safe(sendCommand());
$('copy-command').onclick = () => safe(api.copy($('command').value).then(() => toast(t('copied'))));
$('command').onkeydown = (event) => {
  if (event.ctrlKey && event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    safe(sendCommand());
  }
};
$('zwnj').onclick = () => {
  const input = $('command');
  input.setRangeText('\u200c', input.selectionStart, input.selectionEnd, 'end');
  input.focus();
};
$('pause-work').onclick = () => {
  paused = !paused;
  $('pause-work').textContent = t(paused ? 'resume' : 'pause');
  tick();
};
$('export').onclick = () =>
  safe(
    (async () => {
      const s = sessions.get(activeId);
      if (!s) return;
      if (await api.saveTranscript(bufferLines(s, settings.scrollback + s.term.rows).join('\n')))
        toast(t('exported'));
    })(),
  );
$('settings-button').onclick = openSettings;
function closeSettings() {
  $('settings-dialog').close();
  applySettings();
}
$('close-settings').onclick = closeSettings;
$('settings-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeSettings();
});
$('reset-settings').onclick = () => {
  fillSettings(defaultSettings);
  previewSettings();
};
document.querySelectorAll('[data-theme-choice]').forEach((button) => {
  button.onclick = () => {
    $('settings-form').elements.theme.value = button.dataset.themeChoice;
    updateThemePicker(button.dataset.themeChoice);
    previewSettings();
  };
});
for (const id of [
  'background-enabled',
  'background-blur',
  'background-opacity',
  'background-noise-amount',
  'background-noise-scale',
])
  $(id).oninput = previewSettings;
$('settings-form').onsubmit = async (event) => {
  event.preventDefault();
  try {
    const form = event.target;
    const candidate = { ...settings };
    for (const key of ['language', 'theme', 'accent', 'fontFamily', 'cursorStyle', 'defaultShell'])
      candidate[key] = form.elements[key].value;
    for (const key of ['fontSize', 'scrollback']) candidate[key] = Number(form.elements[key].value);
    candidate.showBanner = form.elements.showBanner.checked;
    candidate.backgroundEffects = readAppearanceControls();
    candidate.shortcuts = JSON.parse(form.elements.shortcuts.value);
    settings = await api.saveSettings(candidate);
    applySettings();
    $('settings-dialog').close();
    toast(t('saved'));
  } catch (error) {
    $('settings-error').textContent = error.message;
  }
};
$('cancel-close').onclick = () => $('close-dialog').close();
$('confirm-close').onclick = () => {
  $('close-dialog').close();
  safe(closeSession(closingId));
};
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]')) return;
  if (event.ctrlKey && event.key === ',') {
    event.preventDefault();
    openSettings();
    return;
  }
  if (!event.ctrlKey || !event.shiftKey) return;
  const key = event.key.toUpperCase();
  if (key === 'T') {
    event.preventDefault();
    safe(newSession());
  }
  if (key === 'W') {
    event.preventDefault();
    requestClose(activeId);
  }
  if (key === 'F') {
    event.preventDefault();
    $('command').focus();
  }
  if (key === 'C' && sessions.get(activeId)?.term.hasSelection()) {
    event.preventDefault();
    safe(api.copy(sessions.get(activeId).term.getSelection()));
  }
  if (key === 'V' && !['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    safe(
      api.paste().then((text) => {
        $('command').value = text;
        $('command').focus();
      }),
    );
  }
});
new ResizeObserver(() => requestAnimationFrame(fitActive)).observe($('terminals'));
safe(
  (async () => {
    const info = await api.bootstrap();
    settings = info.settings;
    defaultSettings = info.defaults;
    nativeBackdropSupported = Boolean(info.nativeBackdropSupported);
    cwd = info.cwd;
    $('version').textContent = info.version;
    updateFolder();
    applySettings();
    await pollStats();
    await newSession(settings.defaultShell);
    setInterval(tick, 1000);
    setInterval(pollStats, 3000);
  })(),
);
