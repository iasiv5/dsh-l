import test from "node:test";
import assert from "node:assert/strict";

// 客户端渲染回归（评审执行产出反馈轮）：凭据卡句柄化（常驻骨架 + 类切换）后的钉子——
// ① full/compact 两形态代表性状态渲染不抛且节点齐备；② **UI 开关零 DOM 重建**（堆叠回归钉：mount 子节点数恒定）；
// ③ 失败态就地呈现（errKeyFor 映射）；④ renderLoginGate 首次 draw 不抛、静默补验、connect 链路、authorized→onConnected。

// ── 最小 DOM stub（父链 remove/切换 class 支持完整语义） ──
class FakeElement {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this._text = ""; this.onclick = null; this.type = ""; this.dataset = {}; this.disabled = false; this.checked = false; this.style = {}; this._parent = null; this.isConnected = true; }   // isConnected 供 success-turn 卸载语义检查（评审 N1）
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
  assert.equal(byClass(mount, "auxAct").length, 2);   // round-2 决策点精简：更换令牌 + 删除凭证（重新校验归头部图标钮）
});

test("connectionCard full：fresh 态单门禁行收敛 + 安装 CTA + 注脚；pending 态码框 + 互切（2026-11-20 简报 + round-2）", () => {
  const mount = new FakeElement("div");
  renderConnectionCard(mount, { t, status: FRESH, mode: "full", on: {} });
  assert.equal(byClass(mount, "method").length, 0);   // 双方法区已删（round-2 单主行动，评审 Q4）
  assert.equal(byClass(mount, "connectZone").length, 0);
  const rows = byClass(mount, "gateRow");
  assert.equal(rows.length, 3);
  assert.notEqual(rows[0].style.display, "none");   // 只留 gh CLI 一行
  assert.equal(rows[1].style.display, "none");
  assert.equal(rows[2].style.display, "none");
  assert.equal(byClass(mount, "kv")[0].style.display, "none");
  assert.ok(byClass(mount, "cta")[0].textContent.includes(t("cred.installCta")));
  assert.ok(byClass(mount, "note").some((n) => n.textContent.includes(t("cred.installManual"))));
  const m2 = new FakeElement("div");
  renderConnectionCard(m2, { t, status: PENDING, mode: "full", on: {} });
  assert.ok(byClass(m2, "gateCode")[0].textContent.includes("ABCD-1234"));
  assert.ok(byClass(m2, "switchLink").length >= 1);
});

test("connectionCard full：陈旧 verifiedAt 幽灵态收敛——kv/aux/双方法区隐藏、单行+安装 CTA（2026-11-20 简报）", () => {
  const GHOST = { gates: { ghInstalled: false, ghLogin: false, credentialOk: false }, viewerLogin: null, credential: { configured: false, source: "gh-login-state", scopes: ["gist", "read:org", "repo"], verifiedAt: new Date().toISOString(), healthy: true, ghWrittenByUs: false, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
  const mount = new FakeElement("div");
  renderConnectionCard(mount, { t, status: GHOST, mode: "full", on: {} });
  assert.equal(byClass(mount, "kv")[0].style.display, "none");
  assert.equal(byClass(mount, "aux")[0].style.display, "none");
  assert.equal(byClass(mount, "connectZone").length, 0);   // 双方法区已删（round-2）
  assert.ok(byClass(mount, "badge")[0].textContent.includes(t("cred.badgeUnset")));
  assert.ok(byClass(mount, "credSub")[0].textContent.includes(t("cred.subNoGh")));
  assert.ok(byClass(mount, "cta")[0].textContent.includes(t("cred.installCta")));
});

test("connectionCard round-2（gh-as-source）：gate1 版本展示 + CTA 分派收窄 + PAT 唯一入口在 aux", () => {
  const mk = (status) => { const m = new FakeElement("div"); renderConnectionCard(m, { t, status, mode: "full", on: {} }); return m; };
  const baseCred = (over = {}) => ({ configured: false, source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenByUs: false, rateLimitedUntil: null, ...over });
  const GH = { gates: { ghInstalled: true, ghLogin: false, credentialOk: false, ghVersion: "2.105.0" }, viewerLogin: null, credential: baseCred(), install: { phase: "idle" }, device: { phase: "idle" } };
  const m1 = mk(GH);
  assert.ok(byClass(m1, "gateRow")[0].textContent.includes("v2.105.0"));   // gate1 带版本
  assert.ok(byClass(m1, "cta")[0].textContent.includes(t("cred.connectBtn")));   // 未就绪 → 连接 GitHub
  const aux1 = byClass(m1, "auxAct").filter((n) => n.textContent.includes(t("cred.patBtn")));
  assert.equal(aux1.length, 1);   // gh 已装未登录：PAT 唯一入口在 aux
  const BROKEN = { ...GH, viewerLogin: "o", gates: { ghInstalled: true, ghLogin: true, credentialOk: false, ghVersion: "2.105.0" }, credential: baseCred({ configured: true, source: "device-flow", scopes: ["repo"], verifiedAt: "2026-11-01T00:00:00Z", healthy: false, ghWrittenByUs: true }) };
  assert.ok(byClass(mk(BROKEN), "cta")[0].textContent.includes(t("cred.reauthCta")));   // 曾就绪后失效 → 重新授权
  const SCOPEMISS = { ...GH, viewerLogin: "o", gates: { ghInstalled: true, ghLogin: true, credentialOk: false, ghVersion: "2.105.0" }, credential: baseCred({ configured: true, source: "manual-pat", scopes: ["gist"], verifiedAt: "2026-11-01T00:00:00Z", healthy: true }) };
  assert.ok(byClass(mk(SCOPEMISS), "cta")[0].textContent.includes(t("cred.connectBtn")));   // scope 未达（从未就绪）→ 连接 GitHub（评审 Q1 收窄）
});

test("connectionCard full：setConnectError 就地呈现 device-start 错误映射（2026-11-20 静默失败修复）", () => {
  const mount = new FakeElement("div");
  const handle = renderConnectionCard(mount, { t, status: READY, mode: "full", on: {} });
  handle.setConnectError("device-start-failed: github device code 404");
  const err = byClass(mount, "err")[0];
  assert.equal(err.style.display, "");
  assert.ok(err.textContent.includes(t("cred.errDeviceStart")));
  handle.setConnectError(null);
  assert.equal(byClass(mount, "err")[0].style.display, "none");
});

test("connectionCard polish：gates aria-live + 同值不写 + 过期倒计时 + PAT 可见性切换", () => {
  const mount = new FakeElement("div");
  const EXP = { gates: { ghInstalled: true, ghLogin: true, credentialOk: false, ghVersion: "2.105.0" }, viewerLogin: "o", credential: { configured: false, source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenByUs: false, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "pending", userCode: "ZZZZ-YYYY", verificationUri: "https://github.com/login/device", expiresAt: new Date(Date.now() + 10 * 60000).toISOString() } };
  const h = renderConnectionCard(mount, { t, status: EXP, mode: "full", on: {} });
  const gates = byClass(mount, "gates")[0];
  assert.equal(gates.getAttribute("aria-live"), "polite");
  assert.equal(gates.getAttribute("role"), "status");
  const expLine = byClass(mount, "deviceExpires")[0];
  assert.ok(expLine.textContent.includes("分钟后过期"));
  h.setPatOpen(true);
  const input = byClass(mount, "patInput")[0];
  const toggle = byClass(mount, "patToggle")[0];
  assert.equal(input.type, "password");
  toggle.onclick({ preventDefault() {} });
  assert.equal(input.type, "text");
  assert.ok(toggle.textContent.includes(t("cred.patHide")));
  toggle.onclick({ preventDefault() {} });
  assert.equal(input.type, "password");
  // 同值不写哨兵（评审 Q10）：同值二次 update 不重写文本节点
  const st = byClass(mount, "gateRow")[0].children[2];
  const kidsRef = st.children;
  h.update(EXP);
  assert.ok(st.children === kidsRef);   // 守卫跳过重写 → children 数组引用不变
  // 四失败路径固化（评审 Q16）
  const broken = mkErr("expired");   // 设备码过期
  function mkErr(kind) {
    const base = { gates: { ghInstalled: true, ghLogin: true, credentialOk: false, ghVersion: null }, viewerLogin: "o", credential: { configured: true, source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: new Date().toISOString(), healthy: true, ghWrittenByUs: true, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
    if (kind === "expired") base.device = { phase: "expired" };
    if (kind === "failed") base.device = { phase: "failed", error: "boom" };
    if (kind === "installFailed") { base.gates.ghInstalled = false; base.install = { phase: "failed" }; }
    const m = new FakeElement("div");
    renderConnectionCard(m, { t, status: base, mode: "full", on: {} });
    return m;
  }
  assert.ok(byClass(mkErr("expired"), "gateRow")[2].textContent.includes(t("auth.deviceExpired")));
  assert.ok(byClass(mkErr("failed"), "gateRow")[2].textContent.includes(t("auth.deviceFailed")));
  assert.ok(byClass(mkErr("installFailed"), "note").some((n) => n.textContent.includes(t("cred.installFailed"))));
  const mhMount = new FakeElement("div");
  const mh = renderConnectionCard(mhMount, { t, status: { ...READY, gates: { ghInstalled: true, ghLogin: true, credentialOk: false } }, mode: "full", on: {} });
  mh.setConnectError("gh-handoff-failed: x");
  assert.ok(byClass(mhMount, "err").some((n) => n.textContent.includes(t("cred.errHandoff"))));   // "err" 类同时命中 bad 行红点（round-2 stCls），按文本断言
});

test("connectionCard polish：bad 行红点 + ready aux 决策点 4（评审 Q5/Q6）", () => {
  const BROKEN = { gates: { ghInstalled: true, ghLogin: true, credentialOk: false, ghVersion: null }, viewerLogin: "o", credential: { configured: true, source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: new Date().toISOString(), healthy: false, ghWrittenByUs: true, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "idle" } };
  const m = new FakeElement("div");
  renderConnectionCard(m, { t, status: BROKEN, mode: "full", on: {} });
  const rows = byClass(m, "gateRow");
  assert.equal(rows[2].children[0].className, "dot err");   // bad 行红点（stCls err）
  const aux = byClass(m, "auxAct").filter((n) => n.style.display !== "none");
  assert.equal(aux.length, 2);   // 更换令牌 + 删除凭证（重新校验已归头部图标钮）
  assert.equal(byClass(m, "recheck").length, 1);   // 头部图标钮在场 → 可交互控件全口径 CTA+图标+aux2 = 4（评审 R1-7 计数断言）
  assert.equal(aux.some((n) => n.textContent.includes(t("cred.recheck"))), false);
});

test("renderLoginGate success-turn 编排（gh-as-source 峰值）：轮询 authorized → 定影 → onConnected 尾触发；卸载不触发；reduced-motion 瞬切", async () => {
  const timers = [];
  const realST = globalThis.setTimeout, realCT = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; };
  globalThis.clearTimeout = (t) => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); };
  const { renderLoginGate } = await import("../src/client/components/loginGate.mjs");
  const { api } = await import("../src/client/api.mjs");
  const origAuth = api.auth, origDeviceStatus = api.deviceStatus, origBind = api.bind;
  const AUTHORIZED = { gates: { ghInstalled: true, ghLogin: true, credentialOk: true, ghVersion: "2.105.0" }, viewerLogin: "iasiv5", credential: { configured: true, source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: new Date().toISOString(), healthy: true, ghWrittenByUs: true, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "authorized", login: "iasiv5" } };
  const PENDING = { gates: { ghInstalled: true, ghLogin: true, credentialOk: false, ghVersion: null }, viewerLogin: "iasiv5", credential: { configured: false, source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenByUs: false, rateLimitedUntil: null }, install: { phase: "idle" }, device: { phase: "pending", userCode: "AB12-CD34", verificationUri: "https://github.com/login/device" } };
  api.auth = async () => AUTHORIZED;
  api.deviceStatus = async () => ({ phase: "authorized", login: "iasiv5" });
  api.bind = async () => ({ account: "iasiv5" });
  try {
    // ① 轮询发现 authorized → 依次转绿编排（150ms staged→终态+success-turn）→ 650ms 尾触发 onConnected（评审 R1-1 补实现）
    let connected = 0;
    const shadow = new FakeElement("shadow-root"); shadow.host = new FakeElement("div");
    renderLoginGate(shadow, { t, status: PENDING, onConnected: () => { connected++; } });
    const poll = timers.find((t) => t.ms === 4000);
    timers.splice(timers.indexOf(poll), 1);   // 摘除已触发 poll，防陈旧重放（评审 Q2 测试卫生）
    await poll.fn();
    const gate = byClass(shadow, "gate")[0];
    assert.equal(gate.classList.contains("success-turn"), false);   // staged 期间未定影
    const rows = byClass(shadow, "gateRow");
    assert.ok(rows[1].textContent.includes("等待你在 GitHub 确认授权"));   // staged（authorizing 真实中间态）g2 呈等待
    assert.ok(rows[2].textContent.includes("令牌有效"));   // 凭据已校验 → g3 先绿（deriveView 既有语义）
    const stage2 = timers.find((t) => t.ms === 150);
    assert.ok(stage2, "150ms staged 步进已挂");
    timers.splice(timers.indexOf(stage2), 1);
    await stage2.fn();   // 终态全绿 + success-turn 定影
    assert.ok(gate.classList.contains("success-turn"));   // 定影类在场
    assert.equal(connected, 0);   // 编排期间不触发
    const hold = timers.find((t) => t.ms === 650);
    assert.ok(hold, "650ms hold 已挂");
    await hold.fn();
    assert.equal(connected, 1);   // 编排尾触发

    // ② 卸载语义：isConnected=false → 编排步进与 hold 均不 onConnected
    let connected2 = 0;
    const shadow2 = new FakeElement("shadow-root"); shadow2.host = new FakeElement("div");
    renderLoginGate(shadow2, { t, status: PENDING, onConnected: () => { connected2++; } });
    const poll2 = timers.find((t) => t.ms === 4000);
    timers.splice(timers.indexOf(poll2), 1);
    await poll2.fn();
    shadow2.isConnected = false;   // 卸载
    const stage2b = timers.find((t) => t.ms === 150);
    await stage2b.fn();   // 步进守卫：!isConnected → return
    const hold2 = timers.find((t) => t.ms === 650);
    await hold2.fn();   // hold 守卫：!isConnected → 不 onConnected
    assert.equal(connected2, 0);

    // ③ reduced-motion → 瞬切（无 staged/hold、立即 onConnected）
    globalThis.matchMedia = () => ({ matches: true });
    let connected3 = 0;
    const shadow3 = new FakeElement("shadow-root"); shadow3.host = new FakeElement("div"); shadow3.mark = "S3";
    renderLoginGate(shadow3, { t, status: PENDING, onConnected: () => { connected3++; } });
    const poll3 = timers.find((t) => t.ms === 4000);
    timers.splice(timers.indexOf(poll3), 1);
    await poll3.fn();
    await new Promise((r) => realST(r, 0));   // success-turn 测试作用域内 realST=真实时钟（桩前捕获）
    assert.equal(connected3, 1);
    assert.equal(byClass(shadow3, "gate")[0].classList.contains("success-turn"), false);
  } finally {
    api.auth = origAuth; api.deviceStatus = origDeviceStatus; api.bind = origBind;
    delete globalThis.matchMedia;
    globalThis.setTimeout = realST; globalThis.clearTimeout = realCT;
  }
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

test("renderLoginGate：挂载即见残留 authorized（进程内残留）→ 不触发 onConnected（2026-11-20 一跳一跳缺陷防线）", async () => {
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = () => {};
  const { renderLoginGate } = await import("../src/client/components/loginGate.mjs");
  const { api } = await import("../src/client/api.mjs");
  const origAuth = api.auth;
  api.auth = async () => ({ ...READY, device: { phase: "authorized", login: "iasiv5" } });
  let connected = 0;
  try {
    const shadow = new FakeElement("shadow-root"); shadow.host = new FakeElement("div");
    renderLoginGate(shadow, { t, status: { ...READY, device: { phase: "authorized", login: "iasiv5" } }, onConnected: () => { connected++; } });
    for (let i = 0; i < 6; i++) await new Promise((r) => realSetTimeout(r, 0));
    assert.equal(connected, 0);   // 挂载即 authorized = 进程内残留态，不得自动续走（否则门禁↔reload 循环）
  } finally {
    api.auth = origAuth;
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

// ---- 开工会话（Work Session）Task 8：工作区选择器 ----

const candidateForPicker = () => ({ key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t" });

test("pickWorkspace：三选项渲染 + 本地默认 null + 取消 null + 托管 managed", async () => {
  const { pickWorkspace } = await import("../src/client/components/actions.mjs");
  const c = candidateForPicker();
  const shadow = new FakeElement("shadow-root");
  let pickCalls = 0;
  const p1 = pickWorkspace(shadow, { t, candidate: c, ui: { pickDirectory: async () => { pickCalls++; return "/picked"; } }, status: async () => ({ exists: true, isRepo: true, dirty: false, branch: "main" }) });
  const buttons = () => (shadow.children[0]?.children[0]?.children ?? []).filter((n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  const labels = buttons();
  assert.ok(labels.some((x) => x.includes(t("work.pickLocal"))));
  assert.ok(labels.some((x) => x.includes(t("work.pickBrowse"))));
  assert.ok(labels.some((x) => x.includes(t("work.pickManaged"))));
  assert.ok(labels.some((x) => x.includes(t("work.pickCancel"))));
  // 本地默认：立即 resolve null（服务端默认解析），对话框收起
  shadow.children[0].children[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("work.pickLocal"))).onclick();
  assert.equal(await p1, null);
  const shadow2 = new FakeElement("shadow-root");
  const p2 = pickWorkspace(shadow2, { t, candidate: c, ui: {}, status: async () => ({ exists: false }) });
  shadow2.children[0].children[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("work.pickCancel"))).onclick();
  assert.equal(await p2, null);
  const shadow3 = new FakeElement("shadow-root");
  const p3 = pickWorkspace(shadow3, { t, candidate: c, ui: {}, status: async () => ({ exists: false }) });
  shadow3.children[0].children[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("work.pickManaged"))).onclick();
  assert.equal(await p3, "managed");
});

test("pickWorkspace：选择目录 → 脏态警示行 + confirm 双分支", async () => {
  const { pickWorkspace } = await import("../src/client/components/actions.mjs");
  const c = candidateForPicker();
  const statusCalls = [];
  const status = async (cwd) => { statusCalls.push(cwd); return { exists: true, isRepo: true, dirty: true, branch: "dev" }; };
  // confirm(true) → resolve cwd
  const shadow = new FakeElement("shadow-root");
  const confirms = [];
  const p1 = pickWorkspace(shadow, { t, candidate: c, ui: { pickDirectory: async () => "/picked/dir" }, status, confirm: (msg) => { confirms.push(msg); return true; } });
  const btns = () => shadow.children[0].children[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON");
  btns().find((b) => b.textContent.includes(t("work.pickBrowse"))).onclick();
  await new Promise((r) => setTimeout(r, 10));   // 宏等待：pickDir 两次 await 后 setButtons（微任务计数跨环境不齐）
  assert.deepEqual(statusCalls, ["/picked/dir"]);
  btns().find((b) => b.textContent.includes(t("work.pickProceed"))).onclick();
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(confirms[0] && confirms[0].includes(t("work.dirtyHint")), "确认文案含脏态警示");
  assert.equal(await p1, "/picked/dir");
  // confirm(false) → resolve null
  const shadow2 = new FakeElement("shadow-root");
  const p2 = pickWorkspace(shadow2, { t, candidate: c, ui: { pickDirectory: async () => "/picked/dir" }, status, confirm: async () => false });
  const btns2 = () => shadow2.children[0].children[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON");
  btns2().find((b) => b.textContent.includes(t("work.pickBrowse"))).onclick();
  await new Promise((r) => setTimeout(r, 10));
  btns2().find((b) => b.textContent.includes(t("work.pickProceed"))).onclick();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(await p2, null);
});

// ---- 开工会话（Work Session）Task 12：renderSessionsView（合并/徽章/兜底/空态） ----

test("renderSessionsView：running 置顶 + 四类徽章 + 打开/另开动作 + 不在列表仅另开", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const items = [
    { kind: "work", key: "o/r#issue#1", sessionId: "dsh-l:work-a", runId: null, cwd: "/w/a", approvalPolicy: "never", createdAt: 1, updatedAt: 100, candidate: { repo: "o/r", number: 1, title: "T1", stage: "closed" } },
    { kind: "work", key: "o/r#issue#2", sessionId: "dsh-l:work-b", runId: null, cwd: "/w/b", approvalPolicy: null, createdAt: 1, updatedAt: 200, candidate: { repo: "o/r", number: 2, title: "T2", stage: "building" } },
    { kind: "work", key: "o/r#issue#3", sessionId: "dsh-l:work-missing", runId: null, cwd: "/w/c", approvalPolicy: null, createdAt: 1, updatedAt: 150, candidate: { repo: "o/r", number: 3, title: "T3", stage: "building" } },
    { kind: "run", key: "o/r#issue#4", sessionId: "dsh-l:run:x:1", runId: "run-1", cwd: null, approvalPolicy: null, createdAt: 1, updatedAt: 50, candidate: { repo: "o/r", number: 4, title: "T4", stage: "building" } },
  ];
  const summaries = [
    { id: "dsh-l:work-b", displayTitle: "[dsh-l] o/r#2 issue · T2", running: true },
    { id: "dsh-l:run:x:1", displayTitle: "x", running: false },
  ];   // work-a 与 work-missing 不在 ids → missing
  const root = new FakeElement("div");
  const opens = []; const anothers = [];
  renderSessionsView(root, { t, items, summaries, onOpen: (id) => opens.push(id), onAnother: (key, cwd) => anothers.push({ key, cwd }) });
  const text = root.textContent;
  assert.ok(text.includes(t("sessions.badgeWork")));
  assert.ok(text.includes(t("sessions.badgeRun")));
  assert.ok(text.includes(t("sessions.badgeAuto")));
  assert.ok(text.includes(t("sessions.badgeGone")));
  assert.ok(text.includes(t("sessions.badgeMissing")));
  assert.ok(text.includes(t("sessions.badgeRunning")));
  // 不在列表行：只留另开
  const missingRowBtns = root.children.filter((n) => n._rowId === "dsh-l:work-missing")[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  assert.ok(missingRowBtns.some((x) => x.includes(t("sessions.another"))), "missing 行有另开");
  assert.ok(!missingRowBtns.some((x) => x.includes(t("sessions.open"))), "missing 行无打开");
  root.children.filter((n) => n._rowId === "dsh-l:work-missing")[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.another"))).onclick();
  assert.deepEqual(anothers, [{ key: "o/r#issue#3", cwd: "/w/c" }]);
  // 打开：正常行
  const normalRow = root.children.filter((n) => n._rowId === "dsh-l:work-b")[0];
  normalRow.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.open"))).onclick();
  assert.deepEqual(opens, ["dsh-l:work-b"]);
});

test("renderSessionsView：兜底行（锚行反解/反解失败/run 孤儿仅打开）与空态", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const items = [];
  const summaries = [
    { id: "dsh-l:work-zz", displayTitle: "[dsh-l] x/y#7 PR · Some fix", running: false },
    { id: "dsh-l:work-q", displayTitle: "无锚行标题", running: false },
    { id: "dsh-l:run:r:1:1", displayTitle: "run 孤儿", running: false },
  ];
  const root = new FakeElement("div");
  const opens = [];
  renderSessionsView(root, { t, items, summaries, onOpen: (id) => opens.push(id), onAnother: () => {} });
  const text = root.textContent;
  assert.ok(text.includes("x/y#7 PR"), "锚行反解候选标识");
  assert.ok(text.includes("无锚行标题"), "反解失败只显标题");
  assert.ok(text.includes(t("sessions.badgeWork")));
  const runOrphanRow = root.children.filter((n) => n._rowId === "dsh-l:run:r:1:1")[0];
  const runBtns = runOrphanRow.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  assert.ok(runBtns.some((x) => x.includes(t("sessions.open"))));
  assert.ok(!runBtns.some((x) => x.includes(t("sessions.another"))), "run 孤儿无另开");
  runOrphanRow.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.open"))).onclick();
  assert.deepEqual(opens, ["dsh-l:run:r:1:1"]);
  // 空态
  const emptyRoot = new FakeElement("div");
  renderSessionsView(emptyRoot, { t, items: [], summaries: [], onOpen: () => {}, onAnother: () => {} });
  assert.ok(emptyRoot.textContent.includes(t("sessions.empty")));
});

test("renderSessionsView：确认交付按钮仅 building/verifying 工作行出现，点击回调 onDeliver", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const items = [
    { kind: "work", key: "o/r#issue#1", sessionId: "dsh-l:work-a", runId: null, cwd: "/w/a", approvalPolicy: null, createdAt: 1, updatedAt: 100, candidate: { repo: "o/r", number: 1, title: "T1", stage: "building" } },
    { kind: "work", key: "o/r#issue#2", sessionId: "dsh-l:work-b", runId: null, cwd: "/w/b", approvalPolicy: null, createdAt: 1, updatedAt: 90, candidate: { repo: "o/r", number: 2, title: "T2", stage: "triaged" } },
  ];
  const summaries = [{ id: "dsh-l:work-a", displayTitle: "[dsh-l] o/r#1 issue · T1", running: true }, { id: "dsh-l:work-b", displayTitle: "[dsh-l] o/r#2 issue · T2", running: false }];
  const root = new FakeElement("div");
  const delivers = [];
  renderSessionsView(root, { t, items, summaries, onOpen: () => {}, onAnother: () => {}, onDeliver: (key) => delivers.push(key) });
  const rowA = root.children.filter((n) => n._rowId === "dsh-l:work-a")[0];
  const rowB = root.children.filter((n) => n._rowId === "dsh-l:work-b")[0];
  const btnTexts = (row) => row.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  assert.ok(btnTexts(rowA).some((x) => x.includes(t("sessions.deliver"))), "building 行有确认交付");
  assert.ok(!btnTexts(rowB).some((x) => x.includes(t("sessions.deliver"))), "triaged 行无确认交付");
  rowA.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.deliver"))).onclick();
  assert.deepEqual(delivers, ["o/r#issue#1"]);
});

// ---- 开工会话（Work Session）评审 impl#O1/O2：missing 行交付语义钉例 + 交付失败就地反馈 ----

test("renderSessionsView：missing+building 行保留确认交付（候选级拍板语义，impl#O1 钉例）；交付失败行内呈现错误（impl#O2）", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const items = [
    { kind: "work", key: "o/r#issue#9", sessionId: "dsh-l:work-gone", runId: null, cwd: "/w/g", approvalPolicy: null, createdAt: 1, updatedAt: 100, candidate: { repo: "o/r", number: 9, title: "T9", stage: "building" } },
  ];
  const summaries = [{ id: "dsh-l:work-other", displayTitle: "[dsh-l] o/r#8 issue · T8", running: false }];   // 非空但不匹配 → missing（R1-11：空 summaries=feed 不可用不误标）
  const root = new FakeElement("div");
  const delivers = [];
  renderSessionsView(root, { t, items, summaries, onOpen: () => {}, onAnother: () => {}, onDeliver: (key) => { delivers.push(key); return "boom"; } });
  const row = root.children.filter((n) => n._rowId === "dsh-l:work-gone")[0];
  const btns = () => row.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  assert.ok(btns().some((x) => x.includes(t("sessions.another"))), "missing 行有另开");
  assert.ok(btns().some((x) => x.includes(t("sessions.deliver"))), "missing+building 仍有确认交付（候选级拍板，路由守卫护住）");
  const deliverBtn = row.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.deliver")));
  deliverBtn.onclick();
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(delivers, ["o/r#issue#9"]);
  assert.ok(row.textContent.includes("boom"), "交付失败错误就地呈现");
  // R1-11 退化语义钉例：summaries 空（feed 不可用）→ 不误标 missing、无另开（打开按钮因无 summary 也不出）
  const root2 = new FakeElement("div");
  renderSessionsView(root2, { t, items, summaries: [], onOpen: () => {}, onAnother: () => {}, onDeliver: () => null });
  const row2Btns = root2.children.filter((n) => n._rowId === "dsh-l:work-gone")[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  assert.ok(!row2Btns.some((x) => x.includes(t("sessions.another"))), "feed 不可用不误标 missing");
  assert.ok(root2.children.filter((n) => n._rowId === "dsh-l:work-gone")[0].children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").some((b) => b.textContent.includes(t("sessions.deliver"))), "交付不依赖 summaries");
});

// ---- 开工会话（Work Session）评审计划外建议②：gating+活跃行 → 只出「打开会话」，不再弹选择器后忽略 ----

test("rowActions：gating 且已有活跃 work 行 → 打开会话在、我来开不渲染（复用入口去重）", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [] });
  const detail = new FakeElement("div");
  const c = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", stage: "gating",
    gates: { G1: null, G2: null, G3: null }, taskPackage: null, work: { sessionId: "dsh-l:work-x", cwd: "/w", approvalPolicy: null, updatedAt: 1 },
    triage: null, labels: [], history: [], meta: {}, pull: null };
  hooks.rowActions(detail, c, { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
  const text = detail.textContent;
  assert.ok(text.includes(t("work.openBtn")), "打开会话在");
  assert.ok(!text.includes(t("work.startBtn")), "我来开不渲染（避免弹选择器后被复用快路径忽略）");
});

test("rowActions：gating 无活跃行 → 我来开在（fresh 正常入口不受影响）", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [] });
  const detail = new FakeElement("div");
  const c = { key: "o/r#issue#2", repo: "o/r", type: "issue", number: 2, title: "t", stage: "gating",
    gates: { G1: null, G2: null, G3: null }, taskPackage: null, work: null,
    triage: null, labels: [], history: [], meta: {}, pull: null };
  hooks.rowActions(detail, c, { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
  assert.ok(detail.textContent.includes(t("work.startBtn")), "fresh 我来开在");
});

// ---- 移动触控 UX（2026-11-22 计划）：Task 2/3/4 断言 ----

const mkCandidate = (stage, work = null, g1 = null) => ({
  key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t",
  stage, gates: { G1: g1, G2: null, G3: null }, taskPackage: null, work,
  triage: null, labels: [], history: [], meta: {}, pull: null,
});

const rowBtnTexts = (detail) => [...detail.children].filter((n) => String(n.tagName).toUpperCase() === "DIV" && n.className.includes("ux-narrow")).flatMap((n) => [...n.children[0].children].filter((x) => String(x.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent));

test("rowActions 状态映射：待拍板=我来开+G1对；活跃行=打开会话唯一；重试态=我来开", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [] });
  const view = { reload: async () => {}, shadow: new FakeElement("shadow") };
  // 待拍板 fresh
  let detail = new FakeElement("div");
  hooks.rowActions(detail, mkCandidate("gating"), { t, view, lang: "zh-CN" });
  let btns = rowBtnTexts(detail);
  assert.ok(btns.some((x) => x.includes(t("work.startBtn"))), "待拍板有我来开");
  assert.ok(btns.some((x) => x.includes("G1 ") && x.includes(t("actions.pass"))), "G1 放行在主动作行");
  assert.ok(btns.some((x) => x.includes(t("actions.reject"))), "G1 驳回不消失（R1-6③）");
  assert.ok(!btns.some((x) => x.includes(t("work.openBtn"))), "无活跃行无打开会话");
  // 有活跃行（任意 stage）→ 打开会话唯一
  detail = new FakeElement("div");
  hooks.rowActions(detail, mkCandidate("building", { sessionId: "dsh-l:work-x", cwd: "/w" }), { t, view, lang: "zh-CN" });
  btns = rowBtnTexts(detail);
  assert.ok(btns.some((x) => x.includes(t("work.openBtn"))), "活跃行有打开会话");
  assert.ok(!btns.some((x) => x.includes(t("work.startBtn"))), "活跃行无我来开（互斥）");
  // 重试态：building + G1 pass + 无活跃行 → 我来开
  detail = new FakeElement("div");
  hooks.rowActions(detail, mkCandidate("building", null, { decision: "pass", note: "", via: "workbench-ui", at: "t" }), { t, view, lang: "zh-CN" });
  btns = rowBtnTexts(detail);
  assert.ok(btns.some((x) => x.includes(t("work.startBtn"))), "重试态有我来开");
});

test("rowActions 开工路径映射（disc Task 1）：白名单源阶段首位=移到 待拍板；building/gating 不含", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [] });
  const view = { reload: async () => {}, shadow: new FakeElement("shadow") };
  const firstBtn = (stage) => {
    const d = new FakeElement("div");
    hooks.rowActions(d, mkCandidate(stage), { t, view, lang: "zh-CN" });
    const narrow = [...d.children].find((n) => n.className.includes("ux-narrow"));
    const primary = [...narrow.children].find((n) => n.className.includes("primary-actions"));
    const btns = [...primary.children].filter((x) => String(x.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
    return { first: btns[0] ?? null, hasMove: btns.some((x) => x.includes(t("groups.gating")) && x.includes(t("actions.moveTo"))) };
  };
  for (const st of ["inbox", "triaged", "held", "closed", "shipped"]) {
    const r = firstBtn(st);
    assert.equal(r.first, t("actions.moveTo") + " " + t("groups.gating"), st + " 首位应为移到 待拍板");
  }
  const rb = firstBtn("building");
  assert.equal(rb.hasMove, false, "building 不含移到 待拍板（disc#1）");
  const rg = firstBtn("gating");
  assert.equal(rg.hasMove, false, "gating 不含移到 待拍板（我来开已是主动作）");
});

test("rowActions 窄视口结构：details 折叠人工推翻 + stage-chips 组", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [] });
  const detail = new FakeElement("div");
  hooks.rowActions(detail, mkCandidate("gating"), { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
  const narrow = [...detail.children].find((n) => n.className.includes("ux-narrow"));
  assert.ok(narrow, "ux-narrow 容器在");
  const detailsEl = [...narrow.children].find((n) => String(n.tagName).toUpperCase() === "DETAILS");
  assert.ok(detailsEl, "人工推翻收进 details");
  const sum = detailsEl.children.find((n) => String(n.tagName).toUpperCase() === "SUMMARY");
  assert.ok(sum && sum.textContent.includes(t("actions.overrideGroup")), "summary 为折叠摘要键");
  const chips = [...narrow.children].find((n) => n.className.includes("stage-chips"));
  assert.equal(chips.children.filter((x) => String(x.tagName).toUpperCase() === "BUTTON").length, 4, "阶段迁移 4 chips");
});

test("样式表触控层断言：:active 反馈 + 44px + 16px 表单 + :host 滚动修复（P0）", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/client/components/workbench.mjs", import.meta.url), "utf8");
  const a = src.indexOf("const CSS = [");
  const b = src.indexOf("].join(", a);
  const joined = eval(src.slice(src.indexOf("[", a), b) + "]");
  const j = joined.join("\n");
  assert.ok(j.includes("button:active:not(:disabled){opacity:.72}"), ":active 触压反馈");
  assert.ok(j.includes("min-height:44px"), "44px 触控下限");
  assert.ok(j.includes("font-size:16px"), "iOS 表单 16px");
  assert.ok(j.includes("touch-action:manipulation"), "防双击缩放");
  assert.ok(j.includes(":host{overflow-y:auto !important}"), "P0 滚动修复（含 !important——React 内联 overflow:hidden 压制级联）");
});

test("header 单字态：三按钮 data-short 单字态 + aria-label 全文（Task 2）", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [] });
  const header = new FakeElement("header");
  hooks.header(header, { t, state: { settings: { intervalMinutes: 0 } }, view: { reload: async () => {}, shadow: new FakeElement("shadow") } });
  const btns = [...header.children].filter((n) => String(n.tagName).toUpperCase() === "BUTTON");
  const setBtn = btns.find((b) => (b.getAttribute("aria-label") || "").includes(t("settings.title")));
  assert.ok(setBtn, "设置按钮有 aria-label 全文");
  assert.equal(setBtn.dataset.short, t("settings.title").slice(0, 1), "设置按钮 data-short 单字（窄视口 ::after 用）");
  const fs = await import("node:fs");
  const wb = fs.readFileSync(new URL("../src/client/components/workbench.mjs", import.meta.url), "utf8");
  assert.ok((wb.match(/dataset\.short/g) || []).length >= 2, "刷新/退出已带 data-short（workbench 侧静态断言）");
});

test("candidateRow：chevron 随展开切换 + region/labelledby + 行高亮类", async () => {
  const { renderRow } = await import("../src/client/components/candidateRow.mjs");
  const c = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", triage: { reason: "r", urgency: "P1", validity: "high", action: "start" } };
  const root = new FakeElement("div");
  const row = renderRow(root, c, t, { expanded: false, onToggle: () => {} });
  assert.equal(row.className.includes("rowActive"), false, "收起态无高亮类");
  const chev1 = row.children.find((n) => n.className === "ux-chev");
  assert.ok(chev1 && chev1.textContent === "▸", "收起 chevron ▸");
  const root2 = new FakeElement("div");
  renderRow(root2, c, t, { expanded: true, onToggle: () => {} });
  const row2 = root2.children[0];
  assert.ok(row2.className.includes("rowActive"), "展开态高亮类");
  assert.equal(row2.children.find((n) => n.className === "ux-chev").textContent, "▾", "展开 chevron ▾");
  const detail = root2.children.find((n) => n.className === "detail");
  assert.equal(detail.getAttribute("role"), "region", "detail role=region");
  assert.equal(detail.getAttribute("aria-labelledby"), row2.children.find((n) => String(n.tagName).toUpperCase() === "BUTTON").id, "labelledby 指向行标题");
});

test("rolesTab 对话框归位 Shadow DOM：新增角色弹层挂 container、canvas 语义底色（P0-5a）", async () => {
  const { renderRolesTab } = await import("../src/client/components/rolesTab.mjs");
  const container = new FakeElement("div");
  renderRolesTab(container, { t, workflow: { templates: [] }, view: { reload: async () => {} } });
  const newBtn = find(container, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("roles.new"))[0];
  assert.ok(newBtn, "新增角色按钮在场");
  newBtn.onclick();
  const overlay = byClass(container, "rtOverlay")[0];
  assert.ok(overlay, "对话框挂载于 container 子树（Shadow DOM 内，不落 document.body）");
  assert.ok(String(overlay.style.cssText).includes("position:fixed"), "遮罩保持 fixed 定位");
  const box = overlay.children[0];
  assert.ok(box && String(box.style.cssText).includes("background:canvas"), "卡底色走 canvas 语义 token（无浅色硬编码兜底）");
});

test("设置面板文案全部走 i18n（P0-5b）：actions.mjs 无硬编码中文回潮 + 双字典四键齐备", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/client/components/actions.mjs", import.meta.url), "utf8");
  for (const literal of ["并发上限（1–4）", "默认模型：", "（加载中）", "（宿主未配置）"]) {
    assert.ok(!src.includes(literal), "硬编码字面量应删除: " + literal);
  }
  const { zhCN } = await import("../src/client/locale/zh-CN.mjs");
  const { en } = await import("../src/client/locale/en.mjs");
  const flat = (d, p = "") => Object.entries(d).flatMap(([k, v]) => (typeof v === "string" ? [p + k] : flat(v, p + k + ".")));
  const zhKeys = flat(zhCN); const enKeys = flat(en);
  for (const key of ["settings.concurrency", "settings.hostDefault", "settings.hostDefaultLoading", "settings.hostDefaultNone"]) {
    assert.ok(zhKeys.includes(key) && enKeys.includes(key), "双字典缺键: " + key);
  }
});

test("candidateRow：六态状态点 + 元数据脚注（P0-2/P0-6）", async () => {
  const { renderRow } = await import("../src/client/components/candidateRow.mjs");
  const mk = (over = {}) => ({ key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", stage: "triaged", triage: { urgency: "P1", validity: "high", action: "start", reason: "r" }, ...over });
  const dotOf = (root) => find(root, (n) => typeof n.className === "string" && String(n.className).includes("stdot"))[0];
  const root1 = new FakeElement("div");
  renderRow(root1, mk(), t, { expanded: false, onToggle: () => {}, run: { status: "failed" }, seen: true });
  const dot1 = dotOf(root1);
  assert.ok(dot1 && String(dot1.className).includes("st-failed"), "failed run → st-failed");
  assert.equal(dot1.title, t("stateDot.failed"));
  const root2 = new FakeElement("div");
  renderRow(root2, mk({ stage: "building" }), t, { expanded: false, onToggle: () => {}, run: { status: "succeeded" }, seen: false });
  assert.ok(String(dotOf(root2).className).includes("st-unread"), "终态未读 → st-unread");
  const root3 = new FakeElement("div");
  renderRow(root3, mk({ meta: { ageDays: 3, comments: 4, reactionsTotal: 2 } }), t, { expanded: false, onToggle: () => {}, run: null, seen: false });
  const meta3 = find(root3, (n) => n.className === "rowmeta")[0];
  assert.ok(meta3, "脚注在场");
  assert.ok(meta3.textContent.includes("3d") && meta3.textContent.includes("💬4") && meta3.textContent.includes("▲2"), "脚注含年龄/评论/反应");
  const root4 = new FakeElement("div");
  renderRow(root4, mk({ type: "pull", pull: { draft: true, headRef: "x" }, meta: { ageDays: 1 } }), t, { expanded: false, onToggle: () => {} });
  assert.ok(find(root4, (n) => n.className === "rowmeta")[0].textContent.includes(t("candidate.draft")), "PR 草稿段");
  const root5 = new FakeElement("div");
  renderRow(root5, mk(), t, { expanded: false, onToggle: () => {} });
  assert.equal(find(root5, (n) => n.className === "rowmeta").length, 0, "无 meta 不渲染脚注");
  const root6 = new FakeElement("div");
  renderRow(root6, mk({ stage: "shipped" }), t, { expanded: false, onToggle: () => {} });
  assert.ok(String(dotOf(root6).className).includes("st-gating"), "shipped 未确认发版 → st-gating");
  const root7 = new FakeElement("div");
  renderRow(root7, mk({ stage: "building" }), t, { expanded: false, onToggle: () => {}, run: { status: "succeeded" }, seen: true });
  assert.ok(!String(dotOf(root7).className).includes("st-unread"), "seen:true 后非 unread（rev-impl S1 断言补全）");
});

test("kanban 分组列表化：列头/卡片信息集/推进/移至/空列引导（P0-1）", async () => {
  const { renderKanban } = await import("../src/client/components/kanban.mjs");
  const calls = [];
  const stageStub = async (...args) => { calls.push(args); return {}; };
  const c1 = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "T1", stage: "inbox", meta: { ageDays: 3, comments: 4, reactionsTotal: 2 }, triage: { urgency: "P1", validity: "high", action: "start" } };
  const c2 = { key: "o/r#pull#2", repo: "o/r", type: "pull", number: 2, title: "T2", stage: "building", currentRunId: "run-1" };
  const c3 = { key: "o/r#issue#3", repo: "o/r", type: "issue", number: 3, title: "T3", stage: "held" };
  const wrap = new FakeElement("div");
  renderKanban(wrap, { t, candidates: [c1, c2, c3], view: { reload: async () => {} }, deps: { api: { stage: stageStub } } });
  const heads = find(wrap, (n) => n.className === "kbhead");
  assert.equal(heads.length, 6, "六列列头");
  assert.ok(heads[0].textContent.includes(t("groups.inbox")) && heads[0].textContent.includes("1"), "列头=列名+计数");
  assert.ok(find(wrap, (n) => typeof n.className === "string" && String(n.className).includes("kbdot")).length >= 6, "列色点在场");
  const cards = find(wrap, (n) => n.className === "kbcard");
  assert.equal(cards.length, 3, "三张卡");
  assert.ok(cards[0].textContent.includes("o/r#1"), "卡标题含 repo#number");
  assert.ok(find(wrap, (n) => n.className === "rowmeta").length >= 1, "卡脚注复用 metaFootnote");
  assert.ok(find(cards[0], (n) => String(n.className).includes("chip u-P1")).length >= 1, "紧急度 chip 在场");
  assert.ok(find(cards[1], (n) => String(n.className).includes("st-running")).length >= 1, "building 卡状态点 running");
  const advance = find(wrap, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("kanban.advance"));
  assert.equal(advance.length, 1, "推进按钮只出现在有下一跳的卡（inbox）");
  advance[0].onclick();
  assert.deepEqual(calls[0], ["o/r#issue#1", "triaged", "看板推进"], "推进调用 stage(key, triaged, 留痕)");
  const moves = find(wrap, (n) => n.className === "kbmove");
  assert.equal(moves.length, 2, "movable 卡才有移至菜单（inbox+held；building 不可迁移）");
  const inboxMenuBtns = find(moves[0], (n) => String(n.tagName).toUpperCase() === "BUTTON").map((b) => b.textContent);
  assert.ok(inboxMenuBtns.some((x) => x.includes(t("groups.gating"))), "菜单含待拍板");
  assert.ok(inboxMenuBtns.every((x) => !x.includes(t("groups.inbox"))), "菜单不含当前列");
  assert.equal(find(cards[1], (n) => String(n.tagName).toUpperCase() === "BUTTON").length, 0, "building 卡无任何迁移按钮");
  const empties = find(wrap, (n) => n.className === "kbempty");
  assert.ok(empties.length >= 1 && empties[0].textContent.includes(t("emptyStates.kanbanCol")), "空列引导文案");
});

test("sessionsView：行首六态状态点（P0-2b；DOM 断言住 client-render——sessions-view.test 无 document 桩）", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const items = [
    { kind: "work", key: "o/r#issue#1", sessionId: "dsh-l:work-a", runId: null, cwd: "/w/a", approvalPolicy: null, createdAt: 1, updatedAt: 100, candidate: { repo: "o/r", number: 1, title: "T1", stage: "gating" } },
    { kind: "work", key: "o/r#issue#2", sessionId: "dsh-l:work-b", runId: null, cwd: "/w/b", approvalPolicy: null, createdAt: 1, updatedAt: 200, candidate: { repo: "o/r", number: 2, title: "T2", stage: "building" } },
    { kind: "work", key: "o/r#issue#3", sessionId: "dsh-l:work-c", runId: null, cwd: "/w/c", approvalPolicy: null, createdAt: 1, updatedAt: 150, candidate: { repo: "o/r", number: 3, title: "T3", stage: "shipped" } },
    { kind: "work", key: "o/r#issue#4", sessionId: "dsh-l:work-d", runId: null, cwd: "/w/d", approvalPolicy: null, createdAt: 1, updatedAt: 120, candidate: { repo: "o/r", number: 4, title: "T4", stage: "triaged" } },
    { kind: "run", key: "o/r#issue#5", sessionId: "dsh-l:run:x:1", runId: "run-1", cwd: null, approvalPolicy: null, createdAt: 1, updatedAt: 50, candidate: { repo: "o/r", number: 5, title: "T5", stage: "building" } },
  ];
  const summaries = [
    { id: "dsh-l:work-b", displayTitle: "b", running: true },
    { id: "dsh-l:work-a", displayTitle: "a", running: false },
    { id: "dsh-l:work-c", displayTitle: "c", running: false },
    { id: "dsh-l:work-d", displayTitle: "d", running: false },
    { id: "dsh-l:run:x:1", displayTitle: "x", running: false },
  ];
  const root = new FakeElement("div");
  renderSessionsView(root, { t, items, summaries, onOpen: () => {}, onAnother: () => {}, onDeliver: null });
  const rows = root.children.filter((n) => n._rowId);
  const dotOf = (id) => { const row = rows.find((r) => r._rowId === id); return row?.children.find((n) => typeof n.className === "string" && String(n.className).includes("stdot")); };
  assert.ok(String(dotOf("dsh-l:work-a").className).includes("st-gating"), "gating → st-gating");
  assert.ok(String(dotOf("dsh-l:work-b").className).includes("st-running"), "building+running → st-running");
  assert.ok(String(dotOf("dsh-l:work-c").className).includes("st-done"), "shipped → st-done");
  assert.ok(String(dotOf("dsh-l:work-d").className).includes("st-idle"), "triaged → st-idle");
  assert.ok(String(dotOf("dsh-l:run:x:1").className).includes("st-running"), "run 行 building → st-running");
});

test("review 待我确认卡片增强：人话标题/三行解释/备注传参/动词化按钮（P0-3）", async () => {
  const { renderReview } = await import("../src/client/components/review.mjs");
  const { LOOP_V1 } = await import("../src/workflows/builtin.mjs");
  const calls = [];
  const gateStub = {
    runGate: async (...args) => { calls.push(["runGate", ...args]); return {}; },
    releaseConfirm: async () => {},
    runCancel: async () => {},
  };
  const tpl = { id: "loop-v1", name: "Loop v1", nodes: LOOP_V1.nodes.map(({ id, name, type }) => ({ id, name, type })) };
  const cand = { key: "iasiv5/dsh-m#pull#12", repo: "iasiv5/dsh-m", type: "pull", number: 12, title: "修复发布脚本", stage: "building", currentRunId: "run-1" };
  const run = { id: "run-1", candidateKey: "iasiv5/dsh-m#pull#12", status: "waiting", waitingGate: "g2", waitingGateId: "G2", currentNodeIds: ["g2"], failedNodeIds: [], cancelledNodeIds: [], templateId: "loop-v1", error: null };
  const wrap = new FakeElement("div");
  renderReview(wrap, { t, candidates: [cand], runs: [run], view: { reload: async () => {} }, templates: [tpl], deps: { api: gateStub } });
  const card = find(wrap, (n) => n.className === "rvcard")[0];
  assert.ok(card, "gate 卡在场");
  assert.ok(card.textContent.includes("iasiv5/dsh-m#12") && card.textContent.includes("修复发布脚本"), "人话标题（prettyKey+title）");
  assert.ok(!card.textContent.includes("#pull#"), "标题不含原键形态");
  assert.ok(card.textContent.includes(t("gates.G2")), "解释含闸门名");
  assert.ok(card.textContent.includes("build") && card.textContent.includes("verify"), "解释含上游节点名（逗号连接）");
  assert.ok(card.textContent.includes("发起 MR"), "解释含后续节点名（箭头连接）");
  assert.ok(card.textContent.includes(t("review.gateRejectGeneric")), "驳回后果行在场");
  const note = find(card, (n) => n.className === "rvnote")[0];
  assert.ok(note && note.attrs.placeholder === t("review.notePlaceholder"), "备注输入框在场（桩无 placeholder getter，读 attrs）");
  note.value = "已核对 diff";
  const passBtn = find(card, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.includes(t("review.passBtn")))[0];
  assert.ok(passBtn, "动词化放行按钮");
  passBtn.onclick();
  assert.deepEqual(calls[0], ["runGate", "run-1", "g2", "pass", "已核对 diff"], "放行带备注留痕");
  const rejectBtn = find(card, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.includes(t("review.rejectBtn")))[0];
  rejectBtn.onclick();
  assert.deepEqual(calls[1], ["runGate", "run-1", "g2", "reject", "已核对 diff"], "驳回带备注留痕");
});

test("review 模板未命中走 gateWaitGeneric 兜底；G3 卡人话标题+备注传参（P0-3）", async () => {
  const { renderReview } = await import("../src/client/components/review.mjs");
  const calls = [];
  const gateStub = { runGate: async () => {}, releaseConfirm: async (...args) => { calls.push(args); return {}; } };
  const cand = { key: "iasiv5/dsh-l#issue#7", repo: "iasiv5/dsh-l", type: "issue", number: 7, title: "发布 0.2.0", stage: "shipped" };
  const run = { id: "run-9", candidateKey: "iasiv5/dsh-l#issue#7", status: "waiting", waitingGate: "g2", waitingGateId: "G2", currentNodeIds: ["g2"], failedNodeIds: [], cancelledNodeIds: [], templateId: "unknown-tpl", error: null };
  const wrap = new FakeElement("div");
  renderReview(wrap, { t, candidates: [{ ...cand, stage: "building", currentRunId: "run-9" }], runs: [run], view: { reload: async () => {} }, templates: [], deps: { api: gateStub } });
  const gCard = find(wrap, (n) => n.className === "rvcard")[0];
  assert.ok(gCard.textContent.includes(t("gates.G2")) && !gCard.textContent.includes("build"), "无模板 → 无上游名（generic 行）");
  const wrap2 = new FakeElement("div");
  renderReview(wrap2, { t, candidates: [cand], runs: [], view: { reload: async () => {} }, templates: [], deps: { api: gateStub } });
  const card = find(wrap2, (n) => n.className === "rvcard")[0];
  assert.ok(card.textContent.includes("iasiv5/dsh-l#7"), "G3 卡人话标题");
  const note = find(card, (n) => n.className === "rvnote")[0];
  note.value = "npm 已发";
  find(card, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.includes(t("review.confirm")))[0].onclick();
  assert.deepEqual(calls[0], ["iasiv5/dsh-l#issue#7", "npm 已发"], "确认发版带备注");
});

test("workbench 清单双空态：过滤空给清除过滤按钮，真空给 backlog 文案（P0-4）", async () => {
  const { mountWorkbench } = await import("../src/client/components/workbench.mjs");
  const cand = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", stage: "inbox", triage: null };
  const mkStub = (candidates) => ({
    state: async () => ({ auth: { account: "iasiv5", login: "iasiv5", credential: { configured: true, healthy: true, verifiedAt: null, rateLimitedUntil: null } }, watch: { repos: ["o/r"] }, snapshots: { lastIngestAt: null, perRepo: {} }, settings: { intervalMinutes: 0 }, candidates, runs: [], workflow: { templates: [] }, ingestLog: [] }),
    auth: async () => ({ gates: { ghInstalled: true, ghLogin: true, credentialOk: true }, viewerLogin: "iasiv5", credential: { configured: true, healthy: true, verifiedAt: null, rateLimitedUntil: null } }),
    workSessions: async () => ({ items: [] }),
    refresh: async () => ({ authenticated: true }),
  });
  const settle = () => new Promise((r) => setTimeout(r, 5));
  const mkShadow = () => { const s = new FakeElement("shadow"); s.host = new FakeElement("host"); return s; };   // paint 写 shadow.host.dataset 指纹
  // 过滤空：urgency=P0 而候选无 triage
  const shadow1 = mkShadow();
  const view1 = mountWorkbench(shadow1, { getLang: () => "zh-CN", build: "t", deps: { api: mkStub([cand]) } });
  await settle();
  assert.equal(find(shadow1, (n) => n.className === "empty").length, 0, "默认过滤下无空态");
  const urgencySel = find(shadow1, (n) => String(n.tagName).toUpperCase() === "SELECT" && n.getAttribute("aria-label") === t("filters.urgency"))[0];
  urgencySel.value = "P0";
  urgencySel.onchange();
  await settle();
  const empties = find(shadow1, (n) => n.className === "empty");
  assert.ok(empties.length === 1 && empties[0].textContent.includes(t("emptyStates.filtered")), "过滤空文案");
  const clearBtn = find(empties[0], (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("emptyStates.clearFilters"))[0];
  assert.ok(clearBtn, "清除过滤按钮在场");
  clearBtn.onclick();
  await settle();
  assert.equal(find(shadow1, (n) => n.className === "empty").length, 0, "清除过滤后空态消失");
  // 真空：无任何候选
  const shadow2 = mkShadow();
  mountWorkbench(shadow2, { getLang: () => "zh-CN", build: "t", deps: { api: mkStub([]) } });
  await settle();
  const empties2 = find(shadow2, (n) => n.className === "empty");
  assert.ok(empties2.length === 1 && empties2[0].textContent.includes(t("emptyStates.backlog")), "真空态 backlog 文案");
  assert.ok(!empties2[0].textContent.includes(t("emptyStates.filtered")), "真空态不出现过滤空文案");
});

test("rowActions 吞错就地呈现：stage 失败写 errLine 且不被重绘抹除，成功清除（P0-5c/rev-impl B1）", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  let fail = true;
  let reloads = 0;
  const hooks = installActions({
    getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [],
    deps: { api: { stage: async () => { if (fail) throw new Error("boom"); return {}; } } },
  });
  const view = { reload: async () => { reloads++; }, shadow: new FakeElement("shadow") };
  const d = new FakeElement("div");
  hooks.rowActions(d, mkCandidate("triaged"), { t, view, lang: "zh-CN" });
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const errLine = () => find(d, (n) => n.className === "rowerr")[0];
  assert.ok(errLine(), "errLine 就位（detail 顶部）");
  assert.equal(errLine().style.display, "none", "初始不可见");
  const narrow = [...d.children].find((n) => n.className.includes("ux-narrow"));
  const chipsRow = [...narrow.children].find((n) => n.className.includes("stage-chips"));
  const moveBtn = [...chipsRow.children].find((b) => b.textContent.includes(t("groups.gating")));
  moveBtn.onclick();
  await settle();
  assert.equal(errLine().style.display, "block", "失败后可见");
  assert.ok(errLine().textContent.includes(t("errors.actionFailed")) && errLine().textContent.includes("boom"), "错误文案=操作失败+消息");
  assert.equal(reloads, 0, "失败不触发重绘（重绘会立即抹掉错误行，rev-impl B1）");
  fail = false;
  moveBtn.onclick();
  await settle();
  assert.equal(errLine().style.display, "none", "成功后清除");
  assert.equal(reloads, 1, "成功路径仍走 reload 刷新");
});

test("review/kanban 吞错就地呈现：rverr 与 kberr（P0-5c/rev-impl B1）", async () => {
  const { renderReview } = await import("../src/client/components/review.mjs");
  const { renderKanban } = await import("../src/client/components/kanban.mjs");
  let fail = true;
  let reviewReloads = 0;
  const gateStub = { runGate: async () => { if (fail) throw new Error("boom"); }, releaseConfirm: async () => {}, runCancel: async () => {} };
  const cand = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", stage: "building", currentRunId: "run-1" };
  const run = { id: "run-1", candidateKey: "o/r#issue#1", status: "waiting", waitingGate: "g2", waitingGateId: "G2", currentNodeIds: ["g2"], failedNodeIds: [], cancelledNodeIds: [], templateId: null, error: null };
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const wrap = new FakeElement("div");
  renderReview(wrap, { t, candidates: [cand], runs: [run], view: { reload: async () => { reviewReloads++; } }, templates: [], deps: { api: gateStub } });
  const card = find(wrap, (n) => n.className === "rvcard")[0];
  const errEls = () => find(card, (n) => n.className === "rverr");
  const passBtn = find(card, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.includes(t("review.passBtn")))[0];
  passBtn.onclick();
  await settle();
  const shown = errEls().find((n) => n.style.display === "block");
  assert.ok(shown && shown.textContent.includes(t("errors.actionFailed")), "runGate 失败写卡片 rverr");
  assert.equal(reviewReloads, 0, "失败不触发重绘（rev-impl B1）");
  fail = false;
  passBtn.onclick();
  await settle();
  assert.ok(!errEls().some((n) => n.style.display === "block"), "成功后清除");
  assert.equal(reviewReloads, 1, "成功路径仍走 reload 刷新");
  // kanban：stage 失败 → 卡内 kberr chip；成功移除
  let kfail = true;
  const kwrap = new FakeElement("div");
  renderKanban(kwrap, { t, candidates: [{ key: "o/r#issue#2", repo: "o/r", type: "issue", number: 2, title: "T", stage: "inbox", triage: null }], view: { reload: async () => {} }, deps: { api: { stage: async () => { if (kfail) throw new Error("boom"); return {}; } } } });
  const kcard = find(kwrap, (n) => n.className === "kbcard")[0];
  const adv = find(kcard, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("kanban.advance"))[0];
  adv.onclick();
  await settle();
  const kberr = find(kcard, (n) => n.className === "kberr")[0];
  assert.ok(kberr && kberr.textContent.includes(t("errors.actionFailed")), "stage 失败写 kberr");
  kfail = false;
  adv.onclick();
  await settle();
  assert.equal(find(kcard, (n) => n.className === "kberr").length, 0, "成功后移除 kberr");
});

test("review 等待时长行 + 最久优先排序（P1 小债 D）", async () => {
  const { renderReview } = await import("../src/client/components/review.mjs");
  const NOW = Date.parse("2026-01-01T02:00:00Z");
  const mk = (id, since) => ({ id, candidateKey: "o/r#issue#1", status: "waiting", waitingGate: "g2", waitingGateId: "G2", currentNodeIds: ["g2"], failedNodeIds: [], cancelledNodeIds: [], templateId: null, error: null, waitingSince: since });
  const cand = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", stage: "building", currentRunId: "run-b" };
  const runs = [mk("run-b", "2026-01-01T01:30:00Z"), mk("run-a", "2026-01-01T00:30:00Z")];   // run-a 等更久（1.5h → 2h）
  const wrap = new FakeElement("div");
  renderReview(wrap, { t, candidates: [cand], runs, view: { reload: async () => {} }, templates: [], deps: { api: {} }, nowMs: NOW });
  const cards = find(wrap, (n) => n.className === "rvcard");
  assert.equal(cards.length, 2);
  assert.ok(cards[0].textContent.includes(t("review.waited").replace("{d}", "2h")), "最久等待卡在前（已等待 2h）");
  assert.ok(cards[1].textContent.includes(t("review.waited").replace("{d}", "30m")), "次卡已等待 30m");
});

test("bar 批量分诊吞错就地呈现（P1 小债 A）", async () => {
  const { installActions } = await import("../src/client/components/actions.mjs");
  let fail = true;
  let reloads = 0;
  const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [], deps: { api: { triage: async () => { if (fail) throw new Error("boom"); return {}; } } } });
  const bar = new FakeElement("div");
  hooks.bar(bar, { t, state: { candidates: [{ key: "o/r#issue#1", stage: "inbox", type: "issue", repo: "o/r", triage: null }] }, filters: { type: "all", repo: "all", urgency: "all" }, view: { reload: async () => { reloads++; } } });
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const errLine = () => find(bar, (n) => n.className === "rowerr")[0];
  const batchBtn = find(bar, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.includes(t("actions.triageBatch")))[0];
  batchBtn.onclick();
  await settle();
  assert.ok(errLine().style.display === "block" && errLine().textContent.includes("boom"), "失败就地呈现");
  assert.equal(reloads, 0, "失败不 reload");
  fail = false;
  batchBtn.onclick();
  await settle();
  assert.equal(errLine().style.display, "none", "成功清除");
  assert.equal(reloads, 1, "成功 reload");
});

test("sessionsView 交付失败 chip 语义色统一（P1 小债 B）", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const items = [{ kind: "work", key: "o/r#issue#1", sessionId: "dsh-l:work-a", runId: null, cwd: "/w", approvalPolicy: null, createdAt: 1, updatedAt: 100, candidate: { repo: "o/r", number: 1, title: "T", stage: "building" } }];
  const summaries = [{ id: "dsh-l:work-a", displayTitle: "a", running: false }];
  const root = new FakeElement("div");
  renderSessionsView(root, { t, items, summaries, onOpen: () => {}, onAnother: () => {}, onDeliver: async () => "boom" });
  const row = root.children.find((n) => n._rowId === "dsh-l:work-a");
  const deliverBtn = row.children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.deliver")));
  deliverBtn.onclick();
  await new Promise((r) => setTimeout(r, 0));
  const errChip = row.children.find((n) => n.className === "chip" && String(n.style.color).includes("color-mix"));
  assert.ok(errChip && errChip.textContent === "boom", "交付失败 chip 就地呈现且走 color-mix 语义色");
});

test("过滤升级：type 计数 chips + stage 下拉 + strip 点击联动 + 清除含 stage（P1-3/P1-6/S4）", async () => {
  const { mountWorkbench } = await import("../src/client/components/workbench.mjs");
  const { installActions } = await import("../src/client/components/actions.mjs");
  const c1 = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t1", stage: "inbox", triage: null };
  const c2 = { key: "o/r#pull#2", repo: "o/r", type: "pull", number: 2, title: "t2", stage: "triaged", triage: null };
  const mkStub = (candidates) => ({
    state: async () => ({ auth: { account: "iasiv5", login: "iasiv5", credential: { configured: true, healthy: true, verifiedAt: null, rateLimitedUntil: null } }, watch: { repos: ["o/r"] }, snapshots: { lastIngestAt: null, perRepo: {} }, settings: { intervalMinutes: 0 }, candidates, runs: [], workflow: { templates: [{ id: "loop-v1", name: "Loop v1", nodes: [{ id: "g1", name: "G1", type: "gate" }, { id: "build", name: "build", type: "agent" }] }] }, ingestLog: [] }),
    auth: async () => ({ gates: { ghInstalled: true, ghLogin: true, credentialOk: true }, viewerLogin: "iasiv5", credential: { configured: true, healthy: true, verifiedAt: null, rateLimitedUntil: null } }),
    workSessions: async () => ({ items: [] }),
    refresh: async () => ({ authenticated: true }),
  });
  const settle = () => new Promise((r) => setTimeout(r, 5));
  const mkShadow = () => { const s = new FakeElement("shadow"); s.host = new FakeElement("host"); return s; };
  const shadow = mkShadow();
  const apiStub = mkStub([c1, c2]);
  mountWorkbench(shadow, { getLang: () => "zh-CN", build: "t", deps: { api: apiStub }, extend: installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [], deps: { api: apiStub } }) });   // strip/bar 钩子经 extend 渲染
  await settle();
  const rows = () => find(shadow, (n) => n.className === "row");
  // type 计数 chips
  const chips = find(shadow, (n) => typeof n.className === "string" && String(n.className).includes("typechip"));
  assert.equal(chips.length, 3, "三枚 type chips");
  assert.ok(chips[0].textContent.includes("2") && chips[1].textContent.includes("1") && chips[2].textContent.includes("1"), "计数正确");
  chips[2].onclick();
  await settle();
  assert.equal(rows().length, 1, "PR chip 过滤后只剩 1 行");
  chips[0].onclick();
  await settle();
  assert.equal(rows().length, 2, "全部 chip 复位");
  // stage 下拉
  const stageSel = find(shadow, (n) => String(n.tagName).toUpperCase() === "SELECT" && n.getAttribute("aria-label") === t("filters.stage"))[0];
  assert.ok(stageSel, "stage 下拉在场");
  stageSel.value = "triaged";
  stageSel.onchange();
  await settle();
  assert.equal(rows().length, 1, "stage=triaged 剩 1 行");
  // 清除过滤纳入 stage（S4）
  const urgencySel = find(shadow, (n) => String(n.tagName).toUpperCase() === "SELECT" && n.getAttribute("aria-label") === t("filters.urgency"))[0];
  urgencySel.value = "P0";
  urgencySel.onchange();
  await settle();
  const emptyBox = find(shadow, (n) => n.className === "empty")[0];
  const clearBtn = find(emptyBox, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("emptyStates.clearFilters"))[0];
  clearBtn.onclick();
  await settle();
  const stageSel2 = find(shadow, (n) => String(n.tagName).toUpperCase() === "SELECT" && n.getAttribute("aria-label") === t("filters.stage"))[0];
  assert.equal(stageSel2.value, "all", "清除过滤复位 stage");
  assert.equal(rows().length, 2, "清除后全量");
  // strip 点击联动（backlog chip → stage=inbox，同值再点取消）
  const backlogChip = find(shadow, (n) => typeof n.className === "string" && String(n.className).includes("stripchip") && n.textContent.includes(t("stages.backlog")))[0];
  assert.ok(backlogChip, "strip backlog 可点 chip 在场");
  backlogChip.onclick();
  await settle();
  assert.equal(rows().length, 1, "strip 联动 stage=inbox");
  assert.ok(String(find(shadow, (n) => typeof n.className === "string" && String(n.className).includes("stripchip"))[0].className).includes("is-active"), "active 态");
  find(shadow, (n) => typeof n.className === "string" && String(n.className).includes("stripchip"))[0].onclick();
  await settle();
  assert.equal(rows().length, 2, "同值再点取消");
});

test("pinned filters：保存/应用/删除/跨 mount 持久（P1-3 后半）", async () => {
  const { mountWorkbench } = await import("../src/client/components/workbench.mjs");
  const c1 = { key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t1", stage: "inbox", triage: { urgency: "P0" } };
  const storage = (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })();
  const apiStub = {
    state: async () => ({ auth: { account: "iasiv5", login: "iasiv5", credential: { configured: true, healthy: true, verifiedAt: null, rateLimitedUntil: null } }, watch: { repos: ["o/r"] }, snapshots: { lastIngestAt: null, perRepo: {} }, settings: { intervalMinutes: 0 }, candidates: [c1], runs: [], workflow: { templates: [] }, ingestLog: [] }),
    auth: async () => ({ gates: { ghInstalled: true, ghLogin: true, credentialOk: true }, viewerLogin: "iasiv5", credential: { configured: true, healthy: true, verifiedAt: null, rateLimitedUntil: null } }),
    workSessions: async () => ({ items: [] }),
    refresh: async () => ({ authenticated: true }),
  };
  const settle = () => new Promise((r) => setTimeout(r, 5));
  const mkShadow = () => { const s = new FakeElement("shadow"); s.host = new FakeElement("host"); return s; };
  const shadow = mkShadow();
  mountWorkbench(shadow, { getLang: () => "zh-CN", build: "t", deps: { api: apiStub }, storage });
  await settle();
  const saveBtn = () => find(shadow, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("filters.saveCurrent"))[0];
  assert.ok(saveBtn(), "存为常用按钮在场");
  assert.equal(saveBtn().disabled, true, "默认过滤时禁用");
  const urgencySel = find(shadow, (n) => String(n.tagName).toUpperCase() === "SELECT" && n.getAttribute("aria-label") === t("filters.urgency"))[0];
  urgencySel.value = "P0";
  urgencySel.onchange();
  await settle();
  assert.equal(saveBtn().disabled, false, "有过滤后可存");
  saveBtn().onclick();
  await settle();
  const pinChips = () => find(shadow, (n) => typeof n.className === "string" && String(n.className).includes("pinchip"));
  assert.equal(pinChips().length, 1, "pin chip 出现");
  assert.ok(pinChips()[0].textContent.includes(t("urgency.P0")), "label 含紧急度");
  // 应用
  urgencySel.value = "all";
  urgencySel.onchange();
  await settle();
  pinChips()[0].onclick();
  await settle();
  const urgencySel2 = find(shadow, (n) => String(n.tagName).toUpperCase() === "SELECT" && n.getAttribute("aria-label") === t("filters.urgency"))[0];   // paint 全量重建，需重查
  assert.equal(urgencySel2.value, "P0", "点 pin 应用过滤");
  // 删除
  const rm = find(shadow, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("filters.pinRemove"))[0];
  rm.onclick();
  await settle();
  assert.equal(pinChips().length, 0, "删除后 pin 消失");
  // 持久：重新保存 → 新 mount 同 storage 仍在
  urgencySel.value = "P0";
  urgencySel.onchange();
  await settle();
  saveBtn().onclick();
  await settle();
  const shadow2 = mkShadow();
  mountWorkbench(shadow2, { getLang: () => "zh-CN", build: "t", deps: { api: apiStub }, storage });
  await settle();
  assert.equal(find(shadow2, (n) => typeof n.className === "string" && String(n.className).includes("pinchip")).length, 1, "跨 mount 持久");
});

test("sessionsView P1-4：相对时间/unread/在途节点/终态折叠/onOpen 扩参", async () => {
  const { renderSessionsView } = await import("../src/client/components/sessionsView.mjs");
  const NOW = 1_000_000_000;
  const mk = (n, kind, sessionId, runId, stage, extra = {}) => ({ kind, key: `o/r#issue#${n}`, sessionId, runId, cwd: "/w", approvalPolicy: null, createdAt: 1, updatedAt: NOW - 30 * 60_000, ...extra, candidate: { repo: "o/r", number: n, title: "T" + n, stage, ...(extra.candidate ?? {}) } });
  const items = [
    mk(1, "work", "dsh-l:work-a", null, "building"),
    mk(2, "run", "dsh-l:run-ok", "run-ok", "building"),
    mk(3, "run", "dsh-l:run-seen", "run-seen", "building"),
    mk(4, "run", "dsh-l:run-new", "run-new", "building"),
    mk(5, "work", "dsh-l:work-gone", null, "closed"),
    mk(6, "work", "dsh-l:work-ship", null, "shipped", { candidate: { release: { confirmedAt: "x" } } }),
    mk(7, "work", "dsh-l:work-act", null, "shipped"),
  ];
  const summaries = items.map((it) => ({ id: it.sessionId, displayTitle: it.sessionId, running: it.sessionId === "dsh-l:run-ok" }));
  const runs = [
    { id: "run-ok", status: "running", currentNodeIds: ["build"] },
    { id: "run-seen", status: "succeeded", currentNodeIds: [] },
    { id: "run-new", status: "succeeded", currentNodeIds: [] },
  ];
  const opens = [];
  const root = new FakeElement("div");
  renderSessionsView(root, { t, items, summaries, onOpen: (id, item) => opens.push([id, item]), onAnother: () => {}, onDeliver: null, runs, seenRunIds: ["run-seen"], nowMs: NOW });
  const rowById = (id) => root.children.filter((n) => n._rowId === id)[0];
  const archive = root.children.find((n) => typeof n.className === "string" && String(n.className).includes("ssarchive"));
  assert.ok(archive, "终态折叠容器在场");
  const archiveIds = find(archive, (n) => n._rowId).map((r) => r._rowId).sort().join(",");
  assert.equal(archiveIds, "dsh-l:work-gone,dsh-l:work-ship", "closed+已确认 shipped 归档；未确认 shipped 保持活跃");
  assert.ok(summary(archive).textContent.includes(t("sessions.archive")) && summary(archive).textContent.includes("2"), "归档 summary 含名与计数");
  const rowA = rowById("dsh-l:work-a");
  assert.ok(rowA.textContent.includes(t("sessions.ago").replace("{t}", "30m")), "相对时间 30m 前");
  assert.ok(rowById("dsh-l:run-ok").textContent.includes("build"), "run-ok 在途节点 chip");
  const unreadOf = (id) => { const r = rowById(id); return r ? r.children.filter((n) => typeof n.className === "string" && String(n.className).includes("st-unread")).length : -1; };
  assert.equal(unreadOf("dsh-l:run-new"), 1, "succeeded 未读 → 蓝点");
  assert.equal(unreadOf("dsh-l:run-seen"), 0, "已读无蓝点");
  assert.equal(unreadOf("dsh-l:run-ok"), 0, "running 无蓝点");
  const openBtn = rowById("dsh-l:work-a").children.filter((n) => String(n.tagName).toUpperCase() === "BUTTON").find((b) => b.textContent.includes(t("sessions.open")));
  openBtn.onclick();
  assert.equal(opens.length, 1, "onOpen 调用一次");
  assert.equal(opens[0][0], "dsh-l:work-a", "onOpen 传 id");
  assert.equal(opens[0][1].sessionId, "dsh-l:work-a", "onOpen 传 item（runId 记账数据源）");
  function summary(el) { return el.children.find((n) => String(n.tagName).toUpperCase() === "SUMMARY"); }
});
