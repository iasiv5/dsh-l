import { needsReview, gateWaitInfo, prettyKey } from "../logic.mjs";
import { api } from "../api.mjs";

// 待我确认视图（design-v2 §13.5 基础上 P0-3 升级）：
// - 卡片标题人话化：prettyKey(key) + 候选标题（不再裸 candidateKey）。
// - gate 卡三行解释：上游已完成节点（gateWaitInfo 推导）→ 放行后果（后续节点）→ 驳回后果（通用文案，
//   meta 投影无 rejectTarget，不做精确解析）；upstream 空走 gateWaitGeneric 兜底。
// - 每张 gate/G3 卡带备注输入（rvnote），动作时并入 note 留痕；按钮动词化（passBtn/rejectBtn 写明后果）。
// - act(fn, errEl)：失败写卡片就地错误行（rverr），成功清除——Task 9 起全卡片接线（errors.actionFailed）。
// - deps seam（计划 §3-10）：测试经 deps.api 注入桩；默认真实 api。
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const gateLabelOf = (r, t) => t("gates." + (r.waitingGateId ?? (r.waitingGate ?? "").toUpperCase()));

export function renderReview(container, { t, candidates, runs, view, templates = [], deps = {} } = {}) {
  const a = deps.api ?? api;
  const out = needsReview({ candidates, runs });
  const wrap = el("div", "rv");
  wrap.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:16px";
  const reload = () => view.reload();
  const candidateOf = (key) => (candidates ?? []).find((c) => c.key === key);
  const card = (parent, titleText, err, { withNote = true } = {}) => {
    const c = el("div", "rvcard");
    c.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:13px;display:flex;flex-direction:column;gap:6px";
    const head = el("div", "rvhead", titleText);
    head.style.cssText = "font-weight:600";
    c.append(head);
    if (err) { const e0 = el("div", "rverr", err); e0.style.color = "crimson"; c.append(e0); }
    let note = null;
    if (withNote) {
      note = el("input", "rvnote");
      note.type = "text";
      note.placeholder = t("review.notePlaceholder");
      c.append(note);
    }
    const errEl = el("div", "rverr");
    errEl.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);display:none";
    c.append(errEl);
    parent.append(c);
    return { card: c, note, errEl };
  };
  const act = (fn, errEl = null) => async () => {
    try {
      await fn();
      if (errEl) { errEl.textContent = ""; errEl.style.display = "none"; }
    } catch (e) {
      if (errEl) { errEl.textContent = t("errors.actionFailed") + " (" + (e?.message ?? e) + ")"; errEl.style.display = "block"; }
      else console.warn("[dsh-l]", e);
    }
    await reload();
  };
  const btn = (parent, label, fn, disabled = false) => {
    const b = el("button", null, label);
    b.type = "button";
    b.disabled = disabled;
    b.style.cssText = "font-size:12px;padding:2px 10px;margin-right:6px";
    b.onclick = fn;
    parent.append(b);
    return b;
  };

  // 分区一：gate 等待（G2 放行/驳回）
  const gatesSec = el("section");
  gatesSec.append(el("h3", null, t("review.gates")));
  if (out.gateRuns.length === 0) gatesSec.append(el("div", null, t("review.empty")));
  for (const r of out.gateRuns) {
    const c = candidateOf(r.candidateKey);
    const tpl = (templates ?? []).find((x) => x.id === r.templateId) ?? null;
    const info = gateWaitInfo({ run: r, template: tpl });
    const gateLabel = gateLabelOf(r, t);
    const { card: cardEl, note, errEl } = card(gatesSec, prettyKey(r.candidateKey) + " " + (c?.title ?? ""), r.error);
    const line1 = info.upstreamNames.length > 0
      ? t("review.gateWait").replace("{nodes}", info.upstreamNames.join(", ")).replace("{gate}", gateLabel)
      : t("review.gateWaitGeneric").replace("{gate}", gateLabel);
    cardEl.append(el("div", "rvline", line1));
    if (info.nextNames.length > 0) cardEl.append(el("div", "rvline", t("review.gatePassEffect").replace("{next}", info.nextNames.join(" → "))));
    cardEl.append(el("div", "rvline", t("review.gateRejectGeneric")));
    const actionsRow = el("div", "rvactions");
    btn(actionsRow, t("review.passBtn"), act(() => a.runGate(r.id, r.waitingGate, "pass", note.value), errEl));
    btn(actionsRow, t("review.rejectBtn"), act(() => a.runGate(r.id, r.waitingGate, "reject", note.value), errEl));
    btn(actionsRow, t("actions.cancelRun"), act(() => a.runCancel(r.id, "user"), errEl));
    cardEl.append(actionsRow);
  }

  // 分区二：G3 发版确认
  const releaseSec = el("section");
  releaseSec.append(el("h3", null, t("review.release")));
  if (out.releaseList.length === 0) releaseSec.append(el("div", null, t("review.empty")));
  for (const c of out.releaseList) {
    const { card: cardEl, note, errEl } = card(releaseSec, prettyKey(c.key) + " " + (c.title ?? ""));
    btn(cardEl, t("review.confirm"), act(() => a.releaseConfirm(c.key, note.value), errEl));
  }

  // 分区三：failed run（重试/取消；retry/cancel 无 note 语义，不出备注框）
  const failedSec = el("section");
  failedSec.append(el("h3", null, t("review.failed")));
  if (out.failedRuns.length === 0) failedSec.append(el("div", null, t("review.empty")));
  for (const r of out.failedRuns) {
    const { card: cardEl, errEl } = card(failedSec, prettyKey(r.candidateKey) + " " + (candidateOf(r.candidateKey)?.title ?? ""), r.error, { withNote: false });
    for (const nid of r.failedNodeIds ?? []) btn(cardEl, t("actions.retryRun") + " " + nid, act(() => a.runRetry(r.id, nid), errEl));
    btn(cardEl, t("actions.cancelRun"), act(() => a.runCancel(r.id, "user"), errEl));
  }
  wrap.append(gatesSec, releaseSec, failedSec);
  container.append(wrap);
}
