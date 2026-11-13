import { makeT } from "../i18n.mjs";
import { groupCandidates, filterCandidates } from "../logic.mjs";
import { api } from "../api.mjs";
import { renderRow } from "./candidateRow.mjs";
import { renderLoginGate } from "./loginGate.mjs";

const CSS = [
  ":host{display:flex;flex-direction:column;height:100%;font-size:14px;line-height:1.45;color:inherit}",
  "header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  "h2{font-size:15px;margin:0 8px 0 0;font-weight:600}",
  "button,select,input{font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:6px;padding:3px 10px;cursor:pointer}",
  "button:hover:not(:disabled){background:color-mix(in srgb,currentColor 7%,transparent)}",
  "button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid color-mix(in srgb,currentColor 55%,transparent);outline-offset:1px}",
  "button:disabled{opacity:.45;cursor:default}",
  ".meta{margin-left:auto;font-size:12px;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".bar{display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap}",
  "main{flex:1;overflow:auto;padding:0 16px 24px}",
  ".group>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 4px;color:color-mix(in srgb,currentColor 60%,transparent)}",
  ".group.dim{opacity:.6}",
  ".row{display:flex;align-items:center;gap:8px;min-height:32px;border-bottom:1px solid color-mix(in srgb,currentColor 7%,transparent)}",
  ".row .title{flex:1;min-width:0;text-align:left;border:none;padding:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".badge{font-size:11px;font-weight:600;padding:0 6px;border-radius:4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent)}",
  ".chip{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);white-space:nowrap}",
  ".chip.u-P0{font-weight:600;border-color:currentColor}",
  ".chip.muted{color:color-mix(in srgb,currentColor 45%,transparent)}",
  ".detail{padding:8px 0 12px 44px;display:flex;flex-direction:column;gap:8px}",
  ".detail .reason{margin:0;color:color-mix(in srgb,currentColor 75%,transparent)}",
  ".empty,.error{padding:24px 0;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-height:24px}",
  ".intake>h3,.triage>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 6px;color:color-mix(in srgb,currentColor 60%,transparent)}",
  /* 登录闸：全屏遮罩压暗皮肤壁纸 → 居中卡片（近不透明 + 功能性 blur 保证任何皮肤下可读） */
  ".gateWrap{position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:color-mix(in srgb,canvas 78%,transparent);overflow:auto}",
  ".gate{width:min(440px,100%);margin:auto;display:flex;flex-direction:column;padding:28px 28px 20px;border-radius:14px;background:color-mix(in srgb,canvas 96%,transparent);backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 32px 64px -24px rgb(0 0 0 /.4),0 4px 16px rgb(0 0 0 /.14);animation:gate-in 220ms cubic-bezier(.22,1,.36,1)}",
  "@media (prefers-reduced-motion:reduce){.gate{animation:none}}",
  "@keyframes gate-in{from{transform:translateY(8px);opacity:.6}}",
  ".gateHead{display:flex;align-items:center;justify-content:space-between;gap:10px}",
  /* 图标衬底：取图标主蓝做 tint plate——浅皮淡蓝瓷面、深皮深蓝绒面，柔影托起彩色图标 */
  ".gateMark{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,#324DE2 9%,canvas);border:1px solid color-mix(in srgb,#324DE2 20%,canvas);box-shadow:0 2px 6px rgb(50 77 226 /.16),0 8px 20px -8px rgb(50 77 226 /.28)}",
  ".gateMark svg{display:block}",
  ".gate h3{font-size:16px;font-weight:650;margin:14px 0 0;letter-spacing:-.01em}",
  ".gate .intro{margin:6px 0 0;font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 62%,transparent)}",
  ".gateStatus{display:flex;gap:6px;margin:14px 0 0;flex-wrap:wrap}",
  ".pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".pill .dot{width:7px;height:7px;border-radius:50%}",
  ".pill .dot.ok{background:#2da44e}",
  ".pill .dot.miss{background:#d29922}",
  ".gate code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:5px;padding:1px 6px;background:color-mix(in srgb,currentColor 5%,transparent)}",
  ".gate a{color:inherit;text-underline-offset:2px}",
  /* 状态机 CTA：每个状态只有一个主行动按钮，窄屏整行可点 */
  ".gate .cta{width:100%;height:44px;margin:18px 0 0;padding:0 18px;font-weight:600;font-size:14.5px;border:none;border-radius:10px;background:canvastext;color:canvas;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".gate .cta:hover:not(:disabled){background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".gate .cta:disabled{opacity:.6}",
  ".gateCode{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 0;padding:12px 16px;border-radius:10px;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  ".gateCode b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:.08em}",
  ".gateLink{display:block;margin:10px 0 0;font-size:13px;color:inherit;text-underline-offset:2px}",
  "@media (max-width:520px){.gateWrap{padding:12px}.gate{padding:22px 16px 14px;border-radius:12px}.gate h3{font-size:15px}.gate .intro{font-size:13px}.gateCode b{font-size:22px}}",
  ".gate .err{font-size:13px;line-height:1.5;display:none;margin:12px 0 0;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".gate .note{margin:14px 0 0;padding:12px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.55;color:color-mix(in srgb,currentColor 52%,transparent)}",
].join("\n");

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function mountWorkbench(shadow, { getLang, build, extend } = {}) {
  let state = null;
  let authInfo = null;
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  const filters = { type: "all", repo: "all", urgency: "all" };
  const expanded = new Set();
  const view = {};

  const select = (pairs, value, onChange, label) => {
    const s = el("select");
    s.setAttribute("aria-label", label);
    for (const [v, text] of pairs) { const o = el("option", null, text); o.value = v; s.append(o); }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  };

  const paint = () => {
    if (disposed) return;
    const t = makeT(getLang());
    shadow.innerHTML = "";
    shadow.host.dataset.dshLBuild = build;
    const style = el("style"); style.textContent = CSS;
    // 收活闸门：未拿到 state 先给加载态；未绑定账号（auth.account 空）整台退回登录界面。
    if (!state) {
      shadow.append(style, el("div", "empty", error ? t("errors.refreshFailed") + " (" + error + ")" : t("auth.loading")));
      return;
    }
    if (!state.auth?.account) {
      shadow.append(style);
      renderLoginGate(shadow, { t, status: authInfo, onConnected: () => view.reload() });
      return;
    }
    const header = el("header");
    header.append(el("h2", null, t("panelLabel")));
    const refreshBtn = el("button", null, busy ? t("refreshing") : t("refresh"));
    refreshBtn.type = "button";
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    extend?.header?.(header, { t, state, view });
    const account = state?.auth?.login || state?.auth?.account;
    if (account) {
      const who = el("span", "chip", t("auth.connected") + " " + account);
      who.title = t("auth.logoutHint");
      header.append(who);
      const out = el("button", null, t("auth.logout"));
      out.type = "button";
      out.onclick = async () => {
        out.disabled = true;
        try { await api.logout(); } catch (e) { console.warn("[dsh-l]", e); }
        await view.reload();
      };
      header.append(out);
    }
    const last = state?.snapshots?.lastIngestAt;
    header.append(el("span", "meta", t("meta.lastRefreshAt") + ": " + (last ? new Date(last).toLocaleString(getLang()) : "—")));
    const strip = el("div", "strip");
    extend?.strip?.(strip, { t, state });
    const bar = el("div", "bar");
    const repos = [...new Set((state?.candidates ?? []).map((c) => c.repo))].sort();
    bar.append(
      select([["all", t("filters.all")], ["issue", t("filters.issues")], ["pull", t("filters.pullRequests")]], filters.type, (v) => { filters.type = v; paint(); }, t("filters.all")),
      select([["all", t("filters.repo")], ...repos.map((r) => [r, r])], filters.repo, (v) => { filters.repo = v; paint(); }, t("filters.repo")),
      select([["all", t("filters.urgency")], ...["P0", "P1", "P2", "P3"].map((u) => [u, t("urgency." + u)])], filters.urgency, (v) => { filters.urgency = v; paint(); }, t("filters.urgency")),
    );
    extend?.bar?.(bar, { t, state, filters, view });
    const main = el("main");
    // 板块一：收活 —— 已连接账号下的仓源概况与监看管理入口。
    const intake = el("section", "intake");
    intake.append(el("h3", null, t("sections.intake")));
    const intakeChips = el("div", "chips");
    const watchRepos = state?.watch?.repos ?? [];
    const perRepo = state?.snapshots?.perRepo ?? {};
    let issueCount = 0; let pullCount = 0;
    for (const r of Object.values(perRepo)) { issueCount += r.issues ?? 0; pullCount += r.pulls ?? 0; }
    intakeChips.append(
      el("span", "chip", watchRepos.length + " " + t("intake.repos")),
      el("span", "chip", "Issue " + issueCount),
      el("span", "chip", "PR " + pullCount),
    );
    if (watchRepos.length === 0) intakeChips.append(el("span", "chip muted", t("intake.none")));
    extend?.intake?.(intakeChips, { t, state, view });
    intake.append(intakeChips);
    // 板块二：分诊与拍板 —— 管线条 + 过滤条 + 阶段分组列表。
    const triage = el("section", "triage");
    triage.append(el("h3", null, t("sections.triage")), strip, bar);
    if (error) triage.append(el("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) triage.append(el("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      triage.append(el("div", "empty", t("emptyStates.backlog")));
    } else {
      for (const group of groupCandidates(list, t)) {
        if (group.items.length === 0) continue;
        const sec = el("section", "group" + (group.dim ? " dim" : ""));
        sec.append(el("h3", null, group.label + " · " + group.items.length));
        for (const c of group.items) {
          renderRow(sec, c, t, {
            expanded: expanded.has(c.key),
            onToggle: (key) => { if (expanded.has(key)) expanded.delete(key); else expanded.add(key); paint(); },
            actions: extend?.rowActions ? (detail, cand) => extend.rowActions(detail, cand, { t, view, lang: getLang() }) : undefined,
          });
        }
        triage.append(sec);
      }
    }
    main.append(intake, triage);
    shadow.append(style, header, main);
  };

  view.reload = async () => {
    const [s, a] = await Promise.allSettled([api.state(), api.auth()]);
    if (s.status === "fulfilled") { state = s.value; error = null; } else { error = s.reason?.message ?? String(s.reason); }
    authInfo = a.status === "fulfilled" ? a.value : null;
    paint();
  };
  view.refresh = async () => {
    busy = true; paint();
    try {
      const r = await api.refresh();
      notice = r.authenticated === false ? makeT(getLang())("errors.noToken") : null;
    } catch (e) { error = e.message; }
    busy = false;
    await view.reload();
  };
  view.relabel = paint;
  view.dispose = () => { disposed = true; shadow.innerHTML = ""; };
  view.state = () => state;
  view.shadow = shadow;
  paint();
  view.reload();
  return view;
}
