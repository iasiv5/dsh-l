// 凭据卡（Task 9，评审执行产出反馈重构）：常驻骨架 + 类切换。
// 设计约束（用户实测反馈驱动）：点击「更换访问令牌 / 删除凭证」等 UI 开关**零 DOM 重建**——
// 表单/确认/错误行常驻 DOM，仅翻 open/display 类；状态变化经 update(status) 单点同步。
// 错误所有权在卡内：on.patSave / on.deleteConfirmed 抛错 → 卡内 errForm 呈现（setPatError/setDeleteError）。
// 文案纪律（评审 R1-11）：cred.* 全静态字面量键——状态→键映射固定在 deriveView。
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const svg = (markup) => { const s = el("span"); s.innerHTML = markup; return s.firstElementChild; };
const GH_MARK = '<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
const REFRESH_MARK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96"/><path d="M13.7 1.6v2.9h-2.9" stroke-linejoin="round"/></svg>';

// ── PAT 输入框防浏览器自动填充（2026-11-20 用户实锤定谳）─────────────────────
// 症状：点击侧栏「DSH Loop Forge」后，工作区会话列表变「无匹配会话」，搜索框里多出「root」。
// 根因：本卡挂载的 type="password" 输入框唤醒 Edge/Chrome 密码管理器（两者对 password 框
// 一律无视 autocomplete="off"），PM 把该源已存用户名（root）回填给全页唯一亮色 DOM 文本框
// ＝侧栏会话搜索框（本卡所有输入框都在 shadow DOM 内，PM 跳过不填），React onChange
// 把「root」写成会话搜索词。其余面板不挂密码框，故只有本插件触发。
// 三层防御：
//   ① patForm 懒挂载（见两处 patForm 的 attach）——密码框不随面板进 DOM，PM 无表单可唤醒；
//   ② autocomplete="new-password"——Edge/Chrome 对 new-password 抑制已存凭据回填；
//   ③ readonly 直到首次交互——PM 直接跳过 readonly 字段（双保险）。
function guardPatInput(patInput) {
  patInput.autocomplete = "new-password";
  patInput.readOnly = true;
  const unroof = () => { patInput.readOnly = false; };
  patInput.addEventListener("mousedown", unroof, { once: true });
  patInput.addEventListener("focus", unroof, { once: true });
  patInput.addEventListener("touchstart", unroof, { once: true, passive: true });
}

const dot = (kind) => el("span", "dot " + kind);
const agoText = (iso, t) => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return t("cred.checkedJustNow");
  return Math.floor(sec / 60) + " " + t("cred.checkedAgoSuffix");
};

// 服务端错误前缀 → 用户文案（静态字面量键映射）
const errKeyFor = (t, msg) => {
  const m = String(msg ?? "");
  if (m.startsWith("credential-format")) return t("cred.errFormat");
  if (m.startsWith("credential-invalid")) return t("cred.errInvalid");
  if (m.startsWith("credential-verify-failed")) return t("cred.errVerifyFailed");
  if (m.startsWith("token-invalid")) return t("cred.errTokenInvalid");
  if (m.startsWith("rate-limited:")) return t("cred.errRateLimited");
  if (m.startsWith("device-start-failed")) return t("cred.errDeviceStart");
  if (m.startsWith("gh-not-ours")) return t("cred.errGhNotOurs");
  if (m.startsWith("credential-missing")) return t("cred.errMissing");
  if (m.startsWith("credential-unhealthy")) return t("cred.errUnhealthy");
  return m ? m : null;
};

// 状态→视图派生（ui = 卡内局部 UI 态：patOpen/confirmDelete/patError/deleteError）
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
  else if (!hasGh) { badge = [t("cred.badgeUnset"), "warn"]; sub = installing ? t("cred.subInstalling") : t("cred.subNoGh"); }   // gh 未装：状态句引导安装（2026-11-20 简报）
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

  const showKv = ok || limited;   // 仅凭据当前有效/限流显示；陈旧 verifiedAt 不再让「未配置」卡挂着旧 kv（2026-11-20 简报）
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

  const errText = c.healthy === false && verified && !ok ? t("cred.errTokenInvalid")
    : (verified && !ok && Array.isArray(scopes) && scopes.length > 0 ? t("cred.g3BadScope") : null);
  const warnText = limited ? t("cred.bannerLimited") : null;
  const notes = [];
  if (inst.phase === "failed") notes.push(t("cred.installFailed"));
  if (installing || (!hasGh && !ui.patOpen)) notes.push(t("cred.installNote"));
  if (!hasGh && !ui.patOpen) notes.push(t("cred.installManual"));
  if (pending && !authorizing) notes.push(t("auth.deviceNote"));
  if (authorizing) notes.push(t("cred.g3WaitHanding"));

  const aux = [];
  if (!pending && !ui.patOpen && !ui.confirmDelete && (ok || limited || (verified && hasGh))) {
    aux.push(limited ? ["recheck", t("cred.bannerRecheck")] : ["recheck", t("cred.recheck")]);
    aux.push(["pat", ok ? t("cred.patReplace") : t("cred.patBtn")]);
    aux.push(["delete", t("cred.deleteBtn")]);
  }

  return { badge, sub, gates, cta, limited, ok, hasGh, hasToken, pending, authorizing, installing, verified, login, errText, warnText, notes, aux, showKv, sourceText, chips, checked };
};

// 卡挂载：常驻骨架 + update(status) 单点同步 + UI 开关零重建（类/显隐切换）。
// 返回句柄 { el, update, setPatOpen, setConfirmDelete, setPatError, setDeleteError }。
export function renderConnectionCard(parent, { t, status = null, mode = "full", on = {} }) {
  let statusNow = status;
  let patOpen = false, confirmDelete = false, patError = null, deleteError = null;
  let connectError = null;
  let ctaAction = null;

  // ── compact 形态：自包含常驻迷你骨架（同样的类切换纪律；开关零 DOM 重建） ──
  if (mode === "compact") {
    parent.textContent = "";   // 幂等替换（堆叠回归钉）
    let patOpen = false, confirmDelete = false, patError = null, deleteError = null;
    let statusC = status;

    const wrap = el("div", "credCompact");
    const badge = el("span", "badge");
    const badgeDot = dot("warn"); const badgeText = el("span", "", "");
    badge.append(badgeDot, badgeText);
    wrap.append(el("b", "", t("cred.compactTitle")), badge);
    const checkedSpan = el("span");
    wrap.append(checkedSpan);
    const reBtn = el("button", "auxAct", t("cred.recheck")); reBtn.type = "button";
    reBtn.onclick = (e) => { e.preventDefault(); on.verify?.(); };
    wrap.append(reBtn);
    const patBtn2 = el("button", "auxAct", t("cred.patBtn")); patBtn2.type = "button";
    const delBtn = el("button", "auxAct is-danger", t("cred.deleteBtn")); delBtn.type = "button";
    wrap.append(patBtn2, delBtn);

    const patForm = el("div", "patForm");
    patForm.append(el("label", "", t("cred.patTitle")));
    const patInput = el("input", "patInput");
    patInput.type = "password"; patInput.placeholder = t("cred.patPlaceholder");
    guardPatInput(patInput);   // 防自动填充三件套（懒挂载见 patBtn2/setPatOpen）
    patForm.append(patInput);
    const patRow = el("div", "patRow");
    const patSaveBtn = el("button", "patSave", t("cred.patSave")); patSaveBtn.type = "button";
    const patCancelBtn = el("button", "patCancel", t("cred.patCancel")); patCancelBtn.type = "button";
    patRow.append(patSaveBtn, patCancelBtn);
    patForm.append(patRow, el("p", "patHint", t("cred.patHint")));
    const patErrLine = el("p", "errForm"); patErrLine.style.display = "none";
    patForm.append(patErrLine);

    const confirmBox = el("div", "patForm");
    confirmBox.setAttribute("role", "alert");
    confirmBox.append(el("label", "", t("cred.deleteConfirmTitle")));
    const checkWrap = el("label", "patHint");
    const check = el("input"); check.type = "checkbox"; check.id = "credGhLogoutCompact";
    checkWrap.append(check, el("span", "", t("cred.deleteGhLogout") + "（" + t("cred.deleteGhLogoutHint") + "）"));
    confirmBox.append(checkWrap);
    const cRow = el("div", "patRow");
    const cBtn = el("button", "patSave is-danger", t("cred.deleteConfirm")); cBtn.type = "button";
    const cCancel = el("button", "patCancel", t("cred.deleteCancel")); cCancel.type = "button";
    cRow.append(cBtn, cCancel);
    confirmBox.append(cRow);
    const delErrLine = el("p", "errForm"); delErrLine.style.display = "none";
    confirmBox.append(delErrLine);

    const applyC = () => {
      const v = deriveView(t, statusC, { patOpen, confirmDelete });
      badgeDot.className = "dot " + (v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait");
      badgeText.textContent = v.badge[0];
      checkedSpan.textContent = t("cred.kvChecked") + ": " + (v.verified ? v.checked : t("cred.checkedNever"));
      patBtn2.style.display = v.verified ? "" : "none";
      delBtn.style.display = v.verified ? "" : "none";
      patForm.classList.toggle("open", patOpen);
      patErrLine.style.display = patError && patOpen ? "" : "none";
      patErrLine.textContent = patError && patOpen ? errKeyFor(t, patError) : "";
      confirmBox.classList.toggle("open", confirmDelete);
      confirmBox.style.display = confirmDelete ? "" : "none";
      check.checked = statusC?.credential?.ghWrittenByUs === true;
      check.disabled = !check.checked;
      delErrLine.style.display = deleteError && confirmDelete ? "" : "none";
      delErrLine.textContent = deleteError && confirmDelete ? errKeyFor(t, deleteError) : "";
    };
    // PAT 表单懒挂载：面板挂载时密码框不进 DOM（防自动填充根因，见 guardPatInput 注）
    let patFormAttached = false;
    const attachPatForm = () => {
      if (patFormAttached) return;
      patFormAttached = true;
      parent.insertBefore(patForm, confirmBox);
    };
    patBtn2.onclick = (e) => { e.preventDefault(); attachPatForm(); patOpen = !patOpen; patError = null; confirmDelete = false; applyC(); };
    delBtn.onclick = (e) => { e.preventDefault(); confirmDelete = !confirmDelete; patOpen = false; deleteError = null; applyC(); };
    patCancelBtn.onclick = (e) => { e.preventDefault(); patOpen = false; patError = null; applyC(); };
    patSaveBtn.onclick = async (e) => {
      e.preventDefault();
      const token = patInput.value;
      if (!token) return;
      try { await on.patSave?.(token); patOpen = false; patError = null; }
      catch (err) { patError = String(err?.message ?? err); }
      applyC();
    };
    cBtn.onclick = async (e) => {
      e.preventDefault();
      try { await on.deleteConfirmed?.(check.checked); confirmDelete = false; deleteError = null; }
      catch (err) { deleteError = String(err?.message ?? err); }   // gh-not-ours：浮层保持，错误就地呈现
      applyC();
    };
    cCancel.onclick = (e) => { e.preventDefault(); confirmDelete = false; deleteError = null; applyC(); };
    applyC();
    parent.append(wrap, confirmBox);   // patForm 懒挂载：首次展开才进 DOM（attachPatForm）
    return {
      el: wrap,
      update(nextStatus) { statusC = nextStatus; applyC(); },
      setPatOpen(v) { if (v) attachPatForm(); patOpen = v; applyC(); },
      setConfirmDelete(v) { confirmDelete = v; applyC(); },
      setPatError(msg) { patError = msg; applyC(); },
      setDeleteError(msg) { deleteError = msg; applyC(); },
    };
  }

  const card = el("article", "gate");   // ui-probe 视图判定锚：article.gate
  card.setAttribute("aria-label", t("cred.cardTitle"));

  // ── 常驻骨架（一次性构建，全部带引用） ──
  const head = el("div", "credHead");
  const ghMark = el("div", "ghMark"); ghMark.append(svg(GH_MARK));
  const who = el("div", "credWho");
  who.append(el("b", "", t("cred.cardTitle")));
  const subEl = el("div", "credSub");
  who.append(subEl);
  const badge = el("span", "badge");
  const badgeDot = dot("warn"); const badgeText = el("span", "", "");
  badge.append(badgeDot, badgeText);
  const recheck = el("button", "recheck"); recheck.type = "button"; recheck.title = t("cred.recheck");
  recheck.setAttribute("aria-label", t("cred.recheck"));
  recheck.append(svg(REFRESH_MARK));
  head.append(ghMark, who, badge, recheck);
  card.append(head);

  const gatesBox = el("div", "gates");
  const gateNames = [t("cred.gate1"), t("cred.gate2"), t("cred.gate3")];
  const gateRows = gateNames.map((name) => {
    const row = el("div", "gateRow");
    const d = dot("warn");
    const st = el("span", "gSt");
    row.append(d, el("span", "gName", name), st);
    gatesBox.append(row);
    return { row, d, st };
  });
  card.append(gatesBox);

  const kv = el("dl", "kv");
  const kvSource = el("dd"); const kvChips = el("span", "chips"); const kvChipsBox = el("dd"); kvChipsBox.append(kvChips);
  const kvChecked = el("dd");
  kv.append(el("dt", "", t("cred.kvSource")), kvSource, el("dt", "", t("cred.kvScopes")), kvChipsBox, el("dt", "", t("cred.kvChecked")), kvChecked, el("dt", "", t("cred.kvUsed")), el("dd", "", t("cred.kvUsedValue")));
  card.append(kv);

  const connectZone = el("div", "connectZone");
  connectZone.append(el("p", "", t("cred.connectLine")));
  const methodRow = el("div", "methodRow");
  const mDevice = el("button", "method primary", t("cred.connectBtn")); mDevice.type = "button";
  const mPat = el("button", "method", t("cred.patBtn")); mPat.type = "button";
  methodRow.append(mDevice, mPat);
  connectZone.append(methodRow, el("p", "methodHint", t("cred.methodHint")));
  card.append(connectZone);

  const codeBox = el("div", "gateCode");
  const codeText = el("b", "", "····-····");
  const copyBtn = el("button", "", t("cred.copy")); copyBtn.type = "button";
  copyBtn.onclick = () => navigator.clipboard?.writeText(statusNow?.device?.userCode ?? "").catch(() => {});
  codeBox.append(codeText, copyBtn);
  const deviceLine = el("p", "deviceLine");
  const deviceLink = el("a", "", "https://github.com/login/device");
  deviceLink.href = "https://github.com/login/device"; deviceLink.target = "_blank"; deviceLink.rel = "noreferrer noopener";
  const deviceSwitch = el("button", "switchLink", t("cred.switchToPat")); deviceSwitch.type = "button";
  deviceLine.append(el("span", "", t("cred.deviceWaiting") + " "), deviceLink, el("span", "", " · "), deviceSwitch);
  card.append(codeBox, deviceLine);

  const patForm = el("div", "patForm");
  patForm.append(el("label", "", t("cred.patTitle")));
  const patSwitchLine = el("p", "patHint"); patSwitchLine.style.margin = "0";
  const patSwitchBtn = el("button", "switchLink", t("cred.switchToDevice")); patSwitchBtn.type = "button";
  patSwitchLine.append(patSwitchBtn);
  patForm.append(patSwitchLine);
  const patInput = el("input", "patInput");
  patInput.type = "password"; patInput.placeholder = t("cred.patPlaceholder");
  guardPatInput(patInput);   // 防自动填充三件套（懒挂载见 setPatOpen）
  patForm.append(patInput);
  const patRow = el("div", "patRow");
  const patSaveBtn = el("button", "patSave", t("cred.patSave")); patSaveBtn.type = "button";
  const patCancelBtn = el("button", "patCancel", t("cred.patCancel")); patCancelBtn.type = "button";
  patRow.append(patSaveBtn, patCancelBtn);
  patForm.append(patRow, el("p", "patHint", t("cred.patHint")));
  const patErrLine = el("p", "errForm"); patErrLine.style.display = "none";
  patForm.append(patErrLine);
  // PAT 表单懒挂载：登录卡挂载时密码框不进 DOM（防自动填充根因，见 guardPatInput 注）；
  // 首次 setPatOpen(true) 才 insertBefore 到 errBox 原位。
  let patFormAttached = false;
  const attachPatForm = () => {
    if (patFormAttached) return;
    patFormAttached = true;
    card.insertBefore(patForm, errBox);
  };

  const errBox = el("p", "err"); errBox.style.display = "none";
  const warnBox = el("p", "warnBox"); warnBox.style.display = "none";
  card.append(errBox, warnBox);

  const cta = el("button", "cta"); cta.type = "button";
  card.append(cta);

  const auxWrap = el("div", "aux");
  const auxRecheck = el("button", "auxAct", t("cred.recheck")); auxRecheck.type = "button";
  const auxPat = el("button", "auxAct", t("cred.patBtn")); auxPat.type = "button";
  const auxDelete = el("button", "auxAct is-danger", t("cred.deleteBtn")); auxDelete.type = "button";
  auxWrap.append(auxRecheck, auxPat, auxDelete);
  card.append(auxWrap);

  const confirmBox = el("div", "patForm");
  confirmBox.setAttribute("role", "alert");
  confirmBox.append(el("label", "", t("cred.deleteConfirmTitle")));
  const confirmCheckWrap = el("label", "patHint");
  const confirmCheck = el("input"); confirmCheck.type = "checkbox"; confirmCheck.id = "credGhLogout";
  confirmCheckWrap.append(confirmCheck, el("span", "", t("cred.deleteGhLogout")));
  confirmBox.append(confirmCheckWrap);
  const confirmRow = el("div", "patRow");
  const confirmBtn = el("button", "patSave is-danger", t("cred.deleteConfirm")); confirmBtn.type = "button";
  const confirmCancel = el("button", "patCancel", t("cred.deleteCancel")); confirmCancel.type = "button";
  confirmRow.append(confirmBtn, confirmCancel);
  confirmBox.append(confirmRow);
  const confirmErrLine = el("p", "errForm"); confirmErrLine.style.display = "none";
  confirmBox.append(confirmErrLine);
  card.append(confirmBox);

  const notesWrap = el("div");
  let notesSig = "";
  card.append(notesWrap);

  // ── 事件（全部静态绑定；开关只翻类，零重建） ──
  const setPatOpen = (v) => { if (v) attachPatForm(); patOpen = v; if (!v) patError = null; confirmDelete = v ? false : confirmDelete; apply(); };
  const setConfirmDelete = (v) => { confirmDelete = v; if (v) patOpen = false; if (!v) deleteError = null; apply(); };
  const applyPatError = (msg) => { patError = msg; if (msg != null) patOpen = true; apply(); };
  const applyDeleteError = (msg) => { deleteError = msg; if (msg != null) confirmDelete = true; apply(); };
  mDevice.onclick = (e) => { e.preventDefault(); on.connect?.(); };
  mPat.onclick = (e) => { e.preventDefault(); setPatOpen(true); };
  deviceSwitch.onclick = (e) => { e.preventDefault(); setPatOpen(true); };
  patSwitchBtn.onclick = (e) => { e.preventDefault(); setPatOpen(false); on.switchToDevice?.(); };
  patCancelBtn.onclick = (e) => { e.preventDefault(); setPatOpen(false); on.cancelPat?.(); };
  patSaveBtn.onclick = async (e) => {
    e.preventDefault();
    const token = patInput.value;
    if (!token) return;
    try { await on.patSave?.(token); setPatError(null); setPatOpen(false); }
    catch (err) { applyPatError(String(err?.message ?? err)); }
  };
  auxPat.onclick = (e) => { e.preventDefault(); setPatOpen(!patOpen); };
  auxRecheck.onclick = (e) => { e.preventDefault(); on.verify?.(); };
  auxDelete.onclick = (e) => { e.preventDefault(); setConfirmDelete(true); };
  confirmCancel.onclick = (e) => { e.preventDefault(); setConfirmDelete(false); on.cancelDelete?.(); };
  confirmBtn.onclick = async (e) => {
    e.preventDefault();
    try { await on.deleteConfirmed?.(confirmCheck.checked); setConfirmDelete(false); }
    catch (err) { applyDeleteError(String(err?.message ?? err)); }   // gh-not-ours：浮层保持，错误就地呈现
  };
  recheck.onclick = (e) => { e.preventDefault(); on.verify?.(); };
  cta.onclick = (e) => { e.preventDefault(); if (ctaAction) on[ctaAction]?.(); };

  // ── 单点同步：状态 + UI 态 → 骨架 ──
  const apply = () => {
    const v = deriveView(t, statusNow, { patOpen, confirmDelete });
    badgeDot.className = "dot " + (v.badge[1] === "ok" ? "ok" : v.badge[1] === "err" ? "err" : "wait");
    badgeText.textContent = v.badge[0];
    subEl.textContent = v.sub;
    const stCls = (s) => (s === "ok" ? "ok" : s === "bad" ? "warn" : "wait");
    v.gates.forEach(([state, stText], i) => {
      const r = gateRows[i];
      r.row.style.display = i === 0 || v.hasGh ? "" : "none";   // gh 未装：只留 gh CLI 一行（2026-11-20 简报）
      r.d.className = "dot " + stCls(state);
      r.st.textContent = stText;
      r.st.classList.toggle("is-bad", state === "bad");
    });
    kv.style.display = v.showKv ? "" : "none";
    if (v.showKv) {
      kvSource.textContent = v.sourceText;
      kvChips.textContent = "";
      for (const [text, miss] of v.chips) kvChips.append(el("span", "chip" + (miss ? " is-miss" : ""), text));
      kvChecked.textContent = v.checked;
    }
    connectZone.style.display = (v.hasGh && !v.ok && !v.pending && !patOpen && !confirmDelete) ? "" : "none";   // gh 未装：双方法区不出现，唯一出路是安装（2026-11-20 简报）
    codeBox.style.display = v.pending ? "" : "none";
    deviceLine.style.display = v.pending ? "" : "none";
    if (v.pending) {
      codeText.textContent = statusNow?.device?.userCode ?? "····-····";
      deviceLink.href = statusNow?.device?.verificationUri ?? "https://github.com/login/device";
      deviceLink.textContent = statusNow?.device?.verificationUri ?? "https://github.com/login/device";
    }
    patForm.classList.toggle("open", patOpen);
    patErrLine.style.display = patError && patOpen ? "" : "none";
    patErrLine.textContent = patError && patOpen ? errKeyFor(t, patError) : "";
    const errLine = connectError ? errKeyFor(t, connectError) : v.errText;   // 连接发起错误就地呈现，优先于服务端态错误（2026-11-20 静默失败修复）
    errBox.style.display = errLine ? "" : "none";
    errBox.textContent = errLine ?? "";
    warnBox.style.display = v.warnText ? "" : "none";
    warnBox.textContent = v.warnText ?? "";
    if (v.cta) {
      cta.style.display = "";
      cta.textContent = v.cta.label;
      cta.disabled = Boolean(v.cta.disabled);
      ctaAction = v.cta.action;
    } else { cta.style.display = "none"; ctaAction = null; }
    auxWrap.style.display = v.aux.length > 0 ? "" : "none";
    auxRecheck.style.display = v.aux.some(([id]) => id === "recheck") ? "" : "none";
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
      for (const note of v.notes) notesWrap.append(el("p", "note", note));
    }
  };

  apply();
  parent.append(card);
  return {
    el: card,
    update(nextStatus) { statusNow = nextStatus; apply(); },
    setPatOpen, setConfirmDelete,
    setPatError: applyPatError,
    setDeleteError: applyDeleteError,
    setConnectError(msg) { connectError = msg; apply(); },
  };
}
