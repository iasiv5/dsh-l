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
  concLabel.textContent = "并发上限（1–4）";
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
    hostDefaultRow.textContent = "默认模型：" + (r.hostDefault ? r.hostDefault.provider + " / " + r.hostDefault.model : "（宿主未配置）");
  }).catch(() => {});
  const hostDefaultRow = document.createElement("div");
  hostDefaultRow.style.cssText = "font-size:12px;opacity:.75";
  hostDefaultRow.textContent = "默认模型：（加载中）";
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

export function installActions({ getLang, openWorkSession = () => false }) {
  let lastRuns = [];   // strip 钩子先于行渲染被调（workbench 组装顺序），行内 run 区块由此取 runs 摘要
  const run = (view) => async (fn) => {
    try { await fn(); } catch (e) { console.warn("[dsh-l]", e); }
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
      const override = row();
      override.append(v, u, a, reason, btn(t("actions.override"), () => go(() => api.override({ key: c.key, validity: v.value, urgency: u.value, action: a.value, reason: reason.value, lang }))));
      const stages = row();
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        stages.append(btn(t("actions.moveTo") + " " + label, () => go(() => api.stage(c.key, s, "")), c.stage === s));
      }
      const gates = row();
      const g = gateState(c);
      const run = runBlock(c, lastRuns);
      // 开工会话（GLOSSARY「开工会话」）：双入口——「打开会话」（有活跃行，任意 stage，直达 openSession）
      // 与「我来开」（fresh：gating 未放行；重试态：G1 pass + building 且无活跃行——kickoff 失败恢复出口，
      // 评审 R3-2；文案统一中性，评审建议①）。openWorkSession 守卫失败/开工失败就地 chip 呈现。
      const workRow = row();
      const workChip = (text, warn = false) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.style.opacity = warn ? "1" : ".8";
        if (warn) chip.style.color = "crimson";
        chip.textContent = text;
        return chip;
      };
      if (c.work?.sessionId) {
        workRow.append(btn(t("work.openBtn"), () => {
          if (!openWorkSession(c.work.sessionId)) workRow.append(workChip(t("work.openPending")));
        }));
      }
      const freshReady = g.G1 === true;
      const retryReady = c.gates?.G1?.decision === "pass" && c.stage === "building" && !c.work;
      if (freshReady || retryReady) {
        workRow.append(btn(t("work.startBtn"), () => go(async () => {
          const r = await api.workStart(c.key, null, retryReady && !freshReady, lang);
          if (r?.ok && r.sessionId) {
            if (!r.reused && !openWorkSession(r.sessionId)) workRow.append(workChip(t("work.openPending")));
          } else if (r?.error) {
            workRow.append(workChip(t("work.startFailed") + " (" + r.error + ")", true));
          }
        })));
      }
      if (workRow.childNodes.length > 0) detail.append(workRow);
      // M8 T2/D3：模型观测展示（entries join " · "——runRow chip join 先例；字面量不译）
      const modelEntries = Object.entries(run?.models ?? {});
      if (modelEntries.length > 0) {
        const modelChip = document.createElement("span");
        modelChip.className = "chip";
        modelChip.textContent = "model: " + modelEntries.map(([nid, m]) => nid + " " + m).join(" · ");
        gates.append(modelChip);
      }
      const g2Ready = run?.waitingGate === "g2";   // 评审 D6/R1-19：G2 从字面量禁用改为挂起激活；G3 仍禁用（M3 发版分区）
      gates.append(
        btn("G1 " + t("gates.G1") + " · " + t("actions.pass"), () => go(async () => { const r = await api.gate(c.key, "G1", "pass", ""); if (r.taskPackage) await copy(r.taskPackage); }), !g.G1),
        btn("G1 · " + t("actions.reject"), () => go(() => api.gate(c.key, "G1", "reject", "")), !g.G1),
        btn("G2 " + t("gates.G2") + " · " + t("actions.pass"), () => go(() => api.runGate(run.id, "g2", "pass", "")), !g2Ready),
        btn("G2 · " + t("actions.reject"), () => go(() => api.runGate(run.id, "g2", "reject", "")), !g2Ready),
        btn("G3 " + t("gates.G3"), () => {}, true),
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      if (run) {
        const runRow = row();
        const st = document.createElement("span");
        st.className = "chip";
        st.textContent = t("run.status." + run.status) + ((run.currentNodeIds ?? []).length ? " · " + run.currentNodeIds.join("/") : "");
        runRow.append(st);
        if (run.status === "running" && (run.currentNodeIds ?? []).length === 0) {
          const cl = document.createElement("span"); cl.className = "chip"; cl.style.opacity = ".7"; cl.textContent = t("run.workspaceCloning");
          runRow.append(cl);
        }
        if (run.error) { const err = document.createElement("span"); err.className = "chip"; err.style.color = "crimson"; err.textContent = run.error; runRow.append(err); }
        runRow.append(
          btn(t("actions.retryRun"), () => go(() => api.runRetry(run.id, [...(run.failedNodeIds ?? []), ...(run.cancelledNodeIds ?? [])][0] ?? "")), !((run.status === "failed" || run.status === "cancelled") && [...(run.failedNodeIds ?? []), ...(run.cancelledNodeIds ?? [])].length > 0)),   // M7/§18.3：数据源扩 cancelled（retryNode 已支持——M2 R1-9）；failedNodeIds 沿 M2 产出评审问题 1
          btn(t("actions.cancelRun"), () => go(() => api.runCancel(run.id, "user")), !(run.status === "running" || run.status === "waiting")),
        );
        detail.append(runRow);
      }
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    },
  };
}
