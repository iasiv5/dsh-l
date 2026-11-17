import { needsReview } from "../logic.mjs";

// 待我确认视图（design-v2 §13.5/Q8-A）：三分区收件箱 + 就地动作——
// gate 等待卡片（G2 放行/驳回）、G3 发版卡片（确认已发版）、failed run 卡片（重试/取消）。
// 动作全部复用 M2 API（runGate/runRetry/runCancel/releaseConfirm），完成后 view.reload 刷新。
export function renderReview(container, { t, candidates, runs, view }) {
  const out = needsReview({ candidates, runs });
  const wrap = document.createElement("div");
  wrap.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:16px";
  const reload = () => view.reload();
  const act = (fn) => async () => { try { await fn(); } catch (e) { console.warn("[dsh-l]", e); } await reload(); };
  const card = (parent, titleText, err) => {
    const el = document.createElement("div");
    el.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:13px";
    const head = document.createElement("div");
    head.style.cssText = "font-weight:600;margin-bottom:4px";
    head.textContent = titleText;
    el.append(head);
    if (err) { const e2 = document.createElement("div"); e2.style.color = "crimson"; e2.textContent = err; el.append(e2); }
    parent.append(el);
    return el;
  };
  const btn = (parent, label, fn, disabled = false) => {
    const b = document.createElement("button");
    b.textContent = label; b.type = "button"; b.disabled = disabled;
    b.style.cssText = "font-size:12px;padding:2px 10px;margin-right:6px";
    b.onclick = act(fn);
    parent.append(b);
  };
  const candidateOf = (key) => (candidates ?? []).find((c) => c.key === key);

  // 分区一：gate 等待（G2 放行/驳回）
  const gatesSec = document.createElement("section");
  gatesSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.gates") }));
  if (out.gateRuns.length === 0) gatesSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const r of out.gateRuns) {
    const c = candidateOf(r.candidateKey);
    const el = card(gatesSec, r.candidateKey + " " + (c?.title ?? ""), r.error);
    btn(el, t("actions.pass") + "（" + t("gates.G2") + "）", () => api.runGate(r.id, r.waitingGate, "pass", ""));
    btn(el, t("actions.reject"), () => api.runGate(r.id, r.waitingGate, "reject", ""));
    btn(el, t("actions.cancelRun"), () => api.runCancel(r.id, "user"));
  }
  // 分区二：G3 发版确认
  const releaseSec = document.createElement("section");
  releaseSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.release") }));
  if (out.releaseList.length === 0) releaseSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const c of out.releaseList) {
    const el = card(releaseSec, c.key + " " + (c.title ?? ""));
    btn(el, t("review.confirm"), () => api.releaseConfirm(c.key, ""));
  }
  // 分区三：failed run（重试/取消）
  const failedSec = document.createElement("section");
  failedSec.append(Object.assign(document.createElement("h3"), { textContent: t("review.failed") }));
  if (out.failedRuns.length === 0) failedSec.append(Object.assign(document.createElement("div"), { textContent: t("review.empty"), style: "opacity:.6" }));
  for (const r of out.failedRuns) {
    const el = card(failedSec, r.candidateKey + " " + (r.error ?? ""));
    for (const nid of r.failedNodeIds ?? []) btn(el, t("actions.retryRun") + " " + nid, () => api.runRetry(r.id, nid));
    btn(el, t("actions.cancelRun"), () => api.runCancel(r.id, "user"));
  }
  wrap.append(gatesSec, releaseSec, failedSec);
  container.append(wrap);
}
