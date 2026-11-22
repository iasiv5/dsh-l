// P2-6 前半：Peek 候选全文预览浮层（只读）。Esc 由 workbench keynav escape 通道驱动；
// 点背景/关闭钮亦可关；j/k 移动游标时由 workbench 重渲染跟随（传新 candidate）。
import { metaFootnote } from "./candidateRow.mjs";
import { prettyKey } from "../logic.mjs";

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function renderPeek(anchorEl, { t, candidate, onClose = () => {} } = {}) {
  const dlg = el("div", "peekoverlay");
  dlg.style.cssText = "position:fixed;inset:0;z-index:72;display:flex;align-items:flex-start;justify-content:center;padding-top:6vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const box = el("div", "peekbox");
  box.style.cssText = "background:canvas;color:canvastext;border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;width:min(460px,92vw);max-width:90vw;max-height:80vh;overflow:auto";
  const close = () => { dlg.remove(); onClose(); };
  const lbl = el("div", "peeklabel", t("peek.title"));   // rev-impl-p1 S1：死键转消费
  lbl.style.cssText = "font-size:12px;font-weight:600;opacity:.8";
  box.append(lbl);
  // 头部：类型 + 标题全文 + 关闭
  const head = el("div", "peekhead");
  head.style.cssText = "display:flex;gap:8px;align-items:center";
  head.append(el("span", "badge " + (candidate?.type ?? "issue"), candidate?.type === "pull" ? "PR" : "Issue"));
  head.append(el("b", "peektitle", prettyKey(candidate?.key) + "  " + (candidate?.title ?? "")));
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = t("peek.close");
  closeBtn.style.cssText = "margin-left:auto;padding:2px 10px";
  closeBtn.onclick = close;
  head.append(closeBtn);
  box.append(head);
  // 元数据脚注（复用清单行实现）
  const meta = metaFootnote(candidate, t);
  if (meta) { meta.style.opacity = ".7"; box.append(meta); }
  // 分诊三件 + 理由 + 留痕
  if (candidate?.triage) {
    const tri = el("div", "peektriage");
    tri.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
    tri.append(el("span", "chip", t("validity." + candidate.triage.validity)));
    tri.append(el("span", "chip", t("urgency." + candidate.triage.urgency)));
    tri.append(el("span", "chip", t("recommendedActions." + candidate.triage.action)));
    box.append(tri);
    if (candidate.triage.reason) {
      const r = el("p", "peekreason", candidate.triage.reason);
      r.style.cssText = "margin:0;font-size:13px;line-height:1.5";
      box.append(r);
    }
    const by = el("div", "peekby", (candidate.triage.by ?? "") + " · " + (candidate.triage.at ?? ""));
    by.style.cssText = "font-size:11px;opacity:.6";
    box.append(by);
  }
  // 最近动态（追加式事件流，新事件在前，截 8 条）
  const histHead = el("b", "peeksect", t("peek.history"));
  box.append(histHead);
  const hist = [...(candidate?.history ?? [])].slice(-8).reverse();
  if (hist.length === 0) box.append(el("div", "peeknone", "—"));
  for (const h of hist) {
    const row = el("div", "peekhistrow");
    row.style.cssText = "display:flex;gap:8px;align-items:baseline;flex-wrap:wrap";
    const at = el("span", "peekhistat", h.at ?? "");
    at.style.cssText = "opacity:.6;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px";
    row.append(at);
    row.append(el("span", "chip", h.event ?? ""));
    if (h.detail) { const dd = el("span", "peekhistdetail", h.detail); dd.style.cssText = "opacity:.75;font-size:12px"; row.append(dd); }
    box.append(row);
  }
  // 闸门记录
  box.append(el("b", "peeksect", t("peek.gates")));
  const gatesRow = el("div", "peekgates");
  gatesRow.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
  for (const g of ["G1", "G2", "G3"]) {
    const rec = candidate?.gates?.[g];
    const text = rec?.decision ? t("gates." + g) + " · " + rec.decision + (rec.at ? " · " + rec.at : "") : t("gates." + g) + " · —";
    gatesRow.append(el("span", "chip", text));
  }
  box.append(gatesRow);
  // 任务包
  box.append(el("b", "peeksect", t("peek.package")));
  box.append(el("span", "chip", candidate?.taskPackage ? "✓" : t("peek.none")));
  dlg.onclick = (e) => { if (e && e.target === dlg) close(); };
  dlg.append(box);
  anchorEl.append(dlg);
  return { close };
}
