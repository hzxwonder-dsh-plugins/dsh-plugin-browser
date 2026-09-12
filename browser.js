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
      headless: this.config.headless ?? false,
      ...(this.config.executablePath ? {executablePath: this.config.executablePath} : {}),
      env: Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && !/KEY|PASSWORD|SECRET|TOKEN|^DSH_/i.test(key))),
    }).catch(error => { this.launch = undefined; throw error; });
    return this.launch;
  }

  async session(id) {
    if (!id) throw new Error('BROWSER_SESSION_REQUIRED');
    if (this.sessions.has(id)) return this.sessions.get(id);
    if (this.sessions.size >= 8) throw new Error('BROWSER_SESSION_LIMIT: close an unused session browser');
    const pending = (async () => {
      const context = await (await this.browser()).newContext({viewport: {width: 1280, height: 800}, acceptDownloads: false, serviceWorkers: 'block'});
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
      return {context, page, messages, observation: 0};
    })();
    this.sessions.set(id, pending);
    try { return await pending; } catch (error) { this.sessions.delete(id); throw error; }
  }

  async run(id, args, signal) {
    if (!id) throw new Error('BROWSER_SESSION_REQUIRED');
    const previous = this.queues.get(id) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      signal.throwIfAborted();
      if (args.action === 'close') { await this.close(id); return {closed: true}; }
      const session = await this.session(id);
      let closing;
      const abort = () => { closing = this.close(id); };
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
    if (args.action === 'navigate') {
      await page.goto(httpUrl(args.url), {waitUntil: 'domcontentloaded'});
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
    } else {
      if (!args.role || typeof args.name !== 'string') throw new Error('BROWSER_OBSERVED_ROLE_AND_NAME_REQUIRED');
      const locator = page.getByRole(args.role, {name: args.name, exact: true});
      if (args.action === 'click') await locator.click();
      else if (args.action === 'fill') {
        if (await locator.getAttribute('type') === 'password' || /password|one-time-code/.test(await locator.getAttribute('autocomplete') ?? '')) throw new Error('BROWSER_MANUAL_LOGIN_REQUIRED');
        if (typeof args.text !== 'string' || args.text.length > 10000 || redact(args.text) !== args.text) throw new Error('BROWSER_INVALID_TEXT');
        await locator.fill(args.text);
      } else if (args.action === 'press') {
        if (!['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp'].includes(args.key)) throw new Error('BROWSER_INVALID_KEY');
        await locator.press(args.key);
      } else throw new Error('BROWSER_INVALID_ACTION');
    }
    return this.snapshot(session);
  }

  async close(id) {
    const pending = this.sessions.get(id);
    if (!pending) return;
    this.sessions.delete(id);
    const session = await pending.catch(() => undefined);
    if (session) await session.context.close();
  }

  async dispose() {
    this.closed = true;
    await Promise.allSettled([...this.sessions.keys()].map(id => this.close(id)));
    const browser = await this.launch?.catch(() => undefined);
    if (browser) await browser.close();
    await Promise.allSettled(this.queues.values());
  }
}
