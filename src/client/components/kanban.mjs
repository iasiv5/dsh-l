import { kanbanColumns } from "../logic.mjs";
import { api } from "../api.mjs";

// 看板视图（design-v2 §13.6）：6 列与清单分组同构；卡片迁移走 api.stage（movable 白名单已在
// kanbanColumns 标注——building/verifying 禁手工迁移）；无拖拽，按钮迁移后 view.reload 刷新。
export function renderKanban(container, { t, candidates, view }) {
  const { columns } = kanbanColumns({ candidates });
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:10px;padding:12px 16px;align-items:flex-start;overflow:auto";
  const MANUAL = ["inbox", "triaged", "gating", "shipped", "held", "closed"];
  for (const col of columns) {
    const colEl = document.createElement("div");
    colEl.style.cssText = "flex:1;min-width:150px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:8px;padding:8px";
    const head = document.createElement("div");
    head.style.cssText = "font-size:12px;font-weight:600;margin-bottom:6px";
    head.textContent = t("groups." + col.id) + " · " + col.cards.length;   // 列头走 groups.*（评审 P9：logic 层不产 label）
    colEl.append(head);
    for (const card of col.cards) {
      const cardEl = document.createElement("div");
      cardEl.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:13px";
      const title = document.createElement("div");
      title.textContent = card.key + " " + (card.title ?? "");
      title.style.cssText = "margin-bottom:4px";
      cardEl.append(title);
      if (card.movable) {
        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:4px;flex-wrap:wrap";
        for (const target of MANUAL.filter((x) => x !== card.stage)) {
          const label = target === "held" ? t("recommendedActions.hold") : t("groups." + target);
          const b = document.createElement("button");
          b.textContent = "→ " + label;
          b.style.cssText = "font-size:11px;padding:1px 6px";
          b.onclick = () => { api.stage(card.key, target, "看板迁移").then(() => view.reload()).catch(() => {}); };
          btns.append(b);
        }
        cardEl.append(btns);
      }
      colEl.append(cardEl);
    }
    wrap.append(colEl);
  }
  container.append(wrap);
}
