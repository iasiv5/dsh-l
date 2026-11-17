import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../src/store.mjs";
import { makeEngine } from "../src/engine/engine.mjs";
import { summarizeRun } from "../src/engine/scheduler.mjs";
import { LOOP_V1, DEVFLOW_LITE } from "../src/workflows/builtin.mjs";

// fake workspace：ensure 立即成功/失败可控；dirOf 固定（评审 R1-7②：与 T9 夹具同款形态）
const fakeWorkspace = (fail = false) => ({
  ensure: async () => { if (fail) throw new Error("clone down"); return { dir: "/ws", cloned: false }; },
  dirOf: () => "/ws",
});
// fake executor：agent/script 可手工放行；cancel 记账；lastArgs 供 upstream 断言（评审 R1-10）
const fakeExecutor = () => {
  const inflight = new Map();
  const exe = {
    inflight, lastArgs: null,
    runAgentNode(args) {
      const { run, node } = args; const key = run.id + ":" + node.id; const entry = {}; inflight.set(key, entry);
      exe.lastArgs = args;
      const promise = new Promise((resolve) => { entry.resolve = (r) => { inflight.delete(key); resolve(r); }; });
      return { promise, cancel: () => { entry.cancelled = true; entry.resolve({ ok: false, error: "cancelled" }); } };
    },
    runScriptNode(args) { return exe.runAgentNode(args); },
  };
  return exe;
};
const setup = ({ failClone = false, concurrency = 2 } = {}) => {
  const store = createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-eng-")), "s.json") });
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "", updatedAt: "", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  store.setStage("o/r#issue#1", "gating", "");
  const workspace = fakeWorkspace(failClone); const executor = fakeExecutor();
  const engine = makeEngine({ store, workspace, executor, now: () => new Date(), concurrencyOf: () => concurrency });
  return { store, workspace, executor, engine };
};
const setupDevflow = () => {
  const s = setup();
  const engineDev = makeEngine({ store: s.store, workspace: s.workspace, executor: s.executor, now: () => new Date(), concurrencyOf: () => 2, templates: { [LOOP_V1.id]: LOOP_V1, [DEVFLOW_LITE.id]: DEVFLOW_LITE } });
  return { ...s, engineDev };
};
const nodeState = (store, runId, id) => store.getRun(runId).nodeStates[id].status;
const drain = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test("startRun：g1 预置 succeeded、候选 building、存活 run 二次 start 409", async () => {
  const { store, engine } = setup();
  const key = "o/r#issue#1";
  const r = engine.startRun(key, {});
  const run = store.getRun(r.runId);
  assert.equal(nodeState(store, r.runId, "g1"), "succeeded");
  assert.equal(store.getCandidate(key).currentRunId, r.runId);
  assert.equal(store.getCandidate(key).stage, "building");
  assert.throws(() => engine.startRun(key, {}), /run-already-active/);
});
test("全链：build(agent)→verify(script)→G2 挂起→pass→deliver→run succeeded + 候选 shipped", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  assert.equal(nodeState(store, runId, "build"), "running");
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] });
  await drain();
  assert.equal(nodeState(store, runId, "verify"), "running");
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] });
  await drain();
  assert.equal(nodeState(store, runId, "g2"), "waiting");
  assert.equal(store.getCandidate(key).stage, "gating");
  engine.applyGateDecision(runId, "g2", "pass");
  await drain();
  assert.equal(nodeState(store, runId, "deliver"), "running");
  executor.inflight.get(runId + ":deliver").resolve({ ok: true, error: null, artifacts: [] });
  await drain();
  assert.equal(store.getRun(runId).status, "succeeded");
  assert.equal(store.getCandidate(key).stage, "shipped");
});
test("verify 回炉超限 → run failed + 候选 held（回炉重臂经引擎自动重派，评审 R1-2）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  for (let i = 0; i < 3; i++) {   // 首跑 + 3 次回炉：verify 每次失败 → build 重臂 ready → 引擎自动重派
    assert.equal(nodeState(store, runId, "verify"), "running");
    executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "red", artifacts: [] }); await drain();
    assert.equal(nodeState(store, runId, "build"), "running");   // 引擎自动重派（评审 R2-5：actual 为 running 非 ready）
    assert.equal(store.getRun(runId).status, "running");
    executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  }
  assert.equal(nodeState(store, runId, "verify"), "running");
  executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "red again", artifacts: [] }); await drain();
  assert.equal(store.getRun(runId).status, "failed");
  assert.equal(store.getCandidate(key).stage, "held");
  assert.equal(nodeState(store, runId, "verify"), "failed");   // 产出评审问题 2：终态守卫——耗尽后不再重臂回 ready
  assert.equal(summarizeRun(store.getRun(runId)).error, "red again");   // 问题 2 后果①：error 摘要恢复可见
});
test("rework 重派：build 的 upstream 携带 verify 失败文本（评审 R1-10）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "2 tests failed", artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "build"), "running");
  assert.ok(executor.lastArgs.upstream.some((u) => u.node === "verify" && u.text.includes("2 tests failed")));
});
test("clone 失败 → run failed + 候选 held（评审 D2）", async () => {
  const { store, engine } = setup({ failClone: true });
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain(); await drain();
  assert.equal(store.getRun(runId).status, "failed");
  assert.equal(store.getCandidate(key).stage, "held");
});
test("并发上限：concurrency=1 时第二个 run 的节点不被派发，直至首个完成", async () => {
  const { store, engine, executor } = setup({ concurrency: 1 });
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 2, title: "t2", author: "a", labels: [], createdAt: "", updatedAt: "", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  store.setStage("o/r#issue#2", "gating", "");
  const a = engine.startRun("o/r#issue#1", {});
  const b = engine.startRun("o/r#issue#2", {});
  await drain();
  assert.equal(nodeState(store, a.runId, "build"), "running");
  assert.equal(store.getRun(b.runId).nodeStates.build.status, "pending");   // 排队
  executor.inflight.get(a.runId + ":build").resolve({ ok: false, error: "boom", artifacts: [] });   // build 失败→无 rework→run failed，让出名额
  await drain();
  assert.equal(nodeState(store, b.runId, "build"), "running");
});

// ---- Task 7：取消链与 retry 钉例①-⑤ ----
test("钉例①取消：agent 在途时 engine.cancelRun → executor cancel 被调用 + run cancelled + 候选 gating", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  const entry = executor.inflight.get(runId + ":build");   // 先取后取消（评审 R2-1：fake cancel 同步删键）
  engine.cancelRun(runId, "user");
  assert.equal(entry.cancelled, true);
  assert.equal(store.getRun(runId).status, "cancelled");
  assert.equal(store.getCandidate(key).stage, "gating");
});
test("钉例②retry：failed run → retryNode → attempt+1 → ready 且 run.status 回 running", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  engine.applyGateDecision(runId, "g2", "pass"); await drain();
  executor.inflight.get(runId + ":deliver").resolve({ ok: false, error: "push rejected", artifacts: [] }); await drain();
  assert.equal(store.getRun(runId).status, "failed");
  engine.retryNode(runId, "deliver");   // deliver maxAttempts:2，attempt 1→2 ≤ 2
  await drain();
  assert.equal(nodeState(store, runId, "deliver"), "running");
  assert.equal(store.getRun(runId).status, "running");   // 评审 R2-1/R1-4：重试须回 running，否则 dispatch 终态守卫直接 return
});
test("钉例③attempt 超限 409（夹具须同步 run.status=failed，评审 R2-6）", async () => {
  const { store, engine } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  assert.throws(() => { store.saveRun({ ...store.getRun(runId), status: "failed", nodeStates: { ...store.getRun(runId).nodeStates, deliver: { status: "failed", attempt: 2, reworkCount: 0, error: "again", artifacts: [] } } }); engine.retryNode(runId, "deliver"); }, /attempt-exhausted/);
});
test("钉例④cancelled run retry：cancelled 节点回 pending 续跑（评审 R1-9 / D7）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  const entry = executor.inflight.get(runId + ":build");
  engine.cancelRun(runId, "user");
  entry.resolve({ ok: false, error: "cancelled" }); await drain();   // 迟到结果被终态守卫忽略
  engine.retryNode(runId, "build");   // cancelled run + cancelled 节点 → 重试续跑
  await drain();
  assert.equal(store.getRun(runId).status, "running");
  assert.equal(store.getRun(runId).nodeStates.build.status, "running");
});
test("钉例⑤failed run 上重试 succeeded 节点 → 节点级守卫 409（评审 R3-3）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  engine.applyGateDecision(runId, "g2", "pass"); await drain();
  executor.inflight.get(runId + ":deliver").resolve({ ok: false, error: "push rejected", artifacts: [] }); await drain();
  assert.equal(store.getRun(runId).status, "failed");
  assert.equal(nodeState(store, runId, "verify"), "succeeded");
  assert.throws(() => engine.retryNode(runId, "verify"), /retry-requires-failed/);   // 节点级守卫：verify 非 failed/cancelled
});

// ---- Task 8：恢复扫描（评审 D1/R2-7/R3-2）----
test("recover：running→ready 不烧 attempt + 留痕 + 全量存活 run 统一重派", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  const before = store.getRun(runId).nodeStates.build.attempt;
  engine.simulateRestart();   // 模拟宿主重启：丢弃内存 in-flight（评审 R1-17：测试代码显式调用）
  const resumed = engine.recover();
  assert.ok(resumed.includes(runId));
  // ready 中间态不可观测：recover 返回前 resume 派发已同步执行（评审 R3-1），故不断言 ready、直接断言 running 后状态
  assert.equal(store.getRun(runId).nodeStates.build.attempt, before);      // 评审 R1-11：恢复重派不烧 attempt
  assert.equal(store.getRun(runId).history.at(-1).event, "resume.interrupted");
  await drain();
  assert.equal(store.getRun(runId).nodeStates.build.status, "running");    // 重新派发（resume 路径）
  assert.equal(store.getRun(runId).nodeStates.build.attempt, before);      // 仍不烧
  assert.equal(executor.lastArgs.resume, true);
});
test("recover：run.status=running 但无 running 节点的窄窗状态也被拾起（评审 R3-2）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  engine.applyGateDecision(runId, "g2", "pass"); await drain();
  assert.equal(nodeState(store, runId, "deliver"), "running");
  // 模拟「进程死在 dispatch 内 saveRun 与 inflight 登记之间」：deliver 回 ready、run 仍 running、无在途
  engine.simulateRestart();
  store.saveRun({ ...store.getRun(runId), nodeStates: { ...store.getRun(runId).nodeStates, deliver: { status: "ready", attempt: 1, reworkCount: 0, error: null, artifacts: [] } } });
  const resumed = engine.recover();
  assert.equal(resumed.includes(runId), false);   // 无 running 节点 → 不落 history（R3-2：全量重派但 history 只记 touched）
  await drain();
  assert.equal(nodeState(store, runId, "deliver"), "running");   // 但仍被重派（R3-2 修复点：scanned 全量重派）
});

// ---- Task 5：emit 三触发点（gate 挂起 / run failed / clone 失败；成功路径零通知）----
const setup2 = ({ failClone = false, concurrency = 2 } = {}) => {
  const base = setup({ failClone, concurrency });
  const events = [];
  const engine = makeEngine({ store: base.store, workspace: base.workspace, executor: base.executor,
    now: () => new Date(), concurrencyOf: () => concurrency, emit: (e) => { events.push(e); } });
  return { ...base, events, engine };
};
test("emit：G2 挂起与 run failed 各一条；成功路径零通知", async () => {
  const { store, engine, executor, events } = setup2();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.deepEqual(events.map((e) => e.type), []);   // 评审 P3①：成功零通知断言前移——此时 verify 在跑、闸未到达
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  const gateEvt = events.find((e) => e.type === "gate");
  assert.equal(gateEvt.nodeId, "g2");   // 评审 P3②：nodeId=闸节点 id，与 waitingGate/api.runGate 同域
  engine.applyGateDecision(runId, "g2", "pass");
  await drain();
  executor.inflight.get(runId + ":deliver").resolve({ ok: false, error: "push rejected", artifacts: [] }); await drain();
  const failedEvt = events.find((e) => e.type === "failed");
  assert.equal(failedEvt.error, "push rejected");
});
test("emit：clone 失败 → failed 事件", async () => {
  const base = setup({ failClone: true });
  const events = [];
  const engine = makeEngine({ store: base.store, workspace: base.workspace, executor: base.executor,
    now: () => new Date(), concurrencyOf: () => 2, emit: (e) => { events.push(e); } });
  const { runId } = engine.startRun("o/r#issue#1", {});
  await drain(); await drain();
  const failedEvt = events.find((e) => e.type === "failed");
  assert.ok(failedEvt);
  assert.match(failedEvt.error, /clone/);
});
test("devflow-lite 全链钉例（M4 T8）：requirement(gate)→design→implement→review→test→G2→deliver", async () => {
  const { store, executor, engineDev } = setupDevflow();
  const key = "o/r#issue#1";
  const { runId } = engineDev.startRun(key, { templateId: "devflow-lite" });
  await drain();
  // requirement 不预置（DEVFLOW_LITE 无 entryPresucceeded——评审 P16）→ 直接 ready → 派发为 gate waiting
  assert.equal(nodeState(store, runId, "requirement"), "waiting");
  engineDev.applyGateDecision(runId, "requirement", "pass");
  await drain();
  assert.equal(nodeState(store, runId, "design"), "running");
  executor.inflight.get(runId + ":design").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "implement"), "running");
  executor.inflight.get(runId + ":implement").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "review"), "running");
  // review fail 一次 → implement 重臂（rework 边）
  executor.inflight.get(runId + ":review").resolve({ ok: false, error: "驳回：缺测试", artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "implement"), "running");
  executor.inflight.get(runId + ":implement").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "review"), "running");
  executor.inflight.get(runId + ":review").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "test"), "running");
  executor.inflight.get(runId + ":test").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "g2"), "waiting");
  engineDev.applyGateDecision(runId, "g2", "pass");
  await drain();
  assert.equal(nodeState(store, runId, "deliver"), "running");
  executor.inflight.get(runId + ":deliver").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(store.getRun(runId).status, "succeeded");
  assert.equal(store.getRun(runId).templateId, "devflow-lite");
  assert.equal(store.getCandidate(key).stage, "shipped");
});
test("startRun 未知 templateId → 404 unknown-template（M4 T8）", async () => {
  const { store, engineDev } = setupDevflow();
  assert.throws(() => engineDev.startRun("o/r#issue#1", { templateId: "nope" }), /unknown-template/);
  assert.equal(store.listRuns().length, 0);   // 未建 run
});
