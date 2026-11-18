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
  panelLabel: "DSH Loop Forge",
  refresh: "\u5237\u65B0",
  refreshing: "\u5237\u65B0\u4E2D\u2026",
  watchedRepos: "\u76D1\u770B\u4ED3\u5E93",
  sections: { intake: "\u6536\u6D3B", triage: "\u5206\u8BCA\u4E0E\u62CD\u677F" },
  intake: { repos: "\u4E2A\u76D1\u770B\u4ED3", none: "\u8FD8\u6CA1\u6709\u76D1\u770B\u4EFB\u4F55\u4ED3\u5E93" },
  auth: {
    loading: "\u6B63\u5728\u8FDE\u63A5\u5DE5\u4F5C\u53F0\u2026",
    loginTitle: "\u8FDE\u63A5 GitHub\uFF0C\u4EA4\u4ED8\u4ECE\u6B64\u6210\u73AF",
    loginIntro: "\u5DE5\u4F5C\u53F0\u590D\u7528\u672C\u673A gh \u767B\u5F55\u6001\u8BBF\u95EE GitHub\uFF1A\u6388\u6743\u6821\u9A8C\u901A\u8FC7\u540E\uFF0C\u5373\u53EF\u52FE\u9009\u76D1\u770B\u4ED3\u5E93\u3001\u6444\u53D6\u5019\u9009\u3002",
    ghCli: "gh CLI",
    ghInstalled: "\u5DF2\u5B89\u88C5",
    ghMissing: "\u672A\u5B89\u88C5",
    credential: "GitHub \u51ED\u636E",
    credReady: "\u5DF2\u5C31\u7EEA",
    credMissing: "\u672A\u6388\u6743",
    installBtn: "\u4E00\u952E\u5B89\u88C5 gh CLI",
    installRetry: "\u91CD\u8BD5\u5B89\u88C5 gh CLI",
    installing: "\u6B63\u5728\u540E\u53F0\u5B89\u88C5 gh CLI\u2026",
    installNote: "\u4ECE GitHub \u5B98\u65B9\u53D1\u5E03\u6E90\u4E0B\u8F7D\uFF08\u7EA6 15MB\uFF09\u88C5\u5165\u63D2\u4EF6\u79C1\u6709\u76EE\u5F55\uFF1A\u65E0\u9700 root\uFF0C\u4E0D\u52A8\u7CFB\u7EDF\u73AF\u5883\u3002",
    installFailed: "gh CLI \u5B89\u88C5\u5931\u8D25",
    deviceBtn: "\u6388\u6743\u767B\u5F55 GitHub",
    deviceWaiting: "\u7B49\u5F85\u4F60\u5728 GitHub \u5B8C\u6210\u6388\u6743\u2026",
    deviceHanding: "\u6388\u6743\u6210\u529F\uFF0C\u6B63\u5728\u79FB\u4EA4\u7ED9 gh \u51ED\u636E\u5E93\u2026",
    copy: "\u590D\u5236",
    deviceNote: "\u65E0\u9700\u624B\u52A8\u8F93\u5165\u7528\u6237\u540D\u2014\u2014\u6388\u6743\u5B8C\u6210\u540E\u81EA\u52A8\u8FDB\u5165\u5DE5\u4F5C\u53F0\u3002",
    deviceExpired: "\u6388\u6743\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77\u6388\u6743",
    deviceFailed: "\u6388\u6743\u5931\u8D25",
    enterBtn: "\u8FDB\u5165\u5DE5\u4F5C\u53F0",
    entering: "\u6B63\u5728\u8FDB\u5165\u2026",
    readyNote: "\u68C0\u6D4B\u5230\u672C\u673A\u51ED\u636E\u5DF2\u5C31\u7EEA\uFF0C\u4E00\u952E\u8FDB\u5165\uFF0C\u65E0\u9700\u518D\u586B\u7528\u6237\u540D\u3002",
    connected: "\u5DF2\u8FDE\u63A5",
    logout: "\u9000\u51FA",
    logoutHint: "\u9000\u51FA\u53EA\u89E3\u9664\u5DE5\u4F5C\u53F0\u7ED1\u5B9A\uFF0C\u4E0D\u5F71\u54CD\u672C\u673A gh \u767B\u5F55\u6001\uFF1B\u9700\u5F7B\u5E95\u64A4\u9500\u65F6\u5728\u7EC8\u7AEF\u6267\u884C gh auth logout\u3002",
    errGhNotInstalled: "\u672A\u68C0\u6D4B\u5230 gh CLI\uFF1A\u70B9\u4E0A\u65B9\u6309\u94AE\u4E00\u952E\u5B89\u88C5\uFF0C\u6216\u5728\u7EC8\u7AEF\u81EA\u884C\u5B89\u88C5\u3002",
    errGhNotAuthorized: "gh \u5C1A\u672A\u6388\u6743\uFF1A\u70B9\u4E0A\u65B9\u6309\u94AE\u5B8C\u6210\u6388\u6743\u767B\u5F55\u3002",
    errTokenInvalid: "token \u6821\u9A8C\u672A\u901A\u8FC7\uFF08\u53EF\u80FD\u5DF2\u5931\u6548\u6216\u7F51\u7EDC\u5F02\u5E38\uFF09\uFF1A\u8BF7\u91CD\u65B0\u6388\u6743\u540E\u91CD\u8BD5\u3002"
  },
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
  tabs: { list: "\u6E05\u5355", board: "\u770B\u677F", review: "\u5F85\u6211\u786E\u8BA4", roles: "\u89D2\u8272" },
  roles: {
    search: "\u641C\u7D22\u89D2\u8272\uFF08\u540D\u79F0/ID/\u804C\u8D23\uFF09",
    empty: "\u6CA1\u6709\u5339\u914D\u7684\u89D2\u8272",
    overridden: "\u5DF2\u8986\u76D6\u5185\u7F6E",
    policyAuto: "\u81EA\u52A8",
    policyAsk: "\u6BCF\u6B21\u8BE2\u95EE",
    uses: "\u4E2A\u8282\u70B9\u5F15\u7528",
    unused: "\u672A\u88AB\u5F15\u7528",
    edit: "\u7F16\u8F91",
    editTitle: "\u7F16\u8F91\u89D2\u8272",
    new: "\u65B0\u589E\u89D2\u8272",
    roleId: "\u89D2\u8272 ID",
    name: "\u540D\u79F0",
    description: "\u804C\u8D23\u63CF\u8FF0",
    prompt: "Prompt\uFF08\u89D2\u8272\u63D0\u793A\u8BCD\uFF09",
    executionPolicy: "\u6267\u884C\u7B56\u7565",
    save: "\u4FDD\u5B58",
    cancel: "\u53D6\u6D88",
    delete: "\u5220\u9664",
    deleteConfirm: "\u786E\u8BA4\u5220\u9664\u89D2\u8272 {id}\uFF1F\uFF08\u5185\u7F6E\u8986\u76D6\u5C42\u5220\u9664\u540E\u56DE\u843D\u5185\u7F6E\u9ED8\u8BA4\uFF09",
    inUse: "\u88AB\u5DE5\u4F5C\u6D41\u8282\u70B9\u5F15\u7528\uFF0C\u7981\u5220"
  },
  review: { gates: "\u5F85\u4F60\u653E\u884C", release: "\u5F85\u53D1\u7248\u786E\u8BA4", failed: "\u6267\u884C\u5931\u8D25", confirm: "\u786E\u8BA4\u5DF2\u53D1\u7248", empty: "\u6CA1\u6709\u5F85\u786E\u8BA4\u4E8B\u9879" },
  feishu: { url: "\u98DE\u4E66 Webhook URL", save: "\u4FDD\u5B58 Webhook", saveOk: "Webhook \u5DF2\u4FDD\u5B58", test: "\u53D1\u9001\u6D4B\u8BD5\u6D88\u606F", testOk: "\u6D4B\u8BD5\u6D88\u606F\u5DF2\u53D1\u9001", testFail: "\u6D4B\u8BD5\u53D1\u9001\u5931\u8D25" },
  badge: { pending: "\u5F85\u786E\u8BA4 ({n})" },
  actions: { triageBatch: "\u5206\u8BCA\u5F85\u5206\u8BCA", override: "\u4FDD\u5B58\u4EBA\u5DE5\u5224\u65AD", reason: "\u7406\u7531", moveTo: "\u79FB\u5230", pass: "\u653E\u884C", reject: "\u9A73\u56DE", copyPackage: "\u590D\u5236\u4EFB\u52A1\u5305", cancelRun: "\u53D6\u6D88\u6267\u884C", retryRun: "\u91CD\u8BD5\u8BE5\u8282\u70B9" },
  run: {
    status: { running: "\u6267\u884C\u4E2D", waiting: "\u5F85\u4F60\u653E\u884C", succeeded: "\u5DF2\u4EA4\u4ED8", failed: "\u5931\u8D25", cancelled: "\u5DF2\u53D6\u6D88" },
    workspaceCloning: "\u5DE5\u4F5C\u533A\u514B\u9686\u4E2D"
  },
  gateV1Hint: "\u6267\u884C\u73AF v2\uFF1AG1/G2 \u4EBA\u5DE5\u653E\u884C\uFF1BG3 \u53D1\u7248\u95F8\u4E8E\u540E\u7EED\u7248\u672C\u5F00\u653E",
  settings: { title: "\u8BBE\u7F6E", intervalMinutes: "\u81EA\u52A8\u5237\u65B0\u95F4\u9694\uFF08\u5206\u949F\uFF0C0 = \u5173\u95ED\uFF09", save: "\u4FDD\u5B58", triageModel: "\u5206\u8BCA\u6A21\u578B", followDefault: "\u8DDF\u968F\u5BBF\u4E3B\u9ED8\u8BA4", notInCatalog: "\uFF08\u4E0D\u5728\u76EE\u5F55\u4E2D\uFF09" }
};

// src/client/locale/en.mjs
var en = {
  panelLabel: "DSH Loop Forge",
  refresh: "Refresh",
  refreshing: "Refreshing\u2026",
  watchedRepos: "Watched repos",
  sections: { intake: "Intake", triage: "Triage & decisions" },
  intake: { repos: "watched repos", none: "No repositories watched yet" },
  auth: {
    loading: "Connecting the workbench\u2026",
    loginTitle: "Connect GitHub \u2014 where delivery becomes a loop",
    loginIntro: "The workbench reaches GitHub through this machine's gh login: once verified, you can pick repositories and ingest candidates.",
    ghCli: "gh CLI",
    ghInstalled: "installed",
    ghMissing: "not installed",
    credential: "GitHub credential",
    credReady: "ready",
    credMissing: "not authorized",
    installBtn: "Install gh CLI for me",
    installRetry: "Retry gh CLI install",
    installing: "Installing gh CLI in the background\u2026",
    installNote: "Downloaded from the official GitHub release (about 15MB) into the plugin's private directory: no root, no system changes.",
    installFailed: "gh CLI install failed",
    deviceBtn: "Sign in with GitHub",
    deviceWaiting: "Waiting for you to authorize on GitHub\u2026",
    deviceHanding: "Authorized \u2014 handing over to the gh credential store\u2026",
    copy: "Copy",
    deviceNote: "No username typing required \u2014 you enter the workbench automatically once authorized.",
    deviceExpired: "The device code expired. Start the authorization again.",
    deviceFailed: "Authorization failed",
    enterBtn: "Enter workbench",
    entering: "Entering\u2026",
    readyNote: "A local credential is ready \u2014 one click to enter, no username needed.",
    connected: "Connected",
    logout: "Sign out",
    logoutHint: "Signing out only unbinds the workbench; the local gh login stays. Run gh auth logout in a terminal to revoke it fully.",
    errGhNotInstalled: "gh CLI not found: use the button above to install it, or install it in a terminal.",
    errGhNotAuthorized: "gh is not authorized yet: use the button above to sign in.",
    errTokenInvalid: "Token verification failed (expired or network error): authorize again and retry."
  },
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
  tabs: { list: "List", board: "Board", review: "Needs review", roles: "Roles" },
  roles: {
    search: "Search roles (name/id/description)",
    empty: "No matching roles",
    overridden: "overrides builtin",
    policyAuto: "Auto",
    policyAsk: "Ask each time",
    uses: "node refs",
    unused: "unused",
    edit: "Edit",
    editTitle: "Edit role",
    new: "New role",
    roleId: "Role ID",
    name: "Name",
    description: "Description",
    prompt: "Prompt (role instructions)",
    executionPolicy: "Execution policy",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    deleteConfirm: "Delete role {id}? (builtin overrides fall back to the builtin default)",
    inUse: "Referenced by workflow nodes; deletion disabled"
  },
  review: { gates: "Waiting for you", release: "Release pending", failed: "Failed", confirm: "Confirm released", empty: "Nothing waiting for you" },
  feishu: { url: "Feishu webhook URL", save: "Save webhook", saveOk: "Webhook saved", test: "Send test message", testOk: "Test message sent", testFail: "Test send failed" },
  badge: { pending: "Pending ({n})" },
  actions: { triageBatch: "Triage inbox", override: "Save my judgment", reason: "Reason", moveTo: "Move to", pass: "Pass", reject: "Reject", copyPackage: "Copy task package", cancelRun: "Cancel run", retryRun: "Retry node" },
  run: {
    status: { running: "Running", waiting: "Waiting for you", succeeded: "Delivered", failed: "Failed", cancelled: "Cancelled" },
    workspaceCloning: "Cloning workspace"
  },
  gateV1Hint: "Loop v2: G1/G2 human gates; the G3 release gate opens later",
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

// src/client/badge.mjs
var badge = { count: 0 };

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
function stripCells({ candidates, workflow, runs = [] } = {}) {
  const counts = stageCounts(candidates);
  const pre = [["ingest", counts.ingest], ["backlog", counts.backlog], ["triage", counts.triage], ["feedback", counts.feedback]].map(([key, count]) => ({ key, count }));
  const template = workflow?.templates?.[0];
  const inFlight = (nodeId) => (runs ?? []).filter((r) => (r.currentNodeIds ?? []).includes(nodeId)).length;
  const loop = (template?.nodes ?? []).map((n) => {
    const count = inFlight(n.id);
    return { id: n.id, name: n.name, type: n.type, count, dim: count === 0 };
  });
  return { pre, loop, fallback: !workflow?.templates?.length };
}
function runBlock(candidate, runs = []) {
  if (!candidate?.currentRunId) return null;
  return (runs ?? []).find((r) => r.id === candidate.currentRunId) ?? null;
}
function roleRows({ roles, workflow, query = "" } = {}) {
  const uses = /* @__PURE__ */ new Map();
  for (const t of workflow?.templates ?? []) {
    for (const n of t.nodes ?? []) {
      if (n.type === "agent" && n.roleId) uses.set(n.roleId, (uses.get(n.roleId) ?? 0) + 1);
    }
  }
  const q = query.trim().toLowerCase();
  return (roles ?? []).filter((r) => !q || [r.name, r.id, r.description ?? ""].some((f) => String(f).toLowerCase().includes(q))).map((r) => ({ ...r, uses: uses.get(r.id) ?? 0 }));
}
function needsReview({ candidates, runs = [] } = {}) {
  const gone = new Set((candidates ?? []).filter((c) => (c.history ?? []).some((h2) => h2.event === "upstream-gone")).map((c) => c.key));
  const gateRuns = (runs ?? []).filter((r) => r.status === "waiting" && r.waitingGate && !gone.has(r.candidateKey));
  const failedRuns = (runs ?? []).filter((r) => r.status === "failed");
  const releaseList = (candidates ?? []).filter((c) => c.stage === "shipped" && !c.release?.confirmedAt);
  return { gateRuns, failedRuns, releaseList, count: gateRuns.length + releaseList.length };
}
function kanbanColumns({ candidates } = {}) {
  const movableStages = /* @__PURE__ */ new Set(["inbox", "triaged", "gating", "shipped", "held", "closed"]);
  const columns = [["inbox", false], ["triaged", false], ["gating", false], ["building", false], ["shipped", false], ["closed", false]].map(([id, dim]) => ({ id, dim, cards: [], movable: false }));
  const byId = Object.fromEntries(columns.map((col) => [col.id, col]));
  for (const c of candidates ?? []) {
    const col = byId[bucketOf(c.stage)];
    if (col) col.cards.push({ ...c, movable: movableStages.has(c.stage) });
  }
  return { columns };
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
  auth: () => get("dsh-l/auth"),
  bind: (account) => send("dsh-l/auth/bind", account ? { account } : {}),
  logout: () => send("dsh-l/auth/logout", {}),
  installGh: () => send("dsh-l/auth/install-gh", {}),
  deviceStart: () => send("dsh-l/auth/device", {}),
  deviceStatus: () => get("dsh-l/auth/device"),
  refresh: () => send("dsh-l/refresh", {}),
  putWatch: (repos) => send("dsh-l/watch", { repos }, "PUT"),
  discover: () => get("dsh-l/discover"),
  models: () => get("dsh-l/models"),
  triage: (keys, lang) => send("dsh-l/triage", { keys, lang }),
  override: (payload) => send("dsh-l/candidate/override", payload),
  stage: (key, stage, note) => send("dsh-l/candidate/stage", { key, stage, note }),
  gate: (key, gate, decision, note) => send("dsh-l/candidate/gate", { key, gate, decision, note }),
  runStart: (key, note = "") => send("dsh-l/run/start", { key, note }),
  runGate: (runId, nodeId, decision, note = "", targetNode = null) => send("dsh-l/run/gate", { runId, nodeId, decision, note, targetNode }),
  runCancel: (runId, reason = "user") => send("dsh-l/run/cancel", { runId, reason }),
  runRetry: (runId, nodeId) => send("dsh-l/run/retry", { runId, nodeId }),
  releaseConfirm: (key, note = "") => send("dsh-l/release/confirm", { key, note }),
  rolesList: () => get("dsh-l/roles"),
  rolesUpsert: (role) => send("dsh-l/roles", { role }),
  rolesDelete: (id) => send("dsh-l/roles/delete", { id }),
  feishuTest: () => send("dsh-l/feishu/test", {}),
  putFeishuWebhook: (url) => send("dsh-l/feishu/webhook", { url }, "PUT"),
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

// src/client/components/loginGate.mjs
var errText = (t, message) => {
  const m = String(message ?? "");
  if (m.startsWith("gh-not-installed")) return t("auth.errGhNotInstalled");
  if (m.startsWith("gh-not-authorized")) return t("auth.errGhNotAuthorized");
  if (m.startsWith("token-invalid")) return t("auth.errTokenInvalid");
  return t("errors.refreshFailed") + " (" + m + ")";
};
var MARK = '<svg width="26" height="26" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M14.41 27.87A10.5 10.5 0 0 1 13.56 8.48" stroke="url(#dshl-mk-b)" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M21.59 8.13A10.5 10.5 0 0 1 22.44 27.52" stroke="url(#dshl-mk-t)" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M13.42 11.98 10.8 6.36 19.18 5.87Z" fill="url(#dshl-mk-b)" stroke="url(#dshl-mk-b)" stroke-width="1.5" stroke-linejoin="round"/><path d="M22.58 24.02 25.2 29.64 16.82 30.13Z" fill="url(#dshl-mk-t)" stroke="url(#dshl-mk-t)" stroke-width="1.5" stroke-linejoin="round"/><defs><linearGradient id="dshl-mk-b" x1="9" y1="8" x2="25" y2="29" gradientUnits="userSpaceOnUse"><stop stop-color="#69B9FF"/><stop offset="1" stop-color="#324DE2"/></linearGradient><linearGradient id="dshl-mk-t" x1="22" y1="8" x2="20" y2="28" gradientUnits="userSpaceOnUse"><stop stop-color="#45E7A4"/><stop offset="1" stop-color="#05909D"/></linearGradient></defs></svg>';
var svg = (markup) => {
  const s = document.createElement("span");
  s.innerHTML = markup;
  return s.firstElementChild;
};
var pill = (t, key, okKey, missKey, ok) => {
  const p = document.createElement("span");
  p.className = "pill";
  const dot = document.createElement("span");
  dot.className = "dot " + (ok ? "ok" : "miss");
  p.append(dot, document.createTextNode(t(key) + " \xB7 " + t(ok ? okKey : missKey)));
  return p;
};
function renderLoginGate(shadow, { t, status, onConnected }) {
  let local = status ?? {};
  let timer = null;
  let dead = false;
  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const draw = () => {
    if (dead) return;
    for (const el3 of [...shadow.children]) {
      if (el3.classList?.contains("gateWrap")) el3.remove();
    }
    const wrap = document.createElement("div");
    wrap.className = "gateWrap";
    const gate = document.createElement("article");
    gate.className = "gate";
    const head = document.createElement("div");
    head.className = "gateHead";
    const mark = document.createElement("div");
    mark.className = "gateMark";
    mark.append(svg(MARK));
    const pills = document.createElement("div");
    pills.className = "gateStatus";
    pills.style.margin = "0";
    pills.append(
      pill(t, "auth.ghCli", "auth.ghInstalled", "auth.ghMissing", local.installed === true),
      pill(t, "auth.credential", "auth.credReady", "auth.credMissing", local.tokenAvailable === true)
    );
    head.append(mark, pills);
    gate.append(head);
    const h2 = document.createElement("h3");
    h2.textContent = t("auth.loginTitle");
    const intro = document.createElement("p");
    intro.className = "intro";
    intro.textContent = t("auth.loginIntro");
    gate.append(h2, intro);
    const err = document.createElement("p");
    err.className = "err";
    err.setAttribute("role", "alert");
    err.style.display = "none";
    const installing = local.install?.phase === "installing";
    const installFailed = local.install?.phase === "failed";
    const hasGh = local.installed === true;
    const hasToken = local.tokenAvailable === true;
    const dv = local.device ?? {};
    const pending = dv.phase === "pending";
    const handing = dv.phase === "authorizing";
    const cta = document.createElement("button");
    cta.className = "cta";
    cta.type = "button";
    if (installing) {
      cta.disabled = true;
      cta.textContent = t("auth.installing");
      gate.append(cta);
    } else if (!hasGh) {
      cta.textContent = installFailed ? t("auth.installRetry") : t("auth.installBtn");
      cta.onclick = async () => {
        cta.disabled = true;
        try {
          await api.installGh();
          local = { ...local, install: { phase: "installing" } };
        } catch (e) {
          err.textContent = errText(t, e?.message);
          err.style.display = "block";
        }
        draw();
        schedule();
      };
      gate.append(cta);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.installNote");
      gate.append(note);
      if (installFailed) {
        err.textContent = t("auth.installFailed") + " (" + (local.install?.error ?? "") + ")";
        err.style.display = "block";
      }
    } else if (hasToken) {
      cta.textContent = (local.viewerLogin ?? "GitHub") + " \xB7 " + t("auth.enterBtn");
      cta.onclick = async () => {
        cta.disabled = true;
        cta.textContent = t("auth.entering");
        try {
          await api.bind();
          stop();
          onConnected?.();
          return;
        } catch (e) {
          err.textContent = errText(t, e?.message);
          err.style.display = "block";
          draw();
          schedule();
        }
      };
      gate.append(cta);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.readyNote");
      gate.append(note);
    } else if (pending || handing) {
      const codeBox = document.createElement("div");
      codeBox.className = "gateCode";
      const codeEl = document.createElement("b");
      codeEl.textContent = dv.userCode ?? "\xB7\xB7\xB7\xB7-\xB7\xB7\xB7\xB7";
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = t("auth.copy");
      copyBtn.onclick = () => navigator.clipboard?.writeText(dv.userCode ?? "").catch(() => {
      });
      codeBox.append(codeEl, copyBtn);
      const line = document.createElement("p");
      line.className = "intro";
      line.textContent = handing ? t("auth.deviceHanding") : t("auth.deviceWaiting");
      const link = document.createElement("a");
      link.className = "gateLink";
      link.href = dv.verificationUri ?? "https://github.com/login/device";
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = dv.verificationUri ?? "https://github.com/login/device";
      gate.append(codeBox, line, link);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.deviceNote");
      gate.append(note);
    } else {
      cta.textContent = t("auth.deviceBtn");
      cta.onclick = async () => {
        cta.disabled = true;
        try {
          const d = await api.deviceStart();
          local = { ...local, device: d };
        } catch (e) {
          err.textContent = errText(t, e?.message);
          err.style.display = "block";
        }
        draw();
        schedule();
      };
      gate.append(cta);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.deviceNote");
      gate.append(note);
      if (dv.phase === "expired") {
        err.textContent = t("auth.deviceExpired");
        err.style.display = "block";
      } else if (dv.phase === "failed") {
        err.textContent = t("auth.deviceFailed") + " (" + (dv.error ?? "") + ")";
        err.style.display = "block";
      }
    }
    gate.append(err);
    if (!["pending", "authorizing"].includes(dv.phase ?? "") && !installing && !hasToken) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.logoutHint");
      gate.append(note);
    }
    wrap.append(gate);
    shadow.append(wrap);
  };
  const schedule = () => {
    stop();
    if (local?.install?.phase === "installing") {
      timer = setTimeout(async () => {
        try {
          local = await api.auth();
        } catch {
        }
        draw();
        schedule();
      }, 2e3);
      return;
    }
    const ph = local?.device?.phase;
    if (ph === "authorized") {
      dead = true;
      stop();
      onConnected?.();
      return;
    }
    if (ph === "pending" || ph === "authorizing") {
      timer = setTimeout(async () => {
        try {
          const d = await api.deviceStatus();
          local = { ...local, device: d };
        } catch {
        }
        if (local?.device?.phase === "authorized") {
          dead = true;
          stop();
          onConnected?.();
          return;
        }
        draw();
        schedule();
      }, ph === "authorizing" ? 1500 : 4e3);
    }
  };
  draw();
  schedule();
}

// src/client/components/kanban.mjs
function renderKanban(container, { t, candidates, view }) {
  const { columns } = kanbanColumns({ candidates });
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:10px;padding:12px 16px;align-items:flex-start;overflow:auto";
  const MANUAL = ["inbox", "triaged", "gating", "shipped", "held", "closed"];
  for (const col of columns) {
    const colEl = document.createElement("div");
    colEl.style.cssText = "flex:1;min-width:150px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:8px;padding:8px";
    const head = document.createElement("div");
    head.style.cssText = "font-size:12px;font-weight:600;margin-bottom:6px";
    head.textContent = t("groups." + col.id) + " \xB7 " + col.cards.length;
    colEl.append(head);
    for (const card of col.cards) {
      const cardEl = document.createElement("div");
      cardEl.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:13px";
      const title = document.createElement("div");
      title.textContent = card.key + " " + (card.title ?? "");
      title.style.cssText = "margin-bottom:4px";
      cardEl.append(title);
      if (card.movable) {
        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:4px;flex-wrap:wrap";
        for (const target of MANUAL.filter((x) => x !== card.stage)) {
          const label = target === "held" ? t("recommendedActions.hold") : t("groups." + target);
          const b = document.createElement("button");
          b.textContent = "\u2192 " + label;
          b.style.cssText = "font-size:11px;padding:1px 6px";
          b.onclick = () => {
            api.stage(card.key, target, "\u770B\u677F\u8FC1\u79FB").then(() => view.reload()).catch(() => {
            });
          };
          btns.append(b);
        }
        cardEl.append(btns);
      }
      colEl.append(cardEl);
    }
    wrap.append(colEl);
  }
  container.append(wrap);
}

// src/client/components/review.mjs
function renderReview(container, { t, candidates, runs, view }) {
  const out = needsReview({ candidates, runs });
  const wrap = document.createElement("div");
  wrap.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:16px";
  const reload = () => view.reload();
  const act = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      console.warn("[dsh-l]", e);
    }
    await reload();
  };
  const card = (parent, titleText, err) => {
    const el3 = document.createElement("div");
    el3.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:13px";
    const head = document.createElement("div");
    head.style.cssText = "font-weight:600;margin-bottom:4px";
    head.textContent = titleText;
    el3.append(head);
    if (err) {
      const e2 = document.createElement("div");
      e2.style.color = "crimson";
      e2.textContent = err;
      el3.append(e2);
    }
    parent.append(el3);
    return el3;
  };
  const btn2 = (parent, label, fn, disabled = false) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.type = "button";
    b.disabled = disabled;
    b.style.cssText = "font-size:12px;padding:2px 10px;margin-right:6px";
    b.onclick = act(fn);
    parent.append(b);
  };
  const candidateOf = (key) => (candidates ?? []).find((c) => c.key === key);
  const gatesSec = document.createElement("section");
  gatesSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.gates") }));
  if (out.gateRuns.length === 0) gatesSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const r of out.gateRuns) {
    const c = candidateOf(r.candidateKey);
    const el3 = card(gatesSec, r.candidateKey + " " + (c?.title ?? ""), r.error);
    btn2(el3, t("actions.pass") + "\uFF08" + t("gates." + (r.waitingGateId ?? (r.waitingGate ?? "").toUpperCase())) + "\uFF09", () => api.runGate(r.id, r.waitingGate, "pass", ""));
    btn2(el3, t("actions.reject"), () => api.runGate(r.id, r.waitingGate, "reject", ""));
    btn2(el3, t("actions.cancelRun"), () => api.runCancel(r.id, "user"));
  }
  const releaseSec = document.createElement("section");
  releaseSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.release") }));
  if (out.releaseList.length === 0) releaseSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const c of out.releaseList) {
    const el3 = card(releaseSec, c.key + " " + (c.title ?? ""));
    btn2(el3, t("review.confirm"), () => api.releaseConfirm(c.key, ""));
  }
  const failedSec = document.createElement("section");
  failedSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.failed") }));
  if (out.failedRuns.length === 0) failedSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const r of out.failedRuns) {
    const el3 = card(failedSec, r.candidateKey + " " + (r.error ?? ""));
    for (const nid of r.failedNodeIds ?? []) btn2(el3, t("actions.retryRun") + " " + nid, () => api.runRetry(r.id, nid));
    btn2(el3, t("actions.cancelRun"), () => api.runCancel(r.id, "user"));
  }
  wrap.append(gatesSec, releaseSec, failedSec);
  container.append(wrap);
}

// src/client/components/rolesTab.mjs
function renderRolesTab(container, { t, workflow, view }) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:10px";
  const reload = () => view.reload();
  const act = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      console.warn("[dsh-l]", e);
    }
    await reload();
  };
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = t("roles.search");
  search.style.cssText = "font-size:13px;padding:4px 8px;max-width:280px";
  wrap.append(search);
  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:6px";
  wrap.append(list);
  const state = { roles: [], workflow: workflow ?? { templates: [] } };
  const paint = () => {
    list.textContent = "";
    const rows = roleRows({ roles: state.roles, workflow: state.workflow, query: search.value });
    if (rows.length === 0) list.append(Object.assign(document.createElement("div"), { textContent: t("roles.empty"), style: "opacity:.6" }));
    for (const r of rows) {
      const row2 = document.createElement("div");
      row2.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer";
      const who = document.createElement("div");
      who.style.cssText = "flex:1";
      const name2 = document.createElement("b");
      name2.textContent = r.name + (r.overridden ? " \xB7" + t("roles.overridden") : "");
      const desc = document.createElement("div");
      desc.style.cssText = "opacity:.7;font-size:12px";
      desc.textContent = r.description || r.id;
      who.append(name2, desc);
      const policy = document.createElement("span");
      policy.textContent = r.executionPolicy === "auto" ? t("roles.policyAuto") : t("roles.policyAsk");
      policy.style.cssText = "font-size:11px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:10px;padding:1px 8px";
      const uses = document.createElement("span");
      uses.textContent = r.uses > 0 ? r.uses + " " + t("roles.uses") : t("roles.unused");
      uses.style.cssText = "font-size:11px;opacity:.7";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = t("roles.edit");
      editBtn.style.cssText = "font-size:12px;padding:2px 10px";
      editBtn.onclick = () => openDialog(r);
      row2.append(who, policy, uses, editBtn);
      row2.onclick = () => openDialog(r);
      list.append(row2);
    }
  };
  search.oninput = paint;
  const openDialog = (role) => {
    const isNew = !role;
    const dlg = document.createElement("div");
    dlg.style.cssText = "position:fixed;inset:0;background:color-mix(in srgb,black 40%,transparent);display:flex;align-items:center;justify-content:center;z-index:60";
    const box = document.createElement("div");
    box.style.cssText = "background:var(--dsh-bg,#fff);color:inherit;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:340px;max-width:90vw;font-size:13px";
    const field = (labelText, input) => {
      const row2 = document.createElement("label");
      row2.style.cssText = "display:flex;flex-direction:column;gap:2px";
      row2.append(Object.assign(document.createElement("span"), { textContent: labelText, style: "font-size:12px;opacity:.8" }));
      input.style.cssText = "font-size:13px;padding:4px 6px";
      row2.append(input);
      return row2;
    };
    const idInput = document.createElement("input");
    idInput.value = role?.id ?? "";
    idInput.readOnly = !isNew;
    idInput.disabled = !isNew;
    const nameInput = document.createElement("input");
    nameInput.value = role?.name ?? "";
    const descInput = document.createElement("input");
    descInput.value = role?.description ?? "";
    const promptInput = document.createElement("textarea");
    promptInput.value = role?.prompt ?? "";
    promptInput.rows = 6;
    promptInput.style.cssText = "font-size:12px;padding:4px 6px;font-family:monospace";
    const policySelect = document.createElement("select");
    for (const [v, label] of [["ask", t("roles.policyAsk")], ["auto", t("roles.policyAuto")]]) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = label;
      if ((role?.executionPolicy ?? "ask") === v) opt.selected = true;
      policySelect.append(opt);
    }
    box.append(
      Object.assign(document.createElement("b"), { textContent: isNew ? t("roles.new") : t("roles.editTitle") }),
      field(t("roles.roleId"), idInput),
      field(t("roles.name"), nameInput),
      field(t("roles.description"), descInput),
      field(t("roles.prompt"), promptInput),
      field(t("roles.executionPolicy"), policySelect)
    );
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = t("roles.cancel");
    closeBtn.onclick = () => dlg.remove();
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = t("roles.save");
    saveBtn.onclick = act(async () => {
      await api.rolesUpsert({ id: idInput.value.trim(), name: nameInput.value, description: descInput.value, prompt: promptInput.value, executionPolicy: policySelect.value });
      dlg.remove();
    });
    btnRow.append(closeBtn, saveBtn);
    if (!isNew) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = t("roles.delete");
      delBtn.style.cssText = "color:crimson;margin-right:auto";
      delBtn.disabled = !role.builtin && role.uses > 0;
      delBtn.title = delBtn.disabled ? t("roles.inUse") : "";
      delBtn.onclick = act(async () => {
        if (!window.confirm(t("roles.deleteConfirm").replace("{id}", role.id))) {
          return;
        }
        await api.rolesDelete(role.id);
        dlg.remove();
      });
      btnRow.prepend(delBtn);
    }
    box.append(btnRow);
    dlg.append(box);
    dlg.onclick = (e) => {
      if (e.target === dlg) dlg.remove();
    };
    document.body.append(dlg);
  };
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;align-items:center";
  const newBtn = document.createElement("button");
  newBtn.type = "button";
  newBtn.textContent = t("roles.new");
  newBtn.style.cssText = "font-size:12px;padding:3px 12px";
  newBtn.onclick = () => openDialog(null);
  toolbar.append(search, newBtn);
  wrap.prepend(toolbar);
  api.rolesList().then((r) => {
    state.roles = r?.roles ?? [];
    paint();
  }).catch(() => paint());
  paint();
  container.append(wrap);
  return { dispose: () => wrap.remove() };
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
  ".empty,.error{padding:24px 0;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-height:24px}",
  ".intake>h3,.triage>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 6px;color:color-mix(in srgb,currentColor 60%,transparent)}",
  /* 登录闸：遮罩只盖插件主区（absolute）——侧栏始终可退回；flex 列 + margin:auto：
     空间够→居中，空间不够→顶对齐随容器自然滚动（手机上不出现内层拖动条） */
  ".gateWrap{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain;padding:24px;background:color-mix(in srgb,canvas 78%,transparent)}",
  "@supports (padding:max(16px,env(safe-area-inset-top))){.gateWrap{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}}",
  ".gate{width:min(440px,100%);margin:auto;display:flex;flex-direction:column;padding:28px 28px 20px;border-radius:14px;background:color-mix(in srgb,canvas 96%,transparent);backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 32px 64px -24px rgb(0 0 0 /.4),0 4px 16px rgb(0 0 0 /.14);animation:gate-in 220ms cubic-bezier(.22,1,.36,1)}",
  "@media (prefers-reduced-motion:reduce){.gate{animation:none}}",
  "@keyframes gate-in{from{transform:translateY(8px);opacity:.6}}",
  ".gateHead{display:flex;align-items:center;justify-content:space-between;gap:10px}",
  /* 图标衬底：取图标主蓝做 tint plate——浅皮淡蓝瓷面、深皮深蓝绒面，柔影托起彩色图标 */
  ".gateMark{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,#324DE2 9%,canvas);border:1px solid color-mix(in srgb,#324DE2 20%,canvas);box-shadow:0 2px 6px rgb(50 77 226 /.16),0 8px 20px -8px rgb(50 77 226 /.28)}",
  ".gateMark svg{display:block}",
  ".gate h3{font-size:16px;font-weight:650;margin:14px 0 0;letter-spacing:-.01em}",
  ".gate .intro{margin:6px 0 0;font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 62%,transparent)}",
  ".gateStatus{display:flex;gap:6px;margin:14px 0 0;flex-wrap:wrap}",
  ".pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".pill .dot{width:7px;height:7px;border-radius:50%}",
  ".pill .dot.ok{background:#2da44e}",
  ".pill .dot.miss{background:#d29922}",
  ".gate code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:5px;padding:1px 6px;background:color-mix(in srgb,currentColor 5%,transparent)}",
  ".gate a{color:inherit;text-underline-offset:2px}",
  /* 状态机 CTA：每个状态只有一个主行动按钮，窄屏整行可点 */
  ".gate .cta{width:100%;height:44px;margin:18px 0 0;padding:0 18px;font-weight:600;font-size:14.5px;border:none;border-radius:10px;background:canvastext;color:canvas;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".gate .cta:hover:not(:disabled){background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".gate .cta:disabled{opacity:.6}",
  ".gateCode{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 0;padding:12px 16px;border-radius:10px;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  ".gateCode b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:.08em}",
  ".gateLink{display:block;margin:10px 0 0;font-size:13px;color:inherit;text-underline-offset:2px}",
  "@media (max-width:520px){.gate{padding:20px 16px 12px;border-radius:12px}.gate h3{font-size:15px}.gate .intro{font-size:13px}.gateStatus{margin-top:12px}.gateCode b{font-size:20px;letter-spacing:.05em}.gate .cta{height:46px;font-size:15px}}",
  /* 矮屏（手机竖屏主区）：收紧纵向节奏，让卡整体放得下、免滚动 */
  "@media (max-height:640px){.gateWrap{padding:12px}.gate{padding:16px 16px 10px}.gate h3{margin-top:10px;font-size:15px}.gate .intro{margin-top:4px}.gateStatus{margin-top:10px}.gate .cta{margin-top:12px;height:44px}.gate .note{margin-top:10px;padding-top:8px}}",
  ".gate .err{font-size:13px;line-height:1.5;display:none;margin:12px 0 0;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".gate .note{margin:14px 0 0;padding:12px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.55;color:color-mix(in srgb,currentColor 52%,transparent)}"
].join("\n");
var el2 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function mountWorkbench(shadow, { getLang, build, extend } = {}) {
  let state = null;
  let authInfo = null;
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  let activeTab = "list";
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
    if (!state) {
      shadow.append(style, el2("div", "empty", error ? t("errors.refreshFailed") + " (" + error + ")" : t("auth.loading")));
      return;
    }
    if (!state.auth?.account) {
      shadow.append(style);
      renderLoginGate(shadow, { t, status: authInfo, onConnected: () => view.reload() });
      return;
    }
    const header = el2("header");
    header.append(el2("h2", null, t("panelLabel")));
    const review = needsReview({ candidates: state?.candidates ?? [], runs: state?.runs ?? [] });
    badge.count = review.count;
    const refreshBtn = el2("button", null, busy ? t("refreshing") : t("refresh"));
    refreshBtn.type = "button";
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    if (badge.count > 0) {
      const pendingChip = el2("button", "chip", t("badge.pending").replace("{n}", String(badge.count)));
      pendingChip.type = "button";
      pendingChip.onclick = () => {
        activeTab = "review";
        paint();
      };
      header.append(pendingChip);
    }
    extend?.header?.(header, { t, state, view });
    const account = state?.auth?.login || state?.auth?.account;
    if (account) {
      const who = el2("span", "chip", t("auth.connected") + " " + account);
      who.title = t("auth.logoutHint");
      header.append(who);
      const out = el2("button", null, t("auth.logout"));
      out.type = "button";
      out.onclick = async () => {
        out.disabled = true;
        try {
          await api.logout();
        } catch (e) {
          console.warn("[dsh-l]", e);
        }
        await view.reload();
      };
      header.append(out);
    }
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
    const tabsBar = el2("div");
    tabsBar.style.cssText = "display:flex;gap:6px;padding:10px 16px 0";
    for (const [id, label] of [["list", t("tabs.list")], ["board", t("tabs.board")], ["review", t("tabs.review")], ["roles", t("tabs.roles")]]) {
      const b = el2("button", null, label);
      b.type = "button";
      if (activeTab === id) b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0";
      b.onclick = () => {
        activeTab = id;
        paint();
      };
      tabsBar.append(b);
    }
    const intake = el2("section", "intake");
    intake.append(el2("h3", null, t("sections.intake")));
    const intakeChips = el2("div", "chips");
    const watchRepos = state?.watch?.repos ?? [];
    const perRepo = state?.snapshots?.perRepo ?? {};
    let issueCount = 0;
    let pullCount = 0;
    for (const r of Object.values(perRepo)) {
      issueCount += r.issues ?? 0;
      pullCount += r.pulls ?? 0;
    }
    intakeChips.append(
      el2("span", "chip", watchRepos.length + " " + t("intake.repos")),
      el2("span", "chip", "Issue " + issueCount),
      el2("span", "chip", "PR " + pullCount)
    );
    if (watchRepos.length === 0) intakeChips.append(el2("span", "chip muted", t("intake.none")));
    extend?.intake?.(intakeChips, { t, state, view });
    intake.append(intakeChips);
    const triage = el2("section", "triage");
    triage.append(el2("h3", null, t("sections.triage")), strip, bar);
    if (error) triage.append(el2("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) triage.append(el2("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      triage.append(el2("div", "empty", t("emptyStates.backlog")));
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
        triage.append(sec);
      }
    }
    const boardWrap = el2("div");
    const reviewWrap = el2("div");
    const rolesWrap = el2("div");
    boardWrap.style.display = activeTab === "board" ? "" : "none";
    reviewWrap.style.display = activeTab === "review" ? "" : "none";
    rolesWrap.style.display = activeTab === "roles" ? "" : "none";
    if (activeTab === "board") renderKanban(boardWrap, { t, candidates: state?.candidates ?? [], view });
    if (activeTab === "review") renderReview(reviewWrap, { t, candidates: state?.candidates ?? [], runs: state?.runs ?? [], view });
    if (activeTab === "roles") renderRolesTab(rolesWrap, { t, workflow: state?.workflow ?? { templates: [] }, view });
    intake.style.display = activeTab === "list" ? "" : "none";
    triage.style.display = activeTab === "list" ? "" : "none";
    main.append(intake, triage, boardWrap, reviewWrap, rolesWrap);
    shadow.append(style, header, tabsBar, main);
  };
  view.reload = async () => {
    const [s, a] = await Promise.allSettled([api.state(), api.auth()]);
    if (s.status === "fulfilled") {
      state = s.value;
      error = null;
    } else {
      error = s.reason?.message ?? String(s.reason);
    }
    authInfo = a.status === "fulfilled" ? a.value : null;
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
function renderStrip(container, { t, candidates, workflow }) {
  const cells = stripCells({ candidates, workflow });
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:4px;padding:8px 16px 0;flex-wrap:wrap;align-items:center";
  if (cells.fallback) {
    const counts = stageCounts(candidates);
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
  } else {
    for (const c of cells.pre) {
      const cell = document.createElement("span");
      cell.className = "chip";
      cell.textContent = t("stages." + c.key) + " " + c.count;
      wrap.append(cell);
    }
    const divider = document.createElement("span");
    divider.textContent = "\xB7";
    divider.style.opacity = ".4";
    wrap.append(divider);
    for (const n of cells.loop) {
      const cell = document.createElement("span");
      cell.className = "chip";
      cell.style.opacity = ".45";
      cell.title = n.name;
      cell.textContent = n.name;
      wrap.append(cell);
    }
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
  const feishuLabel = document.createElement("label");
  feishuLabel.textContent = t("feishu.url");
  feishuLabel.style.marginTop = "8px";
  const feishuInput = document.createElement("input");
  feishuInput.type = "url";
  feishuInput.placeholder = "https://open.feishu.cn/open-apis/bot/v2/hook/\u2026";
  const feishuRow = row();
  const feishuMsg = document.createElement("span");
  feishuMsg.style.cssText = "font-size:12px;opacity:.75";
  feishuRow.append(btn(t("feishu.save"), async () => {
    feishuMsg.textContent = "";
    try {
      await api.putFeishuWebhook(feishuInput.value.trim());
      feishuMsg.textContent = t("feishu.saveOk");
    } catch (e) {
      feishuMsg.textContent = e.message;
    }
  }));
  feishuRow.append(btn(t("feishu.test"), async () => {
    feishuMsg.textContent = "";
    try {
      await api.putFeishuWebhook(feishuInput.value.trim());
    } catch (e) {
      feishuMsg.textContent = e.message;
      return;
    }
    try {
      const r = await api.feishuTest();
      feishuMsg.textContent = r.sent ? t("feishu.testOk") : t("feishu.testFail");
    } catch (e) {
      feishuMsg.textContent = e.message;
    }
  }));
  feishuRow.append(feishuMsg);
  dialog.append(title, label, input, modelLabel, modelSel, err, save, feishuLabel, feishuInput, feishuRow);
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
  let lastRuns = [];
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
      header.append(btn(t("settings.title"), () => openSettings(view.shadow, { t, current: state?.settings ?? { intervalMinutes: 0 }, onSaved: () => view.reload() })));
    },
    // 收活板块的仓源管理入口：勾选/取消监看仓在对话框内完成，保存后立即刷新摄取。
    intake(container, { t, state, view }) {
      container.append(btn(t("watchedRepos"), () => openRepoPicker(view.shadow, { t, current: state?.watch?.repos ?? [], onSaved: () => view.refresh() })));
    },
    strip(container, { t, state }) {
      lastRuns = state?.runs ?? [];
      renderStrip(container, { t, candidates: state?.candidates ?? [], workflow: state?.workflow, runs: lastRuns });
    },
    bar(bar, { t, state, filters, view }) {
      const keys = pickTriageBatch(state?.candidates ?? [], filters);
      bar.append(btn(t("actions.triageBatch") + " (" + keys.length + ")", () => run(view)(() => api.triage(keys, getLang())), keys.length === 0));
    },
    rowActions(detail, c, { t, view, lang }) {
      const go = run2(view);
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
      const run2 = runBlock(c, lastRuns);
      const g2Ready = run2?.waitingGate === "g2";
      gates.append(
        btn("G1 " + t("gates.G1") + " \xB7 " + t("actions.pass"), () => go(async () => {
          const r = await api.gate(c.key, "G1", "pass", "");
          if (r.taskPackage) await copy(r.taskPackage);
        }), !g.G1),
        btn("G1 \xB7 " + t("actions.reject"), () => go(() => api.gate(c.key, "G1", "reject", "")), !g.G1),
        btn("G2 " + t("gates.G2") + " \xB7 " + t("actions.pass"), () => go(() => api.runGate(run2.id, "g2", "pass", "")), !g2Ready),
        btn("G2 \xB7 " + t("actions.reject"), () => go(() => api.runGate(run2.id, "g2", "reject", "")), !g2Ready),
        btn("G3 " + t("gates.G3"), () => {
        }, true)
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      if (run2) {
        const runRow = row();
        const st = document.createElement("span");
        st.className = "chip";
        st.textContent = t("run.status." + run2.status) + ((run2.currentNodeIds ?? []).length ? " \xB7 " + run2.currentNodeIds.join("/") : "");
        runRow.append(st);
        if (run2.status === "running" && (run2.currentNodeIds ?? []).length === 0) {
          const cl = document.createElement("span");
          cl.className = "chip";
          cl.style.opacity = ".7";
          cl.textContent = t("run.workspaceCloning");
          runRow.append(cl);
        }
        if (run2.error) {
          const err = document.createElement("span");
          err.className = "chip";
          err.style.color = "crimson";
          err.textContent = run2.error;
          runRow.append(err);
        }
        runRow.append(
          btn(t("actions.retryRun"), () => go(() => api.runRetry(run2.id, (run2.failedNodeIds ?? [])[0] ?? "")), !(run2.status === "failed" && (run2.failedNodeIds ?? []).length > 0)),
          // 产出评审问题 1：目标取 failedNodeIds（currentNodeIds 永不含 failed）
          btn(t("actions.cancelRun"), () => go(() => api.runCancel(run2.id, "user")), !(run2.status === "running" || run2.status === "waiting"))
        );
        detail.append(runRow);
      }
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    }
  };
}

// src/client/index.mjs
var React = require("react");
var h = React.createElement;
var BUILD = true ? "a7a9beac4fb7" : "dev";
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
  const label = () => {
    const base = makeT(lang.get())("panelLabel");
    return badge.count > 0 ? makeT(lang.get())("badge.pending").replace("{n}", String(badge.count)) + " \xB7 " + base : base;
  };
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
/* dsh-l-build:a7a9beac4fb7 */
