import test from "node:test";
import assert from "node:assert/strict";
import { computeReady, descendantsOf, gateArrive, applyGateDecision, cancelRun } from "../src/engine/scheduler.mjs";
import { LOOP_V1 } from "../src/workflows/builtin.mjs";

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
