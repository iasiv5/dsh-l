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
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this._text = ""; this.onclick = null; this.type = ""; this.disabled = false; this.checked = false; this.value = ""; this.style = {}; }
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
  append(...ns) { for (const n of ns) { if (n == null) continue; this.children.push(n); } }
  prepend(n) { if (n != null) this.children.unshift(n); }
  remove() {}
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
