window.__ModuleLoader__.load({
  id: "dsh-plugin-browser",
  factory: (require) => {
    var module = {exports: {}};
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, {value: "Module"});
    const React = require("react");

    const NS = "dshPluginBrowser";
    const KIND = "browser";
    const ID = "dsh-plugin-browser/sidebar";
    /** How long an Agent pointer stays on screen before it fades back. */
    const POINTER_HOLD_MS = 2600;
    const POINTER_FADE_MS = 900;
    const RIPPLE_MS = 620;
    const ANIMATE_MS = 380;
    const HOVER_PROBE_MS = 110;
    const WHEEL_FLUSH_MS = 60;
    const RESIZE_SETTLE_MS = 220;
    const POLL_MS = 900;
    const STREAM_RETRY_MS = 1500;
    const STREAM_REATTACH_POLLS = 12;
    const COPY = {
      en: {
        "browser": "Browser",
        "address": "Address",
        "back": "Back",
        "forward": "Forward",
        "reload": "Reload",
        "go": "Go",
        "close": "Close browser",
        "emptyTitle": "No page open yet",
        "emptyHint": "Type a URL above and press Enter. The Agent's browser opens here too.",
        "loading": "Loading…",
        "live": "Live",
        "polling": "Compatibility view",
        "keyboard": "Browser keyboard",
        "page": "Browser page",
        "focused": "Focused",
        "guide": "Streamed Chromium page with pointer and focus cues",
        "err.runtime": "The browser runtime is missing. Install Chromium or configure executablePath, then retry.",
        "err.readonly": "This Session is read-only. Switch the access mode before driving the browser.",
        "err.session": "The Session is not ready. Reopen the conversation and retry.",
        "err.request": "The browser request failed. Check the address and the network, then retry.",
        "err.stale": "The page changed. Operate again from the latest frame.",
        "err.point": "That position is outside the page viewport.",
        "err.text": "The text could not be forwarded to the page.",
        "err.key": "That key is not forwarded to the page.",
        "err.scroll": "That scroll distance is out of range.",
        "err.viewport": "The Sidebar size is out of range for the page.",
        "err.input": "That interaction is not supported.",
        "err.action": "That action is not available from the Sidebar.",
        "err.invalid": "Enter a valid HTTP(S) URL, for example https://example.com.",
        "agentClick": "Agent click",
        "agentFill": "Agent input",
        "agentPress": "Agent key",
        "agentScroll": "Agent scroll",
        "agentDrag": "Agent drag",
        "agentNavigate": "Agent navigation",
        "humanClick": "Your click",
        "humanDrag": "Your drag",
        "humanScroll": "Your scroll",
        "typing": "Typing",
      },
      zh: {
        "browser": "浏览器",
        "address": "地址",
        "back": "后退",
        "forward": "前进",
        "reload": "刷新",
        "go": "打开",
        "close": "关闭浏览器",
        "emptyTitle": "还没有打开网页",
        "emptyHint": "在上方地址栏输入网址并回车即可浏览；Agent 调用 browser 工具时也会显示在这里。",
        "loading": "加载中…",
        "live": "实时",
        "polling": "兼容模式",
        "keyboard": "浏览器键盘",
        "page": "浏览器页面",
        "focused": "已聚焦",
        "guide": "实时串流的 Chromium 页面，带指针与聚焦提示",
        "err.runtime": "浏览器运行时未安装。请安装 Chromium 或配置 executablePath 后重试。",
        "err.readonly": "当前会话为只读模式，请切换访问模式后再操作浏览器。",
        "err.session": "会话尚未就绪，请重新打开会话后重试。",
        "err.request": "浏览器请求失败，请检查地址和网络后重试。",
        "err.stale": "页面已更新，请依据最新画面重新操作。",
        "err.point": "该位置超出了页面可视区域。",
        "err.text": "文本无法发送到页面。",
        "err.key": "该按键不会转发到页面。",
        "err.scroll": "滚动距离超出范围。",
        "err.viewport": "侧栏尺寸超出页面允许范围。",
        "err.input": "不支持该交互方式。",
        "err.action": "侧栏不支持该操作。",
        "err.invalid": "请输入有效的 HTTP(S) 网址，例如 https://example.com。",
        "agentClick": "Agent 点击",
        "agentFill": "Agent 输入",
        "agentPress": "Agent 按键",
        "agentScroll": "Agent 滚动",
        "agentDrag": "Agent 拖拽",
        "agentNavigate": "Agent 打开页面",
        "humanClick": "你的点击",
        "humanDrag": "你的拖拽",
        "humanScroll": "你的滚动",
        "typing": "正在输入",
      },
    };
    const ERROR_KEYS = {
      BROWSER_RUNTIME_MISSING: "err.runtime",
      BROWSER_READ_ONLY: "err.readonly",
      BROWSER_SESSION_REQUIRED: "err.session",
      BROWSER_REQUEST_FAILED: "err.request",
      BROWSER_STALE_OBSERVATION: "err.stale",
      BROWSER_INVALID_POINT: "err.point",
      BROWSER_INVALID_TEXT: "err.text",
      BROWSER_INVALID_KEY: "err.key",
      BROWSER_INVALID_SCROLL: "err.scroll",
      BROWSER_INVALID_VIEWPORT: "err.viewport",
      BROWSER_INVALID_INPUT: "err.input",
      BROWSER_INVALID_ACTION: "err.action",
      BROWSER_INVALID_URL: "err.invalid",
      BROWSER_HTTP_URL_REQUIRED: "err.invalid",
    };
    const AGENT_LABELS = {click: "agentClick", fill: "agentFill", press: "agentPress", scroll: "agentScroll", drag: "agentDrag", navigate: "agentNavigate"};
    const HUMAN_LABELS = {click: "humanClick", drag: "humanDrag", scroll: "humanScroll"};
    /** Keys the Host forwards, spelled exactly as the Host validates them. */
    const PLAIN_KEYS = ["Enter", "Tab", "Escape", "Backspace", "Delete", "Insert", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", "F5"];
    const COMBO_KEYS = {a: "Ctrl+A", c: "Ctrl+C", v: "Ctrl+V", x: "Ctrl+X", z: "Ctrl+Z", f: "Ctrl+F", l: "Ctrl+L"};

    function httpUrl(input) {
      let url;
      try { url = new URL(input); } catch { throw new Error("invalid URL"); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("HTTP(S) URL required");
      return url.href;
    }

    function errorKey(error) {
      const code = /^BROWSER_[A-Z_]+/.exec(String(error?.message ?? error))?.[0];
      return ERROR_KEYS[code] ?? "err.request";
    }

    /** Map one pointer position inside the stage into page viewport coordinates. */
    function toPage(event, element, viewport) {
      const rect = element.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * viewport.width / rect.width,
        y: (event.clientY - rect.top) * viewport.height / rect.height,
      };
    }

    function decodeBase64(value) {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }

    function roundedRect(context, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + width, y, x + width, y + height, r);
      context.arcTo(x + width, y + height, x, y + height, r);
      context.arcTo(x, y + height, x, y, r);
      context.arcTo(x, y, x + width, y, r);
      context.closePath();
    }

    /** Draw a label chip clamped inside the canvas so a marker keeps its caption. */
    function drawChip(context, text, x, y, alpha, canvas) {
      if (!text || alpha <= 0) return;
      context.save();
      context.globalAlpha = alpha;
      context.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
      const padding = 6;
      const width = Math.min(context.measureText(text).width + padding * 2, canvas.width - 8);
      const height = 18;
      const left = Math.max(4, Math.min(x, canvas.width - width - 4));
      const top = Math.max(4, Math.min(y, canvas.height - height - 4));
      context.fillStyle = "rgba(17, 24, 28, 0.92)";
      roundedRect(context, left, top, width, height, 5);
      context.fill();
      context.fillStyle = "#fff";
      context.textBaseline = "middle";
      context.fillText(text, left + padding, top + height / 2 + 0.5, width - padding * 2);
      context.restore();
    }

    /** Shared mouse-cursor glyph, drawn with its outline so it reads on any page. */
    const CURSOR_ICON = "M325.632 897.024c-7.168 0-14.336-1.024-21.504-3.072a73.728 73.728 0 0 1-53.76-66.56L205.824 207.36a75.1616 75.1616 0 0 1 117.248-67.584l514.56 348.672c26.112 17.92 38.4 49.152 30.72 80.384s-32.768 53.248-64.512 56.832l-250.88 29.184c-6.656 0.512-12.288 4.096-16.384 9.728s-151.04 202.752-151.04 202.752c-14.336 19.456-36.864 30.208-59.904 30.208zM281.088 177.664c-5.632 0-10.24 2.048-12.288 3.072-3.072 1.536-12.8 8.704-11.776 22.528l44.544 620.032c1.024 15.36 13.312 20.48 17.408 21.504 4.096 1.024 16.896 3.584 26.112-8.704l151.04-202.752c12.288-16.384 31.232-27.648 51.712-29.696l250.88-29.184c15.36-2.048 19.456-14.336 20.48-17.92 1.024-4.096 3.072-16.896-9.728-25.6L294.4 182.272a23.6032 23.6032 0 0 0-13.312-4.096z";
    const CURSOR_TIP = [214, 196];
    let cursorPath = null;

    function drawCursor(context, x, y, size, alpha) {
      if (!cursorPath) cursorPath = new Path2D(CURSOR_ICON);
      const unit = size / 1024;
      context.save();
      context.globalAlpha = alpha;
      context.translate(x - CURSOR_TIP[0] * unit, y - CURSOR_TIP[1] * unit);
      context.scale(unit, unit);
      context.lineJoin = "round";
      context.shadowColor = "rgba(12, 16, 20, 0.35)";
      context.shadowBlur = 150;
      context.shadowOffsetY = 60;
      context.strokeStyle = "rgba(255, 255, 255, 0.95)";
      context.lineWidth = 104;
      context.stroke(cursorPath);
      context.shadowColor = "transparent";
      context.fillStyle = "#bfbfbf";
      context.fill(cursorPath);
      context.strokeStyle = "rgba(23, 25, 28, 0.4)";
      context.lineWidth = 30;
      context.stroke(cursorPath);
      context.restore();
    }

    function drawRing(context, x, y, radius, alpha, width) {
      if (alpha <= 0) return;
      context.save();
      context.globalAlpha = alpha;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.strokeStyle = "#276ef1";
      context.lineWidth = width;
      context.stroke();
      context.restore();
    }

    function captionOf(target, fallback) {
      if (!target) return "";
      return [target.role, target.name].filter(Boolean).join(" · ") || fallback;
    }

    /** Outline one element box with its caption chip. */
    function drawOutline(context, box, scale, alpha, caption, canvas, accent) {
      if (!box || !(box.width > 0) || !(box.height > 0)) return;
      const x = box.x * scale;
      const y = box.y * scale;
      const width = Math.max(2, box.width * scale);
      const height = Math.max(2, box.height * scale);
      context.save();
      context.globalAlpha = alpha;
      context.lineWidth = 2;
      context.strokeStyle = accent;
      context.shadowColor = "rgba(39, 110, 241, 0.45)";
      context.shadowBlur = 6;
      roundedRect(context, x - 1, y - 1, width + 2, height + 2, 4);
      context.stroke();
      context.restore();
      drawChip(context, caption, x, y - 22, alpha, canvas);
    }

    /**
     * Repaint the annotation layer: Agent pointer, click ripple, focused field,
     * hovered element, drag guide and the typing echo. The layer is a separate
     * canvas so incoming page frames never erase it.
     */
    function paintOverlay(canvas, state, now) {
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const viewport = state.viewport;
      if (!(viewport.width > 0) || !(canvas.width > 0)) return;
      const scale = canvas.width / viewport.width;
      if (state.hoverLive && state.hover?.box) {
        // A hovered page root spans the whole frame; captioned instead of
        // outlined so the cue never turns into a border around everything.
        const whole = state.hover.box.width >= viewport.width * 0.98 && state.hover.box.height >= viewport.height * 0.98;
        if (whole) drawChip(context, state.caption, (state.hoverBox?.x ?? 12) * scale + 16, (state.hoverBox?.y ?? 12) * scale + 18, 0.9, canvas);
        else drawOutline(context, state.hover.box, scale, 0.8, captionOf(state.hover, state.caption), canvas, "rgba(39, 110, 241, 0.7)");
      }
      if (state.drag?.to) {
        context.save();
        context.globalAlpha = 0.8;
        context.setLineDash([6, 5]);
        context.strokeStyle = "#276ef1";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(state.drag.from.x * scale, state.drag.from.y * scale);
        context.lineTo(state.drag.to.x * scale, state.drag.to.y * scale);
        context.stroke();
        context.restore();
      }
      if (state.focus?.box) {
        drawOutline(context, state.focus.box, scale, 1, captionOf(state.focus, state.caption), canvas, "#276ef1");
        if (state.focus.editable && state.focus.box.height > 0) {
          const caretX = state.focus.box.x * scale + 3;
          const caretTop = state.focus.box.y * scale + Math.max(2, state.focus.box.height * scale * 0.22);
          const caretHeight = Math.max(8, state.focus.box.height * scale * 0.56);
          context.save();
          context.globalAlpha = (Math.sin(now / 260) + 1) / 2 * 0.85 + 0.1;
          context.fillStyle = "#276ef1";
          context.fillRect(caretX, caretTop, 2, caretHeight);
          context.restore();
        }
      }
      const pointer = state.pointer;
      if (pointer && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)) {
        const age = now - pointer.at;
        const travel = Math.min(1, Math.max(0, age / ANIMATE_MS));
        const eased = 1 - (1 - travel) ** 3;
        const x = (pointer.fromX + (pointer.x - pointer.fromX) * eased) * scale;
        const y = (pointer.fromY + (pointer.y - pointer.fromY) * eased) * scale;
        const alpha = Math.max(0.25, 1 - Math.max(0, age - POINTER_HOLD_MS) / POINTER_FADE_MS);
        drawCursor(context, x, y, Math.max(28, Math.min(46, canvas.width / 17)), alpha);
        drawChip(context, pointer.label, x + 20, y + 18, alpha, canvas);
        if (travel < 1) drawRing(context, x, y, 6 + 10 * eased, (1 - travel) * 0.5, 2);
      }
      const ripple = state.ripple;
      if (ripple) {
        const age = now - ripple.at;
        if (age <= RIPPLE_MS) {
          const progress = age / RIPPLE_MS;
          drawRing(context, ripple.x * scale, ripple.y * scale, 4 + 26 * progress, (1 - progress) * 0.85, 2.5);
          drawRing(context, ripple.x * scale, ripple.y * scale, 2 + 14 * progress, (1 - progress) * 0.5, 1.5);
        }
      }
      if (state.typing && now - state.typing.at < 2600) {
        const alpha = 1 - Math.max(0, now - state.typing.at - 1800) / 800;
        drawChip(context, `\u2328 ${state.typing.text}`.slice(0, 80), 40, canvas.height - 32, Math.max(0, alpha), canvas);
      }
    }

    function BrowserBody({useTabInfo, sessionId, t}) {
      const {tab} = useTabInfo();
      const visible = tab.visible;
      const copy = React.useCallback((key, params) => t?.(key, params) ?? COPY.en[key] ?? key, [t]);
      const [address, setAddress] = React.useState("");
      const [active, setActive] = React.useState(false);
      const [loading, setLoading] = React.useState(false);
      const [mode, setMode] = React.useState("stream");
      const [error, setError] = React.useState("");
      const [size, setSize] = React.useState(undefined);
      const stage = React.useRef(null);
      const surface = React.useRef(null);
      const overlay = React.useRef(null);
      const keyboard = React.useRef(null);
      const addressField = React.useRef(null);
      const viewport = React.useRef({width: 1280, height: 800});
      const observation = React.useRef(0);
      const queue = React.useRef(Promise.resolve());
      const editing = React.useRef(false);
      const composing = React.useRef(false);
      const hover = React.useRef(undefined);
      const hoverLive = React.useRef(false);
      const focus = React.useRef(undefined);
      const pointer = React.useRef(undefined);
      const ripple = React.useRef(undefined);
      const typing = React.useRef(undefined);
      const drag = React.useRef(undefined);
      const swallowClick = React.useRef(false);
      const pendingFrame = React.useRef(undefined);
      const decoding = React.useRef(false);
      const hoverPoint = React.useRef(undefined);
      const hoverAt = React.useRef(0);
      const hoverBusy = React.useRef(false);
      const hoverPending = React.useRef(undefined);
      const wheelDelta = React.useRef(0);
      const wheelPoint = React.useRef(undefined);
      const wheelTimer = React.useRef(0);
      const polls = React.useRef(0);
      const endpoint = `/api/dsh-browser?sessionId=${encodeURIComponent(sessionId)}`;
      const streamEndpoint = `/api/dsh-browser/stream?sessionId=${encodeURIComponent(sessionId)}`;

      const paint = React.useCallback(() => {
        if (overlay.current) {
          paintOverlay(overlay.current, {
            viewport: viewport.current, pointer: pointer.current, ripple: ripple.current, drag: drag.current,
            focus: focus.current, hover: hover.current, hoverLive: hoverLive.current, hoverBox: hoverPoint.current,
            typing: typing.current, caption: copy("focused"),
          }, performance.now());
        }
        if (surface.current) surface.current.style.cursor = hoverLive.current ? (hover.current?.cursor ?? "default") : "default";
      }, [copy]);

      // One animation clock: frames arrive on the wire, annotations repaint at
      // 30fps only while a page is on screen to annotate.
      React.useEffect(() => {
        if (!visible || !active) return undefined;
        let raf = 0;
        let last = 0;
        const tick = now => {
          raf = requestAnimationFrame(tick);
          if (now - last < 33) return;
          last = now;
          paint();
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      }, [visible, active, paint]);

      React.useEffect(() => () => clearTimeout(wheelTimer.current), []);

      const drawFrame = React.useCallback(data => {
        pendingFrame.current = data;
        if (decoding.current) return;
        decoding.current = true;
        void (async () => {
          while (pendingFrame.current) {
            const next = pendingFrame.current;
            pendingFrame.current = undefined;
            try {
              const picture = await createImageBitmap(new Blob([decodeBase64(next)], {type: "image/jpeg"}));
              const canvas = surface.current;
              if (canvas) {
                if (canvas.width !== picture.width) canvas.width = picture.width;
                if (canvas.height !== picture.height) canvas.height = picture.height;
                canvas.getContext("2d")?.drawImage(picture, 0, 0);
                if (overlay.current && overlay.current.width !== canvas.width) {
                  overlay.current.width = canvas.width;
                  overlay.current.height = canvas.height;
                }
                paint();
              }
              picture.close?.();
            } catch { /* a torn frame is replaced by the next one */ }
          }
          decoding.current = false;
        })();
      }, [paint]);

      const handleEvent = React.useCallback(event => {
        if (event.t === "hello") {
          if (event.viewport) viewport.current = event.viewport;
          setActive(event.active !== false);
          if (event.url && !editing.current) setAddress(event.url === "about:blank" ? "" : event.url);
          return;
        }
        if (event.t === "state") {
          if (event.active === false) { setActive(false); return; }
          setActive(true);
          if (event.observation) observation.current = event.observation;
          if (event.url && !editing.current) setAddress(event.url === "about:blank" ? "" : event.url);
          return;
        }
        if (event.t === "frame") {
          if (event.viewport) viewport.current = event.viewport;
          setActive(true);
          drawFrame(event.data);
          return;
        }
        if (event.t === "pointer") {
          const previous = pointer.current;
          pointer.current = {
            x: event.x, y: event.y,
            fromX: previous?.x ?? event.x, fromY: previous?.y ?? event.y,
            at: performance.now(),
            label: event.source === "human" ? copy(HUMAN_LABELS[event.kind] ?? "humanClick") : (event.label || copy(AGENT_LABELS[event.kind] ?? "agentClick")),
          };
          if (event.kind === "click") ripple.current = {x: event.x, y: event.y, at: performance.now()};
          return;
        }
        if (event.t === "focus") {
          focus.current = event.focus ?? undefined;
          return;
        }
        if (event.t === "typing") {
          typing.current = {text: event.text ?? "", at: performance.now()};
          return;
        }
        if (event.t === "error") setError(copy(ERROR_KEYS[event.code] ?? "err.request"));
      }, [copy, drawFrame]);

      // The stream is the primary picture; polling only covers a Host without
      // the streaming route or a carrier that cannot hold a response open.
      React.useEffect(() => {
        if (!visible || !sessionId || mode !== "stream") return undefined;
        const controller = new AbortController();
        const connect = async () => {
          try {
            const query = size ? `&width=${size.width}&height=${size.height}` : "";
            const response = await fetch(streamEndpoint + query, {signal: controller.signal, cache: "no-store"});
            if (!response.ok || !response.body) throw new Error(response.status === 404 ? "BROWSER_SESSION_REQUIRED" : "BROWSER_REQUEST_FAILED");
            setLoading(false);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            for (;;) {
              const chunk = await reader.read();
              if (chunk.done) break;
              buffer += decoder.decode(chunk.value, {stream: true});
              let index;
              while ((index = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, index);
                buffer = buffer.slice(index + 1);
                if (!line.trim()) continue;
                try { handleEvent(JSON.parse(line)); } catch { /* a torn line is rebuilt by the next frame */ }
              }
            }
            if (controller.signal.aborted) return;
            setMode("poll");
          } catch (failure) {
            if (controller.signal.aborted) return;
            if (/BROWSER_SESSION_REQUIRED/.test(String(failure?.message))) setActive(false);
            setMode("poll");
          }
        };
        void connect();
        return () => { controller.abort(); };
      }, [visible, sessionId, size, mode, streamEndpoint, handleEvent]);

      // Compatibility view: the one-shot JPEG poll, used while the stream is
      // unavailable. It periodically re-attempts the stream, so a pane returns
      // to live frames as soon as the streaming route answers again.
      React.useEffect(() => {
        if (!visible || !sessionId || mode !== "poll") return undefined;
        const controller = new AbortController();
        let timer;
        const poll = async () => {
          try {
            const query = size ? `&width=${size.width}&height=${size.height}` : "";
            const response = await fetch(endpoint + query, {signal: controller.signal, cache: "no-store"});
            const value = await response.json();
            if (controller.signal.aborted) return;
            if (!response.ok) throw new Error(value.error || "BROWSER_REQUEST_FAILED");
            setActive(value.active);
            if (!value.active) { setLoading(false); return; }
            observation.current = value.observation;
            if (!editing.current) setAddress(value.url === "about:blank" ? "" : value.url);
            viewport.current = {width: value.width, height: value.height};
            drawFrame(value.image);
            setLoading(false);
          } catch (failure) {
            if (!controller.signal.aborted) setError(copy(errorKey(failure)));
          } finally {
            if (controller.signal.aborted) return;
            polls.current += 1;
            if (polls.current >= STREAM_REATTACH_POLLS) { polls.current = 0; setMode("stream"); return; }
            timer = setTimeout(poll, POLL_MS);
          }
        };
        void poll();
        return () => { controller.abort(); clearTimeout(timer); };
      }, [visible, sessionId, size, mode, endpoint, copy, drawFrame]);

      // Follow the Sidebar's own size: the page reflows to the width and height
      // the human gave the pane, and the Host restarts its screencast.
      React.useEffect(() => {
        const element = stage.current;
        if (!element || !visible) return undefined;
        let timer;
        const measure = () => {
          const width = Math.max(240, Math.min(1920, Math.round(element.clientWidth)));
          const height = Math.max(200, Math.min(1600, Math.round(element.clientHeight)));
          if (width <= 0 || height <= 0) return;
          if (overlay.current && overlay.current.width === 0) {
            overlay.current.width = width * 2;
            overlay.current.height = height * 2;
          }
          setSize(previous => previous && previous.width === width && previous.height === height ? previous : {width, height});
        };
        const observer = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(measure, RESIZE_SETTLE_MS); });
        observer.observe(element);
        measure();
        return () => { clearTimeout(timer); observer.disconnect(); };
      }, [visible]);

      const send = args => {
        setLoading(args.action === "navigate");
        queue.current = queue.current.catch(() => {}).then(async () => {
          const response = await fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(args)});
          const value = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(value.error || "BROWSER_REQUEST_FAILED");
          if (value.observation) observation.current = value.observation;
          setError("");
          if (args.action === "navigate" || args.action === "_reload" || args.kind === "click") polls.current = 0;
          return value;
        }).catch(failure => { setError(copy(errorKey(failure))); })
          .finally(() => setLoading(false));
      };

      // Hover probes are pure reads: they never consume an observation and never
      // queue behind an action, so the highlight follows the mouse immediately.
      const probeHover = (x, y) => {
        const now = performance.now();
        if (now - hoverAt.current < HOVER_PROBE_MS) return;
        const last = hoverPoint.current;
        if (last && Math.abs(last.x - x) < 2 && Math.abs(last.y - y) < 2) return;
        hoverAt.current = now;
        hoverPoint.current = {x, y};
        hoverPending.current = {x, y};
        if (hoverBusy.current) return;
        hoverBusy.current = true;
        void (async () => {
          while (hoverPending.current) {
            const point = hoverPending.current;
            hoverPending.current = undefined;
            try {
              const response = await fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "_hover", x: point.x, y: point.y})});
              const value = await response.json();
              if (response.ok) { hover.current = value.hover; hoverLive.current = Boolean(value.hover); }
            } catch { /* the next move retries */ }
          }
          hoverBusy.current = false;
        })();
      };

      const iconButton = (label, glyph, action) => React.createElement("button", {
        type: "button", className: "dsh-browser-action", title: label, "aria-label": label,
        "data-dsh-browser-action": action, onClick: () => { setError(""); send({action}); },
      }, glyph);
      const navigate = () => {
        try {
          const target = httpUrl(address.trim());
          editing.current = false;
          setError("");
          setAddress(target);
          polls.current = 0;
          send({action: "navigate", url: target});
        } catch { setError(copy("err.invalid")); }
      };
      const onKeyDown = event => {
        if (composing.current || event.nativeEvent?.isComposing) return;
        const combo = (event.metaKey || event.ctrlKey) ? COMBO_KEYS[event.key.toLowerCase()] : undefined;
        if (combo) {
          // Paste stays local: the composition field already holds the text.
          if (combo === "Ctrl+V") return;
          event.preventDefault();
          if (combo === "Ctrl+L") { addressField.current?.focus(); addressField.current?.select(); return; }
          send({action: "_input", kind: "key", key: combo, observation: observation.current});
          return;
        }
        const name = event.shiftKey && event.key === "Tab" ? "Shift+Tab" : event.key;
        if (!PLAIN_KEYS.includes(name)) return;
        event.preventDefault();
        if (name === "F5") { send({action: "_reload"}); return; }
        send({action: "_input", kind: "key", key: name, observation: observation.current});
      };

      const empty = !active;
      return React.createElement("div", {className: "dsh-browser-body", "data-dsh-browser": "body"},
        React.createElement("div", {className: "dsh-browser-toolbar"},
          iconButton(copy("back"), "\u2190", "_back"),
          iconButton(copy("forward"), "\u2192", "_forward"),
          iconButton(copy("reload"), "\u21bb", "_reload"),
          React.createElement("input", {
            ref: addressField, className: "dsh-browser-address", value: address,
            onChange: event => setAddress(event.target.value),
            onFocus: () => { editing.current = true; },
            onBlur: () => { editing.current = false; },
            onKeyDown: event => { event.stopPropagation(); if (event.key === "Enter") navigate(); },
            spellCheck: false, inputMode: "url", "aria-label": copy("address"), placeholder: "https://",
          }),
          React.createElement("button", {type: "button", className: "dsh-browser-action", title: copy("go"), "aria-label": copy("go"), onClick: navigate}, loading ? "\u22ef" : "\u21b5"),
          mode !== "stream" && React.createElement("span", {className: "dsh-browser-note", "data-dsh-browser-mode": mode}, copy("polling")),
          iconButton(copy("close"), "\u00d7", "close")
        ),
        error && React.createElement("div", {className: "dsh-browser-error", role: "alert"}, error),
        React.createElement("div", {className: "dsh-browser-stage", ref: stage, "data-dsh-browser": "stage"},
          React.createElement("canvas", {
            ref: surface, className: "dsh-browser-frame", "data-dsh-browser": "frame",
            "aria-label": copy("page"), style: {visibility: empty ? "hidden" : "visible"},
          }),
          React.createElement("canvas", {ref: overlay, className: "dsh-browser-overlay", "aria-hidden": "true"}),
          React.createElement("textarea", {
            ref: keyboard, className: "dsh-browser-keyboard", "aria-label": copy("keyboard"),
            "data-dsh-browser": "keyboard", autoComplete: "off", spellCheck: false,
            onChange: event => { if (!composing.current && !event.nativeEvent.isComposing && event.target.value) { send({action: "_input", kind: "text", text: event.target.value, observation: observation.current}); event.target.value = ""; } },
            onCompositionStart: () => { composing.current = true; },
            onCompositionEnd: event => { composing.current = false; if (event.target.value) { send({action: "_input", kind: "text", text: event.target.value, observation: observation.current}); event.target.value = ""; } },
            onPaste: event => {
              const text = event.clipboardData?.getData("text");
              if (!text) return;
              event.preventDefault();
              send({action: "_input", kind: "text", text, observation: observation.current});
            },
            onKeyDown: onKeyDown,
          }),
          React.createElement("div", {
            className: "dsh-browser-hit", "data-dsh-browser": "hit", tabIndex: 0, role: "application", "aria-label": copy("page"),
            onMouseDown: event => { event.preventDefault(); keyboard.current?.focus({preventScroll: true}); },
            onPointerDown: event => {
              if (empty) return;
              drag.current = {from: toPage(event, event.currentTarget, viewport.current), to: undefined};
            },
            onMouseMove: event => {
              if (empty) return;
              const point = toPage(event, event.currentTarget, viewport.current);
              hoverLive.current = true;
              probeHover(point.x, point.y);
              if (drag.current) drag.current.to = point;
            },
            onMouseLeave: () => { hoverLive.current = false; hover.current = undefined; hoverPoint.current = undefined; },
            onMouseUp: event => {
              const current = drag.current;
              drag.current = undefined;
              if (!current || empty) return;
              const point = toPage(event, event.currentTarget, viewport.current);
              if (Math.hypot(point.x - current.from.x, point.y - current.from.y) < 6) return;
              // A real drag is not also a click.
              swallowClick.current = true;
              send({action: "_input", kind: "drag", from: current.from, to: point, observation: observation.current});
            },
            onClick: event => {
              if (swallowClick.current) { swallowClick.current = false; return; }
              if (empty) return;
              event.stopPropagation();
              const point = toPage(event, event.currentTarget, viewport.current);
              ripple.current = {x: point.x, y: point.y, at: performance.now()};
              send({
                action: "_input", kind: "click", width: viewport.current.width, height: viewport.current.height,
                clickCount: Math.max(1, Math.min(3, event.detail || 1)), x: point.x, y: point.y, observation: observation.current,
              });
            },
            onWheel: event => {
              if (empty) return;
              wheelDelta.current += event.deltaY;
              wheelPoint.current = toPage(event, event.currentTarget, viewport.current);
              if (wheelTimer.current) return;
              wheelTimer.current = window.setTimeout(() => {
                wheelTimer.current = 0;
                const deltaY = Math.max(-1200, Math.min(1200, Math.round(wheelDelta.current)));
                wheelDelta.current = 0;
                if (deltaY === 0) return;
                send({action: "_input", kind: "scroll", deltaY, x: wheelPoint.current?.x, y: wheelPoint.current?.y, observation: observation.current});
              }, WHEEL_FLUSH_MS);
            },
          }),
          empty && React.createElement("div", {className: "dsh-browser-empty", "data-dsh-browser": "empty"},
            React.createElement("span", {className: "dsh-browser-empty-mark", "aria-hidden": "true"}, "\u25cb"),
            React.createElement("p", {className: "dsh-browser-empty-title"}, copy("emptyTitle")),
            React.createElement("p", {className: "dsh-browser-empty-hint"}, copy("emptyHint"))
          )
        ),
        React.createElement("span", {
          className: "dsh-browser-live", role: "status",
          "data-dsh-browser-state": active ? (loading ? "loading" : "live") : "idle",
        }, active ? (loading ? copy("loading") : copy("live")) : copy("emptyTitle"))
      );
    }

    function installStyles() {
      if (typeof document === "undefined" || document.querySelector("style[data-dsh-browser-style]") !== null) return;
      const style = document.createElement("style");
      style.dataset.dshBrowserStyle = "true";
      style.textContent = `
        .dsh-browser-body { box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; height: 100%; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #17191c); }
        .dsh-browser-toolbar { box-sizing: border-box; display: flex; align-items: center; gap: 6px; min-width: 0; padding: 8px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 10%)); }
        .dsh-browser-address { box-sizing: border-box; min-width: 0; height: 30px; flex: 1; border: 1px solid var(--dsw-alias-border-l3, rgb(0 0 0 / 18%)); border-radius: 6px; padding: 0 8px; color: inherit; background: var(--dsw-alias-bg-layer-1, #fff); font: inherit; font-size: 12px; outline: none; }
        .dsh-browser-address:focus { border-color: var(--dsw-alias-state-business-primary, #276ef1); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #276ef1) 22%, transparent); }
        .dsh-browser-action { flex: none; min-width: 30px; height: 30px; border: 1px solid var(--dsw-alias-border-l3, rgb(0 0 0 / 18%)); border-radius: 6px; padding: 0 9px; color: inherit; background: var(--dsw-alias-bg-layer-1, #fff); cursor: pointer; font: inherit; font-size: 12px; }
        .dsh-browser-action:hover { background: var(--dsw-alias-interactive-bg-hover, rgb(0 0 0 / 6%)); }
        .dsh-browser-error { box-sizing: border-box; padding: 6px 10px; color: var(--dsw-alias-state-error-primary, #b13e4a); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b13e4a) 8%, transparent); font-size: 12px; line-height: 16px; }
        .dsh-browser-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-base, #fff); }
        .dsh-browser-frame, .dsh-browser-overlay { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
        .dsh-browser-frame { background: #fff; }
        .dsh-browser-overlay { pointer-events: none; }
        .dsh-browser-hit { position: absolute; inset: 0; outline: none; }
        .dsh-browser-hit:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #276ef1); outline-offset: -2px; }
        .dsh-browser-keyboard { position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; padding: 0; border: 0; pointer-events: none; }
        .dsh-browser-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 24px; text-align: center; color: var(--dsw-alias-label-secondary, #61666b); }
        .dsh-browser-empty-mark { font-size: 26px; color: var(--dsw-alias-label-tertiary, #81858c); }
        .dsh-browser-empty-title { margin: 0; font-size: 13px; }
        .dsh-browser-empty-hint { margin: 0; max-width: 320px; font-size: 12px; color: var(--dsw-alias-label-tertiary, #81858c); }
        .dsh-browser-note { flex: none; padding: 0 6px; color: var(--dsw-alias-label-tertiary, #81858c); font-size: 11px; line-height: 30px; }
        .dsh-browser-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      `;
      document.head.appendChild(style);
    }

    function callArgsRaw(block) {
      if (!block || typeof block !== "object") return "";
      const settled = Object.hasOwn(block, "kind");
      return String((settled ? block.call?.argsRaw : block.argsRaw) ?? "");
    }

    function browserCall(block) {
      const raw = callArgsRaw(block);
      try {
        const args = JSON.parse(raw);
        if (!args || typeof args !== "object" || Array.isArray(args)) return {};
        const action = typeof args.action === "string" ? args.action : "";
        let url;
        if (action === "navigate" && typeof args.url === "string") {
          try { url = httpUrl(args.url); } catch { /* the Host reports the validation error */ }
        }
        return {action, url};
      } catch {
        return {};
      }
    }

    function BrowserToolRow({sidebarRight, callId, block, sessionId}) {
      const {action, url} = browserCall(block);
      const settled = Object.hasOwn(block ?? {}, "kind");

      React.useEffect(() => {
        // Only the live call opens the pane. Replaying settled transcript rows
        // must not steal focus or overwrite a URL the user entered manually.
        if (settled || action === "close") return;
        try {
          const options = url ? {params: {url}} : {};
          if (sessionId && typeof sidebarRight?.openTabIn === "function") {
            sidebarRight.openTabIn(sessionId, KIND, options);
          } else if (typeof sidebarRight?.openTab === "function") {
            sidebarRight.openTab(KIND, options);
          }
        } catch (error) {
          // Rendering a historical tool row must remain safe when the right
          // Sidebar is not mounted (for example, during Web boot or teardown).
          console.warn("[dsh-plugin-browser] unable to open right Sidebar tab", error);
        }
      }, [sidebarRight, sessionId, callId, action, url, settled]);

      return null;
    }

    const inject = ["slots", "locale", "sidebarRightTabs", "sidebarRight"];
    function apply(ctx) {
      installStyles();
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, COPY), "dsh-plugin-browser: dictionaries");
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: ID,
        kind: KIND,
        title: () => t("browser"),
        guide: [{
          order: 30,
          title: () => t("browser"),
          description: () => t("guide"),
        }],
      }), "dsh-plugin-browser: right Sidebar type");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
        name: "sidebar.right.pane.tab",
        key: ID,
        locale: NS,
      }, BrowserBody)), "dsh-plugin-browser: right Sidebar body");
      ctx.effect(() => ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
        name: "tool.call.toolview",
        key: "browser",
      }, props => React.createElement(BrowserToolRow, {...props, sidebarRight: ctx.sidebarRight}))), "dsh-plugin-browser: transcript row");
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = "dsh-plugin-browser";
    return module.exports;
  }
});
