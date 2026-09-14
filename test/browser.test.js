import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {BrowserSessions, browserKey, encodeEvent, eventStream, httpUrl, playwrightKey, redact, redactValue, viewportBounds} from '../browser.js';
import {readFile} from 'node:fs/promises';
import {apply} from '../index.js';

/** Await one stream event matching a predicate, bounded by a timeout. */
async function nextEvent(reader, predicate, timeout = 15000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('timed out waiting for a stream event');
    let timer;
    const event = await Promise.race([
      reader.next(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timed out waiting for a stream event')), remaining); }),
    ]).finally(() => clearTimeout(timer));
    if (event === undefined) throw new Error('the stream ended early');
    if (predicate(event)) return event;
  }
}

test('package declares the official right Sidebar client bundle', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const client = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  assert.equal(packageJson.exports['./client'], './client.js');
  assert.equal(packageJson.dsh.client.platform, 'web');
  assert.deepEqual(packageJson.dsh.client.inject, ['@deepseek-ai/dsh-client-ui-sidebar-right']);
  assert.match(client, /window\.__ModuleLoader__\.load/);
  assert.match(client, /sidebar\.right\.pane\.tab/);
  assert.match(client, /sidebarRightTabs\.register/);
  assert.match(client, /sidebarRight\.openTabIn/);
  assert.match(client, /tool\.call\.toolview/);
  assert.match(client, /key: "browser"/);
  assert.match(client, /Only the live call opens the pane/);
  assert.match(client, /\/api\/dsh-browser\/stream/);
  assert.match(client, /createImageBitmap/);
  assert.match(client, /dsh-browser-overlay/);
  assert.match(client, /action: "_hover"/);
  assert.doesNotMatch(client, /createElement\("iframe"|window\.open\(/);
});

test('Host browser automation is headless by default', async () => {
  const browsers = new BrowserSessions({});
  assert.equal(browsers.config.headless ?? true, true);
  await browsers.dispose();
});

test('navigation admits credential-free HTTP(S) only', () => {
  assert.equal(httpUrl('http://127.0.0.1:3080'), 'http://127.0.0.1:3080/');
  for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'https://user:pass@example.com', 'data:text/html,test']) assert.throws(() => httpUrl(url));
  assert.equal(redact('token=abcdefghi'), 'token=[redacted]');
});

test('viewport bounds and forwarded keys stay inside the Host contract', () => {
  assert.deepEqual(viewportBounds(420, 600), {width: 420, height: 600});
  assert.throws(() => viewportBounds(100000, 600), /BROWSER_INVALID_VIEWPORT/);
  assert.throws(() => viewportBounds(120, 600), /BROWSER_INVALID_VIEWPORT/);
  assert.equal(browserKey('ControlOrMeta+A'), 'Ctrl+A');
  assert.equal(browserKey('Shift+Tab'), 'Shift+Tab');
  assert.equal(browserKey('PageDown'), 'PageDown');
  assert.equal(browserKey('Meta+Q'), undefined);
  assert.equal(browserKey('ControlOrMeta+Shift+Z'), undefined);
  assert.equal(playwrightKey('Ctrl+A'), 'ControlOrMeta+A');
  assert.equal(playwrightKey('Ctrl+Shift+Z'), 'ControlOrMeta+Shift+Z');
  assert.equal(playwrightKey('Shift+Tab'), 'Shift+Tab');
});

test('stream events are newline-delimited JSON', () => {
  assert.equal(new TextDecoder().decode(encodeEvent({t: 'frame', seq: 3})), '{"t":"frame","seq":3}\n');
});

test('an idle Sidebar stream reports no active page and releases on cancel', async () => {
  const browsers = new BrowserSessions({executablePath: '/nonexistent/dsh-browser/chrome'});
  const controller = new AbortController();
  const stream = eventStream(browsers, 'idle-session', undefined, new Request('http://127.0.0.1/api/dsh-browser/stream', {signal: controller.signal}));
  const reader = stream.getReader();
  const first = await reader.read();
  assert.deepEqual(JSON.parse(new TextDecoder().decode(first.value)), {t: 'hello', active: false, viewport: null});
  await reader.cancel();
  controller.abort();
  await browsers.dispose();
});

test('redaction preserves structured values and long strings', () => {
  assert.deepEqual(redactValue([{href: 'https://example.com/?token=abc', text: 'a'.repeat(100000)}, {width: 1280}]), [{href: 'https://example.com/?token=[redacted]', text: 'a'.repeat(24000)}, {width: 1280}]);
});

test('missing runtime reports an actionable error and permits launch retry', async () => {
  const browsers = new BrowserSessions({executablePath: '/nonexistent/dsh-browser/chrome'});
  try {
    await assert.rejects(browsers.run('retry', {action: 'navigate', url: 'http://127.0.0.1'}, new AbortController().signal), /BROWSER_RUNTIME_MISSING/);
    assert.equal(browsers.sessions.size, 0);
    assert.equal(browsers.launch, undefined);
    await assert.rejects(browsers.browser(), /BROWSER_RUNTIME_MISSING/);
  } finally { await browsers.dispose(); }
});

test('Sidebar API reports missing runtime and retains a usable inactive session', async () => {
  const routes = new Map();
  let dispose;
  apply({
    effect: setup => { dispose = setup(); },
    on() {},
    tools: {register() {}},
    inject: (_services, setup) => setup({
      connection: {fetch: {register: route => { routes.set(route.path, route.fetch); }}},
      sessions: {get: id => id === 'sidebar-test' ? {id} : undefined},
      get: () => undefined,
    }),
  }, {executablePath: '/nonexistent/dsh-browser/chrome'});
  const endpoint = routes.get('/api/dsh-browser');
  const stream = routes.get('/api/dsh-browser/stream');
  const url = 'http://127.0.0.1/api/dsh-browser?sessionId=sidebar-test';
  try {
    const failed = await endpoint(new Request(url, {method: 'POST', body: JSON.stringify({action: 'navigate', url: 'http://127.0.0.1'})}));
    assert.equal(failed.status, 400);
    assert.deepEqual(await failed.json(), {error: 'BROWSER_RUNTIME_MISSING'});
    const view = await endpoint(new Request(url));
    assert.equal(view.status, 200);
    assert.deepEqual(await view.json(), {active: false});
    const unknown = await stream(new Request('http://127.0.0.1/api/dsh-browser/stream?sessionId=elsewhere'));
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), {error: 'BROWSER_SESSION_REQUIRED'});
    const oversized = await stream(new Request('http://127.0.0.1/api/dsh-browser/stream?sessionId=sidebar-test&width=99999&height=600'));
    assert.equal(oversized.status, 400);
    assert.deepEqual(await oversized.json(), {error: 'BROWSER_INVALID_VIEWPORT'});
  } finally { await dispose(); }
});

const configuredBrowser = process.env.BROWSER_TEST_EXECUTABLE;
const managedBrowser = chromium.executablePath();
const chromiumUnavailable = !configuredBrowser && !existsSync(managedBrowser);

test('real Chromium navigates, fills, clicks, streams, isolates and closes', {skip: chromiumUnavailable ? `Chromium executable is unavailable at ${managedBrowser}; set BROWSER_TEST_EXECUTABLE to run this integration test` : false}, async () => {
  const server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><title>Browser fixture</title><h1>Browser fixture</h1><label>Message<input aria-label="Message"></label><button onclick='document.querySelector("output").textContent=document.querySelector("input").value;console.log("updated")'>Apply</button><output></output>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browsers = new BrowserSessions({headless: true, ...(configuredBrowser ? {executablePath: configuredBrowser} : {})});
  const signal = new AbortController().signal;
  const run = args => browsers.run('test-session', args, signal);
  const controller = new AbortController();
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
    const view = await run({action: '_view'});
    assert.equal(view.url, third.url);
    assert.equal(view.mediaType, 'image/jpeg');
    const jpeg = Buffer.from(view.image, 'base64');
    assert.equal(jpeg[0], 0xff);
    assert.equal(jpeg[1], 0xd8);
    assert(jpeg.length > 2000);
    await run({action: '_input', kind: 'key', key: 'Tab', observation: view.observation});
    await assert.rejects(run({action: 'click', role: 'button', name: 'Apply', observation: third.observation}), /STALE/);
    const narrow = await run({action: '_view', width: 420, height: 600});
    assert.equal(narrow.mediaType, 'image/jpeg');
    assert.equal(narrow.width, 420);
    assert.equal(narrow.height, 600);
    assert.deepEqual((await run({action: 'evaluate', expression: 'layout'})).result.width, 420);
    const live = await browsers.session('test-session');
    const box = await live.page.getByRole('textbox', {name: 'Message'}).boundingBox();
    const point = {action: '_input', kind: 'click', width: 420, height: 600, x: box.x + box.width / 2, y: box.y + box.height / 2};
    await run({...point, observation: narrow.observation});
    const manual = args => run({action: '_input', ...args, observation: live.observation});
    await manual({kind: 'key', key: 'ControlOrMeta+A'});
    await manual({kind: 'text', text: 'Sidebar \u4e2d\u6587'});
    await manual({kind: 'key', key: 'Tab'});
    await manual({kind: 'key', key: 'Enter'});
    assert.equal(await live.page.locator('output').textContent(), 'Sidebar \u4e2d\u6587');
    await assert.rejects(manual({kind: 'key', key: 'Meta+Q'}), /BROWSER_INVALID_KEY/);
    await run({action: '_view', width: 700, height: 500});
    await assert.rejects(run({...point, observation: live.observation}), /STALE/);
    await assert.rejects(run({action: '_view', width: 100000, height: 600}), /INVALID_VIEWPORT/);
    await live.page.locator('body').evaluate(body => { body.style.height = '2400px'; });
    await manual({kind: 'scroll', deltaY: 500});
    await live.page.waitForFunction(() => scrollY > 0);

    // The Sidebar channel carries live JPEG frames plus the Agent's pointer,
    // focus and typing cues, so the pane can annotate what is being browsed.
    const reader = await browsers.subscribe(live, {width: 640, height: 480}, controller.signal);
    const frame = await nextEvent(reader, event => event.t === 'frame');
    assert.equal(frame.mediaType, 'image/jpeg');
    assert(frame.data.length > 1000);
    assert.deepEqual(frame.viewport, {width: 640, height: 480});
    await live.page.evaluate(() => scrollTo(0, 0));
    const inputBox = await live.page.getByRole('textbox', {name: 'Message'}).boundingBox();
    const clickAt = {kind: 'click', width: 640, height: 480, x: inputBox.x + 6, y: inputBox.y + 6};
    const seen = [];
    const collect = (async () => {
      for (let index = 0; index < 30; index++) {
        const event = await nextEvent(reader, () => true);
        seen.push(event);
        if (seen.some(item => item.t === 'pointer' && item.kind === 'click') && seen.some(item => item.t === 'focus' && item.focus)) return;
      }
    })();
    await manual(clickAt);
    await collect;
    const pointer = seen.find(item => item.t === 'pointer' && item.kind === 'click');
    const focus = seen.find(item => item.t === 'focus' && item.focus);
    assert(Math.abs(pointer.x - clickAt.x) < 1 && Math.abs(pointer.y - clickAt.y) < 1);
    assert.equal(pointer.source, 'human');
    assert.equal(focus.focus.editable, true);
    assert(focus.focus.box.width > 0);
    const hover = await run({action: '_hover', x: inputBox.x + 6, y: inputBox.y + 6});
    assert.equal(hover.hover.editable, true);
    assert.equal(hover.hover.cursor, 'text');
    const dragged = await Promise.all([
      nextEvent(reader, event => event.t === 'pointer' && event.kind === 'drag'),
      manual({kind: 'drag', from: {x: inputBox.x + 6, y: inputBox.y + 6}, to: {x: inputBox.x + 60, y: inputBox.y + 6}}),
    ]);
    assert.equal(dragged[0].label, 'drag');
    await assert.rejects(run({action: '_hover', x: 9999, y: 6}), /BROWSER_INVALID_POINT/);
    await reader.release();

    const other = await browsers.session('other-session');
    assert.equal(other.page.url(), 'about:blank');
    await run({action: 'close'});
    assert.equal(browsers.sessions.has('test-session'), false);
  } finally { controller.abort(); await browsers.dispose(); await new Promise(resolve => server.close(resolve)); }
});
