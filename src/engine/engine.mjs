import { computeReady, gateArrive, applyGateDecision, applyFailure, advanceRun, cancelRun as schedCancelRun } from "./scheduler.mjs";
import { LOOP_V1 } from "../workflows/builtin.mjs";
import { resolveRole } from "../workflows/roles.mjs";
import { makeRunId } from "../store.mjs";

// 可调度集（评审 R1-1）：computeReady 只扫 pending，而 advanceRun/applyFailure/reject/recover 产出的是
// status:"ready" 节点——引擎的可调度集必须两路合并（去在途），缺一路这些节点就永不被派发。
const dispatchable = (run) => {
  const alive = Object.keys(run.nodeStates).filter((id) => run.nodeStates[id].status === "ready");
  const fresh = computeReady(run.snapshot, run.nodeStates);
  return [...new Set([...alive, ...fresh])];
};

// 上游摘要（评审 R1-10）：入边（success+rework）源节点的 artifacts[0]/error，各截 500 字符——
// 回炉语境下 verify 的失败文本随 build 重派进入 prompt；无文本的源被过滤。
const upstreamOf = (run, nodeId) => {
  const inIds = [...new Set((run.snapshot.edges ?? []).filter((e) => e.target === nodeId).map((e) => e.source))];
  return inIds.map((id) => {
    const s = run.nodeStates[id] ?? {};
    const text = s.error ?? s.artifacts?.[0] ?? "";   // 评审 R3 连带/M6：error 优先、状态无关——skipped 化检查节点反馈不丢
    return { node: id, text: String(text).slice(0, 500) };
  }).filter((u) => u.text);
};

export function hasAliveRun(store, key) {
  const c = store.getCandidate(key);
  const run = c?.currentRunId ? store.getRun(c.currentRunId) : null;
  return Boolean(run && ["running", "waiting"].includes(run.status));
}

// 候选 stage 同步（design-v2 §8）：run 终态/闸门等待映射候选粗粒度 stage。
const stageOf = (run) => run.status === "succeeded" ? "shipped" : run.status === "failed" ? "held" : run.status === "cancelled" ? "gating"
  : run.waitingGate ? "gating" : "building";

export function makeEngine({ store, workspace, executor, template = LOOP_V1, templates = {}, now = () => new Date(), concurrencyOf = () => 2, emit = null, listRoles = () => ({}) }) {
  const inflight = new Map();   // "runId:nodeId" → cancel
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const titleOf = (key) => store.getCandidate(key)?.title ?? "";
  // 事件发射（design-v2 §13.4）：尽力而为——emit 抛错被吞，通知永不阻塞引擎。三触发点：gate 挂起 / run failed / clone 失败。
  const fire = (evt) => { try { emit?.(evt); } catch {} };
  const syncStage = (key, run) => {
    const stage = stageOf(run);
    const c = store.getCandidate(key);
    if (c && c.stage !== stage) store.setStage(key, stage, "run " + run.status);
  };
  const engine = {
    hasAliveRun: (key) => hasAliveRun(store, key),
    // G1 放行即建 run（评审 D3）：g1 预置 succeeded（其余 pending）；工作区 clone 为引擎首步（评审 D2 异步）。
    // 模板选择（评审 D7）：templateId 缺省 template（loop-v1）；可解析 builtin（loop-v1/devflow-lite）或用户模板。
    // runId 可选参（M4 契约补全，M5 后落账）：缺省 makeRunId——供 postRunStart「先定 runId 再生成含 workflow.runId 的任务包 v2」。
    startRun(key, { taskPackage = null, templateId = null, runId = null } = {}) {
      if (!store.getCandidate(key)) throw Object.assign(new Error("candidate not found"), { status: 404 });
      if (hasAliveRun(store, key)) throw Object.assign(new Error("run-already-active"), { status: 409 });
      const tpl = templateId
        ? (templates[templateId] ?? (() => { throw Object.assign(new Error("unknown-template: " + templateId), { status: 404 }); })())
        : template;
      const rid = runId ?? makeRunId(now);
      const entryPreset = Array.isArray(tpl.entryPresucceeded) ? tpl.entryPresucceeded : [];   // 评审 P16：模板级显式声明（审批时序语义，非结构位置泛化）
      const nodeStates = {};
      for (const n of tpl.nodes) {
        const isEntry = entryPreset.includes(n.id);
        nodeStates[n.id] = { status: isEntry ? "succeeded" : "pending", attempt: isEntry ? 1 : 0, reworkCount: 0, error: null, artifacts: [] };
      }
      store.createRun({ id: rid, candidateKey: key, templateId: tpl.id, templateRevision: tpl.revision,
        snapshot: clone(tpl), nodeStates, status: "running", cancelReason: null,
        createdAt: now().toISOString(), updatedAt: now().toISOString(), history: [] });
      syncStage(key, store.getRun(rid));   // run 创建 → 候选 building（§8 映射）
      const repo = store.getCandidate(key).repo;
      workspace.ensure({ key, repo }).then(({ dir }) => {
        const run = store.getRun(rid); if (!run || run.status !== "running") return;
        store.appendRunHistory(rid, "workspace.cloned", dir + " remote=gh-https");   // 评审 R1-13：实际 remote 落痕
        engine.dispatch(rid);
      }).catch((err) => {
        const run = store.getRun(rid); if (!run || run.status !== "running") return;
        const msg = "workspace clone: " + String(err?.message ?? err);
        // 评审 P18 泛化：clone 失败标记「首个 pending 非 gate 节点」（LOOP_V1=build / devflow=design），找不到则仅 run failed
        const firstPending = (run.snapshot.nodes ?? []).find((n) => n.type !== "gate" && run.nodeStates[n.id]?.status === "pending");
        if (firstPending) run.nodeStates[firstPending.id] = { ...run.nodeStates[firstPending.id], status: "failed", error: msg };
        run.status = "failed";                       // 评审 R1-3①/D2：clone 失败 → run failed
        store.saveRun(run);
        store.appendRunHistory(rid, "workspace.clone-failed", msg);   // 评审 R1-14
        try { emit?.({ type: "failed", key, runId: rid, error: msg, title: titleOf(key) }); } catch {}
        store.setStage(key, "held", "workspace-clone-failed");
      });
      return { runId: rid };
    },
    // 可调度集 = computeReady ∪ ready（去在途）（评审 R1-1）；resume 重派不烧 attempt + sessionId :resume<seq> 防撞（评审 R1-11）。
    dispatch(runId, opts = {}) {
      const resume = opts.resume === true; const resumeSeq = opts.resumeSeq ?? 0;
      const run0 = store.getRun(runId);
      if (!run0 || ["succeeded", "failed", "cancelled"].includes(run0.status)) return;
      let run = run0;
      let guard = 16;
      while (inflight.size < concurrencyOf() && guard-- > 0) {
        const ready = dispatchable(run).filter((id) => !inflight.has(runId + ":" + id));
        if (ready.length === 0) break;
        const nodeId = ready[0];
        const node = run.snapshot.nodes.find((n) => n.id === nodeId);
        if (node.type === "gate") {
          run = gateArrive(run, nodeId); store.saveRun(run); syncStage(run.candidateKey, run);
          fire({ type: "gate", key: run.candidateKey, runId, nodeId, title: titleOf(run.candidateKey) });
          continue;
        }
        const ns = { ...run.nodeStates, [nodeId]: resume
          ? { ...run.nodeStates[nodeId], status: "running" }   // 恢复重派保持 attempt（评审 R1-11）
          : { ...run.nodeStates[nodeId], status: "running", attempt: (run.nodeStates[nodeId]?.attempt ?? 0) + 1 } };
        run = { ...run, nodeStates: ns }; store.saveRun(run);
        const key = store.getRun(runId).candidateKey;
        const taskPackage = store.getCandidate(key)?.taskPackage ?? null;
        const upstream = node.type === "agent" ? upstreamOf(run, nodeId) : [];
        // 角色解析（design-v2 §14.1）：store.roles 优先于 builtin；prompt/executionPolicy/model 三字段
        const role = resolveRole(node.roleId, listRoles());
        const rolePrompt = role?.prompt ?? node.prefix ?? "";
        const execPolicy = role?.executionPolicy ?? node.executionPolicy ?? "ask";
        const roleModel = role?.model ?? null;
        const job = node.type === "agent"
          ? executor.runAgentNode({ run, node, cwd: workspace.dirOf(key), taskPackage, upstream, rolePrompt, executionPolicy: execPolicy, model: roleModel, resume, resumeSeq })
          : executor.runScriptNode({ run, node, cwd: workspace.dirOf(key) });
        inflight.set(runId + ":" + nodeId, job.cancel);
        job.promise.then((result) => { inflight.delete(runId + ":" + nodeId); engine.onNodeDone(runId, nodeId, result); })
          .catch((err) => { inflight.delete(runId + ":" + nodeId); engine.onNodeDone(runId, nodeId, { ok: false, error: String(err?.message ?? err), artifacts: [] }); });
      }
    },
    onNodeDone(runId, nodeId, result) {
      const run0 = store.getRun(runId);
      if (!run0 || ["succeeded", "failed", "cancelled"].includes(run0.status)) return;   // 迟到结果忽略
      let run = result.ok
        ? { ...run0, nodeStates: { ...run0.nodeStates, [nodeId]: { ...run0.nodeStates[nodeId], status: "succeeded", artifacts: result.artifacts ?? [] } } }
        : applyFailure(run0, nodeId, result.error);
      // M6 D4：deliverEvidence 命中节点成功 → 落 deliver.mr 事件（G3 证据源；stdout 末行）
      if (result.ok && run0.snapshot?.deliverEvidence === nodeId) {
        store.appendRunHistory(runId, "deliver.mr", String(result.artifacts?.[0] ?? "").trim().split("\n").pop());
      }
      store.saveRun(run);
      syncStage(run.candidateKey, run);
      if (run.status === "failed") fire({ type: "failed", key: run.candidateKey, runId, nodeId, error: run.nodeStates[nodeId]?.error ?? result.error ?? "", title: titleOf(run.candidateKey) });
      run = advanceRun(store.getRun(runId));   // 含回炉源重臂（评审 R1-2）
      store.saveRun(run);
      syncStage(run.candidateKey, run);
      engine.dispatch(runId);
      engine.dispatchAlive();   // 并发名额释放后全局拾起其余存活 run 的排队节点
    },
    dispatchAlive() { for (const r of store.listRuns()) if (r.status === "running") engine.dispatch(r.id); },
    simulateRestart() { inflight.clear(); },   // 测试钩子（评审 R1-17）：模拟宿主重启丢内存态，无生产调用方
    applyGateDecision(runId, nodeId, decision, overrideTarget = null) {
      const run = store.getRun(runId); if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
      // M6/R3 连带：pass 后过 advanceRun——skipped 后代（rework 失效扫掠产生）的重激活在此，dispatch 前必须推进
      let next = applyGateDecision(run, nodeId, decision, overrideTarget);
      next = advanceRun(next);
      store.saveRun(next); syncStage(next.candidateKey, next); engine.dispatch(runId);
      return next;
    },
    cancelRun(runId, reason) {
      for (const [k, cancel] of inflight) if (k.startsWith(runId + ":")) cancel();   // 在途 agent dispose / script kill
      const run = store.getRun(runId); if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
      const next = schedCancelRun(run, reason);
      store.saveRun(next); syncStage(next.candidateKey, next);
    },
    // 再入环（评审 D7/R1-9/R1-4）：failed/cancelled run 的失败|取消节点人工重试；cancelled run 其余
    // cancelled 节点回 pending 续跑；run 必须回 running（否则 dispatch 终态守卫直接 return，评审 R1-4）。
    retryNode(runId, nodeId) {
      const run = store.getRun(runId); if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
      if (!["failed", "cancelled"].includes(run.status)) throw Object.assign(new Error("retry-requires-failed-or-cancelled"), { status: 409 });
      const node = (run.snapshot.nodes ?? []).find((n) => n.id === nodeId) ?? {};
      const s = run.nodeStates[nodeId];
      if (!s || !["failed", "cancelled"].includes(s.status)) throw Object.assign(new Error("retry-requires-failed"), { status: 409 });
      const attempt = (s.attempt ?? 0) + 1;
      if (attempt > (node.maxAttempts ?? 1)) throw Object.assign(new Error("attempt-exhausted"), { status: 409 });
      const ns = { ...run.nodeStates, [nodeId]: { ...s, status: "ready", attempt, error: null } };
      if (run.status === "cancelled") for (const [id, st] of Object.entries(ns)) if (st.status === "cancelled") ns[id] = { ...st, status: "pending" };
      const next = { ...run, nodeStates: ns, status: "running", cancelReason: null, waitingGate: null };
      store.saveRun(next); syncStage(next.candidateKey, next); engine.dispatch(runId);
    },
    // 恢复扫描（评审 D1/R3-2）：先完成全部扫描（running→ready + 留痕），循环后统一 resume 派发——
    // 全量存活 run 都重派，防「进程死在 saveRun 与 dispatch 之间」的静默卡死；resume 不烧 attempt。
    recover() {
      const scanned = [];
      const resumed = [];
      let seq = 0;
      for (const run of store.listRuns()) {
        if (!["running", "waiting"].includes(run.status)) continue;
        scanned.push(run.id);
        let touched = false; const ns = { ...run.nodeStates };
        for (const [id, s] of Object.entries(ns)) if (s.status === "running") { ns[id] = { ...s, status: "ready" }; touched = true; }
        if (touched) { const next = { ...run, nodeStates: ns }; store.saveRun(next); store.appendRunHistory(run.id, "resume.interrupted", "host restart"); resumed.push(run.id); }
      }
      for (const id of scanned) engine.dispatch(id, { resume: true, resumeSeq: ++seq });
      return resumed;
    },
  };
  return engine;
}
