// run 详情（P1-5）：节点/历史两槽位 tab（工件槽砍除——artifacts 未持久化，见计划 §1.1）。
// 状态标签静态 switch（rev-plan B2）：白名单五态复用 run.status.*，pending/ready/skipped 走
// nodeState.* 静态字面量——禁止 t("run.status." + status) 动态拼接（白名单段值域仅 5）。
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const DOT_CLASS = { running: "st-running", waiting: "st-gating", succeeded: "st-done", failed: "st-failed", cancelled: "st-idle", pending: "st-idle", ready: "st-idle", skipped: "st-idle" };

function nodeStatusLabel(status, t) {
  switch (status) {
    case "running": return t("run.status.running");
    case "waiting": return t("run.status.waiting");
    case "succeeded": return t("run.status.succeeded");
    case "failed": return t("run.status.failed");
    case "cancelled": return t("run.status.cancelled");
    case "pending": return t("nodeState.pending");
    case "ready": return t("nodeState.ready");
    case "skipped": return t("nodeState.skipped");
    default: return status;
  }
}

export function renderRunDetail(container, { t, run, deps = {} } = {}) {
  let tab = "nodes";
  const paint = () => {
    container.innerHTML = "";
    const wrap = el("div", "rundetail");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:6px;border:1px dashed color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:8px;margin-top:4px";
    const tabs = el("div", "rvtabs");
    tabs.style.cssText = "display:flex;gap:6px";
    const mkTab = (id, label) => {
      const b = el("button", "rvtab" + (tab === id ? " is-active" : ""), label);
      b.type = "button";
      if (tab === id) b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0";
      b.onclick = () => { tab = id; paint(); };
      return b;
    };
    tabs.append(mkTab("nodes", t("run.tabNodes")), mkTab("history", t("run.tabHistory")));
    wrap.append(tabs);
    if (tab === "nodes") {
      const list = el("div", "rvnodes");
      for (const n of run.nodeStatuses ?? []) {
        const row = el("div", "rvnode");
        row.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap";
        row.append(el("span", "stdot " + (DOT_CLASS[n.status] ?? "st-idle")));
        row.append(el("span", "rvnname", n.name ?? n.id));
        row.append(el("span", "chip", nodeStatusLabel(n.status, t)));
        if (n.error) {
          const e = el("span", "chip", n.error);
          e.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";
          row.append(e);
        }
        list.append(row);
      }
      wrap.append(list);
    } else {
      const hist = [...(run.history ?? [])].reverse();   // 追加式事件流，新事件在前
      if (hist.length === 0) {
        wrap.append(el("div", "rvhistempty", t("run.emptyHistory")));
      } else {
        const list = el("div", "rvhist");
        for (const h of hist) {
          const row = el("div", "rvhrow");
          row.style.cssText = "display:flex;gap:8px;align-items:baseline;flex-wrap:wrap";
          const at = el("span", "rvhat", h.at ?? "");
          at.style.cssText = "opacity:.6;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px";
          row.append(at);
          row.append(el("span", "chip", h.event ?? ""));
          if (h.detail) { const dd = el("span", "rvhdetail", h.detail); dd.style.cssText = "opacity:.75;font-size:12px"; row.append(dd); }
          list.append(row);
        }
        wrap.append(list);
      }
    }
    container.append(wrap);
  };
  paint();
  return { setTab: (id) => { tab = id; paint(); } };
}
