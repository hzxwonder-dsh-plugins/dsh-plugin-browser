import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {BrowserSessions, httpUrl, redact, redactValue} from '../browser.js';
import {readFile} from 'node:fs/promises';

test('package declares the official right Sidebar client bundle', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const client = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  assert.equal(packageJson.exports['./client'], './client.js');
  assert.equal(packageJson.dsh.client.platform, 'web');
  assert.deepEqual(packageJson.dsh.client.inject, ['@deepseek-ai/dsh-client-ui-sidebar-right']);
  assert.match(client, /window\.__ModuleLoader__\.load/);
  assert.match(client, /sidebar\.right\.pane\.tab/);
  assert.match(client, /sidebarRightTabs\.register/);
  assert.doesNotMatch(client, /javascript:|data:|file:/);
});

test('navigation admits credential-free HTTP(S) only', () => {
  assert.equal(httpUrl('http://127.0.0.1:3080'), 'http://127.0.0.1:3080/');
  for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'https://user:pass@example.com', 'data:text/html,test']) assert.throws(() => httpUrl(url));
  assert.equal(redact('token=abcdefghi'), 'token=[redacted]');
});

test('redaction preserves structured values and long strings', () => {
  assert.deepEqual(redactValue([{href: 'https://example.com/?token=abc', text: 'a'.repeat(100000)}, {width: 1280}]), [{href: 'https://example.com/?token=[redacted]', text: 'a'.repeat(24000)}, {width: 1280}]);
});

test('real Chromium navigates, fills, clicks, captures, isolates and closes', async () => {
  const server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><title>Browser fixture</title><h1>Browser fixture</h1><label>Message<input aria-label="Message"></label><button onclick='document.querySelector("output").textContent=document.querySelector("input").value;console.log("updated")'>Apply</button><output></output>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browsers = new BrowserSessions({headless: true, executablePath: process.env.BROWSER_TEST_EXECUTABLE});
  const signal = new AbortController().signal;
  const run = args => browsers.run('test-session', args, signal);
  try {
    const first = await run({action: 'navigate', url: `http://127.0.0.1:${server.address().port}`});
    assert.match(first.snapshot, /Browser fixture/);
    const second = await run({action: 'fill', role: 'textbox', name: 'Message', text: 'verified', observation: first.observation});
    await assert.rejects(run({action: 'click', role: 'button', name: 'Apply', observation: first.observation}), /STALE/);
    const third = await run({action: 'click', role: 'button', name: 'Apply', observation: second.observation});
    assert.match(third.snapshot, /verified/);
    assert.match((await run({action: 'evaluate', expression: 'visible_text'})).result, /verified/);
    const shot = await run({action: 'screenshot'});
    assert(shot.data.length > 2000);
    assert.equal(shot.data[0], 0xff);
    assert((await run({action: 'console'})).messages.some(message => message.text === 'updated'));
    await assert.rejects(run({action: 'evaluate', expression: 'document.cookie'}), /INSPECTION/);
    assert.equal((await run({action: 'evaluate', expression: 'title'})).result, 'Browser fixture');
    const other = await browsers.session('other-session');
    assert.equal(other.page.url(), 'about:blank');
    await run({action: 'close'});
    assert.equal(browsers.sessions.has('test-session'), false);
  } finally { await browsers.dispose(); await new Promise(resolve => server.close(resolve)); }
});
