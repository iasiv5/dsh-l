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
  ".gate{max-width:520px;margin:40px auto;display:flex;flex-direction:column;gap:12px;padding:0 4px}",
  ".gate h3{font-size:16px;font-weight:600;margin:0}",
  ".gate .intro{margin:0;color:color-mix(in srgb,currentColor 65%,transparent)}",
  ".gate .steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:5px;color:color-mix(in srgb,currentColor 75%,transparent)}",
  ".gate code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:4px;padding:0 5px}",
  ".gate a{color:inherit;text-underline-offset:2px}",
  ".gate form{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
  ".gate form label{display:flex;gap:8px;align-items:center;flex:1;min-width:220px}",
  ".gate form input{flex:1;min-width:0}",
  ".gate .err{font-size:13px;display:none;border:1px solid color-mix(in srgb,currentColor 28%,transparent);border-radius:6px;padding:6px 10px}",
  ".gate .note{margin:0;font-size:12px;color:color-mix(in srgb,currentColor 50%,transparent)}",
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
