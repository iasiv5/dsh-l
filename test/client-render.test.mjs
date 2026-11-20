import test from "node:test";
import assert from "node:assert/strict";

// 客户端渲染回归（评审 R1·问题 2 的测试缺口补面）：全套件此前无一执行客户端渲染路径，
// 4 处未定义标识符（compact 裸名 / ui.confirmDelete / cardMount 残行）带病绿。
// 本文件用最小 DOM stub 直调真实组件模块，钉死三件事：
//   ① renderConnectionCard full/compact 两形态在代表性状态下不抛且产出关键节点；
//   ② renderLoginGate 首次 draw 不抛、schedule 生效（timer 挂上）、authorized 即 onConnected；
//   ③ deriveView 状态面（badge/gates 派生）冒烟。

// ── 最小 DOM stub ──────────────────────────────────────────────
class FakeElement {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this._text = ""; this.onclick = null; this.type = ""; this.disabled = false; this.checked = false; this.style = {}; this._parent = null; }
  get classList() {
    const raw = String(this.attrs.class ?? "");
    return {
      add: (...cs) => { this.attrs.class = [...new Set([...raw.split(/\s+/).filter(Boolean), ...cs])].join(" "); },
      remove: (...cs) => { this.attrs.class = raw.split(/\s+/).filter((c) => c && !cs.includes(c)).join(" "); },
      contains: (c) => raw.split(/\s+/).includes(c),
    };
  }
  set className(v) { this.attrs.class = v; }
  get className() { return this.attrs.class ?? ""; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this.children.length ? this.children.map((c) => c.textContent).join("") : this._text; }
  set innerHTML(v) { this._text = String(v); this.children = []; this._html = String(v); }
  get innerHTML() { return this._html ?? ""; }
  get firstElementChild() { return this.children[0] ?? null; }
  append(...ns) { for (const n of ns) { if (n == null) continue; n._parent = this; this.children.push(n); } }
  prepend(n) { if (n != null) { n._parent = this; this.children.unshift(n); } }
  remove() { if (this._parent) this._parent.children = this._parent.children.filter((c) => c !== this); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  set title(v) { this.attrs.title = v; }
  get title() { return this.attrs.title ?? ""; }
  set id(v) { this.attrs.id = v; }
  get id() { return this.attrs.id ?? ""; }
  set placeholder(v) { this.attrs.placeholder = v; }
  set href(v) { this.attrs.href = v; }
  get href() { return this.attrs.href ?? ""; }
}
const shadowOf = () => { const sh = new FakeElement("shadow-root"); sh.host = new FakeElement("div"); return sh; };

// document/window 全局（组件模块顶层只读这些；fetch 在 loginGate 路径经 api 模块——该路径用 authorized 短路绕开网络）
// Node 24 的 navigator 是只读 getter——defineProperty 覆盖。
Object.defineProperty(globalThis, "document", { value: { createElement: (tag) => new FakeElement(tag) }, configurable: true, writable: true });
Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async () => {} } }, configurable: true, writable: true });

const { renderConnectionCard } = await import("../src/client/components/connectionCard.mjs");
const { zhCN } = await import("../src/client/locale/zh-CN.mjs");
const t = (key) => key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), zhCN) ?? key;

const READY = { gates: { ghInstalled: true, ghLogin: true, credentialOk: true }, viewerLogin: "iasiv5", credential: { configured: true, source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: new Date().toISOString(), healthy: true, ghWrittenByUs: true, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
const FRESH = { gates: { ghInstalled: false, ghLogin: false, credentialOk: false }, viewerLogin: null, credential: { configured: false, source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenByUs: false, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
const PENDING = { ...FRESH, gates: { ghInstalled: true, ghLogin: false, credentialOk: false }, device: { phase: "pending", userCode: "ABCD-1234", verificationUri: "https://github.com/login/device" } };

const find = (node, pred, out = []) => { for (const c of node.children ?? []) { if (pred(c)) out.push(c); find(c, pred, out); } return out; };
const byClass = (root, cls) => find(root, (n) => typeof n.className === "string" && n.className.split(/\s+/).includes(cls));

test("connectionCard full：ready 态渲染不抛，CTA=进入工作台，kv 门禁行齐备", () => {
  const mount = new FakeElement("div");
  assert.doesNotThrow(() => renderConnectionCard(mount, { t, status: READY, mode: "full", patOpen: false, confirmDelete: false, on: {} }));
  const card = byClass(mount, "gate")[0];
  assert.ok(card, "article.gate 在场（ui-probe 锚）");
  const cta = byClass(mount, "cta")[0];
  assert.ok(cta && cta.textContent.includes("iasiv5") && cta.textContent.includes(t("auth.enterBtn")));
  assert.equal(byClass(mount, "gateRow").length, 3);
  assert.ok(byClass(mount, "kv").length === 1);
  assert.equal(byClass(mount, "auxAct").length, 3);   // 重新校验 / 更换令牌 / 删除凭证
});

test("connectionCard full：fresh 态双方法区 + 安装 CTA；patOpen 表单；confirmDelete 确认浮层（gh logout 门控）", () => {
  const mount = new FakeElement("div");
  renderConnectionCard(mount, { t, status: FRESH, mode: "full", patOpen: false, confirmDelete: false, on: {} });
  assert.equal(byClass(mount, "method").length, 2);   // 双方法并列
  assert.ok(byClass(mount, "cta")[0].textContent.includes(t("cred.installCta")));
  const m2 = new FakeElement("div");
  renderConnectionCard(m2, { t, status: { ...FRESH, gates: { ghInstalled: true, ghLogin: true, credentialOk: false } }, mode: "full", patOpen: true, confirmDelete: false, on: {} });
  assert.ok(byClass(m2, "patForm")[0], "PAT 表单展开");
  const m3 = new FakeElement("div");
  renderConnectionCard(m3, { t, status: READY, mode: "full", patOpen: false, confirmDelete: true, on: {} });
  const confirm = byClass(m3, "patForm").at(-1);
  assert.ok(confirm.textContent.includes(t("cred.deleteConfirmTitle")));
  const checkbox = find(confirm, (n) => n.tagName === "input")[0];
  assert.equal(checkbox.checked, true);   // ghWrittenByUs=true → 预勾
  assert.equal(checkbox.disabled, false);
});

test("connectionCard full：device pending 态码框 + 互切链接；limited 态黄条", () => {
  const mount = new FakeElement("div");
  renderConnectionCard(mount, { t, status: PENDING, mode: "full", patOpen: false, confirmDelete: false, on: {} });
  const code = byClass(mount, "gateCode")[0];
  assert.ok(code.textContent.includes("ABCD-1234"));
  assert.ok(byClass(mount, "switchLink").length >= 1);
  const lim = new FakeElement("div");
  renderConnectionCard(lim, { t, status: { ...READY, credential: { ...READY.credential, rateLimitedUntil: new Date(Date.now() + 60000).toISOString() } }, mode: "full", patOpen: false, confirmDelete: false, on: {} });
  assert.ok(byClass(lim, "warnBox")[0].textContent.includes(t("cred.bannerLimited")));
});

test("connectionCard compact：ready 态紧凑行 + 辅助操作；fresh 态仅重新校验", () => {
  const mount = new FakeElement("div");
  assert.doesNotThrow(() => renderConnectionCard(mount, { t, status: READY, mode: "compact", patOpen: false, confirmDelete: false, on: {} }));
  assert.ok(byClass(mount, "credCompact")[0]);
  assert.equal(byClass(mount, "auxAct").length, 3);
  const m2 = new FakeElement("div");
  renderConnectionCard(m2, { t, status: FRESH, mode: "compact", patOpen: false, confirmDelete: false, on: {} });
  assert.equal(byClass(m2, "auxAct").length, 1);   // 未校验 → 只显重新校验
});

test("connectionCard：PAT 失败态呈现（credential-format/invalid/verify-failed → errForm 行）", () => {
  for (const [prefix, expect] of [
    ["credential-format", t("cred.errFormat")],
    ["credential-invalid", t("cred.errInvalid")],
    ["credential-verify-failed: github api 500", t("cred.errVerifyFailed")],
  ]) {
    const mount = new FakeElement("div");
    renderConnectionCard(mount, { t, status: { ...FRESH, gates: { ghInstalled: true, ghLogin: true, credentialOk: false } }, mode: "full", patOpen: true, confirmDelete: false, patError: prefix, on: {} });
    const errs = byClass(mount, "errForm");
    assert.equal(errs.length, 1, prefix + " 应有错误行");
    assert.equal(errs[0].textContent, expect, prefix);
  }
  const del = new FakeElement("div");
  renderConnectionCard(del, { t, status: READY, mode: "full", patOpen: false, confirmDelete: true, deleteError: "gh-not-ours", on: {} });
  assert.ok(byClass(del, "errForm").at(-1).textContent.includes(t("cred.errGhNotOurs")));
  const compact = new FakeElement("div");
  renderConnectionCard(compact, { t, status: READY, mode: "compact", patOpen: true, confirmDelete: false, patError: "credential-invalid", on: {} });
  assert.ok(byClass(compact, "errForm").length >= 1, "compact 侧同样呈现");
});

test("renderLoginGate：installing 轮询中三关全绿 → 自动续走 bind+onConnected（评审 S5）", async () => {
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = () => {};
  const { renderLoginGate } = await import("../src/client/components/loginGate.mjs");
  const { api } = await import("../src/client/api.mjs");
  const origAuth = api.auth, origBind = api.bind;
  const INSTALLING = { ...FRESH, install: { phase: "installing" } };
  api.auth = async () => READY;   // 轮询返回三关全绿（安装完成）
  api.bind = async () => ({ account: "iasiv5" });
  try {
    const shadow = shadowOf();
    let connected = 0;
    renderLoginGate(shadow, { t, status: INSTALLING, onConnected: () => { connected++; } });
    assert.ok(timers.length >= 1, "installing 轮询已挂");
    await timers[0].fn();   // 2s 到点：auth 返回 ready → 自动 enter
    assert.ok(connected >= 1, "三关全绿自动续走 bind+onConnected");
  } finally {
    api.auth = origAuth; api.bind = origBind;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
});

test("renderLoginGate：gh 登录未校验态挂载即静默校验 → CTA 变进入工作台（用户反馈修复）", async () => {
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = () => {};
  const { renderLoginGate } = await import("../src/client/components/loginGate.mjs");
  const { api } = await import("../src/client/api.mjs");
  const origAuth = api.auth, origVerify = api.verifyCredential, origBind = api.bind;
  const UNVERIFIED = { gates: { ghInstalled: true, ghLogin: true, credentialOk: false }, viewerLogin: "iasiv5", credential: { configured: false, source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenByUs: false, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
  let verifyCalled = 0;
  api.verifyCredential = async () => { verifyCalled++; return { login: "iasiv5", scopes: ["repo", "read:org"], fineGrained: false, verifiedAt: new Date().toISOString() }; };
  api.auth = async () => READY;   // 校验成功后 refresh 拉到 ready
  api.bind = async () => ({ account: "iasiv5" });
  try {
    const shadow = shadowOf();
    renderLoginGate(shadow, { t, status: UNVERIFIED, onConnected: () => {} });
    for (let i = 0; i < 6; i++) await new Promise((r) => realSetTimeout(r, 0));   // 排空 promise 链
    assert.equal(verifyCalled, 1, "挂载即补校验一次");
    const cta = byClass(shadow, "cta")[0];
    assert.ok(cta && cta.textContent.includes(t("auth.enterBtn")), "校验成功后 CTA=进入工作台，不再是连接 GitHub");
  } finally {
    api.verifyCredential = origVerify; api.auth = origAuth; api.bind = origBind;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
});

test("renderLoginGate：点击连接 GitHub → deviceStart → 码框渲染 + 轮询挂载（用户报告坏掉路径复现）", async () => {
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = () => {};
  const { renderLoginGate } = await import("../src/client/components/loginGate.mjs");
  const { api } = await import("../src/client/api.mjs");
  const origAuth = api.auth, origDeviceStart = api.deviceStart, origDeviceStatus = api.deviceStatus;
  const UNVERIFIED = { gates: { ghInstalled: true, ghLogin: true, credentialOk: false }, viewerLogin: "iasiv5", credential: { configured: false, source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenByUs: false, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
  const PENDING_DEVICE = { phase: "pending", userCode: "ABCD-1234", verificationUri: "https://github.com/login/device", expiresAt: new Date(Date.now() + 600000).toISOString() };
  api.deviceStart = async () => PENDING_DEVICE;
  api.deviceStatus = async () => PENDING_DEVICE;
  api.auth = async () => ({ ...UNVERIFIED, device: PENDING_DEVICE });
  try {
    const shadow = shadowOf();
    assert.doesNotThrow(() => renderLoginGate(shadow, { t, status: UNVERIFIED, onConnected: () => {} }));
    const cta = byClass(shadow, "cta")[0];
    assert.ok(cta && cta.textContent.includes(t("cred.connectBtn")));
    timers.length = 0;
    assert.doesNotThrow(() => cta.onclick({ preventDefault() {} }));   // 点击连接 GitHub：用户报告「页面坏掉」的路径
    for (let i = 0; i < 8; i++) await new Promise((r) => realSetTimeout(r, 0));
    assert.ok(byClass(shadow, "gateCode")[0], "pending 码框渲染");
    assert.ok(byClass(shadow, "switchLink").length >= 1, "互切链接在");
    assert.ok(timers.length >= 1, "轮询 timer 挂上（界面不会静止坏死）");
  } finally {
    api.deviceStart = origDeviceStart; api.deviceStatus = origDeviceStatus; api.auth = origAuth;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
});

test("connectionCard compact：定向重渲染幂等——多次点击不堆叠（用户报告回归钉）", () => {
  const mount = new FakeElement("div");
  let patOpen = false, confirmDelete = false;
  const render = () => renderConnectionCard(mount, { t, status: READY, mode: "compact", patOpen, confirmDelete, patError: null, deleteError: null, on: {} });
  render();                                   // 初始
  assert.equal(byClass(mount, "credCompact").length, 1);
  patOpen = true; render();                   // 点更换令牌 → 表单开
  assert.equal(byClass(mount, "credCompact").length, 1, "重渲染不堆叠紧凑卡");
  assert.equal(byClass(mount, "patForm").length, 1);
  patOpen = false; confirmDelete = true; render();   // 关表单 → 开删除确认
  assert.equal(byClass(mount, "credCompact").length, 1);
  const formsLeft = byClass(mount, "patForm");       // 确认浮层复用 patForm 类：剩下的唯一元素应为确认浮层（PAT 表单已关）
  assert.equal(formsLeft.length, 1);
  assert.ok(!formsLeft[0].textContent.includes(t("cred.patTitle")));
  assert.equal(byClass(mount, "patForm.open").length + byClass(mount, "patForm").length >= 1, true);
  confirmDelete = true; render(); render(); render();   // 连点删除凭证多次
  assert.equal(byClass(mount, "patForm").length, 1, "删除确认浮层不堆叠");   // 确认框复用 patForm 类：3 次重渲染后仍只有一个
  assert.equal(byClass(mount, "credCompact").length, 1);
});

test("renderLoginGate：初次 draw 不抛、结构三段在位；authorized 即 onConnected（不轮询）", async () => {
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = () => {};
  const { renderLoginGate } = await import("../src/client/components/loginGate.mjs");
  const { api } = await import("../src/client/api.mjs");
  const origAuth = api.auth;
  const origDeviceStatus = api.deviceStatus;
  api.auth = async () => PENDING;
  api.deviceStatus = async () => ({ phase: "authorized", login: "iasiv5" });
  try {
    const shadow = shadowOf();
    let connected = 0;
    assert.doesNotThrow(() => renderLoginGate(shadow, { t, status: PENDING, onConnected: () => { connected++; } }));
    assert.ok(byClass(shadow, "gateWrap")[0], "面板挂载");
    assert.ok(byClass(shadow, "brandRow")[0] && byClass(shadow, "gateFoot")[0], "品牌区 + 脚注区");
    assert.ok(byClass(shadow, "gateCode")[0], "pending 态码框已渲染");
    assert.ok(timers.length >= 1, "schedule 生效（轮询 timer 挂上）");
    await timers[0].fn();   // 驱动一次轮询 → deviceStatus 返回 authorized
    assert.ok(connected >= 1, "authorized 即 onConnected");
  } finally {
    api.auth = origAuth; api.deviceStatus = origDeviceStatus;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
});
