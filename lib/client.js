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
  inject: () => inject,
  isPlugin: () => isPlugin,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/locale/zh-CN.mjs
var zhCN = {
  panelLabel: "Loop Engineering \u5DE5\u4F5C\u53F0",
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
    shipped: "\u5DF2\u4EA4\u4ED8",
    closed: "\u5DF2\u5173\u95ED / \u6302\u8D77"
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
    backlog: "\u6CA1\u6709\u5019\u9009\u3002\u5237\u65B0\u4E00\u4E0B\uFF0C\u6216\u68C0\u67E5\u76D1\u770B\u4ED3\u5E93\u5217\u8868\u3002"
  },
  errors: {
    refreshFailed: "\u5237\u65B0\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
    noToken: "\u672A\u627E\u5230 GitHub \u51ED\u636E\uFF1A\u8BF7\u914D\u7F6E token\uFF0C\u6216\u5728\u672C\u673A\u767B\u5F55 gh\u3002"
  },
  meta: { lastRefreshAt: "\u4E0A\u6B21\u5237\u65B0" },
  actions: { triageBatch: "\u5206\u8BCA\u5F85\u5206\u8BCA", override: "\u4FDD\u5B58\u4EBA\u5DE5\u5224\u65AD", reason: "\u7406\u7531", moveTo: "\u79FB\u5230", pass: "\u653E\u884C", reject: "\u9A73\u56DE", copyPackage: "\u590D\u5236\u4EFB\u52A1\u5305" },
  gateV1Hint: "v1 \u4EC5 G1 \u53EF\u7528\uFF1B\u6784\u5EFA\u3001\u9A8C\u8BC1\u3001\u4EA4\u4ED8\u4E0E G2/G3 \u5728 v2 \u5F00\u653E",
  settings: { title: "\u8BBE\u7F6E", intervalMinutes: "\u81EA\u52A8\u5237\u65B0\u95F4\u9694\uFF08\u5206\u949F\uFF0C0 = \u5173\u95ED\uFF09", save: "\u4FDD\u5B58", triageModel: "\u5206\u8BCA\u6A21\u578B", followDefault: "\u8DDF\u968F\u5BBF\u4E3B\u9ED8\u8BA4", notInCatalog: "\uFF08\u4E0D\u5728\u76EE\u5F55\u4E2D\uFF09" }
};

// src/client/locale/en.mjs
var en = {
  panelLabel: "Loop Engineering Workbench",
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
    shipped: "Shipped",
    closed: "Closed & held"
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
    backlog: "No candidates. Refresh, or check the watched-repo list."
  },
  errors: {
    refreshFailed: "Refresh failed. Please retry later.",
    noToken: "No GitHub credential found: configure a token or sign in to gh on this machine."
  },
  meta: { lastRefreshAt: "Last refresh" },
  actions: { triageBatch: "Triage inbox", override: "Save my judgment", reason: "Reason", moveTo: "Move to", pass: "Pass", reject: "Reject", copyPackage: "Copy task package" },
  gateV1Hint: "v1 enables G1 only; build, verify, ship and G2/G3 open in v2",
  settings: { title: "Settings", intervalMinutes: "Auto-refresh interval (minutes, 0 = off)", save: "Save", triageModel: "Triage model", followDefault: "Follow host default", notInCatalog: "(not in catalog)" }
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

// src/client/logic.mjs
var GROUPS = [
  ["inbox", false],
  ["triaged", false],
  ["gating", false],
  ["building", true],
  ["shipped", true],
  ["closed", true]
];
var bucketOf = (stage) => {
  if (stage === "inbox" || stage === "triaged" || stage === "gating" || stage === "shipped") return stage;
  if (stage === "building" || stage === "verifying") return "building";
  return "closed";
};
function groupCandidates(list, t) {
  const groups = GROUPS.map(([id, dim]) => ({ id, label: t("groups." + id), dim, items: [] }));
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  for (const c of list ?? []) byId[bucketOf(c.stage)].items.push(c);
  return groups;
}
function filterCandidates(list, { type = "all", repo = "all", urgency = "all" } = {}) {
  return (list ?? []).filter((c) => (type === "all" || c.type === type) && (repo === "all" || c.repo === repo) && (urgency === "all" || (c.triage?.urgency ?? "") === urgency));
}
function pickTriageBatch(list, filters = {}) {
  return filterCandidates(list, { type: filters.type ?? "all", repo: filters.repo ?? "all", urgency: "all" }).filter((c) => c.stage === "inbox").slice(0, 10).map((c) => c.key);
}
function gateState(candidate) {
  return { G1: candidate?.stage === "gating", G2: false, G3: false };
}
function stageCounts(list) {
  const all = list ?? [];
  const n = (pred) => all.filter(pred).length;
  return {
    ingest: all.length,
    backlog: n((c) => c.stage === "inbox"),
    triage: n((c) => Boolean(c.triage)),
    feedback: n((c) => c.stage === "gating"),
    build: n((c) => c.stage === "building"),
    verify: n((c) => c.stage === "verifying"),
    ship: n((c) => c.stage === "shipped")
  };
}
var modelValueOf = (sel2) => sel2 ? sel2.provider + "\n" + sel2.model : "";
function settingsPatch(initial, form) {
  const patch = { intervalMinutes: form.intervalMinutes };
  if (form.modelValue === modelValueOf(initial.triageModel)) return patch;
  if (form.modelValue === "") return { ...patch, triageModel: null };
  const cut = form.modelValue.indexOf("\n");
  return { ...patch, triageModel: { provider: form.modelValue.slice(0, cut), model: form.modelValue.slice(cut + 1) } };
}

// src/client/api.mjs
var json = async (res) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? "http " + res.status), { status: res.status });
  return body;
};
var get = (path) => fetch(path, { credentials: "same-origin" }).then(json);
var send = (path, body, method = "POST") => fetch(path, {
  method,
  credentials: "same-origin",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body ?? {})
}).then(json);
var api = {
  state: () => get("dsh-l/state"),
  refresh: () => send("dsh-l/refresh", {}),
  putWatch: (repos) => send("dsh-l/watch", { repos }, "PUT"),
  discover: () => get("dsh-l/discover"),
  models: () => get("dsh-l/models"),
  triage: (keys, lang) => send("dsh-l/triage", { keys, lang }),
  override: (payload) => send("dsh-l/candidate/override", payload),
  stage: (key, stage, note) => send("dsh-l/candidate/stage", { key, stage, note }),
  gate: (key, gate, decision, note) => send("dsh-l/candidate/gate", { key, gate, decision, note }),
  settings: () => get("dsh-l/settings"),
  putSettings: (patch) => send("dsh-l/settings", patch, "PUT")
};

// src/client/components/candidateRow.mjs
var el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function renderRow(container, candidate, t, { expanded = false, onToggle, actions } = {}) {
  const row2 = el("div", "row");
  row2.append(el("span", "badge " + candidate.type, candidate.type === "pull" ? "PR" : "Issue"));
  const title = el("button", "title", candidate.repo + "#" + candidate.number + "  " + candidate.title);
  title.type = "button";
  title.setAttribute("aria-expanded", String(expanded));
  title.onclick = () => onToggle?.(candidate.key);
  row2.append(title);
  if (candidate.triage) {
    row2.append(
      el("span", "chip u-" + candidate.triage.urgency, t("urgency." + candidate.triage.urgency)),
      el("span", "chip v-" + candidate.triage.validity, t("validity." + candidate.triage.validity)),
      el("span", "chip", t("recommendedActions." + candidate.triage.action))
    );
  } else {
    row2.append(el("span", "chip muted", t("validity.none")));
  }
  container.append(row2);
  if (expanded) {
    const detail = el("div", "detail");
    if (candidate.triage?.reason) detail.append(el("p", "reason", candidate.triage.reason));
    actions?.(detail, candidate);
    container.append(detail);
  }
  return row2;
}

// src/client/components/workbench.mjs
var CSS = [
  ":host{display:flex;flex-direction:column;height:100%;font-size:14px;line-height:1.45;color:inherit}",
  "header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  "h2{font-size:15px;margin:0 8px 0 0;font-weight:600}",
  "button,select,input{font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:6px;padding:3px 10px;cursor:pointer}",
  "button:hover:not(:disabled){background:color-mix(in srgb,currentColor 7%,transparent)}",
  "button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid color-mix(in srgb,currentColor 55%,transparent);outline-offset:1px}",
  "button:disabled{opacity:.45;cursor:default}",
  ".meta{margin-left:auto;font-size:12px;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".bar{display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap}",
  "main{flex:1;overflow:auto;padding:0 16px 24px}",
  ".group>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 4px;color:color-mix(in srgb,currentColor 60%,transparent)}",
  ".group.dim{opacity:.6}",
  ".row{display:flex;align-items:center;gap:8px;min-height:32px;border-bottom:1px solid color-mix(in srgb,currentColor 7%,transparent)}",
  ".row .title{flex:1;min-width:0;text-align:left;border:none;padding:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".badge{font-size:11px;font-weight:600;padding:0 6px;border-radius:4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent)}",
  ".chip{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);white-space:nowrap}",
  ".chip.u-P0{font-weight:600;border-color:currentColor}",
  ".chip.muted{color:color-mix(in srgb,currentColor 45%,transparent)}",
  ".detail{padding:8px 0 12px 44px;display:flex;flex-direction:column;gap:8px}",
  ".detail .reason{margin:0;color:color-mix(in srgb,currentColor 75%,transparent)}",
  ".empty,.error{padding:24px 0;color:color-mix(in srgb,currentColor 55%,transparent)}"
].join("\n");
var el2 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function mountWorkbench(shadow, { getLang, build, extend } = {}) {
  let state = null;
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  const filters = { type: "all", repo: "all", urgency: "all" };
  const expanded = /* @__PURE__ */ new Set();
  const view = {};
  const select = (pairs, value, onChange, label) => {
    const s = el2("select");
    s.setAttribute("aria-label", label);
    for (const [v, text] of pairs) {
      const o = el2("option", null, text);
      o.value = v;
      s.append(o);
    }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  };
  const paint = () => {
    if (disposed) return;
    const t = makeT(getLang());
    shadow.innerHTML = "";
    shadow.host.dataset.dshLBuild = build;
    const style = el2("style");
    style.textContent = CSS;
    const header = el2("header");
    header.append(el2("h2", null, t("panelLabel")));
    const refreshBtn = el2("button", null, busy ? t("refreshing") : t("refresh"));
    refreshBtn.type = "button";
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    extend?.header?.(header, { t, state, view });
    const last = state?.snapshots?.lastIngestAt;
    header.append(el2("span", "meta", t("meta.lastRefreshAt") + ": " + (last ? new Date(last).toLocaleString(getLang()) : "\u2014")));
    const strip = el2("div", "strip");
    extend?.strip?.(strip, { t, state });
    const bar = el2("div", "bar");
    const repos = [...new Set((state?.candidates ?? []).map((c) => c.repo))].sort();
    bar.append(
      select([["all", t("filters.all")], ["issue", t("filters.issues")], ["pull", t("filters.pullRequests")]], filters.type, (v) => {
        filters.type = v;
        paint();
      }, t("filters.all")),
      select([["all", t("filters.repo")], ...repos.map((r) => [r, r])], filters.repo, (v) => {
        filters.repo = v;
        paint();
      }, t("filters.repo")),
      select([["all", t("filters.urgency")], ...["P0", "P1", "P2", "P3"].map((u) => [u, t("urgency." + u)])], filters.urgency, (v) => {
        filters.urgency = v;
        paint();
      }, t("filters.urgency"))
    );
    extend?.bar?.(bar, { t, state, filters, view });
    const main = el2("main");
    if (error) main.append(el2("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) main.append(el2("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      main.append(el2("div", "empty", t("emptyStates.backlog")));
    } else {
      for (const group of groupCandidates(list, t)) {
        if (group.items.length === 0) continue;
        const sec = el2("section", "group" + (group.dim ? " dim" : ""));
        sec.append(el2("h3", null, group.label + " \xB7 " + group.items.length));
        for (const c of group.items) {
          renderRow(sec, c, t, {
            expanded: expanded.has(c.key),
            onToggle: (key) => {
              if (expanded.has(key)) expanded.delete(key);
              else expanded.add(key);
              paint();
            },
            actions: extend?.rowActions ? (detail, cand) => extend.rowActions(detail, cand, { t, view, lang: getLang() }) : void 0
          });
        }
        main.append(sec);
      }
    }
    shadow.append(style, header, strip, bar, main);
  };
  view.reload = async () => {
    try {
      state = await api.state();
      error = null;
    } catch (e) {
      error = e.message;
    }
    paint();
  };
  view.refresh = async () => {
    busy = true;
    paint();
    try {
      const r = await api.refresh();
      notice = r.authenticated === false ? makeT(getLang())("errors.noToken") : null;
    } catch (e) {
      error = e.message;
    }
    busy = false;
    await view.reload();
  };
  view.relabel = paint;
  view.dispose = () => {
    disposed = true;
    shadow.innerHTML = "";
  };
  view.state = () => state;
  view.shadow = shadow;
  paint();
  view.reload();
  return view;
}

// src/client/components/repoPicker.mjs
var REPO_RE = /^[\w.-]+\/[\w.-]+$/;
function openRepoPicker(shadow, { t, current, onSaved }) {
  const selected = new Set(current);
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", t("repoPicker.title"));
  dialog.style.cssText = "width:min(440px,92%);max-height:70vh;display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:10px;background:canvas;color:canvastext;border:1px solid color-mix(in srgb,currentColor 18%,transparent)";
  const title = document.createElement("h3");
  title.textContent = t("repoPicker.title");
  title.style.margin = "0";
  const list = document.createElement("div");
  list.style.cssText = "overflow:auto;flex:1";
  const renderList = (names) => {
    list.innerHTML = "";
    for (const name2 of [.../* @__PURE__ */ new Set([...selected, ...names])].sort()) {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;gap:8px;padding:2px 0";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(name2);
      cb.onchange = () => {
        if (cb.checked) selected.add(name2);
        else selected.delete(name2);
      };
      label.append(cb, document.createTextNode(name2));
      list.append(label);
    }
  };
  renderList([]);
  const discover = document.createElement("button");
  discover.type = "button";
  discover.textContent = t("repoPicker.discover");
  discover.onclick = async () => {
    discover.disabled = true;
    try {
      renderList((await api.discover()).repos.map((r) => r.fullName));
    } catch {
    } finally {
      discover.disabled = false;
    }
  };
  const input = document.createElement("input");
  input.placeholder = t("repoPicker.addManually");
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "+";
  add.onclick = () => {
    const v = input.value.trim();
    if (REPO_RE.test(v)) {
      selected.add(v);
      input.value = "";
      renderList([]);
    }
  };
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = t("repoPicker.save");
  const close = () => overlay.remove();
  save.onclick = async () => {
    await api.putWatch([...selected]);
    close();
    onSaved?.();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  overlay.onkeydown = (e) => {
    if (e.key === "Escape") close();
  };
  const addRow = document.createElement("div");
  addRow.style.cssText = "display:flex;gap:6px";
  addRow.append(input, add);
  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;gap:6px;justify-content:space-between";
  footer.append(discover, save);
  dialog.append(title, list, addRow, footer);
  overlay.append(dialog);
  shadow.append(overlay);
  input.focus();
}

// src/client/components/pipelineStrip.mjs
var STAGES = [["ingest", false], ["backlog", false], ["triage", false], ["feedback", false], ["build", true], ["verify", true], ["ship", true]];
function renderStrip(container, { t, candidates }) {
  const counts = stageCounts(candidates);
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:4px;padding:8px 16px 0;flex-wrap:wrap";
  for (const [key, dim] of STAGES) {
    const cell = document.createElement("span");
    cell.className = "chip";
    if (dim) {
      cell.style.opacity = ".45";
      cell.title = t("gateV1Hint");
    }
    cell.textContent = t("stages." + key) + " " + counts[key];
    wrap.append(cell);
  }
  container.append(wrap);
}

// src/client/components/actions.mjs
function openSettings(shadow, { t, current, onSaved }) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", t("settings.title"));
  dialog.style.cssText = "width:min(360px,92%);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:10px;background:canvas;color:canvastext;border:1px solid color-mix(in srgb,currentColor 18%,transparent)";
  const title = document.createElement("h3");
  title.textContent = t("settings.title");
  title.style.margin = "0";
  const label = document.createElement("label");
  label.textContent = t("settings.intervalMinutes");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "1440";
  input.step = "1";
  input.value = String(current?.intervalMinutes ?? 0);
  const modelSel = document.createElement("select");
  modelSel.setAttribute("aria-label", t("settings.triageModel"));
  const initialModel = current?.triageModel ?? null;
  const valueOf = (sel2) => sel2 ? sel2.provider + "\n" + sel2.model : "";
  const fill = (providers, hostDefault) => {
    modelSel.innerHTML = "";
    const follow = document.createElement("option");
    follow.value = "";
    follow.textContent = t("settings.followDefault") + "\uFF08" + (hostDefault ? hostDefault.provider + " / " + hostDefault.model : "\u2014") + "\uFF09";
    modelSel.append(follow);
    let listed = false;
    for (const p of providers) {
      const og = document.createElement("optgroup");
      og.label = p.name || p.provider;
      for (const m of p.models) {
        const o = document.createElement("option");
        o.value = p.provider + "\n" + m.id;
        o.textContent = m.name || m.id;
        if (initialModel && p.provider === initialModel.provider && m.id === initialModel.model) listed = true;
        og.append(o);
      }
      modelSel.append(og);
    }
    if (initialModel && !listed) {
      const o = document.createElement("option");
      o.value = valueOf(initialModel);
      o.textContent = initialModel.provider + " / " + initialModel.model + " " + t("settings.notInCatalog");
      modelSel.append(o);
    }
    modelSel.value = valueOf(initialModel);
  };
  fill([], null);
  api.models().then((r) => fill(r.providers, r.hostDefault)).catch(() => {
  });
  const modelLabel = document.createElement("label");
  modelLabel.textContent = t("settings.triageModel");
  const err = document.createElement("div");
  err.style.cssText = "font-size:12px;display:none";
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = t("settings.save");
  const close = () => overlay.remove();
  save.onclick = async () => {
    save.disabled = true;
    err.style.display = "none";
    try {
      await api.putSettings(settingsPatch(current ?? {}, { intervalMinutes: Number(input.value), modelValue: modelSel.value }));
      close();
      onSaved?.();
    } catch (e) {
      err.textContent = e.message;
      err.style.display = "block";
    } finally {
      save.disabled = false;
    }
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  overlay.onkeydown = (e) => {
    if (e.key === "Escape") close();
  };
  dialog.append(title, label, input, modelLabel, modelSel, err, save);
  overlay.append(dialog);
  shadow.append(overlay);
  input.focus();
}
var btn = (text, onClick, disabled = false) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.disabled = disabled;
  b.onclick = onClick;
  return b;
};
var sel = (pairs, value) => {
  const s = document.createElement("select");
  for (const [v, text] of pairs) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = text;
    s.append(o);
  }
  s.value = value;
  return s;
};
var row = () => {
  const d = document.createElement("div");
  d.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center";
  return d;
};
var copy = (obj) => navigator.clipboard?.writeText(JSON.stringify(obj, null, 2)).catch(() => {
});
function installActions({ getLang }) {
  const run = (view) => async (fn) => {
    try {
      await fn();
    } catch (e) {
      console.warn("[dsh-l]", e);
    }
    await view.reload();
  };
  return {
    header(header, { t, state, view }) {
      header.append(btn(t("watchedRepos"), () => openRepoPicker(view.shadow, { t, current: state?.watch?.repos ?? [], onSaved: () => view.refresh() })));
      header.append(btn(t("settings.title"), () => openSettings(view.shadow, { t, current: state?.settings ?? { intervalMinutes: 0 }, onSaved: () => view.reload() })));
    },
    strip(container, { t, state }) {
      renderStrip(container, { t, candidates: state?.candidates ?? [] });
    },
    bar(bar, { t, state, filters, view }) {
      const keys = pickTriageBatch(state?.candidates ?? [], filters);
      bar.append(btn(t("actions.triageBatch") + " (" + keys.length + ")", () => run(view)(() => api.triage(keys, getLang())), keys.length === 0));
    },
    rowActions(detail, c, { t, view, lang }) {
      const go = run(view);
      const tr = c.triage ?? { validity: "medium", urgency: "P2", action: "hold", reason: "" };
      const v = sel(["high", "medium", "low"].map((x) => [x, t("validity." + x)]), tr.validity);
      const u = sel(["P0", "P1", "P2", "P3"].map((x) => [x, t("urgency." + x)]), tr.urgency);
      const a = sel(["start", "feedback", "close", "hold"].map((x) => [x, t("recommendedActions." + x)]), tr.action);
      const reason = document.createElement("input");
      reason.value = tr.reason ?? "";
      reason.placeholder = t("actions.reason");
      const override = row();
      override.append(v, u, a, reason, btn(t("actions.override"), () => go(() => api.override({ key: c.key, validity: v.value, urgency: u.value, action: a.value, reason: reason.value, lang }))));
      const stages = row();
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        stages.append(btn(t("actions.moveTo") + " " + label, () => go(() => api.stage(c.key, s, "")), c.stage === s));
      }
      const gates = row();
      const g = gateState(c);
      gates.append(
        btn("G1 " + t("gates.G1") + " \xB7 " + t("actions.pass"), () => go(async () => {
          const r = await api.gate(c.key, "G1", "pass", "");
          if (r.taskPackage) await copy(r.taskPackage);
        }), !g.G1),
        btn("G1 \xB7 " + t("actions.reject"), () => go(() => api.gate(c.key, "G1", "reject", "")), !g.G1),
        btn("G2 " + t("gates.G2"), () => {
        }, true),
        btn("G3 " + t("gates.G3"), () => {
        }, true)
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    }
  };
}

// src/client/index.mjs
var React = require("react");
var h = React.createElement;
var BUILD = true ? "f47a122da44a" : "dev";
var PANEL_KEY = "dsh-l.workbench";
var name = "dsh-l";
var isPlugin = true;
var inject = ["slots"];
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
      const view = mountWorkbench(shadow, { getLang: lang.get, build: BUILD, extend: installActions({ getLang: lang.get }) });
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
/* dsh-l-build:f47a122da44a */
