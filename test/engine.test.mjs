import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../src/store.mjs";
import { makeEngine } from "../src/engine/engine.mjs";

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
