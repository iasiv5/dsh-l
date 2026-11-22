import { candidateState, formatAge } from "../logic.mjs";
import { stateDotEl } from "./stateDot.mjs";

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

// 行内元数据脚注（P0-6）：年龄/评论/反应/PR 草稿，至少一段在场才渲染（返回 null = 不出脚注行）。
// 看板卡（kanban.mjs）复用同一实现，禁止两处各写一份（计划 Task 4 接口契约）。
export function metaFootnote(candidate, t) {
  const segs = [];
  const age = formatAge(candidate?.meta?.ageDays);
  if (age) segs.push(age);
  const comments = candidate?.meta?.comments;
  if (comments !== null && comments !== undefined) segs.push("💬" + comments);
  const reactions = candidate?.meta?.reactionsTotal;
  if (reactions !== null && reactions !== undefined) segs.push("▲" + reactions);
  if (candidate?.type === "pull" && candidate?.pull?.draft) segs.push(t("candidate.draft"));
  if (segs.length === 0) return null;
  return el("span", "rowmeta", segs.join(" · "));
}

export function renderRow(container, candidate, t, { expanded = false, onToggle, actions, run = null, seen = false } = {}) {
  const row = el("div", "row" + (expanded ? " rowActive" : ""));   // rowActive 仅 coarse 层着色（桌面红线）
  row.append(stateDotEl(candidateState({ candidate, run, seen }), t));   // P0-2：六态点在行首
  row.append(el("span", "badge " + candidate.type, candidate.type === "pull" ? "PR" : "Issue"));
  const title = el("button", "title", candidate.repo + "#" + candidate.number + "  " + candidate.title);
  title.type = "button";
  title.setAttribute("aria-expanded", String(expanded));
  const meta = metaFootnote(candidate, t);
  if (meta) title.append(meta);   // P0-6：脚注为标题按钮内第二行（display:block）
  title.onclick = () => onToggle?.(candidate.key);
  row.append(title);
  // P5 展开可见性：chevron 仅 coarse 层显示（桌面红线；▾/▸ 字面量，无新 locale 键）
  row.append(el("span", "ux-chev", expanded ? "▾" : "▸"));
  if (candidate.triage) {
    row.append(
      el("span", "chip u-" + candidate.triage.urgency, t("urgency." + candidate.triage.urgency)),
      el("span", "chip v-" + candidate.triage.validity, t("validity." + candidate.triage.validity)),
      el("span", "chip", t("recommendedActions." + candidate.triage.action)),
    );
  } else {
    row.append(el("span", "chip muted", t("validity.none")));
  }
  container.append(row);
  if (expanded) {
    const detail = el("div", "detail");
    detail.setAttribute("role", "region");   // R1-12：展开区可访问性
    const titleId = "dsh-l-rowtitle-" + String(candidate.key).replace(/[^A-Za-z0-9_-]/g, "_");
    title.id = titleId;
    detail.setAttribute("aria-labelledby", titleId);
    if (candidate.triage?.reason) detail.append(el("p", "reason", candidate.triage.reason));
    actions?.(detail, candidate);
    container.append(detail);
  }
  return row;
}
