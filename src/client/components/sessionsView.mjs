// 会话板块纯函数（Task 11）：排序（Q13：running 置顶、updatedAt 倒序）与锚行反解（Q14 固定 ASCII 前缀）。
// 无 DOM 依赖——renderSessionsView（Task 12）与测试共用。
import { formatRelative, sessionState, stalledOf } from "../logic.mjs";
import { stateDotEl } from "./stateDot.mjs";

// summaries：ctx.sessions.list 行集（client 侧字段 id/running/updatedAt）。缺省/空 → 退化按 updatedAt 倒序。
export function sortSessionRows(rows, summaries = null) {
  const runningIds = new Set((summaries ?? []).filter((s) => s && s.running).map((s) => s.id));
  const byUpdated = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  const running = rows.filter((r) => r.sessionId && runningIds.has(r.sessionId));
  const rest = rows.filter((r) => !(r.sessionId && runningIds.has(r.sessionId)));
  return [...running.sort(byUpdated), ...rest.sort(byUpdated)];
}

// 标题锚行 → 候选标识：旧锚行 `[dsh-l] {repo}#{number} {issue|PR} · {title}`（kickoff 首行），或新会话标题
// `{repo}#{number} {issue|PR} · {title}`（workSessionTitle，design-v2 §20 第 15 条）；不匹配 → null。
export function parseWorkAnchor(title) {
  if (typeof title !== "string") return null;
  const m = title.match(/^(?:\[dsh-l\] )?(\S+)#(\d+) (issue|PR) · /);
  return m ? { repo: m[1], number: Number(m[2]), type: m[3] } : null;
}

const mkBtn = (text, onClick) => { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.onclick = onClick; return b; };
const mkChip = (text) => { const s = document.createElement("span"); s.className = "chip"; s.textContent = text; return s; };

// 会话板块视图（Task 12 / P1-4 升级）：run/work 行集 + 相对时间 + run 行在途节点 chip + succeeded 未读点 +
// 终态折叠收纳（ssarchive：上游已关闭/closed/已确认 shipped；未确认 shipped 是活跃行——待 G3）。
// onOpen(sessionId, item)：item 供 workbench 记账 runId 已读（P1 小债 C）；orphan 行传 null。
// runs/seenRunIds/nowMs 注入（缺省零行为变化——nowMs 缺省 Date.now() 于调用点）。
export function renderSessionsView(container, { t, items = [], summaries = [], onOpen = () => {}, onAnother = () => {}, onDeliver = null, runs = [], seenRunIds = [], nowMs = null } = {}) {
  container.innerHTML = "";
  const head = document.createElement("h3");
  head.textContent = t("sessions.title");
  container.append(head);
  const itemSessionIds = new Set(items.map((x) => x.sessionId).filter(Boolean));
  const seen = new Set(seenRunIds ?? []);
  const runOf = (item) => (item?.runId ? (runs ?? []).find((x) => x.id === item.runId) ?? null : null);
  const relTimeOf = (updatedAt) => (updatedAt && nowMs ? t("sessions.ago").replace("{t}", formatRelative(updatedAt, nowMs)) : "");
  const models = [];
  for (const item of items) {
    const summary = summaries.find((s) => s.id === item.sessionId);
    const run = runOf(item);
    const badges = [item.kind === "run" ? t("sessions.badgeRun") : t("sessions.badgeWork")];
    if (item.approvalPolicy === "never") badges.push(t("sessions.badgeAuto"));
    if (item.candidate?.stage === "closed") badges.push(t("sessions.badgeGone"));
    if (summary?.running) badges.push(t("sessions.badgeRunning"));
    const missing = item.kind === "work" && summaries.length > 0 && !summary;
    if (missing) badges.push(t("sessions.badgeMissing"));
    const ended = item.candidate?.stage === "closed" || (item.candidate?.stage === "shipped" && item.candidate?.release?.confirmedAt);
    const stalled = summary?.running && stalledOf(item.updatedAt, nowMs);   // P2 Task 6：client 合成卡住判定
    models.push({
      sessionId: item.sessionId ?? null,
      updatedAt: item.updatedAt ?? 0,
      key: item.key ?? null,
      badges,
      state: sessionState(item, summary),   // P0-2b 六态点
      relTime: relTimeOf(item.updatedAt),
      inFlight: run?.status === "running" ? (run.currentNodeIds ?? []).join("/") : "",
      unread: item.kind === "run" && run?.status === "succeeded" && !seen.has(item.runId),   // P1 小债 C
      stalled,
      ended,
      item,
      label: item.candidate ? `${item.candidate.repo}#${item.candidate.number} · ${item.candidate.title}` : (item.sessionId ?? item.key ?? ""),
      actions: [
        ...(item.sessionId && summary ? [{ text: t("sessions.open"), fn: () => onOpen(item.sessionId, item) }] : []),
        ...(missing ? [{ text: t("sessions.another"), fn: () => onAnother(item.key, item.cwd) }] : []),
        // Task 13：确认交付（人工 G2 等价）——候选级拍板语义：building/verifying 的开工会话行均可交付
        //（含 missing 行——会话被归档/删除后用户仍须能拍板；路由守卫仍要求索引活跃行在场，评审 impl#O1 钉例）。
        ...(onDeliver && item.kind === "work" && ["building", "verifying"].includes(item.candidate?.stage) ? [{ text: t("sessions.deliver"), fn: async () => onDeliver(item.key) }] : []),
      ],
    });
  }
  for (const s of summaries) {
    if (itemSessionIds.has(s.id)) continue;
    const idStr = typeof s.id === "string" ? s.id : "";
    const isRunOrphan = idStr.startsWith("dsh-l:run:");
    const isWorkOrphan = idStr.startsWith("dsh-l:work-");
    const anchor = parseWorkAnchor(s.displayTitle);
    if (!isRunOrphan && !isWorkOrphan && !anchor && !String(s.displayTitle ?? "").startsWith("[dsh-l] ")) continue;
    const badges = [isRunOrphan ? t("sessions.badgeRun") : t("sessions.badgeWork")];
    if (s.running) badges.push(t("sessions.badgeRunning"));
    models.push({
      sessionId: s.id,
      updatedAt: s.updatedAt ?? 0,
      key: null,
      badges,
      state: sessionState(null, s),   // P0-2b 孤儿行：仅认 summary.running
      relTime: relTimeOf(s.updatedAt),
      inFlight: "",
      unread: false,
      ended: false,
      item: null,
      label: isRunOrphan ? (s.displayTitle || s.id) : anchor ? `${anchor.repo}#${anchor.number} ${anchor.type}` : (s.displayTitle || s.id),
      actions: [{ text: t("sessions.open"), fn: () => onOpen(s.id, null) }],
    });
  }
  if (models.length === 0) {
    const d = document.createElement("div");
    d.style.opacity = ".7";
    d.textContent = t("sessions.empty");
    container.append(d);
    return;
  }
  const renderRow = (parent, m) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 0;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent)";
    row._rowId = m.sessionId ?? m.key;
    row.append(stateDotEl(m.state, t));   // P0-2b：行首六态点
    for (const b of m.badges) row.append(mkChip(b));
    const label = document.createElement("span");
    label.style.cssText = "opacity:.88;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    label.textContent = m.label;
    row.append(label);
    if (m.relTime) { const rt = document.createElement("span"); rt.className = "chip"; rt.style.opacity = ".7"; rt.textContent = m.relTime; row.append(rt); }
    if (m.inFlight) row.append(mkChip(m.inFlight));   // P1-4：run 行在途节点
    if (m.stalled) {
      const sc = mkChip(t("sessions.stalled"));
      sc.title = t("sessions.stalledTitle");
      row.append(sc);
    }
    if (m.unread) { const u = document.createElement("span"); u.className = "stdot st-unread"; u.title = t("stateDot.unread"); row.append(u); }   // P1 小债 C
    for (const a of m.actions) {
      // 交付动作（impl#O2）：onDeliver 返回错误串 → 行内就地呈现（color-mix 语义色，P1 小债 B），成功 null 无痕。
      row.append(mkBtn(a.text, async () => {
        const err = await a.fn();
        if (typeof err === "string" && err) {
          const c = document.createElement("span");
          c.className = "chip";
          c.style.color = "color-mix(in srgb,#d1242f 85%,currentColor)";   // P1 小债 B：语义色统一（硬编码红字清偿）
          c.textContent = err;
          row.append(c);
        }
      }));
    }
    parent.append(row);
  };
  const active = sortSessionRows(models.filter((m) => !m.ended), summaries);
  const ended = sortSessionRows(models.filter((m) => m.ended), summaries);
  for (const m of active) renderRow(container, m);
  if (ended.length > 0) {
    const details = document.createElement("details");
    details.className = "ssarchive";
    const sum = document.createElement("summary");
    sum.textContent = t("sessions.archive") + " · " + ended.length;
    details.append(sum);
    for (const m of ended) renderRow(details, m);
    container.append(details);
  }
}
