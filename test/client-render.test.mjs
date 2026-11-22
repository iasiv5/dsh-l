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
