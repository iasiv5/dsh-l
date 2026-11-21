const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function renderRow(container, candidate, t, { expanded = false, onToggle, actions } = {}) {
  const row = el("div", "row" + (expanded ? " rowActive" : ""));   // rowActive 仅 coarse 层着色（桌面红线）
  row.append(el("span", "badge " + candidate.type, candidate.type === "pull" ? "PR" : "Issue"));
  const title = el("button", "title", candidate.repo + "#" + candidate.number + "  " + candidate.title);
  title.type = "button";
  title.setAttribute("aria-expanded", String(expanded));
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
