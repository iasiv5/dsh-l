import { makeT } from "../i18n.mjs";
import { groupCandidates, filterCandidates } from "../logic.mjs";
import { api } from "../api.mjs";
import { renderRow } from "./candidateRow.mjs";

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
].join("\n");

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function mountWorkbench(shadow, { getLang, build, extend } = {}) {
  let state = null;
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
    const header = el("header");
    header.append(el("h2", null, t("panelLabel")));
    const refreshBtn = el("button", null, busy ? t("refreshing") : t("refresh"));
    refreshBtn.type = "button";
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    extend?.header?.(header, { t, state, view });
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
    if (error) main.append(el("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) main.append(el("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      main.append(el("div", "empty", t("emptyStates.backlog")));
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
        main.append(sec);
      }
    }
    shadow.append(style, header, strip, bar, main);
  };

  view.reload = async () => {
    try { state = await api.state(); error = null; } catch (e) { error = e.message; }
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
