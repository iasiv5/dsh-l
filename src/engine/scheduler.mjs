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
