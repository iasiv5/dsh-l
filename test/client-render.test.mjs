import test from "node:test";
import assert from "node:assert/strict";

// 客户端渲染回归（评审执行产出反馈轮）：凭据卡句柄化（常驻骨架 + 类切换）后的钉子——
// ① full/compact 两形态代表性状态渲染不抛且节点齐备；② **UI 开关零 DOM 重建**（堆叠回归钉：mount 子节点数恒定）；
// ③ 失败态就地呈现（errKeyFor 映射）；④ renderLoginGate 首次 draw 不抛、静默补验、connect 链路、authorized→onConnected。

// ── 最小 DOM stub（父链 remove/切换 class 支持完整语义） ──
class FakeElement {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this._text = ""; this.onclick = null; this.type = ""; this.disabled = false; this.checked = false; this.style = {}; this._parent = null; }
  get classList() {
    const self = this;
    const names = () => String(self.attrs.class ?? "").split(/\s+/).filter(Boolean);
    return {
      add: (...cs) => { self.attrs.class = [...new Set([...names(), ...cs])].join(" "); },
      remove: (...cs) => { self.attrs.class = names().filter((c) => !cs.includes(c)).join(" "); },
      toggle: (c, force) => { const has = names().includes(c); const want = force === undefined ? !has : Boolean(force); if (want && !has) self.attrs.class = [...names(), c].join(" "); else if (!want && has) self.attrs.class = names().filter((x) => x !== c).join(" "); },
      contains: (c) => names().includes(c),
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
  insertBefore(n, ref) { if (n == null) return n; n._parent = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); return n; }
  addEventListener() {}   // 防自动填充 unroof 监听在 stub 上为 no-op
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
const click = (n) => n.onclick({ preventDefault() {} });

test("connectionCard full：ready 态渲染不抛，CTA=进入工作台，kv 门禁行辅助齐备", () => {
  const mount = new FakeElement("div");
  assert.doesNotThrow(() => renderConnectionCard(mount, { t, status: READY, mode: "full", on: {} }));
  assert.ok(byClass(mount, "gate")[0], "article.gate 在场（ui-probe 锚）");
  const cta = byClass(mount, "cta")[0];
  assert.ok(cta && cta.textContent.includes("iasiv5") && cta.textContent.includes(t("auth.enterBtn")));
  assert.equal(byClass(mount, "gateRow").length, 3);
  assert.equal(byClass(mount, "kv").length, 1);
  assert.equal(byClass(mount, "auxAct").length, 3);
});

test("connectionCard full：fresh 态双方法区 + 安装 CTA + 注脚；pending 态码框 + 互切", () => {
  const mount = new FakeElement("div");
  renderConnectionCard(mount, { t, status: FRESH, mode: "full", on: {} });
  assert.equal(byClass(mount, "method").length, 2);
  assert.ok(byClass(mount, "cta")[0].textContent.includes(t("cred.installCta")));
  assert.ok(byClass(mount, "note").some((n) => n.textContent.includes(t("cred.installManual"))));
  const m2 = new FakeElement("div");
  renderConnectionCard(m2, { t, status: PENDING, mode: "full", on: {} });
  assert.ok(byClass(m2, "gateCode")[0].textContent.includes("ABCD-1234"));
  assert.ok(byClass(m2, "switchLink").length >= 1);
});

test("connectionCard 句柄开关：patOpen/confirmDelete 类切换零重建（堆叠回归钉）", () => {
  const mount = new FakeElement("div");
  const handle = renderConnectionCard(mount, { t, status: READY, mode: "full", on: {} });
  const childCount = () => mount.children.length;
  assert.equal(childCount(), 1);
  handle.setPatOpen(true);
  assert.equal(childCount(), 1, "零重建：mount 子节点数恒定");
  assert.ok(byClass(mount, "patForm")[0].classList.contains("open"));
  handle.setPatOpen(false);
  handle.setConfirmDelete(true);
  assert.equal(childCount(), 1);
  const confirm = byClass(mount, "patForm").find((n) => n.textContent.includes(t("cred.deleteConfirmTitle")));
  assert.ok(confirm, "删除确认浮层在");
  const check = find(confirm, (n) => n.tagName === "input")[0];
  assert.equal(check.checked, true);          // ghWrittenByUs=true → 预勾
  assert.equal(check.disabled, false);
});

test("connectionCard 失败态就地呈现：patSave 抛错 → errForm 显示映射文案（六前缀）", async () => {
  const cases = [
    ["credential-format", t("cred.errFormat")],
    ["credential-invalid", t("cred.errInvalid")],
    ["credential-verify-failed: net", t("cred.errVerifyFailed")],
    ["token-invalid", t("cred.errTokenInvalid")],
    ["rate-limited:120", t("cred.errRateLimited")],
  ];
  for (const [thrown, expect] of cases) {
    const mount = new FakeElement("div");
    const handle = renderConnectionCard(mount, { t, status: { ...READY, gates: { ghInstalled: true, ghLogin: true, credentialOk: false } }, mode: "full", on: { patSave: async () => { throw new Error(thrown); } } });
    handle.setPatOpen(true);
    const form = byClass(mount, "patForm").find((n) => n.textContent.includes(t("cred.patTitle")));
    find(form, (n) => n.tagName === "input")[0].value = "ghp_test";   // 模拟用户输入（空值会被格式守卫早退）
    const save = byClass(form, "patSave")[0];
    await click(save);
    await new Promise((r) => setTimeout(r, 0));
    const errs = byClass(mount, "errForm").filter((n) => n.textContent === expect);
    assert.equal(errs.length, 1, thrown + " 应呈现映射文案");
  }
  // gh-not-ours：删除确认抛错 → 确认浮层内呈现
  const mount = new FakeElement("div");
  const handle = renderConnectionCard(mount, { t, status: READY, mode: "full", on: { deleteConfirmed: async () => { throw new Error("gh-not-ours"); } } });
  handle.setConfirmDelete(true);
  const confirm = byClass(mount, "patForm").find((n) => n.textContent.includes(t("cred.deleteConfirmTitle")));
  await click(byClass(confirm, "patSave")[0]);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(byClass(mount, "errForm").some((n) => n.textContent === t("cred.errGhNotOurs")), "gh-not-ours 就地呈现");
});

test("connectionCard 防自动填充钉：挂载时密码框不进 DOM；展开后 readonly+new-password（2026-11-20 root 回填根因）", () => {
  // full 卡：setPatOpen(true) 前后
  const mount = new FakeElement("div");
  const handle = renderConnectionCard(mount, { t, status: READY, mode: "full", on: {} });
  assert.ok(!byClass(mount, "patForm").some((n) => n.textContent.includes(t("cred.patTitle"))), "挂载时 PAT 表单不进 DOM（密码框不唤醒 PM）");
  handle.setPatOpen(true);
  const form = byClass(mount, "patForm").find((n) => n.textContent.includes(t("cred.patTitle")));
  assert.ok(form && form.classList.contains("open"), "展开后 PAT 表单在 DOM 且 open");
  const pat = find(form, (n) => n.tagName === "input")[0];
  assert.equal(pat.readOnly, true, "密码框 readonly（PM 跳过）");
  assert.equal(pat.autocomplete, "new-password", "new-password 抑制已存凭据回填");
  handle.setPatOpen(false);
  assert.ok(!form.classList.contains("open"), "收起后 open 摘除；节点保留");
  // compact 卡：patBtn2 点击路径同样懒挂载
  const m2 = new FakeElement("div");
  renderConnectionCard(m2, { t, status: READY, mode: "compact", on: {} });
  assert.ok(!byClass(m2, "patForm").some((n) => n.textContent.includes(t("cred.patTitle"))), "compact 挂载时 PAT 表单不进 DOM");
  const patBtn = byClass(m2, "auxAct").find((n) => n.textContent.includes(t("cred.patBtn")));
  click(patBtn);
  const form2 = byClass(m2, "patForm").find((n) => n.textContent.includes(t("cred.patTitle")));
  assert.ok(form2 && form2.classList.contains("open"), "compact 点击更换令牌后 PAT 表单进 DOM 且 open");
  const pat2 = find(form2, (n) => n.tagName === "input")[0];
  assert.equal(pat2.readOnly, true);
  assert.equal(pat2.autocomplete, "new-password");
});

test("connectionCard compact：ready/fresh 两态渲染与辅助按钮可用性", () => {
  const m1 = new FakeElement("div");
  assert.doesNotThrow(() => renderConnectionCard(m1, { t, status: READY, mode: "compact", on: {} }));
  assert.ok(byClass(m1, "credCompact")[0]);
  const visible1 = byClass(m1, "auxAct").filter((n) => n.style.display !== "none");
  assert.equal(visible1.length, 3);
  const m2 = new FakeElement("div");
  renderConnectionCard(m2, { t, status: FRESH, mode: "compact", on: {} });
  const visible2 = byClass(m2, "auxAct").filter((n) => n.style.display !== "none");
  assert.equal(visible2.length, 1);   // 未校验 → 只显重新校验（更换/删除隐藏）
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
  api.auth = async () => READY;
  api.bind = async () => ({ account: "iasiv5" });
  try {
    const shadow = new FakeElement("shadow-root"); shadow.host = new FakeElement("div");
    renderLoginGate(shadow, { t, status: UNVERIFIED, onConnected: () => {} });
    for (let i = 0; i < 6; i++) await new Promise((r) => realSetTimeout(r, 0));
    assert.equal(verifyCalled, 1, "挂载即补校验一次");
    const cta = byClass(shadow, "cta")[0];
    assert.ok(cta && cta.textContent.includes(t("auth.enterBtn")), "校验成功后 CTA=进入工作台");
  } finally {
    api.verifyCredential = origVerify; api.auth = origAuth; api.bind = origBind;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
});

test("renderLoginGate：点击连接 GitHub → deviceStart → 码框渲染 + 轮询挂载（用户报告路径复现）", async () => {
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
    const shadow = new FakeElement("shadow-root"); shadow.host = new FakeElement("div");
    assert.doesNotThrow(() => renderLoginGate(shadow, { t, status: UNVERIFIED, onConnected: () => {} }));
    const cta = byClass(shadow, "cta")[0];
    assert.ok(cta && cta.textContent.includes(t("cred.connectBtn")));
    timers.length = 0;
    assert.doesNotThrow(() => cta.onclick({ preventDefault() {} }));
    for (let i = 0; i < 8; i++) await new Promise((r) => realSetTimeout(r, 0));
    assert.ok(byClass(shadow, "gateCode")[0], "pending 码框渲染");
    assert.ok(byClass(shadow, "switchLink").length >= 1);
    assert.ok(timers.length >= 1, "轮询 timer 挂上");
  } finally {
    api.deviceStart = origDeviceStart; api.deviceStatus = origDeviceStatus; api.auth = origAuth;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
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
  api.auth = async () => READY;
  api.bind = async () => ({ account: "iasiv5" });
  try {
    const shadow = new FakeElement("shadow-root"); shadow.host = new FakeElement("div");
    let connected = 0;
    renderLoginGate(shadow, { t, status: INSTALLING, onConnected: () => { connected++; } });
    assert.ok(timers.length >= 1);
    await timers[0].fn();
    assert.ok(connected >= 1);
  } finally {
    api.auth = origAuth; api.bind = origBind;
    globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  }
});
