import { api } from "../api.mjs";
import { pickTriageBatch, gateState, settingsPatch, runBlock } from "../logic.mjs";
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
  const fill = (providers, hostDefault) => {
    modelSel.innerHTML = "";
    const follow = document.createElement("option");
    follow.value = "";
    follow.textContent = t("settings.followDefault") + "（" + (hostDefault ? hostDefault.provider + " / " + hostDefault.model : "—") + "）";
    modelSel.append(follow);
    let listed = false;
    for (const p of providers) {
      const og = document.createElement("optgroup");
      og.label = p.name || p.provider;
      for (const m of p.models) {
        const o = document.createElement("option");
        o.value = p.provider + "\n" + m.id;
        o.textContent = m.name || m.id;
        if (initialModel && p.provider === initialModel.provider && m.id === initialModel.model) listed = true;
        og.append(o);
      }
      modelSel.append(og);
    }
    if (initialModel && !listed) {
      const o = document.createElement("option");
      o.value = valueOf(initialModel);
      o.textContent = initialModel.provider + " / " + initialModel.model + " " + t("settings.notInCatalog");
      modelSel.append(o);
    }
    modelSel.value = valueOf(initialModel);
  };
  fill([], null);
  api.models().then((r) => fill(r.providers, r.hostDefault)).catch(() => {});
  const modelLabel = document.createElement("label");
  modelLabel.textContent = t("settings.triageModel");
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
      await api.putSettings(settingsPatch(current ?? {}, { intervalMinutes: Number(input.value), modelValue: modelSel.value }));
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
  feishuRow.append(btn(t("feishu.test"), async () => {
    feishuMsg.textContent = "";
    try {
      await api.putFeishuWebhook(feishuInput.value.trim());
      const r = await api.feishuTest();
      feishuMsg.textContent = r.sent ? t("feishu.testOk") : t("feishu.testFail");
    } catch (e) { feishuMsg.textContent = e.message; }
  }));
  feishuRow.append(feishuMsg);
  dialog.append(title, label, input, modelLabel, modelSel, err, save, feishuLabel, feishuInput, feishuRow);
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

export function installActions({ getLang }) {
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
          btn(t("actions.retryRun"), () => go(() => api.runRetry(run.id, (run.failedNodeIds ?? [])[0] ?? "")), !(run.status === "failed" && (run.failedNodeIds ?? []).length > 0)),   // 产出评审问题 1：目标取 failedNodeIds（currentNodeIds 永不含 failed）
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
