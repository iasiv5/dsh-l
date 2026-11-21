// agent 模型选择解析（Task 2 自 triage.mjs resolveTriageSelection 泛化抽出，分诊与开工会话共用）。
// 语义：设定值字段齐全才用设定值；否则跟随宿主默认。设定值不继承默认的 reasoningEffort（不同模型的可选值
// 不同）；开工会话路径（Task 3 评审 R2-3）显式 effort 在场即透传，triage 存储形态从无 effort、行为不变。
export function resolveAgentSelection(explicit, defaults) {
  const valid = explicit && typeof explicit.provider === "string" && explicit.provider !== ""
    && typeof explicit.model === "string" && explicit.model !== "";
  if (valid) return { provider: explicit.provider, model: explicit.model, reasoningEffort: explicit.reasoningEffort ?? undefined };
  return { provider: defaults?.provider ?? "", model: defaults?.model ?? "", reasoningEffort: defaults?.reasoningEffort };
}
