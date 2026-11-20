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
    loginTitle: "\u8FDE\u63A5\u4F60\u7684\u4EE3\u7801\u5E93\uFF0C\u8BA9 Agent \u81EA\u4E3B\u4EA4\u4ED8",
    // 金句 B（2026-11-19 用户选定），品牌区只留大标题
    deviceNote: "\u65E0\u9700\u624B\u52A8\u8F93\u5165\u7528\u6237\u540D\u2014\u2014\u6388\u6743\u5B8C\u6210\u540E\u81EA\u52A8\u8FDB\u5165\u5DE5\u4F5C\u53F0\u3002",
    deviceExpired: "\u6388\u6743\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77\u6388\u6743",
    deviceFailed: "\u6388\u6743\u5931\u8D25",
    enterBtn: "\u8FDB\u5165\u5DE5\u4F5C\u53F0",
    connected: "\u5DF2\u8FDE\u63A5",
    logout: "\u9000\u51FA",
    logoutHint: "\u9000\u51FA\u53EA\u89E3\u9664\u5DE5\u4F5C\u53F0\u7ED1\u5B9A\uFF0C\u4E0D\u5F71\u54CD\u672C\u673A gh \u767B\u5F55\u6001\uFF1B\u9700\u5F7B\u5E95\u64A4\u9500\u65F6\u5728\u7EC8\u7AEF\u6267\u884C gh auth logout\u3002"
  },
  // cred.*（登录门禁改造 Task 8）：授权卡/门禁行/凭据 kv/双方法/横幅的全部文案。
  // 约束（评审 R1-11）：组件内一律静态字面量键（状态→键映射写在组件内），禁止动态拼接键名的组合键写法。
  cred: {
    cardTitle: "GitHub \u4ED3\u5E93\u6388\u6743",
    badgeUnset: "\u672A\u914D\u7F6E",
    badgeOk: "\u5DF2\u914D\u7F6E",
    badgeBusy: "\u6821\u9A8C\u4E2D",
    badgeErr: "\u6709\u9519\u8BEF",
    badgeLimited: "\u9650\u6D41\u4E2D",
    subUnset: "\u8BBE\u5907\u6D41\u6388\u6743 \xB7 \u65E0\u9700\u590D\u5236\u4EE4\u724C",
    subPat: "\u8BBF\u95EE\u4EE4\u724C \xB7 \u6821\u9A8C\u540E\u4FDD\u5B58",
    subOk: "\u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C \xB7 \u4EE4\u724C\u6709\u6548",
    subDevice: "\u8BBE\u5907\u6D41\u6388\u6743 \xB7 \u7B49\u5F85\u786E\u8BA4",
    subErr: "\u51ED\u636E\u6821\u9A8C\u672A\u901A\u8FC7",
    subLimited: "\u51ED\u636E\u5065\u5EB7 \xB7 \u4E3B\u9650\u6D41\u751F\u6548",
    subFlowOk: "\u8BBE\u5907\u6D41\u6388\u6743 \xB7 \u4EE4\u724C\u6709\u6548",
    gate1: "gh CLI \u5DF2\u5B89\u88C5",
    gate2: "gh \u5DF2\u767B\u5F55",
    gate3: "\u51ED\u636E\u6821\u9A8C\u901A\u8FC7",
    g1Ok: "\u5DF2\u5B89\u88C5",
    g1Bad: "\u672A\u5B89\u88C5\uFF08\u4E0B\u65B9\u6309\u94AE\u4E00\u952E\u5B89\u88C5\uFF0C\u6216\u89C1\u624B\u52A8\u5B89\u88C5\u6307\u5F15\uFF09",
    g1Wait: "\u6B63\u5728\u540E\u53F0\u5B89\u88C5\u2026",
    g2Ok: "\u5DF2\u767B\u5F55",
    g2Bad: "\u672A\u767B\u5F55",
    g2Wait: "\u7B49\u5F85 gh CLI \u5C31\u7EEA",
    g3WaitDevice: "\u7B49\u5F85\u4F60\u5728 GitHub \u786E\u8BA4\u6388\u6743",
    g3WaitAuto: "\u6388\u6743\u540E\u81EA\u52A8\u6821\u9A8C",
    g3WaitVerify: "\u7B49\u5F85 gh \u767B\u5F55\u4E0E\u51ED\u636E\u6821\u9A8C",
    g3WaitHanding: "\u6388\u6743\u6210\u529F\uFF0C\u6B63\u5728\u6821\u9A8C\u51ED\u636E\u2026",
    g3BadInvalid: "\u4EE4\u724C\u5DF2\u5931\u6548\uFF08\u8BF7\u91CD\u65B0\u6388\u6743\uFF09",
    g3Ok: "\u4EE4\u724C\u6709\u6548",
    g3BadUnset: "\u672A\u63D0\u4F9B\u5DE5\u4F5C\u53F0\u51ED\u636E",
    g3BadScope: "\u4EE4\u724C\u7F3A\u5C11 repo \u6743\u9650\uFF08classic \u987B\u542B repo\uFF0C\u6216\u6539\u7528\u7EC6\u7C92\u5EA6\u4EE4\u724C\uFF09",
    g3OkLimited: "\u51ED\u636E\u6709\u6548 \xB7 \u9650\u6D41\u975E\u51ED\u636E\u95EE\u9898",
    kvSource: "\u6765\u6E90",
    kvScopes: "\u6743\u9650",
    kvChecked: "\u6700\u8FD1\u6821\u9A8C",
    kvUsed: "\u7528\u4E8E",
    kvUsedValue: "\u6444\u53D6\u5019\u9009\u3001\u53D1\u73B0\u4ED3\u5E93\u3001\u6267\u884C\u73AF\u514B\u9686\u4E0E\u4EA4\u4ED8\u63A8\u9001\u3002",
    srcDeviceFlow: "GitHub \u6388\u6743\uFF08\u8BBE\u5907\u6D41\uFF09\xB7 \u526F\u672C\u5DF2\u79FB\u4EA4 gh",
    srcPat: "\u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C\uFF08\u624B\u52A8\uFF09",
    srcGh: "\u672C\u673A gh \u767B\u5F55\u6001\uFF08\u5DE5\u4F5C\u53F0\u5916\u5EFA\u7ACB\uFF09",
    scopeFineGrained: "\u7EC6\u7C92\u5EA6\u4EE4\u724C \xB7 \u6743\u9650\u6309\u4ED3\u5E93\u5224\u5B9A",
    checkedValid: "\u4EE4\u724C\u6709\u6548",
    checkedNever: "\u5C1A\u672A\u6821\u9A8C",
    checkedBroken: "\u7F3A\u5C11\u6743\u9650",
    checkedJustNow: "\u521A\u521A",
    checkedAgoSuffix: "\u5206\u949F\u524D",
    connectLine: "\u4E24\u79CD\u65B9\u5F0F\u4EFB\u9009\u5176\u4E00\uFF0C\u65E0\u9700\u90FD\u505A\u3002",
    connectBtn: "\u8FDE\u63A5 GitHub",
    patBtn: "\u4F7F\u7528\u8BBF\u95EE\u4EE4\u724C",
    methodHint: "\u8BBE\u5907\u6D41\u514D\u590D\u5236\u4EE4\u724C \xB7 \u8BBF\u95EE\u4EE4\u724C\u9002\u5408\u65E0\u6D4F\u89C8\u5668\u73AF\u5883",
    switchToPat: "\u6539\u7528\u8BBF\u95EE\u4EE4\u724C",
    switchToDevice: "\u6539\u7528\u8BBE\u5907\u6D41\u6388\u6743",
    deviceWaiting: "\u7B49\u5F85\u4F60\u5728 GitHub \u5B8C\u6210\u6388\u6743\u2026",
    copy: "\u590D\u5236",
    patTitle: "\u8BBF\u95EE\u4EE4\u724C\uFF08PAT\uFF09",
    patPlaceholder: "ghp_\xB7\xB7\xB7\xB7 \u6216 github_pat_\xB7\xB7\xB7\xB7",
    patSave: "\u6821\u9A8C\u5E76\u4FDD\u5B58",
    patCancel: "\u53D6\u6D88",
    patHint: "\u6821\u9A8C\u901A\u8FC7\u624D\u4F1A\u4FDD\u5B58\uFF1Bclassic \u4EE4\u724C\u9700\u542B repo\u3001read:org\uFF0C\u7EC6\u7C92\u5EA6\u4EE4\u724C\u6309\u4ED3\u5E93\u6388\u6743\u3002\u4FDD\u5B58\u540E\u4E0E\u8BBE\u5907\u6D41\u51ED\u636E\u540C\u69FD\u8986\u76D6\u3002",
    deleteBtn: "\u5220\u9664\u51ED\u8BC1",
    recheck: "\u91CD\u65B0\u6821\u9A8C",
    patReplace: "\u66F4\u6362\u8BBF\u95EE\u4EE4\u724C",
    deleteConfirmTitle: "\u5220\u9664 GitHub \u4ED3\u5E93\u6388\u6743\uFF1F",
    deleteGhLogout: "\u540C\u65F6\u9000\u51FA\u672C\u673A gh \u767B\u5F55",
    deleteGhLogoutHint: "\u4EC5\u5F53\u6B64 gh \u767B\u5F55\u7531\u5DE5\u4F5C\u53F0\u521B\u5EFA\u65F6\u53EF\u9009",
    deleteConfirm: "\u786E\u8BA4\u5220\u9664",
    deleteCancel: "\u53D6\u6D88",
    errTokenInvalid: "token \u6821\u9A8C\u672A\u901A\u8FC7\uFF08\u53EF\u80FD\u5DF2\u5931\u6548\uFF09\uFF1A\u8BF7\u91CD\u65B0\u6388\u6743\u3002",
    errRateLimited: "GitHub \u9650\u6D41\u4E2D\uFF1A\u7A0D\u540E\u81EA\u52A8\u6062\u590D\uFF0C\u65E0\u9700\u91CD\u65B0\u6388\u6743\u3002",
    errInvalid: "\u4EE4\u724C\u6821\u9A8C\u672A\u901A\u8FC7\uFF1A\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5\u3002",
    errFormat: "\u4EE4\u724C\u683C\u5F0F\u4E0D\u6B63\u786E\uFF1A1-4096 \u4E2A\u5B57\u7B26\u4E14\u4E0D\u542B\u7A7A\u767D\u3002",
    errMissing: "\u5C1A\u672A\u63D0\u4F9B\u5DE5\u4F5C\u53F0\u51ED\u636E\u3002",
    errUnhealthy: "\u51ED\u636E\u5DF2\u5931\u6548\uFF1A\u8BF7\u91CD\u65B0\u8FDE\u63A5\u3002",
    errVerifyFailed: "\u6821\u9A8C\u6682\u65F6\u5931\u8D25\uFF08\u7F51\u7EDC\u5F02\u5E38\uFF09\uFF1A\u7A0D\u540E\u91CD\u8BD5\uFF0C\u4EE4\u724C\u672C\u8EAB\u672A\u5FC5\u6709\u95EE\u9898\u3002",
    errGhNotOurs: "\u672C\u673A gh \u767B\u5F55\u975E\u5DE5\u4F5C\u53F0\u521B\u5EFA\uFF0C\u672A\u505A\u6539\u52A8\uFF1B\u5DE5\u4F5C\u53F0\u51ED\u636E\u5DF2\u6E05\u9664\u3002",
    bannerUnhealthy: "\u8FDE\u63A5\u53D7\u635F\uFF1A\u51ED\u636E\u6821\u9A8C\u672A\u901A\u8FC7\uFF0C\u4FEE\u590D\u540E\u624D\u80FD\u7EE7\u7EED\u6444\u53D6\u3002",
    bannerLimited: "GitHub \u4E3B\u9650\u6D41\u4E2D\uFF1A\u6444\u53D6\u6682\u505C\uFF0C\u6062\u590D\u540E\u81EA\u52A8\u7EE7\u7EED\uFF0C\u65E0\u9700\u91CD\u65B0\u6388\u6743\u3002",
    bannerRecheck: "\u91CD\u65B0\u6821\u9A8C",
    compactTitle: "\u8FDE\u63A5\u72B6\u6001",
    enterBtn: "\u8FDB\u5165\u5DE5\u4F5C\u53F0",
    installCta: "\u4E00\u952E\u5B89\u88C5 gh CLI",
    installingCta: "\u6B63\u5728\u540E\u53F0\u5B89\u88C5 gh CLI\u2026",
    reauthCta: "\u91CD\u65B0\u6388\u6743 \xB7 \u8FDE\u63A5 GitHub",
    footNote: "\u51ED\u636E\u4EC5\u5B58\u672C\u673A\uFF1B\u9000\u51FA\u53EA\u89E3\u9664\u7ED1\u5B9A\uFF0C\u4E0D\u5F71\u54CD gh \u767B\u5F55\u6001\u3002",
    installNote: "\u4E00\u952E\u5B89\u88C5\uFF1A\u5B98\u65B9\u53D1\u5E03\u6E90\u4E0B\u8F7D\uFF08\u7EA6 15MB\uFF09\u88C5\u5165\u63D2\u4EF6\u79C1\u6709\u76EE\u5F55\uFF0C\u65E0\u9700 root\u3002",
    installManual: "\u6216\u624B\u52A8\u5B89\u88C5\uFF1Abrew install gh \xB7 winget install GitHub.cli \xB7 sudo apt install gh\uFF0C\u88C5\u5B8C\u81EA\u52A8\u68C0\u6D4B\u3002",
    installFailed: "gh CLI \u5B89\u88C5\u5931\u8D25"
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
    loginTitle: "Connect your code repositories and let agents deliver autonomously",
    deviceNote: "No username typing required \u2014 you enter the workbench automatically once authorized.",
    deviceExpired: "The device code expired. Start the authorization again.",
    deviceFailed: "Authorization failed",
    enterBtn: "Enter workbench",
    connected: "Connected",
    logout: "Sign out",
    logoutHint: "Signing out only unbinds the workbench; the local gh login stays. Run gh auth logout in a terminal to revoke it fully."
  },
  // cred.* (Task 8): authorization card / gate rows / credential kv / dual methods / degraded banner.
  // Constraint (review R1-11): always static literal keys in components (state→key maps live in the component), never build key names by concatenation.
  cred: {
    cardTitle: "GitHub repository authorization",
    badgeUnset: "Not set up",
    badgeOk: "Configured",
    badgeBusy: "Verifying",
    badgeErr: "Error",
    badgeLimited: "Rate limited",
    subUnset: "Device-flow authorization \xB7 no token copying",
    subPat: "Access token \xB7 verified before saving",
    subOk: "Personal access token \xB7 valid",
    subDevice: "Device-flow authorization \xB7 awaiting confirmation",
    subErr: "Credential verification failed",
    subLimited: "Credential healthy \xB7 primary rate limit in effect",
    subFlowOk: "Device-flow authorization \xB7 token valid",
    gate1: "gh CLI installed",
    gate2: "gh signed in",
    gate3: "Credential verified",
    g1Ok: "installed",
    g1Bad: "not installed (install via the button below, or see the manual guide)",
    g1Wait: "installing in the background\u2026",
    g2Ok: "signed in",
    g2Bad: "not signed in",
    g2Wait: "waiting for gh CLI",
    g3WaitDevice: "waiting for your confirmation on GitHub",
    g3WaitAuto: "verified automatically after authorization",
    g3WaitVerify: "waiting for gh sign-in and credential check",
    g3WaitHanding: "authorized \u2014 verifying the credential\u2026",
    g3BadInvalid: "token broken (authorize again)",
    g3Ok: "token valid",
    g3BadUnset: "no workbench credential provided",
    g3BadScope: "token lacks the repo scope (classic tokens need repo, or use a fine-grained token)",
    g3OkLimited: "credential valid \xB7 rate limit is not a credential problem",
    kvSource: "Source",
    kvScopes: "Scopes",
    kvChecked: "Last checked",
    kvUsed: "Used for",
    kvUsedValue: "Ingesting candidates, discovering repositories, executor clone and delivery push.",
    srcDeviceFlow: "GitHub authorization (device flow) \xB7 copy handed to gh",
    srcPat: "Personal access token (manual)",
    srcGh: "Local gh sign-in (created outside the workbench)",
    scopeFineGrained: "Fine-grained token \xB7 permissions judged per repository",
    checkedValid: "token valid",
    checkedNever: "not verified yet",
    checkedBroken: "missing scopes",
    checkedJustNow: "just now",
    checkedAgoSuffix: "min ago",
    connectLine: "Pick either method \u2014 no need for both.",
    connectBtn: "Connect GitHub",
    patBtn: "Use access token",
    methodHint: "Device flow needs no token copying \xB7 access tokens fit headless environments",
    switchToPat: "Switch to access token",
    switchToDevice: "Switch to device flow",
    deviceWaiting: "Waiting for you to authorize on GitHub\u2026",
    copy: "Copy",
    patTitle: "Access token (PAT)",
    patPlaceholder: "ghp_\xB7\xB7\xB7\xB7 or github_pat_\xB7\xB7\xB7\xB7",
    patSave: "Verify & save",
    patCancel: "Cancel",
    patHint: "Saved only after verification; classic tokens need repo and read:org, fine-grained tokens authorize per repository. Saving overwrites the device-flow credential in the same slot.",
    deleteBtn: "Delete credential",
    recheck: "Re-verify",
    patReplace: "Replace access token",
    deleteConfirmTitle: "Delete the GitHub repository authorization?",
    deleteGhLogout: "Also sign out of local gh",
    deleteGhLogoutHint: "only selectable when this gh login was created by the workbench",
    deleteConfirm: "Delete",
    deleteCancel: "Cancel",
    errTokenInvalid: "Token verification failed (possibly expired): authorize again.",
    errRateLimited: "GitHub rate limited: will recover automatically, no re-authorization needed.",
    errInvalid: "Token verification failed: check it and retry.",
    errFormat: "Invalid token format: 1-4096 characters, no whitespace.",
    errMissing: "No workbench credential provided yet.",
    errUnhealthy: "Credential is broken: reconnect to fix.",
    errVerifyFailed: "Verification temporarily failed (network): retry later \u2014 the token itself may be fine.",
    errGhNotOurs: "The local gh sign-in was not created by the workbench and was left untouched; the workbench credential was removed.",
    bannerUnhealthy: "Connection broken: credential verification failed, fix it before ingesting again.",
    bannerLimited: "GitHub primary rate limit: ingestion paused, resumes automatically \u2014 no re-authorization needed.",
    bannerRecheck: "Re-verify",
    compactTitle: "Connection",
    enterBtn: "Enter workbench",
    installCta: "Install gh CLI for me",
    installingCta: "Installing gh CLI in the background\u2026",
    reauthCta: "Re-authorize \xB7 Connect GitHub",
    footNote: "Credentials stay on this machine; signing out only unbinds and never touches your gh login.",
    installNote: "One-click install: downloaded from the official release (about 15MB) into the plugin's private directory, no root.",
    installManual: "Or install manually: brew install gh \xB7 winget install GitHub.cli \xB7 sudo apt install gh \u2014 detected automatically once done.",
    installFailed: "gh CLI install failed"
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
  if (form.engineConcurrency !== void 0 && form.engineConcurrency !== initial.engineConcurrency) {
    patch.engineConcurrency = form.engineConcurrency;
  }
  if (form.modelValue === modelValueOf(initial.triageModel)) return patch;
  if (form.modelValue === "") return { ...patch, triageModel: null };
  const cut = form.modelValue.indexOf("\n");
  return { ...patch, triageModel: { provider: form.modelValue.slice(0, cut), model: form.modelValue.slice(cut + 1) } };
}
function stripCells({ candidates, workflow, runs = [] } = {}) {
  const counts = stageCounts(candidates);
  const pre = [["ingest", counts.ingest], ["backlog", counts.backlog], ["triage", counts.triage], ["feedback", counts.feedback]].map(([key, count]) => ({ key, count }));
  const runsArr = runs ?? [];
  const active = runsArr.find((r) => ["running", "waiting"].includes(r.status));
  const templates = workflow?.templates ?? [];
  const template = templates.find((tpl) => tpl.id === active?.templateId) ?? templates[0];
  const inFlight = (nodeId) => runsArr.filter((r) => (r.templateId ?? templates[0]?.id) === template?.id && (r.currentNodeIds ?? []).includes(nodeId)).length;
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
  verifyCredential: () => send("dsh-l/credential/verify", {}),
  putCredential: (token) => send("dsh-l/credential", { token }, "PUT"),
  deleteCredential: (ghLogout) => send("dsh-l/credential", { ghLogout }, "DELETE"),
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

// src/client/components/connectionCard.mjs
var el2 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
var svg = (markup) => {
  const s = el2("span");
  s.innerHTML = markup;
  return s.firstElementChild;
};
var GH_MARK = '<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
var REFRESH_MARK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96"/><path d="M13.7 1.6v2.9h-2.9" stroke-linejoin="round"/></svg>';
var dot = (kind) => el2("span", "dot " + kind);
var agoText = (iso, t) => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1e3));
  if (sec < 60) return t("cred.checkedJustNow");
  return Math.floor(sec / 60) + " " + t("cred.checkedAgoSuffix");
};
var errKeyFor = (t, msg) => {
  const m = String(msg ?? "");
  if (m.startsWith("credential-format")) return t("cred.errFormat");
  if (m.startsWith("credential-invalid")) return t("cred.errInvalid");
  if (m.startsWith("credential-verify-failed")) return t("cred.errVerifyFailed");
  if (m.startsWith("token-invalid")) return t("cred.errTokenInvalid");
  if (m.startsWith("rate-limited:")) return t("cred.errRateLimited");
  if (m.startsWith("gh-not-ours")) return t("cred.errGhNotOurs");
  return m ? m : null;
};
var buildPatForm = (t, on, act) => {
  const form = el2("div", "patForm open");
  form.append(el2("label", "", t("cred.patTitle")));
  const switchLine = el2("p", "patHint");
  switchLine.style.margin = "0";
  const switchBtn = el2("button", "switchLink", t("cred.switchToDevice"));
  switchBtn.type = "button";
  switchBtn.onclick = act("switchToDevice", on.switchToDevice);
  switchLine.append(switchBtn);
  form.append(switchLine);
  const input = el2("input", "patInput");
  input.type = "password";
  input.placeholder = t("cred.patPlaceholder");
  input.autocomplete = "off";
  form.append(input);
  const row2 = el2("div", "patRow");
  const save = el2("button", "patSave", t("cred.patSave"));
  save.type = "button";
  save.onclick = act("patSave", () => on.patSave?.(input.value));
  const cancel = el2("button", "patCancel", t("cred.patCancel"));
  cancel.type = "button";
  cancel.onclick = act("patCancel", on.cancelPat);
  row2.append(save, cancel);
  form.append(row2);
  form.append(el2("p", "patHint", t("cred.patHint")));
  return form;
};
var buildDeleteConfirm = (t, status, on, act) => {
  const box = el2("div", "patForm open");
  box.setAttribute("role", "alert");
  box.append(el2("label", "", t("cred.deleteConfirmTitle")));
  const ours = status?.credential?.ghWrittenByUs === true;
  const checkWrap = el2("label", "patHint");
  const check = el2("input");
  check.type = "checkbox";
  check.id = "credGhLogout" + Math.random().toString(36).slice(2, 6);
  check.checked = ours;
  check.disabled = !ours;
  checkWrap.append(check, el2("span", "", t("cred.deleteGhLogout") + (ours ? "" : "\uFF08" + t("cred.deleteGhLogoutHint") + "\uFF09")));
  box.append(checkWrap);
  const row2 = el2("div", "patRow");
  const confirm = el2("button", "patSave is-danger", t("cred.deleteConfirm"));
  confirm.type = "button";
  confirm.onclick = act("confirmDelete", () => on.deleteConfirmed?.(check.checked));
  const cancel = el2("button", "patCancel", t("cred.deleteCancel"));
  cancel.type = "button";
  cancel.onclick = act("cancelDelete", on.cancelDelete);
  row2.append(confirm, cancel);
  box.append(row2);
  return box;
};
var deriveView = (t, status, ui) => {
  const g = status?.gates ?? {};
  const c = status?.credential ?? {};
  const dv = status?.device ?? {};
  const inst = status?.install ?? {};
  const installing = inst.phase === "installing";
  const hasGh = g.ghInstalled === true;
  const hasToken = g.ghLogin === true;
  const pending = dv.phase === "pending" || dv.phase === "authorizing";
  const authorizing = dv.phase === "authorizing";
  const limited = Boolean(c.rateLimitedUntil) && new Date(c.rateLimitedUntil) > /* @__PURE__ */ new Date();
  const ok = g.credentialOk === true;
  const verified = Boolean(c.verifiedAt);
  const login = status?.viewerLogin ?? null;
  const scopes = Array.isArray(c.scopes) ? c.scopes : null;
  const gates = [];
  if (installing) gates.push(["wait", t("cred.g1Wait")]);
  else if (!hasGh) gates.push(["bad", t("cred.g1Bad")]);
  else gates.push(["ok", t("cred.g1Ok")]);
  if (pending) gates.push(["wait", t("cred.g3WaitDevice")]);
  else if (!hasToken && !hasGh) gates.push(["wait", t("cred.g2Wait")]);
  else if (!hasToken) gates.push(["bad", t("cred.g2Bad")]);
  else gates.push(["ok", login ? t("cred.g2Ok") + "\uFF08" + login + "\uFF09" : t("cred.g2Ok")]);
  if (ok) gates.push(["ok", limited ? t("cred.g3OkLimited") : t("cred.g3Ok")]);
  else if (pending) gates.push(["wait", authorizing ? t("cred.g3WaitHanding") : t("cred.g3WaitAuto")]);
  else if (dv.phase === "failed") gates.push(["bad", t("auth.deviceFailed") + (dv.error ? "\uFF08" + String(dv.error).slice(0, 80) + "\uFF09" : "")]);
  else if (dv.phase === "expired") gates.push(["bad", t("auth.deviceExpired")]);
  else if (!hasToken) gates.push(["wait", t("cred.g3WaitVerify")]);
  else if (c.healthy === false) gates.push(["bad", t("cred.g3BadInvalid")]);
  else if (!verified) gates.push(["bad", t("cred.g3BadUnset")]);
  else gates.push(["bad", t("cred.g3BadScope")]);
  let badge2, sub;
  if (limited) {
    badge2 = [t("cred.badgeLimited"), "warn"];
    sub = t("cred.subLimited");
  } else if (pending) {
    badge2 = [t("cred.badgeBusy"), "wait"];
    sub = t("cred.subDevice");
  } else if (ok) {
    badge2 = [t("cred.badgeOk"), "ok"];
    sub = c.source === "manual-pat" ? t("cred.subOk") : t("cred.subFlowOk");
  } else if (c.healthy === false && verified) {
    badge2 = [t("cred.badgeErr"), "err"];
    sub = t("cred.subErr");
  } else if (ui.patOpen) {
    badge2 = [t("cred.badgeUnset"), "warn"];
    sub = t("cred.subPat");
  } else {
    badge2 = [t("cred.badgeUnset"), "warn"];
    sub = t("cred.subUnset");
  }
  let cta = null;
  if (!pending && !ui.patOpen && !ui.confirmDelete) {
    if (installing) cta = { label: t("cred.installingCta"), disabled: true, action: null };
    else if (!hasGh) cta = { label: t("cred.installCta"), disabled: false, action: "install" };
    else if (ok) cta = { label: (login ?? "GitHub") + " \xB7 " + t("auth.enterBtn"), disabled: false, action: "enter" };
    else if (limited) cta = { label: (login ?? "GitHub") + " \xB7 " + t("cred.enterBtn"), disabled: false, action: "enter" };
    else if (c.healthy === false || verified && !ok) cta = { label: t("cred.reauthCta"), disabled: false, action: "connect" };
    else cta = { label: t("cred.connectBtn"), disabled: false, action: "connect" };
  }
  const aux = [];
  if (!pending && !ui.patOpen && !ui.confirmDelete && (ok || verified)) {
    aux.push(limited ? ["recheck", t("cred.bannerRecheck")] : ["recheck", t("cred.recheck")]);
    aux.push(["pat", ok ? t("cred.patReplace") : t("cred.patBtn")]);
    aux.push(["delete", t("cred.deleteBtn"), true]);
  }
  const showKv = verified && !ui.patOpen;
  const sourceText = c.source === "manual-pat" ? t("cred.srcPat") : c.source === "device-flow" ? t("cred.srcDeviceFlow") : t("cred.srcGh");
  const chips = [];
  if (Array.isArray(scopes) && scopes.length === 0) chips.push([t("cred.scopeFineGrained"), false]);
  else if (Array.isArray(scopes)) {
    for (const s of scopes) chips.push([s, false]);
    if (c.healthy !== false && !scopes.includes("read:org")) chips.push(["read:org", true]);
  }
  let checked;
  if (c.healthy === false) checked = t("cred.checkedBroken");
  else if (!c.verifiedAt) checked = t("cred.checkedNever");
  else checked = t("cred.checkedValid") + " \xB7 " + agoText(c.verifiedAt, t);
  const connectZone = !ok && !pending && !ui.patOpen && !ui.confirmDelete;
  const errText = c.healthy === false && verified && !ok ? t("cred.errTokenInvalid") : verified && !ok && Array.isArray(scopes) && scopes.length > 0 ? t("cred.g3BadScope") : null;
  const warnText = limited ? t("cred.bannerLimited") : null;
  const notes = [];
  if (inst.phase === "failed") notes.push(t("cred.installFailed"));
  if (installing || !hasGh && !ui.patOpen) notes.push(t("cred.installNote"));
  if (!hasGh && !ui.patOpen) notes.push(t("cred.installManual"));
  if (pending && !authorizing) notes.push(t("auth.deviceNote"));
  if (authorizing) notes.push(t("cred.g3WaitHanding"));
  return { badge: badge2, sub, gates, limited, ok, hasGh, hasToken, pending, authorizing, installing, verified, login, connectZone, cta, aux, showKv, sourceText, chips, checked, errText, warnText, notes };
};
function renderConnectionCard(parent, { t, status, mode = "full", patOpen = false, confirmDelete = false, patError = null, deleteError = null, on = {} }) {
  const v = deriveView(t, status, { patOpen, confirmDelete });
  const act = (name2, fn) => (e) => {
    e.preventDefault();
    fn?.();
  };
  if (mode === "compact") {
    const wrap = el2("div", "credCompact");
    wrap.append(dot(v.gates[2]?.[0] === "ok" ? "ok" : v.gates[2]?.[0] === "bad" ? "warn" : "wait"));
    wrap.append(el2("b", "", t("cred.compactTitle")));
    const badge3 = el2("span", "badge");
    badge3.append(dot(v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait"), el2("span", "", v.badge[0]));
    wrap.append(badge3);
    wrap.append(el2("span", "", t("cred.kvChecked") + ": " + (v.checked || t("cred.checkedNever"))));
    const re = el2("button", "auxAct", v.limited ? t("cred.bannerRecheck") : t("cred.recheck"));
    re.type = "button";
    re.onclick = act("recheck", on.verify);
    wrap.append(re);
    if (v.verified) {
      const p = el2("button", "auxAct", v.ok ? t("cred.patReplace") : t("cred.patBtn"));
      p.type = "button";
      p.onclick = act("pat", on.togglePat);
      const d = el2("button", "auxAct is-danger", t("cred.deleteBtn"));
      d.type = "button";
      d.onclick = act("delete", on.toggleDelete);
      wrap.append(p, d);
    }
    parent.append(wrap);
    if (patOpen) parent.append(buildPatForm(t, on, act));
    if (patError && patOpen) parent.append(el2("p", "errForm", errKeyFor(t, patError)));
    if (confirmDelete) parent.append(buildDeleteConfirm(t, status, on, act));
    if (deleteError && confirmDelete) parent.append(el2("p", "errForm", errKeyFor(t, deleteError)));
    return;
  }
  const card = el2("article", "gate");
  card.setAttribute("aria-label", t("cred.cardTitle"));
  const head = el2("div", "credHead");
  const ghMark = el2("div", "ghMark");
  ghMark.append(svg(GH_MARK));
  const who = el2("div", "credWho");
  who.append(el2("b", "", t("cred.cardTitle")));
  who.append(el2("div", "credSub", v.sub));
  const badge2 = el2("span", "badge");
  badge2.append(dot(v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait"), el2("span", "", v.badge[0]));
  const recheck = el2("button", "recheck");
  recheck.type = "button";
  recheck.title = t("cred.recheck");
  recheck.setAttribute("aria-label", t("cred.recheck"));
  recheck.append(svg(REFRESH_MARK));
  recheck.onclick = act("recheck", on.verify);
  head.append(ghMark, who, badge2, recheck);
  card.append(head);
  const gatesBox = el2("div", "gates");
  const names = [t("cred.gate1"), t("cred.gate2"), t("cred.gate3")];
  v.gates.forEach(([state, stText], i) => {
    const row2 = el2("div", "gateRow");
    row2.append(dot(state === "ok" ? "ok" : state === "bad" ? "warn" : "wait"));
    row2.append(el2("span", "gName", names[i]));
    row2.append(el2("span", "gSt" + (state === "bad" ? " is-bad" : ""), stText));
    gatesBox.append(row2);
  });
  card.append(gatesBox);
  if (v.showKv) {
    const kv = el2("dl", "kv");
    kv.append(el2("dt", "", t("cred.kvSource")));
    kv.append(el2("dd", "", v.sourceText));
    kv.append(el2("dt", "", t("cred.kvScopes")));
    const chips = el2("span", "chips");
    for (const [text, miss] of v.chips) chips.append(el2("span", "chip" + (miss ? " is-miss" : ""), text));
    const scopesDd = el2("dd");
    scopesDd.append(chips);
    kv.append(scopesDd);
    kv.append(el2("dt", "", t("cred.kvChecked")));
    kv.append(el2("dd", "", v.checked));
    kv.append(el2("dt", "", t("cred.kvUsed")));
    kv.append(el2("dd", "", t("cred.kvUsedValue")));
    card.append(kv);
  }
  if (v.connectZone) {
    const zone = el2("div", "connectZone");
    zone.append(el2("p", "", t("cred.connectLine")));
    const row2 = el2("div", "methodRow");
    const mDevice = el2("button", "method primary", t("cred.connectBtn"));
    mDevice.type = "button";
    mDevice.onclick = act("mDevice", on.connect);
    const mPat = el2("button", "method", t("cred.patBtn"));
    mPat.type = "button";
    mPat.onclick = act("mPat", on.togglePat);
    row2.append(mDevice, mPat);
    zone.append(row2);
    zone.append(el2("p", "methodHint", t("cred.methodHint")));
    card.append(zone);
  }
  if (v.pending) {
    const dv = status?.device ?? {};
    const codeBox = el2("div", "gateCode");
    const code = el2("b", "", dv.userCode ?? "\xB7\xB7\xB7\xB7-\xB7\xB7\xB7\xB7");
    const copyBtn = el2("button", "", t("cred.copy"));
    copyBtn.type = "button";
    copyBtn.onclick = () => navigator.clipboard?.writeText(dv.userCode ?? "").catch(() => {
    });
    codeBox.append(code, copyBtn);
    card.append(codeBox);
    const line = el2("p", "deviceLine");
    line.append(el2("span", "", t("cred.deviceWaiting") + " "));
    const link = el2("a", "", dv.verificationUri ?? "https://github.com/login/device");
    link.href = dv.verificationUri ?? "https://github.com/login/device";
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    const switchBtn = el2("button", "switchLink", t("cred.switchToPat"));
    switchBtn.type = "button";
    switchBtn.onclick = act("switchToPat", on.togglePat);
    line.append(link, el2("span", "", " \xB7 "), switchBtn);
    card.append(line);
  }
  if (patOpen) card.append(buildPatForm(t, on, act));
  if (patError && patOpen) card.append(el2("p", "errForm", errKeyFor(t, patError)));
  if (v.errText) card.append(el2("p", "err", v.errText));
  if (v.warnText) card.append(el2("p", "warnBox", v.warnText));
  if (v.cta) {
    const cta = el2("button", "cta", v.cta.label);
    cta.type = "button";
    cta.disabled = Boolean(v.cta.disabled);
    if (v.cta.action) cta.onclick = act("cta", on[v.cta.action]);
    card.append(cta);
  }
  if (v.aux.length > 0) {
    const auxBox = el2("div", "aux");
    for (const [id, label, danger] of v.aux) {
      const b = el2("button", "auxAct" + (danger ? " is-danger" : ""), label);
      b.type = "button";
      b.onclick = act(id, id === "recheck" ? on.verify : id === "pat" ? on.togglePat : on.toggleDelete);
      auxBox.append(b);
    }
    card.append(auxBox);
  }
  if (confirmDelete) card.append(buildDeleteConfirm(t, status, on, act));
  if (deleteError && confirmDelete) card.append(el2("p", "errForm", errKeyFor(t, deleteError)));
  for (const note of v.notes) card.append(el2("p", "note", note));
  parent.append(card);
}

// src/client/components/loginGate.mjs
var MARK = '<svg width="27" height="27" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M14.41 27.87A10.5 10.5 0 0 1 13.56 8.48" stroke="url(#dshl-mk-b)" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M21.59 8.13A10.5 10.5 0 0 1 22.44 27.52" stroke="url(#dshl-mk-t)" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M13.42 11.98 10.8 6.36 19.18 5.87Z" fill="url(#dshl-mk-b)" stroke="url(#dshl-mk-b)" stroke-width="1.5" stroke-linejoin="round"/><path d="M22.58 24.02 25.2 29.64 16.82 30.13Z" fill="url(#dshl-mk-t)" stroke="url(#dshl-mk-t)" stroke-width="1.5" stroke-linejoin="round"/><defs><linearGradient id="dshl-mk-b" x1="9" y1="8" x2="25" y2="29" gradientUnits="userSpaceOnUse"><stop stop-color="#69B9FF"/><stop offset="1" stop-color="#324DE2"/></linearGradient><linearGradient id="dshl-mk-t" x1="22" y1="8" x2="20" y2="28" gradientUnits="userSpaceOnUse"><stop stop-color="#45E7A4"/><stop offset="1" stop-color="#05909D"/></linearGradient></defs></svg>';
var svg2 = (markup) => {
  const s = document.createElement("span");
  s.innerHTML = markup;
  return s.firstElementChild;
};
var el3 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
var VERIFY_TTL_MS = 30 * 60 * 1e3;
function renderLoginGate(shadow, { t, status, onConnected }) {
  let local = status ?? {};
  let timer = null;
  let dead = false;
  let patOpen = false;
  let confirmDelete = false;
  let patError = null;
  let deleteError = null;
  let entered = false;
  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const refresh = async () => {
    try {
      local = await api.auth();
    } catch {
    }
    draw();
    schedule();
  };
  const enter = async () => {
    if (entered) return;
    entered = true;
    try {
      await api.bind();
      stop();
      dead = true;
      onConnected?.();
    } catch {
      entered = false;
      await refresh();
    }
  };
  const afterPatSave = async () => {
    patOpen = false;
    await refresh();
    if (local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) await enter();
  };
  const on = {
    install: async () => {
      try {
        await api.installGh();
        local = { ...local, install: { phase: "installing" } };
      } catch {
      }
      draw();
      schedule();
    },
    connect: async () => {
      try {
        const d = await api.deviceStart();
        local = { ...local, device: d };
        draw();
        schedule();
      } catch {
      }
      await refresh();
    },
    enter,
    verify: async () => {
      await refresh();
    },
    togglePat: () => {
      patOpen = !patOpen;
      confirmDelete = false;
      patError = null;
      draw();
    },
    cancelPat: () => {
      patOpen = false;
      patError = null;
      draw();
    },
    switchToDevice: async () => {
      patOpen = false;
      patError = null;
      await on.connect();
    },
    toggleDelete: () => {
      confirmDelete = !confirmDelete;
      patOpen = false;
      deleteError = null;
      draw();
    },
    cancelDelete: () => {
      confirmDelete = false;
      deleteError = null;
      draw();
    },
    deleteConfirmed: async (ghLogout) => {
      try {
        await api.deleteCredential(ghLogout);
        deleteError = null;
        patOpen = false;
        await refresh();
      } catch (e) {
        deleteError = e?.message ?? String(e);
        confirmDelete = true;
        draw();
      }
    },
    patSave: async (token) => {
      if (!token) return;
      try {
        await api.putCredential(token);
        patError = null;
        await afterPatSave();
      } catch (err) {
        patError = err?.message ?? String(err);
        await refresh();
        draw();
      }
    }
  };
  const draw = () => {
    if (dead) return;
    for (const el5 of [...shadow.children]) {
      if (el5.classList?.contains("gateWrap")) el5.remove();
    }
    const wrap = el3("div", "gateWrap");
    const panel = el3("div", "gatePanel");
    const brand = el3("header", "brandRow");
    const mark = el3("div", "gateMark");
    mark.append(svg2(MARK));
    const title = el3("h3", "gateTitle", t("auth.loginTitle"));
    brand.append(mark, title);
    panel.append(brand);
    renderConnectionCard(panel, { t, status: local, mode: "full", patOpen, confirmDelete, patError, deleteError, on });
    panel.append(el3("footer", "gateFoot", t("cred.footNote")));
    wrap.append(panel);
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
  const c = local?.credential ?? {};
  const verifiedAtMs = c.verifiedAt ? Date.parse(c.verifiedAt) : NaN;
  if (local?.gates?.credentialOk && Number.isFinite(verifiedAtMs) && Date.now() - verifiedAtMs > VERIFY_TTL_MS) {
    api.verifyCredential().then(refresh).catch(() => {
    });
  }
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
    const el5 = document.createElement("div");
    el5.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:13px";
    const head = document.createElement("div");
    head.style.cssText = "font-weight:600;margin-bottom:4px";
    head.textContent = titleText;
    el5.append(head);
    if (err) {
      const e2 = document.createElement("div");
      e2.style.color = "crimson";
      e2.textContent = err;
      el5.append(e2);
    }
    parent.append(el5);
    return el5;
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
    const el5 = card(gatesSec, r.candidateKey + " " + (c?.title ?? ""), r.error);
    btn2(el5, t("actions.pass") + "\uFF08" + t("gates." + (r.waitingGateId ?? (r.waitingGate ?? "").toUpperCase())) + "\uFF09", () => api.runGate(r.id, r.waitingGate, "pass", ""));
    btn2(el5, t("actions.reject"), () => api.runGate(r.id, r.waitingGate, "reject", ""));
    btn2(el5, t("actions.cancelRun"), () => api.runCancel(r.id, "user"));
  }
  const releaseSec = document.createElement("section");
  releaseSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.release") }));
  if (out.releaseList.length === 0) releaseSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const c of out.releaseList) {
    const el5 = card(releaseSec, c.key + " " + (c.title ?? ""));
    btn2(el5, t("review.confirm"), () => api.releaseConfirm(c.key, ""));
  }
  const failedSec = document.createElement("section");
  failedSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.failed") }));
  if (out.failedRuns.length === 0) failedSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const r of out.failedRuns) {
    const el5 = card(failedSec, r.candidateKey + " " + (r.error ?? ""));
    for (const nid of r.failedNodeIds ?? []) btn2(el5, t("actions.retryRun") + " " + nid, () => api.runRetry(r.id, nid));
    btn2(el5, t("actions.cancelRun"), () => api.runCancel(r.id, "user"));
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
  ".gate .note{margin:14px 0 0;padding:12px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.55;color:color-mix(in srgb,currentColor 52%,transparent)}",
  // ── 凭据卡（Task 9）：全面板登录 + 收活紧凑卡共用视觉（theme 自适应沿用 canvas/canvastext color-mix 语言）──
  ".gatePanel{width:min(560px,100%);margin:auto;display:flex;flex-direction:column}",
  ".brandRow{display:flex;align-items:center;gap:14px}",
  ".gateTitle{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:0}",
  ".gatePanel .gate{width:100%;margin:26px 0 0;padding:22px 24px 18px}",
  ".gateFoot{margin-top:20px;padding:14px 2px 4px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.6;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".credHead{display:flex;align-items:center;gap:12px}",
  ".ghMark{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:10px;color:inherit;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 10%,transparent)}",
  ".ghMark svg{display:block}",
  ".credWho{flex:1;min-width:0}",
  ".credWho b{display:block;font-size:14px;font-weight:600}",
  ".credSub{margin-top:2px;font-size:12px;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".badge{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".dot{width:7px;height:7px;border-radius:50%;flex:none}",
  ".dot.ok{background:#2da44e}",
  ".dot.warn{background:#d29922}",
  ".dot.err{background:#d1242f}",
  ".dot.wait{background:#d29922;animation:dot-breathe 1.6s ease-in-out infinite}",
  "@keyframes dot-breathe{50%{opacity:.35}}",
  "@media (prefers-reduced-motion:reduce){.dot.wait{animation:none}}",
  ".recheck{flex:none;width:30px;height:30px;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:8px;background:transparent;color:inherit;cursor:pointer}",
  ".recheck svg{transition:transform 400ms cubic-bezier(.22,1,.36,1)}",
  ".recheck:hover svg{transform:rotate(140deg)}",
  ".recheck:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:2px}",
  ".gates{margin-top:16px;display:flex;flex-direction:column;gap:9px}",
  ".gateRow{display:flex;align-items:center;gap:10px;min-height:24px;font-size:13px}",
  ".gateRow .gName{flex:none;font-weight:550}",
  ".gateRow .gSt{flex:1;min-width:0;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".gateRow .gSt.is-bad{color:color-mix(in srgb,#d1242f 85%,currentColor)}",
  ".kv{margin:18px 0 0;padding:14px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);display:grid;grid-template-columns:64px 1fr;row-gap:10px;column-gap:12px;font-size:13px}",
  ".kv dt{color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".kv dd{line-height:1.5;min-width:0;overflow-wrap:anywhere}",
  ".chips{display:inline-flex;gap:6px;flex-wrap:wrap;vertical-align:-2px}",
  ".chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;padding:1px 8px;border-radius:5px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:color-mix(in srgb,currentColor 5%,transparent)}",
  ".chip.is-miss{color:color-mix(in srgb,#d1242f 85%,currentColor);border-color:color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".okFrag{color:color-mix(in srgb,#2da44e 80%,currentColor)}",
  ".badFrag{color:color-mix(in srgb,#d1242f 85%,currentColor)}",
  ".connectZone{margin-top:18px;padding-top:14px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 62%,transparent)}",
  ".methodRow{display:flex;gap:10px;margin-top:10px}",
  ".method{flex:1;height:40px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:1px solid color-mix(in srgb,currentColor 20%,transparent);background:transparent;color:inherit}",
  ".method:hover{background:color-mix(in srgb,currentColor 6%,transparent)}",
  ".method:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 70%,transparent);outline-offset:2px}",
  ".methodHint{margin-top:8px;font-size:12px;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".switchLink{border:none;background:transparent;padding:2px 4px;cursor:pointer;font-size:12.5px;text-decoration:underline;text-underline-offset:2px;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".switchLink:hover{color:inherit}",
  ".switchLink:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patForm{margin-top:18px;padding:14px 16px;border-radius:10px;border:1px dashed color-mix(in srgb,currentColor 20%,transparent);display:none;flex-direction:column;gap:10px}",
  ".patForm.open{display:flex}",
  ".patForm label{font-size:12.5px;font-weight:550}",
  ".patInput{width:100%;height:36px;padding:0 12px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,canvas);color:inherit}",
  ".patInput::placeholder{color:color-mix(in srgb,currentColor 40%,transparent)}",
  ".patInput:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patRow{display:flex;align-items:center;gap:12px}",
  ".patSave{height:34px;padding:0 16px;border:none;border-radius:8px;cursor:pointer;background:canvastext;color:canvas;font-size:13px;font-weight:600}",
  ".patSave:hover{background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".patSave:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 70%,transparent);outline-offset:2px}",
  ".patSave.is-danger{background:color-mix(in srgb,#d1242f 85%,currentColor);color:canvas}",
  ".patCancel{border:none;background:transparent;color:color-mix(in srgb,currentColor 55%,transparent);font-size:12.5px;cursor:pointer}",
  ".patCancel:hover{color:inherit}",
  ".patHint{font-size:12px;line-height:1.5;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".errForm{font-size:12.5px;line-height:1.5;margin:2px 0 0;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  ".aux{margin-top:10px;display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap}",
  ".auxAct{border:none;background:transparent;cursor:pointer;font-size:12.5px;padding:4px 8px;border-radius:6px;color:color-mix(in srgb,currentColor 62%,transparent);text-underline-offset:2px}",
  ".auxAct:hover{color:inherit;background:color-mix(in srgb,currentColor 6%,transparent)}",
  ".auxAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".auxAct.is-danger{color:color-mix(in srgb,#d1242f 78%,currentColor)}",
  ".warnBox{font-size:13px;line-height:1.5;margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".credCompact{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,currentColor 10%,transparent);background:color-mix(in srgb,currentColor 3%,transparent)}",
  ".degradedBanner{margin:0 0 12px;padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  ".degradedBanner.is-limited{border-color:color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".bannerAct{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:7px;background:transparent;color:inherit;font-size:12.5px;padding:4px 10px;cursor:pointer}",
  ".bannerAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}"
].join("\n");
var el4 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function mountWorkbench(shadow, { getLang, build, extend } = {}) {
  let state = null;
  let authInfo = null;
  let compactPat = false;
  let compactDelete = false;
  let compactPatError = null;
  let compactDeleteError = null;
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  let activeTab = "list";
  const filters = { type: "all", repo: "all", urgency: "all" };
  const expanded = /* @__PURE__ */ new Set();
  const view = {};
  const select = (pairs, value, onChange, label) => {
    const s = el4("select");
    s.setAttribute("aria-label", label);
    for (const [v, text] of pairs) {
      const o = el4("option", null, text);
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
    const style = el4("style");
    style.textContent = CSS;
    if (!state) {
      shadow.append(style, el4("div", "empty", error ? t("errors.refreshFailed") + " (" + error + ")" : t("auth.loading")));
      return;
    }
    if (!state.auth?.account) {
      shadow.append(style);
      renderLoginGate(shadow, { t, status: authInfo, onConnected: () => view.reload() });
      return;
    }
    const header = el4("header");
    header.append(el4("h2", null, t("panelLabel")));
    const review = needsReview({ candidates: state?.candidates ?? [], runs: state?.runs ?? [] });
    badge.count = review.count;
    const refreshBtn = el4("button", null, busy ? t("refreshing") : t("refresh"));
    refreshBtn.type = "button";
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    if (badge.count > 0) {
      const pendingChip = el4("button", "chip", t("badge.pending").replace("{n}", String(badge.count)));
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
      const credChip = state?.auth?.credential ?? {};
      const limChip = credChip.rateLimitedUntil && new Date(credChip.rateLimitedUntil) > /* @__PURE__ */ new Date();
      const who = el4("span", "chip", t("auth.connected") + " " + account);
      if (credChip.configured) {
        const d = el4("span", "dot " + (credChip.healthy === false ? "err" : limChip ? "warn" : "ok"));
        d.style.marginRight = "5px";
        d.style.verticalAlign = "middle";
        who.prepend(d);
      }
      who.title = t("auth.logoutHint");
      header.append(who);
      const out = el4("button", null, t("auth.logout"));
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
    header.append(el4("span", "meta", t("meta.lastRefreshAt") + ": " + (last ? new Date(last).toLocaleString(getLang()) : "\u2014")));
    const strip = el4("div", "strip");
    extend?.strip?.(strip, { t, state });
    const bar = el4("div", "bar");
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
    const main = el4("main");
    const tabsBar = el4("div");
    tabsBar.style.cssText = "display:flex;gap:6px;padding:10px 16px 0";
    for (const [id, label] of [["list", t("tabs.list")], ["board", t("tabs.board")], ["review", t("tabs.review")], ["roles", t("tabs.roles")]]) {
      const b = el4("button", null, label);
      b.type = "button";
      if (activeTab === id) b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0";
      b.onclick = () => {
        activeTab = id;
        paint();
      };
      tabsBar.append(b);
    }
    const intake = el4("section", "intake");
    intake.append(el4("h3", null, t("sections.intake")));
    const credH = state?.auth?.credential ?? {};
    const limNow = credH.rateLimitedUntil && new Date(credH.rateLimitedUntil) > /* @__PURE__ */ new Date();
    if (credH.configured && (credH.healthy === false || limNow)) {
      const banner = el4("div", "degradedBanner" + (credH.healthy === false ? "" : " is-limited"));
      banner.append(el4("span", "", credH.healthy === false ? t("cred.bannerUnhealthy") : t("cred.bannerLimited")));
      const fix = el4("button", "bannerAct", t("cred.bannerRecheck"));
      fix.type = "button";
      fix.onclick = async () => {
        fix.disabled = true;
        try {
          await api.verifyCredential();
        } catch {
        }
        await view.reload();
      };
      banner.append(fix);
      intake.append(banner);
    }
    const credMount = el4("div");
    intake.append(credMount);
    renderConnectionCard(credMount, {
      t,
      status: authInfo,
      mode: "compact",
      patOpen: compactPat,
      confirmDelete: compactDelete,
      patError: compactPatError,
      deleteError: compactDeleteError,
      on: {
        verify: async () => {
          try {
            await api.verifyCredential();
          } catch {
          }
          await view.reload();
        },
        togglePat: () => {
          compactPat = !compactPat;
          compactDelete = false;
          compactPatError = null;
          paint();
        },
        toggleDelete: () => {
          compactDelete = !compactDelete;
          compactPat = false;
          compactDeleteError = null;
          paint();
        },
        patSave: async (token) => {
          if (!token) return;
          try {
            await api.putCredential(token);
            compactPatError = null;
            compactPat = false;
          } catch (e) {
            compactPatError = e?.message ?? String(e);
          }
          await view.reload();
        },
        deleteConfirmed: async (ghLogout) => {
          try {
            await api.deleteCredential(ghLogout);
            compactDeleteError = null;
            compactDelete = false;
          } catch (e) {
            compactDeleteError = e?.message ?? String(e);
            compactDelete = true;
          }
          await view.reload();
        },
        cancelPat: () => {
          compactPat = false;
          compactPatError = null;
          paint();
        },
        cancelDelete: () => {
          compactDelete = false;
          compactDeleteError = null;
          paint();
        },
        // 紧凑卡不发起设备流（登录面板专属入口）；switchToDevice 在此处退化为收起表单
        switchToDevice: () => {
          compactPat = false;
          compactPatError = null;
          paint();
        },
        connect: () => {
        },
        enter: () => {
        },
        install: () => {
        }
      }
    });
    const intakeChips = el4("div", "chips");
    const watchRepos = state?.watch?.repos ?? [];
    const perRepo = state?.snapshots?.perRepo ?? {};
    let issueCount = 0;
    let pullCount = 0;
    for (const r of Object.values(perRepo)) {
      issueCount += r.issues ?? 0;
      pullCount += r.pulls ?? 0;
    }
    intakeChips.append(
      el4("span", "chip", watchRepos.length + " " + t("intake.repos")),
      el4("span", "chip", "Issue " + issueCount),
      el4("span", "chip", "PR " + pullCount)
    );
    if (watchRepos.length === 0) intakeChips.append(el4("span", "chip muted", t("intake.none")));
    extend?.intake?.(intakeChips, { t, state, view });
    intake.append(intakeChips);
    const triage = el4("section", "triage");
    triage.append(el4("h3", null, t("sections.triage")), strip, bar);
    if (error) triage.append(el4("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) triage.append(el4("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      triage.append(el4("div", "empty", t("emptyStates.backlog")));
    } else {
      for (const group of groupCandidates(list, t)) {
        if (group.items.length === 0) continue;
        const sec = el4("section", "group" + (group.dim ? " dim" : ""));
        sec.append(el4("h3", null, group.label + " \xB7 " + group.items.length));
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
    const boardWrap = el4("div");
    const reviewWrap = el4("div");
    const rolesWrap = el4("div");
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
function renderStrip(container, { t, candidates, workflow, runs = [] }) {
  const cells = stripCells({ candidates, workflow, runs });
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
      cell.style.opacity = n.count > 0 ? "1" : ".45";
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
  const concLabel = document.createElement("label");
  concLabel.textContent = "\u5E76\u53D1\u4E0A\u9650\uFF081\u20134\uFF09";
  const concInput = document.createElement("input");
  concInput.type = "number";
  concInput.min = "1";
  concInput.max = "4";
  concInput.step = "1";
  concInput.value = String(current?.engineConcurrency ?? 2);
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
  api.models().then((r) => {
    fill(r.providers, r.hostDefault);
    hostDefaultRow.textContent = "\u9ED8\u8BA4\u6A21\u578B\uFF1A" + (r.hostDefault ? r.hostDefault.provider + " / " + r.hostDefault.model : "\uFF08\u5BBF\u4E3B\u672A\u914D\u7F6E\uFF09");
  }).catch(() => {
  });
  const hostDefaultRow = document.createElement("div");
  hostDefaultRow.style.cssText = "font-size:12px;opacity:.75";
  hostDefaultRow.textContent = "\u9ED8\u8BA4\u6A21\u578B\uFF1A\uFF08\u52A0\u8F7D\u4E2D\uFF09";
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
      await api.putSettings(settingsPatch(current ?? {}, { intervalMinutes: Number(input.value), modelValue: modelSel.value, engineConcurrency: Number(concInput.value) }));
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
  dialog.append(title, concLabel, concInput, label, input, modelLabel, modelSel, hostDefaultRow, err, save, feishuLabel, feishuInput, feishuRow);
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
      const modelEntries = Object.entries(run2?.models ?? {});
      if (modelEntries.length > 0) {
        const modelChip = document.createElement("span");
        modelChip.className = "chip";
        modelChip.textContent = "model: " + modelEntries.map(([nid, m]) => nid + " " + m).join(" \xB7 ");
        gates.append(modelChip);
      }
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
          btn(t("actions.retryRun"), () => go(() => api.runRetry(run2.id, [...run2.failedNodeIds ?? [], ...run2.cancelledNodeIds ?? []][0] ?? "")), !((run2.status === "failed" || run2.status === "cancelled") && [...run2.failedNodeIds ?? [], ...run2.cancelledNodeIds ?? []].length > 0)),
          // M7/§18.3：数据源扩 cancelled（retryNode 已支持——M2 R1-9）；failedNodeIds 沿 M2 产出评审问题 1
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
var BUILD = true ? "639895064693" : "dev";
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
/* dsh-l-build:639895064693 */
