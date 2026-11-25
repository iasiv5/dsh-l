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
    loginTitle: "\u8FDE\u63A5\u4EE3\u7801\u5E93\uFF0C\u8BA9 Agent \u81EA\u4E3B\u4EA4\u4ED8",
    // 金句 B 修订（2026-11-20 用户删「你的」），品牌区只留大标题
    deviceNote: "\u65E0\u9700\u624B\u52A8\u8F93\u5165\u7528\u6237\u540D\u2014\u2014\u6388\u6743\u5B8C\u6210\u540E\u81EA\u52A8\u8FDB\u5165\u5DE5\u4F5C\u53F0\u3002",
    deviceExpiresIn: "\u7EA6 {n} \u5206\u949F\u540E\u8FC7\u671F",
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
    subNoGh: "\u5148\u5B89\u88C5 gh CLI\uFF0C\u518D\u8FDE\u63A5 GitHub",
    subInstalling: "\u6B63\u5728\u540E\u53F0\u5B89\u88C5 gh CLI\u2026",
    subPat: "\u8BBF\u95EE\u4EE4\u724C \xB7 \u6821\u9A8C\u540E\u4FDD\u5B58",
    subOk: "\u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C \xB7 \u4EE4\u724C\u6709\u6548",
    subDevice: "\u8BBE\u5907\u6D41\u6388\u6743 \xB7 \u7B49\u5F85\u786E\u8BA4",
    subErr: "\u51ED\u636E\u6821\u9A8C\u672A\u901A\u8FC7",
    subLimited: "\u51ED\u636E\u5065\u5EB7 \xB7 \u4E3B\u9650\u6D41\u751F\u6548",
    subFlowOk: "\u8BBE\u5907\u6D41\u6388\u6743 \xB7 \u4EE4\u724C\u6709\u6548",
    gate1: "gh CLI",
    gate2: "gh \u767B\u5F55",
    gate3: "\u51ED\u636E\u6821\u9A8C",
    g1Ok: "\u5DF2\u5B89\u88C5",
    g1Bad: "\u672A\u5B89\u88C5",
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
    srcDeviceFlow: "GitHub \u6388\u6743\uFF08\u8BBE\u5907\u6D41\uFF09\xB7 \u4EE4\u724C\u5B58\u4E8E gh \u51ED\u636E\u5E93",
    srcPat: "\u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C\uFF08\u624B\u52A8\uFF09\xB7 \u4EE4\u724C\u5B58\u4E8E gh \u51ED\u636E\u5E93",
    srcGh: "\u672C\u673A gh \u767B\u5F55\u6001\uFF08\u5DE5\u4F5C\u53F0\u5916\u5EFA\u7ACB\uFF09",
    scopeFineGrained: "\u7EC6\u7C92\u5EA6\u4EE4\u724C \xB7 \u6743\u9650\u6309\u4ED3\u5E93\u5224\u5B9A",
    checkedValid: "\u4EE4\u724C\u6709\u6548",
    checkedNever: "\u5C1A\u672A\u6821\u9A8C",
    checkedBroken: "\u7F3A\u5C11\u6743\u9650",
    checkedJustNow: "\u521A\u521A",
    checkedAgoSuffix: "\u5206\u949F\u524D",
    connectBtn: "\u8FDE\u63A5 GitHub",
    patBtn: "\u4F7F\u7528\u8BBF\u95EE\u4EE4\u724C",
    switchToPat: "\u6539\u7528\u8BBF\u95EE\u4EE4\u724C",
    switchToDevice: "\u6539\u7528\u8BBE\u5907\u6D41\u6388\u6743",
    deviceWaiting: "\u7B49\u5F85\u4F60\u5728 GitHub \u5B8C\u6210\u6388\u6743\u2026",
    copy: "\u590D\u5236",
    patTitle: "\u8BBF\u95EE\u4EE4\u724C\uFF08PAT\uFF09",
    patPlaceholder: "ghp_\xB7\xB7\xB7\xB7 \u6216 github_pat_\xB7\xB7\xB7\xB7",
    patShow: "\u663E\u793A",
    patHide: "\u9690\u85CF",
    patSave: "\u6821\u9A8C\u5E76\u4FDD\u5B58",
    patCancel: "\u53D6\u6D88",
    patHint: "\u6821\u9A8C\u901A\u8FC7\u5E76\u79FB\u4EA4 gh \u51ED\u636E\u5E93\u540E\u624D\u4F1A\u4FDD\u5B58\uFF08gh \u672A\u88C5\u65F6\u65E0\u6CD5\u4FDD\u5B58\uFF09\uFF1Bclassic \u4EE4\u724C\u9700\u542B repo\u3001read:org\uFF0C\u7EC6\u7C92\u5EA6\u4EE4\u724C\u6309\u4ED3\u5E93\u6388\u6743\u3002\u4FDD\u5B58\u540E\u4F1A\u8986\u76D6\u73B0\u6709\u51ED\u636E\u3002",
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
    errDeviceStart: "\u8BBE\u5907\u6D41\u53D1\u8D77\u5931\u8D25\uFF1AGitHub \u672A\u63A5\u53D7\u6388\u6743\u8BF7\u6C42\uFF08\u7F51\u7EDC\u5F02\u5E38\u6216\u914D\u7F6E\u95EE\u9898\uFF09\u3002\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF1B\u6301\u7EED\u5931\u8D25\u53EF\u6539\u7528\u8BBF\u95EE\u4EE4\u724C\u3002",
    errGhMissing: "gh CLI \u672A\u5B89\u88C5\uFF1A\u8BF7\u5148\u5B89\u88C5 gh CLI\uFF0C\u518D\u8FDE\u63A5 GitHub \u6216\u4F7F\u7528\u8BBF\u95EE\u4EE4\u724C\u3002",
    errHandoff: "\u4EE4\u724C\u79FB\u4EA4 gh \u51ED\u636E\u5E93\u5931\u8D25\uFF1A\u672A\u4FDD\u5B58\u4EFB\u4F55\u51ED\u636E\u3002\u8BF7\u91CD\u8BD5\uFF1B\u6301\u7EED\u5931\u8D25\u8BF7\u68C0\u67E5 gh \u53EF\u7528\u6027\u3002",
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
    urgency: "\u7D27\u6025\u5EA6",
    stage: "\u9636\u6BB5",
    saveCurrent: "\u5B58\u4E3A\u5E38\u7528",
    pins: "\u5E38\u7528\u8FC7\u6EE4",
    pinRemove: "\u5220"
  },
  urgency: { P0: "P0 \u7ACB\u5373", P1: "P1 \u9AD8", P2: "P2 \u4E2D", P3: "P3 \u4F4E" },
  validity: { high: "\u53EF\u4FE1", medium: "\u5B58\u7591", low: "\u4E0D\u53EF\u4FE1", none: "\u672A\u8BC4" },
  recommendedActions: { start: "\u5F00\u5DE5", feedback: "\u7B49\u53CD\u9988", close: "\u5173\u95ED", hold: "\u6302\u8D77" },
  gates: { G1: "\u5F00\u5DE5\u524D", G2: "\u4EA4\u4ED8\u524D", G3: "\u53D1\u7248\u524D" },
  triage: { confidence: "\u7F6E\u4FE1 {n}" },
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
    kanbanCol: "\u6B64\u9636\u6BB5\u6682\u65E0\u5019\u9009",
    filtered: "\u5F53\u524D\u8FC7\u6EE4\u4E0B\u6CA1\u6709\u5019\u9009\u3002",
    clearFilters: "\u6E05\u9664\u8FC7\u6EE4"
  },
  errors: {
    refreshFailed: "\u5237\u65B0\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
    noToken: "\u672A\u627E\u5230 GitHub \u51ED\u636E\uFF1A\u8BF7\u914D\u7F6E token\uFF0C\u6216\u5728\u672C\u673A\u767B\u5F55 gh\u3002",
    actionFailed: "\u64CD\u4F5C\u5931\u8D25",
    codes: {
      "gate-requires-gating": "\u8FD9\u4E2A\u5019\u9009\u73B0\u5728\u4E0D\u80FD\u8FD9\u4E48\u64CD\u4F5C\uFF1A\u8981\u5148\u5206\u8BCA\uFF0C\u6216\u7B49\u5B83\u4E0D\u518D\u8FDB\u884C\u4E2D",
      "engine-issue-only": "\u81EA\u52A8\u6267\u884C\u53EA\u670D\u52A1 issue\uFF0CPR \u8BF7\u7528\u300C\u5F00\u5DE5\u300D",
      "run-already-active": "\u8FD9\u4E2A\u5019\u9009\u5DF2\u6709\u6267\u884C\u5728\u8FDB\u884C\uFF0C\u5148\u53D6\u6D88\u6216\u7B49\u5B83\u7ED3\u675F",
      "workspace-not-found": "\u76EE\u5F55\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9",
      "managed-dir-explicit": "\u6258\u7BA1\u514B\u9686\u8BF7\u7528\u300C\u6258\u7BA1\u514B\u9686\u300D\u6309\u94AE\u8FDB\u5165\uFF0C\u4E0D\u8981\u624B\u586B\u8DEF\u5F84",
      "work-cwd-conflict": "\u8FD9\u4E2A\u5019\u9009\u5DF2\u6709\u4E00\u4E2A\u5728\u4E0D\u540C\u76EE\u5F55\u7684\u5F00\u5DE5\u4F1A\u8BDD\uFF0C\u5148\u7ED3\u675F\u5B83\u6216\u7528\u300C\u53E6\u5F00\u300D",
      "no-work-session": "\u8FD9\u4E2A\u5019\u9009\u6CA1\u6709\u8FDB\u884C\u4E2D\u7684\u5F00\u5DE5\u4F1A\u8BDD",
      "deliver-requires-building": "\u53EA\u6709\u8FDB\u884C\u4E2D\u7684\u5F00\u5DE5\u4F1A\u8BDD\u53EF\u4EE5\u786E\u8BA4\u4EA4\u4ED8",
      "engine-not-wired": "\u5F15\u64CE\u672A\u63A5\u5165\uFF0C\u8FD9\u662F\u90E8\u7F72\u95EE\u9898",
      "work-not-wired": "\u5F00\u5DE5\u4F1A\u8BDD\u672A\u63A5\u5165\uFF0C\u8FD9\u662F\u90E8\u7F72\u95EE\u9898",
      "gh-not-installed": "\u672C\u673A\u6CA1\u6709 gh\uFF0C\u8BF7\u5148\u5B89\u88C5\u5E76\u767B\u5F55",
      "gh-not-authorized": "gh \u8FD8\u6CA1\u767B\u5F55\uFF0C\u8BF7\u5148 gh auth login",
      "gh-not-ours": "\u672C\u673A gh \u767B\u5F55\u4E0D\u662F\u5DE5\u4F5C\u53F0\u521B\u5EFA\u7684\uFF0C\u5DE5\u4F5C\u53F0\u4E0D\u4EE3\u4E3A\u767B\u51FA",
      "credential-unhealthy": "GitHub \u51ED\u636E\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u6821\u9A8C\u6216\u66F4\u6362 token",
      "credential-missing": "\u6CA1\u6709\u53EF\u7528\u7684 GitHub \u51ED\u636E",
      "credential-invalid": "GitHub \u4E0D\u63A5\u53D7\u8FD9\u4E2A token\uFF0C\u8BF7\u66F4\u6362\u540E\u91CD\u8BD5",
      "credential-format": "\u51ED\u636E\u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u586B\u5199",
      "token-invalid": "token \u65E0\u6548",
      "auth-required": "\u8BF7\u5148\u8FDE\u63A5 GitHub",
      "already-authorized": "\u5DF2\u7ECF\u8FDE\u63A5\uFF0C\u4E0D\u9700\u8981\u91CD\u590D\u8FDE\u63A5",
      "model-not-in-catalog": "\u6A21\u578B\u4E0D\u5728\u76EE\u5F55\u91CC\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9",
      "preset-not-in-roster": "\u9884\u8BBE\u4E0D\u5728\u540D\u518C\u91CC\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9",
      "release-requires-shipped": "\u53EA\u6709\u5DF2\u4EA4\u4ED8\u7684\u5019\u9009\u53EF\u4EE5\u786E\u8BA4\u53D1\u7248",
      "release-already-confirmed": "\u8FD9\u6B21\u4EA4\u4ED8\u5DF2\u7ECF\u786E\u8BA4\u8FC7\u53D1\u7248",
      "refresh-in-progress": "\u6B63\u5728\u5237\u65B0\uFF0C\u8BF7\u7A0D\u5019",
      "feishu-not-wired": "\u98DE\u4E66\u672A\u63A5\u5165",
      "invalid-path": "\u8DEF\u5F84\u65E0\u6548",
      "gate-not-available-in-v1": "\u8FD9\u4E00\u7248\u8FD8\u6CA1\u6709\u8FD9\u9053\u95F8\u95E8",
      "candidate-not-found": "\u5019\u9009\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5237\u65B0\u6E05\u5355",
      "kickoff-failed": "\u5F00\u5DE5\u6D88\u606F\u6CA1\u53D1\u51FA\u53BB\uFF0C\u4F1A\u8BDD\u5DF2\u56DE\u6EDA\uFF0C\u8BF7\u91CD\u8BD5",
      "retry-requires-failed-or-cancelled": "\u53EA\u80FD\u91CD\u8BD5\u5931\u8D25\u6216\u5DF2\u53D6\u6D88\u7684\u8282\u70B9",
      "retry-requires-failed": "\u53EA\u80FD\u91CD\u8BD5\u5931\u8D25\u6216\u5DF2\u53D6\u6D88\u7684\u8282\u70B9",
      "attempt-exhausted": "\u91CD\u8BD5\u6B21\u6570\u5DF2\u7528\u5B8C"
    }
  },
  meta: { lastRefreshAt: "\u4E0A\u6B21\u5237\u65B0" },
  stateDot: { running: "\u6267\u884C\u4E2D", gating: "\u5F85\u4F60\u5904\u7406", unread: "\u6709\u672A\u770B\u7ED3\u679C", done: "\u5DF2\u5B8C\u6210", failed: "\u5931\u8D25", idle: "\u5E38\u89C4" },
  candidate: { draft: "\u8349\u7A3F" },
  kanban: { advance: "\u63A8\u8FDB", moveMore: "\u79FB\u81F3\u2026" },
  tabs: { list: "\u6E05\u5355", board: "\u770B\u677F", review: "\u5F85\u6211\u786E\u8BA4", sessions: "\u4F1A\u8BDD", roles: "\u89D2\u8272" },
  sessions: {
    title: "\u4F1A\u8BDD",
    badgeWork: "\u5F00\u5DE5",
    badgeRun: "\u6267\u884C",
    badgeAuto: "\u81EA\u52A8\u653E\u884C",
    badgeGone: "\u4E0A\u6E38\u5DF2\u5173\u95ED",
    badgeMissing: "\u4E0D\u5728\u4F1A\u8BDD\u5217\u8868",
    badgeRunning: "\u8FD0\u884C\u4E2D",
    open: "\u6253\u5F00",
    another: "\u53E6\u5F00\u4F1A\u8BDD",
    anotherFailed: "\u53E6\u5F00\u4F1A\u8BDD\u5931\u8D25",
    deliver: "\u786E\u8BA4\u4EA4\u4ED8",
    deliverFailed: "\u786E\u8BA4\u4EA4\u4ED8\u5931\u8D25",
    empty: "\u8FD8\u6CA1\u6709 dsh-l \u4F1A\u8BDD\u2014\u2014\u5C55\u5F00\u6E05\u5355\u91CC\u7684\u5019\u9009\u70B9\u300C\u5F00\u5DE5\u300D\uFF0C\u6216\u5BF9 issue \u70B9\u300C\u81EA\u52A8\u6267\u884C\u300D\uFF0C\u4F1A\u8BDD\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
    ago: "{t} \u524D",
    archive: "\u5DF2\u7ED3\u675F",
    stalled: "\u7591\u4F3C\u5361\u4F4F",
    stalledTitle: "\u8FD0\u884C\u8D85 15 \u5206\u949F\u65E0\u66F4\u65B0"
  },
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
    wizardTitle: "\u65B0\u589E\u89D2\u8272\u5411\u5BFC",
    deleteConfirm: "\u786E\u8BA4\u5220\u9664\u89D2\u8272 {id}\uFF1F\uFF08\u5185\u7F6E\u8986\u76D6\u5C42\u5220\u9664\u540E\u56DE\u843D\u5185\u7F6E\u9ED8\u8BA4\uFF09",
    inUse: "\u88AB\u5DE5\u4F5C\u6D41\u8282\u70B9\u5F15\u7528\uFF0C\u7981\u5220"
  },
  review: { gates: "\u5F85\u4F60\u653E\u884C", release: "\u5F85\u53D1\u7248\u786E\u8BA4", failed: "\u6267\u884C\u5931\u8D25", confirm: "\u786E\u8BA4\u5DF2\u53D1\u7248", empty: "\u6CA1\u6709\u5F85\u786E\u8BA4\u4E8B\u9879", notePlaceholder: "\u5907\u6CE8\uFF08\u53EF\u9009\uFF0C\u968F\u52A8\u4F5C\u7559\u75D5\uFF09", gateWait: "\u4E0A\u6E38 {nodes} \u5DF2\u5B8C\u6210\uFF0Crun \u505C\u5728 {gate} \u7B49\u4F60\u653E\u884C\u3002", gateWaitGeneric: "run \u505C\u5728 {gate} \u7B49\u4F60\u653E\u884C\u3002", gatePassEffect: "\u653E\u884C\u540E\u7EE7\u7EED\uFF1A{next}", gateRejectGeneric: "\u9A73\u56DE\u5C06\u6309\u8BE5\u95F8\u95E8\u914D\u7F6E\u7684\u56DE\u9000\u76EE\u6807\u91CD\u8DD1\u540E\u7EED\u8282\u70B9\u3002", passBtn: "\u653E\u884C\uFF08\u7EE7\u7EED\u4E0B\u6E38\uFF09", rejectBtn: "\u9A73\u56DE\uFF08\u56DE\u9000\u91CD\u8DD1\uFF09", waited: "\u5DF2\u7B49\u5F85 {d}" },
  feishu: { url: "\u98DE\u4E66 Webhook URL", save: "\u4FDD\u5B58 Webhook", saveOk: "Webhook \u5DF2\u4FDD\u5B58", test: "\u53D1\u9001\u6D4B\u8BD5\u6D88\u606F", testOk: "\u6D4B\u8BD5\u6D88\u606F\u5DF2\u53D1\u9001", testFail: "\u6D4B\u8BD5\u53D1\u9001\u5931\u8D25" },
  badge: { pending: "\u5F85\u786E\u8BA4 ({n})" },
  delivery: { pending: "\u5F85\u5408\u5E76", merged: "\u5DF2\u5408\u5E76", closed: "\u5DF2\u5173\u95ED" },
  batch: { selected: "\u5DF2\u9009 {n}", close: "\u5173\u95ED\u6240\u9009", override: "\u6279\u91CF\u63A8\u7FFB\uFF08\u7EDF\u4E00\u7406\u7531\uFF09", reasonPlaceholder: "\u7EDF\u4E00\u7406\u7531\uFF08by:human \u7559\u75D5\uFF09", done: "\u5B8C\u6210 {ok}\uFF0C\u5931\u8D25 {fail}", formValidity: "\u771F\u5B9E\u6027", formUrgency: "\u7D27\u6025\u5EA6", formAction: "\u5EFA\u8BAE\u52A8\u4F5C" },
  actions: { more: "\u66F4\u591A", triageBatch: "\u5206\u8BCA\u5F85\u5206\u8BCA", override: "\u4FDD\u5B58\u4EBA\u5DE5\u5224\u65AD", overrideGroup: "\u4EBA\u5DE5\u63A8\u7FFB\uFF08\u8BDA\u5B9E\u7559\u75D5 by:human\uFF09", reason: "\u7406\u7531", moveTo: "\u79FB\u5230", pass: "\u653E\u884C", reject: "\u9A73\u56DE", copyPackage: "\u590D\u5236\u4EFB\u52A1\u5305", cancelRun: "\u53D6\u6D88\u6267\u884C", retryRun: "\u91CD\u8BD5\u8BE5\u8282\u70B9" },
  run: {
    status: { running: "\u6267\u884C\u4E2D", waiting: "\u5F85\u4F60\u653E\u884C", succeeded: "\u5DF2\u4EA4\u4ED8", failed: "\u5931\u8D25", cancelled: "\u5DF2\u53D6\u6D88" },
    workspaceCloning: "\u5DE5\u4F5C\u533A\u514B\u9686\u4E2D",
    tabNodes: "\u8282\u70B9",
    tabHistory: "\u5386\u53F2",
    tabArtifacts: "\u5DE5\u4EF6",
    emptyArtifacts: "\u6682\u65E0\u5DE5\u4EF6",
    detail: "\u8BE6\u60C5",
    emptyHistory: "\u6682\u65E0\u5386\u53F2\u4E8B\u4EF6"
  },
  nodeState: { pending: "\u5F85\u8C03\u5EA6", ready: "\u5C31\u7EEA", skipped: "\u5DF2\u8DF3\u8FC7" },
  wizard: { stepStart: "\u9009\u62E9\u8D77\u70B9", stepIdentity: "\u89D2\u8272\u8EAB\u4EFD", stepReview: "\u786E\u8BA4\u4E0E\u4FDD\u5B58", blank: "\u7A7A\u767D\u8D77\u6B65", copySuffix: "\uFF08\u526F\u672C\uFF09", next: "\u4E0B\u4E00\u6B65", back: "\u4E0A\u4E00\u6B65" },
  palette: { title: "\u547D\u4EE4\u9762\u677F", placeholder: "\u8F93\u5165\u4EE5\u7B5B\u9009\u52A8\u4F5C\u2026", empty: "\u6CA1\u6709\u5339\u914D\u7684\u52A8\u4F5C" },
  peek: { title: "\u5019\u9009\u9884\u89C8", close: "\u5173\u95ED", history: "\u6700\u8FD1\u52A8\u6001", gates: "\u95F8\u95E8", package: "\u4EFB\u52A1\u5305", none: "\u672A\u751F\u6210" },
  nodeType: { agent: "agent \u8282\u70B9", script: "script \u8282\u70B9", gate: "\u4EBA\u5DE5\u95F8\u95E8" },
  kbd: { title: "\u952E\u76D8\u5FEB\u6377\u952E", jk: "j / k\uFF1A\u4E0A\u4E0B\u79FB\u52A8", enter: "Enter / Space\uFF1A\u5C55\u5F00\u6216\u6536\u8D77", x: "x\uFF1A\u52FE\u9009\u5F53\u524D\u884C", peek: "p\uFF1A\u9884\u89C8\u5F53\u524D\u884C", digits: "\u6570\u5B57 1\u20135\uFF1A\u5207\u6362\u89C6\u56FE", help: "?\uFF1A\u672C\u5E2E\u52A9", close: "\u5173\u95ED" },
  gateV1Hint: "\u6267\u884C\u73AF v2\uFF1AG1/G2 \u4EBA\u5DE5\u653E\u884C\uFF1BG3 \u53D1\u7248\u95F8\u4E8E\u540E\u7EED\u7248\u672C\u5F00\u653E",
  work: {
    startBtn: "\u5F00\u5DE5",
    // 收敛 M2 Task 14：主按钮文案（等于「我来开」）
    openBtn: "\u6253\u5F00\u4F1A\u8BDD",
    openPending: "\u4F1A\u8BDD\u4ECD\u5728\u5217\u8868\u540C\u6B65\u4E2D\uFF0C\u7A0D\u540E\u4ECE\u4F1A\u8BDD\u5217\u8868\u6253\u5F00\u3002",
    startFailed: "\u5F00\u5DE5\u5931\u8D25",
    endSession: "\u7ED3\u675F\u4F1A\u8BDD",
    pickTitle: "\u9009\u62E9\u5F00\u5DE5\u5DE5\u4F5C\u533A",
    pickLocal: "\u672C\u5730\u9ED8\u8BA4\u68C0\u51FA\uFF08~/workspace/\u4ED3\u76EE\u5F55\uFF09",
    pickBrowse: "\u9009\u62E9\u76EE\u5F55\u2026",
    pickManaged: "\u6258\u7BA1\u514B\u9686\uFF08dsh-l \u6570\u636E\u76EE\u5F55\uFF0C\u6309\u5019\u9009\u5F00\u5206\u652F\uFF09",
    pickCancel: "\u53D6\u6D88",
    pickProceed: "\u4ECD\u8981\u5728\u6B64\u76EE\u5F55\u5F00\u5DE5",
    dirtyHint: "\u8BE5\u76EE\u5F55\u6709\u672A\u63D0\u4EA4\u6539\u52A8\u2014\u2014\u4E0D\u4F1A\u88AB\u52A8\u5230\uFF0C\u4F46\u5F00\u5DE5\u524D\u8BF7\u81EA\u884C\u786E\u8BA4\u3002",
    pickBrowseFailed: "\u76EE\u5F55\u9009\u62E9\u4E0D\u53EF\u7528\uFF0C\u8BF7\u6539\u7528\u5176\u5B83\u65B9\u5F0F\u3002",
    dirMemory: "\u5F00\u5DE5\u76EE\u5F55\uFF1A{dir}",
    dirFirst: "\u9996\u6B21\u5F00\u5DE5\uFF0C\u5148\u9009\u76EE\u5F55",
    dirManaged: "\u6258\u7BA1\u514B\u9686",
    dirGone: "\u8BB0\u4F4F\u7684\u76EE\u5F55\u5DF2\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9",
    pickLocalFailed: "\u672C\u5730\u9ED8\u8BA4\u68C0\u51FA\u672A\u547D\u4E2D\uFF08~/workspace/<\u4ED3\u540D> \u4E0D\u5B58\u5728\uFF09",
    appearsDefault: "\u672C\u5730\u9ED8\u8BA4\u68C0\u51FA {dir}\uFF1A\u4F1A\u8BDD\u5C06\u51FA\u73B0\u5728 {where}",
    appearsPick: "\u9009\u62E9\u76EE\u5F55\u2026\uFF1A\u9009\u597D\u540E\u663E\u793A\u4F1A\u8BDD\u5C06\u51FA\u73B0\u5728\u54EA",
    appearsManaged: "\u6258\u7BA1\u514B\u9686\uFF1A\u4F1A\u8BDD\u5C06\u51FA\u73B0\u5728 DSH Loop Forge",
    appearsAt: "\u4F1A\u8BDD\u5C06\u51FA\u73B0\u5728 {where}",
    ungrouped: "\u672A\u5206\u7EC4",
    autoRun: "\u81EA\u52A8\u6267\u884C",
    autoConfirmTitle: "\u786E\u8BA4\u81EA\u52A8\u6267\u884C",
    autoFactMode: "\u8D70\u54EA\u6761\u8DEF\uFF1A\u5F15\u64CE\u8DD1\u5B8C\u6784\u5EFA\u4E0E\u9A8C\u8BC1\uFF0C\u505C\u5728 G2 \u7B49\u4F60\u653E\u884C",
    autoFactPath: "\u5728\u54EA\u5E72\u6D3B\uFF1A\u6267\u884C\u76EE\u5F55 {dir}\uFF08\u4ECE\u9ED8\u8BA4\u5206\u652F\u65B0\u8D77\u5DE5\u4F5C\u5206\u652F\uFF0C\u4E0D\u78B0\u4F60\u7684\u672C\u5730\u68C0\u51FA\uFF09",
    autoFactSession: "\u4F1A\u8BDD\u5728\u54EA\uFF1A\u5BBF\u4E3B\u4FA7\u680F\u7684\u300CDSH Loop Forge\u300D\u5206\u7EC4",
    autoFactShip: "\u8C01\u4EA4\u4ED8\uFF1AG2 \u653E\u884C\u540E\u81EA\u52A8\u63A8\u9001\u5E76\u5F00 PR\uFF0C\u8BB0\u5728\u6765\u6E90\u5019\u9009\u4E0A",
    autoGo: "\u786E\u8BA4\u6267\u884C",
    changeDir: "\u6362\u4E2A\u76EE\u5F55\u5F00\u5DE5\u2026"
  },
  settings: { title: "\u8BBE\u7F6E", intervalMinutes: "\u81EA\u52A8\u5237\u65B0\u95F4\u9694\uFF08\u5206\u949F\uFF0C0 = \u5173\u95ED\uFF09", save: "\u4FDD\u5B58", triageModel: "\u5206\u8BCA\u6A21\u578B", followDefault: "\u8DDF\u968F\u5BBF\u4E3B\u9ED8\u8BA4", notInCatalog: "\uFF08\u4E0D\u5728\u76EE\u5F55\u4E2D\uFF09", workModel: "\u5F00\u5DE5\u4F1A\u8BDD\u6A21\u578B", workPreset: "\u5F00\u5DE5\u4F1A\u8BDD Preset", workPolicy: "\u5F00\u5DE5\u5BA1\u6279\u7B56\u7565\uFF08\u4EC5\u5BF9\u65B0\u4F1A\u8BDD\u751F\u6548\uFF09", policyAsk: "\u6BCF\u6B21\u8BE2\u95EE", policyNever: "\u81EA\u52A8\u653E\u884C", policyNeverConfirm: "\u8BBE\u4E3A\u300C\u81EA\u52A8\u653E\u884C\u300D\u540E\uFF0C\u65B0\u5F00\u5DE5\u4F1A\u8BDD\u5185\u7684\u5DE5\u5177\u8C03\u7528\u5C06\u4E0D\u518D\u9010\u6761\u8BE2\u95EE\u3001\u81EA\u52A8\u6267\u884C\u3002\u786E\u8BA4\u4FDD\u5B58\uFF1F", concurrency: "\u5E76\u53D1\u4E0A\u9650\uFF081\u20134\uFF09", hostDefault: "\u9ED8\u8BA4\u6A21\u578B\uFF1A", hostDefaultLoading: "\u52A0\u8F7D\u4E2D\u2026", hostDefaultNone: "\uFF08\u5BBF\u4E3B\u672A\u914D\u7F6E\uFF09" }
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
    loginTitle: "Connect code repositories and let agents deliver autonomously",
    deviceNote: "No username typing required \u2014 you enter the workbench automatically once authorized.",
    deviceExpiresIn: "expires in ~{n} min",
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
    subNoGh: "Install gh CLI first, then connect GitHub",
    subInstalling: "Installing gh CLI in the background\u2026",
    subPat: "Access token \xB7 verified before saving",
    subOk: "Personal access token \xB7 valid",
    subDevice: "Device-flow authorization \xB7 awaiting confirmation",
    subErr: "Credential verification failed",
    subLimited: "Credential healthy \xB7 primary rate limit in effect",
    subFlowOk: "Device-flow authorization \xB7 token valid",
    gate1: "gh CLI",
    gate2: "gh sign-in",
    gate3: "Credential check",
    g1Ok: "installed",
    g1Bad: "not installed",
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
    srcDeviceFlow: "GitHub authorization (device flow) \xB7 token lives in the gh credential store",
    srcPat: "Personal access token (manual) \xB7 token lives in the gh credential store",
    srcGh: "Local gh sign-in (created outside the workbench)",
    scopeFineGrained: "Fine-grained token \xB7 permissions judged per repository",
    checkedValid: "token valid",
    checkedNever: "not verified yet",
    checkedBroken: "missing scopes",
    checkedJustNow: "just now",
    checkedAgoSuffix: "min ago",
    connectBtn: "Connect GitHub",
    patBtn: "Use access token",
    switchToPat: "Switch to access token",
    switchToDevice: "Switch to device flow",
    deviceWaiting: "Waiting for you to authorize on GitHub\u2026",
    copy: "Copy",
    patTitle: "Access token (PAT)",
    patPlaceholder: "ghp_\xB7\xB7\xB7\xB7 or github_pat_\xB7\xB7\xB7\xB7",
    patShow: "Show",
    patHide: "Hide",
    patSave: "Verify & save",
    patCancel: "Cancel",
    patHint: "Saved only after verification and hand-off to the gh credential store (needs gh installed); classic tokens need repo and read:org, fine-grained authorize per repository. Saving overwrites your existing credential.",
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
    errDeviceStart: "Device flow failed to start: GitHub rejected the request (network or configuration issue). Retry later; if it persists, use an access token instead.",
    errGhMissing: "gh CLI is not installed: install gh CLI before connecting GitHub or using an access token.",
    errHandoff: "Failed to hand the token to the gh credential store: nothing was saved. Retry; if it persists, check gh availability.",
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
    urgency: "Urgency",
    stage: "Stage",
    saveCurrent: "Save as pinned",
    pins: "Pinned filters",
    pinRemove: "Remove"
  },
  urgency: { P0: "P0 now", P1: "P1 high", P2: "P2 medium", P3: "P3 low" },
  validity: { high: "credible", medium: "doubtful", low: "not credible", none: "unrated" },
  recommendedActions: { start: "start", feedback: "await feedback", close: "close", hold: "hold" },
  gates: { G1: "before build", G2: "before ship", G3: "before release" },
  triage: { confidence: "Confidence {n}" },
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
    kanbanCol: "Nothing at this stage",
    filtered: "No candidates match the current filters.",
    clearFilters: "Clear filters"
  },
  errors: {
    refreshFailed: "Refresh failed. Please retry later.",
    noToken: "No GitHub credential found: configure a token or sign in to gh on this machine.",
    actionFailed: "Action failed",
    codes: {
      "gate-requires-gating": "This candidate cannot do that right now: triage it first, or wait until it is no longer in progress",
      "engine-issue-only": "Automatic runs serve issues only; for a PR use Start work",
      "run-already-active": "This candidate already has a run in progress \u2014 cancel it or wait",
      "workspace-not-found": "That directory does not exist \u2014 pick again",
      "managed-dir-explicit": "Use the Managed clone button to enter a managed clone; do not type its path",
      "work-cwd-conflict": "This candidate already has a work session in a different directory \u2014 end it or use Start another",
      "no-work-session": "This candidate has no work session in progress",
      "deliver-requires-building": "Only a candidate with a work session in progress can be confirmed as delivered",
      "engine-not-wired": "The engine is not wired \u2014 this is a deployment problem",
      "work-not-wired": "Work sessions are not wired \u2014 this is a deployment problem",
      "gh-not-installed": "gh is not installed here \u2014 install it and sign in",
      "gh-not-authorized": "gh is not signed in \u2014 run gh auth login first",
      "gh-not-ours": "The local gh sign-in was not created by the workbench, so the workbench does not log it out",
      "credential-unhealthy": "The GitHub credential is unhealthy \u2014 re-verify it or replace the token",
      "credential-missing": "No usable GitHub credential",
      "credential-invalid": "GitHub rejected this token \u2014 replace it and try again",
      "credential-format": "The credential is malformed \u2014 enter it again",
      "token-invalid": "The token is invalid",
      "auth-required": "Connect GitHub first",
      "already-authorized": "Already connected \u2014 no need to connect again",
      "model-not-in-catalog": "That model is not in the catalog \u2014 pick again",
      "preset-not-in-roster": "That preset is not in the roster \u2014 pick again",
      "release-requires-shipped": "Only a delivered candidate can confirm a release",
      "release-already-confirmed": "The release for this delivery was already confirmed",
      "refresh-in-progress": "Refreshing \u2014 please wait",
      "feishu-not-wired": "Feishu is not wired",
      "invalid-path": "Invalid path",
      "gate-not-available-in-v1": "This gate is not available in this version yet",
      "candidate-not-found": "Candidate not found \u2014 refresh the list",
      "kickoff-failed": "The kickoff message could not be sent; the session was rolled back \u2014 try again",
      "retry-requires-failed-or-cancelled": "Only a failed or cancelled node can be retried",
      "retry-requires-failed": "Only a failed or cancelled node can be retried",
      "attempt-exhausted": "No retries left"
    }
  },
  meta: { lastRefreshAt: "Last refresh" },
  stateDot: { running: "Running", gating: "Needs you", unread: "Unseen results", done: "Done", failed: "Failed", idle: "Idle" },
  candidate: { draft: "draft" },
  kanban: { advance: "Advance", moveMore: "Move to\u2026" },
  tabs: { list: "List", board: "Board", review: "Needs review", sessions: "Sessions", roles: "Roles" },
  sessions: {
    title: "Sessions",
    badgeWork: "Work",
    badgeRun: "Run",
    badgeAuto: "Auto-approve",
    badgeGone: "Upstream closed",
    badgeMissing: "Not in session list",
    badgeRunning: "Running",
    open: "Open",
    another: "Start another",
    anotherFailed: "Start another failed",
    deliver: "Confirm delivery",
    deliverFailed: "Deliver failed",
    empty: 'No dsh-l sessions yet \u2014 expand a candidate in the list and choose "Start work", or "Run automatically" on an issue; the sessions show up here.',
    ago: "{t} ago",
    archive: "Finished",
    stalled: "Possibly stuck",
    stalledTitle: "No update for over 15 minutes"
  },
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
    wizardTitle: "New role wizard",
    deleteConfirm: "Delete role {id}? (builtin overrides fall back to the builtin default)",
    inUse: "Referenced by workflow nodes; deletion disabled"
  },
  review: { gates: "Waiting for you", release: "Release pending", failed: "Failed", confirm: "Confirm released", empty: "Nothing waiting for you", notePlaceholder: "Note (optional, recorded with the action)", gateWait: "Upstream {nodes} finished; the run is paused at {gate} for your approval.", gateWaitGeneric: "The run is paused at {gate} for your approval.", gatePassEffect: "After approval: {next}", gateRejectGeneric: "Rejecting re-runs downstream from this gate's configured fallback target.", passBtn: "Approve (continue)", rejectBtn: "Reject (rework)", waited: "Waiting for {d}" },
  feishu: { url: "Feishu webhook URL", save: "Save webhook", saveOk: "Webhook saved", test: "Send test message", testOk: "Test message sent", testFail: "Test send failed" },
  badge: { pending: "Pending ({n})" },
  delivery: { pending: "Awaiting merge", merged: "Merged", closed: "Closed" },
  batch: { selected: "Selected {n}", close: "Close selected", override: "Bulk override (shared reason)", reasonPlaceholder: "Shared reason (recorded as by:human)", done: "{ok} done, {fail} failed", formValidity: "Validity", formUrgency: "Urgency", formAction: "Action" },
  actions: { more: "More", triageBatch: "Triage inbox", override: "Save my judgment", overrideGroup: "Manual override (recorded as by:human)", reason: "Reason", moveTo: "Move to", pass: "Pass", reject: "Reject", copyPackage: "Copy task package", cancelRun: "Cancel run", retryRun: "Retry node" },
  run: {
    status: { running: "Running", waiting: "Waiting for you", succeeded: "Delivered", failed: "Failed", cancelled: "Cancelled" },
    workspaceCloning: "Cloning workspace",
    tabNodes: "Nodes",
    tabHistory: "History",
    tabArtifacts: "Artifacts",
    emptyArtifacts: "No artifacts",
    detail: "Details",
    emptyHistory: "No history events"
  },
  nodeState: { pending: "Pending", ready: "Ready", skipped: "Skipped" },
  wizard: { stepStart: "Choose a starting point", stepIdentity: "Role identity", stepReview: "Review and save", blank: "Start blank", copySuffix: " (copy)", next: "Next", back: "Back" },
  palette: { title: "Command palette", placeholder: "Type to filter actions\u2026", empty: "No matching actions" },
  peek: { title: "Candidate preview", close: "Close", history: "Recent activity", gates: "Gates", package: "Task package", none: "Not created" },
  nodeType: { agent: "agent node", script: "script node", gate: "human gate" },
  kbd: { title: "Keyboard shortcuts", jk: "j / k: move up/down", enter: "Enter / Space: expand or collapse", x: "x: toggle row selection", peek: "p: preview current row", digits: "Digits 1\u20135: switch views", help: "?: this help", close: "Close" },
  gateV1Hint: "Loop v2: G1/G2 human gates; the G3 release gate opens later",
  work: {
    startBtn: "Start work",
    // 收敛 M2 Task 14: primary action (start it yourself)
    openBtn: "Open session",
    openPending: "Session is still syncing into the list \u2014 open it from the session list shortly.",
    startFailed: "Start failed",
    endSession: "End session",
    pickTitle: "Pick a workspace to start in",
    pickLocal: "Local default checkout (~/workspace/<repo>)",
    pickBrowse: "Choose directory\u2026",
    pickManaged: "Managed clone (dsh-l data dir, branch per candidate)",
    pickCancel: "Cancel",
    pickProceed: "Start in this directory anyway",
    dirtyHint: "This directory has uncommitted changes \u2014 dsh-l will not touch them, but please double-check before starting.",
    pickBrowseFailed: "Directory picker unavailable \u2014 use another option.",
    dirMemory: "Starts in: {dir}",
    dirFirst: "First start: pick a directory",
    dirManaged: "Managed clone",
    dirGone: "The remembered directory no longer exists \u2014 pick again",
    pickLocalFailed: "Local default checkout not found (~/workspace/<repo> does not exist)",
    appearsDefault: "Local default checkout {dir}: the session appears under {where}",
    appearsPick: "Pick a directory\u2026: its workspace shows after you pick",
    appearsManaged: "Managed clone: the session appears under DSH Loop Forge",
    appearsAt: "The session appears under {where}",
    ungrouped: "Ungrouped",
    autoRun: "Run automatically",
    autoConfirmTitle: "Confirm the automatic run",
    autoFactMode: "Path: the engine builds and verifies, then stops at G2 for your decision",
    autoFactPath: "Where: run directory {dir} (a new branch off the default branch; your local checkout is untouched)",
    autoFactSession: 'Sessions: under the "DSH Loop Forge" group in the host sidebar',
    autoFactShip: "Who ships: after you pass G2, the engine pushes and opens the PR, recorded on this candidate",
    autoGo: "Confirm run",
    changeDir: "Start in another directory\u2026"
  },
  settings: { title: "Settings", intervalMinutes: "Auto-refresh interval (minutes, 0 = off)", save: "Save", triageModel: "Triage model", followDefault: "Follow host default", notInCatalog: "(not in catalog)", workModel: "Work session model", workPreset: "Work session preset", workPolicy: "Work approval policy (new sessions only)", policyAsk: "Ask every time", policyNever: "Auto-approve", policyNeverConfirm: 'With "Auto-approve", tool calls in newly created work sessions run without per-call confirmation. Save anyway?', concurrency: "Concurrency (1\u20134)", hostDefault: "Default model: ", hostDefaultLoading: "loading\u2026", hostDefaultNone: "(host default not configured)" }
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

// src/client/keyboard-shim.mjs
function installKeyboardPrototypeShim() {
  if (typeof Event === "undefined") return false;
  const proto = Event.prototype;
  if (Object.getOwnPropertyDescriptor(proto, "key")) return false;
  Object.defineProperty(proto, "key", {
    get() {
      return "Unidentified";
    },
    // W3C UI Events：无法识别的按键标准值 → 宿主处理器安全早退
    set(v) {
      Object.defineProperty(this, "key", { value: v, writable: true, configurable: true });
    },
    configurable: true
  });
  Object.defineProperty(proto, "isComposing", { get() {
    return false;
  }, configurable: true });
  Object.defineProperty(proto, "repeat", { get() {
    return false;
  }, configurable: true });
  Object.defineProperty(proto, "getModifierState", { value: () => false, configurable: true, writable: true });
  return true;
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
function filterCandidates(list, { type = "all", repo = "all", urgency = "all", stage = "all" } = {}) {
  return (list ?? []).filter((c) => (type === "all" || c.type === type) && (repo === "all" || c.repo === repo) && (urgency === "all" || (c.triage?.urgency ?? "") === urgency) && (stage === "all" || bucketOf(c.stage) === stage));
}
function facetCounts(list) {
  const out = { type: {}, urgency: {}, repo: {}, stage: {} };
  for (const c of list ?? []) {
    out.type[c.type] = (out.type[c.type] ?? 0) + 1;
    const u = c.triage?.urgency;
    if (u) out.urgency[u] = (out.urgency[u] ?? 0) + 1;
    if (c.repo) out.repo[c.repo] = (out.repo[c.repo] ?? 0) + 1;
    const b = bucketOf(c.stage);
    out.stage[b] = (out.stage[b] ?? 0) + 1;
  }
  return out;
}
function pickTriageBatch(list, filters = {}) {
  return filterCandidates(list, { type: filters.type ?? "all", repo: filters.repo ?? "all", urgency: "all" }).filter((c) => c.stage === "inbox").slice(0, 10).map((c) => c.key);
}
function gateState(candidate) {
  return { G1: candidate?.stage === "gating", G2: false, G3: false };
}
var startable = (c) => c?.stage === "gating" || c?.stage === "triaged";
var runDirName = (key) => String(key ?? "").replace(/[^A-Za-z0-9._-]/g, "_");
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
function workSessionSettingsPatch(initial, form, base = {}) {
  const patch = { ...base };
  if (form.workModelValue !== void 0 && form.workModelValue !== modelValueOf(initial.workSessionModel)) {
    if (form.workModelValue === "") patch.workSessionModel = null;
    else {
      const cut = form.workModelValue.indexOf("\n");
      patch.workSessionModel = { provider: form.workModelValue.slice(0, cut), model: form.workModelValue.slice(cut + 1) };
    }
  }
  if (form.workPreset !== void 0 && form.workPreset !== (initial.workSessionPreset ?? "")) {
    patch.workSessionPreset = form.workPreset === "" ? null : form.workPreset;
  }
  if (form.workPolicy !== void 0 && form.workPolicy !== (initial.workSessionApprovalPolicy ?? "")) {
    patch.workSessionApprovalPolicy = form.workPolicy === "" ? null : form.workPolicy;
  }
  return patch;
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
function candidateState({ candidate: c, run = null, seen = false }) {
  if (run?.status === "failed") return "failed";
  if (c?.stage === "gating" || run?.status === "waiting" || c?.stage === "shipped" && !c?.release?.confirmedAt) return "gating";
  if (run?.status === "succeeded" && !seen) return "unread";
  if (run?.status === "running" || c?.stage === "building" || c?.stage === "verifying") return "running";
  if (c?.stage === "shipped") return "done";
  return "idle";
}
function sessionState(item, summary = null) {
  if (summary?.running) return "running";
  const stage = item?.candidate?.stage;
  if (stage === "building" || stage === "verifying") return "running";
  if (stage === "gating") return "gating";
  if (stage === "shipped") return "done";
  return "idle";
}
function advanceStageOf(stage) {
  if (stage === "inbox") return "triaged";
  if (stage === "triaged") return "gating";
  return null;
}
function formatAge(ageDays) {
  if (ageDays === null || ageDays === void 0 || ageDays === "") return "";
  const n = Number(ageDays);
  if (!Number.isFinite(n)) return "";
  return n < 1 ? "<1d" : Math.round(n) + "d";
}
function gateWaitInfo({ run, template } = {}) {
  const nodes = template?.nodes ?? [];
  const gateId = run?.waitingGateId ?? null;
  const i = nodes.findIndex((n) => n.id === (run?.waitingGate ?? null));
  if (i < 0) return { gateId, upstreamNames: [], nextNames: [] };
  const blocked = /* @__PURE__ */ new Set([...run?.failedNodeIds ?? [], ...run?.cancelledNodeIds ?? []]);
  const upstreamNames = nodes.slice(0, i).filter((n) => n.type !== "gate" && !blocked.has(n.id)).map((n) => n.name ?? n.id);
  const nextNames = nodes.slice(i + 1).filter((n) => n.type !== "gate").map((n) => n.name ?? n.id);
  const nextNodes = nodes.slice(i + 1).filter((n) => n.type !== "gate").map((n) => ({ name: n.name ?? n.id, type: n.type }));
  return { gateId, upstreamNames, nextNames, nextNodes };
}
function prettyKey(key) {
  const m = typeof key === "string" ? key.match(/^(.+)#(?:issue|pull)#(\d+)$/) : null;
  return m ? m[1] + "#" + m[2] : key;
}
function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "";
  if (n < 9e4) return "1m";
  const m = n / 6e4;
  if (m < 60) return Math.round(m) + "m";
  const h2 = n / 36e5;
  if (h2 < 24) return Math.round(h2) + "h";
  return Math.round(n / 864e5) + "d";
}
function formatRelative(updatedAtMs, nowMs) {
  const a = Number(updatedAtMs);
  const b = Number(nowMs);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
  return formatDuration(Math.max(0, b - a));
}
function sortGateRunsByWait(runs) {
  return [...runs ?? []].sort((a, b) => {
    const pa = Date.parse(a?.waitingSince ?? "");
    const pb = Date.parse(b?.waitingSince ?? "");
    const ta = Number.isFinite(pa) ? pa : Infinity;
    const tb = Number.isFinite(pb) ? pb : Infinity;
    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
    return ta - tb;
  });
}
var STALL_MS = 15 * 6e4;
function stalledOf(updatedAt, nowMs) {
  const a = Number(updatedAt);
  const b = Number(nowMs);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return b - a > STALL_MS;
}
var PIN_KEY = "dsh-l.pinnedFilters.v1";
var memoryStore = null;
var memoryStorage = () => memoryStore ??= /* @__PURE__ */ (() => {
  const m = /* @__PURE__ */ new Map();
  return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();
function loadPins(storage) {
  const st = storage ?? memoryStorage();
  let raw = null;
  try {
    raw = st.getItem(PIN_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function savePins(storage, pins) {
  const st = storage ?? memoryStorage();
  try {
    st.setItem(PIN_KEY, JSON.stringify(pins ?? []));
  } catch {
  }
  return pins ?? [];
}
function makePinId() {
  return "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}
function errorText(error, t) {
  const code = String(error?.message ?? error ?? "").trim();
  if (!code) return null;
  const text = t("errors.codes." + code);
  return text === "errors.codes." + code ? null : text;
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
  workStart: (key, cwd = null, another = false, lang = "zh-CN", workspace = null) => send("dsh-l/work/start", { key, cwd, another, lang, workspace: workspace ?? void 0 }),
  workspaceStatus: (cwd) => get("dsh-l/work/workspace-status?cwd=" + encodeURIComponent(cwd)),
  workDefaultDir: (repo) => get("dsh-l/work/default-dir?repo=" + encodeURIComponent(repo)),
  workSessions: () => get("dsh-l/work/sessions"),
  workDeliver: (key, note = "") => send("dsh-l/work/deliver", { key, note }),
  workEnd: (key) => send("dsh-l/work/end", { key }),
  rolesList: () => get("dsh-l/roles"),
  rolesUpsert: (role) => send("dsh-l/roles", { role }),
  rolesDelete: (id) => send("dsh-l/roles/delete", { id }),
  feishuTest: () => send("dsh-l/feishu/test", {}),
  putFeishuWebhook: (url) => send("dsh-l/feishu/webhook", { url }, "PUT"),
  settings: () => get("dsh-l/settings"),
  putSettings: (patch) => send("dsh-l/settings", patch, "PUT")
};

// src/client/components/stateDot.mjs
function stateDotEl(state, t) {
  const el10 = document.createElement("span");
  const s = ["running", "gating", "unread", "done", "failed", "idle"].includes(state) ? state : "idle";
  el10.className = "stdot st-" + s;
  switch (s) {
    case "running":
      el10.title = t("stateDot.running");
      break;
    case "gating":
      el10.title = t("stateDot.gating");
      break;
    case "unread":
      el10.title = t("stateDot.unread");
      break;
    case "done":
      el10.title = t("stateDot.done");
      break;
    case "failed":
      el10.title = t("stateDot.failed");
      break;
    default:
      el10.title = t("stateDot.idle");
  }
  return el10;
}

// src/client/components/candidateRow.mjs
var el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function metaFootnote(candidate, t) {
  const segs = [];
  const age = formatAge(candidate?.meta?.ageDays);
  if (age) segs.push(age);
  const comments = candidate?.meta?.comments;
  if (comments !== null && comments !== void 0) segs.push("\u{1F4AC}" + comments);
  const reactions = candidate?.meta?.reactionsTotal;
  if (reactions !== null && reactions !== void 0) segs.push("\u25B2" + reactions);
  if (candidate?.type === "pull" && candidate?.pull?.draft) segs.push(t("candidate.draft"));
  const d = candidate?.delivery;
  const hasPr = Boolean(d?.prNumber);
  if (segs.length === 0 && !hasPr) return null;
  const foot = el("span", "rowmeta", segs.join(" \xB7 "));
  if (hasPr) {
    const link = document.createElement("a");
    link.href = String(d.prUrl ?? "#");
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = (segs.length ? " \xB7 " : "") + "PR #" + d.prNumber + " \xB7 " + (d.merged ? t("delivery.merged") : d.closed ? t("delivery.closed") : t("delivery.pending"));
    foot.append(link);
  }
  return foot;
}
function renderRow(container, candidate, t, { expanded = false, onToggle, actions, run = null, seen = false, selectable = false, selected = false, onToggleSelect = null, onCheckboxEl = null } = {}) {
  const row2 = el("div", "row" + (expanded ? " rowActive" : ""));
  row2.dataset.key = candidate.key;
  row2.append(stateDotEl(candidateState({ candidate, run, seen }), t));
  if (selectable) {
    const chk = el("button", "rowcheck");
    chk.type = "button";
    chk.setAttribute("role", "checkbox");
    chk.setAttribute("aria-checked", String(!!selected));
    chk.setAttribute("aria-label", candidate.key);
    chk.dataset.key = candidate.key;
    chk.dataset.navKey = "row-check:" + candidate.key;
    chk.onclick = () => onToggleSelect?.(candidate.key);
    onCheckboxEl?.(chk);
    row2.append(chk);
  }
  row2.append(el("span", "badge " + candidate.type, candidate.type === "pull" ? "PR" : "Issue"));
  const title = el("button", "title", candidate.repo + "#" + candidate.number + "  " + candidate.title);
  title.type = "button";
  title.setAttribute("aria-expanded", String(expanded));
  title.dataset.navKey = "row-title:" + candidate.key;
  const meta = metaFootnote(candidate, t);
  if (meta) title.append(meta);
  title.onclick = () => onToggle?.(candidate.key);
  row2.append(title);
  row2.append(el("span", "ux-chev", expanded ? "\u25BE" : "\u25B8"));
  if (candidate.triage) {
    row2.append(
      el("span", "chip u-" + candidate.triage.urgency, t("urgency." + candidate.triage.urgency)),
      el("span", "chip v-" + candidate.triage.validity, t("validity." + candidate.triage.validity)),
      el("span", "chip", t("recommendedActions." + candidate.triage.action))
    );
  } else {
    row2.append(el("span", "chip muted", t("validity.none")));
  }
  if (Number.isInteger(candidate?.triage?.confidence)) {
    row2.append(el("span", "chip", t("triage.confidence").replace("{n}", String(candidate.triage.confidence))));
  }
  container.append(row2);
  if (expanded) {
    const detail = el("div", "detail");
    detail.setAttribute("role", "region");
    const titleId = "dsh-l-rowtitle-" + String(candidate.key).replace(/[^A-Za-z0-9_-]/g, "_");
    title.id = titleId;
    detail.setAttribute("aria-labelledby", titleId);
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
var setText = (n, v) => {
  if (n && n.textContent !== v) n.textContent = v;
};
var svg = (markup) => {
  const s = el2("span");
  s.innerHTML = markup;
  return s.firstElementChild;
};
var GH_MARK = '<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
var REFRESH_MARK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96"/><path d="M13.7 1.6v2.9h-2.9" stroke-linejoin="round"/></svg>';
function guardPatInput(patInput) {
  patInput.autocomplete = "new-password";
  patInput.readOnly = true;
  const unroof = () => {
    patInput.readOnly = false;
  };
  patInput.addEventListener("mousedown", unroof, { once: true });
  patInput.addEventListener("focus", unroof, { once: true });
  patInput.addEventListener("touchstart", unroof, { once: true, passive: true });
}
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
  if (m.startsWith("gh-not-installed")) return t("cred.errGhMissing");
  if (m.startsWith("gh-handoff-failed")) return t("cred.errHandoff");
  if (m.startsWith("device-start-failed")) return t("cred.errDeviceStart");
  if (m.startsWith("gh-not-ours")) return t("cred.errGhNotOurs");
  if (m.startsWith("credential-missing")) return t("cred.errMissing");
  if (m.startsWith("credential-unhealthy")) return t("cred.errUnhealthy");
  return m ? m : null;
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
  const ghVersion = typeof g.ghVersion === "string" && g.ghVersion ? g.ghVersion : null;
  const gates = [];
  if (installing) gates.push(["wait", t("cred.g1Wait")]);
  else if (!hasGh) gates.push(["bad", t("cred.g1Bad")]);
  else gates.push(["ok", t("cred.g1Ok") + (ghVersion ? " \xB7 v" + ghVersion : "")]);
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
  } else if (!hasGh) {
    badge2 = [t("cred.badgeUnset"), "warn"];
    sub = installing ? t("cred.subInstalling") : t("cred.subNoGh");
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
    else if (hasToken && c.healthy === false) cta = { label: t("cred.reauthCta"), disabled: false, action: "connect" };
    else cta = { label: t("cred.connectBtn"), disabled: false, action: "connect" };
  }
  const showKv = ok || limited;
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
  const errText = c.healthy === false && verified && !ok ? t("cred.errTokenInvalid") : verified && !ok && Array.isArray(scopes) && scopes.length > 0 ? t("cred.g3BadScope") : null;
  const warnText = limited ? t("cred.bannerLimited") : null;
  const notes = [];
  if (inst.phase === "failed") notes.push(t("cred.installFailed"));
  if (installing || !hasGh && !ui.patOpen) notes.push(t("cred.installNote"));
  if (!hasGh && !ui.patOpen) notes.push(t("cred.installManual"));
  if (pending && !authorizing) notes.push(t("auth.deviceNote"));
  if (authorizing) notes.push(t("cred.g3WaitHanding"));
  const aux = [];
  if (!pending && !ui.patOpen && !ui.confirmDelete) {
    if (ok || limited || verified && hasGh) {
      aux.push(["pat", ok ? t("cred.patReplace") : t("cred.patBtn")]);
      aux.push(["delete", t("cred.deleteBtn")]);
    } else if (hasGh) {
      aux.push(["pat", t("cred.patBtn")]);
    }
  }
  return { badge: badge2, sub, gates, cta, limited, ok, hasGh, hasToken, pending, authorizing, installing, verified, login, errText, warnText, notes, aux, showKv, sourceText, chips, checked };
};
function renderConnectionCard(parent, { t, status = null, mode = "full", on = {} }) {
  let statusNow = status;
  let patOpen = false, confirmDelete = false, patError = null, deleteError = null;
  let connectError = null;
  let ctaAction = null;
  if (mode === "compact") {
    parent.textContent = "";
    let patOpen2 = false, confirmDelete2 = false, patError2 = null, deleteError2 = null;
    let statusC = status;
    const wrap = el2("div", "credCompact");
    const badge3 = el2("span", "badge");
    const badgeDot2 = dot("warn");
    const badgeText2 = el2("span", "", "");
    badge3.append(badgeDot2, badgeText2);
    wrap.append(el2("b", "", t("cred.compactTitle")), badge3);
    const checkedSpan = el2("span");
    wrap.append(checkedSpan);
    const reBtn = el2("button", "auxAct", t("cred.recheck"));
    reBtn.type = "button";
    reBtn.onclick = (e) => {
      e.preventDefault();
      on.verify?.();
    };
    wrap.append(reBtn);
    const patBtn2 = el2("button", "auxAct", t("cred.patBtn"));
    patBtn2.type = "button";
    const delBtn = el2("button", "auxAct is-danger", t("cred.deleteBtn"));
    delBtn.type = "button";
    wrap.append(patBtn2, delBtn);
    const patForm2 = el2("div", "patForm");
    patForm2.append(el2("label", "", t("cred.patTitle")));
    const patInput2 = el2("input", "patInput");
    patInput2.type = "password";
    patInput2.placeholder = t("cred.patPlaceholder");
    guardPatInput(patInput2);
    patForm2.append(patInput2);
    const patRow2 = el2("div", "patRow");
    const patSaveBtn2 = el2("button", "patSave", t("cred.patSave"));
    patSaveBtn2.type = "button";
    const patCancelBtn2 = el2("button", "patCancel", t("cred.patCancel"));
    patCancelBtn2.type = "button";
    patRow2.append(patSaveBtn2, patCancelBtn2);
    patForm2.append(patRow2, el2("p", "patHint", t("cred.patHint")));
    const patErrLine2 = el2("p", "errForm");
    patErrLine2.style.display = "none";
    patForm2.append(patErrLine2);
    const confirmBox2 = el2("div", "patForm");
    confirmBox2.setAttribute("role", "alert");
    confirmBox2.append(el2("label", "", t("cred.deleteConfirmTitle")));
    const checkWrap = el2("label", "patHint");
    const check = el2("input");
    check.type = "checkbox";
    check.id = "credGhLogoutCompact";
    checkWrap.append(check, el2("span", "", t("cred.deleteGhLogout") + "\uFF08" + t("cred.deleteGhLogoutHint") + "\uFF09"));
    confirmBox2.append(checkWrap);
    const cRow = el2("div", "patRow");
    const cBtn = el2("button", "patSave is-danger", t("cred.deleteConfirm"));
    cBtn.type = "button";
    const cCancel = el2("button", "patCancel", t("cred.deleteCancel"));
    cCancel.type = "button";
    cRow.append(cBtn, cCancel);
    confirmBox2.append(cRow);
    const delErrLine = el2("p", "errForm");
    delErrLine.style.display = "none";
    confirmBox2.append(delErrLine);
    const applyC = () => {
      const v = deriveView(t, statusC, { patOpen: patOpen2, confirmDelete: confirmDelete2 });
      badgeDot2.className = "dot " + (v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait");
      badgeText2.textContent = v.badge[0];
      checkedSpan.textContent = t("cred.kvChecked") + ": " + (v.verified ? v.checked : t("cred.checkedNever"));
      patBtn2.style.display = v.verified ? "" : "none";
      delBtn.style.display = v.verified ? "" : "none";
      patForm2.classList.toggle("open", patOpen2);
      patErrLine2.style.display = patError2 && patOpen2 ? "" : "none";
      patErrLine2.textContent = patError2 && patOpen2 ? errKeyFor(t, patError2) : "";
      confirmBox2.classList.toggle("open", confirmDelete2);
      confirmBox2.style.display = confirmDelete2 ? "" : "none";
      check.checked = statusC?.credential?.ghWrittenByUs === true;
      check.disabled = !check.checked;
      delErrLine.style.display = deleteError2 && confirmDelete2 ? "" : "none";
      delErrLine.textContent = deleteError2 && confirmDelete2 ? errKeyFor(t, deleteError2) : "";
    };
    let patFormAttached2 = false;
    const attachPatForm2 = () => {
      if (patFormAttached2) return;
      patFormAttached2 = true;
      parent.insertBefore(patForm2, confirmBox2);
    };
    patBtn2.onclick = (e) => {
      e.preventDefault();
      attachPatForm2();
      patOpen2 = !patOpen2;
      patError2 = null;
      confirmDelete2 = false;
      applyC();
    };
    delBtn.onclick = (e) => {
      e.preventDefault();
      confirmDelete2 = !confirmDelete2;
      patOpen2 = false;
      deleteError2 = null;
      applyC();
    };
    patCancelBtn2.onclick = (e) => {
      e.preventDefault();
      patOpen2 = false;
      patError2 = null;
      applyC();
    };
    patSaveBtn2.onclick = async (e) => {
      e.preventDefault();
      const token = patInput2.value;
      if (!token) return;
      try {
        await on.patSave?.(token);
        patOpen2 = false;
        patError2 = null;
      } catch (err) {
        patError2 = String(err?.message ?? err);
      }
      applyC();
    };
    cBtn.onclick = async (e) => {
      e.preventDefault();
      try {
        await on.deleteConfirmed?.(check.checked);
        confirmDelete2 = false;
        deleteError2 = null;
      } catch (err) {
        deleteError2 = String(err?.message ?? err);
      }
      applyC();
    };
    cCancel.onclick = (e) => {
      e.preventDefault();
      confirmDelete2 = false;
      deleteError2 = null;
      applyC();
    };
    applyC();
    parent.append(wrap, confirmBox2);
    return {
      el: wrap,
      update(nextStatus) {
        statusC = nextStatus;
        applyC();
      },
      setPatOpen(v) {
        if (v) attachPatForm2();
        patOpen2 = v;
        applyC();
      },
      setConfirmDelete(v) {
        confirmDelete2 = v;
        applyC();
      },
      setPatError(msg) {
        patError2 = msg;
        applyC();
      },
      setDeleteError(msg) {
        deleteError2 = msg;
        applyC();
      }
    };
  }
  const card = el2("article", "gate");
  card.setAttribute("aria-label", t("cred.cardTitle"));
  const head = el2("div", "credHead");
  const ghMark = el2("div", "ghMark");
  ghMark.append(svg(GH_MARK));
  const who = el2("div", "credWho");
  who.append(el2("b", "", t("cred.cardTitle")));
  const subEl = el2("div", "credSub");
  who.append(subEl);
  const badge2 = el2("span", "badge");
  const badgeDot = dot("warn");
  const badgeText = el2("span", "", "");
  badge2.append(badgeDot, badgeText);
  const recheck = el2("button", "recheck");
  recheck.type = "button";
  recheck.title = t("cred.recheck");
  recheck.setAttribute("aria-label", t("cred.recheck"));
  recheck.append(svg(REFRESH_MARK));
  head.append(ghMark, who, badge2, recheck);
  card.append(head);
  const gatesBox = el2("div", "gates");
  gatesBox.setAttribute("role", "status");
  gatesBox.setAttribute("aria-live", "polite");
  const gateNames = [t("cred.gate1"), t("cred.gate2"), t("cred.gate3")];
  const gateRows = gateNames.map((name2) => {
    const row2 = el2("div", "gateRow");
    const d = dot("warn");
    const st = el2("span", "gSt");
    row2.append(d, el2("span", "gName", name2), st);
    gatesBox.append(row2);
    return { row: row2, d, st };
  });
  card.append(gatesBox);
  const kv = el2("dl", "kv");
  const kvSource = el2("dd");
  const kvChips = el2("span", "chips");
  const kvChipsBox = el2("dd");
  kvChipsBox.append(kvChips);
  const kvChecked = el2("dd");
  kv.append(el2("dt", "", t("cred.kvSource")), kvSource, el2("dt", "", t("cred.kvScopes")), kvChipsBox, el2("dt", "", t("cred.kvChecked")), kvChecked, el2("dt", "", t("cred.kvUsed")), el2("dd", "", t("cred.kvUsedValue")));
  card.append(kv);
  const codeBox = el2("div", "gateCode");
  const codeText = el2("b", "", "\xB7\xB7\xB7\xB7-\xB7\xB7\xB7\xB7");
  const copyBtn = el2("button", "", t("cred.copy"));
  copyBtn.type = "button";
  copyBtn.onclick = () => navigator.clipboard?.writeText(statusNow?.device?.userCode ?? "").catch(() => {
  });
  codeBox.append(codeText, copyBtn);
  const deviceLine = el2("p", "deviceLine");
  const deviceLink = el2("a", "", "https://github.com/login/device");
  deviceLink.href = "https://github.com/login/device";
  deviceLink.target = "_blank";
  deviceLink.rel = "noreferrer noopener";
  const deviceSwitch = el2("button", "switchLink", t("cred.switchToPat"));
  deviceSwitch.type = "button";
  const deviceExpires = el2("span", "deviceExpires");
  deviceLine.append(el2("span", "", t("cred.deviceWaiting") + " "), deviceLink, el2("span", "", " \xB7 "), deviceSwitch, deviceExpires);
  card.append(codeBox, deviceLine);
  const patForm = el2("div", "patForm");
  patForm.append(el2("label", "", t("cred.patTitle")));
  const patSwitchLine = el2("p", "patHint");
  patSwitchLine.style.margin = "0";
  const patSwitchBtn = el2("button", "switchLink", t("cred.switchToDevice"));
  patSwitchBtn.type = "button";
  patSwitchLine.append(patSwitchBtn);
  patForm.append(patSwitchLine);
  const patInput = el2("input", "patInput");
  patInput.type = "password";
  patInput.placeholder = t("cred.patPlaceholder");
  guardPatInput(patInput);
  const patToggle = el2("button", "switchLink patToggle", t("cred.patShow"));
  patToggle.type = "button";
  patToggle.onclick = (e) => {
    e.preventDefault();
    const show = patInput.type === "password";
    patInput.type = show ? "text" : "password";
    patToggle.textContent = show ? t("cred.patHide") : t("cred.patShow");
  };
  patForm.append(patToggle);
  patForm.append(patInput);
  const patRow = el2("div", "patRow");
  const patSaveBtn = el2("button", "patSave", t("cred.patSave"));
  patSaveBtn.type = "button";
  const patCancelBtn = el2("button", "patCancel", t("cred.patCancel"));
  patCancelBtn.type = "button";
  patRow.append(patSaveBtn, patCancelBtn);
  patForm.append(patRow, el2("p", "patHint", t("cred.patHint")));
  const patErrLine = el2("p", "errForm");
  patErrLine.style.display = "none";
  patForm.append(patErrLine);
  let patFormAttached = false;
  const attachPatForm = () => {
    if (patFormAttached) return;
    patFormAttached = true;
    card.insertBefore(patForm, errBox);
  };
  const errBox = el2("p", "err");
  errBox.style.display = "none";
  const warnBox = el2("p", "warnBox");
  warnBox.style.display = "none";
  card.append(errBox, warnBox);
  const cta = el2("button", "cta");
  cta.type = "button";
  card.append(cta);
  const auxWrap = el2("div", "aux");
  const auxPat = el2("button", "auxAct", t("cred.patBtn"));
  auxPat.type = "button";
  const auxDelete = el2("button", "auxAct is-danger", t("cred.deleteBtn"));
  auxDelete.type = "button";
  auxWrap.append(auxPat, auxDelete);
  card.append(auxWrap);
  const confirmBox = el2("div", "patForm");
  confirmBox.setAttribute("role", "alert");
  confirmBox.append(el2("label", "", t("cred.deleteConfirmTitle")));
  const confirmCheckWrap = el2("label", "patHint");
  const confirmCheck = el2("input");
  confirmCheck.type = "checkbox";
  confirmCheck.id = "credGhLogout";
  confirmCheckWrap.append(confirmCheck, el2("span", "", t("cred.deleteGhLogout")));
  confirmBox.append(confirmCheckWrap);
  const confirmRow = el2("div", "patRow");
  const confirmBtn = el2("button", "patSave is-danger", t("cred.deleteConfirm"));
  confirmBtn.type = "button";
  const confirmCancel = el2("button", "patCancel", t("cred.deleteCancel"));
  confirmCancel.type = "button";
  confirmRow.append(confirmBtn, confirmCancel);
  confirmBox.append(confirmRow);
  const confirmErrLine = el2("p", "errForm");
  confirmErrLine.style.display = "none";
  confirmBox.append(confirmErrLine);
  card.append(confirmBox);
  const notesWrap = el2("div");
  let notesSig = "";
  card.append(notesWrap);
  const setPatOpen = (v) => {
    if (v) attachPatForm();
    patOpen = v;
    if (!v) patError = null;
    confirmDelete = v ? false : confirmDelete;
    apply2();
  };
  const setConfirmDelete = (v) => {
    confirmDelete = v;
    if (v) patOpen = false;
    if (!v) deleteError = null;
    apply2();
  };
  const applyPatError = (msg) => {
    patError = msg;
    if (msg != null) patOpen = true;
    apply2();
  };
  const applyDeleteError = (msg) => {
    deleteError = msg;
    if (msg != null) confirmDelete = true;
    apply2();
  };
  deviceSwitch.onclick = (e) => {
    e.preventDefault();
    setPatOpen(true);
  };
  patSwitchBtn.onclick = (e) => {
    e.preventDefault();
    setPatOpen(false);
    on.switchToDevice?.();
  };
  patCancelBtn.onclick = (e) => {
    e.preventDefault();
    setPatOpen(false);
    on.cancelPat?.();
  };
  patSaveBtn.onclick = async (e) => {
    e.preventDefault();
    const token = patInput.value;
    if (!token) return;
    try {
      await on.patSave?.(token);
      setPatError(null);
      setPatOpen(false);
    } catch (err) {
      applyPatError(String(err?.message ?? err));
    }
  };
  auxPat.onclick = (e) => {
    e.preventDefault();
    setPatOpen(!patOpen);
  };
  auxDelete.onclick = (e) => {
    e.preventDefault();
    setConfirmDelete(true);
  };
  confirmCancel.onclick = (e) => {
    e.preventDefault();
    setConfirmDelete(false);
    on.cancelDelete?.();
  };
  confirmBtn.onclick = async (e) => {
    e.preventDefault();
    try {
      await on.deleteConfirmed?.(confirmCheck.checked);
      setConfirmDelete(false);
    } catch (err) {
      applyDeleteError(String(err?.message ?? err));
    }
  };
  recheck.onclick = (e) => {
    e.preventDefault();
    on.verify?.();
  };
  cta.onclick = (e) => {
    e.preventDefault();
    if (ctaAction) on[ctaAction]?.();
  };
  const apply2 = () => {
    const v = deriveView(t, statusNow, { patOpen, confirmDelete });
    badgeDot.className = "dot " + (v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait");
    setText(badgeText, v.badge[0]);
    setText(subEl, v.sub);
    const stCls = (s) => s === "ok" ? "ok" : s === "bad" ? "err" : "wait";
    v.gates.forEach(([state, stText], i) => {
      const r = gateRows[i];
      r.row.style.display = i === 0 || v.hasGh ? "" : "none";
      r.d.className = "dot " + stCls(state);
      setText(r.st, stText);
      r.st.classList.toggle("is-bad", state === "bad");
    });
    kv.style.display = v.showKv ? "" : "none";
    if (v.showKv) {
      kvSource.textContent = v.sourceText;
      kvChips.textContent = "";
      for (const [text, miss] of v.chips) kvChips.append(el2("span", "chip" + (miss ? " is-miss" : ""), text));
      kvChecked.textContent = v.checked;
    }
    codeBox.style.display = v.pending ? "" : "none";
    deviceLine.style.display = v.pending ? "" : "none";
    if (v.pending) {
      codeText.textContent = statusNow?.device?.userCode ?? "\xB7\xB7\xB7\xB7-\xB7\xB7\xB7\xB7";
      deviceLink.href = statusNow?.device?.verificationUri ?? "https://github.com/login/device";
      deviceLink.textContent = statusNow?.device?.verificationUri ?? "https://github.com/login/device";
      const exp = statusNow?.device?.expiresAt ? Date.parse(statusNow.device.expiresAt) : NaN;
      const mins = Number.isFinite(exp) ? Math.max(0, Math.ceil((exp - Date.now()) / 6e4)) : null;
      setText(deviceExpires, Number.isFinite(exp) ? " \xB7 " + t("auth.deviceExpiresIn").replace("{n}", String(mins)) : "");
    }
    patForm.classList.toggle("open", patOpen);
    patErrLine.style.display = patError && patOpen ? "" : "none";
    patErrLine.textContent = patError && patOpen ? errKeyFor(t, patError) : "";
    const errLine = connectError ? errKeyFor(t, connectError) : v.errText;
    errBox.style.display = errLine ? "" : "none";
    errBox.textContent = errLine ?? "";
    warnBox.style.display = v.warnText ? "" : "none";
    warnBox.textContent = v.warnText ?? "";
    if (v.cta) {
      cta.style.display = "";
      setText(cta, v.cta.label);
      cta.disabled = Boolean(v.cta.disabled);
      ctaAction = v.cta.action;
    } else {
      cta.style.display = "none";
      ctaAction = null;
    }
    auxWrap.style.display = v.aux.length > 0 ? "" : "none";
    auxPat.style.display = v.aux.some(([id]) => id === "pat") ? "" : "none";
    auxDelete.style.display = v.aux.some(([id]) => id === "delete") ? "" : "none";
    const patAux = v.aux.find(([id]) => id === "pat");
    if (patAux) auxPat.textContent = patAux[1];
    confirmBox.classList.toggle("open", confirmDelete);
    confirmBox.style.display = confirmDelete ? "" : "none";
    confirmCheck.checked = statusNow?.credential?.ghWrittenByUs === true;
    confirmCheck.disabled = !confirmCheck.checked;
    confirmErrLine.style.display = deleteError && confirmDelete ? "" : "none";
    confirmErrLine.textContent = deleteError && confirmDelete ? errKeyFor(t, deleteError) : "";
    const sig = v.notes.join("|");
    if (sig !== notesSig) {
      notesSig = sig;
      notesWrap.textContent = "";
      for (const note of v.notes) notesWrap.append(el2("p", "note", note));
    }
  };
  apply2();
  parent.append(card);
  return {
    el: card,
    update(nextStatus) {
      statusNow = nextStatus;
      apply2();
    },
    setPatOpen,
    setConfirmDelete,
    setPatError: applyPatError,
    setDeleteError: applyDeleteError,
    setConnectError(msg) {
      connectError = msg;
      apply2();
    }
  };
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
  let dead = false;
  let entered = false;
  let timer = null;
  let successTimers = [];
  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    successTimers.forEach(clearTimeout);
    successTimers = [];
  };
  const finishAuthorized = async (initial) => {
    if (dead) return;
    if (initial) {
      local = { ...local, device: { phase: "idle" } };
      sync(local);
      return;
    }
    try {
      local = await api.auth();
    } catch {
    }
    if (dead) return;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const green = local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk;
    if (!green || reduced || !shadow.isConnected) {
      dead = true;
      stop();
      onConnected?.();
      return;
    }
    const staged = { ...local, device: { phase: "authorizing", login: local?.viewerLogin ?? null } };
    sync(staged);
    successTimers.push(setTimeout(() => {
      if (dead || !shadow.isConnected) return;
      sync(local);
      cardHandle?.el?.classList?.add("success-turn");
    }, 150));
    successTimers.push(setTimeout(() => {
      if (dead || !shadow.isConnected) return;
      dead = true;
      stop();
      onConnected?.();
    }, 650));
  };
  const refresh = async () => {
    try {
      local = await api.auth();
    } catch {
    }
    sync(local);
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
    await refresh();
    if (local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) await enter();
  };
  const on = {
    install: async () => {
      try {
        await api.installGh();
        local = { ...local, install: { phase: "installing" } };
        sync(local);
      } catch {
      }
      schedule();
    },
    connect: async () => {
      cardHandle?.setConnectError(null);
      try {
        const d = await api.deviceStart();
        local = { ...local, device: d };
        sync(local);
        schedule();
      } catch (err) {
        cardHandle?.setConnectError(String(err?.message ?? err));
      }
      await refresh();
    },
    enter,
    verify: async () => {
      await refresh();
    },
    switchToDevice: async () => {
      await on.connect?.();
    },
    cancelPat: () => {
    },
    cancelDelete: () => {
    },
    patSave: async (token) => {
      if (!token) throw new Error("credential-format");
      await api.putCredential(token);
      await afterPatSave();
    },
    deleteConfirmed: async (ghLogout) => {
      await api.deleteCredential(ghLogout);
      await refresh();
    }
  };
  const wrap = el3("div", "gateWrap");
  const panel = el3("div", "gatePanel");
  const brand = el3("header", "brandRow");
  const mark = el3("div", "gateMark");
  mark.append(svg2(MARK));
  brand.append(mark, el3("h3", "gateTitle", t("auth.loginTitle")));
  const cardMount = el3("div");
  panel.append(brand, cardMount);
  const foot = el3("footer", "gateFoot", t("cred.footNote"));
  panel.append(foot);
  wrap.append(panel);
  shadow.append(wrap);
  const cardHandle = renderConnectionCard(cardMount, { t, status: local, mode: "full", on });
  const syncFoot = (s) => {
    const c = s?.credential ?? {};
    const limitedNow = Boolean(c.rateLimitedUntil) && new Date(c.rateLimitedUntil) > /* @__PURE__ */ new Date();
    foot.style.display = s?.gates?.credentialOk === true || c.healthy === false || limitedNow ? "" : "none";
  };
  const sync = (s) => {
    cardHandle?.update(s);
    syncFoot(s);
  };
  syncFoot(local);
  const schedule = (initial = false) => {
    stop();
    if (local?.install?.phase === "installing") {
      timer = setTimeout(async () => {
        try {
          local = await api.auth();
        } catch {
        }
        if (entered !== true && local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) {
          await enter();
          return;
        }
        sync(local);
        schedule();
      }, 2e3);
      return;
    }
    const ph = local?.device?.phase;
    if (ph === "authorized") {
      finishAuthorized(initial);
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
          finishAuthorized(false);
        }
        sync(local);
        schedule();
      }, ph === "authorizing" ? 1500 : 4e3);
    }
  };
  const c0 = local?.credential ?? {};
  const g0 = local?.gates ?? {};
  const verifiedAtMs = c0.verifiedAt ? Date.parse(c0.verifiedAt) : NaN;
  const deviceActive = local?.device?.phase === "pending" || local?.device?.phase === "authorizing";
  const needVerify = g0.credentialOk && Number.isFinite(verifiedAtMs) && Date.now() - verifiedAtMs > VERIFY_TTL_MS || g0.ghLogin && !g0.credentialOk && !deviceActive;
  if (needVerify && !deviceActive) {
    api.verifyCredential().then(refresh).catch(() => {
    });
  }
  schedule(true);
}

// src/client/components/uiFeedback.mjs
function withPending(btn2, fn) {
  return async (...args) => {
    if (btn2.disabled) return;
    btn2.disabled = true;
    btn2.dataset.pending = "1";
    btn2.style.opacity = ".55";
    try {
      return await fn(...args);
    } finally {
      btn2.dataset.pending = "";
      btn2.style.opacity = "";
      if (btn2.isConnected !== false) btn2.disabled = false;
    }
  };
}

// src/client/components/kanban.mjs
var el4 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
var MANUAL = ["inbox", "triaged", "gating", "shipped", "held", "closed"];
function renderKanban(container, { t, candidates, view, deps = {} } = {}) {
  const a = deps.api ?? api;
  const showKbErr = (cardEl, e) => {
    let err = cardEl.children.find((n) => n.className === "kberr");
    if (!err) {
      err = el4("span", "kberr");
      cardEl.append(err);
    }
    err.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);font-size:11px";
    err.textContent = t("errors.actionFailed") + " (" + (e?.message ?? e) + ")";
  };
  const clearKbErr = (cardEl) => {
    const err = cardEl.children.find((n) => n.className === "kberr");
    if (err) err.remove();
  };
  const { columns } = kanbanColumns({ candidates });
  const wrap = el4("div", "kb");
  for (const col of columns) {
    const colEl = el4("div", "kbcol");
    const head = el4("div", "kbhead");
    head.append(el4("span", "kbdot kbcol-" + col.id));
    head.append(el4("span", "kbname", t("groups." + col.id)));
    head.append(el4("span", "kbcount", String(col.cards.length)));
    colEl.append(head);
    if (col.cards.length === 0) colEl.append(el4("div", "kbempty", t("emptyStates.kanbanCol")));
    for (const card of col.cards) {
      const cardEl = el4("div", "kbcard");
      cardEl.append(stateDotEl(candidateState({ candidate: card, run: null, seen: false }), t));
      cardEl.append(el4("span", "badge " + card.type, card.type === "pull" ? "PR" : "Issue"));
      cardEl.append(el4("div", "kbtitle", card.repo + "#" + card.number + "  " + (card.title ?? "")));
      if (card.triage) cardEl.append(el4("span", "chip u-" + card.triage.urgency, t("urgency." + card.triage.urgency)));
      const meta = metaFootnote(card, t);
      if (meta) cardEl.append(meta);
      if (card.movable) {
        const next = advanceStageOf(card.stage);
        if (next) {
          const adv = el4("button", "kbadvance", t("kanban.advance"));
          adv.type = "button";
          adv.onclick = withPending(adv, () => a.stage(card.key, next, "\u770B\u677F\u63A8\u8FDB").then(() => {
            clearKbErr(cardEl);
            view.reload();
          }).catch((e) => showKbErr(cardEl, e)));
          cardEl.append(adv);
        }
        const menu = el4("details", "kbmove");
        menu.append(el4("summary", null, t("kanban.moveMore")));
        for (const target of MANUAL.filter((x) => x !== card.stage)) {
          const label = target === "held" ? t("recommendedActions.hold") : t("groups." + target);
          const b = el4("button", "kbmovebtn", t("actions.moveTo") + " " + label);
          b.type = "button";
          b.onclick = withPending(b, () => a.stage(card.key, target, "\u770B\u677F\u8FC1\u79FB").then(() => {
            clearKbErr(cardEl);
            view.reload();
          }).catch((e) => showKbErr(cardEl, e)));
          menu.append(b);
        }
        cardEl.append(menu);
      }
      colEl.append(cardEl);
    }
    wrap.append(colEl);
  }
  container.append(wrap);
}

// src/client/components/review.mjs
function nodeTypeLabel(type, t) {
  switch (type) {
    case "agent":
      return t("nodeType.agent");
    case "script":
      return t("nodeType.script");
    case "gate":
      return t("nodeType.gate");
    default:
      return type;
  }
}
var el5 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
var gateLabelOf = (r, t) => t("gates." + (r.waitingGateId ?? (r.waitingGate ?? "").toUpperCase()));
function renderReview(container, { t, candidates, runs, view, templates = [], deps = {}, nowMs = null } = {}) {
  const a = deps.api ?? api;
  const out = needsReview({ candidates, runs });
  const wrap = el5("div", "rv");
  wrap.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:16px";
  const reload = () => view.reload();
  const candidateOf = (key) => (candidates ?? []).find((c) => c.key === key);
  const card = (parent, titleText, err, { withNote = true } = {}) => {
    const c = el5("div", "rvcard");
    c.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:13px;display:flex;flex-direction:column;gap:6px";
    const head = el5("div", "rvhead", titleText);
    head.style.cssText = "font-weight:600";
    c.append(head);
    if (err) {
      const e0 = el5("div", "rverr", err);
      e0.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
      c.append(e0);
    }
    let note = null;
    if (withNote) {
      note = el5("input", "rvnote");
      note.type = "text";
      note.placeholder = t("review.notePlaceholder");
      note.style.cssText = "width:100%;max-width:100%";
      c.append(note);
    }
    const errEl = el5("div", "rverr");
    errEl.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);display:none";
    c.append(errEl);
    parent.append(c);
    return { card: c, note, errEl };
  };
  const act = (fn, errEl = null) => async () => {
    try {
      await fn();
      if (errEl) {
        errEl.textContent = "";
        errEl.style.display = "none";
      }
      await reload();
    } catch (e) {
      if (errEl) {
        errEl.textContent = t("errors.actionFailed") + " (" + (e?.message ?? e) + ")";
        errEl.style.display = "block";
      } else console.warn("[dsh-l]", e);
    }
  };
  const btn2 = (parent, label, fn, disabled = false) => {
    const b = el5("button", null, label);
    b.type = "button";
    b.disabled = disabled;
    b.style.cssText = "font-size:12px;padding:2px 10px;margin-right:6px";
    b.onclick = withPending(b, fn);
    parent.append(b);
    return b;
  };
  const gatesSec = el5("section");
  gatesSec.append(el5("h3", null, t("review.gates")));
  if (out.gateRuns.length === 0) gatesSec.append(el5("div", null, t("review.empty")));
  for (const r of sortGateRunsByWait(out.gateRuns)) {
    const c = candidateOf(r.candidateKey);
    const tpl = (templates ?? []).find((x) => x.id === r.templateId) ?? null;
    const info = gateWaitInfo({ run: r, template: tpl });
    const gateLabel = gateLabelOf(r, t);
    const { card: cardEl, note, errEl } = card(gatesSec, prettyKey(r.candidateKey) + " " + (c?.title ?? ""), r.error);
    const waitMs = r.waitingSince && nowMs ? nowMs - Date.parse(r.waitingSince) : NaN;
    const waited = formatDuration(waitMs);
    if (waited) cardEl.append(el5("div", "rvline", t("review.waited").replace("{d}", waited)));
    const line1 = info.upstreamNames.length > 0 ? t("review.gateWait").replace("{nodes}", info.upstreamNames.join(", ")).replace("{gate}", gateLabel) : t("review.gateWaitGeneric").replace("{gate}", gateLabel);
    cardEl.append(el5("div", "rvline", line1));
    if (info.nextNames.length > 0) {
      cardEl.append(el5("div", "rvline", t("review.gatePassEffect").replace("{next}", info.nextNames.join(" \u2192 "))));
      if (info.nextNodes.length > 0) {
        const nodesWrap = el5("div", "rvnextnodes");
        nodesWrap.style.cssText = "display:flex;flex-direction:column;gap:4px";
        for (const n of info.nextNodes) {
          const row2 = el5("div", "rvnextnode");
          row2.style.cssText = "display:flex;gap:6px;align-items:center";
          row2.append(el5("span", "rvnextname", n.name));
          row2.append(el5("span", "chip", nodeTypeLabel(n.type, t)));
          nodesWrap.append(row2);
        }
        cardEl.append(nodesWrap);
      }
    }
    cardEl.append(el5("div", "rvline", t("review.gateRejectGeneric")));
    const actionsRow = el5("div", "rvactions");
    btn2(actionsRow, t("review.passBtn"), act(() => a.runGate(r.id, r.waitingGate, "pass", note.value), errEl));
    btn2(actionsRow, t("review.rejectBtn"), act(() => a.runGate(r.id, r.waitingGate, "reject", note.value), errEl));
    btn2(actionsRow, t("actions.cancelRun"), act(() => a.runCancel(r.id, "user"), errEl));
    cardEl.append(actionsRow);
  }
  const releaseSec = el5("section");
  releaseSec.append(el5("h3", null, t("review.release")));
  if (out.releaseList.length === 0) releaseSec.append(el5("div", null, t("review.empty")));
  for (const c of out.releaseList) {
    const { card: cardEl, note, errEl } = card(releaseSec, prettyKey(c.key) + " " + (c.title ?? ""));
    btn2(cardEl, t("review.confirm"), act(() => a.releaseConfirm(c.key, note.value), errEl));
  }
  const failedSec = el5("section");
  failedSec.append(el5("h3", null, t("review.failed")));
  if (out.failedRuns.length === 0) failedSec.append(el5("div", null, t("review.empty")));
  for (const r of out.failedRuns) {
    const { card: cardEl, errEl } = card(failedSec, prettyKey(r.candidateKey) + " " + (candidateOf(r.candidateKey)?.title ?? ""), r.error, { withNote: false });
    for (const nid of r.failedNodeIds ?? []) btn2(cardEl, t("actions.retryRun") + " " + nid, act(() => a.runRetry(r.id, nid), errEl));
    btn2(cardEl, t("actions.cancelRun"), act(() => a.runCancel(r.id, "user"), errEl));
  }
  wrap.append(gatesSec, releaseSec, failedSec);
  container.append(wrap);
}

// src/client/components/sessionsView.mjs
function sortSessionRows(rows, summaries = null) {
  const runningIds = new Set((summaries ?? []).filter((s) => s && s.running).map((s) => s.id));
  const byUpdated = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  const running = rows.filter((r) => r.sessionId && runningIds.has(r.sessionId));
  const rest = rows.filter((r) => !(r.sessionId && runningIds.has(r.sessionId)));
  return [...running.sort(byUpdated), ...rest.sort(byUpdated)];
}
function parseWorkAnchor(title) {
  if (typeof title !== "string") return null;
  const m = title.match(/^(?:\[dsh-l\] )?(\S+)#(\d+) (issue|PR) · /);
  return m ? { repo: m[1], number: Number(m[2]), type: m[3] } : null;
}
var mkBtn = (text, onClick) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.onclick = onClick;
  return b;
};
var mkChip = (text) => {
  const s = document.createElement("span");
  s.className = "chip";
  s.textContent = text;
  return s;
};
var underManaged = (p, root) => {
  if (typeof p !== "string" || typeof root !== "string" || root === "") return false;
  const r = root.replace(/\/+$/, "");
  return p === r || p.startsWith(r + "/");
};
function renderSessionsView(container, { t, items = [], summaries = [], onOpen = () => {
}, onAnother = () => {
}, onDeliver = null, runs = [], seenRunIds = [], nowMs = null, managedRoot = null } = {}) {
  container.innerHTML = "";
  const head = document.createElement("h3");
  head.textContent = t("sessions.title");
  container.append(head);
  const itemSessionIds = new Set(items.map((x) => x.sessionId).filter(Boolean));
  const seen = new Set(seenRunIds ?? []);
  const runOf = (item) => item?.runId ? (runs ?? []).find((x) => x.id === item.runId) ?? null : null;
  const relTimeOf = (updatedAt) => updatedAt && nowMs ? t("sessions.ago").replace("{t}", formatRelative(updatedAt, nowMs)) : "";
  const models = [];
  for (const item of items) {
    const summary = summaries.find((s) => s.id === item.sessionId);
    const run = runOf(item);
    const badges = [item.kind === "run" ? t("sessions.badgeRun") : t("sessions.badgeWork")];
    if (item.approvalPolicy === "never") badges.push(t("sessions.badgeAuto"));
    if (item.candidate?.stage === "closed") badges.push(t("sessions.badgeGone"));
    if (summary?.running) badges.push(t("sessions.badgeRunning"));
    const missing = item.kind === "work" && summaries.length > 0 && !summary;
    if (missing) badges.push(t("sessions.badgeMissing"));
    const ended2 = item.candidate?.stage === "closed" || item.candidate?.stage === "shipped" && item.candidate?.release?.confirmedAt;
    const stalled = summary?.running && stalledOf(item.updatedAt, nowMs);
    models.push({
      sessionId: item.sessionId ?? null,
      updatedAt: item.updatedAt ?? 0,
      key: item.key ?? null,
      badges,
      state: sessionState(item, summary),
      // P0-2b 六态点
      relTime: relTimeOf(item.updatedAt),
      inFlight: run?.status === "running" ? (run.currentNodeIds ?? []).join("/") : "",
      unread: item.kind === "run" && run?.status === "succeeded" && !seen.has(item.runId),
      // P1 小债 C
      stalled,
      ended: ended2,
      item,
      label: item.candidate ? `${item.candidate.repo}#${item.candidate.number} \xB7 ${item.candidate.title}` : item.sessionId ?? item.key ?? "",
      actions: [
        ...item.sessionId && summary ? [{ text: t("sessions.open"), fn: () => onOpen(item.sessionId, item) }] : [],
        // 另开需要明确的目录（评审 M9 / 第 5 轮，主人 2026-11-24 定）：无目录时不给入口，避免回退到本地检出。
        ...missing && item.cwd && !underManaged(item.cwd, managedRoot) ? [{ text: t("sessions.another"), fn: () => onAnother(item.key, item.cwd) }] : [],
        // 托管根下的克隆不给另开（评审 K21 I8）
        // Task 13：确认交付（人工 G2 等价）——候选级拍板语义：building/verifying 的开工会话行均可交付
        //（含 missing 行——会话被归档/删除后用户仍须能拍板；路由守卫仍要求索引活跃行在场，评审 impl#O1 钉例）。
        ...onDeliver && item.kind === "work" && ["building", "verifying"].includes(item.candidate?.stage) ? [{ text: t("sessions.deliver"), fn: async () => onDeliver(item.key) }] : []
      ]
    });
  }
  for (const s of summaries) {
    if (itemSessionIds.has(s.id)) continue;
    const idStr = typeof s.id === "string" ? s.id : "";
    const isRunOrphan = idStr.startsWith("dsh-l:run:");
    const isWorkOrphan = idStr.startsWith("dsh-l:work-");
    const anchor = parseWorkAnchor(s.displayTitle);
    if (!isRunOrphan && !isWorkOrphan && !anchor && !String(s.displayTitle ?? "").startsWith("[dsh-l] ")) continue;
    const badges = [isRunOrphan ? t("sessions.badgeRun") : t("sessions.badgeWork")];
    if (s.running) badges.push(t("sessions.badgeRunning"));
    models.push({
      sessionId: s.id,
      updatedAt: s.updatedAt ?? 0,
      key: null,
      badges,
      state: sessionState(null, s),
      // P0-2b 孤儿行：仅认 summary.running
      relTime: relTimeOf(s.updatedAt),
      inFlight: "",
      unread: false,
      ended: false,
      item: null,
      label: isRunOrphan ? s.displayTitle || s.id : anchor ? `${anchor.repo}#${anchor.number} ${anchor.type}` : s.displayTitle || s.id,
      actions: [{ text: t("sessions.open"), fn: () => onOpen(s.id, null) }]
    });
  }
  if (models.length === 0) {
    const d = document.createElement("div");
    d.style.opacity = ".7";
    d.textContent = t("sessions.empty");
    container.append(d);
    return;
  }
  const renderRow2 = (parent, m) => {
    const row2 = document.createElement("div");
    row2.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 0;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent)";
    row2._rowId = m.sessionId ?? m.key;
    row2.append(stateDotEl(m.state, t));
    for (const b of m.badges) row2.append(mkChip(b));
    const label = document.createElement("span");
    label.style.cssText = "opacity:.88;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    label.textContent = m.label;
    row2.append(label);
    if (m.relTime) {
      const rt = document.createElement("span");
      rt.className = "chip";
      rt.style.opacity = ".7";
      rt.textContent = m.relTime;
      row2.append(rt);
    }
    if (m.inFlight) row2.append(mkChip(m.inFlight));
    if (m.stalled) {
      const sc = mkChip(t("sessions.stalled"));
      sc.title = t("sessions.stalledTitle");
      row2.append(sc);
    }
    if (m.unread) {
      const u = document.createElement("span");
      u.className = "stdot st-unread";
      u.title = t("stateDot.unread");
      row2.append(u);
    }
    for (const a of m.actions) {
      row2.append(mkBtn(a.text, async () => {
        const err = await a.fn();
        if (typeof err === "string" && err) {
          const c = document.createElement("span");
          c.className = "chip";
          c.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
          c.textContent = err;
          row2.append(c);
        }
      }));
    }
    parent.append(row2);
  };
  const active = sortSessionRows(models.filter((m) => !m.ended), summaries);
  const ended = sortSessionRows(models.filter((m) => m.ended), summaries);
  for (const m of active) renderRow2(container, m);
  if (ended.length > 0) {
    const details = document.createElement("details");
    details.className = "ssarchive";
    const sum = document.createElement("summary");
    sum.textContent = t("sessions.archive") + " \xB7 " + ended.length;
    details.append(sum);
    for (const m of ended) renderRow2(details, m);
    container.append(details);
  }
}

// src/workflows/roles.mjs
var BUILTIN_ROLES = {
  "loop-builder": {
    id: "loop-builder",
    name: "Loop \u6784\u5EFA\u8005",
    description: "loop-v1 build \u8282\u70B9\u6267\u884C\u8005",
    executionPolicy: "auto",
    builtin: true,
    prompt: "\u4F60\u662F\u5B9E\u73B0\u5DE5\u7A0B\u5E08\uFF1A\u53EA\u5728\u5F53\u524D\u5DE5\u4F5C\u533A\u5185\u4FEE\u6539\u4EE3\u7801\uFF0C\u9075\u5FAA\u4EFB\u52A1\u5305\u7684 constraints \u4E0E DoD\uFF1B\u5B8C\u6210\u540E\u786E\u4FDD\u6D4B\u8BD5\u901A\u8FC7\uFF0C\u5E76\u628A\u672C\u8F6E\u6539\u52A8 commit \u5230\u5F53\u524D\u5206\u652F\uFF08\u4E0D\u63A8\u9001\u3001\u4E0D\u78B0\u4E3B\u5206\u652F\uFF09\u3002"
  },
  "devflow-architect": {
    id: "devflow-architect",
    name: "\u67B6\u6784\u5E08",
    description: "\u6839\u636E\u5DF2\u786E\u8BA4\u9700\u6C42\u751F\u6210\u6280\u672F\u65B9\u6848\u548C\u6267\u884C\u8BA1\u5212",
    executionPolicy: "ask",
    builtin: true,
    prompt: "\u4F60\u662F\u67B6\u6784\u5E08\uFF1A\u5206\u6790\u9700\u6C42\uFF0C\u4EA7\u51FA\u6280\u672F\u65B9\u6848\u4E0E\u6539\u52A8\u6E05\u5355\uFF08\u6587\u4EF6/\u63A5\u53E3/\u6D4B\u8BD5\u70B9\uFF09\u3002"
  },
  "devflow-developer": {
    id: "devflow-developer",
    name: "\u5F00\u53D1\u8005",
    description: "\u5B9E\u65BD\u5DF2\u6279\u51C6\u65B9\u6848\u5E76\u81EA\u6D4B",
    executionPolicy: "ask",
    builtin: true,
    prompt: "\u4F60\u662F\u5F00\u53D1\u8005\uFF1A\u6309\u65B9\u6848\u5B9E\u73B0\u4EE3\u7801\uFF0C\u5B8C\u6210\u540E\u81EA\u6D4B\u5E76\u6C47\u62A5\u53D8\u66F4\uFF0C\u5E76\u628A\u672C\u8F6E\u6539\u52A8 commit \u5230\u5F53\u524D\u5206\u652F\uFF08\u4E0D\u63A8\u9001\u3001\u4E0D\u78B0\u4E3B\u5206\u652F\uFF09\u3002"
  },
  "devflow-code-reviewer": {
    id: "devflow-code-reviewer",
    name: "\u4EE3\u7801\u5BA1\u67E5\u5458",
    description: "\u72EC\u7ACB\u5BA1\u67E5\u5DF2\u5B8C\u6210\u5B9E\u73B0",
    executionPolicy: "ask",
    builtin: true,
    prompt: "\u4F60\u662F\u4EE3\u7801\u5BA1\u67E5\u5458\uFF1A\u72EC\u7ACB\u5BA1\u67E5\u5B9E\u9645 diff\uFF0C\u7ED9\u51FA\u901A\u8FC7/\u9A73\u56DE\u7ED3\u8BBA\u4E0E\u7406\u7531\u3002"
  },
  "mr-opener": {
    id: "mr-opener",
    name: "MR \u53D1\u8D77\u8005",
    description: "\u63A8\u9001\u5DE5\u4F5C\u5206\u652F\u5E76\u53D1\u8D77 MR\uFF08\u5E42\u7B49\u590D\u7528\uFF09",
    executionPolicy: "auto",
    builtin: true,
    prompt: "\u4F60\u662F\u4EA4\u4ED8\u5DE5\u7A0B\u5E08\uFF1A\u4EBA\u5DE5\u9A8C\u6536\u5DF2\u901A\u8FC7\uFF0C\u672C\u8282\u70B9\u628A\u5DE5\u4F5C\u5206\u652F\u63A8\u9001\u5230\u8FDC\u7AEF\u5E76\u53D1\u8D77 MR/PR\uFF0C\u4E0D\u518D\u4FEE\u6539\u4E1A\u52A1\u903B\u8F91\u30021. \u63A8\u9001\u5F53\u524D\u5DE5\u4F5C\u5206\u652F\uFF08git push -u origin \u5F53\u524D\u5206\u652F\uFF09\uFF1B\u4E0D\u5F97\u5408\u5E76 MR/PR\uFF0C\u4E0D\u5F97\u63A8\u9001\u4E3B\u5206\u652F\uFF0C\u4E0D\u5F97\u5F3A\u63A8\u30022. \u4EE5\u4ED3\u5E93\u4E0A\u4E0B\u6587\u7684\u76EE\u6807\u5206\u652F\u4E3A base \u521B\u5EFA MR/PR\uFF1A\u4F18\u5148 gh pr create\uFF1B\u672C\u8F6E\u5206\u652F\u5DF2\u6709\u6307\u5411\u540C\u4E00 base \u7684 MR/PR \u65F6\u590D\u7528\u66F4\u65B0\uFF0C\u4E0D\u91CD\u590D\u521B\u5EFA\u30023. \u5728\u6700\u7EC8\u56DE\u590D\u91CC\u5199\u660E MR/PR \u94FE\u63A5\u3001\u6E90\u5206\u652F\u3001\u76EE\u6807\u5206\u652F\u548C\u63D0\u4EA4 SHA\u30024. \u63A8\u9001\u6216\u521B\u5EFA\u5931\u8D25\uFF08\u7F3A\u5C11\u51ED\u636E\u3001\u65E0\u6743\u9650\u3001\u7F51\u7EDC\u9519\u8BEF\u7B49\uFF09\u65F6\u4E0D\u5F97\u8C0E\u62A5\u6210\u529F\uFF1A\u660E\u786E\u62A5\u544A\u5931\u8D25\u539F\u56E0\u4E0E\u9700\u8981\u4EBA\u5DE5\u5904\u7406\u7684\u4E8B\u9879\u3002"
  }
};

// src/client/components/rolesTab.mjs
function renderRolesTab(container, { t, workflow, view, deps = {} } = {}) {
  const a = deps.api ?? api;
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
    dlg.className = "rtOverlay";
    dlg.style.cssText = "position:fixed;inset:0;background:color-mix(in srgb,canvas 55%,transparent);display:flex;align-items:center;justify-content:center;z-index:60";
    const box = document.createElement("div");
    box.style.cssText = "background:canvas;color:canvastext;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:340px;max-width:90vw;font-size:13px";
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
      await a.rolesUpsert({ id: idInput.value.trim(), name: nameInput.value, description: descInput.value, prompt: promptInput.value, executionPolicy: policySelect.value });
      dlg.remove();
    });
    btnRow.append(closeBtn, saveBtn);
    if (!isNew) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = t("roles.delete");
      delBtn.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);margin-right:auto";
      delBtn.disabled = !role.builtin && role.uses > 0;
      delBtn.title = delBtn.disabled ? t("roles.inUse") : "";
      delBtn.onclick = act(async () => {
        if (!window.confirm(t("roles.deleteConfirm").replace("{id}", role.id))) {
          return;
        }
        await a.rolesDelete(role.id);
        dlg.remove();
      });
      btnRow.prepend(delBtn);
    }
    box.append(btnRow);
    dlg.append(box);
    dlg.onclick = (e) => {
      if (e && e.target === dlg) dlg.remove();
    };
    wrap.append(dlg);
  };
  const openWizard = () => {
    const presets = [
      { id: "", name: t("wizard.blank"), description: "", prompt: "", executionPolicy: "ask", blank: true },
      ...Object.values(BUILTIN_ROLES).map((r) => ({ ...r, blank: false }))
    ];
    let step = 1;
    let preset = null;
    const draft = { id: "", name: "", description: "", prompt: "", executionPolicy: "ask" };
    const dlg = document.createElement("div");
    dlg.className = "rtOverlay";
    dlg.style.cssText = "position:fixed;inset:0;background:color-mix(in srgb,canvas 55%,transparent);display:flex;align-items:flex-start;justify-content:center;padding-top:8vh;z-index:70";
    const box = document.createElement("div");
    box.style.cssText = "background:canvas;color:canvastext;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;width:min(520px,92vw);max-width:90vw;max-height:80vh;overflow:auto;font-size:13px";
    dlg.append(box);
    const close = () => dlg.remove();
    dlg.onclick = (e) => {
      if (e && e.target === dlg) close();
    };
    const mkBtn2 = (text, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = "padding:4px 12px";
      b.onclick = onClick;
      return b;
    };
    const field = (labelText, input) => {
      const row2 = document.createElement("label");
      row2.style.cssText = "display:flex;flex-direction:column;gap:2px";
      const sp = document.createElement("span");
      sp.style.cssText = "font-size:12px;opacity:.8";
      sp.textContent = labelText;
      row2.append(sp);
      input.style.cssText = "font-size:13px;padding:4px 6px";
      row2.append(input);
      return row2;
    };
    const paint2 = () => {
      box.innerHTML = "";
      const title = document.createElement("b");
      title.textContent = t("roles.wizardTitle") + " \xB7 " + (step === 1 ? t("wizard.stepStart") : step === 2 ? t("wizard.stepIdentity") : t("wizard.stepReview"));
      box.append(title);
      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end";
      if (step === 1) {
        const grid = document.createElement("div");
        grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
        for (const p of presets) {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "wzpreset";
          card.style.cssText = "text-align:left;padding:10px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:8px;background:transparent;color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:4px";
          const nm = document.createElement("b");
          nm.textContent = p.blank ? t("wizard.blank") : p.id;
          const ds = document.createElement("span");
          ds.style.cssText = "opacity:.7;font-size:12px";
          ds.textContent = p.blank ? t("wizard.blank") : p.description ?? "";
          card.append(nm, ds);
          card.onclick = () => {
            preset = p;
            draft.id = p.blank ? "" : p.id + "-copy";
            draft.name = p.blank ? "" : (p.name ?? "") + t("wizard.copySuffix");
            draft.description = p.description ?? "";
            draft.prompt = p.prompt ?? "";
            draft.executionPolicy = p.executionPolicy ?? "ask";
            step = 2;
            paint2();
          };
          grid.append(card);
        }
        box.append(grid);
        btnRow.append(mkBtn2(t("roles.cancel"), close));
        box.append(btnRow);
        return;
      }
      const cancelBtn = mkBtn2(t("roles.cancel"), close);
      if (step === 2) {
        const idInput = document.createElement("input");
        idInput.className = "wzid";
        idInput.value = draft.id;
        idInput.oninput = () => {
          draft.id = idInput.value;
        };
        box.append(field(t("roles.roleId"), idInput));
        const nameInput = document.createElement("input");
        nameInput.className = "wzname";
        nameInput.value = draft.name;
        nameInput.oninput = () => {
          draft.name = nameInput.value;
        };
        box.append(field(t("roles.name"), nameInput));
        const descInput = document.createElement("input");
        descInput.className = "wzdesc";
        descInput.value = draft.description;
        descInput.oninput = () => {
          draft.description = descInput.value;
        };
        box.append(field(t("roles.description"), descInput));
        btnRow.append(cancelBtn);
        btnRow.append(mkBtn2(t("wizard.back"), () => {
          step = 1;
          paint2();
        }));
        btnRow.append(mkBtn2(t("wizard.next"), () => {
          step = 3;
          paint2();
        }));
        box.append(btnRow);
        return;
      }
      const promptInput = document.createElement("textarea");
      promptInput.className = "wzprompt";
      promptInput.rows = 6;
      promptInput.value = draft.prompt;
      promptInput.oninput = () => {
        draft.prompt = promptInput.value;
      };
      box.append(field(t("roles.prompt"), promptInput));
      const policySelect = document.createElement("select");
      policySelect.className = "wzpolicy";
      for (const [v, key] of [["ask", "roles.policyAsk"], ["auto", "roles.policyAuto"]]) {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = t(key);
        if (draft.executionPolicy === v) o.selected = true;
        policySelect.append(o);
      }
      policySelect.onchange = () => {
        draft.executionPolicy = policySelect.value;
      };
      box.append(field(t("roles.executionPolicy"), policySelect));
      const review = document.createElement("div");
      review.className = "wzreview";
      review.style.cssText = "font-size:12px;opacity:.75";
      review.textContent = t("roles.roleId") + ": " + draft.id + " \xB7 " + t("roles.name") + ": " + draft.name;
      box.append(review);
      btnRow.append(cancelBtn);
      btnRow.append(mkBtn2(t("wizard.back"), () => {
        step = 2;
        paint2();
      }));
      btnRow.append(mkBtn2(t("roles.save"), act(async () => {
        await a.rolesUpsert({ id: draft.id.trim(), name: draft.name, description: draft.description, prompt: draft.prompt, executionPolicy: draft.executionPolicy });
        close();
      })));
      box.append(btnRow);
    };
    paint2();
    wrap.append(dlg);
  };
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;align-items:center";
  const newBtn = document.createElement("button");
  newBtn.type = "button";
  newBtn.textContent = t("roles.new");
  newBtn.style.cssText = "font-size:12px;padding:3px 12px";
  newBtn.onclick = () => openWizard();
  toolbar.append(search, newBtn);
  wrap.prepend(toolbar);
  a.rolesList().then((r) => {
    state.roles = r?.roles ?? [];
    paint();
  }).catch(() => paint());
  paint();
  container.append(wrap);
  return { dispose: () => wrap.remove() };
}

// src/client/components/keynav.mjs
function createKeyHandler({ getCursor = () => -1, setCursor = () => {
}, getRowCount = () => 0, rowAction = null, rowSelect = null, tabSwitch = null, onHelp = null, onPeek = null, escape = null, typingTarget = null } = {}) {
  const defaultTyping = (target) => {
    const tag = target ? String(target.tagName ?? "").toUpperCase() : "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(target?.isContentEditable);
  };
  const isTyping = (target) => typingTarget ? typingTarget(target) : defaultTyping(target);
  return (e) => {
    if (!e) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = (typeof e.composedPath === "function" ? e.composedPath()?.[0] : null) ?? e.target ?? null;
    if (isTyping(target)) return;
    const key = e.key;
    if (key === "j" || key === "J") {
      if (getRowCount() === 0) return;
      e.preventDefault?.();
      setCursor(Math.min((getCursor() ?? -1) + 1, getRowCount() - 1));
      return;
    }
    if (key === "k" || key === "K") {
      if (getRowCount() === 0) return;
      e.preventDefault?.();
      setCursor(Math.max((getCursor() ?? 0) - 1, 0));
      return;
    }
    if (key === "Enter" || key === " ") {
      const c = getCursor();
      if (c >= 0 && c < getRowCount()) {
        e.preventDefault?.();
        rowAction?.(c);
      }
      return;
    }
    if (key === "x" || key === "X") {
      const c = getCursor();
      if (c >= 0 && c < getRowCount()) {
        e.preventDefault?.();
        rowSelect?.(c);
      }
      return;
    }
    if (key === "p" || key === "P") {
      const c = getCursor();
      if (c >= 0 && c < getRowCount()) {
        e.preventDefault?.();
        onPeek?.(c);
      }
      return;
    }
    if (key === "?") {
      e.preventDefault?.();
      onHelp?.();
      return;
    }
    if (key === "Escape") {
      escape?.();
      return;
    }
    if (/^[1-5]$/.test(key)) {
      e.preventDefault?.();
      tabSwitch?.(Number(key) - 1);
      return;
    }
  };
}
function openHelp(anchorEl, t) {
  const dlg = document.createElement("div");
  dlg.className = "kbdhelp";
  dlg.style.cssText = "position:fixed;inset:0;z-index:70;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const box = document.createElement("div");
  box.style.cssText = "background:canvas;color:canvastext;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-width:280px;max-width:90vw;font-size:13px";
  const title = document.createElement("b");
  title.textContent = t("kbd.title");
  box.append(title);
  for (const key of ["jk", "enter", "x", "peek", "digits", "help"]) {
    const row2 = document.createElement("div");
    row2.className = "kbdrow";
    switch (key) {
      case "jk":
        row2.textContent = t("kbd.jk");
        break;
      case "enter":
        row2.textContent = t("kbd.enter");
        break;
      case "x":
        row2.textContent = t("kbd.x");
        break;
      case "peek":
        row2.textContent = t("kbd.peek");
        break;
      case "digits":
        row2.textContent = t("kbd.digits");
        break;
      default:
        row2.textContent = t("kbd.help");
    }
    box.append(row2);
  }
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = t("kbd.close");
  closeBtn.style.cssText = "align-self:flex-end;padding:2px 10px";
  const close = () => dlg.remove();
  closeBtn.onclick = close;
  dlg.onclick = (e) => {
    if (e && e.target === dlg) close();
  };
  box.append(closeBtn);
  dlg.append(box);
  anchorEl.append(dlg);
  return { close };
}

// src/client/components/commandPalette.mjs
var el6 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function openPalette(anchorEl, { t, actions = [], onClose = () => {
} } = {}) {
  let query = "";
  let index = 0;
  const dlg = el6("div", "palette");
  dlg.style.cssText = "position:fixed;inset:0;z-index:75;display:flex;align-items:flex-start;justify-content:center;padding-top:8vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const box = el6("div", "palettebox");
  box.style.cssText = "background:canvas;color:canvastext;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;width:min(420px,92vw);max-width:90vw";
  const title = el6("div", "palettetitle", t("palette.title"));
  title.style.cssText = "font-weight:600;opacity:.8;font-size:12px";
  const input = el6("input", "paletteinput");
  input.placeholder = t("palette.placeholder");
  input.style.cssText = "width:100%;max-width:100%;min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,canvas);color:inherit";
  const list = el6("div", "palettelist");
  box.append(title, input, list);
  dlg.append(box);
  const close = () => {
    dlg.remove();
    onClose();
  };
  const filtered = () => (actions ?? []).filter((a) => String(a.label ?? "").toLowerCase().includes(query.toLowerCase()));
  const paintList = () => {
    list.innerHTML = "";
    const items = filtered();
    if (index >= items.length) index = Math.max(0, items.length - 1);
    if (items.length === 0) {
      list.append(el6("div", "paletteempty", t("palette.empty")));
      return;
    }
    items.forEach((a, i) => {
      const item = el6("button", "paletteitem" + (i === index ? " is-active" : ""), a.label);
      item.type = "button";
      item.setAttribute("aria-selected", String(i === index));
      item.style.cssText = "text-align:left;padding:6px 10px;border:none;background:transparent;color:inherit;cursor:pointer" + (i === index ? ";background:color-mix(in srgb,currentColor 10%,transparent);font-weight:600" : "");
      item.onclick = () => {
        dlg.remove();
        onClose();
        a.run?.();
      };
      list.append(item);
    });
  };
  input.oninput = () => {
    query = input.value;
    index = 0;
    paintList();
  };
  input.onkeydown = (e) => {
    if (e && (e.ctrlKey || e.metaKey) && String(e.key ?? "").toLowerCase() === "k") {
      e.preventDefault?.();
      close();
      return;
    }
    e?.stopPropagation?.();
    if (!e) return;
    const items = filtered();
    if (e.key === "ArrowDown") {
      e.preventDefault?.();
      index = Math.min(index + 1, Math.max(items.length - 1, 0));
      paintList();
    } else if (e.key === "ArrowUp") {
      e.preventDefault?.();
      index = Math.max(index - 1, 0);
      paintList();
    } else if (e.key === "Enter") {
      e.preventDefault?.();
      const picked = items[index];
      if (picked) {
        dlg.remove();
        onClose();
        picked.run?.();
      }
    } else if (e.key === "Escape") {
      e.preventDefault?.();
      close();
    }
  };
  dlg.onclick = (e) => {
    if (e && e.target === dlg) close();
  };
  paintList();
  anchorEl.append(dlg);
  input.focus?.();
  return { close };
}

// src/client/components/peek.mjs
var el7 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function renderPeek(anchorEl, { t, candidate, onClose = () => {
} } = {}) {
  const dlg = el7("div", "peekoverlay");
  dlg.style.cssText = "position:fixed;inset:0;z-index:72;display:flex;align-items:flex-start;justify-content:center;padding-top:6vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const box = el7("div", "peekbox");
  box.style.cssText = "background:canvas;color:canvastext;border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;width:min(460px,92vw);max-width:90vw;max-height:80vh;overflow:auto";
  const close = () => {
    dlg.remove();
    onClose();
  };
  const lbl = el7("div", "peeklabel", t("peek.title"));
  lbl.style.cssText = "font-size:12px;font-weight:600;opacity:.8";
  box.append(lbl);
  const head = el7("div", "peekhead");
  head.style.cssText = "display:flex;gap:8px;align-items:center";
  head.append(el7("span", "badge " + (candidate?.type ?? "issue"), candidate?.type === "pull" ? "PR" : "Issue"));
  head.append(el7("b", "peektitle", prettyKey(candidate?.key) + "  " + (candidate?.title ?? "")));
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = t("peek.close");
  closeBtn.style.cssText = "margin-left:auto;padding:2px 10px";
  closeBtn.onclick = close;
  head.append(closeBtn);
  box.append(head);
  const meta = metaFootnote(candidate, t);
  if (meta) {
    meta.style.opacity = ".7";
    box.append(meta);
  }
  if (candidate?.triage) {
    const tri = el7("div", "peektriage");
    tri.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
    tri.append(el7("span", "chip", t("validity." + candidate.triage.validity)));
    tri.append(el7("span", "chip", t("urgency." + candidate.triage.urgency)));
    tri.append(el7("span", "chip", t("recommendedActions." + candidate.triage.action)));
    box.append(tri);
    if (candidate.triage.reason) {
      const r = el7("p", "peekreason", candidate.triage.reason);
      r.style.cssText = "margin:0;font-size:13px;line-height:1.5";
      box.append(r);
    }
    const by = el7("div", "peekby", (candidate.triage.by ?? "") + " \xB7 " + (candidate.triage.at ?? ""));
    by.style.cssText = "font-size:11px;opacity:.6";
    box.append(by);
  }
  const histHead = el7("b", "peeksect", t("peek.history"));
  box.append(histHead);
  const hist = [...candidate?.history ?? []].slice(-8).reverse();
  if (hist.length === 0) box.append(el7("div", "peeknone", "\u2014"));
  for (const h2 of hist) {
    const row2 = el7("div", "peekhistrow");
    row2.style.cssText = "display:flex;gap:8px;align-items:baseline;flex-wrap:wrap";
    const at = el7("span", "peekhistat", h2.at ?? "");
    at.style.cssText = "opacity:.6;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px";
    row2.append(at);
    row2.append(el7("span", "chip", h2.event ?? ""));
    if (h2.detail) {
      const dd = el7("span", "peekhistdetail", h2.detail);
      dd.style.cssText = "opacity:.75;font-size:12px";
      row2.append(dd);
    }
    box.append(row2);
  }
  box.append(el7("b", "peeksect", t("peek.gates")));
  const gatesRow = el7("div", "peekgates");
  gatesRow.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
  for (const g of ["G1", "G2", "G3"]) {
    const rec = candidate?.gates?.[g];
    const text = rec?.decision ? t("gates." + g) + " \xB7 " + rec.decision + (rec.at ? " \xB7 " + rec.at : "") : t("gates." + g) + " \xB7 \u2014";
    gatesRow.append(el7("span", "chip", text));
  }
  box.append(gatesRow);
  box.append(el7("b", "peeksect", t("peek.package")));
  box.append(el7("span", "chip", candidate?.taskPackage ? "\u2713" : t("peek.none")));
  dlg.onclick = (e) => {
    if (e && e.target === dlg) close();
  };
  dlg.append(box);
  anchorEl.append(dlg);
  return { close };
}

// src/client/components/workbench.mjs
var VERIFY_TTL_MS2 = 30 * 60 * 1e3;
var CSS = [
  ":host{--dshl-dur-1:200ms;--dshl-dur-2:220ms;--dshl-ease:cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;height:100%;font-size:14px;line-height:1.45;color:inherit}",
  "header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  "h2{font-size:15px;margin:0 8px 0 0;font-weight:600}",
  "button,select,input{font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:6px;padding:3px 10px;cursor:pointer}",
  "button:hover:not(:disabled){background:color-mix(in srgb,currentColor 7%,transparent)}",
  "button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid color-mix(in srgb,currentColor 68%,transparent);outline-offset:1px}",
  "button:disabled{opacity:.45;cursor:default}",
  ".meta{margin-left:auto;font-size:12px;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".bar{display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap}",
  "main{flex:1;overflow:auto;padding:0 16px 24px}",
  ".group>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 4px;color:color-mix(in srgb,currentColor 72%,transparent)}",
  ".group.dim{opacity:.6}",
  ".row{display:flex;align-items:center;gap:8px;min-height:32px;border-bottom:1px solid color-mix(in srgb,currentColor 7%,transparent)}",
  ".row .title{flex:1;min-width:0;text-align:left;border:none;padding:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".badge{font-size:11px;font-weight:600;padding:0 6px;border-radius:4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent)}",
  ".chip{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);white-space:nowrap}",
  ".chip.u-P0{font-weight:600;border-color:currentColor}",
  ".chip.muted{color:color-mix(in srgb,currentColor 65%,transparent)}",
  ".detail{padding:8px 0 12px 44px;display:flex;flex-direction:column;gap:8px}",
  ".detail .reason{margin:0;color:color-mix(in srgb,currentColor 75%,transparent)}",
  ".empty,.error{padding:24px 0;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-height:24px}",
  ".intake>h3,.triage>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 6px;color:color-mix(in srgb,currentColor 72%,transparent)}",
  /* 登录闸：遮罩只盖插件主区（absolute）——侧栏始终可退回；flex 列 + margin:auto：
     空间够→居中，空间不够→顶对齐随容器自然滚动（手机上不出现内层拖动条） */
  ".gateWrap{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain;padding:24px;background:color-mix(in srgb,canvas 78%,transparent)}",
  "@supports (padding:max(16px,env(safe-area-inset-top))){.gateWrap{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}}",
  ".gate{width:min(440px,100%);margin:auto;display:flex;flex-direction:column;padding:28px 28px 20px;border-radius:14px;background:color-mix(in srgb,canvas 96%,transparent);backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 32px 64px -24px rgb(0 0 0 /.4),0 4px 16px rgb(0 0 0 /.14);animation:gate-in var(--dshl-dur-2) var(--dshl-ease)}",
  "@media (prefers-reduced-motion:reduce){.gate{animation:none}}",
  "@keyframes gate-in{from{transform:translateY(8px);opacity:.6}}",
  "@keyframes success-in{0%{border-color:color-mix(in srgb,#2da44e 55%,transparent);transform:translateY(2px)}}",
  ".gate.success-turn{animation:success-in var(--dshl-dur-1) var(--dshl-ease)}",
  "@media (prefers-reduced-motion:reduce){:host{--dshl-dur-1:0s;--dshl-dur-2:0s}.gate.success-turn{animation:none}.dot.wait{animation:none}.tabindicator{transition:none}}",
  // P1-8/B2：token 置 0s 全对账（计划红①）
  "@media (prefers-reduced-motion:reduce){.gate.success-turn{animation:none}}",
  ".gateHead{display:flex;align-items:center;justify-content:space-between;gap:10px}",
  /* 图标衬底：取图标主蓝做 tint plate——浅皮淡蓝瓷面、深皮深蓝绒面，柔影托起彩色图标 */
  ".gateMark{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,#324DE2 9%,canvas);border:1px solid color-mix(in srgb,#324DE2 20%,canvas);box-shadow:0 2px 6px rgb(50 77 226 /.16),0 8px 20px -8px rgb(50 77 226 /.28)}",
  ".gateMark svg{display:block}",
  ".gate h3{font-size:16px;font-weight:650;margin:14px 0 0;letter-spacing:-.01em}",
  ".gate .intro{margin:6px 0 0;font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 72%,transparent)}",
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
  ".gate .note{margin:14px 0 0;padding:12px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.55;color:color-mix(in srgb,currentColor 68%,transparent)}",
  // ── 凭据卡（Task 9）：全面板登录 + 收活紧凑卡共用视觉（theme 自适应沿用 canvas/canvastext color-mix 语言）──
  ".gatePanel{width:min(560px,100%);max-width:100%;margin:auto;display:flex;flex-direction:column}",
  // box-sizing 只圈新卡片子树（shadow 内无全局重置，content-box 下 width:100%+padding 横向溢出——手机截图实录）
  ".gatePanel .gate,.gatePanel .gate *,.credCompact,.credCompact *{box-sizing:border-box}",
  ".brandRow{display:flex;align-items:center;gap:14px}",
  ".gateTitle{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:0}",
  ".gatePanel .gate{width:100%;margin:26px 0 0;padding:22px 24px 18px}",
  ".gateFoot{margin-top:20px;padding:14px 2px 4px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.6;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".credHead{display:flex;align-items:center;gap:12px}",
  ".ghMark{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:10px;color:inherit;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 10%,transparent)}",
  ".ghMark svg{display:block}",
  ".credWho{flex:1;min-width:0}",
  ".credWho b{display:block;font-size:14px;font-weight:600}",
  ".credSub{margin-top:2px;font-size:12px;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".badge{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".dot{width:7px;height:7px;border-radius:50%;flex:none}",
  ".dot.ok{background:#2da44e}",
  ".dot.warn{background:#d29922}",
  ".dot.err{background:#d1242f}",
  ".dot.wait{background:#d29922;animation:dot-breathe 1.6s ease-in-out infinite}",
  "@keyframes dot-breathe{50%{opacity:.35}}",
  "@media (prefers-reduced-motion:reduce){.dot.wait{animation:none}}",
  ".recheck{flex:none;padding:0;width:30px;height:30px;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:8px;background:transparent;color:inherit;cursor:pointer}",
  ".recheck svg{transition:transform 400ms cubic-bezier(.22,1,.36,1)}",
  "@media (prefers-reduced-motion:reduce){.recheck svg{transition:none}}",
  ".recheck:hover svg{transform:rotate(140deg)}",
  ".recheck:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:2px}",
  ".gates{margin-top:16px;display:flex;flex-direction:column;gap:9px}",
  ".gateRow{display:flex;align-items:center;gap:10px;min-height:24px;font-size:13px}",
  ".gateRow .gName{flex:none;font-weight:550}",
  ".gateRow .gSt{flex:1;min-width:0;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".gateRow .gSt.is-bad{color:color-mix(in srgb,#d1242f 85%,currentColor)}",
  ".kv{margin:18px 0 0;padding:14px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);display:grid;grid-template-columns:64px 1fr;row-gap:10px;column-gap:12px;font-size:13px}",
  ".kv dt{color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".kv dd{line-height:1.5;min-width:0;overflow-wrap:anywhere}",
  ".chips{display:inline-flex;gap:6px;flex-wrap:wrap;vertical-align:-2px}",
  ".chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;padding:1px 8px;border-radius:5px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:color-mix(in srgb,currentColor 5%,transparent)}",
  // 作用域覆写（评审 N2 修正版）：全局 .chip(:30，数据面候选行) 冻结不动——.gate 子树内 scope chip 允许换行
  ".gate .chip{white-space:normal;display:inline-block;overflow-wrap:anywhere}",
  ".chip.is-miss{color:color-mix(in srgb,#d1242f 85%,currentColor);border-color:color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".okFrag{color:color-mix(in srgb,#2da44e 80%,currentColor)}",
  ".switchLink{border:none;background:transparent;padding:2px 4px;cursor:pointer;font-size:12.5px;text-decoration:underline;text-underline-offset:2px;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".switchLink:hover{color:inherit}",
  ".switchLink:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patForm{margin-top:18px;padding:14px 16px;border-radius:10px;border:1px dashed color-mix(in srgb,currentColor 20%,transparent);display:none;flex-direction:column;gap:10px}",
  ".patForm.open{display:flex}",
  ".patForm label{font-size:12.5px;font-weight:550}",
  ".patInput{width:100%;height:36px;padding:0 12px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,canvas);color:inherit}",
  ".patInput::placeholder{color:color-mix(in srgb,currentColor 65%,transparent)}",
  ".patInput:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patRow{display:flex;align-items:center;gap:12px}",
  ".patSave{height:40px;padding:0 16px;border:none;border-radius:8px;cursor:pointer;background:canvastext;color:canvas;font-size:13px;font-weight:600}",
  ".patSave:hover{background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".patSave:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 70%,transparent);outline-offset:2px}",
  ".patSave.is-danger{background:color-mix(in srgb,#d1242f 85%,currentColor);color:canvas}",
  ".patCancel{border:none;background:transparent;color:color-mix(in srgb,currentColor 68%,transparent);font-size:12.5px;cursor:pointer}",
  ".patCancel:hover{color:inherit}",
  ".patHint{font-size:12px;line-height:1.5;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".errForm{font-size:12.5px;line-height:1.5;margin:2px 0 0;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  ".aux{margin-top:10px;display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap}",
  ".auxAct{border:none;background:transparent;cursor:pointer;font-size:12.5px;padding:4px 8px;border-radius:6px;color:color-mix(in srgb,currentColor 72%,transparent);text-underline-offset:2px}",
  ".auxAct:hover{color:inherit;background:color-mix(in srgb,currentColor 6%,transparent)}",
  ".auxAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".auxAct.is-danger{color:color-mix(in srgb,#d1242f 78%,currentColor);margin-left:8px}",
  ".warnBox{font-size:13px;line-height:1.5;margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".credCompact{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,currentColor 10%,transparent);background:color-mix(in srgb,currentColor 3%,transparent)}",
  ".degradedBanner{margin:0 0 12px;padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  // ── 工作台统一可读表面（用户反馈：内容直接浮在宿主壁纸上不可读）——玻璃面板语言与登录卡一致 ──
  ".workSurface{box-sizing:border-box;margin:12px;padding:12px 16px 14px;border-radius:14px;background:color-mix(in srgb,canvas 90%,transparent);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 18px 40px -20px rgb(0 0 0/.35)}",
  ".degradedBanner.is-limited{border-color:color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".bannerAct{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:7px;background:transparent;color:inherit;font-size:12.5px;padding:4px 10px;cursor:pointer}",
  ".bannerAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  // ── 窄屏/手机自适应（≤560px 主断点；≤380px 二级收紧）：冗余 padding 收敛、卡头换行、双方法竖排 ──
  ".credHead{display:flex;align-items:center;gap:12px;flex-wrap:wrap}",
  ".credWho{flex:1 1 160px;min-width:0}",
  "@media (max-width:560px){",
  ".gateWrap{padding:16px 12px}",
  ".gatePanel .gate{padding:18px 16px 14px;border-radius:12px}",
  ".brandRow{gap:11px}",
  ".gateTitle{font-size:17px}",
  ".credHead{gap:10px}",
  ".badge{margin-left:auto}",
  ".kv{grid-template-columns:56px 1fr;column-gap:10px;font-size:12.5px}",
  ".credCompact{font-size:12px;gap:8px}",
  "}",
  "@media (max-width:380px){",
  ".gateTitle{font-size:16px}",
  ".gatePanel .gate{padding:16px 14px 12px}",
  ".credHead{gap:9px}",
  ".ghMark{width:34px;height:34px}",
  "}",
  // ── 移动触控/窄视口适配层（2026-11-22 Mobile Touch UX；计划 docs/plans/2026-11-22-mobile-touch-ux-implementation-plan.md）──
  // 断点矩阵：fine+宽=桌面（零变化）；coarse+任意宽=触控层；≤560=布局层；平板(coarse+宽)拿触控层+P0 滚动。
  "@media (pointer:coarse){",
  "button,select{min-height:44px}",
  ".chip{min-height:44px}",
  "button:active:not(:disabled){opacity:.72}",
  ".row{min-height:48px}",
  "input,select{font-size:16px}",
  "input{min-height:36px;padding:8px 10px}",
  // 验收③：override 理由框等 31px→36（ux-accept 终判缺口）
  "*{touch-action:manipulation}",
  // P0（与宽度无关）：shadow host 被 React 内联 overflow:hidden 裁剪——!important 越权（评审 r9 实证）；
  // fine pointer 永不命中 coarse，桌面零风险。平板(coarse+宽)同样由此恢复可达。
  ":host{overflow-y:auto !important}",
  ".ux-chev{display:inline}",
  ".rowActive{background:color-mix(in srgb,currentColor 6%,transparent)}",
  "}",
  "@media (max-width:560px){",
  // P0（手机）：同款滚动修复 + 底部行情悬浮胶囊避让（26px 实测 + 余量 30px；iOS 安全区 env 承担）
  ":host{overflow-y:auto !important;padding-bottom:calc(56px + env(safe-area-inset-bottom))}",
  "header button[data-short]{font-size:0;min-width:44px;text-align:center}",
  "header button[data-short]::after{content:attr(data-short);font-size:13px}",
  ".tabsbar{overflow-x:auto}",
  ".tabsbar button{flex:0 0 auto}",
  ".primary-actions{display:flex;flex-direction:column;gap:8px}",
  ".primary-actions button{width:100%;min-height:44px}",
  ".stage-chips{display:flex;gap:8px;overflow-x:auto}",
  ".stage-chips button{min-height:44px;flex:0 0 auto}",
  ".override-box{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:6px 10px}",
  ".wtip{font-size:12px;opacity:.75}",
  ".autorun{display:flex;flex-direction:column;gap:6px;padding:8px 10px;margin:6px 0;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px}",
  ".override-box summary{cursor:pointer;min-height:44px;display:flex;align-items:center}",
  ".ux-wide{display:none}",
  "}",
  ".ux-narrow{display:none}",
  ".ux-chev{display:none}",
  /* ── P1-1 键盘游标高亮（fine pointer 语义，不进 coarse 层）── */
  ".knav-cursor{background:color-mix(in srgb,currentColor 8%,transparent)}",
  /* ── P0-2 六态色标 token（小面积点，Host-Theme Rule 合规；唯一新固定色 #4493f8 = unread 蓝）── */
  ".stdot{width:8px;height:8px;border-radius:50%;flex:none}",
  ".st-running{background:#2da44e}",
  ".st-gating{background:#d29922}",
  ".st-unread{background:#4493f8}",
  ".st-failed{background:#d1242f}",
  ".st-done{background:color-mix(in srgb,currentColor 45%,transparent)}",
  ".st-idle{background:color-mix(in srgb,currentColor 22%,transparent)}",
  /* ── P0-6 清单行元数据脚注（标题按钮内第二行）── */
  ".rowmeta{display:block;font-size:11px;opacity:.65;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  /* ── P0-1 看板分组列表化（桌面横向六列；≤560px 退化单列分组、列头吸顶）── */
  ".kb{display:flex;gap:10px;padding:12px 16px;align-items:flex-start;overflow-x:auto}",
  ".kbcol{flex:1;min-width:150px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:8px;padding:8px}",
  ".kbhead{display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600;margin-bottom:6px}",
  ".kbdot{width:8px;height:8px;border-radius:50%;flex:none}",
  ".kbcol-inbox{background:color-mix(in srgb,currentColor 30%,transparent)}",
  ".kbcol-triaged{background:#4493f8}",
  ".kbcol-gating{background:#d29922}",
  ".kbcol-building{background:#324DE2}",
  ".kbcol-shipped{background:#2da44e}",
  ".kbcol-closed{background:color-mix(in srgb,currentColor 22%,transparent)}",
  ".kbcount{opacity:.65;font-weight:400}",
  ".kbcard{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:8px;margin-bottom:6px;font-size:13px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}",
  ".kbtitle{font-weight:550;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
  ".kbempty{font-size:12px;opacity:.6}",
  ".kbmove summary{cursor:pointer;list-style:none;font-size:12px;opacity:.75}",
  ".kbmovebtn{font-size:11px;padding:1px 6px;margin:2px 4px 0 0}",
  "@media (max-width:560px){",
  ".kb{flex-direction:column;overflow:visible}",
  ".kbcol{width:100%;min-width:0}",
  ".kbhead{position:sticky;top:0;background:color-mix(in srgb,canvas 92%,transparent);z-index:1;padding:4px 0}",
  "}",
  "@media (pointer:coarse){",
  ".kbmove summary{min-height:44px;display:flex;align-items:center}",
  ".ssarchive summary{min-height:44px;display:flex;align-items:center}",
  // P1-4/S7：会话归档头 coarse 44px
  "}",
  "@media (max-width:560px){.ux-narrow{display:flex;flex-direction:column;gap:8px}}"
].join("\n");
var el8 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
function mountWorkbench(shadow, { getLang, build, extend, deps = {}, storage = null } = {}) {
  const a = deps?.api ?? api;
  let state = null;
  let authInfo = null;
  const compactOn = {
    verify: async () => {
      try {
        await api.verifyCredential();
      } catch {
      }
      await view.reload();
    },
    patSave: async (token) => {
      await api.putCredential(token);
      await view.reload();
    },
    deleteConfirmed: async (ghLogout) => {
      await api.deleteCredential(ghLogout);
      await view.reload();
    },
    connect: () => {
    },
    enter: () => {
    },
    install: () => {
    },
    cancelPat: () => {
    },
    cancelDelete: () => {
    },
    switchToDevice: () => {
    }
  };
  let compactVerifiedAt = 0;
  let reloadRunning = false;
  let reloadQueued = false;
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  let activeTab = "list";
  let sessionsItems = [];
  const filters = { type: "all", repo: "all", urgency: "all", stage: "all" };
  const expanded = /* @__PURE__ */ new Set();
  const seenRuns = /* @__PURE__ */ new Set();
  const selectedKeys = /* @__PURE__ */ new Set();
  const batchForm = { open: false, validity: "medium", urgency: "P2", action: "hold", reason: "" };
  let rowEls = [];
  let surfaceEl = null;
  let cursorIndex = -1;
  let helpInstance = null;
  let paletteOpen = false;
  let paletteInstance = null;
  let peekOpen = false;
  let peekInstance = null;
  let credMount = null;
  const view = {};
  const select = (pairs, value, onChange, label) => {
    const s = el8("select");
    s.setAttribute("aria-label", label);
    for (const [v, text] of pairs) {
      const o = el8("option", null, text);
      o.value = v;
      s.append(o);
    }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  };
  const btn2 = (text, onClick, disabled = false) => {
    const b = el8("button", null, text);
    b.type = "button";
    b.disabled = disabled;
    b.onclick = withPending(b, onClick);
    return b;
  };
  let prevMainEl = null;
  let tabsObserver = null;
  const paint = () => {
    if (disposed) return;
    const t = makeT(getLang());
    tabsObserver?.disconnect?.();
    tabsObserver = null;
    paletteOpen = false;
    paletteInstance = null;
    peekOpen = false;
    peekInstance = null;
    const savedScroll = prevMainEl ? prevMainEl.scrollTop ?? 0 : 0;
    const activeEl = shadow.activeElement ?? null;
    const navKey = activeEl && activeEl.dataset && activeEl.dataset.navKey || null;
    shadow.innerHTML = "";
    shadow.host.dataset.dshLBuild = build;
    const style = el8("style");
    style.textContent = CSS;
    if (!state) {
      shadow.append(style, el8("div", "empty", error ? t("errors.refreshFailed") + " (" + error + ")" : t("auth.loading")));
      return;
    }
    if (!state.auth?.account) {
      shadow.append(style);
      renderLoginGate(shadow, { t, status: authInfo, onConnected: () => view.reload() });
      return;
    }
    const header = el8("header");
    header.append(el8("h2", null, t("panelLabel")));
    const review = needsReview({ candidates: state?.candidates ?? [], runs: state?.runs ?? [] });
    badge.count = review.count;
    const refreshLbl = busy ? t("refreshing") : t("refresh");
    const refreshBtn = el8("button", null, refreshLbl);
    refreshBtn.type = "button";
    refreshBtn.setAttribute("aria-label", refreshLbl);
    refreshBtn.dataset.short = refreshLbl.slice(0, 1);
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    if (badge.count > 0) {
      const pendingChip = el8("button", "chip", t("badge.pending").replace("{n}", String(badge.count)));
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
      const who = el8("span", "chip", t("auth.connected") + " " + account);
      if (credChip.configured) {
        const d = el8("span", "dot " + (credChip.healthy === false ? "err" : limChip ? "warn" : "ok"));
        d.style.marginRight = "5px";
        d.style.verticalAlign = "middle";
        who.prepend(d);
      }
      who.title = t("auth.logoutHint");
      header.append(who);
      const out = el8("button", null, t("auth.logout"));
      out.type = "button";
      out.setAttribute("aria-label", t("auth.logout"));
      out.dataset.short = t("auth.logout").slice(0, 1);
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
    header.append(el8("span", "meta", t("meta.lastRefreshAt") + ": " + (last ? new Date(last).toLocaleString(getLang()) : "\u2014")));
    const strip = el8("div", "strip");
    extend?.strip?.(strip, { t, state, stagePick: (bucket) => {
      filters.stage = filters.stage === bucket ? "all" : bucket;
      paint();
    }, stageFilter: filters.stage });
    const bar = el8("div", "bar");
    const repos = [...new Set((state?.candidates ?? []).map((c) => c.repo))].sort();
    const facets = facetCounts(state?.candidates ?? []);
    const total = (state?.candidates ?? []).length;
    for (const [val, label, count] of [["all", t("filters.all"), total], ["issue", t("filters.issues"), facets.type.issue ?? 0], ["pull", t("filters.pullRequests"), facets.type.pull ?? 0]]) {
      const chipBtn = el8("button", "chip typechip" + (filters.type === val ? " is-active" : ""), label + " (" + count + ")");
      chipBtn.type = "button";
      chipBtn.setAttribute("aria-pressed", String(filters.type === val));
      chipBtn.onclick = () => {
        filters.type = val;
        paint();
      };
      bar.append(chipBtn);
    }
    const stagePairs = [["all", t("filters.all")], ...["inbox", "triaged", "gating", "building", "shipped", "closed"].map((s) => [s, t("groups." + s) + " (" + (facets.stage[s] ?? 0) + ")"])];
    bar.append(
      select(stagePairs, filters.stage, (v) => {
        filters.stage = v;
        paint();
      }, t("filters.stage")),
      select([["all", t("filters.repo")], ...repos.map((r) => [r, r + " (" + (facets.repo[r] ?? 0) + ")"])], filters.repo, (v) => {
        filters.repo = v;
        paint();
      }, t("filters.repo")),
      select([["all", t("filters.urgency")], ...["P0", "P1", "P2", "P3"].map((u) => [u, t("urgency." + u) + " (" + (facets.urgency[u] ?? 0) + ")"])], filters.urgency, (v) => {
        filters.urgency = v;
        paint();
      }, t("filters.urgency"))
    );
    extend?.bar?.(bar, { t, state, filters, view });
    const pins = loadPins(storage);
    const filtersActiveNow = filters.type !== "all" || filters.repo !== "all" || filters.urgency !== "all" || filters.stage !== "all";
    const pinLabel = (f) => {
      const parts = [];
      if (f.type !== "all") parts.push(f.type === "issue" ? t("filters.issues") : t("filters.pullRequests"));
      if (f.repo !== "all") parts.push(f.repo);
      if (f.urgency !== "all") parts.push(t("urgency." + f.urgency));
      if (f.stage !== "all") parts.push(t("groups." + f.stage));
      return parts.join(" \xB7 ") || "\u2014";
    };
    const savePinBtn = el8("button", "chip pinsave", t("filters.saveCurrent"));
    savePinBtn.type = "button";
    savePinBtn.disabled = !filtersActiveNow;
    savePinBtn.title = t("filters.saveCurrent");
    savePinBtn.onclick = () => {
      const next = [...loadPins(storage), { id: makePinId(), label: pinLabel(filters), filters: { ...filters } }];
      savePins(storage, next);
      paint();
    };
    bar.append(savePinBtn);
    if (pins.length > 0) {
      const pinWrap = el8("span", "pinrow");
      pinWrap.setAttribute("aria-label", t("filters.pins"));
      for (const p of pins) {
        const chipBtn = el8("button", "chip pinchip" + (JSON.stringify(filters) === JSON.stringify(p.filters) ? " is-active" : ""), p.label);
        chipBtn.type = "button";
        chipBtn.onclick = () => {
          Object.assign(filters, p.filters);
          paint();
        };
        pinWrap.append(chipBtn);
        const rm = el8("button", "chip pinrm", t("filters.pinRemove"));
        rm.type = "button";
        rm.setAttribute("aria-label", t("filters.pinRemove"));
        rm.onclick = () => {
          savePins(storage, loadPins(storage).filter((x) => x.id !== p.id));
          paint();
        };
        pinWrap.append(rm);
      }
      bar.append(pinWrap);
    }
    const main = el8("main");
    const tabsBar = el8("div", "tabsbar");
    tabsBar.style.cssText = "display:flex;gap:6px;padding:10px 16px 0;position:relative";
    const TAB_IDS = ["list", "board", "review", "sessions", "roles"];
    const TAB_LABELS = [t("tabs.list"), t("tabs.board"), t("tabs.review"), t("tabs.sessions"), t("tabs.roles")];
    let tabIndex = 0;
    TAB_IDS.forEach((id, idx) => {
      const b = el8("button", null, TAB_LABELS[idx]);
      b.type = "button";
      if (activeTab === id) {
        b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0";
        tabIndex = idx;
      }
      b.onclick = () => {
        activeTab = id;
        paint();
      };
      tabsBar.append(b);
    });
    const indicator = el8("div", "tabindicator");
    indicator.style.cssText = "position:absolute;bottom:0;height:2px;background:currentColor;transition:transform var(--dshl-dur-2) var(--dshl-ease),width var(--dshl-dur-2) var(--dshl-ease)";
    indicator.style.display = "none";
    tabsBar.append(indicator);
    if (typeof ResizeObserver !== "undefined" && globalThis.matchMedia?.("(pointer:fine)")?.matches) {
      indicator.style.display = "";
      const alignIndicator = () => {
        const b = tabsBar.children[tabIndex];
        if (!b || b.offsetWidth === void 0) return;
        indicator.style.width = b.offsetWidth + "px";
        indicator.style.transform = "translateX(" + b.offsetLeft + "px)";
      };
      tabsObserver?.disconnect?.();
      tabsObserver = new ResizeObserver(alignIndicator);
      tabsObserver.observe(tabsBar);
      alignIndicator();
    }
    const intake = el8("section", "intake");
    intake.append(el8("h3", null, t("sections.intake")));
    const credH = state?.auth?.credential ?? {};
    const limNow = credH.rateLimitedUntil && new Date(credH.rateLimitedUntil) > /* @__PURE__ */ new Date();
    if (credH.configured && (credH.healthy === false || limNow)) {
      const banner = el8("div", "degradedBanner" + (credH.healthy === false ? "" : " is-limited"));
      banner.append(el8("span", "", credH.healthy === false ? t("cred.bannerUnhealthy") : t("cred.bannerLimited")));
      const fix = el8("button", "bannerAct", t("cred.bannerRecheck"));
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
    {
      const credS6 = authInfo?.credential ?? {};
      const vMs = credS6.verifiedAt ? Date.parse(credS6.verifiedAt) : NaN;
      if (authInfo?.gates?.credentialOk && Number.isFinite(vMs) && Date.now() - vMs > VERIFY_TTL_MS2 && Date.now() - compactVerifiedAt > VERIFY_TTL_MS2) {
        compactVerifiedAt = Date.now();
        api.verifyCredential().then(() => view.reload()).catch(() => {
        });
      }
    }
    credMount = el8("div");
    intake.append(credMount);
    renderConnectionCard(credMount, { t, status: authInfo, mode: "compact", on: compactOn });
    const intakeChips = el8("div", "chips");
    const watchRepos = state?.watch?.repos ?? [];
    const perRepo = state?.snapshots?.perRepo ?? {};
    let issueCount = 0;
    let pullCount = 0;
    for (const r of Object.values(perRepo)) {
      issueCount += r.issues ?? 0;
      pullCount += r.pulls ?? 0;
    }
    intakeChips.append(
      el8("span", "chip", watchRepos.length + " " + t("intake.repos")),
      el8("span", "chip", "Issue " + issueCount),
      el8("span", "chip", "PR " + pullCount)
    );
    if (watchRepos.length === 0) intakeChips.append(el8("span", "chip muted", t("intake.none")));
    extend?.intake?.(intakeChips, { t, state, view });
    intake.append(intakeChips);
    const triage = el8("section", "triage");
    triage.append(el8("h3", null, t("sections.triage")));
    triage.append(strip, bar);
    if (selectedKeys.size > 0) {
      const batchBar = el8("div", "batchbar");
      batchBar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 0";
      batchBar.append(el8("span", "chip", t("batch.selected").replace("{n}", String(selectedKeys.size))));
      const batchGo = async (fn) => {
        const keys = [...selectedKeys];
        if (keys.length === 0) return;
        const results = await Promise.allSettled(keys.map((k) => fn(k)));
        let ok = 0;
        const failedKeys = [];
        results.forEach((res, i) => {
          if (res.status === "fulfilled") {
            ok++;
            selectedKeys.delete(keys[i]);
          } else failedKeys.push(keys[i]);
        });
        if (failedKeys.length === 0) {
          notice = null;
          batchForm.reason = "";
          batchForm.open = false;
          await view.reload();
        } else {
          notice = t("batch.done").replace("{ok}", String(ok)).replace("{fail}", String(failedKeys.length));
          paint();
        }
      };
      batchBar.append(btn2(t("actions.moveTo") + " " + t("groups.gating"), () => batchGo((k) => a.stage(k, "gating", ""))));
      batchBar.append(btn2(t("batch.close"), () => batchGo((k) => a.stage(k, "closed", ""))));
      batchBar.append(btn2(t("batch.override"), () => {
        batchForm.open = !batchForm.open;
        paint();
      }));
      if (batchForm.open) {
        const form = el8("div", "batchform");
        form.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 0";
        const v = select([["high", t("validity.high")], ["medium", t("validity.medium")], ["low", t("validity.low")]], batchForm.validity, (val) => {
          batchForm.validity = val;
        }, t("batch.formValidity"));
        const u = select([["P0", t("urgency.P0")], ["P1", t("urgency.P1")], ["P2", t("urgency.P2")], ["P3", t("urgency.P3")]], batchForm.urgency, (val) => {
          batchForm.urgency = val;
        }, t("batch.formUrgency"));
        const actSel = select([["start", t("recommendedActions.start")], ["feedback", t("recommendedActions.feedback")], ["close", t("recommendedActions.close")], ["hold", t("recommendedActions.hold")]], batchForm.action, (val) => {
          batchForm.action = val;
        }, t("batch.formAction"));
        const reason = el8("input", "batchreason");
        reason.placeholder = t("batch.reasonPlaceholder");
        reason.value = batchForm.reason;
        reason.oninput = () => {
          batchForm.reason = reason.value;
        };
        form.append(v, u, actSel, reason);
        form.append(btn2(t("actions.override"), () => batchGo((k) => a.override({ key: k, validity: v.value, urgency: u.value, action: actSel.value, reason: reason.value, lang: getLang() }))));
        batchBar.append(form);
      }
      triage.append(batchBar);
    }
    if (error) triage.append(el8("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) triage.append(el8("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      const filtersActive = filters.type !== "all" || filters.repo !== "all" || filters.urgency !== "all" || filters.stage !== "all";
      const emptyBox = el8("div", "empty");
      if (filtersActive) {
        emptyBox.append(el8("span", null, t("emptyStates.filtered")));
        const clearBtn = el8("button", null, t("emptyStates.clearFilters"));
        clearBtn.type = "button";
        clearBtn.onclick = () => {
          filters.type = "all";
          filters.repo = "all";
          filters.urgency = "all";
          filters.stage = "all";
          paint();
        };
        emptyBox.append(clearBtn);
      } else {
        emptyBox.append(el8("span", null, t("emptyStates.backlog")));
      }
      triage.append(emptyBox);
    } else {
      for (const group of groupCandidates(list, t)) {
        if (group.items.length === 0) continue;
        const sec = el8("section", "group" + (group.dim ? " dim" : ""));
        sec.append(el8("h3", null, group.label + " \xB7 " + group.items.length));
        for (const c of group.items) {
          const rowRun = runBlock(c, state?.runs ?? []);
          renderRow(sec, c, t, {
            expanded: expanded.has(c.key),
            onToggle: (key) => {
              if (expanded.has(key)) expanded.delete(key);
              else {
                expanded.add(key);
                if (rowRun && ["succeeded", "failed", "cancelled"].includes(rowRun.status)) seenRuns.add(rowRun.id);
              }
              paint();
            },
            run: rowRun,
            seen: seenRuns.has(c.currentRunId),
            selectable: true,
            selected: selectedKeys.has(c.key),
            onToggleSelect: (key) => {
              if (selectedKeys.has(key)) selectedKeys.delete(key);
              else selectedKeys.add(key);
              paint();
            },
            actions: extend?.rowActions ? (detail, cand) => extend.rowActions(detail, cand, { t, view, lang: getLang() }) : void 0
          });
        }
        triage.append(sec);
      }
    }
    const boardWrap = el8("div");
    const reviewWrap = el8("div");
    const rolesWrap = el8("div");
    const sessionsWrap = el8("div");
    boardWrap.style.display = activeTab === "board" ? "" : "none";
    reviewWrap.style.display = activeTab === "review" ? "" : "none";
    rolesWrap.style.display = activeTab === "roles" ? "" : "none";
    sessionsWrap.style.display = activeTab === "sessions" ? "" : "none";
    if (activeTab === "board") renderKanban(boardWrap, { t, candidates: state?.candidates ?? [], view });
    if (activeTab === "review") renderReview(reviewWrap, { t, candidates: state?.candidates ?? [], runs: state?.runs ?? [], view, templates: state?.workflow?.templates ?? [], nowMs: Date.now() });
    if (activeTab === "roles") renderRolesTab(rolesWrap, { t, workflow: state?.workflow ?? { templates: [] }, view });
    if (activeTab === "sessions") renderSessionsView(sessionsWrap, { t, managedRoot: state?.paths?.workspacesDir ?? null, items: sessionsItems, summaries: extend?.sessionsFeed?.() ?? [], onOpen: (id, item) => {
      if (item?.runId) seenRuns.add(item.runId);
      extend?.openWorkSession?.(id);
    }, onAnother: async (key, cwd) => {
      const err = await extend?.startAnother?.(key, cwd, t);
      if (err) return err;
      await view.reload();
      return null;
    }, onDeliver: async (key) => {
      try {
        await api.workDeliver(key, "");
      } catch (e) {
        return t("sessions.deliverFailed") + " (" + String(e?.message ?? e) + ")";
      }
      await view.reload();
      return null;
    }, runs: state?.runs ?? [], seenRunIds: [...seenRuns], nowMs: Date.now() });
    intake.style.display = activeTab === "list" ? "" : "none";
    triage.style.display = activeTab === "list" ? "" : "none";
    main.append(intake, triage, boardWrap, reviewWrap, rolesWrap, sessionsWrap);
    const surface = el8("div", "workSurface");
    surface.append(header, tabsBar, main);
    shadow.append(style, surface);
    let navIdx = 0;
    const assignNavKeys = (node) => {
      for (const c of node.children ?? []) {
        const tag = String(c.tagName).toUpperCase();
        if (tag === "BUTTON" || tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") c.dataset.navKey ??= "n" + navIdx++;
        assignNavKeys(c);
      }
    };
    assignNavKeys(surface);
    prevMainEl = main;
    if (savedScroll) main.scrollTop = savedScroll;
    if (navKey) {
      const findByNavKey = (node) => {
        for (const c of node.children ?? []) {
          if (c.dataset && c.dataset.navKey === navKey) return c;
          const hit = findByNavKey(c);
          if (hit) return hit;
        }
        return null;
      };
      findByNavKey(surface)?.focus?.();
    }
    rowEls = [];
    const collectRows = (node) => {
      for (const c of node.children ?? []) {
        if (c.classList?.contains?.("row")) rowEls.push(c);
        collectRows(c);
      }
    };
    collectRows(surface);
    surfaceEl = surface;
    if (cursorIndex >= rowEls.length) cursorIndex = rowEls.length - 1;
  };
  view.reload = async () => {
    if (reloadRunning) {
      reloadQueued = true;
      return;
    }
    reloadRunning = true;
    try {
      do {
        reloadQueued = false;
        const [s, w, au] = await Promise.allSettled([a.state(), a.workSessions(), a.auth()]);
        if (s.status === "fulfilled") {
          state = s.value;
          error = null;
        } else {
          error = s.reason?.message ?? String(s.reason);
        }
        authInfo = au.status === "fulfilled" ? au.value : null;
        sessionsItems = w.status === "fulfilled" ? w.value.items ?? [] : [];
        paint();
      } while (reloadQueued);
    } finally {
      reloadRunning = false;
    }
  };
  view.refresh = async () => {
    busy = true;
    paint();
    try {
      const r = await a.refresh();
      notice = r.authenticated === false ? makeT(getLang())("errors.noToken") : null;
    } catch (e) {
      error = e.message;
    }
    busy = false;
    await view.reload();
  };
  view.relabel = paint;
  const showPeekAt = (i) => {
    const key = rowEls[i]?.dataset?.key;
    const cand = (state?.candidates ?? []).find((c) => c.key === key);
    if (!cand) return;
    if (paletteOpen) {
      paletteInstance?.close?.();
      paletteOpen = false;
      paletteInstance = null;
    }
    peekInstance?.close?.();
    peekInstance = renderPeek(surfaceEl ?? shadow, { t: makeT(getLang()), candidate: cand, onClose: () => {
      peekOpen = false;
      peekInstance = null;
    } });
    peekOpen = true;
  };
  const highlightCursor = () => {
    for (const r2 of rowEls) r2.classList?.remove?.("knav-cursor");
    const r = rowEls[cursorIndex];
    if (r) {
      r.classList?.add?.("knav-cursor");
      r.scrollIntoView?.({ block: "nearest" });
    }
  };
  const keyHandler = createKeyHandler({
    getCursor: () => cursorIndex,
    setCursor: (i) => {
      cursorIndex = i;
      highlightCursor();
      if (peekOpen) showPeekAt(cursorIndex);
    },
    // P2-6：j/k 联动 Peek 跟随
    getRowCount: () => rowEls.length,
    rowAction: (i) => {
      const title = rowEls[i]?.children?.find((c) => String(c.className) === "title");
      title?.onclick?.();
    },
    rowSelect: (i) => {
      const chk = rowEls[i]?.children?.find((c) => c.getAttribute?.("role") === "checkbox");
      chk?.onclick?.();
    },
    tabSwitch: (i) => {
      const ids = ["list", "board", "review", "sessions", "roles"];
      if (ids[i]) {
        activeTab = ids[i];
        paint();
      }
    },
    onPeek: (i) => showPeekAt(i),
    onHelp: () => {
      if (helpInstance) {
        helpInstance.close();
        helpInstance = null;
      } else {
        helpInstance = openHelp(surfaceEl ?? shadow, makeT(getLang()));
      }
    },
    // P1-1：? toggle（rev-impl-p1 S5 防叠开）
    escape: () => {
      if (peekInstance) {
        peekInstance.close();
        peekInstance = null;
        peekOpen = false;
        return;
      }
      if (paletteOpen) {
        paletteInstance?.close?.();
        paletteOpen = false;
        paletteInstance = null;
        return;
      }
      helpInstance?.close?.();
      helpInstance = null;
    }
  });
  const keyHandlerGuarded = (e) => {
    if (disposed) return;
    if (e && (e.ctrlKey || e.metaKey) && String(e.key ?? "").toLowerCase() === "k") {
      e.preventDefault?.();
      if (peekOpen) {
        peekInstance?.close?.();
        peekOpen = false;
        peekInstance = null;
      }
      if (paletteOpen) {
        paletteInstance?.close?.();
        paletteOpen = false;
        paletteInstance = null;
      } else {
        paletteInstance = openPalette(surfaceEl ?? shadow, { t: makeT(getLang()), actions: paletteActions(), onClose: () => {
          paletteOpen = false;
          paletteInstance = null;
        } });
        paletteOpen = true;
      }
      return;
    }
    keyHandler(e);
  };
  const paletteActions = () => [
    ...["list", "board", "review", "sessions", "roles"].map((id) => ({ id: "tab-" + id, label: makeT(getLang())("tabs." + id), run: () => {
      activeTab = id;
      paint();
    } })),
    { id: "refresh", label: makeT(getLang())("refresh"), run: () => view.refresh() },
    { id: "help", label: makeT(getLang())("kbd.title"), run: () => {
      helpInstance = openHelp(surfaceEl ?? shadow, makeT(getLang()));
    } }
  ];
  shadow.addEventListener?.("keydown", keyHandlerGuarded);
  view.dispose = () => {
    disposed = true;
    tabsObserver?.disconnect?.();
    tabsObserver = null;
    shadow.removeEventListener?.("keydown", keyHandlerGuarded);
    shadow.innerHTML = "";
  };
  view.state = () => state;
  view.shadow = shadow;
  paint();
  view.reload();
  return view;
}

// src/client/components/runDetail.mjs
var el9 = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== void 0) n.textContent = text;
  return n;
};
var DOT_CLASS = { running: "st-running", waiting: "st-gating", succeeded: "st-done", failed: "st-failed", cancelled: "st-idle", pending: "st-idle", ready: "st-idle", skipped: "st-idle" };
function nodeStatusLabel(status, t) {
  switch (status) {
    case "running":
      return t("run.status.running");
    case "waiting":
      return t("run.status.waiting");
    case "succeeded":
      return t("run.status.succeeded");
    case "failed":
      return t("run.status.failed");
    case "cancelled":
      return t("run.status.cancelled");
    case "pending":
      return t("nodeState.pending");
    case "ready":
      return t("nodeState.ready");
    case "skipped":
      return t("nodeState.skipped");
    default:
      return status;
  }
}
function renderRunDetail(container, { t, run, deps = {} } = {}) {
  let tab = "nodes";
  const paint = () => {
    container.innerHTML = "";
    const wrap = el9("div", "rundetail");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:6px;border:1px dashed color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:8px;margin-top:4px";
    const tabs = el9("div", "rvtabs");
    tabs.style.cssText = "display:flex;gap:6px";
    const mkTab = (id, label) => {
      const b = el9("button", "rvtab" + (tab === id ? " is-active" : ""), label);
      b.type = "button";
      if (tab === id) b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0";
      b.onclick = () => {
        tab = id;
        paint();
      };
      return b;
    };
    tabs.append(mkTab("nodes", t("run.tabNodes")), mkTab("history", t("run.tabHistory")));
    const hasArtifacts = (run.nodeStatuses ?? []).some((n) => (n.artifacts ?? []).length > 0);
    const artTab = mkTab("artifacts", t("run.tabArtifacts"));
    if (!hasArtifacts) {
      artTab.disabled = true;
      artTab.title = t("run.emptyArtifacts");
    }
    tabs.append(artTab);
    wrap.append(tabs);
    if (tab === "nodes") {
      const list = el9("div", "rvnodes");
      for (const n of run.nodeStatuses ?? []) {
        const row2 = el9("div", "rvnode");
        row2.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap";
        row2.append(el9("span", "stdot " + (DOT_CLASS[n.status] ?? "st-idle")));
        row2.append(el9("span", "rvnname", n.name ?? n.id));
        row2.append(el9("span", "chip", nodeStatusLabel(n.status, t)));
        if (n.error) {
          const e = el9("span", "chip", n.error);
          e.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
          row2.append(e);
        }
        list.append(row2);
      }
      wrap.append(list);
    } else if (tab === "artifacts" && hasArtifacts) {
      const list = el9("div", "rvarts");
      for (const n of run.nodeStatuses ?? []) {
        if (!(n.artifacts ?? []).length) continue;
        const row2 = el9("div", "rvart");
        row2.append(el9("b", "rvartname", n.name ?? n.id));
        for (const a of n.artifacts) {
          const line = document.createElement("pre");
          line.className = "rvartline";
          line.style.cssText = "margin:2px 0 0;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;opacity:.85";
          line.textContent = a;
          row2.append(line);
        }
        list.append(row2);
      }
      wrap.append(list);
    } else {
      const hist = [...run.history ?? []].reverse();
      if (hist.length === 0) {
        wrap.append(el9("div", "rvhistempty", t("run.emptyHistory")));
      } else {
        const list = el9("div", "rvhist");
        for (const h2 of hist) {
          const row2 = el9("div", "rvhrow");
          row2.style.cssText = "display:flex;gap:8px;align-items:baseline;flex-wrap:wrap";
          const at = el9("span", "rvhat", h2.at ?? "");
          at.style.cssText = "opacity:.6;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px";
          row2.append(at);
          row2.append(el9("span", "chip", h2.event ?? ""));
          if (h2.detail) {
            const dd = el9("span", "rvhdetail", h2.detail);
            dd.style.cssText = "opacity:.75;font-size:12px";
            row2.append(dd);
          }
          list.append(row2);
        }
        wrap.append(list);
      }
    }
    container.append(wrap);
  };
  paint();
  return { setTab: (id) => {
    tab = id;
    paint();
  } };
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
function renderStrip(container, { t, candidates, workflow, runs = [], onStagePick = null, stageFilter = "all" } = {}) {
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
    const PRE_BUCKET = { backlog: "inbox", triage: "triaged", feedback: "gating" };
    for (const c of cells.pre) {
      const clickable = onStagePick && c.key !== "ingest" && c.count > 0 && PRE_BUCKET[c.key];
      if (clickable) {
        const bucket = PRE_BUCKET[c.key];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "chip stripchip" + (stageFilter === bucket ? " is-active" : "");
        cell.textContent = t("stages." + c.key) + " " + c.count;
        cell.onclick = () => onStagePick(bucket);
        wrap.append(cell);
      } else {
        const cell = document.createElement("span");
        cell.className = "chip";
        cell.textContent = t("stages." + c.key) + " " + c.count;
        wrap.append(cell);
      }
    }
    const divider = document.createElement("span");
    divider.textContent = "\xB7";
    divider.style.opacity = ".4";
    wrap.append(divider);
    for (const n of cells.loop) {
      const cell = document.createElement("span");
      cell.className = "chip";
      cell.style.opacity = n.count > 0 ? "1" : ".45";
      cell.title = n.count > 0 ? n.name + " \xB7 " + n.count : n.name;
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
  concLabel.textContent = t("settings.concurrency");
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
  const makeModelSelect = (ariaLabel, initial) => {
    const s = document.createElement("select");
    s.setAttribute("aria-label", ariaLabel);
    const fill = (providers, hostDefault) => {
      s.innerHTML = "";
      const follow = document.createElement("option");
      follow.value = "";
      follow.textContent = t("settings.followDefault") + "\uFF08" + (hostDefault ? hostDefault.provider + " / " + hostDefault.model : "\u2014") + "\uFF09";
      s.append(follow);
      let listed = false;
      for (const p of providers) {
        const og = document.createElement("optgroup");
        og.label = p.name || p.provider;
        for (const m of p.models) {
          const o = document.createElement("option");
          o.value = p.provider + "\n" + m.id;
          o.textContent = m.name || m.id;
          if (initial && p.provider === initial.provider && m.id === initial.model) listed = true;
          og.append(o);
        }
        s.append(og);
      }
      if (initial && !listed) {
        const o = document.createElement("option");
        o.value = valueOf(initial);
        o.textContent = initial.provider + " / " + initial.model + " " + t("settings.notInCatalog");
        s.append(o);
      }
      s.value = valueOf(initial);
    };
    fill([], null);
    return { select: s, fill };
  };
  const triageSelObj = makeModelSelect(t("settings.triageModel"), initialModel);
  const workSelObj = makeModelSelect(t("settings.workModel"), current?.workSessionModel ?? null);
  const workModelSel = workSelObj.select;
  const presetSel = document.createElement("select");
  presetSel.setAttribute("aria-label", t("settings.workPreset"));
  const fillPresets = (presets, currentPreset) => {
    presetSel.innerHTML = "";
    const follow = document.createElement("option");
    follow.value = "";
    follow.textContent = t("settings.followDefault");
    presetSel.append(follow);
    for (const p of presets) {
      const o = document.createElement("option");
      o.value = p;
      o.textContent = p;
      presetSel.append(o);
    }
    if (currentPreset && !presets.includes(currentPreset)) {
      const o = document.createElement("option");
      o.value = currentPreset;
      o.textContent = currentPreset + " " + t("settings.notInCatalog");
      presetSel.append(o);
    }
    presetSel.value = currentPreset ?? "";
  };
  fillPresets([], current?.workSessionPreset ?? null);
  const policySel = sel([
    ["", t("settings.followDefault")],
    ["ask", t("settings.policyAsk")],
    ["never", t("settings.policyNever")]
  ], current?.workSessionApprovalPolicy ?? "");
  api.models().then((r) => {
    triageSelObj.fill(r.providers, r.hostDefault);
    workSelObj.fill(r.providers, r.hostDefault);
    fillPresets(r.presets ?? [], current?.workSessionPreset ?? null);
    hostDefaultRow.textContent = t("settings.hostDefault") + (r.hostDefault ? r.hostDefault.provider + " / " + r.hostDefault.model : t("settings.hostDefaultNone"));
  }).catch(() => {
  });
  const hostDefaultRow = document.createElement("div");
  hostDefaultRow.style.cssText = "font-size:12px;opacity:.75";
  hostDefaultRow.textContent = t("settings.hostDefault") + t("settings.hostDefaultLoading");
  const modelLabel = document.createElement("label");
  modelLabel.textContent = t("settings.triageModel");
  const workModelLabel = document.createElement("label");
  workModelLabel.textContent = t("settings.workModel");
  const workPresetLabel = document.createElement("label");
  workPresetLabel.textContent = t("settings.workPreset");
  const workPolicyLabel = document.createElement("label");
  workPolicyLabel.textContent = t("settings.workPolicy");
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
      const base = settingsPatch(current ?? {}, { intervalMinutes: Number(input.value), modelValue: modelSel.value, engineConcurrency: Number(concInput.value) });
      const patch = workSessionSettingsPatch(current ?? {}, { workModelValue: workModelSel.value, workPreset: presetSel.value, workPolicy: policySel.value }, base);
      if (patch.workSessionApprovalPolicy === "never" && (current?.workSessionApprovalPolicy ?? null) !== "never") {
        if (!window.confirm(t("settings.policyNeverConfirm"))) {
          save.disabled = false;
          return;
        }
      }
      await api.putSettings(patch);
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
  dialog.append(title, concLabel, concInput, label, input, modelLabel, modelSel, hostDefaultRow, workModelLabel, workModelSel, workPresetLabel, presetSel, workPolicyLabel, policySel, err, save, feishuLabel, feishuInput, feishuRow);
  overlay.append(dialog);
  shadow.append(overlay);
  input.focus();
}
var btn = (text, onClick, disabled = false) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.disabled = disabled;
  b.onclick = withPending(b, onClick);
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
function pickWorkspace(shadow, { t, candidate, ui = {}, status = async () => ({ exists: false, isRepo: false, dirty: false, branch: null, workspaceTitle: null }), confirm = (msg) => Boolean(globalThis.confirm?.(msg)), defaultDir = null, note: initialNote = null } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;inset:0;z-index:70;display:flex;align-items:flex-start;justify-content:center;padding-top:18vh;background:color-mix(in srgb,canvas 55%,transparent)";
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", t("work.pickTitle"));
    dialog.style.cssText = "width:min(400px,92%);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:10px;background:canvas;color:canvastext;border:1px solid color-mix(in srgb,currentColor 18%,transparent)";
    const title = document.createElement("h3");
    title.style.margin = "0";
    title.textContent = t("work.pickTitle");
    const sub = document.createElement("div");
    sub.style.cssText = "font-size:12.5px;opacity:.75";
    sub.textContent = candidate.repo + "#" + candidate.number + " \xB7 " + (candidate.title ?? "");
    const note = document.createElement("div");
    note.style.cssText = "font-size:12.5px;display:none";
    const appears = document.createElement("div");
    appears.className = "wtip";
    appears.style.display = "none";
    const hints = document.createElement("div");
    const localLine = document.createElement("div");
    localLine.className = "wtip";
    const pickLine = document.createElement("div");
    pickLine.className = "wtip";
    pickLine.textContent = t("work.appearsPick");
    const managedLine = document.createElement("div");
    managedLine.className = "wtip";
    managedLine.textContent = t("work.appearsManaged");
    hints.append(localLine, pickLine, managedLine);
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      overlay.remove();
      resolve(v);
    };
    let currentButtons = [];
    const setButtons = (...bs) => {
      for (const b of currentButtons) b.remove();
      currentButtons = bs;
      dialog.append(...bs);
    };
    const showMain = () => {
      note.style.display = "none";
      appears.style.display = "none";
      setButtons(
        btn(t("work.pickLocal"), () => finish(null)),
        btn(t("work.pickBrowse"), () => {
          pickDir();
        }),
        btn(t("work.pickManaged"), () => finish("managed")),
        btn(t("work.pickCancel"), () => finish(void 0))
      );
    };
    const pickDir = async () => {
      let cwd = null;
      try {
        cwd = await ui.pickDirectory?.() ?? null;
      } catch {
        cwd = null;
      }
      if (!cwd) {
        showMain();
        return;
      }
      let st = null;
      try {
        st = await status(cwd);
      } catch {
        st = null;
      }
      appears.textContent = t("work.appearsAt").replace("{where}", st?.workspaceTitle ?? t("work.ungrouped"));
      appears.style.display = "block";
      if (st?.dirty) {
        note.textContent = t("work.dirtyHint") + (st.branch ? " \xB7 " + st.branch : "");
        note.style.display = "block";
        setButtons(
          btn(t("work.pickProceed"), async () => {
            let ok = true;
            try {
              ok = await confirm(note.textContent + " " + appears.textContent);
            } catch {
              ok = false;
            }
            finish(ok ? cwd : void 0);
          }),
          btn(t("work.pickCancel"), () => finish(void 0))
        );
      } else {
        finish(cwd);
      }
    };
    overlay.onclick = (e) => {
      if (e && e.target === overlay) finish(void 0);
    };
    dialog.append(title, sub, hints, note, appears);
    if (initialNote) {
      note.textContent = initialNote;
      note.style.display = "block";
    }
    overlay.append(dialog);
    shadow.append(overlay);
    showMain();
    Promise.resolve().then(() => defaultDir?.(candidate.repo)).then((r) => {
      if (done) return;
      localLine.textContent = r?.exists ? t("work.appearsDefault").replace("{dir}", r.cwd).replace("{where}", r.workspaceTitle ?? t("work.ungrouped")) : t("work.pickLocalFailed");
    }).catch(() => {
      if (!done) localLine.textContent = t("work.pickLocalFailed");
    });
  });
}
function installActions({ getLang, openWorkSession = () => false, pickDirectory = null, sessionsFeed = null, deps = {} } = {}) {
  const a = deps.api ?? api;
  let lastRuns = [];
  let lastState = null;
  return {
    // Task 12：会话板块 hooks——openWorkSession（导航）、sessionsFeed（sessions.list 投影）、startAnother（另开）。
    openWorkSession,
    sessionsFeed: () => sessionsFeed ? sessionsFeed() : [],
    // 无目录不发起（不得回退到本地检出）；有目录照常另开。
    startAnother: async (key, cwd, t) => {
      if (!cwd) return null;
      const r = await a.workStart(key, cwd, true, getLang());
      if (r?.ok) return null;
      const tt = t ?? makeT(getLang());
      const head = tt("sessions.anotherFailed");
      const human = errorText(r?.error, tt);
      return human ? head + "\uFF1A" + human : head + " (" + String(r?.error ?? "unknown") + ")";
    },
    header(header, { t, state, view }) {
      const b = btn(t("settings.title"), () => openSettings(view.shadow, { t, current: state?.settings ?? { intervalMinutes: 0 }, onSaved: () => view.reload() }));
      b.setAttribute("aria-label", t("settings.title"));
      b.dataset.short = t("settings.title").slice(0, 1);
      header.append(b);
    },
    // 收活板块的仓源管理入口：勾选/取消监看仓在对话框内完成，保存后立即刷新摄取。
    intake(container, { t, state, view }) {
      container.append(btn(t("watchedRepos"), () => openRepoPicker(view.shadow, { t, current: state?.watch?.repos ?? [], onSaved: () => view.refresh() })));
    },
    strip(container, { t, state, stagePick, stageFilter }) {
      lastRuns = state?.runs ?? [];
      lastState = state ?? null;
      renderStrip(container, { t, candidates: state?.candidates ?? [], workflow: state?.workflow, runs: lastRuns, onStagePick: stagePick, stageFilter });
    },
    bar(bar, { t, state, filters, view }) {
      const errLine = document.createElement("small");
      errLine.className = "rowerr";
      errLine.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);font-size:12px";
      errLine.style.display = "none";
      const keys = pickTriageBatch(state?.candidates ?? [], filters);
      bar.append(btn(t("actions.triageBatch") + " (" + keys.length + ")", async () => {
        try {
          await a.triage(keys, getLang());
          errLine.textContent = "";
          errLine.style.display = "none";
          await view.reload();
        } catch (e) {
          errLine.textContent = errorText(e, t) ?? t("errors.actionFailed") + " (" + (e?.message ?? e) + ")";
          errLine.style.display = "block";
        }
      }, keys.length === 0));
      bar.append(errLine);
    },
    rowActions(detail, c, { t, view, lang }) {
      const errLine = document.createElement("small");
      errLine.className = "rowerr";
      errLine.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);font-size:12px";
      errLine.style.display = "none";
      detail.prepend(errLine);
      const go = async (fn) => {
        try {
          await fn();
          errLine.textContent = "";
          errLine.style.display = "none";
          await view.reload();
        } catch (e) {
          errLine.textContent = errorText(e, t) ?? t("errors.actionFailed") + " (" + (e?.message ?? e) + ")";
          errLine.style.display = "block";
        }
      };
      const tr = c.triage ?? { validity: "medium", urgency: "P2", action: "hold", reason: "" };
      const v = sel(["high", "medium", "low"].map((x) => [x, t("validity." + x)]), tr.validity);
      const u = sel(["P0", "P1", "P2", "P3"].map((x) => [x, t("urgency." + x)]), tr.urgency);
      const actSel = sel(["start", "feedback", "close", "hold"].map((x) => [x, t("recommendedActions." + x)]), tr.action);
      const reason = document.createElement("input");
      reason.value = tr.reason ?? "";
      reason.placeholder = t("actions.reason");
      const override = row();
      override.className += " ux-wide";
      override.append(v, u, actSel, reason, btn(t("actions.override"), () => go(() => a.override({ key: c.key, validity: v.value, urgency: u.value, action: actSel.value, reason: reason.value, lang }))));
      const stages = row();
      stages.className += " ux-wide";
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        stages.append(btn(t("actions.moveTo") + " " + label, () => go(() => a.stage(c.key, s, "")), c.stage === s));
      }
      const gates = row();
      const g = gateState(c);
      const runInfo = runBlock(c, lastRuns);
      const workChip = (target, text, warn = false) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.style.opacity = warn ? "1" : ".8";
        if (warn) chip.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
        chip.textContent = text;
        target.append(chip);
      };
      const mkOpen = (target) => btn(t("work.openBtn"), () => {
        if (!openWorkSession(c.work.sessionId)) workChip(target, t("work.openPending"));
      });
      const pickOpts = (extra = {}) => ({ t, candidate: c, ui: { pickDirectory }, status: (cwd) => api.workspaceStatus(cwd), defaultDir: (repo) => a.workDefaultDir(repo), ...extra });
      const startIn = (target, pick) => async () => {
        if (pick === void 0) return;
        const anotherFlag = c.gates?.G1?.decision === "pass" && c.stage === "building";
        const r = pick === "managed" ? await a.workStart(c.key, null, anotherFlag, lang, "managed") : await a.workStart(c.key, pick, anotherFlag, lang);
        if (r?.ok && r.sessionId) {
          if (!r.reused && !openWorkSession(r.sessionId)) workChip(target, t("work.openPending"));
        } else if (r?.error) {
          const failedOpen = errorText(r.error, t);
          workChip(target, failedOpen ? t("work.startFailed") + "\uFF1A" + failedOpen : t("work.startFailed") + " (" + r.error + ")", true);
        }
      };
      const mkStart = (target) => btn(t("work.startBtn"), () => go(async () => {
        const remembered = lastState?.settings?.workDirs?.[c.repo];
        if (remembered === "managed") return startIn(target, "managed")();
        if (typeof remembered === "string" && remembered) {
          try {
            return await startIn(target, remembered)();
          } catch (e) {
            if (String(e?.message ?? e) !== "workspace-not-found") throw e;
            return startIn(target, await pickWorkspace(view.shadow, pickOpts({ note: t("work.dirGone") })))();
          }
        }
        return startIn(target, await pickWorkspace(view.shadow, pickOpts()))();
      }));
      const startDirTip = () => {
        const remembered = lastState?.settings?.workDirs?.[c.repo];
        const tip = document.createElement("span");
        tip.className = "wtip";
        tip.textContent = remembered === "managed" ? t("work.dirManaged") : typeof remembered === "string" && remembered ? t("work.dirMemory").replace("{dir}", remembered) : t("work.dirFirst");
        return tip;
      };
      const autoHost = document.createElement("div");
      const mkAutoRun = () => btn(t("work.autoRun"), () => {
        const base = lastState?.paths?.workspacesDir;
        const runDir = (base || "\u2026/workspaces") + "/" + runDirName(c.key);
        const block = document.createElement("div");
        block.className = "autorun";
        const head = document.createElement("div");
        head.textContent = t("work.autoConfirmTitle");
        const line = (text) => {
          const ln = document.createElement("div");
          ln.className = "wtip";
          ln.textContent = text;
          return ln;
        };
        const acts = row();
        acts.append(
          btn(t("work.autoGo"), () => go(async () => {
            await a.runStart(c.key, "");
          })),
          btn(t("work.pickCancel"), () => {
            autoHost.innerHTML = "";
          })
        );
        block.append(
          head,
          line(t("work.autoFactMode")),
          line(t("work.autoFactPath").replace("{dir}", runDir)),
          line(t("work.autoFactSession")),
          line(t("work.autoFactShip")),
          acts
        );
        autoHost.innerHTML = "";
        autoHost.append(block);
      });
      const workRow = row();
      workRow.className += " ux-wide";
      if (c.work?.sessionId) workRow.append(mkOpen(workRow));
      const runAlive = Boolean(runInfo && ["running", "waiting"].includes(runInfo.status));
      const retryReady = c.gates?.G1?.decision === "pass" && c.stage === "building" && !c.work;
      const freshReady = startable(c) && !c.work?.sessionId && !runAlive;
      const canStart = !c.work?.sessionId && !runAlive && (freshReady || retryReady);
      const canAuto = freshReady && c.type === "issue";
      if (canStart) {
        workRow.append(mkStart(workRow));
        workRow.append(startDirTip());
      }
      if (canAuto) workRow.append(mkAutoRun());
      if (workRow.children.length > 0) detail.append(workRow);
      if (canAuto) detail.append(autoHost);
      const rememberedDir = lastState?.settings?.workDirs?.[c.repo];
      const anotherDir = typeof rememberedDir === "string" && rememberedDir && rememberedDir !== "managed" ? rememberedDir : null;
      const canAnother = Boolean(anotherDir) && (Boolean(c.work?.sessionId) || runAlive);
      if (canStart || canAnother || c.work?.sessionId) {
        const more = document.createElement("details");
        more.className = "override-box";
        const moreSum = document.createElement("summary");
        moreSum.textContent = t("actions.more");
        more.append(moreSum);
        if (canStart) more.append(btn(t("work.changeDir"), () => go(async () => startIn(more, await pickWorkspace(view.shadow, pickOpts()))())));
        if (c.work?.sessionId) {
          more.append(btn(t("work.endSession"), () => go(async () => {
            await a.workEnd(c.key);
          })));
        }
        if (canAnother) {
          more.append(btn(t("sessions.another"), () => go(async () => {
            const r = await a.workStart(c.key, anotherDir, true, lang);
            if (r?.ok && r.sessionId) {
              if (!r.reused && !openWorkSession(r.sessionId)) workChip(more, t("work.openPending"));
            } else if (r?.error) {
              const failedAnother = errorText(r.error, t);
              workChip(more, failedAnother ? t("work.startFailed") + "\uFF1A" + failedAnother : t("work.startFailed") + " (" + r.error + ")", true);
            }
          })));
        }
        detail.append(more);
      }
      const uxNarrow = document.createElement("div");
      uxNarrow.className = "ux-narrow";
      const uxPrimary = row();
      uxPrimary.className = "primary-actions";
      if (["inbox", "held", "closed", "shipped"].includes(c.stage)) {
        uxPrimary.append(btn(t("actions.moveTo") + " " + t("groups.gating"), () => go(() => a.stage(c.key, "gating", ""))));
      }
      if (c.work?.sessionId) uxPrimary.append(mkOpen(uxPrimary));
      if (canStart) {
        uxPrimary.append(mkStart(uxPrimary));
        uxPrimary.append(startDirTip());
      }
      if (canAuto) uxPrimary.append(mkAutoRun());
      if (c.taskPackage) uxPrimary.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      const uxChips = row();
      uxChips.className = "stage-chips";
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        uxChips.append(btn(t("actions.moveTo") + " " + label, () => go(() => a.stage(c.key, s, "")), c.stage === s));
      }
      const details = document.createElement("details");
      details.className = "override-box";
      const sum = document.createElement("summary");
      sum.textContent = t("actions.overrideGroup");
      details.append(sum);
      const uxOverride = row();
      const v2 = sel(["high", "medium", "low"].map((x) => [x, t("validity." + x)]), tr.validity);
      const u2 = sel(["P0", "P1", "P2", "P3"].map((x) => [x, t("urgency." + x)]), tr.urgency);
      const a2 = sel(["start", "feedback", "close", "hold"].map((x) => [x, t("recommendedActions." + x)]), tr.action);
      const reason2 = document.createElement("input");
      reason2.value = tr.reason ?? "";
      reason2.placeholder = t("actions.reason");
      uxOverride.append(v2, u2, a2, reason2, btn(t("actions.override"), () => go(() => a.override({ key: c.key, validity: v2.value, urgency: u2.value, action: a2.value, reason: reason2.value, lang }))));
      details.append(uxOverride);
      uxNarrow.append(uxPrimary, uxChips, details);
      detail.append(uxNarrow);
      const modelEntries = Object.entries(runInfo?.models ?? {});
      if (modelEntries.length > 0) {
        const modelChip = document.createElement("span");
        modelChip.className = "chip";
        modelChip.textContent = "model: " + modelEntries.map(([nid, m]) => nid + " " + m).join(" \xB7 ");
        gates.append(modelChip);
      }
      const g2Ready = runInfo?.waitingGate === "g2";
      gates.append(
        // G1 放行并入「开工 / 自动执行」（design-v2 §20 第 28 条）；「不做」走人工推翻或关闭
        btn("G2 " + t("gates.G2") + " \xB7 " + t("actions.pass"), () => go(() => a.runGate(runInfo.id, "g2", "pass", "")), !g2Ready),
        btn("G2 \xB7 " + t("actions.reject"), () => go(() => a.runGate(runInfo.id, "g2", "reject", "")), !g2Ready),
        btn("G3 " + t("gates.G3"), () => {
        }, true)
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      if (runInfo) {
        const runRow = row();
        const st = document.createElement("span");
        st.className = "chip";
        st.textContent = t("run.status." + runInfo.status) + ((runInfo.currentNodeIds ?? []).length ? " \xB7 " + runInfo.currentNodeIds.join("/") : "");
        runRow.append(st);
        const runsOf = lastRuns.filter((r) => r.candidateKey === c.key).sort((x, y) => x.id < y.id ? 1 : -1);
        const seenSessions = /* @__PURE__ */ new Set();
        for (const s of runsOf.flatMap((r) => r.sessions ?? [])) {
          if (!s?.sessionId || seenSessions.has(s.sessionId)) continue;
          seenSessions.add(s.sessionId);
          runRow.append(btn(t("sessions.open") + " \xB7 " + (s.nodeName ?? s.nodeId), () => {
            if (!openWorkSession(s.sessionId)) workChip(runRow, t("sessions.badgeMissing"));
          }));
        }
        if (runInfo.status === "running" && (runInfo.currentNodeIds ?? []).length === 0) {
          const cl = document.createElement("span");
          cl.className = "chip";
          cl.style.opacity = ".7";
          cl.textContent = t("run.workspaceCloning");
          runRow.append(cl);
        }
        if (runInfo.error) {
          const err = document.createElement("span");
          err.className = "chip";
          err.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
          err.textContent = runInfo.error;
          runRow.append(err);
        }
        runRow.append(
          btn(t("actions.retryRun"), () => go(() => a.runRetry(runInfo.id, [...runInfo.failedNodeIds ?? [], ...runInfo.cancelledNodeIds ?? []][0] ?? "")), !((runInfo.status === "failed" || runInfo.status === "cancelled") && [...runInfo.failedNodeIds ?? [], ...runInfo.cancelledNodeIds ?? []].length > 0)),
          // M7/§18.3：数据源扩 cancelled（retryNode 已支持——M2 R1-9）；failedNodeIds 沿 M2 产出评审问题 1
          btn(t("actions.cancelRun"), () => go(() => a.runCancel(runInfo.id, "user")), !(runInfo.status === "running" || runInfo.status === "waiting"))
        );
        const detailWrap = document.createElement("div");
        detailWrap.style.display = "none";
        runRow.append(btn(t("run.detail"), () => {
          const open = detailWrap.style.display !== "none";
          detailWrap.style.display = open ? "none" : "";
          if (!open && detailWrap.children.length === 0) renderRunDetail(detailWrap, { t, run: runInfo });
        }));
        detail.append(runRow);
        detail.append(detailWrap);
      }
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    }
  };
}

// src/client/index.mjs
installKeyboardPrototypeShim();
var React = require("react");
var h = React.createElement;
var BUILD = true ? "49ec85cad767" : "dev";
var PANEL_KEY = "dsh-l.workbench";
var name = "dsh-l";
var isPlugin = true;
var inject = ["slots", "uiWorkspace", "sessions"];
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
  const openWorkSession = (sessionId) => {
    try {
      const ids = ctx.sessions?.list?.getSnapshot?.()?.ids;
      if (Array.isArray(ids) && ids.includes(sessionId)) {
        ctx.uiWorkspace.openSession(sessionId);
        return true;
      }
    } catch (e) {
      console.warn("[dsh-l] openSession guard:", e);
    }
    return false;
  };
  function WorkbenchPanel() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const host = ref.current;
      if (!host) return void 0;
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const view = mountWorkbench(shadow, { getLang: lang.get, build: BUILD, extend: installActions({
        getLang: lang.get,
        openWorkSession,
        pickDirectory: (opts) => ctx.uiWorkspace.pickDirectory(opts),
        sessionsFeed: () => {
          try {
            const snap = ctx.sessions.list.getSnapshot();
            const ids = snap?.ids ?? [];
            const byId = snap?.byId ?? {};
            return ids.map((id) => byId?.[id] ?? { id });
          } catch (e) {
            console.warn("[dsh-l] sessionsFeed:", e);
            return [];
          }
        }
      }) });
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
/* dsh-l-build:49ec85cad767 */
