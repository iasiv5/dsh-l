import test from "node:test";
import assert from "node:assert/strict";
import { computeReady, descendantsOf, gateArrive, applyGateDecision, cancelRun, applyFailure, advanceRun, summarizeRun } from "../src/engine/scheduler.mjs";
import { LOOP_V1, DEVFLOW_LITE } from "../src/workflows/builtin.mjs";

// a→b（普通支）与 a→c(gate)→d（闸门支）：gate 只闸 d，不闸 b（design-v2 §4 / grill Q9-B）
const snap = { nodes: [{id:"a"},{id:"b"},{id:"c"},{id:"d"}],
  edges: [ {id:"e1",source:"a",target:"b",kind:"success"}, {id:"e2",source:"a",target:"c",kind:"success"},
           {id:"e3",source:"c",target:"d",kind:"success"} ] };
const st = (map) => Object.fromEntries(snap.nodes.map((n) => [n.id, { status: map[n.id] ?? "pending", attempt: 0, reworkCount: 0 }]));

test("computeReady：入口即绪、闸门只堵下游", () => {
  assert.deepEqual(computeReady(snap, st({})), ["a"]);
  assert.deepEqual(computeReady(snap, st({ a: "succeeded" })), ["b", "c"]); // c 是 gate：ready 待人工，d 被堵
  assert.deepEqual(computeReady(snap, st({ a: "succeeded", b: "succeeded", c: "waiting" })), []);
  assert.deepEqual(computeReady(snap, st({ a: "succeeded", b: "succeeded", c: "succeeded" })), ["d"]);
});
test("descendantsOf：success 边可达、不含自身", () => {
  assert.deepEqual(descendantsOf(snap, "a"), ["b", "c", "d"]);
  assert.deepEqual(descendantsOf(snap, "c"), ["d"]);
  assert.deepEqual(descendantsOf(snap, "d"), []);
});

// ---- Task 7：闸门语义（run 夹具带 snapshot——design-v2 §2 run 形状，gateId/rejectTarget/后代的解析依据）----
const st2 = (map) => Object.fromEntries(LOOP_V1.nodes.map((n) => [n.id, { status: map[n.id] ?? "pending", attempt: 0, reworkCount: 0, error: null }]));
const mkRun = (map, extra = {}) => ({ status: "running", waitingGate: null, cancelReason: null, hold: false,
  snapshot: { nodes: LOOP_V1.nodes, edges: LOOP_V1.edges }, nodeStates: st2(map), ...extra });

test("G2 reject：目标重置 ready、后代 skipped 待重跑、不计 rework", () => {
  // 构造：g2 已 waiting，build/verify 已 succeeded（回炉后抵达 G2 的形状）
  let run = mkRun({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "waiting" },
    { status: "waiting", waitingGate: "g2" });
  run = applyGateDecision(run, "g2", "reject");
  assert.equal(run.nodeStates.build.status, "ready");
  assert.equal(run.nodeStates.verify.status, "skipped");   // build 的 success 后代，非 pending → skipped 待重跑（design-v2 §4 / 评审 R7 采纳）
  assert.equal(run.nodeStates.deliver.status, "pending");  // 本就 pending，保持（规则只改非 pending 者）
  assert.equal(run.nodeStates.build.reworkCount, 0);       // reject 不计回炉
  assert.equal(run.status, "running");
});
test("G1 reject：取消 run", () => {
  let run = mkRun({ g1: "waiting" }, { status: "waiting", waitingGate: "g1" });
  run = applyGateDecision(run, "g1", "reject");
  assert.equal(run.status, "cancelled");
  assert.equal(run.cancelReason, "g1-rejected");
});
test("pass 放行与 cancelRun", () => {
  let run = mkRun({ g1: "waiting", build: "ready" }, { status: "waiting", waitingGate: "g1" });
  run = applyGateDecision(run, "g1", "pass");
  assert.equal(run.nodeStates.g1.status, "succeeded");
  assert.equal(run.status, "running");
  run = cancelRun(run, "user");
  assert.equal(run.status, "cancelled");
  assert.equal(run.nodeStates.build.status, "cancelled");
});
test("gateArrive：节点转 waiting、run 挂起", () => {
  let run = mkRun({ g1: "ready" });
  run = gateArrive(run, "g1");
  assert.equal(run.nodeStates.g1.status, "waiting");
  assert.equal(run.status, "waiting");
  assert.equal(run.waitingGate, "g1");
});

// ---- Task 8：回炉 / 推进 / 终态 / 摘要 ----
test("verify 失败回炉 build，第 4 次超限 run failed", () => {
  let run = mkRun({ g1: "succeeded", build: "succeeded", verify: "running", g2: "pending", deliver: "pending" });
  for (let i = 0; i < 3; i++) {
    run.nodeStates.verify.reworkCount = i;
    run = applyFailure(run, "verify", "tests red");
    assert.equal(run.status, "running");
    assert.equal(run.nodeStates.build.status, "ready");
    // 模拟 build 重跑成功后 verify 再跑：手工推进
    run.nodeStates.build.status = "succeeded"; run.nodeStates.verify.status = "running";
  }
  run.nodeStates.verify.reworkCount = 3;
  run = applyFailure(run, "verify", "tests red again");
  assert.equal(run.status, "failed");
  assert.equal(run.hold, false);            // verify 未配 onFailure:"hold"
  assert.match(run.nodeStates.verify.error, /again/);
});
test("advanceRun ready 化：终态前 run 保持 running（评审 R4 采纳·拆例①）", () => {
  let run = mkRun({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "succeeded", "mr-open": "succeeded", "mr-push-check": "succeeded", "mr-open-check": "succeeded" });   // M6 三件套补态
  run = advanceRun(run);
  assert.equal(run.nodeStates.deliver.status, "ready");   // ready 即待执行（M2 执行器接手）
  assert.equal(run.status, "running");                    // deliver 未跑完，run 不终态
  const sum = summarizeRun({ ...run, id: "r1", candidateKey: "k" });
  assert.deepEqual(sum, { id: "r1", candidateKey: "k", status: "running", waitingGate: null, waitingGateId: null, currentNodeIds: ["deliver"], failedNodeIds: [], cancelledNodeIds: [], templateId: null, error: null });
});
test("advanceRun 终态：全 succeeded 才收口（评审 R4 采纳·拆例②）", () => {
  let run = mkRun({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "succeeded", "mr-open": "succeeded", "mr-push-check": "succeeded", "mr-open-check": "succeeded", deliver: "succeeded" });   // M6 三件套补态
  run = advanceRun(run);
  assert.equal(run.status, "succeeded");
  const sum = summarizeRun({ ...run, id: "r1", candidateKey: "k" });
  assert.deepEqual(sum, { id: "r1", candidateKey: "k", status: "succeeded", waitingGate: null, waitingGateId: null, currentNodeIds: [], failedNodeIds: [], cancelledNodeIds: [], templateId: null, error: null });
});
test("summarizeRun.cancelledNodeIds + templateId（M7 T5/评审 D3/D6）", () => {
  const run = mkRun({ g1: "succeeded", build: "cancelled", verify: "cancelled" }, { id: "r9", candidateKey: "k", status: "cancelled", waitingGate: null, templateId: "loop-v1" });
  const sum = summarizeRun(run);
  assert.deepEqual(sum.cancelledNodeIds.sort(), ["build", "verify"]);
  assert.equal(sum.failedNodeIds.length, 0);
  assert.equal(sum.templateId, "loop-v1");
});
test("summarizeRun.waitingGateId：快照节点 gateId 语义键（评审 R2-1①）", () => {
  // devflow-lite requirement waiting：waitingGate 是 nodeId "requirement"，waitingGateId 应为快照 gateId "G1"
  const devRun = { id: "r2", candidateKey: "k", status: "waiting", waitingGate: "requirement",
    snapshot: { nodes: DEVFLOW_LITE.nodes, edges: DEVFLOW_LITE.edges },
    nodeStates: Object.fromEntries(DEVFLOW_LITE.nodes.map((n) => [n.id, { status: n.id === "requirement" ? "waiting" : "pending", attempt: 0, reworkCount: 0, error: null, artifacts: [] }])) };
  const sum = summarizeRun(devRun);
  assert.equal(sum.waitingGate, "requirement");
  assert.equal(sum.waitingGateId, "G1");
  // loop-v1 G2 waiting：waitingGate "g2" → gateId "G2"
  const loopRun = { id: "r3", candidateKey: "k", status: "waiting", waitingGate: "g2",
    snapshot: { nodes: LOOP_V1.nodes, edges: LOOP_V1.edges },
    nodeStates: Object.fromEntries(LOOP_V1.nodes.map((n) => [n.id, { status: n.id === "g2" ? "waiting" : "succeeded", attempt: 1, reworkCount: 0, error: null, artifacts: [] }])) };
  assert.equal(summarizeRun(loopRun).waitingGateId, "G2");
});
test("summarizeRun.error：首个 failed 节点的 error", () => {
  assert.equal(summarizeRun({ id: "r", candidateKey: "k", status: "failed", waitingGate: null,
    nodeStates: { a: { status: "succeeded" }, b: { status: "failed", error: "boom" } } }).error, "boom");
  assert.equal(summarizeRun({ id: "r", candidateKey: "k", status: "succeeded", waitingGate: null,
    nodeStates: { a: { status: "succeeded" } } }).error, null);
  assert.deepEqual(summarizeRun({ id: "r", candidateKey: "k", status: "failed", waitingGate: null,
    nodeStates: { a: { status: "succeeded" }, b: { status: "failed", error: "boom" } } }).failedNodeIds, ["b"]);   // 产出评审问题 1：重试目标来源
});
test("skipped 重激活：reject 后目标重跑成功，skipped 后代逐级回 ready（评审 R7 采纳·配套）", () => {
  // G2 reject 后的形状：build=ready，verify=skipped，g2=skipped，deliver=pending（design-v2 §4 + T7 规则）
  let run = mkRun({ g1: "succeeded", build: "ready", verify: "skipped", g2: "skipped" });
  run.nodeStates.build.status = "succeeded";              // 模拟 M2 执行器重跑 build 完成
  run = advanceRun(run);
  assert.equal(run.nodeStates.verify.status, "ready");    // skipped→pending→ready（success 入边源已 succeeded）
  assert.equal(run.nodeStates.g2.status, "skipped");      // verify 未重跑，仍停
  assert.equal(run.nodeStates.deliver.status, "pending"); // 入边 g2 未通，保持 pending
});
test("F5：onFailure hold 的节点失败 → run failed + hold=true", () => {
  const snapshot = { nodes: [{ id: "x", type: "script", script: "exit 1", onFailure: "hold" }], edges: [] };
  let run = { id: "r", candidateKey: "k", status: "running", waitingGate: null, cancelReason: null, hold: false,
    snapshot, nodeStates: { x: { status: "running", attempt: 1, reworkCount: 0, error: null } } };
  run = applyFailure(run, "x", "boom");
  assert.equal(run.status, "failed");
  assert.equal(run.hold, true);
});
