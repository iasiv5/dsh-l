import { api } from "../api.mjs";
import { makeT } from "../i18n.mjs";
import { pickTriageBatch, gateState, settingsPatch, workSessionSettingsPatch, runBlock, startable, runDirName, errorText } from "../logic.mjs";
import { renderRunDetail } from "./runDetail.mjs";
import { withPending } from "./uiFeedback.mjs";
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
  b.type = "button"; b.textContent = text; b.disabled = disabled; b.onclick = withPending(b, onClick);   // P1-2：pending 态包装
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
// pickDirectory + 脏态警示不阻止，评审 Q10）｜托管克隆（workspace:"managed"）。
// 返回值（收敛 M2 Task 13）：undefined＝取消或点遮罩，什么都不做；null＝「本地默认检出」（服务端解析目录并写记忆）；
// "managed"＝托管克隆；字符串＝所选目录。确认框注入可测；活体走原生 confirm。
// 去向提示（design-v2 §20 第 14、28 条）：三个选项各一行「会话将出现在哪」，未登记的目录显示「未分组」。
export function pickWorkspace(shadow, { t, candidate, ui = {}, status = async () => ({ exists: false, isRepo: false, dirty: false, branch: null, workspaceTitle: null }), confirm = (msg) => Boolean(globalThis.confirm?.(msg)), defaultDir = null, note: initialNote = null } = {}) {
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
    const appears = document.createElement("div");   // 所选目录的去向（脏态确认步骤里与警示行并列）
    appears.className = "wtip";
    appears.style.display = "none";
    const hints = document.createElement("div");   // 三行去向提示
    const localLine = document.createElement("div");
    localLine.className = "wtip";
    const pickLine = document.createElement("div");
    pickLine.className = "wtip";
    pickLine.textContent = t("work.appearsPick");
    const managedLine = document.createElement("div");
    managedLine.className = "wtip";
    managedLine.textContent = t("work.appearsManaged");
    hints.append(localLine, pickLine, managedLine);
    let done = false;
    const finish = (v) => { if (done) return; done = true; overlay.remove(); resolve(v); };
    let currentButtons = [];
    const setButtons = (...bs) => { for (const b of currentButtons) b.remove(); currentButtons = bs; dialog.append(...bs); };
    const showMain = () => {
      note.style.display = "none";
      appears.style.display = "none";
      setButtons(
        btn(t("work.pickLocal"), () => finish(null)),
        btn(t("work.pickBrowse"), () => { pickDir(); }),
        btn(t("work.pickManaged"), () => finish("managed")),
        btn(t("work.pickCancel"), () => finish(undefined)),
      );
    };
    const pickDir = async () => {
      let cwd = null;
      try { cwd = await ui.pickDirectory?.() ?? null; } catch { cwd = null; }
      if (!cwd) { showMain(); return; }
      let st = null;
      try { st = await status(cwd); } catch { st = null; }
      appears.textContent = t("work.appearsAt").replace("{where}", st?.workspaceTitle ?? t("work.ungrouped"));
      appears.style.display = "block";
      if (st?.dirty) {
        note.textContent = t("work.dirtyHint") + (st.branch ? " · " + st.branch : "");
        note.style.display = "block";
        setButtons(
          btn(t("work.pickProceed"), async () => {
            let ok = true;
            try { ok = await confirm(note.textContent + " " + appears.textContent); } catch { ok = false; }
            finish(ok ? cwd : undefined);
          }),
          btn(t("work.pickCancel"), () => finish(undefined)),
        );
      } else {
        finish(cwd);
      }
    };
    overlay.onclick = (e) => { if (e && e.target === overlay) finish(undefined); };
    dialog.append(title, sub, hints, note, appears);
    if (initialNote) { note.textContent = initialNote; note.style.display = "block"; }
    overlay.append(dialog);
    shadow.append(overlay);
    showMain();
    // 本地默认检出的去向异步补上，不阻塞选择（defaultDir = GET /dsh-l/work/default-dir）。
    Promise.resolve().then(() => defaultDir?.(candidate.repo)).then((r) => {
      if (done) return;
      localLine.textContent = r?.exists
        ? t("work.appearsDefault").replace("{dir}", r.cwd).replace("{where}", r.workspaceTitle ?? t("work.ungrouped"))
        : t("work.pickLocalFailed");
    }).catch(() => { if (!done) localLine.textContent = t("work.pickLocalFailed"); });
  });
}
export function installActions({ getLang, openWorkSession = () => false, pickDirectory = null, sessionsFeed = null, deps = {} } = {}) {
  const a = deps.api ?? api;   // deps seam（计划 §3-10）：覆盖受测路径（rowActions/bar/startAnother），openSettings 等未受测路径维持模块 api
  let lastRuns = [];   // strip 钩子先于行渲染被调（workbench 组装顺序），行内 run 区块由此取 runs 摘要
  let lastState = null;   // 收敛 M2 Task 13：settings.workDirs（目录记忆）与 paths（确认条执行目录）的数据源
  return {
    // Task 12：会话板块 hooks——openWorkSession（导航）、sessionsFeed（sessions.list 投影）、startAnother（另开）。
    openWorkSession,
    sessionsFeed: () => (sessionsFeed ? sessionsFeed() : []),
    // 无目录不发起（不得回退到本地检出）；有目录照常另开。
        startAnother: async (key, cwd, t) => {
          if (!cwd) return null;   // 无目录不发起（不得回退到本地检出）
          const r = await a.workStart(key, cwd, true, getLang());
          if (r?.ok) return null;
          const tt = t ?? makeT(getLang());   // t 缺省时用当前语言兜底——不传 t 也要能翻译，而不是回落括注（评审第 3 轮红一）
          const head = tt("sessions.anotherFailed");   // 走兜底后的 tt，不传 t 也不中英混排（评审 Q25）。须在 tt 定义之后——const 有暂时性死区，先写 head 会报 Cannot access tt before initialization（执行方自检实测）
          const human = errorText(r?.error, tt);
          return human ? head + "：" + human : head + " (" + String(r?.error ?? "unknown") + ")";
        },
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
    strip(container, { t, state, stagePick, stageFilter }) {
      lastRuns = state?.runs ?? [];   // 评审 R1-15：着色数据源
      lastState = state ?? null;
      renderStrip(container, { t, candidates: state?.candidates ?? [], workflow: state?.workflow, runs: lastRuns, onStagePick: stagePick, stageFilter });   // P1-6：透传联动回调
    },
    bar(bar, { t, state, filters, view }) {
      const errLine = document.createElement("small");
      errLine.className = "rowerr";   // P1 小债 A：批量分诊失败就地呈现（原 run(view) console.warn 吞错清偿）
      errLine.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);font-size:12px";
      errLine.style.display = "none";
      const keys = pickTriageBatch(state?.candidates ?? [], filters);
      bar.append(btn(t("actions.triageBatch") + " (" + keys.length + ")", async () => {
        try { await a.triage(keys, getLang()); errLine.textContent = ""; errLine.style.display = "none"; await view.reload(); }
        catch (e) { errLine.textContent = errorText(e, t) ?? (t("errors.actionFailed") + " (" + (e?.message ?? e) + ")"); errLine.style.display = "block"; }   // 失败不 reload（P0 不变式）
      }, keys.length === 0));
      bar.append(errLine);
    },
    rowActions(detail, c, { t, view, lang }) {
      const errLine = document.createElement("small");
      errLine.className = "rowerr";   // P0-5c：行内错误就地呈现位（吞错路径统一走 go）
      errLine.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);font-size:12px";
      errLine.style.display = "none";
      detail.prepend(errLine);
      const go = async (fn) => {
        try { await fn(); errLine.textContent = ""; errLine.style.display = "none"; await view.reload(); }
        catch (e) { errLine.textContent = errorText(e, t) ?? (t("errors.actionFailed") + " (" + (e?.message ?? e) + ")"); errLine.style.display = "block"; }   // 失败不 reload：全量重绘会立即抹掉错误行（rev-impl B1；与 kanban 同构——失败未改服务端状态）
      };
      const tr = c.triage ?? { validity: "medium", urgency: "P2", action: "hold", reason: "" };
      const v = sel(["high", "medium", "low"].map((x) => [x, t("validity." + x)]), tr.validity);
      const u = sel(["P0", "P1", "P2", "P3"].map((x) => [x, t("urgency." + x)]), tr.urgency);
      const actSel = sel(["start", "feedback", "close", "hold"].map((x) => [x, t("recommendedActions." + x)]), tr.action);   // 原名 a——与 deps seam 变量撞名遮蔽（Task 9 实测揪出）
      const reason = document.createElement("input");
      reason.value = tr.reason ?? "";
      reason.placeholder = t("actions.reason");
      // ── 人工推翻 + 阶段迁移（桌面既有行，ux-wide；窄视口由 ux-narrow 折叠/chips 接管——评审 Task 3 双渲染）──
      const override = row();
      override.className += " ux-wide";
      override.append(v, u, actSel, reason, btn(t("actions.override"), () => go(() => a.override({ key: c.key, validity: v.value, urgency: u.value, action: actSel.value, reason: reason.value, lang }))));
      const stages = row();
      stages.className += " ux-wide";
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        stages.append(btn(t("actions.moveTo") + " " + label, () => go(() => a.stage(c.key, s, "")), c.stage === s));
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
        if (warn) chip.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
        chip.textContent = text;
        target.append(chip);
      };
      const mkOpen = (target) => btn(t("work.openBtn"), () => {
        if (!openWorkSession(c.work.sessionId)) workChip(target, t("work.openPending"));
      });
      // 收敛 M2 Task 13（design-v2 §20 第 13、28 条）：按仓库记住的目录一键直达；首次或目录失效才弹选择器。
      // 选择器返回值：undefined＝取消；null＝本地默认检出（服务端解析目录并写记忆）；"managed"＝托管克隆；字符串＝所选目录。
      const pickOpts = (extra = {}) => ({ t, candidate: c, ui: { pickDirectory }, status: (cwd) => api.workspaceStatus(cwd), defaultDir: (repo) => a.workDefaultDir(repo), ...extra });
      // startIn：按选择器返回值分流发起开工（mkStart 的三条路径与「更多 › 换个目录开工」共用）。
      const startIn = (target, pick) => async () => {
        if (pick === undefined) return;
        const anotherFlag = c.gates?.G1?.decision === "pass" && c.stage === "building";   // 重试态：靠 another 过 stage 守卫
        const r = pick === "managed"
          ? await a.workStart(c.key, null, anotherFlag, lang, "managed")
          : await a.workStart(c.key, pick, anotherFlag, lang);
        if (r?.ok && r.sessionId) {
          if (!r.reused && !openWorkSession(r.sessionId)) workChip(target, t("work.openPending"));
        } else if (r?.error) {
            const failedOpen = errorText(r.error, t);
            workChip(target, failedOpen ? t("work.startFailed") + "：" + failedOpen : t("work.startFailed") + " (" + r.error + ")", true);
        }
      };
      const mkStart = (target) => btn(t("work.startBtn"), () => go(async () => {
        const remembered = lastState?.settings?.workDirs?.[c.repo];
        if (remembered === "managed") return startIn(target, "managed")();
        if (typeof remembered === "string" && remembered) {
          try { return await startIn(target, remembered)(); }
          catch (e) {
            if (String(e?.message ?? e) !== "workspace-not-found") throw e;   // 记住的目录已不存在 → 回落选择器并说明
            return startIn(target, await pickWorkspace(view.shadow, pickOpts({ note: t("work.dirGone") })))();
          }
        }
        return startIn(target, await pickWorkspace(view.shadow, pickOpts()))();
      }));
      // 「开工」按钮下的小字：记住的目录 / 托管克隆 / 首次提示。
      const startDirTip = () => {
        const remembered = lastState?.settings?.workDirs?.[c.repo];
        const tip = document.createElement("span");
        tip.className = "wtip";
        tip.textContent = remembered === "managed" ? t("work.dirManaged")
          : (typeof remembered === "string" && remembered ? t("work.dirMemory").replace("{dir}", remembered) : t("work.dirFirst"));
        return tip;
      };
      // 收敛 M2 Task 14（design-v2 §20 第 28 条）：「自动执行」的行内确认条——四行事实 + 确认 / 取消。
      // 不是浮层；「确认执行」不做反色（One Voice：该行唯一的反色主 CTA 是「开工」）。
      const autoHost = document.createElement("div");
      const mkAutoRun = () => btn(t("work.autoRun"), () => {
        const base = lastState?.paths?.workspacesDir;
        const runDir = (base || "…/workspaces") + "/" + runDirName(c.key);
        const block = document.createElement("div");
        block.className = "autorun";
        const head = document.createElement("div");
        head.textContent = t("work.autoConfirmTitle");
        const line = (text) => { const ln = document.createElement("div"); ln.className = "wtip"; ln.textContent = text; return ln; };
        const acts = row();
        acts.append(
          btn(t("work.autoGo"), () => go(async () => { await a.runStart(c.key, ""); })),
          btn(t("work.pickCancel"), () => { autoHost.innerHTML = ""; }),
        );
        block.append(head,
          line(t("work.autoFactMode")),
          line(t("work.autoFactPath").replace("{dir}", runDir)),
          line(t("work.autoFactSession")),
          line(t("work.autoFactShip")),
          acts);
        autoHost.innerHTML = "";
        autoHost.append(block);
      });
      const workRow = row();
      workRow.className += " ux-wide";
      if (c.work?.sessionId) workRow.append(mkOpen(workRow));
      // 收敛 M2 Task 14（design-v2 §20 第 19、28 条）：可开工 = 待拍板 / 已分诊，或重试态（building + G1 pass + 无活跃行）；
      // 有存活执行（running / waiting）或已有会话则不出「开工」。「自动执行」只在可开工的 issue 行出现（ADR-0003）——
      // 选「开工」即记 G1 放行，行内不再有并列的 G1 放行 / 驳回按钮。
      const runAlive = Boolean(runInfo && ["running", "waiting"].includes(runInfo.status));
      const retryReady = c.gates?.G1?.decision === "pass" && c.stage === "building" && !c.work;
      const freshReady = startable(c) && !c.work?.sessionId && !runAlive;
      const canStart = !c.work?.sessionId && !runAlive && (freshReady || retryReady);
      const canAuto = freshReady && c.type === "issue";
      if (canStart) { workRow.append(mkStart(workRow)); workRow.append(startDirTip()); }
      if (canAuto) workRow.append(mkAutoRun());
      if (workRow.children.length > 0) detail.append(workRow);
      if (canAuto) detail.append(autoHost);   // 确认条紧跟工作行
      // 「更多」折叠（design-v2 §20 第 19、28 条；里程碑 3 再整体收敛行内动作）：换个目录开工 / 另开会话。
      // 行内 <details>，不用浮层（operate.md：overlay 会被滚动容器裁切）。
      // 另开只用「已记住的本地目录」（B13「仅限本地目录」）。托管记忆或无记录时不给入口：服务端对空目录会回退到
      // 用户的本地检出（审批 never），前端不替用户做这个选择（评审 M9 / 第 5 轮，主人 2026-11-24 定：隐藏）。
      const rememberedDir = lastState?.settings?.workDirs?.[c.repo];
      const anotherDir = typeof rememberedDir === "string" && rememberedDir && rememberedDir !== "managed" ? rememberedDir : null;
      const canAnother = Boolean(anotherDir) && (Boolean(c.work?.sessionId) || runAlive);
      if (canStart || canAnother || c.work?.sessionId) {
        const more = document.createElement("details");
        more.className = "override-box";
        const moreSum = document.createElement("summary");
        moreSum.textContent = t("actions.more");
        more.append(moreSum);
        if (canStart) more.append(btn(t("work.changeDir"), () => go(async () => startIn(more, await pickWorkspace(view.shadow, pickOpts()))())));
        if (c.work?.sessionId) {
          more.append(btn(t("work.endSession"), () => go(async () => { await a.workEnd(c.key); })));
        }
        if (canAnother) {
          more.append(btn(t("sessions.another"), () => go(async () => {
            const r = await a.workStart(c.key, anotherDir, true, lang);
            if (r?.ok && r.sessionId) {
              if (!r.reused && !openWorkSession(r.sessionId)) workChip(more, t("work.openPending"));
            } else if (r?.error) {
              const failedAnother = errorText(r.error, t);
              workChip(more, failedAnother ? t("work.startFailed") + "：" + failedAnother : t("work.startFailed") + " (" + r.error + ")", true);
            }
          })));
        }
        detail.append(more);
      }
      // ── 窄视口编排（ux-narrow：主动作行/阶段 chips/折叠人工推翻；桌面 display:none，像素零变化）──
      const uxNarrow = document.createElement("div");
      uxNarrow.className = "ux-narrow";
      const uxPrimary = row(); uxPrimary.className = "primary-actions";
      // 开工路径可发现性（disc 评审）：白名单源阶段 → 首位「移到 待拍板」（gating 态不插——我来开已是主动作；
      // building/verifying 排除——禁手工迁移口径 + 开工成功产生的 building 行不得出现首位按钮）。
      if (["inbox", "held", "closed", "shipped"].includes(c.stage)) {   // 收敛 M2 Task 14：已分诊可直接开工，不再需要先「移到 待拍板」
        uxPrimary.append(btn(t("actions.moveTo") + " " + t("groups.gating"), () => go(() => a.stage(c.key, "gating", ""))));
      }
      if (c.work?.sessionId) uxPrimary.append(mkOpen(uxPrimary));
      if (canStart) { uxPrimary.append(mkStart(uxPrimary)); uxPrimary.append(startDirTip()); }
      if (canAuto) uxPrimary.append(mkAutoRun());
      if (c.taskPackage) uxPrimary.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      const uxChips = row(); uxChips.className = "stage-chips";
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        uxChips.append(btn(t("actions.moveTo") + " " + label, () => go(() => a.stage(c.key, s, "")), c.stage === s));
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
      uxOverride.append(v2, u2, a2, reason2, btn(t("actions.override"), () => go(() => a.override({ key: c.key, validity: v2.value, urgency: u2.value, action: a2.value, reason: reason2.value, lang }))));
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
      gates.append(   // G1 放行并入「开工 / 自动执行」（design-v2 §20 第 28 条）；「不做」走人工推翻或关闭
        btn("G2 " + t("gates.G2") + " · " + t("actions.pass"), () => go(() => a.runGate(runInfo.id, "g2", "pass", "")), !g2Ready),
        btn("G2 · " + t("actions.reject"), () => go(() => a.runGate(runInfo.id, "g2", "reject", "")), !g2Ready),
        btn("G3 " + t("gates.G3"), () => {}, true),
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      if (runInfo) {
        const runRow = row();
        const st = document.createElement("span");
        st.className = "chip";
        st.textContent = t("run.status." + runInfo.status) + ((runInfo.currentNodeIds ?? []).length ? " · " + runInfo.currentNodeIds.join("/") : "");
        runRow.append(st);
        // 收敛 M1 Task 8（design-v2 §20 第 23 条行内部分）：按候选汇总全部 run 的会话（run 新→旧），逐个给「打开」入口。
        const runsOf = lastRuns.filter((r) => r.candidateKey === c.key).sort((x, y) => (x.id < y.id ? 1 : -1));   // run-<epochMs>-…：id 字典序即时间序
        const seenSessions = new Set();
        for (const s of runsOf.flatMap((r) => r.sessions ?? [])) {
          if (!s?.sessionId || seenSessions.has(s.sessionId)) continue;
          seenSessions.add(s.sessionId);
          runRow.append(btn(t("sessions.open") + " · " + (s.nodeName ?? s.nodeId), () => {
            if (!openWorkSession(s.sessionId)) workChip(runRow, t("sessions.badgeMissing"));   // 「不在会话列表」：未同步与已归档两种情况都如实；「另开」随 §20-19（里程碑 2）
          }));
        }
        if (runInfo.status === "running" && (runInfo.currentNodeIds ?? []).length === 0) {
          const cl = document.createElement("span"); cl.className = "chip"; cl.style.opacity = ".7"; cl.textContent = t("run.workspaceCloning");
          runRow.append(cl);
        }
        if (runInfo.error) { const err = document.createElement("span"); err.className = "chip"; err.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)"; err.textContent = runInfo.error; runRow.append(err); }
        runRow.append(
          btn(t("actions.retryRun"), () => go(() => a.runRetry(runInfo.id, [...(runInfo.failedNodeIds ?? []), ...(runInfo.cancelledNodeIds ?? [])][0] ?? "")), !((runInfo.status === "failed" || runInfo.status === "cancelled") && [...(runInfo.failedNodeIds ?? []), ...(runInfo.cancelledNodeIds ?? [])].length > 0)),   // M7/§18.3：数据源扩 cancelled（retryNode 已支持——M2 R1-9）；failedNodeIds 沿 M2 产出评审问题 1
          btn(t("actions.cancelRun"), () => go(() => a.runCancel(runInfo.id, "user")), !(runInfo.status === "running" || runInfo.status === "waiting")),
        );
        const detailWrap = document.createElement("div");   // P1-5：run 详情两槽位（节点/历史）
        detailWrap.style.display = "none";
        runRow.append(btn(t("run.detail"), () => {
          const open = detailWrap.style.display !== "none";
          detailWrap.style.display = open ? "none" : "";
          if (!open && detailWrap.children.length === 0) renderRunDetail(detailWrap, { t, run: runInfo });
        }));
        detail.append(runRow);
        detail.append(detailWrap);
      }
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    },
  };
}
