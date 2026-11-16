import { createHash } from "node:crypto";

const NODE_TYPES = new Set(["agent", "script", "gate"]);

// 模板形状校验（design-v2 §3）：只查结构与引用完整性；rework 边的 maxReworks 语义由 builtin/loader 层保证。
export function validateTemplate(t) {
  const errors = [];
  const push = (m) => errors.push(m);
  if (!t || typeof t.id !== "string" || !t.id) push("id required");
  const nodes = t?.nodes ?? [];
  const ids = new Set(nodes.map((n) => n?.id));
  if (ids.size !== nodes.length) push("duplicate node id");
  for (const n of nodes) {
    if (!NODE_TYPES.has(n?.type)) push("node " + (n?.id ?? "?") + ": bad type");
    if (n?.type === "gate" && !n.gateId) push("node " + (n?.id ?? "?") + ": gate missing gateId");
    if (n?.type === "gate" && n.gateId !== "G1" && !n.rejectTarget) push("node " + (n?.id ?? "?") + ": gate missing rejectTarget");   // 评审 F2：非 G1 闸门必须有回退目标（G1 驳回=取消 run，由引擎按 gateId 判）
    if (n?.type === "script" && typeof n?.script !== "string") push("node " + (n?.id ?? "?") + ": script missing");
  }
  for (const e of t?.edges ?? []) {
    if (!ids.has(e?.source)) push("edge " + (e?.id ?? "?") + ": source missing");
    if (!ids.has(e?.target)) push("edge " + (e?.id ?? "?") + ": target missing");
    if (!["success", "rework"].includes(e?.kind)) push("edge " + (e?.id ?? "?") + ": bad kind");
  }
  // 环检测（评审 F3）：success 边 DFS 三色，命中回边即非法（rework 边不参与，回炉是有向无环的重试语义）。
  const color = new Map();
  const stackPush = (id, stack) => { color.set(id, 1); stack.push(id); };
  const dfs = (id, stack) => {
    stackPush(id, stack);
    for (const e of t?.edges ?? []) {
      if (e?.kind !== "success" || e?.source !== id) continue;
      const c = color.get(e.target) ?? 0;
      if (c === 1) push("cycle detected at " + e.target);
      else if (c === 0) dfs(e.target, stack);
    }
    color.set(id, 2); stack.pop();
  };
  for (const n of nodes) if ((color.get(n.id) ?? 0) === 0) dfs(n.id, []);
  return { ok: errors.length === 0, errors };
}

// 键排序后序列化（评审 R13 采纳）：兑现 design-v2 §3「规范化 JSON」——用户模板格式化/重排键不换指纹，
// 否则 M2 的 templateRevision 比对会误报漂移。
const stableStringify = (v) => Array.isArray(v) ? v.map(stableStringify)
  : (v && typeof v === "object") ? Object.keys(v).sort().reduce((o, k) => (o[k] = stableStringify(v[k]), o), {})
  : v;

export function computeRevision(t) {
  const { revision: _ignored, ...rest } = t ?? {};
  return createHash("sha1").update(JSON.stringify(stableStringify(rest))).digest("hex");
}
