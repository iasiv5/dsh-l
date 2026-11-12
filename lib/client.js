window.__ModuleLoader__.load({
	id: "dsh-l",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.mjs
var index_exports = {};
__export(index_exports, {
  PANEL_KEY: () => PANEL_KEY,
  apply: () => apply,
  isPlugin: () => isPlugin,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/locale/zh-CN.mjs
var zhCN = {
  panelLabel: "L\u267E\uFE0Fp Engineering \u5DE5\u4F5C\u53F0",
  refresh: "\u5237\u65B0",
  refreshing: "\u5237\u65B0\u4E2D\u2026",
  watchedRepos: "\u76D1\u770B\u4ED3\u5E93",
  repoPicker: {
    title: "\u9009\u62E9\u8981\u76D1\u770B\u7684\u4ED3\u5E93",
    discover: "\u4ECE\u6211\u7684 GitHub \u8D26\u53F7\u53D1\u73B0",
    addManually: "\u624B\u52A8\u6DFB\u52A0 owner/repo",
    save: "\u4FDD\u5B58"
  },
  groups: {
    inbox: "\u5F85\u5206\u8BCA",
    triaged: "\u5DF2\u5206\u8BCA",
    gating: "\u5F85\u62CD\u677F",
    building: "\u8FDB\u884C\u4E2D",
    shipped: "\u5DF2\u4EA4\u4ED8"
  },
  filters: {
    all: "\u5168\u90E8",
    issues: "Issue",
    pullRequests: "PR",
    repo: "\u4ED3\u5E93",
    urgency: "\u7D27\u6025\u5EA6"
  },
  urgency: { P0: "P0 \u7ACB\u5373", P1: "P1 \u9AD8", P2: "P2 \u4E2D", P3: "P3 \u4F4E" },
  validity: { high: "\u53EF\u4FE1", medium: "\u5B58\u7591", low: "\u4E0D\u53EF\u4FE1", none: "\u672A\u8BC4" },
  recommendedActions: { start: "\u5F00\u5DE5", feedback: "\u7B49\u53CD\u9988", close: "\u5173\u95ED", hold: "\u6302\u8D77" },
  gates: { G1: "\u5F00\u5DE5\u524D", G2: "\u4EA4\u4ED8\u524D", G3: "\u53D1\u7248\u524D" },
  stages: {
    ingest: "\u6444\u53D6",
    backlog: "\u6E05\u5355",
    triage: "\u5206\u8BCA",
    feedback: "\u53CD\u9988\u95E8",
    build: "\u6784\u5EFA",
    verify: "\u9A8C\u8BC1",
    ship: "\u4EA4\u4ED8"
  },
  emptyStates: {
    backlog: "\u6CA1\u6709\u5019\u9009\u3002\u5237\u65B0\u4E00\u4E0B\uFF0C\u6216\u68C0\u67E5\u76D1\u770B\u4ED3\u5E93\u5217\u8868\u3002",
    inbox: "\u6CA1\u6709\u5F85\u5206\u8BCA\u7684\u5019\u9009\u3002"
  },
  errors: {
    refreshFailed: "\u5237\u65B0\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
    noToken: "\u672A\u627E\u5230 GitHub \u51ED\u636E\uFF1A\u8BF7\u914D\u7F6E token\uFF0C\u6216\u5728\u672C\u673A\u767B\u5F55 gh\u3002"
  },
  meta: { candidates: "\u5019\u9009", lastRefreshAt: "\u4E0A\u6B21\u5237\u65B0" }
};

// src/client/locale/en.mjs
var en = {
  panelLabel: "L\u267E\uFE0Fp Engineering Workbench",
  refresh: "Refresh",
  refreshing: "Refreshing\u2026",
  watchedRepos: "Watched repos",
  repoPicker: {
    title: "Choose repositories to watch",
    discover: "Discover from my GitHub account",
    addManually: "Add owner/repo manually",
    save: "Save"
  },
  groups: {
    inbox: "Inbox",
    triaged: "Triaged",
    gating: "Awaiting decision",
    building: "In progress",
    shipped: "Shipped"
  },
  filters: {
    all: "All",
    issues: "Issues",
    pullRequests: "PRs",
    repo: "Repository",
    urgency: "Urgency"
  },
  urgency: { P0: "P0 now", P1: "P1 high", P2: "P2 medium", P3: "P3 low" },
  validity: { high: "credible", medium: "doubtful", low: "not credible", none: "unrated" },
  recommendedActions: { start: "start", feedback: "await feedback", close: "close", hold: "hold" },
  gates: { G1: "before build", G2: "before ship", G3: "before release" },
  stages: {
    ingest: "Ingest",
    backlog: "Backlog",
    triage: "Triage",
    feedback: "Feedback gate",
    build: "Build",
    verify: "Verify",
    ship: "Ship"
  },
  emptyStates: {
    backlog: "No candidates. Refresh, or check the watched-repo list.",
    inbox: "Nothing waiting for triage."
  },
  errors: {
    refreshFailed: "Refresh failed. Please retry later.",
    noToken: "No GitHub credential found: configure a token or sign in to gh on this machine."
  },
  meta: { candidates: "candidates", lastRefreshAt: "Last refresh" }
};

// src/client/i18n.mjs
var flatten = (d, p = "") => Object.fromEntries(Object.entries(d).flatMap(([k, v]) => typeof v === "string" ? [[p + k, v]] : Object.entries(flatten(v, p + k + "."))));
var TABLES = { "zh-CN": flatten(zhCN), en: flatten(en) };
function normalizeLang(value) {
  return typeof value === "string" && /^en\b/i.test(value) ? "en" : "zh-CN";
}
function makeT(lang) {
  const table = TABLES[lang] ?? TABLES["zh-CN"];
  return (key) => table[key] ?? key;
}
function createLangSource(ctx, nav = globalThis.navigator) {
  let lang = normalizeLang(nav?.language);
  const subscribers = /* @__PURE__ */ new Set();
  const set = (value) => {
    const next = normalizeLang(value);
    if (next === lang) return;
    lang = next;
    for (const fn of subscribers) fn(lang);
  };
  if (typeof ctx?.inject === "function") {
    ctx.inject(["locale"], (c) => {
      set(c.locale.getSnapshot().active);
      c.on("locale/change", (snap) => set(snap.active));
    });
  }
  return {
    get: () => lang,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
}

// src/client/components/workbench.mjs
function mountWorkbench(shadow, { getLang, build }) {
  const paint = () => {
    const t = makeT(getLang());
    shadow.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = ":host{display:block;padding:16px;font-size:14px}";
    const title = document.createElement("h2");
    title.textContent = t("panelLabel");
    const empty = document.createElement("p");
    empty.textContent = t("emptyStates.backlog");
    shadow.append(style, title, empty);
    shadow.host.dataset.dshLBuild = build;
  };
  paint();
  return { relabel: paint, reload: paint, dispose: () => {
    shadow.innerHTML = "";
  } };
}

// src/client/index.mjs
var React = require("react");
var h = React.createElement;
var BUILD = true ? "baec946c50c0" : "dev";
var PANEL_KEY = "dsh-l.workbench";
var name = "dsh-l";
var isPlugin = true;
function PanelIcon(props) {
  const s = props && props.size || 18;
  return h(
    "svg",
    { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4z" })
  );
}
function apply(ctx) {
  const lang = createLangSource(ctx);
  const label = () => makeT(lang.get())("panelLabel");
  function WorkbenchPanel() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const host = ref.current;
      if (!host) return void 0;
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const view = mountWorkbench(shadow, { getLang: lang.get, build: BUILD });
      const off = lang.subscribe(() => view.relabel());
      return () => {
        off();
        view.dispose();
      };
    }, []);
    return h("div", { ref, style: { width: "100%", height: "100%", overflow: "hidden", position: "relative" } });
  }
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: PANEL_KEY, order: 30, label }, PanelIcon));
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_KEY }, WorkbenchPanel));
}

		return module.exports;
	}
});
/* dsh-l-build:baec946c50c0 */
