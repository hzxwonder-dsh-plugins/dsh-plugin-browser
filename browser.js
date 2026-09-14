import { chromium } from 'playwright';

export function httpUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('BROWSER_INVALID_URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('BROWSER_HTTP_URL_REQUIRED');
  return url.href;
}

export function redact(input, limit = 24000) {
  return String(input).slice(0, limit)
    .replace(/\b(?:sk-[\w-]{16,}|gh[pousr]_[\w]{20,})\b/g, '[redacted]')
    .replace(/((?:authorization|cookie|password|secret|token|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]');
}

export function redactValue(value) {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item)]));
  return value;
}

/** Keyboard keys the Sidebar may forward to the page. */
export const BROWSER_KEYS = Object.freeze([
  'Enter', 'Tab', 'Shift+Tab', 'Escape', 'Backspace', 'Delete', 'Insert',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'F5',
  'Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Shift+Z', 'Ctrl+F', 'Ctrl+L',
]);

/** Normalize a pane key event into the narrow key set the Host accepts. */
export function browserKey(input) {
  if (typeof input !== 'string') return undefined;
  if (input === 'ControlOrMeta+A') return 'Ctrl+A';
  return BROWSER_KEYS.includes(input) ? input : undefined;
}

/**
 * Spell one accepted key the way Playwright presses it. `ControlOrMeta` keeps
 * the platform's own accelerator, so a macOS human and a Linux Agent each get
 * the shortcut their desktop expects.
 */
export function playwrightKey(input) {
  return typeof input === 'string' && input.startsWith('Ctrl+') ? `ControlOrMeta+${input.slice(5)}` : input;
}

/** Bound the pane's requested viewport, matching the Host's own limits. */
export function viewportBounds(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 240 || width > 1920 || height < 200 || height > 1600) throw new Error('BROWSER_INVALID_VIEWPORT');
  return {width, height};
}

const SCREENCAST_QUALITY = 62;

/**
 * One subscriber's bounded event queue. Frames are latest-wins, so a slow
 * reader drops stale pictures instead of falling behind the page.
 */
class Subscriber {
  constructor() {
    this.items = [];
    this.waiters = [];
    this.closed = false;
  }

  push(event) {
    if (this.closed) return;
    if (event.t === 'frame') {
      const index = this.items.findIndex(item => item.t === 'frame');
      if (index === -1) this.items.push(event);
      else this.items[index] = event;
    } else {
      this.items.push(event);
    }
    this.wake();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.wake();
  }

  wake() {
    const waiters = this.waiters;
    this.waiters = [];
    for (const resolve of waiters) resolve();
  }

  async next() {
    while (this.items.length === 0 && !this.closed) await new Promise(resolve => { this.waiters.push(resolve); });
    return this.items.shift();
  }
}

export class BrowserSessions {
  constructor(config = {}) {
    this.config = config;
    this.sessions = new Map();
    this.queues = new Map();
    this.closed = false;
  }

  async browser() {
    if (this.closed) throw new Error('BROWSER_DISPOSED');
    this.launch ??= chromium.launch({
      // The visible browser surface is provided by the Web right Sidebar. Keep
      // the Host automation process headless unless a deployment opts in to a
      // native display explicitly.
      headless: this.config.headless ?? true,
      ...(this.config.executablePath ? {executablePath: this.config.executablePath} : {}),
      env: Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && !/KEY|PASSWORD|SECRET|TOKEN|^DSH_/i.test(key))),
    }).catch(error => {
      this.launch = undefined;
      if (/executable doesn't exist/i.test(error.message)) {
        throw new Error('BROWSER_RUNTIME_MISSING: install Chromium with npm run browser:install or configure executablePath', {cause: error});
      }
      throw error;
    });
    return this.launch;
  }

  async session(id) {
    if (!id) throw new Error('BROWSER_SESSION_REQUIRED');
    if (this.sessions.has(id)) return this.sessions.get(id);
    if (this.sessions.size >= 8) throw new Error('BROWSER_SESSION_LIMIT: close an unused session browser');
    const pending = (async () => {
      const context = await (await this.browser()).newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 2, acceptDownloads: false, serviceWorkers: 'block'});
      await context.route('**/*', route => {
        try { httpUrl(route.request().url()); return route.continue(); } catch { return route.abort(); }
      });
      const page = await context.newPage();
      const messages = [];
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(30000);
      page.on('console', message => {
        messages.push({level: message.type(), text: redact(message.text(), 2000)});
        if (messages.length > 100) messages.shift();
      });
      page.on('pageerror', error => {
        messages.push({level: 'error', text: redact(error.message, 2000)});
        if (messages.length > 100) messages.shift();
      });
      page.on('dialog', dialog => { void dialog.dismiss().catch(() => {}); });
      context.on('page', popup => { if (popup !== page) void popup.close().catch(() => {}); });
      const session = {
        context, page, messages, observation: 0,
        subscribers: new Set(), screencast: false, pattern: 0,
        pointer: undefined, viewport: page.viewportSize(),
      };
      // One CDP session per page drives the Sidebar's live picture: event-driven
      // JPEG frames instead of repeated full PNG screenshots.
      session.cdp = await context.newCDPSession(page);
      session.cdp.on('Page.screencastFrame', frame => {
        void session.cdp.send('Page.screencastFrameAck', {sessionId: frame.sessionId}).catch(() => {});
        if (!session.screencast) return;
        session.pattern += 1;
        this.emit(session, {t: 'frame', seq: session.pattern, data: frame.data, mediaType: 'image/jpeg', viewport: {...session.viewport}});
      });
      page.on('framenavigated', frame => {
        if (frame !== page.mainFrame()) return;
        session.observation += 1;
        this.emit(session, {t: 'state', url: page.url(), observation: session.observation});
      });
      return session;
    })();
    this.sessions.set(id, pending);
    try { return await pending; } catch (error) { this.sessions.delete(id); throw error; }
  }

  /** Push one event to every Sidebar subscriber of this session. */
  emit(session, event) {
    for (const subscriber of session.subscribers) subscriber.push(event);
  }

  /**
   * Attach one Sidebar reader to an existing session browser. The screencast
   * starts with the first reader and stops with the last, so an unwatched
   * browser costs nothing.
   */
  async subscribe(session, size, signal) {
    if (size) await this.viewport(session, size);
    const subscriber = new Subscriber();
    const browsers = this;
    session.subscribers.add(subscriber);
    signal.addEventListener('abort', () => { subscriber.close(); }, {once: true});
    await this.screencast(session, true);
    return {
      next: () => subscriber.next(),
      async release() {
        subscriber.close();
        session.subscribers.delete(subscriber);
        await browsers.screencast(session, session.subscribers.size > 0);
      },
    };
  }

  async screencast(session, on) {
    if (on === session.screencast) return;
    session.screencast = on;
    try {
      if (on) {
        const {width, height} = session.viewport;
        await session.cdp.send('Page.startScreencast', {
          format: 'jpeg',
          quality: SCREENCAST_QUALITY,
          everyNthFrame: 1,
          maxWidth: Math.min(1920, Math.round(width * 1.5)),
          maxHeight: Math.min(1600, Math.round(height * 1.5)),
        });
      } else await session.cdp.send('Page.stopScreencast');
    } catch {
      // A page that is navigating away can reject either command; the next
      // subscriber or action restarts the stream.
      session.screencast = false;
    }
  }

  async viewport(session, size) {
    const next = viewportBounds(size.width, size.height);
    const current = session.viewport;
    if (current.width === next.width && current.height === next.height) return current;
    const wasStreaming = session.screencast;
    if (wasStreaming) await this.screencast(session, false);
    await session.page.setViewportSize(next);
    session.viewport = next;
    session.observation++;
    this.emit(session, {t: 'state', url: session.page.url(), observation: session.observation});
    if (wasStreaming) await this.screencast(session, true);
    return next;
  }

  /** Report the element under one viewport point for the Sidebar's hover cue. */
  async hover(session, args) {
    const {width, height} = session.viewport;
    if (!Number.isFinite(args.x) || !Number.isFinite(args.y) || args.x < 0 || args.x >= width || args.y < 0 || args.y >= height) throw new Error('BROWSER_INVALID_POINT');
    return session.page.evaluate(point => {
      const element = document.elementFromPoint(point.x, point.y);
      if (element === null) return {cursor: 'default'};
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = (element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('title') || element.innerText || '').trim().replace(/\s+/g, ' ');
      return {
        cursor: style.cursor || 'default',
        role: element.getAttribute('role') || element.tagName.toLowerCase(),
        name: text.slice(0, 120),
        editable: element.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'),
        box: {x: rect.x, y: rect.y, width: rect.width, height: rect.height},
      };
    }, {x: args.x, y: args.y});
  }

  /** Report the focused element so the Sidebar can show where typing lands. */
  async focused(session) {
    return session.page.evaluate(() => {
      const element = document.activeElement;
      if (element === null || element === document.body) return null;
      const rect = element.getBoundingClientRect();
      const text = (element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name') || element.innerText || '').trim().replace(/\s+/g, ' ');
      return {
        role: element.getAttribute('role') || element.tagName.toLowerCase(),
        name: text.slice(0, 120),
        editable: element.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'),
        box: {x: rect.x, y: rect.y, width: rect.width, height: rect.height},
      };
    });
  }

  /** Record the last pointer position and tell the Sidebar to draw its arrow. */
  point(session, x, y, kind, label, source = 'agent') {
    if (Number.isFinite(x) && Number.isFinite(y)) session.pointer = {x, y};
    this.emit(session, {t: 'pointer', kind, source, label: redact(String(label ?? '')), x: session.pointer?.x, y: session.pointer?.y, ts: Date.now()});
  }

  async run(id, args, signal) {
    if (!id) throw new Error('BROWSER_SESSION_REQUIRED');
    const previous = this.queues.get(id) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      signal.throwIfAborted();
      if (args.action === 'close') { await this.close(id); return {closed: true}; }
      const session = await this.session(id);
      let closing;
      const abort = () => { if (args.action !== '_view') closing = this.close(id); };
      signal.addEventListener('abort', abort, {once: true});
      try {
        signal.throwIfAborted();
        return await this.operate(session, args);
      } finally {
        signal.removeEventListener('abort', abort);
        if (closing) await closing;
        signal.throwIfAborted();
      }
    });
    this.queues.set(id, current);
    try { return await current; } finally { if (this.queues.get(id) === current) this.queues.delete(id); }
  }

  async snapshot(session) {
    session.observation++;
    return {url: redact(session.page.url()), title: redact(await session.page.title(), 500), observation: session.observation, snapshot: redact(await session.page.locator('body').ariaSnapshot({timeout: 10000}))};
  }

  async operate(session, args) {
    const {page} = session;
    if (args.action === '_view') {
      // A plain picture poll never consumes an observation: only a real
      // viewport change does, so polling cannot invalidate the Agent's counter.
      if (args.width !== undefined || args.height !== undefined) await this.viewport(session, {width: args.width, height: args.height});
      const data = await page.screenshot({type: 'jpeg', quality: 62, timeout: 5000});
      session.pattern += 1;
      return {active: true, image: data.toString('base64'), mediaType: 'image/jpeg', url: page.url(), title: await page.title(), ...session.viewport, observation: session.observation, seq: session.pattern};
    }
    if (args.action === '_hover') {
      // A pure read: hovering never consumes an observation, so an Agent's next
      // tool call keeps matching the counter it observed.
      return {hover: await this.hover(session, args)};
    }
    if (args.action === '_input') {
      if (args.observation !== session.observation) throw new Error('BROWSER_STALE_OBSERVATION');
      session.observation++;
      if (args.kind === 'click') {
        const {width, height} = session.viewport;
        if (args.width !== width || args.height !== height) throw new Error('BROWSER_STALE_OBSERVATION');
        if (!Number.isFinite(args.x) || !Number.isFinite(args.y) || args.x < 0 || args.x >= width || args.y < 0 || args.y >= height) throw new Error('BROWSER_INVALID_POINT');
        if (![1, 2, 3].includes(args.clickCount ?? 1)) throw new Error('BROWSER_INVALID_INPUT');
        await page.mouse.click(args.x, args.y, {clickCount: args.clickCount ?? 1});
        this.point(session, args.x, args.y, 'click', args.clickCount > 1 ? `${args.clickCount}× click` : 'click', 'human');
      } else if (args.kind === 'drag') {
        const {width, height} = session.viewport;
        const inside = point => Number.isFinite(point?.x) && Number.isFinite(point?.y) && point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;
        if (!inside(args.from) || !inside(args.to)) throw new Error('BROWSER_INVALID_POINT');
        await page.mouse.move(args.from.x, args.from.y);
        await page.mouse.down();
        await page.mouse.move(args.to.x, args.to.y, {steps: 12});
        await page.mouse.up();
        this.point(session, args.to.x, args.to.y, 'drag', 'drag', 'human');
      } else if (args.kind === 'text') {
        if (typeof args.text !== 'string' || args.text.length > 10000) throw new Error('BROWSER_INVALID_TEXT');
        await page.keyboard.insertText(args.text);
        this.emit(session, {t: 'typing', text: redact(args.text, 240)});
      } else if (args.kind === 'key') {
        const key = browserKey(args.key);
        if (key === undefined) throw new Error('BROWSER_INVALID_KEY');
        await page.keyboard.press(playwrightKey(key));
      } else if (args.kind === 'scroll') {
        if (!Number.isFinite(args.deltaY) || Math.abs(args.deltaY) > 1600) throw new Error('BROWSER_INVALID_SCROLL');
        if (Number.isFinite(args.x) && Number.isFinite(args.y)) session.pointer = {x: args.x, y: args.y};
        await page.mouse.wheel(0, args.deltaY);
      } else throw new Error('BROWSER_INVALID_INPUT');
      this.emit(session, {t: 'focus', focus: await this.focused(session).catch(() => null), observation: session.observation});
      return {observation: session.observation};
    }
    if (['_back', '_forward', '_reload'].includes(args.action)) {
      session.observation++;
      if (args.action === '_back') await page.goBack({waitUntil: 'domcontentloaded'});
      if (args.action === '_forward') await page.goForward({waitUntil: 'domcontentloaded'});
      if (args.action === '_reload') await page.reload({waitUntil: 'domcontentloaded'});
      this.emit(session, {t: 'state', url: page.url(), observation: session.observation});
      return {observation: session.observation};
    }
    if (args.action === 'navigate') {
      await page.goto(httpUrl(args.url), {waitUntil: 'domcontentloaded'});
      await this.afterAction(session, {action: 'navigate', url: page.url()});
      return this.snapshot(session);
    }
    if (args.action === 'snapshot') return this.snapshot(session);
    if (args.action === 'console') return {messages: session.messages.slice(-Math.min(100, Math.max(1, args.limit ?? 30)))};
    if (args.action === 'screenshot') {
      const data = await page.screenshot({type: 'jpeg', quality: 70, fullPage: false, mask: [page.locator('input[type="password"],input[autocomplete="one-time-code"]')]});
      if (data.length > 4 * 1024 * 1024) throw new Error('BROWSER_SCREENSHOT_TOO_LARGE');
      return {data, url: redact(page.url()), mediaType: 'image/jpeg'};
    }
    if (args.action === 'evaluate') {
      const expressions = {
        title: () => document.title,
        visible_text: () => (document.body?.innerText ?? '').slice(0, 24000),
        links: () => Array.from(document.querySelectorAll('a[href]')).filter(a => a.getClientRects().length).slice(0, 100).map(a => ({text: a.innerText.slice(0, 200), href: a.href})),
        layout: () => ({width: innerWidth, height: innerHeight, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight}),
      };
      if (!Object.hasOwn(expressions, args.expression)) throw new Error('BROWSER_INSPECTION_REQUIRED');
      return {result: redactValue(await page.evaluate(expressions[args.expression]))};
    }
    if (args.observation !== session.observation || session.observation === 0) throw new Error('BROWSER_STALE_OBSERVATION: snapshot before acting');
    session.observation++;
    if (args.action === 'scroll') {
      const delta = args.deltaY ?? 600;
      if (!Number.isInteger(delta) || Math.abs(delta) > 1600) throw new Error('BROWSER_INVALID_SCROLL');
      await page.mouse.wheel(0, delta);
      const centre = session.pointer ?? {x: session.viewport.width / 2, y: session.viewport.height / 2};
      this.point(session, centre.x, centre.y, 'scroll', `scroll ${delta > 0 ? '↓' : '↑'}`);
    } else if (args.action === 'click' && Number.isFinite(args.x) && Number.isFinite(args.y)) {
      // A visual target with no usable accessible name is clicked where the
      // Agent observed it, exactly as a human would.
      const {width, height} = session.viewport;
      if (args.x < 0 || args.y < 0 || args.x >= width || args.y >= height) throw new Error('BROWSER_INVALID_POINT');
      await page.mouse.click(args.x, args.y);
      this.point(session, args.x, args.y, 'click', `click (${Math.round(args.x)}, ${Math.round(args.y)})`);
    } else {
      if (!args.role || typeof args.name !== 'string') throw new Error('BROWSER_OBSERVED_ROLE_AND_NAME_REQUIRED');
      const locator = page.getByRole(args.role, {name: args.name, exact: true});
      const box = await locator.boundingBox().catch(() => null);
      const label = `${args.role} “${redact(args.name, 80)}”`;
      if (args.action === 'click') {
        await locator.click();
        this.point(session, box ? box.x + box.width / 2 : undefined, box ? box.y + box.height / 2 : undefined, 'click', label);
      } else if (args.action === 'fill') {
        if (await locator.getAttribute('type') === 'password' || /password|one-time-code/.test(await locator.getAttribute('autocomplete') ?? '')) throw new Error('BROWSER_MANUAL_LOGIN_REQUIRED');
        if (typeof args.text !== 'string' || args.text.length > 10000 || redact(args.text) !== args.text) throw new Error('BROWSER_INVALID_TEXT');
        await locator.fill(args.text);
        this.point(session, box ? box.x + box.width / 2 : undefined, box ? box.y + box.height / 2 : undefined, 'fill', label);
        this.emit(session, {t: 'typing', text: redact(args.text, 240)});
      } else if (args.action === 'press') {
        if (browserKey(args.key) === undefined) throw new Error('BROWSER_INVALID_KEY');
        await locator.press(playwrightKey(args.key));
        this.point(session, box ? box.x + box.width / 2 : undefined, box ? box.y + box.height / 2 : undefined, 'press', `${args.key} · ${label}`);
      } else throw new Error('BROWSER_INVALID_ACTION');
    }
    await this.afterAction(session, {action: args.action, label: args.name});
    return this.snapshot(session);
  }

  /** Publish the post-action URL and focus so the Sidebar follows the Agent. */
  async afterAction(session, detail) {
    this.emit(session, {t: 'state', url: session.page.url(), observation: session.observation, action: detail.action});
    this.emit(session, {t: 'focus', focus: await this.focused(session).catch(() => null), observation: session.observation});
  }

  async close(id) {
    const pending = this.sessions.get(id);
    if (!pending) return;
    this.sessions.delete(id);
    const session = await pending.catch(() => undefined);
    if (!session) return;
    for (const subscriber of session.subscribers) subscriber.close();
    session.subscribers.clear();
    session.screencast = false;
    await session.cdp?.detach().catch(() => {});
    await session.context.close();
  }

  async dispose() {
    this.closed = true;
    await Promise.allSettled([...this.sessions.keys()].map(id => this.close(id)));
    const browser = await this.launch?.catch(() => undefined);
    if (browser) await browser.close();
    await Promise.allSettled(this.queues.values());
  }
}

/** Encode one Host event as a newline-delimited JSON chunk. */
export function encodeEvent(event) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/**
 * Bridge one Sidebar pane into the byte stream the /api carrier sends out.
 * Frames overwrite their pending predecessor inside the queue, so a slow
 * reader shows the latest picture instead of a backlog. A pane that opens
 * before any page exists stays connected and starts streaming the moment a
 * browser session appears.
 */
export function eventStream(browsers, id, size, request) {
  let reader;
  let closed = false;
  // Cancelling the stream must also release the idle wait, so a closed pane
  // never keeps a timer (or a session browser) alive.
  const stop = new AbortController();
  const signal = typeof AbortSignal.any === 'function' ? AbortSignal.any([request.signal, stop.signal]) : request.signal;
  const wait = milliseconds => new Promise(resolve => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, {once: true});
  });
  return new ReadableStream({
    async start(controller) {
      const send = event => {
        if (closed) return;
        try { controller.enqueue(encodeEvent(event)); } catch { closed = true; }
      };
      send({t: 'hello', active: browsers.sessions.has(id), viewport: size ?? null});
      while (!closed && !browsers.sessions.has(id)) {
        // A quiet heartbeat holds the response open until a page is opened,
        // either by the Agent's tool call or from the pane's own address bar.
        await wait(5000);
        send({t: 'state', active: false});
      }
      if (closed) return;
      let session;
      try {
        session = await browsers.sessions.get(id);
        reader = await browsers.subscribe(session, size, request.signal);
      } catch (error) {
        send({t: 'error', code: /^BROWSER_[A-Z_]+/.exec(String(error.message))?.[0] ?? 'BROWSER_REQUEST_FAILED'});
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
        return;
      }
      send({t: 'hello', active: true, viewport: session.viewport, url: session.page.url()});
      while (!closed) {
        const event = await reader.next();
        if (event === undefined) break;
        send(event);
      }
      if (!closed) {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    async cancel() {
      closed = true;
      stop.abort();
      await reader?.release?.().catch(() => {});
    },
  });
}
