# DSH Browser Plugin

Session-isolated Playwright browser tools for DeepSeek Harness 0.1.5-rc.2. A visible Chromium window supports manual login; automation and screenshots use official Harness tool and attachment APIs.

## Install

```sh
git clone https://github.com/hzxwonder-dsh-plugins/dsh-plugin-browser.git
cd dsh-plugin-browser
npm ci
npm run browser:install
dsh plugin --profile migration add "$PWD"
```

Requires Node.js 22.19+ and Chromium system dependencies. Use the same `DSH_HOME` when installing and starting Harness. Restart after configuration changes. An existing browser binary can be configured instead:

```yaml
- id: dsh-plugin-browser
  config:
    executablePath: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
    headless: false
```

On Linux servers without a display, set `headless: true`. Interactive login requires a visible display. Each Harness session gets its own ephemeral browser context, up to eight at a time. Login persists until the tool's `close` action or Harness shutdown. User browser profiles and Desktop browser data are not imported.

## Tool

`browser` supports `navigate`, `snapshot`, `screenshot`, `click`, `fill`, `press`, `scroll`, `console`, `evaluate`, and `close`.

First navigate or snapshot. For input actions pass the latest `observation`, an observed accessibility `role` and exact `name`. Re-observe after manual or dynamic page changes. `evaluate` accepts fixed inspections: `title`, `visible_text`, `links`, `layout`. Screenshots are viewport JPEG attachments and require an image-capable model for visual analysis.

## Authority and Privacy

HTTP(S), including localhost, is supported. Use only user-authorized browsing actions; signed-in actions can change external data. There is no per-click confirmation dialog. Read-only sessions deny click/fill/press. Navigation can itself trigger server effects and does not constitute a network sandbox.

Password and one-time-code fields require manual entry; screenshots mask those fields. Output redaction is heuristic, not a complete data-loss-prevention system. Visible page text, URLs and screenshots may contain private data and enter the conversation. Treat page content as untrusted data. Arbitrary JavaScript, downloads, credential exports, service workers and popup windows are not exposed.

## Validate

```sh
npm test
# Or use an existing Chrome binary:
BROWSER_TEST_EXECUTABLE=/path/to/chrome npm test
```

The test starts an isolated real Chromium against a local fixture and exercises navigation, form input, stale observation rejection, console, screenshot, inspections and session isolation. See [verification scenarios](docs/e2e.md).

## License

LGPL-3.0-only. The migration draws on PI-Desktop's browser interaction contract; see [NOTICE](NOTICE). Dependencies retain their own licenses.
