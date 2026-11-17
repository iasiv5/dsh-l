const GROUPS = [
  ["inbox", false], ["triaged", false], ["gating", false],
  ["building", true], ["shipped", true], ["closed", true],
];
const bucketOf = (stage) => {
  if (stage === "inbox" || stage === "triaged" || stage === "gating" || stage === "shipped") return stage;
  if (stage === "building" || stage === "verifying") return "building";
  return "closed";
};

export function groupCandidates(list, t) {
  const groups = GROUPS.map(([id, dim]) => ({ id, label: t("groups." + id), dim, items: [] }));
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  for (const c of list ?? []) byId[bucketOf(c.stage)].items.push(c);
  return groups;
}

export function filterCandidates(list, { type = "all", repo = "all", urgency = "all" } = {}) {
  return (list ?? []).filter((c) =>
    (type === "all" || c.type === type)
    && (repo === "all" || c.repo === repo)
    && (urgency === "all" || (c.triage?.urgency ?? "") === urgency));
}

export function pickTriageBatch(list, filters = {}) {
  return filterCandidates(list, { type: filters.type ?? "all", repo: filters.repo ?? "all", urgency: "all" })
    .filter((c) => c.stage === "inbox").slice(0, 10).map((c) => c.key);
}

export function gateState(candidate) {
  return { G1: candidate?.stage === "gating", G2: false, G3: false };
}

export function stageCounts(list) {
  const all = list ?? [];
  const n = (pred) => all.filter(pred).length;
  return {
    ingest: all.length,
    backlog: n((c) => c.stage === "inbox"),
    triage: n((c) => Boolean(c.triage)),
    feedback: n((c) => c.stage === "gating"),
    build: n((c) => c.stage === "building"),
    verify: n((c) => c.stage === "verifying"),
    ship: n((c) => c.stage === "shipped"),
  };
}

const modelValueOf = (sel) => (sel ? sel.provider + "\n" + sel.model : "");

export function settingsPatch(initial, form) {
  const patch = { intervalMinutes: form.intervalMinutes };
  if (form.modelValue === modelValueOf(initial.triageModel)) return patch;
  if (form.modelValue === "") return { ...patch, triageModel: null };
  const cut = form.modelValue.indexOf("\n");
  return { ...patch, triageModel: { provider: form.modelValue.slice(0, cut), model: form.modelValue.slice(cut + 1) } };
}

// 工作流条数据（design-v2 §8）：前环 4 chip 复用 stageCounts 计数口径；环内段取首个模板的节点 meta，
// 按 runs 摘要的 currentNodeIds 计在途数（count>0 才亮，评审 R1-15/R2-2）；无 workflow meta 时 fallback=true。
export function stripCells({ candidates, workflow, runs = [] } = {}) {
  const counts = stageCounts(candidates);
  const pre = [["ingest", counts.ingest], ["backlog", counts.backlog], ["triage", counts.triage], ["feedback", counts.feedback]]
    .map(([key, count]) => ({ key, count }));
  const template = workflow?.templates?.[0];
  const inFlight = (nodeId) => (runs ?? []).filter((r) => (r.currentNodeIds ?? []).includes(nodeId)).length;
  const loop = (template?.nodes ?? []).map((n) => {
    const count = inFlight(n.id);
    return { id: n.id, name: n.name, type: n.type, count, dim: count === 0 };
  });
  return { pre, loop, fallback: !workflow?.templates?.length };
}

// 行内 run 区块数据（design-v2 §12.6）：按候选 currentRunId 取 runs 摘要；未命中/无 run 返回 null。
export function runBlock(candidate, runs = []) {
  if (!candidate?.currentRunId) return null;
  return (runs ?? []).find((r) => r.id === candidate.currentRunId) ?? null;
}

// 侧栏角标/页头 chip 文案（design-v2 §13.2）：i18n 模板由调用方注入（logic 层零 i18n 依赖）。
export function badgeLabel({ count, label, template }) {
  return count > 0 ? String(template).replace("{n}", String(count)) + " · " + label : label;
}

// 角色 tab 行卡数据组装（design-v2 §14.4/M4）：uses = workflow.templates 全部模板 agent 节点 roleId 计数。
// query 为搜索过滤（匹配 name/id/description）；数据源为 meta 投影（roleId 在位，script 不出）。
export function roleRows({ roles, workflow, query = "" } = {}) {
  const uses = new Map();
  for (const t of workflow?.templates ?? []) {
    for (const n of t.nodes ?? []) {
      if (n.type === "agent" && n.roleId) uses.set(n.roleId, (uses.get(n.roleId) ?? 0) + 1);
    }
  }
  const q = query.trim().toLowerCase();
  return (roles ?? [])
    .filter((r) => !q || [r.name, r.id, r.description ?? ""].some((f) => String(f).toLowerCase().includes(q)))
    .map((r) => ({ ...r, uses: uses.get(r.id) ?? 0 }));
}

// 待我确认聚合（design-v2 §13.5）：gate 等待 + failed 分区 + G3 待发版。
// 角标口径（D5）：count = gate 等待数 + 待发版数——failed 不计入（失败走清单行内与飞书推送）。
// flagged 排除（评审 R5-b / §13.5 括号口径）：上游消失（upstream-gone 留痕）的候选不计入 gate 等待。
export function needsReview({ candidates, runs = [] } = {}) {
  const gone = new Set((candidates ?? [])
    .filter((c) => (c.history ?? []).some((h) => h.event === "upstream-gone"))
    .map((c) => c.key));
  const gateRuns = (runs ?? []).filter((r) => r.status === "waiting" && r.waitingGate && !gone.has(r.candidateKey));
  const failedRuns = (runs ?? []).filter((r) => r.status === "failed");
  const releaseList = (candidates ?? []).filter((c) => c.stage === "shipped" && !c.release?.confirmedAt);
  return { gateRuns, failedRuns, releaseList, count: gateRuns.length + releaseList.length };
}

// 看板列（design-v2 §13.6）：6 列与清单分组同构（bucketOf）；卡片 movable 仅白名单
// stage（building/verifying 禁手工迁移，v1 postStage 校验沿用）；run 状态由调用方经 runBlock 在行内承载。
export function kanbanColumns({ candidates } = {}) {
  const movableStages = new Set(["inbox", "triaged", "gating", "shipped", "held", "closed"]);
  const columns = [["inbox", false], ["triaged", false], ["gating", false], ["building", false], ["shipped", false], ["closed", false]]
    .map(([id, dim]) => ({ id, dim, cards: [], movable: false }));
  const byId = Object.fromEntries(columns.map((col) => [col.id, col]));
  for (const c of candidates ?? []) {
    const col = byId[bucketOf(c.stage)];
    if (col) col.cards.push({ ...c, movable: movableStages.has(c.stage) });
  }
  return { columns };
}
