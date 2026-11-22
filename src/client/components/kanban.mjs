import { kanbanColumns, advanceStageOf, candidateState } from "../logic.mjs";
import { stateDotEl } from "./stateDot.mjs";
import { metaFootnote } from "./candidateRow.mjs";
import { api } from "../api.mjs";

// 看板视图（P0-1 重设计，design-v2 §13.6 基础上升级）：
// - 列头 = 列色点（kbdot kbcol-*）+ 列名 + 计数；空列给一行引导（emptyStates.kanbanCol）。
// - 卡片最小信息集：六态点 + 类型徽章 + repo#number 标题（两行 clamp）+ 紧急度 chip + 元数据脚注（复用 metaFootnote）。
// - 迁移交互：movable 卡只给「推进」快进按钮（advanceStageOf 正向链）+ <details>「移至…」全目标菜单，
//   替代旧版每卡罗列全部目标按钮；building/verifying 仍禁手工迁移（movable=false 无任何按钮）。
// - 窄面板（≤560px）经 workbench CSS 退化为按列分组的单列列表（列头吸顶），桌面保留横向六列。
// - deps seam（计划 §3-10）：测试经 deps.api 注入桩；默认真实 api。
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const MANUAL = ["inbox", "triaged", "gating", "shipped", "held", "closed"];

export function renderKanban(container, { t, candidates, view, deps = {} } = {}) {
  const a = deps.api ?? api;
  const { columns } = kanbanColumns({ candidates });
  const wrap = el("div", "kb");
  for (const col of columns) {
    const colEl = el("div", "kbcol");
    const head = el("div", "kbhead");
    head.append(el("span", "kbdot kbcol-" + col.id));
    head.append(el("span", "kbname", t("groups." + col.id)));
    head.append(el("span", "kbcount", String(col.cards.length)));
    colEl.append(head);
    if (col.cards.length === 0) colEl.append(el("div", "kbempty", t("emptyStates.kanbanCol")));
    for (const card of col.cards) {
      const cardEl = el("div", "kbcard");
      cardEl.append(stateDotEl(candidateState({ candidate: card, run: null, seen: false }), t));
      cardEl.append(el("span", "badge " + card.type, card.type === "pull" ? "PR" : "Issue"));
      cardEl.append(el("div", "kbtitle", card.repo + "#" + card.number + "  " + (card.title ?? "")));
      if (card.triage) cardEl.append(el("span", "chip u-" + card.triage.urgency, t("urgency." + card.triage.urgency)));
      const meta = metaFootnote(card, t);
      if (meta) cardEl.append(meta);
      if (card.movable) {
        const next = advanceStageOf(card.stage);
        if (next) {
          const adv = el("button", "kbadvance", t("kanban.advance"));
          adv.type = "button";
          adv.onclick = () => { a.stage(card.key, next, "看板推进").then(() => view.reload()).catch(() => {}); };
          cardEl.append(adv);
        }
        const menu = el("details", "kbmove");
        menu.append(el("summary", null, t("kanban.moveMore")));
        for (const target of MANUAL.filter((x) => x !== card.stage)) {
          const label = target === "held" ? t("recommendedActions.hold") : t("groups." + target);
          const b = el("button", "kbmovebtn", t("actions.moveTo") + " " + label);
          b.type = "button";
          b.onclick = () => { a.stage(card.key, target, "看板迁移").then(() => view.reload()).catch(() => {}); };
          menu.append(b);
        }
        cardEl.append(menu);
      }
      colEl.append(cardEl);
    }
    wrap.append(colEl);
  }
  container.append(wrap);
}
