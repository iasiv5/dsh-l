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
