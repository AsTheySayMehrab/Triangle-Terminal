const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
exports.run = async ({ app, window, resultDir }) => {
  const errors = [];
  window.webContents.on('console-message', (event) => {
    if (event.message.includes('Uncaught')) errors.push(event.message);
  });
  fs.mkdirSync(resultDir, { recursive: true });
  const timeout = setTimeout(() => {
    console.error('Smoke test timed out');
    app.exit(1);
  }, 60000);
  const js = (source) => window.webContents.executeJavaScript(source, true);
  const waitFor = async (source) => {
    for (let i = 0; i < 120; i++) {
      if (await js(source)) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Timed out: ' + source);
  };
  try {
    await new Promise((resolve) => window.webContents.once('did-finish-load', resolve));
    await waitFor('sessions.size === 1');
    await waitFor("bufferLines(sessions.get(activeId),100).join('\\n').includes('PS ')");
    assert.equal(await js('typeof window.require'), 'undefined');
    fs.writeFileSync(
      path.join(resultDir, 'triangle-startup.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await js(
      '$(\'command\').value = \'Write-Output (\\"TRIANGLE_\\" + \\"PS_OK\\")\'; sendCommand()',
    );
    await waitFor("bufferLines(sessions.get(activeId),100).some(x=>x.trim()==='TRIANGLE_PS_OK')");
    await js(
      "$('command').value = 'Write-Output \\\"سلام دنیا — می‌توانم English 123\\\"'; sendCommand()",
    );
    await waitFor(
      "bufferLines(sessions.get(activeId),100).some(x=>x.trim()==='سلام دنیا — می‌توانم English 123')",
    );
    await js(
      "$('command').value = \"[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('می‌توانم'))\"; sendCommand()",
    );
    await waitFor(
      "bufferLines(sessions.get(activeId),100).some(x=>x.trim()==='2YXbjOKAjNiq2YjYp9mG2YU=')",
    );
    await waitFor("$('reader-output').textContent.includes('سلام دنیا')");
    const mockCode =
      "process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');console.log('TRIANGLE_AGENT_READY');let text='';process.stdin.on('data',d=>{text+=d;if(text.includes('\\r')){console.log('AGENT_TEXT:'+Buffer.from(text.trim()).toString('base64'));process.exit(0);}})";
    await js(
      "$('command').value=" + JSON.stringify('node -e "' + mockCode + '"') + ';sendCommand()',
    );
    await waitFor(
      "bufferLines(sessions.get(activeId),100).some(x=>x.trim()==='TRIANGLE_AGENT_READY')",
    );
    await js("$('command').value='می‌توانم';sendCommand()");
    await waitFor(
      "bufferLines(sessions.get(activeId),100).join('\\n').includes('AGENT_TEXT:2YXbjOKAjNiq2YjYp9mG2YU=')",
    );
    await js("settings.language='fa'; applySettings()");
    assert.equal(await js('document.body.dir'), 'rtl');
    assert.equal(await js("getComputedStyle($('command')).unicodeBidi"), 'plaintext');
    assert.equal(await js("getComputedStyle($('terminals')).direction"), 'ltr');
    await js("$('command').value='می'; $('command').setSelectionRange(2,2); $('zwnj').click()");
    assert.equal(await js("$('command').value"), 'می‌');
    await js("$('command').value=''; settings.language='en'; applySettings(); newSession('cmd')");
    await waitFor('sessions.size === 2');
    await waitFor("bufferLines(sessions.get(activeId),100).join('\\n').includes('>')");
    await js("$('command').value='echo TRIANGLE_CMD_OK'; sendCommand()");
    await waitFor("bufferLines(sessions.get(activeId),100).some(x=>x.trim()==='TRIANGLE_CMD_OK')");
    await js("$('command').value='echo سلام فارسی'; sendCommand()");
    await waitFor("bufferLines(sessions.get(activeId),100).some(x=>x.trim()==='سلام فارسی')");
    await js("$('shortcuts').firstElementChild.click()");
    assert.equal(await js("$('command').value"), 'codex');
    assert.equal(await js('sessions.get(activeId).exited'), false);
    await js(
      "$('command').value=''; openSettings(); $('settings-form').elements.fontSize.value='18'; $('settings-form').requestSubmit()",
    );
    await waitFor("!$('settings-dialog').open && settings.fontSize===18");
    assert.equal(await js('triangle.bootstrap().then(value=>value.settings.fontSize)'), 18);
    await js(
      "settings.fontSize=15; applySettings(); activate(sessions.keys().next().value); $('toast').hidden=true",
    );
    const demo =
      "Clear-Host; Write-Output 'Triangle Terminal / Ready to build.'; Write-Output 'سلام! به ترمینال مثلث خوش آمدید.'; Write-Output 'می‌توانم فارسی و English را کنار هم بنویسم.'; Write-Output 'UTF-8 | PowerShell | Codex-ready'";
    await js("$('command').value=" + JSON.stringify(demo) + ';sendCommand()');
    await waitFor(
      "bufferLines(sessions.get(activeId),100).some(x=>x.includes('سلام! به ترمینال مثلث خوش آمدید.'))",
    );
    window.setSize(1440, 940);
    await new Promise((r) => setTimeout(r, 400));
    fs.writeFileSync(
      path.join(resultDir, 'triangle-english.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await js(
      "settings.language='fa'; applySettings(); $('command').value='لطفاً این پروژه را بررسی کن و خطاها را توضیح بده. / Review this project.'",
    );
    await new Promise((r) => setTimeout(r, 300));
    fs.writeFileSync(
      path.join(resultDir, 'triangle-persian.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await js("settings.language='en'; settings.theme='light'; applySettings()");
    window.setSize(960, 680);
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(await js('document.body.scrollWidth <= innerWidth'), true);
    assert.ok(
      await js("document.querySelector('.terminal-body').clientHeight >= 180"),
      'Compact terminal retains usable height',
    );
    for (const [id, target, dx, dy] of [
      ['sidebar-resizer', '.sidebar', 35, 0],
      ['reader-resizer', '#reader-panel', -30, 0],
      ['composer-resizer', '#command', 0, -20],
    ]) {
      const before = await js(
        `document.querySelector(${JSON.stringify(target)}).getBoundingClientRect().${dy ? 'height' : 'width'}`,
      );
      const point = await js(
        `(() => { const r = $('${id}').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`,
      );
      window.webContents.sendInputEvent({
        type: 'mouseDown',
        ...point,
        button: 'left',
        clickCount: 1,
      });
      window.webContents.sendInputEvent({
        type: 'mouseMove',
        x: point.x + dx,
        y: point.y + dy,
        modifiers: ['leftButtonDown'],
      });
      window.webContents.sendInputEvent({
        type: 'mouseUp',
        x: point.x + dx,
        y: point.y + dy,
        button: 'left',
        clickCount: 1,
      });
      await new Promise((r) => setTimeout(r, 100));
      assert.ok(
        (await js(
          `document.querySelector(${JSON.stringify(target)}).getBoundingClientRect().${dy ? 'height' : 'width'}`,
        )) >
          before + 5,
        id + ' responds to mouse dragging',
      );
      await js(`$('${id}').ondblclick()`);
    }
    fs.writeFileSync(
      path.join(resultDir, 'triangle-compact.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await js('Promise.all([...sessions.keys()].map(id=>closeSession(id)))');
    assert.equal(await js('sessions.size'), 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(resultDir, 'smoke-result.json'),
      JSON.stringify(
        {
          passed: true,
          checks: [
            'PowerShell execution',
            'CMD execution',
            'Persian Unicode roundtrip in both shells',
            'PowerShell half-space byte preservation',
            'Unicode input to a foreground mock AI CLI',
            'RTL layout and editor',
            'ZWNJ insertion',
            'staged Codex shortcut',
            'settings persistence',
            'compact layout',
            'session cleanup',
            'renderer isolation',
          ],
          screenshots: [
            'triangle-startup.png',
            'triangle-english.png',
            'triangle-persian.png',
            'triangle-compact.png',
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS: Electron, PowerShell, CMD, Persian roundtrip, RTL, settings, shortcuts, session cleanup',
    );
    clearTimeout(timeout);
    app.quit();
  } catch (error) {
    console.error(error);
    const buffer = await js("bufferLines(sessions.get(activeId),200).join('\\n')").catch(() => '');
    console.error(buffer);
    console.error(await js("$('toast').textContent").catch(() => ''));
    fs.writeFileSync(
      path.join(resultDir, 'smoke-result.json'),
      JSON.stringify({ passed: false, error: String(error), buffer }, null, 2),
    );
    clearTimeout(timeout);
    await js('Promise.all([...sessions.keys()].map(id=>closeSession(id)))').catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    app.exit(1);
  }
};
