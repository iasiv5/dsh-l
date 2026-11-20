// 凭据卡（登录门禁改造 Task 9）：登录面板（full）与收活板块（compact）共用的纯渲染组件。
// 无网络、无自有状态：视图完全由 status（GET /dsh-l/auth 门禁重塑形状）+ 调用方注入的 UI 态（patOpen/confirmDelete）驱动，
// 动作经 on 回调上抛（install/connect/enter/verify/patSave/patDelete/togglePat/cancelPat/confirmDelete/cancelDelete）。
// 文案纪律（评审 R1-11）：cred.* 全静态字面量键——状态→键映射固定在本文件 deriveView 内，禁止动态拼接键名。
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const svg = (markup) => { const s = el("span"); s.innerHTML = markup; return s.firstElementChild; };
const GH_MARK = '<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
const REFRESH_MARK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96"/><path d="M13.7 1.6v2.9h-2.9" stroke-linejoin="round"/></svg>';

const dot = (kind) => el("span", "dot " + kind);
const agoText = (iso, t) => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return t("cred.checkedJustNow");
  return Math.floor(sec / 60) + " " + t("cred.checkedAgoSuffix");
};

// 服务端错误前缀 → 用户文案（静态字面量键映射；评审问题 3：PAT/删除失败态的可见呈现）。
const errKeyFor = (t, msg) => {
  const m = String(msg ?? "");
  if (m.startsWith("credential-format")) return t("cred.errFormat");
  if (m.startsWith("credential-invalid")) return t("cred.errInvalid");
  if (m.startsWith("credential-verify-failed")) return t("cred.errVerifyFailed");
  if (m.startsWith("token-invalid")) return t("cred.errTokenInvalid");
  if (m.startsWith("rate-limited:")) return t("cred.errRateLimited");
  if (m.startsWith("gh-not-ours")) return t("cred.errGhNotOurs");
  if (m.startsWith("credential-missing")) return t("cred.errMissing");
  if (m.startsWith("credential-unhealthy")) return t("cred.errUnhealthy");
  return m ? m : null;
};

// 手动令牌表单（full/compact 两形态共用；patSave 上抛原始输入，校验在服务端）
const buildPatForm = (t, on, act) => {
  const form = el("div", "patForm open");
  form.append(el("label", "", t("cred.patTitle")));
  const switchLine = el("p", "patHint");
  switchLine.style.margin = "0";
  const switchBtn = el("button", "switchLink", t("cred.switchToDevice"));
  switchBtn.type = "button"; switchBtn.onclick = act("switchToDevice", on.switchToDevice);
  switchLine.append(switchBtn);
  form.append(switchLine);
  const input = el("input", "patInput");
  input.type = "password"; input.placeholder = t("cred.patPlaceholder"); input.autocomplete = "off";
  form.append(input);
  const row = el("div", "patRow");
  const save = el("button", "patSave", t("cred.patSave"));
  save.type = "button";
  save.onclick = act("patSave", () => on.patSave?.(input.value));
  const cancel = el("button", "patCancel", t("cred.patCancel"));
  cancel.type = "button"; cancel.onclick = act("patCancel", on.cancelPat);
  row.append(save, cancel);
  form.append(row);
  form.append(el("p", "patHint", t("cred.patHint")));
  return form;
};

// 删除确认浮层（R2Q2：gh auth logout 复选框按 ghWrittenByUs 门控——非工作台所建则置灰）
const buildDeleteConfirm = (t, status, on, act) => {
  const box = el("div", "patForm open");
  box.setAttribute("role", "alert");
  box.append(el("label", "", t("cred.deleteConfirmTitle")));
  const ours = status?.credential?.ghWrittenByUs === true;
  const checkWrap = el("label", "patHint");
  const check = el("input");
  check.type = "checkbox"; check.id = "credGhLogout" + Math.random().toString(36).slice(2, 6);
  check.checked = ours; check.disabled = !ours;
  checkWrap.append(check, el("span", "", t("cred.deleteGhLogout") + (ours ? "" : "（" + t("cred.deleteGhLogoutHint") + "）")));
  box.append(checkWrap);
  const row = el("div", "patRow");
  const confirm = el("button", "patSave is-danger", t("cred.deleteConfirm"));
  confirm.type = "button";
  confirm.onclick = act("confirmDelete", () => on.deleteConfirmed?.(check.checked));
  const cancel = el("button", "patCancel", t("cred.deleteCancel"));
  cancel.type = "button"; cancel.onclick = act("cancelDelete", on.cancelDelete);
  row.append(confirm, cancel);
  box.append(row);
  return box;
};

// 状态→视图派生：全部 cred.* 键引用集中在这一处（静态字面量），渲染层只消费派生结果。
const deriveView = (t, status, ui) => {
  const g = status?.gates ?? {};
  const c = status?.credential ?? {};
  const dv = status?.device ?? {};
  const inst = status?.install ?? {};
  const installing = inst.phase === "installing";
  const hasGh = g.ghInstalled === true;
  const hasToken = g.ghLogin === true;
  const pending = dv.phase === "pending" || dv.phase === "authorizing";
  const authorizing = dv.phase === "authorizing";
  const limited = Boolean(c.rateLimitedUntil) && new Date(c.rateLimitedUntil) > new Date();
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
  else gates.push(["ok", login ? t("cred.g2Ok") + "（" + login + "）" : t("cred.g2Ok")]);
  if (ok) gates.push(["ok", limited ? t("cred.g3OkLimited") : t("cred.g3Ok")]);
  else if (pending) gates.push(["wait", authorizing ? t("cred.g3WaitHanding") : t("cred.g3WaitAuto")]);
  else if (dv.phase === "failed") gates.push(["bad", t("auth.deviceFailed") + (dv.error ? "（" + String(dv.error).slice(0, 80) + "）" : "")]);
  else if (dv.phase === "expired") gates.push(["bad", t("auth.deviceExpired")]);
  else if (!hasToken) gates.push(["wait", t("cred.g3WaitVerify")]);
  else if (c.healthy === false) gates.push(["bad", t("cred.g3BadInvalid")]);
  else if (!verified) gates.push(["bad", t("cred.g3BadUnset")]);
  else gates.push(["bad", t("cred.g3BadScope")]);

  let badge, sub;
  if (limited) { badge = [t("cred.badgeLimited"), "warn"]; sub = t("cred.subLimited"); }
  else if (pending) { badge = [t("cred.badgeBusy"), "wait"]; sub = t("cred.subDevice"); }
  else if (ok) { badge = [t("cred.badgeOk"), "ok"]; sub = c.source === "manual-pat" ? t("cred.subOk") : t("cred.subFlowOk"); }
  else if (c.healthy === false && verified) { badge = [t("cred.badgeErr"), "err"]; sub = t("cred.subErr"); }
  else if (ui.patOpen) { badge = [t("cred.badgeUnset"), "warn"]; sub = t("cred.subPat"); }
  else { badge = [t("cred.badgeUnset"), "warn"]; sub = t("cred.subUnset"); }

  let cta = null;
  if (!pending && !ui.patOpen && !ui.confirmDelete) {
    if (installing) cta = { label: t("cred.installingCta"), disabled: true, action: null };
    else if (!hasGh) cta = { label: t("cred.installCta"), disabled: false, action: "install" };
    else if (ok) cta = { label: (login ?? "GitHub") + " · " + t("auth.enterBtn"), disabled: false, action: "enter" };
    else if (limited) cta = { label: (login ?? "GitHub") + " · " + t("cred.enterBtn"), disabled: false, action: "enter" };
    else if (c.healthy === false || (verified && !ok)) cta = { label: t("cred.reauthCta"), disabled: false, action: "connect" };
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
  else checked = t("cred.checkedValid") + " · " + agoText(c.verifiedAt, t);

  const connectZone = !ok && !pending && !ui.patOpen && !ui.confirmDelete;
  const errText = c.healthy === false && verified && !ok ? t("cred.errTokenInvalid")
    : (verified && !ok && Array.isArray(scopes) && scopes.length > 0 ? t("cred.g3BadScope") : null);
  const warnText = limited ? t("cred.bannerLimited") : null;
  const notes = [];
  if (inst.phase === "failed") notes.push(t("cred.installFailed"));
  if (installing || (!hasGh && !ui.patOpen)) notes.push(t("cred.installNote"));
  if (!hasGh && !ui.patOpen) notes.push(t("cred.installManual"));
  if (pending && !authorizing) notes.push(t("auth.deviceNote"));
  if (authorizing) notes.push(t("cred.g3WaitHanding"));

  return { badge, sub, gates, limited, ok, hasGh, hasToken, pending, authorizing, installing, verified, login, connectZone, cta, aux, showKv, sourceText, chips, checked, errText, warnText, notes };
};

// full 形态：loopforge 凭证卡信息架构（徽章 + 门禁行 + kv + 双方法 + 主 CTA + 辅助操作）。
export function renderConnectionCard(parent, { t, status, mode = "full", patOpen = false, confirmDelete = false, patError = null, deleteError = null, on = {} }) {
  const v = deriveView(t, status, { patOpen, confirmDelete });
  const act = (name, fn) => (e) => { e.preventDefault(); fn?.(); };

  if (mode === "compact") {
    const wrap = el("div", "credCompact");
    wrap.append(dot(v.gates[2]?.[0] === "ok" ? "ok" : v.gates[2]?.[0] === "bad" ? "warn" : "wait"));
    wrap.append(el("b", "", t("cred.compactTitle")));
    const badge = el("span", "badge"); badge.append(dot(v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait"), el("span", "", v.badge[0]));
    wrap.append(badge);
    wrap.append(el("span", "", t("cred.kvChecked") + ": " + (v.checked || t("cred.checkedNever"))));
    const re = el("button", "auxAct", v.limited ? t("cred.bannerRecheck") : t("cred.recheck"));
    re.type = "button"; re.onclick = act("recheck", on.verify);
    wrap.append(re);
    if (v.verified) {
      const p = el("button", "auxAct", v.ok ? t("cred.patReplace") : t("cred.patBtn"));
      p.type = "button"; p.onclick = act("pat", on.togglePat);
      const d = el("button", "auxAct is-danger", t("cred.deleteBtn"));
      d.type = "button"; d.onclick = act("delete", on.toggleDelete);
      wrap.append(p, d);
    }
    parent.append(wrap);
    if (patOpen) parent.append(buildPatForm(t, on, act));
    if (patError && patOpen) parent.append(el("p", "errForm", errKeyFor(t, patError)));
    if (confirmDelete) parent.append(buildDeleteConfirm(t, status, on, act));
    if (deleteError && confirmDelete) parent.append(el("p", "errForm", errKeyFor(t, deleteError)));
    return;
  }

  // full 形态：loopforge 凭证卡信息架构（徽章 + 门禁行 + kv + 双方法 + 主 CTA + 辅助操作）。
  // 卡元素用 article.gate——同时是 scripts/ui-probe.cjs 的视图判定锚（article.gate button.cta）。
  const card = el("article", "gate");
  card.setAttribute("aria-label", t("cred.cardTitle"));

  // 卡头：GitHub mark + 标题/副行 + 徽章 + 重新校验
  const head = el("div", "credHead");
  const ghMark = el("div", "ghMark"); ghMark.append(svg(GH_MARK));
  const who = el("div", "credWho");
  who.append(el("b", "", t("cred.cardTitle")));
  who.append(el("div", "credSub", v.sub));
  const badge = el("span", "badge");
  badge.append(dot(v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait"), el("span", "", v.badge[0]));
  const recheck = el("button", "recheck"); recheck.type = "button"; recheck.title = t("cred.recheck");
  recheck.setAttribute("aria-label", t("cred.recheck"));
  recheck.append(svg(REFRESH_MARK));
  recheck.onclick = act("recheck", on.verify);
  head.append(ghMark, who, badge, recheck);
  card.append(head);

  // 三关门禁行
  const gatesBox = el("div", "gates");
  const names = [t("cred.gate1"), t("cred.gate2"), t("cred.gate3")];
  v.gates.forEach(([state, stText], i) => {
    const row = el("div", "gateRow");
    row.append(dot(state === "ok" ? "ok" : state === "bad" ? "warn" : "wait"));
    row.append(el("span", "gName", names[i]));
    row.append(el("span", "gSt" + (state === "bad" ? " is-bad" : ""), stText));
    gatesBox.append(row);
  });
  card.append(gatesBox);

  // 凭据 kv（已校验态）
  if (v.showKv) {
    const kv = el("dl", "kv");
    kv.append(el("dt", "", t("cred.kvSource")));
    kv.append(el("dd", "", v.sourceText));
    kv.append(el("dt", "", t("cred.kvScopes")));
    const chips = el("span", "chips");
    for (const [text, miss] of v.chips) chips.append(el("span", "chip" + (miss ? " is-miss" : ""), text));
    const scopesDd = el("dd"); scopesDd.append(chips);
    kv.append(scopesDd);
    kv.append(el("dt", "", t("cred.kvChecked")));
    kv.append(el("dd", "", v.checked));
    kv.append(el("dt", "", t("cred.kvUsed")));
    kv.append(el("dd", "", t("cred.kvUsedValue")));
    card.append(kv);
  }

  // 双方法并列连接区（评审 R1 对齐 loopforge 向导双 tab）
  if (v.connectZone) {
    const zone = el("div", "connectZone");
    zone.append(el("p", "", t("cred.connectLine")));
    const row = el("div", "methodRow");
    const mDevice = el("button", "method primary", t("cred.connectBtn"));
    mDevice.type = "button"; mDevice.onclick = act("mDevice", on.connect);
    const mPat = el("button", "method", t("cred.patBtn"));
    mPat.type = "button"; mPat.onclick = act("mPat", on.togglePat);
    row.append(mDevice, mPat);
    zone.append(row);
    zone.append(el("p", "methodHint", t("cred.methodHint")));
    card.append(zone);
  }

  // 设备流码框
  if (v.pending) {
    const dv = status?.device ?? {};
    const codeBox = el("div", "gateCode");
    const code = el("b", "", dv.userCode ?? "····-····");
    const copyBtn = el("button", "", t("cred.copy"));
    copyBtn.type = "button";
    copyBtn.onclick = () => navigator.clipboard?.writeText(dv.userCode ?? "").catch(() => {});
    codeBox.append(code, copyBtn);
    card.append(codeBox);
    const line = el("p", "deviceLine");
    line.append(el("span", "", t("cred.deviceWaiting") + " "));
    const link = el("a", "", dv.verificationUri ?? "https://github.com/login/device");
    link.href = dv.verificationUri ?? "https://github.com/login/device";
    link.target = "_blank"; link.rel = "noreferrer noopener";
    const switchBtn = el("button", "switchLink", t("cred.switchToPat"));
    switchBtn.type = "button"; switchBtn.onclick = act("switchToPat", on.togglePat);
    line.append(link, el("span", "", " · "), switchBtn);
    card.append(line);
  }

  // 手动令牌表单（与 compact 共用构建器）+ 失败态错误行（评审问题 3）
  if (patOpen) card.append(buildPatForm(t, on, act));
  if (patError && patOpen) card.append(el("p", "errForm", errKeyFor(t, patError)));

  // 错误 / 限流提示条
  if (v.errText) card.append(el("p", "err", v.errText));
  if (v.warnText) card.append(el("p", "warnBox", v.warnText));

  // 主行动（每状态唯一主按钮；ui-probe 锚 article.gate button.cta）
  if (v.cta) {
    const cta = el("button", "cta", v.cta.label);
    cta.type = "button";
    cta.disabled = Boolean(v.cta.disabled);
    if (v.cta.action) cta.onclick = act("cta", on[v.cta.action]);
    card.append(cta);
  }

  // 辅助操作行
  if (v.aux.length > 0) {
    const auxBox = el("div", "aux");
    for (const [id, label, danger] of v.aux) {
      const b = el("button", "auxAct" + (danger ? " is-danger" : ""), label);
      b.type = "button";
      b.onclick = act(id, id === "recheck" ? on.verify : id === "pat" ? on.togglePat : on.toggleDelete);
      auxBox.append(b);
    }
    card.append(auxBox);
  }

  // 删除确认浮层（与 compact 共用构建器；gh logout 门控见 buildDeleteConfirm）+ 失败态错误行
  if (confirmDelete) card.append(buildDeleteConfirm(t, status, on, act));
  if (deleteError && confirmDelete) card.append(el("p", "errForm", errKeyFor(t, deleteError)));

  // 状态注脚（就绪态无注脚——B6 范围事实；mock ready notes:[]）
  for (const note of v.notes) card.append(el("p", "note", note));

  parent.append(card);
}
