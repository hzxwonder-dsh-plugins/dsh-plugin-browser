# Desktop native transport: main-process guest view for the browser panel

The browser panel renders its Chromium pages as a picture today: the Host drives a
Playwright Chromium, streams JPEG frames over `/api/dsh-browser/stream`, and the
panel paints them on a canvas. On DSH Desktop the page can instead be a real
`WebContentsView` owned by the Electron main process, composited by the window
server: no encoding, no frame latency, text at native resolution, and human input
that reaches Chromium directly.

This document fixes the contract between the two halves of that change:

- the **shell half** lives in the desktop fork (`dsh-desktop`, developed in
  `dsh-plugin-desktop-beta/` first) and owns the view;
- the **plugin half** lives in `dsh-plugin-browser` and owns the browsing
  semantics: tabs, policy, history, the agent tool, and the two panel surfaces.

Neither half knows about the other's types: the shell exposes a Cordis service,
the plugin consumes it if it exists.

## Transport selection

The plugin keeps exactly one page backend per Session and picks it when the
Session's first tab is created:

- **native** — the `desktopNativeBrowser` Cordis service is available in the Host
  process AND the Session is not read-only;
- **screencast** — everything else (Web GUI, remote Host, older shell, `close`d
  plugin, read-only Sessions, any native failure).

The selected transport is reported to the client as `transport: 'native' |
'screencast'` in the panel state, so the client can stop asking for frames and
stop painting a canvas. A native failure at any point falls back to screencast
for that Session by tearing the native views down and reporting the reason in the
status line; the panel must never end up with two live pictures of one page.

## Shell half: the `desktopNativeBrowser` service

Provided by the desktop Host plugin (`dsh-plugin-desktop/src/index.ts`,
`ctx.provide?.('desktopNativeBrowser', service)`) and implemented in the Electron
main process. The Host plugin reaches main through the existing `DesktopRuntime`
bridge (`host-runtime-bridge.ts` / `electron-runtime.ts`), so the plugin side sees
plain async functions.

```ts
interface DesktopNativeBrowser {
  readonly version: 1
  /** Create (or replace) one guest view. `owner` groups views for teardown. */
  createView(options: {
    id: string
    owner: string
    url?: string
    /** Top-level navigation allowlist; omitted or empty means "any http(s)". */
    allowOrigins?: string[]
  }): Promise<{ id: string }>
  /** CSS-pixel rectangle measured by the renderer, relative to the renderer viewport. */
  setBounds(id: string, bounds: { x: number; y: number; width: number; height: number }): Promise<void>
  /** Page zoom as a factor of 1; the CSS viewport becomes bounds/zoom. */
  setZoom(id: string, factor: number): Promise<void>
  setVisible(id: string, visible: boolean): Promise<void>
  focus(id: string): Promise<void>
  navigate(id: string, url: string): Promise<void>
  close(id: string): Promise<void>
  closeOwner(owner: string): Promise<void>
  /** One CDP command against this view's webContents, allowlisted. */
  command(id: string, method: string, params?: unknown): Promise<unknown>
  /** Events for every view; returns an unsubscribe function. */
  subscribe(listener: (event: DesktopNativeBrowserEvent) => void): () => void
}

type DesktopNativeBrowserEvent =
  | { type: 'navigated'; id: string; url: string }
  | { type: 'title'; id: string; title: string }
  | { type: 'loading'; id: string; loading: boolean }
  | { type: 'window-open'; id: string; url: string }
  | { type: 'closed'; id: string; reason: 'closed' | 'crashed' }
  | { type: 'failed'; id: string; url: string; error: string }
  | { type: 'cdp'; id: string; method: string; params: unknown }
```

### Invariants the shell must hold

1. **Ownership.** One view per `id`, parented to the main window's `contentView`,
   created hidden. `close`/`closeOwner` release the webContents
   (`webContents.close()`), detach the debugger, and drop the entry.
2. **Independent session.** Each view uses its own Electron session partition
   (`persist:dsh-desktop-browser-<hash(owner)>`) with `sandbox: true`,
   `contextIsolation: true`, `nodeIntegration: false`, `webviewTag: false`, no
   preload. It must never share the renderer's partition, and the renderer's
   navigation lockdown (origin allowlist on the Harness UI webContents) must not
   apply to it.
3. **Strict session policy.** Permission requests are denied, downloads are
   cancelled, and the debugger is only used through the allowlisted `command`.
4. **Renderer coordinates.** `setBounds` receives CSS pixels relative to the
   renderer's viewport. Main converts them into window-content coordinates by
   adding the renderer's own origin (0,0 in advanced mode; the content view's
   offset when the shell paints its own title bar), then clamps.
5. **Clamping.** The rectangle is clamped to the window content area (and to the
   renderer's area), rounded to integers, and a rectangle smaller than 1×1 hides
   the view. A view is never placed outside the window, never over the caption
   row, and never at negative coordinates. This is a pure function with unit
   tests.
6. **Hide rules.** The view is visible only when all of these hold: the plugin's
   last `setVisible(true)`, the window is shown and not minimized, and the last
   clamped rectangle is at least 1×1. The shell hides on `hide`, `minimize` and
   `close`, and restores on `show`/`restore` without the plugin having to act.
7. **Z-order.** The guest view always floats above the renderer's HTML. Attaching
   re-appends it last so it is never covered by another child view.
8. **CDP.** `debugger.attach('1.3')` happens on first `command` for a view;
   methods outside the allowlist reject with a stable code
   (`BROWSER_VIEW_CDP_DENIED`); unknown ids reject with
   (`BROWSER_VIEW_UNKNOWN`). Debugger messages are forwarded as `{type:'cdp'}`
   events so the plugin can observe `Runtime.consoleAPICalled`,
   `Page.frameNavigated`, `Page.loadEventFired` and friends.
9. **Failure surface.** A crashed renderer emits `{type:'closed', reason:'crashed'}`
   and releases the view; the plugin decides whether to reopen.

CDP allowlist (domains, not individual methods, plus an explicit deny of anything
that can escape the guest): `Accessibility`, `DOM`, `Emulation.setDeviceMetricsOverride`
off, `Input`, `Network.enable`/`Network.getCookies`/`Network.setCookie`/`Network.clearBrowserCookies`,
`Page`, `Runtime`, `Target` is **denied**, `Browser` is **denied**, and
`Page.navigate` with a non-http(s) URL is rejected. The allowlist mirrors
`BROWSER_CDP_ALLOWLIST` in PI-Desktop.

### Zoom model

The panel's "desktop layout" affordance asks for a logical viewport wider than the
placeholder (1280px by default). A native view cannot be scaled, but browser zoom
gives the same result: `zoom = placeholderWidth / logicalWidth`, so the CSS
viewport really is `logicalWidth` wide and the page renders at
`placeholderWidth × devicePixelRatio` device pixels. `setZoom` is
`webContents.setZoomFactor(factor)` with a `setZoomLevel(Math.log2(factor))`
fallback. Fit-to-panel mode is `zoom = 1`.

## Plugin half: transport switch in `dsh-plugin-browser`

- `native.js` (Host) implements the page backend on top of the service. It keeps
  the plugin's existing semantics: per-Session ownership, `TAB_LIMIT` tabs,
  `VISITED_LIMIT` history, per-Session cookies, `allowedOrigins` policy, redacted
  text, masked screenshots.
- `browser.js` keeps its Playwright path untouched and gains a backend seam.
  Chrome DevTools Protocol replaces the Playwright calls the backend used:
  `Page.navigate` / `Page.reload` / `Page.getNavigationHistory` for navigation,
  `Runtime.evaluate` for evaluation, `Accessibility.getFullAXTree` rendered to the
  same YAML-ish accessibility snapshot, `Page.captureScreenshot` for pictures,
  `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` for input,
  `Runtime.consoleAPICalled` for the console cache.
- Password masking survives: before `Page.captureScreenshot` the backend injects
  opaque rectangles over `input[type=password], input[autocomplete=one-time-code]`
  and removes them afterwards.
- The client (`client.js`) with `transport: 'native'`:
  - measures the same placeholder rectangle it used for the canvas (stage rect,
    unchanged layout) and posts it to the Host with a coalescing
    `ResizeObserver` + `requestAnimationFrame` loop;
  - posts `visible: false` whenever the surface or the tab is not shown, and
    whenever a toolbar menu, dropdown or dialog covers the placeholder;
  - stops the frame stream subscription and paints an empty placeholder instead
    of a canvas;
  - stops forwarding pointer input (the native view receives real input), while
    keeping the observation bookkeeping for the agent's own actions;
  - keeps every existing DOM contract so the panel tests still pass, while
    marking the native mode with `data-dsh-browser-transport="native"`.
- The Host forwards client geometry to the service and never trusts it: the shell
  clamps, and `setBounds` for an unknown or closed view is a no-op.

## Acceptance

1. Desktop app, native transport: the panel shows a live page; text is rendered by
   the compositor (a screenshot of the window matches the page 1:1, no JPEG
   artefacts), and dragging a text selection inside the page works.
2. Agent tool on the same tab: `navigate`, `snapshot`, `screenshot`, `click`,
   `type`, `scroll`, `tabs` all work; the picture the user sees changes as the
   agent acts.
3. Human input in the panel changes the same page the agent reads back.
4. Hiding: switching tabs, collapsing the right column, opening the history
   dropdown, minimizing the window and resizing the window never leave the guest
   view floating over unrelated UI; restoring brings it back at the right place.
5. Fallback: with the service absent (Web GUI) or after a native failure the panel
   is exactly the screencast panel it is today.
6. Shell unit tests cover clamping, visibility composition, the CDP allowlist and
   view lifecycle; the plugin tests cover the native backend against a fake
   service; `corepack yarn check:desktop-variants` stays green.

## Client half: geometry, zoom and visibility reporting

The pane learns the transport from the panel state and never guesses it. It reads
the state once as it mounts — before it subscribes to anything, so a native
Session never opens a frame stream — and takes `transport` from every payload it
sees afterwards: a state read, an action answer, or a stream event. A Host that
never names the field keeps exactly the streaming pane it is today; a Session
that has no page yet is asked again on a slow beat, which costs the Host nothing
because it answers `{active:false}` without a browser.

While the transport is native the pane owns the hole:

- The rectangle is the stage's, in CSS pixels relative to the renderer viewport.
  Fit-to-Sidebar hands the page the whole stage at `zoom` 1; the desktop layout
  hands it the rectangle the picture used to occupy, with
  `zoom = holeWidth / logicalWidth` (1280 at the default step), so the zoom steps
  keep their meaning.
- Measurement is a `ResizeObserver` on the stage plus the window `resize` event,
  coalesced into one `requestAnimationFrame`, and a report leaves only when the
  rectangle, the zoom or the visibility changed. A report that failed is retried
  on the next beat. A pane that is not visible reports `{bounds: null,
  visible: false}` once; a surface that unmounts reports the view away after a
  short grace period unless another surface has already claimed it, so moving the
  page between the Sidebar and the main area never leaves the new surface hidden.
- The pane re-reads the panel state every 3s while native: that is how its tabs,
  address and loading flag stay current without frames, how it notices a fall
  back to `screencast` (either the answer names it or a geometry report does), and
  how a failed report is retried. A Host should answer that read without
  generating a picture while the transport is native; the pane never uses one.
- The DOM keeps every existing contract — `body`, `state`, `tabs`, `toolbar`,
  `status`, `stage`, `view`, `frame`, `hit`, `keyboard` — with the canvas
  replaced by an empty `div[data-dsh-browser="frame"]` and
  `data-dsh-browser-transport="native"` on the root, so the panel tests and the
  Host's own selectors keep working. Switching back to `screencast` restores the
  canvas, the stream and the annotation overlay with no placeholder left behind.

`test/client-native.test.js` renders the real client against a stub of the plugin
API and covers the reported geometry and zoom in both layout modes, the
visibility of every occlusion case, the throttling of unchanged measurements, the
return to streaming, and the unlabelled Host that must keep the old behavior.
