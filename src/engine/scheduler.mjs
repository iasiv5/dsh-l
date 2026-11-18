// 工作流调度纯函数集（design-v2 §4）。输入 (snapshot, nodeStates, 事件) → 输出新形状；
// 不碰网络与子进程——执行器（M2 executor.mjs）只消费这里的输出。
// 状态枚举：pending|ready|running|waiting|succeeded|failed|cancelled|skipped（waiting 仅 gate；skipped=驳回失效待重跑）。

const successOut = (snapshot, id) =>
  (snapshot.edges ?? []).filter((e) => e.kind === "success" && e.source === id).map((e) => e.target);
const successIn = (snapshot, id) =>
  (snapshot.edges ?? []).filter((e) => e.kind === "success" && e.target === id).map((e) => e.source);
const statusOf = (nodeStates, id) => nodeStates[id]?.status ?? "pending";

// 节点 ready ⇔ 自身 pending 且全部 success 入边源 succeeded；无 success 入边者视作入口 ready。
// gate 节点同样可 ready（到达后由引擎置 waiting）——它只堵自己的下游，不堵兄弟分支（Q9-B）。
export function computeReady(snapshot, nodeStates) {
  const ready = [];
  for (const n of snapshot.nodes ?? []) {
    if (statusOf(nodeStates, n.id) !== "pending") continue;
    const deps = successIn(snapshot, n.id);
    if (deps.every((d) => statusOf(nodeStates, d) === "succeeded")) ready.push(n.id);
  }
  return ready;
}

// success 边可达的后代（不含自身，BFS，按遍历序去重）——reject 回退时圈定失效范围。
export function descendantsOf(snapshot, nodeId) {
  const seen = [];
  const queue = [nodeId];
  while (queue.length) {
    for (const t of successOut(snapshot, queue.shift())) {
      if (!seen.includes(t)) { seen.push(t); queue.push(t); }
    }
  }
  return seen;
}

// ---- 闸门语义（design-v2 §4）----

// 调度器把 ready 的 gate 节点交给引擎时：节点转 waiting、run 挂起等待人工。
export function gateArrive(run, nodeId) {
  return {
    ...run,
    status: "waiting",
    waitingGate: nodeId,
    nodeStates: { ...run.nodeStates, [nodeId]: { ...run.nodeStates[nodeId], status: "waiting" } },
  };
}

// 人工裁决。pass：waiting→succeeded、run 恢复 running；
// reject：G1（环首闸）→ 复用 cancelRun 全量清理（不开工语义）；其余 → 沿 rejectTarget（可被 overrideTarget
// 覆盖）回退：目标重置 ready 不计 rework，其后代中非 pending 者全部置 skipped 待重跑（重激活在 advanceRun）。
export function applyGateDecision(run, nodeId, decision, overrideTarget = null) {
  const gate = (run.snapshot.nodes ?? []).find((n) => n.id === nodeId) ?? {};
  if (decision === "pass") {
    return {
      ...run,
      status: "running",
      waitingGate: null,
      nodeStates: { ...run.nodeStates, [nodeId]: { ...run.nodeStates[nodeId], status: "succeeded" } },
    };
  }
  if (gate.gateId === "G1") return cancelRun({ ...run, waitingGate: null }, "g1-rejected");
  const target = overrideTarget ?? gate.rejectTarget;
  const nodeStates = { ...run.nodeStates };
  nodeStates[target] = { ...nodeStates[target], status: "ready" };   // 人工驳回不计 rework
  for (const d of descendantsOf(run.snapshot, target)) {
    if (nodeStates[d].status !== "pending") nodeStates[d] = { ...nodeStates[d], status: "skipped" };
  }
  return { ...run, nodeStates, status: "running", waitingGate: null };
}

// 取消：在途 running/waiting/ready 一律 cancelled，pending 保持，run 终态 cancelled + 原因落痕。
export function cancelRun(run, reason) {
  const nodeStates = {};
  for (const [id, s] of Object.entries(run.nodeStates)) {
    nodeStates[id] = ["running", "waiting", "ready"].includes(s.status) ? { ...s, status: "cancelled" } : { ...s };
  }
  return { ...run, nodeStates, status: "cancelled", cancelReason: reason, waitingGate: null };
}

// ---- 回炉 / 推进 / 终态 / 摘要（design-v2 §4）----

// 节点失败：记 error；有 rework 出边 → reworkCount+1 并把目标重置 ready（回炉）；
// reworkCount > maxReworks（回炉限次用尽）或无 rework 出边 → run failed（onFailure==="hold" 时 hold=true，
// 候选层映射 held 人工接管）。
export function applyFailure(run, nodeId, error) {
  const node = (run.snapshot.nodes ?? []).find((n) => n.id === nodeId) ?? {};
  const reworkEdges = (run.snapshot.edges ?? []).filter((e) => e.kind === "rework" && e.source === nodeId);
  const s = run.nodeStates[nodeId];
  const reworkCount = (s.reworkCount ?? 0) + (reworkEdges.length ? 1 : 0);
  const nodeStates = { ...run.nodeStates, [nodeId]: { ...s, status: "failed", error, reworkCount } };
  let status = run.status;
  let hold = run.hold ?? false;
  const exhausted = reworkEdges.length === 0 || reworkCount > (node.maxReworks ?? 0);
  if (exhausted) {
    status = "failed";
    hold = node.onFailure === "hold";
  } else {
    // 评审 R3/M6：rework 对齐驳回语义——target→ready 且其后代非 pending→skipped（error 经 spread 保留，
    // upstreamOf error 优先读取保反馈；advanceRun 既有 skipped 重激活令其在 target 重跑后逐个重走）。
    for (const e of reworkEdges) {
      nodeStates[e.target] = { ...nodeStates[e.target], status: "ready" };
      for (const d of descendantsOf(run.snapshot, e.target)) {
        if (nodeStates[d].status !== "pending") nodeStates[d] = { ...nodeStates[d], status: "skipped" };
      }
    }
  }
  return { ...run, nodeStates, status, hold };
}

// 推进：①skipped 重激活——全部 success 入边源已 succeeded 的 skipped 节点回 pending（评审 R7 配套，
// M2 执行器无需感知）；②ready 化——computeReady 结果 pending→ready；③全节点 succeeded 才置
// run.status="succeeded"（评审 R4：ready≠终态），否则保持原 running/waiting。
export function advanceRun(run) {
  let nodeStates = run.nodeStates;
  // 回炉源重臂（评审 R1-2）：failed 节点存在 rework 出边且其 target 已 succeeded → 源回 ready
  // （reworkCount 已在 applyFailure 计过，不重复计；manual retry 的 maxAttempts 预算只约束 retryNode 路径）。
  // 终态守卫（产出评审问题 2）：run 已终态（回炉耗尽→failed 等）不再重臂——否则失败节点被翻回 ready，
  // 抹掉 failed 语义（error 摘要失效/在途误亮/retry 守卫错位为 retry-requires-failed）。
  if (!["succeeded", "failed", "cancelled"].includes(run.status)) {
    for (const e of run.snapshot.edges ?? []) {
      if (e.kind !== "rework") continue;
      const src = nodeStates[e.source]; const tgt = nodeStates[e.target];
      if (src?.status === "failed" && tgt?.status === "succeeded") {
        nodeStates = { ...nodeStates, [e.source]: { ...nodeStates[e.source], status: "ready" } };
      }
    }
  }
  for (const [id, s] of Object.entries(nodeStates)) {
    if (s.status !== "skipped") continue;
    const deps = successIn(run.snapshot, id);
    if (deps.length > 0 && deps.every((d) => statusOf(nodeStates, d) === "succeeded")) {
      nodeStates = { ...nodeStates, [id]: { ...nodeStates[id], status: "pending" } };
    }
  }
  for (const id of computeReady(run.snapshot, nodeStates)) {
    nodeStates = { ...nodeStates, [id]: { ...nodeStates[id], status: "ready" } };
  }
  const allDone = (run.snapshot.nodes ?? []).every((n) => nodeStates[n.id]?.status === "succeeded");
  return { ...run, nodeStates, status: allDone ? "succeeded" : run.status };
}

// 清单行/看板卡摘要：在途 = running/waiting/ready；error = 首个 failed 节点的 error（评审 R2-2/R1-15，
// state.runs 摘要承载 run 详情——§12.10 路由适配）。
export function summarizeRun(run) {
  const currentNodeIds = Object.entries(run.nodeStates)
    .filter(([, s]) => ["running", "waiting", "ready"].includes(s.status))
    .map(([id]) => id);
  const failedNodeIds = Object.entries(run.nodeStates)
    .filter(([, s]) => s.status === "failed")
    .map(([id]) => id);   // 产出评审问题 1：重试按钮的目标来源（currentNodeIds 永不含 failed）
  const error = Object.values(run.nodeStates).find((s) => s.status === "failed")?.error ?? null;
  // 评审 R2-1①：waitingGate 孰 nodeId，快照节点 gateId 才是 gates.* 键空间的语义键（devflow requirement ≠ "G1" 字面上标）
  const waitingGateId = run.snapshot?.nodes?.find((n) => n.id === (run.waitingGate ?? null))?.gateId ?? null;
  const cancelledNodeIds = Object.entries(run.nodeStates).filter(([, s]) => s.status === "cancelled").map(([id]) => id);   // M7/D3：cancelled 重试入口数据源
  return { id: run.id, candidateKey: run.candidateKey, status: run.status, waitingGate: run.waitingGate ?? null, waitingGateId, currentNodeIds, failedNodeIds, cancelledNodeIds, templateId: run.templateId ?? null, error };
}
