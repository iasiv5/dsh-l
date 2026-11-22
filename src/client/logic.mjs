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

export function filterCandidates(list, { type = "all", repo = "all", urgency = "all", stage = "all" } = {}) {
  return (list ?? []).filter((c) =>
    (type === "all" || c.type === type)
    && (repo === "all" || c.repo === repo)
    && (urgency === "all" || (c.triage?.urgency ?? "") === urgency)
    && (stage === "all" || bucketOf(c.stage) === stage));   // P1-3：stage 维度（bucketOf 归桶，与清单分组同口径）
}

// facet 计数（P1-3）：type/repo/urgency 按原值，stage 按 bucketOf 归桶；仅计出现过的键。
export function facetCounts(list) {
  const out = { type: {}, urgency: {}, repo: {}, stage: {} };
  for (const c of list ?? []) {
    out.type[c.type] = (out.type[c.type] ?? 0) + 1;
    const u = c.triage?.urgency;
    if (u) out.urgency[u] = (out.urgency[u] ?? 0) + 1;
    if (c.repo) out.repo[c.repo] = (out.repo[c.repo] ?? 0) + 1;
    const b = bucketOf(c.stage);
    out.stage[b] = (out.stage[b] ?? 0) + 1;
  }
  return out;
}

export function pickTriageBatch(list, filters = {}) {
  return filterCandidates(list, { type: filters.type ?? "all", repo: filters.repo ?? "all", urgency: "all" })
    .filter((c) => c.stage === "inbox").slice(0, 10).map((c) => c.key);
}

export function gateState(candidate) {
  return { G1: candidate?.stage === "gating", G2: false, G3: false };
}

// 开工路径引导（disc 评审 Task 2）：账号已绑定 ∧ 候选非空 ∧ 无待拍板候选——三态直测见 logic.test。
export function shouldShowStartHint(state) {
  const list = state?.candidates ?? [];
  const hasGating = list.some((c) => c.stage === "gating");
  return Boolean(state?.auth?.account) && list.length > 0 && !hasGating;
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
  // M8 T1/评审问题2：engineConcurrency 透传（未变不提交——与 triageModel 同款幂等语义）
  if (form.engineConcurrency !== undefined && form.engineConcurrency !== initial.engineConcurrency) {
    patch.engineConcurrency = form.engineConcurrency;
  }
  if (form.modelValue === modelValueOf(initial.triageModel)) return patch;
  if (form.modelValue === "") return { ...patch, triageModel: null };
  const cut = form.modelValue.indexOf("\n");
  return { ...patch, triageModel: { provider: form.modelValue.slice(0, cut), model: form.modelValue.slice(cut + 1) } };
}

// 开工会话三键的表单增量（Task 6）：与前键同幂等语义——未变不提交（API 设过的 effort 不被 UI 无意抹除）。
export function workSessionSettingsPatch(initial, form, base = {}) {
  const patch = { ...base };
  if (form.workModelValue !== undefined && form.workModelValue !== modelValueOf(initial.workSessionModel)) {
    if (form.workModelValue === "") patch.workSessionModel = null;
    else {
      const cut = form.workModelValue.indexOf("\n");
      patch.workSessionModel = { provider: form.workModelValue.slice(0, cut), model: form.workModelValue.slice(cut + 1) };
    }
  }
  if (form.workPreset !== undefined && form.workPreset !== (initial.workSessionPreset ?? "")) {
    patch.workSessionPreset = form.workPreset === "" ? null : form.workPreset;
  }
  if (form.workPolicy !== undefined && form.workPolicy !== (initial.workSessionApprovalPolicy ?? "")) {
    patch.workSessionApprovalPolicy = form.workPolicy === "" ? null : form.workPolicy;
  }
  return patch;
}

// 工作流条数据（design-v2 §8）：前环 4 chip 复用 stageCounts 计数口径；环内段取首个模板的节点 meta，
// 按 runs 摘要的 currentNodeIds 计在途数（count>0 才亮，评审 R1-15/R2-2）；无 workflow meta 时 fallback=true。
export function stripCells({ candidates, workflow, runs = [] } = {}) {
  const counts = stageCounts(candidates);
  const pre = [["ingest", counts.ingest], ["backlog", counts.backlog], ["triage", counts.triage], ["feedback", counts.feedback]]
    .map(([key, count]) => ({ key, count }));
  // M7/§18.6 最小形：按「当前活跃 run 的 templateId」匹配管线（无活跃 run 回退 templates[0]；
  // 多模板并发降级首活跃 run——演进注记见 §16-8）；在途计数限同模板 run（跨模板 nodeId 撞名不串）。
  const runsArr = runs ?? [];
  const active = runsArr.find((r) => ["running", "waiting"].includes(r.status));
  const templates = workflow?.templates ?? [];
  const template = templates.find((tpl) => tpl.id === active?.templateId) ?? templates[0];
  const inFlight = (nodeId) => runsArr.filter((r) => (r.templateId ?? templates[0]?.id) === template?.id && (r.currentNodeIds ?? []).includes(nodeId)).length;
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

// ---- P0 UI/UX 升级纯函数（docs/plans/2026-11-22-p0-uiux-upgrade-implementation-plan.md Task 3）----

// 六态判定（P0-2 契约 §7）：优先级 failed > gating > unread > running > done > idle；seen 为布尔
// （workbench 持有 seenRuns 集合，调用处换算，logic 层不收集合）。gating 统一承载 G1 待拍板 /
// waiting run / G3 待发版三来源——与 needsReview 收件箱口径互补。
export function candidateState({ candidate: c, run = null, seen = false }) {
  if (run?.status === "failed") return "failed";
  if (c?.stage === "gating" || run?.status === "waiting" || (c?.stage === "shipped" && !c?.release?.confirmedAt)) return "gating";
  if (run?.status === "succeeded" && !seen) return "unread";
  if (run?.status === "running" || c?.stage === "building" || c?.stage === "verifying") return "running";
  if (c?.stage === "shipped") return "done";
  return "idle";
}

// 会话行六态（P0-2）：孤儿行（item=null，summary 兜底行）仅认 summary.running，其余 idle。
// 契约注记（rev-impl S2）：不区分 item.kind——kind="run" 的行停在闸门（stage=gating）同样呈现
// 「待你处理」，属对计划 §7「work 门」的有意泛化，测试钉死该语义。
export function sessionState(item, summary = null) {
  if (summary?.running) return "running";
  const stage = item?.candidate?.stage;
  if (stage === "building" || stage === "verifying") return "running";
  if (stage === "gating") return "gating";
  if (stage === "shipped") return "done";
  return "idle";
}

// 正向推进链（P0-1）：仅 inbox→triaged→gating 两跳；gating 之后属闸门语义，看板不带。
export function advanceStageOf(stage) {
  if (stage === "inbox") return "triaged";
  if (stage === "triaged") return "gating";
  return null;
}

// 行内元数据脚注年龄段（P0-6）：纯数字逻辑，无文案 i18n；缺失（null/undefined/空串/非数值）返回空段。
export function formatAge(ageDays) {
  if (ageDays === null || ageDays === undefined || ageDays === "") return "";
  const n = Number(ageDays);
  if (!Number.isFinite(n)) return "";
  return n < 1 ? "<1d" : Math.round(n) + "d";
}

// 闸门等待解释（P0-3）：waitingGate 前后节点按模板定义序推导——线性内置模板精确，用户非线性模板近似。
// gateId 取 run.waitingGateId（metaOf 投影无 gateId 字段）；不做 rejectTarget 解析（meta 无该字段），
// 驳回后果由调用方走通用文案。
export function gateWaitInfo({ run, template } = {}) {
  const nodes = template?.nodes ?? [];
  const gateId = run?.waitingGateId ?? null;
  const i = nodes.findIndex((n) => n.id === (run?.waitingGate ?? null));
  if (i < 0) return { gateId, upstreamNames: [], nextNames: [] };
  const blocked = new Set([...(run?.failedNodeIds ?? []), ...(run?.cancelledNodeIds ?? [])]);
  const upstreamNames = nodes.slice(0, i).filter((n) => n.type !== "gate" && !blocked.has(n.id)).map((n) => n.name ?? n.id);
  const nextNames = nodes.slice(i + 1).filter((n) => n.type !== "gate").map((n) => n.name ?? n.id);
  return { gateId, upstreamNames, nextNames };
}

// 候选键美化（P0-3）：owner/repo#type#number → owner/repo#number；畸形键原样返回。
export function prettyKey(key) {
  const m = typeof key === "string" ? key.match(/^(.+)#(?:issue|pull)#(\d+)$/) : null;
  return m ? m[1] + "#" + m[2] : key;
}

// 时长档位（P1 小债 D）：纯数字逻辑，无文案 i18n；非法输入返回空段。<90s 归 1m。
export function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "";
  if (n < 90_000) return "1m";
  const m = n / 60_000;
  if (m < 60) return Math.round(m) + "m";
  const h = n / 3_600_000;
  if (h < 24) return Math.round(h) + "h";
  return Math.round(n / 86_400_000) + "d";
}

// 闸门等待排序（P1 小债 D）：waitingSince 升序（最久优先），缺省沉底且保持原序（稳定排序）。
export function sortGateRunsByWait(runs) {
  return [...(runs ?? [])].sort((a, b) => {
    const ta = a?.waitingSince ? Date.parse(a.waitingSince) : Infinity;
    const tb = b?.waitingSince ? Date.parse(b.waitingSince) : Infinity;
    return ta - tb;
  });
}

// ---- P1-3 后半：pinned filters 本地持久化（键固定；storage 注入，缺失降级会话内存）----
const PIN_KEY = "dsh-l.pinnedFilters.v1";
let memoryStore = null;
const memoryStorage = () => (memoryStore ??= (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})());

export function loadPins(storage) {
  const st = storage ?? memoryStorage();
  let raw = null;
  try { raw = st.getItem(PIN_KEY); } catch { return []; }
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function savePins(storage, pins) {
  const st = storage ?? memoryStorage();
  try { st.setItem(PIN_KEY, JSON.stringify(pins ?? [])); } catch { /* 尽力而为：配额/隐私模式静默降级 */ }
  return pins ?? [];
}

export function makePinId() {
  return "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}
