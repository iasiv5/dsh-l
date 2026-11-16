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
    if (n?.type === "script" && typeof n?.script !== "string") push("node " + (n?.id ?? "?") + ": script missing");
  }
  for (const e of t?.edges ?? []) {
    if (!ids.has(e?.source)) push("edge " + (e?.id ?? "?") + ": source missing");
    if (!ids.has(e?.target)) push("edge " + (e?.id ?? "?") + ": target missing");
    if (!["success", "rework"].includes(e?.kind)) push("edge " + (e?.id ?? "?") + ": bad kind");
  }
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
