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
    const DEFAULT_URL = "http://127.0.0.1:3099/";
    const FALLBACK_COPY = {
      address: "Address",
      go: "Go",
      reload: "Reload",
      ready: "Ready",
      loading: "Loading",
      loaded: "Loaded",
      invalid: "Enter a valid HTTP(S) URL.",
      blocked: "The page may block embedded viewing.",
      browser: "Browser"
    };
    const en = {...FALLBACK_COPY};

    function httpUrl(input) {
      let url;
      try { url = new URL(input); } catch { throw new Error("invalid URL"); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("HTTP(S) URL required");
      return url.href;
    }

    function BrowserBody({useTabInfo, t}) {
      const {tab} = useTabInfo();
      const params = tab.navigation.params;
      const initial = (() => {
        try { return httpUrl(typeof params?.url === "string" ? params.url : DEFAULT_URL); } catch { return DEFAULT_URL; }
      })();
      const [address, setAddress] = React.useState(initial);
      const [frameUrl, setFrameUrl] = React.useState(initial);
      const [frameKey, setFrameKey] = React.useState(0);
      const [status, setStatus] = React.useState("ready");
      const copy = key => t?.(key) || FALLBACK_COPY[key] || key;

      React.useEffect(() => {
        setAddress(initial);
        setFrameUrl(initial);
        setStatus("ready");
      }, [tab.navigation.revision]);

      const navigate = () => {
        try {
          const next = httpUrl(address.trim());
          setAddress(next);
          setFrameUrl(next);
          setStatus("loading");
          setFrameKey(value => value + 1);
        } catch {
          setStatus("invalid");
        }
      };
      const reload = () => {
        setStatus("loading");
        setFrameKey(value => value + 1);
      };

      return React.createElement("div", {className: "dsh-browser-body", "data-dsh-browser": "body"},
        React.createElement("div", {className: "dsh-browser-toolbar"},
          React.createElement("label", {className: "dsh-browser-address-label", htmlFor: "dsh-browser-address"}, copy("address")),
          React.createElement("input", {
            id: "dsh-browser-address",
            className: "dsh-browser-address",
            value: address,
            onChange: event => setAddress(event.target.value),
            onKeyDown: event => { if (event.key === "Enter") navigate(); },
            spellCheck: false,
            inputMode: "url",
            "aria-label": copy("address")
          }),
          React.createElement("button", {type: "button", className: "dsh-browser-action", onClick: navigate}, copy("go")),
          React.createElement("button", {type: "button", className: "dsh-browser-action", onClick: reload}, copy("reload"))
        ),
        React.createElement("div", {className: "dsh-browser-status", role: "status", "data-dsh-browser-status": status},
          status === "invalid" ? copy("invalid") : status === "loading" ? copy("loading") : status === "loaded" ? copy("loaded") : copy("ready"),
          status !== "invalid" && React.createElement("span", {className: "dsh-browser-status-note"}, copy("blocked"))
        ),
        React.createElement("iframe", {
          key: frameKey,
          className: "dsh-browser-frame",
          src: frameUrl,
          title: copy("browser"),
          sandbox: "allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-same-origin allow-downloads",
          referrerPolicy: "no-referrer",
          onLoad: () => setStatus("loaded"),
          "data-dsh-browser": "frame"
        })
      );
    }

    function BrowserTitle({useTabInfo}) {
      const {tab} = useTabInfo();
      return tab.title;
    }

    function installStyles() {
      if (typeof document === "undefined" || document.querySelector("style[data-dsh-browser-style]") !== null) return;
      const style = document.createElement("style");
      style.dataset.dshBrowserStyle = "true";
      style.textContent = `
        .dsh-browser-body { box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; height: 100%; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #17191c); }
        .dsh-browser-toolbar { box-sizing: border-box; display: flex; align-items: center; gap: 6px; min-width: 0; padding: 8px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 10%)); }
        .dsh-browser-address-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        .dsh-browser-address { box-sizing: border-box; min-width: 0; height: 30px; flex: 1; border: 1px solid var(--dsw-alias-border-l3, rgb(0 0 0 / 18%)); border-radius: 6px; padding: 0 8px; color: inherit; background: var(--dsw-alias-bg-layer-1, #fff); font: inherit; font-size: 12px; outline: none; }
        .dsh-browser-address:focus { border-color: var(--dsw-alias-state-business-primary, #276ef1); }
        .dsh-browser-action { flex: none; height: 30px; border: 1px solid var(--dsw-alias-border-l3, rgb(0 0 0 / 18%)); border-radius: 6px; padding: 0 9px; color: inherit; background: var(--dsw-alias-bg-layer-1, #fff); cursor: pointer; font: inherit; font-size: 12px; }
        .dsh-browser-action:hover { background: var(--dsw-alias-interactive-bg-hover, rgb(0 0 0 / 6%)); }
        .dsh-browser-status { display: flex; gap: 8px; align-items: baseline; min-height: 24px; box-sizing: border-box; padding: 4px 10px; color: var(--dsw-alias-label-secondary, #61666b); font-size: 11px; line-height: 16px; }
        .dsh-browser-status-note { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary, #81858c); }
        .dsh-browser-frame { display: block; width: 100%; min-height: 0; flex: 1; border: 0; background: #fff; }
      `;
      document.head.appendChild(style);
    }

    const inject = ["slots", "locale", "sidebarRightTabs"];
    function apply(ctx) {
      installStyles();
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, {en}), "dsh-plugin-browser: dictionaries");
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: ID,
        kind: KIND,
        title: () => t("browser"),
        guide: [{
          order: 30,
          title: () => t("browser"),
          description: () => "Open an HTTP(S) page in the right Sidebar"
        }]
      }), "dsh-plugin-browser: right Sidebar type");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
        name: "sidebar.right.pane.tab",
        key: ID,
        locale: NS
      }, BrowserBody)), "dsh-plugin-browser: right Sidebar body");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
        name: "sidebar.right.pane.tab.title",
        key: ID
      }, BrowserTitle)), "dsh-plugin-browser: right Sidebar title");
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = "dsh-plugin-browser";
    return module.exports;
  }
});
