import { api } from "../api.mjs";
import { pickTriageBatch, gateState, settingsPatch, workSessionSettingsPatch, runBlock } from "../logic.mjs";
import { openRepoPicker } from "./repoPicker.mjs";
import { renderStrip } from "./pipelineStrip.mjs";

export function openSettings(shadow, { t, current, onSaved }) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", t("settings.title"));
  dialog.style.cssText = "width:min(360px,92%);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:10px;background:canvas;color:canvastext;border:1px solid color-mix(in srgb,currentColor 18%,transparent)";
  const title = document.createElement("h3");
  title.textContent = t("settings.title");
  title.style.margin = "0";
  // M8 T1/评审问题3：并发上限（1–4 实文双钉）；硬编码 zh-CN 字面量（D7 零新键直接后果——i18n 权衡已声明）
  const concLabel = document.createElement("label");
  concLabel.textContent = t("settings.concurrency");
  const concInput = document.createElement("input");
  concInput.type = "number";
  concInput.min = "1"; concInput.max = "4"; concInput.step = "1";
  concInput.value = String(current?.engineConcurrency ?? 2);
  const label = document.createElement("label");
  label.textContent = t("settings.intervalMinutes");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0"; input.max = "1440"; input.step = "1";
  input.value = String(current?.intervalMinutes ?? 0);
  const modelSel = document.createElement("select");
  modelSel.setAttribute("aria-label", t("settings.triageModel"));
  const initialModel = current?.triageModel ?? null;
  const valueOf = (sel) => (sel ? sel.provider + "\n" + sel.model : "");
  // Task 6：模型选择器工厂化——分诊模型与开工会话模型同一 fill 形态（含目录外回落 option）。
  const makeModelSelect = (ariaLabel, initial) => {
    const s = document.createElement("select");
    s.setAttribute("aria-label", ariaLabel);
    const fill = (providers, hostDefault) => {
      s.innerHTML = "";
      const follow = document.createElement("option");
      follow.value = "";
      follow.textContent = t("settings.followDefault") + "（" + (hostDefault ? hostDefault.provider + " / " + hostDefault.model : "—") + "）";
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
    for (const p of presets) { const o = document.createElement("option"); o.value = p; o.textContent = p; presetSel.append(o); }
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
    ["never", t("settings.policyNever")],
  ], current?.workSessionApprovalPolicy ?? "");
  api.models().then((r) => {
    triageSelObj.fill(r.providers, r.hostDefault);
    workSelObj.fill(r.providers, r.hostDefault);
    fillPresets(r.presets ?? [], current?.workSessionPreset ?? null);
    hostDefaultRow.textContent = t("settings.hostDefault") + (r.hostDefault ? r.hostDefault.provider + " / " + r.hostDefault.model : t("settings.hostDefaultNone"));
  }).catch(() => {});
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
      // 'never' 二次确认（Q16a）：写明会话内工具调用将自动放行；已处于 never 的保存不再重复打扰。
      if (patch.workSessionApprovalPolicy === "never" && (current?.workSessionApprovalPolicy ?? null) !== "never") {
        if (!window.confirm(t("settings.policyNeverConfirm"))) { save.disabled = false; return; }
      }
      await api.putSettings(patch);
      close(); onSaved?.();
    } catch (e) {
      err.textContent = e.message;
      err.style.display = "block";
    } finally { save.disabled = false; }
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.onkeydown = (e) => { if (e.key === "Escape") close(); };
  // 飞书 Webhook（design-v2 §13.3）：URL 写 credentials（宿主路由落库），测试发送走同一通知器。
  const feishuLabel = document.createElement("label");
  feishuLabel.textContent = t("feishu.url");
  feishuLabel.style.marginTop = "8px";
  const feishuInput = document.createElement("input");
  feishuInput.type = "url";
  feishuInput.placeholder = "https://open.feishu.cn/open-apis/bot/v2/hook/…";
  const feishuRow = row();
  const feishuMsg = document.createElement("span");
  feishuMsg.style.cssText = "font-size:12px;opacity:.75";
  feishuRow.append(btn(t("feishu.save"), async () => {   // M5 T4 C 形态：独立保存（只存不测）
    feishuMsg.textContent = "";
    try {
      await api.putFeishuWebhook(feishuInput.value.trim());
      feishuMsg.textContent = t("feishu.saveOk");
    } catch (e) { feishuMsg.textContent = e.message; }
  }));
  feishuRow.append(btn(t("feishu.test"), async () => {   // 测试前自动保存输入框当前值（评审 Q5-C：消掉「改了没存就测」）
    feishuMsg.textContent = "";
    try {
      await api.putFeishuWebhook(feishuInput.value.trim());
    } catch (e) { feishuMsg.textContent = e.message; return; }
    try {
      const r = await api.feishuTest();
      feishuMsg.textContent = r.sent ? t("feishu.testOk") : t("feishu.testFail");
    } catch (e) { feishuMsg.textContent = e.message; }
  }));
  feishuRow.append(feishuMsg);
  dialog.append(title, concLabel, concInput, label, input, modelLabel, modelSel, hostDefaultRow, workModelLabel, workModelSel, workPresetLabel, presetSel, workPolicyLabel, policySel, err, save, feishuLabel, feishuInput, feishuRow);
  overlay.append(dialog);
  shadow.append(overlay);
  input.focus();
}

const btn = (text, onClick, disabled = false) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = text; b.disabled = disabled; b.onclick = onClick;
  return b;
};
const sel = (pairs, value) => {
  const s = document.createElement("select");
  for (const [v, text] of pairs) { const o = document.createElement("option"); o.value = v; o.textContent = text; s.append(o); }
  s.value = value;
  return s;
};
const row = () => { const d = document.createElement("div"); d.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center"; return d; };
const copy = (obj) => navigator.clipboard?.writeText(JSON.stringify(obj, null, 2)).catch(() => {});

// 工作区选择器（Task 8，GLOSSARY「开工会话」工作区三来源）：本地默认（服务端解析）｜选择目录（uiWorkspace
// pickDirectory + 脏态警示不阻止，评审 Q10）｜托管克隆（workspace:"managed"）。返回 null（取消/本地默认）|
// "managed" | cwd。confirm 注入可测；活体走原生 confirm。
export function pickWorkspace(shadow, { t, candidate, ui = {}, status = async () => ({ exists: false, isRepo: false, dirty: false, branch: null }), confirm = (msg) => Boolean(globalThis.confirm?.(msg)) } = {}) {
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
    sub.textContent = candidate.repo + "#" + candidate.number + " · " + (candidate.title ?? "");
    const note = document.createElement("div");
    note.style.cssText = "font-size:12.5px;display:none";
    let done = false;
    const finish = (v) => { if (done) return; done = true; overlay.remove(); resolve(v); };
    let currentButtons = [];
    const setButtons = (...bs) => { for (const b of currentButtons) b.remove(); currentButtons = bs; dialog.append(...bs); };
    const showMain = () => {
      note.style.display = "none";
      setButtons(
        btn(t("work.pickLocal"), () => finish(null)),
        btn(t("work.pickBrowse"), () => { pickDir(); }),
        btn(t("work.pickManaged"), () => finish("managed")),
        btn(t("work.pickCancel"), () => finish(null)),
      );
    };
    const pickDir = async () => {
      let cwd = null;
      try { cwd = await ui.pickDirectory?.() ?? null; } catch { cwd = null; }
      if (!cwd) { showMain(); return; }
      let st = null;
      try { st = await status(cwd); } catch { st = null; }
      if (st?.dirty) {
        note.textContent = t("work.dirtyHint") + (st.branch ? " · " + st.branch : "");
        note.style.display = "block";
        setButtons(
          btn(t("work.pickProceed"), async () => {
            let ok = true;
            try { ok = await confirm(note.textContent); } catch { ok = false; }
            finish(ok ? cwd : null);
          }),
          btn(t("work.pickCancel"), () => finish(null)),
        );
      } else {
        finish(cwd);
      }
    };
    overlay.onclick = (e) => { if (e && e.target === overlay) finish(null); };
    dialog.append(title, sub, note);
    overlay.append(dialog);
    shadow.append(overlay);
    showMain();
  });
}

export function installActions({ getLang, openWorkSession = () => false, pickDirectory = null, sessionsFeed = null }) {
  let lastRuns = [];   // strip 钩子先于行渲染被调（workbench 组装顺序），行内 run 区块由此取 runs 摘要
  const run = (view) => async (fn) => {
    try { await fn(); } catch (e) { console.warn("[dsh-l]", e); }
    await view.reload();
  };
  return {
    // Task 12：会话板块 hooks——openWorkSession（导航）、sessionsFeed（sessions.list 投影）、startAnother（另开）。
    openWorkSession,
    sessionsFeed: () => (sessionsFeed ? sessionsFeed() : []),
    startAnother: (key, cwd) => api.workStart(key, cwd ?? null, true, getLang()),
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
    strip(container, { t, state }) {
      lastRuns = state?.runs ?? [];   // 评审 R1-15：着色数据源
      renderStrip(container, { t, candidates: state?.candidates ?? [], workflow: state?.workflow, runs: lastRuns });
    },
    bar(bar, { t, state, filters, view }) {
      const keys = pickTriageBatch(state?.candidates ?? [], filters);
      bar.append(btn(t("actions.triageBatch") + " (" + keys.length + ")", () => run(view)(() => api.triage(keys, getLang())), keys.length === 0));
    },
    rowActions(detail, c, { t, view, lang }) {
      const go = run(view);
      const tr = c.triage ?? { validity: "medium", urgency: "P2", action: "hold", reason: "" };
      const v = sel(["high", "medium", "low"].map((x) => [x, t("validity." + x)]), tr.validity);
      const u = sel(["P0", "P1", "P2", "P3"].map((x) => [x, t("urgency." + x)]), tr.urgency);
      const a = sel(["start", "feedback", "close", "hold"].map((x) => [x, t("recommendedActions." + x)]), tr.action);
      const reason = document.createElement("input");
      reason.value = tr.reason ?? "";
      reason.placeholder = t("actions.reason");
      // ── 人工推翻 + 阶段迁移（桌面既有行，ux-wide；窄视口由 ux-narrow 折叠/chips 接管——评审 Task 3 双渲染）──
      const override = row();
      override.className += " ux-wide";
      override.append(v, u, a, reason, btn(t("actions.override"), () => go(() => api.override({ key: c.key, validity: v.value, urgency: u.value, action: a.value, reason: reason.value, lang }))));
      const stages = row();
      stages.className += " ux-wide";
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        stages.append(btn(t("actions.moveTo") + " " + label, () => go(() => api.stage(c.key, s, "")), c.stage === s));
      }
      const gates = row();
      const g = gateState(c);
      const runInfo = runBlock(c, lastRuns);
      // 开工会话双入口（GLOSSARY「开工会话」）按钮工厂：桌面行与窄视口主动作行各自实例化（桌面像素零变化红线）。
      // 打开会话（有活跃行）/我来开（fresh：gating 未放行；重试态：G1 pass + building 且无活跃行——评审 R3-2）。
      const workChip = (target, text, warn = false) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.style.opacity = warn ? "1" : ".8";
        if (warn) chip.style.color = "crimson";
        chip.textContent = text;
        target.append(chip);
      };
      const mkOpen = (target) => btn(t("work.openBtn"), () => {
        if (!openWorkSession(c.work.sessionId)) workChip(target, t("work.openPending"));
      });
      const mkStart = (target) => btn(t("work.startBtn"), () => go(async () => {
        // Task 8：先弹工作区选择器（M2）——null=取消或本地默认（服务端解析）；"managed"=托管克隆。
        const pick = await pickWorkspace(view.shadow, { t, candidate: c, ui: { pickDirectory }, status: (cwd) => api.workspaceStatus(cwd) });
        if (pick === null) return;
        const anotherFlag = c.gates?.G1?.decision === "pass" && c.stage === "building";
        const r = pick === "managed"
          ? await api.workStart(c.key, null, anotherFlag, lang, "managed")
          : await api.workStart(c.key, pick, anotherFlag, lang);
        if (r?.ok && r.sessionId) {
          if (!r.reused && !openWorkSession(r.sessionId)) workChip(target, t("work.openPending"));
        } else if (r?.error) {
          workChip(target, t("work.startFailed") + " (" + r.error + ")", true);
        }
      }));
      const mkG1Pair = () => [
        btn("G1 " + t("gates.G1") + " · " + t("actions.pass"), () => go(async () => { const r = await api.gate(c.key, "G1", "pass", ""); if (r.taskPackage) await copy(r.taskPackage); }), !g.G1),
        btn("G1 · " + t("actions.reject"), () => go(() => api.gate(c.key, "G1", "reject", "")), !g.G1),
      ];
      const workRow = row();
      workRow.className += " ux-wide";
      if (c.work?.sessionId) workRow.append(mkOpen(workRow));
      const freshReady = g.G1 === true && !c.work?.sessionId;   // 评审计划外建议②：已有活跃行 → 打开会话唯一入口
      const retryReady = c.gates?.G1?.decision === "pass" && c.stage === "building" && !c.work;
      if (freshReady || retryReady) workRow.append(mkStart(workRow));
      if (workRow.children.length > 0) detail.append(workRow);
      // ── 窄视口编排（ux-narrow：主动作行/阶段 chips/折叠人工推翻；桌面 display:none，像素零变化）──
      const uxNarrow = document.createElement("div");
      uxNarrow.className = "ux-narrow";
      const uxPrimary = row(); uxPrimary.className = "primary-actions";
      // 开工路径可发现性（disc 评审）：白名单源阶段 → 首位「移到 待拍板」（gating 态不插——我来开已是主动作；
      // building/verifying 排除——禁手工迁移口径 + 开工成功产生的 building 行不得出现首位按钮）。
      if (["inbox", "triaged", "held", "closed", "shipped"].includes(c.stage)) {
        uxPrimary.append(btn(t("actions.moveTo") + " " + t("groups.gating"), () => go(() => api.stage(c.key, "gating", ""))));
      }
      if (c.work?.sessionId) uxPrimary.append(mkOpen(uxPrimary));
      if (freshReady || retryReady) uxPrimary.append(mkStart(uxPrimary));
      uxPrimary.append(...mkG1Pair());
      if (c.taskPackage) uxPrimary.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      const uxChips = row(); uxChips.className = "stage-chips";
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        uxChips.append(btn(t("actions.moveTo") + " " + label, () => go(() => api.stage(c.key, s, "")), c.stage === s));
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
      uxOverride.append(v2, u2, a2, reason2, btn(t("actions.override"), () => go(() => api.override({ key: c.key, validity: v2.value, urgency: u2.value, action: a2.value, reason: reason2.value, lang }))));
      details.append(uxOverride);
      uxNarrow.append(uxPrimary, uxChips, details);
      detail.append(uxNarrow);
      // M8 T2/D3：模型观测展示（entries join " · "——runRow chip join 先例；字面量不译）
      const modelEntries = Object.entries(runInfo?.models ?? {});
      if (modelEntries.length > 0) {
        const modelChip = document.createElement("span");
        modelChip.className = "chip";
        modelChip.textContent = "model: " + modelEntries.map(([nid, m]) => nid + " " + m).join(" · ");
        gates.append(modelChip);
      }
      const g2Ready = runInfo?.waitingGate === "g2";   // 评审 D6/R1-19：G2 从字面量禁用改为挂起激活；G3 仍禁用（M3 发版分区）
      gates.append(
        btn("G1 " + t("gates.G1") + " · " + t("actions.pass"), () => go(async () => { const r = await api.gate(c.key, "G1", "pass", ""); if (r.taskPackage) await copy(r.taskPackage); }), !g.G1),
        btn("G1 · " + t("actions.reject"), () => go(() => api.gate(c.key, "G1", "reject", "")), !g.G1),
        btn("G2 " + t("gates.G2") + " · " + t("actions.pass"), () => go(() => api.runGate(runInfo.id, "g2", "pass", "")), !g2Ready),
        btn("G2 · " + t("actions.reject"), () => go(() => api.runGate(runInfo.id, "g2", "reject", "")), !g2Ready),
        btn("G3 " + t("gates.G3"), () => {}, true),
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      if (runInfo) {
        const runRow = row();
        const st = document.createElement("span");
        st.className = "chip";
        st.textContent = t("run.status." + runInfo.status) + ((runInfo.currentNodeIds ?? []).length ? " · " + runInfo.currentNodeIds.join("/") : "");
        runRow.append(st);
        if (runInfo.status === "running" && (runInfo.currentNodeIds ?? []).length === 0) {
          const cl = document.createElement("span"); cl.className = "chip"; cl.style.opacity = ".7"; cl.textContent = t("run.workspaceCloning");
          runRow.append(cl);
        }
        if (runInfo.error) { const err = document.createElement("span"); err.className = "chip"; err.style.color = "crimson"; err.textContent = runInfo.error; runRow.append(err); }
        runRow.append(
          btn(t("actions.retryRun"), () => go(() => api.runRetry(runInfo.id, [...(runInfo.failedNodeIds ?? []), ...(runInfo.cancelledNodeIds ?? [])][0] ?? "")), !((runInfo.status === "failed" || runInfo.status === "cancelled") && [...(runInfo.failedNodeIds ?? []), ...(runInfo.cancelledNodeIds ?? [])].length > 0)),   // M7/§18.3：数据源扩 cancelled（retryNode 已支持——M2 R1-9）；failedNodeIds 沿 M2 产出评审问题 1
          btn(t("actions.cancelRun"), () => go(() => api.runCancel(runInfo.id, "user")), !(runInfo.status === "running" || runInfo.status === "waiting")),
        );
        detail.append(runRow);
      }
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    },
  };
}
